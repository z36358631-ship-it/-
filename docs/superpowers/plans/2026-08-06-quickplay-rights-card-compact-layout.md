# Quickplay Rights Card Compact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将秒玩页云游戏权益卡改为紧凑横向布局，并同步 Demo、截图和 PRD。

**Architecture:** 仅调整现有单文件 HTML 的权益卡 CSS 网格，不改 DOM、数据和事件。验证通过后重新生成总览截图，以新图片提交 SHA 更新 PRD。

**Tech Stack:** HTML、CSS、原生 JavaScript、Git、Markdown

---

### Task 1: 更新权益卡布局

**Files:**
- Modify: `public/demos/mac-quickplay-cloud-rights/index.html`
- Modify: `prd/Mac/【Prd】《盖世游戏》秒玩页云游戏权益展示需求/图片和附件/秒玩页云游戏权益demo.html`

- [ ] **Step 1: 收紧用户区和卡片内边距**

```css
.benefit-card { padding: 18px 18px 20px; }
.user-row { padding-bottom: 16px; }
```

- [ ] **Step 2: 将时长和充值改为横向网格**

```css
.time-block {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "eyebrow action"
    "value action"
    "copy copy";
  column-gap: 16px;
  padding: 16px 0 17px;
}
.eyebrow { grid-area: eyebrow; }
.time-line { grid-area: value; }
.benefit-copy { grid-area: copy; }
.primary-btn {
  grid-area: action;
  align-self: center;
  width: 104px;
  height: 38px;
  margin-top: 0;
  box-shadow: none;
}
```

- [ ] **Step 3: 收紧签到区**

```css
.checkin-box { margin-top: 0; padding-top: 17px; }
.checkin-sub { margin-top: 7px; }
```

- [ ] **Step 4: 检查 HTML 静态结构**

Run: `git diff --check`

Expected: 无输出，退出码 0。

### Task 2: 视觉与交互验收

**Files:**
- Verify: `public/demos/mac-quickplay-cloud-rights/index.html`
- Update: `public/prd/mac-quickplay-cloud-rights/01-quickplay-overview.png`

- [ ] **Step 1: 在 1520×1034 视口打开 Demo**

Expected: 权益卡高度明显缩短，充值按钮位于时长区域右侧，签到按钮位于签到信息右侧。

- [ ] **Step 2: 检查交互**

Expected: 时长明细、充值、签到和最近常玩整屏翻页均可操作。

- [ ] **Step 3: 截取无鼠标、无焦点框的页面总览**

Expected: 输出为真正 PNG，页面完整且无裁切。

### Task 3: 更新 PRD 与发布

**Files:**
- Modify: `prd/Mac/【Prd】《盖世游戏》秒玩页云游戏权益展示需求/【Prd】《盖世游戏》秒玩页布局与云游戏权益展示需求-V1.2优化版.md`

- [ ] **Step 1: 提交新 Demo 与总览图**

Run: `git add public/demos/mac-quickplay-cloud-rights/index.html public/prd/mac-quickplay-cloud-rights/01-quickplay-overview.png`

Run: `git commit -m "fix(quickplay): compact cloud rights card"`

Expected: 生成包含新 Demo 和新总览图的固定提交 SHA。

- [ ] **Step 2: 将 PRD 的 Demo 和图片地址替换为固定 SHA**

Expected: 5 张图片均使用同一固定图片提交 SHA，不含本地路径、`@main` 或 `@master`。

- [ ] **Step 3: 推送并远程验证**

Run: `git push origin codex/mac-quickplay-rights-v13-20260806`

Expected: 5 张图片返回 HTTP 200、`image/png`；在线 Demo 返回 HTML。
