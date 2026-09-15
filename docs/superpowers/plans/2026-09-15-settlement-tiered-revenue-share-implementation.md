# Settlement Tiered Revenue Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让开发者端与运营端基于同一结算快照展示合并后的游戏及 DLC 销售、CDKEY、退款与拒付，并支持按开发者、游戏和账单月配置可复算的阶梯平台分成。

**Architecture:** 以 `src/finance-statements/model.js` 作为两端唯一的结算事实源，先生成不可变结算项与阶梯快照，再由开发者端按游戏查看、由运营端按主体汇总或按游戏下钻。两份单文件 HTML 继续由现有构建脚本生成，不修改 Demo 01，也不引入线上打款、发票或付款状态。

**Tech Stack:** 原生 JavaScript、HTML/CSS、Node.js `node:test`、Playwright Core、现有单文件 HTML 构建脚本。

---

## File map

- `demos/开发者后台一期/src/finance-statements/model.js`：共享结算项、金额公式、阶梯规则、账单快照和主体汇总。
- `demos/开发者后台一期/src/demo15/app.js`：开发者端财务主体缺省态、结算表和两类明细抽屉。
- `demos/开发者后台一期/src/demo15/styles.css`：开发者端缺省态、宽表、抽屉和阶梯明细样式。
- `demos/开发者后台一期/src/demo16/model.js`：运营端筛选、分页、主体汇总和导出适配。
- `demos/开发者后台一期/src/demo16/app.js`：运营端主体汇总、游戏明细、阶梯配置和详情抽屉。
- `demos/开发者后台一期/src/demo16/styles.css`：运营端宽表、固定列、阶梯编辑器和抽屉样式。
- `tests/developer-backend/finance-statements-model.test.mjs`：共享公式、分段累进、快照和边界测试。
- `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`：开发者端页面与交互测试。
- `tests/developer-backend/operations-finance-settlement.browser.test.mjs`：运营端页面、配置、导出与交互测试。
- `demos/开发者后台一期/开发者平台财务整合demo.html`：开发者端构建产物。
- `demos/开发者后台一期/发行平台运营后台财务整合demo.html`：运营端构建产物。

### Task 1: 锁定共享结算模型的失败测试

**Files:**
- Modify: `tests/developer-backend/finance-statements-model.test.mjs`

- [ ] **Step 1: 将结算项预期收敛为三类**

```js
assert.deepEqual(
  [...new Set(rows.map(row => row.itemType))].sort(),
  ['cdkey_sales_share','game_sales_share','refund_chargeback_adjustment'],
);
assert.equal(rows.some(row => row.itemType === 'dlc_sales_share'), false);
```

- [ ] **Step 2: 增加游戏本体与 DLC 明细加总测试**

```js
const gameSales = rows.find(row => row.itemType === 'game_sales_share');
assert.deepEqual([...new Set(gameSales.gameSalesDetails.map(item => item.productType))].sort(), ['DLC','游戏本体']);
assert.equal(gameSales.gameSalesDetails.reduce((sum,item) => sum + item.userPaidMinor, 0), gameSales.userPaidMinor);
assert.equal(gameSales.gameSalesDetails.reduce((sum,item) => sum + item.platformShareMinor, 0), gameSales.platformShareMinor);
```

- [ ] **Step 3: 增加金额公式和综合税率测试**

```js
assert.equal(row.platformReceivedMinor, row.userPaidMinor - row.paymentFeeMinor - row.taxMinor - row.refundChargebackMinor);
assert.equal(row.payableMinor, row.platformReceivedMinor - row.platformShareMinor);
assert.equal(row.weightedTaxRate, row.taxableMinor ? row.taxMinor / row.taxableMinor : null);
assert.equal(Object.is(row.payableMinor, -0), false);
```

- [ ] **Step 4: 增加阶梯分段累进、规则校验和锁定快照测试**

```js
const rule = model.saveTierRule(state, {
  developerId:'DEV-1001', gameId:'GAME-48291', effectiveBillingMonth:'2026-09', reason:'合同续签',
  tiers:[
    { fromMinor:0, toMinor:100000000, platformRate:30 },
    { fromMinor:100000000, toMinor:500000000, platformRate:25 },
    { fromMinor:500000000, toMinor:null, platformRate:20 },
  ],
});
assert.equal(model.calculateTieredPlatformShare(600000000, rule.tiers).platformShareMinor, 150000000);
assert.throws(() => model.saveTierRule(state, {
  developerId:'DEV-1001', gameId:'GAME-48291', effectiveBillingMonth:'2026-10', reason:'断档',
  tiers:[{ fromMinor:0, toMinor:100000000, platformRate:30 },{ fromMinor:120000000, toMinor:null, platformRate:25 }],
}), /连续/);
```

