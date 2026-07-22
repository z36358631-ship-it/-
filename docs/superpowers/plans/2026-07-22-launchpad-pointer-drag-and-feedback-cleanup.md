# macOS 26 启动台指针拖拽与反馈收敛实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户在一次长按手势中把顶层应用拖到空白槽位排序或拖到图标中心建文件夹，并用无提示框的边缘停留自动翻页，同时默认隐藏标号、收敛编辑态菜单并移除全部 Toast。

**Architecture:** 用 Pointer Events 和独立跟手浮层替代 HTML5 原生 Drag and Drop，拖动源、目标页与原始索引保存在 `state.drag`，翻页只刷新应用网格，拖动浮层保持在文档顶层。拖放判定拆成“图标中心归类”和“最近网格槽位排序”，左右 48px 边缘停留 500ms 后逐页翻页；所有成功与错误 Toast 删除，错误交由已有弹窗、行内状态或 macOS 系统提示。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Pointer Events、Node.js 静态验收、Chrome DevTools Protocol浏览器行为验收、Markdown PRD与设计说明。

**Status:** 2026-07-22 已完成。静态验收通过；使用Chrome DevTools Protocol完成真实Pointer序列回归，15项交互断言全部通过。

---

### Task 1: 用静态验收锁定新交互口径

**Files:**
- Modify: `scripts/verify-launcher-demo.js`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 增加失败验收**

```js
const requiredPointerDrag = [
  'startPointerDrag', 'updatePointerDrag', 'finishPointerDrag',
  'moveAppToGridSlot', 'scheduleEdgePageTurn',
  'EDGE_TURN_ZONE', 'EDGE_TURN_DELAY'
];

checks.pointerDrag = requiredPointerDrag.every(text => html.includes(text));
checks.noEdgePanels = !html.includes('page-edge-drop');
checks.noToast = !html.includes('showToast(') && !html.includes('class="toast"');
checks.markersHiddenByDefault = html.includes('showMarkers:false');
```

- [ ] **Step 2: 运行验收并确认旧实现失败**

Run: `node scripts/verify-launcher-demo.js`

Expected: `FAIL pointerDrag, noEdgePanels, noToast, markersHiddenByDefault`

### Task 2: 实现同一手势的指针拖拽与空白槽位排序

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `.tmp/launcher-pointer-drag.spec.js`

- [ ] **Step 1: 把长按候选与拖动状态解耦**

```js
const MOVE_TOLERANCE = 6;
const EDGE_TURN_ZONE = 48;
const EDGE_TURN_DELAY = 500;

// pointerPress 保留 pointerId、应用ID、按下坐标和 readyToDrag。
// state.drag 保存 originPage、originIndex、ghost、dropMode 和 slotIndex。
```

- [ ] **Step 2: 创建独立跟手浮层**

```js
function startPointerDrag(appId, event) {
  const source = canvas.querySelector(`.app-card[data-scope="top"][data-item-id="${appId}"]`);
  const ghost = source.cloneNode(true);
  ghost.className = 'app-card drag-ghost';
  document.body.appendChild(ghost);
  state.drag = { id: appId, originPage: state.page, originIndex: layout.findIndex(item => item.id === appId), ghost };
  updatePointerDrag(event);
}
```

- [ ] **Step 3: 区分建文件夹与网格排序**

```js
function resolveDropTarget(clientX, clientY) {
  const card = document.elementFromPoint(clientX, clientY)?.closest('.app-card[data-scope="top"]');
  const icon = card?.querySelector('.app-icon')?.getBoundingClientRect();
  const overIcon = icon && clientX >= icon.left && clientX <= icon.right && clientY >= icon.top && clientY <= icon.bottom;
  if (overIcon && card.dataset.itemId !== state.drag.id) return { mode: 'folder', targetId: card.dataset.itemId };
  return { mode: 'slot', slotIndex: gridSlotFromPoint(clientX, clientY) };
}
```

- [ ] **Step 4: 只在松手时修改人工全局顺序**

