# Personal Codex Workbench File Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已验证的只读工作流上开放受控的候选文件生成和现有产物修改，并提供逐文件审批、修改前快照、可读差异、验证结果、取消/超时、失败重试和不覆盖外部改动的运行级恢复。

**Architecture:** 每个写入 Run 在启动前固定目标文件清单并创建快照，再把选中产物复制到 `.workbench-data/staging/<run-id>`；Codex 的 `workspaceWrite` 只指向该暂存区，无法直接改动真实工作文件。运行结束后 Broker 比较暂存差异、拒绝删除和清单外变化，并在确认真实文件仍等于 before hash 后精确写回；恢复时只有当前 hash 仍等于该 Run 的 after hash 才执行，绝不调用仓库级重置。

**Tech Stack:** Node.js 24、Node `fs`/`crypto`/`child_process`、SQLite、Codex App Server 审批协议、SSE、Node Test Runner、Playwright Core

---

## 实施边界与新增文件

```text
workbench/lib/
  file-safety.mjs             # 目标清单、快照、hash、diff、恢复冲突判断
  approval-manager.mjs        # App Server 请求与工作台确认卡的映射
  process-control.mjs         # turn/interrupt、超时和 Windows 子进程树兜底
  database.mjs                # 快照、文件变化、审批和验证结果
  codex-app-server-client.mjs # 接收服务端 request 并发送 response
  run-manager.mjs             # 写入 Run、取消、重试、收尾
workbench/
  server.mjs                  # 写入、审批、取消、重试、恢复 API
workbench/public/
  index.html
  app.js
  styles.css
test/workbench/
  file-safety.test.mjs
  approval-manager.test.mjs
  run-control.test.mjs
  file-api.test.mjs
```

明确不实现：

- 浏览器传入 shell 命令、CLI 参数、沙箱名或任意绝对路径。
- `danger-full-access`。
- 自动删除已有文件。
- 自动发布、外部发送、付款或账号权限变更。
- `git reset`、`git checkout` 或清理工作区无关修改。
- 一键恢复整个仓库。

## Task 1: 增加快照、差异和冲突安全恢复

**Files:**
- Create: `test/workbench/file-safety.test.mjs`
- Create: `workbench/lib/file-safety.mjs`

- [ ] **Step 1: 写文件安全失败测试**

Create `test/workbench/file-safety.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FileSafety } from '../../workbench/lib/file-safety.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-safety-'));
  fs.mkdirSync(path.join(root, 'prd'));
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), '第一行\n旧规则\n', 'utf8');
  return { root, safety: new FileSafety({ allowedRoot: root }) };
}

test('snapshot and diff are limited to exact declared targets', () => {
  const { root, safety } = fixture();
  const snapshot = safety.capture(['prd/feature.md', 'prd/candidate.md']);
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), '第一行\n新规则\n', 'utf8');
  fs.writeFileSync(path.join(root, 'prd', 'candidate.md'), '# 候选\n', 'utf8');
  const changes = safety.compare(snapshot);
  assert.deepEqual(changes.map(item => item.path), ['prd/candidate.md', 'prd/feature.md']);
  assert.equal(changes[0].kind, 'created');
  assert.match(changes[1].diff, /-旧规则/);
  assert.match(changes[1].diff, /\+新规则/);
});

test('restore only touches run targets and rejects external changes after the run', () => {
  const { root, safety } = fixture();
  fs.writeFileSync(path.join(root, 'unrelated.txt'), '保留我', 'utf8');
  const snapshot = safety.capture(['prd/feature.md']);
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), 'Codex 修改\n', 'utf8');
  const [change] = safety.compare(snapshot);
  fs.writeFileSync(path.join(root, 'prd', 'feature.md'), '用户随后修改\n', 'utf8');
  assert.throws(() => safety.restore(snapshot, [change]), /changed after this run/);
  assert.equal(fs.readFileSync(path.join(root, 'unrelated.txt'), 'utf8'), '保留我');
});

test('restore removes only a file created by this run when hash still matches', () => {
  const { root, safety } = fixture();
  const snapshot = safety.capture(['prd/candidate.md']);
  fs.writeFileSync(path.join(root, 'prd', 'candidate.md'), '# candidate\n', 'utf8');
  const changes = safety.compare(snapshot);
  safety.restore(snapshot, changes);
  assert.equal(fs.existsSync(path.join(root, 'prd', 'candidate.md')), false);
});

test('Codex staging cannot touch real files and broker applies only declared targets', () => {
  const { root, safety } = fixture();
  fs.writeFileSync(path.join(root, 'prd', 'unrelated.md'), '用户脏改动\n', 'utf8');
  const snapshot = safety.capture(['prd/feature.md']);
  const stagingRoot = safety.prepareStaging(`RUN-${crypto.randomUUID()}`, snapshot);
  fs.writeFileSync(path.join(stagingRoot, 'prd', 'feature.md'), '暂存修改\n', 'utf8');
  assert.match(fs.readFileSync(path.join(root, 'prd', 'feature.md'), 'utf8'), /旧规则/);
  const stagedChanges = safety.compare(snapshot, stagingRoot);
  const applied = safety.applyFromStaging(snapshot, stagedChanges, stagingRoot);
  assert.equal(applied[0].kind, 'modified');
  assert.equal(fs.readFileSync(path.join(root, 'prd', 'unrelated.md'), 'utf8'), '用户脏改动\n');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test test/workbench/file-safety.test.mjs
```

Expected: FAIL，提示 `FileSafety` 不存在。

- [ ] **Step 3: 实现目标规范化、快照和 hash**

Create `workbench/lib/file-safety.mjs`:

```js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertAuthorizedPath } from './security.mjs';

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeRelative(root, relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error('Target path must be relative');
  const absolute = assertAuthorizedPath(root, path.join(root, relativePath));
  return {
    path: path.relative(root, absolute).split(path.sep).join('/'),
    absolute,
  };
}

function readState(target) {
  if (!fs.existsSync(target.absolute)) {
    return { path: target.path, absolutePath: target.absolute, existed: false, contentBase64: null, hash: null };
  }
  const stat = fs.lstatSync(target.absolute);
  if (!stat.isFile()) throw new Error(`Target is not a regular file: ${target.path}`);
  const content = fs.readFileSync(target.absolute);
  return {
    path: target.path,
    absolutePath: target.absolute,
    existed: true,
    contentBase64: content.toString('base64'),
    hash: hash(content),
  };
}

export class FileSafety {
  constructor({ allowedRoot }) {
    this.allowedRoot = path.resolve(allowedRoot);
  }

  normalizeTargets(paths) {
    const targets = [...new Set(paths || [])].map(value => normalizeRelative(this.allowedRoot, value));
    if (targets.length === 0) throw new Error('At least one target file is required');
    if (targets.length > 20) throw new Error('A run can target at most 20 files');
    return targets.sort((a, b) => a.path.localeCompare(b.path));
  }

  capture(paths) {
    return this.normalizeTargets(paths).map(readState);
  }
}
```

- [ ] **Step 4: 实现逐行差异和原子恢复**

Append to `workbench/lib/file-safety.mjs` before the class:

```js
function lineDiff(beforeText, afterText) {
  const before = beforeText.split('\n');
  const after = afterText.split('\n');
  const matrix = Array.from({ length: before.length + 1 }, () => new Uint32Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = before[i] === after[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }
  const output = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      output.push(` ${before[i]}`); i += 1; j += 1;
    } else if (j < after.length && (i === before.length || matrix[i][j + 1] >= matrix[i + 1][j])) {
      output.push(`+${after[j]}`); j += 1;
    } else {
      output.push(`-${before[i]}`); i += 1;
    }
  }
  return output.join('\n');
}

function writeAtomic(filename, content) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.workbench-restore-${crypto.randomUUID()}`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, filename);
}
```

Add methods to `FileSafety`:

```js
prepareStaging(runId, snapshot) {
  if (!/^RUN-[0-9a-f-]+$/i.test(runId)) throw new Error('Invalid run id for staging');
  const stagingRoot = assertAuthorizedPath(
    this.allowedRoot,
    path.join(this.allowedRoot, '.workbench-data', 'staging', runId),
  );
  fs.mkdirSync(stagingRoot, { recursive: true });
  for (const before of snapshot) {
    const target = normalizeRelative(stagingRoot, before.path);
    fs.mkdirSync(path.dirname(target.absolute), { recursive: true });
    if (before.existed) {
      fs.writeFileSync(target.absolute, Buffer.from(before.contentBase64, 'base64'));
    }
  }
  return stagingRoot;
}

