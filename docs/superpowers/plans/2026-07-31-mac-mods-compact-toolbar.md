# Mac MODS Unified List Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mac MODS 浏览页和已安装页的 Tab 与当前页面工具栏合并到同一头部行，同时保持两页卡片起点、排序筛选、搜索刷新和启停交互稳定。

**Architecture:** 在现有单文件 Demo 内把 `.mods-tabs` 移入 `.mods-list-header`，让 Tab 与 `.list-tools` 成为同一 flex 容器的正常流子项；头部统一绘制底部分隔线，`.catalog-toolbar` 作为等高摘要行，`.mods-grid` 两个 Tab 共用固定起点。自动化先固化 DOM、键盘、几何位置和交互契约，再生成新截图并更新两份 PRD。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright Core、Markdown、GitHub/jsDelivr。

---

## V1.2 增量：移除已安装页搜索

### Task 0A: 固化已安装页无搜索契约

**Files:**
- Modify: `tools/verify-mods-demo.mjs`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 增加已安装页 DOM 与焦点顺序断言**

将已安装头部期望顺序改为：

```js
assert.deepEqual(
  installedHeaderOrder,
  ['browse-tab', 'installed-tab', 'filter', 'refresh']
);
assert.equal(
  await page.locator('.mods-list-header [data-input="search"]').count(),
  0
);
```

键盘焦点从返回按钮开始依次经过两个 Tab、筛选与刷新，不经过搜索：

```js
assert.deepEqual(
  installedFocusOrder,
  ['browse-tab', 'installed-tab', 'filter', 'refresh']
);
```

- [ ] **Step 2: 增加状态隔离断言**

在浏览页写入搜索词后切换已安装页，断言搜索词不参与已安装列表：

```js
await page.locator('[data-input="search"]').fill('小');
await page.locator('[data-mod-tab="installed"]').click();
assert.equal(await page.locator('[data-input="search"]').count(), 0);
assert.equal(
  await page.evaluate(() => window.__DST_MODS_DEMO__.derive().searchText),
  ''
);
```

- [ ] **Step 3: 运行测试并确认当前实现失败**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: FAIL，当前已安装头部仍渲染搜索输入，DOM 顺序多出 `search`。

### Task 0B: 条件渲染搜索并清理已安装搜索状态

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 让派生列表仅在浏览页读取搜索词**

将：

```js
const searchText = current.ui.searchByTab[activeTab] || '';
```

改为：

```js
const searchText = activeTab === 'browse'
  ? current.ui.searchByTab.browse || ''
  : '';
```

- [ ] **Step 2: 只在浏览页渲染搜索输入**

将统一搜索标签改为条件渲染：

```html
${viewModel.activeTab === 'browse'
  ? `<label class="search-field">${icon('search', 'small')}<input data-input="search" aria-label="搜索 MOD" placeholder="搜索 MOD" value="${escapeHtml(viewModel.searchText)}"></label>`
  : ''}
```

已安装页的筛选与刷新沿用现有结构，`.list-tools` 自然右对齐，不新增占位元素。

- [ ] **Step 3: 运行完整 Demo 验证并生成已安装页截图**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected:

```text
PASS: static sort, copy, metadata and switch contracts
PASS: browse header = tabs, sort select, search, refresh
PASS: installed header = tabs, filter select, refresh; no search
PASS: enabled controls support Enter/Space, request locking and rollback
PASS: failed update keeps the old version and exposes four ordered actions
```

仅更新 `public/prd/dst-mods/04-mac-installed-toolbar.png`；浏览页和两张详情图不重新生成。

### Task 0C: 更新 PRD 与发布

**Files:**
- Modify: `public/prd/dst-mods/04-mac-installed-toolbar.png`
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `tools/verify-mods-prd.mjs`

- [ ] **Step 1: 发布 Demo 与截图固定提交**

Run:

```powershell
git add -- "demos/Mod与发行人/Mod功能Mac端demo.html" "tools/verify-mods-demo.mjs" "public/prd/dst-mods/04-mac-installed-toolbar.png"
git commit -m "feat(mods): remove installed search"
git push origin HEAD:main
git rev-parse HEAD
```

Expected: 远端 `main` 包含无搜索的已安装页；输出 40 位固定图片提交 SHA。

- [ ] **Step 2: 追加 PRD 版本与规则**

主 PRD 追加 V1.6，技术归档追加 V1.9；新增规则明确：

```text
浏览页：排序、搜索、刷新。
已安装页：筛选、刷新，不显示搜索或空占位。
已安装结果不读取 searchByTab.installed。
```

仅将 `04-mac-installed-toolbar.png` 更新为 Step 1 固定 SHA，对应图片 URL 必须返回 HTTP 200 且 `Content-Type` 为 `image/png`。

- [ ] **Step 3: 提交 PRD 并验证在线预览**

