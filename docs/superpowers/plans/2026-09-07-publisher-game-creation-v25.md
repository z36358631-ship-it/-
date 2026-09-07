# Publisher Game Creation V2.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade module 02 and the module 01 review console so game creation stays language-neutral while post-creation release preparation supports single-scope global/domestic releases, localized store materials, base-game and DLC SKUs, independently reviewed qualifications, immutable release versions, and withdrawal/resubmission.

**Architecture:** Keep the existing single-file HTML build and the `PublisherGameProfile` façade, but split persisted state into profile, locales, catalog, release configuration, qualification applications, and release submissions. Introduce one shared IndexedDB schema runtime loaded by both module 01 and 02, then adapt the developer and reviewer UIs to normalize both V2.5 and legacy snapshots. Preserve the current full-render model and its focus/scroll restoration contract.

**Tech Stack:** Vanilla JavaScript IIFEs, IndexedDB, Blob/structured clone, HTML/CSS, Node.js `node:test`, Playwright Core with local Chrome, Markdown PRD.

---

## File map and ownership

- Shared storage and migration: `demos/开发者后台一期/src/runtime/publisher-storage-schema.js`.
- Release scope and territory picker: `publisher-release-regions.js` and `publisher-release-regions.css`.
- Language-neutral project creation: `publisher-game-create.js` and `publisher-game-create.css`.
- Developer domain/UI: `publisher-game-profile.js`, `publisher-game-qualifications.js`, `publisher-game-profile.css`.
- Developer persistence: `publisher-profile-store.js`.
- Navigation and integration: `templates.js`, `app.js`, `shell.js`, `templates.css`, `build.mjs`.
- Reviewer domain/UI: `publisher-game-review-store.js`, `publisher-game-review.js`, `publisher-game-review.css`.
- Qualification reviewer: `publisher-qualification-review-store.js`, `publisher-qualification-review.js`.
- Tests: existing `game-profile-*`, `publisher-release-regions*`, `game-release-review-*`, `game-qualifications.test.mjs`, plus the new migration and qualification lifecycle tests below.
- Product artifacts: module 01/02 PRDs, V2.5 workflow state, verification report, and generated module 01/02 HTML files.

The working tree already contains unrelated and uncommitted changes. Do not run checkout, reset, clean, or broad formatting. Each commit must use `git commit --only` with the paths owned by that task.

## Frozen V2.5 data contract

```js
{
  schemaVersion: 2,
  gameKey: 'created-…',
  gameProfileDraft: {
    gameNames: { en: 'Star Expedition', zh: '星海远征' },
    defaultLocale: 'en',
    currentLocale: 'en',
    localizedContent: { en: { tagline: '', description: '' }, zh: { tagline: '', description: '' } },
    localizedAssets: { en: { icon: null, landscape: [], portrait: [], screenshots: [], trailer: null, gameplay: null } },
    genres: [], platforms: ['Windows'], relationship: 'developer_publisher', developerName: '',
    website: '', playerGroupName: '', playerGroupNumber: ''
  },
  storeLocales: { enabled: ['en'], default: 'en', current: 'en' },
  catalog: {
    baseGame: { skuId: 'BASE', type: 'base_game', title: '基础游戏', installContentRef: '', pricingModel: 'free', listPrice: '', discountPrice: '', discountStartAt: '', discountEndAt: '' },
    dlcs: []
  },
  releaseConfig: {
    mode: 'global',
    globalTerritoryCodes: [],
    releaseStatus: 'released',
    effectiveMode: 'immediate',
    scheduledAt: ''
  },
  qualifications: {
    rightsRelationship: 'self_owned',
    rightsDeclarationAccepted: false,
    activeVersion: null,
    pendingApplication: null,
    history: []
  },
  currentReleaseReview: null,
  releaseSubmissions: [],
  reviewRecords: []
}
```

Legacy snapshots remain byte-for-byte unchanged in the `submissions` store and are normalized only for display.

Creation is intentionally outside the store-locale contract. A new create draft contains `projectName` plus the existing genres, relationship, developer name, platforms and release plan fields. It contains no `storeLocales`, `gameNames`, `gameNameEn`, `gameNameZh`, `nameLanguages`, `defaultNameLanguage` or `currentNameLanguage`. `projectName` becomes the game record's backend display name only; `gameProfileDraft.gameNames` remains empty until the developer configures store locales after creation.

