# Android 广告交互 Demo 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有“截图背景＋通用悬浮广告”Demo 重构为 1:1 融入盖世游戏原页面的七资源位交互 Demo，并补齐真实运营后台三页、横竖屏、标注联动和浏览器验收。

**Architecture:** 保留最终单文件 `demos/Android广告接入-交互标注版.html`，新增可维护的模板文件和统一构建脚本，由构建脚本读取本地参考图并注入 Data URL。业务状态使用一个纯函数核心管理，用户场景渲染、后台 CRUD、标注数据和视觉安全区分别组织；两个 PC 启动阶段共用一个 L1 请求身份。

**Tech Stack:** HTML5、CSS、原生 JavaScript、Node.js ESM、`playwright-core`、本机 Chrome、Node `assert`。

---

## 文件结构

- Create: `demos/Android广告接入-交互标注版.template.html` — 可维护的三栏 Demo 模板，不内嵌大体积图片。
- Modify: `demos/Android广告接入-交互标注版.html` — 构建生成的最终单文件交付物。
- Create: `tools/android-ad-demo-assets.mjs` — 参考图路径、方向、切片坐标和必需资产契约。
- Create: `tools/build-android-ad-demo.mjs` — 将模板与图片构建为最终单 HTML。
- Modify: `tools/embed-android-ad-demo-assets.mjs` — 改为调用统一资产模块，避免两套映射漂移。
- Modify: `tools/verify-android-ad-demo.mjs` — 更新资源位集合、状态机、后台和资产静态验证。
- Create: `tools/verify-android-ad-demo-ui.mjs` — 浏览器交互、尺寸、遮挡和 CRUD 验收。
- Create: `tools/capture-android-ad-demo.mjs` — 输出人工复核截图到 `.tmp/android-ad-demo-captures/`。

## Task 1: 锁定参考图资产契约

**Files:**
- Create: `tools/android-ad-demo-assets.mjs`
- Reference: `APP核心优化/竞品对比/盖世游戏APP/`

- [ ] **Step 1: 将用户对话中提供的参考图保存为固定文件名**

必须存在以下文件；不得用 CSS 推测页替代后宣称 1:1：

```text
APP核心优化/竞品对比/盖世游戏APP/20260717-home.jpg
APP核心优化/竞品对比/盖世游戏APP/20260717-checkin.jpg
APP核心优化/竞品对比/盖世游戏APP/20260717-queue.jpg
APP核心优化/竞品对比/盖世游戏APP/20260717-start-firmware.jpg
APP核心优化/竞品对比/盖世游戏APP/20260717-start-client.jpg
APP核心优化/竞品对比/盖世游戏APP/20260717-game-library-gta5.jpg
```

继续复用已有文件：

```text
APP核心优化/竞品对比/盖世游戏APP/20260521-152127.jpg
APP核心优化/竞品对比/盖世游戏APP/gw_logo.svg
```

- [ ] **Step 2: 写资产清单与预检函数**

```js
import fs from 'node:fs';
import path from 'node:path';

export const ASSETS = Object.freeze({
  home: '20260717-home.jpg',
  play: '20260521-152127.jpg',
  checkin: '20260717-checkin.jpg',
  queue: '20260717-queue.jpg',
  startupFirmware: '20260717-start-firmware.jpg',
  startupClient: '20260717-start-client.jpg',
  gameLibrary: '20260717-game-library-gta5.jpg',
  logo: 'gw_logo.svg',
});

export function assertAssets(imageDir) {
  const missing = Object.values(ASSETS).filter(name => !fs.existsSync(path.join(imageDir, name)));
  if (missing.length) throw new Error(`Missing Android ad demo assets:\n${missing.join('\n')}`);
}
```

- [ ] **Step 3: 运行预检并确认缺图时明确失败**

Run: `node -e "import('./tools/android-ad-demo-assets.mjs').then(m=>m.assertAssets('APP核心优化/竞品对比/盖世游戏APP'))"`

Expected before assets land: FAIL and list exact missing filenames. Expected after assets land: exit 0 with no output.

- [ ] **Step 4: Commit**

```bash
git add tools/android-ad-demo-assets.mjs
git commit -m "build: define Android ad demo asset contract"
```

