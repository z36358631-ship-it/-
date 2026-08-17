# GameHub GOG Account and Platform Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按用户四张来源图修正 GOG 库切换账号入口、详情评分/引擎细节和平台选择弹窗，同时保持现有账号授权、平台数据与启动规则。

**Architecture:** 在现有单文件 HTML 中增加互斥的 `accountSwitchOpen` 与 `platformSwitchOpen` 状态。GOG 库右上角只打开账号选择弹窗，“+”才进入授权；详情三个平台入口只打开纵向平台选择弹窗，选项点击后才更新 `selectedPlatform`。测试先锁定弹窗、状态互斥与几何，再最小修改 DOM/CSS/事件委托。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、内联 SVG/数据 URI、Node.js、Playwright Core、本地 Chrome、Python 视觉比较工具。

---

## File Structure

- `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`：账号选择弹窗、纵向平台选择弹窗、评分同行和引擎标题修正。
- `tools/verify-gog-platform-demo.mjs`：更新静态契约，禁止右上角直接授权和详情直接切换。
- `tools/verify-gog-platform-demo-ui.mjs`：验证账号/平台弹窗、状态互斥、评分几何和平台数据同步。
- `tools/capture-gog-platform-demo.mjs`：第 12 张改为账号选择弹窗；第 13、14 张改为平台选择弹窗。
- `tools/compare-gog-platform-visuals.py`：不修改，只重新生成严格视觉报告。

### Task 1: 锁定账号与平台弹窗契约

**Files:**
- Modify: `tools/verify-gog-platform-demo.mjs`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`
- Modify: `tools/capture-gog-platform-demo.mjs`

- [ ] **Step 1: 更新静态契约**

把 `gogUiCorrections()` 中禁止 `renderPlatformSwitch` 的断言删除，并新增：

```js
for (const token of [
  'accountSwitchOpen',
  'renderAccountSwitchDialog',
  'data-account-switch-dialog',
  'data-action="open-account-switch"',
  'data-action="use-new-gog-credentials"',
  'renderPlatformSwitch',
  'data-platform-switch',
  'data-action="open-platform-switch"',
  'data-action="select-detail-platform"',
  'compatibility-score',
]) assert(html.includes(token), `Missing GOG follow-up correction: ${token}`);
assert(!/detail-engine__heading[\s\S]{0,500}data-detail-platform-logo/.test(html), 'Engine heading platform pill remains');
```

保留 `renderDetailPlatformTabs`，但静态检查其按钮动作必须是 `open-platform-switch`，不能是 `select-detail-platform`。

- [ ] **Step 2: 更新 GOG 库切换账号浏览器流程**

在 `realLibraryFlow()` 的横竖循环中把直接授权断言替换为：

```js
const beforeSwitch = await platformSnapshot('gog');
await accountTopbar.locator('[data-action="open-account-switch"]').click();
const accountDialog = root.locator('[data-account-switch-dialog]');
assert.equal(await accountDialog.count(), 1, `${screen}: account switch dialog missing`);
for (const value of ['切换账号','GalaxyRider','GOG ID','当前使用']) {
  assert((await accountDialog.innerText()).includes(value), `${screen}: account dialog missing ${value}`);
}
assert.equal(await accountDialog.locator('[data-action="use-new-gog-credentials"]').count(), 1);
assert.equal(await accountDialog.locator('[data-action="remove-gog-account"]').isDisabled(), true);
await accountDialog.locator('[data-action="select-current-gog-account"]').click();
assert.deepEqual(await platformSnapshot('gog'), beforeSwitch);
assert.equal(await root.locator('[data-account-switch-dialog]').count(), 0);

await accountTopbar.locator('[data-action="open-account-switch"]').click();
await root.locator('[data-action="use-new-gog-credentials"]').click();
assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1);
```

授权取消必须返回原方向 GOG 库；授权成功继续替换为 `SWITCHED_GOG_ACCOUNT`。

- [ ] **Step 3: 更新详情平台弹窗浏览器流程**

横竖详情进入 GOG 状态后使用：

```js
const beforeOpen = await page.evaluate(() => window.GogDemoApp.state.selectedPlatform);
await root.locator('[data-detail-platform-tab][data-platform="epic"]').click();
assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), beforeOpen, `${orientation}: tab click switched too early`);
const switchDialog = root.locator('[data-platform-switch]');
assert.equal(await switchDialog.count(), 1);
assert.equal((await switchDialog.getByRole('heading').innerText()).trim(), '切换平台');
assert.deepEqual(
  await switchDialog.locator('[data-action="select-detail-platform"]').evaluateAll(nodes => nodes.map(node => node.dataset.platform)),
  ['steam','epic','gog'],
);
assert.equal(await switchDialog.locator('[data-platform-option="gog"] [data-current-platform-check]').count(), 1);
await switchDialog.locator('[data-action="close-platform-switch"]').click();
assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), beforeOpen);

