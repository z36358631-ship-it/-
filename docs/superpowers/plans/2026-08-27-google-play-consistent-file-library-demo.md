# Google Play 前后一致“文件库”Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 A/B 单文件 Demo 收敛为审核员与正式用户体验一致的“文件库”方案C，并保留盖世游戏原首页及游戏能力。

**Architecture:** 继续使用一个完全离线的 HTML 文件，以现有 `pageA` 承载文件库、`pageB` 承载原首页；删除 A/B 与 Hash 分支，改为稳定的底部一级页面路由和文件库内部三 Tab 状态。文件管理只保留一个 Manager 实例，并把权限、存储、筛选和多选状态统一收进该实例，避免拒绝权限后被其他交互重新渲染出文件。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、内嵌 SVG、内嵌 WebP、PowerShell 静态校验、Codex in-app Browser/Playwright 交互验证。

---

## 1. 文件结构与责任

### 修改

- `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
  - 唯一用户可操作 Demo。
  - 保留 7 张内嵌 WebP、SVG 图标库、手机框架和原首页 Feed。
  - 收敛 A/B 页面、文件库、PC游戏、复古游戏、权限与文件操作交互。

### 创建

- `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
  - 对 Demo 执行命名、禁止项、能力保留、离线依赖和基本 DOM 结构检查。
- `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-library-consistent.png`
  - 文件库默认页截图。
- `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-library-home.png`
  - 原首页仍可访问的截图。
- `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-library-permission-denied.png`
  - 权限拒绝后文件不可见的截图。
- `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`
  - 保存本轮当前有效决定、Demo 路径、验证证据和仍存在的 Google 审核外部风险。

### 不修改

- Android App 业务代码、Manifest、AAB、Google Play Console。
- `_outputs\盖世游戏V6.1.1使用说明手册\图片和附件` 中的 V6.1.1 原始证据图。
- 工作区中与 `GUANWANGGAID-21` 无关的已有未提交文件。

## 2. 来源与冲突裁决

| 冲突 ID | 冲突项 | 采用项 | 废弃项 | 置信度 |
|---|---|---|---|---|
| CR-GP-001 | 当前 A/B Demo 与用户确认的单一方案C冲突 | 单一文件库方案C | A/B切换、Hash模式、概率对比 | 高 |
| CR-GP-002 | 原底栏“游戏库”与新命名冲突 | 永久显示“文件库” | 底栏“游戏库” | 高 |
| CR-GP-003 | 现有文件筛选含“游戏文件” | 只删除该筛选按钮 | 删除游戏数据、PC游戏、复古游戏或加入能力 | 高 |
| CR-GP-004 | 现有 USB 未连接仍显示可点击 | 未连接时隐藏 USB 入口 | 始终显示不可用 USB 卡 | 高 |
| CR-GP-005 | 权限拒绝后其他交互可重新显示文件 | `permission` 成为渲染前置条件 | 只清空一次 DOM 的临时拒绝态 | 高 |

视觉来源：`screen-08` 首页骨架、`screen-18` 游戏库结构、`screen-22` 导入语义；组件来源为 `C-SHELL-P`、`C-NAV-P`、`C-TAB`、`C-INPUT-SEARCH`、`C-FEEDBACK`、`C-BUTTON-GLOW`、`C-BUTTON-SECONDARY`。

---

### Task 1: 建立会失败的静态验收脚本

**Files:**

- Create: `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
- Read: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:76-236`

- [ ] **Step 1: 创建静态验收脚本**

使用 `apply_patch` 创建以下脚本：

