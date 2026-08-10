# 盖世游戏 APP 租号第三轮评审修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 APP 租号第三轮评审问题，使详情直达确认订单、确认订单按稳定售卖模式展示 SKU，并同步搜索游戏 Tab、Steam 登录、售后、会员中心、首页 Banner、PRD 和 36 张验收截图。

**Architecture:** `盖世游戏APP租号功能demo.template.html` 继续作为唯一业务与页面源；新增稳定 `saleMode` 和真实 `searchTab` 状态，详情、首页、搜索和确认订单共享游戏与 SKU 数据。普通版、标注版和截图继续由现有 Node 工具生成，自动验证先定义失败契约再实施页面改动。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js、Playwright Core、PNG 截图、Markdown PRD、taskctl。

---

## 文件结构与责任

| 文件 | 责任 | 本次操作 |
|---|---|---|
| `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` | 唯一业务状态、售卖模式、页面结构、交互与视觉源 | 修改详情、确认订单、搜索、首页、Steam、售后、会员页 |
| `demos/APP租号功能/盖世游戏APP租号功能demo.html` | 可直接运行的普通 Demo | 只由构建脚本生成，不手工编辑 |
| `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` | 评审用左导航、中 Demo、右说明版本 | 由构建脚本同步业务代码并更新标注 |
| `tools/verify-app-rental-demo.mjs` | 业务、视觉、横竖屏、安全与标注契约 | 先增加第三轮失败契约，再验证全部修正 |
| `tools/build-app-rental-demo.mjs` | 内联素材、生成普通版并同步标注版 | 增加第三轮规则签名和说明同步 |
| `tools/capture-app-rental-prd-screenshots.mjs` | 18 个页面/状态的横竖屏截图 | 固定新版状态并重建 36 张图 |
| `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` | 开发、测试和评审口径 | 更新流程、两类 SKU、搜索、会员、售后和 Banner 规则 |
| `public/prd/app-rental/*.png` | PRD 本地视觉证据 | 全量替换 36 张截图 |
| `test-results/app-rental-verification/contract-results.json` | 自动契约结果 | 验证脚本生成 |
| `test-results/app-rental-capture/capture-results.json` | 截图发布结果 | 截图脚本生成 |

不得修改 Mac 租号 Demo、Mac PRD、CDKEY PRD 或无关文件。不得推送或发布。

### Task 1: 建立第三轮评审失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 注册第三轮验收组**

在现有分组末尾新增 `THIRD_REVIEW 24/24`，用明确计数器收集本轮断言：

```js
const thirdReviewChecks = [];
function thirdReviewAssert(condition, message) {
  assert(condition, message);
  thirdReviewChecks.push(message);
}
```

- [ ] **Step 2: 增加详情与确认订单契约**

打开 `detail` 后断言详情不存在 SKU 节点，点击主按钮一次后页面为 `checkout`：

```js
await demo.openCaptureState('detail');
thirdReviewAssert(await page.locator('[data-entitlement-panel], .detail-entitlement-panel').count() === 0, '详情不渲染 SKU 面板');
await page.locator('[data-primary-action]').click();
thirdReviewAssert((await demo.snapshot()).screen === 'checkout', '租号开玩一次进入确认订单');
```

通过公开接口分别设置 `time-rental` 与 `entitlement`，断言：

```js
await demo.setSaleMode('shadow-blade-zero', 'time-rental');
await demo.openCaptureState('checkout');
thirdReviewAssert(await page.locator('[data-sku-kind="time-rental"]').count() > 1, '热门确认订单显示时租');
thirdReviewAssert(await page.locator('[data-sku-kind="trial"], [data-sku-kind="permanent"], [data-sku-kind="membership"]').count() === 0, '热门不混入权益 SKU');

await demo.setSaleMode('spiritfarer', 'entitlement');
await demo.selectGame('spiritfarer');
await demo.openCaptureState('checkout');
thirdReviewAssert(await page.locator('[data-sku-kind="time-rental"]').count() === 0, '非热门不显示时租');
thirdReviewAssert(await page.locator('[data-sku-kind="trial"]').count() === 1, '非热门有资格时显示首次体验');
thirdReviewAssert(await page.locator('[data-sku-kind="permanent"]').count() === 1, '非热门显示永久畅玩');
thirdReviewAssert(await page.locator('[data-sku-kind="membership"]').count() === 1, '非热门显示会员入口');
```

- [ ] **Step 3: 增加底栏、Steam 与售后契约**

