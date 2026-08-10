# Mac 原生版本管理 PRD 精简发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 输出一份只含当前执行规则、带固定 Git 功能图并可直接导入飞书的精简 PRD。

**Architecture:** 在基于最新 `origin/master` 的独立 worktree 中发布 6 张图片，取得固定 commit SHA 后生成最终 Markdown。PRD 末尾附群同步素材，飞书文档使用同一份正文导入并人工检查层级、表格和图片。

**Tech Stack:** Markdown、Git、jsDelivr、PowerShell、Chrome、飞书云文档

---

### Task 1: 发布功能图片

**Files:**
- Create: `public/prd/mac-native-version-management/01-version-switch.png`
- Create: `public/prd/mac-native-version-management/02-native-download-entry.png`
- Create: `public/prd/mac-native-version-management/03-native-installed.png`
- Create: `public/prd/mac-native-version-management/04-path-largest-default.png`
- Create: `public/prd/mac-native-version-management/05-no-eligible-path.png`
- Create: `public/prd/mac-native-version-management/06-download-locked.png`

- [ ] **Step 1: 从已验收截图复制 6 个文件到发布目录**
- [ ] **Step 2: 用图片签名检查确认每个文件均为 PNG**
- [ ] **Step 3: 提交图片并记录 40 位 commit SHA**
- [ ] **Step 4: 推送分支，逐张验证 jsDelivr URL 返回 HTTP 200 和 `image/png`**

### Task 2: 重写精简 PRD

**Files:**
- Create: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`

- [ ] **Step 1: 只保留背景、目标、范围、当前功能规则、异常边界、验收和群同步素材**
- [ ] **Step 2: 把 6 张功能图写入对应规则和群同步素材，全部使用 Task 1 的固定 SHA**
- [ ] **Step 3: 删除历史口径、重复验收、自检记录、模拟评审和卸载/空间管理正文**
- [ ] **Step 4: 检查“完整路径平铺、最大空间默认、异常路径禁用、下载锁定、取消不切换”均有唯一明确表述**

### Task 3: 验证与 Git 发布

**Files:**
- Create: `test-results/mac-native-prd-publish-report.md`

- [ ] **Step 1: 统计 Markdown 图片和固定 SHA URL，预期均为 12 次引用、6 个唯一 URL**
- [ ] **Step 2: 扫描本地路径、相对图片、`localhost`、`@main`、`@master`、AI 腔和历史冲突，预期为 0**
- [ ] **Step 3: 逐张请求最终 URL，记录状态码、Content-Type 和结果**
- [ ] **Step 4: 运行 `git diff --check`，预期无空白错误**
- [ ] **Step 5: 提交 PRD 和验证报告并推送当前分支**

### Task 4: 飞书文档发布

**Files:**
- Source: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`

- [ ] **Step 1: 在已登录飞书中创建文档并写入 Markdown 内容**
- [ ] **Step 2: 调整标题、章节、表格、列表和图片位置**
- [ ] **Step 3: 检查文末“群同步素材”可按描述加图片整体复制**
- [ ] **Step 4: 读取并保存最终飞书文档链接**

### Task 5: Delivery 送审

**Files:**
- Create: `test-results/mac-native-prd-delivery-manifest.json`

- [ ] **Step 1: 生成含交付结论、本次完成、如何验收、需要关注和技术详情的 manifest**
- [ ] **Step 2: 执行 `taskctl delivery create GUANWANGGAID-5 --manifest-file <文件>`**
- [ ] **Step 3: 为 PRD、功能图、Git 链接、飞书链接和验证报告逐项登记 artifact**
- [ ] **Step 4: 重新读取 issue 最新 version**
- [ ] **Step 5: 执行 `taskctl delivery submit <Delivery ID> --if-version <最新 version>`**
