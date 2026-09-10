# Developer Finance Settlement Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善 `15-开发者财务结算demo.html`，以真实可核对的数据覆盖财务主体、对账、差异、发票和付款，并通过右下角悬浮球在默认穷举态与缺省态间切换。

**Architecture:** 保留现有单文件 HTML 交付方式和 `demo15/app.js + styles.css` 源结构，不改其他 Demo。将页面硬编码金额改为由最小货币单位整数账本派生的场景数据；页面、抽屉、分页、导出和测试统一读取当前场景数据集。平台财务后台另立计划，本轮只交付开发者端。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js 构建脚本、`node:test`、Playwright Core、Chrome/Edge。

---

## 文件范围

- Modify: `demos/开发者后台一期/src/demo15/app.js` — 场景数据、资金模型、三页渲染和完整交互。
- Modify: `demos/开发者后台一期/src/demo15/styles.css` — 悬浮球、缺省态、抽屉焦点和响应式样式。
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html` — 由构建脚本生成的单文件交付物。
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs` — 数据、场景、流程、键盘和响应式验收。
- Modify: `demos/开发者后台一期/README.md` — 路由、场景和状态口径。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/scenario-exhaustive-1440x900.png` — 默认穷举态证据。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/scenario-empty-1440x900.png` — 缺省态证据。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/reconciliation-sources-1440x900.png` — 三本账来源证据。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/payment-attempts-1440x900.png` — 付款尝试证据。

不修改 `02-CDKEY商品与供给demo.html`、`09-发行审核后台demo.html`、PRD 和平台财务后台文件。

### Task 1: 重建可核对的资金数据契约

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入失败的数据契约测试**

在测试文件增加：

```js
test('穷举数据使用整数金额并由流水还原账单', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(model.scenario, 'exhaustive');
    assert.equal(model.moneyStorage, 'minor-unit-integer');
    assert.deepEqual(model.ledgerSources.sort(), ['direct_sale','external_key','gamehub_key']);
    assert.equal(model.statementIdsUnique, true);
    assert.equal(model.statementTotalsConsistent, true);
    assert.equal(model.flowTotalsConsistent, true);
    assert.equal(model.noCrossLedgerMixing, true);
    assert.equal(model.generatedAfterPeriodEnd, true);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: FAIL，`snapshot()` 尚未返回 `scenario`、`moneyStorage`、`ledgerSources`、`noCrossLedgerMixing` 或 `generatedAfterPeriodEnd`。

- [ ] **Step 3: 在 app.js 定义整数金额工具和账本来源**

用以下工具替换直接使用小数金额的 `money()`：

```js
const CURRENCY_DIGITS = Object.freeze({ USD:2, EUR:2, CNY:2, HKD:2, JPY:0 });

function minor(text, currency) {
  const digits = CURRENCY_DIGITS[currency] ?? 2;
  const normalized = String(text).trim();
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const padded = (fraction + '0'.repeat(digits)).slice(0, digits);
  const value = Number(whole || '0') * (10 ** digits) + Number(padded || '0');
  return negative ? -value : value;
}

function money(valueMinor, currency) {
  const digits = CURRENCY_DIGITS[currency] ?? 2;
  return currency + ' ' + (valueMinor / (10 ** digits)).toLocaleString('zh-CN', {
    minimumFractionDigits:digits,
    maximumFractionDigits:digits,
  });
}

