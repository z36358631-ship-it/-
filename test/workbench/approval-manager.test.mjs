import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ApprovalManager } from '../../workbench/lib/approval-manager.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';

const permissionsResponseSchema = JSON.parse(fs.readFileSync(
  new URL(
    './fixtures/PermissionsRequestApprovalResponse.json',
    import.meta.url,
  ),
  'utf8',
));

class FakeCodex extends EventEmitter {
  constructor() {
    super();
    this.responses = [];
    this.responseAttempts = 0;
    this.responseError = null;
  }

  respond(id, result) {
    this.responseAttempts += 1;
    if (this.responseError) throw this.responseError;
    this.responses.push({ id, result });
  }

  respondError(id, code = -32601, message = 'Method not supported', data) {
    this.responseAttempts += 1;
    if (this.responseError) throw this.responseError;
    const error = { code, message };
    if (data !== undefined) error.data = data;
    this.responses.push({ id, error });
  }
}

function setup(t, { targets = ['prd/a.md'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-manager-'));
  const approvalRoot = path.join(root, 'staging');
  fs.mkdirSync(path.join(approvalRoot, 'prd'), { recursive: true });
  fs.writeFileSync(path.join(approvalRoot, 'prd', 'a.md'), 'before\n', 'utf8');
  const store = openDatabase(path.join(root, `approval-${crypto.randomUUID()}.sqlite`));
  store.createRun({
    id: 'RUN-1',
    requirementId: null,
    prompt: 'Modify the selected file',
    permission: 'modify-existing',
    status: 'running',
    workflowType: null,
  });
  const codex = new FakeCodex();
  const approvals = new ApprovalManager({ store, codex, allowedRoot: root });
  approvals.registerRun('RUN-1', {
    approvalRoot,
    targets,
    turnId: 'turn-1',
  });
  t.after(() => {
    store.close();
    fs.rmSync(root, { force: true, recursive: true });
  });
  return { approvalRoot, approvals, codex, root, store };
}

function fileChangeNotification({
  itemId,
  path: filePath,
  kind = { type: 'update', move_path: null },
  method = 'item/started',
}) {
  return {
    method,
    params: {
      threadId: 'thread-1',
      turnId: 'turn-1',
      item: {
        id: itemId,
        type: 'fileChange',
        status: method === 'item/started' ? 'inProgress' : 'completed',
        changes: [{ path: filePath, kind, diff: '@@ test @@' }],
      },
    },
  };
}

function fileApprovalRequest({ id, itemId, turnId = 'turn-1' }) {
  return {
    id,
    method: 'item/fileChange/requestApproval',
    params: {
      threadId: 'thread-1',
      turnId,
      itemId,
      startedAtMs: 1_754_000_000_000,
    },
  };
}

function permissionsApprovalRequest({
  id,
  cwd,
  turnId = 'turn-1',
}) {
  return {
    id,
    method: 'item/permissions/requestApproval',
    params: {
      cwd,
      itemId: 'item-permissions',
      permissions: {
        fileSystem: {
          read: [cwd],
          write: [cwd],
        },
        network: { enabled: true },
      },
      reason: 'The command requests broader filesystem and network access.',
      startedAtMs: 1_754_000_000_003,
      threadId: 'thread-1',
      turnId,
    },
  };
}

test('a registered permissions request returns the schema-required empty grant without changing run state', t => {
  const {
    approvalRoot,
    codex,
    store,
  } = setup(t);
  codex.emit('request', permissionsApprovalRequest({
    id: 'permissions-registered',
    cwd: approvalRoot,
  }));

  assert.deepEqual(codex.responses, [{
    id: 'permissions-registered',
    result: { permissions: {} },
  }]);
  assert.deepEqual(permissionsResponseSchema.required, ['permissions']);
  for (const required of permissionsResponseSchema.required) {
    assert.equal(Object.hasOwn(codex.responses[0].result, required), true);
  }
  assert.equal(Object.hasOwn(codex.responses[0].result, 'decision'), false);
  assert.equal(Object.hasOwn(codex.responses[0], 'jsonrpc'), false);
  assert.equal(store.listApprovals('RUN-1').length, 0);
  assert.equal(store.listPendingApprovals('RUN-1').length, 0);
  assert.equal(store.getRun('RUN-1').status, 'running');
});

test('an unregistered permissions request returns the schema-required empty grant with its numeric id', t => {
  const {
    approvalRoot,
    codex,
    store,
  } = setup(t);
  codex.emit('request', permissionsApprovalRequest({
    id: 131,
    cwd: approvalRoot,
    turnId: 'turn-unknown',
  }));

  assert.deepEqual(codex.responses, [{
    id: 131,
    result: { permissions: {} },
  }]);
  assert.equal(Object.hasOwn(codex.responses[0].result, 'decision'), false);
  assert.equal(store.listApprovals('RUN-1').length, 0);
  assert.equal(store.getRun('RUN-1').status, 'running');
});

test('unknown account, MCP and future server requests all fail closed once', t => {
  const { codex, store } = setup(t);
  const requests = [
    {
      id: 'account-request',
      method: 'account/chatgptAuthTokens/refresh',
      params: { reason: 'unauthorized' },
    },
    {
      id: 132,
      method: 'mcpServer/elicitation/request',
      params: {
        message: 'Provide credentials',
        mode: 'form',
        requestedSchema: { type: 'object' },
        serverName: 'untrusted-server',
      },
    },
    {
      id: 'future-request',
      method: 'future/server/request',
      params: { threadId: 'thread-1', turnId: 'turn-1' },
    },
  ];
  for (const request of requests) codex.emit('request', request);

  assert.deepEqual(codex.responses, requests.map(request => ({
    id: request.id,
    error: {
      code: -32601,
      message: 'Method not supported',
    },
  })));
  assert.equal(codex.responseAttempts, requests.length);
  assert.equal(store.listApprovals('RUN-1').length, 0);
  assert.equal(store.getRun('RUN-1').status, 'running');
});

test('unsupported error response failures are observable without pending state or retry', t => {
  const { codex, store } = setup(t);
  codex.responseError = new Error('protocol write failed');
  const request = {
    id: 'permissions-write-failure',
    method: 'future/server/request',
    params: { threadId: 'thread-1', turnId: 'turn-1' },
  };

  assert.throws(
    () => codex.emit('request', request),
    /protocol write failed/,
  );
  assert.equal(codex.responseAttempts, 1);
  assert.deepEqual(codex.responses, []);
  assert.equal(store.listApprovals('RUN-1').length, 0);
  assert.equal(store.listPendingApprovals('RUN-1').length, 0);
  assert.equal(store.getRun('RUN-1').status, 'running');
});

test('an approval request for an unregistered turn is declined without persistence', t => {
  const { codex, store } = setup(t);
  codex.emit('request', fileApprovalRequest({
    id: 'unknown-turn-request',
    itemId: 'item-unknown',
    turnId: 'turn-unknown',
  }));

  assert.deepEqual(codex.responses, [{
    id: 'unknown-turn-request',
    result: { decision: 'decline' },
  }]);
  assert.equal(store.listApprovals('RUN-1').length, 0);
  assert.equal(store.getRun('RUN-1').status, 'running');
});

test('a registered file change uses notification paths and can be explicitly accepted', t => {
  const { approvals, codex, store } = setup(t);
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-safe',
    path: 'prd/a.md',
  }));
  codex.emit('request', fileApprovalRequest({ id: 81, itemId: 'item-safe' }));

  const [pending] = store.listPendingApprovals('RUN-1');
  assert.equal(pending.kind, 'file-change');
  assert.deepEqual(pending.payload.paths, ['prd/a.md']);
  assert.equal(store.getRun('RUN-1').status, 'waiting-approval');

  approvals.resolve(pending.id, 'approved');
  assert.deepEqual(codex.responses, [{
    id: 81,
    result: { decision: 'accept' },
  }]);
  assert.equal(store.getApproval(pending.id).status, 'approved');
  assert.equal(store.getRun('RUN-1').status, 'running');
});

