# Codex Turn Start Notification Buffer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stale notifications from a previous Turn from claiming a newly starting Run while preserving legitimate notifications that arrive before `turn/start` responds.

**Architecture:** `RunManager` will keep a bounded, in-memory notification buffer on each Active Run while `turn/start` is pending. The response Turn ID is authoritative; after it is persisted and registered, matching buffered notifications are replayed in order and mismatched Turn notifications are discarded with a count-only diagnostic event.

**Tech Stack:** Node.js ESM, EventEmitter, `node:test`, SQLite, Codex App Server JSONL protocol.

---

## File Structure

- Modify `workbench/lib/run-manager.mjs`: own startup buffer state, bounded buffering, authoritative Turn adoption, replay, diagnostics, and cleanup.
- Modify `test/workbench/thread-isolation.test.mjs`: cover stale previous-Turn notifications during sequential Requirement Thread reuse.
- Modify `test/workbench/run-control.test.mjs`: cover matching early completion, ordering, overflow, cleanup, and all three Run entry points.
- Modify `package.json`: expose the existing real integration verifier as `workbench:verify-real`.
- Validate and commit the existing untracked `tools/verify-personal-codex-workbench-real.mjs`: retain the API-level real Codex verifier created during diagnosis.
- Update `test-results/personal-codex-workbench/real-integration-results.json`: archive the successful real integration report.

### Task 1: Lock the stale-Turn regression with a failing test

**Files:**
- Modify: `test/workbench/thread-isolation.test.mjs`
- Test: `test/workbench/thread-isolation.test.mjs`

- [ ] **Step 1: Give the protocol fake a pre-response notification hook**

Add the field and invoke it after the fake has allocated the response Turn ID but before `request()` returns:

```js
class RecordingCodex extends EventEmitter {
  calls = [];
  onTurnStart = null;
  resumeErrors = new Map();
  startCalls = 0;
  threadCount = 0;
  turnCount = 0;

  async start() {
    this.startCalls += 1;
  }

  async request(method, params) {
    this.calls.push({ method, params });
    if (method === 'thread/start') {
      return { thread: { id: `thread-${++this.threadCount}` } };
    }
    if (method === 'thread/resume') {
      const error = this.resumeErrors.get(params.threadId);
      if (error) throw error;
      return { thread: { id: params.threadId } };
    }
    if (method === 'turn/start') {
      const turn = {
        id: `turn-${++this.turnCount}`,
        items: [],
        status: 'inProgress',
      };
      if (this.onTurnStart) {
        await this.onTurnStart({
          codex: this,
          params,
          threadId: params.threadId,
          turnId: turn.id,
        });
      }
      return { turn };
    }
    throw new Error(`Unexpected method ${method}`);
  }

  pid() {
    return 8123;
  }
}
```

- [ ] **Step 2: Add a sequential same-Thread regression test**

The first two Workflows establish and complete `turn-1` and `turn-2`. The third Workflow then receives a late `turn-2` delta before its own `turn-3` response, followed by valid early `turn-3` content and completion:

```js
test('a stale previous-Turn notification cannot claim the next Run on the same Thread', async t => {
  const { codex, manager, store } = createFixture(t);
  const first = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: '第一次反馈' },
  });
  emitCompleted(codex, first, JSON.stringify(validFeedbackResult));
  assert.equal(store.getRun(first.id).status, 'completed');

  const second = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: '第二次反馈' },
  });
  emitCompleted(codex, second, JSON.stringify(validFeedbackResult));
  assert.equal(store.getRun(second.id).status, 'completed');

  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'STALE',
        itemId: 'stale-agent',
        threadId,
        turnId: second.turnId,
      },
    });
    emitCompleted(
      sender,
      { threadId, turnId },
      JSON.stringify(validFeedbackResult),
    );
  };

  const third = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: '第三次反馈' },
  });

  assert.equal(third.status, 'completed');
  assert.notEqual(third.turnId, second.turnId);
  assert.deepEqual(store.getWorkflowResult(third.id).result, validFeedbackResult);
  assert.equal(store.getRun(third.id).result.includes('STALE'), false);
  assert.deepEqual(
    store.listRunEvents(third.id)
      .filter(event => event.type === 'workbench/stale-turn-notifications-dropped')
      .map(event => event.payload),
    [{ count: 1 }],
  );
});
```

- [ ] **Step 3: Run the regression test and verify the current implementation fails**

Run:

```powershell
node --test test/workbench/thread-isolation.test.mjs
```

Expected before implementation: FAIL with `Codex turn/start response did not match the notification turn id`.

- [ ] **Step 4: Commit the red test only if the repository policy permits red commits**

Preferred execution is to keep the red test unstaged until Task 2 is green. Do not commit a failing default test suite.

### Task 2: Implement authoritative Turn adoption and bounded replay

