# Compatibility Review Public Pool and Device Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the browser-filling game state with a centered landscape phone shell and replace per-user cloud-share branching with a deduplicated community configuration pool driven by the checkbox “分享我的启动方案和本次运行时长”.

**Architecture:** Keep the existing single-file C-side Demo and its current review-list/solution-detail flow. Add one isolated runtime device container for launching, gameplay, and exit confirmation; add one localStorage-backed community-profile repository that simulates server canonicalization, hash-based upsert, and idempotent session validation without creating user cloud-share drafts.

**Tech Stack:** Single-file HTML/CSS/JavaScript, Node.js test runner, `playwright-core`, localStorage fixtures, PowerShell validation, SHA-256 history checks.

---

## File map

- Modify `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`: define the new product contract before implementation.
- Modify `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`: implement the centered landscape phone and community-pool state model; delete the cloud-share confirmation branch.
- Modify `tools/capture-compatibility-review-v1.2.mjs`: capture the real desktop canvas with the centered landscape phone and the simplified review state.
- Refresh `test-results/compatibility-review-v1.2/*.png`: keep exactly ten current evidence images.
- Modify `docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md`: move the stage marker after implementation and verification.
- Do not modify `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html` or the four historical Demo files.

### Task 1: Lock the revised browser contract

**Files:**
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: Replace the old cloud-share selectors with the runtime device contract**

In the first C-side static-contract test, require the runtime canvas and device shell, remove `#cloudSharePage`, and assert that the legacy cloud-share page does not exist:

```js
const selectors = [
  ['#openCompatibilityReviews', '游戏详情兼容性评价入口'],
  ['#startGameButton', 'PC 游戏启动按钮'],
  ['#runtimeStage', '浏览器内运行环境层'],
  ['#runtimeDeviceFrame', '居中横屏手机壳'],
  ['#launchLayer', '手机内启动中状态'],
  ['#gameplayLayer', '手机内横屏游戏画面'],
  ['#exitGameButton', '横屏退出游戏入口'],
  ['#confirmExitGameButton', '退出游戏确认操作'],
  ['#modalFeedback', '共用兼容性评价弹窗'],
  ['#fbSolutionSection', '3–5 星分享本次运行配置区'],
  ['#solutionDetailPage', '现有方案详情页模拟'],
];
for (const [selector, contract] of selectors) await requireOne(page, selector, contract);
assert.equal(await page.locator('#cloudSharePage').count(), 0,
  'C 端不得保留个人云分享发布确认页');
```

- [ ] **Step 2: Add desktop geometry assertions for the landscape phone**

After starting the game in a `1440×900` page, assert that the browser remains larger than the phone and the phone is centered:

```js
await page.setViewportSize({ width: 1440, height: 900 });
await page.click('#startGameButton');
await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
const runtimeBox = await page.locator('#runtimeDeviceFrame').boundingBox();
assert.ok(runtimeBox, '横屏手机壳应可见');
assert.ok(runtimeBox.width <= 920 && runtimeBox.height <= 460,
  '横屏手机壳不得铺满桌面浏览器');
assert.ok(Math.abs((runtimeBox.x + runtimeBox.width / 2) - 720) <= 2,
  '横屏手机壳应在浏览器中水平居中');
assert.ok(Math.abs((runtimeBox.y + runtimeBox.height / 2) - 450) <= 2,
  '横屏手机壳应在浏览器中垂直居中');
```

- [ ] **Step 3: Replace the personal/cloud branch test with public-pool deduplication**

Use a successful session, share it twice with different reviews, and assert that the profile count remains one while validation count increases:

