import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  readDriverDescriptor,
  sendDriverCommand,
} from "./ai-playtest-driver-cli.mjs";

const HEARTBEAT_INTERVAL_MS = 2_000;

function heartbeatError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--descriptor" || !argv[1]) {
    throw heartbeatError("AI_DRIVER_HEARTBEAT_USAGE");
  }
  return { descriptorPath: path.resolve(argv[1]) };
}

export async function runHeartbeatKeeper({
  descriptorPath,
  heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS,
  signalSource = process,
  onReady = () => {},
}) {
  if (!Number.isSafeInteger(heartbeatIntervalMs) || heartbeatIntervalMs < 1) {
    throw heartbeatError("AI_DRIVER_HEARTBEAT_INTERVAL_INVALID");
  }
  const descriptor = await readDriverDescriptor(descriptorPath);
  let consecutiveFailures = 0;
  let stopped = false;
  let inFlight = false;
  let requestedExitCode = null;
  let settle;
  const completion = new Promise((resolve) => {
    settle = resolve;
  });
  const settleIfIdle = () => {
    if (stopped && !inFlight) settle(requestedExitCode);
  };
  const stop = (exitCode) => {
    if (stopped) return;
    stopped = true;
    requestedExitCode = exitCode;
    clearInterval(timer);
    for (const signal of ["SIGINT", "SIGTERM"]) {
      signalSource.off(signal, signalHandlers.get(signal));
    }
    settleIfIdle();
  };
  const heartbeat = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      await sendDriverCommand({
        descriptorPath,
        type: "heartbeat",
      });
      consecutiveFailures = 0;
    } catch {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 2) stop(1);
    } finally {
      inFlight = false;
      settleIfIdle();
    }
  };
  const signalHandlers = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [
      signal,
      () => stop(0),
    ]),
  );
  const timer = setInterval(heartbeat, heartbeatIntervalMs);
  // This interval is the standalone keeper's active event-loop handle.
  // An unresolved Promise alone does not keep Node.js alive.
  for (const [signal, handler] of signalHandlers) {
    signalSource.on(signal, handler);
  }
  try {
    const readyLine =
      `AI_DRIVER_HEARTBEAT_READY session=${descriptor.sessionId} pid=${process.pid}\n`;
    if (readyLine.includes(descriptor.token)) {
      throw heartbeatError("AI_DRIVER_HEARTBEAT_OUTPUT_FORBIDDEN");
    }
    onReady({
      sessionId: descriptor.sessionId,
      pid: process.pid,
      readyLine,
    });
  } catch (error) {
    stop(1);
    await completion;
    throw error;
  }
  const exitCode = await completion;
  return { exitCode, sessionId: descriptor.sessionId };
}

async function main(argv) {
  let token = "";
  try {
    const { descriptorPath } = parseArgs(argv);
    try {
      token = (await readDriverDescriptor(descriptorPath)).token;
    } catch {
      // The keeper reports only a stable error code for invalid descriptors.
    }
    const result = await runHeartbeatKeeper({
      descriptorPath,
      onReady({ readyLine }) {
        process.stdout.write(readyLine);
      },
    });
    process.exitCode = result.exitCode;
    if (result.exitCode !== 0) {
      process.stderr.write("AI_DRIVER_HEARTBEAT_FAILED\n");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${token ? message.replaceAll(token, "[REDACTED]") : message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main(process.argv.slice(2));
}
