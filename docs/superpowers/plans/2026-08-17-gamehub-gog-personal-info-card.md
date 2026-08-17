# GameHub GOG Personal Info Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“我的”页 GOG 已绑定卡重排为“GOG个人信息 + … / 头像昵称 / 游玩时长与游戏数量”，并移除 GOG ID、同步时间和账号价值。

**Architecture:** 只在 `renderProfilePortrait()` 的 `platform==='gog' && bound` 分支使用专属 DOM 与 CSS；Steam、EPIC 模板和平台 Tab 保持不变。继续复用现有 `renderAccountMore()`、`renderAccountMenu()`、刷新、切换和退出状态。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js、Playwright Core、本地 Chrome。

---

## File Structure

- `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`：新增 GOG 专属个人信息卡模板与样式。
- `tools/verify-gog-platform-demo.mjs`：锁定 GOG 卡结构和禁止字段。
- `tools/verify-gog-platform-demo-ui.mjs`：验证层级、字段、两列顺序、菜单和 Steam/EPIC 不回归。
- `tools/capture-gog-platform-demo.mjs`：无需改变截图数量，重新生成第 1 张“我的”页证据。

### Task 1: 增加失败契约

**Files:**
- Modify: `tools/verify-gog-platform-demo.mjs`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 增加静态结构检查**

在 `gogUiCorrections()` 中增加：

```js
for (const token of [
  'profile-gog-card__title',
  'profile-gog-card__identity',
  'profile-gog-card__metrics',
  'GOG个人信息',
  '游玩时长',
  '游戏数量',
]) assert(html.includes(token), `Missing GOG personal-info correction: ${token}`);
```

GOG ID 仍允许存在于 GOG 库和切换账号弹窗，静态测试不做全文件禁止。

- [ ] **Step 2: 更新我的页浏览器断言**

在 `profileFlow()` 授权成功后把旧字段列表改为：

```js
for (const value of ['GOG个人信息','GalaxyRider','游玩时长','438 小时','游戏数量','126']) {
  assert(text.includes(value), `profile missing ${value}`);
}
for (const forbidden of ['GOG ID','gog_20876491','今天 14:32','账号价值','¥6.8k']) {
  assert(!text.includes(forbidden), `profile leaked ${forbidden}`);
}
```

增加 DOM 层级和顺序：

```js
const gogCard = page.locator('.profile-gog-card');
assert.equal(await gogCard.locator('.profile-gog-card__title').innerText(), 'GOG个人信息');
assert.equal(await gogCard.locator('.profile-gog-card__identity strong').innerText(), 'GalaxyRider');
assert.equal(await gogCard.locator('.profile-gog-card__identity small').count(), 0);
assert.equal(await gogCard.locator('.profile-gog-card__title-row [data-action="toggle-account-menu"]').count(), 1);
assert.deepEqual(
  await gogCard.locator('.profile-gog-card__metrics dt').allTextContents(),
  ['游玩时长','游戏数量'],
);
assert.deepEqual(
  await gogCard.locator('.profile-gog-card__metrics dd').allTextContents(),
  ['438 小时','126'],
);
```

保留现有更多菜单、更新防重、切换失败保留旧账号和退出确认测试。

- [ ] **Step 3: 确认旧实现失败**

```powershell
node tools/verify-gog-platform-demo.mjs gogUiCorrections
node tools/verify-gog-platform-demo-ui.mjs profile
```

Expected：分别因缺少 GOG 专属 class、仍展示 GOG ID/同步时间和三列统计失败。

- [ ] **Step 4: 提交测试**

```powershell
git add -- tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs
git commit -m "test: lock GOG personal info card"
```

