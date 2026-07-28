# Personal Codex Workbench Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在基础只读链路上实现需求级上下文、独立且可续接的 Codex Thread，以及“反馈归纳去重、Demo/PRD 差异与漏洞检查、开发/测试问题转产品策略”三个可落档的高频闭环。

**Architecture:** SQLite 保存需求与 Thread 的一对一映射，Broker 根据需求 ID 决定 `thread/start` 或 `thread/resume`，绝不使用最近会话推断。三个工作流由服务端白名单模板生成提示词和结构化输出约束，浏览器只能选择工作流、授权已登记文件和提交业务输入；结构化结果分别落入需求候选、评审发现和产品策略记录。

**Tech Stack:** Node.js 24、Node Test Runner、SQLite、Codex App Server JSON-RPC、SSE、原生 Web Components-free JavaScript、Playwright Core

---

## 前置条件与文件结构

执行本计划前，必须完整通过：

```powershell
npm run workbench:test
npm run workbench:verify-ui
```

本计划新增或扩展：

```text
workbench/lib/
  context-service.mjs        # 从登记数据构造最小需求上下文
  workflow-catalog.mjs       # 三个工作流的输入、提示词和结果解析
  database.mjs               # Thread、候选需求、评审发现、策略记录
  run-manager.mjs            # 需求级 Thread 续接与结构化结果落档
workbench/
  server.mjs                 # 上下文、工作流与结果 API
workbench/public/
  index.html
  app.js
  styles.css
test/workbench/
  context-service.test.mjs
  workflow-catalog.test.mjs
  thread-isolation.test.mjs
  workflow-api.test.mjs
```

## Task 1: 扩展需求上下文与 Thread 数据模型

**Files:**
- Modify: `workbench/lib/database.mjs`
- Create: `test/workbench/context-service.test.mjs`
- Create: `workbench/lib/context-service.mjs`

- [ ] **Step 1: 写需求上下文失败测试**

Create `test/workbench/context-service.test.mjs`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContextService } from '../../workbench/lib/context-service.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';

test('context only exposes registered artifacts for one requirement', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'context-root-'));
  const store = openDatabase(path.join(os.tmpdir(), `context-${crypto.randomUUID()}.sqlite`));
  store.upsertRequirement({ id: 'REQ-A', title: '广告接入', stage: 'PRD中', externalWait: '无外部等待' });
  store.upsertRequirement({ id: 'REQ-B', title: '云存档月卡', stage: '方案中', externalWait: '等待运营反馈' });
  store.addArtifact({ id: 'ART-A', requirementId: 'REQ-A', kind: 'PRD', path: 'prd/ad.md' });
  store.addArtifact({ id: 'ART-B', requirementId: 'REQ-B', kind: 'Demo', path: 'demos/cloud.html' });
  const service = new ContextService({ store, allowedRoot: root });
  const context = service.getRequirementContext('REQ-A');
  assert.equal(context.requirement.id, 'REQ-A');
  assert.deepEqual(context.artifacts.map(item => item.path), ['prd/ad.md']);
  assert.equal(context.artifacts.some(item => item.path.includes('cloud')), false);
  assert.throws(() => service.authorizeFiles('REQ-A', ['demos/cloud.html']), /not registered/);
  store.close();
});

