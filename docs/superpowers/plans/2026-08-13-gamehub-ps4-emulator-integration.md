# 盖世游戏 App 主机模拟器接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 输出可评审的高保真交互 Demo、标准 PRD、远程可访问配图和任务看板交付记录。

**Architecture:** 使用单文件 HTML 承载现有盖世游戏 App 壳、C 端多页面状态和 B 端插件后台。竖屏和掌机横屏使用独立 DOM 结构，共享本地游戏、安装结果和筛选状态；PKG 单文件与文件夹批量导入使用两条状态链。PRD 使用 to-prd 九章模板，C 端和 B 端各一个详细设计大表，并引用固定 SHA 截图。

**Tech Stack:** HTML、CSS、原生 JavaScript、Playwright、Markdown、Git

---

### Task 1: 重做横竖版游戏库

**Files:**
- Modify: `demos/APP-PS4模拟器/盖世游戏APP-主机模拟器接入demo.html`

- [ ] **Step 1: 建立三级 Tab 与共享状态**

竖屏与横屏 Tab 顺序均为 PC游戏、主机游戏、复古游戏；共享游戏数据，分别保存搜索词、排序和滚动位置。

- [ ] **Step 2: 复刻竖屏游戏库**

沿用现行竖屏顶部 Tab、搜索、工具区、导入条、双列卡片和底部导航；启动为卡片主按钮，更多为独立省略号。

- [ ] **Step 3: 建立独立横屏游戏库**

使用顶部导航、三级 Tab、多列卡片、手柄焦点和独立搜索工具区；不得复用或缩放竖屏 DOM。

- [ ] **Step 4: 补齐 Tab、搜索、排序与视图事件**

每个显式控件都产生可观察结果；搜索无结果显示分类内空态，切换排序回到列表顶部。

### Task 2: 实现两条导入安装链路

**Files:**
- Modify: `demos/APP-PS4模拟器/盖世游戏APP-主机模拟器接入demo.html`

- [ ] **Step 1: 重做导入弹窗**

仅保留“选择 PKG”和“导入游戏文件夹”，移除合规说明文案。

- [ ] **Step 2: 实现单 PKG 状态链**

点击选择 PKG → 系统文件管理器单选 → 文件识别 → 解压 → 安装 → 自动回主机游戏列表。

- [ ] **Step 3: 实现文件夹批量状态链**

点击导入游戏文件夹 → 选择目录 → 扫描与解压 → 已识别游戏列表 → 勾选 → 安装 → 自动回主机游戏列表。

- [ ] **Step 4: 覆盖导入异常**

处理权限拒绝、未识别、文件损坏、空间不足、未勾选、安装中断和失败重试。

### Task 3: 补齐管理、存档与运行事件

**Files:**
- Modify: `demos/APP-PS4模拟器/盖世游戏APP-主机模拟器接入demo.html`

- [ ] **Step 1: 重排启动与更多**

卡片主按钮仅启动，省略号打开更多菜单；更多菜单内各项进入对应页面或弹窗。

- [ ] **Step 2: 重做存档管理**

移除提示卡和刷新按钮；实现下拉刷新、右上导入、导出和删除二次确认。

- [ ] **Step 3: 补齐运行中菜单**

继续游戏关闭菜单；触控按键使用开关；按键与布局、手柄映射打开可操作二级面板；退出游戏二次确认。

- [ ] **Step 4: 保持后台功能可操作**

验证新增版本、筛选、灰度、启停、全量、回滚和操作记录仍可操作。

### Task 4: 验证并生成 PRD 配图

**Files:**
- Create: `tools/capture-ps4-emulator-prd-screenshots.mjs`
- Create: `public/prd/ps4-emulator/*.png`

- [ ] **Step 1: 编写截图脚本**

按 URL 场景参数打开 Demo，截取 C 端和 B 端关键页面。

- [ ] **Step 2: 执行视觉检查**

检查 390×844 竖屏、874×402 横屏及 1440×900 后台布局，无溢出、遮挡和无效交互。

- [ ] **Step 3: 执行交互冒烟测试**

验证导入、安装、启动、存档、设置、异常状态和后台配置均可切换。

### Task 5: 输出标准 PRD

**Files:**
- Create: `prd/ai生成/【Prd】《盖世游戏》主机模拟器接入需求.md`

- [ ] **Step 1: 写入九章结构**

严格使用合并模板，详细设计中 C 端、B 端各一个大表。

- [ ] **Step 2: 补齐状态、埋点和国内海外差异**

保证事件参数一一对应，明确 Google Play 权限差异和插件降级。

- [ ] **Step 3: 执行自查与模拟评审**

检查排序、空态、加载、文件、状态、异常、权限、灰度和待确认项。

### Task 6: 发布与交付

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
