# Trusted AI Playtest Driver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed local AI playtest loop in which an external AI can inspect only visible output, submit only real touch input, and produce atomically captured evidence that is revalidated through report, matrix, and delivery packaging.

**Architecture:** The existing runner remains the only owner of Playwright browser objects. Focused modules add exclusive artifact publication, a stateful loopback command protocol, visible-only browser adaptation, strict PNG/ZIP/trace/session validation, and report-to-delivery evidence binding. A real `casual × ricochet-crew × 3 runs` pilot is the release gate before the 18-cell matrix starts.

**Tech Stack:** Node.js ESM, Playwright 1.62, Vitest 3, Node test runner, `sharp`, Git, PowerShell.

---

## Scope and file ownership

The work is one integrated subsystem because the runner, evidence schema, validator, and delivery verifier must agree on identical paths and hashes. Execute tasks in order; do not edit the same file from parallel workers.

| Area | Files owned |
| --- | --- |
| Atomic capture | `tools/ai-playtest/exclusive-artifacts.mjs`, `tools/run-ai-playtest-session.mjs`, `tests/integration/ai-playtest-session.test.mjs` |
| Driver protocol | `tools/ai-playtest/driver-session-state.mjs`, `tools/ai-playtest/driver-ipc-server.mjs`, `tools/ai-playtest/browser-touch-adapter.mjs`, their tests |
| Evidence parsing | `tools/ai-playtest/png-evidence.mjs`, `zip-evidence.mjs`, `playwright-trace-evidence.mjs`, `session-evidence-validator.mjs`, their tests |
| Report and matrix | `tools/validate-ai-playtest-report.mjs`, `tools/validate-ai-playtest-matrix.mjs`, evidence/scoring tests |
| Delivery | `tools/verify-delivery.mjs`, `tools/export-git-snapshot.mjs`, `delivery-allowlist.json`, delivery tests |
| Operator tooling | `tools/ai-playtest-driver-cli.mjs`, `tools/ai-playtest-heartbeat.mjs`, playtest docs |

Never use `git add -A`, `git reset --hard`, or `git checkout --`. Every commit command below stages only the files named for that task.

### Shared constants

All later tasks use these exact canonical names:

```js
export const VIEWPORT = Object.freeze({ width: 390, height: 844 });
export const CANONICAL_SESSION_FILES = Object.freeze({
  entryScreenshot: "entry.png",
  sessionEvidence: "session-evidence.json",
  actionLog: "session-actions.jsonl",
  trace: "session-trace.zip",
});
export const DRIVER_HEARTBEAT_INTERVAL_MS = 2_000;
export const DRIVER_DISCONNECT_MS = 10_000;
export const GESTURE_LEASE_MS = 2_000;
```

### Collaboration evidence rule

For every task, the assigned employee records actual start/finish timestamps, conservative active minutes, owned files, test command, exit code, pass/fail counts, and output hashes in an immutable JSON under `games/wechat-h5-v2/test-results/collaboration/`. Hash that JSON and append one row to `docs/wechat-h5-v2/team-collaboration-log.md`. Do not count tool waiting, test waiting, idle time, or overlapping employee minutes twice. The 480-minute claim remains false until:

```powershell
node tools/verify-team-collaboration.mjs ..\..\docs\wechat-h5-v2\team-collaboration-log.md
```

returns `COLLABORATION PASS`.

## Task 1: Atomically claim a playtest cell and publish artifacts without overwrite

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/exclusive-artifacts.mjs`
- Modify: `games/wechat-h5-v2/tools/run-ai-playtest-session.mjs`
- Test: `games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs`

- [ ] **Step 1: Write failing tests for concurrent claims and artifact overwrite**

Add imports and tests:

```js
import {
  claimOutputDirectory,
  publishBufferExclusive,
  publishTemporaryFileExclusive,
} from "../../tools/ai-playtest/exclusive-artifacts.mjs";

it("atomically allows only one runner to claim a matrix cell", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-cell-"));
  const cell = path.join(root, "casual-ricochet-crew");
  const results = await Promise.allSettled([
    claimOutputDirectory(cell),
    claimOutputDirectory(cell),
  ]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.match(
    String(results.find(({ status }) => status === "rejected")?.reason),
    /AI_PLAYTEST_OUTPUT_EXISTS/u,
  );
});

