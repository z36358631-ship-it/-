# Mac 原生游戏版本切换弹窗细化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将版本切换弹窗打磨为只选择目标版本的高保真弹窗，并确保未安装版本的实际下载只由游戏详情主按钮触发。

**Architecture:** 继续维护单文件 HTML，但把“用户当前选择的版本”和“实际默认启动版本”分别记录为 `selectedVersion` 与 `activeVersion`。版本弹窗只更新选择状态；详情主按钮根据 `selectedVersion` 是否已安装决定显示“开始游戏”或“下载大小”，安装路径弹窗只在用户点击下载主按钮时打开。

**Tech Stack:** HTML、CSS、原生 JavaScript、行内 SVG、Node.js 内置 `node:test`、浏览器视觉与交互验收。

---

## 文件结构

- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`：版本弹窗视觉、点击热区和版本状态机。
- Modify: `tests/mac-native-version-demo.test.mjs`：弹窗信息边界、点击区域和安装入口回归测试。
- Modify: `docs/superpowers/plans/2026-08-07-mac-native-version-switch-refinement.md`：执行过程中勾选完成项。

本次不拆分 HTML、CSS 和 JavaScript 文件，不修改游戏库、搜索结果、设置页或安装路径弹窗的既有页面结构。

### Task 1: 用失败测试锁定版本弹窗边界

**Files:**
- Modify: `tests/mac-native-version-demo.test.mjs`
- Test: `tests/mac-native-version-demo.test.mjs`

- [x] **Step 1: 增加函数源码提取工具**

在 `html` 常量后加入：

```js
function functionSource(name, nextName) {
  const source = html.match(
    new RegExp(`function ${name}\\([^)]*\\)\\{([\\s\\S]*?)\\n    function ${nextName}\\(`)
  )?.[1];
  assert.ok(source, `缺少函数 ${name}`);
  return source;
}
```

- [x] **Step 2: 增加弹窗纯选择信息测试**

在“详情页包含当前页版本切换弹窗”测试后加入：

```js
test('版本切换弹窗只展示版本名称和切换操作', () => {
  const dialog = html.match(
    /<div class="overlay" id="versionSwitchOverlay"([\s\S]*?)<div class="overlay" id="installOverlay"/
  )?.[1] ?? '';
  const render = functionSource('renderVersionSwitch', 'openVersionSwitch');

  assert.doesNotMatch(dialog, /version-switch-copy/);
  assert.doesNotMatch(render, /已安装|未安装|当前使用|下载并切换|\.size/);
  assert.match(render, /v\.id===state\.selectedVersion/);
  assert.match(render, /version-switch-check/);
  assert.match(render, /data-action="choose-version"/);
  assert.match(render, />切换</);
});
```

- [x] **Step 3: 增加切换与安装入口分离测试**

继续加入：

```js
test('选择未安装版本不会直接打开安装弹窗', () => {
  const choose = functionSource('chooseVersion', 'renderInstall');
  const settingsSwitch = functionSource('switchVersion', 'install');
  assert.match(choose, /state\.selectedVersion=id/);
  assert.doesNotMatch(choose, /openInstall/);
  assert.doesNotMatch(settingsSwitch, /openInstall/);
  assert.match(
    html,
    /a==='detail-primary'[^\n]*openInstall\(state\.selectedVersion\)/
  );
  assert.doesNotMatch(html, /targetVersion/);
});
```

- [x] **Step 4: 增加点击热区测试**

继续加入：

```js
test('版本弹窗只有明确按钮可点击且热区达标', () => {
  assert.match(
    html,
    /\.version-switch-action\{[^}]*width:88px;[^}]*height:44px/
  );
  assert.match(
    html,
    /\.version-switch-close\{[^}]*width:44px;[^}]*height:44px/
  );
  assert.match(html, /\.version-switch-row\{[^}]*cursor:default/);
  assert.doesNotMatch(html, /version-switch-row[^>]*data-action=/);
});
```

- [x] **Step 5: 运行测试并确认失败原因正确**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs
```

Expected: 新增三项测试 FAIL；失败信息至少包含 `version-switch-copy`、`selectedVersion` 或 `version-switch-action`，原有四项测试继续 PASS。

- [x] **Step 6: 提交测试基线**

```powershell
git add -- tests/mac-native-version-demo.test.mjs
git commit -m "test: define Mac version switch refinement"
```

