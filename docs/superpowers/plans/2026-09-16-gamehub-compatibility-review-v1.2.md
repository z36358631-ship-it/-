# Compatibility Review v1.2 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build task-specific C-end and B-end interactive HTML demos for GameHub compatibility review v1.2 without modifying the existing review, failure-guidance, or cloud-solution demos.

**Architecture:** Copy the existing C-end and B-end demos into new GUANWANGGAID-25 files, then add a demo-only scenario rail outside each product shell. Keep product behavior inside each offline HTML file: the C-end owns invite gating, the shared review modal, solution association, cloud-share confirmation, review cards, and solution application; the B-end owns review/solution filtering and moderation. Playwright tests exercise the real DOM and save deterministic screenshots.

**Tech Stack:** Offline HTML/CSS/JavaScript, localStorage-backed mock state, Node.js node:test, playwright-core, local Google Chrome.

---

## File map

- Create: demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
- Create: demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html
- Create: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
- Create: tools/capture-compatibility-review-v1.2.mjs
- Generate: test-results/compatibility-review-v1.2/

Read-only references:

- demos/游戏详情/游戏详情兼容性评价demo.html
- demos/后台管理/admin-兼容性评价后台.html
- demos/兼容性诊断引导demo.html
- demos/PC与Mac端/PC模拟器优化.html

### Task 1: Create isolated demo baselines and a failing browser contract

**Files:**
- Create: demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
- Create: demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html
- Create: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs

- [ ] **Step 1: Copy the existing demos to task-specific paths**

Run:

~~~powershell
Copy-Item -LiteralPath 'demos\游戏详情\游戏详情兼容性评价demo.html' -Destination 'demos\游戏详情\GUANWANGGAID-25-兼容性评价改版-C端demo.html'
Copy-Item -LiteralPath 'demos\后台管理\admin-兼容性评价后台.html' -Destination 'demos\后台管理\GUANWANGGAID-25-兼容性评价改版-B端demo.html'
~~~

Expected: two new files exist and the source files remain unchanged.

- [ ] **Step 2: Write the initial browser contract**

Create the test with this setup and two contract tests:

~~~js
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '../..');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const cDemo = path.join(root, 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html');
const bDemo = path.join(root, 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html');
let browser;

before(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: chrome,
    args: ['--allow-file-access-from-files', '--disable-background-networking']
  });
});

after(async () => {
  await browser?.close();
});

async function openDemo(file, viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return page;
}

test('C-end exposes agreed scenarios and one shared review modal', async () => {
  const page = await openDemo(cDemo);
  const selectors = [
    '#demoScenarioNormal', '#demoScenarioFailure', '#demoScenarioManual',
    '#modalFeedback', '#fbTypeWrap', '#fbSolutionSection',
    '#cloudSharePage', '#solutionDetailPage'
  ];
  for (const selector of selectors) {
    assert.equal(await page.locator(selector).count(), 1, selector);
  }
  await page.close();
});

test('B-end exposes solution filters, status column, and detail drawer', async () => {
  const page = await openDemo(bDemo, { width: 1440, height: 900 });
  const selectors = [
    '#dom-fb-solution-linked', '#dom-fb-solution-status',
    '#compat-solution-detail-drawer', '#compat-export-preview'
  ];
  for (const selector of selectors) {
    assert.equal(await page.locator(selector).count(), 1, selector);
  }
  await page.close();
});
~~~

- [ ] **Step 3: Run the contract and confirm the expected failure**

Run:

~~~powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
~~~

Expected: FAIL on #demoScenarioNormal.

- [ ] **Step 4: Commit the copied baselines and failing contract**

~~~powershell
git add -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit -m 'test: define compatibility review v1.2 demo contract'
~~~

### Task 2: Implement C-end entry scenarios and one shared review modal

**Files:**
- Modify: demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
- Test: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs

- [ ] **Step 1: Add the failing session-result test**

~~~js
test('normal exit opens review while failure route stays exclusive', async () => {
  const page = await openDemo(cDemo, { width: 1280, height: 900 });
  await page.click('#demoScenarioNormal');
  assert.equal(await page.locator('#modalFeedback').evaluate(el => el.classList.contains('show')), true);
  assert.equal(await page.locator('#failureGuideModal').evaluate(el => el.classList.contains('show')), false);
  assert.equal(await page.locator('#modalFeedback').getAttribute('data-entry-source'), 'proactive');

  await page.click('#modalFeedback .modal-x');
  await page.click('#demoScenarioFailure');
  assert.equal(await page.locator('#failureGuideModal').evaluate(el => el.classList.contains('show')), true);
  assert.equal(await page.locator('#modalFeedback').evaluate(el => el.classList.contains('show')), false);

  await page.click('#closeFailureGuide');
  await page.click('#demoScenarioManual');
  assert.equal(await page.locator('#modalFeedback').getAttribute('data-entry-source'), 'manual');
  await page.close();
});
~~~