it("never replaces a fixed screenshot or trace", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-artifact-"));
  const target = path.join(root, "entry.png");
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
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run:

```powershell
Set-Location 'C:\Users\z3635\官网改动\games\wechat-h5-v2'
node --test tests/integration/ai-playtest-session.test.mjs
```

Expected: FAIL because `exclusive-artifacts.mjs` does not exist.

- [ ] **Step 3: Implement exclusive directory and file publication**

Create the module with these exports:

```js
import { randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";

export async function claimOutputDirectory(output) {
  const parent = path.dirname(output);
  const parentStat = await stat(parent).catch(() => null);
  if (!parentStat?.isDirectory()) {
    throw new Error(`AI_PLAYTEST_OUTPUT_PARENT_MISSING:${parent}`);
  }
  try {
    await mkdir(output, { recursive: false });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`AI_PLAYTEST_OUTPUT_EXISTS:${output}`);
    }
    throw error;
  }
}

export async function publishBufferExclusive(target, bytes) {
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(temporary, "wx");
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await publishTemporaryFileExclusive(temporary, target);
  } catch (error) {
    await handle?.close().catch(() => {});
    await unlink(temporary).catch(() => {});
    if (error?.code === "EEXIST") {
      throw new Error(`AI_PLAYTEST_ARTIFACT_EXISTS:${target}`);
    }
    throw error;
  }
}

export async function publishJsonExclusive(target, value) {
  await publishBufferExclusive(
    target,
    Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"),
  );
}

export async function temporaryArtifactPath(output, basename) {
  return path.join(output, `.${basename}.${randomUUID()}.tmp`);
}

export async function publishTemporaryFileExclusive(temporary, target) {
  try {
    await link(temporary, target);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`AI_PLAYTEST_ARTIFACT_EXISTS:${target}`);
    }
    throw error;
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

export async function quarantineIncompleteSession({
  output,
  invalidRoot,
  sessionId,
  now = Date.now,
}) {
  await mkdir(invalidRoot, { recursive: true });
  const stamp = new Date(now()).toISOString().replaceAll(/[:.]/gu, "-");
  const target = path.join(invalidRoot, `${stamp}-${sessionId}`);
  await rename(output, target);
  return target;
}
```

Update the runner to call `claimOutputDirectory(options.output)` instead of `pathExists()` plus recursive `mkdir`. Make every `page.screenshot({ type: "png", fullPage: false })` return a viewport-sized buffer and publish it with `publishBufferExclusive`. Stop tracing to a unique temporary path, then call `publishTemporaryFileExclusive`.

- [ ] **Step 4: Run the targeted regression**

Run:

```powershell
node --test tests/integration/ai-playtest-session.test.mjs
```

Expected: all session tests PASS, including the two new concurrency tests.

- [ ] **Step 5: Commit the atomic capture boundary**

```powershell
git add -- games/wechat-h5-v2/tools/ai-playtest/exclusive-artifacts.mjs games/wechat-h5-v2/tools/run-ai-playtest-session.mjs games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs
git commit -m "fix(games): make playtest evidence capture atomic"
```

## Task 2: Make runner initialization and INCOMPLETE evidence fail closed

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/session-lifecycle.mjs`
- Modify: `games/wechat-h5-v2/tools/run-ai-playtest-session.mjs`
- Test: `games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs`

- [ ] **Step 1: Add resource cleanup and missing-trace tests**

Use injected factories so tests do not launch Chromium:

```js
it.each(["launch", "context", "page", "tracing"])(
  "closes every initialized resource when %s initialization fails",
  async (failurePoint) => {
    const calls = [];
    const resources = fakeBrowserResources({ failurePoint, calls });
    await assert.rejects(
      runSessionLifecycle(resources),
      /AI_PLAYTEST_INITIALIZATION/u,
    );
    assert.deepEqual(calls.filter((name) => name.startsWith("close:")), [
      ...expectedClosures(failurePoint),
    ]);
  },
);

it("writes INCOMPLETE session evidence when trace stop fails", async () => {
  const directory = await sessionFixtureDirectory();
  const result = await finalizeSessionEvidence({
    output: directory,
    traceError: new Error("trace-stop-failed"),
    completedRuns: [],
  });
  assert.equal(result.status, "INCOMPLETE");
  assert.match(result.diagnostics.terminalErrors.join("|"), /trace-stop-failed/u);
  assert.equal(
    JSON.parse(await readFile(path.join(directory, "session-evidence.json"))).status,
    "INCOMPLETE",
  );
});
```

- [ ] **Step 2: Confirm the new lifecycle API is absent**

Run the session test and expect failures for missing `runSessionLifecycle` and `finalizeSessionEvidence`.

- [ ] **Step 3: Implement staged resource ownership**

Create:

```js
export async function closePlaytestResources(resources, recordError) {
  for (const [label, resource] of [
    ["page", resources.page],
    ["context", resources.context],
    ["browser", resources.browser],
  ]) {
    if (!resource?.close) continue;
    try {
      await resource.close();
    } catch (error) {
      recordError(new Error(`AI_PLAYTEST_CLOSE_${label.toUpperCase()}:${error.message}`));
    }
  }
}

export function createTerminalErrorRecorder() {
  const errors = [];
  return {
    errors,
    record(error) {
      errors.push(error instanceof Error ? error.message : String(error));
    },
  };
}
```

Move `chromium.launch`, `newContext`, `newPage`, event listeners, and `tracing.start` inside one outer `try/finally`. Track `tracingStarted` separately. Set tracing options exactly to:

```js
await context.tracing.start({
  screenshots: false,
  snapshots: true,
  sources: false,
});
```

When trace stop fails, do not call the success-only evidence hasher. Build `session-evidence.json` with the evidence paths that actually exist, status `INCOMPLETE`, and the trace error. Write `report-draft.json` only for `CAPTURED`.

- [ ] **Step 4: Run session and evidence tests**

```powershell
node --test tests/integration/ai-playtest-session.test.mjs tests/integration/ai-playtest-evidence.test.mjs
```

Expected: all tests PASS and no Chromium process remains after injected failures.

- [ ] **Step 5: Commit lifecycle cleanup**

```powershell
git add -- games/wechat-h5-v2/tools/ai-playtest/session-lifecycle.mjs games/wechat-h5-v2/tools/run-ai-playtest-session.mjs games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs
git commit -m "fix(games): preserve incomplete playtest diagnostics"
```

## Task 3: Implement the pure driver protocol state machine

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/driver-session-state.mjs`
- Create: `games/wechat-h5-v2/tests/integration/ai-driver-state.test.mjs`

- [ ] **Step 1: Write protocol-state tests**

Cover authorization, replay protection, frame freshness, gesture leases, heartbeat, and third-run closure:

```js
it("rejects duplicate actions and stale frames", () => {
  const state = createDriverSessionState({
    sessionId: "session-1",
    token: "a".repeat(64),
    now: () => 1_000,
  });
  const first = state.authorize(action("touchTap", {
    requestSeq: 1,
    actionId: "action-1",
    frameSeq: 0,
  }));
  assert.equal(first.ok, true);
  state.advanceFrame();
  assert.throws(() => state.authorize(action("touchTap", {
    requestSeq: 2,
    actionId: "action-2",
    frameSeq: 0,
  })), /AI_DRIVER_STALE_FRAME/u);
  assert.throws(() => state.authorize(action("touchTap", {
    requestSeq: 3,
    actionId: "action-1",
    frameSeq: 1,
  })), /AI_DRIVER_DUPLICATE_ACTION/u);
});

it("expires one gesture after two seconds and closes after run three", () => {
  let now = 1_000;
  const state = createDriverSessionState({
    sessionId: "session-1",
    token: "b".repeat(64),
    now: () => now,
  });
  const gesture = state.beginGesture({ actionId: "begin-1", x: 10, y: 10 });
  now += 2_001;
  assert.throws(() => state.moveGesture({
    actionId: "move-1",
    gestureId: gesture.gestureId,
    x: 20,
    y: 20,
  }), /AI_DRIVER_GESTURE_EXPIRED/u);
  state.recordRun(1);
  state.recordRun(2);
  state.recordRun(3);
  assert.throws(() => state.assertActionOpen(), /AI_DRIVER_RUNS_COMPLETE/u);
});
```

- [ ] **Step 2: Run the new test and verify module-not-found**

```powershell
node --test tests/integration/ai-driver-state.test.mjs
```

Expected: FAIL because the state module is absent.

- [ ] **Step 3: Implement the exact protocol constants and API**

Export the constants and public contract:

```text
VIEWPORT = immutable { width: 390, height: 844 }
DRIVER_HEARTBEAT_INTERVAL_MS = 2000
DRIVER_DISCONNECT_MS = 10000
GESTURE_LEASE_MS = 2000
createDriverSessionState({ sessionId, token, now })
  → { authorize, heartbeat, advanceFrame, beginGesture, moveGesture,
      endGesture, cancelGesture, recordRun, assertConnected,
      assertActionOpen, snapshot }
```

The implementation must enforce:

```js
if (request.sessionId !== sessionId) throw new Error("AI_DRIVER_SESSION_MISMATCH");
if (request.requestSeq <= lastRequestSeq) throw new Error("AI_DRIVER_REQUEST_REPLAY");
if (seenActionIds.has(request.actionId)) throw new Error("AI_DRIVER_DUPLICATE_ACTION");
if (request.frameSeq !== frameSeq) throw new Error("AI_DRIVER_STALE_FRAME");
if (x < 0 || x > VIEWPORT.width || y < 0 || y > VIEWPORT.height) {
  throw new Error("AI_DRIVER_COORDINATE_OUT_OF_RANGE");
}
```

Use `randomUUID()` for gesture IDs. A heartbeat timeout, gesture timeout, or fourth run sets a permanent fatal reason; the state cannot reopen.

- [ ] **Step 4: Run state tests**

Expected: authorization, bounds, lease, heartbeat, duplicate, stale-frame, and run-limit tests all PASS.

- [ ] **Step 5: Commit the pure protocol**

```powershell
git add -- games/wechat-h5-v2/tools/ai-playtest/driver-session-state.mjs games/wechat-h5-v2/tests/integration/ai-driver-state.test.mjs
git commit -m "feat(games): add restricted AI driver state machine"
```

## Task 4: Add the loopback IPC server and visible-only browser adapter

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/driver-ipc-server.mjs`
- Create: `games/wechat-h5-v2/tools/ai-playtest/browser-touch-adapter.mjs`
- Create: `games/wechat-h5-v2/tests/integration/ai-driver-ipc.test.mjs`

- [ ] **Step 1: Write HTTP contract tests with a fake adapter**

```js
it("binds only loopback and exposes only whitelisted commands", async () => {
  const adapter = fakeAdapter();
  const server = await startDriverIpcServer({
    sessionId: "session-1",
    token: "c".repeat(64),
    adapter,
  });
  assert.equal(server.address.host, "127.0.0.1");
  await assert.rejects(
    sendCommand(server, { type: "evaluate", expression: "window.__DEBUG__" }),
    /AI_DRIVER_COMMAND_FORBIDDEN/u,
  );
  assert.equal(adapter.calls.includes("evaluate"), false);
  await server.close();
});

it("returns visible text and ephemeral controls without HTML or selectors", async () => {
  const result = await sendAuthorizedCommand(server, {
    type: "visible",
    requestSeq: 1,
    actionId: "visible-1",
  });
  assert.deepEqual(Object.keys(result.controls[0]).sort(), [
    "controlId", "enabled", "label", "rect",
  ]);
  assert.equal("html" in result, false);
  assert.equal("selector" in result.controls[0], false);
});
```

Also test wrong bearer token, body over 64 KiB, malformed JSON, stale frame, duplicate action, gesture timeout, heartbeat timeout, and input after `runRecorded(3)`.

- [ ] **Step 2: Run the new tests and confirm failure**

Expected: FAIL because the IPC and adapter modules do not exist.

- [ ] **Step 3: Implement one-command HTTP transport**

`startDriverIpcServer()` must call:

```js
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/v1/command") {
    return json(response, 404, { error: "AI_DRIVER_ROUTE_NOT_FOUND" });
  }
  if (!safeTokenEqual(readBearer(request), token)) {
    return json(response, 401, { error: "AI_DRIVER_UNAUTHORIZED" });
  }
  const command = await readBoundedJson(request, 64 * 1024);
  const result = await dispatchWhitelistedCommand(command);
  return json(response, 200, result);
});
await listen(server, 0, "127.0.0.1");
```

The returned controller exposes:

```js
{
  address: { host: "127.0.0.1", port },
  descriptor: { schemaVersion: 1, sessionId, url, token },
  recordRun(index),
  close(),
  fatalReason(),
}
```

The command switch contains only `ready`, `heartbeat`, `capture`, `visible`, `touchTap`, `touchBegin`, `touchMove`, `touchEnd`, and `touchCancel`. There is no default pass-through.

Wrong token/session, replayed request sequence, duplicate action ID, stale frame, forbidden method, coordinate violation, gesture timeout, heartbeat timeout, and fourth-run input all set a permanent protocol fault through `onFault`; returning an HTTP error alone is insufficient.

- [ ] **Step 4: Implement the browser adapter**

`createBrowserTouchAdapter({ page, cdp, writeAction })` must:

- return screenshot bytes from `page.screenshot({ type: "png" })`;
- use one fixed `page.evaluate()` implementation that extracts `document.body.innerText` and visible interactive elements;
- never accept JavaScript from a request;
- use `page.touchscreen.tap(x, y)` for taps;
- use runner-owned `cdp.send("Input.dispatchTouchEvent", ...)` for begin/move/end/cancel;
- write one action audit record after each attempted touch.

The visible-control projection is:

```js
return {
  text: document.body.innerText,
  controls: [...document.querySelectorAll(
    "button,a,input,select,textarea,[role=button],[tabindex]",
  )].filter(isVisible).map((element, index) => ({
    controlId: `control-${index + 1}`,
    label: element.innerText || element.getAttribute("aria-label") || "",
    enabled: !element.matches(":disabled,[aria-disabled=true]"),
    rect: rectOf(element),
  })),
};
```

- [ ] **Step 5: Run IPC tests and commit**

```powershell
node --test tests/integration/ai-driver-state.test.mjs tests/integration/ai-driver-ipc.test.mjs
git add -- games/wechat-h5-v2/tools/ai-playtest/driver-ipc-server.mjs games/wechat-h5-v2/tools/ai-playtest/browser-touch-adapter.mjs games/wechat-h5-v2/tests/integration/ai-driver-ipc.test.mjs
git commit -m "feat(games): expose visible-only AI touch IPC"
```

Expected: all protocol and transport tests PASS.

## Task 5: Integrate IPC, action auditing, and three-run locks into the runner

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/action-audit-log.mjs`
- Modify: `games/wechat-h5-v2/tools/run-ai-playtest-session.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs`

