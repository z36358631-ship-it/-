# Mac MODS Compact Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mac MODS 浏览页和已安装页改为单行下拉工具栏，并保留现有列表启停与详情状态交互。

**Architecture:** 在现有单文件 Demo 中复用 `browseSort` 和 `installedFilter` 状态，将平铺按钮替换为原生 `select`，统一放入 `.list-tools`。自动化使用 DOM 顺序、选项、状态结果和两类启停控件断言覆盖回归。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright Core。

---

### Task 1: 固化工具栏契约

**Files:**
- Modify: `tools/verify-mods-demo.mjs`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 写入失败断言**

新增静态和浏览器断言：

```js
assert.doesNotMatch(html, /<div class="mods-list-title">/u);
assert.match(html, /data-input="browse-sort"/u);
assert.match(html, /data-input="installed-filter"/u);
```

浏览页断言 `.list-tools` 直接子项语义顺序为 `browse-sort`、`search`、`refresh`，排序下拉选项为“热门趋势、下载量、最新发布”；已安装页断言顺序为 `installed-filter`、`search`、`refresh`，筛选下拉选项为“全部、可更新”。

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: FAIL，旧 Demo 仍存在标题且排序、筛选仍为按钮。

### Task 2: 实现浏览页和已安装页单行下拉工具栏

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 替换工具栏结构**

删除 `.mods-list-title`，把活动 Tab 对应的下拉控件放在搜索和刷新之前：

```html
<div class="list-tools">
  ${viewModel.activeTab === 'browse' ? browseControls : installedControls}
  <label class="search-field">...</label>
  <button class="refresh-button" ...>刷新</button>
</div>
```

- [ ] **Step 2: 使用原生下拉**

浏览页输出：

```html
<label class="compact-select">
  <span>排序</span>
  <select data-input="browse-sort" aria-label="浏览排序">...</select>
</label>
```

已安装页输出：

```html
<label class="compact-select">
  <span>筛选</span>
  <select data-input="installed-filter" aria-label="已安装筛选">...</select>
</label>
```

- [ ] **Step 3: 接入 change 事件**

```js
root.addEventListener('change', event => {
  if (event.target.matches('[data-input="browse-sort"]')) {
    dispatch({ type: 'SET_BROWSE_SORT', value: event.target.value });
  }
  if (event.target.matches('[data-input="installed-filter"]')) {
    dispatch({ type: 'SET_INSTALLED_FILTER', value: event.target.value });
  }
});
```

- [ ] **Step 4: 清理旧按钮事件和样式**

删除 `set-browse-sort`、`set-installed-filter` 点击分支，以及 `.browse-sort-options`、`.installed-filters` 的按钮样式。新增同宽 `.compact-select` 样式。

- [ ] **Step 5: 运行测试**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: PASS，且无页面脚本错误或控制台错误。

### Task 3: 视觉审查与 PRD 截图

**Files:**
- Create: `public/prd/dst-mods/03-mac-browse-toolbar.png`
- Create: `public/prd/dst-mods/04-mac-installed-toolbar.png`
- Modify: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 自动截取两种 Tab**

测试在浏览页和已安装页分别截取 `[data-demo-root]`，保存 2 张 PNG。

- [ ] **Step 2: 检查截图**

检查标题已移除、三个控件同一行、下拉宽度稳定、Tab 与列表不重叠、列表开关仍显示。

- [ ] **Step 3: 运行完整验证**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: 两张新 PNG 大于 10 KB，全部功能和回归断言 PASS。

### Task 4: 更新并验证 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `tools/verify-mods-prd.mjs`
- Test: `tools/verify-mods-prd.mjs`

- [ ] **Step 1: 先提交并推送 Demo 与截图**

提交 Demo、测试、规格、计划和截图，推送后获取包含截图的 40 位提交 SHA。

- [ ] **Step 2: 追加版本与增量口径**

主 PRD 追加新版本，技术归档同步追加新版本。写清标题/副标题删除、浏览和已安装工具栏顺序、下拉选项、默认值、异常处理、列表开关保留和详情状态按钮不变。

- [ ] **Step 3: 使用固定图片地址**

两张新增图示使用同一个实际图片提交 SHA：

```markdown
https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<40位提交SHA>/public/prd/dst-mods/03-mac-browse-toolbar.png
```

```markdown
https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<40位提交SHA>/public/prd/dst-mods/04-mac-installed-toolbar.png
```

- [ ] **Step 4: 更新 PRD 自动验证**

断言新版本、两种工具栏口径、4 张固定 SHA 图片、无本地图片路径，并逐张验证 HTTP 200 与 `image/png`。

- [ ] **Step 5: 运行 PRD 验证**

Run:

```powershell
node tools/verify-mods-prd.mjs
```

Expected: PASS，Markdown 图片数、固定 HTTPS 地址数和远程验证通过数一致。