- [ ] **Step 2: Add the external scenario rail**

Insert outside the product phone frame:

~~~html
<aside class="demo-scenario-rail" aria-label="Demo 场景">
  <div class="demo-scenario-title">评价触发场景</div>
  <button id="demoScenarioNormal" type="button">正常退出 · 主动邀评</button>
  <button id="demoScenarioFailure" type="button">启动失败 · 原引导</button>
  <button id="demoScenarioManual" type="button">详情页 · 我要评价</button>
  <button id="demoScenarioCooldown" type="button">A/B 游戏 · 7天频控</button>
  <div id="demoInviteState" class="demo-state-copy" aria-live="polite"></div>
</aside>
~~~

Keep the rail outside the product shell. Hide it below 1100 px so mobile screenshots contain only product UI.

- [ ] **Step 3: Reuse the unchanged failure-route reference modal**

Copy the existing dark diagnostic popup styling and content structure from demos/兼容性诊断引导demo.html. Keep its title, engine-plan list, “暂不处理” action, and “切换方案” action unchanged; only add stable IDs for the v1.2 exclusivity test.

~~~html
<div id="failureGuideModal" class="modal-mask" aria-hidden="true">
  <div class="diag-popup show">
    <button id="closeFailureGuide" class="dp-close" type="button">✕</button>
    <div class="dp-header">
      <div class="dp-header-top"><div class="dp-header-icon">⚠️</div><div><h2>检测到游戏启动异常</h2><div class="dp-sub">建议切换PC启动引擎方案，选择你遇到的问题帮助我们定位并识别</div></div></div>
    </div>
    <div class="dp-body"><div class="engine-list"><button type="button" class="engine-card active">推荐方案 · 稳定优先</button><button type="button" class="engine-card">兼容方案 · 图形修复</button></div></div>
    <div class="dp-footer">
      <div class="dp-actions"><button class="btn btn-ghost" type="button">暂不处理</button><button class="btn btn-primary" type="button">切换方案</button></div>
    </div>
  </div>
</div>
~~~

- [ ] **Step 4: Parameterize the existing openFeedbackModal function**

Use this state and entry contract:

~~~js
const INVITE_CONFIG = {
  globalDays: 7,
  unreviewedDays: 7,
  reviewUpdateDays: 30,
  maxPerGameGpu: 0
};

const inviteDemoState = {
  globalLastInviteAt: null,
  byGameGpu: {
    'gta5|Adreno 750': { lastInviteAt: null, lastReviewAt: null, exposures: 0 },
    'hades2|Adreno 750': { lastInviteAt: null, lastReviewAt: null, exposures: 0 }
  }
};

let selectedCompatType = '';
let pendingSolutionId = '';

function closeFailureGuide() {
  document.getElementById('failureGuideModal').classList.remove('show');
}

function closeFeedbackModal(options = {}) {
  if (options.preserveDraft !== false) saveFeedbackDraft();
  document.getElementById('modalFeedback').classList.remove('show');
}

function openFeedbackModal(options = {}) {
  const source = options.source === 'proactive' ? 'proactive' : 'manual';
  const modal = document.getElementById('modalFeedback');
  editingId = options.editingId || null;
  modal.dataset.entrySource = source;
  restoreFeedbackDraft();
  modal.classList.add('show');
  if (source === 'proactive') {
    recordInviteExposure(options.gameKey || 'gta5|Adreno 750');
  }
}

function routeSessionResult(result) {
  closeFeedbackModal({ preserveDraft: true });
  closeFailureGuide();
  if (result === 'failure') {
    document.getElementById('failureGuideModal').classList.add('show');
    return;
  }
  openFeedbackModal({ source: 'proactive', gameKey: 'gta5|Adreno 750' });
}
~~~

Bind the three scenario buttons and the existing “我要反馈” control to this one modal function.

- [ ] **Step 5: Add draft and exposure persistence**

~~~js
const REVIEW_DRAFT_KEY = 'gh_compat_review_v12_draft';