findUnexpectedFiles(stagingRoot, targetPaths) {
  const allowed = new Set(targetPaths);
  const found = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        found.push(path.relative(stagingRoot, absolute).split(path.sep).join('/'));
      } else {
        throw new Error(`Unsupported staging entry: ${absolute}`);
      }
    }
  };
  visit(stagingRoot);
  return found.filter(value => !allowed.has(value)).sort();
}

compare(snapshot, readRoot = this.allowedRoot) {
  return snapshot.map(before => {
    const target = normalizeRelative(readRoot, before.path);
    const after = readState(target);
    if (before.hash === after.hash && before.existed === after.existed) return null;
    const beforeBuffer = before.existed ? Buffer.from(before.contentBase64, 'base64') : Buffer.alloc(0);
    const afterBuffer = after.existed ? Buffer.from(after.contentBase64, 'base64') : Buffer.alloc(0);
    const isText = !beforeBuffer.includes(0) && !afterBuffer.includes(0);
    return {
      path: before.path,
      absolutePath: normalizeRelative(this.allowedRoot, before.path).absolute,
      kind: !before.existed ? 'created' : !after.existed ? 'deleted' : 'modified',
      beforeHash: before.hash,
      afterHash: after.hash,
      diff: isText ? lineDiff(beforeBuffer.toString('utf8'), afterBuffer.toString('utf8')) : 'Binary file changed',
    };
  }).filter(Boolean);
}

applyFromStaging(snapshot, stagedChanges, stagingRoot, onBeforeWrite = () => {}) {
  const snapshotByPath = new Map(snapshot.map(item => [item.path, item]));
  for (const change of stagedChanges) {
    if (change.kind === 'deleted') {
      throw Object.assign(
        new Error(`Deletion is not applied in the first phase: ${change.path}`),
        { statusCode: 409 },
      );
    }
    const before = snapshotByPath.get(change.path);
    if (!before) throw new Error(`Snapshot does not include ${change.path}`);
    const actualTarget = normalizeRelative(this.allowedRoot, change.path);
    const current = readState(actualTarget);
    if (current.hash !== before.hash || current.existed !== before.existed) {
      throw Object.assign(
        new Error(`File changed while Codex was running: ${change.path}`),
        { statusCode: 409 },
      );
    }
    const stagedTarget = normalizeRelative(stagingRoot, change.path);
    const staged = readState(stagedTarget);
    if (staged.hash !== change.afterHash) throw new Error(`Staging hash mismatch: ${change.path}`);
  }
  onBeforeWrite();
  for (const change of stagedChanges) {
    const actualTarget = normalizeRelative(this.allowedRoot, change.path);
    const stagedTarget = normalizeRelative(stagingRoot, change.path);
    writeAtomic(actualTarget.absolute, fs.readFileSync(stagedTarget.absolute));
  }
  return this.compare(snapshot);
}

