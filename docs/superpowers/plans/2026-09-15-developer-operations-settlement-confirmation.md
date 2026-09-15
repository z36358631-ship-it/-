# Developer and Operations Settlement Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将开发者端和运营端财务 Demo 统一为固定 N+1、按游戏与结算项生成、由开发者确认、由运营审核配置并导出的人民币结算流程。

**Architecture:** 新增 `finance-statements` 共享模型，集中维护财务主体版本、开发者结算比例版本和结算单；开发者端与运营端只负责各自的状态、展示和操作。现有 `finance-ledger` 保留为支付事实来源，结算单锁定时保存金额、比例和主体版本快照，任何后续修改均不回写历史记录。

**Tech Stack:** 单文件 HTML、原生 JavaScript、CSS、Node.js、Node Test、Playwright Core。

---

### Task 1: 建立共享结算单模型

**Files:**
- Create: `demos/开发者后台一期/src/finance-statements/model.js`
- Create: `tests/developer-backend/finance-statements-model.test.mjs`
- Modify: `demos/开发者后台一期/build.mjs`
- Modify: `demos/开发者后台一期/build-next.mjs`
- Modify: `demos/开发者后台一期/build-finance-operations.mjs`
- Modify: `tests/developer-backend/build.test.mjs`

- [ ] **Step 1: 写共享模型失败测试**

测试固定接口和核心公式：

```js
assert.deepEqual(Object.keys(model).sort(), [
  'confirmStatements','createState','exportStatementsCsv','financialEntity','financialEntityApplications',
  'nextMonth','ratioFor','reviewFinancialEntity','saveRatioVersion','statementsFor','submitFinancialEntity',
].sort());

assert.equal(model.nextMonth('2026-07'), '2026-08');
const state = model.createState();
const row = model.statementsFor(state, { developerId:'DEV-1001' })[0];
assert.equal(row.settlementMonth, model.nextMonth(row.billingMonth));
assert.equal(row.settlementMinor, Math.round(row.receivedMinor * row.ratioPercent / 100));
assert.equal(row.ratioPercent, 70);
```

补充比例边界和历史隔离断言：

```js
assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:-1, effectiveBillingMonth:'2026-09', reason:'测试' }), /0%-100%/);
assert.throws(() => model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:101, effectiveBillingMonth:'2026-09', reason:'测试' }), /0%-100%/);
const lockedBefore = structuredClone(model.statementsFor(state, { status:'confirmed' }));
model.saveRatioVersion(state, { developerId:'DEV-1001', ratioPercent:80, effectiveBillingMonth:'2026-09', reason:'合同变更', operator:'李然' });
assert.deepEqual(model.statementsFor(state, { status:'confirmed' }), lockedBefore);
assert.equal(model.ratioFor(state, 'DEV-1001', '2026-09').ratioPercent, 80);
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test tests/developer-backend/finance-statements-model.test.mjs
```

Expected: FAIL，`finance-statements/model.js` 尚不存在。

- [ ] **Step 3: 实现模型接口**

模型公开以下接口：

```js
window.PublisherSettlementStatements = (() => Object.freeze({
  createState,
  nextMonth,
  statementsFor,
  confirmStatements,
  ratioFor,
  saveRatioVersion,
  financialEntity,
  financialEntityApplications,
  submitFinancialEntity,
  reviewFinancialEntity,
  exportStatementsCsv,
}))();
```

结算单结构固定为：

```js
{
  id:'ST-202607-GAME-48291-SALES',
  developerId:'DEV-1001',
  developerName:'星海互动',
  entityName:'星海互动科技有限公司',
  entityVersion:'FIN-2026-003',
  gameId:'GAME-48291',
  gameName:'星海远征',
  billingMonth:'2026-07',
  settlementMonth:'2026-08',
  itemType:'sales_share',
  itemLabel:'游戏销售分成',
  userPaidMinor:12800000,
  receivedMinor:10324000,
  ratioPercent:70,
  ratioVersion:'RATIO-2026-001',
  settlementMinor:7226800,
  status:'pending',
  confirmedAt:'',
}
```

同时生成 `refund_adjustment` 和 `chargeback_adjustment` 负数样例；状态只允许 `pending`、`confirmed`。`confirmStatements` 只修改待确认记录，重复确认保持幂等。

- [ ] **Step 4: 接入三个构建入口**

注入顺序固定为：

```js
read('finance-ledger', 'model.js').trim(),
read('finance-statements', 'model.js').trim(),
```

运营构建脚本增加：

```js
const statementsFile = path.join(demoDir, 'src', 'finance-statements', 'model.js');
const injectedScript = `${read(ledgerFile)}\n\n${read(statementsFile)}\n\n${read(modelFile)}\n\n${read(appFile)}\n\n`;
```

