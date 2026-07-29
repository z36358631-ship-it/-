import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { validatePngEvidence } from "./png-evidence.mjs";
import {
  analyzePlaywrightTraceEvidence,
} from "./playwright-trace-evidence.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const EVENT_FIELDS = new Set([
  "eventId",
  "sessionId",
  "runId",
  "gameId",
  "event",
  "seq",
  "clientAt",
  "schemaVersion",
  "testMode",
  "payload",
]);
const ACTION_FIELDS = new Set([
  "schemaVersion",
  "type",
  "actionId",
  "requestSeq",
  "frameSeq",
  "gestureId",
  "x",
  "y",
  "requestedAt",
  "executedAt",
  "completedAt",
  "result",
  "errorCode",
  "sessionId",
  "gameId",
  "runId",
]);
const ACTION_TYPES = new Set([
  "touchTap",
  "touchBegin",
  "touchMove",
  "touchEnd",
  "touchCancel",
]);
const FIRST_ACTION_TYPES = new Set([
  "touchTap",
  "touchBegin",
  "touchEnd",
]);
const TRACE_ACTION_TOLERANCE_MS = 250;

function evidenceError(code, detail = "") {
  const error = new Error(
    `AI_PLAYTEST_SESSION_EVIDENCE_${code}${detail ? `:${detail}` : ""}`,
  );
  error.code = `AI_PLAYTEST_SESSION_EVIDENCE_${code}`;
  return error;
}

function objectValue(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactUrl(gameId) {
  return `http://127.0.0.1:4173/${gameId}/`;
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function asFileMap(files) {
  const entries = files instanceof Map ? [...files] : Object.entries(files ?? {});
  const output = new Map();
  for (const [name, value] of entries) {
    if (
      !safeEvidencePath(name)
      || (!Buffer.isBuffer(value) && !(value instanceof Uint8Array))
    ) {
      throw evidenceError("FILES_INVALID");
    }
    output.set(name, Buffer.from(value));
  }
  return output;
}

function parseJson(bytes, relativePath) {
  if (!Buffer.isBuffer(bytes)) throw evidenceError("FILE_MISSING", relativePath);
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) throw evidenceError("JSON_TRUNCATED", relativePath);
  try {
    const value = JSON.parse(text);
    if (!objectValue(value)) throw new Error("not an object");
    return value;
  } catch {
    throw evidenceError("JSON_INVALID", relativePath);
  }
}

function parseJsonLines(bytes, relativePath) {
  if (!Buffer.isBuffer(bytes)) throw evidenceError("FILE_MISSING", relativePath);
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) throw evidenceError("JSONL_TRUNCATED", relativePath);
  const lines = text.slice(0, -1).split("\n");
  if (lines.length < 1 || lines.some((line) => line.length === 0)) {
    throw evidenceError("JSONL_INVALID", relativePath);
  }
  return lines.map((line, index) => {
    try {
      const value = JSON.parse(line);
      if (!objectValue(value)) throw new Error("not object");
      return value;
    } catch {
      throw evidenceError("JSONL_INVALID", `${relativePath}:${index + 1}`);
    }
  });
}

function requiredEvent(event, {
  gameId,
  runId,
  sessionId,
  previousSeq,
  seenIds,
  index,
}) {
  if (
    !objectValue(event)
    || Object.keys(event).some((field) => !EVENT_FIELDS.has(field))
    || Object.keys(event).length !== EVENT_FIELDS.size
    || event.schemaVersion !== 1
    || event.testMode !== false
    || event.gameId !== gameId
    || event.runId !== runId
    || event.sessionId !== sessionId
    || !SAFE_ID.test(event.eventId ?? "")
    || seenIds.has(event.eventId)
    || !Number.isSafeInteger(event.seq)
    || event.seq !== previousSeq + 1
    || typeof event.event !== "string"
    || event.event.length === 0
    || !Number.isFinite(event.clientAt)
    || !objectValue(event.payload)
  ) {
    throw evidenceError("EVENT_CONTRACT", `${runId}:${index}`);
  }
  seenIds.add(event.eventId);
}

function normalizeOutcome(value) {
  if (value === "win" || value === "won") return "win";
  if (value === "loss" || value === "lost") return "loss";
  return null;
}

