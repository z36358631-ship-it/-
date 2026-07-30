# Mac MODS 参考图 1:1 还原 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 只重构 `Mod功能Mac端demo.html`，按四张 2160×1480 Mac 参考图还原入口、列表与详情弹窗，并将 MODS 改为当前设备非官方本地安装管理。

**Architecture:** 单文件 HTML 内使用固定 2160×1480 设计画布，浏览器只对整幅画布等比缩放；页面采用 `dispatch → reducer → derive → render` 单向数据流。参考图中的 MOD 缩略图机械裁切后转为 `data:` URI 内嵌，Mac 外壳、侧栏、卡片和弹窗均由真实 DOM/CSS 构建，不使用整张截图覆盖。

**Tech Stack:** HTML、CSS、原生 JavaScript、内联 SVG、PowerShell `System.Drawing`、Node.js、Playwright Core、本机 Chrome

---

## 1. 文件边界

永久修改：

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

只用于运行时证据，不提交：

- Create: `.tmp/mac-mods-reference-assets/`
- Create: `.tmp/mac-mods-reference-evidence/`
- Create: `.tmp/verify-mac-mods-reference.mjs`

读取但不得修改：

- `prd/mod功能/Mac端mod图片/mod游戏详情入口.jpg`
- `prd/mod功能/Mac端mod图片/mod列表.jpg`
- `prd/mod功能/Mac端mod图片/mod方案详情第1屏.jpg`
- `prd/mod功能/Mac端mod图片/mod方案详情第2屏.jpg`
- `docs/superpowers/specs/2026-07-30-mac-mods-reference-fidelity-design.md`
- `demos/Mod与发行人/Mod功能APP端demo.html`
- `demos/Mod与发行人/Mod功能APP端-场景联动demo.html`

## 2. 固定业务约束

主画布只允许以下场景：

```text
game-detail
mods-list
mod-detail
```

不得显示：

```text
启动检查
游戏启动结果
加载证据
异常恢复
```

保留调试接口：

```javascript
window.__DST_MODS_DEMO__ = Object.freeze({
  version: DEMO_MODEL_VERSION,
  getState: () => structuredClone(state),
  dispatch,
  derive: () => structuredClone(derive(state)),
  reset
});
```

## Task 1: 建立参考坐标与失败基线

**Files:**

- Read: `prd/mod功能/Mac端mod图片/*.jpg`
- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Create: `.tmp/verify-mac-mods-reference.mjs`

- [ ] **Step 1: 记录参考图尺寸**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
Get-ChildItem -LiteralPath 'prd/mod功能/Mac端mod图片' -File | ForEach-Object {
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  [pscustomobject]@{
    Name = $_.Name
    Width = $image.Width
    Height = $image.Height
  }
  $image.Dispose()
}
```

Expected: 四张图均为 `2160 × 1480`。

- [ ] **Step 2: 创建临时结构验收脚本**

使用 `apply_patch` 创建 `.tmp/verify-mac-mods-reference.mjs`，内容：

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const file = path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html');
const evidence = path.join(root, '.tmp', 'mac-mods-reference-evidence');
fs.mkdirSync(evidence, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 2160, height: 1480 } });
const external = [];
const errors = [];
page.on('request', request => {
  if (/^https?:/i.test(request.url())) external.push(request.url());
});
page.on('pageerror', error => errors.push(error.message));
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
await page.locator('[data-demo-root]').waitFor();

const box = async selector => page.locator(selector).boundingBox();
assert.deepEqual(await box('[data-demo-root]'), { x: 0, y: 0, width: 2160, height: 1480 });
assert.equal(await page.evaluate(() => window.__DST_MODS_DEMO__.version), 'dst_mods_demo_v1');
assert.deepEqual(external, []);
assert.deepEqual(errors, []);

await browser.close();
```

- [ ] **Step 3: 运行旧 Demo 并确认红灯**

Run:

```powershell
node .tmp/verify-mac-mods-reference.mjs
```

Expected: FAIL，旧 Demo 的 `[data-demo-root]` 不是 2160×1480 参考画布。

## Task 2: 裁切并内嵌参考素材

**Files:**

