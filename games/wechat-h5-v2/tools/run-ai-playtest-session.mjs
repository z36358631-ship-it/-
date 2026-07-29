import { execFile } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  access,
  lstat,
  open,
  readFile,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import {
  GAME_IDS,
  PLAYTEST_ROUNDS,
  REVIEWER_ROLES,
  SCORE_KEYS,
} from "./validate-ai-playtest-report.mjs";
import {
  attestServedDist,
  verifyServedDistFiles,
} from "./ai-playtest/served-dist-attestation.mjs";
import {
  assertCompleteRunObservation,
  collectRunCompletionIssues,
  createRunObservationState,
  observeRunPoll,
} from "./ai-playtest/run-observation-state.mjs";
import {
  claimOutputDirectory,
  publishBufferExclusive,
  publishJsonExclusive,
  publishTemporaryFileExclusive,
  quarantineIncompleteSession,
  temporaryArtifactPath,
} from "./ai-playtest/exclusive-artifacts.mjs";
import {
  createTerminalErrorRecorder,
  runSessionLifecycle,
} from "./ai-playtest/session-lifecycle.mjs";
import {
  createActionAuditLog,
} from "./ai-playtest/action-audit-log.mjs";
import {
  createBrowserTouchAdapter,
} from "./ai-playtest/browser-touch-adapter.mjs";
import {
  startDriverIpcServer,
} from "./ai-playtest/driver-ipc-server.mjs";
import {
  DRIVER_DISCONNECT_MS,
  DRIVER_HEARTBEAT_INTERVAL_MS,
  GESTURE_LEASE_MS,
} from "./ai-playtest/driver-session-state.mjs";

export {
  assertCompleteRunObservation,
  collectRunCompletionIssues,
  createRunObservationState,
  observeRunPoll,
  verifyServedDistFiles,
};

const execFileAsync = promisify(execFile);
const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_URLS = Object.freeze({
  "ricochet-crew": "http://127.0.0.1:4173/ricochet-crew/",
  "monster-night-market": "http://127.0.0.1:4173/monster-night-market/",
  "three-lane-squad": "http://127.0.0.1:4173/three-lane-squad/",
});
const FORBIDDEN_ENTRY_PARAMS = ["test", "seed", "speed", "mute"];
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const DEBUG_GLOBAL_PATTERN = /^__.*(?:TEST|DEBUG).*__$/u;

function pathIsInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === ""
    || (
      relative !== ".."
      && !relative.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relative)
    )
  );
}

function assertNoDriverPathOverlap(entries) {
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const [leftName, leftPath] = entries[left];
      const [rightName, rightPath] = entries[right];
      if (
        pathIsInside(leftPath, rightPath)
        || pathIsInside(rightPath, leftPath)
      ) {
        throw new Error(
          `AI_PLAYTEST_DRIVER_PATH_OVERLAP:${leftName}:${rightName}`,
        );
      }
    }
  }
}

async function canonicalPathWithoutReparse(target, {
  lstatImpl,
  realpathImpl,
}) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  const segments = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  let lexical = parsed.root;
  let deepestExisting = parsed.root;
  let firstMissingIndex = segments.length;
  for (let index = 0; index < segments.length; index += 1) {
    lexical = path.join(lexical, segments[index]);
    try {
      const stats = await lstatImpl(lexical);
      if (stats.isSymbolicLink()) {
        throw new Error(`AI_PLAYTEST_DRIVER_PATH_REPARSE:${lexical}`);
      }
      deepestExisting = lexical;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      firstMissingIndex = index;
      break;
    }
  }
  const canonical = await realpathImpl(deepestExisting);
  return path.resolve(canonical, ...segments.slice(firstMissingIndex));
}

export async function assertSafeDriverPaths({
  output,
  driverDescriptorPath,
  draftOutput,
  invalidRoot,
}, {
  lstatImpl = lstat,
  realpathImpl = realpath,
} = {}) {
  const entries = [
    ["output", output],
    ["driverDescriptorPath", driverDescriptorPath],
    ["draftOutput", draftOutput],
    ["invalidRoot", invalidRoot],
  ];
  const canonicalEntries = [];
  for (const [name, target] of entries) {
    canonicalEntries.push([
      name,
      await canonicalPathWithoutReparse(target, {
        lstatImpl,
        realpathImpl,
      }),
    ]);
  }
  const canonicalPaths = Object.fromEntries(canonicalEntries);
  const canonicalRoundRoot = path.dirname(canonicalPaths.output);
  if (pathIsInside(canonicalRoundRoot, canonicalPaths.invalidRoot)) {
    throw new Error("AI_PLAYTEST_INVALID_ROOT_INSIDE_ROUND");
  }
  assertNoDriverPathOverlap(canonicalEntries);
  return Object.freeze({
    ...canonicalPaths,
    roundRoot: canonicalRoundRoot,
  });
}

