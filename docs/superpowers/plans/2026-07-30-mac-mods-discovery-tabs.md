# Mac MODS Discovery Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Mac MODS 高保真 Demo 中加入创意工坊式热门入口、浏览/已安装双 Tab、排序筛选和下载量等内容元数据，同时保持非官方当前设备安装管理语义。

**Architecture:** 继续使用单文件 HTML、固定 2160×1480 画布和 `dispatch → reducer → derive → render` 单向数据流。8 条目录样例、4 条默认已安装状态、3 个热门条目、排序筛选和详情摘要都从统一状态派生；创意工坊保持完全静态。

**Tech Stack:** HTML、CSS、原生 JavaScript、内联 SVG、内嵌 data URI、Node.js、Playwright Core、本机 Chrome

---

## 1. 文件边界

永久修改：

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

临时验证，不提交：

- Create: `.tmp/verify-mac-mods-discovery.mjs`
- Create: `.tmp/mac-mods-discovery-evidence/*.png`

只读：

- `docs/superpowers/specs/2026-07-30-mac-mods-discovery-tabs-design.md`
- `demos/Mod与发行人/Mod功能APP端demo.html`
- `demos/Mod与发行人/Mod功能APP端-场景联动demo.html`
- `tools/verify-dst-mods-demos.mjs`
- `.tmp/verify-mac-mods-reference.mjs`
- `.tmp/verify-mac-mods-dom-flow.mjs`

## 2. 固定约束

- `DEMO_MODEL_VERSION = 'dst_mods_demo_v1'`
- `GAME_ID = 'steam:322330'`
- `window.__DST_MODS_DEMO__` 保持冻结并提供 `getState / dispatch / derive / reset`
- 创意工坊 DOM 不读取 `mods`、`tasks`、`ui` 或 `metrics`
- MODS 不出现订阅语义
- 不出现启动、证据或恢复页面
- 不引入外部请求、网络图片、CDN、XHR、`fetch` 或 iframe
- 两个 APP Demo 不得修改

### Task 1: 建立发现与管理验收红灯

**Files:**

- Create: `.tmp/verify-mac-mods-discovery.mjs`
- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 创建临时 Playwright 验收器**

验收器必须以 2160×1480 打开 Mac Demo，收集外部请求、页面错误和控制台错误，并定义：

```javascript
const api = () => page.evaluate(() => window.__DST_MODS_DEMO__);
const dispatch = action => page.evaluate(
  input => window.__DST_MODS_DEMO__.dispatch(input),
  action
);
const getState = () => page.evaluate(
  () => window.__DST_MODS_DEMO__.getState()
);
```

加入以下结构断言：

```javascript
await page.locator('[data-reference-region="mods-entry"]').waitFor();
assert.equal(await page.locator('[data-featured-mod]').count(), 3);
assert.match(
  await page.locator('[data-reference-region="mods-entry"]').innerText(),
  /128\s*个\s*MOD/
);
assert.match(
  await page.locator('[data-reference-region="mods-entry"]').innerText(),
  /查看全部/
);

await dispatch({ type: 'OPEN_MODS', tab: 'browse' });
assert.equal(await page.locator('[data-mod-tab]').count(), 2);
assert.equal(await page.locator('[data-mod-card]').count(), 8);
assert.match(await page.locator('[data-catalog-summary]').innerText(), /128/);
```

加入以下数据和交互断言：

```javascript
const initial = await getState();
assert.equal(Object.keys(initial.mods).length, 8);
assert.equal(
  Object.values(initial.mods)
    .filter(mod => mod.installation_fact === 'installed').length,
  4
);

for (const id of ['dst-fast-travel', 'dst-combined-status']) {
  assert.equal(typeof initial.mods[id].download_count, 'number');
  assert(initial.mods[id].updated_at);
  assert.equal(typeof initial.mods[id].popularity_rank, 'number');
  assert(initial.mods[id].compatibility_label);
}
```

加入排序与筛选动作：

