# Personal Codex Workbench Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有多人流程原型改成单人产品经理工作台，并通过仅监听本机的 Node Broker 打通一条“选择需求与文件—发起只读 Codex 任务—实时查看结果—刷新后仍可回看”的真实纵向链路。

**Architecture:** 浏览器只访问 `127.0.0.1` 上的 Node Broker，不拼接 CLI 参数、不直接读取本地文件；Broker 负责路径与会话校验、SQLite 持久化、Codex App Server 的 stdio JSON-RPC 通信以及 SSE 事件转发。此阶段只开放 `read-only` 运行，保留六页业务信息架构，但彻底删除多人账号、审批流、下一责任人和模拟 AI 员工概念。

**Tech Stack:** Node.js 24、Node 内置 `http`/`child_process`/`node:sqlite`、原生 HTML/CSS/JavaScript、Codex App Server、SSE、Node Test Runner、Playwright Core

---

## 实施边界与文件结构

本计划完成后应产生以下结构：

```text
workbench/
  server.mjs                         # 本机 HTTP/SSE Broker 与静态文件入口
  lib/
    config.mjs                       # 只读解析环境配置，生成短期本机会话令牌
    database.mjs                     # SQLite 建库、迁移和基础仓储
    security.mjs                     # Origin、令牌、请求体和授权路径校验
    codex-app-server-client.mjs      # App Server 子进程、JSON-RPC 和事件分发
    run-manager.mjs                  # 只读 Run 生命周期和持久化
  public/
    index.html                       # 单人产品经理工作台六页外壳
    styles.css                       # 从现有运营后台提炼的视觉样式
    app.js                           # API、SSE、需求详情和 Codex 抽屉交互
test/workbench/
  config-security.test.mjs
  database.test.mjs
  codex-app-server-client.test.mjs
  run-manager.test.mjs
  server.test.mjs
tools/
  verify-personal-codex-workbench-ui.mjs
```

职责边界：

- `config.mjs` 不修改任何用户配置，只暴露本次进程的确定配置。
- `security.mjs` 是所有 HTTP 请求进入业务逻辑前的唯一安全门。
- `database.mjs` 不启动 Codex，不持有子进程。
- `codex-app-server-client.mjs` 不理解需求业务，只负责协议和进程。
- `run-manager.mjs` 不接受原始 shell 命令或任意 Codex 参数，只接受已校验的业务输入。
- `public/app.js` 只提交需求 ID、授权文件和自然语言任务。

## Task 0: 解除 Codex 本机配置前置阻塞

**Files:**
- Inspect: `C:/Users/z3635/.codex/config.toml`
- No repository file changes

- [ ] **Step 1: 只读复现配置错误**

Run:

```powershell
codex.cmd --version
codex.cmd app-server --help
```

Expected: 当前环境若仍包含 `service_tier = "default"`，第二条命令明确报告 `service_tier` 仅接受 `fast` 或 `flex`，并且没有启动常驻进程。

- [ ] **Step 2: 停止执行并取得单独确认**

向用户明确说明：

```text
需要修改工作区外文件 C:\Users\z3635\.codex\config.toml：
仅删除精确的一行 service_tier = "default"，保留其余配置，并先创建 config.toml.before-workbench.bak。
推荐删除该行以继承 Codex 默认服务等级；不会把该修改提交到 Git。是否执行？
```

Expected: 没有明确确认时，本计划停在此处；不得把 `default` 静默改成 `fast` 或 `flex`。

- [ ] **Step 3: 获得确认后做带备份的精确修改**

Run:

```powershell
$configPath = 'C:\Users\z3635\.codex\config.toml'
$backupPath = 'C:\Users\z3635\.codex\config.toml.before-workbench.bak'
$content = Get-Content -LiteralPath $configPath -Raw -Encoding utf8
$matches = [regex]::Matches($content, '(?m)^\s*service_tier\s*=\s*"default"\s*\r?\n?')
if ($matches.Count -ne 1) { throw "Expected exactly one default service_tier line, found $($matches.Count)" }
if (Test-Path -LiteralPath $backupPath) { throw "Backup already exists: $backupPath" }
Copy-Item -LiteralPath $configPath -Destination $backupPath
$updated = [regex]::Replace($content, '(?m)^\s*service_tier\s*=\s*"default"\s*\r?\n?', '', 1)
[System.IO.File]::WriteAllText($configPath, $updated, [System.Text.UTF8Encoding]::new($false))
```

Expected: 只删除目标行，备份存在，其余内容逐字保留。

- [ ] **Step 4: 验证 Codex 可解析配置**

Run:

```powershell
codex.cmd --version
codex.cmd app-server --help
```

Expected: 两条命令退出码均为 `0`，输出版本号和 App Server 帮助；若仍失败，保留原错误并停止后续 Codex 联调。

## Task 1: 建立测试入口与本机安全配置

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `test/workbench/config-security.test.mjs`
- Create: `workbench/lib/config.mjs`
- Create: `workbench/lib/security.mjs`

- [ ] **Step 1: 写配置与安全门失败测试**

Create `test/workbench/config-security.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createConfig } from '../../workbench/lib/config.mjs';
import {
  assertAuthorizedPath,
  assertJsonRequest,
  assertLocalRequest,
} from '../../workbench/lib/security.mjs';

test('createConfig fixes host, root, limits and creates a per-process token', () => {
  const root = path.resolve('C:/workspace');
  const config = createConfig({
    WORKBENCH_ROOT: root,
    WORKBENCH_PORT: '4317',
  });
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 4317);
  assert.equal(config.allowedRoot, root);
  assert.equal(config.maxBodyBytes, 1_048_576);
  assert.equal(config.maxConcurrentRuns, 1);
  assert.match(config.sessionToken, /^[a-f0-9]{64}$/);
});

test('local request requires exact origin and bearer token', () => {
  const config = createConfig({ WORKBENCH_ROOT: path.resolve('C:/workspace') });
  const request = {
    headers: {
      host: '127.0.0.1:4317',
      origin: config.origin,
      authorization: `Bearer ${config.sessionToken}`,
    },
    socket: { localPort: 4317 },
  };
  assert.doesNotThrow(() => assertLocalRequest(request, config));
  assert.throws(
    () => assertLocalRequest({ headers: { ...request.headers, origin: 'https://evil.example' } }, config),
    /Origin/,
  );
  assert.throws(
    () => assertLocalRequest({ headers: { host: request.headers.host, origin: config.origin }, socket: request.socket }, config),
    /token/,
  );
});

test('authorized path cannot escape the configured root', () => {
  const root = path.join(os.tmpdir(), 'workbench-root');
  fs.mkdirSync(root, { recursive: true });
  assert.equal(
    assertAuthorizedPath(root, path.join(root, 'prd', 'feature.md')),
    path.resolve(root, 'prd', 'feature.md'),
  );
  assert.throws(
    () => assertAuthorizedPath(root, path.join(root, '..', 'secret.txt')),
    /outside allowed root/,
  );
});

test('JSON request rejects non-json and oversized bodies before parsing', async () => {
  await assert.rejects(
    () => assertJsonRequest({ headers: { 'content-type': 'text/plain' } }, 1_048_576),
    /application\/json/,
  );
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test test/workbench/config-security.test.mjs
```

Expected: FAIL，提示找不到 `workbench/lib/config.mjs` 或 `security.mjs`。

- [ ] **Step 3: 实现确定配置**

Create `workbench/lib/config.mjs`:

```js
import crypto from 'node:crypto';
import path from 'node:path';

export function createConfig(env = process.env) {
  const allowedRoot = path.resolve(env.WORKBENCH_ROOT || process.cwd());
  const port = Number(env.WORKBENCH_PORT || 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('WORKBENCH_PORT must be an integer between 1024 and 65535');
  }
  return Object.freeze({
    host: '127.0.0.1',
    port,
    origin: `http://127.0.0.1:${port}`,
    allowedRoot,
    databasePath: path.join(allowedRoot, '.workbench-data', 'workbench.sqlite'),
    sessionToken: crypto.randomBytes(32).toString('hex'),
    maxBodyBytes: 1_048_576,
    maxConcurrentRuns: 1,
    runTimeoutMs: 10 * 60 * 1000,
    codexCommand: 'codex.cmd',
    codexArgs: Object.freeze(['app-server']),
  });
}
```

- [ ] **Step 4: 实现请求和路径校验**

Create `workbench/lib/security.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

