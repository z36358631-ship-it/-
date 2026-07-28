import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
  const processNonce = 'c'.repeat(64);
  store.bindProtocolIds('RUN-001', 'thread-001', 'turn-001', 4202, processNonce);
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
  assert.equal(persistedRun.processNonce, processNonce);
  assert.equal(persistedRun.threadId, 'thread-001');
  assert.equal(persistedRun.turnId, 'turn-001');
  assert.equal(reopened.listRuns().length, 3);
  assert.deepEqual(
    [reopened.getRun('RUN-001'), reopened.getRun('RUN-CANDIDATE'), reopened.getRun('RUN-MODIFY')]
      .map(run => run.permission),
    ['read-only', 'generate-candidate', 'modify-existing'],
  );
  assert.equal(reopened.getRun('RUN-CANDIDATE').status, 'interrupted');
  assert.equal(reopened.listRequirements()[0].externalWait, '等待运营反馈');
  assert.equal(reopened.listArtifacts()[0].requirementId, 'REQ-001');
  assert.deepEqual(reopened.getRunContext('RUN-001').input, { source: '需求详情' });
  assert.equal(reopened.listRunEvents('RUN-001')[0].payload.text, '发现一个问题');
  assert.equal(reopened.listManualTasks()[0].currentNote, '已收集2张');
  reopened.close();
});

test('startup captures only newly stale active rows once and marks every active state interrupted', () => {
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
  first.createRun({
    id: 'RUN-WAITING',
    requirementId: null,
    prompt: '等待审批',
    permission: 'modify-existing',
    status: 'waiting-approval',
  });
  first.createRun({
    id: 'RUN-HISTORICAL',
    requirementId: null,
    prompt: '历史中断',
    processPid: 9999,
    processNonce: 'd'.repeat(64),
    permission: 'read-only',
    status: 'interrupted',
  });
  first.close();

  const second = openDatabase(dbPath);
  assert.deepEqual(
    second.listStartupInterruptedRuns().map(run => run.id).sort(),
    ['RUN-QUEUED', 'RUN-STALE', 'RUN-WAITING'],
  );
  assert.deepEqual(second.listStartupInterruptedRuns(), []);
  for (const id of ['RUN-QUEUED', 'RUN-STALE', 'RUN-WAITING']) {
    const run = second.getRun(id);
    assert.equal(run.status, 'interrupted');
    assert.equal(run.error, 'Broker restarted before the run completed');
    assert.match(run.finishedAt, /^\d{4}-\d{2}-\d{2}T/);
  }
  assert.equal(second.getRun('RUN-HISTORICAL').status, 'interrupted');
  second.close();

  const third = openDatabase(dbPath);
  assert.deepEqual(third.listStartupInterruptedRuns(), []);
  third.close();
});

function createSafetyRun(store, runId = 'RUN-SAFETY') {
  store.upsertRequirement({
    id: 'REQ-SAFETY',
    title: '文件安全',
    stage: 'PRD中',
    externalWait: '无外部等待',
  });
  store.createRun({
    id: runId,
    requirementId: 'REQ-SAFETY',
    prompt: '修改目标文件',
    permission: 'modify-existing',
    status: 'running',
    workflowType: null,
  });
}

