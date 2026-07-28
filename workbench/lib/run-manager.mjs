import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { terminateProcessTree } from './process-control.mjs';
import { assertAuthorizedPath } from './security.mjs';
import {
  buildWorkflowPrompt,
  parseWorkflowResult,
  validateWorkflowInput,
} from './workflow-catalog.mjs';

const ALLOWED_INPUT_KEYS = new Set(['requirementId', 'prompt', 'files']);
const ALLOWED_WORKFLOW_INPUT_KEYS = new Set([
  'requirementId',
  'workflowType',
  'files',
  'input',
]);
const ALLOWED_WRITE_INPUT_KEYS = new Set([
  'requirementId',
  'prompt',
  'permission',
  'targets',
]);
const WRITE_PERMISSIONS = new Set(['generate-candidate', 'modify-existing']);
const INTERRUPT_GRACE_MS = 3_000;
const MAX_PENDING_TURN_NOTIFICATIONS = 512;
const MAX_PENDING_TURN_NOTIFICATION_BYTES = 1_048_576;

function requestError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

class StartupFinalizedError extends Error {
  constructor(run, fallbackMessage) {
    super(run?.error || fallbackMessage || 'Run ended during startup');
    this.run = run || null;
  }
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

function processNonce(codex) {
  let value = null;
  if (typeof codex.nonce === 'function') value = codex.nonce();
  else if (typeof codex.processNonce === 'string') value = codex.processNonce;
  return /^[a-f0-9]{64}$/.test(String(value || '')) ? value : null;
}

function authorizeFiles(allowedRoot, files) {
  if (!Array.isArray(files)) {
    throw requestError('files must be an array', 400);
  }
  const normalized = files.map(value => {
    if (typeof value !== 'string' || !value.trim()) {
      throw requestError('files must contain non-empty paths', 400);
    }
    if (path.isAbsolute(value)) {
      throw requestError('files must contain workspace-relative paths', 400);
    }
    const candidate = path.resolve(allowedRoot, value);
    const absolute = assertAuthorizedPath(allowedRoot, candidate);
    const relative = path.relative(allowedRoot, absolute);
    if (!relative) throw requestError('files must identify a file below the allowed root', 400);
    return relative.split(path.sep).join('/');
  });
  return [...new Set(normalized)];
}

function threadRequestParams(allowedRoot) {
  return {
    approvalPolicy: 'never',
    cwd: allowedRoot,
    sandbox: 'read-only',
  };
}

function isMissingPersistedThread(error) {
  return error?.code === -32600
    && typeof error.message === 'string'
    && error.message.startsWith('no rollout found for thread id ');
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

function notificationThreadId(message) {
  return safeString(message?.params?.threadId);
}

function notificationTurnId(message) {
  return safeString(message?.params?.turnId)
    || safeString(message?.params?.turn?.id);
}

function turnStartupState() {
  return {
    pendingNotificationBytes: 0,
    pendingNotifications: [],
    staleNotificationCount: 0,
    turnStartPending: false,
  };
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
  constructor({
    store,
    codex,
    allowedRoot,
    maxConcurrentRuns = 1,
    contextService = null,
    fileSafety = null,
    approvalManager = null,
    runTimeoutMs = 600_000,
    processTerminator = terminateProcessTree,
  }) {
    if (!store || !codex) throw new TypeError('store and codex are required');
    if (!Number.isInteger(maxConcurrentRuns) || maxConcurrentRuns < 1) {
      throw new TypeError('maxConcurrentRuns must be a positive integer');
    }
    if (!Number.isInteger(runTimeoutMs) || runTimeoutMs < 1) {
      throw new TypeError('runTimeoutMs must be a positive integer');
    }
    if (typeof processTerminator !== 'function') {
      throw new TypeError('processTerminator must be a function');
    }
    this.store = store;
    this.codex = codex;
    this.allowedRoot = path.resolve(allowedRoot);
    this.maxConcurrentRuns = maxConcurrentRuns;
    this.contextService = contextService;
    this.fileSafety = fileSafety;
    this.approvalManager = approvalManager;
    this.runTimeoutMs = runTimeoutMs;
    this.processTerminator = processTerminator;
    this.activeByThread = new Map();
    this.activeByTurn = new Map();
    this.activeByRun = new Map();
    this.codex.on('notification', message => this.#onNotification(message));
    this.codex.on('exit', info => this.#onCodexExit(info));
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
    const requestedFiles = input.files ?? [];
    if (!Array.isArray(requestedFiles)) {
      throw requestError('files must be an array', 400);
    }
    const authorizedFiles = requirementId && this.contextService
      ? this.contextService
          .authorizeFiles(requirementId, requestedFiles)
          .map(artifact => artifact.path)
      : authorizeFiles(this.allowedRoot, requestedFiles);
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

    const active = {
      ...turnStartupState(),
      approvalRegistered: false,
      completedAgentItems: new Set(),
      deltaAgentItems: new Set(),
      finished: false,
      finalized: false,
      processNonce: null,
      processPid: null,
      runId,
      text: '',
      threadId: null,
      turnId: null,
      workflowType: null,
    };
    this.#registerActive(active);
    try {
      const pid = await this.#startCodex(active);
      const threadState = requirementId
        ? await this.#requirementThread(requirementId, active)
        : {
            rebuilt: false,
            threadId: await this.#startThread(active),
          };
      const { rebuilt, threadId } = threadState;
      active.threadId = threadId;
      this.store.bindProtocolIds(runId, threadId, null, pid, active.processNonce);
      if (rebuilt) this.#recordThreadRebuilt(runId);
      this.activeByThread.set(threadId, active);

      await this.#startTurn(active, {
        approvalPolicy: 'never',
        cwd: this.allowedRoot,
        input: [{ type: 'text', text: buildContext(requirement, authorizedFiles, cleanPrompt) }],
        sandboxPolicy: { type: 'readOnly', networkAccess: false },
        threadId,
      }, pid);
      return this.store.getRun(runId);
    } catch (error) {
      if (
        error instanceof StartupFinalizedError
        && error.run?.status === 'completed'
      ) {
        this.store.bindProtocolIds(
          runId,
          active.threadId,
          active.turnId,
          active.processPid,
          active.processNonce,
        );
        return this.store.getRun(runId);
      }
      this.#handleStartFailure(runId, active, error);
      throw error;
    }
  }

  async startWorkflowRun(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw requestError('workflow run input must be an object', 400);
    }
    for (const key of Object.keys(request)) {
      if (!ALLOWED_WORKFLOW_INPUT_KEYS.has(key)) {
        throw requestError(`${key} is not accepted for a workflow run`, 400);
      }
    }
    if (!this.contextService) {
      throw new Error('ContextService is required for workflow runs');
    }

    const {
      requirementId,
      workflowType,
      files = [],
      input = {},
    } = request;
    if (!Array.isArray(files)) throw requestError('files must be an array', 400);
    const context = this.contextService.getRequirementContext(requirementId);
    const artifacts = this.contextService.authorizeFiles(requirementId, files);
    const workflow = validateWorkflowInput(workflowType, input, artifacts);
    if (this.store.countActiveRuns() >= this.maxConcurrentRuns) {
      throw requestError('Concurrent run limit reached', 429);
    }

    const prompt = buildWorkflowPrompt(workflowType, {
      requirement: context.requirement,
      files: artifacts,
      input,
    });
    const runId = `RUN-${crypto.randomUUID()}`;
    this.store.createRun({
      id: runId,
      requirementId,
      prompt,
      cwd: this.allowedRoot,
      permission: workflow.permission,
      status: 'running',
      workflowType,
    });
    this.store.saveRunContext(runId, {
      files: artifacts.map(artifact => artifact.path),
      input: { workflowType, workflowInput: input },
    });

    const active = {
      ...turnStartupState(),
      approvalRegistered: false,
      completedAgentItems: new Set(),
      deltaAgentItems: new Set(),
      finished: false,
      finalized: false,
      processNonce: null,
      processPid: null,
      requirementId,
      runId,
      text: '',
      threadId: null,
      turnId: null,
      workflowType,
    };
    this.#registerActive(active);
    try {
      const pid = await this.#startCodex(active);
      const { rebuilt, threadId } = await this.#requirementThread(
        requirementId,
        active,
      );
      active.threadId = threadId;
      this.store.bindProtocolIds(runId, threadId, null, pid, active.processNonce);
      if (rebuilt) this.#recordThreadRebuilt(runId);
      this.activeByThread.set(threadId, active);

      await this.#startTurn(active, {
        approvalPolicy: 'never',
        cwd: this.allowedRoot,
        input: [{ type: 'text', text: prompt }],
        outputSchema: workflow.outputSchema,
        sandboxPolicy: { type: 'readOnly', networkAccess: false },
        threadId,
      }, pid);
      return this.store.getRun(runId);
    } catch (error) {
      if (
        error instanceof StartupFinalizedError
        && error.run?.status === 'completed'
      ) {
        this.store.bindProtocolIds(
          runId,
          active.threadId,
          active.turnId,
          active.processPid,
          active.processNonce,
        );
        return this.store.getRun(runId);
      }
      this.#handleStartFailure(runId, active, error);
      throw error;
    }
  }

  async startWriteRun(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw requestError('write run input must be an object', 400);
    }
    for (const key of Object.keys(input)) {
      if (!ALLOWED_WRITE_INPUT_KEYS.has(key)) {
        throw requestError(`${key} is not accepted for a write run`, 400);
      }
    }
    if (!this.contextService || !this.fileSafety || !this.approvalManager) {
      throw new Error(
        'ContextService, FileSafety and ApprovalManager are required for write runs',
      );
    }

    const cleanPrompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (!cleanPrompt) throw requestError('prompt is required', 400);
    if (!WRITE_PERMISSIONS.has(input.permission)) {
      throw requestError('Unsupported write permission', 400);
    }

    const context = this.contextService.getRequirementContext(input.requirementId);
    const normalizedTargets = this.fileSafety.normalizeTargets(input.targets);
    for (const target of normalizedTargets) {
      const exists = fs.existsSync(target.absolute);
      if (input.permission === 'generate-candidate') {
        if (exists) {
          throw requestError(
            `Candidate target must not already exist: ${target.path}`,
            409,
          );
        }
        let parentIsDirectory = false;
        try {
          parentIsDirectory = fs.statSync(path.dirname(target.absolute)).isDirectory();
        } catch {
          parentIsDirectory = false;
        }
        if (!parentIsDirectory) {
          throw requestError(
            `Candidate parent directory must already exist: ${target.path}`,
            409,
          );
        }
      } else if (!exists) {
        throw requestError(
          `Modify target must already exist: ${target.path}`,
          409,
        );
      }
    }
    const targetPaths = normalizedTargets.map(target => target.path);
    if (input.permission === 'modify-existing') {
      this.contextService.authorizeFiles(input.requirementId, targetPaths);
    }
    if (this.store.countActiveRuns() >= this.maxConcurrentRuns) {
      throw requestError('Concurrent run limit reached', 429);
    }

    const runId = `RUN-${crypto.randomUUID()}`;
    const snapshot = this.fileSafety.capture(targetPaths);
    const stagingRoot = this.fileSafety.prepareStaging(runId, snapshot);
    this.store.createRun({
      id: runId,
      requirementId: input.requirementId,
      prompt: cleanPrompt,
      cwd: this.allowedRoot,
      permission: input.permission,
      status: 'running',
      workflowType: null,
    });
    this.store.saveRunContext(runId, {
      files: targetPaths,
      input: { permission: input.permission },
    });
    const active = {
      ...turnStartupState(),
      approvalRegistered: false,
      completedAgentItems: new Set(),
      deltaAgentItems: new Set(),
      finalized: false,
      finished: false,
      permission: input.permission,
      processNonce: null,
      processPid: null,
      requirementId: input.requirementId,
      runId,
      snapshot,
      stagingRoot,
      targets: targetPaths,
      text: '',
      threadId: null,
      turnId: null,
      workflowType: null,
    };
    this.#registerActive(active);
    try {
      for (const item of snapshot) this.store.saveFileSnapshot(runId, item);
      const pid = await this.#startCodex(active);
      const { rebuilt, threadId } = await this.#requirementThread(
        input.requirementId,
        active,
      );
      active.threadId = threadId;
      this.store.bindProtocolIds(runId, threadId, null, pid, active.processNonce);
      if (rebuilt) this.#recordThreadRebuilt(runId);
      this.activeByThread.set(threadId, active);

      const fullPrompt = [
        `当前需求：${context.requirement.id} ${context.requirement.title}`,
        `本次权限：${input.permission}`,
        '你现在位于本次运行的隔离暂存区，只允许处理这些相对路径：',
        targetPaths.map(value => `- ${value}`).join('\n'),
        '不得删除文件，不得修改目标清单外文件，不得访问真实工作区路径，不得发布或外部发送。',
        `任务：${cleanPrompt}`,
      ].join('\n\n');
      await this.#startTurn(active, {
        approvalPolicy: 'on-request',
        cwd: stagingRoot,
        input: [{ type: 'text', text: fullPrompt }],
        sandboxPolicy: {
          type: 'workspaceWrite',
          writableRoots: [stagingRoot],
          networkAccess: false,
        },
        threadId,
      }, pid);
      return this.store.getRun(runId);
    } catch (error) {
      if (
        error instanceof StartupFinalizedError
        && error.run?.status === 'completed'
      ) {
        this.store.bindProtocolIds(
          runId,
          active.threadId,
          active.turnId,
          active.processPid,
          active.processNonce,
        );
        return this.store.getRun(runId);
      }
      this.#handleStartFailure(runId, active, error);
      throw error;
    }
  }

  async cancel(runId) {
    const active = this.activeByRun.get(runId);
    if (!active || !this.#beginFinalization(active, 'Cancelled by user')) {
      throw requestError('Run is not active', 409);
    }

    let controlError = null;
    try {
      this.approvalManager?.rejectPendingForRun(runId);
    } catch (error) {
      controlError = error;
    }
    try {
      await this.#interruptActive(active);
    } catch (error) {
      controlError ||= error;
    } finally {
      const message = controlError
        ? `Cancelled by user; cleanup warning: ${controlError.message}`
        : 'Cancelled by user';
      this.store.finishRun(runId, 'cancelled', active.text || null, message);
      this.#finalizeActive(active);
    }
    return this.store.getRun(runId);
  }

  async retry(runId) {
    const previous = this.store.getRun(runId);
    if (
      !previous
      || !['failed', 'cancelled', 'interrupted'].includes(previous.status)
    ) {
      throw requestError(
        'Only failed, cancelled or interrupted runs can retry',
        409,
      );
    }
    const context = this.store.getRunContext(runId);
    if (!context) {
      throw new Error('Run context is missing and cannot be retried safely');
    }
    const unrestoredChanges = this.store
      .listFileChanges(runId)
      .filter(change => !change.restoredAt);
    if (unrestoredChanges.length > 0) {
      throw requestError(
        'Restore or manually accept the previous file changes before retrying',
        409,
      );
    }

    if (previous.workflowType) {
      return this.startWorkflowRun({
        requirementId: previous.requirementId,
        workflowType: context.input.workflowType,
        files: context.files,
        input: context.input.workflowInput,
      });
    }
    if (previous.permission === 'read-only') {
      return this.startReadOnlyRun({
        requirementId: previous.requirementId,
        prompt: previous.prompt,
        files: context.files,
      });
    }
    return this.startWriteRun({
      requirementId: previous.requirementId,
      prompt: previous.prompt,
      permission: context.input.permission,
      targets: context.files,
    });
  }

  async #startCodex(active) {
    let starting;
    try {
      starting = this.codex.start();
    } catch (error) {
      const pid = processPid(this.codex);
      const nonce = processNonce(this.codex);
      active.processPid = pid;
      active.processNonce = nonce;
      this.store.bindProtocolIds(active.runId, null, null, pid, nonce);
      throw error;
    }

    let pid = processPid(this.codex);
    let nonce = processNonce(this.codex);
    active.processPid = pid;
    active.processNonce = nonce;
    this.store.bindProtocolIds(active.runId, null, null, pid, nonce);
    await this.#awaitStartup(active, starting);

    if (!pid) {
      pid = processPid(this.codex);
      nonce = processNonce(this.codex);
      active.processPid = pid;
      active.processNonce = nonce;
      this.store.bindProtocolIds(active.runId, null, null, pid, nonce);
    }
    return pid;
  }

  async #awaitStartup(active, operation) {
    const outcome = await Promise.race([
      Promise.resolve(operation).then(
        value => ({ kind: 'result', value }),
        error => ({ error, kind: 'error' }),
      ),
      active.terminalPromise.then(() => ({ kind: 'terminal' })),
    ]);
    if (active.finished || outcome.kind === 'terminal') {
      throw new StartupFinalizedError(
        this.store.getRun(active.runId),
        active.finishReason,
      );
    }
    if (outcome.kind === 'error') throw outcome.error;
    return outcome.value;
  }

  async #startTurn(active, params, pid) {
    active.turnStartPending = true;
    let turnResult;
    try {
      turnResult = await this.#awaitStartup(
        active,
        this.codex.request('turn/start', params),
      );
    } catch (error) {
      this.#clearTurnStartBuffer(active);
      throw error;
    }

    const turnId = protocolId(turnResult, 'turn');
    active.turnId = turnId;
    active.turnStartPending = false;
    this.store.bindProtocolIds(
      active.runId,
      active.threadId,
      turnId,
      pid,
      active.processNonce,
    );
    if (!active.finished) this.activeByTurn.set(turnId, active);
    this.#registerApproval(active);
    this.#replayTurnStartNotifications(active);
    return turnId;
  }

  #registerActive(active) {
    if (this.activeByRun.has(active.runId)) {
      throw new Error(`Run is already active: ${active.runId}`);
    }
    active.timeout = setTimeout(() => {
      void this.#timeout(active.runId);
    }, this.runTimeoutMs);
    active.timeout.unref?.();
    active.terminalPromise = new Promise(resolve => {
      active.resolveTerminal = resolve;
    });
    this.activeByRun.set(active.runId, active);
    if (active.turnId) this.activeByTurn.set(active.turnId, active);
    return active;
  }

  #registerApproval(active) {
    if (
      active.approvalRegistered
      || !active.snapshot
      || !active.turnId
      || !this.approvalManager
    ) {
      return;
    }
    this.approvalManager.registerRun(active.runId, {
      targets: active.targets,
      turnId: active.turnId,
      approvalRoot: active.stagingRoot,
    });
    active.approvalRegistered = true;
  }

  #beginFinalization(active, finishReason = null) {
    if (!active || active.finished) return false;
    active.finished = true;
    active.finishReason = finishReason;
    return true;
  }

  #clearTurnStartBuffer(active) {
    if (!active) return;
    active.pendingNotifications = [];
    active.pendingNotificationBytes = 0;
    active.turnStartPending = false;
  }

  #bufferTurnStartNotification(active, message) {
    let bytes;
    try {
      bytes = Buffer.byteLength(JSON.stringify(message), 'utf8');
    } catch {
      this.#handleStartFailure(
        active.runId,
        active,
        new Error('turn/start notification buffer received non-serializable data'),
      );
      return;
    }
    if (
      active.pendingNotifications.length + 1 > MAX_PENDING_TURN_NOTIFICATIONS
      || active.pendingNotificationBytes + bytes > MAX_PENDING_TURN_NOTIFICATION_BYTES
    ) {
      this.#handleStartFailure(
        active.runId,
        active,
        new Error('turn/start notification buffer exceeded its safety limit'),
      );
      return;
    }
    active.pendingNotifications.push(message);
    active.pendingNotificationBytes += bytes;
  }

  #replayTurnStartNotifications(active) {
    const buffered = active.pendingNotifications;
    const authoritativeTurnId = active.turnId;
    this.#clearTurnStartBuffer(active);
    let stale = 0;
    for (const message of buffered) {
      if (notificationTurnId(message) !== authoritativeTurnId) {
        stale += 1;
        continue;
      }
      this.#onNotification(message);
    }
    active.staleNotificationCount += stale;
    if (stale > 0) {
      this.store.appendRunEvent(
        active.runId,
        'workbench/stale-turn-notifications-dropped',
        { count: stale },
      );
    }
  }

  #handleStartFailure(runId, active, error) {
    if (!active) {
      this.store.finishRun(runId, 'failed', null, error.message);
      return;
    }
    if (this.#beginFinalization(active, error.message)) {
      this.store.finishRun(runId, 'failed', active.text || null, error.message);
      this.#finalizeActive(active);
    }
  }

  async #timeout(runId) {
    const active = this.activeByRun.get(runId);
    if (!active || !this.#beginFinalization(active, 'Run timed out')) return;

    let controlError = null;
    try {
      this.approvalManager?.rejectPendingForRun(runId);
    } catch (error) {
      controlError = error;
    }
    try {
      await this.#interruptActive(active);
    } catch (error) {
      controlError ||= error;
    } finally {
      const message = controlError
        ? `Run timed out; cleanup warning: ${controlError.message}`
        : 'Run timed out';
      this.store.finishRun(runId, 'failed', active.text || null, message);
      this.#finalizeActive(active);
    }
  }

  async #interruptActive(active) {
    const run = this.store.getRun(active.runId);
    const validProtocolIds = typeof run?.threadId === 'string'
      && Boolean(run.threadId)
      && typeof active.turnId === 'string'
      && Boolean(active.turnId);
    let timer = null;
    const interrupted = validProtocolIds
      ? await Promise.race([
          this.codex.request('turn/interrupt', {
            threadId: run.threadId,
            turnId: active.turnId,
          }).then(() => true, () => false),
          new Promise(resolve => {
            timer = setTimeout(() => resolve(false), INTERRUPT_GRACE_MS);
          }),
        ])
      : false;
    if (timer) clearTimeout(timer);
    if (interrupted) return;

    const persistedPid = run?.processPid;
    const livePid = processPid(this.codex);
    if (
      Number.isInteger(persistedPid)
      && persistedPid > 0
      && persistedPid === livePid
    ) {
      await this.processTerminator(livePid);
    }
  }

  #finalizeActive(active) {
    if (!active || active.finalized) return;
    active.finalized = true;
    this.#clearTurnStartBuffer(active);
    if (active.timeout) clearTimeout(active.timeout);
    if (this.activeByRun.get(active.runId) === active) {
      this.activeByRun.delete(active.runId);
    }
    if (this.activeByThread.get(active.threadId) === active) {
      this.activeByThread.delete(active.threadId);
    }
    if (active.turnId && this.activeByTurn.get(active.turnId) === active) {
      this.activeByTurn.delete(active.turnId);
    }
    if (active.turnId && active.approvalRegistered) {
      this.approvalManager?.unregisterTurn(active.turnId);
    }
    active.resolveTerminal?.();
    active.resolveTerminal = null;
  }

  #recordChanges(active) {
    const unexpected = this.fileSafety.findUnexpectedFiles(
      active.stagingRoot,
      active.targets,
    );
    if (unexpected.length > 0) {
      throw new Error(
        `Staging contains out-of-scope files: ${unexpected.join(', ')}`,
      );
    }
    const stagedChanges = this.fileSafety.compare(
      active.snapshot,
      active.stagingRoot,
    );
    const appliedChanges = this.fileSafety.applyFromStaging(
      active.snapshot,
      stagedChanges,
      active.stagingRoot,
      () => this.store.setRunApplyState(active.runId, 'applying'),
    );
    for (const change of appliedChanges) {
      this.store.saveFileChange(active.runId, change);
    }
    this.store.setRunApplyState(active.runId, 'applied');
    return appliedChanges;
  }

  #recordPartialChanges(active) {
    if (this.store.getRunApplyState(active.runId).state !== 'applying') return;
    for (const partial of this.fileSafety.compare(active.snapshot)) {
      this.store.saveFileChange(active.runId, partial);
    }
  }

  #completeWrite(active) {
    let changes;
    try {
      this.approvalManager?.rejectPendingForRun(active.runId);
      changes = this.#recordChanges(active);
    } catch (error) {
      let recoveryError = null;
      try {
        this.#recordPartialChanges(active);
      } catch (partialError) {
        recoveryError = partialError;
      }
      const detail = recoveryError
        ? `${error.message}; recovery record failed: ${recoveryError.message}`
        : error.message;
      this.store.finishRun(
        active.runId,
        'failed',
        active.text || null,
        `Staged changes were not applied: ${detail}`,
      );
      return;
    }

    try {
      if (active.permission === 'generate-candidate') {
        for (const change of changes.filter(item => item.kind === 'created')) {
          this.store.addArtifact({
            id: `ARTIFACT-${crypto.randomUUID()}`,
            requirementId: active.requirementId,
            kind: '候选产物',
            path: change.path,
          });
        }
      }
      if (this.store.listValidations(active.runId).length === 0) {
        this.store.saveValidation(active.runId, {
          name: 'Codex validation',
          status: 'skipped',
          detail: '本次运行没有产生可识别的命令验证结果',
        });
      }
      this.store.finishRun(
        active.runId,
        'completed',
        active.text || null,
        null,
      );
    } catch (error) {
      this.store.finishRun(
        active.runId,
        'failed',
        active.text || null,
        `Staged changes were applied but completion metadata failed: ${error.message}`,
      );
    }
  }

  async #startThread(active) {
    const started = await this.#awaitStartup(
      active,
      this.codex.request(
        'thread/start',
        threadRequestParams(this.allowedRoot),
      ),
    );
    return protocolId(started, 'thread');
  }

  async #requirementThread(requirementId, active) {
    const existing = this.store.getRequirementThread(requirementId);
    if (existing) {
      try {
        const resumed = await this.#awaitStartup(
          active,
          this.codex.request('thread/resume', {
            ...threadRequestParams(this.allowedRoot),
            threadId: existing.threadId,
          }),
        );
        const threadId = protocolId(resumed, 'thread');
        if (threadId !== existing.threadId) {
          throw new Error('Codex thread/resume response did not match the requested thread id');
        }
        this.store.touchRequirementThread(requirementId);
        return { rebuilt: false, threadId };
      } catch (error) {
        if (!isMissingPersistedThread(error)) throw error;
        const threadId = await this.#startThread(active);
        this.store.replaceRequirementThread(requirementId, threadId);
        return { rebuilt: true, threadId };
      }
    }

    const threadId = await this.#startThread(active);
    this.store.bindRequirementThread(requirementId, threadId);
    return { rebuilt: false, threadId };
  }

  #recordThreadRebuilt(runId) {
    this.store.appendRunEvent(runId, 'workbench/thread-rebuilt', {
      message: '原 Codex Thread 不可恢复，已创建新 Thread；本轮上下文由需求和授权文件重建。',
    });
  }

  #onCodexExit({
    code = null,
    current = true,
    processNonce: exitedProcessNonce = null,
    signal = null,
  } = {}) {
    if (current === false) return;
    const baseMessage = `Codex App Server exited: code=${code} signal=${signal}`;
    for (const active of [...this.activeByRun.values()]) {
      if (
        active.processNonce
        && exitedProcessNonce
        && active.processNonce !== exitedProcessNonce
      ) {
        continue;
      }
      if (!this.#beginFinalization(active, baseMessage)) continue;
      let message = baseMessage;
      try {
        this.approvalManager?.rejectPendingForRun(active.runId);
      } catch (error) {
        message += `; pending approval cleanup failed: ${error.message}`;
      }
      this.store.finishRun(
        active.runId,
        'failed',
        active.text || null,
        message,
      );
      this.#finalizeActive(active);
    }
  }

  #onNotification(message) {
    const threadId = notificationThreadId(message);
    const turnId = notificationTurnId(message);
    let active = turnId ? this.activeByTurn.get(turnId) : null;
    if (!active && threadId) {
      const starting = this.activeByThread.get(threadId);
      if (
        starting
        && starting.turnStartPending
        && !starting.turnId
        && turnId
        && !starting.finished
      ) {
        this.#bufferTurnStartNotification(starting, message);
      }
      return;
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

    if (
      message.method === 'item/completed'
      && message.params?.item?.type === 'commandExecution'
      && active.snapshot
    ) {
      const item = message.params.item;
      this.store.saveValidation(active.runId, {
        name: String(item.command || 'Codex command').slice(0, 240),
        status: Number(item.exitCode) === 0 ? 'passed' : 'failed',
        detail: String(item.aggregatedOutput || item.output || '').slice(-8_000),
      });
    }

    if (message.method !== 'turn/completed') return;
    if (!this.#beginFinalization(active)) return;
    const status = message.params?.turn?.status;
    const failed = status !== 'completed';
    try {
      if (failed) {
        let error = safeString(message.params?.turn?.error?.message)
          || `Codex turn ended with ${safeString(status) || 'unknown status'}`;
        if (active.snapshot) {
          try {
            this.approvalManager?.rejectPendingForRun(active.runId);
          } catch (approvalError) {
            error += `; pending approval cleanup failed: ${approvalError.message}`;
          }
        }
        this.store.finishRun(active.runId, 'failed', active.text || null, error);
      } else if (active.snapshot) {
        this.#completeWrite(active);
      } else if (active.workflowType) {
        try {
          const result = parseWorkflowResult(active.workflowType, active.text);
          this.store.saveWorkflowResult({
            id: `RESULT-${crypto.randomUUID()}`,
            runId: active.runId,
            requirementId: active.requirementId,
            workflowType: active.workflowType,
            result,
          });
          this.store.finishRun(active.runId, 'completed', JSON.stringify(result));
        } catch (error) {
          this.store.finishRun(
            active.runId,
            'failed',
            active.text,
            `Structured result rejected: ${error.message}`,
          );
        }
      } else {
        this.store.finishRun(active.runId, 'completed', active.text || null);
      }
    } finally {
      this.#finalizeActive(active);
    }
  }
}
