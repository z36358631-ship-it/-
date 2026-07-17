# 盖世游戏 Android 广告接入交互 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个高度复原盖世游戏 App、可在用户端与运营后台之间切换、覆盖六个广告场景和三页后台配置的单文件交互标注 Demo。

**Architecture:** 最终交付物是一个不使用 iframe 的自包含 HTML；页面内部由纯函数策略核心、共享演示状态、用户端渲染器、后台渲染器和标注面板组成。真实 App 截图由构建脚本转成 Data URL 写入 HTML，运营后台的草稿、发布、实验和统计与用户端共享同一状态，但国内与海外使用两套独立配置。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 24 标准库、PowerShell、Microsoft Edge Headless。

---

## 1. 文件结构

### 新建文件

- `demos/Android广告接入-交互标注版.html`：唯一可交付 Demo，包含三栏框架、六个用户场景、三个后台页面、状态、策略核心、标注与全部图片 Data URL。
- `tools/embed-android-ad-demo-assets.mjs`：读取四张基准截图，将其幂等写入 HTML 的资产区块。
- `tools/verify-android-ad-demo.mjs`：无第三方依赖的结构和策略回归脚本，抽取 HTML 内的数据与纯函数执行测试。

### 不修改文件

- `demos/index.html` 当前为未跟踪文件，不纳入本任务，避免覆盖用户目录整理工作。
- `prd/【PRD】《盖世游戏》Android广告接入需求.md` 和两份设计文档只作为输入，不在实现阶段改写。

### 工作区保护

仓库存在大量用户未提交改动。所有提交必须显式指定本任务文件，禁止 `git add -A`、`git add .` 和无路径的 `git commit --amend`。

## 2. 数据与接口约定

最终 HTML 暴露两个内部对象：

```js
window.AdDemoCore = {
  createState,
  evaluatePlacement,
  recordImpression,
  publishDraft,
  validateExperiment,
  completeReward
};

window.AdDemoApp = {
  switchSurface,
  switchRegion,
  navigate,
  setDraftField,
  saveDraft,
  publish,
  simulateOutcome,
  toggleBadges,
  togglePanel,
  resetDemo
};
```

广告位固定为 `H1/P1/G1/O1/D1/S1`，地区固定为 `cn/overseas`，后台页面固定为 `delivery/experiment/report`。拒绝原因使用固定枚举：

```js
const REASONS = Object.freeze({
  GLOBAL_KILL: 'GLOBAL_KILL',
  PLACEMENT_OFF: 'PLACEMENT_OFF',
  HOLDOUT: 'HOLDOUT',
  AUDIENCE_MISMATCH: 'AUDIENCE_MISMATCH',
  FORBIDDEN_CONTEXT: 'FORBIDDEN_CONTEXT',
  EXPERIMENT_MISS: 'EXPERIMENT_MISS',
  FREQUENCY_LIMIT: 'FREQUENCY_LIMIT',
  CONTENT_RATIO_MISS: 'CONTENT_RATIO_MISS',
  NOT_COLD_START: 'NOT_COLD_START',
  NOT_ZERO_TIME: 'NOT_ZERO_TIME',
  NATURAL_RESULT_EXISTS: 'NATURAL_RESULT_EXISTS',
  NOT_VISIBLE: 'NOT_VISIBLE',
  NOT_FILLED: 'NOT_FILLED',
  ELIGIBLE: 'ELIGIBLE'
});
```

## 3. 任务拆解

### Task 1: 建立无依赖验证脚本

**Files:**
- Create: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 写入分阶段验证器**

创建脚本，支持 `shell/core/assets/scenes/admin/all` 六个阶段。脚本必须从 HTML 抽取 `demo-seed` JSON 和 `ad-demo-core` JavaScript，并使用 Node `vm` 执行纯函数。

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
const stage = process.argv[2] || 'all';
const html = fs.readFileSync(demoPath, 'utf8');

