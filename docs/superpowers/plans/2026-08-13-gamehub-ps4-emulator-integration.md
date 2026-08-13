# 盖世游戏 App 主机模拟器接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 输出可评审的高保真交互 Demo、标准 PRD、远程可访问配图和任务看板交付记录。

**Architecture:** 使用单文件 HTML 承载现有盖世游戏 App 壳、C 端多页面状态和 B 端插件后台，通过统一状态路由实现页面切换。PRD 使用 to-prd 九章模板，C 端和 B 端各一个详细设计大表，并引用 Demo 截图。

**Tech Stack:** HTML、CSS、原生 JavaScript、Playwright、Markdown、Git

---

### Task 1: 实现交互 Demo

**Files:**
- Create: `demos/APP-PS4模拟器/盖世游戏APP-主机模拟器接入demo.html`

- [ ] **Step 1: 建立现有 App 游戏库壳**

复刻顶部分类、搜索、导入、双列游戏卡和底部五项导航。

- [ ] **Step 2: 补齐核心页面**

实现导入方式、扫描确认、安装进度、更多菜单、存档管理、全局设置、必要组件和横屏运行态。

- [ ] **Step 3: 补齐异常状态**

实现不兼容、权限拒绝、空间不足、文件无效、插件下载失败和安装中断。

- [ ] **Step 4: 实现后台**

实现插件版本列表、新增版本、启停、灰度、强制更新、回滚和操作记录。

### Task 2: 验证并生成 PRD 配图

**Files:**
- Create: `tools/capture-ps4-emulator-prd-screenshots.mjs`
- Create: `public/prd/ps4-emulator/*.png`

- [ ] **Step 1: 编写截图脚本**

按 URL 场景参数打开 Demo，截取 C 端和 B 端关键页面。

- [ ] **Step 2: 执行视觉检查**

检查 390×844 竖屏、874×402 横屏及 1440×900 后台布局，无溢出、遮挡和无效交互。

- [ ] **Step 3: 执行交互冒烟测试**

验证导入、安装、启动、存档、设置、异常状态和后台配置均可切换。

### Task 3: 输出标准 PRD

**Files:**
- Create: `prd/ai生成/【Prd】《盖世游戏》主机模拟器接入需求.md`

- [ ] **Step 1: 写入九章结构**

严格使用合并模板，详细设计中 C 端、B 端各一个大表。

- [ ] **Step 2: 补齐状态、埋点和国内海外差异**

保证事件参数一一对应，明确 Google Play 权限差异和插件降级。

- [ ] **Step 3: 执行自查与模拟评审**

检查排序、空态、加载、文件、状态、异常、权限、灰度和待确认项。

### Task 4: 发布与交付

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》主机模拟器接入需求.md`

- [ ] **Step 1: 只提交本次相关文件**

使用精确路径 `git add`，不得带入工作区其他修改。

- [ ] **Step 2: 替换固定提交 SHA 图片地址**

所有 PRD 图片使用同一固定提交 SHA 的 jsDelivr HTTPS 链接。

- [ ] **Step 3: 验证远程图片**

逐张检查 HTTP 200 与 `image/png`，图片数与通过数一致。

- [ ] **Step 4: 更新任务看板**

添加交付说明并把 GUANWANGGAID-27 移至 `in_review`。

