# 开发者后台 CDKEY 自助发行、首次介绍与帮助中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不增加业务路由的前提下，把发行方自助生成盖世平台 Key、渠道 API、接口说明、首次入驻介绍、帮助中心和可读性修复同步到 PRD、5 份离线 Demo、37 个 Figma 业务 Frame 及验收证据。

**Architecture:** 保持 `routes.json` 的 37 个路由和 `9／6／13／9` 模块数量不变，以 `fixtures.json` 作为入驻说明、CDKEY 授权、Key 批次、API 凭据、接口文档和帮助内容的唯一演示数据源。`P01-01` 在 T01 内完成“介绍 → 登录”两步切换，`P02-01` 在 T03 内使用四个任务 Tab；帮助中心由 Shell 内容态承载，不写入路由表。Demo 验收通过后，由现有 Figma 构建脚本重新提取 P01/P02 页面，并更新原 Figma 文件而不是新建重复文件。

**Tech Stack:** Markdown、HTML5、CSS3、原生 JavaScript、JSON、Node.js 内置 `node:test`、`playwright-core`、PowerShell、`to-prd`、`ui-demo`、`gamehub-figma`

---

## 一、文件结构与职责

```text
prd/发行平台专项/开发者后台PRD/
├─ 01-开发者平台、厂商与游戏资料PRD.md     # P01-01 入驻介绍及全局帮助中心规则
└─ 02-游戏商品与CDKEY供给管理PRD.md       # P02-01 四 Tab、自助 Key、渠道 API 与接口说明

demos/开发者后台一期/
├─ README.md                              # 页面入口、演示场景、刷新及安全边界
├─ build.mjs                              # 从唯一源重建 5 份离线单文件 HTML
└─ src/
   ├─ fixtures.json                      # 新增 onboarding、cdkeySelfService、helpCenter
   ├─ routes.json                        # 保持 37 个路由，不增加帮助中心或介绍路由
   ├─ runtime/
   │  ├─ components.js                   # 任务 Tab、授权摘要、代码示例和 FAQ 组件
   │  ├─ templates.js                    # P01-01 与 P02-01 专用内容渲染
   │  ├─ shell.js                        # 顶栏帮助入口、帮助内容态和返回结构
   │  └─ app.js                          # 页内状态、一次展示、Tab、帮助返回与异常交互
   └─ styles/
      ├─ shell.css                       # 顶栏、侧栏、焦点态及帮助内容态
      ├─ components.css                  # 36px 任务 Tab、授权摘要、FAQ 和代码块
      └─ templates.css                   # 入驻第一步与 CDKEY 工作台布局

tests/developer-backend/
├─ prd-cdkey-self-service.test.mjs        # PRD 新规则和旧冲突口径回归
├─ content.test.mjs                       # Fixture、37 路由和敏感信息边界
├─ build.test.mjs                         # 5 个离线单文件和无远程依赖
├─ browser.test.mjs                       # 两尺寸、交互、一次展示、帮助返回和可访问性
└─ figma-organization.test.mjs            # 6 个正式 Page、37 Frame 及 P01/P02 新内容

test-results/developer-backend/
├─ screenshots/                           # 当前 1440×900 与 1280×800 截图
├─ route-report.json                      # 37 路由和新增交互验收结果
└─ visual-review.md                       # 原尺寸人工审图结论

Figma/开发者后台一期/
├─ build-figma-source.mjs                 # 从通过验收的 Demo 提取可编辑 SVG
├─ frame-map.json                         # 保持 37 Frame 映射
├─ figma-page-map.json                    # 保持 6 个正式 Page 与历史区
├─ figma-delivery.md                      # 本轮同步范围、链接和验证事实
├─ source/pages/P01-01.svg                # 更新首次入驻介绍
├─ source/pages/P02-01.svg                # 更新四 Tab 默认态
├─ source/figma-pages/01-开发者平台与资料.svg
├─ source/figma-pages/02-CDKEY 商品与供给.svg
└─ evidence/                              # 云端 Page、可编辑图层和关键状态截图
```

`P03`、`P04` 的业务规则、页面数量和默认内容不修改；`index.html` 与 `官网改动/index.html` 的开发者平台入口仍指向 `P01-01`，只做回归验证。

## 二、实施任务

### Task 1: 重新确认原页面基线并启动产物执行

**Files:**
- Read: `demos/开发者后台一期/01-开发者平台与资料demo.html`
- Read: `demos/开发者后台一期/02-CDKEY商品与供给demo.html`
- Read: `Figma/开发者后台一期/evidence/figma-page-01-platform.png`
- Read: `Figma/开发者后台一期/evidence/figma-page-02-cdkey.png`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json`

- [ ] **Step 1: 验证修改前的页面和 Figma 证据可读取**

Run:

```powershell
Get-Item -LiteralPath 'demos/开发者后台一期/01-开发者平台与资料demo.html','demos/开发者后台一期/02-CDKEY商品与供给demo.html','Figma/开发者后台一期/evidence/figma-page-01-platform.png','Figma/开发者后台一期/evidence/figma-page-02-cdkey.png' | Select-Object FullName,Length,LastWriteTime
node --test --test-name-pattern='37 routes pass frame' tests/developer-backend/browser.test.mjs
```

Expected: 四个基线文件存在；修改前 37 路由仍可访问。人工核对现有深色侧栏、浅色工作区、顶栏、导航、P01-01 登录和 P02-01 只读供给结构。

- [ ] **Step 2: 完成 S4 页面基线步骤**

```powershell
$workflow = 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1'
$run = 'prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json'
& $workflow -Action start-step -RunPath $run -StepId S4 -InputPaths @('demos/开发者后台一期/01-开发者平台与资料demo.html','demos/开发者后台一期/02-CDKEY商品与供给demo.html','Figma/开发者后台一期/evidence/figma-page-01-platform.png','Figma/开发者后台一期/evidence/figma-page-02-cdkey.png')
& $workflow -Action pass -RunPath $run -StepId S4 -Outputs @('Figma/开发者后台一期/evidence/figma-page-01-platform.png','Figma/开发者后台一期/evidence/figma-page-02-cdkey.png') -Evidence @('修改前 P01/P02 Demo 与 Figma 同版本证据已核对') -Reviewer 'Codex 页面基线复核' -Message '现有结构、视觉、交互和本轮差异已恢复'
```

- [ ] **Step 3: 启动 S5，并把确认规格与本计划作为输入**

```powershell
& $workflow -Action start-step -RunPath $run -StepId S5 -InputPaths @('docs/superpowers/specs/2026-09-02-developer-backend-cdkey-self-service-help-demo-design.md','docs/superpowers/plans/2026-09-02-developer-backend-cdkey-self-service-help.md')
```

Expected: S4 为 `passed`，S5 为 `running`；此后才能修改 PRD、Demo 和 Figma。

### Task 2: 先把确认规则同步到两份 PRD

**Files:**
- Create: `tests/developer-backend/prd-cdkey-self-service.test.mjs`
- Modify: `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`
- Modify: `prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md`
- Read: `docs/superpowers/specs/2026-09-02-developer-backend-cdkey-self-service-help-demo-design.md`

- [ ] **Step 1: 写 PRD 规则失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const prd1 = fs.readFileSync('prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md', 'utf8');
const prd2 = fs.readFileSync('prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md', 'utf8');

test('PRD1 将介绍并入 P01-01 且帮助中心不增加业务路由', () => {
  for (const token of ['盖世发行合作说明', '四步流程', '准备事项', '开始入驻', '全局帮助中心', '不计入 9 个业务页面']) {
    assert.ok(prd1.includes(token), token);
  }
  assert.ok(prd1.includes('不新增公众注册入口'));
});

test('PRD2 定义四 Tab、自助权限和渠道 API 安全边界', () => {
  for (const token of [
    '商品与供给', 'Key 批次', '渠道 API', '接口说明',
    'gamehub_generated', 'external_imported', 'client_secret',
    'POST /openapi/v1/cdkeys/allocate',
    'GET /openapi/v1/cdkeys/allocations/{request_id}',
    'POST /openapi/v1/cdkeys/allocations/{request_id}/confirm',
    'HMAC-SHA256', '幂等', '一次性下载',
  ]) assert.ok(prd2.includes(token), token);
  assert.ok(!prd2.includes('开发者只读查看自身游戏结果'));
});
```

- [ ] **Step 2: 运行 PRD 测试并确认旧口径失败**

Run: `node --test tests/developer-backend/prd-cdkey-self-service.test.mjs`

Expected: FAIL，PRD 1 缺少首次介绍与全局帮助规则，PRD 2 仍是开发者只读供给口径。

- [ ] **Step 3: 使用 `to-prd` 修订 PRD 1 的 P01-01 与全局帮助规则**

在修订记录增加 V1.2；将 P01-01 六要素更新为：

```markdown
| 场景描述 | 受邀合作方首次进入开发者后台，先理解盖世发行合作范围、完整流程和准备事项，再进入既有受邀账号登录。 |
| 输入／前置条件 | 合作方已签约并获得受邀账号；一期不开放公众注册。 |
| 需求描述 | **界面文字与布局：** 首屏依次展示盖世发行合作说明、四步流程、准备事项和“开始入驻”；点击后在同一路由展示账号、密码和登录按钮。<br>**展示说明：** 四步固定为“完成厂商与游戏资料 → 配置商品及 CDKEY → 上传包体并通过测试发布 → 提交精准投放并查看发行数据”；准备事项固定为受邀账号、公司与游戏授权资料、首款签约游戏资料、拟合作渠道和技术联系人。<br>**交互说明：** “开始入驻”只切换同页内容，不创建新 Tab、新路由或公众注册入口；返回合作说明时保留当前输入，刷新后恢复介绍首屏。 |
| 输出／后置条件 | 进入登录区后沿用受邀账号校验；成功进入 P01-02，失败不返回厂商数据。 |
| 补充说明 | 顶栏“帮助中心”为全局内容态，不计入 9 个业务页面；包含 8 项 FAQ 和“联系我们”，未配置联系方式时显示“请联系对接的盖世发行运营”。 |
```