构建测试断言三份财务输出各注入一次：

```js
assert.equal((html.match(/window\.PublisherSettlementStatements\s*=/g) || []).length, 1);
```

- [ ] **Step 5: 运行模型与构建测试**

Run:

```powershell
node --test tests/developer-backend/finance-statements-model.test.mjs tests/developer-backend/build.test.mjs
```

Expected: PASS。

### Task 2: 重做开发者财务主体页面

**Files:**
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`

- [ ] **Step 1: 写财务主体失败测试**

```js
await open('/P15-01');
const pageText = await page.locator('[data-finance-route="P15-01"]').innerText();
for (const label of ['企业法定名称','联系人姓名','手机号','邮箱','银行账户户名','开户银行','银行账号','开户支行／联行信息','银行账户证明附件']) {
  assert.match(pageText, new RegExp(label));
}
await page.getByRole('button', { name:'修改' }).click();
assert.equal(await page.getByRole('button', { name:'提交审核' }).isVisible(), true);
assert.equal(await page.getByRole('button', { name:'取消' }).isVisible(), true);
```

提交校验测试：

```js
await page.getByLabel('联系人姓名').fill('');
await page.getByRole('button', { name:'提交审核' }).click();
assert.equal(await page.getByLabel('联系人姓名').evaluate(el => el === document.activeElement), true);
await page.getByLabel('联系人姓名').fill('王明');
await page.getByLabel('手机号').fill('18520064686');
await page.getByLabel('邮箱').fill('finance@ocean-expedition.com');
await page.getByRole('button', { name:'提交审核' }).click();
assert.match(await page.locator('[data-d15-entity-status]').innerText(), /审核中/);
```

- [ ] **Step 2: 运行并确认失败**

Run:

```powershell
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
```

Expected: FAIL，现页面仍是旧的只读详情和旧结算表。

- [ ] **Step 3: 实现只读态和编辑态**

状态增加：

```js
entityMode:'view',
entityDraft:null,
entityError:'',
```

按钮规则：

```js
const entityActions = state.entityMode === 'edit'
  ? `${button('取消','cancel-entity')}${button('提交审核','submit-entity','primary')}`
  : button('修改','edit-entity');
```

编辑态使用两列表单，银行附件为单文件上传区；已有附件显示文件名，点击可替换。提交失败调用：

```js
const firstError = root.querySelector('[aria-invalid="true"]');
firstError?.scrollIntoView({ block:'center', behavior:'smooth' });
firstError?.focus();
```

提交成功后调用共享模型 `submitFinancialEntity`，恢复只读态并显示“审核中”；取消恢复原值。

- [ ] **Step 4: 运行页面测试**

Run:

```powershell
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
```

Expected: 财务主体用例 PASS；旧结算表用例仍 FAIL，留待 Task 3。

### Task 3: 实现开发者对账确认

**Files:**
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 将结算表测试改为新字段**

```js
const headers = await page.locator('[data-testid="settlement-table"] th').allTextContents();
assert.deepEqual(headers, [
  '', '游戏 ID','游戏名称','账单月份','结算月份','结算项','用户支付金额（CNY）',
  '结算比例','实际到账金额（CNY）','结算金额（CNY）','状态','操作',
]);
```

增加 N+1、公式和状态断言：

```js
const rows = await page.locator('[data-d15-settlement-row]').evaluateAll(nodes => nodes.map(node => ({ ...node.dataset })));
for (const row of rows) {
  assert.equal(row.settlementMonth, nextMonth(row.billingMonth));
  assert.ok(Math.abs(Number(row.settlementMinor) - Math.round(Number(row.receivedMinor) * Number(row.ratioPercent) / 100)) <= 1);
}
assert.ok(await page.getByText('待确认', { exact:true }).count() > 0);
assert.ok(await page.getByText('已确认', { exact:true }).count() > 0);
```

- [ ] **Step 2: 增加单条和批量确认失败测试**

```js
const pending = page.locator('[data-d15-settlement-row][data-status="pending"]').first();
const pendingId = await pending.getAttribute('data-statement-id');
await pending.getByRole('button', { name:'确认' }).click();
assert.equal(await page.getByRole('dialog', { name:'确认结算单' }).isVisible(), true);
await page.getByRole('dialog').getByRole('button', { name:'确认' }).click();
assert.equal(await page.locator(`[data-statement-id="${pendingId}"]`).getAttribute('data-status'), 'confirmed');

