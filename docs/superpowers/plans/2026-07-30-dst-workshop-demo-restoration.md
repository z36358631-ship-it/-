# DST 创意工坊 Demo 还原 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 MOD 功能 Demo 中被误改的创意工坊恢复为官方既有业务与参考图结构，同时保持非官方 MODS 的设备本地安装方案独立。

**Architecture:** 保持 `demos/MOD功能产品方案demo.html` 单文件离线架构。创意工坊使用独立的官方订阅状态源和独立页面模板；MODS 继续使用 Mac/APP 分设备状态源。启动前检查只读取当前设备已启用的非官方 MODS，不读取、下载或裁决创意工坊内容。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js、`playwright-core`

---

### Task 1: 建立创意工坊边界回归检查

**Files:**
- Create: `tools/verify-dst-workshop-demo.mjs`
- Test: `demos/MOD功能产品方案demo.html`

- [ ] **Step 1: 写入当前必然失败的静态合同检查**

```js
import fs from 'node:fs/promises';

const html = await fs.readFile('demos/MOD功能产品方案demo.html', 'utf8');
const required = [
  '我的订阅',
  'Steam 创意工坊同步',
  'data-open-menu',
  'workshop-sort-row',
  'workshop-refresh',
  'launchMods'
];
const forbidden = [
  '当前设备独立订阅',
  '官方订阅将在启动前下载',
  '启动前下载 Workshop 版本',
  'launchWorkshop',
  'data-conflict="official"',
  'data-conflict="mod"'
];

const errors = [];
for (const value of required) {
  if (!html.includes(value)) errors.push(`缺少：${value}`);
}
for (const value of forbidden) {
  if (html.includes(value)) errors.push(`不应出现：${value}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('DST Workshop demo static contract verified');
```

- [ ] **Step 2: 运行检查并确认旧 Demo 失败**

Run: `node tools/verify-dst-workshop-demo.mjs`

Expected: FAIL，至少报告“缺少：Steam 创意工坊同步”和“不应出现：当前设备独立订阅”。

- [ ] **Step 3: 提交回归检查**

```bash
git add tools/verify-dst-workshop-demo.mjs
git commit -m "test: add DST workshop demo boundary checks"
```

### Task 2: 按原图恢复入口、列表与详情结构

**Files:**
- Modify: `demos/MOD功能产品方案demo.html:519-669`
- Reference: `prd/mod功能/创意工坊参考图/`
- Reference: `prd/mod功能/APP创意工坊参考图/`

- [ ] **Step 1: 修正 Demo 说明文案**

将工具栏状态规则改为：

```html
<div class="toolbar-note">
  <strong>两套业务，两个状态源</strong><br>
  创意工坊沿用 Steam 官方订阅；Mods 只管理当前设备安装和启停。APP 横竖屏切换保留当前页面。
</div>
```

删除“官方与非官方重复时启动前二选一”的 Demo 假设，将体验路径第三步改成“启动前仅检查当前设备已启用 Mods”。

- [ ] **Step 2: 恢复 Mac 游戏详情中的创意工坊模块**

Mac 模式下直接显示以下结构：

```html
<section class="workshop-preview">
  <header>
    <span class="source-icon">⌕</span>
    <div><h3>创意工坊</h3><p>工坊热门</p></div>
    <span class="workshop-total">2.5 万个条目</span>
    <button data-open="workshop">查看全部 ›</button>
  </header>
  <div class="workshop-preview-grid" id="workshopPreviewGrid"></div>