## Task 2: 先更新静态验收为新资源位契约

**Files:**
- Modify: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 将旧资源位断言改为唯一集合**

```js
const placementIds = ['O1', 'H1', 'P1', 'C1', 'G1', 'Q1', 'L1'];
assert.deepEqual(Object.keys(data.policies.cn.placements), placementIds);
assert.deepEqual(Object.keys(data.policies.overseas.placements), placementIds);
assert.doesNotMatch(html, /renderD1|renderS1|data-page=["'](?:D1|S1)/);
```

- [ ] **Step 2: 增加 C1 与 L1 纯函数断言**

```js
const c = core.createState(data);
const baseGrant = core.completeCheckin(c, 'checkin-1', 60);
assert.equal(baseGrant.baseMinutes, 60);
const doubleGrant = core.completeCheckinDouble(c, 'reward-c1', 60);
assert.equal(doubleGrant.bonusMinutes, 60);
assert.equal(core.completeCheckinDouble(c, 'reward-c1', 60).awarded, false);

const l = core.createState(data);
const first = core.ensureStartupAd(l, 'startup-1', 'creative-a');
const second = core.continueStartupStage(l, 'startup-1', 'client_launch');
assert.equal(first.requestId, second.requestId);
assert.equal(first.creativeId, second.creativeId);
```

- [ ] **Step 3: 增加后台与视觉结构静态断言**

```js
for (const id of ['adminProductName', 'adminSidebar', 'adminRegionTabs', 'deliveryTable', 'experimentTable', 'adminDrawer', 'deleteConfirm']) {
  assert.match(html, new RegExp(`id=["']${id}["']`));
}
for (const label of ['触发条件', '展示说明', '交互说明', '阶段一：安装固件', '阶段二：客户端启动', '看广告再领']) {
  assert.match(html, new RegExp(label));
}
```

- [ ] **Step 4: 运行旧 Demo，确认新断言失败**

Run: `node tools/verify-android-ad-demo.mjs all`

Expected: FAIL，至少指出旧 D1/S1 集合或缺少 C1/L1。

- [ ] **Step 5: Commit**

```bash
git add tools/verify-android-ad-demo.mjs
git commit -m "test: define rebuilt Android ad demo contract"
```

## Task 3: 建立可维护模板和统一构建流程

**Files:**
- Create: `demos/Android广告接入-交互标注版.template.html`
- Create: `tools/build-android-ad-demo.mjs`
- Modify: `tools/embed-android-ad-demo-assets.mjs`
- Modify: `demos/Android广告接入-交互标注版.html`

- [ ] **Step 1: 创建模板基础骨架**

模板必须包含以下稳定节点：

```html
<header class="demo-toolbar">
  <div id="topSurfaceSwitch" role="tablist"></div>
  <button id="badgeToggle">显示标号</button>
  <button id="resetDemo">重置演示</button>
</header>
<main class="demo-shell">
  <aside id="leftNav" class="left-nav"></aside>
  <section id="demoCanvas" class="demo-canvas"></section>
  <aside id="rightPanel" class="right-panel">
    <div role="tablist">
      <button id="interactionTab">交互说明</button>
      <button id="exceptionTab">异常&amp;边界</button>
    </div>
    <div id="annotationContent"></div>
  </aside>
</main>
<script id="demo-seed" type="application/json"></script>
<script id="ad-demo-assets">/* ASSET_BUNDLE */</script>
<script id="ad-demo-core"></script>
<script id="ad-demo-ui"></script>
```

- [ ] **Step 2: 写统一构建脚本**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS, assertAssets } from './android-ad-demo-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP');
const templatePath = path.join(root, 'demos', 'Android广告接入-交互标注版.template.html');
const outputPath = path.join(root, 'demos', 'Android广告接入-交互标注版.html');
assertAssets(imageDir);
const assets = Object.fromEntries(Object.entries(ASSETS).map(([key, name]) => {
  const ext = path.extname(name).toLowerCase();
  const mime = ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
  return [key, `data:${mime};base64,${fs.readFileSync(path.join(imageDir, name)).toString('base64')}`];
}));
const template = fs.readFileSync(templatePath, 'utf8');
const output = template.replace('/* ASSET_BUNDLE */', `window.DEMO_ASSETS=${JSON.stringify(assets)};`);
fs.writeFileSync(outputPath, output, 'utf8');
```