function validateEventLogs(session, files, sessionId) {
  let previousSeq = 0;
  const seenIds = new Set();
  const windows = [];
  for (const [runIndex, run] of session.runs.entries()) {
    const log = parseJson(files.get(run.eventLogPath), run.eventLogPath);
    if (
      Object.keys(log).length !== 3
      || log.runId !== run.runId
      || log.outcome !== run.outcome
      || !Array.isArray(log.events)
      || log.events.length < 3
    ) {
      throw evidenceError("EVENT_LOG", run.eventLogPath);
    }
    for (const [index, event] of log.events.entries()) {
      requiredEvent(event, {
        gameId: session.gameId,
        runId: run.runId,
        sessionId,
        previousSeq,
        seenIds,
        index,
      });
      previousSeq = event.seq;
      if (index > 0 && event.clientAt < log.events[index - 1].clientAt) {
        throw evidenceError("EVENT_ORDER", run.runId);
      }
    }
    const starts = log.events.filter(({ event }) => event === "run_start");
    const inputs = log.events.filter(({ event }) => event === "first_input");
    const payoffs = log.events.filter(({ event }) => event === "first_payoff");
    const ends = log.events.filter(({ event }) => event === "run_end");
    if (
      starts.length !== 1
      || inputs.length !== 1
      || payoffs.length > 1
      || ends.length !== 1
      || log.events[0] !== starts[0]
      || log.events.at(-1) !== ends[0]
      || starts[0].clientAt >= ends[0].clientAt
    ) {
      throw evidenceError("EVENT_BOUNDARIES", run.runId);
    }
    const outcome = normalizeOutcome(ends[0].payload.result);
    const firstInputMs = Math.max(
      0,
      Math.round(inputs[0].clientAt - starts[0].clientAt),
    );
    const firstPayoffMs = payoffs.length === 1
      ? Math.max(0, Math.round(payoffs[0].clientAt - starts[0].clientAt))
      : null;
    if (
      outcome === null
      || outcome !== run.outcome
      || firstInputMs !== run.firstInputMs
      || firstPayoffMs !== run.firstPayoffMs
      || (firstPayoffMs !== null && firstPayoffMs < firstInputMs)
    ) {
      throw evidenceError("EVENT_DERIVATION", run.runId);
    }
    if (
      runIndex > 0
      && starts[0].clientAt < windows.at(-1).finishedAt
    ) {
      throw evidenceError("RUN_ORDER", run.runId);
    }
    windows.push({
      runId: run.runId,
      startedAt: starts[0].clientAt,
      finishedAt: ends[0].clientAt,
      firstInputAt: inputs[0].clientAt,
      outcome,
      firstInputMs,
      firstPayoffMs,
    });
  }
  return windows;
}

function finiteNonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validateActions(session, files, sessionId, windows) {
  const actions = parseJsonLines(
    files.get(session.actionLogPath),
    session.actionLogPath,
  );
  for (const window of windows) {
    const first = actions.find((action) => (
      action.runId === window.runId
      && action.result === "success"
      && FIRST_ACTION_TYPES.has(action.type)
    ));
    if (
      !first
    ) {
      throw evidenceError("ACTION_FIRST_INPUT", window.runId);
    }
  }
  const seenActionIds = new Set();
  let previousRequestSeq = 0;
  let previousFrameSeq = -1;
  let previousRequestedAt = -1;
  let previousExecutedAt = -1;
  let previousCompletedAt = -1;
  let activeGesture = null;
  let activeRunId = null;
  const usedGestureIds = new Set();
  for (const [index, action] of actions.entries()) {
    if (
      Object.keys(action).some((field) => !ACTION_FIELDS.has(field))
      || action.schemaVersion !== 1
      || !ACTION_TYPES.has(action.type)
      || !SAFE_ID.test(action.actionId ?? "")
      || seenActionIds.has(action.actionId)
      || action.requestSeq !== previousRequestSeq + 1
      || !Number.isSafeInteger(action.frameSeq)
      || action.frameSeq < 0
      || action.frameSeq < previousFrameSeq
      || action.sessionId !== sessionId
      || action.gameId !== session.gameId
      || !SAFE_ID.test(action.runId ?? "")
      || !finiteNonNegative(action.requestedAt)
      || !finiteNonNegative(action.executedAt)
      || !finiteNonNegative(action.completedAt)
      || action.requestedAt > action.executedAt
      || action.executedAt > action.completedAt
      || !["success", "failure"].includes(action.result)
      || (action.result === "success" && action.errorCode !== undefined)
      || (
        action.result === "failure"
        && !/^[A-Z][A-Z0-9_]{0,127}$/u.test(action.errorCode ?? "")
      )
      || !Number.isFinite(action.x)
      || !Number.isFinite(action.y)
      || action.x < 0
      || action.x > 390
      || action.y < 0
      || action.y > 844
      || action.requestedAt < previousRequestedAt
      || action.executedAt < previousExecutedAt
      || action.completedAt < previousCompletedAt
    ) {
      throw evidenceError("ACTION_CONTRACT", String(index + 1));
    }
    const window = windows.find(({ runId }) => runId === action.runId);
    if (
      !window
      || action.requestedAt < window.startedAt
      || action.completedAt > window.finishedAt
    ) {
      throw evidenceError("ACTION_RUN_WINDOW", String(index + 1));
    }
    if (activeRunId !== action.runId) {
      if (activeGesture !== null) {
        throw evidenceError("ACTION_GESTURE_CROSS_RUN", String(index + 1));
      }
      activeRunId = action.runId;
    }
    if (action.type === "touchTap") {
      if (action.gestureId !== undefined || activeGesture !== null) {
        throw evidenceError("ACTION_GESTURE", String(index + 1));
      }
    } else {
      if (!SAFE_ID.test(action.gestureId ?? "")) {
        throw evidenceError("ACTION_GESTURE", String(index + 1));
      }
      if (action.type === "touchBegin") {
        if (activeGesture !== null || usedGestureIds.has(action.gestureId)) {
          throw evidenceError("ACTION_GESTURE", String(index + 1));
        }
        activeGesture = action.gestureId;
        usedGestureIds.add(action.gestureId);
      } else if (activeGesture !== action.gestureId) {
        throw evidenceError("ACTION_GESTURE", String(index + 1));
      } else if (action.type === "touchEnd" || action.type === "touchCancel") {
        activeGesture = null;
      }
    }
    seenActionIds.add(action.actionId);
    previousRequestSeq = action.requestSeq;
    previousFrameSeq = action.frameSeq;
    previousRequestedAt = action.requestedAt;
    previousExecutedAt = action.executedAt;
    previousCompletedAt = action.completedAt;
  }
  if (activeGesture !== null) throw evidenceError("ACTION_GESTURE_UNCLOSED");
  const firstActions = [];
  for (const window of windows) {
    const runActions = actions.filter(({ runId }) => runId === window.runId);
    const first = runActions.find((action) => (
      action.result === "success"
      && FIRST_ACTION_TYPES.has(action.type)
    ));
    if (
      !first
      || window.firstInputAt - first.executedAt < 0
      || window.firstInputAt - first.executedAt > 2_000
    ) {
      throw evidenceError("ACTION_FIRST_INPUT", window.runId);
    }
    firstActions.push(first);
  }
  if (actions.some(({ completedAt }) => completedAt > windows.at(-1).finishedAt)) {
    throw evidenceError("ACTIONS_AFTER_THREE_RUNS");
  }
  return { actions, firstActions };
}

