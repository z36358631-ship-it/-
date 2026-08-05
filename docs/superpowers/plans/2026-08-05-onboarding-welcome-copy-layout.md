# Onboarding Welcome Copy Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the onboarding welcome page so product value follows the welcome title and the two-line guidance directly precedes the start action.

**Architecture:** Keep the existing single-file HTML architecture. Move the prompt into its own semantic block after the feature card, use column flex layout to create flexible space above the prompt, and extend the existing Playwright verifier with DOM-order, hierarchy, viewport-boundary, and English-layout assertions.

**Tech Stack:** Single-file HTML/CSS/JavaScript, Node.js, Playwright.

---

### Task 1: Encode the approved layout in the verifier

**Files:**
- Modify: `tools/verify-onboarding-user-source-demo.mjs`
- Test: `tools/verify-onboarding-user-source-demo.mjs`

- [ ] **Step 1: Replace the old equal-level prompt assertions**

Extend `welcomeHierarchy` with element rectangles and DOM-order checks, then assert that the second line is visually stronger and the prompt sits between the feature card and the button:

```js
const welcomeHierarchy = await page.evaluate(() => {
  const style = selector => getComputedStyle(document.querySelector(selector));
  const rect = selector => document.querySelector(selector).getBoundingClientRect();
  const brand = document.querySelector('.welcome-brand');
  const features = document.querySelector('.welcome-features');
  const prompt = document.querySelector('.welcome-prompt');
  const start = document.querySelector('.welcome-start');
  return {
    headlineSize: parseFloat(style('#welcomeTitle').fontSize),
    promptTitleSize: parseFloat(style('#welcomePromptTitle').fontSize),
    promptDescSize: parseFloat(style('#welcomePromptDesc').fontSize),
    featureTitleSize: parseFloat(style('.welcome-features h2').fontSize),
    featureItemSize: parseFloat(style('.gh-feature-item').fontSize),
    featureShadow: style('.welcome-features').boxShadow,
    titleBottom: rect('#welcomeTitle').bottom,
    featuresTop: rect('.welcome-features').top,
    featuresBottom: rect('.welcome-features').bottom,
    promptTop: rect('.welcome-prompt').top,
    promptBottom: rect('.welcome-prompt').bottom,
    startTop: rect('.welcome-start').top,
    startBottom: rect('.welcome-start').bottom,
    phoneBottom: rect('.phone').bottom,
    domOrder: brand.nextElementSibling === features && features.nextElementSibling === prompt && prompt.nextElementSibling === start
  };
});
assert(welcomeHierarchy.promptDescSize > welcomeHierarchy.promptTitleSize, '第二行引导语应高于第一行层级');
assert(welcomeHierarchy.domOrder, '欢迎页 DOM 顺序应为标题、特色卡、引导语、开始按钮');
assert(welcomeHierarchy.featuresTop > welcomeHierarchy.titleBottom, '特色卡应位于欢迎标题之后');
assert(welcomeHierarchy.promptTop > welcomeHierarchy.featuresBottom, '引导语应位于特色卡之后');
assert(welcomeHierarchy.startTop > welcomeHierarchy.promptBottom, '开始按钮应位于引导语之后');
assert(welcomeHierarchy.startBottom <= welcomeHierarchy.phoneBottom, '开始按钮不得超出首屏');
```

- [ ] **Step 2: Add the English first-screen boundary check**

Use the existing region switch, then verify the English prompt and button remain visible:

```js
await page.locator('#regionBtn').click();
const overseasLayout = await page.evaluate(() => {
  const prompt = document.querySelector('.welcome-prompt').getBoundingClientRect();
  const start = document.querySelector('.welcome-start').getBoundingClientRect();
  const phone = document.querySelector('.phone').getBoundingClientRect();
  return {
    promptVisible: prompt.top >= phone.top && prompt.bottom <= phone.bottom,
    startVisible: start.top >= phone.top && start.bottom <= phone.bottom
  };
});
assert(overseasLayout.promptVisible, '海外版引导语不得超出首屏');
assert(overseasLayout.startVisible, '海外版开始按钮不得超出首屏');
await page.locator('#regionBtn').click();
```

