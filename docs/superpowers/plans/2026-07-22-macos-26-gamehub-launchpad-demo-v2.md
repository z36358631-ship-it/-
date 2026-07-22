# macOS 26 盖世全屏启动台 Demo V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有“游戏优先”启动器 Demo 重做为与竞品实机一致的全部应用全屏启动台，并同步 PRD 与自动验收。

**Architecture:** 继续使用单 HTML 文件承载三栏标注外壳、可操作启动台和所有状态；用一个集中 `state` 管理页面、搜索、分页、文件夹、设置和全局入口模拟。应用保持名称排序，拖放只用于文件夹创建和移入；静态验收脚本明确拒绝旧页签、游戏横版封面、自由排序和跨页搬动。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 静态验收、GitHub Pages。

---

## 文件结构

- Modify: `scripts/verify-launcher-demo.js` — V2 静态验收和脚本语法检查。
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html` — 单文件三栏交互标注 Demo。
- Keep: `demos/macos26-gamehub-fullscreen-launcher.html` — 稳定预览入口，跳转到主 Demo。
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md` — 写入 Demo 入口和 V2.1 同步记录。
- Create: `docs/superpowers/plans/2026-07-22-macos-26-gamehub-launchpad-demo-v2.md` — 本实施计划与执行记录。

### Task 1: 建立 V2 失败验收

**Files:**
- Modify: `scripts/verify-launcher-demo.js`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 用 V2 能力清单替换旧断言**

验收脚本必须包含以下结构，并从 UTF-8 中文文件名读取主 Demo：

```js
const requiredFlows = [
  'client', 'scanning', 'launchpad', 'search',
  'folder', 'settings', 'permission', 'launching', 'external', 'failure'
];
const forbiddenLegacy = ['游戏 / 全部应用', '添加到游戏', '从游戏中移除', 'game-cover-grid'];
const checks = {
  flows: requiredFlows.every(id => html.includes(`id:'${id}'`)),
  noLegacy: forbiddenLegacy.every(text => !html.includes(text)),
  pagination: ['pageDots', 'goToPage'].every(text => html.includes(text)),
  folders: ['createFolder', 'openFolder', 'renameFolder', 'removeFromFolder'].every(text => html.includes(text)),
  globalTriggers: ['shortcut', 'f4', 'trackpad', 'hot_corner', 'clientProcess'].every(text => html.includes(text)),
  settings: ['自定义快捷键', '触控板手势', '屏幕触发角', '自定义目录'].every(text => html.includes(text))
};
```

- [ ] **Step 2: 运行验收并确认旧 Demo 失败**

Run: `node scripts/verify-launcher-demo.js`

Expected: `FAIL`，至少包含 `flows`、`pagination`、`folders` 或 `noLegacy`。

- [ ] **Step 3: 提交验收基线**

```powershell
git add -- 'scripts/verify-launcher-demo.js'
git commit -m 'test: define launchpad v2 demo acceptance'
```

### Task 2: 重做客户端入口与全屏启动台视觉

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 建立 V2 状态、应用与页面数据**

主状态使用固定字段，避免渲染函数各自维护隐式状态：

```js
const state = {
  screen: 'client', page: 0, query: '', menu: false, settings: false,
  permission: null, folderId: null, editingFolder: false,
  launchingId: '', failedId: '', panel: true, annotationTab: 'interaction',
  showMarkers: true, clientProcess: 'foreground', trigger: 'sidebar',
  drag: null, toast: '', settingsDraft: { shortcut: '⌥ Space', f4: false, trackpad: false, corner: '关闭' }
};
```

应用数据至少 36 个、3 页、1 个“实用工具”文件夹；每项固定包含 `id`、`name`、`symbol`、`colors`、`running` 和 `outcome`。

- [ ] **Step 2: 把侧边栏入口改为仅图标**

入口必须使用以下语义：

```html
<button class="client-nav-icon launchpad-entry" data-action="enter-launchpad" title="启动台" aria-label="启动台">
  <span class="grid-glyph" aria-hidden="true"></span>
</button>
```

按钮内不得出现固定“启动台”文字；点击后播放全屏转场并进入全部应用网格。

- [ ] **Step 3: 建立竞品同构全屏布局**

全屏主体固定为搜索、更多菜单、网格和分页圆点：