### Task 2: 按原安装弹窗风格重做版本弹窗视觉

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-version-demo.test.mjs`

- [x] **Step 1: 替换版本弹窗 CSS**

删除现有 `.version-switch-modal` 到 `.version-switch-row.current` 的样式，替换为：

```css
.version-switch-modal{width:548px;border:1px solid rgba(255,255,255,.14);border-radius:15px;background:linear-gradient(145deg,rgba(35,35,36,.98),rgba(24,25,25,.98));box-shadow:0 35px 85px rgba(0,0,0,.5);padding:24px 24px 20px}
.version-switch-head{height:42px;display:flex;align-items:flex-start;justify-content:center;position:relative}
.version-switch-head h2{font-size:18px}
.version-switch-close{position:absolute;right:-7px;top:-11px;width:44px;height:44px;display:grid;place-items:center;color:#8f989c;font-size:25px;line-height:1}
.version-switch-list{border-top:1px solid rgba(255,255,255,.08)}
.version-switch-row{height:72px;display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,.08);padding:0 7px;cursor:default}
.version-switch-row.selected{background:rgba(174,213,239,.035)}
.version-switch-icon{width:36px;height:36px;border-radius:9px;background:#324650;display:grid;place-items:center;color:#eef7ff;flex:none}
.version-switch-icon.native{background:linear-gradient(145deg,#435c78,#313f63)}
.version-switch-icon svg{width:19px;height:19px;fill:currentColor}
.version-switch-name{margin-left:13px;font-size:13px;font-weight:600}
.version-switch-check{margin-left:auto;width:36px;height:36px;display:grid;place-items:center;color:#cfe8f8;font-size:18px}
.version-switch-action{position:relative;margin-left:auto;width:88px;height:44px;color:#d8e0e4;font-size:12px}
.version-switch-action:before{content:"";position:absolute;left:0;right:0;top:6px;bottom:6px;border:1px solid rgba(255,255,255,.18);border-radius:17px;background:rgba(255,255,255,.025)}
.version-switch-action span{position:relative}
.version-switch-action:hover:before,.version-switch-action:focus-visible:before{background:rgba(255,255,255,.08);border-color:rgba(215,235,247,.32)}
```

- [x] **Step 2: 精简版本弹窗 DOM**

将 `versionSwitchOverlay` 替换为：

```html
<div class="overlay" id="versionSwitchOverlay" role="dialog" aria-modal="true" aria-labelledby="versionSwitchTitle">
  <div class="version-switch-modal">
    <div class="version-switch-head">
      <h2 id="versionSwitchTitle">切换版本</h2>
      <button class="version-switch-close" data-action="close-version-switch" aria-label="关闭">×</button>
    </div>
    <div class="version-switch-list" id="versionSwitchList"></div>
  </div>
</div>
```

删除副标题“切换默认启动版本不会删除已安装的原版本”，不增加任何替代说明。

- [x] **Step 3: 运行点击热区相关测试**

Run:

```powershell
node --test --test-name-pattern="热区|详情页包含" tests/mac-native-version-demo.test.mjs
```

Expected: 点击热区测试 PASS；“版本切换弹窗只展示版本名称和切换操作”仍因渲染函数保留状态与大小而 FAIL。

- [x] **Step 4: 提交视觉结构**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html"
git commit -m "style: refine Mac version switch dialog"
```

### Task 3: 分离版本选择状态与安装动作

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-version-demo.test.mjs`

- [x] **Step 1: 将 `targetVersion` 统一改名为 `selectedVersion`**

将状态定义改为：

```js
const state={page:'library',activeVersion:'steam',selectedVersion:'steam',selectedInstallVersion:'steam',installedVersions:new Set(['steam']),installPath:'valid',downloadState:'idle',downloadProgress:0,downloadTimer:null};
```

并在 `render`、`switchVersion`、`install`、详情主按钮事件中将所有 `state.targetVersion` 替换为 `state.selectedVersion`。`render` 的首行保持：

```js
const selected=versions[state.selectedVersion],active=versions[state.activeVersion],selectedInstalled=state.installedVersions.has(selected.id);
```

详情区更新改为：

```js
$('#detailSize').textContent=selected.size;
$('#detailPlatform').innerHTML=selected.native?`${icons.steam}${icons.nativeLabel}`:icons.steam;
$('#detailCta').innerHTML=selectedInstalled?`${versionIcon(selected.id)}<span>开始游戏</span>`:`${versionIcon(selected.id)}<span>下载 ${selected.size}</span>`;
```

- [x] **Step 2: 替换版本弹窗渲染函数**

将 `renderVersionSwitch` 替换为：

```js
function renderVersionSwitch(){
  $('#versionSwitchList').innerHTML=Object.values(versions).map(v=>{
    const selected=v.id===state.selectedVersion;
    const icon=v.native?'<svg><use href="#i-apple"/></svg>':'<svg><use href="#i-steam"/></svg>';
    const action=selected
      ? '<span class="version-switch-check" aria-label="当前选择">✓</span>'
      : `<button class="version-switch-action" data-action="choose-version" data-version="${v.id}"><span>切换</span></button>`;
    return `<div class="version-switch-row ${selected?'selected':''}"><span class="version-switch-icon ${v.native?'native':''}">${icon}</span><span class="version-switch-name">${v.name}</span>${action}</div>`;
  }).join('');
}
```

- [x] **Step 3: 更新弹窗焦点目标**

将 `openVersionSwitch` 改为：

```js
function openVersionSwitch(){
  closeDetailMore();
  renderVersionSwitch();
  $('#versionSwitchOverlay').classList.add('show');
  setTimeout(()=>$('#versionSwitchOverlay .version-switch-action')?.focus(),0);
}
```

- [x] **Step 4: 替换选择版本逻辑**

将 `chooseVersion` 替换为：

```js
function chooseVersion(id){
  if(!versions[id]||id===state.selectedVersion)return;
  state.selectedVersion=id;
  if(state.installedVersions.has(id))state.activeVersion=id;
  closeVersionSwitch(false);
  render();
}
```

该函数不得调用 `openInstall`。选择未安装版本后只改变详情展示，不改变 `activeVersion`。

- [x] **Step 5: 保留详情主按钮为唯一安装入口**

将详情主按钮事件分支固定为：

```js
if(a==='detail-primary'){
  state.installedVersions.has(state.selectedVersion)
    ? null
    : openInstall(state.selectedVersion);
}
```

`openInstall` 继续把传入版本写入 `selectedInstallVersion`，安装弹窗中的路径和版本选择逻辑保持不变。

- [x] **Step 6: 更新安装成功与设置页切换的状态同步**

安装成功时使用：

```js
state.installedVersions.add(selected.id);
state.activeVersion=selected.id;
state.selectedVersion=selected.id;
state.downloadState='success';
```

设置页 `switchVersion` 保持兼容，但改为：

```js
function switchVersion(id){
  if(state.installedVersions.has(id)){
    state.activeVersion=id;
    state.selectedVersion=id;
    render();
    return;
  }
  state.selectedVersion=id;
  showPage('detail');
  render();
}
```

设置页选择未安装版本后同样只返回详情并显示下载主按钮，不得绕过详情主按钮直接打开安装弹窗。

- [x] **Step 7: 运行全部自动测试**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs
```

Expected: 9 tests PASS，0 FAIL；内联脚本语法测试 PASS。

- [x] **Step 8: 提交状态机修改**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" tests/mac-native-version-demo.test.mjs
git commit -m "feat: separate Mac version selection from install"
```

### Task 3.5: 收口设置页文案与下载中的可变状态

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Modify: `tests/mac-native-version-demo.test.mjs`
- Create: `tests/mac-native-version-demo.browser.test.mjs`
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Create: `tests/mac-native-prd.test.mjs`

- [x] **Step 1: 增加失败测试锁定设置页文案**

在静态测试中断言未安装版本的设置页按钮使用“选择版本”，不得继续显示会承诺立即下载的“下载并切换”。

- [x] **Step 2: 增加失败测试锁定下载期间状态**

用 Playwright 打开单文件 Demo，启动 Mac 原生版下载后检查：

```text
安装位置按钮 disabled。
游戏版本入口与版本选项 disabled。
下载期间调用路径切换无效。
取消后 downloadProgress 和 progressBar 均归零。
```

- [x] **Step 3: 实现下载锁定与取消复位**

`renderInstall()` 根据 `downloadState === 'downloading'` 同步禁用路径、版本入口和版本选项；`cyclePath()`、版本菜单点击处理增加同一状态保护；`cancelDownload()` 清零 `downloadProgress` 和进度条宽度。

- [x] **Step 4: 修正设置页文案与 PRD 当前执行口径**

未安装版本按钮从“下载并切换”改为“选择版本”。点击后只选择目标版本并返回详情，不自动打开安装弹窗；用户继续点击“…”左侧主按钮开始安装。

- [x] **Step 5: 运行静态与真实浏览器测试**

Run:

```powershell
node --test tests/mac-native-version-demo.test.mjs tests/mac-native-version-demo.browser.test.mjs tests/mac-native-prd.test.mjs
```

Expected: 全部测试 PASS；浏览器页面错误为 0。

---

### Task 4: 浏览器高保真与完整链路验收

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`（仅在验收发现偏差时）
- Test: `tests/mac-native-version-demo.test.mjs`

- [x] **Step 1: 在 `1076×734px` 逻辑画布检查弹窗视觉**

打开：

```text
http://127.0.0.1:8765/demos/PC与Mac端/Mac原生游戏版本管理demo.html
```

依次操作：游戏库 → 僵尸世界大战 → “…” → 切换版本。

Expected:

```text
弹窗与安装路径弹窗等宽，标题和关闭按钮位置一致。
列表没有副标题、卡片边框、安装状态、大小或“下载并切换”。
Steam 当前选择行为轻微高亮＋对勾；Mac 原生版右侧只有“切换”。
版本整行不可点击，只有“切换”按钮和关闭按钮有点击反馈。
```

- [x] **Step 2: 验证未安装版本选择链路**

依次操作：点击 Mac 原生版“切换”。

Expected:

```text
版本弹窗关闭。
安装路径弹窗没有自动打开。
详情主按钮变为“Mac 原生版 Icon＋下载 284.6 MB”。
再次打开版本弹窗时，Mac 原生版显示高亮＋对勾，Steam 显示“切换”。
```

- [x] **Step 3: 验证详情主按钮安装链路**

点击详情主按钮“Mac 原生版 下载 284.6 MB”。

Expected:

```text
安装路径弹窗打开。
游戏版本默认选择 Mac 原生版。
安装位置、需要安装空间和底部“安装游戏”按钮保持原图结构。
```

先关闭弹窗，确认主按钮仍为 Mac 原生下载；再重新进入并完成安装。

Expected:

```text
安装成功后详情主按钮变为“Mac 原生版 Icon＋开始游戏”。
游戏库对应封面出现 Mac 原生 Icon。
再次打开版本弹窗时 Mac 原生版仍为对勾，Steam 可“切换”。
```

- [x] **Step 4: 验证已安装版本即时切换**

安装完成后通过弹窗点击 Steam“切换”。

Expected:

```text
弹窗关闭，不打开安装路径弹窗。
详情主按钮立即变为“Steam Icon＋开始游戏”。
原 Mac 原生版仍保留，可再次切回。
```

- [x] **Step 5: 检查控制台与截图**

读取浏览器 `error` 级别日志。

Expected: 页面脚本 error 数量为 `0`。

至少保留以下可见状态截图供自检：

```text
版本切换弹窗初始状态。
选择未安装 Mac 原生版后的详情下载按钮。
安装路径弹窗默认选择 Mac 原生版。
安装完成后的版本切换弹窗。
```

- [x] **Step 6: 运行最终自动检查**

```powershell
node --test tests/mac-native-version-demo.test.mjs
$html=Get-Content -Raw -Encoding UTF8 "demos\PC与Mac端\Mac原生游戏版本管理demo.html"
if($html -match '<iframe|src=["'']https?://|href=["'']https?://|@import\s+url'){throw '发现外部依赖'}else{'External dependencies: none'}
git diff --check -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" tests/mac-native-version-demo.test.mjs
```

Expected:

```text
9 tests PASS，0 FAIL。
External dependencies: none。
git diff --check 无输出。
```

- [x] **Step 7: 提交验收修正**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" tests/mac-native-version-demo.test.mjs docs/superpowers/plans/2026-08-07-mac-native-version-switch-refinement.md
git commit -m "test: verify refined Mac version switching"
```

### Task 5: 完成计划记录与交付

**Files:**
- Modify: `docs/superpowers/plans/2026-08-07-mac-native-version-switch-refinement.md`

- [x] **Step 1: 将所有已完成步骤从 `[ ]` 更新为 `[x]`**

仅在对应测试、实现或浏览器验收实际完成后勾选，不提前标记。

- [x] **Step 2: 确认任务文件无未提交改动**

```powershell
git status --short -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" tests/mac-native-version-demo.test.mjs docs/superpowers/plans/2026-08-07-mac-native-version-switch-refinement.md
```

Expected: 无输出。

- [x] **Step 3: 保留最终 Demo 浏览器标签**

最终标签打开游戏库初始页，并标记为用户可继续体验的 `deliverable`；关闭或释放过程中的对比页与重复标签。
