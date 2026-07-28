import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createWorkbenchServer } from '../workbench/server.mjs';

const externalSession = process.env.WORKBENCH_VERIFY_SESSION_JSON
  ? JSON.parse(process.env.WORKBENCH_VERIFY_SESSION_JSON)
  : null;
const repositoryRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(
  process.env.WORKBENCH_VERIFY_WORKSPACE || repositoryRoot,
);
const evidencePath = path.resolve(
  process.env.WORKBENCH_VERIFY_EVIDENCE
    || path.join(
      repositoryRoot,
      'test-results',
      'personal-codex-workbench',
      'real-integration-results.json',
    ),
);
const candidatePath = 'test-results/personal-codex-workbench/real-integration-candidate.md';
const candidateAbsolutePath = path.join(workspaceRoot, ...candidatePath.split('/'));
const terminalStatuses = new Set(['completed', 'failed', 'cancelled', 'interrupted']);
const startedAt = new Date().toISOString();
const codexVersion = externalSession
  ? String(process.env.WORKBENCH_VERIFY_CODEX_VERSION || 'portable Codex 0.130.0')
  : process.platform === 'win32'
    ? execFileSync('cmd.exe', ['/d', '/s', '/c', 'codex.cmd --version'], {
        cwd: workspaceRoot,
        encoding: 'utf8',
        windowsHide: true,
      }).trim()
    : execFileSync('codex.cmd', ['--version'], {
        cwd: workspaceRoot,
        encoding: 'utf8',
        windowsHide: true,
      }).trim();
const sourceCommit = externalSession
  ? String(process.env.WORKBENCH_VERIFY_SOURCE_COMMIT || 'external-session')
  : execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