restore(snapshot, changes) {
  const snapshotByPath = new Map(snapshot.map(item => [item.path, item]));
  for (const change of changes) {
    const before = snapshotByPath.get(change.path);
    if (!before) throw new Error(`Snapshot does not include ${change.path}`);
    const target = normalizeRelative(this.allowedRoot, change.path);
    const current = readState(target);
    if (current.hash !== change.afterHash) {
      throw Object.assign(
        new Error(`File changed after this run: ${change.path}`),
        { statusCode: 409 },
      );
    }
  }
  for (const change of changes) {
    const before = snapshotByPath.get(change.path);
    const target = normalizeRelative(this.allowedRoot, change.path);
    if (!before.existed) {
      fs.unlinkSync(target.absolute);
    } else {
      writeAtomic(target.absolute, Buffer.from(before.contentBase64, 'base64'));
    }
  }
}
```

- [ ] **Step 5: 运行文件安全测试**

Run:

```powershell
node --test test/workbench/file-safety.test.mjs
```

Expected: 4 tests PASS。

- [ ] **Step 6: 提交**

```powershell
git add test/workbench/file-safety.test.mjs workbench/lib/file-safety.mjs
git commit -m "feat: add run-scoped file snapshots and restore"
```

## Task 2: 持久化快照、差异、审批和验证结果

**Files:**
- Modify: `workbench/lib/database.mjs`
- Modify: `test/workbench/database.test.mjs`

- [ ] **Step 1: 先扩展数据库测试**

Append to `test/workbench/database.test.mjs`:

```js
test('database persists snapshots, file changes, approvals and validation', () => {
  const dbPath = path.join(os.tmpdir(), `safety-db-${crypto.randomUUID()}.sqlite`);
  const store = openDatabase(dbPath);
  store.upsertRequirement({ id: 'REQ-1', title: 'A', stage: 'PRD中', externalWait: '无外部等待' });
  store.createRun({
    id: 'RUN-1', requirementId: 'REQ-1', prompt: '修改', permission: 'modify-existing',
    status: 'running', workflowType: null,
  });
  store.saveFileSnapshot('RUN-1', {
    path: 'prd/a.md', absolutePath: 'C:/workspace/prd/a.md',
    existed: true, contentBase64: 'YWJj', hash: 'before',
  });
  store.saveFileChange('RUN-1', {
    path: 'prd/a.md', absolutePath: 'C:/workspace/prd/a.md',
    kind: 'modified', beforeHash: 'before', afterHash: 'after', diff: '-a\n+b',
  });
  store.createApproval({
    id: 'APP-1', runId: 'RUN-1', protocolRequestId: '88',
    kind: 'file-change', summary: '修改 prd/a.md', payload: { paths: ['prd/a.md'] },
  });
  store.resolveApproval('APP-1', 'approved');
  store.setRunApplyState('RUN-1', 'applying');
  store.saveValidation('RUN-1', { name: 'contract', status: 'passed', detail: '12 tests passed' });
  assert.equal(store.listFileChanges('RUN-1')[0].afterHash, 'after');
  assert.equal(store.getApproval('APP-1').status, 'approved');
  assert.equal(store.getRunApplyState('RUN-1').state, 'applying');
  assert.equal(store.listValidations('RUN-1')[0].status, 'passed');
  store.close();
});
```

- [ ] **Step 2: 运行数据库测试确认失败**

Run:

```powershell
node --test test/workbench/database.test.mjs
```

Expected: FAIL，提示第一个安全仓储方法不存在。

- [ ] **Step 3: 增加安全数据迁移**

Append to the `migration` string in `workbench/lib/database.mjs`:

```sql
CREATE TABLE IF NOT EXISTS file_snapshots (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  existed INTEGER NOT NULL,
  content_base64 TEXT,
  hash TEXT,
  PRIMARY KEY(run_id,path)
);
CREATE TABLE IF NOT EXISTS file_changes (
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('created','modified','deleted')),
  before_hash TEXT,
  after_hash TEXT,
  diff TEXT NOT NULL,
  restored_at TEXT,
  PRIMARY KEY(run_id,path)
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  protocol_request_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('passed','failed','skipped')),
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS run_apply_states (
  run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK(state IN ('not-started','applying','applied')),
  updated_at TEXT NOT NULL
);
```

The foundation schema deliberately recognizes the later permission and status values while its API exposes only `read-only`. Add a startup guard after the base migration so an older partial implementation fails clearly instead of rebuilding a referenced table in place:

```js
const runsSql = String(db.prepare(
  `SELECT sql FROM sqlite_master WHERE type='table' AND name='runs'`,
).get()?.sql || '');
for (const requiredToken of ['generate-candidate', 'modify-existing', 'waiting-approval']) {
  if (!runsSql.includes(requiredToken)) {
    throw new Error(`Database runs schema is older than the file-safety plan: missing ${requiredToken}`);
  }
}
```

- [ ] **Step 4: 增加仓储方法**

Add to the repository object in `workbench/lib/database.mjs`:

```js
removeArtifact(requirementId, artifactPath) {
  db.prepare(`DELETE FROM artifacts WHERE requirement_id=? AND path=?`)
    .run(requirementId, artifactPath);
},
setRunStatus(runId, status) {
  db.prepare(`UPDATE runs SET status=? WHERE id=?`).run(status, runId);
},
setRunApplyState(runId, state) {
  db.prepare(
    `INSERT INTO run_apply_states(run_id,state,updated_at) VALUES(?,?,?)
     ON CONFLICT(run_id) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at`,
  ).run(runId, state, now());
},
getRunApplyState(runId) {
  return db.prepare(
    `SELECT state,updated_at AS updatedAt FROM run_apply_states WHERE run_id=?`,
  ).get(runId) || { state: 'not-started', updatedAt: null };
},
saveFileSnapshot(runId, value) {
  db.prepare(
    `INSERT INTO file_snapshots(run_id,path,absolute_path,existed,content_base64,hash) VALUES(?,?,?,?,?,?)`,
  ).run(runId, value.path, value.absolutePath, value.existed ? 1 : 0, value.contentBase64, value.hash);
},
listFileSnapshots(runId) {
  return db.prepare(
    `SELECT path,absolute_path AS absolutePath,existed,content_base64 AS contentBase64,hash
     FROM file_snapshots WHERE run_id=? ORDER BY path`,
  ).all(runId).map(row => ({ ...row, existed: Boolean(row.existed) }));
},
saveFileChange(runId, value) {
  db.prepare(
    `INSERT INTO file_changes(run_id,path,absolute_path,kind,before_hash,after_hash,diff)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(run_id,path) DO UPDATE SET
       absolute_path=excluded.absolute_path,kind=excluded.kind,before_hash=excluded.before_hash,
       after_hash=excluded.after_hash,diff=excluded.diff`,
  ).run(
    runId, value.path, value.absolutePath, value.kind,
    value.beforeHash, value.afterHash, value.diff,
  );
},
listFileChanges(runId) {
  return db.prepare(
    `SELECT path,absolute_path AS absolutePath,kind,before_hash AS beforeHash,
            after_hash AS afterHash,diff,restored_at AS restoredAt
     FROM file_changes WHERE run_id=? ORDER BY path`,
  ).all(runId);
},
markChangesRestored(runId) {
  db.prepare(`UPDATE file_changes SET restored_at=? WHERE run_id=?`).run(now(), runId);
},
createApproval(value) {
  db.prepare(
    `INSERT INTO approvals(id,run_id,protocol_request_id,kind,summary,payload_json,status,created_at)
     VALUES(?,?,?,?,?,?,'pending',?)`,
  ).run(
    value.id, value.runId, String(value.protocolRequestId), value.kind,
    value.summary, JSON.stringify(value.payload), now(),
  );
},
getApproval(id) {
  const row = db.prepare(
    `SELECT id,run_id AS runId,protocol_request_id AS protocolRequestId,
            kind,summary,payload_json AS payloadJson,status,
            created_at AS createdAt,resolved_at AS resolvedAt
     FROM approvals WHERE id=?`,
  ).get(id);
  return row ? { ...row, payload: JSON.parse(row.payloadJson) } : null;
},
listPendingApprovals(runId) {
  return db.prepare(
    `SELECT id,run_id AS runId,kind,summary,payload_json AS payloadJson,status
     FROM approvals WHERE run_id=? AND status='pending' ORDER BY created_at`,
  ).all(runId).map(row => ({ ...row, payload: JSON.parse(row.payloadJson) }));
},
listApprovals(runId) {
  return db.prepare(
    `SELECT id,run_id AS runId,kind,summary,payload_json AS payloadJson,
            status,created_at AS createdAt,resolved_at AS resolvedAt
     FROM approvals WHERE run_id=? ORDER BY created_at`,
  ).all(runId).map(row => ({ ...row, payload: JSON.parse(row.payloadJson) }));
},
resolveApproval(id, status) {
  db.prepare(`UPDATE approvals SET status=?,resolved_at=? WHERE id=?`).run(status, now(), id);
},
saveValidation(runId, value) {
  db.prepare(
    `INSERT INTO validations(run_id,name,status,detail,created_at) VALUES(?,?,?,?,?)`,
  ).run(runId, value.name, value.status, value.detail, now());
},
listValidations(runId) {
  return db.prepare(
    `SELECT name,status,detail,created_at AS createdAt FROM validations WHERE run_id=? ORDER BY id`,
  ).all(runId);
},
```

- [ ] **Step 5: 运行数据库回归**

Run:

```powershell
node --test test/workbench/database.test.mjs
```

Expected: 全部数据库测试 PASS。

- [ ] **Step 6: 提交**

```powershell
git add workbench/lib/database.mjs test/workbench/database.test.mjs
git commit -m "feat: persist workbench file safety records"
```

## Task 3: 处理 App Server 审批请求

**Files:**
- Create: `test/workbench/approval-manager.test.mjs`
- Create: `workbench/lib/approval-manager.mjs`
- Modify: `workbench/lib/codex-app-server-client.mjs`

- [ ] **Step 1: 写双向 JSON-RPC 和审批失败测试**

Create `test/workbench/approval-manager.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ApprovalManager } from '../../workbench/lib/approval-manager.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';

class FakeCodex extends EventEmitter {
  responses = [];
  respond(id, result) { this.responses.push({ id, result }); }
}

test('selected file change waits in workbench and resolves explicitly', () => {
  const store = openDatabase(path.join(os.tmpdir(), `approval-${crypto.randomUUID()}.sqlite`));
  store.upsertRequirement({ id: 'REQ-1', title: 'A', stage: 'PRD中', externalWait: '无外部等待' });
  store.createRun({
    id: 'RUN-1', requirementId: 'REQ-1', prompt: '修改', permission: 'modify-existing',
    status: 'running', workflowType: null,
  });
  const codex = new FakeCodex();
  const approvals = new ApprovalManager({ store, codex });
  approvals.registerRun('RUN-1', { targets: ['prd/a.md'], turnId: 'turn-1' });
  codex.emit('request', {
    id: 81,
    method: 'item/fileChange/requestApproval',
    params: { turnId: 'turn-1', paths: ['prd/a.md'], reason: '更新异常策略' },
  });
  const pending = store.listPendingApprovals('RUN-1');
  assert.equal(pending.length, 1);
  assert.equal(store.getRun('RUN-1').status, 'waiting-approval');
  approvals.resolve(pending[0].id, 'approved');
  assert.deepEqual(codex.responses[0], { id: 81, result: { decision: 'accept' } });
  store.close();
});

test('out-of-scope path, delete and command are never silently approved', () => {
  const store = openDatabase(path.join(os.tmpdir(), `approval-${crypto.randomUUID()}.sqlite`));
  store.upsertRequirement({ id: 'REQ-1', title: 'A', stage: 'PRD中', externalWait: '无外部等待' });
  store.createRun({
    id: 'RUN-1', requirementId: 'REQ-1', prompt: '修改', permission: 'modify-existing',
    status: 'running', workflowType: null,
  });
  const codex = new FakeCodex();
  const approvals = new ApprovalManager({ store, codex });
  approvals.registerRun('RUN-1', { targets: ['prd/a.md'], turnId: 'turn-1' });
  for (const request of [
    { id: 82, method: 'item/fileChange/requestApproval', params: { turnId: 'turn-1', paths: ['prd/b.md'] } },
    { id: 83, method: 'item/fileChange/requestApproval', params: { turnId: 'turn-1', paths: ['prd/a.md'], deletion: true } },
    { id: 84, method: 'item/commandExecution/requestApproval', params: { turnId: 'turn-1', command: 'git push' } },
  ]) codex.emit('request', request);
  const pending = store.listPendingApprovals('RUN-1');
  assert.equal(pending.length, 3);
  const outOfScope = pending.find(item => item.kind === 'out-of-scope-file');
  assert.throws(() => approvals.resolve(outOfScope.id, 'approved'), /cannot be added mid-run/);
  assert.equal(codex.responses.length, 0);
  store.close();
});
```

- [ ] **Step 2: 运行审批测试确认失败**

Run:

```powershell
node --test test/workbench/approval-manager.test.mjs
```

Expected: FAIL，提示审批管理器不存在。

- [ ] **Step 3: 让 App Server 客户端识别服务端请求并响应**

In `#receive` of `workbench/lib/codex-app-server-client.mjs`, add this branch before response correlation:

