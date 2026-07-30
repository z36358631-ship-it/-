import { readBoundedZip } from "./zip-evidence.mjs";

const TRACE_ROOTS = Object.freeze([
  "trace.trace",
  "trace.network",
  "trace.stacks",
]);
const SAFE_ENTRY_URL = /^http:\/\/127\.0\.0\.1:4173\/[a-z0-9-]+\/$/u;
const RESOURCE_SHA1 = /^[a-f0-9]{40}(?:\.[a-z0-9]+)?$/u;
const NETWORK_TIME_TOLERANCE_MS = 10;
const NETWORK_CLOCK_OFFSET_LIMIT_MS = 250;
const SESSION_TIME_TOLERANCE_MS = 5_000;

function traceError(code, detail = "") {
  const error = new Error(
    `AI_PLAYTEST_TRACE_${code}${detail ? `:${detail}` : ""}`,
  );
  error.code = `AI_PLAYTEST_TRACE_${code}`;
  return error;
}

function objectValue(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonLines(bytes, entryName) {
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    throw traceError("JSONL_TRUNCATED", entryName);
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.length < 1 || lines.some((line) => line.length === 0)) {
    throw traceError("JSONL_INVALID", entryName);
  }
  return lines.map((line, index) => {
    try {
      const value = JSON.parse(line);
      if (!objectValue(value)) throw new Error("not object");
      return value;
    } catch {
      throw traceError("JSONL_INVALID", `${entryName}:${index + 1}`);
    }
  });
}

function epoch(value, field) {
  const parsed = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(parsed)) throw traceError("TIME_INVALID", field);
  return parsed;
}

function safeUrl(value, entryUrl, { allowBlank = false } = {}) {
  if (allowBlank && value === "about:blank") return true;
  if (typeof value !== "string") return false;
  if (value.startsWith("data:")) return true;
  const candidate = value.startsWith("blob:") ? value.slice(5) : value;
  try {
    const expected = new URL(entryUrl);
    const actual = new URL(candidate);
    return (
      actual.protocol === "http:"
      && actual.hostname === "127.0.0.1"
      && actual.port === "4173"
      && actual.origin === expected.origin
      && actual.username === ""
      && actual.password === ""
    );
  } catch {
    return false;
  }
}

function monotonicTimes(records) {
  const values = [];
  for (const record of records) {
    for (const candidate of [
      record.startTime,
      record.endTime,
      record.time,
      record.timestamp,
      record.snapshot?.timestamp,
    ]) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        values.push(candidate);
      }
    }
  }
  return values;
}

function exactlyOne(records, predicate, code, detail) {
  const matches = records.filter(predicate);
  if (matches.length !== 1) {
    throw traceError(code, `${detail}:${matches.length}`);
  }
  return matches[0];
}

function validateStacks(bytes, traceRecords, taps) {
  let stacks;
  try {
    stacks = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw traceError("STACKS_INVALID");
  }
  if (
    !objectValue(stacks)
    || !Array.isArray(stacks.files)
    || stacks.files.length === 0
    || stacks.files.some((file) => typeof file !== "string" || file.length === 0)
    || !Array.isArray(stacks.stacks)
    || stacks.stacks.length === 0
  ) {
    throw traceError("STACKS_INVALID");
  }
  const stackCallIds = new Set();
  let previousCallNumber = -1;
  for (const [index, stack] of stacks.stacks.entries()) {
    if (
      !Array.isArray(stack)
      || stack.length !== 2
      || !Number.isSafeInteger(stack[0])
      || stack[0] < 0
      || stack[0] <= previousCallNumber
      || !Array.isArray(stack[1])
      || stack[1].length === 0
    ) {
      throw traceError("STACKS_INVALID", String(index));
    }
    previousCallNumber = stack[0];
    stackCallIds.add(`call@${stack[0]}`);
    for (const frame of stack[1]) {
      if (
        !Array.isArray(frame)
        || frame.length !== 4
        || !Number.isSafeInteger(frame[0])
        || frame[0] < 0
        || frame[0] >= stacks.files.length
        || !Number.isSafeInteger(frame[1])
        || frame[1] < 0
        || !Number.isSafeInteger(frame[2])
        || frame[2] < 0
        || typeof frame[3] !== "string"
      ) {
        throw traceError("STACKS_INVALID", String(index));
      }
    }
  }
  if (taps.some(({ callId }) => !stackCallIds.has(callId))) {
    throw traceError("STACKS_TAP_MISSING");
  }
}

