# 盖世游戏 APP 租号与 CDKEY 视觉收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认设计修正 APP 租号 Demo，使首页与搜索只展示“已租号 / 可畅玩 / ¥X.X · 租号 / 无新增信息”之一，详情与确认订单复用 CDKEY 视觉骨架，同时保持订单中心既定范围和租号业务闭环。

**Architecture:** 模板仍是唯一业务与 UI 源，普通 Demo、标注版和截图均由现有工具生成。新增纯函数 `resolveGameDisplayModel(gameId, userContext)`，首页、搜索和详情只消费同一结果；详情、确认订单和订单中心共享 CDKEY 风格令牌，但不得引入 CDKEY 的卡密、激活、发货和购买状态机。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js、Playwright Core、PNG 截图、Markdown PRD、taskctl。

---

## 文件结构与责任

| 文件 | 责任 | 本次操作 |
|---|---|---|
| `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` | 唯一业务状态、展示模型、页面结构和视觉样式源 | 新增统一展示模型，修改首页、搜索、详情、确认订单和订单视觉 |
| `demos/APP租号功能/盖世游戏APP租号功能demo.html` | 可直接运行的单文件 Demo | 只由构建脚本重新生成，不手工编辑 |
| `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` | 左导航、中 Demo、右说明的评审版本 | 保留壳层；由构建脚本同步业务样式和脚本，并更新右侧说明 |
| `tools/build-app-rental-demo.mjs` | 内联素材、生成普通版、同步标注版 | 增加统一展示模型和 CDKEY 视觉签名的同步断言 |
| `tools/verify-app-rental-demo.mjs` | 自动化业务、布局、安全和标注验收 | 先写失败契约，再验证四类结果、优先级、金额、语义与横竖屏一致性 |
| `tools/capture-app-rental-prd-screenshots.mjs` | 18 个页面/关键状态的横竖屏截图 | 固定首页、搜索、详情、确认订单和订单中心的新状态后重建 36 张图 |
| `public/prd/app-rental/*.png` | PRD 本地视觉证据 | 由截图脚本全量替换 |
| `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` | 开发、测试和评审标准 | 替换旧租购混合价格与搜索状态规则，补充 CDKEY 视觉复用边界 |
| `docs/superpowers/specs/2026-08-10-gamehub-app-rental-cdkey-visual-convergence-design.md` | 已确认设计基线 | 实施阶段只读，不扩展范围 |

实施期间不得修改 Mac 租号 Demo、Mac PRD、CDKEY PRD 或任何无关文件。固定 SHA 公网图片地址需推送授权，本计划只完成本地截图和相对路径引用，不擅自 push 或 publish。

## 统一类型与规则

后续任务统一使用以下类型和字段，不得在不同页面另起同义字段：

```js
const DISCOVERY_DISPLAY_TYPES = Object.freeze({
  RENTED: 'rented',
  PLAYABLE: 'playable',
  RENTAL_PRICE: 'rental-price',
  NONE: 'none',
});

// userContext 是服务端针对 gameId 与当前用户返回的快照。
// rawAmount 始终保留服务端原值；formattedAmount 只服务首页与搜索文案。
function resolveGameDisplayModel(gameId, userContext) {
  if (userContext.activeRental) {
    return { displayType: 'rented', displayText: '已租号', rawAmount: null, formattedAmount: null, reason: 'active-rental' };
  }
  if (userContext.playable) {
    return { displayType: 'playable', displayText: '可畅玩', rawAmount: null, formattedAmount: null, reason: userContext.playableReason };
  }
  const rental = lowestEligibleRentalSku(getGameContext(gameId), userContext);
  if (!rental || !userContext.priceResolved || !userContext.inventoryResolved || !userContext.eligibilityResolved) {
    return { displayType: 'none', displayText: '', rawAmount: null, formattedAmount: null, reason: 'unresolved-or-unavailable' };
  }
  const formattedAmount = Number(rental.price).toFixed(1);
  return {
    displayType: 'rental-price',
    displayText: `¥${formattedAmount} · 租号`,
    rawAmount: rental.price,
    formattedAmount,
    reason: rental.firstOnly ? 'eligible-first-rental-price' : 'eligible-rental-price',
  };
}
```

