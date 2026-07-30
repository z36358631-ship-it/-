# GameHub 个性化推荐与获客来源整合向导 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有个性化选游戏页改造成“选游戏＋获客来源”的两步全屏问卷，并与独立的新手引流在视觉、触发、状态恢复、数据口径和 PRD 上形成一套可开发、可验收的完整方案。

**Architecture:** 保留两个单文件 HTML Demo：`个性化推荐采集demo.html` 负责两步问卷、触发模拟和状态恢复，`新手引导完整链路demo.html` 继续负责独立的新手引流，仅统一视觉并记录完成时间。使用页面内状态机和 `localStorage` 模拟客户端持久化、离线补报、账号去重与国内/海外配置；Node 静态校验和 Playwright 交互校验承担回归验证，截图通过固定 Git 提交的公开 HTTPS 地址写回现有 PRD 表格。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 22、`node:assert`、`node:vm`、`playwright-core`、GitHub Pages、Markdown PRD

---

## 实施边界与文件结构

本规格是一条连续的用户链路，不再拆分子项目。保持仓库现有“单文件可预览 Demo”模式，避免为了原型引入构建工具或前端框架。

**创建文件：**

- `tools/verify-personalization-acquisition-wizard.mjs`：静态结构、文案、枚举、状态机和内联脚本语法校验。
- `tools/verify-personalization-acquisition-wizard-ui.mjs`：Playwright 端到端交互、状态恢复和横竖屏校验。
- `tools/capture-personalization-acquisition-wizard.mjs`：生成 PRD 使用的固定页面截图。
- `tools/verify-personalization-acquisition-prd.mjs`：校验两份 PRD 的规则一致性、表内图片和固定 Git 提交地址。
- `public/prd/personalization-acquisition-wizard/01-game-step-cn.png`：国内选游戏页。
- `public/prd/personalization-acquisition-wizard/02-source-step-cn.png`：国内来源必答页。
- `public/prd/personalization-acquisition-wizard/03-source-step-overseas.png`：海外来源必答页。
- `public/prd/personalization-acquisition-wizard/04-source-resume-offline.png`：第二步中断恢复与离线状态。
- `public/prd/personalization-acquisition-wizard/05-onboarding-style-alignment.png`：新手引流视觉统一页。

**修改文件：**

- `demos/用户与设置/个性化推荐采集demo.html`：两步问卷的唯一交互 Demo。
- `demos/新手引导完整链路demo.html`：保持原有新手分流业务，只统一引导视觉并补充完成时间交接。
- `prd/【Prd】《盖世游戏》个性化推荐需求.md`：替换旧冷启动兴趣采集规则，补充来源采集、状态机、配置、埋点和验收。
- `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`：修正“新用户不再展示个性化推荐”的旧规则，写明满 24 小时后的问卷衔接。

**明确不修改：**

- 不改探索页、秒玩页和推荐算法的既有排序逻辑。
- 不把来源答案写入兴趣标签。
- 不以来源自报数据覆盖安装包、商店、UTM、广告平台或 Deep Link 的客观归因。
- 不使用运营广告位替代问卷的触发、必答、去重和完成状态。

### Task 1: 建立可逐项解锁的静态验收合同

**Files:**

- Create: `tools/verify-personalization-acquisition-wizard.mjs`
- Test: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 创建最终行为合同校验脚本**

写入以下完整脚本。`mode` 允许后续任务只验证刚完成的能力，最终再执行 `all`。

```js
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wizardPath = path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html');
const onboardingPath = path.join(root, 'demos', '新手引导完整链路demo.html');
const wizard = fs.readFileSync(wizardPath, 'utf8');
const onboarding = fs.readFileSync(onboardingPath, 'utf8');
const mode = process.argv[2] || 'all';

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function requireTokens(source, tokens, scope) {
  for (const token of tokens) {
    assert(source.includes(token), `${scope} missing token: ${token}`);
  }
}

function pass(name) {
  console.log(`PASS ${name}`);
}

function shell() {
  requireTokens(wizard, [
    'data-wizard-step="game"',
    'data-wizard-step="source"',
    'wizard-progress',
    'wizard-kicker',
    'wizard-footer',
    'Pick the games you love.',
    'Where did you hear about us?',
    '暂不选择',
  ], 'wizard shell');
  assert(!wizard.includes('view-swipe'), 'legacy swipe proposal still exists');
  assert(!wizard.includes('mode-toggle'), 'legacy proposal switch still exists');
  pass('shell');
}

function games() {
  requireTokens(wizard, [
    'const MIN_GAME_SELECTION = 3',
    'const MAX_GAME_SELECTION = 9',
    'data-action="shuffle-games"',
    'data-action="skip-games"',
    'data-action="submit-games"',
    'toggleGameSelection',
    'selected-game-check',
    'aria-pressed',
  ], 'game step');
  pass('games');
}

function sources() {
  requireTokens(wizard, [
    'domestic:',
    'overseas:',
    'douyin',
    'bilibili',
    'xiaohongshu',
    'app_store',
    'friend_referral',
    'other_or_unknown',
    'youtube',
    'tiktok',
    'reddit',
    'discord',
    'Where did you first hear about GameHub?',
    'data-action="submit-source"',
    'acquisition-source-card',
  ], 'source step');
  assert(!wizard.includes('GaishiGame'), 'overseas brand must be GameHub');
  assert(!wizard.includes('data-action="skip-source"'), 'source step must not be skippable');
  assert(!wizard.includes('data-action="close-wizard"'), 'wizard must not expose a close action');
  pass('sources');
}

function state() {
  requireTokens(wizard, [
    'not_eligible',
    'pending',
    'game_step_in_progress',
    'game_completed',
    'game_skipped',
    'source_pending',
    'completed',
    'onboarding_completed_at',
    'option_version',
    'saveWizardState',
    'restoreWizardState',
    'mergeIdentityState',
    'sync_pending',
    'eligibleColdStart',
    'window.PersonalizationWizard',
  ], 'state machine');
  pass('state');
}

function onboardingBridge() {
  requireTokens(onboarding, [
    'onboarding_completed_at',
    'recordOnboardingCompletion',
    '独立新手引流',
    '满24小时后的首次合格冷启动',
  ], 'onboarding bridge');
  pass('onboardingBridge');
}

function syntax() {
  for (const [name, source] of [['wizard', wizard], ['onboarding', onboarding]]) {
    const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    assert(scripts.length > 0, `${name} inline script missing`);
    scripts.forEach((code, index) => new vm.Script(code, { filename: `${name}-inline-${index}.js` }));
  }
  pass('syntax');
}

const tasks = { shell, games, sources, state, onboardingBridge, syntax };
if (mode === 'all') Object.values(tasks).forEach(task => task());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);
```

- [ ] **Step 2: 运行校验并确认旧 Demo 不满足新合同**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs shell
```

Expected: FAIL，首个错误为 `wizard shell missing token: data-wizard-step="game"`。

- [ ] **Step 3: 检查内联脚本基线仍可解析**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS syntax
```