</section>
```

MODS 保持为另一张独立卡片，不使用创意工坊的订阅术语。

- [ ] **Step 3: 恢复 APP “更多菜单”入口**

APP 模式下“更多”按钮使用 `data-open-menu` 打开底部菜单，菜单至少包含：

```html
<button data-open="workshop"><i>⌘</i><span>创意工坊</span></button>
<button data-open="mods"><i>◇</i><span>Mods</span></button>
```

创意工坊不在 APP 游戏详情中显示为并列大卡片。

- [ ] **Step 4: 恢复列表信息架构**

创意工坊页面保留“浏览 / 我的订阅”。浏览页增加 `workshop-sort-row`，包含“热门、最新、订阅最多、评分最高、最近更新”；Mac 增加搜索、排序下拉与 `workshop-refresh`，APP 竖屏为单列卡片，APP 横屏和 Mac 为双列卡片。

- [ ] **Step 5: 恢复详情信息架构**

Mac 使用居中详情弹窗、顶部标题和元信息、中部预览图、下部简介与更新记录、底部固定“订阅/已订阅”和赞踩区。APP 竖屏使用全屏详情，APP 横屏使用左右分栏详情。创意工坊详情不得出现“兼容性检查、硬依赖、本机安装、启用、启动前下载”。

- [ ] **Step 6: 运行静态检查确认视觉结构关键词已满足**

Run: `node tools/verify-dst-workshop-demo.mjs`

Expected: 仍可因 Task 3 中旧启动逻辑残留而 FAIL，但不再报告入口、页签和同步文案缺失。

### Task 3: 隔离官方订阅状态与本地 MODS 启动检查

**Files:**
- Modify: `demos/MOD功能产品方案demo.html:725-1066`
- Test: `tools/verify-dst-workshop-demo.mjs`

- [ ] **Step 1: 将创意工坊订阅改为官方共享状态**

定义唯一的官方状态，不再放入 Mac/APP 设备状态：

```js
const officialWorkshop = new Set(['w-clock']);
const deviceState = {
  mac:{mods:new Set(['m-map','m-stack']),enabled:new Set(['m-map','m-stack'])},
  app:{mods:new Set(['m-ui']),enabled:new Set(['m-ui'])}
};
const workshopState = () => officialWorkshop;
const localState = () => viewMode === 'mac' ? deviceState.mac : deviceState.app;
```

订阅成功提示使用“已订阅，将由 Steam 创意工坊同步”，取消时使用“已取消订阅”。Mac 与 APP 视图切换后读取同一个 `officialWorkshop`。

- [ ] **Step 2: 删除创意工坊下载派生状态**

删除 `downloaded`、`待下载`、`本机就绪`、`当前设备已订阅`和启动完成后写入创意工坊下载状态的代码。创意工坊按钮只显示“＋ 订阅”或“✓ 已订阅”。

- [ ] **Step 3: 将启动前检查收敛为非官方 MODS**

删除 `launchWorkshop`、重复内容检测、官方/非官方二选一和 `conflictChoice`。`renderLaunch()` 只渲染 `localState().enabled`：

```js
function renderLaunch(){
  document.getElementById('launchMods').innerHTML = launchItems(modItems);
  document.getElementById('launchBtn').disabled = false;
  document.getElementById('effectiveCount').textContent =
    `${localState().enabled.size} 项`;
  document.getElementById('skippedCount').textContent = '0 项';
  document.getElementById('launchNote').textContent =
    '仅检查当前设备已启用的非官方 Mods。';
}
```

- [ ] **Step 4: 运行静态合同检查**

Run: `node tools/verify-dst-workshop-demo.mjs`

Expected: PASS，并输出 `DST Workshop demo static contract verified`。

- [ ] **Step 5: 提交产品逻辑修正**

```bash
git add demos/MOD功能产品方案demo.html
git commit -m "fix: restore official workshop flow in MOD demo"
```

### Task 4: 浏览器冒烟测试与截图复核

**Files:**
- Modify: `tools/verify-dst-workshop-demo.mjs`
- Create: `demos/mod-demo-workshop-mac-restored.png`
- Create: `demos/mod-demo-workshop-portrait-restored.png`
- Create: `demos/mod-demo-workshop-landscape-restored.png`

- [ ] **Step 1: 在静态检查后追加 Playwright 冒烟测试**

使用 `playwright-core` 和本机 Chrome 打开 `file:///.../demos/MOD功能产品方案demo.html`，依次验证：

```js
await page.locator('[data-mode="mac"]').click();
await page.locator('[data-open="workshop"]').first().click();
await page.getByText('我的订阅').click();
await page.getByText('浏览').click();
await page.locator('[data-action="subscribe"]').first().click({ force:true });
await page.locator('[data-mode="app-port"]').click();
await page.getByText('已订阅', { exact:true }).first().waitFor();
await page.locator('[data-mode="app-land"]').click();
await page.locator('[data-detail="workshop"]').first().click({ force:true });
await page.locator('#detailMask.show').waitFor();
```

再返回游戏详情打开启动检查，断言弹层不包含“创意工坊”“重复内容”或“选择版本”，并包含“仅检查当前设备已启用的非官方 Mods”。

- [ ] **Step 2: 运行完整冒烟测试**

Run: `node tools/verify-dst-workshop-demo.mjs`

Expected: PASS，静态合同和浏览器交互全部通过。

- [ ] **Step 3: 截取三端创意工坊页面**

分别在 Mac、APP 竖屏和 APP 横屏状态截图至：

```text
demos/mod-demo-workshop-mac-restored.png
demos/mod-demo-workshop-portrait-restored.png
demos/mod-demo-workshop-landscape-restored.png
```

- [ ] **Step 4: 对照原图检查**

确认入口位置、页签名称、排序层级、卡片方向、详情弹层和主按钮位置与对应参考图一致；确认三张截图均无默认白色按钮背景、内容溢出或底部操作栏遮挡。

- [ ] **Step 5: 提交测试与截图**

```bash
git add tools/verify-dst-workshop-demo.mjs demos/mod-demo-workshop-*-restored.png
git commit -m "test: verify restored workshop demo across layouts"
```
