# 发行平台站内转化数据看板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在统一 02 单游戏数据看板中补齐站内曝光到履约的转化链路，精简页头，同步可执行 PRD、页面截图与固定 Git 地址。

**Architecture:** 继续由 `PublisherDataDashboard` 独立组件维护 Demo 状态。新增转化数据集和纯聚合函数，公共筛选驱动转化与交易区，履约方式和订单状态只驱动交易区；统一 02 仅负责当前 Game ID、语言和权限上下文。

**Tech Stack:** 原生 JavaScript、CSS、单文件 HTML 构建器、Node.js `node:test`、Playwright、Markdown PRD、PowerShell 校验脚本。

---

### Task 1: 用浏览器测试锁定页头、漏斗和筛选边界

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

- [ ] **Step 1: 修改页头断言并添加七步漏斗断言**

在“经营数据位于单游戏控制台并锁定当前游戏”用例中，用以下断言替换旧的游戏上下文检查：

```js
assert.equal(await dashboard.locator('.publisher-dashboard-head h1').innerText(), '数据看板');
assert.equal(await dashboard.locator('.publisher-dashboard-head > div:first-child > span').count(), 0);
assert.equal(await dashboard.locator('.publisher-dashboard-game-context').count(), 0);
assert.equal(await dashboard.locator('.publisher-dashboard-head p').count(), 0);
assert.deepEqual(
  await dashboard.locator('[data-conversion-stage]').allTextContents(),
  ['有效曝光', '游戏卡点击', '详情页访问', '购买／领取点击', '创建订单', '成功获取', '履约成功'],
);
```

- [ ] **Step 2: 添加固定转化快照断言**

```js
const conversion = await page.evaluate(() => window.PublisherDataDashboard.snapshot(
  window.PublisherDataDashboard.createState(),
).conversion);
assert.deepEqual(conversion.stages.map(item => [item.key, item.uv]), [
  ['impression', 50000],
  ['card_click', 15000],
  ['detail_view', 12500],
  ['cta_click', 3750],
  ['order_create', 3180],
  ['acquisition_success', 2862],
  ['fulfillment_success', 2776],
]);
assert.equal(conversion.overallRate, 0.05724);
```

- [ ] **Step 3: 添加来源分析和分区筛选断言**

```js
assert.deepEqual(
  await dashboard.locator('[data-conversion-source]').allTextContents(),
  ['首页推荐', '找游戏', '排行榜', '搜索', '专题活动', '站外活动', '自然直达', '其他'],
);
assert.equal(await dashboard.locator('[data-dashboard-filter="source"]').count(), 1);
assert.equal(await dashboard.locator('[data-dashboard-filter="fulfillment"]').count(), 0);
assert.equal(await dashboard.locator('[data-dashboard-filter="status"]').count(), 0);
```

切到订单明细后断言 `fulfillment`、`status` 重新出现，并验证选择它们不会改变 `snapshot(state).conversion`。

- [ ] **Step 4: 添加趋势切换和移动端断言**

```js
await dashboard.locator('[data-conversion-trend-metric="detail_view"]').click();
assert.equal(await dashboard.locator('[data-conversion-trend]').getAttribute('data-active-metric'), 'detail_view');
assert.deepEqual(await horizontalOverflow(page), { document: 0, body: 0 });
```

- [ ] **Step 5: 运行测试确认先失败**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: FAIL，缺少 `data-conversion-stage`、`data-conversion-source` 或 `source` 筛选。

### Task 2: 增加站内转化数据模型与纯计算

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

- [ ] **Step 1: 拆分公共筛选和交易筛选**

```js
const defaultFilters = Object.freeze({
  range:'30d', product:'all', source:'all', region:'all', platform:'all',
  fulfillment:'all', status:'all', keyword:'',
});
const publicFilterKeys = Object.freeze(['range', 'product', 'source', 'region', 'platform']);
const transactionFilterKeys = Object.freeze(['fulfillment', 'status', 'keyword']);
```

`renderFilters` 在经营概览只渲染 `publicFilterKeys`，订单明细和收入结算再追加交易筛选。当前游戏继续由 `options.game` 固定，不增加游戏下拉框。

- [ ] **Step 2: 添加固定转化阶段与来源样例**