- [ ] **Step 4: 提交静态验收合同**

```powershell
git add -- 'tools/verify-personalization-acquisition-wizard.mjs'
git commit -m "test(personalization): define wizard behavior contract"
```

Expected: 仅提交新增校验脚本，不包含工作区内其他已有改动。

### Task 2: 重建两步问卷公共框架与第一步游戏选择

**Files:**

- Modify: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `tools/verify-personalization-acquisition-wizard.mjs`

- [ ] **Step 1: 先确认游戏选择合同失败**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs games
```

Expected: FAIL，提示缺少 `const MIN_GAME_SELECTION = 3`。

- [ ] **Step 2: 将旧“点选/滑卡方案切换”重写为统一两步全屏骨架**

保留单文件结构，删除 `.mode-toggle`、`#view-swipe`、滑卡数据与 `alert()`。`<body>` 使用以下确定结构：

```html
<main class="prototype-shell">
  <aside class="simulator-panel" aria-label="触发与异常模拟">
    <h1>个性化问卷模拟器</h1>
    <label>用户场景
      <select id="personaSelect">
        <option value="existing">非新用户·首次合格冷启动</option>
        <option value="new_under_24h">新用户·完成引流未满24小时</option>
        <option value="new_eligible">新用户·满24小时</option>
        <option value="source_resume">第一步已完成·恢复第二步</option>
        <option value="completed">历史已完成</option>
      </select>
    </label>
    <label>市场
      <select id="marketSelect">
        <option value="domestic">国内</option>
        <option value="overseas">海外</option>
      </select>
    </label>
    <label>网络
      <select id="networkSelect">
        <option value="online">在线</option>
        <option value="offline">离线</option>
      </select>
    </label>
    <button type="button" data-action="simulate-cold-start">模拟合格冷启动</button>
    <button type="button" data-action="simulate-interrupt">模拟中断并恢复</button>
    <button type="button" data-action="reset-demo">重置演示数据</button>
    <output id="simulatorStatus" aria-live="polite"></output>
  </aside>

  <section class="phone" aria-label="盖世游戏问卷预览">
    <div class="status-bar"><span>9:41</span><span>5G&nbsp;&nbsp;100%</span></div>
    <div class="ambient ambient-blue"></div>
    <div class="ambient ambient-green"></div>

    <section class="wizard-page active" data-wizard-step="game">
      <header class="wizard-header">
        <div class="wizard-progress" aria-label="第1步，共2步">
          <span class="is-active"></span><span></span>
        </div>
        <p class="wizard-kicker">Pick the games you love.</p>
        <h2>挑选你感兴趣的游戏</h2>
        <p class="wizard-description">选出喜欢的游戏，让推荐更懂你</p>
      </header>
      <div class="game-toolbar">
        <span>至少3款，最多9款</span>
        <button type="button" data-action="shuffle-games">换一批</button>
      </div>
      <div class="game-grid" id="gameGrid"></div>
      <footer class="wizard-footer">
        <button type="button" class="text-button" data-action="skip-games">暂不选择</button>
        <button type="button" class="primary-button" data-action="submit-games" disabled>至少选择3款</button>
      </footer>
    </section>

    <section class="wizard-page" data-wizard-step="source" aria-hidden="true">
      <header class="wizard-header">
        <div class="wizard-progress" aria-label="第2步，共2步">
          <span class="is-active"></span><span class="is-active"></span>
        </div>
        <button type="button" class="back-button" data-action="back-to-games" aria-label="返回上一步">‹</button>
        <p class="wizard-kicker">Where did you hear about us?</p>
        <h2 id="sourceTitle">你最早是从哪里了解到盖世游戏的？</h2>
        <p class="wizard-description">请选择最符合实际情况的一项</p>
      </header>
      <div class="acquisition-source-grid" id="sourceGrid"></div>
      <footer class="wizard-footer">
        <button type="button" class="primary-button" data-action="submit-source" disabled>请选择一项</button>
      </footer>
    </section>

    <section class="wizard-page result-page" data-wizard-step="result" aria-hidden="true">
      <div class="result-mark">✓</div>
      <h2 id="resultTitle">设置完成</h2>
      <p id="resultDescription">已进入首页，推荐会结合你的选择逐步优化。</p>
    </section>
  </section>
</main>
```

公共视觉令牌和关键布局使用以下值，避免复制参考图的浅色品牌：

```css
:root {
  --bg: #080b10;
  --surface: #141922;
  --surface-strong: #1b222d;
  --text: #f6f7f9;
  --muted: #8d97a6;
  --gold: #f4d447;
  --gold-ink: #15130a;
  --blue-glow: rgba(54, 126, 255, .24);
  --green-glow: rgba(44, 213, 148, .18);
  --danger: #ff6b6b;
}

.phone {
  width: 390px;
  height: min(844px, calc(100vh - 48px));
  position: relative;
  overflow: hidden;
  border-radius: 44px;
  background: var(--bg);
  color: var(--text);
}

.wizard-page {
  position: absolute;
  inset: 44px 0 0;
  display: none;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  padding: 24px 22px max(24px, env(safe-area-inset-bottom));
}

.wizard-page.active { display: grid; }
.wizard-progress { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.wizard-progress span { height: 3px; border-radius: 99px; background: #2a313c; }
.wizard-progress span.is-active { background: var(--gold); }
.wizard-kicker { color: var(--gold); letter-spacing: .08em; text-transform: uppercase; }
.game-grid { overflow: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.wizard-footer { background: linear-gradient(180deg, transparent, var(--bg) 22%); padding-top: 20px; }
.primary-button { width: 100%; min-height: 52px; border: 0; border-radius: 16px; background: var(--gold); color: var(--gold-ink); }
.primary-button:disabled { background: #2b313b; color: #747e8b; }
```

- [ ] **Step 3: 实现第一步的 3–9 款选择、换一批和跳过**

用稳定 `game_id` 代替游戏名作为选择键。把以下逻辑写入页面内联脚本，并由 `renderGameStep()` 初始化：

