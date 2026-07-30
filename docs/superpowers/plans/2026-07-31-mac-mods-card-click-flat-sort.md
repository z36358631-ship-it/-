# Mac MODS Card Click And Flat Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Mac MODS 列表支持整卡进入详情、右下角安装、平铺浏览排序、无已安装排序和精简热门副标题。

**Architecture:** 保留单文件 HTML 和现有 `dispatch → reducer → derive → render` 状态流，只调整列表 DOM、CSS 和事件入口。整卡详情使用原生透明按钮，安装按钮作为同级高层控件，避免冒泡冲突并保留键盘可访问性。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js、Playwright Core、本地 Chrome

---

### Task 1: 更新增量验收

**Files:**

- Modify: `.tmp/verify-mac-mods-discovery.mjs`
- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 将控件断言改为新结构**

加入以下结构断言：

```javascript
assert.equal(await page.locator('[data-card-detail]').count(), 8);
assert.equal(await page.locator('.detail-button').count(), 0);
assert.deepEqual(
  await page.locator('[data-action="set-browse-sort"]')
    .evaluateAll(items => items.map(item => item.dataset.value)),
  ['popular', 'downloads', 'updated', 'name']
);
assert.equal(await page.locator('[data-input="installed-sort"]').count(), 0);
```

- [ ] **Step 2: 加入点击隔离断言**

```javascript
await page.locator('[data-mod-card][data-mod-id="dst-large-b"] [data-action="install"]').click();
assert.equal(
  (await getState()).ui.activeDialog,
  null
);
await page.locator('[data-card-detail][data-mod-id="dst-fast-travel"]').click();
assert.equal(
  (await getState()).ui.activeDialog,
  'mod-detail'
);
```

- [ ] **Step 3: 运行旧版并确认红灯**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: FAIL，旧版仍有详情按钮、下拉排序和已安装排序。

### Task 2: 实现整卡详情与右下角安装

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 重构 `renderModCard()`**

卡片开头增加：

```html
<button class="mod-card-hit-area"
  type="button"
  data-card-detail
  data-action="open-detail"
  data-mod-id="${mod.mod_id}"
  aria-label="查看 ${escapeHtml(mod.name)} 详情"></button>
```

删除 `.detail-button`。浏览 Tab 中：

- 未安装：右下角渲染 `data-action="install"`。
- 已安装：右下角渲染非交互 `.installed-pill`。

已安装 Tab 不渲染底部操作，仅通过整卡进入详情。

- [ ] **Step 2: 增加交互层 CSS**

```css
.mod-card {
  position: relative;
}

.mod-card-hit-area {
  position: absolute;
  z-index: 2;
  inset: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
}

.mod-card-hit-area:focus-visible {
  outline: 3px solid rgba(255, 255, 255, 0.86);
  outline-offset: -5px;
}

.mod-card footer {
  position: relative;
  z-index: 3;
  pointer-events: none;
}

.mod-card footer .install-button {
  margin-left: auto;
  pointer-events: auto;
}
```

- [ ] **Step 3: 运行结构与点击验收**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
node .tmp/verify-mac-mods-dom-flow.mjs
```

Expected: 整卡详情和安装隔离断言通过。

### Task 3: 平铺浏览排序并移除已安装排序

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 将浏览排序改为按钮组**

```html
<div class="browse-sort-options" aria-label="浏览排序">
  <span>排序</span>
  <button data-action="set-browse-sort" data-value="popular">热门推荐</button>
  <button data-action="set-browse-sort" data-value="downloads">下载量</button>
  <button data-action="set-browse-sort" data-value="updated">最近更新</button>
  <button data-action="set-browse-sort" data-value="name">名称</button>
</div>
```

事件绑定：

```javascript
if (action === 'set-browse-sort') {
  dispatch({ type: 'SET_BROWSE_SORT', value: control.dataset.value });
}
```

- [ ] **Step 2: 已安装 Tab 只保留筛选**

`installedControls` 只返回 `.installed-filters`，不再渲染 `data-input="installed-sort"`。状态模型和 reducer 保留兼容，但 UI 固定使用默认 `recent`。

- [ ] **Step 3: 运行排序筛选验收**

Run:

```powershell
node .tmp/verify-mac-mods-discovery.mjs
```

Expected: 四种浏览排序和四种已安装筛选通过，已安装排序控件数量为 0。

### Task 4: 精简 MODS 副标题

**Files:**

- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/verify-mac-mods-discovery.mjs`

- [ ] **Step 1: 调整标题结构**

```html
<span class="mods-title-row">
  <strong>MODS</strong>
  <em class="mods-source-badge">非官方</em>
</span>
<span class="mods-subtitle">热门推荐</span>
```

- [ ] **Step 2: 验证精简文案**

```javascript
const entry = page.locator('[data-reference-region="mods-entry"]');
assert.match(await entry.innerText(), /MODS[\s\S]*非官方[\s\S]*热门推荐/);
assert.doesNotMatch(await entry.locator('.mods-subtitle').innerText(), /已安装|仅此设备/);
```

### Task 5: 全量回归、截图和提交

**Files:**

- Test: `demos/Mod与发行人/Mod功能Mac端demo.html`
- Test: `.tmp/mac-mods-discovery-evidence/*.png`

- [ ] **Step 1: 运行全部验证**

```powershell
node .tmp/verify-mac-mods-discovery.mjs
node .tmp/verify-mac-mods-reference.mjs
node .tmp/verify-mac-mods-dom-flow.mjs
node tools/verify-dst-mods-demos.mjs --only=mac
git diff --check -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
```

Expected: 全部 PASS。

- [ ] **Step 2: 审阅浏览与已安装截图**

检查：

- 整卡 hover/focus 层清晰。
- 右下角安装按钮不与整卡热区冲突。
- 四项排序平铺不拥挤。
- 已安装页只有状态筛选。
- 副标题精简且“非官方”标签可辨识。

- [ ] **Step 3: 精确提交**

```powershell
git add -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git diff --cached --check
git commit -m 'refine(mods): simplify mac list interactions'
```

Expected: 提交仅包含 Mac Demo。