function allocateMinor(totalMinor, basisPoints) {
  return Math.round(totalMinor * basisPoints / 10000);
}
```

所有金额字段以 `Minor` 结尾，例如 `settlementMinor`、`originalMinor`、`feeMinor`；汇率使用字符串快照 `fxRateText`，换算结果直接保存为 `convertedMinor`，不在页面展示阶段重新计算。

每条流水增加固定字段：

```js
{
  ledgerSource:'direct_sale', // direct_sale | external_key | gamehub_key
  counterpartyType:'developer',
  fulfillmentType:'account_entitlement', // account_entitlement | external_key | gamehub_key
  ruleModel:'revenue_share', // revenue_share | fixed_purchase | channel_share
  ruleVersion:'RULE-2026-02',
  fxVersion:'FX-2026-08',
}
```

账单构成只从关联流水汇总生成；平台直销、外部 Key 和盖世 Key 各自生成流水，不跨来源冲抵。账单生成时间固定在账期结束后的次月 1—10 日。

- [ ] **Step 4: 扩展 snapshot 数据断言**

在 `window.__developerFinanceDemo.snapshot()` 返回：

```js
{
  scenario:state.demoScenario,
  moneyStorage:'minor-unit-integer',
  ledgerSources:[...new Set(activeFlows().map(item => item.ledgerSource))],
  noCrossLedgerMixing:activeStatements().every(statement =>
    Object.entries(statement.sourceTotalsMinor).every(([source, totalMinor]) =>
      activeFlows()
        .filter(flow => flow.statementId === statement.id && flow.ledgerSource === source)
        .reduce((sum, flow) => sum + flow.settlementMinor, 0) === totalMinor
    )
  ),
  generatedAfterPeriodEnd:activeStatements().every(statement =>
    statement.generated.slice(0, 7) > statement.period
  ),
}
```

- [ ] **Step 5: 构建并运行测试**

Run:

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: 构建输出包含 `Built 15-开发者财务结算demo.html.`，测试全部 PASS。

- [ ] **Step 6: 提交数据契约**

```powershell
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "fix: make settlement demo ledger auditable"
```

### Task 2: 增加默认穷举态与缺省态悬浮球

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入失败的场景切换测试**

```js
test('悬浮球默认穷举态并可往返切换缺省态', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    assert.equal(await page.locator('[data-testid="scenario-orb"]').getAttribute('aria-expanded'), 'false');
    assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).scenario, 'exhaustive');
    assert.equal(await page.locator('tbody tr').count(), 20);

    await page.locator('[data-testid="scenario-orb"]').click();
    await page.getByRole('menuitemradio', { name:/缺省态/ }).click();
    assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).scenario, 'empty');
    assert.match(await page.locator('main').innerText(), /暂无对账单/);
    assert.equal(await locationHash(page), '#/reconciliation');

    await page.locator('[data-testid="scenario-orb"]').click();
    await page.getByRole('menuitemradio', { name:/穷举态/ }).click();
    assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).scenario, 'exhaustive');
    assert.equal(await page.locator('tbody tr').count(), 20);
  } finally {
    await page.close();
  }
});

async function locationHash(page) {
  return page.evaluate(() => location.hash);
}
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs`

Expected: FAIL，页面不存在 `scenario-orb`。

- [ ] **Step 3: 增加隔离的场景数据集**

在状态中增加：

```js
demoScenario:'exhaustive',
scenarioMenuOpen:false,
```

增加当前数据访问函数，页面禁止再直接读取全局数组：

```js
function activeStatements() { return state.demoScenario === 'empty' ? [] : statements; }
function activeFlows() { return state.demoScenario === 'empty' ? [] : flows; }
function activePayments() { return state.demoScenario === 'empty' ? [] : payments; }
function activeEntity() {
  if (state.demoScenario === 'empty') return { ...clone(entitySeed), status:'unconfigured', effectiveVersion:'' };
  return state.entity;
}
```

切换场景时保留 `state.route`，关闭抽屉和弹窗，清空筛选，分页回到 1；不得向 localStorage、IndexedDB 或公共运行时写入数据。

- [ ] **Step 4: 渲染悬浮球和两个选项**

```js
function scenarioSwitcher() {
  const expanded = state.scenarioMenuOpen ? 'true' : 'false';
  return '<div class="d15-scenario-switcher">' +
    (state.scenarioMenuOpen ? '<div class="d15-scenario-menu" role="menu" aria-label="Demo 场景">' +
      scenarioOption('exhaustive','穷举态','展示完整状态') +
      scenarioOption('empty','缺省态','模拟首次进入') +
    '</div>' : '') +
    '<button type="button" class="d15-scenario-orb" data-testid="scenario-orb" data-action="toggle-scenario-menu" aria-expanded="' + expanded + '" aria-label="切换 Demo 场景">场景</button>' +
  '</div>';
}

