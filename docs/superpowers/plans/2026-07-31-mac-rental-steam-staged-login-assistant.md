# Mac Rental Steam Staged Login Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the intrusive split-screen Steam login assistant with a compact, collapsible, two-stage helper that requests Steam Guard only after account and password entry.

**Architecture:** Keep the single-file Demo structure. Extend `state.credentialView` with a small UI state machine, render the Steam window as the primary surface, and render the GameHub assistant as a non-modal overlay whose content changes between credentials and Guard stages. Update the existing smoke test and PRD in the same change.

**Tech Stack:** Single-file HTML/CSS/vanilla JavaScript, Node.js smoke verification, Markdown PRD, Playwright screenshot capture.

---

### Task 1: Add staged helper state and rendering

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Test: `tools/verify-mac-rental-membership.cjs`

- [ ] **Step 1: Change the smoke expectations before implementation**

Assert that the first screen has only account/password assistance, no Guard code, and a compact floating helper:

```js
check('assistant-starts-with-primary-credentials',
  document.querySelector('.gamehub-login-assistant[data-stage="primary"]') &&
  !document.querySelector('[data-guard-value]'));
```

- [ ] **Step 2: Run the smoke test and verify the new expectation fails**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: the new staged-helper check fails against the current split-screen implementation.

- [ ] **Step 3: Extend the credential UI state**

Add `stage` and `collapsed` to `state.credentialView` and reset them in `clearCredentialView()`:

```js
credentialView:{
  orderId:'',
  stage:'primary',
  collapsed:false,
  accountVisible:false,
  passwordVisible:false,
  guardCodeVisible:false,
  accessExpireAt:0
}
```

- [ ] **Step 4: Replace the split-screen renderer**

Update `openManualLoginDialog()` so:

- Steam occupies the full workspace.
- The GameHub helper is an overlay card.
- `primary` renders only account and password.
- `guard` renders only Guard code and countdown.
- Opening the helper does not call `generateGuardCode()`.

- [ ] **Step 5: Add explicit stage actions**

Add actions:

```js
if(action==='request-guard-stage'){ /* validate, generate, switch to guard */ }
if(action==='toggle-login-assistant'){ /* collapse or expand */ }
if(action==='back-to-primary-credentials'){ /* clear code and return */ }
```

Keep `request-guard-code` for Guard refresh only.

- [ ] **Step 6: Stop treating the Steam form button as login success**

`steam-native-submit` changes from “mark session successful” to “move to Guard stage”. Final success remains tied to downstream Steam session/download/launch validation.

- [ ] **Step 7: Run the smoke test**

Run:

```powershell
node tools/verify-mac-rental-membership.cjs
```

Expected: all smoke checks pass.

### Task 2: Update annotation, screenshot, and PRD

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
- Modify: `public/prd/mac-rental/c05-library-steam-login.png`
- Modify: `tools/capture-mac-rental-prd-screenshots.js`

- [ ] **Step 1: Update annotation copy**

Describe the two stages, collapse behavior, manual fallback, and the fact that credentials and Guard are never displayed together.

- [ ] **Step 2: Capture the revised login screenshot**

Capture the primary credentials stage and verify all external game images are loaded before writing the screenshot.

- [ ] **Step 3: Add PRD version V3.7**

Add a highlighted version row and update the existing C-end consolidated table, security rules, events, edge cases, acceptance rules, and review record. Preserve the existing C-end/B-end single-table structure.

- [ ] **Step 4: Replace only the updated screenshot URL**

Commit the revised image, obtain the immutable 40-character SHA, and replace the affected PRD image URL with the fixed jsDelivr URL.

- [ ] **Step 5: Verify Feishu image compatibility**

For every PRD image URL, require:

- HTTP 200
- `Content-Type: image/png`
- no local path
- no `@master` or `@main`
- all image cells remain within the existing C-end/B-end tables

### Task 3: Final verification and publish

**Files:**
- Verify all files changed in Tasks 1–2.

- [ ] **Step 1: Run syntax and smoke checks**

```powershell
node --check tools/verify-mac-rental-membership.cjs
node tools/verify-mac-rental-membership.cjs
git diff --check
```

Expected: syntax succeeds, all smoke checks pass, and Git reports no whitespace errors.

- [ ] **Step 2: Inspect the screenshot**

Verify visually that Steam remains dominant, the helper does not cover the primary fields, and the Guard stage is absent from the first screenshot.

- [ ] **Step 3: Commit and push**

```powershell
git add -- <changed-files>
git commit -m "feat(rental): stage Steam manual login assistance"
git push origin HEAD:master
```

- [ ] **Step 4: Verify production preview**

Require the GitHub Pages Demo URL to return HTTP 200 and confirm remote `master` points at the final commit.

- [ ] **Step 5: Synchronize the final files**

Copy the exact final Demo, PRD, verification script, screenshot, design spec, and implementation plan back to the main workspace without touching unrelated dirty files.