const report = {
  startedAt,
  finishedAt: null,
  sourceCommit,
  codexVersion,
  candidatePath,
  status: 'running',
  health: null,
  readOnlyRun: null,
  workflows: {},
  writeRun: null,
  restored: null,
  protectedArtifactHashes: {},
  failure: null,
};

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function log(message) {
  process.stdout.write(`[real-e2e] ${new Date().toISOString()} ${message}\n`);
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function writeReport() {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

assert.equal(
  fs.existsSync(candidateAbsolutePath),
  false,
  `Candidate path must be absent before verification: ${candidatePath}`,
);

const app = externalSession
  ? {
      address: () => ({ port: externalSession.port }),
      close: async () => {},
      config: {
        originForPort: port => `http://127.0.0.1:${port}`,
        sessionToken: externalSession.token,
      },
      listen: async () => {},
    }
  : await createWorkbenchServer({
      env: {
        ...process.env,
        WORKBENCH_PORT: '0',
        WORKBENCH_ROOT: workspaceRoot,
      },
    });
let context;
let writeRunId = null;

async function api(pathname, { body, method = 'GET' } = {}) {
  const response = await fetch(`${context.baseUrl}${pathname}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${app.config.sessionToken}`,
      'Content-Type': 'application/json',
      Origin: context.origin,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(
      `${method} ${pathname} returned ${response.status}: ${payload.error || 'unknown error'}`,
    );
    error.payload = payload;
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function waitForRun(runId, {
  approveFileChanges = false,
  timeoutMs = 10 * 60 * 1000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastHeartbeat = 0;
  const resolvedApprovals = new Set();
  while (Date.now() < deadline) {
    const detail = await api(`/api/runs/${encodeURIComponent(runId)}`);
    const pending = (detail.approvals || []).filter(item => (
      item.status === 'pending' && !resolvedApprovals.has(item.id)
    ));
    for (const approval of pending) {
      const decision = approveFileChanges && approval.kind === 'file-change'
        ? 'approved'
        : 'rejected';
      await api(`/api/approvals/${encodeURIComponent(approval.id)}/decision`, {
        method: 'POST',
        body: { decision },
      });
      resolvedApprovals.add(approval.id);
      log(`${decision} approval ${approval.id} (${approval.kind}) for ${runId}`);
      if (decision !== 'approved') {
        throw new Error(`Unexpected unsafe approval requested: ${approval.kind}`);
      }
    }
    if (terminalStatuses.has(detail.status)) return detail;
    if (Date.now() - lastHeartbeat >= 15_000) {
      log(`waiting for ${runId}: status=${detail.status}, events=${detail.events.length}`);
      lastHeartbeat = Date.now();
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for Run ${runId}`);
}

function assertCompleted(detail, label) {
  assert.equal(
    detail.status,
    'completed',
    `${label} did not complete: ${detail.error || detail.status}`,
  );
  assert.equal(typeof detail.result, 'string', `${label} has no result text`);
  assert(detail.result.trim(), `${label} returned empty result text`);
}

try {
  await app.listen();
  const port = app.address().port;
  context = {
    baseUrl: `http://127.0.0.1:${port}`,
    origin: app.config.originForPort(port),
  };
  log(`broker listening on ${context.baseUrl}`);

  const bootstrap = await api('/api/bootstrap');
  report.health = bootstrap.health;
  assert.equal(bootstrap.health.broker, 'ok');
  assert.equal(bootstrap.health.codex, 'ok');
  assert.notEqual(bootstrap.health.configuration, 'error');
  assert.notEqual(bootstrap.health.authentication, 'error');
  log(`real Codex health passed: ${JSON.stringify(bootstrap.health)}`);

  const requirementId = 'REQ-001';
  const artifacts = bootstrap.artifacts.filter(item => item.requirementId === requirementId);
  const demo = artifacts.find(item => item.kind === 'Demo');
  const prd = artifacts.find(item => item.kind === 'PRD');
  assert(demo && prd, 'REQ-001 must have registered Demo and PRD artifacts');
  for (const artifact of [demo, prd]) {
    const absolute = path.join(workspaceRoot, ...artifact.path.split('/'));
    report.protectedArtifactHashes[artifact.path] = {
      before: sha256(absolute),
      after: null,
    };
  }

  const readOnly = await api('/api/runs', {
    method: 'POST',
    body: {
      requirementId,
      prompt: '只读检查已授权 PRD 是否可访问。不得修改文件；用一句中文说明检查结果。',
      files: [prd.path],
    },
  });
  const readOnlyDetail = await waitForRun(readOnly.id);
  assertCompleted(readOnlyDetail, 'read-only Run');
  report.readOnlyRun = {
    id: readOnly.id,
    status: readOnlyDetail.status,
    resultLength: readOnlyDetail.result.length,
    eventCount: readOnlyDetail.events.length,
  };
  log(`read-only Run completed: ${readOnly.id}`);

  const workflowCases = [
    {
      type: 'feedback-triage',
      files: [],
      input: {
        feedbackText: '两名用户反馈启动较慢；一名用户反馈启动后偶尔白屏；另有一名用户希望增加深色模式。',
      },
    },
    {
      type: 'demo-prd-review',
      files: [demo.path, prd.path],
      input: {},
    },
    {
      type: 'issue-strategy',
      files: [],
      input: {
        issueText: '测试发现网络中断后保存按钮一直转圈，恢复网络后不会自动重试，也没有失败提示。',
      },
    },
  ];
  for (const workflow of workflowCases) {
    const run = await api(`/api/workflows/${workflow.type}/runs`, {
      method: 'POST',
      body: {
        requirementId,
        files: workflow.files,
        input: workflow.input,
      },
    });
    const detail = await waitForRun(run.id);
    assertCompleted(detail, workflow.type);
    const result = await api(`/api/runs/${encodeURIComponent(run.id)}/workflow-result`);
    assert.equal(result.workflowType, workflow.type);
    report.workflows[workflow.type] = {
      id: run.id,
      status: detail.status,
      eventCount: detail.events.length,
      resultKeys: Object.keys(result.result),
    };
    log(`workflow completed: ${workflow.type} (${run.id})`);
  }

  const writeRun = await api('/api/runs/write', {
    method: 'POST',
    body: {
      requirementId,
      prompt: [
        '在唯一授权目标中创建一个 Markdown 候选文件。',
        '内容必须包含标题“真实联调候选”、一行“marker: WORKBENCH_REAL_E2E”，',
        '以及三条简短验收项。不要修改其他文件，不要运行命令。',
      ].join(''),
      permission: 'generate-candidate',
      targets: [candidatePath],
    },
  });
  writeRunId = writeRun.id;
  const writeDetail = await waitForRun(writeRun.id, { approveFileChanges: true });
  assertCompleted(writeDetail, 'write Run');
  assert.equal(fs.existsSync(candidateAbsolutePath), true, 'Candidate file was not applied');
  assert.match(fs.readFileSync(candidateAbsolutePath, 'utf8'), /WORKBENCH_REAL_E2E/);
  assert(writeDetail.fileChanges.some(item => item.path === candidatePath));
  assert(writeDetail.validations.every(item => item.status !== 'failed'));
  report.writeRun = {
    id: writeRun.id,
    status: writeDetail.status,
    approvals: writeDetail.approvals.map(item => ({
      kind: item.kind,
      status: item.status,
    })),
    fileChanges: writeDetail.fileChanges.map(item => ({
      kind: item.kind,
      path: item.path,
      diffLength: item.diff.length,
    })),
    validations: writeDetail.validations.map(item => ({
      name: item.name,
      status: item.status,
    })),
  };
  log(`write Run completed and candidate applied: ${writeRun.id}`);

  const restored = await api(`/api/runs/${encodeURIComponent(writeRun.id)}/restore`, {
    method: 'POST',
  });
  assert.deepEqual(restored.restored, [candidatePath]);
  const restoredDetail = await api(`/api/runs/${encodeURIComponent(writeRun.id)}`);
  assert(restoredDetail.fileChanges.every(item => typeof item.restoredAt === 'string'));
  assert.equal(fs.existsSync(candidateAbsolutePath), false, 'Candidate file remained after restore');
  report.restored = {
    paths: restored.restored,
    candidateAbsent: true,
    checkpointsRecorded: true,
  };
  log(`write Run restored through safety API: ${writeRun.id}`);

  for (const [artifactPath, hashes] of Object.entries(report.protectedArtifactHashes)) {
    const absolute = path.join(workspaceRoot, ...artifactPath.split('/'));
    hashes.after = sha256(absolute);
    assert.equal(hashes.after, hashes.before, `Protected artifact changed: ${artifactPath}`);
  }

  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.stack || error.message;
  if (writeRunId && context) {
    try {
      const detail = await api(`/api/runs/${encodeURIComponent(writeRunId)}`);
      if (
        !terminalStatuses.has(detail.status)
        && ['queued', 'running', 'waiting-approval'].includes(detail.status)
      ) {
        await api(`/api/runs/${encodeURIComponent(writeRunId)}/cancel`, {
          method: 'POST',
        });
      }
      const unrestored = (detail.fileChanges || []).some(item => !item.restoredAt);
      if (terminalStatuses.has(detail.status) && unrestored) {
        await api(`/api/runs/${encodeURIComponent(writeRunId)}/restore`, {
          method: 'POST',
        });
      }
    } catch (cleanupError) {
      report.cleanupFailure = cleanupError.stack || cleanupError.message;
    }
  }
} finally {
  report.finishedAt = new Date().toISOString();
  writeReport();
  await app.close();
}

if (report.status !== 'passed') {
  throw new Error(`Real integration verification failed; see ${evidencePath}`);
}
log(`PASS real integration; evidence: ${evidencePath}`);
