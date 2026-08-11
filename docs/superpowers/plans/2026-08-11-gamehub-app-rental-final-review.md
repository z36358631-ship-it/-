# 盖世游戏 APP 租号最终评审 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有 APP V6.1.1 高保真客户端的基础上，完成最终租号业务规则与确认订单金额布局，并把 Mac 租号运营后台接入 APP 标注 Demo，形成客户端 36 个横竖屏状态与后台 13 个桌面状态的一致交付。

**Architecture:** 客户端继续以 `盖世游戏APP租号功能demo.template.html` 作为唯一业务源码，构建脚本生成普通版并同步进标注版。后台从现有 Mac 标注 Demo 复用 7 个模块，抽成独立可内联片段；标注版同时承载 APP 客户端和运营后台，后台前 6 页通过页面局部 `clientType` Tab 隔离 APP/Mac 数据，操作记录保持统一。所有时间、资格、风险和续费规则通过显式状态模型暴露给 Playwright 验证 API。

**Tech Stack:** 单文件 HTML/CSS/原生 JavaScript、Node.js ESM、Playwright、Markdown PRD、`taskctl`。

---

## 文件结构与边界

- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` — 客户端唯一业务与样式源码。
- Create: `demos/APP租号功能/app-rental-admin.fragment.html` — 后台 CSS、7 个页面、双端数据和后台公开测试 API；构建时内联，不作为用户最终入口。
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` — 标注壳层、客户端/运营后台一级切换和后台挂载标记。
- Generate: `demos/APP租号功能/盖世游戏APP租号功能demo.html` — 普通客户端 Demo。
- Modify: `tools/build-app-rental-demo.mjs` — 素材内联、客户端同步、后台片段内联和签名检查。
- Modify: `tools/verify-app-rental-demo.mjs` — 客户端业务契约、后台双端契约、布局和敏感信息检查。
- Modify: `tools/capture-app-rental-prd-screenshots.mjs` — 36 个客户端截图与 13 个后台状态截图。
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` — 最终规则、后台字段、异常与验收。
- Update: `public/prd/app-rental/*.png`、`test-results/app-rental-verification/contract-results.json`、`test-results/app-rental-capture/capture-results.json` — 本地评审证据。

执行时保留上述文件中已经存在的本轮未提交修改，不得用旧提交覆盖；每次只精确暂存本任务文件，不处理工作区其他改动。

### Task 1: 建立客户端最终范围失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 在现有契约分组后增加客户端最终范围分组**

加入 `FINAL_SCOPE_PAYMENT_AND_GUARDS`，使用已有浏览器与 `window.__appRentalDemo`，至少包含以下实际断言：

```js
await runRefactorGate('FINAL_SCOPE_PAYMENT_AND_GUARDS', async () => {
  await page.evaluate(() => {
    const api = window.__appRentalDemo;
    api.setSelectedGame('spiritfarer', { shouldRender: false });
    api.setScenario('member-library-trial', { shouldRender: false });
    api.setSearchTab('games');
    api.navigate('search');
  });
  assert.equal(await page.locator('[data-search-view="games"] .search-game-card').count(), 3);
  assert.equal(await page.locator('[data-search-view="games"] .search-game-card [data-primary-action]').count(), 0);

  const checkoutAmounts = await page.evaluate(() => {
    const api = window.__appRentalDemo;
    api.setSelectedGame('shadow-blade-zero', { shouldRender: false });
    api.setScenario('not-member-library', { shouldRender: false });
    api.setOrientation('portrait');
    api.navigate('checkout');
    const root = document.querySelector('#appRentalDemo');
    const summary = root.querySelector('[data-checkout-amount-summary]');
    const packagePanel = root.querySelector('.checkout-sku-section');
    const paymentPanel = root.querySelector('.checkout-payment-methods');
    const snapshot = api.snapshot().order;
    return {
      labels: [...summary.querySelectorAll('[data-checkout-amount-row]')].map((node) => node.firstElementChild.textContent.trim()),
      original: summary.querySelector('[data-checkout-amount="game-original"]')?.textContent.trim(),
      orderAmount: summary.querySelector('[data-checkout-amount="order"]')?.textContent.trim(),
      due: root.querySelector('.portrait-fixed-footer strong')?.textContent.trim(),
      packageBeforeAmount: packagePanel.getBoundingClientRect().bottom <= summary.getBoundingClientRect().top,
      amountBeforePayment: summary.getBoundingClientRect().bottom <= paymentPanel.getBoundingClientRect().top,
      snapshot,
    };
  });
  assert.deepEqual(checkoutAmounts.labels, ['游戏原价', '订单金额']);
  assert.equal(checkoutAmounts.original, `¥${checkoutAmounts.snapshot.gameOriginalAmount}`);
  assert.equal(checkoutAmounts.orderAmount, `¥${Number(checkoutAmounts.snapshot.rawAmount).toFixed(2)}`);
  assert.equal(checkoutAmounts.due, `需支付 ¥${Number(checkoutAmounts.snapshot.rawAmount).toFixed(2)}`);
  assert(checkoutAmounts.packageBeforeAmount && checkoutAmounts.amountBeforePayment);

  const landscapeCheckout = await page.evaluate(() => {
    window.__appRentalDemo.setOrientation('landscape');
    const root = document.querySelector('#appRentalDemo');
    const left = root.querySelector('.checkout-benefit-column');
    const right = root.querySelector('.checkout-purchase-column');
    return {
      leftHasProduct: Boolean(left.querySelector('.checkout-product')),
      leftHasBenefits: Boolean(left.querySelector('.service-benefits')),
      leftHasPackage: Boolean(left.querySelector('.checkout-sku-section')),
      rightHasPackage: Boolean(right.querySelector('.checkout-sku-section')),
      rightHasAmounts: Boolean(right.querySelector('[data-checkout-amount-summary]')),
      rightHasPayment: Boolean(right.querySelector('.checkout-payment-row')),
      rightHasPurchase: Boolean(right.querySelector('.payment-primary')),
    };
  });
  assert.deepEqual(landscapeCheckout, {
    leftHasProduct: true, leftHasBenefits: false, leftHasPackage: false,
    rightHasPackage: true, rightHasAmounts: true, rightHasPayment: true, rightHasPurchase: true,
  });

  await reloadDemo();
  await page.evaluate(() => window.__appRentalDemo.navigate('membership'));
  const memberIntro = await page.locator('[data-membership-intro]').evaluate((dialog) => ({
    title: dialog.querySelector('h2')?.textContent.trim(),
    items: [...dialog.querySelectorAll('ol > li')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
    fullText: dialog.textContent.replace(/\s+/g, ' ').trim(),
  }));
  assert.equal(memberIntro.title, '关于会员');
  assert.equal(memberIntro.items.length, 4);
  assert(!memberIntro.fullText.includes('远程协助'));
  await page.locator('[data-action="close-membership-intro"]').last().click();
  await page.evaluate(() => {
    window.__appRentalDemo.navigate('home');
    window.__appRentalDemo.navigate('membership');
  });
  assert.equal(await page.locator('[data-membership-intro]').count(), 0);

  const listActions = await page.evaluate(() => window.__appRentalDemo.getOrderActions(
    window.__appRentalDemo.getOrderCollection().find((order) => order.status === 'active'),
    { surface: 'list' },
  ).map(([id]) => id));
  const detailActions = await page.evaluate(() => window.__appRentalDemo.getOrderActions(
    window.__appRentalDemo.getOrderCollection().find((order) => order.status === 'active'),
    { surface: 'detail' },
  ).map(([id]) => id));
  assert(!listActions.includes('after-sales'));
  assert(detailActions.includes('after-sales'));

  const trial = await page.evaluate(() => window.__appRentalDemo.simulateTrialPayment(1_786_400_000_000));
  assert.equal(trial.startsAt, trial.paidAt);
  assert.equal(trial.expiresAt - trial.paidAt, 2 * 60 * 60 * 1000);
  assert.equal(trial.status, 'active');
  assert.equal(trial.firstRentalEligible, false);

  const guard = await page.evaluate(() => window.__appRentalDemo.attemptRentalAccountLaunch('hogwarts'));
  assert.equal(guard.allowed, false);
  assert.equal(guard.reason, 'non-rented-game');

  const risk = await page.evaluate(() => window.__appRentalDemo.setRentalRiskDecision({
    extraNoReasonRestricted: true,
    ruleVersion: 'RISK-20260811-01',
  }));
  assert.equal(risk.extraNoReasonRestricted, true);
});
```

同步修订现有 `EIGHTH_REVIEW_SOURCE` 与 `CDKEY_VISUAL_CONVERGENCE` 的旧“唯一底部金额”口径，禁止项不得再用宽泛的 `原价` 匹配：

```js
const amountLayoutSourceChecks = [
  ['确认订单金额明细', templateSource.includes('renderCheckoutAmountSummary') && templateSource.includes('gameOriginalAmount')],
  ['金额与支付同源', templateSource.includes('getCheckoutAmountModel') && templateSource.includes('dueText')],
];
assert(amountLayoutSourceChecks.every(([, passed]) => passed), `确认订单金额源码契约失败：${JSON.stringify(amountLayoutSourceChecks)}`);

const removedLegacyCheckoutCopy = ['当前报价', '租赁信息', '租号服务协议', '支付有效期', '扫码支付'];
assert(
  removedLegacyCheckoutCopy.every((field) => !checkoutFields.text.includes(field)),
  `确认订单仍有已删除字段：${JSON.stringify(removedLegacyCheckoutCopy.filter((field) => checkoutFields.text.includes(field)))}`,
);
assert(
  ['游戏原价', '订单金额', '支付方式', '需支付', '立即购买'].every((field) => checkoutFields.text.includes(field)),
  `确认订单缺少金额或支付字段：${checkoutFields.text}`,
);
```

- [ ] **Step 2: 增加首次体验、终态入口和周卡续费的纯状态断言**

```js
const renewal = await page.evaluate(() => {
  const api = window.__appRentalDemo;
  const paidAt = 1_786_400_000_000;
  api.setMembershipEntitlement({ planId: 'weekly', startsAt: paidAt - 86_400_000, expiresAt: paidAt + 86_400_000 });
  return api.simulateMembershipPayment({ planId: 'weekly', paidAt, transactionId: 'WX-RENEW-001' });
});
assert.equal(renewal.expiresAt, 1_786_400_000_000 + 86_400_000 + 7 * 86_400_000);
const duplicate = await page.evaluate(() => window.__appRentalDemo.simulateMembershipPayment({
  planId: 'weekly', paidAt: 1_786_400_000_000, transactionId: 'WX-RENEW-001',
}));
assert.equal(duplicate.expiresAt, renewal.expiresAt);
```

- [ ] **Step 3: 运行契约并确认新增分组失败**

Run:

```powershell
node tools/verify-app-rental-demo.mjs
```

Expected: `FINAL_SCOPE_PAYMENT_AND_GUARDS` 因缺少双列卡、表面动作过滤、支付计时 API、启动拦截或续费 API 至少一项而失败；既有分组仍输出当前结果。

- [ ] **Step 4: 提交测试契约**

```powershell
git add -- tools/verify-app-rental-demo.mjs
git commit -m "test: define final app rental behavior"
```

### Task 2: 完成搜索、确认订单金额、订单动作和两类启动前拦截

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 把搜索游戏结果改为双列竖卡**

增加以下样式，并让横竖屏共用；卡片本身可点击，卡内不增加按钮或箭头：

```css
.search-game-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.search-game-card { min-width: 0; overflow: hidden; padding: 0 0 11px; border: 1px solid rgb(255 255 255 / 8%); border-radius: 16px; background: rgb(255 255 255 / 4%); color: inherit; cursor: pointer; text-align: left; }
.search-game-card .search-result-media { width: 100%; height: 116px; border-radius: 15px 15px 9px 9px; }
.search-game-card strong { display: -webkit-box; min-height: 34px; margin: 9px 10px 0; overflow: hidden; font-size: 12px; line-height: 17px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.search-game-card .discovery-display { display: block; margin: 5px 10px 0; color: var(--text-muted); font-size: 10px; }
```

替换渲染函数：

```js
function renderSearchGameResults(results) {
  return `<div class="search-game-grid" data-search-view="games">${results.map(([name, id, asset, crop]) => `
    <button class="search-game-card" type="button" data-action="navigate" data-screen="detail" data-game-id="${id}">
      ${realCrop(asset, crop, `${name}游戏封面`, '', 'search-result-media')}
      <strong>${name}</strong>${renderDiscoveryDisplay(id)}
    </button>`).join('')}</div>`;
}
```

- [ ] **Step 2: 增加确认订单游戏原价与订单金额快照**

在两个演示游戏目录项增加标准版游戏本体原价，并在创建草稿订单时固化；该值只做信息展示，不参与租号金额计算：

```js
const GAME_ORIGINAL_AMOUNTS = Object.freeze({
  'shadow-blade-zero': 298,
  spiritfarer: 108,
});

function createOrder({ sku, amount, priceVersion, ...snapshot }) {
  if (state.order && NON_TERMINAL_ORDER_STATUSES.has(state.order.status)) return null;
  const createdAt = Date.now();
  const game = getSelectedGame();
  const offer = getSelectedOffer();
  state.order = {
    orderType: 'rental',
    saleMode: getGameSaleMode(game.id),
    gameId: game.id,
    gameName: game.name,
    gameOriginalAmount: Number(GAME_ORIGINAL_AMOUNTS[game.id] || 0),
    currency: 'CNY',
    platform: state.selectedPlatform,
    editionId: 'standard',
    version: `${state.selectedPlatform} · 标准版`,
    packageName: offer.packageName,
    durationLabel: offer.durationLabel,
    originalAmount: offer.originalAmount,
    rawAmount: Number(amount),
    paymentMethod: state.selectedPayment,
    ...snapshot,
    id: nextOrderId(createdAt),
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    sku,
    amount: Number(amount),
    priceVersion,
    paymentDeadline: createdAt + 30 * 60 * 1000,
  };
  renderApp();
  return cloneOrder(state.order);
}
```

渲染金额明细时只读取订单快照，保证套餐切换重建草稿后金额同步：

```js
function getCheckoutAmountModel(order = state.order) {
  const gameOriginalAmount = Number(order?.gameOriginalAmount || 0);
  const orderAmount = Number(order?.rawAmount ?? order?.amount ?? 0);
  return {
    gameOriginalAmount,
    orderAmount,
    originalText: `¥${Number.isInteger(gameOriginalAmount) ? gameOriginalAmount : gameOriginalAmount.toFixed(2)}`,
    orderText: `¥${orderAmount.toFixed(2)}`,
    dueText: `需支付 ¥${orderAmount.toFixed(2)}`,
  };
}

function renderCheckoutAmountSummary(order) {
  const model = getCheckoutAmountModel(order);
  return `<section class="checkout-panel checkout-amount-summary" data-checkout-amount-summary>
    <div class="checkout-amount-row" data-checkout-amount-row><span>游戏原价</span><strong data-checkout-amount="game-original">${model.originalText}</strong></div>
    <div class="checkout-amount-row order" data-checkout-amount-row><span>订单金额</span><strong data-checkout-amount="order">${model.orderText}</strong></div>
  </section>`;
}
```

- [ ] **Step 3: 按确认结构重排横竖屏确认订单**

竖屏在商品下恢复上一版 `renderServiceBenefits()` 五项租号权益，并在 `renderCheckoutSkuOptions(game)` 与 `renderCheckoutPaymentMethods()` 之间插入 `renderCheckoutAmountSummary(order)`。横屏左栏保留 `renderGameContextCard()` 与同一五项租号权益，右栏的 `renderGamePaymentPanel(game, order)` 按套餐、金额、支付方式、底部支付操作顺序渲染；`3天无理由` 继续打开原规则弹窗：

```js
function renderGamePaymentPanel(game, order) {
  const model = getCheckoutAmountModel(order);
  const disabled = !state.inventoryAvailable;
  const processing = order.status !== 'pending';
  const ready = order.status === 'active';
  const recovery = renderCheckoutRecoveryActions();
  return `<section class="payment-panel">
    ${renderCheckoutSkuOptions(game)}
    ${renderCheckoutAmountSummary(order)}
    <div class="checkout-payment-row"><h2>支付方式</h2><div class="payment-list">${renderPaymentMethods()}</div></div>
    ${recovery || `<div class="checkout-bottom-bar"><strong>${ready ? '账号已就绪' : model.dueText}</strong><button class="primary-action payment-primary" type="button" data-primary-action="true" data-action="${ready ? 'open-login-method' : state.priceChanged ? 'refresh-price' : 'pay-game-order'}" ${disabled || (processing && !ready) ? 'disabled' : ''}>${ready ? '立即登录' : processing ? '账号分配中' : disabled ? '暂不可购买' : state.priceChanged ? '按新价格重新确认' : '立即购买'}</button></div>`}
  </section>`;
}
```

增加样式：

```css
.checkout-amount-summary { padding: 11px 14px; }
.checkout-amount-row { display: flex; min-height: 30px; align-items: center; justify-content: space-between; color: var(--text-muted); font-size: 12px; }
.checkout-amount-row strong { color: #aeb6c4; font-size: 13px; font-weight: 500; }
.checkout-amount-row.order strong { color: #ff4b5f; font-size: 24px; font-weight: 800; }
.landscape-checkout .payment-panel { overflow-y: auto; padding-bottom: 12px; }
.landscape-checkout .payment-panel .checkout-bottom-bar { position: sticky; right: auto; bottom: 0; left: auto; z-index: 2; margin-top: auto; padding-top: 10px; background: #222426; }
```

`renderPortraitCheckout()` 与横屏布局都不得渲染版本选择器；商品卡继续只读显示游戏名和灰色 `标准版` 副标题。标题栏右上角使用无背景纯文字 `租号介绍`，不显示问号；点击后以常见问题逐项展示“租号有什么作用 / 如何使用租号 / 使用时要注意什么”三组一问一答，关闭后不得改变套餐、金额与支付方式。`权益方案` 使用独立标题，SKU 按钮另起一行。详情点击、返回重进与标注导航直达确认订单时，统一先创建或复用当前游戏的待支付草稿；正常可售场景不得出现“订单创建失败”。

- [ ] **Step 4: 增加会员中心首次说明弹窗并删除远程协助条款**

在 `state` 增加：

```js
membershipIntroSeen: false,
membershipIntroOpen: false,
```

`navigate()` 在当前会话首次进入会员中心时打开弹窗；关闭后保留页面并在本次会话内不再展示：

```js
function navigate(screen, { rememberSource = true, replaceTask = false } = {}) {
  if (screen === 'checkout') ensureGameOrder();
  if (screen === 'orders') ensureSelectedOrder();
  if (screen === 'membership' && !state.membershipIntroSeen) state.membershipIntroOpen = true;
  const current = state.screen;
  state.capturePageId = screen;
  if (screen === current) return renderApp();
  if (rememberSource && isCoreScreen(current) && !isCoreScreen(screen)) {
    state.routeContext.sourceScreen = current;
    state.routeContext.sourceScrollTop = readCurrentScrollTop();
    state.routeContext.taskStack = [];
  } else if (replaceTask && !isCoreScreen(current) && !isCoreScreen(screen)) {
    const stack = state.routeContext.taskStack;
    if (stack[stack.length - 1] === screen) stack.pop();
  } else if (!isCoreScreen(current) && !isCoreScreen(screen)) {
    const stack = state.routeContext.taskStack;
    if (stack[stack.length - 1] !== current) stack.push(current);
  } else if (isCoreScreen(screen)) {
    state.routeContext.taskStack = [];
  }
  state.screen = screen;
  renderApp();
  restoreSourceScrollIfNeeded(screen);
}

function dismissMembershipIntro() {
  state.membershipIntroSeen = true;
  state.membershipIntroOpen = false;
  renderApp();
}
```

复用现有 `.modal-backdrop`，新增弹窗渲染器并挂到 `renderOverlays()`；正文不得包含“远程协助”或同义替代：

```js
function renderMembershipIntroDialog() {
  if (!state.membershipIntroOpen) return '';
  const items = [
    '开通会员可畅玩会员游戏，总价值30w+的正版游戏库存（标准版或默认版本）。启动游戏后绝不顶号、挤号。',
    '会员属于特殊虚拟商品，开通后无法退款。',
    '会员游戏库定期更新，但并非所有游戏均能第一时间加入会员游戏库，请理解。',
    '会员游戏账号池共享，非个人所有。一号一游戏，均为Steam正版账号；非盗版、非假入库、非离线。',
  ];
  return `<div class="modal-backdrop membership-intro-backdrop" role="presentation" data-membership-intro>
    <section class="membership-intro-dialog" role="dialog" aria-modal="true" aria-labelledby="membershipIntroTitle">
      <header><h2 id="membershipIntroTitle">关于会员</h2><button type="button" data-action="close-membership-intro" aria-label="关闭关于会员">×</button></header>
      <ol>${items.map((item) => `<li>${item}</li>`).join('')}</ol>
      <button class="primary-action" type="button" data-action="close-membership-intro">我已了解</button>
    </section>
  </div>`;
}
```

事件路由中 `close-membership-intro` 调用 `dismissMembershipIntro()`；Esc 关闭时也必须设置 `membershipIntroSeen=true`。`openCaptureState('membership')` 和截图脚本进入会员页后主动关闭弹窗，确保原 36 张页面基线仍展示会员中心正文。

- [ ] **Step 5: 将订单动作改为“共享动作源、按页面过滤”**

```js
function hasDirectGameEntitlement(gameId) {
  return getDiscoveryUserContext(gameId).playable;
}

function getOrderActions(order, { surface = 'list' } = {}) {
  let actions = [...(ORDER_ACTIONS_BY_STATUS[order?.status] || [])];
  if (surface === 'list') actions = actions.filter(([id]) => id !== 'after-sales');
  actions = actions.filter(([id]) => id !== 'credentials' || order.credentialAvailable !== false);
  if (['refunded', 'ended'].includes(order?.status)) {
    const next = hasDirectGameEntitlement(order.gameId)
      ? ['playable', '可畅玩', 'primary']
      : ['rent', '租号开玩', 'primary'];
    actions = actions.filter(([id]) => !['resume', 'playable', 'rent'].includes(id));
    actions.unshift(next);
  }
  return actions;
}
```

`renderOrderActions()` 必须传入 `{ surface }`，订单列表不得再出现 `申请售后`；详情保留。

- [ ] **Step 6: 增加服务端退款风险结果和确认快照**

在 `state` 中增加 `rentalRiskDecision`、`riskReminderOpen`、`pendingRentalIntent`、`pendingRiskSnapshot`。详情和终态订单的 `租号开玩` 统一调用：

```js
function requestRentalCheckout(gameId = state.selectedGameId) {
  const decision = state.rentalRiskDecision;
  state.pendingRentalIntent = { gameId };
  if (decision.extraNoReasonRestricted) {
    state.riskReminderOpen = true;
    renderApp();
    return { allowed: false, reason: 'extra-no-reason-restricted' };
  }
  return continueRentalCheckout();
}

function continueRentalCheckout() {
  const gameId = state.pendingRentalIntent?.gameId || state.selectedGameId;
  if (!getGameContext(gameId)) return { allowed: false, reason: 'game-not-found' };
  setSelectedGame(gameId, { shouldRender: false });
  state.pendingRentalIntent = null;
  navigate('checkout');
  return { allowed: true, reason: 'checkout-opened', gameId };
}

function confirmRentalRisk() {
  state.pendingRiskSnapshot = {
    extraNoReasonRestricted: true,
    ruleVersion: state.rentalRiskDecision.ruleVersion,
    acceptedAt: Date.now(),
  };
  state.riskReminderOpen = false;
  return continueRentalCheckout();
}
```

`createOrder()` 将 `pendingRiskSnapshot` 写入 `riskSnapshot`，未命中时写明额外承诺正常适用。弹层只提供 `暂不购买 / 确认继续`，不得影响四类履约售后。

- [ ] **Step 7: 增加非本次租用游戏启动拦截**

```js
function attemptRentalAccountLaunch(targetGameId) {
  const activeOrder = getOrderCollection().find((order) => order.status === 'active' && order.credentialAvailable);
  if (!activeOrder || activeOrder.gameId === targetGameId) return { allowed: true, reason: 'owned-or-rented-game' };
  const game = getGameContext(targetGameId);
  const context = getCheckoutEligibilityContext(targetGameId);
  const rentable = Boolean(game) && (getGameSaleMode(targetGameId) === GAME_SALE_MODES.TIME_RENTAL
    ? Boolean(lowestEligibleRentalSku(game, context))
    : eligibleCheckoutSkus(game, context).length > 0);
  state.nonTargetLaunchGuard = {
    currentGameId: activeOrder.gameId,
    currentGameName: activeOrder.gameName,
    targetGameId,
    targetGameName: game?.name || targetGameId,
    rentable,
  };
  renderApp();
  return { allowed: false, reason: 'non-rented-game', rentable };
}
```

弹层必须同时展示当前租用游戏和目标游戏；`rentable=true` 时主操作为 `查看租号方案` 并继续走退款风险检查，反之只显示 `暂不可租用`。启动请求增加 `launchRequestId` 集合，重复请求返回原结果。

- [ ] **Step 8: 补齐事件路由和测试 API**

增加 `request-rental-checkout`、`confirm-rental-risk`、`close-rental-risk`、`launch-steam-library-game`、`view-target-rental`、`close-non-target-guard` 事件，并在 `window.__appRentalDemo` 暴露：

```js
Object.assign(window.__appRentalDemo, {
  getOrderActions,
  requestRentalCheckout,
  confirmRentalRisk,
  setRentalRiskDecision(value) {
    state.rentalRiskDecision = { extraNoReasonRestricted: false, ruleVersion: '', ...value };
    return { ...state.rentalRiskDecision };
  },
  attemptRentalAccountLaunch,
});
```

- [ ] **Step 9: 运行客户端契约**

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: 搜索、列表/详情动作、终态入口与两类拦截断言通过；支付计时和后台分组仍可失败。

- [ ] **Step 10: 提交客户端发现、确认订单金额、会员说明与拦截**

```powershell
git add -- 'demos/APP租号功能/盖世游戏APP租号功能demo.template.html' 'demos/APP租号功能/盖世游戏APP租号功能demo.html' 'demos/APP租号功能/盖世游戏APP租号功能-标注版.html'
git commit -m "feat: complete app rental checkout and guards"
```

### Task 3: 实现支付成功计时、无感启动与周卡续费

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加显式服务端时间和权益状态**

在 `state` 增加：

```js
serverNow: null,
processedPaymentTransactions: {},
preparedLaunchRequests: {},
platformTrialEligibility: { eligible: true, consumedAt: null, orderId: null },
membershipEntitlement: { planId: null, startsAt: null, expiresAt: null },
```

并统一使用：

```js
function nowFromServer() {
  return Number.isFinite(Number(state.serverNow)) ? Number(state.serverNow) : Date.now();
}
```

- [ ] **Step 2: 让权益型订单在支付成功时直接生效**

替换 `payOrder()` 的核心状态流：

```js
function payOrder({ paidAt = nowFromServer(), transactionId = state.order?.id } = {}) {
  if (!state.order || !['pending', 'active', 'allocating'].includes(state.order.status)) return false;
  if (state.processedPaymentTransactions[transactionId]) return cloneOrder(state.order);
  const entitlementOrder = state.order.saleMode === GAME_SALE_MODES.ENTITLEMENT;
  state.order.paidAt = paidAt;
  state.order.startsAt = paidAt;
  state.order.playedMinutes = 0;
  state.order.refundRuleVersion = state.pendingRiskSnapshot?.extraNoReasonRestricted ? null : 'REFUND-72H-30M-V1';
  state.order.riskSnapshot = state.pendingRiskSnapshot || { extraNoReasonRestricted: false };
  if (entitlementOrder) {
    state.order.status = 'active';
    state.order.credentialAvailable = false;
    if (state.order.sku === 'trial') {
      state.order.expiresAt = paidAt + 2 * 60 * 60 * 1000;
      state.order.expireAt = state.order.expiresAt;
      state.platformTrialEligibility = { eligible: false, consumedAt: paidAt, orderId: state.order.id };
      setScenario('member-library-trial-used', { shouldRender: false });
    }
    state.transactionNotice = 'entitlement-active';
  } else {
    state.order.status = 'allocating';
    state.transactionNotice = 'payment-complete';
  }
  state.processedPaymentTransactions[transactionId] = state.order.id;
  renderApp();
  return cloneOrder(state.order);
}
```

时租账号分配成功后的到期时间必须从 `order.paidAt` 计算，而不是从分配完成时间计算；首次体验不进入 `allocateAccount()`。

- [ ] **Step 3: 支付后隐藏首次体验并移除用户可见分配态**

`getCheckoutEligibilityContext()` 和 `getDiscoveryUserContext()` 必须同时读取平台级 `platformTrialEligibility.eligible` 与游戏目录资格；任一游戏首次体验支付成功后，所有游戏的确认订单、搜索和首页都立即失去首次体验 SKU/首体验价，回退各自普通租价。`checkoutAlert()` 对权益型订单显示“支付成功，权益已生效”，`renderGamePaymentPanel()` 不显示“账号分配中”。`renderOrderProgress()` 对权益型订单使用 `提交订单 / 完成支付 / 权益生效 / 开始畅玩`。

- [ ] **Step 4: 增加每次启动后台幂等准备账号**

```js
function prepareAccountForLaunch({ orderId, launchRequestId }) {
  if (state.preparedLaunchRequests[launchRequestId]) return state.preparedLaunchRequests[launchRequestId];
  const order = getOrderCollection().find((item) => item.id === orderId);
  const expiresAt = Number(order?.expiresAt || order?.expireAt || 0);
  const valid = order?.status === 'active' && (!expiresAt || expiresAt > nowFromServer());
  const result = valid
    ? { ok: true, orderId, launchRequestId, prepared: true }
    : { ok: false, orderId, launchRequestId, reason: 'entitlement-expired' };
  state.preparedLaunchRequests[launchRequestId] = result;
  return result;
}
```

该函数不渲染“账号分配中”；重复 `launchRequestId` 不增加 `accountAllocationCount`。

- [ ] **Step 5: 实现周卡未过期顺延、已过期重算和回调幂等**

```js
const MEMBER_PLAN_DAYS = Object.freeze({ weekly: 7, monthly: 30, quarterly: 90 });

function applyMembershipPayment({ planId, paidAt, transactionId }) {
  if (state.processedPaymentTransactions[transactionId]) return { ...state.membershipEntitlement };
  const duration = MEMBER_PLAN_DAYS[planId] * 86_400_000;
  const currentExpiry = Number(state.membershipEntitlement.expiresAt || 0);
  const startsAt = currentExpiry > paidAt ? state.membershipEntitlement.startsAt : paidAt;
  const base = currentExpiry > paidAt ? currentExpiry : paidAt;
  state.membershipEntitlement = { planId, startsAt, expiresAt: base + duration };
  state.processedPaymentTransactions[transactionId] = `membership:${planId}`;
  return { ...state.membershipEntitlement };
}
```

`payMembershipOrder()` 使用订单 `id` 作为 `transactionId`；购买周卡后按钮继续允许创建续费订单，不把已生效会员永久禁用。

- [ ] **Step 6: 暴露固定时间测试 API 并跑通契约**

```js
Object.assign(window.__appRentalDemo, {
  setServerNow(value) { state.serverNow = Number(value); return state.serverNow; },
  simulateTrialPayment(paidAt) {
    setSelectedGame('spiritfarer', { shouldRender: false });
    setScenario('member-library-trial', { shouldRender: false });
    state.platformTrialEligibility = { eligible: true, consumedAt: null, orderId: null };
    state.discoveryContexts.spiritfarer.firstRentalEligible = true;
    state.selectedSku = 'trial';
    state.order = null;
    const offer = getSelectedOffer();
    createOrder({
      sku: offer.sku,
      amount: offer.amount,
      priceVersion: 'APP-PRICE-2026-08-03',
      packageName: offer.packageName,
      durationLabel: offer.durationLabel,
      originalAmount: offer.originalAmount,
      paymentMethod: state.selectedPayment,
    });
    const order = payOrder({ paidAt, transactionId: `TRIAL-${paidAt}` });
    return {
      ...order,
      firstRentalEligible: getCheckoutEligibilityContext('spiritfarer').firstRentalEligible,
      platformTrialEligible: state.platformTrialEligibility.eligible,
    };
  },
  prepareAccountForLaunch,
  setMembershipEntitlement(value) { state.membershipEntitlement = { ...value }; return { ...state.membershipEntitlement }; },
  simulateMembershipPayment: applyMembershipPayment,
});
```

Run:

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: `FINAL_SCOPE_PAYMENT_AND_GUARDS` 全部通过；旧的“首次成功启动计时”“首次体验账号分配中”和重复回调延长时间断言不存在。

- [ ] **Step 7: 提交计时与续费**

```powershell
git add -- 'demos/APP租号功能/盖世游戏APP租号功能demo.template.html' 'demos/APP租号功能/盖世游戏APP租号功能demo.html' 'demos/APP租号功能/盖世游戏APP租号功能-标注版.html' tools/verify-app-rental-demo.mjs
git commit -m "feat: start rental entitlements at payment"
```

### Task 4: 建立运营后台双端失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加后台页面矩阵和静态签名**

```js
const ADMIN_PAGE_MATRIX = Object.freeze([
  'products', 'member-library', 'member-plans', 'accounts', 'admin-orders', 'stats', 'audit',
]);
const ADMIN_DUAL_CLIENT_PAGES = Object.freeze(ADMIN_PAGE_MATRIX.filter((pageId) => pageId !== 'audit'));
```

检查标注版包含 `APP（安卓端）客户端 / 运营后台`、7 个模块、后台片段构建标记和 `window.__appRentalAdminDemo`。

- [ ] **Step 2: 增加运行时后台契约**

```js
await runRefactorGate('ADMIN_DUAL_CLIENT', async () => {
  await page.goto(pathToFileURL(annotationPath).href);
  await page.locator('[data-annotation-surface="admin"]').click();
  const apiExists = await page.evaluate(() => Boolean(window.__appRentalAdminDemo));
  assert(apiExists);
  for (const pageId of ADMIN_PAGE_MATRIX) {
    await page.evaluate((id) => window.__appRentalAdminDemo.navigate(id), pageId);
    const snapshot = await page.evaluate(() => window.__appRentalAdminDemo.snapshot());
    assert.equal(snapshot.page, pageId);
    const tabCount = await page.locator('#appRentalAdminDemo [data-admin-client-tab]').count();
    assert.equal(tabCount, pageId === 'audit' ? 0 : 2);
    if (pageId !== 'audit') assert.equal(snapshot.clientType, 'android');
  }
});
```

- [ ] **Step 3: 增加数据隔离与审计检查**

```js
await page.evaluate(() => window.__appRentalAdminDemo.navigate('member-plans'));
assert((await page.locator('#appRentalAdminDemo').innerText()).includes('周卡'));
assert(!(await page.locator('#appRentalAdminDemo').innerText()).includes('永久会员'));
await page.locator('[data-admin-client-tab="mac"]').click();
assert.equal((await page.evaluate(() => window.__appRentalAdminDemo.snapshot())).clientType, 'mac');
await page.evaluate(() => window.__appRentalAdminDemo.navigate('audit'));
assert.equal(await page.locator('#appRentalAdminDemo [data-admin-client-tab]').count(), 0);
assert((await page.locator('#appRentalAdminDemo').innerText()).includes('clientType'));
```

- [ ] **Step 4: 运行并确认后台分组失败**

```powershell
node tools/verify-app-rental-demo.mjs
```

Expected: `ADMIN_DUAL_CLIENT` 因后台片段和 API 尚未创建而失败。

- [ ] **Step 5: 提交后台契约**

```powershell
git add -- tools/verify-app-rental-demo.mjs
git commit -m "test: define dual-client rental admin"
```

### Task 5: 复用 Mac 后台并实现页面局部 APP/Mac Tab

**Files:**
- Create: `demos/APP租号功能/app-rental-admin.fragment.html`
- Reference: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/build-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 从 Mac 标注版提取后台视觉和 7 个渲染器**

复用以下已有单元，不修改 Mac 文件：`ADMIN_PAGES`、`adminFrame()`、`renderAdminProducts()`、`renderAdminMemberLibrary()`、`renderAdminMembershipPlans()`、`renderAdminAccounts()`、`renderAdminOrdersScreen()`、`renderAdminStats()`、`renderAdminAudit()`、表格/抽屉/确认框样式和操作事件。

新片段必须以稳定标记包裹：

```html
<!-- APP_RENTAL_ADMIN_FRAGMENT_START -->
<style data-app-rental-admin-style>
#appRentalAdminDemo { min-height: 100%; color: #f5f7fb; background: #0d1017; }
#appRentalAdminDemo .admin-app { display: grid; grid-template-columns: 216px minmax(0, 1fr); min-height: 100%; }
#appRentalAdminDemo .admin-side { padding: 20px 14px; border-right: 1px solid rgb(255 255 255 / 8%); background: #111620; }
#appRentalAdminDemo .admin-main { min-width: 0; padding: 24px; }
#appRentalAdminDemo .admin-client-tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 10px; background: rgb(255 255 255 / 6%); }
#appRentalAdminDemo [data-admin-client-tab] { min-height: 36px; padding: 0 14px; border: 0; border-radius: 8px; color: #98a2b3; background: transparent; }
#appRentalAdminDemo [data-admin-client-tab].active { color: #fff; background: #246bfd; }
</style>
<script data-app-rental-admin-script>
(() => {
  const ADMIN_PAGES = Object.freeze([
    ['products', '租号商品管理'], ['member-library', '会员游戏库管理'],
    ['member-plans', '会员套餐管理'], ['accounts', '账号资源管理'],
    ['admin-orders', '订单与售后'], ['stats', '效果统计'], ['audit', '操作记录'],
  ]);
  const ADMIN_RENDERERS = Object.freeze({
    products: renderAdminProducts,
    'member-library': renderAdminMemberLibrary,
    'member-plans': renderAdminMembershipPlans,
    accounts: renderAdminAccounts,
    'admin-orders': renderAdminOrdersScreen,
    stats: renderAdminStats,
    audit: renderAdminAudit,
  });
  function renderAdminApp() {
    const renderer = ADMIN_RENDERERS[adminState.page];
    const root = document.getElementById('appRentalAdminDemo');
    if (!root || !renderer) throw new Error(`Cannot render admin page: ${adminState.page}`);
    root.innerHTML = renderer({ clientType: currentClientType() });
  }
})();
</script>
<!-- APP_RENTAL_ADMIN_FRAGMENT_END -->
```

- [ ] **Step 2: 建立按端隔离的数据仓和页面局部选择状态**

```js
const adminState = {
  page: 'products',
  clientByPage: Object.fromEntries(ADMIN_PAGES.filter(([id]) => id !== 'audit').map(([id]) => [id, 'android'])),
  selectedIds: { android: {}, mac: {} },
  filters: { android: {}, mac: {} },
  auditLogs: [],
};

function currentClientType(pageId = adminState.page) {
  return pageId === 'audit' ? 'all' : adminState.clientByPage[pageId] || 'android';
}

function renderClientTabs(pageId) {
  if (pageId === 'audit') return '';
  const current = currentClientType(pageId);
  return `<div class="admin-client-tabs" role="tablist" aria-label="客户端数据">
    <button class="${current === 'android' ? 'active' : ''}" data-admin-client-tab="android">APP（安卓端）</button>
    <button class="${current === 'mac' ? 'active' : ''}" data-admin-client-tab="mac">Mac</button>
  </div>`;
}
```

每次 `navigate(pageId)` 对非审计页把该页重置为 `android`；切换端别时清除当前页另一端的勾选项、未提交表单和分页，但不修改其他页面。

- [ ] **Step 3: 保留 Mac 数据，增加 APP 安卓端数据模型**

```js
const MAC_ADMIN_DATA = Object.freeze({
  products: [
    {
      id: 'MAC-PROD-GTA6', gameId: 'gta6', gameName: 'GTA 6', platform: 'Steam',
      versions: ['standard', 'enhanced', 'deluxe'], saleMode: 'time-rental', status: 'online',
    },
  ],
  memberLibrary: [
    { id: 'MAC-LIB-001', gameId: 'spiritfarer', versionId: 'standard', enabled: true, availableStock: 26 },
  ],
  memberPlans: [
    { id: 'mac-monthly', name: '月度会员', days: 30, price: 129 },
    { id: 'mac-yearly', name: '年度会员', days: 365, price: 499 },
    { id: 'mac-permanent', name: '永久会员', days: null, price: 399 },
  ],
  accounts: [
    { id: 'MAC-ACC-001', gameId: 'gta6', maskedName: 'gh_***_2607', status: 'rentable', credentialPlaintext: null },
  ],
  orders: [
    { id: 'MAC-ORDER-001', gameId: 'gta6', status: 'renting', clientType: 'mac', deviceModel: 'MacBook Pro' },
  ],
  stats: { funnel: ['租号曝光', '点击租号', '提交订单', '支付成功', '一键上号成功'] },
});

const ADMIN_DATA = Object.freeze({
  android: {
    products: [
      {
        id: 'APP-PROD-GTA6-STD', gameId: 'gta6', gameName: 'GTA 6', editionId: 'standard',
        editionName: '标准版', saleMode: 'time-rental', priceVersion: 'APP-PRICE-20260811-01',
        displayPrice: 9.9, inventory: 128,
      },
      {
        id: 'APP-PROD-SPIRITFARER-STD', gameId: 'spiritfarer', gameName: 'Spiritfarer', editionId: 'standard',
        editionName: '标准版', saleMode: 'entitlement', priceVersion: 'APP-PRICE-20260811-01',
        firstTrialHours: 2, firstTrialPrice: 1.99, permanentPrice: 168, inventory: null,
      },
    ],
    memberPlans: [
      { id: 'weekly', name: '周卡', days: 7, price: 39 },
      { id: 'monthly', name: '月卡', days: 30, price: 129 },
      { id: 'quarterly', name: '季卡', days: 90, price: 299 },
    ],
    deviceLabels: ['APP版本', 'Android版本', '机型', 'CPU', 'GPU', '运行内存'],
  },
  mac: MAC_ADMIN_DATA,
});
```

APP 商品只显示标准版；订单与售后使用 Android 设备字段；效果统计使用 APP 漏斗；账号资源不显示凭据明文。Mac Tab 继续使用现有 Mac 数据、字段和动作。

- [ ] **Step 4: 所有读写、导出和批量操作携带 `clientType`**

```js
function adminRequest(scope, payload = {}) {
  const clientType = currentClientType();
  if (clientType === 'all' && adminState.page !== 'audit') throw new Error('clientType is required');
  return { scope, clientType, payload };
}

function addAdminAudit({ module, action, objectId, before, after }) {
  adminState.auditLogs.unshift({
    id: `AUD-${Date.now()}`,
    module, action, objectId,
    clientType: currentClientType(),
    before, after,
    occurredAt: Date.now(),
  });
}
```

统一操作记录页不渲染端别 Tab；列表或详情必须可见 `clientType`，筛选和浏览本身不写日志。

- [ ] **Step 5: 在标注壳层增加一级切换和后台挂载点**

左侧品牌下增加：

```html
<div class="annotation-surface-switch">
  <button class="active" data-annotation-surface="client">APP（安卓端）客户端</button>
  <button data-annotation-surface="admin">运营后台</button>
</div>
```

舞台增加后台根节点：

```html
<div id="demoScaleFrame" data-scale="1"><main id="appRentalDemo"></main></div>
<main id="appRentalAdminDemo" hidden></main>
<!-- APP_RENTAL_ADMIN_INJECT -->
```

客户端模式保留原 8 个流程组、18 页面矩阵、方向和场景；后台模式左侧只显示 7 个后台模块，隐藏方向控制与客户端场景。进入后台默认 `products/android`。

- [ ] **Step 6: 让构建脚本内联后台片段并验证标记**

在 `tools/build-app-rental-demo.mjs` 增加：

```js
const adminFragmentPath = path.join(root, 'demos', 'APP租号功能', 'app-rental-admin.fragment.html');
const adminFragment = fs.readFileSync(adminFragmentPath, 'utf8').trim();
annotation = annotation.replace(
  /<!-- APP_RENTAL_ADMIN_FRAGMENT_START -->[\s\S]*?<!-- APP_RENTAL_ADMIN_FRAGMENT_END -->|<!-- APP_RENTAL_ADMIN_INJECT -->/,
  adminFragment,
);
```

若注入标记、7 个模块、6 个双端 Tab 页面或 `__appRentalAdminDemo` 签名缺失，构建直接失败。

- [ ] **Step 7: 暴露后台测试 API**

```js
window.__appRentalAdminDemo = Object.freeze({
  navigate(pageId) {
    if (!ADMIN_PAGES.some(([id]) => id === pageId)) throw new Error(`Unknown admin page: ${pageId}`);
    adminState.page = pageId;
    if (pageId !== 'audit') adminState.clientByPage[pageId] = 'android';
    renderAdminApp();
    return this.snapshot();
  },
  setClientType(clientType) {
    if (adminState.page === 'audit') throw new Error('Audit page has no client tab');
    if (!['android', 'mac'].includes(clientType)) throw new Error(`Unknown client type: ${clientType}`);
    const pageId = adminState.page;
    const previous = currentClientType(pageId);
    adminState.selectedIds[previous][pageId] = [];
    adminState.filters[previous][pageId] = {};
    adminState.clientByPage[pageId] = clientType;
    renderAdminApp();
    return this.snapshot();
  },
  snapshot() { return { page: adminState.page, clientType: currentClientType(), auditCount: adminState.auditLogs.length }; },
  reset() {
    adminState.page = 'products';
    for (const [pageId] of ADMIN_PAGES) {
      if (pageId !== 'audit') adminState.clientByPage[pageId] = 'android';
    }
    adminState.selectedIds = { android: {}, mac: {} };
    adminState.filters = { android: {}, mac: {} };
    renderAdminApp();
    return this.snapshot();
  },
});
```

- [ ] **Step 8: 构建并跑通后台契约**

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: `ADMIN_DUAL_CLIENT`、`FINAL_SCOPE_PAYMENT_AND_GUARDS` 与既有客户端分组全部通过；操作记录页无 `[data-admin-client-tab]`。

- [ ] **Step 9: 提交后台集成**

```powershell
git add -- 'demos/APP租号功能/app-rental-admin.fragment.html' 'demos/APP租号功能/盖世游戏APP租号功能-标注版.html' tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs
git commit -m "feat: add dual-client rental operations"
```

### Task 6: 同步标注说明、PRD 与构建契约

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 更新客户端标注中的旧口径**

搜索并替换：

```powershell
rg -n "单游永久|首次启动|账号分配中|继续畅玩|列表与详情.*一致|月度|年度|永久会员|游戏名 - 标准版" 'demos/APP租号功能/盖世游戏APP租号功能-标注版.html'
```

只保留必要的否定性边界说明；正向标注统一为 `首次体验 · 2小时`、`单游戏永久`、支付成功计时、列表无申请售后、终态按权益显示可畅玩或租号开玩、商品名/灰色标准版两级信息。

- [ ] **Step 2: 为后台增加交互与异常标注**

后台每页至少覆盖：进入默认 APP、切换 Mac、筛选/批量/编辑/导出按端隔离；操作记录覆盖统一审计、`clientType`、敏感信息不可见和只读详情。标注目标必须位于 `#appRentalAdminDemo`，不把后台标号挂到客户端根节点。

- [ ] **Step 3: 更新 PRD 最终业务规则**

在现有 APP PRD 中修订并验收以下可执行规则：

```markdown
- 首次体验 SKU：首次体验 · 2小时；startsAt=paidAt，expiresAt=paidAt+2小时。
- 支付成功即消耗首次资格并隐藏 SKU；客户端不显示账号分配中。
- 启动时后台幂等准备账号；重复 launchRequestId 返回同一结果。
- 周卡未过期从当前到期时间顺延7天，已过期从本次 paidAt 重算；回调按交易号幂等。
- 订单列表过滤申请售后，详情保留；终态无权益显示租号开玩，有权益显示可畅玩。
- 非本次租用游戏启动前阻断；退款风险只限制平台额外3天无理由。
- 确认订单竖屏按“商品→上一版五项租号权益→套餐→游戏原价/订单金额→支付方式”展示；横屏左侧展示商品与五项租号权益、右侧展示套餐/金额/支付；订单金额与需支付同源，3天无理由仍可打开规则弹窗，右上角纯文字“租号介绍”打开三组常见问题问答。
- 首次进入会员中心展示“关于会员”四点说明；关闭后本次会话不重复出现；不包含远程协助条款。
- 后台7模块复用 Mac；6页独立 APP/Mac Tab、默认 APP；操作记录不加 Tab。
```

后台字段表必须明确 `clientType`、APP 标准版、周/月/季套餐、Android 设备字段、风险快照、支付/启动幂等键和审计要求。

- [ ] **Step 4: 更新构建签名和旧文案禁用项**

`requiredBusinessSignatures` 增加：

```js
'requestRentalCheckout', 'attemptRentalAccountLaunch', 'riskSnapshot',
'prepareAccountForLaunch', 'membershipEntitlement', 'processedPaymentTransactions',
'search-game-grid', 'renderCheckoutAmountSummary', 'gameOriginalAmount', 'dueText',
'renderMembershipIntroDialog', 'membershipIntroSeen', 'close-membership-intro', "surface = 'list'",
```

后台签名增加：

```js
'APP_RENTAL_ADMIN_FRAGMENT_START', '__appRentalAdminDemo',
'data-admin-client-tab', 'clientType', 'APP（安卓端）',
```

构建必须拒绝正向旧逻辑：首次体验从首次启动计时、首次体验支付后进入分配中、订单列表申请售后、后台全局端别 Tab、操作记录端别 Tab。

- [ ] **Step 5: 构建、验证并提交文档同步**

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
git diff --check -- 'demos/APP租号功能' tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md'
git add -- 'demos/APP租号功能/盖世游戏APP租号功能-标注版.html' 'demos/APP租号功能/盖世游戏APP租号功能demo.html' tools/build-app-rental-demo.mjs 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md'
git commit -m "docs: align app rental final rules"
```

Expected: 构建和全部契约通过，`git diff --check` 无错误。

### Task 7: 生成客户端 36 状态与后台 13 状态证据

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Update: `public/prd/app-rental/*.png`
- Update: `test-results/app-rental-capture/capture-results.json`
- Test: `tools/capture-app-rental-prd-screenshots.mjs`

- [ ] **Step 1: 保留客户端 18×2 截图矩阵并增加关键运行时检查**

搜索页检查双列几何、名称两行上限和无独立 CTA；确认订单检查竖屏套餐/金额/支付顺序、横屏左右分栏、订单金额与需支付一致且无版本选择器；订单列表检查无申请售后、按钮不越卡；会员中心截图前关闭首次说明弹窗，并检查横屏支付区首屏可见且无二维码；Steam 登录检查敏感信息遮罩。

- [ ] **Step 2: 增加后台 13 状态矩阵**

```js
const adminShots = Object.freeze([
  ...['products', 'member-library', 'member-plans', 'accounts', 'admin-orders', 'stats']
    .flatMap((pageId) => ['android', 'mac'].map((clientType) => ({
      name: `admin-${pageId}-${clientType}.png`, pageId, clientType,
    }))),
  { name: 'admin-audit.png', pageId: 'audit', clientType: 'all' },
]);
```

后台截图打开标注版，切到运营后台，通过 `__appRentalAdminDemo.navigate()` 和 `setClientType()` 设置状态，只截 `#appRentalAdminDemo`。输出到 `public/prd/app-rental/`，结果写入同一 JSON 的 `adminShots`。

- [ ] **Step 3: 增加后台截图前置断言**

每张非审计图断言活动 Tab 与 `clientType` 一致、页面标题正确、表格/指标非空；审计图断言无端别 Tab、存在 `clientType` 字段、无账号密码/令牌明文。

- [ ] **Step 4: 运行截图生成**

```powershell
node tools/capture-app-rental-prd-screenshots.mjs
```

Expected: 客户端 `36/36 PASS`，后台 `13/13 PASS`，总计 49 个关键状态；失败时结果 JSON 包含页面、端别和证据路径。

- [ ] **Step 5: 原尺寸人工目检关键图**

至少检查：搜索横竖屏、确认订单横竖屏、会员中心横屏、订单中心横竖屏、Steam 登录横竖屏、6 个 APP 后台页、1 个 Mac 页面和统一操作记录。确认订单重点检查横屏左侧只有商品、右侧依次出现套餐/游戏原价/订单金额/支付方式/支付按钮，右上角只显示“租号介绍”，低高度下可滚动且按钮可操作；同时检查其他页面的重叠、越界、端别选中、字段错误、敏感信息和后台表格可读性。

- [ ] **Step 6: 提交截图与脚本**

```powershell
git add -- tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental test-results/app-rental-capture/capture-results.json
git commit -m "test: add app rental client and admin evidence"
```

### Task 8: 最终回归、精确交付与看板回评审

**Files:**
- Update: `test-results/app-rental-verification/contract-results.json`
- Update: `docs/superpowers/plans/2026-08-11-gamehub-app-rental-final-review.md` checkboxes only if execution workflow records them
- Taskboard: `GUANWANGGAID-3`

- [ ] **Step 1: 执行最终回归**

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
node tools/capture-app-rental-prd-screenshots.mjs
git diff --check
```

Expected: 构建成功；所有客户端和后台契约 PASS；截图客户端 36/36、后台 13/13；`git diff --check` 无错误。

- [ ] **Step 2: 执行旧口径与敏感信息扫描**

```powershell
rg -n "首次成功启动|首次启动开始|单游永久|永久会员|年度会员|继续游戏|一键上号失败|提交账号密码后获取令牌" 'demos/APP租号功能' 'prd/【盖世游戏APP】游戏租号需求'
rg -n "gh_rental_2607|G@meHub#8291|Rockstar#2607" public/prd/app-rental test-results/app-rental-capture
```

Expected: 第一条只允许命中明确的否定性历史/边界说明，不能命中当前正向规则；第二条零命中。

- [ ] **Step 3: 核对精确变更范围**

```powershell
git status --short
git diff --name-only HEAD -- 'demos/APP租号功能' tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs 'prd/【盖世游戏APP】游戏租号需求' public/prd/app-rental test-results/app-rental-verification test-results/app-rental-capture
```

不暂存、删除或修改范围外文件；不 push、不 publish。

- [ ] **Step 4: 创建最终本地提交**

若最后一轮只剩结果文件和小修：

```powershell
git add -- test-results/app-rental-verification/contract-results.json
git commit -m "chore: finalize app rental verification"
```

- [ ] **Step 5: 更新看板并移回评审**

```powershell
taskctl.cmd issue get GUANWANGGAID-3 --json
taskctl.cmd comment add GUANWANGGAID-3 --body "已完成 APP 租号客户端与运营后台最终范围；附提交号、客户端36/36、后台13/13、自动契约和人工目检结果；未push、未publish。" --json
$latestIssue = taskctl.cmd issue get GUANWANGGAID-3 --json | ConvertFrom-Json
taskctl.cmd issue move GUANWANGGAID-3 --status in_review --if-version $latestIssue.task.version --json
```

Expected: 看板保持完整历史，状态为 `in_review`，不直接置为 `done`。

## 完成判定

- 首次体验 2 小时严格从服务端 `paidAt` 计时，支付成功消耗资格并隐藏 SKU。
- 首次体验无用户可见账号分配态，每次启动后台幂等准备账号。
- 搜索游戏 Tab 双列竖卡；订单列表无申请售后；终态入口按真实权益显示。
- 确认订单竖屏在商品下保留上一版五项租号权益，并在套餐与支付方式之间展示游戏原价和订单金额；横屏左侧展示商品与五项租号权益、右侧为套餐/金额/支付；无版本选择器，订单金额与需支付完全一致，3天无理由规则入口可用，右上角纯文字“租号介绍”打开三组常见问题问答。
- 首次进入会员中心展示 4 点“关于会员”说明，关闭后本次会话不再展示，任何交付物均无远程协助条款。
- 非本次租用游戏与退款风险均在进入启动/下单前正确拦截。
- 周卡续费按未过期顺延、已过期重算，重复回调不重复延长。
- 运营后台 7 个 Mac 模块已接入；6 页默认 APP 且可切 Mac，操作记录无端别 Tab。
- 普通 Demo、标注版、PRD、自动契约、客户端 36 个状态和后台 13 个状态一致。
- 只产生本地提交；不修改 Mac Demo/PRD，不 push、不 publish。