Run:

```powershell
node tools/verify-mods-prd.mjs
git diff --check
git add -- "prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md" "prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md" "tools/verify-mods-prd.mjs" "docs/superpowers/specs/2026-07-31-mac-mods-compact-toolbar-design.md" "docs/superpowers/plans/2026-07-31-mac-mods-compact-toolbar.md"
git commit -m "docs(mods): document installed search removal"
git push origin HEAD:main
```

Expected: Demo、两份 PRD、自动验证和设计文档全部通过，固定提交图片与最终在线预览均返回 HTTP 200。

---

### Task 1: 固化同排头部失败契约

**Files:**
- Modify: `tools/verify-mods-demo.mjs`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 增加统一头部静态断言**

在静态断言区增加：

```js
assert.match(
  html,
  /<header class="mods-list-header">[\s\S]*<div class="mods-tabs"[\s\S]*<div class="list-tools">/u
);
assert.doesNotMatch(
  html,
  /<\/header>\s*<div class="mods-tabs"/u
);
```

- [ ] **Step 2: 增加浏览页几何与焦点顺序断言**

进入浏览页后读取统一头部直接交互元素：

```js
const browseHeaderOrder = await page.locator(
  '.mods-list-header button, .mods-list-header select, .mods-list-header input'
).evaluateAll(elements => elements.map(element => (
  element.matches('[data-mod-tab="browse"]') ? 'browse-tab'
    : element.matches('[data-mod-tab="installed"]') ? 'installed-tab'
      : element.matches('[data-input="browse-sort"]') ? 'sort'
        : element.matches('[data-input="search"]') ? 'search'
          : element.matches('[data-action="refresh"]') ? 'refresh'
            : 'unknown'
)));
assert.deepEqual(
  browseHeaderOrder,
  ['browse-tab', 'installed-tab', 'sort', 'search', 'refresh']
);
```

读取 Tab、下拉、搜索和刷新中心点，断言垂直中心最大差值不超过 `1`：

```js
const browseHeaderCenters = await page.locator(
  '.mods-list-header [data-mod-tab], .mods-list-header .compact-select, .mods-list-header .search-field, .mods-list-header .refresh-button'
).evaluateAll(elements => elements.map(element => {
  const box = element.getBoundingClientRect();
  return box.top + box.height / 2;
}));
assert(
  Math.max(...browseHeaderCenters) - Math.min(...browseHeaderCenters) <= 1,
  `browse header controls are not on one row: ${JSON.stringify(browseHeaderCenters)}`
);
```

- [ ] **Step 3: 增加分隔线、摘要和卡片起点断言**

浏览页记录头部底线和首张卡片顶部：

```js
const browseLayout = await page.evaluate(() => {
  const header = document.querySelector('.mods-list-header').getBoundingClientRect();
  const activeTab = document.querySelector('.mods-tabs .is-active');
  const underline = getComputedStyle(activeTab, '::after');
  const firstCard = document.querySelector('[data-mod-card]').getBoundingClientRect();
  return {
    headerBottom: header.bottom,
    headerBorder: getComputedStyle(document.querySelector('.mods-list-header')).borderBottomWidth,
    underlineBottom: underline.bottom,
    firstCardTop: firstCard.top
  };
});
assert.equal(browseLayout.headerBorder, '2px');
assert.equal(browseLayout.underlineBottom, '-2px');
```

切换已安装页后断言：

```js
const installedLayout = await page.evaluate(() => {
  const header = document.querySelector('.mods-list-header').getBoundingClientRect();
  const summary = document.querySelector('[data-catalog-summary]').getBoundingClientRect();
  const firstCard = document.querySelector('[data-mod-card]').getBoundingClientRect();
  return {
    headerBottom: header.bottom,
    summaryTop: summary.top,
    summaryBottom: summary.bottom,
    firstCardTop: firstCard.top
  };
});
assert(installedLayout.summaryTop >= installedLayout.headerBottom);
assert(installedLayout.summaryBottom <= installedLayout.firstCardTop);
assert.equal(installedLayout.firstCardTop, browseLayout.firstCardTop);
```

- [ ] **Step 4: 运行测试并确认旧布局失败**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: FAIL，原因是 `.mods-tabs` 仍位于 `.mods-list-header` 外，Tab 与工具栏中心点不在同一行。

### Task 2: 实现 Tab 与工具栏统一头部

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 调整渲染结构**

把 `.mods-tabs` 移入 `.mods-list-header`，并放在 `.list-tools` 前：

