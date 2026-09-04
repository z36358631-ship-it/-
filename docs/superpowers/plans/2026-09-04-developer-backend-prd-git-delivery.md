# Developer Backend PRD Git Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将开发者平台一期最新 Demo、PRD、流程图和页面截图对齐，校验后仅提交本专项文件并推送 Git。

**Architecture:** 以单文件 Demo 为业务事实源，浏览器测试固定关键交互，PRD 使用同源截图和固定提交 SHA。先提交 Demo、测试及图片，再把 PRD 图片与预览链接固定到该提交，最后提交 PRD 并推送。

**Tech Stack:** HTML/CSS/JavaScript、Node.js `node:test`、Playwright、Markdown、PowerShell、Git。

---

### Task 1: 对账最新规则

**Files:**
- Review: `demos/开发者后台一期/01-开发者平台与资料demo.html`
- Review: `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`
- Review: `tests/developer-backend/prd01-current-scope.browser.test.mjs`

- [ ] **Step 1: 盘点 Demo 与 PRD 差异**

Run: `rg -n "厂商设置|资料修改|申请类型|排序权重|中国澳门|省／自治区／直辖市|撤回申请" demos/开发者后台一期/01-开发者平台与资料demo.html prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`

Expected: Demo 的最新规则均能定位，PRD 缺口形成明确清单。

- [ ] **Step 2: 确认提交范围**

Run: `git status --short -- demos/开发者后台一期 tests/developer-backend prd/发行平台专项/开发者后台PRD public/prd/genuine-game-distribution-phase1/developer-backend-final/01`

Expected: 只纳入本专项文件，不处理工作区其他改动。

### Task 2: 更新浏览器回归用例

**Files:**
- Modify: `tests/developer-backend/prd01-current-scope.browser.test.mjs`

- [ ] **Step 1: 把旧控制台和排序断言改为最新规则**

验证控制台仅有“游戏管理／厂商设置”，认证状态在厂商设置；厂商设置三页签的编辑权限、无变更提示和待审限制；注册地区枚举及中国大陆省／市／区县；帮助导航和子文档使用 0—9999 整数权重且数值越大越靠前。

- [ ] **Step 2: 运行用例**

Run: `node --test tests/developer-backend/prd01-current-scope.browser.test.mjs`

Expected: 全部通过，无页面错误和根节点横向溢出。

### Task 3: 更新 PRD 与流程素材

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`
- Modify: `public/prd/genuine-game-distribution-phase1/developer-backend-final/01/architecture-source.html`
- Modify: `public/prd/genuine-game-distribution-phase1/developer-backend-final/01/flow-source.html`

- [ ] **Step 1: 更新最终业务口径**

正文写清控制台两入口、厂商设置三页签、认证与资料修改两类申请、审核状态、撤回二次确认、拒绝和下架后重新提交、认证通过后的资料修改审核、注册地区与大陆三级地址、帮助内容权重和固定通知文案。

- [ ] **Step 2: 去重与去 AI 化**

删除已废弃的数据总览／财务入口、上移／下移排序、下架不可重提等旧描述；保留研发、测试、设计和运营执行所需的触发、状态、异常及恢复。

- [ ] **Step 3: 更新架构图和横向流程图源文件**

图中只保留本期有效页面和状态，流程从登录、首次入驻、认证提交、运营审核到厂商设置资料修改审核闭环。

### Task 4: 生成最新截图并校验

**Files:**
- Modify: `public/prd/genuine-game-distribution-phase1/developer-backend-final/01/*.png`

- [ ] **Step 1: 生成同源页面截图**

Run: `$env:CAPTURE_PRD_ASSET='1'; node --test tests/developer-backend/prd01-current-scope.browser.test.mjs`

Expected: 测试通过并覆盖 PRD 引用的当前页面图。

- [ ] **Step 2: 渲染架构图与流程图**

Run: `node scripts/render-html-to-png.mjs public/prd/genuine-game-distribution-phase1/developer-backend-final/01/architecture-source.html public/prd/genuine-game-distribution-phase1/developer-backend-final/01/architecture.png`

Run: `node scripts/render-html-to-png.mjs public/prd/genuine-game-distribution-phase1/developer-backend-final/01/flow-source.html public/prd/genuine-game-distribution-phase1/developer-backend-final/01/flow.png`

Expected: PNG 存在、可解析且文字清晰。

- [ ] **Step 3: 执行 PRD 机械校验**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`

Expected: PASS。

### Task 5: 固定版本、提交并推送

**Files:**
- Commit: 本计划列出的 Demo、测试、PRD、流程源与图片

- [ ] **Step 1: 提交 Demo、测试和图片**

Run: `git add -- <明确文件列表> && git commit -m "fix: finalize developer certification workflow"`

Expected: 生成包含 Demo 与图片的固定 40 位提交 SHA。

- [ ] **Step 2: 将 PRD 链接更新为固定 SHA**

将全部 PRD 图片直链及 Demo 预览链接替换为上一步提交 SHA，禁止使用分支名或短 SHA。

- [ ] **Step 3: 验证远程图片并提交 PRD**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md -VerifyRemote`

Expected: 全部图片 HTTP 200 且 MIME 为图片；仅代表公网验证，不代表飞书已转存。

Run: `git add -- <PRD 与计划文件> && git commit -m "docs: sync developer platform prd"`

Expected: 提交只包含本专项文档。

- [ ] **Step 4: 推送当前分支**

Run: `git push origin HEAD`

Expected: 远端分支更新成功，两个提交均可从远端读取。