```js
if (Object.hasOwn(message, 'id') && message.method) {
  this.emit('request', message);
  return;
}
```

Add a public method:

```js
respond(id, result) {
  if (!this.child) throw new Error('Codex App Server is not running');
  this.#write({ jsonrpc: '2.0', id, result });
}
```

Add to `test/workbench/codex-app-server-client.test.mjs`:

```js
test('client emits server requests and writes JSON-RPC responses', async () => {
  const child = fakeProcess();
  const writes = [];
  child.stdin.on('data', chunk => writes.push(JSON.parse(chunk.toString('utf8'))));
  const client = new CodexAppServerClient({ spawnProcess: () => child });
  const starting = client.start();
  await new Promise(resolve => setImmediate(resolve));
  child.stdout.write(`${JSON.stringify({ id: writes[0].id, result: {} })}\n`);
  await starting;
  const received = new Promise(resolve => client.once('request', resolve));
  child.stdout.write(`${JSON.stringify({
    id: 91,
    method: 'item/fileChange/requestApproval',
    params: { turnId: 'turn-1', paths: ['prd/a.md'] },
  })}\n`);
  assert.equal((await received).id, 91);
  client.respond(91, { decision: 'accept' });
  assert.deepEqual(writes.at(-1), { jsonrpc: '2.0', id: 91, result: { decision: 'accept' } });
  await client.stop();
});
```

- [ ] **Step 4: 实现审批映射**

Create `workbench/lib/approval-manager.mjs`:

```js
import crypto from 'node:crypto';
import path from 'node:path';

export class ApprovalManager {
  constructor({ store, codex, allowedRoot = process.cwd() }) {
    this.store = store;
    this.codex = codex;
    this.allowedRoot = path.resolve(allowedRoot);
    this.byTurn = new Map();
    this.protocolByApproval = new Map();
    this.filePathsByItem = new Map();
    codex.on('notification', message => this.#onNotification(message));
    codex.on('request', request => this.#onRequest(request));
  }

  registerRun(runId, { targets, turnId, approvalRoot = this.allowedRoot }) {
    this.byTurn.set(turnId, {
      runId,
      approvalRoot: path.resolve(approvalRoot),
      targets: new Set(targets),
    });
  }

  unregisterTurn(turnId) {
    this.byTurn.delete(turnId);
  }

  resolve(approvalId, decision) {
    if (!['approved', 'rejected'].includes(decision)) throw new Error('Invalid approval decision');
    const approval = this.store.getApproval(approvalId);
    if (!approval || approval.status !== 'pending') throw new Error('Approval is not pending');
    if (decision === 'approved' && approval.kind === 'out-of-scope-file') {
      throw Object.assign(
        new Error('Out-of-scope files cannot be added mid-run; reject and restart with an explicit target'),
        { statusCode: 409 },
      );
    }
    const protocolId = this.protocolByApproval.get(approvalId);
    this.codex.respond(protocolId, { decision: decision === 'approved' ? 'accept' : 'decline' });
    this.store.resolveApproval(approvalId, decision);
    this.store.setRunStatus(approval.runId, 'running');
    this.protocolByApproval.delete(approvalId);
  }

  rejectPendingForRun(runId) {
    for (const approval of this.store.listPendingApprovals(runId)) {
      this.resolve(approval.id, 'rejected');
    }
  }

  #onNotification(message) {
    const item = message.params?.item;
    if (!item?.id || item.type !== 'fileChange') return;
    const paths = (item.changes || []).map(change => change.path).filter(Boolean);
    if (paths.length > 0) this.filePathsByItem.set(item.id, paths);
  }

  #onRequest(request) {
    const turn = this.byTurn.get(request.params?.turnId);
    if (!turn) {
      this.codex.respond(request.id, { decision: 'decline' });
      return;
    }
    const rawPaths = request.params.paths
      || request.params.changes?.map(change => change.path)
      || this.filePathsByItem.get(request.params.itemId)
      || [];
    const paths = rawPaths.map(value => {
      if (!path.isAbsolute(value)) return value.split(path.sep).join('/');
      const relative = path.relative(turn.approvalRoot, path.resolve(value));
      return relative.split(path.sep).join('/');
    });
    const inScope = paths.length > 0 && paths.every(value => {
      return value !== '..' && !value.startsWith('../') && turn.targets.has(value);
    });
    const deletion = Boolean(request.params.deletion);
    const command = request.method === 'item/commandExecution/requestApproval';
    const kind = command ? 'command' : deletion ? 'file-delete' : inScope ? 'file-change' : 'out-of-scope-file';
    const summary = command
      ? `命令请求：${String(request.params.command || '').slice(0, 240)}`
      : `${kind}：${paths.join(', ') || '未提供路径'}`;
    const id = `APPROVAL-${crypto.randomUUID()}`;
    this.store.createApproval({
      id,
      runId: turn.runId,
      protocolRequestId: request.id,
      kind,
      summary,
      payload: request.params,
    });
    this.store.setRunStatus(turn.runId, 'waiting-approval');
    this.protocolByApproval.set(id, request.id);
  }
}
```

- [ ] **Step 5: 运行审批与客户端测试**

Run:

```powershell
node --test test/workbench/codex-app-server-client.test.mjs test/workbench/approval-manager.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 6: 提交**

```powershell
git add workbench/lib/codex-app-server-client.mjs workbench/lib/approval-manager.mjs test/workbench/codex-app-server-client.test.mjs test/workbench/approval-manager.test.mjs
git commit -m "feat: bridge Codex approvals into workbench"
```

## Task 4: 实现写入 Run、取消、超时和重试

**Files:**
- Create: `test/workbench/run-control.test.mjs`
- Create: `workbench/lib/process-control.mjs`
- Modify: `workbench/lib/run-manager.mjs`

- [ ] **Step 1: 写运行控制失败测试**

Create `test/workbench/run-control.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContextService } from '../../workbench/lib/context-service.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { FileSafety } from '../../workbench/lib/file-safety.mjs';
import { RunManager } from '../../workbench/lib/run-manager.mjs';

class FakeCodex extends EventEmitter {
  calls = [];
  async start() {}
  async request(method, params) {
    this.calls.push({ method, params });
    if (method === 'thread/start') return { thread: { id: 'thread-write' } };
    if (method === 'turn/start') return { turn: { id: 'turn-write' } };
    if (method === 'turn/interrupt') return {};
    throw new Error(method);
  }
}

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-control-'));
  fs.mkdirSync(path.join(root, 'prd'));
  fs.writeFileSync(path.join(root, 'prd', 'a.md'), 'before\n', 'utf8');
  const store = openDatabase(path.join(root, '.workbench-data', 'test.sqlite'));
  store.upsertRequirement({ id: 'REQ-1', title: 'A', stage: 'PRD中', externalWait: '无外部等待' });
  store.addArtifact({ id: 'ART-1', requirementId: 'REQ-1', kind: 'PRD', path: 'prd/a.md' });
  const codex = new FakeCodex();
  const approvals = { registerRun() {}, unregisterTurn() {} };
  const manager = new RunManager({
    store, codex, allowedRoot: root,
    contextService: new ContextService({ store, allowedRoot: root }),
    fileSafety: new FileSafety({ allowedRoot: root }),
    approvalManager: approvals,
    runTimeoutMs: 60_000,
  });
  return { root, store, codex, manager };
}