```html
<header class="mods-list-header">
  <div class="mods-tabs" role="tablist" aria-label="MODS 内容范围">
    <button type="button" role="tab"
      data-mod-tab="browse"
      data-action="set-tab"
      data-value="browse"
      aria-selected="${viewModel.activeTab === 'browse'}"
      class="${viewModel.activeTab === 'browse' ? 'is-active' : ''}">浏览 ${viewModel.catalogTotal}</button>
    <button type="button" role="tab"
      data-mod-tab="installed"
      data-action="set-tab"
      data-value="installed"
      aria-selected="${viewModel.activeTab === 'installed'}"
      class="${viewModel.activeTab === 'installed' ? 'is-active' : ''}">已安装 ${viewModel.installedCount}</button>
  </div>
  <div class="list-tools">
    ${viewModel.activeTab === 'browse' ? browseControls : installedControls}
    <label class="search-field">${icon('search', 'small')}<input data-input="search" aria-label="搜索 MOD" placeholder="搜索 MOD" value="${escapeHtml(viewModel.searchText)}"></label>
    <button class="refresh-button ${viewModel.state.ui.refreshing ? 'is-refreshing' : ''}" type="button" data-action="refresh">${icon('refresh', 'small')}${viewModel.state.ui.refreshing ? '刷新中' : '刷新'}</button>
  </div>
</header>
```

删除 `</header>` 后原有的独立 `.mods-tabs`。

- [ ] **Step 2: 将头部改为正常 flex 布局**

修改 CSS：

```css
.mods-list-header {
  position: absolute;
  top: 129px;
  left: 207px;
  width: 1300px;
  height: 94px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid rgba(255, 255, 255, 0.08);
}

.mods-tabs {
  position: static;
  width: auto;
  height: 100%;
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  gap: 8px;
  border-bottom: 0;
}

.list-tools {
  width: auto;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding-top: 0;
}
```

- [ ] **Step 3: 让 Tab 与工具控件中心对齐**

将 Tab 按钮高度收敛为工具栏同高，选中下划线贴住头部底线：

```css
.mods-tabs button {
  position: relative;
  min-width: 174px;
  height: 54px;
  align-self: center;
  padding: 0 28px;
}

.mods-tabs button.is-active::after {
  right: 25px;
  bottom: -22px;
  left: 25px;
}
```

- [ ] **Step 4: 统一摘要行与列表起点**

修改 CSS：

```css
.catalog-toolbar {
  position: absolute;
  top: 223px;
  left: 207px;
  width: 1300px;
  height: 64px;
  display: flex;
  align-items: center;
}

.mods-grid {
  top: 287px;
  height: 1193px;
}
```

浏览页继续输出空的 `.catalog-toolbar`，已安装页在其中输出 `data-catalog-summary`，两页首张卡片起点一致。

- [ ] **Step 5: 运行 Demo 验证**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: PASS；浏览与已安装页头部同排、DOM 顺序一致、首张卡片顶部一致，且原排序筛选、搜索、启停和详情回归全部通过。

### Task 3: 视觉审查与新截图

**Files:**
- Modify: `tools/verify-mods-demo.mjs`
- Modify: `public/prd/dst-mods/03-mac-browse-toolbar.png`
- Modify: `public/prd/dst-mods/04-mac-installed-toolbar.png`

- [ ] **Step 1: 只生成两张列表页 PRD 图**

调整测试截图逻辑，本轮只更新：

```text
public/prd/dst-mods/03-mac-browse-toolbar.png
public/prd/dst-mods/04-mac-installed-toolbar.png
```

详情两图 `01-mac-detail-disabled.png`、`02-mac-detail-enabled.png` 不重新截图，避免未变页面产生二进制差异。

- [ ] **Step 2: 运行完整 Demo 验证并生成截图**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected:

```text
PASS: static sort, copy, metadata and switch contracts
PASS: browse header = tabs, sort select, search, refresh
PASS: installed header = tabs, filter select, search, refresh
PASS: enabled controls support Enter/Space, request locking and rollback
PASS: failed update keeps the old version and exposes four ordered actions
```

- [ ] **Step 3: 视觉检查两张截图**

检查：

- 左侧 Tab、右侧工具栏处于同一行。
- 分隔线贯穿头部，选中下划线与分隔线相接。
- 两页搜索和刷新位置不跳动。
- 已安装摘要位于下一行且不与卡片重叠。
- 两页首张卡片顶部一致。
- 卡片快捷启停小滑块仍显示。

- [ ] **Step 4: 完成三角色 Demo 评审**

产品、交互、开发分别检查功能范围、视觉顺序和实现结构。必须修问题直接回到 Task 2；建议项记录但不扩大本轮范围。

### Task 4: 提交并发布 Demo 与图片

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Modify: `tools/verify-mods-demo.mjs`
- Modify: `public/prd/dst-mods/03-mac-browse-toolbar.png`
- Modify: `public/prd/dst-mods/04-mac-installed-toolbar.png`
- Modify: `docs/superpowers/plans/2026-07-31-mac-mods-compact-toolbar.md`

