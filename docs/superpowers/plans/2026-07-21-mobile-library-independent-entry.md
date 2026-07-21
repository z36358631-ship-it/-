# 手游库独立入口调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前合并在游戏库内的 iOS 应用能力恢复为侧边栏独立“手游库”入口，并同步 Demo、PRD、飞书功能点、截图与线上预览。

**Architecture:** 标注版 Demo 移除 `library=pc|ios` 页面内平台分支，手游库页面只维护 `apps|resources` 两个业务 Tab；现有导入、来源、下载、右键与 ACE 流程保持不变。PRD 使用固定资产提交的 PNG 链接，文档提交在资产提交之后发布。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Playwright Core、Markdown、GitHub Git Data API、GitHub Pages。

---

### Task 1: 建立独立入口回归测试

**Files:**
- Create: `.tmp/verify-mobile-library-independent.cjs`
- Modify: `.tmp/verify-game-library-ios-ace.cjs`
- Test: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: 写失败测试**

测试必须断言：侧边栏顺序包含“游戏库、手游库、订单中心”；只有手游库高亮；标题为“手游库”；Tab 为“已安装、IPA 资源”；不存在 `library-tab` 和“PC游戏库 / IOS应用库”切换。

```js
assert.deepEqual(await page.locator('.rail-btn').evaluateAll(nodes => nodes.map(n => n.title)), ['探索','云游戏','数据','找游戏','游戏库','手游库','订单中心','搜索','下载管理']);
assert.equal(await page.locator('.rail-btn.active').getAttribute('title'), '手游库');
assert.equal(await page.locator('.page-head h1').innerText(), '手游库');
assert.deepEqual(await page.locator('.page-top .tab').allInnerTexts(), ['已安装','IPA 资源']);
assert.equal(await page.locator('[data-action="library-tab"]').count(), 0);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node .tmp/verify-mobile-library-independent.cjs "Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html"`

Expected: FAIL，当前页面仍显示合并式平台 Tab。

### Task 2: 修改标注版 Demo

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`
- Test: `.tmp/verify-mobile-library-independent.cjs`
- Test: `.tmp/verify-game-library-ios-ace.cjs`

- [ ] **Step 1: 修改路由与导航**

移除 `state.library`、`pcGamesPage()` 和 `library-tab` 事件；侧边栏在游戏库后新增手机图标入口“手游库”并设为唯一选中项；`currentPage()` 只按 `state.tab` 渲染已安装或 IPA 资源。

- [ ] **Step 2: 修改页面层级和标注**

`header()` 只显示标题“手游库”和“已安装 / IPA 资源”两个 Tab；左侧流程导航和右侧标注统一为独立入口口径，保留 ACE 标注。

- [ ] **Step 3: 运行测试**

Run: `node .tmp/verify-mobile-library-independent.cjs <demo>`

Expected: PASS。

Run: `node .tmp/verify-game-library-ios-ace.cjs <demo>`

Expected: 所有保留的手游库与 ACE 流程 PASS，页面无 JavaScript 错误。

### Task 3: 更新 PRD 与飞书功能点

**Files:**
- Modify: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Modify: `prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md`

- [ ] **Step 1: 追加 PRD 版本记录**

新增 V2.7：取消合并式游戏库结构，在侧边栏“游戏库”下方新增“手游库”独立入口；不改写 V2.5、V2.6 历史记录。

- [ ] **Step 2: 同步当前方案**

更新背景、目标、核心路径、模块表、详细设计、边界、埋点和自检记录；删除当前方案中的 `PC游戏库 / IOS应用库` 一级 Tab 口径。

- [ ] **Step 3: 同步飞书功能点**

按页面级别一行一个功能点，入口改为“手游库”，内部保留已安装、IPA 资源与 ACE 流程。

### Task 4: 重新生成截图和固定图片链接

**Files:**
- Modify: `public/prd/mac-ios-library/*.png`
- Modify: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Test: `.tmp/capture-mac-ios-prd.cjs`

- [ ] **Step 1: 调整截图脚本预览状态并生成图片**

Run: `node .tmp/capture-mac-ios-prd.cjs <demo> public/prd/mac-ios-library`

Expected: 重新生成 15 张截图；手游库截图显示独立侧边栏选中态、标题和当前 Tab。

- [ ] **Step 2: 视觉检查关键截图**

检查 `13-ios-app-library.png` 和 `14-ace-warning.png`：不得出现 PC 平台 Tab；侧边栏“手游库”高亮；ACE 弹窗保留风险和免责文案。

- [ ] **Step 3: 固定资产提交并回填 PRD**

先发布 Demo 与 PNG，取得远端资产提交哈希；将 PRD 中所有 jsDelivr 图片链接替换为该哈希，再提交文档。

### Task 5: 发布与线上验证

**Files:**
- Publish: Demo、15 张 PNG、PRD、飞书功能点

- [ ] **Step 1: 精确发布目标文件**

通过 GitHub Git Data API 基于远端 `master` 创建资产提交和文档提交，不包含工作区其他改动。

- [ ] **Step 2: 等待 Pages 构建**

轮询最新构建，Expected: `status=built` 且 commit 为最新文档提交。

- [ ] **Step 3: 验证线上内容**

线上 Demo 必须返回 HTTP 200，包含“手游库”，不包含 `PC游戏库` 和 `library-tab`；PRD 14 个唯一 PNG 链接必须返回 HTTP 200、`image/png` 且非空。