```js
const detailFooter = await page.locator('.detail-fixed-footer').evaluate((node) => ({
  position: getComputedStyle(node).position,
  bottom: getComputedStyle(node).bottom,
  top: node.getBoundingClientRect().top,
  viewport: innerHeight,
}));
thirdReviewAssert(['fixed', 'sticky'].includes(detailFooter.position), '详情操作栏固定');
thirdReviewAssert(detailFooter.viewport - detailFooter.top < 100, '详情操作栏位于视口底部');

await demo.openCaptureState('steam-login');
const portraitOrder = await page.locator('.steam-login-body').evaluate((root) => [...root.children].map((node) => node.className));
thirdReviewAssert(portraitOrder[0].includes('steam-qr-panel'), '竖屏二维码在账号表单上方');

await demo.openCaptureState('after-sales');
const afterSalesText = await page.locator('.after-sales-types').innerText();
thirdReviewAssert(!afterSalesText.includes('3天无理由'), '售后原因移除3天无理由');
thirdReviewAssert(await page.locator('.after-sales-types button').count() === 4, '售后原因固定四项');
```

- [ ] **Step 4: 增加搜索、会员与 Banner 契约**

```js
await demo.openCaptureState('search');
thirdReviewAssert(await page.locator('[role="tab"]').count() === 3, '搜索有三个真实 Tab');
await page.locator('[data-search-tab="games"]').click();
thirdReviewAssert((await demo.snapshot()).searchTab === 'games', '游戏 Tab 状态生效');
thirdReviewAssert(await page.locator('.search-result-card [data-primary-action], .search-result-card button button').count() === 0, '游戏结果无卡内按钮');

await demo.openCaptureState('membership');
thirdReviewAssert(await page.locator('.membership-benefit-item').count() === 4, '会员页展示四项权益');
thirdReviewAssert(await page.locator('.membership-preview .member-game-card').count() === 8, '会员页展示八款游戏');
thirdReviewAssert((await page.locator('.membership-plan-card.recommended').innerText()).includes('永久'), '永久套餐为推荐');

await demo.openCaptureState('home');
thirdReviewAssert(/^¥\d+\.\d · 可租号$/.test((await page.locator('.home-rental-price').innerText()).trim()), '首页 Banner 展示一位小数可租号价');
```

- [ ] **Step 5: 运行验证确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 既有分组保持通过；`THIRD_REVIEW` 在详情仍展开 SKU、搜索 Tab 静态、Steam 顺序、售后五项、会员权益不足和 Banner 已租号处失败，不出现脚本语法错误。

- [ ] **Step 6: 提交失败契约**

```powershell
git add -- tools/verify-app-rental-demo.mjs
git commit -m "test(app-rental): define third review contract"
```

### Task 2: 实现稳定售卖模式与确认订单内选 SKU

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 给游戏数据增加稳定售卖模式与可售 SKU**

在 `DISCOVERY_GAME_CONTEXTS` 中定义明确数据，不由实时热门度推导：

```js
const GAME_SALE_MODES = Object.freeze({ TIME_RENTAL: 'time-rental', ENTITLEMENT: 'entitlement' });

{
  id: 'shadow-blade-zero',
  saleMode: GAME_SALE_MODES.TIME_RENTAL,
  defaultSku: 'rent-2h',
  rentalSkus: [
    { id: 'rent-2h', durationLabel: '2小时', price: 9.9, enabled: true, inStock: true, region: 'CN' },
    { id: 'hourly-8h', durationLabel: '8小时', price: 36, enabled: true, inStock: true, region: 'CN' },
    { id: 'daily', durationLabel: '日租（24小时）', price: 59, enabled: true, inStock: true, region: 'CN' },
  ],
},
{
  id: 'spiritfarer',
  saleMode: GAME_SALE_MODES.ENTITLEMENT,
  defaultSku: 'trial',
  entitlementSkus: [
    { id: 'trial', label: '首次体验', durationLabel: '首次体验', price: 1.99, firstOnly: true, enabled: true, inStock: true, region: 'CN' },
    { id: 'permanent', label: '单游戏永久畅玩', durationLabel: '永久畅玩', price: 68, enabled: true, inStock: true, region: 'CN' },
  ],
},
```

- [ ] **Step 2: 实现售卖模式与可售项选择函数**

```js
function getGameSaleMode(gameId) {
  return getGameContext(gameId)?.saleMode || GAME_SALE_MODES.TIME_RENTAL;
}

function eligibleCheckoutSkus(game, context = {}) {
  if (game.saleMode === GAME_SALE_MODES.ENTITLEMENT) {
    return (game.entitlementSkus || []).filter((sku) => sku.enabled && sku.inStock)
      .filter((sku) => !sku.firstOnly || context.firstRentalEligible);
  }
  return (game.rentalSkus || []).filter((sku) => sku.enabled && sku.inStock);
}

function defaultCheckoutSku(game, context = {}) {
  const skus = eligibleCheckoutSkus(game, context);
  return skus.find(({ id }) => id === game.defaultSku) || skus[0] || null;
}
```

