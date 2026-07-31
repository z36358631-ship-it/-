# Mac Rental Steam Native Login Credential Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current simplified Steam form and persistent staged assistant with a high-fidelity Steam dual-column login window, a light credential entry, and a repeatable on-demand rental credential popover.

**Architecture:** Keep the existing order, account binding, sensitive authorization, and login entry chain. Render the Steam window once, then update only a dedicated credential popover host so opening, copying, requesting a guard code, closing, and reopening never rebuild the Steam form or lose input state. Treat the GameHub entry and popover as an overlay anchored to the Steam window rather than injected Steam UI.

**Tech Stack:** Single-file HTML/CSS/vanilla JavaScript Demo, Playwright smoke and screenshot verification, Markdown PRD, GitHub Pages, jsDelivr fixed-commit image URLs.

---

## File Map

- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
  - Steam login window layout, credential popover, state, actions, annotations, and embedded smoke checks.
- Modify: `tools/verify-mac-rental-membership.cjs`
  - Browser interaction checks and eight PRD screenshots.
- Modify: `public/prd/mac-rental/c05-library-steam-login.png`
  - Steam login window with the light credential entry.
- Modify: `public/prd/mac-rental/c05-manual-login-credentials.png`
  - Open credential popover with account, password, and active Steam Guard code.
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
  - V3.8 change record, C-side flow, boundary rules, metrics, acceptance text, and fixed-SHA images.
- Create: `docs/superpowers/specs/2026-07-31-mac-rental-steam-native-login-credential-popover-design.md`
  - Approved product and interaction design.
- Create: `docs/superpowers/plans/2026-07-31-mac-rental-steam-native-login-credential-popover.md`
  - This implementation plan.

### Task 1: Add Failing Smoke Checks

**Files:**
- Modify: `tools/verify-mac-rental-membership.cjs`
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Replace staged-assistant assertions with the approved initial-state checks**

Add browser assertions equivalent to:

```js
check(
  'steam-login-matches-dual-column-reference',
  document.querySelector('.steam-account-column') &&
  document.querySelector('.steam-qr-column') &&
  document.querySelector('[data-action="open-credential-popover"]')
);
check(
  'credential-popover-closed-by-default',
  !document.querySelector('.rental-credential-popover') &&
  !document.body.textContent.includes(credentialAccount.loginPassword)
);
```

- [ ] **Step 2: Add interaction assertions for open, repeat copy, on-demand code, close, and reopen**

Use the current bound order and account:

```js
dispatchAction('open-credential-popover', { dataset: { id: credentialOrder.id } });
await nextPaint();
check(
  'credential-popover-opens-with-account-and-password',
  document.querySelector('.rental-credential-popover') &&
  document.querySelector('[data-action="copy-login-account"]') &&
  document.querySelector('[data-action="copy-login-password"]') &&
  !document.querySelector('[data-guard-value]')
);

dispatchAction('request-guard-code', { dataset: { id: credentialOrder.id } });
await nextPaint();
const firstGuardCode = credentialAccount.guardCode;
check(
  'guard-code-is-on-demand',
  /^[23456789BCDFGHJKMNPQRTVWXY]{5}$/.test(firstGuardCode) &&
  document.querySelector('[data-guard-value]')
);

dispatchAction('close-credential-popover', { dataset: { id: credentialOrder.id } });
dispatchAction('open-credential-popover', { dataset: { id: credentialOrder.id } });
await nextPaint();
check(
  'credential-popover-reopens-with-same-valid-code',
  credentialAccount.guardCode === firstGuardCode &&
  document.querySelector('[data-guard-value]')?.textContent.includes(firstGuardCode)
);
```

- [ ] **Step 3: Add form-preservation and close-boundary checks**

```js
const steamAccountInput = document.querySelector('#steamAccountInput');
steamAccountInput.value = 'typed-in-steam';
dispatchAction('close-credential-popover', { dataset: { id: credentialOrder.id } });
dispatchAction('open-credential-popover', { dataset: { id: credentialOrder.id } });
await nextPaint();
check('steam-input-survives-popover-rerender', steamAccountInput.value === 'typed-in-steam');
check('steam-close-remains-separate', document.querySelector('.manual-login-dialog'));
```

- [ ] **Step 4: Run the test and verify the new checks fail**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: existing checks run, then at least `steam-login-matches-dual-column-reference` or `credential-popover-closed-by-default` fails because the current Demo still renders the persistent staged assistant.

- [ ] **Step 5: Commit the failing test**

```powershell
git add -- tools/verify-mac-rental-membership.cjs "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html"
git commit -m "test(rental): define Steam credential popover flow"
```

### Task 2: Rebuild the Steam Login Window

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: Replace the compact login window CSS with the reference layout**

