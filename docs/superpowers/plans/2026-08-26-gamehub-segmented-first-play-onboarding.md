# GameHub Segmented First-Play Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于盖世游戏现有新手引导和实机页面，新增一份独立的单文件高保真 Demo，完整演示按 Steam、本地文件、暂无游戏和先逛首页分流的首次游玩路径，并支持竖屏、掌机横屏、状态恢复和可玩终点验证。

**Architecture:** 以现有 `demos/新手引导完整链路demo.html` 为只读基线，复制为独立 Demo 后仅替换准备方式、分支路由和首页续接；继续使用单文件 HTML、原生 CSS/JavaScript 与 `localStorage`，不引入框架。用一份独立 Playwright 验证器从首屏走完各分支，把 `playable_ready` 作为唯一首玩成功终点，并输出横竖屏截图供视觉复核。

**Tech Stack:** 单文件 HTML5、CSS3、原生 JavaScript、`localStorage`、Node.js、`playwright-core`、本机 Chrome、Git。

---

## 1. 范围与文件结构

### 本计划修改

- Create: `demos/新手首玩按游戏资产分流demo.html` — 独立交互 Demo，不覆盖旧版完整链路 Demo。
- Create: `tools/verify-segmented-first-play-onboarding.mjs` — 结构、路径、持久化、国内外差异、横竖屏和截图验证。
- Generate, do not commit: `test-results/segmented-first-play-onboarding/` — 自动化截图和运行证据。

### 只读参考

- `docs/superpowers/specs/2026-08-26-gamehub-segmented-first-play-onboarding-design.md` — 已确认方案与验收口径。
- `demos/新手引导完整链路demo.html` — 欢迎页、来源采集、国内秒玩、导入、首页及控制台基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/02-新用户欢迎页.png` — 竖屏欢迎页视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/03-新手选游戏.png` — 竖屏秒玩/免费游戏列表视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/04-导入或绑定Steam.png` — 当前资产入口视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/06-Steam账号登录.png` — Steam 登录视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/08-竖版首页.png` — 竖屏首页视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/11-玩游戏-云游戏.png` — 国内秒玩列表视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/19-游戏库-Steam.png` — Steam 个人游戏库视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/22-导入游戏.png` — 本地导入视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/36-掌机模式-首页.png` — 横屏首页视觉基线。
- `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/41-掌机模式-游戏库.png` — 横屏游戏库视觉基线。

### 本计划不修改

- 不修改 `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`；Demo 确认后再单独修订 PRD。
- 不修改既有 Demo、`.superpowers/brainstorm` 视觉稿、后台来源分析或用户来源字典。
- 不新增任务中心、推荐算法、权益发放、计费、海外云游戏或真实 Steam/文件系统接口。

## 2. 实施任务

### Task 1: 建立独立 Demo 与烟雾验证

**Files:**

- Create: `demos/新手首玩按游戏资产分流demo.html`
- Create: `tools/verify-segmented-first-play-onboarding.mjs`
- Reference: `demos/新手引导完整链路demo.html:1-1957`

- [ ] **Step 1: 写入必然失败的独立文件烟雾验证**

创建 `tools/verify-segmented-first-play-onboarding.mjs`，先只检查新文件、标题、页面无 JavaScript 错误和旧文件未被改名：

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '新手首玩按游戏资产分流demo.html');
const sourcePath = path.join(root, 'demos', '新手引导完整链路demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(fs.existsSync(sourcePath), '只读基线 Demo 不存在');
assert(fs.existsSync(demoPath), '独立首玩 Demo 尚未创建');
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(demoPath).href);
assert.equal(await page.title(), '盖世游戏按游戏资产分流首玩 Demo');
assert.deepEqual(pageErrors, []);

await browser.close();
console.log('PASS segmented first-play onboarding smoke');
```

- [ ] **Step 2: 运行烟雾验证并确认失败**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: FAIL with `独立首玩 Demo 尚未创建`。

- [ ] **Step 3: 从当前完整链路复制独立 Demo**

Run:

```powershell
Copy-Item -LiteralPath 'demos\新手引导完整链路demo.html' -Destination 'demos\新手首玩按游戏资产分流demo.html'
```

随后使用 `apply_patch` 将新文件中的标题和存储键改成独立值：

```html
<title>盖世游戏按游戏资产分流首玩 Demo</title>
```

```js
var ONBOARDING_SOURCE_KEY='gamehub_first_play_onboarding_v1';
var ONBOARDING_HANDOFF_KEY='gamehub_first_play_handoff_v1';
```

- [ ] **Step 4: 运行烟雾验证并确认通过**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: `PASS segmented first-play onboarding smoke`。

- [ ] **Step 5: 提交独立基线**

```powershell
git add -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --cached --check
git commit -m "test: scaffold segmented first-play demo"
```

Expected: 提交只包含新 Demo 和新验证器。

### Task 2: 将准备方式改为按游戏资产直接分流

**Files:**

- Modify: `demos/新手首玩按游戏资产分流demo.html:122-199`
- Modify: `demos/新手首玩按游戏资产分流demo.html:572-599`
- Modify: `demos/新手首玩按游戏资产分流demo.html:998-1022`
- Modify: `demos/新手首玩按游戏资产分流demo.html:1564-1616`
- Modify: `demos/新手首玩按游戏资产分流demo.html:1697-1729`
- Modify: `tools/verify-segmented-first-play-onboarding.mjs`

- [ ] **Step 1: 在验证器中增加国内首屏结构断言**

在 smoke 断言之后追加：

```js
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.locator('[data-action="start-new-user"]').click();
await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();

assert.equal(await page.locator('#startMethodTitle').innerText(), '你现在有哪种游戏？');
assert.equal(await page.locator('#startMethodDesc').innerText(), '选择最符合你的情况，我们带你直接开始玩');
assert.deepEqual(
  await page.locator('[data-first-play-path]').evaluateAll(nodes => nodes.map(node => node.dataset.firstPlayPath)),
  ['steam', 'local_file', 'no_asset']
);
assert.equal(await page.locator('[data-action="browse-home"]').innerText(), '先逛逛首页');
assert.equal(await page.locator('[data-start-method]').count(), 0, '旧身份式入口必须移除');
```

- [ ] **Step 2: 运行验证并确认旧首屏断言失败**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: FAIL，因为标题仍是“你准备怎么开始？”或不存在 `data-first-play-path`。