- [ ] **Step 5: 运行测试并确认当前实现失败**

Run: `node --test tests/developer-backend/finance-statements-model.test.mjs`

Expected: FAIL，至少包含缺少 `saveTierRule`、仍存在 `dlc_sales_share` 或缺少快照字段。

### Task 2: 实现共享三类结算项与阶梯快照

**Files:**
- Modify: `demos/开发者后台一期/src/finance-statements/model.js`
- Test: `tests/developer-backend/finance-statements-model.test.mjs`

- [ ] **Step 1: 定义三类结算项、金额字段与阶梯规则结构**

```js
const ITEM_ORDER = Object.freeze({
  game_sales_share:0,
  cdkey_sales_share:1,
  refund_chargeback_adjustment:2,
});
const DEFAULT_TIERS = Object.freeze([
  Object.freeze({ fromMinor:0, toMinor:100000000, platformRate:30 }),
  Object.freeze({ fromMinor:100000000, toMinor:500000000, platformRate:25 }),
  Object.freeze({ fromMinor:500000000, toMinor:null, platformRate:20 }),
]);
```

- [ ] **Step 2: 实现阶梯校验与分段累进计算**

```js
const calculateTieredPlatformShare = (netMinor, tiers) => {
  const basisMinor = Math.max(0, roundMinor(netMinor));
  let platformShareMinor = 0;
  const tierSnapshots = tiers.map(tier => {
    const upper = tier.toMinor == null ? basisMinor : Math.min(basisMinor, tier.toMinor);
    const chargeableMinor = Math.max(0, upper - tier.fromMinor);
    const shareMinor = roundMinor(chargeableMinor * tier.platformRate / 100);
    platformShareMinor += shareMinor;
    return { ...tier, chargeableMinor, shareMinor };
  });
  return { basisMinor, platformShareMinor, tierSnapshots };
};
```

- [ ] **Step 3: 合并本体与 DLC 并保存可复算快照**

```js
const statement = {
  itemType:'game_sales_share',
  itemLabel:'游戏销售分成',
  gameSalesDetails,
  userPaidMinor,
  paymentFeeMinor,
  taxMinor,
  taxableMinor,
  refundChargebackMinor,
  platformReceivedMinor,
  platformShareMinor:tierResult.platformShareMinor,
  platformShareRate:tierResult.basisMinor ? tierResult.platformShareMinor / tierResult.basisMinor * 100 : null,
  payableMinor:platformReceivedMinor - tierResult.platformShareMinor,
  tierRuleVersion:rule.id,
  tierSnapshots:tierResult.tierSnapshots,
  lockedFxRate,
};
```

- [ ] **Step 4: 固定 CDKEY 与退款规则**

```js
if (itemType === 'cdkey_sales_share') {
  statement.platformShareMinor = 0;
  statement.platformShareRate = 0;
  statement.payableMinor = statement.platformReceivedMinor;
}
if (itemType === 'refund_chargeback_adjustment') {
  statement.platformShareMinor = 0;
  statement.platformShareRate = null;
}
```

- [ ] **Step 5: 导出共享查询、规则保存与主体汇总接口**

```js
return Object.freeze({
  createState, statementsFor, confirmStatements, nextMonth,
  calculateTieredPlatformShare, tierRuleFor, saveTierRule,
  entitySummariesFor, exportStatementsCsv, exportEntitySummariesCsv,
  financialEntity, financialEntityApplications, submitFinancialEntity, reviewFinancialEntity,
});
```

- [ ] **Step 6: 运行共享模型测试**

Run: `node --test tests/developer-backend/finance-statements-model.test.mjs`

Expected: PASS，三类结算项、公式、阶梯、快照、主体版本和 CSV 注入防护全部通过。

- [ ] **Step 7: 精确提交共享模型**

```powershell
git add -- "demos/开发者后台一期/src/finance-statements/model.js" "tests/developer-backend/finance-statements-model.test.mjs"
git commit -m "feat: add tiered settlement snapshots"
```