test('thread binding is stable per requirement and unique across requirements', () => {
  const store = openDatabase(path.join(os.tmpdir(), `thread-${crypto.randomUUID()}.sqlite`));
  store.upsertRequirement({ id: 'REQ-A', title: 'A', stage: 'PRD中', externalWait: '无外部等待' });
  store.upsertRequirement({ id: 'REQ-B', title: 'B', stage: 'PRD中', externalWait: '无外部等待' });
  store.bindRequirementThread('REQ-A', 'thread-a');
  assert.equal(store.getRequirementThread('REQ-A').threadId, 'thread-a');
  assert.throws(() => store.bindRequirementThread('REQ-B', 'thread-a'), /UNIQUE/);
  store.close();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test test/workbench/context-service.test.mjs
```

Expected: FAIL，提示 `ContextService` 或 Thread 仓储方法不存在。

- [ ] **Step 3: 增加 Thread 和结构化结果迁移**

Append to the `migration` string in `workbench/lib/database.mjs`:

```sql
CREATE TABLE IF NOT EXISTS requirement_threads (
  requirement_id TEXT PRIMARY KEY REFERENCES requirements(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workflow_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL CHECK(workflow_type IN ('feedback-triage','demo-prd-review','issue-strategy')),
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS requirement_candidates (
  id TEXT PRIMARY KEY,
  workflow_result_id TEXT NOT NULL REFERENCES workflow_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  evidence TEXT NOT NULL,
  matched_requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  suggested_priority TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待确认'
);
CREATE TABLE IF NOT EXISTS review_findings (
  id TEXT PRIMARY KEY,
  workflow_result_id TEXT NOT NULL REFERENCES workflow_results(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  severity TEXT NOT NULL,
  impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待确认'
);
CREATE TABLE IF NOT EXISTS product_strategies (
  id TEXT PRIMARY KEY,
  workflow_result_id TEXT NOT NULL REFERENCES workflow_results(id) ON DELETE CASCADE,
  essence TEXT NOT NULL,
  main_flow TEXT NOT NULL,
  exception_policy TEXT NOT NULL,
  boundary_policy TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  feishu_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待确认'
);
```

Add these methods inside the returned repository object:

```js
bindRequirementThread(requirementId, threadId) {
  db.prepare(
    `INSERT INTO requirement_threads(requirement_id,thread_id,created_at,last_used_at)
     VALUES(?,?,?,?)`,
  ).run(requirementId, threadId, now(), now());
},
touchRequirementThread(requirementId) {
  db.prepare(`UPDATE requirement_threads SET last_used_at=? WHERE requirement_id=?`)
    .run(now(), requirementId);
},
replaceRequirementThread(requirementId, threadId) {
  db.prepare(
    `UPDATE requirement_threads SET thread_id=?,created_at=?,last_used_at=? WHERE requirement_id=?`,
  ).run(threadId, now(), now(), requirementId);
},
getRequirementThread(requirementId) {
  return db.prepare(
    `SELECT requirement_id AS requirementId,thread_id AS threadId,
            created_at AS createdAt,last_used_at AS lastUsedAt
     FROM requirement_threads WHERE requirement_id=?`,
  ).get(requirementId);
},
saveWorkflowResult(value) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO workflow_results(id,run_id,requirement_id,workflow_type,result_json,created_at)
       VALUES(?,?,?,?,?,?)`,
    ).run(value.id, value.runId, value.requirementId, value.workflowType, JSON.stringify(value.result), now());
    if (value.workflowType === 'feedback-triage') {
      const insert = db.prepare(
        `INSERT INTO requirement_candidates
         (id,workflow_result_id,title,evidence,matched_requirement_id,suggested_priority)
         VALUES(?,?,?,?,?,?)`,
      );
      for (const candidate of value.result.candidates) {
        insert.run(
          crypto.randomUUID(), value.id, candidate.title, candidate.evidence,
          candidate.matchedRequirementId || null, candidate.suggestedPriority,
        );
      }
    }
    if (value.workflowType === 'demo-prd-review') {
      const insert = db.prepare(
        `INSERT INTO review_findings
         (id,workflow_result_id,category,location,severity,impact,recommendation)
         VALUES(?,?,?,?,?,?,?)`,
      );
      for (const finding of value.result.findings) {
        insert.run(
          crypto.randomUUID(), value.id, finding.category, finding.location,
          finding.severity, finding.impact, finding.recommendation,
        );
      }
    }
    if (value.workflowType === 'issue-strategy') {
      db.prepare(
        `INSERT INTO product_strategies
         (id,workflow_result_id,essence,main_flow,exception_policy,boundary_policy,acceptance_criteria,feishu_summary)
         VALUES(?,?,?,?,?,?,?,?)`,
      ).run(
        crypto.randomUUID(), value.id, value.result.essence, value.result.mainFlow,
        value.result.exceptionPolicy, value.result.boundaryPolicy,
        JSON.stringify(value.result.acceptanceCriteria), value.result.feishuSummary,
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
},
getWorkflowResult(runId) {
  const row = db.prepare(
    `SELECT id,run_id AS runId,requirement_id AS requirementId,
            workflow_type AS workflowType,result_json AS resultJson,created_at AS createdAt
     FROM workflow_results WHERE run_id=?`,
  ).get(runId);
  return row ? { ...row, result: JSON.parse(row.resultJson) } : null;
},
listRequirementCandidates() {
  return db.prepare(
    `SELECT c.id,r.requirement_id AS requirementId,c.title,c.evidence,
            c.matched_requirement_id AS matchedRequirementId,
            c.suggested_priority AS suggestedPriority,c.status
     FROM requirement_candidates c
     JOIN workflow_results r ON r.id=c.workflow_result_id
     ORDER BY r.created_at DESC,c.title`,
  ).all();
},
listReviewFindings() {
  return db.prepare(
    `SELECT f.id,r.requirement_id AS requirementId,f.category,f.location,
            f.severity,f.impact,f.recommendation,f.status
     FROM review_findings f
     JOIN workflow_results r ON r.id=f.workflow_result_id
     ORDER BY r.created_at DESC,f.id`,
  ).all();
},
listProductStrategies() {
  return db.prepare(
    `SELECT s.id,r.requirement_id AS requirementId,s.essence,
            s.main_flow AS mainFlow,s.exception_policy AS exceptionPolicy,
            s.boundary_policy AS boundaryPolicy,
            s.acceptance_criteria AS acceptanceCriteriaJson,
            s.feishu_summary AS feishuSummary,s.status
     FROM product_strategies s
     JOIN workflow_results r ON r.id=s.workflow_result_id
     ORDER BY r.created_at DESC`,
  ).all().map(row => ({
    ...row,
    acceptanceCriteria: JSON.parse(row.acceptanceCriteriaJson),
  }));
},
```

Also add at the top of `database.mjs`:

```js
import crypto from 'node:crypto';
```

- [ ] **Step 4: 实现最小上下文服务**

Create `workbench/lib/context-service.mjs`:

```js
import path from 'node:path';
import { assertAuthorizedPath } from './security.mjs';

export class ContextService {
  constructor({ store, allowedRoot }) {
    this.store = store;
    this.allowedRoot = path.resolve(allowedRoot);
  }

  getRequirementContext(requirementId) {
    const requirement = this.store.getRequirement(requirementId);
    if (!requirement) {
      throw Object.assign(new Error('requirement does not exist'), { statusCode: 404 });
    }
    return {
      requirement,
      artifacts: this.store.listArtifacts(requirementId),
      thread: this.store.getRequirementThread(requirementId) || null,
    };
  }

  authorizeFiles(requirementId, requestedPaths) {
    const context = this.getRequirementContext(requirementId);
    const registered = new Map(context.artifacts.map(item => [item.path, item]));
    return [...new Set(requestedPaths || [])].map(relativePath => {
      const artifact = registered.get(relativePath);
      if (!artifact) {
        throw Object.assign(new Error(`File is not registered to requirement: ${relativePath}`), { statusCode: 403 });
      }
      assertAuthorizedPath(this.allowedRoot, path.join(this.allowedRoot, relativePath));
      return artifact;
    });
  }
}
```

- [ ] **Step 5: 运行上下文测试**

Run:

```powershell
node --test test/workbench/context-service.test.mjs
```

Expected: 2 tests PASS。

- [ ] **Step 6: 提交**

```powershell
git add workbench/lib/database.mjs workbench/lib/context-service.mjs test/workbench/context-service.test.mjs
git commit -m "feat: add requirement context and thread records"
```

## Task 2: 定义三个白名单工作流及结构化结果契约

**Files:**
- Create: `test/workbench/workflow-catalog.test.mjs`
- Create: `workbench/lib/workflow-catalog.mjs`

- [ ] **Step 1: 写模板、输入和解析失败测试**

Create `test/workbench/workflow-catalog.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkflowPrompt,
  parseWorkflowResult,
  validateWorkflowInput,
  workflowCatalog,
} from '../../workbench/lib/workflow-catalog.mjs';

test('catalog exposes exactly three first-phase workflows', () => {
  assert.deepEqual(Object.keys(workflowCatalog), [
    'feedback-triage',
    'demo-prd-review',
    'issue-strategy',
  ]);
});

test('feedback workflow requires source text and produces demand candidates', () => {
  assert.throws(() => validateWorkflowInput('feedback-triage', {}), /feedbackText/);
  const prompt = buildWorkflowPrompt('feedback-triage', {
    requirement: { id: 'REQ-001', title: '需求池', stage: '待分析' },
    files: [],
    input: { feedbackText: '启动失败，希望增加修复入口' },
  });
  assert.match(prompt, /合并重复表达/);
  const result = parseWorkflowResult('feedback-triage', `\`\`\`json
  {"themes":[{"name":"启动失败","count":1}],"duplicates":[],"existingMatches":[],"candidates":[{"title":"启动失败修复入口","evidence":"1条反馈","matchedRequirementId":null,"suggestedPriority":"P1"}],"informationGaps":[]}
  \`\`\``);
  assert.equal(result.candidates[0].suggestedPriority, 'P1');
});

test('review and issue workflow reject incomplete structured output', () => {
  assert.throws(() => parseWorkflowResult('demo-prd-review', '{"findings":[]}'), /summary/);
  assert.throws(() => parseWorkflowResult('issue-strategy', '{"essence":"x"}'), /mainFlow/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test test/workbench/workflow-catalog.test.mjs
```

Expected: FAIL，提示工作流目录模块不存在。

- [ ] **Step 3: 实现工作流目录和输入验证**

Create `workbench/lib/workflow-catalog.mjs`:

```js
const priorities = new Set(['P0', 'P1', 'P2', 'P3']);
const severities = new Set(['致命', '严重', '一般', '建议']);

export const workflowCatalog = Object.freeze({
  'feedback-triage': {
    label: '整理反馈并去重',
    permission: 'read-only',
    requiredInput: ['feedbackText'],
  },
  'demo-prd-review': {
    label: '检查 Demo、PRD 差异与漏洞',
    permission: 'read-only',
    requiredInput: [],
    requiredArtifactKinds: ['Demo', 'PRD'],
  },
  'issue-strategy': {
    label: '开发/测试问题转产品策略',
    permission: 'read-only',
    requiredInput: ['issueText'],
  },
});

export function validateWorkflowInput(type, input = {}, artifacts = []) {
  const workflow = workflowCatalog[type];
  if (!workflow) throw Object.assign(new Error('Unknown workflow type'), { statusCode: 400 });
  for (const field of workflow.requiredInput) {
    if (!String(input[field] || '').trim()) {
      throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
    }
  }
  for (const kind of workflow.requiredArtifactKinds || []) {
    if (!artifacts.some(item => item.kind === kind)) {
      throw Object.assign(new Error(`${kind} artifact is required`), { statusCode: 400 });
    }
  }
  return workflow;
}
```

- [ ] **Step 4: 实现服务端提示词**

Append to `workbench/lib/workflow-catalog.mjs`:

```js
const contracts = {
  'feedback-triage': `{
  "themes":[{"name":"主题","count":1}],
  "duplicates":[{"merged":"合并后表达","sources":["原表达"]}],
  "existingMatches":[{"candidate":"候选","requirementId":"REQ-001","reason":"匹配原因"}],
  "candidates":[{"title":"需求候选","evidence":"证据","matchedRequirementId":null,"suggestedPriority":"P1"}],
  "informationGaps":["信息缺口"]
}`,
  'demo-prd-review': `{
  "summary":"总体结论",
  "findings":[{"category":"差异|遗漏|异常|边界","location":"文件和章节或元素","severity":"致命|严重|一般|建议","impact":"影响","recommendation":"修改建议"}]
}`,
  'issue-strategy': `{
  "essence":"问题本质",
  "mainFlow":"主流程策略",
  "exceptionPolicy":"异常策略",
  "boundaryPolicy":"边界策略",
  "documentLocations":["需要修改的位置"],
  "acceptanceCriteria":["可验证条件"],
  "feishuSummary":"可直接复制到飞书群的简短结论"
}`,
};

const instructions = {
  'feedback-triage': '统计反馈主题，合并重复表达，匹配现有需求，生成新需求候选，并指出信息缺口与建议优先级。不得虚构反馈数量。',
  'demo-prd-review': '逐项比较 Demo、PRD 与当前业务规则，检查可定位差异、遗漏、异常和边界。每一项都要给出严重度、影响和应该修改哪个产物。',
  'issue-strategy': '把开发问题或测试异常还原为产品决策，分别给出主流程、异常和边界策略、文档修改位置、验收条件与飞书同步摘要。',
};

export function buildWorkflowPrompt(type, { requirement, files, input }) {
  validateWorkflowInput(type, input, files);
  return [
    '你正在个人产品经理工作台中执行只读分析。不得修改、创建、移动或删除文件。',
    `当前需求：${requirement.id} ${requirement.title}`,
    `当前阶段：${requirement.stage}`,
    `已授权产物：\n${files.map(item => `- [${item.kind}] ${item.path}`).join('\n') || '- 无'}`,
    `任务要求：${instructions[type]}`,
    `业务输入：${JSON.stringify(input, null, 2)}`,
    `只输出一个 JSON 对象，不要输出 Markdown 或解释文字。JSON 结构必须为：\n${contracts[type]}`,
  ].join('\n\n');
}
```

- [ ] **Step 5: 实现严格结果解析**

Append to `workbench/lib/workflow-catalog.mjs`:

```js
function required(object, fields) {
  for (const field of fields) {
    if (!Object.hasOwn(object, field)) throw new Error(`Structured result is missing ${field}`);
  }
}

export function parseWorkflowResult(type, rawText) {
  const normalized = String(rawText || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/, '');
  let value;
  try {
    value = JSON.parse(normalized);
  } catch {
    throw new Error('Codex did not return valid JSON');
  }
  if (type === 'feedback-triage') {
    required(value, ['themes', 'duplicates', 'existingMatches', 'candidates', 'informationGaps']);
    if (!Array.isArray(value.candidates)) throw new Error('candidates must be an array');
    for (const item of value.candidates) {
      required(item, ['title', 'evidence', 'matchedRequirementId', 'suggestedPriority']);
      if (!priorities.has(item.suggestedPriority)) throw new Error('suggestedPriority is invalid');
    }
  } else if (type === 'demo-prd-review') {
    required(value, ['summary', 'findings']);
    if (!Array.isArray(value.findings)) throw new Error('findings must be an array');
    for (const item of value.findings) {
      required(item, ['category', 'location', 'severity', 'impact', 'recommendation']);
      if (!severities.has(item.severity)) throw new Error('severity is invalid');
    }
  } else if (type === 'issue-strategy') {
    required(value, [
      'essence', 'mainFlow', 'exceptionPolicy', 'boundaryPolicy',
      'documentLocations', 'acceptanceCriteria', 'feishuSummary',
    ]);
    if (!Array.isArray(value.acceptanceCriteria)) throw new Error('acceptanceCriteria must be an array');
  } else {
    throw new Error('Unknown workflow type');
  }
  return value;
}
```

- [ ] **Step 6: 运行目录测试**

Run:

```powershell
node --test test/workbench/workflow-catalog.test.mjs
```

Expected: 3 tests PASS。

- [ ] **Step 7: 提交**

```powershell
git add test/workbench/workflow-catalog.test.mjs workbench/lib/workflow-catalog.mjs
git commit -m "feat: define product workflow contracts"
```

## Task 3: 保证需求 Thread 隔离与续接

**Files:**
- Create: `test/workbench/thread-isolation.test.mjs`
- Modify: `workbench/lib/run-manager.mjs`

- [ ] **Step 1: 写并发需求 Thread 失败测试**

Create `test/workbench/thread-isolation.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ContextService } from '../../workbench/lib/context-service.mjs';
import { openDatabase } from '../../workbench/lib/database.mjs';
import { RunManager } from '../../workbench/lib/run-manager.mjs';

class RecordingCodex extends EventEmitter {
  calls = [];
  missingThreads = new Set();
  threadCount = 0;
  turnCount = 0;
  async start() {}
  async request(method, params) {
    this.calls.push({ method, params });
    if (method === 'thread/start') return { thread: { id: `thread-${++this.threadCount}` } };
    if (method === 'thread/resume') {
      if (this.missingThreads.has(params.threadId)) throw new Error('thread not found');
      return { thread: { id: params.threadId } };
    }
    if (method === 'turn/start') return { turn: { id: `turn-${++this.turnCount}` } };
    throw new Error(`Unexpected ${method}`);
  }
}

test('same requirement resumes its exact thread and different requirements never share one', async () => {
  const store = openDatabase(path.join(os.tmpdir(), `isolation-${crypto.randomUUID()}.sqlite`));
  for (const id of ['REQ-A', 'REQ-B']) {
    store.upsertRequirement({ id, title: id, stage: 'PRD中', externalWait: '无外部等待' });
  }
  const codex = new RecordingCodex();
  const root = path.resolve('C:/workspace');
  const manager = new RunManager({
    store,
    codex,
    allowedRoot: root,
    contextService: new ContextService({ store, allowedRoot: root }),
    maxConcurrentRuns: 3,
  });
  await manager.startWorkflowRun({ requirementId: 'REQ-A', workflowType: 'feedback-triage', files: [], input: { feedbackText: 'a' } });
  await manager.startWorkflowRun({ requirementId: 'REQ-B', workflowType: 'feedback-triage', files: [], input: { feedbackText: 'b' } });
  await manager.startWorkflowRun({ requirementId: 'REQ-A', workflowType: 'feedback-triage', files: [], input: { feedbackText: 'c' } });
  assert.deepEqual(store.getRequirementThread('REQ-A').threadId, 'thread-1');
  assert.deepEqual(store.getRequirementThread('REQ-B').threadId, 'thread-2');
  assert.equal(codex.calls.filter(call => call.method === 'thread/start').length, 2);
  assert.equal(codex.calls.filter(call => call.method === 'thread/resume')[0].params.threadId, 'thread-1');
  assert.equal(codex.calls.some(call => JSON.stringify(call).includes('--last')), false);
  store.close();
});

test('missing persisted thread is rebuilt explicitly and recorded', async () => {
  const store = openDatabase(path.join(os.tmpdir(), `thread-rebuild-${crypto.randomUUID()}.sqlite`));
  store.upsertRequirement({ id: 'REQ-A', title: 'A', stage: 'PRD中', externalWait: '无外部等待' });
  const codex = new RecordingCodex();
  const root = path.resolve('C:/workspace');
  const manager = new RunManager({
    store,
    codex,
    allowedRoot: root,
    contextService: new ContextService({ store, allowedRoot: root }),
    maxConcurrentRuns: 2,
  });
  await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'first' },
  });
  codex.missingThreads.add('thread-1');
  const rebuilt = await manager.startWorkflowRun({
    requirementId: 'REQ-A',
    workflowType: 'feedback-triage',
    files: [],
    input: { feedbackText: 'second' },
  });
  assert.equal(store.getRequirementThread('REQ-A').threadId, 'thread-2');
  assert.equal(store.listRunEvents(rebuilt.id)[0].type, 'workbench/thread-rebuilt');
  store.close();
});
```

- [ ] **Step 2: 运行隔离测试确认失败**

Run:

```powershell
node --test test/workbench/thread-isolation.test.mjs
```

Expected: FAIL，提示 `startWorkflowRun` 不存在。

- [ ] **Step 3: 扩展 Run 记录工作流类型**

Add to the `runs` migration in `workbench/lib/database.mjs` through a new idempotent migration executed after the base schema:

```js
const runColumns = db.prepare(`PRAGMA table_info(runs)`).all().map(row => row.name);
if (!runColumns.includes('workflow_type')) {
  db.exec(`ALTER TABLE runs ADD COLUMN workflow_type TEXT`);
}
```

Update `createRun`:

```js
createRun(value) {
  db.prepare(
    `INSERT INTO runs
     (id,requirement_id,prompt,cwd,process_pid,permission,status,workflow_type,started_at)
     VALUES(?,?,?,?,?,?,?,?,?)`,
  ).run(
    value.id, value.requirementId, value.prompt, value.cwd || process.cwd(),
    value.processPid || null, value.permission, value.status,
    value.workflowType || null, now(),
  );
},
```

Include `workflow_type AS workflowType` in `getRun` and `listRuns`.

- [ ] **Step 4: 实现需求级 start/resume 和工作流启动**

Add imports to `workbench/lib/run-manager.mjs`:

```js
import {
  buildWorkflowPrompt,
  parseWorkflowResult,
  validateWorkflowInput,
} from './workflow-catalog.mjs';
```

Add these methods to `RunManager`:

```js
async #requirementThread(requirementId) {
  const existing = this.store.getRequirementThread(requirementId);
  if (existing) {
    try {
      const resumed = await this.codex.request('thread/resume', { threadId: existing.threadId });
      this.store.touchRequirementThread(requirementId);
      return { threadId: resumed.thread.id, rebuilt: false };
    } catch (error) {
      if (!/thread.*(not found|missing|unknown|corrupt)/i.test(error.message)) throw error;
      const replacement = await this.codex.request('thread/start', {
        cwd: this.allowedRoot,
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly' },
      });
      this.store.replaceRequirementThread(requirementId, replacement.thread.id);
      return { threadId: replacement.thread.id, rebuilt: true };
    }
  }
  const started = await this.codex.request('thread/start', {
    cwd: this.allowedRoot,
    approvalPolicy: 'never',
    sandboxPolicy: { type: 'readOnly' },
  });
  this.store.bindRequirementThread(requirementId, started.thread.id);
  return { threadId: started.thread.id, rebuilt: false };
}

