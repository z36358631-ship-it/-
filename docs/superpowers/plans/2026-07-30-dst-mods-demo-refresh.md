# DST MODS 三端 Demo 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三份旧 Mod Demo 原位重构为符合最终 DST 非官方 MODS PRD、横竖屏状态连续且可离线验收的高保真单文件 HTML。

**Architecture:** 三份 HTML 各自内嵌同一版 `dst_mods_demo_v1` 状态内核，通过 `dispatch → reducer → derive → render` 驱动界面，不以 DOM class 代替业务事实。Mac、APP 主功能和 APP 场景联动分别承担桌面管理、移动端旋转连续性和启动证据闭环；Node 静态校验与 Playwright 运行时校验共同阻止外部依赖、状态漂移和交互回归。

**Tech Stack:** HTML、CSS、原生 JavaScript、内联 SVG、Node.js 20+、`node:test`、Playwright Core、本机 Chrome

---

## 1. 规格与文件边界

实施前必须读取：

- `docs/superpowers/specs/2026-07-30-dst-mods-demo-refresh-design.md`
- `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- `prd/mod功能/DST-MODS-端到端合同-v1.md`
- `prd/Skills/UI规范/盖世游戏APP-UI设计规范.md`

修改：

- `demos/Mod与发行人/Mod功能Mac端demo.html`
- `demos/Mod与发行人/Mod功能APP端demo.html`
- `demos/Mod与发行人/Mod功能APP端-场景联动demo.html`

创建：

- `tools/lib/dst-mods-demo-validator.mjs`
- `test/dst-mods/demo-validator.test.mjs`
- `tools/verify-dst-mods-demos.mjs`
- `tools/verify-dst-mods-demos-ui.mjs`

运行时证据输出到：

- `.tmp/dst-mods-demo-evidence/`

不得修改：

- `prd/mod功能/APP创意工坊参考图/**`
- `prd/mod功能/Mac端mod图片/**`
- `prd/mod功能/创意工坊参考图/**`
- `prd/mod功能/竞品功能参考图/**`
- 其他 Demo、PRD 和用户文件

## 2. 三份 HTML 的统一合同

三份文件都必须包含以下常量和调试接口：

```javascript
const DEMO_MODEL_VERSION = 'dst_mods_demo_v1';
const GAME_ID = 'steam:322330';

window.__DST_MODS_DEMO__ = Object.freeze({
  version: DEMO_MODEL_VERSION,
  getState: () => structuredClone(state),
  dispatch,
  derive: () => structuredClone(derive(state)),
  reset
});
```

统一状态字段：

```javascript
const createInitialState = ({ platform, orientation, deviceInstallationId }) => ({
  contractVersion: DEMO_MODEL_VERSION,
  game_id: GAME_ID,
  device_installation_id: deviceInstallationId,
  platform,
  orientation,
  mods: createInitialMods(),
  tasks: {},
  ui: {
    screen: 'game-detail',
    tab: 'available',
    searchText: '',
    sortKey: 'recommended',
    filterKey: 'all',
    currentModId: null,
    selectedPreviewId: 'preview-1',
    readingSectionId: 'summary',
    listAnchorModId: 'dst-fast-travel',
    detailAnchorSectionId: 'summary',
    activeDialog: null
  },
  launch: {
    manifestId: null,
    launchId: null,
    items: [],
    evidence: [],
    manifestChanged: false,
    exitType: null
  },
  recovery: {
    visible: false,
    selectedAction: null
  },
  metrics: {
    taskCreateCount: 0,
    detailRequestCount: 0
  }
});
```

每个 MOD 的设备事实：

```javascript
{
  mod_id: 'dst-fast-travel',
  installation_fact: 'not_installed',
  enabled_value: 'disabled',
  update_fact: 'no_update',
  install_gate: 'allowed',
  installed_version: null,
  latest_version: '1.4.0',
  installed_package_hash: null,
  active_version_pointer: null,
  current_task_id: null
}
```

安装动作必须使用固定幂等规则：

```javascript
function ensureInstallTask(next, modId) {
  const mod = next.mods[modId];
  if (mod.current_task_id && next.tasks[mod.current_task_id]) {
    return mod.current_task_id;
  }
  if (mod.install_gate !== 'allowed') return null;

  const taskId = `task-${next.device_installation_id}-${modId}`;
  next.tasks[taskId] = {
    task_id: taskId,
    root_mod_id: modId,
    task_state: 'queued',
    progress_percent: 0,
    downloaded_bytes: 0,
    failure_code: null,
    operation_attempt: 1
  };
  mod.current_task_id = taskId;
  next.metrics.taskCreateCount += 1;
  return taskId;
}
```

统一任务推进顺序：

```text
queued → downloading → verifying → installing → succeeded
```

统一设备级文案：

```text
已安装 · 已启用 · 仅此设备
已安装 · 未启用 · 仅此设备
非官方来源 · 当前设备本地管理
```

### Task 1: 建立三端 Demo 静态合同

**Files:**

- Create: `tools/lib/dst-mods-demo-validator.mjs`
- Create: `test/dst-mods/demo-validator.test.mjs`
- Create: `tools/verify-dst-mods-demos.mjs`

- [ ] **Step 1: 编写静态校验单元测试**

创建 `test/dst-mods/demo-validator.test.mjs`：

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateStandaloneDemo,
  validateSharedContract
} from '../../tools/lib/dst-mods-demo-validator.mjs';

test('standalone demo rejects external resources and old scope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-demo-'));
  const file = join(root, 'old.html');
  await writeFile(
    file,
    '<link href="https://cdn.example/x.css"><h1>GTA 5 Mod中心</h1>',
    'utf8'
  );
  const errors = await validateStandaloneDemo(file);
  assert(errors.some(error => error.includes('external resource')));
  assert(errors.some(error => error.includes('old scope')));
});

test('standalone demo accepts an offline DST contract', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-demo-'));
  const file = join(root, 'ok.html');
  await writeFile(
    file,
    `<!doctype html><title>DST MODS</title>
     <script>
       const DEMO_MODEL_VERSION='dst_mods_demo_v1';
       const GAME_ID='steam:322330';
       const device_installation_id='device-app-01';
       const task_id='task-01';
       const source_unknown='source_unknown';
       const paused_by_system='paused_by_system';
       const loaded_match='loaded_match';
       window.__DST_MODS_DEMO__={version:DEMO_MODEL_VERSION};
     </script>`,
    'utf8'
  );
  assert.deepEqual(await validateStandaloneDemo(file), []);
});

test('three demos must expose the same model version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dst-mods-demo-'));
  const files = [];
  for (const [name, version] of [['a.html','v1'],['b.html','v1'],['c.html','v2']]) {
    const file = join(root, name);
    await writeFile(file, `const DEMO_MODEL_VERSION='${version}';`, 'utf8');
    files.push(file);
  }
  assert.deepEqual(
    await validateSharedContract(files),
    ['model version mismatch: v1, v1, v2']
  );
});
```

- [ ] **Step 2: 运行测试并确认红灯**

Run:

```powershell
node --test test/dst-mods/demo-validator.test.mjs
```

Expected: FAIL，错误指向 `tools/lib/dst-mods-demo-validator.mjs` 不存在。

- [ ] **Step 3: 实现静态校验器**

创建 `tools/lib/dst-mods-demo-validator.mjs`：

```javascript
import { readFile } from 'node:fs/promises';

const requiredText = [
  "DEMO_MODEL_VERSION",
  "dst_mods_demo_v1",
  "steam:322330",
  "device_installation_id",
  "task_id",
  "source_unknown",
  "paused_by_system",
  "loaded_match",
  "__DST_MODS_DEMO__"
];

const oldScope = [
  /GTA\s*5/i,
  /上古卷轴/,
  /排行榜/,
  /点赞/,
  /收藏/,
  />\s*Mod\s*中心\s*</i
];

const externalPatterns = [
  /<(?:script|link|img)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//i,
  /url\(\s*["']?https?:\/\//i,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /<iframe\b/i
];

export async function validateStandaloneDemo(file) {
  const content = await readFile(file, 'utf8');
  const errors = [];
  for (const pattern of externalPatterns) {
    if (pattern.test(content)) errors.push(`${file}: external resource ${pattern}`);
  }
  for (const pattern of oldScope) {
    if (pattern.test(content)) errors.push(`${file}: old scope ${pattern}`);
  }
  for (const text of requiredText) {
    if (!content.includes(text)) errors.push(`${file}: missing ${text}`);
  }
  return errors;
}

export async function validateSharedContract(files) {
  const versions = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const match = content.match(/DEMO_MODEL_VERSION\s*=\s*['"]([^'"]+)['"]/);
    versions.push(match?.[1] ?? 'missing');
  }
  return new Set(versions).size === 1
    ? []
    : [`model version mismatch: ${versions.join(', ')}`];
}
```

- [ ] **Step 4: 创建三端校验入口**

创建 `tools/verify-dst-mods-demos.mjs`：

```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateStandaloneDemo,
  validateSharedContract
} from './lib/dst-mods-demo-validator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = {
  mac: path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html'),
  app: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端demo.html'),
  scene: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端-场景联动demo.html')
};

const only = process.argv.find(arg => arg.startsWith('--only='))?.split('=')[1];
const selected = only ? [entries[only]] : Object.values(entries);
if (selected.some(file => !file)) throw new Error(`Unknown --only value: ${only}`);

const errors = [];
for (const file of selected) errors.push(...await validateStandaloneDemo(file));
if (!only) errors.push(...await validateSharedContract(selected));

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`PASS DST MODS demos: ${only ?? 'all'}`);
}
```

- [ ] **Step 5: 确认旧 Demo 合同失败**

Run:

```powershell
node --test test/dst-mods/demo-validator.test.mjs
node tools/verify-dst-mods-demos.mjs
```

Expected: 单元测试 3/3 PASS；整包校验 FAIL，错误列出外部资源、旧游戏和缺少统一状态合同。

- [ ] **Step 6: 提交静态合同**

```powershell
git add -- `
  'tools/lib/dst-mods-demo-validator.mjs' `
  'test/dst-mods/demo-validator.test.mjs' `
  'tools/verify-dst-mods-demos.mjs'
git commit -m 'test(mods): define demo delivery contract'
```

### Task 2: 重构 Mac Demo

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `tools/verify-dst-mods-demos.mjs`

- [ ] **Step 1: 将页面收敛为 DST 游戏详情入口**

移除多游戏数组、一级 Mod 中心、点赞、收藏和排行榜。页面根结构固定为：

```html
<body>
  <div class="review-toolbar" data-review-toolbar></div>
  <main class="mac-shell" data-demo-root>
    <aside class="mac-sidebar" aria-label="盖世游戏导航"></aside>
    <section class="mac-content" data-view-root></section>
  </main>
  <div class="toast-region" aria-live="polite"></div>
  <script data-demo-contract>
    const DEMO_MODEL_VERSION = 'dst_mods_demo_v1';
    const GAME_ID = 'steam:322330';
    let state = createInitialState({
      platform: 'mac',
      orientation: 'not_applicable',
      deviceInstallationId: 'device-mac-demo-01'
    });
    window.__DST_MODS_DEMO__ = Object.freeze({
      version: DEMO_MODEL_VERSION,
      getState: () => structuredClone(state),
      dispatch,
      derive: () => structuredClone(derive(state)),
      reset
    });
    render();
  </script>
</body>
```

游戏详情必须同时展示：

```text
官方创意工坊 · 订阅管理
非官方 MODS · 当前设备本地管理
已安装 N 个 · 已启用 N 个 · 仅此设备
```

两个模块使用不同文字标签和数据容器，任何 MODS 动作都不能更新创意工坊区域。

- [ ] **Step 2: 实现 Mac 页面和状态派生**

实现以下渲染函数：

```javascript
function renderGameDetail(viewModel) {
  return `<section class="game-detail" data-screen="game-detail">
    <header><span class="eyebrow">STEAM · 322330</span><h1>饥荒联机版</h1></header>
    <section class="workshop-card">
      <span class="source-tag official">官方</span>
      <h2>创意工坊</h2><p>订阅管理</p>
    </section>
    <section class="mods-entry-card">
      <span class="source-tag unofficial">非官方来源</span>
      <h2>MODS</h2>
      <p>${viewModel.installedCount} 个已安装 · ${viewModel.enabledCount} 个已启用 · 仅此设备</p>
      <button data-action="open-mods">查看全部</button>
    </section>
  </section>`;
}

function renderModCard(mod, viewModel) {
  const status = viewModel.modStatus[mod.mod_id];
  return `<article class="mod-card" data-mod-id="${mod.mod_id}">
    <div class="mod-cover">${coverSvg(mod)}</div>
    <div class="mod-copy"><h3>${mod.name}</h3><p>${mod.summary}</p>
      <small>v${mod.latest_version} · ${mod.file_size} · 非官方来源</small>
      <strong>${status.label}</strong>
    </div>
    <button data-action="open-detail" data-mod-id="${mod.mod_id}">${status.action}</button>
  </article>`;
}

function renderModsLibrary(viewModel) {
  return `<section class="mods-library" data-screen="mods-library">
    <header><button data-action="back-game">返回</button><h1>DST MODS</h1></header>
    <nav><button data-action="set-tab" data-tab="available">可用 MOD</button>
      <button data-action="set-tab" data-tab="installed">已安装</button></nav>
    <div class="mods-grid">${viewModel.visibleMods.map(mod => renderModCard(mod, viewModel)).join('')}</div>
  </section>`;
}

function renderModDetail(mod, viewModel) {
  return `<div class="modal-layer" data-dialog="mod-detail">
    <article class="mod-detail"><button data-action="close-dialog">关闭</button>
      <div class="detail-cover">${coverSvg(mod)}</div>
      <div class="detail-copy"><span class="source-tag unofficial">非官方来源</span>
        <h2>${mod.name}</h2><p>${mod.description}</p>
        <section data-detail-section="dependencies"><h3>必要依赖</h3><p>${mod.dependencies_text}</p></section>
        <section data-detail-section="changelog"><h3>更新记录</h3><p>${mod.changelog}</p></section>
        <button data-action="${viewModel.primaryAction.type}" data-mod-id="${mod.mod_id}">
          ${viewModel.primaryAction.label}
        </button>
      </div>
    </article>
  </div>`;
}

function renderPreflight(viewModel) {
  return `<section data-screen="preflight"><h1>启动前检查</h1>
    ${['effective','skipped','risk'].map(group => `<section data-preflight-group="${group}">
      <h2>${viewModel.preflightLabels[group]}</h2>
      ${viewModel.preflightGroups[group].map(item => `<p>${item.name} · ${item.reason}</p>`).join('')}
    </section>`).join('')}
    <button data-action="launch-game">${viewModel.launchButtonLabel}</button>
  </section>`;
}

function renderEvidence(viewModel) {
  return `<section data-screen="evidence"><h1>实际加载证据</h1>
    ${viewModel.evidence.map(item => `<article data-evidence-result="${item.result}">
      <strong>${item.name}</strong><span>${item.result}</span><small>${item.version}</small>
    </article>`).join('')}
  </section>`;
}

function renderRecovery(viewModel) {
  return `<section data-screen="recovery"><h1>上次启动异常退出</h1>
    <p>${viewModel.changeSummary}</p>
    <button data-action="recovery-disable">停用本次变化后重试</button>
    <button data-action="recovery-no-mod">无 MOD 启动</button>
    <button data-action="recovery-keep">保持当前设置继续尝试</button>
  </section>`;
}

function renderReviewToolbar(viewModel) {
  return `<div class="review-actions">
    ${viewModel.reviewScenarios.map(item => `<button data-review-action="${item.action}">${item.label}</button>`).join('')}
  </div>`;
}
```

`derive(state)` 至少返回：

```javascript
{
  installedCount,
  enabledCount,
  activeTask,
  currentMod,
  availableMods,
  installedMods,
  primaryAction,
  preflightGroups: {
    effective: [],
    skipped: [],
    risk: []
  }
}
```

- [ ] **Step 3: 实现安装、更新、启停和卸载动作**

必须支持：

```text
OPEN_MODS
OPEN_DETAIL
INSTALL_REQUESTED
TASK_ADVANCE
ENABLE_CHANGED
UPDATE_REQUESTED
UPDATE_FAILED
UNINSTALL_REQUESTED
UNINSTALL_CONFIRMED
PREFLIGHT_REQUESTED
EVIDENCE_SCENARIO_SELECTED
ABNORMAL_EXIT_INJECTED
RECOVERY_ACTION_SELECTED
RESET
```

更新失败动作保持：

```javascript
mod.installation_fact = 'installed';
mod.active_version_pointer = previous.active_version_pointer;
mod.installed_version = previous.installed_version;
mod.enabled_value = previous.enabled_value;
mod.update_fact = 'update_available';
task.task_state = 'failed';
task.failure_code = 'PACKAGE_HASH_MISMATCH';
```

- [ ] **Step 4: 应用盖世游戏 UI 令牌和内联 SVG**

CSS 根令牌必须使用：

```css
:root {
  --bg-primary: #000000;
  --bg-card: #1a1a1a;
  --bg-elevated: #252525;
  --bg-overlay: #28202a;
  --text-primary: #ffffff;
  --text-secondary: #e6e6e6;
  --text-muted: #7b7b7b;
  --text-disabled: #646464;
  --brand-gold: #ffcc43;
  --brand-green: #33d8a4;
  --brand-blue: #338feb;
  --warning: #ff9b70;
  --border-default: #353d4e;
  --font-primary: 'MiSans VF', 'MiSans', 'PingFang SC', sans-serif;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
}
```

图标使用页面内的 `<svg><symbol>` sprite；封面使用 HTML 内联 SVG 和 CSS 渐变，不出现网络地址。

- [ ] **Step 5: 运行 Mac 静态合同**

Run:

```powershell
node tools/verify-dst-mods-demos.mjs --only=mac
```

Expected: PASS。

- [ ] **Step 6: 提交 Mac Demo**

```powershell
git add -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git commit -m 'feat(mods): rebuild mac demo'
```

### Task 3: 重构 APP 横竖屏主 Demo

**Files:**

- Modify: `demos/Mod与发行人/Mod功能APP端demo.html`
- Test: `tools/verify-dst-mods-demos.mjs`

- [ ] **Step 1: 建立一个状态源和两个布局渲染器**

页面只允许一份 `state`，方向切换动作固定为：

```javascript
case 'ORIENTATION_CHANGED': {
  next.orientation = action.orientation;
  return next;
}
```

方向切换不得调用 `ensureInstallTask()`、不得启动计时器、不得重置 `ui`。

页面结构：

```html
<body>
  <div class="review-toolbar" data-review-toolbar></div>
  <main class="app-stage">
    <section
      class="device"
      data-demo-root
      data-orientation="portrait"
      aria-label="盖世游戏 APP Demo"
    ></section>
  </main>
  <div class="toast-region" aria-live="polite"></div>
</body>
```

`render()` 根据 `state.orientation` 选择：

```javascript
function render() {
  const viewModel = derive(state);
  root.dataset.orientation = state.orientation;
  root.className = `device ${state.orientation}`;
  root.innerHTML = state.orientation === 'portrait'
    ? renderPortrait(viewModel)
    : renderLandscape(viewModel);
  restoreAnchors(state.ui);
}
```

- [ ] **Step 2: 实现 APP 页面**

竖屏：

- 390×844。
- DST 游戏详情“更多”菜单。
- 单列 MOD 卡片。
- 全屏详情。
- 已安装页。
- 底部任务面板。

横屏：

- 874×402。
- 左侧安全区和导航。
- 双列 MOD 卡片。
- 左预览、右信息详情。
- 已安装页。
- 任务暂停/续传区域。

两种方向使用同一：

```text
active_tab
search_text
sort_key
filter_key
current_mod_id
reading_section_id
list_anchor_mod_id
detail_anchor_section_id
active_dialog
task_id
progress_percent
```

- [ ] **Step 3: 实现暂停、前台续传和更新中启停**

动作规则：

```javascript
case 'SYSTEM_PAUSED':
  task.task_state = 'paused_by_system';
  break;
case 'APP_FOREGROUNDED':
  if (task.task_state === 'paused_by_system' && !task.auto_resume_used) {
    task.auto_resume_used = true;
    task.task_state = 'downloading';
  }
  break;
case 'CONTINUE_REQUESTED':
  task.task_state = 'downloading';
  break;
case 'CANCEL_REQUESTED':
  task.task_state = 'cancelled';
  break;
```

更新任务处于 `queued`、`downloading`、`paused_by_system`、`verifying`、`installing` 时，已安装旧版的启停开关必须常驻并可操作。

- [ ] **Step 4: 实现稳定锚点恢复**

切换方向前保存：

```javascript
function captureAnchors() {
  const listAnchor = document.querySelector('[data-list-anchor].is-nearest');
  const detailAnchor = document.querySelector('[data-detail-section].is-nearest');
  state.ui.listAnchorModId = listAnchor?.dataset.listAnchor ?? state.ui.listAnchorModId;
  state.ui.detailAnchorSectionId =
    detailAnchor?.dataset.detailSection ?? state.ui.detailAnchorSectionId;
}
```

渲染后使用 `requestAnimationFrame()` 把同一稳定 ID 恢复到可见区域，不能复制旧布局的原始 `scrollTop`。

- [ ] **Step 5: 运行 APP 静态合同**

Run:

```powershell
node tools/verify-dst-mods-demos.mjs --only=app
```

Expected: PASS。

- [ ] **Step 6: 提交 APP Demo**

```powershell
git add -- 'demos/Mod与发行人/Mod功能APP端demo.html'
git commit -m 'feat(mods): rebuild responsive app demo'
```

### Task 4: 重构 APP 场景联动 Demo

**Files:**

- Modify: `demos/Mod与发行人/Mod功能APP端-场景联动demo.html`
- Test: `tools/verify-dst-mods-demos.mjs`

- [ ] **Step 1: 收敛场景步骤**

固定场景：

```javascript
const SCENES = [
  'game-detail',
  'more-menu',
  'mods-library',
  'mod-detail',
  'install-task',
  'installed',
  'preflight',
  'launch-result',
  'load-evidence',
  'abnormal-exit',
  'recovery'
];
```

评审控制台提供上一步、下一步和场景跳转；控制台只派发 `SCENE_CHANGED`。

- [ ] **Step 2: 实现启动清单和证据**

启动检查必须生成：

```javascript
{
  manifest_id: 'manifest-demo-01',
  launch_id: 'launch-demo-01',
  game_id: 'steam:322330',
  device_installation_id: state.device_installation_id,
  items: [
    {
      mod_id: 'dst-fast-travel',
      local_version: '1.4.0',
      preflight_result: 'effective',
      load_decision: 'load',
      reason_code: null
    }
  ]
}
```

证据场景必须可切换：

```text
loaded_match
missing
version_mismatch
unexpected_loaded
log_unreadable
parser_failed
```

页面文案明确“安装成功或进入启动清单不等于实际加载”。

- [ ] **Step 3: 实现空清单和恢复建议**

无已启用 MOD：

```javascript
state.launch.items = [];
state.ui.screen = 'launch-result';
```

不显示额外风险确认。

只有 `manifestChanged === true && exitType === 'abnormal'` 时显示恢复建议。三个动作：

```text
disable_changes_and_retry
launch_without_mods
retry_with_current_settings
```

初始 `selectedAction = null`，不默认执行。

- [ ] **Step 4: 支持横竖屏共享状态**

复用 Task 3 的方向动作语义；场景编号、当前 MOD、任务、清单、证据和恢复选择跨方向保持。

- [ ] **Step 5: 运行场景 Demo 静态合同和整包合同**

Run:

```powershell
node tools/verify-dst-mods-demos.mjs --only=scene
node tools/verify-dst-mods-demos.mjs
```

Expected: 两条命令均 PASS，三份文件模型版本一致。

- [ ] **Step 6: 提交场景联动 Demo**

```powershell
git add -- 'demos/Mod与发行人/Mod功能APP端-场景联动demo.html'
git commit -m 'feat(mods): rebuild app scenario demo'
```

### Task 5: 建立浏览器运行时与截图验收

**Files:**

- Create: `tools/verify-dst-mods-demos-ui.mjs`
- Test: three Demo HTML files

- [ ] **Step 1: 创建 Playwright 验收脚本**

创建 `tools/verify-dst-mods-demos-ui.mjs`，基础结构：

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = path.join(root, '.tmp', 'dst-mods-demo-evidence');
fs.mkdirSync(evidenceDir, { recursive: true });

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const files = {
  mac: path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html'),
  app: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端demo.html'),
  scene: path.join(root, 'demos', 'Mod与发行人', 'Mod功能APP端-场景联动demo.html')
};
```

每次打开页面时：

```javascript
const externalRequests = [];
const pageErrors = [];
page.on('request', request => {
  if (/^https?:/.test(request.url())) externalRequests.push(request.url());
});
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
assert.deepEqual(externalRequests, []);
assert.deepEqual(pageErrors, []);
assert.equal(
  await page.evaluate(() => window.__DST_MODS_DEMO__.version),
  'dst_mods_demo_v1'
);
```

- [ ] **Step 2: 添加统一状态向量**

对三份文件分别执行：

```javascript
await page.evaluate(() => {
  const api = window.__DST_MODS_DEMO__;
  api.reset();
  api.dispatch({ type: 'OPEN_MODS' });
  api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel' });
  api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel' });
  api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel' });
});

const taskState = await page.evaluate(() => {
  const state = window.__DST_MODS_DEMO__.getState();
  return {
    currentTaskId: state.mods['dst-fast-travel'].current_task_id,
    taskCreateCount: state.metrics.taskCreateCount,
    taskIds: Object.keys(state.tasks)
  };
});
assert.equal(taskState.taskCreateCount, 1);
assert.equal(taskState.taskIds.length, 1);
assert.equal(taskState.currentTaskId, taskState.taskIds[0]);
```

更新失败向量断言旧版、启用值和 `update_available` 不变。

- [ ] **Step 3: 添加 APP 旋转连续性向量**

两个 APP 文件都执行：

```javascript
const before = await page.evaluate(() => {
  const api = window.__DST_MODS_DEMO__;
  api.dispatch({ type: 'SET_TAB', tab: 'installed' });
  api.dispatch({ type: 'SET_SEARCH', value: '快速旅行' });
  api.dispatch({ type: 'SET_SORT', value: 'updated' });
  api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel' });
  api.dispatch({ type: 'SET_READING_SECTION', sectionId: 'changelog' });
  api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel' });
  return api.getState();
});

await page.click('[data-action="orientation-landscape"]');
await page.click('[data-action="orientation-portrait"]');

const after = await page.evaluate(() => window.__DST_MODS_DEMO__.getState());
assert.equal(after.ui.tab, before.ui.tab);
assert.equal(after.ui.searchText, before.ui.searchText);
assert.equal(after.ui.sortKey, before.ui.sortKey);
assert.equal(after.ui.currentModId, before.ui.currentModId);
assert.equal(after.ui.readingSectionId, before.ui.readingSectionId);
assert.equal(
  after.mods['dst-fast-travel'].current_task_id,
  before.mods['dst-fast-travel'].current_task_id
);
assert.equal(after.metrics.taskCreateCount, 1);
```

- [ ] **Step 4: 添加视觉和溢出断言**

检查：

```javascript
const layout = await page.locator('[data-demo-root]').evaluate(element => ({
  scrollWidth: element.scrollWidth,
  clientWidth: element.clientWidth,
  width: element.getBoundingClientRect().width,
  height: element.getBoundingClientRect().height
}));
assert(layout.scrollWidth <= layout.clientWidth + 2);
```

APP 竖屏断言 390×844，横屏断言 874×402；主要按钮高度不小于 44px。

- [ ] **Step 5: 截取视觉证据**

输出：

```text
mac-game-detail.png
mac-mod-detail.png
mac-preflight.png
app-portrait-list.png
app-portrait-task.png
app-landscape-detail.png
app-landscape-paused.png
scene-preflight.png
scene-loaded-match.png
scene-recovery.png
```

每张截图使用 `[data-demo-root]` 或产品设备容器，不把评审控制台混入产品截图。

- [ ] **Step 6: 运行浏览器验收**

Run:

```powershell
node tools/verify-dst-mods-demos-ui.mjs
```

Expected:

```text
PASS mac runtime
PASS app runtime
PASS scene runtime
Captured 10 DST MODS demo screenshots
```

- [ ] **Step 7: 提交运行时验收脚本**

```powershell
git add -- 'tools/verify-dst-mods-demos-ui.mjs'
git commit -m 'test(mods): verify demo runtime and visuals'
```

### Task 6: 视觉审查、体验评审和最终交付

**Files:**

- Test: all three Demo HTML files
- Test: `tools/verify-dst-mods-demos.mjs`
- Test: `tools/verify-dst-mods-demos-ui.mjs`

- [ ] **Step 1: 逐张检查 10 张截图**

使用本地图片查看工具检查：

- 色彩是否只使用设计令牌。
- 字号是否形成 32 / 20 / 16 / 14 / 12 层级。
- 卡片、按钮、弹窗圆角是否统一。
- Mac、竖屏和横屏没有截断、遮挡和横向溢出。
- “官方”“非官方来源”“仅此设备”能同时通过文字和颜色识别。
- 评审控制台未出现在产品截图中。

发现问题时只修改对应 HTML，然后重新运行浏览器验收并覆盖截图。

- [ ] **Step 2: 执行三角色体验评审**

产品经理检查：

- 三份 Demo 是否覆盖各自最小页面和状态。
- 是否残留一级 Mod 导航、点赞、收藏、排行榜和跨游戏内容。

交互设计师检查：

- 安装、启停、更新、卸载、启动检查和恢复路径是否可理解。
- APP 旋转和暂停续传是否有明确反馈。

开发工程师检查：

- 三份模型版本、字段和动作是否一致。
- `render()` 与方向切换是否没有副作用。
- 是否仍有外部请求、控制台错误或重复任务。

必须修问题立即修正；可选建议单列，不影响最终合同时不扩大范围。

- [ ] **Step 3: 运行全量自动化**

Run:

```powershell
node --test test/dst-mods/demo-validator.test.mjs
node tools/verify-dst-mods-demos.mjs
node tools/verify-dst-mods-demos-ui.mjs
```

Expected:

- 静态单元测试 3/3 PASS。
- 三端静态合同 PASS。
- Mac、APP、场景联动运行时 PASS。
- 10 张截图存在且文件大小大于 0。

- [ ] **Step 4: 检查未完成标记、外部资源和工作区边界**

Run:

```powershell
$files = @(
  'demos/Mod与发行人/Mod功能Mac端demo.html',
  'demos/Mod与发行人/Mod功能APP端demo.html',
  'demos/Mod与发行人/Mod功能APP端-场景联动demo.html',
  'tools/lib/dst-mods-demo-validator.mjs',
  'test/dst-mods/demo-validator.test.mjs',
  'tools/verify-dst-mods-demos.mjs',
  'tools/verify-dst-mods-demos-ui.mjs'
)
$terms = @(('T' + 'ODO'), ('T' + 'BD'), ('待' + '补充'), ('后续' + '完善'))
$hits = Select-String -LiteralPath $files -Pattern $terms -SimpleMatch
if ($hits) { $hits; throw 'Unresolved marker found' }
git diff --check -- $files
git status --short -- $files
```

Expected: 无未完成标记、无空白错误；任务文件干净；旧参考图和其他用户文件没有新增修改。

- [ ] **Step 5: 最终提交**

若视觉整改产生未提交修改：

```powershell
git add -- `
  'demos/Mod与发行人/Mod功能Mac端demo.html' `
  'demos/Mod与发行人/Mod功能APP端demo.html' `
  'demos/Mod与发行人/Mod功能APP端-场景联动demo.html'
git commit -m 'fix(mods): polish demo review states'
```

最终交付必须说明：

```text
已更新：Mac、APP 横竖屏、APP 场景联动三份 Demo。
已验证：离线打开、统一状态模型、旋转连续性、任务幂等、启动证据和恢复路径。
当前模拟：下载、文件操作、游戏启动和日志读取；不代表真实客户端技术 Go/No-Go 已通过。
```