export function assertLocalRequest(request, config) {
  const expectedOrigin = config.origin || config.originForPort(request.socket.localPort);
  const expectedHost = new URL(expectedOrigin).host;
  if (request.headers.host !== expectedHost) {
    throw Object.assign(new Error('Host is not allowed'), { statusCode: 403 });
  }
  if (request.headers.origin && request.headers.origin !== expectedOrigin) {
    throw Object.assign(new Error('Origin is not allowed'), { statusCode: 403 });
  }
  if (
    !request.headers.origin
    && request.headers['sec-fetch-site']
    && request.headers['sec-fetch-site'] !== 'same-origin'
  ) {
    throw Object.assign(new Error('Request is not same-origin'), { statusCode: 403 });
  }
  if (request.headers.authorization !== `Bearer ${config.sessionToken}`) {
    throw Object.assign(new Error('Invalid local session token'), { statusCode: 401 });
  }
}

export function assertAuthorizedPath(root, candidate) {
  if (typeof candidate !== 'string' || candidate.includes('\0')) {
    throw Object.assign(new Error('Invalid path'), { statusCode: 400 });
  }
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw Object.assign(new Error('Path is outside allowed root'), { statusCode: 403 });
  }
  const canonicalRoot = fs.realpathSync.native(resolvedRoot);
  let existing = resolvedCandidate;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const canonicalExisting = fs.realpathSync.native(existing);
  const canonicalRelative = path.relative(canonicalRoot, canonicalExisting);
  if (
    canonicalRelative === '..'
    || canonicalRelative.startsWith(`..${path.sep}`)
    || path.isAbsolute(canonicalRelative)
  ) {
    throw Object.assign(new Error('Path resolves outside allowed root'), { statusCode: 403 });
  }
  return resolvedCandidate;
}

export async function assertJsonRequest(request, maxBodyBytes) {
  if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    throw Object.assign(new Error('Content-Type must be application/json'), { statusCode: 415 });
  }
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > maxBodyBytes) {
    throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
  }
}

