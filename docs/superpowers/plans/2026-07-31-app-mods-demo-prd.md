# APP MODS Demo and PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 制作独立 APP MODS 单文件高保真 Demo、自动验证、真实截图和仅 C 端独立 PRD。

**Architecture:** Demo 使用单一状态树维护页面、方向、主 Tab、排序、搜索、筛选、详情和本机任务状态，渲染层按 390×844 与 874×402 两套布局重排。验证脚本检查静态文案、DOM 契约、排序搜索、安装启停和旋转状态；PRD 只引用最终 Demo 截图的固定 Git 提交地址。

**Tech Stack:** HTML/CSS/JavaScript、Node.js、Playwright Core、Markdown、GitHub/jsDelivr。

---

### Task 1: 固化独立设计与文件边界

**Files:**
- Create: `docs/superpowers/specs/2026-07-31-app-mods-demo-prd-design.md`
- Create: `docs/superpowers/plans/2026-07-31-app-mods-demo-prd.md`

- [x] **Step 1: 写入已确认页面、状态和横竖屏规则**

规格必须包含：

```text
更多菜单 5+4
浏览 / 已安装
搜索框独占一行
热门 / 下载最多 / 最新发布
列表快捷开关
详情整颗状态按钮
横竖屏状态连续
```

- [x] **Step 2: 检查范围未扩到创意工坊和启动检查**

Run:

```powershell
Select-String -Path docs/superpowers/specs/2026-07-31-app-mods-demo-prd-design.md -Pattern "本期不实现创意工坊页面|本期不展示启动检查"
```

Expected: 两条范围约束均命中。

### Task 2: 先写 Demo 静态失败契约

**Files:**
- Create: `tools/verify-app-mods-demo.mjs`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 断言独立 Demo 文件存在**

```js
assert.equal(fs.existsSync(demoPath), true, 'APP MODS Demo 缺失');
```

- [ ] **Step 2: 断言关键文案和控件**

```js
for (const copy of [
  '饥荒 MODS', '浏览', '已安装', '热门', '下载最多', '最新发布',
  '搜索 MOD 名称或作者', '已启用', '已停用'
]) assert.match(html, new RegExp(copy));
```

- [ ] **Step 3: 运行并确认失败**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
```

Expected: FAIL，独立 Demo 尚未创建。

### Task 3: 实现单文件 APP MODS Demo

**Files:**
- Create: `demos/Mod与发行人/APP端MODS功能demo.html`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 建立状态模型**

```js
const state = {
  orientation: 'portrait',
  screen: 'game',
  tab: 'browse',
  sort: 'hot',
  search: '',
  installedFilter: 'all',
  activeModId: null,
  installed: new Set(['minimap', 'health-bar', 'language-pack', 'storage-box']),
  enabled: new Set(['minimap', 'health-bar', 'storage-box']),
  task: null
};
```

- [ ] **Step 2: 实现游戏详情与 5+4 更多菜单**

菜单 DOM 固定顺序：

```js
['PC引擎设置', '创意工坊', 'MODS', '分享', '添加到桌面',
 '版本切换', '移除游戏', '修改信息', '按键与布局']
```

- [ ] **Step 3: 实现浏览页**

浏览页结构固定为：

```html
<div class="primary-tabs">浏览 / 已安装</div>
<label class="search-row">搜索 MOD 名称或作者</label>
<div class="sort-tabs">热门 / 下载最多 / 最新发布</div>
<div class="mods-grid">MOD 卡片</div>
```

- [ ] **Step 4: 实现已安装页**

已安装页不渲染搜索输入，只渲染“全部 / 可更新”、刷新和带快捷启停开关的卡片。

- [ ] **Step 5: 实现详情与本机操作**

未安装显示“下载安装”；已安装显示整颗“已启用 / 已停用”按钮、更新和卸载。安装使用同一任务对象推进下载、校验和安装，重复点击直接返回。

- [ ] **Step 6: 实现横竖屏切换**

```js
state.orientation = nextOrientation;
render();
restoreScrollAnchor();
```

旋转不重建 `state.task`，也不清空页面、Tab、搜索、排序、筛选或当前 MOD。

- [ ] **Step 7: 运行静态验证**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
```

Expected: 静态结构和文案 PASS。

### Task 4: 补齐浏览器交互验证与截图

**Files:**
- Modify: `tools/verify-app-mods-demo.mjs`
- Create: `public/prd/app-mods/01-game-more-menu-portrait.png`
- Create: `public/prd/app-mods/02-browse-portrait.png`
- Create: `public/prd/app-mods/03-installed-portrait.png`
- Create: `public/prd/app-mods/04-detail-portrait.png`
- Create: `public/prd/app-mods/05-browse-landscape.png`
- Create: `public/prd/app-mods/06-detail-landscape.png`

- [ ] **Step 1: 验证 5+4 菜单**

```js
assert.deepEqual(menuLabels, [
  'PC引擎设置', '创意工坊', 'MODS', '分享', '添加到桌面',
  '版本切换', '移除游戏', '修改信息', '按键与布局'
]);
```

- [ ] **Step 2: 验证浏览结构和排序**

```js
assert.equal(await page.locator('[data-search]').count(), 1);
assert.deepEqual(sortLabels, ['热门', '下载最多', '最新发布']);
```

- [ ] **Step 3: 验证已安装无搜索和快捷启停**

