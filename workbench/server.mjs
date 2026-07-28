import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConfig } from './lib/config.mjs';
import {
  classifyCodexHealth,
  CodexAppServerClient,
} from './lib/codex-app-server-client.mjs';
import { ApprovalManager } from './lib/approval-manager.mjs';
import { ContextService } from './lib/context-service.mjs';
import { openDatabase } from './lib/database.mjs';
import { FileSafety } from './lib/file-safety.mjs';
import { recoverPersistedProcesses } from './lib/process-control.mjs';
import { RunManager } from './lib/run-manager.mjs';
import { assertLocalRequest, readJsonBody } from './lib/security.mjs';
import { workflowCatalog } from './lib/workflow-catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(here, 'public');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const activeRunStatuses = new Set(['queued', 'running', 'waiting-approval']);
const approvalDecisions = new Set(['approved', 'rejected']);
const requirementStages = new Set([
  '待分析',
  '需求池',
  '已规划',
  '方案中',
  'Demo中',
  'PRD中',
  '待外部确认',
  '待评审',
  '开发中',
  '测试中',
  '待验收',
  '待上线',
  '效果观察',
  '已归档',
]);
const externalWaits = new Set([
  '等待产品专员',
  '等待运营反馈',
  '等待领导确认',
  '等待研发补充',
  '等待测试结果',
  '无外部等待',
]);
const manualTaskStatuses = new Set(['待开始', '进行中', '已完成']);
const productSpecialists = new Set(['产品专员A', '产品专员B']);
const workflowRunFields = new Set(['requirementId', 'files', 'input']);
const SERVER_CLOSE_TIMEOUT_MS = 2_000;
const manualTaskCreateFields = new Set([
  'requirementId',
  'assigneeNote',
  'description',
  'dueAt',
  'expectedDeliverable',
  'currentNote',
]);
const manualTaskUpdateFields = new Set([
  'assigneeNote',
  'description',
  'currentNote',
  'status',
]);
const requirementUpdateFields = new Set(['stage', 'externalWait']);
const securityHeaders = Object.freeze({
  'content-security-policy': "default-src 'self'; img-src 'self' data:; "
    + "connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
});

function sendJson(response, status, value) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function requestError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function assertPlainObjectFields(body, allowedFields, label) {
  if (
    body === null
    || typeof body !== 'object'
    || Array.isArray(body)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(body))
  ) {
    throw requestError(`${label} must be an object`, 400);
  }
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw requestError(`${key} is not accepted for ${label}`, 400);
    }
  }
}

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw requestError('Invalid path encoding', 400);
  }
}

function assertWorkflowRunBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw requestError('workflow run input must be an object', 400);
  }
  for (const key of Object.keys(body)) {
    if (!workflowRunFields.has(key)) {
      throw requestError(`${key} is not accepted for a workflow run`, 400);
    }
  }
}

function assertApprovalDecisionBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw requestError('approval decision input must be an object', 400);
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'decision') {
    throw requestError('approval decision accepts only decision', 400);
  }
  if (!approvalDecisions.has(body.decision)) {
    throw requestError('decision must be approved or rejected', 400);
  }
}

async function assertEmptyRequestBody(request, maxBodyBytes) {
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > maxBodyBytes) {
    throw requestError('Request body is too large', 413);
  }
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw requestError('Request body is too large', 413);
    }
  }
  if (size !== 0) throw requestError('Request body must be empty', 400);
}

function isOutside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative);
}

function resolveStaticFile(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decodedPath.includes('\0')) return null;

  const relative = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[/\\]+/, '');
  const candidate = path.resolve(publicRoot, relative);
  if (isOutside(publicRoot, candidate)) return null;

  try {
    const canonicalRoot = fs.realpathSync.native(publicRoot);
    const canonicalCandidate = fs.realpathSync.native(candidate);
    if (isOutside(canonicalRoot, canonicalCandidate)) return null;
    if (!fs.statSync(canonicalCandidate).isFile()) return null;
    return canonicalCandidate;
  } catch {
    return null;
  }
}