**Files:**
- Modify: `workbench/lib/run-manager.mjs`
- Modify: `workbench/lib/codex-app-server-client.mjs`
- Test: `test/workbench/thread-isolation.test.mjs`
- Test: `test/workbench/run-control.test.mjs`
- Test: `test/workbench/codex-app-server-client.test.mjs`

- [ ] **Step 1: Add fixed limits and reusable Active Run startup state**

Place these helpers near the existing protocol helpers:

```js
const MAX_PENDING_TURN_NOTIFICATIONS = 512;
const MAX_PENDING_TURN_NOTIFICATION_BYTES = 1_048_576;

function notificationThreadId(message) {
  return safeString(message?.params?.threadId);
}

function notificationTurnId(message) {
  return safeString(message?.params?.turnId)
    || safeString(message?.params?.turn?.id);
}

function turnStartupState() {
  return {
    pendingNotificationBytes: 0,
    pendingNotifications: [],
    staleNotificationCount: 0,
    turnStartPending: false,
  };
}
```

Replace the three Active Run initializers with these complete objects:

```js
// startReadOnlyRun
const active = {
  ...turnStartupState(),
  approvalRegistered: false,
  completedAgentItems: new Set(),
  deltaAgentItems: new Set(),
  finished: false,
  finalized: false,
  processNonce: null,
  processPid: null,
  runId,
  text: '',
  threadId: null,
  turnId: null,
  workflowType: null,
};

// startWorkflowRun
const active = {
  ...turnStartupState(),
  approvalRegistered: false,
  completedAgentItems: new Set(),
  deltaAgentItems: new Set(),
  finished: false,
  finalized: false,
  processNonce: null,
  processPid: null,
  requirementId,
  runId,
  text: '',
  threadId: null,
  turnId: null,
  workflowType,
};

// startWriteRun
const active = {
  ...turnStartupState(),
  approvalRegistered: false,
  completedAgentItems: new Set(),
  deltaAgentItems: new Set(),
  finalized: false,
  finished: false,
  permission: input.permission,
  processNonce: null,
  processPid: null,
  requirementId: input.requirementId,
  runId,
  snapshot,
  stagingRoot,
  targets: targetPaths,
  text: '',
  threadId: null,
  turnId: null,
  workflowType: null,
};
```

- [ ] **Step 2: Add buffer, clear, and replay methods**

Add these private methods to `RunManager`:

```js
#clearTurnStartBuffer(active) {
  if (!active) return;
  active.pendingNotifications = [];
  active.pendingNotificationBytes = 0;
  active.turnStartPending = false;
}

#bufferTurnStartNotification(active, message) {
  let bytes;
  try {
    bytes = Buffer.byteLength(JSON.stringify(message), 'utf8');
  } catch {
    this.#handleStartFailure(
      active.runId,
      active,
      new Error('turn/start notification buffer received non-serializable data'),
    );
    return;
  }
  if (
    active.pendingNotifications.length + 1 > MAX_PENDING_TURN_NOTIFICATIONS
    || active.pendingNotificationBytes + bytes > MAX_PENDING_TURN_NOTIFICATION_BYTES
  ) {
    this.#handleStartFailure(
      active.runId,
      active,
      new Error('turn/start notification buffer exceeded its safety limit'),
    );
    return;
  }
  active.pendingNotifications.push(message);
  active.pendingNotificationBytes += bytes;
}

#replayTurnStartNotifications(active) {
  const buffered = active.pendingNotifications;
  const authoritativeTurnId = active.turnId;
  this.#clearTurnStartBuffer(active);
  let stale = 0;
  for (const message of buffered) {
    if (notificationTurnId(message) !== authoritativeTurnId) {
      stale += 1;
      continue;
    }
    this.#onNotification(message);
  }
  active.staleNotificationCount += stale;
  if (stale > 0) {
    this.store.appendRunEvent(
      active.runId,
      'workbench/stale-turn-notifications-dropped',
      { count: stale },
    );
  }
}
```

- [ ] **Step 3: Centralize all three `turn/start` paths**

Add a private method that sets the pending state before calling Codex, treats the response ID as authoritative, persists it before replay, and supports early completion:

```js
async #startTurn(active, params, pid) {
  active.turnStartPending = true;
  let turnResult;
  try {
    turnResult = await this.#awaitStartup(
      active,
      this.codex.request('turn/start', params),
    );
  } catch (error) {
    this.#clearTurnStartBuffer(active);
    throw error;
  }
  const turnId = protocolId(turnResult, 'turn');
  active.turnId = turnId;
  active.turnStartPending = false;
  this.store.bindProtocolIds(
    active.runId,
    active.threadId,
    turnId,
    pid,
    active.processNonce,
  );
  if (!active.finished) this.activeByTurn.set(turnId, active);
  this.#registerApproval(active);
  this.#replayTurnStartNotifications(active);
  return turnId;
}
```

In `startReadOnlyRun`, replace the direct `turn/start` request, response mismatch check, and duplicate binding with:

```js
await this.#startTurn(active, {
  approvalPolicy: 'never',
  cwd: this.allowedRoot,
  input: [{ type: 'text', text: buildContext(requirement, authorizedFiles, cleanPrompt) }],
  sandboxPolicy: { type: 'readOnly', networkAccess: false },
  threadId,
}, pid);
return this.store.getRun(runId);
```

In `startWorkflowRun`, use the same helper with the Workflow schema:

```js
await this.#startTurn(active, {
  approvalPolicy: 'never',
  cwd: this.allowedRoot,
  input: [{ type: 'text', text: prompt }],
  outputSchema: workflow.outputSchema,
  sandboxPolicy: { type: 'readOnly', networkAccess: false },
  threadId,
}, pid);
return this.store.getRun(runId);
```

In `startWriteRun`, use the staging root and preserve its exact write sandbox:

```js
await this.#startTurn(active, {
  approvalPolicy: 'on-request',
  cwd: stagingRoot,
  input: [{ type: 'text', text: fullPrompt }],
  sandboxPolicy: {
    type: 'workspaceWrite',
    writableRoots: [stagingRoot],
    networkAccess: false,
  },
  threadId,
}, pid);
return this.store.getRun(runId);
```

- [ ] **Step 4: Buffer instead of adopting a notification-side Turn ID**

Replace the current Thread fallback inside `#onNotification`:

```js
const threadId = notificationThreadId(message);
const turnId = notificationTurnId(message);
let active = turnId ? this.activeByTurn.get(turnId) : null;
if (!active && threadId) {
  const starting = this.activeByThread.get(threadId);
  if (
    starting
    && starting.turnStartPending
    && !starting.turnId
    && turnId
    && !starting.finished
  ) {
    this.#bufferTurnStartNotification(starting, message);
  }
  return;
}
```

Do not set `starting.turnId` or `activeByTurn` from a notification.

- [ ] **Step 5: Clear buffered references in every finalization**

Replace `#finalizeActive` so buffer cleanup happens immediately after the idempotency guard:

```js
#finalizeActive(active) {
  if (!active || active.finalized) return;
  active.finalized = true;
  this.#clearTurnStartBuffer(active);
  if (active.timeout) clearTimeout(active.timeout);
  if (this.activeByRun.get(active.runId) === active) {
    this.activeByRun.delete(active.runId);
  }
  if (this.activeByThread.get(active.threadId) === active) {
    this.activeByThread.delete(active.threadId);
  }
  if (active.turnId && this.activeByTurn.get(active.turnId) === active) {
    this.activeByTurn.delete(active.turnId);
  }
  if (active.turnId && active.approvalRegistered) {
    this.approvalManager?.unregisterTurn(active.turnId);
  }
  active.resolveTerminal?.();
  active.resolveTerminal = null;
}
```

This covers success, failure, cancellation, timeout, and App Server request rejection through the existing finalization paths.

- [ ] **Step 6: Finalize every Active Run when the App Server exits**

In the constructor, register the exit listener beside the notification listener:

```js
this.codex.on('notification', message => this.#onNotification(message));
this.codex.on('exit', info => this.#onCodexExit(info));
```

Add this private handler before `#onNotification`:

```js
#onCodexExit({
  code = null,
  current = true,
  processNonce: exitedProcessNonce = null,
  signal = null,
} = {}) {
  if (current === false) return;
  const baseMessage = `Codex App Server exited: code=${code} signal=${signal}`;
  for (const active of [...this.activeByRun.values()]) {
    if (
      active.processNonce
      && exitedProcessNonce
      && active.processNonce !== exitedProcessNonce
    ) {
      continue;
    }
    if (!this.#beginFinalization(active, baseMessage)) continue;
    let message = baseMessage;
    try {
      this.approvalManager?.rejectPendingForRun(active.runId);
    } catch (error) {
      message += `; pending approval cleanup failed: ${error.message}`;
    }
    this.store.finishRun(
      active.runId,
      'failed',
      active.text || null,
      message,
    );
    this.#finalizeActive(active);
  }
}
```

- [ ] **Step 7: Bind client requests and exit events to one child generation**

In `CodexAppServerClient.start`, capture `processNonce`, `child`, and its PID in each listener. Pass `child` into `#receive`, reject only waiters owned by that child, ignore old-child stdout/stderr, and emit the exit identity:

```js
this.child = child;
const processPid = Number.isInteger(child.pid) && child.pid > 0
  ? child.pid
  : null;
const lines = readline.createInterface({ input: child.stdout });
this.lines = lines;
lines.on('line', line => this.#receive(line, child));
child.stderr.on('data', chunk => {
  if (this.child !== child) return;
  const text = chunk.toString('utf8');
  this.stderrText = tail(`${this.stderrText}${text}`);
  this.emit('stderr', text);
});
child.on('error', error => {
  const current = this.child === child;
  if (current) this.#recordLaunchError(error);
  this.#rejectPending(error, child);
  if (current) this.child = null;
  if (this.lines === lines) this.lines = null;
  lines.close();
  this.emit('processError', error, {
    current,
    pid: processPid,
    processNonce,
  });
});
child.on('exit', (code, signal) => {
  const current = this.child === child;
  const error = new Error(`Codex App Server exited: code=${code} signal=${signal}`);
  this.#rejectPending(error, child);
  if (current) this.child = null;
  if (this.lines === lines) this.lines = null;
  lines.close();
  this.emit('exit', {
    code,
    current,
    pid: processPid,
    processNonce,
    signal,
  });
});
```