```js
const MIN_GAME_SELECTION = 3;
const MAX_GAME_SELECTION = 9;

const gameCatalog = [
  { id: 'black_myth_wukong', name: '黑神话：悟空', type: '动作 RPG', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2358720/header.jpg' },
  { id: 'cyberpunk_2077', name: '赛博朋克 2077', type: '开放世界', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg' },
  { id: 'elden_ring', name: '艾尔登法环', type: '魂系', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg' },
  { id: 'resident_evil_4', name: '生化危机 4', type: '恐怖动作', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg' },
  { id: 'witcher_3', name: '巫师 3：狂猎', type: '剧情 RPG', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg' },
  { id: 'hades_2', name: '哈迪斯 2', type: 'Roguelike', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/header.jpg' },
  { id: 'pubg', name: '绝地求生', type: '战术竞技', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg' },
  { id: 'forza_horizon_5', name: '极限竞速：地平线 5', type: '竞速', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg' },
  { id: 'it_takes_two', name: '双人成行', type: '合作冒险', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1426210/header.jpg' },
  { id: 'baldurs_gate_3', name: '博德之门 3', type: '角色扮演', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg' },
  { id: 'monster_hunter_wilds', name: '怪物猎人：荒野', type: '共斗动作', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2246340/header.jpg' },
  { id: 'stardew_valley', name: '星露谷物语', type: '模拟经营', cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg' },
];

const state = {
  step: 'game',
  status: 'game_step_in_progress',
  selectedGameIds: new Set(),
  visibleGameIds: gameCatalog.slice(0, 9).map(game => game.id),
  sourceCode: null,
  market: 'domestic',
  network: 'online',
};

function showStep(step) {
  state.step = step;
  document.querySelectorAll('[data-wizard-step]').forEach(page => {
    const active = page.dataset.wizardStep === step;
    page.classList.toggle('active', active);
    page.setAttribute('aria-hidden', String(!active));
  });
  if (step === 'game') renderGameStep();
  if (step === 'source' && typeof renderSourceStep === 'function') renderSourceStep();
  if (typeof saveWizardState === 'function') saveWizardState();
}

function persistDraft() {
  if (typeof saveWizardState === 'function') saveWizardState();
}

function renderGameStep() {
  const grid = document.querySelector('#gameGrid');
  grid.innerHTML = state.visibleGameIds.map(id => {
    const game = gameCatalog.find(item => item.id === id);
    const selected = state.selectedGameIds.has(id);
    const disabled = !selected && state.selectedGameIds.size >= MAX_GAME_SELECTION;
    return `
      <button class="game-card${selected ? ' selected' : ''}" type="button"
        data-game-id="${game.id}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>
        <span class="game-cover">
          <img src="${game.cover}" alt="">
          <span class="selected-game-check" aria-hidden="true">✓</span>
        </span>
        <strong>${game.name}</strong>
        <small>${game.type}</small>
      </button>`;
  }).join('');

  const count = state.selectedGameIds.size;
  const submit = document.querySelector('[data-action="submit-games"]');
  submit.disabled = count < MIN_GAME_SELECTION;
  submit.textContent = count < MIN_GAME_SELECTION ? `还需选择${MIN_GAME_SELECTION - count}款` : `下一步 · 已选${count}款`;
}

function toggleGameSelection(gameId) {
  if (state.selectedGameIds.has(gameId)) state.selectedGameIds.delete(gameId);
  else if (state.selectedGameIds.size < MAX_GAME_SELECTION) state.selectedGameIds.add(gameId);
  renderGameStep();
  persistDraft();
}

function shuffleGames() {
  const selected = [...state.selectedGameIds];
  const rest = gameCatalog.filter(game => !state.selectedGameIds.has(game.id));
  const rotated = rest.slice(3).concat(rest.slice(0, 3)).map(game => game.id);
  state.visibleGameIds = [...selected, ...rotated].slice(0, 9);
  renderGameStep();
  persistDraft();
}

function submitGames() {
  if (state.selectedGameIds.size < MIN_GAME_SELECTION) return;
  state.status = 'game_completed';
  persistDraft();
  state.status = 'source_pending';
  showStep('source');
}

function skipGames() {
  state.selectedGameIds.clear();
  state.status = 'game_skipped';
  persistDraft();
  state.status = 'source_pending';
  showStep('source');
}
```

页面事件使用事件委托，避免每次渲染重复绑定：

```js
document.addEventListener('click', event => {
  const gameCard = event.target.closest('[data-game-id]');
  if (gameCard) toggleGameSelection(gameCard.dataset.gameId);
  if (event.target.closest('[data-action="shuffle-games"]')) shuffleGames();
  if (event.target.closest('[data-action="submit-games"]')) submitGames();
  if (event.target.closest('[data-action="skip-games"]')) skipGames();
});

renderGameStep();
```

- [ ] **Step 4: 验证公共框架和游戏规则**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs shell
node tools/verify-personalization-acquisition-wizard.mjs games
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS shell
PASS games
PASS syntax
```

- [ ] **Step 5: 提交第一步问卷**

```powershell
git add -- 'demos/用户与设置/个性化推荐采集demo.html'
git commit -m "feat(personalization): build game selection step"
```

### Task 3: 实现国内/海外来源必答页

**Files:**

- Modify: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `tools/verify-personalization-acquisition-wizard.mjs`

- [ ] **Step 1: 运行来源合同并确认失败**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs sources
```

Expected: FAIL，提示缺少 `domestic:`。

- [ ] **Step 2: 写入稳定来源枚举和市场版本**

```js
const SOURCE_OPTIONS = {
  domestic: {
    title: '你最早是从哪里了解到盖世游戏的？',
    optionVersion: 'domestic_v1',
    options: [
      { code: 'douyin', label: '抖音', icon: '抖' },
      { code: 'bilibili', label: '哔哩哔哩', icon: '哔' },
      { code: 'xiaohongshu', label: '小红书', icon: '红' },
      { code: 'app_store', label: '应用商店', icon: '商' },
      { code: 'friend_referral', label: '朋友推荐', icon: '友' },
      { code: 'other_or_unknown', label: '其他／不记得', icon: '…' },
    ],
  },
  overseas: {
    title: 'Where did you first hear about GameHub?',
    optionVersion: 'overseas_v1',
    options: [
      { code: 'youtube', label: 'YouTube', icon: '▶' },
      { code: 'tiktok', label: 'TikTok', icon: '♪' },
      { code: 'reddit', label: 'Reddit', icon: 'R' },
      { code: 'discord', label: 'Discord', icon: 'D' },
      { code: 'friend_referral', label: 'Friends', icon: 'F' },
      { code: 'other_or_unknown', label: 'Other / I don’t remember', icon: '…' },
    ],
  },
};
```

- [ ] **Step 3: 渲染单选、必答、不可跳过的第二步**

```js
function renderSourceStep() {
  const config = SOURCE_OPTIONS[state.market];
  const grid = document.querySelector('#sourceGrid');
  document.querySelector('#sourceTitle').textContent = config.title;
  grid.dataset.market = state.market;
  grid.innerHTML = config.options.map(option => `
    <button type="button"
      class="acquisition-source-card${state.sourceCode === option.code ? ' selected' : ''}"
      data-source-code="${option.code}"
      aria-pressed="${state.sourceCode === option.code}">
      <span class="source-icon" aria-hidden="true">${option.icon}</span>
      <strong>${option.label}</strong>
      <span class="source-check" aria-hidden="true">✓</span>
    </button>
  `).join('');

  const submit = document.querySelector('[data-action="submit-source"]');
  submit.disabled = !state.sourceCode;
  submit.textContent = state.sourceCode
    ? (state.market === 'domestic' ? '完成' : 'Finish')
    : (state.market === 'domestic' ? '请选择一项' : 'Choose one option');
}

function selectSource(sourceCode) {
  if (state.sourceSavedAt) return;
  const allowed = SOURCE_OPTIONS[state.market].options.some(option => option.code === sourceCode);
  if (!allowed) return;
  state.sourceCode = sourceCode;
  state.optionVersion = SOURCE_OPTIONS[state.market].optionVersion;
  renderSourceStep();
  persistDraft();
}

function backToGames() {
  showStep('game');
}

function completeWizard() {
  if (!state.sourceCode) return;
  state.status = 'completed';
  showStep('result');
}
```

