# 盖世游戏 APP 租号功能 Mac 衍生式横竖屏重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 APP 租号 Demo 重构为“核心页面保留 APP 导航、独立任务页继承 Mac 骨架、竖屏同序适配”的高保真横竖屏完整链路。

**Architecture:** 保留现有单文件模板、构建脚本与共享业务状态机，在同一组件树上增加 `core-shell/task-shell` 页面壳层和来源路由状态。横屏任务页使用 Mac 已确认的信息架构，竖屏只改变模块排列和滚动策略；权益、订单、登录、Guard、临期、到期和售后逻辑保持单一实现。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js 构建脚本、Playwright 自动验证、PNG 截图、Markdown PRD。

---

## 文件结构

| 文件 | 职责 | 本期操作 |
|---|---|---|
| `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` | 普通 Demo 唯一业务与界面源模板 | 修改壳层、路由、横竖屏布局和样式 |
| `demos/APP租号功能/盖世游戏APP租号功能demo.html` | 构建后的可运行单文件 Demo | 由构建脚本生成 |
| `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` | 三栏交互标注版 | 同步普通 Demo 结构并更新标注 |
| `tools/build-app-rental-demo.mjs` | 内联本地素材并生成普通 Demo | 保持构建职责，补充生成后结构校验 |
| `tools/verify-app-rental-demo.mjs` | 普通版与标注版自动验证 | 增加壳层、可读性、返回来源和禁止缩放检查 |
| `tools/capture-app-rental-prd-screenshots.mjs` | 生成横竖屏 PRD 截图 | 更新页面状态和截图清单 |
| `public/prd/app-rental/*.png` | 飞书 PRD 固定截图 | 全量重新生成并目检 |
| `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` | 单一标准 PRD | 追加版本并替换页面结构、图示和交互说明 |

---

### Task 1: 建立核心页/任务页和可读性失败契约

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs:40-205`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 定义页面壳层断言**

在验证脚本中增加以下页面集合和检查：

```js
const CORE_SCREENS = ['home', 'library', 'community', 'ranking', 'profile', 'search'];
const TASK_SCREENS = [
  'detail', 'checkout', 'membership', 'member-library', 'orders',
  'order-detail', 'steam-login', 'after-sales',
];

for (const orientation of ['portrait', 'landscape']) {
  for (const screen of CORE_SCREENS) {
    await page.evaluate(({ orientation, screen }) => {
      window.__appRentalDemo.setOrientation(orientation);
      window.__appRentalDemo.go(screen);
    }, { orientation, screen });
    const shell = await page.locator('#appRentalDemo').getAttribute('data-shell');
    assert(shell === 'core', `${orientation} ${screen} 必须使用 core-shell`);
  }
  for (const screen of TASK_SCREENS) {
    await page.evaluate(({ orientation, screen }) => {
      window.__appRentalDemo.setOrientation(orientation);
      window.__appRentalDemo.go(screen);
    }, { orientation, screen });
    const state = await page.locator('#appRentalDemo').evaluate((root) => ({
      shell: root.dataset.shell,
      globalNav: Boolean(root.querySelector('.portrait-nav, .landscape-top-nav')),
    }));
    assert(state.shell === 'task' && !state.globalNav, `${orientation} ${screen} 不得出现全局导航`);
  }
}
```

- [ ] **Step 2: 增加可读性和禁止整体缩放检查**

```js
const readability = await page.locator('#appRentalDemo').evaluate((root) => {
  const visible = [...root.querySelectorAll('p, label, input, textarea, button, .order-summary-row')]
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
    });
  return {
    undersizedText: visible
      .filter((node) => Number.parseFloat(getComputedStyle(node).fontSize) < 12)
      .map((node) => node.textContent.trim().slice(0, 30)),
    undersizedActions: visible
      .filter((node) => node.matches('button, input, textarea'))
      .filter((node) => node.getBoundingClientRect().height < 44)
      .map((node) => node.getAttribute('aria-label') || node.textContent.trim().slice(0, 30)),
    rootTransform: getComputedStyle(root).transform,
  };
});
assert(readability.undersizedText.length === 0, `存在小于12px可见文字：${readability.undersizedText}`);
assert(readability.undersizedActions.length === 0, `存在小于44px操作区：${readability.undersizedActions}`);
assert(readability.rootTransform === 'none', 'Demo 根页面不得整体缩放');
```

- [ ] **Step 3: 运行验证并确认失败**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 壳层断言因缺少 `data-shell` 或任务页仍有横屏顶部导航而失败；原有业务用例仍可运行。

- [ ] **Step 4: 提交失败契约**

```bash
git add tools/verify-app-rental-demo.mjs
git commit -m "test(app-rental): define mac-derived shell and readability contract"
```

---

### Task 2: 实现路由分层、来源返回与共享任务壳层

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1028-1380`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1980-2550`
- Modify: `tools/verify-app-rental-demo.mjs`
- Generate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加页面类型和来源状态**

```js
const CORE_SCREENS = new Set(['home', 'library', 'community', 'ranking', 'profile', 'search']);
const TASK_FALLBACK = {
  detail: 'home',
  checkout: 'detail',
  membership: 'profile',
  'member-library': 'membership',
  orders: 'profile',
  'order-detail': 'orders',
  'steam-login': 'orders',
  'after-sales': 'order-detail',
};

