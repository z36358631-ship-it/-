# Developer Settlement Navigation Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将开发者财务结算 Demo 从“财务主体／财务对账／付款记录＋页内 Tab”收敛为“财务主体／对账结算”两个场景入口，并在一个结算记录中串联对账、差异、发票和付款。

**Architecture:** 保留现有三本账、账单、差异、发票和付款数据模型，以账单号作为开发者端结算记录聚合主键，把关联付款单和当前待办投影到同一列表。全局流水使用次级路由，单笔结算详情使用单层右侧抽屉和纵向区块，不再使用业务 Tab 或嵌套抽屉。

**Tech Stack:** 单文件 HTML、原生 JavaScript、CSS、Node.js `node:test`、Playwright。

---

## 文件结构

- Modify: `demos/开发者后台一期/src/demo15/app.js` — 路由、结算聚合、页面渲染和交互状态。
- Modify: `demos/开发者后台一期/src/demo15/styles.css` — 两入口导航、结算列表、进度和纵向详情样式。
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html` — 离线单文件交付物。
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs` — 导航、聚合状态、详情、缺省态、响应式和证据图。
- Modify selectively: `demos/开发者后台一期/README.md` — 仅更新 Demo 15 契约；保留并行改动。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/settlement-list-1440x900.png`。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/settlement-detail-1440x900.png`。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/flows-query-1440x900.png`。
- Create: `tests/developer-backend/evidence/developer-finance-settlement/settlement-empty-1440x900.png`。

### Task 1: 收敛一级导航和路由

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js:4-8,609-612,746-754,1337-1343,1550-1562,1874-1877`
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入两个一级入口的失败测试**

```js
test('财务模块只保留财务主体和对账结算两个一级入口', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    assert.deepEqual(await page.locator('.d15-nav [data-route]').allTextContents(), ['主财务主体','结对账结算']);
    assert.equal(await page.locator('.d15-nav [data-route="payments"]').count(), 0);

    await page.locator('[data-route="settlement"]').click();
    assert.equal(await page.locator('main h1').innerText(), '对账结算');
    assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).route, 'settlement');

    for (const legacy of ['reconciliation','payments']) {
      await page.goto(url('/' + legacy), { waitUntil:'load' });
      assert.equal(await page.locator('main h1').innerText(), '对账结算');
      assert.equal((await page.evaluate(() => window.__developerFinanceDemo.snapshot())).route, 'settlement');
    }
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```powershell
node --test --test-name-pattern="只保留财务主体和对账结算" tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: FAIL，当前仍渲染“财务对账”和“付款记录”。

- [ ] **Step 3: 实现两个主路由和旧链接兼容**

将主路由替换为：

```js
const routes = {
  entity:{ title:'财务主体', icon:'主' },
  settlement:{ title:'对账结算', icon:'结' },
};

function routeFromHash() {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (raw === 'reconciliation' || raw === 'payments') return 'settlement';
  if (raw === 'settlement/flows') return 'settlement/flows';
  return routes[raw] ? raw : 'entity';
}

function primaryRoute() {
  return state.route === 'settlement/flows' ? 'settlement' : state.route;
}
```

导航选中态使用 `primaryRoute()`；`pageHead()` 在 `settlement/flows` 时显示“对账流水”，面包屑为“对账结算 / 对账流水”。`render()` 只分发 `entityPage()`、`settlementPage()` 和 `flowQueryPage()`。

删除 `data-reconcile-tab` 点击分支；旧 hash 解析为 `settlement`，首次渲染后使用 `history.replaceState(null,'','#/settlement')` 规范地址，不新增第三个导航项。

- [ ] **Step 4: 构建并验证测试通过**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test --test-name-pattern="只保留财务主体和对账结算" tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: PASS；左侧只有两个入口，旧链接均落到“对账结算”。

- [ ] **Step 5: 提交导航改动**

```powershell
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "refactor: consolidate settlement navigation"
```

