# 开发者后台 Demo 07 开发接入与资源中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建设 APPID、环境、API 凭据、测试账号、外部开发文档和 SDK／工具下载的开发者与管理端闭环。

**Architecture:** 新建独立 Demo 07，复用现有开发者后台样式和 `GHNextDemoContext`。开发者端按当前 `app_id` 管理接入信息；管理端维护可下载资源；不复制包体上传、测试任务、API 调用监控或 CI/CD。

**Tech Stack:** Vanilla JavaScript、CSS、Node.js 构建脚本、Node Test Runner、Playwright Core、Chrome／Edge。

---

### Task 1: 冻结 Demo 07 页面和安全契约

**Files:**
- Create: `tests/developer-backend/integration-resource-demo.test.mjs`
- Create: `tests/developer-backend/integration-resource-demo.browser.test.mjs`

- [ ] **Step 1: 新增静态契约测试**

```js
test('Demo 07 覆盖接入与资源中心且不越界', () => {
  const html = fs.readFileSync(demoFile, 'utf8');
  for (const required of [
    'P07-01','P07-02','P07-03','P07-04','P07-05','P07-06','P07-07',
    '接入概览','APPID 与环境','测试账号与权限','开发文档','下载中心',
    '资源管理','新建资源','新密钥只展示一次',
  ]) assert.ok(html.includes(required), `缺少：${required}`);
  for (const forbidden of ['上传游戏包体','创建测试任务','API 调用监控','CI/CD 配置']) {
    assert.equal(html.includes(forbidden), false, `越界功能：${forbidden}`);
  }
  assert.equal(/<script\s+[^>]*src=/i.test(html), false);
  assert.equal(/<link\s+[^>]*rel=["']stylesheet["']/i.test(html), false);
});
```

- [ ] **Step 2: 新增密钥与测试账号浏览器契约**

```js
await page.goto(demoUrl('/P07-02'), { waitUntil:'load' });
await page.getByRole('button', { name:'重置密钥', exact:true }).click();
assert.equal(await page.getByRole('dialog').isVisible(), true);
await page.getByRole('button', { name:'确认重置', exact:true }).click();
assert.match(await page.getByRole('dialog').innerText(), /只展示一次/);
await page.getByRole('button', { name:'我已保存', exact:true }).click();
assert.equal(await page.getByText(/gh_live_/).count(), 0);
```

- [ ] **Step 3: 新增下载与管理端浏览器契约**

```js
await page.goto(demoUrl('/P07-05'), { waitUntil:'load' });
await page.getByLabel('资源类型').selectOption('sdk');
await page.getByRole('button', { name:'下载', exact:true }).first().click();
assert.match(await page.locator('[role="status"]').innerText(), /开始下载/);

await page.goto(demoUrl('/P07-06?role=operations'), { waitUntil:'load' });
await page.getByRole('button', { name:'新建资源', exact:true }).click();
assert.equal(await page.getByRole('heading', { name:'新建资源', exact:true }).isVisible(), true);
```

- [ ] **Step 4: 运行测试并确认失败**

```powershell
node --test tests/developer-backend/integration-resource-demo.test.mjs tests/developer-backend/integration-resource-demo.browser.test.mjs
```

Expected: FAIL；Demo 07 尚未创建。

### Task 2: 创建构建脚本、路由和页面骨架

**Files:**
- Create: `demos/开发者后台一期/build-07.mjs`
- Create: `demos/开发者后台一期/src/demo07/app.js`
- Create: `demos/开发者后台一期/src/demo07/styles.css`

- [ ] **Step 1: 创建构建脚本**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(demoDir, 'src');
const read = (...parts) => fs.readFileSync(path.join(srcDir, ...parts), 'utf8');
const sharedCss = ['tokens.css','shell.css','components.css','templates.css'].map(file => read('styles', file).trim()).join('\n\n');
const css = `${sharedCss}\n\n${read('demo07','styles.css').trim()}`;
const runtime = `${read('next-shared','context.js').trim()}\n\n${read('demo07','app.js').trim()}`;
const routes = ['P07-01','P07-02','P07-03','P07-04','P07-05','P07-06','P07-07'];
const output = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>开发接入与资源中心｜盖世游戏开发者平台</title><style>${css}</style></head><body><div id="app"></div><script>${runtime}</script></body></html>`;
fs.writeFileSync(path.join(demoDir, '07-开发接入与资源中心demo.html'), output, 'utf8');
process.stdout.write(`Built Demo 07 with ${routes.length} routes.\n`);
```