- [ ] **Step 3: 替换准备方式页结构**

将 `#pageStartMethod` 内标题、三个卡片和底部入口替换为：

```html
<div class="page-title" id="startMethodTitle">你现在有哪种游戏？</div>
<div class="page-desc" id="startMethodDesc">选择最符合你的情况，我们带你直接开始玩</div>
<div class="opt-list first-play-options" id="firstPlayOptions">
  <button type="button" class="opt-card" data-first-play-path="steam">
    <div class="opt-icon steam" aria-hidden="true">S</div>
    <div class="opt-info"><div class="opt-title">Steam 里有游戏</div><div class="opt-desc">登录 Steam，查看并启动已购买的游戏</div></div>
    <div class="opt-arrow">›</div>
  </button>
  <button type="button" class="opt-card" data-first-play-path="local_file">
    <div class="opt-icon import" aria-hidden="true">▣</div>
    <div class="opt-info"><div class="opt-title">手机里有游戏文件</div><div class="opt-desc">扫描或选择文件，导入后开始游戏</div></div>
    <div class="opt-arrow">›</div>
  </button>
  <button type="button" class="opt-card" data-first-play-path="no_asset">
    <div class="opt-icon play" aria-hidden="true">⚡</div>
    <div class="opt-info"><div class="opt-title">暂时没有游戏，先免费玩</div><div class="opt-desc">赠送 15 分钟，选一个游戏立即开玩</div></div>
    <div class="opt-arrow">›</div>
  </button>
</div>
<button type="button" class="first-play-browse" data-action="browse-home">先逛逛首页</button>
```

- [ ] **Step 4: 增加弱入口与选中态样式**

在 Option Cards 样式后追加：

```css
.first-play-options{gap:12px;padding-top:4px}
.first-play-options .opt-card{min-height:112px;padding:18px 16px}
.first-play-options .opt-card[aria-pressed="true"]{border-color:var(--gold);background:var(--gold-dim);box-shadow:var(--shadow-glow)}
.first-play-browse{align-self:center;margin:18px 0 24px;padding:8px 12px;border:0;background:transparent;color:var(--muted);font:400 13px/20px var(--font);cursor:pointer}
.first-play-browse:focus-visible,.opt-card:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
```

- [ ] **Step 5: 用国内/海外文案表统一渲染**

在 `ONBOARDING_SOURCE_OPTIONS` 后定义并调用：

```js
var FIRST_PLAY_COPY={
  domestic:{
    title:'你现在有哪种游戏？',
    description:'选择最符合你的情况，我们带你直接开始玩',
    options:{
      steam:['Steam 里有游戏','登录 Steam，查看并启动已购买的游戏'],
      local_file:['手机里有游戏文件','扫描或选择文件，导入后开始游戏'],
      no_asset:['暂时没有游戏，先免费玩','赠送 15 分钟，选一个游戏立即开玩']
    },
    browse:'先逛逛首页'
  },
  overseas:{
    title:'Which games do you already have?',
    description:'Choose your situation and we will take you straight to the next step.',
    options:{
      steam:['I have games on Steam','Sign in to view and launch games you own'],
      local_file:['I have game files on this device','Scan or choose files, then import and play'],
      no_asset:["I don't have a game yet",'Choose a free game, download it, and start playing']
    },
    browse:'Browse Home first'
  }
};

function renderFirstPlayOptions(){
  var copy=FIRST_PLAY_COPY[isOverseas?'overseas':'domestic'];
  var selectedPath=['instant_play','free_download'].includes(onboardingFlow.firstPlayPath)?'no_asset':onboardingFlow.firstPlayPath;
  document.getElementById('startMethodTitle').textContent=copy.title;
  document.getElementById('startMethodDesc').textContent=copy.description;
  document.querySelectorAll('[data-first-play-path]').forEach(function(card){
    var item=copy.options[card.dataset.firstPlayPath];
    card.querySelector('.opt-title').textContent=item[0];
    card.querySelector('.opt-desc').textContent=item[1];
    card.setAttribute('aria-pressed',String(selectedPath===card.dataset.firstPlayPath));
  });
  document.querySelector('[data-action="browse-home"]').textContent=copy.browse;
}
```

从 `applyRegionPresentation()` 删除旧 `methodCards` 三组身份文案赋值，在该函数末尾调用 `renderFirstPlayOptions()`。

- [ ] **Step 6: 扩展最小状态字段但暂不接分支**

将 `createDefaultOnboardingFlow()` 中的 `startMethod` 替换为：

```js
firstPlayPath:null,
firstPlayStage:null,
firstPlayGameId:null,
firstPlayCompleted:false,
updatedAt:null,
```

旧值仅在新 Demo 中移除，不修改原文件或正式数据迁移。

- [ ] **Step 7: 运行验证并确认首屏通过**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: PASS 到国内首屏结构断言，无页面错误。

- [ ] **Step 8: 提交资产首屏**

```powershell
git add -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --cached --check
git commit -m "feat: segment first play by game assets"
```

### Task 3: 接通 Steam、本地文件和国内秒玩，并以可玩状态收口

**Files:**

- Modify: `demos/新手首玩按游戏资产分流demo.html:601-724`
- Modify: `demos/新手首玩按游戏资产分流demo.html:897-949`
- Modify: `demos/新手首玩按游戏资产分流demo.html:1697-1848`
- Modify: `tools/verify-segmented-first-play-onboarding.mjs`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/06-Steam账号登录.png`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/19-游戏库-Steam.png`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/22-导入游戏.png`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/11-玩游戏-云游戏.png`

- [ ] **Step 1: 添加三条国内路径的失败测试**

在验证器中增加 `resetJourney()` 并逐条断言：

