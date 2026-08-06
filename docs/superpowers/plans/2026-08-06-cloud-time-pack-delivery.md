# Cloud Time Pack Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可操作的“云游戏时段次卡与限时套餐”Demo、真实页面截图及可直接导入飞书的精简 PRD。

**Architecture:** 使用一个无外部依赖的单文件 HTML，左侧切换 C 端与 B 端场景，中间保留真实页面结构并用弹窗/状态切换演示核心链路。截图由 Playwright 按页面状态生成到 `public/prd/cloud-time-pack/`，PRD 仅在 4.2、4.3 各使用一张大表承载规则与截图。

**Tech Stack:** HTML/CSS/JavaScript、Playwright、Markdown、GitHub/jsDelivr。

---

### Task 1: 建立 Demo

**Files:**
- Create: `demos/云游戏/云游戏时段次卡与限时套餐demo.html`

- [x] 还原 C 端充值中心、时长明细和秒玩入口。
- [x] 还原 B 端商品列表、配置弹窗和用户时长弹窗。
- [x] 实现商品切换、预热倒计时、激活、提醒、配置和扣除交互。
- [x] 本地打开并检查控制台错误、按钮与弹窗状态。

### Task 2: 截图与自动校验

**Files:**
- Create: `tools/capture-cloud-time-pack-demo.mjs`
- Create: `tools/verify-cloud-time-pack-demo.mjs`
- Create: `public/prd/cloud-time-pack/01-recharge-products.png`
- Create: `public/prd/cloud-time-pack/02-slot-pass-activation.png`
- Create: `public/prd/cloud-time-pack/03-time-detail.png`
- Create: `public/prd/cloud-time-pack/04-slot-pass-reminder.png`
- Create: `public/prd/cloud-time-pack/05-landscape-recharge.png`
- Create: `public/prd/cloud-time-pack/06-landscape-activation.png`
- Create: `public/prd/cloud-time-pack/07-product-list.png`
- Create: `public/prd/cloud-time-pack/08-slot-pass-config.png`
- Create: `public/prd/cloud-time-pack/09-limited-pack-config.png`
- Create: `public/prd/cloud-time-pack/10-queue-privilege-config.png`
- Create: `public/prd/cloud-time-pack/11-limited-time-deduct.png`

- [x] 自动检查关键页面、控件与交互存在。
- [x] 按11个页面状态截图并核对清晰度。
- [x] 提交并推送图片，记录实际包含图片的40位 SHA。

### Task 3: 精简重写 PRD

**Files:**
- Create: `prd/云时长限时包需求/【Prd】《盖世游戏》云游戏时段次卡与限时套餐需求.md`

- [x] 按 `/to-prd` 八章主体输出精简文档。
- [x] C 端与 B 端分别使用一张大表，截图均放在“图示”列。
- [x] 产品规则只在详细设计写一次，不重复设置验收与评审章节。
- [x] 回填固定 SHA 的 jsDelivr 图片地址。

### Task 4: 发布验收

- [x] 校验 Markdown 图片数等于固定 SHA 地址数等于远程通过数。
- [x] 逐图校验 HTTP 200、`Content-Type: image/png`、文件大小大于0。
- [ ] 校验在线 Demo 返回 HTTP 200、`Content-Type: text/html`。
- [ ] 确认提交只包含本任务文件后推送。
