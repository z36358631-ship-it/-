# 盖世游戏 APP 租号功能全量继承式重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 APP 租号 Demo 重构为“核心页 1:1 继承现有 APP、横屏任务页 1:1 继承 Mac、竖屏同组件同顺序、交易到售后全链路闭环”的可验收版本。

**Architecture:** 保留单文件 HTML 构建方式，以模板作为唯一业务源，普通版由构建脚本生成，标注版由同一业务脚本与样式同步。七个核心页使用现有 APP 页面组件并只挂载租号增量；所有任务页使用一个方向无关的组件树，横屏继承 Mac 布局，竖屏通过 CSS 折为单列；订单、会员、账号、使用单、凭据、临期和售后统一由实时 ViewModel 驱动。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js、Playwright Core、PNG 截图、Markdown PRD。

---

## 文件结构与责任

| 文件 | 责任 | 实施操作 |
|---|---|---|
| `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` | 唯一 UI、业务状态和交互源 | 全量重构核心页、任务页和闭环状态机 |
| `demos/APP租号功能/盖世游戏APP租号功能demo.html` | 可运行单文件产物 | 只由构建脚本生成，不手改 |
| `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` | 三栏交互标注文档 | 保留标注壳，业务样式和脚本从普通版同步 |
| `demos/APP租号功能/assets/source/*` | 现有 APP 页面和游戏素材基线 | 补齐社区、排行榜、搜索及缺失横屏参考素材 |
| `tools/build-app-rental-demo.mjs` | 素材内联、普通版生成、标注版同步 | 增加素材映射和同步完整性检查 |
| `tools/verify-app-rental-demo.mjs` | 继承、业务、安全、布局和标注自动验收 | 每个任务先写失败契约，再实现 |
| `tools/capture-app-rental-prd-screenshots.mjs` | 横竖屏状态截图 | 扩充全页面截图清单和敏感信息检查 |
| `public/prd/app-rental/*.png` | PRD 固定截图 | 重建后全量替换 |
| `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` | 开发与测试标准 PRD | 在功能验收后同步最终状态、异常和截图 |
| `docs/superpowers/specs/2026-08-03-gamehub-app-rental-mac-derived-layout-redesign.md` | 已确认设计基线 | 只读参考，不在实施阶段扩展范围 |

实施期间不得修改 `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html` 或 Mac PRD。

## 统一状态和接口命名

后续任务统一使用以下对象和函数，避免同义字段漂移：

```js
const CORE_SCREENS = new Set(['home', 'play', 'community', 'ranking', 'library', 'profile', 'search']);
const TASK_SCREENS = new Set([
  'detail', 'checkout', 'membership', 'member-library',
  'orders', 'order-detail', 'steam-login', 'after-sales',
]);

const ORDER_TRANSITIONS = Object.freeze({
  pending: new Set(['cancelled', 'allocating']),
  allocating: new Set(['active', 'refunding']),
  active: new Set(['after-sales', 'ended']),
  'after-sales': new Set(['active', 'refunding', 'ended']),
  refunding: new Set(['refunded']),
  cancelled: new Set(),
  refunded: new Set(),
  ended: new Set(),
});

function transitionOrder(order, nextStatus) {
  if (!order || !ORDER_TRANSITIONS[order.status]?.has(nextStatus)) return false;
  order.status = nextStatus;
  order.updatedAt = Date.now();
  return true;
}
```

统一 ViewModel 结构如下；实施时用真实种子数据替换空数组，但不得改字段名：

```js
const state = {
  orientation: 'portrait',
  screen: 'home',
  selectedGameId: 'shadow-blade-zero',
  routeContext: { sourceRoute: 'home', sourceParams: {}, sourceScrollTop: 0, taskStack: [] },
  personal: { ownedGameIds: new Set(), installedGameIds: new Set() },
  permanent: { gameIds: new Set() },
  checkout: {
    version: 'steam-standard',
    selectedSku: 'trial',
    paymentMethod: 'alipay',
    priceVersion: 'APP-PRICE-2026-08-04',
    pendingOrderId: null,
    paymentSubmitCount: 0,
    allocationSubmitCount: 0,
  },
  orders: { items: [], selectedOrderId: null, filter: 'all', query: '', listScrollTop: 0 },
  accounts: [],
  usages: [],
  membership: {
    status: 'none',
    planId: null,
    expireAt: null,
    purchases: [],
    activeUsageId: null,
  },
  login: {
    oneClickStatus: 'idle',
    oneClickAttempts: 0,
    oneClickShouldSucceed: true,
    authorizedUsageId: null,
    requiresGuard: false,
    guardSequence: 0,
    guardCode: null,
    guardExpiresAt: null,
    guardUsageId: null,
  },
  expiry: { reminderUsageId: null, reminderOpen: false, guardOpen: false, takeover: null },
  afterSales: { items: [], replacement: null },
  refundRules: { version: 'REFUND-72H-30M-V1' },
  networkAvailable: true,
};
```

公开测试接口保持：`setOrientation`、`navigate`、`taskBack`、`setSelectedGame`、`snapshot`。新增闭环接口统一使用：`createPendingGameOrder`、`confirmGamePayment`、`resolveAllocation`、`confirmMembershipPayment`、`attemptOneClickLogin`、`submitSteamLogin`、`getCredentialAccess`、`crossExpiryThreshold`、`handleRentalT0`、`submitAfterSales`、`requestReplacement`。

---

### Task 1: 建立全量重构失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加核心页继承与可达性断言**

在现有 Playwright 主流程中加入：