- [ ] **Step 3: 移除详情 SKU 面板并直达确认订单**

将可购买态的 `detailPrimaryMeta()` 收敛为：

```js
return { label: '租号开玩', action: 'begin-checkout', summary: '进入确认订单选择畅玩方式' };
```

删除 `renderPortraitDetail()` 和横屏详情中的 `renderDetailEntitlementPanel()` 调用；底栏只保留“秒玩”和主操作，不再显示“更多租期”。

- [ ] **Step 4: 进入确认订单时初始化默认 SKU 和草稿**

```js
function prepareCheckoutForSelectedGame() {
  const game = getSelectedGame();
  const context = getCheckoutEligibilityContext(game.id);
  const selected = defaultCheckoutSku(game, context);
  state.selectedSku = selected?.id || null;
  state.order = null;
  if (selected) ensureGameOrder();
  return selected;
}

if (action === 'begin-checkout') {
  prepareCheckoutForSelectedGame();
  navigate('checkout');
  return;
}
```

- [ ] **Step 5: 在确认订单渲染两类 SKU 组**

```js
function renderCheckoutSkuOptions(game) {
  const mode = getGameSaleMode(game.id);
  const skus = eligibleCheckoutSkus(game, getCheckoutEligibilityContext(game.id));
  const purchasable = skus.map((sku) => `<button type="button" class="checkout-sku-card ${state.selectedSku === sku.id ? 'selected' : ''}" data-action="select-checkout-sku" data-sku="${sku.id}" data-sku-kind="${mode === GAME_SALE_MODES.TIME_RENTAL ? 'time-rental' : sku.id}"><span><strong>${sku.label || sku.durationLabel}</strong><small>${sku.durationLabel}</small></span><b>¥${Number(sku.price).toFixed(2)}</b></button>`).join('');
  const membership = mode === GAME_SALE_MODES.ENTITLEMENT
    ? '<button type="button" class="checkout-sku-card" data-action="navigate" data-screen="membership" data-sku-kind="membership"><span><strong>开通会员</strong><small>畅玩会员游戏库</small></span><b>进入 ›</b></button>'
    : '';
  return `<section class="checkout-sku-section"><div class="detail-section-head"><h2>${mode === GAME_SALE_MODES.TIME_RENTAL ? '选择租期' : '选择畅玩方式'}</h2></div>${purchasable}${membership}</section>`;
}
```

- [ ] **Step 6: 切 SKU 后立即重建订单草稿**

```js
if (action === 'select-checkout-sku') {
  state.selectedSku = target.dataset.sku;
  if (state.order?.status === 'pending') state.order = null;
  ensureGameOrder();
  renderApp();
  return;
}
```

`ensureGameOrder()` 必须从当前游戏与当前 SKU 读取 `saleMode`、`durationLabel`、`rawAmount` 和 `amount`，不得继续读取已删除的详情面板状态。

- [ ] **Step 7: 固定底栏与正文安全间距**

```css
.portrait-detail { padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
.portrait-fixed-footer.detail-fixed-footer { position: fixed; right: 0; bottom: 0; left: 0; z-index: 30; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
.landscape .detail-fixed-footer { left: var(--landscape-nav-width); }
```

- [ ] **Step 8: 构建并验证交易链路**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 详情直达、两种 SKU 排他、切换后订单草稿同步和底栏定位断言通过；其他本轮断言允许待后续任务通过。

- [ ] **Step 9: 提交交易链路**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): move sku selection into checkout"
```

### Task 3: 补齐搜索游戏 Tab 与首页 Banner 价格

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 新增搜索 Tab 状态与事件**

```js
state.searchTab = 'all';

const SEARCH_TABS = Object.freeze([
  { id: 'all', label: '全部' },
  { id: 'games', label: '游戏' },
  { id: 'community', label: '社区' },
]);

