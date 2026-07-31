# GameHub 新手四页引导与来源分析 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将新用户改为“欢迎封面＋来源采集＋准备方式＋分支落地”，把非新用户个性化与来源补采整合进主 Demo，并提供可筛选的运营后台来源分析和可导入飞书的专项 PRD。

**Architecture:** 继续使用单文件 `demos/新手引导完整链路demo.html`，在同一文件内以用户端／运营后台两个顶层视图承载交互；新用户由阶段状态路由，非新用户由游戏、来源两个独立终态路由。Playwright 负责真实交互与截图，PRD 使用已提交截图的固定 Git SHA 公网地址。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 24、`playwright-core`、Markdown、GitHub Pages、jsDelivr

---

## 文件结构

**修改：**

- `demos/新手引导完整链路demo.html`：用户端四页流程、非新用户补采、后台来源分析及全部演示状态。
- `tools/verify-onboarding-source-integration-ui.mjs`：浏览器主链路、缺失步骤、后台筛选验收。
- `tools/verify-personalization-acquisition-wizard.mjs`：更新静态合同，移除旧“先选用户类型”状态要求。
- `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`：重写为本期专项 PRD。

**新增：**

- `tools/capture-onboarding-acquisition-v2.mjs`：生成8张 PRD 真实截图。
- `tools/verify-onboarding-acquisition-prd.mjs`：校验 PRD 范围、表格图片位置、固定 SHA 和公网可访问性。
- `public/prd/onboarding-acquisition-v2/01-welcome.png`
- `public/prd/onboarding-acquisition-v2/02-source.png`
- `public/prd/onboarding-acquisition-v2/03-start-method.png`
- `public/prd/onboarding-acquisition-v2/04-domestic-destination.png`
- `public/prd/onboarding-acquisition-v2/05-overseas-destination.png`
- `public/prd/onboarding-acquisition-v2/06-existing-game.png`
- `public/prd/onboarding-acquisition-v2/07-existing-source.png`
- `public/prd/onboarding-acquisition-v2/08-source-analytics.png`

**只读参考：**

- `demos/用户与设置/个性化推荐采集demo.html`：非新用户选游戏、来源选项及终态。
- `demos/后台管理/admin-运营数据看板v2.html`：后台导航、筛选、指标卡、图表和表格视觉。
- `docs/superpowers/specs/2026-07-31-gamehub-new-existing-user-acquisition-flow-design.md`：已确认设计。

---

### Task 1: 同步基线并建立新用户四页流程的失败验收

**Files:**

- Modify: `tools/verify-onboarding-source-integration-ui.mjs`
- Modify: `tools/verify-personalization-acquisition-wizard.mjs`
- Test: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 将当前功能分支快进到最新远端基线**

Run:

```powershell
git fetch origin master
git rebase origin/master
```

Expected: `Successfully rebased and updated refs/heads/docs/onboarding-prd-v15.`；如目标文件产生冲突，停止并逐项保留最新远端行为后再继续，禁止强推。

- [ ] **Step 2: 为新用户四页结构写浏览器断言**

将 `verify-onboarding-source-integration-ui.mjs` 的新用户主链路改为以下结构：

```js
assert.equal(await page.locator('#pageWelcome.active').count(), 1);
assert.equal(await page.locator('#pageWelcome .onboarding-progress').count(), 0);
assert.equal(await page.getByRole('button', { name: '开始' }).count(), 1);

await page.getByRole('button', { name: '开始' }).click();
assert.equal(await page.locator('#pageSource.active').count(), 1);
assert.equal(await page.locator('#pageSource .onboarding-progress span.is-active').count(), 1);

await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.reload();
assert.equal(await page.locator('#pageSource.active').count(), 1);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);
await page.locator('[data-action="source-back"]').click();
assert.equal(await page.locator('#pageWelcome.active').count(), 1);
await page.getByRole('button', { name: '开始' }).click();
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);
await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(await page.locator('#pageStartMethod.active').count(), 1);
assert.equal(await page.locator('#pageStartMethod .onboarding-progress span.is-active').count(), 2);
assert.equal(await page.locator('#pageStartMethod [data-start-method]').count(), 3);
assert.equal(await page.locator('#pageStartMethod .skip-btn').count(), 0);
assert.equal(await page.locator('[data-start-method="later"]').innerText(), '以后再说');

await page.locator('[data-action="start-method-back"]').click();
assert.equal(await page.locator('#pageSource.active').count(), 1);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);

await resetDemo(page);
await page.locator('#regionBtn').click();
await page.getByRole('button', { name: 'Start' }).click();
assert.equal(await page.locator('[data-onboarding-source-code="youtube"]').count(), 1);
await page.locator('[data-onboarding-source-code="youtube"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(await page.locator('[data-start-method="explore_first"]').innerText(), "I'm new, show me around");
await page.locator('[data-start-method="explore_first"]').click();
assert.equal(await page.locator('#page2b.active').count(), 1);
assert.equal(await page.locator('#page2b .onboarding-progress span.is-active').count(), 3);
```

- [ ] **Step 3: 为三个准备方式分支写失败断言**

增加独立重置后的三个分支：

