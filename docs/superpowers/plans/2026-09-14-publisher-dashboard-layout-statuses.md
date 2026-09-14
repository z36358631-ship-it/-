# 开发者数据看板布局与状态样例优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单游戏 Mac 数据看板的筛选压缩为一行，增加自定义时间与具体地区，统一经营概览栅格，并完整展示订单、结算单和付款状态数据。

**Architecture:** 保持 `PublisherDataDashboard` 独立组件边界，通过纯函数统一日期、地区、交易结果和财务状态数据。源文件负责数据与渲染，CSS 负责桌面单行和窄屏内部滚动，统一 02 构建器继续生成离线单文件 Demo；浏览器测试锁定状态覆盖和视觉尺寸，PRD只写最终行为。

**Tech Stack:** 原生 JavaScript、CSS、Node.js `node:test`、Playwright、Python Pillow、单文件 HTML 构建器、Markdown PRD、PowerShell 校验脚本。

---

### Task 1: 先用测试锁定筛选、Mac范围和状态覆盖

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

- [ ] **Step 1: 增加桌面单行与固定 Mac 断言**

在 1440px 视口打开三个页签，断言不存在平台筛选，筛选控件顶坐标一致，且只读平台标识为 Mac：

```js
assert.equal(await dashboard.locator('[data-dashboard-filter="platform"]').count(), 0);
assert.equal(await dashboard.locator('[data-dashboard-platform]').innerText(), '平台：Mac');
const tops = await dashboard.locator('.publisher-dashboard-filter-scroll .publisher-dashboard-field').evaluateAll(
  nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)),
);
assert.equal(new Set(tops).size, 1);
```

- [ ] **Step 2: 增加自定义日期验证与联动断言**

```js
await dashboard.locator('[data-dashboard-filter="range"]').selectOption('custom');
await dashboard.locator('[data-dashboard-date="start"]').fill('2026-09-01');
await dashboard.locator('[data-dashboard-date="end"]').fill('2026-09-10');
await dashboard.getByRole('button', { name:'应用', exact:true }).click();
assert.equal(await dashboard.getAttribute('data-dashboard-range'), '2026-09-01/2026-09-10');
```

分别测试开始晚于结束、超过 180 天、包含未来日期时“应用”禁用；记录应用前后漏斗 UV、订单数和预估收入，断言三者均更新。取消后断言原区间不变。

- [ ] **Step 3: 增加地区和 Mac 样例断言**

```js
const values = await dashboard.locator('[data-dashboard-filter="region"]').locator('option').evaluateAll(
  nodes => nodes.map(node => node.value),
);
for (const value of ['global','domestic','Japan','United States','Germany','United Kingdom','Mainland China']) {
  assert.ok(values.includes(value), value);
}
assert.equal(await dashboard.getByText('Android', { exact:true }).count(), 0);
assert.equal(await dashboard.getByText('Google Play Billing', { exact:true }).count(), 0);
```

- [ ] **Step 4: 增加订单拆分状态和财务状态覆盖断言**

订单默认表断言 8 个“交易结果”；打开每类详情时至少能看到交易类型、支付状态、履约状态、退款状态和拒付状态。收入页断言：

```js
assert.deepEqual(
  new Set(await dashboard.locator('[data-reconciliation-status]').evaluateAll(nodes => nodes.map(n => n.dataset.reconciliationStatus))),
  new Set(['draft','pending','confirmed','disputed','locked','voided']),
);
assert.deepEqual(
  new Set(await dashboard.locator('[data-payment-status]').evaluateAll(nodes => nodes.map(n => n.dataset.paymentStatus))),
  new Set(['waiting_condition','waiting_invoice','pending','processing','remitted','completed','failed','returned','held','carried_forward','cancelled']),
);
```

同时断言发票状态覆盖 `pending, reviewing, approved, returned, not_required`，且未进入发票阶段显示“—”。

- [ ] **Step 5: 运行测试确认先失败**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: FAIL，缺少自定义时间、具体地区、财务状态表或固定 Mac 标识。

### Task 2: 统一日期、地区和交易结果数据模型

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

- [ ] **Step 1: 扩展筛选状态并移除平台筛选**

```js
const dataCutoffDate = '2026-09-10';
const defaultFilters = Object.freeze({
  range:'30d', startDate:'2026-08-13', endDate:dataCutoffDate,
  product:'all', source:'all', fulfillment:'all', region:'all', status:'all', keyword:'',
});
```

`createState` 增加 `datePickerOpen:false` 和 `draftDateRange`。预设和自定义时间都通过 `effectiveDateRange(filters)` 返回开始、结束日期。

