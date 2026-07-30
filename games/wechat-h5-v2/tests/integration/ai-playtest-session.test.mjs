import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  assertCompleteRunObservation,
  assertExpectedEntryUrl,
  assertNormalRuntimeSnapshot,
  assertSafeDriverPaths,
  assertSourceState,
  assertStableSourceState,
  buildReportDraft,
  buildRunEventLog,
  buildRunMachineFacts,
  captureAiPlaytestSession,
  collectRunCompletionIssues,
  createRunObservationState,
  finalizeSessionEvidence,
  hashRunEvidence,
  normalizeOutcome,
  observeRunPoll,
  runClaimedSessionLifecycle,
  stopAndPublishSessionTrace,
  validateSessionOptions,
  verifyServedDistFiles,
  writeJsonExclusive,
} from "../../tools/run-ai-playtest-session.mjs";
import {
  createActionAuditLog,
} from "../../tools/ai-playtest/action-audit-log.mjs";
import {
  startDriverIpcServer,
} from "../../tools/ai-playtest/driver-ipc-server.mjs";
import {
  driverRequestSequencePaths,
} from "../../tools/ai-playtest/driver-request-sequence.mjs";
import {
  claimOutputDirectory,
  publishBufferExclusive,
  publishTemporaryFileExclusive,
  quarantineIncompleteSession,
} from "../../tools/ai-playtest/exclusive-artifacts.mjs";
import {
  runSessionLifecycle,
} from "../../tools/ai-playtest/session-lifecycle.mjs";

const COMMIT = "a".repeat(40);

function validOptions(overrides = {}) {
  return {
    roundId: "baseline",
    gameId: "ricochet-crew",
    reviewerRole: "action",
    entryUrl: "http://127.0.0.1:5174/",
    output: "evidence/baseline/action-ricochet-crew",
    expectedCommit: COMMIT,
    ...overrides,
  };
}

function lifecycleEvent(event, runId, seq, eventId = `${event}-${runId}-${seq}`) {
  return {
    eventId,
    sessionId: "session-1",
    runId,
    gameId: "ricochet-crew",
    event,
    seq,
    clientAt: seq * 1_000,
    schemaVersion: 1,
    testMode: false,
    payload: event === "run_end" ? { result: "won" } : {},
  };
}