state.routeContext = {
  sourceScreen: 'home',
  sourceScrollTop: 0,
  taskStack: [],
};

function isCoreScreen(screen) {
  return CORE_SCREENS.has(screen);
}
```

- [ ] **Step 2: 改造导航与返回**

```js
function navigate(screen, { rememberSource = true } = {}) {
  const current = state.screen;
  if (rememberSource && isCoreScreen(current) && !isCoreScreen(screen)) {
    state.routeContext.sourceScreen = current;
    state.routeContext.sourceScrollTop = readCurrentScrollTop();
  }
  if (!isCoreScreen(screen) && current !== screen) {
    state.routeContext.taskStack.push(current);
  }
  state.screen = screen;
  render();
}

function taskBack() {
  const previous = state.routeContext.taskStack.pop();
  const target = previous || TASK_FALLBACK[state.screen] || state.routeContext.sourceScreen || 'home';
  state.screen = target;
  render();
  restoreSourceScrollIfNeeded(target);
}
```

所有任务页返回按钮统一使用 `data-action="task-back"`，不再写死 `home/profile`。

- [ ] **Step 3: 输出 `core-shell/task-shell`**

```js
function renderPortraitShell(content, active = 'home') {
  const core = isCoreScreen(state.screen);
  return `<section class="device portrait ${core ? 'core-shell' : 'task-shell'}" data-shell="${core ? 'core' : 'task'}">
    ${portraitSystem()}
    <main class="portrait-content">${content}</main>
    ${core ? renderPortraitNavigation(active) : ''}
    ${renderPortraitFooter(state.screen)}
  </section>`;
}

function renderLandscapeShell(content, active = 'library') {
  const core = isCoreScreen(state.screen);
  return `<section class="device landscape ${core ? 'core-shell' : 'task-shell'}" data-shell="${core ? 'core' : 'task'}">
    ${core ? renderLandscapeNavigation(active) : ''}
    <main class="landscape-content">${content}</main>
  </section>`;
}
```

- [ ] **Step 4: 构建并验证壳层**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 核心页/任务页壳层与导航检查通过；既有权益和交易用例无回归。

- [ ] **Step 5: 提交路由与壳层**

```bash
git add demos/APP租号功能/盖世游戏APP租号功能demo.template.html demos/APP租号功能/盖世游戏APP租号功能demo.html tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): split core and task page shells"
```

---

### Task 3: 用 Mac 骨架重做横屏任务页

**Files:**
- Reference: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html:428-470`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2470-2545`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1-1000`
- Modify: `tools/verify-app-rental-demo.mjs`
- Generate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 建立横屏 Mac 衍生布局令牌**

