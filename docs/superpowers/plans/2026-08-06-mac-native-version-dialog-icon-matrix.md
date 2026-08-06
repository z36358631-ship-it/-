# Mac 原生版本弹窗与 Icon 示例矩阵 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将游戏详情的版本切换改为当前页弹窗，并在游戏库与搜索结果中补齐 Steam、Epic、GOG、来源平台＋Mac 原生的 Icon 示例。

**Architecture:** 继续使用现有单文件 HTML 和同一份 `state` 版本状态。版本切换弹窗只负责选择版本：已安装版本立即切换，未安装版本复用现有安装路径弹窗；游戏库和搜索中的平台组合为静态评审示例，只有详情示例卡片的 Mac 原生状态跟随 `activeVersion` 更新。

**Tech Stack:** HTML、CSS、原生 JavaScript、行内 SVG、Node.js 内置测试、浏览器视觉验收。

---

## 文件结构

- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`：单文件 Demo 的视觉、状态和交互。
- Create: `tests/mac-native-version-demo.test.mjs`：使用 Node.js 内置 `node:test` 完成结构、状态钩子与脚本语法检查。
- Modify: `docs/superpowers/plans/2026-08-06-mac-native-version-dialog-icon-matrix.md`：实施过程中勾选完成状态。

### Task 1: 建立结构回归测试

**Files:**
- Create: `tests/mac-native-version-demo.test.mjs`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 写入版本弹窗与 Icon 矩阵的失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(
  new URL('../demos/PC与Mac端/Mac原生游戏版本管理demo.html', import.meta.url),
  'utf8'
);

test('游戏库覆盖全部平台与原生组合示例', () => {
  for (const name of [
    'installed-steam',
    'installed-epic',
    'installed-gog',
    'installed-steam-native',
    'installed-epic-native',
    'uninstalled-steam',
    'uninstalled-epic',
    'uninstalled-gog',
    'uninstalled-steam-native'
  ]) {
    assert.match(html, new RegExp(`data-demo-case="${name}"`));
  }
});

test('搜索结果只展示平台与版本，不展示安装状态', () => {
  for (const name of ['search-steam', 'search-epic', 'search-gog', 'search-steam-native', 'search-epic-native']) {
    assert.match(html, new RegExp(`data-demo-case="${name}"`));
  }
  const search = html.match(/<div class="results">([\s\S]*?)<\/div><\/div><\/div>/)?.[1] ?? '';
  assert.doesNotMatch(search, /已安装|未安装|当前使用/);
});

test('详情页包含当前页版本切换弹窗', () => {
  assert.match(html, /id="versionSwitchOverlay"/);
  assert.match(html, /id="versionSwitchList"/);
  assert.match(html, /data-action="open-version-switch"/);
  assert.match(html, /data-action="choose-version"/);
  assert.doesNotMatch(html, /data-action="open-version-settings"/);
});

test('内联脚本语法正确', () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, '缺少内联脚本');
  assert.doesNotThrow(() => new Function(script));
});
```

- [ ] **Step 2: 运行测试并确认新需求尚未实现**

Run: `node --test tests/mac-native-version-demo.test.mjs`

Expected: FAIL，至少报告缺少 `installed-epic`、`versionSwitchOverlay` 或 `open-version-switch`。

- [ ] **Step 3: 提交测试基线**

```powershell
git add -- tests/mac-native-version-demo.test.mjs
git commit -m "test: cover Mac version dialog and icon matrix"
```

### Task 2: 补齐平台图标与游戏库封面示例

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 增加 Epic 与 GOG 行内 SVG Symbol**

在 `i-steam` 与 `i-apple` 附近加入：

```html
<symbol id="i-epic" viewBox="0 0 24 24">
  <path d="M5 3h14v15l-7 3-7-3z" fill="currentColor" stroke="none"/>
  <path d="M8 7h8M8 10h6M8 13h8" fill="none" stroke="#17252b" stroke-width="1.4"/>
</symbol>
<symbol id="i-gog" viewBox="0 0 24 24">
  <rect x="3" y="6" width="18" height="12" rx="3" fill="currentColor" stroke="none"/>
  <path d="M9 10H7.5a2 2 0 1 0 0 4H9v-2H7.7M15 10h1.5a2 2 0 1 1 0 4H15z" fill="none" stroke="#17252b" stroke-width="1.2"/>
</symbol>
```

