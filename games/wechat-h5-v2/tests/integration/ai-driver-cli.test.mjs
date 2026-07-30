import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";

import {
  runDriverCli,
} from "../../tools/ai-playtest-driver-cli.mjs";
import {
  runHeartbeatKeeper,
} from "../../tools/ai-playtest-heartbeat.mjs";
import {
  cleanupDriverRequestSequence,
  driverRequestSequencePaths,
  withAllocatedDriverRequest,
} from "../../tools/ai-playtest/driver-request-sequence.mjs";

const execFileAsync = promisify(execFile);
const CLI_PATH = fileURLToPath(
  new URL("../../tools/ai-playtest-driver-cli.mjs", import.meta.url),
);
const HEARTBEAT_PATH = fileURLToPath(
  new URL("../../tools/ai-playtest-heartbeat.mjs", import.meta.url),
);
const TOKEN = "d".repeat(64);
const SESSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const roots = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

async function temporaryRoot(prefix) {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function createFakeIpc({
  delayFirstMs = 0,
  failHeartbeats = false,
} = {}) {
  const state = {
    frameSeq: 0,
    lastRequestSeq: 0,
    requests: [],
    inFlight: 0,
    maxInFlight: 0,
    leakToken: false,
  };
  const server = createServer(async (request, response) => {
    state.inFlight += 1;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    try {
      assert.equal(request.method, "POST");
      assert.equal(request.url, "/v1/command");
      assert.equal(request.headers.authorization, `Bearer ${TOKEN}`);
      const command = await readJsonBody(request);
      state.requests.push(command);
      assert.equal(command.sessionId, SESSION_ID);
      assert.equal(command.requestSeq, state.lastRequestSeq + 1);
      assert.equal(command.frameSeq, state.frameSeq);
      state.lastRequestSeq = command.requestSeq;
      if (delayFirstMs > 0 && state.requests.length === 1) {
        await new Promise((resolve) => setTimeout(resolve, delayFirstMs));
      }
      if (failHeartbeats && command.type === "heartbeat") {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "AI_DRIVER_TEST_FAILURE" }));
        return;
      }
      let result = { ok: true };
      if (command.type === "ready") {
        result = { ok: true, frameSeq: state.frameSeq, sessionId: SESSION_ID };
      } else if (command.type === "capture") {
        state.frameSeq += 1;
        result = {
          pngBase64: Buffer.from("real-png-bytes").toString("base64"),
          frameSeq: state.frameSeq,
        };
      } else if (command.type === "visible") {
        result = {
          text: state.leakToken ? `Play ${TOKEN}` : "Play",
          controls: [{
            controlId: "play",
            label: "Play",
            enabled: true,
            rect: { x: 10, y: 20, width: 30, height: 40 },
          }],
        };
      } else if (command.type === "touchBegin") {
        result = { ok: true, gestureId: "gesture-from-server" };
      } else if (["touchMove", "touchEnd"].includes(command.type)) {
        result = { ok: true, gestureId: command.gestureId };
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(result));
    } finally {
      state.inFlight -= 1;
    }
  });
  await listen(server);
  const address = server.address();
  return {
    state,
    url: `http://127.0.0.1:${address.port}/v1/command`,
    close: () => close(server),
  };
}

async function writeDescriptor(
  root,
  url,
  name = "driver.json",
  {
    sessionId = SESSION_ID,
    token = TOKEN,
  } = {},
) {
  const descriptorPath = path.join(root, name);
  await writeFile(descriptorPath, `${JSON.stringify({
    schemaVersion: 1,
    sessionId,
    url,
    token,
  })}\n`);
  return descriptorPath;
}

function cli(descriptorPath, ...args) {
  return execFileAsync(process.execPath, [
    CLI_PATH,
    "--descriptor",
    descriptorPath,
    ...args,
  ], { encoding: "utf8" });
}

async function overwriteSequenceState(descriptorPath, state) {
  const { sequencePath, framePath } =
    driverRequestSequencePaths(descriptorPath);
  await writeFile(sequencePath, `${state.requestSeq}\n`);
  await writeFile(framePath, `${state.frameSeq}\n`);
}

function parseStdout(result) {
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes(TOKEN), false);
  return JSON.parse(result.stdout);
}

function waitForStdoutLine(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const onData = (chunk) => {
      stdout += chunk.toString("utf8");
      if (!stdout.includes("\n")) return;
      child.stdout.off("data", onData);
      resolve(stdout);
    };
    child.stdout.on("data", onData);
    child.once("error", reject);
  });
}

