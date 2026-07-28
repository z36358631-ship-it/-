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
import { openDatabase } from './lib/database.mjs';
import { RunManager } from './lib/run-manager.mjs';
import { assertLocalRequest, readJsonBody } from './lib/security.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(here, 'public');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const activeRunStatuses = new Set(['queued', 'running']);
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

function sendJson(response, status, value) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  response.end(JSON.stringify(value));
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

export async function createWorkbenchServer({ env = process.env, codexFactory } = {}) {
  const config = createConfig(env);
  const store = openDatabase(config.databasePath);
  seedPersonalWorkbench(store);
  const codex = codexFactory
    ? codexFactory(config)
    : new CodexAppServerClient({ cwd: config.allowedRoot });
  const runs = new RunManager({
    store,
    codex,
    allowedRoot: config.allowedRoot,
    maxConcurrentRuns: config.maxConcurrentRuns,
  });

  async function healthPayload() {
    let launchError = '';
    try {
      await codex.start();
    } catch (error) {
      launchError = error.message;
    }
    return {
      broker: 'ok',
      database: 'ok',
      ...classifyCodexHealth({ ...codex.diagnostics(), launchError }),
    };
  }

  const server = http.createServer(async (request, response) => {
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
            workspace: { root: config.allowedRoot },
            capabilities: { permissions: ['read-only'] },
            health: await healthPayload(),
          });
        }
        if (request.method === 'GET' && url.pathname === '/api/health') {
          return sendJson(response, 200, await healthPayload());
        }
        if (request.method === 'POST' && url.pathname === '/api/runs') {
          const body = await readJsonBody(request, config.maxBodyBytes);
          const run = await runs.startReadOnlyRun(body);
          return sendJson(response, 202, run);
        }
        if (request.method === 'POST' && url.pathname === '/api/manual-tasks') {
          const body = await readJsonBody(request, config.maxBodyBytes);
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
          const requirementId = decodeURIComponent(requirementMatch[1]);
          const current = store.getRequirement(requirementId);
          if (!current) return sendJson(response, 404, { error: 'Requirement not found' });
          const body = await readJsonBody(request, config.maxBodyBytes);
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
          const taskId = decodeURIComponent(manualTaskMatch[1]);
          const current = store.getManualTask(taskId);
          if (!current) return sendJson(response, 404, { error: 'Manual task not found' });
          const body = await readJsonBody(request, config.maxBodyBytes);
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
          const runId = decodeURIComponent(eventMatch[1]);
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
    close: () => new Promise(resolve => {
      server.close(() => {
        Promise.resolve(codex.stop()).finally(() => {
          store.close();
          resolve();
        });
      });
    }),
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
