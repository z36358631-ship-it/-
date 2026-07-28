import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContextService } from '../../workbench/lib/context-service.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { FileSafety } from '../../workbench/lib/file-safety.mjs';
import { RunManager } from '../../workbench/lib/run-manager.mjs';
import {
  buildWorkflowPrompt,
  workflowCatalog,
} from '../../workbench/lib/workflow-catalog.mjs';

const feedbackResult = {
  themes: [{ name: '启动失败', count: 1 }],
  duplicates: [],
  existingMatches: [],
  candidates: [],
  informationGaps: [],
};

class FakeCodex extends EventEmitter {
  calls = [];
  interruptMode = 'resolve';
  nonceValue = 'f'.repeat(64);
  pidValue = 8642;
  requestGates = new Map();
  running = false;
  startGate = null;
  threadCount = 0;
  turnCount = 0;
  turnStartError = null;
  onTurnStart = null;

  async start() {
    this.running = true;
    if (this.startGate) await this.startGate.promise;
  }

  async request(method, params) {
    this.calls.push({ method, params });
    const gate = this.requestGates.get(method);
    if (gate) await gate.promise;
    if (method === 'thread/start') {
      return { thread: { id: `thread-${++this.threadCount}` } };
    }
    if (method === 'thread/resume') {
      return { thread: { id: params.threadId } };
    }
    if (method === 'turn/start') {
      if (this.turnStartError) throw this.turnStartError;
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
    if (method === 'turn/interrupt') {
      if (this.interruptMode === 'reject') {
        throw new Error('interrupt failed');
      }
      if (this.interruptMode === 'pending') {
        return new Promise(() => {});
      }
      return {};
    }
    throw new Error(`Unexpected method: ${method}`);
  }

  diagnostics() {
    return { running: this.running, stderr: '' };
  }

  pid() {
    return this.pidValue;
  }

  nonce() {
    return this.nonceValue;
  }
}

function deferred() {
  let reject;
  let resolve;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });
  return { promise, reject, resolve };
}

class RecordingApprovals {
  registered = [];
  rejected = [];
  unregistered = [];

  registerRun(runId, value) {
    this.registered.push({ runId, ...value });
  }

  rejectPendingForRun(runId) {
    this.rejected.push(runId);
    return 0;
  }

  unregisterTurn(turnId) {
    this.unregistered.push(turnId);
  }
}

