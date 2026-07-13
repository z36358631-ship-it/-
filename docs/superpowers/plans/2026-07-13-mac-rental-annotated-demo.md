# Mac Rental Annotated Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one browser-openable annotated HTML demo that combines the six existing Mac rental screens with four newly derived operations modules.

**Architecture:** Create a single HTML document with a fixed annotation shell and a data-driven renderer. Shared in-memory product, account, order, and metric data feed both the Mac client and operations views so cross-screen values remain consistent. Page templates are rendered into one stable canvas; delegated actions update state and rerender without iframes.

**Tech Stack:** HTML5, scoped CSS, vanilla JavaScript, existing remote image assets, Chrome/Edge headless verification.

---

## File Structure

- Create: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
  - Owns the three-column annotation shell, all ten screens, mock data, interactions, annotation data, scale calculation, and smoke tests.
- Reference only: `Mac端demo/mac端租号功能/探索页改动.html`
- Reference only: `Mac端demo/mac端租号功能/找游戏页改动.html`
- Reference only: `Mac端demo/mac端租号功能/搜索结果页改动.html`
- Reference only: `Mac端demo/mac端租号功能/游戏详情改动.html`
- Reference only: `Mac端demo/mac端租号功能/租号中心-订单确认.html`
- Reference only: `Mac端demo/mac端租号功能/租号中心-我的订单.html`
- Reference only: `demos/steam租号-后台demo.html`
- Test artifacts only: `.tmp/mac-rental-annotated-review/`

The six source pages remain untouched. The old Steam rental backend supplies only density and light-theme layout reference.

### Task 1: Create The Annotation Shell And Shared State

**Files:**
- Create: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Verify the target does not already exist**

Run:

```powershell
Test-Path 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
```

Expected: `False`. If it is `True`, inspect the file and preserve any user-authored content before proceeding.

- [ ] **Step 2: Add the document shell**

Create one document with these stable regions:

```html
<body data-mode="mac" data-page="explore" data-badges="hidden">
  <div class="annotation-app">
    <aside id="flowNav" class="flow-nav"></aside>
    <main class="stage">
      <button id="panelRestore" class="panel-restore" data-action="toggle-panel" aria-label="展开标注面板">›</button>
      <div id="canvasViewport" class="canvas-viewport">
        <section id="demoCanvas" class="demo-canvas" aria-live="polite"></section>
      </div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div id="confirmLayer" class="confirm-layer" hidden></div>
    </main>
    <aside id="annotationPanel" class="annotation-panel"></aside>
  </div>
</body>
```

Define CSS variables for `--nav-width:220px`, `--anno-width:400px`, `--mac-width:1076px`, `--mac-height:734px`, `--admin-width:1800px`, and `--admin-height:1300px`. Keep shell cards at `8px` radius or less and page canvases at their source radius.

- [ ] **Step 3: Add the shared state contract**

Use these exact top-level keys:

```js
const state = {
  mode: 'mac',
  page: 'explore',
  panelOpen: true,
  badgeVisible: false,
  annotationTab: 'interaction',
  selectedProductIds: new Set(),
  selectedAccountIds: new Set(),
  checkout: { gameId: 'elden-ring', version: 'standard', period: '3d', payment: 'alipay' },
  orderFilter: 'all',
  orderSearch: '',
  stats: { range: '7d', game: 'all', version: 'all', platform: 'steam', sort: 'orders' },
  auditLog: []
};
```

Define immutable navigation arrays `MAC_PAGES` with six entries and `ADMIN_PAGES` with `products`, `accounts`, `orders`, and `stats`.

- [ ] **Step 4: Add shared render and action entry points**

Define these functions before page-specific renderers:

```js
const SCREEN_RENDERERS = { mac: {}, admin: {} };
const ACTION_HANDLERS = {};

function renderApp() {
  renderFlowNav();
  renderCanvas();
  renderAnnotationPanel();
  requestAnimationFrame(updateScale);
}

function renderCanvas() {
  const renderer = SCREEN_RENDERERS[state.mode][state.page];
  if (!renderer) throw new Error(`Missing renderer: ${state.mode}/${state.page}`);
  document.getElementById('demoCanvas').innerHTML = renderer();
}

function dispatchAction(action, element) {
  const handler = ACTION_HANDLERS[action];
  if (!handler) throw new Error(`Missing action handler: ${action}`);
  handler(element);
}

function navigate(mode, page) {
  state.mode = mode;
  state.page = page;
  document.body.dataset.mode = mode;
  document.body.dataset.page = page;
  renderApp();
}
```

