# GameHub APP Rental Detail and Checkout Flow Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all rental version, SKU, duration, quote, and payment choices from game detail into checkout while preserving the existing APP actions, rental lifecycle, and portrait/landscape continuity.

**Architecture:** Keep `盖世游戏APP租号功能demo.template.html` as the single UI and state source. Add a checkout quote model separate from the paid order, render shared selector components in portrait and landscape checkout, then generate the normal and annotated demos through the existing build script. Update the verification and screenshot scripts before refreshing the PRD and fixed-SHA image links.

**Tech Stack:** Single-file HTML/CSS/JavaScript, Node.js 24, Playwright, Markdown, jsDelivr fixed Git SHA.

---

## File Map

| File | Responsibility | Change |
|---|---|---|
| `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` | UI, state and interactions | Remove detail selectors; add detail action group, checkout quote, version/SKU/duration selectors and deferred order creation |
| `demos/APP租号功能/盖世游戏APP租号功能demo.html` | Generated normal demo | Regenerate from template |
| `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` | Annotated demo | Regenerate embedded style/script and update affected annotations |
| `tools/verify-app-rental-demo.mjs` | Automated acceptance | Replace old detail-SKU contracts with detail-entry and checkout-selector contracts |
| `tools/capture-app-rental-prd-screenshots.mjs` | PRD evidence | Capture corrected detail and checkout states in both orientations |
| `public/prd/app-rental/*.png` | PRD images | Refresh affected detail and checkout screenshots |
| `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` | Final product rules | Add V1.3 and correct C-end flow, state, event and image evidence |

### Task 1: Define failing detail and checkout contracts

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: Replace the old detail SKU assertions**

Add checks equivalent to:

```js
const detailFlow = await page.evaluate(() => ({
  text: document.querySelector('#appRentalDemo').innerText,
  hasRentEntry: Boolean(document.querySelector('[data-action="open-rental-checkout"]')),
  hasDetailSku: Boolean(document.querySelector('.portrait-detail .checkout-selector-group, .landscape-detail .checkout-selector-group')),
}));
assert(detailFlow.hasRentEntry, '详情缺少租号开玩入口');
assert(!detailFlow.hasDetailSku && !/版本选择|SKU选择|租期选择/.test(detailFlow.text), '详情仍承载交易选择');
```

- [ ] **Step 2: Add checkout selector and deferred-order assertions**

```js
const checkoutFlow = await page.evaluate(() => {
  window.__appRentalDemo.navigate('checkout');
  const before = window.__appRentalDemo.snapshot();
  return {
    hasVersion: Boolean(document.querySelector('[data-checkout-selector="version"]')),
    hasSku: Boolean(document.querySelector('[data-checkout-selector="sku"]')),
    hasDuration: Boolean(document.querySelector('[data-checkout-selector="duration"]')),
    hasQuote: Boolean(before.checkoutQuote),
    hasOrder: Boolean(before.order),
  };
});
assert(checkoutFlow.hasVersion && checkoutFlow.hasSku && checkoutFlow.hasDuration, '确认订单缺少版本、SKU或租期');
assert(checkoutFlow.hasQuote && !checkoutFlow.hasOrder, '进入确认订单应生成报价而非支付订单');
```

- [ ] **Step 3: Run the verifier and confirm the new checks fail**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL because the detail still renders SKU cards and checkout has no selector groups or separate quote.

### Task 2: Separate checkout quote from paid order

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: Add version and checkout quote state**

Use these stable values:

```js
const RENTAL_VERSIONS = Object.freeze([
  { id: 'standard', name: '标准版', originalPrice: 298 },
  { id: 'enhanced', name: '增强版', originalPrice: 368 },
  { id: 'deluxe', name: '豪华版', originalPrice: 428 },
]);

// state additions
selectedVersion: 'standard',
checkoutQuote: null,
```

- [ ] **Step 2: Add normalized SKU rules and quote generation**

Implement shared functions with the following behavior:

```js
function checkoutSkuOptions() {
  const scenario = SCENARIOS[state.scenario] || {};
  if (scenario.memberLibrary) {
    return [
      ...(scenario.trialEligible ? [{ id: 'trial', label: '首次体验' }] : []),
      { id: 'permanent', label: '单游戏永久畅玩' },
    ];
  }
  return [
    { id: 'hourly', label: '时租' },
    { id: 'daily', label: '日租' },
    { id: 'weekly', label: '周租' },
  ];
}

function refreshCheckoutQuote() {
  normalizeCheckoutSelection();
  const game = getSelectedGame();
  const version = RENTAL_VERSIONS.find((item) => item.id === state.selectedVersion) || RENTAL_VERSIONS[0];
  const offer = getSelectedOffer();
  state.checkoutQuote = {
    gameId: game.id,
    gameName: game.name,
    versionId: version.id,
    version: version.name,
    sku: offer.sku,
    durationLabel: offer.durationLabel,
    amount: offer.amount,
    gameOriginalPrice: version.originalPrice,
    priceVersion: 'APP-PRICE-2026-08-05',
    validUntil: Date.now() + 30 * 60 * 1000,
  };
  return JSON.parse(JSON.stringify(state.checkoutQuote));
}
```

- [ ] **Step 3: Create the order only when payment is confirmed**