if (action === 'set-search-tab') {
  state.searchTab = target.dataset.searchTab;
  renderApp();
  return;
}
```

- [ ] **Step 2: 将搜索 Tab 渲染为真实可访问控件**

```js
function renderSearchTabs(count) {
  return `<div class="search-filter-row" role="tablist" aria-label="搜索结果类型">${SEARCH_TABS.map(({ id, label }) => `<button type="button" role="tab" aria-selected="${state.searchTab === id}" class="${state.searchTab === id ? 'active' : ''}" data-action="set-search-tab" data-search-tab="${id}">${label}</button>`).join('')}<span>找到 ${count} 个结果</span></div>`;
}
```

- [ ] **Step 3: 分别渲染全部、游戏和社区结果**

游戏卡继续使用唯一根按钮，卡内不嵌套操作按钮：

```js
function renderSearchGameResults(results) {
  return `<div class="search-result-list">${results.map(([name, id, asset, crop]) => `<button class="search-result-card" type="button" data-action="navigate" data-screen="detail" data-game-id="${id}">${realCrop(asset, crop, `${name}游戏画面`, '', 'search-result-media')}<span><strong>${name}</strong><small>Steam版本 · 手柄适配</small>${renderDiscoveryDisplay(id)}</span><b>›</b></button>`).join('')}</div>`;
}
```

`all` 渲染游戏分组和社区分组，`games` 只渲染游戏卡，`community` 只渲染社区结果；结果数量取实际数组长度。

- [ ] **Step 4: 调整首页 Banner 的演示上下文与文案**

首页 Banner 绑定 `shadow-blade-zero`，演示上下文不再包含有效租赁：

```js
state.discoveryContexts['shadow-blade-zero'] = {
  ...state.discoveryContexts['shadow-blade-zero'],
  activeOrderStatus: null,
  expireAt: null,
  firstRentalEligible: false,
};
```

新增 Banner 专用渲染器，但继续消费同一原始租号 SKU：

```js
function renderHomeRentalPrice(gameId) {
  const model = resolveGameDisplayModel(gameId, getDiscoveryUserContext(gameId));
  if (model.displayType !== DISCOVERY_DISPLAY_TYPES.RENTAL_PRICE) return renderDiscoveryDisplay(gameId);
  return `<span class="discovery-display home-rental-price" data-discovery-display="rental-price">¥${model.formattedAmount} · 可租号</span>`;
}
```

- [ ] **Step 5: 暴露搜索与售卖模式测试接口**

```js
setSearchTab(value) { state.searchTab = SEARCH_TABS.some(({ id }) => id === value) ? value : 'all'; renderApp(); return state.searchTab; },
setSaleMode(gameId, value) { const game = getGameContext(gameId); if (game && Object.values(GAME_SALE_MODES).includes(value)) game.saleMode = value; renderApp(); return game?.saleMode; },
selectGame(gameId) { return setSelectedGame(gameId); },
```

- [ ] **Step 6: 构建并验证发现页**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 三个搜索 Tab、关键词保持、游戏结果无按钮、实际结果数和 Banner `¥9.9 · 可租号` 通过；详情与确认订单价格同源。

- [ ] **Step 7: 提交发现页修正**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): add game search tab and banner price"
```

### Task 4: 修正 Steam 登录与售后原因

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 将 Steam 登录拆成可复用片段**

```js
function renderSteamForm() {
  return `<form class="steam-login-form" onsubmit="return false"><h1>登录</h1><p>使用当前租赁订单分配的 Steam 账号继续</p><div class="steam-field"><label for="steam-account">用账户名称登录</label><input id="steam-account" data-steam-field="account" autocomplete="username" value="${escapeAttribute(state.steamForm.account)}" aria-label="Steam 账号"></div><div class="steam-field"><label for="steam-password">密码</label><input id="steam-password" data-steam-field="password" type="password" autocomplete="current-password" value="${escapeAttribute(state.steamForm.password)}" aria-label="Steam 密码"></div><label class="steam-remember" for="steam-remember"><input id="steam-remember" data-steam-field="remember" type="checkbox" ${state.steamForm.remember ? 'checked' : ''}>记住我</label><button class="steam-login-submit" type="button" data-action="submit-steam-login">登录</button>${renderSteamGuard()}</form>`;
}

function renderSteamQrPanel() {
  return `<aside class="steam-qr-panel"><div><h2>使用 Steam 移动应用登录</h2><div class="steam-qr" aria-label="Steam 登录二维码"></div><p>打开 Steam 移动应用扫描二维码</p></div>${state.steamHelpOpen ? `<section class="steam-credential-overlay" role="dialog" aria-label="Steam 租号登录信息">${renderCredentialFields('close-steam-help')}</section>` : ''}</aside>`;
}
```

保留现有账号、密码、记住我、登录按钮、Guard 和租号登录信息遮罩的真实 HTML，不改变字段 id 和 `data-steam-field`。

- [ ] **Step 2: 按方向输出正确 DOM 顺序**

