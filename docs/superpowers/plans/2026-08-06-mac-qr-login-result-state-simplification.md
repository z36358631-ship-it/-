# Mac QR Login Result State Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将扫码登录最终结果统一为“移动端回我的页仅提示一次 Toast；Mac 异常信息与刷新操作仅在二维码内；Mac 成功后直接恢复扫码前页面且无成功弹窗”。

**Architecture:** 保持现有单文件 HTML Demo 和服务端状态机不变，只重构最终结果态的渲染出口。`used`、`authorization_failed`、`cancelled`、`expired` 共享移动端“我的”页结果通知器；Mac 端异常态共享二维码遮罩组件，成功态通过经过校验的 `returnTo` 进入既有业务页。PRD 使用 V1.2 增补覆盖冲突规则，不删除 V1.0/V1.1 历史内容。

**Tech Stack:** Markdown、单文件 HTML/CSS/JavaScript、Node.js、Playwright、Chromium、PNG。

---

## File structure

- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html` — 10 个状态、移动端 Toast、Mac 二维码异常遮罩、成功返回页和右侧交互说明。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md` — V1.2 变更记录、当前页面说明、结果映射、异常边界和验收标准。
- Create: `tools/verify-mac-qr-login-result-states.mjs` — 自动验证 10 状态、唯一刷新入口、Toast 去重、`ready_to_claim`/`used` 边界、成功返回页并生成 PRD 截图。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 3.png` — Mac 取消态。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 6.png` — Mac 成功后返回扫码前业务页。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 8.png` — App 成功回“我的”页并显示 Toast。
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 10.png` — App 授权失败 Toast 与 Mac 二维码内失败态。
- Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 12.png` — App 过期 Toast 与 Mac 二维码内过期态。

### Task 1: Add an executable result-state contract

**Files:**
- Create: `tools/verify-mac-qr-login-result-states.mjs`
- Test: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html`

- [x] **Step 1: Write the failing verifier**

Create a Playwright verifier that opens the local Demo and checks the confirmed contract before capturing evidence:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const assetDir = path.join(root, 'prd', '【Prd】《盖世游戏》移动端扫码登录Mac端需求', '图片和附件');
const demoPath = path.join(assetDir, '扫码登录Mac端交互标注版demo.html');
const html = fs.readFileSync(demoPath, 'utf8');

assert(!html.includes('id="accountView"'), '成功弹窗 DOM 必须删除');
assert(!html.includes('qrShell.addEventListener'), '二维码容器不能承担刷新交互');
assert(html.includes('id="qrOverlayTitle"'), '二维码遮罩必须有唯一状态文案');
assert.equal((html.match(/id="refreshQrBtn"/g) || []).length, 1, '刷新按钮必须唯一');

const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(fs.existsSync);
assert(executablePath, '未找到本地 Chrome 或 Edge');

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(demoPath).href);

for (const scenario of ['wait', 'scanning', 'permissionDenied', 'confirm', 'authorizing', 'readyToClaim', 'success', 'authorizationFailed', 'expired', 'cancelled']) {
  await page.locator(`.state-nav[data-scenario="${scenario}"]`).click();
  assert(await page.locator(`.state-nav[data-scenario="${scenario}"]`).evaluate(el => el.classList.contains('active')));
}

await page.locator('.state-nav[data-scenario="readyToClaim"]').click();
assert(await page.locator('#resultPage').evaluate(el => el.classList.contains('show')));
assert.equal(await page.locator('#toast').evaluate(el => el.classList.contains('show')), false);

await page.locator('.state-nav[data-scenario="success"]').click();
assert(await page.locator('#minePage').evaluate(el => el.classList.contains('show')));
assert.equal(await page.locator('#toast').textContent(), 'Mac端登录成功');
assert(await page.locator('#macReturnView').evaluate(el => el.classList.contains('show')));

await browser.close();
console.log('mac qr login result states: PASS');
```

- [x] **Step 2: Run the verifier and confirm it fails against the old Demo**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
```

Expected: FAIL on `成功弹窗 DOM 必须删除`, `二维码容器不能承担刷新交互`, or `二维码遮罩必须有唯一状态文案`.

### Task 2: Simplify Demo result rendering

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html`
- Test: `tools/verify-mac-qr-login-result-states.mjs`

- [x] **Step 1: Replace the Mac invalid-state interaction with one real overlay button**

Use a non-interactive QR container and place the only refresh button inside the overlay:

```html
<div class="qr-shell" id="qrShell" aria-label="登录二维码">
  <canvas id="qrCanvas" width="224" height="224" aria-label="登录二维码"></canvas>
  <div class="qr-overlay" id="qrOverlay" aria-live="polite">
    <strong id="qrOverlayTitle">二维码已过期</strong>
    <button class="qr-overlay-action" id="refreshQrBtn" type="button">刷新二维码</button>
  </div>
  <div class="qr-confirm-overlay" aria-live="polite">…</div>
