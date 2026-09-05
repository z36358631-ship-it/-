# 开发者后台 Demo 08 消息通知中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建设开发者消息列表、详情、已读状态、业务深链和运营系统公告发布，并完成三份 Demo 的共享状态回归。

**Architecture:** 新建独立 Demo 08，只消费各业务模块写入的事件；除消息已读状态和系统公告外，不修改来源业务。使用 `GHNextDemoContext` 读取同一 `game_id / app_id`，通过稳定深链进入 Demo 06、Demo 07 或协作方模块。

**Tech Stack:** Vanilla JavaScript、CSS、Node.js 构建脚本、Node Test Runner、Playwright Core、Chrome／Edge。

---

### Task 1: 冻结通知和跨 Demo 契约

**Files:**
- Create: `tests/developer-backend/notification-center-demo.test.mjs`
- Create: `tests/developer-backend/notification-center-demo.browser.test.mjs`
- Create: `tests/developer-backend/next-demos.integration.browser.test.mjs`

- [ ] **Step 1: 新增静态契约测试**

```js
test('Demo 08 只展示通知和系统公告', () => {
  const html = fs.readFileSync(demoFile, 'utf8');
  for (const required of [
    'P08-01','P08-02','P08-03','P08-04',
    '消息通知中心','全部消息','未读消息','查看详情','全部标为已读',
    '系统公告','新建公告','中文','English','草稿','发布',
  ]) assert.ok(html.includes(required), `缺少：${required}`);
  for (const forbidden of ['修改审核结果','重新发布游戏','调整结算金额','通知模板配置','订阅偏好']) {
    assert.equal(html.includes(forbidden), false, `通知中心越界：${forbidden}`);
  }
});
```

- [ ] **Step 2: 新增已读状态浏览器测试**

```js
await page.goto(demoUrl('/P08-01'), { waitUntil:'load' });
const before = Number(await page.locator('[data-unread-count]').textContent());
await page.locator('[data-message-id]').first().click();
assert.equal(await page.getByRole('heading', { name:'消息详情', exact:true }).isVisible(), true);
await page.goBack();
assert.equal(Number(await page.locator('[data-unread-count]').textContent()), before - 1);
await page.getByRole('button', { name:'全部标为已读', exact:true }).click();
assert.equal(Number(await page.locator('[data-unread-count]').textContent()), 0);
```

- [ ] **Step 3: 新增跨 Demo 资质事件测试**

```js
await page.goto(demo06Url('/P06-05'), { waitUntil:'load' });
await page.getByRole('button', { name:'提交平台审核', exact:true }).click();
await page.goto(demo08Url('/P08-01'), { waitUntil:'load' });
assert.equal(await page.getByText('游戏资质已提交', { exact:true }).isVisible(), true);
await page.getByText('游戏资质已提交', { exact:true }).click();
await page.getByRole('link', { name:'查看详情', exact:true }).click();
assert.match(page.url(), /06-游戏创建与发行资料demo\.html#\/P06-05/);
```

- [ ] **Step 4: 运行测试并确认失败**

```powershell
node --test tests/developer-backend/notification-center-demo.test.mjs tests/developer-backend/notification-center-demo.browser.test.mjs tests/developer-backend/next-demos.integration.browser.test.mjs
```

Expected: FAIL；Demo 08 尚未创建，Demo 06／07 尚未完成共享事件。

### Task 2: 创建 Demo 08 构建、路由和事件种子

**Files:**
- Create: `demos/开发者后台一期/build-08.mjs`
- Create: `demos/开发者后台一期/src/demo08/app.js`
- Create: `demos/开发者后台一期/src/demo08/styles.css`