function scenarioOption(value, label, hint) {
  const checked = state.demoScenario === value;
  return '<button type="button" role="menuitemradio" aria-checked="' + checked + '" data-action="set-demo-scenario" data-scenario="' + value + '"><strong>' + label + '</strong><small>' + hint + '</small></button>';
}
```

把 `scenarioSwitcher()` 放在根应用末尾、抽屉和 Toast 之前。增加 `toggle-scenario-menu`、`set-demo-scenario` 点击处理。

- [ ] **Step 5: 增加悬浮与响应式样式**

```css
.d15-scenario-switcher { position:fixed; right:24px; bottom:24px; z-index:70; }
.d15-scenario-orb { width:52px; height:52px; border:0; border-radius:50%; background:#111827; color:#fff; box-shadow:0 10px 28px rgba(15,23,42,.22); cursor:pointer; }
.d15-scenario-menu { position:absolute; right:0; bottom:62px; width:220px; padding:8px; border:1px solid var(--line); border-radius:14px; background:#fff; box-shadow:0 16px 40px rgba(15,23,42,.18); }
.d15-scenario-menu button { width:100%; display:grid; gap:3px; padding:10px 12px; border:0; border-radius:10px; background:transparent; text-align:left; }
.d15-scenario-menu button[aria-checked="true"] { background:#fff8dc; color:#7a5200; }
.d15-scenario-menu small { color:var(--muted); }
@media (max-width:640px) { .d15-scenario-switcher { right:16px; bottom:16px; } }
```

- [ ] **Step 6: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "feat: add settlement demo scenario switcher"
```

Expected: 全部测试 PASS，首次打开为穷举态，切换缺省态后三个一级页面均为空数据。

### Task 3: 完善财务主体状态、字段联动和权限门禁

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入失败的主体规则测试**

```js
test('财务主体按收款地区校验且暂停付款不影响历史核账', async () => {
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.getByRole('button', { name:'申请变更', exact:true }).click();
    assert.match(await page.getByLabel('结算币种').locator('..').innerText(), /联系商务更新合同/);
    assert.equal(await page.getByLabel('结算币种').isEditable(), false);

    await page.getByLabel('财务邮箱').fill('bad-mail');
    await page.getByRole('button', { name:'提交审核', exact:true }).click();
    assert.match(await page.locator('[data-testid="entity-error"]').innerText(), /邮箱/);

    await page.evaluate(() => window.__developerFinanceDemo.setEntityScenario('suspended'));
    await page.locator('[data-route="reconciliation"]').click();
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('button', { name:'确认账单', exact:true }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name:'提交差异', exact:true }).isDisabled(), false);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Expected: FAIL，当前结算币种不是表单控件，且 `suspended` 会错误禁用确认和差异。

- [ ] **Step 3: 分离核账权限和付款权限**

替换单一 `financeActionsAllowed()`：

```js
function canReconcile() {
  return Boolean(state.entity.effectiveVersion);
}

function canPay() {
  return Boolean(state.entity.effectiveVersion) && !['change_reviewing','supplement','suspended'].includes(state.entity.status);
}
```

账单确认和差异使用 `canReconcile()`；付款状态和付款提示使用 `canPay()`。首次配置未生效时只展示预估数据，不允许确认正式账单。

- [ ] **Step 4: 增加只读结算币种和字段联动**

将结算币种渲染为只读输入，便于无障碍定位：

```js
function readonlyInput(label, value, hint) {
  return '<div class="gh-field"><label for="d15-settlementCurrency">' + esc(label) + '</label><input id="d15-settlementCurrency" class="gh-input" value="' + esc(value) + '" readonly><small>' + esc(hint) + '</small></div>';
}
```

验证规则：

```js
function needsSwift(draft) {
  return !(draft.bankRegion === '中国大陆' && draft.settlementCurrency === 'CNY');
}

function validateEntity(draft) {
  const required = ['contactName','contactEmail','bankRegion','accountName','bankName','accountNumber','bankProof','taxRegion','taxNo','taxProof'];
  if (needsSwift(draft)) required.push('swift');
  if (!required.every(key => String(draft[key] || '').trim())) return '请补全必填资料。';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail)) return '请填写有效财务邮箱。';
  if (needsSwift(draft) && !/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(draft.swift.replace(/\s/g,''))) return '请填写有效 SWIFT / BIC。';
  return '';
}
```

企业名称、注册信息和结算币种保持只读；账户、税务和附件随提交形成不可变申请快照。

- [ ] **Step 5: 扩充主体变更历史状态**

穷举态历史表至少包含：`审核中`、`需补充`、`已拒绝`、`已撤销`、`已生效`、`已停用`。当前申请与历史版本分开展示，查看历史不得读取当前主体补齐旧值。

- [ ] **Step 6: 构建、测试并提交**

Run:

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: PASS；资料变更只暂停付款，不影响历史账单核对。

```powershell
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "fix: separate reconciliation and payout gates"
```

### Task 4: 完善对账、差异和发票闭环

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入失败的三本账和差异类型测试**

```js
test('对账支持三本账来源和不同差异输入模型', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    await page.getByRole('button', { name:'对账流水', exact:true }).click();
    for (const source of ['平台直销','外部 Key 采购','盖世 Key 渠道']) {
      assert.match(await page.locator('main').innerText(), new RegExp(source));
    }

    await page.getByRole('button', { name:'对账单', exact:true }).click();
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.getByRole('button', { name:'提交差异', exact:true }).click();
    await page.getByLabel('差异类型').selectOption('missing_transaction');
    assert.equal(await page.getByLabel('开发者侧订单号').isVisible(), true);
    assert.equal(await page.getByLabel('对账流水号').count(), 0);
    await page.getByLabel('差异类型').selectOption('key_quantity');
    assert.equal(await page.getByLabel('Key 批次').isVisible(), true);
    assert.equal(await page.getByLabel('期望数量').isVisible(), true);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Expected: FAIL，当前流水没有来源列，差异表单强制绑定一条流水。

- [ ] **Step 3: 增加业务来源筛选和快照展示**

对账流水筛选新增：

```js
[['all','全部来源'],['direct_sale','平台直销'],['external_key','外部 Key 采购'],['gamehub_key','盖世 Key 渠道']]
```

流水表增加“业务来源／履约方式”；账单详情按来源分组显示小计。导出增加 `业务来源`、`履约方式`、`交易原币`、`汇率版本`、`规则版本` 和 `结算对手方`。

- [ ] **Step 4: 按差异类型渲染输入模型**

定义：

```js
const DISPUTE_TYPES = Object.freeze({
  existing_flow:'已有流水差异',
  missing_transaction:'交易遗漏',
  key_quantity:'Key 数量',
  fee_tax_fx:'费用、税费或汇率',
});
```

- `existing_flow`：一条或多条流水、平台金额只读、期望金额、说明、附件。
- `missing_transaction`：开发者侧订单号／业务参考号、期望金额、说明、附件。
- `key_quantity`：Key 批次、渠道、平台数量只读、期望数量、说明、附件。
- `fee_tax_fx`：流水或账单项、平台金额只读、期望金额、说明、附件。

提交后保存完整快照和时间线；补充资料追加记录，不覆盖原提交。

- [ ] **Step 5: 穷举账单、差异和发票状态**

穷举数据必须包含：

```js
statementStatuses:['draft','pending','disputed','confirmed','locked','voided'];
disputeStatuses:['processing','supplement','accepted','rejected','cancelled'];
invoiceStatuses:['not_required','pending','reviewing','approved','rejected'];
```

账单详情只在 `requiresInvoice === true` 时展示发票模块；发票保存发票号、日期、整数金额、币种、附件和审核状态。

- [ ] **Step 6: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "feat: complete developer reconciliation workflow"
```

Expected: PASS，账单、流水、差异和发票均可从穷举态进入并回溯。

### Task 5: 用付款单与付款尝试还原付款过程

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入失败的付款尝试测试**

```js
test('付款单使用尝试时间线且仅真实汇出后提供凭证', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/payments'), { waitUntil:'load' });
    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(model.paymentOrdersUnique, true);
    assert.equal(model.paymentAttemptsLinked, true);
    assert.equal(model.paymentAmountsConsistent, true);
    assert.equal(model.paymentTimelineValid, true);

    await page.locator('[data-payment-id="PAY-202605-001"]').getByRole('button', { name:'查看', exact:true }).click();
    const returned = page.getByRole('dialog', { name:'付款详情' });
    assert.match(await returned.innerText(), /退回原因/);
    assert.doesNotMatch(await returned.innerText(), /下载付款凭证/);
    assert.match(await returned.innerText(), /下一次付款尝试/);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Expected: FAIL，当前付款记录没有独立 `PayoutAttempt`，且退回状态错误开放凭证。

- [ ] **Step 3: 重构付款数据结构**

```js
{
  id:'PAY-202605-001',
  statementId:'STMT-2026-03-V1',
  amountMinor:1128472,
  currency:'USD',
  remainingMinor:0,
  status:'returned',
  accountVersion:'FIN-2026-002',
  attempts:[
    { id:'ATT-202605-001-01', createdAt:'2026-05-20 09:00', status:'remitted', amountMinor:1128472, providerRef:'BANK-REF-****-8246', proofAvailable:true },
    { id:'ATT-202605-001-02', createdAt:'2026-05-24 16:20', status:'returned', amountMinor:1128472, reason:'收款行退回款项', proofAvailable:false },
  ],
}
```

付款单金额等于关联账单待付余额；如部分付款，显示本次金额和剩余金额。付款凭证仅在当前尝试 `status` 为 `remitted` 或 `completed` 且 `proofAvailable === true` 时展示。

- [ ] **Step 4: 完整展示十类付款状态**

默认穷举态保持：`待具备条件、待付款、处理中、已汇出、已完成、失败、退回、暂缓、已结转、已取消`。失败、退回和暂缓详情展示原因、开发者是否需处理、预计重试时间及下一付款尝试；不提供提现、发起付款或标记到账按钮。

- [ ] **Step 5: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "fix: model payout attempts and proof access"
```

Expected: PASS，同一付款单的失败、退回和重试能够沿时间线回溯。

### Task 6: 补齐键盘操作、导出和异常状态

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入失败的键盘与导出测试**

```js
test('抽屉锁定焦点并导出完整安全字段', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 }, acceptDownloads:true });
  try {
    await page.goto(url('/reconciliation'), { waitUntil:'load' });
    const opener = page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true });
    await opener.focus();
    await opener.click();
    assert.equal(await page.locator('main').getAttribute('inert'), '');
    await page.keyboard.press('Escape');
    assert.equal(await opener.evaluate(node => node === document.activeElement), true);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name:'导出', exact:true }).click();
    const download = await downloadPromise;
    const body = fs.readFileSync(await download.path(), 'utf8');
    for (const header of ['业务来源','履约方式','交易原币','汇率版本','规则版本','结算对手方']) {
      assert.match(body, new RegExp(header));
    }
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Expected: FAIL，当前背景没有 `inert`，关闭后不恢复焦点，部分导出缺少账本来源字段。