```js
const conversionStages = Object.freeze([
  { key:'impression', uv:50000, previousUv:46200 },
  { key:'card_click', uv:15000, previousUv:13420 },
  { key:'detail_view', uv:12500, previousUv:11280 },
  { key:'cta_click', uv:3750, previousUv:3260 },
  { key:'order_create', uv:3180, previousUv:2790 },
  { key:'acquisition_success', uv:2862, previousUv:2488 },
  { key:'fulfillment_success', uv:2776, previousUv:2416 },
]);
const conversionSources = Object.freeze([
  { key:'home', impression:18200, click:6010, detail:5230, acquired:1270 },
  { key:'discovery', impression:9200, click:2480, detail:2110, acquired:430 },
  { key:'ranking', impression:7100, click:2050, detail:1740, acquired:360 },
  { key:'search', impression:6800, click:2750, detail:2250, acquired:510 },
  { key:'campaign', impression:5100, click:1320, detail:1080, acquired:210 },
  { key:'external', impression:3600, click:390, detail:340, acquired:62 },
  { key:'direct', impression:null, click:null, detail:960, acquired:18 },
  { key:'other', impression:0, click:0, detail:0, acquired:2 },
]);
```

最后一行用于对齐总成功获取 UV；UI 对零分母显示 `--`，不得显示 `0%`。

- [ ] **Step 3: 实现转化快照函数**

```js
const safeRate = (numerator, denominator) => denominator > 0 ? numerator / denominator : null;
const conversionSnapshot = state => {
  const filters = state.filters || defaultFilters;
  const sources = conversionSources.filter(item => filters.source === 'all' || item.key === filters.source);
  const stages = filters.source === 'all'
    ? conversionStages.map(item => ({ ...item }))
    : deriveStagesFromSources(sources);
  return {
    stages: stages.map((item, index) => ({
      ...item,
      stepRate: index ? safeRate(item.uv, stages[index - 1].uv) : null,
      changeRate: safeRate(item.uv - item.previousUv, item.previousUv),
    })),
    sources,
    overallRate: safeRate(
      stages.find(item => item.key === 'acquisition_success')?.uv,
      stages.find(item => item.key === 'impression')?.uv,
    ),
  };
};
```

`snapshot(state)` 返回 `{ rows, metrics, conversion }`。履约方式、订单状态和关键字不得传入 `conversionSnapshot` 的聚合条件。

- [ ] **Step 4: 运行语法检查**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

Expected: PASS，退出码 0。

### Task 3: 渲染转化漏斗、来源分析和精简页头

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 精简页头**

将页头模板改为：

```js
`<header class="publisher-dashboard-head">
  <h1>${c.title}</h1>
  <div>
    <button type="button" data-dashboard-action="scope">${c.scope}</button>
    ${tag(c.readonly, 'info')}
    <small>${c.updated}</small>
  </div>
</header>`
```

不再渲染 `c.eyebrow`、`gameContext` 或 `c.description`；面包屑继续承担游戏上下文。

- [ ] **Step 2: 渲染七步漏斗**

新增 `renderConversionFunnel(conversion, language)`，每一步输出 `data-conversion-stage`，显示 UV、步骤转化率和环比；连接线用 CSS 伪元素绘制。总转化率只使用 `acquisition_success ÷ impression`。

- [ ] **Step 3: 渲染来源分析表**

新增 `renderConversionSources(conversion, language)`，表格列固定为来源位置、曝光 UV、点击 UV、详情访问 UV、成功获取 UV、点击率、获取转化率。`null` 与零分母显示 `--`；来源行输出 `data-conversion-source`。

- [ ] **Step 4: 渲染可切换趋势**

状态新增 `trendMetric:'impression'`。趋势按钮枚举 `impression`、`detail_view`、`cta_click`、`acquisition_success`，点击 `data-conversion-trend-metric` 后仅更新组件状态并重绘趋势。

- [ ] **Step 5: 增加桌面和窄屏样式**

```css
.publisher-conversion-funnel { display:grid; grid-template-columns:repeat(7,minmax(116px,1fr)); gap:12px; overflow-x:auto; }
.publisher-conversion-stage { position:relative; min-width:116px; padding:16px; border:1px solid #e4e7ec; border-radius:10px; background:#fff; }
.publisher-conversion-stage strong { display:block; margin:8px 0 4px; font-size:22px; font-variant-numeric:tabular-nums; }
.publisher-conversion-source-table { max-width:100%; overflow-x:auto; }
@media (max-width:720px) {
  .publisher-dashboard-head { align-items:flex-start; gap:12px; flex-direction:column; }
  .publisher-conversion-funnel { grid-template-columns:repeat(7,136px); }
}
```

表格最小宽度只作用于内部滚动容器，390px 页面根节点不得横向溢出。

- [ ] **Step 6: 构建并运行浏览器测试**

