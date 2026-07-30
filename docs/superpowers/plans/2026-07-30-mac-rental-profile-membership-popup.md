# Mac 租号独立会员购买页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 确认订单移除会员购买 Tab，点击“开通会员”进入独立会员中心，并在会员中心完整展示套餐、支付宝、微信支付和二维码。

**Architecture:** 保留单文件 HTML 的既有状态与事件委托。单游戏订单继续由 `renderMacCheckout()` 渲染；会员套餐与支付统一由 `renderMacMembership()` 渲染，二者使用独立订单和金额。个人中心只展示会员状态，并把开通、续费、重新开通和查看权益统一导向会员中心。

**Tech Stack:** 单文件 HTML、CSS、原生 JavaScript、内置 Smoke Test、Playwright/Chrome、Markdown、GitHub Pages、jsDelivr 固定提交资源地址。

---

### Task 1: 移除确认订单会员 Tab

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Test: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html` 内置 Smoke Test

- [x] **Step 1: 删除旧 Tab 渲染与样式**

删除 `renderCheckoutModeTabs()`、`renderMacMembershipCheckout()`、`renderMembershipCheckoutRight()`、`hydrateCheckoutRight()` 和 `.checkout-mode-*`、`.membership-checkout-*` 旧样式。

- [x] **Step 2: 固定单游戏确认订单**

`SCREEN_RENDERERS.mac.checkout` 直接调用 `renderMacCheckout()`。确认订单只展示版本、首次体验或永久版、订单金额、支付方式和二维码。

- [x] **Step 3: 修改会员入口**

确认订单的“开通会员”按钮调用 `openMonthlyMemberDialog()`，该函数进入 `mac/membership`，不修改或取消当前单游戏待支付订单。

- [ ] **Step 4: 运行 Smoke Test**

Run: 浏览器打开 Demo 后执行 `window.__demoSmoke()`。

Expected: `checkout-membership-tab-removed`、`membership-center-entry`、`pending-order-allows-independent-member-center` 全部 PASS。

### Task 2: 完成独立会员购买页

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Test: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html` 内置 Smoke Test

- [x] **Step 1: 展示三档套餐**

会员中心按后台排序展示永久、年度、月度三档套餐；未开通默认选中月度，有效会员默认选中当前套餐。

- [x] **Step 2: 增加常驻支付区**

会员中心右侧支付区同时展示支付宝、微信支付、二维码、当前套餐、应付金额和开通/续费/升级按钮。切换套餐或支付方式时只刷新会员中心。

- [x] **Step 3: 保持个人中心状态入口**

头像附近弹窗展示未开通、有效、已过期、永久有效四种状态；对应操作统一进入会员中心。

- [ ] **Step 4: 运行交互测试**

Run: 执行 `window.__demoSmoke()`。

Expected: 套餐选择、支付宝/微信切换、二维码、四类个人中心状态和会员购买确认全部 PASS。

### Task 3: 同步 PRD 与截图

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
- Modify: `public/prd/mac-rental/c02-package-and-checkout.png`
- Create: `public/prd/mac-rental/c02-membership-center-payment.png`
- Modify: `public/prd/mac-rental/c02-profile-membership-popup.png`
- Create: `public/prd/mac-rental/c05-manual-login-credentials.png`

- [ ] **Step 1: 更新版本信息和核心链路**

追加 V3.3，写清“确认订单 → 开通会员 → 独立会员中心 → 选择套餐与支付”；删除正文、流程、埋点和验收口径中的确认订单会员 Tab。

- [ ] **Step 2: 更新 C 端大表**

确认订单行只描述单游戏订单；会员中心行描述三档套餐、支付宝、微信支付、二维码、独立订单和会员游戏库；个人中心行描述头像附近弹窗。

- [ ] **Step 3: 更新登录信息弹窗规则**

写清弹窗只通过右上角 X 关闭，不显示底部“返回选择”“已完成登录”，且无横向或纵向滚动条。

- [ ] **Step 4: 生成 1076×734 截图**

截取无会员 Tab 的确认订单、会员中心支付区、头像会员状态弹窗和 Steam 登录信息弹窗；检查网络图片已加载、文字清晰、无滚动条。

### Task 4: 验证并发布

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
- Modify: `public/prd/mac-rental/*.png`

- [ ] **Step 1: 完成 Demo 和 PRD 自检**

Run: HTML JavaScript 语法检查、75 项 Smoke Test、PRD 固定图片地址扫描。

Expected: Smoke Test 75/75 PASS；PRD 的 C 端和 B 端各保留一张大表；图示全部位于“图示”列。

- [ ] **Step 2: 提交并推送 Demo 与截图**

Run:

```powershell
git add -- 'Mac端demo/mac端租号功能/Mac端租号功能-标注版.html' 'public/prd/mac-rental' 'docs/superpowers/plans/2026-07-30-mac-rental-profile-membership-popup.md'
git commit -m "feat(rental): move membership purchase to member center"
git push origin HEAD:master
```

Expected: 远端 `master` 包含最新 Demo、计划和截图。

- [ ] **Step 3: 固定并验证 PRD 图片地址**

取得实际包含截图的 40 位提交 SHA，将 PRD 中 `public/prd/mac-rental/` 图片统一改为该 SHA。逐张请求，要求 HTTP 200 且 `Content-Type` 为 `image/png`。

- [ ] **Step 4: 提交并推送 PRD**

Run:

```powershell
git add -- 'prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md'
git commit -m "docs(rental): sync independent membership purchase flow"
git push origin HEAD:master
```

Expected: GitHub Pages 可打开最新 Demo，飞书可导入 PRD 全部图片。