```js
async function resetJourney(){
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-action="start-new-user"]').click();
  await page.locator('[data-onboarding-source-code="friend_referral"]').click();
  await page.locator('[data-action="submit-onboarding-source"]').click();
}

const eventSnapshots={};

await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
assert.equal(await page.locator('#pageSteamLogin.active').count(), 1);
await page.locator('[data-action="steam-login-success"]').click();
assert.equal(await page.locator('#pageSteamLibrary.active').count(), 1);
assert.equal((await page.evaluate(() => window.demoEvents)).some(event => event.name==='playable_ready'), false);
await page.locator('[data-action="steam-launch"]').first().click();
assert.equal((await page.evaluate(() => window.demoEvents)).filter(event => event.name==='playable_ready').length, 1);
eventSnapshots.steam=await page.evaluate(() => window.demoEvents.map(event => ({...event})));

await resetJourney();
await page.locator('[data-first-play-path="local_file"]').click();
assert.equal(await page.locator('#page3.active').count(), 1);
await page.waitForSelector('#scanResult.show');
await page.locator('[data-action="import-complete"]').click();
assert.equal((await page.evaluate(() => window.demoEvents)).some(event => event.name==='playable_ready'), false);
await page.locator('[data-action="local-launch"]').click();
assert.equal((await page.evaluate(() => window.demoEvents)).at(-1).name, 'playable_ready');
eventSnapshots.local_file=await page.evaluate(() => window.demoEvents.map(event => ({...event})));

await resetJourney();
await page.locator('[data-first-play-path="no_asset"]').click();
assert.equal(await page.locator('#page2.active').count(), 1);
await page.locator('[data-action="instant-launch"]').first().click();
assert.equal((await page.evaluate(() => window.demoEvents)).at(-1).path, 'instant_play');
eventSnapshots.instant_play=await page.evaluate(() => window.demoEvents.map(event => ({...event})));
```

- [ ] **Step 2: 运行验证并确认路径页不存在**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: FAIL at `#pageSteamLogin.active`。

- [ ] **Step 3: 将原二次选择页改成 Steam 登录，并新增个人游戏库页**

在新 Demo 中删除旧 `#page1` 的“导入/绑定”二次选择，使用以下语义结构；视觉细节按 06、19 号实机图还原：

```html
<div class="page" id="pageSteamLogin">
  <div class="steam-auth-page">
    <button type="button" class="page-back" data-action="return-to-paths" aria-label="返回">←</button>
    <div class="steam-mark" aria-hidden="true">STEAM</div>
    <h2>登录 Steam</h2>
    <p>登录后同步你的个人游戏库，仅用于查看和启动已拥有的游戏。</p>
    <button type="button" class="primary-pill" data-action="steam-login-success">登录 Steam</button>
    <button type="button" class="text-action" data-action="simulate-steam-failure">模拟登录失败</button>
  </div>
</div>

<div class="page" id="pageSteamLibrary">
  <div class="library-page">
    <header><button type="button" class="page-back" data-action="return-to-paths">←</button><h2>Steam 游戏</h2></header>
    <div class="library-grid" id="steamLibraryGrid"></div>
    <button type="button" class="text-action" data-action="simulate-empty-library">模拟空游戏库</button>
  </div>
</div>
```

`renderSteamLibrary()` 只使用现有 `games` 数据，并给启动按钮添加 `data-action="steam-launch"` 与 `data-game-id`，不伪造账号价值、成就或好友数据。

```js
function renderSteamLibrary(){
  document.getElementById('steamLibraryGrid').innerHTML=games.slice(0,6).map(function(game,index){
    return '<article class="library-game">'+
      '<img src="'+game.cover+'" alt="">'+
      '<div><strong>'+game.name+'</strong><span>Steam</span></div>'+
      '<button type="button" data-action="steam-launch" data-game-id="game_'+index+'">启动</button>'+
    '</article>';
  }).join('');
}
```

- [ ] **Step 4: 为扫描流程增加可控阶段与启动入口**

把固定 `setTimeout` 改为可验证的函数：

```js
function completeLocalScan(){
  document.getElementById('scanCircle').style.display='none';
  document.getElementById('scanTitle').textContent='扫描完成';
  document.getElementById('scanSub').textContent='在你的设备中找到了游戏文件';
  document.getElementById('scanResult').classList.add('show');
  setFirstPlayStage('content_ready');
}

function completeLocalImport(){
  setFirstPlayStage('content_ready','game_2');
  switchPage('pageLocalReady');
}
```

`showScan()` 使用 `setTimeout(completeLocalScan,600)` 模拟现有扫描过程；将原“导入并进入游戏库”按钮改为 `data-action="import-complete"`。自动化等待 `.scan-result.show`，不在用户界面增加“模拟扫描完成”按钮。

增加 `#pageLocalReady`，仅显示已导入游戏和 `data-action="local-launch"`；“扫描完成”“导入完成”均不得调用成功收口。

```html
<div class="page" id="pageLocalReady">
  <div class="library-page">
    <header><button type="button" class="page-back" data-action="return-to-paths">←</button><h2>已导入游戏</h2></header>
    <article class="library-game">
      <img data-scan-cover="2" alt="艾尔登法环">
      <div><strong>艾尔登法环</strong><span>本地游戏</span></div>
      <button type="button" data-action="local-launch" data-game-id="game_2">启动</button>
    </article>
  </div>
</div>
```

- [ ] **Step 5: 让国内秒玩列表直接启动**

`renderGameList()` 中秒玩按钮输出：

```js
'<button type="button" class="game-list-item__action" data-action="instant-launch" data-game-id="game_'+index+'">秒玩</button>'
```

保留“查看更多”，但点击后仍留在现有秒玩列表能力内，并记录 `first_play_stage_result` 的 `game_select` 阶段，不再跳到完成页。

- [ ] **Step 6: 建立统一状态和 Demo 事件记录器**

替换旧 `recordOnboardingCompletion()` / `showDone()` 的首玩完成用途：

```js
window.demoEvents=[];

function emitDemoEvent(name,detail){
  window.demoEvents.push(Object.assign({name:name,at:new Date().toISOString()},detail||{}));
}

function setFirstPlayStage(stage,gameId){
  onboardingFlow.firstPlayStage=stage;
  if(gameId) onboardingFlow.firstPlayGameId=gameId;
  onboardingFlow.updatedAt=new Date().toISOString();
  saveOnboardingFlow();
  emitDemoEvent('first_play_stage_result',{path:onboardingFlow.firstPlayPath,stage:stage,result:'success',game_id:gameId||null});
  renderFirstPlayOptions();
}

function markPlayable(path,gameId){
  onboardingFlow.firstPlayPath=path;
  onboardingFlow.firstPlayStage='playable';
  onboardingFlow.firstPlayGameId=gameId||null;
  onboardingFlow.firstPlayCompleted=true;
  onboardingFlow.state=ONBOARDING_FLOW_STATES.COMPLETED;
  onboardingFlow.updatedAt=new Date().toISOString();
  saveOnboardingFlow();
  emitDemoEvent('game_launch_request',{path:path,game_id:gameId||null});
  emitDemoEvent('playable_ready',{path:path,game_id:gameId||null});
  switchPage('page4');
}
```