- [ ] **Step 2: 实现日期校验和统一缩放**

```js
const daysBetween = (start, end) => Math.floor((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
const validateDateRange = ({ startDate, endDate }) => {
  if (!startDate || !endDate) return '请选择开始和结束日期';
  if (startDate > endDate) return '开始日期不能晚于结束日期';
  if (endDate > dataCutoffDate) return '结束日期不能晚于数据更新时间';
  if (daysBetween(startDate, endDate) > 180) return '自定义时间最长支持 180 天';
  return '';
};
```

`filteredOrders` 同时判断起止日期。`conversionScale` 使用天数与 30 天基准比值，使漏斗、来源和趋势随自定义时间变化。

- [ ] **Step 3: 扩展地区值并固定 Mac 数据**

每个订单使用稳定英文地区码作为筛选值，例如 `Japan`、`United States`、`Mainland China`。`regionMatches(item, value)` 同时支持 `all`、`global`、`domestic` 和具体地区。

全部订单 `platform` 改为 `Mac`；Google Play Billing 渠道改为第三方支付。渲染筛选时不再输出 `platform` 控件，改为只读：

```html
<span class="publisher-dashboard-platform" data-dashboard-platform>平台：Mac</span>
```

- [ ] **Step 4: 拆分底层状态并派生交易结果**

订单记录增加 `transactionType`、`paymentStatus`、`fulfillmentStatus`、`refundStatus` 和 `chargebackStatus`。实现：

```js
const deriveTransactionResult = item => {
  if (item.paymentStatus === 'closed') return 'closed';
  if (item.refundStatus === 'pending') return 'refund_pending';
  if (item.refundStatus === 'completed') return 'refunded';
  if (item.chargebackStatus === 'open') return 'chargeback_open';
  if (item.chargebackStatus === 'won') return 'chargeback_won';
  if (item.chargebackStatus === 'lost') return 'chargeback_lost';
  return item.transactionType === 'free' ? 'free' : 'completed';
};
```

筛选、统计和状态徽标统一调用该函数；详情抽屉逐项展示底层状态。

- [ ] **Step 5: 运行语法与纯快照检查**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 语法检查通过；日期和状态数据相关测试通过，布局测试仍可失败。

### Task 3: 实现单行筛选和整齐的经营概览

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 渲染单行滚动容器与固定操作区**

筛选结构改为：

```html
<section class="publisher-dashboard-filters">
  <div class="publisher-dashboard-filter-row">
    <div class="publisher-dashboard-filter-scroll">...</div>
    <div class="publisher-dashboard-filter-fixed">平台：Mac　重置</div>
  </div>
  <p class="publisher-dashboard-filter-note">...</p>
</section>
```

CSS 使用 `display:flex; flex-wrap:nowrap`。字段分别使用 `--range`、`--product`、`--source`、`--region`、`--fulfillment`、`--status` 和 `--keyword` 宽度类，避免平均分列。

- [ ] **Step 2: 渲染自定义日期浮层**

选择 `custom` 只打开浮层，不立刻覆盖生效区间。应用时校验并提交；取消和 Esc 恢复焦点且不改数据。错误文案位于浮层中，按钮通过 `disabled` 表达不可提交。

- [ ] **Step 3: 统一概览栅格**

```css
.publisher-conversion-analysis-grid { grid-template-columns:repeat(2,minmax(0,1fr)); align-items:stretch; }
.publisher-dashboard-metrics { grid-template-columns:repeat(3,minmax(0,1fr)); grid-auto-rows:1fr; }
.publisher-dashboard-overview-grid { grid-template-columns:repeat(2,minmax(0,1fr)); align-items:stretch; }
.publisher-dashboard-overview-grid > .publisher-dashboard-card { height:100%; }
```

指标说明允许两行；右侧商品、履约和风险合并为同一张卡，成交趋势与其等高。

- [ ] **Step 4: 实现窄屏内部滚动**

筛选容器设置 `min-width:0` 和 `overflow-x:auto`，固定操作区不参与滚动。通过伪元素显示右侧渐隐；字段聚焦时调用 `scrollIntoView({ block:'nearest', inline:'nearest' })`。根页面保持无横向溢出。

- [ ] **Step 5: 构建并运行布局测试**

Run: `node demos/开发者后台一期/build.mjs --module=02`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 1440px 筛选字段顶坐标一致；390px 根节点无溢出且筛选栏可横向滚动；全部测试通过或仅财务状态表测试待完成。

### Task 4: 增加合法的结算单与付款状态记录

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 建立结算单状态样例**

