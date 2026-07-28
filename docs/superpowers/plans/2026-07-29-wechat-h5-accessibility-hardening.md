# 微信 H5 精品游戏无障碍交互加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复三款游戏的焦点穿透、两款游戏的短横屏入口裁切，以及大厅和《五秒之后》的减少动态效果缺口，使无障碍矩阵除三款 200% CSS zoom 外全部通过。

**Architecture:** 每个单文件游戏保留现有结构，只增加小型对话层焦点管理器和竖屏阻断层，不重写 Canvas 坐标系统。无障碍验收脚本继续保留 200% zoom 的真实失败，其他场景以运行时截图和断言证明修复。

**Tech Stack:** HTML、CSS、原生 JavaScript、Pointer Events、`inert`、ARIA、Playwright Core、Microsoft Edge。

---

### Task 1: 固化无障碍失败基线

**Files:**
- Modify: `tools/verify-wechat-h5-accessibility.mjs:19-26`
- Modify: `tools/verify-wechat-h5-accessibility.mjs:392-461`
- Modify: `tools/verify-wechat-h5-accessibility.mjs:472-552`
- Test: `test-results/wechat-h5-premium-games/accessibility.json`

- [ ] **Step 1: 增加期望失败集合**

在脚本顶部加入：

```js
const allowedFailures = new Set([
  'five-seconds-later:zoom-200',
  'world-mender:zoom-200',
  'rift-hunter:zoom-200'
]);
```

报告摘要同时计算 `unexpectedFailures`：

```js
const unexpectedFailures = results.filter(
  result => result.status === 'FAIL'
    && !allowedFailures.has(`${result.page}:${result.scenario}`)
);
```

- [ ] **Step 2: 强化键盘焦点断言**

在 `runKeyboardScenario()` 中保存每次 Tab 的顶层对话归属：

```js
const focusTrace = await page.evaluate(() => {
  const active = document.activeElement;
  const modal = active?.closest?.('[aria-modal="true"]');
  return {
    id: active?.id || '',
    insideModal: Boolean(modal),
    modalId: modal?.id || '',
    visibleAtPoint: active
      ? document.elementFromPoint(
          active.getBoundingClientRect().left + 2,
          active.getBoundingClientRect().top + 2
        )?.closest?.(`#${CSS.escape(active.id)}`) === active
      : false
  };
});
```

开场存在时要求所有可聚焦结果均位于当前 `aria-modal` 内，且 `visibleAtPoint=true`。

同一场景继续点击开始和暂停按钮，验证暂停层：

```js
await page.locator('#startBtn').click();
await page.locator('#pauseBtn').click();
await page.waitForTimeout(50);
const pauseFocus = await page.evaluate(() => ({
  activeId: document.activeElement?.id || '',
  modalId: document.activeElement?.closest?.('[aria-modal="true"]')?.id || ''
}));
```

要求 `pauseFocus.modalId` 等于当前暂停层 ID；再遍历一次 Tab，所有焦点仍在该层。结算焦点继续由主验收的成功/失败场景证明，不在本脚本复制完整胜负驱动。

- [ ] **Step 3: 允许明确的竖屏阻断替代横屏可玩画布**

在 `runDisplayScenario()` 收集：

```js
const rotateGuard = await page.locator('#rotateGuard, #rotate').evaluateAll(elements => {
  const visible = elements.find(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width >= innerWidth - 2
      && rect.height >= innerHeight - 2;
  });
  return visible
    ? { visible: true, text: (visible.textContent || '').trim() }
    : { visible: false, text: '' };
});
```

游戏显示场景通过条件改为二选一：

```js
const playable = primaryControlVisible
  && Boolean(layout.canvas && layout.canvas.width >= 280 && layout.canvas.height >= 300);
