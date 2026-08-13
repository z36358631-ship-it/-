# 盖世游戏 GOG 平台完整接入返修 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现行盖世游戏真实横竖页面中完成完整 GOG 账号、游戏库、搜索、详情切换与启动链路，同时把账号低频操作收进 `…` 菜单并保留 EPIC 专属“喜加一”。

**Architecture:** 保持单文件三栏交互标注 Demo，横竖布局独立渲染，共享平台账号、游戏映射、入口来源、当前平台和异常状态。静态契约负责结构与禁用规则，Playwright 负责真实交互和路由，截图工具负责固定视口证据，PRD 验证器负责最终业务口径一致性。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js ESM、`node:assert`、`vm`、`playwright-core`、Markdown、`taskctl.cmd`

---

## 文件结构

- `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`：10 个真实页面、共享业务状态、账号菜单、平台路由、游戏归类、交互标注和异常模拟。
- `tools/verify-gog-platform-demo.mjs`：Demo 的静态结构、语法、能力和禁用规则契约。
- `tools/verify-gog-platform-demo-ui.mjs`：账号菜单、授权、游戏库、搜索、详情、平台切换、启动和标注的浏览器验收。
- `tools/capture-gog-platform-demo.mjs`：固定视口页面、账号菜单、平台切换弹窗和完整标注壳截图。
- `prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md`：最终 C 端 PRD。
- `tools/verify-gog-platform-prd.mjs`：PRD 结构、最终范围、禁用能力和占位符检查。
- `C:/Users/z3635/.codex/skills/pm-image2proto/references/learning_log.jsonl`：截图还原与返修经验记录。
- `.tmp/gog-platform-demo-captures/`：自动生成的视觉证据，不作为产品代码提交。

## Task 1: 先建立最终范围的失败契约

**Files:**
- Modify: `tools/verify-gog-platform-demo.mjs`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 在静态验证器增加账号菜单与完整详情能力契约**

在 `tools/verify-gog-platform-demo.mjs` 增加并注册以下检查：

```js
function accountMenu() {
  for (const token of [
    'data-action="toggle-account-menu"',
    'data-account-menu',
    '更新数据',
    '切换账号',
    '退出账号',
    'data-action="open-free-games"',
    '喜加一',
  ]) assert(html.includes(token), `Missing account-menu token: ${token}`);
  assert(html.includes('supportsFreeGames:false'), 'GOG must disable free-games entry');
  pass('accountMenu');
}

function fullGameplayScope() {
  for (const token of [
    'normalizeGameName',
    'matchGameCandidate',
    'sourcePlatform',
    'selectedPlatform',
    'renderPlatformSwitch',
    'data-detail-hours',
    'data-detail-cloud',
    'data-launch-platform',
    'launchSelectedPlatform',
    'platformAppId',
  ]) assert(html.includes(token), `Missing complete GOG token: ${token}`);
  assert(html.includes("['steam','epic','gog']"), 'Steam > EPIC > GOG priority missing');
  pass('fullGameplayScope');
}
```

把 `accountMenu` 和 `fullGameplayScope` 加入 `tasks`。保留 `supportsAccountValue:false`、`accountValue:null`、安全边界和 10 页面检查。

- [ ] **Step 2: 在 UI 验证器写入账号菜单失败测试**

用以下断言替换账号卡三按钮直出断言：

```js
await selectScreen('profile-portrait');
await page.click('[data-profile-platform="gog"]');
assert.equal(await page.locator('[data-account-menu]').count(), 0);
await page.click('[data-action="toggle-account-menu"]');
assert.equal(await page.locator('[data-account-menu]').count(), 1);
for (const action of ['refresh-platform','switch-platform','logout-platform']) {
  assert.equal(await page.locator(`[data-account-menu] [data-action="${action}"]`).count(), 1);
}
assert.equal(await page.locator('[data-action="open-free-games"]').count(), 0);
await page.locator('.profile-page').click({ position:{ x:10, y:500 } });
assert.equal(await page.locator('[data-account-menu]').count(), 0);

await page.click('[data-profile-platform="epic"]');
assert.equal(await page.locator('[data-action="open-free-games"]').count(), 1);
```

- [ ] **Step 3: 增加完整平台链路与归类失败测试**

在 `detailSearchFlow()` 增加：