async function assertExclusiveBufferRace(payloads) {
  const root = await mkdtemp(path.join(tmpdir(), "ai-buffer-race-"));
  const target = path.join(root, "entry.png");
  try {
    const results = await Promise.allSettled(
      payloads.map((payload) => publishBufferExclusive(target, payload)),
    );
    assert.equal(
      results.filter(({ status }) => status === "fulfilled").length,
      1,
    );
    assert.equal(
      results.filter(({ status }) => status === "rejected").length,
      1,
    );
    assert.match(
      String(results.find(({ status }) => status === "rejected")?.reason),
      /AI_PLAYTEST_ARTIFACT_EXISTS/u,
    );
    const published = await readFile(target);
    assert.equal(payloads.some((payload) => published.equals(payload)), true);
    assert.deepEqual(
      (await readdir(root)).filter((entry) => entry.endsWith(".tmp")),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function fakeBrowserResources({
  failurePoint,
  calls,
  traceOptions,
  closeFailures = [],
}) {
  const failAt = (point) => {
    if (failurePoint === point) {
      throw new Error(`simulated ${point} initialization failure`);
    }
  };
  const page = {
    async close() {
      calls.push("close:page");
      if (closeFailures.includes("page")) throw new Error("page-close-failed");
    },
  };
  const context = {
    tracing: {
      async start(options) {
        calls.push("init:tracing");
        traceOptions.push(options);
        failAt("tracing");
      },
    },
    async newPage() {
      calls.push("init:page");
      failAt("page");
      return page;
    },
    async close() {
      calls.push("close:context");
      if (closeFailures.includes("context")) {
        throw new Error("context-close-failed");
      }
    },
  };
  const browser = {
    async newContext() {
      calls.push("init:context");
      failAt("context");
      return context;
    },
    async close() {
      calls.push("close:browser");
      if (closeFailures.includes("browser")) {
        throw new Error("browser-close-failed");
      }
    },
  };
  return {
    async launch() {
      calls.push("init:launch");
      failAt("launch");
      return browser;
    },
    async configurePage() {
      calls.push("init:configure_page");
      failAt("configure_page");
    },
    async execute() {},
    async stopTracing() {
      calls.push("stop:tracing");
    },
  };
}

async function fakeDriverCapture(scenario = "success") {
  const root = await mkdtemp(path.join(tmpdir(), "ai-driver-runner-"));
  const roundRoot = path.join(root, "baseline");
  const output = path.join(roundRoot, "action-ricochet-crew");
  const invalidRoot = path.join(root, "invalid");
  const draftOutput = path.join(root, "drafts", "report-draft.json");
  const driverDescriptorPath = path.join(
    root,
    "descriptors",
    "driver.json",
  );
  const driverSequencePaths =
    driverRequestSequencePaths(driverDescriptorPath);
  await Promise.all([
    mkdir(roundRoot, { recursive: true }),
    mkdir(path.dirname(draftOutput), { recursive: true }),
    mkdir(path.dirname(driverDescriptorPath), { recursive: true }),
  ]);

  const sessionId = "11111111-1111-4111-8111-111111111111";
  const token = "ab".repeat(32);
  const events = [];
  let sequence = 0;
  for (let index = 1; index <= 3; index += 1) {
    const runId = `run-${index}`;
    events.push({
      ...lifecycleEvent("run_start", runId, ++sequence),
      sessionId,
    });
    events.push({
      ...lifecycleEvent("first_input", runId, ++sequence),
      event: "first_input",
      sessionId,
    });
    events.push({
      ...lifecycleEvent("run_end", runId, ++sequence),
      sessionId,
    });
  }
  const snapshots = [
    [],
    events.slice(0, 2),
    events.slice(0, 3),
    events.slice(0, 5),
    events.slice(0, 6),
    events.slice(0, 8),
    events.slice(0, 9),
  ];
  if (scenario === "fourth-run") {
    snapshots.push([
      ...events,
      {
        ...lifecycleEvent("run_start", "run-4", ++sequence),
        sessionId,
      },
    ]);
  } else {
    snapshots.push(events);
  }

  let clock = 1_000;
  let telemetryReads = 0;
  let phase = "initial";
  let requestSeq = 0;
  let screenshotCount = 0;
  const replaySent = new Set();
  const waitDelays = [];
  let context;

  const sendTap = async () => {
    const descriptor = JSON.parse(
      await readFile(driverDescriptorPath, "utf8"),
    );
    requestSeq += 1;
    const response = await fetch(descriptor.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${descriptor.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type: "touchTap",
        sessionId: descriptor.sessionId,
        requestSeq,
        actionId: `tap-${requestSeq}`,
        frameSeq: 0,
        x: 10,
        y: 20,
      }),
    });
    assert.equal(response.status, 200);
  };

  const page = {
    on() {},
    context: () => context,
    url: () => "http://127.0.0.1:4173/ricochet-crew/",
    touchscreen: {
      async tap() {},
    },
    async goto() {
      await writeFile(driverSequencePaths.sequencePath, "9\n");
      await writeFile(driverSequencePaths.framePath, "0\n");
      await writeFile(
        `${driverSequencePaths.sequencePath}.123.runner.tmp`,
        "stale",
      );
      await writeFile(
        `${driverSequencePaths.framePath}.123.runner.tmp`,
        "stale",
      );
      if (scenario === "disconnect") {
        clock += 10_001;
        await new Promise((resolve) => setTimeout(resolve, 15));
      } else {
        await sendTap();
      }
    },
    async evaluate(callback) {
      if (callback.toString().includes("localStorage.getItem")) {
        const snapshot = snapshots[
          Math.min(telemetryReads, snapshots.length - 1)
        ];
        telemetryReads += 1;
        phase = [
          "initial",
          "start-1",
          "end-1",
          "start-2",
          "end-2",
          "start-3",
          "end-3",
          "final",
        ][Math.min(telemetryReads - 1, 7)];
        return snapshot;
      }
      return {
        debugGlobals: [],
        publicState: { testMode: false, timeScale: 1 },
      };
    },
    async screenshot() {
      screenshotCount += 1;
      return Buffer.from(`png-${screenshotCount}`);
    },
    async waitForTimeout(delayMs) {
      waitDelays.push(delayMs);
      if (
        delayMs === 500
        && (phase === "end-1" || phase === "end-2")
        && !replaySent.has(phase)
      ) {
        replaySent.add(phase);
        await sendTap();
      }
    },
    async close() {},
  };
  context = {
    tracing: {
      async start() {},
      async stop({ path: target }) {
        await writeFile(target, "trace", { flag: "wx" });
      },
    },
    async newPage() {
      return page;
    },
    async newCDPSession() {
      return { send: async () => ({ private: true }) };
    },
    async close() {},
  };
  const browser = {
    async newContext() {
      return context;
    },
    async close() {},
  };
  const sourceState = {
    expectedCommit: COMMIT,
    headCommit: COMMIT,
    clean: true,
    statusEntries: [],
  };
  const servedDist = {
    expectedCommit: COMMIT,
    aggregateSha256: "d".repeat(64),
    files: [],
    fileCount: 0,
  };

  const options = {
    roundId: "baseline",
    gameId: "ricochet-crew",
    reviewerRole: "action",
    entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
    output,
    expectedCommit: COMMIT,
    driverEnabled: true,
    driverDescriptorPath,
    draftOutput,
    invalidRoot,
    timeoutMs: 5_000,
  };
  const dependencies = {
    randomUUID: () => sessionId,
    randomBytes: () => Buffer.from(token, "hex"),
    readSourceState: async () => sourceState,
    attestServedDist: async () => servedDist,
    launch: async () => browser,
    startDriverIpcServer: (driverOptions) => startDriverIpcServer({
      ...driverOptions,
      now: () => clock,
      healthCheckIntervalMs: 5,
    }),
    ...(scenario === "action-log-close"
      ? {
          async createActionAuditLog(...args) {
            const realLog = await createActionAuditLog(...args);
            return {
              write: (record) => realLog.write(record),
              async close() {
                await realLog.close();
                throw new Error("simulated-action-log-close-failure");
              },
            };
          },
        }
      : {}),
  };
  let evidence = null;
  let error = null;
  try {
    evidence = await captureAiPlaytestSession(options, dependencies);
  } catch (caught) {
    error = caught;
  }
  return {
    root,
    output,
    invalidRoot,
    draftOutput,
    driverDescriptorPath,
    sessionId,
    token,
    evidence,
    error,
    waitDelays,
    driverSequencePaths,
  };
}

function expectedClosures(failurePoint) {
  return {
    launch: [],
    context: ["close:browser"],
    page: ["close:context", "close:browser"],
    configure_page: ["close:page", "close:context", "close:browser"],
    tracing: ["close:page", "close:context", "close:browser"],
  }[failurePoint];
}

describe("trusted AI driver runner integration", () => {
  it("writes an exclusive synced action log and closes it idempotently", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-actions-"));
    const target = path.join(root, "session-actions.jsonl");
    try {
      const log = await createActionAuditLog(target);
      await log.write({
        schemaVersion: 1,
        type: "touchTap",
        actionId: "tap-1",
        requestSeq: 1,
        frameSeq: 0,
        x: 10,
        y: 20,
        requestedAt: 1,
        executedAt: 2,
        completedAt: 3,
        result: "success",
        sessionId: "session-1",
        gameId: "ricochet-crew",
        runId: "run-1",
      });
      await log.close();
      await log.close();
      assert.deepEqual(
        JSON.parse((await readFile(target, "utf8")).trim()),
        {
          schemaVersion: 1,
          type: "touchTap",
          actionId: "tap-1",
          requestSeq: 1,
          frameSeq: 0,
          x: 10,
          y: 20,
          requestedAt: 1,
          executedAt: 2,
          completedAt: 3,
          result: "success",
          sessionId: "session-1",
          gameId: "ricochet-crew",
          runId: "run-1",
        },
      );
      await assert.rejects(
        log.write({ type: "touchTap" }),
        /AI_DRIVER_ACTION_LOG_CLOSED/u,
      );
      await assert.rejects(
        createActionAuditLog(target),
        (error) => error?.code === "EEXIST",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects token, HTML, storage, globals, and CDP response fields", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-actions-safe-"));
    try {
      for (const forbiddenField of [
        "token",
        "html",
        "storage",
        "globals",
        "cdpResponse",
      ]) {
        const log = await createActionAuditLog(
          path.join(root, `${forbiddenField}.jsonl`),
        );
        await assert.rejects(
          log.write({
            type: "touchTap",
            [forbiddenField]: "secret",
          }),
          /AI_DRIVER_ACTION_LOG_FORBIDDEN_FIELD/u,
        );
        await log.close();
      }
      const secretValue = "e".repeat(64);
      const secretLog = await createActionAuditLog(
        path.join(root, "secret-value.jsonl"),
        { forbiddenValues: [secretValue] },
      );
      await assert.rejects(
        secretLog.write({
          type: "touchTap",
          actionId: secretValue,
        }),
        /AI_DRIVER_ACTION_LOG_SECRET_VALUE/u,
      );
      await secretLog.close();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects structurally unsafe action field values without keyword filtering", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-actions-schema-"));
    const target = path.join(root, "session-actions.jsonl");
    const unsafeValues = [
      { actionId: "<html>" },
      { actionId: { storage: "private" } },
      { result: "{\"cdpResponse\":{\"ok\":true}}" },
      { gestureId: "gesture-1\n{\"globals\":true}" },
      { errorCode: "[\"STORAGE_DUMP\"]" },
      { sessionId: ["session-1"] },
      { gameId: "g".repeat(129) },
      { runId: String.raw`run\1` },
      { requestSeq: 0 },
      { requestSeq: { value: 1 } },
      { frameSeq: -1 },
      { x: Number.POSITIVE_INFINITY },
      { requestedAt: "1" },
      { completedAt: { now: 3 } },
      { schemaVersion: "1" },
      { type: "touchTap<script>" },
    ];
    try {
      const log = await createActionAuditLog(target);
      for (const unsafe of unsafeValues) {
        await assert.rejects(
          log.write({ type: "touchTap", ...unsafe }),
          /AI_DRIVER_ACTION_LOG_FIELD_INVALID/u,
        );
      }
      await log.write({
        schemaVersion: 1,
        type: "touchTap",
        actionId: "action:run_1.step-2",
        requestSeq: 1,
        frameSeq: 0,
        gestureId: "gesture:run_1.step-2",
        x: -0.5,
        y: 843.5,
        requestedAt: 1,
        executedAt: 2,
        completedAt: 3,
        result: "failure",
        errorCode: "AI_DRIVER_TOUCH_FAILED",
        sessionId: "session:run_1.step-2",
        gameId: "ricochet-crew",
        runId: "run-1",
      });
      await log.close();
      const lines = (await readFile(target, "utf8")).trim().split(/\r?\n/u);
      assert.equal(lines.length, 1);
      assert.equal(JSON.parse(lines[0]).actionId, "action:run_1.step-2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("latches the first partial write failure and closes the handle", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-actions-write-fault-"));
    const persistenceError = new Error("partial-write-failed");
    let closeCalls = 0;
    const handle = {
      async writeFile() {
        throw persistenceError;
      },
      async sync() {
        assert.fail("sync must not follow a failed write");
      },
      async close() {
        closeCalls += 1;
      },
    };
    let log;
    try {
      log = await createActionAuditLog(
        path.join(root, "session-actions.jsonl"),
        { openFile: async () => handle },
      );
      await assert.rejects(
        log.write({ type: "touchTap" }),
        (error) => error === persistenceError,
      );
      await assert.rejects(
        log.write({ type: "touchTap", actionId: "after-failure" }),
        (error) => error === persistenceError,
      );
      await assert.rejects(
        log.close(),
        (error) => error === persistenceError,
      );
      await assert.rejects(
        log.close(),
        (error) => error === persistenceError,
      );
      assert.equal(closeCalls, 1);
    } finally {
      await log?.close().catch(() => {});
      await rm(root, { recursive: true, force: true });
    }
  });

  it("waits for concurrent writes on close and aggregates sync plus close failures", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-actions-sync-fault-"));
    const syncError = new Error("sync-failed");
    const closeError = new Error("close-failed");
    let releaseWrite;
    let writeStarted;
    let writeCalls = 0;
    let closeCalls = 0;
    const started = new Promise((resolve) => {
      writeStarted = resolve;
    });
    const blocked = new Promise((resolve) => {
      releaseWrite = resolve;
    });
    const handle = {
      async writeFile() {
        writeCalls += 1;
        writeStarted();
        await blocked;
      },
      async sync() {
        throw syncError;
      },
      async close() {
        closeCalls += 1;
        throw closeError;
      },
    };
    let log;
    try {
      log = await createActionAuditLog(
        path.join(root, "session-actions.jsonl"),
        { openFile: async () => handle },
      );
      const firstWrite = log.write({ type: "touchTap", actionId: "first" });
      const queuedWrite = log.write({ type: "touchTap", actionId: "second" });
      await Promise.race([
        started,
        new Promise((_, reject) => {
          setTimeout(
            () => reject(
              new Error("AI_DRIVER_ACTION_LOG_OPEN_INJECTION_IGNORED"),
            ),
            100,
          );
        }),
      ]);
      let closeSettled = false;
      const close = log.close().finally(() => {
        closeSettled = true;
      });
      await Promise.resolve();
      assert.equal(closeSettled, false);
      releaseWrite();
      await assert.rejects(
        firstWrite,
        (error) => error === syncError,
      );
      await assert.rejects(
        queuedWrite,
        (error) => error === syncError,
      );
      await assert.rejects(close, (error) => {
        assert.equal(error instanceof AggregateError, true);
        assert.deepEqual(error.errors, [syncError, closeError]);
        return true;
      });
      assert.equal(writeCalls, 1);
      assert.equal(closeCalls, 1);
    } finally {
      releaseWrite();
      await log?.close().catch(() => {});
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires driver paths outside formal output and invalid root outside the round", () => {
    const root = path.resolve("evidence");
    const output = path.join(
      root,
      "baseline",
      "action-ricochet-crew",
    );
    const base = {
      ...validOptions({
        entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
        output,
      }),
      driverEnabled: true,
      driverDescriptorPath: path.join(root, "tmp", "driver.json"),
      draftOutput: path.join(root, "drafts", "draft.json"),
      invalidRoot: path.join(root, "invalid"),
    };
    assert.equal(validateSessionOptions(base).driverEnabled, true);
    assert.throws(
      () => validateSessionOptions({
        ...base,
        draftOutput: path.join(output, "report-draft.json"),
      }),
      /AI_PLAYTEST_DRAFT_INSIDE_OUTPUT/u,
    );
    assert.throws(
      () => validateSessionOptions({
        ...base,
        invalidRoot: path.join(root, "baseline", "invalid"),
      }),
      /AI_PLAYTEST_INVALID_ROOT_INSIDE_ROUND/u,
    );
    assert.throws(
      () => validateSessionOptions({
        ...base,
        driverDescriptorPath: path.join(output, "driver.json"),
      }),
      /AI_PLAYTEST_DESCRIPTOR_INSIDE_OUTPUT/u,
    );
    assert.throws(
      () => validateSessionOptions({
        ...base,
        driverDescriptorPath: base.draftOutput,
      }),
      /AI_PLAYTEST_DRIVER_PATH_OVERLAP/u,
    );
    assert.throws(
      () => validateSessionOptions({
        ...base,
        invalidRoot: root,
      }),
      /AI_PLAYTEST_DRIVER_PATH_OVERLAP/u,
    );
  });

  it("rejects reparse parents and canonical driver path aliases", async () => {
    const root = path.resolve("canonical-driver-paths");
    const output = path.join(
      root,
      "baseline",
      "action-ricochet-crew",
    );
    const descriptor = path.join(root, "linked", "driver.json");
    const draft = path.join(root, "drafts", "draft.json");
    const invalidRoot = path.join(root, "invalid");
    const ordinaryStats = {
      isSymbolicLink: () => false,
    };
    await assert.rejects(
      assertSafeDriverPaths({
        output,
        driverDescriptorPath: descriptor,
        draftOutput: draft,
        invalidRoot,
      }, {
        lstatImpl: async (target) => ({
          isSymbolicLink: () => target === path.join(root, "linked"),
        }),
        realpathImpl: async (target) => target,
      }),
      /AI_PLAYTEST_DRIVER_PATH_REPARSE/u,
    );
    await assert.rejects(
      assertSafeDriverPaths({
        output,
        driverDescriptorPath: descriptor,
        draftOutput: draft,
        invalidRoot,
      }, {
        lstatImpl: async () => ordinaryStats,
        realpathImpl: async (target) => (
          target === draft ? descriptor : target
        ),
      }),
      /AI_PLAYTEST_DRIVER_PATH_OVERLAP/u,
    );
    await assert.rejects(
      assertSafeDriverPaths({
        output,
        driverDescriptorPath: descriptor,
        draftOutput: draft,
        invalidRoot,
      }, {
        lstatImpl: async () => ordinaryStats,
        realpathImpl: async (target) => (
          target === invalidRoot
            ? path.join(root, "baseline", "invalid-alias")
            : target
        ),
      }),
      /AI_PLAYTEST_INVALID_ROOT_INSIDE_ROUND/u,
    );
  });

  it("orchestrates three runs, removes the descriptor, and hashes closed actions", async () => {
    const capture = await fakeDriverCapture("success");
    try {
      assert.equal(capture.error, null);
      assert.equal(capture.evidence.status, "CAPTURED");
      assert.equal(capture.evidence.executionTrust, "local-audited");
      assert.equal(capture.evidence.driver.protocol, "loopback-whitelist-v1");
      assert.equal(capture.evidence.driver.sessionId, capture.sessionId);
      assert.equal(capture.evidence.driver.descriptorPath, null);
      assert.equal(capture.evidence.driver.fatalReason, null);
      assert.equal(capture.evidence.entryScreenshotPath, "entry.png");
      assert.equal(capture.evidence.actionLogPath, "session-actions.jsonl");
      assert.equal(capture.evidence.tracePath, "session-trace.zip");
      assert.deepEqual(
        capture.waitDelays.filter((delayMs) => delayMs >= 1_000),
        [1_000, 1_000, 1_000],
      );

      await assert.rejects(access(capture.driverDescriptorPath), {
        code: "ENOENT",
      });
      for (const target of [
        capture.driverSequencePaths.sequencePath,
        capture.driverSequencePaths.framePath,
        `${capture.driverSequencePaths.sequencePath}.123.runner.tmp`,
        `${capture.driverSequencePaths.framePath}.123.runner.tmp`,
        capture.driverSequencePaths.lockPath,
      ]) {
        await assert.rejects(access(target), { code: "ENOENT" });
      }
      await assert.rejects(
        access(path.join(capture.output, "report-draft.json")),
        { code: "ENOENT" },
      );
      const draft = JSON.parse(await readFile(capture.draftOutput, "utf8"));
      assert.equal(draft.draftOnly, true);
      const actionBytes = await readFile(
        path.join(capture.output, "session-actions.jsonl"),
      );
      const actionLines = actionBytes.toString("utf8").trim().split(/\r?\n/u);
      assert.equal(actionLines.length, 3);
      assert.deepEqual(
        actionLines.map((line) => JSON.parse(line).runId),
        ["run-1", "run-2", "run-3"],
      );
      assert.equal(actionBytes.includes(Buffer.from(capture.token)), false);
      assert.equal(
        capture.evidence.evidenceSha256["session-actions.jsonl"],
        createHash("sha256").update(actionBytes).digest("hex"),
      );
      for (const target of [
        path.join(capture.output, "session-evidence.json"),
        capture.draftOutput,
      ]) {
        assert.equal(
          (await readFile(target, "utf8")).includes(capture.token),
          false,
        );
      }
    } finally {
      await rm(capture.root, { recursive: true, force: true });
    }
  });

  it("quarantines disconnect and fourth-run sessions without a draft", async () => {
    for (const scenario of ["disconnect", "fourth-run"]) {
      const capture = await fakeDriverCapture(scenario);
      try {
        assert.equal(capture.evidence, null);
        assert.match(
          capture.error?.message ?? "",
          /AI_PLAYTEST_SESSION_INCOMPLETE/u,
        );
        assert.match(capture.error?.invalidOutput ?? "", /invalid/u);
        const durable = JSON.parse(
          await readFile(
            path.join(capture.error.invalidOutput, "session-evidence.json"),
            "utf8",
          ),
        );
        assert.equal(durable.status, "INCOMPLETE");
        assert.match(
          durable.diagnostics.terminalErrors.join("|"),
          scenario === "disconnect"
            ? /AI_DRIVER_HEARTBEAT_TIMEOUT/u
            : /FOURTH_RUN/u,
        );
        await assert.rejects(access(capture.driverDescriptorPath), {
          code: "ENOENT",
        });
        await assert.rejects(access(capture.draftOutput), { code: "ENOENT" });
      } finally {
        await rm(capture.root, { recursive: true, force: true });
      }
    }
  });

  it("quarantines after an action log close failure and keeps the draft absent", async () => {
    const capture = await fakeDriverCapture("action-log-close");
    try {
      assert.equal(capture.evidence, null);
      assert.match(
        capture.error?.message ?? "",
        /AI_PLAYTEST_SESSION_INCOMPLETE/u,
      );
      const durable = JSON.parse(
        await readFile(
          path.join(capture.error.invalidOutput, "session-evidence.json"),
          "utf8",
        ),
      );
      assert.match(
        durable.diagnostics.terminalErrors.join("|"),
        /simulated-action-log-close-failure/u,
      );
      await assert.rejects(access(capture.draftOutput), { code: "ENOENT" });
      await assert.rejects(access(capture.driverDescriptorPath), {
        code: "ENOENT",
      });
    } finally {
      await rm(capture.root, { recursive: true, force: true });
    }
  });
});