- [ ] **Step 2: 定义路由和角色**

```js
const routes = {
  'P07-01': { role:'developer', page:'overview', title:'接入概览' },
  'P07-02': { role:'developer', page:'credentials', title:'APPID 与环境' },
  'P07-03': { role:'developer', page:'test-accounts', title:'测试账号与权限' },
  'P07-04': { role:'developer', page:'docs', title:'开发文档' },
  'P07-05': { role:'developer', page:'downloads', title:'下载中心' },
  'P07-06': { role:'operations', page:'resources', title:'资源管理' },
  'P07-07': { role:'operations', page:'resource-editor', title:'新建资源' },
};
const currentRoute = () => (location.hash.match(/P07-\d{2}/) || ['P07-01'])[0];
const go = id => { location.hash = `/${id}`; };
```

- [ ] **Step 3: 创建统一外壳**

开发者导航固定为接入概览、APPID 与环境、测试账号与权限、开发文档、下载中心；运营端只显示资源管理。页头沿用 Demo 06 Logo、账号区和内容最大宽度。

- [ ] **Step 4: 增加 720px 移动端样式**

```css
@media (max-width:720px) {
  .d7-layout { display:block; }
  .d7-sidebar { min-height:auto; border-right:0; border-bottom:1px solid #dce2eb; }
  .d7-nav { display:flex; overflow-x:auto; }
  .d7-nav button { flex:0 0 auto; }
  .d7-content { padding:20px 16px 36px; }
  .d7-grid-2,.d7-grid-3,.d7-form-grid { grid-template-columns:1fr; }
}
```

- [ ] **Step 5: 构建并执行静态测试**

```powershell
node --check demos/开发者后台一期/src/demo07/app.js
node demos/开发者后台一期/build-07.mjs
node --test tests/developer-backend/integration-resource-demo.test.mjs
```

Expected: HTML、自包含和路由测试 PASS；业务交互测试仍失败。

### Task 3: 实现接入概览、APPID 和环境凭据

**Files:**
- Modify: `demos/开发者后台一期/src/demo07/app.js`
- Modify: `demos/开发者后台一期/src/demo07/styles.css`
- Modify: `tests/developer-backend/integration-resource-demo.browser.test.mjs`

- [ ] **Step 1: 从共享上下文读取当前 APPID**

```js
const ctx = window.GHNextDemoContext;
const shared = ctx.read();
const appSummary = {
  game_id: shared.game_id,
  app_id: shared.app_id,
  environment: 'development',
  credential_status: 'active',
  test_account_count: 2,
  latest_sdk: '4.2.0',
};
```

- [ ] **Step 2: 渲染两个环境且生产环境默认只读**

```js
const environments = [
  { id:'development', name:'开发环境', status:'已启用', endpoint:'https://sandbox-api.gamehub.example' },
  { id:'production', name:'生产环境', status:'待开通', endpoint:'https://api.gamehub.example' },
];
```

页面展示 APPID、环境、Client ID、密钥尾号、创建时间和最后使用时间；不显示完整旧密钥。

- [ ] **Step 3: 实现密钥重置二次确认和一次性展示**

```js
const rotateSecret = () => {
  state.revealedSecret = `gh_live_${crypto.getRandomValues(new Uint32Array(4)).join('')}`;
  state.secretRotatedAt = new Date().toISOString();
  ctx.emitEvent({ event_source:'credential', entity_id:ctx.read().app_id, event_type:'credential_rotated', event_status:'success', deep_link:'07-开发接入与资源中心demo.html#/P07-02', title_zh:'API 密钥已重置', title_en:'API secret rotated' });
  render();
};
const closeSecret = () => { state.revealedSecret = ''; render(); };
```

