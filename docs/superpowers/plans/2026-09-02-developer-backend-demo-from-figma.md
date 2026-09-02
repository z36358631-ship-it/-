# Developer Backend Demo From Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依据已确认的“盖世游戏｜开发者后台一期”Figma 终稿重新生成 5 份可离线运行的 HTML Demo，并阻止页面结构、角色、标题、模板与 Figma 静默漂移。

**Architecture:** 保留现有 `fixtures/routes/templates/styles/runtime` 单一业务源，通过 `build.mjs` 打包成 1 个评审总览和 4 个业务模块 HTML。构建前读取 Figma 的 `figma-page-map.json`、`frame-map.json` 与交付证据清单，逐项核对 6 个正式 Page、37 个业务 Frame、9/6/13/9 数量、页面标题、角色、模板、1440×900 尺寸和 5 份正式 SVG SHA-256；验证后才写出自包含 HTML。

**Tech Stack:** Node.js ESM、原生 HTML/CSS/JavaScript、node:test、playwright-core、本机 Chrome/Edge

---

### Task 1: 固化 Figma→Demo 构建契约

**Files:**
- Modify: `tests/developer-backend/build.test.mjs`
- Modify: `demos/开发者后台一期/build.mjs`

- [x] **Step 1: 写入失败测试**

在构建测试中执行 `build.mjs` 并断言标准输出包含：

```js
assert.match(
  output,
  /Figma contract verified: 6 pages, 37 frames \(9\/6\/13\/9\), 5 source hashes\./,
);
```

- [x] **Step 2: 运行测试确认失败**

```powershell
node --test tests/developer-backend/build.test.mjs
```

Expected: FAIL，构建输出尚未包含 Figma 契约验证结果。

- [x] **Step 3: 实现最小构建校验**

`build.mjs` 在生成 HTML 前读取以下三个文件：

```text
Figma/开发者后台一期/figma-page-map.json
Figma/开发者后台一期/frame-map.json
Figma/开发者后台一期/evidence/evidence-manifest.json
```

校验：

```text
正式 Page 顺序：00、01、02、03、04、components
业务模块：01、02、03、04
Frame 数：37
模块数量：9、6、13、9
每个 Frame 的 id/moduleId/title/role/templateId 与 routes.json 一致
每个 Frame 尺寸：1440×900
5 份正式 SVG：SHA-256 与 evidence-manifest.json 一致
```

任何不一致直接抛错，不生成新的 HTML；一致时输出固定验证文案。

- [x] **Step 4: 运行测试确认通过**

```powershell
node --test tests/developer-backend/build.test.mjs
```

Expected: PASS。

### Task 2: 重建五份离线 Demo

**Files:**
- Regenerate: `demos/开发者后台一期/开发者后台一期总览demo.html`
- Regenerate: `demos/开发者后台一期/01-开发者平台与资料demo.html`
- Regenerate: `demos/开发者后台一期/02-CDKEY商品与供给demo.html`
- Regenerate: `demos/开发者后台一期/03-包体测试与发布demo.html`
- Regenerate: `demos/开发者后台一期/04-精准投放与数据demo.html`
- Modify: `demos/开发者后台一期/README.md`

- [x] **Step 1: 运行确定性构建**

```powershell
node demos/开发者后台一期/build.mjs
```

Expected:

```text
Figma contract verified: 6 pages, 37 frames (9/6/13/9), 5 source hashes.
Built 5 self-contained HTML files with 37 routes.
```

- [x] **Step 2: 补充交付来源说明**

README 登记 Figma 链接、正式页面结构、构建前置契约和“Figma 为当前视觉基线，Demo 与 Figma 共用同一业务源”的事实；明确不连接真实账号、接口、Key、Secret、发布或投放服务。

### Task 3: 完整机器回归

**Files:**
- Verify: `tests/developer-backend/*.test.mjs`
- Generate: `test-results/developer-backend/screenshots/*.png`

- [x] **Step 1: 运行全部测试**

```powershell
$testFiles = Get-ChildItem -LiteralPath tests/developer-backend -Filter '*.test.mjs' | Sort-Object Name
node --test $testFiles.FullName
```

Expected: 本轮 Demo／Figma／官网入口相关用例全部 PASS；若 PRD V1.5 与已确认 Figma 页面契约并行修订产生历史断言失败，必须如实记录且不得回滚用户 PRD。

- [x] **Step 2: 重新生成关键页面证据**

```powershell
node tests/developer-backend/capture-evidence.mjs
```

Expected: P01-01、P02-01 四任务 Tab、全局帮助中心和关键模块截图更新。

### Task 4: 浏览器人工审图与交付

**Files:**
- Verify: `demos/开发者后台一期/*.html`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`

- [x] **Step 1: 打开本地总览**

通过本地 HTTP 服务打开：

```text
http://127.0.0.1:<port>/开发者后台一期总览demo.html
```

- [x] **Step 2: 人工检查**

检查 P01-01、P01-09、P02-01 四个任务 Tab、P03-04、P03-13、P04-04、P04-09：深色导航与浅色内容区对比度正常；侧栏当前路由明确；CDKEY 授权/配额/渠道限制可见；无裁切、遮挡、水平溢出和远程请求。

- [x] **Step 3: 回写状态并提交**

状态卡登记本轮 Figma→Demo 构建、机器验证、人工审图、本地预览和 Git 结果。只提交本次修改文件，不纳入工作区无关改动，不执行 Git push。