```javascript
await dispatch({ type: 'SET_BROWSE_SORT', value: 'downloads' });
const downloadOrder = await page.locator('[data-mod-card]')
  .evaluateAll(cards => cards.map(card => card.dataset.modId));
assert.deepEqual(downloadOrder.slice(0, 3), [
  'dst-fast-travel',
  'dst-combined-status',
  'dst-smart-stack'
]);

await dispatch({ type: 'SET_ACTIVE_TAB', value: 'installed' });
assert.equal(await page.locator('[data-mod-card]').count(), 4);
await dispatch({ type: 'SET_INSTALLED_FILTER', value: 'update' });
assert.equal(await page.locator('[data-mod-card]').count(), 2);
```

- [ ] **Step 2: 加入热门详情返回与创意工坊隔离断言**

```javascript
const workshopBefore = await page.locator('.workshop-card').innerHTML();
await page.locator('[data-featured-mod="dst-fast-travel"]').click();
await page.locator('[data-reference-region="mod-detail-modal"]').waitFor();
await page.locator('[data-action="close-detail"]').click();
await page.locator('[data-screen="game-detail"]').waitFor();
assert.equal(await page.locator('.workshop-card').innerHTML(), workshopBefore);
```

- [ ] **Step 3: 运行旧 Demo 并确认红灯**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: FAIL，旧 Demo 缺少 3 个热门条目、双 Tab、8 条目录数据和发现元数据。

### Task 2: 扩充目录数据和统一状态

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 扩充 `createMod` 字段**

在现有 `createMod(input)` 返回值中加入：

```javascript
download_count: input.download_count,
updated_at: input.updated_at,
popularity_rank: input.popularity_rank,
installed_at: input.installed_at || null,
compatibility_label: input.compatibility_label,
featured: Boolean(input.featured)
```

- [ ] **Step 2: 将 `createInitialState()` 扩为 8 条目录样例**

保留现有内部 ID，并新增：

```javascript
'dst-smart-stack'
'dst-season-clock'
'dst-fast-gather'
'dst-night-light'
```

固定下载量和热门顺序：

```javascript
[
  ['dst-fast-travel', 186000, 1, true],
  ['dst-combined-status', 142000, 2, true],
  ['dst-smart-stack', 98000, 3, true],
  ['dst-season-clock', 76000, 4, false],
  ['dst-large-b', 63000, 5, false],
  ['dst-large-a', 58000, 6, false],
  ['dst-fast-gather', 41000, 7, false],
  ['dst-night-light', 37000, 8, false]
]
```

默认已安装：

```text
dst-fast-travel      installed / enabled / no_update
dst-combined-status  installed / disabled / update_available
dst-smart-stack      installed / enabled / no_update
dst-season-clock     installed / disabled / update_available
```

为 `dst-season-clock` 建立一条失败的更新任务：

```javascript
{
  task_id: 'task-mac-device-local-01-dst-season-clock-update',
  root_mod_id: 'dst-season-clock',
  operation: 'update',
  task_state: 'failed',
  progress_percent: 92,
  failure_code: 'PACKAGE_HASH_MISMATCH'
}
```

同时保留旧版：

```javascript
installed_version: '1.8.0',
active_version_pointer: '1.8.0',
enabled_value: 'disabled',
update_fact: 'update_available'
```

- [ ] **Step 3: 扩充 UI 状态**

```javascript
ui: {
  screen: 'game-detail',
  activeDialog: null,
  currentModId: null,
  detailReturnScreen: 'game-detail',
  activeTab: 'browse',
  browseSort: 'popular',
  installedSort: 'recent',
  installedFilter: 'all',
  searchByTab: {
    browse: '',
    installed: ''
  },
  scrollTopByTab: {
    browse: 0,
    installed: 0
  },
  refreshing: false
}
```

- [ ] **Step 4: 扩充 `derive(current)`**

派生结果：

```javascript
const allMods = Object.values(current.mods);
const installedMods = allMods
  .filter(mod => mod.installation_fact === 'installed');
const featuredMods = allMods
  .filter(mod => mod.featured)
  .sort((a, b) => a.popularity_rank - b.popularity_rank)
  .slice(0, 3);
```