```js
function renderSteamLogin(orientation) {
  const form = renderSteamForm();
  const qr = renderSteamQrPanel();
  const body = orientation === 'portrait'
    ? `${qr}<div class="steam-login-divider">或使用账号密码登录</div>${form}`
    : `${form}${qr}`;
  return `<section class="steam-login-page" data-layout="${orientation}-steam-login" data-orientation="${orientation}"><header class="steam-login-topbar"><div class="steam-wordmark">STEAM <span>登录</span></div><button class="steam-help-trigger" type="button" data-action="open-steam-help">租号登录信息</button><button class="steam-close" type="button" data-action="close-steam-login" aria-label="关闭 Steam 登录">×</button></header><div class="steam-login-body">${body}</div></section>`;
}
```

- [ ] **Step 3: 调整竖屏 Steam 样式**

```css
.portrait .steam-login-body { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.portrait .steam-qr-panel { order: 0; }
.portrait .steam-login-divider { display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: 12px; }
.landscape .steam-login-divider { display: none; }
```

- [ ] **Step 4: 删除售后无理由类型并修正默认值**

```js
state.afterSalesDraft = { orderId: null, type: 'launch', description: '' };
const AFTER_SALES_TYPES = Object.freeze([
  ['launch', '启动失败'],
  ['steam-login', 'Steam登录失败'],
  ['account', '账号异常/频繁掉线'],
  ['other', '其他问题'],
]);
```

删除售后面板中仅针对 `refund` 类型的禁用态和资格提示；保留 `getNoReasonEligibility()` 供订单权益或退款政策测试使用，保留取号失败自动退款状态机。

- [ ] **Step 5: 将售后类型布局改为四项**

```css
.after-sales-types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.landscape .after-sales-types { grid-template-columns: repeat(4, minmax(0, 1fr)); }
```

- [ ] **Step 6: 构建并验证 Steam 与售后**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 竖屏二维码 DOM 在前、横屏表单在左、旋转状态保留；售后四项且无“3天无理由”；确认订单权益说明仍存在“3天无理由”。

