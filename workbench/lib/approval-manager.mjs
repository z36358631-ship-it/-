import crypto from 'node:crypto';
import path from 'node:path';
import { assertAuthorizedPath } from './security.mjs';

const FILE_APPROVAL_METHOD = 'item/fileChange/requestApproval';
const COMMAND_APPROVAL_METHOD = 'item/commandExecution/requestApproval';
const FILE_ITEM_METHODS = new Set(['item/started', 'item/completed']);

function conflict(message) {
  return Object.assign(new Error(message), { statusCode: 409 });
}

function pathKey(value) {
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

function containsTraversal(value) {
  return value.split(/[\\/]+/).includes('..');
}

function lexicalRelativePath(root, value) {
  if (
    typeof value !== 'string'
    || !value.trim()
    || value.includes('\0')
    || containsTraversal(value)
  ) {
    throw new Error('Approval path must be a non-empty path without traversal');
  }
  const resolvedRoot = path.resolve(root);
  const absolute = path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(resolvedRoot, value);
  const relative = path.relative(resolvedRoot, absolute);
  if (
    !relative
    || relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error('Approval path is outside the approval root');
  }
  return relative.split(path.sep).join('/');
}

function authorizedRelativePath(root, value) {
  const relative = lexicalRelativePath(root, value);
  assertAuthorizedPath(root, path.resolve(root, relative));
  return relative;
}

function changeIsDeletion(change) {
  return change?.kind === 'delete' || change?.kind?.type === 'delete';
}

function itemPaths(item) {
  const paths = [];
  for (const change of Array.isArray(item?.changes) ? item.changes : []) {
    paths.push(change?.path);
    if (change?.kind?.type === 'update' && change.kind.move_path) {
      paths.push(change.kind.move_path);
    }
  }
  return paths;
}

export class ApprovalManager {
  constructor({ store, codex, allowedRoot = process.cwd() }) {
    if (!store || !codex) throw new TypeError('store and codex are required');
    this.store = store;
    this.codex = codex;
    this.allowedRoot = path.resolve(allowedRoot);
    this.byTurn = new Map();
    this.protocolByApproval = new Map();
    this.fileChangeByItem = new Map();
    codex.on('notification', message => this.#onNotification(message));
    codex.on('request', request => this.#onRequest(request));
  }

  registerRun(runId, { targets, turnId, approvalRoot = this.allowedRoot }) {
    if (typeof runId !== 'string' || !runId) throw new TypeError('runId is required');
    if (typeof turnId !== 'string' || !turnId) throw new TypeError('turnId is required');
    if (!Array.isArray(targets)) throw new TypeError('targets must be an array');
    const root = path.resolve(approvalRoot);
    const normalizedTargets = new Set(
      targets.map(value => pathKey(lexicalRelativePath(root, value))),
    );
    this.byTurn.set(turnId, {
      approvalRoot: root,
      runId,
      targets: normalizedTargets,
    });
  }

  unregisterTurn(turnId) {
    this.byTurn.delete(turnId);
    for (const [itemId, item] of this.fileChangeByItem) {
      if (item.turnId === turnId) this.fileChangeByItem.delete(itemId);
    }
  }

  resolve(approvalId, decision) {
    if (!['approved', 'rejected'].includes(decision)) {
      throw new Error('Invalid approval decision');
    }
    const approval = this.store.getApproval(approvalId);
    if (!approval || approval.status !== 'pending') {
      throw new Error('Approval is not pending');
    }
    if (decision === 'approved' && approval.kind !== 'file-change') {
      throw conflict(
        'This approval kind cannot be approved; only in-scope, non-deleting file changes are allowed',
      );
    }
    if (!this.protocolByApproval.has(approvalId)) {
      throw new Error('Original approval protocol request is unavailable');
    }

    const resolved = this.store.resolveApproval(approvalId, decision);
    if (!resolved) throw new Error('Approval is not pending');
    const protocolId = this.protocolByApproval.get(approvalId);
    try {
      this.codex.respond(protocolId, {
        decision: decision === 'approved' ? 'accept' : 'decline',
      });
    } finally {
      this.protocolByApproval.delete(approvalId);
    }

    if (this.store.listPendingApprovals(approval.runId).length === 0) {
      const run = this.store.getRun(approval.runId);
      if (run?.status === 'waiting-approval') {
        this.store.setRunStatus(approval.runId, 'running');
      }
    }
    return this.store.getApproval(approvalId);
  }

  resolveApproval(approvalId, decision) {
    return this.resolve(approvalId, decision);
  }

  rejectPendingForRun(runId) {
    const pending = this.store.listPendingApprovals(runId);
    for (const approval of pending) this.resolve(approval.id, 'rejected');
    return pending.length;
  }

  #onNotification(message) {
    if (!FILE_ITEM_METHODS.has(message?.method)) return;
    const item = message.params?.item;
    if (typeof item?.id !== 'string' || item.type !== 'fileChange') return;
    this.fileChangeByItem.set(item.id, {
      deletion: (Array.isArray(item.changes) ? item.changes : []).some(changeIsDeletion),
      paths: itemPaths(item),
      threadId: message.params?.threadId,
      turnId: message.params?.turnId,
    });
  }

  #onRequest(request) {
    const fileChange = request?.method === FILE_APPROVAL_METHOD;
    const command = request?.method === COMMAND_APPROVAL_METHOD;
    if (!fileChange && !command) {
      if (request && Object.hasOwn(request, 'id')) {
        this.codex.respond(request.id, { decision: 'decline' });
      }
      return;
    }

    const turn = this.byTurn.get(request.params?.turnId);
    if (!turn) {
      this.codex.respond(request.id, { decision: 'decline' });
      return;
    }

    let deletion = false;
    let normalizedPaths = [];
    let unsafePath = false;
    if (fileChange) {
      const item = this.fileChangeByItem.get(request.params?.itemId);
      const matchesRequest = item
        && item.turnId === request.params?.turnId
        && item.threadId === request.params?.threadId;
      const rawPaths = matchesRequest ? item.paths : [];
      deletion = Boolean(matchesRequest && item.deletion);
      if (rawPaths.length === 0) unsafePath = true;
      for (const value of rawPaths) {
        try {
          normalizedPaths.push(authorizedRelativePath(turn.approvalRoot, value));
        } catch {
          unsafePath = true;
        }
      }
      normalizedPaths = [...new Map(
        normalizedPaths.map(value => [pathKey(value), value]),
      ).values()];
    }

    const inScope = fileChange
      && !unsafePath
      && normalizedPaths.length > 0
      && normalizedPaths.every(value => turn.targets.has(pathKey(value)));
    const kind = command
      ? 'command'
      : deletion
        ? 'file-delete'
        : inScope
          ? 'file-change'
          : 'out-of-scope-file';
    const summary = command
      ? `Command request: ${String(request.params?.command || '').slice(0, 240)}`
      : `${kind}: ${normalizedPaths.join(', ') || 'no valid path'}`;
    const approvalId = `APPROVAL-${crypto.randomUUID()}`;
    this.store.createApproval({
      id: approvalId,
      runId: turn.runId,
      protocolRequestId: request.id,
      kind,
      summary,
      payload: {
        ...request.params,
        deletion,
        paths: normalizedPaths,
      },
    });
    this.store.setRunStatus(turn.runId, 'waiting-approval');
    this.protocolByApproval.set(approvalId, request.id);
  }
}