将 `#page4` 的主按钮改为真实首页入口，避免继续调用 `resetAll()`：

```html
<button class="done-btn" type="button" data-action="enter-home-after-playable">进入首页</button>
```

Steam 登录、扫描、导入和下载只调用 `setFirstPlayStage()`；只有三种启动按钮调用 `markPlayable()`。

- [ ] **Step 7: 接入直接路由与失败换路**

```js
function chooseFirstPlayPath(path){
  if(!['steam','local_file','no_asset','browse'].includes(path)) return;
  onboardingFlow.firstPlayPath=path;
  onboardingFlow.firstPlayStage='selected';
  onboardingFlow.firstPlayCompleted=false;
  onboardingFlow.state=path==='browse'?ONBOARDING_FLOW_STATES.COMPLETED:ONBOARDING_FLOW_STATES.DESTINATION;
  onboardingFlow.updatedAt=new Date().toISOString();
  saveOnboardingFlow();
  emitDemoEvent('onboarding_start_method_select',{market:isOverseas?'overseas':'domestic',path:path});
  if(path==='browse') return showHomeResult('browse');
  emitDemoEvent('first_play_path_view',{market:isOverseas?'overseas':'domestic',path:path,resume_source:'onboarding'});
  if(path==='steam') return switchPage('pageSteamLogin');
  if(path==='local_file') return showScan();
  if(isOverseas) return openFreeDownloadList();
  return goNewUserDirect();
}
```

点击 `[data-first-play-path]` 调用 `chooseFirstPlayPath()`；点击 `[data-action="browse-home"]` 调用 `chooseFirstPlayPath('browse')`。登录失败、空库、无文件、文件不支持和启动失败状态必须显示“重试”与“返回选择其他方式”，不得自动写入完成。

在现有委托点击处理器末尾加入明确动作映射：

```js
var firstPlayCard=event.target.closest('[data-first-play-path]');
if(firstPlayCard) chooseFirstPlayPath(firstPlayCard.dataset.firstPlayPath);
if(event.target.closest('[data-action="browse-home"]')) chooseFirstPlayPath('browse');
if(event.target.closest('[data-action="return-to-paths"]')){
  onboardingFlow.state=ONBOARDING_FLOW_STATES.START_METHOD;
  saveOnboardingFlow();
  renderFirstPlayOptions();
  switchPage('pageStartMethod');
}
if(event.target.closest('[data-action="steam-login-success"]')){
  setFirstPlayStage('content_ready');
  renderSteamLibrary();
  switchPage('pageSteamLibrary');
}
var steamLaunch=event.target.closest('[data-action="steam-launch"]');
if(steamLaunch) markPlayable('steam',steamLaunch.dataset.gameId);
if(event.target.closest('[data-action="import-complete"]')) completeLocalImport();
var localLaunch=event.target.closest('[data-action="local-launch"]');
if(localLaunch) markPlayable('local_file',localLaunch.dataset.gameId);
var instantLaunch=event.target.closest('[data-action="instant-launch"]');
if(instantLaunch) markPlayable('instant_play',instantLaunch.dataset.gameId);
if(event.target.closest('[data-action="enter-home-after-playable"]')) showHomeResult('playable');
```

每个分支主内容内放置同样的行内错误结构，ID 分别为 `steamLoginError`、`steamLibraryError`、`localImportError`、`instantPlayError`；不使用 Toast 或新弹窗：

```html
<p class="first-play-error" id="steamLoginError" hidden></p>
```

```js
var FIRST_PLAY_ERRORS={
  steam_login_failed:['steamLoginError','Steam 登录失败，请重试或选择其他方式'],
  steam_library_empty:['steamLibraryError','该账号暂未同步到可玩的游戏'],
  permission_denied:['localImportError','未获得扫描权限，你仍可手动选择文件'],
  scan_empty:['localImportError','没有扫描到可导入的游戏文件'],
  instant_launch_failed:['instantPlayError','启动失败，请重试或换一款游戏']
};

function showFirstPlayError(code){
  var error=FIRST_PLAY_ERRORS[code];
  if(!error) return;
  var element=document.getElementById(error[0]);
  element.textContent=error[1];
  element.hidden=false;
  emitDemoEvent('first_play_stage_result',{path:onboardingFlow.firstPlayPath,stage:onboardingFlow.firstPlayStage||'selected',result:'failure',failure_reason:code});
}
```

同时在 `switchPage()` 中按真实曝光记录首屏事件：

```js
function switchPage(id){
  document.querySelectorAll('.page').forEach(function(pageNode){pageNode.classList.remove('active')});
  document.getElementById(id).classList.add('active');
  if(id==='pageStartMethod'){
    emitDemoEvent('onboarding_start_method_view',{market:isOverseas?'overseas':'domestic',orientation:document.querySelector('.phone').dataset.orientation||'portrait'});
  }
}
```

- [ ] **Step 8: 跑完三条国内链路**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: Steam、本地文件和国内秒玩测试全部通过；每条路径恰好产生一个 `playable_ready`。

- [ ] **Step 9: 提交国内路径**

```powershell
git add -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --cached --check
git commit -m "feat: connect domestic first-play paths"
```

### Task 4: 复用首页“继续”承接未完成路径

**Files:**

- Modify: `demos/新手首玩按游戏资产分流demo.html:416-425`
- Modify: `demos/新手首玩按游戏资产分流demo.html:777-793`
- Modify: `demos/新手首玩按游戏资产分流demo.html:1725-1761`
- Modify: `tools/verify-segmented-first-play-onboarding.mjs`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/08-竖版首页.png`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/36-掌机模式-首页.png`

- [ ] **Step 1: 写首页默认续接、最近路径和首次成功三类失败测试**

