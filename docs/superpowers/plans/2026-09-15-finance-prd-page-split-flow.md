# Finance PRD Page Split and Actual Flow Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按页面拆分财务 PRD，并以当前 Demo 的 12 个实际页面状态重做产品流程图。

**Architecture:** 保持 Demo 业务代码不变；用 Playwright 从开发者与运营整合 Demo 捕获缺失状态，用单独 HTML 画布按 3×4 排列截图，再更新 PRD 页面六要素和固定图片地址。

**Tech Stack:** HTML、CSS、Playwright Core、PowerShell、Markdown、Git。

---

### Task 1: 捕获实际页面状态

**Files:**
- Create: `tools/capture-finance-prd-flow.mjs`
- Create: `public/prd/developer-finance-settlement-v2/15-flow-*.png`

- [ ] **Step 1: 编写截图脚本**

脚本打开 `开发者平台财务整合demo.html` 与 `发行平台运营后台财务整合demo.html`，按实际按钮依次捕获财务主体查看、编辑、审核中、对账列表、销售明细、确认弹窗、已确认、阶梯配置、主体汇总、游戏明细、运营明细和勾选导出状态。

- [ ] **Step 2: 生成截图**

Run: `node tools/capture-finance-prd-flow.mjs`

Expected: 12 张 PNG 存在，宽高大于 0；Demo 源文件无改动。

### Task 2: 合成实际页面流程图

**Files:**
- Create: `public/prd/developer-finance-settlement-v2/15-flow-feishu-source.html`
- Modify: `public/prd/developer-finance-settlement-v2/15-flow-feishu.png`

- [ ] **Step 1: 创建 3×4 画布**

画布为白底，三行分别标注“财务主体”“开发者对账”“运营结算”；每行四张实际截图，步骤标题置于截图上方，箭头只连接同一行。

- [ ] **Step 2: 输出流程图**

Run: `node tools/capture-finance-prd-flow.mjs`

Expected: `15-flow-feishu.png` 清晰展示 12 个实际页面状态，不含文字说明卡。

### Task 3: 按页面重构 PRD

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md`

- [ ] **Step 1: 拆分开发者端**

将财务主体、对账结算设为主页面；将主体编辑、附件预览、销售明细和确认结算设为对应子页面。每张六要素表只放一张当前页图。

- [ ] **Step 2: 拆分运营端**

将主体汇总、游戏明细设为主页面；将销售明细和阶梯分成配置设为游戏明细子页面。筛选、分页和导出保留在所属主页面。

- [ ] **Step 3: 更新流程图与图号**

替换 2.2 产品流程图，统一页面编号、图片标题和图注；正文只保留最终规则。

### Task 4: 校验并发布

**Files:**
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`

- [ ] **Step 1: 运行质量和图片校验**

Run: `powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-quality.ps1 -Path "prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md"`

Expected: 0 errors, 0 warnings.

Run: `powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-images.ps1 -PrdPath "prd/发行平台专项/开发者后台PRD/15-开发者财务主体与对账结算PRD.md" -VerifyRemote`

Expected: 全部图片通过 HTTP 与 MIME 校验。

- [ ] **Step 2: 精确提交**

只暂存本计划、设计说明、截图脚本、财务 PRD、财务图片和状态卡；提交后推送当前分支，并将 PRD 图片地址固定到新提交 SHA。
