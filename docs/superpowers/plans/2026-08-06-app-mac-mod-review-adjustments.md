# APP and Mac MOD Review Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 2026-08-06 MOD 评审结论同步落地到 APP Demo、Mac Demo 和正式 PRD，并发布可在飞书导入的固定 Git 截图。

**Architecture:** 两个单文件 HTML Demo 保持现有结构，不做无关拆分；列表快捷操作与详情完整操作分别渲染，但读取同一设备级安装、启用、更新和任务状态。依赖失败使用根 MOD 阻塞会话关联多个依赖安装任务，全部依赖完成后只开放用户主动“继续安装”。

**Tech Stack:** HTML、CSS、原生 JavaScript、PowerShell 静态校验、浏览器交互验收、Markdown PRD、GitHub/jsDelivr 固定 Commit 图片。

---

### Task 1: APP 列表与详情操作收敛

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`

- [ ] **Step 1: 添加静态失败断言**

运行：

```powershell
$f='demos/Mod与发行人/APP端MODS功能demo.html'
rg -n '饥荒 MODS|renderInstalledActions|data-installed-actions' $f
```

预期：当前命中旧名称和列表／详情共用操作组件，证明实现尚未满足设计。

- [ ] **Step 2: 拆分列表快捷操作与详情操作**

将共用 `renderInstalledActions()` 拆成两个职责明确的函数：

```js
function renderCardQuickAction(mod) {
  if (!state.installed.includes(mod.id)) return renderInstallButton(mod);
  const enabled = state.enabled.includes(mod.id);
  return `<button class="card-quick-action ${enabled ? 'is-enabled' : ''}"
    data-action="toggle-enabled" data-mod-id="${mod.id}">
    ${enabled ? '停用' : '启用'}
  </button>`;
}

function renderDetailActions(mod) {
  return `<div class="detail-three-actions">
    ${renderDeleteAction(mod)}
    ${renderUpdateAction(mod)}
    ${renderEnableAction(mod)}
  </div>`;
}
```

浏览和已安装卡片只调用 `renderCardQuickAction()`；详情只调用 `renderDetailActions()`。卡片不增加简介，保留标题、作者、下载量和大小。

- [ ] **Step 3: 统一界面名称与详情布局**

把用户可见 `MODS` 改为 `MOD`，包括入口、页面标题、Steam Tab 和无障碍文本；代码变量名不机械替换。APP 竖屏详情改为近全屏底部弹层，横屏使用居中宽弹窗；底部三个操作占满一行，启停位于最右。

- [ ] **Step 4: 实现更新按钮状态**

新增按 MOD ID 保存的更新任务：

```js
updateTasks: {
  // [modId]: { state: 'updating' | 'failed', progress: 0, error: '' }
}
```

`renderUpdateAction()` 严格映射：有更新→`可更新`，无更新→`已是最新`，更新中→`更新中 XX%`，失败→`重试更新`。进度只在按钮内显示。

- [ ] **Step 5: 保持启停静默成功**

`TOGGLE_ENABLED` 成功只更新 `state.enabled` 并重绘，不调用 `showToast()`；快捷按钮和详情按钮通过同一状态源同步。点击快捷按钮必须 `stopPropagation()`。

- [ ] **Step 6: 运行 APP 静态校验**

运行：

```powershell
$f='demos/Mod与发行人/APP端MODS功能demo.html'
rg -n '饥荒 MODS|data-installed-actions' $f
rg -n '可更新|已是最新|更新中|重试更新|detail-three-actions' $f
```

预期：第一条无旧界面结构命中；第二条完整命中新状态与三操作布局。

- [ ] **Step 7: 提交 APP 基础操作调整**

```powershell
git add -- 'demos/Mod与发行人/APP端MODS功能demo.html'
git commit -m "feat(mod): simplify APP list and detail actions"
```

### Task 2: APP 安装失败与依赖弹窗

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`

- [ ] **Step 1: 增加根安装阻塞会话与依赖任务状态**

在状态中增加：

```js
blockedInstall: null,
// {
//   rootModId,
//   reason: 'dependency_missing',
//   freeBytes,
//   dependencyIds: ['dependency-api'],
//   dependencies: { [id]: { sizeBytes, state, progress, error } }
// }
```

同一依赖的按钮进度和最终安装事实读取同一 `dependencies[id]`，禁止重复任务。

- [ ] **Step 2: 实现安装失败弹窗**

新增 `renderInstallFailureDialog()`：依赖失败时展示本机可用空间、依赖总大小、每项名称／大小／状态／安装按钮；其他失败展示准确原因和取消／重试。

- [ ] **Step 3: 实现弹窗内逐项安装**

依赖按钮触发 `INSTALL_DEPENDENCY`，按钮内从 0% 更新到 100%；失败显示原因和 `重试`。开始前重新计算可用空间，空间不足时禁用按钮。

- [ ] **Step 4: 实现手动继续安装**

