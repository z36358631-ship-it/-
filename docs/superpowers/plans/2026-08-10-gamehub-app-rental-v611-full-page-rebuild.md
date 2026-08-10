# 盖世游戏 APP 租号 V6.1.1 全量页面返工 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 V6.1.1、用户提供页面和 Mac 租号基线，返工 18 个 APP 页面/关键状态的横竖屏 Demo、标注版、36 张 PRD 截图与功能文档，并实现统一订单中心的三个 Tab 与当前页搜索。

**Architecture:** 保留现有单文件 Demo 的统一状态机和 `window.__appRentalDemo` 测试接口，核心页使用 APP V6.1.1 壳层，新增任务页复用 Mac 信息骨架；横竖屏只切换布局，不重建业务状态。普通版由模板和本地素材生成，标注版同步同一业务脚本，Playwright 验证页面、状态和截图。

**Tech Stack:** HTML/CSS/原生 JavaScript、Node.js ESM、Playwright Core、PowerShell、Markdown PRD、单文件 Data URL 素材。

---

## 文件结构与责任

- Create: `demos/APP租号功能/assets/reference/08-portrait-home.png` — V6.1.1 竖屏首页基线。
- Create: `demos/APP租号功能/assets/reference/09-portrait-search.png` — V6.1.1 竖屏搜索基线。
- Create: `demos/APP租号功能/assets/reference/10-portrait-detail.png` — V6.1.1 竖屏详情基线。
- Create: `demos/APP租号功能/assets/reference/12-portrait-play-pc.png` — V6.1.1 竖屏 PC 游戏页基线。
- Create: `demos/APP租号功能/assets/reference/16-portrait-ranking.png` — V6.1.1 竖屏排行榜基线。
- Create: `demos/APP租号功能/assets/reference/18-portrait-library.png` — V6.1.1 竖屏游戏库基线。
- Create: `demos/APP租号功能/assets/reference/30-portrait-profile.png` — V6.1.1 竖屏我的页补充基线。
- Create: `demos/APP租号功能/assets/reference/36-landscape-home.png` — V6.1.1 横屏首页基线。
- Create: `demos/APP租号功能/assets/reference/38-landscape-play-pc.png` — V6.1.1 横屏 PC 游戏页基线。
- Create: `demos/APP租号功能/assets/reference/41-landscape-library.png` — V6.1.1 横屏游戏库基线。
- Create: `demos/APP租号功能/assets/reference/42-landscape-ranking.png` — V6.1.1 横屏排行榜基线。
- Create: `demos/APP租号功能/assets/reference/43-landscape-search.png` — V6.1.1 横屏搜索基线。
- Create: `demos/APP租号功能/assets/reference/44-landscape-detail.png` — V6.1.1 横屏详情基线。
- Create: `demos/APP租号功能/assets/reference/profile-order-center-user-reference.png` — 用户提供的个人中心与订单中心最高优先级基线。
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` — 全部页面、样式、交互和状态。
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.html` — 由构建脚本生成的普通版。
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` — 同步业务脚本并更新交互标注。
- Modify: `tools/build-app-rental-demo.mjs` — 参考素材内嵌、普通版生成和标注版同步。
- Modify: `tools/verify-app-rental-demo.mjs` — 全量页面基线、订单搜索、状态、连续性和标注验证。
- Modify: `tools/capture-app-rental-prd-screenshots.mjs` — 18 个页面/状态的横竖屏截图与安全检查。
- Modify: `public/prd/app-rental/*.png` — 36 张重建截图。
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` — 全量页面说明、图片和验收规则。

## 固定状态与命名

```js
const ORDER_TABS = Object.freeze([
  { id: 'all', label: '全部订单' },
  { id: 'pending', label: '待支付' },
  { id: 'usable', label: '可使用' },
]);

const RENTAL_ORDER_STATUSES = Object.freeze({
  pending: { label: '待支付', group: 'pending' },
  allocating: { label: '分配中', group: 'all' },
  active: { label: '租用中', group: 'usable' },
  refunding: { label: '退款中', group: 'all' },
  refunded: { label: '已退款', group: 'all' },
  ended: { label: '已结束', group: 'all' },
});
```

约束：本期 Demo 的订单样例全部是租号订单；卡片不显示订单类型标签；CDKEY 不进入 Demo fixtures、交互标注或截图场景。

### Task 1: 建立全量页面与订单中心失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs:46-310`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加 18 页矩阵和 V6.1.1 基线标记断言**

在 `main()` 的 refactor gate 中加入完整矩阵；每个页面必须输出稳定的 `data-page-id`，核心页还必须输出 `data-baseline-source="app-v611"`，任务页输出 `data-baseline-source="mac-rental"`。

```js
const FULL_PAGE_MATRIX = Object.freeze([
  ['home', 'home'],
  ['play', 'play'],
  ['community', 'community'],
  ['ranking', 'ranking'],
  ['library', 'library'],
  ['profile', 'profile'],
  ['search', 'search'],
  ['detail', 'detail'],
  ['checkout', 'checkout'],
  ['membership', 'membership'],
  ['member-library', 'member-library'],
  ['orders', 'orders'],
  ['order-detail', 'order-detail'],
  ['steam-login', 'steam-login'],
  ['expiry-15m', 'orders'],
  ['after-sales', 'after-sales'],
  ['payment-success', 'checkout'],
  ['membership-success', 'membership'],
]);

await runRefactorGate('FULL_PAGE_MATRIX', async () => {
  const missing = [];
  for (const orientation of ['portrait', 'landscape']) {
    for (const [pageId, screen] of FULL_PAGE_MATRIX) {
      await reloadDemo();
      const result = await page.evaluate(({ orientation, pageId, screen }) => {
        const api = window.__appRentalDemo;
        api.setOrientation(orientation);
        api.openCaptureState(pageId);
        const rootNode = document.querySelector('#appRentalDemo');
        return {
          pageId,
          screen,
          actualScreen: api.snapshot().screen,
          marker: rootNode.dataset.pageId === pageId || Boolean(rootNode.querySelector(`[data-page-id="${pageId}"]`)),
          stub: Boolean(rootNode.querySelector('.stub-panel, .landscape-stub')),
        };
      }, { orientation, pageId, screen });
      if (result.actualScreen !== screen || !result.marker || result.stub) missing.push({ orientation, ...result });
    }
  }
  assert(missing.length === 0, `全量页面矩阵未完成：${JSON.stringify(missing)}`);
});
```

- [ ] **Step 2: 增加订单中心精确契约**

```js
await runRefactorGate('ORDER_CENTER_V2', async () => {
  const result = await page.evaluate(() => {
    const api = window.__appRentalDemo;
    api.reset();
    api.navigate('orders');
    const labels = [...document.querySelectorAll('[data-order-tab]')].map((node) => node.textContent.trim());
    return {
      labels,
      search: Boolean(document.querySelector('[data-order-search]')),
      typeLabels: [...document.querySelectorAll('.order-list-card')].some((node) => /游戏购买|租号畅玩|CDKEY/.test(node.innerText)),
      purchaseFixture: api.snapshot().orders.some((order) => order.orderType === 'purchase'),
    };
  });
  assert(result.labels.join('|') === '全部订单|待支付|可使用', `订单 Tab 错误：${JSON.stringify(result)}`);
  assert(result.search, '可使用右侧缺少当前页面订单搜索');
  assert(!result.typeLabels && !result.purchaseFixture, `本期 Demo 不得出现订单类型标签或 CDKEY 订单：${JSON.stringify(result)}`);
});
```

- [ ] **Step 3: 增加价格类型分流断言**

```js
await runRefactorGate('PRICE_SEMANTICS', async () => {
  const text = fs.readFileSync(templatePath, 'utf8');
  assert(!/Math\.min\([^)]*(?:rental|rent)[^)]*(?:cdkey|purchase)/i.test(text), '租号与购买价格不得跨类型取最低值');
  assert(text.includes('租 2小时') && text.includes('租/购可选'), '缺少租号价格语义或紧凑共存文案');
});
```

- [ ] **Step 4: 运行验证并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `FULL_PAGE_MATRIX`、`ORDER_CENTER_V2` 和 `PRICE_SEMANTICS` 至少一项失败；脚本自身无语法错误。

- [ ] **Step 5: 提交失败契约**

```bash
git add tools/verify-app-rental-demo.mjs
git commit -m "test(app-rental): define v611 full-page contracts"
```

### Task 2: 固化参考素材并接入构建链路

**Files:**
- Create: `demos/APP租号功能/assets/reference/*.png`
- Modify: `tools/build-app-rental-demo.mjs:7-31`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1370-1425`

- [ ] **Step 1: 将本次所有视觉基线复制进仓库**

Run:

```powershell
$sourceDir = 'C:\Users\z3635\官网改动-app-mods\盖世游戏V6.1.1使用说明手册\图片和附件'
$targetDir = 'C:\Users\z3635\官网改动\demos\APP租号功能\assets\reference'
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$map = @{
  '08-竖版首页.png'='08-portrait-home.png'; '09-竖版搜索默认页.png'='09-portrait-search.png';
  '10-竖版游戏详情.png'='10-portrait-detail.png'; '12-玩游戏-PC游戏.png'='12-portrait-play-pc.png';
  '16-排行榜.png'='16-portrait-ranking.png'; '18-游戏库-PC.png'='18-portrait-library.png';
  '30-我的.png'='30-portrait-profile.png'; '36-掌机模式-首页.png'='36-landscape-home.png';
  '38-掌机模式-PC游戏.png'='38-landscape-play-pc.png'; '41-掌机模式-游戏库.png'='41-landscape-library.png';
  '42-掌机模式-排行榜.png'='42-landscape-ranking.png'; '43-掌机模式-搜索.png'='43-landscape-search.png';
  '44-掌机模式-游戏详情.png'='44-landscape-detail.png'
}
foreach ($entry in $map.GetEnumerator()) { Copy-Item -LiteralPath (Join-Path $sourceDir $entry.Key) -Destination (Join-Path $targetDir $entry.Value) -Force }
Copy-Item -LiteralPath 'C:\Users\z3635\AppData\Local\Temp\codex-clipboard-7316632f-effb-4ef6-a0d5-d7dbb47cb360.png' -Destination (Join-Path $targetDir 'profile-order-center-user-reference.png') -Force
```

Expected: 14 个基线文件存在，来源文件未修改。

- [ ] **Step 2: 扩展构建素材映射**

在构建脚本中加入参考目录并用 ASCII 文件名读取，保持现有 `assets/source` 兼容。

```js
const referenceAssetDir = path.join(root, 'demos', 'APP租号功能', 'assets', 'reference');
const assets = {
  APP_PORTRAIT_HOME: path.join(sourceAssetDir, 'portrait-home.jpg'),
  APP_PORTRAIT_PLAY: path.join(sourceAssetDir, 'portrait-play.jpg'),
  APP_PORTRAIT_LIBRARY: path.join(sourceAssetDir, 'portrait-library.jpg'),
  APP_PORTRAIT_PROFILE: path.join(sourceAssetDir, 'portrait-profile.jpg'),
  APP_LANDSCAPE_LIBRARY: path.join(sourceAssetDir, 'landscape-library.jpg'),
  APP_LANDSCAPE_STEAM_LIBRARY: path.join(sourceAssetDir, 'landscape-steam-library.jpg'),
  APP_LANDSCAPE_PLAY: path.join(sourceAssetDir, 'landscape-play.jpg'),
  V611_PORTRAIT_HOME: path.join(referenceAssetDir, '08-portrait-home.png'),
  V611_PORTRAIT_SEARCH: path.join(referenceAssetDir, '09-portrait-search.png'),
  V611_PORTRAIT_DETAIL: path.join(referenceAssetDir, '10-portrait-detail.png'),
  V611_PORTRAIT_PROFILE: path.join(referenceAssetDir, '30-portrait-profile.png'),
  V611_LANDSCAPE_HOME: path.join(referenceAssetDir, '36-landscape-home.png'),
  V611_LANDSCAPE_SEARCH: path.join(referenceAssetDir, '43-landscape-search.png'),
  V611_LANDSCAPE_DETAIL: path.join(referenceAssetDir, '44-landscape-detail.png'),
};
```

- [ ] **Step 3: 在模板中建立稳定素材对象**

```js
const REFERENCE_ASSETS = Object.freeze({
  portraitHome: '{{V611_PORTRAIT_HOME}}',
  portraitSearch: '{{V611_PORTRAIT_SEARCH}}',
  portraitDetail: '{{V611_PORTRAIT_DETAIL}}',
  portraitProfile: '{{V611_PORTRAIT_PROFILE}}',
  landscapeHome: '{{V611_LANDSCAPE_HOME}}',
  landscapeSearch: '{{V611_LANDSCAPE_SEARCH}}',
  landscapeDetail: '{{V611_LANDSCAPE_DETAIL}}',
});
```

- [ ] **Step 4: 构建并验证素材完整性**

Run: `node tools/build-app-rental-demo.mjs`

Expected: 输出一条 `BUILD` 和一条 `SYNC`；没有“素材不存在”“缺少占位符”或未替换 `{{...}}`。

- [ ] **Step 5: 提交参考素材和构建映射**

```bash
git add demos/APP租号功能/assets/reference tools/build-app-rental-demo.mjs demos/APP租号功能/盖世游戏APP租号功能demo.template.html demos/APP租号功能/盖世游戏APP租号功能demo.html demos/APP租号功能/盖世游戏APP租号功能-标注版.html
git commit -m "chore(app-rental): pin v611 visual references"
```

### Task 3: 1:1 重建七个 APP 核心页

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2328-2520`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2880-3065`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 建立统一核心页分发器**

```js
const CORE_RENDERERS = Object.freeze({
  home: { portrait: renderPortraitHomeV611, landscape: renderLandscapeHomeV611 },
  play: { portrait: renderPortraitPlayV611, landscape: renderLandscapePlayV611 },
  community: { portrait: renderPortraitCommunity, landscape: renderLandscapeCommunity },
  ranking: { portrait: renderPortraitRankingV611, landscape: renderLandscapeRankingV611 },
  library: { portrait: renderPortraitLibraryV611, landscape: renderLandscapeLibraryV611 },
  profile: { portrait: renderPortraitProfileV611, landscape: renderLandscapeProfileV611 },
  search: { portrait: renderPortraitSearchV611, landscape: renderLandscapeSearchV611 },
});

function renderCoreScreen(screen, orientation) {
  const renderer = CORE_RENDERERS[screen]?.[orientation];
  if (!renderer) throw new Error(`Unknown core screen: ${orientation}/${screen}`);
  return `<section data-page-id="${screen}" data-baseline-source="app-v611">${renderer()}</section>`;
}
```

- [ ] **Step 2: 按来源页面逐项还原原结构**

每个核心 renderer 必须保留以下原始模块顺序，不用现有自创的黄色大按钮、白底商品卡或新标题区替换：

```js
const CORE_COMPONENT_ORDER = Object.freeze({
  home: ['status', 'search', 'daily-feature', 'recommendations', 'news', 'pc-games', 'ranking', 'global-nav'],
  play: ['status', 'play-tabs', 'game-content', 'global-nav'],
  community: ['status', 'community-tabs', 'feed', 'global-nav'],
  ranking: ['status', 'ranking-tabs', 'ranking-list', 'global-nav'],
  library: ['status', 'library-tabs', 'filters', 'game-list', 'import-entry', 'global-nav'],
  profile: ['status', 'profile-header', 'steam-card', 'order-entry', 'community-banner', 'device-card', 'global-nav'],
  search: ['status', 'search-field', 'search-tabs', 'search-content'],
});
```

页面根节点输出 `data-component-order`，验证脚本比较实际顺序与上述数组。

- [ ] **Step 3: 只在原卡片内叠加租号增量**

```js
function renderDiscoveryCommerce(game) {
  const entitlement = resolveEntitlement(game.id);
  if (entitlement.action === 'launch') return '<span class="game-action-state">启动游戏</span>';
  if (entitlement.action === 'download') return '<span class="game-action-state">下载游戏</span>';
  if (entitlement.action === 'continue') return '<span class="game-action-state">继续游戏</span>';
  if (entitlement.action === 'member') return '<span class="game-action-state">会员畅玩</span>';
  if (game.rental && game.purchase && game.compact) return '<span class="game-price-state">租/购可选</span>';
  if (game.rental && game.purchase) return `<span class="game-price-state">租 2小时 ¥${game.rental.price}起｜购 ¥${game.purchase.price}起</span>`;
  if (game.rental) return `<span class="game-price-state">租 2小时 ¥${game.rental.price}起</span>`;
  return '';
}
```

- [ ] **Step 4: 完成个人中心统一入口**

个人中心使用用户截图的层级和文案，入口只写“订单中心”，不出现“租号订单”。

```html
<button class="profile-order-entry" type="button" data-action="navigate" data-screen="orders">
  <span class="profile-order-icon" aria-hidden="true">▣</span>
  <strong>订单中心</strong>
  <span class="chevron" aria-hidden="true">›</span>
</button>
```

- [ ] **Step 5: 构建并验证七页横竖屏**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 七个核心页横竖屏均无占位页；`data-baseline-source="app-v611"` 和组件顺序全部通过；任务页仍可从核心页进入。

- [ ] **Step 6: 提交核心页重建**

```bash
git add demos/APP租号功能 tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): rebuild v611 core pages"
```

### Task 4: 按原 APP 详情页融合权益与价格

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2402-2420`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2528-2587`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3066-3077`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加详情页原结构断言**

测试要求竖屏详情包含媒体区、视频/图集 Tab、游戏基础信息、PC 游戏引擎卡、游戏介绍和原底部操作区；横屏包含同源结构，不得只显示自创封面卡和“选择游戏权益”白板。

- [ ] **Step 2: 将权益选择放入原详情底部操作，不替换正文**

```js
state.entitlementPanelOpen = false;

function renderEntitlementPanel(game, model) {
  if (!state.entitlementPanelOpen) return '';
  return `<section class="entitlement-panel" role="dialog" aria-label="选择游戏权益">
    <header><h2>选择游戏权益</h2><button type="button" data-action="close-entitlement-panel" aria-label="关闭">×</button></header>
    ${renderSkuOptions(model)}
    ${model.action.primary === 'rent-2h' ? renderDurationOptions() : ''}
    <button class="primary-action" type="button" data-action="continue-entitlement">确认并继续</button>
  </section>`;
}

function renderDetailCommerce(game) {
  const model = resolveEntitlement(game.id);
  return `<section class="detail-commerce" data-rental-increment="detail-commerce">
    <div class="detail-commerce-summary">
      <strong>${model.title}</strong>
      <span>${model.priceLabel}</span>
    </div>
    <button type="button" data-action="open-entitlement-panel">${model.cta}</button>
  </section>${renderEntitlementPanel(game, model)}`;
}
```

点击 `data-action="open-entitlement-panel"` 时设置 `state.entitlementPanelOpen = true`，关闭时设为 `false` 并重新渲染。权益面板只在用户点击获取游戏/租号入口后出现；已有启动、下载、会员或有效租赁仍优先。

- [ ] **Step 3: 固化价格算法**

```js
function lowestEligibleRentalSku(game, context) {
  return (game.rentalSkus || [])
    .filter((sku) => sku.enabled && sku.inStock && sku.region === context.region)
    .filter((sku) => !sku.firstOnly || context.firstRentalEligible)
    .sort((left, right) => left.price - right.price)[0] || null;
}

function lowestEligiblePurchaseSku(game, context) {
  return (game.purchaseSkus || [])
    .filter((sku) => sku.enabled && sku.inStock && sku.region === context.region && sku.version === context.version)
    .sort((left, right) => left.price - right.price)[0] || null;
}

function resolvePricePresentation(game, context) {
  if (context.entitlementLabel) return { label: context.entitlementLabel, kind: 'entitlement' };
  const rental = lowestEligibleRentalSku(game, context);
  const purchase = lowestEligiblePurchaseSku(game, context);
  if (rental && purchase) return { label: `租 2小时 ¥${rental.price}起｜购 ¥${purchase.price}起`, kind: 'mixed' };
  if (rental) return { label: `${rental.firstEligible ? '首次租' : '租 2小时'} ¥${rental.price}${rental.firstEligible ? '' : '起'}`, kind: 'rental' };
  if (purchase) return { label: `购 ¥${purchase.price}起`, kind: 'purchase' };
  return { label: '', kind: 'none' };
}
```

- [ ] **Step 4: 构建、验证并提交详情页**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 详情原结构完整；六种权益场景 CTA 正确；租购价格没有跨类型取最低；横竖屏旋转不丢选中游戏与权益。

```bash
git add demos/APP租号功能 tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): merge rental into v611 detail"
```

### Task 5: 重做确认订单、会员中心与会员游戏库

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2585-2697`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3079-3110`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 保留现有支付与会员状态机，只替换页面结构**

确认订单的组件顺序固定为：游戏快照、版本与租期、服务保障、价格快照、支付方式、协议、主操作；会员中心固定为会员状态、月/年/永久套餐、支付方式、会员游戏库、FAQ。

```js
const TASK_COMPONENT_ORDER = Object.freeze({
  checkout: ['game-context', 'rental-package', 'service-benefits', 'price-summary', 'payment-methods', 'agreement', 'primary-action'],
  membership: ['member-status', 'member-plans', 'payment-methods', 'member-library-entry', 'member-faq'],
  'member-library': ['member-status', 'member-game-grid', 'member-faq'],
});
```

- [ ] **Step 2: 横屏继承 Mac 骨架，竖屏保持同序**

横屏确认订单左侧为游戏与保障，右侧为金额、支付和协议；竖屏按同一组件顺序单列。禁止用 `transform: scale()` 压缩内容。

- [ ] **Step 3: 保留异常恢复操作**

价格变化、库存不足、支付超时、网络恢复和取号失败继续使用现有真实状态；任何主按钮必须最终进入成功、退款或可重试状态。

- [ ] **Step 4: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `GAME_TRANSACTION_COMPLETION`、`MEMBERSHIP_COMPLETION` 和既有支付/会员测试全部通过；三个任务页横竖屏组件顺序一致。

```bash
git add demos/APP租号功能 tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): rebuild checkout and membership pages"
```

### Task 6: 实现统一订单中心三个 Tab 与当前页搜索

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1479-1555`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1887-1922`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2699-2751`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3112-3118`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 将订单状态拆为展示组**

```js
function rentalOrderTab(order) {
  if (order.status === 'pending') return 'pending';
  if (order.status === 'active' && Number(order.expireAt) > Date.now()) return 'usable';
  return 'all';
}

function matchesOrderTab(order, tab) {
  if (tab === 'all') return true;
  return rentalOrderTab(order) === tab;
}
```

- [ ] **Step 2: 增加搜索状态和过滤器**

```js
state.orderTab = 'all';
state.orderSearch = '';
state.orderSearchOpen = false;

function normalizeOrderSearch(value) {
  return String(value || '').trim().toLocaleLowerCase('zh-CN');
}

function getFilteredOrders() {
  const keyword = normalizeOrderSearch(state.orderSearch);
  return getOrderCollection()
    .filter((order) => matchesOrderTab(order, state.orderTab))
    .filter((order) => !keyword || normalizeOrderSearch(`${order.gameName} ${order.id}`).includes(keyword))
    .sort((left, right) => Number(right.updatedAt) - Number(left.updatedAt));
}

function setOrderSearch(value) {
  state.orderSearch = String(value || '');
  renderApp();
  return getFilteredOrders().map(({ id }) => id);
}
```

在输入事件分发器中把 `[data-order-search] input` 的值交给 `setOrderSearch()`；在 `window.__appRentalDemo` 导出 `setOrderSearch`，供自动验证与截图脚本使用。

- [ ] **Step 3: 重建订单顶部区域**

```js
function renderOrderToolbar() {
  const tabs = ORDER_TABS.map(({ id, label }) => `<button type="button" role="tab" data-order-tab="${id}" data-action="set-order-tab" data-value="${id}" aria-selected="${state.orderTab === id}" class="${state.orderTab === id ? 'active' : ''}">${label}</button>`).join('');
  return `<div class="order-toolbar"><div class="order-tabs" role="tablist">${tabs}</div><label class="order-search" data-order-search><span aria-hidden="true">⌕</span><input type="search" value="${escapeAttribute(state.orderSearch)}" placeholder="搜索当前订单" aria-label="搜索当前页面的订单"></label></div>`;
}
```

CSS 要求 `.order-search { margin-left: auto; }`，竖屏折叠为搜索图标并在点击后展开输入框；搜索仍属于同一工具栏，位于“可使用”右侧。

- [ ] **Step 4: 订单卡片只显示租号业务内容**

```js
function formatRemaining(expireAt) {
  const totalSeconds = Math.max(0, Math.ceil((Number(expireAt) - Date.now()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
}

function renderOrderCover(order) {
  const game = getGameContext(order.gameId);
  return `<span class="order-game-cover">${coverArt(game)}</span>`;
}

function renderRentalOrderActions(order) {
  if (order.status === 'pending') return '<div class="order-actions"><button data-action="cancel-order">取消订单</button><button class="primary" data-action="continue-payment">继续支付</button></div>';
  if (order.status === 'allocating') return '<div class="order-actions"><button data-action="select-order">查看详情</button><button data-action="query-order-status">刷新状态</button></div>';
  if (order.status === 'active') return '<div class="order-actions"><button data-action="open-login-method">一键上号</button><button data-action="open-credential">登录信息</button></div>';
  if (['ended', 'refunded'].includes(order.status)) return '<div class="order-actions"><button data-action="rent-again">再次租用</button><button data-action="select-order">查看详情</button></div>';
  return '<div class="order-actions"><button data-action="select-order">查看详情</button></div>';
}

function renderOrderCard(order) {
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.ended;
  return `<article class="order-list-card" data-order-id="${order.id}" data-status="${order.status}">
    <header><span>订单编号：${order.id}</span><strong>${meta.label}</strong></header>
    <button type="button" data-action="select-order" data-order-id="${order.id}">
      ${renderOrderCover(order)}
      <span class="order-card-copy"><strong>${order.gameName}</strong><span>实付 ¥${Number(order.amount).toFixed(2)}</span>${order.status === 'active' ? `<small>剩余 ${formatRemaining(order.expireAt)}</small>` : ''}</span>
    </button>
    ${renderRentalOrderActions(order)}
  </article>`;
}
```

禁止出现 `游戏购买`、`租号畅玩`、`CDKEY` 类型标签；内部可保留 `orderType: 'rental'` 供状态机使用。

- [ ] **Step 5: 增加搜索与 Tab 自动验证**

验证场景至少包含：全部 6 种状态、待支付只返回 pending、可使用只返回未到期 active、按游戏名搜索、按订单号搜索、无结果、切换 Tab 保留关键词、租期到期后从可使用移除。

- [ ] **Step 6: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `ORDER_CENTER_V2` 全部通过；订单顶部只有三个 Tab 与当前页搜索；fixtures 不包含 CDKEY；搜索结果与当前 Tab 一致。

```bash
git add demos/APP租号功能 tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): unify rental order center"
```

### Task 7: 重做订单详情、登录与凭据页面

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2716-2847`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:3117-3118`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 将订单列表与详情保持独立路由**

`orders` 只渲染列表，`order-detail` 只渲染单笔租号订单；横竖屏均点击卡片进入详情。返回恢复 `orderTab`、`orderSearch` 和滚动位置。

- [ ] **Step 2: 按状态输出详情操作**

```js
function rentalOrderCapabilities(order) {
  return {
    canPay: order.status === 'pending',
    canRefresh: order.status === 'allocating',
    canLogin: order.status === 'active' && order.expireAt > Date.now(),
    canContinue: order.status === 'active' && order.expireAt > Date.now(),
    canAfterSales: order.status === 'active',
    canRentAgain: ['ended', 'refunded'].includes(order.status),
  };
}
```

- [ ] **Step 3: 保持凭据短时授权和清理**

列表和普通详情 DTO 不返回账号、密码和 Guard；只有有效租用订单可打开登录信息。退后台、T0、退款提交、订单失效或关闭面板后清理可见明文与 Guard。

- [ ] **Step 4: 对齐 Steam 登录横竖屏结构**

横屏保持账号密码/二维码双栏，租号登录信息只覆盖二维码区域；竖屏顺序固定为账号密码、登录、Guard、二维码。任意非空输入不得直接通过登录校验。

- [ ] **Step 5: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `LANDSCAPE_ORDER_ROUTES`、凭据、Guard、一键上号失败转手动登录和敏感状态清理测试全部通过。

```bash
git add demos/APP租号功能 tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): rebuild order detail and login"
```

### Task 8: 重做到期、售后与成功结果页

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2093-2296`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2754-2833`
- Modify: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 保留 15 分钟跨阈值一次提醒**

继续使用服务端时间与 `>15 → ≤15且>0` 跨阈值判断；关闭、旋转、前后台切换不重复提醒，5 分钟和 1 分钟不再提醒。

- [ ] **Step 2: 保留 T0 幂等结束与权益接管**

T0 一次性结束使用单、释放账号、撤销凭据并关闭敏感面板；存在个人拥有、永久、会员或新活动订单时接管，否则显示到期拦截。

- [ ] **Step 3: 重排售后页面但不削弱状态机**

售后仍覆盖启动失败、Steam 登录失败、账号异常、3 天无理由和其他问题；退款与换号必须改变真实订单/使用单状态，不使用静态进度装饰。

- [ ] **Step 4: 增加游戏订单和会员支付成功页标记**

支付成功状态输出 `data-page-id="payment-success"`，会员生效输出 `data-page-id="membership-success"`；失败或取号失败不伪装为成功。

- [ ] **Step 5: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 临期、T0、权益接管、退款、换号、游戏支付成功和会员生效全部通过。

```bash
git add demos/APP租号功能 tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): rebuild expiry and after-sales states"
```

### Task 9: 同步标注版与横竖屏连续性

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/build-app-rental-demo.mjs`
- Modify: `tools/verify-app-rental-demo.mjs:2035-2224`

- [ ] **Step 1: 将左侧导航扩展到全量页面矩阵**

标注版左侧至少覆盖核心页、详情、结算、会员、订单、登录、临期、售后、成功与异常；点击导航真实驱动中间 Demo，不使用静态截图替代交互。

- [ ] **Step 2: 更新订单中心标注**

明确三个 Tab 的数据口径、搜索只作用当前 Tab、卡片无类型标签、本期只展示租号状态、CDKEY 由既有需求负责。

- [ ] **Step 3: 更新页面级六字段标注**

每个页面/关键交互写明触发条件、竖屏表现、横屏表现、反馈、依赖和异常；敏感状态 Tab 不出现真实账号、密码、Guard 或 token。

- [ ] **Step 4: 验证横竖屏状态连续**

旋转前后必须保留 selectedGameId、SKU、订单号、支付/取号状态、会员状态、orderTab、orderSearch、selectedOrderId、售后草稿和临期提醒记录。

- [ ] **Step 5: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 标注版三栏完整、页面导航可用、横竖屏设备完整可见、控制台零错误、敏感信息零泄漏。

```bash
git add demos/APP租号功能 tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs
git commit -m "docs(app-rental): sync full-page annotations"
```

### Task 10: 重建 36 张截图并同步 PRD

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs:21-57`
- Modify: `public/prd/app-rental/*.png`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`

- [ ] **Step 1: 将截图状态与 18 页矩阵一一绑定**

每个 `shot` 增加 `pageId`，截图前调用 `openCaptureState(pageId)`，并验证实际 `data-page-id`。订单中心截图只使用租号 fixtures。先在模板内定义全部捕获状态：

```js
const CAPTURE_STATE_SETUPS = Object.freeze({
  home: () => navigate('home'),
  play: () => navigate('play'),
  community: () => navigate('community'),
  ranking: () => navigate('ranking'),
  library: () => navigate('library'),
  profile: () => navigate('profile'),
  search: () => navigate('search'),
  detail: () => { setScenario('member-library-trial'); setSelectedGame('shadow-blade-zero'); navigate('detail'); },
  checkout: () => { setScenario('not-member-library'); setSelectedGame('elden-ring'); selectRentalSku('rent-2h'); navigate('checkout'); },
  membership: () => { setScenario('member-library-trial-used'); navigate('membership'); },
  'member-library': () => { setScenario('member-library-trial-used'); navigate('member-library'); },
  orders: () => { setScenario('active-rental'); navigate('orders'); },
  'order-detail': () => { setScenario('active-rental'); navigate('orders'); selectOrder('APP-20260803005'); navigate('order-detail'); },
  'steam-login': () => { setScenario('active-rental'); navigate('orders'); selectOrder('APP-20260803005'); openManualLogin(); },
  'expiry-15m': () => { setScenario('active-rental'); navigate('orders'); triggerExpiryMinutes(15); },
  'after-sales': () => { setScenario('active-rental'); navigate('orders'); selectOrder('APP-20260803005'); openAfterSales(); },
  'payment-success': () => { setScenario('not-member-library'); setSelectedGame('elden-ring'); selectRentalSku('rent-2h'); navigate('checkout'); payOrder(); },
  'membership-success': () => { setScenario('member-library-trial-used'); navigate('membership'); createMembershipOrder(); payMembershipOrder(); },
});

function openCaptureState(pageId) {
  const setup = CAPTURE_STATE_SETUPS[pageId];
  if (!setup) throw new Error(`Unknown capture page: ${pageId}`);
  state.capturePageId = pageId;
  setup();
  renderApp();
  document.querySelector('#appRentalDemo')?.setAttribute('data-page-id', pageId);
  return publicSnapshot();
}
```

把 `openCaptureState` 加入 `window.__appRentalDemo` 公共测试接口；`reset()` 仍只用于完整页面重载，捕获状态不得依赖重载后的旧对象。

```js
const shots = [
  { name: '01-discovery-portrait.png', pageId: 'home', orientation: 'portrait' },
  { name: '01-discovery-landscape.png', pageId: 'home', orientation: 'landscape' },
  { name: '02-detail-portrait.png', pageId: 'detail', orientation: 'portrait' },
  { name: '02-detail-landscape.png', pageId: 'detail', orientation: 'landscape' },
  { name: '03-checkout-portrait.png', pageId: 'checkout', orientation: 'portrait' },
  { name: '03-checkout-landscape.png', pageId: 'checkout', orientation: 'landscape' },
  { name: '04-membership-portrait.png', pageId: 'membership', orientation: 'portrait' },
  { name: '04-membership-landscape.png', pageId: 'membership', orientation: 'landscape' },
  { name: '05-orders-portrait.png', pageId: 'orders', orientation: 'portrait' },
  { name: '05-orders-landscape.png', pageId: 'orders', orientation: 'landscape' },
  { name: '06-steam-login-portrait.png', pageId: 'steam-login', orientation: 'portrait', sensitive: true },
  { name: '06-steam-login-landscape.png', pageId: 'steam-login', orientation: 'landscape', sensitive: true },
  { name: '07-expiry-15m-portrait.png', pageId: 'expiry-15m', orientation: 'portrait' },
  { name: '07-expiry-15m-landscape.png', pageId: 'expiry-15m', orientation: 'landscape' },
  { name: '08-after-sales-portrait.png', pageId: 'after-sales', orientation: 'portrait' },
  { name: '08-after-sales-landscape.png', pageId: 'after-sales', orientation: 'landscape' },
  { name: '09-play-portrait.png', pageId: 'play', orientation: 'portrait' },
  { name: '09-play-landscape.png', pageId: 'play', orientation: 'landscape' },
  { name: '10-community-portrait.png', pageId: 'community', orientation: 'portrait' },
  { name: '10-community-landscape.png', pageId: 'community', orientation: 'landscape' },
  { name: '11-ranking-portrait.png', pageId: 'ranking', orientation: 'portrait' },
  { name: '11-ranking-landscape.png', pageId: 'ranking', orientation: 'landscape' },
  { name: '12-library-portrait.png', pageId: 'library', orientation: 'portrait' },
  { name: '12-library-landscape.png', pageId: 'library', orientation: 'landscape' },
  { name: '13-profile-portrait.png', pageId: 'profile', orientation: 'portrait' },
  { name: '13-profile-landscape.png', pageId: 'profile', orientation: 'landscape' },
  { name: '14-search-portrait.png', pageId: 'search', orientation: 'portrait' },
  { name: '14-search-landscape.png', pageId: 'search', orientation: 'landscape' },
  { name: '15-member-library-portrait.png', pageId: 'member-library', orientation: 'portrait' },
  { name: '15-member-library-landscape.png', pageId: 'member-library', orientation: 'landscape' },
  { name: '16-order-detail-portrait.png', pageId: 'order-detail', orientation: 'portrait', sensitive: true },
  { name: '16-order-detail-landscape.png', pageId: 'order-detail', orientation: 'landscape', sensitive: true },
  { name: '17-payment-success-portrait.png', pageId: 'payment-success', orientation: 'portrait' },
  { name: '17-payment-success-landscape.png', pageId: 'payment-success', orientation: 'landscape' },
  { name: '18-membership-success-portrait.png', pageId: 'membership-success', orientation: 'portrait' },
  { name: '18-membership-success-landscape.png', pageId: 'membership-success', orientation: 'landscape' },
];
```

- [ ] **Step 2: 生成截图并验证文件**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`；竖屏 `390×844`、横屏 `874×402`；PNG 签名正确；单图大于 20KB；无账号、密码、Guard 或 CDKEY 数据。

- [ ] **Step 3: 原尺寸逐页目检**

按设计文档 4.3 的 18 项，将每张截图与 V6.1.1、用户截图或 Mac 基线并排检查：原页面模块不得缺失，租号增量不得重排核心页，文字不得小于可读性底线，订单中心规则必须正确。

- [ ] **Step 4: 使用 to-prd 流程重写 PRD 页面表**

PRD 的 C 端详细设计保持一张连续大表，18 项逐行对应截图、入口、展示、交互、状态、异常和验收；CDKEY 只引用既有需求，不复制其订单状态。

- [ ] **Step 5: 校验图片链接与内容**

Run:

```powershell
rg -n '租号订单|全部订单|待支付|可使用|CDKEY|类型标签|后续补齐|当前入口已连通|未完成说明|补充内容' 'prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md'
```

Expected: 个人中心入口不写“租号订单”；订单中心规则完整；无类型标签和 CDKEY Demo 状态；无占位内容。图片链接在发布前固定到包含 36 张截图的 Git SHA。

- [ ] **Step 6: 提交截图和 PRD**

```bash
git add tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md
git commit -m "docs(app-rental): rebuild full-page prd evidence"
```

### Task 11: 最终回归、范围审计与看板交付

**Files:**
- Modify only if tests fail: files listed in Tasks 1-10
- Read: `docs/superpowers/specs/2026-08-10-gamehub-app-rental-v611-order-center-design.md`

- [ ] **Step 1: 运行生成链路**

Run: `node tools/build-app-rental-demo.mjs`

Expected: 普通版生成成功，标注版同步成功，无缺失素材和模板占位符。

- [ ] **Step 2: 运行全量自动验证**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 所有既有分组、`FULL_PAGE_MATRIX`、`ORDER_CENTER_V2`、`PRICE_SEMANTICS` 和标注版检查全部 PASS；浏览器控制台零错误。

- [ ] **Step 3: 重新生成截图**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 36/36 PASS`。

- [ ] **Step 4: 审计占位页、错误入口和 CDKEY 泄漏**

Run:

```powershell
rg -n -e 'renderStub' -e 'landscape-stub' -e '当前入口已连通' -e '后续补齐' -e '租号订单' -e '游戏购买' -e '租号畅玩' -e 'CDKEY' 'demos/APP租号功能/盖世游戏APP租号功能demo.template.html'
```

Expected: 无核心/任务占位页；个人中心和订单标题不写“租号订单”；订单卡无类型标签；允许价格共存规则的 CDKEY 文案仅存在于价格逻辑或说明，不存在 CDKEY 订单 fixture、状态或操作。

- [ ] **Step 5: 审计修改范围**

Run:

```powershell
git diff --name-only -- demos/APP租号功能 tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental 'prd/【盖世游戏APP】游戏租号需求'
```

Expected: 只包含 APP 租号 Demo、参考素材、构建/验证/截图工具、APP 截图和 APP 租号 PRD；Mac Demo、Mac PRD 与 CDKEY PRD 没有修改。

- [ ] **Step 6: 生成最终验证摘要**

记录：18/18 页面、36/36 截图、自动检查总数、视觉复核结果、仍需法务/商务确认的外部依赖。不得把未验证项写成通过。

- [ ] **Step 7: 提交最终修正**

```bash
git add demos/APP租号功能 tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md
git commit -m "fix(app-rental): pass v611 full-page acceptance"
```

- [ ] **Step 8: 更新任务看板**

重新读取 `GUANWANGGAID-3` 和全部评论；使用最新 `version` 添加完成评论，写明页面、截图、验证、提交和剩余风险；再将任务从 `in_progress` 移至 `in_review`，不得直接移到 `done`。

## 计划自查

- 规格覆盖：Tasks 2-4 覆盖七个核心页和详情；Tasks 5-9 覆盖新增任务页与状态；Task 10 覆盖 18 项/36 图与 PRD；Task 11 覆盖最终验收和看板。
- 占位扫描：计划不包含未决占位表达或未定义的概括式处理。
- 类型一致性：订单 Tab 始终为 `all/pending/usable`；搜索状态始终为 `orderSearch`；页面标识始终为设计文档 4.3 的 18 个 `pageId`。
- 范围一致性：Demo 只演示租号订单；CDKEY 仅参与价格共存规则和统一订单中心兼容说明，CDKEY PRD 与 Demo 不在修改范围。