```css
.device.landscape.task-shell {
  --task-pad: 18px;
  --task-gap: 16px;
  --task-title: 22px;
  --task-body: 14px;
  background: #0d0f10;
}
.landscape-task-page {
  position: absolute;
  inset: 0;
  overflow: hidden;
  padding: var(--task-pad);
}
.task-page-head {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 12px;
}
.task-page-head h1 { font-size: var(--task-title); line-height: 1.2; }
.task-scroll-region { min-height: 0; overflow: auto; scrollbar-width: none; }
```

- [ ] **Step 2: 抽出横竖共用内容组件**

```js
function renderTaskHeader(title, { close = false } = {}) {
  return `<header class="task-page-head">
    <button class="task-back" type="button" data-action="task-back" aria-label="${close ? '关闭' : '返回'}">${close ? '×' : icon('back')}</button>
    <h1>${title}</h1>
  </header>`;
}

function renderGameContextCard(game, order = null) { /* 输出封面、名称、版本和订单上下文 */ }
function renderPriceSummary(order) { /* 输出游戏原价、套餐租期、订单金额和锁价倒计时 */ }
function renderPaymentPanel(kind) { /* 输出支付宝、微信、二维码和唯一主按钮 */ }
```

实现时函数必须返回当前模板已有真实数据和已确认文案，不增加新业务入口。

- [ ] **Step 3: 重做详情与确认订单**

横屏详情输出 `.mac-derived-detail`：左侧主视觉与游戏信息、右侧权益与固定主操作。横屏确认订单输出 `.mac-derived-checkout`：左侧游戏与服务保障、右侧版本/SKU/价格/支付，右侧主按钮始终可见。

```js
function renderLandscapeCheckout() {
  return `<section class="landscape-task-page mac-derived-checkout" data-layout="landscape-checkout">
    ${renderTaskHeader('确认订单')}
    <div class="mac-checkout-layout">
      <section class="checkout-benefit-column task-scroll-region">${renderGameContextCard(game, order)}${renderBenefits()}</section>
      <section class="checkout-purchase-column">${renderVersionAndSku()}${renderPriceSummary(order)}${renderPaymentPanel('game')}</section>
    </div>
  </section>`;
}
```

- [ ] **Step 4: 重做会员、订单、Steam 与售后**

横屏会员中心使用“用户信息＋三张完整套餐卡＋右侧支付＋下方游戏库”；订单使用35%列表＋65%详情；Steam 使用 Mac 双栏；售后使用左订单摘要＋右表单。

必须保留这些选择器供自动验证：

```text
[data-layout="landscape-membership"]
[data-layout="landscape-orders"]
[data-layout="landscape-steam-login"]
[data-layout="landscape-after-sales"]
.steam-login-columns
.order-list-pane
.order-detail-pane
```

- [ ] **Step 5: 增加横屏结构和字号断言**

```js
assert(await page.locator('.mac-derived-checkout .checkout-benefit-column').count() === 1, '横屏订单缺少 Mac 左侧权益区');
assert(await page.locator('.mac-derived-checkout .checkout-purchase-column').count() === 1, '横屏订单缺少 Mac 右侧购买区');
assert(await page.locator('.landscape-membership .membership-plan-card').count() === 3, '横屏会员套餐不完整');
assert(await page.locator('.steam-login-columns').count() === 1, 'Steam 横屏未继承双栏结构');
```

- [ ] **Step 6: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 横屏结构、字号、主按钮、权益、订单、登录和售后检查全部通过。

```bash
git add demos/APP租号功能/盖世游戏APP租号功能demo.template.html demos/APP租号功能/盖世游戏APP租号功能demo.html tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): inherit mac task layouts on landscape"
```