```js
const coreScreens = ['home', 'play', 'community', 'ranking', 'library', 'profile', 'search'];
for (const orientation of ['portrait', 'landscape']) {
  for (const screen of coreScreens) {
    await page.evaluate(({ orientation, screen }) => {
      window.__appRentalDemo.setOrientation(orientation);
      window.__appRentalDemo.navigate(screen);
    }, { orientation, screen });
    const result = await page.locator('#appRentalDemo').evaluate((root) => ({
      screen: root.dataset.screen,
      shell: root.querySelector('.device')?.dataset.shell,
      baseline: root.querySelector('[data-app-baseline]')?.dataset.appBaseline,
      stub: Boolean(root.querySelector('.stub-panel, .landscape-stub')),
      incrementCount: root.querySelectorAll('[data-rental-increment]').length,
    }));
    assert.equal(result.screen, screen, `${orientation} ${screen} 路由错误`);
    assert.equal(result.shell, 'core', `${orientation} ${screen} 未使用 core-shell`);
    assert.equal(result.baseline, screen, `${orientation} ${screen} 缺少 APP 基线标识`);
    assert.equal(result.stub, false, `${orientation} ${screen} 仍为占位页`);
    assert(result.incrementCount > 0, `${orientation} ${screen} 缺少租号增量挂载点`);
  }
}
```

- [ ] **Step 2: 增加任务页统一组件和订单拆页断言**

```js
const taskScreens = ['detail', 'checkout', 'membership', 'member-library', 'orders', 'order-detail', 'steam-login', 'after-sales'];
for (const screen of taskScreens) {
  const orders = [];
  for (const orientation of ['portrait', 'landscape']) {
    await page.evaluate(({ orientation, screen }) => {
      window.__appRentalDemo.setOrientation(orientation);
      window.__appRentalDemo.navigate(screen);
    }, { orientation, screen });
    orders.push(await page.locator('[data-component-order]').getAttribute('data-component-order'));
  }
  assert.equal(orders[0], orders[1], `${screen} 横竖屏组件顺序不一致`);
}

await page.evaluate(() => {
  window.__appRentalDemo.setOrientation('landscape');
  window.__appRentalDemo.navigate('orders');
});
assert.equal(await page.locator('[data-layout="order-list-page"]').count(), 1, '横屏缺少独立订单列表页');
assert.equal(await page.locator('.order-detail-pane, .order-master-detail').count(), 0, '横屏订单列表仍包含详情栏');
await page.locator('[data-order-id]').first().click();
assert.equal(await page.evaluate(() => window.__appRentalDemo.snapshot().screen), 'order-detail', '横屏订单未进入独立详情页');
```

- [ ] **Step 3: 增加业务闭环总断言名称**

将后续各任务的检查分组预注册为：

```js
const REQUIRED_GROUPS = Object.freeze([
  'CORE_INHERITANCE',
  'TASK_INHERITANCE',
  'ORDER_SPLIT',
  'TRANSACTION_CLOSED_LOOP',
  'MEMBERSHIP_CLOSED_LOOP',
  'CREDENTIAL_SECURITY',
  'EXPIRY_CLOSED_LOOP',
  'AFTER_SALES_CLOSED_LOOP',
]);
```

每组完成时输出 `${group} n/n PASS`；最终读取捕获的输出，断言八组名称全部出现。

- [ ] **Step 4: 运行测试确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 在 `community` 或 `search` 占位、横屏订单主从结构、组件顺序差异处失败；既有脚本无语法错误。

- [ ] **Step 5: 提交失败契约**

```powershell
git add -- tools/verify-app-rental-demo.mjs
git commit -m "test(app-rental): define full inherited rebuild contract"
```

---

### Task 2: 1:1 还原七个 APP 核心页并挂载租号增量

**Files:**
- Create: `demos/APP租号功能/assets/source/portrait-community.jpg`
- Create: `demos/APP租号功能/assets/source/portrait-ranking.jpg`
- Create: `demos/APP租号功能/assets/source/portrait-search.jpg`
- Create: `demos/APP租号功能/assets/source/landscape-home.jpg`
- Create: `demos/APP租号功能/assets/source/landscape-community.jpg`
- Create: `demos/APP租号功能/assets/source/landscape-ranking.jpg`
- Create: `demos/APP租号功能/assets/source/landscape-profile.jpg`
- Create: `demos/APP租号功能/assets/source/landscape-search.jpg`
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 导入已确认的现有 APP 页面参考图**

从产品已确认的现有 APP 页面导出原尺寸 JPG，使用上方固定文件名。每张参考图必须是对应页面的真实现状，不使用当前 Demo 合成页面截图，不把整张参考图直接作为可交互页面背景。

- [ ] **Step 2: 将新素材加入构建映射**

在 `tools/build-app-rental-demo.mjs` 的 `assets` 中加入：

```js
APP_PORTRAIT_COMMUNITY: path.join(sourceAssetDir, 'portrait-community.jpg'),
APP_PORTRAIT_RANKING: path.join(sourceAssetDir, 'portrait-ranking.jpg'),
APP_PORTRAIT_SEARCH: path.join(sourceAssetDir, 'portrait-search.jpg'),
APP_LANDSCAPE_HOME: path.join(sourceAssetDir, 'landscape-home.jpg'),
APP_LANDSCAPE_COMMUNITY: path.join(sourceAssetDir, 'landscape-community.jpg'),
APP_LANDSCAPE_RANKING: path.join(sourceAssetDir, 'landscape-ranking.jpg'),
APP_LANDSCAPE_PROFILE: path.join(sourceAssetDir, 'landscape-profile.jpg'),
APP_LANDSCAPE_SEARCH: path.join(sourceAssetDir, 'landscape-search.jpg'),
```

- [ ] **Step 3: 建立唯一核心页分发器**

在模板中使用现有 APP 组件分别实现七页，统一通过以下分发器输出基线标识：

```js
const CORE_RENDERERS = Object.freeze({
  home: renderAppHome,
  play: renderAppPlay,
  community: renderAppCommunity,
  ranking: renderAppRanking,
  library: renderAppLibrary,
  profile: renderAppProfile,
  search: renderAppSearch,
});

function renderCoreContent(screen) {
  const renderer = CORE_RENDERERS[screen];
  if (!renderer) throw new Error(`缺少核心页渲染器：${screen}`);
  return `<section data-app-baseline="${screen}">${renderer()}</section>`;
}
```

每个 `renderAppXxx` 按参考图逐模块还原现有页面。原模块外新增内容只允许带 `data-rental-increment`，例如：