- [ ] **Step 2: 统一封面 Icon 容器样式**

保留右下角 `platform-badges`，让平台 Icon 使用 `20×20px` 方形芯片、Mac 原生使用带文字芯片：

```css
.platform-badges{position:absolute;z-index:2;right:6px;bottom:6px;display:flex;align-items:center;gap:4px}
.platform-chip,.native-chip{height:20px;border-radius:6px;align-items:center;justify-content:center;background:rgba(12,18,22,.82);color:#eef7ff;border:1px solid rgba(196,226,247,.25);backdrop-filter:blur(8px)}
.platform-chip{width:20px}.platform-chip svg{width:12px;height:12px;fill:currentColor}
.platform-chip{display:flex}.native-chip{padding:0 6px;display:none;gap:4px;font-size:9px}.native-chip.show{display:flex}.native-chip svg{width:10px;height:12px;fill:currentColor}
```

- [ ] **Step 3: 将已安装分组映射为可见示例矩阵**

在现有七张卡片上使用以下 `data-demo-case`，不增加说明条、角标或新文案：

```html
<button class="game-card" data-action="open-detail" data-demo-case="installed-steam"><div class="game-cover crop c1"><span class="platform-badges"><span class="platform-chip" title="Steam" aria-label="Steam"><svg><use href="#i-steam"/></svg></span></span></div><div class="game-name">刺客信条：黑旗 记忆重置</div></button>
<button class="game-card" data-action="open-detail" data-demo-case="installed-epic"><div class="game-cover crop c2"><span class="platform-badges"><span class="platform-chip" title="Epic" aria-label="Epic"><svg><use href="#i-epic"/></svg></span></span></div><div class="game-name">黑神话：悟空</div></button>
<button class="game-card" data-action="open-detail" data-demo-case="installed-gog"><div class="game-cover crop c3"><span class="platform-badges"><span class="platform-chip" title="GOG" aria-label="GOG"><svg><use href="#i-gog"/></svg></span></span></div><div class="game-name">霍格沃茨之遗</div></button>
<button class="game-card" data-action="open-detail" data-demo-case="installed-steam-native"><div class="game-cover crop c4"><span class="platform-badges"><span class="platform-chip" title="Steam" aria-label="Steam"><svg><use href="#i-steam"/></svg></span><span class="native-chip" id="managedNativeChip" title="当前使用 Mac 原生版" aria-label="当前使用 Mac 原生版"><svg><use href="#i-apple"/></svg><span>Mac 原生</span></span></span></div><div class="game-name">僵尸世界大战</div></button>
<button class="game-card" data-action="open-detail" data-demo-case="installed-epic-native"><div class="game-cover crop c5"><span class="platform-badges"><span class="platform-chip" title="Epic" aria-label="Epic"><svg><use href="#i-epic"/></svg></span><span class="native-chip show" title="Mac 原生版" aria-label="Mac 原生版"><svg><use href="#i-apple"/></svg><span>Mac 原生</span></span></span></div><div class="game-name">赛博朋克 2077</div></button>
<button class="game-card" data-action="open-detail" data-demo-case="installed-steam"><div class="game-cover crop c6"><span class="platform-badges"><span class="platform-chip" title="Steam" aria-label="Steam"><svg><use href="#i-steam"/></svg></span></span></div><div class="game-name">无主之地3</div></button>
<button class="game-card" data-action="open-detail" data-demo-case="installed-steam-native"><div class="game-cover crop c7"><span class="platform-badges"><span class="platform-chip" title="Steam" aria-label="Steam"><svg><use href="#i-steam"/></svg></span><span class="native-chip show" title="Mac 原生版" aria-label="Mac 原生版"><svg><use href="#i-apple"/></svg><span>Mac 原生</span></span></span></div><div class="game-name">星际战甲</div></button>
```

