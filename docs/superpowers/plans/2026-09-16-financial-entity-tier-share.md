# Financial Entity Tier Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将阶梯平台分成从“开发者＋游戏＋生效账单月”改为“财务主体＋开始/结束日期”，并用紧凑多列档位完成运营配置。

**Architecture:** 共享结算模型负责主体级规则版本、时间冲突校验、阶梯计算和账单快照；`demo16` 只负责入口、抽屉、档位编辑及错误反馈。编译脚本继续生成单文件运营后台 Demo，PRD 同步页面图、规则和埋点口径。

**Tech Stack:** Vanilla JavaScript, CSS, Node.js test runner, Playwright Core, PowerShell PRD validators.

---

### Task 1: Lock the entity-scoped rule contract with model tests

**Files:**
- Modify: `tests/developer-backend/finance-statements-model.test.mjs`
- Modify: `demos/开发者后台一期/src/finance-statements/model.js`

- [ ] **Step 1: Replace the game-scoped test fixture with an entity-scoped date range**

```js
const base = {
  financialEntityId:'DEV-1001',
  startDate:'2026-09-01',
  endDate:'',
  reason:'',
};
```

- [ ] **Step 2: Add failing assertions for optional reason, overlap blocking, and shared game coverage**

```js
const saved = model.saveTierRule(state, {
  ...base,
  tiers:[
    { fromMinor:0, toMinor:100000000, platformRate:30 },
    { fromMinor:100000000, toMinor:null, platformRate:20 },
  ],
});
assert.equal(saved.financialEntityId,'DEV-1001');
assert.equal(saved.reason,'');
assert.throws(() => model.saveTierRule(state, {
  ...base,
  startDate:'2026-09-15',
  endDate:'2026-12-01',
  tiers:[{ fromMinor:0, toMinor:null, platformRate:20 }],
}),/时间范围.*重叠/);
assert.equal(model.tierRuleFor(state,'DEV-1001','2026-09-01').id,saved.id);
```

- [ ] **Step 3: Run the focused model tests and verify the new assertions fail**

Run: `node --test tests/developer-backend/finance-statements-model.test.mjs`

Expected: FAIL because `saveTierRule` still requires `gameId`, `effectiveBillingMonth`, and `reason`.

- [ ] **Step 4: Implement date helpers and entity-scoped version lookup**

```js
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const normalizeDate = (value,label) => {
  const text = String(value || '').trim();
  if (!DATE_PATTERN.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00+08:00`))) throw new Error(`${label}\u683c\u5f0f应为 YYYY-MM-DD`);
  return text;
};
const rangeContains = (rule,date) => rule.startDate <= date && (!rule.endDate || date < rule.endDate);
const rangesOverlap = (left,right) => (!left.endDate || right.startDate < left.endDate) && (!right.endDate || left.startDate < right.endDate);
```

Change `defaultTierRule`, `tierRuleFor`, and `saveTierRule` to store `financialEntityId`, `startDate`, `endDate`, and optional `reason`; remove `gameId` and `effectiveBillingMonth` from new versions.

- [ ] **Step 5: Recalculate every unlocked game statement under the selected entity**

```js
(state.statements || []).forEach(row => {
  const referenceDate = `${row.billingMonth}-01`;
  if (row.developerId !== financialEntityId || row.itemType !== 'game_sales_share' || row.status === 'confirmed' || row.lockedAt || !rangeContains(version,referenceDate)) return;
  recalculateUnlockedGameStatement(row,tierRuleFor(state,financialEntityId,referenceDate));
});
```

- [ ] **Step 6: Preserve immutable statement snapshots with the new rule fields**

Set `tierRuleVersion`, `tierRuleStartDate`, `tierRuleEndDate`, and `tierSnapshots` when generating or recalculating statements; do not mutate locked/confirmed rows.

- [ ] **Step 7: Run the model suite**

Run: `node --test tests/developer-backend/finance-statements-model.test.mjs`

Expected: PASS.

### Task 2: Lock the operations UI behavior with browser tests

**Files:**
- Modify: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo16/app.js`
- Modify: `demos/开发者后台一期/src/demo16/styles.css`