Create these stable layout boundaries:

```css
.manual-login-dialog {
  position: relative;
  width: min(980px, calc(100% - 24px));
  min-height: 620px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #36383d;
  border-radius: 2px;
  background: #1f2024;
}
.steam-native-login {
  min-height: 620px;
  padding: 46px 58px 42px;
  background: #1f2024;
}
.steam-login-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, .85fr);
  gap: 68px;
  margin-top: 34px;
}
.steam-account-column,
.steam-qr-column {
  min-width: 0;
}
```

Use a flat Steam dark surface, Steam blue only for field labels and the login action, and a blurred/dimmed library background. Remove the current radial blue background and 8–11px critical text.

- [ ] **Step 2: Add the full two-column Steam content**

Render:

```html
<header class="steam-login-header">
  <span class="steam-official-mark" aria-hidden="true">
    <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22"/><circle cx="31" cy="15" r="7"/><circle cx="16" cy="31" r="6"/><path d="M20 28l8-9"/></svg>
  </span>
  <strong>STEAM</strong>
  <button class="rental-credential-entry" data-action="open-credential-popover">
    <span aria-hidden="true">⌘</span> 租号登录信息
  </button>
  <button class="steam-window-close" data-action="confirm-no" aria-label="关闭 Steam 登录窗口">×</button>
</header>
<div class="steam-login-columns">
  <section class="steam-account-column">
    <label>用账户名称登录</label>
    <input id="steamAccountInput" autocomplete="username">
    <label>密码</label>
    <input id="steamPasswordInput" type="password" autocomplete="current-password">
    <label><input id="steamRememberInput" type="checkbox" checked> 记住我</label>
    <button data-action="steam-native-submit">登录</button>
    <a href="#" data-action="steam-help">请求帮助，我无法登录。</a>
  </section>
  <section class="steam-qr-column">
    <h3>或者用二维码登录</h3>
    <div class="steam-qr-visual" role="img" aria-label="Steam 二维码登录视觉示意"></div>
    <p>通过二维码使用 Steam 手机应用登录</p>
    <p>还没有 Steam 帐户？ <a href="#" data-action="steam-create-account">创建免费帐户</a></p>
  </section>
</div>
<div class="credential-popover-host"></div>
```

The account column includes the account selector, password input, remember checkbox, gradient login button, and help link. The QR column includes the QR visual, scan guidance, and create-account link. The QR is explicitly a visual Demo element and does not claim a successful authorization.

- [ ] **Step 3: Keep the credential entry visually secondary**

Use a neutral dark pill beside the Steam close button. Add blue border/text only for hover, keyboard focus, and the open state. Do not use GameHub green for the entry or popover primary action.

- [ ] **Step 4: Run the smoke script**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: the dual-column and closed-default checks pass; popover checks still fail until Task 3.

- [ ] **Step 5: Commit the Steam visual rebuild**

```powershell
git add -- "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html"
git commit -m "feat(rental): match Steam dual-column login"
```

### Task 3: Implement the Repeatable Credential Popover

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `tools/verify-mac-rental-membership.cjs`

- [ ] **Step 1: Separate popover state from Steam page state**

Use:

```js
credentialView: {
  orderId: '',
  panelOpen: false,
  accountVisible: true,
  passwordVisible: false,
  guardCodeVisible: false,
  guardRequestStatus: '',
  copiedField: '',
  accessExpireAt: 0
}
```

Keep the existing account-bound `guardCode` and `guardExpireAt`. Remove staged-assistant-only state and events from the new flow.

- [ ] **Step 2: Add a local popover renderer**

Add a focused renderer that only changes `.credential-popover-host`:

```js
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function credentialPopoverHTML(access, now = serverNow()) {
  const { account, order } = access;
  const guardActive = Boolean(
    state.credentialView.guardCodeVisible &&
    account.guardCode &&
    Number(account.guardExpireAt) > now
  );
  const guardBlocked = Boolean(
    state.credentialView.guardRequestStatus === 'blocked' &&
    Number(state.guardRateLimit.blockedUntil) > now
  );
  const passwordText = state.credentialView.passwordVisible
    ? escapeHTML(account.loginPassword)
    : '••••••••••';
  const guardSection = guardActive
    ? `<div class="credential-popover-row guard-row">
        <span>Steam Guard</span>
        <b data-guard-value>${escapeHTML(account.guardCode)}</b>
        <button data-action="copy-guard-code" data-id="${escapeHTML(order.id)}">复制</button>
        <small data-guard-countdown>${Math.ceil((Number(account.guardExpireAt) - now) / 1000)} 秒后失效</small>
      </div>`
    : `<button class="credential-guard-request" data-action="request-guard-code" data-id="${escapeHTML(order.id)}" ${guardBlocked ? 'disabled' : ''}>
        ${guardBlocked ? '暂不可获取' : '获取 Steam Guard'}
      </button>`;
  return `<aside id="rentalCredentialPopover" class="rental-credential-popover" role="dialog" aria-label="租号登录信息">
    <header><div><b>租号登录信息</b><small>由盖世提供</small></div>
      <button data-action="close-credential-popover" data-id="${escapeHTML(order.id)}" aria-label="关闭租号登录信息">×</button>
    </header>
    <div class="credential-popover-row"><span>账号</span><b>${escapeHTML(account.loginName)}</b>
      <button data-action="copy-login-account" data-id="${escapeHTML(order.id)}">复制</button></div>
    <div class="credential-popover-row"><span>密码</span><b>${passwordText}</b>
      <button data-action="toggle-password-visibility" data-id="${escapeHTML(order.id)}">${state.credentialView.passwordVisible ? '隐藏' : '查看'}</button>
      <button data-action="copy-login-password" data-id="${escapeHTML(order.id)}">复制</button></div>
    ${guardSection}
    <footer><span class="credential-copy-feedback">${state.credentialView.copiedField ? '已复制' : ''}</span><small>仅当前租赁有效</small></footer>
  </aside>`;
}

function renderCredentialPopover(orderId) {
  const host = document.querySelector('.credential-popover-host');
  const entry = document.querySelector('[data-action="open-credential-popover"]');
  const access = credentialAccess(orderId);
  if (!host || !entry || !access.ok || !state.credentialView.panelOpen) {
    if (host) host.innerHTML = '';
    if (entry) entry.setAttribute('aria-expanded', 'false');
    return false;
  }
  host.innerHTML = credentialPopoverHTML(access);
  entry.setAttribute('aria-expanded', 'true');
  refreshIcons();
  return true;
}
```

The renderer must not assign `confirmLayer.innerHTML`, recreate `.steam-native-login`, or replace Steam inputs.

- [ ] **Step 3: Implement open, close, copy, and guard-code actions**

Use these rules:

```js
if (action === 'open-credential-popover') {
  state.credentialView.panelOpen = true;
  state.credentialView.passwordVisible = false;
  return renderCredentialPopover(el.dataset.id);
}
if (action === 'close-credential-popover') {
  state.credentialView.panelOpen = false;
  state.credentialView.passwordVisible = false;
  state.credentialView.copiedField = '';
  renderCredentialPopover(el.dataset.id);
  return document.querySelector('[data-action="open-credential-popover"]')?.focus();
}
if (action === 'request-guard-code') {
  const access = credentialAccess(el.dataset.id);
  if (!access.ok || !guardRequestAllowed()) return renderCredentialPopover(el.dataset.id);
  generateGuardCode(access.account);
  state.credentialView.guardCodeVisible = true;
  return renderCredentialPopover(el.dataset.id);
}
```

Copy actions remain repeatable and do not consume guard request rate limits. Copy password uses the real value even while masked; no feedback displays the copied value.

Add a guard-only limiter:

```js
function guardRequestAllowed(now = serverNow()) {
  const limiter = state.guardRateLimit;
  if (Number(limiter.blockedUntil) > now) {
    state.credentialView.guardRequestStatus = 'blocked';
    return false;
  }
  if (!Number(limiter.windowStart) || now - Number(limiter.windowStart) > 60000) {
    limiter.windowStart = now;
    limiter.count = 0;
  }
  limiter.count += 1;
  if (limiter.count > 6) {
    limiter.blockedUntil = now + 30000;
    state.credentialView.guardRequestStatus = 'blocked';
    return false;
  }
  state.credentialView.guardRequestStatus = '';
  return true;
}
```

Initialize `guardRateLimit` as `{ count: 0, windowStart: 0, blockedUntil: 0 }`. Account/password view and copy actions do not call this function. The popover disables only the guard request action while blocked and does not show the removed “操作过于频繁，请30秒后重试” message.

- [ ] **Step 4: Add popover dismissal and accessibility**

Implement:

- Popover close button.
- Click outside the popover but inside the Steam window closes only the popover.
- Esc closes the popover first and restores focus to the entry.
- `aria-expanded`, `aria-controls`, valid dialog label, visible focus states, and non-color status text.
- Full Steam close clears the sensitive view; popover close does not close Steam.

- [ ] **Step 5: Update authorization and expiry behavior**

`refreshCredentialCountdown()` updates only the guard-code row. When the guard code expires, remove the old code and render “重新获取”. When the sensitive authorization expires, close the popover and disable the entry without closing the Steam window.

