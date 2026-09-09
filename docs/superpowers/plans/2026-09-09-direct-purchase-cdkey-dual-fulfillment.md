# 直接购买／CDKEY 双履约 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有 Android 与 Mac 买断游戏／永久 DLC Demo 中加入“直接购买／购买 CDKEY”二选一、CDKEY 查看复制与一键激活、24 状态订单样例和可恢复的订单删除，同时让开发者、运营后台和 PRD 使用同一业务口径。

**Architecture:** 共用订单、支付、退款和拒付状态域，订单创建时锁定 `fulfillmentType=account_entitlement|cdkey`。直接购买分支写入盖世账号永久权益；CDKEY 分支独立维护配码、展示、复制和激活事实。`visibilityStatus` 只控制玩家订单列表，不改写交易、Key、权益或对账事实。

**Tech Stack:** 离线单文件 HTML／CSS／JavaScript、Node.js `node:test`、Playwright Chromium、开发者后台静态构建脚本、Markdown PRD 与本地 PNG 验收证据。

---

## 文件边界与并行所有权

- Android 员工独占：
  - `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html`
  - `tests/buyout-commerce/android-buyout.browser.test.mjs`
- Mac 员工独占：
  - `demos/PC与Mac端/Mac买断游戏与DLC订单支付demo.html`
  - `tests/buyout-commerce/mac-buyout.browser.test.mjs`
- 后台员工独占：
  - `demos/开发者后台一期/src/demo10/app.js`
  - `demos/开发者后台一期/10-销售数据与对账demo.html`（由构建脚本生成）
  - `demos/发行平台运营后台/01-订单支付运营后台demo.html`
  - `tests/buyout-commerce/developer-commerce.browser.test.mjs`
  - `tests/buyout-commerce/operations-commerce.browser.test.mjs`
- 主管独占：
  - `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md`
  - `docs/superpowers/specs/2026-09-09-buyout-game-dlc-order-payment-design.md`
  - `docs/superpowers/specs/2026-09-09-buyout-cdkey-shell-alignment-design.md`
  - `tests/buyout-commerce/spec-consistency.test.mjs`
  - `tests/buyout-commerce/evidence/verification.md`

所有员工都处于同一工作区，不得回退或覆盖其他任务的既有修改；只提交自己的文件。

### Task 1: Android 双履约选择、CDKEY 动作和删除恢复

**Files:**
- Modify: `tests/buyout-commerce/android-buyout.browser.test.mjs`
- Modify: `demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html`

- [ ] **Step 1: 先写双履约与 24 状态失败测试**

在测试中增加统一状态清单，并断言原来的 17 状态实现缺少 7 个 CDKEY 状态：

```js
const expectedStatuses = [
  'pending', 'confirming', 'payment_failed', 'cancelled',
  'fulfilling', 'fulfillment_blocked', 'fulfillment_failed', 'completed',
  'key_allocating', 'key_blocked', 'key_failed', 'key_delivered',
  'key_activating', 'key_activation_failed', 'key_activated',
  'refund_review', 'refunding', 'refund_partial', 'refunded',
  'refund_failed', 'refund_rejected', 'chargeback_open',
  'chargeback_won', 'chargeback_lost',
];

assert.deepEqual(
  [...new Set(await page.locator('[data-order-status]').evaluateAll(nodes => nodes.map(node => node.dataset.orderStatus)))].sort(),
  [...expectedStatuses].sort(),
);
```

同时增加以下可见交互断言：

```js
await page.getByRole('button', { name: '购买 ¥128' }).click();
assert.equal(await page.getByRole('button', { name: /直接购买/ }).getAttribute('aria-pressed'), 'true');
await page.getByRole('button', { name: /购买 CDKEY/ }).click();
assert.match(await page.locator('main').innerText(), /支付后发放.*CDKEY/);
assert.match(await page.locator('main').innerText(), /首次查看或发起激活后/);
```

- [ ] **Step 2: 运行测试确认旧实现失败**

Run:

```powershell
node --test --test-name-pattern="双履约|24 个状态|CDKEY|删除订单" tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: FAIL，至少报告购买方式选项、CDKEY 状态或已删除订单入口缺失。

- [ ] **Step 3: 增加 Android 双履约数据模型**

把确认订单临时选择保存在页面状态，订单创建后写入快照：

```js
const FULFILLMENT_TYPES = Object.freeze({
  DIRECT: 'account_entitlement',
  CDKEY: 'cdkey',
});

state.fulfillmentType = state.fulfillmentType || FULFILLMENT_TYPES.DIRECT;