describe("AI driver operator CLI", () => {
  it("executes the exact ready/capture/visible/touch commands without exposing the token", async () => {
    const root = await temporaryRoot("ai-driver-cli-");
    const fake = await createFakeIpc();
    try {
      const descriptorPath = await writeDescriptor(root, fake.url);
      assert.equal(parseStdout(await cli(descriptorPath, "ready")).frameSeq, 0);

      const output = path.join(root, "capture.png");
      const capture = parseStdout(
        await cli(descriptorPath, "capture", "--out", output),
      );
      assert.equal(capture.frameSeq, 1);
      assert.equal("pngBase64" in capture, false);
      assert.deepEqual(await readFile(output), Buffer.from("real-png-bytes"));
      const { sequencePath, framePath } =
        driverRequestSequencePaths(descriptorPath);
      assert.equal(await readFile(framePath, "utf8"), "1\n");

      assert.equal(
        parseStdout(await cli(descriptorPath, "visible")).text,
        "Play",
      );
      assert.equal(await readFile(framePath, "utf8"), "1\n");

      fake.state.frameSeq = 4;
      await overwriteSequenceState(descriptorPath, {
        requestSeq: fake.state.lastRequestSeq,
        frameSeq: 4,
      });
      assert.equal(
        parseStdout(await cli(
          descriptorPath,
          "tap",
          "--x",
          "195",
          "--y",
          "730",
          "--frame",
          "4",
        )).ok,
        true,
      );
      assert.equal(await readFile(framePath, "utf8"), "4\n");

      fake.state.frameSeq = 5;
      await overwriteSequenceState(descriptorPath, {
        requestSeq: fake.state.lastRequestSeq,
        frameSeq: 5,
      });
      const begin = parseStdout(await cli(
        descriptorPath,
        "begin",
        "--x",
        "195",
        "--y",
        "730",
        "--frame",
        "5",
      ));
      assert.equal(begin.gestureId, "gesture-from-server");
      assert.equal(parseStdout(await cli(
        descriptorPath,
        "move",
        "--gesture",
        begin.gestureId,
        "--x",
        "195",
        "--y",
        "790",
      )).ok, true);
      assert.equal(parseStdout(await cli(
        descriptorPath,
        "end",
        "--gesture",
        begin.gestureId,
        "--x",
        "195",
        "--y",
        "790",
      )).ok, true);

      assert.deepEqual(
        fake.state.requests.map(({ type }) => type),
        [
          "ready",
          "capture",
          "visible",
          "touchTap",
          "touchBegin",
          "touchMove",
          "touchEnd",
        ],
      );
      const actionIds = fake.state.requests.map(({ actionId }) => actionId);
      assert.equal(new Set(actionIds).size, actionIds.length);
      actionIds.forEach((actionId) => assert.match(
        actionId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      ));
      assert.equal(await readFile(sequencePath, "utf8"), "7\n");
      assert.equal(await readFile(framePath, "utf8"), "5\n");
    } finally {
      await fake.close();
    }
  });

  it("rejects malformed actions, stale explicit frames and capture overwrite", async () => {
    const root = await temporaryRoot("ai-driver-cli-invalid-");
    const fake = await createFakeIpc();
    try {
      const descriptorPath = await writeDescriptor(root, fake.url);
      const { sequencePath, framePath } =
        driverRequestSequencePaths(descriptorPath);
      for (const [target, malformed, expected] of [
        [sequencePath, "{}\n", /AI_DRIVER_SEQUENCE_STATE_INVALID/u],
        [sequencePath, "1.5\n", /AI_DRIVER_SEQUENCE_STATE_INVALID/u],
        [sequencePath, "-1\n", /AI_DRIVER_SEQUENCE_STATE_INVALID/u],
        [sequencePath, "1 trailing\n", /AI_DRIVER_SEQUENCE_STATE_INVALID/u],
        [framePath, "{}\n", /AI_DRIVER_FRAME_STATE_INVALID/u],
        [framePath, "1.5\n", /AI_DRIVER_FRAME_STATE_INVALID/u],
        [framePath, "-1\n", /AI_DRIVER_FRAME_STATE_INVALID/u],
        [framePath, "1 trailing\n", /AI_DRIVER_FRAME_STATE_INVALID/u],
      ]) {
        await overwriteSequenceState(descriptorPath, {
          requestSeq: 0,
          frameSeq: 0,
        });
        await writeFile(target, malformed);
        await assert.rejects(cli(descriptorPath, "ready"), expected);
      }
      await overwriteSequenceState(descriptorPath, {
        requestSeq: 0,
        frameSeq: 0,
      });
      await rm(sequencePath);
      await assert.rejects(
        cli(descriptorPath, "ready"),
        /AI_DRIVER_SEQUENCE_SIDECAR_INCOMPLETE/u,
      );
      await rm(framePath);
      for (const args of [
        ["debug"],
        ["tap", "--x", "-1", "--y", "10", "--frame", "0"],
        ["tap", "--x", "391", "--y", "10", "--frame", "0"],
        ["move", "--gesture", "", "--x", "10", "--y", "20"],
      ]) {
        await assert.rejects(cli(descriptorPath, ...args), (error) => {
          assert.notEqual(error.code, 0);
          assert.equal(`${error.stdout}${error.stderr}`.includes(TOKEN), false);
          return true;
        });
      }
      await assert.rejects(
        cli(
          descriptorPath,
          "tap",
          "--x",
          "10",
          "--y",
          "20",
          "--frame",
          "1",
        ),
        /AI_DRIVER_CLI_FRAME_MISMATCH/u,
      );
      fake.state.leakToken = true;
      await assert.rejects(cli(descriptorPath, "visible"), (error) => {
        assert.match(error.stderr, /AI_DRIVER_RESPONSE_FORBIDDEN/u);
        assert.equal(`${error.stdout}${error.stderr}`.includes(TOKEN), false);
        return true;
      });
      const output = path.join(root, "existing.png");
      await writeFile(output, "do-not-overwrite");
      await assert.rejects(
        cli(descriptorPath, "capture", "--out", output),
        (error) => {
          assert.notEqual(error.code, 0);
          assert.equal(`${error.stdout}${error.stderr}`.includes(TOKEN), false);
          return true;
        },
      );
      assert.equal(await readFile(output, "utf8"), "do-not-overwrite");
    } finally {
      await fake.close();
    }
  });

  it("holds the cross-process lock through POST and cleanup cannot delete a live owner", async () => {
    const root = await temporaryRoot("ai-driver-cli-order-");
    const fake = await createFakeIpc({ delayFirstMs: 100 });
    try {
      const descriptorPath = await writeDescriptor(root, fake.url);
      const { sequencePath, framePath, lockPath } =
        driverRequestSequencePaths(descriptorPath);
      const first = cli(descriptorPath, "ready");
      for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
          await access(path.join(lockPath, "owner.json"));
          break;
        } catch (error) {
          if (attempt === 99) throw error;
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }
      await assert.rejects(
        cleanupDriverRequestSequence(descriptorPath, {
          minimumLockAgeMs: 0,
          processExists: () => true,
        }),
        /AI_DRIVER_SEQUENCE_CLEANUP_LOCK_ACTIVE/u,
      );
      await access(path.join(lockPath, "owner.json"));
      const second = cli(descriptorPath, "ready");
      await Promise.all([first, second]);
      assert.deepEqual(
        fake.state.requests.map(({ requestSeq }) => requestSeq),
        [1, 2],
      );
      assert.equal(fake.state.maxInFlight, 1);
      assert.equal(await readFile(sequencePath, "utf8"), "2\n");
      assert.equal(await readFile(framePath, "utf8"), "0\n");
      await assert.rejects(access(lockPath), { code: "ENOENT" });
      await rm(descriptorPath);
      await cleanupDriverRequestSequence(descriptorPath);
      await assert.rejects(
        withAllocatedDriverRequest(
          descriptorPath,
          async () => ({ value: { ok: true } }),
        ),
        /AI_DRIVER_DESCRIPTOR_UNAVAILABLE/u,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      await assert.rejects(access(sequencePath), { code: "ENOENT" });
      await assert.rejects(access(framePath), { code: "ENOENT" });
    } finally {
      await fake.close();
    }
  });
});