```js
function moveAppToGridSlot(appId, desiredIndex) {
  const sourceIndex = layout.findIndex(item => item.id === appId && item.type === 'app');
  const [app] = layout.splice(sourceIndex, 1);
  const insertIndex = Math.max(0, Math.min(layout.length, desiredIndex - (sourceIndex < desiredIndex ? 1 : 0)));
  layout.splice(insertIndex, 0, app);
  return insertIndex;
}
```

- [ ] **Step 5: 浏览器验证同一长按手势**

测试必须在同一个 `pointerdown → 等待650ms → pointermove → pointerup` 序列中完成，断言应用顺序改变、项目总数不变、未生成文件夹；拖到另一图标中心时才生成文件夹。

### Task 3: 实现无提示框的边缘自动翻页

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Test: `.tmp/launcher-pointer-drag.spec.js`

- [ ] **Step 1: 删除边缘提示框结构和CSS**

删除 `renderPageEdges()`、`.page-edge-drop` 以及 `pageEdgesSlot`，不再渲染“上一页/下一页”文案。

- [ ] **Step 2: 增加500ms边缘停留计时**

```js
function scheduleEdgePageTurn(direction) {
  if (state.drag.edgeLocked || state.drag.edgeDirection === direction) return;
  clearEdgePageTurn();
  state.drag.edgeDirection = direction;
  state.drag.edgeTimer = setTimeout(() => {
    state.page += direction;
    state.drag.edgeLocked = true;
    refreshLaunchpad({ grid: true, dots: true, animateGrid: true });
  }, EDGE_TURN_DELAY);
}
```

- [ ] **Step 3: 防止连续误翻页**

指针离开48px边缘区后才清除 `edgeLocked`；第一页左边缘和最后一页右边缘不启动计时。Esc、pointercancel、pointerup和窗口失焦都清理计时器和跟手浮层。

### Task 4: 收敛菜单、标号与全部Toast

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Modify: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 默认隐藏标号**

```js
const state = { /* ... */ showMarkers: false };
```

标号按钮初始文案为“显示标号”；仅URL显式传入 `markers=1` 时默认显示。

- [ ] **Step 2: 编辑态点击更多按钮只退出编辑**

```js
if (action === 'toggle-more' && state.editing) {
  cancelPointerDrag();
  state.editing = false;
  state.menu = false;
  state.screen = 'launchpad';
  refreshLaunchpad({ menu: true, grid: true });
  return;
}
```

第二次点击 `•••` 才切换菜单；防御性的 `open-settings` 编辑态分支保留但不应由正常路径触发。

- [ ] **Step 3: 删除Toast实现和全部调用**

删除 `.toast`、`#toast`、`toastTimer`、`showToast()` 以及所有调用。成功操作通过界面变化表达；权限通过权限弹窗和设置状态表达；删除通过确认/拦截弹窗表达；应用打开与系统失败交给 macOS 表达。

### Task 5: 同步文档、回归并发布

**Files:**
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md`
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-launchpad-parity-design.md`
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Modify: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 同步交互口径**

文档明确：仅编辑态顶层应用可排序；图标中心建夹；其他卡片区域或空白网格按最近槽位排序；边缘停留500ms自动逐页翻页且无提示框；编辑态首次点击 `•••` 只退出；标号默认隐藏；产品内无Toast。

- [ ] **Step 2: 执行静态与行为验收**

Run: `node scripts/verify-launcher-demo.js`

Expected: `PASS macOS 26 launchpad v2.6 demo static checks`

Run: `node .tmp/verify-launchpad-v26.mjs`（先启动Chrome远程调试端口）

Expected: 空白排序、中心建夹、边缘自动翻页、菜单两次点击、标号默认隐藏和无Toast共15项断言全部通过。

- [ ] **Step 3: 只提交目标文件并更新预览**

```bash
git add demos/macOS26盖世全屏启动台-交互标注版.html \
  scripts/verify-launcher-demo.js \
  docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md \
  docs/superpowers/specs/2026-07-22-macos-26-gamehub-launchpad-parity-design.md \
  docs/superpowers/plans/2026-07-22-launchpad-pointer-drag-and-feedback-cleanup.md
git commit -m "fix: refine macOS launchpad pointer interactions"
```
