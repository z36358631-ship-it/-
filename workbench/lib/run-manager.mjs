import crypto from 'node:crypto';
import path from 'node:path';
import { assertAuthorizedPath } from './security.mjs';

const ALLOWED_INPUT_KEYS = new Set(['requirementId', 'prompt', 'files']);

function requestError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function protocolId(result, kind) {
  const id = result?.[kind]?.id;
  if (typeof id !== 'string' || !id) {
    throw new Error(`Codex ${kind}/start response did not include ${kind}.id`);
  }
  return id;
}

function processPid(codex) {
  let value = null;
  if (typeof codex.pid === 'function') value = codex.pid();
  else if (Number.isInteger(codex.pid)) value = codex.pid;
  else value = codex.child?.pid;
  return Number.isInteger(value) && value > 0 ? value : null;
}

function authorizeFiles(allowedRoot, files) {
  if (!Array.isArray(files)) {
    throw requestError('files must be an array', 400);
  }
  const normalized = files.map(value => {
    if (typeof value !== 'string' || !value.trim()) {
      throw requestError('files must contain non-empty paths', 400);
    }
    const candidate = path.isAbsolute(value)
      ? value
      : path.resolve(allowedRoot, value);
    const absolute = assertAuthorizedPath(allowedRoot, candidate);
    const relative = path.relative(allowedRoot, absolute);
    if (!relative) throw requestError('files must identify a file below the allowed root', 400);
    return relative.split(path.sep).join('/');
  });
  return [...new Set(normalized)];
}

function buildContext(requirement, files, prompt) {
  return [
    '你正在执行个人产品经理工作台的只读任务。',
    '禁止创建、修改、移动或删除任何文件，也不要请求扩大权限。',
    requirement
      ? `当前需求：${requirement.id} ${requirement.title}；阶段：${requirement.stage}`
      : '',
    files.length
      ? `仅分析这些已授权文件：\n${files.map(value => `- ${value}`).join('\n')}`
      : '',
    `用户任务：${prompt}`,
  ].filter(Boolean).join('\n\n');
}

function safeString(value) {
  return typeof value === 'string' ? value : null;
}

function persistedEvent(message) {
  if (message?.method === 'item/agentMessage/delta') {
    const delta = safeString(message.params?.delta);
    if (delta === null) return null;
    return {
      type: message.method,
      payload: {
        itemId: safeString(message.params?.itemId),
        delta,
      },
    };
  }

  if (message?.method === 'turn/completed') {
    return {
      type: message.method,
      payload: {
        turnId: safeString(message.params?.turn?.id),
        status: safeString(message.params?.turn?.status) || 'unknown',
      },
    };
  }

  if (!['item/started', 'item/completed'].includes(message?.method)) return null;
  const item = message.params?.item;
  if (!item || item.type === 'reasoning') return null;
  const commandExecution = item.type === 'commandExecution';
  const fileChange = item.type === 'fileChange';
  return {
    type: message.method,
    payload: {
      itemId: safeString(item.id),
      itemType: safeString(item.type) || 'unknown',
      command: commandExecution ? safeString(item.command) : null,
      exitCode: commandExecution && Number.isInteger(item.exitCode) ? item.exitCode : null,
      paths: fileChange && Array.isArray(item.changes)
        ? item.changes.map(change => safeString(change?.path)).filter(Boolean)
        : [],
    },
  };
}