### Task 3: 完成开发者端财务展示

**Files:**
- Modify: `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`

- [ ] **Step 1: 先增加开发者端失败测试**

```js
assert.deepEqual(await page.locator('[data-testid="settlement-table"] thead th').allTextContents(), [
  '', '游戏 ID', '游戏名称', '账单月份', '结算月份', '结算项', '用户实付',
  '平台实收', '平台分成比例', '平台分成', '应结算金额（CNY）', '状态', '操作',
]);
assert.equal(await page.getByText('DLC 销售分成',{ exact:true }).count(), 0);
```

- [ ] **Step 2: 实现企业认证申请中缺省态**

```js
if (state.enterpriseCertificationStatus !== 'approved') {
  return emptyState('暂不可管理财务主体', '开发者企业认证通过后，方可管理财务主体。');
}
```

- [ ] **Step 3: 更新结算表和操作入口**

```js
const canViewDetail = ['game_sales_share','cdkey_sales_share'].includes(row.itemType);
const action = canViewDetail
  ? button('查看详情', row.itemType === 'game_sales_share' ? 'view-game-sales' : 'view-cdkey', 'link', `data-statement-id="${esc(row.id)}"`)
  : '';
```

- [ ] **Step 4: 增加游戏销售分成抽屉**

```js
<table data-testid="game-sales-detail-table">
  <thead><tr><th>商品类型</th><th>商品名称</th><th>用户实付</th><th>支付费</th><th>税费</th><th>退款与拒付</th><th>平台实收</th><th>适用档位</th><th>平台分成比例</th><th>平台分成</th><th>结算金额</th></tr></thead>
</table>
```

- [ ] **Step 5: 在抽屉展示规则版本、生效账单月和各档金额**

```js
const tierText = row.tierSnapshots.map(tier =>
  `${money(tier.chargeableMinor)} × ${tier.platformRate}% = ${money(tier.shareMinor)}`
).join('；');
```

- [ ] **Step 6: 运行开发者端浏览器测试**

Run: `node --test tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`

Expected: PASS，包含每页 20 条、筛选、确认、缺省态、附件预览、两类详情和 390px 无页面溢出。

- [ ] **Step 7: 精确提交开发者端源码**

```powershell
git add -- "demos/开发者后台一期/src/demo15/app.js" "demos/开发者后台一期/src/demo15/styles.css" "tests/developer-backend/developer-platform-finance-integration.browser.test.mjs"
git commit -m "feat: align developer settlement details"
```

### Task 4: 完成运营端主体汇总、游戏明细与阶梯配置

**Files:**
- Modify: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo16/model.js`
- Modify: `demos/开发者后台一期/src/demo16/app.js`
- Modify: `demos/开发者后台一期/src/demo16/styles.css`

- [ ] **Step 1: 先增加主体汇总与游戏明细失败测试**

```js
assert.deepEqual(await page.locator('[data-testid="entity-summary-table"] thead th').allTextContents(), [
  '', '账单月份', '开发者', '财务主体', '主体版本', '账户版本', '游戏及 DLC 销售金额',
  'CDKEY 销售金额', '用户实付', '平台实收', '支付费', '综合税率／税费', '退款与拒付',
  '平台分成比例', '平台分成', '应结算金额（CNY）', '应结算金额（USD）', '银行账户名', '银行账号', '开户行',
]);
```

- [ ] **Step 2: 改为从共享结算快照生成运营数据**

```js
const entityRows = state => state.scenario === 'empty'
  ? []
  : statements.entitySummariesFor(state.statementState, state.filters.entity);
const gameRows = state => state.scenario === 'empty'
  ? []
  : statements.statementsFor(state.statementState, state.filters.game);