function setup(t, {
  codex = new FakeCodex(),
  maxConcurrentRuns = 1,
  runTimeoutMs = 60_000,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-control-'));
  fs.mkdirSync(path.join(root, 'prd'), { recursive: true });
  fs.writeFileSync(path.join(root, 'prd', 'a.md'), 'before\n', 'utf8');
  const store = openDatabase(
    path.join(root, '.workbench-data', `test-${crypto.randomUUID()}.sqlite`),
  );
  store.upsertRequirement({
    id: 'REQ-1',
    title: '启动策略',
    stage: 'PRD中',
    externalWait: '无外部等待',
  });
  store.addArtifact({
    id: 'ART-1',
    requirementId: 'REQ-1',
    kind: 'PRD',
    path: 'prd/a.md',
  });
  const approvals = new RecordingApprovals();
  const fileSafety = new FileSafety({ allowedRoot: root });
  const terminated = [];
  const manager = new RunManager({
    store,
    codex,
    allowedRoot: root,
    contextService: new ContextService({ store, allowedRoot: root }),
    fileSafety,
    approvalManager: approvals,
    maxConcurrentRuns,
    runTimeoutMs,
    processTerminator: async pid => {
      terminated.push(pid);
    },
  });
  t.after(() => {
    store.close();
    fs.rmSync(root, { force: true, recursive: true });
  });
  return {
    approvals,
    codex,
    fileSafety,
    manager,
    root,
    store,
    terminated,
  };
}

function writeInput(overrides = {}) {
  return {
    requirementId: 'REQ-1',
    prompt: '补充异常策略',
    permission: 'modify-existing',
    targets: ['prd/a.md'],
    ...overrides,
  };
}

function stagedPath(root, runId, relativePath) {
  return path.join(root, '.workbench-data', 'staging', runId, relativePath);
}

function emitCompleted(codex, run, {
  status = 'completed',
  error = null,
  command = null,
} = {}) {
  if (command) {
    codex.emit('notification', {
      method: 'item/completed',
      params: {
        item: {
          id: `command-${run.turnId}`,
          type: 'commandExecution',
          command: command.command,
          exitCode: command.exitCode,
          aggregatedOutput: command.output,
          status: 'completed',
        },
        threadId: run.threadId,
        turnId: run.turnId,
      },
    });
  }
  codex.emit('notification', {
    method: 'turn/completed',
    params: {
      threadId: run.threadId,
      turn: {
        id: run.turnId,
        items: [],
        status,
        ...(error ? { error: { message: error } } : {}),
      },
    },
  });
}

async function waitForStatus(store, runId, status, timeoutMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = store.getRun(runId);
    if (run?.status === status) return run;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.fail(`Run ${runId} did not reach ${status}`);
}

async function waitFor(predicate, message, timeoutMs = 500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.fail(message);
}

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

test('write runs enforce exact inputs and use only the run staging root', async t => {
  const {
    approvals,
    codex,
    manager,
    root,
    store,
  } = setup(t);

  await assert.rejects(
    () => manager.startWriteRun({
      ...writeInput(),
      files: ['prd/a.md'],
    }),
    error => error.statusCode === 400 && /files.*not accepted/.test(error.message),
  );
  await assert.rejects(
    () => manager.startWriteRun(writeInput({ permission: 'read-only' })),
    error => error.statusCode === 400 && /permission/.test(error.message),
  );
  await assert.rejects(
    () => manager.startWriteRun(writeInput({
      permission: 'generate-candidate',
    })),
    /must not already exist/,
  );
  await assert.rejects(
    () => manager.startWriteRun(writeInput({
      permission: 'generate-candidate',
      targets: ['missing-parent/candidate.md'],
    })),
    /parent directory must already exist/,
  );
  await assert.rejects(
    () => manager.startWriteRun(writeInput({ targets: ['prd/missing.md'] })),
    /must already exist/,
  );
  fs.writeFileSync(path.join(root, 'prd', 'unregistered.md'), 'private\n', 'utf8');
  await assert.rejects(
    () => manager.startWriteRun(writeInput({
      targets: ['prd/unregistered.md'],
    })),
    /not registered/,
  );

  const run = await manager.startWriteRun(writeInput());
  assert.equal(run.processNonce, codex.nonceValue);
  const turn = codex.calls.find(call => call.method === 'turn/start');
  const expectedStagingRoot = path.join(
    root,
    '.workbench-data',
    'staging',
    run.id,
  );
  assert.deepEqual(
    {
      approvalPolicy: turn.params.approvalPolicy,
      cwd: turn.params.cwd,
      sandboxPolicy: turn.params.sandboxPolicy,
    },
    {
      approvalPolicy: 'on-request',
      cwd: expectedStagingRoot,
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [expectedStagingRoot],
        networkAccess: false,
      },
    },
  );
  assert.equal(JSON.stringify(codex.calls).includes('danger'), false);
  assert.equal(fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'), 'before\n');
  assert.equal(
    fs.readFileSync(stagedPath(root, run.id, 'prd/a.md'), 'utf8'),
    'before\n',
  );
  assert.deepEqual(store.listFileSnapshots(run.id).map(item => item.path), ['prd/a.md']);
  assert.deepEqual(store.getRunContext(run.id), {
    files: ['prd/a.md'],
    input: { permission: 'modify-existing' },
  });
  assert.deepEqual(approvals.registered, [{
    runId: run.id,
    targets: ['prd/a.md'],
    turnId: run.turnId,
    approvalRoot: expectedStagingRoot,
  }]);

  await assert.rejects(
    () => manager.startWriteRun(writeInput({
      permission: 'generate-candidate',
      targets: ['prd/candidate.md'],
    })),
    error => error.statusCode === 429 && /Concurrent run limit/.test(error.message),
  );
  await manager.cancel(run.id);
});

test('successful write applies only staged targets and persists validation evidence', async t => {
  const {
    approvals,
    codex,
    manager,
    root,
    store,
  } = setup(t);
  const run = await manager.startWriteRun(writeInput());
  fs.writeFileSync(stagedPath(root, run.id, 'prd/a.md'), 'after\n', 'utf8');

  emitCompleted(codex, run, {
    command: {
      command: 'node validate.mjs',
      exitCode: 0,
      output: 'validation passed',
    },
  });

  assert.equal(fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'), 'after\n');
  assert.equal(store.getRun(run.id).status, 'completed');
  assert.equal(store.getRunApplyState(run.id).state, 'applied');
  assert.deepEqual(
    store.listFileChanges(run.id).map(change => ({
      path: change.path,
      kind: change.kind,
      restoredAt: change.restoredAt,
    })),
    [{ path: 'prd/a.md', kind: 'modified', restoredAt: null }],
  );
  assert.deepEqual(
    store.listValidations(run.id).map(validation => ({
      name: validation.name,
      status: validation.status,
      detail: validation.detail,
    })),
    [{
      name: 'node validate.mjs',
      status: 'passed',
      detail: 'validation passed',
    }],
  );
  assert.deepEqual(approvals.rejected, [run.id]);
  assert.deepEqual(approvals.unregistered, [run.turnId]);
});

test('a generated candidate is applied and registered as a requirement artifact', async t => {
  const {
    codex,
    manager,
    root,
    store,
  } = setup(t);
  const run = await manager.startWriteRun(writeInput({
    permission: 'generate-candidate',
    targets: ['prd/candidate.md'],
  }));
  const candidate = stagedPath(root, run.id, 'prd/candidate.md');
  fs.mkdirSync(path.dirname(candidate), { recursive: true });
  fs.writeFileSync(candidate, '# Candidate\n', 'utf8');

  emitCompleted(codex, run);

  assert.equal(
    fs.readFileSync(path.join(root, 'prd', 'candidate.md'), 'utf8'),
    '# Candidate\n',
  );
  assert.equal(store.getRun(run.id).status, 'completed');
  assert.deepEqual(
    store.listFileChanges(run.id).map(change => ({
      path: change.path,
      kind: change.kind,
    })),
    [{ path: 'prd/candidate.md', kind: 'created' }],
  );
  const artifact = store.listArtifacts('REQ-1').find(
    item => item.path === 'prd/candidate.md',
  );
  assert.deepEqual(
    {
      requirementId: artifact.requirementId,
      kind: artifact.kind,
      path: artifact.path,
    },
    {
      requirementId: 'REQ-1',
      kind: '候选产物',
      path: 'prd/candidate.md',
    },
  );
  assert.deepEqual(
    store.listValidations(run.id).map(item => item.status),
    ['skipped'],
  );
});

test('unexpected files and deletion fail without changing the real target', async t => {
  await t.test('unexpected file', async subtest => {
    const {
      codex,
      manager,
      root,
      store,
    } = setup(subtest);
    const run = await manager.startWriteRun(writeInput());
    fs.writeFileSync(stagedPath(root, run.id, 'prd/a.md'), 'after\n', 'utf8');
    fs.writeFileSync(path.join(
      root,
      '.workbench-data',
      'staging',
      run.id,
      'unexpected.md',
    ), 'unsafe\n', 'utf8');

    emitCompleted(codex, run);

    assert.equal(store.getRun(run.id).status, 'failed');
    assert.match(store.getRun(run.id).error, /out-of-scope files/);
    assert.equal(fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'), 'before\n');
    assert.deepEqual(store.listFileChanges(run.id), []);
  });

  await t.test('deletion', async subtest => {
    const {
      codex,
      manager,
      root,
      store,
    } = setup(subtest);
    const run = await manager.startWriteRun(writeInput());
    fs.unlinkSync(stagedPath(root, run.id, 'prd/a.md'));

    emitCompleted(codex, run);

    assert.equal(store.getRun(run.id).status, 'failed');
    assert.match(store.getRun(run.id).error, /Deletion is not applied/);
    assert.equal(fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'), 'before\n');
    assert.deepEqual(store.listFileChanges(run.id), []);
  });
});

test('a partial apply is recorded for recovery and blocks retry', async t => {
  const {
    codex,
    fileSafety,
    manager,
    root,
    store,
  } = setup(t);
  fileSafety.applyFromStaging = (
    snapshot,
    stagedChanges,
    stagingRoot,
    onBeforeWrite,
  ) => {
    assert.equal(stagedChanges.length, 1);
    assert.match(stagingRoot, /[\\/]\.workbench-data[\\/]staging[\\/]/);
    onBeforeWrite();
    fs.writeFileSync(path.join(root, 'prd', 'a.md'), 'partial\n', 'utf8');
    throw new Error('simulated second write failure');
  };
  const run = await manager.startWriteRun(writeInput());
  fs.writeFileSync(stagedPath(root, run.id, 'prd/a.md'), 'after\n', 'utf8');

  emitCompleted(codex, run);

  assert.equal(store.getRun(run.id).status, 'failed');
  assert.match(store.getRun(run.id).error, /simulated second write failure/);
  assert.equal(store.getRunApplyState(run.id).state, 'applying');
  assert.deepEqual(
    store.listFileChanges(run.id).map(change => ({
      path: change.path,
      restoredAt: change.restoredAt,
    })),
    [{ path: 'prd/a.md', restoredAt: null }],
  );
  await assert.rejects(
    () => manager.retry(run.id),
    error => error.statusCode === 409 && /Restore.*previous file changes/.test(error.message),
  );
});

test('cancel interrupts only the exact turn and uses a same-client PID fallback', async t => {
  await t.test('successful interrupt', async subtest => {
    const {
      approvals,
      codex,
      manager,
      store,
      terminated,
    } = setup(subtest);
    const run = await manager.startWriteRun(writeInput());

    const cancelled = await manager.cancel(run.id);

    assert.equal(cancelled.status, 'cancelled');
    assert.deepEqual(
      codex.calls.filter(call => call.method === 'turn/interrupt'),
      [{
        method: 'turn/interrupt',
        params: { threadId: run.threadId, turnId: run.turnId },
      }],
    );
    assert.deepEqual(terminated, []);
    assert.deepEqual(approvals.rejected, [run.id]);
    assert.deepEqual(approvals.unregistered, [run.turnId]);
    await assert.rejects(
      () => manager.cancel(run.id),
      error => error.statusCode === 409 && /not active/.test(error.message),
    );
    assert.equal(store.getRun(run.id).status, 'cancelled');
  });

  await t.test('failed interrupt falls back to the live client PID', async subtest => {
    const codex = new FakeCodex();
    codex.interruptMode = 'reject';
    const {
      manager,
      terminated,
    } = setup(subtest, { codex });
    const run = await manager.startWriteRun(writeInput());

    await manager.cancel(run.id);

    assert.deepEqual(terminated, [8642]);
  });

  await t.test('a PID that no longer belongs to this client is never killed', async subtest => {
    const codex = new FakeCodex();
    codex.interruptMode = 'reject';
    const {
      manager,
      terminated,
    } = setup(subtest, { codex });
    const run = await manager.startWriteRun(writeInput());
    codex.pidValue = 9999;

    await manager.cancel(run.id);

    assert.deepEqual(terminated, []);
  });
});

test('read-only, workflow and write runs all time out and release control state', async t => {
  const cases = [
    {
      name: 'read-only',
      start: manager => manager.startReadOnlyRun({
        requirementId: 'REQ-1',
        prompt: '检查遗漏',
        files: [],
      }),
    },
    {
      name: 'workflow',
      start: manager => manager.startWorkflowRun({
        requirementId: 'REQ-1',
        workflowType: 'feedback-triage',
        files: [],
        input: { feedbackText: '启动失败' },
      }),
    },
    {
      name: 'write',
      start: manager => manager.startWriteRun(writeInput()),
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async subtest => {
      const {
        codex,
        manager,
        root,
        store,
      } = setup(subtest, { runTimeoutMs: 20 });
      const run = await entry.start(manager);

      const timedOut = await waitForStatus(store, run.id, 'failed');

      assert.equal(timedOut.error, 'Run timed out');
      assert.deepEqual(
        codex.calls.filter(call => call.method === 'turn/interrupt').at(-1),
        {
          method: 'turn/interrupt',
          params: { threadId: run.threadId, turnId: run.turnId },
        },
      );
      await assert.rejects(
        () => manager.cancel(run.id),
        error => error.statusCode === 409,
      );
      if (entry.name === 'write') {
        assert.equal(
          fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'),
          'before\n',
        );
      }
    });
  }
});

test('cancel during Codex initialization releases the only slot and kills only the persisted client PID', async t => {
  const codex = new FakeCodex();
  const initialization = deferred();
  codex.startGate = initialization;
  const {
    manager,
    store,
    terminated,
  } = setup(t, { codex });
  const input = {
    prompt: 'inspect startup',
    files: [],
  };

  const starting = manager.startReadOnlyRun(input);
  const startupRejected = assert.rejects(starting, /Cancelled by user/);
  await waitFor(
    () => store.listRuns().length === 1
      && store.listRuns()[0].processPid === 8642,
    'starting run did not persist its Codex PID',
  );
  const [run] = store.listRuns();
  await assert.rejects(
    () => manager.startReadOnlyRun(input),
    error => error.statusCode === 429,
  );

  const cancelled = await manager.cancel(run.id);
  await startupRejected;

  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.threadId, null);
  assert.equal(cancelled.turnId, null);
  assert.deepEqual(terminated, [8642]);

  codex.startGate = null;
  initialization.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getRun(run.id).status, 'cancelled');

  const replacement = await manager.startReadOnlyRun(input);
  assert.equal(replacement.status, 'running');
  await manager.cancel(replacement.id);
});

test('thread startup timeout rejects the caller, ignores the late response, and releases the only slot', async t => {
  const codex = new FakeCodex();
  const threadStart = deferred();
  codex.requestGates.set('thread/start', threadStart);
  const {
    manager,
    store,
    terminated,
  } = setup(t, { codex, runTimeoutMs: 20 });
  const input = {
    requirementId: 'REQ-1',
    prompt: 'inspect thread startup',
    files: [],
  };

  const starting = manager.startReadOnlyRun(input);
  const startupRejected = assert.rejects(starting, /Run timed out/);
  await waitFor(
    () => codex.calls.some(call => call.method === 'thread/start'),
    'thread/start was not requested',
  );
  const [run] = store.listRuns();
  const failed = await waitForStatus(store, run.id, 'failed');
  await startupRejected;

  assert.equal(failed.error, 'Run timed out');
  assert.equal(failed.processPid, 8642);
  assert.equal(failed.threadId, null);
  assert.equal(failed.turnId, null);
  assert.deepEqual(terminated, [8642]);

  codex.requestGates.delete('thread/start');
  threadStart.resolve();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getRun(run.id).status, 'failed');
  assert.equal(store.getRun(run.id).threadId, null);
  assert.equal(store.getRequirementThread('REQ-1') ?? null, null);

  const replacement = await manager.startReadOnlyRun(input);
  assert.equal(replacement.status, 'running');
  await manager.cancel(replacement.id);
});

test('retry reconstructs every run kind from persisted context without --last', async t => {
  const cases = [
    {
      name: 'read-only',
      start: manager => manager.startReadOnlyRun({
        requirementId: 'REQ-1',
        prompt: '检查遗漏',
        files: [],
      }),
      assertRetried: run => {
        assert.equal(run.permission, 'read-only');
        assert.equal(run.workflowType, null);
      },
    },
    {
      name: 'workflow',
      start: manager => manager.startWorkflowRun({
        requirementId: 'REQ-1',
        workflowType: 'feedback-triage',
        files: [],
        input: { feedbackText: '启动失败' },
      }),
      assertRetried: run => {
        assert.equal(run.workflowType, 'feedback-triage');
      },
    },
    {
      name: 'write',
      start: manager => manager.startWriteRun(writeInput()),
      assertRetried: run => {
        assert.equal(run.permission, 'modify-existing');
      },
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async subtest => {
      const {
        codex,
        manager,
      } = setup(subtest);
      const first = await entry.start(manager);
      await assert.rejects(
        () => manager.retry(first.id),
        error => error.statusCode === 409 && /Only failed, cancelled or interrupted/.test(error.message),
      );
      await manager.cancel(first.id);

      const retried = await manager.retry(first.id);

      assert.notEqual(retried.id, first.id);
      entry.assertRetried(retried);
      assert.equal(JSON.stringify(codex.calls).includes('--last'), false);
      if (entry.name === 'write') {
        const writeTurns = codex.calls.filter(
          call => call.method === 'turn/start'
            && call.params.sandboxPolicy?.type === 'workspaceWrite',
        );
        assert.equal(writeTurns.length, 2);
        assert.notEqual(writeTurns[0].params.cwd, writeTurns[1].params.cwd);
      }
      await manager.cancel(retried.id);
    });
  }
});

test('turn startup failure clears its timer and cannot overwrite the first failure', async t => {
  const codex = new FakeCodex();
  codex.turnStartError = new Error('turn start rejected');
  const {
    manager,
    store,
    terminated,
  } = setup(t, { codex, runTimeoutMs: 20 });

  await assert.rejects(
    () => manager.startWriteRun(writeInput()),
    /turn start rejected/,
  );
  const [run] = store.listRuns();
  await new Promise(resolve => setTimeout(resolve, 50));

  assert.equal(store.getRun(run.id).status, 'failed');
  assert.equal(store.getRun(run.id).error, 'turn start rejected');
  assert.deepEqual(terminated, []);
});

test('completion before turn/start returns wins once over duplicate completion and timeout', async t => {
  const codex = new FakeCodex();
  codex.onTurnStart = async ({
    codex: sender,
    params,
    threadId,
    turnId,
  }) => {
    fs.writeFileSync(path.join(params.cwd, 'prd', 'a.md'), 'early\n', 'utf8');
    const earlyRun = { threadId, turnId };
    emitCompleted(sender, earlyRun);
  };
  const {
    approvals,
    manager,
    root,
    store,
  } = setup(t, { codex, runTimeoutMs: 20 });

  const run = await manager.startWriteRun(writeInput());
  emitCompleted(codex, run);
  await new Promise(resolve => setTimeout(resolve, 50));

  assert.equal(store.getRun(run.id).status, 'completed');
  assert.equal(fs.readFileSync(path.join(root, 'prd', 'a.md'), 'utf8'), 'early\n');
  assert.equal(store.listFileChanges(run.id).length, 1);
  assert.deepEqual(approvals.registered.map(item => item.turnId), [run.turnId]);
  assert.deepEqual(approvals.unregistered, [run.turnId]);
});

test('matching pre-response notifications replay in order exactly once', async t => {
  const codex = new FakeCodex();
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'first',
        itemId: 'early-1',
        threadId,
        turnId,
      },
    });
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: 'STALE',
        itemId: 'stale',
        threadId,
        turnId: 'previous-turn',
      },
    });
    sender.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta: ' second',
        itemId: 'early-2',
        threadId,
        turnId,
      },
    });
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
  assert.deepEqual(
    store.listRunEvents(run.id)
      .filter(event => event.type === 'workbench/stale-turn-notifications-dropped')
      .map(event => event.payload),
    [{ count: 1 }],
  );
});

