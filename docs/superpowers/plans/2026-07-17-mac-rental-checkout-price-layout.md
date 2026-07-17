# Mac Rental Checkout Price Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Mac rental checkout price block so its two white titles align with two vertically aligned red amounts, the first-order badge is green with white text, the struck standard rent stays to the right, and no pricing-explanation subtitle remains.

**Architecture:** Keep the existing single-file Demo and current pricing helpers. Change only checkout markup, checkout-specific CSS, smoke assertions, requirement copy, and the checkout evidence screenshot; do not add a pricing branch or alter payment calculations.

**Tech Stack:** Static HTML/CSS/JavaScript, built-in browser smoke suite, headless Chrome, Playwright screenshot script, Markdown PRD.

---

## File map

- `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`: checkout renderer, checkout price styles, annotation copy, and smoke assertions.
- `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`: canonical checkout rule and screenshot caption.
- `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F002-游戏详情与版本租期.md`: client checkout placement rule.
- `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F003-下单支付与资源锁定.md`: checkout pricing hierarchy and acceptance rule.
- `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c02-package-and-checkout.png`: refreshed visual evidence.

### Task 1: Lock the new checkout contract with failing smoke assertions

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html:742-751`

- [ ] **Step 1: Replace old placement assertions with the final DOM contract**

In the effective `window.__demoSmoke` suite, query `.checkout-original-price` from the right price block and require:

```js
const originalTitleNode=canvas.querySelector('.checkout-price-block>.checkout-original-title');
const originalPriceNode=canvas.querySelector('.checkout-price-block>.checkout-original-price');
const payablePriceNode=canvas.querySelector('.checkout-payable-price');
check('checkout-original-price-placement',
  originalTitleNode?.textContent.trim()==='游戏原价'&&
  originalPriceNode?.textContent.trim()===money(gameById(state.checkout.gameId).originalPrice)&&
  !canvas.querySelector('.checkout-game .checkout-game-list-price')&&
  getComputedStyle(originalTitleNode).color==='rgb(255, 255, 255)'&&
  getComputedStyle(originalPriceNode).color==='rgb(146, 152, 156)'&&
  Math.abs(originalPriceNode.getBoundingClientRect().right-payablePriceNode.getBoundingClientRect().right)<1
);
```

For the first-order fixture, require the title badge and visual price order:

```js
check('price-fixture-first-order-hierarchy',
  firstTag?.textContent.trim()==='首单5折'&&
  getComputedStyle(firstTag).backgroundColor==='rgb(44, 195, 133)'&&
  getComputedStyle(firstTag).color==='rgb(255, 255, 255)'&&
  firstPayableNode.getBoundingClientRect().left<firstStandardNode.getBoundingClientRect().left&&
  firstStandardNode?.textContent===money(firstStandard)&&
  getComputedStyle(firstStandardNode).textDecorationLine.includes('line-through')&&
  firstPayableNode?.textContent===money(firstPayable)&&
  !canvas.querySelector('.checkout-price-block small')
);
```

- [ ] **Step 2: Run smoke and verify the new assertions fail before markup changes**

Run:

```powershell
New-Item -ItemType Directory -Force '.tmp' | Out-Null
$path = (Resolve-Path 'Mac端demo\mac端租号功能\Mac端租号功能-标注版.html').Path
$url = ([System.Uri]::new($path).AbsoluteUri) + '?smoke=1'
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --virtual-time-budget=10000 --dump-dom $url | Set-Content '.tmp\mac-rental-checkout-smoke.html' -Encoding utf8
Select-String '.tmp\mac-rental-checkout-smoke.html' -Pattern 'checkout-original-price-placement|price-fixture-first-order-hierarchy|"pass":false'
```

Expected: the new placement and/or hierarchy checks report `"pass":false`; the browser process itself completes.

- [ ] **Step 3: Commit the test contract together with Task 2 implementation**

Do not create a red-test-only commit because the smoke suite is embedded in the production Demo file. Keep this hunk unstaged until Task 2 passes.

### Task 2: Implement the final price layout without changing calculations

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html:76-77,320,430-476`

- [ ] **Step 1: Remove the original price from the left game card**

Render the left card with cover and title only:

```js
<div class="checkout-game">
  <img src="${g.image}" alt="">
  <div class="checkout-game-copy"><h3>${g.name}</h3></div>
</div>
```

- [ ] **Step 2: Render the original price above the order amount and payable price before standard rent**

Use one right-side price block:

```js
<div class="checkout-price-block" data-anno-target="checkout-price">
  <span class="checkout-original-title">游戏原价</span>
  <b class="checkout-original-price">${money(g.originalPrice)}</b>
  <span class="checkout-price-title">订单金额${firstOrder?'<span class="first-order-tag">首单5折</span>':''}</span>
  <strong class="checkout-payable-price">${money(payablePrice)}</strong>
  ${firstOrder?`<s class="checkout-standard-price">${money(standardPrice)}</s>`:''}
</div>
```

This preserves `isFirstOrderCheckout()`, `getCheckoutPrice()`, and `getCheckoutPayablePrice()` unchanged. Non-first-order, renewal, and rerent states continue to omit the badge and struck standard rent through the existing `firstOrder` condition.

- [ ] **Step 3: Apply readable hierarchy styles**

Replace the old left-card price styles with:

```css
.checkout-price-block{display:grid;grid-template-columns:minmax(0,1fr) auto auto;grid-template-rows:auto auto;align-items:baseline;column-gap:9px;row-gap:10px;padding:14px 0;margin:16px 0;border-top:1px solid #333638;border-bottom:1px solid #333638}
.checkout-original-title{grid-column:1;grid-row:1;color:#fff;font-size:11px}
.checkout-original-price{grid-column:2;grid-row:1;justify-self:end;color:#92989c;font-size:13px;font-weight:400;text-decoration:none}
.checkout-price-title{grid-column:1;grid-row:2;color:#fff;display:flex;align-items:center;gap:7px}
.checkout-payable-price{grid-column:2;grid-row:2;justify-self:end}
.checkout-standard-price{grid-column:3;grid-row:2;color:#92989c;font-size:12px;text-decoration:line-through;text-decoration-thickness:1px}
.checkout-payable-price{font-size:28px!important;color:#ff565c!important}
.first-order-tag{padding:4px 8px;border-radius:4px;background:#2cc385;color:#fff;font-size:11px;font-weight:700;line-height:1;white-space:nowrap}
```

- [ ] **Step 4: Update annotation 40 to match the final copy and order**

Use:

```js
'“游戏原价”和“订单金额”使用白色文字；游戏原价金额使用普通灰色并与实付价右对齐；首单5折使用绿色底白字标签；划线价只展示金额。'
```

- [ ] **Step 5: Run the full smoke twice**

Run the Task 1 Step 2 command twice, then count results:

```powershell
$html = Get-Content '.tmp\mac-rental-checkout-smoke.html' -Raw
$result = [regex]::Match($html, '<pre id="smokeResult" hidden="">(.*?)</pre>').Groups[1].Value
$decoded = [System.Net.WebUtility]::HtmlDecode($result) | ConvertFrom-Json
"$($decoded.results.Where({$_.pass}).Count)/$($decoded.results.Count)"
```

Expected on both runs: `data-smoke-status="pass"`, no `"pass":false`, and the pass count equals the total count (current baseline: `287/287`).

- [ ] **Step 6: Commit Demo and smoke assertions only**

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
git commit --only -m "feat: refine mac rental checkout pricing" -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html'
```

Expected: the commit contains exactly one HTML file.

### Task 3: Align PRD wording and refresh checkout evidence

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md:249-275,974`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F002-游戏详情与版本租期.md:37`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F003-下单支付与资源锁定.md:35-45,108`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/图片和附件/PRD截图/c02-package-and-checkout.png`

- [ ] **Step 1: Replace the obsolete left-side placement rule**

Use this canonical wording in the main PRD and feature split:

```text
游戏原价在右侧价格区、“订单金额”上方展示；两个标题均为白色，原价金额使用普通灰色且与实付价按右边缘对齐；首单5折为绿色底白字，划线价只显示金额，不展示计价说明副文案。
```

Keep the rule that original game price does not participate in rental pricing. State that the first-order payable price precedes the struck `¥3.4`, with no visible `标准租价` label.

- [ ] **Step 2: Scan all scoped files for conflicting labels**

Run:

```powershell
rg -n "买断|非租金|确认订单左侧展示游戏本体原价|游戏原价.*划线" `
  'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html' `
  'prd/【盖世游戏Mac】游戏租号需求' `
  'docs/superpowers/specs/2026-07-17-mac-rental-checkout-price-layout-design.md'
```

Expected: no conflicting checkout copy; unrelated historical documents are outside this scan.

- [ ] **Step 3: Capture the checkout screenshot**

Run the existing deterministic capture script:

```powershell
node 'tools/capture-mac-rental-prd-screenshots.js'
```

Expected: all 25 screenshot names are printed, followed by `ERROR_COUNTS console=0 page=0 request=0`; `c02-package-and-checkout.png` shows the new layout.

- [ ] **Step 4: Inspect the new image**

Open `c02-package-and-checkout.png` with the local image viewer and verify: both titles are white, the gray original amount and red payable amount align on their right edges, `首单5折` is green with white text, the pricing subtitle is absent, the struck price has no `标准租价` label, and nothing clips or overlaps.

- [ ] **Step 5: Validate Markdown and changed files**

Run:

```powershell
git diff --check -- `
  'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md' `
  'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F002-游戏详情与版本租期.md' `
  'prd/【盖世游戏Mac】游戏租号需求/功能拆分版/features/F003-下单支付与资源锁定.md'
git status --short
```

Expected: no whitespace errors. Review the status and keep all unrelated dirty-worktree files unstaged.

- [ ] **Step 6: Commit only the scoped PRD files and refreshed checkout image**

Use explicit paths with `git commit --only`; do not include Android work or other user files. If the screenshot script rewrites unchanged PNGs, stage only `c02-package-and-checkout.png`.

### Task 4: Final local verification and publication boundary

**Files:**
- Verify: all files listed above

- [ ] **Step 1: Confirm exact user-facing copy**

Run:

```powershell
rg -n "游戏原价|Game Original Price|买断|非租金" `
  'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html' `
  'prd/【盖世游戏Mac】游戏租号需求'
```

Expected: active checkout requirements and Demo use `游戏原价`; neither `买断` nor `非租金` appears in scoped active content.

- [ ] **Step 2: Re-run smoke once after documentation and screenshot work**

Run Task 1 Step 2 and the result-count command from Task 2 Step 5.

Expected: all checks pass (current baseline: `287/287`).

- [ ] **Step 3: Report local completion without publishing**

Report the commit IDs, smoke pass count, screenshot validation, and exact visible labels. Do not push or publish until the user explicitly authorizes the updated version.