Backgrounding restores password masking and removes sensitive visible DOM while keeping the Steam form and current order. Order end, refund, replacement, or usage end performs full cleanup.

- [ ] **Step 6: Run all automated checks**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: all smoke assertions pass and eight screenshots are generated.

- [ ] **Step 7: Commit the interaction**

```powershell
git add -- "Mac端demo/mac端租号功能/Mac端租号功能-标注版.html" tools/verify-mac-rental-membership.cjs
git commit -m "feat(rental): add repeatable credential popover"
```

### Task 4: Refresh Screenshots and PRD

**Files:**
- Modify: `public/prd/mac-rental/c05-library-steam-login.png`
- Modify: `public/prd/mac-rental/c05-manual-login-credentials.png`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: Capture and visually inspect the two Steam screenshots**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Verify:

- `c05-library-steam-login.png`: full two-column Steam window, credential entry visible, popover closed.
- `c05-manual-login-credentials.png`: popover open over QR area; account, masked password, active 5-character code, copy controls, countdown, and close are legible; the left Steam form is unobstructed.

- [ ] **Step 2: Commit the screenshots before fixing PRD URLs**

```powershell
git add -- public/prd/mac-rental/c05-library-steam-login.png public/prd/mac-rental/c05-manual-login-credentials.png
git commit -m "docs(rental): refresh Steam credential popover screenshots"
```

Record the exact 40-character commit SHA that contains the images:

```powershell
git rev-parse HEAD
```

- [ ] **Step 3: Update the PRD**

Add V3.8 and yellow-highlight the changed content:

```markdown
| 2026.07.31 | V3.8 | 郑群超 | <span style="background-color: #FEF794;">Steam 登录界面按参考图还原双栏结构，并将常驻助手改为</span><span style="color: #3370FF; font-weight: 700; background-color: #FEF794;">顶栏轻入口与可反复打开的凭据浮层</span><span style="background-color: #FEF794;">；账号密码保持可复制，验证码由用户按需获取</span> | <span style="background-color: #FEF794;">Steam 登录还原与凭据交互简化</span> |
```

Update the C-side summary table, Steam login flow, boundary table, security requirements, metrics, acceptance items, self-check, and simulated review. Remove the staged-assistant terms that no longer apply:

- `步骤 1/2`
- `步骤 2/2`
- `账号密码与验证码分阶段替换`
- `返回账号密码`
- `默认展开助手`

Retain:

- same order and account;
- no repeated account allocation;
- explicit guard request;
- sensitive logging restrictions;
- final login result from Steam session or downstream checks.

- [ ] **Step 4: Replace all 34 PRD image links with the image commit SHA**

Build each link from the exact values returned by Git and the Markdown parser:

```powershell
$imageCommit = git rev-parse HEAD
$imageName = 'c05-library-steam-login.png'
$url = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/mac-rental/$imageName"
```

Update the PRD self-check line to the same SHA. No local path, relative path, `@master`, or `@main` is allowed.

- [ ] **Step 5: Commit the PRD**

```powershell
git add -- "prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md"
git commit -m "docs(rental): specify Steam credential popover"
```

### Task 5: Final Verification, Publish, and Sync

**Files:**
- Verify all files from Tasks 1–4.
- Sync the final files to `C:/Users/z3635/官网改动`.

- [ ] **Step 1: Run the complete test suite**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
git diff --check
```

Expected: all smoke checks pass, screenshots report `8/8`, and `git diff --check` prints no error.

- [ ] **Step 2: Verify PRD link structure**

Expected:

- Markdown images: `34`
- fixed image-SHA URLs: `34`
- local and relative image paths: `0`
- floating `@master` or `@main` image URLs: `0`
- obsolete staged-assistant text: `0`

- [ ] **Step 3: Push the branch to remote master**

Confirm `refs/remotes/origin/master` has not changed, rebase if required, then:

```powershell
git push origin HEAD:refs/heads/master
```

- [ ] **Step 4: Verify every remote image and the online Demo**

For every PRD image URL require:

- HTTP `200`
- `Content-Type: image/png`

For the GitHub Pages Demo require:

- HTTP `200`
- `Content-Type: text/html`
- HTML contains `open-credential-popover`, `rental-credential-popover`, and `request-guard-code`.

- [ ] **Step 5: Sync the final files to the main workspace**

Copy only the Demo, verifier, PRD, two screenshots, design, and plan. Compare SHA-256 hashes between the clean worktree and main workspace; all target files must match.

- [ ] **Step 6: Final handoff**

Provide:

- GitHub Pages preview URL.
- exact remote master commit SHA.
- local Demo and PRD paths.
- smoke and screenshot pass counts.
- `34/34` image HTTP and MIME verification result.
