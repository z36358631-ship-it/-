# Publisher Dashboard Metric Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将单游戏数据看板改为双页签指标卡下钻 Demo，并完成按日图表、表格、刷新、全屏和 CSV 导出交互。

**Architecture:** 在现有 `PublisherDataDashboard` 单模块中增加指标注册表、完整日期枚举和两类逐日数据模型。指标卡、图表、表格和 CSV 统一从详情模型读数，以确保指标口径与筛选状态一致。

**Tech Stack:** 原生 JavaScript、CSS、单文件 HTML 构建、Node.js `node:test` + Playwright Core。

---

### Task 1: 使用自动化测试锁定新页面结构

**Files:**
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

- [x] 写入「站内转化」和「来源分析」不存在、「新增预约用户数」存在的断言。
- [x] 写入两页签所有指标可点击并切换共享详情的断言。
- [x] 写入详情图表／表格、刷新、全屏／Esc 和 CSV 导出断言。
- [x] 写入近 30 天必须有 30 行、今日必须只有 1 行的断言。
- [x] 运行 `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`，预期新断言失败。

### Task 2: 建立指标和逐日数据模型

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`

- [x] 实现 `enumerateDates(startDate,endDate)`，返回起止日内每个 ISO 日期。
- [x] 实现曝光转化和用户数据的指标注册表。
- [x] 实现 `dailyConversionRows(state)` 和 `dailyUserRows(state)`，对筛选区间生成完整日数据。
- [x] 实现 `detailModel(state,language)`，将当前指标统一转换为图表、表格和导出所需数据。
- [x] 计算区间卡片时，UV 用区间去重模型，转化率用区间分子除分母；留存根据每个 cohort 日判断成熟度。

### Task 3: 替换看板内容与交互

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`

- [x] 移除漏斗和来源表渲染，保留原单行筛选。
- [x] 将所有指标卡改为可选中结构，保留独立的问号按钮与选中态。
- [x] 增加共享详情面板，实现折线图、逐日表格和单指标口径说明。
- [x] 实现图表／表格切换、刷新加载态、固定定位全屏及 Esc 退出。
- [x] 实现带 UTF-8 BOM 的 CSV 导出，文件名和内容包含当前游戏、页签、指标、日期和筛选。

### Task 4: 构建、回归与视觉验收

**Files:**
- Modify: `demos/开发者后台一期/02-游戏创建与发行demo.html`
- Test: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

- [x] 运行 `node "demos/开发者后台一期/build.mjs" --module=02` 重新生成单文件 Demo。
- [x] 运行 `node --test tests/developer-backend/publisher-data-dashboard.browser.test.mjs`，验证 02 数据看板专项用例全部通过。
- [x] 在 1440×900 和 390×844 下截图，检查指标选中、详情对齐、小屏滚动和全屏布局。
- [x] 仅暂存本轮 Demo、样式、测试和设计／实施记录，提交并推送当前分支。

### Task 5: 校正筛选、获取口径与悬浮交互

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-data-dashboard.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-data-dashboard.css`
- Modify: `tests/developer-backend/publisher-data-dashboard.browser.test.mjs`

- [x] 移除商品类型筛选，并保证历史隐藏值不再影响看板数据。
- [x] 指标问号改为鼠标悬浮直接显示，保留键盘聚焦和 Esc 关闭能力。
- [x] 图表增加每日数据点悬浮卡，显示日期、指标名称和数值，并明确标注数据粒度为日。
- [x] 新增预约用户数移到详情页访问前，将预约、下载或成功启动的周期去重并集定义为成功获取。
- [x] 移除独立履约成功指标，与成功获取用户数合并。
- [x] 运行 02 专项浏览器测试，覆盖筛选移除、悬浮交互、日粒度和新口径。
