# Developer Backend Demo 06 Mainland Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Demo 06 so domestic vendors can release overseas without a Chinese game approval number while the same data model and UI can gate future Mainland China publication.

**Architecture:** Keep Demo 06 as one offline HTML generated from `src/demo06/app.js` and `styles.css`. Add country-code-based release scope, a self-contained country picker, Mainland qualification state, and a release-gate branch that can submit an overseas-only snapshot when Mainland requirements are incomplete.

**Tech Stack:** Vanilla JavaScript template rendering, CSS, Node.js build script, Node test runner, Playwright Core with local Chrome/Edge.

---

### Task 1: Freeze the new content contract with failing tests

**Files:**
- Modify: `tests/developer-backend/game-profile-release-demo.test.mjs`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: Add static contract assertions**

Add required strings for `发行准备`, `中国大陆发行资质`, `提交平台人工复核`, `常用市场`, `版号申请中`, `仅提交海外范围`, and assert the old continent options are absent from the generated edit form.

```js
for (const content of [
  '发行准备',
  '中国大陆发行资质',
  '提交平台人工复核',
  '常用市场',
  '仅提交海外范围',
]) assert.equal(html.includes(content), true, `Demo 06 缺少关键内容：${content}`);
```

- [ ] **Step 2: Add browser expectations for default overview and country-level selection**

```js
await page.locator('.d6-breadcrumb [data-action="back-games"]').click();
await page.locator('.d6-game-item[data-action="enter-game"]').click();
assert.equal(await page.getByRole('heading', { name: '星海远征发行概览', exact: true }).isVisible(), true);

await page.locator('[data-action="store-section"][data-section="release-scope"]').click();
await page.getByRole('button', { name: '编辑发行范围', exact: true }).click();
await page.getByRole('button', { name: /选择国家/ }).click();
assert.equal(await page.getByText('常用市场', { exact: true }).isVisible(), true);
```

- [ ] **Step 3: Add Mainland/overseas gate tests**

Test that an overseas-only scope can submit without a version number; then select `中国大陆`, verify the Mainland gate fails, click `仅提交海外范围`, and verify the submitted snapshot excludes China while the draft remains unchanged.

- [ ] **Step 4: Run tests and verify failure**

Run:

```powershell
node --test tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: FAIL because the new navigation labels, country picker, Mainland qualification states and overseas-only submission action do not exist.

### Task 2: Update navigation, state and qualification presentation

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`

- [ ] **Step 1: Add country and Mainland state**

Define stable country codes and localized labels. Store release scope as country codes instead of continent names.

```js
const COMMON_MARKET_CODES = ['US','CN','RU','FR','DE','JP','IN','HK','GB','ID','TH','AU','CA','BR','TR','PH','TW','SG','NL','IT','MX','IQ','PK','CO','EG','DZ','AR','VN','VE'];

const state = {
  mainlandStatus: 'not_planned',
  mainlandReviewPassed: false,
  marketDialog: false,
  marketSearch: '',
  marketSelectionDraft: [],
};
```

- [ ] **Step 2: Rename the group and fix the landing route**

Change `商店管理` to `发行准备`, update search labels and breadcrumbs, and change `enter-game` to `mainTab = 'overview'`.

- [ ] **Step 3: Replace the qualification editor**

Keep self-developed/agency switching and add a Mainland qualification section with the fixed status enum. Show approval fields only for `approved` and `change_pending` states; use `提交平台人工复核` as the submit action.

- [ ] **Step 4: Expand qualification read mode**

Display authorization coverage for Product/SKU, OS, countries, direct download, GameHub Key, channel API, term and sub-licensing. Display the compact Mainland status card even when Mainland is not planned.

- [ ] **Step 5: Run syntax and static tests**

Run:

```powershell
node --check demos/开发者后台一期/src/demo06/app.js
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.test.mjs
```

Expected: syntax PASS; assertions for navigation and qualification presentation PASS. Country-picker and Mainland-gate assertions remain red until Tasks 3 and 4.

