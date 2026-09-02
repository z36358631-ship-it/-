# Developer Backend Figma Visibility Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复开发者后台 Figma 中文缺字与 P03/P04 顶栏白底白字，同时保持 37 个路由和既有业务设计不变。

**Architecture:** 在 SVG 生成器层修复字体兼容，重新生成可编辑源；用自动测试锁定字体与顶栏结构，再把受影响根画板同步到同一 Figma 文件并完成云端证据核验。

**Tech Stack:** Node.js、Playwright、SVG、Node test、Figma Web

---

### Task 1: 锁定回归条件

**Files:**
- Modify: `tests/developer-backend/figma-organization.test.mjs`

- [ ] **Step 1: 写入字体与顶栏回归断言**

在生成源测试中增加：所有业务正式 Page 不允许裸 `font-family="Microsoft YaHei"`；P03/P04 的每个 `Pxx-xx` 页面均包含 `shape-1` 深色顶栏 `fill="#0b1220"`。

- [ ] **Step 2: 运行测试确认字体断言失败**

Run: `node --test tests/developer-backend/figma-organization.test.mjs`

Expected: 新字体断言失败，证明当前缺陷被测试捕获。

### Task 2: 修复 SVG 字体兼容

**Files:**
- Modify: `Figma/开发者后台一期/build-figma-source.mjs`
- Regenerate: `Figma/开发者后台一期/source/pages/*.svg`
- Regenerate: `Figma/开发者后台一期/source/sections/*.svg`
- Regenerate: `Figma/开发者后台一期/source/figma-pages/*.svg`
- Regenerate: `Figma/开发者后台一期/source/gamehub-developer-backend-phase1.svg`
- Regenerate: `Figma/开发者后台一期/source/source-manifest.json`

- [ ] **Step 1: 使用 Figma 可兼容字体栈**

将 `renderText()` 的中文输出统一为 `Microsoft YaHei, Arial, sans-serif`，`D-DIN-PRO` 仍映射为 `Arial`；不添加文字路径或位图。

- [ ] **Step 2: 重建全部可编辑源**

Run: `node Figma/开发者后台一期/build-figma-source.mjs`

Expected: 输出 `frameCount: 37`，正式 Page 保持 6 个。

- [ ] **Step 3: 运行完整回归**

Run: `node --test tests/developer-backend/*.test.mjs`

Expected: 43/43 或当前测试总数全部通过。

- [ ] **Step 4: 校验五份待同步 SVG**

分别对 P01、P02、P03、P04 和组件母版运行 `verify-figma-source.mjs`，页面 ID、可见节点、外部资源和主动内容全部通过。

### Task 3: 同步云端 Figma

**Files:**
- Update cloud: `盖世游戏｜开发者后台一期`

- [ ] **Step 1: 导入五份当前 SVG**

导入 P01、P02、P03、P04 和组件母版，记录新增根的名称、坐标与尺寸。

- [ ] **Step 2: 替换正式根**

把新版归位到旧根坐标，恢复 `figma-page-01`、`figma-page-02`、`figma-page-03`、`figma-page-04`、`figma-page-components` 正式名称；保留 `00 全局流程索引` 和历史页。

- [ ] **Step 3: 云端视觉和可编辑性检查**

逐页核对 P01 中文、P03/P04 深色顶栏；分别选中文字与矢量图层，确认仍可编辑。

### Task 4: 证据与状态回写

**Files:**
- Modify: `Figma/开发者后台一期/figma-delivery.md`
- Modify: `Figma/开发者后台一期/evidence/evidence-manifest.json`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json`

- [ ] **Step 1: 保存最终截图和哈希**

保存 P01、P03、P04、图层树、文字和矢量可编辑证据，更新证据清单。

- [ ] **Step 2: 回写 S5-S8**

记录源文件、机器验证、专业判断、Git、公开预览和远程资源的真实状态；未推送继续写明未推送。