```js
function renderRentalIncrement(gameId) {
  const model = getRentalStatusModel(gameId);
  if (!model.visible) return '<span data-rental-increment="hidden" hidden></span>';
  return `<button class="rental-status-entry" type="button" data-rental-increment="status" data-action="open-game-detail" data-game-id="${gameId}"><span>${model.label}</span><span aria-hidden="true">›</span></button>`;
}
```

- [ ] **Step 4: 接通社区和搜索路由**

社区必须渲染真实信息流，不再落入 `renderStub`。核心页搜索框统一使用：

```html
<button class="search-box" type="button" data-action="navigate" data-screen="search" aria-label="搜索游戏">
  <span aria-hidden="true">⌕</span><span>搜索游戏</span>
</button>
```

搜索页输入使用 `data-search-query`，结果卡使用 `data-action="open-game-detail"` 和明确 `data-game-id`；返回恢复查询与滚动位置。

- [ ] **Step 5: 构建并运行核心页验证**

Run: `node tools/build-app-rental-demo.mjs`

Expected: 输出 `BUILD` 与 `SYNC`，没有素材缺失或占位符错误。

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `CORE_INHERITANCE 14/14 PASS`；七页横竖屏无占位页、入口可达、原导航保留。

- [ ] **Step 6: 提交核心页继承**

```powershell
git add -- "demos/APP租号功能/assets/source" "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): inherit existing app core pages"
```

---

### Task 3: 建立单一任务组件树和独立订单路由

**Files:**
- Reference: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 先写组件顺序与订单拆页失败测试**

为每个任务页断言 `data-component-order`：

```js
const EXPECTED_COMPONENT_ORDER = Object.freeze({
  detail: 'header,game,entitlement,primary,details',
  checkout: 'header,game,sku,price,payment,benefits',
  membership: 'header,identity,plans,payment,library,faq',
  'member-library': 'header,status,games,faq',
  orders: 'header,filters,list',
  'order-detail': 'header,game,progress,summary,actions',
  'steam-login': 'header,credentials,submit,guard,qr',
  'after-sales': 'header,order,types,description,submit,result',
});
```

横竖屏逐页读取属性并与同一值比较。横屏 `orders` 不得出现 `.order-detail-pane`，横屏 `order-detail` 不得出现 `.order-list-pane`。

- [ ] **Step 2: 用单一任务页分发器替换方向渲染器**

```js
const TASK_RENDERERS = Object.freeze({
  detail: renderDetailPage,
  checkout: renderCheckoutPage,
  membership: renderMembershipPage,
  'member-library': renderMemberLibraryPage,
  orders: renderOrderListPage,
  'order-detail': renderOrderDetailPage,
  'steam-login': renderSteamLoginPage,
  'after-sales': renderAfterSalesPage,
});

function renderTaskContent(screen) {
  const renderer = TASK_RENDERERS[screen];
  if (!renderer) throw new Error(`缺少任务页渲染器：${screen}`);
  return renderer();
}
```

删除由 `renderPortraitXxx` 和 `renderLandscapeXxx` 分别拼装同一任务页的业务分支。方向包装函数只输出 `.device.portrait` 或 `.device.landscape`。

- [ ] **Step 3: 按 Mac 基线输出同一组件顺序**

每个页面根节点包含固定顺序：

```js
function taskPage(screen, order, content) {
  return `<section class="task-page task-page--${screen}" data-layout="${screen === 'orders' ? 'order-list-page' : screen === 'order-detail' ? 'order-detail-page' : `${screen}-page`}" data-component-order="${order}">${content}</section>`;
}
```

页面内部复制 Mac 已确认模块的名称、字段、文案、CTA 和弹层关系；不得复制 Mac 管理后台模块。

- [ ] **Step 4: 实现订单独立跳转和滚动恢复**

```js
function openOrderDetail(orderId) {
  if (!getOrderById(orderId)) return false;
  state.orders.listScrollTop = readTaskScrollTop();
  state.orders.selectedOrderId = orderId;
  navigate('order-detail');
  return true;
}

function returnToOrderList() {
  navigate('orders', { rememberSource: false, replaceTask: true });
  restoreTaskScrollTop(state.orders.listScrollTop);
}
```

点击所有订单卡统一调用 `openOrderDetail`；横屏不得渲染列表与详情双栏。

- [ ] **Step 5: 用 CSS 表达方向差异**

横屏按 Mac 原布局使用多列，竖屏同 DOM 顺序折为单列：

```css
.task-page { min-height: 100%; }
.device.landscape .task-page__body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .72fr); gap: 16px; }
.device.portrait .task-page__body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.device.landscape [data-layout="order-list-page"],
.device.landscape [data-layout="order-detail-page"] { display: block; width: 100%; }
```