export class RunManager {
  constructor({ store, codex, allowedRoot, maxConcurrentRuns = 1 }) {
    if (!store || !codex) throw new TypeError('store and codex are required');
    if (!Number.isInteger(maxConcurrentRuns) || maxConcurrentRuns < 1) {
      throw new TypeError('maxConcurrentRuns must be a positive integer');
    }
    this.store = store;
    this.codex = codex;
    this.allowedRoot = path.resolve(allowedRoot);
    this.maxConcurrentRuns = maxConcurrentRuns;
    this.activeByThread = new Map();
    this.activeByTurn = new Map();
    this.codex.on('notification', message => this.#onNotification(message));
  }

  async startReadOnlyRun(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw requestError('run input must be an object', 400);
    }
    for (const key of Object.keys(input)) {
      if (!ALLOWED_INPUT_KEYS.has(key)) {
        throw requestError(`${key} is not accepted for a read-only run`, 400);
      }
    }

    const cleanPrompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (!cleanPrompt) throw requestError('prompt is required', 400);
    const requirementId = input.requirementId || null;
    const requirement = requirementId ? this.store.getRequirement(requirementId) : null;
    if (requirementId && !requirement) {
      throw requestError('requirement does not exist', 404);
    }
    const authorizedFiles = authorizeFiles(this.allowedRoot, input.files ?? []);
    if (this.store.countActiveRuns() >= this.maxConcurrentRuns) {
      throw requestError('Concurrent run limit reached', 429);
    }

    const runId = `RUN-${crypto.randomUUID()}`;
    this.store.createRun({
      id: runId,
      requirementId,
      prompt: cleanPrompt,
      cwd: this.allowedRoot,
      permission: 'read-only',
      status: 'running',
    });
    this.store.saveRunContext(runId, {
      files: authorizedFiles,
      input: { kind: 'freeform-read-only' },
    });

    let active = null;
    try {
      await this.codex.start();
      const pid = processPid(this.codex);
      const threadResult = await this.codex.request('thread/start', {
        approvalPolicy: 'never',
        cwd: this.allowedRoot,
        sandbox: 'read-only',
      });
      const threadId = protocolId(threadResult, 'thread');
      this.store.bindProtocolIds(runId, threadId, null, pid);

      active = {
        completedAgentItems: new Set(),
        deltaAgentItems: new Set(),
        finished: false,
        runId,
        text: '',
        threadId,
        turnId: null,
      };
      this.activeByThread.set(threadId, active);

      const turnResult = await this.codex.request('turn/start', {
        approvalPolicy: 'never',
        cwd: this.allowedRoot,
        input: [{ type: 'text', text: buildContext(requirement, authorizedFiles, cleanPrompt) }],
        sandboxPolicy: { type: 'readOnly', networkAccess: false },
        threadId,
      });
      const turnId = protocolId(turnResult, 'turn');
      if (active.turnId && active.turnId !== turnId) {
        throw new Error('Codex turn/start response did not match the notification turn id');
      }
      active.turnId = turnId;
      this.store.bindProtocolIds(runId, threadId, turnId, pid);
      if (!active.finished) this.activeByTurn.set(turnId, active);
      return this.store.getRun(runId);
    } catch (error) {
      if (active) this.#removeActive(active);
      this.store.finishRun(runId, 'failed', active?.text || null, error.message);
      throw error;
    }
  }

  #onNotification(message) {
    const threadId = safeString(message?.params?.threadId);
    const turnId = safeString(message?.params?.turnId)
      || safeString(message?.params?.turn?.id);
    let active = turnId ? this.activeByTurn.get(turnId) : null;
    if (!active && threadId) {
      const starting = this.activeByThread.get(threadId);
      if (starting && !starting.turnId && turnId) {
        starting.turnId = turnId;
        this.activeByTurn.set(turnId, starting);
        active = starting;
      }
    }
    if (
      !active
      || active.finished
      || active.threadId !== threadId
      || active.turnId !== turnId
    ) {
      return;
    }

    const event = persistedEvent(message);
    if (event) this.store.appendRunEvent(active.runId, event.type, event.payload);

    if (message.method === 'item/agentMessage/delta') {
      const delta = safeString(message.params?.delta);
      const itemId = safeString(message.params?.itemId);
      if (delta !== null) active.text += delta;
      if (itemId && delta) active.deltaAgentItems.add(itemId);
    }

    if (message.method === 'item/completed' && message.params?.item?.type === 'agentMessage') {
      const itemId = safeString(message.params.item.id);
      if (
        itemId
        && !active.deltaAgentItems.has(itemId)
        && !active.completedAgentItems.has(itemId)
      ) {
        active.text += safeString(message.params.item.text) || '';
      }
      if (itemId) active.completedAgentItems.add(itemId);
    }

    if (message.method !== 'turn/completed') return;
    const status = message.params?.turn?.status;
    const failed = status !== 'completed';
    const error = failed
      ? safeString(message.params?.turn?.error?.message)
        || `Codex turn ended with ${safeString(status) || 'unknown status'}`
      : null;
    this.store.finishRun(
      active.runId,
      failed ? 'failed' : 'completed',
      active.text || null,
      error,
    );
    active.finished = true;
    this.#removeActive(active);
  }

  #removeActive(active) {
    if (this.activeByThread.get(active.threadId) === active) {
      this.activeByThread.delete(active.threadId);
    }
    if (active.turnId && this.activeByTurn.get(active.turnId) === active) {
      this.activeByTurn.delete(active.turnId);
    }
  }
}
