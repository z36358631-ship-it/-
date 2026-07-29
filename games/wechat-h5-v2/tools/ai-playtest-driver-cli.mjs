import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  withAllocatedDriverRequest,
} from "./ai-playtest/driver-request-sequence.mjs";

const TOKEN_PATTERN = /^[0-9a-f]{64}$/u;
const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ACTIONS = new Map([
  ["ready", "ready"],
  ["capture", "capture"],
  ["visible", "visible"],
  ["tap", "touchTap"],
  ["begin", "touchBegin"],
  ["move", "touchMove"],
  ["end", "touchEnd"],
]);

function cliError(code, detail = "") {
  const error = new Error(`${code}${detail ? `:${detail}` : ""}`);
  error.code = code;
  return error;
}

function safeInteger(value, code) {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value ?? "")) throw cliError(code);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw cliError(code);
  return parsed;
}

function coordinate(value, maximum, code) {
  const parsed = Number(value);
  if (
    typeof value !== "string"
    || value.trim().length === 0
    || !Number.isFinite(parsed)
    || parsed < 0
    || parsed > maximum
  ) {
    throw cliError(code);
  }
  return parsed;
}

function parseFlags(values) {
  const flags = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw cliError("AI_DRIVER_CLI_ARGUMENT_INVALID");
    }
    const name = key.slice(2);
    if (Object.hasOwn(flags, name)) {
      throw cliError("AI_DRIVER_CLI_ARGUMENT_DUPLICATE", name);
    }
    flags[name] = value;
  }
  return flags;
}

function exactFlags(flags, allowed, required = allowed) {
  for (const key of Object.keys(flags)) {
    if (!allowed.includes(key)) throw cliError("AI_DRIVER_CLI_ARGUMENT_FORBIDDEN", key);
  }
  for (const key of required) {
    if (!Object.hasOwn(flags, key)) throw cliError("AI_DRIVER_CLI_ARGUMENT_REQUIRED", key);
  }
}

export function parseDriverCliArguments(argv) {
  if (argv[0] !== "--descriptor" || !argv[1] || !argv[2]) {
    throw cliError("AI_DRIVER_CLI_USAGE");
  }
  const descriptorPath = path.resolve(argv[1]);
  const command = argv[2];
  if (!ACTIONS.has(command)) throw cliError("AI_DRIVER_CLI_ACTION_FORBIDDEN", command);
  const flags = parseFlags(argv.slice(3));
  switch (command) {
    case "ready":
    case "visible":
      exactFlags(flags, [], []);
      return { descriptorPath, command };
    case "capture":
      exactFlags(flags, ["out"]);
      return { descriptorPath, command, outputPath: path.resolve(flags.out) };
    case "tap":
    case "begin":
      exactFlags(flags, ["x", "y", "frame"]);
      return {
        descriptorPath,
        command,
        x: coordinate(flags.x, 390, "AI_DRIVER_CLI_X_INVALID"),
        y: coordinate(flags.y, 844, "AI_DRIVER_CLI_Y_INVALID"),
        frameSeq: safeInteger(flags.frame, "AI_DRIVER_CLI_FRAME_INVALID"),
      };
    case "move":
    case "end":
      exactFlags(flags, ["gesture", "x", "y"]);
      if (flags.gesture.trim().length === 0) {
        throw cliError("AI_DRIVER_CLI_GESTURE_INVALID");
      }
      return {
        descriptorPath,
        command,
        gestureId: flags.gesture,
        x: coordinate(flags.x, 390, "AI_DRIVER_CLI_X_INVALID"),
        y: coordinate(flags.y, 844, "AI_DRIVER_CLI_Y_INVALID"),
      };
    default:
      throw cliError("AI_DRIVER_CLI_ACTION_FORBIDDEN", command);
  }
}

export async function readDriverDescriptor(descriptorPath) {
  let descriptor;
  try {
    descriptor = JSON.parse(await readFile(descriptorPath, "utf8"));
  } catch {
    throw cliError("AI_DRIVER_DESCRIPTOR_INVALID");
  }
  let url;
  try {
    url = new URL(descriptor?.url);
  } catch {
    throw cliError("AI_DRIVER_DESCRIPTOR_INVALID");
  }
  if (
    descriptor?.schemaVersion !== 1
    || !SESSION_ID_PATTERN.test(descriptor?.sessionId ?? "")
    || !TOKEN_PATTERN.test(descriptor.token ?? "")
    || descriptor.sessionId.includes(descriptor.token)
    || descriptor.token.includes(descriptor.sessionId)
    || url.protocol !== "http:"
    || url.hostname !== "127.0.0.1"
    || url.username !== ""
    || url.password !== ""
    || url.pathname !== "/v1/command"
    || url.search !== ""
    || url.hash !== ""
    || !/^[0-9]+$/u.test(url.port)
  ) {
    throw cliError("AI_DRIVER_DESCRIPTOR_INVALID");
  }
  return Object.freeze({
    schemaVersion: 1,
    sessionId: descriptor.sessionId,
    url: url.href,
    token: descriptor.token,
  });
}