```js
assert.equal(await page.locator('[data-screen="mods"] [data-search]').count(), 0);
assert.equal(await page.locator('[data-enable-switch]').count(), 4);
```

- [ ] **Step 4: 验证详情启停与旋转连续**

打开已安装 MOD 详情，切换启停后旋转，断言：

```js
assert.equal(snapshot.activeModId, 'minimap');
assert.equal(snapshot.enabled.includes('minimap'), false);
assert.equal(snapshot.orientation, 'landscape');
```

- [ ] **Step 5: 生成六张 PRD 截图**

Run:

```powershell
node tools/verify-app-mods-demo.mjs --screenshots
```

Expected: 六张 PNG 均生成，尺寸分别符合竖屏和横屏画布。

### Task 5: 视觉审查与三角色评审

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Modify: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 对照 UI 规范审查七项**

检查色彩、字号、圆角、间距、交互、真实内容和手机容器。

- [ ] **Step 2: 产品经理审查**

检查入口、浏览、已安装、详情、安装、启停和横竖屏是否完整。

- [ ] **Step 3: 交互设计审查**

检查 Tab 层级、搜索独占行、排序子 Tab、返回路径和操作反馈。

- [ ] **Step 4: 开发工程师审查**

检查单状态树、重复任务保护、事件委托、重绘和状态恢复。

- [ ] **Step 5: 修复必须修问题并回归**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
git diff --check
```

Expected: 全部 PASS，无空白错误。

### Task 6: 输出独立 PRD

**Files:**
- Create: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`
- Create: `tools/verify-app-mods-prd.mjs`
- Test: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: 按仅 C 端结构写 PRD**

PRD 包含版本信息、背景目标、故事、概要设计、C 端详细设计、非功能需求、埋点、运营需求、自检记录。

- [ ] **Step 2: 写清国内海外差异**

```text
国内包：产品名“盖世游戏”。
海外包：产品名“GameHub”，支持海外包既有多语言。
MODS 页面、目录、下载、安装和本机管理规则一致。
本需求不涉及云游戏、实名认证和登录方式。
```

- [ ] **Step 3: 写清列表和状态边界**

覆盖排序次级规则、增量加载、空状态、骨架屏、弱网、图片失败、重复安装、后台暂停、启停回滚、卸载确认和横竖屏恢复。

- [ ] **Step 4: 建立图片与内容验证**

验证脚本断言六张图均在 4.2 表格图示列，地址使用 40 位固定提交 SHA，且无本地路径、分支地址或 `blob` 地址。

### Task 7: 发布图片并完成远程验收

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`
- Modify: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: 提交 Demo、截图与验证**

Run:

```powershell
git add -- "demos/Mod与发行人/APP端MODS功能demo.html" "tools/verify-app-mods-demo.mjs" "public/prd/app-mods"
git commit -m "feat(mods): add app mods demo"
```

- [ ] **Step 2: 经用户授权后推送并获取固定 SHA**

Run:

```powershell
git push origin HEAD:main
git rev-parse HEAD
```

Expected: 返回包含六张截图的 40 位提交 SHA。

- [ ] **Step 3: 替换 PRD 图片地址并逐张远程验证**

图片地址格式：

```text
https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@<40位SHA>/public/prd/app-mods/<图片名>.png
```

每张必须返回 HTTP 200 和 `image/png`。

- [ ] **Step 4: 提交 PRD 并验证**

Run:

```powershell
node tools/verify-app-mods-prd.mjs
git diff --check
git add -- "prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md" "tools/verify-app-mods-prd.mjs" "docs/superpowers/specs/2026-07-31-app-mods-demo-prd-design.md" "docs/superpowers/plans/2026-07-31-app-mods-demo-prd.md"
git commit -m "docs(mods): add app mods prd"
```

Expected: PRD 结构、内容、六张固定图片和远程响应全部 PASS。

### Task 9: 收紧横屏更多菜单为两行内容高度

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Modify: `tools/verify-app-mods-demo.mjs`
- Create: `public/prd/app-mods/08-game-more-menu-landscape.png`
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`
- Modify: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: 先补横屏菜单布局断言**

在 `tools/verify-app-mods-demo.mjs` 中将 Demo 旋转到横屏并保持更多菜单打开，断言：

```js
assert.equal(menuRows.length, 2);
assert.equal(Math.abs(panelCenterY - deviceCenterY) <= 1, true);
assert.equal(panelHeight <= 250, true);
assert.equal(panelBottomGap <= 24, true);
```

- [ ] **Step 2: 运行测试并确认旧布局失败**

Run: `node tools/verify-app-mods-demo.mjs`

Expected: FAIL，旧横屏弹层高度约 340px，底部空白超过一行。

- [ ] **Step 3: 实现内容自适应居中弹层**

在横屏 `.more-panel` 规则中移除上下同时固定的拉伸方式，保留横向安全区，并使用内容高度垂直居中：

```css
.device.landscape .more-panel {
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
}
```

- [ ] **Step 4: 生成横屏菜单截图并更新 PRD**

Run: `node tools/verify-app-mods-demo.mjs --screenshots`

Expected: 新增 `08-game-more-menu-landscape.png`；PRD 的“游戏详情与更多菜单”图示同时包含竖屏和横屏，说明横屏仅 5+4 两行且无第三行空白。

- [ ] **Step 5: 运行完整校验**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
node tools/verify-app-mods-prd.mjs
git diff --check
```

Expected: 本地校验全部 PASS；远程图片验证继续等待推送授权。
