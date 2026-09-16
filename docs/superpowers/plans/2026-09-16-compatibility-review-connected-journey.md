# Compatibility Review Connected Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 C 端兼容性评价 Demo 改造成一条可连续操作的闭环：查看并应用他人方案、启动 PC 游戏、横屏游玩、正常退出、主动评价并关联本次方案。

**Architecture:** 继续维护单文件离线 HTML，不复制评价、云分享或方案详情能力。新增一个互斥旅程状态对象和独立的启动层、横屏游戏层、退出确认层；应用方案、启动、退出和评价通过同一状态对象传递实际方案与 `play_session_id`。B 端 Demo 保持不变。

**Tech Stack:** 单文件 HTML/CSS/原生 JavaScript、Node.js `node:test`、Playwright Core、PowerShell 静态检查。

---

## 文件结构

- 修改：`demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`——页面、线框占位、连续旅程状态机和现有评价/方案能力整合。
- 修改：`tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`——连续旅程、线框占位、无说明层和旧能力回归。
- 修改：`tools/capture-compatibility-review-v1.2.mjs`——按真实操作路径生成 10 张视觉证据。
- 生成：`test-results/compatibility-review-v1.2/*.png`——更新后的 10 张截图；只由截图脚本生成。
- 修改：`docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md`——实现完成后仅把阶段改为“Demo 已实现并验证”。

### Task 1: 用失败测试锁定连续旅程契约

**Files:**
- Modify: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 将静态 C 端契约改成真实产品入口**

用以下断言替换对 `#demoScenarioNormal`、`#demoScenarioManual`、`#demoScenarioCooldown`、`#demoSolutionPublic`、`#demoSolutionPrivate` 和 `#demoNoSameConfig` 的依赖：

```js
await requireOne(page, '#openCompatibilityReviews', '游戏详情兼容性评价入口');
await requireOne(page, '#startGameButton', 'PC 游戏启动按钮');
await requireOne(page, '#launchLayer', '启动中状态层');
await requireOne(page, '#gameplayLayer', '独立横屏游戏层');
await requireOne(page, '#exitGameButton', '横屏退出游戏入口');
await requireOne(page, '#confirmExitGameButton', '退出游戏确认操作');
await requireOne(page, '#modalFeedback', '共用兼容性评价弹窗');
assert.equal(await page.locator('.demo-scenario-rail, .orient-bar, [id^="demoScenario"]').count(), 0);
assert.equal(await page.getByText('秒玩', { exact: true }).count(), 0);
assert.equal(await page.locator('.prd-badge, .prd-tooltip, .interaction-note').count(), 0);
```

- [ ] **Step 2: 新增完整主链路测试**

新增一个测试，严格按用户可见操作推进，禁止通过场景按钮跳转：

```js
test('从他人评价应用方案后启动、退出并关联本次方案', async () => {
  const { page, errors } = await openDemo(cDemo, 'C 端', { width: 390, height: 844 });
  try {
    await page.click('#openCompatibilityReviews');
    await page.click('[data-review-state="valid"] .review-solution-card');
    await page.click('#applySolutionButton');
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), false);
    assert.match(await page.locator('#currentAppliedSolution').innerText(), /Adreno 750 稳定方案/);

    await page.click('#startGameButton');
    await page.waitForFunction(() => document.body.dataset.journeyStage === 'gameplay');
    await page.setViewportSize({ width: 844, height: 390 });
    assert.equal(await page.locator('#gameplayLayer').isVisible(), true);

    await page.click('#exitGameButton');
    await page.click('#confirmExitGameButton');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('modalFeedback')?.classList.contains('show'));
    assert.equal(await page.locator('#feedbackModalTitle').innerText(), '这次游戏体验怎么样？');

    await page.click('#fbStarsWrap [data-val="5"]');
    assert.match(await page.locator('#fbSolutionContent').innerText(), /Adreno 750 稳定方案/);
    await page.check('#linkCurrentSolutionCheckbox');
    await page.click('#modalFeedback .btn-submit');
    const mine = await page.evaluate(() => window.getFeedbacks().find((item) => item.uid === 'me'));
    assert.equal(mine.solutionId, 'solution_public_01');
    assert.equal(await page.locator('#cloudSharePage').isVisible(), false);
    await assertNoPageErrors(errors, '连续旅程');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 3: 把频控、个人方案和空状态改为无界面测试钩子**

约定唯一测试 API，避免重新加入产品外场景栏：

```js
const state = await page.evaluate(() => window.compatibilityDemo.getInviteState());
await page.evaluate(() => window.compatibilityDemo.setSolutionSource('private'));
await page.evaluate(() => window.compatibilityDemo.showSameConfigEmpty());
```

保留以下既有断言：全局 7 天频控、个人方案先提交再确认公开、1～2 星隐藏方案、同配置空状态、B 端筛选与导出、两个方向无脚本错误。

- [ ] **Step 4: 新增线框占位契约**

```js
for (const selector of [
  '#gameHeroWireframe',
  '#gameGalleryWireframe',
  '.review-avatar-wireframe',
  '#gameplayWireframe',
]) {
  assert.ok(await page.locator(selector).count() > 0, `缺少线框占位：${selector}`);
}
assert.equal(await page.locator('img[src^="data:image"], img[src^="http"]').count(), 0);
```

- [ ] **Step 5: 运行测试并确认先失败**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: C 端测试因缺少 `#startGameButton`、`#launchLayer`、`#gameplayLayer` 和 `window.compatibilityDemo` 失败；B 端测试继续通过。