- [ ] **Step 3: 实现统一覆盖层焦点管理**

```js
let lastOverlayFocusKey = '';

function rememberOverlayTrigger(node) {
  lastOverlayFocusKey = node.dataset.focusKey || '';
}

function syncOverlayA11y() {
  const overlay = app.querySelector('[role="dialog"]');
  const backgrounds = app.querySelectorAll('.gh-topbar, .gh-layout');
  if (overlay) {
    backgrounds.forEach(node => node.setAttribute('inert',''));
    (overlay.querySelector('button, input, select, textarea, [tabindex="0"]') || overlay).focus();
  } else {
    backgrounds.forEach(node => node.removeAttribute('inert'));
    if (lastOverlayFocusKey) app.querySelector('[data-focus-key="' + lastOverlayFocusKey + '"]')?.focus();
    lastOverlayFocusKey = '';
  }
}
```

账单、付款和历史记录的“查看”按钮分别输出稳定的 `data-focus-key`，例如 `statement-STMT-2026-08-V1`。打开抽屉或确认框前调用 `rememberOverlayTrigger(actionNode)`；每次 `render()` 后调用 `syncOverlayA11y()`。覆盖层内拦截 Tab，使焦点在首尾可操作控件之间循环；Esc 关闭最上层覆盖层。