export async function readJsonBody(request, maxBodyBytes) {
  await assertJsonRequest(request, maxBodyBytes);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw Object.assign(new Error('Request body is too large'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Request body is not valid JSON'), { statusCode: 400 });
  }
}
```

- [ ] **Step 5: 增加脚本和运行数据忽略项**

Modify `package.json` to:

```json
{
  "scripts": {
    "workbench:start": "node workbench/server.mjs",
    "workbench:test": "node --test test/workbench/*.test.mjs",
    "workbench:verify-ui": "node tools/verify-personal-codex-workbench-ui.mjs"
  },
  "dependencies": {
    "docx": "^9.6.1"
  }
}
```

Append to `.gitignore`:

```gitignore
.workbench-data/
test-results/personal-codex-workbench/
```

- [ ] **Step 6: 运行安全测试**

Run:

```powershell
node --test test/workbench/config-security.test.mjs
```

Expected: 4 tests PASS。

- [ ] **Step 7: 提交**

```powershell
git add package.json .gitignore test/workbench/config-security.test.mjs workbench/lib/config.mjs workbench/lib/security.mjs
git commit -m "feat: add local workbench security boundary"
```

## Task 2: 建立 SQLite 基础数据模型

**Files:**
- Create: `test/workbench/database.test.mjs`
- Create: `workbench/lib/database.mjs`

- [ ] **Step 1: 写迁移与持久化失败测试**

Create `test/workbench/database.test.mjs`:

```js
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../../workbench/lib/database.mjs';

test('database persists requirements, artifacts, runs and ordered events', () => {
  const dbPath = path.join(os.tmpdir(), `workbench-${crypto.randomUUID()}.sqlite`);
  const store = openDatabase(dbPath);
  store.upsertRequirement({
    id: 'REQ-001',
    title: 'Android广告接入',
    stage: 'PRD中',
    externalWait: '等待运营反馈',
  });
  store.addArtifact({
    id: 'ART-001',
    requirementId: 'REQ-001',
    kind: 'PRD',
    path: 'prd/android-ad.md',
  });
  store.createRun({
    id: 'RUN-001',
    requirementId: 'REQ-001',
    prompt: '检查文档遗漏',
    permission: 'read-only',
    status: 'running',
  });
  store.saveRunContext('RUN-001', {
    files: ['prd/android-ad.md'],
    input: { source: '需求详情' },
  });
  store.appendRunEvent('RUN-001', 'agent_message_delta', { text: '发现一个问题' });
  store.finishRun('RUN-001', 'completed', '发现一个问题');
  store.upsertManualTask({
    id: 'MANUAL-001',
    requirementId: 'REQ-001',
    assigneeNote: '产品专员A',
    description: '补充竞品截图',
    dueAt: '2026-07-30',
    expectedDeliverable: '3张带来源截图',
    currentNote: '已收集2张',
    status: '进行中',
  });
  assert.equal(store.listRequirements().length, 1);
  assert.equal(store.listArtifacts('REQ-001')[0].path, 'prd/android-ad.md');
  assert.equal(store.getRun('RUN-001').status, 'completed');
  assert.deepEqual(store.getRunContext('RUN-001').files, ['prd/android-ad.md']);
  assert.equal(store.listRunEvents('RUN-001')[0].sequence, 1);
  assert.equal(store.listManualTasks('REQ-001')[0].assigneeNote, '产品专员A');
  store.close();

  const reopened = openDatabase(dbPath);
  assert.equal(reopened.getRun('RUN-001').result, '发现一个问题');
  reopened.close();
});

test('startup marks stale running rows as interrupted', () => {
  const dbPath = path.join(os.tmpdir(), `workbench-${crypto.randomUUID()}.sqlite`);
  const first = openDatabase(dbPath);
  first.createRun({
    id: 'RUN-STALE',
    requirementId: null,
    prompt: '总结今天工作',
    permission: 'read-only',
    status: 'running',
  });
  first.close();
  const second = openDatabase(dbPath);
  assert.equal(second.getRun('RUN-STALE').status, 'interrupted');
  second.close();
});
```

- [ ] **Step 2: 运行数据库测试确认失败**

Run:

```powershell
node --test test/workbench/database.test.mjs
```

Expected: FAIL，提示 `openDatabase` 模块不存在。

- [ ] **Step 3: 实现迁移、仓储和启动恢复**

Create `workbench/lib/database.mjs`:

```js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const migration = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  external_wait TEXT NOT NULL DEFAULT '无外部等待',
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  UNIQUE(requirement_id, path)
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  thread_id TEXT,
  turn_id TEXT,
  prompt TEXT NOT NULL,
  cwd TEXT NOT NULL,
  process_pid INTEGER,
  permission TEXT NOT NULL CHECK(permission IN ('read-only','generate-candidate','modify-existing')),
  status TEXT NOT NULL CHECK(status IN ('queued','running','waiting-approval','completed','failed','cancelled','interrupted')),
  result TEXT,
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(run_id, sequence)
);
CREATE TABLE IF NOT EXISTS run_contexts (
  run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  files_json TEXT NOT NULL,
  input_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS manual_tasks (
  id TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  assignee_note TEXT NOT NULL,
  description TEXT NOT NULL,
  due_at TEXT,
  expected_deliverable TEXT NOT NULL,
  current_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('待开始','进行中','已完成')),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_events_run_sequence ON run_events(run_id, sequence);
`;

function now() {
  return new Date().toISOString();
}

export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(migration);
  db.prepare(
    `UPDATE runs SET status = 'interrupted', error = ?, finished_at = ?
     WHERE status IN ('queued', 'running')`,
  ).run('Broker restarted before the run completed', now());

  return {
    upsertRequirement(value) {
      db.prepare(
        `INSERT INTO requirements(id,title,stage,external_wait,updated_at)
         VALUES(?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title, stage=excluded.stage,
           external_wait=excluded.external_wait, updated_at=excluded.updated_at`,
      ).run(value.id, value.title, value.stage, value.externalWait || '无外部等待', now());
    },
    listRequirements() {
      return db.prepare(
        `SELECT id,title,stage,external_wait AS externalWait,updated_at AS updatedAt
         FROM requirements ORDER BY updated_at DESC`,
      ).all();
    },
    addArtifact(value) {
      db.prepare(
        `INSERT INTO artifacts(id,requirement_id,kind,path) VALUES(?,?,?,?)
         ON CONFLICT(requirement_id,path) DO UPDATE SET kind=excluded.kind`,
      ).run(value.id, value.requirementId, value.kind, value.path);
    },
    listArtifacts(requirementId = null) {
      return requirementId
        ? db.prepare(
            `SELECT id,requirement_id AS requirementId,kind,path
             FROM artifacts WHERE requirement_id=? ORDER BY kind,path`,
          ).all(requirementId)
        : db.prepare(
            `SELECT id,requirement_id AS requirementId,kind,path
             FROM artifacts ORDER BY requirement_id,kind,path`,
          ).all();
    },
    createRun(value) {
      db.prepare(
        `INSERT INTO runs(id,requirement_id,prompt,cwd,process_pid,permission,status,started_at)
         VALUES(?,?,?,?,?,?,?,?)`,
      ).run(
        value.id, value.requirementId, value.prompt, value.cwd || process.cwd(),
        value.processPid || null, value.permission, value.status, now(),
      );
    },
    saveRunContext(runId, { files = [], input = {} }) {
      db.prepare(
        `INSERT INTO run_contexts(run_id,files_json,input_json) VALUES(?,?,?)
         ON CONFLICT(run_id) DO UPDATE SET
           files_json=excluded.files_json,input_json=excluded.input_json`,
      ).run(runId, JSON.stringify(files), JSON.stringify(input));
    },
    getRunContext(runId) {
      const row = db.prepare(
        `SELECT files_json AS filesJson,input_json AS inputJson
         FROM run_contexts WHERE run_id=?`,
      ).get(runId);
      return row ? { files: JSON.parse(row.filesJson), input: JSON.parse(row.inputJson) } : null;
    },
    bindProtocolIds(runId, threadId, turnId = null, processPid = null) {
      db.prepare(`UPDATE runs SET thread_id=?,turn_id=?,process_pid=? WHERE id=?`)
        .run(threadId, turnId, processPid, runId);
    },
    appendRunEvent(runId, type, payload) {
      db.prepare(
        `INSERT INTO run_events(run_id,sequence,type,payload_json,created_at)
         SELECT ?,COALESCE(MAX(sequence),0)+1,?,?,? FROM run_events WHERE run_id=?`,
      ).run(runId, type, JSON.stringify(payload), now(), runId);
    },
    finishRun(runId, status, result = null, error = null) {
      db.prepare(
        `UPDATE runs SET status=?,result=?,error=?,finished_at=? WHERE id=?`,
      ).run(status, result, error, now(), runId);
    },
    getRun(runId) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,thread_id AS threadId,turn_id AS turnId,
                prompt,cwd,process_pid AS processPid,permission,status,result,error,
                started_at AS startedAt,finished_at AS finishedAt
         FROM runs WHERE id=?`,
      ).get(runId);
    },
    listRuns(limit = 30) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,thread_id AS threadId,turn_id AS turnId,
                prompt,cwd,process_pid AS processPid,permission,status,result,error,
                started_at AS startedAt,finished_at AS finishedAt
         FROM runs ORDER BY started_at DESC LIMIT ?`,
      ).all(limit);
    },
    countActiveRuns() {
      return db.prepare(
        `SELECT COUNT(*) AS count FROM runs WHERE status IN ('queued','running','waiting-approval')`,
      ).get().count;
    },
    listRunEvents(runId, after = 0) {
      return db.prepare(
        `SELECT sequence,type,payload_json AS payloadJson,created_at AS createdAt
         FROM run_events WHERE run_id=? AND sequence>? ORDER BY sequence`,
      ).all(runId, after).map(row => ({ ...row, payload: JSON.parse(row.payloadJson) }));
    },
    upsertManualTask(value) {
      db.prepare(
        `INSERT INTO manual_tasks
         (id,requirement_id,assignee_note,description,due_at,expected_deliverable,current_note,status,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           assignee_note=excluded.assignee_note,description=excluded.description,
           due_at=excluded.due_at,expected_deliverable=excluded.expected_deliverable,
           current_note=excluded.current_note,status=excluded.status,updated_at=excluded.updated_at`,
      ).run(
        value.id, value.requirementId, value.assigneeNote, value.description,
        value.dueAt || null, value.expectedDeliverable, value.currentNote || '',
        value.status, now(),
      );
    },
    listManualTasks(requirementId = null) {
      return requirementId
        ? db.prepare(
            `SELECT id,requirement_id AS requirementId,assignee_note AS assigneeNote,
                    description,due_at AS dueAt,expected_deliverable AS expectedDeliverable,
                    current_note AS currentNote,status,updated_at AS updatedAt
             FROM manual_tasks WHERE requirement_id=? ORDER BY updated_at DESC`,
          ).all(requirementId)
        : db.prepare(
            `SELECT id,requirement_id AS requirementId,assignee_note AS assigneeNote,
                    description,due_at AS dueAt,expected_deliverable AS expectedDeliverable,
                    current_note AS currentNote,status,updated_at AS updatedAt
             FROM manual_tasks ORDER BY updated_at DESC`,
          ).all();
    },
    getManualTask(id) {
      return db.prepare(
        `SELECT id,requirement_id AS requirementId,assignee_note AS assigneeNote,
                description,due_at AS dueAt,expected_deliverable AS expectedDeliverable,
                current_note AS currentNote,status,updated_at AS updatedAt
         FROM manual_tasks WHERE id=?`,
      ).get(id);
    },
    close() {
      db.close();
    },
  };
}
```

- [ ] **Step 4: 运行数据库测试**

Run:

```powershell
node --test test/workbench/database.test.mjs
```

Expected: 2 tests PASS；Node 可能输出 `node:sqlite` experimental warning，但不得有测试失败。

- [ ] **Step 5: 提交**

```powershell
git add test/workbench/database.test.mjs workbench/lib/database.mjs
git commit -m "feat: persist workbench requirements and runs"
```

## Task 3: 实现可测试的 Codex App Server 协议客户端

**Files:**
- Create: `test/workbench/codex-app-server-client.test.mjs`
- Create: `workbench/lib/codex-app-server-client.mjs`

- [ ] **Step 1: 写 JSON-RPC 初始化与事件失败测试**

Create `test/workbench/codex-app-server-client.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import {
  classifyCodexHealth,
  CodexAppServerClient,
} from '../../workbench/lib/codex-app-server-client.mjs';

function fakeProcess() {
  const process = new EventEmitter();
  process.stdin = new PassThrough();
  process.stdout = new PassThrough();
  process.stderr = new PassThrough();
  process.kill = () => true;
  return process;
}

test('client initializes in protocol order and routes notifications', async () => {
  const child = fakeProcess();
  const writes = [];
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  const initializing = client.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes[0].method, 'initialize');
  child.stdout.write(`${JSON.stringify({ id: writes[0].id, result: { userAgent: 'test' } })}\n`);
  await initializing;
  assert.equal(writes[1].method, 'initialized');

  const events = [];
  client.on('notification', value => events.push(value));
  child.stdout.write(`${JSON.stringify({
    method: 'item/agentMessage/delta',
    params: { threadId: 'th-1', turnId: 'tu-1', delta: '你好' },
  })}\n`);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(events[0].method, 'item/agentMessage/delta');
  await client.stop();
});

test('client correlates responses by id and exposes stderr diagnostics', async () => {
  const child = fakeProcess();
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  child.stdin.on('data', chunk => {
    const message = JSON.parse(chunk.toString('utf8'));
    if (message.method === 'initialize') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: {} })}\n`);
    }
    if (message.method === 'thread/start') {
      child.stdout.write(`${JSON.stringify({ id: message.id, result: { thread: { id: 'th-9' } } })}\n`);
    }
  });
  await client.start();
  const result = await client.request('thread/start', { cwd: 'C:/workspace' });
  assert.equal(result.thread.id, 'th-9');
  child.stderr.write('invalid service_tier');
  assert.match(client.diagnostics().stderr, /service_tier/);
  assert.deepEqual(
    classifyCodexHealth({ running: false, stderr: client.diagnostics().stderr }),
    {
      codex: 'unavailable',
      configuration: 'error',
      authentication: 'unknown',
      diagnostic: 'invalid service_tier',
    },
  );
  await client.stop();
});
```

- [ ] **Step 2: 运行客户端测试确认失败**

Run:

```powershell
node --test test/workbench/codex-app-server-client.test.mjs
```

Expected: FAIL，提示客户端模块不存在。

- [ ] **Step 3: 实现 JSONL 解码、请求关联和初始化**

Create `workbench/lib/codex-app-server-client.mjs`:

```js
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export function classifyCodexHealth({ running, stderr = '', launchError = '' }) {
  const diagnostic = `${launchError}\n${stderr}`;
  const missing = /ENOENT|not recognized|找不到指定的文件/i.test(diagnostic);
  const configError = /service_tier|config\.toml|invalid config|configuration error/i.test(diagnostic);
  const authError = /not logged in|authentication|unauthorized|login required|401/i.test(diagnostic);
  return {
    codex: running ? 'ok' : missing ? 'not-installed' : 'unavailable',
    configuration: configError ? 'error' : running ? 'ok' : 'unknown',
    authentication: authError ? 'error' : running ? 'unknown-until-turn' : 'unknown',
    diagnostic: diagnostic.trim().slice(-4_000),
  };
}

