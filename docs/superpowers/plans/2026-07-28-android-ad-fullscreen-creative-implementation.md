# Android Ad Fullscreen Creative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Android 广告 Demo 中的激励视频、广告落地页和开屏广告改为接近真实 SDK 的全屏体验，并把 G1 时长不足提示融合进盖世游戏原有提示弹窗。

**Architecture:** 保留现有单文件标注 Demo 架构，在 `device()` 设备容器中统一挂载广告覆盖层。业务弹窗只处理用户确认；`rewardAd` 和 `adLanding` 两个状态分别驱动全屏激励视频/落地页与原生广告落地页，所有奖励由统一模拟回调处理。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js 静态验收脚本、Playwright UI 验收。

---

## 文件结构

- `demos/Android广告接入-交互标注版.template.html`：唯一可维护模板，新增广告覆盖层、状态和交互。
- `demos/Android广告接入-交互标注版.html`：由构建脚本注入图片资源后生成的单文件成品。
- `tools/verify-android-ad-demo.mjs`：检查必要文案、状态、动作和禁用旧弹窗结构。
- `tools/verify-android-ad-demo-ui.mjs`：通过真实浏览器检查全屏层尺寸、横竖屏和返回状态。
- `prd/ai生成/【Prd】《盖世游戏》Android广告接入需求-V2.0.md`：同步产品规则和异常处理。

### Task 1: 扩充静态验收

**Files:**
- Modify: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 增加全屏广告结构断言**

在现有断言组中加入：

```js
assert(html.includes('reward-ad-layer'), 'Rewarded ad must use a full-device layer');
assert(html.includes('search-landing-card'), 'Search ads must use the SDK landing card');
assert(html.includes('open-ad-shield'), 'Opening ad must contain the shield creative');
assert(html.includes('看广告得 5 分钟'), 'G1 must expose the rewarded-duration action');
assert(!html.includes('G1 时长激励</h2><div class="video-box"'), 'Legacy rewarded modal must be removed');
```

- [ ] **Step 2: 运行验收并确认失败**

Run: `node tools/verify-android-ad-demo.mjs`

Expected: FAIL，提示缺少 `reward-ad-layer`。