在事件委托中增加：

```js
const sourceCard = event.target.closest('[data-source-code]');
if (sourceCard) selectSource(sourceCard.dataset.sourceCode);
if (event.target.closest('[data-action="back-to-games"]')) backToGames();
if (event.target.closest('[data-action="submit-source"]')) completeWizard();
```

第二步不得增加右上角关闭、跳过、稍后再说或遮罩点击退出；Android 返回键只执行 `backToGames()`。

- [ ] **Step 4: 验证国内/海外枚举和不可跳过规则**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs sources
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS sources
PASS syntax
```

- [ ] **Step 5: 提交来源页**

```powershell
git add -- 'demos/用户与设置/个性化推荐采集demo.html'
git commit -m "feat(personalization): add required acquisition source step"
```

### Task 4: 实现触发、持久化、恢复、去重和离线补报模拟

**Files:**

- Modify: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `tools/verify-personalization-acquisition-wizard.mjs`

- [ ] **Step 1: 运行状态机合同并确认失败**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs state
```

Expected: FAIL，提示缺少 `not_eligible`。

- [ ] **Step 2: 定义状态机、持久化模型和首次答案保护**

```js
const WIZARD_STATES = Object.freeze({
  NOT_ELIGIBLE: 'not_eligible',
  PENDING: 'pending',
  GAME_IN_PROGRESS: 'game_step_in_progress',
  GAME_COMPLETED: 'game_completed',
  GAME_SKIPPED: 'game_skipped',
  SOURCE_PENDING: 'source_pending',
  COMPLETED: 'completed',
});

const STORAGE_KEY = 'gamehub_personalization_acquisition_v1';

function serializableState() {
  return {
    status: state.status,
    step: state.step,
    selectedGameIds: [...state.selectedGameIds],
    visibleGameIds: state.visibleGameIds,
    sourceCode: state.sourceCode,
    market: state.market,
    optionVersion: state.optionVersion || null,
    onboarding_completed_at: state.onboarding_completed_at || null,
    sourceSavedAt: state.sourceSavedAt || null,
    syncStatus: state.syncStatus || null,
    identity: state.identity || { installId: 'demo-install', accountId: null },
  };
}

function saveWizardState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState()));
}

function restoreWizardState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (!saved) return false;
  Object.assign(state, saved, { selectedGameIds: new Set(saved.selectedGameIds || []) });
  showStep(saved.status === WIZARD_STATES.COMPLETED ? 'result' : saved.step || 'game');
  return true;
}

function mergeIdentityState(deviceState, accountState) {
  if (!accountState) return deviceState;
  if (accountState.status === WIZARD_STATES.COMPLETED) return accountState;
  if (deviceState?.status === WIZARD_STATES.COMPLETED) return deviceState;
  if (accountState.sourceCode) return accountState;
  return deviceState || accountState;
}
```

`sourceCode` 一旦对应 `sourceSavedAt`，后续登录、换机、配置更新或重复点击不得覆盖。演示重置是唯一允许清除的入口。

- [ ] **Step 3: 实现新老用户的合格冷启动判断**

```js
function eligibleColdStart(input) {
  if (!input.isColdStart) return false;
  if (!input.complianceFinished || input.hasHigherPriorityLayer) return false;
  if (!input.featureEnabled || !input.inVersionRange || !input.inRollout) return false;
  if (input.status === WIZARD_STATES.COMPLETED) return false;
  if (input.userType === 'new') {
    if (!input.onboardingCompletedAt) return false;
    return input.serverNow - input.onboardingCompletedAt >= 24 * 60 * 60 * 1000;
  }
  return true;
}

function simulateColdStart() {
  const persona = document.querySelector('#personaSelect').value;
  const now = Date.now();
  const input = {
    isColdStart: true,
    complianceFinished: true,
    hasHigherPriorityLayer: false,
    featureEnabled: true,
    inVersionRange: true,
    inRollout: true,
    userType: persona.startsWith('new_') ? 'new' : 'existing',
    onboardingCompletedAt: persona === 'new_under_24h' ? now - 23 * 60 * 60 * 1000 : now - 25 * 60 * 60 * 1000,
    serverNow: now,
    status: persona === 'completed' ? WIZARD_STATES.COMPLETED : state.status,
  };

  if (persona === 'source_resume') {
    state.status = WIZARD_STATES.SOURCE_PENDING;
    showStep('source');
    return;
  }

  const eligible = eligibleColdStart(input);
  document.querySelector('#simulatorStatus').textContent = eligible
    ? '满足条件：展示问卷'
    : '本次不展示：进入原首页';
  if (eligible) showStep(state.status === WIZARD_STATES.SOURCE_PENDING ? 'source' : 'game');
  else {
    showStep('result');
    document.querySelector('#resultTitle').textContent = '本次不展示问卷';
    document.querySelector('#resultDescription').textContent = '未命中触发条件，按原流程进入首页。';
  }
}
```

触发优先级固定为：隐私/合规 → 强制升级/安全 → 新手引流 → 两步问卷 → 运营活动/广告。后台返回、支付返回、Deep Link、推送直达和游戏恢复不调用 `simulateColdStart()`。

- [ ] **Step 4: 实现本地先完成、联网后补报**

```js
// 用持久化版本替换 Task 3 的同名基础函数。
function completeWizard() {
  if (!state.sourceCode || state.sourceSavedAt) return;
  state.status = WIZARD_STATES.COMPLETED;
  state.step = 'result';
  state.sourceSavedAt = new Date().toISOString();
  state.syncStatus = state.network === 'online' ? 'synced' : 'sync_pending';
  saveWizardState();
  showStep('result');
  document.querySelector('#resultTitle').textContent = state.market === 'domestic' ? '设置完成' : 'All set';
  document.querySelector('#resultDescription').textContent =
    state.syncStatus === 'sync_pending'
      ? '已保存在本机，联网后会自动同步。'
      : '已进入首页，推荐会结合你的选择逐步优化。';
}

function retryPendingSync() {
  if (state.network === 'online' && state.syncStatus === 'sync_pending') {
    state.syncStatus = 'synced';
    saveWizardState();
  }
}
```

网络选择变化时更新 `state.network` 并调用 `retryPendingSync()`。离线不阻塞进入结果页，失败也不能把状态回滚为来源未选择。

- [ ] **Step 5: 暴露稳定的自动化接口并完成横竖屏适配**

```js
window.PersonalizationWizard = {
  state,
  showStep,
  simulateColdStart,
  eligibleColdStart,
  restoreWizardState,
  mergeIdentityState,
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  },
  setMarket(market) {
    state.market = market === 'overseas' ? 'overseas' : 'domestic';
    state.sourceCode = null;
    renderSourceStep();
    saveWizardState();
  },
  setNetwork(network) {
    state.network = network === 'offline' ? 'offline' : 'online';
    retryPendingSync();
  },
};
```