export class CodexAppServerClient extends EventEmitter {
  constructor({
    command = 'codex.cmd',
    args = ['app-server'],
    cwd = process.cwd(),
    spawnProcess = (cmd, argv, options) => spawn(cmd, argv, options),
  } = {}) {
    super();
    this.command = command;
    this.args = [...args];
    this.cwd = cwd;
    this.spawnProcess = spawnProcess;
    this.child = null;
    this.nextId = 1;
    this.pending = new Map();
    this.stderrText = '';
  }

  async start() {
    if (this.child) return;
    this.child = this.spawnProcess(this.command, this.args, {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: process.env,
    });
    const lines = readline.createInterface({ input: this.child.stdout });
    lines.on('line', line => this.#receive(line));
    this.child.stderr.on('data', chunk => {
      this.stderrText = `${this.stderrText}${chunk.toString('utf8')}`.slice(-16_384);
      this.emit('stderr', chunk.toString('utf8'));
    });
    this.child.on('error', error => {
      this.stderrText = `${this.stderrText}\n${error.message}`.trim().slice(-16_384);
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
      this.child = null;
      this.emit('processError', error);
    });
    this.child.on('exit', (code, signal) => {
      const error = new Error(`Codex App Server exited: code=${code} signal=${signal}`);
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
      this.child = null;
      this.emit('exit', { code, signal });
    });
    await this.request('initialize', {
      clientInfo: { name: 'personal-product-workbench', version: '0.1.0' },
      capabilities: { experimentalApi: false },
    });
    this.notify('initialized', {});
  }

  request(method, params) {
    if (!this.child) return Promise.reject(new Error('Codex App Server is not running'));
    const id = this.nextId++;
    this.#write({ jsonrpc: '2.0', id, method, params });
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  notify(method, params) {
    if (!this.child) throw new Error('Codex App Server is not running');
    this.#write({ jsonrpc: '2.0', method, params });
  }

  diagnostics() {
    return {
      running: Boolean(this.child),
      command: this.command,
      args: [...this.args],
      stderr: this.stderrText,
    };
  }

  async stop() {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    child.kill();
  }

  #write(message) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #receive(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.emit('protocolError', new Error(`Invalid JSONL from App Server: ${line.slice(0, 200)}`));
      return;
    }
    if (Object.hasOwn(message, 'id')) {
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message || 'App Server request failed'));
      else waiter.resolve(message.result);
      return;
    }
    if (message.method) this.emit('notification', message);
  }
}
```

- [ ] **Step 4: 运行协议测试**

Run:

```powershell
node --test test/workbench/codex-app-server-client.test.mjs
```

Expected: 2 tests PASS。

- [ ] **Step 5: 生成与本机 Codex 版本匹配的协议 Schema**

Run:

```powershell
codex.cmd app-server generate-json-schema --out .workbench-data/app-server-schema
rg -n "thread/start|thread/resume|turn/start|turn/interrupt|item/fileChange/requestApproval|item/commandExecution/requestApproval" .workbench-data/app-server-schema
```

Expected: 命令成功，六个稳定方法/请求都能在生成的 Schema 中定位；如果字段名与本计划代码片段不同，以生成 Schema 为准统一修正客户端、测试夹具和调用方后再继续，不能只改单边。

- [ ] **Step 6: 做真实 App Server 初始化探针**

Run:

```powershell
@'
import { CodexAppServerClient } from "./workbench/lib/codex-app-server-client.mjs";
const client = new CodexAppServerClient({ cwd: process.cwd() });
await client.start();
console.log(JSON.stringify(client.diagnostics(), null, 2));
await client.stop();
'@ | node -
```

Expected: `running` 为 `true` 且 `stderr` 为空；如果认证或配置失败，保留真实诊断，不伪造健康状态。

- [ ] **Step 7: 提交**

```powershell
git add test/workbench/codex-app-server-client.test.mjs workbench/lib/codex-app-server-client.mjs
git commit -m "feat: connect to Codex app server"
```

## Task 4: 打通只读 Run 生命周期

**Files:**
- Create: `test/workbench/run-manager.test.mjs`
- Create: `workbench/lib/run-manager.mjs`
- Modify: `workbench/lib/database.mjs`

- [ ] **Step 1: 写只读运行失败测试**

Create `test/workbench/run-manager.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { RunManager } from '../../workbench/lib/run-manager.mjs';

class FakeCodex extends EventEmitter {
  async start() {}
  async request(method) {
    if (method === 'thread/start') return { thread: { id: 'thread-readonly' } };
    if (method === 'turn/start') return { turn: { id: 'turn-readonly' } };
    throw new Error(`Unexpected method ${method}`);
  }
}

test('read-only run uses fixed sandbox, persists ids and completes from events', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-manager-'));
  const store = openDatabase(path.join(os.tmpdir(), `run-${crypto.randomUUID()}.sqlite`));
  store.upsertRequirement({
    id: 'REQ-001',
    title: 'Android广告接入',
    stage: 'PRD中',
    externalWait: '无外部等待',
  });
  const codex = new FakeCodex();
  const manager = new RunManager({
    store,
    codex,
    allowedRoot: root,
  });
  const run = await manager.startReadOnlyRun({
    requirementId: 'REQ-001',
    prompt: '只列出 PRD 的三个遗漏，不修改文件',
    files: ['prd/android-ad.md'],
  });
  assert.equal(store.getRun(run.id).threadId, 'thread-readonly');
  codex.emit('notification', {
    method: 'item/agentMessage/delta',
    params: { threadId: 'thread-readonly', turnId: 'turn-readonly', delta: '遗漏一' },
  });
  codex.emit('notification', {
    method: 'turn/completed',
    params: { threadId: 'thread-readonly', turn: { id: 'turn-readonly', status: 'completed' } },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.getRun(run.id).status, 'completed');
  assert.match(store.getRun(run.id).result, /遗漏一/);
  store.close();
});