- [ ] **Step 4: 运行凭据测试**

```powershell
node demos/开发者后台一期/build-07.mjs
node --test --test-name-pattern="APPID|密钥" tests/developer-backend/integration-resource-demo.browser.test.mjs
```

Expected: APPID、环境切换、重置确认和一次性展示测试 PASS。

### Task 4: 实现测试账号与权限

**Files:**
- Modify: `demos/开发者后台一期/src/demo07/app.js`
- Modify: `tests/developer-backend/integration-resource-demo.browser.test.mjs`

- [ ] **Step 1: 定义测试账号数据**

```js
const seedAccounts = [
  { id:'TEST-001', account:'tester01@ocean.example', environment:'开发环境', scopes:['登录','启动校验','云存档'], status:'enabled' },
  { id:'TEST-002', account:'tester02@ocean.example', environment:'开发环境', scopes:['登录','启动校验'], status:'disabled' },
];
```

- [ ] **Step 2: 实现新增校验**

```js
const createTestAccount = form => {
  const account = form.elements.account.value.trim();
  const scopes = [...form.querySelectorAll('[name="scope"]:checked')].map(item => item.value);
  if (!/^\S+@\S+\.\S+$/.test(account) || !scopes.length) return showInlineError('请输入有效邮箱并至少选择一项权限');
  if (state.testAccounts.some(item => item.account === account)) return showInlineError('该测试账号已存在');
  state.testAccounts.unshift({ id:`TEST-${Date.now()}`, account, environment:form.elements.environment.value, scopes, status:'enabled' });
  render();
};
```

- [ ] **Step 3: 实现停用二次确认**

停用后保留历史账号和权限记录，不删除；直接访问无权游戏时不返回对象信息。

- [ ] **Step 4: 运行测试账号测试**

```powershell
node demos/开发者后台一期/build-07.mjs
node --test --test-name-pattern="测试账号" tests/developer-backend/integration-resource-demo.browser.test.mjs
```

Expected: 新增、重复邮箱、无权限、停用和移动端表单测试 PASS。

### Task 5: 实现文档入口和开发者下载中心

**Files:**
- Modify: `demos/开发者后台一期/src/demo07/app.js`
- Modify: `demos/开发者后台一期/src/demo07/styles.css`
- Modify: `tests/developer-backend/integration-resource-demo.browser.test.mjs`

- [ ] **Step 1: 定义外部文档目录**

```js
const documentationHome = 'https://docs.google.com/document/u/0/';
const docs = [
  { id:'DOC-SDK', title:'SDK 接入', summary:'安装、初始化和环境配置', href:documentationHome },
  { id:'DOC-API', title:'API 接口', summary:'鉴权、错误码和请求示例', href:documentationHome },
  { id:'DOC-UPLOAD', title:'包体上传', summary:'上传和构建说明', href:documentationHome },
  { id:'DOC-TEST', title:'测试与发布', summary:'测试账号、提测和发布说明', href:documentationHome },
];
```

Demo 点击后显示“即将前往 Google Docs”，说明正式地址由运营配置；不嵌入 iframe，也不在本页编辑正文。

- [ ] **Step 2: 定义下载资源与筛选**

```js
const resources = [
  { id:'RES-001', name:'盖世游戏 PC SDK', type:'sdk', platform:'Windows', version:'4.2.0', size:'86.4 MB', status:'published', published_at:'2026-09-03 14:20' },
  { id:'RES-002', name:'盖世游戏 PC SDK', type:'sdk', platform:'macOS', version:'4.2.0', size:'74.8 MB', status:'published', published_at:'2026-09-03 14:20' },
  { id:'RES-003', name:'启动校验调试工具', type:'tool', platform:'Windows', version:'1.6.2', size:'18.2 MB', status:'published', published_at:'2026-08-28 11:00' },
];
```

- [ ] **Step 3: 实现下载成功、失败和失效状态**