function validateIdentity(session, report) {
  if (
    session.schemaVersion !== 1
    || session.status !== "CAPTURED"
    || session.evidenceOnly !== true
    || session.subjectiveScoresGenerated !== false
    || session.executionTrust !== "local-audited"
    || session.interactionMode !== "browser-touch"
    || !SAFE_ID.test(session.gameId ?? "")
    || session.requestedEntryUrl !== exactUrl(session.gameId)
    || session.entryUrl !== exactUrl(session.gameId)
    || !/^[a-f0-9]{40}$/u.test(session.buildCommit ?? "")
    || !Array.isArray(session.runs)
    || session.runs.length !== 3
    || session.runs.some((run) => !objectValue(run))
    || session.driver?.protocol !== "loopback-whitelist-v1"
    || !SAFE_ID.test(session.driver?.sessionId ?? "")
    || session.driver?.fatalReason !== null
  ) {
    throw evidenceError("SESSION_CONTRACT");
  }
  if (
    session.source?.clean !== true
    || session.sourceAtFinish?.clean !== true
    || session.sourceStable !== true
    || session.source?.headCommit !== session.buildCommit
    || session.sourceAtFinish?.headCommit !== session.buildCommit
    || session.source?.expectedCommit !== session.buildCommit
    || session.sourceAtFinish?.expectedCommit !== session.buildCommit
    || session.servedDist?.stable !== true
    || session.servedDist?.start?.expectedCommit !== session.buildCommit
    || session.servedDist?.finish?.expectedCommit !== session.buildCommit
    || session.servedDist?.start?.gameId !== session.gameId
    || session.servedDist?.finish?.gameId !== session.gameId
    || !SHA256.test(session.servedDist?.start?.aggregateSha256 ?? "")
    || (
      session.servedDist.start.aggregateSha256
      !== session.servedDist.finish.aggregateSha256
    )
  ) {
    throw evidenceError("SOURCE_DIST_BINDING");
  }
  if (
    session.diagnostics?.terminalError !== null
    || !Array.isArray(session.diagnostics?.terminalErrors)
    || session.diagnostics.terminalErrors.length !== 0
    || !Array.isArray(session.diagnostics?.completionNotes)
    || session.diagnostics.completionNotes.length !== 0
  ) {
    throw evidenceError("TERMINAL_ERRORS");
  }
  for (const field of [
    "schemaVersion",
    "roundId",
    "matrixCellId",
    "reviewerRole",
    "gameId",
    "buildCommit",
    "entryUrl",
    "interactionMode",
    "startedAt",
    "finishedAt",
  ]) {
    if (report?.[field] !== session[field]) {
      throw evidenceError("REPORT_BINDING", field);
    }
  }
  if (
    report.sessionId !== session.driver.sessionId
    ||
    report.draftOnly !== true
    || report.evidenceOnly !== true
    || report.subjectiveScoresGenerated !== false
    || !Array.isArray(report.runs)
    || report.runs.length !== 3
    || report.runs.some((run) => !objectValue(run))
    || !isDeepStrictEqual(
      report.runs.map(({ strategyTag, strategyTagNote, ...run }) => run),
      session.runs,
    )
    || !isDeepStrictEqual(report.evidenceSha256, session.evidenceSha256)
  ) {
    throw evidenceError("REPORT_BINDING");
  }
}

function safeEvidencePath(value) {
  return (
    typeof value === "string"
    && value.length > 0
    && !value.includes("\\")
    && !value.startsWith("/")
    && !/^[A-Za-z]:/u.test(value)
    && !value.split("/").some((segment) => (
      segment === "" || segment === "." || segment === ".."
    ))
  );
}

function canonicalEvidencePaths(session) {
  if (!Array.isArray(session.runs) || session.runs.length !== 3) {
    throw evidenceError("RUN_CONTRACT");
  }
  const expected = [
    "entry.png",
    "session-actions.jsonl",
    "session-trace.zip",
  ];
  if (![
    session.entryScreenshotPath,
    session.actionLogPath,
    session.tracePath,
  ].every(safeEvidencePath)) {
    throw evidenceError("PATH_UNSAFE");
  }
  if (
    session.entryScreenshotPath !== expected[0]
    || session.actionLogPath !== expected[1]
    || session.tracePath !== expected[2]
  ) {
    throw evidenceError("CANONICAL_PATH");
  }
  for (const [index, run] of session.runs.entries()) {
    const number = index + 1;
    if (
      !objectValue(run)
      || !Array.isArray(run.screenshotPaths)
      || run.screenshotPaths.length !== 2
    ) {
      throw evidenceError("RUN_CONTRACT", `run-${number}`);
    }
    if (![
      ...run.screenshotPaths,
      run.eventLogPath,
      run.tracePath,
    ].every(safeEvidencePath)) {
      throw evidenceError("PATH_UNSAFE", `run-${number}`);
    }
    if (
      run.screenshotPaths.length !== 2
      || run.screenshotPaths[0] !== `run-${number}-start.png`
      || run.screenshotPaths[1] !== `run-${number}-result.png`
      || run.eventLogPath !== `run-${number}-events.json`
      || run.tracePath !== "session-trace.zip"
    ) {
      throw evidenceError("CANONICAL_PATH", `run-${number}`);
    }
    expected.push(...run.screenshotPaths, run.eventLogPath);
  }
  return expected;
}

function bindSuccessfulTapActionsToTrace(actions, taps) {
  const tapActions = actions.filter((action) => (
    action.result === "success" && action.type === "touchTap"
  ));
  if (tapActions.length !== taps.length) {
    throw evidenceError(
      "TRACE_ACTION_COUNT",
      `${tapActions.length}:${taps.length}`,
    );
  }
  const usedTapIndexes = new Set();
  for (const [actionIndex, action] of tapActions.entries()) {
    const matches = taps
      .map((tap, index) => ({ tap, index }))
      .filter(({ tap, index }) => (
        !usedTapIndexes.has(index)
        && action.type === tap.type
        && action.x === tap.x
        && action.y === tap.y
        && Math.abs(action.executedAt - tap.startedAt)
          <= TRACE_ACTION_TOLERANCE_MS
      ));
    if (matches.length !== 1) {
      throw evidenceError("TRACE_ACTION_BINDING", String(actionIndex + 1));
    }
    usedTapIndexes.add(matches[0].index);
  }
}