function scriptText(id) {
  const match = html.match(new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing script#${id}`);
  return match[1];
}

function checkShell() {
  for (const id of ['topSurfaceSwitch', 'leftNav', 'demoCanvas', 'rightPanel']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.doesNotMatch(html, /<iframe\b/i, 'iframe is forbidden');
  assert.match(html, /用户端/);
  assert.match(html, /运营后台/);
}

function loadCore() {
  const context = { window: {}, structuredClone, console };
  vm.createContext(context);
  vm.runInContext(scriptText('ad-demo-core'), context);
  assert.ok(context.window.AdDemoCore, 'AdDemoCore not exported');
  return context.window.AdDemoCore;
}

function seed() {
  return JSON.parse(scriptText('demo-seed'));
}

function checkCore() {
  const data = seed();
  assert.deepEqual(Object.keys(data.policies.cn.placements), ['H1', 'P1', 'G1', 'O1', 'D1', 'S1']);
  assert.deepEqual(Object.keys(data.policies.overseas.placements), ['H1', 'P1', 'G1', 'O1', 'D1', 'S1']);
  const core = loadCore();
  const state = core.createState(data);
  assert.equal(core.evaluatePlacement(state, 'H1', {
    region: 'cn', userType: 'old', context: 'home', bucket: 5,
    ratioRoll: 0, filled: true, naturalResultCount: 0, visible: true,
    coldStart: true, zeroTime: true
  }).allowed, true);
  state.published.cn.globalKill = true;
  assert.equal(core.evaluatePlacement(state, 'H1', {
    region: 'cn', userType: 'old', context: 'home', bucket: 5,
    ratioRoll: 0, filled: true, naturalResultCount: 0, visible: true,
    coldStart: true, zeroTime: true
  }).reason, 'GLOBAL_KILL');
}

function checkAssets() {
  for (const key of ['home', 'play', 'detail', 'search']) {
    assert.match(html, new RegExp(`["']${key}["']:["']data:image\\/jpeg;base64,`), `missing embedded ${key}`);
  }
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(png|jpe?g|webp)/i, 'remote image found');
}

function checkScenes() {
  for (const id of ['H1', 'P1', 'G1', 'O1', 'D1', 'S1']) {
    assert.match(html, new RegExp(`data-page=["']${id}["']`), `missing scene ${id}`);
  }
  for (const label of ['触发条件', '展示说明', '交互说明', '异常&边界']) {
    assert.match(html, new RegExp(label));
  }
}

function checkAdmin() {
  for (const id of ['delivery', 'experiment', 'report']) {
    assert.match(html, new RegExp(`data-admin-page=["']${id}["']`), `missing admin ${id}`);
  }
  for (const label of ['一天一次', '永久一次', '国内（穿山甲）', '海外（AdMob）']) {
    assert.match(html, new RegExp(label));
  }
}

const checks = { shell: checkShell, core: checkCore, assets: checkAssets, scenes: checkScenes, admin: checkAdmin };
const order = stage === 'all' ? Object.keys(checks) : [stage];
for (const name of order) {
  assert.ok(checks[name], `unknown stage ${name}`);
  checks[name]();
  console.log(`PASS ${name}`);
}
```

- [ ] **Step 2: 运行验证器确认初始失败**

Run:

```powershell
node tools/verify-android-ad-demo.mjs shell
```

Expected: 进程非 0，并包含 `ENOENT`，因为 Demo HTML 尚未创建。

- [ ] **Step 3: 仅提交验证脚本**

```powershell
git add -- tools/verify-android-ad-demo.mjs
git commit -m "test: add Android ad demo verifier" -- tools/verify-android-ad-demo.mjs
```

Expected: 提交只包含 `tools/verify-android-ad-demo.mjs`。

### Task 2: 创建单文件框架与种子数据

**Files:**
- Create: `demos/Android广告接入-交互标注版.html`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 写入 HTML 文档骨架**

HTML 必须包含以下稳定锚点，后续任务只在锚点内扩展：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>盖世游戏 Android 广告接入 · 交互标注版</title>
  <style id="demo-styles">
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden}
    body{background:#12141e;color:rgba(255,255,255,.85);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
    button,input,select{font:inherit}.app{height:100%;display:grid;grid-template-rows:56px 1fr}
    .topbar{display:flex;align-items:center;gap:12px;padding:0 16px;background:#171a25;border-bottom:1px solid rgba(255,255,255,.06)}
    .surface-switch,.region-switch{display:flex;padding:4px;border-radius:10px;background:rgba(255,255,255,.05)}
    .seg{border:0;border-radius:7px;padding:8px 14px;background:transparent;color:rgba(255,255,255,.5);cursor:pointer}
    .seg.active{background:#1296db;color:#fff}.top-spacer{flex:1}
    .layout{min-height:0;display:grid;grid-template-columns:220px minmax(480px,1fr) 400px}
    .left-nav{background:#1e2235;border-right:1px solid rgba(255,255,255,.06);overflow:auto}
    .center{position:relative;display:flex;align-items:center;justify-content:center;overflow:auto;background:#14161e;padding:24px}
    .right-panel{background:#1a1e2a;border-left:1px solid rgba(255,255,255,.06);overflow:hidden;display:flex;flex-direction:column}
    .right-panel.collapsed{width:0;border:0}.demo-canvas{position:relative}
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="surface-switch" id="topSurfaceSwitch">
        <button class="seg active" data-surface="user">用户端</button>
        <button class="seg" data-surface="admin">运营后台</button>
      </div>
      <div class="region-switch">
        <button class="seg active" data-region="cn">国内</button>
        <button class="seg" data-region="overseas">海外</button>
      </div>
      <div class="top-spacer"></div>
      <button class="seg" id="badgeToggle">显示标号</button>
      <button class="seg" id="resetDemo">重置演示</button>
    </header>
    <div class="layout">
      <aside class="left-nav" id="leftNav"></aside>
      <main class="center"><section class="demo-canvas" id="demoCanvas"></section></main>
      <aside class="right-panel" id="rightPanel"></aside>
    </div>
  </div>
  <script type="application/json" id="demo-seed">{"version":1,"policies":{"cn":{},"overseas":{}}}</script>
  <script id="ad-demo-core">window.AdDemoCore={};</script>
  <script id="ad-demo-ui">window.AdDemoApp={};</script>
</body>
</html>
```

- [ ] **Step 2: 运行 shell 验证**

```powershell
node tools/verify-android-ad-demo.mjs shell
```

Expected:

```text
PASS shell
```

- [ ] **Step 3: 提交框架**

```powershell
git add -- 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: scaffold Android ad demo shell" -- 'demos/Android广告接入-交互标注版.html'
```

### Task 3: 内嵌真实截图资产

**Files:**
- Create: `tools/embed-android-ad-demo-assets.mjs`
- Modify: `demos/Android广告接入-交互标注版.html`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 在 HTML 中加入稳定资产区块**

将以下区块放在 `demo-seed` 之前：

```html
<script id="demo-assets">
/* ASSET_BUNDLE_START */
window.DEMO_ASSETS={};
/* ASSET_BUNDLE_END */
</script>
```

- [ ] **Step 2: 写入幂等资产脚本**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP');
const demoPath = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
const sources = {
  home: '20260618-120632.jpg',
  play: '20260521-152024.jpg',
  detail: 'img_v3_02123_fc615f68-5212-4632-b026-6baffc50519g.jpg',
  search: '20260521-152007.jpg'
};

const assets = Object.fromEntries(Object.entries(sources).map(([key, name]) => {
  const bytes = fs.readFileSync(path.join(imageDir, name));
  return [key, `data:image/jpeg;base64,${bytes.toString('base64')}`];
}));

const begin = '/* ASSET_BUNDLE_START */';
const end = '/* ASSET_BUNDLE_END */';
const html = fs.readFileSync(demoPath, 'utf8');
const start = html.indexOf(begin);
const finish = html.indexOf(end);
if (start < 0 || finish < start) throw new Error('asset markers missing');
const body = `${begin}\nwindow.DEMO_ASSETS=${JSON.stringify(assets)};\n${end}`;
const next = html.slice(0, start) + body + html.slice(finish + end.length);
fs.writeFileSync(demoPath, next, 'utf8');
console.log(`Embedded ${Object.keys(assets).length} images`);
```

- [ ] **Step 3: 执行资产脚本两次验证幂等**

```powershell
node tools/embed-android-ad-demo-assets.mjs
$hash1=(Get-FileHash -Algorithm SHA256 'demos\Android广告接入-交互标注版.html').Hash
node tools/embed-android-ad-demo-assets.mjs
$hash2=(Get-FileHash -Algorithm SHA256 'demos\Android广告接入-交互标注版.html').Hash
if($hash1 -ne $hash2){throw 'asset embedding is not idempotent'}
node tools/verify-android-ad-demo.mjs assets
```

Expected:

```text
Embedded 4 images
Embedded 4 images
PASS assets
```

- [ ] **Step 4: 提交资产能力**

```powershell
git add -- tools/embed-android-ad-demo-assets.mjs 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: embed Android ad demo screenshots" -- tools/embed-android-ad-demo-assets.mjs 'demos/Android广告接入-交互标注版.html'
```

### Task 4: 实现纯函数策略核心

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`
- Modify: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 扩展 core 测试矩阵并确认失败**

在 `checkCore()` 中加入以下断言：

```js
const base = {
  region:'cn', userType:'old', context:'home', bucket:5, ratioRoll:0,
  filled:true, naturalResultCount:0, visible:true, coldStart:true, zeroTime:true
};
assert.equal(core.evaluatePlacement(core.createState(data), 'O1', {...base, userType:'new'}).reason, 'AUDIENCE_MISMATCH');
assert.equal(core.evaluatePlacement(core.createState(data), 'O1', {...base, coldStart:false}).reason, 'NOT_COLD_START');
assert.equal(core.evaluatePlacement(core.createState(data), 'G1', {...base, zeroTime:false}).reason, 'NOT_ZERO_TIME');
assert.equal(core.evaluatePlacement(core.createState(data), 'S1', {...base, naturalResultCount:2}).reason, 'NATURAL_RESULT_EXISTS');
assert.equal(core.validateExperiment({holdout:10,control:70,H1:10,P1:10}).ok, true);
assert.equal(core.validateExperiment({holdout:10,control:60,H1:10,P1:10}).ok, false);
const rewardState = core.createState(data);
assert.equal(core.completeReward(rewardState, 'reward-1').awarded, true);
assert.equal(core.completeReward(rewardState, 'reward-1').awarded, false);
```

Run:

```powershell
node tools/verify-android-ad-demo.mjs core
```

Expected: FAIL，首个缺失函数或错误拒绝原因被明确打印。

- [ ] **Step 2: 写入完整种子数据**

`demo-seed` 必须包含两套独立策略。每个广告位至少具备：

```json
{
  "enabled": true,
  "audience": ["old", "all"],
  "contentRatio": 40,
  "experimentRatio": 10,
  "frequency": {"mode":"daily", "days":1, "count":1, "cooldownHours":24},
  "filled": true
}
```

固定默认值：H1/P1 为 40% 内容占比；G1 仅 `zeroTime`；O1 仅 `old` 且 `lifetime` 频控；D1/S1 为 30%。国内网络为 `PANGLE`，海外网络为 `ADMOB`，两地区的 `globalKill` 默认均为 `false`。

- [ ] **Step 3: 实现核心函数**

在 `ad-demo-core` 中实现并导出以下纯函数：

```js
window.AdDemoCore=(()=>{
  const clone=value=>structuredClone(value);
  const createState=seed=>({
    draft:clone(seed.policies),published:clone(seed.policies),
    experiments:clone(seed.experiments),impressions:{},rewardIds:new Set(),stats:clone(seed.stats)
  });
  const frequencyKey=(region,id,userId)=>`${region}:${id}:${userId||'demo-user'}`;
  function frequencyBlocked(state,region,id,context,policy){
    const rows=state.impressions[frequencyKey(region,id,context.userId)]||[];
    if(policy.frequency.mode==='lifetime') return rows.length>=policy.frequency.count;
    const span=policy.frequency.days*86400000;
    return rows.filter(ts=>context.now-ts<span).length>=policy.frequency.count;
  }
  function evaluatePlacement(state,id,context){
    const region=context.region;
    const root=state.published[region];
    const policy=root.placements[id];
    if(root.globalKill) return {allowed:false,reason:'GLOBAL_KILL'};
    if(!policy.enabled) return {allowed:false,reason:'PLACEMENT_OFF'};
    if(context.forbidden) return {allowed:false,reason:'FORBIDDEN_CONTEXT'};
    if(context.holdout) return {allowed:false,reason:'HOLDOUT'};
    if(!policy.audience.includes('all')&&!policy.audience.includes(context.userType)) return {allowed:false,reason:'AUDIENCE_MISMATCH'};
    if(context.bucket>=policy.experimentRatio) return {allowed:false,reason:'EXPERIMENT_MISS'};
    if(id==='O1'&&!context.coldStart) return {allowed:false,reason:'NOT_COLD_START'};
    if(id==='G1'&&!context.zeroTime) return {allowed:false,reason:'NOT_ZERO_TIME'};
    if(id==='S1'&&context.naturalResultCount>0) return {allowed:false,reason:'NATURAL_RESULT_EXISTS'};
    if(id==='D1'&&!context.visible) return {allowed:false,reason:'NOT_VISIBLE'};
    if(frequencyBlocked(state,region,id,{...context,now:context.now||Date.now()},policy)) return {allowed:false,reason:'FREQUENCY_LIMIT'};
    if(context.ratioRoll>=policy.contentRatio) return {allowed:false,reason:'CONTENT_RATIO_MISS'};
    if(!context.filled) return {allowed:false,reason:'NOT_FILLED'};
    return {allowed:true,reason:'ELIGIBLE',network:root.network};
  }
  function recordImpression(state,region,id,context={}){
    const key=frequencyKey(region,id,context.userId);
    (state.impressions[key]??=[]).push(context.now||Date.now());
    state.stats[region][id].impressions+=1;
    return state;
  }
  function publishDraft(state,region){state.published[region]=clone(state.draft[region]);return state;}
  function validateExperiment(groups){const total=Object.values(groups).reduce((a,b)=>a+Number(b),0);return {ok:total===100,total};}
  function completeReward(state,rewardId){if(state.rewardIds.has(rewardId))return {awarded:false};state.rewardIds.add(rewardId);return {awarded:true,minutes:5};}
  return {createState,evaluatePlacement,recordImpression,publishDraft,validateExperiment,completeReward};
})();
```

- [ ] **Step 4: 运行 core 验证并提交**

```powershell
node tools/verify-android-ad-demo.mjs core
git add -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: add Android ad demo policy engine" -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
```

Expected: `PASS core`，提交仅包含上述两个文件。

### Task 5: 完成三栏标注框架和顶层切换

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 增加标注和切换结构断言**

在 `checkShell()` 中加入：

```js
for (const id of ['interactionTab','exceptionTab','badgeToggle','resetDemo','panelCollapse']) {
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
}
for (const fn of ['switchSurface','switchRegion','navigate','toggleBadges','togglePanel','resetDemo']) {
  assert.match(html,new RegExp(`${fn}\\s*[:=]`),`missing ${fn}`);
}
```

运行 `node tools/verify-android-ad-demo.mjs shell`，Expected: FAIL，提示首个未实现锚点。

- [ ] **Step 2: 实现三栏标注交互**

实现以下行为：

- 顶部 `用户端/运营后台` 切换后重绘左侧导航和中间画布；
- `国内/海外` 切换更新当前地区，后台三页和用户端策略同步切换；
- 左侧激活项使用 `#1296db` 竖线和 `#4db8e8` 文字；
- 右侧提供“交互说明”和“异常&边界”两个 Tab；
- 点击标注项为对应 `[data-hotspot]` 增加 900ms 的 `pulse` 类；
- 标号默认关闭，`toggleBadges()` 控制 `.show-badges`；
- 右侧面板可折叠，折叠后中间区域出现展开按钮；
- `resetDemo()` 使用种子数据重建状态并回到用户端 H1 国内场景。

应用对象必须按约定完整导出：

```js
window.AdDemoApp={
  switchSurface, switchRegion, navigate, setDraftField,
  saveDraft, publish, simulateOutcome, toggleBadges,
  togglePanel, resetDemo
};
```

- [ ] **Step 3: 运行验证并提交**

```powershell
node tools/verify-android-ad-demo.mjs shell
git add -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: add Android ad demo annotation shell" -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
```

Expected: `PASS shell`。

### Task 6: 实现六个用户端广告场景

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`
- Modify: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 增加六场景结构和禁投断言**

在 `checkScenes()` 中加入：

```js
for (const id of ['H1','P1','G1','O1','D1','S1']) {
  assert.match(html,new RegExp(`render${id}\\s*=`),`missing render${id}`);
}
for (const value of ['游戏启动中','游戏运行中','失败重连','下载配置','支付']) {
  assert.match(html,new RegExp(value),`missing forbidden label ${value}`);
}
assert.match(html,/看约\s*15\s*秒广告，获得\s*5\s*分钟/);
assert.match(html,/PRD 新增状态/);
```

运行 `node tools/verify-android-ad-demo.mjs scenes`，Expected: FAIL。

- [ ] **Step 2: 实现用户场景渲染器**

在 `ad-demo-ui` 中提供六个独立渲染器，统一返回 `{html,annotations,exceptions}`：

```js
const USER_RENDERERS={H1:renderH1,P1:renderP1,G1:renderG1,O1:renderO1,D1:renderD1,S1:renderS1};
```

每个渲染器必须满足：

- `renderH1`：使用 `DEMO_ASSETS.home`，第一组自然内容后插入原生赞助卡，不替换“今日推荐”；
- `renderP1`：使用 `DEMO_ASSETS.play`，第一组完整自然内容后插入一次赞助游戏卡；
- `renderG1`：使用玩游戏页风格，弹窗显示“看约 15 秒广告，获得 5 分钟”，支持播放、提前关闭、失败、校验和到账；
- `renderO1`：使用盖世品牌渐变生成 PRD 新增开屏状态，支持倒计时跳过、广告点击、热启动和广告未就绪直达首页；
- `renderD1`：使用 `DEMO_ASSETS.detail`，广告在核心启动与兼容信息之后；点击启动设置 `forbidden=true` 并取消未曝光广告；
- `renderS1`：使用 `DEMO_ASSETS.search`，自然结果为 0 才显示赞助区，切换到有结果时立即移除；
- 每个页面的标注包含“触发条件、展示说明、交互说明”；
- 每个页面至少有一个 `E` 类异常标注；
- 所有商业卡持续显示“广告”或“赞助推荐”；
- 广告落地页使用同文件内 Modal，关闭后恢复场景和滚动位置。

- [ ] **Step 3: 实现模拟条件控件**

用户端左侧底部加入可操作模拟器：

```js
const simulatorDefaults={
  userType:'old', launchType:'cold', filled:true, zeroTime:true,
  naturalResultCount:0, visible:true, forbidden:false,
  bucket:5, ratioRoll:0, outcome:'success'
};
```

下拉或按钮支持新用户、老用户、零时长、Holdout；冷启动、热启动、Push、Deep Link、游戏返回；正常填充、无填充、超时、SDK 异常。每次变化立即重算并在画布顶部显示 `展示广告 / 未展示：REASON`。

- [ ] **Step 4: 运行验证并提交**

```powershell
node tools/verify-android-ad-demo.mjs scenes
git add -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: add six Android ad demo scenes" -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
```

Expected: `PASS scenes`。

### Task 7: 实现三页运营后台与地区独立配置

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`
- Modify: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 扩展后台结构断言**

在 `checkAdmin()` 中加入：

```js
for (const fn of ['renderDelivery','renderExperiment','renderReport']) {
  assert.match(html,new RegExp(`${fn}\\s*=`),`missing ${fn}`);
}
for (const value of ['内容广告占比','实验流量比例','X 天 X 次','保存草稿','发布策略','全局熔断']) {
  assert.match(html,new RegExp(value),`missing admin control ${value}`);
}
```

运行 `node tools/verify-android-ad-demo.mjs admin`，Expected: FAIL。

- [ ] **Step 2: 实现广告投放配置页**

`renderDelivery` 在一个页面完成：

- 顶部显示策略版本、草稿状态和全局熔断；
- H1～S1 横向广告位选择；
- 开关、用户范围、固定网络、内容广告占比；
- 频控模式 `daily/custom/lifetime`；
- `daily` 显示“一天一次”；
- `custom` 显示天数与次数输入，即“X 天 X 次”；
- `lifetime` 显示“永久一次”；
- “保存草稿”只更新 `state.draft[region]`；
- “发布策略”调用 `publishDraft()` 并生成 `vN` 版本号；
- 国内固定穿山甲、海外固定 AdMob，错误组合阻止发布并显示 E 标注。

- [ ] **Step 3: 实现 A/B 测试配置页**

`renderExperiment` 展示长期 Holdout、对照组、H1 和 P1 实验组。编辑时实时计算合计值；只有 `validateExperiment(...).ok === true` 才允许启动。启动后锁定核心分组输入；暂停后允许编辑。内容广告占比不得出现在实验分组字段中。

- [ ] **Step 4: 实现效果统计页**

`renderReport` 展示收入、曝光、eCPM、CTR，广告漏斗，H1～S1 对比，D1/D7 与启动成功率。地区 Tab 切换后只展示该地区数据；止损状态触发时标红，并提供跳转投放配置页的“暂停广告位”按钮。

- [ ] **Step 5: 运行验证并提交**

```powershell
node tools/verify-android-ad-demo.mjs admin
git add -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: add Android ad operations console" -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
```

Expected: `PASS admin`。

### Task 8: 打通发布、实验、统计与异常闭环

**Files:**
- Modify: `demos/Android广告接入-交互标注版.html`
- Modify: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 增加跨页面状态测试**

在 `checkCore()` 中加入：

```js
const linked=core.createState(data);
linked.draft.cn.placements.H1.contentRatio=0;
assert.notEqual(linked.published.cn.placements.H1.contentRatio,0,'draft leaked into published');
core.publishDraft(linked,'cn');
assert.equal(linked.published.cn.placements.H1.contentRatio,0,'publish did not copy draft');
const overseasBefore=linked.published.overseas.placements.H1.contentRatio;
linked.draft.cn.placements.H1.contentRatio=100;
core.publishDraft(linked,'cn');
assert.equal(linked.published.overseas.placements.H1.contentRatio,overseasBefore,'cn publish changed overseas');
```

运行 `node tools/verify-android-ad-demo.mjs core`，Expected: PASS；若失败，先修正核心再继续。

- [ ] **Step 2: 实现统计回写和止损**

`simulateOutcome()` 必须按结果更新当前地区、当前广告位：

```js
const STAT_DELTAS={
  impression:{opportunities:1,requests:1,fills:1,impressions:1},
  click:{clicks:1,revenue:0.08},
  nofill:{opportunities:1,requests:1},
  timeout:{opportunities:1,requests:1},
  reward:{rewards:1,rewardMinutes:5,revenue:0.12}
};
```

当模拟 D7 相对对照下降超过设计阈值或启动成功率下降超过阈值时，统计页显示红色止损卡；点击暂停只关闭当前地区当前广告位，并要求发布后才影响用户端。

- [ ] **Step 3: 补齐异常矩阵**

右侧异常 Tab 必须包含：无填充、超时、SDK 异常、全局熔断、频控命中、Holdout、G1 重复奖励、O1 非冷启动、S1 有自然结果、D1 启动后取消、国内/海外网络错配、A/B 比例不等于 100%。每一项点击后应改变模拟器状态并高亮结果区域。

- [ ] **Step 4: 运行全部自动验证并提交**

```powershell
node tools/verify-android-ad-demo.mjs all
git add -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
git commit -m "feat: complete Android ad demo state loop" -- tools/verify-android-ad-demo.mjs 'demos/Android广告接入-交互标注版.html'
```

Expected:

```text
PASS shell
PASS core
PASS assets
PASS scenes
PASS admin
```

### Task 9: 浏览器视觉验收和最终交付检查

**Files:**
- Modify if defects are found: `demos/Android广告接入-交互标注版.html`
- Modify if assertions need correction: `tools/verify-android-ad-demo.mjs`
- Test: `.tmp/android-ad-demo-user.png`
- Test: `.tmp/android-ad-demo-admin.png`

- [ ] **Step 1: 生成用户端桌面截图**

```powershell
New-Item -ItemType Directory -Force '.tmp' | Out-Null
$demo=(Resolve-Path 'demos\Android广告接入-交互标注版.html').Path
$url=[System.Uri]::new($demo).AbsoluteUri
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --window-size=1600,1000 --screenshot='.tmp\android-ad-demo-user.png' $url
```

Expected: Edge 进程返回 0，`.tmp/android-ad-demo-user.png` 存在且宽高为 1600×1000。

- [ ] **Step 2: 使用本地图片查看工具检查用户端**

检查：三栏无重叠；402×874 手机完整可见；首页与玩游戏页保留盖世原视觉；广告标识清晰但不过度抢眼；右侧标注文本不截断；标号默认关闭。

- [ ] **Step 3: 生成后台截图**

为 HTML 增加仅用于本地验收的查询参数解析：`?surface=admin&page=delivery&region=cn`。然后执行：

```powershell
$demo=(Resolve-Path 'demos\Android广告接入-交互标注版.html').Path
$url=([System.Uri]::new($demo).AbsoluteUri)+'?surface=admin&page=delivery&region=cn'
& 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --window-size=1800,1100 --screenshot='.tmp\android-ad-demo-admin.png' $url
```

Expected: `.tmp/android-ad-demo-admin.png` 存在且宽高为 1800×1100。

- [ ] **Step 4: 手动执行 12 条设计验收路径**

逐条执行设计文档第 9 章。重点保留以下证据：

- 国内 H1 100% 发布后展示穿山甲；
- 海外独立配置不被国内发布修改；
- P1 永久一次；
- G1 完整观看与提前关闭；
- O1 新用户和非冷启动拒绝；
- S1 有自然结果时消失；
- D1 启动后取消；
- 全局熔断；
- A/B 比例校验；
- 草稿与发布隔离；
- 标注双向高亮；
- 用户端/后台切换状态不丢失。

- [ ] **Step 5: 最终静态检查**

```powershell
node tools/verify-android-ad-demo.mjs all
$banned=@(('T'+'BD'),('T'+'ODO'),'待实现',('place'+'holder'),'<iframe','https?://.*\.(png|jpg|jpeg|webp)') -join '|'
rg -n $banned 'demos\Android广告接入-交互标注版.html'
git diff --check -- 'demos\Android广告接入-交互标注版.html' tools/verify-android-ad-demo.mjs tools/embed-android-ad-demo-assets.mjs
```

Expected: 验证器五阶段全部 PASS；`rg` 无输出；`git diff --check` 无输出。

- [ ] **Step 6: 提交视觉修正**

仅当视觉验收产生修正时执行：

```powershell
git add -- 'demos/Android广告接入-交互标注版.html' tools/verify-android-ad-demo.mjs
git commit -m "fix: polish Android ad demo interactions" -- 'demos/Android广告接入-交互标注版.html' tools/verify-android-ad-demo.mjs
```

- [ ] **Step 7: 核对最终提交范围**

```powershell
git log --oneline -- 'demos/Android广告接入-交互标注版.html' tools/verify-android-ad-demo.mjs tools/embed-android-ad-demo-assets.mjs
git status --short -- 'demos/Android广告接入-交互标注版.html' tools/verify-android-ad-demo.mjs tools/embed-android-ad-demo-assets.mjs
```

Expected: 三个任务文件均无未提交改动；其他用户文件的状态未被改变。

## 4. 计划自检结果

- 设计文档六个用户场景分别由 Task 6 覆盖；
- 三个后台页面和国内/海外独立配置由 Task 7 覆盖；
- 草稿、发布、实验、统计和异常闭环由 Task 8 覆盖；
- 单文件、无 iframe、截图 Data URL 和 `demo标记` 三栏结构由 Task 2、3、5 覆盖；
- 自动回归、策略矩阵和浏览器视觉检查由 Task 1、4、9 覆盖；
- 计划没有扩大到真实 SDK、服务端、会员、iOS 或第四个后台页面。