assertions.push(check(
  playable || (rotateGuard.visible && rotateGuard.text.includes('竖屏')),
  '游戏保持可操作尺寸，或显示明确竖屏阻断',
  { playable, rotateGuard, canvas: layout.canvas }
));
```

大厅仍必须满足主入口可视；竖屏阻断不参与 200% zoom 场景。

- [ ] **Step 4: 运行基线并确认失败**

Run:

```powershell
node tools/verify-wechat-h5-accessibility.mjs
```

Expected: 退出码 `1`；摘要仍约为 `16/28 PASS, 12 FAIL`；`unexpectedFailures` 至少包含三款键盘、大厅简动和两款横屏。

- [ ] **Step 5: 提交测试基线**

```powershell
git add -- tools/verify-wechat-h5-accessibility.mjs
git commit -m "test: define accessibility hardening gates"
```

### Task 2: 修复大厅减少动态效果

**Files:**
- Modify: `demos/微信H5精品游戏/index.html:109-114`
- Test: `tools/verify-wechat-h5-accessibility.mjs`

- [ ] **Step 1: 写入减少动态 CSS**

在大厅现有响应式媒体查询后加入：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
  .play:hover,
  .play:active {
    transform: none;
  }
}
```

- [ ] **Step 2: 运行大厅简动场景**

Run:

```powershell
node tools/verify-wechat-h5-accessibility.mjs
```

Expected: `hub reduced-motion PASS`；其余尚未修复的场景仍完整执行。

- [ ] **Step 3: 提交大厅修复**

```powershell
git add -- demos/微信H5精品游戏/index.html test-results/wechat-h5-premium-games/accessibility.json test-results/wechat-h5-premium-games/accessibility-screenshots/hub-reduced-motion.png
git commit -m "fix: honor reduced motion in game hub"
```

### Task 3: 修复《五秒之后》焦点、横屏和系统简动

**Files:**
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:92-136`
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:362-408`
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:468-475`
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:597-719`
- Modify: `demos/微信H5精品游戏/01-five-seconds-later.html:1716-1748`
- Test: `tools/verify-wechat-h5-accessibility.mjs`

- [ ] **Step 1: 把三层遮罩声明为对话层**

更新开场和暂停层属性：

```html
<section class="overlay show" id="introOverlay"
  role="dialog" aria-modal="true" aria-labelledby="gameTitle" tabindex="-1">
  <div class="intro-card">
    <h1 id="gameTitle">五秒之后</h1>
  </div>
</section>
<section class="overlay" id="pauseOverlay"
  role="dialog" aria-modal="true" aria-labelledby="pauseTitle" tabindex="-1">
  <div class="panel">
    <h2 id="pauseTitle">时间已冻结</h2>
  </div>
</section>
```

在游戏壳末尾加入：

```html
<div class="rotate-guard" id="rotateGuard" role="status" aria-live="polite">
  <strong>请旋转至竖屏</strong>
  <span>时间裂隙只在纵向稳定</span>
</div>
```

- [ ] **Step 2: 增加统一焦点管理器**

在 DOM 引用后加入：

```js
let activeModal = null;
let focusReturn = null;

function focusables(layer) {
  return [...layer.querySelectorAll(
    'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(node => !node.hidden && node.getClientRects().length);
}

function activateModal(layer, preferred) {
  focusReturn = document.activeElement;
  activeModal = layer;
  canvas.inert = true;
  controls.inert = true;
  requestAnimationFrame(() => (preferred || focusables(layer)[0] || layer).focus({ preventScroll: true }));
}

function deactivateModal(layer) {
  if (activeModal !== layer) return;
  activeModal = null;
  canvas.inert = false;
  controls.inert = false;
  (shell || focusReturn)?.focus?.({ preventScroll: true });
}

document.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !activeModal) return;
  const items = focusables(activeModal);
  if (!items.length) {
    event.preventDefault();
    activeModal.focus();
    return;
  }
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});
```

在初始化、`startGame()`、暂停、恢复和结算函数中分别调用 `activateModal` / `deactivateModal`，且开场首焦点使用 `startBtn`。