Capture the request generation and make `stop`, `#rejectPending`, and `#receive` generation-aware:

```js
request(method, params) {
  if (!this.child) return Promise.reject(new Error('Codex App Server is not running'));
  const child = this.child;
  const id = this.nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const waiter = this.pending.get(id);
      if (!waiter) return;
      this.pending.delete(id);
      waiter.reject(
        new Error(`Codex App Server request timed out: ${method}`),
      );
    }, this.requestTimeoutMs);
    this.pending.set(id, {
      child,
      method,
      reject,
      resolve,
      timer,
    });
    try {
      this.#write({ id, method, params });
    } catch (error) {
      this.pending.delete(id);
      clearTimeout(timer);
      reject(error);
    }
  });
}

#rejectPending(error, child) {
  for (const [id, waiter] of this.pending.entries()) {
    if (waiter.child !== child) continue;
    clearTimeout(waiter.timer);
    waiter.reject(error);
    this.pending.delete(id);
  }
}

#receive(line, child) {
  if (this.child !== child) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    this.emit('protocolError', new Error(`Invalid JSONL from App Server: ${line.slice(0, 200)}`));
    return;
  }
  if (Object.hasOwn(message, 'id') && message.method) {
    this.emit('request', message);
    return;
  }
  if (Object.hasOwn(message, 'id')) {
    const waiter = this.pending.get(message.id);
    if (!waiter || waiter.child !== child) return;
    this.pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) {
      const error = new Error(message.error.message || 'App Server request failed');
      error.code = message.error.code;
      error.data = message.error.data;
      waiter.reject(error);
    } else {
      waiter.resolve(message.result);
    }
    return;
  }
  if (message.method) this.emit('notification', message);
}
```

In `stop`, call:

```js
this.#rejectPending(new Error('Codex App Server stopped'), child);
```

Make the fake child PID-configurable:

```js
function fakeProcess({ pid = null } = {}) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killCount = 0;
  child.kill = () => {
    child.killCount += 1;
    return true;
  };
  return child;
}
```

Add these two generation tests:

```js
test('a stopped child late error and exit cannot reject requests from a restarted child', async () => {
  const firstNonce = '1'.repeat(64);
  const secondNonce = '2'.repeat(64);
  const firstChild = fakeProcess({ pid: 7101 });
  const secondChild = fakeProcess({ pid: 7102 });
  const children = [firstChild, secondChild];
  const nonces = [firstNonce, secondNonce];
  const writesByChild = new Map();
  for (const child of children) {
    const writes = [];
    writesByChild.set(child, writes);
    child.stdin.on('data', chunk => {
      const message = JSON.parse(chunk.toString('utf8'));
      writes.push(message);
      if (message.method === 'initialize') {
        child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
      }
    });
  }
  const client = new CodexAppServerClient({
    nonceFactory: () => nonces.shift(),
    spawnProcess: () => children.shift(),
  });
  const exits = [];
  client.on('exit', info => exits.push(info));

  await client.start();
  await client.stop();
  await client.start();
  const request = client.request('thread/start', { cwd: 'C:/current' });
  const observed = request.then(
    value => ({ status: 'fulfilled', value }),
    error => ({ status: 'rejected', error }),
  );
  const currentRequest = writesByChild.get(secondChild)
    .find(message => message.method === 'thread/start');

  firstChild.emit('error', new Error('late old-child error'));
  firstChild.emit('exit', 0, null);
  secondChild.stdout.write(`${JSON.stringify({
    id: currentRequest.id,
    result: { thread: { id: 'thread-current' } },
  })}\n`);

  const outcome = await observed;
  assert.equal(outcome.status, 'fulfilled');
  assert.equal(outcome.value.thread.id, 'thread-current');
  assert.equal(client.diagnostics().running, true);
  assert.equal(client.diagnostics().launchError, '');
  assert.equal(client.nonce(), secondNonce);
  assert.deepEqual(exits, [{
    code: 0,
    current: false,
    pid: 7101,
    processNonce: firstNonce,
    signal: null,
  }]);
  await client.stop();
});

test('current child exit reports process identity and rejects only its requests', async () => {
  const processNonce = '3'.repeat(64);
  const child = fakeProcess({ pid: 7201 });
  const writes = [];
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    writes.push(message);
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
  });
  const client = new CodexAppServerClient({
    nonceFactory: () => processNonce,
    spawnProcess: () => child,
  });
  const exits = [];
  client.on('exit', info => exits.push(info));
  await client.start();

  const pending = client.request('thread/resume', { threadId: 'thread-current' });
  child.emit('exit', 23, 'SIGTERM');

  await assert.rejects(pending, /exited: code=23 signal=SIGTERM/);
  assert.deepEqual(exits, [{
    code: 23,
    current: true,
    pid: 7201,
    processNonce,
    signal: 'SIGTERM',
  }]);
  assert.equal(client.pending.size, 0);
  assert.equal(client.diagnostics().running, false);
});
```

