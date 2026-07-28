import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { RunManager } from '../../workbench/lib/run-manager.mjs';

class FakeCodex extends EventEmitter {
  constructor({ turnStartError = null } = {}) {
    super();
    this.requests = [];
    this.startCalls = 0;
    this.turnStartError = turnStartError;
  }

  async start() {
    this.startCalls += 1;
  }

  async request(method, params) {
    this.requests.push({ method, params });
    if (method === 'thread/start') return { thread: { id: 'thread-readonly' } };
    if (method === 'turn/start') {
      if (this.turnStartError) throw this.turnStartError;
      return {
        turn: {
          id: 'turn-readonly',
          items: [],
          status: 'inProgress',
        },
      };
    }
    throw new Error(`Unexpected method ${method}`);
  }

  pid() {
    return 7317;
  }
}

function createFixture(t, codex = new FakeCodex()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-manager-root-'));
  const databasePath = path.join(os.tmpdir(), `run-manager-${crypto.randomUUID()}.sqlite`);
  const store = openDatabase(databasePath);
  t.after(() => store.close());
  store.upsertRequirement({
    id: 'REQ-001',
    title: 'Android广告接入',
    stage: 'PRD中',
    externalWait: '无外部等待',
  });
  const manager = new RunManager({
    store,
    codex,
    allowedRoot: root,
    maxConcurrentRuns: 1,
  });
  return { codex, manager, root, store };
}

test('read-only run follows the v2 schema and persists safe ordered events', async t => {
  const { codex, manager, root, store } = createFixture(t);
  const run = await manager.startReadOnlyRun({
    requirementId: 'REQ-001',
    prompt: '只列出 PRD 的三个遗漏，不修改文件',
    files: ['prd/android-ad.md', 'prd/android-ad.md'],
  });

  assert.equal(codex.startCalls, 1);
  assert.deepEqual(codex.requests[0], {
    method: 'thread/start',
    params: {
      approvalPolicy: 'never',
      cwd: root,
      sandbox: 'read-only',
    },
  });
  assert.equal(codex.requests[1].method, 'turn/start');
  assert.deepEqual(
    {
      approvalPolicy: codex.requests[1].params.approvalPolicy,
      cwd: codex.requests[1].params.cwd,
      sandboxPolicy: codex.requests[1].params.sandboxPolicy,
      threadId: codex.requests[1].params.threadId,
    },
    {
      approvalPolicy: 'never',
      cwd: root,
      sandboxPolicy: { type: 'readOnly', networkAccess: false },
      threadId: 'thread-readonly',
    },
  );
  assert.deepEqual(codex.requests[1].params.input.map(value => value.type), ['text']);
  assert.match(codex.requests[1].params.input[0].text, /REQ-001 Android广告接入/);
  assert.match(codex.requests[1].params.input[0].text, /prd\/android-ad\.md/);

  assert.deepEqual(store.getRunContext(run.id), {
    files: ['prd/android-ad.md'],
    input: { kind: 'freeform-read-only' },
  });
  assert.deepEqual(
    {
      cwd: store.getRun(run.id).cwd,
      permission: store.getRun(run.id).permission,
      processPid: store.getRun(run.id).processPid,
      status: store.getRun(run.id).status,
      threadId: store.getRun(run.id).threadId,
      turnId: store.getRun(run.id).turnId,
    },
    {
      cwd: root,
      permission: 'read-only',
      processPid: 7317,
      status: 'running',
      threadId: 'thread-readonly',
      turnId: 'turn-readonly',
    },
  );

  codex.emit('notification', {
    method: 'item/started',
    params: {
      item: {
        id: 'command-1',
        type: 'commandExecution',
        command: 'Get-Content prd/android-ad.md',
        commandActions: [],
        cwd: root,
        status: 'inProgress',
        unsafeExtraField: 'must-not-persist',
      },
      startedAtMs: 1,
      threadId: 'thread-readonly',
      turnId: 'turn-readonly',
    },
  });
  codex.emit('notification', {
    method: 'item/reasoning/textDelta',
    params: {
      delta: 'private chain of thought',
      itemId: 'reasoning-1',
      threadId: 'thread-readonly',
      turnId: 'turn-readonly',
    },
  });
  codex.emit('notification', {
    method: 'item/completed',
    params: {
      completedAtMs: 2,
      item: {
        id: 'reasoning-1',
        type: 'reasoning',
        summary: ['private summary'],
        content: ['private content'],
      },
      threadId: 'thread-readonly',
      turnId: 'turn-readonly',
    },
  });
  for (const delta of ['遗漏一', '；遗漏二']) {
    codex.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta,
        itemId: 'message-1',
        threadId: 'thread-readonly',
        turnId: 'turn-readonly',
      },
    });
  }
  codex.emit('notification', {
    method: 'item/completed',
    params: {
      completedAtMs: 3,
      item: {
        id: 'message-1',
        type: 'agentMessage',
        text: '遗漏一；遗漏二',
      },
      threadId: 'thread-readonly',
      turnId: 'turn-readonly',
    },
  });
  codex.emit('notification', {
    method: 'turn/completed',
    params: {
      threadId: 'thread-readonly',
      turn: {
        id: 'turn-readonly',
        items: [],
        status: 'completed',
      },
    },
  });

  const persisted = store.getRun(run.id);
  assert.equal(persisted.status, 'completed');
  assert.equal(persisted.result, '遗漏一；遗漏二');
  const events = store.listRunEvents(run.id);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5]);
  assert.deepEqual(
    events.map(event => event.type),
    [
      'item/started',
      'item/agentMessage/delta',
      'item/agentMessage/delta',
      'item/completed',
      'turn/completed',
    ],
  );
  const persistedJson = JSON.stringify(events);
  assert.doesNotMatch(persistedJson, /private chain of thought|private summary|private content/);
  assert.doesNotMatch(persistedJson, /unsafeExtraField|must-not-persist/);
});