为模拟器控件补齐确定事件，并在打开页面时恢复草稿或根据 URL 选择演示人群：

```js
function simulateInterrupt() {
  saveWizardState();
  document.querySelector('#simulatorStatus').textContent = '已模拟进程中断，并从本地草稿恢复';
  restoreWizardState();
}

document.querySelector('#marketSelect').addEventListener('change', event => {
  window.PersonalizationWizard.setMarket(event.target.value);
});

document.querySelector('#networkSelect').addEventListener('change', event => {
  window.PersonalizationWizard.setNetwork(event.target.value);
});

document.querySelector('[data-action="simulate-cold-start"]').addEventListener('click', simulateColdStart);
document.querySelector('[data-action="simulate-interrupt"]').addEventListener('click', simulateInterrupt);
document.querySelector('[data-action="reset-demo"]').addEventListener('click', () => window.PersonalizationWizard.reset());

const requestedPersona = new URLSearchParams(location.search).get('persona');
if (requestedPersona && document.querySelector(`#personaSelect option[value="${requestedPersona}"]`)) {
  document.querySelector('#personaSelect').value = requestedPersona;
}

if (!restoreWizardState()) {
  renderGameStep();
  renderSourceStep();
  showStep('game');
}
if (requestedPersona) simulateColdStart();
```

```css
@media (orientation: landscape) and (max-height: 540px) {
  .prototype-shell { grid-template-columns: 280px minmax(680px, 1fr); }
  .phone { width: min(920px, calc(100vw - 340px)); height: min(430px, calc(100vh - 32px)); border-radius: 28px; }
  .wizard-page { grid-template-columns: 260px minmax(0, 1fr); grid-template-rows: 1fr auto; column-gap: 22px; }
  .wizard-header { grid-row: 1 / span 2; }
  .game-grid { grid-template-columns: repeat(5, 1fr); }
  .acquisition-source-grid { grid-template-columns: repeat(3, 1fr); }
  .wizard-footer { grid-column: 2; }
}
```

CSS 旋转只重排布局，不修改 `state.step`、`selectedGameIds`、`sourceCode` 或滚动位置。

- [ ] **Step 6: 验证状态合同**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs state
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS state
PASS syntax
```

- [ ] **Step 7: 提交状态机**

```powershell
git add -- 'demos/用户与设置/个性化推荐采集demo.html'
git commit -m "feat(personalization): persist and resume wizard state"
```

### Task 5: 统一新手引流视觉并建立 24 小时交接

**Files:**

- Modify: `demos/新手引导完整链路demo.html`
- Test: `tools/verify-personalization-acquisition-wizard.mjs`

- [ ] **Step 1: 运行新手交接合同并确认失败**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs onboardingBridge
```

Expected: FAIL，提示缺少 `onboarding_completed_at`。

- [ ] **Step 2: 统一视觉，但保留新手链路业务和独立进度**

在现有 `:root` 中加入与问卷一致的视觉令牌：

```css
:root {
  --guide-bg: #080b10;
  --guide-surface: #141922;
  --guide-text: #f6f7f9;
  --guide-muted: #8d97a6;
  --guide-gold: #f4d447;
  --guide-blue-glow: rgba(54, 126, 255, .24);
  --guide-green-glow: rgba(44, 213, 148, .18);
}
```

引导首屏顶部增加新手自己的进度和装饰语：

```html
<div class="onboarding-progress" aria-label="独立新手引流">
  <span class="is-active"></span><span></span><span></span>
</div>
<p class="guide-kicker">Start your GameHub journey.</p>
```

不把该三段进度与问卷两段进度相连；“我有游戏想玩”“我是新手”、国内秒玩礼包、海外操作图、导入和 Steam 绑定路径保持原行为。

- [ ] **Step 3: 在新手完成点记录服务端语义的完成时间**

```js
const ONBOARDING_HANDOFF_KEY = 'gamehub_onboarding_handoff_v1';

function recordOnboardingCompletion(path) {
  const handoff = {
    onboarding_completed_at: new Date().toISOString(),
    onboarding_path: path,
    next_rule: '满24小时后的首次合格冷启动',
  };
  localStorage.setItem(ONBOARDING_HANDOFF_KEY, JSON.stringify(handoff));
  return handoff;
}
```

在 `showDone(type)` 进入完成页前调用：

```js
recordOnboardingCompletion(type);
```

完成页的说明增加一行静态交接信息，明确此处不会立刻弹问卷：

```html
<p class="handoff-note">独立新手引流已完成；个性化问卷将在满24小时后的首次合格冷启动展示。</p>
```

Demo 控制区增加“查看 24 小时后问卷”按钮，仅用于评审演示：

```html
<button class="cp-btn" onclick="location.href='用户与设置/个性化推荐采集demo.html?persona=new_eligible'">查看24小时后问卷</button>
```

- [ ] **Step 4: 验证新手交接和两个 Demo 的脚本语法**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs onboardingBridge
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS onboardingBridge
PASS syntax
```

- [ ] **Step 5: 提交新手视觉与交接**

```powershell
git add -- 'demos/新手引导完整链路demo.html'
git commit -m "feat(onboarding): align visuals and record wizard handoff"
```

### Task 6: 增加 Playwright 交互与布局验收

**Files:**

- Create: `tools/verify-personalization-acquisition-wizard-ui.mjs`
- Test: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `demos/新手引导完整链路demo.html`

- [ ] **Step 1: 创建端到端交互校验**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => localStorage.clear());
await page.reload();

const gameCards = page.locator('[data-game-id]');
assert.equal(await gameCards.count(), 9, 'game step must show nine candidates');
assert.equal(await page.locator('[data-action="submit-games"]').isDisabled(), true);
for (let index = 0; index < 3; index += 1) await gameCards.nth(index).click();
assert.equal(await page.locator('[data-action="submit-games"]').isEnabled(), true);
await page.locator('[data-action="submit-games"]').click();
assert.equal(await page.locator('[data-wizard-step="source"].active').count(), 1);
assert.equal(await page.locator('[data-action="submit-source"]').isDisabled(), true);
assert.equal(await page.locator('[data-action="skip-source"]').count(), 0);
assert.equal(await page.locator('[data-action="close-wizard"]').count(), 0);

await page.locator('[data-source-code="douyin"]').click();
assert.equal(await page.locator('[data-action="submit-source"]').isEnabled(), true);
await page.selectOption('#networkSelect', 'offline');
await page.locator('[data-action="submit-source"]').click();
assert.equal(await page.locator('[data-wizard-step="result"].active').count(), 1);
assert.equal(
  await page.evaluate(() => window.PersonalizationWizard.state.syncStatus),
  'sync_pending',
  'offline completion must persist instead of blocking'
);