- [ ] **Step 1: 检查变更范围**

Run:

```powershell
git status --short
git diff --check
```

Expected: 仅出现本轮 Demo、验证脚本、两张列表截图和实施计划。

- [ ] **Step 2: 提交 Demo 与图片**

Run:

```powershell
git add -- "demos/Mod与发行人/Mod功能Mac端demo.html" "tools/verify-mods-demo.mjs" "public/prd/dst-mods/03-mac-browse-toolbar.png" "public/prd/dst-mods/04-mac-installed-toolbar.png" "docs/superpowers/plans/2026-07-31-mac-mods-compact-toolbar.md"
git commit -m "feat(mods): align tabs with list controls"
git push origin HEAD:main
```

Expected: 远端 `main` 指向包含新 Demo 和两张新列表图的提交。

- [ ] **Step 3: 获取固定图片提交 SHA**

Run:

```powershell
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: 两个 40 位 SHA 相同；该 SHA 用于 PRD 中两张新列表图。

### Task 5: 更新两份 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `tools/verify-mods-prd.mjs`
- Test: `tools/verify-mods-prd.mjs`

- [ ] **Step 1: 追加版本记录**

主 PRD 由 V1.4 追加 V1.5，技术归档由 V1.7 追加 V1.8。新增内容使用黄色背景与蓝色加粗，旧版本记录保留。

- [ ] **Step 2: 追加同排头部增量规则**

主 PRD 增加：

```markdown
#### 4.2.0.2 Mac Tab 与工具栏同排 V1.5 增量
```

技术归档增加：

```markdown
### 7.0.3 V1.8 Mac Tab 与工具栏同排增量
```

两处均明确：

- 左侧为浏览、已安装 Tab。
- 右侧为排序/筛选、搜索、刷新。
- DOM 与键盘顺序和视觉一致。
- 统一底部分隔线与选中下划线。
- 已安装摘要在下一行。
- 两页卡片起点一致。
- 排序筛选、启停、详情、APP 和创意工坊规则不变。

- [ ] **Step 3: 替换两张列表图固定 SHA**

4 张 PRD 图片统一使用 Task 4 的新图片提交 SHA。该提交包含未变化的两张详情图和本轮更新的两张列表图，满足同一 PRD 图示使用同一固定提交的规则。

- [ ] **Step 4: 增加验收用例**

主 PRD 新增 `AC-MAC-V15-HEADER-*`，技术归档新增 `AC-MAC-V18-HEADER-*`，覆盖：

- 同排几何关系。
- DOM 与键盘顺序。
- 分隔线与选中态。
- 摘要行不重叠。
- 两页首卡顶部一致。
- 排序、筛选、启停、详情与范围回归。

- [ ] **Step 5: 更新 PRD 自动验证**

`tools/verify-mods-prd.mjs` 断言：

```js
assert.match(mainPrd, /\|2026\.07\.31\|V1\.5\|/u);
assert.match(archivePrd, /\|版本\|V1\.8\|/u);
assert.match(mainPrd, /AC-MAC-V15-HEADER-01/u);
assert.match(archivePrd, /AC-MAC-V18-HEADER-01/u);
assert.match(mainPrd, /浏览 Tab、已安装 Tab、排序\/筛选下拉、搜索、刷新/u);
```

逐张图片请求必须返回 HTTP 200，且 `Content-Type` 为 `image/png`。

- [ ] **Step 6: 运行 PRD 验证**

Run:

```powershell
node tools/verify-mods-prd.mjs
git diff --check
```

Expected: 两份 PRD 版本、同排规则、验收和 4 张固定图片全部 PASS。

### Task 6: 提交 PRD 并验证在线预览

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md`
- Modify: `tools/verify-mods-prd.mjs`

- [ ] **Step 1: 提交并推送 PRD**

Run:

```powershell
git add -- "prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md" "prd/mod功能/【PRD】《盖世游戏》DST本地MODS跨平台需求.md" "tools/verify-mods-prd.mjs"
git commit -m "docs(mods): document unified Mac list header"
git push origin HEAD:main
```

- [ ] **Step 2: 验证远端 main**

Run:

```powershell
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: 本地 HEAD 与远端 `main` SHA 相同。

- [ ] **Step 3: 验证在线预览**

Run:

```powershell
$sha = git rev-parse HEAD
$preview = "https://htmlpreview.github.io/?https://github.com/z36358631-ship-it/-/blob/$sha/demos/Mod%E4%B8%8E%E5%8F%91%E8%A1%8C%E4%BA%BA/Mod%E5%8A%9F%E8%83%BDMac%E7%AB%AFdemo.html"
Write-Output $preview
curl.exe -L -sS -o NUL -w "%{http_code} %{content_type}" $preview
```

Expected: `200 text/html; charset=utf-8`。