- [ ] **Step 7: 提交登录与售后修正**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "fix(app-rental): align steam login and after-sales"
```

### Task 5: 重设计会员中心并主推永久套餐

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 定义四项已确认权益**

```js
const MEMBERSHIP_BENEFITS = Object.freeze([
  ['会员库内畅玩', '会员有效期内可直接启动会员游戏'],
  ['游戏持续更新', '新增与下架信息在会员中心说明'],
  ['PC引擎与手柄适配', '延续现有 PC 游戏体验能力'],
  ['个人云存档同步', '在支持的游戏中延续个人进度'],
]);
```

- [ ] **Step 2: 新增会员价值 Hero 与权益区**

Hero 复用 `MEMBER_GAMES` 的现有封面，不生成外部图片：

```js
function renderMembershipValue() {
  return `<section class="membership-value-hero"><div><span>GAMEHUB MEMBER</span><h2>一个会员，畅玩本期精选游戏</h2><p>会员游戏库持续更新，开通后可直接进入支持的游戏。</p></div><div class="membership-hero-covers">${MEMBER_GAMES.slice(0, 3).map((game) => realCrop(game.asset, game.crop, `${game.name}会员游戏`, '', 'membership-hero-cover')).join('')}</div></section><div class="membership-benefit-grid">${MEMBERSHIP_BENEFITS.map(([title, note]) => `<div class="membership-benefit-item"><span>✓</span><strong>${title}</strong><small>${note}</small></div>`).join('')}</div>`;
}
```

- [ ] **Step 3: 在会员首屏增加八款游戏预览**

```js
function renderMembershipPreview() {
  return `<section class="membership-preview"><div class="detail-section-head"><div><h2>本期会员游戏</h2><p>${MEMBER_GAMES.length}款精选游戏，开通后可进入支持的游戏</p></div><button type="button" data-action="navigate" data-screen="member-library">查看全部 ›</button></div>${renderMemberGameGrid()}</section>`;
}
```

- [ ] **Step 4: 保持三档价格并标记永久推荐**

```js
function renderMembershipPlans() {
  return `<div class="membership-plan-list">${MEMBER_PLANS.map((plan) => `<button class="membership-plan-card ${state.memberPlan === plan.id ? 'selected' : ''} ${plan.id === 'permanent' ? 'recommended' : ''}" type="button" data-action="select-member-plan" data-plan="${plan.id}">${plan.id === 'permanent' ? '<span class="plan-recommend">推荐 · 长期有效</span>' : ''}<span><strong class="plan-name">${plan.name}</strong><small class="plan-note">${plan.note}</small></span><span class="plan-money"><strong class="plan-price">¥${plan.price}</strong><small class="plan-original">原价 ¥${plan.original}</small></span></button>`).join('')}</div>`;
}
```

- [ ] **Step 5: 调整会员页面顺序与支付文案**

竖屏顺序固定为用户身份、价值 Hero、四项权益、八款预览、套餐、支付；横屏左侧价值与游戏、右侧套餐与支付。固定主按钮使用：

```js
const memberPrimaryLabel = completed ? '开通成功' : created ? '模拟完成支付' : `开通${plan.name}会员 · ¥${plan.price}`;
```

- [ ] **Step 6: 增加会员视觉令牌**

```css
.membership-value-hero { border: 1px solid rgb(255 205 93 / 26%); background: radial-gradient(circle at 82% 20%, rgb(255 191 72 / 24%), transparent 38%), linear-gradient(145deg, #33250f, #171719 64%); }
.membership-plan-card.recommended { border-color: #f0ba54; box-shadow: 0 0 0 1px rgb(240 186 84 / 20%); }
.membership-plan-card.recommended .plan-recommend { color: #1b1407; background: linear-gradient(90deg, #f6d17a, #d99c38); }
```

- [ ] **Step 7: 构建并验证会员页**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 四项权益、八款游戏、三档原价格、永久推荐和带套餐金额主按钮通过；不出现虚构倒计时、新套餐或新页面。

- [ ] **Step 8: 提交会员页重设计**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): strengthen membership value page"
```

### Task 6: 同步标注版、构建契约与 PRD

**Files:**
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 强化构建签名**

普通版与标注版业务代码必须包含：

```js
const requiredSignatures = [
  'GAME_SALE_MODES',
  'eligibleCheckoutSkus',
  'renderCheckoutSkuOptions',
  'SEARCH_TABS',
  'renderSearchTabs',
  'MEMBERSHIP_BENEFITS',
  'renderMembershipPreview',
];
```

并断言两份产物都不存在 `['refund', '3天无理由']` 和详情 `toggle-entitlement-panel` 主路径。

- [ ] **Step 2: 更新标注版页面说明**

在对应 `ANNOTATION_GROUPS` 写入以下精确规则：

```js
{
  page: 'checkout',
  rules: ['详情主按钮一次进入确认订单', '热门游戏仅时租', '非热门游戏仅首次体验、永久畅玩与会员入口', '切换SKU后重建待支付草稿'],
},
{
  page: 'search',
  rules: ['全部、游戏、社区为真实Tab', '游戏结果无按钮，整卡进入详情', '每卡最多一条租号或权益结果'],
},
```

Steam、售后、会员和首页说明分别写入二维码顺序、四项原因、四项权益/八款游戏/永久推荐、具体游戏一位小数可租号价。

- [ ] **Step 3: 将 PRD 升级到 V1.5**

修改版本记录、范围、流程、页面表、业务规则、异常边界和验收标准，明确：

```text
详情：租号开玩一次进入确认订单，详情不选 SKU。
确认订单：saleMode=time-rental 仅时租；saleMode=entitlement 仅首次体验、单游戏永久、会员入口。
搜索：全部/游戏/社区真实切换，游戏卡无按钮。
Steam：竖屏二维码在上，横屏双栏。
售后：四项问题类型；3天无理由仅作订单权益说明。
会员：月129、年499、永久399，永久为推荐；首屏四项权益与8款游戏。
Banner：绑定具体游戏的 ¥X.X · 可租号，价格与确认订单同源。
```

- [ ] **Step 4: 清理冲突旧文案**

Run:

```powershell
rg -n -e '点击.*展开租期' -e '详情.*选择租期' -e "\['refund', '3天无理由'\]" -e '找到 12 个结果' "demos/APP租号功能" "prd/【盖世游戏APP】游戏租号需求" tools
```

Expected: 现行业务代码和 PRD 不再命中；仅允许在版本记录或明确的“旧规则已废弃”说明中出现。

- [ ] **Step 5: 构建并运行全量验证**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 普通版与标注版签名一致；`THIRD_REVIEW 24/24 PASS`、`ANNOTATION 36/36 PASS` 与全部既有分组通过。

- [ ] **Step 6: 提交文档同步**

```powershell
git add -- tools/build-app-rental-demo.mjs "demos/APP租号功能/盖世游戏APP租号功能-标注版.html" "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
git commit -m "docs(app-rental): sync third review rules"
```

### Task 7: 重建 36 张截图并完成最终验收

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Replace: `public/prd/app-rental/*.png`
- Update: `test-results/app-rental-verification/contract-results.json`
- Update: `test-results/app-rental-capture/capture-results.json`
- Modify if a verified defect requires it: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`

- [ ] **Step 1: 固定 18 个页面/状态**

继续保留现有 18 个 `pageId`，不扩展截图数量；固定关键状态：

```js
home: Banner 为 `¥9.9 · 可租号`；
search: 默认 `games` Tab，展示已租号、可畅玩和一位小数租号价；
detail: 无权益，底栏显示“租号开玩”；
checkout: `time-rental`，在确认订单展示时租 SKU；
membership: 永久套餐推荐、四项权益和八款游戏；
steam-login: 竖屏二维码在上，横屏双栏；
after-sales: 四项问题类型；
```

非热门确认订单通过交互与自动验证覆盖，不增加第 19 个截图页面。

- [ ] **Step 2: 增加截图前置断言**

```js
if (shot.pageId === 'home') assert(/^¥\d+\.\d · 可租号$/.test((await page.locator('.home-rental-price').innerText()).trim()));
if (shot.pageId === 'search') {
  assert.equal(await page.locator('[data-search-tab="games"][aria-selected="true"]').count(), 1);
  assert.equal(await page.locator('.search-result-card [data-primary-action]').count(), 0);
}
if (shot.pageId === 'membership') {
  assert.equal(await page.locator('.membership-benefit-item').count(), 4);
  assert.equal(await page.locator('.membership-preview .member-game-card').count(), 8);
}
if (shot.pageId === 'after-sales') assert.equal(await page.locator('.after-sales-types button').count(), 4);
```

继续执行现有账号、密码、Guard、CDKEY 和订单类型标签泄漏检查。

- [ ] **Step 3: 构建并运行最终验证**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 全部分组通过，包括 `THIRD_REVIEW 24/24 PASS`、`FULL_PAGE_MATRIX 36/36 PASS`、`ORDER_CENTER_V2 14/14 PASS` 和 `ANNOTATION 36/36 PASS`。

- [ ] **Step 4: 重建截图**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`；竖屏 390×844、横屏 874×402；每张是有效 PNG 且大于 20KB；发布目录只包含清单内 36 张图。

- [ ] **Step 5: 原尺寸人工目检**

打开以下 14 张关键图：home、search、detail、checkout、membership、steam-login、after-sales 的横竖屏。逐项确认：

1. 详情固定底栏在底部且不遮挡正文。
2. 确认订单只出现时租 SKU，价格与 Banner 同源。
3. 竖屏 Steam 二维码在账号表单上方。
4. 售后四项对齐，无“3天无理由”原因。
5. 搜索游戏 Tab 选中，卡片无按钮。
6. 会员页有可辨识的价值 Hero、四项权益、八款游戏和永久推荐。
7. 首页 Banner 是 `¥9.9 · 可租号`，无“已租号”。
8. 无遮挡、溢出、异常缩放、素材错配和敏感凭据。

- [ ] **Step 6: 审计范围与格式**

Run:

```powershell
git diff --check
git diff --name-only -- "demos/APP租号功能" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求" test-results/app-rental-verification test-results/app-rental-capture
```

Expected: 只包含本计划列出的 APP 租号文件与证据；Mac、CDKEY 和无关脏文件不暂存。

- [ ] **Step 7: 提交最终证据**

```powershell
git add -- "demos/APP租号功能" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md" test-results/app-rental-verification/contract-results.json test-results/app-rental-capture/capture-results.json
git commit -m "fix(app-rental): complete third review corrections"
```

- [ ] **Step 8: 更新任务看板为评审中**

读取 `GUANWANGGAID-3` 最新 issue 与 comments；添加一条包含改动、自动验证、36 张截图、人工目检、提交号和剩余公网发布风险的评论。随后使用最新 `version` 将状态从 `in_progress` 移到 `in_review`，不得直接移到 `done`。

### Task 8: 修正探索页 Banner 与小游戏租号信息层级

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Replace: `public/prd/app-rental/01-discovery-portrait.png`
- Replace: `public/prd/app-rental/01-discovery-landscape.png`
- Update: `test-results/app-rental-verification/contract-results.json`
- Update: `test-results/app-rental-capture/capture-results.json`

- [ ] **Step 1: 先增加失败契约**

在探索页检查中增加以下断言：

```js
assert.equal((await page.locator('.hero-recommendation').innerText()).trim(), '今日推荐');
assert.match((await page.locator('.hero-date').innerText()).trim(), /^\d{1,2}\/\d{1,2}$/);
assert.equal((await page.locator('.hero-rental-price').innerText()).trim(), '¥1.9首租');
assert.equal((await page.locator('.hero-rental-demand').innerText()).trim(), '99+ 在租');
assert.equal(await page.locator('.hero-mark').count(), 0);
assert.equal(await page.locator('.hero-card').evaluate((card) => getComputedStyle(card, '::after').content), 'none');
assert.equal(await page.locator('.mini-rental-offer').count(), 4);
assert.equal(await page.locator('.mini-rental-demand').count(), 4);
```

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，当前 Banner 仍使用混合定位、`¥9.9 · 可租号` 与装饰圆环，小游戏卡仍使用统一状态文本。

- [ ] **Step 2: 增加真实首租 SKU 与演示资格**

在 `shadow-blade-zero.rentalSkus` 首项增加：

```js
{ id: 'first-rent-2h', label: '首租2小时', packageName: '首租体验套餐', durationLabel: '2小时', price: 1.9, originalPrice: 9.9, enabled: true, inStock: true, region: 'CN', firstOnly: true }
```

并把探索页截图种子的 `discoveryContexts['shadow-blade-zero'].firstRentalEligible` 设为 `true`，保证 Banner、详情进入确认订单和确认订单默认 SKU 使用同一资格与价格。

- [ ] **Step 3: 重建竖屏 Banner DOM**

使用明确的上下安全区，不再混用普通文档流和底部绝对定位：

```html
<div class="hero-topline"><span class="hero-recommendation">今日推荐</span><time class="hero-date">5/25</time></div>
<div class="hero-bottomline">
  <div class="hero-game-copy"><h1>影之刃零</h1><p><b>★ 9.5</b><span>动作 · 冒险</span></p></div>
  <div class="hero-rental-offer"><strong class="hero-rental-price">¥1.9首租</strong><span class="hero-rental-demand">99+ 在租</span></div>
</div>
```

删除 `.hero-mark` 节点、`.hero-card::after` 圆环和旧 `.hero-eyebrow/.hero-meta/.hero-bottom` 布局。底部遮罩加强，左右信息块保留至少 16px 边距与 12px 间距。

- [ ] **Step 4: 替换图 2 类型小游戏卡的商品信息**

保留封面、游戏名和整卡进入详情，使用固定演示字段替换旧 CDKEY 价格/标签或统一状态文本：

```html
<span class="mini-rental-offer">¥9.9租号</span>
<span class="mini-rental-demand">在租99+</span>
```

竖屏与横屏小游戏卡使用相同文案与语义；搜索结果仍使用既有“已租号 / 可畅玩 / 租号价”状态模型，不受本步骤影响。

- [ ] **Step 5: 运行构建、契约与截图**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 全部分组 PASS，Banner 首租价格与确认订单同源，小卡各有两行租号信息，无 CDKEY 标签。

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `PREFLIGHT 7/7 PASS`、`CAPTURE 36/36 PASS`。

- [ ] **Step 6: 原尺寸目检并提交**

目检 `01-discovery-portrait.png` 与 `01-discovery-landscape.png`：顶部推荐和日期、左下游戏名与评分类型、右下首租价与在租人数均无遮挡；小游戏卡两行信息完整可读。

Run: `git diff --check`

仅暂存本任务列出的 APP 租号文件，提交后重新读取 `GUANWANGGAID-3` 最新版本，补充验证评论并移回 `in_review`；不 push、不 publish。

## 计划自查

- 规格覆盖：详情、两类 SKU、确认订单、Steam、售后、搜索游戏 Tab、会员中心、Banner、小游戏卡、横竖屏、PRD、标注和截图均有对应任务。
- 类型一致：统一使用 `GAME_SALE_MODES`、`saleMode`、`eligibleCheckoutSkus()`、`SEARCH_TABS`、`searchTab` 和 `MEMBERSHIP_BENEFITS`。
- 页面职责：首页与搜索只发现游戏，详情只解释游戏，确认订单承担全部 SKU 选择与支付。
- 价格口径：符合资格时 Banner 与确认订单读取同一 `first-rent-2h` SKU；Banner 展示 `¥1.9首租`，结算金额继续保留两位小数。
- 小卡口径：图 2 类型小游戏卡固定使用 `¥9.9租号 / 在租99+`，不恢复 CDKEY 价格或促销标签；搜索结果状态模型不变。
- 权益边界：3天无理由只在订单权益说明；售后原因固定四项；自动退款状态机保留。
- 会员边界：保留月129、年499、永久399，永久推荐；不新增套餐、价格、倒计时或页面。
- 截图范围：继续 18 个页面 × 横竖屏 = 36 张；非热门确认订单由交互契约覆盖。
- 发布边界：未获授权前不 push、不发布，不声称固定 SHA 公网图片已验证。