```html
<section class="launchpad-screen">
  <header class="launchpad-header">
    <label class="launchpad-search"><input id="launchpadSearch" placeholder="搜索应用"></label>
    <button data-action="toggle-more" aria-label="更多">•••</button>
  </header>
  <div class="launchpad-pages" id="launchpadPages"></div>
  <nav class="page-dots" id="pageDots" aria-label="启动台分页"></nav>
</section>
```

CSS 使用模糊桌面壁纸、7 列×5 行视觉密度、圆角大图标和底部圆点；中间 Demo 画布铺满容器，不保留客户端窗口边框。

- [ ] **Step 4: 保留标注外壳能力**

三栏外壳继续包含：左侧流程导航、右侧“交互说明/异常&边界”、显示/隐藏标号、右侧折叠、点击标注反向高亮。每条说明按“触发条件/展示说明/交互说明/异常边界”四段输出。

- [ ] **Step 5: 运行静态验收**

Run: `node scripts/verify-launcher-demo.js`

Expected: 旧方案相关断言不再失败；其余交互任务未完成时允许继续显示对应失败项。

### Task 3: 实现分页、搜索、名称排序与文件夹

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 实现全部应用分页与搜索**

使用统一查询和分页函数：

```js
function flattenedApps() { return layout.flatMap(item => item.type === 'folder' ? item.items : [item]); }
function searchResults(query) {
  const key = query.trim().toLocaleLowerCase();
  return key ? flattenedApps().filter(app => app.name.toLocaleLowerCase().includes(key)).sort(byName) : [];
}
function goToPage(index, method = 'dot') {
  state.page = Math.max(0, Math.min(index, pageCount() - 1));
  state.lastPageMethod = method;
  render();
}
```

搜索结果跨页且展开文件夹；滚轮、横滑、左右键和圆点均调用 `goToPage`。

- [ ] **Step 2: 实现稳定名称排序**

系统“实用工具”文件夹固定在首位；其他顶层应用和文件夹内应用按本地化名称升序排列。新安装、卸载、移出文件夹或名称变化后重新应用同一规则，不保存人工顺序。

```js
function normalizeLayout() {
  const folders = layout.filter(item => item.type === 'folder');
  const apps = layout.filter(item => item.type === 'app').sort(byName);
  layout = [...folders, ...apps];
}
```

- [ ] **Step 3: 实现文件夹完整链路**

```js
function createFolder(sourceId, targetId) {
  const source = removeLayoutItem(sourceId);
  const target = removeLayoutItem(targetId);
  const folder = { id: `folder-${Date.now()}`, type: 'folder', name: '文件夹', items: [target, source] };
  layout.splice(Math.min(source.index, target.index), 0, folder);
  state.folderId = folder.id;
}
function renameFolder(folderId, value) {
  const name = value.trim().slice(0, 20);
  if (!name) return false;
  findFolder(folderId).name = name;
  return true;
}
function removeFromFolder(folderId, appId) {
  const folder = findFolder(folderId);
  const index = folder.items.findIndex(app => app.id === appId);
  const [app] = folder.items.splice(index, 1);
  layout.splice(layout.indexOf(folder) + 1, 0, app);
  dissolveFolderIfNeeded(folder);
}
```

Demo 必须可点击打开“实用工具”，可把顶层应用拖到另一应用或已有文件夹完成归类，可重命名，可移出并触发只剩一个应用时自动解散。拖到空白处、间隙或页面边缘不改变顺序。

- [ ] **Step 4: 验证整理链路**

Run: `node scripts/verify-launcher-demo.js`

Expected: `pagination`、`search`、`fixedOrder`、`folderDrag`、`folders` 均为通过。

### Task 4: 实现设置、权限和全局入口模拟

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 实现更多菜单与设置弹窗**

更多菜单只有“设置”和“退出启动台”。设置弹窗包含自定义快捷键、F4、触控板手势、触发角、标准应用目录和自定义目录；设置变更立即反映到左侧模拟按钮。

- [ ] **Step 2: 实现权限状态**

`requestPermission(type)` 打开权限说明；“模拟授权”设为 `granted`，“模拟拒绝”设为 `denied`，“模拟不支持”设为 `unsupported`。拒绝或不支持只关闭对应入口，不影响侧边栏。

```js
function requestPermission(type) {
  state.permission = { type, status: 'pending' };
  render();
}
function resolvePermission(status) {
  state.permission.status = status;
  permissions[state.permission.type] = status;
  render();
}
```

- [ ] **Step 3: 实现四类全局入口与进程状态**