```js
const sameGameRows = rows.filter(row => row.gameId === 'cyberpunk-2077');
assert.deepEqual(sameGameRows.map(row => row.platform), ['epic', 'gog']);

const mapping = await page.evaluate(() => ({
  same: window.GogDemoApp.matchGameCandidate('赛博朋克 2077', 'Cyberpunk 2077'),
  ambiguous: window.GogDemoApp.matchGameCandidate('Control', 'Control Ultimate Edition'),
}));
assert.equal(mapping.same.matched, true);
assert.equal(mapping.ambiguous.matched, false);

await page.click('[data-action="select-detail-platform"][data-platform="epic"]');
await page.click('[data-launch-platform]');
assert.deepEqual(await page.evaluate(() => window.GogDemoApp.state.lastLaunchRequest), {
  gameId:'cyberpunk-2077',
  platform:'epic',
  platformAppId:'epic-cyberpunk',
});
```

- [ ] **Step 4: 运行契约并确认旧账号卡实现失败**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs accountMenu
node tools/verify-gog-platform-demo-ui.mjs profile
```

Expected: `accountMenu` 因缺少 `…` 菜单与 EPIC“喜加一”失败；`profile` 因旧三按钮直出失败。

- [ ] **Step 5: 提交失败契约**

```powershell
git add -- tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs
git commit -m "test: define final GOG integration contract"
```

## Task 2: 实现账号卡平台差异与 `…` 菜单

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo.mjs`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 建立 Steam、EPIC、GOG 账号展示能力模型**

在 Demo 数据区加入：

```js
const PLATFORM_CAPABILITIES = {
  steam:{ label:'STEAM', supportsAccountValue:true, supportsFreeGames:false },
  epic:{ label:'EPIC', supportsAccountValue:true, supportsFreeGames:true },
  gog:{ label:'GOG', supportsAccountValue:false, supportsFreeGames:false },
};

Object.assign(state, {
  profilePlatform:'gog',
  accountMenuOpen:false,
  accountRefreshInFlight:false,
  accountRefreshRequestCount:0,
  showLogoutConfirm:false,
});
```

Steam、EPIC 沿用现有展示字段；GOG 继续使用 `GOG ID`、游戏数、总时长和最近同步时间，不渲染账号价值。

- [ ] **Step 2: 将账号卡常驻三按钮替换为菜单和平台专属主操作**

账号卡头部增加：

```html
<button type="button" class="account-more" data-action="toggle-account-menu" aria-label="更多账号操作">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="5" cy="12" r="1.5"></circle>
    <circle cx="12" cy="12" r="1.5"></circle>
    <circle cx="19" cy="12" r="1.5"></circle>
  </svg>
</button>
```

菜单使用：

```html
<div class="account-menu" data-account-menu role="menu">
  <button type="button" role="menuitem" data-action="refresh-platform">更新数据</button>
  <button type="button" role="menuitem" data-action="switch-platform">切换账号</button>
  <button type="button" role="menuitem" data-action="logout-platform">退出账号</button>
</div>
```

只有 `PLATFORM_CAPABILITIES[platform].supportsFreeGames` 为 `true` 时渲染：

```html
<button type="button" class="profile-primary-action" data-action="open-free-games">喜加一</button>
```

GOG 不渲染主操作容器；不得用 `visibility:hidden` 或固定高度保留空白。

- [ ] **Step 3: 实现菜单关闭与账号操作状态**

事件规则：

```js
function closeAccountMenu() {
  state.accountMenuOpen = false;
}

function selectProfilePlatform(platform) {
  state.profilePlatform = platform;
  closeAccountMenu();
  state.showLogoutConfirm = false;
  render();
}

function refreshCurrentPlatform() {
  if (state.accountRefreshInFlight) return;
  state.accountRefreshInFlight = true;
  state.accountRefreshRequestCount += 1;
  closeAccountMenu();
  render();
  setTimeout(() => {
    state.accountRefreshInFlight = false;
    const account = state.accountByPlatform[state.profilePlatform]?.account;
    if (account) account.lastSyncedAt = '刚刚';
    render();
  }, 120);
}
```

文档级点击监听最后增加外部关闭判断：点击不在 `[data-account-menu]` 与 `[data-action="toggle-account-menu"]` 内时关闭菜单。切换失败复用官方授权页并保留旧账号；退出复用现有二次确认，只清除当前平台。

- [ ] **Step 4: 调整账号菜单 CSS 并验证 402px 不裁切**

使用相对定位卡片和右对齐菜单：