- [ ] **Step 6: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `TASK_INHERITANCE` 和 `ORDER_SPLIT` 全部通过；横竖屏同页 `data-component-order` 完全一致。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "refactor(app-rental): unify task components and split order routes"
```

---

### Task 4: 统一游戏身份和实时权益决策

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加游戏身份与 CTA 失败测试**

```js
const cards = await page.locator('[data-game-id]').evaluateAll((nodes) => nodes.map((node) => ({
  gameId: node.dataset.gameId,
  name: node.querySelector('[data-game-name]')?.textContent.trim(),
  assetGameId: node.querySelector('[data-asset-game-id]')?.dataset.assetGameId,
})));
assert(cards.every((card) => card.gameId && card.name && card.assetGameId === card.gameId), '存在游戏文字与素材错配');
```

再分别设置个人拥有、有效租赁、永久、有效会员、首次体验和普通租用状态，断言详情唯一主 CTA。

- [ ] **Step 2: 建立单一游戏目录**

```js
const GAME_CONTEXTS = Object.freeze([
  { id: 'shadow-blade-zero', name: '影之刃零', asset: 'home', crop: [584, 1656, 492, 240], memberLibrary: false },
  { id: 'slay-the-spire-2', name: 'Slay the Spire 2', asset: 'landscapeSteamLibrary', crop: [169, 297, 383, 224], memberLibrary: true },
  { id: 'the-forest', name: 'The Forest', asset: 'landscapeSteamLibrary', crop: [606, 297, 390, 224], memberLibrary: true },
  { id: 'chinese-parents', name: '中国式家长', asset: 'landscapeSteamLibrary', crop: [1049, 297, 390, 224], memberLibrary: true },
  { id: 'spiritfarer', name: 'Spiritfarer', asset: 'landscapeSteamLibrary', crop: [1486, 297, 383, 224], memberLibrary: true },
  { id: 'dont-starve', name: '饥荒', asset: 'landscapeSteamLibrary', crop: [1926, 297, 397, 224], memberLibrary: true },
]);
```

不再为同一 `gameId` 在发现页和会员库维护不同名称或素材。若要展示艾尔登法环，必须先导入与其一致的真实素材并新增独立记录。

- [ ] **Step 3: 用实时对象计算权益**

```js
function resolveEntitlementAction({ game, personal, activeUsage, permanent, membership, trialEligible }) {
  if (personal.owned && personal.installed) return { id: 'launch', label: '启动游戏' };
  if (personal.owned) return { id: 'download', label: '下载游戏' };
  if (activeUsage?.gameId === game.id && activeUsage.status === 'active') return { id: 'continue', label: '继续游戏' };
  if (permanent.gameIds.has(game.id)) return { id: 'launch', label: '启动游戏' };
  if (membership.active && game.memberLibrary) return { id: 'member-play', label: '会员畅玩' };
  if (trialEligible) return { id: 'trial', label: '立即首次体验' };
  return { id: 'rent', label: '确认租用' };
}
```

删除静态 `scenario → CTA` 决策；场景工具只能修改真实状态对象。

- [ ] **Step 4: 接通所有游戏入口**

所有核心页、会员库和订单“继续畅玩”按钮必须先调用 `setSelectedGame(gameId)`，再进入详情。`data-game-id`、页面标题、封面 `data-asset-game-id`、订单快照四者一致。

- [ ] **Step 5: 验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 所有游戏卡身份一致；六种权益状态的详情主 CTA 正确且只有一个。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "fix(app-rental): derive game actions from live entitlements"
```

---

### Task 5: 完成支付、取号和订单履约闭环

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 编写支付成功、失败、超时和网络恢复测试**

```js
const activeResult = await page.evaluate(() => {
  const order = window.__appRentalDemo.createPendingGameOrder();
  window.__appRentalDemo.confirmGamePayment(order.id);
  window.__appRentalDemo.resolveAllocation(order.id, { success: true });
  return window.__appRentalDemo.snapshot();
});
const activeOrder = activeResult.orders.items.find((order) => order.id === activeResult.orders.selectedOrderId);
const activeUsage = activeResult.usages.find((usage) => usage.id === activeOrder.usageId);
assert.equal(activeOrder.status, 'active');
assert.equal(activeResult.screen, 'order-detail');
assert.equal(activeOrder.id, activeUsage.orderId);
assert.equal(activeOrder.accountId, activeUsage.accountId);
```

另测：取号失败进入 `refunding`；支付截止时间后进入 `cancelled`；离线查询保留同一订单号；重复支付和重复取号计数保持1。

- [ ] **Step 2: 实现订单创建和状态转换**

```js
function createPendingGameOrder() {
  const existing = state.orders.items.find((order) => order.id === state.checkout.pendingOrderId && order.status === 'pending');
  if (existing) return structuredClone(existing);
  const now = Date.now();
  const game = getSelectedGame();
  const offer = getSelectedOffer();
  const order = {
    id: nextOrderId(now),
    gameId: game.id,
    gameName: game.name,
    version: state.checkout.version,
    sku: offer.sku,
    durationLabel: offer.durationLabel,
    durationMs: offer.durationMs,
    amount: offer.amount,
    priceVersion: state.checkout.priceVersion,
    refundRuleVersion: state.refundRules.version,
    paymentMethod: state.checkout.paymentMethod,
    status: 'pending',
    createdAt: now,
    paymentDeadline: now + 30 * 60 * 1000,
    paidAt: null,
    expireAt: null,
    playedMinutes: 0,
    accountId: null,
    usageId: null,
  };
  state.orders.items.unshift(order);
  state.checkout.pendingOrderId = order.id;
  return structuredClone(order);
}

function getOrderById(orderId) {
  return state.orders.items.find((order) => order.id === orderId) || null;
}

function getUsageById(usageId) {
  return state.usages.find((usage) => usage.id === usageId) || null;
}

function reserveCompatibleAccount(gameId, version, excludedAccountId = null) {
  const account = state.accounts.find((item) => item.id !== excludedAccountId
    && item.gameId === gameId
    && item.version === version
    && item.status === 'rentable'
    && item.supportsManualLogin
    && item.supportsGuardCode
    && item.supportsSessionRevoke);
  if (!account) return null;
  account.status = 'reserved';
  return account;
}

function createRentalUsage(order, account, benefitType = 'rental') {
  const usage = {
    id: `USE-${order.id}-${state.usages.length + 1}`,
    orderId: order.id,
    accountId: account.id,
    gameId: order.gameId,
    version: order.version,
    benefitType,
    status: 'active',
    startedAt: Date.now(),
    expireAt: order.expireAt,
    expiry15RemindedAt: null,
    t0HandledAt: null,
    sessionRevoked: false,
    shortAuthValid: true,
  };
  state.usages.push(usage);
  account.status = 'occupied';
  account.orderId = order.id;
  return usage;
}

function releaseAccount(accountId, orderId) {
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account || account.orderId !== orderId) return false;
  account.status = 'rentable';
  account.orderId = null;
  return true;
}

function releaseUsage(usageId, reason) {
  const usage = getUsageById(usageId);
  if (!usage || usage.status !== 'active') return false;
  usage.status = 'ended';
  usage.endedAt = Date.now();
  usage.endReason = reason;
  usage.sessionRevoked = true;
  usage.shortAuthValid = false;
  return releaseAccount(usage.accountId, usage.orderId);
}
```

