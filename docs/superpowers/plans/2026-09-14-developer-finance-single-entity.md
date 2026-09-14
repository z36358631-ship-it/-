# Developer Finance Single-Entity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将开发者财务页收敛为单主体配置，并按结算月和游戏展示美元总额与人民币参考额。

**Architecture:** 保持共享不可变账本和运营端聚合不变，在 `demo15` 内增加开发者视角的月度聚合层。财务主体页只渲染当前主体；结算页根据“月份＋游戏”筛选后聚合，详情继续从共享账本读取支付商、税费和汇率事实。

**Tech Stack:** 单文件 HTML 构建脚本、原生 JavaScript、CSS、Node.js Test Runner、Playwright Core。

---

### Task 1: 锁定开发者端交互契约

**Files:**
- Modify: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Modify: `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`

- [ ] **Step 1: 写入失败用例**

```js
test('开发者只有一个财务主体且主体页采用配置详情结构', async () => {
  await open('/P15-01');
  assert.equal(await page.locator('[data-d15-entity-summary]').count(), 1);
  assert.equal(await page.locator('[data-d15-entity-details]').count(), 1);
  assert.doesNotMatch(await page.locator('[data-testid="developer-finance-demo"]').innerText(), /主体列表|选择财务主体/);
});

test('月度结算只按月份和游戏筛选并显示人民币参考额', async () => {
  await open('/P15-02');
  assert.deepEqual(await page.locator('[data-d15-filter]').evaluateAll(nodes => nodes.map(node => node.dataset.d15Filter)), ['month','game']);
  assert.equal(await page.locator('[data-testid="settlement-table"] tbody tr').count(), 3);
  assert.equal(await page.locator('[data-testid="settlement-table"] tbody td').filter({ hasText:/USD/ }).count(), 0);
  assert.match(await page.locator('[data-d15-cny-reference]').first().innerText(), /约 ¥/);
});
```

- [ ] **Step 2: 运行用例并确认失败**

Run: `node --test tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`

Expected: FAIL，原因是旧页面仍有主体/币种筛选、金额重复显示 `USD`，且没有人民币参考额。

### Task 2: 实现单主体页和开发者月度聚合

**Files:**
- Modify: `demos/开发者后台一期/src/demo15/app.js`

- [ ] **Step 1: 增加开发者视角的格式化与月度聚合**

```js
const usd = minor => `$${(Number(minor || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const lockedUsdCnyRate = month => ({ '2026-08':7.12, '2026-07':7.18, '2026-06':7.16 }[month] || 7.12);
const cnyReference = row => `约 ¥${(row.payableMinor / 100 * lockedUsdCnyRate(row.month)).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const visibleSettlements = () => aggregateByMonth(ledger.transactionsFor(state.ledgerState, {
  developer:'星海互动',
  month:state.filters.month,
  gameId:state.filters.game,
}));
```

- [ ] **Step 2: 将财务主体页改为单主体配置结构**

```html
<section class="d15-entity-summary" data-d15-entity-summary>
  <h2>财务主体、收款资料与审核状态</h2>
  <div class="d15-entity-statuses">审核状态、配置状态、主体类型</div>
</section>
<section data-d15-entity-details>
  <header><h2>财务主体资料</h2><button>查看变更历史</button><button>修改</button></header>
  <div>企业名称、注册地址、财务联系人、开户银行、银行账号、税务居民地、税号、结算币种</div>
</section>
```

- [ ] **Step 3: 将结算筛选收敛为月份和游戏**

```js
state.filters = { month:'all', game:'all' };
```

游戏选项从当前开发者的账本事件去重生成。默认“全部游戏”，选择单款游戏后重新聚合并重置为第一页。

- [ ] **Step 4: 更新列表和详情金额**

金额列标题标明“金额（USD）”；普通金额显示 `$63,642.00`，应结算金额增加 `<small data-d15-cny-reference>约 ¥292,413.24</small>`。交易原币仍保留币种代码，避免丢失支付事实。

- [ ] **Step 5: 更新导出**

导出当前筛选后的月度记录，字段包含结算月、游戏范围、美元金额、人民币参考额和锁定汇率；不再导出主体筛选结果。

### Task 3: 对齐参考图布局

**Files:**
- Modify: `demos/开发者后台一期/src/demo15/styles.css`
- Modify: `demos/开发者后台一期/src/styles/publisher-finance.css`

- [ ] **Step 1: 实现单主体卡片层级**

状态摘要使用白底卡片和浅灰状态条；主体资料使用单张宽卡片，两列字段布局，操作位于标题右侧。

- [ ] **Step 2: 压缩结算表格宽度**

删除主体和币种列后，将主表最小宽度控制在 `1180px`；窄屏继续使用表格区域内部横向滚动，不产生根页面横向溢出。

- [ ] **Step 3: 补充双币金额样式**

```css
.d15-payable strong { color:#175cd3; }
.d15-payable small { display:block; margin-top:5px; color:#667085; font-weight:500; }
```

### Task 4: 构建并回归

**Files:**
- Rebuild: `demos/开发者后台一期/15-开发者财务结算demo.html`
- Rebuild: `demos/开发者后台一期/开发者平台财务整合demo.html`
- Test: `tests/developer-backend/build.test.mjs`
- Test: `tests/developer-backend/developer-finance-settlement.browser.test.mjs`
- Test: `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`
- Test: `tests/developer-backend/operations-finance-settlement.browser.test.mjs`

- [ ] **Step 1: 构建两份开发者 Demo**

Run:

```powershell
node demos/开发者后台一期/build-next.mjs
node demos/开发者后台一期/build.mjs --module=02 --variant=finance-integrated
```

Expected: 两份开发者财务 HTML 成功生成，且每份只注入一次共享账本。

- [ ] **Step 2: 执行完整回归**

Run:

```powershell
node --test tests/developer-backend/build.test.mjs tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs tests/developer-backend/operations-finance-settlement.browser.test.mjs
```

Expected: 全部 PASS；运营端主体汇总、游戏明细和导出行为不变。

- [ ] **Step 3: 视觉检查**

检查 1440×900、1280×800 和 390×844：财务主体卡片层级正确，主表不挤压，人民币参考额不换行错位，根页面无横向溢出。

- [ ] **Step 4: 提交**

```powershell
git add -- demos/开发者后台一期/src/demo15/app.js demos/开发者后台一期/src/demo15/styles.css demos/开发者后台一期/src/styles/publisher-finance.css demos/开发者后台一期/15-开发者财务结算demo.html demos/开发者后台一期/开发者平台财务整合demo.html tests/developer-backend/developer-finance-settlement.browser.test.mjs tests/developer-backend/developer-platform-finance-integration.browser.test.mjs
git commit -m "feat: simplify developer finance settlement view"
```
