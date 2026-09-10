# Android 买断游戏与 DLC 所见即所得及横屏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Android 买断游戏与永久 DLC Demo 通过可见业务按钮完成主要交易链路，并支持保持订单状态的独立横竖屏切换。

**Architecture:** 保留现有单文件 HTML、订单 store、router、状态派生和 action handler；在产品画布外增加 Demo 方向工具条，并让手动切换与真实设备视窗变化统一进入 `setOrientation()`。竖屏继续使用当前 Shell，横屏使用独立 `landscape-shell` 和顶部导航；两个方向只改变渲染结构与 CSS，不复制或重置交易数据。

**Tech Stack:** 单文件 HTML／CSS／原生 JavaScript、Node.js `node:test`、Playwright、Markdown PRD 与验收记录。

---

## 文件职责

- `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html`：产品 Demo、方向工具条、横竖屏 Shell、共享状态机和可见动作反馈。
- `tests/buyout-commerce/android-buyout.browser.test.mjs`：纯可见按钮交易链路、横竖屏状态保持、尺寸适配和截图证据。
- `tests/buyout-commerce/spec-consistency.test.mjs`：设计规格、PRD 和 Demo 的横屏及所见即所得静态一致性。
- `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md`：补充 Android 横屏承载、Demo 验收说明和新证据引用。
- `tests/buyout-commerce/evidence/verification.md`：记录最终用例数、横屏尺寸、人工审图和已知边界。
- `tests/buyout-commerce/evidence/android/*.png`：横屏订单确认、退款、CDKEY、订单中心及旋转状态保持证据。

### Task 1: 先写纯可见交互与方向切换失败测试

**Files:**
- Modify: `tests/buyout-commerce/android-buyout.browser.test.mjs:46-95`
- Modify: `tests/buyout-commerce/android-buyout.browser.test.mjs:117-258`
- Modify: `tests/buyout-commerce/android-buyout.browser.test.mjs:801-930`

- [ ] **Step 1: 扩展 `openDemo` 以支持桌面预览视窗，但不通过测试 API 设置方向**

```js
async function openDemo({
  width = 390,
  height = 844,
  source = 'website-apk',
  captureConsole = true,
} = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  const remoteRequests = [];
  if (captureConsole) page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      remoteRequests.push(url);
    }
  });
  await page.goto(`${DEMO_URL}?source=${source}`);
  await page.locator('#app').waitFor();
  return { page, errors, remoteRequests };
}
```

- [ ] **Step 2: 新增不调用 `setApi` 的直接购买、退款成功链路**

