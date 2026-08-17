# GameHub GOG UI Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 GOG 退出确认弹窗、我的页 GOG.com 图标缩放和详情页三平台切换层级，同时保持现有账号、平台数据和启动逻辑不变。

**Architecture:** 继续使用单文件 HTML 的现有状态、渲染器和事件委托。退出确认升级为 App 根节点下的共享 `C-DIALOG`；GOG.com 继续使用单一内联 SVG，只通过场景 CSS 等比缩放；详情用直接平台 Tab 替代不可点击的“获取游戏”行和重复平台弹层，并继续由 `state.selectedPlatform` 驱动数据。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、内联 SVG/数据 URI、Node.js、Playwright Core、本地 Chrome、Python 视觉比较工具。

---

## File Structure

- `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`：修改弹窗 DOM/CSS、GOG 标识尺寸、详情平台 Tab 和事件委托。
- `tools/verify-gog-platform-demo.mjs`：增加三项修正的静态契约，移除旧平台弹层与“获取游戏”行契约。
- `tools/verify-gog-platform-demo-ui.mjs`：验证弹窗结构与居中、取消/关闭/确认路径、GOG 图标比例和详情直接切换。
- `tools/capture-gog-platform-demo.mjs`：把旧弹层截图改成直接平台切换截图，并验证平台 Tab 位于类型标签之前。
- `tools/compare-gog-platform-visuals.py`：不修改，只在最终回归中重新生成严格视觉报告。

### Task 1: 锁定 GOG UI 修正契约

**Files:**
- Modify: `tools/verify-gog-platform-demo.mjs`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`
- Modify: `tools/capture-gog-platform-demo.mjs`

- [ ] **Step 1: 增加静态失败契约**

在 `tools/verify-gog-platform-demo.mjs` 中新增并注册：

```js
function gogUiCorrections() {
  for (const token of [
    'data-component-id="C-DIALOG"',
    'logout-confirm__dialog',
    '是否退出该 ${label} 账号？',
    'data-action="close-logout-gog"',
    'data-detail-platform-tabs',
    'data-detail-platform-tab',
    'renderDetailPlatformTabs',
  ]) assert(html.includes(token), `Missing GOG UI correction: ${token}`);
  assert(!html.includes('renderObtainPlatforms'), 'Legacy obtain-platform row remains');
  assert(!html.includes('renderPlatformSwitch'), 'Duplicate platform switch dialog remains');
  pass('gogUiCorrections');
}
```

同时把 `fullGameplayScope()` 中的 `renderPlatformSwitch` 替换为 `renderDetailPlatformTabs`，把 `searchAndDetailCopy()` 中的`获取游戏`删除，避免测试继续锁定旧结构。

- [ ] **Step 2: 增加浏览器弹窗断言**

在 `tools/verify-gog-platform-demo-ui.mjs` 中增加：

```js
async function assertGogLogoutDialog(screen) {
  const root = page.locator(`[data-screen="${screen}"]`);
  const dialog = root.locator('[data-logout-confirm]');
  assert.equal(await dialog.count(), 1, `${screen}: logout dialog missing`);
  assert.equal((await dialog.getByRole('heading').innerText()).trim(), '提示');
  assert((await dialog.innerText()).includes('是否退出该 GOG 账号？'));
  assert.equal(await dialog.getByRole('button', { name:'关闭' }).count(), 1);
  assert.equal(await dialog.getByRole('button', { name:'取消' }).count(), 1);
  assert.equal(await dialog.getByRole('button', { name:'确认' }).count(), 1);
  const [rootBox, dialogBox] = await Promise.all([
    root.boundingBox(),
    dialog.locator('.logout-confirm__dialog').boundingBox(),
  ]);
  assert(Math.abs((rootBox.x + rootBox.width / 2) - (dialogBox.x + dialogBox.width / 2)) <= 2, `${screen}: dialog is not horizontally centered`);
  assert(Math.abs((rootBox.y + rootBox.height / 2) - (dialogBox.y + dialogBox.height / 2)) <= 2, `${screen}: dialog is not vertically centered`);
}
```

在我的页退出流程中分别覆盖取消、关闭和确认；在 GOG 账号库横竖屏覆盖打开与取消，并继续检查 Steam/EPIC 状态不变。

- [ ] **Step 3: 用直接平台 Tab 替换旧弹层断言**

在 `detailSearchFlow()` 的横竖循环中使用：

```js
const root = page.locator(`[data-screen="detail-${orientation}"]`);
const tabs = root.locator('[data-detail-platform-tabs]');
assert.equal(await tabs.count(), 1);
assert.deepEqual(
  await tabs.locator('[data-detail-platform-tab]').evaluateAll(nodes => nodes.map(node => node.dataset.platform)),
  ['steam','epic','gog'],
);
const [tabsBox, tagsBox] = await Promise.all([
  tabs.boundingBox(),
  root.locator('.detail-tags').boundingBox(),
]);
assert(tabsBox.y + tabsBox.height <= tagsBox.y + 1, `${orientation}: platform tabs must precede genre tags`);
assert.equal(await root.locator('[data-platform-switch]').count(), 0);
await tabs.locator('[data-detail-platform-tab][data-platform="epic"]').click();
assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), 'epic');
assert.equal(await tabs.locator('[data-detail-platform-tab][data-platform="epic"].active').count(), 1);
```

把 Control 的渠道断言从 `[data-obtain-platform]` 改为 `[data-detail-platform-tab]`，仍必须只得到 `['gog']`。

- [ ] **Step 4: 更新截图契约**

把两张详情状态截图的准备动作改为：

```js
['13-detail-switch-portrait', 'detail-portrait', async () => {
  await page.click('[data-detail-platform-tab][data-platform="epic"]');
}],
['14-detail-switch-landscape', 'detail-landscape', async () => {
  await page.click('[data-detail-platform-tab][data-platform="epic"]');
}],
```

详情截图检查不再读取 `data-obtain-platforms` 的伪元素文案，改为校验平台 Tab 数量、顺序、选中态、位于 `.detail-tags` 之前且不存在 `[data-platform-switch]`。

- [ ] **Step 5: 运行测试确认旧实现失败**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs gogUiCorrections
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
```