```js
await chooseNewUserSource(page, 'friend_referral');
await page.locator('[data-start-method="has_game"]').click();
assert.equal(await page.locator('#page1.active').count(), 1);
assert.equal(await page.locator('#page1 .onboarding-progress span.is-active').count(), 3);

await resetDemo(page);
await chooseNewUserSource(page, 'other_or_unknown');
await page.locator('[data-start-method="explore_first"]').click();
assert.equal(await page.locator('#page2.active').count(), 1);
assert.equal(await page.locator('#page2 .onboarding-progress span.is-active').count(), 3);

await resetDemo(page);
await chooseNewUserSource(page, 'friend_referral');
await page.locator('[data-start-method="later"]').click();
assert.equal(await page.locator('#pageHome.active').count(), 1);
assert.equal(await page.locator('#pageHome [data-result="later"]').count(), 1);
const laterSaved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2'))
);
assert.equal(laterSaved.sourceCode, 'friend_referral');
assert.equal(laterSaved.startMethod, 'later');
assert.equal(laterSaved.state, 'completed');
assert.equal(laterSaved.manualInterestExempt, true);
const installIdBeforeReload = laterSaved.installId;
await page.reload();
const installIdAfterReload = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2')).installId
);
assert.equal(installIdAfterReload, installIdBeforeReload);

await page.setViewportSize({ width: 940, height: 1180 });
await resetDemo(page);
await page.getByRole('button', { name: '开始' }).click();
await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.setViewportSize({ width: 1180, height: 940 });
assert.equal(await page.locator('#pageSource.active').count(), 1);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);
```

其中辅助函数写为：

```js
async function resetDemo(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function chooseNewUserSource(page, sourceCode) {
  await page.getByRole('button', { name: '开始' }).click();
  await page.locator(`[data-onboarding-source-code="${sourceCode}"]`).click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
}
```

- [ ] **Step 4: 更新静态合同要求**

将 `onboardingSource()` 中旧状态 token 替换为：

```js
requireTokens(onboarding, [
  'id="pageWelcome"',
  'id="pageSource"',
  'id="pageStartMethod"',
  'id="pageHome"',
  'welcome_pending',
  'source_pending',
  'start_method_pending',
  'destination_in_progress',
  'completed',
  'data-start-method="has_game"',
  'data-start-method="explore_first"',
  'data-start-method="later"',
  '以后再说',
  'new_user_onboarding',
], 'onboarding acquisition flow');
assert(!onboarding.includes('class="skip-btn"'), 'new-user flow must not expose a floating skip action');
```

- [ ] **Step 5: 运行测试并确认按预期失败**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs onboardingSource
```

Expected: FAIL，首个失败为 `#pageWelcome.active` 数量为 `0` 或缺少 `pageWelcome` token。

- [ ] **Step 6: 提交失败验收**

```powershell
git add -- 'tools/verify-onboarding-source-integration-ui.mjs' 'tools/verify-personalization-acquisition-wizard.mjs'
git commit -m "test(onboarding): define welcome and start-method journey"
```

---

### Task 2: 实现欢迎封面、来源和准备方式

**Files:**

- Modify: `demos/新手引导完整链路demo.html:113-191`
- Modify: `demos/新手引导完整链路demo.html:388-490`
- Modify: `demos/新手引导完整链路demo.html:690-943`
- Test: `tools/verify-onboarding-source-integration-ui.mjs`
- Read: `C:/Users/z3635/.codex/skills/ui-demo/SKILL.md`

- [ ] **Step 1: 读取 `ui-demo` 技能并将原 `page0` 拆为欢迎页和准备方式页**

完整读取 `ui-demo/SKILL.md` 后，欢迎页使用以下语义结构：

```html
<div class="page active" id="pageWelcome">
  <div class="welcome-cover">
    <div class="welcome-brand">
      <span class="welcome-kicker">WELCOME TO GAMEHUB</span>
      <h1>欢迎来到盖世游戏</h1>
      <p>欢迎新朋友，开启你的 PC 游戏之旅</p>
    </div>
    <section class="welcome-features" aria-label="平台特色">
      <h2>手机上的 PC 游戏平台</h2>
      <p>🎮 Steam 与 Epic 游戏数据互通，海量大作应有尽有</p>
      <p>⚡ 支持云游戏，无需下载，一键秒玩</p>
      <p>💡 AI 超级插帧＋虚拟按键大神方案，一键套用</p>
    </section>
    <button class="welcome-start" data-action="start-new-user">开始</button>
  </div>
</div>
```

准备方式页使用：