### Task 1: Shared IndexedDB schema and migration

**Files:**
- Create: `demos/开发者后台一期/src/runtime/publisher-storage-schema.js`
- Create: `tests/developer-backend/publisher-storage-migration.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-profile-store.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-review-store.js`

- [ ] **Step 1: Write a failing migration test**

Create a v1 database with `profiles` and `submissions`, save a profile containing Blob assets, legacy `languages`, dual `releaseRegions`, old pricing, and raw qualification files, then load the new schema runtime.

```js
test('migrates v1 without copying blobs or rewriting submissions', async () => {
  const before = await seedV1(page);
  const result = await page.evaluate(() => window.PublisherStorageSchema.open().then(async db => ({
    version: db.version,
    stores: [...db.objectStoreNames],
  })));
  assert.equal(result.version, 2);
  assert.deepEqual(result.stores.sort(), ['profiles', 'qualificationApplications', 'submissions'].sort());
  const after = await readV2(page, before.gameKey);
  assert.equal(after.profile.storeLocales.enabled.includes('en'), true);
  assert.equal(after.profile.releaseConfig.mode, 'global');
  assert.equal(after.profile.releaseConfig.domesticDraftAvailable, true);
  assert.equal(after.profile.catalog.baseGame.listPrice, '19.99');
  assert.equal(after.profile.gameProfileDraft.localizedAssets.en.icon.blob.size, before.iconBytes);
  assert.deepEqual(after.submission, before.submission);
  assert.equal(after.profile.qualifications.activeVersion, null);
  assert.equal(after.profile.qualifications.history[0].status, 'legacy_unknown');
});
```

- [ ] **Step 2: Run the test and verify the missing runtime failure**

Run:

```powershell
node --test tests/developer-backend/publisher-storage-migration.browser.test.mjs
```

Expected: FAIL because `PublisherStorageSchema` does not exist.

- [ ] **Step 3: Implement the shared schema runtime**

Expose a single database opener used by both demos:

```js
(function (global) {
  'use strict';
  const DB_NAME = 'gamehub-publisher-profiles-v1';
  const DB_VERSION = 2;
  const STORES = ['profiles', 'submissions', 'qualificationApplications'];
  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === 'profiles' ? 'gameKey' : 'id' });
        }
        if (event.oldVersion < 2) migrateProfiles(request.transaction.objectStore('profiles'));
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('storage-upgrade-blocked'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }
  global.PublisherStorageSchema = { DB_NAME, DB_VERSION, STORES, open, normalizeProfile, normalizeSubmission };
})(window);
```

`migrateProfiles()` must use cursor values and `structuredClone`; it must not serialize Blob values through JSON. `normalizeProfile()` must implement the frozen contract and preserve a domestic draft when old data contains CN plus overseas territories. `normalizeSubmission()` must return a display adapter without writing back to `submissions`.

- [ ] **Step 4: Route both stores through the shared opener**

Replace the two local `indexedDB.open(..., 1)` implementations with `window.PublisherStorageSchema.open()`. Keep current transaction boundaries and withdrawal/reviewer race protection until Task 5 rewires qualification transactions.

- [ ] **Step 5: Run migration and syntax checks**

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-storage-schema.js
node --check demos/开发者后台一期/src/runtime/publisher-profile-store.js
node --check demos/开发者后台一期/src/runtime/publisher-game-review-store.js
node --test tests/developer-backend/publisher-storage-migration.browser.test.mjs
```

Expected: syntax checks exit 0 and the migration test passes with Blob byte counts unchanged.

- [ ] **Step 6: Commit only the schema slice**

```powershell
git add -- demos/开发者后台一期/src/runtime/publisher-storage-schema.js demos/开发者后台一期/src/runtime/publisher-profile-store.js demos/开发者后台一期/src/runtime/publisher-game-review-store.js tests/developer-backend/publisher-storage-migration.browser.test.mjs
git commit --only -m "feat: add publisher profile v2 storage schema" -- demos/开发者后台一期/src/runtime/publisher-storage-schema.js demos/开发者后台一期/src/runtime/publisher-profile-store.js demos/开发者后台一期/src/runtime/publisher-game-review-store.js tests/developer-backend/publisher-storage-migration.browser.test.mjs
```

### Task 2: Single-scope release picker and responsive territory grid

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-release-regions.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-release-regions.css`
- Modify: `tests/developer-backend/publisher-release-regions.browser.test.mjs`
- Modify: `tests/developer-backend/game-profile-regions.browser.test.mjs`

