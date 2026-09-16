# Developer Platform P01 Finance Overwrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `开发者平台demo.html#/P01-01` 直接显示当前 `P15-01 财务主体` 页，并保留对账结算及原财务整合 Demo 兼容。

**Architecture:** 开发者平台默认构建注入现有财务路由、样式、共享模型和运行时。`PublisherFinance` 将 `P01-01` 视为财务主体的主路由，`P15-01` 作为兼容路由，两者共用同一渲染和状态。

**Tech Stack:** Node.js ESM 构建、原生 JavaScript/CSS、单文件 HTML、node:test、Playwright。

---

### Task 1: 先写路由覆盖用例

**Files:**
- Modify: `tests/developer-backend/build.test.mjs`
- Modify: `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`

- [ ] 断言默认构建的 `开发者平台demo.html` 包含 `P15-01`、`P15-02` 和财务运行时。
- [ ] 断言打开 `#/P01-01` 时只显示“财务主体” H1，侧栏高亮财务主体。
- [ ] 断言从 `P15-02` 返回财务主体后 URL 为 `#/P01-01`。
- [ ] 运行两份用例，确认修改前失败。

### Task 2: 让默认开发者平台构建包含财务

**Files:**
- Modify: `demos/开发者后台一期/build.mjs`

- [ ] 把财务资产改为模块 02 默认注入，模块 01 不注入。
- [ ] 模块 02 默认路由合并 `finance-routes.json`，其他模块路由不变。
- [ ] `--variant=finance-integrated` 继续输出原财务整合 Demo，不覆盖主 Demo。

### Task 3: 将 P01-01 映射为财务主体

**Files:**
- Modify: `demos/开发者后台一期/src/demo15/app.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`

- [ ] 将 `P01-01` 加入财务路由集，与 `P15-01` 共用 entity 渲染。
- [ ] 财务主体侧栏、面包屑和页头将 `P01-01` 视为主体页，财务主体链接回指 `#/P01-01`。
- [ ] 不修改财务字段、结算计算、状态和交互。

### Task 4: 构建、回归、提交和公网验证

**Files:**
- Generate: `demos/开发者后台一期/开发者平台demo.html`
- Generate: `demos/开发者后台一期/开发者平台财务整合demo.html`

- [ ] 运行默认模块 02 构建及财务兼容构建。
- [ ] 运行 build、开发者平台财务、财务模型及主平台回归。
- [ ] 检查 1440×900 和 390×844 的 P01-01，确认布局和交互无回归。
- [ ] 只暂存本计划相关文件，提交并推送当前分支。
- [ ] 用固定提交 SHA 校验主 Demo 公网地址及 `#/P01-01`。

### Task 5: 修复财务主入口的左侧导航

**Files:**
- Modify: `tests/developer-backend/developer-platform-finance-integration.browser.test.mjs`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Generate: `demos/开发者后台一期/开发者平台demo.html`

- [ ] 新增无登录存储场景：打开 `#/P01-01` 后依次点击“对账结算”“财务主体”“游戏管理”“厂商设置”，断言路由与页面内容同步变化。
- [ ] 先运行新增用例，确认当前实现会把目标路由重定向回 `#/P01-01`。
- [ ] 主 Demo 包含财务主入口且没有有效登录会话时，初始化企业已认证的演示会话；已有有效会话不覆盖，已有认证记录只补会话。
- [ ] 重新构建主 Demo，运行财务浏览器用例及财务模型用例，确认左侧导航和原财务交互同时通过。
- [ ] 只提交本任务文件，推送后在固定 Git 地址复测左侧四个入口。