test('relative and absolute staging paths normalize against approvalRoot', t => {
  const { approvalRoot, approvals, codex, store } = setup(t, {
    targets: ['prd/a.md', 'prd/b.md'],
  });
  fs.writeFileSync(path.join(approvalRoot, 'prd', 'b.md'), 'before\n', 'utf8');
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-relative',
    path: 'prd/a.md',
  }));
  codex.emit('request', fileApprovalRequest({ id: 'relative-id', itemId: 'item-relative' }));
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-absolute',
    path: path.join(approvalRoot, 'prd', 'b.md'),
    method: 'item/completed',
  }));
  codex.emit('request', fileApprovalRequest({ id: 82, itemId: 'item-absolute' }));

  const pending = store.listPendingApprovals('RUN-1');
  assert.deepEqual(
    pending.map(approval => approval.payload.paths).sort((a, b) => a[0].localeCompare(b[0])),
    [['prd/a.md'], ['prd/b.md']],
  );
  for (const approval of pending) approvals.resolve(approval.id, 'approved');
  assert.deepEqual(
    codex.responses.map(response => response.id).sort(),
    [82, 'relative-id'].sort(),
  );
});

test('out-of-scope, delete, and command approvals cannot be approved but can be declined', t => {
  const { approvals, codex, store } = setup(t);
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-outside-targets',
    path: 'prd/b.md',
  }));
  codex.emit('request', fileApprovalRequest({ id: 83, itemId: 'item-outside-targets' }));
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-delete',
    path: 'prd/a.md',
    kind: { type: 'delete' },
  }));
  codex.emit('request', fileApprovalRequest({ id: 'delete-request', itemId: 'item-delete' }));
  codex.emit('request', {
    id: 85,
    method: 'item/commandExecution/requestApproval',
    params: {
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'item-command',
      startedAtMs: 1_754_000_000_001,
      command: 'git push',
      cwd: process.cwd(),
    },
  });

  const pending = store.listPendingApprovals('RUN-1');
  assert.deepEqual(
    pending.map(approval => approval.kind).sort(),
    ['command', 'file-delete', 'out-of-scope-file'],
  );
  for (const approval of pending) {
    assert.throws(
      () => approvals.resolve(approval.id, 'approved'),
      error => error.statusCode === 409 && /cannot be approved/i.test(error.message),
    );
  }
  assert.equal(codex.responses.length, 0);
  for (const approval of pending) approvals.resolve(approval.id, 'rejected');
  assert.equal(codex.responses.length, 3);
  assert(codex.responses.every(response => response.result.decision === 'decline'));
});