- [ ] **Step 1: Replace the old game-tab tier test**

```js
test('主体汇总统一配置主体级阶梯分成', async () => {
  await open();
  assert.equal(await page.getByRole('button',{ name:'配置阶梯分成' }).count(),1);
  await page.getByRole('button',{ name:'配置阶梯分成' }).click();
  const drawer = page.getByRole('dialog',{ name:'配置阶梯分成' });
  assert.equal(await drawer.locator('[name="financialEntityId"]').count(),1);
  assert.equal(await drawer.locator('[name="startDate"]').count(),1);
  assert.equal(await drawer.locator('[name="endDate"]').count(),1);
  assert.equal(await drawer.locator('[data-tier-card]').count(),3);
  assert.match(await drawer.innerText(),/0.*月结算金额（元）/);
  assert.match(await drawer.innerText(),/不设上限/);
});
```

- [ ] **Step 2: Add failing checks for three cards per row, compact inputs, add/delete, and optional reason**

Use `page.locator('[data-tier-card]')`, click `添加档位`, verify the count increases, delete the inserted card, leave `reason` empty, and save successfully.

- [ ] **Step 3: Verify the browser test fails against the old UI**

Run: `node --test tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: FAIL because the entry is still on `游戏明细` and the drawer still shows developer/game/month fields.

- [ ] **Step 4: Move the entry and rebuild the draft shape**

```js
const tierButton = state.activeTab === 'entity'
  ? `<button type="button" data-fo-action="open-tier-editor">配置阶梯分成</button>`
  : '';