describe("formal AI playtest staged lifecycle", () => {
  for (const failurePoint of [
    "launch",
    "context",
    "page",
    "configure_page",
    "tracing",
  ]) {
    it(`closes every initialized resource when ${failurePoint} initialization fails`, async () => {
      const calls = [];
      const traceOptions = [];
      await assert.rejects(
        runSessionLifecycle(
          fakeBrowserResources({ failurePoint, calls, traceOptions }),
        ),
        /AI_PLAYTEST_INITIALIZATION/u,
      );
      assert.deepEqual(
        calls.filter((name) => name.startsWith("close:")),
        expectedClosures(failurePoint),
      );
      if (failurePoint === "tracing") {
        assert.equal(calls.includes("stop:tracing"), true);
      }
    });
  }

  it("starts tracing with only snapshots enabled", async () => {
    const calls = [];
    const traceOptions = [];
    await runSessionLifecycle(
      fakeBrowserResources({ failurePoint: null, calls, traceOptions }),
    );
    assert.deepEqual(traceOptions, [{
      screenshots: false,
      snapshots: true,
      sources: false,
    }]);
    assert.deepEqual(
      calls.filter((name) => name.startsWith("close:")),
      ["close:page", "close:context", "close:browser"],
    );
  });

  it("preserves tracing start, stop and every close failure", async () => {
    const calls = [];
    const traceOptions = [];
    const recorded = [];
    const resources = fakeBrowserResources({
      failurePoint: "tracing",
      calls,
      traceOptions,
      closeFailures: ["page", "context", "browser"],
    });
    resources.stopTracing = async () => {
      calls.push("stop:tracing");
      throw new Error("trace-stop-failed");
    };
    resources.recordError = (error) => recorded.push(error);
    await assert.rejects(
      runSessionLifecycle(resources),
      (error) => {
        assert.equal(error instanceof AggregateError, true);
        const messages = error.errors.map((item) => item.message).join("|");
        assert.match(messages, /tracing initialization failure/u);
        assert.match(messages, /trace-stop-failed/u);
        assert.match(messages, /page-close-failed/u);
        assert.match(messages, /context-close-failed/u);
        assert.match(messages, /browser-close-failed/u);
        return true;
      },
    );
    assert.equal(recorded.length, 4);
  });

  it("cleans a partial trace through the claimed-session orchestration", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-trace-partial-"));
    const partial = path.join(root, ".session-trace.partial.tmp");
    const calls = [];
    const terminalErrors = [];
    try {
      const page = {
        async close() {
          calls.push("close:page");
        },
      };
      const context = {
        tracing: {
          async start() {},
          async stop({ path: target }) {
            await writeFile(target, "partial", { flag: "wx" });
            throw new Error("trace-stop-partial-failed");
          },
        },
        async newPage() {
          return page;
        },
        async close() {
          calls.push("close:context");
        },
      };
      const browser = {
        async newContext() {
          return context;
        },
        async close() {
          calls.push("close:browser");
        },
      };
      const lifecycle = await runClaimedSessionLifecycle({
        output: root,
        launch: async () => browser,
        configurePage: async () => {},
        execute: async () => {},
        recordError: (error) => terminalErrors.push(error.message),
        stopTraceOptions: {
          temporaryPath: async () => partial,
          cleanupRetryDelaysMs: [0, 0],
          wait: async () => {},
        },
      });
      assert.match(lifecycle.traceError.message, /trace-stop-partial-failed/u);
      assert.match(terminalErrors.join("|"), /trace-stop-partial-failed/u);
      await assert.rejects(readFile(partial), { code: "ENOENT" });
      assert.deepEqual(calls, [
        "close:page",
        "close:context",
        "close:browser",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves the trace error when partial trace cleanup also fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-trace-cleanup-"));
    const partial = path.join(root, ".session-trace.partial.tmp");
    const traceError = new Error("trace-stop-partial-failed");
    const cleanupError = Object.assign(new Error("trace-cleanup-failed"), {
      code: "EBUSY",
    });
    try {
      await assert.rejects(
        stopAndPublishSessionTrace({
          context: {
            tracing: {
              async stop({ path: target }) {
                await writeFile(target, "partial", { flag: "wx" });
                throw traceError;
              },
            },
          },
          output: root,
          temporaryPath: async () => partial,
          unlinkImpl: async () => {
            throw cleanupError;
          },
          cleanupRetryDelaysMs: [0, 0],
          wait: async () => {},
        }),
        (error) => {
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(traceError), true);
          assert.equal(error.errors.includes(cleanupError), true);
          assert.match(error.message, /trace-stop-partial-failed/u);
          assert.match(error.message, /AI_PLAYTEST_TRACE_TEMP_CLEANUP_FAILED/u);
          return true;
        },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes INCOMPLETE evidence without success hashing when trace stop fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-trace-failure-"));
    const calls = [];
    const traceOptions = [];
    const terminalErrors = [];
    let hashCalls = 0;
    try {
      const resources = fakeBrowserResources({
        failurePoint: null,
        calls,
        traceOptions,
      });
      resources.stopTracing = async () => {
        throw new Error("trace-stop-failed");
      };
      resources.recordError = (error) => {
        terminalErrors.push(error instanceof Error ? error.message : String(error));
      };
      const lifecycle = await runSessionLifecycle(resources);
      const result = await finalizeSessionEvidence({
        output: directory,
        traceError: lifecycle.traceError,
        completedRuns: [],
        terminalErrors,
        hashEvidence: async () => {
          hashCalls += 1;
          throw new Error("success-only hasher must not run");
        },
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.match(result.diagnostics.terminalErrors.join("|"), /trace-stop-failed/u);
      assert.equal(hashCalls, 0);
      assert.equal(
        JSON.parse(
          await readFile(path.join(directory, "session-evidence.json"), "utf8"),
        ).status,
        "INCOMPLETE",
      );
      await assert.rejects(
        readFile(path.join(directory, "report-draft.json")),
        { code: "ENOENT" },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("quarantines durable INCOMPLETE evidence and returns its diagnostic path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-finalize-quarantine-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    try {
      await claimOutputDirectory(output);
      const result = await finalizeSessionEvidence({
        output,
        traceError: new Error("trace-stop-failed"),
        completedRuns: [],
        invalidRoot,
        sessionId: "session-1",
        quarantineImpl: (options) => quarantineIncompleteSession({
          ...options,
          randomId: () => "fixed-id",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        }),
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.match(result.invalidOutput, /session-1-fixed-id/u);
      assert.equal(
        JSON.parse(
          await readFile(
            path.join(result.invalidOutput, "session-evidence.json"),
            "utf8",
          ),
        ).status,
        "INCOMPLETE",
      );
      await assert.rejects(readFile(path.join(output, "session-evidence.json")), {
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("finalizes and quarantines evidence after launch initialization fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-init-quarantine-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const calls = [];
    const traceOptions = [];
    let initializationFailure;
    let hashCalls = 0;
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        runSessionLifecycle(fakeBrowserResources({
          failurePoint: "launch",
          calls,
          traceOptions,
        })),
        (error) => {
          initializationFailure = error;
          return /AI_PLAYTEST_INITIALIZATION_LAUNCH/u.test(error.message);
        },
      );
      const result = await finalizeSessionEvidence({
        output,
        completedRuns: [],
        terminalErrors: [initializationFailure],
        invalidRoot,
        sessionId: "session-1",
        hashEvidence: async () => {
          hashCalls += 1;
          throw new Error("success-only hasher must not run");
        },
        quarantineImpl: (options) => quarantineIncompleteSession({
          ...options,
          randomId: () => "fixed-id",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        }),
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.equal(hashCalls, 0);
      assert.match(
        result.diagnostics.terminalErrors.join("|"),
        /AI_PLAYTEST_INITIALIZATION_LAUNCH/u,
      );
      assert.equal(
        JSON.parse(
          await readFile(
            path.join(result.invalidOutput, "session-evidence.json"),
            "utf8",
          ),
        ).status,
        "INCOMPLETE",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("downgrades and quarantines when a CAPTURED candidate write fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-captured-write-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const reportError = new Error("report-candidate-write-failed");
    try {
      await claimOutputDirectory(output);
      const result = await finalizeSessionEvidence({
        output,
        baseEvidence: {
          roundId: "baseline",
          matrixCellId: "baseline:action:ricochet-crew",
          reviewerRole: "action",
          gameId: "ricochet-crew",
          buildCommit: COMMIT,
          entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
          startedAt: "2026-07-29T00:00:00.000Z",
          finishedAt: "2026-07-29T00:01:00.000Z",
        },
        completedRuns: [],
        complete: true,
        hashEvidence: async () => ({}),
        invalidRoot,
        sessionId: "session-1",
        writeEvidence: async (target, value) => {
          if (path.basename(target).includes("report-draft")) throw reportError;
          await writeFile(target, `${JSON.stringify(value)}\n`, { flag: "wx" });
        },
        quarantineImpl: (options) => quarantineIncompleteSession({
          ...options,
          randomId: () => "fixed-id",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        }),
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.match(
        result.diagnostics.terminalErrors.join("|"),
        /report-candidate-write-failed/u,
      );
      const durable = JSON.parse(
        await readFile(
          path.join(result.invalidOutput, "session-evidence.json"),
          "utf8",
        ),
      );
      assert.equal(durable.status, "INCOMPLETE");
      await assert.rejects(
        readFile(path.join(result.invalidOutput, "report-draft.json")),
        { code: "ENOENT" },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines partial output and aggregates an INCOMPLETE write failure", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-write-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const originalError = new Error("original-session-failure");
    const writeError = new Error("incomplete-evidence-write-failed");
    let caught;
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        finalizeSessionEvidence({
          output,
          completedRuns: [],
          terminalErrors: [originalError],
          invalidRoot,
          sessionId: "session-1",
          writeEvidence: async () => {
            throw writeError;
          },
          quarantineImpl: (options) => quarantineIncompleteSession({
            ...options,
            randomId: () => "fixed-id",
            now: () => Date.parse("2026-07-29T01:02:03.456Z"),
          }),
        }),
        (error) => {
          caught = error;
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(originalError), true);
          assert.equal(error.errors.includes(writeError), true);
          assert.match(error.invalidOutput, /session-1-fixed-id/u);
          return true;
        },
      );
      assert.equal(caught.output, output);
      assert.equal(
        caught.evidencePath,
        path.join(output, "session-evidence.json"),
      );
      await assert.rejects(readdir(output), { code: "ENOENT" });
      assert.deepEqual(await readdir(caught.invalidOutput), []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("aggregates recorded errors when quarantine itself fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-quarantine-failure-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const originalError = new Error("original-session-failure");
    const quarantineError = new Error("quarantine-failed");
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        finalizeSessionEvidence({
          output,
          completedRuns: [],
          terminalErrors: [originalError],
          invalidRoot,
          sessionId: "session-1",
          quarantineImpl: async () => {
            throw quarantineError;
          },
        }),
        (error) => {
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(originalError), true);
          assert.equal(error.errors.includes(quarantineError), true);
          assert.equal(error.output, output);
          assert.equal(
            error.evidencePath,
            path.join(output, "session-evidence.json"),
          );
          assert.match(error.message, /AI_PLAYTEST_QUARANTINE_FAILED/u);
          return true;
        },
      );
      assert.equal(
        JSON.parse(
          await readFile(path.join(output, "session-evidence.json"), "utf8"),
        ).status,
        "INCOMPLETE",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("formal AI playtest source gate", () => {
  it("uses the single 4173 dist server and game path by default", () => {
    const options = validOptions({ entryUrl: undefined });
    assert.equal(
      validateSessionOptions(options).entryUrl,
      "http://127.0.0.1:4173/ricochet-crew/",
    );
  });

  it("rejects an invalid or mismatched expected commit before capture", () => {
    assert.throws(
      () => validateSessionOptions(validOptions({ expectedCommit: "HEAD" })),
      /expectedCommit/i,
    );
    assert.throws(() => assertSourceState({
      expectedCommit: COMMIT,
      headCommit: "b".repeat(40),
      clean: true,
      statusEntries: [],
    }), /COMMIT_MISMATCH/);
  });

  it("rejects a dirty game source tree", () => {
    assert.throws(() => assertSourceState({
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: false,
      statusEntries: [" M apps/example.ts"],
    }), /SOURCE_DIRTY/);
  });

  it("rejects a source tree that becomes dirty after capture", () => {
    const start = {
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: true,
      statusEntries: [],
    };
    assert.throws(() => assertStableSourceState(start, {
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: false,
      statusEntries: [" M apps/example.ts"],
    }), /SOURCE_DIRTY/);
  });
});

describe("formal AI playtest page safety", () => {
  it("requires the exact game URL at startup and during every poll", () => {
    assert.equal(
      assertExpectedEntryUrl(
        "http://127.0.0.1:4173/ricochet-crew/",
        "ricochet-crew",
      ),
      "http://127.0.0.1:4173/ricochet-crew/",
    );
    for (const invalid of [
      "http://localhost:4173/ricochet-crew/",
      "http://127.0.0.1:4174/ricochet-crew/",
      "http://127.0.0.1:4173/monster-night-market/",
      "http://127.0.0.1:4173/ricochet-crew/?test=0",
      "http://127.0.0.1:4173/ricochet-crew/#play",
      "https://127.0.0.1:4173/ricochet-crew/",
    ]) {
      assert.throws(
        () => assertExpectedEntryUrl(invalid, "ricochet-crew"),
        /ENTRY_URL_MISMATCH/,
      );
    }
  });

  it("rejects exposed debug globals or test telemetry", () => {
    assert.throws(() => assertNormalRuntimeSnapshot({
      debugGlobals: ["__GAME_TEST__"],
      telemetryTestModes: [false],
      publicState: { testMode: "unavailable", timeScale: "unavailable" },
    }), /DEBUG_GLOBAL_EXPOSED/);
    assert.throws(() => assertNormalRuntimeSnapshot({
      debugGlobals: [],
      telemetryTestModes: [false, true],
      publicState: { testMode: "unavailable", timeScale: "unavailable" },
    }), /testMode/i);
  });

  it("accepts unavailable public state without injecting a probe", () => {
    assert.deepEqual(assertNormalRuntimeSnapshot({
      debugGlobals: [],
      telemetryTestModes: [false],
      publicState: { testMode: "unavailable", timeScale: "unavailable" },
    }).normalEntry, true);
  });

  it("rejects served dist bytes that differ from the expected commit", async () => {
    const files = [{
      path: "dist/ricochet-crew/index.html",
      bytes: Buffer.from("expected"),
    }];
    await assert.rejects(
      verifyServedDistFiles({
        expectedCommit: COMMIT,
        gameId: "ricochet-crew",
        files,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(Buffer.from("tampered")).buffer,
        }),
      }),
      /SERVED_DIST_HASH_MISMATCH/,
    );

    const attestation = await verifyServedDistFiles({
      expectedCommit: COMMIT,
      gameId: "ricochet-crew",
      files,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => Uint8Array.from(Buffer.from("expected")).buffer,
      }),
    });
    assert.equal(attestation.fileCount, 1);
    assert.equal(attestation.expectedCommit, COMMIT);
    assert.match(attestation.aggregateSha256, /^[a-f0-9]{64}$/);
    assert.equal(Object.isFrozen(attestation), true);
    assert.equal(Object.isFrozen(attestation.files), true);
  });
});

describe("formal AI playtest machine facts", () => {
  for (const [input, expected] of [
    ["won", "win"],
    ["win", "win"],
    ["lost", "loss"],
    ["loss", "loss"],
    ["unknown", "unknown"],
    [undefined, "unknown"],
  ]) {
    it(`normalizes outcome ${String(input)} to ${expected}`, () => {
      assert.equal(normalizeOutcome(input), expected);
    });
  }

  it("records a missing payoff as null with an explicit non-inference note", () => {
    const facts = buildRunMachineFacts({
      index: 1,
      runId: "run-1",
      startedEvent: {
        event: "run_start",
        runId: "run-1",
        clientAt: 1_000,
        testMode: false,
        payload: {},
      },
      endedEvent: {
        event: "run_end",
        runId: "run-1",
        clientAt: 5_000,
        testMode: false,
        payload: { result: "lost" },
      },
      events: [{
        event: "first_input",
        runId: "run-1",
        clientAt: 1_450,
        testMode: false,
        payload: {},
      }],
    });
    assert.equal(facts.outcome, "loss");
    assert.equal(facts.firstInputMs, 450);
    assert.equal(facts.firstPayoffMs, null);
    assert.match(facts.firstPayoffNote, /未记录 first_payoff/);
    assert.match(facts.firstPayoffNote, /不推断|未推断/);
  });

  it("marks the cell incomplete when first_input is missing but permits missing payoff", () => {
    const runs = Array.from({ length: 3 }, (_, index) => buildRunMachineFacts({
      index: index + 1,
      runId: `run-${index + 1}`,
      startedEvent: lifecycleEvent("run_start", `run-${index + 1}`, index * 3 + 1),
      endedEvent: lifecycleEvent("run_end", `run-${index + 1}`, index * 3 + 3),
      events: index === 0 ? [] : [{
        ...lifecycleEvent("first_input", `run-${index + 1}`, index * 3 + 2),
        event: "first_input",
      }],
    }));
    assert.equal(runs[0].firstInputMs, null);
    assert.equal(runs[0].firstPayoffMs, null);
    assert.deepEqual(
      collectRunCompletionIssues(runs),
      ["run run-1 is missing first_input"],
    );
  });

  it("wraps the event log with the normalized run outcome", () => {
    const events = [{ event: "run_end", runId: "run-1" }];
    assert.deepEqual(buildRunEventLog("run-1", "won", events), {
      runId: "run-1",
      outcome: "win",
      events,
    });
  });
});

describe("formal AI playtest exact three-run state machine", () => {
  it("invalidates a run whose start and end are first observed in one poll", () => {
    const state = createRunObservationState();
    assert.throws(() => observeRunPoll(state, [
      lifecycleEvent("run_start", "run-1", 1),
      lifecycleEvent("run_end", "run-1", 2),
    ]), /FAST_RUN/);
  });

  it("rejects a fourth run, duplicates and out-of-order lifecycle events", () => {
    const state = createRunObservationState();
    const events = [];
    for (let index = 1; index <= 3; index += 1) {
      events.push(lifecycleEvent("run_start", `run-${index}`, index * 2 - 1));
      observeRunPoll(state, events);
      events.push(lifecycleEvent("run_end", `run-${index}`, index * 2));
      observeRunPoll(state, events);
    }
    assert.equal(assertCompleteRunObservation(state).length, 3);
    events.push(lifecycleEvent("run_start", "run-4", 7));
    assert.throws(() => observeRunPoll(state, events), /FOURTH_RUN/);
    events.push(lifecycleEvent("run_end", "run-4", 8));
    assert.throws(() => observeRunPoll(state, events), /FOURTH_RUN_END/);

    const duplicate = createRunObservationState();
    observeRunPoll(duplicate, [lifecycleEvent("run_start", "run-1", 1)]);
    assert.throws(() => observeRunPoll(duplicate, [
      lifecycleEvent("run_start", "run-1", 1),
      lifecycleEvent("run_start", "run-1", 2, "duplicate-start"),
    ]), /DUPLICATE_START/);

    assert.throws(() => observeRunPoll(
      createRunObservationState(),
      [lifecycleEvent("run_end", "run-1", 1)],
    ), /OUT_OF_ORDER/);
  });

  it("requires exactly three ordered starts and ends at finalization", () => {
    const state = createRunObservationState();
    observeRunPoll(state, [lifecycleEvent("run_start", "run-1", 1)]);
    assert.throws(() => assertCompleteRunObservation(state), /RUN_COUNT/);
  });
});

describe("formal AI playtest exclusive outputs", () => {
  it("atomically allows only one runner to claim a matrix cell", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cell-"));
    const cell = path.join(root, "casual-ricochet-crew");
    try {
      const results = await Promise.allSettled([
        claimOutputDirectory(cell),
        claimOutputDirectory(cell),
      ]);
      assert.equal(
        results.filter(({ status }) => status === "fulfilled").length,
        1,
      );
      assert.match(
        String(results.find(({ status }) => status === "rejected")?.reason),
        /AI_PLAYTEST_OUTPUT_EXISTS/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires the output parent directory to already exist", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cell-parent-"));
    const output = path.join(root, "missing", "casual-ricochet-crew");
    try {
      await assert.rejects(
        claimOutputDirectory(output),
        /AI_PLAYTEST_OUTPUT_PARENT_MISSING/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never replaces a fixed screenshot or trace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-artifact-"));
    const target = path.join(root, "entry.png");
    try {
      await publishBufferExclusive(target, Buffer.from("first"));
      await assert.rejects(
        publishBufferExclusive(target, Buffer.from("second")),
        /AI_PLAYTEST_ARTIFACT_EXISTS/u,
      );
      assert.equal(await readFile(target, "utf8"), "first");

      const temporary = path.join(root, ".trace-one.tmp");
      await writeFile(temporary, "trace-one", { flag: "wx" });
      await assert.rejects(
        publishTemporaryFileExclusive(temporary, target),
        /AI_PLAYTEST_ARTIFACT_EXISTS/u,
      );
      await assert.rejects(readFile(temporary), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("atomically publishes exactly one of two concurrent screenshot buffers", async () => {
    await assertExclusiveBufferRace([
      Buffer.from("first-screenshot"),
      Buffer.from("second-screenshot"),
    ]);
  });

  it("never tears either large payload during a concurrent buffer race", async () => {
    await assertExclusiveBufferRace([
      Buffer.alloc(256 * 1024, 0x41),
      Buffer.alloc(256 * 1024, 0x42),
    ]);
  });

  it("reports cleanup failure after the target was published", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cleanup-published-"));
    const temporary = path.join(root, ".trace.tmp");
    const target = path.join(root, "session-trace.zip");
    let unlinkAttempts = 0;
    try {
      await writeFile(temporary, "trace", { flag: "wx" });
      await assert.rejects(
        publishTemporaryFileExclusive(temporary, target, {
          unlinkImpl: async () => {
            unlinkAttempts += 1;
            throw Object.assign(new Error("temporary file is busy"), {
              code: "EBUSY",
            });
          },
          cleanupRetryDelaysMs: [0, 0, 0],
          wait: async () => {},
        }),
        (error) => {
          assert.match(
            error.message,
            /AI_PLAYTEST_TEMP_CLEANUP_FAILED:PUBLISHED/u,
          );
          assert.equal(error.targetPublished, true);
          return true;
        },
      );
      assert.equal(unlinkAttempts, 3);
      assert.equal(await readFile(target, "utf8"), "trace");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves the original write error when temporary cleanup also fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cleanup-write-"));
    const target = path.join(root, "entry.png");
    const writeError = Object.assign(new Error("simulated write failure"), {
      code: "EIO",
    });
    let unlinkAttempts = 0;
    try {
      await assert.rejects(
        publishBufferExclusive(target, Buffer.from("payload"), {
          randomId: () => "fixed",
          openImpl: async () => ({
            writeFile: async () => {
              throw writeError;
            },
            sync: async () => {},
            close: async () => {},
          }),
          unlinkImpl: async () => {
            unlinkAttempts += 1;
            throw Object.assign(new Error("simulated cleanup failure"), {
              code: "EBUSY",
            });
          },
          cleanupRetryDelaysMs: [0, 0],
          wait: async () => {},
        }),
        (error) => {
          assert.match(
            error.message,
            /AI_PLAYTEST_TEMP_CLEANUP_FAILED:NOT_PUBLISHED/u,
          );
          assert.equal(error.targetPublished, false);
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(writeError), true);
          return true;
        },
      );
      assert.equal(unlinkAttempts, 2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("isolates an incomplete session under a unique invalid path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-"));
    const output = path.join(root, "active-session");
    const invalidRoot = path.join(root, "invalid");
    try {
      await claimOutputDirectory(output);
      await writeFile(path.join(output, "entry.png"), "partial", { flag: "wx" });
      const isolated = await quarantineIncompleteSession({
        output,
        invalidRoot,
        sessionId: "session-1",
        now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        randomId: () => "fixed-id",
      });
      assert.equal(
        isolated,
        path.join(
          invalidRoot,
          "2026-07-29T01-02-03-456Z-session-1-fixed-id",
          "active-session",
        ),
      );
      assert.equal(await readFile(path.join(isolated, "entry.png"), "utf8"), "partial");
      await assert.rejects(readFile(path.join(output, "entry.png")), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never replaces an existing quarantine reservation", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-collision-"));
    const output = path.join(root, "active-session");
    const invalidRoot = path.join(root, "invalid");
    const reservation = path.join(
      invalidRoot,
      "2026-07-29T01-02-03-456Z-session-1-fixed-id",
    );
    try {
      await claimOutputDirectory(output);
      await writeFile(path.join(output, "entry.png"), "partial", { flag: "wx" });
      await mkdir(reservation, { recursive: true });
      await writeFile(path.join(reservation, "existing.txt"), "keep", {
        flag: "wx",
      });
      await assert.rejects(
        quarantineIncompleteSession({
          output,
          invalidRoot,
          sessionId: "session-1",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
          randomId: () => "fixed-id",
        }),
        /AI_PLAYTEST_QUARANTINE_EXISTS/u,
      );
      assert.equal(await readFile(path.join(output, "entry.png"), "utf8"), "partial");
      assert.equal(
        await readFile(path.join(reservation, "existing.txt"), "utf8"),
        "keep",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("maps a cross-volume quarantine move to a stable error", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-exdev-"));
    const output = path.join(root, "active-session");
    const invalidRoot = path.join(root, "invalid");
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        quarantineIncompleteSession({
          output,
          invalidRoot,
          sessionId: "session-1",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
          randomId: () => "fixed-id",
          renameImpl: async () => {
            throw Object.assign(new Error("cross-device link not permitted"), {
              code: "EXDEV",
            });
          },
        }),
        /AI_PLAYTEST_QUARANTINE_CROSS_DEVICE/u,
      );
      assert.deepEqual(await readdir(invalidRoot), []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("copies machine-generated evidence hashes into the report draft", () => {
    const evidenceSha256 = { "session-trace.zip": "a".repeat(64) };
    const draft = buildReportDraft({
      roundId: "baseline",
      matrixCellId: "baseline:action:ricochet-crew",
      reviewerRole: "action",
      gameId: "ricochet-crew",
      buildCommit: COMMIT,
      entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
      startedAt: "2026-07-29T00:00:00.000Z",
      finishedAt: "2026-07-29T00:01:00.000Z",
      source: { clean: true },
      runs: [],
      evidenceSha256,
    });
    assert.equal(draft.evidenceSha256, evidenceSha256);
    assert.equal(draft.claimsActualPlay, null);
  });

  it("hashes each referenced evidence file exactly once", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-playtest-hash-"));
    try {
      await Promise.all([
        writeFile(path.join(directory, "run-1-start.png"), "start"),
        writeFile(path.join(directory, "run-1-result.png"), "result"),
        writeFile(path.join(directory, "run-1-events.json"), "{}"),
        writeFile(path.join(directory, "session-trace.zip"), "trace"),
      ]);
      const hashes = await hashRunEvidence(directory, [{
        screenshotPaths: ["run-1-start.png", "run-1-result.png"],
        tracePath: "session-trace.zip",
        eventLogPath: "run-1-events.json",
      }, {
        screenshotPaths: ["run-1-start.png"],
        tracePath: "session-trace.zip",
        eventLogPath: "run-1-events.json",
      }]);
      assert.deepEqual(Object.keys(hashes).sort(), [
        "run-1-events.json",
        "run-1-result.png",
        "run-1-start.png",
        "session-trace.zip",
      ]);
      assert.match(hashes["session-trace.zip"], /^[a-f0-9]{64}$/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("never overwrites report-draft.json", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-playtest-session-"));
    const target = path.join(directory, "report-draft.json");
    try {
      await writeJsonExclusive(target, { draftOnly: true });
      await assert.rejects(
        writeJsonExclusive(target, { draftOnly: false }),
        /AI_PLAYTEST_ARTIFACT_EXISTS/u,
      );
      assert.deepEqual(
        JSON.parse(await readFile(target, "utf8")),
        { draftOnly: true },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
