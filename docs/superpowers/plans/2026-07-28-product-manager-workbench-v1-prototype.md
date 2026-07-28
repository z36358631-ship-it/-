# Product Manager Workbench V1 Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-fidelity, locally runnable V1 prototype that validates the product manager workbench’s unified inbox, planning, requirement execution, review/acceptance, embedded team/AI collaboration, and visual direction.

**Architecture:** Create one dependency-free HTML demo with inline CSS, seed data, state management, rendering, and event delegation so it can be opened directly from disk. Use a static contract test for structure and JavaScript syntax, plus a `playwright-core` browser test against local Chrome for user flows, responsive behavior, and screenshots. Treat `demos/后台管理/admin-运营数据看板v2.html` as a read-only visual reference.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, Node.js built-ins, `playwright-core`, local Google Chrome.

---

## Scope Boundary

This plan produces a testable product prototype, not the production collaboration service.

Included:

- Six-page information architecture with four complete V1 pages;
- Unified “待我处理” queue;
- Requirement source inbox, demand pool, release planning, and insertion impact;
- Three execution paths and requirement detail;
- Product specialist and AI assignment inside a requirement;
- Review, test exception, acceptance, and release gates;
- Lightweight data/team pages and global search;
- Local state persistence and reset;
- Desktop and narrow-screen behavior;
- Automated static and browser verification.

Excluded from this plan:

- Login, server-side permissions, database, and multi-user synchronization;
- Real AI model calls;
- Real Feishu, Git, testing platform, or BI connections;
- Production deployment;
- Automatic publication, external sending, deletion, or permission changes.

These excluded systems require separate specs and plans after the prototype is validated.

## File Map

| File | Responsibility |
|---|---|
| `demos/产品经理全生命周期工作台demo.html` | Complete portable prototype: visual system, seed data, views, state, and interactions |
| `tools/verify-product-manager-workbench.mjs` | Static structure, content-contract, and inline JavaScript syntax verification |
| `tools/verify-product-manager-workbench-ui.mjs` | Browser flows, responsive checks, accessibility smoke checks, and screenshot capture |
| `test-results/product-manager-workbench/home.png` | Generated desktop evidence for the unified inbox |
| `test-results/product-manager-workbench/planning.png` | Generated desktop evidence for planning and insertion impact |
| `test-results/product-manager-workbench/requirement.png` | Generated desktop evidence for requirement detail and collaboration |
| `test-results/product-manager-workbench/review.png` | Generated desktop evidence for review and acceptance |
| `test-results/product-manager-workbench/narrow.png` | Generated narrow-screen evidence |

Do not modify:

- `demos/后台管理/admin-运营数据看板v2.html`;
- unrelated existing demos, PRDs, tests, or user changes.

## Task 1: Create the Static Contract Test

**Files:**

- Create: `tools/verify-product-manager-workbench.mjs`
- Test: `tools/verify-product-manager-workbench.mjs`

- [ ] **Step 1: Create a failing structure and syntax test**

```js
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'demos', '产品经理全生命周期工作台demo.html');

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function pass(name) {
  console.log(`PASS ${name}`);
}

assert(fs.existsSync(htmlPath), `Missing demo: ${htmlPath}`);
const html = fs.readFileSync(htmlPath, 'utf8');

function shell() {
  for (const token of [
    '产品工作台',
    'data-page="home"',
    'data-page="planning"',
    'data-page="requirements"',
    'data-page="review"',
    'data-page="data"',
    'data-page="team"',
    'id="globalSearch"',
    'data-action="new-requirement"',
    'data-action="reset-demo"',
  ]) {
    assert(html.includes(token), `Missing shell token: ${token}`);
  }
  pass('shell');
}

function domain() {
  for (const token of [
    'APP-2026.8',
    'MAC-2026.8',
    'Android广告接入',
    'iOS应用与IPA资源库',
    '云存档月卡插单',
    '快速需求',
    '专员执行',
    '完整需求',
  ]) {
    assert(html.includes(token), `Missing domain token: ${token}`);
  }
  pass('domain');
}

function workflow() {
  for (const token of [
    '待我处理',
    '需求来源',
    '需求池',
    '版本规划',
    '插单影响',
    '业务流与规则',
    '产物与任务',
    '评审与验收',
    '下一责任人',
    '唯一审批人',
  ]) {
    assert(html.includes(token), `Missing workflow token: ${token}`);
  }
  pass('workflow');
}

function accessibility() {
  assert(html.includes('aria-label="全局搜索"'), 'Global search label missing');
  assert(html.includes('class="skip-link"'), 'Skip link missing');
  assert(html.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion rule missing');
  assert(html.includes(':focus-visible'), 'Visible focus rule missing');
  pass('accessibility');
}

function syntax() {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert(scripts.length === 1, `Expected 1 inline script, found ${scripts.length}`);
  scripts.forEach((code, index) => new vm.Script(code, { filename: `workbench-inline-${index}.js` }));
  pass('syntax');
}

const mode = process.argv[2] || 'all';
const tasks = { shell, domain, workflow, accessibility, syntax };
if (mode === 'all') Object.values(tasks).forEach(task => task());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);
```

- [ ] **Step 2: Run the test and confirm the demo is missing**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs shell
```

Expected: FAIL with `Missing demo`.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- tools/verify-product-manager-workbench.mjs
git commit -m "test: define product workbench prototype contract"
```

## Task 2: Build the Visual Shell and Navigation

**Files:**

- Create: `demos/产品经理全生命周期工作台demo.html`
- Test: `tools/verify-product-manager-workbench.mjs`

- [ ] **Step 1: Create the semantic page shell**