- [ ] **Step 1: Write runner integration tests**

Add tests that assert:

```js
it("publishes a private descriptor and hashes a closed action log", async () => {
  const evidence = await captureWithFakeBrowser({
    commands: threeCompletedRunCommands(),
  });
  assert.equal(evidence.driver.protocol, "loopback-whitelist-v1");
  assert.equal(evidence.driver.fatalReason, null);
  assert.match(evidence.evidenceSha256["session-actions.jsonl"], /^[a-f0-9]{64}$/u);
  assert.equal(await pathExists(evidence.driver.descriptorPath), false);
});

it("marks the cell incomplete after driver disconnect or a fourth-run request", async () => {
  for (const scenario of ["disconnect", "fourth-run"]) {
    const evidence = await captureWithFakeBrowser({ scenario });
    assert.equal(evidence.status, "INCOMPLETE");
    assert.match(evidence.diagnostics.terminalErrors.join("|"), /AI_DRIVER_/u);
  }
});
```

- [ ] **Step 2: Implement an exclusive JSONL action writer**

```js
export async function createActionAuditLog(target) {
  const handle = await open(target, "wx");
  let closed = false;
  return {
    async write(record) {
      if (closed) throw new Error("AI_DRIVER_ACTION_LOG_CLOSED");
      await handle.write(`${JSON.stringify(record)}\n`);
      await handle.sync();
    },
    async close() {
      if (!closed) await handle.close();
      closed = true;
    },
  };
}
```