- [ ] **Step 4: 使用 `to-prd` 修订 PRD 2 的边界、P02-01 六要素和接口规则**

在修订记录增加 V1.2，并写入以下完整规则：

```markdown
- P02-01 保持同一路由，包含“商品与供给、Key 批次、渠道 API、接口说明”四个任务 Tab；上方固定展示授权状态、剩余 Key 配额、可用渠道和发行暂停原因。
- 发行方只能在“签约主体 × 游戏 × SKU × 渠道 × 配额 × 有效期 × 启停状态”预授权范围内操作；平台发行运营负责开通、限额、白名单、暂停、撤销和审计，不代替发行方逐批发码。
- `gamehub_generated` 为盖世平台 Key；`external_imported` 为外部平台或供应商 Key，盖世不生成 Steam、Epic、GOG Key。
- Key 批次字段为批次名称、游戏、SKU、Key 来源、用途、渠道、数量和有效期；状态为生成中、可用、已暂停、已耗尽、已过期、已作废、生成失败。
- Key 明文仅允许一次性下载；`client_secret` 仅创建或轮换时展示一次，后续只显示 `client_id`、Secret 末四位、授权范围、有效期、最近调用和状态。
- 渠道 API 凭据支持创建、轮换、暂停和撤销；服务端每次请求重新校验发行方、游戏、SKU、渠道、配额、有效期和启停状态。
- 接口草案包含 `POST /openapi/v1/cdkeys/allocate`、`GET /openapi/v1/cdkeys/allocations/{request_id}`、`POST /openapi/v1/cdkeys/allocations/{request_id}/confirm`。
- 鉴权使用 `client_id + HMAC-SHA256`；时间戳、随机数和签名放在请求头；`request_id` 保证幂等；错误覆盖无权限、签名失败、时间戳过期、渠道暂停、游戏未授权、配额不足、无可用 Key、重复订单冲突和服务异常。
```

- [ ] **Step 5: 运行 PRD 契约和质量门禁**

Run:

```powershell
node --test tests/developer-backend/prd-cdkey-self-service.test.mjs
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md'
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md'
```

Expected: PRD 契约与两份质量门禁 PASS；页面仍为 9 页和 6 页，没有新增业务页面编号。

- [ ] **Step 6: 提交 PRD 规则**

```powershell
git add -- 'tests/developer-backend/prd-cdkey-self-service.test.mjs' 'prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md' 'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md'
git commit -m 'docs: define developer cdkey self-service rules'
```

### Task 3: 扩展唯一 Fixture，不存放明文凭据

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `tests/developer-backend/content.test.mjs`

- [ ] **Step 1: 写 Fixture 字段、敏感信息和路由数量失败测试**

```js
test('首次入驻、CDKEY 自助和帮助中心使用结构化 Fixture', () => {
  assert.deepEqual(fixture.pages['P01-01'].onboarding.steps, [
    '完成厂商与游戏资料',
    '配置商品及 CDKEY',
    '上传包体并通过测试发布',
    '提交精准投放并查看发行数据',
  ]);
  assert.deepEqual(fixture.pages['P02-01'].cdkeySelfService.tabs, [
    '商品与供给', 'Key 批次', '渠道 API', '接口说明',
  ]);
  assert.equal(fixture.helpCenter.faq.length, 8);
  assert.equal(fixture.helpCenter.contact.fallback, '请联系对接的盖世发行运营');
});

test('CDKEY 数据不包含可重复读取的完整 Key 或 Secret', () => {
  const source = JSON.stringify(fixture.pages['P02-01'].cdkeySelfService);
  assert.ok(!source.includes('steam_key'));
  assert.ok(!source.includes('clientSecret'));
  assert.match(source, /末四位/);
});

test('新增内容不改变 37 个业务路由和模块数量', () => {
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  assert.equal(routes.length, 37);
  assert.deepEqual(
    Object.fromEntries(['01', '02', '03', '04'].map(id => [id, routes.filter(route => route.moduleId === id).length])),
    { '01': 9, '02': 6, '03': 13, '04': 9 },
  );
  assert.ok(!routes.some(route => /帮助|介绍|API/.test(route.title) && route.id !== 'P02-01'));
});
```

- [ ] **Step 2: 运行内容测试并确认缺少新数据时失败**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: FAIL，缺少 `onboarding`、`cdkeySelfService` 和 `helpCenter`。

- [ ] **Step 3: 给 `P01-01` 增加入驻第一步数据**

在 `pages.P01-01` 内增加以下对象，保留现有登录异常和权限规则：

```json
"onboarding": {
  "title": "从首款签约游戏开始，完成发行闭环",
  "description": "盖世游戏为已签约且获得发行授权的合作方提供资料、供给、测试发布、精准投放和发行数据能力。",
  "audience": "一期仅面向受邀合作方",
  "steps": [
    "完成厂商与游戏资料",
    "配置商品及 CDKEY",
    "上传包体并通过测试发布",
    "提交精准投放并查看发行数据"
  ],
  "preparations": [
    "受邀账号",
    "公司与游戏授权资料",
    "首款签约游戏资料",
    "拟合作渠道和技术联系人"
  ],
  "primaryAction": "开始入驻"
}
```

同时把 `pages.P01-01.primaryAction` 从“登录”改为“开始入驻”；登录区按钮在模板内固定显示“登录”。

- [ ] **Step 4: 给 `P02-01` 增加授权、自助供给和接口文档数据**

```json
"cdkeySelfService": {
  "tabs": ["商品与供给", "Key 批次", "渠道 API", "接口说明"],
  "authorization": {
    "status": "授权正常",
    "remainingQuota": 8000,
    "channels": ["渠道 A", "渠道 B"],
    "pausedReason": "—",
    "scope": "示例厂商 × 首款签约游戏 × SKU-DEMO-001"
  },
  "keySources": [
    {"id":"gamehub_generated","label":"盖世平台 Key","rule":"由盖世兑换服务校验并授予已配置权益"},
    {"id":"external_imported","label":"外部平台 Key","rule":"仅受控导入或供应商 API 同步，盖世不生成"}
  ],
  "keyBatches": [
    {"batchId":"KEY-20260902-001","name":"渠道 A 首发批次","source":"盖世平台 Key","quantity":2000,"allocated":640,"remaining":1360,"channel":"渠道 A","status":"可用","download":"明文已下载"}
  ],
  "credentials": [
    {"name":"渠道 A 正式凭据","clientId":"gh_demo_channel_a","secretMask":"••••••••9K7Q","secretHint":"末四位 9K7Q","scope":"首款签约游戏 / SKU-DEMO-001","expiresAt":"2026-12-31 23:59","status":"正常","lastCalledAt":"2026-09-02 10:18"}
  ],
  "apiDocs": {
    "auth":"client_id + HMAC-SHA256；时间戳、随机数和签名放入请求头，Secret 不进入 URL。",
    "idempotency":"同一 request_id 返回同一分配结果，不重复扣减库存。",
    "endpoints":[
      {"method":"POST","path":"/openapi/v1/cdkeys/allocate","purpose":"按渠道订单分配一个 Key"},
      {"method":"GET","path":"/openapi/v1/cdkeys/allocations/{request_id}","purpose":"查询分配状态与掩码信息"},
      {"method":"POST","path":"/openapi/v1/cdkeys/allocations/{request_id}/confirm","purpose":"确认已向用户交付"}
    ],
    "errors":["无权限","签名失败","时间戳过期","渠道暂停","游戏未授权","配额不足","无可用 Key","重复订单冲突","服务异常"]
  }
}
```

- [ ] **Step 5: 增加全局帮助数据，使用运营兜底文案**

```json
"helpCenter": {
  "title": "帮助中心",
  "faq": [
    {"question":"如何创建 Key 批次？","answer":"先确认游戏、SKU、渠道、额度和有效期均在平台授权范围内，再在 Key 批次 Tab 提交。"},
    {"question":"额度不足怎么办？","answer":"当前批次不会生成，请联系对接的盖世发行运营调整授权额度。"},
    {"question":"渠道未开通怎么办？","answer":"发行方不能自行扩大白名单，请联系对接的盖世发行运营。"},
    {"question":"Secret 丢失怎么办？","answer":"Secret 不支持再次查看，请轮换凭据并更新第三方渠道配置。"},
    {"question":"重复请求如何处理？","answer":"同一 request_id 幂等返回原结果；订单内容冲突时返回重复订单冲突。"},
    {"question":"凭据暂停后会怎样？","answer":"新请求立即拒绝，历史审计和已交付记录继续保留。"},
    {"question":"Key 作废范围是什么？","answer":"只作废尚未分配的 Key，已分配记录继续保留。"},
    {"question":"盖世平台 Key 和外部平台 Key 有什么区别？","answer":"盖世平台 Key 由盖世兑换服务校验；Steam、Epic、GOG 等 Key 必须由对应平台或供应商提供。"}
  ],
  "contact": {
    "supportName":"发行支持",
    "serviceHours":"以合作对接安排为准",
    "channel":"当前未配置公开联系方式",
    "fallback":"请联系对接的盖世发行运营"
  }
}
```

- [ ] **Step 6: 运行内容测试**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: PASS，路由仍为 37 个，Fixture 契约与敏感信息检查通过。

- [ ] **Step 7: 提交 Fixture**

```powershell
git add -- 'demos/开发者后台一期/src/fixtures.json' 'tests/developer-backend/content.test.mjs'
git commit -m 'feat: add developer cdkey self-service fixtures'
```

### Task 4: 建立任务 Tab、授权摘要和文档组件

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/components.js`
- Modify: `demos/开发者后台一期/src/styles/components.css`
- Modify: `demos/开发者后台一期/src/styles/shell.css`
- Test: `tests/developer-backend/browser.test.mjs`

- [ ] **Step 1: 写组件语义和视觉失败测试**

```js
test('P02-01 使用可访问的按钮式任务 Tab 和固定授权摘要', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    const tabs = page.locator('[data-component="Tabs"][data-variant="task"] [role="tab"]');
    assert.equal(await tabs.count(), 4);
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
    assert.ok((await tabs.nth(0).boundingBox()).height >= 36);
    await page.locator('[data-cdkey-authorization]').waitFor();
  } finally { await page.close(); }
});