- [ ] **Step 1: 创建构建脚本**

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const demoDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(demoDir, 'src');
const read = (...parts) => fs.readFileSync(path.join(srcDir, ...parts), 'utf8');
const css = `${['tokens.css','shell.css','components.css','templates.css'].map(file => read('styles', file).trim()).join('\n\n')}\n\n${read('demo08','styles.css').trim()}`;
const runtime = `${read('next-shared','context.js').trim()}\n\n${read('demo08','app.js').trim()}`;
const output = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>消息通知中心｜盖世游戏开发者平台</title><style>${css}</style></head><body><div id="app"></div><script>${runtime}</script></body></html>`;
fs.writeFileSync(path.join(demoDir, '08-消息通知中心demo.html'), output, 'utf8');
process.stdout.write('Built Demo 08 with 4 routes.\n');
```

- [ ] **Step 2: 定义路由**

```js
const routes = {
  'P08-01': { role:'developer', page:'inbox', title:'消息通知中心' },
  'P08-02': { role:'developer', page:'detail', title:'消息详情' },
  'P08-03': { role:'operations', page:'announcements', title:'系统公告' },
  'P08-04': { role:'operations', page:'announcement-editor', title:'新建公告' },
};
const routeId = () => (location.hash.match(/P08-\d{2}/) || ['P08-01'])[0];
```

- [ ] **Step 3: 补齐默认事件种子**

```js
const seedMessages = [
  { event_id:'EVENT-001', event_source:'qualification', entity_id:'GAME-48291', event_type:'review_result', event_status:'supplement', event_time:'2026-09-05T09:20:00+08:00', deep_link:'06-游戏创建与发行资料demo.html#/P06-05', title_zh:'游戏资质需补充材料', title_en:'Additional qualification materials required', read:false },
  { event_id:'EVENT-002', event_source:'build', entity_id:'BUILD-20260904.3', event_type:'build_ready', event_status:'success', event_time:'2026-09-04T18:30:00+08:00', deep_link:'03-包体测试与发布demo.html#/P03-03', title_zh:'首个包体已上传', title_en:'First build uploaded', read:false },
  { event_id:'EVENT-003', event_source:'system', entity_id:'NOTICE-202609-01', event_type:'announcement', event_status:'published', event_time:'2026-09-03T10:00:00+08:00', deep_link:'08-消息通知中心demo.html#/P08-02?id=EVENT-003', title_zh:'开发者平台维护公告', title_en:'Developer platform maintenance notice', read:true },
];
```

- [ ] **Step 4: 构建并执行静态测试**

```powershell
node --check demos/开发者后台一期/src/demo08/app.js
node demos/开发者后台一期/build-08.mjs
node --test tests/developer-backend/notification-center-demo.test.mjs
```

Expected: 路由、自包含和禁用项测试 PASS。

### Task 3: 实现开发者消息列表与筛选

**Files:**
- Modify: `demos/开发者后台一期/src/demo08/app.js`
- Modify: `demos/开发者后台一期/src/demo08/styles.css`
- Modify: `tests/developer-backend/notification-center-demo.browser.test.mjs`

- [ ] **Step 1: 定义分类与筛选**

```js
const categories = {
  all:'全部消息', unread:'未读消息', certification:'认证', profile:'游戏资料',
  qualification:'游戏资质', build:'构建', test:'测试', release:'发布', settlement:'结算', system:'系统公告',
};
const visibleMessages = () => ctx.read().messages.filter(item => {
  const hitTab = state.tab === 'all' || (state.tab === 'unread' && !item.read) || item.event_source === state.tab;
  const keyword = state.keyword.trim().toLocaleLowerCase('zh-CN');
  const hitKeyword = !keyword || `${item.title_zh}${item.title_en}${item.entity_id}`.toLocaleLowerCase('zh-CN').includes(keyword);
  return hitTab && hitKeyword;
});
```

- [ ] **Step 2: 渲染列表状态**

列表字段为未读点、标题、摘要、分类、业务对象和时间；覆盖加载、空列表、无结果、失败和无权限。默认按 `event_time` 倒序，同时间按 `event_id` 倒序。

- [ ] **Step 3: 实现全部标为已读**