### Task 2: 将媒体统一为线框占位并收敛游戏详情入口

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 增加统一线框占位组件**

在现有 CSS 变量后加入以下样式，并让 Hero、图集、介绍图片、头像和上传预览复用：

```css
.media-wireframe {
  position: relative;
  overflow: hidden;
  background: #15171a;
  border: 1px solid rgba(255,255,255,.14);
}
.media-wireframe::before,
.media-wireframe::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 140%;
  height: 1px;
  background: rgba(255,255,255,.12);
  transform-origin: center;
}
.media-wireframe::before { transform: translate(-50%,-50%) rotate(24deg); }
.media-wireframe::after { transform: translate(-50%,-50%) rotate(-24deg); }
.media-wireframe-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #73777f;
  font-size: 12px;
  letter-spacing: .04em;
}
.review-avatar-wireframe {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
```

- [ ] **Step 2: 替换所有媒体节点**

Hero 和图集使用真实 DOM：

```html
<div id="gameHeroWireframe" class="media-content media-wireframe" role="img" aria-label="游戏视频占位">
  <span class="media-wireframe-label">游戏视频</span>
</div>
<div id="gameGalleryWireframe" class="media-content media-wireframe hidden" role="img" aria-label="游戏图集占位">
  <span class="media-wireframe-label">游戏图集</span>
</div>
```

删除 `avatarData()`、`AVATARS` 中的 Data URI、`.offline-hero` 渐变和 `.offline-art` 渐变。评价头像改为 `.review-avatar-wireframe`；上传后的本地图片只生成线框缩略块，不读取或展示真实位图。

- [ ] **Step 3: 移除场景栏和错误的 PC 操作文案**

删除 `.demo-scenario-rail`、`.orient-bar` 及对应 DOM、事件绑定。横竖屏详情统一只保留一个真实 PC 主操作：

```html
<button id="startGameButton" class="btn-start-game" type="button" onclick="startGame()">
  启动游戏
</button>
```

为兼容性入口增加稳定 ID：

```html
<button id="openCompatibilityReviews" class="info-compat" type="button" onclick="openCompatPage()">
  <!-- 保留现有评分和标题 DOM -->
</button>
```

- [ ] **Step 4: 运行静态与浏览器测试**

Run:

```powershell
node --check tools/capture-compatibility-review-v1.2.mjs
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 线框与入口静态契约通过；连续旅程仍因状态机未实现而失败。

### Task 3: 实现启动、横屏游玩和退出状态机

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 增加旅程状态对象**

```js
const journeyState = {
  stage: 'detail',
  appliedSolutionId: '',
  appliedSolutionName: '',
  playSessionId: '',
  startedAt: 0,
};

function setJourneyStage(stage) {
  journeyState.stage = stage;
  document.body.dataset.journeyStage = stage;
  document.getElementById('launchLayer').hidden = stage !== 'launching';
  document.getElementById('gameplayLayer').hidden = stage !== 'gameplay';
}
```

- [ ] **Step 2: 新增启动中和独立横屏游戏层**

```html
<section id="launchLayer" class="journey-layer" hidden aria-label="游戏启动中">
  <div class="launch-spinner" aria-hidden="true"></div>
  <strong>正在启动游戏</strong>
</section>

<section id="gameplayLayer" class="gameplay-layer" hidden aria-label="游戏运行中">
  <div id="gameplayWireframe" class="gameplay-wireframe media-wireframe">
    <span class="media-wireframe-label">横屏游戏画面</span>
  </div>
  <div class="gameplay-runtime">本次游玩 <span id="sessionRuntime">18:42</span></div>
  <button id="exitGameButton" type="button" onclick="openExitGameConfirm()">退出游戏</button>
  <div id="exitGameConfirm" class="exit-confirm" hidden>
    <strong>退出游戏？</strong>
    <div class="exit-confirm-actions">
      <button type="button" onclick="closeExitGameConfirm()">取消</button>
      <button id="confirmExitGameButton" type="button" onclick="confirmExitGame()">退出游戏</button>
    </div>
  </div>
