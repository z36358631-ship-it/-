# APP Rental After-Sales and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有APP租号Demo中增加退款／换号两级售后选择和租号消息中心，并产出3张竖屏页面图与PRD补充说明。

**Architecture:** 继续以单文件HTML模板作为业务与视图唯一来源，通过现有构建脚本同步普通Demo和标注版。新增一个独立截图脚本只覆盖本轮3个页面，避免改动或覆盖既有PRD截图矩阵。

**Tech Stack:** HTML、CSS、原生JavaScript、Node.js、Playwright、Markdown

---

### Task 1: 扩展售后状态与页面

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`

- [ ] 将售后草稿拆为 `requestType`、`reason` 和 `description`。
- [ ] 增加退款／换号一级选择，并按诉求切换原因、提示和提交按钮文案。
- [ ] 提交后保留现有“返回订单详情＋售后详情＋可撤销”闭环。

### Task 2: 增加消息中心页面

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html`

- [ ] 增加消息数据、页面路由和“全部／订单与售后”Tab。
- [ ] 展示换号审核、退款受理、退款到账和到期前15分钟四类样例消息。
- [ ] 校验页面不包含任何账号凭据。

### Task 3: 构建、截图与验证

**Files:**
- Modify: `tools/build-app-rental-demo.mjs`
- Create: `tools/capture-app-rental-review-pages.mjs`
- Create: `public/prd/app-rental/20-after-sales-refund-portrait.png`
- Create: `public/prd/app-rental/21-after-sales-replacement-portrait.png`
- Create: `public/prd/app-rental/22-rental-notifications-portrait.png`

- [ ] 构建普通Demo并同步标注版。
- [ ] 在390×844视窗中生成3张独立PNG。
- [ ] 校验诉求、原因、提示、Tab、消息数量、尺寸和敏感信息。

### Task 4: 输出PRD补充说明

**Files:**
- Create: `prd/【盖世游戏APP】游戏租号需求/评审补充-消息通知与售后类型.md`

- [ ] 按页面级六要素描述售后申请页、售后详情和消息中心。
- [ ] 补充通知渠道矩阵、去重、失败、隐私和售后互斥规则。
- [ ] 执行自检，确保图文口径一致且无待补占位符。