export function validateSessionOptions(options) {
  const {
    roundId,
    gameId,
    reviewerRole,
    entryUrl = DEFAULT_URLS[gameId],
    output,
    expectedCommit,
  } = options;
  if (!PLAYTEST_ROUNDS.includes(roundId)) throw new Error(`invalid roundId: ${roundId}`);
  if (!GAME_IDS.includes(gameId)) throw new Error(`invalid gameId: ${gameId}`);
  if (!REVIEWER_ROLES.includes(reviewerRole)) {
    throw new Error(`invalid reviewerRole: ${reviewerRole}`);
  }
  if (!output || typeof output !== "string") throw new Error("output is required");
  if (expectedCommit !== undefined && !COMMIT_PATTERN.test(expectedCommit)) {
    throw new Error("expectedCommit must be 40 lowercase hexadecimal characters");
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(entryUrl);
  } catch {
    throw new Error("entryUrl must be absolute");
  }
  const forbidden = FORBIDDEN_ENTRY_PARAMS.find((key) => parsedUrl.searchParams.has(key));
  if (forbidden) {
    throw new Error(`normal entry required; entryUrl contains forbidden ${forbidden}`);
  }
  const resolvedOutput = path.resolve(output);
  if (path.basename(path.dirname(resolvedOutput)) !== roundId
    || path.basename(resolvedOutput) !== `${reviewerRole}-${gameId}`) {
    throw new Error(
      "output must be <root>/<round>/<reviewer>-<game> to prevent matrix-cell overwrite",
    );
  }
  const driverEnabled = options.driverEnabled === true;
  let driverDescriptorPath = options.driverDescriptorPath;
  let draftOutput = options.draftOutput;
  let invalidRoot = options.invalidRoot;
  if (driverEnabled) {
    for (const [name, value] of [
      ["driverDescriptorPath", driverDescriptorPath],
      ["draftOutput", draftOutput],
      ["invalidRoot", invalidRoot],
    ]) {
      if (!value || typeof value !== "string") {
        throw new Error(`AI_PLAYTEST_${name.toUpperCase()}_REQUIRED`);
      }
    }
    driverDescriptorPath = path.resolve(driverDescriptorPath);
    draftOutput = path.resolve(draftOutput);
    invalidRoot = path.resolve(invalidRoot);
    const roundRoot = path.dirname(resolvedOutput);
    if (pathIsInside(resolvedOutput, draftOutput)) {
      throw new Error("AI_PLAYTEST_DRAFT_INSIDE_OUTPUT");
    }
    if (pathIsInside(roundRoot, invalidRoot)) {
      throw new Error("AI_PLAYTEST_INVALID_ROOT_INSIDE_ROUND");
    }
    if (pathIsInside(resolvedOutput, driverDescriptorPath)) {
      throw new Error("AI_PLAYTEST_DESCRIPTOR_INSIDE_OUTPUT");
    }
    assertNoDriverPathOverlap([
      ["output", resolvedOutput],
      ["driverDescriptorPath", driverDescriptorPath],
      ["draftOutput", draftOutput],
      ["invalidRoot", invalidRoot],
    ]);
  }
  return {
    ...options,
    roundId,
    gameId,
    reviewerRole,
    entryUrl: parsedUrl.href,
    output: resolvedOutput,
    matrixCellId: `${roundId}:${reviewerRole}:${gameId}`,
    driverEnabled,
    driverDescriptorPath,
    draftOutput,
    invalidRoot,
  };
}

async function gitCommit(cwd) {
  try {
    const result = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd });
    const commit = result.stdout.trim();
    return COMMIT_PATTERN.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

export function assertSourceState({
  expectedCommit,
  headCommit,
  clean,
  statusEntries = [],
}) {
  if (!COMMIT_PATTERN.test(expectedCommit ?? "")) {
    throw new Error("AI_PLAYTEST_EXPECTED_COMMIT_REQUIRED");
  }
  if (headCommit !== expectedCommit) {
    throw new Error(
      `AI_PLAYTEST_COMMIT_MISMATCH expected ${expectedCommit}, got ${headCommit ?? "unavailable"}`,
    );
  }
  if (!clean) {
    throw new Error(
      `AI_PLAYTEST_SOURCE_DIRTY${statusEntries.length > 0 ? `\n${statusEntries.join("\n")}` : ""}`,
    );
  }
  return {
    expectedCommit,
    headCommit,
    clean: true,
    statusEntries: [],
  };
}

export function assertStableSourceState(startState, finishState) {
  const start = assertSourceState(startState);
  const finish = assertSourceState({
    ...finishState,
    expectedCommit: start.expectedCommit,
  });
  if (start.headCommit !== finish.headCommit) {
    throw new Error(
      `AI_PLAYTEST_SOURCE_CHANGED start ${start.headCommit}, finish ${finish.headCommit}`,
    );
  }
  return {
    start,
    finish,
    stable: true,
  };
}

async function readSourceState(expectedCommit) {
  const [headCommit, statusResult] = await Promise.all([
    gitCommit(SOURCE_ROOT),
    execFileAsync(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all", "--", "."],
      { cwd: SOURCE_ROOT },
    ),
  ]);
  const allEntries = statusResult.stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trimEnd())
    .filter(Boolean);
  const statusEntries = allEntries.filter((entry) => {
    const relative = entry.slice(3).replaceAll("\\", "/").replace(/^"|"$/gu, "");
    return !relative.startsWith("test-results/ai-playtests/");
  });
  return assertSourceState({
    expectedCommit,
    headCommit,
    clean: statusEntries.length === 0,
    statusEntries,
  });
}