`activeRental` 只允许由“已支付、已分配、当前未过期、未进入退款”的租号使用单产生。`pending`、`allocating`、`refunding`、`refunded`、`ended` 和过期 `active` 均不得命中 `rented`。`playable` 合并已拥有、已安装、已导入、单游戏永久权益和命中会员库的有效会员权益。

---

### Task 1: 建立评审修正失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 注册两个新的验收组**

在现有 `runRefactorGate` 流程中加入 `DISCOVERY_DISPLAY_MODEL` 和 `CDKEY_VISUAL_CONVERGENCE`，每组完成时分别输出：

```js
process.stdout.write('DISCOVERY_DISPLAY_MODEL 16/16 PASS\n');
process.stdout.write('CDKEY_VISUAL_CONVERGENCE 14/14 PASS\n');
```

- [ ] **Step 2: 增加统一展示模型的纯函数断言**

通过公开测试接口 `resolveGameDisplayModel(gameId, userContext)` 构造以下固定用例：

```js
const contexts = {
  rented: {
    activeRental: true, playable: true, playableReason: 'owned',
    region: 'CN', version: 'Steam', firstRentalEligible: true,
    priceResolved: true, inventoryResolved: true, eligibilityResolved: true,
  },
  playable: {
    activeRental: false, playable: true, playableReason: 'membership',
    region: 'CN', version: 'Steam', firstRentalEligible: false,
    priceResolved: true, inventoryResolved: true, eligibilityResolved: true,
  },
  rentalPrice: {
    activeRental: false, playable: false, playableReason: null,
    region: 'CN', version: 'Steam', firstRentalEligible: false,
    priceResolved: true, inventoryResolved: true, eligibilityResolved: true,
  },
  unresolved: {
    activeRental: false, playable: false, playableReason: null,
    region: 'CN', version: 'Steam', firstRentalEligible: false,
    priceResolved: false, inventoryResolved: true, eligibilityResolved: true,
  },
};

const models = await page.evaluate((input) => Object.fromEntries(
  Object.entries(input).map(([key, context]) => [key, window.__appRentalDemo.resolveGameDisplayModel('shadow-blade-zero', context)]),
), contexts);

assert.equal(models.rented.displayText, '已租号');
assert.equal(models.playable.displayText, '可畅玩');
assert.equal(models.rentalPrice.displayText, '¥9.9 · 租号');
assert.equal(models.rentalPrice.rawAmount, 9.9);
assert.equal(models.rentalPrice.formattedAmount, '9.9');
assert.equal(models.unresolved.displayType, 'none');
```

再分别构造 `pending`、`allocating`、`refunding`、`refunded`、`ended` 与 `expireAt <= Date.now()`，断言 `activeRental` 解析为 `false`；构造 `owned`、`installed`、`imported`、`permanent`、`membership`，断言统一为 `playable`；构造首次资格有效与无效，断言只有有效时 `1.99` 参与最低价。

- [ ] **Step 3: 增加首页和搜索 DOM 契约**

横竖屏分别打开 `home` 与 `search`，读取：

```js
const discoveryDom = await page.locator('#appRentalDemo').evaluate((root) => ({
  displayTexts: [...root.querySelectorAll('[data-discovery-display]')].map((node) => node.textContent.trim()),
  displayTypes: [...root.querySelectorAll('[data-discovery-display]')].map((node) => node.dataset.discoveryDisplay),
  searchInlineActions: root.querySelectorAll('.search-result-card [data-primary-action], .search-result-card .primary-action').length,
  searchCards: root.querySelectorAll('.search-result-card').length,
  searchCardsClickable: [...root.querySelectorAll('.search-result-card')].every((node) => node.matches('button, a, [role="button"]')),
  legacyCopy: /首次体验|会员畅玩|租\/购可选|购\s*¥|继续游戏|租用中/.test(root.innerText),
}));
```

断言搜索卡片内无独立 CTA、每卡只有一个 `[data-discovery-display]`、整卡可点击、结果文案只属于 `已租号`、`可畅玩`、`¥\d+\.\d · 租号`；`none` 卡不渲染该节点。

- [ ] **Step 4: 增加详情、确认订单和订单中心视觉语义契约**