```powershell
param(
    [string]$HtmlPath = 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
)

$html = Get-Content -Raw -LiteralPath $HtmlPath
$failures = [System.Collections.Generic.List[string]]::new()

function Require-Text([string]$needle, [string]$message) {
    if (-not $html.Contains($needle)) { $failures.Add($message) }
}

function Forbid-Pattern([string]$pattern, [string]$message) {
    if ($html -match $pattern) { $failures.Add($message) }
}

Require-Text '首页｜玩游戏｜排行榜｜文件库｜我的' '缺少固定五栏导航语义'
Require-Text 'data-library-tab="files"' '缺少文件 Tab'
Require-Text 'data-library-tab="pc"' '缺少 PC游戏 Tab'
Require-Text 'data-library-tab="retro"' '缺少复古游戏 Tab'
Require-Text "type:'game'" '游戏文件数据被误删'
Require-Text 'PC 游戏' 'PC 游戏文件语义被误删'
Require-Text '复古游戏' '复古游戏语义被误删'
Require-Text 'add-game' '添加游戏能力被误删'
Require-Text "permission:'granted'" 'Manager 缺少持久权限状态'

Forbid-Pattern 'data-option=|function\s+setOption|location\.hash|方案\s*[AB]|双方案' '仍存在 A/B 或 Hash 模式'
Forbid-Pattern 'data-filter="game"' '筛选栏仍存在“游戏文件”'
Forbid-Pattern '审核模式|正式模式|通过后隐藏|远程开关' '仍存在审核专用行为表达'
Forbid-Pattern 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'Demo 不是完全离线单文件'

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host 'PASS: Google Play 文件库 Demo 静态检查通过'
```

- [ ] **Step 2: 运行脚本确认当前 Demo 失败**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: exit code `1`，至少报告“A/B模式”“缺少文件库三Tab”“仍存在游戏文件筛选”三类失败。

- [ ] **Step 3: 提交验收脚本**

```powershell
git add -- scripts/validate-google-play-file-library-demo.ps1
git commit -m "test: add file library demo validation"
```

Expected: 只提交该脚本，不包含工作区其他现有改动。

---

### Task 2: 收敛单一方案C框架和稳定底部路由

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:7-50`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:76-140`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:177-235`

- [ ] **Step 1: 将左侧说明改为单一方案C**

删除 `.switcher` 和两个 `data-option` 按钮，改为：

```html
<aside class="brief">
  <h1>Google Play<br/>前后一致文件库 Demo</h1>
  <p>审核员与正式用户使用完全相同的默认页、导航和文件能力。冷启动固定进入文件库。</p>
  <div class="review-note">
    <div class="review-line"><span>默认入口</span><b>文件库 · 文件</b></div>
    <div class="review-line"><span>审核后行为</span><b>保持一致，不隐藏</b></div>
    <div class="review-line"><span>原APP内容</span><b>保留，可从首页访问</b></div>
  </div>
</aside>
```

- [ ] **Step 2: 固定手机标题与底部五栏**

把手机标签改为“方案C｜前后一致文件库”，底部 DOM 明确写入固定语义文本，第四项默认选中：

```html
<div class="phone-label"><b>方案C｜前后一致文件库</b><span>402 × 893</span></div>
<nav class="bottom-nav" data-component-id="C-NAV-P" aria-label="首页｜玩游戏｜排行榜｜文件库｜我的">
  <button class="nav-item" data-nav="home">…<span>首页</span></button>
  <button class="nav-item" data-nav="play">…<span>玩游戏</span></button>
  <button class="nav-item" data-nav="rank">…<span>排行榜</span></button>
  <button class="nav-item active" data-nav="library">…<span>文件库</span></button>
  <button class="nav-item" data-nav="profile">…<span>我的</span></button>
</nav>
```

- [ ] **Step 3: 删除 A/B 和 Hash 状态，新增一级页面路由**

移除 `option`、`setOption()`、方案按钮监听、`location.hash` 和两套 Manager。加入：

```javascript
const pageA=document.getElementById('pageA');
const pageB=document.getElementById('pageB');
let currentPage='library',snackTimer;