```js
const markAllRead = () => {
  const current = ctx.read();
  ctx.write({ messages:(current.messages || []).map(item => ({ ...item, read:true })) });
  render();
};
```

- [ ] **Step 4: 增加响应式布局**

```css
@media (max-width:720px) {
  .d8-main { display:block; }
  .d8-filter-tabs { overflow-x:auto; }
  .d8-message-row { grid-template-columns:18px minmax(0,1fr); }
  .d8-message-meta { grid-column:2; justify-content:flex-start; flex-wrap:wrap; }
}
```

- [ ] **Step 5: 运行列表测试**

```powershell
node demos/开发者后台一期/build-08.mjs
node --test --test-name-pattern="列表|筛选|已读" tests/developer-backend/notification-center-demo.browser.test.mjs
```

Expected: 分类、搜索、无结果、全部已读和 390px 测试 PASS。

### Task 4: 实现消息详情和安全深链

**Files:**
- Modify: `demos/开发者后台一期/src/demo08/app.js`
- Modify: `tests/developer-backend/notification-center-demo.browser.test.mjs`

- [ ] **Step 1: 打开详情时写入已读**

```js
const openMessage = id => {
  const current = ctx.read();
  ctx.write({ messages:(current.messages || []).map(item => item.event_id === id ? { ...item, read:true } : item) });
  location.hash = `/P08-02?id=${encodeURIComponent(id)}`;
};
```

- [ ] **Step 2: 渲染通知事实和原因**

详情仅展示来源模块已写入的标题、正文、结果、原因、对象和时间。拒绝或待补原因完整展示；通知中心不提供通过、拒绝、重试构建或重新发布按钮。

- [ ] **Step 3: 校验深链目标**

```js
const safeDeepLink = value => {
  const allowed = /^(0[134678]-[^?#]+demo\.html)#\/P0[134678]-\d{2}(?:\?.*)?$/;
  return allowed.test(String(value || '')) ? value : '';
};
```

深链为空时显示“目标已失效”；场景为无权限时显示“无权查看目标内容”，但保留消息正文。

- [ ] **Step 4: 运行详情和深链测试**

```powershell
node demos/开发者后台一期/build-08.mjs
node --test --test-name-pattern="详情|深链|无权限|失效" tests/developer-backend/notification-center-demo.browser.test.mjs
```

Expected: 详情已读、有效深链、失效和无权限测试 PASS。

### Task 5: 实现运营系统公告

**Files:**
- Modify: `demos/开发者后台一期/src/demo08/app.js`
- Modify: `demos/开发者后台一期/src/demo08/styles.css`
- Modify: `tests/developer-backend/notification-center-demo.browser.test.mjs`

- [ ] **Step 1: 定义公告列表字段和状态**

列表字段固定为编号、中文标题、英文标题、状态、更新时间、发布人和操作；状态为草稿、已发布、已下线。

- [ ] **Step 2: 实现双语公告编辑和草稿保存**

```js
const saveAnnouncement = form => {
  const item = {
    id: state.activeAnnouncement?.id || `NOTICE-${Date.now()}`,
    title_zh: form.elements.title_zh.value.trim(),
    title_en: form.elements.title_en.value.trim(),
    body_zh: sanitizeRichText(form.elements.body_zh.innerHTML),
    body_en: sanitizeRichText(form.elements.body_en.innerHTML),
    status:'draft',
    updated_at:new Date().toISOString(),
  };
  if (!item.title_zh || !item.title_en || !stripHtml(item.body_zh) || !stripHtml(item.body_en)) return showInlineError('请补全中英文标题和正文');
  upsertAnnouncement(item);
  go('P08-03');
};
```

- [ ] **Step 3: 实现发布和下线**

发布成功后调用 `ctx.emitEvent()` 向开发者消息列表写入系统公告；发布失败时保留草稿且线上版本不变。下线须二次确认，历史公告保留。