- [ ] **Step 3: 让旧嵌入脚本转调统一构建脚本**

```js
await import('./build-android-ad-demo.mjs');
```

- [ ] **Step 4: 构建并验证最终 HTML 不依赖外部图片**

Run: `node tools/build-android-ad-demo.mjs`

Expected: `demos/Android广告接入-交互标注版.html` 生成成功，包含七个 `data:image`/SVG Data URL，不包含远程图片 URL。

- [ ] **Step 5: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/build-android-ad-demo.mjs tools/embed-android-ad-demo-assets.mjs
git commit -m "refactor: add maintainable Android ad demo build"
```

## Task 4: 实现纯状态核心与七场景导航

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Test: `tools/verify-android-ad-demo.mjs`

- [ ] **Step 1: 定义唯一页面集合和方向**

```js
const USER_PAGES = Object.freeze([
  { id: 'O1', label: 'App 启动', orientation: 'dual' },
  { id: 'H1', label: '首页原生混投', orientation: 'portrait' },
  { id: 'P1', label: '玩游戏页赞助卡', orientation: 'landscape' },
  { id: 'C1', label: '签到时长加倍', orientation: 'landscape' },
  { id: 'G1', label: '零时长激励', orientation: 'landscape' },
  { id: 'Q1', label: '排队加速激励', orientation: 'landscape' },
  { id: 'L1', label: 'PC 启动等待广告', orientation: 'landscape' },
]);
```

- [ ] **Step 2: 定义 C1 和 L1 幂等状态接口**

```js
function completeCheckin(state, checkinId, minutes) {
  if (state.checkins.has(checkinId)) return { awarded: false, baseMinutes: 0 };
  state.checkins.add(checkinId);
  state.minutes += minutes;
  return { awarded: true, baseMinutes: minutes };
}

function completeCheckinDouble(state, rewardId, minutes) {
  if (state.rewardIds.has(rewardId)) return { awarded: false, bonusMinutes: 0 };
  state.rewardIds.add(rewardId);
  state.minutes += minutes;
  return { awarded: true, bonusMinutes: minutes };
}

function ensureStartupAd(state, startupSessionId, creativeId) {
  if (!state.startupAds[startupSessionId]) {
    state.startupAds[startupSessionId] = { requestId: `l1-${startupSessionId}`, creativeId, stage: 'firmware_prepare' };
  }
  return state.startupAds[startupSessionId];
}

function continueStartupStage(state, startupSessionId, stage) {
  const ad = ensureStartupAd(state, startupSessionId, 'startup-sponsor');
  ad.stage = stage;
  return ad;
}
```

- [ ] **Step 3: 构建、运行静态验证**

Run: `node tools/build-android-ad-demo.mjs && node tools/verify-android-ad-demo.mjs core`

Expected: PASS core。

- [ ] **Step 4: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html
git commit -m "feat: add Android ad demo scene state"
```

## Task 5: 重做 H1 与 P1 为原生内容流插卡

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Modify: `tools/android-ad-demo-assets.mjs`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 实现截图切片组件**

```js
function imageSlice(asset, topRatio, heightRatio, className = '') {
  return `<div class="image-slice ${className}" style="--top:${topRatio};--height:${heightRatio}">
    <img src="${DEMO_ASSETS[asset]}" alt="" draggable="false">
  </div>`;
}
```

```css
.image-slice { position:relative; width:100%; height:calc(var(--height) * 100%); overflow:hidden; }
.image-slice > img { position:absolute; width:100%; height:auto; top:calc(var(--top) * -100%); left:0; }
.native-insert { position:relative; background:var(--page-surface); }
```

- [ ] **Step 2: H1 在“为你推荐”至少三张自然卡后插入同规格卡**

H1 不渲染 `.veil`、`.floating-card` 或通用 `.ad-card`。广告卡使用首页自然卡图片比例、圆角、标题基线和间距，只增加“广告”角标；无填充时直接拼接前后切片。

- [ ] **Step 3: P1 改用 `20260521-152127.jpg` 横屏图并插入卡片**