```js
await page.evaluate(() => window.compatibilityDemo.setSessionSnapshot({
  configHash: 'cfg_adreno750_stable_v1',
  profileName: 'Adreno 750 稳定方案',
  durationSeconds: 1122,
}));
await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
await page.click('#fbStarsWrap [data-val="5"]');
assert.match(await page.locator('#fbSolutionContent').innerText(),
  /分享我的启动方案和本次运行时长/);
assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), false);
await page.check('#shareSessionCheckbox');
await page.click('#modalFeedback .btn-submit');

let pool = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles());
assert.equal(pool.length, 1);
assert.equal(pool[0].validationCount, 1);
assert.equal(pool[0].totalDurationSeconds, 1122);

await page.evaluate(() => window.openFeedbackModal({ source: 'manual' }));
await page.click('#fbStarsWrap [data-val="4"]');
await page.check('#shareSessionCheckbox');
await page.click('#modalFeedback .btn-submit');
pool = await page.evaluate(() => window.compatibilityDemo.getCommunityProfiles());
assert.equal(pool.length, 1, '相同配置不得重复保存公共方案');
assert.equal(pool[0].validationCount, 2);
assert.equal(pool[0].totalDurationSeconds, 2244);
assert.equal(await page.locator('#cloudSharePage').count(), 0);
```

- [ ] **Step 4: Run the browser test and verify the new contract fails**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: FAIL because `#runtimeStage`, `#runtimeDeviceFrame`, `#shareSessionCheckbox`, and the community-profile API do not yet exist, and the legacy cloud-share page still exists.

- [ ] **Step 5: Commit the failing contract**

```powershell
git add -- tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit --only -m "test: define compatibility public pool contract" -- tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

### Task 2: Constrain launching and gameplay to a landscape phone

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: Replace the full-browser layers with one runtime device container**

Replace the sibling launch/gameplay sections with this structure:

```html
<div id="runtimeStage" class="runtime-stage" hidden aria-label="游戏运行环境">
  <div id="runtimeDeviceFrame" class="runtime-device-frame">
    <div class="runtime-device-screen">
      <section id="launchLayer" class="journey-layer" hidden aria-label="游戏启动中">
        <div class="launch-spinner" aria-hidden="true"></div>
        <strong>正在启动游戏</strong>
      </section>
      <section id="gameplayLayer" class="gameplay-layer" hidden aria-label="游戏运行中">
        <div id="gameplayWireframe" class="gameplay-wireframe media-wireframe" role="img" aria-label="横屏游戏画面占位">
          <span class="media-wireframe-label">横屏游戏画面</span>
        </div>
        <span class="gameplay-runtime">本次游玩 18:42</span>
        <button id="exitGameButton" class="game-exit-button" type="button" onclick="openExitGameConfirm()">退出游戏</button>
        <div id="exitGameConfirm" class="exit-confirm" hidden>
          <div class="exit-confirm-card">
            <strong>退出游戏？</strong>
            <p>当前游戏进度将按游戏自身规则保存。</p>
            <div class="exit-confirm-actions">
              <button type="button" onclick="closeExitGameConfirm()">取消</button>
              <button id="confirmExitGameButton" type="button" onclick="confirmExitGame()">退出游戏</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add desktop-safe and viewport-safe runtime geometry**

Replace the full-screen gameplay CSS with:

```css
.runtime-stage {
  position: fixed; inset: 0; z-index: 4000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; background: #1a1a2e;
}
.runtime-stage[hidden] { display: none; }
.runtime-device-frame {
  position: relative;
  width: min(916px, calc(100vw - 32px), calc((100vh - 32px) * 2.0088));
  aspect-ratio: 916 / 456;
  padding: 14px; border-radius: 44px; background: #1c1c1e;
  box-shadow: 0 0 0 2px #3a3a3c, 0 0 0 6px #1c1c1e,
    0 0 0 8px #3a3a3c, 0 30px 80px rgba(0,0,0,.9);
}
.runtime-device-screen {
  position: relative; width: 100%; height: 100%;
  overflow: hidden; border-radius: 30px; background: #050607;
}
.journey-layer, .gameplay-layer { position: absolute; inset: 0; }
.gameplay-wireframe { position: absolute; inset: 0; border: 0; }
```