Attach one `document.addEventListener('click', ...)` handler that reads `data-action`; do not attach repeated listeners after each render.

- [ ] **Step 5: Run the static shell check**

Run:

```powershell
rg -n 'id="flowNav"|id="demoCanvas"|id="annotationPanel"|const state =|function renderApp|function dispatchAction' 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
```

Expected: all six contracts are present.

- [ ] **Step 6: Commit the shell**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit -m "feat: scaffold Mac rental annotated demo"
```

### Task 2: Add Shared Rental Data And Mac Client Screens

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Define normalized mock data**

Add arrays `games`, `products`, `accounts`, and `orders`. Keep these identifiers stable across every renderer:

```js
const products = [{
  id: 'elden-ring-steam', gameId: 'elden-ring', platform: 'steam', status: 'online',
  versions: [
    { id: 'standard', name: '标准版', prices: { '3d': 6, '7d': 28, '30d': 99, permanent: 399 } },
    { id: 'enhanced', name: '增强版', prices: { '3d': 9, '7d': 42, '30d': 148.5, permanent: 598.5 } },
    { id: 'deluxe', name: '豪华版', prices: { '3d': 12, '7d': 56, '30d': 198, permanent: 798 } }
  ]
}];
```

Each account must include `id`, `maskedName`, `providerId`, `gameId`, `version`, `status`, `orderId`, `lastCheck`, and `rentCount`. Each order must include product, account, payment, rental, refund, after-sales, and status fields.

- [ ] **Step 2: Implement six Mac renderers**

Define these exact functions, then register them with this complete route map:

```js
Object.assign(SCREEN_RENDERERS.mac, {
  explore: renderMacExplore,
  catalog: renderMacCatalog,
  search: renderMacSearch,
  detail: renderMacDetail,
  checkout: renderMacCheckout,
  orders: renderMacOrders
});
```

Preserve the source pages' recognizable structures:

- Explore: vertical icon rail, large game hero, price/in-rent metadata, three recommendation cards.
- Catalog: page title, sorting/filter controls, four-column game grid, rental metadata.
- Search: blurred background and centered results dialog with rental price and stock.
- Detail: media area, player rating, platform metadata, `秒玩` / `获取游戏` / `租号开玩` actions.
- Checkout: benefit list, version and period selectors, dynamic amount, payment selector, QR payment area.
- Orders: status tabs, search, mixed order states, state-specific actions.

- [ ] **Step 3: Implement the Mac conversion path**

Use delegated actions with these values:

```text
open-detail, open-search, rent-now, select-version, select-period,
select-payment, simulate-payment, filter-orders, search-orders,
launch-order, renew-order, cancel-order, open-after-sales, delete-order
```

`rent-now` navigates to checkout. `simulate-payment` creates or updates a renting order and navigates to Mac orders. Version and period changes must update the displayed amount from `products`.

- [ ] **Step 4: Verify Mac content contracts**

Run:

```powershell
rg -n 'renderMacExplore|renderMacCatalog|renderMacSearch|renderMacDetail|renderMacCheckout|renderMacOrders|data-action="rent-now"|data-action="simulate-payment"' 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
```

Expected: six renderers and both conversion actions are present.

- [ ] **Step 5: Commit the Mac flow**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit -m "feat: add Mac rental client flow"
```

### Task 3: Add Product And Account Operations

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Implement product management**

Define `renderAdminProducts()` with summary cards, filters, selectable rows, expandable versions, prices, current stock, occupied stock, and front-end exposure status.

Support these actions:

```text
toggle-product, select-product, select-all-products, copy-product,
copy-version, batch-product-online, batch-product-offline,
batch-price, sync-product-stock, export-products
```

Copy operations must generate new product/version identifiers and never copy account credentials. Batch controls remain disabled until at least one product is selected.

- [ ] **Step 2: Implement account resource management**

Define `renderAdminAccounts()` with real-time cards for total, rentable, occupied, abnormal, and offline accounts. Show masked account identity, provider resource ID, game/version, current order, last health check, and state.

Support these actions:

```text
sync-accounts, select-account, select-all-accounts, check-account,
release-account, offline-account, online-account, replace-account,
batch-check-accounts, batch-offline-accounts
```

For occupied accounts, `offline-account` opens a confirmation offering `订单结束后下架` and `立即换号并下架`. Both branches append an audit log entry.

- [ ] **Step 3: Add operation feedback**

All batch and high-risk actions must call `openConfirm`, show the affected count, then use `showToast` and `addAudit`. Partial batch failure must report both success and failure counts.