Never write the bearer token, raw HTML, storage, page globals, or CDP payload responses into this log.

- [ ] **Step 3: Wire the driver into capture**

Extend runner options:

```js
{
  driverDescriptorPath,
  draftOutput,
  invalidRoot,
  driverEnabled: true,
}
```

Generate `sessionId = randomUUID()` and `token = randomBytes(32).toString("hex")`. Start the IPC after page creation and before navigation. Publish the descriptor with `flag: "wx"` in the caller-supplied temporary path; remove it in `finally`. `draftOutput` must be outside `options.output`, and `invalidRoot` must not be inside the formal matrix round directory.

For lifecycle transitions:

```js
if (transition.type === "start") {
  await publishStartScreenshot(transition.run.index, {
    fullPage: false,
    expectedSize: { width: 390, height: 844 },
  });
  driver.recordRunStarted(transition.run.index, transition.run.runId);
}
if (transition.type === "end") {
  driver.closeActions();
  await page.waitForTimeout(1_000);
  await publishResultScreenshot(transition.run.index, {
    fullPage: false,
    expectedSize: { width: 390, height: 844 },
  });
  await publishEventLog(transition.run);
  driver.recordRun(transition.run.index);
  if (transition.run.index < 3) driver.openReplayWindow();
}
```

After run 3, keep actions closed. Poll `driver.fatalReason()` with telemetry; any fatal reason records a terminal error. Include this in evidence:

```js
driver: {
  protocol: "loopback-whitelist-v1",
  sessionId,
  descriptorPath: null,
  fatalReason,
  heartbeatIntervalMs: 2_000,
  disconnectMs: 10_000,
  gestureLeaseMs: 2_000,
},
executionTrust: "local-audited",
entryScreenshotPath: "entry.png",
actionLogPath: "session-actions.jsonl",
tracePath: "session-trace.zip",
```

Publish `session-evidence.json` last. For `CAPTURED`, publish the draft at `draftOutput`, never at `<output>/report-draft.json`. For `INCOMPLETE`, do not create a draft; call `quarantineIncompleteSession({ output, invalidRoot, sessionId })` after the evidence file is durable, then throw an error containing the returned `invalidOutput` path.

- [ ] **Step 4: Run runner, IPC, and lifecycle tests**

```powershell
node --test tests/integration/ai-playtest-session.test.mjs tests/integration/ai-driver-state.test.mjs tests/integration/ai-driver-ipc.test.mjs
```

Expected: all tests PASS; the test fixture contains one action log and no descriptor or token.

- [ ] **Step 5: Commit the integrated runner**

```powershell
git add -- games/wechat-h5-v2/tools/ai-playtest/action-audit-log.mjs games/wechat-h5-v2/tools/run-ai-playtest-session.mjs games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs
git commit -m "feat(games): record restricted AI playtest actions"
```

## Task 6: Strictly parse PNG and ZIP evidence

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/png-evidence.mjs`
- Create: `games/wechat-h5-v2/tools/ai-playtest/zip-evidence.mjs`
- Create: `games/wechat-h5-v2/tests/integration/ai-evidence-primitives.test.mjs`

- [ ] **Step 1: Write malformed PNG and ZIP tests**

Tests must reject:

```js
it.each([
  ["1x1 placeholder", makePng({ width: 1, height: 1 })],
  ["bad crc", corruptChunk(makePng({ width: 390, height: 844 }))],
  ["missing IEND", withoutIend(makePng({ width: 390, height: 844 }))],
  ["oversized", Buffer.alloc(8 * 1024 * 1024 + 1)],
])("rejects %s PNG evidence", async (_label, bytes) => {
  await assert.rejects(validatePngEvidence(bytes, "entry.png"), /AI_PLAYTEST_PNG_/u);
});

