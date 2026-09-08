# Publisher Release Status and Unified Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善开发者发布记录、审核通知与演示状态，并把运营后台收成一个含三类审核 Tab 的统一入口。

**Architecture:** 开发者前端继续由 `publisher-game-profile.js` 生成页面，仅在运行时 WeakMap 中保存演示状态，正式提交记录不被修改；运营后台保持单文件 HTML，通过统一的 `state.auditTab` 渲染三类审核列表与共用抽屉。两端分页都使用固定常量 `PAGE_SIZE = 20`，筛选变化后回到第一页。

**Tech Stack:** 原生 HTML、CSS、JavaScript，Node.js 构建脚本，浏览器交互验证。

---

### Task 1: 开发者前端发布记录与通知

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/publisher-game-profile.js`
- Modify: `demos/开发者后台一期/src/styles/publisher-game-profile.css`

- [x] **Step 1: 补齐状态样例和双层状态**

在发布记录的样例数据中加入 `draft`、`reviewing`、`rejected`、`withdrawn`、`approved`、`live`、`delisted`，并为记录分别提供 `reviewStatus` 与 `publicationStatus`。展示文案使用“审核未通过”，不使用“审核失败”。

- [x] **Step 2: 增加 20 条分页**

定义并使用：

```js
const VERSION_PAGE_SIZE = 20;
const pageCount = Math.max(1, Math.ceil(records.length / VERSION_PAGE_SIZE));
const pageRows = records.slice((page - 1) * VERSION_PAGE_SIZE, page * VERSION_PAGE_SIZE);
```

分页显示总数、当前页和总页数，上一页、下一页在边界禁用；筛选变化时将页码重置为 1。

- [x] **Step 3: 增加演示状态模拟器**

将以下演示字段保存在 `stateFor(draft)` 返回的运行时状态中：

```js
demoReleaseState: {
  open: false,
  active: false,
  status: 'reviewing'
}
```

切换状态只覆盖当前版本的页面展示和通知预览，不写入 `releaseSubmissions`。

- [x] **Step 4: 增加盖世游戏通知预览**

按发行范围生成通知：

```js
const channel = context.mode === 'domestic' ? 'sms' : 'email';
```

审核通过只写“已通过发布审核”；审核未通过只写结果并引导进入盖世游戏开发者中心查看详细原因。审核中、已撤销不生成结果通知。

- [x] **Step 5: 收紧资质审核中状态**

确认状态标签位于对应区域卡内；审核中隐藏“继续上传”和附件删除入口；删除“本项资质将随本次版本一并提交审核”等无关提示。

- [x] **Step 6: 增加目标用户游戏兴趣**

在“发行设置”加入标签多选字段“目标用户游戏兴趣”，说明为“用于精准分发，匹配近期体验或下载过相似游戏的用户。”选择结果随草稿保存，并通过同源 IndexedDB 提交快照进入运营审核后台；不增加算法配置。

- [x] **Step 7: 检查源文件语法**

Run:

```powershell
node --check demos/开发者后台一期/src/runtime/publisher-game-profile.js
```

Expected: 退出码 0，无语法错误。

### Task 2: 运营后台统一审核入口

**Files:**
- Modify: `demos/开发者后台一期/09-发行审核后台demo.html`

- [x] **Step 1: 合并导航**

左侧只保留“审核管理”和“审核记录”；审核管理内增加三个无图标 Tab：企业认证审核、游戏发布审核、资质认证审核。页面标题只保留一个主标题，不显示副标题。

- [x] **Step 2: 调整待审核量位置**

每个申请列表标题右侧展示：

```html
<span class="pending-count">待审核量：<strong>5</strong></span>
```

不创建参数卡片，不显示已审核量和“审核状态写入失败”指标。

- [x] **Step 3: 区分资质审核类型**

资质申请数据增加：

```js
qualificationKind: 'initial' // 或 'change'
```

列表与抽屉显示“初次认证”或“资质变更”。

- [x] **Step 4: 增加待补充人工取消**

待补充申请显示“取消申请”操作；点击后二次确认并填写原因。确认后状态变为 `cancelled`，写入审核记录：操作人、操作时间、原状态、目标状态、取消原因。

- [x] **Step 5: 统一每页 20 条分页**

三类审核列表和审核记录共用：

```js
const PAGE_SIZE = 20;
```

筛选变化后回到第 1 页，边界页禁用上一页或下一页。

- [x] **Step 6: 保留发布审核测试门槛**

游戏发布申请没有“开始审核”操作；PC 包体测试未通过时禁用“发布审核通过”，测试通过后才允许审核通过。

- [x] **Step 7: 检查单文件脚本语法**

从 HTML 提取内联脚本并使用 `new Function(scriptText)` 编译。

Expected: 所有脚本均可编译，无 `SyntaxError`。

### Task 3: 构建与交互验收

**Files:**
- Regenerate: `demos/开发者后台一期/02-CDKEY商品与供给demo.html`

- [x] **Step 1: 构建 Demo 02**

Run:

```powershell
node demos/开发者后台一期/build.mjs --module=02
```

Expected: 退出码 0，生成单文件 HTML。

- [x] **Step 2: 静态断言**

检查生成文件与后台文件中存在三类审核 Tab、七类状态示例、盖世游戏通知文案、`20` 条分页常量和待补充取消操作；确认没有 TapTap、参数卡片、已审核量、审核状态写入失败等残留文案。

- [x] **Step 3: 浏览器交互验证**

验证发布记录分页、状态模拟器、短信／邮件预览、后台三 Tab、抽屉、待补充取消、审核记录和返回顶部按钮。截图检查标题层级、待审核量位置和窄屏边界。

- [ ] **Step 4: 精确提交**

只暂存本轮修改的源文件、两个单文件 Demo、设计和计划文档，不使用 `git add .`。
