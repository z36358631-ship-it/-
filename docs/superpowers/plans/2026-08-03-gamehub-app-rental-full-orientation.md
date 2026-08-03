# 盖世游戏 APP 租号功能横竖屏全链路 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 制作符合盖世游戏 APP 现有视觉的横竖屏全链路租号 Demo、交互标注版、自动化检查、PRD 截图和可导入飞书的 APP 租号 PRD。

**Architecture:** 普通 Demo 使用单文件 HTML 和一套共享业务状态机，通过 `orientation` 只切换竖屏与横屏渲染器；标注版复用普通 Demo 的业务状态和页面契约，增加评审导航与说明面板。Playwright 脚本通过稳定的调试 API 设置场景、检查权益分流、验证旋转连续性并生成固定截图，PRD 引用截图提交后的固定 Git SHA 地址。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js、Playwright Core、Chrome、本地 Markdown、GitHub Pages。

---

## 文件结构

- Create: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` — 普通 Demo 可维护源码。
- Create: `demos/APP租号功能/盖世游戏APP租号功能demo.html` — 内嵌图片后的单文件交付物。
- Create: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` — 开发、测试和产品评审使用。
- Create: `tools/build-app-rental-demo.mjs` — 将本地真实素材转成 Data URL 并生成普通 Demo。
- Create: `tools/verify-app-rental-demo.mjs` — 权益、交易、旋转、登录和临期状态自动检查。
- Create: `tools/capture-app-rental-prd-screenshots.mjs` — 横竖屏成对截图并校验 PNG。
- Create: `public/prd/app-rental/*.png` — PRD 使用的固定页面截图。
- Create: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` — APP 客户端专项 PRD。

普通 Demo 不修改 `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`；后台规则只读取 Mac PRD V4.0，不复制后台页面。

### Task 1: 建立普通 Demo 契约与构建流程

**Files:**
- Create: `tools/verify-app-rental-demo.mjs`
- Create: `tools/build-app-rental-demo.mjs`
- Create: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Create: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 写入最小契约检查**

在 `tools/verify-app-rental-demo.mjs` 中创建以下启动检查：

```js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(fs.existsSync(htmlPath), `找不到 Demo：${htmlPath}`);
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const contract = await page.evaluate(() => ({
      orientation: window.__appRentalDemo.snapshot().orientation,
      screen: window.__appRentalDemo.snapshot().screen,
      root: Boolean(document.querySelector('#appRentalDemo')),
    }));
    assert(contract.root, '缺少 #appRentalDemo');
    assert(contract.orientation === 'portrait', '默认方向应为 portrait');
    assert(contract.screen === 'home', '默认页面应为 home');
    process.stdout.write('CONTRACT 3/3 PASS\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
```

- [ ] **Step 2: 运行契约检查并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，提示找不到 `盖世游戏APP租号功能demo.html`。

- [ ] **Step 3: 创建模板的基础状态与公开接口**

在模板中实现以下稳定契约：

```html
<main id="appRentalDemo" data-orientation="portrait" data-screen="home"></main>
<script>
const state = {
  orientation: 'portrait',
  screen: 'home',
  scenario: 'member-library-trial',
  selectedGameId: 'elden-ring',
  selectedSku: 'trial',
  selectedHours: 2,
  order: null,
  credentialVisible: false,
  guardCode: null,
  expiry15Shown: false,
};

function renderApp() {
  const root = document.querySelector('#appRentalDemo');
  root.dataset.orientation = state.orientation;
  root.dataset.screen = state.screen;
  root.innerHTML = `<section class="boot-screen"><strong>盖世游戏</strong></section>`;
}

window.__appRentalDemo = {
  setOrientation(value) { state.orientation = value; renderApp(); },
  navigate(screen) { state.screen = screen; renderApp(); },
  setScenario(value) { state.scenario = value; renderApp(); },
  snapshot() { return JSON.parse(JSON.stringify(state)); },
  reset() { location.reload(); },
};

renderApp();
</script>
```

- [ ] **Step 4: 创建单文件构建脚本**

`tools/build-app-rental-demo.mjs` 必须读取模板，将 `{{ASSET_KEY}}` 替换为指定素材的 Data URL，再写入普通 Demo：

```js
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.template.html');
const outputPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const assets = {
  APP_PORTRAIT_HOME: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260618-120632.jpg'),
  APP_PORTRAIT_LIBRARY: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260521-152042.jpg'),
  APP_LANDSCAPE_LIBRARY: path.join(root, 'APP核心优化', '竞品对比', '盖世游戏APP', '20260521-152120.jpg'),
};

function dataUrl(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

let html = fs.readFileSync(templatePath, 'utf8');
for (const [key, filePath] of Object.entries(assets)) {
  if (!fs.existsSync(filePath)) throw new Error(`素材不存在：${filePath}`);
  html = html.replaceAll(`{{${key}}}`, dataUrl(filePath));
}
if (/\{\{[A-Z0-9_]+\}\}/.test(html)) throw new Error('模板仍存在未替换素材');
fs.writeFileSync(outputPath, html);
process.stdout.write(`BUILD ${path.relative(root, outputPath)} ${Buffer.byteLength(html)} bytes\n`);
```

- [ ] **Step 5: 构建并验证基础契约**

Run: `node tools/build-app-rental-demo.mjs`

Expected: 输出 `BUILD demos\APP租号功能\盖世游戏APP租号功能demo.html`。

Run: `node tools/verify-app-rental-demo.mjs`

Expected: `CONTRACT 3/3 PASS`。

- [ ] **Step 6: 提交基础骨架**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/build-app-rental-demo.mjs tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): scaffold responsive demo contract"
```

### Task 2: 实现共享权益与交易状态机

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加权益矩阵检查**

将以下场景表加入验证脚本并通过公开接口读取结果：

```js
const entitlementCases = [
  ['owned-installed', 'launch', []],
  ['owned-uninstalled', 'download', []],
  ['active-rental', 'continue', ['credential', 'renew']],
  ['not-member-library', 'rent-2h', ['more-duration']],
  ['member-library-trial', 'trial', ['permanent', 'membership']],
  ['member-library-trial-used', 'permanent', ['membership']],
  ['active-member', 'member-play', ['membership-status']],
  ['permanent-owned', 'launch', []],
];

for (const [scenario, primary, secondary] of entitlementCases) {
  await page.evaluate((value) => window.__appRentalDemo.setScenario(value), scenario);
  const result = await page.evaluate(() => window.__appRentalDemo.resolveCurrentAction());
  assert(result.primary === primary, `${scenario} 主操作错误：${result.primary}`);
  assert(JSON.stringify(result.secondary) === JSON.stringify(secondary), `${scenario} 次级操作错误`);
}
```

- [ ] **Step 2: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，提示 `resolveCurrentAction is not a function`。

- [ ] **Step 3: 实现场景数据和纯函数**

模板中增加以下函数，渲染器只能消费结果，不自行重复判断：

```js
const SCENARIOS = {
  'owned-installed': { owns: true, installed: true },
  'owned-uninstalled': { owns: true, installed: false },
  'active-rental': { activeRental: true },
  'not-member-library': { memberLibrary: false },
  'member-library-trial': { memberLibrary: true, trialEligible: true },
  'member-library-trial-used': { memberLibrary: true, trialEligible: false },
  'active-member': { memberLibrary: true, membershipActive: true },
  'permanent-owned': { permanentEntitlement: true },
};

function resolveAction(input) {
  if (input.owns && input.installed) return { primary: 'launch', secondary: [] };
  if (input.owns) return { primary: 'download', secondary: [] };
  if (input.permanentEntitlement) return { primary: 'launch', secondary: [] };
  if (input.activeRental) return { primary: 'continue', secondary: ['credential', 'renew'] };
  if (!input.memberLibrary) return { primary: 'rent-2h', secondary: ['more-duration'] };
  if (input.membershipActive) return { primary: 'member-play', secondary: ['membership-status'] };
  if (input.trialEligible) return { primary: 'trial', secondary: ['permanent', 'membership'] };
  return { primary: 'permanent', secondary: ['membership'] };
}

function resolveCurrentAction() {
  return resolveAction(SCENARIOS[state.scenario]);
}

window.__appRentalDemo.resolveCurrentAction = resolveCurrentAction;
```

- [ ] **Step 4: 实现订单快照与状态迁移**

```js
function createOrder({ sku, amount, priceVersion }) {
  state.order = {
    id: `APP-${Date.now()}`,
    status: 'pending',
    sku,
    amount,
    priceVersion,
    paymentDeadline: Date.now() + 30 * 60 * 1000,
  };
  renderApp();
  return state.order;
}

function payOrder() {
  if (!state.order || state.order.status !== 'pending') return false;
  state.order.status = 'allocating';
  renderApp();
  return true;
}

function allocateAccount(success = true) {
  state.order.status = success ? 'active' : 'refunding';
  renderApp();
}
```

- [ ] **Step 5: 构建并验证状态机**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs`

Expected: 权益矩阵 8/8 PASS，基础契约 PASS。

- [ ] **Step 6: 提交状态机**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): add shared entitlement state machine"
```

### Task 3: 还原竖屏 APP 外壳和发现页面

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加竖屏结构检查**

```js
await page.evaluate(() => {
  window.__appRentalDemo.setOrientation('portrait');
  window.__appRentalDemo.navigate('home');
});
const portrait = await page.evaluate(() => ({
  frame: document.querySelector('.device.portrait')?.getBoundingClientRect().toJSON(),
  nav: [...document.querySelectorAll('.portrait-nav button')].map((node) => node.textContent.trim()),
  primaryCount: document.querySelectorAll('[data-primary-action="true"]').length,
}));
assert(Math.round(portrait.frame.width) === 390, '竖屏宽度不是390');
assert(Math.round(portrait.frame.height) === 844, '竖屏高度不是844');
assert(portrait.nav.join('|') === '首页|玩游戏|排行榜|游戏库|我的', '竖屏导航不一致');
assert(portrait.primaryCount === 1, '首页必须只有一个主操作');
```

- [ ] **Step 2: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，提示缺少 `.device.portrait`。

- [ ] **Step 3: 实现竖屏设备、状态栏和底部导航**

竖屏渲染器必须输出固定结构：

```js
function renderPortraitShell(content, active = 'home') {
  const nav = [
    ['home', '首页'], ['play', '玩游戏'], ['ranking', '排行榜'],
    ['library', '游戏库'], ['profile', '我的'],
  ];
  return `<section class="device portrait">
    <header class="mobile-status"><time>12:04</time><span>120Hz</span><span>100%</span></header>
    <main class="portrait-content">${content}</main>
    <nav class="portrait-nav">${nav.map(([id, label]) =>
      `<button class="${active === id ? 'active' : ''}" data-action="navigate" data-screen="${id}">${icon(id)}<span>${label}</span></button>`
    ).join('')}</nav>
  </section>`;
}
```

- [ ] **Step 4: 完成首页、玩游戏、游戏库和我的页面**

首页租号卡按场景显示“¥1.99 首次体验”“可租号”“会员畅玩”或不显示租号；玩游戏页保留“云游戏、PC游戏、复古游戏”Tab；游戏库保留“PC游戏、Steam游戏、Epic游戏、复古游戏”Tab；我的页面在头像附近显示会员状态并提供租号订单入口。

- [ ] **Step 5: 构建并验证竖屏外壳**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs`

Expected: 竖屏结构、导航和主操作检查 PASS。

- [ ] **Step 6: 提交竖屏基础页面**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): restore portrait app surfaces"
```

### Task 4: 还原横屏 APP 外壳和发现页面

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加横屏结构检查**

```js
await page.evaluate(() => {
  window.__appRentalDemo.setOrientation('landscape');
  window.__appRentalDemo.navigate('library');
});
const landscape = await page.evaluate(() => ({
  frame: document.querySelector('.device.landscape')?.getBoundingClientRect().toJSON(),
  hasTopNav: Boolean(document.querySelector('.landscape-top-nav')),
  hasBottomNav: Boolean(document.querySelector('.landscape .portrait-nav')),
  cards: document.querySelectorAll('.landscape .game-card').length,
}));
assert(Math.round(landscape.frame.width) === 874, '横屏宽度不是874');
assert(Math.round(landscape.frame.height) === 402, '横屏高度不是402');
assert(landscape.hasTopNav && !landscape.hasBottomNav, '横屏导航结构错误');
assert(landscape.cards >= 6, '横屏游戏墙密度不足');
```

- [ ] **Step 2: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，提示缺少 `.device.landscape`。

- [ ] **Step 3: 实现横屏顶部导航和多列游戏墙**

```js
function renderLandscapeShell(content, active = 'library') {
  const nav = [
    ['library', '游戏库'], ['play', '玩游戏'], ['home', '探索'],
    ['ranking', '排行榜'], ['profile', '我的'],
  ];
  return `<section class="device landscape">
    <header class="landscape-top-nav">
      <nav>${nav.map(([id, label]) =>
        `<button class="${active === id ? 'active' : ''}" data-action="navigate" data-screen="${id}">${icon(id)}<span>${label}</span></button>`
      ).join('')}</nav><div class="landscape-system">14:39 · Wi-Fi · 81%</div>
    </header>
    <main class="landscape-content">${content}</main>
  </section>`;
}
```

- [ ] **Step 4: 完成横屏首页、玩游戏、游戏库和我的页面**

横屏使用横向内容卡、顶部筛选和多列游戏墙；禁止复用竖屏底部导航，禁止将竖屏内容容器按比例拉宽。

- [ ] **Step 5: 构建并验证横屏外壳**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs`

Expected: 横屏尺寸、顶部导航和游戏墙检查 PASS。

- [ ] **Step 6: 提交横屏基础页面**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): restore landscape app surfaces"
```

### Task 5: 实现详情、SKU、确认订单和会员中心

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加 SKU 互斥和文案检查**

```js
const skuCases = [
  ['not-member-library', ['2小时租用', '更多租期'], ['首次体验', '单游戏永久畅玩', '开通会员']],
  ['member-library-trial', ['首次体验', '单游戏永久畅玩', '开通会员'], ['日租', '周租']],
  ['member-library-trial-used', ['单游戏永久畅玩', '开通会员'], ['首次体验', '日租', '周租']],
  ['active-member', ['会员畅玩'], ['2小时租用', '首次体验']],
];

for (const [scenario, present, absent] of skuCases) {
  await page.evaluate(({ scenario }) => {
    window.__appRentalDemo.setScenario(scenario);
    window.__appRentalDemo.navigate('detail');
  }, { scenario });
  const text = await page.locator('#appRentalDemo').innerText();
  for (const value of present) assert(text.includes(value), `${scenario} 缺少 ${value}`);
  for (const value of absent) assert(!text.includes(value), `${scenario} 不应显示 ${value}`);
}
```

- [ ] **Step 2: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，详情页未渲染 SKU。

- [ ] **Step 3: 实现方向专属详情布局**

竖屏输出主视觉、权益区和固定底部主按钮；横屏输出左侧游戏信息、右侧权益与操作区。两个渲染器共同调用 `resolveCurrentAction()`，不得自行推导权益。

- [ ] **Step 4: 实现确认订单与更多租期**

`not-member-library` 默认选择2小时，“更多租期”展开3–23小时、日租和周租；会员库模式只显示首次体验与单游戏永久畅玩，并提供独立会员中心入口。订单页必须显示当前游戏、版本、游戏原价、订单金额、支付宝、微信和30分钟倒计时。

- [ ] **Step 5: 实现会员中心和会员游戏库**

会员套餐固定为月度 `¥129`、年度 `¥499`、永久 `¥399` 试运营价，整张套餐卡切换；同时展示对应原价 `¥169`、`¥699`、`¥799`。竖屏使用顶部会员卡和纵向内容，横屏使用左右双栏。

- [ ] **Step 6: 构建并验证交易页面**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs`

Expected: SKU 场景 4/4 PASS，页面无“永久版”孤立文案，统一为“单游戏永久畅玩”。

- [ ] **Step 7: 提交交易和会员页面**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): add checkout and membership journeys"
```

### Task 6: 实现订单、支付、登录信息和 Steam 手动登录

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加订单和凭据安全检查**

```js
await page.evaluate(() => {
  window.__appRentalDemo.setScenario('active-rental');
  window.__appRentalDemo.navigate('orders');
});
assert(!(await page.locator('#appRentalDemo').innerText()).includes('gh_rental_2607'), '凭据不应默认裸露');
await page.getByRole('button', { name: '登录信息' }).click();
assert((await page.locator('#appRentalDemo').innerText()).includes('gh_rental_2607'), '打开登录信息后应显示账号');
await page.getByRole('button', { name: '获取验证码' }).click();
assert(/\b\d{5}\b/.test(await page.locator('#appRentalDemo').innerText()), '未显示5位 Steam Guard 验证码');
```

- [ ] **Step 2: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，订单页不存在“登录信息”。

- [ ] **Step 3: 实现订单中心和订单详情**

订单状态覆盖待支付、分配中、进行中、已结束、退款中；竖屏使用状态 Tab 和列表，横屏使用列表与详情双栏。进行中订单提供“继续游戏、登录信息、继续畅玩、申请售后”。

- [ ] **Step 4: 实现登录方式和凭据视图**

默认突出一键上号；手动登录打开 Steam 登录页。订单“登录信息”只打开独立凭据面板，不拉起 Steam；Steam 登录页使用顶部“租号登录信息”轻入口打开同一凭据状态。

- [ ] **Step 5: 实现验证码按需获取**

```js
function requestGuardCode() {
  if (!state.order || state.order.status !== 'active') return false;
  state.guardCode = '48291';
  state.guardExpiresAt = Date.now() + 30 * 1000;
  renderApp();
  return true;
}
```

关闭、重新打开订单凭据面板或 Steam 辅助浮层时，未过期验证码继续复用；到期后只刷新验证码，不重复取号。

- [ ] **Step 6: 构建并验证登录流程**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs`

Expected: 凭据默认隐藏、主动查看、验证码获取和两个入口共用状态全部 PASS。

- [ ] **Step 7: 提交订单和登录流程**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): add orders and steam login assistance"
```

### Task 7: 实现旋转连续性、15分钟提醒、到期和异常状态

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Modify: `tools/verify-app-rental-demo.mjs`
- Regenerate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加旋转连续性检查**

```js
await page.evaluate(() => {
  window.__appRentalDemo.setScenario('not-member-library');
  window.__appRentalDemo.navigate('checkout');
  window.__appRentalDemo.selectSku('hourly');
  window.__appRentalDemo.selectHours(8);
  window.__appRentalDemo.createOrder({ sku: 'hourly-8h', amount: 18, priceVersion: 'APP-PRICE-01' });
  window.__appRentalDemo.setOrientation('landscape');
});
const rotated = await page.evaluate(() => window.__appRentalDemo.snapshot());
assert(rotated.screen === 'checkout', '旋转后页面丢失');
assert(rotated.selectedHours === 8, '旋转后时长丢失');
assert(rotated.order?.sku === 'hourly-8h', '旋转后订单快照丢失');
```

- [ ] **Step 2: 增加临期提醒次数检查**

```js
await page.evaluate(() => {
  window.__appRentalDemo.setScenario('active-rental');
  window.__appRentalDemo.triggerExpiryMinutes(15);
});
let reminderText = await page.locator('#appRentalDemo').innerText();
assert(reminderText.includes('租用时间快结束了'), '15分钟提醒未出现');
await page.getByRole('button', { name: '关闭提醒' }).click();
await page.evaluate(() => window.__appRentalDemo.triggerExpiryMinutes(5));
reminderText = await page.locator('#appRentalDemo').innerText();
assert(!reminderText.includes('租用时间快结束了'), '5分钟不应再次提醒');
```

- [ ] **Step 3: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，缺少旋转状态和 `triggerExpiryMinutes`。

- [ ] **Step 4: 实现15分钟提醒与到期处理**

```js
function triggerExpiryMinutes(minutes) {
  if (minutes === 15 && !state.expiry15Shown) {
    state.expiry15Shown = true;
    state.overlay = 'expiry-15';
  }
  if (minutes <= 0) {
    state.overlay = 'expired';
    state.credentialVisible = false;
    state.guardCode = null;
    if (state.order) state.order.status = 'ended';
  }
  renderApp();
}
```

代码中不得存在5分钟或1分钟提醒分支。

- [ ] **Step 5: 实现无库存、价格变化、分配失败和网络异常**

每个异常场景必须有可恢复动作：无库存返回详情并禁用购买；价格变化回到确认订单重新确认；分配失败显示自动退款；网络异常保留订单号并提供重新查询。

- [ ] **Step 6: 构建并验证全部状态**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs`

Expected: 旋转连续性 PASS，15分钟提醒 PASS，5分钟无提醒 PASS，页面脚本错误为0。

- [ ] **Step 7: 提交状态与异常处理**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): preserve state across rotation and expiry"
```

### Task 8: 生成交互标注版

**Files:**
- Create: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加标注版结构检查**

```js
const annotationPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能-标注版.html');
assert(fs.existsSync(annotationPath), '缺少标注版 Demo');
const annotationPage = await browser.newPage({ viewport: { width: 1680, height: 980 } });
await annotationPage.goto(pathToFileURL(annotationPath).href, { waitUntil: 'domcontentloaded' });
assert(await annotationPage.locator('#flowNav').isVisible(), '缺少左侧页面导航');
assert(await annotationPage.locator('#demoStage').isVisible(), '缺少中间可操作 Demo');
assert(await annotationPage.locator('#annotationPanel').isVisible(), '缺少右侧标注面板');
```

- [ ] **Step 2: 运行并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: FAIL，提示缺少标注版 Demo。

- [ ] **Step 3: 创建三栏标注框架**

标注版内嵌普通 Demo 代码，不使用 iframe；左侧按“发现、详情、订单、会员、登录、临期、售后、异常”分组，右侧提供“交互说明、异常边界、数据与状态”三个 Tab。

- [ ] **Step 4: 标记横竖屏对应关系**

每个标注条目包含：触发条件、竖屏位置、横屏位置、操作反馈、状态依赖、异常结果，不在标注中产生普通 Demo 不存在的功能。

- [ ] **Step 5: 验证标注版**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 普通 Demo 与标注版全部检查 PASS。

- [ ] **Step 6: 提交标注版**

```powershell
git add -- "demos/APP租号功能/盖世游戏APP租号功能-标注版.html" tools/verify-app-rental-demo.mjs
git commit -m "docs(app-rental): add interactive annotated demo"
```

### Task 9: 生成横竖屏 PRD 截图

**Files:**
- Create: `tools/capture-app-rental-prd-screenshots.mjs`
- Create: `public/prd/app-rental/*.png`

- [ ] **Step 1: 创建截图清单**

```js
const shots = [
  ['01-discovery-portrait.png', 'portrait', 'home', 'member-library-trial'],
  ['01-discovery-landscape.png', 'landscape', 'home', 'member-library-trial'],
  ['02-detail-portrait.png', 'portrait', 'detail', 'member-library-trial'],
  ['02-detail-landscape.png', 'landscape', 'detail', 'member-library-trial'],
  ['03-checkout-portrait.png', 'portrait', 'checkout', 'not-member-library'],
  ['03-checkout-landscape.png', 'landscape', 'checkout', 'not-member-library'],
  ['04-membership-portrait.png', 'portrait', 'membership', 'member-library-trial-used'],
  ['04-membership-landscape.png', 'landscape', 'membership', 'member-library-trial-used'],
  ['05-orders-portrait.png', 'portrait', 'orders', 'active-rental'],
  ['05-orders-landscape.png', 'landscape', 'orders', 'active-rental'],
  ['06-steam-login-portrait.png', 'portrait', 'steam-login', 'active-rental'],
  ['06-steam-login-landscape.png', 'landscape', 'steam-login', 'active-rental'],
  ['07-expiry-15m-portrait.png', 'portrait', 'orders', 'active-rental'],
  ['07-expiry-15m-landscape.png', 'landscape', 'orders', 'active-rental'],
  ['08-after-sales-portrait.png', 'portrait', 'after-sales', 'active-rental'],
  ['08-after-sales-landscape.png', 'landscape', 'after-sales', 'active-rental'],
];
```

- [ ] **Step 2: 实现截图状态设置**

每张图打开普通 Demo 后依次调用 `setOrientation`、`setScenario`、`navigate`；临期图额外调用 `triggerExpiryMinutes(15)`。截图前等待所有图片 `complete && naturalWidth > 0`。

- [ ] **Step 3: 校验 PNG 与尺寸**

竖屏截图设备区域必须为390×844，横屏必须为874×402；文件头必须为 `89 50 4E 47 0D 0A 1A 0A`，所有截图大小必须大于20KB。

- [ ] **Step 4: 执行截图**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 16/16 PASS`，输出目录为 `public/prd/app-rental`。

- [ ] **Step 5: 人工查看全部截图**

使用图片查看工具逐张检查文字截断、横屏拉伸、弹窗遮挡、底部导航重叠和素材加载失败；发现问题回到模板修正后重新构建和截图。

- [ ] **Step 6: 提交截图**

```powershell
git add -- tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental
git commit -m "docs(app-rental): add portrait and landscape prd screenshots"
```

### Task 10: 使用 /to-prd 生成 APP 租号 PRD

**Files:**
- Create: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Reference: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
- Reference: `docs/superpowers/specs/2026-08-01-gamehub-app-rental-full-orientation-design.md`

- [ ] **Step 1: 读取 /to-prd 技能和模板引用**

完整读取 `.agents/skills/to-prd/SKILL.md` 及其指定的模板、自查清单、UI规范和飞书图片规则。APP PRD 不重新描述完整后台页面，后台共同规则引用 Mac PRD V4.0，并列出 APP 接入需要的接口与状态。

- [ ] **Step 2: 创建 APP PRD 版本信息**

版本信息至少包含：APP 横竖屏全链路、SKU互斥、已有游戏避让、会员中心、订单与登录、旋转连续性、仅15分钟临期提醒、复用后台与灰度规则。

- [ ] **Step 3: 用一张 C 端大表汇总功能**

C 端功能大表按连续行覆盖：首页/玩游戏/游戏库曝光、详情、确认订单、会员中心、个人中心、租号订单、登录方式、Steam 手动登录、15分钟提醒、到期、售后和异常；每行包含横竖屏差异、触发条件、展示规则、操作结果、异常边界和图示。

- [ ] **Step 4: 写入两图同表格单元格的固定截图**

先执行以下命令取得截图提交的真实40位 SHA：

```powershell
$screenshotSha = git rev-parse HEAD
if ($screenshotSha.Length -ne 40) { throw "截图提交 SHA 无效：$screenshotSha" }
```

每个页面行最多放一张竖屏和一张横屏图；把 `$screenshotSha` 命令输出的实际值逐字写入两条 `raw.githubusercontent.com/z36358631/-/` 图片地址，竖屏图和横屏图之间使用 `<br>`，不得使用 `master`、`main`、相对路径或变量名。

- [ ] **Step 5: 校验 PRD 内容**

Run: `rg -n "TBD|TODO|raw.githubusercontent.com/z36358631/-/(master|main)/|到期前5分钟|5分钟提醒|1分钟提醒" "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"`

Expected: 仅允许出现“明确不设置5分钟或1分钟提醒”的否定说明，不存在占位符。

- [ ] **Step 6: 校验所有图片 URL**

提取 PRD 中全部 `https://raw.githubusercontent.com/` 地址，对每个地址执行 HTTP GET；状态必须为200、`Content-Type` 必须为 `image/png`、文件头必须为 PNG。

- [ ] **Step 7: 提交 PRD**

```powershell
git add -- "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
git commit -m "docs(app-rental): add app rental prd"
```

### Task 11: 最终视觉、交互和发布检查

**Files:**
- Modify if required: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Regenerate if required: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Modify if required: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`

- [ ] **Step 1: 运行完整自动检查**

Run: `node tools/build-app-rental-demo.mjs && node tools/verify-app-rental-demo.mjs && node tools/capture-app-rental-prd-screenshots.mjs`

Expected: 构建成功、全部 smoke PASS、16张截图 PASS、页面脚本错误0。

- [ ] **Step 2: 检查临期规则**

Run: `rg -n "expiry5|expiry1|到期前5分钟|到期前1分钟|5分钟提醒|1分钟提醒" "demos/APP租号功能" tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs`

Expected: 不存在5分钟或1分钟提醒实现，只允许否定说明或测试断言。

- [ ] **Step 3: 检查单文件和外部依赖**

Run: `rg -n 'https?://|<iframe|src="http|src="/|src="\.\.' "demos/APP租号功能/盖世游戏APP租号功能demo.html"`

Expected: 普通 Demo 不依赖外部图片、CDN 或 iframe。

- [ ] **Step 4: 检查工作区隔离**

Run: `git diff --name-only 500d6948..HEAD`

Expected: 只包含 APP 租号 Demo、验证脚本、截图、APP PRD 和计划；不包含 Mac 租号 Demo、Mac PRD 或其他用户文件。

- [ ] **Step 5: 提交最终修正**

```powershell
git add -- "demos/APP租号功能" tools/verify-app-rental-demo.mjs tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental "prd/【盖世游戏APP】游戏租号需求"
git commit -m "refine(app-rental): complete full-orientation delivery"
```

- [ ] **Step 6: 推送并生成预览地址**

Run: `git push origin master`

Expected: 推送成功。

预览地址：

```text
https://z36358631-ship-it.github.io/-/demos/APP%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BD/%E7%9B%96%E4%B8%96%E6%B8%B8%E6%88%8FAPP%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BDdemo.html
https://z36358631-ship-it.github.io/-/demos/APP%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BD/%E7%9B%96%E4%B8%96%E6%B8%B8%E6%88%8FAPP%E7%A7%9F%E5%8F%B7%E5%8A%9F%E8%83%BD-%E6%A0%87%E6%B3%A8%E7%89%88.html
```

## 自查结果

- 规格覆盖：横竖屏页面、SKU、会员、订单、登录、凭据、旋转、15分钟提醒、到期、异常、标注、截图和 PRD 均有对应任务。
- 文件边界：APP 新文件独立，不修改 Mac Demo 与 Mac PRD。
- 类型一致：公开接口统一使用 `setOrientation`、`navigate`、`setScenario`、`snapshot`、`resolveCurrentAction`、`triggerExpiryMinutes`。
- 提醒规则：只实现15分钟提醒，5分钟和1分钟仅作为“不应出现”的测试断言。
- 图片规则：PRD 只使用截图提交后的固定 Git SHA，不使用分支地址、相对路径或动态链接。