async function readTelemetry(page, gameId) {
  return page.evaluate((storageKey) => {
    try {
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }, `telemetry:${gameId}:queue`);
}

export function assertExpectedEntryUrl(value, gameId) {
  const expected = DEFAULT_URLS[gameId];
  let actual;
  try {
    actual = new URL(value).href;
  } catch {
    actual = String(value);
  }
  if (!expected || actual !== expected) {
    throw new Error(
      `AI_PLAYTEST_ENTRY_URL_MISMATCH expected ${expected ?? "unsupported game"}, got ${actual}`,
    );
  }
  return actual;
}

async function readPublicRuntimeState(page) {
  return page.evaluate((debugPatternSource) => {
    const debugPattern = new RegExp(debugPatternSource, "u");
    const knownDebugGlobals = [
      "__GAME_TEST__",
      "__GAME_DEBUG__",
      "__THREE_LANE_SQUAD_DEBUG__",
    ];
    const debugGlobals = [...new Set([
      ...knownDebugGlobals.filter((key) => Object.prototype.hasOwnProperty.call(window, key)),
      ...Object.getOwnPropertyNames(window).filter((key) => debugPattern.test(key)),
    ])].sort();
    const roots = [
      document.querySelector("#app"),
      document.documentElement,
      document.body,
    ].filter(Boolean);
    const publicValue = (datasetKey, attributeName) => {
      for (const root of roots) {
        const datasetValue = root.dataset?.[datasetKey];
        if (datasetValue !== undefined) return datasetValue;
        const attributeValue = root.getAttribute?.(attributeName);
        if (attributeValue !== null && attributeValue !== undefined) return attributeValue;
      }
      return "unavailable";
    };
    const rawTestMode = publicValue("testMode", "data-test-mode");
    const rawTimeScale = publicValue("timeScale", "data-time-scale");
    return {
      debugGlobals,
      publicState: {
        testMode:
          rawTestMode === "unavailable"
            ? "unavailable"
            : rawTestMode === "true" || rawTestMode === "1",
        timeScale:
          rawTimeScale === "unavailable"
            ? "unavailable"
            : Number(rawTimeScale),
      },
    };
  }, DEBUG_GLOBAL_PATTERN.source);
}

export function assertNormalRuntimeSnapshot(snapshot) {
  if (snapshot.debugGlobals.length > 0) {
    throw new Error(
      `AI_PLAYTEST_DEBUG_GLOBAL_EXPOSED ${snapshot.debugGlobals.join(",")}`,
    );
  }
  if (snapshot.telemetryTestModes.some((value) => value !== false)) {
    throw new Error(
      `AI_PLAYTEST_TELEMETRY_TESTMODE ${JSON.stringify(snapshot.telemetryTestModes)}`,
    );
  }
  if (
    snapshot.publicState.testMode !== "unavailable"
    && snapshot.publicState.testMode !== false
  ) {
    throw new Error(`AI_PLAYTEST_PUBLIC_TESTMODE ${snapshot.publicState.testMode}`);
  }
  if (
    snapshot.publicState.timeScale !== "unavailable"
    && snapshot.publicState.timeScale !== 1
  ) {
    throw new Error(`AI_PLAYTEST_PUBLIC_TIMESCALE ${snapshot.publicState.timeScale}`);
  }
  return {
    ...snapshot,
    normalEntry: true,
    note:
      snapshot.publicState.testMode === "unavailable"
      || snapshot.publicState.timeScale === "unavailable"
        ? "公开页面未提供全部运行状态；记录 unavailable，未注入测试探针。"
        : "公开页面状态确认 testMode=false、timeScale=1。",
  };
}

async function inspectNormalRuntime(page, gameId) {
  const [pageState, events] = await Promise.all([
    readPublicRuntimeState(page),
    readTelemetry(page, gameId),
  ]);
  return assertNormalRuntimeSnapshot({
    ...pageState,
    telemetryTestModes: [...new Set(events.map((event) => event.testMode))],
  });
}

export function normalizeOutcome(value) {
  if (value === "won" || value === "win") return "win";
  if (value === "lost" || value === "loss") return "loss";
  return "unknown";
}

function telemetryTiming(events, eventName, startedAt) {
  const event = events
    .filter((item) => item.event === eventName && Number.isFinite(item.clientAt))
    .sort((left, right) => left.clientAt - right.clientAt)[0];
  if (!event || !Number.isFinite(startedAt)) {
    return {
      value: null,
      note:
        `生产遥测未记录 ${eventName}；保持 null，不推断、不使用 debug、截图或主观观察补值。`,
    };
  }
  const value = Math.max(0, Math.round(event.clientAt - startedAt));
  return {
    value,
    note: `来自生产遥测 ${eventName}.clientAt 与 run_start.clientAt 的差值。`,
  };
}

export function buildRunMachineFacts({
  index,
  runId,
  startedEvent,
  endedEvent,
  events,
}) {
  const firstInput = telemetryTiming(events, "first_input", startedEvent?.clientAt);
  const firstPayoff = telemetryTiming(events, "first_payoff", startedEvent?.clientAt);
  return {
    runId,
    outcome: normalizeOutcome(endedEvent?.payload?.result),
    firstInputMs: firstInput.value,
    firstInputNote: firstInput.note,
    firstPayoffMs: firstPayoff.value,
    firstPayoffNote: firstPayoff.note,
    screenshotPaths: [`run-${index}-start.png`, `run-${index}-result.png`],
    tracePath: "session-trace.zip",
    eventLogPath: `run-${index}-events.json`,
  };
}

export async function writeJsonExclusive(target, value) {
  await publishJsonExclusive(target, value);
}

async function writePrivateJsonExclusive(target, value) {
  const handle = await open(target, "wx", 0o600);
  let operationError = null;
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    operationError = error;
  }
  try {
    await handle.close();
  } catch (error) {
    operationError ??= error;
  }
  if (!operationError) return;
  try {
    await unlink(target);
  } catch (cleanupError) {
    if (cleanupError?.code !== "ENOENT") {
      throw new AggregateError(
        [operationError, cleanupError],
        "AI_PLAYTEST_DRIVER_DESCRIPTOR_WRITE_FAILED",
        { cause: operationError },
      );
    }
  }
  throw operationError;
}

