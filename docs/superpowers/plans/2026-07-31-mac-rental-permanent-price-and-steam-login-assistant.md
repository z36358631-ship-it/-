# Mac 租号永久价与 Steam 登录助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正首次体验使用后的列表与确认订单，落实永久版 15%–50% 定价，并把 Steam 原生登录过程与盖世登录助手直接联动。

**Architecture:** 继续使用现有单文件 HTML 状态机；价格数据扩展到版本级 Steam 原价、折扣比例和价格版本，展示只读取最终价格。手动登录使用同一遮罩模拟两个独立窗口，复用现有使用单、账号绑定和凭据回收校验。

**Tech Stack:** HTML、CSS、JavaScript、Playwright Core、Markdown

---

### Task 1: 价格模型与列表文案

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 扩展版本级定价数据**

将 `createRentalVersion` 的永久版参数改为版本原价和折扣比例，并生成最终售价：

```js
const permanentPriceFrom = (steamOriginalPrice, discountRate) =>
  Math.round(Number(steamOriginalPrice) * Number(discountRate));
```

每个版本保存 `steamOriginalPrice`、`permanentDiscountRate`、`permanentPriceVersion`，并保证比例在 `0.15` 到 `0.5`。

- [ ] **Step 2: 修改资格使用后的列表**

`rentalStartingLabel` 在无首次资格、无永久权益且无会员权益时返回：

```js
return '可租号';
```

- [ ] **Step 3: 增加价格约束 Smoke Test**

遍历所有版本，验证永久价大于等于原价 15%、小于等于原价 50%，并验证首次资格使用后探索、找游戏和搜索均显示“可租号”。

### Task 2: 确认订单单卡布局

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 固定两列网格**

`.option-row.periods` 始终使用两列；`.option-row.periods.single` 不改为单列，单张永久版卡自然占左半行。

- [ ] **Step 2: 删除资格提示**

从 `renderMacCheckout` 移除“首次体验资格已使用，不再展示时租入口”，保留订单金额、游戏原价、支付方式和会员入口。

- [ ] **Step 3: 更新布局 Smoke Test**

验证单卡宽度约为双卡场景单张卡宽，左对齐且右侧留空；页面不包含资格使用提示。

### Task 3: Steam 登录助手联动

**Files:**
- Modify: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`

- [ ] **Step 1: 重构手动登录弹窗**

`openManualLoginDialog` 输出 `.steam-login-workspace`，包含：

```html
<section class="steam-native-login">Steam 账号、密码、Steam Guard 输入区</section>
<aside class="gamehub-login-assistant">账号、密码、验证码查看/复制/刷新区</aside>
```

右上角只保留一个关闭按钮，助手说明用户将右侧信息输入左侧 Steam 登录窗。

- [ ] **Step 2: 增加 Steam 拉起状态**

点击“登录 Steam”时记录 `steamWindowStatus='focused'`；降级状态展示“Steam 已打开，请进入登录页”，不模拟坐标点击。

- [ ] **Step 3: 删除前端限频错误提示**

保留 `credentialRateAllowed` 的静默保护；命中时直接返回，不调用 `showToast('操作过于频繁，请30秒后重试')`。

- [ ] **Step 4: 更新凭据 Smoke Test**

验证组合窗口、默认掩码、查看/复制、验证码、倒计时、使用单绑定和关闭清理；验证 Demo 中不存在“操作过于频繁，请30秒后重试”。

### Task 4: PRD 与截图

**Files:**
- Modify: `tools/verify-mac-rental-membership.cjs`
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`
- Create or update: `public/prd/mac-rental/*.png`

- [ ] **Step 1: 生成关键截图**

执行：

```powershell
node tools/verify-mac-rental-membership.cjs
```

截图覆盖首次资格已使用的列表、单永久版确认订单和 Steam 登录窗加盖世助手。

- [ ] **Step 2: 更新 PRD V3.6**

在版本表追加 V3.6；C 端大表同步列表、确认订单、价格和登录助手，B 端大表同步版本原价、折扣比例和价格版本；补齐埋点、安全和异常处理。

- [ ] **Step 3: 执行 PRD 自检**

检查 C/B 端仍各为一个汇总大表，修改内容使用黄色行内高亮，不新增“验收标准”章节，所有图仍在大表“图示”单元格中。

### Task 5: 发布与飞书图片验证

**Files:**
- Modify: `prd/【盖世游戏Mac】游戏租号需求/【Prd】《盖世游戏Mac》游戏租号需求.md`

- [ ] **Step 1: 推送 Demo、脚本和截图**

提交并推送后取得真实 40 位提交 SHA。

- [ ] **Step 2: 固定全部图片地址**

把 PRD 中全部 `public/prd/mac-rental/*.png` 更新为同一个固定 SHA 的 jsDelivr HTTPS 地址。

- [ ] **Step 3: 逐图远程校验**

逐个请求图片地址，要求 HTTP 200 且 `Content-Type` 为 `image/png`；图片数、固定链接数和验证通过数必须一致。

- [ ] **Step 4: 最终回归**

再次执行：

```powershell
node tools/verify-mac-rental-membership.cjs
git diff --check
```

预期全部 Smoke Test 通过，Markdown 不含本地图片地址、浮动分支地址或旧提交 SHA。