const createTierDraft = financialEntityId => {
  const rule = model.statements.tierRuleFor(state.statementState,financialEntityId,'2026-09-01');
  return { financialEntityId,startDate:'2026-09-01',endDate:'',reason:'',tiers:rule.tiers.map(tier => ({ ...tier })) };
};
```

- [ ] **Step 5: Render the compact tier-card grid**

Render each card as `[lower] < 月结算金额（元） ≤ [upper]` plus a compact rate input. Only the first lower boundary is static `0`, and only the last upper boundary is static `不设上限`; every other lower and upper boundary is editable.

- [ ] **Step 6: Implement add/delete boundary normalization**

```js
const normalizeDraftBounds = tiers => tiers.map((tier,index) => ({
  ...tier,
  fromMinor:index === 0 ? 0 : tiers[index - 1].toMinor,
  toMinor:index === tiers.length - 1 ? null : tier.toMinor,
}));
```

Adding inserts a finite tier before the current no-limit tier, prefills its lower boundary from the former last tier, leaves its upper boundary and rate empty, and retains the original no-limit rate. Only middle tiers can be deleted; saving validates that every adjacent upper and lower boundary is equal.

- [ ] **Step 7: Add responsive compact-grid styles**

```css
.fo-tier-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.fo-tier-card { min-width:0; padding:12px; border:1px solid var(--fo-line); border-radius:6px; background:#f8f9fb; }
.fo-tier-expression { display:flex; align-items:center; gap:7px; white-space:nowrap; }
.fo-tier-expression input { width:92px; min-height:34px; }
@media (max-width:1180px) { .fo-tier-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:760px) { .fo-tier-grid { grid-template-columns:1fr; } }
```

- [ ] **Step 8: Rebuild the single-file Demo and rerun browser tests**

Run: `node demos/开发者后台一期/build-finance-operations.mjs`

Run: `node --test tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: PASS.

### Task 3: Run the full finance regression and inspect the UI

**Files:**
- Verify: `demos/开发者后台一期/发行平台运营后台财务整合demo.html`
- Verify: `tests/developer-backend/*.test.mjs`

- [ ] **Step 1: Run the focused finance suites**

Run: `node --test tests/developer-backend/finance-statements-model.test.mjs tests/developer-backend/operations-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Open the Demo at `#/P16-01` and inspect the drawer at 1440×900**

Verify: entry only appears on `主体汇总`; selector/date fields fit; three tier cards share one row; inputs align; no extra descriptive copy remains.

- [ ] **Step 3: Inspect responsive states**

Verify at 1280×800 and 390×844: no document-level horizontal overflow; tier cards wrap 2/1 columns; drawer footer remains usable.

- [ ] **Step 4: Commit the Demo and tests**

```powershell
git add -- `
  'demos/开发者后台一期/src/finance-statements/model.js' `
  'demos/开发者后台一期/src/demo16/app.js' `
  'demos/开发者后台一期/src/demo16/styles.css' `
  'demos/开发者后台一期/发行平台运营后台财务整合demo.html' `
  'tests/developer-backend/finance-statements-model.test.mjs' `
  'tests/developer-backend/operations-finance-settlement.browser.test.mjs'
git commit -m "feat: configure tier share by financial entity"
```

### Task 4: Update the PRD and tracking contract

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`

- [ ] **Step 1: Add a revision record and replace the old rule text**

Replace all current references to `开发者＋游戏＋生效账单月` with `财务主体＋开始日期＋结束日期`; move the entry description from `P16-02 游戏明细` to `P16-01 主体汇总`.

- [ ] **Step 2: Update the page-level six-element table**

Document the selector, required/optional fields, compact multi-column card grid, fixed `0`/no-limit boundaries, add/delete normalization, date overlap blocking, optional reason, versioning, and locked-bill snapshots.

- [ ] **Step 3: Update event and parameter tables**

Remove tier-config `game_id` and `effective_billing_month`; add:

```text
financial_entity_id | string/是 | 财务主体标识 | DEV-1001
start_date | string/是 | 规则开始日期 | 2026-09-01
end_date | string/否 | 规则结束日期，空为长期 | 2027-09-01
tier_count | number/是 | 保存的档位数 | 3
reason_filled | boolean/是 | 是否填写变更原因 | true
```

- [ ] **Step 4: Update the data object definition**

`PlatformShareTierRule` becomes `财务主体、开始/结束日期、阶梯区间、平台分成比例、版本、原因、操作人和操作时间`.

### Task 5: Refresh PRD images and fixed-SHA links

**Files:**
- Create/Modify: `public/prd/developer-finance-settlement-v2/15-flow-09-tier-config.png`
- Modify: `prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md`

- [ ] **Step 1: Capture the actual tier drawer from the rebuilt Demo**

Use Playwright at 1440×900, open `#/P16-01`, click `配置阶梯分成`, and save the visible drawer screenshot to the existing PRD image path.

- [ ] **Step 2: Commit the PRD text and image**

```powershell
git add -- `
  'prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md' `
  'public/prd/developer-finance-settlement-v2/15-flow-09-tier-config.png' `
  'prd/workflow-state/LOCAL-20260901-developer-backend-prd.md'
git commit -m "docs: update financial entity tier share prd"
```

- [ ] **Step 3: Replace image URLs with the fixed 40-character commit SHA**

Run `git rev-parse HEAD` after the image commit, store the returned 40-character SHA in `$imageCommit`, and update the changed image URL with:

```powershell
$imageUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/developer-finance-settlement-v2/15-flow-09-tier-config.png"
```

Then commit the URL-only PRD change.

### Task 6: Validate, push, and publish final links

**Files:**
- Verify: `prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md`
- Verify: Git branch and remote preview URLs

- [ ] **Step 1: Run PRD quality validation**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path 'prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md'`

Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Validate public image URLs**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath 'prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md' -VerifyRemote`

Expected: all image URLs return an image MIME type. Record that this is HTTP verification, not a real Feishu import.

- [ ] **Step 3: Verify the exact staged file list and push the branch**

Run: `git status --short` and `git diff --cached --name-only` before every commit; never use `git add .`.

Run: `git push origin codex/guanwanggaid-17-developer-evidence-20260915`

Expected: push succeeds and returns the new remote commit SHA.

- [ ] **Step 4: Report final artifacts**

Provide the local Demo path, fixed-SHA HTML preview URL, PRD path, latest commit SHA, test counts, PRD validator result, and remote image check result.