断言：

```js
const visual = await page.locator('#appRentalDemo').evaluate((root) => ({
  primaryBackground: getComputedStyle(root.querySelector('[data-primary-action]:not(:disabled)')).backgroundImage,
  primaryHasBlue: /rgb\((?:3[0-9]|4[0-9]|5[0-9]),\s*(?:9[0-9]|1[0-6][0-9]),\s*(?:2[0-5][0-9])\)/.test(
    getComputedStyle(root.querySelector('[data-primary-action]:not(:disabled)')).backgroundImage,
  ),
  forbiddenBusinessCopy: /CDKEY|CDK|卡密|激活|发货|收货账号|永久拥有/i.test(root.innerText),
}));
assert(visual.primaryBackground.includes('gradient') && visual.primaryHasBlue);
assert.equal(visual.forbiddenBusinessCopy, false);
```

订单中心继续断言只有“全部订单 / 待支付 / 可使用”、搜索在“可使用”右侧、卡片无订单类型标签、全部 fixture 都是租号订单。

- [ ] **Step 5: 运行测试确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 原有验收组仍通过；新组至少在旧 `resolvePricePresentation`、搜索旧文案和黄色主按钮处失败，无语法错误。

- [ ] **Step 6: 提交失败契约**

```powershell
git add -- tools/verify-app-rental-demo.mjs
git commit -m "test(app-rental): define cdkey visual convergence contract"
```

---

### Task 2: 实现统一展示模型和发现页状态种子

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1600-1930`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 将发现页用户上下文纳入 state**

在 `state` 中增加可测试且可旋转保持的上下文：

```js
discoveryContexts: {
  'shadow-blade-zero': {
    activeOrderStatus: 'active', expireAt: Date.now() + 2 * 60 * 60 * 1000,
    owned: false, installed: false, imported: false, permanent: false,
    membershipActive: false, memberLibrary: false, region: 'CN', version: 'Steam',
    firstRentalEligible: false, priceResolved: true, inventoryResolved: true, eligibilityResolved: true,
  },
  'elden-ring': {
    activeOrderStatus: null, expireAt: null,
    owned: false, installed: false, imported: false, permanent: true,
    membershipActive: false, memberLibrary: true, region: 'CN', version: 'Steam',
    firstRentalEligible: false, priceResolved: true, inventoryResolved: true, eligibilityResolved: true,
  },
  spiritfarer: {
    activeOrderStatus: null, expireAt: null,
    owned: false, installed: false, imported: false, permanent: false,
    membershipActive: false, memberLibrary: false, region: 'CN', version: 'Steam',
    firstRentalEligible: false, priceResolved: true, inventoryResolved: true, eligibilityResolved: true,
  },
},
```

这些是 Demo 展示种子，不替代真实服务端接口；页面必须通过 `gameId` 读取，不能继续只读全局 `state.scenario`。

- [ ] **Step 2: 实现上下文标准化和有效租赁判断**

```js
function normalizeGameUserContext(gameId, input = {}) {
  const activeRental = input.activeOrderStatus === 'active'
    && Number(input.expireAt) > Date.now()
    && !input.refundActive;
  const playable = Boolean(
    input.owned || input.installed || input.imported || input.permanent
    || (input.membershipActive && input.memberLibrary),
  );
  const playableReason = input.owned ? 'owned'
    : input.installed ? 'installed'
      : input.imported ? 'imported'
        : input.permanent ? 'permanent'
          : input.membershipActive && input.memberLibrary ? 'membership' : null;
  return {
    gameId,
    ...input,
    activeRental,
    playable,
    playableReason,
  };
}

