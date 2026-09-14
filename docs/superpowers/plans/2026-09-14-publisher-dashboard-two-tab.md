# Publisher Dashboard Two-Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单游戏数据看板改为“曝光转化／用户数据”双页签，并实现双月日期选择器和逐指标定义。

**Architecture:** 在既有 `publisher-data-dashboard.js` 内保留交易与财务数据 API，仅替换可见页签、时间选择和分析渲染；筛选状态继续由单一 `state` 管理，并新增日历草稿与指标定义状态。CSS 继续使用独立看板样式文件，浏览器测试以 DOM 契约和真实交互覆盖改版。

**Tech Stack:** 单文件原生 JavaScript、CSS、Node.js、Playwright Core、Node test runner。

---

### Task 1: 固化双页签和时间状态契约

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

- [ ] **Step 1: 写失败测试**

断言页签只有 `conversion`、`users`，`createState({tab:'orders'})` 迁移为 `conversion`，页头不存在“数据口径”“只读经营数据”。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: FAIL，旧页签和旧页头仍存在。

- [ ] **Step 3: 实现最小状态迁移和双页签渲染**

将可见页签字典改为：

```js
tabs:{ conversion:'曝光转化', users:'用户数据' }
```

初始化时执行：

```js
const normalizeTab = tab => ['conversion','users'].includes(tab) ? tab : 'conversion';
```

页头只保留标题和更新时间。

- [ ] **Step 4: 运行目标测试**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 双页签及迁移用例 PASS。

### Task 2: 实现快捷周期和双月日历

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 写时间交互失败测试**

覆盖昨日、今日、近 7 天、近 30 天、上月、本月的精确起止日；打开双月日历，选择跨月区间后应用；取消和 Esc 不提交；未来日期和超过 180 天不可应用。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: FAIL，当前仍是下拉框和两个原生日期输入框。

- [ ] **Step 3: 实现时间模型与日历**

新增 `calendarMonth`、`dateSelectionPhase`、`draftDateRange`，用 `renderCalendarMonth()` 输出连续两个月日期按钮；快捷周期调用统一 `applyPresetRange()`，自定义仅在“应用”后更新 `filters`。

- [ ] **Step 4: 补充日历样式和窄屏降级**

桌面浮层采用左侧快捷列表和右侧双月日历；窄屏改为纵向单月，禁用未来日期并清楚标出开始、结束和区间。

- [ ] **Step 5: 运行目标测试**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 时间交互用例 PASS。

### Task 3: 实现曝光转化与用户数据

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 写页签内容和筛选作用域失败测试**

断言曝光转化包含商品、来源、地区；用户数据仅包含时间、地区；切换后保留时间和地区；用户指标与趋势随时间或地区变化。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: FAIL，用户数据尚未实现。

- [ ] **Step 3: 收敛曝光转化内容**

保留七步漏斗、总转化率、趋势和来源分析，停止渲染交易经营结果、订单和结算内容。

- [ ] **Step 4: 实现用户数据快照和趋势**

新增 `userSnapshot(state)`，返回活跃玩家、新增玩家、D1／D3／D7 留存、平均时长及活跃／新增趋势；只读取时间、地区和固定 Mac。

- [ ] **Step 5: 运行目标测试**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 页签、筛选作用域和用户数据用例 PASS。

### Task 4: 实现逐指标问号定义

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [ ] **Step 1: 写可访问性失败测试**

遍历所有 `[data-metric-definition]`，断言对应按钮、`aria-describedby`、`role="tooltip"`；验证 hover、focus、click 和 Esc。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: FAIL，当前只有整页口径弹窗。

- [ ] **Step 3: 实现定义字典与问号组件**

新增 `metricDefinitions` 和 `metricLabel()`，每项定义包含定义、公式或计算、去重、统计时点；点击状态写入 `activeDefinition`。

- [ ] **Step 4: 实现浮层交互与样式**

问号支持 hover、focus-within 和点击固定；点击其他问号、外部或 Esc 关闭；浮层不遮挡关键指标。

- [ ] **Step 5: 运行目标测试**

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 所有指标定义和可访问性用例 PASS。

### Task 5: 重建、截图与完整验证

**Files:**
- Modify: `tests/developer-backend/capture-publisher-data-dashboard.mjs`
- Modify: `demos/开发者后台一期/02-游戏创建与发行demo.html`
- Modify: `public/prd/publisher-data-dashboard/02-dashboard-overview.png`
- Modify: `public/prd/publisher-data-dashboard/03-order-list.png`
- Modify: `public/prd/publisher-data-dashboard/04-order-detail.png`
- Modify: `public/prd/publisher-data-dashboard/05-income-settlement.png`
- Modify: `prd/发行平台专项/开发者后台PRD/10-开发者经营数据看板PRD.md`

- [ ] **Step 1: 更新截图脚本**

截图调整为曝光转化、双日历、指标定义和用户数据四张证据图，不再点击订单与收入页签。

- [ ] **Step 2: 更新 PRD 最终规则和图示**

PRD 改为两个页面状态、时间控件、筛选作用域和指标定义；删除看板内订单与结算规则。

- [ ] **Step 3: 重建主 Demo**

Run: `node demos/开发者后台一期/build.mjs --module=02`

Expected: `02-游戏创建与发行demo.html` 构建成功。

- [ ] **Step 4: 运行完整验证**

Run: `node --check demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

Run: `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

Expected: 全部测试 PASS。

- [ ] **Step 5: 生成并视觉检查截图**

Run: `node tests/developer-backend/capture-publisher-data-dashboard.mjs`

Expected: 四张截图生成，布局与交互状态完整。

- [ ] **Step 6: 精确提交并推送**

只提交本计划列出的源文件、构建产物、截图和 PRD，使用固定提交 SHA 更新图片链接，再推送当前分支。