- [ ] **Step 3: Make the state machine show and hide only the runtime canvas**

Update `setJourneyStage` so `runtimeStage` owns launching and gameplay visibility:

```js
function setJourneyStage(stage) {
  journeyState.stage = stage;
  document.body.dataset.journeyStage = stage;
  const isRuntime = stage === 'launching' || stage === 'gameplay';
  document.getElementById('runtimeStage').hidden = !isRuntime;
  document.getElementById('launchLayer').hidden = stage !== 'launching';
  document.getElementById('gameplayLayer').hidden = stage !== 'gameplay';
}
```

Keep the portrait `phoneFrame` unchanged under the runtime stage. `confirmExitGame()` must call `setJourneyStage('detail')`, restore the portrait detail, and only then open the proactive review.

- [ ] **Step 4: Run the geometry and journey tests**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: runtime geometry assertions PASS; community-pool tests still FAIL because the legacy sharing model remains.

- [ ] **Step 5: Commit the device shell**

```powershell
git add -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit --only -m "fix: contain gameplay in landscape phone" -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

### Task 3: Replace cloud-share branching with a deduplicated community pool

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: Remove the legacy personal-share DOM and state**

Delete `#cloudSharePage`, `solutionSourceMode`, `pendingSolutionId`, `pendingReviewLinkId`, `openCloudShareDraft`, `cancelCloudShareDraft`, and `confirmPublishAndLink`. Remove the `setSolutionSource` test API and every branch that distinguishes `public` from `private`.

- [ ] **Step 2: Add the session snapshot and community-profile repository**

Use one stable storage key and one exact upsert path:

```js
const COMMUNITY_PROFILES_KEY = 'gh_community_profiles_v1';
let shareSessionRequested = false;

function getCommunityProfiles() {
  try { return JSON.parse(localStorage.getItem(COMMUNITY_PROFILES_KEY) || '[]'); }
  catch { return []; }
}

function saveCommunityProfiles(profiles) {
  localStorage.setItem(COMMUNITY_PROFILES_KEY, JSON.stringify(profiles));
}

function upsertCommunityProfile(snapshot) {
  const profiles = getCommunityProfiles();
  const existingIndex = profiles.findIndex(item => item.configHash === snapshot.configHash);
  const current = existingIndex >= 0 ? profiles[existingIndex] : {
    id: 'community_' + snapshot.configHash,
    name: snapshot.profileName || '社区稳定方案',
    source: '社区共同验证',
    status: 'published',
    configHash: snapshot.configHash,
    validationCount: 0,
    totalDurationSeconds: 0,
    successRate: null,
    lastVerifiedDays: 0,
  };
  current.validationCount += 1;
  current.totalDurationSeconds += snapshot.durationSeconds || 0;
  current.samples = current.validationCount;
  current.successRate = current.validationCount >= 10 ? 92 : null;
  if (existingIndex >= 0) profiles[existingIndex] = current;
  else profiles.push(current);
  saveCommunityProfiles(profiles);
  return current;
}
```

Extend `journeyState` with one immutable session object:

```js
sessionSnapshot: {
  configHash: '',
  profileName: '',
  durationSeconds: 0,
}
```

At successful launch, lock `configHash` and `profileName`; at normal exit set the Demo duration to `1122` seconds.

- [ ] **Step 3: Render the single unchecked sharing option**

Replace the old scheme-source rendering with:

```js
function renderFeedbackSolution() {
  const section = document.getElementById('fbSolutionSection');
  const content = document.getElementById('fbSolutionContent');
  const snapshot = journeyState.sessionSnapshot;
  const canShare = fbStarVal >= 3 && Boolean(snapshot?.configHash);
  section.hidden = !canShare;
  if (!canShare) {
    content.innerHTML = '';
    shareSessionRequested = false;
    return;
  }
  content.innerHTML = `<label class="fb-solution-toggle">
    <input id="shareSessionCheckbox" type="checkbox" ${shareSessionRequested ? 'checked' : ''}
      onchange="toggleSessionShare(this.checked)">
    <span class="fb-solution-copy"><strong>分享我的启动方案和本次运行时长</strong></span>
  </label>`;
}

function toggleSessionShare(checked) {
  shareSessionRequested = Boolean(checked);
  saveFeedbackDraft();
}
```