- [ ] **Step 3: 加入短横屏阻断**

```css
.rotate-guard {
  display:none; position:absolute; z-index:40; inset:0;
  align-items:center; justify-content:center; flex-direction:column; gap:8px;
  padding:28px; text-align:center; background:#050812; color:#d9efff;
}
.rotate-guard strong { font-size:20px; }
.rotate-guard span { color:#9fb0ca; font-size:13px; }
@media (orientation:landscape) and (max-height:600px) {
  .rotate-guard { display:flex; }
}
```

监听匹配变化；进入短横屏且正在游戏时调用现有暂停逻辑：

```js
const shortLandscape = matchMedia('(orientation: landscape) and (max-height: 600px)');
shortLandscape.addEventListener?.('change', event => {
  if (event.matches && state.mode === 'playing') pauseGame('orientation');
});
```

- [ ] **Step 4: 让简动默认跟随系统**

```js
const systemReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const savedReducedMotion = GamePlatform.loadLocal('reducedMotion', false);
state.reducedMotion = systemReducedMotion.matches || savedReducedMotion === true;
motionSwitch.setAttribute('aria-checked', String(state.reducedMotion));
systemReducedMotion.addEventListener?.('change', event => {
  if (event.matches) {
    state.reducedMotion = true;
    motionSwitch.setAttribute('aria-checked', 'true');
  }
});
```

- [ ] **Step 5: 运行专项**

Run:

```powershell
node tools/verify-wechat-h5-accessibility.mjs
```

Expected: 《五秒之后》`large-text-200`、`landscape`、`ultrawide-short`、`keyboard-focus`、`reduced-motion`、`lifecycle` 均 PASS；仅 `zoom-200` FAIL。

- [ ] **Step 6: 提交**

```powershell
git add -- demos/微信H5精品游戏/01-five-seconds-later.html tools/verify-wechat-h5-accessibility.mjs test-results/wechat-h5-premium-games/accessibility.json test-results/wechat-h5-premium-games/accessibility-screenshots
git commit -m "fix: harden five seconds accessibility"
```

### Task 4: 修复《世界缝补师》焦点与短横屏

**Files:**
- Modify: `demos/微信H5精品游戏/02-world-mender.html:7-50`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:68-110`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:179-207`
- Modify: `demos/微信H5精品游戏/02-world-mender.html:515-528`
- Test: `tools/verify-wechat-h5-accessibility.mjs`

- [ ] **Step 1: 标记对话层并增加阻断层**

将 `intro`、`pauseOverlay`、`result` 设为 `role="dialog" aria-modal="true" tabindex="-1"`，加入：

```html
<div id="rotateGuard" role="status" aria-live="polite">
  <strong>请旋转至竖屏</strong>
  <span>针脚需要完整的纵向世界</span>
</div>
```

CSS 使用 Task 3 相同触发条件，但配色沿用 `--ink`、`--gold`。

- [ ] **Step 2: 加入焦点管理器**

复用 Task 3 的 `focusables`、`activateModal`、`deactivateModal` 和 Tab 循环；隔离目标为：

```js
const backgroundControls = [
  canvas, $('pauseBtn'), $('undoBtn'), $('legendToggle')
];
```

`activateModal` 对这些元素设置 `inert=true`；离开当前层时恢复。开场首焦点为 `startBtn`，结果首焦点为结果容器，重玩后返回 `app`。

- [ ] **Step 3: 横屏时暂停**

```js
const shortLandscape = matchMedia('(orientation: landscape) and (max-height: 600px)');
shortLandscape.addEventListener?.('change', event => {
  if (event.matches && state.phase === 'playing' && !state.paused) {
    pauseGame('orientation');
  }
});
```

- [ ] **Step 4: 运行专项**

Run:

```powershell
node tools/verify-wechat-h5-accessibility.mjs
```