test('run manager rejects empty prompts, unknown requirements and arbitrary permission', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-manager-'));
  const store = openDatabase(path.join(os.tmpdir(), `run-${crypto.randomUUID()}.sqlite`));
  const manager = new RunManager({
    store,
    codex: new FakeCodex(),
    allowedRoot: root,
  });
  await assert.rejects(
    () => manager.startReadOnlyRun({ requirementId: 'missing', prompt: 'x', files: [] }),
    /requirement/,
  );
  await assert.rejects(
    () => manager.startReadOnlyRun({ requirementId: null, prompt: '', files: [] }),
    /prompt/,
  );
  store.close();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test test/workbench/run-manager.test.mjs
```

Expected: FAIL，提示 `RunManager` 不存在。

- [ ] **Step 3: 给仓储增加单需求读取**

Add inside the returned object in `workbench/lib/database.mjs`:

```js
getRequirement(requirementId) {
  return db.prepare(
    `SELECT id,title,stage,external_wait AS externalWait,updated_at AS updatedAt
     FROM requirements WHERE id=?`,
  ).get(requirementId);
},
```

- [ ] **Step 4: 实现只读 Run 管理器**

Create `workbench/lib/run-manager.mjs`:

```js
import crypto from 'node:crypto';
import path from 'node:path';
import { assertAuthorizedPath } from './security.mjs';

function persistedEvent(message) {
  if (message.method === 'item/agentMessage/delta') {
    return { type: message.method, payload: { delta: message.params?.delta || '' } };
  }
  if (message.method === 'turn/completed') {
    return {
      type: message.method,
      payload: {
        turnId: message.params?.turn?.id || message.params?.turnId || null,
        status: message.params?.turn?.status || 'unknown',
      },
    };
  }
  if (['item/started', 'item/completed'].includes(message.method)) {
    const item = message.params?.item || {};
    if (item.type === 'reasoning') return null;
    return {
      type: message.method,
      payload: {
        itemId: item.id || null,
        itemType: item.type || 'unknown',
        command: item.type === 'commandExecution' ? item.command || null : null,
        exitCode: item.type === 'commandExecution' ? item.exitCode ?? null : null,
        paths: item.type === 'fileChange'
          ? (item.changes || []).map(change => change.path).filter(Boolean)
          : [],
      },
    };
  }
  return null;
}

export class RunManager {
  constructor({ store, codex, allowedRoot, maxConcurrentRuns = 1 }) {
    this.store = store;
    this.codex = codex;
    this.allowedRoot = path.resolve(allowedRoot);
    this.maxConcurrentRuns = maxConcurrentRuns;
    this.activeByTurn = new Map();
    this.codex.on('notification', message => this.#onNotification(message));
  }

  async startReadOnlyRun({ requirementId, prompt, files }) {
    if (this.store.countActiveRuns() >= this.maxConcurrentRuns) {
      throw Object.assign(new Error('Concurrent run limit reached'), { statusCode: 429 });
    }
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) throw Object.assign(new Error('prompt is required'), { statusCode: 400 });
    const requirement = requirementId ? this.store.getRequirement(requirementId) : null;
    if (requirementId && !requirement) {
      throw Object.assign(new Error('requirement does not exist'), { statusCode: 404 });
    }
    const authorizedFiles = [...new Set(files || [])].map(relativePath => {
      const absolute = assertAuthorizedPath(this.allowedRoot, path.join(this.allowedRoot, relativePath));
      return path.relative(this.allowedRoot, absolute).split(path.sep).join('/');
    });
    const id = `RUN-${crypto.randomUUID()}`;
    this.store.createRun({
      id,
      requirementId: requirementId || null,
      prompt: cleanPrompt,
      cwd: this.allowedRoot,
      permission: 'read-only',
      status: 'running',
    });
    this.store.saveRunContext(id, {
      files: authorizedFiles,
      input: { kind: 'freeform-read-only' },
    });
    try {
      await this.codex.start();
      const threadResult = await this.codex.request('thread/start', {
        cwd: this.allowedRoot,
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly' },
      });
      const threadId = threadResult.thread.id;
      const context = [
        '你正在执行个人产品经理工作台的只读任务。',
        '禁止创建、修改、移动或删除任何文件。',
        requirement ? `当前需求：${requirement.id} ${requirement.title}；阶段：${requirement.stage}` : '',
        authorizedFiles.length ? `仅分析这些已授权文件：\n${authorizedFiles.map(value => `- ${value}`).join('\n')}` : '',
        `用户任务：${cleanPrompt}`,
      ].filter(Boolean).join('\n\n');
      const turnResult = await this.codex.request('turn/start', {
        threadId,
        cwd: this.allowedRoot,
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly' },
        input: [{ type: 'text', text: context }],
      });
      const turnId = turnResult.turn.id;
      this.store.bindProtocolIds(id, threadId, turnId, this.codex.pid?.() || null);
      this.activeByTurn.set(turnId, { runId: id, text: '' });
      return this.store.getRun(id);
    } catch (error) {
      this.store.finishRun(id, 'failed', null, error.message);
      throw error;
    }
  }

  #onNotification(message) {
    const turnId = message.params?.turnId || message.params?.turn?.id;
    const active = this.activeByTurn.get(turnId);
    if (!active) return;
    const event = persistedEvent(message);
    if (event) this.store.appendRunEvent(active.runId, event.type, event.payload);
    if (message.method === 'item/agentMessage/delta') {
      active.text += message.params.delta || '';
    }
    if (
      message.method === 'item/completed'
      && message.params?.item?.type === 'agentMessage'
      && !active.text
    ) {
      active.text = message.params.item.text || message.params.item.content || '';
    }
    if (message.method === 'turn/completed') {
      const failed = message.params.turn?.status !== 'completed';
      this.store.finishRun(
        active.runId,
        failed ? 'failed' : 'completed',
        active.text || null,
        failed ? `Codex turn ended with ${message.params.turn?.status || 'unknown status'}` : null,
      );
      this.activeByTurn.delete(turnId);
    }
  }
}
```

- [ ] **Step 5: 运行 Run 测试**

Run:

```powershell
node --test test/workbench/run-manager.test.mjs
```

Expected: 2 tests PASS，并确认测试中没有 `--last`、`danger-full-access` 或前端传入命令。

- [ ] **Step 6: 提交**

```powershell
git add test/workbench/run-manager.test.mjs workbench/lib/run-manager.mjs workbench/lib/database.mjs
git commit -m "feat: execute persisted read-only Codex runs"
```

## Task 5: 暴露本机 API、健康检查和 SSE

**Files:**
- Create: `test/workbench/server.test.mjs`
- Create: `workbench/server.mjs`

- [ ] **Step 1: 写 HTTP 边界失败测试**

Create `test/workbench/server.test.mjs`:

```js
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWorkbenchServer } from '../../workbench/server.mjs';