---

### Task 4: 用同一组件完成竖屏同序适配

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2030-2325`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:1-1000`
- Modify: `tools/verify-app-rental-demo.mjs`
- Generate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 定义竖屏任务页布局**

```css
.device.portrait.task-shell .portrait-content {
  inset: 0;
  padding: 0 16px calc(104px + env(safe-area-inset-bottom));
}
.portrait-task-page { min-height: 100%; }
.portrait-task-page .task-page-head {
  position: sticky;
  z-index: 20;
  top: 0;
  height: 58px;
  background: linear-gradient(#17121f 80%, transparent);
}
.portrait-task-stack { display: grid; gap: 14px; }
.portrait-fixed-footer { min-height: 76px; }
```

- [ ] **Step 2: 按相同模块顺序重排**

```js
function renderPortraitCheckout() {
  return `<section class="portrait-task-page" data-layout="portrait-checkout">
    ${renderTaskHeader('确认订单')}
    <div class="portrait-task-stack">
      ${renderGameContextCard(game, order)}
      ${renderVersionAndSku()}
      ${renderPriceSummary(order)}
      ${renderPaymentPanel('game')}
      ${renderBenefits({ collapsible: true })}
    </div>
  </section>`;
}
```

详情、会员、订单详情、Steam、售后和到期都按设计规格第6章的顺序输出；订单列表与详情保持两个独立竖屏页面。

- [ ] **Step 3: 保留固定主操作与键盘安全区**

支付、详情、会员和售后主按钮使用 `.portrait-fixed-footer`；Steam 表单不使用固定提交按钮，键盘弹出时当前输入框可滚动到可见区域。

- [ ] **Step 4: 增加首屏可读性断言**

```js
for (const screen of ['detail', 'checkout', 'membership', 'order-detail', 'steam-login', 'after-sales']) {
  await page.evaluate((screen) => window.__appRentalDemo.go(screen), screen);
  const overflow = await page.locator('.device.portrait').evaluate((root) => root.scrollWidth > root.clientWidth);
  assert(!overflow, `竖屏 ${screen} 出现横向溢出`);
}
```

- [ ] **Step 5: 构建、验证并提交**

Run: `node tools/build-app-rental-demo.mjs`

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 竖屏任务页无全局导航、无横向溢出、首屏关键内容可见，全部旧业务用例通过。

```bash
git add demos/APP租号功能/盖世游戏APP租号功能demo.template.html demos/APP租号功能/盖世游戏APP租号功能demo.html tools/verify-app-rental-demo.mjs
git commit -m "feat(app-rental): adapt mac task hierarchy to portrait"
```

---

### Task 5: 完成返回来源、旋转连续性和异常回归

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs:1050-1410`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`
- Generate: `demos/APP租号功能/盖世游戏APP租号功能demo.html`

- [ ] **Step 1: 增加来源返回用例**

```js
await page.evaluate(() => {
  window.__appRentalDemo.setOrientation('portrait');
  window.__appRentalDemo.go('library');
});
await page.locator('[data-screen="detail"]').first().click();
assert((await page.evaluate(() => window.__appRentalDemo.snapshot().routeContext.sourceScreen)) === 'library', '详情未记录游戏库来源');
await page.locator('[data-action="task-back"]').click();
assert((await page.evaluate(() => window.__appRentalDemo.snapshot().screen)) === 'library', '任务页未返回来源核心页');
```

- [ ] **Step 2: 增加深链兜底和旋转用例**

```js
const fallback = await page.evaluate(() => {
  window.__appRentalDemo.setRouteContext({ sourceScreen: null, taskStack: [] });
  window.__appRentalDemo.go('order-detail');
  window.__appRentalDemo.taskBack();
  return window.__appRentalDemo.snapshot().screen;
});
assert(fallback === 'orders', '订单深链返回兜底错误');
```