function normalizeTaps(traceRecords, {
  pageId,
  mainFrameId,
  toWallTime,
}) {
  const beforeTaps = traceRecords.filter((record) => (
    record.type === "before"
    && record.class === "Page"
    && record.method === "touchscreenTap"
  ));
  const seenCallIds = new Set();
  return beforeTaps.map((before) => {
    const { callId } = before;
    if (
      typeof callId !== "string"
      || seenCallIds.has(callId)
      || before.pageId !== pageId
      || !Number.isFinite(before.startTime)
      || !Number.isFinite(before.params?.x)
      || !Number.isFinite(before.params?.y)
    ) {
      throw traceError("TOUCH_BEFORE", String(callId));
    }
    seenCallIds.add(callId);
    const input = exactlyOne(
      traceRecords,
      (record) => record.type === "input" && record.callId === callId,
      "TOUCH_INPUT",
      callId,
    );
    const after = exactlyOne(
      traceRecords,
      (record) => record.type === "after" && record.callId === callId,
      "TOUCH_AFTER",
      callId,
    );
    const snapshot = exactlyOne(
      traceRecords,
      (record) => (
        record.type === "frame-snapshot"
        && record.snapshot?.callId === callId
        && record.snapshot?.snapshotName === `input@${callId}`
      ),
      "TOUCH_SNAPSHOT",
      callId,
    ).snapshot;
    if (
      input.inputSnapshot !== `input@${callId}`
      || input.point?.x !== before.params.x
      || input.point?.y !== before.params.y
      || after.afterSnapshot !== `after@${callId}`
      || !Number.isFinite(after.endTime)
      || before.startTime > after.endTime
      || snapshot.pageId !== pageId
      || snapshot.frameId !== mainFrameId
      || snapshot.frameUrl === undefined
      || !Number.isFinite(snapshot.timestamp)
      || snapshot.timestamp < before.startTime
      || snapshot.timestamp > after.endTime
    ) {
      throw traceError("TOUCH_BINDING", callId);
    }
    return Object.freeze({
      callId,
      type: "touchTap",
      x: before.params.x,
      y: before.params.y,
      startedAt: toWallTime(before.startTime),
      inputAt: toWallTime(snapshot.timestamp),
      finishedAt: toWallTime(after.endTime),
    });
  });
}

function validateNetwork(networkRecords, entries, {
  entryUrl,
  pageId,
  mainFrameId,
  toWallTime,
}) {
  if (
    networkRecords.length < 1
    || networkRecords.some(({ type }) => type !== "resource-snapshot")
  ) {
    throw traceError("NETWORK_SCHEMA");
  }
  const referencedResources = new Set();
  let hasDocument = false;
  let documentClockOffset = null;
  const clockOffsets = [];
  for (const [index, { snapshot }] of networkRecords.entries()) {
    const request = snapshot?.request;
    const response = snapshot?.response;
    const startedAt = Date.parse(snapshot?.startedDateTime);
    if (
      !objectValue(snapshot)
      || snapshot.pageref !== pageId
      || snapshot._frameref !== mainFrameId
      || !safeUrl(request?.url, entryUrl)
      || !Number.isFinite(startedAt)
      || !Number.isFinite(snapshot._monotonicTime)
    ) {
      throw traceError("NETWORK_BINDING", String(index));
    }
    const clockOffset =
      startedAt - toWallTime(snapshot._monotonicTime);
    if (Math.abs(clockOffset) > NETWORK_CLOCK_OFFSET_LIMIT_MS) {
      throw traceError("NETWORK_BINDING", String(index));
    }
    clockOffsets.push(clockOffset);
    if (
      request.method === "GET"
      && request.url === entryUrl
      && Number.isSafeInteger(response?.status)
      && response.status >= 200
      && response.status < 300
      && /^text\/html(?:;|$)/u.test(response.content?.mimeType ?? "")
      && snapshot._resourceType === "document"
      && Array.isArray(request.headers)
      && request.headers.some(({ name, value }) => (
        typeof name === "string"
        && name.toLowerCase() === "sec-fetch-dest"
        && value === "document"
      ))
    ) {
      hasDocument = true;
      documentClockOffset ??= clockOffset;
    }
    const sha1 = response?.content?._sha1;
    if (sha1 !== undefined) {
      const resourceName = `resources/${sha1}`;
      if (
        !RESOURCE_SHA1.test(sha1)
        || !entries.has(resourceName)
        || entries.get(resourceName).length === 0
      ) {
        throw traceError("RESOURCE_BINDING", `${index}:${String(sha1)}`);
      }
      referencedResources.add(resourceName);
    }
  }
  if (!hasDocument) throw traceError("DOCUMENT_REQUEST");
  for (const [index, clockOffset] of clockOffsets.entries()) {
    if (
      Math.abs(clockOffset - documentClockOffset)
        > NETWORK_TIME_TOLERANCE_MS
    ) {
      throw traceError("NETWORK_BINDING", String(index));
    }
  }
  if (referencedResources.size === 0) throw traceError("RESOURCE_REQUIRED");
  const archiveResources = [...entries.keys()]
    .filter((name) => name.startsWith("resources/"));
  if (
    archiveResources.length !== referencedResources.size
    || archiveResources.some((name) => !referencedResources.has(name))
  ) {
    throw traceError("RESOURCE_ORPHAN");
  }
  return referencedResources;
}

