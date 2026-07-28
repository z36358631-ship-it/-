import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { FileSafety } from '../../workbench/lib/file-safety.mjs';
import { createWorkbenchServer } from '../../workbench/server.mjs';

class FakeCodex extends EventEmitter {
  constructor() {
    super();
    this.calls = [];
    this.responses = [];
    this.threadSequence = 0;
    this.turnSequence = 0;
  }

  async start() {}

  diagnostics() {
    return { running: true, stderr: '' };
  }

  async stop() {}

  async request(method, params) {
    this.calls.push({ method, params });
    if (method === 'thread/start') {
      this.threadSequence += 1;
      return { thread: { id: `thread-${this.threadSequence}` } };
    }
    if (method === 'thread/resume') {
      return { thread: { id: params.threadId } };
    }
    if (method === 'turn/start') {
      this.turnSequence += 1;
      return { turn: { id: `turn-${this.turnSequence}` } };
    }
    if (method === 'turn/interrupt') return {};
    throw new Error(`Unexpected Codex request: ${method}`);
  }

  respond(id, result) {
    this.responses.push({ id, result });
  }

  pid() {
    return null;
  }
}

async function setupServer(t, { root = null, codex = new FakeCodex() } = {}) {
  const allowedRoot = root || fs.mkdtempSync(path.join(os.tmpdir(), 'file-api-'));
  fs.mkdirSync(path.join(allowedRoot, 'prd'), { recursive: true });
  const app = await createWorkbenchServer({
    env: { WORKBENCH_ROOT: allowedRoot, WORKBENCH_PORT: '0' },
    codexFactory: () => codex,
  });
  await app.listen();
  const base = `http://127.0.0.1:${app.address().port}`;
  const headers = {
    Authorization: `Bearer ${app.config.sessionToken}`,
    'Content-Type': 'application/json',
    Origin: app.config.originForPort(app.address().port),
  };
  const bootstrap = await requestJson({ base, headers }, '/api/bootstrap');
  const context = {
    allowedRoot,
    app,
    base,
    bootstrap: bootstrap.body,
    codex,
    headers,
    requirementId: bootstrap.body.requirements[0].id,
  };
  t.after(async () => {
    await app.close();
    fs.rmSync(allowedRoot, { force: true, recursive: true });
  });
  return context;
}

async function requestJson(
  context,
  pathname,
  {
    body,
    headers = {},
    method = 'GET',
    rawBody,
  } = {},
) {
  const response = await fetch(`${context.base}${pathname}`, {
    body: rawBody === undefined
      ? body === undefined ? undefined : JSON.stringify(body)
      : rawBody,
    headers: { ...context.headers, ...headers },
    method,
  });
  return {
    body: await response.json(),
    response,
  };
}

async function startCandidate(context, target = 'prd/candidate.md') {
  const targets = Array.isArray(target) ? target : [target];
  const result = await requestJson(context, '/api/runs/write', {
    method: 'POST',
    body: {
      permission: 'generate-candidate',
      prompt: 'Generate a candidate document',
      requirementId: context.requirementId,
      targets,
    },
  });
  const turnCall = context.codex.calls
    .filter(call => call.method === 'turn/start')
    .at(-1);
  return {
    response: result.response,
    run: result.body,
    stagingRoot: turnCall?.params.cwd,
    target: targets[0],
    targets,
    threadId: turnCall?.params.threadId,
    turnId: `turn-${context.codex.turnSequence}`,
  };
}

function requestSafeFileApproval(context, runInfo, requestId = 'approval-safe') {
  const itemId = `item-${crypto.randomUUID()}`;
  context.codex.emit('notification', {
    method: 'item/started',
    params: {
      item: {
        changes: [{
          diff: '+candidate',
          kind: { type: 'add' },
          path: runInfo.target,
        }],
        id: itemId,
        status: 'inProgress',
        type: 'fileChange',
      },
      threadId: runInfo.threadId,
      turnId: runInfo.turnId,
    },
  });
  context.codex.emit('request', {
    id: requestId,
    method: 'item/fileChange/requestApproval',
    params: {
      itemId,
      startedAtMs: Date.now(),
      threadId: runInfo.threadId,
      turnId: runInfo.turnId,
    },
  });
}