```js
const startDownload = resource => {
  if (resource.status !== 'published') return showToast('该版本已下线，请选择其他版本');
  if (state.scenario === 'download-failed') return showToast('下载失败，请重试');
  ctx.emitEvent({ event_source:'resource', entity_id:resource.id, event_type:'resource_download', event_status:'success', deep_link:'07-开发接入与资源中心demo.html#/P07-05', title_zh:`${resource.name} 已开始下载`, title_en:`${resource.name} download started` });
  showToast('已开始下载');
};
```

- [ ] **Step 4: 运行文档和下载测试**

```powershell
node demos/开发者后台一期/build-07.mjs
node --test --test-name-pattern="文档|下载" tests/developer-backend/integration-resource-demo.browser.test.mjs
```

Expected: 分类筛选、版本说明、成功／失败／失效和外链提示测试 PASS。

### Task 6: 实现管理端资源发布闭环

**Files:**
- Modify: `demos/开发者后台一期/src/demo07/app.js`
- Modify: `tests/developer-backend/integration-resource-demo.browser.test.mjs`

- [ ] **Step 1: 实现资源列表筛选**

筛选字段固定为关键词、资源类型、平台和状态；列表展示编号、名称、类型、平台、版本、语言、状态、更新时间和操作。

- [ ] **Step 2: 实现草稿创建和编辑校验**

```js
const saveResourceDraft = form => {
  const draft = {
    id: state.editingResource?.id || `RES-${Date.now()}`,
    name: form.elements.name.value.trim(),
    type: form.elements.type.value,
    platform: form.elements.platform.value,
    version: form.elements.version.value.trim(),
    language: form.elements.language.value,
    notes_zh: form.elements.notes_zh.value.trim(),
    notes_en: form.elements.notes_en.value.trim(),
    file_name: state.uploadedFileName,
    status: 'draft',
  };
  if (!draft.name || !draft.version || !draft.notes_zh || !draft.notes_en || !draft.file_name) return showInlineError('请补全资源信息和文件');
  upsertResource(draft);
  go('P07-06');
};
```

- [ ] **Step 3: 实现发布、失败和下线**

发布只作用于当前草稿；失败时保留草稿和原线上版本。下线须二次确认，历史版本保留。

- [ ] **Step 4: 运行管理端测试**

```powershell
node demos/开发者后台一期/build-07.mjs
node --test --test-name-pattern="资源管理|新建资源|发布|下线" tests/developer-backend/integration-resource-demo.browser.test.mjs
```

Expected: 草稿、发布失败、发布成功、下线和历史版本测试 PASS。

### Task 7: 视觉验收与提交

**Files:**
- Create: `demos/开发者后台一期/07-开发接入与资源中心demo.html`
- Modify: `demos/开发者后台一期/README.md`
- Create: `tests/developer-backend/evidence/integration-resources/`

- [ ] **Step 1: 捕获证据**

捕获 1440×900 的接入概览、密钥一次性展示、测试账号、下载中心、管理端资源编辑，以及 390×844 的下载中心和测试账号弹窗。

- [ ] **Step 2: 运行最终测试**

```powershell
node --check demos/开发者后台一期/src/demo07/app.js
node demos/开发者后台一期/build-07.mjs
node --test tests/developer-backend/next-demo-context.test.mjs tests/developer-backend/integration-resource-demo.test.mjs tests/developer-backend/integration-resource-demo.browser.test.mjs
```

Expected: 全部 PASS；无外部依赖、页面错误或 1440／1280／390／320 横向溢出。

- [ ] **Step 3: 只提交 Demo 07 范围文件**

```powershell
git add -- demos/开发者后台一期/build-07.mjs demos/开发者后台一期/src/demo07 demos/开发者后台一期/07-开发接入与资源中心demo.html demos/开发者后台一期/README.md tests/developer-backend/integration-resource-demo.test.mjs tests/developer-backend/integration-resource-demo.browser.test.mjs tests/developer-backend/evidence/integration-resources
git commit -m "feat: add developer integration resource demo"
```