test('turn startup notification count overflow fails and releases the Run slot', async t => {
  const codex = new FakeCodex();
  codex.onTurnStart = async ({ codex: sender, threadId, turnId }) => {
    for (let index = 0; index < 513; index += 1) {
      sender.emit('notification', {
        method: 'item/agentMessage/delta',
        params: {
          delta: 'x',
          itemId: `item-${index}`,
          threadId,
          turnId,
        },
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

  const [failed] = store.listRuns();
  assert.equal(failed.status, 'failed');
  assert.equal(failed.result, null);
  assert.deepEqual(store.listRunEvents(failed.id), []);
  assert.equal(store.countActiveRuns(), 0);
});

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

  const [failed] = store.listRuns();
  assert.equal(failed.status, 'failed');
  assert.equal(failed.result, null);
  assert.deepEqual(store.listRunEvents(failed.id), []);
  assert.equal(store.countActiveRuns(), 0);
});

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
      resultText: 'write result',
      start: manager => manager.startWriteRun(writeInput()),
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
  assert.deepEqual(
    store.listRunEvents(failed.id)
      .filter(event => event.type === 'item/agentMessage/delta'),
    [],
  );
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

test('cancel while turn/start is pending drops buffered notifications and releases the Run slot', async t => {
  const codex = new FakeCodex();
  const responseGate = deferred();
  let notificationSent = false;
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
    notificationSent = true;
    await responseGate.promise;
  };
  const { manager, store } = setup(t, { codex });
  const starting = manager.startReadOnlyRun({
    requirementId: 'REQ-1',
    prompt: 'cancel pending turn',
    files: [],
  });
  const startupRejected = assert.rejects(starting, /Cancelled by user/);

  await waitFor(
    () => notificationSent,
    'pre-response notification was not sent',
  );
  const [run] = store.listRuns();
  const active = manager.activeByRun.get(run.id);
  assert.ok(active);
  assertStartupStateBuffered(active);
  const cancelled = await manager.cancel(run.id);
  responseGate.resolve();
  await startupRejected;

  assert.equal(cancelled.status, 'cancelled');
  assert.equal(store.getRun(run.id).result, null);
  assert.deepEqual(
    store.listRunEvents(run.id)
      .filter(event => event.type === 'item/agentMessage/delta'),
    [],
  );
  assertStartupStateCleared(manager, active);
  assert.equal(store.countActiveRuns(), 0);
});

test('timeout while turn/start is pending drops buffered notifications and releases the Run slot', async t => {
  const codex = new FakeCodex();
  const responseGate = deferred();
  let notificationSent = false;
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
    notificationSent = true;
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

  await waitFor(
    () => notificationSent,
    'pre-response notification was not sent',
  );
  const [run] = store.listRuns();
  const active = manager.activeByRun.get(run.id);
  assert.ok(active);
  assertStartupStateBuffered(active);
  const failed = await waitForStatus(store, run.id, 'failed', 1_000);
  responseGate.resolve();
  await startupRejected;

  assert.equal(failed.error, 'Run timed out');
  assert.equal(failed.result, null);
  assert.deepEqual(
    store.listRunEvents(run.id)
      .filter(event => event.type === 'item/agentMessage/delta'),
    [],
  );
  assertStartupStateCleared(manager, active);
  assert.equal(store.countActiveRuns(), 0);
});

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
  assert.equal(failed.result, null);
  assert.deepEqual(
    store.listRunEvents(run.id)
      .filter(event => event.type === 'item/agentMessage/delta'),
    [],
  );
  assertStartupStateCleared(manager, active);
  assert.equal(store.countActiveRuns(), 0);
});
