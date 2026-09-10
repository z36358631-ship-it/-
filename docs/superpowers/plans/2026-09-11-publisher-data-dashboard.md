# 发行平台开发者数据看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在统一 02 开发者前台加入买断游戏与永久 DLC 数据看板，并产出与 Demo 同源的 PRD、页面截图和验证证据。

**Architecture:** 新增独立 `PublisherDataDashboard` 组件维护样例数据、筛选和页面内交互；统一 02 只扩展一级工作区入口与挂载逻辑。正式对账继续跳转现有 15 财务结算，避免重复账单状态和操作。

**Tech Stack:** 单文件 HTML 构建器、原生 JavaScript、CSS、Node.js `node:test`、Playwright 浏览器测试、Markdown PRD。

---

### Task 1: 建立数据看板运行时组件

**Files:**
- Create: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Create: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 定义固定业务样例与纯计算函数**

写入只包含买断游戏本体和永久 DLC、Android 与 Mac、直接购买与 CDKEY 的订单和锁定账单样例；导出筛选、指标计算和快照函数。

- [ ] **Step 2: 实现三个页签及状态**

实现“经营概览”“订单明细”“收入与结算”，覆盖默认态、组合筛选空态、数据口径弹窗和订单详情抽屉。

- [ ] **Step 3: 实现财务跳转**

把“前往对账结算”指向 `15-开发者财务结算demo.html#/settlement`，把“查看对账流水”指向 `15-开发者财务结算demo.html#/flows`，写入当前演示筛选上下文。

- [ ] **Step 4: 完成响应式样式**

桌面端使用指标卡、图表和表格；窄屏改为可横向滚动页签与表格，390px 视口不得产生根节点横向溢出。

### Task 2: 接入统一 02 Demo

**Files:**
- Modify: `demos/开发者后台一期/build.mjs`
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/README.md`

- [ ] **Step 1: 注册组件资源**

在 01/02 共用构建中加入数据看板 JavaScript 和 CSS，保持离线单文件产物。

- [ ] **Step 2: 扩展一级侧边栏和工作区**

侧边栏按“游戏管理、数据看板、厂商设置”展示；`workspaceView=data` 时挂载数据看板，其他入口和游戏创建流程保持原行为。

- [ ] **Step 3: 绑定页面内交互**

在统一渲染完成后调用组件 `bind`，页签、筛选、重置、弹窗、抽屉和跳转均可操作；重新进入页面保留本次会话的筛选和页签。

- [ ] **Step 4: 重新构建 02 HTML**

Run: `node demos/开发者后台一期/build.mjs --module=02`

Expected: 输出包含 01/02 当前路由的离线 `02-游戏创建与发行demo.html`，构建退出码为 0。

### Task 3: 增加浏览器验收

**Files:**
- Create: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

- [ ] **Step 1: 编写核心业务断言**

断言默认筛选下只含买断本体和永久 DLC，端只有 Android/Mac，履约只有直接购买/CDKEY；断言待裁决拒付不扣收入、败诉才扣减。

- [ ] **Step 2: 编写交互断言**

断言一级入口、三个页签、组合筛选、空态、七类订单状态、详情抽屉、口径弹窗和两个财务跳转。

- [ ] **Step 3: 编写响应式断言**

在 1440×900 和 390×844 下检查页面可用性、根节点无横向溢出和主要操作不被悬浮 Demo 工具遮挡。

- [ ] **Step 4: 运行测试**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 所有子测试通过，退出码为 0。

### Task 4: 生成当前 Demo 截图与 PRD

**Files:**
- Create: `public/prd/publisher-data-dashboard/01-product-flow.png`
- Create: `public/prd/publisher-data-dashboard/02-dashboard-overview.png`
- Create: `public/prd/publisher-data-dashboard/03-order-detail.png`
- Create: `public/prd/publisher-data-dashboard/04-income-settlement.png`
- Create: `prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md`

- [ ] **Step 1: 截取当前页面证据**

使用构建后的 02 Demo 截取经营概览、订单详情和收入与结算页面；产品流程图按“进入数据看板→筛选查看→定位订单→进入对账”横向合成一张图。

- [ ] **Step 2: 生成复杂需求 PRD**

按 `/to-prd` 唯一模板输出 B 端三页六要素、权限表、指标口径、事件与参数、技术和财务边界；不增加 C 端章节。

- [ ] **Step 3: 更新固定图片链接**

先提交 Demo 和图片，取得固定提交 SHA，再把 PRD 图片链接写为 jsDelivr 固定 SHA 地址。

- [ ] **Step 4: 执行 PRD 校验**

检查横向单图流程、每页当前图、展示与交互编号、事件参数一致性、无占位内容、无相对图片链接。

### Task 5: 最终验证、精确提交与推送

**Files:**
- Modify only files listed in Tasks 1-4.

- [ ] **Step 1: 执行完整验证**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Run: `git diff --check -- <本计划涉及文件>`

Expected: 全部退出码为 0。

- [ ] **Step 2: 精确暂存和提交**

只使用带完整路径的 `git add -- <path...>`，禁止 `git add .`、`git commit -a`、`git reset` 和 `git clean`。

- [ ] **Step 3: 推送当前分支**

Run: `git push origin codex/guanwanggaid-32-pc-emulator-20260819`

Expected: 远端分支包含本轮 Demo、PRD、截图、测试、规格和计划提交。