function setMainPage(page){
  currentPage=page;
  pageA.classList.toggle('hidden',page!=='library');
  pageB.classList.toggle('hidden',page!=='home');
  document.querySelectorAll('.nav-item').forEach(btn=>
    btn.classList.toggle('active',btn.dataset.nav===page)
  );
}

document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{
  if(btn.dataset.nav==='home'||btn.dataset.nav==='library'){
    setMainPage(btn.dataset.nav);
    return;
  }
  showSnack(`${btn.textContent.trim()}保持原有页面，本Demo聚焦文件库方案`);
});

setMainPage('library');
```

`pageA` 作为文件库，`pageB` 作为原首页。删除 `#managerB`、`#managerBHost`、`#enterFile` 和返回覆盖页逻辑。

- [ ] **Step 4: 运行静态脚本确认剩余失败收敛**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: A/B、Hash、审核模式相关失败消失；三Tab和权限状态相关检查仍失败。

---

### Task 3: 实现“文件库”三Tab并只删除筛选栏“游戏文件”

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:31-40`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:141-176`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:181-208`

- [ ] **Step 1: 增加与 C-TAB 一致的文件库业务Tab样式**

新增 `.library-tabs`、`.library-tab`、`.library-panel`，选中态使用 24×4 指示条；高度保持 71px，文字选中/默认权重分别为 700/500。所有按钮保留可读名称和可见焦点。

- [ ] **Step 2: 把 Manager 标题改为“文件库”并插入三Tab**

在 `managerTemplate` 中改为：

```html
<div><span class="eyebrow">GAMEHUB LOCAL</span><h2>文件库</h2></div>
<div class="library-tabs" role="tablist" aria-label="文件库分类">
  <button class="library-tab active" role="tab" aria-selected="true" data-library-tab="files">文件</button>
  <button class="library-tab" role="tab" aria-selected="false" data-library-tab="pc">PC游戏</button>
  <button class="library-tab" role="tab" aria-selected="false" data-library-tab="retro">复古游戏</button>
</div>
```

文件管理内容放入 `data-library-panel="files"`；新增 `pc`、`retro` 两个 Panel。PC游戏和复古游戏 Panel 复用现有内嵌 WebP：从原首页 `.game-row img` 克隆 `src`，使用真实 DOM 游戏卡展示现有能力，不创建远程素材或空占位页。

- [ ] **Step 3: 只删除“游戏文件”筛选按钮**

把：

```html
<button class="quick" data-filter="game">游戏文件</button>
```

从 `.quick-row` 删除。继续保留：

```javascript
{name:'Hollow_Knight_Silksong.exe',meta:'PC 游戏 · 8.6 GB',type:'game'}
{name:'Cyberpunk2077.exe',meta:'PC 游戏 · 71.2 GB',type:'game'}
{name:'ChronoTrigger.sfc',meta:'复古游戏 · 4.2 MB',type:'game'}
```

以及 `type==='game'` 图标、`.add-game` 和单文件加入能力。

- [ ] **Step 4: 实现同会话Tab保持、刷新回到文件**

加入：

```javascript
function setLibraryTab(state,tab){
  state.libraryTab=tab;
  state.host.querySelectorAll('[data-library-tab]').forEach(btn=>{
    const selected=btn.dataset.libraryTab===tab;
    btn.classList.toggle('active',selected);
    btn.setAttribute('aria-selected',String(selected));
  });
  state.host.querySelectorAll('[data-library-panel]').forEach(panel=>
    panel.classList.toggle('active',panel.dataset.libraryPanel===tab)
  );
}
```

Manager 初始化使用 `libraryTab:'files'`；返回首页再回文件库不重建 Manager，因此保留本次会话 Tab；页面刷新后重新初始化为文件。

- [ ] **Step 5: 运行能力保留检查**

Run:

```powershell
rg -n 'data-filter="game"' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
rg -n "PC游戏|复古游戏|PC 游戏|type:'game'|add-game" 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: 第一条无输出；第二条继续匹配三业务Tab、游戏数据和加入能力。

