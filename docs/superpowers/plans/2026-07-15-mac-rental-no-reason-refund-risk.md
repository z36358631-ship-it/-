# Mac Rental No-Reason Refund And Risk Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace startup insurance with a three-day no-reason refund benefit, add configurable frequent-refund controls, expose order device context, complete structured annotations, and synchronize the PRD and screenshots.

**Architecture:** Keep the existing self-contained HTML Demo and its in-memory state model. Add rule helpers and order snapshots inside the same file, reuse existing modal infrastructure, and expose risk configuration through the existing admin system-settings entry. Update the PRD from the verified Demo, then publish affected screenshots through an isolated asset branch.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Playwright smoke tests, Markdown, GitHub Pages, jsDelivr CDN.

---

### Task 1: Add Refund Rule State And Tests

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Add failing smoke assertions**

Add checks for `state.refundRisk`, `isNoReasonRefundAvailable(order)`, rule-hit detection, order snapshot fields, and device fields.

```js
check('refund-risk-defaults', state.refundRisk.enabled && state.refundRisk.days === 30 && state.refundRisk.count === 3);
check('no-reason-rule-helper', noReasonRefundEligibility(selectedOrder()).eligible === true);
check('order-device-snapshot', ['clientVersion','osVersion','deviceModel','cpu','gpu','memoryGb','gamePlayMinutes'].every(key => key in selectedOrder()));
```

- [ ] **Step 2: Run smoke test and verify failure**

Run the local Playwright smoke command against `Mac端租号功能-标注版.html?smoke=1`.

Expected: new refund-risk assertions fail before implementation.

- [ ] **Step 3: Implement state and helpers**

Add default rule state, current-user recent no-reason refunds, order device snapshots, 72-hour calculation, 30-minute calculation, and immutable order eligibility fields.

```js
refundRisk:{enabled:true,days:30,count:3,version:'NRR-20260715-01'},
currentUserRisk:{recentNoReasonRefunds:3},
```

Implement helpers that return `{ eligible, reason }` and count only completed no-reason refunds.

- [ ] **Step 4: Re-run smoke test**

Expected: rule and snapshot assertions pass without changing existing assertions.

### Task 2: Update Checkout Benefits And Payment Risk Flow

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Add failing UI assertions**

Assert the exact five benefit titles/subtitles, absence of insurance/PICC copy, risk-dialog copy, cancel behavior, continue behavior, and purchase-confirm order.

- [ ] **Step 2: Replace benefit copy**

Use these exact pairs:

```js
[
  ['100% 正版','家庭共享 官方正版'],
  ['一键启动','开始游戏 仅需一键'],
  ['永不顶号','游戏期间独占不限制'],
  ['存档无忧','自动同步个人存档'],
  ['3天无理由','游戏时长30分钟内，3天内无理由退款']
]
```

- [ ] **Step 3: Replace insurance detail with no-reason detail**

Explain the payment-time start, 72-hour limit, target-game cumulative 30-minute limit, and fulfillment-after-sales exception. Remove all PICC and insurance-period content.

- [ ] **Step 4: Implement payment dialog chaining**

When the rule hits, show:

```text
近期退款数量较多，再次购买将无法享受3天无理由退款，请确认后购买。
```

`暂不购买` remains on checkout. `确认并继续` opens the existing purchase confirmation and stores the risk confirmation for the created order.

- [ ] **Step 5: Run smoke test**

Expected: exact-copy, dialog-order, cancellation, continuation, and snapshot checks pass.

### Task 3: Add Backend Risk Settings And Device Context

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Add failing admin assertions**

Assert that system settings opens a refund-risk form, validates positive integers, requires confirmation, updates the rule, and writes an audit record. Assert order rows and drawer device fields.

- [ ] **Step 2: Implement system-settings dialog**

Add enable toggle, rolling days, refund-count threshold, current rule version, and save confirmation. Use default `30天/3笔`.

- [ ] **Step 3: Add order-list device summary**

Display masked user ID, model, client version, macOS version, and formatted target-game playtime. Keep CPU/GPU/memory in the drawer to avoid table overflow.

- [ ] **Step 4: Add drawer environment section**

Display client version, macOS version, model, CPU, GPU, memory, order playtime, and snapshot time. Missing values render `--`.

