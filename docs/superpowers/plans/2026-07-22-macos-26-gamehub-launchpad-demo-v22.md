# macOS 26 盖世全屏启动台 V2.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有标注版 Demo 和 PRD 更新为直接展示全部应用、支持长按编辑与系统式删除、原生打开本机应用及独立程序坞入口的 V2.2 版本。

**Architecture:** 继续使用单文件三栏标注 Demo，通过统一 `state` 状态机渲染启动台、编辑、删除弹窗、文件夹、设置和原生调用结果。发布入口文件继续重定向到中文标注版 Demo；静态 Node 验收脚本负责检查关键状态、文案和禁用项，浏览器截图负责视觉验收。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、Node.js 静态验收、Microsoft Edge 无头截图、Markdown PRD、GitHub Pages。

---

### Task 1: 建立 V2.2 静态验收基线

**Files:**
- Modify: `scripts/verify-launcher-demo.js`
- Test: `scripts/verify-launcher-demo.js`

- [ ] **Step 1: 写入 V2.2 必须项和禁用项断言**

将流程检查改为：

```js
const requiredFlowIds = [
  'client', 'launchpad', 'search', 'edit', 'folder',
  'deleteConfirm', 'deleteBlocked', 'settings', 'permission',
  'launching', 'failure'
];
```

增加长按编辑、抖动、删除标识、两类弹窗、程序坞引导、设置入口、原生打开提示检查；增加以下禁用项：

```js
const forbidden = [
  'data-flow="scanning"', 'data-flow="external"',
  'external-app', 'back-launchpad', '清空搜索',
  '>重命名<', '退出启动台'
];
```

- [ ] **Step 2: 运行验收并确认旧 Demo 失败**

Run: `node scripts/verify-launcher-demo.js`

Expected: FAIL，至少报告流程、编辑删除、程序坞入口和禁用项不符合 V2.2。

- [ ] **Step 3: 提交验收基线**

```powershell
git add -- scripts/verify-launcher-demo.js
git commit -m "test: define launchpad v2.2 acceptance"
```

### Task 2: 实现 V2.2 标注版 Demo

**Files:**
- Modify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Verify: `demos/macos26-gamehub-fullscreen-launcher.html`

- [ ] **Step 1: 调整状态机和左侧流程**

删除 `scanning`、`external`，增加：

```js
edit: { screen: 'launchpad', editing: true },
deleteConfirm: { screen: 'launchpad', editing: true, deleteDialog: 'confirm' },
deleteBlocked: { screen: 'launchpad', editing: true, deleteDialog: 'blocked' }
```

首次侧边栏进入直接设置 `state.screen = 'launchpad'`。

- [ ] **Step 2: 实现长按编辑和手势仲裁**

为应用卡片增加可删除元数据和删除按钮；静止按住 650 毫秒进入编辑，移动超过 6 点取消长按并允许原文件夹拖放逻辑继续：

```js
const LONG_PRESS_MS = 650;
const MOVE_TOLERANCE = 6;
state.editing = true;
```

编辑模式通过错峰 `animation-delay` 让图标轻微抖动；空白处或 Esc 退出。

- [ ] **Step 3: 实现删除确认和运行中拦截**

未运行的可删除应用展示：

```text
确认要删除“XX”吗？应用将被移到废纸篓。
取消 / 删除
```

运行中的可删除应用展示：

```text
不能将项目“XX”移到废纸篓，因为它已打开。
好
```

系统应用不显示“−”；Demo 删除成功后从布局移除并重算分页，删除失败状态保留图标。

- [ ] **Step 4: 修正文件夹和搜索**

删除“重命名”按钮，点击 `.folder-title` 进入输入状态；文件夹封面 3×3 使用完整圆角小图标并设置 `object-fit: contain` 等效布局。无结果页只保留提示和搜索框，不输出“清空搜索”按钮。

- [ ] **Step 5: 实现程序坞引导和设置入口**