---

### Task 4: 修复权限、外置存储和多选操作边界

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:31-48`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:130-158`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:177-234`

- [ ] **Step 1: 给 Manager 状态增加权限与存储可用性**

Manager 初始化状态固定为：

```javascript
const state={
  host,
  storage:'internal',
  filter:'all',
  libraryTab:'files',
  permission:'granted',
  availableStorage:{internal:true,sd:true,usb:false}
};
```

Demo 默认已授权以直接展示文件库；点击权限 Chip 可模拟拒绝和重新授权。

- [ ] **Step 2: 让权限成为 `renderRows()` 的前置条件**

在读取搜索词和数据前加入：

```javascript
if(state.permission!=='granted'){
  list.innerHTML='';
  empty.textContent='未获得文件访问权限';
  empty.classList.add('show');
  state.host.querySelector('.count-label').textContent='';
  updateActionBar(state);
  return;
}
```

拒绝、搜索、筛选和存储切换都必须再次经过此判断，不能重新显示文件。

- [ ] **Step 3: 未连接存储不显示，浏览中断安全回退**

初始化时遍历 `[data-storage]`，对 `availableStorage[key]===false` 设置 `hidden=true`。模拟外置存储不可用时，如当前 `state.storage` 不可用，切回 `internal`、更新路径和选中态后调用 `renderRows(state)`。

- [ ] **Step 4: 补齐重命名并明确添加目标**

在多选操作栏和单文件 Sheet 加入使用 `#i-edit` 的“重命名”。把“加入游戏库”改为“添加到PC/复古游戏”，点击后显示“已打开添加目标选择：PC游戏 / 复古游戏”；不新增额外页面或新弹窗。

- [ ] **Step 5: 授权/拒绝逻辑只修改状态再渲染**

```javascript
document.getElementById('grantPermission').onclick=()=>{
  permissionModal.classList.remove('show');
  managerState.permission='granted';
  managerState.host.querySelector('.permission-chip').textContent='权限已授权';
  renderRows(managerState);
  showSnack('已允许访问设备文件');
};

document.getElementById('revokePermission').onclick=()=>{
  permissionModal.classList.remove('show');
  managerState.permission='denied';
  managerState.host.querySelector('.permission-chip').textContent='未授权';
  renderRows(managerState);
  showSnack('已模拟拒绝权限');
};
```

- [ ] **Step 6: 运行完整静态脚本**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: `PASS: Google Play 文件库 Demo 静态检查通过`，exit code `0`。

---

### Task 5: 执行浏览器交互验收并生成视觉证据

**Files:**

- Test: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
- Create: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-library-consistent.png`
- Create: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-library-home.png`
- Create: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-library-permission-denied.png`

- [ ] **Step 1: 默认态验收**

用 in-app Browser 打开本地 HTML 并验证：

```text
文件库可见
底部第四项“文件库”选中
文件业务Tab选中
文件类型筛选中不存在“游戏文件”
```

Expected: 四项同时成立；页面脚本错误为 `0`。

- [ ] **Step 2: 一级导航和三Tab验收**

依次点击首页、文件库、PC游戏、复古游戏、文件；验证原首页 Feed 可见、文件库状态不重建、PC/复古不是空占位、刷新后重新选中文件。

Expected: 路由和状态规则与规格 AC-01 至 AC-04 一致。

- [ ] **Step 3: 文件管理交互验收**

依次执行：搜索 `Hollow`、清除、切换 SD、筛选压缩包、选择两个文件、查看多选操作栏、打开单文件更多操作。

Expected: 搜索/筛选结果真实变化；复制、移动、重命名、删除和添加到PC/复古游戏均可见。

- [ ] **Step 4: 权限拒绝回归**

点击权限 Chip → 模拟拒绝 → 输入搜索词 → 切换筛选 → 切换存储。

Expected: 始终显示“未获得文件访问权限”，文件行数量为 `0`；重新授权后恢复文件列表。

- [ ] **Step 5: 离线与控制台检查**

Run:

```powershell
rg -n 'https?://|<iframe\b|<canvas\b|<script\b[^>]*src=|<link\b[^>]*rel=' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: 无输出。浏览器控制台 `error` 为 `0`。