浏览排序比较器：

```javascript
const browseComparators = {
  popular: (a, b) => a.popularity_rank - b.popularity_rank,
  downloads: (a, b) => b.download_count - a.download_count,
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
  name: (a, b) => a.name.localeCompare(b.name, 'zh-CN')
};
```

已安装排序比较器：

```javascript
const installedComparators = {
  recent: (a, b) => (b.installed_at || '').localeCompare(a.installed_at || ''),
  name: (a, b) => a.name.localeCompare(b.name, 'zh-CN')
};
```

筛选规则：

```javascript
const installedFilters = {
  all: () => true,
  enabled: mod => mod.enabled_value === 'enabled',
  disabled: mod => mod.enabled_value === 'disabled',
  update: mod => mod.update_fact === 'update_available'
};
```

- [ ] **Step 5: 实现 reducer 动作**

```javascript
case 'SET_ACTIVE_TAB':
  next.ui.activeTab = action.value === 'installed' ? 'installed' : 'browse';
  return next;
case 'SET_BROWSE_SORT':
  next.ui.browseSort = ['popular', 'downloads', 'updated', 'name']
    .includes(action.value) ? action.value : 'popular';
  return next;
case 'SET_INSTALLED_SORT':
  next.ui.installedSort = action.value === 'name' ? 'name' : 'recent';
  return next;
case 'SET_INSTALLED_FILTER':
  next.ui.installedFilter = ['all', 'enabled', 'disabled', 'update']
    .includes(action.value) ? action.value : 'all';
  return next;
case 'SET_SEARCH':
  next.ui.searchByTab[next.ui.activeTab] = String(action.value || '');
  return next;
```

- [ ] **Step 6: 运行状态验收**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: 数据和排序断言通过，入口与 Tab 结构断言仍失败。

### Task 3: 重构游戏详情 MODS 热门模块

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 将单行 MODS 入口改为创意工坊式模块**

`renderGameDetail(viewModel)` 输出：

```html
<section class="mods-discovery-card"
  data-reference-region="mods-entry">
  <div class="mods-discovery-heading">
    <span class="mods-symbol">...</span>
    <span class="mods-discovery-copy">
      <strong>MODS</strong>
      <span>非官方来源 · 热门推荐 · 仅此设备</span>
    </span>
    <button data-action="open-mods" data-tab="browse">
      <span>128 个 MOD</span>
      查看全部
    </button>
  </div>
  <div class="mods-featured-grid">...</div>
</section>
```

- [ ] **Step 2: 渲染 3 个热门卡片**

```javascript
function renderFeaturedMod(mod) {
  return `<button class="featured-mod"
    type="button"
    data-featured-mod="${mod.mod_id}"
    data-action="open-featured-detail"
    data-mod-id="${mod.mod_id}">
    <span class="featured-cover">${renderModCover(mod)}</span>
    <strong>${escapeHtml(mod.name)}</strong>
    <span>${formatDownloads(mod.download_count)} 次下载</span>
  </button>`;
}
```

下载量格式：

```javascript
function formatDownloads(value) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, '')} 万`;
  }
  return String(value);
}
```

- [ ] **Step 3: 实现热门详情返回**

Reducer：

```javascript
case 'OPEN_FEATURED_DETAIL':
  next.ui.screen = 'game-detail';
  next.ui.detailReturnScreen = 'game-detail';
  next.ui.currentModId = action.modId || action.mod_id;
  next.ui.activeDialog = 'mod-detail';
  return next;
case 'OPEN_DETAIL':
  next.ui.detailReturnScreen = 'mods-list';
  next.ui.currentModId = action.modId || action.mod_id;
  next.ui.activeDialog = 'mod-detail';
  return next;