- [ ] **Step 1: Rewrite the component test around the single-mode contract**

```js
assert.equal(await page.locator('[data-release-mode="global"]').isChecked(), true);
assert.equal(await page.locator('[data-release-mode]').nth(0).getAttribute('value'), 'global');
assert.equal(await page.locator('[data-release-mode]').nth(1).getAttribute('value'), 'domestic');
assert.equal(await page.locator('[data-release-territory="CN"]').count(), 0);
assert.ok(await page.locator('[data-continent-group]').count() >= 5);
assert.equal(await page.locator('[data-territory-card]').count(), catalogWithoutChina.length);
```

At 1440, 768 and 390 widths, assert computed grid columns are 3, 2 and 1. Combine a keyword with a continent filter and assert empty continent groups are hidden while checked values are preserved.

- [ ] **Step 2: Run both region tests and confirm old dual-scope assertions fail**

```powershell
node --test tests/developer-backend/publisher-release-regions.browser.test.mjs tests/developer-backend/game-profile-regions.browser.test.mjs
```

Expected: FAIL on ordering, mutual exclusion, CN exclusion, grouping and grid layout.

- [ ] **Step 3: Implement explicit `releaseMode`**

Keep the public façade but change its normalized state and callback:

```js
{
  mode: 'global' | 'domestic',
  globalTerritoryCodes: string[],
  releaseStatus: 'coming_soon' | 'pre_registration' | 'demo' | 'released',
  filters: { keyword: string, continent: string }
}
```

`render()` must output global then domestic radio cards. Domestic mode renders a fixed mainland summary and no country selector. Global mode renders all non-CN catalog entries grouped by continent. `bind()` must call `onChange({ mode, globalTerritoryCodes, releaseStatus, filters })` and must preserve the global selection when the developer temporarily switches to domestic.

- [ ] **Step 4: Implement the 3/2/1 CSS grid**

```css
.prr-continent-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px 12px; }
@media (max-width: 1000px) { .prr-continent-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width: 560px) { .prr-continent-grid { grid-template-columns:minmax(0,1fr); } }
```

Retain keyboard focus styles, selected counts, filters, and an empty state. Search/filter rerendering must restore the content container scroll position rather than invoke page-level `scrollIntoView()`.