function saveFeedbackDraft() {
  localStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify({
    stars: fbStarVal,
    type: selectedCompatType,
    text: document.getElementById('fbEditor').value,
    media: fbMediaFiles,
    solutionId: pendingSolutionId
  }));
}

function recordInviteExposure(gameKey) {
  const now = Date.now();
  const state = inviteDemoState.byGameGpu[gameKey];
  state.lastInviteAt = now;
  state.exposures += 1;
  inviteDemoState.globalLastInviteAt = now;
  renderInviteDemoState();
}

function restoreFeedbackDraft() {
  const draft = JSON.parse(localStorage.getItem(REVIEW_DRAFT_KEY) || 'null');
  fbStarVal = draft?.stars || 0;
  selectedCompatType = draft?.type || '';
  fbMediaFiles = Array.isArray(draft?.media) ? draft.media : [];
  pendingSolutionId = draft?.solutionId || '';
  document.getElementById('fbEditor').value = draft?.text || '';
  paintFbStars(fbStarVal);
  renderMediaList();
}

function renderInviteDemoState() {
  const a = inviteDemoState.byGameGpu['gta5|Adreno 750'];
  const b = inviteDemoState.byGameGpu['hades2|Adreno 750'];
  document.getElementById('demoInviteState').textContent =
    '全局间隔 ' + INVITE_CONFIG.globalDays + ' 天 · A 已曝光 ' + a.exposures + ' 次 · B 已曝光 ' + b.exposures + ' 次';
}
~~~

Closing the modal saves its draft. Manual entry never calls recordInviteExposure. The A/B scenario must show that an A exposure blocks B until the configurable global interval expires without incrementing B exposures.

- [ ] **Step 6: Run and commit**

~~~powershell
node --test --test-name-pattern='normal exit|C-end exposes' tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git add -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit -m 'feat: add compatibility review invite scenarios'
~~~

Expected: selected tests PASS.

### Task 3: Implement rating/type linkage and the 3–5 star solution flow

**Files:**
- Modify: demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
- Test: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs

- [ ] **Step 1: Add failing tests**