function getDiscoveryUserContext(gameId) {
  return normalizeGameUserContext(gameId, state.discoveryContexts[gameId] || {});
}
```

- [ ] **Step 3: 实现 `resolveGameDisplayModel` 并删除发现页租购混合文案**

按“统一类型与规则”代码实现纯函数。`lowestEligibleRentalSku` 必须继续以原始 `price` 排序；`formattedAmount` 只用 `toFixed(1)` 生成。首页和搜索停止调用 `resolvePricePresentation`；购买 SKU、CDKEY 价格和单游戏永久价格不参与发现页租号最低价。

- [ ] **Step 4: 暴露测试接口并验证旋转不重算状态**

在 `window.__appRentalDemo` 增加：

```js
resolveGameDisplayModel,
getDiscoveryDisplay(gameId) {
  return resolveGameDisplayModel(gameId, getDiscoveryUserContext(gameId));
},
setDiscoveryContext(gameId, patch) {
  state.discoveryContexts[gameId] = { ...(state.discoveryContexts[gameId] || {}), ...patch };
  renderApp();
  return resolveGameDisplayModel(gameId, getDiscoveryUserContext(gameId));
},
```

测试先读取模型，调用 `setOrientation('landscape')` 再转回竖屏，断言 `displayType`、`displayText` 和 `rawAmount` 不变。

- [ ] **Step 5: 构建并运行模型契约**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `DISCOVERY_DISPLAY_MODEL` 的纯函数、状态优先级、首次资格、未知价格/库存/资格和旋转断言通过；页面 DOM 断言仍可在下一任务前失败。

- [ ] **Step 6: 提交统一模型**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): add unified discovery display model"
```

---

### Task 3: 收敛首页与搜索结果

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1289-1330`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2890-3023`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3536-3560`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 建立唯一发现结果渲染器**

```js
function renderDiscoveryDisplay(gameId, className = '') {
  const model = resolveGameDisplayModel(gameId, getDiscoveryUserContext(gameId));
  if (model.displayType === 'none') return '';
  return `<span class="discovery-display ${className}" data-discovery-display="${model.displayType}">${model.displayText}</span>`;
}
```

`rented` 使用蓝色信息色，`playable` 使用青色可用色，`rental-price` 使用与 CDKEY 价格一致的高对比白色或浅蓝色；不新增胶囊类型标签。

- [ ] **Step 2: 修改首页推荐卡**

删除 `rentalBadge()` 对首页的直接输出，以及“立即体验 / 可租号 / 会员畅玩”等独立 CTA 文案。竖屏 `hero-card`、推荐卡和横屏 `landscape-home-hero` 在原价格/辅助信息位置调用 `renderDiscoveryDisplay(gameId)`；整张卡保持进入详情，卡内不新增租号按钮。

首页种子应稳定出现：`影之刃零 → 已租号`、`艾尔登法环 → 可畅玩`、`Spiritfarer → ¥7.9 · 租号`。首页不显示剩余租期、账号、退款、租期选择或权益来源。

- [ ] **Step 3: 修改搜索数据和卡片结构**

将硬编码 `badge` 从搜索数据中删除：

```js
const results = [
  ['影之刃零', 'shadow-blade-zero', [584, 1656, 492, 240]],
  ['艾尔登法环', 'elden-ring', [67, 1658, 492, 235]],
  ['Spiritfarer', 'spiritfarer', [584, 1656, 492, 240]],
];
```

每张卡结构固定为封面、名称、`Steam版本 · 手柄适配`、唯一展示结果和箭头。根节点仍是点击整卡的 `<button class="search-result-card">`；卡内不得再嵌套按钮，不渲染 `租号开玩`、支付、续租或继续游戏。

- [ ] **Step 4: 补充无新增信息用例**

测试调用：

```js
window.__appRentalDemo.setDiscoveryContext('spiritfarer', { priceResolved: false });
```

断言 Spiritfarer 卡仍显示游戏名与版本信息，但不存在 `[data-discovery-display]`。恢复 `priceResolved: true` 后显示 `¥7.9 · 租号`。

- [ ] **Step 5: 构建并验证首页/搜索**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 首页与搜索在横竖屏均只出现允许的四类结果；搜索卡片内独立 CTA 为 0；点击卡片进入对应详情；返回后关键词和滚动上下文仍保留；无旧租购混合文案。

- [ ] **Step 6: 提交发现页修正**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): simplify home and search rental states"
```

---

### Task 4: 对齐游戏详情与确认订单的 CDKEY 视觉骨架

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1-620`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3030-3190`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3410-3430`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3620-3660`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 新增 CDKEY 视觉令牌并替换租号主按钮**

在 `:root` 增加：

