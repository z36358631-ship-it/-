# Mac MODS 详情启用操作视觉优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Mac MODS 详情底部启用控件改成与相邻操作统一、用整颗按钮背景表达状态的胶囊开关。

**Architecture:** 保留现有设备级 `enabled_value`、reducer 和事件委托，只为详情上下文输出独立的原生按钮结构。列表继续复用紧凑型 `renderEnabledSwitch`，详情使用同一状态数据但由整颗按钮承担 `role="switch"`。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js、Playwright Core

---

### Task 1: 先锁定详情按钮结构与几何合同

**Files:**
- Modify: `tools/verify-mods-demo.mjs`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 增加详情控件结构断言**

在静态断言中要求存在 `renderDetailEnabledControl`，并在浏览器断言中定位：

```js
const detailSwitch = page.locator(
  '[data-reference-region="mod-detail-modal"] .detail-enabled-control[role="switch"]'
);
assert.equal(await detailSwitch.locator('button').count(), 0);
```

- [ ] **Step 2: 增加等高与近似等宽断言**

读取三项操作的边界框并断言：

```js
const actionBoxes = await page.locator(
  '[data-reference-region="mod-detail-modal"] .modal-action-bar > *'
).evaluateAll(elements => elements.map(element => {
  const box = element.getBoundingClientRect();
  return { width: box.width, height: box.height };
}));
assert(actionBoxes.every(box => Math.round(box.height) === 72));
assert(Math.max(...actionBoxes.map(box => box.width)) - Math.min(...actionBoxes.map(box => box.width)) <= 1);
```

- [ ] **Step 3: 运行测试确认新合同尚未满足**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: FAIL，详情控件自身尚未承担 `role="switch"` 或几何合同尚未满足。

### Task 2: 把详情控件改成整块胶囊开关

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `tools/verify-mods-demo.mjs`

- [ ] **Step 1: 新增详情专用渲染函数**

输出一颗原生按钮，复用原有 `data-action="toggle-enabled"` 事件合同：

```js
function renderDetailEnabledControl(mod, viewModel) {
  const enabled = mod.enabled_value === 'enabled';
  const pending = Boolean(viewModel.state.ui.enableMutationByMod[mod.mod_id]);
  const label = enabled ? '已启用' : '已停用';
  return `
    <button type="button"
      class="secondary detail-enabled-control"
      role="switch"
      aria-label="${escapeHtml(mod.name)} ${label}"
      aria-checked="${enabled}"
      aria-busy="${pending}"
      data-switch-context="detail"
      data-action="toggle-enabled"
      data-mod-id="${mod.mod_id}"
      ${pending ? 'disabled' : ''}>
      <span>${label}</span>
    </button>`;
}
```

- [ ] **Step 2: 在正常与更新失败操作栏中替换详情旧容器**

把两处：

```js
<div class="detail-enabled-control">${renderEnabledSwitch(mod, viewModel, 'detail')}</div>
```

替换为：

```js
${renderDetailEnabledControl(mod, viewModel)}
```

- [ ] **Step 3: 统一详情按钮样式**

为 `.detail-enabled-control` 设置 `flex: 1`、72px 高度、与相邻按钮相同的文字和悬停/焦点层级；`aria-checked="true"` 使用绿色背景，停用态使用灰色背景。详情不渲染滑块，所有规则限定在详情专用类中，不修改列表 `.enabled-switch`。

- [ ] **Step 4: 运行自动验证**

Run:

```powershell
node tools/verify-mods-demo.mjs
```

Expected: PASS，排序、三处状态同步、详情整块开关和失败回滚全部通过。

### Task 3: 构建、视觉检查与发布

**Files:**
- Verify: `.tmp/mods-sort-toggle-evidence/mac-mods-detail.png`
- Verify: `sites/mods-mac-demo`

- [ ] **Step 1: 构建站点**

Run:

```powershell
npm.cmd --prefix sites/mods-mac-demo run build
```

Expected: build 成功退出。

- [ ] **Step 2: 检查代码格式**

Run:

```powershell
git diff --check
```

Expected: 无输出，退出码 0。

- [ ] **Step 3: 视觉复核**

打开 `.tmp/mods-sort-toggle-evidence/mac-mods-detail.png` 和 `mac-mods-detail-enabled.png`，确认三项操作等高等宽、已停用为灰色背景、已启用为绿色背景，且详情按钮内没有滑块或内容遮挡。

- [ ] **Step 4: 提交并推送**

Run:

```powershell
git add demos/Mod与发行人/Mod功能Mac端demo.html tools/verify-mods-demo.mjs docs/superpowers/specs/2026-07-31-mac-mods-detail-enable-action-design.md docs/superpowers/plans/2026-07-31-mac-mods-detail-enable-action.md
git commit -m "fix(mods): unify detail enable action styling"
git push origin HEAD:main
```

Expected: 新提交推送到远端 `main`。

- [ ] **Step 5: 保存并部署 Sites 新版本**

使用 `.openai/hosting.json` 中既有 `project_id`，将已推送的精确提交保存为新版本并在现有 Owner-only 权限下部署；不修改访问权限。
