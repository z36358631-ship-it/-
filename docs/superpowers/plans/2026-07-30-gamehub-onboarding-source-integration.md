# GameHub 新用户来源采集并入新手引流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将新用户来源单选页插入新手引流的用户类型选择与分支流程之间，删除新用户24小时后的手动选游戏问卷，同时保留并修正非新用户“选游戏＋来源”的独立步骤状态。

**Architecture:** `新手引导完整链路demo.html` 负责新用户的用户类型、来源、分支和永久免弹状态；`个性化推荐采集demo.html` 只负责非新用户按缺失步骤展示游戏选择和来源采集。两端共享稳定来源枚举，但分别保存流程状态；来源答案与兴趣画像、客观安装归因分开。静态合同、两个 Playwright 脚本和 PRD 一致性脚本承担回归，截图通过干净远端历史中的固定 Git SHA 发布。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、LocalStorage、Node.js 24、`node:assert`、`node:vm`、`playwright-core`、Markdown PRD、GitHub Pages、jsDelivr

---

## 文件结构

**修改文件：**

- `demos/新手引导完整链路demo.html`：新增新用户来源页、来源状态、断点恢复、离线补报和永久免弹标记。
- `demos/用户与设置/个性化推荐采集demo.html`：删除新用户24小时场景，仅保留非新用户问卷，并让游戏和来源步骤独立判断。
- `tools/verify-personalization-acquisition-wizard.mjs`：更新静态行为合同。
- `tools/verify-personalization-acquisition-wizard-ui.mjs`：更新非新用户问卷真实交互验收。
- `tools/capture-personalization-acquisition-wizard.mjs`：生成新链路 PRD 证据图。
- `prd/【Prd】《盖世游戏》个性化推荐需求.md`：增加 V1.4，覆盖新用户24小时规则。
- `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`：增加 V1.4，在原新手引流表中加入来源页。
- `tools/verify-personalization-acquisition-prd.mjs`：校验两份 PRD 的 V1.4 规则、表内图片和固定提交地址。

**新增文件：**

- `tools/verify-onboarding-source-integration-ui.mjs`：验证新用户来源页、分支恢复、离线和国内海外。
- `public/prd/personalization-acquisition-onboarding-v2/01-onboarding-user-type.png`
- `public/prd/personalization-acquisition-onboarding-v2/02-onboarding-source-cn.png`
- `public/prd/personalization-acquisition-onboarding-v2/03-onboarding-source-overseas.png`
- `public/prd/personalization-acquisition-onboarding-v2/04-onboarding-source-resume.png`
- `public/prd/personalization-acquisition-onboarding-v2/05-existing-game-step.png`
- `public/prd/personalization-acquisition-onboarding-v2/06-existing-source-step.png`

**不修改：**

- 新手引流原有国内秒玩、海外引导图、导入扫描和 Steam 绑定业务内容。
- 国内、海外现有6个来源展示项及稳定枚举。
- 客观安装归因、UTM、应用商店和广告平台数据。
- 通用运营广告位。

---

### Task 1: 将静态合同改成新用户引流内采集

**Files:**

- Modify: `tools/verify-personalization-acquisition-wizard.mjs`
- Test: `demos/新手引导完整链路demo.html`
- Test: `demos/用户与设置/个性化推荐采集demo.html`

- [ ] **Step 1: 先修改静态合同并让旧 Demo 失败**

将 `onboardingBridge()` 替换为：

```js
function onboardingSource() {
  requireTokens(onboarding, [
    'id="pageSource"',
    'gamehub_onboarding_source_v2',
    'onboarding_user_type_pending',
    'onboarding_source_pending',
    'onboarding_source_saved',
    'onboarding_branch_in_progress',
    'manual_interest_exempt',
    'data-onboarding-source-code',
    'submitOnboardingSource',
    'restoreOnboardingFlow',
    'other_or_unknown',
    'Where did you first hear about GameHub?',
  ], 'onboarding source');
  assert(!onboarding.includes('查看24小时后问卷'), 'onboarding still links to delayed wizard');
  assert(!onboarding.includes('满24小时后的首次合格冷启动'), 'obsolete delayed handoff remains');
  pass('onboardingSource');
}
```

将 `state()` 中的必需 token 改为：

```js
requireTokens(wizard, [
  'not_eligible',
  'pending',
  'game_step_in_progress',
  'game_completed',
  'game_skipped',
  'source_pending',
  'completed',
  'gameTerminal',
  'sourceTerminal',
  'manualInterestExempt',
  'nextMissingStep',
  'saveWizardState',
  'restoreWizardState',
  'mergeIdentityState',
  'sync_pending',
  'eligibleColdStart',
  'window.PersonalizationWizard',
], 'state machine');
assert(!wizard.includes('new_under_24h'), 'obsolete new-user 24h persona remains');
assert(!wizard.includes('new_eligible'), 'obsolete new-user eligible persona remains');
```

将任务表改为：

```js
const tasks = { shell, games, sources, state, onboardingSource, syntax };
```