it.each([
  ["duplicate entry", zipWithDuplicateEntry()],
  ["path traversal", makeZip({ "../trace.trace": "{}\n" })],
  ["encrypted", makeZip({}, { encrypted: true })],
  ["data descriptor", makeZip({}, { dataDescriptor: true })],
  ["ratio bomb", makeZip({ "trace.trace": Buffer.alloc(2_000_000) })],
])("rejects %s ZIP evidence", (_label, bytes) => {
  assert.throws(() => readBoundedZip(bytes), /AI_PLAYTEST_ZIP_/u);
});
```

- [ ] **Step 2: Verify current validators fail the stronger cases**

Run:

```powershell
node --test tests/integration/ai-evidence-primitives.test.mjs
```

Expected: FAIL because strict parsers are absent.

- [ ] **Step 3: Implement full PNG chunk and decode validation**

Public contract:

```text
validatePngEvidence(
  bytes,
  relativePath,
  { width = 390, height = 844, maxBytes = 8388608 }
) → Promise<{ width, height, decodedBytes }>
```

Implementation requirements:

1. Verify signature.
2. Iterate every chunk with bounded length.
3. Recompute CRC32 over `type + data`.
4. Require exactly one 13-byte IHDR before IDAT and exactly one terminal IEND.
5. Require exact 390×844 dimensions.
6. Call `sharp(bytes).raw().toBuffer()` to force complete pixel decode.
7. Reject empty decoded pixels and trailing bytes after IEND.

- [ ] **Step 4: Implement bounded ZIP extraction**

Public contract:

```text
readBoundedZip(bytes, {
  maxEntries = 10000,
  maxEntryBytes = 134217728,
  maxTotalBytes = 268435456,
  maxCompressionRatio = 100
}) → Map<safePosixEntryName, Buffer>
```

Parse EOCD, central directory, and matching local headers. Reject multi-disk/ZIP64, encrypted entries, bit-3 data descriptors, methods other than stored/deflate, raw or POSIX-normalized duplicate names, absolute paths, backslashes, `.`/`..` segments, central-directory Unix symlink modes, CRC mismatch, size mismatch, overlap, abnormal ratio, entry overflow, and total overflow. Use `inflateRawSync` only after compressed and declared sizes pass bounds.

- [ ] **Step 5: Run primitive tests and commit**

```powershell
node --test tests/integration/ai-evidence-primitives.test.mjs
git add -- games/wechat-h5-v2/tools/ai-playtest/png-evidence.mjs games/wechat-h5-v2/tools/ai-playtest/zip-evidence.mjs games/wechat-h5-v2/tests/integration/ai-evidence-primitives.test.mjs
git commit -m "feat(games): strictly parse playtest PNG and ZIP evidence"
```

Expected: all malformed evidence is rejected and a real 390×844 Playwright PNG passes.

## Task 7: Validate real Playwright trace, production telemetry, action log, and session evidence

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/playwright-trace-evidence.mjs`
- Create: `games/wechat-h5-v2/tools/ai-playtest/session-evidence-validator.mjs`
- Create: `games/wechat-h5-v2/tests/helpers/ai-playtest-evidence-fixture.mjs`
- Create: `games/wechat-h5-v2/tests/integration/ai-session-evidence.test.mjs`

- [ ] **Step 1: Create a real Playwright trace fixture in the test**

The positive test must launch Chromium, navigate to a local HTTP fixture, tap a visible button, and save a trace:

```js
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await context.tracing.start({ screenshots: false, snapshots: true, sources: false });
const page = await context.newPage();
await page.goto(server.url);
await page.touchscreen.tap(100, 100);
await context.tracing.stop({ path: tracePath });
await browser.close();
await validatePlaywrightTrace(await readFile(tracePath), {
  entryUrl: server.url,
  startedAt,
  finishedAt,
});
```

Put this real-trace builder, the 390×844 PNG builder, complete production event builder, action JSONL builder, captured session builder, and formal report builder in `tests/helpers/ai-playtest-evidence-fixture.mjs`. All later report and delivery tests import this helper; do not maintain separate “valid” fixtures with weaker schemas.

Negative tests remove context-options, change the origin, truncate JSONL, move timestamps outside the session, add duplicate ZIP entries, and replace the real trace with the old four-file synthetic ZIP.

- [ ] **Step 2: Write session cross-binding tests**

Construct one valid `CAPTURED` session and then mutate, one case at a time:

- source finish commit differs;
- served-dist aggregate differs;
- URL is not the exact 127.0.0.1:4173 game path;
- sessionId/gameId/runId differs between session, events, action log, and report;
- event lacks `schemaVersion`, `eventId`, `sessionId`, `gameId`, `seq`, or `payload`;
- action IDs repeat, frameSeq decreases, gesture remains open, or a successful action appears after run 3;
- status is `INCOMPLETE`;
- required evidence hash is missing.

Expected failure prefix: `AI_PLAYTEST_SESSION_EVIDENCE_`.

- [ ] **Step 3: Implement trace parsing**

Public contract:

```text
validatePlaywrightTrace(bytes, { entryUrl, startedAt, finishedAt })
  → Promise<{ entryNames, recordCount, networkRecordCount, resourceCount }>
```

Use `readBoundedZip`. Parse every non-empty line in `trace.trace` and `trace.network` as JSON. Parse `trace.stacks` as one JSON object and require non-empty `files` and `stacks` arrays. Require a `context-options` record, page/navigation records, the exact entry origin/path, and at least one referenced `resources/*` body. Map monotonic trace times through `context-options.wallTime`/`monotonicTime`; require the derived trace window to cover all three production run event windows and to fall within five seconds of the session start/finish. Reject network origins other than `http://127.0.0.1:4173`, `data:`, and `blob:`.

- [ ] **Step 4: Implement session and action validation**

Public contract:

```text
validateCapturedSessionEvidence({ session, report, evidenceByPath })
  → Promise<{ sessionId, runIds, derivedRuns, evidencePaths }>
```

The implementation must:

- require `CAPTURED`, schema version, `local-audited`, exact URL, stable source/dist, and no terminal errors;
- validate canonical `entry.png`, `session-actions.jsonl`, and `session-trace.zip`;
- validate every production event field and recompute outcome/input/payoff;
- parse JSONL action records, enforce unique IDs/sequences/frame order/coordinate bounds/gesture pairing/run closure;
- require each run's first successful `touchTap`, `touchBegin`, or `touchEnd` to occur no later than the production `first_input`, with `first_input.clientAt - action.executedAt` between 0 and 2,000 ms;
- cross-bind sessionId, gameId, runId, round, reviewer role, build commit, three runs, and all hashes to the report.

- [ ] **Step 5: Run evidence tests and commit**

```powershell
node --test tests/integration/ai-evidence-primitives.test.mjs tests/integration/ai-session-evidence.test.mjs
git add -- games/wechat-h5-v2/tools/ai-playtest/playwright-trace-evidence.mjs games/wechat-h5-v2/tools/ai-playtest/session-evidence-validator.mjs games/wechat-h5-v2/tests/helpers/ai-playtest-evidence-fixture.mjs games/wechat-h5-v2/tests/integration/ai-session-evidence.test.mjs
git commit -m "feat(games): validate captured playtest sessions"
```