function requestDangerousCommandApproval(context, runInfo, requestId = 'approval-command') {
  context.codex.emit('request', {
    id: requestId,
    method: 'item/commandExecution/requestApproval',
    params: {
      command: 'git push',
      itemId: `item-${crypto.randomUUID()}`,
      startedAtMs: Date.now(),
      threadId: runInfo.threadId,
      turnId: runInfo.turnId,
    },
  });
}

function completeCandidate(context, runInfo, content = 'candidate\n') {
  for (const relativePath of runInfo.targets) {
    const target = path.join(runInfo.stagingRoot, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const fileContent = typeof content === 'object'
      ? content[relativePath]
      : content;
    fs.writeFileSync(target, fileContent, 'utf8');
  }
  context.codex.emit('notification', {
    method: 'turn/completed',
    params: {
      threadId: runInfo.threadId,
      turn: { id: runInfo.turnId, status: 'completed' },
    },
  });
}

test('write and detail routes enforce auth, body limits, relative targets, and exact fields', async t => {
  const context = await setupServer(t);
  const noAuthHeaders = { ...context.headers };
  delete noAuthHeaders.Authorization;
  const unauthorized = await fetch(`${context.base}/api/runs/write`, {
    body: JSON.stringify({}),
    headers: noAuthHeaders,
    method: 'POST',
  });
  assert.equal(unauthorized.status, 401);

  const oversized = await requestJson(context, '/api/runs/write', {
    method: 'POST',
    rawBody: JSON.stringify({
      permission: 'generate-candidate',
      prompt: 'x'.repeat(1_048_576),
      requirementId: context.requirementId,
      targets: ['prd/candidate.md'],
    }),
  });
  assert.equal(oversized.response.status, 413);

  const absolute = await requestJson(context, '/api/runs/write', {
    method: 'POST',
    body: {
      permission: 'generate-candidate',
      prompt: 'Unsafe absolute target',
      requirementId: context.requirementId,
      targets: [path.resolve(context.allowedRoot, '..', 'unsafe.md')],
    },
  });
  assert.equal(absolute.response.status, 400);

  const extraField = await requestJson(context, '/api/runs/write', {
    method: 'POST',
    body: {
      command: 'git push',
      permission: 'generate-candidate',
      prompt: 'Unexpected command field',
      requirementId: context.requirementId,
      targets: ['prd/candidate.md'],
    },
  });
  assert.equal(extraField.response.status, 400);

  const started = await startCandidate(context);
  assert.equal(started.response.status, 202);
  const detail = await requestJson(context, `/api/runs/${encodeURIComponent(started.run.id)}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.id, started.run.id);
  assert.deepEqual(detail.body.events, []);
  assert.deepEqual(detail.body.approvals, []);
  assert.deepEqual(detail.body.fileChanges, []);
  assert.deepEqual(detail.body.validations, []);
  assert.equal(Object.hasOwn(detail.body, 'snapshots'), false);
  assert.equal(JSON.stringify(detail.body).includes('contentBase64'), false);

  const rejectedBody = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/cancel`,
    { body: { command: 'ignored' }, method: 'POST' },
  );
  assert.equal(rejectedBody.response.status, 400);
  assert.equal(rejectedBody.body.error, 'Request body must be empty');

  const cancelled = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/cancel`,
    { method: 'POST' },
  );
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.status, 'cancelled');

  const malformed = await requestJson(context, '/api/runs/%ZZ');
  assert.equal(malformed.response.status, 400);
  const missing = await requestJson(context, '/api/runs/RUN-missing');
  assert.equal(missing.response.status, 404);
  const unknownRoute = await requestJson(context, '/api/runs/write/unknown');
  assert.equal(unknownRoute.response.status, 404);
});

test('safe approvals can complete a real change while dangerous approvals require rejection', async t => {
  const context = await setupServer(t);
  const started = await startCandidate(context);
  requestSafeFileApproval(context, started, 'safe-request-id');

  let detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  const safeApproval = detail.body.approvals.find(item => item.kind === 'file-change');
  assert(safeApproval);
  assert.equal(detail.body.status, 'waiting-approval');

  const extraDecisionField = await requestJson(
    context,
    `/api/approvals/${encodeURIComponent(safeApproval.id)}/decision`,
    { body: { decision: 'approved', remember: true }, method: 'POST' },
  );
  assert.equal(extraDecisionField.response.status, 400);
  const invalidDecision = await requestJson(
    context,
    `/api/approvals/${encodeURIComponent(safeApproval.id)}/decision`,
    { body: { decision: 'acceptForSession' }, method: 'POST' },
  );
  assert.equal(invalidDecision.response.status, 400);
  assert.equal(context.codex.responses.length, 0);

  const approved = await requestJson(
    context,
    `/api/approvals/${encodeURIComponent(safeApproval.id)}/decision`,
    { body: { decision: 'approved' }, method: 'POST' },
  );
  assert.equal(approved.response.status, 200);
  assert.deepEqual(approved.body, { status: 'approved' });
  assert.deepEqual(context.codex.responses.at(-1), {
    id: 'safe-request-id',
    result: { decision: 'accept' },
  });

  requestDangerousCommandApproval(context, started, 902);
  detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  const dangerous = detail.body.approvals.find(item => item.kind === 'command');
  assert(dangerous);
  const dangerousApproval = await requestJson(
    context,
    `/api/approvals/${encodeURIComponent(dangerous.id)}/decision`,
    { body: { decision: 'approved' }, method: 'POST' },
  );
  assert.equal(dangerousApproval.response.status, 409);
  assert.equal(context.codex.responses.some(response => response.id === 902), false);
  const rejected = await requestJson(
    context,
    `/api/approvals/${encodeURIComponent(dangerous.id)}/decision`,
    { body: { decision: 'rejected' }, method: 'POST' },
  );
  assert.equal(rejected.response.status, 200);
  assert.deepEqual(context.codex.responses.at(-1), {
    id: 902,
    result: { decision: 'decline' },
  });

  completeCandidate(context, started, 'generated candidate\n');
  detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  assert.equal(detail.body.status, 'completed');
  assert.equal(detail.body.fileChanges.length, 1);
  assert.equal(detail.body.fileChanges[0].kind, 'created');
  assert.equal(detail.body.fileChanges[0].path, started.target);
  assert.match(detail.body.fileChanges[0].diff, /\+generated candidate/);
  assert.equal(Object.hasOwn(detail.body, 'snapshots'), false);

  let bootstrap = await requestJson(context, '/api/bootstrap');
  assert(bootstrap.body.artifacts.some(artifact => artifact.path === started.target));
  const restored = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(restored.response.status, 200);
  assert.deepEqual(restored.body, { restored: [started.target] });
  assert.equal(fs.existsSync(path.join(context.allowedRoot, 'prd', 'candidate.md')), false);
  bootstrap = await requestJson(context, '/api/bootstrap');
  assert.equal(
    bootstrap.body.artifacts.some(artifact => artifact.path === started.target),
    false,
  );
  detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  assert.match(detail.body.fileChanges[0].restoredAt, /^\d{4}-\d{2}-\d{2}T/);
  const duplicateRestore = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(duplicateRestore.response.status, 409);
});

test('restore refuses a later user edit and preserves the file and artifact', async t => {
  const context = await setupServer(t);
  const started = await startCandidate(context, 'prd/conflict.md');
  completeCandidate(context, started, 'codex version\n');
  const actual = path.join(context.allowedRoot, 'prd', 'conflict.md');
  fs.writeFileSync(actual, 'user version\n', 'utf8');

  const restore = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(restore.response.status, 409);
  assert.equal(fs.readFileSync(actual, 'utf8'), 'user version\n');
  const detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  assert.equal(detail.body.fileChanges[0].restoredAt, null);
  const bootstrap = await requestJson(context, '/api/bootstrap');
  assert(bootstrap.body.artifacts.some(artifact => artifact.path === started.target));
});

test('multi-file restore preflight leaves every file untouched when the second conflicts', async t => {
  const context = await setupServer(t);
  const targets = ['prd/preflight-a.md', 'prd/preflight-b.md'];
  const started = await startCandidate(context, targets);
  completeCandidate(context, started, {
    [targets[0]]: 'first generated\n',
    [targets[1]]: 'second generated\n',
  });
  const first = path.join(context.allowedRoot, 'prd', 'preflight-a.md');
  const second = path.join(context.allowedRoot, 'prd', 'preflight-b.md');
  fs.writeFileSync(second, 'second user edit\n', 'utf8');

  const restore = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(restore.response.status, 409);
  assert.equal(fs.readFileSync(first, 'utf8'), 'first generated\n');
  assert.equal(fs.readFileSync(second, 'utf8'), 'second user edit\n');
  const detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  assert.equal(detail.body.fileChanges.length, 2);
  assert(detail.body.fileChanges.every(change => change.restoredAt === null));
});

test('multi-file restore checkpoints I/O success and retry skips completed files', async t => {
  const context = await setupServer(t);
  const targets = ['prd/partial-a.md', 'prd/partial-b.md'];
  const started = await startCandidate(context, targets);
  completeCandidate(context, started, {
    [targets[0]]: 'first generated\n',
    [targets[1]]: 'second generated\n',
  });
  const first = path.join(context.allowedRoot, 'prd', 'partial-a.md');
  const second = path.join(context.allowedRoot, 'prd', 'partial-b.md');
  const originalUnlink = fs.unlinkSync;
  fs.unlinkSync = function unlinkWithInjectedFailure(filename, ...args) {
    if (path.resolve(filename) === path.resolve(second)) {
      throw Object.assign(new Error('simulated second-file unlink failure'), {
        code: 'EIO',
      });
    }
    return originalUnlink.call(this, filename, ...args);
  };
  let partial;
  try {
    partial = await requestJson(
      context,
      `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
      { method: 'POST' },
    );
  } finally {
    fs.unlinkSync = originalUnlink;
  }

  assert.equal(partial.response.status, 500);
  assert.equal(partial.body.restoredCount, 1);
  assert.equal(partial.body.total, 2);
  assert.deepEqual(partial.body.restored, [targets[0]]);
  assert.deepEqual(partial.body.remaining, [targets[1]]);
  assert.match(partial.body.error, /restored 1 of 2.*simulated second-file/i);
  assert.equal(fs.existsSync(first), false);
  assert.equal(fs.readFileSync(second, 'utf8'), 'second generated\n');

  let detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  const firstChange = detail.body.fileChanges.find(change => change.path === targets[0]);
  const secondChange = detail.body.fileChanges.find(change => change.path === targets[1]);
  assert.match(firstChange.restoredAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(secondChange.restoredAt, null);
  let bootstrap = await requestJson(context, '/api/bootstrap');
  assert.equal(
    bootstrap.body.artifacts.some(artifact => artifact.path === targets[0]),
    false,
  );
  assert(
    bootstrap.body.artifacts.some(artifact => artifact.path === targets[1]),
  );

  const retried = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(retried.response.status, 200);
  assert.deepEqual(retried.body, { restored: [targets[1]] });
  assert.equal(fs.existsSync(second), false);
  detail = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}`,
  );
  assert(detail.body.fileChanges.every(
    change => typeof change.restoredAt === 'string',
  ));
  bootstrap = await requestJson(context, '/api/bootstrap');
  assert.equal(
    bootstrap.body.artifacts.some(artifact => targets.includes(artifact.path)),
    false,
  );
});

test('cancel, retry, restore, and approval routes enforce state gates and unknown ids', async t => {
  const context = await setupServer(t);
  const started = await startCandidate(context, 'prd/retry.md');

  const retryActive = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/retry`,
    { method: 'POST' },
  );
  assert.equal(retryActive.response.status, 409);
  const restoreActive = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(restoreActive.response.status, 409);

  for (const action of ['cancel', 'retry', 'restore']) {
    const missing = await requestJson(context, `/api/runs/RUN-missing/${action}`, {
      method: 'POST',
    });
    assert.equal(missing.response.status, 404);
  }
  const missingApproval = await requestJson(
    context,
    '/api/approvals/APPROVAL-missing/decision',
    { body: { decision: 'rejected' }, method: 'POST' },
  );
  assert.equal(missingApproval.response.status, 404);

  const cancelled = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/cancel`,
    { method: 'POST' },
  );
  assert.equal(cancelled.body.status, 'cancelled');
  const cancelAgain = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/cancel`,
    { method: 'POST' },
  );
  assert.equal(cancelAgain.response.status, 409);
  const restoreWithoutChanges = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/restore`,
    { method: 'POST' },
  );
  assert.equal(restoreWithoutChanges.response.status, 409);

  const retried = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(started.run.id)}/retry`,
    { method: 'POST' },
  );
  assert.equal(retried.response.status, 202);
  assert.notEqual(retried.body.id, started.run.id);
  const retryRunning = await requestJson(
    context,
    `/api/runs/${encodeURIComponent(retried.body.id)}/retry`,
    { method: 'POST' },
  );
  assert.equal(retryRunning.response.status, 409);
  await requestJson(
    context,
    `/api/runs/${encodeURIComponent(retried.body.id)}/cancel`,
    { method: 'POST' },
  );
});

