# Operations Finance Settlement Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不覆盖原运营后台 Demo 的前提下，新增包含待付款制单、线下打款导出和付款结果回填的运营后台财务整合版。

**Architecture:** 从现有 `发行平台运营后台demo.html` 派生新入口，并在主运行时启动前注入独立 `PublisherFinanceOperations` 组件。组件自行维护演示状态、渲染两个任务型 Tab、处理导出和回填；只通过包装现有模板与壳层增加路由和导航，不修改原审核模块。

**Tech Stack:** 单文件 HTML、原生 JavaScript、CSS、Node.js 构建脚本、Node Test、Playwright Core。

---

### Task 1: 固化整合构建边界

**Files:**
- Create: `demos/开发者后台一期/build-finance-operations.mjs`
- Create: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 写构建失败用例**

```js
test('运营财务整合版新增独立入口且不覆盖原运营后台', () => {
  const before = fs.readFileSync(baseDemo);
  execFileSync(process.execPath, [buildScript]);
  assert.deepEqual(fs.readFileSync(baseDemo), before);
  assert.match(fs.readFileSync(outputDemo, 'utf8'), /P16-01/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test --test-name-pattern="不覆盖原运营后台" tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: FAIL，构建脚本或输出文件不存在。

- [ ] **Step 3: 实现独立构建脚本**

构建脚本读取原运营后台 HTML，向 `portal-routes` 加入：

```js
{ id:'P16-01', moduleId:'01', templateId:'FINANCE_OPS', role:'operations', title:'财务结算' }
```

向 `portal-data.pages` 加入 P16 页面元数据，将 `src/demo16/styles.css` 注入 `<style>`，并将 `src/demo16/model.js`、`src/demo16/app.js` 注入主应用运行时之前，输出 `发行平台运营后台财务整合demo.html`。

- [ ] **Step 4: 运行构建测试**

Run: `node --test --test-name-pattern="不覆盖原运营后台" tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: PASS；原文件字节不变，新文件包含 P16-01 且无 iframe、外部脚本和外部样式。

### Task 2: 建立结算单、批次和付款尝试模型

**Files:**
- Create: `demos/开发者后台一期/src/demo16/model.js`
- Test: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 写模型失败用例**

```js
test('同一结算单不可重复入批且跨主体币种自动拆批', async () => {
  await openFinance();
  await selectEligibleStatements(['STMT-2026-08-V1', 'STMT-2026-07-V1', 'STMT-2026-06-V1']);
  await page.getByRole('button', { name:'生成并导出打款批次' }).click();
  assert.match(await page.getByRole('dialog').innerText(), /将生成 2 个打款批次/);
});
```

- [ ] **Step 2: 运行模型测试并确认失败**

Run: `node --test --test-name-pattern="自动拆批" tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: FAIL，财务页面尚不存在。

- [ ] **Step 3: 实现模型接口**

```js
window.PublisherFinanceOperationsModel = {
  createState(), eligible(statement, state), createBatches(state, statementIds),
  recordAttempt(state, orderId, result), batchStatus(batch), exportCsv(batch)
};
```

`createBatches` 按 `entityVersion + currency + paymentMethod` 分组，写入结算单有效付款关系；`recordAttempt` 追加尝试并重新计算付款单和批次状态，不改写旧尝试。

- [ ] **Step 4: 运行模型测试**

Run: `node --test --test-name-pattern="自动拆批" tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: PASS；重复记录保持禁用，跨组选择自动拆成多个批次。

### Task 3: 实现待付款记录和制单导出

**Files:**
- Create: `demos/开发者后台一期/src/demo16/app.js`
- Create: `demos/开发者后台一期/src/demo16/styles.css`
- Test: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 写待付款页面失败用例**

```js
test('待付款记录支持筛选、勾选、生成批次和导出', async () => {
  await openFinance();
  assert.equal(await page.locator('[data-fo-statement-row]').count(), 20);
  await page.locator('[data-fo-select-statement]:not([disabled])').first().check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name:'生成并导出打款批次' }).click();
  await page.getByRole('button', { name:'确认生成并导出' }).click();
  await download;
});
```

- [ ] **Step 2: 实现页面结构与样式**

页面输出面包屑、唯一主标题、“待付款记录／打款批次”两个 Tab、筛选区、20 条分页表格和固定底部批量操作条。无英文眉题、副标题和指标卡片。

