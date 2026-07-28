import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContextService } from '../../workbench/lib/context-service.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';

function temporaryDatabasePath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${crypto.randomUUID()}.sqlite`);
}

function addRequirement(store, id, title = id) {
  store.upsertRequirement({
    id,
    title,
    stage: 'PRD中',
    externalWait: '无外部等待',
  });
}

function addRun(store, id, requirementId) {
  store.createRun({
    id,
    requirementId,
    prompt: `workflow ${id}`,
    permission: 'read-only',
    status: 'completed',
  });
}

test('context only exposes registered artifacts for one requirement and rejects escapes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'context-root-'));
  const store = openDatabase(temporaryDatabasePath('context'));
  addRequirement(store, 'REQ-A', '广告接入');
  addRequirement(store, 'REQ-B', '云存档月卡');
  store.addArtifact({ id: 'ART-A', requirementId: 'REQ-A', kind: 'PRD', path: 'prd/ad.md' });
  store.addArtifact({
    id: 'ART-ESCAPE',
    requirementId: 'REQ-A',
    kind: 'Reference',
    path: '../outside.md',
  });
  store.addArtifact({
    id: 'ART-B',
    requirementId: 'REQ-B',
    kind: 'Demo',
    path: 'demos/cloud.html',
  });
  const service = new ContextService({ store, allowedRoot: root });

  const context = service.getRequirementContext('REQ-A');
  assert.equal(context.requirement.id, 'REQ-A');
  assert.deepEqual(
    context.artifacts.map(item => item.path).sort(),
    ['prd/ad.md', '../outside.md'].sort(),
  );
  assert.equal(context.artifacts.some(item => item.path.includes('cloud')), false);
  assert.deepEqual(
    service.authorizeFiles('REQ-A', ['prd/ad.md', 'prd/ad.md']).map(item => item.id),
    ['ART-A'],
  );
  assert.throws(
    () => service.authorizeFiles('REQ-A', ['demos/cloud.html']),
    /not registered/,
  );
  assert.throws(
    () => service.authorizeFiles('REQ-A', ['../outside.md']),
    /outside allowed root/,
  );
  assert.throws(() => service.getRequirementContext('REQ-MISSING'), /does not exist/);
  store.close();
});

test('thread binding is stable per requirement, unique across requirements, and survives migration reruns', () => {
  const dbPath = temporaryDatabasePath('thread');
  const store = openDatabase(dbPath);
  addRequirement(store, 'REQ-A');
  addRequirement(store, 'REQ-B');
  store.bindRequirementThread('REQ-A', 'thread-a');
  assert.equal(store.getRequirementThread('REQ-A').threadId, 'thread-a');
  assert.throws(() => store.bindRequirementThread('REQ-A', 'thread-other'), /UNIQUE/);
  assert.throws(() => store.bindRequirementThread('REQ-B', 'thread-a'), /UNIQUE/);
  store.close();

  const reopened = openDatabase(dbPath);
  assert.equal(reopened.getRequirementThread('REQ-A').threadId, 'thread-a');
  reopened.bindRequirementThread('REQ-B', 'thread-b');
  assert.equal(reopened.getRequirementThread('REQ-B').threadId, 'thread-b');
  reopened.close();
});

test('workflow results atomically persist and expose all three detail types', () => {
  const store = openDatabase(temporaryDatabasePath('workflow'));
  addRequirement(store, 'REQ-A');
  addRequirement(store, 'REQ-B');
  for (const runId of ['RUN-FEEDBACK', 'RUN-REVIEW', 'RUN-STRATEGY']) {
    addRun(store, runId, 'REQ-A');
  }

  store.saveWorkflowResult({
    id: 'RESULT-FEEDBACK',
    runId: 'RUN-FEEDBACK',
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    result: {
      candidates: [{
        title: '增加失败重试提示',
        evidence: '3 条反馈提及提交无响应',
        matchedRequirementId: 'REQ-B',
        suggestedPriority: 'P1',
      }],
    },
  });
  store.saveWorkflowResult({
    id: 'RESULT-REVIEW',
    runId: 'RUN-REVIEW',
    requirementId: 'REQ-A',
    workflowType: 'demo-prd-review',
    result: {
      findings: [{
        category: '异常流',
        location: '提交按钮',
        severity: '高',
        impact: '用户无法恢复',
        recommendation: '补充失败态与重试入口',
      }],
    },
  });
  store.saveWorkflowResult({
    id: 'RESULT-STRATEGY',
    runId: 'RUN-STRATEGY',
    requirementId: 'REQ-A',
    workflowType: 'issue-strategy',
    result: {
      essence: '降低提交失败的不确定性',
      mainFlow: '提交后展示进度与结果',
      exceptionPolicy: '失败可原地重试',
      boundaryPolicy: '不自动重复扣费',
      acceptanceCriteria: ['失败原因可见', '重试不重复扣费'],
      feishuSummary: '补齐提交失败恢复闭环',
    },
  });

  assert.deepEqual(
    store.getWorkflowResult('RUN-FEEDBACK').result.candidates[0],
    {
      title: '增加失败重试提示',
      evidence: '3 条反馈提及提交无响应',
      matchedRequirementId: 'REQ-B',
      suggestedPriority: 'P1',
    },
  );
  assert.deepEqual(
    store.listRequirementCandidates().map(item => ({
      requirementId: item.requirementId,
      title: item.title,
      matchedRequirementId: item.matchedRequirementId,
      suggestedPriority: item.suggestedPriority,
      status: item.status,
    })),
    [{
      requirementId: 'REQ-A',
      title: '增加失败重试提示',
      matchedRequirementId: 'REQ-B',
      suggestedPriority: 'P1',
      status: '待确认',
    }],
  );
  assert.deepEqual(
    store.listReviewFindings().map(item => ({
      requirementId: item.requirementId,
      category: item.category,
      location: item.location,
      severity: item.severity,
      impact: item.impact,
      recommendation: item.recommendation,
      status: item.status,
    })),
    [{
      requirementId: 'REQ-A',
      category: '异常流',
      location: '提交按钮',
      severity: '高',
      impact: '用户无法恢复',
      recommendation: '补充失败态与重试入口',
      status: '待确认',
    }],
  );
  assert.deepEqual(
    store.listProductStrategies().map(item => ({
      requirementId: item.requirementId,
      essence: item.essence,
      acceptanceCriteria: item.acceptanceCriteria,
      status: item.status,
    })),
    [{
      requirementId: 'REQ-A',
      essence: '降低提交失败的不确定性',
      acceptanceCriteria: ['失败原因可见', '重试不重复扣费'],
      status: '待确认',
    }],
  );
  store.close();
});

test('failed workflow detail insert rolls back parent and earlier details', () => {
  const store = openDatabase(temporaryDatabasePath('workflow-rollback'));
  addRequirement(store, 'REQ-A');
  addRun(store, 'RUN-BAD', 'REQ-A');

  assert.throws(
    () => store.saveWorkflowResult({
      id: 'RESULT-BAD',
      runId: 'RUN-BAD',
      requirementId: 'REQ-A',
      workflowType: 'feedback-triage',
      result: {
        candidates: [
          {
            title: '会先插入的候选',
            evidence: '证据一',
            matchedRequirementId: null,
            suggestedPriority: 'P2',
          },
          {
            title: '触发外键失败的候选',
            evidence: '证据二',
            matchedRequirementId: 'REQ-NOT-FOUND',
            suggestedPriority: 'P1',
          },
        ],
      },
    }),
    /FOREIGN KEY/,
  );
  assert.equal(store.getWorkflowResult('RUN-BAD'), null);
  assert.deepEqual(store.listRequirementCandidates(), []);
  store.close();
});