Expected：至少分别因缺少 `C-DIALOG` 新结构、直接平台 Tab 和旧截图动作失败；不能出现测试脚本语法错误。

- [ ] **Step 6: 提交测试契约**

```powershell
git add -- tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs tools/capture-gog-platform-demo.mjs
git commit -m "test: lock GOG UI correction contracts"
```

### Task 2: 实现弹窗、GOG 图标和详情平台 Tab

**Files:**
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`

- [ ] **Step 1: 增加关闭图标并重建共享退出弹窗**

在 `uiIcon()` 中增加：

```js
close:'<path d="M6 6l12 12M18 6 6 18"/>',
```

将 `renderGogLogoutConfirm()` 改为：

```js
function renderGogLogoutConfirm() {
  const platform = state.screen.startsWith('gog-library') ? 'gog' : state.profilePlatform;
  const label = PLATFORM_CAPABILITIES[platform]?.label || 'GOG';
  return `<section class="logout-confirm" data-logout-confirm data-component-id="C-DIALOG" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
    <span class="logout-confirm__mask" aria-hidden="true"></span>
    <div class="logout-confirm__dialog">
      <header><h2 id="logout-confirm-title">提示</h2><button type="button" data-action="close-logout-gog" aria-label="关闭">${uiIcon('close')}</button></header>
      <p>是否退出该 ${label} 账号？</p>
      <footer><button type="button" data-action="cancel-logout-gog">取消</button><button type="button" class="primary" data-action="confirm-logout-gog">确认</button></footer>
    </div>
  </section>`;
}
```

我的页必须把 `${state.showLogoutConfirm ? renderGogLogoutConfirm() : ''}` 从账号卡内部移动到 `.app-viewport` 的直接子节点；GOG 库横竖屏继续在根节点追加同一组件。事件委托把 `close-logout-gog` 与 `cancel-logout-gog` 都映射为关闭且不修改数据。

- [ ] **Step 2: 按用户选择 B 修正 GOG.com 图标比例**

保留 `PLATFORM_MARKS.gog`，将通用与场景 CSS 改为等比约束：

```css
.platform-mark--gog{width:auto;height:22px;max-width:27px;object-fit:contain}
.profile-platform-tabs .platform-mark--gog{width:auto;height:23px;max-width:28px}
.profile-avatar .platform-mark--gog{width:auto;height:25px;max-width:25px}
.platform-account__avatar .platform-mark--gog{width:auto;height:25px;max-width:25px}
.detail-platform-tabs .platform-mark--gog{width:auto;height:20px;max-width:22px}
```

不得新增 GOG Galaxy、单字母 G、文本重绘或第二份 GOG 资源。

- [ ] **Step 3: 创建直接平台 Tab**

用以下函数替换 `renderObtainPlatforms()` 和 `renderPlatformSwitch()`：

```js
function renderDetailPlatformTabs() {
  const seen = new Set();
  const platforms = GAME_PLATFORM_VERSIONS
    .filter(item => item.gameId === getSelectedGameId() && !seen.has(item.platform) && seen.add(item.platform))
    .map(item => item.platform);
  return `<nav class="detail-platform-tabs" data-detail-platform-tabs aria-label="游戏平台切换">
    ${platforms.map(platform => `<button type="button" data-detail-platform-tab data-action="select-detail-platform" data-platform="${platform}" class="${platform === state.selectedPlatform ? 'active' : ''}" aria-pressed="${platform === state.selectedPlatform}">${renderPlatformMark(platform)}<span>${DETAIL_BY_PLATFORM[platform].label}</span></button>`).join('')}
  </nav>`;
}
```

移除 `platformSwitchOpen`、`openPlatformSwitch()`、`closePlatformSwitch()` 及对应事件分支。`selectDetailPlatform(platform)` 只设置 `state.selectedPlatform = platform` 并重新渲染。

- [ ] **Step 4: 调整详情横竖屏 DOM 顺序**

竖屏摘要改为：

```js
<div class="detail-title-row">...</div>
<p>获奖无数的开放世界，以极致帧率呈现沉浸体验。</p>
${renderDetailPlatformTabs()}
<div class="detail-tags"><span>动作</span><span>冒险游戏</span></div>
<div class="detail-meta">...</div>
<section class="detail-engine">...</section>
```

横屏标题区使用相同顺序：标题、简介、`renderDetailPlatformTabs()`、类型标签、主操作。引擎卡只显示当前平台、云存档、时长和评分，不再渲染底部“获取游戏”行或平台弹层。

- [ ] **Step 5: 增加平台 Tab 视觉层级**

```css
.detail-platform-tabs{display:flex;align-items:center;gap:8px;margin:10px 0 8px}
.detail-platform-tabs button{display:inline-flex;height:30px;align-items:center;gap:6px;padding:0 9px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#202226;color:#96989f;font-size:8px}
.detail-platform-tabs button.active{border-color:rgba(255,255,255,.34);background:#35363b;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.detail-platform-tabs .platform-mark{width:auto;height:18px;object-fit:contain}
.detail-page--landscape .detail-platform-tabs{margin-top:10px;margin-bottom:8px}
```

类型标签继续使用原灰色胶囊，平台 Tab 必须通过图标、边框和选中态与类型标签区分。

- [ ] **Step 6: 运行局部回归**

```powershell
node tools/verify-gog-platform-demo.mjs gogUiCorrections
node tools/verify-gog-platform-demo.mjs syntax
node tools/verify-gog-platform-demo-ui.mjs profile
node tools/verify-gog-platform-demo-ui.mjs library
node tools/verify-gog-platform-demo-ui.mjs detailSearch
```

Expected：全部 PASS；弹窗取消/关闭不写账号状态，确认只退出 GOG；详情横竖屏直接切换 EPIC 后时长、云存档和启动按钮同步更新。

- [ ] **Step 7: 提交实现**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m "fix: align GOG account and detail controls"
```

### Task 3: 最终截图、严格比较与交付

**Files:**
- Verify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Verify: `tools/verify-gog-platform-demo.mjs`
- Verify: `tools/verify-gog-platform-demo-ui.mjs`
- Verify: `tools/capture-gog-platform-demo.mjs`
- Verify: `tools/compare-gog-platform-visuals.py`

- [ ] **Step 1: 运行完整回归**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
python -X utf8 tools/compare-gog-platform-visuals.py
```

Expected：静态和浏览器业务契约全部 PASS；生成 15 张预览截图和 10 张源分辨率截图。严格视觉比较可以因新增内容与基准不同保持 FAIL，但必须输出真实结果且不能隐藏失败。

- [ ] **Step 2: 人工审查四项关键证据**

原尺寸检查：

```text
.tmp/gog-platform-demo-captures/01-profile-portrait.png
.tmp/gog-platform-demo-captures/05-gog-library-portrait.png
.tmp/gog-platform-demo-captures/09-detail-portrait.png
.tmp/gog-platform-demo-captures/10-detail-landscape.png
```

另外操作退出账号，确认弹窗与用户提供截图在标题、关闭、正文、双按钮、圆角和遮罩层级上一致；确认 GOG.com 图标没有拉伸；确认详情平台 Tab 位于类型标签之前且不存在第二套入口。

- [ ] **Step 3: 检查任务范围与格式**

```powershell
git diff --check -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs `
  tools/capture-gog-platform-demo.mjs
git status --short -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs `
  tools/capture-gog-platform-demo.mjs
```

Expected：无空白错误；最终提交只包含以上四个实现/验证文件，工作区其他用户改动不进入提交。

- [ ] **Step 4: 最终提交**

如果局部提交后仍有本任务修正未提交：

```powershell
git add -- `
  'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' `
  tools/verify-gog-platform-demo.mjs `
  tools/verify-gog-platform-demo-ui.mjs `
  tools/capture-gog-platform-demo.mjs
git commit -m "test: verify GOG UI corrections"
```

若无剩余差异则不创建空提交。