Draft persistence must store `shareSessionRequested` only; it must not store a mutable scheme source or a pending cloud-share ID.

- [ ] **Step 4: Submit the review without a second flow**

In `submitFeedback`, derive the linked community profile once and always finish the review immediately:

```js
const linkedProfile = fbStarVal >= 3 && shareSessionRequested
  ? upsertCommunityProfile(journeyState.sessionSnapshot)
  : null;
const linkedSolution = linkedProfile?.id || '';

const item = {
  id: 'u_' + Date.now(),
  uid: MY_UID,
  name: '我',
  avatar: AVATARS[0],
  device: 'Pixel 9 Pro · Android 15',
  gpu: 'Adreno 750',
  memoryGB: 12,
  stars: fbStarVal,
  tags,
  text,
  html: '',
  media: fbMediaFiles,
  compatType: selectedCompatType,
  solutionId: linkedSolution,
  solution: linkedProfile,
  reviewState: linkedProfile
    ? (linkedProfile.validationCount < 10 ? 'low-sample' : 'valid')
    : (fbStarVal < 3 ? 'none' : 'unlinked'),
  likes: 0,
  appVersion: 'v6.1.2',
  date: dateStr,
};

finishReviewSubmission(savedReviewId);
showToast('评价提交成功，感谢你的反馈！');
```

Expose only the testing controls needed by the Demo contract:

```js
window.compatibilityDemo = Object.freeze({
  getInviteState,
  simulateGlobalCooldown,
  setApplicationMode,
  showSameConfigEmpty,
  resetJourney,
  getCommunityProfiles,
  setSessionSnapshot(snapshot) {
    journeyState.sessionSnapshot = { ...journeyState.sessionSnapshot, ...snapshot };
  },
});
```

- [ ] **Step 5: Run the complete browser suite**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: all C-side and unchanged B-side tests PASS; the suite confirms no cloud-share page, one public profile for duplicate hashes, two validations, correct accumulated duration, 1–2-star hiding, and the continuous user journey.

- [ ] **Step 6: Commit the community pool**

