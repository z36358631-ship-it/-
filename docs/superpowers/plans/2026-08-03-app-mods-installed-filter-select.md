# APP MODS 已安装筛选器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已安装页“全部 / 可更新”两个平铺 Tab 改为一个紧贴刷新左侧的筛选下拉，并同步 Demo、截图和 PRD。

**Architecture:** 保留现有 `installedFilter` 状态和 `SET_INSTALLED_FILTER` 事件，只替换控件和事件入口。横竖屏共用同一紧凑操作组，筛选器在前、刷新在后，间距固定 8px。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js、Playwright Core、Markdown、Git。

---

### Task 1: 增加筛选器布局测试

**Files:**
- Modify: `tools/verify-app-mods-demo.mjs`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 将旧的两个 Tab 断言改为单筛选器断言**

```js
const installedFilter = page.locator('[data-installed-filter-select]');
assert.equal(await installedFilter.count(), 1);
assert.deepEqual(
  await installedFilter.locator('option').evaluateAll(options => options.map(option => option.textContent.trim())),
  ['全部', '可更新']
);
assert.equal(await installedFilter.inputValue(), 'all');
assert.equal(await page.locator('.filter-tab').count(), 0);
```

- [ ] **Step 2: 增加筛选器与刷新位置断言**

```js
const installedTools = await page.locator('.installed-controls').evaluate(group => {
  const filter = group.querySelector('[data-installed-filter-select]').getBoundingClientRect();
  const refresh = group.querySelector('.refresh-small').getBoundingClientRect();
  return {
    filterBeforeRefresh: filter.right <= refresh.left,
    gap: Math.round(refresh.left - filter.right)
  };
});
assert.deepEqual(installedTools, { filterBeforeRefresh: true, gap: 8 });
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node tools/verify-app-mods-demo.mjs`

Expected: FAIL，旧页面仍有两个 `.filter-tab`。

### Task 2: 实现单个筛选下拉

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Test: `tools/verify-app-mods-demo.mjs`

- [ ] **Step 1: 替换已安装筛选控件**

```html
<div class="installed-controls">
  <label class="installed-filter-wrap">
    <span class="sr-only">筛选</span>
    <select class="installed-filter-select" data-installed-filter-select aria-label="已安装筛选">
      <option value="all">全部</option>
      <option value="updates">可更新</option>
    </select>
  </label>
  <button class="refresh-small" type="button" data-action="refresh" aria-label="刷新">...</button>
</div>
```

- [ ] **Step 2: 增加紧凑布局样式**

```css
.installed-controls { margin-left:auto; display:flex; align-items:center; gap:8px; }
.installed-controls .refresh-small { margin-left:0; }
.installed-filter-wrap { position:relative; display:flex; }
.installed-filter-select { width:104px; height:36px; appearance:none; padding:0 30px 0 12px; }
```

- [ ] **Step 3: 接入 change 事件**

```js
root.addEventListener('change', event => {
  if (event.target.matches('[data-installed-filter-select]')) {
    dispatch({ type: 'SET_INSTALLED_FILTER', value: event.target.value });
  }
});
```

- [ ] **Step 4: 运行完整测试**

Run: `node tools/verify-app-mods-demo.mjs`

Expected: PASS，横竖屏均只有一个筛选器，且与刷新间距为 8px。

### Task 3: 更新截图和 PRD

**Files:**
- Modify: `public/prd/app-mods/03-installed-portrait.png`
- Modify: `public/prd/app-mods/07-installed-landscape.png`
- Modify: `prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md`

- [ ] **Step 1: 生成十张截图**

Run: `node tools/verify-app-mods-demo.mjs --screenshots`

Expected: `03`、`07` 显示单个筛选器，筛选器紧贴刷新左侧。

- [ ] **Step 2: 更新 PRD**

将“全部 / 可更新”改为“单个下拉筛选器，选项为全部、可更新；筛选器紧贴刷新左侧”。

- [ ] **Step 3: 运行 PRD 校验**

Run: `node tools/verify-app-mods-prd.mjs`

Expected: PASS。

### Task 4: 发布和远程验收

**Files:**
- Modify: `tools/verify-app-mods-prd.mjs`

- [ ] **Step 1: 提交并推送 Demo 与图片资产**

```powershell
git add -- demos/Mod与发行人/APP端MODS功能demo.html tools/verify-app-mods-demo.mjs public/prd/app-mods
git commit -m "fix(mods): compact installed filter control"
git push origin HEAD:main
```

- [ ] **Step 2: 用资产 SHA 更新 PRD 链接并推送**

```powershell
node tools/update-app-mods-prd-assets.mjs <资产提交SHA>
git add -- prd/ai生成/【Prd】《盖世游戏》APP端MODS需求.md tools/verify-app-mods-prd.mjs docs/superpowers
git commit -m "docs(mods): update installed filter screenshots"
git push origin HEAD:main
```

- [ ] **Step 3: 最终验收**

Run:

```powershell
node tools/verify-app-mods-demo.mjs
node tools/verify-app-mods-prd.mjs --remote
```

Expected: Demo PASS；10/10 图片在默认和飞书近似请求下均返回 `200 image/png`。