```css
.profile-platform-card{position:relative;min-height:0}
.account-more{position:absolute;top:14px;right:14px;width:32px;height:32px}
.account-more svg{width:20px;height:20px;fill:currentColor}
.account-menu{position:absolute;z-index:9;top:50px;right:12px;width:132px;padding:6px;border-radius:11px;background:#292a2f;box-shadow:0 14px 40px rgba(0,0,0,.42)}
.account-menu button{display:block;width:100%;height:36px;padding:0 12px;text-align:left}
.profile-primary-action{width:100%;height:36px;margin-top:13px;border-radius:18px;background:#55555a}
```

- [ ] **Step 5: 运行账号菜单与静态检查**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs accountMenu
node tools/verify-gog-platform-demo.mjs gogCapabilities
node tools/verify-gog-platform-demo-ui.mjs profile
```

Expected: 三项均输出 `PASS`；GOG 无账号价值和“喜加一”；EPIC 仅一个“喜加一”；菜单外部点击关闭。

- [ ] **Step 6: 提交账号卡返修**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "feat: compact platform account actions"
```

## Task 3: 完整实现游戏库、搜索、平台路由与游戏归类

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo.mjs`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 补全平台版本与归类数据**

为搜索和游戏库数据统一使用以下字段：

```js
{
  gameId:'cyberpunk-2077',
  platform:'gog',
  platformAppId:'gog-1423049311',
  name:'赛博朋克 2077',
  localizedNames:['赛博朋克 2077','Cyberpunk 2077'],
  aliases:[],
  hours:74,
  cloud:'云存档已同步',
  launch:'GOG 启动'
}
```

同一游戏的 EPIC/GOG 版本共用 `gameId`，分别保留 `platformAppId`。增加明确的歧义示例，使 `Control` 与 `Control Ultimate Edition` 保持不同详情。

- [ ] **Step 2: 实现可测试的归类候选函数**

```js
const CONFIRMED_GAME_ALIASES = new Map([
  ['赛博朋克2077|cyberpunk2077', 'cyberpunk-2077'],
  ['巫师3狂猎|thewitcher3wildhunt', 'the-witcher-3'],
]);

function normalizeGameName(value) {
  return value.toLocaleLowerCase('zh-CN')
    .replace(/[\s·:：—_\-™®©]/g, '')
    .replace(/终极版|ultimateedition/g, '');
}

function matchGameCandidate(left, right) {
  const a = normalizeGameName(left);
  const b = normalizeGameName(right);
  const confirmed = [...CONFIRMED_GAME_ALIASES.entries()]
    .find(([key]) => key.split('|').includes(a) && key.split('|').includes(b));
  return confirmed
    ? { matched:true, gameId:confirmed[1], confidence:'confirmed' }
    : { matched:false, gameId:null, confidence:'low' };
}
```

名称只生成候选；没有确认映射时返回 `matched:false`，不自动合并。

- [ ] **Step 3: 保持横竖搜索多平台分条并验证入口上下文**

`renderSearchRows()` 必须为每个平台版本生成独立 `[data-search-result]`。点击结果调用：

```js
function openPlatformGame(card) {
  state.selectedGame = {
    gameId:card.dataset.gameId,
    platformAppId:card.dataset.platformAppId,
    platform:card.dataset.platform,
  };
  state.sourcePlatform = card.dataset.platform;
  state.selectedPlatform = card.dataset.platform;
  state.platformSwitchOpen = false;
  selectPage(`detail-${state.orientation}`);
}
```

保持 EPIC 评分换算和 GOG“暂无评分”。

- [ ] **Step 4: 保持 GOG 游戏库绑定与已登录链路**

游戏库入口顺序继续为 `EPIC → GOG → 导入游戏`。未绑定时调用 `beginAuthorization('bind')`；已绑定进入对应方向的 GOG 账号库。账号库游戏卡保留封面、名称、GOG 标识、时长和 `gameId/platformAppId/sourcePlatform` 路由。

- [ ] **Step 5: 运行游戏库、搜索与平台模型检查**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs platformModel
node tools/verify-gog-platform-demo.mjs fullGameplayScope
node tools/verify-gog-platform-demo-ui.mjs library
node tools/verify-gog-platform-demo-ui.mjs detailSearch
```

Expected: 四项均输出 `PASS`；横竖结果模型一致；同一游戏 EPIC/GOG 分条；入口来源写入详情；低置信度不归类。