test('导航和顶栏具备清晰选中态与键盘焦点态', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    assert.equal(await page.locator('.nav-item.is-active').getAttribute('aria-current'), 'page');
    await page.locator('[data-help-open]').focus();
    assert.match(await page.locator('[data-help-open]').evaluate(node => getComputedStyle(node).outlineStyle), /solid|auto/);
  } finally { await page.close(); }
});
```

- [ ] **Step 2: 扩展 `tabs` 并增加代码块与授权摘要组件**

```js
const statusVariant = status => {
  const text = String(status || '');
  if (/通过|正常|已发布|进行中|已完成|可售|成功|在线|可用/.test(text)) return 'success';
  if (/异常|失败|驳回|中断|停售|下架|不通过|已作废|已撤销/.test(text)) return 'danger';
  if (/待|草稿|审核中|排期|测试中|处理中|暂停|生成中/.test(text)) return 'warning';
  return 'info';
};

const tabs = ({ items = [], active = 0, variant = 'line', action = 'tab', idPrefix = 'tab' }) =>
  `<div class="tabs" role="tablist" data-component="Tabs" data-variant="${escapeHtml(variant)}">${items.map((item, index) => {
    const id = `${idPrefix}-${index}`;
    return `<button id="${escapeHtml(id)}" class="tab${index === active ? ' is-active' : ''}" role="tab" aria-selected="${index === active}" aria-controls="${escapeHtml(id)}-panel" tabindex="${index === active ? '0' : '-1'}" data-demo-action="${escapeHtml(action)}" data-tab-index="${index}">${escapeHtml(item)}</button>`;
  }).join('')}</div>`;

const authorizationSummary = authorization => `<section class="authorization-summary" data-cdkey-authorization>
  <div><span>授权状态</span>${statusTag(authorization.status, 'success')}</div>
  <div><span>剩余 Key 配额</span><strong class="number">${escapeHtml(authorization.remainingQuota)}</strong></div>
  <div><span>可用渠道</span><strong>${escapeHtml(authorization.channels.join('、'))}</strong></div>
  <div><span>暂停原因</span><strong>${escapeHtml(authorization.pausedReason)}</strong></div>
</section>`;