function seedPersonalWorkbench(store) {
  if (store.listRequirements().length > 0) return;
  const requirements = [
    {
      id: 'REQ-001',
      title: 'Android广告接入',
      stage: 'PRD中',
      externalWait: '等待运营反馈',
    },
    {
      id: 'REQ-002',
      title: 'iOS应用与IPA资源库',
      stage: '待评审',
      externalWait: '等待产品专员',
    },
    {
      id: 'REQ-003',
      title: '云存档月卡插单',
      stage: '已规划',
      externalWait: '无外部等待',
    },
  ];
  for (const requirement of requirements) store.upsertRequirement(requirement);
  store.addArtifact({
    id: 'ART-001',
    requirementId: 'REQ-001',
    kind: 'PRD',
    path: 'docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
  });
  store.addArtifact({
    id: 'ART-002',
    requirementId: 'REQ-001',
    kind: 'Demo',
    path: 'demos/产品经理全生命周期工作台demo.html',
  });
  store.upsertManualTask({
    id: 'MANUAL-001',
    requirementId: 'REQ-002',
    assigneeNote: '产品专员A',
    description: '补充异常场景与竞品证据',
    dueAt: '2026-07-30',
    expectedDeliverable: '候选PRD补充稿',
    currentNote: '等待我最终确认后提交评审',
    status: '进行中',
  });
}