await root.locator('[data-detail-platform-tab]').first().click();
await root.locator('[data-platform-option="epic"]').click();
assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), 'epic');
assert.equal(await root.locator('[data-platform-switch]').count(), 0);
```

继续验证 EPIC 的 `96 小时`、`云存档正常`、启动请求和 GOG 来源不变。

- [ ] **Step 4: 增加评分和引擎标题几何断言**

竖屏详情检查：

```js
const score = root.locator('.compatibility-score');
const [numberBox, starBox] = await Promise.all([
  score.locator('[data-compatibility-value]').boundingBox(),
  score.locator('.ui-icon').boundingBox(),
]);
assert(Math.abs(numberBox.y - starBox.y) <= 2, 'compatibility star is not beside 3.8');
assert(starBox.x > numberBox.x + numberBox.width, 'compatibility star must be on the right');
assert.equal(await root.locator('.detail-engine__heading [data-detail-platform-logo]').count(), 0, 'engine heading platform pill remains');
```

- [ ] **Step 5: 更新截图状态**

第 12 张替换为：

```js
['12-gog-account-switch-dialog', 'gog-library-portrait', async () => {
  await page.click('[data-action="open-account-switch"]');
}],
```

第 13、14 张只点击 `[data-detail-platform-tab]` 打开弹窗，不在准备阶段选择 EPIC；截图名单同步更新。

- [ ] **Step 6: 运行旧实现确认失败**

```powershell
node tools/verify-gog-platform-demo.mjs gogUiCorrections
node tools/verify-gog-platform-demo-ui.mjs library
node tools/verify-gog-platform-demo-ui.mjs detailSearch
node tools/capture-gog-platform-demo.mjs
```

Expected：分别因缺少账号选择弹窗、平台点击过早切换、评分星星换行或截图动作失败；测试脚本本身无语法错误。

- [ ] **Step 7: 提交测试契约**

```powershell
git add -- tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs tools/capture-gog-platform-demo.mjs
git commit -m "test: lock GOG account and platform dialogs"
```

### Task 2: 实现切换账号弹窗

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`

- [ ] **Step 1: 增加互斥账号弹窗状态**

状态新增：

```js
accountSwitchOpen:false,
platformSwitchOpen:false,
```

`selectPage()` 同时清理 `accountSwitchOpen`、`platformSwitchOpen` 和 `showLogoutConfirm`。打开任一弹窗时关闭另外两种弹窗。

- [ ] **Step 2: 修正右上角切换账号入口**

`renderPlatformAccountTopBar()` 使用：

```html
<button class="icon-button" type="button" data-action="open-account-switch" aria-label="切换账号">
  ${uiIcon('account-switch')}
</button>
```

在 `uiIcon()` 的图形表中增加：

```js
'account-switch':'<circle cx="10" cy="9" r="3"/><path d="M4 20c.8-4 2.8-6 6-6 1.8 0 3.2.6 4.2 1.8M18 5v6m-3-3h6"/>',
close:'<path d="M6 6l12 12M18 6 6 18"/>',
check:'<path d="m5 12 4 4 10-10"/>',
```

`account-switch` 只表达“用户 + 新账号”，不使用“登录”文字或登录箭头。

- [ ] **Step 3: 创建账号选择弹窗**

```js
function renderAccountSwitchDialog() {
  const account=currentGogAccount();
  if (!account) return '';
  return `<section class="account-switch-dialog" data-account-switch-dialog role="dialog" aria-modal="true" aria-labelledby="account-switch-title">
    <span class="dialog-mask" aria-hidden="true"></span>
    <div class="account-switch-dialog__panel">
      <header><button type="button" data-action="remove-gog-account" disabled>移除账号</button><h2 id="account-switch-title">切换账号</h2><button type="button" data-action="close-account-switch" aria-label="关闭">${uiIcon('close')}</button></header>
      <p>选择一名用户或使用新凭证登录</p>
      <div class="account-switch-dialog__accounts">
        <button type="button" data-action="select-current-gog-account"><span class="account-switch-avatar">${renderPlatformMark('gog')}</span><strong>${account.username}</strong><small>GOG ID: ${account.gogId}</small><em>当前使用</em></button>
        <button type="button" class="account-switch-add" data-action="use-new-gog-credentials" aria-label="使用新凭证登录">${uiIcon('plus')}</button>
      </div>
    </div>
  </section>`;
}
```

把弹窗追加到 GOG 库 `.app-viewport` 根节点；横竖屏共享组件，但分别居中在各自画布中。

- [ ] **Step 4: 更新事件委托**

```js
if(name==='open-account-switch'){state.accountSwitchOpen=true;state.platformSwitchOpen=false;state.showLogoutConfirm=false;render();return}
if(name==='close-account-switch'||name==='select-current-gog-account'){state.accountSwitchOpen=false;render();return}
if(name==='use-new-gog-credentials'){state.accountSwitchOpen=false;beginAuthorization('switch');return}
```