- [ ] **Step 4: 完善导出安全与字段**

继续使用已有 `csvCell()` 的公式注入防护；所有导出使用当前场景、筛选和分页之前的完整结果集。金额导出为可核对十进制字符串，不导出整数最小单位，不包含完整银行账号、玩家身份或 Key 明文。

- [ ] **Step 5: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "fix: harden settlement demo interactions"
```

Expected: PASS，抽屉、弹窗、导出和异常态均可完整操作。

### Task 7: 完成视觉证据、说明和总体验收

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/README.md`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/scenario-exhaustive-1440x900.png`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/scenario-empty-1440x900.png`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/reconciliation-sources-1440x900.png`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/payment-attempts-1440x900.png`

- [ ] **Step 1: 更新自动截图**

在测试中分别截图：默认穷举态财务主体、缺省态财务主体、三本账流水、付款尝试详情；保留现有 1440×900 和 390×844 响应式截图。

- [ ] **Step 2: 更新 README 契约**

将 Demo 15 说明改为：

```markdown
- 财务主体、财务对账、付款记录为三个一级页面。
- 默认穷举态覆盖主体、账单、差异、发票和付款主要状态；右下角“场景”悬浮球可切换缺省态。
- 缺省态模拟新主体首次进入，不产生账单、流水、差异、发票或付款数据。
- 平台直销、外部 Key 采购和盖世 Key 渠道使用独立账本；页面和导出保留来源字段。
- 开发者确认账单后进入已确认，平台锁单与付款不属于开发者操作。
```