- [ ] **Step 8: Run focused tests**

Run:

```powershell
node --test test/workbench/thread-isolation.test.mjs test/workbench/run-control.test.mjs
node --test test/workbench/codex-app-server-client.test.mjs
```

Expected: all focused tests PASS, including the existing `completion before turn/start returns wins once` test.

- [ ] **Step 9: Commit the core fix**

```powershell
git add -- workbench/lib/run-manager.mjs workbench/lib/codex-app-server-client.mjs `
  test/workbench/thread-isolation.test.mjs `
  test/workbench/codex-app-server-client.test.mjs
git commit -m "fix: buffer notifications until turn start responds"
```

### Task 3: Prove ordering, limits, cleanup, and three-entry-point consistency

**Files:**
- Modify: `test/workbench/run-control.test.mjs`
- Test: `test/workbench/run-control.test.mjs`

Add exact buffer and Active Map cleanup helpers before the new tests:

```js
function assertStartupStateCleared(manager, active) {
  assert.deepEqual(active.pendingNotifications, []);
  assert.equal(active.pendingNotificationBytes, 0);
  assert.equal(active.turnStartPending, false);
  assert.equal(manager.activeByRun.size, 0);
  assert.equal(manager.activeByThread.size, 0);
  assert.equal(manager.activeByTurn.size, 0);
}

function assertStartupStateBuffered(active, count = 1) {
  assert.equal(active.turnStartPending, true);
  assert.equal(active.pendingNotifications.length, count);
  assert.ok(active.pendingNotificationBytes > 0);
}
```

- [ ] **Step 1: Add an ordered early-notification test**

Use the existing `FakeCodex.onTurnStart` hook to emit two matching agent-message deltas and `turn/completed` before the response:

```js
test('matching pre-response notifications replay in order exactly once', async t => {
  const codex = new FakeCodex();
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    for (const [itemId, delta] of [['early-1', 'first'], ['early-2', ' second']]) {
      sender.emit('notification', {
        method: 'item/agentMessage/delta',
        params: { delta, itemId, threadId, turnId },
      });
    }
    sender.emit('notification', {
      method: 'turn/completed',
      params: {
        threadId,
        turn: { id: turnId, items: [], status: 'completed' },
      },
    });
  };
  const { manager, store } = setup(t, { codex });
  const run = await manager.startReadOnlyRun({
    requirementId: 'REQ-1',
    prompt: 'ordered replay',
    files: ['prd/a.md'],
  });
  assert.equal(run.status, 'completed');
  assert.equal(run.result, 'first second');
  assert.deepEqual(
    store.listRunEvents(run.id)
      .filter(event => event.type === 'item/agentMessage/delta')
      .map(event => event.payload.delta),
    ['first', ' second'],
  );
});
```

- [ ] **Step 2: Add count- and byte-limit fail-closed tests**

Count limit:

```js
test('turn startup notification count overflow fails and releases the Run slot', async t => {
  const codex = new FakeCodex();
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    for (let index = 0; index < 513; index += 1) {
      sender.emit('notification', {
        method: 'item/agentMessage/delta',
        params: { delta: 'x', itemId: `item-${index}`, threadId, turnId },
      });
    }
  };
  const { manager, store } = setup(t, { codex });
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-1',
      prompt: 'overflow',
      files: ['prd/a.md'],
    }),
    /turn\/start notification buffer exceeded/,
  );
  assert.equal(store.countActiveRuns(), 0);
});
```

Byte limit:

```js
test('turn startup notification byte overflow fails without persisting the payload', async t => {
  const codex = new FakeCodex();
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'x'.repeat(1_048_577),
        itemId: 'oversized',
        threadId,
        turnId,
      },
    });
  };
  const { manager, store } = setup(t, { codex });
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-1',
      prompt: 'oversized',
      files: ['prd/a.md'],
    }),
    /turn\/start notification buffer exceeded/,
  );
  const [run] = store.listRuns();
  assert.equal(store.listRunEvents(run.id).length, 0);
  assert.equal(store.countActiveRuns(), 0);
});
```

- [ ] **Step 3: Verify all Run entry points use the shared helper**

Add the Workflow catalog helpers to the test imports:

```js
import {
  buildWorkflowPrompt,
  workflowCatalog,
} from '../../workbench/lib/workflow-catalog.mjs';
```

Then add this table-driven test. It validates both buffered behavior and the exact existing `turn/start` parameter contract for each entry point:

