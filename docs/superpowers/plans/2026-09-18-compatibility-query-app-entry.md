# Compatibility Query App Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在盖世游戏 App 的“玩游戏→PC游戏”和 PC 游戏详情页增加兼容性查询入口，并让两个入口进入同一 H5、按来源完成筛选预选与返回。

**Architecture:** 现有单文件 H5 Demo 增加原生 App 场景壳层，业务查询页继续使用当前筛选、列表、评价和分享码逻辑。入口只负责传入可选 `game_id` 与当前机型：全局入口不预选游戏，详情入口预选当前游戏；H5 返回原来源页并恢复页面上下文。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Playwright Core、Node.js 静态校验、Markdown、Git。

---

### Task 1: 增加双入口 App 场景

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [x] **Step 1: 增加页面路由状态**

在现有 `state` 中加入：

```js
screen: "pc-games",
entryReturn: null,
currentDeviceId: "android_device_oneplus13"
```

- [x] **Step 2: 增加两个入口页面**

实现 `renderPcGamesEntry()` 与 `renderGameDetailEntry()`：竖屏沿用底部导航和纵向内容，掌机横屏沿用顶部导航和横向轨道；新增入口统一使用 `data-open-compatibility`，不增加弹窗或 Toast。

- [x] **Step 3: 实现入口预选**

```js
function openCompatibility(source, gameId = null) {
  state.entryReturn = source;
  state.screen = "compatibility";
  state.filters.gameId = gameId;
  state.filters.hardwareId = state.currentDeviceId;
  render();
}
```

全局入口传空 `gameId`；详情入口传 `steam_1245620`。H5 返回时回原来源页。

- [x] **Step 4: 更新静态契约**

校验两个入口、`game_id` 预选、当前机型预选、横竖屏独立 Shell、无新增弹窗和 Toast。

### Task 2: 增加入口旅程测试与截图

**Files:**
- Create: `tools/capture-compatibility-entry-demo.mjs`
- Create: `public/prd/compatibility-query-app-v15/*.png`

- [x] **Step 1: 测试全局入口**

在 `390×844` 与 `844×390` 下点击 PC 游戏首屏入口，断言进入 H5、未预选游戏、已预选当前机型；点击返回回到 PC 游戏页。

- [x] **Step 2: 测试详情入口**

在两种方向下点击详情兼容性区域，断言进入 H5、预选 `steam_1245620` 和当前机型；点击返回回到同一游戏详情。

- [x] **Step 3: 输出页面图**

输出四张入口图和一张横向产品流程图；页面图使用当前 Demo，不用线框图代替最终 Demo 截图。

### Task 3: 更新 PRD 与状态卡

**Files:**
- Modify: `prd/最终文档/【Prd】《盖世游戏》兼容性查询与启动配置分享码需求/【Prd】《盖世游戏》兼容性查询与启动配置分享码需求.md`
- Modify: `prd/workflow-state/LOCAL-20260825-compatibility-share-code.md`

- [x] **Step 1: 追加 V1.5 修订记录**

写明新增 App 双入口、详情 `game_id` 预选、当前机型预选与返回规则；正文只保留最终规则。

- [x] **Step 2: 增加两个页面六要素**

分别描述“玩游戏—PC游戏”和“PC游戏详情”，覆盖横竖屏位置、展示文案、点击结果、H5 失败恢复和返回路径。

- [x] **Step 3: 更新产品流程图和图片**

先提交图片获得固定 40 位提交 SHA，再把公开 HTTPS 原图地址写入 PRD；H5 页面图可继续引用未变化的 V1.4 固定图片。

### Task 4: 验证、提交和推送

**Files:**
- Test: `tools/verify-compatibility-webview-demo.mjs`
- Test: `tools/capture-compatibility-entry-demo.mjs`
- Test: `C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-quality.ps1`
- Test: `C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-images.ps1`

- [x] **Step 1: 运行 Demo 静态和浏览器测试**

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-entry-demo.mjs
```

Expected: 两项退出码均为 0；入口、预选、返回、横竖屏和截图均通过。

- [x] **Step 2: 运行 PRD 校验**

```powershell
powershell -ExecutionPolicy Bypass -File C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-quality.ps1 -Path '<PRD路径>'
powershell -ExecutionPolicy Bypass -File C:/Users/z3635/.codex/skills/to-prd/scripts/validate-prd-images.ps1 -PrdPath '<PRD路径>' -VerifyRemote
```

Expected: 质量校验通过；全部图片返回 200 和图片 MIME。飞书真实转存未执行时如实标记。

- [x] **Step 3: 仅提交本需求文件并推送**

先提交 Demo、测试和图片；再用首个提交的固定 SHA 更新 PRD、状态卡并提交。只暂存本计划列出的文件，推送 `codex/compatibility-query-entry-v15-20260918`。