- [ ] **Step 4: 将未安装分组映射为准备下载版本示例**

四张卡片分别使用：

```html
<button class="game-card" data-demo-case="uninstalled-steam"><div class="game-cover crop u1"><span class="platform-badges"><span class="platform-chip" title="Steam" aria-label="Steam"><svg><use href="#i-steam"/></svg></span></span></div><div class="game-name">112 Operator</div></button>
<button class="game-card" data-demo-case="uninstalled-epic"><div class="game-cover crop u2"><span class="platform-badges"><span class="platform-chip" title="Epic" aria-label="Epic"><svg><use href="#i-epic"/></svg></span></span></div><div class="game-name">奥日与黑暗森林</div></button>
<button class="game-card" data-demo-case="uninstalled-gog"><div class="game-cover crop u3"><span class="platform-badges"><span class="platform-chip" title="GOG" aria-label="GOG"><svg><use href="#i-gog"/></svg></span></span></div><div class="game-name">ARK: The Survival Of The Fittest</div></button>
<button class="game-card" data-demo-case="uninstalled-steam-native"><div class="game-cover crop u4"><span class="platform-badges"><span class="platform-chip" title="Steam" aria-label="Steam"><svg><use href="#i-steam"/></svg></span><span class="native-chip show" title="Mac 原生版" aria-label="Mac 原生版"><svg><use href="#i-apple"/></svg><span>Mac 原生</span></span></span></div><div class="game-name">ARMA: Cold War Assault</div></button>
```

以上卡片只展示平台与版本 Icon，不增加“未安装”封面角标。

- [ ] **Step 5: 运行游戏库矩阵测试**

Run: `node --test tests/mac-native-version-demo.test.mjs --test-name-pattern="游戏库"`

Expected: PASS。