</section>
```

- [ ] **Step 3: 实现启动和正常退出**

```js
function startGame() {
  if (!journeyState.appliedSolutionId) {
    showToast('请先选择并应用运行方案');
    return;
  }
  journeyState.playSessionId = `play_${Date.now()}`;
  journeyState.startedAt = Date.now();
  setJourneyStage('launching');
  window.setTimeout(() => setJourneyStage('gameplay'), 700);
}

function openExitGameConfirm() {
  document.getElementById('exitGameConfirm').hidden = false;
}

function closeExitGameConfirm() {
  document.getElementById('exitGameConfirm').hidden = true;
}

function confirmExitGame() {
  closeExitGameConfirm();
  setJourneyStage('detail');
  routeSessionResult('normal', {
    playSessionId: journeyState.playSessionId,
    solutionId: journeyState.appliedSolutionId,
  });
}
```

`routeSessionResult` 必须只在 `normal` 结果中打开主动评价；不得加入或调用任何启动失败 UI。

- [ ] **Step 4: 运行连续旅程测试**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: 启动、横屏游戏和退出阶段通过；若方案应用尚未回写详情，完整主链路仍在应用步骤失败。

### Task 4: 把方案应用结果接入启动和主动评价

**Files:**
- Modify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Test: `tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs`

- [ ] **Step 1: 方案详情使用当前评价对应方案**

`openSolutionDetail(solutionId)` 读取现有评价数据并写入 `activeSolution`，只允许有效方案进入：

```js
let activeSolution = null;

function openSolutionDetail(solutionId) {
  activeSolution = getFeedbacks()
    .map((item) => item.solution)
    .find((solution) => solution?.id === solutionId && solution.status === 'published') || null;
  if (!activeSolution) return;
  renderSolutionDetail(activeSolution);
  document.getElementById('solutionDetailPage').hidden = false;
}
```

- [ ] **Step 2: 应用成功后回到游戏详情，不自动启动**

```js
function applyCurrentSolution() {
  if (!activeSolution || applicationMode === 'hard') return;
  journeyState.appliedSolutionId = activeSolution.id;
  journeyState.appliedSolutionName = activeSolution.name;
  document.getElementById('currentAppliedSolution').textContent = `当前方案：${activeSolution.name}`;
  document.getElementById('currentAppliedSolution').hidden = false;
  closeSolutionDetail();
  closeCompatPage();
  setJourneyStage('detail');
}
```

应用后不得调用 `startGame()`；必须等用户点击 `#startGameButton`。

- [ ] **Step 3: 主动评价只关联当前会话实际方案**

把 `openFeedbackModal` 的主动入口参数改为：

```js
openFeedbackModal({
  source: 'proactive',
  gameKey: 'gta5|Adreno 750',
  playSessionId: journeyState.playSessionId,
  actualSolutionId: journeyState.appliedSolutionId,
});
```

公开方案提交后直接引用 `solution_public_01`，不得打开 `#cloudSharePage`。个人未公开方案仍通过 `window.compatibilityDemo.setSolutionSource('private')` 验证“先提交评价，再确认公开”。

- [ ] **Step 4: 提交后展示评价列表并定位我的评价**

```js
function finishReviewSubmission(savedReviewId) {
  refreshEntryCard();
  openCompatPage();
  setView('mine', document.querySelector('#chipsLs [data-view="mine"]'), 'ls');
  requestAnimationFrame(() => {
    document.querySelector(`[data-feedback-id="${savedReviewId}"]`)?.scrollIntoView({ block: 'center' });
  });
}
```

若现有 Chip 尚无 `data-view`，为四个筛选项补齐稳定属性，不改变文案和视觉。

- [ ] **Step 5: 暴露唯一无界面测试 API**

```js
window.compatibilityDemo = Object.freeze({
  getInviteState: () => structuredClone(inviteDemoState),
  setSolutionSource,
  setApplicationMode,
  showSameConfigEmpty: showSameConfigEmptyScenario,
  resetJourney: () => {
    Object.assign(journeyState, {
      stage: 'detail',
      appliedSolutionId: '',
      appliedSolutionName: '',
      playSessionId: '',
      startedAt: 0,
    });
    setJourneyStage('detail');
  },
});
```