- [ ] **Step 5: Run region tests and commit**

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-release-regions.js
node --test tests/developer-backend/publisher-release-regions.browser.test.mjs tests/developer-backend/game-profile-regions.browser.test.mjs
git add -- demos/开发者后台一期/src/runtime/publisher-release-regions.js demos/开发者后台一期/src/styles/publisher-release-regions.css tests/developer-backend/publisher-release-regions.browser.test.mjs tests/developer-backend/game-profile-regions.browser.test.mjs
git commit --only -m "feat: add single-scope territory picker" -- demos/开发者后台一期/src/runtime/publisher-release-regions.js demos/开发者后台一期/src/styles/publisher-release-regions.css tests/developer-backend/publisher-release-regions.browser.test.mjs tests/developer-backend/game-profile-regions.browser.test.mjs
```

### Task 3: Language-neutral creation and store locale normalization

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-create.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-names.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `tests/developer-backend/game-create.browser.test.mjs`
- Modify: `tests/developer-backend/game-profile-promotion.browser.test.mjs`
- Modify: `tests/developer-backend/game-profile-release-demo.test.mjs`

- [ ] **Step 1: Add failing locale-source assertions**

First assert the create page contains one plain `projectName` input and does not contain a language tablist, `data-name-language`, “管理多语言”, “Manage languages” or any locale selector. Submit a valid create draft and assert the resulting game uses `projectName` as its backend display name while its new `gameProfileDraft.gameNames` has no prefilled English or Chinese value.

Then create a post-creation profile draft with legacy `languages`, `nameLanguages` and `assetLanguageSettings.nameLanguages`, and assert normalization creates one `storeLocales.enabled` union without an independent `languages` validation field. Add and remove Japanese through the language manager and assert both localized content and assets use the same enabled array.

```js
assert.deepEqual(draft.storeLocales.enabled, ['en', 'zh', 'ja']);
assert.equal(Object.prototype.hasOwnProperty.call(draft, 'languages'), false);
assert.deepEqual(Object.keys(draft.gameProfileDraft.localizedContent).sort(), ['en', 'ja', 'zh']);
assert.deepEqual(Object.keys(draft.gameProfileDraft.localizedAssets).sort(), ['en', 'ja', 'zh']);
```

Also assert the Chinese selector says “英语”, switching to English changes navigation, buttons and field labels, and domestic mode forces the interface back to Chinese without deleting other locales.

- [ ] **Step 2: Run the locale tests and verify failure**

```powershell
node --test tests/developer-backend/game-profile-promotion.browser.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs
```

- [ ] **Step 3: Normalize names, content and assets through `storeLocales`**

Make `PublisherGameCreate.createDraft()` return a plain `projectName` and the existing non-language creation fields. Render and validate that input directly, and remove all calls to `PublisherGameNames` from the create runtime. The create submission must keep `projectName` only as the backend game name and initialize post-creation store names as empty values.

Make `PublisherGameNames.createData()` accept and return `{ enabled, default, current, gameNames }`. In `PublisherGameProfile.createDraft()`, translate legacy fields once, then use `storeLocales.current` for both localized text and asset helpers. Remove `languages` from `requiredFields()`, `sectionOf()`, rendering and binding.

Required content must be derived from `releaseConfig.mode`: English for global, Simplified Chinese for domestic. Interface language stays separate and is controlled by `app.js` in Task 6.

- [ ] **Step 4: Preserve asset fallback rules and scroll/focus**

Default-locale icon, landscape and screenshots remain required. Non-default locales may preview default assets with an inherited label. Language add/remove or asset upload rerenders must restore `.workspace.scrollTop` and the focused control.

- [ ] **Step 5: Run syntax and locale tests, then commit**

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-game-create.js
node --check demos/开发者后台一期/src/runtime/publisher-game-names.js
node --check demos/开发者后台一期/src/runtime/publisher-game-profile.js
node --test tests/developer-backend/game-create.browser.test.mjs tests/developer-backend/game-profile-promotion.browser.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-scroll.browser.test.mjs
git add -- demos/开发者后台一期/src/runtime/publisher-game-create.js demos/开发者后台一期/src/runtime/publisher-game-names.js demos/开发者后台一期/src/runtime/publisher-game-profile.js tests/developer-backend/game-create.browser.test.mjs tests/developer-backend/game-profile-promotion.browser.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs
git commit --only -m "feat: separate project creation from store locales" -- demos/开发者后台一期/src/runtime/publisher-game-create.js demos/开发者后台一期/src/runtime/publisher-game-names.js demos/开发者后台一期/src/runtime/publisher-game-profile.js tests/developer-backend/game-create.browser.test.mjs tests/developer-backend/game-profile-promotion.browser.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs
```

### Task 4: Base-game and DLC SKU pricing

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-profile.css`
- Modify: `tests/developer-backend/game-profile-pricing.browser.test.mjs`

- [ ] **Step 1: Replace old game-level price tests with SKU cases**

Test one base game plus two DLCs. Cover base free/DLC paid, base paid/DLC free, add/remove DLC, install-content requirement, USD in global mode, CNY in domestic mode, and immutable submit snapshots.

```js
assert.equal(draft.catalog.baseGame.pricingModel, 'free');
assert.equal(draft.catalog.dlcs[0].pricingModel, 'paid');
assert.equal(draft.catalog.dlcs[0].listPrice, '9.99');
assert.equal(draft.catalog.dlcs[0].discountPrice, '6.99');
assert.equal(currencyFor(draft.releaseConfig.mode), 'USD');
```

Add validation cases for empty install reference, price `0`, more than two decimals, discount equal to or above list, start at or after end, expired end, and overlap for the same SKU/scope.

- [ ] **Step 2: Run the pricing test and verify old-model failure**

```powershell
node --test tests/developer-backend/game-profile-pricing.browser.test.mjs
```

- [ ] **Step 3: Implement the catalog UI and rules**

Render a permanent base-game card and a repeatable DLC list. Each card includes title, installation-content selector, free/paid cards, list price, optional discount price, start, end, and remove action for draft DLCs. Use `datetime-local` and display “北京时间（UTC+8）”. Free mode must clear submitted price fields; paid mode validates price and optional discount as a group.

- [ ] **Step 4: Add responsive SKU styling**

Use a two-column field grid above 760px and one column below it. Keep the action column visible, avoid horizontal root overflow, and present the base game before all DLCs.

- [ ] **Step 5: Run pricing, submit and withdrawal regressions, then commit**

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-game-profile.js
node --test tests/developer-backend/game-profile-pricing.browser.test.mjs tests/developer-backend/game-profile-stale-submit.browser.test.mjs tests/developer-backend/game-release-review-withdraw.browser.test.mjs
git add -- demos/开发者后台一期/src/runtime/publisher-game-profile.js demos/开发者后台一期/src/styles/publisher-game-profile.css tests/developer-backend/game-profile-pricing.browser.test.mjs
git commit --only -m "feat: add base game and DLC pricing" -- demos/开发者后台一期/src/runtime/publisher-game-profile.js demos/开发者后台一期/src/styles/publisher-game-profile.css tests/developer-backend/game-profile-pricing.browser.test.mjs
```