export function buildRunEventLog(runId, outcome, events) {
  return {
    runId,
    outcome: normalizeOutcome(outcome),
    events,
  };
}

export async function hashRunEvidence(output, runs, additionalPaths = []) {
  const relativePaths = [...new Set(runs.flatMap((run) => [
    ...run.screenshotPaths,
    run.tracePath,
    run.eventLogPath,
  ]).concat(additionalPaths))];
  const entries = await Promise.all(relativePaths.map(async (relativePath) => {
    const bytes = await readFile(path.join(output, relativePath));
    return [
      relativePath,
      createHash("sha256").update(bytes).digest("hex"),
    ];
  }));
  return Object.fromEntries(entries);
}

function runnerDriverError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function createRunnerDriverOrchestration({
  actionLog,
  sessionId,
  gameId,
}) {
  let actionsOpen = true;
  let currentRunId = null;
  let nextRunIndex = 1;
  const pendingRecords = [];
  const writeRecord = (record, runId) => actionLog.write({
    ...record,
    sessionId,
    gameId,
    runId,
  });

  return {
    wrapAdapter(adapter) {
      const guarded = {
        capture: (...args) => adapter.capture(...args),
        visible: (...args) => adapter.visible(...args),
      };
      for (const method of [
        "touchTap",
        "touchBegin",
        "touchMove",
        "touchEnd",
        "touchCancel",
      ]) {
        guarded[method] = (...args) => {
          if (!actionsOpen) {
            throw runnerDriverError("AI_DRIVER_ACTIONS_CLOSED");
          }
          return adapter[method](...args);
        };
      }
      return Object.freeze(guarded);
    },
    async writeAction(record) {
      if (!currentRunId) {
        pendingRecords.push(record);
        return;
      }
      await writeRecord(record, currentRunId);
    },
    async recordRunStarted(index, runId) {
      if (index !== nextRunIndex || !runId) {
        throw runnerDriverError("AI_DRIVER_RUN_START_ORDER");
      }
      currentRunId = runId;
      actionsOpen = true;
      while (pendingRecords.length > 0) {
        await writeRecord(pendingRecords.shift(), currentRunId);
      }
    },
    closeActions() {
      actionsOpen = false;
    },
    openReplayWindow() {
      nextRunIndex += 1;
      currentRunId = null;
      actionsOpen = true;
    },
    async close() {
      actionsOpen = false;
      while (pendingRecords.length > 0) {
        await writeRecord(pendingRecords.shift(), currentRunId);
      }
      await actionLog.close();
    },
  };
}

export function buildReportDraft(evidence) {
  return {
    schemaVersion: 1,
    draftOnly: true,
    evidenceOnly: true,
    subjectiveReviewRequired: true,
    subjectiveScoresGenerated: false,
    roundId: evidence.roundId,
    matrixCellId: evidence.matrixCellId,
    reviewerId: null,
    reviewerRole: evidence.reviewerRole,
    gameId: evidence.gameId,
    buildCommit: evidence.buildCommit,
    entryUrl: evidence.entryUrl,
    interactionMode: "browser-touch",
    claimsActualPlay: null,
    sessionId: evidence.driver?.sessionId ?? null,
    startedAt: evidence.startedAt,
    finishedAt: evidence.finishedAt,
    evidenceSha256: evidence.evidenceSha256,
    runs: evidence.runs.map((run) => ({
      ...run,
      strategyTag: null,
      strategyTagNote: "由外部 AI 玩家根据本局实际策略填写，不由采证器生成。",
    })),
    scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, null])),
    wouldReplay: null,
    positives: [],
    problems: [],
    facts: [
      `普通入口实际地址：${evidence.entryUrl}`,
      `源码提交：${evidence.buildCommit}；首尾源码门禁 stable=${evidence.sourceStable}`,
      `服务内容证明：${evidence.servedDist?.start?.aggregateSha256 ?? "unavailable"}；`
      + `首尾 stable=${evidence.servedDist?.stable ?? false}`,
      "采证器只记录机器事实，不生成主观评分或重玩意向。",
    ],
    inferences: [],
    unverified: [
      "主观评分、策略标签、问题分级和重玩意向等待外部 AI 玩家填写。",
    ],
  };
}