export function analyzePlaywrightTraceEvidence(bytes, options = {}) {
  if (!objectValue(options)) throw traceError("OPTIONS");
  const { entryUrl } = options;
  if (typeof entryUrl !== "string" || !SAFE_ENTRY_URL.test(entryUrl)) {
    throw traceError("ENTRY_URL", String(entryUrl));
  }
  const entries = readBoundedZip(bytes, {
    maxEntries: 10_000,
    maxEntryBytes: 134_217_728,
    maxTotalBytes: 268_435_456,
    maxCompressionRatio: 100,
  });
  for (const root of TRACE_ROOTS) {
    if (!entries.has(root) || entries.get(root).length === 0) {
      throw traceError("ROOT_MISSING", root);
    }
  }
  const traceRecords = parseJsonLines(entries.get("trace.trace"), "trace.trace");
  const networkRecords = parseJsonLines(entries.get("trace.network"), "trace.network");
  const contexts = traceRecords.filter(({ type }) => type === "context-options");
  if (contexts.length !== 1) {
    throw traceError("CONTEXT_COUNT", String(contexts.length));
  }
  const context = contexts[0];
  if (
    context.version !== 8
    || context.origin !== "library"
    || context.browserName !== "chromium"
    || !/^1\.(?:6[1-9]|[7-9][0-9])\.\d+$/u.test(context.playwrightVersion ?? "")
    || context.options?.viewport?.width !== 390
    || context.options?.viewport?.height !== 844
    || context.options?.hasTouch !== true
    || context.options?.isMobile !== true
    || !Number.isFinite(context.wallTime)
    || !Number.isFinite(context.monotonicTime)
  ) {
    throw traceError("CONTEXT_INVALID");
  }
  const toWallTime = (value) => (
    context.wallTime + value - context.monotonicTime
  );

  const goto = exactlyOne(
    traceRecords,
    (record) => record.type === "before"
      && record.class === "Frame"
      && record.method === "goto",
    "NAVIGATION",
    "goto",
  );
  if (goto.params?.url !== entryUrl || typeof goto.pageId !== "string") {
    throw traceError("NAVIGATION");
  }
  const pageId = goto.pageId;
  const pageSnapshots = traceRecords.filter(({ type, snapshot }) => (
    type === "frame-snapshot" && snapshot?.pageId === pageId
  ));
  const mainSnapshots = pageSnapshots.filter(({ snapshot }) => (
    snapshot.isMainFrame === true && snapshot.frameUrl === entryUrl
  ));
  if (
    mainSnapshots.length < 1
    || pageSnapshots.some(({ snapshot }) => (
      !safeUrl(snapshot.frameUrl, entryUrl, { allowBlank: true })
    ))
  ) {
    throw traceError("PAGE_URL");
  }
  const mainFrameIds = new Set(mainSnapshots.map(({ snapshot }) => snapshot.frameId));
  if (mainFrameIds.size !== 1) throw traceError("MAIN_FRAME");
  const mainFrameId = [...mainFrameIds][0];

  const taps = normalizeTaps(traceRecords, {
    pageId,
    mainFrameId,
    toWallTime,
  });
  validateStacks(entries.get("trace.stacks"), traceRecords, taps);
  const referencedResources = validateNetwork(networkRecords, entries, {
    entryUrl,
    pageId,
    mainFrameId,
    toWallTime,
  });

  const times = monotonicTimes(traceRecords);
  if (times.length < 2) throw traceError("TIME_INVALID", "trace");
  const traceStartedAt = toWallTime(Math.min(...times));
  const traceFinishedAt = toWallTime(Math.max(...times));
  const sessionStartedAt = epoch(options.startedAt, "startedAt");
  const sessionFinishedAt = epoch(options.finishedAt, "finishedAt");
  if (
    sessionFinishedAt <= sessionStartedAt
    || Math.abs(traceStartedAt - sessionStartedAt)
      > SESSION_TIME_TOLERANCE_MS
    || Math.abs(traceFinishedAt - sessionFinishedAt)
      > SESSION_TIME_TOLERANCE_MS
  ) {
    throw traceError("SESSION_WINDOW");
  }
  if (options.runs !== undefined) {
    if (!Array.isArray(options.runs) || options.runs.length !== 3) {
      throw traceError("RUN_WINDOW", "count");
    }
    for (const [index, run] of options.runs.entries()) {
      const startedAt = epoch(run.startedAt, `runs[${index}].startedAt`);
      const finishedAt = epoch(run.finishedAt, `runs[${index}].finishedAt`);
      if (
        startedAt < traceStartedAt
        || finishedAt <= startedAt
        || finishedAt > traceFinishedAt
      ) {
        throw traceError("RUN_WINDOW", String(index + 1));
      }
    }
  }
  return Object.freeze({
    entryNames: Object.freeze([...entries.keys()].sort()),
    recordCount: traceRecords.length,
    networkRecordCount: networkRecords.length,
    resourceCount: referencedResources.size,
    traceStartedAt,
    traceFinishedAt,
    taps: Object.freeze(taps),
  });
}

export async function validatePlaywrightTrace(bytes, options = {}) {
  if (!objectValue(options)) throw traceError("OPTIONS");
  const analysis = analyzePlaywrightTraceEvidence(bytes, options);
  return Object.freeze({
    entryNames: analysis.entryNames,
    recordCount: analysis.recordCount,
    networkRecordCount: analysis.networkRecordCount,
    resourceCount: analysis.resourceCount,
  });
}

export const validatePlaywrightTraceEvidence = validatePlaywrightTrace;