- [ ] **Step 4: Verify administration contracts**

Run:

```powershell
rg -n 'renderAdminProducts|renderAdminAccounts|copy-product|batch-product-offline|sync-accounts|release-account|立即换号并下架|addAudit' 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
```

Expected: every listed contract appears.

- [ ] **Step 5: Commit product and account operations**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit -m "feat: add rental product and account operations"
```

### Task 4: Add Orders, After-Sales, And Effect Statistics

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Implement the unified order workbench**

Define `renderAdminOrders()` with tabs for `all`, `pending`, `renting`, `ended`, `refunded`, `failed`, and `after-sales`. Include combined filters, order details, product/version, payment, rental period, linked account, after-sales state, and risk flags.

Support these actions:

```text
open-order, admin-renew, end-order, replace-order-account,
refund-order, compensate-order, release-order-account, export-orders
```

Replacing an account must select a rentable account with the same game and version. Refund, compensation, end, replacement, and force release require confirmation and audit entries.

- [ ] **Step 2: Implement the statistics model**

Define `statsData` with `today`, `7d`, and `30d` entries. Each entry contains:

```js
{
  paidOrders, paidAmount, paidUsers,
  inventory: { total, rentable, occupied, abnormal, offline },
  accountUsageRate, accountReuseRate, userRerentRate,
  orderTrend, amountTrend, usageTrend, funnel, gameRows
}
```

Use these definitions in visible tooltips:

- Account usage rate = occupied account-hours / rentable account-hours.
- Account reuse rate = accounts rented at least twice / accounts rented at least once.
- User rerent rate = paying users with at least two paid orders / paying users.
- A zero denominator displays `--`.

- [ ] **Step 3: Implement the effect statistics page**

Define `renderAdminStats()` with:

- range and game/version/platform filters;
- business, inventory, and efficiency KPI groups;
- order/amount trend chart;
- account usage trend chart;
- exposure-to-login conversion funnel;
- sortable game/version detail table;
- comparison and export controls.

Use inline SVG for charts so the single file has no chart-library dependency. Current inventory cards show a `实时` label; period metrics show the chosen range and last update time.

- [ ] **Step 4: Verify order and metric contracts**

Run:

```powershell
rg -n 'renderAdminOrders|renderAdminStats|accountUsageRate|accountReuseRate|userRerentRate|租号曝光|一键上号成功|refund-order|replace-order-account' 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
```

Expected: both administration pages, all three rate fields, funnel endpoints, and risky order actions are present.

- [ ] **Step 5: Commit orders and statistics**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit -m "feat: add rental orders and effectiveness statistics"
```

### Task 5: Add Annotation Data And Cross-Panel Linking

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Define annotation records**

Create one `annotations` array with this exact schema:

```js
{
  id: '1',
  mode: 'mac',
  page: 'explore',
  tab: 'interaction',
  title: '租号价格展示',
  body: '展示当前游戏最低可租价格和可租账号数量。',
  target: 'explore-rent-meta',
  tag: 'interactive'
}
```

Use numeric IDs for page interactions, `G1...` for global logic, and `E1...` for exceptional cases. IDs must be unique across Mac and administration modes.

- [ ] **Step 2: Render annotation controls**

The right panel must include:

- `交互说明` and `异常&边界` tabs;
- `显示标号` toggle;
- collapse control;
- page-grouped annotation sections;
- tag styling for interactive, difference, and automatic behavior.

- [ ] **Step 3: Link annotations to canvas elements**

Every annotated target uses `data-anno-target`. Clicking an annotation navigates to its mode/page, waits for render completion, then adds `.annotation-flash` to the target. Badge visibility renders an absolutely positioned badge beside each target without changing layout dimensions.

- [ ] **Step 4: Cover required exceptional cases**

Add visible exception annotations for no inventory, invalid price, search failure, expired QR code, duplicate payment, occupied-account offline, provider sync delay, no replacement stock, duplicate refund, zero metric denominator, and insufficient permissions.

- [ ] **Step 5: Verify annotation uniqueness**

Add `validateAnnotations()` that returns duplicate IDs and missing targets. It must run inside the smoke test and fail when either list is non-empty.