- [ ] **Step 3: 实现筛选、选择、确认和 CSV 下载**

使用 `data-fo-action` 事件委托。生成前对选中记录重新校验，确认区显示选中数量、批次数、币种和总额；生成成功后切换到“打款批次”并打开最新批次详情。

- [ ] **Step 4: 运行待付款测试**

Run: `node --test --test-name-pattern="待付款记录" tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: PASS；第一页 20 条，导出文件有批次号、结算单号、主体、完整银行字段、币种和金额。

### Task 4: 实现批次回填、失败重试和审计

**Files:**
- Modify: `demos/开发者后台一期/src/demo16/app.js`
- Modify: `demos/开发者后台一期/src/demo16/model.js`
- Modify: `demos/开发者后台一期/src/demo16/styles.css`
- Test: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 写批次详情失败用例**

```js
test('批次详情逐笔回填并保留失败重试记录', async () => {
  await openBatch('PAYB-202609-004');
  await page.getByRole('button', { name:'回填付款结果' }).click();
  await page.getByLabel('付款结果').selectOption('failed');
  await page.getByLabel('失败或退回原因').fill('收款行退回');
  await page.getByRole('button', { name:'提交结果' }).click();
  assert.match(await page.getByRole('dialog').innerText(), /第 2 次付款尝试/);
});
```

- [ ] **Step 2: 实现单层右侧半屏抽屉**

抽屉在“批次详情／结果回填”之间原位切换，不叠加第二层抽屉。详情包含批次摘要、付款单、导出记录和操作时间线。

- [ ] **Step 3: 实现结果校验和状态映射**

已汇出和已完成要求实付金额、付款时间、银行流水号、付款凭证；失败、退回和暂缓要求原因。提交后追加付款尝试，更新批次为财务处理中、部分完成或已完成，并展示对应开发者端状态。

- [ ] **Step 4: 运行批次交互测试**

Run: `node --test --test-name-pattern="批次详情" tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: PASS；旧尝试保留，终态不可覆盖，操作人和时间可回溯。

### Task 5: 完成缺省态、响应式和交付验收

**Files:**
- Modify: `demos/开发者后台一期/src/demo16/app.js`
- Modify: `demos/开发者后台一期/src/demo16/styles.css`
- Rebuild: `demos/开发者后台一期/发行平台运营后台财务整合demo.html`
- Test: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 增加 Demo 状态和响应式用例**

```js
test('默认穷举态并可切换缺省态', async () => {
  await openFinance();
  await page.locator('[data-fo-demo-toggle]').click();
  await page.locator('[data-fo-scenario="empty"]').click();
  assert.equal(await page.getByText('暂无待付款记录').isVisible(), true);
});
```

对 1440×900、1280×800、390×844 断言 `documentElement.scrollWidth === clientWidth`。

- [ ] **Step 2: 完成穷举态和缺省态**

右下角状态球默认穷举态；缺省态清空业务数据，只保留无记录说明。移动端筛选纵向排列，表格在卡片内部横向滚动，不产生页面级溢出。

- [ ] **Step 3: 构建并运行完整测试**

Run: `node demos/开发者后台一期/build-finance-operations.mjs`

Run: `node --test tests/developer-backend/operations-finance-settlement.browser.test.mjs`

Expected: 全部 PASS；原运营后台文件哈希不变，新 HTML 为单文件且可离线打开。

- [ ] **Step 4: 浏览器视觉验收**

检查 1440×900 的待付款、打款批次、详情抽屉、回填表单和缺省态；检查 390×844 页面级无溢出、按钮可见、抽屉可滚动。

- [ ] **Step 5: 提交交付文件**

```powershell
git add -- demos/开发者后台一期/src/demo16 demos/开发者后台一期/build-finance-operations.mjs demos/开发者后台一期/发行平台运营后台财务整合demo.html tests/developer-backend/operations-finance-settlement.browser.test.mjs docs/superpowers/specs/2026-09-14-operations-finance-settlement-demo-design.md docs/superpowers/plans/2026-09-14-operations-finance-settlement-demo.md
git commit -m "feat: add operations finance settlement demo"
git push origin HEAD
```

Expected: 只提交本次新文件；当前工作区其他未提交改动保持不变。