</div>
```

Remove the outer `qr-refresh-button`, `role="button"`, `tabindex`, and every `qrShell` click/keydown listener. In `expired-state`, hide `.qr-info` and `.security-line` so the title remains “扫码登录” and the overlay becomes the only result/operation area.

- [x] **Step 2: Route final mobile results to “我的” with one deduplicated Toast**

Keep `authorizing` and `readyToClaim` on the loading page. Add a per-request notifier for final states:

```js
let currentRequestId = 1;
const notifiedResults = new Set();

function notifyResultOnce(type, message) {
  const key = `${currentRequestId}:${type}`;
  showPhonePage('mine');
  if (notifiedResults.has(key)) return;
  notifiedResults.add(key);
  toast(message);
}
```

Map final states exactly:

```js
success: 'Mac端登录成功'
authorizationFailed: '登录未完成，请重新扫码'
cancelled: '登录已取消，请重新扫码'
expired: '二维码已过期，请重新扫码'
```

Move `#toast` inside `.phone`, change its duration to 2,000 ms, and increment `currentRequestId` only when a new challenge is generated.

- [x] **Step 3: Replace the Mac success card with the saved return page**

Delete `#accountView`, `#successCloseBtn`, the welcome card, and its closing listeners. Add `#macReturnView` as the already-existing destination preview; `success` maps to service state `used`, hides the login surface, shows and focuses the return view, and refreshes its signed-in user summary. `readyToClaim` must not show it.

```js
if (type === 'success') {
  notifyResultOnce('success', 'Mac端登录成功');
  loginSurface.classList.add('hidden');
  macReturnView.classList.add('show');
  macReturnView.focus({ preventScroll: true });
}
```

The displayed example return target is “游戏库”; the annotation must state that production uses the validated `returnTo`, and falls back to the default signed-in page when the target is missing, invalid, or unauthorized.

- [x] **Step 4: Generate a new challenge from the only refresh button**

Vary the demo QR seed and expose the generated challenge ID for verification:

```js
let qrChallengeSeed = 1;

function refreshQr() {
  currentRequestId += 1;
  qrChallengeSeed += 1;
  qrShell.dataset.challengeId = `QR-DEMO-${qrChallengeSeed}`;
  drawQr(qrChallengeSeed);
  setScenario('wait');
}
```

Bind only `#refreshQrBtn` to `refreshQr()`. Native button semantics provide mouse, Enter, and Space behavior.

- [x] **Step 5: Update the 10-state annotations**

Update success, failure, expired, and cancelled detail cards so they describe:

- App final results always return to “我的” and show one 2-second Toast per request.
- Success Toast is emitted only after Mac persistence + ACK and server `used`.
- Mac success has no page, Toast, or popup; it restores `returnTo` and refreshes session/user data.
- Mac invalid states have one overlay message and one refresh button; refreshing always creates a new challenge.

- [x] **Step 6: Run the verifier until the Demo contract passes**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
```

Expected: `mac qr login result states: PASS`.

- [x] **Step 7: Commit the Demo contract and implementation**

```powershell
git add -- "tools/verify-mac-qr-login-result-states.mjs" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/扫码登录Mac端交互标注版demo.html"
git commit -m "feat: simplify Mac QR login result states"
```

### Task 3: Add the V1.2 PRD override

**Files:**
- Modify: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md`

- [x] **Step 1: Add the V1.2 version record and current-page corrections**

Append this version row without removing V1.0/V1.1:

```markdown
|2026\.08\.06|V1\.2|郑群超 / Codex|精简扫码结果态：App 最终结果回“我的”页仅提示一次 Toast；Mac 异常信息与刷新入口收进二维码；成功后直接恢复扫码前页面且无弹窗|GUANWANGGAID-1|
```

Correct the current experience path, scope, module design, and 4.2.1 page table so no current rule says the QR container is clickable or Mac displays a success popup/Toast.

- [x] **Step 2: Add section 4.5 “V1.2 结果态精简（优先执行）”**

The section must contain the authoritative mapping:

```markdown
|服务端状态|App 页面与反馈|Mac 页面与反馈|唯一可操作项|
|---|---|---|---|
|`used`|回“我的”页，Toast“Mac端登录成功”|直接恢复扫码前 `returnTo` 页面并刷新登录态，无弹窗|无|
|`authorization_failed`|回“我的”页，Toast“登录未完成，请重新扫码”|二维码内“登录未完成”|二维码内“刷新二维码”|
|`cancelled`|回“我的”页，Toast“登录已取消，请重新扫码”|二维码内“登录已取消”|二维码内“刷新二维码”|
|`expired`|回“我的”页，Toast“二维码已过期，请重新扫码”|二维码内“二维码已过期”|二维码内“刷新二维码”|
```

State that Toast lasts 2 seconds and deduplicates by request ID; `ready_to_claim` never emits success; invalid `returnTo` falls back to the default signed-in page; server status codes, logs, and metrics remain unchanged.

- [x] **Step 3: Add V1.2 acceptance cases and remove unresolved recommendations**

Add P0 cases for unique refresh entry, keyboard activation, per-request Toast dedupe, `ready_to_claim` no-success feedback, `used` direct return, invalid/unauthorized `returnTo`, and four final-result mappings. Update “待确认项” to state the result-state copy and behavior are confirmed.

- [x] **Step 4: Run a contradiction scan**

Run:

```powershell
rg -n "成功弹窗|欢迎回来|点击二维码区域|移动端和 Mac 端均显示|Mac.*Toast.*登录成功" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md"
```

Expected: any remaining hits are explicitly labelled V1.0/V1.1 historical rules and point readers to V1.2; current sections contain none.

### Task 4: Capture and verify final evidence

**Files:**
- Modify: `tools/verify-mac-qr-login-result-states.mjs`
- Modify/Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 3.png`
- Modify/Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 6.png`
- Modify/Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 8.png`
- Modify/Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 10.png`
- Create: `prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 12.png`

- [x] **Step 1: Extend the verifier with interaction assertions**

Assert that QR shell has no button role/tabindex, exactly one visible refresh button exists in each invalid state, Enter/Space creates a different `data-challenge-id`, App Toast is visible once per request, `readyToClaim` has no success Toast, and `success` shows the return page with no dialog.

- [x] **Step 2: Capture the five affected screenshots**

Use stable locators:

```js
async function select(scenario) {
  await page.locator(`.state-nav[data-scenario="${scenario}"]`).click();
  await page.waitForTimeout(80);
}

await select('cancelled');
await page.locator('#loginSurface').screenshot({ path: path.join(assetDir, 'image 3.png') });
await select('success');
await page.locator('#macReturnView').screenshot({ path: path.join(assetDir, 'image 6.png') });
await page.locator('.phone').screenshot({ path: path.join(assetDir, 'image 8.png') });
await select('authorizationFailed');
await page.locator('.stage').screenshot({ path: path.join(assetDir, 'image 10.png') });
await select('expired');
await page.locator('.stage').screenshot({ path: path.join(assetDir, 'image 12.png') });
```

- [x] **Step 3: Decode the PNGs and inspect them visually**

Run:

```powershell
Get-ChildItem "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件" -Filter "image*.png" | ForEach-Object {
  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  "{0}: {1}x{2}" -f $_.Name, $image.Width, $image.Height
  $image.Dispose()
}
```

Expected: every PNG decodes; `image 3/6/8/10/12` visually match the V1.2 page table without duplicate result blocks.

- [x] **Step 4: Run final static and browser checks**

Run:

```powershell
node tools/verify-mac-qr-login-result-states.mjs
git diff --check -- "docs/superpowers/plans/2026-08-06-mac-qr-login-result-state-simplification.md" "tools/verify-mac-qr-login-result-states.mjs" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求"
git status --short -- "docs/superpowers/plans/2026-08-06-mac-qr-login-result-state-simplification.md" "tools/verify-mac-qr-login-result-states.mjs" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求"
```

Expected: verifier PASS, `git diff --check` has no output, and status lists only this task's plan, verifier, Demo, PRD, and five screenshots.

- [x] **Step 5: Commit and request taskboard review**

```powershell
git add -- "docs/superpowers/plans/2026-08-06-mac-qr-login-result-state-simplification.md" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/【Prd】《盖世游戏》移动端扫码登录Mac端需求.md" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 3.png" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 6.png" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 8.png" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 10.png" "prd/【Prd】《盖世游戏》移动端扫码登录Mac端需求/图片和附件/image 12.png"
git commit -m "docs: update Mac QR login V1.2 feedback"
```

Add a `GUANWANGGAID-1` comment containing changes, verification, result, and remaining PRD image-publication risk; then move the issue from `in_progress` to `in_review` using the latest issue version.