- Read: `prd/mod功能/Mac端mod图片/mod列表.jpg`
- Read: `prd/mod功能/Mac端mod图片/mod游戏详情入口.jpg`
- Create: `.tmp/mac-mods-reference-assets/*.jpg`
- Create: `.tmp/embed-mac-mod-assets.mjs`
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 从参考图裁切 MOD 封面**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
$out = '.tmp/mac-mods-reference-assets'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Save-Crop($source, $target, $x, $y, $width, $height) {
  $image = [System.Drawing.Bitmap]::FromFile($source)
  $crop = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($crop)
  $graphics.DrawImage(
    $image,
    (New-Object System.Drawing.Rectangle 0, 0, $width, $height),
    (New-Object System.Drawing.Rectangle $x, $y, $width, $height),
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $crop.Save($target, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $graphics.Dispose()
  $crop.Dispose()
  $image.Dispose()
}

$list = 'prd/mod功能/Mac端mod图片/mod列表.jpg'
Save-Crop $list \"$out/minimap-hud.jpg\" 208 889 634 356
Save-Crop $list \"$out/combined-status.jpg\" 871 889 634 356
```

Expected: 两张 `634×356` 封面存在且大小大于 10KB。

- [ ] **Step 2: 创建机械嵌入脚本**

使用 `apply_patch` 创建 `.tmp/embed-mac-mod-assets.mjs`：

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlPath = path.join(root, 'demos', 'Mod与发行人', 'Mod功能Mac端demo.html');
const assets = {
  '__ASSET_MINIMAP_HUD__': path.join(root, '.tmp', 'mac-mods-reference-assets', 'minimap-hud.jpg'),
  '__ASSET_COMBINED_STATUS__': path.join(root, '.tmp', 'mac-mods-reference-assets', 'combined-status.jpg')
};

let html = fs.readFileSync(htmlPath, 'utf8');
for (const [marker, assetPath] of Object.entries(assets)) {
  assert(html.includes(marker), `missing marker ${marker}`);
  const dataUri = `data:image/jpeg;base64,${fs.readFileSync(assetPath).toString('base64')}`;
  html = html.replaceAll(marker, dataUri);
}
fs.writeFileSync(htmlPath, html, 'utf8');
```

- [ ] **Step 3: 在 HTML 中建立资源标记并执行嵌入**

先使用 `apply_patch` 把资源表写入目标 HTML：

```javascript
const EMBEDDED_ASSETS = Object.freeze({
  minimapHud: '__ASSET_MINIMAP_HUD__',
  combinedStatus: '__ASSET_COMBINED_STATUS__'
});
```

再运行：

```powershell
node .tmp/embed-mac-mod-assets.mjs
```

验收：

```powershell
rg -n \"__ASSET_|prd/mod功能|file:|https?://\" -- `
  'demos/Mod与发行人/Mod功能Mac端demo.html'
```

Expected: 无匹配。

## Task 3: 重建 2160×1480 Mac 外壳和游戏详情入口

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-reference.mjs`

- [ ] **Step 1: 重建固定画布骨架**

目标 DOM：

```html
<body>
  <main class="stage">
    <section class="mac-canvas" data-demo-root data-screen="game-detail">
      <div class="mac-traffic-lights" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <aside class="side-rail" data-reference-region="side-rail"></aside>
      <section class="product-view" data-view-root></section>
    </section>
  </main>
  <aside class="review-panel" data-review-panel></aside>
  <div class="toast-region" aria-live="polite"></div>
</body>
```

固定 CSS：

```css
:root {
  --canvas-width: 2160;
  --canvas-height: 1480;
  --bg-window: #1c1b20;
  --bg-rail: #222126;
  --bg-card: #242328;
  --bg-card-raised: #2b2a2f;
  --border: rgba(255,255,255,.10);
  --text-primary: #f6f6f7;
  --text-secondary: #b9b7bd;
  --text-muted: #85838a;
}

.stage {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #0d0d0f;
}

.mac-canvas {
  position: relative;
  width: 2160px;
  height: 1480px;
  flex: none;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 32px;
  background: var(--bg-window);
  transform: scale(var(--canvas-scale, 1));
}
```

缩放逻辑：

```javascript
function fitCanvas() {
  const scale = Math.min(innerWidth / 2160, innerHeight / 1480);
  document.querySelector('[data-demo-root]').style.setProperty('--canvas-scale', scale);
}
addEventListener('resize', fitCanvas);
fitCanvas();
```

- [ ] **Step 2: 建立通用渲染辅助**

页面内 SVG sprite 使用 `i-back`、`i-home`、`i-cloud`、`i-stats`、`i-gamepad`、`i-grid`、`i-device`、`i-search`、`i-download`、`i-refresh`、`i-box` 和 `i-close`。渲染辅助固定为：

```javascript
function icon(name, className = '') {
  return `<svg class="icon ${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll(\"'\", '&#039;');
}
```

- [ ] **Step 3: 重建侧栏**

侧栏基准框：

```text
x = 28
y = 76
width = 132
height = 1376
radius = 34
```

使用内联 SVG 绘制返回、首页、云、统计、手柄、九宫格、设备、搜索、下载和头像图标。所有图标以参考图中心线排列，不加入文字标签。

- [ ] **Step 4: 重建游戏详情参考滚动位置**

`renderGameDetail(viewModel)` 必须输出：

```html
<section class="game-detail reference-entry" data-screen="game-detail">
  <section class="compatibility-card"></section>
  <h1>游戏详情</h1>
  <section class="workshop-card" aria-label="创意工坊静态参考"></section>
  <button class="mods-entry-card" data-action="open-mods"></button>
  <section class="explore-card"></section>
</section>
```

MODS 入口内容：

```text
MODS
4 个可用 MOD · ${installedCount} 个已安装 · 仅此设备
```

创意工坊区域不得读取 `mods`、`tasks` 或 `metrics`。

- [ ] **Step 5: 扩充结构断言**

向临时验收脚本加入：

```javascript
const closeTo = (actual, expected, tolerance = 4) =>
  assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

const rail = await box('[data-reference-region="side-rail"]');
closeTo(rail.x, 28);
closeTo(rail.y, 76);
closeTo(rail.width, 132);
closeTo(rail.height, 1376);

const modsEntry = await box('[data-reference-region="mods-entry"]');
closeTo(modsEntry.x, 207);
closeTo(modsEntry.width, 1300);
```

- [ ] **Step 6: 运行入口结构测试**

Run:

```powershell
node .tmp/verify-mac-mods-reference.mjs
node tools/verify-dst-mods-demos.mjs --only=mac
```

Expected: 两条命令均 PASS。

## Task 4: 重建 MODS 两列列表

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-reference.mjs`

- [ ] **Step 1: 定义四个 MOD**

状态必须至少包含：

```javascript
function createMod(input) {
  return {
    mod_id: input.mod_id,
    name: input.name,
    summary: input.summary,
    latest_version: input.latest_version,
    file_size: input.file_size,
    cover: input.cover,
    source_label: '非官方来源',
    installation_fact: 'not_installed',
    enabled_value: 'not_applicable',
    update_fact: 'no_update',
    install_gate: 'allowed',
    installed_version: null,
    active_version_pointer: null,
    current_task_id: null
  };
}

{
  'dst-large-b': createMod({
    mod_id: 'dst-large-b',
    name: 'DST Large Mod B',
    summary: '1.1 GiB 分卷内容包',
    latest_version: '1.2.0',
    file_size: '1.1 GiB',
    cover: 'placeholder'
  }),
  'dst-large-a': createMod({
    mod_id: 'dst-large-a',
    name: 'DST Large Mod A',
    summary: '1.1 GiB 分卷内容包',
    latest_version: '1.2.0',
    file_size: '1.1 GiB',
    cover: 'placeholder'
  }),
  'dst-fast-travel': createMod({
    mod_id: 'dst-fast-travel',
    name: '小地图 HUD',
    summary: '在 HUD 中添加可缩放、拖动和独立保存设置的小地图。',
    latest_version: '1.4.0',
    file_size: '18.6 MB',
    cover: 'minimapHud'
  }),
  'dst-combined-status': createMod({
    mod_id: 'dst-combined-status',
    name: '组合状态',
    summary: '显示玩家状态和世界信息，包括温度、季节、月相与世界天数。',
    latest_version: '2.3.1',
    file_size: '9.8 MB',
    cover: 'combinedStatus'
  })
}
```

每个 MOD 保留：

```text
installation_fact
enabled_value
update_fact
install_gate
installed_version
active_version_pointer
current_task_id
```

- [ ] **Step 2: 实现列表渲染**

先实现状态派生和卡片：

```javascript
function derive(current) {
  const allMods = Object.values(current.mods);
  const search = current.ui.searchText.trim().toLowerCase();
  const visibleMods = search
    ? allMods.filter(mod =>
        `${mod.name} ${mod.summary}`.toLowerCase().includes(search)
      )
    : allMods;
  return {
    state: current,
    installedCount: allMods.filter(mod => mod.installation_fact === 'installed').length,
    enabledCount: allMods.filter(mod => mod.enabled_value === 'enabled').length,
    visibleMods,
    searchText: current.ui.searchText,
    currentMod: current.ui.currentModId ? current.mods[current.ui.currentModId] : null
  };
}

function renderModCard(mod) {
  const installed = mod.installation_fact === 'installed';
  const status = installed
    ? `已安装 · ${mod.enabled_value === 'enabled' ? '已启用' : '未启用'} · 仅此设备`
    : '未安装 · 仅此设备';
  const cover = mod.cover === 'placeholder'
    ? `<div class="placeholder-cover">${icon('box')}</div>`
    : `<img src="${EMBEDDED_ASSETS[mod.cover]}" alt="">`;
  return `<article class="mod-card" data-mod-card data-mod-id="${mod.mod_id}">
    <div class="mod-cover">${cover}</div>
    <div class="mod-copy">
      <h2>${escapeHtml(mod.name)}</h2>
      <p>${escapeHtml(mod.summary)}</p>
      <small>${escapeHtml(mod.source_label)} · v${escapeHtml(mod.latest_version)} · ${escapeHtml(mod.file_size)}</small>
      <strong>${status}</strong>
    </div>
    <footer>
      <button class="install-button" data-action="install" data-mod-id="${mod.mod_id}">
        ${icon(installed ? 'box' : 'download')}${installed ? '已安装' : '安装'}
      </button>
      <button class="detail-button" data-action="open-detail" data-mod-id="${mod.mod_id}">详情</button>
    </footer>
  </article>`;
}
```

```javascript
function renderModsList(viewModel) {
  return `<section class="mods-list" data-screen="mods-list">
    <button class="back-detail" data-action="back-game">‹ 返回详情</button>
    <header class="mods-list-header">
      <div>
        <h1>MODS</h1>
        <p>4 个可用 MOD，可安装到当前设备</p>
      </div>
      <div class="list-tools">
        <label class="search-field">
          ${icon('search')}
          <input data-input="search" placeholder="搜索 MOD" value="${escapeHtml(viewModel.searchText)}">
        </label>
        <button class="refresh-button" data-action="refresh">${icon('refresh')}刷新</button>
      </div>
    </header>
    <div class="mods-grid">
      ${viewModel.visibleMods.map(renderModCard).join('')}
    </div>
  </section>`;
}
```

列表坐标：

```text
主内容左边界 = 207
第一列宽度 = 636
第二列 x = 870
第二列宽度 = 636
列间距 = 27
卡片圆角 = 24
```

- [ ] **Step 3: 实现搜索和刷新**

Reducer：

```javascript
case 'SET_SEARCH':
  next.ui.searchText = action.value;
  return next;
case 'REFRESH_REQUESTED':
  next.ui.refreshing = true;
  return next;
case 'REFRESH_FINISHED':
  next.ui.refreshing = false;
  return next;
```

刷新按钮只改变原位置图标和文案，不重排卡片。

- [ ] **Step 4: 添加列表结构断言**

```javascript
await page.evaluate(() => window.__DST_MODS_DEMO__.dispatch({ type: 'OPEN_MODS' }));
const cards = page.locator('[data-mod-card]');
assert.equal(await cards.count(), 4);
const first = await cards.nth(0).boundingBox();
const second = await cards.nth(1).boundingBox();
closeTo(first.x, 207);
closeTo(first.width, 636);
closeTo(second.x, 870);
closeTo(second.width, 636);
```

- [ ] **Step 5: 运行列表测试**

Run:

```powershell
node .tmp/verify-mac-mods-reference.mjs
```

Expected: PASS。

## Task 5: 重建详情弹窗和当前设备操作

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-reference.mjs`

- [ ] **Step 1: 实现详情弹窗**

详情说明和底栏辅助固定为：

```javascript
function renderDescription(mod) {
  return `<p>${escapeHtml(mod.summary)}</p>
    <h4>功能</h4>
    <p>可在游戏 HUD 中显示辅助信息，设置只保存在当前设备。</p>
    <h4>常见问题</h4>
    <p>问：该 MOD 会修改云端存档吗？</p>
    <p>答：不会。卸载也不会删除存档和用户 MOD 配置。</p>
    <h4>来源</h4>
    <p>外部非官方来源 · 当前设备本地管理</p>`;
}

function renderDetailActionBar(mod, viewModel) {
  const task = mod.current_task_id ? viewModel.state.tasks[mod.current_task_id] : null;
  if (mod.install_gate !== 'allowed') {
    return '<footer class="modal-action-bar"><button disabled>当前不可安装</button></footer>';
  }
  if (task && !['succeeded', 'failed', 'cancelled'].includes(task.task_state)) {
    return `<footer class="modal-action-bar"><button disabled>下载中 ${task.progress_percent}%</button></footer>`;
  }
  if (mod.installation_fact !== 'installed') {
    return `<footer class="modal-action-bar"><button data-action="install" data-mod-id="${mod.mod_id}">${icon('download')}安装到此设备</button></footer>`;
  }
  return `<footer class="modal-action-bar installed-actions">
    <button data-action="toggle-enabled" data-mod-id="${mod.mod_id}">${mod.enabled_value === 'enabled' ? '停用' : '启用'}</button>
    <button data-action="request-update" data-mod-id="${mod.mod_id}">${mod.update_fact === 'update_available' ? '更新' : '检查更新'}</button>
    <button data-action="request-uninstall" data-mod-id="${mod.mod_id}">卸载</button>
  </footer>`;
}
```

```javascript
function renderModDetail(viewModel) {
  const mod = viewModel.currentMod;
  return `<div class="modal-backdrop" data-modal-backdrop>
    <article class="mod-detail-modal" data-reference-region="mod-detail-modal">
      <header class="modal-header">
        <h2>${escapeHtml(mod.name)}</h2>
        <button data-action="close-detail" aria-label="关闭">${icon('close')}</button>
      </header>
      <div class="modal-scroll" data-detail-scroll>
        <img class="detail-cover" src="${EMBEDDED_ASSETS[mod.cover]}" alt="">
        <h3 class="section-title">说明</h3>
        <section class="description-card">${renderDescription(mod)}</section>
      </div>
      ${renderDetailActionBar(mod, viewModel)}
    </article>
  </div>`;
}
```

弹窗基准框：

```text
x = 359
y = 118
width = 1442
height = 1244
radius = 48
```

标题栏和底部操作栏固定，只有 `.modal-scroll` 可滚动。

- [ ] **Step 2: 实现安装幂等**

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
    operation_attempt: 1
  };
  mod.current_task_id = taskId;
  next.metrics.taskCreateCount += 1;
  return taskId;
}
```

任务阶段：

```text
queued → downloading → verifying → installing → succeeded
```

- [ ] **Step 3: 实现详情底栏状态**

```text
未安装：安装到此设备
依赖阻塞：当前不可安装
安装中：下载中 42%
已安装且启用：已启用 / 检查更新 / 卸载
已安装且停用：启用 / 检查更新 / 卸载
有更新：更新 / 启停旧版 / 卸载
更新失败：保留旧版 / 重试更新 / 卸载
```

详情默认状态必须仍与参考图相同：单个白色全宽安装按钮。

- [ ] **Step 4: 实现卸载确认**

弹窗文案：

```text
仅从当前设备卸载“小地图 HUD”
存档和用户 MOD 配置不会被删除。
```

确认后：

```javascript
mod.installation_fact = 'not_installed';
mod.enabled_value = 'not_applicable';
mod.installed_version = null;
mod.active_version_pointer = null;
mod.current_task_id = null;
```

- [ ] **Step 5: 添加状态向量**

```javascript
await page.evaluate(() => {
  const api = window.__DST_MODS_DEMO__;
  api.reset();
  api.dispatch({ type: 'OPEN_MODS' });
  api.dispatch({ type: 'OPEN_DETAIL', modId: 'dst-fast-travel' });
  api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel' });
  api.dispatch({ type: 'INSTALL_REQUESTED', modId: 'dst-fast-travel' });
});
const task = await page.evaluate(() => {
  const state = window.__DST_MODS_DEMO__.getState();
  return {
    taskIds: Object.keys(state.tasks),
    taskCreateCount: state.metrics.taskCreateCount,
    currentTaskId: state.mods['dst-fast-travel'].current_task_id
  };
});
assert.equal(task.taskIds.length, 1);
assert.equal(task.taskCreateCount, 1);
assert.equal(task.currentTaskId, task.taskIds[0]);
```

- [ ] **Step 6: 运行详情和任务测试**

Run:

```powershell
node .tmp/verify-mac-mods-reference.mjs
node tools/verify-dst-mods-demos.mjs --only=mac
```

Expected: 两条命令均 PASS。

## Task 6: 截取四张基准图并做视觉自检

**Files:**

- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Create: `.tmp/mac-mods-reference-evidence/*.png`

- [ ] **Step 1: 在临时脚本中加入截图**

```javascript
const rootShot = name =>
  page.locator('[data-demo-root]').screenshot({ path: path.join(evidence, name) });

await page.evaluate(() => window.__DST_MODS_DEMO__.reset());
await rootShot('mac-reference-entry.png');

await page.evaluate(() => window.__DST_MODS_DEMO__.dispatch({ type: 'OPEN_MODS' }));
await rootShot('mac-reference-list.png');

await page.evaluate(() => window.__DST_MODS_DEMO__.dispatch({
  type: 'OPEN_DETAIL',
  modId: 'dst-fast-travel'
}));
await rootShot('mac-reference-detail-top.png');

await page.locator('[data-detail-scroll]').evaluate(element => {
  element.scrollTop = Math.min(620, element.scrollHeight - element.clientHeight);
});
await rootShot('mac-reference-detail-scroll.png');
```

- [ ] **Step 2: 运行截图**

Run:

```powershell
node .tmp/verify-mac-mods-reference.mjs
```

Expected: 四张 2160×1480 PNG 均存在且大于 50KB。

- [ ] **Step 3: 逐张视觉检查**

使用本地图片查看工具检查：

```text
入口：侧栏、游戏详情标题、创意工坊、MODS 卡片和一起探索位置一致。
列表：返回按钮、标题、搜索、刷新、两列卡片和右侧留白一致。
详情顶部：弹窗、标题栏、关闭按钮、大封面、说明标题和白色底栏一致。
详情滚动：封面下缘、长说明卡片和固定底栏一致。
```

发现偏差时只修改 Mac HTML，然后重新生成四张截图。

- [ ] **Step 4: 检查启动内容未出现**

Run:

```powershell
rg -n \"启动前检查|启动检查|实际加载证据|异常恢复|恢复建议\" -- `
  'demos/Mod与发行人/Mod功能Mac端demo.html'
```

Expected: 无匹配。

## Task 7: 最终三角色验收和提交

**Files:**

- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/mac-mods-reference-evidence/*.png`

- [ ] **Step 1: 产品验收**

检查：

```text
只包含入口、列表、详情。
创意工坊与 MODS 语义隔离。
MODS 只作用于当前设备。
入口数字、列表和详情状态一致。
```

- [ ] **Step 2: 交互验收**

检查：

```text
返回、搜索、刷新、详情、关闭、滚动和安装可操作。
详情底栏固定且不遮挡说明。
默认四张画面与参考图一致。
```

- [ ] **Step 3: 开发验收**

Run:

```powershell
node tools/verify-dst-mods-demos.mjs --only=mac
node .tmp/verify-mac-mods-reference.mjs
git diff --check -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git status --short -- `
  'demos/Mod与发行人/Mod功能Mac端demo.html' `
  'demos/Mod与发行人/Mod功能APP端demo.html' `
  'demos/Mod与发行人/Mod功能APP端-场景联动demo.html'
```

Expected:

```text
Mac 静态合同 PASS。
参考结构、离线、任务幂等和截图 PASS。
无空白错误。
两个 APP Demo 没有本轮修改。
```

- [ ] **Step 4: 精确提交 Mac Demo**

```powershell
git add -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git diff --cached --check
git diff --cached --name-only
git commit -m 'feat(mods): match mac reference screens'
```

Expected: 暂存和提交只包含 `Mod功能Mac端demo.html`。
