# Task Center and Redemption Store Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把任务中心与兑换商城更新为 GameHub 最新竖屏样式，统一盖世积分口径，保留虚拟/实物兑换履约，并交付可固定到 Git SHA 的 PRD 与截图。

**Architecture:** 前台继续使用离线单文件 HTML，以显式 `data-view` 和 `data-action` 组织页面与交互状态；后台只修正资产口径，不重做未在本轮授权的桌面布局。验证脚本用 Playwright 在本地 Chrome 中覆盖核心交互并生成 PRD 图。

**Tech Stack:** HTML5、CSS3、Vanilla JavaScript、Node.js、`playwright-core`、Markdown、Git。

---

### Task 1: 锁定设计、范围和资产合同

**Files:**
- Create: `docs/superpowers/specs/2026-09-10-task-center-redemption-store-refresh-design.md`
- Create: `docs/superpowers/plans/2026-09-10-task-center-redemption-store-refresh.md`

- [ ] **Step 1: 记录方案 A 和 Figma 证据限制**

写入“只更新竖屏、保留旧商品/地址/物流、按 X-03 与核心组件契约实现、不声称像素级还原”。

- [ ] **Step 2: 锁定资产矩阵**

```text
任务中心 -> GAISHI_POINT -> 盖世积分 -> 本兑换商城
充值 -> GAISHI_COIN/RECHARGE -> 充值盖世币 -> 不可兑换京东卡
发行结算 -> GAISHI_COIN/PUBLISHER_REWARD -> 可兑换盖世币 -> 京东电子卡
```

- [ ] **Step 3: 检查文档不含占位符**

Run: `rg -n "T[B]D|T[O]DO|implement[ ]later|fill[ ]in[ ]details" docs/superpowers/specs/2026-09-10-task-center-redemption-store-refresh-design.md docs/superpowers/plans/2026-09-10-task-center-redemption-store-refresh.md`

Expected: no matches.

### Task 2: 重做竖屏前台 Demo

**Files:**
- Modify: `demos/任务中心demo.html`

- [ ] **Step 1: 先写静态合同检查**

要求 Demo 同时包含以下稳定选择器：

```js
const requiredSelectors = [
  '[data-demo-root]', '[data-view="tasks"]', '[data-view="store"]',
  '[data-view="points"]', '[data-view="orders"]', '[data-view="rules"]',
  '[data-action="claim"]', '[data-action="open-store"]',
  '[data-action="open-product"]', '[data-dialog="redeem"]'
];
```

- [ ] **Step 2: 实现 `C-SHELL-P` 页面结构与样式**

使用 `390×844` 竖屏容器、深色背景、高对比文字、橙色主操作和不小于 `44px` 的触摸目标；只用内联 SVG 和 CSS 图形，不请求远程图片。

- [ ] **Step 3: 实现页面与业务状态**

```js
const state = {
  view: 'tasks',
  points: 5000,
  taskTab: 'daily',
  storeTab: 'all',
  pointTab: 'income',
  selectedProductId: null,
  pendingAddressOrderId: null
};
```

每日/成长任务覆盖去完成、可领取和已完成；商品覆盖可兑换、余额不足、库存不足；订单覆盖已发放、待填地址、待发货和已发货。

- [ ] **Step 4: 实现核心交互**

```js
function showView(id) {
  state.view = id;
  document.querySelectorAll('[data-view]').forEach((view) => {
    view.classList.toggle('is-active', view.dataset.view === id);
  });
}
```

领取更新积分和流水；虚拟商品兑换后生成已发放记录；实物商品兑换后生成待填地址记录并打开地址表单；库存或积分不足时不改账。

- [ ] **Step 5: 验证离线资源**

Run: `rg -n "https?://|dicebear|<script[^>]+src=|<img[^>]+src=" demos/任务中心demo.html`

Expected: no remote image or script dependency; text-only links in documentation content are not present in the demo.

### Task 3: 统一 B 端盖世积分口径

**Files:**
- Modify: `demos/任务中心后台demo.html`

- [ ] **Step 1: 修正任务和商品字段**

```text
单次奖励(盖世币) -> 单次奖励（盖世积分）
新增盖世币任务 -> 新增盖世积分任务
消耗的盖世币数量 -> 消耗的盖世积分数量
订单消耗：N 盖世币 -> 订单消耗：N 盖世积分
```

- [ ] **Step 2: 保留实物订单履约**

确认待填地址、待发货、已发货、物流公司和单号操作未被删除。

- [ ] **Step 3: 扫描冲突口径**

Run: `rg -n "盖世币" demos/任务中心demo.html demos/任务中心后台demo.html`

Expected: only rules that explicitly contrast `盖世积分` with publisher-plan `盖世币`; no task reward, price or order field uses `盖世币`.

### Task 4: 生成截图与产品流程图

**Files:**
- Create: `tools/verify-task-center-v2.mjs`
- Create: `public/prd/task-center-v2/00-product-flow.png`
- Create: `public/prd/task-center-v2/01-task-center.png`
- Create: `public/prd/task-center-v2/02-redemption-store.png`
- Create: `public/prd/task-center-v2/03-redeem-confirm.png`
- Create: `public/prd/task-center-v2/04-redemption-records.png`
- Create: `public/prd/task-center-v2/05-points-rules.png`
- Create: `docs/evidence/task-center-v2/verification.json`