- [ ] **Step 5: Run smoke test**

Expected: settings, audit, list summary, drawer details, and missing-value checks pass.

### Task 4: Add No-Reason After-Sales Eligibility

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Add failing eligibility assertions**

Cover eligible, over-72-hour, over-30-minute, risk-denied, and fulfillment-issue branches.

- [ ] **Step 2: Add the no-reason reason type**

Add `no-reason` / `3天无理由` to the flat issue grid. Disable it with an explicit reason when unavailable while keeping startup, login, and account issue options available.

- [ ] **Step 3: Persist and display refund context**

Store reason code, eligibility result, rule version, playtime, and denied reason. Display them in admin list and detail.

- [ ] **Step 4: Run smoke test**

Expected: no-reason eligibility is enforced and fulfillment after-sales remains available.

### Task 5: Complete Structured Demo Annotations

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Reference: `docs/superpowers/specs/2026-07-14-mac-rental-annotation-structure-design.md`

- [ ] **Step 1: Change annotation schema**

Replace each annotation `body` with non-empty `trigger`, `display`, and `interaction` fields. Apply the same schema to interaction and edge tabs.

- [ ] **Step 2: Change annotation rendering**

Render three labeled blocks: `触发条件`, `展示说明`, `交互说明`.

- [ ] **Step 3: Add missing coverage**

Cover library session state, detail action matrix, checkout benefits, no-reason rules, risk settings, payment warning, cancellation/deletion confirmation, repeat-order prefill, after-sales form, device context, and game playtime.

- [ ] **Step 4: Extend annotation validation**

Fail smoke tests for duplicate IDs, missing targets, missing fields, or pages with newly added functionality and no annotation.

- [ ] **Step 5: Run smoke test**

Expected: all annotation structure and target checks pass.

### Task 6: Synchronize The PRD

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: Replace insurance requirements**

Rename startup insurance to three-day no-reason refund and remove PICC, policy-period, insurance-claim, and insurance-metric references.

- [ ] **Step 2: Add risk and device requirements**

Document backend `X天/X笔` configuration, payment warning, immutable order eligibility, eligibility branches, client/macOS versions, model, CPU, GPU, memory, and order target-game playtime.

- [ ] **Step 3: Update events and parameters**

Replace insurance events with no-reason exposure/risk/eligibility events and define all new parameters in the parameter table.

- [ ] **Step 4: Validate Markdown**

Check headings, table pipe counts, event-to-parameter coverage, 19 online image references before screenshot replacement, and absence of local links.

Expected: no missing sections, malformed tables, undefined parameters, or local image links.

### Task 7: Regenerate And Publish Screenshots

**Files:**
- Modify: `tools/capture-mac-rental-prd-screenshots.js`
- Regenerate: `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/*.png`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: Update screenshot scenarios**

Capture checkout/no-reason, payment risk warning, after-sales eligibility, backend order device context, and backend refund-risk settings.

- [ ] **Step 2: Generate screenshots**

Run:

```powershell
node tools\capture-mac-rental-prd-screenshots.js
```

Expected: all configured PNGs are generated without page errors.

- [ ] **Step 3: Inspect affected screenshots**

Verify exact copy, no PICC text, complete dialogs, readable device fields, and no annotation-shell capture.

- [ ] **Step 4: Publish through an isolated worktree**

Commit only screenshot assets to a dedicated publish branch and use the immutable commit SHA in jsDelivr URLs.

- [ ] **Step 5: Replace PRD image URLs**

Update every screenshot reference to the new immutable CDN commit.

### Task 8: Final Verification

**Files:**
- Verify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Verify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: Run complete Demo smoke test**

Expected: all legacy and new assertions pass.

- [ ] **Step 2: Validate screenshots and CDN**

Expected: every PNG opens, dimensions match capture mode, every CDN URL returns `200 image/png`, and no local image references remain.

- [ ] **Step 3: Scan removed terminology**

Run searches for `启动保障险`, `中国人保`, `保险期限`, and old insurance event IDs.

Expected: no active Demo or PRD requirement uses removed terminology.

- [ ] **Step 4: Review scoped Git changes**

Confirm only the Demo, PRD, capture script, screenshot assets, plan, and approved specs changed for this task. Do not revert unrelated user changes.