Expected: 《世界缝补师》除 `zoom-200` 外六项全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add -- demos/微信H5精品游戏/02-world-mender.html tools/verify-wechat-h5-accessibility.mjs test-results/wechat-h5-premium-games/accessibility.json test-results/wechat-h5-premium-games/accessibility-screenshots
git commit -m "fix: harden world mender accessibility"
```

### Task 5: 修复《裂隙猎人》焦点隔离

**Files:**
- Modify: `demos/微信H5精品游戏/03-rift-hunter.html:135-185`
- Modify: `demos/微信H5精品游戏/03-rift-hunter.html:285-310`
- Modify: `demos/微信H5精品游戏/03-rift-hunter.html:543-558`
- Test: `tools/verify-wechat-h5-accessibility.mjs`

- [ ] **Step 1: 标记开场和暂停对话层**

```html
<section class="screen active" id="intro"
  role="dialog" aria-modal="true" aria-labelledby="introTitle" tabindex="-1">
  <div class="card intro-card">
    <h2 id="introTitle">待得越久<br>收益越高</h2>
  </div>
</section>
<section class="screen" id="pausePanel"
  role="dialog" aria-modal="true" aria-labelledby="pauseTitle" tabindex="-1">
  <div class="card">
    <h2 id="pauseTitle">裂隙已冻结</h2>
  </div>
</section>
```

暂停标题补 `id="pauseTitle"`。

- [ ] **Step 2: 加入焦点管理器**

使用与 Task 3 相同的 Tab 循环。开场/暂停/结算激活时对 `canvas`、`hud` 和非当前 `.screen` 设置 `inert=true`；开始、继续、重玩时恢复并聚焦 `app`。

- [ ] **Step 3: 运行专项**

Run:

```powershell
node tools/verify-wechat-h5-accessibility.mjs
```

Expected:

```text
SUMMARY 25/28 PASS, 3 FAIL
```

三个失败必须精确为三款 `zoom-200`；`unexpectedFailures.length === 0`。

- [ ] **Step 4: 提交**

```powershell
git add -- demos/微信H5精品游戏/03-rift-hunter.html tools/verify-wechat-h5-accessibility.mjs test-results/wechat-h5-premium-games/accessibility.json test-results/wechat-h5-premium-games/accessibility-screenshots
git commit -m "fix: trap rift hunter modal focus"
```

### Task 6: 全量回归与文档同步

**Files:**
- Modify: `docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md`
- Modify: `demos/微信H5精品游戏/README.md`
- Test: `tools/verify-wechat-h5-premium-games.mjs`
- Test: `tools/verify-wechat-h5-accessibility.mjs`

- [ ] **Step 1: 运行主验收**

```powershell
node tools/verify-wechat-h5-premium-games.mjs
```

Expected: 16/16 PASS，退出码 0。

- [ ] **Step 2: 运行无障碍验收并接受限定退出码**

```powershell
node tools/verify-wechat-h5-accessibility.mjs
```

Expected: 25/28 PASS；仅三个已声明 `zoom-200` 失败。脚本应在 `unexpectedFailures.length===0` 时返回 0，并在报告中保留三个 `FAIL` 状态。

- [ ] **Step 3: 更新 QA 与 README**

写明：

```markdown
- 无障碍浏览器矩阵：25/28；三款键盘、简动、横屏和生命周期均通过。
- 三个 200% CSS zoom 模拟仍失败，属于已知 P2；不等同微信系统字号，后者浏览器模拟已通过。
- 若发布标准明确要求 WCAG 200% 页面缩放，本评审包不得升级为生产 GO。
```

- [ ] **Step 4: 提交**

```powershell
git add -- demos/微信H5精品游戏 docs/superpowers/specs/2026-07-28-wechat-h5-premium-games-qa.md tools/verify-wechat-h5-accessibility.mjs test-results/wechat-h5-premium-games
git diff --cached --check
git commit -m "docs: record accessibility hardening results"
```