const order = {
  ...baseOrder,
  fulfillmentType: state.fulfillmentType,
  visibilityStatus: 'visible',
  key: state.fulfillmentType === FULFILLMENT_TYPES.CDKEY ? {
    status: 'unallocated',
    masked: 'GH-****-****-****',
    value: '',
    revealedAt: null,
    copiedAt: null,
    reclaimable: true,
    activationStatus: 'not_started',
    activationAttemptId: null,
  } : null,
};
```

直接购买和 CDKEY 使用独立报价字段；切换后立即刷新金额与退款摘要，订单创建后禁止原单换方式。

- [ ] **Step 4: 实现确认订单二选一**

确认订单页显示两张选择卡，默认直接购买：

```html
<button type="button" class="fulfillment-choice is-active" data-action="select-fulfillment" data-fulfillment="account_entitlement" aria-pressed="true">
  <strong>直接购买</strong><small>支付成功后添加到当前盖世账号，不提供 CDKEY</small>
</button>
<button type="button" class="fulfillment-choice" data-action="select-fulfillment" data-fulfillment="cdkey" aria-pressed="false">
  <strong>购买 CDKEY</strong><small>支付成功后发放 CDKEY，可查看、复制或一键激活</small>
</button>
```

CDKEY 选择态必须展示：“首次查看、复制或发起激活后不再支持无理由退款；无效、重复或与描述不符仍可申请售后。”

- [ ] **Step 5: 实现 CDKEY 配码、查看、复制和一键激活**

测试 API 只注入服务端事实，产品界面只提供合法动作：

```js
function revealKey(order) {
  if (!order?.key || order.key.status !== 'delivered') return false;
  order.key.revealedAt ||= new Date().toISOString();
  order.key.masked = order.key.value;
  order.key.reclaimable = false;
  render();
  return true;
}

function startKeyActivation(order) {
  if (!order?.key || order.key.status !== 'delivered') return false;
  order.key.revealedAt ||= new Date().toISOString();
  order.key.reclaimable = false;
  order.key.activationStatus = 'processing';
  order.key.activationAttemptId ||= `ACT-${order.id}`;
  order.status = 'key_activating';
  render();
  return true;
}
```

“查看 CDKEY”首次点击先展示规则确认；确认后才显示明文。“复制 CDKEY”写入 `copiedAt`。“一键激活”显示目标平台／账号和“无需再次付费”；失败重试复用相同 `activationAttemptId` 与 Key。

- [ ] **Step 6: 实现 24 状态样例和删除恢复**

扩充 `ORDER_STATUS_SEQUENCE`、`ORDER_STATUS_DETAILS` 和样例订单。每行显示“直接购买／CDKEY”标签。

删除资格必须由白名单计算：

```js
const HIDEABLE_STATES = new Set([
  'cancelled', 'completed', 'key_delivered', 'key_activated',
  'refunded', 'refund_failed', 'refund_rejected',
  'chargeback_won', 'chargeback_lost',
]);