- [ ] **Step 6: Commit annotation behavior**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit -m "feat: add rental demo annotations"
```

### Task 6: Add Responsive Scaling, Fallbacks, And Smoke Tests

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Implement stable canvas scaling**

Use `ResizeObserver` on `canvasViewport`. `updateScale()` calculates the smaller of available-width/design-width and available-height/design-height, capped at `1`. The wrapper reserves scaled width and height so navigation, badges, loading content, and panel collapse cannot shift the outer layout.

- [ ] **Step 2: Add image and network fallbacks**

Each remote image receives fixed dimensions or `aspect-ratio`, `loading="lazy"` below the first view, and an `error` handler that applies a dark fallback background and hides the broken image. CDN failure must not leave a blank canvas because layout CSS is embedded in the file.

- [ ] **Step 3: Add the browser smoke-test contract**

Expose this smoke-test implementation after all screen renderers are registered:

```js
const nextPaint = () => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))
);

window.__demoSmoke = async function () {
  const results = [];
  const check = (name, pass) => results.push({ name, pass: Boolean(pass) });
  const canvas = document.getElementById('demoCanvas');

  for (const item of MAC_PAGES) {
    navigate('mac', item.id);
    await nextPaint();
    check(`mac:${item.id}`, canvas.childElementCount > 0);
  }

  const price3d = getCheckoutPrice();
  state.checkout.period = '7d';
  navigate('mac', 'checkout');
  await nextPaint();
  check('checkout-price-change', getCheckoutPrice() !== price3d);

  for (const item of ADMIN_PAGES) {
    navigate('admin', item.id);
    await nextPaint();
    check(`admin:${item.id}`, canvas.childElementCount > 0);
  }

  state.stats.range = '30d';
  navigate('admin', 'stats');
  await nextPaint();
  check('stats-range', document.body.textContent.includes('近 30 天'));

  const annotationCheck = validateAnnotations();
  check('annotation-ids', annotationCheck.duplicates.length === 0);
  check('annotation-targets', annotationCheck.missingTargets.length === 0);

  return { pass: results.every(item => item.pass), results };
};
```

When `smoke=1` is in the query string, run the function after initial render and set `document.body.dataset.smokeStatus` to `pass` or `fail`. Append a hidden `<pre id="smokeResult">` with JSON results.

- [ ] **Step 4: Run static checks**

Run:

```powershell
$forbidden = @('lorem ipsum', ('implement' + ' later'), ('fill in' + ' details')) -join '|'
rg -n $forbidden 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html'
```

Expected: no matches.

Run:

```powershell
$html = Get-Content 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html' -Raw -Encoding utf8
@('<!DOCTYPE html>','renderMacExplore','renderAdminProducts','renderAdminAccounts','renderAdminOrders','renderAdminStats','validateAnnotations','__demoSmoke') | ForEach-Object { if (-not $html.Contains($_)) { throw "Missing contract: $_" } }
```

Expected: command exits successfully.

- [ ] **Step 5: Run Chrome smoke tests**

Run:

```powershell
$path = (Resolve-Path 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html').Path
$url = ([System.Uri]::new($path).AbsoluteUri) + '?smoke=1'
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --virtual-time-budget=5000 --dump-dom $url | Set-Content '.tmp\mac-rental-smoke.html' -Encoding utf8
Select-String -Path '.tmp\mac-rental-smoke.html' -Pattern 'data-smoke-status="pass"'
```

Expected: one matching `<body ... data-smoke-status="pass">` line.

- [ ] **Step 6: Capture two viewport screenshots**

Create `.tmp/mac-rental-annotated-review/`, then run Chrome at `1400x900` for Mac explore and at `1920x1080` for administration stats using query strings `?mode=mac&page=explore` and `?mode=admin&page=stats`. Inspect both images with `view_image` and correct overlaps, clipping, blank canvases, broken assets, or unreadable labels.

- [ ] **Step 7: Verify original files are untouched**

Run:

```powershell
git status --short -- 'Mac端demo/mac端租号功能'
```

Expected: only `Mac端租号功能-标注版.html` is newly tracked or modified; the six source files have no modifications caused by this work.

- [ ] **Step 8: Commit final verification fixes**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit -m "fix: verify Mac rental annotated demo"
```

## Plan Self-Review Mapping

- Six Mac source pages: Task 2.
- Client conversion path and shared state: Tasks 1-2.
- Product configuration and bulk copying: Task 3.
- Account health, occupancy, release, and offline handling: Task 3.
- Unified orders and after-sales: Task 4.
- Effect metrics, inventory, usage, reuse, rerent, funnel, and detail table: Task 4.
- Annotation shell, numbering, highlighting, and exceptions: Task 5.
- Mac/admin canvas sizes, scaling, fallbacks, screenshots, and smoke checks: Task 6.
- Source-file preservation: File Structure and Task 6.