- [ ] **Step 6: 提交游戏库、搜索和归类实现**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "feat: complete GOG discovery and mapping flow"
```

## Task 4: 完成详情平台切换、获得游戏与启动事件

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 将详情数据按当前游戏和平台版本解析**

用 `getPlatformVersion(gameId, platform)` 替代只按平台读取固定数据：

```js
function getPlatformVersion(gameId, platform) {
  return GAME_PLATFORM_VERSIONS.find(item =>
    item.gameId === gameId && item.platform === platform
  ) || null;
}
```

无来源时调用既有 `resolveSelectedPlatform()`，确保只在已拥有且账号有效的平台中按 Steam、EPIC、GOG 选择。

- [ ] **Step 2: 让切换弹窗只显示当前游戏可用的平台版本**

```js
function availablePlatformsForGame(gameId) {
  return PLATFORM_PRIORITY.filter(platform =>
    state.ownedPlatforms.includes(platform) &&
    getPlatformVersion(gameId, platform) &&
    isPlatformAvailable(platform)
  );
}
```

`renderPlatformSwitch()` 使用此列表；选择平台后更新 `selectedPlatform`，但保持 `sourcePlatform` 不变。点击弹窗外部关闭时不改变选择。

- [ ] **Step 3: 同步平台标识、时长、云存档、启动 icon 和获得游戏平台**

横竖详情都从当前 `gameId + selectedPlatform` 版本渲染：

```html
<button type="button" data-action="open-platform-switch" data-detail-platform-logo></button>
<dd data-detail-hours></dd>
<dd data-detail-cloud></dd>
<button type="button" class="detail-launch" data-launch-platform></button>
<div class="obtain-platforms" data-obtain-platforms>
  <span data-obtain-platform="steam">Steam</span>
  <span data-obtain-platform="epic">EPIC</span>
  <span data-obtain-platform="gog">GOG</span>
</div>
```

获得游戏平台只做来源说明，不绑定启动事件；启动按钮使用平台 icon 与平台名。

- [ ] **Step 4: 把启动按钮从空操作改为可验证事件**

```js
function launchSelectedPlatform() {
  const gameId = state.selectedGame?.gameId || 'cyberpunk-2077';
  const version = getPlatformVersion(gameId, state.selectedPlatform);
  if (!version || !isPlatformAvailable(state.selectedPlatform)) return;
  state.lastLaunchRequest = {
    gameId,
    platform:state.selectedPlatform,
    platformAppId:version.platformAppId,
  };
}
```

`data-action="launch-selected"` 调用该函数。Demo 不新增 Toast；测试通过 `state.lastLaunchRequest` 验证启动参数。

- [ ] **Step 5: 覆盖来源不可用、云存档缺失和切换取消**

- 明确来源不可用时保留 `sourcePlatform` 与 `selectedPlatform`，显示现有重新登录/切换入口。
- 云存档缺失统一渲染“未获取”。
- 切换取消或点击弹窗外部只关闭弹窗。
- 启动失败模拟不清空详情与选择，不新增页面。

- [ ] **Step 6: 运行详情完整链路验证**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs fullGameplayScope
node tools/verify-gog-platform-demo-ui.mjs detailSearch
```

Expected: 两项均输出 `PASS`；来源优先、默认优先级、平台切换和启动参数正确。

- [ ] **Step 7: 提交详情完整链路**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "feat: complete GOG detail switching and launch"
```

## Task 5: 对齐交互标注与异常边界

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 更新账号卡标注**

我的页交互标注明确：

- `…` 菜单三项及外部关闭。
- 更新中禁止重复提交。
- 切换失败保留旧账号。
- 退出二次确认。
- EPIC 专属“喜加一”。
- GOG 无账号价值和“喜加一”，不留空白。

- [ ] **Step 2: 更新搜索、游戏库和详情标注**

搜索标注明确多平台分条与来源参数；游戏库标注明确未绑定/已绑定；详情标注明确来源优先级、切换弹窗、时长、云存档、启动参数、获得游戏平台与启动平台的语义差异。

全局 `G` 标注使用：

```js
{
  id:'G',
  title:'平台路由与游戏归类',
  trigger:'从搜索、游戏库进入详情或主动切换平台',
  display:'入口来源优先；无来源按 Steam > EPIC > GOG；低置信度游戏不合并',
  interaction:'横竖屏保留 sourcePlatform、selectedPlatform 与当前游戏'
}
```

- [ ] **Step 3: 对齐异常模拟**

保留 `loading / empty / error / expired / cancelled / cached`；详情异常补充来源不可用、云存档“未获取”、启动失败和切换取消，均复用当前页面，不增加新导航页。

- [ ] **Step 4: 运行标注和恢复测试**

Run:

```powershell
node tools/verify-gog-platform-demo-ui.mjs annotations
node tools/verify-gog-platform-demo.mjs all
```

Expected: UI 标注输出 `PASS annotationsFlow`；静态检查全部通过且无 JavaScript 语法错误。

- [ ] **Step 5: 提交标注与异常规则**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "docs: align GOG interaction annotations"
```