- [ ] **Step 6: 生成三张截图并人工审图**

分别在文件库默认态、原首页、权限拒绝态截图到本任务列出的三个绝对路径。人工检查：

- 底栏保持 V6.1.1 五栏骨架，标签只改为“文件库”。
- 文件库 Tab 高度、指示条、搜索和暗色表面延续 `screen-18`。
- 首页区块顺序和媒体素材保持 `screen-08`，不被文件模块污染。
- 权限拒绝使用页内 `C-FEEDBACK`，不显示伪造文件。

Expected: 记录人工结论。新文件页没有像素级同构原稿，因此不得声称 RGB/边缘/SSIM 达到 95%；如未生成全分辨率对比证据，严格视觉状态写为“未建立同构基准/待审”，不能写 PASS。

---

### Task 6: 回写工作流状态并做最终范围检查

**Files:**

- Create: `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`
- Verify: `C:\Users\z3635\官网改动\docs\superpowers\specs\2026-08-27-google-play-consistent-file-library-design.md`
- Verify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`

- [ ] **Step 1: 创建状态卡**

状态卡至少写入：

```markdown
# GUANWANGGAID-21 谷歌版提审

## 基本信息
- 阶段：Demo 待用户验收
- 最后更新时间：2026-08-27

## 已确认决策
- D-001：申请 MANAGE_EXTERNAL_STORAGE，不支持 SAF。
- D-002：审核员与正式用户体验一致，不使用审核专版或通过后隐藏。
- D-003：底部“游戏库”永久更名为“文件库”；文件库内为“文件｜PC游戏｜复古游戏”，冷启动默认文件。
- D-004：只删除文件类型筛选中的“游戏文件”，其他游戏相关位置和能力保留。
```

继续登记基线 `screen-08/18/22`、规格提交 `37e96e16` 与 `72d9754b`、Demo 与截图路径、静态和交互验证结果。Google Play 实际通过仍标为未验证外部风险。

- [ ] **Step 2: 检查没有扩大范围**

Run:

```powershell
git status --short
git diff --name-only HEAD
```

Expected: 本轮 Git 变更只包含验收脚本、状态卡和计划/规格相关文件；Android 代码、AAB 和无关用户文件未被本轮修改。

- [ ] **Step 3: 提交状态卡**

```powershell
git add -- prd/workflow-state/GUANWANGGAID-21-google-play-review.md
git commit -m "docs: record file library demo evidence"
```

Expected: 只提交状态卡，不包含用户已有脏工作区改动。

- [ ] **Step 4: 最终交付检查**

最终汇报必须分别声明：

```text
本地 Demo：已修改/已验证
Android App：未修改
AAB：未生成
Google Play：未提交、未验证真实通过率
严格视觉：按实际证据写 PASS/FAIL/待审，不用模拟概率替代
```

同时提供 Demo、三张截图、规格、计划和状态卡的绝对路径。

---

## 3. 计划自检

- 规格覆盖：底部命名、默认文件库、三Tab、原首页保留、文件MVP、权限拒绝、外置存储、离线运行和明确不做均有对应任务。
- 最新变更覆盖：只删除筛选栏唯一的“游戏文件”，保留 `type:'game'`、PC游戏、复古游戏和添加能力。
- 类型一致：统一使用 `currentPage`、`libraryTab`、`permission`、`availableStorage`；一级页面值为 `home/library`，文件库Tab值为 `files/pc/retro`。
- 完整性：每项改动均给出目标文件、具体代码、验证命令和预期结果。
- 范围控制：不触碰 Android 代码、AAB、Play Console 和无关工作区文件。
