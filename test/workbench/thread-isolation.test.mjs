import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContextService } from '../../workbench/lib/context-service.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { RunManager } from '../../workbench/lib/run-manager.mjs';
import { workflowCatalog } from '../../workbench/lib/workflow-catalog.mjs';

const validFeedbackResult = {
  themes: [{ name: '启动失败', count: 1 }],
  duplicates: [],
  existingMatches: [],
  candidates: [{
    title: '增加启动失败修复入口',
    evidence: '1条反馈',
    matchedRequirementId: null,
    suggestedPriority: 'P1',
  }],
  informationGaps: [],
};

class RecordingCodex extends EventEmitter {
  calls = [];
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
      return {
        turn: {
          id: `turn-${++this.turnCount}`,
          items: [],
          status: 'inProgress',
        },
      };
    }
    throw new Error(`Unexpected method ${method}`);
  }

  pid() {
    return 8123;
  }
}

function addRequirement(store, id) {
  store.upsertRequirement({
    id,
    title: id,
    stage: 'PRD中',
    externalWait: '无外部等待',
  });
}

function createFixture(t, { maxConcurrentRuns = 1 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thread-isolation-root-'));
  const databasePath = path.join(
    os.tmpdir(),
    `thread-isolation-${crypto.randomUUID()}.sqlite`,
  );
  const store = openDatabase(databasePath);
  const codex = new RecordingCodex();
  for (const id of ['REQ-A', 'REQ-B']) addRequirement(store, id);
  store.addArtifact({
    id: 'ART-A',
    requirementId: 'REQ-A',
    kind: 'PRD',
    path: 'prd/a.md',
  });
  store.addArtifact({
    id: 'ART-B',
    requirementId: 'REQ-B',
    kind: 'PRD',
    path: 'prd/b.md',
  });
  const contextService = new ContextService({ store, allowedRoot: root });
  const manager = new RunManager({
    store,
    codex,
    allowedRoot: root,
    contextService,
    maxConcurrentRuns,
  });
  t.after(() => store.close());
  return { codex, contextService, manager, root, store };
}

function emitCompleted(codex, run, chunks, status = 'completed') {
  const deltas = Array.isArray(chunks) ? chunks : [chunks];
  for (const delta of deltas) {
    codex.emit('notification', {
      method: 'item/agentMessage/delta',
      params: {
        delta,
        itemId: 'agent-message-1',
        threadId: run.threadId,
        turnId: run.turnId,
      },
    });
  }
  codex.emit('notification', {
    method: 'item/completed',
    params: {
      item: {
        id: 'agent-message-1',
        text: deltas.join(''),
        type: 'agentMessage',
      },
      threadId: run.threadId,
      turnId: run.turnId,
    },
  });
  codex.emit('notification', {
    method: 'turn/completed',
    params: {
      threadId: run.threadId,
      turn: {
        id: run.turnId,
        items: [],
        status,
      },
    },
  });
}

test('workflow_type migration is repeatable and returned by run queries', () => {
  const databasePath = path.join(os.tmpdir(), `workflow-column-${crypto.randomUUID()}.sqlite`);
  const first = openDatabase(databasePath);
  first.createRun({
    id: 'RUN-WORKFLOW',
    requirementId: null,
    prompt: 'workflow',
    permission: 'read-only',
    status: 'completed',
    workflowType: 'feedback-triage',
  });
  assert.equal(first.getRun('RUN-WORKFLOW').workflowType, 'feedback-triage');
  first.close();

  const reopened = openDatabase(databasePath);
  assert.equal(reopened.getRun('RUN-WORKFLOW').workflowType, 'feedback-triage');
  assert.equal(reopened.listRuns()[0].workflowType, 'feedback-triage');
  reopened.close();
});

test('workflow runs isolate requirements, resume the exact thread, and persist split JSON', async t => {
  const { codex, manager, root, store } = createFixture(t);
  const text = JSON.stringify(validFeedbackResult);

  const firstA = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'A1' },
  });
  emitCompleted(codex, firstA, [text.slice(0, 30), text.slice(30)]);
  const firstB = await manager.startWorkflowRun({
    requirementId: 'REQ-B',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'B1' },
  });
  emitCompleted(codex, firstB, text);
  const secondA = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'A2' },
  });

  assert.equal(store.getRequirementThread('REQ-A').threadId, 'thread-1');
  assert.equal(store.getRequirementThread('REQ-B').threadId, 'thread-2');
  assert.equal(store.getRun(firstA.id).workflowType, 'feedback-triage');
  assert.deepEqual(
    store.getWorkflowResult(firstA.id).result,
    validFeedbackResult,
  );

  const starts = codex.calls.filter(call => call.method === 'thread/start');
  assert.equal(starts.length, 2);
  for (const call of starts) {
    assert.deepEqual(call.params, {
      approvalPolicy: 'never',
      cwd: root,
      sandbox: 'read-only',
    });
  }
  const resumes = codex.calls.filter(call => call.method === 'thread/resume');
  assert.deepEqual(resumes, [{
    method: 'thread/resume',
    params: {
      approvalPolicy: 'never',
      cwd: root,
      sandbox: 'read-only',
      threadId: 'thread-1',
    },
  }]);
  const turns = codex.calls.filter(call => call.method === 'turn/start');
  assert.equal(turns.length, 3);
  for (const call of turns) {
    assert.equal(
      call.params.outputSchema,
      workflowCatalog['feedback-triage'].outputSchema,
    );
    assert.equal(call.params.approvalPolicy, 'never');
    assert.deepEqual(call.params.sandboxPolicy, {
      type: 'readOnly',
      networkAccess: false,
    });
  }
  assert.equal(codex.calls.some(call => JSON.stringify(call).includes('--last')), false);
  emitCompleted(codex, secondA, text);
});