- [ ] **Step 3: 实现支付和取号幂等闭环**

```js
function confirmGamePayment(orderId) {
  const order = getOrderById(orderId);
  if (!order || order.status !== 'pending' || Date.now() >= order.paymentDeadline) return false;
  if (!transitionOrder(order, 'allocating')) return false;
  order.paidAt = Date.now();
  order.expireAt = order.paidAt + order.durationMs;
  order.paymentIdempotencyKey = `PAY-${order.id}`;
  state.checkout.paymentSubmitCount += 1;
  renderApp();
  return true;
}

function resolveAllocation(orderId, { success }) {
  const order = getOrderById(orderId);
  if (!order || order.status !== 'allocating') return false;
  state.checkout.allocationSubmitCount += 1;
  const account = success ? reserveCompatibleAccount(order.gameId, order.version) : null;
  if (!success || !account) {
    transitionOrder(order, 'refunding');
    order.refundProgress = '申请中';
    navigate('order-detail', { rememberSource: false, replaceTask: true });
    return true;
  }
  transitionOrder(order, 'active');
  order.accountId = account.id;
  const usage = createRentalUsage(order, account);
  order.usageId = usage.id;
  state.orders.selectedOrderId = order.id;
  navigate('order-detail', { rememberSource: false, replaceTask: true });
  return true;
}
```

- [ ] **Step 4: 实现支付超时、价格变化和网络恢复 UI**

倒计时到0调用 `expirePendingOrder(order.id)` 并显示已取消；价格变化展示前后价格并重建订单快照；网络异常只显示“重新查询”，不得调用创单或支付函数。

- [ ] **Step 5: 运行闭环验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `TRANSACTION_CLOSED_LOOP` 全部通过；用户点击支付后最终进入活动订单或自动退款，不停留在禁用按钮页。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): close payment and allocation lifecycle"
```

---

### Task 6: 完成会员购买和会员使用单闭环

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 编写开通、续费、升级、永久禁购和会员畅玩测试**

测试顺序：未开通购买月度→同套餐续费顺延30天→购买年度再顺延365天→升级永久→再次购买被拒；有效会员从会员库启动游戏创建 `member-use`，切换第二款游戏后旧使用单结束且旧账号释放。

```js
const result = await page.evaluate(() => {
  const first = window.__appRentalDemo.confirmMembershipPayment('monthly');
  const firstExpireAt = window.__appRentalDemo.snapshot().membership.expireAt;
  const renewal = window.__appRentalDemo.confirmMembershipPayment('monthly');
  const renewedExpireAt = window.__appRentalDemo.snapshot().membership.expireAt;
  return { first, renewal, firstExpireAt, renewedExpireAt };
});
assert(result.first && result.renewal);
assert.equal(result.renewedExpireAt - result.firstExpireAt, 30 * 86400000);
```

- [ ] **Step 2: 实现会员购买**

```js
const MEMBER_PLANS = Object.freeze([
  { id: 'monthly', name: '月度', durationDays: 30, price: 129, version: 'MEMBER-MONTHLY-V1' },
  { id: 'annual', name: '年度', durationDays: 365, price: 499, version: 'MEMBER-ANNUAL-V1' },
  { id: 'permanent', name: '永久', durationDays: null, price: 399, version: 'MEMBER-PERMANENT-V1' },
]);

function confirmMembershipPayment(planId, paidAt = Date.now()) {
  const plan = MEMBER_PLANS.find((item) => item.id === planId);
  if (!plan || state.membership.status === 'permanent') return false;
  const previousExpireAt = state.membership.expireAt;
  if (plan.id === 'permanent') {
    state.membership.status = 'permanent';
    state.membership.planId = 'permanent';
    state.membership.expireAt = null;
  } else {
    const base = Number.isFinite(previousExpireAt) && previousExpireAt > paidAt ? previousExpireAt : paidAt;
    state.membership.status = plan.id === 'monthly' ? 'monthly-active' : 'annual-active';
    state.membership.planId = plan.id;
    state.membership.expireAt = base + plan.durationDays * 86400000;
  }
  state.membership.purchases.push({
    id: `MEM-${state.membership.purchases.length + 1}`,
    planId: plan.id,
    planName: plan.name,
    planVersion: plan.version,
    price: plan.price,
    previousExpireAt,
    paidAt,
    expireAt: state.membership.expireAt,
  });
  renderApp();
  return true;
}
```

- [ ] **Step 3: 约束会员套餐 UI**

永久会员时三张套餐不可点击，支付主按钮禁用且显示“永久会员无需重复购买”。月度/年度有效时 CTA 分别显示“续费月度/年度”或“升级永久会员”。

- [ ] **Step 4: 实现会员使用单切换**

```js
function startMemberGame(gameId) {
  const game = getGameContext(gameId);
  if (!isMembershipActive() || !game?.memberLibrary) return false;
  const current = getActiveMemberUsage();
  if (current?.gameId === gameId) return current.id;
  if (current && !releaseUsage(current.id, 'member-switch')) return false;
  const account = reserveCompatibleAccount(gameId, state.checkout.version);
  if (!account) return false;
  const usage = createMemberUsage(game, account, state.membership);
  state.membership.activeUsageId = usage.id;
  state.orders.selectedOrderId = usage.orderId;
  navigate('order-detail');
  return usage.id;
}

function isMembershipActive(now = Date.now()) {
  if (state.membership.status === 'permanent') return true;
  return ['monthly-active', 'annual-active'].includes(state.membership.status)
    && Number(state.membership.expireAt) > now;
}

function getActiveMemberUsage() {
  const usage = getUsageById(state.membership.activeUsageId);
  return usage?.status === 'active' ? usage : null;
}