function seedRestartDatabase(root) {
  const fileSafety = new FileSafety({ allowedRoot: root });
  const store = openDatabase(path.join(root, '.workbench-data', 'workbench.sqlite'));
  store.upsertRequirement({
    id: 'REQ-RESTART',
    title: 'Restart recovery',
    stage: 'PRD',
    externalWait: 'none',
  });
  const createRun = ({ id, path: relativePath, status }) => {
    fs.writeFileSync(path.join(root, ...relativePath.split('/')), 'before\n', 'utf8');
    const [snapshot] = fileSafety.capture([relativePath]);
    store.createRun({
      id,
      requirementId: 'REQ-RESTART',
      prompt: `Recover ${relativePath}`,
      permission: 'modify-existing',
      status,
      workflowType: null,
    });
    store.saveRunContext(id, {
      files: [relativePath],
      input: { permission: 'modify-existing' },
    });
    store.saveFileSnapshot(id, snapshot);
    return snapshot;
  };

  createRun({ id: 'RUN-APPLYING', path: 'prd/applying.md', status: 'running' });
  store.setRunApplyState('RUN-APPLYING', 'applying');
  fs.writeFileSync(path.join(root, 'prd', 'applying.md'), 'partially applied\n', 'utf8');

  createRun({ id: 'RUN-EXTERNAL', path: 'prd/external.md', status: 'queued' });
  fs.writeFileSync(path.join(root, 'prd', 'external.md'), 'external edit\n', 'utf8');

  createRun({ id: 'RUN-WAITING', path: 'prd/waiting.md', status: 'waiting-approval' });
  store.createApproval({
    id: 'APPROVAL-STALE',
    kind: 'command',
    payload: { command: 'git push' },
    protocolRequestId: 77,
    runId: 'RUN-WAITING',
    summary: 'Stale command approval',
  });
  store.close();
}