await page.locator('[data-d15-settlement-row][data-status="pending"] input[type="checkbox"]').first().check();
await page.getByRole('button', { name:'批量确认' }).click();
assert.match(await page.getByRole('dialog').innerText(), /1 条/);
```

- [ ] **Step 3: 实现筛选、表格和确认交互**

筛选状态改为：

```js
filters:{ billingMonth:'all', settlementMonth:'all', gameId:'all', status:'all' },
selectedStatementIds:[],
confirmationIds:[],
```

表格直接读取 `PublisherSettlementStatements.statementsFor`。金额统一使用：

```js
const cny = minor => (Number(minor || 0) / 100).toLocaleString('zh-CN', {
  minimumFractionDigits:2,
  maximumFractionDigits:2,
});
```

待确认行显示“确认”，已确认行显示“—”。批量确认只收集已勾选且状态为待确认的 ID；确认弹窗展示条数和 `settlementMinor` 合计。

删除旧“查看详情”操作、结算抽屉和独立交易流水路由；财务一级入口只保留“财务主体”“对账结算”。支付商原始流水继续留在共享账本模型中，不在本轮结算确认页面展开。

- [ ] **Step 4: 重做开发者导出**

导出调用：

```js
const csv = statementsModel.exportStatementsCsv(rows, { includeDeveloper:false, includeRatioVersion:false });
save(csv, `对账结算_${state.filters.billingMonth === 'all' ? '全部账单月' : state.filters.billingMonth}.csv`);
```

CSV 表头与页面一致，不导出“操作”。

- [ ] **Step 5: 运行开发者端测试**

Run:

```powershell
node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
```

Expected: PASS。

### Task 4: 实现运营财务主体审核与比例配置

**Files:**
- Modify: `demos/开发者后台一期/src/demo16/model.js`
- Modify: `demos/开发者后台一期/src/demo16/app.js`
- Modify: `demos/开发者后台一期/src/demo16/styles.css`
- Modify: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 写两页签和主体审核失败测试**

```js
assert.deepEqual(await page.getByRole('tab').allTextContents(), ['财务主体','对账管理']);
const subjectTable = page.locator('[data-testid="finance-entity-review-table"]');
for (const label of ['开发者／财务主体','审核类型','审核状态','当前结算比例','生效账单月','更新时间','操作人','操作']) {
  assert.match(await subjectTable.innerText(), new RegExp(label));
}
await subjectTable.getByRole('button', { name:'查看申请' }).first().click();
assert.equal(await page.getByRole('dialog', { name:'财务主体申请详情' }).isVisible(), true);
```

- [ ] **Step 2: 写比例配置失败测试**

```js
await page.getByRole('button', { name:'结算设置' }).click();
const ratio = page.getByLabel('结算比例');
await ratio.fill('101');
await page.getByRole('button', { name:'保存设置' }).click();
assert.match(await page.getByRole('alert').innerText(), /0%-100%/);
await ratio.fill('80');
await page.getByLabel('生效账单月').fill('2026-09');
await page.getByLabel('变更原因').fill('合同分成调整');
await page.getByRole('button', { name:'保存设置' }).click();
assert.match(await page.locator('[data-fo-ratio-audit]').innerText(), /70%.*80%/s);
```

- [ ] **Step 3: 实现“财务主体”页签**

主体列表渲染共享模型的申请与当前比例。详情使用现有右侧抽屉，不新增页面；抽屉分为“申请资料”“银行附件”“审核处理”“结算设置”“变更记录”。

审核动作：

```js
if (action === 'approve-entity') model.reviewFinancialEntity(state, applicationId, { result:'approved', operator:'平台运营 李然' });
if (action === 'reject-entity') model.reviewFinancialEntity(state, applicationId, { result:'rejected', reason, operator:'平台运营 李然' });
```

比例保存调用共享模型 `saveRatioVersion`；错误在抽屉内展示，不关闭抽屉。

- [ ] **Step 4: 运行主体审核测试**

Run:

```powershell
node --test --test-name-pattern="财务主体|结算比例" tests/developer-backend/operations-finance-settlement.browser.test.mjs
```

Expected: PASS。

### Task 5: 实现运营对账管理与已确认导出

**Files:**
- Modify: `demos/开发者后台一期/src/demo16/model.js`
- Modify: `demos/开发者后台一期/src/demo16/app.js`
- Modify: `demos/开发者后台一期/src/demo16/styles.css`
- Modify: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 写运营对账字段失败测试**

```js
await page.getByRole('tab', { name:'对账管理' }).click();
const headers = await page.locator('[data-testid="operations-settlement-table"] th').allTextContents();
assert.deepEqual(headers, [
  '', '开发者／财务主体','游戏 ID','游戏名称','账单月份','结算月份','结算项',
  '用户支付金额（CNY）','结算比例','实际到账金额（CNY）','结算金额（CNY）','状态',
]);
```

筛选断言：

```js
for (const key of ['keyword','game','billingMonth','settlementMonth','itemType','status']) {
  assert.equal(await page.locator(`[data-fo-filter="${key}"]`).count(), 1);
}
```

- [ ] **Step 2: 写已确认导出失败测试**

```js
await page.locator('[data-fo-settlement-row][data-status="pending"] input').first().check();
await page.locator('[data-fo-settlement-row][data-status="confirmed"] input').first().check();
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name:/导出已确认记录/ }).click();
const csv = fs.readFileSync(await (await downloadPromise).path(), 'utf8');
assert.match(csv, /财务主体/);
assert.match(csv, /结算比例版本/);
assert.doesNotMatch(csv, /待确认/);
```

- [ ] **Step 3: 实现运营筛选和表格**

运营筛选状态：

```js
filters:{
  keyword:'',
  gameId:'all',
  billingMonth:'all',
  settlementMonth:'all',
  itemType:'all',
  status:'all',
},
```

列表只读展示结算状态，不提供代确认按钮。结算金额和负数补扣使用等宽数字，所有金额列右对齐。

- [ ] **Step 4: 实现已确认导出**

```js
const candidates = selected.length ? selected : filteredRows;
const confirmed = candidates.filter(row => row.status === 'confirmed');
const disabled = confirmed.length === 0;
const csv = statementsModel.exportStatementsCsv(confirmed, {
  includeDeveloper:true,
  includeRatioVersion:true,
});
```

导出按钮显示 `导出已确认记录（N）`。若选中记录包含待确认项，待确认项不导出，并在页面提示实际导出数量。

- [ ] **Step 5: 运行运营端测试**

Run:

```powershell
node --test tests/developer-backend/operations-finance-settlement.browser.test.mjs
```

Expected: PASS。

### Task 6: 构建、视觉检查与完整回归

**Files:**
- Regenerate: `demos/开发者后台一期/15-开发者财务结算demo.html`
- Regenerate: `demos/开发者后台一期/开发者平台财务整合demo.html`
- Regenerate: `demos/开发者后台一期/发行平台运营后台财务整合demo.html`

- [ ] **Step 1: 重新生成三份单文件 Demo**

```powershell
node demos/开发者后台一期/build-next.mjs
node demos/开发者后台一期/build.mjs --module=02 --variant=finance-integrated
node demos/开发者后台一期/build-finance-operations.mjs
```

- [ ] **Step 2: 执行完整回归**

```powershell
node --test tests/developer-backend/finance-statements-model.test.mjs tests/developer-backend/build.test.mjs tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs tests/developer-backend/operations-finance-settlement.browser.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 3: 执行视觉与交互检查**