export async function createWorkbenchServer({
  env = process.env,
  codexFactory,
  databaseFactory = openDatabase,
  processRecovery = recoverPersistedProcesses,
} = {}) {
  const config = createConfig(env);
  const store = databaseFactory(config.databasePath);
  seedPersonalWorkbench(store);
  const codex = codexFactory
    ? codexFactory(config)
    : new CodexAppServerClient({
        args: config.codexArgs,
        command: config.codexCommand,
        cwd: config.allowedRoot,
        nonceFactory: config.codexProcessNonce
          ? () => config.codexProcessNonce
          : undefined,
        shell: config.codexShell,
      });
  const contextService = new ContextService({
    store,
    allowedRoot: config.allowedRoot,
  });
  const fileSafety = new FileSafety({ allowedRoot: config.allowedRoot });
  const restartRuns = store.listStartupInterruptedRuns();
  const recoveryRecords = store.listPendingProcessRecoveries();
  const recoveryTargets = [...new Map(
    recoveryRecords
      .filter(record => Number.isInteger(record.processPid) && record.processPid > 0)
      .map(record => {
        const target = {
          pid: record.processPid,
          processNonce: record.processNonce || null,
        };
        return [`${target.pid}:${target.processNonce || ''}`, target];
      }),
  ).values()];
  let processRecoveryResult;
  try {
    processRecoveryResult = await processRecovery(recoveryTargets);
  } catch (error) {
    processRecoveryResult = {
      results: recoveryTargets.map(target => ({
        detail: `Process recovery failed before PID ${target.pid} could be inspected: ${error.message}`,
        pid: target.pid,
        processNonce: target.processNonce,
        status: 'error',
      })),
      status: 'error',
    };
  }
  const processRecoveryResults = Array.isArray(processRecoveryResult?.results)
    ? [...processRecoveryResult.results]
    : [];
  const recoveryKey = value => `${value.pid}:${value.processNonce || ''}`;
  const recoveredProcesses = new Set(processRecoveryResults.map(recoveryKey));
  for (const target of recoveryTargets) {
    if (!recoveredProcesses.has(recoveryKey(target))) {
      processRecoveryResults.push({
        detail: `Process recovery returned no result for persisted PID ${target.pid}`,
        pid: target.pid,
        processNonce: target.processNonce,
        status: 'error',
      });
    }
  }
  const recoveryByProcess = new Map(
    processRecoveryResults.map(result => [recoveryKey(result), result]),
  );
  const recoveryPersistenceErrors = [];
  for (const record of recoveryRecords) {
    const result = recoveryByProcess.get(recoveryKey({
      pid: record.processPid,
      processNonce: record.processNonce,
    }));
    if (!result) continue;
    store.saveValidation(record.runId, {
      detail: `PID ${result.pid}: ${result.detail}`,
      name: 'Broker process recovery',
      status: result.status === 'matched'
        ? 'passed'
        : result.status === 'error' ? 'failed' : 'skipped',
    });
    try {
      const persisted = result.status === 'error'
        ? store.recordProcessRecoveryError(record.runId, result.detail)
        : store.completeProcessRecovery(record.runId);
      if (!persisted) {
        throw new Error(`Recovery ledger row is missing for Run ${record.runId}`);
      }
    } catch (error) {
      recoveryPersistenceErrors.push({
        detail: `Unable to update process recovery ledger for Run ${record.runId}: ${error.message}`,
        pid: record.processPid,
        status: 'error',
      });
    }
  }
  const recoveryDiagnostics = [
    ...processRecoveryResults.map(result => ({
      detail: String(result.detail || ''),
      pid: result.pid,
      status: result.status,
    })),
    ...recoveryPersistenceErrors,
  ];
  const recoveryStatus = processRecoveryResult?.status === 'error'
    || recoveryDiagnostics.some(result => result.status === 'error')
    ? 'error'
    : 'ok';

  for (const interrupted of restartRuns) {
    for (const approval of store.listPendingApprovals(interrupted.id)) {
      store.resolveApproval(approval.id, 'rejected');
    }
    const snapshots = store.listFileSnapshots(interrupted.id);
    if (snapshots.length === 0) continue;
    const differences = fileSafety.compare(snapshots);
    if (store.getRunApplyState(interrupted.id).state === 'applying') {
      for (const change of differences) store.saveFileChange(interrupted.id, change);
    } else if (
      differences.length > 0
      && !store.listValidations(interrupted.id)
        .some(validation => validation.name === 'Broker restart conflict check')
    ) {
      store.saveValidation(interrupted.id, {
        name: 'Broker restart conflict check',
        status: 'failed',
        detail: `Files changed outside an applying run: ${
          differences.map(item => item.path).join(', ')
        }`,
      });
    }
  }
  const approvalManager = new ApprovalManager({
    store,
    codex,
    allowedRoot: config.allowedRoot,
  });
  const runs = new RunManager({
    store,
    codex,
    allowedRoot: config.allowedRoot,
    contextService,
    fileSafety,
    approvalManager,
    maxConcurrentRuns: config.maxConcurrentRuns,
    runTimeoutMs: config.runTimeoutMs,
  });

  async function healthPayload() {
    if (recoveryStatus === 'error') {
      return {
        broker: 'error',
        database: 'ok',
        recovery: 'error',
        recoveryDiagnostics,
        ...classifyCodexHealth(codex.diagnostics()),
      };
    }
    let launchError = '';
    try {
      await codex.start();
    } catch (error) {
      launchError = error.message;
    }
    return {
      broker: 'ok',
      database: 'ok',
      recovery: 'ok',
      recoveryDiagnostics,
      ...classifyCodexHealth({ ...codex.diagnostics(), launchError }),
    };
  }

  function rejectRunDuringRecovery(response) {
    return sendJson(response, 503, {
      error: 'Broker process recovery requires attention before Codex can start',
      recovery: 'error',
      recoveryDiagnostics,
    });
  }

  const server = http.createServer(async (request, response) => {
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.setHeader(name, value);
    }
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        const eventMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
        const queryToken = request.method === 'GET' && eventMatch
          ? url.searchParams.get('token')
          : null;
        assertLocalRequest(request, config, { queryToken });

        if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
          return sendJson(response, 200, {
            requirements: store.listRequirements(),
            artifacts: store.listArtifacts(),
            manualTasks: store.listManualTasks(),
            runs: store.listRuns(),
            requirementCandidates: store.listRequirementCandidates(),
            reviewFindings: store.listReviewFindings(),
            productStrategies: store.listProductStrategies(),
            workspace: { root: config.allowedRoot },
            capabilities: { permissions: ['read-only'] },
            health: await healthPayload(),
          });
        }
        if (request.method === 'GET' && url.pathname === '/api/health') {
          return sendJson(response, 200, await healthPayload());
        }
        if (request.method === 'POST' && url.pathname === '/api/runs') {
          if (recoveryStatus === 'error') return rejectRunDuringRecovery(response);
          const body = await readJsonBody(request, config.maxBodyBytes);
          const run = await runs.startReadOnlyRun(body);
          return sendJson(response, 202, run);
        }
        if (request.method === 'POST' && url.pathname === '/api/runs/write') {
          if (recoveryStatus === 'error') return rejectRunDuringRecovery(response);
          const body = await readJsonBody(request, config.maxBodyBytes);
          const run = await runs.startWriteRun(body);
          return sendJson(response, 202, run);
        }
        if (request.method === 'GET' && url.pathname === '/api/workflows') {
          return sendJson(
            response,
            200,
            Object.entries(workflowCatalog).map(([id, workflow]) => ({
              id,
              label: workflow.label,
              permission: workflow.permission,
            })),
          );
        }
        if (request.method === 'POST' && url.pathname === '/api/manual-tasks') {
          const body = await readJsonBody(request, config.maxBodyBytes);
          assertPlainObjectFields(body, manualTaskCreateFields, 'manual task input');
          if (!store.getRequirement(body.requirementId)) {
            return sendJson(response, 404, { error: 'Requirement not found' });
          }
          if (!productSpecialists.has(body.assigneeNote)) {
            return sendJson(response, 400, {
              error: 'assigneeNote must be 产品专员A or 产品专员B',
            });
          }
          const task = {
            id: `MANUAL-${crypto.randomUUID()}`,
            requirementId: body.requirementId,
            assigneeNote: body.assigneeNote,
            description: String(body.description || '').trim(),
            dueAt: body.dueAt || null,
            expectedDeliverable: String(body.expectedDeliverable || '').trim(),
            currentNote: String(body.currentNote || ''),
            status: '待开始',
          };
          if (!task.description || !task.expectedDeliverable) {
            return sendJson(response, 400, {
              error: 'description and expectedDeliverable are required',
            });
          }
          store.upsertManualTask(task);
          return sendJson(response, 201, store.getManualTask(task.id));
        }

        const requirementMatch = url.pathname.match(/^\/api\/requirements\/([^/]+)$/);
        if (request.method === 'PATCH' && requirementMatch) {
          const requirementId = decodePathSegment(requirementMatch[1]);
          const current = store.getRequirement(requirementId);
          if (!current) return sendJson(response, 404, { error: 'Requirement not found' });
          const body = await readJsonBody(request, config.maxBodyBytes);
          assertPlainObjectFields(body, requirementUpdateFields, 'requirement update');
          const stage = body.stage ?? current.stage;
          const externalWait = body.externalWait ?? current.externalWait;
          if (!requirementStages.has(stage) || !externalWaits.has(externalWait)) {
            return sendJson(response, 400, {
              error: 'Invalid requirement stage or external wait value',
            });
          }
          store.upsertRequirement({ ...current, stage, externalWait });
          return sendJson(response, 200, store.getRequirement(current.id));
        }

        const manualTaskMatch = url.pathname.match(/^\/api\/manual-tasks\/([^/]+)$/);
        if (request.method === 'PATCH' && manualTaskMatch) {
          const taskId = decodePathSegment(manualTaskMatch[1]);
          const current = store.getManualTask(taskId);
          if (!current) return sendJson(response, 404, { error: 'Manual task not found' });
          const body = await readJsonBody(request, config.maxBodyBytes);
          assertPlainObjectFields(body, manualTaskUpdateFields, 'manual task update');
          const next = {
            ...current,
            currentNote: String(body.currentNote ?? current.currentNote),
            status: body.status ?? current.status,
          };
          if (!manualTaskStatuses.has(next.status)) {
            return sendJson(response, 400, { error: 'Invalid manual task status' });
          }
          store.upsertManualTask(next);
          return sendJson(response, 200, store.getManualTask(next.id));
        }

        if (request.method === 'GET' && eventMatch) {
          const runId = decodePathSegment(eventMatch[1]);
          const run = store.getRun(runId);
          if (!run) return sendJson(response, 404, { error: 'Run not found' });
          response.writeHead(200, {
            'cache-control': 'no-cache',
            connection: 'keep-alive',
            'content-type': 'text/event-stream; charset=utf-8',
            'x-accel-buffering': 'no',
            'x-content-type-options': 'nosniff',
          });
          const requestedAfter = Number(request.headers['last-event-id'] || 0);
          let after = Number.isSafeInteger(requestedAfter) && requestedAfter >= 0
            ? requestedAfter
            : 0;
          const push = () => {
            for (const event of store.listRunEvents(runId, after)) {
              after = event.sequence;
              response.write(
                `id: ${event.sequence}\nevent: ${event.type}\n`
                + `data: ${JSON.stringify(event.payload)}\n\n`,
              );
            }
            const current = store.getRun(runId);
            if (current && !activeRunStatuses.has(current.status)) {
              response.write(`event: run.status\ndata: ${JSON.stringify(current)}\n\n`);
              response.end();
              return true;
            }
            return false;
          };
          if (!push()) {
            const timer = setInterval(() => push() && clearInterval(timer), 250);
            request.on('close', () => clearInterval(timer));
          }
          return;
        }

        const contextMatch = url.pathname.match(
          /^\/api\/requirements\/([^/]+)\/context$/,
        );
        if (request.method === 'GET' && contextMatch) {
          const requirementId = decodePathSegment(contextMatch[1]);
          return sendJson(
            response,
            200,
            contextService.getRequirementContext(requirementId),
          );
        }

        const workflowMatch = url.pathname.match(
          /^\/api\/workflows\/([^/]+)\/runs$/,
        );
        if (request.method === 'POST' && workflowMatch) {
          if (recoveryStatus === 'error') return rejectRunDuringRecovery(response);
          const workflowType = decodePathSegment(workflowMatch[1]);
          if (!Object.hasOwn(workflowCatalog, workflowType)) {
            return sendJson(response, 400, { error: 'Unknown workflow type' });
          }
          const body = await readJsonBody(request, config.maxBodyBytes);
          assertWorkflowRunBody(body);
          const run = await runs.startWorkflowRun({ ...body, workflowType });
          return sendJson(response, 202, run);
        }

        const resultMatch = url.pathname.match(
          /^\/api\/runs\/([^/]+)\/workflow-result$/,
        );
        if (request.method === 'GET' && resultMatch) {
          const runId = decodePathSegment(resultMatch[1]);
          const result = store.getWorkflowResult(runId);
          return result
            ? sendJson(response, 200, result)
            : sendJson(response, 404, { error: 'Workflow result not found' });
        }

        const runDetailMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
        if (request.method === 'GET' && runDetailMatch) {
          const runId = decodePathSegment(runDetailMatch[1]);
          const run = store.getRun(runId);
          return run
            ? sendJson(response, 200, {
                ...run,
                events: store.listRunEvents(runId),
                approvals: store.listApprovals(runId),
                fileChanges: store.listFileChanges(runId),
                validations: store.listValidations(runId),
              })
            : sendJson(response, 404, { error: 'Run not found' });
        }

        const cancelMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/cancel$/);
        if (request.method === 'POST' && cancelMatch) {
          const runId = decodePathSegment(cancelMatch[1]);
          if (!store.getRun(runId)) {
            return sendJson(response, 404, { error: 'Run not found' });
          }
          await assertEmptyRequestBody(request, config.maxBodyBytes);
          return sendJson(response, 200, await runs.cancel(runId));
        }

        const retryMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/retry$/);
        if (request.method === 'POST' && retryMatch) {
          if (recoveryStatus === 'error') return rejectRunDuringRecovery(response);
          const runId = decodePathSegment(retryMatch[1]);
          if (!store.getRun(runId)) {
            return sendJson(response, 404, { error: 'Run not found' });
          }
          await assertEmptyRequestBody(request, config.maxBodyBytes);
          return sendJson(response, 202, await runs.retry(runId));
        }

        const approvalMatch = url.pathname.match(
          /^\/api\/approvals\/([^/]+)\/decision$/,
        );
        if (request.method === 'POST' && approvalMatch) {
          const approvalId = decodePathSegment(approvalMatch[1]);
          const body = await readJsonBody(request, config.maxBodyBytes);
          assertApprovalDecisionBody(body);
          const approval = store.getApproval(approvalId);
          if (!approval) {
            return sendJson(response, 404, { error: 'Approval not found' });
          }
          if (approval.status !== 'pending') {
            return sendJson(response, 409, { error: 'Approval is not pending' });
          }
          approvalManager.resolve(approvalId, body.decision);
          return sendJson(response, 200, { status: body.decision });
        }

        const restoreMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/restore$/);
        if (request.method === 'POST' && restoreMatch) {
          const runId = decodePathSegment(restoreMatch[1]);
          const run = store.getRun(runId);
          if (!run) return sendJson(response, 404, { error: 'Run not found' });
          await assertEmptyRequestBody(request, config.maxBodyBytes);
          if (activeRunStatuses.has(run.status)) {
            return sendJson(response, 409, { error: 'Active runs cannot be restored' });
          }
          const changes = store
            .listFileChanges(runId)
            .filter(change => !change.restoredAt);
          if (changes.length === 0) {
            return sendJson(response, 409, {
              error: 'Run has no unrestored file changes',
            });
          }
          const snapshots = store.listFileSnapshots(runId);
          fileSafety.assertRestorable(snapshots, changes);
          const snapshotsByPath = new Map(
            snapshots.map(snapshot => [snapshot.path, snapshot]),
          );
          const restored = [];
          const pendingCheckpoint = [];
          const restoreFailure = error => {
            const restoredSet = new Set(restored);
            return sendJson(response, error.statusCode || 500, {
              error: `Restored ${restored.length} of ${changes.length} file changes`
                + ` before failure: ${error.message}`,
              restoredCount: restored.length,
              total: changes.length,
              restored,
              pendingCheckpoint,
              remaining: changes
                .map(item => item.path)
                .filter(filePath => !restoredSet.has(filePath)),
            });
          };
          for (const change of changes) {
            try {
              fileSafety.restore([snapshotsByPath.get(change.path)], [change]);
              restored.push(change.path);
            } catch (error) {
              return restoreFailure(error);
            }
            try {
              if (
                run.permission === 'generate-candidate'
                && change.kind === 'created'
              ) {
                store.removeArtifact(run.requirementId, change.path);
              }
            } catch (error) {
              pendingCheckpoint.push(change.path);
              return restoreFailure(error);
            }
            try {
              if (!store.markFileChangeRestored(runId, change.path)) {
                throw new Error(
                  `Restore checkpoint was not recorded: ${change.path}`,
                );
              }
            } catch (error) {
              pendingCheckpoint.push(change.path);
              return restoreFailure(error);
            }
          }
          return sendJson(response, 200, {
            restored,
          });
        }
        return sendJson(response, 404, { error: 'API route not found' });
      }

      const filename = resolveStaticFile(url.pathname);
      if (!filename) return sendJson(response, 404, { error: 'Static file not found' });
      const content = fs.readFileSync(filename);
      response.writeHead(200, {
        'content-type': contentTypes[path.extname(filename)] || 'application/octet-stream',
        'x-content-type-options': 'nosniff',
      });
      response.end(content);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message });
    }
  });
  const connections = new Set();
  server.on('connection', socket => {
    connections.add(socket);
    socket.once('close', () => connections.delete(socket));
  });

  let closePromise = null;
  const beginHttpClose = () => {
    let resolveClose;
    let settled = false;
    const completed = new Promise(resolve => {
      resolveClose = resolve;
    });
    const finish = error => {
      if (settled) return;
      settled = true;
      resolveClose(error || null);
    };
    try {
      server.close(finish);
    } catch (error) {
      finish(error);
    }
    for (const socket of connections) {
      socket.destroy();
    }
    return completed;
  };
  const awaitHttpClose = async completed => {
    let timeout;
    const outcome = await Promise.race([
      completed.then(error => ({ error, timedOut: false })),
      new Promise(resolve => {
        timeout = setTimeout(
          () => resolve({ error: null, timedOut: true }),
          SERVER_CLOSE_TIMEOUT_MS,
        );
      }),
    ]);
    clearTimeout(timeout);
    if (outcome.timedOut) {
      for (const socket of connections) {
        socket.destroy();
      }
      server.closeAllConnections?.();
      return;
    }
    if (
      outcome.error
      && outcome.error.code !== 'ERR_SERVER_NOT_RUNNING'
    ) {
      throw outcome.error;
    }
  };
  const close = () => {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      const httpClose = beginHttpClose();
      let failure = null;
      try {
        await codex.stop();
      } catch (error) {
        failure = error;
      }
      try {
        await awaitHttpClose(httpClose);
      } catch (error) {
        failure ||= error;
      }
      try {
        store.close();
      } catch (error) {
        failure ||= error;
      }
      if (failure) throw failure;
    })();
    return closePromise;
  };

  return {
    config,
    address: () => server.address(),
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, () => {
        server.off('error', reject);
        resolve();
      });
    }),
    close,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await createWorkbenchServer();
  await app.listen();
  const address = app.address();
  console.log(`Personal Codex Workbench: http://${address.address}:${address.port}`);
  console.log(`Local session token: ${app.config.sessionToken}`);
  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