async startWorkflowRun({ requirementId, workflowType, files, input }) {
  if (!this.contextService) throw new Error('ContextService is required for workflow runs');
  if (this.store.countActiveRuns() >= this.maxConcurrentRuns) {
    throw Object.assign(new Error('Concurrent run limit reached'), { statusCode: 429 });
  }
  const context = this.contextService.getRequirementContext(requirementId);
  const artifacts = this.contextService.authorizeFiles(requirementId, files);
  validateWorkflowInput(workflowType, input, artifacts);
  const prompt = buildWorkflowPrompt(workflowType, {
    requirement: context.requirement,
    files: artifacts,
    input,
  });
  const id = `RUN-${crypto.randomUUID()}`;
  this.store.createRun({
    id,
    requirementId,
    prompt,
    cwd: this.allowedRoot,
    permission: 'read-only',
    status: 'running',
    workflowType,
  });
  this.store.saveRunContext(id, {
    files: artifacts.map(item => item.path),
    input: { workflowType, workflowInput: input },
  });
  try {
    await this.codex.start();
    const { threadId, rebuilt } = await this.#requirementThread(requirementId);
    if (rebuilt) {
      this.store.appendRunEvent(id, 'workbench/thread-rebuilt', {
        message: '原 Codex Thread 不可恢复，已创建新 Thread；本轮上下文由需求和授权文件重建。',
      });
    }
    const turnResult = await this.codex.request('turn/start', {
      threadId,
      cwd: this.allowedRoot,
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'readOnly' },
      input: [{ type: 'text', text: prompt }],
    });
    const turnId = turnResult.turn.id;
    this.store.bindProtocolIds(id, threadId, turnId, this.codex.pid?.() || null);
    this.activeByTurn.set(turnId, { runId: id, text: '', workflowType, requirementId });
    return this.store.getRun(id);
  } catch (error) {
    this.store.finishRun(id, 'failed', null, error.message);
    throw error;
  }
}
```

Replace the `RunManager` constructor with:

```js
constructor({
  store,
  codex,
  allowedRoot,
  maxConcurrentRuns = 1,
  contextService = null,
}) {
  this.store = store;
  this.codex = codex;
  this.allowedRoot = path.resolve(allowedRoot);
  this.maxConcurrentRuns = maxConcurrentRuns;
  this.contextService = contextService;
  this.activeByTurn = new Map();
  this.codex.on('notification', message => this.#onNotification(message));
}
```

In the `turn/completed` branch, replace completion handling with:

```js
if (message.method === 'turn/completed') {
  const failed = message.params.turn?.status !== 'completed';
  if (failed) {
    this.store.finishRun(active.runId, 'failed', null, `Codex turn ended with ${message.params.turn?.status || 'unknown status'}`);
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
      this.store.finishRun(active.runId, 'failed', active.text || null, `Structured result rejected: ${error.message}`);
    }
  } else {
    this.store.finishRun(active.runId, 'completed', active.text || null);
  }
  this.activeByTurn.delete(turnId);
}
```

In `startReadOnlyRun`, replace authorization and thread creation with the following so free-form follow-ups obey the same requirement Thread isolation:

```js
const authorizedFiles = requirementId
  ? this.contextService.authorizeFiles(requirementId, files).map(item => item.path)
  : [...new Set(files || [])].map(relativePath => {
      const absolute = assertAuthorizedPath(this.allowedRoot, path.join(this.allowedRoot, relativePath));
      return path.relative(this.allowedRoot, absolute).split(path.sep).join('/');
    });
