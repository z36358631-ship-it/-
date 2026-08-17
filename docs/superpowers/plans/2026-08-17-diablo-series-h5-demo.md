# 《暗黑系列》首发适配 H5 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个离线单文件 Demo，演示暗黑系列首发适配落地页与现有运营活动 H5 的核心页面和交互路径。

**Architecture:** 单文件 HTML 只实现 `landing` 首发适配落地页；活动按钮直接打开现有 `demos/后台管理/运营活动demo.html`，不复制或重做运营活动页。视觉参考用户提供的暗黑商店页并复用 GameHub 令牌和组件契约，图片使用本地 CSS 媒体占位，不依赖网络。

**Tech Stack:** HTML、CSS、原生 JavaScript；Playwright 截图与交互检查。

---

### Task 1: 创建离线 Demo 骨架与 GameHub 主题

**Files:**
- Create: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`
- Read: `.agents/skills/gamehub-app-ui/assets/gamehub-app-tokens.css`
- Read: `docs/superpowers/specs/2026-08-17-diablo-series-h5-landing-and-activity-design.md`

- [x] **Step 1: 建立单文件 HTML、390×844 竖屏容器和离线落地页**

实现单一落地页状态和外部活动 Demo 链接；所有业务页面都使用可访问 DOM，不使用整页截图背景。

- [x] **Step 2: 写入 GameHub 令牌和基础 Shell**

使用 `#0E0E10`、`#171719`、`#242426`、`#2BC3DF`、`#FFC928`、`#00C777` 和 8/12/16/24px 圆角体系；业务流页面不显示 APP 五栏底部导航。

- [x] **Step 3: 运行静态检查**

Run: `node --check tools/empty-check.mjs`（若无脚本，则用浏览器打开后检查控制台）
Expected: HTML 可打开，控制台无脚本语法错误。

### Task 2: 实现首发适配落地页

**Files:**
- Modify: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`

- [x] **Step 1: 实现首屏 Hero 与“盖世首发适配”角标**

展示暗黑系列首发适配、PC 本地运行、非云游戏/非串流、立即游玩和参加活动按钮；用 CSS 媒体占位绘制深色地狱火氛围，不使用 Emoji 或远程图片。

- [x] **Step 2: 实现四款暗黑游戏卡片**

展示《暗黑破坏神 IV》《暗黑破坏神 III》《暗黑破坏神：不朽》《暗黑破坏神2：重制版》，每张卡提供状态标签、运行方式和查看按钮；支持点击切换当前游戏。

- [x] **Step 3: 实现 Battle.net 七步游玩攻略**

按“下载 Battle.net → 导入游戏 → 启动 Battle.net → 登录 → 下载游戏 → 安装 → 回到盖世启动”展示步骤卡；点击步骤更新高亮说明，不模拟登录、不采集账号密码。

- [x] **Step 4: 实现首发游玩视频、推荐适配参数、移动攻略、活动入口和 FAQ**

展示首发游玩视频轮播、视频下方推荐适配参数、手柄/画质/散热/续航建议、游戏权益/手柄/散热奖励预览和 FAQ；“参加活动”打开现有 `../后台管理/运营活动demo.html`。

### Task 3: 接入现有运营活动 Demo

**Files:**
- Read: `demos/后台管理/运营活动demo.html`
- Modify: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`

- [x] **Step 1: 在落地页中实现活动预览入口**

展示活动奖品预览、参与说明和“进入现有活动页”按钮；不复制签到、转盘、任务和地址弹窗。

- [x] **Step 2: 校验活动链接**

从落地页目录打开现有运营活动 Demo，确认相对路径在本地静态服务器下可用；活动页内部交互以现有 Demo 为准。

- [x] **Step 3: 不修改现有活动页**

现有运营活动 Demo 保持原文件和原交互，不将其内容复制到首发落地页；本期新增范围只包含落地页预览卡和外链按钮。

### Task 4: 交互和响应式验证

**Files:**
- Test: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`

- [x] **Step 1: 运行本地静态服务器**

Run: `python -m http.server 4173 --directory demos/暗黑系列`
Expected: `http://127.0.0.1:4173/暗黑系列首发适配与新人活动demo.html` 可访问。

- [x] **Step 2: 用 Playwright 截取竖屏落地页**

验证 390×844 下无横向溢出、首屏按钮可见、游戏选择、步骤高亮、FAQ 展开和活动链接可打开。

- [x] **Step 3: 检查横屏降级状态**

在 874×402 视口检查页面不崩溃；按运营 H5 现有规则显示“请使用竖屏浏览”提示，不另造横屏活动布局。

- [x] **Step 4: 修正发现的必须问题**

优先修复交互失效、溢出、按钮不可见、弹窗无法关闭、次数重复扣减和页面返回丢状态；不新增未确认业务流程。

### Task 5: Demo 体验评审与交付

**Files:**
- Modify: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`
- Evidence: `.tmp/gamehub-app-ui/visual-captures/`

- [x] **Step 1: 按产品、交互、开发三个角色检查 Demo**

分别检查四款游戏范围、Battle.net 链路、活动预览入口、外部现有活动链接和代码结构。

- [x] **Step 2: 记录来源和未实现范围**

交付说明注明采用 GameHub V6.1.1 令牌、`C-TOPBAR`、`C-BUTTON-GLOW`、`C-BUTTON-SECONDARY`、`C-FEEDBACK`、`D-GAME-CARD` 及现有运营活动 H5 语义；CSS 媒体为离线占位，不宣称是正式游戏素材。

- [x] **Step 3: 提交 Demo**

```powershell
git add demos/暗黑系列/暗黑系列首发适配落地页demo.html docs/superpowers/plans/2026-08-17-diablo-series-h5-demo.md
git commit -m "demo: add Diablo series launch and activity H5"
```
