import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWorkbenchServer } from '../../workbench/server.mjs';

class FakeCodex extends EventEmitter {
  constructor() {
    super();
    this.running = false;
  }

  async start() {
    this.running = true;
  }

  async request(method) {
    if (method === 'thread/start') return { thread: { id: 'thread-server-test' } };
    if (method === 'turn/start') return { turn: { id: 'turn-server-test' } };
    throw new Error(`Unexpected method: ${method}`);
  }

  diagnostics() {
    return { running: this.running, stderr: '' };
  }

  pid() {
    return 2468;
  }

  async stop() {
    this.running = false;
  }
}

async function startServer(t) {
  const root = path.join(os.tmpdir(), `workbench-server-${crypto.randomUUID()}`);
  fs.mkdirSync(root, { recursive: true });
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
  const address = app.address();
  const base = `http://127.0.0.1:${address.port}`;
  return { app, base, codex };
}

function authorizedHeaders(app, extras = {}) {
  const port = app.address().port;
  return {
    Origin: app.config.originForPort(port),
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

test('server binds loopback and protects bootstrap and health with Host, Origin and Bearer', async t => {
  const { app, base } = await startServer(t);
  assert.equal(app.address().address, '127.0.0.1');

  assert.equal((await fetch(`${base}/api/bootstrap`)).status, 401);
  assert.equal(
    await requestStatus(
      `${base}/api/bootstrap`,
      authorizedHeaders(app, { Host: 'evil.example' }),
    ),
    403,
  );
  assert.equal((await fetch(`${base}/api/bootstrap`, {
    headers: authorizedHeaders(app, { Origin: 'https://evil.example' }),
  })).status, 403);

  const response = await fetch(`${base}/api/bootstrap`, {
    headers: authorizedHeaders(app),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.capabilities.permissions, ['read-only']);
  assert.equal(payload.requirements.length, 3);
  assert.equal(payload.requirements[0].stage.length > 0, true);
  assert.equal(payload.requirements[0].externalWait.length > 0, true);
  assert.equal(payload.manualTasks[0].assigneeNote, '产品专员A');
  assert.equal(payload.health.broker, 'ok');
  assert.equal(payload.health.database, 'ok');
  assert.equal(payload.health.codex, 'ok');

  const health = await fetch(`${base}/api/health`, {
    headers: authorizedHeaders(app),
  });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).broker, 'ok');
});

test('Run API accepts only read-only input and enforces the 1MB JSON limit', async t => {
  const { app, base } = await startServer(t);
  const headers = authorizedHeaders(app, { 'Content-Type': 'application/json' });

  const response = await fetch(`${base}/api/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirementId: 'REQ-001',
      prompt: '检查需求是否遗漏异常场景',
      files: [],
    }),
  });
  assert.equal(response.status, 202);
  const run = await response.json();
  assert.equal(run.permission, 'read-only');
  assert.equal(run.status, 'running');
  assert.equal(run.cwd, app.config.allowedRoot);

  const elevated = await fetch(`${base}/api/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: '修改文件',
      files: [],
      permission: 'modify-existing',
    }),
  });
  assert.equal(elevated.status, 400);
  assert.match((await elevated.json()).error, /not accepted for a read-only run/);

  const oversized = await fetch(`${base}/api/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: 'x'.repeat(1_048_576) }),
  });
  assert.equal(oversized.status, 413);
});

test('requirement and product-specialist APIs update only workflow fields and task notes', async t => {
  const { app, base } = await startServer(t);
  const headers = authorizedHeaders(app, { 'Content-Type': 'application/json' });

  const requirementResponse = await fetch(`${base}/api/requirements/REQ-001`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      stage: '待外部确认',
      externalWait: '等待领导确认',
    }),
  });
  assert.equal(requirementResponse.status, 200);
  const requirement = await requirementResponse.json();
  assert.equal(requirement.stage, '待外部确认');
  assert.equal(requirement.externalWait, '等待领导确认');

  const createResponse = await fetch(`${base}/api/manual-tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirementId: 'REQ-001',
      assigneeNote: '产品专员A',
      description: '补充竞品截图',
      dueAt: '2026-07-30',
      expectedDeliverable: '3张带来源截图',
      currentNote: '等待收集',
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.status, '待开始');

  const updateResponse = await fetch(`${base}/api/manual-tasks/${created.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      assigneeNote: '产品专员B',
      description: '不应覆盖原任务',
      currentNote: '已经补齐3张截图',
      status: '已完成',
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.assigneeNote, '产品专员A');
  assert.equal(updated.description, '补充竞品截图');
  assert.equal(updated.currentNote, '已经补齐3张截图');
  assert.equal(updated.status, '已完成');
});

test('SSE accepts a route-scoped query token, keeps origin checks and replays after Last-Event-ID', async t => {
  const { app, base, codex } = await startServer(t);
  const runResponse = await fetch(`${base}/api/runs`, {
    method: 'POST',
    headers: authorizedHeaders(app, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prompt: '回放事件', files: [] }),
  });
  assert.equal(runResponse.status, 202);
  const run = await runResponse.json();

  codex.emit('notification', {
    method: 'item/agentMessage/delta',
    params: {
      threadId: 'thread-server-test',
      turnId: 'turn-server-test',
      itemId: 'agent-1',
      delta: '第一段',
    },
  });
  codex.emit('notification', {
    method: 'item/agentMessage/delta',
    params: {
      threadId: 'thread-server-test',
      turnId: 'turn-server-test',
      itemId: 'agent-1',
      delta: '第二段',
    },
  });
  codex.emit('notification', {
    method: 'turn/completed',
    params: {
      threadId: 'thread-server-test',
      turn: { id: 'turn-server-test', status: 'completed' },
    },
  });

  const eventPath = `/api/runs/${run.id}/events`;
  assert.equal((await fetch(`${base}${eventPath}`, {
    headers: { Origin: app.config.originForPort(app.address().port) },
  })).status, 401);
  assert.equal((await fetch(`${base}${eventPath}?token=wrong`, {
    headers: { Origin: app.config.originForPort(app.address().port) },
  })).status, 401);
  assert.equal((await fetch(
    `${base}${eventPath}?token=${encodeURIComponent(app.config.sessionToken)}`,
    { headers: { Origin: 'https://evil.example' } },
  )).status, 403);
  assert.equal((await fetch(
    `${base}${eventPath}?token=${encodeURIComponent(app.config.sessionToken)}`,
    { headers: { 'Sec-Fetch-Site': 'cross-site' } },
  )).status, 403);

  const replay = await fetch(
    `${base}${eventPath}?token=${encodeURIComponent(app.config.sessionToken)}`,
    {
      headers: {
        Origin: app.config.originForPort(app.address().port),
        'Last-Event-ID': '1',
      },
    },
  );
  assert.equal(replay.status, 200);
  assert.match(replay.headers.get('content-type'), /^text\/event-stream/);
  const body = await replay.text();
  assert.doesNotMatch(body, /id: 1\n/);
  assert.match(body, /id: 2\nevent: item\/agentMessage\/delta/);
  assert.match(body, /id: 3\nevent: turn\/completed/);
  assert.match(body, /event: run\.status/);
  assert.match(body, /"status":"completed"/);
});

test('unknown and traversal-like static paths return a safe 404', async t => {
  const { base } = await startServer(t);
  for (const pathname of [
    '/missing-file.js',
    '/..%5cpackage.json',
    '/%2e%2e%5cpackage.json',
  ]) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Static file not found' });
  }
});