```js
await resetJourney();
await page.locator('[data-action="browse-home"]').click();
assert.equal(await page.locator('#homeContinueTitle').innerText(), '免费秒玩 15 分钟');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#page2.active').count(), 1);

await resetJourney();
await page.locator('[data-first-play-path="steam"]').click();
await page.reload();
assert.equal(await page.locator('#pageHome.active').count(), 1);
assert.equal(await page.locator('#homeContinueTitle').innerText(), '继续登录 Steam');
await page.locator('[data-action="home-continue"]').click();
assert.equal(await page.locator('#pageSteamLogin.active').count(), 1);

await page.locator('[data-action="steam-login-success"]').click();
await page.locator('[data-action="steam-launch"]').first().click();
await page.locator('[data-action="enter-home-after-playable"]').click();
assert.equal(await page.locator('#homeContinueTitle').innerText(), '继续最近游戏');
```

- [ ] **Step 2: 运行验证并确认首页没有继续卡片**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: FAIL at `#homeContinueTitle`。

- [ ] **Step 3: 在现有首页层级中加入一个“继续”组件**

放在首页主视觉下、推荐 Tab 前，不新增任务区：

```html
<button type="button" class="home-continue" data-action="home-continue">
  <span class="home-continue__eyebrow">继续</span>
  <strong id="homeContinueTitle">免费秒玩 15 分钟</strong>
  <span id="homeContinueDesc">无需账号、下载或充值，选一款立即开始</span>
  <span class="home-continue__arrow" aria-hidden="true">›</span>
</button>
```

样式沿用首页现有卡片圆角、暗色背景和黄色强调，不新增浮层、角标或奖励图标。

- [ ] **Step 4: 用一张映射表渲染续接状态**

```js
var HOME_CONTINUE_COPY={
  domestic:{
    default:['免费秒玩 15 分钟','无需账号、下载或充值，选一款立即开始'],
    steam_selected:['继续登录 Steam','登录后查看你的个人游戏库'],
    steam_content_ready:['继续从 Steam 游戏库开始','选择一款已拥有的游戏并启动'],
    local_file_selected:['继续导入游戏','扫描或选择手机里的游戏文件'],
    local_file_content_ready:['继续启动已导入的游戏','已保留你的导入进度'],
    instant_play_selected:['继续免费秒玩','继续选择或启动一款秒玩游戏'],
    playable:['继续最近游戏','回到你上次游玩的游戏']
  },
  overseas:{
    default:['Find a free game','Choose a free game, download it, and start playing'],
    steam_selected:['Continue Steam sign-in','Sign in to view your personal library'],
    steam_content_ready:['Continue from Steam Library','Choose and launch a game you own'],
    local_file_selected:['Continue importing a game','Scan or choose a game file on this device'],
    local_file_content_ready:['Launch your imported game','Your import progress has been saved'],
    free_download_selected:['Continue downloading a game','Return to the selected free game'],
    playable:['Continue recent game','Return to the game you played last']
  }
};
```

`renderHomeContinue()` 按“已成功 > 最近未完成 > 默认入口”取文案；页面只能显示一个续接动作。

```js
function getHomeContinueKey(){
  if(onboardingFlow.firstPlayCompleted) return 'playable';
  if(onboardingFlow.firstPlayPath==='steam') return onboardingFlow.firstPlayStage==='content_ready'?'steam_content_ready':'steam_selected';
  if(onboardingFlow.firstPlayPath==='local_file') return onboardingFlow.firstPlayStage==='content_ready'?'local_file_content_ready':'local_file_selected';
  if(onboardingFlow.firstPlayPath==='no_asset'||onboardingFlow.firstPlayPath==='instant_play') return isOverseas?'free_download_selected':'instant_play_selected';
  if(onboardingFlow.firstPlayPath==='free_download') return 'free_download_selected';
  return 'default';
}

function renderHomeContinue(){
  var market=isOverseas?'overseas':'domestic';
  var item=HOME_CONTINUE_COPY[market][getHomeContinueKey()];
  document.getElementById('homeContinueTitle').textContent=item[0];
  document.getElementById('homeContinueDesc').textContent=item[1];
}
```

- [ ] **Step 5: 实现恢复，不在启动时强制打开未完成分支**

把 `restoreOnboardingFlow()` 的 `DESTINATION` 分支改为进入首页并渲染续接：

```js
if(onboardingFlow.state===ONBOARDING_FLOW_STATES.DESTINATION){
  showHomeResult('resume');
  return true;
}
```

`resumeFirstPlay()` 根据 `firstPlayPath` 和 `firstPlayStage` 返回 Steam 登录/个人库、导入/已导入、秒玩列表或海外下载页；`firstPlayCompleted=true` 时走现有继续最近游戏演示。

```js
function resumeFirstPlay(){
  if(onboardingFlow.firstPlayCompleted) return switchPage('page4');
  if(onboardingFlow.firstPlayPath==='steam'){
    return switchPage(onboardingFlow.firstPlayStage==='content_ready'?'pageSteamLibrary':'pageSteamLogin');
  }
  if(onboardingFlow.firstPlayPath==='local_file'){
    return switchPage(onboardingFlow.firstPlayStage==='content_ready'?'pageLocalReady':'page3');
  }
  if(isOverseas||onboardingFlow.firstPlayPath==='free_download') return openFreeDownloadList();
  return goNewUserDirect();
}
```

在 `showHomeResult()` 末尾调用 `renderHomeContinue()`，并把首页按钮接到恢复函数：

```js
function showHomeResult(reason){
  var result=document.querySelector('#pageHome [data-result]');
  result.dataset.result=reason;
  renderHomeContinue();
  emitDemoEvent('first_play_home_continue_view',{path:onboardingFlow.firstPlayPath||'browse',stage:onboardingFlow.firstPlayStage||'selected'});
  switchPage('pageHome');
}

if(event.target.closest('[data-action="home-continue"]')){
  emitDemoEvent('first_play_home_continue_click',{path:onboardingFlow.firstPlayPath||'browse',stage:onboardingFlow.firstPlayStage||'selected'});
  resumeFirstPlay();
}
```

- [ ] **Step 6: 运行首页恢复验证**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: 默认路径、Steam 中断恢复和成功后恢复正常“继续”全部通过。

- [ ] **Step 7: 提交首页续接**

```powershell
git add -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --cached --check
git commit -m "feat: resume first play from home continue"
```

### Task 5: 完成海外免费游戏下载与横竖屏适配

**Files:**