```

- [ ] **Step 3: 实现主体汇总宽表与固定列**

```css
.fo-table-scroll { overflow-x:auto; }
.fo-entity-table th:nth-child(-n+4),
.fo-entity-table td:nth-child(-n+4) { position:sticky; z-index:2; background:#fff; }
.fo-entity-table th:nth-child(2), .fo-entity-table td:nth-child(2) { left:44px; }
.fo-entity-table th:nth-child(3), .fo-entity-table td:nth-child(3) { left:146px; }
```

- [ ] **Step 4: 实现游戏明细新字段与两类详情**

```js
const columns = [
  row.userPaidMinor, row.platformReceivedMinor, row.platformShareRate,
  row.platformShareMinor, row.payableMinor,
];
const action = row.itemType === 'game_sales_share' ? 'view-game-sales'
  : row.itemType === 'cdkey_sales_share' ? 'view-cdkey'
  : 'view-transactions';
```

- [ ] **Step 5: 增加按开发者与游戏配置的阶梯编辑器**

```js
const payload = {
  developerId:form.developerId.value,
  gameId:form.gameId.value,
  effectiveBillingMonth:form.effectiveBillingMonth.value,
  reason:form.reason.value.trim(),
  tiers:[...form.querySelectorAll('[data-tier-row]')].map(row => ({
    fromMinor:Number(row.querySelector('[name="fromMinor"]').value),
    toMinor:row.querySelector('[name="toMinor"]').value === '' ? null : Number(row.querySelector('[name="toMinor"]').value),
    platformRate:Number(row.querySelector('[name="platformRate"]').value),
  })),
};
model.statements.saveTierRule(state.statementState, payload);
```

- [ ] **Step 6: 更新导出字段且只允许已确认记录进入名单**

```js
const exportable = rows.filter(row => row.status === 'confirmed');
const csv = model.statements.exportEntitySummariesCsv(exportable);
```

- [ ] **Step 7: 运行运营端浏览器测试**

Run: `node --test tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: PASS，包含每页 20 条、主体汇总字段、游戏明细字段、阶梯新增与校验、两类详情、筛选、已确认导出和 390px 无页面溢出。

- [ ] **Step 8: 精确提交运营端源码**

```powershell
git add -- "demos/开发者后台一期/src/demo16/model.js" "demos/开发者后台一期/src/demo16/app.js" "demos/开发者后台一期/src/demo16/styles.css" "tests/developer-backend/operations-finance-settlement.browser.test.mjs"
git commit -m "feat: align operations settlement console"
```

### Task 5: 构建、回归与视觉验收

**Files:**
- Modify: `demos/开发者后台一期/开发者平台财务整合demo.html`
- Modify: `demos/开发者后台一期/发行平台运营后台财务整合demo.html`

- [ ] **Step 1: 重建两份财务整合 Demo**

Run: `node demos/开发者后台一期/build.mjs --module=02 --variant=finance-integrated`

Expected: 输出 `Built developer finance integration with 5 routes.`。

Run: `node demos/开发者后台一期/build-finance-operations.mjs`

Expected: 输出 `已生成：...发行平台运营后台财务整合demo.html`。

- [ ] **Step 2: 运行本任务完整回归**

Run: `node --test tests/developer-backend/finance-statements-model.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs tests/developer-backend/operations-finance-settlement.browser.test.mjs tests/developer-backend/build.test.mjs`

Expected: PASS；原始 `开发者平台demo.html`、`发行平台运营后台demo.html` 和 Demo 01 内容不变。

- [ ] **Step 3: 执行静态与内容检查**

Run: `git diff --check -- "demos/开发者后台一期" "tests/developer-backend"`

Expected: 无空白错误。

Run: `rg -n "DLC 销售分成|付款成功|付款失败|付款凭证|发票管理|调整额" -- "demos/开发者后台一期/开发者平台财务整合demo.html" "demos/开发者后台一期/发行平台运营后台财务整合demo.html"`

Expected: 不出现独立 `DLC 销售分成` 主表项，不出现本轮排除的付款与发票流程；详情中的商品类型 `DLC` 允许保留。

- [ ] **Step 4: 浏览器视觉检查**

在 1440×900 检查开发者端 `/P15-01`、`/P15-02`，运营端 `/P16-01` 的主体汇总、游戏明细、阶梯编辑器和两个详情抽屉；在 390×844 检查根页面无横向溢出、宽表仅在卡片内部横向滚动、抽屉可完整滚动并可关闭。

- [ ] **Step 5: 精确提交构建产物**

```powershell
git add -- "demos/开发者后台一期/开发者平台财务整合demo.html" "demos/开发者后台一期/发行平台运营后台财务整合demo.html"
git commit -m "build: refresh settlement finance demos"
```

- [ ] **Step 6: 推送并生成固定 Commit 预览地址**

```powershell
git push origin HEAD
git rev-parse HEAD
```

Expected: 推送成功；使用最终 commit SHA 生成开发者端 `/P15-02` 与运营端 `/P16-01` 的 jsDelivr + htmlpreview 固定地址。