### Task 5: Independent qualification application lifecycle

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-qualifications.js`
- Create: `demos/开发者后台一期/src/runtime/publisher-qualification-review-store.js`
- Create: `demos/开发者后台一期/src/runtime/publisher-qualification-review.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Create: `tests/developer-backend/qualification-review-lifecycle.browser.test.mjs`
- Modify: `tests/developer-backend/game-qualifications.test.mjs`

- [ ] **Step 1: Add failing pure rules and lifecycle tests**

Cover global `self_owned`, `agent`, `joint`, `third_party_ip`; require a declaration for all, require up to ten JPG/PNG authorization-chain files for non-self-owned relationships, and validate party/platform/territory/date coverage. Cover domestic PC version number, publisher authorization, copyright alternative, conditional ICP/safety, and online demo/released anti-addiction checks.

Lifecycle assertions:

```js
assert.equal(afterV1.qualifications.activeVersion.id, 'QUAL-V1');
assert.equal(afterV2Submit.qualifications.activeVersion.id, 'QUAL-V1');
assert.equal(afterV2Submit.qualifications.pendingApplication.status, 'reviewing');
assert.equal(afterSupplement.qualifications.pendingApplication.status, 'supplement_required');
assert.equal(afterSupplement.qualifications.activeVersion.id, 'QUAL-V1');
assert.equal(afterV2Approval.qualifications.activeVersion.id, 'QUAL-V2');
assert.equal(oldReleaseSnapshot.qualificationVersionId, 'QUAL-V1');
```

- [ ] **Step 2: Run tests and confirm missing stores/states**

```powershell
node --test tests/developer-backend/game-qualifications.test.mjs tests/developer-backend/qualification-review-lifecycle.browser.test.mjs
```

- [ ] **Step 3: Implement shared qualification rules**

Expose pure helpers for applicability, file validation, authorization coverage, approved-version selection and display labels. For global mode render exactly one fixed card named “发行授权及 IP 权利证明”. Self-owned uses declaration only; all other relationships require structured fields plus 1–10 JPG/PNG files.

- [ ] **Step 4: Implement atomic qualification storage**

`PublisherQualificationReviewStore` must expose:

```js
{ loadQueue, submit, withdraw, decide, requestSupplement }
```

`submit` rejects a second pending application. `requestSupplement` requires a non-empty reason and returns only the pending application to editing. `withdraw`, reject and supplement never replace `activeVersion`. `decide(approved)` atomically archives the prior active version and promotes the pending version.

- [ ] **Step 5: Render manual-upload qualification cards**

Cards show icon, name, description, applicability, status, and Upload/View/Modify. Grid breakpoints are 3/2/1. Clicking Upload/Modify opens the existing in-page editing surface and file chooser; it does not auto-read local files or auto-submit unrelated profile data. File selection remains local until the developer submits that qualification application.

- [ ] **Step 6: Run lifecycle and PC qualification tests, then commit**

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-game-qualifications.js
node --check demos/开发者后台一期/src/runtime/publisher-qualification-review-store.js
node --check demos/开发者后台一期/src/runtime/publisher-qualification-review.js
node --test tests/developer-backend/game-qualifications.test.mjs tests/developer-backend/qualification-review-lifecycle.browser.test.mjs tests/developer-backend/game-profile-qualifications.browser.test.mjs
git add -- demos/开发者后台一期/src/runtime/publisher-game-qualifications.js demos/开发者后台一期/src/runtime/publisher-qualification-review-store.js demos/开发者后台一期/src/runtime/publisher-qualification-review.js demos/开发者后台一期/src/runtime/publisher-game-profile.js tests/developer-backend/game-qualifications.test.mjs tests/developer-backend/qualification-review-lifecycle.browser.test.mjs
git commit --only -m "feat: add independent game qualification review" -- demos/开发者后台一期/src/runtime/publisher-game-qualifications.js demos/开发者后台一期/src/runtime/publisher-qualification-review-store.js demos/开发者后台一期/src/runtime/publisher-qualification-review.js demos/开发者后台一期/src/runtime/publisher-game-profile.js tests/developer-backend/game-qualifications.test.mjs tests/developer-backend/qualification-review-lifecycle.browser.test.mjs
```

### Task 6: Navigation, version records and application integration

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`
- Modify: `demos/开发者后台一期/build.mjs`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: Add failing navigation and version assertions**

