# Mac 原生版本管理 PRD V1.5 收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 `to-prd` 标准完成 GUANWANGGAID-5 的 PRD V1.5、Demo复验、Git发布和任务板送审。

**Architecture:** 保留已验收的单文件 Demo 和7张固定提交功能图，仅收口 PRD 结构与发布证据。PRD使用标准九章主体，C端全部功能汇总在4.2的一个三列表格中；发布前通过结构测试、真实浏览器测试和远程图片校验。

**Tech Stack:** Markdown、HTML、Node.js Test Runner、Playwright、Git、jsDelivr、飞书云文档、taskctl

---

### Task 1: 完成 PRD V1.5

**Files:**
- Modify: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Create: `tests/mac-native-prd-v15.test.mjs`

- [x] 增加V1.5版本记录并保留V1.4历史记录。
- [x] 恢复标准九章主体，仅输出C端详细设计。
- [x] 将7个C端功能收口到一个“模块名称｜图示｜展示&交互说明”表格。
- [x] 补齐埋点事件、参数说明、枚举含义、运营准备和验收项。
- [x] 校验事件参数与参数说明表完全对应。

### Task 2: 校验功能图与飞书兼容性

**Files:**
- Verify: `public/prd/mac-native-version-management/01-version-switch.png`
- Verify: `public/prd/mac-native-version-management/02-native-download-entry.png`
- Verify: `public/prd/mac-native-version-management/03-native-installed.png`
- Verify: `public/prd/mac-native-version-management/04-path-largest-default.png`
- Verify: `public/prd/mac-native-version-management/05-no-eligible-path.png`
- Verify: `public/prd/mac-native-version-management/06-download-locked.png`
- Verify: `public/prd/mac-native-version-management/07-game-library-platform-badges.png`

- [x] 统一使用固定提交 `db2fabd109b9a21a69f5993ec9b621d5d01bf6f0`。
- [x] 校验14处图片引用对应7张唯一图片。
- [x] 校验7/7远程地址返回HTTP 200和`image/png`。
- [x] 扫描并排除本地、浮动分支和GitHub blob图片地址。

### Task 3: 复验 Demo 与文档

**Files:**
- Verify: `demos/PC与Mac端/Mac原生游戏版本管理demo.html`
- Verify: `tests/mac-native-version-demo.test.mjs`
- Verify: `tests/mac-native-version-demo.browser.test.mjs`
- Modify: `test-results/mac-native-prd-publish-report.md`

- [x] 运行PRD V1.5结构测试，5/5通过。
- [x] 运行Demo静态与真实浏览器测试，14/14通过。
- [x] 运行`git diff --check`，无空白错误。
- [x] 记录文档、图片、Demo和发布状态。

### Task 4: 发布与任务板送审

**Files:**
- Publish: `prd/ai生成/【Prd】《盖世游戏》Mac原生游戏版本管理需求.md`
- Publish: `tests/mac-native-prd-v15.test.mjs`
- Publish: `docs/superpowers/plans/2026-08-10-mac-native-prd-simplification.md`
- Publish: `test-results/mac-native-prd-publish-report.md`

- [ ] 获得Git和飞书发布授权。
- [ ] 只提交本任务4个文件并推送当前分支。
- [ ] 将飞书文档更新为V1.5并复核标题、表格和7张图片。
- [ ] 向GUANWANGGAID-5追加交付评论，并将状态从`in_progress`改为`in_review`。