Create the document with this structure:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>产品经理全生命周期工作台</title>
  <style>
    :root {
      --primary: #3b82f6;
      --primary-dark: #1d4ed8;
      --primary-light: #eff6ff;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --purple: #8b5cf6;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --text-2: #475569;
      --text-3: #94a3b8;
      --border: #e2e8f0;
      --radius: 12px;
      --shadow-md: 0 4px 12px rgba(15, 23, 42, .08);
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      --mono: "DIN Alternate", "Roboto Mono", Menlo, monospace;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body { background: var(--bg); color: var(--text); font: 14px/1.5 var(--font); }
    button, input, select, textarea { font: inherit; }
    button, [role="button"], .nav-item { cursor: pointer; }
    :focus-visible { outline: 3px solid rgba(59, 130, 246, .35); outline-offset: 2px; }
    .skip-link { position: fixed; left: 12px; top: -48px; z-index: 1000; padding: 8px 12px; background: var(--text); color: white; border-radius: 6px; }
    .skip-link:focus { top: 12px; }
    .layout { display: flex; min-height: 100vh; }
    .sidebar { position: fixed; inset: 0 auto 0 0; width: 220px; display: flex; flex-direction: column; background: var(--surface); border-right: 1px solid var(--border); z-index: 30; }
    .brand { display: flex; align-items: center; gap: 10px; padding: 20px; color: var(--primary); font-weight: 700; }
    .brand-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: white; background: linear-gradient(135deg, var(--primary), var(--purple)); }
    .nav { flex: 1; padding: 0 8px; }
    .nav-title { padding: 10px 12px 6px; color: var(--text-3); font-size: 11px; font-weight: 700; letter-spacing: .5px; }
    .nav-item { width: 100%; display: flex; align-items: center; gap: 10px; margin: 2px 0; padding: 9px 12px; border: 0; border-radius: 8px; color: var(--text-2); background: transparent; text-align: left; }
    .nav-item:hover { background: var(--primary-light); color: var(--primary); }
    .nav-item.active { color: white; background: var(--primary); box-shadow: 0 2px 8px rgba(59, 130, 246, .28); }
    .profile { padding: 16px; border-top: 1px solid var(--border); color: var(--text-2); }
    .main { min-width: 0; margin-left: 220px; width: calc(100% - 220px); }
    .topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 24px; background: rgba(255,255,255,.96); border-bottom: 1px solid var(--border); }
    .breadcrumb { color: var(--text-3); white-space: nowrap; }
    .search { flex: 1; max-width: 520px; margin-left: auto; }
    .search input { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; color: var(--text); background: var(--bg); }
    .btn { min-height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text-2); }
    .btn:hover { border-color: var(--primary); color: var(--primary); }
    .btn.primary { color: white; border-color: var(--primary); background: var(--primary); }
    .content { padding: 20px 24px 40px; }
    .page { display: none; }
    .page.active { display: block; }
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    .page-head h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.3; }
    .page-head p { margin: 0; color: var(--text-3); }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
    .panel-title { font-size: 15px; font-weight: 700; }
    .panel-body { padding: 16px 18px; }
    .empty { padding: 32px; color: var(--text-3); text-align: center; }
    @media (max-width: 1024px) {
      .sidebar { width: 72px; }
      .brand span:last-child, .nav-item span:last-child, .nav-title, .profile { display: none; }
      .brand { padding: 20px; }
      .nav-item { justify-content: center; }
      .main { margin-left: 72px; width: calc(100% - 72px); }
    }
    @media (max-width: 720px) {
      .sidebar { width: 64px; }
      .main { margin-left: 64px; width: calc(100% - 64px); }
      .topbar { padding: 8px 12px; flex-wrap: wrap; }
      .breadcrumb { display: none; }
      .search { order: 3; flex-basis: 100%; max-width: none; }
      .content { padding: 16px 12px 32px; }
      .page-head { display: block; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#mainContent">跳到主要内容</a>
  <div class="layout">
    <aside class="sidebar" aria-label="主导航">
      <div class="brand"><span class="brand-mark">G</span><span>产品工作台</span></div>
      <nav class="nav">
        <div class="nav-title">工作</div>
        <button class="nav-item active" data-page="home"><span>▦</span><span>首页</span></button>
        <button class="nav-item" data-page="planning"><span>◇</span><span>规划中心</span></button>
        <button class="nav-item" data-page="requirements"><span>▤</span><span>需求中心</span></button>
        <button class="nav-item" data-page="review"><span>✓</span><span>评审与验收</span></button>
        <div class="nav-title">洞察与协作</div>
        <button class="nav-item" data-page="data"><span>⌁</span><span>数据与复盘</span></button>
        <button class="nav-item" data-page="team"><span>◎</span><span>团队与AI</span></button>
      </nav>
      <div class="profile"><strong>产品负责人</strong><br><small>App & Mac</small></div>
    </aside>
    <main class="main" id="mainContent">
      <header class="topbar">
        <div class="breadcrumb" id="breadcrumb">首页 › 待我处理</div>
        <label class="search">
          <span hidden>全局搜索</span>
          <input id="globalSearch" aria-label="全局搜索" placeholder="搜索需求、版本、Demo、PRD、决策">
        </label>
        <button class="btn primary" data-action="new-requirement">新建需求</button>
        <button class="btn" data-action="reset-demo">重置</button>
      </header>
      <div class="content">
        <section class="page active" id="page-home"></section>
        <section class="page" id="page-planning"></section>
        <section class="page" id="page-requirements"></section>
        <section class="page" id="page-review"></section>
        <section class="page" id="page-data"></section>
        <section class="page" id="page-team"></section>
      </div>
    </main>
  </div>
  <div id="overlayRoot"></div>
  <script>
    'use strict';
  </script>
</body>
</html>
```

- [ ] **Step 2: Run the shell contract**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs shell
```

Expected: `PASS shell`.

- [ ] **Step 3: Commit the visual shell**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html
git commit -m "feat: add product workbench visual shell"
```

## Task 3: Add the Domain State and Rendering Foundation

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench.mjs`
- Test: `tools/verify-product-manager-workbench.mjs`

- [ ] **Step 1: Extend the static contract for state and public API**

Add this function before the final test calls:

```js
function stateContract() {
  for (const token of [
    'const seedState =',
    'executionPath',
    'nextOwner',
    'approver',
    'artifacts',
    'decisionGates',
    'function renderApp()',
    'function setPage(page)',
    'window.WorkbenchDemo',
  ]) {
    assert(html.includes(token), `Missing state token: ${token}`);
  }
  pass('stateContract');
}
```

Add `stateContract` to the task map:

```js
const tasks = { shell, domain, workflow, accessibility, stateContract, syntax };
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs stateContract
```

Expected: FAIL with `Missing state token: const seedState =`.

- [ ] **Step 3: Add seed state and a deterministic store**

Replace the inline script with:

```js
'use strict';

const STORAGE_KEY = 'product-manager-workbench-v1';

const seedState = {
  currentPage: 'home',
  selectedRequirementId: 'REQ-001',
  filters: { product: 'all', stage: 'all', owner: 'all' },
  releases: [
    { id: 'REL-APP-0826', code: 'APP-2026.8', goal: '提升商业化效率与新手体验', capacity: 34, used: 29, requirementIds: ['REQ-001', 'REQ-003'] },
    { id: 'REL-MAC-0826', code: 'MAC-2026.8', goal: '完善Mac内容获取与启动体验', capacity: 26, used: 18, requirementIds: ['REQ-002'] },
  ],
  requirements: [
    {
      id: 'REQ-001',
      title: 'Android广告接入',
      product: 'App',
      releaseIds: ['REL-APP-0826'],
      source: '商业化规划',
      priority: 'P0',
      effort: 13,
      executionPath: '完整需求',
      stage: '开发中',
      status: '待确认',
      owner: '产品负责人',
      nextOwner: '产品负责人',
      approver: '产品负责人',
      goal: '在不破坏核心体验的前提下建立可控广告收入',
      flow: ['广告位策略', 'Demo验证', 'PRD定稿', '运营确认', '领导确认', '需求评审', '开发实现', '测试验收'],
      artifacts: [
        { type: 'Demo', name: 'Android广告接入-交互标注版.html', state: '主版本' },
        { type: 'PRD', name: 'Android广告接入需求-V2.0.md', state: '主版本' },
      ],
      decisionGates: [
        { code: 'G1', name: '进入版本', state: '已通过' },
        { code: 'G2', name: '方案确认', state: '已通过' },
        { code: 'G3', name: '文档定稿', state: '已通过' },
        { code: 'G4', name: '验收通过', state: '未开始' },
      ],
    },
    {
      id: 'REQ-002',
      title: 'iOS应用与IPA资源库',
      product: 'Mac',
      releaseIds: ['REL-MAC-0826'],
      source: 'PlayCover竞品研究',
      priority: 'P1',
      effort: 8,
      executionPath: '专员执行',
      stage: 'PRD中',
      status: '待确认',
      owner: '产品专员A',
      nextOwner: '产品负责人',
      approver: '产品负责人',
      goal: '让Mac用户可以发现、导入并管理iOS应用与IPA资源',
      flow: ['资源发现', '导入IPA', '安装', '启动', '卸载与异常处理'],
      artifacts: [
        { type: 'Demo', name: 'Mac端-iOS应用与IPA资源库demo.html', state: '主版本' },
        { type: 'PRD', name: 'Mac端-iOS应用与IPA资源库.md', state: '候选版本' },
      ],
      decisionGates: [
        { code: 'G1', name: '进入版本', state: '已通过' },
        { code: 'G2', name: '方案确认', state: '已通过' },
        { code: 'G3', name: '文档定稿', state: '待确认' },
      ],
    },
    {
      id: 'REQ-003',
      title: '云存档月卡插单',
      product: 'App & Mac',
      releaseIds: [],
      source: '运营紧急反馈',
      priority: 'P0',
      effort: 6,
      executionPath: '快速需求',
      stage: '需求池',
      status: '阻塞',
      owner: '产品负责人',
      nextOwner: '产品负责人',
      approver: '产品负责人',
      goal: '验证云存档月卡的紧急商业化机会',
      flow: ['套餐说明', '购买', '权益生效', '续费与到期'],
      artifacts: [],
      decisionGates: [{ code: 'G1', name: '进入版本', state: '待确认' }],
    },
  ],
  inbox: [
    { id: 'IN-001', requirementId: 'REQ-002', type: '专员提交', title: '确认iOS/IPA资源库PRD', source: '产品专员A', due: '今天 15:00', severity: 'high', action: '评审' },
    { id: 'IN-002', requirementId: 'REQ-001', type: '开发问题', title: '广告无填充时是否保留占位', source: 'Android开发', due: '今天 17:00', severity: 'high', action: '给出策略' },
    { id: 'IN-003', requirementId: 'REQ-001', type: 'AI检查', title: 'Demo与PRD发现3处规则差异', source: '需求验收官', due: '明天', severity: 'medium', action: '查看差异' },
    { id: 'IN-004', requirementId: 'REQ-003', type: '插单审批', title: '云存档月卡希望进入APP-2026.8', source: '运营', due: '今天', severity: 'critical', action: '评估影响' },
    { id: 'IN-005', requirementId: 'REQ-001', type: '测试异常', title: '横屏切竖屏后激励弹窗状态丢失', source: '测试', due: '本周五', severity: 'medium', action: '确认方案' },
  ],
  tasks: [
    { id: 'TASK-001', requirementId: 'REQ-002', title: '补充卸载和ACE风险规则', assignee: '产品专员A', kind: '人工', state: '待负责人确认', due: '今天' },
    { id: 'TASK-002', requirementId: 'REQ-001', title: '扫描Demo与PRD差异', assignee: '需求验收官', kind: 'AI', state: '已交付', due: '今天' },
    { id: 'TASK-003', requirementId: 'REQ-003', title: '测算插单对版本容量影响', assignee: '高级项目经理', kind: 'AI', state: '进行中', due: '今天' },
  ],
  reviews: [
    { id: 'REV-001', requirementId: 'REQ-002', category: 'PRD评审', title: '卸载前是否需要清理IPA安装包', severity: 'P1', owner: '产品负责人', state: '待确认' },
    { id: 'REV-002', requirementId: 'REQ-001', category: '开发问题', title: '无填充状态不应留下广告空白', severity: 'P0', owner: '产品负责人', state: '待确认' },
    { id: 'REV-003', requirementId: 'REQ-001', category: '测试异常', title: '横竖屏切换保持激励任务状态', severity: 'P1', owner: 'Android开发', state: '待修复' },
    { id: 'REV-004', requirementId: 'REQ-001', category: '功能验收', title: '广告关闭后返回原页面滚动位置', severity: 'P1', owner: '产品负责人', state: '待复验' },
  ],
  activity: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...clone(seedState), ...JSON.parse(raw) } : clone(seedState);
  } catch {
    return clone(seedState);
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function requirementById(id) {
  return state.requirements.find(item => item.id === id);
}

function releaseById(id) {
  return state.releases.find(item => item.id === id);
}

function renderApp() {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(`page-${state.currentPage}`).classList.add('active');
  document.querySelectorAll('[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === state.currentPage));
  document.getElementById('breadcrumb').textContent = `首页 › ${pageNames[state.currentPage]}`;
}

const pageNames = {
  home: '待我处理',
  planning: '规划中心',
  requirements: '需求中心',
  review: '评审与验收',
  data: '数据与复盘',
  team: '团队与AI',
};

function setPage(page) {
  if (!pageNames[page]) return;
  state.currentPage = page;
  saveState();
  renderApp();
}

document.addEventListener('click', event => {
  const pageTrigger = event.target.closest('[data-page]');
  if (pageTrigger) setPage(pageTrigger.dataset.page);
  if (event.target.closest('[data-action="reset-demo"]')) {
    localStorage.removeItem(STORAGE_KEY);
    state = clone(seedState);
    renderApp();
  }
});

window.WorkbenchDemo = {
  getState: () => clone(state),
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    state = clone(seedState);
    renderApp();
  },
  setPage,
};

renderApp();
```

- [ ] **Step 4: Run the contract**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs domain
node tools/verify-product-manager-workbench.mjs stateContract
node tools/verify-product-manager-workbench.mjs syntax
```

Expected: `PASS domain`, `PASS stateContract`, and `PASS syntax`.

- [ ] **Step 5: Commit the state foundation**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench.mjs
git commit -m "feat: add product workbench domain state"
```

## Task 4: Implement the Unified Home Inbox

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Create: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`

- [ ] **Step 1: Create a failing browser test for the home queue**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', '产品经理全生命周期工作台demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto(pathToFileURL(file).href);
await page.waitForSelector('#page-home.active');

try {
  assert.equal(await page.locator('[data-metric]').count(), 4, 'Home must have 4 action metrics');
  assert.equal(await page.locator('[data-inbox-row]').count(), 5, 'Home must show 5 seed inbox rows');
  await page.click('[data-inbox-id="IN-002"] [data-action="open-inbox"]');
  assert.equal(await page.locator('[role="dialog"]').count(), 1, 'Inbox decision dialog did not open');
  assert((await page.locator('[role="dialog"]').innerText()).includes('广告无填充'));
  await page.click('[data-action="approve-inbox"]');
  assert.equal(await page.locator('[data-inbox-id="IN-002"]').count(), 0, 'Approved item stayed in the inbox');
  console.log('PASS homeInbox');
  assert.deepEqual(errors, [], `Page errors: ${errors.join(' | ')}`);
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Run the browser test and confirm it fails**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: FAIL because `[data-metric]` does not exist.

- [ ] **Step 3: Add action-card, table, tag, dialog, and drawer styles**

Add these rules before the responsive media queries:

```css
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.metric { padding: 16px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.metric-label { color: var(--text-3); font-size: 12px; }
.metric-value { margin-top: 6px; font: 700 26px/1.1 var(--mono); }
.metric-note { margin-top: 8px; color: var(--text-2); font-size: 12px; }
.grid-2-1 { display: grid; grid-template-columns: minmax(0,2fr) minmax(280px,1fr); gap: 12px; }
.table-wrap { overflow: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 10px 12px; color: var(--text-3); background: var(--bg); border-bottom: 1px solid var(--border); text-align: left; font-size: 12px; white-space: nowrap; }
.data-table td { padding: 11px 12px; color: var(--text-2); border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.data-table tr:hover td { background: #f8fafc; }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 700; }
.tag.critical, .tag.P0 { color: #b91c1c; background: #fef2f2; }
.tag.high, .tag.P1 { color: #b45309; background: #fffbeb; }
.tag.medium { color: #1d4ed8; background: #eff6ff; }
.tag.success { color: #047857; background: #ecfdf5; }
.list { display: grid; gap: 10px; }
.list-item { padding: 12px; border: 1px solid var(--border); border-radius: 8px; }
.list-item strong { display: block; margin-bottom: 3px; }
.muted { color: var(--text-3); font-size: 12px; }
.overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(15,23,42,.46); }
.dialog { width: min(620px,100%); max-height: calc(100vh - 40px); overflow: auto; background: var(--surface); border-radius: 14px; box-shadow: 0 20px 50px rgba(15,23,42,.22); }
.dialog-head, .dialog-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); }
.dialog-foot { justify-content: flex-end; border-top: 1px solid var(--border); border-bottom: 0; }
.dialog-body { padding: 18px; }
@media (max-width: 1200px) {
  .metric-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .grid-2-1 { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .metric-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 4: Add home rendering and inbox decision behavior**

Add these functions before `renderApp()`:

```js
function renderHome() {
  const blocking = state.inbox.filter(item => item.severity === 'critical').length;
  const waiting = state.inbox.length;
  const activeTasks = state.tasks.filter(item => item.state === '进行中').length;
  const dueToday = state.inbox.filter(item => item.due.includes('今天')).length;
  document.getElementById('page-home').innerHTML = `
    <div class="page-head">
      <div><h1>待我处理</h1><p>把专员、AI、运营、研发和测试的待确认事项收拢到一个队列。</p></div>
      <button class="btn primary" data-action="new-requirement">新建需求</button>
    </div>
    <div class="metric-grid">
      ${[
        ['waiting', '待我处理', waiting, '完成决策后自动流转给下一责任人'],
        ['blocking', '阻塞事项', blocking, '当前会阻塞版本或后续阶段'],
        ['today', '今日到期', dueToday, '优先处理等待产品策略的事项'],
        ['ai', 'AI进行中', activeTasks, 'AI结果只进入待确认，不自动通过'],
      ].map(item => `<article class="metric" data-metric="${item[0]}"><div class="metric-label">${item[1]}</div><div class="metric-value">${item[2]}</div><div class="metric-note">${item[3]}</div></article>`).join('')}
    </div>
    <div class="grid-2-1">
      <section class="panel">
        <div class="panel-head"><span class="panel-title">统一待办</span><span class="muted">按阻塞、截止时间和优先级排序</span></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>事项</th><th>所属需求</th><th>来源</th><th>截止</th><th>操作</th></tr></thead>
            <tbody>
              ${state.inbox.map(item => {
                const requirement = requirementById(item.requirementId);
                return `<tr data-inbox-row data-inbox-id="${item.id}">
                  <td><span class="tag ${item.severity}">${item.type}</span><strong>${item.title}</strong></td>
                  <td>${requirement.title}<div class="muted">${requirement.product} · ${requirement.stage}</div></td>
                  <td>${item.source}</td><td>${item.due}</td>
                  <td><button class="btn" data-action="open-inbox">${item.action}</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
      <aside class="panel">
        <div class="panel-head"><span class="panel-title">版本与团队风险</span></div>
        <div class="panel-body list">
          <div class="list-item"><strong>APP-2026.8容量接近上限</strong><span class="muted">已使用29/34人天，云存档插单尚未计入。</span></div>
          <div class="list-item"><strong>产品专员A等待确认</strong><span class="muted">iOS/IPA资源库PRD等待最终审批。</span></div>
          <div class="list-item"><strong>Android广告仍有测试异常</strong><span class="muted">进入验收前需关闭1个P0和1个P1问题。</span></div>
        </div>
      </aside>
    </div>`;
}

function openInbox(id) {
  const item = state.inbox.find(entry => entry.id === id);
  const requirement = requirementById(item.requirementId);
  document.getElementById('overlayRoot').innerHTML = `
    <div class="overlay" data-action="close-overlay">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="decisionTitle" onclick="event.stopPropagation()">
        <div class="dialog-head"><strong id="decisionTitle">${item.title}</strong><button class="btn" data-action="close-overlay">关闭</button></div>
        <div class="dialog-body">
          <p><span class="tag ${item.severity}">${item.type}</span></p>
          <p><strong>所属需求：</strong>${requirement.title}</p>
          <p><strong>来源：</strong>${item.source}</p>
          <p><strong>需要决定：</strong>${item.action}</p>
          <p><strong>下一责任人：</strong>${requirement.nextOwner}</p>
          <p><strong>唯一审批人：</strong>${requirement.approver}</p>
        </div>
        <div class="dialog-foot"><button class="btn" data-action="close-overlay">稍后处理</button><button class="btn primary" data-action="approve-inbox" data-id="${item.id}">确认并流转</button></div>
      </section>
    </div>`;
}

function closeOverlay() {
  document.getElementById('overlayRoot').innerHTML = '';
}

function approveInbox(id) {
  state.inbox = state.inbox.filter(item => item.id !== id);
  state.activity.unshift({ id: `ACT-${Date.now()}`, text: `已处理 ${id}`, time: new Date().toISOString() });
  saveState();
  closeOverlay();
  renderApp();
}
```

Add `renderHome()` as the first line inside `renderApp()`.

Add these branches to the document click handler:

```js
const inboxRow = event.target.closest('[data-inbox-id]');
if (event.target.closest('[data-action="open-inbox"]') && inboxRow) openInbox(inboxRow.dataset.inboxId);
const approve = event.target.closest('[data-action="approve-inbox"]');
if (approve) approveInbox(approve.dataset.id);
if (event.target.closest('[data-action="close-overlay"]')) closeOverlay();
```

- [ ] **Step 5: Run syntax and browser tests**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs syntax
node tools/verify-product-manager-workbench-ui.mjs
```

Expected:

- Static test prints `PASS syntax`;
- Browser test prints `PASS homeInbox`.

- [ ] **Step 6: Commit the unified inbox**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench-ui.mjs
git commit -m "feat: add unified product decision inbox"
```

## Task 5: Implement the Planning Center and Insertion Impact

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`

- [ ] **Step 1: Extend the browser test with the planning flow**

Insert before the final error assertion:

```js
await page.click('[data-page="planning"]');
assert.equal(await page.locator('[data-source-row]').count(), 4, 'Planning source inbox must contain 4 sources');
assert.equal(await page.locator('[data-requirement-row]').count(), 3, 'Demand pool must contain 3 seed requirements');
await page.click('[data-action="assess-insertion"][data-id="REQ-003"]');
assert.equal(await page.locator('[role="dialog"]').count(), 1, 'Insertion impact dialog did not open');
const impactText = await page.locator('[role="dialog"]').innerText();
assert(impactText.includes('29/34'));
assert(impactText.includes('超出1人天'));
assert(impactText.includes('被挤出'));
await page.click('[data-action="confirm-insertion"]');
assert.equal(await page.locator('[role="dialog"]').count(), 0);
assert((await page.locator('[data-release="REL-APP-0826"]').innerText()).includes('35/34'));
console.log('PASS planningInsertion');
```

- [ ] **Step 2: Run the browser test and confirm the planning page is empty**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: FAIL because `[data-source-row]` does not exist.

- [ ] **Step 3: Add planning styles**

```css
.tabs { display: inline-flex; gap: 4px; margin-bottom: 16px; padding: 4px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
.tab { min-height: 32px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent; color: var(--text-2); }
.tab.active { color: white; background: var(--primary); }
.release-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.capacity { height: 8px; overflow: hidden; margin: 10px 0 6px; border-radius: 999px; background: #e2e8f0; }
.capacity > span { display: block; height: 100%; background: var(--primary); }
.capacity.over > span { background: var(--danger); }
.section-gap { margin-top: 12px; }
@media (max-width: 900px) { .release-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Add planning rendering**

```js
function renderPlanning() {
  const sources = [
    ['用户反馈', '意见反馈中整理出8个候选问题', '每周归纳'],
    ['三方反馈', '运营提出云存档月卡紧急机会', '需要分诊'],
    ['数据分析', 'D0体验率低于目标2.3个百分点', '需要调查'],
    ['竞品调研', 'PlayCover新增IPA源管理能力', '已转需求'],
  ];
  document.getElementById('page-planning').innerHTML = `
    <div class="page-head"><div><h1>规划中心</h1><p>从多来源输入到需求池、版本组合和插单影响。</p></div></div>
    <div class="tabs" role="tablist"><button class="tab active">需求来源</button><button class="tab">需求池</button><button class="tab">版本规划</button><button class="tab">插单记录</button></div>
    <section class="panel">
      <div class="panel-head"><span class="panel-title">需求来源</span><span class="muted">AI完成归类、查重和历史关联，最终由产品负责人分诊。</span></div>
      <div class="panel-body list">
        ${sources.map(source => `<div class="list-item" data-source-row><strong>${source[0]}</strong><div>${source[1]}</div><div class="muted">${source[2]}</div></div>`).join('')}
      </div>
    </section>
    <section class="panel section-gap">
      <div class="panel-head"><span class="panel-title">需求池</span><span class="muted">人工排序优先，评分仅作参考</span></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>需求</th><th>产品端</th><th>来源</th><th>优先级</th><th>工作量</th><th>执行路径</th><th>状态</th><th>操作</th></tr></thead><tbody>
        ${state.requirements.map(item => `<tr data-requirement-row data-id="${item.id}"><td><strong>${item.title}</strong><div class="muted">${item.id}</div></td><td>${item.product}</td><td>${item.source}</td><td><span class="tag ${item.priority}">${item.priority}</span></td><td>${item.effort}人天</td><td>${item.executionPath}</td><td>${item.stage}</td><td>${item.id === 'REQ-003' ? `<button class="btn" data-action="assess-insertion" data-id="${item.id}">插单影响</button>` : `<button class="btn" data-action="open-requirement" data-id="${item.id}">查看</button>`}</td></tr>`).join('')}
      </tbody></table></div>
    </section>
    <div class="release-grid section-gap">
      ${state.releases.map(release => {
        const percent = Math.round(release.used / release.capacity * 100);
        return `<article class="panel" data-release="${release.id}"><div class="panel-head"><span class="panel-title">${release.code}</span><span class="tag ${release.used > release.capacity ? 'critical' : 'medium'}">${release.used}/${release.capacity}人天</span></div><div class="panel-body"><strong>${release.goal}</strong><div class="capacity ${release.used > release.capacity ? 'over' : ''}"><span style="width:${Math.min(percent,100)}%"></span></div><div class="muted">容量使用 ${percent}% · ${release.requirementIds.length}个需求</div></div></article>`;
      }).join('')}
    </div>`;
}
```

Call `renderPlanning()` inside `renderApp()`.

- [ ] **Step 5: Add insertion impact and confirmation**

```js
function openInsertionImpact(id) {
  const requirement = requirementById(id);
  const release = releaseById('REL-APP-0826');
  const projected = release.used + requirement.effort;
  const overflow = Math.max(projected - release.capacity, 0);
  document.getElementById('overlayRoot').innerHTML = `
    <div class="overlay" data-action="close-overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="insertionTitle" onclick="event.stopPropagation()">
      <div class="dialog-head"><strong id="insertionTitle">插单影响：${requirement.title}</strong><button class="btn" data-action="close-overlay">关闭</button></div>
      <div class="dialog-body">
        <p><strong>目标版本：</strong>${release.code}</p>
        <p><strong>当前容量：</strong>${release.used}/${release.capacity}人天</p>
        <p><strong>插单后：</strong>${projected}/${release.capacity}人天，超出${overflow}人天</p>
        <p><strong>被挤出：</strong>新手登录微调（4人天）建议移至APP-2026.9</p>
        <p><strong>截止影响：</strong>Android广告验收预计延后1个工作日</p>
      </div>
      <div class="dialog-foot"><button class="btn" data-action="close-overlay">取消</button><button class="btn primary" data-action="confirm-insertion" data-id="${id}">确认插单并记录影响</button></div>
    </section></div>`;
}

function confirmInsertion(id) {
  const requirement = requirementById(id);
  const release = releaseById('REL-APP-0826');
  if (!release.requirementIds.includes(id)) {
    release.requirementIds.push(id);
    release.used += requirement.effort;
    requirement.releaseIds = [release.id];
    requirement.stage = '已规划';
    requirement.status = '待确认';
    state.activity.unshift({ id: `ACT-${Date.now()}`, text: `确认${requirement.title}插入${release.code}`, time: new Date().toISOString() });
  }
  saveState();
  closeOverlay();
  renderApp();
}
```

Add click branches:

```js
const insertion = event.target.closest('[data-action="assess-insertion"]');
if (insertion) openInsertionImpact(insertion.dataset.id);
const confirmInsertionButton = event.target.closest('[data-action="confirm-insertion"]');
if (confirmInsertionButton) confirmInsertion(confirmInsertionButton.dataset.id);
```

- [ ] **Step 6: Run browser verification**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: `PASS homeInbox`, `PASS planningInsertion`.

- [ ] **Step 7: Commit planning**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench-ui.mjs
git commit -m "feat: add demand pool and release planning"
```

## Task 6: Implement Requirement Center and Three Execution Paths

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`

- [ ] **Step 1: Extend the browser test with requirement navigation**

```js
await page.click('[data-page="requirements"]');
assert.equal(await page.locator('[data-requirement-card]').count(), 3);
await page.click('[data-requirement-card][data-id="REQ-002"]');
assert.equal(await page.locator('[data-requirement-detail="REQ-002"]').count(), 1);
const requirementText = await page.locator('[data-requirement-detail="REQ-002"]').innerText();
assert(requirementText.includes('专员执行'));
assert(requirementText.includes('下一责任人'));
assert(requirementText.includes('唯一审批人'));
assert.equal(await page.locator('[data-stage-step]').count(), 15);
assert.equal(await page.locator('[data-artifact]').count(), 2);
console.log('PASS requirementLifecycle');
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: FAIL because `[data-requirement-card]` does not exist.

- [ ] **Step 3: Add requirement list and lifecycle styles**

```css
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.toolbar select, .toolbar input { min-height: 34px; padding: 0 10px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); color: var(--text-2); }
.requirement-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; }
.requirement-card { padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); text-align: left; }
.requirement-card:hover { border-color: var(--primary); box-shadow: var(--shadow-md); }
.card-top, .card-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.card-foot { margin-top: 16px; color: var(--text-3); font-size: 12px; }
.detail-grid { display: grid; grid-template-columns: minmax(0,2fr) minmax(300px,1fr); gap: 12px; }
.stage-track { display: flex; gap: 0; overflow-x: auto; padding: 12px 0; }
.stage-step { min-width: 108px; padding: 8px 10px; color: var(--text-3); border-top: 3px solid var(--border); font-size: 12px; }
.stage-step.done { color: var(--success); border-color: var(--success); }
.stage-step.current { color: var(--primary); border-color: var(--primary); font-weight: 700; }
.artifact { padding: 10px; border: 1px solid var(--border); border-radius: 8px; }
@media (max-width: 1200px) { .requirement-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 900px) { .detail-grid, .requirement-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Add requirement list and detail renderers**

```js
const lifecycleStages = ['待分诊','需求池','已规划','方案中','Demo中','PRD中','待业务确认','待领导确认','待需求评审','开发中','测试中','待验收','待上线','效果观察','已归档'];

function renderRequirements() {
  const selected = requirementById(state.selectedRequirementId);
  document.getElementById('page-requirements').innerHTML = `
    <div class="page-head"><div><h1>需求中心</h1><p>需求是唯一事实源，版本、任务、产物和角色队列都是关联视图。</p></div><button class="btn primary" data-action="new-requirement">新建需求</button></div>
    <div class="toolbar">
      <select aria-label="产品端筛选"><option>全部产品端</option><option>App</option><option>Mac</option></select>
      <select aria-label="阶段筛选"><option>全部阶段</option>${lifecycleStages.map(stage => `<option>${stage}</option>`).join('')}</select>
      <select aria-label="负责人筛选"><option>全部负责人</option><option>产品负责人</option><option>产品专员A</option></select>
    </div>
    <div class="requirement-grid">
      ${state.requirements.map(item => `<button class="requirement-card" data-requirement-card data-id="${item.id}">
        <div class="card-top"><span class="tag ${item.priority}">${item.priority}</span><span class="muted">${item.product}</span></div>
        <h3>${item.title}</h3><p>${item.goal}</p>
        <div class="card-foot"><span>${item.executionPath}</span><span>${item.stage}</span></div>
      </button>`).join('')}
    </div>
    <section class="section-gap" id="requirementDetail">${renderRequirementDetail(selected)}</section>`;
}

function renderRequirementDetail(item) {
  const currentIndex = Math.max(lifecycleStages.indexOf(item.stage), 0);
  return `<div data-requirement-detail="${item.id}">
    <div class="page-head"><div><h1>${item.title}</h1><p>${item.id} · ${item.product} · ${item.executionPath}</p></div><span class="tag ${item.priority}">${item.priority}</span></div>
    <section class="panel"><div class="panel-head"><span class="panel-title">生命周期</span><span class="muted">允许跳过不适用阶段，但必须记录原因</span></div><div class="panel-body"><div class="stage-track">${lifecycleStages.map((stage,index) => `<div class="stage-step ${index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''}" data-stage-step>${stage}</div>`).join('')}</div></div></section>
    <div class="detail-grid section-gap">
      <div class="list">
        <section class="panel"><div class="panel-head"><span class="panel-title">业务流与规则</span></div><div class="panel-body"><p>${item.goal}</p><div class="list">${item.flow.map((step,index) => `<div class="list-item"><strong>${index + 1}. ${step}</strong><span class="muted">状态、主流程、异常和验收规则统一沉淀在当前需求。</span></div>`).join('')}</div></div></section>
        <section class="panel"><div class="panel-head"><span class="panel-title">产物与任务</span><button class="btn" data-action="assign-task" data-id="${item.id}">分派任务</button></div><div class="panel-body list">${item.artifacts.length ? item.artifacts.map(artifact => `<div class="artifact" data-artifact><strong>${artifact.type} · ${artifact.state}</strong><div>${artifact.name}</div></div>`).join('') : '<div class="empty">当前执行路径不要求正式Demo或PRD。</div>'}</div></section>
      </div>
      <aside class="list">
        <section class="panel"><div class="panel-head"><span class="panel-title">当前责任</span></div><div class="panel-body"><p><strong>负责人：</strong>${item.owner}</p><p><strong>下一责任人：</strong>${item.nextOwner}</p><p><strong>唯一审批人：</strong>${item.approver}</p><p><strong>状态：</strong>${item.status}</p></div></section>
        <section class="panel"><div class="panel-head"><span class="panel-title">决策门</span></div><div class="panel-body list">${item.decisionGates.map(gate => `<div class="list-item"><strong>${gate.code} ${gate.name}</strong><span class="tag ${gate.state === '已通过' ? 'success' : 'medium'}">${gate.state}</span></div>`).join('')}</div></section>
      </aside>
    </div>
  </div>`;
}
```

Call `renderRequirements()` inside `renderApp()`.

Add click behavior:

```js
const requirementCard = event.target.closest('[data-requirement-card]');
if (requirementCard) {
  state.selectedRequirementId = requirementCard.dataset.id;
  saveState();
  renderRequirements();
  document.getElementById('requirementDetail').scrollIntoView({ behavior: 'smooth' });
}
```

- [ ] **Step 5: Run browser verification**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: includes `PASS requirementLifecycle`.

- [ ] **Step 6: Commit requirement execution**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench-ui.mjs
git commit -m "feat: add requirement lifecycle and execution paths"
```

## Task 7: Add Embedded Specialist and AI Assignment

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`

- [ ] **Step 1: Add a failing assignment flow**

```js
await page.click('[data-action="assign-task"][data-id="REQ-002"]');
assert.equal(await page.locator('[role="dialog"]').count(), 1);
await page.selectOption('#taskAssignee', '需求验收官');
await page.fill('#taskTitle', '检查PRD遗漏和边界条件');
await page.fill('#taskDeliverable', '问题清单与修改建议');
await page.click('[data-action="submit-task"]');
assert.equal(await page.locator('[role="dialog"]').count(), 0);
await page.click('[data-page="team"]');
assert((await page.locator('#page-team').innerText()).includes('检查PRD遗漏和边界条件'));
console.log('PASS embeddedAssignment');
```

- [ ] **Step 2: Run the test and confirm the assignment dialog is missing**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: FAIL because the dialog does not open.

- [ ] **Step 3: Add task assignment and team rendering**

```js
function openTaskDialog(requirementId) {
  const requirement = requirementById(requirementId);
  document.getElementById('overlayRoot').innerHTML = `
    <div class="overlay" data-action="close-overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="taskDialogTitle" onclick="event.stopPropagation()">
      <div class="dialog-head"><strong id="taskDialogTitle">分派任务 · ${requirement.title}</strong><button class="btn" data-action="close-overlay">关闭</button></div>
      <div class="dialog-body list">
        <label>执行人<select id="taskAssignee" style="width:100%;min-height:40px"><option>产品专员A</option><option>产品专员B</option><option>需求验收官</option><option>快速原型工程师</option><option>产品数据分析师</option></select></label>
        <label>任务标题<input id="taskTitle" style="width:100%;min-height:40px" value="补充需求产物"></label>
        <label>交付物<input id="taskDeliverable" style="width:100%;min-height:40px" value="可评审的文档或检查结果"></label>
        <p class="muted">输入材料只包含当前需求已授权的Demo、PRD和反馈；AI结果进入待确认，不自动通过。</p>
      </div>
      <div class="dialog-foot"><button class="btn" data-action="close-overlay">取消</button><button class="btn primary" data-action="submit-task" data-id="${requirementId}">下发任务</button></div>
    </section></div>`;
}

function submitTask(requirementId) {
  const assignee = document.getElementById('taskAssignee').value;
  const title = document.getElementById('taskTitle').value.trim();
  const deliverable = document.getElementById('taskDeliverable').value.trim();
  if (!title || !deliverable) return;
  state.tasks.unshift({
    id: `TASK-${Date.now()}`,
    requirementId,
    title,
    assignee,
    kind: assignee.includes('专员') ? '人工' : 'AI',
    state: '进行中',
    due: '明天',
    deliverable,
  });
  saveState();
  closeOverlay();
  renderApp();
}

function renderTeam() {
  document.getElementById('page-team').innerHTML = `
    <div class="page-head"><div><h1>团队与AI</h1><p>V1只展示需求内派工、运行结果和待确认状态。</p></div></div>
    <div class="metric-grid">
      <article class="metric" data-metric><div class="metric-label">产品专员A</div><div class="metric-value">2</div><div class="metric-note">1项待确认</div></article>
      <article class="metric" data-metric><div class="metric-label">产品专员B</div><div class="metric-value">1</div><div class="metric-note">本周负载正常</div></article>
      <article class="metric" data-metric><div class="metric-label">AI进行中</div><div class="metric-value">${state.tasks.filter(task => task.kind === 'AI' && task.state === '进行中').length}</div><div class="metric-note">结果统一进入待我处理</div></article>
      <article class="metric" data-metric><div class="metric-label">AI已交付</div><div class="metric-value">${state.tasks.filter(task => task.kind === 'AI' && task.state === '已交付').length}</div><div class="metric-note">不会自动修改正式状态</div></article>
    </div>
    <section class="panel"><div class="panel-head"><span class="panel-title">任务运行队列</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>任务</th><th>需求</th><th>执行人</th><th>类型</th><th>状态</th><th>交付</th></tr></thead><tbody>${state.tasks.map(task => `<tr><td><strong>${task.title}</strong></td><td>${requirementById(task.requirementId).title}</td><td>${task.assignee}</td><td>${task.kind}</td><td><span class="tag ${task.state === '已交付' ? 'success' : 'medium'}">${task.state}</span></td><td>${task.deliverable || '按任务定义提交'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
```

Call `renderTeam()` inside `renderApp()`.

Add click branches:

```js
const assignButton = event.target.closest('[data-action="assign-task"]');
if (assignButton) openTaskDialog(assignButton.dataset.id);
const submitTaskButton = event.target.closest('[data-action="submit-task"]');
if (submitTaskButton) submitTask(submitTaskButton.dataset.id);
```

- [ ] **Step 4: Run browser verification**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: includes `PASS embeddedAssignment`.

- [ ] **Step 5: Commit assignment**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench-ui.mjs
git commit -m "feat: add embedded specialist and AI assignment"
```

## Task 8: Implement Review, Testing, and Acceptance Gates

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`

- [ ] **Step 1: Add a failing review flow**

```js
await page.click('[data-page="review"]');
assert.equal(await page.locator('[data-review-row]').count(), 4);
await page.click('[data-review-id="REV-002"] [data-action="open-review"]');
assert.equal(await page.locator('[role="dialog"]').count(), 1);
assert((await page.locator('[role="dialog"]').innerText()).includes('无填充状态'));
await page.selectOption('#reviewDecision', '补充PRD并同步Demo');
await page.fill('#reviewReason', '无填充时移除广告节点，保持自然内容连续。');
await page.click('[data-action="submit-review"]');
assert((await page.locator('[data-review-id="REV-002"]').innerText()).includes('已决策'));
console.log('PASS reviewAcceptance');
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: FAIL because `[data-review-row]` does not exist.

- [ ] **Step 3: Add review rendering and decision behavior**

```js
function renderReview() {
  document.getElementById('page-review').innerHTML = `
    <div class="page-head"><div><h1>评审与验收</h1><p>集中处理专员产物、开发问题、测试异常、功能验收和复验。</p></div></div>
    <div class="tabs"><button class="tab active">全部</button><button class="tab">文档评审</button><button class="tab">开发问题</button><button class="tab">测试异常</button><button class="tab">功能验收</button></div>
    <section class="panel"><div class="panel-head"><span class="panel-title">质量门队列</span><span class="muted">决策后同步生成产物更新清单</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>类型</th><th>问题</th><th>需求</th><th>级别</th><th>负责人</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${state.reviews.map(review => `<tr data-review-row data-review-id="${review.id}"><td>${review.category}</td><td><strong>${review.title}</strong>${review.decision ? `<div class="muted">${review.decision}</div>` : ''}</td><td>${requirementById(review.requirementId).title}</td><td><span class="tag ${review.severity}">${review.severity}</span></td><td>${review.owner}</td><td><span class="tag ${review.state === '已决策' ? 'success' : 'medium'}">${review.state}</span></td><td><button class="btn" data-action="open-review">${review.state === '已决策' ? '查看' : '处理'}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
}

function openReview(id) {
  const review = state.reviews.find(item => item.id === id);
  const requirement = requirementById(review.requirementId);
  document.getElementById('overlayRoot').innerHTML = `
    <div class="overlay" data-action="close-overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="reviewTitle" onclick="event.stopPropagation()">
      <div class="dialog-head"><strong id="reviewTitle">${review.title}</strong><button class="btn" data-action="close-overlay">关闭</button></div>
      <div class="dialog-body list">
        <p><strong>需求：</strong>${requirement.title}</p>
        <p><strong>类型：</strong>${review.category}　<strong>级别：</strong>${review.severity}</p>
        <label>处理结论<select id="reviewDecision" style="width:100%;min-height:40px"><option>补充PRD并同步Demo</option><option>仅修改Demo</option><option>转为后续需求</option><option>接受风险</option></select></label>
        <label>产品策略<textarea id="reviewReason" rows="4" style="width:100%">${review.reason || ''}</textarea></label>
      </div>
      <div class="dialog-foot"><button class="btn" data-action="close-overlay">取消</button><button class="btn primary" data-action="submit-review" data-id="${id}">确认决策</button></div>
    </section></div>`;
}

function submitReview(id) {
  const review = state.reviews.find(item => item.id === id);
  review.decision = document.getElementById('reviewDecision').value;
  review.reason = document.getElementById('reviewReason').value.trim();
  review.state = '已决策';
  state.tasks.unshift({
    id: `TASK-${Date.now()}`,
    requirementId: review.requirementId,
    title: review.decision,
    assignee: review.owner,
    kind: '人工',
    state: '待执行',
    due: '明天',
    deliverable: review.reason,
  });
  saveState();
  closeOverlay();
  renderApp();
}
```

Call `renderReview()` inside `renderApp()`.

Add click branches:

```js
const reviewRow = event.target.closest('[data-review-id]');
if (event.target.closest('[data-action="open-review"]') && reviewRow) openReview(reviewRow.dataset.reviewId);
const reviewSubmit = event.target.closest('[data-action="submit-review"]');
if (reviewSubmit) submitReview(reviewSubmit.dataset.id);
```

- [ ] **Step 4: Run browser verification**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: includes `PASS reviewAcceptance`.

- [ ] **Step 5: Commit review and acceptance**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench-ui.mjs
git commit -m "feat: add review testing and acceptance gates"
```

## Task 9: Add Data Review, Global Search, Creation, and Persistence

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`

- [ ] **Step 1: Add failing tests for search, creation, and persistence**

```js
await page.fill('#globalSearch', '广告');
await page.press('#globalSearch', 'Enter');
assert.equal(await page.locator('[data-search-result]').count(), 1);
await page.click('[data-search-result]');
assert.equal(await page.locator('[data-requirement-detail="REQ-001"]').count(), 1);

await page.click('[data-action="new-requirement"]');
await page.fill('#newRequirementTitle', '启动失败策略补充');
await page.selectOption('#newRequirementProduct', 'App & Mac');
await page.selectOption('#newRequirementPath', '快速需求');
await page.click('[data-action="create-requirement"]');
assert((await page.locator('#page-requirements').innerText()).includes('启动失败策略补充'));
await page.reload();
assert((await page.locator('#page-requirements').innerText()).includes('启动失败策略补充'));
console.log('PASS searchCreatePersistence');
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: FAIL because search results do not open.

- [ ] **Step 3: Add lightweight data review**

```js
function renderData() {
  document.getElementById('page-data').innerHTML = `
    <div class="page-head"><div><h1>数据与复盘</h1><p>V1只验证需求内指标和继续优化决策，不建设完整BI。</p></div></div>
    <div class="metric-grid">
      <article class="metric" data-metric><div class="metric-label">Android广告填充率</div><div class="metric-value">82.4%</div><div class="metric-note">目标80% · 已进入观察</div></article>
      <article class="metric" data-metric><div class="metric-label">广告关闭率</div><div class="metric-value">18.7%</div><div class="metric-note">较上线首日下降2.1%</div></article>
      <article class="metric" data-metric><div class="metric-label">IPA导入成功率</div><div class="metric-value">91.3%</div><div class="metric-note">内测样本46次</div></article>
      <article class="metric" data-metric><div class="metric-label">待复盘需求</div><div class="metric-value">2</div><div class="metric-note">需要继续、观察或停止决策</div></article>
    </div>
    <section class="panel"><div class="panel-head"><span class="panel-title">上线效果与后续结论</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>需求</th><th>目标</th><th>当前结果</th><th>证据</th><th>建议</th></tr></thead><tbody><tr><td>Android广告接入</td><td>建立可控广告收入</td><td>填充率达到目标，关闭率持续下降</td><td>观察7天</td><td><span class="tag success">继续优化</span></td></tr><tr><td>iOS应用与IPA资源库</td><td>提升Mac内容获取效率</td><td>样本不足</td><td>内测46次</td><td><span class="tag medium">继续观察</span></td></tr></tbody></table></div></section>`;
}
```

Call `renderData()` inside `renderApp()`.

- [ ] **Step 4: Add global search behavior**

```js
function openSearch(query) {
  const normalized = query.trim().toLowerCase();
  const matches = state.requirements.filter(item => `${item.id} ${item.title} ${item.goal} ${item.source}`.toLowerCase().includes(normalized));
  document.getElementById('overlayRoot').innerHTML = `
    <div class="overlay" data-action="close-overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="searchTitle" onclick="event.stopPropagation()">
      <div class="dialog-head"><strong id="searchTitle">搜索结果 · ${query}</strong><button class="btn" data-action="close-overlay">关闭</button></div>
      <div class="dialog-body list">${matches.length ? matches.map(item => `<button class="list-item" style="text-align:left;background:white" data-search-result data-id="${item.id}"><strong>${item.title}</strong><span class="muted">${item.product} · ${item.stage} · ${item.source}</span></button>`).join('') : '<div class="empty">没有找到已授权的相关需求。</div>'}</div>
    </section></div>`;
}
```

Add keyboard behavior:

```js
document.getElementById('globalSearch').addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.currentTarget.value.trim()) openSearch(event.currentTarget.value);
});
```

Add click behavior:

```js
const searchResult = event.target.closest('[data-search-result]');
if (searchResult) {
  state.selectedRequirementId = searchResult.dataset.id;
  closeOverlay();
  setPage('requirements');
}
```

- [ ] **Step 5: Add requirement creation**

```js
function openNewRequirement() {
  document.getElementById('overlayRoot').innerHTML = `
    <div class="overlay" data-action="close-overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="newRequirementHeading" onclick="event.stopPropagation()">
      <div class="dialog-head"><strong id="newRequirementHeading">新建需求</strong><button class="btn" data-action="close-overlay">关闭</button></div>
      <div class="dialog-body list">
        <label>需求名称<input id="newRequirementTitle" style="width:100%;min-height:40px"></label>
        <label>产品端<select id="newRequirementProduct" style="width:100%;min-height:40px"><option>App</option><option>Mac</option><option>App & Mac</option></select></label>
        <label>执行路径<select id="newRequirementPath" style="width:100%;min-height:40px"><option>快速需求</option><option>专员执行</option><option>完整需求</option></select></label>
      </div>
      <div class="dialog-foot"><button class="btn" data-action="close-overlay">取消</button><button class="btn primary" data-action="create-requirement">进入需求池</button></div>
    </section></div>`;
}

function createRequirement() {
  const title = document.getElementById('newRequirementTitle').value.trim();
  if (!title) return;
  const item = {
    id: `REQ-${String(state.requirements.length + 1).padStart(3,'0')}`,
    title,
    product: document.getElementById('newRequirementProduct').value,
    releaseIds: [],
    source: '产品负责人主动规划',
    priority: 'P2',
    effort: 3,
    executionPath: document.getElementById('newRequirementPath').value,
    stage: '需求池',
    status: '未开始',
    owner: '产品负责人',
    nextOwner: '产品负责人',
    approver: '产品负责人',
    goal: '待产品负责人完成目标和成功指标定义',
    flow: ['明确用户问题', '确认业务规则', '进入对应执行路径'],
    artifacts: [],
    decisionGates: [{ code: 'G1', name: '进入版本', state: '未开始' }],
  };
  state.requirements.push(item);
  state.selectedRequirementId = item.id;
  saveState();
  closeOverlay();
  setPage('requirements');
}
```

Add click branches:

```js
if (event.target.closest('[data-action="new-requirement"]')) openNewRequirement();
if (event.target.closest('[data-action="create-requirement"]')) createRequirement();
```

- [ ] **Step 6: Run browser verification**

Run:

```powershell
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: includes `PASS searchCreatePersistence`.

- [ ] **Step 7: Commit data, search, and persistence**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench-ui.mjs
git commit -m "feat: add workbench search creation and persistence"
```

## Task 10: Finish Accessibility, Narrow Layout, and Visual Evidence

**Files:**

- Modify: `demos/产品经理全生命周期工作台demo.html`
- Modify: `tools/verify-product-manager-workbench-ui.mjs`
- Test: `tools/verify-product-manager-workbench.mjs`
- Test: `tools/verify-product-manager-workbench-ui.mjs`
- Generate: `test-results/product-manager-workbench/*.png`

- [ ] **Step 1: Replace structural text glyphs with consistent inline SVG icons**

Use this helper inside the script:

```js
function icon(name, size = 16) {
  const paths = {
    home: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    planning: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/>',
    requirements: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    review: '<path d="M20 6 9 17l-5-5"/><path d="M21 12a9 9 0 1 1-5-8"/>',
    data: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${paths[name]}</svg>`;
}
```

After the script starts, set the navigation icon containers:

```js
document.querySelector('[data-page="home"] span').innerHTML = icon('home');
document.querySelector('[data-page="planning"] span').innerHTML = icon('planning');
document.querySelector('[data-page="requirements"] span').innerHTML = icon('requirements');
document.querySelector('[data-page="review"] span').innerHTML = icon('review');
document.querySelector('[data-page="data"] span').innerHTML = icon('data');
document.querySelector('[data-page="team"] span').innerHTML = icon('team');
```

- [ ] **Step 2: Add accessible labels and focus recovery**

Add:

```js
function focusDialog() {
  requestAnimationFrame(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      dialog.tabIndex = -1;
      dialog.focus();
    }
  });
}
```

Call `focusDialog()` at the end of `openInbox`, `openInsertionImpact`, `openTaskDialog`, `openReview`, `openSearch`, and `openNewRequirement`.

Add Escape handling:

```js
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('.overlay')) closeOverlay();
});
```

- [ ] **Step 3: Extend browser verification for narrow screens and accessibility**

Append before the browser closes:

```js
await page.setViewportSize({ width: 768, height: 1024 });
await page.click('[data-page="home"]');
assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Narrow layout has horizontal page scroll');
assert.equal(await page.locator('.metric-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2, 'Tablet metrics should use two columns');
assert.equal(await page.locator('[aria-label="主导航"]').count(), 1);
assert.equal(await page.locator('input[aria-label="全局搜索"]').count(), 1);
console.log('PASS responsiveAccessibility');
```

- [ ] **Step 4: Add deterministic screenshot capture**

Before the final browser close, add:

```js
const resultDir = path.join(root, 'test-results', 'product-manager-workbench');
fs.mkdirSync(resultDir, { recursive: true });

await page.setViewportSize({ width: 1440, height: 1000 });
for (const [pageName, filename] of [
  ['home', 'home.png'],
  ['planning', 'planning.png'],
  ['requirements', 'requirement.png'],
  ['review', 'review.png'],
]) {
  await page.click(`[data-page="${pageName}"]`);
  if (pageName === 'requirements') await page.click('[data-requirement-card][data-id="REQ-002"]');
  await page.screenshot({ path: path.join(resultDir, filename), fullPage: true });
}

await page.setViewportSize({ width: 768, height: 1024 });
await page.click('[data-page="home"]');
await page.screenshot({ path: path.join(resultDir, 'narrow.png'), fullPage: true });
```

- [ ] **Step 5: Run all verification**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs
node tools/verify-product-manager-workbench-ui.mjs
```

Expected:

```text
PASS shell
PASS domain
PASS workflow
PASS accessibility
PASS stateContract
PASS syntax
PASS homeInbox
PASS planningInsertion
PASS requirementLifecycle
PASS embeddedAssignment
PASS reviewAcceptance
PASS searchCreatePersistence
PASS responsiveAccessibility
```

- [ ] **Step 6: Inspect all five screenshots**

Open:

- `test-results/product-manager-workbench/home.png`
- `test-results/product-manager-workbench/planning.png`
- `test-results/product-manager-workbench/requirement.png`
- `test-results/product-manager-workbench/review.png`
- `test-results/product-manager-workbench/narrow.png`

Verify:

- No overlap, clipping, blank primary region, or horizontal page scroll;
- Reference visual language is recognizable: 220px grouped sidebar, light background, white bordered cards, blue primary actions;
- Home is action-first rather than chart-first;
- Insertion impact, next owner, approver, and evidence are visible;
- Critical, warning, and success states include text, not color alone;
- Narrow layout retains all primary actions.

- [ ] **Step 7: Commit the verified prototype**

```powershell
git add -- demos/产品经理全生命周期工作台demo.html tools/verify-product-manager-workbench.mjs tools/verify-product-manager-workbench-ui.mjs test-results/product-manager-workbench
git commit -m "test: verify product manager workbench prototype"
```

## Task 11: Final Scope and Regression Audit

**Files:**

- Verify: `demos/产品经理全生命周期工作台demo.html`
- Verify: `tools/verify-product-manager-workbench.mjs`
- Verify: `tools/verify-product-manager-workbench-ui.mjs`
- Verify: `docs/superpowers/specs/2026-07-28-product-manager-workbench-lifecycle-design.md`

- [ ] **Step 1: Confirm only intended files changed**

Run:

```powershell
git status --short
git diff --name-only HEAD~10..HEAD
```

Expected: implementation commits include only the demo, its two verification tools, and its screenshot evidence. Existing unrelated dirty files remain untouched.

- [ ] **Step 2: Confirm the read-only reference was not modified**

Run:

```powershell
git diff --exit-code -- demos/后台管理/admin-运营数据看板v2.html
```

Expected: exit code 0.

- [ ] **Step 3: Run final tests from a clean prototype state**

Run:

```powershell
node tools/verify-product-manager-workbench.mjs
node tools/verify-product-manager-workbench-ui.mjs
```

Expected: all static and browser checks pass.

- [ ] **Step 4: Confirm V1 spec coverage**

Verify the prototype demonstrates:

- One requirement linked to App, Mac, or both;
- Release membership independent from requirement identity;
- Quick, specialist, and complete execution paths;
- One unified product-owner inbox;
- Specialist and AI assignment inside a requirement;
- Explicit next owner and sole approver;
- Demo/PRD/test/acceptance artifacts;
- Insertion capacity impact;
- Review, test, acceptance, release, and data-review decisions;
- Permission messaging and manual approval gates;
- Search and state persistence;
- Desktop and narrow-screen operation.

- [ ] **Step 5: Record the prototype handoff**

In the implementation completion message, include:

- Demo path;
- Verification commands and results;
- Screenshot evidence paths;
- Known production exclusions;
- Recommendation to validate with one App requirement, one Mac requirement, and one insertion before starting backend design.