Assert the game sidebar contains Search, Overview and exactly five items under Release Preparation in this order: Game Details, Products & SKU, Release Settings, Qualifications, Version Records. Assert operations/services/analytics links are absent. Open each item, verify the selected state, and confirm clicks do not reset `.workspace.scrollTop` to zero.

Version records must list every release submission with ID, time, submitter and status; opening a record must show an immutable snapshot and its `qualificationVersionId`.

- [ ] **Step 2: Run the browser test and confirm old navigation failure**

```powershell
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

- [ ] **Step 3: Replace the old game console navigation**

Use one workspace state key:

```js
gameSection: 'overview' | 'profile' | 'catalog' | 'release' | 'qualifications' | 'versions'
```

Map each section to the matching `PublisherGameProfile.render(draft, language, { section })` view. Keep a single top submit action. Game Details ends with Other Settings; Release Settings follows Products & SKU; Qualifications follows Release Settings; Version Records is last and read-only.

- [ ] **Step 4: Wire save, release submit, withdrawal and qualification callbacks**

`app.js` must pass separate callbacks for profile save, release submit/withdraw, and qualification submit/withdraw. Domestic selection sets `memory.shell.language = 'zh'` and persists it. Manual English switching updates all interface copy when mode is global; the Chinese language menu label remains “英语”.

- [ ] **Step 5: Register runtimes in build order and build only modules 02 and 01**

Load `publisher-storage-schema.js` before all stores. Load qualification review scripts before common `templates.js/app.js`. Register any new CSS in the module 01/02 CSS lists.

```powershell
node demos/开发者后台一期/build.mjs --module=02
node demos/开发者后台一期/build.mjs --module=01
```

Expected: both generated HTML files update; modules 03/04/06/07/08 remain untouched.

- [ ] **Step 6: Run navigation, language and scroll tests, then commit**

```powershell
node --check demos/开发者后台一期/src/runtime/templates.js
node --check demos/开发者后台一期/src/runtime/app.js
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs tests/developer-backend/game-profile-scroll.browser.test.mjs tests/developer-backend/game-create.browser.test.mjs
git add -- demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/src/styles/templates.css demos/开发者后台一期/build.mjs demos/开发者后台一期/02-CDKEY商品与供给demo.html demos/开发者后台一期/01-开发者平台与资料demo.html tests/developer-backend/game-profile-release-demo.browser.test.mjs
git commit --only -m "feat: reorganize publisher release preparation" -- demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/src/styles/templates.css demos/开发者后台一期/build.mjs demos/开发者后台一期/02-CDKEY商品与供给demo.html demos/开发者后台一期/01-开发者平台与资料demo.html tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

### Task 7: Module 01 qualification and release review console

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-review-store.js`
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-review.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-review.css`
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `tests/developer-backend/game-release-review.browser.test.mjs`
- Modify: `tests/developer-backend/game-release-review-flow.browser.test.mjs`
- Modify: `tests/developer-backend/game-release-review-pricing.browser.test.mjs`
- Modify: `tests/developer-backend/game-release-review-qualifications.browser.test.mjs`
- Modify: `tests/developer-backend/game-release-review-withdraw.browser.test.mjs`
- Modify: `tests/developer-backend/prd01-current-scope.browser.test.mjs`

- [ ] **Step 1: Add V2.5 reviewer fixtures beside legacy fixtures**

Seed one global and one domestic submission. Global must include non-CN countries, continent summary, English store locale, base-free/DLC-paid USD discount and approved authorization version. Domestic must include Chinese locale, CNY prices, license number and online compliance. Keep one old dual-scope V2.4 snapshot as legacy read-only coverage.