test('only the exact missing-rollout error rebuilds and records the replacement', async t => {
  const { codex, manager, root, store } = createFixture(t);
  const first = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'first' },
  });
  emitCompleted(codex, first, JSON.stringify(validFeedbackResult));
  codex.resumeErrors.set(
    'thread-1',
    Object.assign(
      new Error('no rollout found for thread id thread-1'),
      { code: -32600 },
    ),
  );

  const rebuilt = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'second' },
  });

  assert.equal(store.getRequirementThread('REQ-A').threadId, 'thread-2');
  assert.equal(rebuilt.threadId, 'thread-2');
  assert.equal(
    store.listRunEvents(rebuilt.id)[0].type,
    'workbench/thread-rebuilt',
  );
  assert.deepEqual(
    codex.calls.filter(call => call.method === 'thread/start').at(-1).params,
    {
      approvalPolicy: 'never',
      cwd: root,
      sandbox: 'read-only',
    },
  );
});

test('invalid ids, internal failures and vague not-found errors never rebuild', async t => {
  const cases = [
    Object.assign(new Error('invalid thread id: bad UUID'), { code: -32600 }),
    Object.assign(
      new Error('no rollout found for thread id thread-existing'),
      { code: -32603 },
    ),
    Object.assign(new Error('thread not found'), { code: -32600 }),
  ];

  for (const [index, resumeError] of cases.entries()) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'thread-error-root-'));
    const store = openDatabase(path.join(
      os.tmpdir(),
      `thread-error-${crypto.randomUUID()}.sqlite`,
    ));
    addRequirement(store, 'REQ-A');
    store.bindRequirementThread('REQ-A', 'thread-existing');
    const codex = new RecordingCodex();
    codex.resumeErrors.set('thread-existing', resumeError);
    const manager = new RunManager({
      store,
      codex,
      allowedRoot: root,
      contextService: new ContextService({ store, allowedRoot: root }),
    });

    await assert.rejects(
      () => manager.startWorkflowRun({
        requirementId: 'REQ-A',
        workflowType: 'feedback-triage',
        files: [],
        input: { feedbackText: `case ${index}` },
      }),
      error => error === resumeError,
    );
    assert.equal(
      codex.calls.filter(call => call.method === 'thread/start').length,
      0,
    );
    assert.equal(store.getRequirementThread('REQ-A').threadId, 'thread-existing');
    const [run] = store.listRuns();
    assert.equal(run.status, 'failed');
    assert.equal(run.error, resumeError.message);
    store.close();
  }
});

test('requirement free-form runs use registered artifacts and the same requirement thread', async t => {
  const { codex, manager, root, store } = createFixture(t);
  const first = await manager.startReadOnlyRun({
    requirementId: 'REQ-A',
    prompt: '检查 A',
    files: ['prd/a.md'],
  });
  emitCompleted(codex, first, 'A result');
  const second = await manager.startReadOnlyRun({
    requirementId: 'REQ-A',
    prompt: '继续检查 A',
    files: [],
  });
  emitCompleted(codex, second, 'A follow-up');

  assert.equal(first.threadId, 'thread-1');
  assert.equal(second.threadId, 'thread-1');
  assert.equal(
    codex.calls.filter(call => call.method === 'thread/resume').length,
    1,
  );
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: 'REQ-A',
      prompt: '越权读取 B',
      files: ['prd/b.md'],
    }),
    /not registered/,
  );

  const unbound = await manager.startReadOnlyRun({
    requirementId: null,
    prompt: '检查相对路径',
    files: ['notes/readme.md'],
  });
  emitCompleted(codex, unbound, 'unbound result');
  await assert.rejects(
    () => manager.startReadOnlyRun({
      requirementId: null,
      prompt: '绝对路径不允许',
      files: [path.join(root, 'notes/readme.md')],
    }),
    /relative/,
  );
  assert.equal(codex.calls.some(call => JSON.stringify(call).includes('--last')), false);
});

test('invalid workflow output fails explicitly and preserves the raw text', async t => {
  const { codex, manager, store } = createFixture(t);
  const run = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'invalid result' },
  });
  emitCompleted(codex, run, '{"themes":[]}');

  const failed = store.getRun(run.id);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.result, '{"themes":[]}');
  assert.match(failed.error, /^Structured result rejected: .*duplicates/);
  assert.equal(store.getWorkflowResult(run.id), null);
});