Run: `node demos/开发者后台一期/build.mjs --module=02`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 构建成功，全部子测试 PASS。

### Task 4: 更新 PRD、埋点和页面证据

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md`
- Modify: `tests/developer-backend/capture-publisher-data-dashboard.mjs`
- Modify: `public/prd/publisher-data-dashboard/01-product-flow.png`
- Modify: `public/prd/publisher-data-dashboard/02-dashboard-overview.png`
- Preserve: `public/prd/publisher-data-dashboard/03-order-list.png`
- Preserve: `public/prd/publisher-data-dashboard/04-order-detail.png`
- Preserve: `public/prd/publisher-data-dashboard/05-income-settlement.png`

- [ ] **Step 1: 用 `/to-prd` 更新修订记录、流程和经营概览六要素**

追加 V1.2 修订记录，正文只保留最终行为：页头只显示“数据看板”；经营概览先展示七步转化、来源分析与趋势，再展示原交易结果；说明漏斗按入口时间、交易按履约完成时间。

- [ ] **Step 2: 补齐指标与埋点**

新增指标 `有效曝光 UV`、`游戏卡点击 UV`、`详情页访问 UV`、`购买／领取点击 UV`、`创建订单 UV`、`成功获取 UV`、`履约成功 UV` 和逐层比率。新增或改造事件：

```text
publisher_conversion_view
publisher_conversion_filter_change
publisher_conversion_trend_metric_click
publisher_conversion_source_view
```

事件参数统一使用 `vendor_id, game_id, time_range, product_type, source_position, region_scope, platform, metric_name, data_cutoff_at, result`；订单页事件保留 `fulfillment_type` 和 `order_status`，转化事件不得携带这两个后置筛选作为聚合条件。

- [ ] **Step 3: 更新截图脚本并重新截图**

`capture-publisher-data-dashboard.mjs` 等待 `[data-conversion-stage="fulfillment_success"]` 和 `[data-conversion-source="direct"]` 后再截取 `02-dashboard-overview.png`。产品流程图改为“站内曝光→详情承接→创建订单→成功获取→成功履约→查看交易／对账”的单张横向图。

Run: `node tests/developer-backend/capture-publisher-data-dashboard.mjs`

Expected: 5 张 PNG 存在且尺寸大于 10 KB，其中经营概览可见七步漏斗和来源分析。

- [ ] **Step 4: 更新固定 SHA 图片链接**

先精确提交 Demo、测试和图片，取得 40 位提交 SHA；再把 PRD 图片 URL 更新为：

先运行 `git rev-parse HEAD` 取得完整 40 位提交 SHA，再将 PRD 中 `public/prd/publisher-data-dashboard/` 下五张图片 URL 的提交段统一替换为该 SHA；路径和文件名保持截图脚本实际输出值。

- [ ] **Step 5: 执行 PRD 校验**

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path "prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md"`

Run: `powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath "prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md" -VerifyRemote`

Expected: 两项均通过；远程校验只代表公网可访问，最终说明“飞书转存未验证”。

### Task 5: 最终回归、精确提交并推送

**Files:**
- Modify only files listed in Tasks 1-4 plus this plan and the approved design spec.

- [ ] **Step 1: 执行完整回归**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

Run: `node demos/开发者后台一期/build.mjs --module=02`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Run: `git diff --check -- "demos/开发者后台一期/src/runtime/publisher-data-dashboard.js" "demos/开发者后台一期/src/styles/publisher-data-dashboard.css" "demos/开发者后台一期/02-游戏创建与发行demo.html" "tests/developer-backend/publisher-data-dashboard.browser.test.mjs" "tests/developer-backend/capture-publisher-data-dashboard.mjs" "prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md"`

Expected: 全部退出码为 0。

- [ ] **Step 2: 精确暂存并提交**

只精确暂存 `publisher-data-dashboard.js`、`publisher-data-dashboard.css`、构建后的 `02-游戏创建与发行demo.html`、两份测试脚本、五张 `public/prd/publisher-data-dashboard/` 图片、本计划及第 10 份 PRD；禁止 `git add .`、`git commit -a`、`git reset` 和 `git clean`。提交前使用 `git diff --cached --name-only` 确认没有其他任务文件。

- [ ] **Step 3: 推送当前分支并生成固定地址**

Run: `git push origin codex/guanwanggaid-32-pc-emulator-20260819`

Expected: 远端包含最终提交；把 40 位 HEAD 写入 htmlpreview 与 jsDelivr 固定链接，并验证 HTTP 200。