```js
test('all Run entry points buffer pre-response notifications and preserve exact turn/start params', async t => {
  const workflowInput = { feedbackText: '启动失败' };
  const cases = [
    {
      name: 'read-only',
      resultText: 'read result',
      start: manager => manager.startReadOnlyRun({
        requirementId: 'REQ-1',
        prompt: '检查遗漏',
        files: [],
      }),
      expectedParams: ({ root }) => ({
        approvalPolicy: 'never',
        cwd: root,
        input: [{
          type: 'text',
          text: [
            '你正在执行个人产品经理工作台的只读任务。',
            '禁止创建、修改、移动或删除任何文件，也不要请求扩大权限。',
            '当前需求：REQ-1 启动策略；阶段：PRD中',
            '用户任务：检查遗漏',
          ].join('\n\n'),
        }],
        sandboxPolicy: {
          type: 'readOnly',
          networkAccess: false,
        },
        threadId: 'thread-1',
      }),
    },
    {
      name: 'workflow',
      resultText: JSON.stringify(feedbackResult),
      start: manager => manager.startWorkflowRun({
        requirementId: 'REQ-1',
        workflowType: 'feedback-triage',
        files: [],
        input: workflowInput,
      }),
      expectedParams: ({ root, store }) => ({
        approvalPolicy: 'never',
        cwd: root,
        input: [{
          type: 'text',
          text: buildWorkflowPrompt('feedback-triage', {
            requirement: store.getRequirement('REQ-1'),
            files: [],
            input: workflowInput,
          }),
        }],
        outputSchema: workflowCatalog['feedback-triage'].outputSchema,
        sandboxPolicy: {
          type: 'readOnly',
          networkAccess: false,
        },
        threadId: 'thread-1',
      }),
    },
    {
      name: 'write',
      start: manager => manager.startWriteRun(writeInput()),
      resultText: 'write result',
      beforeCompletion: params => {
        fs.writeFileSync(
          path.join(params.cwd, 'prd', 'a.md'),
          'after\n',
          'utf8',
        );
      },
      expectedParams: ({ root, run }) => {
        const stagingRoot = path.join(
          root,
          '.workbench-data',
          'staging',
          run.id,
        );
        return {
          approvalPolicy: 'on-request',
          cwd: stagingRoot,
          input: [{
            type: 'text',
            text: [
              '当前需求：REQ-1 启动策略',
              '本次权限：modify-existing',
              '你现在位于本次运行的隔离暂存区，只允许处理这些相对路径：',
              '- prd/a.md',
              '不得删除文件，不得修改目标清单外文件，不得访问真实工作区路径，不得发布或外部发送。',
              '任务：补充异常策略',
            ].join('\n\n'),
          }],
          sandboxPolicy: {
            type: 'workspaceWrite',
            writableRoots: [stagingRoot],
            networkAccess: false,
          },
          threadId: 'thread-1',
        };
      },
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async subtest => {
      const codex = new FakeCodex();
      codex.onTurnStart = async ({
        codex: sender,
        params,
        threadId,
        turnId,
      }) => {
        entry.beforeCompletion?.(params);
        sender.emit('notification', {
          method: 'item/agentMessage/delta',
          params: {
            delta: 'STALE',
            itemId: 'stale-agent',
            threadId,
            turnId: 'stale-turn',
          },
        });
        sender.emit('notification', {
          method: 'item/agentMessage/delta',
          params: {
            delta: entry.resultText,
            itemId: 'current-agent',
            threadId,
            turnId,
          },
        });
        sender.emit('notification', {
          method: 'turn/completed',
          params: {
            threadId,
            turn: {
              id: turnId,
              items: [],
              status: 'completed',
            },
          },
        });
      };
      const {
        manager,
        root,
        store,
      } = setup(subtest, { codex });

      const run = await entry.start(manager);
      const persisted = store.getRun(run.id);
      const turnStart = codex.calls.find(call => call.method === 'turn/start');

      assert.equal(persisted.status, 'completed');
      assert.equal(persisted.error, null);
      assert.equal(persisted.result.includes('STALE'), false);
      assert.deepEqual(
        turnStart.params,
        entry.expectedParams({ root, run, store }),
      );
      assert.deepEqual(
        store.listRunEvents(run.id)
          .filter(event => (
            event.type === 'workbench/stale-turn-notifications-dropped'
          ))
          .map(event => event.payload),
        [{ count: 1 }],
      );
      if (entry.name === 'write') {
        assert.equal(
          fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'),
          'after\n',
        );
      }
    });
  }
});
```

- [ ] **Step 4: Prove buffered state is cleared after startup failure**