test('database persists and upserts file safety records across repeatable migrations', () => {
  const dbPath = temporaryDatabasePath();
  const store = openDatabase(dbPath);
  createSafetyRun(store);
  store.bindRequirementThread('REQ-SAFETY', 'thread-safety');
  store.addArtifact({
    id: 'ART-SAFETY',
    requirementId: 'REQ-SAFETY',
    kind: 'PRD',
    path: 'prd/a.md',
  });
  store.addArtifact({
    id: 'ART-SAFETY-OTHER',
    requirementId: 'REQ-SAFETY',
    kind: 'PRD',
    path: 'prd/b.md',
  });
  assert.equal(store.removeArtifact('REQ-SAFETY', 'prd/a.md'), true);
  assert.deepEqual(
    store.listArtifacts('REQ-SAFETY').map(item => item.path),
    ['prd/b.md'],
  );
  assert.equal(store.removeArtifact('REQ-SAFETY', 'prd/b.md'), true);
  assert.equal(store.listArtifacts('REQ-SAFETY').length, 0);
  assert.equal(store.setRunStatus('RUN-SAFETY', 'waiting-approval'), true);
  assert.equal(store.setRunStatus('RUN-MISSING', 'completed'), false);

  store.saveFileSnapshot('RUN-SAFETY', {
    path: 'prd/a.md',
    absolutePath: 'C:/workspace/prd/a.md',
    existed: true,
    contentBase64: 'YWJj',
    hash: 'before-v1',
  });
  store.saveFileSnapshot('RUN-SAFETY', {
    path: 'prd/a.md',
    absolutePath: 'C:/workspace/prd/a.md',
    existed: true,
    contentBase64: 'ZGVm',
    hash: 'before-v2',
  });
  assert.equal(store.listFileSnapshots('RUN-SAFETY').length, 1);
  assert.equal(store.listFileSnapshots('RUN-SAFETY')[0].hash, 'before-v2');

  store.saveFileChange('RUN-SAFETY', {
    path: 'prd/a.md',
    absolutePath: 'C:/workspace/prd/a.md',
    kind: 'modified',
    beforeHash: 'before-v2',
    afterHash: 'after-v1',
    diff: '-a\n+b',
  });
  assert.equal(store.markChangesRestored('RUN-SAFETY'), 1);
  assert.match(store.listFileChanges('RUN-SAFETY')[0].restoredAt, /^\d{4}-\d{2}-\d{2}T/);
  store.saveFileChange('RUN-SAFETY', {
    path: 'prd/a.md',
    absolutePath: 'C:/workspace/prd/a.md',
    kind: 'modified',
    beforeHash: 'before-v2',
    afterHash: 'after-v2',
    diff: '-a\n+c',
  });
  assert.equal(store.listFileChanges('RUN-SAFETY').length, 1);
  assert.equal(store.listFileChanges('RUN-SAFETY')[0].afterHash, 'after-v2');
  assert.equal(store.listFileChanges('RUN-SAFETY')[0].restoredAt, null);
  assert.equal(store.markChangesRestored('RUN-SAFETY'), 1);

  store.createApproval({
    id: 'APP-APPROVED',
    runId: 'RUN-SAFETY',
    protocolRequestId: 88,
    kind: 'file-change',
    summary: '修改 prd/a.md',
    payload: { paths: ['prd/a.md'] },
  });
  store.createApproval({
    id: 'APP-REJECTED',
    runId: 'RUN-SAFETY',
    protocolRequestId: '89',
    kind: 'file-delete',
    summary: '删除 prd/a.md',
    payload: { deletion: true },
  });
  assert.equal(store.listPendingApprovals('RUN-SAFETY').length, 2);
  assert.equal(store.resolveApproval('APP-APPROVED', 'approved'), true);
  const firstResolution = store.getApproval('APP-APPROVED').resolvedAt;
  assert.equal(store.resolveApproval('APP-APPROVED', 'rejected'), false);
  assert.equal(store.getApproval('APP-APPROVED').status, 'approved');
  assert.equal(store.getApproval('APP-APPROVED').resolvedAt, firstResolution);
  assert.equal(store.resolveApproval('APP-REJECTED', 'rejected'), true);
  assert.equal(store.listPendingApprovals('RUN-SAFETY').length, 0);

  assert.deepEqual(
    store.getRunApplyState('RUN-SAFETY'),
    { state: 'not-started', updatedAt: null },
  );
  store.setRunApplyState('RUN-SAFETY', 'applying');
  for (const validation of [
    { name: 'contract', status: 'passed', detail: '12 tests passed' },
    { name: 'visual', status: 'failed', detail: '1 screenshot differs' },
    { name: 'optional', status: 'skipped', detail: 'not requested' },
  ]) {
    store.saveValidation('RUN-SAFETY', validation);
  }
  store.close();

  const reopened = openDatabase(dbPath);
  assert.equal(reopened.getRun('RUN-SAFETY').status, 'interrupted');
  assert.equal(reopened.getRequirementThread('REQ-SAFETY').threadId, 'thread-safety');
  assert.equal(reopened.listFileSnapshots('RUN-SAFETY')[0].contentBase64, 'ZGVm');
  assert.equal(reopened.listFileChanges('RUN-SAFETY')[0].afterHash, 'after-v2');
  assert.match(reopened.listFileChanges('RUN-SAFETY')[0].restoredAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(reopened.getApproval('APP-APPROVED').payload, { paths: ['prd/a.md'] });
  assert.deepEqual(
    reopened.listApprovals('RUN-SAFETY').map(item => item.status),
    ['approved', 'rejected'],
  );
  assert.equal(reopened.getRunApplyState('RUN-SAFETY').state, 'applying');
  assert.deepEqual(
    reopened.listValidations('RUN-SAFETY').map(item => item.status),
    ['passed', 'failed', 'skipped'],
  );
  reopened.setRunApplyState('RUN-SAFETY', 'applied');
  reopened.close();

  const migratedAgain = openDatabase(dbPath);
  assert.equal(migratedAgain.getRunApplyState('RUN-SAFETY').state, 'applied');
  assert.equal(migratedAgain.listFileSnapshots('RUN-SAFETY').length, 1);
  migratedAgain.close();
});

test('single file restoration state uses CAS and survives reopening', () => {
  const dbPath = temporaryDatabasePath();
  const store = openDatabase(dbPath);
  createSafetyRun(store, 'RUN-PARTIAL-RESTORE');
  for (const filePath of ['prd/a.md', 'prd/b.md']) {
    store.saveFileChange('RUN-PARTIAL-RESTORE', {
      path: filePath,
      absolutePath: `C:/workspace/${filePath}`,
      kind: 'created',
      beforeHash: null,
      afterHash: `after-${filePath}`,
      diff: `+${filePath}`,
    });
  }

  assert.equal(
    store.markFileChangeRestored('RUN-PARTIAL-RESTORE', 'prd/a.md'),
    true,
  );
  const firstTimestamp = store
    .listFileChanges('RUN-PARTIAL-RESTORE')
    .find(change => change.path === 'prd/a.md')
    .restoredAt;
  assert.match(firstTimestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(
    store.markFileChangeRestored('RUN-PARTIAL-RESTORE', 'prd/a.md'),
    false,
  );
  assert.equal(
    store.markFileChangeRestored('RUN-PARTIAL-RESTORE', 'prd/missing.md'),
    false,
  );
  store.close();

  const reopened = openDatabase(dbPath);
  const reopenedChanges = reopened.listFileChanges('RUN-PARTIAL-RESTORE');
  assert.equal(
    reopenedChanges.find(change => change.path === 'prd/a.md').restoredAt,
    firstTimestamp,
  );
  assert.equal(
    reopenedChanges.find(change => change.path === 'prd/b.md').restoredAt,
    null,
  );
  assert.equal(
    reopened.markFileChangeRestored('RUN-PARTIAL-RESTORE', 'prd/b.md'),
    true,
  );
  assert(reopened.listFileChanges('RUN-PARTIAL-RESTORE').every(
    change => typeof change.restoredAt === 'string',
  ));
  reopened.close();
});

test('file safety status constraints reject invalid transitions and values', () => {
  const dbPath = temporaryDatabasePath();
  const store = openDatabase(dbPath);
  createSafetyRun(store, 'RUN-CONSTRAINTS');
  store.finishRun('RUN-CONSTRAINTS', 'completed');
  store.createApproval({
    id: 'APP-CONSTRAINTS',
    runId: 'RUN-CONSTRAINTS',
    protocolRequestId: 90,
    kind: 'file-change',
    summary: '修改文件',
    payload: {},
  });
  assert.throws(
    () => store.resolveApproval('APP-CONSTRAINTS', 'pending'),
    /approved or rejected/,
  );
  assert.equal(store.resolveApproval('MISSING-APPROVAL', 'approved'), false);
  assert.throws(
    () => store.setRunApplyState('RUN-CONSTRAINTS', 'unknown'),
    /CHECK constraint failed/,
  );
  assert.throws(
    () => store.saveValidation('RUN-CONSTRAINTS', {
      name: 'bad',
      status: 'unknown',
      detail: 'invalid',
    }),
    /CHECK constraint failed/,
  );
  assert.throws(
    () => store.setRunStatus('RUN-CONSTRAINTS', 'unknown'),
    /CHECK constraint failed/,
  );
  store.close();

  const raw = new DatabaseSync(dbPath);
  assert.throws(
    () => raw.prepare(`UPDATE approvals SET status='unknown' WHERE id='APP-CONSTRAINTS'`).run(),
    /CHECK constraint failed/,
  );
  raw.close();
});

test('approval payload corruption fails with an explicit JSON error', () => {
  const dbPath = temporaryDatabasePath();
  const store = openDatabase(dbPath);
  createSafetyRun(store, 'RUN-CORRUPT');
  store.finishRun('RUN-CORRUPT', 'completed');
  store.createApproval({
    id: 'APP-CORRUPT',
    runId: 'RUN-CORRUPT',
    protocolRequestId: 91,
    kind: 'file-change',
    summary: '损坏数据测试',
    payload: { paths: [] },
  });
  store.close();

  const raw = new DatabaseSync(dbPath);
  raw.prepare(`UPDATE approvals SET payload_json='{bad json' WHERE id='APP-CORRUPT'`).run();
  raw.close();

  const reopened = openDatabase(dbPath);
  assert.throws(
    () => reopened.getApproval('APP-CORRUPT'),
    /Invalid JSON stored for approval APP-CORRUPT payload/,
  );
  assert.throws(
    () => reopened.listPendingApprovals('RUN-CORRUPT'),
    /Invalid JSON stored for approval APP-CORRUPT payload/,
  );
  reopened.close();
});

test('deleting a run cascades every file safety record', () => {
  const dbPath = temporaryDatabasePath();
  const store = openDatabase(dbPath);
  createSafetyRun(store, 'RUN-CASCADE');
  store.finishRun('RUN-CASCADE', 'completed');
  store.saveFileSnapshot('RUN-CASCADE', {
    path: 'prd/a.md',
    absolutePath: 'C:/workspace/prd/a.md',
    existed: false,
    contentBase64: null,
    hash: null,
  });
  store.saveFileChange('RUN-CASCADE', {
    path: 'prd/a.md',
    absolutePath: 'C:/workspace/prd/a.md',
    kind: 'created',
    beforeHash: null,
    afterHash: 'after',
    diff: '+a',
  });
  store.createApproval({
    id: 'APP-CASCADE',
    runId: 'RUN-CASCADE',
    protocolRequestId: 92,
    kind: 'file-change',
    summary: '创建文件',
    payload: {},
  });
  store.setRunApplyState('RUN-CASCADE', 'applied');
  store.saveValidation('RUN-CASCADE', {
    name: 'contract',
    status: 'passed',
    detail: 'ok',
  });
  store.close();

  const raw = new DatabaseSync(dbPath);
  raw.exec('PRAGMA foreign_keys = ON');
  raw.prepare(`DELETE FROM runs WHERE id='RUN-CASCADE'`).run();
  for (const table of [
    'file_snapshots',
    'file_changes',
    'approvals',
    'run_apply_states',
    'validations',
  ]) {
    assert.equal(raw.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0);
  }
  raw.close();

  const reopened = openDatabase(dbPath);
  assert.equal(reopened.listFileSnapshots('RUN-CASCADE').length, 0);
  assert.equal(reopened.listFileChanges('RUN-CASCADE').length, 0);
  assert.equal(reopened.getApproval('APP-CASCADE'), null);
  assert.deepEqual(
    reopened.getRunApplyState('RUN-CASCADE'),
    { state: 'not-started', updatedAt: null },
  );
  assert.equal(reopened.listValidations('RUN-CASCADE').length, 0);
  reopened.close();
});

test('older runs schemas fail clearly instead of being rebuilt', () => {
  const dbPath = temporaryDatabasePath();
  const raw = new DatabaseSync(dbPath);
  raw.exec(`
    CREATE TABLE runs (
      id TEXT PRIMARY KEY,
      permission TEXT NOT NULL CHECK(permission IN ('read-only')),
      status TEXT NOT NULL CHECK(status IN ('queued','running'))
    );
  `);
  raw.close();
  assert.throws(
    () => openDatabase(dbPath),
    /Database runs schema is older than the file-safety plan: missing generate-candidate/,
  );
});
