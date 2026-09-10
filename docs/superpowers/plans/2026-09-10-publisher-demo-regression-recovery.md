# Publisher Demo Regression Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore regional pricing and verified locale synchronization in the unified 01/02 publisher demo, and move the developer/operations switch out of the product header into a floating Demo control.

**Architecture:** Keep release territories, store locales, and source modules as the three single sources of truth. Port the previously generated-only regional pricing implementation back into the publisher runtime and review modules, reuse the existing locale model after stabilizing its browser setup, and render the portal switch once at the shell stage instead of inside either top bar.

**Tech Stack:** Vanilla JavaScript IIFEs, CSS, IndexedDB-backed demo state, Node.js build scripts, Node test runner, Playwright Core with Chrome.

---

### Task 1: Lock the three restored contracts with browser tests

**Files:**
- Modify: `tests/developer-backend/game-profile-pricing.browser.test.mjs`
- Modify: `tests/developer-backend/game-release-review-pricing.browser.test.mjs`
- Modify: `tests/developer-backend/game-profile-locales.browser.test.mjs`
- Create: `tests/developer-backend/portal-floating-switch.browser.test.mjs`

- [ ] **Step 1: Point end-to-end tests at the formal unified 02 output**

Use the same URL in profile tests:

```js
const url = pathToFileURL(path.resolve(
  'demos/开发者后台一期/02-游戏创建与发行demo.html'
)).href + '#/P02-01';
```

- [ ] **Step 2: Make profile tests create their own authenticated developer state**

Before opening the game list, clear browser storage and establish the registered demo state through the existing runtime storage API or the same localStorage keys used by the focused 01/02 regression fixture. Do not rely on the developer's current browser data.

```js
await page.goto(url);
await page.evaluate(async () => {
  localStorage.clear();
  indexedDB.deleteDatabase('gamehub-publisher-profile');
});
await page.reload();
```

- [ ] **Step 3: Keep the existing regional pricing assertions and add the formal entry assertion**

The test must prove the base price and only selected overrides render:

```js
assert.equal(await page.locator('[data-sku-regional-base]').count(), 1);
assert.deepEqual(
  await page.locator('[data-sku-price-zone]').evaluateAll(rows => rows.map(row => row.dataset.skuPriceZone)),
  ['US', 'SG', 'JP']
);
```

- [ ] **Step 4: Add a floating portal switch test**

Assert that the header has no portal switch, the stage has one floating Demo switch, and the existing action changes sides:

```js
assert.equal(await page.locator('.top-bar [data-portal-action="switch-portal-side"]').count(), 0);
const switcher = page.locator('.portal-demo-switch');
assert.match(await switcher.innerText(), /Demo.*切换运营后台/);
await switcher.click();
await page.locator('.product-frame[data-role="operations"]').waitFor();
assert.match(await page.locator('.portal-demo-switch').innerText(), /Demo.*切换开发者前台/);
```

- [ ] **Step 5: Run the focused tests and confirm the new contracts fail before implementation**

Run:

```powershell
node --test tests/developer-backend/game-profile-pricing.browser.test.mjs tests/developer-backend/game-profile-locales.browser.test.mjs tests/developer-backend/portal-floating-switch.browser.test.mjs
```

Expected: regional pricing or floating switch assertions fail against the current build; the locale test reaches its locale assertions without depending on prior browser storage.

### Task 2: Restore SKU base and territory override pricing in source

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-release-regions.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-profile.css`
- Test: `tests/developer-backend/game-profile-pricing.browser.test.mjs`

- [ ] **Step 1: Expose the territory-to-currency source from release regions**

Add a lookup owned by `PublisherReleaseRegions` and reuse it everywhere:

```js
const territoryCurrencies = {
  US: 'USD', JP: 'JPY', SG: 'SGD', DE: 'EUR', BR: 'BRL', CN: 'CNY'
};
const currencyForTerritory = code => territoryCurrencies[code] || 'USD';
```

Export `currencyForTerritory` with the existing region helpers.

- [ ] **Step 2: Normalize SKU strategy and override prices**

Update the SKU defaults and normalizer:

```js
const emptySku = (type = 'dlc', index = 0) => ({
  skuId: type === 'base_game' ? 'BASE' : `DLC-${String(index + 1).padStart(3, '0')}`,
  type,
  title: type === 'base_game' ? '基础游戏' : `DLC ${index + 1}`,
  installContentRef: '',
  pricingModel: 'free',
  pricingStrategy: 'uniform',
  listPrice: '',
  discountPrice: '',
  regionalPrices: {},
  discountStartAt: '',
  discountEndAt: ''
});
```

Normalize `pricingStrategy` to `uniform|regional` and `regionalPrices` to `{ [territoryCode]: { listPrice, discountPrice } }` while preserving legacy drafts.

- [ ] **Step 3: Derive active override territories from release settings**

Add helpers equivalent to:

```js
const pricingStrategyFor = (sku, draft) =>
  draft.releaseConfig?.mode === 'domestic' ? 'uniform' :
  sku.pricingStrategy === 'regional' ? 'regional' : 'uniform';