仅当全部依赖 `state === 'installed'` 时启用 `继续安装`。点击后关闭阻塞弹窗、清理根任务失败状态并从 0 新建原 MOD 安装任务；依赖完成时不得自动继续。

- [ ] **Step 5: 增加 Demo 可复现入口**

给一个未安装 MOD 配置缺失依赖场景，点击安装后稳定进入依赖弹窗，便于产品和测试验收；其他 MOD 保留正常安装链路。

- [ ] **Step 6: 校验依赖状态文本**

运行：

```powershell
$f='demos/Mod与发行人/APP端MODS功能demo.html'
rg -n '本机可用空间|依赖所需空间|继续安装|INSTALL_DEPENDENCY|dependency_missing' $f
```

预期：五类合同文本和动作均命中。

- [ ] **Step 7: 提交 APP 依赖弹窗**

```powershell
git add -- 'demos/Mod与发行人/APP端MODS功能demo.html'
git commit -m "feat(mod): add APP dependency recovery dialog"
```

### Task 3: Mac 列表、详情和命名同步

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 记录旧结构命中**

运行：

```powershell
$f='demos/Mod与发行人/Mod功能Mac端demo.html'
rg -n '>MODS<|MODS 内容|card-installed-controls|renderDetailEnabledControl' $f
```

预期：命中旧名称、列表滑块和旧详情动作。

- [ ] **Step 2: 将列表改为单一快捷操作**

浏览和已安装卡片统一：未安装显示安装；已安装只显示启用或停用；有更新只显示红点。删除列表滑块、更新和卸载入口，卡片主体仍进入详情。

- [ ] **Step 3: 将详情改为固定三项操作**

Mac 详情底栏固定为删除、更新状态、启用／停用；更新失败不再增加第四个“保留旧版”槽位，旧版保留作为状态说明。三个按钮填满一行，启停在最右。

- [ ] **Step 4: 安装与更新按钮内显示进度**

改造 `renderTaskProgress()` 与详情操作，使 `downloading/verifying/installing` 的可量化进度显示在当前安装或更新按钮中；更新无独立进度条，也不只显示转圈。

- [ ] **Step 5: 用户界面统一单数 MOD**

入口卡、Tab、返回文案、无障碍文本和弹窗改为 `MOD`；保留 JavaScript 模型字段和文件名。

- [ ] **Step 6: 静态校验 Mac 新结构**

运行：

```powershell
$f='demos/Mod与发行人/Mod功能Mac端demo.html'
rg -n '>MODS<|MODS 内容' $f
rg -n '可更新|已是最新|更新中|重试更新|继续安装' $f
```

预期：第一条无用户界面旧名称命中；第二条命中新状态。

- [ ] **Step 7: 提交 Mac 基础操作调整**

```powershell
git add -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git commit -m "feat(mod): align Mac list and detail actions"
```

### Task 4: Mac 安装失败与依赖弹窗

**Files:**
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: 复用 Mac 任务模型增加阻塞会话**

增加 `blockedInstallsByRootId`，保存根 MOD、失败原因、可用空间、依赖 ID 和依赖任务；不把依赖状态写成独立 UI 假状态。

- [ ] **Step 2: 用弹窗替代详情页红色失败条作为主要处理入口**

保留详情字段中的依赖说明，但安装失败后打开模态弹窗；弹窗逐项展示依赖和按钮内进度，不跳转另一个详情页。

- [ ] **Step 3: 实现取消和继续安装**

取消只关闭弹窗并保留根 MOD 未安装；全部依赖完成后启用 `继续安装`，由用户点击后从 0 重试根 MOD。

- [ ] **Step 4: 校验 Mac 依赖弹窗键盘行为**

确认打开后焦点进入弹窗，Tab 不越界，Escape 等同取消；依赖安装中按钮不可重复触发，关闭弹窗不伪造任务成功。

- [ ] **Step 5: 提交 Mac 依赖弹窗**

```powershell
git add -- 'demos/Mod与发行人/Mod功能Mac端demo.html'
git commit -m "feat(mod): add Mac dependency recovery dialog"
```

### Task 5: Steam 个人中心与评审规则同步

**Files:**
- Modify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Modify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: APP Steam Tab 改为 MOD**

个人中心只展示当前设备已安装 MOD；按本地游戏最近游玩时间降序，每游戏最多 4 项；卡片保留最多两行简介和快捷启停。

- [ ] **Step 2: 限制作者显示长度**

增加纯展示函数：

```js
function truncateAuthor(value) {
  const limit = /[\u3400-\u9fff]/.test(value) ? 10 : 20;
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}
```

详情保留完整元数据来源值，界面展示使用截断值。

- [ ] **Step 3: 固化搜索和入口范围**

浏览搜索仅过滤已加载集合；已安装页不新增搜索。只有已验证支持且有数据的游戏显示 MOD 入口；Demo 提供一个支持游戏和一个不支持游戏的可核对状态。

- [ ] **Step 4: 提交个人中心和范围调整**