- [ ] **Step 6: 运行全部浏览器测试**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
```

Expected: C/B 端全部测试通过，无 `pageerror`，390×844 与 844×390 均无水平溢出。

### Task 5: 更新十状态视觉证据

**Files:**
- Modify: `tools/capture-compatibility-review-v1.2.mjs`
- Generate: `test-results/compatibility-review-v1.2/*.png`

- [ ] **Step 1: 按真实操作生成九张 C 端截图**

截图固定为：

```text
01-c-game-detail-wireframe-390x844.png
02-c-review-list-390x844.png
03-c-solution-detail-390x844.png
04-c-applied-solution-detail-390x844.png
05-c-launching-390x844.png
06-c-gameplay-wireframe-844x390.png
07-c-exit-confirm-844x390.png
08-c-proactive-review-390x844.png
09-c-my-linked-review-390x844.png
```

截图脚本必须通过点击 `#openCompatibilityReviews`、评价方案名称、`#applySolutionButton`、`#startGameButton`、`#exitGameButton` 和 `#confirmExitGameButton` 推进状态。只允许在截图 06、07 前调用 `page.setViewportSize({ width: 844, height: 390 })`，退出后恢复 `390×844`。

- [ ] **Step 2: 保留一张 B 端截图**

```text
10-b-linked-filter-solution-drawer-1440x900.png
```

B 端交互和数据不变。

- [ ] **Step 3: 运行截图脚本**

Run:

```powershell
node tools/capture-compatibility-review-v1.2.mjs
```

Expected: `test-results/compatibility-review-v1.2/` 中恰好生成 10 张非空 PNG。

- [ ] **Step 4: 人工审查关键截图**

至少检查 01、04、06、07、08、09：

- 01：PC 主操作只显示“启动游戏”，媒体为线框。
- 04：应用方案后回到详情并显示当前方案，没有自动启动。
- 06：横屏游戏为独立 Shell，不是拉伸竖屏详情。
- 07：退出确认可读且不含评审标注。
- 08：返回详情后再出现主动评价，标题正确。
- 09：我的评价关联的是本次实际使用的公开方案。

### Task 6: 最终回归、历史保护和规格收尾

**Files:**
- Modify: `docs/superpowers/specs/2026-09-16-gamehub-compatibility-review-v1.2-design.md`
- Verify: `demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html`
- Verify: `demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html`

- [ ] **Step 1: 更新规格阶段**

只把规格顶部阶段改为：

```markdown
**阶段：** Demo 已实现并完成自动化与视觉验收
```

- [ ] **Step 2: 运行最终验证**

Run:

```powershell
node --test tests/compatibility-review-v1.2/compatibility-review-v1.2.browser.test.mjs
node --check tools/capture-compatibility-review-v1.2.mjs
git diff --check
```

Expected: 全部测试通过、截图脚本语法通过、无空白错误。

- [ ] **Step 3: 执行静态约束扫描**

Run:

```powershell
$demo = 'demos\游戏详情\GUANWANGGAID-25-兼容性评价改版-C端demo.html'
$html = Get-Content -Raw -LiteralPath $demo
if ($html -match '(?i)<iframe\b|<canvas\b|https?://') { throw '发现远程资源、iframe 或 Canvas' }
if ($html -match 'demo-scenario-rail|prd-badge|prd-tooltip|交互说明|操作说明|秒玩') { throw '发现禁止的演示说明或错误业务文案' }
$ids = [regex]::Matches($html, '(?i)\bid\s*=\s*["'']([^"'']+)["'']') | ForEach-Object { $_.Groups[1].Value }
$duplicates = $ids | Group-Object | Where-Object Count -gt 1
if ($duplicates) { throw "发现重复 ID：$($duplicates.Name -join ', ')" }
```

Expected: 扫描无输出、退出码为 0。

- [ ] **Step 4: 校验四个历史 Demo 哈希**

```powershell
$expected = @{
  'demos\游戏详情\游戏详情兼容性评价demo.html'='C4CF4A780E29C8ADCBDB06C934C9A749D2469425CD3C70DC5179780728090678'
  'demos\后台管理\admin-兼容性评价后台.html'='F4698B67D852E4E5EFA3B579A09443C8B454CD09E2D9F670C88A1A17944A3294'
  'demos\兼容性诊断引导demo.html'='ED829144BA16E4CBE785EE966617C701D02C08DDD0676F2DA46432FE4ADA53DF'
  'demos\PC与Mac端\PC模拟器优化.html'='520FAB1E86D6C1AEF5D2318EBE9F59C8974EE787F2AA0ED186F25EC094A74D89'
}
$expected.GetEnumerator() | ForEach-Object {
  $actual = (Get-FileHash -LiteralPath $_.Key -Algorithm SHA256).Hash
  if ($actual -ne $_.Value) { throw "历史 Demo 被修改：$($_.Key)" }
}
```

Expected: 四个历史文件哈希全部一致。

- [ ] **Step 5: 同步任务板并请求产品复核**

评论必须包含：连续旅程、线框占位、删除场景栏、测试数量、10 张视觉证据、历史哈希结果和剩余限制；事项状态从 `in_progress` 移回 `in_review`，不得直接标记 `done`。