```js
test('普通评审者只用可见按钮完成直接购买与退款，不依赖隐藏测试 API', async () => {
  const { page, errors, remoteRequests } = await openDemo({ width: 1100, height: 920, source: 'google-play' });
  try {
    await page.getByRole('button', { name: '购买 ¥128', exact: true }).click();
    await page.getByRole('button', { name: '立即支付', exact: true }).click();
    await page.getByRole('button', { name: '刷新支付结果', exact: true }).click();
    await page.getByRole('heading', { name: '正在添加到账号', exact: true }).waitFor();
    await page.getByRole('button', { name: '刷新添加状态', exact: true }).click();
    await page.getByRole('heading', { name: '已添加到账号', exact: true }).waitFor();
    await page.getByRole('button', { name: '查看订单', exact: true }).click();
    await page.getByRole('button', { name: '申请退款', exact: true }).click();
    await page.getByRole('button', { name: '提交退款申请', exact: true }).click();
    await page.getByRole('heading', { name: '退款处理中', exact: true }).waitFor();
    await page.getByRole('button', { name: '刷新退款状态', exact: true }).click();
    await page.getByRole('heading', { name: '退款已完成', exact: true }).waitFor();
    const snapshot = await page.evaluate(() => window.__androidBuyoutDemo.snapshot());
    assert.equal(snapshot.currentOrder.refund.status, 'succeeded');
    assert.equal(snapshot.currentOrder.entitlement.status, 'revoked');
    assertClean(errors, remoteRequests);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 3: 新增不调用 `setApi` 的 CDKEY 购买、查看、复制与激活链路**

```js
test('普通评审者只用可见按钮完成 CDKEY 购买、查看、复制和一键激活', async () => {
  const { page, errors, remoteRequests } = await openDemo({ width: 1100, height: 920 });
  try {
    await page.getByRole('button', { name: '购买 ¥128', exact: true }).click();
    await page.getByRole('button', { name: /购买 CDKEY/ }).click();
    await page.getByRole('button', { name: '立即支付', exact: true }).click();
    await page.getByRole('button', { name: '刷新支付结果', exact: true }).click();
    await page.getByRole('button', { name: '刷新配码状态', exact: true }).click();
    await page.getByRole('button', { name: '查看 CDKEY', exact: true }).click();
    await page.getByRole('dialog', { name: '查看 CDKEY 前确认' }).getByRole('button', { name: '确认查看' }).click();
    const originalKey = await page.locator('.key-code').innerText();
    await page.getByRole('button', { name: '复制 CDKEY', exact: true }).click();
    await page.getByRole('button', { name: '一键激活', exact: true }).click();
    await page.getByRole('button', { name: '刷新激活结果', exact: true }).click();
    await page.getByRole('heading', { name: '已激活', exact: true }).waitFor();
    assert.equal(await page.locator('.key-code').innerText(), originalKey);
    assert.match(await page.locator('#app').innerText(), /本次激活没有产生第二次收费/);
    assertClean(errors, remoteRequests);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 4: 新增画布外切换、状态保持和真实视窗横屏测试**

```js
test('横竖屏切换使用独立 Shell 且保留当前订单与页面状态', async () => {
  const { page, errors, remoteRequests } = await openDemo({ width: 1100, height: 920 });
  try {
    await page.getByRole('button', { name: '购买 ¥128', exact: true }).click();
    await page.getByRole('button', { name: /购买 CDKEY/ }).click();
    const before = await page.evaluate(() => window.__androidBuyoutDemo.snapshot());
    await page.getByRole('button', { name: '横屏预览', exact: true }).click();
    await page.locator('#app[data-orientation="landscape"] .landscape-shell').waitFor();
    assert.equal(await page.locator('#app .bottom-nav').count(), 0);
    assert.equal(await page.locator('#app .landscape-top-nav').count(), 1);
    const after = await page.evaluate(() => window.__androidBuyoutDemo.snapshot());
    assert.equal(after.screen, before.screen);
    assert.equal(after.checkoutFulfillmentType, before.checkoutFulfillmentType);
    assert.deepEqual(after.orders, before.orders);
    await page.getByRole('button', { name: '竖屏预览', exact: true }).click();
    await page.locator('#app[data-orientation="portrait"] .app-shell').waitFor();
    assertClean(errors, remoteRequests);
  } finally {
    await page.close();
  }
});

test('真实设备横屏视窗自动使用横屏 Shell', async () => {
  const { page, errors, remoteRequests } = await openDemo({ width: 844, height: 390 });
  try {
    await page.locator('#app[data-orientation="landscape"] .landscape-shell').waitFor();
    assert.equal(await page.locator('[data-demo-control]').count(), 1);
    assert.equal(await page.locator('#app [data-demo-control]').count(), 0);
    assertClean(errors, remoteRequests);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 5: 运行新增用例并确认先失败**

Run:

```powershell
node --test --test-name-pattern="普通评审者|横竖屏切换|真实设备横屏" tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: FAIL，首个明确失败为找不到“横屏预览”或 `.landscape-shell`；现有交易测试不得出现语法错误。

- [ ] **Step 6: 提交测试基线**

```powershell
git add -- tests/buyout-commerce/android-buyout.browser.test.mjs
git commit -m "test: define android buyout landscape behavior"
```

### Task 2: 增加方向状态和画布外预览工具

**Files:**
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:24-48`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:538-565`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:1566-1605`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:1648-1700`

- [ ] **Step 1: 把产品画布放入独立预览工作台**

在 `<body>` 中使用以下结构，工具条保持在 `#app` 外：

```html
<main class="demo-workbench">
  <div class="demo-toolbar" role="group" aria-label="Demo 显示方向" data-demo-control>
    <span>预览方向</span>
    <button type="button" data-orientation-choice="portrait" aria-pressed="true">竖屏预览</button>
    <button type="button" data-orientation-choice="landscape" aria-pressed="false">横屏预览</button>
  </div>
  <div id="app" data-orientation="portrait"></div>
</main>
```

- [ ] **Step 2: 增加工作台与两个画布尺寸**

```css
.demo-workbench {
  display: grid;
  width: 100vw;
  min-height: 100dvh;
  min-width: 0;
  place-items: center;
}
.demo-toolbar {
  position: fixed;
  z-index: 100;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 999px;
  background: rgb(20 21 24 / 92%);
}
.demo-toolbar > span { padding: 0 8px; color: var(--muted); font-size: 11px; }
.demo-toolbar button {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #a7a8ae;
  cursor: pointer;
}
.demo-toolbar button[aria-pressed="true"] { background: rgb(43 195 223 / 15%); color: #fff; }
#app[data-orientation="portrait"] { width: min(390px, 100vw); height: min(844px, 100dvh); }
#app[data-orientation="landscape"] { width: min(874px, 100vw); height: min(393px, 100dvh); border-radius: 22px; }
@media (max-width: 900px) {
  .demo-toolbar { display: none; }
}
```

- [ ] **Step 3: 让方向进入统一状态，但重置交易时保留方向**

```js
const deviceViewportOrientation = () => (
  window.innerWidth <= 1000 && window.innerHeight <= 1000 && window.innerWidth > window.innerHeight
    ? 'landscape'
    : 'portrait'
);

const makeInitialState = (orientation = deviceViewportOrientation()) => ({
  orientation,
  orientationSource: 'viewport',
  pendingAction: '',
  // 保留现有全部字段
});

function setOrientation(nextOrientation, source = 'manual') {
  if (!['portrait', 'landscape'].includes(nextOrientation)) return false;
  const changed = state.orientation !== nextOrientation;
  state.orientation = nextOrientation;
  state.orientationSource = source;
  app.dataset.orientation = nextOrientation;
  document.querySelectorAll('[data-orientation-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.orientationChoice === nextOrientation));
  });
  if (changed) render();
  return true;
}
```

`reset()` 必须先保存 `state.orientation`，再调用 `makeInitialState(savedOrientation)`。

- [ ] **Step 4: 统一手动切换与真实设备旋转入口**

```js
document.querySelector('.demo-toolbar').addEventListener('click', (event) => {
  const button = event.target.closest('[data-orientation-choice]');
  if (!button) return;
  setOrientation(button.dataset.orientationChoice, 'manual');
});

window.addEventListener('resize', () => {
  if (window.innerWidth <= 1000 && window.innerHeight <= 1000) {
    setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait', 'viewport');
  }
});
```

- [ ] **Step 5: 公开只读方向事实供回归检查**

在现有 `window.__androidBuyoutDemo` 中只增加：

```js
setOrientation,
```

业务主链路测试不得调用该方法；它只用于边界调试与快照核对。

- [ ] **Step 6: 运行方向状态用例**

Run:

```powershell
node --test --test-name-pattern="横竖屏切换|真实设备横屏" tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: 手动切换按钮和方向状态断言通过；`.landscape-shell` 仍失败，证明下一任务需要独立横屏 Shell。

- [ ] **Step 7: 提交预览与方向状态**

```powershell
git add -- demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html tests/buyout-commerce/android-buyout.browser.test.mjs
git commit -m "feat: add android demo orientation controls"
```

### Task 3: 实现独立横屏 Shell 并复用现有业务页面

**Files:**
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:48-410`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:621-840`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:1447-1587`

- [ ] **Step 1: 新增独立横屏顶部导航和 Shell**

```js
function landscapeTopNav(title) {
  return `<header class="landscape-top-nav" data-component-id="C-NAV-L">
    <strong class="landscape-brand">GAMEHUB</strong>
    <nav aria-label="掌机顶部导航">
      <button type="button" data-action="navigate" data-screen="detail">首页</button>
      <button type="button" data-action="navigate" data-screen="library">游戏库</button>
      <button type="button" data-action="navigate" data-screen="orders">订单</button>
    </nav>
    <span class="landscape-current">${title}</span>
    <span class="landscape-system">14:38 · Wi-Fi · 82</span>
  </header>`;
}

function landscapeShell(content, options = {}) {
  const { title = '', dock = '', nav = '' } = options;
  return `<div class="landscape-shell" data-component-id="C-SHELL-L" data-screen="${state.screen}">
    ${landscapeTopNav(title)}
    <main class="landscape-page">
      <section class="landscape-content">${content}</section>
      ${dock ? `<aside class="landscape-action-panel">${dock}</aside>` : ''}
    </main>
    ${nav ? '<div class="landscape-controller-hint">LB/RB 切换 · A 确认 · B 返回</div>' : ''}
  </div>`;
}
```

修改现有 `shell()` 的开头：

```js
if (state.orientation === 'landscape') {
  return landscapeShell(content, { title, backScreen, backLabel, trailing, dock, nav, noTopbar });
}
```

- [ ] **Step 2: 增加横屏基础布局，明确不复用底栏**

```css
.landscape-shell {
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-rows: 58px minmax(0, 1fr) 24px;
  overflow: hidden;
  background: radial-gradient(circle at 15% 0, rgb(22 91 116 / 22%), transparent 36%), #0b0c0f;
}
.landscape-top-nav {
  display: grid;
  min-width: 0;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 0 20px;
  border-bottom: 1px solid var(--line);
  background: rgb(11 12 15 / 92%);
}
.landscape-top-nav nav { display: flex; gap: 6px; }
.landscape-top-nav button { min-height: 40px; padding: 0 13px; border: 0; border-radius: 10px; background: transparent; color: #a7a8ae; }
.landscape-page { display: grid; min-width: 0; min-height: 0; grid-template-columns: minmax(0, 1fr) minmax(230px, .38fr); gap: 12px; padding: 12px 16px; }
.landscape-content, .landscape-action-panel { min-width: 0; min-height: 0; overflow-y: auto; }
.landscape-action-panel { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); }
.landscape-action-panel .action-dock, .landscape-action-panel .purchase-dock { margin-top: auto; border-top: 0; box-shadow: none; }
.landscape-controller-hint { padding: 0 18px; color: #777980; font-size: 9px; text-align: right; }
#app[data-orientation="landscape"] .bottom-nav { display: none; }
```

- [ ] **Step 3: 为关键交易页设置横屏双栏或多栏规则**

```css
.landscape-shell[data-screen="detail"] .landscape-page,
.landscape-shell[data-screen="checkout"] .landscape-page,
.landscape-shell[data-screen="order-detail"] .landscape-page,
.landscape-shell[data-screen="key-detail"] .landscape-page,
.landscape-shell[data-screen="refund"] .landscape-page,
.landscape-shell[data-screen="refund-progress"] .landscape-page { grid-template-columns: 1.2fr .8fr; }

.landscape-shell .standard-content { display: grid; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 0; }
.landscape-shell .checkout-product,
.landscape-shell .page-intro,
.landscape-shell .order-hero,
.landscape-shell .inline-status { grid-column: 1 / -1; }
.landscape-shell .snapshot-list,
.landscape-shell .section-card,
.landscape-shell .source-section,
.landscape-shell .key-panel,
.landscape-shell .management-card { margin-top: 0; }
.landscape-shell .feedback-wrap { min-height: 100%; padding: 0; }
.landscape-shell .feedback-card { display: grid; max-width: none; grid-template-columns: 150px minmax(0, 1fr); gap: 8px 16px; text-align: left; }
.landscape-shell .feedback-mark { grid-row: 1 / span 4; align-self: center; }
.landscape-shell .feedback-actions { align-self: end; }
.landscape-shell[data-screen="orders"] .order-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
```

对无法自然组成双列的页面，给 `.landscape-content` 内部滚动，不改变业务字段或操作顺序。

- [ ] **Step 4: 保证弹窗和焦点在横屏中保持可用**

```css
#app[data-orientation="landscape"] .modal-layer { inset: 58px 0 24px; padding: 12px; }
#app[data-orientation="landscape"] .dialog-card { max-width: 520px; padding: 16px 20px; }
#app[data-orientation="landscape"] .dialog-actions button,
#app[data-orientation="landscape"] button { min-height: 44px; }
#app[data-orientation="landscape"] button:focus-visible { outline: 2px solid #8ee8f6; outline-offset: 2px; }
```

- [ ] **Step 5: 运行横屏 Shell 和状态保持测试**

Run:

```powershell
node --test --test-name-pattern="横竖屏切换|真实设备横屏" tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: PASS，横屏存在 `.landscape-shell` 与 `.landscape-top-nav`，无 `.bottom-nav`，订单快照切换前后相同。

- [ ] **Step 6: 提交横屏 Shell**

```powershell
git add -- demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html tests/buyout-commerce/android-buyout.browser.test.mjs
git commit -m "feat: add gamehub landscape commerce shell"
```

### Task 4: 补齐可见动作 loading、防重复与状态确定性

**Files:**
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:538-565`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:900-1475`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html:1588-1645`
- Modify: `tests/buyout-commerce/android-buyout.browser.test.mjs:117-258`

- [ ] **Step 1: 写刷新期间可见 loading 与防重复测试**

```js
test('可见刷新动作展示 loading 并阻止重复提交', async () => {
  const { page, errors, remoteRequests } = await openDemo({ width: 1100, height: 920 });
  try {
    await page.getByRole('button', { name: '购买 ¥128', exact: true }).click();
    await page.getByRole('button', { name: '立即支付', exact: true }).click();
    const refresh = page.getByRole('button', { name: '刷新支付结果', exact: true });
    await refresh.click();
    await page.getByRole('button', { name: '查询中…', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '查询中…', exact: true }).isDisabled(), true);
    await page.getByRole('heading', { name: '正在添加到账号', exact: true }).waitFor();
    assertClean(errors, remoteRequests);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test --test-name-pattern="可见刷新动作" tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: FAIL，找不到“查询中…”按钮。

- [ ] **Step 3: 增加统一可见动作执行器**

```js
function runVisibleTransition(actionKey, operation, delay = 180) {
  if (state.pendingAction) return false;
  state.pendingAction = actionKey;
  render();
  window.setTimeout(() => {
    if (state.pendingAction !== actionKey) return;
    operation();
    state.pendingAction = '';
    render();
  }, delay);
  return true;
}

function pendingButton(actionKey, idleLabel, loadingLabel) {
  const pending = state.pendingAction === actionKey;
  return `aria-busy="${pending}" ${pending ? 'disabled' : ''}>${pending ? loadingLabel : idleLabel}`;
}
```

支付、权益履约、配码、激活和退款的刷新按钮分别使用稳定动作键：`payment-query`、`entitlement-query`、`key-allocation-query`、`activation-query`、`refund-query`。

- [ ] **Step 4: 让页面点击继续调用正式状态机函数**

```js
if (action === 'refresh-payment') {
  return runVisibleTransition('payment-query', () => applyPaymentResult(state.nextPaymentResult));
}
if (action === 'refresh-fulfillment') {
  return runVisibleTransition('entitlement-query', () => applyFulfillmentResult(state.nextFulfillmentResult));
}
if (action === 'refresh-key-allocation') {
  return runVisibleTransition('key-allocation-query', () => applyKeyAllocationResult(state.nextKeyAllocationResult));
}
if (action === 'refresh-activation') {
  return runVisibleTransition('activation-query', () => applyActivationResult(state.nextActivationResult));
}
if (action === 'refresh-refund') {
  return runVisibleTransition('refund-query', () => applyRefundResult(state.nextRefundResult));
}
```

不修改 `applyPaymentResult`、`applyFulfillmentResult`、`applyKeyAllocationResult`、`applyActivationResult` 和 `applyRefundResult` 的业务规则。

- [ ] **Step 5: 运行纯可见成功链路和原有异常注入链路**

Run:

```powershell
node --test --test-name-pattern="普通评审者|可见刷新动作|CDKEY 交付后|退款失败|人工审核拒绝" tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: PASS。纯可见链路不调用 `setApi`；异常用例仍可通过隐藏测试 API 注入边界结果。

- [ ] **Step 6: 提交所见即所得动作反馈**

```powershell
git add -- demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html tests/buyout-commerce/android-buyout.browser.test.mjs
git commit -m "feat: make android commerce demo directly operable"
```

### Task 5: 补齐横屏尺寸、截图和规格一致性

**Files:**
- Modify: `tests/buyout-commerce/android-buyout.browser.test.mjs:801-930`
- Modify: `tests/buyout-commerce/spec-consistency.test.mjs:31-105`
- Create: `tests/buyout-commerce/evidence/android/landscape-checkout.png`
- Create: `tests/buyout-commerce/evidence/android/landscape-refund-processing.png`
- Create: `tests/buyout-commerce/evidence/android/landscape-cdkey-detail.png`
- Create: `tests/buyout-commerce/evidence/android/landscape-orders.png`
- Create: `tests/buyout-commerce/evidence/android/orientation-state-preserved.png`

- [ ] **Step 1: 增加四档尺寸无溢出检查**

```js
for (const viewport of [
  { width: 320, height: 844, orientation: 'portrait' },
  { width: 390, height: 844, orientation: 'portrait' },
  { width: 844, height: 390, orientation: 'landscape' },
  { width: 874, height: 393, orientation: 'landscape' },
]) {
  const { page, errors, remoteRequests } = await openDemo(viewport);
  try {
    const metrics = await page.locator('#app').evaluate((root) => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      clientHeight: root.clientHeight,
      scrollHeight: root.scrollHeight,
      orientation: root.dataset.orientation,
    }));
    assert.equal(metrics.orientation, viewport.orientation);
    assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1);
    assert.ok(metrics.scrollHeight <= metrics.clientHeight + 1);
    assertClean(errors, remoteRequests);
  } finally {
    await page.close();
  }
}
```

- [ ] **Step 2: 检查关键横屏页面的按钮与文字边界**

复用现有 `assertNoHorizontalOverflow` 和 `assertVisibleTextNotClipped`，依次覆盖 `checkout`、`orders`、`order-detail`、`key-detail`、`refund-progress`、`deleted-orders` 和两个确认弹窗。每个页面必须断言至少一个可见主操作，不能只检查根节点。

- [ ] **Step 3: 生成五张横屏证据截图**

```js
await page.locator('#app').screenshot({ path: evidencePath('landscape-checkout.png') });
await page.locator('#app').screenshot({ path: evidencePath('landscape-refund-processing.png') });
await page.locator('#app').screenshot({ path: evidencePath('landscape-cdkey-detail.png') });
await page.locator('#app').screenshot({ path: evidencePath('landscape-orders.png') });
await page.locator('#app').screenshot({ path: evidencePath('orientation-state-preserved.png') });
```

截图只能截取 `#app`，不得包含画布外 `data-demo-control`。

- [ ] **Step 4: 增加规格一致性测试**

```js
test('Android Demo 支持画布外方向切换、独立横屏 Shell 与共享交易状态', () => {
  const android = read('android');
  const prd = read('prd');
  assert.match(android, /data-demo-control/);
  assert.match(android, /data-orientation-choice="portrait"/);
  assert.match(android, /data-orientation-choice="landscape"/);
  assert.match(android, /function setOrientation\(/);
  assert.match(android, /landscape-shell/);
  assert.match(android, /C-SHELL-L/);
  assert.match(android, /landscape-top-nav/);
  assert.match(prd, /横屏[\s\S]*独立[\s\S]*Shell/);
  for (const name of [
    'landscape-checkout.png',
    'landscape-refund-processing.png',
    'landscape-cdkey-detail.png',
    'landscape-orders.png',
    'orientation-state-preserved.png',
  ]) {
    const screenshot = path.join(root, 'tests', 'buyout-commerce', 'evidence', 'android', name);
    assert.ok(fs.existsSync(screenshot), `横屏证据缺失：${name}`);
    assert.ok(fs.statSync(screenshot).size > 0, `横屏证据为空：${name}`);
  }
});
```

- [ ] **Step 5: 运行 Android 与规格测试**

Run:

```powershell
node --test tests/buyout-commerce/android-buyout.browser.test.mjs tests/buyout-commerce/spec-consistency.test.mjs
```

Expected: 全部 PASS，0 fail；输出新的真实用例总数。

- [ ] **Step 6: 原尺寸人工审图**

使用 `view_image` 以 `detail: original` 查看五张横屏截图，逐项确认：顶部导航完整、无竖屏底栏、文字不硬裁切、主操作可达、退款卡与 Key 卡层级明确、切换后订单号和状态相同。发现问题必须回到 Demo 修复并重新截图。

- [ ] **Step 7: 提交测试与证据**

```powershell
git add -- tests/buyout-commerce/android-buyout.browser.test.mjs tests/buyout-commerce/spec-consistency.test.mjs tests/buyout-commerce/evidence/android
git commit -m "test: verify android buyout landscape interactions"
```

### Task 6: 更新 PRD 和验收记录并跑全量回归

**Files:**
- Modify: `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md:7-13`
- Modify: `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md:76-83`
- Modify: `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md:131-139`
- Modify: `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md:455-465`
- Modify: `tests/buyout-commerce/evidence/verification.md:20-76`

- [ ] **Step 1: 在 PRD 增加 V1.6 变更记录**

```markdown
| 2026/9/10 | Android Demo 补齐可见按钮主链路、画布外横竖屏切换和独立掌机横屏 Shell，切换保持同一订单状态 | V1.6 | 郑群超 |
```

- [ ] **Step 2: 更新 Android 页面承载差异**

在“客户端承载”和“Android 与 Mac 页面承载差异”中明确：

```markdown
Android 竖屏继续使用 V6.1.1 底部五栏 Shell；横屏使用掌机顶部导航和左右双栏，两个方向共用订单、支付、履约、Key、退款与拒付事实。Demo 的方向工具位于产品画布外，不属于 App 功能入口。
```

在订单确认或订单中心图示中加入：

```markdown
![Android横屏订单确认](../../../tests/buyout-commerce/evidence/android/landscape-checkout.png)
![Android横屏CDKEY详情](../../../tests/buyout-commerce/evidence/android/landscape-cdkey-detail.png)
```

- [ ] **Step 3: 更新参考资料**

```markdown
| Android 所见即所得及横屏设计 | `docs/superpowers/specs/2026-09-10-android-buyout-wysiwyg-landscape-design.md` | 当前 Android Demo 的方向切换、共享状态和可见交互验收口径 |
```

- [ ] **Step 4: 用真实结果更新验收记录**

把 Android、规格一致性和全量用例数替换为本轮实际输出；截图数量通过以下命令读取，不手填估算：

```powershell
Get-ChildItem -LiteralPath 'tests/buyout-commerce/evidence/android' -Filter '*.png' | Measure-Object
```

同时记录四档尺寸、横屏独立 Shell、画布外工具、可见主链路和原尺寸人工审图结果。

- [ ] **Step 5: 运行 PRD 机械校验**

Run:

```powershell
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'C:\Users\z3635\官网改动\prd\发行平台专项\订单支付PRD\10-买断游戏与DLC订单支付及对账PRD.md'
```

Expected: 除本地相对图片地址汇总错误和已记录的非阻塞文字告警外，不新增业务结构、页面六要素或事件参数错误。把实际错误数和告警数写入验收记录。

- [ ] **Step 6: 运行全量交易回归**

Run:

```powershell
node --test tests/buyout-commerce/*.test.mjs
```

Expected: 全部 PASS，0 fail；Android、Mac、开发者后台、运营后台和规格一致性均通过。

- [ ] **Step 7: 检查任务边界和空白错误**

Run:

```powershell
git diff --check -- demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html tests/buyout-commerce/android-buyout.browser.test.mjs tests/buyout-commerce/spec-consistency.test.mjs prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md tests/buyout-commerce/evidence/verification.md
git diff --name-only -- demos/开发者后台一期/06-游戏创建与发行资料demo.html prd/发行平台专项/开发者后台PRD/02-游戏创建业务流PRD.md
```

Expected: `git diff --check` 无输出；第二条命令无输出，证明本次没有触碰 02 游戏创建。

- [ ] **Step 8: 提交文档和最终验收记录**

```powershell
git add -- prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md tests/buyout-commerce/evidence/verification.md
git commit -m "docs: document android buyout landscape support"
```

## 计划自检

- 规格覆盖：纯可见交易链路、画布外方向工具、真实视窗旋转、独立横屏 Shell、共享状态、异常样例、四档尺寸、证据和 PRD 均有对应任务。
- 类型一致：统一使用 `orientation=portrait|landscape`、`orientationSource=manual|viewport`、`pendingAction` 和既有 `fulfillmentType`、`activationAttemptId` 字段。
- 范围一致：只修改 Android 交易 Demo、对应测试、PRD 与验收证据；不修改 Mac、开发者后台、运营后台或 02 游戏创建。
- 无占位项：实施步骤、文件、函数、命令和期望结果均已明确。