test('write run snapshots exact targets and uses workspaceWrite without danger mode', async () => {
  const { store, codex, manager } = setup();
  const run = await manager.startWriteRun({
    requirementId: 'REQ-1',
    prompt: '补充异常策略',
    permission: 'modify-existing',
    targets: ['prd/a.md'],
  });
  assert.equal(store.listFileSnapshots(run.id)[0].path, 'prd/a.md');
  const turn = codex.calls.find(call => call.method === 'turn/start');
  assert.equal(turn.params.sandboxPolicy.type, 'workspaceWrite');
  assert.match(turn.params.cwd, /[\\/]\.workbench-data[\\/]staging[\\/]RUN-/);
  assert.deepEqual(turn.params.sandboxPolicy.writableRoots, [turn.params.cwd]);
  assert.equal(JSON.stringify(turn).includes('danger-full-access'), false);
  assert.equal(fs.readFileSync(path.join(manager.allowedRoot, 'prd', 'a.md'), 'utf8'), 'before\n');
  await manager.cancel(run.id);
  assert.equal(store.getRun(run.id).status, 'cancelled');
  store.close();
});

test('generate candidate requires a missing registered target and modify requires an existing target', async () => {
  const { manager, store } = setup();
  await assert.rejects(
    () => manager.startWriteRun({
      requirementId: 'REQ-1', prompt: '生成', permission: 'generate-candidate', targets: ['prd/a.md'],
    }),
    /must not already exist/,
  );
  await assert.rejects(
    () => manager.startWriteRun({
      requirementId: 'REQ-1', prompt: '修改', permission: 'modify-existing', targets: ['prd/missing.md'],
    }),
    /must already exist/,
  );
  store.close();
});
```

- [ ] **Step 2: 运行控制测试确认失败**

Run:

```powershell
node --test test/workbench/run-control.test.mjs
```

Expected: FAIL，提示写入或取消方法不存在。

- [ ] **Step 3: 实现 Windows 进程树兜底**

Create `workbench/lib/process-control.mjs`:

```js
import { execFile } from 'node:child_process';

export function terminateProcessTree(pid, platform = process.platform) {
  if (!Number.isInteger(pid) || pid <= 0) return Promise.resolve();
  if (platform === 'win32') {
    return new Promise((resolve, reject) => {
      execFile('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, error => {
        if (error && ![128, 255].includes(error.code)) reject(error);
        else resolve();
      });
    });
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  return Promise.resolve();
}
```

Add to `CodexAppServerClient`:

```js
pid() {
  return this.child?.pid || null;
}
```

- [ ] **Step 4: 实现固定目标的写入 Run**

Add this import to `workbench/lib/run-manager.mjs`:

```js
import fs from 'node:fs';
```

Extend the `RunManager` constructor:

```js
constructor({
  store, codex, allowedRoot, contextService,
  maxConcurrentRuns = 1,
  fileSafety = null, approvalManager = null, runTimeoutMs = 600_000,
}) {
  this.store = store;
  this.codex = codex;
  this.allowedRoot = path.resolve(allowedRoot);
  this.contextService = contextService;
  this.maxConcurrentRuns = maxConcurrentRuns;
  this.fileSafety = fileSafety;
  this.approvalManager = approvalManager;
  this.runTimeoutMs = runTimeoutMs;
  this.activeByTurn = new Map();
  this.activeByRun = new Map();
  this.codex.on('notification', message => this.#onNotification(message));
}
```

Add one registration helper so read-only, structured workflow and write Runs share cancellation and timeout behavior:

```js
#registerActive(active) {
  const tracked = {
    ...active,
    timeout: setTimeout(() => this.#timeout(active.runId), this.runTimeoutMs),
  };
  this.activeByTurn.set(active.turnId, tracked);
  this.activeByRun.set(active.runId, tracked);
  return tracked;
}
```

In `startReadOnlyRun`, replace its existing `activeByTurn.set` call with:

```js
this.#registerActive({ runId: id, turnId, text: '' });
```

In `startWorkflowRun`, replace its existing `activeByTurn.set` call with:

```js
this.#registerActive({
  runId: id,
  turnId,
  text: '',
  workflowType,
  requirementId,
});
```

Add:

```js
async startWriteRun({ requirementId, prompt, permission, targets }) {
  if (this.store.countActiveRuns() >= this.maxConcurrentRuns) {
    throw Object.assign(new Error('Concurrent run limit reached'), { statusCode: 429 });
  }
  if (!['generate-candidate', 'modify-existing'].includes(permission)) {
    throw Object.assign(new Error('Unsupported write permission'), { statusCode: 400 });
  }
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw Object.assign(new Error('prompt is required'), { statusCode: 400 });
  const context = this.contextService.getRequirementContext(requirementId);
  const normalizedTargets = this.fileSafety.normalizeTargets(targets);
  for (const target of normalizedTargets) {
    const exists = fs.existsSync(target.absolute);
    if (permission === 'generate-candidate' && exists) throw new Error(`Candidate target must not already exist: ${target.path}`);
    if (permission === 'generate-candidate' && !fs.existsSync(path.dirname(target.absolute))) {
      throw new Error(`Candidate parent directory must already exist: ${target.path}`);
    }
    if (permission === 'modify-existing' && !exists) throw new Error(`Modify target must already exist: ${target.path}`);
  }
  if (permission === 'modify-existing') {
    this.contextService.authorizeFiles(requirementId, normalizedTargets.map(item => item.path));
  }
  const id = `RUN-${crypto.randomUUID()}`;
  const snapshot = this.fileSafety.capture(normalizedTargets.map(item => item.path));
  const stagingRoot = this.fileSafety.prepareStaging(id, snapshot);
  this.store.createRun({
    id, requirementId, prompt: cleanPrompt, cwd: this.allowedRoot,
    permission, status: 'running', workflowType: null,
  });
  this.store.saveRunContext(id, {
    files: normalizedTargets.map(item => item.path),
    input: { permission },
  });
  for (const item of snapshot) this.store.saveFileSnapshot(id, item);
  try {
    await this.codex.start();
    const { threadId, rebuilt } = await this.#requirementThread(requirementId);
    if (rebuilt) {
      this.store.appendRunEvent(id, 'workbench/thread-rebuilt', {
        message: '原 Codex Thread 不可恢复，已创建新 Thread；本轮上下文由需求和授权文件重建。',
      });
    }
    const targetList = normalizedTargets.map(item => item.path);
    const fullPrompt = [
      `当前需求：${context.requirement.id} ${context.requirement.title}`,
      `本次权限：${permission}`,
      `你现在位于本次运行的隔离暂存区，只允许处理这些相对路径：\n${targetList.map(value => `- ${value}`).join('\n')}`,
      '不得删除文件，不得修改目标清单外文件，不得访问真实工作区路径，不得发布或外部发送。',
      `任务：${cleanPrompt}`,
    ].join('\n\n');
    const turnResult = await this.codex.request('turn/start', {
      threadId,
      cwd: stagingRoot,
      approvalPolicy: 'on-request',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [stagingRoot],
        networkAccess: false,
      },
      input: [{ type: 'text', text: fullPrompt }],
    });
    const turnId = turnResult.turn.id;
    this.store.bindProtocolIds(id, threadId, turnId, this.codex.pid?.() || null);
    const active = this.#registerActive({
      runId: id, turnId, text: '', targets: targetList, snapshot,
      requirementId, permission, stagingRoot,
    });
    this.approvalManager.registerRun(id, {
      targets: targetList,
      turnId,
      approvalRoot: stagingRoot,
    });
    return this.store.getRun(id);
  } catch (error) {
    this.store.finishRun(id, 'failed', null, error.message);
    throw error;
  }
}
```

- [ ] **Step 5: 实现收尾、取消和重试**

Add to `RunManager`:

```js
async cancel(runId) {
  const active = this.activeByRun.get(runId);
  if (!active) throw Object.assign(new Error('Run is not active'), { statusCode: 409 });
  this.approvalManager?.rejectPendingForRun(runId);
  await this.#interruptActive(active);
  this.#finalizeActive(active);
  this.store.finishRun(runId, 'cancelled', active.text || null, 'Cancelled by user');
  return this.store.getRun(runId);
}