const activeOverrideZonesFor = (sku, draft) =>
  selectedGlobalTerritoryCodes(draft)
    .filter(code => sku.regionalPrices?.[code])
    .map(code => ({ code, currency: window.PublisherReleaseRegions.currencyForTerritory(code) }));
```

Do not delete inactive draft overrides when a release territory is temporarily removed.

- [ ] **Step 4: Render the pricing strategy, USD base price, and override picker**

For paid global SKUs render `data-sku-pricing-strategy`, `data-sku-regional-base`, `data-sku-override-add`, searchable `data-sku-override-option`, and rows keyed by `data-sku-price-zone`. Each row binds to:

```js
`catalog.${sku.type === 'base_game' ? 'baseGame' : `dlcs.${index - 1}`}.regionalPrices.${code}.listPrice`
```

The inherited count equals selected release territories minus active overrides.

- [ ] **Step 5: Bind add, search, confirm, remove, and strategy switch events**

Stage selections until confirmation, then create missing override records:

```js
sku.regionalPrices[code] ||= { listPrice: '', discountPrice: '' };
```

Removing a visible override deletes that territory's active override record and immediately returns it to base-price inheritance. Switching strategies preserves the other strategy's draft values until submission snapshot normalization.

- [ ] **Step 6: Validate and snapshot only effective pricing**

Require a valid base price for paid SKUs. For regional pricing, require every active override list price, ensure override discounts are below the corresponding override list price, and use the shared valid discount period. In `submissionSnapshot`, force domestic to `uniform`, and set `regionalPrices = {}` for free, uniform, and inactive territory entries.

- [ ] **Step 7: Restore responsive pricing styles from the historical implementation**

Add focused classes for `.pgp-pricing-strategy`, `.pgp-regional-pricing`, `.pgp-regional-base`, `.pgp-regional-overrides`, the picker, rows, and 390px stacking. The region name and currency remain visible without horizontal scrolling.

- [ ] **Step 8: Run the profile pricing test**

Run:

```powershell
node --test tests/developer-backend/game-profile-pricing.browser.test.mjs
```

Expected: every test passes at 1440px and 390px.

### Task 3: Restore review validation and immutable pricing snapshots

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-review-store.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-review.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-review.css`
- Test: `tests/developer-backend/game-release-review-pricing.browser.test.mjs`

- [ ] **Step 1: Normalize review SKU pricing fields**

For each SKU, preserve:

```js
{
  pricingModel,
  pricingStrategy: pricingStrategy === 'regional' ? 'regional' : 'uniform',
  listPrice,
  discountPrice,
  regionalPrices,
  discountStartAt,
  discountEndAt
}
```

- [ ] **Step 2: Validate regional review submissions**

Use the submitted release territory snapshot. Reject missing base prices, override territories outside the submitted range, invalid override prices, invalid discounts, and domestic submissions carrying regional pricing.

- [ ] **Step 3: Render the submitted base price and overrides**

For a regional SKU show the USD base price, the count of territories inheriting it, and one row per submitted override with territory label, currency, list price, optional discount price, and shared discount period.

- [ ] **Step 4: Keep submitted versions immutable**

Continue reading review details from the submission record rather than the mutable profile draft. Extend the existing immutability test so changing `regionalPrices.JP.listPrice` in the profile does not change the submitted value.

- [ ] **Step 5: Run review pricing tests**

Run:

```powershell
node --test tests/developer-backend/game-release-review-pricing.browser.test.mjs
```

Expected: global uniform, global regional, domestic, validation, and immutable snapshot cases pass.

### Task 4: Verify one locale set drives basic information and assets

**Files:**
- Modify only if required: `demos/开发者后台一期/src/runtime/publisher-game-names.js`
- Modify only if required: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify only if required: `demos/开发者后台一期/src/runtime/publisher-storage-schema.js`
- Test: `tests/developer-backend/game-profile-locales.browser.test.mjs`

- [ ] **Step 1: Keep English as the empty-state default**

The locale normalizer must continue to use:

```js
const configured = source.storeLocales?.enabled || source.enabled || source.nameLanguages;
const nameLanguages = [...new Set(
  (Array.isArray(configured) ? configured : ['en']).filter(code => codes.includes(code))
)];
```