```js
test('startup rejection after an early notification releases buffered state and the Run slot', async t => {
  const codex = new FakeCodex();
  const { manager, store } = setup(t, { codex });
  let activeAtFailure = null;
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    activeAtFailure = manager.activeByThread.get(threadId);
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'must-not-leak',
        itemId: 'early-agent',
        threadId,
        turnId,
      },
    });
    throw new Error('turn start rejected after notification');
  };

  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-1',
      prompt: 'startup rejection',
      files: [],
    }),
    /turn start rejected after notification/,
  );

  assert.equal(store.countActiveRuns(), 0);
  const [failed] = store.listRuns();
  assert.equal(failed.status, 'failed');
  assert.equal(failed.result, null);
  assert.ok(activeAtFailure);
  assertStartupStateCleared(manager, activeAtFailure);

  codex.onTurnStart = null;
  const replacement = await manager.startReadOnlyRun({
    requirementId: 'REQ-1',
    prompt: 'replacement',
    files: [],
  });
  emitCompleted(codex, replacement);
  assert.equal(store.getRun(replacement.id).result, null);
});
```

- [ ] **Step 5: Prove cancel and timeout clear a pending response buffer**

```js
test('cancel while turn/start is pending drops buffered notifications and releases the Run slot', async t => {
  const codex = new FakeCodex();
  const responseGate = deferred();
  let buffered = false;
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'cancelled-buffer',
        itemId: 'early-agent',
        threadId,
        turnId,
      },
    });
    buffered = true;
    await responseGate.promise;
  };
  const { manager, store } = setup(t, { codex });
  const starting = manager.startReadOnlyRun({
    requirementId: 'REQ-1',
    prompt: 'cancel pending turn',
    files: [],
  });
  const startupRejected = assert.rejects(starting, /Cancelled by user/);
  await waitFor(() => buffered, 'pre-response notification was not buffered');
  const [run] = store.listRuns();
  const active = manager.activeByRun.get(run.id);
  assert.ok(active);
  assertStartupStateBuffered(active);

  await manager.cancel(run.id);
  responseGate.resolve();
  await startupRejected;

  assert.equal(store.countActiveRuns(), 0);
  assert.equal(store.getRun(run.id).status, 'cancelled');
  assert.equal(store.getRun(run.id).result, null);
  assertStartupStateCleared(manager, active);
});

test('timeout while turn/start is pending drops buffered notifications and releases the Run slot', async t => {
  const codex = new FakeCodex();
  const responseGate = deferred();
  let buffered = false;
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'timed-out-buffer',
        itemId: 'early-agent',
        threadId,
        turnId,
      },
    });
    buffered = true;
    await responseGate.promise;
  };
  const {
    manager,
    store,
  } = setup(t, { codex, runTimeoutMs: 200 });
  const starting = manager.startReadOnlyRun({
    requirementId: 'REQ-1',
    prompt: 'timeout pending turn',
    files: [],
  });
  const startupRejected = assert.rejects(starting, /Run timed out/);
  await waitFor(() => buffered, 'pre-response notification was not buffered');
  const [run] = store.listRuns();
  const active = manager.activeByRun.get(run.id);
  assert.ok(active);
  assertStartupStateBuffered(active);

  const failed = await waitForStatus(store, run.id, 'failed', 1_000);
  responseGate.resolve();
  await startupRejected;

  assert.equal(failed.error, 'Run timed out');
  assert.equal(failed.result, null);
  assert.equal(store.countActiveRuns(), 0);
  assertStartupStateCleared(manager, active);
});
```

- [ ] **Step 6: Prove App Server exit clears the startup buffer**

```js
test('App Server exit during turn startup drops buffered payload and releases the Run', async t => {
  const codex = new FakeCodex();
  const responseGate = deferred();
  let notificationSent = false;
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'must-not-persist',
        itemId: 'early',
        threadId,
        turnId,
      },
    });
    notificationSent = true;
    await responseGate.promise;
  };
  const { manager, store } = setup(t, { codex });

  const starting = manager.startReadOnlyRun({
    requirementId: 'REQ-1',
    prompt: 'exit cleanup',
    files: [],
  });
  const startupRejected = assert.rejects(starting, /Codex App Server exited/);
  await waitFor(
    () => notificationSent,
    'pre-response notification was not sent',
  );
  const [run] = store.listRuns();
  const active = manager.activeByRun.get(run.id);
  assert.ok(active);
  assertStartupStateBuffered(active);
  codex.emit('exit', { code: 1, signal: null });
  responseGate.resolve();
  await startupRejected;

  const failed = store.getRun(run.id);
  assert.equal(failed.status, 'failed');
  assert.equal(store.countActiveRuns(), 0);
  assert.deepEqual(
    store.listRunEvents(run.id)
      .filter(event => event.type === 'item/agentMessage/delta'),
    [],
  );
  assertStartupStateCleared(manager, active);
});
```

- [ ] **Step 7: Run focused and full tests**

Run:

```powershell
node --test test/workbench/run-control.test.mjs test/workbench/thread-isolation.test.mjs
npm.cmd run workbench:test
```

Expected: focused tests PASS; full suite reports 132 tests and zero failures.

- [ ] **Step 8: Commit edge-case coverage**