describe("AI driver heartbeat keeper", () => {
  it("shares capture frame state, sends only heartbeats and stops cleanly on a signal", async () => {
    const root = await temporaryRoot("ai-driver-heartbeat-");
    const fake = await createFakeIpc();
    const signals = new EventEmitter();
    try {
      const descriptorPath = await writeDescriptor(root, fake.url);
      let ready;
      const readyPromise = new Promise((resolve) => {
        ready = resolve;
      });
      const keeper = runHeartbeatKeeper({
        descriptorPath,
        heartbeatIntervalMs: 10,
        signalSource: signals,
        onReady: ready,
      });
      await readyPromise;
      await new Promise((resolve) => setTimeout(resolve, 25));
      const output = path.join(root, "capture.png");
      await runDriverCli([
        "--descriptor",
        descriptorPath,
        "capture",
        "--out",
        output,
      ]);
      await new Promise((resolve) => setTimeout(resolve, 35));
      signals.emit("SIGTERM");
      assert.deepEqual(await keeper, {
        exitCode: 0,
        sessionId: SESSION_ID,
      });
      const captureIndex = fake.state.requests.findIndex(
        ({ type }) => type === "capture",
      );
      assert.ok(captureIndex >= 0);
      const afterCapture = fake.state.requests.slice(captureIndex + 1);
      assert.ok(afterCapture.length >= 1);
      assert.ok(afterCapture.every(({ type, frameSeq }) =>
        type === "heartbeat" && frameSeq === 1));
      assert.ok(fake.state.requests.every(({ type }) =>
        ["heartbeat", "capture"].includes(type)));
    } finally {
      await fake.close();
    }
  });

  it("exits nonzero after two consecutive heartbeat failures", async () => {
    const root = await temporaryRoot("ai-driver-heartbeat-fail-");
    const fake = await createFakeIpc({ failHeartbeats: true });
    try {
      const descriptorPath = await writeDescriptor(root, fake.url);
      const result = await runHeartbeatKeeper({
        descriptorPath,
        heartbeatIntervalMs: 5,
        signalSource: new EventEmitter(),
      });
      assert.equal(result.exitCode, 1);
      assert.deepEqual(
        fake.state.requests.map(({ type }) => type),
        ["heartbeat", "heartbeat"],
      );
    } finally {
      await fake.close();
    }
  });

  it("prints READY and fail-closed cleanup removes only a verified dead owner", async () => {
    const root = await temporaryRoot("ai-driver-heartbeat-ready-");
    const fake = await createFakeIpc();
    try {
      const descriptorPath = await writeDescriptor(root, fake.url);
      const child = spawn(process.execPath, [
        HEARTBEAT_PATH,
        "--descriptor",
        descriptorPath,
      ], { stdio: ["ignore", "pipe", "pipe"] });
      const stdout = await waitForStdoutLine(child);
      assert.match(
        stdout,
        /^AI_DRIVER_HEARTBEAT_READY session=123e4567-e89b-42d3-a456-426614174000 pid=[1-9][0-9]*\n$/u,
      );
      assert.equal(stdout.includes(TOKEN), false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(child.exitCode, null);
      child.kill("SIGTERM");
      const [code, signal] = await once(child, "exit");
      assert.ok(code === 0 || signal === "SIGTERM");

      for (const [name, sessionId] of [
        ["session-equals-token", TOKEN],
        ["session-contains-token", `session-${TOKEN}-suffix`],
        ["session-newline", `${SESSION_ID}\r\n${TOKEN}`],
        ["session-uppercase", SESSION_ID.toUpperCase()],
        ["session-wrong-version", "123e4567-e89b-12d3-a456-426614174000"],
        ["session-wrong-variant", "123e4567-e89b-42d3-7456-426614174000"],
      ]) {
        const malicious = await writeDescriptor(
          root,
          fake.url,
          `${name}.json`,
          { sessionId },
        );
        for (const [executable, args] of [
          [CLI_PATH, ["--descriptor", malicious, "ready"]],
          [HEARTBEAT_PATH, ["--descriptor", malicious]],
        ]) {
          await assert.rejects(
            execFileAsync(process.execPath, [executable, ...args], {
              encoding: "utf8",
            }),
            (error) => {
              assert.notEqual(error.code, 0);
              assert.equal(`${error.stdout}${error.stderr}`.includes(TOKEN), false);
              return true;
            },
          );
        }
      }

      const { sequencePath, framePath, lockPath } =
        driverRequestSequencePaths(descriptorPath);
      await writeFile(sequencePath, "4\n");
      await writeFile(framePath, "1\n");
      await writeFile(`${sequencePath}.123.abandoned.tmp`, "stale");
      await writeFile(`${framePath}.123.abandoned.tmp`, "stale");
      await mkdir(lockPath);
      await assert.rejects(
        cleanupDriverRequestSequence(descriptorPath, {
          minimumLockAgeMs: 0,
          processExists: () => false,
        }),
        /AI_DRIVER_SEQUENCE_LOCK_OWNER_MISSING/u,
      );
      await access(lockPath);
      await rm(lockPath, { recursive: true });
      await mkdir(lockPath);
      await writeFile(
        path.join(lockPath, "owner.json"),
        `${JSON.stringify({
          pid: 999_999,
          ownerToken: "11111111-1111-4111-8111-111111111111",
          createdAt: 1_000,
        })}\n`,
      );
      await cleanupDriverRequestSequence(descriptorPath, {
        now: () => 10_000,
        minimumLockAgeMs: 1_000,
        processExists: () => false,
      });
      for (const target of [
        sequencePath,
        framePath,
        `${sequencePath}.123.abandoned.tmp`,
        `${framePath}.123.abandoned.tmp`,
        lockPath,
      ]) {
        await assert.rejects(access(target), { code: "ENOENT" });
      }
      const runner = await readFile(
        new URL("../../tools/run-ai-playtest-session.mjs", import.meta.url),
        "utf8",
      );
      assert.match(
        runner,
        /finally\s*\{[\s\S]*cleanupDriverRequestSequence\(options\.driverDescriptorPath\)/u,
      );
    } finally {
      await fake.close();
    }
  });
});