async function responseJson(response) {
  let value;
  try {
    value = await response.json();
  } catch {
    throw cliError("AI_DRIVER_RESPONSE_INVALID");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw cliError("AI_DRIVER_RESPONSE_INVALID");
  }
  if (!response.ok) {
    const code = typeof value.error === "string"
      && /^AI_DRIVER_[A-Z0-9_]+$/u.test(value.error)
      ? value.error
      : "AI_DRIVER_REQUEST_FAILED";
    throw cliError(code);
  }
  return value;
}

export async function sendDriverCommand({
  descriptorPath,
  type,
  explicitFrameSeq,
  fields = {},
}) {
  const descriptor = await readDriverDescriptor(descriptorPath);
  const transaction = await withAllocatedDriverRequest(
    descriptorPath,
    async ({ requestSeq, frameSeq }) => {
      if (
        explicitFrameSeq !== undefined
        && explicitFrameSeq !== frameSeq
      ) {
        throw cliError(
          "AI_DRIVER_CLI_FRAME_MISMATCH",
          `${explicitFrameSeq}:${frameSeq}`,
        );
      }
      const command = {
        type,
        sessionId: descriptor.sessionId,
        requestSeq,
        actionId: randomUUID(),
        frameSeq,
        ...fields,
      };
      let response;
      try {
        response = await fetch(descriptor.url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${descriptor.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(command),
        });
      } catch {
        return {
          value: {
            requestError: cliError("AI_DRIVER_REQUEST_FAILED"),
          },
        };
      }
      let value;
      try {
        value = await responseJson(response);
      } catch (error) {
        return {
          value: { requestError: error },
        };
      }
      if (JSON.stringify(value).includes(descriptor.token)) {
        return {
          value: {
            requestError: cliError("AI_DRIVER_RESPONSE_FORBIDDEN"),
          },
        };
      }
      const outcome = { value: { response: value } };
      return ["ready", "capture"].includes(type)
        ? { ...outcome, nextFrameSeq: value.frameSeq }
        : outcome;
    },
  );
  if (transaction.requestError) throw transaction.requestError;
  return transaction.response;
}

function outputValue(value, extra = {}) {
  const { pngBase64: _pngBase64, ...safe } = value;
  return { ...safe, ...extra };
}

export async function runDriverCli(argv) {
  const options = parseDriverCliArguments(argv);
  const type = ACTIONS.get(options.command);
  const fields = {
    ...(options.x === undefined ? {} : { x: options.x }),
    ...(options.y === undefined ? {} : { y: options.y }),
    ...(options.gestureId === undefined ? {} : { gestureId: options.gestureId }),
  };
  const value = await sendDriverCommand({
    descriptorPath: options.descriptorPath,
    type,
    explicitFrameSeq: options.frameSeq,
    fields,
  });
  if (options.command === "capture") {
    if (typeof value.pngBase64 !== "string") {
      throw cliError("AI_DRIVER_CAPTURE_RESPONSE_INVALID");
    }
    let png;
    try {
      png = Buffer.from(value.pngBase64, "base64");
    } catch {
      throw cliError("AI_DRIVER_CAPTURE_RESPONSE_INVALID");
    }
    if (png.length === 0) throw cliError("AI_DRIVER_CAPTURE_RESPONSE_INVALID");
    await writeFile(options.outputPath, png, { flag: "wx" });
    return outputValue(value);
  }
  return outputValue(value);
}

async function main(argv) {
  const descriptorPath = argv[1];
  let token = "";
  try {
    const result = await runDriverCli(argv);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    if (descriptorPath) {
      try {
        token = (await readDriverDescriptor(path.resolve(descriptorPath))).token;
      } catch {
        // Invalid descriptors do not expose a token.
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${token ? message.replaceAll(token, "[REDACTED]") : message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main(process.argv.slice(2));
}
