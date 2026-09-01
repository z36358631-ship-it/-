# 盖世游戏开发者后台一期 Demo 与 Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 4 份已确认 PRD，交付 1 个评审总览、4 个离线单文件 HTML Demo、37 个可访问业务路由，以及 1 个含 5 个分区和 37 个可编辑业务 Frame 的新 Figma 文件。

**Architecture:** 在 `demos/开发者后台一期/src/` 维护唯一的路由、Fixture、Token、Shell、组件和模板源，由无外部依赖的 Node 构建脚本生成 5 份 HTML，避免四模块手工复制。浏览器运行时只修改内存中的演示状态，刷新恢复 Fixture；Figma 只消费已通过验收的 Demo，并按同一 Frame ID 建立组件实例和业务 Frame。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 内置 `node:test`、`playwright-core`、本地 Chrome/Edge、`ui-demo`、`gamehub-figma`

---

## 一、文件结构与职责

```text
demos/开发者后台一期/
├─ README.md                              # 打开方式、路由规则、角色与非本期范围
├─ build.mjs                             # 将唯一源构建成 5 个无外部依赖 HTML
├─ src/
│  ├─ modules.json                       # 4 个业务模块、输出文件名和默认路由
│  ├─ routes.json                        # 37 个 Frame/路由、模板和角色唯一映射
│  ├─ fixtures.json                      # 单厂商、单游戏、版本、供给、投放统一演示数据
│  ├─ styles/
│  │  ├─ tokens.css                      # 品牌、状态、字号、间距、圆角和阴影 Token
│  │  ├─ shell.css                       # 顶栏、侧栏、上下文栏、内容区和响应式骨架
│  │  ├─ components.css                  # 表格、表单、标签、上传、时间线、图表等组件
│  │  └─ templates.css                   # 15 类页面模板的布局差异
│  └─ runtime/
│     ├─ icons.js                        # 内联 SVG 图标函数，禁止 Emoji 和外链图标
│     ├─ components.js                   # 共享组件渲染与语义状态
│     ├─ templates.js                    # T01—T15 页面模板渲染
│     ├─ shell.js                        # 角色导航、全局上下文和权限外壳
│     └─ app.js                          # Hash 路由、交互、内存状态、异常状态切换
├─ 开发者后台一期总览demo.html            # 构建产物；Demo 评审控件，不进入 Figma 业务 Frame
├─ 01-开发者平台与资料demo.html           # 构建产物；P01-01—P01-09
├─ 02-CDKEY商品与供给demo.html            # 构建产物；P02-01—P02-06
├─ 03-包体测试与发布demo.html             # 构建产物；P03-01—P03-13
└─ 04-精准投放与数据demo.html             # 构建产物；P04-01—P04-09

tests/developer-backend/
├─ manifest.test.mjs                     # 37 路由、15 模板、角色、模块数量与唯一性
├─ build.test.mjs                        # 5 文件、自包含、无外链和可重复构建
├─ content.test.mjs                      # PRD 页面关键字段、动作、禁止项和跨模块对象
└─ browser.test.mjs                      # 37 路由、权限、交互、1440/1280 布局和控制台

test-results/developer-backend/
├─ screenshots/                          # 37 个 1440×900 默认态证据及代表性 1280 证据
├─ route-report.json                     # 每个路由的角色、状态、尺寸和错误结果
└─ visual-review.md                      # 人工原尺寸审图记录

Figma/开发者后台一期/
├─ frame-map.json                        # 5 分区、37 Frame 与 Demo URL 一一映射
├─ figma-delivery.md                     # 文件链接、组件、可编辑性和未解决风险
└─ evidence/                             # Demo/Figma 逐 Frame 对照证据
```

现有 `public/prd/genuine-game-distribution-phase1/02-developer/developer-screens.html` 及其 PNG 只作为同版本低保真信息基线，不覆盖、不删除。根目录和 `官网改动/index.html` 保留现有“开发者平台”入口，仅在新 Demo 验收通过后将内部演示跳转改到新登录页；正式认证地址不在本计划内。

## 二、任务计划

### Task 1: 固化 37 路由与 4 模块清单

**Files:**
- Create: `demos/开发者后台一期/src/modules.json`
- Create: `demos/开发者后台一期/src/routes.json`
- Create: `tests/developer-backend/manifest.test.mjs`

- [ ] **Step 1: 写路由清单失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

test('37 个 Frame ID 唯一且模块数量为 9/6/13/9', () => {
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  assert.equal(routes.length, 37);
  assert.equal(new Set(routes.map(item => item.id)).size, 37);
  assert.deepEqual(
    Object.fromEntries(['01', '02', '03', '04'].map(moduleId => [
      moduleId,
      routes.filter(item => item.moduleId === moduleId).length,
    ])),
    { '01': 9, '02': 6, '03': 13, '04': 9 },
  );
});