- [ ] **Step 1: 实现 Playwright 验证器**

```js
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
];
```

验证器打开本地 `file://` Demo，断言无 `pageerror`、无失败资源、核心选择器存在，依次测试领取、切 Tab、打开商城、打开确认、兑换、地址和规则。

- [ ] **Step 2: 生成 5 张页面图**

使用 `page.locator('[data-demo-root]').screenshot()` 保留完整竖屏容器；截图前通过稳定选择器进入对应状态。

- [ ] **Step 3: 生成横向单图产品流程**

```text
进入任务中心 -> 完成/领取任务 -> 盖世积分入账 -> 浏览兑换商城
  -> 确认兑换 -> 虚拟权益发放 / 实物补地址 -> 查看兑换记录
```

在浏览器中渲染独立横向 DOM，导出 `00-product-flow.png`，禁止用竖图拼接冒充流程图。

- [ ] **Step 4: 运行验证**

Run: `node tools/verify-task-center-v2.mjs`

Expected: `PASS: task center v2 static, interaction, flow and screenshot verification completed`.

### Task 5: 重写可导入飞书的 PRD

**Files:**
- Modify: `prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md`

- [ ] **Step 1: 建立简洁五章结构**

```text
1. 项目概述
2. 产品流程
3. 需求详述（C/B 分端，页面六要素）
4. 埋点与指标
5. 上线前必须确认
```

- [ ] **Step 2: 写入页面六要素**

每页表格固定包含：功能简介、场景描述、输入/前置条件、需求描述（图示+详细+展示+交互）、输出/后置条件、补充说明。

- [ ] **Step 3: 定义埋点事件和参数**

```text
task_center_view
task_action_click
task_reward_claim_result
points_store_view
points_product_click
points_redeem_submit
points_redeem_result
points_order_view
```

公共参数与事件表字段名逐字一致，包含 `task_id`、`task_type`、`point_amount`、`product_id`、`product_type`、`point_cost`、`order_id`、`result`、`failure_reason`。

- [ ] **Step 4: 图片链接替换为固定 SHA**

在截图提交存在后，先运行 `git rev-parse HEAD`，再用返回的真实 40 位 SHA 构造 `https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@` + SHA + `/public/prd/task-center-v2/01-task-center.png`。不使用分支名或相对路径作为最终飞书图片链接。

- [ ] **Step 5: 扫描 PRD 冲突口径**

Run: `rg -n "做任务赚盖世币|普通任务奖励盖世币|P0|P1|T[O]DO|T[B]D" prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md`

Expected: only the explicit rule saying task-center points and publisher-plan coins are separate and points cannot redeem JD cards; no priority matrix or placeholder remains.

### Task 6: 回归、提交、固定链接与推送

**Files:**
- Modify: `prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md`
- Modify: `prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md`

- [ ] **Step 1: 运行全量本轮验证**

Run: `node tools/verify-task-center-v2.mjs`

Expected: PASS with zero page errors, zero failed local resources and all interaction assertions passing.

- [ ] **Step 2: 确认只包含本轮文件**

Run: `git status --short`

Expected: `.tmp/` and the existing workflow lock remain untracked and are not staged; modified files are limited to this plan, spec, task-center demos, PRD, verification script, evidence and generated PRD images.

- [ ] **Step 3: 提交 Demo 、截图与验证**

Run: `git add docs/superpowers/specs/2026-09-10-task-center-redemption-store-refresh-design.md docs/superpowers/plans/2026-09-10-task-center-redemption-store-refresh.md demos/任务中心demo.html demos/任务中心后台demo.html tools/verify-task-center-v2.mjs public/prd/task-center-v2 docs/evidence/task-center-v2 && git commit -m "feat: refresh task center and points store"`

Expected: a commit containing the interactive demo and six immutable image candidates.

- [ ] **Step 4: 将截图提交 SHA 写入 PRD 并更新状态卡**

用 `git rev-parse HEAD` 取得真实 40 位 SHA，替换 PRD 中全部 `task-center-v2` 图片链接；状态卡增加本轮范围、产物、验证、预览与 Figma 证据限制。

- [ ] **Step 5: 提交 PRD 与状态并推送**

Run: `git add prd/【Prd】《盖世游戏》任务中心与兑换商城需求.md prd/workflow-state/GUANWANGGAID-41-publisher-plan-v2.md && git commit -m "docs: update task center and redemption store prd" && git push origin HEAD`

Expected: the current `codex/guanwanggaid-41-publisher-plan-v2-20260910` branch advances on origin.

- [ ] **Step 6: 校验公网图片与 Demo 预览**

对固定 SHA 的 jsDelivr 图片发起 HEAD/GET，确认 HTTP 200 且 MIME 为 `image/png`；用 `htmlpreview.github.io + jsDelivr + 最终固定 SHA` 打开单文件 Demo 并点击“兑换商城”。公网验证不等于已完成飞书真实导入，两者在交付中分开说明。

## Self-Review

- Spec coverage: 方案 A、竖屏范围、盖世积分口径、旧商品履约、C/B 一致、交互状态、PRD 六要素、流程图、固定 SHA 和公网验证均有对应任务。
- Placeholder scan: 计划中不含待办占位；图片链接必须在真实截图提交存在后才构造。
- Type consistency: 页面选择器、`state` 字段、埋点参数和资产枚举在各任务中保持一致。