- [ ] **Step 6: 提交游戏库 Icon 矩阵**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html"
git commit -m "feat: add platform icon examples to game library"
```

### Task 3: 在详情当前页增加版本切换弹窗

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 增加版本切换弹窗样式**

在现有 `.overlay` 和 `.version-card` 样式附近加入：

```css
.version-switch-modal{width:520px;border:1px solid rgba(255,255,255,.14);border-radius:15px;background:linear-gradient(145deg,rgba(35,35,36,.98),rgba(24,25,25,.98));box-shadow:0 35px 85px rgba(0,0,0,.5);padding:24px 22px 22px}
.version-switch-head{height:38px;display:flex;align-items:flex-start;justify-content:center;position:relative}
.version-switch-head h2{font-size:18px}.version-switch-close{position:absolute;right:0;top:-4px;color:#9ba1a3;font-size:25px;line-height:1}
.version-switch-copy{font-size:11px;color:#89969b;text-align:center;margin:2px 0 17px}
.version-switch-list{display:flex;flex-direction:column;gap:10px}
.version-switch-row{min-height:72px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.025);display:flex;align-items:center;padding:12px 14px}
.version-switch-row.current{border-color:rgba(168,213,246,.34);background:rgba(132,187,226,.07)}
```

- [ ] **Step 2: 增加弹窗 DOM**

放在 `searchOverlay` 与 `installOverlay` 同级位置：

```html
<div class="overlay" id="versionSwitchOverlay" role="dialog" aria-modal="true" aria-labelledby="versionSwitchTitle">
  <div class="version-switch-modal">
    <div class="version-switch-head">
      <h2 id="versionSwitchTitle">切换版本</h2>
      <button class="version-switch-close" data-action="close-version-switch" aria-label="关闭">×</button>
    </div>
    <p class="version-switch-copy">切换默认启动版本不会删除已安装的原版本</p>
    <div class="version-switch-list" id="versionSwitchList"></div>
  </div>
</div>
```

- [ ] **Step 3: 将“…”菜单动作改为打开当前页弹窗**

```html
<button class="detail-more-item" data-action="open-version-switch" role="menuitem">切换版本</button>
```

- [ ] **Step 4: 增加弹窗渲染与开关函数**

```js
function renderVersionSwitch(){
  $('#versionSwitchList').innerHTML=Object.values(versions).map(v=>{
    const installed=state.installedVersions.has(v.id),current=v.id===state.activeVersion;
    const icon=v.native?'<svg><use href="#i-apple"/></svg>':'<svg><use href="#i-steam"/></svg>';
    return `<div class="version-switch-row ${current?'current':''}"><span class="version-icon ${v.native?'native':''}">${icon}</span><span class="version-copy"><strong>${v.name}${current?'<span class="current-tag">当前使用</span>':''}</strong><p>${installed?`已安装 · ${v.size}`:`未安装 · 下载 ${v.size}`}</p></span><button class="version-action ${!installed?'primary':''}" data-action="choose-version" data-version="${v.id}" ${current?'disabled':''}>${current?'当前使用':installed?'切换':'下载并切换'}</button></div>`;
  }).join('');
}
function openVersionSwitch(){
  closeDetailMore();
  renderVersionSwitch();
  $('#versionSwitchOverlay').classList.add('show');
  setTimeout(()=>$('#versionSwitchOverlay .version-action:not(:disabled)')?.focus(),0);
}
function closeVersionSwitch(){
  $('#versionSwitchOverlay').classList.remove('show');
  $('#detailMoreBtn').focus();
}
```

- [ ] **Step 5: 增加选择版本的状态流**

```js
function chooseVersion(id){
  if(state.installedVersions.has(id)){
    state.activeVersion=id;
    state.targetVersion=id;
    $('#versionSwitchOverlay').classList.remove('show');
    render();
    return;
  }
  state.targetVersion=id;
  $('#versionSwitchOverlay').classList.remove('show');
  openInstall(id);
}
```

事件代理增加：

```js
if(a==='open-version-switch')openVersionSwitch();
if(a==='close-version-switch')closeVersionSwitch();
if(a==='choose-version')chooseVersion(t.dataset.version);
```

Escape 分支增加：

```js
if($('#versionSwitchOverlay').classList.contains('show'))closeVersionSwitch();
```

- [ ] **Step 6: 运行版本弹窗结构与语法测试**

Run: `node --test tests/mac-native-version-demo.test.mjs --test-name-pattern="版本切换|内联脚本"`

Expected: PASS。

- [ ] **Step 7: 提交当前页版本弹窗**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html"
git commit -m "feat: switch game versions in detail modal"
```

### Task 4: 补齐搜索结果 Icon 示例

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 为搜索平台 Icon 增加统一可访问标签**

每个结果继续使用右侧 `result-platforms`，单平台示例结构为：

```html
<span class="result-platforms">
  <svg title="Epic" aria-label="Epic"><use href="#i-epic"/></svg>
  <span class="arrow-out">↗</span>
</span>
```

Mac 原生组合结构为：

```html
<span class="result-platforms">
  <svg title="Steam" aria-label="Steam"><use href="#i-steam"/></svg>
  <svg class="search-native show" title="支持 Mac 原生版" aria-label="支持 Mac 原生版"><use href="#i-apple"/></svg>
  <span class="arrow-out">↗</span>
</span>
```

- [ ] **Step 2: 将七条搜索结果映射为完整组合**

用以下完整结构替换七条结果：

```html
<button class="result-row" data-action="open-detail" data-demo-case="search-steam-native"><span class="result-cover"></span><span class="result-name">三生忆梦(Dream Of Three Lives)</span><span class="result-platforms"><svg title="Steam" aria-label="Steam"><use href="#i-steam"/></svg><svg class="search-native show" title="支持 Mac 原生版" aria-label="支持 Mac 原生版"><use href="#i-apple"/></svg><span class="arrow-out">↗</span></span></button>
<button class="result-row" data-demo-case="search-steam"><span class="result-cover"></span><span class="result-name">Gamer Stop Simulator</span><span class="result-platforms"><svg title="Steam" aria-label="Steam"><use href="#i-steam"/></svg><span class="arrow-out">↗</span></span></button>
<button class="result-row" data-demo-case="search-epic"><span class="result-cover"></span><span class="result-name">Legend of Gaia: Rebirth</span><span class="result-platforms"><svg title="Epic" aria-label="Epic"><use href="#i-epic"/></svg><span class="arrow-out">↗</span></span></button>
<button class="result-row" data-demo-case="search-gog"><span class="result-cover"></span><span class="result-name">浮生地中海</span><span class="result-platforms"><svg title="GOG" aria-label="GOG"><use href="#i-gog"/></svg><span class="arrow-out">↗</span></span></button>
<button class="result-row" data-demo-case="search-epic-native"><span class="result-cover"></span><span class="result-name">Death Line: Don't Stop 斩杀线：极限生机</span><span class="result-platforms"><svg title="Epic" aria-label="Epic"><use href="#i-epic"/></svg><svg class="search-native show" title="支持 Mac 原生版" aria-label="支持 Mac 原生版"><use href="#i-apple"/></svg><span class="arrow-out">↗</span></span></button>
<button class="result-row" data-demo-case="search-steam"><span class="result-cover"></span><span class="result-name">Kawashima Internship ~A Boy's Isolated Island Life~</span><span class="result-platforms"><svg title="Steam" aria-label="Steam"><use href="#i-steam"/></svg><span class="arrow-out">↗</span></span></button>
<button class="result-row" data-demo-case="search-gog"><span class="result-cover"></span><span class="result-name">Survival Log</span><span class="result-platforms"><svg title="GOG" aria-label="GOG"><use href="#i-gog"/></svg><span class="arrow-out">↗</span></span></button>
```

结果行中不出现“已安装”“未安装”“当前使用”。

- [ ] **Step 3: 运行搜索矩阵测试**

Run: `node --test tests/mac-native-version-demo.test.mjs --test-name-pattern="搜索结果"`

Expected: PASS。

- [ ] **Step 4: 提交搜索 Icon 矩阵**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html"
git commit -m "feat: add platform icon examples to search"
```

### Task 5: 完整路径与视觉验收

**Files:**
- Modify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Test: `tests/mac-native-version-demo.test.mjs`

- [ ] **Step 1: 运行全部自动检查**

Run: `node --test tests/mac-native-version-demo.test.mjs`

Expected: 4 tests PASS，0 FAIL。

Run: `$html=Get-Content -Raw -Encoding UTF8 "demos\PC与Mac端\Mac原生游戏版本管理demo.html"; if($html -match '<iframe|src=["'']https?://|href=["'']https?://|@import\s+url'){throw '发现外部依赖'}else{'External dependencies: none'}`

Expected: `External dependencies: none`。

- [ ] **Step 2: 浏览器验收游戏库**

在 `1076×734px` 逻辑画布下确认：

```text
已安装分组：Steam、Epic、GOG、Steam＋Mac 原生、Epic＋Mac 原生示例均可见。
未安装分组：Steam、Epic、GOG、Steam＋Mac 原生示例均可见。
封面没有额外“已安装/未安装”角标，Icon 均位于右下角且不遮挡游戏名。
```

- [ ] **Step 3: 浏览器验收当前页切换流程**

依次操作并保留截图证据：

```text
详情 → … → 切换版本 → 当前页弹窗打开。
当前版本显示“当前使用”且不可重复点击。
选择未安装的 Mac 原生版 → 版本弹窗关闭 → 安装路径弹窗打开并默认选中 Mac 原生版。
取消安装 → 当前启动版本不变。
再次下载并完成安装 → Mac 原生版成为当前版本，原 Steam 版本仍在已安装集合。
```

- [ ] **Step 4: 浏览器验收搜索结果**

确认搜索结果具有 Steam、Epic、GOG、Steam＋Mac 原生、Epic＋Mac 原生组合，且没有安装状态文案。

- [ ] **Step 5: 检查浏览器控制台**

Expected: error 数量为 `0`。

- [ ] **Step 6: 提交最终回归修正**

```powershell
git add -- "demos/PC与Mac端/Mac原生游戏版本管理demo.html" tests/mac-native-version-demo.test.mjs docs/superpowers/plans/2026-08-06-mac-native-version-dialog-icon-matrix.md
git commit -m "test: verify Mac version switching demo"
```