await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('[data-action="skip-games"]').click();
assert.equal(await page.locator('[data-wizard-step="source"].active').count(), 1);
assert.deepEqual(
  await page.evaluate(() => [...window.PersonalizationWizard.state.selectedGameIds]),
  [],
  'skip must not create interest selections'
);

await page.locator('[data-source-code="friend_referral"]').click();
await page.reload();
await page.setViewportSize({ width: 960, height: 480 });
assert.equal(await page.locator('[data-wizard-step="source"].active').count(), 1);
assert.equal(await page.locator('[data-source-code="friend_referral"]').getAttribute('aria-pressed'), 'true');

await page.selectOption('#marketSelect', 'overseas');
assert.equal(await page.locator('[data-source-code="youtube"]').count(), 1);
assert((await page.locator('#sourceTitle').innerText()).includes('GameHub'));
assert.equal((await page.locator('body').innerText()).includes('GaishiGame'), false);

const under24Eligible = await page.evaluate(() => window.PersonalizationWizard.eligibleColdStart({
  isColdStart: true,
  complianceFinished: true,
  hasHigherPriorityLayer: false,
  featureEnabled: true,
  inVersionRange: true,
  inRollout: true,
  userType: 'new',
  onboardingCompletedAt: Date.now() - 23 * 60 * 60 * 1000,
  serverNow: Date.now(),
  status: 'pending',
}));
assert.equal(under24Eligible, false, 'new user must wait a rolling 24 hours');

const mergedState = await page.evaluate(() => window.PersonalizationWizard.mergeIdentityState(
  { status: 'source_pending', sourceCode: 'douyin' },
  { status: 'completed', sourceCode: 'friend_referral', sourceSavedAt: '2026-07-30T08:00:00.000Z' }
));
assert.equal(mergedState.status, 'completed', 'completed account state must win identity merge');
assert.equal(mergedState.sourceCode, 'friend_referral', 'first completed source answer must not be overwritten');

const phoneBox = await page.locator('.phone').boundingBox();
const sourceBox = await page.locator('[data-wizard-step="source"].active').boundingBox();
assert(sourceBox.x >= phoneBox.x && sourceBox.x + sourceBox.width <= phoneBox.x + phoneBox.width);
assert(sourceBox.y >= phoneBox.y && sourceBox.y + sourceBox.height <= phoneBox.y + phoneBox.height);
assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);

await browser.close();
console.log('PASS wizardUi');
```

- [ ] **Step 2: 运行交互校验**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard-ui.mjs
```

Expected:

```text
PASS wizardUi
```

- [ ] **Step 3: 提交交互校验**

```powershell
git add -- 'tools/verify-personalization-acquisition-wizard-ui.mjs'
git commit -m "test(personalization): verify wizard interactions and recovery"
```

### Task 7: 生成 PRD 页面证据截图

**Files:**

- Create: `tools/capture-personalization-acquisition-wizard.mjs`
- Create: `public/prd/personalization-acquisition-wizard/01-game-step-cn.png`
- Create: `public/prd/personalization-acquisition-wizard/02-source-step-cn.png`
- Create: `public/prd/personalization-acquisition-wizard/03-source-step-overseas.png`
- Create: `public/prd/personalization-acquisition-wizard/04-source-resume-offline.png`
- Create: `public/prd/personalization-acquisition-wizard/05-onboarding-style-alignment.png`

- [ ] **Step 1: 创建确定性截图脚本**

```js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'prd', 'personalization-acquisition-wizard');
fs.mkdirSync(output, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
if (!executablePath) throw new Error('Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
const wizardUrl = pathToFileURL(path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html')).href;
await page.goto(wizardUrl);
await page.evaluate(() => localStorage.clear());
await page.reload();

async function shot(name) {
  await page.locator('.phone').screenshot({ path: path.join(output, name) });
}

await shot('01-game-step-cn.png');
for (let index = 0; index < 3; index += 1) await page.locator('[data-game-id]').nth(index).click();
await page.locator('[data-action="submit-games"]').click();
await shot('02-source-step-cn.png');

await page.selectOption('#marketSelect', 'overseas');
await shot('03-source-step-overseas.png');

await page.selectOption('#marketSelect', 'domestic');
await page.selectOption('#networkSelect', 'offline');
await page.locator('[data-source-code="friend_referral"]').click();
await page.locator('[data-action="simulate-interrupt"]').click();
await shot('04-source-resume-offline.png');

const onboardingUrl = pathToFileURL(path.join(root, 'demos', '新手引导完整链路demo.html')).href;
await page.goto(onboardingUrl);
await page.locator('.phone').screenshot({
  path: path.join(output, '05-onboarding-style-alignment.png'),
});

await browser.close();
console.log(`Captured ${output}`);
```

- [ ] **Step 2: 运行截图脚本**

Run:

```powershell
node tools/capture-personalization-acquisition-wizard.mjs
```

Expected: 输出 `Captured C:\Users\z3635\官网改动\public\prd\personalization-acquisition-wizard`，目录内生成 5 张非空 PNG。

- [ ] **Step 3: 检查截图尺寸和文件大小**

Run:

```powershell
Add-Type -AssemblyName System.Drawing
Get-ChildItem -LiteralPath 'public\prd\personalization-acquisition-wizard' -Filter '*.png' |
  ForEach-Object {
    $image = [System.Drawing.Image]::FromFile($_.FullName)
    try { [PSCustomObject]@{ Name=$_.Name; Width=$image.Width; Height=$image.Height; Bytes=$_.Length } }
    finally { $image.Dispose() }
  } | Format-Table -AutoSize
```

Expected: 5 张图片宽高均大于 300px，`Bytes` 均大于 20KB。

- [ ] **Step 4: 提交截图脚本和图片，获得固定资源提交**

```powershell
git add -- 'tools/capture-personalization-acquisition-wizard.mjs' 'public/prd/personalization-acquisition-wizard'
git commit -m "docs(personalization): capture wizard evidence"
git rev-parse HEAD
```

Expected: `git rev-parse HEAD` 返回包含图片的 40 位固定提交值；下一任务以该值生成图片地址。

### Task 8: 按现有表格结构更新两份 PRD

**Files:**

- Modify: `prd/【Prd】《盖世游戏》个性化推荐需求.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`
- Create: `tools/verify-personalization-acquisition-prd.mjs`
- Test: `public/prd/personalization-acquisition-wizard/*.png`

本任务执行前必须读取并使用 `to-prd` 技能。内容直接融入原有功能表、详细设计表、埋点表、验收表和美术需求表，不在文档尾部另建“补充说明”；每张图片放在对应行的“图示”单元格内。

- [ ] **Step 1: 先建立 PRD 一致性校验**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const personalization = fs.readFileSync(path.join(root, 'prd', '【Prd】《盖世游戏》个性化推荐需求.md'), 'utf8');
const onboarding = fs.readFileSync(path.join(root, 'prd', 'ai生成', '【Prd】《盖世游戏》新手引导分流需求.md'), 'utf8');
const docs = personalization + '\n' + onboarding;

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