```

关闭详情只清空 `activeDialog` 和 `currentModId`，不改变背景页面。

- [ ] **Step 4: 更新点击事件**

```javascript
if (action === 'open-mods') {
  dispatch({ type: 'OPEN_MODS', tab: control.dataset.tab || 'browse' });
}
if (action === 'open-featured-detail') {
  dispatch({ type: 'OPEN_FEATURED_DETAIL', modId });
}
```

- [ ] **Step 5: 运行入口验收**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: 3 个热门、128 个 MOD、查看全部和热门详情返回断言通过。

### Task 4: 实现浏览与已安装双 Tab

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 重构列表头部**

`renderModsList(viewModel)` 增加：

```html
<div class="mods-tabs" role="tablist">
  <button data-mod-tab="browse"
    data-action="set-tab"
    data-value="browse"
    role="tab">浏览 128</button>
  <button data-mod-tab="installed"
    data-action="set-tab"
    data-value="installed"
    role="tab">已安装 ${viewModel.installedCount}</button>
</div>
```

浏览摘要：

```html
<p data-catalog-summary>共 128 个，当前加载 8 个 · 非官方来源</p>
```

已安装摘要：

```html
<p data-catalog-summary>${viewModel.installedCount} 个已安装 · 仅此设备</p>
```

- [ ] **Step 2: 增加浏览排序控件**

```html
<select data-input="browse-sort" aria-label="浏览排序">
  <option value="popular">热门推荐</option>
  <option value="downloads">下载量</option>
  <option value="updated">最近更新</option>
  <option value="name">名称</option>
</select>
```

- [ ] **Step 3: 增加已安装排序和筛选**

```html
<select data-input="installed-sort" aria-label="已安装排序">
  <option value="recent">最近安装</option>
  <option value="name">名称</option>
</select>
<div class="installed-filters">
  <button data-action="set-installed-filter" data-value="all">全部</button>
  <button data-action="set-installed-filter" data-value="enabled">已启用</button>
  <button data-action="set-installed-filter" data-value="disabled">未启用</button>
  <button data-action="set-installed-filter" data-value="update">可更新</button>
</div>
```

- [ ] **Step 4: 在卡片中补充发现元数据**

```html
<span class="catalog-metrics">
  ${formatDownloads(mod.download_count)} 次下载
  · ${formatDate(mod.updated_at)} 更新
</span>
<small>
  v${mod.latest_version}
  · ${mod.file_size}
  · ${mod.compatibility_label}
  · 非官方来源
</small>
```

- [ ] **Step 5: 绑定 Tab、排序与筛选事件**

点击：

```javascript
if (action === 'set-tab') {
  dispatch({ type: 'SET_ACTIVE_TAB', value: control.dataset.value });
}
if (action === 'set-installed-filter') {
  dispatch({
    type: 'SET_INSTALLED_FILTER',
    value: control.dataset.value
  });
}
```

变化：

```javascript
if (event.target.matches('[data-input="browse-sort"]')) {
  dispatch({ type: 'SET_BROWSE_SORT', value: event.target.value });
}
if (event.target.matches('[data-input="installed-sort"]')) {
  dispatch({ type: 'SET_INSTALLED_SORT', value: event.target.value });
}
```

- [ ] **Step 6: 保留每个 Tab 的搜索词**

搜索框 value 改为：

```javascript
value="${escapeHtml(viewModel.searchText)}"
```

`derive()` 的 `searchText` 从：

```javascript
current.ui.searchByTab[current.ui.activeTab]
```

读取。

- [ ] **Step 7: 运行列表验收**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: 8 条浏览、4 条已安装、四种排序、两种安装排序和四种筛选全部通过。

### Task 5: 补充详情数据摘要和状态一致性

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`
- Test: `.tmp/verify-mac-mods-reference.mjs`

- [ ] **Step 1: 在详情封面下增加数据摘要**

```html
<section class="detail-metrics">
  <span><strong>${formatDownloads(mod.download_count)}</strong> 次下载</span>
  <span><strong>${formatDate(mod.updated_at)}</strong> 最近更新</span>
  <span><strong>v${mod.latest_version}</strong> 最新版本</span>
  <span><strong>${mod.file_size}</strong> 文件大小</span>
  <span><strong>${mod.compatibility_label}</strong> 兼容性</span>
</section>
```