function createMemberUsage(game, account, membership) {
  const now = Date.now();
  const order = {
    id: `MEMBER-USE-${state.orders.items.length + 1}`,
    gameId: game.id,
    gameName: game.name,
    version: state.checkout.version,
    sku: 'member-use',
    durationLabel: membership.status === 'permanent' ? '永久会员有效' : '会员有效期内',
    amount: 0,
    status: 'active',
    createdAt: now,
    paidAt: null,
    expireAt: membership.status === 'permanent' ? now + 100 * 365 * 86400000 : membership.expireAt,
    accountId: account.id,
    usageId: null,
    benefitType: 'membership',
  };
  state.orders.items.unshift(order);
  const usage = createRentalUsage(order, account, 'membership');
  order.usageId = usage.id;
  return usage;
}
```

- [ ] **Step 5: 验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `MEMBERSHIP_CLOSED_LOOP` 全部通过；会员订单产生权益，永久禁购，会员畅玩产生使用单并安全切换。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): close membership purchase and usage lifecycle"
```

---

### Task 7: 重建订单操作、登录方式和凭据安全

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 编写各订单状态操作测试**

断言：待支付有去支付/取消；取号中有重新查询；进行中精确显示继续游戏、登录信息、继续畅玩、申请售后；退款中显示退款进度；已结束显示详情和再次购买。

- [ ] **Step 2: 编写凭据绑定和清理失败测试**

```js
const access = await page.evaluate(() => {
  const active = window.__appRentalDemo.snapshot().order;
  return window.__appRentalDemo.getCredentialAccess(active.id);
});
assert.equal(access.ok, true);
assert.equal(access.orderId, access.boundOrderId);
assert.equal(access.accountId, access.boundAccountId);
assert.equal(access.usageId, access.boundUsageId);
```

测试错误订单、结束订单和绑定变化均不能查看；退后台、T0、退款和换号后明文与 Guard 清空。

- [ ] **Step 3: 实现订单绑定凭据访问**

```js
function getCredentialAccess(orderId) {
  const order = getOrderById(orderId);
  const usage = state.usages.find((item) => item.id === order?.usageId);
  const account = state.accounts.find((item) => item.id === order?.accountId);
  const ok = Boolean(order?.status === 'active'
    && usage?.status === 'active'
    && usage.orderId === order.id
    && usage.accountId === account?.id
    && account.orderId === order.id);
  return {
    ok,
    orderId,
    accountId: account?.id || null,
    usageId: usage?.id || null,
    boundOrderId: usage?.orderId || null,
    boundAccountId: usage?.accountId || null,
    boundUsageId: order?.usageId || null,
  };
}
```

- [ ] **Step 4: 实现一键和手动登录校验**

```js
function attemptOneClickLogin(orderId) {
  const access = getCredentialAccess(orderId);
  if (!access.ok) return { ok: false, reason: 'credential-access-denied' };
  if (!state.networkAvailable) return { ok: false, reason: 'network-offline' };
  state.login.oneClickAttempts += 1;
  const ok = state.login.oneClickShouldSucceed;
  state.login.oneClickStatus = ok ? 'success' : 'failed';
  renderApp();
  return { ok, reason: ok ? '' : 'launcher-unavailable' };
}

function submitSteamLogin(orderId, accountName, password) {
  const access = getCredentialAccess(orderId);
  const account = state.accounts.find((item) => item.id === access.accountId);
  if (!access.ok || accountName !== account.loginName || password !== account.loginPassword) return false;
  state.login.requiresGuard = true;
  state.login.authorizedUsageId = access.usageId;
  renderApp();
  return true;
}
```

租号登录页“记住我”默认未勾选。

- [ ] **Step 5: 实现使用单级 Guard**

```js
function issueGuardCode(orderId) {
  const access = getCredentialAccess(orderId);
  if (!access.ok || state.login.authorizedUsageId !== access.usageId) return false;
  const now = Date.now();
  const sequence = state.login.guardSequence + 1;
  state.login.guardSequence = sequence;
  state.login.guardCode = String(10000 + ((now + sequence * 7919) % 90000));
  state.login.guardExpiresAt = now + 30 * 1000;
  state.login.guardUsageId = access.usageId;
  renderApp();
  return true;
}
```

未过期重复打开复用；刷新先清空旧值再调用 `issueGuardCode`，新值必须不同。`clearSensitiveState` 清空表单密码、可见性、Guard 和授权使用单。

- [ ] **Step 6: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `CREDENTIAL_SECURITY` 全部通过；订单拆页后的全部状态操作可用，一键登录有成功/失败，任意非空凭据不能获得 Guard。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): bind login credentials to active usage"
```

---

### Task 8: 完成15分钟提醒、T0和权益接管

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 编写跨阈值、幂等和到期接管测试**

依次推进剩余时间16分钟→14分59秒，断言提醒出现一次；旋转、关闭、再次推进5分钟和1分钟均不重复。T0 后断言原使用单结束、账号释放、短授权撤销和敏感信息清除。分别测试个人拥有、单游戏永久、有效会员、新活动订单、无权益和离线校验。

- [ ] **Step 2: 实现跨阈值提醒**

```js
function crossExpiryThreshold(usageId, previousRemainingMs, currentRemainingMs) {
  const usage = getUsageById(usageId);
  const threshold = 15 * 60 * 1000;
  if (!usage || usage.expiry15RemindedAt) return false;
  if (!(previousRemainingMs > threshold && currentRemainingMs <= threshold && currentRemainingMs > 0)) return false;
  usage.expiry15RemindedAt = Date.now();
  state.expiry.reminderUsageId = usage.id;
  state.expiry.reminderOpen = true;
  renderApp();
  return true;
}
```

删除依赖 `minutes === 15` 的触发条件，不增加5分钟或1分钟提醒。

- [ ] **Step 3: 实现 T0 幂等结束**

```js
function handleRentalT0(usageId) {
  const usage = getUsageById(usageId);
  if (!usage || usage.t0HandledAt) return false;
  usage.t0HandledAt = Date.now();
  usage.status = 'ended';
  usage.sessionRevoked = true;
  usage.shortAuthValid = false;
  releaseAccount(usage.accountId, usage.orderId);
  const order = getOrderById(usage.orderId);
  if (order?.status === 'active') transitionOrder(order, 'ended');
  clearSensitiveState('t0');
  state.expiry.reminderOpen = false;
  state.expiry.takeover = resolvePostExpiryTakeover(usage.gameId, usage.id);
  state.expiry.guardOpen = !state.expiry.takeover;
  renderApp();
  return true;
}
```

- [ ] **Step 4: 实现实时权益接管**

`resolvePostExpiryTakeover` 按个人拥有→单游戏永久→有效会员→同游戏新活动订单检查；接管成功更新详情 ViewModel，不能保留原静态场景。无权益“继续畅玩”进入可购买详情，“立即结束”返回 `sourceRoute`。

- [ ] **Step 5: 验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `EXPIRY_CLOSED_LOOP` 全部通过；跨阈值一次提醒，T0一次释放，六种接管/拦截状态正确。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): close expiry and entitlement takeover flow"
```