for (const token of [
  '满24小时后的首次合格冷启动',
  '至少3款，最多9款',
  '暂不选择',
  '来源单选、必答、不可跳过',
  '其他／不记得',
  'Other / I don’t remember',
  'GameHub',
  'option_version',
  '本地可靠保存',
  '不覆盖客观安装归因',
]) assert(docs.includes(token), `PRD missing token: ${token}`);

assert(!docs.includes('GaishiGame'), 'overseas brand is incorrect');
assert(!docs.includes('新用户原个性化推荐（选3-x款游戏）改为行为采集替代'), 'obsolete onboarding rule remains');

const imagePattern = /https:\/\/raw\.githubusercontent\.com\/z36358631-ship-it\/-\/[0-9a-f]{40}\/public\/prd\/personalization-acquisition-wizard\/0[1-5]-[^)\s]+\.png/g;
const images = docs.match(imagePattern) || [];
assert(images.length >= 5, `expected at least five fixed-sha images, found ${images.length}`);

for (const line of docs.split(/\r?\n/).filter(line => line.includes('personalization-acquisition-wizard'))) {
  assert(line.trim().startsWith('|') && line.trim().endsWith('|'), `image must stay inside a table row: ${line}`);
}

console.log('PASS personalizationAcquisitionPrd');
```

- [ ] **Step 2: 运行校验并确认旧 PRD 失败**

Run:

```powershell
node tools/verify-personalization-acquisition-prd.mjs
```

Expected: FAIL，提示缺少 `满24小时后的首次合格冷启动` 或存在旧的新用户替代规则。

- [ ] **Step 3: 更新个性化推荐 PRD 的既有章节**

在 `3.1 功能列表` 中将“兴趣采集页”改为“两步个性化与来源问卷”，P0 描述为：

```text
目标用户在合格冷启动进入两步全屏问卷：第一步可选3–9款游戏或暂不选择；第二步必须单选获客来源后完成。
```

在 `3.2.1 冷启动兴趣采集` 原位置替换旧“单设备首次访问”规则，写入：

```text
新用户：完成独立新手引流后记录 onboarding_completed_at，满滚动24小时后的首次合格冷启动触发。
非新用户：目标版本上线后的首次合格冷启动触发；历史已完成用户不重复展示。
合格冷启动：App 由未运行状态启动，且隐私、强更、安全流程已完成，当前不在登录、授权、支付、下载、导入、Steam绑定或游戏恢复流程，没有更高优先级系统弹层，并命中市场、版本和灰度配置。
```

将该模块表格拆成三行。具体 Markdown 由资源提交值动态生成，确保图片仍在同一行的“图示”单元格：

```powershell
$assetCommit = git rev-parse HEAD
$imageBase = "https://raw.githubusercontent.com/z36358631-ship-it/-/$assetCommit/public/prd/personalization-acquisition-wizard"
$gameImage = "![第一步：选择游戏]($imageBase/01-game-step-cn.png)"
$sourceImages = "![第二步：国内来源]($imageBase/02-source-step-cn.png)<br>![第二步：海外来源]($imageBase/03-source-step-overseas.png)"
$resumeImage = "![第二步恢复与离线]($imageBase/04-source-resume-offline.png)"
$detailRows = @"
|步骤|触发条件|展示说明|交互说明|图示|
|---|---|---|---|---|
|第一步：选择游戏|问卷状态为 ``pending`` 或 ``game_step_in_progress``|深色全屏页；两段进度点亮第一段；展示游戏封面、名称和类型|至少3款、最多9款；不足3款主按钮禁用；支持换一批；可点“暂不选择”进入第二步且不生成手选兴趣标签|$gameImage|
|第二步：来源采集|第一步提交成功或主动跳过；恢复状态为 ``source_pending``|两段进度全部点亮；国内和海外分别展示6项；海外品牌为 ``GameHub``|单选、必答、默认不选中、不可跳过；系统返回键回到第一步并保留选择；本地可靠保存后允许进入首页|$sourceImages|
|第二步恢复/离线|进程中断后恢复，或来源提交时无网络|恢复已选来源；离线完成页说明将在联网后同步|不重复第一步；联网后幂等补报；首次有效来源不可覆盖|$resumeImage|
"@
$detailRows
```

将命令输出的完整三行替换进 `3.2.1 冷启动兴趣采集` 的原功能表位置。

在埋点表中新增并使用以下稳定事件：

```markdown
|`personalization_wizard_view`|任一步完整展示|`step`,`market`,`question_version`,`entry_group`|
|`personalization_game_select`|选择或取消游戏|`game_id`,`selected_count`|
|`personalization_game_submit`|第一步成功提交|`selected_ids`,`selected_count`|
|`personalization_game_skip`|点击暂不选择|`duration_ms`|
|`acquisition_source_select`|选择或切换来源|`source_code`,`option_position`,`option_version`|
|`acquisition_source_submit`|来源在本地可靠保存|`source_code`,`market`,`package_channel`,`option_version`|
|`personalization_wizard_interrupt`|退出、强杀恢复或异常中断|`step`,`interrupt_type`|
|`personalization_wizard_sync_result`|后台同步成功或失败|`result`,`retry_count`|
```

在运营配置章节写入以下规则，不新增独立后台页面：

```markdown
|配置项|规则|
|---|---|
|总开关|控制问卷是否参与触发，不清除历史完成状态|
|市场|国内、海外分开配置|
|目标版本|配置最低和最高适用版本|
|目标用户|新用户、非新用户可分别开启|
|灰度比例|按稳定账号或安装标识分桶|
|生效时间|配置开始和结束时间|
|来源选项|每个市场固定为5个主要渠道加1个兜底项|
|选项顺序与图标|支持调整展示顺序和平台图标；图标加载失败时显示首字母|
|选项版本|修改枚举含义或集合时生成新的 `option_version`，历史数据继续按原版本解释|
```

在来源选项表中写入稳定枚举，展示文案可随语言变化，但枚举不得复用为其他含义：

```markdown
|市场|展示文案|稳定枚举|
|---|---|---|
|国内|抖音|`douyin`|
|国内|哔哩哔哩|`bilibili`|
|国内|小红书|`xiaohongshu`|
|国内|应用商店|`app_store`|
|国内|朋友推荐|`friend_referral`|
|国内|其他／不记得|`other_or_unknown`|
|海外|YouTube|`youtube`|
|海外|TikTok|`tiktok`|
|海外|Reddit|`reddit`|
|海外|Discord|`discord`|
|海外|Friends|`friend_referral`|
|海外|Other / I don’t remember|`other_or_unknown`|
```

在验收表补充 11 条独立用例：新用户当日不叠加问卷、滚动24小时、3–9款限制、游戏跳过不建标签、来源必答、第二步恢复、离线完成、首次答案不覆盖、账号设备去重、横竖屏状态保持、来源与客观归因隔离。

- [ ] **Step 4: 修正新手引流 PRD 的衔接规则**

在 `3.3 核心体验路径` 的国内和海外链路末尾增加“记录新手引流完成时间”，但不把问卷接在当次链路后。

将 `4.2.7 个性化推荐替代方案` 改名为“个性化问卷衔接”，内容固定为：

```text
新手引流与个性化问卷是两个独立流程。新用户完成任一新手引流路径后记录 onboarding_completed_at，本次启动不再叠加个性化问卷；满滚动24小时后的首次合格冷启动进入两步问卷。第一步可选择3–9款游戏或暂不选择，第二步来源单选、必答、不可跳过。新手行为仍可用于后续推荐，但不能替代用户明确选择，也不能把来源答案写入兴趣标签。
```

在 `4.2 详细设计（C端）` 对应的新手首屏行的“图示”单元格中写入：

```powershell
$assetCommit = git rev-parse HEAD
$onboardingImage = "![新手引流视觉统一](https://raw.githubusercontent.com/z36358631-ship-it/-/$assetCommit/public/prd/personalization-acquisition-wizard/05-onboarding-style-alignment.png)"
$onboardingImage
```

将命令输出的完整 Markdown 图片语法写入表格单元格，不放在表格外。

- [ ] **Step 5: 以资源提交值生成固定图片 URL 并写入表格**

Run:

```powershell
$assetCommit = git rev-parse HEAD
$base = "https://raw.githubusercontent.com/z36358631-ship-it/-/$assetCommit/public/prd/personalization-acquisition-wizard"
$urls = 1..5 | ForEach-Object {
  $file = Get-ChildItem -LiteralPath 'public\prd\personalization-acquisition-wizard' -Filter ("0{0}-*.png" -f $_) | Select-Object -First 1
  "$base/$($file.Name)"
}
$urls
```

Expected: 输出 5 个包含同一 40 位提交值的 `https://raw.githubusercontent.com/` 地址。将它们依次写入两份 PRD 对应表格的图示单元格。