Change `navigate('checkout')` to call `refreshCheckoutQuote()` instead of `ensureGameOrder()`. Change `payOrder()` to create a pending order from `checkoutQuote`, then move it to `allocating` in the same idempotent action.

- [ ] **Step 4: Run the verifier**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: The new quote/order timing checks pass; UI selector checks still fail.

### Task 3: Correct detail actions and checkout selectors

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: Replace detail SKU UI with adjacent game actions**

Portrait and landscape detail must render one shared action model:

```js
function renderDetailActions() {
  const action = resolveCurrentAction();
  const ownLabel = action.primary === 'download' ? '下载游戏' : action.primary === 'launch' ? '启动游戏' : '获取游戏';
  const canRent = ['rent-2h', 'trial', 'permanent'].includes(action.primary);
  return `<div class="detail-action-group">
    <button type="button" data-action="feedback">秒玩</button>
    <button type="button" data-action="feedback">${ownLabel}</button>
    ${canRent ? '<button class="detail-rent-action" type="button" data-primary-action="true" data-action="open-rental-checkout">租号开玩</button>' : ''}
  </div>`;
}
```

Remove `renderSkuOptions(model)` and `renderDurationOptions()` from both detail layouts.

- [ ] **Step 2: Add shared checkout selector components**

Add `renderVersionSelector()`, `renderSkuSelector()`, `renderDurationSelector()` and `renderCheckoutSelectors()` with stable hooks:

```html
<section class="checkout-selector-group" data-checkout-selector="version">...</section>
<section class="checkout-selector-group" data-checkout-selector="sku">...</section>
<section class="checkout-selector-group" data-checkout-selector="duration">...</section>
```

Use `data-action="select-version"`, `data-action="select-checkout-sku"` and `data-action="select-duration"` on option buttons.

- [ ] **Step 3: Place selectors in both checkout layouts**

Portrait order: game card → selectors → amount/payment → benefits. Landscape order: left game/benefits; right selectors → amount/payment.

- [ ] **Step 4: Add interaction handlers**

Each selector handler updates state, clears only an unsubmitted quote, calls `refreshCheckoutQuote()`, and rerenders. It must not allocate an account or create a paid order.

- [ ] **Step 5: Run build and verifier**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: Detail and checkout flow checks pass in portrait and landscape.

### Task 4: Update annotation, screenshots and visual evidence

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Replace: `public/prd/app-rental/02-detail-portrait.png`
- Replace: `public/prd/app-rental/02-detail-landscape.png`
- Replace: `public/prd/app-rental/03-checkout-portrait.png`
- Replace: `public/prd/app-rental/03-checkout-landscape.png`

- [ ] **Step 1: Update annotation copy and targets**

The detail annotation must say “详情仅提供租号开玩入口”；checkout annotations must separately cover version, SKU, duration, amount and payment.

- [ ] **Step 2: Regenerate normal and annotated demos**

Run: `node tools/build-app-rental-demo.mjs`

Expected: `BUILD` and `SYNC` both succeed.

- [ ] **Step 3: Capture all PRD screenshots**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: All configured PNG files are generated and the detail/checkout screenshots show the corrected flow.

- [ ] **Step 4: Run visual checks**

Check that selectors do not overflow, portrait footer does not cover content, landscape columns remain readable, and detail actions stay on one line.

### Task 5: Update PRD through `/to-prd`

**Files:**
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`

- [ ] **Step 1: Add version V1.3**

Add a highlighted version row dated `2026.08.05` describing the detail-entry and checkout-selection correction.

- [ ] **Step 2: Correct C-end rows**

Update “游戏详情与主操作判断”“更多租期与套餐选择”“确认订单与游戏支付” so that detail contains no SKU selection and checkout contains version/SKU/duration selectors.

- [ ] **Step 3: Correct state flow and events**

State that entry creates a quote only; payment confirmation creates and locks the order. Update relevant tracking triggers to distinguish `rental_checkout_view`, version/SKU/duration selection and final order creation.

- [ ] **Step 4: Run PRD self-review**

Check the C-end table, B-end table, exceptions, status flow, tracking, domestic/overseas differences, and fixed-SHA image rules.

### Task 6: Publish and verify

**Files:**
- Commit only the files listed in this plan.

- [ ] **Step 1: Run all automated verification**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: All checks and screenshot generation pass.

- [ ] **Step 2: Commit demo and screenshots**

```powershell
git add -- "demos/APP租号功能" tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental
git commit -m "fix(app-rental): move rental choices into checkout"
git push origin HEAD:master
```

- [ ] **Step 3: Replace PRD image SHA and commit PRD**

Replace all 36 app-rental image URLs with the 40-character SHA of the screenshot commit, then commit and push the PRD.

- [ ] **Step 4: Verify remote assets and previews**

Require every PNG URL to return HTTP `200` and `Content-Type: image/png`. Require both GitHub Pages demos to return HTTP `200` and `Content-Type: text/html`.

## Self-Review

- Every design requirement maps to one implementation task.
- State names are consistent: `selectedVersion`, `selectedSku`, `selectedHours`, `checkoutQuote`, `order`.
- No unrelated page, popup, SKU or backend feature is added.
- The plan contains no incomplete implementation placeholder.