## Task 8: Bind formal reports and matrices to canonical session evidence

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest/formal-evidence-set.mjs`
- Modify: `games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs`
- Modify: `games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/ai-playtest-evidence.test.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/score-ai-playtests.test.mjs`

- [ ] **Step 1: Upgrade the positive report fixture**

Every valid formal report must include:

```js
sessionId: sessionEvidence.sessionId,
sessionEvidencePath: "session-evidence.json",
sessionEvidenceSha256: sha256(sessionEvidenceBytes),
entryScreenshotPath: "entry.png",
entryScreenshotSha256: sha256(entryBytes),
actionLogPath: "session-actions.jsonl",
actionLogSha256: sha256(actionLogBytes),
tracePath: "session-trace.zip",
traceSha256: sha256(traceBytes),
evidenceSha256: {
  "session-evidence.json": sha256(sessionEvidenceBytes),
  "entry.png": sha256(entryBytes),
  "session-actions.jsonl": sha256(actionLogBytes),
  "session-trace.zip": sha256(traceBytes),
  // six run PNGs and three event logs
},
```

Each run keeps `tracePath: "session-trace.zip"` for compatibility. Add negative tests for any alternate trace name, missing top-level evidence, wrong session hash, `INCOMPLETE`, 1×1 PNG, synthetic trace, missing production event field, and report/session mismatch.

- [ ] **Step 2: Replace permissive path collection and validators**

Create the shared pure module, re-export its function from the report validator, and use it everywhere:

```js
export function referencedEvidencePaths(report) {
  return [...new Set([
    report.sessionEvidencePath,
    report.entryScreenshotPath,
    report.actionLogPath,
    report.tracePath,
    ...report.runs.flatMap((run) => [
      ...run.screenshotPaths,
      run.eventLogPath,
    ]),
  ])];
}
```

Require the four top-level paths to equal their canonical filenames. Require every `run.tracePath` to equal the top-level trace path. Require the exact entry URL:

```js
const expected = `http://127.0.0.1:4173/${report.gameId}/`;
if (report.entryUrl !== expected) errors.push(`entryUrl must equal ${expected}`);
```

Require each dedicated top-level SHA-256 field to equal the same path's entry in `evidenceSha256`; this prevents two competing hash declarations.

Delete the old shallow `validatePng`, `validateTraceZip`, and incomplete event validation. `validateReportEvidenceFiles` reads all referenced bytes, verifies hashes, then calls `validateCapturedSessionEvidence`.

- [ ] **Step 3: Add matrix-level session uniqueness**

The matrix result gains:

```js
sessionIds: reports.map(({ report }) => report.sessionId).sort(),
```

Reject duplicate session IDs and include `sessionIds` in the generated matrix hash contract.

- [ ] **Step 4: Run report, matrix, and scoring tests**

```powershell
node --test tests/integration/ai-playtest-evidence.test.mjs tests/integration/score-ai-playtests.test.mjs tests/integration/ai-session-evidence.test.mjs
```

Expected: valid real fixtures PASS; every synthetic-evidence mutation FAILS.

- [ ] **Step 5: Commit the formal report contract**

```powershell
git add -- games/wechat-h5-v2/tools/ai-playtest/formal-evidence-set.mjs games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs games/wechat-h5-v2/tests/integration/ai-playtest-evidence.test.mjs games/wechat-h5-v2/tests/integration/score-ai-playtests.test.mjs
git commit -m "fix(games): bind playtest reports to captured sessions"
```

## Task 9: Package every canonical evidence file and clarify trust semantics

**Files:**
- Modify: `games/wechat-h5-v2/tools/ai-playtest/formal-evidence-set.mjs`
- Modify: `games/wechat-h5-v2/tools/verify-delivery.mjs`
- Modify: `games/wechat-h5-v2/tools/export-git-snapshot.mjs`
- Modify: `games/wechat-h5-v2/tools/build-delivery.ps1`
- Modify: `games/wechat-h5-v2/delivery-allowlist.json`
- Modify: `games/wechat-h5-v2/tests/integration/delivery-security.test.mjs`

- [ ] **Step 1: Replace synthetic delivery fixtures with strict valid evidence**

Use the same real trace/session fixture helper as Task 7. Assert the packaged cell contains exactly:

```js
[
  "action-ricochet-crew/entry.png",
  "action-ricochet-crew/report.json",
  "action-ricochet-crew/session-actions.jsonl",
  "action-ricochet-crew/session-evidence.json",
  "action-ricochet-crew/session-trace.zip",
  // three start PNGs, three result PNGs, three event logs
]
```

Add negative tests for an unreferenced draft, renamed trace, 128 MiB + 1 byte trace, 1 GiB + 1 byte aggregate, missing session evidence, and any legacy `authenticated` field or “AUTHENTICATED DELIVERY” wording.

Add one repository-level allowlist test that loads the real `delivery-allowlist.json`, expands every `files`, `runtimePaths`, `reports`, `documentation`, and single-report selector at `HEAD`, and fails if a configured path does not exist. The valid documentation set must include `ai-playtest-runbook.md` and `ai-player-prompts.md`; remove any selector for a document that is not present at the tested commit.

- [ ] **Step 2: Derive package files from the report reference function**

In `assertPackagedReports`, replace the per-run list with:

```js
for (const evidencePath of referencedEvidencePaths(report)) {
  expectedBaselineFiles.add(path.posix.join(reportDirectory, evidencePath));
}
```

Count trace bytes by canonical report references, not by a free-form extension. Assert each report references exactly one `session-trace.zip`.

Add and share this pure contract between exporter and verifier:

```text
assertReferencedTraceLimits({
  reports,
  sizeByPackagePath,
  maxTraceBytes = 134217728,
  maxTotalTraceBytes = 1073741824
}) → { traceCount, totalTraceBytes }
```

It derives every trace path from the canonical report reference set, rejects a missing size, counts each package path once, applies both limits, and cannot be bypassed by changing an extension.

- [ ] **Step 3: Add explicit trust fields**

Return:

```js
return {
  packageAuthenticated,
  executionTrust: "local-audited",
  independentlyAttested: false,
  packageCommit: manifest.packageCommit,
  testedSourceCommit: manifest.testedSourceCommit,
  fileCount: manifest.files.length,
};
```

Remove the legacy `authenticated` return field. Update the Node CLI and `build-delivery.ps1` output to say `PACKAGE_AUTHENTICATED`, `EXECUTION_TRUST=local-audited`, and `INDEPENDENTLY_ATTESTED=false`; never print “playtest authenticated” or “AUTHENTICATED DELIVERY”. The trust values are derived by verification and are not accepted from package self-declaration. Add the same explanatory trust object to `delivery-manifest.json`, while documenting that the generated manifest is verification metadata rather than a Git blob.

- [ ] **Step 4: Run delivery tests**

```powershell
node --test tests/integration/delivery-security.test.mjs
```

Expected: all positive delivery cases PASS and all forged/unreferenced/oversized cases FAIL.

- [ ] **Step 5: Commit delivery binding**

```powershell
git add -- games/wechat-h5-v2/tools/ai-playtest/formal-evidence-set.mjs games/wechat-h5-v2/tools/verify-delivery.mjs games/wechat-h5-v2/tools/export-git-snapshot.mjs games/wechat-h5-v2/tools/build-delivery.ps1 games/wechat-h5-v2/delivery-allowlist.json games/wechat-h5-v2/tests/integration/delivery-security.test.mjs
git commit -m "fix(games): package canonical playtest evidence"
```

## Task 10: Add the operator CLI and heartbeat keeper

**Files:**
- Create: `games/wechat-h5-v2/tools/ai-playtest-driver-cli.mjs`
- Create: `games/wechat-h5-v2/tools/ai-playtest-heartbeat.mjs`
- Create: `games/wechat-h5-v2/tests/integration/ai-driver-cli.test.mjs`
- Modify: `docs/wechat-h5-v2/ai-player-prompts.md`
- Modify: `docs/wechat-h5-v2/ai-playtest-runbook.md`
- Modify: `docs/wechat-h5-v2/ai-playtest-method.md`
- Modify: `docs/wechat-h5-v2/README.md`
- Modify: `docs/wechat-h5-v2/release-checklist.md`

- [ ] **Step 1: Write CLI tests against a fake IPC server**

Test exact commands:

```powershell
node tools/ai-playtest-driver-cli.mjs --descriptor <file> ready
node tools/ai-playtest-driver-cli.mjs --descriptor <file> capture --out <png>
node tools/ai-playtest-driver-cli.mjs --descriptor <file> visible
node tools/ai-playtest-driver-cli.mjs --descriptor <file> tap --x 195 --y 730 --frame 4
node tools/ai-playtest-driver-cli.mjs --descriptor <file> begin --x 195 --y 730 --frame 5
node tools/ai-playtest-driver-cli.mjs --descriptor <file> move --gesture <id> --x 195 --y 790
node tools/ai-playtest-driver-cli.mjs --descriptor <file> end --gesture <id> --x 195 --y 790
```

Assert `capture` writes a PNG only to the requested temporary path, CLI output never prints the token, and malformed coordinates/actions exit nonzero.

- [ ] **Step 2: Implement the one-shot CLI**

The CLI and heartbeat process both call one shared `allocateRequestSequence()` helper. It atomically creates `<descriptor>.sequence.lock` with `mkdir(..., { recursive: false })`, reads the integer sidecar, writes `current + 1` through a same-directory temporary file, renames it while holding the lock, then removes the lock in `finally`. This serializes heartbeat and action requests across processes. The runner removes the sequence sidecar and abandoned lock during final cleanup. The CLI creates a UUID action ID, POSTs to `/v1/command`, and prints JSON without token. `capture` decodes `pngBase64` and writes `--out` with `flag: "wx"`.

- [ ] **Step 3: Implement the heartbeat keeper**

The heartbeat process:

```js
const timer = setInterval(sendHeartbeat, 2_000);
timer.unref();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    clearInterval(timer);
    await sendDisconnectNotice().catch(() => {});
    process.exit(0);
  });
}
await new Promise(() => {});
```

It prints only `AI_DRIVER_HEARTBEAT_READY session=<sessionId> pid=<pid>`. It never performs game actions and exits nonzero after two consecutive heartbeat failures.

- [ ] **Step 4: Update the Chinese operating documents**

Document:

- exact descriptor and heartbeat startup;
- screenshot → inspect → visible → touch decision loop;
- only `capture`, `visible`, and touch commands are allowed;
- no debug, CDP, evaluate, storage, seed, speed, or solver;
- wait for `runRecorded(N)` before replay;
- stop after run 3;
- draft promotion fields and canonical evidence list;
- local-audited versus independently-attested boundary.
- `README.md` and `release-checklist.md` remain `NOT EXECUTED` until the real three-run pilot passes.

- [ ] **Step 5: Run CLI tests and commit**

```powershell
node --test tests/integration/ai-driver-cli.test.mjs tests/integration/ai-driver-ipc.test.mjs
git add -- games/wechat-h5-v2/tools/ai-playtest-driver-cli.mjs games/wechat-h5-v2/tools/ai-playtest-heartbeat.mjs games/wechat-h5-v2/tests/integration/ai-driver-cli.test.mjs docs/wechat-h5-v2/ai-player-prompts.md docs/wechat-h5-v2/ai-playtest-runbook.md docs/wechat-h5-v2/ai-playtest-method.md docs/wechat-h5-v2/README.md docs/wechat-h5-v2/release-checklist.md
git commit -m "docs(games): add trusted AI driver workflow"
```

## Task 11: Run the complete automated gate and freeze the pilot build

**Files:**
- Modify only if a test exposes a defect in an owned file from Tasks 1–10.

- [ ] **Step 1: Run syntax, types, unit, integration, delivery, and browser gates**

```powershell
Set-Location 'C:\Users\z3635\官网改动\games\wechat-h5-v2'
node --check tools/run-ai-playtest-session.mjs
node --check tools/ai-playtest-driver-cli.mjs
npm.cmd run typecheck
npm.cmd run test
node --test tests/integration/ai-playtest-session.test.mjs
node --test tests/integration/delivery-security.test.mjs
npm.cmd run verify
git diff --check -- games/wechat-h5-v2 docs/wechat-h5-v2
```

Expected:

- all Node syntax checks PASS;
- TypeScript PASS;
- every Vitest and Node test PASS;
- Chromium/WebKit E2E 8/8 PASS or higher if new E2E cases were added;
- no scoped diff errors.

- [ ] **Step 2: Audit the exact baseline paths**

```powershell
git status --short -- games/wechat-h5-v2 docs/wechat-h5-v2
git diff --name-only -- games/wechat-h5-v2 docs/wechat-h5-v2
git diff --cached --name-only
```

Expected: only intended trusted-playtest files are uncommitted; unrelated repository changes are absent from the staged set.

- [ ] **Step 3: Commit the verified pilot baseline**

Stage only the remaining intended files listed by Step 2, then:

```powershell
git commit -m "feat(games): secure AI playtest evidence loop"
git rev-parse HEAD
```

Record the complete 40-character SHA as `PILOT_COMMIT`. Do not use `b67e513...` or `3b80730...` as the tested build.

## Task 12: Execute the real casual Ricochet three-run pilot

**Files:**
- Generate outside the dirty source tree first: `C:\ai-playtests\<PILOT_COMMIT>\pilot\casual-ricochet-crew\`
- After validation, copy only the approved pilot report to the documented pilot evidence location; do not place it in the baseline 18-cell matrix.

- [ ] **Step 1: Create a clean detached worktree and verify the fixed commit**

```powershell
$Repo = 'C:\Users\z3635\官网改动'
$Commit = (git -C $Repo rev-parse HEAD).Trim()
$Worktree = "C:\ai-playtest-worktrees\$Commit"
$Evidence = "C:\ai-playtests\$Commit\pilot\casual-ricochet-crew"
$InvalidRoot = "C:\ai-playtests\$Commit\invalid"
$Draft = "C:\ai-playtests\$Commit\drafts\casual-ricochet-crew-report-draft.json"
$Descriptor = Join-Path $env:TEMP "ai-driver-$Commit.json"