P1 在“秒玩人气热游”至少两张自然卡后插入同规格赞助卡，不进入“最近常玩”、时长卡或签到区域。

- [ ] **Step 4: 写浏览器断言**

```js
await page.click('[data-user-page="H1"]');
await expectNoOverlap(page, '[data-placement="H1"]', '[data-protected="today-recommendation"]');
await page.click('[data-user-page="P1"]');
await expectNoOverlap(page, '[data-placement="P1"]', '[data-protected="recent-games"]');
```

- [ ] **Step 5: 构建和验证**

Run: `node tools/build-android-ad-demo.mjs && node tools/verify-android-ad-demo.mjs scenes`

Expected: PASS scenes，且 HTML 中不存在 `shotScene(`、`class="veil"`。

- [ ] **Step 6: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/android-ad-demo-assets.mjs
git commit -m "feat: integrate H1 and P1 ads into native content"
```

## Task 6: 实现 C1、G1、Q1 主动激励场景

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Test: `tools/verify-android-ad-demo.mjs`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 实现 C1 签到结果流程**

默认只显示原“签到”按钮。点击后调用 `completeCheckin()`，再显示盖世粉紫毛玻璃结果弹层：

```html
<section class="gamehub-dialog checkin-result" role="dialog" aria-label="签到成功">
  <h2>签到成功</h2>
  <p>已获得 <strong data-base-minutes>60 分钟</strong></p>
  <button data-action="checkin-double">看广告再领 60 分钟</button>
  <button data-action="checkin-done">完成</button>
</section>
```

- [ ] **Step 2: 实现 C1 成功、失败和重复回调**

完整观看调用 `completeCheckinDouble()`；提前关闭和播放失败只关闭广告层，基础奖励与签到状态保持。重复 `rewardId` 返回 `awarded:false`。

- [ ] **Step 3: G1 使用清晰横屏底图和盖世毛玻璃弹层**

移除底图模糊。弹层保留“看广告得时长”和“暂不领取”，只有用户点击前者才进入视频模拟。

- [ ] **Step 4: Q1 使用真实排队图并只改造原控制区**

禁止 CSS 拼 GTA Logo。保留原排队信息、名次和背景，在原“加速排队”区域加入主动激励按钮；播放时保持排队状态，成功/部分成功/校验中三条路径继续复用幂等核心。

- [ ] **Step 5: 增加浏览器流程断言**

```js
await page.click('[data-user-page="C1"]');
await page.click('[data-action="checkin"]');
await assertText(page, '[data-checkin-state]', '签到成功');
await page.click('[data-action="checkin-double"]');
await page.click('[data-action="reward-complete"]');
await assertText(page, '[data-checkin-state]', '今日双倍已领取');
```

- [ ] **Step 6: 构建和验证**

Run: `node tools/build-android-ad-demo.mjs && node tools/verify-android-ad-demo.mjs all`

Expected: PASS shell/core/assets/scenes/admin/uiSyntax。

- [ ] **Step 7: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/verify-android-ad-demo.mjs
git commit -m "feat: add checkin and reward ad flows"
```

## Task 7: 实现 O1 双方向完整启动链路

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 建立 O1 状态机**

```js
const O1_STEPS = Object.freeze(['logo', 'ad', 'destination']);
function nextO1Step(state) {
  if (state.o1Step === 'logo') state.o1Step = state.sim.filled ? 'ad' : 'destination';
  else if (state.o1Step === 'ad') state.o1Step = 'destination';
}
```

- [ ] **Step 2: 竖屏与横屏目标页分开渲染**

- 竖屏：黑底白色盖世 Logo 动画 → 竖屏开屏广告 → `20260717-home.jpg`。
- 横屏：黑底白色盖世 Logo 动画 → 横屏开屏广告 → `20260717-game-library-gta5.jpg`。
- 无填充：Logo 后直接进入目标页。
- 跳过：只结束广告，不跳过 Logo 品牌动画。

- [ ] **Step 3: 浏览器验证双方向和无填充**

Run: `node tools/verify-android-ad-demo-ui.mjs o1`

Expected: portrait destination has ratio 402/874；landscape destination has ratio 874/402；no-fill path never renders `[data-o1-step="ad"]`。