```powershell
git add -- 'demos/Mod与发行人/APP端MODS功能demo.html' 'demos/Mod与发行人/Mod功能Mac端demo.html'
git commit -m "feat(mod): align profile and supported-game rules"
```

### Task 6: 更新正式 PRD

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`

- [ ] **Step 1: 新增评审变更记录**

在版本表新增 `2026.08.06 V1.7`，标明双端单数 MOD、列表操作收敛、按钮内进度、安装失败与依赖弹窗、Steam 个人中心和支持游戏门禁。

- [ ] **Step 2: 就地修订 4.2 页面表格**

不在文末另建补丁章节。直接修改原页面行：入口、浏览、已安装、详情、Steam 个人中心、失败弹窗；删除“小滑块”和列表三项操作等冲突旧口径。

- [ ] **Step 3: 更新业务规则、异常和验收**

写清：搜索已加载数据、无断点续传、安装失败分类、依赖逐项安装、空间复算、手动继续、支持游戏门禁、作者截断和每游戏 4 项。

- [ ] **Step 4: 冲突扫描**

运行：

```powershell
$f='prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md'
rg -n '列表小滑块|三项操作|更新.*卸载.*启停|MODS' $f
```

预期：仅允许历史变更记录、代码字段或明确“旧口径已废止”中的必要命中；正文不得保留冲突规则。

- [ ] **Step 5: 提交 PRD 文字调整**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md'
git commit -m "docs(mod): apply APP and Mac review decisions"
```

### Task 7: 横竖屏、桌面交互和视觉验收

**Files:**
- Verify: `demos/Mod与发行人/APP端MODS功能demo.html`
- Verify: `demos/Mod与发行人/Mod功能Mac端demo.html`

- [ ] **Step 1: APP 竖屏验收**

依次检查浏览安装、浏览启停、已安装启停、详情三按钮、更新四状态、缺依赖弹窗、依赖逐项进度、继续安装和卸载确认。

- [ ] **Step 2: APP 横屏与旋转验收**

打开详情和依赖弹窗后旋转，确认页面、滚动、依赖进度和根安装会话不丢失、不重复创建。

- [ ] **Step 3: Mac 验收**

检查鼠标与键盘焦点、列表按钮不误开详情、详情三按钮、依赖弹窗焦点陷阱、Escape 取消和继续安装。

- [ ] **Step 4: 保存验收截图**

至少输出 APP 浏览、APP 详情、APP 依赖弹窗、APP 横屏、Mac 浏览、Mac 详情、Mac 依赖弹窗 7 张标准 RGB PNG，最长边不超过 1600px。

### Task 8: 发布截图并固定 PRD 图片

**Files:**
- Create: `public/prd/dst-mod-review-20260806/*.png`
- Modify: `prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md`

- [ ] **Step 1: 提交截图资产**

```powershell
git add -- 'public/prd/dst-mod-review-20260806/*.png'
git commit -m "docs(mod): publish review screenshots"
git rev-parse HEAD
```

记录该图片提交 SHA，图片引用不得使用分支名。

- [ ] **Step 2: 将截图放入 4.2 原表格图示列**

先读取图片提交并生成固定前缀：

```powershell
$imageCommit = git rev-parse HEAD
$imagePrefix = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/dst-mod-review-20260806"
```

再把每张图写成 `![图示名称]($imagePrefix/实际英文文件名.png)` 对应的最终 Markdown 文本；提交前检查文档中不残留 `$imagePrefix` 字面量。

单个表格单元格最多放两张图，多图使用 `<br>` 分隔。

- [ ] **Step 3: 校验 PRD 图片引用**

运行引用计数、固定 SHA、相对路径和 HTTP 内容类型检查；预期所有图片为固定 Commit HTTPS、相对路径 0、远程返回 `200 image/png`。

- [ ] **Step 4: 提交 PRD 图片引用**

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》DST本地MODS跨平台需求.md'
git commit -m "docs(mod): pin review screenshots in PRD"
```

### Task 9: 最终检查与推送

**Files:**
- Verify: all files above

- [ ] **Step 1: 检查工作区范围**

运行 `git status --short`，只提交本计划涉及文件；不纳入既有 `.superpowers/`、使用手册和 ZIP 等用户文件。

- [ ] **Step 2: 同步远程 main**

运行 `git fetch origin main`，确认无重叠修改后将本分支变基到最新 `origin/main`；不得强推。

- [ ] **Step 3: 运行最终校验**

执行 `git diff --check origin/main...HEAD`、静态合同扫描、双 Demo 浏览器冒烟和所有图片远程检查，预期无错误。

- [ ] **Step 4: 推送**

运行 `git push origin HEAD:main`。若远程前进导致拒绝，重新获取并重放本次提交，不使用 `--force`。

- [ ] **Step 5: 输出交付信息**

提供 APP Demo、Mac Demo、PRD 的本地路径、GitHub 地址、可预览地址、最终提交 SHA、图片提交 SHA和验证结果。