test('server binds loopback and protects APIs with origin and token', async t => {
  const root = path.join(os.tmpdir(), `server-${crypto.randomUUID()}`);
  const app = await createWorkbenchServer({
    env: { WORKBENCH_ROOT: root, WORKBENCH_PORT: '0' },
    codexFactory: () => ({
      on() {},
      diagnostics: () => ({ running: false, stderr: '' }),
      start: async () => {},
      request: async () => ({ thread: { id: 'th' }, turn: { id: 'tu' } }),
      stop: async () => {},
    }),
  });
  await app.listen();
  t.after(() => app.close());
  assert.equal(app.address().address, '127.0.0.1');
  const base = `http://127.0.0.1:${app.address().port}`;
  assert.equal((await fetch(`${base}/api/bootstrap`)).status, 401);
  const response = await fetch(`${base}/api/bootstrap`, {
    headers: {
      Origin: app.config.originForPort(app.address().port),
      Authorization: `Bearer ${app.config.sessionToken}`,
    },
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.capabilities.permissions.length, 1);
  assert.equal(payload.capabilities.permissions[0], 'read-only');
});
```

- [ ] **Step 2: 运行服务测试确认失败**

Run:

```powershell
node --test test/workbench/server.test.mjs
```

Expected: FAIL，提示 `createWorkbenchServer` 不存在。

- [ ] **Step 3: 允许测试使用随机端口，同时保持固定回环地址**

Replace `createConfig` in `workbench/lib/config.mjs` with:

```js
export function createConfig(env = process.env) {
  const allowedRoot = path.resolve(env.WORKBENCH_ROOT || process.cwd());
  const port = Number(env.WORKBENCH_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('WORKBENCH_PORT must be an integer between 0 and 65535');
  }
  return Object.freeze({
    host: '127.0.0.1',
    port,
    origin: port === 0 ? null : `http://127.0.0.1:${port}`,
    originForPort: actualPort => `http://127.0.0.1:${actualPort}`,
    allowedRoot,
    databasePath: path.join(allowedRoot, '.workbench-data', 'workbench.sqlite'),
    sessionToken: crypto.randomBytes(32).toString('hex'),
    maxBodyBytes: 1_048_576,
    maxConcurrentRuns: 1,
    runTimeoutMs: 10 * 60 * 1000,
    codexCommand: 'codex.cmd',
    codexArgs: Object.freeze(['app-server']),
  });
}
```

Replace the Host/Origin block at the start of `assertLocalRequest` with:

```js
const expectedOrigin = config.origin || config.originForPort(request.socket.localPort);
const expectedHost = new URL(expectedOrigin).host;
if (request.headers.host !== expectedHost) {
  throw Object.assign(new Error('Host is not allowed'), { statusCode: 403 });
}
if (request.headers.origin && request.headers.origin !== expectedOrigin) {
  throw Object.assign(new Error('Origin is not allowed'), { statusCode: 403 });
}
if (
  !request.headers.origin
  && request.headers['sec-fetch-site']
  && request.headers['sec-fetch-site'] !== 'same-origin'
) {
  throw Object.assign(new Error('Request is not same-origin'), { statusCode: 403 });
}
```

- [ ] **Step 4: 实现 API、静态服务和 SSE 回放**

Create `workbench/server.mjs`:

```js
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
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function seedPersonalWorkbench(store) {
  if (store.listRequirements().length > 0) return;
  const requirements = [
    { id: 'REQ-001', title: 'Android广告接入', stage: 'PRD中', externalWait: '等待运营反馈' },
    { id: 'REQ-002', title: 'iOS应用与IPA资源库', stage: '待评审', externalWait: '等待产品专员' },
    { id: 'REQ-003', title: '云存档月卡插单', stage: '已规划', externalWait: '无外部等待' },
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
    : new CodexAppServerClient({
        command: config.codexCommand,
        args: config.codexArgs,
        cwd: config.allowedRoot,
      });
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
        assertLocalRequest(request, config);
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
          if (!['产品专员A', '产品专员B'].includes(body.assigneeNote)) {
            return sendJson(response, 400, { error: 'assigneeNote must be 产品专员A or 产品专员B' });
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
            return sendJson(response, 400, { error: 'description and expectedDeliverable are required' });
          }
          store.upsertManualTask(task);
          return sendJson(response, 201, store.getManualTask(task.id));
        }
        const requirementMatch = url.pathname.match(/^\/api\/requirements\/([^/]+)$/);
        if (request.method === 'PATCH' && requirementMatch) {
          const current = store.getRequirement(decodeURIComponent(requirementMatch[1]));
          if (!current) return sendJson(response, 404, { error: 'Requirement not found' });
          const body = await readJsonBody(request, config.maxBodyBytes);
          const stages = [
            '待分析','需求池','已规划','方案中','Demo中','PRD中','待外部确认',
            '待评审','开发中','测试中','待验收','待上线','效果观察','已归档',
          ];
          const waits = [
            '等待产品专员','等待运营反馈','等待领导确认',
            '等待研发补充','等待测试结果','无外部等待',
          ];
          const stage = body.stage ?? current.stage;
          const externalWait = body.externalWait ?? current.externalWait;
          if (!stages.includes(stage) || !waits.includes(externalWait)) {
            return sendJson(response, 400, { error: 'Invalid requirement stage or external wait value' });
          }
          store.upsertRequirement({ ...current, stage, externalWait });
          return sendJson(response, 200, store.getRequirement(current.id));
        }
        const manualTaskMatch = url.pathname.match(/^\/api\/manual-tasks\/([^/]+)$/);
        if (request.method === 'PATCH' && manualTaskMatch) {
          const current = store.getManualTask(decodeURIComponent(manualTaskMatch[1]));
          if (!current) return sendJson(response, 404, { error: 'Manual task not found' });
          const body = await readJsonBody(request, config.maxBodyBytes);
          const next = {
            ...current,
            currentNote: String(body.currentNote ?? current.currentNote),
            status: body.status ?? current.status,
          };
          if (!['待开始', '进行中', '已完成'].includes(next.status)) {
            return sendJson(response, 400, { error: 'Invalid manual task status' });
          }
          store.upsertManualTask(next);
          return sendJson(response, 200, store.getManualTask(next.id));
        }
        const eventMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
        if (request.method === 'GET' && eventMatch) {
          response.writeHead(200, {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          });
          const runId = decodeURIComponent(eventMatch[1]);
          let after = Number(request.headers['last-event-id'] || 0);
          const push = () => {
            for (const event of store.listRunEvents(runId, after)) {
              after = event.sequence;
              response.write(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
            }
            const run = store.getRun(runId);
            if (run && !['queued', 'running'].includes(run.status)) {
              response.write(`event: run.status\ndata: ${JSON.stringify(run)}\n\n`);
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
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const filename = path.resolve(publicRoot, relative);
      if (!filename.startsWith(`${publicRoot}${path.sep}`) && filename !== path.join(publicRoot, 'index.html')) {
        return sendJson(response, 404, { error: 'Static file not found' });
      }
      const content = fs.readFileSync(filename);
      response.writeHead(200, { 'content-type': contentTypes[path.extname(filename)] || 'application/octet-stream' });
      response.end(content);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message });
    }
  });
  return {
    config,
    address: () => server.address(),
    listen: () => new Promise(resolve => server.listen(config.port, config.host, resolve)),
    close: () => new Promise(resolve => server.close(() => {
      codex.stop().finally(() => {
        store.close();
        resolve();
      });
    })),
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
```

- [ ] **Step 5: 运行服务测试**

Run:

```powershell
node --test test/workbench/server.test.mjs
```

Expected: 1 test PASS，监听地址严格为 `127.0.0.1`。

- [ ] **Step 6: 提交**

```powershell
git add test/workbench/server.test.mjs workbench/server.mjs workbench/lib/config.mjs workbench/lib/security.mjs
git commit -m "feat: expose protected local workbench API"
```

## Task 6: 把 V1 界面纠偏为单人 Codex 工作台

**Files:**
- Create: `workbench/public/index.html`
- Create: `workbench/public/styles.css`
- Create: `workbench/public/app.js`
- Create: `tools/verify-personal-codex-workbench-ui.mjs`
- Reference only: `demos/后台管理/admin-运营数据看板v2.html`
- Replace compatibility entry: `demos/产品经理全生命周期工作台demo.html`

- [ ] **Step 1: 写静态契约验证器**

Create `tools/verify-personal-codex-workbench-ui.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'workbench/public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'workbench/public/app.js'), 'utf8');
const required = [
  '待我处理', '规划中心', '需求中心', '评审与验收',
  '数据与复盘', 'Codex任务', '问 Codex', '外部等待',
  '产品专员任务备注', 'Codex运行状态',
];
for (const token of required) assert(html.includes(token), `Missing UI token: ${token}`);
for (const forbidden of ['团队与AI', '下一责任人', '唯一审批人', 'AI员工', '登录账号']) {
  assert(!html.includes(forbidden) && !app.includes(forbidden), `Forbidden multiplayer token: ${forbidden}`);
}
assert(html.includes('aria-label="主导航"'));
assert(html.includes('href="#mainContent"'));
assert(app.includes("new EventSource"));
assert(app.includes("permission: 'read-only'"));
console.log('PASS personal workbench static contract');
```

- [ ] **Step 2: 运行契约确认失败**

Run:

```powershell
npm run workbench:verify-ui
```

Expected: FAIL，提示 `workbench/public/index.html` 不存在。

- [ ] **Step 3: 创建单人六页外壳**

Create `workbench/public/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>个人产品工作台</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <a class="skip-link" href="#mainContent">跳到主要内容</a>
  <aside class="sidebar" aria-label="主导航">
    <div class="brand"><span class="brand-mark">P</span><span>产品工作台</span></div>
    <nav id="primaryNav">
      <button class="nav-item active" data-page="home">待我处理</button>
      <button class="nav-item" data-page="planning">规划中心</button>
      <button class="nav-item" data-page="requirements">需求中心</button>
      <button class="nav-item" data-page="review">评审与验收</button>
      <button class="nav-item" data-page="data">数据与复盘</button>
      <button class="nav-item" data-page="codex">Codex任务</button>
    </nav>
  </aside>
  <header class="topbar">
    <label class="search">搜索需求、文档或运行<input id="globalSearch" aria-label="全局搜索"></label>
    <span id="healthBadge" class="status">Broker 检查中</span>
    <button id="askCodex" class="button primary">问 Codex</button>
  </header>
  <main id="mainContent" tabindex="-1">
    <section class="page active" data-page-panel="home">
      <div class="page-head"><div><h1>待我处理</h1><p>今天需要我判断、补充和跟进的事项。</p></div></div>
      <div class="metrics">
        <article><strong id="myTodoCount">0</strong><span>我的待办</span></article>
        <article><strong id="externalWaitCount">0</strong><span>外部等待</span></article>
        <article><strong id="activeRunCount">0</strong><span>进行中的 Codex</span></article>
        <article><strong id="recentResultCount">0</strong><span>最近结果</span></article>
      </div>
      <div class="grid two">
        <section class="panel"><h2>当前需求</h2><div id="homeRequirements" class="stack"></div></section>
        <section class="panel"><h2>最近 Codex 结果</h2><div id="homeRuns" class="stack"></div></section>
        <section class="panel"><h2>产品专员任务备注</h2><p>两名产品专员不登录；这里仅供我记录分派、截止时间、交付物和完成状态。</p><div id="manualTaskNotes" class="stack"></div></section>
      </div>
    </section>
    <section class="page" data-page-panel="planning"><h1>规划中心</h1><p>需求来源、需求池、版本容量和插单影响。</p><div class="empty">基础阶段保留业务视图，真实规划动作在后续阶段接入。</div></section>
    <section class="page" data-page-panel="requirements"><h1>需求中心</h1><div id="requirementList" class="stack"></div><div id="requirementDetail"></div></section>
    <section class="page" data-page-panel="review"><h1>评审与验收</h1><p>集中记录 PRD 漏洞、开发问题、测试异常和验收结论。</p><div class="empty">选择需求后可从“问 Codex”发起只读检查。</div></section>
    <section class="page" data-page-panel="data"><h1>数据与复盘</h1><p>上线指标、版本周报和后续优化结论。</p><div class="empty">数据接入不属于本阶段。</div></section>
    <section class="page" data-page-panel="codex"><h1>Codex任务</h1><p>真实会话、运行事件与最终结果。</p><div id="runList" class="stack"></div></section>
  </main>
  <dialog id="codexDrawer" aria-labelledby="codexTitle">
    <form method="dialog" class="drawer-head"><h2 id="codexTitle">问 Codex</h2><button aria-label="关闭">×</button></form>
    <div class="drawer-body">
      <dl class="context"><dt>当前需求</dt><dd id="contextRequirement">未选择</dd><dt>工作目录</dt><dd id="contextRoot">由 Broker 授权</dd><dt>当前 Thread</dt><dd id="contextThread">首次运行时创建</dd><dt>权限</dt><dd id="contextPermission">只读分析</dd><dt>Codex运行状态</dt><dd id="drawerRunStatus">未执行</dd></dl>
      <label>授权文件（每行一个工作区相对路径）<textarea id="authorizedFiles" rows="4"></textarea></label>
      <label>任务<textarea id="prompt" rows="7" placeholder="例如：检查这份 PRD 的遗漏、异常和边界条件"></textarea></label>
      <button id="startRun" class="button primary" type="button">开始只读任务</button>
      <pre id="streamOutput" aria-live="polite"></pre>
    </div>
  </dialog>
  <template id="requirementCard">
    <button class="card requirement-card"><strong></strong><span class="stage"></span><span class="external-wait"></span></button>
  </template>
  <script type="module" src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建延续参考后台气质的响应式样式**

Create `workbench/public/styles.css`:

```css
:root{--brand:#315efb;--brand-dark:#2347c5;--ink:#172033;--muted:#59657a;--line:#e5e9f2;--surface:#fff;--canvas:#f4f6fa;--success:#16845b;--warn:#a25a00;--radius:14px;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);background:var(--canvas)}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--canvas)}button,input,textarea{font:inherit}.skip-link{position:fixed;left:16px;top:-80px;z-index:20;background:#fff;padding:10px}.skip-link:focus{top:16px}
.sidebar{position:fixed;inset:0 auto 0 0;width:220px;background:#10182b;color:#fff;padding:22px 14px}.brand{display:flex;gap:10px;align-items:center;font-weight:700;margin:0 8px 28px}.brand-mark{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--brand)}nav{display:grid;gap:6px}.nav-item{border:0;border-radius:10px;padding:12px 14px;text-align:left;color:#b9c2d8;background:transparent;cursor:pointer}.nav-item:hover,.nav-item.active{color:#fff;background:#27334d}
.topbar{position:fixed;z-index:5;left:220px;right:0;top:0;height:72px;display:flex;align-items:center;gap:16px;padding:0 28px;background:#fff;border-bottom:1px solid var(--line)}.search{flex:1;color:var(--muted)}.search input{display:block;width:min(560px,100%);height:38px;border:1px solid var(--line);border-radius:9px;margin-top:3px;padding:0 10px}.status{color:var(--muted);font-size:14px}.button{min-height:42px;border:1px solid var(--line);border-radius:9px;padding:0 16px;background:#fff;cursor:pointer}.button.primary{border-color:var(--brand-dark);background:var(--brand-dark);color:#fff}
main{margin-left:220px;padding:100px 28px 40px}.page{display:none;max-width:1440px;margin:auto}.page.active{display:block}.page-head{display:flex;justify-content:space-between}.page h1{margin:0 0 8px}.page p{color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:22px 0}.metrics article,.panel,.card,.empty{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius)}.metrics article{padding:20px}.metrics strong{display:block;font-size:28px}.metrics span{color:var(--muted)}.grid.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:20px}.panel h2{margin-top:0}.stack{display:grid;gap:10px}.card{display:grid;grid-template-columns:1fr auto;gap:6px;width:100%;padding:15px;text-align:left}.card .external-wait{grid-column:1/-1;color:var(--warn)}.empty{padding:24px;color:var(--muted);margin-top:18px}
dialog{position:fixed;inset:0 0 0 auto;width:min(620px,100vw);height:100vh;max-height:none;margin:0;border:0;padding:0;box-shadow:-16px 0 50px #10182b33}dialog::backdrop{background:#10182b55}.drawer-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line)}.drawer-head h2{margin:0}.drawer-head button{border:0;background:transparent;font-size:28px}.drawer-body{display:grid;gap:16px;padding:22px}.drawer-body label{display:grid;gap:7px}.drawer-body textarea{resize:vertical;border:1px solid var(--line);border-radius:9px;padding:10px}.context{display:grid;grid-template-columns:110px 1fr;gap:8px;margin:0}.context dt{color:var(--muted)}.context dd{margin:0;overflow-wrap:anywhere}pre{white-space:pre-wrap;min-height:180px;background:#10182b;color:#e8edfa;border-radius:10px;padding:14px}
:focus-visible{outline:3px solid #8fb0ff;outline-offset:2px}@media(max-width:900px){.sidebar{position:fixed;inset:auto 0 0;width:auto;height:72px;padding:8px;z-index:10}.brand{display:none}nav{grid-template-columns:repeat(6,1fr);gap:2px}.nav-item{text-align:center;padding:10px 2px;font-size:12px}.topbar{left:0;padding:0 14px}.status{display:none}main{margin:0;padding:92px 14px 96px}.metrics{grid-template-columns:repeat(2,1fr)}.grid.two{grid-template-columns:1fr}}@media(max-width:520px){.search{display:none}.topbar{justify-content:flex-end}.metrics{grid-template-columns:1fr 1fr}.nav-item{font-size:10px}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
```

- [ ] **Step 5: 实现浏览器状态、真实 API 和 SSE 展示**

Create `workbench/public/app.js`:

```js
const state = {
  token: new URLSearchParams(location.search).get('token') || sessionStorage.getItem('workbenchToken'),
  requirements: [],
  runs: [],
  manualTasks: [],
  artifacts: [],
  selectedRequirementId: null,
  searchTerm: '',
};
if (state.token) sessionStorage.setItem('workbenchToken', state.token);
if (new URLSearchParams(location.search).has('token')) {
  history.replaceState(null, '', `${location.pathname}${location.hash}`);
}

function headers(json = false) {
  return {
    Authorization: `Bearer ${state.token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...headers(Boolean(options.body)), ...options.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function text(element, value) {
  element.textContent = value == null ? '' : String(value);
}

function render() {
  const visibleRequirements = state.requirements.filter(item => {
    const artifactPaths = state.artifacts
      .filter(artifact => artifact.requirementId === item.id)
      .map(artifact => artifact.path)
      .join(' ');
    const haystack = `${item.id} ${item.title} ${item.stage} ${item.externalWait} ${artifactPaths}`.toLowerCase();
    return haystack.includes(state.searchTerm.toLowerCase());
  });
  const visibleRuns = state.runs.filter(item => {
    const haystack = `${item.id} ${item.prompt} ${item.result || ''} ${item.error || ''}`.toLowerCase();
    return haystack.includes(state.searchTerm.toLowerCase());
  });
  text(document.querySelector('#myTodoCount'), state.requirements.length);
  text(document.querySelector('#externalWaitCount'), state.requirements.filter(item => item.externalWait !== '无外部等待').length);
  text(document.querySelector('#activeRunCount'), state.runs.filter(item => ['queued', 'running'].includes(item.status)).length);
  text(document.querySelector('#recentResultCount'), state.runs.filter(item => item.status === 'completed').length);
  const targets = [document.querySelector('#homeRequirements'), document.querySelector('#requirementList')];
  for (const target of targets) {
    target.replaceChildren(...visibleRequirements.map(requirement => {
      const card = document.querySelector('#requirementCard').content.firstElementChild.cloneNode(true);
      card.dataset.requirementId = requirement.id;
      text(card.querySelector('strong'), `${requirement.id} · ${requirement.title}`);
      text(card.querySelector('.stage'), requirement.stage);
      text(card.querySelector('.external-wait'), requirement.externalWait);
      card.addEventListener('click', () => selectRequirement(requirement.id));
      return card;
    }));
  }
  const renderRuns = target => target.replaceChildren(...visibleRuns.map(run => {
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    text(title, `${run.status} · ${run.prompt}`);
    text(detail, run.result || run.error || run.startedAt);
    card.append(title, detail);
    return card;
  }));
  renderRuns(document.querySelector('#homeRuns'));
  renderRuns(document.querySelector('#runList'));
  document.querySelector('#manualTaskNotes').replaceChildren(...state.manualTasks.map(task => {
    const card = document.createElement('article');
    card.className = 'card';
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    text(title, `${task.assigneeNote} · ${task.description}`);
    text(detail, `${task.status} · ${task.expectedDeliverable} · ${task.dueAt || '无截止时间'}`);
    card.append(title, detail);
    return card;
  }));
}

function selectRequirement(id) {
  state.selectedRequirementId = id;
  const requirement = state.requirements.find(item => item.id === id);
  text(document.querySelector('#contextRequirement'), `${requirement.id} · ${requirement.title}`);
  text(document.querySelector('#requirementDetail'), `当前阶段：${requirement.stage}；外部等待：${requirement.externalWait}`);
}

function openCodex() {
  document.querySelector('#codexDrawer').showModal();
  document.querySelector('#prompt').focus();
}

async function startRun() {
  const prompt = document.querySelector('#prompt').value.trim();
  const files = document.querySelector('#authorizedFiles').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  if (!prompt) return text(document.querySelector('#streamOutput'), '请输入任务。');
  const run = await api('/api/runs', {
    method: 'POST',
    body: JSON.stringify({
      requirementId: state.selectedRequirementId,
      prompt,
      files,
      permission: 'read-only',
    }),
  });
  state.runs.unshift(run);
  text(document.querySelector('#drawerRunStatus'), '执行中');
  const output = document.querySelector('#streamOutput');
  output.textContent = '';
  const events = new EventSource(`/api/runs/${encodeURIComponent(run.id)}/events?token=${encodeURIComponent(state.token)}`);
  events.addEventListener('item/agentMessage/delta', event => {
    output.textContent += JSON.parse(event.data).delta || '';
  });
  events.addEventListener('run.status', async event => {
    text(document.querySelector('#drawerRunStatus'), JSON.parse(event.data).status);
    events.close();
    const bootstrap = await api('/api/bootstrap');
    state.runs = bootstrap.runs;
    render();
  });
  events.onerror = () => {
    text(document.querySelector('#drawerRunStatus'), '连接中断，可刷新后回看结果');
    events.close();
  };
  render();
}

document.querySelector('#primaryNav').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button) return;
  document.querySelectorAll('.nav-item,.page').forEach(node => node.classList.remove('active'));
  button.classList.add('active');
  document.querySelector(`[data-page-panel="${button.dataset.page}"]`).classList.add('active');
});
document.querySelector('#globalSearch').addEventListener('input', event => {
  state.searchTerm = event.target.value.trim();
  render();
});
document.querySelector('#askCodex').addEventListener('click', openCodex);
document.querySelector('#startRun').addEventListener('click', () => startRun().catch(error => {
  text(document.querySelector('#streamOutput'), error.message);
}));