```css
--commerce-primary-start: #22a9ff;
--commerce-primary-end: #4f63ff;
--commerce-primary-text: #ffffff;
--commerce-secondary-bg: #2a2d33;
--commerce-secondary-border: rgb(255 255 255 / 12%);
--commerce-panel-bg: #202226;
```

`.primary-action`、`.order-primary`、`.payment-primary`、`.recovery-primary` 和 `.after-sales-submit` 统一使用蓝色渐变主按钮；次操作使用深灰填充或描边；禁用态继续使用灰色且不得保留可点击视觉。

- [ ] **Step 2: 调整详情主操作逻辑**

`detailPrimaryMeta()` 改为：

```js
if (primary === 'continue') return { label: '继续游戏', action: 'navigate', screen: 'orders', summary: '已租号' };
if (primary === 'launch' || primary === 'download' || primary === 'member-play') {
  return { label: primary === 'download' ? '下载游戏' : '可畅玩', action: 'feedback', summary: '当前权益可直接使用' };
}
if (!state.entitlementPanelOpen) {
  return { label: '租号开玩', action: 'toggle-entitlement-panel', summary: '选择租期后确认订单' };
}
const offer = getSelectedOffer();
return { label: `确认${offer.durationLabel}租用`, action: 'begin-checkout', summary: `¥${offer.amount.toFixed(2)} · ${offer.durationLabel}` };
```

竖屏与横屏继续保留 V6.1.1 媒体、评分、PC 游戏引擎、游戏介绍；`租号开玩` 只在详情出现，首次点击展开已有租期/权益选择，不从首页或搜索直接创单。

- [ ] **Step 3: 调整详情底部容器**

底部改为 CDKEY 深色交易容器：主操作蓝色渐变，辅助的“更多租期 / 秒玩”使用深灰次按钮。继续游戏或可畅玩时不重复显示租号价格；有效租赁与永久/会员权益并存时，详情可展示全部有效权益，但主路径优先可直接使用。

- [ ] **Step 4: 补齐确认订单字段并清理 CDKEY 语义**

确认订单按同一顺序渲染：游戏封面和名称、版本、租赁套餐、租期、原价、实付、支付方式、租号服务协议、退款规则、支付有效期。保留后台原始金额和 `toFixed(2)` 结算展示，不复用首页/搜索的 1 位金额。

页面和数据对象均不得出现 `CDKEY`、`CDK`、`redeemCode`、`activationKey`、`卡密`、`激活`、`发货`、`收货账号`、`永久拥有`。

- [ ] **Step 5: 验证详情与确认订单的状态路径**

自动化覆盖：

1. 无权益：详情显示“租号开玩”，点击只展开租期；选择 8 小时后再进入确认订单。
2. 有效租赁：详情显示“继续游戏”，不显示剩余时长。
3. 可直接游玩：详情显示“可畅玩”或原下载动作，不引导租号。
4. 价格变化：确认订单显示“按新价格重新确认”。
5. 库存失效：主按钮禁用并显示“暂不可购买”。
6. 支付成功分配中：显示“账号分配中”，不出现 CDKEY 发货语义。

- [ ] **Step 6: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 详情和确认订单横竖屏业务状态一致，蓝色主按钮和深灰次按钮生效；结算仍使用 2 位金额与原始订单金额；CDKEY 禁止语义为 0。

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): align detail and checkout with cdkey visuals"
```

---

### Task 5: 统一订单中心状态色和按钮层级

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:780-860`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1428-1470`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1595-1760`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3210-3320`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 保持三 Tab 与当前页搜索规则不变**

不得修改 `ORDER_TABS`：

```js
const ORDER_TABS = Object.freeze([
  { id: 'all', label: '全部订单' },
  { id: 'pending', label: '待支付' },
  { id: 'usable', label: '可使用' },
]);
```

搜索继续位于“可使用”右侧，只作用当前 Tab；横竖屏旋转、进入详情再返回均保留 Tab、关键词和滚动位置。

- [ ] **Step 2: 对齐状态颜色**

租号订单仍使用 `pending`、`allocating`、`active`、`refunding`、`refunded`、`ended`，只修改视觉映射：待支付红色、分配中蓝色、租用中青色、退款中橙色、已退款/已结束灰色。不得新增 CDKEY 的待激活、已激活、发货中状态。

- [ ] **Step 3: 对齐订单主次按钮**

待支付的“去支付”、租用中的“继续游戏”、分配失败后的“重新查询”等主操作使用蓝色渐变；取消、登录信息、售后、查看详情等次操作使用深灰填充/描边。按钮文案和可用性继续由租号状态机决定，不因视觉复用改写业务状态。

- [ ] **Step 4: 复核卡片字段与类型边界**

卡片仍显示订单号、精确租号状态、游戏、历史实付、租期或剩余时间和状态动作；不增加“租号订单”“CDKEY 订单”“游戏购买”等类型标签。本期 fixture 继续只包含 `orderType: 'rental'`。

- [ ] **Step 5: 构建并运行订单回归**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `ORDER_CENTER_V2 14/14 PASS`；订单六状态、三个 Tab、搜索、详情返回、到期移出可使用全部通过；主按钮蓝色渐变，卡片类型标签和 CDKEY 数据字段为 0。

- [ ] **Step 6: 提交订单视觉修正**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "style(app-rental): unify order status and action hierarchy"
```