test('restart interrupts every active state and records only recoverable applying changes', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-api-restart-'));
  fs.mkdirSync(path.join(root, 'prd'), { recursive: true });
  seedRestartDatabase(root);
  const codex = new FakeCodex();
  const context = await setupServer(t, { codex, root });

  const applying = await requestJson(context, '/api/runs/RUN-APPLYING');
  const external = await requestJson(context, '/api/runs/RUN-EXTERNAL');
  const waiting = await requestJson(context, '/api/runs/RUN-WAITING');
  assert.equal(applying.body.status, 'interrupted');
  assert.equal(external.body.status, 'interrupted');
  assert.equal(waiting.body.status, 'interrupted');
  assert.equal(applying.body.fileChanges.length, 1);
  assert.equal(applying.body.fileChanges[0].path, 'prd/applying.md');
  assert.equal(external.body.fileChanges.length, 0);
  assert(
    external.body.validations.some(
      validation => validation.status === 'failed'
        && validation.detail.includes('prd/external.md'),
    ),
  );
  assert.equal(waiting.body.approvals[0].status, 'rejected');
  assert.deepEqual(codex.responses, []);

  const restored = await requestJson(context, '/api/runs/RUN-APPLYING/restore', {
    method: 'POST',
  });
  assert.equal(restored.response.status, 200);
  assert.equal(
    fs.readFileSync(path.join(root, 'prd', 'applying.md'), 'utf8'),
    'before\n',
  );
  const noFalseRestore = await requestJson(context, '/api/runs/RUN-EXTERNAL/restore', {
    method: 'POST',
  });
  assert.equal(noFalseRestore.response.status, 409);
  assert.equal(
    fs.readFileSync(path.join(root, 'prd', 'external.md'), 'utf8'),
    'external edit\n',
  );
});