在确认订单、会员、Steam、售后和15分钟提醒状态下旋转，断言订单号、套餐、输入、Guard、草稿、提醒次数和来源路由不变。

- [ ] **Step 3: 修复新增用例暴露的问题**

只修正路由状态、滚动恢复和布局连续性；不得修改已确认权益、价格、支付、凭据和到期规则。

- [ ] **Step 4: 运行全量验证并提交**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 所有原用例和新增壳层、可读性、来源、深链、旋转用例通过。

```bash
git add demos/APP租号功能/盖世游戏APP租号功能demo.template.html demos/APP租号功能/盖世游戏APP租号功能demo.html tools/verify-app-rental-demo.mjs
git commit -m "fix(app-rental): preserve task context across return and rotation"
```

---

### Task 6: 同步重做交互标注版

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Modify: `tools/verify-app-rental-demo.mjs:1430-1585`

- [ ] **Step 1: 同步普通 Demo 的壳层、CSS、渲染与路由逻辑**

标注版中间 Demo 必须与普通版保持相同 `data-shell`、任务页结构、路由状态、字号和交互；标注外壳继续响应式缩放，但中间 Demo 自身禁止整体缩放。

- [ ] **Step 2: 更新左侧页面组和右侧说明**

```js
const ANNOTATION_GROUPS = [
  ['core', '核心入口'],
  ['detail', '详情'],
  ['checkout', '订单'],
  ['membership', '会员'],
  ['login', '登录'],
  ['expiry', '临期与到期'],
  ['after-sales', '售后'],
  ['exception', '异常'],
];
```

右侧明确标注：核心页保留 APP 导航；任务页不保留全局导航；横屏继承 Mac 骨架；竖屏同序适配；正文、按钮和返回规则。

- [ ] **Step 3: 增加标注版一致性断言**

```js
assertAnnotation(await annotationPage.locator('[data-shell="task"]').count() === 1, '标注版任务页壳层未同步');
assertAnnotation(await annotationPage.locator('[data-shell="task"] .landscape-top-nav').count() === 0, '标注版任务页仍有全局导航');
assertAnnotation((await annotationPage.locator('[data-annotation-group]').count()) >= 8, '标注分组不完整');
```

- [ ] **Step 4: 运行验证并提交**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 普通版和标注版全量检查通过。

```bash
git add demos/APP租号功能/盖世游戏APP租号功能-标注版.html tools/verify-app-rental-demo.mjs
git commit -m "docs(app-rental): align annotation with mac-derived layouts"
```

---