---

### Task 6: 同步标注版与 PRD

**Files:**
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 强化构建同步签名**

构建后读取普通版与标注版业务脚本，断言两者都包含：

```js
const requiredSignatures = [
  'DISCOVERY_DISPLAY_TYPES',
  'resolveGameDisplayModel',
  'getDiscoveryUserContext',
  'renderDiscoveryDisplay',
  'ORDER_TABS',
];
```

同时断言标注版业务脚本不保留旧 `resolvePricePresentation` 的首页/搜索调用和旧黄色主按钮规则。

- [ ] **Step 2: 更新标注版发现页说明**

在 `ANNOTATION_GROUPS` 中明确：搜索卡无按钮、整卡进入详情；一张卡最多一条结果；优先级是已租号 → 可畅玩 → 一位小数租号价 → 无新增信息；搜索不展示剩余时长、订单进度和权益来源。

- [ ] **Step 3: 更新标注版详情、确认订单和订单说明**

说明 CDKEY 仅作为页面骨架、状态色与按钮风格参考；详情唯一新增租号主入口；确认订单只出现租号字段；订单中心仍为三个 Tab、无类型标签、本期只列租号状态。

- [ ] **Step 4: 修订 PRD 页面表与规则**

将旧内容替换为：

- 首页、搜索：`已租号 / 可畅玩 / ¥X.X · 租号 / 无新增信息`，不显示“租/购可选”“首次体验”“会员畅玩”等来源型文案。
- 搜索：无卡内按钮、整卡进入详情、不显示剩余时长。
- 价格：发现页 1 位小数只用于展示；最低价按当前地区、版本、库存和用户资格下的租号 SKU 原始金额比较；结算不变。
- 详情：`租号开玩` 只在详情出现，先展开租期再进入确认订单。
- 确认订单：CDKEY 视觉骨架 + 租号字段，禁止卡密、激活、发货语义。
- 订单中心：仅三个 Tab、无类型标签、只展示租号状态，统一状态色和主次按钮。

- [ ] **Step 5: 清理 PRD 旧规则并验证**

Run:

```powershell
rg -n -e '租/购可选' -e '租 2小时.*购' -e '首次租.*搜索' -e '搜索.*剩余' "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
```

Expected: 不再命中旧发现页规则；允许在非目标、版本记录或明确的禁止说明中出现时，必须人工确认上下文不是现行要求。

- [ ] **Step 6: 构建、验证并提交文档同步**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 普通版与标注版签名一致；`ANNOTATION 36/36 PASS`；PRD 与 Demo 的发现状态、金额口径和 CDKEY 边界一致。

```powershell
git add -- tools/build-app-rental-demo.mjs "demos/APP租号功能/盖世游戏APP租号功能-标注版.html" "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
git commit -m "docs(app-rental): sync convergence rules to annotations and prd"
```

---