```

Replace its direct `thread/start` call with:

```js
const threadState = requirementId
  ? await this.#requirementThread(requirementId)
  : (await this.codex.request('thread/start', {
      cwd: this.allowedRoot,
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'readOnly' },
    })).thread;
const threadId = threadState.threadId || threadState.id;
if (threadState.rebuilt) {
  this.store.appendRunEvent(id, 'workbench/thread-rebuilt', {
    message: '原 Codex Thread 不可恢复，已创建新 Thread；本轮上下文由需求和授权文件重建。',
  });
}
```

Keep the existing `turn/start`, `saveRunContext` and `bindProtocolIds` calls, but remove the old `const threadId = threadResult.thread.id` declaration.

- [ ] **Step 5: 运行隔离与回归测试**

Run:

```powershell
node --test test/workbench/thread-isolation.test.mjs
npm run workbench:test
```

Expected: 隔离测试 PASS；既有基础测试全部 PASS。

- [ ] **Step 6: 提交**

```powershell
git add test/workbench/thread-isolation.test.mjs workbench/lib/run-manager.mjs workbench/lib/database.mjs
git commit -m "feat: isolate Codex threads by requirement"
```

## Task 4: 暴露工作流 API 并验证落档

**Files:**
- Create: `test/workbench/workflow-api.test.mjs`
- Modify: `workbench/server.mjs`

- [ ] **Step 1: 写工作流 API 失败测试**

Create `test/workbench/workflow-api.test.mjs`:

```js
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWorkbenchServer } from '../../workbench/server.mjs';