### Task 3: Build the searchable country/region picker

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`
- Modify: `demos/开发者后台一期/src/demo06/styles.css`

- [ ] **Step 1: Render country-level release scope**

Replace continent checkboxes with a summary field and `选择国家／地区` button. Keep OS and release time in the existing form.

- [ ] **Step 2: Add picker dialog**

Render an offline dialog with search, common market chips, full country results and a fixed action footer. De-duplicate by ISO-style country code.

```js
const selected = new Set(state.marketSelectionDraft);
const toggleMarket = code => selected.has(code) ? selected.delete(code) : selected.add(code);
```

- [ ] **Step 3: Add interaction handlers**

Implement open, search/filter, select, clear, cancel and confirm actions. Cancel must leave `releaseDraft.regions` unchanged; confirm copies the draft selection and marks the release scope as unconfirmed until saved.

- [ ] **Step 4: Style desktop and narrow-screen layouts**

Add `.d6-market-*` rules for the selected summary, chips, searchable list, Mainland marker and 390px stacking without horizontal overflow.

- [ ] **Step 5: Build and run picker tests**

Run:

```powershell
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: picker interaction tests PASS; the Mainland release-gate test may still fail until Task 4.

### Task 4: Add Mainland gating and overseas-only submission

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: Compute Mainland requirement independently**

```js
const includesMainland = scope => scope.regions.includes('CN');
const mainlandReleaseReady = () => state.mainlandStatus === 'approved' && state.mainlandReviewPassed;
```

Append a Mainland gate only when `CN` is included and the selected stage is formal release. Pioneer/internal test remains subject to existing controlled-test gates and must not imply public Mainland availability.

- [ ] **Step 2: Render failure guidance**

When Mainland is the only failed market-specific condition, show that overseas release can continue and display a `仅提交海外范围` secondary action. Never describe “free public download” as exempt.

- [ ] **Step 3: Submit an immutable overseas snapshot**

The action creates a snapshot whose `releaseScope.regions` excludes `CN`, adds an `excludedMarkets` reason, and does not mutate the user's release draft. Normal submission preserves existing behavior.

- [ ] **Step 4: Cover approved-version-number state**

Add a browser test that switches the Mainland status to approved, fills approved game name, client category, approval document number, ISBN, publisher, operator and approval date, submits for manual review, then verifies the Mainland gate can pass after the demo's approved preview state is selected.

- [ ] **Step 5: Run all Demo 06 tests**

Run:

```powershell
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: all Demo 06 tests PASS.

### Task 5: Visual verification and final artifact

**Files:**
- Modify: `demos/开发者后台一期/06-游戏商品资料与发行范围demo.html` (generated)
- Create/Update: `tests/developer-backend/evidence/game-profile-release/06-qualification-mainland-1440x900.png`
- Create/Update: `tests/developer-backend/evidence/game-profile-release/06-market-picker-1440x900.png`
- Create/Update: `tests/developer-backend/evidence/game-profile-release/06-mainland-gate-1440x900.png`

- [ ] **Step 1: Generate the offline HTML**

Run:

```powershell
node demos/开发者后台一期/build-06.mjs
```

Expected: `Built 06-游戏商品资料与发行范围demo.html with 1 route.`

- [ ] **Step 2: Capture 1440px and 390px states**

Use the existing Playwright browser test to capture qualification read/edit, country picker and Mainland gate screenshots. Confirm no root horizontal overflow.

- [ ] **Step 3: Inspect the screenshots**

Verify title hierarchy, left navigation, card spacing, modal footer, long country names, status tags and Mainland warning are readable without duplicated status banners.

- [ ] **Step 4: Run the final verification suite**

Run:

```powershell
node --check demos/开发者后台一期/src/demo06/app.js
node --test tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: all tests PASS and no browser page errors.

- [ ] **Step 5: Commit only Demo 06 scoped files**

```powershell
git add -- demos/开发者后台一期/src/demo06/app.js demos/开发者后台一期/src/demo06/styles.css demos/开发者后台一期/06-游戏商品资料与发行范围demo.html tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs tests/developer-backend/evidence/game-profile-release docs/superpowers/plans/2026-09-05-developer-backend-demo06-mainland-release-readiness.md
git commit -m "feat: prepare demo06 for mainland release gating"
```