```powershell
git add -- test/workbench/run-control.test.mjs
git commit -m "test: cover bounded turn startup replay"
```

### Task 4: Re-run and archive the real Codex integration

**Files:**
- Modify: `package.json`
- Validate and stage existing: `tools/verify-personal-codex-workbench-real.mjs`
- Update: `test-results/personal-codex-workbench/real-integration-results.json`

- [ ] **Step 1: Expose the real verifier**

Add the script without changing existing commands:

```json
{
  "scripts": {
    "workbench:start": "node workbench/server.mjs",
    "workbench:test": "node --test test/workbench/*.test.mjs",
    "workbench:verify-ui": "node tools/verify-personal-codex-workbench-ui.mjs",
    "workbench:verify-real": "node tools/verify-personal-codex-workbench-real.mjs"
  },
  "dependencies": {
    "docx": "^9.6.1",
    "playwright-core": "1.61.1"
  }
}
```

- [ ] **Step 2: Validate the existing diagnostic verifier as a reproducible test**

Do not create or rewrite this 335-line file; it already exists in the working tree from the completed diagnosis. Inspect it and verify that these executable assertions remain present:

```js
assert.equal(bootstrap.health.broker, 'ok');
assert.equal(bootstrap.health.codex, 'ok');
assert.notEqual(bootstrap.health.configuration, 'error');
assert.notEqual(bootstrap.health.authentication, 'error');
assertCompleted(readOnlyDetail, 'read-only Run');
assertCompleted(feedbackDetail, 'feedback-triage');
assertCompleted(reviewDetail, 'demo-prd-review');
assertCompleted(strategyDetail, 'issue-strategy');
assert.equal(fs.existsSync(candidateAbsolutePath), true);
assert.match(fs.readFileSync(candidateAbsolutePath, 'utf8'), /WORKBENCH_REAL_E2E/);
assert.deepEqual(restored.restored, [candidatePath]);
assert.equal(fs.existsSync(candidateAbsolutePath), false);
assert.equal(hashes.after, hashes.before);
```

Run this exact source-contract check before the real integration:

```powershell
$source = Get-Content -Raw -Encoding utf8 `
  tools/verify-personal-codex-workbench-real.mjs
@(
  'finally {',
  'writeReport();',
  'await app.close();',
  '/cancel',
  '/restore',
  'assert.deepEqual(restored.restored, [candidatePath]);'
) | ForEach-Object {
  if (-not $source.Contains($_)) {
    throw "Missing real-verifier safety contract: $_"
  }
}
```

Expected: the command exits 0. The subsequent real integration proves the `finally` report write, active-write cancellation branch, and Workbench restore API path execute without direct candidate deletion.

- [ ] **Step 3: Run the real integration**

Run:

```powershell
npm.cmd run workbench:verify-real
```

Expected terminal milestones:

```text
real Codex health passed
read-only Run completed
workflow completed: feedback-triage
workflow completed: demo-prd-review
workflow completed: issue-strategy
write Run completed and candidate applied
write Run restored through safety API
PASS real integration
```

- [ ] **Step 4: Inspect the archived report and filesystem**

Run:

```powershell
$report = Get-Content -Raw -Encoding utf8 `
  test-results/personal-codex-workbench/real-integration-results.json |
  ConvertFrom-Json
$report.status
$report.workflows.PSObject.Properties.Name
$report.restored
Test-Path test-results/personal-codex-workbench/real-integration-candidate.md
```

Expected:

```text
passed
feedback-triage
demo-prd-review
issue-strategy
candidateAbsent : True
False
```

- [ ] **Step 5: Run static/browser regression and source checks**

Run:

```powershell
npm.cmd run workbench:test
npm.cmd run workbench:verify-ui
git diff --check -- workbench test/workbench tools package.json `
  test-results/personal-codex-workbench
```

Expected: all automated and browser contracts PASS; `git diff --check` exits 0.

- [ ] **Step 6: Commit the verifier and passing real evidence**

```powershell
git add -- package.json tools/verify-personal-codex-workbench-real.mjs `
  test-results/personal-codex-workbench/real-integration-results.json
git commit -m "test: verify real Codex workbench workflows"
```

## Plan Self-Review

- Spec coverage: authoritative response ID, bounded buffering, ordered replay, stale diagnostics, overflow failure, startup failure/cancel/timeout/App Server exit cleanup, three Run types with exact parameter preservation, real integration, write restore, and protected artifact hashes are each assigned to a task.
- Placeholder scan: no `TBD`, `TODO`, deferred implementation, or unspecified error-handling step remains.
- Type consistency: the plan consistently uses `turnStartPending`, `pendingNotifications`, `pendingNotificationBytes`, `staleNotificationCount`, `notificationTurnId`, and `workbench/stale-turn-notifications-dropped`.
- Scope: only Run startup routing, its tests, and the already-created real verifier are included; no database migration, UI feature, or protocol change is introduced.
