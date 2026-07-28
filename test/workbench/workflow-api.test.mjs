import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWorkbenchServer } from '../../workbench/server.mjs';

const feedbackResult = {
  themes: [{ name: '启动失败', count: 1 }],
  duplicates: [],
  existingMatches: [],
  candidates: [{
    title: '修复启动失败',
    evidence: '1 条用户反馈',
    matchedRequirementId: null,
    suggestedPriority: 'P1',
  }],
  informationGaps: [],
};

const reviewResult = {
  summary: 'Demo 缺少异常态说明。',
  findings: [{
    category: '遗漏',
    location: 'Demo 启动按钮',
    severity: '严重',
    impact: '测试无法覆盖启动失败。',
    recommendation: '在 Demo 和 PRD 中补齐失败态。',
  }],
};

const strategyResult = {
  essence: '启动失败需要明确可恢复策略。',
  mainFlow: '用户重试后恢复启动。',
  exceptionPolicy: '连续失败时展示诊断入口。',
  boundaryPolicy: '离线状态不发起重试。',
  documentLocations: ['PRD/异常流程'],
  acceptanceCriteria: ['离线时展示明确提示'],
  feishuSummary: '补齐启动失败的恢复、异常和边界规则。',
};

class FakeCodex extends EventEmitter {
  calls = [];
  running = false;
  threadCount = 0;
  turnCount = 0;

  async start() {
    this.running = true;
  }

  async request(method, params) {
    this.calls.push({ method, params });
    if (method === 'thread/start') {
      return { thread: { id: `thread-workflow-${++this.threadCount}` } };
    }
    if (method === 'thread/resume') {
      return { thread: { id: params.threadId } };
    }
    if (method === 'turn/start') {
      return {
        turn: {
          id: `turn-workflow-${++this.turnCount}`,
          items: [],
          status: 'inProgress',
        },
      };
    }
    throw new Error(`Unexpected method: ${method}`);
  }

  diagnostics() {
    return { running: this.running, stderr: '' };
  }

  pid() {
    return 8642;
  }

  async stop() {
    this.running = false;
  }

  complete(run, result) {
    const text = JSON.stringify(result);
    const split = Math.floor(text.length / 2);
    for (const delta of [text.slice(0, split), text.slice(split)]) {
      this.emit('notification', {
        method: 'item/agentMessage/delta',
        params: {
          delta,
          itemId: `agent-${run.turnId}`,
          threadId: run.threadId,
          turnId: run.turnId,
        },
      });
    }
    this.emit('notification', {
      method: 'turn/completed',
      params: {
        threadId: run.threadId,
        turn: {
          id: run.turnId,
          items: [],
          status: 'completed',
        },
      },
    });
  }
}

async function startServer(t) {
  const root = path.join(os.tmpdir(), `workflow-api-${crypto.randomUUID()}`);
  const codex = new FakeCodex();
  const app = await createWorkbenchServer({
    env: { WORKBENCH_ROOT: root, WORKBENCH_PORT: '0' },
    codexFactory: () => codex,
  });
  await app.listen();
  t.after(async () => {
    await app.close();
    fs.rmSync(root, { force: true, recursive: true });
  });
  return {
    app,
    base: `http://127.0.0.1:${app.address().port}`,
    codex,
  };
}

function authorizedHeaders(app, extras = {}) {
  return {
    Origin: app.config.originForPort(app.address().port),
    Authorization: `Bearer ${app.config.sessionToken}`,
    ...extras,
  };
}

function requestStatus(url, headers) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const request = http.get({
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      headers,
    }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
  });
}

