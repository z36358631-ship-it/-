import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../../workbench/lib/database.mjs';

function temporaryDatabasePath() {
  return path.join(os.tmpdir(), `workbench-${crypto.randomUUID()}.sqlite`);
}

test('database persists requirements, artifacts, runs and ordered events', () => {
  const dbPath = temporaryDatabasePath();
  const store = openDatabase(dbPath);
  store.upsertRequirement({
    id: 'REQ-001',
    title: 'Android广告接入',
    stage: 'PRD中',
    externalWait: '等待运营反馈',
  });
  store.addArtifact({
    id: 'ART-001',
    requirementId: 'REQ-001',
    kind: 'PRD',
    path: 'prd/android-ad.md',
  });
  store.createRun({
    id: 'RUN-001',
    requirementId: 'REQ-001',
    prompt: '检查文档遗漏',
    cwd: 'C:\\workspace\\android-ad',
    processPid: 4101,
    permission: 'read-only',
    status: 'running',
  });
  store.saveRunContext('RUN-001', {
    files: ['prd/android-ad.md'],
    input: { source: '需求详情' },
  });
  store.bindProtocolIds('RUN-001', 'thread-001', 'turn-001', 4202);
  store.appendRunEvent('RUN-001', 'agent_message_delta', { text: '发现一个问题' });
  store.appendRunEvent('RUN-001', 'turn_completed', { usage: 12 });
  store.finishRun('RUN-001', 'completed', '发现一个问题');
  store.createRun({
    id: 'RUN-CANDIDATE',
    requirementId: 'REQ-001',
    prompt: '生成候选文件',
    permission: 'generate-candidate',
    status: 'waiting-approval',
  });
  store.createRun({
    id: 'RUN-MODIFY',
    requirementId: null,
    prompt: '修改已有文件',
    permission: 'modify-existing',
    status: 'waiting-approval',
  });
  store.upsertManualTask({
    id: 'MANUAL-001',
    requirementId: 'REQ-001',
    assigneeNote: '产品专员A',
    description: '补充竞品截图',
    dueAt: '2026-07-30',
    expectedDeliverable: '3张带来源截图',
    currentNote: '已收集2张',
    status: '进行中',
  });

  assert.equal(store.listRequirements().length, 1);
  assert.equal(store.listArtifacts('REQ-001')[0].path, 'prd/android-ad.md');
  assert.deepEqual(store.getRunContext('RUN-001').files, ['prd/android-ad.md']);
  assert.deepEqual(
    store.listRunEvents('RUN-001').map(event => event.sequence),
    [1, 2],
  );
  assert.deepEqual(
    store.listRunEvents('RUN-001', 1).map(event => event.payload),
    [{ usage: 12 }],
  );
  assert.equal(store.listManualTasks('REQ-001')[0].assigneeNote, '产品专员A');
  assert.equal(store.getManualTask('MANUAL-001').expectedDeliverable, '3张带来源截图');
  assert.equal(store.countActiveRuns(), 2);
  store.close();

  const reopened = openDatabase(dbPath);
  const persistedRun = reopened.getRun('RUN-001');
  assert.equal(persistedRun.status, 'completed');
  assert.equal(persistedRun.result, '发现一个问题');
  assert.equal(persistedRun.cwd, 'C:\\workspace\\android-ad');
  assert.equal(persistedRun.processPid, 4202);
  assert.equal(persistedRun.threadId, 'thread-001');
  assert.equal(persistedRun.turnId, 'turn-001');
  assert.equal(reopened.listRuns().length, 3);
  assert.deepEqual(
    [reopened.getRun('RUN-001'), reopened.getRun('RUN-CANDIDATE'), reopened.getRun('RUN-MODIFY')]
      .map(run => run.permission),
    ['read-only', 'generate-candidate', 'modify-existing'],
  );
  assert.equal(reopened.getRun('RUN-CANDIDATE').status, 'waiting-approval');
  assert.equal(reopened.listRequirements()[0].externalWait, '等待运营反馈');
  assert.equal(reopened.listArtifacts()[0].requirementId, 'REQ-001');
  assert.deepEqual(reopened.getRunContext('RUN-001').input, { source: '需求详情' });
  assert.equal(reopened.listRunEvents('RUN-001')[0].payload.text, '发现一个问题');
  assert.equal(reopened.listManualTasks()[0].currentNote, '已收集2张');
  reopened.close();
});

test('startup marks stale queued and running rows as interrupted', () => {
  const dbPath = temporaryDatabasePath();
  const first = openDatabase(dbPath);
  first.createRun({
    id: 'RUN-QUEUED',
    requirementId: null,
    prompt: '等待执行',
    permission: 'read-only',
    status: 'queued',
  });
  first.createRun({
    id: 'RUN-STALE',
    requirementId: null,
    prompt: '总结今天工作',
    permission: 'read-only',
    status: 'running',
  });
  first.close();

  const second = openDatabase(dbPath);
  for (const id of ['RUN-QUEUED', 'RUN-STALE']) {
    const run = second.getRun(id);
    assert.equal(run.status, 'interrupted');
    assert.equal(run.error, 'Broker restarted before the run completed');
    assert.match(run.finishedAt, /^\d{4}-\d{2}-\d{2}T/);
  }
  second.close();
});