---

### Task 9: 完成售后、退款和换号闭环

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 编写资格、退款和换号失败测试**

测试边界：支付后恰好72小时、30分钟可申请；超过任一边界禁用无理由并显示原因；履约类始终可选。提交退款后订单不再允许登录。换号有库存时旧账号释放且新账号绑定、使用单ID变化；无库存时原绑定保持不变；重复提交和重复换号幂等。

- [ ] **Step 2: 实现资格快照**

```js
function getNoReasonEligibility(order, now = Date.now()) {
  if (!order?.paidAt || !order.refundRuleVersion) return { eligible: false, reason: '订单缺少退款规则快照' };
  if (now - order.paidAt > 72 * 60 * 60 * 1000) return { eligible: false, reason: '已超过支付后72小时' };
  if (Number(order.playedMinutes) > 30) return { eligible: false, reason: '累计游玩超过30分钟' };
  if (order.status !== 'active') return { eligible: false, reason: '当前订单状态不支持3天无理由' };
  return { eligible: true, reason: '' };
}
```

- [ ] **Step 3: 实现退款状态流**

```js
function submitAfterSales({ orderId, type, description }) {
  const order = getOrderById(orderId);
  const existing = state.afterSales.items.find((item) => item.orderId === orderId && item.status !== 'closed');
  if (existing) return structuredClone(existing);
  if (!order || !description.trim()) return null;
  if (type === 'refund' && !getNoReasonEligibility(order).eligible) return null;
  if (!transitionOrder(order, 'after-sales')) return null;
  clearSensitiveState('after-sales');
  const ticket = {
    id: `AFTER-${order.id}`,
    orderId,
    type,
    description: description.trim(),
    status: 'submitted',
    refundStage: type === 'refund' ? '申请中' : null,
    createdAt: Date.now(),
  };
  state.afterSales.items.push(ticket);
  return structuredClone(ticket);
}
```

审核通过后将订单推进到 `refunding`，进度依次写入申请中、人工审核、原路退款、完成；完成时推进 `refunded` 并释放使用单和账号。

- [ ] **Step 4: 实现真实换号**

```js
function requestReplacement(orderId) {
  const order = getOrderById(orderId);
  const usage = getUsageById(order?.usageId);
  if (!order || !usage || !['active', 'after-sales'].includes(order.status)) return false;
  const nextAccount = findCompatibleFreeAccount(order.gameId, order.version, order.accountId);
  if (!nextAccount) {
    state.afterSales.replacement = { orderId, status: 'no-stock', preservedAccountId: order.accountId };
    renderApp();
    return false;
  }
  if (!releaseUsage(usage.id, 'replacement')) return false;
  const nextUsage = createRentalUsage(order, nextAccount);
  order.accountId = nextAccount.id;
  order.usageId = nextUsage.id;
  if (order.status === 'after-sales') transitionOrder(order, 'active');
  state.afterSales.replacement = { orderId, status: 'success', oldUsageId: usage.id, newUsageId: nextUsage.id };
  clearSensitiveState('replacement');
  renderApp();
  return true;
}
```

- [ ] **Step 5: 验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `AFTER_SALES_CLOSED_LOOP` 全部通过；退款真实改变订单，换号真实改变账号与使用单，无库存不破坏原绑定。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): close refund and replacement lifecycle"
```

---

### Task 10: 完成 Mac 横屏继承、竖屏同序适配和标注同步

**Files:**
- Reference: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加 Mac 模块签名和可读性测试**

为各横屏任务页断言规格中的 `data-component-order`、Mac 对应标题、字段、CTA 和弹层选择器；为横竖屏断言可见正文≥12px、按钮/输入≥44px、根容器无整体缩放、无横向溢出。

```js
const readability = await page.locator('.device').evaluate((root) => ({
  scaled: getComputedStyle(root).transform !== 'none',
  smallText: [...root.querySelectorAll('p, label, button, input, textarea')]
    .filter((node) => node.getBoundingClientRect().width > 0)
    .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) < 12).length,
  smallControls: [...root.querySelectorAll('button, input, textarea')]
    .filter((node) => node.getBoundingClientRect().width > 0)
    .filter((node) => node.getBoundingClientRect().height < 44).length,
  horizontalOverflow: root.scrollWidth > root.clientWidth,
}));
assert.deepEqual(readability, { scaled: false, smallText: 0, smallControls: 0, horizontalOverflow: false });
```

- [ ] **Step 2: 逐页对齐 Mac 横屏**

按 Mac 源文件逐页复制信息架构和文案到统一任务组件：详情、确认订单、会员、会员库、订单列表、订单详情、Steam 登录、登录信息、售后、15分钟提醒和到期 Guard。订单列表和详情只继承各自页面内容，不复制 Mac 同屏组合容器。

- [ ] **Step 3: 用 CSS 完成竖屏同序适配**

同一 `data-component-order` 在390×844下保持顺序；交易主按钮进入底部安全区；Steam 双栏折为单列；售后表单和结果连续纵向排列；任何方向规则不得使用 `order` CSS 属性改变语义顺序。

- [ ] **Step 4: 更新标注版说明**

保留左导航、中 Demo、右标注三栏。右侧数据与状态页明确写入：

```js
const INHERITANCE_RULES = Object.freeze([
  '七个核心页1:1继承现有APP，只增加租号增量',
  '横屏任务页1:1继承Mac模块、顺序、文案和操作',
  '竖屏复用同一组件树和同一模块顺序',
  '订单列表和订单详情横竖屏均为独立页面',
  '旋转不重复创单、支付、取号、授权、退款或换号',
]);
```

删除“横屏35%列表＋65%详情”等旧说明。

- [ ] **Step 5: 强化构建同步检查**

构建后分别提取普通版和标注版的业务脚本区，断言 `CORE_SCREENS`、`TASK_RENDERERS`、`ORDER_TRANSITIONS` 和公开接口签名均存在；标注版不得保留旧业务脚本副本。

- [ ] **Step 6: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 八组重构契约和 `ANNOTATION` 全部通过；横屏订单拆页；横竖屏组件顺序一致；页面无缩放和可读性问题。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" "demos/APP租号功能/盖世游戏APP租号功能-标注版.html" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs
git commit -m "refactor(app-rental): align mac tasks and shared portrait layout"
```

