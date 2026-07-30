# Mac 租号游戏库 Steam 登录助手实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在游戏库的 Steam 账号卡中补充账号密码与 Steam Guard 令牌登录入口，并与订单已有凭据安全规则共用同一账号绑定。

**Architecture:** 游戏库只负责找到当前有效使用单并打开登录助手；账号、密码、令牌、查看授权和到期回收继续由 `credentialAccess`、`openManualLoginDialog` 和 `clearCredentialView` 统一处理。自动化脚本验证入口、掩码、令牌倒计时和失效拦截，并生成 PRD 截图。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Playwright Core、Markdown PRD

---

### Task 1: 游戏库 Steam 登录入口

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 增加有效使用单选择函数**

```js
function activeCredentialOrder() {
  const preferred = orders.find((order) => order.id === state.activeRentalOrderId);
  if (preferred && credentialAccess(preferred.id).ok) return preferred;
  return orders.find((order) => credentialAccess(order.id).ok) || null;
}
```

- [ ] **Step 2: 在 Steam 账号卡显示登录操作**

未登录时显示“登录 Steam”，有效租号账号已登录时显示“登录信息”；两个入口都绑定当前有效使用单，不重新取号。

- [ ] **Step 3: 复用凭据弹窗**

```js
if (action === 'open-library-steam-login') {
  const order = activeCredentialOrder();
  if (!order) return showToast('当前没有可登录的有效使用单', 'error');
  state.selectedOrderId = order.id;
  return openManualLoginDialog(order.id);
}
```

### Task 2: 登录流程自动化与截图

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Modify: `tools/verify-mac-rental-membership.cjs`
- Create: `public/prd/mac-rental/c05-library-steam-login.png`

- [ ] **Step 1: 增加 Smoke Test**

验证游戏库入口命中原使用单、账号默认掩码、密码不明文、令牌可获取且存在倒计时。

- [ ] **Step 2: 生成登录助手截图**

运行：

```powershell
node tools/verify-mac-rental-membership.cjs
```

预期：全部 Smoke Test 通过，并生成4张有效 PNG。

### Task 3: PRD 同步

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: 追加 V3.5 版本记录**

记录会员套餐顺序、跨月年套餐续费、用户信息、FAQ、确认订单双 SKU 等宽和游戏库 Steam 登录助手。

- [ ] **Step 2: 更新 C 端大表**

在“登录方式、下载启动与非目标游戏限制”行加入游戏库入口、账号密码、授权码、到期回收及异常处理，并把新截图放在该行“图示”单元格。

- [ ] **Step 3: 清理旧规则**

全文移除“永久、年度、月度”“仅同 SKU 续费”“跨周期不能直接续费”等旧表述，统一为月度、年度、永久和月卡/年卡跨套餐顺延。

### Task 4: 发布与飞书图片验证

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: 提交并推送 Demo、截图和测试**

获取实际包含全部截图的40位提交 SHA。

- [ ] **Step 2: 替换 PRD 图片地址**

全部图片使用同一固定提交 SHA 的 jsDelivr HTTPS 原图地址。

- [ ] **Step 3: 远程验证**

逐张检查 HTTP 200 与 `Content-Type: image/png`，图片数、固定链接数和通过数必须一致。