- [ ] **Step 2: Confirm both sections bind to the same draft array**

`syncContent()` must assign the same locale values to `storeLocales.enabled` and `assetLanguageSettings.nameLanguages`, then initialize both stores:

```js
draft.nameLanguages.forEach(code => {
  draft.localizedContent[code] ||= { tagline: '', description: '', developerWords: '' };
  draft.localizedAssets[code] ||= emptyAssets();
});
```

- [ ] **Step 3: Preserve removed locale drafts but prune submission snapshots**

Do not delete `gameNames[code]`, `localizedContent[code]`, or `localizedAssets[code]` when a locale is disabled. Filter all three by `storeLocales.enabled` when creating the submission snapshot.

- [ ] **Step 4: Run the locale test**

Run:

```powershell
node --test tests/developer-backend/game-profile-locales.browser.test.mjs
```

Expected: English is the only initial tab; adding Japanese creates tabs in both basic information and assets; save/reopen preserves Japanese; disabling Japanese prunes only the submission snapshot.

### Task 5: Move portal switching into a floating Demo control

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `demos/开发者后台一期/src/styles/shell.css`
- Test: `tests/developer-backend/portal-floating-switch.browser.test.mjs`

- [ ] **Step 1: Remove the switch from top bar tool groups**

Build the header without `portalSwitch`:

```js
const developerTools = `${consoleLink}${help}${languageSwitch}${accountBlock}${login}`;
const operationsTools = `${accountBlock}${help}`;
```

- [ ] **Step 2: Render one floating control at portal stage level**

Add a focused helper:

```js
const renderPortalDemoSwitch = ({ role, redacted, isLogin, account, language }) => {
  if (redacted || isLogin || !account) return '';
  const label = role === 'operations'
    ? '切换开发者前台'
    : language === 'en' ? 'Switch to operations' : '切换运营后台';
  return `<button class="portal-demo-switch" type="button" data-portal-action="switch-portal-side" title="${e(label)}">
    <small>Demo</small>${icon('chart')}<span>${e(label)}</span>
  </button>`;
};
```

Append it after `</main>` and before the closing `.portal-stage` so it is independent of the product header and workspace.

- [ ] **Step 3: Style desktop and narrow-screen placement**

Use `position: fixed`, a right-side mid-low position on desktop, and a safe-area-aware bottom-right position on narrow screens. Keep its `z-index` above page content and below modal layers. Add hover and `:focus-visible` states without reusing `.top-*` selectors.

- [ ] **Step 4: Run the floating switch test**

Run:

```powershell
node --test tests/developer-backend/portal-floating-switch.browser.test.mjs
```

Expected: no top-bar switch; one floating Demo switch on eligible developer and operations pages; no switch on login or redacted pages; bidirectional navigation preserves profile draft state.

### Task 6: Rebuild all unified outputs and run regression

**Files:**
- Modify (generated): `demos/开发者后台一期/01-开发者平台与资料demo.html`
- Modify (generated): `demos/开发者后台一期/02-游戏创建与发行demo.html`
- Modify (generated aliases): outputs listed under modules `01` and `02` in `demos/开发者后台一期/src/modules.json`

- [ ] **Step 1: Build module 01 and module 02 from source**

Run:

```powershell
node demos/开发者后台一期/build.mjs --module=01
node demos/开发者后台一期/build.mjs --module=02
```

Expected: both commands report the latest PRD contract verified and complete without error.

- [ ] **Step 2: Run focused publisher regressions**

Run:

```powershell
node --test tests/developer-backend/game-profile-pricing.browser.test.mjs tests/developer-backend/game-profile-locales.browser.test.mjs tests/developer-backend/game-release-review-pricing.browser.test.mjs tests/developer-backend/portal-floating-switch.browser.test.mjs
```

Expected: all focused tests pass with zero page errors.

- [ ] **Step 3: Run the existing unified 01/02 regression suite**

Run the same focused regression command used for commit `cad0ee65`, plus any publisher tests whose source modules changed. Expected: the previous 46 checks remain green and the new pricing, locale, and floating-switch checks pass.

- [ ] **Step 4: Review visual evidence**

Capture and inspect 1440px and 390px screenshots of regional pricing, Japanese locale tabs in both sections, developer floating switch, and operations floating switch. Confirm no clipping, overlap, stale header entry, or mismatched values.

- [ ] **Step 5: Commit only the planned source, generated outputs, tests, and plan**

Stage exact paths from this plan. Do not stage unrelated working-tree changes.

```powershell
git diff --cached --name-status
git commit -m "fix: restore publisher pricing and demo controls"
```