async function evidencePathExists(output, relativePath) {
  if (!relativePath) return false;
  try {
    await access(path.join(output, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function retainExistingRunEvidence(output, runs) {
  return Promise.all(runs.map(async (run) => {
    const screenshotPaths = [];
    for (const screenshotPath of run.screenshotPaths ?? []) {
      if (await evidencePathExists(output, screenshotPath)) {
        screenshotPaths.push(screenshotPath);
      }
    }
    return {
      ...run,
      screenshotPaths,
      tracePath: await evidencePathExists(output, run.tracePath)
        ? run.tracePath
        : null,
      eventLogPath: await evidencePathExists(output, run.eventLogPath)
        ? run.eventLogPath
        : null,
    };
  }));
}

function terminalErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function waitFor(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function cleanupTraceTemporary({
  temporary,
  unlinkImpl = unlink,
  cleanupRetryDelaysMs = [0, 5, 20],
  wait = waitFor,
}) {
  let cleanupError;
  for (const delayMs of cleanupRetryDelaysMs) {
    if (delayMs > 0) await wait(delayMs);
    try {
      await unlinkImpl(temporary);
      return;
    } catch (error) {
      if (error?.code === "ENOENT") return;
      cleanupError = error;
    }
  }
  throw cleanupError;
}

export async function stopAndPublishSessionTrace({
  context,
  output,
  temporaryPath = temporaryArtifactPath,
  publishTemporary = publishTemporaryFileExclusive,
  unlinkImpl = unlink,
  cleanupRetryDelaysMs = [0, 5, 20],
  wait = waitFor,
}) {
  const temporary = await temporaryPath(output, "session-trace.zip");
  const target = path.join(output, "session-trace.zip");
  let operationError = null;
  try {
    await context.tracing.stop({ path: temporary });
    await publishTemporary(temporary, target);
  } catch (error) {
    operationError = error;
  }
  if (!operationError) return target;
  try {
    await cleanupTraceTemporary({
      temporary,
      unlinkImpl,
      cleanupRetryDelaysMs,
      wait,
    });
  } catch (cleanupError) {
    throw new AggregateError(
      [operationError, cleanupError],
      `${terminalErrorMessage(operationError)} | `
      + `AI_PLAYTEST_TRACE_TEMP_CLEANUP_FAILED:${temporary}:`
      + `${terminalErrorMessage(cleanupError)}`,
      { cause: operationError },
    );
  }
  throw operationError;
}

export async function runClaimedSessionLifecycle({
  output,
  launch,
  contextOptions = {},
  configurePage,
  execute,
  recordError,
  stopTraceOptions = {},
  lifecycleImpl = runSessionLifecycle,
  stopTraceImpl = stopAndPublishSessionTrace,
}) {
  return lifecycleImpl({
    launch,
    contextOptions,
    configurePage,
    execute,
    recordError,
    stopTracing: ({ context }) => stopTraceImpl({
      context,
      output,
      ...stopTraceOptions,
    }),
  });
}

function asError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

function finalizationAggregate(code, errors, {
  output,
  evidencePath,
  invalidOutput = null,
  cause = errors.at(-1),
}) {
  const error = new AggregateError(
    errors,
    `${code}:output=${output}:evidence=${evidencePath}`
    + `${invalidOutput ? `:invalidOutput=${invalidOutput}` : ""}`,
    { cause },
  );
  error.code = code;
  error.output = output;
  error.evidencePath = evidencePath;
  error.invalidOutput = invalidOutput;
  return error;
}

export async function finalizeSessionEvidence({
  output,
  baseEvidence = {},
  traceError = null,
  completedRuns = [],
  terminalErrors = [],
  completionIssues = [],
  complete = false,
  hashEvidence = hashRunEvidence,
  writeEvidence = writeJsonExclusive,
  candidatePath = temporaryArtifactPath,
  publishCandidate = publishTemporaryFileExclusive,
  removeArtifact = unlink,
  invalidRoot = null,
  sessionId = null,
  quarantineImpl = quarantineIncompleteSession,
  draftOutput = null,
  canonicalEvidencePaths = [],
}) {
  const failureErrors = [];
  const recordedErrors = [];
  const recordFailure = (error) => {
    const normalized = asError(error);
    failureErrors.push(normalized);
    const message = terminalErrorMessage(normalized);
    if (!recordedErrors.includes(message)) recordedErrors.push(message);
  };
  for (const error of terminalErrors) recordFailure(error);
  if (traceError) recordFailure(traceError);
  let status =
    complete
    && recordedErrors.length === 0
    && completionIssues.length === 0
      ? "CAPTURED"
      : "INCOMPLETE";
  let runs = completedRuns;
  let evidenceSha256 = {};
  if (status === "CAPTURED") {
    try {
      evidenceSha256 = await hashEvidence(
        output,
        runs,
        canonicalEvidencePaths,
      );
    } catch (error) {
      recordFailure(error);
      status = "INCOMPLETE";
    }
  }
  const sessionEvidencePath = path.join(output, "session-evidence.json");
  const reportDraftPath =
    draftOutput ?? path.join(output, "report-draft.json");
  const buildEvidence = (currentStatus, currentRuns, currentHashes) => ({
    schemaVersion: 1,
    evidenceOnly: true,
    subjectiveScoresGenerated: false,
    ...baseEvidence,
    status: currentStatus,
    runs: currentRuns,
    evidenceSha256: currentHashes,
    diagnostics: {
      ...(baseEvidence.diagnostics ?? {}),
      terminalError:
        recordedErrors.length > 0 ? recordedErrors.join(" | ") : null,
      terminalErrors: [...recordedErrors],
      completionNotes: completionIssues,
    },
  });
  if (status === "CAPTURED") {
    const candidatePaths = [];
    let reportPublished = false;
    try {
      const sessionCandidate = await candidatePath(
        output,
        "session-evidence.json",
      );
      const reportCandidate = await candidatePath(
        path.dirname(reportDraftPath),
        path.basename(reportDraftPath),
      );
      candidatePaths.push(sessionCandidate, reportCandidate);
      const capturedEvidence = buildEvidence("CAPTURED", runs, evidenceSha256);
      await writeEvidence(sessionCandidate, capturedEvidence);
      await writeEvidence(reportCandidate, buildReportDraft(capturedEvidence));
      await publishCandidate(reportCandidate, reportDraftPath);
      reportPublished = true;
      await publishCandidate(sessionCandidate, sessionEvidencePath);
      return capturedEvidence;
    } catch (error) {
      recordFailure(error);
      status = "INCOMPLETE";
      for (const artifactPath of [
        ...candidatePaths,
        sessionEvidencePath,
        ...(reportPublished ? [reportDraftPath] : []),
      ]) {
        try {
          await removeArtifact(artifactPath);
        } catch (cleanupError) {
          if (cleanupError?.code !== "ENOENT") recordFailure(cleanupError);
        }
      }
    }
  }
  runs = await retainExistingRunEvidence(output, runs);
  evidenceSha256 = {};
  const evidence = buildEvidence("INCOMPLETE", runs, evidenceSha256);
  let incompleteWriteError = null;
  try {
    await writeEvidence(sessionEvidencePath, evidence);
  } catch (error) {
    incompleteWriteError = error;
    recordFailure(error);
  }
  let invalidOutput = null;
  if (invalidRoot) {
    try {
      if (!sessionId) {
        throw new Error("AI_PLAYTEST_QUARANTINE_SESSION_ID_REQUIRED");
      }
      invalidOutput = await quarantineImpl({
        output,
        invalidRoot,
        sessionId,
      });
    } catch (quarantineError) {
      recordFailure(quarantineError);
      throw finalizationAggregate(
        "AI_PLAYTEST_QUARANTINE_FAILED",
        failureErrors,
        {
          output,
          evidencePath: sessionEvidencePath,
          cause: quarantineError,
        },
      );
    }
  }
  if (incompleteWriteError) {
    throw finalizationAggregate(
      "AI_PLAYTEST_INCOMPLETE_EVIDENCE_WRITE_FAILED",
      failureErrors,
      {
        output,
        evidencePath: sessionEvidencePath,
        invalidOutput,
        cause: incompleteWriteError,
      },
    );
  }
  return invalidOutput
    ? { ...evidence, invalidOutput }
    : evidence;
}

export async function captureAiPlaytestSession(rawOptions, dependencies = {}) {
  const readSourceStateImpl =
    dependencies.readSourceState ?? readSourceState;
  const attestServedDistImpl =
    dependencies.attestServedDist ?? attestServedDist;
  const claimOutputDirectoryImpl =
    dependencies.claimOutputDirectory ?? claimOutputDirectory;
  const runClaimedSessionLifecycleImpl =
    dependencies.runClaimedSessionLifecycle ?? runClaimedSessionLifecycle;
  const startDriverIpcServerImpl =
    dependencies.startDriverIpcServer ?? startDriverIpcServer;
  const createBrowserTouchAdapterImpl =
    dependencies.createBrowserTouchAdapter ?? createBrowserTouchAdapter;
  const createActionAuditLogImpl =
    dependencies.createActionAuditLog ?? createActionAuditLog;
  const assertSafeDriverPathsImpl =
    dependencies.assertSafeDriverPaths ?? assertSafeDriverPaths;
  const randomUUIDImpl = dependencies.randomUUID ?? randomUUID;
  const randomBytesImpl = dependencies.randomBytes ?? randomBytes;
  const launchImpl =
    dependencies.launch
    ?? (() => chromium.launch({ headless: rawOptions.headed !== true }));
  const options = validateSessionOptions(rawOptions);
  if (!options.expectedCommit) throw new Error("AI_PLAYTEST_EXPECTED_COMMIT_REQUIRED");
  assertExpectedEntryUrl(options.entryUrl, options.gameId);
  const source = await readSourceStateImpl(options.expectedCommit);
  const servedDistAtStart = await attestServedDistImpl(
    options.expectedCommit,
    options.gameId,
  );
  await claimOutputDirectoryImpl(options.output);
  if (options.driverEnabled) {
    await assertSafeDriverPathsImpl(options);
  }
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const badResponses = [];
  const externalRequests = [];
  const entryOrigin = new URL(options.entryUrl).origin;
  const startedAt = new Date().toISOString();
  const runObservation = createRunObservationState();
  let actualEntryUrl = options.entryUrl;
  let runtimeSafety = null;
  let lifecycleTraceError = null;
  const terminalRecorder = createTerminalErrorRecorder();
  const terminalErrors = terminalRecorder.errors;
  const recordTerminalError = (error) => terminalRecorder.record(error);
  const sessionId = options.driverEnabled
    ? randomUUIDImpl()
    : options.sessionId ?? options.matrixCellId.replaceAll(":", "-");
  const token = options.driverEnabled
    ? randomBytesImpl(32).toString("hex")
    : null;
  let driverController = null;
  let driverOrchestration = null;
  let actionLog = null;
  let descriptorPublished = false;
  const assertDriverHealthy = () => {
    const reason = driverController?.fatalReason();
    if (reason) throw runnerDriverError(reason);
  };
  try {
    const lifecycle = await runClaimedSessionLifecycleImpl({
      output: options.output,
      launch: launchImpl,
      contextOptions: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
      async configurePage(page) {
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("requestfailed", (request) => {
          requestFailures.push({
            url: request.url(),
            error: request.failure()?.errorText ?? "unknown",
          });
        });
        page.on("response", (response) => {
          if (response.status() >= 400) {
            badResponses.push({ url: response.url(), status: response.status() });
          }
        });
        page.on("request", (request) => {
          const requestUrl = new URL(request.url());
          if (
            !["data:", "blob:"].includes(requestUrl.protocol)
            && requestUrl.origin !== entryOrigin
          ) {
            externalRequests.push(request.url());
          }
        });
        if (options.driverEnabled) {
          actionLog = await createActionAuditLogImpl(
            path.join(options.output, "session-actions.jsonl"),
            { forbiddenValues: [token] },
          );
          driverOrchestration = createRunnerDriverOrchestration({
            actionLog,
            sessionId,
            gameId: options.gameId,
          });
          const cdp = await page.context().newCDPSession(page);
          const adapter = createBrowserTouchAdapterImpl({
            page,
            cdp,
            writeAction: (record) => (
              driverOrchestration.writeAction(record)
            ),
          });
          driverController = await startDriverIpcServerImpl({
            sessionId,
            token,
            gameId: options.gameId,
            adapter: driverOrchestration.wrapAdapter(adapter),
            onFault: recordTerminalError,
          });
          await writePrivateJsonExclusive(
            options.driverDescriptorPath,
            driverController.descriptor,
          );
          descriptorPublished = true;
        }
      },
      recordError: recordTerminalError,
      async execute({ page }) {
        await page.goto(options.entryUrl, { waitUntil: "networkidle" });
        assertDriverHealthy();
        actualEntryUrl = assertExpectedEntryUrl(page.url(), options.gameId);
        runtimeSafety = await inspectNormalRuntime(page, options.gameId);
        await publishBufferExclusive(
          path.join(options.output, "entry.png"),
          await page.screenshot({ type: "png", fullPage: false }),
        );
        const deadline = Date.now() + (options.timeoutMs ?? 15 * 60_000);
        while (Date.now() < deadline) {
          assertDriverHealthy();
          assertExpectedEntryUrl(page.url(), options.gameId);
          const events = await readTelemetry(page, options.gameId);
          const pageState = await readPublicRuntimeState(page);
          assertExpectedEntryUrl(page.url(), options.gameId);
          runtimeSafety = assertNormalRuntimeSnapshot({
            ...pageState,
            telemetryTestModes: [...new Set(events.map((event) => event.testMode))],
          });
          const transitions = observeRunPoll(runObservation, events);
          for (const transition of transitions) {
            if (transition.type === "start") {
              await publishBufferExclusive(
                path.join(
                  options.output,
                  `run-${transition.run.index}-start.png`,
                ),
                await page.screenshot({ type: "png", fullPage: false }),
              );
              await driverOrchestration?.recordRunStarted(
                transition.run.index,
                transition.run.runId,
              );
              continue;
            }
            driverOrchestration?.closeActions();
            await page.waitForTimeout(1_000);
            await publishBufferExclusive(
              path.join(
                options.output,
                `run-${transition.run.index}-result.png`,
              ),
              await page.screenshot({ type: "png", fullPage: false }),
            );
            await writeJsonExclusive(
              path.join(
                options.output,
                `run-${transition.run.index}-events.json`,
              ),
              buildRunEventLog(
                transition.run.runId,
                transition.run.endedEvent.payload?.result,
                transition.run.events,
              ),
            );
            driverController?.recordRun(transition.run.index);
            if (transition.run.index < 3) {
              driverOrchestration?.openReplayWindow();
            }
          }
          if (runObservation.endCount === 3) {
            await page.waitForTimeout(250);
            assertExpectedEntryUrl(page.url(), options.gameId);
            observeRunPoll(runObservation, await readTelemetry(page, options.gameId));
            assertDriverHealthy();
            assertExpectedEntryUrl(page.url(), options.gameId);
            break;
          }
          await page.waitForTimeout(500);
        }
      },
    });
    lifecycleTraceError = lifecycle.traceError;
  } catch (error) {
    recordTerminalError(error);
  } finally {
    if (driverController) {
      try {
        await driverController.close();
      } catch (error) {
        recordTerminalError(error);
      }
    }
    if (driverOrchestration) {
      try {
        await driverOrchestration.close();
      } catch (error) {
        recordTerminalError(error);
      }
    } else if (actionLog) {
      try {
        await actionLog.close();
      } catch (error) {
        recordTerminalError(error);
      }
    }
    if (descriptorPublished) {
      try {
        await unlink(options.driverDescriptorPath);
      } catch (error) {
        if (error?.code !== "ENOENT") recordTerminalError(error);
      }
      descriptorPublished = false;
    }
  }

  try {
    assertCompleteRunObservation(runObservation);
  } catch (error) {
    recordTerminalError(error);
  }
  const completedRuns = [...runObservation.runs.values()]
    .filter((run) => run.endedEvent);
  const runFacts = completedRuns.map((run, index) => buildRunMachineFacts({
    index: index + 1,
    ...run,
  }));
  const completionIssues = collectRunCompletionIssues(runFacts);

  let servedDistAtFinish = null;
  let servedDistStable = false;
  try {
    servedDistAtFinish = await attestServedDistImpl(
      options.expectedCommit,
      options.gameId,
    );
    if (servedDistAtFinish.aggregateSha256 !== servedDistAtStart.aggregateSha256) {
      throw new Error(
        `AI_PLAYTEST_SERVED_DIST_CHANGED start ${servedDistAtStart.aggregateSha256}, `
        + `finish ${servedDistAtFinish.aggregateSha256}`,
      );
    }
    servedDistStable = true;
  } catch (error) {
    recordTerminalError(error);
  }

  let sourceAtFinish = null;
  let sourceStable = false;
  try {
    sourceAtFinish = await readSourceStateImpl(options.expectedCommit);
    assertStableSourceState(source, sourceAtFinish);
    sourceStable = true;
  } catch (error) {
    recordTerminalError(error);
  }

  const complete =
    terminalErrors.length === 0
    && completionIssues.length === 0
    && sourceStable
    && servedDistStable;
  const driverFatalReason = driverController?.fatalReason() ?? null;
  const evidence = await finalizeSessionEvidence({
    output: options.output,
    baseEvidence: {
      roundId: options.roundId,
      matrixCellId: options.matrixCellId,
      reviewerRole: options.reviewerRole,
      gameId: options.gameId,
      requestedEntryUrl: options.entryUrl,
      entryUrl: actualEntryUrl,
      buildCommit: source.headCommit,
      source,
      sourceAtFinish,
      sourceStable,
      servedDist: {
        start: servedDistAtStart,
        finish: servedDistAtFinish,
        stable: servedDistStable,
      },
      interactionMode: "browser-touch",
      executionTrust:
        options.driverEnabled ? "local-audited" : "local-browser",
      entryScreenshotPath: "entry.png",
      actionLogPath:
        options.driverEnabled ? "session-actions.jsonl" : null,
      tracePath: "session-trace.zip",
      driver: options.driverEnabled
        ? {
            protocol: "loopback-whitelist-v1",
            sessionId,
            descriptorPath: null,
            fatalReason: driverFatalReason,
            heartbeatIntervalMs: DRIVER_HEARTBEAT_INTERVAL_MS,
            disconnectMs: DRIVER_DISCONNECT_MS,
            gestureLeaseMs: GESTURE_LEASE_MS,
          }
        : null,
      startedAt,
      finishedAt: new Date().toISOString(),
      runtimeSafety,
      diagnostics: {
        consoleErrors,
        pageErrors,
        requestFailures,
        badResponses,
        externalRequests: [...new Set(externalRequests)],
      },
    },
    traceError: lifecycleTraceError,
    completedRuns: runFacts,
    terminalErrors,
    completionIssues,
    complete,
    invalidRoot:
      options.invalidRoot
      ?? path.resolve(path.dirname(path.dirname(options.output)), "invalid"),
    sessionId,
    draftOutput: options.driverEnabled ? options.draftOutput : null,
    canonicalEvidencePaths: options.driverEnabled
      ? ["entry.png", "session-actions.jsonl", "session-trace.zip"]
      : [],
  });
  if (evidence.status !== "CAPTURED") {
    const error = new Error(
      `AI_PLAYTEST_SESSION_INCOMPLETE captured ${completedRuns.length}/3 completed runs; `
      + `invalidOutput=${evidence.invalidOutput ?? "unavailable"}; `
      + `${[
        ...evidence.diagnostics.terminalErrors,
        ...evidence.diagnostics.completionNotes,
      ].join(" | ")}`,
    );
    error.code = "AI_PLAYTEST_SESSION_INCOMPLETE";
    error.invalidOutput = evidence.invalidOutput ?? null;
    throw error;
  }
  return evidence;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--headed") {
      args.headed = true;
      continue;
    }
    const value = argv[index + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`invalid argument near ${key}`);
    }
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const evidence = await captureAiPlaytestSession({
    roundId: args.round,
    gameId: args.game,
    reviewerRole: args.reviewer,
    entryUrl: args.url ?? DEFAULT_URLS[args.game],
    output: args.output,
    expectedCommit: args["expected-commit"],
    timeoutMs: args["timeout-ms"] ? Number(args["timeout-ms"]) : undefined,
    headed: args.headed,
    driverEnabled: args["driver-enabled"] === "true",
    driverDescriptorPath: args["driver-descriptor-path"],
    draftOutput: args["draft-output"],
    invalidRoot: args["invalid-root"],
  });
  process.stdout.write(
    `AI PLAYTEST EVIDENCE CAPTURED | ${evidence.matrixCellId} | 3 runs | no scores generated\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