- [ ] **Step 6: 运行 PRD 校验**

Run:

```powershell
node tools/verify-personalization-acquisition-prd.mjs
```

Expected:

```text
PASS personalizationAcquisitionPrd
```

- [ ] **Step 7: 提交 PRD**

```powershell
git add -- 'prd/【Prd】《盖世游戏》个性化推荐需求.md' 'prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md' 'tools/verify-personalization-acquisition-prd.mjs'
git commit -m "docs(personalization): integrate acquisition source requirements"
```

### Task 9: 全量回归、发布与在线预览验收

**Files:**

- Test: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `demos/新手引导完整链路demo.html`
- Test: `prd/【Prd】《盖世游戏》个性化推荐需求.md`
- Test: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`
- Test: `public/prd/personalization-acquisition-wizard/*.png`

- [ ] **Step 1: 运行全部本地验收**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs all
node tools/verify-personalization-acquisition-wizard-ui.mjs
node tools/verify-personalization-acquisition-prd.mjs
```

Expected:

```text
PASS shell
PASS games
PASS sources
PASS state
PASS onboardingBridge
PASS syntax
PASS wizardUi
PASS personalizationAcquisitionPrd
```

- [ ] **Step 2: 确认提交范围没有夹带工作区既有改动**

Run:

```powershell
git status --short
git log --oneline -9
```

Expected: 本计划涉及的文件均已提交；`git status --short` 中允许保留用户原有的其他未提交文件，但不得出现本计划文件的未提交修改。

- [ ] **Step 3: 推送当前分支**

```powershell
git push origin master
```

Expected: 远端 `master` 更新至当前本地提交。该动作属于外部发布，执行者必须在获得用户发布授权后运行。

- [ ] **Step 4: 验证 GitHub Pages Demo**

Run:

```powershell
$wizardUrl = 'https://z36358631-ship-it.github.io/-/demos/%E7%94%A8%E6%88%B7%E4%B8%8E%E8%AE%BE%E7%BD%AE/%E4%B8%AA%E6%80%A7%E5%8C%96%E6%8E%A8%E8%8D%90%E9%87%87%E9%9B%86demo.html'
$onboardingUrl = 'https://z36358631-ship-it.github.io/-/demos/%E6%96%B0%E6%89%8B%E5%BC%95%E5%AF%BC%E5%AE%8C%E6%95%B4%E9%93%BE%E8%B7%AFdemo.html'
(Invoke-WebRequest -UseBasicParsing -Uri $wizardUrl).StatusCode
(Invoke-WebRequest -UseBasicParsing -Uri $onboardingUrl).StatusCode
```

Expected:

```text
200
200
```

- [ ] **Step 5: 验证 PRD 图片可公开访问**

Run:

```powershell
$assetCommit = git log --format='%H' -- 'public/prd/personalization-acquisition-wizard' | Select-Object -First 1
Get-ChildItem -LiteralPath 'public\prd\personalization-acquisition-wizard' -Filter '*.png' | ForEach-Object {
  $url = "https://raw.githubusercontent.com/z36358631-ship-it/-/$assetCommit/public/prd/personalization-acquisition-wizard/$($_.Name)"
  $response = Invoke-WebRequest -UseBasicParsing -Uri $url
  [PSCustomObject]@{ File=$_.Name; Status=$response.StatusCode; Type=$response.Headers['Content-Type'] }
} | Format-Table -AutoSize
```

Expected: 5 行均为 `Status=200` 且 `Type` 以 `image/png` 开头。

- [ ] **Step 6: 最终人工走查**

按以下顺序各执行一次，并保留浏览器截图：

1. 非新用户冷启动 → 选择3款 → 国内来源 → 在线完成。
2. 非新用户冷启动 → 暂不选择 → 海外来源 → 在线完成。
3. 新用户完成新手引流未满24小时 → 不展示问卷。
4. 新用户满24小时后的合格冷启动 → 展示问卷。
5. 第二步选中来源后中断 → 冷启动恢复第二步且保留选择。
6. 第二步离线完成 → 进入首页 → 联网后 `sync_pending` 变为 `synced`。
7. 竖屏切横屏 → 当前步骤、选择和滚动位置不变。
8. 历史已完成账号或设备 → 不重复展示。

Expected: 8 条全部符合设计规格，来源答案未出现在任何兴趣标签字段中，且没有覆盖客观归因字段。

## 自检结论

- **规格覆盖：** 新老用户触发、滚动24小时、合格冷启动、3–9款、游戏可跳过、来源必答、国内/海外6项、GameHub 品牌、状态恢复、账号设备合并、弱网补报、运营版本、埋点、横竖屏、PRD 表内图片和在线预览均有对应任务。
- **范围控制：** 新手引流仍独立；未改推荐算法、探索页、秒玩页和客观安装归因；没有把问卷设计成广告位。
- **类型一致：** Demo、静态校验和 UI 校验统一使用 `selectedGameIds`、`sourceCode`、`optionVersion`、`syncStatus`、`onboarding_completed_at` 和 `eligibleColdStart`。
- **提交安全：** 每次 `git add` 都使用明确路径，避免把当前脏工作区中的其他用户改动带入提交。