左侧提供快捷键、F4、触控板、触发角模拟按钮，以及盖世“前台/后台/最小化/彻底退出”状态切换。统一入口函数：

```js
function triggerLauncher(type) {
  if (state.clientProcess === 'quit') return showToast('盖世已彻底退出，全局入口不可用');
  if (!triggerAvailability(type)) return showToast('该入口未启用、未授权或不受支持');
  state.trigger = type;
  state.screen = state.screen === 'launchpad' ? 'client' : 'launchpad';
  render();
}
```

侧边栏入口只在客户端进程存在时点击；全局入口在前台、后台或最小化时生效。

- [ ] **Step 4: 验证设置与全局入口**

Run: `node scripts/verify-launcher-demo.js`

Expected: `settings`、`permissions`、`globalTriggers`、`clientState` 均为通过。

### Task 5: 实现应用启动结果、异常边界和键盘规则

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 实现启动、激活和失败**

单击普通应用执行 `startLaunch(id)`；运行中的应用显示“正在激活”；失败应用停留原页并出现原因和“重试”；盖世图标执行 `activateGameHub()` 返回客户端。外部应用演示页的返回按钮必须写“返回启动台”。

- [ ] **Step 2: 实现 Esc 优先级**

键盘处理顺序固定为：权限弹层/设置/更多菜单 → 重命名 → 文件夹拖放 → 文件夹 → 搜索 → 启动中阻止 → 退出启动台。Command+F 聚焦搜索，方向键移动焦点，Enter 启动。

- [ ] **Step 3: 补齐异常&边界标注**

右侧至少覆盖：低版本隐藏、扫描失败、搜索无结果、目录失效、图标失败、快捷键冲突、权限拒绝、不支持设备、盖世彻底退出、多显示器迁移、启动超时、文件夹拖放并发冻结和页码越界校正。

- [ ] **Step 4: 运行全部静态验收**

Run: `node scripts/verify-launcher-demo.js`

Expected: `PASS macOS 26 launchpad v2 demo static checks`。

### Task 6: 同步 PRD、浏览器验收和发布

**Files:**
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md`
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: PRD 追加 V2.1 Demo 同步记录**

版本表新增 2026.07.22 V2.1 行，记录“交互标注 Demo 已按竞品实机更新”；4.2 顶部写入稳定预览入口：

```markdown
功能 Demo：<https://z36358631-ship-it.github.io/-/demos/macos26-gamehub-fullscreen-launcher.html>
```

PRD 不删除 V2.0 规则，只补充 Demo 已覆盖范围和页面映射。

- [ ] **Step 2: 检查语法与占位文本**

Run: `node scripts/verify-launcher-demo.js`

Expected: PASS，且 HTML、PRD 和计划中没有未定义占位文本。

- [ ] **Step 3: 浏览器烟雾测试与截图检查**

使用本机 Chromium/Edge 无头浏览器打开稳定入口，至少检查：客户端入口、全屏启动台、文件夹、设置四个状态；页面无脚本错误、溢出、遮挡和不可读文本。

- [ ] **Step 4: 只暂存本任务文件并提交**

```powershell
git add -- 'scripts/verify-launcher-demo.js' 'demos/macOS26盖世全屏启动台-交互标注版.html' 'demos/macos26-gamehub-fullscreen-launcher.html' 'docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md' 'docs/superpowers/plans/2026-07-22-macos-26-gamehub-launchpad-demo-v2.md'
git commit -m 'feat: rebuild macOS 26 launchpad demo'
git push origin master
```

- [ ] **Step 5: 验证线上预览**

Run: `Invoke-WebRequest -UseBasicParsing 'https://z36358631-ship-it.github.io/-/demos/macos26-gamehub-fullscreen-launcher.html'`

Expected: HTTP 200，页面跳转到 V2 主 Demo，主 Demo 包含“搜索应用”“实用工具”“触控板手势”和 `pageDots`。

## 自检结论

- 规格覆盖：入口、全屏、扫描、全部应用、横向分页、搜索、整理、文件夹、设置、权限、全局入口、进程状态、应用启动、多显示器与异常均有对应任务。
- 占位扫描：计划不存在待补内容，示例数据均给出字段与函数签名。
- 类型一致性：`state.page`、`state.query`、`state.folderId`、`clientProcess`、`triggerLauncher`、`goToPage` 和文件夹函数在各任务中命名一致。
- 执行方式：用户已明确要求持续更新并提交，本轮按 Inline Execution 直接执行，不再请求选择。