function canHideOrder(order) {
  return HIDEABLE_STATES.has(normalizeStatus(order.status))
    && !['review', 'refunding', 'partial'].includes(order.refund?.status)
    && order.chargeback?.status !== 'open'
    && order.key?.activationStatus !== 'processing';
}
```

点击“删除订单”进入二次确认；确认后只写 `visibilityStatus='hidden_by_user'`。订单中心右上角增加“已删除订单”入口，列表提供“恢复订单”。预置一条已删除样例。

- [ ] **Step 7: 验证 Android**

Run:

```powershell
node --test tests/buyout-commerce/android-buyout.browser.test.mjs
```

Expected: Android 全部测试 PASS；320×844 和 390×844 均无横向溢出；产品页面无状态结果模拟控件。

### Task 2: Mac 双履约桌面链路

**Files:**
- Modify: `tests/buyout-commerce/mac-buyout.browser.test.mjs`
- Modify: `demos/PC与Mac端/Mac买断游戏与DLC订单支付demo.html`

- [ ] **Step 1: 写 Mac 24 状态与购买方式失败测试**

把 `expectedStatuses` 改为 Task 1 的完整 24 状态，并补充：

```js
await page.locator('#primaryAction').click();
assert.equal(await page.locator('[data-fulfillment-choice]').count(), 2);
assert.equal(await page.locator('[data-fulfillment-choice="account_entitlement"]').getAttribute('aria-pressed'), 'true');
await page.locator('[data-fulfillment-choice="cdkey"]').click();
assert.match(await page.locator('[data-screen="checkout"]').innerText(), /购买 CDKEY/);
assert.match(await page.locator('[data-screen="checkout"]').innerText(), /查看、复制或一键激活/);
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node --test --test-name-pattern="24 类|购买方式|CDKEY|已删除" tests/buyout-commerce/mac-buyout.browser.test.mjs
```

Expected: FAIL，报告 Mac 仍只有直接购买和 17 状态。

- [ ] **Step 3: 实现桌面确认订单二选一和分支结果**

在 Mac 右侧支付卡中加入两张紧凑选择卡，保留桌面双栏结构：

```js
state.checkout = {
  productId: p.id,
  fulfillmentType: existing?.fulfillmentType || 'account_entitlement',
};
```

直接购买继续进入游戏库；CDKEY 订单进入 Key 详情区，展示掩码、首次查看确认、复制、一键激活和目标账号。不得加入 Android 底部导航或手机弹层样式。

- [ ] **Step 4: 扩充 24 状态和删除恢复**

在 `orders` 中加入 7 条 CDKEY 分支状态样例和一条 `visibilityStatus:'hidden_by_user'` 样例。默认列表过滤隐藏订单；工具栏增加“已删除订单”，恢复后回到默认列表。

每条可见状态仍展示“状态主操作＋查看详情”。CDKEY 状态动作使用：

```js
const cdkeyActionMatrix = {
  key_allocating: ['刷新配码', '查看详情'],
  key_blocked: ['查看库存进度', '查看详情'],
  key_failed: ['重试发放', '查看详情'],
  key_delivered: ['查看 CDKEY', '查看详情'],
  key_activating: ['刷新激活结果', '查看详情'],
  key_activation_failed: ['重试激活', '查看详情'],
  key_activated: ['查看激活结果', '查看详情'],
};
```

- [ ] **Step 5: 验证 Mac**

Run:

```powershell
node --test tests/buyout-commerce/mac-buyout.browser.test.mjs
```

Expected: Mac 全部测试 PASS；1280×800、1440×900 无溢出，所有状态按钮逐一可点击并进入明确页面结果。

### Task 3: 开发者经营与对账按履约类型拆分

**Files:**
- Modify: `tests/buyout-commerce/developer-commerce.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo10/app.js`
- Generate: `demos/开发者后台一期/10-销售数据与对账demo.html`

- [ ] **Step 1: 写履约类型筛选和脱敏失败测试**

```js
assert.equal(await page.locator('[data-filter="fulfillment"]').count(), 1);
assert.match(await page.locator('[data-testid="sales-table"]').innerText(), /直接购买/);
assert.match(await page.locator('[data-testid="sales-table"]').innerText(), /CDKEY/);
await page.locator('[data-filter="fulfillment"]').selectOption('cdkey');
assert.equal(await page.locator('[data-testid="sales-table"] [data-fulfillment="account_entitlement"]').count(), 0);
assert.doesNotMatch(await page.locator('body').innerText(), /[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,}/);
```

- [ ] **Step 2: 增加脱敏数据与筛选**

为经营流水增加：

```js
{
  reconciliationId: 'RCN-202609-K6P4D9',
  orderMask: 'ORD-****-1914',
  fulfillmentType: 'cdkey',
  fulfillmentLabel: 'CDKEY',
  deliveryStatus: '已交付',
  keyBatchMask: 'BATCH-****-09',
  amount: 118,
  status: 'completed',
}
```

筛选选项固定为“全部履约方式／直接购买／CDKEY”。销售、退款拒付、预估收入和对账流水均显示履约类型，但不显示 Key 明文、玩家身份、支付凭证或内部举证。

- [ ] **Step 3: 构建并验证开发者 Demo**

Run:

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/buyout-commerce/developer-commerce.browser.test.mjs
```

Expected: 构建成功，开发者测试全部 PASS，筛选和对账流水仍保持唯一且不可反查玩家。

### Task 4: 运营后台支持双履约事实

**Files:**
- Modify: `tests/buyout-commerce/operations-commerce.browser.test.mjs`
- Modify: `demos/发行平台运营后台/01-订单支付运营后台demo.html`

- [ ] **Step 1: 写运营履约类型与 CDKEY 事实失败测试**

```js
assert.equal(await page.locator('[data-filter="fulfillment"]').count(), 1);
await page.locator('[data-filter="fulfillment"]').selectOption('cdkey');
await page.locator('[data-open-order]').first().click();
const drawer = page.getByTestId('order-drawer');
for (const label of ['购买方式', 'Key 分配', '是否展示', '复制时间', '激活状态', '退款资格']) {
  assert.match(await drawer.innerText(), new RegExp(label));
}
assert.doesNotMatch(await page.locator('[data-testid="order-table"]').innerText(), /[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,}/);
```

- [ ] **Step 2: 增加双履约订单、筛选和异常队列**

运营订单增加 `fulfillmentType`、`keyFingerprint`、`keyBatch`、`keyRevealedAt`、`keyCopiedAt`、`activationStatus`、`keyReclaimable`。订单列表只展示“直接购买／CDKEY”和 Key 指纹；详情按权限展示分配与激活事实，不默认展示明文。

发权异常队列改为同时承载：

```js
const fulfillmentKinds = {
  account_entitlement: '账号权益',
  cdkey: 'CDKEY 配码',
};
```