在 1440×900、1280×800、390×844 检查：

- 开发者财务主体只读、编辑、校验、审核中和驳回态。
- 开发者待确认、已确认、单条确认、批量确认、空态和筛选无结果。
- 运营财务主体列表、右侧抽屉、审核、比例边界和审计记录。
- 运营对账筛选、横向表格、已确认导出和负数补扣。
- 表格只在自身区域横向滚动，页面无横向溢出。

- [ ] **Step 4: 仅提交本次文件**

```powershell
git add -- `
  'demos/开发者后台一期/src/finance-statements/model.js' `
  'demos/开发者后台一期/src/demo15/app.js' `
  'demos/开发者后台一期/src/demo15/styles.css' `
  'demos/开发者后台一期/src/demo16/model.js' `
  'demos/开发者后台一期/src/demo16/app.js' `
  'demos/开发者后台一期/src/demo16/styles.css' `
  'demos/开发者后台一期/build.mjs' `
  'demos/开发者后台一期/build-next.mjs' `
  'demos/开发者后台一期/build-finance-operations.mjs' `
  'demos/开发者后台一期/15-开发者财务结算demo.html' `
  'demos/开发者后台一期/开发者平台财务整合demo.html' `
  'demos/开发者后台一期/发行平台运营后台财务整合demo.html' `
  'tests/developer-backend/finance-statements-model.test.mjs' `
  'tests/developer-backend/build.test.mjs' `
  'tests/developer-backend/developer-finance-settlement.browser.test.mjs' `
  'tests/developer-backend/developer-platform-finance-integration.browser.test.mjs' `
  'tests/developer-backend/operations-finance-settlement.browser.test.mjs'
git commit -m "feat: add settlement confirmation workflow"
```

- [ ] **Step 5: 推送并用固定提交地址验收**

```powershell
git push
git rev-parse HEAD
```

Expected: 开发者与运营 Demo 均可通过固定 Commit 的 htmlpreview 地址打开，线上字段与本地一致。