try {
  const bootstrap = await api('/api/bootstrap');
  state.requirements = bootstrap.requirements;
  state.artifacts = bootstrap.artifacts;
  state.runs = bootstrap.runs;
  state.manualTasks = bootstrap.manualTasks;
  text(document.querySelector('#contextRoot'), bootstrap.workspace.root);
  const healthText = bootstrap.health.configuration === 'error'
    ? 'Codex 配置错误'
    : bootstrap.health.authentication === 'error'
      ? 'Codex 认证失效'
      : bootstrap.health.codex === 'ok'
        ? 'Codex 已连接'
        : 'Broker 正常 · Codex 不可用';
  text(document.querySelector('#healthBadge'), healthText);
  render();
} catch (error) {
  text(document.querySelector('#healthBadge'), '本机连接失败');
  text(document.querySelector('#homeRuns'), error.message);
}
```

- [ ] **Step 6: 让 SSE 支持浏览器限制下的令牌校验**

In `workbench/server.mjs`, immediately before `assertLocalRequest(request, config)` add:

```js
if (
  request.method === 'GET'
  && /^\/api\/runs\/[^/]+\/events$/.test(url.pathname)
  && url.searchParams.get('token') === config.sessionToken
) {
  request.headers.authorization = `Bearer ${config.sessionToken}`;
}
```

保留 Origin 校验；查询参数只用于 EventSource 无法设置 Authorization header 的本地连接，服务日志不得打印完整 URL。

- [ ] **Step 7: 用 HTTP 入口替换旧的兼容 Demo**

Replace `demos/产品经理全生命周期工作台demo.html` with:

```html
<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>个人产品工作台启动说明</title></head>
<body>
  <main>
    <h1>个人产品工作台已升级为本地服务</h1>
    <p>请运行 <code>npm run workbench:start</code>，再打开终端输出的本机地址并携带本机会话令牌。</p>
    <p>静态文件模式不能直接调用 Codex，因此不再保留模拟 AI 员工或伪运行结果。</p>
  </main>