const codeBlock = ({ title, code, action = 'copy-api-example' }) => `<section class="code-block">
  <header><strong>${escapeHtml(title)}</strong>${button({ label: '复制示例', variant: 'text', action, size: 'small' })}</header>
  <pre><code>${escapeHtml(code)}</code></pre>
</section>`;
```

将 `authorizationSummary`、`codeBlock` 加入 `namespace.components` 导出对象。

- [ ] **Step 3: 将任务 Tab 改为至少 36px 的按钮式状态**

```css
.tabs[data-variant="task"] { gap: 8px; padding: 4px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-muted); }
.tabs[data-variant="task"] .tab { min-height: 36px; padding: 8px 16px; border: 1px solid transparent; border-radius: 7px; }
.tabs[data-variant="task"] .tab.is-active { color: var(--text-primary); border-color: var(--line-strong); background: #FFFFFF; box-shadow: 0 2px 8px rgba(24,38,66,.08); }
.tabs[data-variant="task"] .tab.is-active::after { display: none; }
.tab:focus-visible, .nav-item:focus-visible, .top-help-button:focus-visible { outline: 2px solid var(--brand-cyan); outline-offset: 2px; }
.authorization-summary { position: sticky; top: 0; z-index: 2; margin-bottom: 16px; padding: 14px 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; border: 1px solid var(--line); border-radius: var(--radius-md); background: rgba(255,255,255,.96); }
.authorization-summary > div { min-width: 0; display: grid; gap: 5px; }
.authorization-summary span { color: var(--text-secondary); font-size: 11px; }
.code-block { overflow: hidden; border: 1px solid #24344F; border-radius: var(--radius-md); background: #101827; }
.code-block header { padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; color: #EAF0FA; border-bottom: 1px solid rgba(255,255,255,.08); }
.code-block pre { margin: 0; padding: 16px; overflow: auto; color: #C8F7FF; font: 12px/1.7 var(--font-number); }
```

- [ ] **Step 4: 强化顶栏文字和左侧导航状态**

```css
.brand-title, .top-context strong { color: #FFFFFF; }
.brand-subtitle, .account-copy span { color: #B7C2D6; }
.environment-badge { color: #D9FBFF; border-color: rgba(56,232,255,.52); background: rgba(56,232,255,.14); }
.nav-item { position: relative; color: #AAB7CA; }
.nav-item.is-active { color: #FFFFFF; background: linear-gradient(90deg, rgba(56,232,255,.20), rgba(106,124,255,.14)); }
.nav-item.is-active::before { position: absolute; top: 8px; bottom: 8px; left: 0; margin: 0; }
```

- [ ] **Step 5: 运行浏览器测试并提交组件**

Run: `node --test --test-name-pattern="任务 Tab|导航和顶栏" tests/developer-backend/browser.test.mjs`

Expected: PASS，Tab 高度、ARIA、焦点态、授权摘要及导航选中态通过。

```powershell
git add -- 'demos/开发者后台一期/src/runtime/components.js' 'demos/开发者后台一期/src/styles/components.css' 'demos/开发者后台一期/src/styles/shell.css' 'tests/developer-backend/browser.test.mjs'
git commit -m 'feat: add accessible developer workspace controls'
```

### Task 5: 将介绍并入 P01-01，并在 Shell 中加入帮助中心

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`
- Modify: `demos/开发者后台一期/src/styles/shell.css`
- Test: `tests/developer-backend/browser.test.mjs`

- [ ] **Step 1: 写首次入驻和帮助返回失败测试**

```js
test('P01-01 先介绍后登录且没有公众注册', async () => {
  const { page } = await openRoute(pageForRoute('P01-01'));
  try {
    await page.locator('[data-onboarding]').waitFor();
    assert.equal(await page.locator('[data-login-panel]').isHidden(), true);
    assert.equal(await page.getByText('注册', { exact: true }).count(), 0);
    await page.locator('[data-demo-action="start-onboarding"]').click();
    assert.equal(await page.locator('[data-login-panel]').isVisible(), true);
  } finally { await page.close(); }
});

test('帮助中心返回时保留路由、Tab 与滚动位置', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('[data-tab-index="2"]').click();
    await page.locator('.workspace').evaluate(node => { node.scrollTop = 180; });
    await page.locator('[data-help-open]').click();
    assert.equal(await page.locator('[data-help-center]').isVisible(), true);
    await page.locator('[data-help-back]').click();
    assert.equal(await page.locator('[data-tab-index="2"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.workspace').evaluate(node => node.scrollTop), 180);
  } finally { await page.close(); }
});
```

- [ ] **Step 2: 替换 T01 为“介绍 → 登录”的同页两步结构**

```js
const renderT01 = ({ page, route }) => {
  const onboarding = page.onboarding;
  return `<div class="onboarding-shell" data-onboarding>
    <section class="onboarding-intro" data-onboarding-intro>
      <div class="brand-mark">${icon('logo')}</div>
      <span class="onboarding-audience">${e(onboarding.audience)}</span>
      <h1>${e(onboarding.title)}</h1><p>${e(onboarding.description)}</p>
      <ol class="onboarding-steps">${onboarding.steps.map((step, index) => `<li><span>${index + 1}</span><strong>${e(step)}</strong></li>`).join('')}</ol>
      <div class="onboarding-preparations"><strong>开始前请准备</strong>${onboarding.preparations.map(item => `<span>${e(item)}</span>`).join('')}</div>
      ${c.button({ label: onboarding.primaryAction, variant: 'primary', action: 'start-onboarding', primary: true, iconName: 'chevron' })}
    </section>
    <section class="login-form" data-login-panel hidden>
      <button class="text-back" type="button" data-demo-action="back-onboarding">返回合作说明</button>
      <h2 class="page-title">${e(route.title)}</h2><p>使用已获授权的受邀账号继续</p>
      <div class="login-form__fields">${c.input({ label: '账号', value: 'developer@example.com', required: true })}${c.input({ label: '密码', value: 'demo-password', type: 'password', required: true })}</div>
      <div class="login-form__action">${c.button({ label: '登录', variant: 'primary', action: actionOf(page, 'login', '登录').id, primary: true, iconName: 'chevron' })}</div>
      <div class="login-help">账号由盖世游戏发行运营创建；本页不发起真实认证。</div>
    </section>
  </div>`;
};
```

- [ ] **Step 3: 在顶栏和 Shell 中渲染帮助内容态**

```js
const renderTopBar = ({ module, fixture, role, redacted }) => {
  const roleInfo = roleMeta[role] || roleMeta.developer;
  const account = redacted ? null : fixture.accounts?.[role];
  const context = redacted ? null : fixture.context;
  const help = redacted ? '' : `<button class="top-help-button" type="button" data-help-open data-demo-action="open-help">${icon('info')}<span>帮助中心</span></button>`;
  return `<header class="top-bar"><div class="brand-block"><div class="brand-mark">${icon('logo')}</div><div class="brand-copy"><div class="brand-title">盖世游戏</div><div class="brand-subtitle">开发者后台一期</div></div></div><div class="top-context"><strong>${e(module?.name || '开发者后台')}</strong><span class="environment-badge">${e(context?.environment || '演示环境')}</span></div>${help}<div class="top-account"><div class="account-avatar">${e((account?.name || roleInfo.label).slice(0, 1))}</div><div class="account-copy"><strong>${e(account?.name || roleInfo.label)}</strong><span>${e(account?.roleName || roleInfo.roleName)}</span></div></div></header>`;
};

const renderHelpCenter = help => `<section class="help-center" data-help-center hidden>
  <header class="help-center__header"><button type="button" data-help-back data-demo-action="close-help">返回</button><div><div class="page-eyebrow">GLOBAL HELP</div><h1>${e(help.title)}</h1></div></header>
  <div class="help-grid"><section class="panel"><h2>常见问题</h2><div class="faq-list">${help.faq.map((item, index) => `<article class="faq-item"><button type="button" aria-expanded="false" data-demo-action="toggle-faq" data-faq-index="${index}">${e(item.question)}</button><p hidden>${e(item.answer)}</p></article>`).join('')}</div></section>
  <aside class="contact-card"><h2>联系我们</h2><strong>${e(help.contact.supportName)}</strong><span>${e(help.contact.serviceHours)}</span><span>${e(help.contact.channel)}</span><p>${e(help.contact.fallback)}</p></aside></div>
</section>`;

const renderBusiness = ({ module, routes, route, page, fixture, role, state, content }) => {
  const redacted = state === 'permission';
  const isLogin = route.id === 'P01-01' && !redacted;
  return `<div class="demo-stage"><main class="product-frame${isLogin ? ' is-login' : ''}" data-frame-id="${e(route.id)}" data-role="${e(role)}" data-template-id="${e(route.templateId)}" data-page-state="${e(state)}">${renderTopBar({ module, fixture, role, redacted })}${isLogin ? '' : renderSideNav({ routes, route, role })}<section class="workspace">${isLogin ? '' : renderContext({ fixture, redacted })}<div class="page-wrap">${renderPageHeader({ route, page, state, redacted })}<div data-runtime-result></div>${content}</div>${redacted ? '' : renderHelpCenter(fixture.helpCenter)}</section></main>${renderReviewTools({ routes, route, role, state })}</div>`;
};
```

帮助内容不写入 `routes.json`，也不改变 `data-frame-id`。

- [ ] **Step 4: 在 `app.js` 实现同页切换与返回恢复**

```js
const memory = {
  page: Object.create(null), result: Object.create(null), upload: Object.create(null), business: Object.create(null),
  shell: { helpOpen: false, scrollTop: 0 },
};

const toggleHelp = open => {
  const workspace = root.querySelector('.workspace');
  const pageWrap = root.querySelector('.page-wrap');
  const help = root.querySelector('[data-help-center]');
  if (open) memory.shell.scrollTop = workspace?.scrollTop || 0;
  memory.shell.helpOpen = open;
  if (pageWrap) pageWrap.hidden = open;
  if (help) help.hidden = !open;
  if (!open && workspace) workspace.scrollTop = memory.shell.scrollTop;
};
```

在点击分发中实现：

```js
if (action === 'start-onboarding' || action === 'back-onboarding') {
  const showLogin = action === 'start-onboarding';
  root.querySelector('[data-onboarding-intro]').hidden = showLogin;
  root.querySelector('[data-login-panel]').hidden = !showLogin;
  return;
}
if (action === 'open-help') { toggleHelp(true); return; }
if (action === 'close-help') { toggleHelp(false); return; }
if (action === 'toggle-faq') {
  const answer = event.currentTarget.nextElementSibling;
  const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
  event.currentTarget.setAttribute('aria-expanded', String(!expanded));
  answer.hidden = expanded;
  return;
}
```

- [ ] **Step 5: 增加入驻与帮助布局样式**

```css
.onboarding-shell { min-height: 720px; display: grid; grid-template-columns: minmax(0, 1fr); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: #FFFFFF; }
.onboarding-intro { padding: 42px 56px; background: radial-gradient(circle at 18% 10%, rgba(56,232,255,.12), transparent 26%), linear-gradient(145deg, #0B1220, #17243D); color: #FFFFFF; }
.onboarding-intro > p { max-width: 760px; color: #B7C2D6; }
.onboarding-steps { margin: 30px 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; list-style: none; }
.onboarding-steps li { padding: 16px; min-height: 104px; border: 1px solid rgba(255,255,255,.12); border-radius: 10px; background: rgba(255,255,255,.05); }
.onboarding-steps li span { display: block; margin-bottom: 16px; color: var(--brand-cyan); font-weight: 700; }
.onboarding-preparations { margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; }
.onboarding-preparations strong { width: 100%; }
.onboarding-preparations span { padding: 7px 10px; border-radius: 999px; background: rgba(255,255,255,.08); }
.help-center { padding: var(--space-6) var(--space-8) 48px; }
.top-help-button { margin-left: auto; min-height: 36px; padding: 0 12px; display: inline-flex; align-items: center; gap: 7px; color: #EAF0FA; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; background: rgba(255,255,255,.06); }
.top-help-button + .top-account { margin-left: 0; }
.help-center__header { margin-bottom: 20px; display: flex; gap: 16px; align-items: center; }
.help-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; }
.faq-item button { width: 100%; min-height: 44px; padding: 12px 0; display: flex; justify-content: space-between; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: transparent; }
.faq-item p { margin: 0; padding: 12px 0 18px; color: var(--text-secondary); }
.contact-card { padding: 20px; display: grid; gap: 10px; align-content: start; border: 1px solid var(--line); border-radius: var(--radius-md); background: #FFFFFF; }
```

- [ ] **Step 6: 构建并运行首次入驻、帮助和全部通用状态测试**

Run:

```powershell
node 'demos/开发者后台一期/build.mjs'
node --test --test-name-pattern='先介绍后登录|帮助中心返回|five common states' tests/developer-backend/browser.test.mjs
```

Expected: PASS；刷新后 P01-01 恢复介绍第一步，帮助返回保留当前 Tab 与滚动位置。

- [ ] **Step 7: 提交 P01-01 与帮助中心**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/templates.js' 'demos/开发者后台一期/src/runtime/shell.js' 'demos/开发者后台一期/src/runtime/app.js' 'demos/开发者后台一期/src/styles/templates.css' 'demos/开发者后台一期/src/styles/shell.css' 'demos/开发者后台一期/01-开发者平台与资料demo.html' 'demos/开发者后台一期/02-CDKEY商品与供给demo.html' 'demos/开发者后台一期/03-包体测试与发布demo.html' 'demos/开发者后台一期/04-精准投放与数据demo.html' 'demos/开发者后台一期/开发者后台一期总览demo.html' 'tests/developer-backend/browser.test.mjs'
git commit -m 'feat: add invited onboarding and global help center'
```

### Task 6: 在 P02-01 完成四个任务 Tab 和自助操作

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`
- Test: `tests/developer-backend/browser.test.mjs`

- [ ] **Step 1: 写 Key 批次、凭据、接口说明和受限场景失败测试**

```js
test('P02-01 四个任务 Tab 可切换并展示对应内容', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    for (const [index, panel] of ['supply', 'batches', 'credentials', 'api-docs'].entries()) {
      await page.locator(`[data-tab-index="${index}"]`).click();
      assert.equal(await page.locator(`[data-cdkey-panel="${panel}"]`).isVisible(), true);
    }
  } finally { await page.close(); }
});

test('Key 明文和 Secret 仅在本次动作结果中展示一次', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('[data-tab-index="1"]').click();
    await page.locator('[data-demo-action="create-key-batch"]').click();
    await page.locator('[data-one-time-key-download]').waitFor({ state: 'visible' });
    await page.locator('[data-demo-action="simulate-key-download-failure"]').click();
    assert.equal(await page.locator('[data-one-time-key-download]').isVisible(), true);
    await page.locator('[data-demo-action="acknowledge-key-download"]').click();
    assert.equal(await page.locator('[data-one-time-key-download]').count(), 0);
    await page.locator('[data-tab-index="2"]').click();
    await page.locator('[data-demo-action="create-api-credential"]').click();
    assert.match(await page.locator('[data-one-time-secret]').textContent(), /仅显示一次/);
    await page.reload();
    assert.equal(await page.locator('[data-one-time-secret]').count(), 0);
  } finally { await page.close(); }
});

test('额度不足、渠道未授权和发行暂停会禁用自助动作并说明原因', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    for (const scenario of ['quota-exceeded', 'channel-denied', 'publishing-paused']) {
      await page.locator(`[data-review-scenario="${scenario}"]`).click();
      assert.equal(await page.locator('[data-demo-action="create-key-batch"]').isDisabled(), true);
      assert.equal(await page.locator('[data-restriction-reason]').isVisible(), true);
    }
  } finally { await page.close(); }
});

test('Key 批次和渠道凭据的失败、暂停、作废、轮换与撤销均可演示', async () => {
  const { page } = await openRoute(pageForRoute('P02-01'));
  try {
    await page.locator('[data-review-scenario="generation-failed"]').click();
    await page.locator('[data-tab-index="1"]').click();
    await page.locator('[data-demo-action="create-key-batch"]').click();
    await page.getByText('生成失败', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-one-time-key-download]').count(), 0);
    await page.locator('[data-demo-action="pause-key-batch"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="batches"] .status-tag').textContent(), '已暂停');
    await page.locator('[data-demo-action="void-key-batch"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="batches"] .status-tag').textContent(), '已作废');
    await page.locator('[data-tab-index="2"]').click();
    await page.locator('[data-demo-action="rotate-api-credential"]').click();
    await page.locator('[data-one-time-secret]').waitFor({ state: 'visible' });
    await page.locator('[data-demo-action="acknowledge-secret"]').click();
    await page.locator('[data-demo-action="pause-api-credential"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="credentials"] .status-tag').textContent(), '已暂停');
    await page.locator('[data-demo-action="revoke-api-credential"]').click();
    assert.equal(await page.locator('[data-cdkey-panel="credentials"] .status-tag').textContent(), '已撤销');
  } finally { await page.close(); }
});
```

- [ ] **Step 2: 新增 P02-01 专用渲染器，保持 T03 数量不变**

```js
const renderListView = config => {
  const filters = config.filters.map(filter => c.select(filter)).join('');
  return `<div>${c.tabs({ items: config.tabs, active: 0 })}<div class="filter-bar"><label class="field"><span class="field-label">关键词</span><span class="search-field">${icon('search')}<input class="gh-input" data-component="Input" data-variant="search" placeholder="${e(config.placeholder)}"></span></label>${filters}${c.button({ label: '查询', action: 'filter-list', iconName: 'search' })}</div>${c.table({ headers: config.headers, rows: config.rows })}${c.pagination({ total: config.rows.length, page: 1 })}</div>`;
};

const renderSupplyList = () => renderListView(listViews['P02-01']);

const renderKeyBatchPanel = data => `<div class="cdkey-panel-grid">
  <section class="panel"><header class="panel-header"><div><h2 class="panel-title">创建 Key 批次</h2><div class="panel-description">只允许在当前授权游戏、SKU、渠道、配额和有效期内创建</div></div></header><div class="panel-body"><div class="form-grid">
    ${c.input({ label: '批次名称', value: '渠道 A 首发批次', required: true })}
    ${c.select({ label: 'Key 来源', options: [{ label: data.keySources[0].label, value: data.keySources[0].id }], value: 'gamehub_generated' })}
    ${c.select({ label: '游戏 / SKU', options: ['首款签约游戏 / SKU-DEMO-001'], value: '首款签约游戏 / SKU-DEMO-001' })}
    ${c.input({ label: '用途', value: '渠道 A 首发销售', required: true })}
    ${c.select({ label: '渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
    ${c.input({ label: '数量', value: '2000', type: 'number', required: true })}
    ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
  </div><div class="source-boundary">${e(data.keySources[1].label)}：${e(data.keySources[1].rule)}</div><div data-key-batch-result></div><footer class="form-footer"><span class="save-state">明文只允许在有效窗口内下载一次</span>${c.button({ label: '创建批次', variant: 'primary', action: 'create-key-batch' })}</footer></div></section>
  <section class="panel"><header class="panel-header"><div><h2 class="panel-title">Key 批次</h2><div class="panel-description">已分配记录始终保留，作废只影响未分配库存</div></div></header><div class="panel-body">${c.table({ headers: ['批次', '来源', '数量 / 剩余', '渠道', '状态', '操作'], rows: data.keyBatches.map(batch => [[{ text: batch.name, subtext: batch.batchId }], batch.source, `${batch.quantity} / ${batch.remaining}`, batch.channel, { status: batch.status }, { action: '暂停', demoAction: 'pause-key-batch' }].flat()) })}<div class="form-actions">${c.button({ label: '作废未分配库存', variant: 'danger', action: 'void-key-batch' })}</div></div></section>
</div>`;

const renderCredentialPanel = data => `<div class="cdkey-panel-grid">
  <section class="panel"><header class="panel-header"><div><h2 class="panel-title">创建渠道凭据</h2><div class="panel-description">Secret 仅在创建或轮换成功时展示一次</div></div></header><div class="panel-body"><div class="form-grid">
    ${c.input({ label: '凭据名称', value: '渠道 A 正式凭据', required: true })}
    ${c.select({ label: '白名单渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
    ${c.select({ label: '授权游戏 / SKU', options: ['首款签约游戏 / SKU-DEMO-001'], value: '首款签约游戏 / SKU-DEMO-001' })}
    ${c.input({ label: '凭据配额', value: '5000', type: 'number', required: true })}
    ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
  </div><div data-credential-result></div><footer class="form-footer"><span class="save-state">凭据不能扩大平台预授权范围</span>${c.button({ label: '创建凭据', variant: 'primary', action: 'create-api-credential' })}</footer></div></section>
  <section class="panel"><header class="panel-header"><div><h2 class="panel-title">已创建凭据</h2></div></header><div class="panel-body">${c.table({ headers: ['凭据 / client_id', 'Secret', '授权范围', '有效期', '状态', '最近调用'], rows: data.credentials.map(item => [[{ text: item.name, subtext: item.clientId }], item.secretHint, item.scope, item.expiresAt, { status: item.status }, item.lastCalledAt].flat()) })}<div class="form-actions">${c.button({ label: '轮换', action: 'rotate-api-credential' })}${c.button({ label: '暂停', action: 'pause-api-credential' })}${c.button({ label: '撤销', variant: 'danger', action: 'revoke-api-credential' })}</div></div></section>
</div>`;

const renderApiDocs = (docs, apiExample) => `<div class="content-grid">
  <div class="span-4"><nav class="api-docs-nav" aria-label="接口说明目录">${[['auth','鉴权与幂等'],['endpoints','接口目录'],['fields','字段说明'],['example','请求示例'],['errors','错误码']].map(([id, label]) => `<button type="button" data-demo-action="api-doc-section" data-api-target="api-doc-${id}">${label}</button>`).join('')}</nav>${panel({ title: '接入步骤', body: sectionList(['创建渠道凭据', '按 HMAC-SHA256 生成签名', '使用 request_id 发起幂等申请', '查询结果并确认已交付']) })}</div>
  <div class="span-8"><section id="api-doc-auth">${panel({ title: '鉴权与幂等', body: `<p>${e(docs.auth)}</p><p>${e(docs.idempotency)}</p>` })}</section><section id="api-doc-endpoints">${panel({ title: '接口目录', body: c.table({ headers: ['方法', '路径', '用途'], rows: docs.endpoints.map(item => [item.method, item.path, item.purpose]) }) })}</section><section id="api-doc-fields">${panel({ title: '字段说明', body: c.table({ headers: ['字段', '必填', '说明'], rows: [['request_id','是','渠道侧幂等请求号'],['channel_order_id','是','渠道订单号'],['game_id','是','已授权游戏'],['sku_id','是','已授权 SKU'],['status','响应','分配处理状态']] }) })}</section><section id="api-doc-example">${c.codeBlock({ title: '申请一个 Key · 演示请求', code: apiExample })}</section><section id="api-doc-errors">${panel({ title: '错误码', body: `<div class="error-chip-list">${docs.errors.map(item => `<button type="button" data-demo-action="filter-api-error">${e(item)}</button>`).join('')}</div>` })}</section></div>
</div>`;

const renderCdkeyWorkspace = page => {
  const data = page.cdkeySelfService;
  const apiExample = `POST /openapi/v1/cdkeys/allocate\nX-Client-Id: gh_demo_channel_a\nX-Timestamp: 1788336000\nX-Nonce: demo_nonce\nX-Signature: demo_hmac_signature\n\n{\n  "request_id": "req_demo_001",\n  "channel_order_id": "channel_order_demo_001",\n  "game_id": "game_demo_001",\n  "sku_id": "SKU-DEMO-001"\n}`;
  return `<div class="cdkey-workspace" data-cdkey-workspace>
    ${c.authorizationSummary(data.authorization)}
    ${c.tabs({ items: data.tabs, active: 0, variant: 'task', action: 'cdkey-tab', idPrefix: 'cdkey-tab' })}
    <section role="tabpanel" id="cdkey-tab-0-panel" data-cdkey-panel="supply">${renderSupplyList()}</section>
    <section role="tabpanel" id="cdkey-tab-1-panel" data-cdkey-panel="batches" hidden>${renderKeyBatchPanel(data)}</section>
    <section role="tabpanel" id="cdkey-tab-2-panel" data-cdkey-panel="credentials" hidden>${renderCredentialPanel(data)}</section>
    <section role="tabpanel" id="cdkey-tab-3-panel" data-cdkey-panel="api-docs" hidden>${renderApiDocs(data.apiDocs, apiExample)}</section>
  </div>`;
};

const renderT03 = ({ route, page }) => {
  if (route.id === 'P02-01') return renderCdkeyWorkspace(page);
  const fallback = { tabs: ['全部', '待处理', '已完成'], placeholder: '输入名称或 ID', filters: [{ label: '业务状态', options: ['全部状态', '待处理', '处理中', '已完成'] }], headers: ['对象', '状态', '更新时间', '操作'], rows: [] };
  return renderListView(listViews[route.id] || fallback);
};
```

- [ ] **Step 3: 在 `app.js` 实现 Tab、Key 和凭据内存状态**

```js
if (action === 'cdkey-tab') {
  const index = Number(event.currentTarget.dataset.tabIndex);
  memory.page[route.id] = { ...(memory.page[route.id] || {}), cdkeyTab: index };
  root.querySelectorAll('[data-cdkey-panel]').forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
  event.currentTarget.parentElement.querySelectorAll('[role="tab"]').forEach((tab, tabIndex) => {
    const active = tabIndex === index;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  return;
}
if (action === 'create-key-batch') {
  const target = root.querySelector('[data-key-batch-result]');
  target.innerHTML = `<div class="one-time-result" data-key-batch-generating><strong>生成中</strong><span>正在按当前授权范围校验配额并生成盖世平台 Key。</span></div>`;
  setActionDisabled('create-key-batch', true);
  setTimeout(() => {
    if (root.querySelector('.product-frame')?.dataset.cdkeyScenario === 'generation-failed') {
      target.innerHTML = `<div class="result-strip" data-variant="danger"><strong>生成失败</strong><span>演示服务异常，未生成半批次且未扣减配额。</span></div>`;
      setActionDisabled('create-key-batch', false);
      return;
    }
    target.innerHTML = `<div class="one-time-result" data-one-time-key-download><strong>批次生成成功</strong><span>演示下载文件：KEY-20260902-NEW.csv；有效窗口内下载失败可重试，成功后不能再次查看明文。</span><div class="form-actions"><button type="button" data-demo-action="simulate-key-download-failure">模拟下载失败</button><button type="button" data-demo-action="acknowledge-key-download">模拟一次性下载成功</button></div></div>`;
    target.querySelector('[data-demo-action="simulate-key-download-failure"]').addEventListener('click', () => {
      resultMessage(route.id, '下载失败', '一次性有效窗口仍未关闭，可在当前页面重试。', 'warning');
    });
    target.querySelector('[data-demo-action="acknowledge-key-download"]').addEventListener('click', event => {
      event.currentTarget.closest('[data-one-time-key-download]')?.remove();
      resultMessage(route.id, '一次性下载窗口已关闭', '再次进入只显示批次号、数量、状态和审计记录。', 'warning');
    });
    resultMessage(route.id, 'Key 批次已创建', '2000 个盖世平台 Key 已进入一次性下载窗口。');
  }, 300);
  return;
}
if (action === 'create-api-credential' || action === 'rotate-api-credential') {
  const target = root.querySelector('[data-credential-result]');
  target.innerHTML = `<div class="one-time-result" data-one-time-secret><strong>client_secret 仅显示一次</strong><code>demo_secret_visible_once_9K7Q</code><button type="button" data-demo-action="acknowledge-secret">我已保存</button></div>`;
  target.querySelector('[data-demo-action="acknowledge-secret"]').addEventListener('click', event => {
    event.currentTarget.closest('[data-one-time-secret]')?.remove();
    resultMessage(route.id, 'Secret 已隐藏', '后续只显示末四位；遗失时必须轮换。', 'warning');
  });
  resultMessage(route.id, action === 'create-api-credential' ? '渠道凭据已创建' : '渠道凭据已轮换', '旧 Secret 已失效；本页关闭后只显示末四位。');
  return;
}
if (['pause-api-credential', 'revoke-api-credential', 'pause-key-batch', 'void-key-batch'].includes(action)) {
  updateBusinessState(route.id, { lastCdkeyAction: action }, `${action} · 仅写入当前页面内存审计`);
  const keyStatus = root.querySelector('[data-cdkey-panel="batches"] .status-tag');
  const credentialStatus = root.querySelector('[data-cdkey-panel="credentials"] .status-tag');
  if (action === 'pause-key-batch') setStatusTag(keyStatus, '已暂停');
  if (action === 'void-key-batch') setStatusTag(keyStatus, '已作废');
  if (action === 'pause-api-credential') setStatusTag(credentialStatus, '已暂停');
  if (action === 'revoke-api-credential') setStatusTag(credentialStatus, '已撤销');
  resultMessage(route.id, '状态已更新', '历史审计和已交付记录继续保留。', action.includes('revoke') || action.includes('void') ? 'danger' : 'warning');
  return;
}
if (action === 'api-doc-section') {
  root.querySelector(`#${event.currentTarget.dataset.apiTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return;
}
if (action === 'filter-api-error') {
  resultMessage(route.id, `错误码：${event.currentTarget.textContent.trim()}`, '已定位对应错误说明；不发起真实请求。', 'info');
  return;
}
if (action === 'copy-api-example') {
  navigator.clipboard.writeText(root.querySelector('.code-block code').textContent)
    .then(() => resultMessage(route.id, '示例已复制', '仅写入当前浏览器剪贴板。'))
    .catch(() => resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择示例文本。', 'warning'));
  return;
}
```

动态生成的“我已保存”按钮在插入时绑定一次处理器；页面刷新后内存清空，只显示 Fixture 中的掩码凭据和“明文已下载”。创建、轮换、暂停、撤销和作废均追加当前内存审计记录。

- [ ] **Step 4: 增加评审场景切换，不放进正式业务 Frame**

在 `renderReviewTools` 中仅当 `route.id === 'P02-01'` 时加入 `data-review-only="true"` 的场景按钮：

```js
const cdkeyScenarios = route.id === 'P02-01'
  ? `<div class="review-scenarios" data-review-only="true">${[
      ['quota-exceeded', '额度不足'],
      ['channel-denied', '渠道未授权'],
      ['publishing-paused', '发行暂停'],
      ['generation-failed', '生成失败'],
    ].map(([id, label]) => `<button type="button" data-review-scenario="${id}" data-demo-action="review-${id}">${label}</button>`).join('')}</div>`
  : '';
```

在 `app.js` 使用以下映射就地更新授权摘要、原因和禁用态，避免场景切换丢失当前 Tab：

```js
const restriction = {
  'review-quota-exceeded': ['剩余配额不足，当前申请需要 2000 个 Key。', '0', true, 'quota-exceeded'],
  'review-channel-denied': ['渠道 A 不在当前游戏白名单内。', '8000', true, 'channel-denied'],
  'review-publishing-paused': ['平台已暂停当前游戏的发行授权。', '8000', true, 'publishing-paused'],
  'review-generation-failed': ['下一次创建将展示生成失败且不扣减配额。', '8000', false, 'generation-failed'],
};
if (restriction[action]) {
  const [reason, quota, disabled, scenario] = restriction[action];
  root.querySelector('.product-frame').dataset.cdkeyScenario = scenario;
  root.querySelector('[data-cdkey-authorization] .number').textContent = quota;
  root.querySelector('[data-restriction-reason]')?.remove();
  root.querySelector('[data-cdkey-authorization]').insertAdjacentHTML('afterend', `<div class="result-strip" data-restriction-reason data-variant="warning"><strong>${c.escapeHtml(reason)}</strong><button type="button" data-restriction-help>查看帮助</button></div>`);
  root.querySelector('[data-restriction-help]').addEventListener('click', () => toggleHelp(true));
  setActionDisabled('create-key-batch', disabled);
  return;
}
```

Figma 构建脚本继续隐藏所有 `[data-review-only="true"]` 内容。

- [ ] **Step 5: 增加 P02-01 表单、结果和接口目录样式**

```css
.cdkey-workspace { min-width: 0; }
.cdkey-panel-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: 16px; }
.source-boundary { margin-top: 12px; padding: 10px 12px; color: var(--text-secondary); border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--surface-muted); }
.one-time-result { margin-top: 14px; padding: 14px; display: grid; gap: 8px; color: #0B6271; border: 1px solid rgba(47,215,239,.44); border-radius: var(--radius-sm); background: #EFFCFE; }
.one-time-result code { padding: 9px 10px; color: #FFFFFF; border-radius: 6px; background: #101827; font-family: var(--font-number); }
.api-docs-nav { margin-bottom: 16px; display: grid; border: 1px solid var(--line); border-radius: var(--radius-md); background: #FFFFFF; }
.api-docs-nav button { min-height: 40px; padding: 9px 12px; color: var(--text-secondary); text-align: left; border: 0; border-bottom: 1px solid var(--line); background: transparent; }
.api-docs-nav button:last-child { border-bottom: 0; }
.api-docs-nav button:hover, .api-docs-nav button:focus-visible { color: var(--text-primary); background: var(--surface-muted); }
.error-chip-list { display: flex; flex-wrap: wrap; gap: 8px; }
.error-chip-list button { min-height: 32px; padding: 6px 10px; color: var(--text-secondary); border: 1px solid var(--line); border-radius: 999px; background: #FFFFFF; }
[data-restriction-reason] { margin-bottom: 16px; justify-content: space-between; }
```

- [ ] **Step 6: 运行 P02-01 交互测试**

Run:

```powershell
node 'demos/开发者后台一期/build.mjs'
node --test --test-name-pattern='P02-01|Key 明文|额度不足' tests/developer-backend/browser.test.mjs
```

Expected: PASS；四 Tab、一次展示、掩码、轮换、暂停、撤销、异常限制和接口复制均可验证。

- [ ] **Step 7: 提交 P02-01**

```powershell
git add -- 'demos/开发者后台一期/src/runtime/templates.js' 'demos/开发者后台一期/src/runtime/app.js' 'demos/开发者后台一期/src/runtime/shell.js' 'demos/开发者后台一期/src/styles/templates.css' 'demos/开发者后台一期/开发者后台一期总览demo.html' 'demos/开发者后台一期/01-开发者平台与资料demo.html' 'demos/开发者后台一期/02-CDKEY商品与供给demo.html' 'demos/开发者后台一期/03-包体测试与发布demo.html' 'demos/开发者后台一期/04-精准投放与数据demo.html' 'tests/developer-backend/browser.test.mjs'
git commit -m 'feat: add publisher cdkey self-service workspace'
```

### Task 7: 更新 README 并完成离线、路由和全量浏览器回归

**Files:**
- Modify: `demos/开发者后台一期/README.md`
- Modify: `tests/developer-backend/build.test.mjs`
- Modify: `tests/developer-backend/manifest.test.mjs`
- Modify: `tests/developer-backend/browser.test.mjs`
- Create: `tests/developer-backend/capture-evidence.mjs`
- Regenerate: `demos/开发者后台一期/*.html`

- [ ] **Step 1: 把演示入口和安全边界写入 README**

增加以下明确规则：

```markdown
## P01-01 与 P02-01 本轮交互

- P01-01 首次进入先展示合作说明、四步流程与准备事项；“开始入驻”后在同一路由展示受邀账号登录。
- P02-01 在同一路由内提供“商品与供给、Key 批次、渠道 API、接口说明”四个任务 Tab。
- 顶栏帮助中心属于全局后台壳，不计入 37 个业务路由；返回后恢复原路由、Tab 与滚动位置。
- 盖世只生成由自身兑换服务校验的盖世平台 Key；外部平台 Key 仅能受控导入或通过供应商 API 同步。
- Key 明文仅在一次性下载动作中出现，Secret 仅在创建或轮换结果中出现；刷新后只能查看掩码。
- 所有 Key、凭据、URL、订单和审计内容均为演示数据，不连接真实服务。
```

- [ ] **Step 2: 加强构建产物断言**

```js
test('CDKEY 自助与帮助内容进入离线构建产物且没有远程依赖', () => {
  const p01 = fs.readFileSync(path.join(demoDir, '01-开发者平台与资料demo.html'), 'utf8');
  const p02 = fs.readFileSync(path.join(demoDir, '02-CDKEY商品与供给demo.html'), 'utf8');
  for (const token of ['开始入驻', '帮助中心']) assert.ok(p01.includes(token), token);
  for (const token of ['Key 批次', '渠道 API', '接口说明', 'HMAC-SHA256']) assert.ok(p02.includes(token), token);
  for (const html of [p01, p02]) {
    assert.ok(!/<script[^>]+src=/i.test(html));
    assert.ok(!/<link[^>]+href=/i.test(html));
    assert.ok(!/<iframe/i.test(html));
  }
});
```

- [ ] **Step 3: 创建可重复执行的截图与路由报告脚本**

```js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const outputDir = path.join(root, 'test-results', 'developer-backend');
const screenshotDir = path.join(outputDir, 'screenshots');
const routes = JSON.parse(fs.readFileSync(path.join(demoDir, 'src', 'routes.json'), 'utf8'));
const modules = JSON.parse(fs.readFileSync(path.join(demoDir, 'src', 'modules.json'), 'utf8'));
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome or Edge is required');
fs.mkdirSync(screenshotDir, { recursive: true });

const routeUrl = route => {
  const module = modules.find(item => item.id === route.moduleId);
  const url = pathToFileURL(path.join(demoDir, module.output));
  url.hash = `/${route.id}?role=${route.role}&state=default`;
  return url.href;
};
const browser = await chromium.launch({ headless: true, executablePath, args: ['--allow-file-access-from-files', '--disable-background-networking'] });
const report = [];
try {
  for (const route of routes) {
    const pageErrors = [];
    const consoleErrors = [];
    const remoteRequests = [];
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('request', request => { if (/^https?:/i.test(request.url())) remoteRequests.push(request.url()); });
    await page.goto(routeUrl(route), { waitUntil: 'load' });
    await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' });
    await page.screenshot({ path: path.join(screenshotDir, `1440x900-${route.id}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    report.push({ route: route.id, role: route.role, template: route.templateId, viewport: '1440x900', pageErrors, consoleErrors, remoteRequests, horizontalOverflow: overflow });
    await page.close();
  }

  for (const routeId of ['P01-01', 'P02-01']) {
    const route = routes.find(item => item.id === routeId);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(routeUrl(route), { waitUntil: 'load' });
    await page.screenshot({ path: path.join(screenshotDir, `1280x800-${routeId}.png`) });
    await page.close();
  }

  const p01 = routes.find(item => item.id === 'P01-01');
  const onboardingPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await onboardingPage.goto(routeUrl(p01), { waitUntil: 'load' });
  await onboardingPage.locator('[data-demo-action="start-onboarding"]').click();
  await onboardingPage.screenshot({ path: path.join(screenshotDir, '1440x900-P01-01-login-step.png') });
  await onboardingPage.close();

  const p02 = routes.find(item => item.id === 'P02-01');
  const cdkeyPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await cdkeyPage.goto(routeUrl(p02), { waitUntil: 'load' });
  for (const [index, name] of ['supply', 'key-batches', 'channel-api', 'api-docs'].entries()) {
    await cdkeyPage.locator(`[data-tab-index="${index}"]`).click();
    await cdkeyPage.screenshot({ path: path.join(screenshotDir, `1440x900-P02-01-${name}.png`) });
  }
  await cdkeyPage.locator('[data-help-open]').click();
  await cdkeyPage.screenshot({ path: path.join(screenshotDir, '1440x900-global-help.png') });
  await cdkeyPage.close();
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(outputDir, 'route-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Captured ${report.length} route records and current interaction screenshots.`);
```

- [ ] **Step 4: 重新构建、执行全部自动测试并生成证据**

Run:

```powershell
node 'demos/开发者后台一期/build.mjs'
node --test tests/developer-backend/*.test.mjs
node 'tests/developer-backend/capture-evidence.mjs'
```

Expected: PASS；5 个 HTML 构建稳定，37 个路由、两尺寸、五态、权限、交互、无远程请求和无横向溢出全部通过；`route-report.json` 含 37 条记录。

- [ ] **Step 5: 检查本轮文件和生成结果**

Run:

```powershell
git diff --check -- 'demos/开发者后台一期' 'tests/developer-backend'
git diff --stat -- 'demos/开发者后台一期' 'tests/developer-backend'
```

Expected: `git diff --check` 无输出；只出现本轮 Demo、README 与测试文件。

- [ ] **Step 6: 提交构建与回归**

```powershell
git add -- 'demos/开发者后台一期' 'tests/developer-backend' 'test-results/developer-backend'
git commit -m 'test: verify developer backend self-service demo'
```

### Task 8: 用当前 Demo 截图复核并补齐两份 PRD

**Files:**
- Modify: `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md`
- Modify: `prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md`
- Modify: `tests/developer-backend/prd-cdkey-self-service.test.mjs`
- Create or Update: `public/prd/genuine-game-distribution-phase1/02-developer/02-developer-login.png`
- Create or Update: `public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-developer-supply-status.png`

- [ ] **Step 1: 生成当前页面截图并核对六要素**

Run:

```powershell
node 'tests/developer-backend/capture-evidence.mjs'
```

逐项对照：

```text
P01-01：合作说明、四步流程、准备事项、开始入驻、登录第二步、无公众注册
P02-01：固定授权摘要、四个任务 Tab、Key 批次、渠道 API、接口目录、帮助入口
安全：默认截图不出现完整 Key 或完整 Secret
```

- [ ] **Step 2: 将默认态截图复制到 PRD 图片目录并单独提交二进制证据**

Run:

```powershell
Copy-Item -LiteralPath 'test-results/developer-backend/screenshots/1440x900-P01-01.png' -Destination 'public/prd/genuine-game-distribution-phase1/02-developer/02-developer-login.png' -Force
Copy-Item -LiteralPath 'test-results/developer-backend/screenshots/1440x900-P02-01-supply.png' -Destination 'public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-developer-supply-status.png' -Force
git add -- 'public/prd/genuine-game-distribution-phase1/02-developer/02-developer-login.png' 'public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-developer-supply-status.png'
git commit -m 'docs: add current developer backend prd screenshots'
git rev-parse HEAD
```

Expected: 输出唯一 40 位图片提交哈希；只提交两张当前截图。

- [ ] **Step 3: 计算固定图片 URL，并使用 `apply_patch` 更新两处图链**

Run:

```powershell
$imageCommit = git rev-parse HEAD
$loginImageUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/genuine-game-distribution-phase1/02-developer/02-developer-login.png"
$supplyImageUrl = "https://cdn.jsdelivr.net/gh/z36358631-ship-it/-@$imageCommit/public/prd/genuine-game-distribution-phase1/03-cdkey-supply/03-developer-supply-status.png"
Write-Output $loginImageUrl
Write-Output $supplyImageUrl
```

使用 `apply_patch` 将命令输出的第一条 URL 写入 PRD 1 的 P01-01 图片，将第二条 URL 写入 PRD 2 的 P02-01 图片；同时把 P01-01 图注改为“首次入驻介绍与受邀登录同页两步”，把 P02-01 图注改为“商品供给、Key 批次、渠道 API 与接口说明四 Tab”。不修改其他页面图片 URL。

- [ ] **Step 4: 再次用当前 Demo 核对 PRD 文字，不增加新页面**

P01-01 的场景、前置、展示、交互、后置和补充说明必须与 Task 2 一致；P02-01 必须覆盖授权摘要、四 Tab、两类 Key、一次展示、渠道凭据、三类接口、错误码和服务端逐次鉴权。发现文字与当前 Demo 不一致时，以 D-011／D-012 为准修改对应六要素，不改 P01-02—P01-09、P02-02—P02-06。

- [ ] **Step 5: 运行 PRD、图片和全量测试**

Run:

```powershell
node --test tests/developer-backend/*.test.mjs
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md'
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-quality.ps1' -Path 'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md'
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' -PrdPath 'prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md'
& 'C:\Users\z3635\.codex\skills\to-prd\scripts\validate-prd-images.ps1' -PrdPath 'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md'
```

Expected: PRD 契约、两份质量门禁和本地图片语法均 PASS；远程图片可用性只在真实 HTTP 成功时声明。

- [ ] **Step 6: 提交 PRD 图链与最终文字**

```powershell
git add -- 'prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md' 'prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md' 'tests/developer-backend/prd-cdkey-self-service.test.mjs'
git commit -m 'docs: sync developer onboarding and cdkey prds'
```

### Task 9: 生成当前 Figma 源并更新原云端文件

**Files:**
- Modify: `Figma/开发者后台一期/build-figma-source.mjs`
- Regenerate: `Figma/开发者后台一期/source/pages/*.svg`
- Regenerate: `Figma/开发者后台一期/source/figma-pages/*.svg`
- Regenerate: `Figma/开发者后台一期/source/gamehub-developer-backend-phase1.svg`
- Regenerate: `Figma/开发者后台一期/source/source-manifest.json`
- Modify: `Figma/开发者后台一期/figma-delivery.md`
- Modify: `tests/developer-backend/figma-organization.test.mjs`

- [ ] **Step 1: 写 P01/P02 Figma 内容与组织失败测试**

```js
test('P01-01 与 P02-01 Figma 源包含本轮确认内容', () => {
  const p01 = fs.readFileSync(path.join(sourceDir, 'pages/P01-01.svg'), 'utf8');
  const p02 = fs.readFileSync(path.join(sourceDir, 'pages/P02-01.svg'), 'utf8');
  for (const token of ['开始入驻', '完成厂商与游戏资料', '提交精准投放并查看发行数据']) assert.ok(p01.includes(token), token);
  for (const token of ['商品与供给', 'Key 批次', '渠道 API', '接口说明', '剩余 Key 配额']) assert.ok(p02.includes(token), token);
});

test('帮助内容态不增加业务 Frame 或正式 Page', () => {
  const frameMap = readJson('Figma/开发者后台一期/frame-map.json');
  const pageMap = readJson('Figma/开发者后台一期/figma-page-map.json');
  assert.equal(frameMap.totals.businessFrames, 37);
  assert.equal(pageMap.pages.length, 6);
});

test('组件母版登记 CDKEY 与帮助状态组件', () => {
  const components = fs.readFileSync(path.join(sourceDir, 'figma-pages/组件母版.svg'), 'utf8');
  for (const token of ['任务 Tabs（4 态）', '授权摘要', 'Key 批次表单', '渠道 API 凭据', '接口说明', '帮助中心 FAQ']) {
    assert.ok(components.includes(token), token);
  }
});
```

- [ ] **Step 2: 让构建脚本稳定提取 P01-01 的介绍首屏与 P02-01 默认 Tab**

`routeUrl` 继续使用每个 Frame 的默认 Hash；在 `extractRoute` 中确保页面内存已重置，并保持评审控件隐藏：

```js
await page.goto(routeUrl(route), { waitUntil: 'load' });
await page.addStyleTag({ content: '[data-review-only="true"] { display: none !important; } * { animation: none !important; transition: none !important; }' });
if (route.id === 'P01-01') await page.locator('[data-onboarding-intro]').waitFor({ state: 'visible' });
if (route.id === 'P02-01') await page.locator('[data-cdkey-panel="supply"]').waitFor({ state: 'visible' });
```

把 `componentMasterSection` 的 `groups` 更新为：

```js
const groups = [
  ['基础骨架', ['应用框架', '顶部栏', '侧边导航', '上下文栏', '页面标题区']],
  ['输入与操作', ['按钮', '输入框', '下拉选择', '上传', '分页', '标签页']],
  ['数据与流程', ['表格', '步骤条', '审核面板', '时间线', '指标卡', '图表']],
  ['状态', ['状态标签', '空状态', '异常状态', '无权限状态']],
  ['CDKEY 自助发行', ['任务 Tabs（4 态）', '授权摘要', 'Key 批次表单', '渠道 API 凭据', '接口说明', '帮助中心 FAQ']],
];
```

帮助内容态和 P02-01 的 Key 批次、渠道 API、接口说明均登记为同一业务页面的组件／状态，不计为新业务 Frame。

- [ ] **Step 3: 重新生成并验证本地 Figma 源**

Run:

```powershell
node 'Figma/开发者后台一期/build-figma-source.mjs'
node --test tests/developer-backend/figma-organization.test.mjs
```

Expected: PASS；仍为 6 个正式 Page、37 个业务 Frame，P01-01 和 P02-01 SVG 含当前内容，其他 Frame ID、顺序与尺寸不变。

- [ ] **Step 4: 使用 `gamehub-figma` 更新既有 Figma 文件**

目标文件固定为：[盖世游戏｜开发者后台一期](https://www.figma.com/design/arz12KT0WQ7UsHHglFtReN/)。

更新范围：

```text
01 开发者平台与资料 / P01-01
02 CDKEY 商品与供给 / P02-01
组件母版 / Tabs、授权摘要、代码块、FAQ、帮助内容态
```

在组件母版中建立 `P02-01 / Task State` 组件集，变体属性和值固定为 `Tab=Supply|KeyBatches|ChannelAPI|APIDocs`；以 `1440x900-P02-01-supply.png`、`key-batches.png`、`channel-api.png`、`api-docs.png` 为对照重建设计。另建立 `Global Help` 和 `P01-01 / Step=Intro|Login` 组件集；组件集不增加业务 Page 或 Frame ID。

保留 `00 全局流程索引`、P01-02—P01-09、P02-02—P02-06、P03、P04 和 `废弃／历史`。云端操作前核对当前文件链接和 Page 名称；不得新建第二个同名文件。

- [ ] **Step 5: 保存云端与可编辑性证据**

证据至少包括：

```text
Figma/开发者后台一期/evidence/figma-page-01-platform.png
Figma/开发者后台一期/evidence/figma-page-02-cdkey.png
Figma/开发者后台一期/evidence/figma-components-cdkey.png
Figma/开发者后台一期/evidence/figma-editable-text.png
Figma/开发者后台一期/evidence/figma-editable-vector.png
Figma/开发者后台一期/evidence/evidence-manifest.json
```

`evidence-manifest.json` 记录文件 URL、Page、Frame、截图尺寸、本地 SVG SHA-256 和核验时间；只有在 Figma 中实际展开文字与矢量图层后才写“可编辑通过”。

- [ ] **Step 6: 提交本地 Figma 源和交付记录**

```powershell
git add -- 'Figma/开发者后台一期' 'tests/developer-backend/figma-organization.test.mjs'
git commit -m 'design: sync developer cdkey self-service figma'
```

### Task 10: 完成两尺寸视觉验收和工作流回写

**Files:**
- Update: `test-results/developer-backend/screenshots/`
- Update: `test-results/developer-backend/route-report.json`
- Update: `test-results/developer-backend/visual-review.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json`

- [ ] **Step 1: 执行最终机器验证**

Run:

```powershell
node 'demos/开发者后台一期/build.mjs'
node --test tests/developer-backend/*.test.mjs
git diff --check -- 'demos/开发者后台一期' 'tests/developer-backend' 'prd/发行平台专项/开发者后台PRD' 'Figma/开发者后台一期' 'prd/workflow-state/LOCAL-20260901-developer-backend-prd.md'
```

Expected: 全部测试 PASS，`git diff --check` 无输出；37 路由和 `9／6／13／9` 保持不变。

- [ ] **Step 2: 原尺寸审查关键页面和状态**

在 `1440×900` 与 `1280×800` 下逐项记录：

```markdown
- P01-01：合作说明、四步流程、准备事项、开始入驻、登录第二步，无公众注册。
- P02-01：授权摘要、四个任务 Tab、列表密度、创建与禁用状态、接口文档代码块。
- 全局 Shell：顶栏文字、正式环境标签、帮助入口、左侧选中态、键盘焦点态。
- 帮助中心：8 项 FAQ、联系我们兜底文案、返回后的路由／Tab／滚动恢复。
- 安全：完整 Key 与 Secret 不在刷新后的 DOM、截图、日志或 Fixture 中。
```

有任一裁切、遮挡、横向溢出、低对比度或状态不清晰时回到对应任务修复，不能把自动测试通过替代人工审图。

- [ ] **Step 3: 按原子工作流完成 S5—S8**

使用 `workflow-run.ps1` 记录：

```powershell
$workflow = 'C:\Users\z3635\.codex\skills\gamehub-product-workflow\scripts\workflow-run.ps1'
$run = 'prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json'
& $workflow -Action pass -RunPath $run -StepId S5 -Outputs @('demos/开发者后台一期','prd/发行平台专项/开发者后台PRD','Figma/开发者后台一期') -Evidence @('PRD、Demo 与 Figma 本地源已同步') -Message '受影响产物已执行'
& $workflow -Action start-step -RunPath $run -StepId S6 -InputPaths @('tests/developer-backend/browser.test.mjs','tests/developer-backend/prd-cdkey-self-service.test.mjs','tests/developer-backend/figma-organization.test.mjs')
& $workflow -Action pass -RunPath $run -StepId S6 -Outputs @('test-results/developer-backend/route-report.json') -Evidence @('node --test tests/developer-backend/*.test.mjs 通过','git diff --check 通过') -Message '机器验证通过'
& $workflow -Action start-step -RunPath $run -StepId S7 -InputPaths @('test-results/developer-backend/visual-review.md','Figma/开发者后台一期/evidence/evidence-manifest.json')
& $workflow -Action pass -RunPath $run -StepId S7 -Outputs @('test-results/developer-backend/visual-review.md') -Evidence @('1440×900 与 1280×800 原尺寸截图','Figma P01/P02 与可编辑图层证据') -Reviewer 'Codex 产品与视觉复核' -Message '产品逻辑、视觉融合、异常边界和敏感信息检查通过'
& $workflow -Action start-step -RunPath $run -StepId S8 -InputPaths @('prd/workflow-state/LOCAL-20260901-developer-backend-prd.md')
& $workflow -Action pass -RunPath $run -StepId S8 -Outputs @('prd/workflow-state/LOCAL-20260901-developer-backend-prd.md') -Evidence @('37 路由、PRD、Demo、Figma 与证据已对账') -Message '一致性与交付完成'
```

命令中的 evidence 必须替换为实际执行结果；S7 必须填写 reviewer 和截图／审图证据。任何必需步骤为 `stale`、`failed` 或 `blocked` 时不能宣布完成。

- [ ] **Step 4: 回写状态卡**

先取得本轮提交和验证结果：

```powershell
git log --format='%H %s' -8
node --test tests/developer-backend/*.test.mjs
Get-Content -LiteralPath 'test-results/developer-backend/visual-review.md' -Raw
Get-Content -LiteralPath 'Figma/开发者后台一期/evidence/evidence-manifest.json' -Raw
```

使用 `apply_patch` 更新五行产物登记：增补规格记录提交 `1286eb75`；实施计划记录包含该计划的本地提交；PRD 1／2 记录质量门禁和图片验证；Demo 记录自动测试、两尺寸截图和人工审图；Figma 记录云端文件链接、Page／Frame 与可编辑证据。只有对应证据真实通过时使用“已同步”，否则写 `blocked` 及恢复条件。

生产接口路径、签名串拼接、时间窗口和真实联调环境继续标为研发／安全评审项；不得写成已上线。

- [ ] **Step 5: 提交证据与状态**

```powershell
git add -- 'test-results/developer-backend' 'prd/workflow-state/LOCAL-20260901-developer-backend-prd.md' 'prd/workflow-state/LOCAL-20260901-developer-backend-prd.run.json'
git commit -m 'docs: deliver developer cdkey self-service evidence'
```

- [ ] **Step 6: 最终提交范围检查**

Run:

```powershell
git status --short
git log --oneline -8
```

Expected: 本轮文件均已提交；工作区其他既有修改仍保留且未混入本轮提交。最终说明分别列出本地源文件、自动测试、人工审图、Git、云端 Figma 和远程图片的真实状态。

## 三、依赖顺序与停止条件

```text
规格确认
  → 契约测试
  → Fixture
  → 基础组件与视觉
  → P01-01 + 帮助中心
  → P02-01 自助发行
  → 全量 Demo 回归
  → PRD 与当前截图同步
  → Figma 本地源与云端文件同步
  → 两尺寸审图、状态卡与 S8 交付
```

- PRD 与 Demo 口径不一致时，先以 D-011／D-012 和本规格修正 Demo，再用当前截图回写 PRD。
- Figma 只消费通过 Demo 验收的页面；Demo 未通过时不更新云端文件。
- 云端 Figma 不可写时保留本地 SVG 与证据，将 Figma 标为 `blocked`，不把本地生成写成云端完成。
- 任何完整 Key、完整 Secret 或真实渠道凭据进入 Fixture、截图、日志或 Figma 时立即停止交付并清理该证据。