### Task 2: 建立统一设备内广告覆盖层

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`

- [ ] **Step 1: 增加广告状态**

在 `state` 中加入：

```js
rewardAd:null,
adLanding:null,
```

`rewardAd` 使用 `{kind,stage:'video'|'landing'}`；`adLanding` 使用 `{kind:'search'|'opening'|'generic'}`。

- [ ] **Step 2: 让设备容器统一挂载广告层**

把 `device()` 调整为：

```js
function device(orientation,inner,assetKey=''){
  const overlays=state.surface==='user'
    ? `${rewardAdLayer(orientation)}${adLandingLayer(orientation)}`
    : '';
  return `<div class="device ${orientation} ${state.badges?'show-badges':''}" data-orientation="${orientation}" ${assetKey?`data-reference="${esc(A[assetKey].source)}"`:''}>${inner}${overlays}</div>`;
}
```

- [ ] **Step 3: 增加全屏层基础样式**

```css
.device-ad-layer{position:absolute;inset:0;z-index:80;overflow:hidden;background:#050608;color:#fff}
.reward-ad-layer,.ad-landing-layer{display:flex}
.reward-ad-top{position:absolute;z-index:3;left:16px;right:16px;top:14px;display:flex;justify-content:space-between}
.reward-ad-creative{position:absolute;inset:0}
.reward-ad-cta{border:0;border-radius:999px;background:#ff4b60;color:#fff;font-weight:900}
```

- [ ] **Step 4: 将模拟操作放到设备外**

在 `titlebar()` 中，当 `state.rewardAd` 存在时追加：

```html
<button class="chip active" data-action="reward-sim-complete">模拟播放完成</button>
<button class="chip" data-action="reward-sim-fail">模拟失败</button>
```

设备内不能出现“完整观看”或“播放失败”按钮。

### Task 3: 实现激励视频与全屏落地页

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`

- [ ] **Step 1: 实现激励视频结构**

`rewardAdLayer()` 输出声音、反馈、倒计时、主素材、卖点、应用信息和 CTA。竖屏为上下结构，横屏通过 CSS 改为左右分栏。

```js
function rewardAdLayer(orientation){
  if(!state.rewardAd)return '';
  if(state.rewardAd.stage==='landing')return rewardLandingLayer(orientation);
  return `<section class="device-ad-layer reward-ad-layer ${orientation}">
    <div class="reward-ad-top"><span>🔊　反馈</span><span class="reward-countdown">29s</span></div>
    <div class="reward-ad-creative"><div class="reward-game-logo">欢乐海岛</div><div class="reward-gameplay">GAMEPLAY</div></div>
    <div class="reward-ad-offer"><h2>登录即领海量福利</h2><p>高能玩法 · 即刻体验</p></div>
    <div class="reward-app-bar"><span class="reward-app-icon">岛</span><span><b>欢乐海岛</b><small>策略冒险 · Ad</small></span><button class="reward-ad-cta" data-action="reward-open-landing">点击试玩</button></div>
  </section>`;
}
```

- [ ] **Step 2: 实现激励广告落地页**

`rewardLandingLayer()` 覆盖整个设备画布，顶部提供返回，底部提供“立即试玩”；返回时恢复视频层，不发奖励。

- [ ] **Step 3: 统一奖励回调**

`openRewardVideo(kind)` 只设置 `state.rewardAd={kind,stage:'video'}`。`completeReward(kind)` 分别处理：

```js
if(kind==='c1')state.c1.double=true;
if(kind==='g1')state.g1.awarded=true;
if(kind==='q1'){state.q1.awarded=true;state.q1.offerOpen=false;}
if(kind==='r1'&&!state.r1.rewarded){state.r1.rewarded=true;state.r1.drawCount+=1;}
state.rewardAd=null;
render();
```

- [ ] **Step 4: 连接 C1/G1/Q1/R1**

四个入口全部调用 `openRewardVideo(kind)`。模拟失败只清除 `rewardAd`，不能回收基础签到时长、改变排队位置或增加抽奖次数。

### Task 4: 融合 G1 原有提示弹窗

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`

- [ ] **Step 1: 替换 G1 粉紫弹窗**

使用深灰系统提示样式，包含标题“提示”、右上关闭、正文、补充说明和两个按钮：

```html
<section class="system-dialog cloud-time-dialog">
  <button class="dialog-close" data-action="g1-dismiss">×</button>
  <h2>提示</h2>
  <p>当前云游戏时长不足，暂时无法启动游戏。</p>
  <p class="dialog-supporting">完整观看约 15 秒广告，可获得 5 分钟云游戏时长。</p>
  <div class="actions">
    <button class="primary" data-action="g1-watch">看广告得 5 分钟</button>
    <button class="secondary" data-action="g1-recharge">前往充值</button>
  </div>
</section>
```

- [ ] **Step 2: 验证关闭和到账状态**

关闭不创建启动请求；广告完成后展示“5 分钟已到账，正在继续创建云游戏启动请求”。

### Task 5: 重建 O1 开屏广告

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`

- [ ] **Step 1: 重建参考图结构**

在 `renderO1()` 的广告阶段输出：

```html
<div class="open-ad">
  <span class="ad-flag">Ad · 穿山甲</span>
  <button class="skip" data-action="o1-next">跳过 3s</button>
  <div class="open-ad-shield"><span>🔒</span></div>
  <h1>解锁精彩内容</h1>
  <div class="open-ad-arrows">⌃<br>⌃<br>⌃</div>
  <button class="open-ad-detail" data-action="landing">查看详情</button>
  <p>向上滑动或点击查看详情</p>
</div>
```

- [ ] **Step 2: 分别适配横竖屏**

竖屏上下排列；横屏将主视觉放左侧，标题、卖点和 CTA 放右侧。广告标识和跳过始终固定在两侧顶部。

### Task 6: 实现搜索专用 SDK 落地卡

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`

- [ ] **Step 1: 按页面选择落地类型**

```js
function adLanding(){
  const kind=['S1','S2','S3'].includes(state.page)?'search':state.page==='O1'?'opening':'generic';
  state.adLanding={kind};
  render();
}
```

- [ ] **Step 2: 输出搜索落地卡**

```html
<section class="device-ad-layer ad-landing-layer search-landing-layer">
  <article class="search-landing-card">
    <button data-action="landing-close">×</button>
    <header>摇一摇或点击图标<br><small>跳转到详情页或第三方应用</small></header>
    <div class="search-landing-video">游戏视频素材</div>
    <p>这游戏策略可以处！</p>
    <footer><span class="reward-app-icon">梦</span><b>梦幻奇旅</b><button>立即下载</button></footer>
  </article>
</section>
```

- [ ] **Step 3: 恢复搜索状态**

关闭落地页只清除 `state.adLanding`；已有 `search.query`、`search.defaultTab`、`search.batches`、`search.positions` 和 `search.scrollTop` 不得重置。

### Task 7: 构建成品并同步 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Android广告接入需求-V2.0.md`
- Generate: `demos/Android广告接入-交互标注版.html`

- [ ] **Step 1: 构建单文件 Demo**

Run: `node tools/build-android-ad-demo.mjs`

Expected: `demos/Android广告接入-交互标注版.html` 重新生成，且不包含 `/* ASSET_BUNDLE */`。

- [ ] **Step 2: 更新 PRD**

在 O1、S1/S2/S3、C1、G1、Q1、R1 说明中写明：

- 业务弹窗与广告全屏层分离。
- 激励视频和激励落地页覆盖完整 App 页面。
- 搜索落地页使用全屏 SDK 遮罩和竖向广告卡。
- 真实落地页、应用商店和第三方应用外跳由 SDK 决定。
- 关闭后恢复来源页面状态。

### Task 8: 自动化和视觉验收

**Files:**
- Modify: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 运行静态验收**

Run: `node tools/verify-android-ad-demo.mjs`

Expected: 输出 `Android ad demo verification passed.`。

- [ ] **Step 2: 增加并运行 UI 验收**

检查：

```js
const deviceBox=await page.locator('.device').boundingBox();
const rewardBox=await page.locator('.reward-ad-layer').boundingBox();
assert(Math.abs(deviceBox.width-rewardBox.width)<2);
assert(Math.abs(deviceBox.height-rewardBox.height)<2);
```

同时验证搜索落地卡关闭后关键词和滚动位置不变。

Run: `node tools/verify-android-ad-demo-ui.mjs`

Expected: 输出 `Android ad demo UI verification passed.`，且无横竖屏溢出和重叠。