### Task 7: 重建 36 张截图并完成最终验收

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Replace: `public/prd/app-rental/*.png`
- Update evidence: `test-results/app-rental-capture/capture-results.json`
- Update evidence: `test-results/app-rental-verification/contract-results.json`
- Modify if a failing check requires it: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Regenerate if required: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Regenerate if required: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`

- [ ] **Step 1: 固定截图状态**

`openCaptureState('home')` 和 `openCaptureState('search')` 必须分别展示统一模型的三类结果；`detail` 固定为无权益可租且初始显示“租号开玩”；`checkout` 固定为已选择 8 小时租期；`orders` 固定显示三 Tab、右侧搜索和多状态租号订单。

- [ ] **Step 2: 增加截图前置语义检查**

在截图前断言：

```js
if (shot.pageId === 'search') {
  assert.equal(await page.locator('.search-result-card [data-primary-action]').count(), 0);
  assert.equal(await page.locator('[data-discovery-display]').count(), 3);
}
if (['detail', 'checkout', 'orders', 'order-detail'].includes(shot.pageId)) {
  const text = await page.locator('#appRentalDemo').innerText();
  assert(!/CDKEY|CDK|卡密|激活|发货|收货账号/i.test(text));
}
```

继续执行已有敏感账号、密码、Guard 和 CDKEY 格式检查。

- [ ] **Step 3: 运行构建和全量自动验证**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 既有全部分组通过；新增 `DISCOVERY_DISPLAY_MODEL 16/16 PASS` 和 `CDKEY_VISUAL_CONVERGENCE 14/14 PASS`；无页面脚本错误。

- [ ] **Step 4: 重建 36 张截图**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`；竖屏 390×844、横屏 874×402；PNG 文件头正确；每张大于 20KB；发布目录只包含清单内 36 张图。

- [ ] **Step 5: 原尺寸人工目检关键页面**

逐张打开首页、搜索、详情、确认订单和订单中心的横竖屏 10 张关键图，检查：

1. 首页和搜索每卡最多一条结果，金额恰好一位小数。
2. 搜索无独立按钮，整卡视觉可点击。
3. 详情保留 V6.1.1 内容，`租号开玩` 只在详情。
4. 确认订单字段完整，无 CDKEY 业务语义。
5. 订单中心三 Tab、右侧搜索、无类型标签，状态色和按钮层级统一。
6. 无遮挡、溢出、异常缩放、素材错配和小于 44px 的主要控件。

- [ ] **Step 6: 审计范围和工作区**

Run:

```powershell
git diff --name-only -- "demos/APP租号功能" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求"
```

Expected: 只包含 APP 租号模板、生成产物、标注版、三份工具、36 张截图、APP 租号 PRD 和验证证据；Mac 与 CDKEY 文件无改动。无关脏文件继续保留且不暂存。

- [ ] **Step 7: 提交最终证据**

```powershell
git add -- "demos/APP租号功能" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md" test-results/app-rental-capture/capture-results.json test-results/app-rental-verification/contract-results.json
git commit -m "fix(app-rental): complete cdkey visual convergence review"
```

- [ ] **Step 8: 更新 GUANWANGGAID-3 评审状态**

读取最新 issue 和 comments；添加一条包含改动、自动验证、36 张截图、人工目检、提交号和剩余公网发布风险的评论。随后使用最新 `version` 将 `GUANWANGGAID-3` 从 `in_progress` 移到 `in_review`，不得直接移到 `done`。

## 计划自查

- 规格覆盖：首页、搜索、详情、确认订单、订单中心和横竖屏全部有独立任务与验收。
- 展示口径：统一模型只有 `rented / playable / rental-price / none`；页面不自行拼状态。
- 优先级：有效租赁优先于可畅玩，可畅玩优先于租号价格；待支付、退款、结束和过期不算已租号。
- 金额口径：发现页格式化为 1 位；最低价比较和结算使用原始金额；首次价只在资格有效时参与。
- 页面职责：搜索不承载按钮、租期、账号、退款和剩余时长；详情才承载“租号开玩”和租期选择。
- CDKEY 边界：只复用布局、状态色和按钮风格，不引入购买、卡密、激活、发货和售后状态机。
- 订单范围：仍是三个 Tab、无类型标签、本期只列租号状态。
- 证据链：模板 → 普通版/标注版 → 自动验证 → 36 张截图 → PRD 使用同一构建产物。
- 发布边界：未获授权前不 push、不发布，不声称固定 SHA 公网图片已验证。