CDKEY 缺货、配码失败和激活结果未知只能刷新或沿原订单重试；补发不得产生第二枚有效 Key。退款审核必须展示“Key 未展示且可回收”或“已展示，仅质量售后”。

- [ ] **Step 3: 验证运营后台**

Run:

```powershell
node --test tests/buyout-commerce/operations-commerce.browser.test.mjs
```

Expected: 运营测试全部 PASS；支付、Key、权益、退款、拒付和审计事实可追溯，列表和导出不出现 Key 明文。

### Task 5: PRD 与规格一致性

**Files:**
- Modify: `prd/发行平台专项/订单支付PRD/10-买断游戏与DLC订单支付及对账PRD.md`
- Modify: `docs/superpowers/specs/2026-09-09-buyout-game-dlc-order-payment-design.md`
- Modify: `docs/superpowers/specs/2026-09-09-buyout-cdkey-shell-alignment-design.md`
- Modify: `tests/buyout-commerce/spec-consistency.test.mjs`

- [ ] **Step 1: 先写文档一致性失败测试**

```js
for (const token of [
  'account_entitlement', 'cdkey', '直接购买', '购买 CDKEY',
  'key_delivered', 'key_activated', 'hidden_by_user', '24 个',
]) {
  assert.match(prd, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(prd, /首次查看.*不再支持无理由退款/s);
assert.match(prd, /5×24.*120 分钟/s);
```

- [ ] **Step 2: 更新正式 PRD**

把“CDKEY 仅作参考”“履约固定为账号权益”“页面不提供交付方式”的旧结论替换为最新双履约决策。页面级需求必须补齐：确认订单二选一、CDKEY 首次查看确认、一键激活、24 状态矩阵、删除恢复、分支退款规则、开发者和运营后台字段。

- [ ] **Step 3: 清理旧设计冲突**

保留两份旧设计顶部的范围更新说明，并把仍会被自动化或读者误用的旧排除项改成历史说明。所有正式引用指向：

```text
docs/superpowers/specs/2026-09-09-direct-purchase-cdkey-dual-fulfillment-design.md
```

- [ ] **Step 4: 运行规格测试**

Run:

```powershell
node --test tests/buyout-commerce/spec-consistency.test.mjs
```

Expected: 规格测试全部 PASS，不再断言玩家 Demo 禁止出现 CDKEY；改为断言 CDKEY 只出现在 `fulfillmentType=cdkey` 分支。

### Task 6: 全量回归、截图和验收记录

**Files:**
- Regenerate: `tests/buyout-commerce/evidence/android/*.png`
- Regenerate: `tests/buyout-commerce/evidence/mac/*.png`
- Regenerate: `tests/buyout-commerce/evidence/developer/*.png`
- Regenerate: `tests/buyout-commerce/evidence/operations/*.png`
- Modify: `tests/buyout-commerce/evidence/verification.md`

- [ ] **Step 1: 构建并跑完整测试**

Run:

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/buyout-commerce/*.test.mjs
```

Expected: exit code 0；记录本次实际通过数，不沿用此前 54/54。

- [ ] **Step 2: 机械检查 24 状态和敏感 Key**

Run:

```powershell
rg -n "key_allocating|key_blocked|key_failed|key_delivered|key_activating|key_activation_failed|key_activated" demos/APP买断游戏与DLC/盖世游戏APP买断游戏与DLCdemo.html demos/PC与Mac端/Mac买断游戏与DLC订单支付demo.html
rg -n "CDKEY 明文|玩家身份|支付凭证" demos/开发者后台一期/src/demo10/app.js demos/发行平台运营后台/01-订单支付运营后台demo.html
```

Expected: 两个玩家 Demo 均包含 7 个 CDKEY 状态；后台只包含禁止展示明文的说明或掩码，不包含真实格式的 Key 样例。

- [ ] **Step 3: 原尺寸复核截图**

必须覆盖：Android 与 Mac 双履约确认页、CDKEY 已发放、首次查看确认、激活中／失败／成功、24 状态列表顶部与底部、删除确认、已删除列表与恢复；开发者履约筛选；运营 CDKEY 订单详情和退款审核。

- [ ] **Step 4: 更新验收记录**

`verification.md` 记录实际测试总数、各端截图数量、原尺寸复核结论、24 状态覆盖、所有可删除终态的删除恢复结果，以及“第三方支付与外部平台激活接口仍为契约级 Demo”的限制。

## 完成门槛

只有以下条件同时满足才完成：Android 和 Mac 均能选择两种购买方式；CDKEY 到货后能查看、复制和一键激活；24 状态都有样例和有效操作；删除／恢复不改变交易事实；两类退款规则不会混用；开发者和运营数据按履约类型拆分且不泄露 Key；完整测试退出码为 0；新截图完成原尺寸复核；02 游戏创建未被修改。