async retry(runId) {
  const previous = this.store.getRun(runId);
  if (!previous || !['failed', 'cancelled', 'interrupted'].includes(previous.status)) {
    throw Object.assign(new Error('Only failed, cancelled or interrupted runs can retry'), { statusCode: 409 });
  }
  const context = this.store.getRunContext(runId);
  if (!context) throw new Error('Run context is missing and cannot be retried safely');
  const unrestoredChanges = this.store.listFileChanges(runId).filter(item => !item.restoredAt);
  if (unrestoredChanges.length > 0) {
    throw Object.assign(
      new Error('Restore or manually accept the previous file changes before retrying'),
      { statusCode: 409 },
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

async #timeout(runId) {
  const active = this.activeByRun.get(runId);
  if (!active) return;
  this.approvalManager?.rejectPendingForRun(runId);
  await this.#interruptActive(active);
  this.#finalizeActive(active);
  this.store.finishRun(runId, 'failed', active.text || null, 'Run timed out');
}

async #interruptActive(active) {
  const run = this.store.getRun(active.runId);
  let timer;
  const interrupted = await Promise.race([
    this.codex.request('turn/interrupt', {
      threadId: run.threadId,
      turnId: active.turnId,
    }).then(() => true, () => false),
    new Promise(resolve => {
      timer = setTimeout(() => resolve(false), 3_000);
    }),
  ]);
  clearTimeout(timer);
  if (!interrupted) {
    const { terminateProcessTree } = await import('./process-control.mjs');
    await terminateProcessTree(this.codex.pid());
  }
}

#finalizeActive(active) {
  clearTimeout(active.timeout);
  this.activeByRun.delete(active.runId);
  this.activeByTurn.delete(active.turnId);
  this.approvalManager?.unregisterTurn(active.turnId);
}

#recordChanges(active) {
  if (!active.snapshot) return [];
  const unexpected = this.fileSafety.findUnexpectedFiles(active.stagingRoot, active.targets);
  if (unexpected.length > 0) {
    throw new Error(`Staging contains out-of-scope files: ${unexpected.join(', ')}`);
  }
  const stagedChanges = this.fileSafety.compare(active.snapshot, active.stagingRoot);
  const appliedChanges = this.fileSafety.applyFromStaging(
    active.snapshot,
    stagedChanges,
    active.stagingRoot,
    () => this.store.setRunApplyState(active.runId, 'applying'),
  );
  for (const change of appliedChanges) this.store.saveFileChange(active.runId, change);
  this.store.setRunApplyState(active.runId, 'applied');
  return appliedChanges;
}
```

In the successful `turn/completed` branch for a write Run:

```js
if (active.snapshot) {
  let changes;
  try {
    changes = this.#recordChanges(active);
  } catch (error) {
    if (this.store.getRunApplyState(active.runId).state === 'applying') {
      for (const partial of this.fileSafety.compare(active.snapshot)) {
        this.store.saveFileChange(active.runId, partial);
      }
    }
    this.store.finishRun(
      active.runId,
      'failed',
      active.text || null,
      `Staged changes were not applied: ${error.message}`,
    );
    this.#finalizeActive(active);
    return;
  }
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
  this.#finalizeActive(active);
  return;
}
```

In every non-write `turn/completed` branch, replace `this.activeByTurn.delete(turnId)` with:

```js
this.#finalizeActive(active);
```

Before the `turn/completed` handling in `#onNotification`, persist App Server command completion items as validation evidence:

```js
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
```

- [ ] **Step 6: 运行运行控制测试**

Run:

```powershell
node --test test/workbench/run-control.test.mjs
npm run workbench:test
```

Expected: 写入、取消测试 PASS，原有测试无回归。

- [ ] **Step 7: 提交**

```powershell
git add workbench/lib/run-manager.mjs workbench/lib/process-control.mjs workbench/lib/codex-app-server-client.mjs test/workbench/run-control.test.mjs
git commit -m "feat: control writable Codex runs"
```

## Task 5: 暴露写入、审批、取消、重试和恢复 API

**Files:**
- Create: `test/workbench/file-api.test.mjs`
- Modify: `workbench/server.mjs`

- [ ] **Step 1: 写文件 API 失败测试**

Create `test/workbench/file-api.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWorkbenchServer } from '../../workbench/server.mjs';

class FakeCodex extends EventEmitter {
  async start() {}
  diagnostics() { return { running: true, stderr: '' }; }
  async stop() {}
  async request(method) {
    if (method === 'thread/start') return { thread: { id: 'th-write' } };
    if (method === 'turn/start') return { turn: { id: 'tu-write' } };
    if (method === 'turn/interrupt') return {};
    throw new Error(method);
  }
  respond() {}
  pid() { return null; }
}

test('write endpoint rejects arbitrary absolute targets and returns run details', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-api-'));
  fs.mkdirSync(path.join(root, 'prd'));
  const app = await createWorkbenchServer({
    env: { WORKBENCH_ROOT: root, WORKBENCH_PORT: '0' },
    codexFactory: () => new FakeCodex(),
  });
  await app.listen();
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;
  const headers = {
    Origin: app.config.originForPort(app.address().port),
    Authorization: `Bearer ${app.config.sessionToken}`,
    'Content-Type': 'application/json',
  };
  const requirementId = (await (await fetch(`${base}/api/bootstrap`, { headers })).json()).requirements[0].id;
  const rejected = await fetch(`${base}/api/runs/write`, {
    method: 'POST', headers,
    body: JSON.stringify({
      requirementId, prompt: '生成候选', permission: 'generate-candidate',
      targets: ['C:/Windows/System32/unsafe.txt'],
    }),
  });
  assert.equal(rejected.status, 500);
  const accepted = await fetch(`${base}/api/runs/write`, {
    method: 'POST', headers,
    body: JSON.stringify({
      requirementId, prompt: '生成候选', permission: 'generate-candidate',
      targets: ['prd/candidate.md'],
    }),
  });
  assert.equal(accepted.status, 202);
  const run = await accepted.json();
  const detail = await fetch(`${base}/api/runs/${run.id}`, { headers });
  assert.equal(detail.status, 200);
  assert.deepEqual((await detail.json()).fileChanges, []);
});
```

- [ ] **Step 2: 运行 API 测试确认失败**

Run:

```powershell
node --test test/workbench/file-api.test.mjs
```

Expected: FAIL，写入路由返回 `404`。

- [ ] **Step 3: 注入文件安全与审批管理器**

Add imports in `workbench/server.mjs`:

```js
import { ApprovalManager } from './lib/approval-manager.mjs';
import { FileSafety } from './lib/file-safety.mjs';
```

Construct services in this order:

```js
const contextService = new ContextService({ store, allowedRoot: config.allowedRoot });
const fileSafety = new FileSafety({ allowedRoot: config.allowedRoot });
for (const interrupted of store.listRuns(1_000).filter(run => run.status === 'interrupted')) {
  const snapshots = store.listFileSnapshots(interrupted.id);
  if (snapshots.length === 0) continue;
  const differences = fileSafety.compare(snapshots);
  if (store.getRunApplyState(interrupted.id).state === 'applying') {
    for (const change of differences) store.saveFileChange(interrupted.id, change);
  } else if (differences.length > 0) {
    store.saveValidation(interrupted.id, {
      name: 'Broker restart conflict check',
      status: 'failed',
      detail: `检测到 Run 未开始写回前真实文件已外部变化：${differences.map(item => item.path).join(', ')}`,
    });
  }
}
const approvalManager = new ApprovalManager({ store, codex, allowedRoot: config.allowedRoot });
const runs = new RunManager({
  store,
  codex,
  allowedRoot: config.allowedRoot,
  contextService,
  maxConcurrentRuns: config.maxConcurrentRuns,
  fileSafety,
  approvalManager,
  runTimeoutMs: config.runTimeoutMs,
});
```

- [ ] **Step 4: 增加 API 路由**

Add before the API `404` branch:

```js
if (request.method === 'POST' && url.pathname === '/api/runs/write') {
  const body = await readJsonBody(request, config.maxBodyBytes);
  const run = await runs.startWriteRun(body);
  return sendJson(response, 202, run);
}
const runDetailMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
if (request.method === 'GET' && runDetailMatch) {
  const runId = decodeURIComponent(runDetailMatch[1]);
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
  return sendJson(response, 200, await runs.cancel(decodeURIComponent(cancelMatch[1])));
}
const retryMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/retry$/);
if (request.method === 'POST' && retryMatch) {
  return sendJson(response, 202, await runs.retry(decodeURIComponent(retryMatch[1])));
}
const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/decision$/);
if (request.method === 'POST' && approvalMatch) {
  const body = await readJsonBody(request, config.maxBodyBytes);
  approvalManager.resolve(decodeURIComponent(approvalMatch[1]), body.decision);
  return sendJson(response, 200, { status: body.decision });
}
const restoreMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/restore$/);
if (request.method === 'POST' && restoreMatch) {
  const runId = decodeURIComponent(restoreMatch[1]);
  const run = store.getRun(runId);
  if (!run) return sendJson(response, 404, { error: 'Run not found' });
  const snapshots = store.listFileSnapshots(runId);
  const changes = store.listFileChanges(runId);
  if (changes.length === 0) return sendJson(response, 409, { error: 'Run has no file changes' });
  fileSafety.restore(snapshots, changes);
  for (const change of changes.filter(item => item.kind === 'created')) {
    store.removeArtifact(run.requirementId, change.path);
  }
  store.markChangesRestored(runId);
  return sendJson(response, 200, { restored: changes.map(item => item.path) });
}
```

- [ ] **Step 5: 将绝对路径错误规范为 400**

In `normalizeRelative` in `file-safety.mjs`, replace the absolute-path error with:

```js
if (path.isAbsolute(relativePath)) {
  throw Object.assign(new Error('Target path must be relative'), { statusCode: 400 });
}
```

Update the rejected assertion in `file-api.test.mjs`:

```js
assert.equal(rejected.status, 400);
```

- [ ] **Step 6: 运行 API 与全量测试**

Run:

```powershell
node --test test/workbench/file-api.test.mjs
npm run workbench:test
```

Expected: API 测试 PASS，全量测试无回归。

- [ ] **Step 7: 提交**

```powershell
git add workbench/server.mjs workbench/lib/file-safety.mjs test/workbench/file-api.test.mjs
git commit -m "feat: expose safe file run controls"
```

## Task 6: 展示权限、审批、差异、验证和恢复

**Files:**
- Modify: `workbench/public/index.html`
- Modify: `workbench/public/styles.css`
- Modify: `workbench/public/app.js`
- Modify: `tools/verify-personal-codex-workbench-ui.mjs`

- [ ] **Step 1: 扩展 UI 静态契约**

Add required tokens:

```js
'生成候选产物',
'修改已选产物',
'等待我确认',
'文件变化',
'验证结果',
'恢复本次修改',
'data-action="cancel-run"',
'data-action="retry-run"',
```

Run:

```powershell
npm run workbench:verify-ui
```

Expected: FAIL，提示缺少写入权限 token。

- [ ] **Step 2: 增加权限和运行详情区域**

Replace the permission row and action area in `workbench/public/index.html`:

```html
<fieldset id="permissionPicker">
  <legend>权限</legend>
  <label><input type="radio" name="permission" value="read-only" checked>只读分析</label>
  <label><input type="radio" name="permission" value="generate-candidate">生成候选产物</label>
  <label><input type="radio" name="permission" value="modify-existing">修改已选产物</label>
</fieldset>
<label>目标文件（每行一个工作区相对路径）<textarea id="authorizedFiles" rows="4"></textarea></label>
<div class="run-actions">
  <button id="startRun" class="button primary" type="button">开始任务</button>
  <button class="button" type="button" data-action="cancel-run">取消任务</button>
  <button class="button" type="button" data-action="retry-run">重试</button>
</div>
<section id="approvalCards"><h3>等待我确认</h3></section>
<section id="fileChanges"><h3>文件变化</h3></section>
<section id="validationResults"><h3>验证结果</h3></section>
<button class="button danger" type="button" data-action="restore-run">恢复本次修改</button>
```

- [ ] **Step 3: 增加状态样式**

Append to `workbench/public/styles.css`:

```css
#permissionPicker{display:flex;flex-wrap:wrap;gap:12px;border:1px solid var(--line);border-radius:10px;padding:12px}
.run-actions{display:flex;flex-wrap:wrap;gap:8px}.button.danger{color:#a12622;border-color:#d9a19e}
.approval-card,.change-card,.validation-card{border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:8px}
.approval-card{border-color:#e3b56f;background:#fff9ef}.diff{max-height:320px;overflow:auto;white-space:pre;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#10182b;color:#e8edfa;padding:12px;border-radius:8px}
.diff .add{color:#71d69f}.diff .remove{color:#ff9c98}
```

- [ ] **Step 4: 根据权限启动只读或写入 Run**

Add to browser state:

```js
activeRunId: null,
```

Replace the first request portion of `startRun`:

```js
const permission = document.querySelector('input[name="permission"]:checked').value;
const targets = document.querySelector('#authorizedFiles').value
  .split(/\r?\n/).map(value => value.trim()).filter(Boolean);
let run;
if (permission === 'read-only') {
  run = state.selectedWorkflow
    ? await api(`/api/workflows/${state.selectedWorkflow}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          files: targets,
          input: workflowInput(state.selectedWorkflow, document.querySelector('#businessInput').value.trim()),
        }),
      })
    : await api('/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          prompt: document.querySelector('#prompt').value.trim(),
          files: targets,
          permission: 'read-only',
        }),
      });
} else {
  const prompt = document.querySelector('#prompt').value.trim();
  if (!prompt) throw new Error('请输入写入任务');
  run = await api('/api/runs/write', {
    method: 'POST',
    body: JSON.stringify({
      requirementId: state.selectedRequirementId,
      prompt,
      permission,
      targets,
    }),
  });
}
state.activeRunId = run.id;
```

Keep the context summary synchronized with the selected permission:

```js
document.querySelector('#permissionPicker').addEventListener('change', event => {
  if (event.target.name !== 'permission') return;
  const labels = {
    'read-only': '只读分析',
    'generate-candidate': '生成候选产物',
    'modify-existing': '修改已选产物',
  };
  text(document.querySelector('#contextPermission'), labels[event.target.value]);
});
```

- [ ] **Step 5: 渲染审批、文件差异和验证**

Add:

```js
function diffNode(diff) {
  const pre = document.createElement('pre');
  pre.className = 'diff';
  for (const line of diff.split('\n')) {
    const span = document.createElement('span');
    span.className = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : '';
    span.textContent = `${line}\n`;
    pre.append(span);
  }
  return pre;
}

async function renderRunDetail(runId) {
  const detail = await api(`/api/runs/${encodeURIComponent(runId)}`);
  document.querySelector('[data-action="cancel-run"]').disabled =
    !['running', 'waiting-approval'].includes(detail.status);
  document.querySelector('[data-action="retry-run"]').disabled =
    !['failed', 'cancelled', 'interrupted'].includes(detail.status);
  document.querySelector('[data-action="restore-run"]').disabled =
    detail.fileChanges.length === 0 || detail.fileChanges.every(item => item.restoredAt);
  const approvals = document.querySelector('#approvalCards');
  approvals.replaceChildren(...detail.approvals.map(item => {
    const card = document.createElement('article');
    card.className = 'approval-card';
    const summary = document.createElement('p');
    summary.textContent = `${item.kind} · ${item.summary}`;
    const approve = document.createElement('button');
    const reject = document.createElement('button');
    approve.className = reject.className = 'button';
    approve.textContent = '允许本次';
    reject.textContent = '拒绝';
    approve.addEventListener('click', () => decideApproval(item.id, 'approved'));
    reject.addEventListener('click', () => decideApproval(item.id, 'rejected'));
    if (item.status !== 'pending') {
      approve.disabled = true;
      reject.disabled = true;
      approve.textContent = item.status;
    } else if (item.kind === 'out-of-scope-file') {
      approve.disabled = true;
      approve.textContent = '需重启任务并显式选择该文件';
    }
    card.append(summary, approve, reject);
    return card;
  }));
  const changes = document.querySelector('#fileChanges');
  changes.replaceChildren(...detail.fileChanges.map(item => {
    const card = document.createElement('article');
    card.className = 'change-card';
    const title = document.createElement('strong');
    title.textContent = `${item.kind} · ${item.path}`;
    card.append(title, diffNode(item.diff));
    return card;
  }));
  const validations = document.querySelector('#validationResults');
  validations.replaceChildren(...detail.validations.map(item => {
    const card = document.createElement('article');
    card.className = 'validation-card';
    card.textContent = `${item.status} · ${item.name} · ${item.detail}`;
    return card;
  }));
  return detail;
}