- [ ] **Step 2: Add failing list/detail assertions**

List columns: game, submission ID, release scope, territory summary, release status, price summary, submitted time, review status. Details: Game Details, Products & SKU, Release Settings, Qualification Version, Review Records.

```js
assert.match(globalRow, /全球服（不含中国大陆）/);
assert.doesNotMatch(globalDetail, /中国大陆.*已选择/);
assert.match(globalDetail, /USD.*6\.99.*QUAL-V1/);
assert.match(domesticDetail, /中国大陆.*CNY.*ISBN/);
```

- [ ] **Step 3: Update reviewer validation without rewriting legacy snapshots**

For V2.5, reject dual modes, no global countries, missing required locale content, missing install content, invalid prices/discounts, domestic missing license number, and missing or insufficient approved qualification references. For legacy, keep existing display and decision behavior without inventing new fields.

- [ ] **Step 4: Add a separate qualification-review tab under P01-08**

Keep the existing company review and release review, then mount `PublisherQualificationReview` for the qualification queue. Supplement requests require a reason and only affect `pendingApplication`; release review statuses remain reviewing/approved/rejected/withdrawn.

- [ ] **Step 5: Run reviewer, concurrency and P01 regressions**

```powershell
$env:REVIEW_SOURCE_HARNESS='1'
node --test tests/developer-backend/game-release-review.browser.test.mjs tests/developer-backend/game-release-review-pricing.browser.test.mjs tests/developer-backend/game-release-review-qualifications.browser.test.mjs tests/developer-backend/game-release-review-withdraw.browser.test.mjs tests/developer-backend/qualification-review-lifecycle.browser.test.mjs
Remove-Item Env:REVIEW_SOURCE_HARNESS
node --test tests/developer-backend/game-release-review-flow.browser.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs
```

Expected: all tests pass; reviewer decision versus developer withdrawal still has exactly one successful terminal transition.

- [ ] **Step 6: Rebuild module 01 and commit the review slice**

```powershell
node demos/开发者后台一期/build.mjs --module=01
git add -- demos/开发者后台一期/src/runtime/publisher-game-review-store.js demos/开发者后台一期/src/runtime/publisher-game-review.js demos/开发者后台一期/src/styles/publisher-game-review.css demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/01-开发者平台与资料demo.html tests/developer-backend/game-release-review.browser.test.mjs tests/developer-backend/game-release-review-flow.browser.test.mjs tests/developer-backend/game-release-review-pricing.browser.test.mjs tests/developer-backend/game-release-review-qualifications.browser.test.mjs tests/developer-backend/game-release-review-withdraw.browser.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs
git commit --only -m "feat: review publisher qualifications and releases" -- demos/开发者后台一期/src/runtime/publisher-game-review-store.js demos/开发者后台一期/src/runtime/publisher-game-review.js demos/开发者后台一期/src/styles/publisher-game-review.css demos/开发者后台一期/src/runtime/templates.js demos/开发者后台一期/src/runtime/app.js demos/开发者后台一期/src/runtime/shell.js demos/开发者后台一期/01-开发者平台与资料demo.html tests/developer-backend/game-release-review.browser.test.mjs tests/developer-backend/game-release-review-flow.browser.test.mjs tests/developer-backend/game-release-review-pricing.browser.test.mjs tests/developer-backend/game-release-review-qualifications.browser.test.mjs tests/developer-backend/game-release-review-withdraw.browser.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs
```