- Modify: `demos/新手首玩按游戏资产分流demo.html:28-53`
- Modify: `demos/新手首玩按游戏资产分流demo.html:624-724`
- Modify: `demos/新手首玩按游戏资产分流demo.html:790-811`
- Modify: `demos/新手首玩按游戏资产分流demo.html:1564-1616`
- Modify: `tools/verify-segmented-first-play-onboarding.mjs`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/03-新手选游戏.png`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/36-掌机模式-首页.png`
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/41-掌机模式-游戏库.png`

- [ ] **Step 1: 增加海外边界和横屏状态失败测试**

```js
await resetJourney();
await page.locator('#regionBtn').click();
await page.locator('[data-action="start-new-user"]').click();
await page.locator('[data-onboarding-source-code="youtube"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(await page.locator('[data-first-play-path="no_asset"] .opt-title').innerText(), "I don't have a game yet");
await page.locator('[data-first-play-path="no_asset"]').click();
assert.equal(await page.locator('#pageFreeDownload.active').count(), 1);
assert.equal((await page.locator('#pageFreeDownload').innerText()).includes('15'), false);
assert.equal((await page.locator('#pageFreeDownload').innerText()).includes('Cloud'), false);
await page.locator('[data-action="download-select"]').first().click();
await page.locator('[data-action="download-confirm"]').click();
assert.equal((await page.evaluate(() => window.demoEvents)).some(event => event.name==='playable_ready'), false);

await page.locator('[data-orientation="landscape"]').click();
const landscape = await page.locator('.phone').evaluate(node => {
  const rect=node.getBoundingClientRect();
  return {wide:rect.width>rect.height,path:node.dataset.orientation};
});
assert.equal(landscape.wide, true);
assert.equal(landscape.path, 'landscape');
assert.equal(await page.locator('#pageFreeDownload.active').count(), 1, '旋转后必须保留当前页面');
await page.locator('[data-action="free-download-launch"]').first().click();
eventSnapshots.free_download=await page.evaluate(() => window.demoEvents.map(event => ({...event})));
```

- [ ] **Step 2: 运行验证并确认海外仍进入旧操作引导**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: FAIL，因为旧 `#page2b` 仍是两页操作引导。

- [ ] **Step 3: 将海外旧引导替换为现有免费游戏下载路径的 Demo 表现**

使用独立容器，下载确认前展示大小与预计耗时：

```html
<div class="page" id="pageFreeDownload">
  <div class="free-download-page">
    <header><button type="button" class="page-back" data-action="return-to-paths">←</button><h2>Free games</h2></header>
    <div class="free-download-grid" id="freeDownloadGrid"></div>
    <p class="first-play-error" id="freeDownloadError" hidden></p>
  </div>
</div>

<div class="dialog-layer" id="downloadConfirm" hidden>
  <section class="download-dialog" role="dialog" aria-modal="true" aria-labelledby="downloadGameName">
    <h3 id="downloadGameName"></h3>
    <p id="downloadMeta">Download size 2.4 GB · About 6–12 min on the current network</p>
    <button type="button" class="primary-pill" data-action="download-confirm">Download</button>
    <button type="button" class="text-action" data-action="download-cancel">Cancel</button>
  </section>
</div>
```

点击下载只进入 `content_ready`；下载完成后的 Launch 才调用 `markPlayable('free_download',gameId)`。页面不出现云游戏、15 分钟、新手礼包或实名认证。

```js
function renderFreeDownloadList(){
  document.getElementById('freeDownloadGrid').innerHTML=games.slice(4,10).map(function(game,index){
    var gameId='free_'+index;
    var ready=onboardingFlow.firstPlayStage==='content_ready'&&onboardingFlow.firstPlayGameId===gameId;
    return '<article class="library-game">'+
      '<img src="'+game.cover+'" alt="">'+
      '<div><strong>'+game.name+'</strong><span>Free · '+(1.4+index*.5).toFixed(1)+' GB</span></div>'+
      '<button type="button" data-action="'+(ready?'free-download-launch':'download-select')+'" data-game-id="'+gameId+'">'+(ready?'Launch':'Download')+'</button>'+
    '</article>';
  }).join('');
}

function openFreeDownloadList(){
  onboardingFlow.firstPlayPath='free_download';
  onboardingFlow.firstPlayStage=onboardingFlow.firstPlayStage||'selected';
  saveOnboardingFlow();
  renderFreeDownloadList();
  switchPage('pageFreeDownload');
}

var pendingDownloadGameId=null;
function openDownloadConfirm(gameId){
  pendingDownloadGameId=gameId;
  document.getElementById('downloadGameName').textContent='Download this game?';
  document.getElementById('downloadConfirm').hidden=false;
}

function confirmFreeDownload(){
  if(!pendingDownloadGameId) return;
  setFirstPlayStage('content_ready',pendingDownloadGameId);
  document.getElementById('downloadConfirm').hidden=true;
  pendingDownloadGameId=null;
  renderFreeDownloadList();
}

FIRST_PLAY_ERRORS.download_failed=['freeDownloadError','Download failed. Check your network or storage and try again.'];
```

在委托点击处理器加入：

```js
var downloadSelect=event.target.closest('[data-action="download-select"]');
if(downloadSelect) openDownloadConfirm(downloadSelect.dataset.gameId);
if(event.target.closest('[data-action="download-confirm"]')) confirmFreeDownload();
if(event.target.closest('[data-action="download-cancel"]')){
  pendingDownloadGameId=null;
  document.getElementById('downloadConfirm').hidden=true;
}
var freeLaunch=event.target.closest('[data-action="free-download-launch"]');
if(freeLaunch) markPlayable('free_download',freeLaunch.dataset.gameId);
```

- [ ] **Step 4: 增加可控横竖屏容器和控制项**

```html
<button class="cp-btn" data-orientation="portrait">竖屏</button>
<button class="cp-btn" data-orientation="landscape">横屏</button>
```

```css
.phone[data-orientation="portrait"]{width:390px;height:844px}
.phone[data-orientation="landscape"]{width:960px;height:432px;border-radius:16px}
.phone[data-orientation="landscape"] .start-method-body{padding:42px 44px 24px}
.phone[data-orientation="landscape"] .first-play-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.phone[data-orientation="landscape"] .first-play-options .opt-card{min-height:148px;align-items:flex-start}
.phone[data-orientation="landscape"] .home-result{padding:42px 48px 24px}
.phone[data-orientation="landscape"] .library-grid,.phone[data-orientation="landscape"] .free-download-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
```

```js
function setDemoOrientation(orientation){
  var phone=document.querySelector('.phone');
  phone.dataset.orientation=orientation;
  localStorage.setItem('gamehub_first_play_orientation',orientation);
}
```

初始化时恢复该值；旋转只改变布局，不调用 `switchPage()`、`resetAll()` 或清理路径状态。手柄焦点 DOM 顺序保持 Steam → 本地文件 → 暂无游戏 → 先逛首页。

- [ ] **Step 5: 补齐评审控制面板的页面快捷入口**

在现有 `.cp` 中加入可枚举入口，快捷入口只调用真实页面函数，不直接改 DOM：

```html
<button class="cp-btn" data-first-play-preview="start">资产分流</button>
<button class="cp-btn" data-first-play-preview="steam_login">Steam 登录</button>
<button class="cp-btn" data-first-play-preview="steam_library">Steam 游戏库</button>
<button class="cp-btn" data-first-play-preview="local_import">本地导入</button>
<button class="cp-btn" data-first-play-preview="instant_play">国内秒玩</button>
<button class="cp-btn" data-first-play-preview="home_continue">首页续接</button>
<button class="cp-btn" data-first-play-preview="overseas_free">海外免费游戏</button>
```

```js
function previewFirstPlayScenario(scenario){
  if(scenario==='start') return previewStartMethod();
  if(scenario==='steam_login') return chooseFirstPlayPath('steam');
  if(scenario==='steam_library'){onboardingFlow.firstPlayPath='steam';setFirstPlayStage('content_ready');renderSteamLibrary();return switchPage('pageSteamLibrary');}
  if(scenario==='local_import'){onboardingFlow.firstPlayPath='local_file';return showScan();}
  if(scenario==='instant_play'){isOverseas=false;applyRegionPresentation();onboardingFlow.firstPlayPath='no_asset';return goNewUserDirect();}
  if(scenario==='home_continue') return showHomeResult('preview');
  if(scenario==='overseas_free'){isOverseas=true;applyRegionPresentation();return openFreeDownloadList();}
}

var previewButton=event.target.closest('[data-first-play-preview]');
if(previewButton) previewFirstPlayScenario(previewButton.dataset.firstPlayPreview);
```

- [ ] **Step 6: 运行海外和横屏验证**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs
```

Expected: 海外免费游戏下载、禁止云游戏文案和横屏状态保持均通过。

- [ ] **Step 7: 提交市场与响应式适配**

```powershell
git add -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --cached --check
git commit -m "feat: add overseas and landscape first-play flows"
```

### Task 6: 自动化全链路与严格视觉证据

**Files:**

- Modify: `tools/verify-segmented-first-play-onboarding.mjs`
- Modify: `demos/新手首玩按游戏资产分流demo.html`
- Generate, do not commit: `test-results/segmented-first-play-onboarding/*.png`

- [ ] **Step 1: 将验证器改为失败时也可靠关闭浏览器**

在第一个浏览器操作 `await page.goto(...)` 前插入 `try {`，并用以下内容替换文件末尾的关闭逻辑：

```js
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
  console.log('PASS segmented first-play onboarding');
} finally {
  await browser.close();
}
```

- [ ] **Step 2: 增加完整事件、持久化和异常断言**

`eventSnapshots` 已在 Task 3 创建，并在 Task 3/5 每条路径结束时赋值；每次赋值必须紧跟对应路径断言，不能在下一次 `resetJourney()` 后读取。最终至少断言：

```js
assert.equal(eventSnapshots.steam.filter(event => event.name==='playable_ready' && event.path==='steam').length, 1);
assert.equal(eventSnapshots.local_file.filter(event => event.name==='playable_ready' && event.path==='local_file').length, 1);
assert.equal(eventSnapshots.instant_play.filter(event => event.name==='playable_ready' && event.path==='instant_play').length, 1);
assert.equal(eventSnapshots.free_download.filter(event => event.name==='playable_ready' && event.path==='free_download').length, 1);
assert.equal(Object.values(eventSnapshots).flat().some(event => event.name==='playable_ready' && ['login','scan','import','download'].includes(event.stage)), false);
assert.deepEqual(
  eventSnapshots.steam.map(event => event.name).filter(name => ['onboarding_start_method_view','onboarding_start_method_select','first_play_path_view','first_play_stage_result','game_launch_request','playable_ready'].includes(name)),
  ['onboarding_start_method_view','onboarding_start_method_select','first_play_path_view','first_play_stage_result','game_launch_request','playable_ready']
);
const saved=await page.evaluate(() => JSON.parse(localStorage.getItem('gamehub_first_play_onboarding_v1')));
assert.equal(saved.firstPlayCompleted, true);
assert.equal(saved.firstPlayStage, 'playable');
```

用以下实际断言覆盖登录失败、空库、权限拒绝、扫描无结果、下载失败和启动失败，确认均不会误产出 `playable_ready`：

```js
for(const code of ['steam_login_failed','steam_library_empty','permission_denied','scan_empty','download_failed','instant_launch_failed']){
  await page.evaluate(() => { window.demoEvents=[]; });
  await page.evaluate(errorCode => showFirstPlayError(errorCode),code);
  const failureEvents=await page.evaluate(() => window.demoEvents.map(event => ({...event})));
  assert.equal(failureEvents.some(event => event.name==='playable_ready'),false,`${code} 不得记为可玩成功`);
  assert.equal(failureEvents.at(-1).failure_reason,code);
}
```

下载取消单独断言弹窗关闭、阶段仍为 `selected`；返回重选单独断言页面回到 `#pageStartMethod`、没有新增 `playable_ready`：

```js
await resetJourney();
await page.locator('#regionBtn').click();
await page.locator('[data-action="start-new-user"]').click();
await page.locator('[data-onboarding-source-code="youtube"]').click();
await page.locator('[data-action="submit-onboarding-source"]').click();
await page.locator('[data-first-play-path="no_asset"]').click();
await page.locator('[data-action="download-select"]').first().click();
await page.locator('[data-action="download-cancel"]').click();
assert.equal(await page.locator('#downloadConfirm').isHidden(),true);
assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('gamehub_first_play_onboarding_v1')))).firstPlayStage,'selected');
await page.locator('[data-action="return-to-paths"]').click();
assert.equal(await page.locator('#pageStartMethod.active').count(),1);
assert.equal((await page.evaluate(() => window.demoEvents)).some(event => event.name==='playable_ready'),false);
```

- [ ] **Step 3: 输出八张固定视口截图**

在 `--capture` 时创建目录并输出：

```js
const capture=process.argv.includes('--capture');
const evidenceDir = path.join(root, 'test-results', 'segmented-first-play-onboarding');
fs.mkdirSync(evidenceDir, { recursive: true });

async function capturePhone(name){
  await page.locator('.phone').screenshot({path:path.join(evidenceDir,name)});
}
```

将以下调用分别放在对应页面已经通过断言、尚未执行下一次点击的位置；不能集中放在文件末尾：

```js
if(capture) await capturePhone('01-start-method-domestic-portrait.png');
if(capture) await capturePhone('02-steam-library-portrait.png');
if(capture) await capturePhone('03-local-import-portrait.png');
if(capture) await capturePhone('04-instant-play-portrait.png');
if(capture) await capturePhone('05-home-continue-portrait.png');
if(capture) await capturePhone('06-start-method-domestic-landscape.png');
if(capture) await capturePhone('07-home-continue-landscape.png');
if(capture) await capturePhone('08-free-download-overseas-landscape.png');
```

对应位置依次为：国内资产首屏、Steam 个人库、扫描结果、国内秒玩列表、国内首页续接、横屏资产首屏、横屏首页续接、横屏海外免费下载列表。

截图前必须通过页面动作进入目标状态，不得直接改 DOM 伪造结果。

- [ ] **Step 4: 运行完整自动化验证**

Run:

```powershell
node tools/verify-segmented-first-play-onboarding.mjs --capture
```

Expected: `PASS segmented first-play onboarding`，目录中恰好存在 8 张非空 PNG，控制台无 `pageerror`。

- [ ] **Step 5: 使用 gamehub-app-ui 做视觉对照并逐页修正**

按以下配对进行原稿/实现对照：

| 实现截图 | 原稿基线 | 验收重点 |
|---|---|---|
| `01-start-method-domestic-portrait.png` | `02-新用户欢迎页.png`、`04-导入或绑定Steam.png` | 状态栏、安全区、标题层级、暗色渐变、卡片圆角与间距 |
| `02-steam-library-portrait.png` | `19-游戏库-Steam.png` | 顶栏、Tab、封面比例、列表密度、Steam 语义 |
| `03-local-import-portrait.png` | `22-导入游戏.png` | 导入入口、文件卡片、按钮位置、错误/成功状态 |
| `04-instant-play-portrait.png` | `03-新手选游戏.png`、`11-玩游戏-云游戏.png` | 游戏封面、行高、“秒玩”按钮、查看更多位置 |
| `05-home-continue-portrait.png` | `08-竖版首页.png` | 首页原结构不被首玩续接破坏，“继续”只占一个现有组件位置 |
| `06-start-method-domestic-landscape.png` | `41-掌机模式-游戏库.png` | 横屏安全区、手柄焦点、信息密度和三卡并列 |
| `07-home-continue-landscape.png` | `36-掌机模式-首页.png` | 导航、首屏主视觉和续接层级 |
| `08-free-download-overseas-landscape.png` | `41-掌机模式-游戏库.png` | 免费游戏列表布局、下载信息、无云游戏内容 |

每页先把未改动区域还原到原稿，再融合新增内容。几何误差目标为按视口等比缩放后不超过 4 px；字体、色彩、阴影、圆角、图片比例和视觉层级需肉眼达到 95% 以上。发现偏差就修改 HTML/CSS、重跑 `--capture` 并重新查看，不以“功能可点击”替代视觉验收。

- [ ] **Step 6: 做最终范围与占位符检查**

Run:

```powershell
rg -n "TBD|TODO|我是新手，想先看看|我有游戏想玩|以后再说|15 分钟" -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --check -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git status --short -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
```

Expected:

- 不含 `TBD`、`TODO` 和三条旧身份式文案。
- `15 分钟` 只存在于国内文案和国内测试，不出现在海外容器。
- 目标文件的 `git diff --check` 无输出。
- 目标文件状态只包含本计划明确的 Demo 与验证器；忽略并保留工作区其他既有改动，`test-results` 证据不提交。

- [ ] **Step 7: 提交最终视觉与验证修正**

```powershell
git add -- 'demos/新手首玩按游戏资产分流demo.html' 'tools/verify-segmented-first-play-onboarding.mjs'
git diff --cached --check
git commit -m "test: verify segmented first-play experience"
```

- [ ] **Step 8: 交付评审，不提前修改 PRD**

交付内容必须包含：

1. Demo 的本地预览地址和文件链接。
2. 8 张视觉证据的文件链接。
3. 自动化命令及 PASS 结果。
4. 本计划产生的所有 Git Commit SHA。
5. 与原稿仍存在的可见差异；没有证据时不得声称达到 95%。
6. 用户确认 Demo 后，再为 PRD 修订、固定提交图片链接和飞书同步创建下一份独立计划。

## 3. 最终验收清单

- [ ] 新 Demo 文件独立存在，旧 Demo 与 brainstorm 文件未被覆盖。
- [ ] 国内首屏为 Steam、本地文件、15 分钟免费玩三个资产选项，“先逛逛首页”为弱入口。
- [ ] 海外首屏第三项为免费游戏下载，任何海外页面均无秒玩、15 分钟、礼包和实名认证。
- [ ] Steam、本地文件、国内秒玩和海外免费下载均能走到 `playable_ready`。
- [ ] 登录、扫描、导入、下载和点击启动等中间状态不会误记首次成功。
- [ ] 首页只复用一个“继续”组件，并按最近未完成路径恢复；首玩成功后恢复现有继续游戏逻辑。
- [ ] 切后台模拟、刷新和横竖屏切换不丢失路径、阶段或当前页面语义。
- [ ] 异常状态均可重试或返回换路，不新增强制弹窗或任务系统。
- [ ] Playwright 全链路验证通过，页面无 JavaScript 错误。
- [ ] 8 张截图逐页对照实机图，并有足够证据支持视觉还原结论。