## Task 6: 生成并复核最终视觉证据

**Files:**
- Modify: `tools/capture-gog-platform-demo.mjs`
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Generate: `.tmp/gog-platform-demo-captures/*.png`

- [ ] **Step 1: 扩展截图清单**

保留原 10 页面和完整标注壳，并增加：

```js
const stateCaptures = [
  ['11-profile-gog-menu', 'profile-portrait', async page => {
    await page.click('[data-profile-platform="gog"]');
    await page.click('[data-action="toggle-account-menu"]');
  }],
  ['12-profile-epic-free-games', 'profile-portrait', async page => {
    await page.click('[data-profile-platform="epic"]');
  }],
  ['13-detail-switch-portrait', 'detail-portrait', async page => {
    await page.click('[data-action="open-platform-switch"]');
  }],
  ['14-detail-switch-landscape', 'detail-landscape', async page => {
    await page.click('[data-action="open-platform-switch"]');
  }],
];
```

完整标注壳改名为 `15-full-annotation-shell.png`，最终精确生成 15 张 PNG。

- [ ] **Step 2: 运行 UI 与截图工具**

Run:

```powershell
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
```

Expected: UI 输出 5 个流程 `PASS` 和 `PASS browserRuntime`；截图输出 `PASS visualCaptures (15 PNG files)`。

- [ ] **Step 3: 逐张视觉复核**

用 `view_image` 检查 15 张截图，重点对照：

- GOG `…` 菜单与参考图层级、位置、宽度。
- EPIC 只有一个“喜加一”，GOG 无按钮空位。
- 游戏库入口顺序和 GOG 账号库横竖布局。
- 搜索 EPIC/GOG 分条、平台标识与内容不截断。
- 详情平台数据与切换弹窗横竖不重叠。
- 402×874 和 874×402 均无裁切。

- [ ] **Step 4: 修正视觉差异并重新生成全部证据**

每次 CSS 或 DOM 修正后重新执行：

```powershell
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
```

Expected: 所有交互和 15 张截图仍通过。

- [ ] **Step 5: 提交截图工具与视觉修正**

```powershell
git add -- tools/capture-gog-platform-demo.mjs 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "test: capture final GOG integration states"
```

## Task 7: 同步最终 PRD 与验证器

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md`
- Modify: `tools/verify-gog-platform-prd.mjs`

- [ ] **Step 1: 先更新 PRD 最终范围契约**

`requiredRules` 增加：

```js
const finalScopeRules = [
  '同一个 PC 游戏存在多个平台时，每个平台版本展示为独立结果',
  '更新数据 / 切换账号 / 退出账号',
  '喜加一',
  '游戏时长',
  '云存档',
  '启动 icon',
  '切换启动平台',
  'sourcePlatform=gog',
  'Steam > EPIC > GOG',
  '中英文名称',
  '无法归类',
];
```

新增禁用规则：GOG 不显示账号价值或“喜加一”；不允许将 GOG 绑定按钮描述为跳转 EPIC 授权；不允许写“仅显示平台标识、不支持详情启动”。

- [ ] **Step 2: 运行 PRD 契约并确认当前旧口径不完整**

Run:

```powershell
node tools/verify-gog-platform-prd.mjs rules
node tools/verify-gog-platform-prd.mjs currentPageRules
```

Expected: 至少一项因缺少最终账号菜单或精确完整范围文案失败。

- [ ] **Step 3: 更新 PRD 页面需求与验收**

PRD 必须统一写清：

- 我的页 `…` 菜单三项、外部关闭、更新防重、切换失败保留旧账号、退出确认。
- 仅 EPIC 显示“喜加一”；GOG 无账号价值与“喜加一”。
- EPIC/GOG 未绑定和已绑定游戏库链路。
- 横竖搜索按平台版本分条。
- 详情来源优先、无来源默认优先级、平台切换、时长、云存档和启动。
- 中英文名/别名生成候选，无法可靠归类时不同详情。
- 授权、接口字段、云存档和启动能力属于正式开发前置验证。
- Demo 与 PRD 使用相同字段名和异常口径。

- [ ] **Step 4: 删除旧口径冲突并运行 PRD 自检**

Run:

```powershell
node tools/verify-gog-platform-prd.mjs all
rg -n '仅平台标识|不提供详情启动|GOG.*喜加一|GOG.*账号价值.*显示' 'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md'
```

Expected: PRD 验证器全部 `PASS`；`rg` 只允许命中明确的禁止或范围外说明，不得出现正向承诺 GOG 账号价值或“喜加一”。

- [ ] **Step 5: 提交 PRD 与验证器**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md' tools/verify-gog-platform-prd.mjs
git commit -m "docs: finalize full GOG integration PRD"
```

