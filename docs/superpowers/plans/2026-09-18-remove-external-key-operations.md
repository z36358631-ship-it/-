# Remove External Key Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前发行平台收口为盖世 Key 自助分销，移除外部 Key、双账本及对应运营后台。

**Architecture:** 保留 `publisher-channel-distribution.js` 作为唯一渠道分销业务实现，从公共路由、Fixture 和通用模板中删除旧双 Key 模型。历史单文件 HTML 不删除，但不再被当前模块、README、PRD 或测试引用。

**Tech Stack:** 单文件 HTML、原生 JavaScript/CSS、JSON Fixture、Node.js `node:test`、Playwright Core、Markdown PRD。

---

### Task 1: 先用负向契约锁定移除范围

**Files:**
- Create: `tests/developer-backend/gamehub-key-only-scope.test.mjs`

- [ ] **Step 1: 写失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const currentFiles = [
  'demos/开发者后台一期/src/routes.json',
  'demos/开发者后台一期/src/fixtures.json',
  'demos/开发者后台一期/src/runtime/templates.js',
  'demos/开发者后台一期/src/runtime/shell.js',
  'demos/开发者后台一期/src/runtime/app.js',
  'demos/开发者后台一期/13-开发者平台与渠道分销demo.html',
  'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md',
  'demos/开发者后台一期/README.md',
];

test('当前交付仅保留盖世 Key', () => {
  const forbidden = /外部\s*Key|外部Key|双账本|外部\s*Key\s*入站|external_imported|supplyLedgers\.external/iu;
  for (const file of currentFiles) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), forbidden, file);
});
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `node --test tests/developer-backend/gamehub-key-only-scope.test.mjs`

Expected: FAIL，并指向现存外部 Key 或双账本文案。

### Task 2: 移除旧路由、Fixture 和通用模板能力

**Files:**
- Modify: `demos/开发者后台一期/src/routes.json`
- Modify: `demos/开发者后台一期/src/prd-page-map.json`
- Modify: `demos/开发者后台一期/src/prd-fixture.mjs`
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`

- [ ] **Step 1: 删除旧 P02 运营路由**

从 `routes.json` 移除 `P02-02` 至 `P02-06`，仅保留 `P02-01` 作为开发者平台工作区。同步把硬编码路由总数从 37 改为 32。

- [ ] **Step 2: 缩减 PRD 映射**

`prd-page-map.json` 中 02 文档保留 4 个页面单元，Demo 路由数改为 1，`P02-01` 映射到渠道管理起始页面。

- [ ] **Step 3: 删除旧 Fixture**

移除 `P02-02` 至 `P02-06`、`external_imported`、`supplyLedgers.external` 和外部 Key 帮助文案；`P02-01` 不再注入旧 `cdkeySelfService` 双 Key 数据。

- [ ] **Step 4: 删除不可达旧模板和动作**

移除旧商品／SKU、外部 Key 入站、异常、双账本页面及对应动作分支；将开发者概览、游戏详情和 CDKEY 数据改为只展示盖世 Key 发放与兑换。

- [ ] **Step 5: 运行语法检查**

Run:

```powershell
node --check "demos/开发者后台一期/src/runtime/templates.js"
node --check "demos/开发者后台一期/src/runtime/shell.js"
node --check "demos/开发者后台一期/src/runtime/app.js"
```

Expected: 全部退出码 0。

### Task 3: 收口 PRD、README 和状态卡

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md`
- Modify: `demos/开发者后台一期/README.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`

- [ ] **Step 1: 将 PRD 更新为 V2.3**

删除平台商品／SKU、外部 Key 入站、双账本、运营权限、外部批次指标、埋点和待确认项；保留渠道管理、批次管理、分销数据和帮助教程四个页面单元。

- [ ] **Step 2: 更新 README**

将 13 号 Demo 说明改为单开发者端当前交付；标明旧 02 和历史拆分 Demo 仅作归档，不列为当前页面。

- [ ] **Step 3: 回写状态卡**

新增一条当前决策：发行平台只处理盖世 Key；记录 Demo、PRD、测试、Git、公开预览和飞书图片的真实状态。

### Task 4: 重建当前 Demo 并回归

**Files:**
- Modify: `demos/开发者后台一期/13-开发者平台与渠道分销demo.html`
- Test: `tests/developer-backend/gamehub-key-only-scope.test.mjs`
- Test: `tests/developer-backend/publisher-channel-integration.browser.test.mjs`

- [ ] **Step 1: 重建 Demo**

Run: `node "demos/开发者后台一期/build-developer-channel.mjs"`

Expected: 生成 `13-开发者平台与渠道分销demo.html`。

- [ ] **Step 2: 运行负向契约**

Run: `node --test tests/developer-backend/gamehub-key-only-scope.test.mjs`

Expected: PASS。

- [ ] **Step 3: 运行渠道分销回归**

Run: `node --test tests/developer-backend/publisher-channel-integration.browser.test.mjs`

Expected: 全部 PASS；渠道、批次、下载、API 续量、分销数据、帮助与响应式行为不回归。

- [ ] **Step 4: 校验 PRD**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-quality.ps1 -Path "prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md"
powershell -ExecutionPolicy Bypass -File scripts/validate-prd-images.ps1 -PrdPath "prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md" -VerifyRemote
```

Expected: 质量门禁 0 error，所有保留图片 HTTP 与 MIME 校验通过。

- [ ] **Step 5: 定向提交，不推送**

```powershell
git add -- "demos/开发者后台一期/src" "demos/开发者后台一期/build-developer-channel.mjs" "demos/开发者后台一期/13-开发者平台与渠道分销demo.html" "demos/开发者后台一期/README.md" "prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md" "prd/workflow-state/LOCAL-20260901-developer-backend-prd.md" "tests/developer-backend/gamehub-key-only-scope.test.mjs"
git commit -m "feat: remove external key operations scope"
```

Expected: 只提交本轮相关文件，不执行 `git push`。