### Task 7: 重新生成并审查 PRD 截图

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs`
- Replace: `public/prd/app-rental/*.png`

- [ ] **Step 1: 更新截图清单**

保留8组横竖屏截图：发现、详情、确认订单、会员中心、订单、Steam 登录、15分钟提醒、售后。核心发现页必须显示 APP 导航；其余7组任务页不得显示全局导航。

- [ ] **Step 2: 执行截图并校验尺寸**

Run: `node tools/capture-app-rental-prd-screenshots.mjs`

Expected: `CAPTURE 16/16 PASS`；竖屏为390×844，横屏为874×402，全部为PNG。

- [ ] **Step 3: 原尺寸视觉检查**

逐张检查：

- 文字无需放大即可阅读。
- 横屏任务页与 Mac 对应页面结构一致。
- 竖屏首屏显示任务上下文、价格/状态和主操作。
- 任务页无 APP 全局导航。
- Steam 输入框为空，截图无账号、密码或 Guard。
- 15分钟提醒不遮挡标题和关键按钮。

- [ ] **Step 4: 提交截图**

```bash
git add tools/capture-app-rental-prd-screenshots.mjs public/prd/app-rental
git commit -m "docs(app-rental): refresh mac-derived prd screenshots"
```

记录该提交完整 SHA，PRD 图片只引用此 SHA。

---

### Task 8: 按 /to-prd 更新单一 PRD

**Files:**
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`

- [ ] **Step 1: 追加版本记录**

新增 V1.1：修正横竖屏页面架构，核心页面保留 APP 导航，详情及租号全链路改为独立任务页；横屏继承 Mac，竖屏同序适配；16张图替换为新固定提交。

- [ ] **Step 2: 更新 C 端一张连续大表**

在原4.2大表中统一修正：

- 哪些页面保留全局导航。
- 哪些页面为独立任务页。
- 横屏 Mac 骨架与竖屏排列。
- 返回来源、深链兜底、字号、滚动和固定主按钮。
- 原权益、SKU、交易、登录、安全、临期、到期和售后规则保持不变。

- [ ] **Step 3: 替换16张固定截图链接**

先读取 Task 7 截图提交的完整 SHA，再机械替换 PRD 中16条旧图片地址：

```powershell
$sha = (git rev-parse HEAD).Trim()
$cdnPrefix = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$sha/public/prd/app-rental/"
```

每条图片保持标准 Markdown 图片语法，地址由 `$cdnPrefix` 与真实 PNG 文件名拼接；正文不得保留变量、尖括号或其他占位符。

- [ ] **Step 4: 执行本地结构校验**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".agents\skills\to-prd\scripts\validate-prd-images.ps1" -PrdPath "prd\【盖世游戏APP】游戏租号需求\【Prd】《盖世游戏APP》游戏租号需求.md"
```

Expected: `ImageCount=16`、`UniqueImageCount=16`、`Errors=[]`。

- [ ] **Step 5: 提交 PRD**

```bash
git add "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
git commit -m "docs(app-rental): align prd with mac-derived app layouts"
```

---

### Task 9: 最终验收与安全发布

**Files:**
- Verify: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Verify: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Verify: `public/prd/app-rental/*.png`
- Verify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`

- [ ] **Step 1: 运行全量自动验证**

Run: `node tools/verify-app-rental-demo.mjs`

Expected: 所有分组 PASS，数量不低于重构前235项，且新增壳层/可读性/来源检查计入结果。

- [ ] **Step 2: 检查工作区隔离**

Run:

```powershell
git status --short -- "demos/APP租号功能" "tools/build-app-rental-demo.mjs" "tools/verify-app-rental-demo.mjs" "tools/capture-app-rental-prd-screenshots.mjs" "public/prd/app-rental" "prd/【盖世游戏APP】游戏租号需求"
```

Expected: 本任务文件全部已提交；不暂存、不提交其他工作区改动。

- [ ] **Step 3: 安全推送远端**

若本地与远端历史仍不相交，在干净临时 worktree 中从 `refs/remotes/origin/master` 重放本任务提交，禁止强推。推送前确认远端 `master` 是发布分支祖先。

- [ ] **Step 4: 验证线上 Demo 与图片**

普通 Demo 和标注版必须返回 HTTP 200、`text/html`；16张图片必须返回 HTTP 200、正确 `image/png` 且 PNG 文件头为 `89504E470D0A1A0A`。

- [ ] **Step 5: 最终交付**

向用户提供普通 Demo、标注版在线地址、PRD 本地路径、远端提交、自动验证结果和按页面编号的一行一句功能总结。

---

## 计划自检

- 规格覆盖：核心/任务壳层、Mac 横屏、竖屏适配、路由返回、旋转连续性、可读性、异常、标注、截图、PRD和发布均有对应任务。
- 文件边界：业务逻辑仍在单一模板；普通版由构建脚本生成；标注版只同步展示与标注，不创建第二套业务规则。
- 类型一致：统一使用 `sourceScreen`、`sourceScrollTop`、`taskStack`、`data-shell`、`core-shell`、`task-shell` 和 `task-back`。
- 范围控制：社区、排行榜等核心页面只增加现有租号状态入口，不进行页面重构。
- 无未定义占位：实施时 PRD 图片 SHA 使用 Task 7 的真实40位提交值。