git -C $Repo worktree add --detach $Worktree $Commit
Set-Location "$Worktree\games\wechat-h5-v2"
npm.cmd ci
npm.cmd run verify
New-Item -ItemType Directory -Force -Path (Split-Path $Evidence),$InvalidRoot,(Split-Path $Draft) | Out-Null
```

Expected: detached HEAD equals `PILOT_COMMIT`, game source is clean, and verify passes.

- [ ] **Step 2: Start the single dist service and runner**

Start only one confirmed 4173 service:

```powershell
$env:PORT = '4173'
node tools/assets/serve-dist.mjs
```

Start the runner for:

```powershell
node tools/run-ai-playtest-session.mjs `
  --round baseline `
  --reviewer casual `
  --game ricochet-crew `
  --expected-commit $Commit `
  --output $Evidence `
  --driver-descriptor $Descriptor `
  --draft-output $Draft `
  --invalid-root $InvalidRoot `
  --timeout-ms 2100000
```

Expected: descriptor appears, URL is exactly `http://127.0.0.1:4173/ricochet-crew/`, and no test/debug global is exposed.

- [ ] **Step 3: Start heartbeat and let the casual AI player operate from visible evidence**

```powershell
node tools/ai-playtest-heartbeat.mjs --descriptor $Descriptor
```