### Task 8: PRD, workflow state, contract tests and final evidence

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/02-游戏创建业务流PRD.md`
- Modify: `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`
- Modify: `demos/开发者后台一期/src/prd-page-map.json`
- Modify: `demos/开发者后台一期/README.md`
- Modify: `tests/developer-backend/content.test.mjs`
- Modify: `tests/developer-backend/manifest.test.mjs`
- Modify: `tests/developer-backend/build.test.mjs`
- Create: `prd/workflow-state/LOCAL-20260907-module02-create-v25.md`
- Create: `tests/developer-backend/evidence/profile-v25/verification.md`
- Create: `tests/developer-backend/evidence/review-v25/verification.md`

- [ ] **Step 1: Update PRD page facts and decisions**

Add V2.5 decisions for the five-module sidebar, single release scope, grouped territories, store locales, SKU/discount model, global conditional rights card, domestic PC qualification rules, independent qualification review, immutable version records and 01 reviewer summaries. Keep Steam-specific onboarding, tax, Steam Direct, Depot and pricing flows out of the PRD.

- [ ] **Step 2: Update stale build-contract assertions**

Set the PRD map version to `2026-09-07-v2.5`, retain the existing route count unless the actual route table changed, and make the build test enumerate modules from `modules.json` rather than assume four generated HTML files. Update P01 title/action expectations to the current fixture; do not delete the Help Center route to satisfy an old assertion.

- [ ] **Step 3: Run static contracts before the final browser matrix**

```powershell
node --test tests/developer-backend/content.test.mjs tests/developer-backend/manifest.test.mjs tests/developer-backend/build.test.mjs tests/developer-backend/game-qualifications.test.mjs
```

Expected: all pass; no assertion is pinned to 2026-09-03 or an obsolete module count.

- [ ] **Step 4: Run the complete V2.5 browser matrix**

```powershell
node --test tests/developer-backend/publisher-storage-migration.browser.test.mjs tests/developer-backend/publisher-release-regions.browser.test.mjs tests/developer-backend/game-create.browser.test.mjs tests/developer-backend/game-profile-promotion.browser.test.mjs tests/developer-backend/game-profile-regions.browser.test.mjs tests/developer-backend/game-profile-pricing.browser.test.mjs tests/developer-backend/game-profile-qualifications.browser.test.mjs tests/developer-backend/game-profile-scroll.browser.test.mjs tests/developer-backend/game-profile-stale-submit.browser.test.mjs tests/developer-backend/qualification-review-lifecycle.browser.test.mjs tests/developer-backend/game-release-review.browser.test.mjs tests/developer-backend/game-release-review-flow.browser.test.mjs tests/developer-backend/game-release-review-pricing.browser.test.mjs tests/developer-backend/game-release-review-qualifications.browser.test.mjs tests/developer-backend/game-release-review-withdraw.browser.test.mjs tests/developer-backend/prd01-current-scope.browser.test.mjs
```

Capture new evidence under `profile-v25` and `review-v25`; do not overwrite V2.4 screenshots or verification records.

- [ ] **Step 5: Perform visual and console review at three widths**

For module 02, inspect Game Details, Products & SKU, Release Settings, Qualifications and Version Records at 1440×900, 768×900 and 390×844. For module 01, inspect global list/detail, domestic list/detail and qualification supplement state at the same widths. Assert no page errors, no root horizontal overflow, no unexpected page-top jump, and correct Chinese/English copy.

- [ ] **Step 6: Write verification and workflow state**

Record exact commands, pass counts, screenshot names, known limitations and the final decision. V2.5 stays `in_progress` until every required test passes; only then mark it `passed`. Retain the V2.4 state card as historical evidence.

- [ ] **Step 7: Run limited diff checks and commit artifacts**

```powershell
git diff --check -- demos/开发者后台一期 prd/发行平台专项/开发者后台PRD prd/workflow-state/LOCAL-20260907-module02-create-v25.md tests/developer-backend docs/superpowers
git status --short -- demos/开发者后台一期/01-开发者平台与资料demo.html demos/开发者后台一期/02-CDKEY商品与供给demo.html prd/发行平台专项/开发者后台PRD prd/workflow-state/LOCAL-20260907-module02-create-v25.md tests/developer-backend/evidence/profile-v25 tests/developer-backend/evidence/review-v25
```

Commit only the PRD, V2.5 state, verification, contract tests and final generated module 01/02 files. Leave unrelated workspace changes untouched.

## Final acceptance gate

The implementation is complete only when all of the following are true:

- Create Game has one plain backend project-name input, exposes no locale controls, and does not prefill any localized store name.
- Module 02 opens locally and all five Release Preparation entries are functional.
- Global is first, default and mutually exclusive with mainland; global territories exclude CN and use the 3/2/1 continent grid.
- Store locale changes update names, descriptions and assets from one source.
- Base game and DLC SKUs support installation content, free/paid, list price, discount price and term.
- Global qualifications use one conditional authorization/IP card; domestic requires the PC-relevant version number and conditional materials.
- Qualification modification retains the active approved version until the pending version is approved.
- Release review can be withdrawn, resubmission gets a new ID, and all prior submission snapshots stay immutable.
- Module 01 clearly distinguishes global and mainland submissions in its list and details.
- Static contracts, migration tests, developer browser tests, reviewer browser tests and responsive visual checks all pass with new evidence.