删除 `switch-gog` 直接调用 `beginAuthorization('switch')` 的旧分支；授权成功/失败/取消继续使用现有逻辑。

- [ ] **Step 5: 按来源图实现弹窗 CSS**

弹窗使用完整遮罩、顶部禁用`移除账号`、居中标题、右上关闭、当前账号卡、绿色`当前使用`和方形“+”入口。不得新增移除确认、Toast 或第二个账号数据。

- [ ] **Step 6: 运行账号局部回归**

```powershell
node tools/verify-gog-platform-demo.mjs gogUiCorrections
node tools/verify-gog-platform-demo-ui.mjs library
```

Expected：PASS；右上角不直接进入登录，“+”才进入授权，关闭/当前账号不修改状态。

### Task 3: 实现详情平台选择弹窗和引擎细节

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`

- [ ] **Step 1: 把三个入口改为弹窗触发器**

`renderDetailPlatformTabs()` 中每个按钮改为：

```html
<button type="button" data-detail-platform-tab data-action="open-platform-switch" data-platform="${platform}" class="${platform===state.selectedPlatform?'active':''}">
  ${renderPlatformMark(platform)}<span>${DETAIL_BY_PLATFORM[platform].label}</span>
</button>
```

点击时不得修改 `selectedPlatform`。

- [ ] **Step 2: 创建纵向平台选择弹窗**

```js
function renderPlatformSwitch() {
  const seen=new Set();
  const platforms=GAME_PLATFORM_VERSIONS.filter(item=>item.gameId===getSelectedGameId()&&!seen.has(item.platform)&&seen.add(item.platform)).map(item=>item.platform);
  return `<section class="platform-switch" data-platform-switch role="dialog" aria-modal="true" aria-labelledby="platform-switch-title">
    <span class="dialog-mask" aria-hidden="true"></span>
    <div class="platform-switch__panel">
      <header><h2 id="platform-switch-title">切换平台</h2><button type="button" data-action="close-platform-switch" aria-label="关闭">${uiIcon('close')}</button></header>
      <div class="platform-switch__options">${platforms.map(platform=>`<button type="button" data-platform-option="${platform}" data-action="select-detail-platform" data-platform="${platform}">${renderPlatformMark(platform)}<span>${DETAIL_BY_PLATFORM[platform].label}</span>${platform===state.selectedPlatform?`<span data-current-platform-check aria-label="当前平台">${uiIcon('check')}</span>`:''}</button>`).join('')}</div>
    </div>
  </section>`;
}
```

选项纵向排列，当前平台显示勾；`selectDetailPlatform()` 更新平台后关闭弹窗。关闭按钮只关闭，不修改平台。

- [ ] **Step 3: 修正 PC 游戏引擎**

标题改为：

```html
<div class="detail-engine__heading"><strong>${uiIcon('monitor')}PC游戏引擎</strong></div>
```

评分改为：

```html
<dd class="compatibility-score"><span data-compatibility-value>3.8</span>${uiIcon('star')}</dd>
```

CSS 使用 `display:inline-flex;align-items:center;gap:5px`，星星位于数值右侧。

- [ ] **Step 4: 处理弹窗互斥与页面渲染**

横竖详情根节点在 `state.platformSwitchOpen` 时追加 `renderPlatformSwitch()`。`open-platform-switch` 关闭账号选择和退出确认；切页、进入授权、关闭与选择后清理平台弹窗。

- [ ] **Step 5: 运行详情局部回归**

```powershell
node tools/verify-gog-platform-demo.mjs syntax
node tools/verify-gog-platform-demo-ui.mjs detailSearch
```

Expected：PASS；三个入口只开弹窗，关闭不切换，选 EPIC 后时长/云存档/启动按钮同步；评分星星同行；引擎标题无平台胶囊。

- [ ] **Step 6: 提交实现**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "fix: align GOG account and platform dialogs"
```

### Task 4: 完整回归与视觉证据

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

Expected：全部业务和浏览器契约 PASS；15 张预览截图与 10 张源分辨率截图生成；严格视觉报告保留真实 PASS/FAIL/missing-source。

- [ ] **Step 2: 人工审查关键截图**

```text
.tmp/gog-platform-demo-captures/12-gog-account-switch-dialog.png
.tmp/gog-platform-demo-captures/13-detail-switch-portrait.png
.tmp/gog-platform-demo-captures/14-detail-switch-landscape.png
```

检查账号弹窗与图 2 的层级、平台弹窗与图 4 的纵向列表/勾选、评分星星同行和引擎标题无平台胶囊。

- [ ] **Step 3: 检查提交范围并提交剩余测试修改**

```powershell
git diff --check -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs `
  tools/capture-gog-platform-demo.mjs
git add -- tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs tools/capture-gog-platform-demo.mjs
git commit -m "test: verify GOG account and platform dialogs"
```

只提交本任务四个文件；工作区其他用户改动全部保留且不纳入提交。