```powershell
git add -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git commit --only -m "feat: deduplicate shared compatibility profiles" -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

### Task 4: Refresh visual evidence around the real journey

**Files:**
- Modify: `tools/capture-compatibility-review-v1.2.mjs`
- Refresh: `test-results/compatibility-review-v1.2/*.png`

- [ ] **Step 1: Capture launching, gameplay, and exit confirmation on a desktop canvas**

Keep portrait captures at `390×844`, then resize to `1440×900` before start. Capture these exact files:

```js
await page.setViewportSize({ width: 1440, height: 900 });
await page.click('#startGameButton');
await page.waitForFunction(() => document.body.dataset.journeyStage === 'launching');
await shot(page, '05-c-launching-device-1440x900.png', { fullPage: false });
await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
await shot(page, '06-c-gameplay-device-1440x900.png', { fullPage: false });
await domClick(page, '#exitGameButton', '退出游戏入口');
await shot(page, '07-c-exit-confirm-device-1440x900.png', { fullPage: false });
```

After confirming exit, restore `390×844`, select five stars, check `#shareSessionCheckbox`, and capture the review before submission.

- [ ] **Step 2: Keep exactly ten current evidence files**

The output directory must contain:

```text
01-c-game-detail-wireframe-390x844.png
02-c-review-list-390x844.png
03-c-solution-detail-390x844.png
04-c-applied-solution-detail-390x844.png
05-c-launching-device-1440x900.png
06-c-gameplay-device-1440x900.png
07-c-exit-confirm-device-1440x900.png
08-c-proactive-review-390x844.png
09-c-my-linked-review-390x844.png
10-b-linked-filter-solution-drawer-1440x900.png
```

- [ ] **Step 3: Generate and inspect the evidence**

Run:

```powershell
node --check tools/capture-compatibility-review-v1.2.mjs
node tools/capture-compatibility-review-v1.2.mjs
```

Expected: ten non-empty PNG files. Inspect at least `05`, `06`, `07`, `08`, and `09`; the desktop canvas remains visible around the phone, no legacy cloud-share UI appears, and the checkbox label is exact.

- [ ] **Step 4: Commit the refreshed evidence**

```powershell
git add -- tools/capture-compatibility-review-v1.2.mjs test-results/compatibility-review-v1.2
git commit --only -m "test: refresh compatibility sharing evidence" -- tools/capture-compatibility-review-v1.2.mjs test-results/compatibility-review-v1.2
```

### Task 5: Run final regression and close the implementation loop

**Files:**
- Modify: `docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md`
- Verify only: four historical Demo files

- [ ] **Step 1: Run the final automated checks**

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
node --check tools/capture-compatibility-review-v1.2.mjs
git diff --check -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs tools/capture-compatibility-review-v1.2.mjs docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md
```

Expected: all browser tests PASS, syntax check exits `0`, and `git diff --check` prints no error.

- [ ] **Step 2: Scan forbidden product and implementation residue**

```powershell
rg -n '秒玩|demo-scenario-rail|orient-bar|demoScenario|cloudSharePage|个人稳定方案|确认发布并关联|data:image|https?://|<iframe|<canvas' -- demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
```

Expected: no matches.

- [ ] **Step 3: Verify historical Demo hashes remain unchanged**

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath `
  'demos/游戏详情/游戏详情兼容性评价demo.html',`
  'demos/后台管理/admin-兼容性评价后台.html',`
  'demos/兼容性诊断引导demo.html',`
  'demos/PC与Mac端/PC模拟器优化.html'
```

Expected hashes:

```text
C4CF4A780E29C8ADCBDB06C934C9A749D2469425CD3C70DC5179780728090678
F4698B67D852E4E5EFA3B579A09443C8B454CD09E2D9F670C88A1A17944A3294
ED829144BA16E4CBE785EE966617C701D02C08DDD0676F2DA46432FE4ADA53DF
520FAB1E86D6C1AEF5D2318EBE9F59C8974EE787F2AA0ED186F25EC094A74D89
```

- [ ] **Step 4: Mark the specification as verified**

Change the stage line to:

```markdown
**阶段：** 公共方案池与横屏手机容器 Demo 已实现并完成自动化与视觉验收
```

- [ ] **Step 5: Commit the verified specification**

```powershell
git add -- docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md
git commit --only -m "docs: verify compatibility public pool demo" -- docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md
```

- [ ] **Step 6: Update the taskboard and return the issue to review**

Add a comment containing the changed flow, test count, evidence paths, commit IDs, and known limitations. Read the latest issue version immediately before moving `GUANWANGGAID-25` from `in_progress` to `in_review`; do not move it to `done` without explicit user acceptance.

## Self-review result

- Spec coverage: runtime device geometry, exact checkbox copy, public-pool deduplication, privacy whitelist, idempotency, duration aggregation, no cloud-share branch, unchanged B Demo, evidence refresh, and historical-file protection are each mapped to a task.
- Placeholder scan: no `TBD`, `TODO`, “implement later”, or unspecified error-handling step remains.
- Type consistency: the plan consistently uses `runtimeStage`, `runtimeDeviceFrame`, `shareSessionCheckbox`, `shareSessionRequested`, `sessionSnapshot`, `configHash`, `validationCount`, and `totalDurationSeconds`.