class FakeCodex extends EventEmitter {
  count = 0;
  async start() {}
  diagnostics() { return { running: true, stderr: '' }; }
  async stop() {}
  async request(method, params) {
    if (method === 'thread/start') return { thread: { id: 'thread-workflow' } };
    if (method === 'turn/start') return { turn: { id: `turn-${++this.count}` } };
    if (method === 'thread/resume') return { thread: { id: params.threadId } };
    throw new Error(method);
  }
}

test('workflow endpoint starts a whitelisted read-only run', async t => {
  const root = path.join(os.tmpdir(), `workflow-api-${crypto.randomUUID()}`);
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
  const bootstrap = await (await fetch(`${base}/api/bootstrap`, { headers })).json();
  const requirementId = bootstrap.requirements[0].id;
  const response = await fetch(`${base}/api/workflows/feedback-triage/runs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requirementId, files: [], input: { feedbackText: '启动失败' } }),
  });
  assert.equal(response.status, 202);
  assert.equal((await response.json()).workflowType, 'feedback-triage');
});
```

- [ ] **Step 2: 运行 API 测试确认失败**

Run:

```powershell
node --test test/workbench/workflow-api.test.mjs
```

Expected: FAIL，工作流路由返回 `404`。

- [ ] **Step 3: 注入上下文服务**

Add import in `workbench/server.mjs`:

```js
import { ContextService } from './lib/context-service.mjs';
import { workflowCatalog } from './lib/workflow-catalog.mjs';
```

Replace RunManager construction with:

```js
const contextService = new ContextService({ store, allowedRoot: config.allowedRoot });
const runs = new RunManager({
  store,
  codex,
  allowedRoot: config.allowedRoot,
  contextService,
  maxConcurrentRuns: config.maxConcurrentRuns,
});
```

- [ ] **Step 4: 增加上下文、目录、启动和结果 API**

Add before the API `404` branch in `workbench/server.mjs`:

```js
if (request.method === 'GET' && url.pathname === '/api/workflows') {
  return sendJson(response, 200, Object.entries(workflowCatalog).map(([id, value]) => ({
    id,
    label: value.label,
    permission: value.permission,
  })));
}
const contextMatch = url.pathname.match(/^\/api\/requirements\/([^/]+)\/context$/);
if (request.method === 'GET' && contextMatch) {
  return sendJson(response, 200, contextService.getRequirementContext(decodeURIComponent(contextMatch[1])));
}
const workflowMatch = url.pathname.match(/^\/api\/workflows\/([^/]+)\/runs$/);
if (request.method === 'POST' && workflowMatch) {
  const workflowType = decodeURIComponent(workflowMatch[1]);
  const body = await readJsonBody(request, config.maxBodyBytes);
  const run = await runs.startWorkflowRun({ ...body, workflowType });
  return sendJson(response, 202, run);
}
const resultMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/workflow-result$/);
if (request.method === 'GET' && resultMatch) {
  const result = store.getWorkflowResult(decodeURIComponent(resultMatch[1]));
  return result
    ? sendJson(response, 200, result)
    : sendJson(response, 404, { error: 'Workflow result not found' });
}
```

Also add these three arrays to the existing `/api/bootstrap` payload:

```js
requirementCandidates: store.listRequirementCandidates(),
reviewFindings: store.listReviewFindings(),
productStrategies: store.listProductStrategies(),
```

- [ ] **Step 5: 运行 API 与全量测试**

Run:

```powershell
node --test test/workbench/workflow-api.test.mjs
npm run workbench:test
```

Expected: 工作流 API 测试 PASS，全量测试无回归。

- [ ] **Step 6: 提交**

```powershell
git add test/workbench/workflow-api.test.mjs workbench/server.mjs
git commit -m "feat: expose product workflow APIs"
```

## Task 5: 在需求详情中提供三个最短操作路径

**Files:**
- Modify: `workbench/public/index.html`
- Modify: `workbench/public/styles.css`
- Modify: `workbench/public/app.js`
- Modify: `tools/verify-personal-codex-workbench-ui.mjs`

- [ ] **Step 1: 先扩展静态契约**

Add required tokens in `tools/verify-personal-codex-workbench-ui.mjs`:

```js
'整理反馈并去重',
'检查 Demo、PRD 差异与漏洞',
'开发/测试问题转产品策略',
'data-workflow',
'workflowResult',
```

Run:

```powershell
npm run workbench:verify-ui
```

Expected: FAIL，提示缺少第一个新工作流 token。

- [ ] **Step 2: 增加需求上下文和工作流表单**

Replace the requirement page section in `workbench/public/index.html` with:

```html
<section class="page" data-page-panel="requirements">
  <h1>需求中心</h1>
  <div class="requirements-layout">
    <div id="requirementList" class="stack"></div>
    <section id="requirementDetail" class="panel">
      <h2>选择一个需求</h2>
      <p>选择后查看阶段、外部等待、登记产物、历史 Thread 和快捷动作。</p>
    </section>
  </div>
</section>
```

Replace the planning and review placeholder sections with persisted workflow landing zones:

```html
<section class="page" data-page-panel="planning">
  <h1>规划中心</h1><p>需求来源、需求池、版本容量和插单影响。</p>
  <section class="panel"><h2>AI整理后的需求候选</h2><div id="requirementCandidates" class="stack"></div></section>
</section>
<section class="page" data-page-panel="review">
  <h1>评审与验收</h1>
  <div class="grid two">
    <section class="panel"><h2>Demo/PRD 差异与漏洞</h2><div id="reviewFindings" class="stack"></div></section>
    <section class="panel"><h2>开发/测试产品策略</h2><div id="productStrategies" class="stack"></div></section>
  </div>
</section>
```

Add a single-user task-note dialog before `#codexDrawer`:

```html
<dialog id="manualTaskDialog" aria-labelledby="manualTaskTitle">
  <form id="manualTaskForm" class="drawer-body">
    <h2 id="manualTaskTitle">记录产品专员任务</h2>
    <label>分派备注对象<select id="manualTaskAssignee"><option>产品专员A</option><option>产品专员B</option></select></label>
    <label>事项说明<textarea id="manualTaskDescription" required></textarea></label>
    <label>截止时间<input id="manualTaskDue" type="date"></label>
    <label>期望交付物<input id="manualTaskDeliverable" required></label>
    <label>当前备注<textarea id="manualTaskNote"></textarea></label>
    <div class="run-actions">
      <button class="button" type="button" data-action="close-manual-task">取消</button>
      <button class="button primary" type="submit">保存记录</button>
    </div>
  </form>
</dialog>
```

Add inside `#codexDrawer .drawer-body`, before the task textarea:

```html
<fieldset id="workflowPicker">
  <legend>场景快捷动作</legend>
  <button type="button" data-workflow="feedback-triage">整理反馈并去重</button>
  <button type="button" data-workflow="demo-prd-review">检查 Demo、PRD 差异与漏洞</button>
  <button type="button" data-workflow="issue-strategy">开发/测试问题转产品策略</button>
</fieldset>
<label id="businessInputLabel">业务输入<textarea id="businessInput" rows="5" placeholder="粘贴反馈、开发问题或测试异常"></textarea></label>
<section id="workflowResult" class="workflow-result" aria-live="polite"></section>
```

- [ ] **Step 3: 增加详情和工作流样式**

Append to `workbench/public/styles.css`:

```css
.requirements-layout{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:16px;margin-top:18px}
#workflowPicker{display:grid;grid-template-columns:1fr;gap:8px;border:1px solid var(--line);border-radius:10px;padding:12px}
#workflowPicker button{min-height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;text-align:left;padding:0 12px}
#workflowPicker button.selected{border-color:var(--brand);background:#eef3ff;color:var(--brand-dark)}
.artifact-list,.workflow-result{display:grid;gap:8px}.artifact-option{display:flex;align-items:center;gap:8px}.workflow-result article{border-left:3px solid var(--brand);background:#f7f9fd;padding:10px 12px}
@media(max-width:760px){.requirements-layout{grid-template-columns:1fr}}
```

- [ ] **Step 4: 加载需求上下文并只允许选择登记文件**

Replace `selectRequirement` in `workbench/public/app.js` with:

```js
async function selectRequirement(id) {
  state.selectedRequirementId = id;
  const context = await api(`/api/requirements/${encodeURIComponent(id)}/context`);
  const requirement = context.requirement;
  text(document.querySelector('#contextRequirement'), `${requirement.id} · ${requirement.title}`);
  text(document.querySelector('#contextThread'), context.thread?.threadId || '首次运行时创建');
  const detail = document.querySelector('#requirementDetail');
  const heading = document.createElement('h2');
  const meta = document.createElement('p');
  const stageSelect = document.createElement('select');
  const waitSelect = document.createElement('select');
  const artifacts = document.createElement('div');
  const addManualTask = document.createElement('button');
  heading.textContent = requirement.title;
  meta.textContent = `阶段：${requirement.stage} · 外部等待：${requirement.externalWait} · Thread：${context.thread?.threadId || '首次运行时创建'}`;
  for (const value of [
    '待分析','需求池','已规划','方案中','Demo中','PRD中','待外部确认',
    '待评审','开发中','测试中','待验收','待上线','效果观察','已归档',
  ]) stageSelect.add(new Option(value, value, value === requirement.stage, value === requirement.stage));
  stageSelect.setAttribute('aria-label', '手动调整需求阶段');
  for (const value of [
    '等待产品专员','等待运营反馈','等待领导确认',
    '等待研发补充','等待测试结果','无外部等待',
  ]) waitSelect.add(new Option(value, value, value === requirement.externalWait, value === requirement.externalWait));
  waitSelect.setAttribute('aria-label', '手动调整外部等待');
  addManualTask.className = 'button';
  addManualTask.textContent = '记录产品专员任务';
  addManualTask.addEventListener('click', () => {
    document.querySelector('#manualTaskDialog').showModal();
    document.querySelector('#manualTaskDescription').focus();
  });
  const saveRequirement = async () => {
    const updated = await api(`/api/requirements/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage: stageSelect.value, externalWait: waitSelect.value }),
    });
    state.requirements = state.requirements.map(item => item.id === id ? updated : item);
    render();
  };
  stageSelect.addEventListener('change', () => saveRequirement().catch(error => text(meta, error.message)));
  waitSelect.addEventListener('change', () => saveRequirement().catch(error => text(meta, error.message)));
  artifacts.className = 'artifact-list';
  for (const artifact of context.artifacts) {
    const label = document.createElement('label');
    label.className = 'artifact-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = artifact.path;
    checkbox.dataset.artifactKind = artifact.kind;
    const caption = document.createElement('span');
    caption.textContent = `[${artifact.kind}] ${artifact.path}`;
    label.append(checkbox, caption);
    artifacts.append(label);
  }
  detail.replaceChildren(heading, meta, stageSelect, waitSelect, addManualTask, artifacts);
  document.querySelector('#authorizedFiles').value = context.artifacts.map(item => item.path).join('\n');
}
```

Change requirement click handlers to:

```js
card.addEventListener('click', () => selectRequirement(requirement.id).catch(error => {
  text(document.querySelector('#requirementDetail'), error.message);
}));
```

- [ ] **Step 5: 实现工作流选择、运行和结构化展示**

Add state:

```js
selectedWorkflow: null,
requirementCandidates: [],
reviewFindings: [],
productStrategies: [],
```

Add functions:

```js
function selectWorkflow(type) {
  state.selectedWorkflow = type;
  document.querySelectorAll('[data-workflow]').forEach(button => {
    button.classList.toggle('selected', button.dataset.workflow === type);
  });
  const examples = {
    'feedback-triage': '粘贴用户、运营或三方反馈',
    'demo-prd-review': '可补充本次重点检查的业务规则',
    'issue-strategy': '粘贴开发问题或测试异常',
  };
  document.querySelector('#businessInput').placeholder = examples[type];
}