- [ ] **Step 2: 保持详情底栏管理规则**

验证以下分支仍存在：

```text
未安装：安装到此设备
安装中：等待下载 / 下载中 / 正在校验 / 正在安装
已安装：启用或停用 / 检查更新或更新 / 卸载
更新失败：保留旧版 / 重试更新 / 卸载
```

- [ ] **Step 3: 安装和卸载同步数量**

安装完成：

```javascript
mod.installation_fact = 'installed';
mod.enabled_value = 'enabled';
mod.installed_at = new Date().toISOString();
```

卸载完成：

```javascript
mod.installation_fact = 'not_installed';
mod.enabled_value = 'not_applicable';
mod.installed_at = null;
```

数量不单独写入状态，由 `derive()` 每次计算。

- [ ] **Step 4: 运行详情与旧合同验收**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
node .tmp/verify-mac-mods-reference.mjs
node tools/verify-dst-mods-demos.mjs --only=mac
```

Expected: 新发现验收、旧参考合同和 Mac 静态合同均 PASS。

### Task 6: 生成截图并视觉校准

**Files:**

- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Create: `.tmp/mac-mods-discovery-evidence/*.png`

- [ ] **Step 1: 在临时验收器中加入截图**

生成：

```text
mac-mods-discovery-entry.png
mac-mods-browse.png
mac-mods-installed.png
mac-mods-detail-top.png
mac-mods-detail-scroll.png
mac-mods-update-failed.png
```

- [ ] **Step 2: 运行截图**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: 6 张 2160×1480 PNG 存在且均大于 50KB。

- [ ] **Step 3: 逐图检查**

检查：

```text
入口：MODS 与创意工坊同层级，3 个热门、128 个 MOD、查看全部清晰。
浏览：Tab、搜索、四种排序、8 条两列卡片和右侧留白清晰。
已安装：4 条、排序、四个筛选和管理状态清晰。
详情：下载量、更新时间、版本、大小、兼容性不挤压大封面与固定底栏。
滚动：标题栏和底栏固定，说明区独立滚动。
更新失败：保留旧版、重试更新和卸载可见。
```

发现遮挡、截断、状态错位或视觉层级混乱时，直接修改 Mac HTML 并重新截图。

### Task 7: 最终回归、三角色验收与提交

**Files:**

- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/mac-mods-discovery-evidence/*.png`

- [ ] **Step 1: 运行全部验证**

```powershell
node tools/verify-dst-mods-demos.mjs --only=mac
node .tmp/verify-mac-mods-reference.mjs
node .tmp/verify-mac-mods-discovery.mjs
node .tmp/verify-mac-mods-dom-flow.mjs
git diff --check -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
```

Expected: 全部 PASS，无空白错误。

- [ ] **Step 2: 检查禁止内容与外部依赖**

```powershell
rg -n "启动前检查|启动检查|实际加载证据|异常恢复|恢复建议|<iframe|fetch\\(|XMLHttpRequest|https?://" -- `
  'demos/Mod与发行人/Mod功能Mac端demo.html'
```

Expected: 无匹配。

- [ ] **Step 3: 检查文件边界**

```powershell
git status --short -- `
  'demos/Mod与发行人/Mod功能Mac端demo.html' `
  'demos/Mod与发行人/Mod功能APP端demo.html' `
  'demos/Mod与发行人/Mod功能APP端-场景联动demo.html'
```

Expected: 只显示 Mac HTML。

- [ ] **Step 4: 三角色终验**

```text
产品：官方订阅与非官方安装语义隔离；128/8 口径明确；数量联动。
交互：热门、Tab、排序、筛选、详情返回和本机管理路径顺畅。
开发：统一状态源、安装幂等、更新失败保留旧版、离线零错误。
```

必须修问题全部处理后再提交。

- [ ] **Step 5: 精确提交**

```powershell
git add -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git diff --cached --check
git diff --cached --name-only
git commit -m 'feat(mods): add mac discovery and installed tabs'
```

Expected: 提交只包含 Mac HTML。
