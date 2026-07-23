# macOS 26 启动台 PRD 真实图示发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从盖世 V2.6 交互 Demo 捕获真实功能状态，填入 PRD 第 4.2 节“图示”列，并将图片随文档推送到 GitHub。

**Architecture:** 使用本地 Chromium/Playwright 打开 `demos/macOS26盖世全屏启动台-交互标注版.html`，通过页面导航和真实交互进入目标状态，只截取中间 Demo 画布。截图统一存放在 `prd/ai生成/macos26-launchpad-v2.6/`，PRD 从 `docs/superpowers/specs/` 使用仓库相对路径引用。

**Tech Stack:** HTML、Playwright/Chromium、PNG、Markdown、Git

---

### Task 1: 映射第 4.2 节模块与截图状态

**Files:**
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md`

- [ ] **Step 1: 建立模块到真实界面的映射**

```text
F001 → 盖世客户端侧边栏九宫格入口
F002 → 进入即展示全部应用网格
F003 → 全部应用网格、分页与搜索状态
F004 → 长按编辑、拖放与文件夹状态
F005 → 应用启动或激活中的图标状态
F006 → 全局入口模拟区
F007 → 设置与应用来源
F008 → 多显示器和异常边界说明
F011 → 删除二次确认与运行中拦截
F012 → 首次进入的程序坞引导
```

- [ ] **Step 2: 确认复用边界**

同一张真实截图可同时服务高度重叠的模块，但第 4.2 节每个模块的“图示”必须至少包含一个可点击的 PNG 引用；不使用竞品图、占位图或文字“Demo某页面”替代。

### Task 2: 生成真实 Demo 截图

**Files:**
- Create: `prd/ai生成/macos26-launchpad-v2.6/01-client-entry.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/02-all-apps.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/03-search-empty.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/04-edit-mode.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/05-folder.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/06-app-launching.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/07-global-entry.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/08-settings-sources.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/09-edge-cases.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/10-delete-confirm.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/11-delete-blocked.png`
- Create: `prd/ai生成/macos26-launchpad-v2.6/12-dock-guide.png`
- Create: `tools/capture-macos26-launchpad-prd-screenshots.mjs`
- Create: `tools/update-macos26-launchpad-prd-images.mjs`

- [ ] **Step 1: 编写确定性截图脚本**

脚本必须打开本地 Demo，按页面导航或真实点击进入目标状态，等待界面稳定后截取中间 Demo 画布；失败时返回非零退出码。

- [ ] **Step 2: 执行截图**

Run:

```powershell
node tools/capture-macos26-launchpad-prd-screenshots.mjs
```

Expected: 输出 12 张 PNG，文件尺寸大于 10 KB。

- [ ] **Step 3: 逐图检查**

检查文字可读性、弹窗完整性、画布裁切、遮挡和状态准确性。发现问题时修正截图脚本并重新生成。

### Task 3: 更新 V2.6 PRD

**Files:**
- Modify: `docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md`

- [ ] **Step 1: 修正文档版本标题**

将一级标题中的 `V2.5` 改为 `V2.6`。

- [ ] **Step 2: 替换第 4.2 节图示列**

用 `../../../prd/ai生成/macos26-launchpad-v2.6/<file>.png` 的相对路径插入真实截图；为每张图添加简短且与模块对应的替代文本。

- [ ] **Step 3: 检查引用**

Run:

```powershell
rg -n "macos26-launchpad-v2\.6/.+\.png|V2\.6" docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md
```

Expected: 标题为 V2.6，第 4.2 节所有模块均包含有效 PNG 引用。

### Task 4: 提交并验证线上资源

**Files:**
- Create: `docs/superpowers/plans/2026-07-23-macos26-launchpad-prd-image-publish.md`
- Create/Modify: Task 2 和 Task 3 列出的文件

- [ ] **Step 1: 仅暂存目标文件**

Run:

```powershell
git add -- docs/superpowers/specs/2026-07-22-macos-26-gamehub-fullscreen-launcher-prd-v2.md docs/superpowers/plans/2026-07-23-macos26-launchpad-prd-image-publish.md tools/capture-macos26-launchpad-prd-screenshots.mjs prd/ai生成/macos26-launchpad-v2.6
```

Expected: 暂存区只包含本任务文件。

- [ ] **Step 2: 提交并推送**

Run:

```powershell
git commit -m "docs: add macOS launchpad PRD screenshots"
git push origin HEAD:master
```

Expected: 提交成功，远端 `master` 接收新提交。

- [ ] **Step 3: 校验线上文件**

通过 GitHub Raw 请求 PRD 和 12 张 PNG。

Expected: 全部 URL 返回 HTTP 200，线上 SHA256 与本地一致。