async function decideApproval(id, decision) {
  await api(`/api/approvals/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  await renderRunDetail(state.activeRunId);
}
```

In the foundation `renderRuns` card creation, make every historical Run reopenable after refresh:

```js
card.tabIndex = 0;
card.setAttribute('role', 'button');
card.setAttribute('aria-label', `查看运行 ${run.id}`);
const openRun = async () => {
  state.activeRunId = run.id;
  document.querySelector('#codexDrawer').showModal();
  text(document.querySelector('#drawerRunStatus'), run.status);
  await renderRunDetail(run.id);
};
card.addEventListener('click', () => openRun().catch(error => text(detail, error.message)));
card.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openRun().catch(error => text(detail, error.message));
  }
});
```

On every `run.status` SSE event call:

```js
await renderRunDetail(run.id);
```

For waiting approvals, poll only while status is active:

```js
const detailTimer = setInterval(async () => {
  const detail = await renderRunDetail(run.id);
  text(document.querySelector('#drawerRunStatus'), detail.status === 'waiting-approval' ? '等待我确认' : detail.status);
  if (!['running', 'waiting-approval'].includes(detail.status)) clearInterval(detailTimer);
}, 600);
```

- [ ] **Step 6: 接线取消、重试和恢复**

Add:

```js
document.querySelector('[data-action="cancel-run"]').addEventListener('click', async () => {
  if (!state.activeRunId) return;
  await api(`/api/runs/${encodeURIComponent(state.activeRunId)}/cancel`, { method: 'POST', body: '{}' });
  await renderRunDetail(state.activeRunId);
});
document.querySelector('[data-action="retry-run"]').addEventListener('click', async () => {
  if (!state.activeRunId) return;
  const next = await api(`/api/runs/${encodeURIComponent(state.activeRunId)}/retry`, { method: 'POST', body: '{}' });
  state.activeRunId = next.id;
});
document.querySelector('[data-action="restore-run"]').addEventListener('click', async () => {
  if (!state.activeRunId) return;
  if (!confirm('只恢复这次运行记录的文件；若文件后来被修改，将停止恢复。继续吗？')) return;
  const result = await api(`/api/runs/${encodeURIComponent(state.activeRunId)}/restore`, { method: 'POST', body: '{}' });
  alert(`已恢复：${result.restored.join('、')}`);
  await renderRunDetail(state.activeRunId);
});
```

- [ ] **Step 7: 运行 UI 验证**

Run:

```powershell
npm run workbench:verify-ui
```

Expected: PASS；写入权限、确认卡、差异、验证、取消、重试和恢复入口都可通过键盘访问。

- [ ] **Step 8: 提交**

```powershell
git add workbench/public tools/verify-personal-codex-workbench-ui.mjs
git commit -m "feat: show Codex approvals and file recovery"
```

## Task 7: 增加安全验收、真实写入和冲突恢复证据

**Files:**
- Modify: `tools/verify-personal-codex-workbench-ui.mjs`
- Test output:
  - `test-results/personal-codex-workbench/file-diff.png`
  - `test-results/personal-codex-workbench/approval.png`

- [ ] **Step 1: 加自动化安全契约**

Append assertions to `tools/verify-personal-codex-workbench-ui.mjs`:

```js
for (const forbidden of ['danger-full-access', '--last', 'git reset --hard', 'git checkout --']) {
  assert(![
    fs.readFileSync(path.join(root, 'workbench/server.mjs'), 'utf8'),
    fs.readFileSync(path.join(root, 'workbench/lib/run-manager.mjs'), 'utf8'),
    fs.readFileSync(path.join(root, 'workbench/public/app.js'), 'utf8'),
  ].join('\n').includes(forbidden), `Forbidden implementation token: ${forbidden}`);
}
```

In the Playwright section add:

```js
await page.locator('input[name="permission"][value="modify-existing"]').check();
assert.equal(await page.locator('[data-action="cancel-run"]').isVisible(), true);
assert.equal(await page.locator('[data-action="retry-run"]').isVisible(), true);
assert.equal(await page.locator('[data-action="restore-run"]').isVisible(), true);
```

- [ ] **Step 2: 运行全量自动化与静态安全扫描**

Run:

```powershell
npm run workbench:test
npm run workbench:verify-ui
rg -n -- "danger-full-access|--last|git reset --hard|git checkout --" workbench
git diff --check
```

Expected:

- 所有测试 PASS。
- UI 验证 PASS。
- `rg` 退出码为 `1` 且无匹配。
- `git diff --check` 无输出。

- [ ] **Step 3: 真实生成一个候选产物**

在需求详情选择“生成候选产物”，目标：

```text
prd/ai生成/workbench-safety-candidate.md
```

任务：

```text
根据当前需求和已授权材料，生成一份候选验收清单。只创建目标文件，不修改其他文件，不运行外部发送或发布。
```

Expected:

- App Server 的文件请求在“等待我确认”展示目标与原因。
- 目标清单外请求不能静默通过。
- 同意后仅生成目标文件。
- 运行详情显示 `created`、完整 diff 和最终结果。

- [ ] **Step 4: 真实修改一个专用测试产物**

先创建并登记一个只用于本计划验收的 Markdown 文件，启动“修改已选产物”，要求补充一条边界策略。

Expected:

- Run 启动前快照存在。
- 文件请求只允许命中该已选文件。
- 结束后显示 `modified` diff。
- 工作区已有的其他脏改动保持不变。

- [ ] **Step 5: 验证成功恢复**

点击“恢复本次修改”。

Expected:

- 专用测试产物恢复到 Run 前内容。
- `file_changes.restored_at` 被记录。
- 不执行任何 Git 重置，不触碰其他文件。

- [ ] **Step 6: 验证外部改动冲突**

再次运行修改，在 Run 完成后手工给该文件追加一行，再点击恢复。

Expected:

- API 返回 `409` 风格的冲突错误，指出具体文件 `changed after this run`。
- 用户后来追加的内容仍存在。
- 工作台要求用户检查差异，不提供强制覆盖按钮。

- [ ] **Step 7: 验证取消、超时和刷新恢复**

分别执行：

1. 运行中点击取消。
2. 测试配置将 `runTimeoutMs` 设为 100ms 触发超时。
3. 运行结束后刷新浏览器。

Expected:

- 取消调用精确 `turn/interrupt`，状态为 `cancelled`。
- 超时先调用 `turn/interrupt`，协议无响应时才终止已记录 App Server 进程树。
- 刷新后 Run、事件、审批决定、文件变化和验证结果仍存在。

- [ ] **Step 8: 保存视觉证据**

使用 Playwright 或浏览器分别截图：

```text
test-results/personal-codex-workbench/approval.png
test-results/personal-codex-workbench/file-diff.png
```

Expected: 第一张清晰显示请求类型、目标和允许/拒绝；第二张清晰显示逐文件 diff、验证结果和恢复入口。

- [ ] **Step 9: 提交阶段验收**

```powershell
git add tools/verify-personal-codex-workbench-ui.mjs
git commit -m "test: verify safe Codex file operations"
```

## 最终完成定义

- 只读、生成候选、修改已选产物三种权限在 UI 与服务端一致。
- 每个写入 Run 在 Codex 执行前保存精确目标快照。
- 文件、删除和命令请求都进入真实工作台确认卡；目标外文件不会静默获批。
- 运行结束按文件展示 created/modified/deleted、diff 和验证结果。
- 用户可取消、失败可重试、刷新后记录仍存在。
- 恢复仅处理该 Run 的明确文件；发现 Run 后外部修改时停止，不覆盖用户内容。
- 服务只监听 `127.0.0.1`，校验 Origin、短期令牌、请求体、并发和所有路径。
- 浏览器不能提交任意命令、完整 CLI 参数、任意目录或危险沙箱模式。
- 实现中不存在 `--last`、`danger-full-access`、仓库级重置或自动外发。