## Task 8: 更新学习记录、全量验收并回写任务板

**Files:**
- Modify: `C:/Users/z3635/.codex/skills/pm-image2proto/references/learning_log.jsonl`
- Verify: all files from Tasks 1–7

- [ ] **Step 1: 追加 pm-image2proto 学习记录**

在 `learning_log.jsonl` 追加一行合法 JSON，记录：

```json
{"date":"2026-08-13","project":"GameHub GOG platform integration","observation":"Existing product pages must remain the visual baseline while account operations collapse into an overflow menu and full platform routing remains explicit.","rule":"For platform integrations, separate account capabilities, search result versions, sourcePlatform, selectedPlatform, game mapping confidence, obtain-platform labels, and launch actions; never infer one capability from another."}
```

- [ ] **Step 2: 运行全量验收**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
node tools/verify-gog-platform-prd.mjs all
(Get-FileHash -Algorithm SHA256 -LiteralPath 'demos/PC与Mac端/epic平台接入demo.html').Hash
```

Expected:

- Static：全部 `PASS`。
- UI：全部流程 `PASS` 且无 `pageerror`。
- Screenshots：15/15。
- PRD：全部 `PASS`。
- EPIC 原 Demo SHA-256：`514577A7B777D516A683CE3610DD7C0894C5E60F9093AB780BDDE226ADC91B1C`。

- [ ] **Step 3: 检查本任务目标文件差异**

Run:

```powershell
git status --short -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md' `
  'tools/verify-gog-platform-demo.mjs' `
  'tools/verify-gog-platform-demo-ui.mjs' `
  'tools/capture-gog-platform-demo.mjs' `
  'tools/verify-gog-platform-prd.mjs'
git diff --check -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md' `
  'tools/verify-gog-platform-demo.mjs' `
  'tools/verify-gog-platform-demo-ui.mjs' `
  'tools/capture-gog-platform-demo.mjs' `
  'tools/verify-gog-platform-prd.mjs'
```

Expected: 无空白错误；不修改或恢复工作区中的其他用户文件。

- [ ] **Step 4: 提交学习记录允许的本地变更并读取任务板最新版本**

学习记录位于用户技能目录，不与仓库提交混合。随后执行：

```powershell
taskctl.cmd issue get GUANWANGGAID-26 --json
taskctl.cmd comment list GUANWANGGAID-26 --json
```

Expected: Issue 仍为 `in_progress`，读取到最新 `version` 和最终范围评论。

- [ ] **Step 5: 添加完成评论并移到待评审**

评论必须包含：账号菜单、EPIC/GOG 平台差异、搜索分条、游戏库绑定态、平台路由、游戏归类、详情切换、启动事件、四类验证结果、截图数、EPIC 哈希和仍需正式接口验证的风险。然后使用最新版本：

```powershell
taskctl.cmd comment add GUANWANGGAID-26 --body '<完成摘要与验证证据>' --json
taskctl.cmd issue move GUANWANGGAID-26 --status in_review --if-version <最新版本号> --json
```

Expected: Issue 状态为 `in_review`；不得移到 `done`。

- [ ] **Step 6: 交付文件和验证结果**

最终说明必须提供 Demo、PRD、设计说明和实施计划的可点击路径，列出验证结果和正式开发前置风险；用户明确验收后才能将 Issue 移到 `done`。