首次进入时在搜索栏同行、更多按钮右侧渲染同款盖世图标、说明、“添加”与关闭按钮。引导保持到用户操作；添加或关闭后写入 Demo 本地状态。设置页增加“添加到程序坞/已添加”，添加成功后 Toast：

```text
已添加启动台到程序坞
```

程序坞模拟入口在客户端状态展示，点击直接进入全屏启动台；当盖世为彻底退出状态时先模拟启动盖世再进入启动台。

- [ ] **Step 6: 改为原生应用调用表达**

删除 Demo 内目标应用页面与返回按钮。成功后保留启动台状态，用 Toast 表达：

```text
已调用 macOS 打开 XX，Demo 不展示目标应用
```

失败仍留在启动台并展示重试。

- [ ] **Step 7: 运行静态验收**

Run: `node scripts/verify-launcher-demo.js`

Expected: PASS，所有 V2.2 检查为 `true`，禁用项为 `false`。

- [ ] **Step 8: 提交 Demo**

```powershell
git add -- 'demos/macOS26盖世全屏启动台-交互标注版.html' 'demos/macos26-gamehub-fullscreen-launcher.html'
git commit -m "feat: add native launchpad editing and dock entry"
```

### Task 3: 更新 V2.2 PRD

**Files:**
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md`
- Reference: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-launchpad-parity-design.md`

- [ ] **Step 1: 追加 V2.2 版本记录**

版本表增加 2026.07.22 V2.2，标明直接展示全部应用、长按编辑删除、文件夹直接改名、原生应用调用和程序坞入口。

- [ ] **Step 2: 更新核心流程和详细设计**

删除用户可见扫描、内部目标应用页、“清空搜索”“重命名”“退出启动台”；增加删除弹窗逐项规则、650 毫秒与 6 点阈值、程序坞冷启动链路、设置状态和失败处理。

- [ ] **Step 3: 补充埋点和验收标准**

新增 `launcher_edit_enter`、`launcher_delete_click`、`launcher_delete_result`、`launcher_dock_guide_action`、`launcher_dock_open_result`，并为 `result`、`reason`、`app_running`、`entry_source` 定义枚举。验收标准逐项覆盖两类删除弹窗、系统应用无删除标识、文件夹完整缩略图、无扫描页和无内部应用页。

- [ ] **Step 4: 执行 PRD 自查**

Run: `rg -n "TBD|TODO|清空搜索|退出启动台|正在查找应用|Demo.*目标应用" docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md`

Expected: 不出现未定义占位；旧交互只允许出现在版本变更说明中。

- [ ] **Step 5: 提交 PRD**

```powershell
git add -- docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md
git commit -m "docs: update launchpad prd to v2.2"
```

### Task 4: 浏览器视觉验收与发布

**Files:**
- Verify: `demos/macOS26盖世全屏启动台-交互标注版.html`
- Verify: `demos/macos26-gamehub-fullscreen-launcher.html`

- [ ] **Step 1: 生成浏览器截图**

使用 Edge 无头模式分别截取启动台、编辑模式、删除确认、运行中拦截、文件夹和搜索无结果。检查引导不遮挡搜索/更多菜单、删除按钮不遮挡图标、3×3 缩略图完整、弹窗文案可读。

- [ ] **Step 2: 运行最终检查**

```powershell
node scripts/verify-launcher-demo.js
git diff --check
```

Expected: 静态验收 PASS；本任务文件无空白错误。

- [ ] **Step 3: 发布到远端 master**

基于 `refs/remotes/origin/master` 创建 `.tmp` 下干净 worktree，依次 cherry-pick 本任务提交，再执行：

```powershell
git push origin HEAD:master
```

不得使用 `git add .`，不得清理或还原工作区内其他用户改动。

- [ ] **Step 4: 验证线上地址**

Run: `Invoke-WebRequest -UseBasicParsing 'https://z36358631-ship-it.github.io/-/demos/macos26-gamehub-fullscreen-launcher.html'`

Expected: HTTP 200，线上 HTML 引用的标注版文件包含 V2.2 程序坞和删除文案。