function workflowInput(type, textValue) {
  if (type === 'feedback-triage') return { feedbackText: textValue };
  if (type === 'issue-strategy') return { issueText: textValue };
  return { businessRules: textValue };
}

function renderWorkflowResult(value) {
  const target = document.querySelector('#workflowResult');
  const result = value.result;
  const rows = value.workflowType === 'feedback-triage'
    ? result.candidates.map(item => `${item.suggestedPriority} · ${item.title} · ${item.evidence}`)
    : value.workflowType === 'demo-prd-review'
      ? result.findings.map(item => `${item.severity} · ${item.location} · ${item.recommendation}`)
      : [
          `问题本质：${result.essence}`,
          `主流程：${result.mainFlow}`,
          `异常：${result.exceptionPolicy}`,
          `边界：${result.boundaryPolicy}`,
          `飞书摘要：${result.feishuSummary}`,
        ];
  target.replaceChildren(...rows.map(row => {
    const article = document.createElement('article');
    article.textContent = row;
    return article;
  }));
}
```

At the end of the main `render()` function, render the persisted landing records with text nodes:

```js
const cards = values => values.map(value => {
  const article = document.createElement('article');
  article.className = 'card';
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  title.textContent = value.title;
  detail.textContent = value.detail;
  article.append(title, detail);
  return article;
});
document.querySelector('#requirementCandidates').replaceChildren(...cards(
  state.requirementCandidates.map(item => ({
    title: `${item.suggestedPriority} · ${item.title}`,
    detail: `${item.evidence} · ${item.status}`,
  })),
));
document.querySelector('#reviewFindings').replaceChildren(...cards(
  state.reviewFindings.map(item => ({
    title: `${item.severity} · ${item.location}`,
    detail: `${item.impact} · ${item.recommendation}`,
  })),
));
document.querySelector('#productStrategies').replaceChildren(...cards(
  state.productStrategies.map(item => ({
    title: item.essence,
    detail: `${item.mainFlow} · ${item.feishuSummary}`,
  })),
));
```

Whenever `/api/bootstrap` is loaded, including initial load and Run completion, assign:

```js
state.requirementCandidates = bootstrap.requirementCandidates;
state.reviewFindings = bootstrap.reviewFindings;
state.productStrategies = bootstrap.productStrategies;
```

Replace `startRun` with:

```js
async function startRun() {
  if (!state.selectedRequirementId) throw new Error('请先选择需求');
  const files = document.querySelector('#authorizedFiles').value
    .split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  const inputText = document.querySelector('#businessInput').value.trim();
  const freeformPrompt = document.querySelector('#prompt').value.trim();
  const run = state.selectedWorkflow
    ? await api(`/api/workflows/${state.selectedWorkflow}/runs`, {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          files,
          input: workflowInput(state.selectedWorkflow, inputText),
        }),
      })
    : await api('/api/runs', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: state.selectedRequirementId,
          prompt: freeformPrompt,
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
    const finished = JSON.parse(event.data);
    text(document.querySelector('#drawerRunStatus'), finished.status);
    events.close();
    if (finished.status === 'completed' && state.selectedWorkflow) {
      renderWorkflowResult(await api(`/api/runs/${encodeURIComponent(run.id)}/workflow-result`));
    } else if (finished.status === 'completed') {
      text(output, finished.result || output.textContent);
    } else {
      text(output, finished.error || '任务失败');
    }
    const bootstrap = await api('/api/bootstrap');
    state.runs = bootstrap.runs;
    render();
  });
}
```

Wire the workflow buttons:

```js
document.querySelector('#workflowPicker').addEventListener('click', event => {
  const button = event.target.closest('[data-workflow]');
  if (button) selectWorkflow(button.dataset.workflow);
});
```

Wire manual task creation and manual completion; these actions only update the owner's notes and never create another login or approval flow:

```js
document.querySelector('[data-action="close-manual-task"]').addEventListener('click', () => {
  document.querySelector('#manualTaskDialog').close();
});
document.querySelector('#manualTaskForm').addEventListener('submit', async event => {
  event.preventDefault();
  const created = await api('/api/manual-tasks', {
    method: 'POST',
    body: JSON.stringify({
      requirementId: state.selectedRequirementId,
      assigneeNote: document.querySelector('#manualTaskAssignee').value,
      description: document.querySelector('#manualTaskDescription').value,
      dueAt: document.querySelector('#manualTaskDue').value || null,
      expectedDeliverable: document.querySelector('#manualTaskDeliverable').value,
      currentNote: document.querySelector('#manualTaskNote').value,
    }),
  });
  state.manualTasks.unshift(created);
  document.querySelector('#manualTaskDialog').close();
  event.target.reset();
  render();
});
```

In the `manualTaskNotes` card renderer from the foundation plan, append a manual status button:

```js
const complete = document.createElement('button');
complete.className = 'button';
complete.textContent = task.status === '已完成' ? '已完成' : '标记完成';
complete.disabled = task.status === '已完成';
complete.addEventListener('click', async () => {
  const updated = await api(`/api/manual-tasks/${encodeURIComponent(task.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: '已完成' }),
  });
  state.manualTasks = state.manualTasks.map(item => item.id === updated.id ? updated : item);
  render();
});
card.append(complete);
```

- [ ] **Step 6: 运行静态与浏览器验证**

Run:

```powershell
npm run workbench:verify-ui
```

Expected: PASS；需求详情可选择登记产物，三个工作流入口都可聚焦和点击，375px 无横向滚动。

- [ ] **Step 7: 提交**

```powershell
git add workbench/public tools/verify-personal-codex-workbench-ui.mjs
git commit -m "feat: add three product workflow shortcuts"
```

## Task 6: 真实验收三个闭环与 Thread 隔离

**Files:**
- Modify: `tools/verify-personal-codex-workbench-ui.mjs`
- Test output: `test-results/personal-codex-workbench/workflows.png`

- [ ] **Step 1: 增加浏览器 Thread 与工作流状态断言**

In the Playwright section of `tools/verify-personal-codex-workbench-ui.mjs`, add:

```js
await page.locator('[data-page="requirements"]').click();
const firstRequirement = page.locator('[data-requirement-id]').first();
await firstRequirement.click();
await page.locator('#askCodex').click();
assert.equal(await page.locator('[data-workflow]').count(), 3);
await page.locator('[data-workflow="feedback-triage"]').click();
assert.equal(
  await page.locator('[data-workflow="feedback-triage"]').getAttribute('class'),
  'selected',
);
assert.match(await page.locator('#contextRequirement').innerText(), /REQ-/);
await page.screenshot({
  path: path.join(root, 'test-results/personal-codex-workbench/workflows.png'),
  fullPage: true,
});
```

- [ ] **Step 2: 运行所有自动测试**

Run:

```powershell
npm run workbench:test
npm run workbench:verify-ui
rg -n -- "--last|danger-full-access" workbench
git diff --check
```

Expected:

- 全部单元与 API 测试 PASS。
- UI 验证 PASS 并生成 `workflows.png`。
- `rg` 无匹配。
- `git diff --check` 无输出。

- [ ] **Step 3: 真实执行反馈归纳**

选择一个需求，运行“整理反馈并去重”，业务输入：

```text
1. 启动失败后找不到修复入口。
2. 游戏打不开时希望能一键修复。
3. 希望启动失败页面告诉我下一步怎么做。
```

Expected: 返回主题、重复项、已有需求匹配、需求候选、信息缺口和 P0-P3 建议；候选写入 `requirement_candidates`，但不会自动进入正式需求池。

- [ ] **Step 4: 真实执行 Demo/PRD 检查**

在同一需求登记并选择一个 `Demo` 与一个 `PRD`，运行“检查 Demo、PRD 差异与漏洞”。

Expected: 每个发现都有类别、文件/章节位置、严重度、影响和修改建议；结果写入 `review_findings`，不修改两个文件。

- [ ] **Step 5: 真实执行问题转策略**

业务输入：

```text
测试发现广告接口返回空数组时，页面会留下一个空白卡槽；研发询问是保留占位、重试还是直接移除。
```

Expected: 返回问题本质、主流程、异常、边界、文档位置、可验证验收条件和飞书摘要；结果写入 `product_strategies`。

- [ ] **Step 6: 验证 Thread 关系**

从数据库执行：

```powershell
@'
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(".workbench-data/workbench.sqlite");
const rows = db.prepare("SELECT requirement_id,thread_id FROM requirement_threads ORDER BY requirement_id").all();
console.log(JSON.stringify(rows, null, 2));
'@ | node -
```

Expected:

- 同一需求的三次运行只有一个明确 `thread_id`。
- 另一个需求首次运行后获得不同 `thread_id`。
- 没有通过“最近会话”建立关联。

- [ ] **Step 7: 提交阶段验收**

```powershell
git add tools/verify-personal-codex-workbench-ui.mjs
git commit -m "test: verify personal Codex workflow loops"
```

## 阶段完成定义

- 三个且仅三个首期高频工作流可从需求详情进入。
- 当前需求、登记产物和历史 Thread 自动成为上下文，用户可取消文件授权。
- 不同需求使用不同 Thread，同一需求通过明确 ID 续接。
- 三个工作流都是真实 App Server 调用，不是前端预置答案。
- 所有结果通过服务端契约解析；解析失败显示真实错误和原始输出，不伪装为成功。
- 反馈候选、评审发现和产品策略分别落档，但不会自动改变正式需求阶段。
- 全阶段仍为 `read-only`，不修改业务文件。