test('empty, traversal, absolute escape, and symlink escape paths stay unapprovable', t => {
  const { approvalRoot, approvals, codex, root, store } = setup(t, {
    targets: ['prd/a.md', 'link/secret.md'],
  });
  const outside = path.join(root, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.md'), 'secret\n', 'utf8');
  fs.symlinkSync(
    outside,
    path.join(approvalRoot, 'link'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  const unsafePaths = [
    '',
    '../outside/secret.md',
    path.join(outside, 'secret.md'),
    path.join(approvalRoot, 'link', 'secret.md'),
  ];
  unsafePaths.forEach((unsafePath, index) => {
    const itemId = `item-unsafe-${index}`;
    codex.emit('notification', fileChangeNotification({ itemId, path: unsafePath }));
    codex.emit('request', fileApprovalRequest({ id: 100 + index, itemId }));
  });

  const pending = store.listPendingApprovals('RUN-1');
  assert.equal(pending.length, unsafePaths.length);
  assert(pending.every(approval => approval.kind === 'out-of-scope-file'));
  for (const approval of pending) {
    assert.throws(
      () => approvals.resolve(approval.id, 'approved'),
      error => error.statusCode === 409,
    );
  }
  approvals.rejectPendingForRun('RUN-1');
  assert.equal(codex.responses.length, unsafePaths.length);
  assert(codex.responses.every(response => response.result.decision === 'decline'));
});

test('duplicate resolution is rejected without a second protocol response', t => {
  const { approvals, codex, store } = setup(t);
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-once',
    path: 'prd/a.md',
  }));
  codex.emit('request', fileApprovalRequest({ id: 'once', itemId: 'item-once' }));
  const [pending] = store.listPendingApprovals('RUN-1');
  approvals.resolve(pending.id, 'rejected');
  assert.throws(() => approvals.resolve(pending.id, 'rejected'), /not pending/i);
  assert.equal(codex.responses.length, 1);
});

test('batch rejection declines every pending request without reviving a cancelled run', t => {
  const { approvals, codex, store } = setup(t);
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-batch',
    path: 'prd/a.md',
  }));
  codex.emit('request', fileApprovalRequest({ id: 110, itemId: 'item-batch' }));
  codex.emit('request', {
    id: 'command-batch',
    method: 'item/commandExecution/requestApproval',
    params: {
      threadId: 'thread-1',
      turnId: 'turn-1',
      itemId: 'item-command-batch',
      startedAtMs: 1_754_000_000_002,
      command: 'Remove-Item prd/a.md',
    },
  });
  store.finishRun('RUN-1', 'cancelled');

  assert.equal(approvals.rejectPendingForRun('RUN-1'), 2);
  assert.equal(store.listPendingApprovals('RUN-1').length, 0);
  assert.equal(store.getRun('RUN-1').status, 'cancelled');
  assert.deepEqual(
    new Set(codex.responses.map(response => response.id)),
    new Set([110, 'command-batch']),
  );
  assert(codex.responses.every(response => response.result.decision === 'decline'));
});

test('a protocol write failure is explicit and cannot be retried into a second response', t => {
  const { approvals, codex, store } = setup(t);
  codex.emit('notification', fileChangeNotification({
    itemId: 'item-write-failure',
    path: 'prd/a.md',
  }));
  codex.emit('request', fileApprovalRequest({ id: 120, itemId: 'item-write-failure' }));
  const [pending] = store.listPendingApprovals('RUN-1');
  codex.responseError = new Error('protocol write failed');

  assert.throws(() => approvals.resolve(pending.id, 'approved'), /protocol write failed/);
  assert.equal(store.getApproval(pending.id).status, 'approved');
  assert.throws(() => approvals.resolve(pending.id, 'approved'), /not pending/i);
  assert.equal(codex.responseAttempts, 1);
});