For every decision, the AI employee must:

1. run `capture --out <new temporary PNG>`;
2. inspect that PNG;
3. optionally run `visible`;
4. choose a touch based only on visible evidence;
5. wait for the action response and new frame;
6. complete exactly three natural runs, using retry for run 2 and fresh layout for run 3.

No fixed action loop, debug, CDP, evaluate, localStorage, seed, speed, or source-derived target position is permitted.

- [ ] **Step 4: Finalize and validate the subjective report**

Read `$Draft`, fill the casual-player scores and comments, then write canonical `$Evidence\report.json` with:

```json
{
  "draftOnly": false,
  "evidenceOnly": false,
  "subjectiveScoresGenerated": true,
  "claimsActualPlay": true,
  "interactionMode": "browser-touch"
}
```

Move the draft outside the cell and run:

```powershell
node tools/validate-ai-playtest-report.mjs "$Evidence\report.json"
```

Expected: PASS with exactly three unique run IDs, valid session/action/trace hashes, and no unreferenced file.

- [ ] **Step 5: Run the pilot abuse checks**

Against a disposable pilot attempt, verify wrong token, `evaluate`, stale frame, duplicate action, driver disconnect, and fourth-run requests all fail; the disposable attempt must end `INCOMPLETE` and remain outside the valid pilot cell.

- [ ] **Step 6: Record the pilot decision**

Write a machine-readable verification result containing:

```json
{
  "exitCode": 0,
  "summary": { "pass": 1, "fail": 0 },
  "gameId": "ricochet-crew",
  "reviewerRole": "casual",
  "runs": 3,
  "traceUnder128MiB": true,
  "packageAuthenticated": false,
  "executionTrust": "local-audited",
  "independentlyAttested": false
}
```

Only after this record and the report validator pass may the supervisor schedule the 18-cell/54-run matrix.

## Task 13: Final self-review before matrix expansion

**Files:**
- Review: `docs/superpowers/specs/2026-07-29-trusted-ai-playtest-driver-design.md`
- Review: all files changed in Tasks 1–12

- [ ] **Step 1: Verify spec coverage**

Confirm each design section maps to a completed task:

- atomic output and cleanup: Tasks 1–2;
- whitelist IPC and touch-only control: Tasks 3–5;
- PNG/ZIP/trace/session verification: Tasks 6–8;
- package evidence and trust wording: Task 9;
- operator workflow: Task 10;
- fixed build and real pilot: Tasks 11–12.

- [ ] **Step 2: Scan implementation and docs for forbidden ambiguity**

```powershell
rg -n "T.B.D|T.O.D.O|authenticated playtest|试玩已认证|independentlyAttested.:.true|evidence-review" games/wechat-h5-v2 docs/wechat-h5-v2
```

Expected: no placeholder or false execution-authentication claim; `evidence-review` is not accepted by the formal matrix.

- [ ] **Step 3: Produce the matrix-expansion handoff**

The handoff must contain the fixed tested SHA, pilot report path/hash, exact CLI commands, invalid-attempt count, trace size, all automated gate counts, and the explicit production boundary:

```text
真实目标用户测试：NOT EXECUTED
微信开发者工具/真机：NOT EXECUTED
HTTPS 生产域名：NOT EXECUTED
微信生产上线：NO-GO
第三方独立执行签名：NOT EXECUTED
```

No 54-run work starts if any item is missing.