</body>
</html>
```

- [ ] **Step 8: 运行静态契约**

Run:

```powershell
npm run workbench:verify-ui
rg -n "团队与AI|下一责任人|唯一审批人|AI员工|登录账号" workbench demos/产品经理全生命周期工作台demo.html
```

Expected: 契约 PASS；`rg` 退出码为 `1` 且无匹配。

- [ ] **Step 9: 提交**

```powershell
git add workbench/public tools/verify-personal-codex-workbench-ui.mjs demos/产品经理全生命周期工作台demo.html workbench/server.mjs
git commit -m "feat: replace multiplayer prototype with personal Codex workbench"
```

## Task 7: 增加真实浏览器验收与阶段收口

**Files:**
- Modify: `tools/verify-personal-codex-workbench-ui.mjs`
- Test output: `test-results/personal-codex-workbench/`

- [ ] **Step 1: 扩展验证器为 Playwright 冒烟**

Append to `tools/verify-personal-codex-workbench-ui.mjs`:

```js
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const port = 4321;
const child = spawn(process.execPath, ['workbench/server.mjs'], {
  cwd: root,
  env: { ...process.env, WORKBENCH_PORT: String(port), WORKBENCH_ROOT: root },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let startup = '';
child.stdout.on('data', chunk => { startup += chunk.toString('utf8'); });
const deadline = Date.now() + 10_000;
while (!startup.includes('Local session token:') && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 50));
}
const token = startup.match(/Local session token:\s*([a-f0-9]{64})/)?.[1];
assert(token, `Broker did not print a session token: ${startup}`);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?token=${token}`);
  await page.waitForSelector('[data-page-panel="home"].active');
  assert.equal(await page.locator('.nav-item').count(), 6);
  await page.locator('#askCodex').click();
  await page.waitForSelector('#codexDrawer[open]');
  assert.match(await page.locator('#codexDrawer').innerText(), /只读分析/);
  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert.equal(overflow, false);
  assert.deepEqual(errors, []);
  fs.mkdirSync(path.join(root, 'test-results/personal-codex-workbench'), { recursive: true });
  await page.screenshot({
    path: path.join(root, 'test-results/personal-codex-workbench/foundation.png'),
    fullPage: true,
  });
  console.log('PASS personal workbench browser smoke');
} finally {
  await browser.close();
  child.kill();
}
```

- [ ] **Step 2: 运行完整自动化**

Run:

```powershell
npm run workbench:test
npm run workbench:verify-ui
git diff --check
```

Expected:

- 所有 `test/workbench/*.test.mjs` PASS。
- 静态契约和浏览器冒烟 PASS。
- 生成 `test-results/personal-codex-workbench/foundation.png`。
- `git diff --check` 无输出。

- [ ] **Step 3: 手工执行一条真实只读任务**

Run:

```powershell
npm run workbench:start
```

使用终端输出的令牌打开工作台，选择一个已登记需求，授权一个工作区内 Markdown 文件，输入：

```text
只读检查这份文档，列出最多三个可定位的遗漏；每项包含位置、影响和修改建议。不要修改任何文件。
```

Expected:

- 三次操作内发起任务。
- `Codex运行状态` 从“未执行”变为“执行中”，最终变为“completed”。
- 输出随 App Server 事件逐步出现。
- 刷新页面后在“Codex任务”和首页最近结果中仍可回看。
- `git status --short` 显示工作区原有修改，但本次只读 Run 没有新增或修改业务文件。

- [ ] **Step 4: 提交阶段验收**

```powershell
git add tools/verify-personal-codex-workbench-ui.mjs
git commit -m "test: verify personal Codex workbench foundation"
```

## 阶段完成定义

本计划只有同时满足以下条件才算完成：

- 工作台只能通过本机 Broker 使用，服务地址是 `127.0.0.1`。
- API 同时校验 Origin 与短期令牌。
- UI 中不再出现多人登录、审批流、下一责任人、唯一审批人或模拟 AI 员工。
- 产品专员只作为“任务备注”概念，不拥有账号或流程权限。
- 真实 Codex App Server 初始化成功，失败时展示真实的配置/认证诊断。
- 只读任务使用明确 `thread/start` 与 `turn/start`，不使用 `--last`。
- Run 与事件写入 SQLite，浏览器刷新后仍可回看。
- 此阶段没有文件写入权限，没有 `danger-full-access`，也没有任意命令入口。