~~~js
test('rating and compatibility type stay linked', async () => {
  const page = await openDemo(cDemo, { width: 1280, height: 900 });
  await page.click('#demoScenarioManual');
  await page.click('#fbStarsWrap [data-val="5"]');
  assert.equal(await page.locator('#fbTypeWrap [data-type="perfect"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#fbSolutionSection').isVisible(), true);

  await page.click('#fbTypeWrap [data-type="partial"]');
  assert.equal(await page.locator('#fbStarsWrap').getAttribute('data-value'), '3');

  await page.click('#fbStarsWrap [data-val="1"]');
  assert.equal(await page.locator('#fbTypeWrap [data-type="unplayable"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);
  await page.close();
});

test('private solution requires explicit publish confirmation', async () => {
  const page = await openDemo(cDemo, { width: 1280, height: 900 });
  await page.click('#demoScenarioManual');
  await page.click('#fbStarsWrap [data-val="4"]');
  await page.click('#publishSolutionButton');
  assert.equal(await page.locator('#cloudSharePage').isVisible(), true);
  assert.equal(await page.locator('#linkedSolutionBadge').isVisible(), false);
  await page.click('#confirmPublishAndLink');
  assert.equal(await page.locator('#cloudSharePage').isVisible(), false);
  assert.equal(await page.locator('#linkedSolutionBadge').isVisible(), true);
  await page.close();
});
~~~

- [ ] **Step 2: Replace free-form tags with four exclusive compatibility types**

~~~html
<div class="fb-tags-wrap" id="fbTypeWrap" role="group" aria-label="兼容类型">
  <button type="button" class="fb-tag" data-type="perfect" aria-pressed="false">完美兼容</button>
  <button type="button" class="fb-tag" data-type="basic" aria-pressed="false">基本可玩</button>
  <button type="button" class="fb-tag" data-type="partial" aria-pressed="false">有部分问题</button>
  <button type="button" class="fb-tag" data-type="unplayable" aria-pressed="false">不可玩</button>
</div>
~~~

~~~js
const TYPE_BY_STAR = { 1: 'unplayable', 2: 'partial', 3: 'partial', 4: 'basic', 5: 'perfect' };
const STAR_BY_TYPE = { unplayable: 1, partial: 3, basic: 4, perfect: 5 };

function setRating(value) {
  fbStarVal = Number(value) || 0;
  selectedCompatType = TYPE_BY_STAR[fbStarVal] || '';
  document.getElementById('fbStarsWrap').dataset.value = String(fbStarVal);
  paintFbStars(fbStarVal);
  renderCompatTypes();
  renderFeedbackSolution();
  saveFeedbackDraft();
}

function setCompatType(type) {
  selectedCompatType = type;
  setRating(STAR_BY_TYPE[type] || 0);
}
~~~

- [ ] **Step 3: Add the conditional solution section**

~~~html
<section id="fbSolutionSection" class="fb-solution-section" hidden>
  <div class="fb-lbl">本次运行方案</div>
  <div id="fbSolutionContent"></div>
</section>
~~~

Use seeded public and private variants. For 1–2 stars set hidden to true and clear pendingSolutionId. For 3–5 stars render the actual run solution. A private variant must show buttons with IDs publishSolutionButton and submitReviewOnlyButton. A public variant may be unlinked but may not be replaced by an unrelated solution.

- [ ] **Step 4: Add the existing-cloud-share simulation**

Add a full-page in-shell panel with IDs cloudSharePage, cancelCloudShare, confirmPublishAndLink, and linkedSolutionBadge. Reuse the visual language of demos/PC与Mac端/PC模拟器优化.html. It must contain editable name and summary fields plus the explicit copy “确认后公开给其他玩家”.

~~~js
function openCloudShareDraft() {
  saveFeedbackDraft();
  document.getElementById('cloudSharePage').hidden = false;
}

function cancelCloudShareDraft() {
  document.getElementById('cloudSharePage').hidden = true;
  pendingSolutionId = '';
  renderFeedbackSolution();
}

function confirmPublishAndLink() {
  pendingSolutionId = 'solution_private_01_published';
  document.getElementById('cloudSharePage').hidden = true;
  document.getElementById('linkedSolutionBadge').hidden = false;
  saveFeedbackDraft();
}
~~~

- [ ] **Step 5: Keep review submission independent**

submitFeedback must require only a rating. Save compatType and an optional solutionId. If fbStarVal is below 3, force solutionId to an empty string. Clear REVIEW_DRAFT_KEY after a successful save.

~~~js
if (!fbStarVal) {
  showToast('请先选择兼容性评分');
  return;
}
const reviewPayload = {
  stars: fbStarVal,
  compatType: selectedCompatType,
  text: document.getElementById('fbEditor').value.trim(),
  media: fbMediaFiles,
  solutionId: fbStarVal >= 3 ? pendingSolutionId : ''
};
~~~

- [ ] **Step 6: Run and commit**

~~~powershell
node --test --test-name-pattern='rating and compatibility|private solution' tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git add -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit -m 'feat: link compatibility reviews to verified solutions'
~~~

Expected: selected tests PASS.

### Task 4: Add review solution cards, confidence states, and application detail

**Files:**
- Modify: demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
- Test: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs

- [ ] **Step 1: Add failing list and detail tests**

~~~js
test('review list covers every solution state', async () => {
  const page = await openDemo(cDemo);
  await page.evaluate(() => window.openCompatPage());
  assert.equal(await page.locator('[data-review-state="valid"] .review-solution-card').count(), 1);
  assert.match(await page.locator('[data-review-state="low-sample"] .review-solution-meta').innerText(), /样本较少/);
  assert.equal(await page.locator('[data-review-state="unavailable"] .review-solution-card').getAttribute('aria-disabled'), 'true');
  assert.equal(await page.locator('[data-review-state="none"] .review-solution-card').count(), 0);
  await page.close();
});

test('solution detail rechecks compatibility before applying', async () => {
  const page = await openDemo(cDemo);
  await page.evaluate(() => window.openCompatPage());
  await page.click('[data-review-state="valid"] .review-solution-card');
  assert.equal(await page.locator('#solutionDetailPage').isVisible(), true);
  assert.match(await page.locator('#solutionConfidenceLine').innerText(), /同配置.*成功率.*最近验证/);
  await page.click('#applySolutionButton');
  assert.match(await page.locator('#solutionApplyResult').innerText(), /应用成功/);
  await page.close();
});
~~~

- [ ] **Step 2: Seed four explicit list states**

~~~js
const REVIEW_SOLUTION_STATES = [
  { reviewState: 'valid', stars: 5, solution: { id: 's1', status: 'published', samples: 38, successRate: 92, lastVerifiedDays: 3 } },
  { reviewState: 'low-sample', stars: 4, solution: { id: 's2', status: 'published', samples: 8, successRate: null, lastVerifiedDays: 6 } },
  { reviewState: 'unavailable', stars: 3, solution: { id: 's3', status: 'unavailable', samples: 21, successRate: 76, lastVerifiedDays: 18 } },
  { reviewState: 'none', stars: 2, solution: null }
];
~~~

Render no solution block for 1–2 stars, “样本较少” below ten samples, and an inert “方案暂不可用” block for unavailable plans.

- [ ] **Step 3: Add the solution card renderer**

~~~js
function renderReviewSolution(review) {
  const solution = review.solution;
  if (review.stars < 3 || !solution) return '';
  if (solution.status !== 'published') {
    return '<button class="review-solution-card unavailable" aria-disabled="true" type="button"><strong>方案暂不可用</strong><span>评价内容仍然保留</span></button>';
  }
  const stats = solution.samples < 10
    ? solution.samples + ' 次验证 · 样本较少 · 最近验证 ' + solution.lastVerifiedDays + ' 天前'
    : '同配置 · 成功率 ' + solution.successRate + '% · ' + solution.samples + ' 次验证 · 最近验证 ' + solution.lastVerifiedDays + ' 天前';
  return '<button class="review-solution-card" type="button" onclick="openSolutionDetail(\\'' + solution.id + '\\')"><strong>查看运行方案</strong><span class="review-solution-meta">' + stats + '</span></button>';
}
~~~

- [ ] **Step 4: Add solution detail and application states**

Create solutionDetailPage with solutionConfidenceLine, solutionCompatibilityDiff, applySolutionButton, and solutionApplyResult. The scenario rail must select exact match, auxiliary difference, and hard mismatch. Exact match applies directly; auxiliary difference requires confirmation; hard mismatch disables apply. Reuse current solution application visual patterns and do not invent a new application engine.

- [ ] **Step 5: Run and commit**

~~~powershell
node --test --test-name-pattern='review list|solution detail' tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git add -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit -m 'feat: show and apply review-linked solutions'
~~~

Expected: selected tests PASS.

### Task 5: Extend B-end review management with solution state

**Files:**
- Modify: demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html
- Test: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs

- [ ] **Step 1: Add the failing B-end lifecycle test**

~~~js
test('B-end filters linked solutions and keeps lifecycles independent', async () => {
  const page = await openDemo(bDemo, { width: 1440, height: 900 });
  await page.selectOption('#dom-fb-solution-linked', 'linked');
  await page.selectOption('#dom-fb-solution-status', 'published');
  await page.click('#dom-query-feedbacks');
  const rows = page.locator('#dom-fb-tbody tr[data-feedback-id]');
  assert.ok(await rows.count() > 0);
  assert.equal(await rows.locator('[data-solution-status="published"]').count(), await rows.count());

  await rows.first().locator('[data-action="view-solution"]').click();
  assert.equal(await page.locator('#compat-solution-detail-drawer').getAttribute('aria-hidden'), 'false');

  const feedbackId = await rows.first().getAttribute('data-feedback-id');
  await page.locator('[data-feedback-id="' + feedbackId + '"] [data-action="hide-review"]').click();
  assert.match(await page.locator('#compat-solution-detail-status').innerText(), /方案仍然有效/);
  await page.close();
});
~~~

- [ ] **Step 2: Add filters to domestic and overseas review tabs**

Use the same values for both regions:

~~~html
<select id="dom-fb-solution-linked" class="filter-select">
  <option value="all">全部关联状态</option>
  <option value="linked">已关联方案</option>
  <option value="unlinked">未关联方案</option>
</select>
<select id="dom-fb-solution-status" class="filter-select">
  <option value="all">全部方案状态</option>
  <option value="published">有效</option>
  <option value="pending">审核中</option>
  <option value="unavailable">不可用</option>
</select>
~~~

Add overseas equivalents with ovs prefixes. Give the existing domestic query button the ID dom-query-feedbacks. Add an “关联方案” table column showing name, status, and a read-only “查看方案” action.

- [ ] **Step 3: Extend seeded review data**

Every linked fixture uses this shape; unlinked fixtures use solution: null.

~~~js
solution: {
  id: 'solution_public_01',
  name: 'Adreno 750 稳定方案',
  source: '玩家公开方案',
  status: 'published',
  linkedAt: '2026-09-12 14:32'
}
~~~

Seed published, pending, unavailable, and unlinked states.

- [ ] **Step 4: Add read-only drawer and export preview**

Create compat-solution-detail-drawer with solution ID, name, source, status, linked time, and lifecycle copy. Create compat-export-preview listing the added CSV fields solution_id, solution_name, and solution_status. Do not add solution editing or status mutation actions.

- [ ] **Step 5: Preserve independent lifecycles**

Review hide, restore, pin, and batch handlers may only mutate review fields. They must never change feedback.solution.status. After a linked review is hidden, the drawer must state “评价已隐藏，方案仍然有效”.

- [ ] **Step 6: Run and commit**

~~~powershell
node --test --test-name-pattern='B-end' tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git add -- 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs'
git commit -m 'feat: manage review-linked solution states'
~~~

Expected: B-end contract and lifecycle tests PASS.

### Task 6: Add screenshot capture and responsive verification

**Files:**
- Modify: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
- Create: tools/capture-compatibility-review-v1.2.mjs
- Generate: test-results/compatibility-review-v1.2/

- [ ] **Step 1: Add viewport and page-error tests**

~~~js
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test('C-end has no horizontal overflow at ' + viewport.width + 'x' + viewport.height, async () => {
    const page = await openDemo(cDemo, viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, JSON.stringify(dimensions));
    assert.deepEqual(errors, []);
    await page.close();
  });
}
~~~

- [ ] **Step 2: Create the capture script**

The script must launch local Chrome, recreate only test-results/compatibility-review-v1.2, and capture these ten states:

1. C 390×844 proactive review modal.
2. C 390×844 1-star without solution.
3. C 390×844 4-star private solution.
4. C 390×844 published-and-linked solution.
5. C 390×844 review list.
6. C 390×844 solution detail.
7. C 390×844 failure-guide exclusivity.
8. C 844×390 review modal.
9. C 844×390 review list.
10. B 1440×900 linked filter and solution drawer.

Use:

~~~js
async function shot(page, filename) {
  const output = path.join(outDir, filename);
  await page.screenshot({ path: output, fullPage: true });
  console.log(output);
}
~~~

Exit non-zero if any required selector is missing.

- [ ] **Step 3: Run all browser tests**

~~~powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
~~~

Expected: all tests PASS and no browser errors occur.

- [ ] **Step 4: Generate evidence**

~~~powershell
node tools/capture-compatibility-review-v1.2.mjs
~~~

Expected: ten absolute PNG paths under test-results/compatibility-review-v1.2/.

- [ ] **Step 5: Inspect every screenshot**

Reject the build for clipping, horizontal overflow, unreadable text, conflicting overlays, missing solution state, or styling inconsistent with the existing GameHub surfaces.

- [ ] **Step 6: Commit tests and evidence tooling**

~~~powershell
git add -- 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs' 'tools/capture-compatibility-review-v1.2.mjs' 'test-results/compatibility-review-v1.2'
git commit -m 'test: verify compatibility review v1.2 demos'
~~~

### Task 7: Final product consistency review

**Files:**
- Verify: demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html
- Verify: demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html
- Verify: docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md
- Verify: tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs

- [ ] **Step 1: Run deterministic checks**

~~~powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
git diff --check -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs' 'tools/capture-compatibility-review-v1.2.mjs'
~~~

Expected: tests PASS and git diff --check prints nothing.

- [ ] **Step 2: Complete the product judgment checklist**

Confirm:

- failure result and review invite never coexist;
- proactive and manual entries open the same modal;
- the 30-minute threshold is unchanged;
- A/B game global cooldown is visible;
- intervals and count limit are service-configurable;
- 3–5 stars show the actual solution and 1–2 stars hide it;
- a private solution is never published without confirmation;
- review submission works without solution publication;
- hiding a review does not change solution state;
- same configuration remains “same game＋same GPU”;
- confidence hides success rate below ten samples;
- no exact reviewer launch date is displayed;
- no baseline demo changed.

- [ ] **Step 3: Verify baseline files remain untouched**

~~~powershell
git diff --quiet -- 'demos/游戏详情/游戏详情兼容性评价demo.html' 'demos/后台管理/admin-兼容性评价后台.html' 'demos/兼容性诊断引导demo.html' 'demos/PC与Mac端/PC模拟器优化.html'
if ($LASTEXITCODE -ne 0) { throw 'Existing baseline demo was modified' }
~~~

Expected: no output.

- [ ] **Step 4: Commit final task-owned fixes only if needed**

~~~powershell
git add -- 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html' 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html' 'tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs' 'tools/capture-compatibility-review-v1.2.mjs' 'test-results/compatibility-review-v1.2'
git commit -m 'fix: finalize compatibility review v1.2 demo states'
~~~

If there are no final fixes, do not create an empty commit.