---

### Task 11: 重建全页面截图并同步 PRD

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Replace: `public/prd/app-rental/*.png`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Test: `tools/capture-app-rental-prd-screenshots.mjs`

- [ ] **Step 1: 将截图清单扩为18个页面/状态的横竖屏**

截图键固定为：

```js
const FULL_PAGE_SHOTS = Object.freeze([
  'home', 'play', 'community', 'ranking', 'library', 'profile', 'search',
  'detail', 'checkout', 'membership', 'member-library', 'orders', 'order-detail',
  'steam-login', 'login-info', 'expiry-15m', 'expired-guard', 'after-sales',
]);
```

每个键生成 `portrait` 和 `landscape`，合计36张 PNG。弹层状态截图先创建活动订单，再打开对应登录信息、临期或到期状态。

- [ ] **Step 2: 增加截图前置安全检查**

```js
const sensitivePattern = /G@meHub|gh_rental|\b\d{5}\b/;
if (!['login-info', 'steam-login'].includes(shot.key)) {
  const text = await page.locator('#appRentalDemo').innerText();
  assert(!sensitivePattern.test(text), `${shot.key} 截图泄露敏感信息`);
}
```

登录相关截图保持账号密码掩码，Guard 不使用真实或可复用值。

- [ ] **Step 3: 生成并原尺寸目检36张截图**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`；竖屏390×844、横屏874×402、文件头为PNG、每张大于20KB。

逐张检查：核心页与 APP 基线一致；任务页横屏与 Mac 一致；订单拆页；竖屏同序；无素材错配、遮挡、占位或不可达入口。

- [ ] **Step 4: 更新 PRD 页面表和闭环规则**

在 APP PRD 中替换旧截图和旧订单主从描述，明确七个核心页继承、任务页 Mac 继承、订单拆页、支付履约、会员、凭据、15分钟、T0、退款和换号验收。图片只使用截图提交后的固定40位 Git SHA，不使用分支地址或相对路径。

- [ ] **Step 5: 校验 PRD 与截图引用**

Run: `rg -n -e '35%' -e '65%' -e '主从' -e '当前入口已连通' -e '后续补齐' "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"`

Expected: 不存在横屏订单主从、占位页或未完成表述。

- [ ] **Step 6: 提交截图和 PRD**

```powershell
git add -- tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
git commit -m "docs(app-rental): refresh full rebuild prd evidence"
```

---

### Task 12: 最终回归和范围审计

**Files:**
- Modify if a failing check requires it: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Regenerate if required: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Modify if required: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Test: `tools/verify-app-rental-demo.mjs`
- Test: `tools/capture-app-rental-prd-screenshots.mjs`

- [ ] **Step 1: 运行构建**

Run: `node tools/build-app-rental-demo.mjs`

Expected: 普通版生成、标注版同步成功，无缺失素材和未替换占位符。

- [ ] **Step 2: 运行全量自动验证**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 所有既有分组、八个全量重构分组和标注检查全部 PASS，页面脚本错误为0。

- [ ] **Step 3: 运行全量截图验证**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`。

- [ ] **Step 4: 审计静态场景、占位页和旧主从结构**

Run: `rg -n -e 'renderStub' -e 'landscape-stub' -e 'order-master-detail' -e 'order-detail-pane' -e '当前入口已连通' -e 'data-action="feedback"' "demos/APP租号功能/盖世游戏APP租号功能demo.template.html"`

Expected: 核心/任务路由不存在占位渲染；订单不存在主从容器；业务 CTA 不使用纯反馈动画。允许非业务图标按钮保留轻反馈时，必须逐项记录在测试白名单。

- [ ] **Step 5: 审计修改范围**

Run: `git diff --name-only -- "demos/APP租号功能" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求"`

Expected: 只包含 APP 租号 Demo、APP 素材、构建/验证/截图工具、APP 截图和 APP PRD；Mac Demo 与 Mac PRD 没有变化。

- [ ] **Step 6: 提交最终回归修正**

```powershell
git add -- "demos/APP租号功能" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求"
git commit -m "fix(app-rental): complete inherited rebuild acceptance"
```

## 计划自查

- 规格覆盖：七个核心页继承、横屏 Mac 继承、竖屏同组件同序、订单拆页、支付履约、会员、凭据、15分钟、T0、退款和换号均有独立任务与失败契约。
- 文件边界：实施只修改 APP 租号相关文件，Mac Demo 和 Mac PRD 只读。
- 类型一致：订单统一使用 `pending → allocating → active/refunding → ended/refunded`；凭据统一绑定 `orderId + accountId + usageId`。
- 路由一致：`orders` 和 `order-detail` 横竖屏均为独立路由，不存在方向特例。
- 提醒一致：只在首次跨入≤15分钟时提醒一次，不实现5分钟或1分钟提醒。
- 证据一致：自动验证、36张原尺寸截图和 PRD 使用同一构建产物。