test('run manager enforces validation, authorization and the fixed concurrency limit', async t => {
  const { codex, manager, root, store } = createFixture(t);
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'missing',
      prompt: '检查遗漏',
      files: [],
    }),
    error => error.statusCode === 404 && /requirement/.test(error.message),
  );
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: null,
      prompt: '   ',
      files: [],
    }),
    error => error.statusCode === 400 && /prompt/.test(error.message),
  );
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-001',
      prompt: '检查遗漏',
      files: ['../outside.md'],
    }),
    error => error.statusCode === 403 && /outside allowed root/.test(error.message),
  );
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-001',
      prompt: '检查遗漏',
      files: [],
      permission: 'workspace-write',
    }),
    error => error.statusCode === 400 && /permission/.test(error.message),
  );
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-001',
      prompt: '检查遗漏',
      files: [],
      command: 'Remove-Item important.md',
    }),
    error => error.statusCode === 400 && /command/.test(error.message),
  );

  const run = await manager.startReadOnlyRun({
    requirementId: 'REQ-001',
    prompt: '检查遗漏',
    files: [],
  });
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-001',
      prompt: '并发任务',
      files: [],
    }),
    error => error.statusCode === 429 && /Concurrent run limit/.test(error.message),
  );

  codex.emit('notification', {
    method: 'turn/completed',
    params: {
      threadId: 'thread-readonly',
      turn: {
        error: { message: 'provider failed' },
        id: 'turn-readonly',
        items: [],
        status: 'failed',
      },
    },
  });
  assert.equal(store.getRun(run.id).status, 'failed');
  assert.equal(store.getRun(run.id).error, 'provider failed');
  assert.equal(store.countActiveRuns(), 0);
  assert.equal(path.relative(root, store.getRun(run.id).cwd), '');
});

test('turn startup failure keeps the thread id and marks the persisted run failed', async t => {
  const codex = new FakeCodex({ turnStartError: new Error('turn start rejected') });
  const { manager, store } = createFixture(t, codex);

  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-001',
      prompt: '检查遗漏',
      files: [],
    }),
    /turn start rejected/,
  );

  const [run] = store.listRuns();
  assert.equal(run.status, 'failed');
  assert.equal(run.error, 'turn start rejected');
  assert.equal(run.threadId, 'thread-readonly');
  assert.equal(run.turnId, null);
  assert.equal(run.processPid, 7317);
  assert.equal(store.countActiveRuns(), 0);
});