- [ ] **Step 2: 运行静态合同并确认失败**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs
```

Expected: FAIL，提示新手引导缺少 `id="pageSource"` 或仍存在旧24小时文案。

- [ ] **Step 3: 提交失败合同**

```powershell
git add -- 'tools/verify-personalization-acquisition-wizard.mjs'
git commit -m "test(onboarding): define integrated source collection contract"
```

---

### Task 2: 在新手引流中实现来源页和断点状态

**Files:**

- Modify: `demos/新手引导完整链路demo.html`
- Test: `tools/verify-personalization-acquisition-wizard.mjs`

- [ ] **Step 1: 新增来源页样式**

在现有新手引流 CSS 的 `.manual-link` 后增加：

```css
.source-page-body{padding:72px 24px 32px;gap:18px}
.source-header{display:flex;flex-direction:column;gap:8px}
.source-back{width:32px;height:32px;border:1px solid var(--border-light);border-radius:50%;background:#141414;color:#fff;cursor:pointer}
.source-kicker{color:var(--gold);font-size:11px;letter-spacing:1.1px;text-transform:uppercase}
.source-title{font-size:24px;line-height:1.25;font-weight:650}
.source-desc{font-size:14px;color:var(--muted)}
.source-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.source-card{min-height:64px;padding:12px;border:1px solid var(--border);border-radius:var(--r-lg);background:rgba(22,22,22,.94);color:#fff;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px}
.source-card[aria-pressed="true"]{border-color:var(--gold);background:var(--gold-dim);box-shadow:0 0 0 1px rgba(255,204,67,.18)}
.source-icon{width:32px;height:32px;border-radius:10px;background:#242424;display:grid;place-items:center;font-weight:700}
.source-label{font-size:14px;font-weight:520}
.source-footer{margin-top:auto}
.source-submit{width:100%;height:48px;border:0;border-radius:var(--r-full);background:var(--gold);color:#111;font-weight:650;cursor:pointer}
.source-submit:disabled{background:#252525;color:#666;cursor:not-allowed}
.source-sync-note{min-height:20px;margin-top:10px;text-align:center;color:var(--muted);font-size:12px}
```

- [ ] **Step 2: 在 `page0` 与 `page1` 之间插入来源页**

使用以下完整结构：

```html
<div class="page" id="pageSource">
  <div class="page-body source-page-body">
    <button type="button" class="source-back" data-action="source-back" aria-label="返回">‹</button>
    <div class="onboarding-progress" aria-label="新手引流来源采集">
      <span class="is-active"></span><span class="is-active"></span><span></span>
    </div>
    <header class="source-header">
      <p class="source-kicker">Where did you hear about us?</p>
      <h2 class="source-title" id="onboardingSourceTitle">你最早是从哪里了解到盖世游戏的？</h2>
      <p class="source-desc" id="onboardingSourceDesc">请选择最符合实际情况的一项</p>
    </header>
    <div class="source-grid" id="onboardingSourceGrid"></div>
    <footer class="source-footer">
      <button type="button" class="source-submit" data-action="submit-onboarding-source" disabled>请选择一项</button>
      <p class="source-sync-note" id="onboardingSourceSyncNote"></p>
    </footer>
  </div>
</div>
```

- [ ] **Step 3: 将首屏点击改为先保存用户类型**

把两张首屏卡片的点击事件改为：

```html
<div class="opt-card" onclick="startOnboarding('has_game')">
<div class="opt-card" onclick="startOnboarding('new_user')">
```

控制面板按钮改为：

```html
<button class="cp-btn" onclick="startOnboarding('has_game')">有游戏想玩</button>
<button class="cp-btn" onclick="startOnboarding('new_user')">新手入口</button>
<button class="cp-btn" onclick="previewSourcePage()">来源采集页</button>
```

删除“查看24小时后问卷”按钮。

- [ ] **Step 4: 增加来源配置和状态**

在 `var isOverseas=false;` 前插入：

```js
var ONBOARDING_SOURCE_KEY='gamehub_onboarding_source_v2';
var ONBOARDING_FLOW_STATES={
  USER_TYPE_PENDING:'onboarding_user_type_pending',
  SOURCE_PENDING:'onboarding_source_pending',
  SOURCE_SAVED:'onboarding_source_saved',
  BRANCH_IN_PROGRESS:'onboarding_branch_in_progress',
  COMPLETED:'onboarding_completed'
};
var ONBOARDING_SOURCE_OPTIONS={
  domestic:{
    title:'你最早是从哪里了解到盖世游戏的？',
    description:'请选择最符合实际情况的一项',
    optionVersion:'domestic_v1',
    options:[
      {code:'douyin',label:'抖音',icon:'抖'},
      {code:'bilibili',label:'哔哩哔哩',icon:'哔'},
      {code:'xiaohongshu',label:'小红书',icon:'红'},
      {code:'app_store',label:'应用商店',icon:'商'},
      {code:'friend_referral',label:'朋友推荐',icon:'友'},
      {code:'other_or_unknown',label:'其他／不记得',icon:'…'}
    ]
  },
  overseas:{
    title:'Where did you first hear about GameHub?',
    description:'Choose the option that best matches your experience.',
    optionVersion:'overseas_v1',
    options:[
      {code:'youtube',label:'YouTube',icon:'▶'},
      {code:'tiktok',label:'TikTok',icon:'♪'},
      {code:'reddit',label:'Reddit',icon:'R'},
      {code:'discord',label:'Discord',icon:'D'},
      {code:'friend_referral',label:'Friends',icon:'友'},
      {code:'other_or_unknown',label:'Other / I don’t remember',icon:'…'}
    ]
  }
};
var onboardingFlow={
  state:ONBOARDING_FLOW_STATES.USER_TYPE_PENDING,
  userType:null,
  market:'domestic',
  sourceCode:null,
  optionVersion:null,
  responseId:null,
  sourceSavedAt:null,
  syncStatus:null,
  manualInterestExempt:false
};
```

- [ ] **Step 5: 增加持久化、渲染和提交函数**

在 `switchPage()` 前加入：

```js
function saveOnboardingFlow(){
  localStorage.setItem(ONBOARDING_SOURCE_KEY,JSON.stringify(onboardingFlow));
}

function loadOnboardingFlow(){
  var saved=JSON.parse(localStorage.getItem(ONBOARDING_SOURCE_KEY)||'null');
  if(saved) Object.assign(onboardingFlow,saved);
  return Boolean(saved);
}

function renderOnboardingSource(){
  var config=ONBOARDING_SOURCE_OPTIONS[isOverseas?'overseas':'domestic'];
  onboardingFlow.market=isOverseas?'overseas':'domestic';
  onboardingFlow.optionVersion=config.optionVersion;
  document.getElementById('onboardingSourceTitle').textContent=config.title;
  document.getElementById('onboardingSourceDesc').textContent=config.description;
  document.getElementById('onboardingSourceGrid').innerHTML=config.options.map(function(option){
    var selected=onboardingFlow.sourceCode===option.code;
    return '<button type="button" class="source-card" data-onboarding-source-code="'+option.code+'" aria-pressed="'+selected+'">'+
      '<span class="source-icon">'+option.icon+'</span><span class="source-label">'+option.label+'</span></button>';
  }).join('');
  var submit=document.querySelector('[data-action="submit-onboarding-source"]');
  submit.disabled=!onboardingFlow.sourceCode;
  submit.textContent=onboardingFlow.sourceCode?'继续':'请选择一项';
}

function startOnboarding(userType){
  onboardingFlow.userType=userType;
  onboardingFlow.state=ONBOARDING_FLOW_STATES.SOURCE_PENDING;
  saveOnboardingFlow();
  renderOnboardingSource();
  switchPage('pageSource');
}

function selectOnboardingSource(code){
  onboardingFlow.sourceCode=code;
  saveOnboardingFlow();
  renderOnboardingSource();
}

function submitOnboardingSource(){
  if(!onboardingFlow.sourceCode) return;
  onboardingFlow.state=ONBOARDING_FLOW_STATES.SOURCE_SAVED;
  onboardingFlow.responseId=onboardingFlow.responseId||('source_'+Date.now());
  onboardingFlow.sourceSavedAt=new Date().toISOString();
  onboardingFlow.syncStatus=navigator.onLine?'synced':'sync_pending';
  onboardingFlow.manualInterestExempt=true;
  saveOnboardingFlow();
  continueOnboardingBranch();
}

function continueOnboardingBranch(){
  onboardingFlow.state=ONBOARDING_FLOW_STATES.BRANCH_IN_PROGRESS;
  saveOnboardingFlow();
  if(onboardingFlow.userType==='has_game') goStep1Direct();
  else if(isOverseas) goNewUserOverseasDirect();
  else goNewUserDirect();
}

function restoreOnboardingFlow(){
  if(!loadOnboardingFlow()) return false;
  isOverseas=onboardingFlow.market==='overseas';
  if(onboardingFlow.state===ONBOARDING_FLOW_STATES.SOURCE_PENDING){
    renderOnboardingSource();
    switchPage('pageSource');
    return true;
  }
  if(onboardingFlow.state===ONBOARDING_FLOW_STATES.SOURCE_SAVED||onboardingFlow.state===ONBOARDING_FLOW_STATES.BRANCH_IN_PROGRESS){
    continueOnboardingBranch();
    return true;
  }
  return false;
}
```

- [ ] **Step 6: 将分支函数拆成来源页前后两个入口**

替换原 `goStep1()`、`goNewUser()` 和 `handleNewUser()`：

```js
function goStep1(){startOnboarding('has_game')}
function handleNewUser(){startOnboarding('new_user')}
function goStep1Direct(){switchPage('page1')}
function goStep2(){switchPage('page2')}
function goNewUserDirect(){
  switchPage('page2');
  var overlay=document.getElementById('giftOverlay');
  overlay.classList.add('show');
  setTimeout(function(){overlay.classList.remove('show')},2000);
}
function goNewUserOverseasDirect(){switchPage('page2b')}
function previewSourcePage(){
  onboardingFlow.userType=onboardingFlow.userType||'new_user';
  onboardingFlow.state=ONBOARDING_FLOW_STATES.SOURCE_PENDING;
  renderOnboardingSource();
  switchPage('pageSource');
}
```

- [ ] **Step 7: 绑定来源页事件并完成断点恢复**

在脚本末尾 `resetAll()` 前加入：

```js
document.addEventListener('click',function(event){
  var sourceCard=event.target.closest('[data-onboarding-source-code]');
  if(sourceCard) selectOnboardingSource(sourceCard.dataset.onboardingSourceCode);
  if(event.target.closest('[data-action="submit-onboarding-source"]')) submitOnboardingSource();
  if(event.target.closest('[data-action="source-back"]')){
    onboardingFlow.state=ONBOARDING_FLOW_STATES.USER_TYPE_PENDING;
    saveOnboardingFlow();
    switchPage('page0');
  }
});
window.addEventListener('online',function(){
  if(onboardingFlow.syncStatus==='sync_pending'){
    onboardingFlow.syncStatus='synced';
    saveOnboardingFlow();
  }
});
```

在 `renderGameList();` 后调用：

```js
restoreOnboardingFlow();
```

- [ ] **Step 8: 更新完成记录和重置**

把 `recordOnboardingCompletion()` 改为：

```js
function recordOnboardingCompletion(path){
  onboardingFlow.state=ONBOARDING_FLOW_STATES.COMPLETED;
  onboardingFlow.manualInterestExempt=true;
  saveOnboardingFlow();
  var handoff={
    onboarding_completed_at:new Date().toISOString(),
    onboarding_path:path,
    source_code:onboardingFlow.sourceCode,
    source_response_id:onboardingFlow.responseId,
    manual_interest_exempt:true,
    next_rule:'behavior_profile_only'
  };
  localStorage.setItem(ONBOARDING_HANDOFF_KEY,JSON.stringify(handoff));
  return handoff;
}
```

将完成页说明改为：

```html
<p class="handoff-note">新手引流已完成；后续推荐将根据启动、导入和 Steam 游戏库等实际行为生成。</p>
```

将 `resetAll()` 改为：

```js
function resetAll(){
  localStorage.removeItem(ONBOARDING_SOURCE_KEY);
  Object.assign(onboardingFlow,{
    state:ONBOARDING_FLOW_STATES.USER_TYPE_PENDING,
    userType:null,
    market:isOverseas?'overseas':'domestic',
    sourceCode:null,
    optionVersion:null,
    responseId:null,
    sourceSavedAt:null,
    syncStatus:null,
    manualInterestExempt:false
  });
  switchPage('page0');
}
```

- [ ] **Step 9: 运行静态合同**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs onboardingSource
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS onboardingSource
PASS syntax
```

- [ ] **Step 10: 提交新手引流来源页**

```powershell
git add -- 'demos/新手引导完整链路demo.html'
git commit -m "feat(onboarding): collect acquisition source before branch"
```

---

### Task 3: 将个性化问卷限定为非新用户并拆分步骤终态

**Files:**

- Modify: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `tools/verify-personalization-acquisition-wizard.mjs`

- [ ] **Step 1: 更新说明和模拟人群**

将面板说明改为：

```html
<p class="panel-summary">新用户来源已并入新手引流；本页只演示非新用户按缺失状态完成选游戏与来源。</p>
```

将人群下拉框改为：

```html
<select id="personaSelect">
  <option value="existing_full">非新用户 · 游戏与来源均待答</option>
  <option value="existing_source_only">非新用户 · 仅来源待答</option>
  <option value="existing_game_only">非新用户 · 仅游戏待答</option>
  <option value="source_resume">来源步骤中断恢复</option>
  <option value="completed">历史已完成 · 不再展示</option>
  <option value="new_exempt">新用户 · 已由新手引流处理</option>
</select>
```

- [ ] **Step 2: 扩展状态字段**

在 `state` 中移除 `onboarding_completed_at`，增加：

```js
gameTerminal: null,
sourceTerminal: false,
manualInterestExempt: false,
entryGroup: 'existing_user_recall',
```

在 `serializableState()` 返回值中同步增加这4个字段。

- [ ] **Step 3: 增加缺失步骤判断**

在 `mergeIdentityState()` 后新增：

```js
function nextMissingStep(){
  if(state.manualInterestExempt) return null;
  if(!state.gameTerminal) return 'game';
  if(!state.sourceTerminal) return 'source';
  return null;
}

function finishOrContinue(){
  var next=nextMissingStep();
  if(next){
    state.status=next==='game'?WIZARD_STATES.GAME_IN_PROGRESS:WIZARD_STATES.SOURCE_PENDING;
    showStep(next);
    return;
  }
  state.status=WIZARD_STATES.COMPLETED;
  showStep('result');
}
```

- [ ] **Step 4: 让游戏提交和跳过只结束游戏步骤**

在原游戏提交成功位置写入：

```js
state.gameTerminal='submitted';
state.status=WIZARD_STATES.GAME_COMPLETED;
saveWizardState();
finishOrContinue();
```

在原跳过位置写入：

```js
state.selectedGameIds.clear();
state.gameTerminal='skipped';
state.status=WIZARD_STATES.GAME_SKIPPED;
saveWizardState();
finishOrContinue();
```

- [ ] **Step 5: 让来源提交只结束来源步骤**

在来源本地可靠保存后增加：

```js
state.sourceTerminal=true;
state.entryGroup='existing_user_recall';
saveWizardState();
finishOrContinue();
```

保留离线时 `syncStatus='sync_pending'` 和联网补报逻辑。

- [ ] **Step 6: 替换触发判断和模拟人群**

将 `eligibleColdStart()` 改为：

```js
function eligibleColdStart(input){
  if(!input.isColdStart) return false;
  if(!input.complianceFinished||input.hasHigherPriorityLayer) return false;
  if(!input.featureEnabled||!input.inVersionRange||!input.inRollout) return false;
  if(input.userType==='new'||input.manualInterestExempt) return false;
  return input.status!==WIZARD_STATES.COMPLETED;
}
```

将 `applyPersonaScenario()` 改为：

```js
function applyPersonaScenario(persona){
  resetStateModel();
  if(persona==='existing_source_only'){
    state.gameTerminal='historical_profile';
    state.status=WIZARD_STATES.SOURCE_PENDING;
    state.step='source';
  }else if(persona==='existing_game_only'){
    state.sourceTerminal=true;
    state.sourceCode='friend_referral';
    state.sourceSavedAt=new Date().toISOString();
    state.syncStatus='synced';
    state.status=WIZARD_STATES.GAME_IN_PROGRESS;
    state.step='game';
  }else if(persona==='source_resume'){
    state.gameTerminal='submitted';
    state.status=WIZARD_STATES.SOURCE_PENDING;
    state.step='source';
    state.selectedGameIds=new Set(['black_myth_wukong','elden_ring','it_takes_two']);
    state.sourceCode='friend_referral';
  }else if(persona==='completed'){
    state.gameTerminal='submitted';
    state.sourceTerminal=true;
    state.status=WIZARD_STATES.COMPLETED;
    state.step='result';
    state.sourceCode='friend_referral';
    state.sourceSavedAt=new Date().toISOString();
    state.syncStatus='synced';
  }else if(persona==='new_exempt'){
    state.manualInterestExempt=true;
    state.status=WIZARD_STATES.NOT_ELIGIBLE;
    state.step='result';
  }
  saveWizardState();
}
```

`simulateColdStart()` 使用 `nextMissingStep()` 决定展示页，并将 `new_exempt` 的结果文案设为：

```text
新用户来源已在新手引流处理；兴趣由实际行为生成，本页不再展示。
```

- [ ] **Step 7: 删除旧24小时连接**

删除常量 `ONBOARDING_HANDOFF_KEY`、状态字段 `onboarding_completed_at`、函数 `readOnboardingHandoff()`，以及 `applyPersonaScenario()`、`simulateColdStart()` 中对 `new_under_24h`、`new_eligible` 和滚动24小时的全部分支。对应的现有代码包括：

```js
const ONBOARDING_HANDOFF_KEY = "gamehub_onboarding_handoff_v1";

function readOnboardingHandoff() {
  return JSON.parse(localStorage.getItem(ONBOARDING_HANDOFF_KEY) || "null");
}
```

- [ ] **Step 8: 运行静态合同**

Run:

```powershell
node tools/verify-personalization-acquisition-wizard.mjs state
node tools/verify-personalization-acquisition-wizard.mjs shell
node tools/verify-personalization-acquisition-wizard.mjs syntax
```

Expected:

```text
PASS state
PASS shell
PASS syntax
```

- [ ] **Step 9: 提交非新用户问卷状态改造**

```powershell
git add -- 'demos/用户与设置/个性化推荐采集demo.html'
git commit -m "feat(personalization): scope wizard to existing users"
```

---

### Task 4: 增加新手来源页和非新用户问卷真实交互验收

**Files:**

- Create: `tools/verify-onboarding-source-integration-ui.mjs`
- Modify: `tools/verify-personalization-acquisition-wizard-ui.mjs`
- Test: `demos/新手引导完整链路demo.html`
- Test: `demos/用户与设置/个性化推荐采集demo.html`

- [ ] **Step 1: 创建新手引流来源页 Playwright 验收**

新文件使用以下核心流程：

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'demos','新手引导完整链路demo.html');
const executablePath=[
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync);
assert(executablePath,'Local Chrome not found');

const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1180,height:940}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.goto(pathToFileURL(file).href);
await page.evaluate(()=>localStorage.clear());
await page.reload();

await page.locator('#page0 .opt-card').first().click();
assert.equal(await page.locator('#pageSource.active').count(),1);
assert.equal(await page.locator('[data-onboarding-source-code]').count(),6);
assert.equal(await page.locator('[data-action="submit-onboarding-source"]').isDisabled(),true);
assert.equal(await page.locator('[data-action="skip-onboarding-source"]').count(),0);

await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.reload();
assert.equal(await page.locator('#pageSource.active').count(),1);
assert.equal(
  await page.locator('[data-onboarding-source-code="friend_referral"]').getAttribute('aria-pressed'),
  'true'
);

await page.locator('[data-action="submit-onboarding-source"]').click();
assert.equal(await page.locator('#page1.active').count(),1);
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gamehub_onboarding_source_v2')));
assert.equal(saved.userType,'has_game');
assert.equal(saved.sourceCode,'friend_referral');
assert.equal(saved.manualInterestExempt,true);

await page.reload();
assert.equal(await page.locator('#page1.active').count(),1);

await page.evaluate(()=>localStorage.clear());
await page.reload();
await page.locator('#regionBtn').click();
await page.locator('#page0 .opt-card').nth(1).click();
assert((await page.locator('#onboardingSourceTitle').innerText()).includes('GameHub'));
assert.equal(await page.locator('[data-onboarding-source-code="youtube"]').count(),1);
assert.equal((await page.locator('body').innerText()).includes('GaishiGame'),false);

assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS onboardingSourceUi');
```

- [ ] **Step 2: 更新非新用户 Playwright 验收**

删除两个24小时 `eligibleColdStart()` 断言，改为：

```js
const newUserEligible=await page.evaluate(()=>window.PersonalizationWizard.eligibleColdStart({
  isColdStart:true,
  complianceFinished:true,
  hasHigherPriorityLayer:false,
  featureEnabled:true,
  inVersionRange:true,
  inRollout:true,
  userType:'new',
  manualInterestExempt:true,
  status:'pending',
}));
assert.equal(newUserEligible,false,'new users must be handled only by onboarding');
```

增加“仅来源待答”和“仅游戏待答”：

```js
await page.selectOption('#personaSelect','existing_source_only');
await page.locator('[data-action="simulate-cold-start"]').click();
assert.equal(await page.locator('[data-wizard-step="source"].active').count(),1);

await page.selectOption('#personaSelect','existing_game_only');
await page.locator('[data-action="simulate-cold-start"]').click();
assert.equal(await page.locator('[data-wizard-step="game"].active').count(),1);
```

- [ ] **Step 3: 运行交互验收**

Run:

```powershell
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard-ui.mjs
```

Expected:

```text
PASS onboardingSourceUi
PASS wizardUi
```

- [ ] **Step 4: 提交交互验收**

```powershell
git add -- 'tools/verify-onboarding-source-integration-ui.mjs' 'tools/verify-personalization-acquisition-wizard-ui.mjs'
git commit -m "test(personalization): cover onboarding source integration"
```

---

### Task 5: 生成新的 PRD 证据截图

**Files:**

- Modify: `tools/capture-personalization-acquisition-wizard.mjs`
- Create: `public/prd/personalization-acquisition-onboarding-v2/*.png`

- [ ] **Step 1: 修改截图输出目录和场景**

将输出目录改为：

```js
const output=path.join(root,'public','prd','personalization-acquisition-onboarding-v2');
```

按以下顺序截图：

```js
const onboardingUrl=pathToFileURL(path.join(root,'demos','新手引导完整链路demo.html')).href;
await page.goto(onboardingUrl);
await page.evaluate(()=>localStorage.clear());
await page.reload();
await page.locator('.phone').screenshot({path:path.join(output,'01-onboarding-user-type.png')});

await page.locator('#page0 .opt-card').first().click();
await page.locator('.phone').screenshot({path:path.join(output,'02-onboarding-source-cn.png')});

await page.evaluate(()=>localStorage.clear());
await page.reload();
await page.locator('#regionBtn').click();
await page.locator('#page0 .opt-card').nth(1).click();
await page.locator('.phone').screenshot({path:path.join(output,'03-onboarding-source-overseas.png')});

await page.locator('[data-onboarding-source-code="friend_referral"]').click();
await page.reload();
await page.locator('.phone').screenshot({path:path.join(output,'04-onboarding-source-resume.png')});

const wizardUrl=pathToFileURL(path.join(root,'demos','用户与设置','个性化推荐采集demo.html')).href;
await page.goto(wizardUrl);
await page.evaluate(()=>localStorage.clear());
await page.reload();
await page.locator('.phone').screenshot({path:path.join(output,'05-existing-game-step.png')});

await page.selectOption('#personaSelect','existing_source_only');
await page.locator('[data-action="simulate-cold-start"]').click();
await page.locator('.phone').screenshot({path:path.join(output,'06-existing-source-step.png')});
```

- [ ] **Step 2: 生成截图**

Run:

```powershell
node tools/capture-personalization-acquisition-wizard.mjs
```

Expected: 生成6张 PNG。

- [ ] **Step 3: 检查格式和尺寸**

Run:

```powershell
$env:TASK_ASSET_DIR=(Resolve-Path 'public\prd\personalization-acquisition-onboarding-v2').Path
@'
import os
from pathlib import Path
from PIL import Image
root=Path(os.environ['TASK_ASSET_DIR'])
files=sorted(root.glob('*.png'))
assert len(files)==6
for file in files:
    with Image.open(file) as image:
        assert image.format=='PNG'
        assert image.size==(390,844)
        print(file.name,image.size)
'@ | python -
```

Expected: 6张均为 `390×844` PNG。

- [ ] **Step 4: 提交截图和脚本**

```powershell
git add -- 'tools/capture-personalization-acquisition-wizard.mjs' 'public/prd/personalization-acquisition-onboarding-v2'
git commit -m "test(personalization): capture onboarding source evidence"
```

---

### Task 6: 在干净远端历史中确定截图固定 SHA

**Files:**

- Test: Tasks 1-5 的提交

- [ ] **Step 1: 获取最新远端主线**

```powershell
git fetch origin master
```

- [ ] **Step 2: 创建干净 worktree**

确认目标目录不存在后执行：

```powershell
git worktree add -b codex/publish-onboarding-source-20260730 'C:\Users\z3635\官网改动\.tmp\publish-onboarding-source-20260730' refs/remotes/origin/master
```

- [ ] **Step 3: 按顺序摘取设计、计划和 Tasks 1-5 提交**

Run:

```powershell
$mainRepo='C:\Users\z3635\官网改动'
$commits=@(
  (git -C $mainRepo log -1 --format='%H' -- 'docs/superpowers/specs/2026-07-30-gamehub-personalization-acquisition-wizard-design.md'),
  (git -C $mainRepo log -1 --format='%H' -- 'docs/superpowers/plans/2026-07-30-gamehub-onboarding-source-integration.md'),
  (git -C $mainRepo log -1 --format='%H' --grep='^test(onboarding): define integrated source collection contract$'),
  (git -C $mainRepo log -1 --format='%H' --grep='^feat(onboarding): collect source before onboarding branches$'),
  (git -C $mainRepo log -1 --format='%H' --grep='^feat(personalization): scope wizard to existing users$'),
  (git -C $mainRepo log -1 --format='%H' --grep='^test(personalization): cover onboarding source integration$'),
  (git -C $mainRepo log -1 --format='%H' --grep='^test(personalization): capture onboarding source evidence$')
)
if($commits.Count -ne 7 -or $commits.Where({$_ -notmatch '^[0-9a-f]{40}$'}).Count){
  throw "未能唯一解析设计、计划或 Tasks 1-5 的提交"
}
git cherry-pick $commits
```

Expected: 依次摘取7个提交且无冲突；不得夹带其他工作区提交。

- [ ] **Step 4: 获取干净历史中的截图提交**

Run:

```powershell
$assetCommit=(git log -1 --format='%H' -- 'public/prd/personalization-acquisition-onboarding-v2')
if($assetCommit -notmatch '^[0-9a-f]{40}$'){
  throw "未找到包含6张截图的固定提交"
}
$assetCommit
```

Expected: 获得一个40位 `assetCommit`，该提交在待发布 `master` 的祖先链上。

---

### Task 7: 使用 to-prd 更新两份现有 PRD

**Files:**

- Modify: `prd/【Prd】《盖世游戏》个性化推荐需求.md`
- Modify: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`
- Modify: `tools/verify-personalization-acquisition-prd.mjs`

本任务开始前必须读取并使用 `to-prd` 技能、PRD模板、自查清单、国内海外差异和飞书 Markdown 规范。V1.4 内容写进原版本表、详细设计表、非功能表、埋点表和验收表，不在文档尾部增加脱离原结构的“补充说明”。

- [ ] **Step 1: 更新 PRD 校验合同**

校验脚本必须检查：

```js
for (const token of [
  '用户类型选择后',
  '来源单选、必答',
  'manual_interest_exempt',
  'behavior_profile_ready',
  'existing_user_recall',
  '不在24小时后',
  '游戏步骤和来源步骤独立',
  '稳定安装标识',
  '对照组',
  '来源影响组',
  '最终方案组',
  '首次有效价值行为率',
  '下降超过1—2个百分点',
]) assert(docs.includes(token), `PRD missing token: ${token}`);

assert(!docs.includes('新用户·完成引流未满24小时'), 'obsolete new-user scenario remains');
assert(!docs.includes('新用户·已满24小时'), 'obsolete new-user scenario remains');

const imagePattern=/https:\/\/cdn\.jsdelivr\.net\/gh\/z36358631-ship-it\/-@([0-9a-f]{40})\/public\/prd\/personalization-acquisition-onboarding-v2\/0[1-6]-[^)\s]+\.png/g;
const images=[...docs.matchAll(imagePattern)];
assert(images.length===6, `expected six V1.4 images, found ${images.length}`);
assert(new Set(images.map(match=>match[1])).size===1, 'V1.4 images must share one fixed commit');
```

所有包含 `personalization-acquisition-onboarding-v2` 的行必须以 `|` 开始和结束。

- [ ] **Step 2: 更新个性化推荐 PRD**

增加 V1.4 版本行，主要内容为：

```text
新用户来源采集并入新手引流，删除新用户24小时后的手动选游戏问卷；非新用户保留游戏与来源步骤并独立判断终态。
```

在原 C 端详细设计表中增加或更新三行：

```markdown
|模块名称|图示|展示&交互说明|
|---|---|---|
|V1.4 新用户处理|新手用户类型页与来源页截图|新用户不进入本问卷；来源在新手引流中完成，兴趣由启动、导入和Steam库等行为生成；无画像时使用兜底推荐。|
|非新用户游戏步骤|非新用户选游戏截图|只对游戏步骤缺失且未命中新用户永久免弹的目标用户展示；可选择3-9款或暂不选择。|
|非新用户来源步骤|非新用户来源截图|只对来源步骤缺失的目标用户展示；单选必答；历史回忆来源标记existing_user_recall。|
```

旧 V1.3 规则保留历史记录，但在冲突行明确标记“已由 V1.4 覆盖”，不得继续作为当前规则。

- [ ] **Step 3: 更新新手引导 PRD**

增加 V1.4 版本行，在新手引流 C 端详细设计表中加入：

```markdown
|来源采集页|用户类型选择完成后、进入对应分支前展示|单选、必答、默认不选中；国内海外各6项；本地保存成功后进入原分支；中断恢复来源页；来源已答后恢复原分支。|国内来源、海外来源、恢复状态截图|
```

删除当前规则中的24小时后问卷交接，改为：

```text
完成本版新手引流后写入 manual_interest_exempt，后续不再展示手动选游戏问卷；推荐根据启动、导入和Steam游戏库等实际行为生成。
```

- [ ] **Step 4: 将运营配置、三组试行和护栏指标写入原表**

在个性化推荐 PRD 原有后台配置表中写入以下当前规则，不新增通用运营广告位：

```markdown
|配置项|规则|
|---|---|
|总开关|控制问卷是否触发，不清除用户已完成状态。|
|市场|国内、海外分开配置。|
|目标版本|配置最低和最高适用版本。|
|目标用户|新用户来源页、非新用户游戏步骤、非新用户来源步骤分别开启。|
|灰度比例|使用稳定安装标识分桶；登录后同一账号保持实验组稳定。|
|生效时间|配置开始时间和结束时间。|
|来源选项|每个市场最多5个主要渠道加1个“其他／不记得”兜底项。|
|选项顺序|支持按市场调整展示顺序。|
|选项版本|修改枚举含义或选项集合时生成新的option_version；进行中的流程继续使用首次曝光版本。|
```

在原实验设计或验收表中写入：

```markdown
|分组|新用户来源页|后续选游戏页|验证目的|
|---|---|---|---|
|对照组|无|保留现有规则|提供当前引流、激活和推荐基线。|
|来源影响组|并入新手引流|保留现有规则|单独判断新增来源页对引流和激活的影响。|
|最终方案组|并入新手引流|删除|判断删除后续选游戏页对体验与推荐效果的影响。|
```

国内、海外分别按稳定安装标识分桶，至少覆盖完整7天获客周期并继续观察D7。`首次有效价值行为率`为主护栏；最终方案组相对对照组绝对值下降超过1—2个百分点时停止放量。同步记录来源有效覆盖率、来源页完成率、平均答题时间、“其他／不记得”占比、行为画像生成率、D1、D7、本地保存成功率、补报成功率和重复触发率。

- [ ] **Step 5: 使用干净历史截图 SHA 写入6个 URL**

在主工作区用 Task 6 得到的 `assetCommit` 生成：

```powershell
$base="https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$assetCommit/public/prd/personalization-acquisition-onboarding-v2"
```

六张图片按表格场景写入图示列，同一单元格多图使用 `<br>`。

- [ ] **Step 6: 运行 PRD 一致性校验**

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
git commit -m "docs(personalization): integrate new-user source into onboarding"
```

- [ ] **Step 8: 将 PRD 提交摘取到干净 worktree**

```powershell
$mainRepo='C:\Users\z3635\官网改动'
$prdCommit=(git -C $mainRepo log -1 --format='%H' --grep='^docs(personalization): integrate new-user source into onboarding$')
if($prdCommit -notmatch '^[0-9a-f]{40}$'){
  throw "未找到本次 PRD 提交"
}
git cherry-pick $prdCommit
```

Expected: 无冲突；干净分支 PRD 中的固定图片 SHA 与 Task 6 完全一致。

---

### Task 8: 全量回归、发布和在线验收

**Files:**

- Test: `demos/新手引导完整链路demo.html`
- Test: `demos/用户与设置/个性化推荐采集demo.html`
- Test: `prd/【Prd】《盖世游戏》个性化推荐需求.md`
- Test: `prd/ai生成/【Prd】《盖世游戏》新手引导分流需求.md`
- Test: `public/prd/personalization-acquisition-onboarding-v2/*.png`

- [ ] **Step 1: 在干净 worktree 运行全部测试**

```powershell
node tools/verify-personalization-acquisition-wizard.mjs
node tools/verify-onboarding-source-integration-ui.mjs
node tools/verify-personalization-acquisition-wizard-ui.mjs
node tools/verify-personalization-acquisition-prd.mjs
```

Expected:

```text
PASS shell
PASS games
PASS sources
PASS state
PASS onboardingSource
PASS syntax
PASS onboardingSourceUi
PASS wizardUi
PASS personalizationAcquisitionPrd
```

- [ ] **Step 2: 获取远端最新 master 并确认可快进**

```powershell
git fetch origin master
git merge-base --is-ancestor FETCH_HEAD HEAD
```

Expected: 退出码0。

- [ ] **Step 3: 推送**

```powershell
git push origin HEAD:master
```

禁止强推。

- [ ] **Step 4: 验证远端主线**

```powershell
git ls-remote origin refs/heads/master
```

Expected: 返回干净 worktree 的 `HEAD`。

- [ ] **Step 5: 逐张验证6个固定图片地址**

每张必须返回：

```text
200|image/png
```

- [ ] **Step 6: 验证两个在线 Demo**

```text
https://z36358631-ship-it.github.io/-/demos/新手引导完整链路demo.html
https://z36358631-ship-it.github.io/-/demos/用户与设置/个性化推荐采集demo.html
```

两个页面必须返回 HTTP 200 和 `text/html`。远端源码还必须分别包含：

```text
gamehub_onboarding_source_v2
manual_interest_exempt
existing_user_recall
```

- [ ] **Step 7: 最终交付**

交付中列出：

- 两个本地 Demo 和在线地址。
- 两份本地 PRD。
- 6张图片数量、固定图片提交 SHA、远程验证通过数。
- 静态、交互、PRD校验结果。
- 远端 `master` 最终提交。