- [ ] **Step 3: Run the verifier and confirm the new assertions fail**

Run:

```powershell
node tools/verify-onboarding-user-source-demo.mjs
```

Expected: FAIL because `.welcome-prompt` does not exist and the old prompt is still inside `.welcome-brand`.

### Task 2: Reorder and restyle the welcome page

**Files:**
- Modify: `demos/新手引导完整链路demo.html`
- Test: `tools/verify-onboarding-user-source-demo.mjs`

- [ ] **Step 1: Replace title-bound prompt styles with a dedicated prompt block**

Replace `.welcome-brand p` rules, remove `margin-top:auto` from `.welcome-features`, and add:

```css
.welcome-features{
  position:relative;z-index:1;margin-top:26px;padding:17px 16px 16px;
  border:1px solid rgba(255,255,255,.055);border-radius:var(--r-xl);
  background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.018));
  box-shadow:none;
}
.welcome-prompt{position:relative;z-index:1;margin-top:auto}
.welcome-prompt span{display:block}
.welcome-prompt__reason{color:rgba(255,255,255,.5);font-size:13px;line-height:18px;font-weight:350}
.welcome-prompt__action{margin-top:4px;color:rgba(255,255,255,.88);font-size:15px;line-height:22px;font-weight:420}
.welcome-start{margin-top:14px}
```

- [ ] **Step 2: Move the prompt after the feature card**

Use this direct-child order inside `.welcome-cover`:

```html
<div class="welcome-brand">
  <span class="welcome-kicker">WELCOME TO GAMEHUB</span>
  <h1 id="welcomeTitle">欢迎来到盖世游戏</h1>
</div>
<section class="welcome-features" id="featuresBox" aria-label="平台特色">...</section>
<p class="welcome-prompt">
  <span class="welcome-prompt__reason" id="welcomePromptTitle">为了您的绝佳体验</span>
  <span class="welcome-prompt__action" id="welcomePromptDesc">请与我们分享您的游玩经验～</span>
</p>
<button type="button" class="welcome-start" data-action="start-new-user">开始</button>
```

- [ ] **Step 3: Reposition decorative dots into unused space**

Keep the yellow dot near the title and move the blue/green dots into the flexible middle area so none overlaps text or the feature card:

```css
.welcome-orbit.two{width:11px;height:11px;top:454px;left:34px;background:var(--blue)}
.welcome-orbit.three{width:13px;height:13px;top:536px;right:30px;background:var(--green)}
```

- [ ] **Step 4: Run the full verifier**

Run:

```powershell
node tools/verify-onboarding-user-source-demo.mjs --capture
```

Expected: `PASS onboarding user source demo`, with `test-results/onboarding-welcome-review.png` refreshed.

- [ ] **Step 5: Commit the implementation and verifier together**

```powershell
git add -- 'demos/新手引导完整链路demo.html' 'tools/verify-onboarding-user-source-demo.mjs' 'test-results/onboarding-welcome-review.png'
git commit -m 'feat(onboarding): reorder welcome copy hierarchy'
```

### Task 3: Visual review and publish

**Files:**
- Review: `test-results/onboarding-welcome-review.png`
- Publish: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: Review the captured Chinese welcome page**

Confirm the title, feature card, prompt, and button follow the approved order; the flexible blank area is between the feature card and prompt; no decorative dot reads as a bullet or overlaps copy.

- [ ] **Step 2: Publish only the HTML file**

Create a clean worktree from the latest `origin/master`, copy only `demos/新手引导完整链路demo.html`, commit it, and push `HEAD:master`. If `github.com:443` is unavailable, update the same path through the GitHub Contents API using the cached Git credential.

- [ ] **Step 3: Verify the GitHub Pages result**

Open:

```text
https://z36358631-ship-it.github.io/-/demos/%E6%96%B0%E6%89%8B%E5%BC%95%E5%AF%BC%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AFdemo.html
```

Expected: HTTP 200; source contains `welcome-prompt`, `为了您的绝佳体验`, and `请与我们分享您的游玩经验～`.