### Task 2: 聚合结算记录和当前待办

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js:380-405,414-430,641-676,741-744,885-944,976-1013,1302-1328,1440-1466,1851-1867,1924-1950`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入结算记录聚合的失败测试**

```js
test('一张结算记录同时展示对账发票付款和当前待办', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/settlement'), { waitUntil:'load' });
    const headers = await page.locator('[data-testid="settlement-table"] thead th').allTextContents();
    for (const label of ['账期／结算单号','业务来源','应结算金额','对账状态','发票状态','付款状态','当前待办','更新时间']) {
      assert.ok(headers.includes(label), label);
    }
    assert.equal(await page.locator('[data-testid="settlement-table"] tbody tr').count(), 20);

    const model = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.equal(model.settlementRecords.length, model.counts.statements);
    assert.equal(model.settlementRecords.every(item => item.statementId && item.statementStatus && item.invoiceStatus && item.paymentStatus && item.currentTask), true);
    for (const record of model.settlementRecords) {
      const statement = model.statements.find(item => item.id === record.statementId);
      assert.equal(record.statementStatus, statement.status);
      assert.equal(record.invoiceStatus, statement.invoice);
    }
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

```powershell
node --test --test-name-pattern="一张结算记录同时展示" tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: FAIL，当前账单表没有发票状态、当前待办和结算聚合快照。

- [ ] **Step 3: 定义结算记录投影**

使用账单号作为聚合主键，不修改底层账单和付款对象：

```js
function paymentForStatement(statementId) {
  return activePayments().find(item => item.statementId === statementId) || null;
}

function sourceKeysForStatement(statement) {
  return LEDGER_SOURCES.filter(source => Number(statement.sourceTotalsMinor[source] || 0) !== 0);
}

function currentTaskFor(statement, payment) {
  const dispute = activeDisputes().find(item => item.statementId === statement.id && ['processing','supplement'].includes(item.status));
  if (dispute && dispute.status === 'supplement') return { label:'补充差异材料', tone:'warning', owner:'developer' };
  if (statement.status === 'pending') return { label:'确认账单', tone:'warning', owner:'developer' };
  if (statement.status === 'disputed') return { label:'等待差异处理', tone:'info', owner:'platform' };
  if (statement.status === 'confirmed') return { label:'等待平台锁单', tone:'info', owner:'platform' };
  if (statement.invoice === 'pending' && statement.requiresInvoice) return { label:'提交发票', tone:'warning', owner:'developer' };
  if (statement.invoice === 'rejected') return { label:'重新提交发票', tone:'danger', owner:'developer' };
  if (payment && ['failed','returned'].includes(payment.status) && payment.developerActionRequired) return { label:'处理收款资料', tone:'danger', owner:'developer' };
  if (payment && ['completed','cancelled','carried'].includes(payment.status)) return { label:'无需处理', tone:'success', owner:'none' };
  return { label:'等待平台处理', tone:'info', owner:'platform' };
}

function settlementRecord(statement) {
  const payment = paymentForStatement(statement.id);
  return {
    id:statement.id,
    statementId:statement.id,
    period:statement.period,
    currency:statement.currency,
    amountMinor:statement.settlementMinor,
    sources:sourceKeysForStatement(statement),
    statementStatus:statement.status,
    invoiceStatus:statement.invoice,
    paymentStatus:payment ? payment.status : paymentStateForStatement(statement),
    paymentId:payment ? payment.id : '',
    currentTask:currentTaskFor(statement,payment),
    updatedAt:payment ? payment.updated : statement.generated,
  };
}

function activeSettlementRecords() {
  return activeStatements().map(settlementRecord);
}
```

- [ ] **Step 4: 替换筛选和列表状态**

初始化统一筛选：

```js
settlementFilters:{ keyword:'', period:'all', source:'all', statementStatus:'all', invoiceStatus:'all', paymentStatus:'all' },
filterKeywordDrafts:{ settlement:'', flow:'' },
settlementPage:1,
flowPage:1,
activeStatement:'',
```

`filteredSettlementRecords()` 同时支持账单号、付款单号、银行参考号、账期、来源和三类状态。关键词匹配银行参考号时遍历关联付款单全部尝试的 `providerRef`。

列表每页 20 条，输出 `data-testid="settlement-table"`。业务来源为一个时显示名称，多来源时显示首个来源并补充“等 N 项”；筛选仍按原始 `sources` 数组判断。

移除独立 `paymentFilters`、`paymentPage` 和付款列表渲染；保留付款数据、付款导出函数和审计函数供详情及安全导出使用。

- [ ] **Step 5: 在快照中暴露聚合一致性**

```js
settlementRecords:activeSettlementRecords(),
pages:{
  settlements:Math.ceil(filteredSettlementRecords().length / PAGE_SIZE),
  flows:Math.ceil(filteredFlows().length / PAGE_SIZE),
},
```

保留原有 `counts`、账本、金额、差异、发票和付款审计字段，避免降低既有测试覆盖。

- [ ] **Step 6: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test --test-name-pattern="一张结算记录同时展示" tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "feat: aggregate developer settlement records"
```

Expected: PASS；同一行可同时判断对账、发票、付款和开发者待办。

### Task 3: 将全局流水改为次级页面

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js:752-754,896-905,954-983,1337-1343,1550-1571,1851-1867`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入无页内 Tab 和流水次级路由测试**

```js
test('对账结算无页内Tab且流水查询使用次级路由', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/settlement'), { waitUntil:'load' });
    assert.equal(await page.locator('[data-reconcile-tab]').count(), 0);
    assert.equal(await page.locator('.d15-main-tabs').count(), 0);
    await page.getByRole('button', { name:'查询流水', exact:true }).click();
    assert.equal(new URL(page.url()).hash, '#/settlement/flows');
    assert.equal(await page.locator('main h1').innerText(), '对账流水');
    assert.match(await page.locator('.gh-breadcrumb').innerText(), /对账结算.*对账流水/);
    assert.equal(await page.locator('.d15-nav [data-route]').count(), 2);
    assert.equal(await page.locator('[data-route="settlement"]').getAttribute('class').then(value => value.includes('is-active')), true);
    await page.getByRole('button', { name:'返回对账结算', exact:true }).click();
    assert.equal(new URL(page.url()).hash, '#/settlement');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

```powershell
node --test --test-name-pattern="流水查询使用次级路由" tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: FAIL，当前流水通过“对账单／对账流水”Tab 切换。

- [ ] **Step 3: 实现页头工具和流水次级页面**

`settlementPage()` 页头输出“查询流水”和“导出”按钮；正文只渲染结算记录。新增：

```js
function flowQueryPage() {
  return '<div class="d15-page-tools">' +
    button('返回对账结算','back-settlement','','') +
    button('导出流水','export-flows','','') +
    '</div>' + flowList();
}
```

点击行为：

```js
if (action === 'open-flow-query') {
  clearRouteOverlays();
  state.route = 'settlement/flows';
  location.hash = '/settlement/flows';
  render();
} else if (action === 'back-settlement') {
  clearRouteOverlays();
  state.route = 'settlement';
  location.hash = '/settlement';
  render();
}
```

流水筛选、20 条分页、三本账字段和 CSV 安全逻辑原样保留。删除 `state.reconcileTab`、`.d15-main-tabs` 及对应点击逻辑。

- [ ] **Step 4: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test --test-name-pattern="流水查询使用次级路由" tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "refactor: move settlement flows to secondary route"
```

Expected: PASS；对账结算没有页内 Tab，流水能力未丢失。

### Task 4: 合并结算详情、差异、发票和付款

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js:396-404,1020-1155,1250-1300,1337-1343,1559-1562,1659-1679,1681-1849,1879-1893,1958-1966`
- Modify: `demos/开发者后台一期/src/demo15/styles.css:87-159,280-313`
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入单层纵向详情测试**

```js
test('结算详情使用单层抽屉纵向串联全部阶段', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/settlement'), { waitUntil:'load' });
    await page.locator('[data-statement-id="STMT-2026-03-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    const drawer = page.getByRole('dialog', { name:'结算详情' });
    assert.equal(await drawer.count(), 1);
    assert.equal(await page.getByRole('dialog').count(), 1);
    assert.equal(await drawer.locator('[role="tab"], [data-statement-drawer-tab]').count(), 0);
    for (const section of ['progress','summary','sources','flows','dispute','invoice','payment']) {
      assert.equal(await drawer.locator('[data-settlement-section="' + section + '"]').count(), 1, section);
    }
    assert.match(await drawer.innerText(), /付款单.*付款尝试/s);
    assert.equal(await drawer.locator('.d15-drawer-foot').evaluate(node => getComputedStyle(node).position), 'sticky');
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

```powershell
node --test --test-name-pattern="单层抽屉纵向串联" tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: FAIL，当前账单详情有 Tab，付款使用另一套独立抽屉。

- [ ] **Step 3: 定义纵向详情组件**

新增两个渲染辅助函数：

```js
function detailSection(id, title, summary, body, expanded) {
  return '<details class="d15-detail-section" data-settlement-section="' + id + '" ' + (expanded ? 'open' : '') + '>' +
    '<summary><span>' + esc(title) + '</span><small>' + esc(summary) + '</small></summary>' +
    '<div class="d15-detail-section-body">' + body + '</div></details>';
}

function settlementSectionNav() {
  return '<nav class="d15-section-nav" aria-label="结算详情区块">' +
    [['summary','账单'],['sources','来源'],['flows','流水'],['dispute','差异'],['invoice','发票'],['payment','付款']]
      .map(item => '<button type="button" data-action="jump-settlement-section" data-section-target="' + item[0] + '">' + item[1] + '</button>').join('') +
    '</nav>';
}
```

`settlementDrawer()` 以 `state.activeStatement` 找到账单、差异、发票和关联付款单，按 `progress → summary → sources → flows → dispute → invoice → payment` 顺序渲染。当前待办对应区块 `open`，其余区块显示摘要并可展开。

将原 `paymentDrawer()` 的异常说明、付款尝试时间线、关联账单和凭证按钮移动到 `paymentSection(payment)`；下载凭证通过按钮上的 `data-payment` 和 `data-attempt` 查找付款单，不再依赖 `state.activePayment`。

- [ ] **Step 4: 删除详情 Tab 和独立付款抽屉状态**

删除：

```js
statementDrawerTab
activePayment
data-statement-drawer-tab
data-action="open-payment"
paymentDrawer()
```

覆盖层只由 `activeStatement`、`selectedHistory` 和 `dialog` 控制。`clearRouteOverlays()`、Esc、hashchange 和 `overlaySnapshot()` 同步移除 `activePayment`。

区块定位只滚动当前抽屉正文：

```js
} else if (action === 'jump-settlement-section') {
  const section = app.querySelector('[data-settlement-section="' + actionNode.dataset.sectionTarget + '"]');
  if (section) {
    section.open = true;
    section.scrollIntoView({ block:'start', behavior:'smooth' });
  }
```

不得打开新的 dialog 或 drawer。

- [ ] **Step 5: 保持业务动作闭环**

原确认账单、提交差异、补充材料、提交发票、前往财务主体和下载付款凭证逻辑继续使用 `state.activeStatement`。付款按钮通过 `paymentForStatement(state.activeStatement)` 获取付款单。

底部固定操作区只显示当前状态允许的动作；查看类和区块定位动作放正文，不放底部。确认账单、撤销审核仍保留二次确认。

- [ ] **Step 6: 增加固定区块导航和响应式样式**

```css
.d15-section-nav {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  gap: 8px;
  padding: 10px 0;
  background: #fff;
  border-bottom: 1px solid var(--line);
}
.d15-section-nav button { border: 0; background: transparent; color: var(--muted); cursor: pointer; }
.d15-detail-section { scroll-margin-top: 58px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
.d15-detail-section + .d15-detail-section { margin-top: 12px; }
.d15-detail-section > summary { display: flex; justify-content: space-between; gap: 16px; padding: 16px 18px; cursor: pointer; }
.d15-detail-section-body { padding: 0 18px 18px; }
@media (max-width:640px) {
  .d15-section-nav { overflow-x: auto; }
  .d15-section-nav button { flex: 0 0 auto; }
  .d15-detail-section > summary { align-items: flex-start; flex-direction: column; }
}
```

保留 `.d15-drawer-foot` 固定在抽屉底部，场景悬浮球继续位于抽屉遮罩下层。

- [ ] **Step 7: 构建、运行完整专项测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test --test-concurrency=1 tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "refactor: unify developer settlement details"
```

Expected: 专项测试全部通过；同一时刻最多一个 `role="dialog"`。

### Task 5: 修正缺省态、权限和旧测试契约

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html`

- [ ] **Step 1: 写入缺省态和权限失败测试**

```js
test('两页面缺省态不造数据且主体异常只暂停付款', async () => {
  const page = await browser.newPage({ viewport:{ width:390, height:844 } });
  try {
    await page.goto(url('/entity'), { waitUntil:'load' });
    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('empty'));
    assert.match(await page.locator('main').innerText(), /尚未配置财务主体/);
    const empty = await page.evaluate(() => window.__developerFinanceDemo.snapshot());
    assert.deepEqual(empty.counts, { statements:0, flows:0, disputes:0, invoices:0, payments:0 });

    await page.locator('[data-route="settlement"]').click();
    assert.match(await page.locator('main').innerText(), /暂无结算记录/);
    assert.equal(await page.locator('main .gh-notice').count(), 0);

    await page.evaluate(() => {
      window.__developerFinanceDemo.setDemoScenario('exhaustive');
      window.__developerFinanceDemo.setEntityScenario('suspended');
    });
    await page.locator('[data-route="settlement"]').click();
    assert.match(await page.locator('main').innerText(), /付款暂停/);
    await page.locator('[data-statement-id="STMT-2026-08-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    assert.equal(await page.getByRole('button', { name:'确认账单', exact:true }).isDisabled(), false);
    assert.equal(await page.getByRole('button', { name:'提交差异', exact:true }).isDisabled(), false);
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

```powershell
node --test --test-name-pattern="两页面缺省态不造数据" tests/developer-backend/developer-finance-settlement.browser.test.mjs
```

Expected: FAIL，旧页面和选择器仍依赖三入口结构。

- [ ] **Step 3: 更新缺省态和必要提示**

- `entity` 缺省态只显示主体配置入口。
- `settlement` 缺省态只显示“暂无结算记录”和账单生成条件，不显示参数卡或额外 Notice。
- 主体首次未生效时允许查看预估数据，但确认正式账单和提交差异保持禁用。
- 主体有生效版本但付款暂停时，页面仅显示一行“付款暂停，不影响历史核账”；账单确认和差异操作继续可用。
- 失败或退回的当前待办明确指向“财务主体”。

- [ ] **Step 4: 迁移全部旧测试选择器**

将：

```js
page.locator('[data-route="reconciliation"]')
page.locator('[data-route="payments"]')
page.getByRole('button', { name:'对账单', exact:true })
page.getByRole('button', { name:'对账流水', exact:true })
page.locator('[data-statement-drawer-tab]')
```

分别迁移为：

```js
page.locator('[data-route="settlement"]')
page.getByRole('button', { name:'查询流水', exact:true })
page.locator('[data-settlement-section="summary"]')
page.locator('[data-settlement-section="flows"]')
page.locator('[data-settlement-section="dispute"]')
page.locator('[data-settlement-section="payment"]')
```

付款状态测试从结算记录进入同一结算详情，不再访问独立付款页。保留金额整数、三本账、差异快照、发票、付款尝试、CSV、防注入、焦点、Esc 和 390px 回归断言。

原分页快照断言由 `{ statements, flows, payments }` 更新为 `{ settlements, flows }`；付款数量继续通过 `counts.payments` 和付款审计字段验证，不再把付款记录视为独立页面。

- [ ] **Step 5: 构建、测试并提交**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test --test-concurrency=1 tests/developer-backend/developer-finance-settlement.browser.test.mjs
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/15-开发者财务结算demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs
git commit -m "test: align settlement scenarios with consolidated navigation"
```

Expected: 专项测试 `0 failed`；穷举态与缺省态都只显示两个一级入口。

### Task 6: 生成证据、更新说明并完成回归

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify selectively: `demos/开发者后台一期/README.md`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/settlement-list-1440x900.png`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/settlement-detail-1440x900.png`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/flows-query-1440x900.png`
- Create: `tests/developer-backend/evidence/developer-finance-settlement/settlement-empty-1440x900.png`

- [ ] **Step 1: 增加四张视觉证据测试**

```js
test('生成两入口结算列表详情流水与缺省态证据', async () => {
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  try {
    await page.goto(url('/settlement'), { waitUntil:'load' });
    await page.screenshot({ path:path.join(evidenceDir,'settlement-list-1440x900.png') });

    await page.locator('[data-statement-id="STMT-2026-03-V1"]').getByRole('button', { name:'查看', exact:true }).click();
    await page.screenshot({ path:path.join(evidenceDir,'settlement-detail-1440x900.png') });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name:'查询流水', exact:true }).click();
    await page.screenshot({ path:path.join(evidenceDir,'flows-query-1440x900.png') });

    await page.evaluate(() => window.__developerFinanceDemo.setDemoScenario('empty'));
    await page.goto(url('/settlement'), { waitUntil:'load' });
    await page.screenshot({ path:path.join(evidenceDir,'settlement-empty-1440x900.png') });
  } finally {
    await page.close();
  }
});
```

- [ ] **Step 2: 更新 README 的 Demo 15 契约**

仅将 Demo 15 说明调整为以下五条：

```markdown
- 财务模块只有“财务主体”和“对账结算”两个一级页面，不设置页内业务 Tab。
- 对账结算按结算单聚合对账、发票、付款状态，并直接展示当前待办。
- 结算详情使用单层右侧抽屉，按账单、来源、流水、差异、发票、付款纵向展示。
- 全局流水查询使用次级页面，保留三本账筛选、每页 20 条和安全导出。
- 默认穷举态覆盖主要状态，右下角“场景”可切换无假数据的缺省态。
```

若 README 同时存在其他改动，使用 `git add -p -- demos/开发者后台一期/README.md`，只暂存上述五条对应 hunk。

- [ ] **Step 3: 运行完整回归**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test --test-concurrency=1 tests/developer-backend/developer-finance-settlement.browser.test.mjs
node --test --test-concurrency=1 tests/developer-backend/next-demos.test.mjs
node --test --test-concurrency=1 tests/developer-backend/next-demos.browser.test.mjs
```

Expected:

- 四组命令退出码均为 `0`。
- 专项测试 `0 failed`。
- `next-demos.test.mjs` 为 `4/4 PASS`。
- `next-demos.browser.test.mjs` 为 `7/7 PASS`。
- 390px 的 `entity`、`settlement`、`settlement/flows` 均无根节点横向溢出。

- [ ] **Step 4: 人工视觉复核**

- 左侧只有两个入口，标题和面包屑匹配当前路由。
- 列表一眼可见三类状态、当前待办和更新时间。
- 详情没有 Tab、嵌套抽屉、重复标题或无关提示。
- 固定区块导航和底部操作互不遮挡，场景悬浮球位于抽屉下层。
- 缺省态不残留账单、流水、差异、发票和付款数据。

- [ ] **Step 5: 只提交本轮证据和说明**

```powershell
git add -- tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/evidence/developer-finance-settlement/settlement-list-1440x900.png tests/developer-backend/evidence/developer-finance-settlement/settlement-detail-1440x900.png tests/developer-backend/evidence/developer-finance-settlement/flows-query-1440x900.png tests/developer-backend/evidence/developer-finance-settlement/settlement-empty-1440x900.png
git add -p -- demos/开发者后台一期/README.md
git diff --cached --check
git commit -m "test: verify consolidated settlement navigation"
```

Expected: 提交只包含 Demo 15 的测试、四张证据图和 README 对应条目；工作区其他文件保持原状。

## 计划自检

- 设计覆盖：两个一级入口、无页内 Tab、统一结算记录、当前待办、单层详情、全局流水、缺省态和响应式均有对应任务。
- 数据一致：账单号为开发者端聚合主键；账单、发票和付款仍是三个独立状态域。
- 付款边界：付款尝试只影响付款状态，不能覆盖已锁定账单或发票状态。
- 能力保留：三本账、差异、发票、付款凭证、分页、导出和安全规则未删除。
- 范围隔离：只修改 Demo 15、专项测试、证据图和 Demo 15 说明，不修改 02、09、平台财务后台或 PRD。