- [ ] **Step 4: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/verify-android-ad-demo-ui.mjs
git commit -m "feat: add dual-orientation app open flow"
```

## Task 8: 实现 L1 两阶段共用右侧广告位

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 用真实两阶段图片渲染同一 L1 DOM**

```html
<section class="startup-scene" data-page="L1" data-stage="firmware_prepare">
  <img class="startup-reference" alt="" data-startup-background>
  <article class="startup-ad" data-placement="L1" data-request-id="l1-demo-startup">
    <span class="ad-disclosure">广告</span>
    <img alt="赞助内容">
    <strong>启动等待期间推荐</strong>
    <button data-action="landing">了解详情</button>
  </article>
</section>
```

- [ ] **Step 2: 固定安全区与层级**

```css
.startup-ad { position:absolute; top:58px; right:22px; width:204px; height:140px; z-index:10; }
.startup-reference { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
.startup-protected { position:absolute; z-index:20; pointer-events:none; }
```

- [ ] **Step 3: 切换阶段只替换背景，不替换广告节点**

保存切换前的 `requestId`、`creativeId` 和元素引用；切换后断言三者不变。启动完成、失败、排障或安全区不足时移除广告节点。

- [ ] **Step 4: 增加矩形防遮挡断言**

```js
async function expectNoOverlap(page, adSelector, protectedSelector) {
  const overlap = await page.evaluate(({ adSelector, protectedSelector }) => {
    const a = document.querySelector(adSelector).getBoundingClientRect();
    return [...document.querySelectorAll(protectedSelector)].some(node => {
      const b = node.getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
  }, { adSelector, protectedSelector });
  assert.equal(overlap, false);
}
```

- [ ] **Step 5: 运行 L1 浏览器验证**

Run: `node tools/verify-android-ad-demo-ui.mjs l1`

Expected: PASS l1NoOverlap、l1SameCreative、l1FailureHide、l1NoFillNoSlot。

- [ ] **Step 6: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/verify-android-ad-demo-ui.mjs
git commit -m "feat: add protected PC startup ad placement"
```

## Task 9: 重构运营后台为真实三页列表 CRUD

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 建立完整后台容器**

后台容器必须含：产品名“盖世游戏运营后台”、后台侧栏、三页导航、内容区内国内/海外 Tab；删除全局顶栏地区切换。

- [ ] **Step 2: 投放配置改为表格＋右抽屉**

```html
<table id="deliveryTable">
  <thead><tr><th>名称</th><th>广告位</th><th>平台</th><th>状态</th><th>投放比例</th><th>频控</th><th>更新时间</th><th>操作</th></tr></thead>
  <tbody></tbody>
</table>
```

支持新增、查看、编辑、删除；新建/查看/编辑打开 `#adminDrawer`，删除打开 `#deleteConfirm`。保存只改草稿，发布后才同步用户端。

- [ ] **Step 3: 实验配置改为表格＋右抽屉**

字段为实验名称、关联广告位、人群、分组比例、状态、时间、更新时间、操作。分组比例合计不为 100% 时禁用启动。

- [ ] **Step 4: 效果统计覆盖七资源位**

移除 D1/S1 广告位行，保留“次日留存”文本指标。增加 C1 的签到/加倍/云成本和 L1 的阶段延续/启动成功/启动耗时指标。

- [ ] **Step 5: 地区和草稿发布隔离**

```js
state.drafts = { cn: structuredClone(seed.cn), overseas: structuredClone(seed.overseas) };
state.published = { cn: structuredClone(seed.cn), overseas: structuredClone(seed.overseas) };
```

国内编辑不能改变海外表格；保存草稿不能改变用户端；发布当前地区后只更新对应 `published[region]`。

- [ ] **Step 6: 浏览器跑完整 CRUD**

Run: `node tools/verify-android-ad-demo-ui.mjs admin`

Expected: PASS deliveryCrud、experimentCrud、deleteConfirm、regionIsolation、draftPublishIsolation。

- [ ] **Step 7: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/verify-android-ad-demo-ui.mjs
git commit -m "feat: rebuild Android ad operations console"
```

## Task 10: 补齐 demo 标注联动与异常边界

**Files:**
- Modify: `demos/Android广告接入-交互标注版.template.html`
- Test: `tools/verify-android-ad-demo-ui.mjs`

- [ ] **Step 1: 每个场景固定三条主标注**

```js
const ANNOTATIONS = {
  L1: {
    interaction: [
      { n: 1, title: '触发条件', body: '进入正常固件准备或客户端启动阶段，且已发布策略允许展示。' },
      { n: 2, title: '展示说明', body: '右侧固定原生广告位，不遮挡进度、错误、客户端关系图和品牌信息。' },
      { n: 3, title: '交互说明', body: '阶段切换沿用同一广告；点击不暂停启动；完成或失败立即隐藏。' },
    ],
  },
};
```

O1/H1/P1/C1/G1/Q1 使用相同数据结构，所有正文必须包含触发条件、展示说明、交互说明。

- [ ] **Step 2: 点击导航与标注双向联动**

导航切页后右侧滚动到对应 section；点击标注后对应 `[data-hotspot]` 闪烁；“显示标号”只控制 Demo 数字角标，不向产品画布永久添加状态条。

- [ ] **Step 3: 异常 Tab 覆盖关键回退**

C1 基础奖励保护、G1/Q1 幂等、O1 无填充、L1 完成/失败/安全区不足、H1/P1 无填充均应有独立异常标注。

- [ ] **Step 4: 运行标注验证**

Run: `node tools/verify-android-ad-demo-ui.mjs annotations`

Expected: PASS navSync、annotationScroll、hotspotFlash、badgeToggle、exceptionCoverage。

- [ ] **Step 5: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/verify-android-ad-demo-ui.mjs
git commit -m "feat: complete Android ad demo annotations"
```

## Task 11: 完整构建、自动验证和人工截图验收

**Files:**
- Create: `tools/capture-android-ad-demo.mjs`
- Modify: `tools/verify-android-ad-demo-ui.mjs`
- Verify: `demos/Android广告接入-交互标注版.html`

- [ ] **Step 1: 查找本机 Chrome 并启动本地文件**

```js
import { chromium } from 'playwright-core';
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath, headless: true });
```

若该路径不存在，检查 `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`；两个路径均不存在时明确失败，不静默跳过 UI 验收。

- [ ] **Step 2: 输出验收截图**

截图集合：O1 竖屏三个阶段、O1 横屏三个阶段、H1、P1、C1 签到前/后/加倍成功、G1、Q1、L1 两阶段、后台三页国内/海外，共不少于 20 张，输出到 `.tmp/android-ad-demo-captures/`。

- [ ] **Step 3: 运行所有验证**

```bash
node tools/build-android-ad-demo.mjs
node tools/verify-android-ad-demo.mjs all
node tools/verify-android-ad-demo-ui.mjs all
node tools/capture-android-ad-demo.mjs
```

Expected:

```text
PASS shell
PASS core
PASS assets
PASS scenes
PASS admin
PASS uiSyntax
PASS orientations
PASS nativeIntegration
PASS rewardFlows
PASS l1Safety
PASS adminCrud
PASS annotations
```

- [ ] **Step 4: 人工视觉复核**

逐张确认：原页面结构可辨认；H1/P1 广告前后自然内容关系清楚；C1/G1 使用盖世粉紫毛玻璃；Q1 不再是 CSS GTA Logo；O1 链路完整；L1 不遮挡保护区；后台有产品名、侧栏、地区 Tab、真实列表和抽屉。

- [ ] **Step 5: 最终差异检查**

Run: `git diff --check && git status --short`

Expected: 无空白错误；只包含本计划列出的 Android 广告 Demo、工具和计划文件，不包含用户其他工作区改动。

- [ ] **Step 6: Commit**

```bash
git add demos/Android广告接入-交互标注版.template.html demos/Android广告接入-交互标注版.html tools/android-ad-demo-assets.mjs tools/build-android-ad-demo.mjs tools/embed-android-ad-demo-assets.mjs tools/verify-android-ad-demo.mjs tools/verify-android-ad-demo-ui.mjs tools/capture-android-ad-demo.mjs docs/superpowers/plans/2026-07-17-android-ad-demo-rebuild.md
git commit -m "feat: rebuild Android ad annotated demo"
```