### Task 2: 实现 GOG 专属个人信息卡

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`

- [ ] **Step 1: 拆出 GOG 已绑定模板**

在 `renderProfilePortrait()` 内定义：

```js
const gogBoundBody = `<section class="profile-platform-card profile-platform-card--gog profile-gog-card" data-annotation-ref="account-summary" data-source-status="derived">
  <div class="profile-gog-card__title-row"><h2 class="profile-gog-card__title">GOG个人信息</h2>${renderAccountMore()}${renderAccountMenu()}</div>
  <div class="profile-gog-card__identity"><span class="profile-avatar">${renderPlatformMark('gog')}</span><strong>${account.username}</strong></div>
  <dl class="profile-gog-card__metrics"><div><dt>游玩时长</dt><dd>${account.totalPlaytime}</dd></div><div><dt>游戏数量</dt><dd>${account.gameCount}</dd></div></dl>
  ${state.accountRefreshInFlight?'<p class="profile-sync-feedback">正在更新数据，请稍候…</p>':''}
</section>`;
```

已绑定分支使用：

```js
const standardBoundBody = `<section class="profile-platform-card profile-platform-card--${platform}" data-annotation-ref="account-summary" data-source-status="measured"><header><span class="profile-avatar">${renderPlatformMark(platform)}</span><div><strong>${account.username}</strong><small>${capability.label} · ${account.lastSyncedAt}</small></div></header>${renderAccountMore()}${renderAccountMenu()}<dl><div><dt>${idLabel}</dt><dd>${idValue}</dd></div><div><dt>游戏</dt><dd>${account.gameCount}</dd></div><div><dt>总时长</dt><dd>${account.totalPlaytime}</dd></div>${metric}</dl>${state.accountRefreshInFlight?'<p class="profile-sync-feedback">正在更新数据，请稍候…</p>':''}${primary}</section>`;
const unboundBody = `<section class="profile-platform-card profile-platform-card--unbound" data-annotation-ref="account-summary" data-source-status="derived"><h2>${capability.label} 数据同步功能</h2><p>绑定账号，查看个人游戏库数据</p><button type="button" data-action="bind-platform">绑定 ${capability.label} 账号</button></section>`;
const body = bound
  ? (platform==='gog' ? gogBoundBody : standardBoundBody)
  : unboundBody;
```

GOG 模板不读取或渲染 `account.gogId`、`account.lastSyncedAt`、`account.accountValue`。

- [ ] **Step 2: 增加专属布局 CSS**

```css
.profile-gog-card{padding:11px}
.profile-gog-card__title-row{position:relative;display:flex;min-height:28px;align-items:center;padding-right:32px}
.profile-gog-card__title{margin:0;font-size:12px}
.profile-gog-card__title-row .account-more{top:0;right:0}
.profile-gog-card__identity{display:flex;align-items:center;gap:9px;margin-top:8px}
.profile-gog-card__identity strong{font-size:12px}
.profile-gog-card__metrics{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:6px!important;margin-top:10px!important}
```

专属 class 覆盖通用三列 `dl`，两个数据格按左“游玩时长”、右“游戏数量”固定顺序显示。

- [ ] **Step 3: 运行局部回归**

```powershell
node tools/verify-gog-platform-demo.mjs gogUiCorrections
node tools/verify-gog-platform-demo.mjs syntax
node tools/verify-gog-platform-demo-ui.mjs profile
```

Expected：全部 PASS；菜单仍能打开且不越界，刷新、切换和退出流程不变。

- [ ] **Step 4: 提交实现**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "fix: restructure GOG personal info card"
```

### Task 3: 完整回归与截图

**Files:**
- Verify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Verify: `tools/verify-gog-platform-demo.mjs`
- Verify: `tools/verify-gog-platform-demo-ui.mjs`
- Verify: `tools/capture-gog-platform-demo.mjs`
- Verify: `tools/compare-gog-platform-visuals.py`

- [ ] **Step 1: 运行完整回归**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
python -X utf8 tools/compare-gog-platform-visuals.py
```

Expected：业务与浏览器契约全部 PASS；15 张预览和 10 张源分辨率截图生成；视觉报告保留真实结果。

- [ ] **Step 2: 人工审查我的页**

检查：

```text
.tmp/gog-platform-demo-captures/01-profile-portrait.png
.tmp/gog-platform-demo-captures/11-profile-gog-logout-dialog.png
```

确认标题/菜单、头像昵称、两列统计顺序、禁止字段和退出弹窗层级。

- [ ] **Step 3: 检查范围**

```powershell
git diff --check -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs
git status --short -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs
```

只提交以上 GOG 卡片相关文件，不纳入工作区其他改动。