test('模板和角色只能使用已确认枚举', () => {
  const routes = readJson('demos/开发者后台一期/src/routes.json');
  const templates = new Set(Array.from({ length: 15 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`));
  const roles = new Set(['developer', 'operations', 'tester']);
  for (const route of routes) {
    assert.ok(templates.has(route.templateId), route.id);
    assert.ok(roles.has(route.role), route.id);
    assert.match(route.id, /^P0[1-4]-\d{2}$/);
  }
});
```

- [ ] **Step 2: 运行测试并确认缺少清单时失败**

Run: `node --test tests/developer-backend/manifest.test.mjs`

Expected: FAIL，错误指向 `modules.json` 或 `routes.json` 不存在。

- [ ] **Step 3: 创建模块清单**

```json
[
  {"id":"01","name":"开发者平台与资料","output":"01-开发者平台与资料demo.html","defaultRoute":"P01-01"},
  {"id":"02","name":"CDKEY 商品与供给","output":"02-CDKEY商品与供给demo.html","defaultRoute":"P02-01"},
  {"id":"03","name":"包体测试与发布","output":"03-包体测试与发布demo.html","defaultRoute":"P03-01"},
  {"id":"04","name":"精准投放与数据","output":"04-精准投放与数据demo.html","defaultRoute":"P04-01"}
]
```

- [ ] **Step 4: 创建完整路由清单**

```json
[
  {"id":"P01-01","moduleId":"01","templateId":"T01","role":"developer","title":"受邀账号登录页"},
  {"id":"P01-02","moduleId":"01","templateId":"T02","role":"developer","title":"开发者工作台首页"},
  {"id":"P01-03","moduleId":"01","templateId":"T04","role":"developer","title":"厂商资料页"},
  {"id":"P01-04","moduleId":"01","templateId":"T03","role":"developer","title":"游戏列表页"},
  {"id":"P01-05","moduleId":"01","templateId":"T05","role":"developer","title":"创建／编辑游戏页"},
  {"id":"P01-06","moduleId":"01","templateId":"T06","role":"developer","title":"资料审核结果页"},
  {"id":"P01-07","moduleId":"01","templateId":"T03","role":"operations","title":"合作方账号配置页"},
  {"id":"P01-08","moduleId":"01","templateId":"T07","role":"operations","title":"厂商资料审核页"},
  {"id":"P01-09","moduleId":"01","templateId":"T07","role":"operations","title":"游戏资料审核页"},
  {"id":"P02-01","moduleId":"02","templateId":"T03","role":"developer","title":"游戏商品与供给状态页"},
  {"id":"P02-02","moduleId":"02","templateId":"T09","role":"developer","title":"供给异常详情页"},
  {"id":"P02-03","moduleId":"02","templateId":"T03","role":"operations","title":"游戏商品列表页"},
  {"id":"P02-04","moduleId":"02","templateId":"T08","role":"operations","title":"商品／SKU 配置页"},
  {"id":"P02-05","moduleId":"02","templateId":"T08","role":"operations","title":"供应来源关联页"},
  {"id":"P02-06","moduleId":"02","templateId":"T03","role":"operations","title":"库存与供给异常页"},
  {"id":"P03-01","moduleId":"03","templateId":"T03","role":"developer","title":"版本列表页"},
  {"id":"P03-02","moduleId":"03","templateId":"T08","role":"developer","title":"创建／编辑版本页"},
  {"id":"P03-03","moduleId":"03","templateId":"T10","role":"developer","title":"包体上传页"},
  {"id":"P03-04","moduleId":"03","templateId":"T08","role":"developer","title":"提交测试确认页"},
  {"id":"P03-05","moduleId":"03","templateId":"T06","role":"developer","title":"测试驳回详情页"},
  {"id":"P03-06","moduleId":"03","templateId":"T03","role":"tester","title":"待测任务列表页"},
  {"id":"P03-07","moduleId":"03","templateId":"T11","role":"tester","title":"测试任务详情页"},
  {"id":"P03-08","moduleId":"03","templateId":"T11","role":"tester","title":"测试结果提交页"},
  {"id":"P03-09","moduleId":"03","templateId":"T03","role":"operations","title":"版本审核列表页"},
  {"id":"P03-10","moduleId":"03","templateId":"T07","role":"operations","title":"版本审核详情页"},
  {"id":"P03-11","moduleId":"03","templateId":"T03","role":"operations","title":"待发布列表页"},
  {"id":"P03-12","moduleId":"03","templateId":"T12","role":"operations","title":"发布配置页"},
  {"id":"P03-13","moduleId":"03","templateId":"T12","role":"operations","title":"线上版本处置页"},
  {"id":"P04-01","moduleId":"04","templateId":"T03","role":"developer","title":"开发者投放需求列表页"},
  {"id":"P04-02","moduleId":"04","templateId":"T13","role":"developer","title":"创建／编辑投放需求页"},
  {"id":"P04-03","moduleId":"04","templateId":"T13","role":"developer","title":"投放需求详情页"},
  {"id":"P04-04","moduleId":"04","templateId":"T15","role":"developer","title":"发行数据看板页"},
  {"id":"P04-05","moduleId":"04","templateId":"T03","role":"operations","title":"运营投放计划列表页"},
  {"id":"P04-06","moduleId":"04","templateId":"T07","role":"operations","title":"素材与落地页审核页"},
  {"id":"P04-07","moduleId":"04","templateId":"T14","role":"operations","title":"人群规则配置页"},
  {"id":"P04-08","moduleId":"04","templateId":"T14","role":"operations","title":"资源位与排期页"},
  {"id":"P04-09","moduleId":"04","templateId":"T15","role":"operations","title":"投放监控页"}
]
```

- [ ] **Step 5: 运行清单测试**

Run: `node --test tests/developer-backend/manifest.test.mjs`

Expected: PASS，2 tests passed。

- [ ] **Step 6: 提交路由基线**

```bash
git add "demos/开发者后台一期/src/modules.json" "demos/开发者后台一期/src/routes.json" "tests/developer-backend/manifest.test.mjs"
git commit -m "test: lock developer backend route manifest"
```

### Task 2: 建立单一 Fixture 与跨模块业务对象

**Files:**
- Create: `demos/开发者后台一期/src/fixtures.json`
- Create: `tests/developer-backend/content.test.mjs`

- [ ] **Step 1: 写跨模块对象和禁止项失败测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixture = JSON.parse(fs.readFileSync('demos/开发者后台一期/src/fixtures.json', 'utf8'));

test('四模块复用同一厂商、游戏、版本和投放对象', () => {
  assert.deepEqual(fixture.context, {
    vendorId: 'vendor_demo_001',
    vendorName: '示例厂商',
    gameId: 'game_demo_001',
    gameName: '首款签约游戏',
    versionId: 'version_demo_100',
    versionName: '1.0.0',
    campaignId: 'campaign_demo_001',
    environment: '正式环境',
  });
});

test('演示事实不越过一期边界', () => {
  assert.deepEqual(fixture.rules.outOfScope, {
    publicRegistration: false,
    bankAccount: false,
    automaticSettlement: false,
    macBuild: false,
    linuxBuild: false,
    bidding: false,
    algorithmicRecommendation: false,
  });
  assert.equal(fixture.rules.developerCanRelease, false);
  assert.equal(fixture.rules.developerCanStartCampaign, false);
  assert.equal(fixture.rules.autoSave, false);
});
```

- [ ] **Step 2: 运行测试并确认 Fixture 缺失时失败**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: FAIL，错误指向 `fixtures.json` 不存在。

- [ ] **Step 3: 写入统一 Fixture 根对象**

```json
{
  "context": {
    "vendorId": "vendor_demo_001",
    "vendorName": "示例厂商",
    "gameId": "game_demo_001",
    "gameName": "首款签约游戏",
    "versionId": "version_demo_100",
    "versionName": "1.0.0",
    "campaignId": "campaign_demo_001",
    "environment": "正式环境"
  },
  "accounts": {
    "developer": {"name":"王明","roleName":"受邀开发者","scope":"仅示例厂商与首款签约游戏"},
    "operations": {"name":"李然","roleName":"平台发行运营","scope":"签约厂商与游戏"},
    "tester": {"name":"陈宇","roleName":"平台测试人员","scope":"仅本人待测任务"}
  },
  "rules": {
    "developerCanRelease": false,
    "developerCanStartCampaign": false,
    "autoSave": false,
    "outOfScope": {
      "publicRegistration": false,
      "bankAccount": false,
      "automaticSettlement": false,
      "macBuild": false,
      "linuxBuild": false,
      "bidding": false,
      "algorithmicRecommendation": false
    },
    "cdkeySourceLabel": "供应商 API／受控来源",
    "campaignExecution": "开发者提需求，运营配置并执行，开发者只读结果",
    "refreshBehavior": "刷新恢复初始演示数据"
  },
  "states": ["default","loading","empty","error","permission"],
  "pages": {}
}
```

- [ ] **Step 4: 增加 Fixture 完整性断言**

在 `content.test.mjs` 增加：`routes.json` 中每个 ID 都必须在 `fixture.pages` 存在；每页必须提供 `summary`、`status`、`primaryAction`、`sections` 和 `states`，且 `states` 至少包含 `default/loading/empty/error/permission`。

```js
test('每个路由都有完整页面 Fixture', () => {
  const routes = JSON.parse(fs.readFileSync('demos/开发者后台一期/src/routes.json', 'utf8'));
  for (const route of routes) {
    const page = fixture.pages[route.id];
    assert.ok(page, route.id);
    for (const key of ['summary', 'status', 'primaryAction', 'sections', 'states']) assert.ok(key in page, `${route.id}:${key}`);
    assert.deepEqual(page.states.slice(0, 5), ['default','loading','empty','error','permission']);
  }
});
```

- [ ] **Step 5: 暂不补空页面，确认新增完整性测试准确失败 37 项**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: 业务根对象测试通过，页面 Fixture 完整性测试从 `P01-01` 开始失败。

- [ ] **Step 6: 提交 Fixture 根对象与测试门禁**

```bash
git add "demos/开发者后台一期/src/fixtures.json" "tests/developer-backend/content.test.mjs"
git commit -m "test: define developer backend fixture contract"
```

### Task 3: 构建离线单文件产物

**Files:**
- Create: `demos/开发者后台一期/build.mjs`
- Create: `tests/developer-backend/build.test.mjs`
- Create: `demos/开发者后台一期/src/runtime/icons.js`

- [ ] **Step 1: 写构建失败测试**

测试执行 `node demos/开发者后台一期/build.mjs`，断言 5 个输出文件存在、每个文件包含 `<!doctype html>`、内联 `<style>`、内联 `<script>`，且不存在外部脚本 `src=`、外部样式 `href=`、远程图片、`iframe` 或 `type="module"`。页面字段可以把完整 HTTPS 官网地址作为普通文本或输入值展示，但不能发起网络加载。

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const demoDir = path.join(process.cwd(), 'demos', '开发者后台一期');
const outputs = [
  '开发者后台一期总览demo.html',
  '01-开发者平台与资料demo.html',
  '02-CDKEY商品与供给demo.html',
  '03-包体测试与发布demo.html',
  '04-精准投放与数据demo.html',
];

test('构建 5 个完全自包含 HTML', () => {
  execFileSync(process.execPath, [path.join(demoDir, 'build.mjs')], { stdio: 'pipe' });
  for (const output of outputs) {
    const html = fs.readFileSync(path.join(demoDir, output), 'utf8');
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<style>[\s\S]+<\/style>/i);
    assert.match(html, /<script>[\s\S]+<\/script>/i);
    assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+rel=["']stylesheet["'][^>]+href=|<img[^>]+src=["']https?:\/\//i);
    assert.doesNotMatch(html, /<iframe|type=["']module["']/i);
  }
});
```

- [ ] **Step 2: 运行构建测试并确认脚本缺失时失败**

Run: `node --test tests/developer-backend/build.test.mjs`

Expected: FAIL，错误指向 `build.mjs` 不存在。

- [ ] **Step 3: 实现确定性构建脚本**

`build.mjs` 固定读取 `modules.json`、`routes.json`、`fixtures.json`、4 份 CSS 和 5 份 runtime JS；对 `<` 转义后把 JSON 放进 `application/json` Script；按模块只注入本模块路由；总览页注入四模块入口。每次写入前组装完整字符串，再用 `fs.writeFileSync` 覆盖对应构建产物；不读取网络和环境账号。

```js
const cssFiles = ['tokens.css', 'shell.css', 'components.css', 'templates.css'];
const runtimeFiles = ['icons.js', 'components.js', 'templates.js', 'shell.js', 'app.js'];
const escapeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const documentHtml = ({ title, module, routes, fixture, css, runtime, overview }) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${css}</style></head><body>
<div id="app" data-overview="${overview ? 'true' : 'false'}"></div>
<script id="demo-module" type="application/json">${escapeJson(module)}</script>
<script id="demo-routes" type="application/json">${escapeJson(routes)}</script>
<script id="demo-fixture" type="application/json">${escapeJson(fixture)}</script>
<script>${runtime}</script></body></html>`;
```

- [ ] **Step 4: 创建内联 SVG 图标库**

`icons.js` 只返回使用 `currentColor` 的内联 SVG，并至少提供 `logo/home/build/key/target/chart/game/vendor/review/test/publish/warning/chevron/search/refresh`。每个 SVG 包含 `aria-hidden="true"`，Logo 之外统一 `viewBox="0 0 24 24"`。

- [ ] **Step 5: 先创建最小 runtime 和 CSS 空壳以让构建测试只验证打包能力**

各 runtime 文件以 `window.GameHubDemo = window.GameHubDemo || {};` 开头；`app.js` 向 `#app` 写入“开发者后台一期正在构建”；4 份 CSS 各包含一个实际规则，避免空文件通过。

- [ ] **Step 6: 运行构建测试**

Run: `node --test tests/developer-backend/build.test.mjs`

Expected: PASS，1 test passed，5 个 HTML 可离线打开。

- [ ] **Step 7: 提交构建骨架**

```bash
git add "demos/开发者后台一期/build.mjs" "demos/开发者后台一期/src/runtime" "demos/开发者后台一期/src/styles" "tests/developer-backend/build.test.mjs" "demos/开发者后台一期"/*.html
git commit -m "feat: build self-contained developer backend demos"
```

### Task 4: 实现设计 Token、统一后台壳与共享组件

**Files:**
- Modify: `demos/开发者后台一期/src/styles/tokens.css`
- Modify: `demos/开发者后台一期/src/styles/shell.css`
- Modify: `demos/开发者后台一期/src/styles/components.css`
- Modify: `demos/开发者后台一期/src/runtime/components.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Modify: `tests/developer-backend/content.test.mjs`

- [ ] **Step 1: 写 Token 和壳层失败断言**

```js
test('核心 Token 与后台骨架均已定义', () => {
  const tokenCss = fs.readFileSync('demos/开发者后台一期/src/styles/tokens.css', 'utf8');
  const shellCss = fs.readFileSync('demos/开发者后台一期/src/styles/shell.css', 'utf8');
  for (const token of ['--brand-cyan:#38E8FF','--brand-blue:#6A7CFF','--success:#1E9B66','--warning:#C88918','--danger:#D95656']) {
    assert.ok(tokenCss.replaceAll(' ', '').includes(token), token);
  }
  assert.match(shellCss, /\.top-bar[^}]*height:\s*56px/s);
  assert.match(shellCss, /\.side-nav[^}]*width:\s*232px/s);
});
```

- [ ] **Step 2: 运行测试并确认 Token 不完整时失败**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: FAIL，核心 Token 或 Shell 尺寸缺失。

- [ ] **Step 3: 实现视觉 Token**

写入品牌色、状态色、中性色、字体层级、4/8px 间距体系、8/12px 圆角、焦点环和卡片阴影。字体栈使用 `MiSans VF, MiSans, PingFang SC, Microsoft YaHei, sans-serif`，数字栈使用 `D-DIN-PRO, DIN Alternate, tabular-nums`；不使用网络字体。

- [ ] **Step 4: 实现统一壳层**

壳层固定为 56px 顶栏、232px 侧栏、浅色内容区、全局上下文栏和页面标题区。开发者、运营、测试三套导航严格使用规格第 6.2 节；无对应对象的登录页隐藏上下文栏。业务画布根节点使用 `data-frame-id`，评审控件放在 `.review-tools`，与 `.product-frame` 分离。

- [ ] **Step 5: 实现共享组件**

`components.js` 提供 `button/input/select/statusTag/table/pagination/tabs/stepper/reviewPanel/timeline/metricCard/chart/statePanel/resultStrip`。Button、Input、Status Tag 和 Nav Item 同时用 `data-component` 与 `data-variant` 标记，供后续 Figma 对照；禁用状态包含颜色、文案和原生 `disabled`/`aria-disabled`。

- [ ] **Step 6: 重新构建并运行测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/manifest.test.mjs tests/developer-backend/build.test.mjs tests/developer-backend/content.test.mjs`

Expected: Token 与构建测试通过；页面 Fixture 完整性测试仍因业务页未补齐而失败。

- [ ] **Step 7: 提交设计系统和 Shell**

```bash
git add "demos/开发者后台一期/src/styles" "demos/开发者后台一期/src/runtime/components.js" "demos/开发者后台一期/src/runtime/shell.js" "tests/developer-backend/content.test.mjs" "demos/开发者后台一期"/*.html
git commit -m "feat: add developer backend design system and shell"
```

### Task 5: 实现 15 类模板与通用页面状态

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/templates.js`
- Modify: `demos/开发者后台一期/src/styles/templates.css`
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `tests/developer-backend/content.test.mjs`

- [ ] **Step 1: 写 15 模板和五态失败测试**

测试读取 `templates.js`，断言 `T01` 至 `T15` 均注册；运行时每个页面可根据 `state=default/loading/empty/error/permission` 渲染带 `data-page-state` 的根节点。

- [ ] **Step 2: 运行测试并确认模板未注册时失败**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: FAIL，首先报告 `T01` 未注册。

- [ ] **Step 3: 实现 T01—T08**

按规格第 7 节实现受邀登录、工作台、主列表、厂商资料、游戏编辑、结果时间线、运营审核和配置表单。表单固定提供显式“保存草稿”和最近保存时间，不创建自动保存；列表保留筛选、页码和滚动位置到当前内存状态。

- [ ] **Step 4: 实现 T09—T15**

实现异常详情、分片上传、测试任务、发布控制、投放需求、规则排期和数据看板。图表使用 HTML/CSS/SVG 矢量绘制；没有真实素材时展示明确“示例素材／待业务确认”，不使用通用图片冒充。

- [ ] **Step 5: 实现五种通用页面状态**

`loading` 使用结构化骨架屏；`empty` 保留页面标题和允许的主动作；`error` 显示行内重试；`permission` 不泄露对象存在性；`default` 渲染业务内容。状态通过 Hash 查询参数 `state` 驱动，非法状态回退 `default`。

- [ ] **Step 6: 重新构建并运行模板测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: 15 模板与通用状态测试通过；37 页面 Fixture 完整性仍未全部通过。

- [ ] **Step 7: 提交模板系统**

```bash
git add "demos/开发者后台一期/src/runtime/templates.js" "demos/开发者后台一期/src/runtime/app.js" "demos/开发者后台一期/src/styles/templates.css" "tests/developer-backend/content.test.mjs" "demos/开发者后台一期"/*.html
git commit -m "feat: add developer backend page templates"
```

### Task 6: 完成资料模块 9 页

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `tests/developer-backend/content.test.mjs`

**PRD Source:** `prd/发行平台专项/开发者后台PRD/01-开发者平台、厂商与游戏资料PRD.md:103`

- [ ] **Step 1: 写 P01 关键内容失败测试**

为每页断言以下关键内容：

```js
const p01Expected = {
  'P01-01': ['受邀账号', '账号由盖世游戏发行运营创建', '登录'],
  'P01-02': ['首款签约游戏', '待办', '资料状态', '版本状态'],
  'P01-03': ['厂商名称', 'Logo', '厂商简介', '官网', '联系人', '保存草稿', '提交审核'],
  'P01-04': ['游戏名称', '发行方式', '资料状态', '创建游戏'],
  'P01-05': ['Windows', '游戏介绍', '素材', '发行方式', '保存草稿'],
  'P01-06': ['审核结果', '驳回原因', '处理记录', '继续修改'],
  'P01-07': ['账号', '绑定厂商', '状态', '最近登录'],
  'P01-08': ['厂商资料', '差异', '通过', '驳回原因'],
  'P01-09': ['游戏资料', '发行方式', '素材', '通过', '驳回原因'],
};
```

- [ ] **Step 2: 运行测试并确认 P01 页面缺失时失败**

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: FAIL，首先报告 `P01-01`。

- [ ] **Step 3: 按 PRD 3.2.1—3.2.9 写入 9 页 Fixture**

每页 `sections` 按 PRD 的页面定位、页面内容、交互逻辑、异常边界、数据规则和验收标准组织；不得加入组织成员、在线合同、税务、银行或公众注册。P01-05 仅含 Windows，发行方式只允许“第三方平台激活”和“盖世直接下载”互斥选择。

- [ ] **Step 4: 补资料模块关键交互**

登录进入 P01-02；游戏列表进入编辑页；保存草稿更新“最近保存时间”但刷新恢复；运营审核通过／驳回只改变内存状态并写入页面内结果条；直接以开发者角色访问 P01-08/P01-09 渲染 `permission`。

- [ ] **Step 5: 构建并运行内容测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: P01 关键内容全部通过；完整性测试从 `P02-01` 开始失败。

- [ ] **Step 6: 提交资料模块**

```bash
git add "demos/开发者后台一期/src/fixtures.json" "tests/developer-backend/content.test.mjs" "demos/开发者后台一期/01-开发者平台与资料demo.html"
git commit -m "feat: implement publisher and game module demo"
```

### Task 7: 完成 CDKEY 模块 6 页

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `tests/developer-backend/content.test.mjs`

**PRD Source:** `prd/发行平台专项/开发者后台PRD/02-游戏商品与CDKEY供给管理PRD.md:109`

- [ ] **Step 1: 写 P02 关键内容失败测试**

```js
const p02Expected = {
  'P02-01': ['商品状态', '供给状态', '可售门禁', '异常'],
  'P02-02': ['异常类型', '影响范围', '恢复条件', '处理时间线'],
  'P02-03': ['商品', 'SKU', '发行方式', '供给状态'],
  'P02-04': ['商品名称', 'SKU', '价格', '状态', '保存'],
  'P02-05': ['供应商 API／受控来源', '关联状态', '校验'],
  'P02-06': ['库存', '供给异常', '影响订单', '处理状态'],
};
```

- [ ] **Step 2: 按 PRD 3.2.1—3.2.6 写入 6 页 Fixture**

CDKEY 只描述商品、SKU、供应来源关联、库存与异常；购买、订单、发 Key、激活和退款明确复用既有链路，不新增对应后台页面。实际供应商名称和接口能力不硬编码，显示“供应商 API／受控来源”与“待业务确认”。

- [ ] **Step 3: 补供给异常交互**

列表筛选、分页和异常详情可操作；供给中断不会修改旧订单；恢复动作只在满足恢复条件后改变演示状态；不生成真实 CDKEY、不调用供应商接口。

- [ ] **Step 4: 构建并运行内容测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: P01/P02 全部通过；完整性测试从 `P03-01` 开始失败。

- [ ] **Step 5: 提交 CDKEY 模块**

```bash
git add "demos/开发者后台一期/src/fixtures.json" "tests/developer-backend/content.test.mjs" "demos/开发者后台一期/02-CDKEY商品与供给demo.html"
git commit -m "feat: implement cdkey supply module demo"
```

### Task 8: 完成包体、测试与发布模块 13 页

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `tests/developer-backend/content.test.mjs`

**PRD Source:** `prd/发行平台专项/开发者后台PRD/03-游戏包体、测试审核与版本发布PRD.md:124`

- [ ] **Step 1: 写 P03 关键内容失败测试**

```js
const p03Expected = {
  'P03-01': ['版本号', '修订', '测试状态', '发布状态'],
  'P03-02': ['1.0.0', 'Windows', '更新说明', '保存草稿'],
  'P03-03': ['分片上传', '校验', '中断', '继续上传'],
  'P03-04': ['提交测试', '包体摘要', '检查清单'],
  'P03-05': ['测试驳回', '问题项', '修订', '重新提交'],
  'P03-06': ['待测任务', '测试人员', '包体版本', '领取'],
  'P03-07': ['测试范围', '环境', '包体说明', '开始测试'],
  'P03-08': ['通过', '不通过', '问题描述', '提交结果'],
  'P03-09': ['版本审核', '测试结果', '审核状态'],
  'P03-10': ['发布门禁', '版本差异', '通过', '驳回'],
  'P03-11': ['待发布', '当前线上版本', '门禁状态'],
  'P03-12': ['立即发布', '定时发布', '保持原线上版本'],
  'P03-13': ['线上版本', '下架', '停售', '处置记录'],
};
```

- [ ] **Step 2: 按 PRD 3.2.1—3.2.13 和 3.3 状态机写入 13 页 Fixture**

只包含单一正式分支和 Windows 包体；版本 `1.0.0` 使用修订号表达重复提交。开发者可提交测试但不可直接发布／回滚；测试人员仅可处理分配给本人的任务；运营发布前必须同时满足资料、测试、商品供给与投放相关门禁。

- [ ] **Step 3: 实现上传、测试和发布演示链路**

上传按钮依次演示“上传中→网络中断→保留已完成分片→继续上传→校验通过”；测试人员提交结果后历史不可覆盖；发布失败保留原线上版本。立即／定时发布互斥；高风险处置使用红色次级按钮和页面内结果条，不新增弹窗或 Toast。

- [ ] **Step 4: 构建并运行内容测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/content.test.mjs`

Expected: P01—P03 全部通过；完整性测试从 `P04-01` 开始失败。

- [ ] **Step 5: 提交包体发布模块**

```bash
git add "demos/开发者后台一期/src/fixtures.json" "tests/developer-backend/content.test.mjs" "demos/开发者后台一期/03-包体测试与发布demo.html"
git commit -m "feat: implement build test and release module demo"
```

### Task 9: 完成精准投放与数据模块 9 页

**Files:**
- Modify: `demos/开发者后台一期/src/fixtures.json`
- Modify: `tests/developer-backend/content.test.mjs`

**PRD Source:** `prd/发行平台专项/开发者后台PRD/04-精准化投放与发行数据看板PRD.md:115`

- [ ] **Step 1: 写 P04 关键内容失败测试**

```js
const p04Expected = {
  'P04-01': ['投放需求', '期望时间', '需求状态', '创建需求'],
  'P04-02': ['投放目标', '示例素材', '期望人群', '时间范围'],
  'P04-03': ['运营回执', '开发者只读', '配置摘要', '结果'],
  'P04-04': ['曝光', '点击', '访问', '转化', 'T+1'],
  'P04-05': ['投放计划', '资源位', '排期', '计划状态'],
  'P04-06': ['素材', '落地页', '审核', '驳回原因'],
  'P04-07': ['地区', '语言', '设备／系统', '平台行为', '排除'],
  'P04-08': ['资源位待业务确认', '开始时间', '结束时间', '排期冲突'],
  'P04-09': ['曝光', '点击率', '访问', '转化', '停止'],
};
```

- [ ] **Step 2: 按 PRD 3.2.1—3.2.9、3.3 和 4.1 写入 9 页 Fixture**

精准投放严格采用方案 A：开发者提交需求；运营配置合法标签、资源位和排期并执行；开发者只读 T+1 聚合结果。人群标签只展示已确认建议的地区、语言、设备／系统和本平台行为；资源位与点击归因窗口标记“待业务确认”，不虚构竞价、预算自动消耗或算法推荐。

- [ ] **Step 3: 实现投放规则与数据交互**

需求草稿、素材审核、人群包含／排除、资源位冲突、排期和计划停止可操作。门禁失败不产生曝光；看板时间范围和指标卡切换可操作；开发者页面不展示单用户数据和运营内部编辑动作。

- [ ] **Step 4: 构建并运行全部内容测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/manifest.test.mjs tests/developer-backend/build.test.mjs tests/developer-backend/content.test.mjs`

Expected: PASS；37/37 页面 Fixture、关键内容、角色、模块数量和离线构建全部通过。

- [ ] **Step 5: 提交精准投放模块**

```bash
git add "demos/开发者后台一期/src/fixtures.json" "tests/developer-backend/content.test.mjs" "demos/开发者后台一期/04-精准投放与数据demo.html"
git commit -m "feat: implement targeting and analytics module demo"
```

### Task 10: 完成总览、路由、权限与状态恢复

**Files:**
- Modify: `demos/开发者后台一期/src/runtime/app.js`
- Modify: `demos/开发者后台一期/src/runtime/shell.js`
- Create: `demos/开发者后台一期/README.md`
- Modify: `tests/developer-backend/build.test.mjs`

- [ ] **Step 1: 写运行时行为失败测试**

断言总览存在四模块卡片、三角色说明和 37 页索引；业务 Demo 使用 `#/P01-02?role=developer&state=default` 形式；未知 ID 回退本模块默认路由；角色不符显示无权限；刷新后保存、审核、上传、测试、发布和投放演示状态回到 Fixture。

- [ ] **Step 2: 实现总览评审入口**

总览页允许选择角色、模块、Frame ID 和通用状态，并打开对应业务 Demo。该控件必须放在产品画布之外，页面明确标记“仅供评审，不属于正式后台功能”，不写入 Figma 业务 Frame。

- [ ] **Step 3: 实现 Hash 路由和内存状态**

解析 `route/role/state`；导航时保留当前模块允许的厂商、游戏、版本上下文；列表返回保留筛选、页码和滚动位置；非法角色、状态或路由使用安全默认值。状态只保存在当前页面 JavaScript 对象，不写 `localStorage` 或远程接口。

- [ ] **Step 4: 编写 README**

README 说明 5 个入口文件、Hash 示例、3 个角色、5 个通用状态、刷新恢复、无外部依赖、未实现真实登录／上传／发布／投放、实际 CDKEY 供应方式／资源位／标签／归因窗口待业务冻结。

- [ ] **Step 5: 构建并运行全部静态测试**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/*.test.mjs`

Expected: 所有当前测试通过，尚未创建的浏览器测试不参与本步。

- [ ] **Step 6: 提交总览与路由交互**

```bash
git add "demos/开发者后台一期" "tests/developer-backend/build.test.mjs"
git commit -m "feat: complete developer backend demo navigation"
```

### Task 11: 执行真实浏览器验收与视觉证据

**Files:**
- Create: `tests/developer-backend/browser.test.mjs`
- Create: `test-results/developer-backend/route-report.json`
- Create: `test-results/developer-backend/visual-review.md`
- Create: `test-results/developer-backend/screenshots/*.png`

- [ ] **Step 1: 写 37 路由浏览器测试**

使用 `playwright-core` 启动本机 Chrome/Edge，逐路由在 1440×900 和 1280×800 打开，收集 `pageerror` 和 `console.error`；断言 `data-frame-id`、标题、角色、模板和主动作与 manifest/Fixture 一致，页面无水平滚动，主动作和侧栏均在视口内。

```js
for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  await page.setViewportSize(viewport);
  for (const route of routes) {
    await page.goto(routeUrl(route), { waitUntil: 'load' });
    assert.equal(await page.locator('.product-frame').getAttribute('data-frame-id'), route.id);
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth), true, route.id);
    assert.equal(await page.locator('[data-primary-action]').isVisible(), true, route.id);
  }
}
```

- [ ] **Step 2: 增加权限和五态测试**

每个角色至少抽取 1 个无权页面；37 路由分别验证 `loading/empty/error/permission` 可渲染，直接访问无权页面不显示对象名称。另覆盖保存草稿、审核通过／驳回、上传中断／重试、测试结果、立即／定时发布、投放规则和看板时间范围。

- [ ] **Step 3: 运行浏览器测试**

Run: `node --test tests/developer-backend/browser.test.mjs`

Expected: PASS；37/37 路由两种尺寸通过，控制台和页面错误为 0。

- [ ] **Step 4: 生成截图与报告**

为 37 个默认态保存 `1440x900-Pxx-xx.png`；为 P01-02、P02-03、P03-12、P04-04 保存 1280 代表页；写入包含 route、role、template、viewport、pageErrors、consoleErrors、horizontalOverflow 的 `route-report.json`。

- [ ] **Step 5: 使用 `ui-demo` 的视觉验收流程逐张审图**

对 37 张原尺寸图检查现有深色品牌语言、信息层级、内容密度、表格可读性、状态色、交互焦点、无裁切和非本期内容；把问题和修复结果写入 `visual-review.md`。如果审图发现问题，先修改唯一源、重新构建并重跑受影响截图，不直接改构建产物。

- [ ] **Step 6: 提交 Demo 与证据**

```bash
git add "demos/开发者后台一期" "tests/developer-backend" "test-results/developer-backend"
git commit -m "test: verify developer backend demos in browser"
```

### Task 12: 将官网入口切换到验收通过的新登录页

**Files:**
- Modify: `index.html:539`
- Modify: `官网改动/index.html:539`
- Modify: `tests/developer-backend/browser.test.mjs`

- [ ] **Step 1: 写两个入口跳转失败测试**

根目录入口期望为 `demos/开发者后台一期/01-开发者平台与资料demo.html#/P01-01?role=developer&state=default`；嵌套副本入口期望为 `../demos/开发者后台一期/01-开发者平台与资料demo.html#/P01-01?role=developer&state=default`。

- [ ] **Step 2: 运行入口测试并确认旧低保真地址导致失败**

Run: `node --test tests/developer-backend/browser.test.mjs`

Expected: FAIL，实际仍指向 `developer-screens.html?page=developer-login`。

- [ ] **Step 3: 只修改两个现有链接地址**

保留文字、样式、中英文键值和响应式规则不变；不新增导航项、弹窗、注册入口或正式认证逻辑。

- [ ] **Step 4: 验证根目录和嵌套入口**

Run: `node --test tests/developer-backend/browser.test.mjs`

Expected: PASS；两个入口都进入 P01-01，返回官网后原中英文导航正常。

- [ ] **Step 5: 提交官网入口切换**

```bash
git add "index.html" "官网改动/index.html" "tests/developer-backend/browser.test.mjs"
git commit -m "feat: link website to developer backend demo"
```

### Task 13: 用 `gamehub-figma` 生成可编辑 Figma 终稿

**Files:**
- Create: `Figma/开发者后台一期/frame-map.json`
- Create: `Figma/开发者后台一期/figma-delivery.md`
- Create: `Figma/开发者后台一期/evidence/*`

- [ ] **Step 1: 进入 Figma 阶段前读取完整交付规则**

完整读取 `gamehub-figma/SKILL.md`，以及它指定的 `references/workflow.md`、`references/figma-delivery.md`、`references/delivery-contract.md`。此时才开始真实 Figma 操作；不得把未通过 Task 11 的 Demo 导入。

- [ ] **Step 2: 建立 Frame 映射门禁**

从 `routes.json` 生成 `frame-map.json`：5 个分区固定为 `00 Design System & Architecture`、`01 Publisher & Game`、`02 CDKEY Supply`、`03 Build, Test & Release`、`04 Targeting & Analytics`；37 个业务 Frame 固定 1440×900，名称以 `Pxx-xx 页面名` 开头，顺序与 manifest 一致。

- [ ] **Step 3: 新建 Figma 文件与设计系统页**

新建“盖世游戏｜开发者后台一期”；在 `00 Design System & Architecture` 建立 App Shell、Top Bar、Side Nav、Context Bar、Page Header、Button、Input、Select、Upload、Status Tag、Table、Pagination、Tabs、Stepper、Review Panel、Timeline、Metric Card、Chart、Empty/Error/Permission State。Button、Input、Status Tag、Nav Item 和页面状态使用 Component + Variant。

- [ ] **Step 4: 生成四个业务分区与 37 Frame**

逐一使用验收通过的 37 张 Demo 页面创建可编辑 Frame。文字、图标、按钮、卡片、表格、输入、状态标签、图表轴线均为独立图层；只允许 Logo、游戏封面和媒体预览使用图片填充。禁止整页截图覆盖、扁平化导入或重复根画板。

- [ ] **Step 5: 执行业务事实和可编辑性校验**

逐 Frame 对照 route ID、标题、角色、主动作、状态、字段和禁止项；检查 5/5 分区、37/37 Frame、1440×900、文本可编辑、组件实例可替换、Variant 可切换、重复根画板为 0。Demo 评审角色切换不得进入正式业务 Frame。

- [ ] **Step 6: 记录 Figma 交付证据**

`figma-delivery.md` 写入 Figma 链接、文件名、分区数、Frame 数、组件数、逐 Frame 对照结论、人工审图结论、未冻结的 CDKEY 供给方式／资源位／标签／归因窗口。远程文件成功打开并可选中图层后，才能写“Figma 已交付”。

### Task 14: 总体验收、状态卡回写与最终提交

**Files:**
- Modify: `prd/workflow-state/LOCAL-20260901-developer-backend-prd.md`
- Modify: `demos/DEMO目录汇总.md`
- Modify: `Figma/开发者后台一期/figma-delivery.md`

- [ ] **Step 1: 执行确定性总验收**

Run: `node demos/开发者后台一期/build.mjs`

Run: `node --test tests/developer-backend/*.test.mjs`

Run: `git diff --check`

Expected: 全部测试 PASS；37/37 路由、9/6/13/9、5 个离线 HTML、两种宽度、0 控制台错误、0 whitespace error。

- [ ] **Step 2: 执行产品与视觉终审**

检查四份 PRD 页面六要素、角色权限、单厂商／单游戏／单 Windows／单正式分支、CDKEY 复用既有履约、开发者不可发布、精准投放方案 A、显式保存草稿、五态与异常恢复；确认未新增公众注册、财税、银行、自动结算、Mac/Linux、多分支、自助回滚、竞价和算法推荐。

- [ ] **Step 3: 更新 Demo 目录和状态卡**

`demos/DEMO目录汇总.md` 增加总览与四模块路径；状态卡将 Demo、浏览器证据、Figma 链接和 Git 提交分别登记，保留“PRD 图片远程可用性未验证”和 4 项业务待冻结风险，不把本地完成写成已发布。

- [ ] **Step 4: 提交交付记录**

```bash
git add "prd/workflow-state/LOCAL-20260901-developer-backend-prd.md" "demos/DEMO目录汇总.md" "Figma/开发者后台一期"
git commit -m "docs: record developer backend demo and figma delivery"
```

- [ ] **Step 5: 输出用户交付摘要**

最终只陈述已验证事实：5 个 Demo 路径、37 路由统计、浏览器验收结果、Figma 文件链接与可编辑性、官网入口状态、未做范围和仍待业务冻结项。

## 三、计划自检清单

- [ ] 4 份 PRD 的 37 个页面均能对应到一个 Task、一个 route ID 和一个 Figma Frame。
- [ ] 15 类模板、共享组件、五种通用状态和关键业务状态均有实现与测试任务。
- [ ] 角色、厂商、游戏、版本、环境、状态和跨模块 ID 由同一 Fixture 提供。
- [ ] 四份 HTML 均为自包含产物，总览评审控件不进入正式 Figma 业务 Frame。
- [ ] 1440×900 与 1280px 最小宽度、权限、控制台和关键交互均有浏览器验收。
- [ ] Figma 只在 Demo 验收后执行，5 个分区、37 Frame、组件 Variant 和非扁平化均有门禁。
- [ ] 官网只切换既有入口目标，不新增注册、认证或其他导航功能。
- [ ] 状态卡、Demo 目录、截图、测试和 Figma 证据均有回写路径。
