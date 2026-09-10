# APP Rental Portrait Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将APP租号PRD的7步产品流程图改为4＋3排布的完整竖屏截图，并更新可交付PRD与ZIP。

**Architecture:** 继续使用现有Sharp生成脚本作为唯一图源，移除局部裁切，统一按原始比例缩放完整竖屏截图。校验脚本锁定7个节点、4＋3排布、完整竖屏渲染和画布尺寸，再将新图以固定提交SHA写入PRD并刷新ZIP。

**Tech Stack:** Node.js、Sharp、PowerShell、Python zipfile、Git

---

### Task 1: 锁定完整竖屏流程图契约

**Files:**
- Modify: `scripts/verify-app-rental-prd-flow.js`
- Modify: `scripts/build-app-rental-prd-flow.js`

- [ ] **Step 1: 将验证契约从局部裁切改为完整竖屏**

校验生成脚本不再包含 `extract(step.crop)`，保留 `rows: [4, 3]`、7个竖屏源图文件名、`fit: 'contain'` 和折返箭头。

- [ ] **Step 2: 运行校验确认旧实现失败**

Run: `node scripts/verify-app-rental-prd-flow.js`

Expected: FAIL，提示仍包含局部裁切或画布不满足完整竖屏要求。

- [ ] **Step 3: 调整画布、卡片和截图区域**

扩大纵向画布与卡片高度；`roundedScreenshot` 直接读取整张竖屏图并使用 `fit: 'contain'` 缩放，禁止 `extract`。

- [ ] **Step 4: 生成并验证流程图**

Run: `node scripts/build-app-rental-prd-flow.js; node scripts/verify-app-rental-prd-flow.js`

Expected: 输出新PNG尺寸，随后显示 `FLOW_CONTRACT PASS`。

### Task 2: 目视检查与固定图片提交

**Files:**
- Modify: `public/prd/app-rental/app-rental-current-flow.png`

- [ ] **Step 1: 原尺寸检查图片**

确认两排分别为4张和3张完整竖屏图，截图无拉伸、卡片不越界、04至05折返箭头清晰。

- [ ] **Step 2: 提交流程图与生成契约**

Run: `git add scripts/build-app-rental-prd-flow.js scripts/verify-app-rental-prd-flow.js public/prd/app-rental/app-rental-current-flow.png docs/superpowers/specs/2026-09-11-app-rental-portrait-flow-design.md docs/superpowers/plans/2026-09-11-app-rental-portrait-flow.md; git commit -m "docs: use portrait screenshots in APP rental flow"`

Expected: 新提交包含脚本、流程图、设计和计划文件。

### Task 3: 更新PRD与最终ZIP

**Files:**
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md`
- Modify: `prd/最终文档/【Prd】《盖世游戏APP》游戏租号需求.zip`

- [ ] **Step 1: 更新修订记录和2.2固定图片SHA**

新增V3.2修订记录，仅说明流程图改为4＋3完整竖屏图；将2.2图片链接替换为流程图提交的40位SHA。

- [ ] **Step 2: 刷新ZIP**

Run: `python scripts/refresh-app-rental-prd-zip.py`

Expected: `ZIP_REFRESH PASS`，条目数量保持46，包内PRD与源文件字节一致。

- [ ] **Step 3: 执行PRD与图片校验**

Run: `powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-quality.ps1 -Path <PRD绝对路径>`

Run: `powershell -ExecutionPolicy Bypass -File .agents/skills/to-prd/scripts/validate-prd-images.ps1 -PrdPath <PRD绝对路径> -VerifyRemote`

Expected: PRD 0错误、0警告；全部图片公网验证通过。飞书转存仍单独标记为未验证。

- [ ] **Step 4: 提交并推送**

Run: `git add <PRD路径> <ZIP路径>; git commit -m "docs: update APP rental PRD portrait flow"; git push`

Expected: 本地HEAD、上游分支和远端分支指向同一提交。