async function startWorkflow(base, headers, workflowType, body) {
  const response = await fetch(`${base}/api/workflows/${workflowType}/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 202);
  return response.json();
}

test('workflow APIs expose safe metadata and persist all structured detail types', async t => {
  const { app, base, codex } = await startServer(t);
  const headers = authorizedHeaders(app, { 'Content-Type': 'application/json' });

  const workflowsResponse = await fetch(`${base}/api/workflows`, { headers });
  assert.equal(workflowsResponse.status, 200);
  const workflows = await workflowsResponse.json();
  assert.deepEqual(
    workflows.map(workflow => workflow.id),
    ['feedback-triage', 'demo-prd-review', 'issue-strategy'],
  );
  for (const workflow of workflows) {
    assert.deepEqual(
      Object.keys(workflow).sort(),
      ['id', 'label', 'permission'],
    );
    assert.equal(workflow.permission, 'read-only');
  }

  const firstBootstrap = await (
    await fetch(`${base}/api/bootstrap`, { headers })
  ).json();
  const requirementId = firstBootstrap.artifacts.find(
    artifact => artifact.kind === 'Demo',
  ).requirementId;
  const contextResponse = await fetch(
    `${base}/api/requirements/${encodeURIComponent(requirementId)}/context`,
    { headers },
  );
  assert.equal(contextResponse.status, 200);
  const context = await contextResponse.json();
  assert.equal(context.requirement.id, requirementId);
  assert.deepEqual(
    context.artifacts.map(artifact => artifact.requirementId),
    context.artifacts.map(() => requirementId),
  );
  assert.equal(context.thread, null);

  const feedbackRun = await startWorkflow(
    base,
    headers,
    'feedback-triage',
    {
      requirementId,
      files: [],
      input: { feedbackText: '启动失败' },
    },
  );
  codex.complete(feedbackRun, feedbackResult);

  const feedbackResponse = await fetch(
    `${base}/api/runs/${encodeURIComponent(feedbackRun.id)}/workflow-result`,
    { headers },
  );
  assert.equal(feedbackResponse.status, 200);
  const feedbackArchive = await feedbackResponse.json();
  assert.equal(feedbackArchive.workflowType, 'feedback-triage');
  assert.equal(feedbackArchive.requirementId, requirementId);
  assert.deepEqual(feedbackArchive.result, feedbackResult);

  const reviewRun = await startWorkflow(
    base,
    headers,
    'demo-prd-review',
    {
      requirementId,
      files: context.artifacts.map(artifact => artifact.path),
      input: {},
    },
  );
  codex.complete(reviewRun, reviewResult);

  const strategyRun = await startWorkflow(
    base,
    headers,
    'issue-strategy',
    {
      requirementId,
      files: [],
      input: { issueText: '启动失败时产品规则不明确' },
    },
  );
  codex.complete(strategyRun, strategyResult);

  for (const [run, workflowType, result] of [
    [reviewRun, 'demo-prd-review', reviewResult],
    [strategyRun, 'issue-strategy', strategyResult],
  ]) {
    const response = await fetch(
      `${base}/api/runs/${encodeURIComponent(run.id)}/workflow-result`,
      { headers },
    );
    assert.equal(response.status, 200);
    const archive = await response.json();
    assert.equal(archive.workflowType, workflowType);
    assert.equal(archive.requirementId, requirementId);
    assert.deepEqual(archive.result, result);
  }

  const bootstrapResponse = await fetch(`${base}/api/bootstrap`, { headers });
  assert.equal(bootstrapResponse.status, 200);
  const bootstrap = await bootstrapResponse.json();
  for (const run of [feedbackRun, reviewRun, strategyRun]) {
    const persisted = bootstrap.runs.find(item => item.id === run.id);
    assert.equal(persisted.status, 'completed');
  }
  assert.equal(bootstrap.requirementCandidates.length, 1);
  assert.deepEqual(
    {
      requirementId: bootstrap.requirementCandidates[0].requirementId,
      title: bootstrap.requirementCandidates[0].title,
      evidence: bootstrap.requirementCandidates[0].evidence,
      matchedRequirementId:
        bootstrap.requirementCandidates[0].matchedRequirementId,
      suggestedPriority:
        bootstrap.requirementCandidates[0].suggestedPriority,
    },
    {
      requirementId,
      ...feedbackResult.candidates[0],
    },
  );
  assert.equal(bootstrap.reviewFindings.length, 1);
  assert.deepEqual(
    {
      requirementId: bootstrap.reviewFindings[0].requirementId,
      category: bootstrap.reviewFindings[0].category,
      location: bootstrap.reviewFindings[0].location,
      severity: bootstrap.reviewFindings[0].severity,
      impact: bootstrap.reviewFindings[0].impact,
      recommendation: bootstrap.reviewFindings[0].recommendation,
    },
    {
      requirementId,
      ...reviewResult.findings[0],
    },
  );
  assert.equal(bootstrap.productStrategies.length, 1);
  assert.deepEqual(
    {
      requirementId: bootstrap.productStrategies[0].requirementId,
      essence: bootstrap.productStrategies[0].essence,
      mainFlow: bootstrap.productStrategies[0].mainFlow,
      exceptionPolicy: bootstrap.productStrategies[0].exceptionPolicy,
      boundaryPolicy: bootstrap.productStrategies[0].boundaryPolicy,
      acceptanceCriteria:
        bootstrap.productStrategies[0].acceptanceCriteria,
      feishuSummary: bootstrap.productStrategies[0].feishuSummary,
    },
    {
      requirementId,
      essence: strategyResult.essence,
      mainFlow: strategyResult.mainFlow,
      exceptionPolicy: strategyResult.exceptionPolicy,
      boundaryPolicy: strategyResult.boundaryPolicy,
      acceptanceCriteria: strategyResult.acceptanceCriteria,
      feishuSummary: strategyResult.feishuSummary,
    },
  );
});

test('workflow routes reject unsafe requests, unknown fields, missing artifacts and missing results', async t => {
  const { app, base } = await startServer(t);
  const jsonHeaders = authorizedHeaders(app, {
    'Content-Type': 'application/json',
  });

  assert.equal((await fetch(`${base}/api/workflows`)).status, 401);
  assert.equal(
    await requestStatus(
      `${base}/api/workflows`,
      authorizedHeaders(app, { Host: 'evil.example' }),
    ),
    403,
  );
  assert.equal((await fetch(`${base}/api/workflows`, {
    headers: authorizedHeaders(app, { Origin: 'https://evil.example' }),
  })).status, 403);

  const bootstrap = await (
    await fetch(`${base}/api/bootstrap`, { headers: jsonHeaders })
  ).json();
  const requirementId = bootstrap.requirements[0].id;

  const extraField = await fetch(
    `${base}/api/workflows/feedback-triage/runs`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        requirementId,
        files: [],
        input: { feedbackText: '启动失败' },
        workflowType: 'issue-strategy',
      }),
    },
  );
  assert.equal(extraField.status, 400);
  assert.match((await extraField.json()).error, /workflowType.*not accepted/);

  const unknown = await fetch(`${base}/api/workflows/not-real/runs`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ requirementId, files: [], input: {} }),
  });
  assert.equal(unknown.status, 400);
  assert.match((await unknown.json()).error, /Unknown workflow type/);

  const missingArtifact = await fetch(
    `${base}/api/workflows/demo-prd-review/runs`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ requirementId, files: [], input: {} }),
    },
  );
  assert.equal(missingArtifact.status, 400);
  assert.match((await missingArtifact.json()).error, /Demo artifact is required/);

  const missingResult = await fetch(
    `${base}/api/runs/RUN-NOT-FOUND/workflow-result`,
    { headers: jsonHeaders },
  );
  assert.equal(missingResult.status, 404);
  assert.deepEqual(
    await missingResult.json(),
    { error: 'Workflow result not found' },
  );

  const oversized = await fetch(
    `${base}/api/workflows/feedback-triage/runs`,
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        requirementId,
        files: [],
        input: { feedbackText: 'x'.repeat(1_048_576) },
      }),
    },
  );
  assert.equal(oversized.status, 413);

  const malformedApiPath = await fetch(
    `${base}/api/requirements/%E0%A4%A/context`,
    { headers: jsonHeaders },
  );
  assert.equal(malformedApiPath.status, 400);
  const malformedStaticPath = await fetch(`${base}/%E0%A4%A`);
  assert.equal(malformedStaticPath.status, 404);
});