`statements` 增加 `reconciliationStatus`、`invoiceStatus`、`currentAction`。样例覆盖六个对账状态和五个发票状态；对账未到发票阶段时 `invoiceStatus:'none'`。

- [ ] **Step 2: 建立付款记录样例**

新增 `payments`，每条记录关联合法的已锁定结算单，并分别覆盖 11 个付款状态：

```js
const paymentStatusOrder = Object.freeze([
  'waiting_condition','waiting_invoice','pending','processing','remitted','completed',
  'failed','returned','held','carried_forward','cancelled',
]);
```

金额字段为 `amountMinor` 和 `outstandingMinor`。已完成、已结转、已取消的 `outstandingMinor` 必须为 0。

- [ ] **Step 3: 渲染两张只读记录表**

在收入摘要下方依次渲染“结算单记录”和“付款记录”。表格分别输出 `data-reconciliation-status`、`data-invoice-status` 和 `data-payment-status`，内部允许横向滚动但不产生根页面溢出。

- [ ] **Step 4: 核对摘要和记录金额**

`pendingByCurrency` 只汇总未清偿付款记录。测试将付款表 `outstandingMinor` 按币种求和，与“待结算”摘要比较；预估收入继续只使用订单队列。

- [ ] **Step 5: 运行完整浏览器测试**

Run: `node demos/开发者后台一期/build.mjs --module=02`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 全部测试 PASS，订单 8 个交易结果、对账 6 状态、发票 5 状态、付款 11 状态完整覆盖。

### Task 5: 更新截图、流程图和 PRD

**Files:**
- Modify: `tests/developer-backend/capture-publisher-data-dashboard.mjs`
- Modify: `scripts/build-publisher-data-dashboard-flow.py`
- Modify: `public/prd/publisher-data-dashboard/01-product-flow.png`
- Modify: `public/prd/publisher-data-dashboard/02-dashboard-overview.png`
- Modify: `public/prd/publisher-data-dashboard/03-order-list.png`
- Modify: `public/prd/publisher-data-dashboard/04-order-detail.png`
- Modify: `public/prd/publisher-data-dashboard/05-income-settlement.png`
- Modify: `prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md`

- [ ] **Step 1: 更新截图等待条件和视口**

经营概览等待自定义时间、具体地区和 Mac 标识；订单页等待八种交易结果；收入页等待最后一种付款状态后截图。截图视口保持 1440px，完整页面截图包含两张财务状态表。

- [ ] **Step 2: 更新 PRD 最终规则**

追加修订记录，正文同步：单行筛选、自定义时间 180 天、地区分组、Mac 固定范围、三列两行指标、交易结果派生、结算单与付款分表状态。删除平台可筛选和 Android 样例等旧定义。

- [ ] **Step 3: 生成截图和横向流程图**

Run: `node tests/developer-backend/capture-publisher-data-dashboard.mjs`

Run: `python scripts/build-publisher-data-dashboard-flow.py`

Expected: 5 张图片重新生成，文件非空；经营概览布局整齐，收入截图包含状态记录。

- [ ] **Step 4: 校验 PRD**

Run: `powershell -ExecutionPolicy Bypass -File "C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-quality.ps1" -Path "prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md"`

Expected: PASS，0 errors。

### Task 6: 精确提交、更新固定图片地址并推送

**Files:**
- Modify only files listed in Tasks 1-5 plus this implementation plan.

- [ ] **Step 1: 执行最终回归**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

Run: `node demos/开发者后台一期/build.mjs --module=02`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Run: `git diff --check -- <本计划列出的文件>`

Expected: 所有命令退出码为 0。

- [ ] **Step 2: 精确提交实现与图片**

只精确暂存本计划列出的源文件、测试、构建产物和 5 张图片。禁止 `git add .`、`git commit -a`、`git reset` 和 `git clean`。提交后记录 40 位图片提交 SHA。

- [ ] **Step 3: 更新 PRD 图片固定 SHA 并单独提交**

将第 10 份 PRD 中五张图片 URL 的提交段统一替换为图片提交 SHA，再运行质量校验和公网图片校验：

Run: `powershell -ExecutionPolicy Bypass -File "C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-images.ps1" -PrdPath "prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md" -VerifyRemote`

Expected: 5/5 公网链接返回 200 和图片 MIME；飞书转存仍单独标记为未验证。

- [ ] **Step 4: 推送并验证固定 Demo 地址**

Run: `git push origin codex/guanwanggaid-32-pc-emulator-20260819`

Expected: 推送成功；使用最终 HEAD 构造 htmlpreview 固定地址并验证 HTTP 200。