- [ ] **Step 3: 运行完整验收**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs
node --test tests/developer-backend/next-demos.test.mjs
node --test tests/developer-backend/next-demos.browser.test.mjs
```

Expected: 全部 PASS；三个路由在 390px 无根节点横向溢出；默认穷举态各列表每页 20 条；缺省态无假数据残留。

- [ ] **Step 4: 人工视觉复核**

逐张检查四张新证据图：

- 悬浮球不遮挡分页、抽屉底部操作和返回顶部入口。
- 页面只保留主标题，没有蓝色眉题和重复副标题。
- 缺省态每页只给当前任务所需说明，不增加无关提示。
- 付款失败、退回和差异待补充均有明确下一步。

- [ ] **Step 5: 提交最终证据与说明**

```powershell
git add -- demos/开发者后台一期/README.md tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/evidence/developer-finance-settlement/scenario-exhaustive-1440x900.png tests/developer-backend/evidence/developer-finance-settlement/scenario-empty-1440x900.png tests/developer-backend/evidence/developer-finance-settlement/reconciliation-sources-1440x900.png tests/developer-backend/evidence/developer-finance-settlement/payment-attempts-1440x900.png
git commit -m "test: verify settlement demo scenarios"
```

## 计划自检

- 设计覆盖：财务主体、三本账、账单、差异、发票、付款、场景切换、权限、金额、导出、响应式和无障碍均有对应任务。
- 范围隔离：本计划只交付开发者结算 Demo；平台财务后台不在本轮修改。
- 类型一致：所有金额字段以 `Minor` 结尾，页面统一通过 `money(valueMinor, currency)` 展示。
- 场景一致：`exhaustive` 为默认值，`empty` 不修改业务数据，切换后保留一级路由并重置分页。
- 状态一致：开发者确认、平台锁单、发票和付款分别维护；付款失败或退回通过付款尝试追加，不回写历史终态。