- [ ] **Step 4: 运行运营端测试**

```powershell
node demos/开发者后台一期/build-08.mjs
node --test --test-name-pattern="系统公告|草稿|发布|下线" tests/developer-backend/notification-center-demo.browser.test.mjs
```

Expected: 双语校验、草稿、失败、发布、下线及开发者列表同步测试 PASS。

### Task 6: 完成三份 Demo 构建与跨页回归

**Files:**
- Create: `demos/开发者后台一期/build-next.mjs`
- Modify: `tests/developer-backend/next-demos.integration.browser.test.mjs`
- Modify: `demos/开发者后台一期/README.md`

- [ ] **Step 1: 创建统一构建入口**

```js
await import('./build-06.mjs');
await import('./build-07.mjs');
await import('./build-08.mjs');
process.stdout.write('Built next developer demos: 06, 07, 08.\n');
```

- [ ] **Step 2: 验证共享 APPID 与资质通知**

```js
await page.goto(demo06Url('/P06-02'), { waitUntil:'load' });
await createGame(page);
const appId = await page.locator('[data-app-id]').textContent();
await page.goto(demo07Url('/P07-01'), { waitUntil:'load' });
assert.equal(await page.locator('[data-app-id]').textContent(), appId);

await page.goto(demo06Url('/P06-05'), { waitUntil:'load' });
await submitQualification(page);
await page.goto(demo08Url('/P08-01'), { waitUntil:'load' });
assert.equal(await page.getByText('游戏资质已提交', { exact:true }).isVisible(), true);
```

- [ ] **Step 3: 验证刷新、前进、后退和语言规则**

开发者端分别以 `?lang=zh`、`?lang=en` 打开；运营端始终使用中文界面，仅编辑器的“中文／English”切换外显内容。每份 Demo 逐页执行刷新和浏览器前进／后退。

- [ ] **Step 4: 运行完整回归**

```powershell
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/next-demo-context.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs tests/developer-backend/integration-resource-demo.test.mjs tests/developer-backend/integration-resource-demo.browser.test.mjs tests/developer-backend/notification-center-demo.test.mjs tests/developer-backend/notification-center-demo.browser.test.mjs tests/developer-backend/next-demos.integration.browser.test.mjs
```

Expected: 全部 PASS；三个输出文件均可离线打开且无外部脚本、样式、字体、图片、接口或 iframe。

### Task 7: 视觉验收与提交

**Files:**
- Create: `demos/开发者后台一期/08-消息通知中心demo.html`
- Create: `tests/developer-backend/evidence/notification-center/`
- Modify: `demos/开发者后台一期/README.md`

- [ ] **Step 1: 捕获关键证据**

捕获 1440×900 的消息列表、消息详情、公告列表、公告编辑，以及 390×844 的消息列表和详情。另截取 Demo 06 资质提交 → Demo 08 出现通知 → 深链返回 Demo 06 的三步证据。

- [ ] **Step 2: 运行最终检查**

```powershell
node --check demos/开发者后台一期/src/demo08/app.js
node demos/开发者后台一期/build-next.mjs
node --test tests/developer-backend/next-demos.integration.browser.test.mjs tests/developer-backend/notification-center-demo.browser.test.mjs
```

Expected: 全部 PASS；1440、1280、390、320 无根节点横向溢出、白底白字或页面错误。

- [ ] **Step 3: 只提交 Demo 08 和整体验收文件**

```powershell
git add -- demos/开发者后台一期/build-08.mjs demos/开发者后台一期/build-next.mjs demos/开发者后台一期/src/demo08 demos/开发者后台一期/08-消息通知中心demo.html demos/开发者后台一期/README.md tests/developer-backend/notification-center-demo.test.mjs tests/developer-backend/notification-center-demo.browser.test.mjs tests/developer-backend/next-demos.integration.browser.test.mjs tests/developer-backend/evidence/notification-center
git commit -m "feat: add developer notification center demo"
```