export async function validateSessionEvidenceBundle(bundle) {
  if (!objectValue(bundle)) throw evidenceError("BUNDLE_INVALID");
  const session = bundle?.sessionEvidence ?? bundle?.session;
  const report = bundle?.reportDraft ?? bundle?.report;
  if (!objectValue(session) || !objectValue(report)) {
    throw evidenceError("BUNDLE_INVALID");
  }
  validateIdentity(session, report);
  const canonicalPaths = canonicalEvidencePaths(session);
  const files = asFileMap(bundle.files);
  const expectedPaths = new Set(canonicalPaths);
  if (
    expectedPaths.size !== 12
    || files.size !== 12
    || [...expectedPaths].some((name) => !files.has(name))
    || [...files.keys()].some((name) => !expectedPaths.has(name))
  ) {
    throw evidenceError("FILE_SET");
  }
  if (
    !objectValue(session.evidenceSha256)
    || Object.keys(session.evidenceSha256).length !== 12
  ) {
    throw evidenceError("HASH_SET");
  }
  for (const [name, bytes] of files) {
    if (
      !SHA256.test(session.evidenceSha256[name] ?? "")
      || hash(bytes) !== session.evidenceSha256[name]
    ) {
      throw evidenceError("HASH_MISMATCH", name);
    }
  }

  await validatePngEvidence(
    files.get(session.entryScreenshotPath),
    session.entryScreenshotPath,
    { width: 390, height: 844 },
  );
  for (const run of session.runs) {
    if (
      !objectValue(run)
      || !SAFE_ID.test(run.runId ?? "")
      || !["win", "loss"].includes(run.outcome)
      || !Array.isArray(run.screenshotPaths)
      || run.screenshotPaths.length !== 2
      || run.tracePath !== session.tracePath
    ) {
      throw evidenceError("RUN_CONTRACT");
    }
    for (const screenshotPath of run.screenshotPaths) {
      await validatePngEvidence(
        files.get(screenshotPath),
        screenshotPath,
        { width: 390, height: 844 },
      );
    }
    if (
      session.evidenceSha256[run.screenshotPaths[0]]
      === session.evidenceSha256[run.screenshotPaths[1]]
    ) {
      throw evidenceError("SCREENSHOT_IDENTICAL", run.runId);
    }
  }

  const sessionId = session.driver.sessionId;
  const windows = validateEventLogs(session, files, sessionId);
  const sessionStartedAt = Date.parse(session.startedAt);
  const sessionFinishedAt = Date.parse(session.finishedAt);
  if (
    !Number.isFinite(sessionStartedAt)
    || !Number.isFinite(sessionFinishedAt)
    || sessionFinishedAt <= sessionStartedAt
    || windows.some(({ startedAt, finishedAt }) => (
      startedAt < sessionStartedAt
      || finishedAt > sessionFinishedAt
    ))
  ) {
    throw evidenceError("SESSION_RUN_WINDOW");
  }
  const { actions } = validateActions(session, files, sessionId, windows);
  const trace = analyzePlaywrightTraceEvidence(
    files.get(session.tracePath),
    {
      entryUrl: session.entryUrl,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      runs: windows,
    },
  );
  bindSuccessfulTapActionsToTrace(actions, trace.taps);
  const derivedRuns = windows.map((window) => Object.freeze({
    runId: window.runId,
    outcome: window.outcome,
    firstInputMs: window.firstInputMs,
    firstPayoffMs: window.firstPayoffMs,
  }));
  return Object.freeze({
    sessionId,
    runIds: Object.freeze(windows.map(({ runId }) => runId)),
    derivedRuns: Object.freeze(derivedRuns),
    evidencePaths: Object.freeze([...canonicalPaths]),
  });
}

export async function validateCapturedSessionEvidence(input = {}) {
  if (!objectValue(input)) throw evidenceError("BUNDLE_INVALID");
  const { session, report, evidenceByPath } = input;
  return validateSessionEvidenceBundle({
    sessionEvidence: session,
    reportDraft: report,
    files: evidenceByPath,
  });
}