```html
<div class="page" id="pageStartMethod">
  <div class="page-body start-method-body">
    <button type="button" class="source-back" data-action="start-method-back" aria-label="返回">←</button>
    <div class="onboarding-progress" aria-label="新手引导，第2步，共3步">
      <span class="is-active"></span><span class="is-active"></span><span></span>
    </div>
    <h1 class="page-title">你准备怎么开始？</h1>
    <p class="page-desc">选择最符合你现在情况的方式</p>
    <div class="opt-list">
      <button class="opt-card" data-start-method="has_game">我有游戏想玩</button>
      <button class="opt-card" data-start-method="explore_first">我是新手，想先看看</button>
      <button class="opt-card" data-start-method="later">以后再说</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 增加欢迎封面样式**

在页面样式区增加：

```css
.welcome-cover{min-height:100%;display:flex;flex-direction:column;padding:72px 24px 28px;background:
  radial-gradient(circle at 82% 12%,rgba(255,226,64,.2),transparent 28%),
  radial-gradient(circle at 12% 42%,rgba(80,112,255,.18),transparent 26%),#080808}
.welcome-brand{margin-top:34px}.welcome-kicker{font-size:11px;letter-spacing:2px;color:#FFE240}
.welcome-brand h1{margin-top:12px;font-size:30px;line-height:1.16}
.welcome-brand p{margin-top:10px;color:#b8b8b8;font-size:15px}
.welcome-features{margin-top:auto;padding:20px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(22,22,22,.86)}
.welcome-features h2{font-size:17px;margin-bottom:14px}
.welcome-features p{font-size:12px;line-height:1.65;color:#c7c7c7}
.welcome-start{height:52px;margin-top:18px;border:0;border-radius:26px;background:#FFE240;color:#111;font-size:16px;font-weight:700}
```

- [ ] **Step 3: 改为阶段状态路由**

将新用户状态定义为：

```js
const NEW_USER_STATES = Object.freeze({
  WELCOME: 'welcome_pending',
  SOURCE: 'source_pending',
  START_METHOD: 'start_method_pending',
  DESTINATION: 'destination_in_progress',
  COMPLETED: 'completed',
});

const defaultOnboardingFlow = () => ({
  state: NEW_USER_STATES.WELCOME,
  sourceCode: null,
  sourceTerminal: 'pending',
  startMethod: null,
  market: isOverseas ? 'overseas' : 'domestic',
  entryGroup: 'new_user_onboarding',
  installId: getOrCreateInstallId(),
  manualInterestExempt: false,
  syncStatus: 'idle',
});

function getOrCreateInstallId() {
  const saved = localStorage.getItem('gamehub_install_id');
  if (saved) return saved;
  const created = `install_${crypto.randomUUID()}`;
  localStorage.setItem('gamehub_install_id', created);
  return created;
}
```

统一路由函数：

```js
function routeNewUserFlow() {
  if (onboardingFlow.state === NEW_USER_STATES.WELCOME) return switchPage('pageWelcome');
  if (onboardingFlow.state === NEW_USER_STATES.SOURCE) return renderOnboardingSource();
  if (onboardingFlow.state === NEW_USER_STATES.START_METHOD) return switchPage('pageStartMethod');
  if (onboardingFlow.state === NEW_USER_STATES.DESTINATION) return openNewUserDestination();
  return switchPage('pageHome');
}
```

- [ ] **Step 4: 实现开始、返回和三个准备方式**

```js
function startNewUserJourney() {
  onboardingFlow.state = NEW_USER_STATES.SOURCE;
  saveOnboardingFlow();
  renderOnboardingSource();
}

function chooseStartMethod(method) {
  onboardingFlow.startMethod = method;
  onboardingFlow.manualInterestExempt = true;
  if (method === 'later') {
    onboardingFlow.state = NEW_USER_STATES.COMPLETED;
    saveOnboardingFlow();
    return showHomeResult('later');
  }
  onboardingFlow.state = NEW_USER_STATES.DESTINATION;
  saveOnboardingFlow();
  openNewUserDestination();
}

function backToSourceFromStartMethod() {
  onboardingFlow.state = NEW_USER_STATES.SOURCE;
  saveOnboardingFlow();
  renderOnboardingSource();
}

function backToWelcomeFromSource() {
  onboardingFlow.state = NEW_USER_STATES.WELCOME;
  saveOnboardingFlow();
  switchPage('pageWelcome');
}

function openNewUserDestination() {
  if (onboardingFlow.startMethod === 'has_game') return switchPage('page1');
  if (onboardingFlow.startMethod === 'explore_first') {
    return isOverseas ? switchPage('page2b') : goNewUserDirect();
  }
  return showHomeResult('later');
}

function showHomeResult(reason) {
  document.querySelector('#pageHome [data-result]').dataset.result = reason;
  switchPage('pageHome');
}
```

事件代理：

```js
document.addEventListener('click', event => {
  if (event.target.closest('[data-action="start-new-user"]')) startNewUserJourney();
  if (event.target.closest('[data-action="source-back"]')) backToWelcomeFromSource();
  if (event.target.closest('[data-action="start-method-back"]')) backToSourceFromStartMethod();
  const method = event.target.closest('[data-start-method]')?.dataset.startMethod;
  if (method) chooseStartMethod(method);
});
```

删除旧事件代理中把 `source-back` 写回 `USER_TYPE_PENDING` 的分支，避免同一次点击被两个处理器重复路由。

- [ ] **Step 5: 修正进度条、国内／海外文案和“以后再说”完成页**

要求：

- `pageSource` 为1/3。
- `pageStartMethod` 为2/3。
- `page1`、`page2`、`page2b` 为3/3。
- 删除所有新用户 `.skip-btn`。
- 新增 `pageHome`，只用于演示进入首页结果，不增加确认按钮：

```html
<div class="page" id="pageHome">
  <div class="home-result" data-result="later">
    <strong>已进入盖世游戏首页</strong>
    <span>你可以稍后从游戏库继续导入或体验游戏</span>
  </div>
</div>
```

在 `applyRegionPresentation()` 中同步更新欢迎页、来源页和准备方式页文案；海外版至少使用：

```js
const startMethodCopy = {
  domestic: ['我有游戏想玩', '我是新手，想先看看', '以后再说'],
  overseas: ['I have games to play', "I'm new, show me around", 'Maybe later'],
};
```

- [ ] **Step 6: 运行新用户验收**

浏览器验收同时覆盖横竖屏切换后的来源草稿保留，并校验 `installId` 在同一安装内稳定不变。

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs onboardingSource
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected: 新用户相关断言通过；若非新用户和后台断言尚未加入，输出 `PASS onboardingSourceUi`、`PASS onboardingSource`、`PASS syntax`。

- [ ] **Step 7: 提交新用户流程**

```powershell
git add -- 'demos/新手引导完整链路demo.html'
git commit -m "feat(onboarding): add welcome and three-step journey"
```

---

### Task 3: 整合非新用户个性化与来源补采

**Files:**

- Modify: `tools/verify-onboarding-source-integration-ui.mjs`
- Modify: `demos/新手引导完整链路demo.html`
- Read: `demos/用户与设置/个性化推荐采集demo.html:744-1427`

- [ ] **Step 1: 增加非新用户失败验收**

```js
await page.locator('[data-demo-scenario="existing_full"]').click();
assert.equal(await page.locator('#existingGameStep.active').count(), 1);
await page.locator('[data-existing-game]').nth(0).click();
await page.locator('[data-existing-game]').nth(1).click();
await page.locator('[data-existing-game]').nth(2).click();
await page.locator('[data-action="submit-existing-games"]').click();
assert.equal(await page.locator('#existingSourceStep.active').count(), 1);
assert.equal(await page.locator('[data-action="skip-existing-source"]').count(), 0);

await page.locator('[data-existing-source="friend_referral"]').click();
await page.locator('[data-action="submit-existing-source"]').click();
assert.equal(await page.locator('#existingCompleteState.active').count(), 1);

await page.locator('[data-demo-scenario="existing_source_only"]').click();
assert.equal(await page.locator('#existingSourceStep.active').count(), 1);

await page.locator('[data-demo-scenario="existing_game_only"]').click();
assert.equal(await page.locator('#existingGameStep.active').count(), 1);

await page.locator('[data-demo-scenario="existing_completed"]').click();
assert.equal(await page.locator('#existingCompleteState [data-bypass="true"]').count(), 1);

await page.locator('#regionBtn').click();
await page.locator('[data-demo-scenario="existing_source_only"]').click();
assert.equal(await page.locator('[data-existing-source="youtube"]').count(), 1);
assert.equal((await page.locator('#existingSourceStep').innerText()).includes('GaishiGame'), false);
```

- [ ] **Step 2: 运行并确认失败**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
```

Expected: FAIL，缺少 `[data-demo-scenario="existing_full"]`。

- [ ] **Step 3: 复用非新用户页面和状态**

在控制区增加场景按钮：

```html
<button data-demo-scenario="existing_full">非新用户 · 游戏与来源均待答</button>
<button data-demo-scenario="existing_source_only">非新用户 · 仅来源待答</button>
<button data-demo-scenario="existing_game_only">非新用户 · 仅游戏待答</button>
<button data-demo-scenario="existing_completed">非新用户 · 均已完成</button>
```

在主 Demo 增加状态和路由：

```js
const existingFlow = {
  gameTerminal: 'pending',
  sourceTerminal: 'pending',
  selectedGames: new Set(),
  sourceCode: null,
  entryGroup: 'existing_user_recall',
};

const existingGames = [
  ['elden-ring', '艾尔登法环'],
  ['forza-horizon-5', '极限竞速：地平线 5'],
  ['cyberpunk-2077', '赛博朋克 2077'],
  ['red-dead-redemption-2', '荒野大镖客：救赎 2'],
  ['gta-v', 'GTA V'],
  ['black-myth-wukong', '黑神话：悟空'],
  ['monster-hunter-wilds', '怪物猎人：荒野'],
  ['baldurs-gate-3', '博德之门 3'],
  ['hades-2', '哈迪斯 2'],
];

const existingSourceOptions = {
  domestic: [
    ['friend_referral', '朋友推荐'],
    ['douyin_short_video', '抖音／短视频'],
    ['app_store', '应用商店'],
    ['community_forum', '社区／论坛'],
    ['search_engine', '搜索引擎'],
    ['other_or_unknown', '其他／不记得'],
  ],
  overseas: [
    ['youtube', 'YouTube'],
    ['friend_referral', 'Friends'],
    ['google_play', 'Google Play'],
    ['reddit', 'Reddit'],
    ['discord', 'Discord'],
    ['other_or_unknown', 'Other / Not sure'],
  ],
};

function showExistingPage(id) {
  document.querySelectorAll('.phone .page').forEach(page => page.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function persistExistingFlow() {
  localStorage.setItem('gamehub_existing_personalization_v2', JSON.stringify({
    gameTerminal: existingFlow.gameTerminal,
    sourceTerminal: existingFlow.sourceTerminal,
    selectedGames: [...existingFlow.selectedGames],
    sourceCode: existingFlow.sourceCode,
    entryGroup: existingFlow.entryGroup,
  }));
}

function nextExistingStep() {
  if (existingFlow.gameTerminal === 'pending') return showExistingPage('existingGameStep');
  if (existingFlow.sourceTerminal === 'pending') return showExistingPage('existingSourceStep');
  return showExistingPage('existingCompleteState');
}

function startExistingScenario(scenario) {
  const states = {
    existing_full: ['pending', 'pending'],
    existing_source_only: ['submitted', 'pending'],
    existing_game_only: ['pending', 'completed'],
    existing_completed: ['submitted', 'completed'],
  };
  [existingFlow.gameTerminal, existingFlow.sourceTerminal] = states[scenario];
  existingFlow.selectedGames.clear();
  existingFlow.sourceCode = null;
  nextExistingStep();
}
```

- [ ] **Step 4: 实现游戏选择与来源提交**

页面使用明确数据属性：

```html
<div class="page existing-page" id="existingGameStep">
  <button class="game-choice" data-existing-game="elden-ring">艾尔登法环</button>
  <button class="game-choice" data-existing-game="forza-horizon-5">极限竞速：地平线 5</button>
  <button class="game-choice" data-existing-game="cyberpunk-2077">赛博朋克 2077</button>
  <button data-action="submit-existing-games" disabled>选好了（0/9）</button>
  <button data-action="skip-existing-games">暂不选择</button>
</div>
<div class="page existing-page" id="existingSourceStep">
  <button data-existing-source="friend_referral">朋友推荐</button>
  <button data-existing-source="other_or_unknown">其他／不记得</button>
  <button data-action="submit-existing-source" disabled>完成</button>
</div>
<div class="page existing-page" id="existingCompleteState">
  <p data-bypass="true">当前步骤均已完成，实际产品直接放行</p>
</div>
```

```js
function submitExistingGames() {
  if (existingFlow.selectedGames.size < 3 || existingFlow.selectedGames.size > 9) return;
  existingFlow.gameTerminal = 'submitted';
  persistExistingFlow();
  nextExistingStep();
}

function skipExistingGames() {
  existingFlow.gameTerminal = 'skipped';
  persistExistingFlow();
  nextExistingStep();
}

function submitExistingSource() {
  if (!existingFlow.sourceCode) return;
  existingFlow.sourceTerminal = 'completed';
  persistExistingFlow();
  nextExistingStep();
}

function toggleExistingGame(code) {
  if (existingFlow.selectedGames.has(code)) existingFlow.selectedGames.delete(code);
  else if (existingFlow.selectedGames.size < 9) existingFlow.selectedGames.add(code);
  renderExistingGameSelection();
}

function renderExistingGameSelection() {
  document.querySelectorAll('[data-existing-game]').forEach(card => {
    card.classList.toggle('is-selected', existingFlow.selectedGames.has(card.dataset.existingGame));
  });
  const submit = document.querySelector('[data-action="submit-existing-games"]');
  submit.disabled = existingFlow.selectedGames.size < 3;
  submit.textContent = `选好了（${existingFlow.selectedGames.size}/9）`;
}

function renderExistingSourceSelection() {
  document.querySelectorAll('[data-existing-source]').forEach(card => {
    card.classList.toggle('is-selected', card.dataset.existingSource === existingFlow.sourceCode);
    card.setAttribute('aria-pressed', String(card.dataset.existingSource === existingFlow.sourceCode));
  });
  document.querySelector('[data-action="submit-existing-source"]').disabled = !existingFlow.sourceCode;
}

document.addEventListener('click', event => {
  const scenario = event.target.closest('[data-demo-scenario]')?.dataset.demoScenario;
  if (scenario) startExistingScenario(scenario);
  const game = event.target.closest('[data-existing-game]')?.dataset.existingGame;
  if (game) toggleExistingGame(game);
  const source = event.target.closest('[data-existing-source]')?.dataset.existingSource;
  if (source) {
    existingFlow.sourceCode = source;
    renderExistingSourceSelection();
  }
  if (event.target.closest('[data-action="submit-existing-games"]')) submitExistingGames();
  if (event.target.closest('[data-action="skip-existing-games"]')) skipExistingGames();
  if (event.target.closest('[data-action="submit-existing-source"]')) submitExistingSource();
});
```

使用 `existingGames` 和 `existingSourceOptions` 渲染完整候选；保留主动“暂不选择”和本地恢复，不提供来源跳过。

- [ ] **Step 5: 运行验收并提交**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs
```

Expected:

```text
PASS onboardingSourceUi
PASS shell
PASS games
PASS sources
PASS state
PASS onboardingSource
PASS syntax
```

Commit:

```powershell
git add -- 'demos/新手引导完整链路demo.html' 'tools/verify-onboarding-source-integration-ui.mjs'
git commit -m "feat(personalization): integrate existing-user missing steps"
```

---

### Task 4: 增加运营后台来源分析

**Files:**

- Modify: `tools/verify-onboarding-source-integration-ui.mjs`
- Modify: `demos/新手引导完整链路demo.html`
- Read: `demos/后台管理/admin-运营数据看板v2.html:8-161`

- [ ] **Step 1: 增加后台失败验收**

```js
await page.locator('[data-view="admin"]').click();
assert.equal(await page.locator('#sourceAnalyticsView.active').count(), 1);
assert.equal(await page.locator('[data-analytics-filter]').count(), 5);
assert.equal(await page.locator('[data-metric]').count(), 3);
assert.equal(await page.locator('[data-source-bar]').count(), 6);
assert.equal(await page.locator('[data-source-row]').count(), 6);

const before = await page.locator('[data-metric="submissions"]').innerText();
await page.locator('[data-analytics-filter="market"]').selectOption('overseas');
const after = await page.locator('[data-metric="submissions"]').innerText();
assert.notEqual(after, before, 'market filter must refresh analytics');

await page.locator('[data-analytics-filter="userGroup"]').selectOption('existing');
assert.equal(
  await page.locator('[data-attribution-note]').innerText(),
  '非新用户来源为回忆口径，不代表客观安装归因'
);
```

- [ ] **Step 2: 运行并确认失败**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
```

Expected: FAIL，缺少 `[data-view="admin"]`。

- [ ] **Step 3: 增加用户端／运营后台切换和后台容器**

```html
<nav class="demo-view-switch" aria-label="Demo视图">
  <button class="is-active" data-view="client">用户端</button>
  <button data-view="admin">运营后台</button>
</nav>

<section class="admin-shell" id="sourceAnalyticsView">
  <aside class="admin-sidebar">
    <strong>盖世游戏运营后台</strong>
    <button class="is-active">来源分析</button>
  </aside>
  <main class="admin-main">
    <header><h1>来源分析</h1><p>新用户来源与非新用户回忆来源分开统计</p></header>
    <section class="analytics-filters" aria-label="来源分析筛选">
      <select data-analytics-filter="dateRange"><option value="7d">近7天</option><option value="30d" selected>近30天</option><option value="90d">近90天</option></select>
      <select data-analytics-filter="market"><option value="domestic">国内</option><option value="overseas">海外</option></select>
      <select data-analytics-filter="userGroup"><option value="new">新用户</option><option value="existing">非新用户</option></select>
      <select data-analytics-filter="channel"><option value="all">全部渠道</option><option value="official">官网</option><option value="store">应用商店</option></select>
      <select data-analytics-filter="version"><option value="all">全部版本</option><option value="6.1.0">6.1.0</option><option value="6.0.9">6.0.9</option></select>
    </section>
    <section class="analytics-metrics">
      <article data-metric="submissions"></article>
      <article data-metric="completion"></article>
      <article data-metric="unknown"></article>
    </section>
    <p data-attribution-note></p>
    <section class="source-distribution"></section>
    <table class="source-table"><thead><tr><th>来源</th><th>人数</th><th>占比</th><th>较上一周期</th></tr></thead><tbody></tbody></table>
  </main>
</section>
```

将现有 `.phone` 和 `.cp` 两个节点整体包裹在 `<section class="client-demo-shell">` 中，作为用户端视图。

顶层视图切换：

```js
function switchDemoView(view) {
  const showAdmin = view === 'admin';
  document.querySelector('.client-demo-shell').hidden = showAdmin;
  document.getElementById('sourceAnalyticsView').classList.toggle('active', showAdmin);
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.view === view);
  });
  if (showAdmin) renderSourceAnalytics();
}

document.addEventListener('click', event => {
  const view = event.target.closest('[data-view]')?.dataset.view;
  if (view) switchDemoView(view);
});
```

- [ ] **Step 4: 实现筛选和聚合渲染**

```js
const sourceAnalyticsData = {
  domestic_new: {
    submissions: 12846,
    completionRate: 86.4,
    unknownRate: 9.8,
    sources: [
      ['朋友推荐', 3540, 27.6, 3.2],
      ['抖音／短视频', 2960, 23.0, 1.8],
      ['应用商店', 2412, 18.8, -0.6],
      ['社区／论坛', 1850, 14.4, 2.1],
      ['搜索引擎', 825, 6.4, -1.0],
      ['其他／不记得', 1259, 9.8, 0.5],
    ],
  },
  overseas_new: {
    submissions: 5268,
    completionRate: 82.7,
    unknownRate: 11.5,
    sources: [
      ['YouTube', 1460, 27.7, 2.6],
      ['Friends', 1042, 19.8, 1.1],
      ['Google Play', 924, 17.5, -0.8],
      ['Reddit', 735, 14.0, 1.9],
      ['Discord', 501, 9.5, -0.4],
      ['Other / Not sure', 606, 11.5, 0.3],
    ],
  },
  domestic_existing: {
    submissions: 8642,
    completionRate: 78.9,
    unknownRate: 18.1,
    sources: [
      ['朋友推荐', 2186, 25.3, 1.4],
      ['抖音／短视频', 1584, 18.3, 0.7],
      ['应用商店', 1210, 14.0, -1.1],
      ['社区／论坛', 1389, 16.1, 1.6],
      ['搜索引擎', 709, 8.2, -0.5],
      ['其他／不记得', 1564, 18.1, -0.2],
    ],
  },
  overseas_existing: {
    submissions: 3416,
    completionRate: 74.2,
    unknownRate: 20.3,
    sources: [
      ['YouTube', 785, 23.0, 1.2],
      ['Friends', 594, 17.4, 0.8],
      ['Google Play', 468, 13.7, -0.9],
      ['Reddit', 517, 15.1, 1.0],
      ['Discord', 359, 10.5, -0.4],
      ['Other / Not sure', 693, 20.3, 0.2],
    ],
  },
};

const analyticsFilters = {
  dateRange: '30d',
  market: 'domestic',
  userGroup: 'new',
  channel: 'all',
  version: 'all',
};

function renderSourceAnalytics() {
  const key = `${analyticsFilters.market}_${analyticsFilters.userGroup}`;
  const data = sourceAnalyticsData[key] || sourceAnalyticsData.domestic_new;
  const factor = getFilterFactor();
  document.querySelector('[data-metric="submissions"]').textContent = Math.round(data.submissions * factor).toLocaleString();
  document.querySelector('[data-metric="completion"]').textContent = `${data.completionRate}%`;
  document.querySelector('[data-metric="unknown"]').textContent = `${data.unknownRate}%`;
  renderDistributionBars(data.sources, factor);
  renderSourceRows(data.sources, factor);
  document.querySelector('[data-attribution-note]').textContent =
    analyticsFilters.userGroup === 'existing'
      ? '非新用户来源为回忆口径，不代表客观安装归因'
      : '新用户来源为主动填写口径，不覆盖客观安装归因';
}

function getFilterFactor() {
  const rangeFactor = { '7d': 0.34, '30d': 1, '90d': 2.72 }[analyticsFilters.dateRange] || 1;
  const channelFactor = analyticsFilters.channel === 'all' ? 1 : 0.42;
  const versionFactor = analyticsFilters.version === 'all' ? 1 : 0.58;
  return rangeFactor * channelFactor * versionFactor;
}

function renderDistributionBars(sources, factor) {
  document.querySelector('.source-distribution').innerHTML = sources.map(([name, count, share]) => `
    <div class="source-bar-row" data-source-bar>
      <span>${name}</span>
      <div class="source-bar-track"><i style="width:${share}%"></i></div>
      <strong>${Math.round(count * factor).toLocaleString()} · ${share}%</strong>
    </div>
  `).join('');
}

function renderSourceRows(sources, factor) {
  document.querySelector('.source-table tbody').innerHTML = sources.map(([name, count, share, change]) => `
    <tr data-source-row>
      <td>${name}</td>
      <td>${Math.round(count * factor).toLocaleString()}</td>
      <td>${share}%</td>
      <td class="${change >= 0 ? 'is-up' : 'is-down'}">${change >= 0 ? '+' : ''}${change}%</td>
    </tr>
  `).join('');
}

document.addEventListener('change', event => {
  const key = event.target.dataset.analyticsFilter;
  if (!key) return;
  analyticsFilters[key] = event.target.value;
  renderSourceAnalytics();
});
```

渲染人数时乘以 `getFilterFactor()` 并取整；占比和完成率保持同一数据集口径。全部筛选只作用于稳定样例数据，不发送网络请求。

- [ ] **Step 5: 使用后台 v2 视觉规范**

要求：

- 中间内容区占满可用宽度，不使用手机容器。
- 左侧后台名称和“来源分析”导航可见。
- 顶部5个基础筛选器。
- 3张指标卡、横向来源分布图和明细表。
- 非新用户筛选时显示归因口径提示。
- 图表使用 DOM/CSS 横向条形图，避免本地 Demo 因 ECharts CDN 失败而空白。

- [ ] **Step 6: 运行验收并提交**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS onboardingSourceUi
PASS syntax
```

Commit:

```powershell
git add -- 'demos/新手引导完整链路demo.html' 'tools/verify-onboarding-source-integration-ui.mjs'
git commit -m "feat(analytics): add acquisition source dashboard"
```

---

### Task 5: 生成并审阅8张真实截图

**Files:**

- Create: `tools/capture-onboarding-acquisition-v2.mjs`
- Create: `public/prd/onboarding-acquisition-v2/*.png`
- Test: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 编写截图脚本**

脚本使用本地 Chrome 和 `playwright-core`，固定视口：

```js
const page = await browser.newPage({
  viewport: { width: 1440, height: 980 },
  deviceScaleFactor: 1,
});
const outputDir = path.join(root, 'public', 'prd', 'onboarding-acquisition-v2');
fs.mkdirSync(outputDir, { recursive: true });

async function resetDemo() {
  await page.goto(pathToFileURL(demo).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function capturePhone(filename, activePage) {
  await page.locator(`${activePage}.active`).waitFor();
  await page.locator('.phone').screenshot({ path: path.join(outputDir, filename) });
}

async function chooseSource(code) {
  await page.locator(`[data-onboarding-source-code="${code}"]`).click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
}

async function resetAsOverseas() {
  await resetDemo();
  await page.locator('#regionBtn').click();
  await page.getByRole('button', { name: 'Start' }).click();
}

async function selectScenario(scenario) {
  await page.locator(`[data-demo-scenario="${scenario}"]`).click();
}

async function completeThreeGames() {
  const cards = page.locator('[data-existing-game]');
  for (let index = 0; index < 3; index += 1) await cards.nth(index).click();
  await page.locator('[data-action="submit-existing-games"]').click();
}
```

按以下定位器进入并截图：

```js
await capturePhone('01-welcome.png', '#pageWelcome');
await page.getByRole('button', { name: '开始' }).click();
await capturePhone('02-source.png', '#pageSource');
await chooseSource('friend_referral');
await capturePhone('03-start-method.png', '#pageStartMethod');
await page.locator('[data-start-method="explore_first"]').click();
await capturePhone('04-domestic-destination.png', '#page2');

await resetAsOverseas();
await chooseSource('youtube');
await page.locator('[data-start-method="explore_first"]').click();
await capturePhone('05-overseas-destination.png', '#page2b');

await selectScenario('existing_full');
await capturePhone('06-existing-game.png', '#existingGameStep');
await completeThreeGames();
await capturePhone('07-existing-source.png', '#existingSourceStep');

await page.locator('[data-view="admin"]').click();
await page.locator('#sourceAnalyticsView').screenshot({
  path: path.join(outputDir, '08-source-analytics.png'),
});
```

- [ ] **Step 2: 运行完整回归和截图**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs
node tools/capture-onboarding-acquisition-v2.mjs
```

Expected: 所有测试 PASS，输出 `Captured 8 onboarding acquisition screenshots`。

- [ ] **Step 3: 逐张视觉审阅**

使用 `view_image` 检查8张图：

- 欢迎页内容完整、底部“开始”未被裁切，无进度条。
- 来源、准备方式、分支页分别为1/3、2/3、3/3。
- “以后再说”为第三张平级选项，无右上角跳过。
- 国内、海外分支无遮挡。
- 非新用户卡片可读，来源页没有跳过。
- 后台筛选、指标、分布和表格均在容器内，无横向溢出。

任何一张不合格均回到对应实现修复并重新生成全部截图。

- [ ] **Step 4: 提交实现与截图资产**

```powershell
git add -- 'demos/新手引导完整链路demo.html' 'tools/verify-onboarding-source-integration-ui.mjs' 'tools/verify-personalization-acquisition-wizard.mjs' 'tools/capture-onboarding-acquisition-v2.mjs' 'public/prd/onboarding-acquisition-v2'
git commit -m "test(onboarding): capture acquisition flow evidence"
```

---

### Task 6: 按飞书格式重写本期专项 PRD

**Files:**

- Modify: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`
- Create: `tools/verify-onboarding-acquisition-prd.mjs`
- Read: `C:/Users/z3635/.codex/skills/to-prd/SKILL.md`

- [ ] **Step 1: 首次发布截图提交**

Run:

```powershell
git fetch origin master
git rebase origin/master
git push origin HEAD:master
$env:ONBOARDING_ASSET_SHA=(git rev-parse HEAD).Trim()
```

Expected: 快进推送成功；`ONBOARDING_ASSET_SHA` 为40位提交 SHA。若远端更新导致非快进，重新 fetch/rebase 后重跑测试再推送，禁止强推。

- [ ] **Step 2: 读取 `to-prd` 并重写当前专项内容**

PRD只包含：

1. 欢迎封面。
2. 新用户来源采集。
3. 准备方式及“以后再说”。
4. 国内／海外分支落地。
5. 非新用户选游戏与来源补采。
6. 后台来源分析。
7. 状态、异常、埋点、数据口径和验收。

需求表固定使用：

```markdown
|功能／页面|图示|触发条件、展示说明与交互说明|
|---|---|---|
|欢迎页|![欢迎页](https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@${assetSha}/public/prd/onboarding-acquisition-v2/01-welcome.png)|**触发条件：**首次进入新手引导时展示。<br><br>**展示说明：**展示品牌欢迎、平台定位、三项平台特色和底部“开始”按钮；不显示进度条。<br><br>**交互说明：**点击“开始”进入来源采集；欢迎页没有返回或跳过入口。|
```

执行时先将 `$assetSha=$env:ONBOARDING_ASSET_SHA`，再把代码示例中的 `${assetSha}` 展开为该40位值后写入 PRD；不得把变量表达式原样留在 PRD，也不得使用分支名、`latest`、相对路径、本地路径或浮动 URL。

- [ ] **Step 3: 编写 PRD 校验脚本**

```js
const prd = fs.readFileSync(prdPath, 'utf8');
assert(!prd.includes('V1.1'));
assert(!prd.includes('24小时后'));
assert(prd.includes('|功能／页面|图示|触发条件、展示说明与交互说明|'));

const urls = [...prd.matchAll(/!\[[^\]]*]\((https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@[0-9a-f]{40}\/public\/prd\/onboarding-acquisition-v2\/[^)]+\.png)\)/g)]
  .map(match => match[1]);
assert.equal(urls.length, 8);
assert.equal(new Set(urls).size, 8);
const imageLines = prd.split(/\r?\n/).filter(line => line.includes('/public/prd/onboarding-acquisition-v2/'));
assert.equal(imageLines.length, 8);
assert(imageLines.every(line => line.startsWith('|') && line.endsWith('|')), 'every image must stay inside a requirement table row');

for (const url of urls) {
  const response = await fetch(url, { cache: 'no-store' });
  assert.equal(response.status, 200, `${url} must return 200`);
  assert.match(response.headers.get('content-type') || '', /^image\/png/);
}
```

- [ ] **Step 4: 运行 PRD 校验**

Run:

```powershell
node tools/verify-onboarding-acquisition-prd.mjs
```

Expected: `PASS onboarding acquisition PRD: 8/8 fixed-SHA images available`。

- [ ] **Step 5: 提交 PRD**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md' 'tools/verify-onboarding-acquisition-prd.mjs'
git commit -m "docs(onboarding): document acquisition journey and analytics"
```

---

### Task 7: 最终回归、发布和本地交付

**Files:**

- Test: `demos/新手引导完整链路demo.html`
- Test: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`
- Test: `public/prd/onboarding-acquisition-v2/*.png`

- [ ] **Step 1: 运行最终回归**

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard.mjs
node tools/verify-onboarding-acquisition-prd.mjs
node tools/capture-onboarding-acquisition-v2.mjs
git diff --check origin/master..HEAD
```

Expected: 所有脚本 PASS，`git diff --check` 无输出。

- [ ] **Step 2: 快进发布最终提交**

```powershell
git fetch origin master
git rebase origin/master
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-onboarding-acquisition-prd.mjs
git push origin HEAD:master
```

Expected: 快进推送成功；禁止 `--force`。

- [ ] **Step 3: 验证在线 Demo**

```powershell
$demoUrl='https://z36358631-ship-it.github.io/-/demos/%E6%96%B0%E6%89%8B%E5%BC%95%E5%AF%BC%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AFdemo.html'
$response=Invoke-WebRequest -UseBasicParsing -Uri $demoUrl
if($response.StatusCode -ne 200){throw "Demo HTTP $($response.StatusCode)"}
if($response.Content -notmatch '欢迎新朋友'){throw 'Published Demo is stale'}
if($response.Content -notmatch '来源分析'){throw 'Published admin view is stale'}
```

Expected: 命令无异常，在线内容包含“欢迎新朋友”和“来源分析”。

- [ ] **Step 4: 同步用户主工作区文件**

先记录并比较主工作区目标文件的哈希；若在实施期间发生用户修改则停止同步并报告冲突。没有变化时，使用 `apply_patch` 将已发布版本的以下两个文件同步到主工作区，禁止使用 `git checkout --` 或覆盖式复制：

- `demos/新手引导完整链路demo.html`
- `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`

同步后运行：

```powershell
git hash-object -- 'demos/新手引导完整链路demo.html'
git -C '.tmp/onboarding-prd-v15-worktree' hash-object -- 'demos/新手引导完整链路demo.html'
git hash-object -- 'prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md'
git -C '.tmp/onboarding-prd-v15-worktree' hash-object -- 'prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md'
```

Expected: 两组哈希分别一致。

- [ ] **Step 5: 交付**

交付内容：

- 本地 Demo 路径。
- 本地专项 PRD 路径。
- GitHub Pages 预览地址。
- 最终提交 SHA。
- 8/8 图片公网验证结果。
- 新用户、非新用户、后台筛选和 PRD 校验结果。
