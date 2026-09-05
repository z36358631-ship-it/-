# 开发者后台 Demo 06 游戏创建与发行资料 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Demo 06 调整为游戏创建、商店展示资料、资质、发行范围、合同状态及运营审核闭环，并移除与协作方重复的商品、包体、测试、定价和发布能力。

**Architecture:** 保留现有单文件 HTML、视觉样式和国家选择器；新增共享场景运行时与 Hash 路由。开发者端只写游戏资料、资质和发行范围，运营端维护审核与合同；Build、SKU、价格和发布状态只读。

**Tech Stack:** Vanilla JavaScript、CSS、Node.js 构建脚本、Node Test Runner、Playwright Core、Chrome／Edge。

---

### Task 1: 用失败测试冻结新边界

**Files:**
- Modify: `tests/developer-backend/game-profile-release-demo.test.mjs`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: 将静态契约改为新页面和禁用项**

```js
for (const required of [
  'P06-01', 'P06-02', 'P06-03', 'P06-04', 'P06-05',
  'P06-06', 'P06-07', 'P06-08', 'P06-09', 'P06-10',
  '新建游戏', '商店展示资料', '游戏资质', '发行范围',
  '合同状态', '游戏资料审核', '游戏资质审核', '合同状态维护',
]) assert.ok(html.includes(required), `缺少：${required}`);

for (const forbidden of [
  '新增商品', '编辑价格', '提交审核快照', '仅提交海外范围',
  '申请平台测试／发行', '上传新 Build', '立即上线', '下架游戏',
]) assert.equal(html.includes(forbidden), false, `越界功能仍存在：${forbidden}`);
```

- [ ] **Step 2: 新增“资质不拦申请”的状态契约**

```js
for (const status of ['未提交', '审核中', '待补充', '已通过', '未通过']) {
  assert.ok(html.includes(status), `缺少资质状态：${status}`);
}
assert.ok(html.includes('不影响测试或发行申请'));
assert.ok(html.includes('资质状态将纳入运营审核'));
```

- [ ] **Step 3: 将浏览器主链改为游戏创建和资料审核**

测试顺序固定为：游戏列表 → 新建游戏 → 游戏概览 → 商店展示资料 → 游戏资质 → 发行范围 → 合同状态 → 运营审核列表 → 审核详情。

```js
await page.goto(demoUrl('/P06-01'), { waitUntil: 'load' });
await page.getByRole('button', { name: '新建游戏', exact: true }).click();
assert.equal(await page.getByRole('heading', { name: '新建游戏', exact: true }).isVisible(), true);
await page.getByLabel('游戏中文名').fill('星海远征');
await page.getByLabel('游戏英文名').fill('Ocean Expedition');
await page.getByRole('button', { name: '创建游戏', exact: true }).click();
assert.match(await page.locator('main').innerText(), /GAME-48291/);
assert.match(await page.locator('main').innerText(), /APP-7F3A9C/);
```

- [ ] **Step 4: 运行测试并确认失败**

```powershell
node --test tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: FAIL；现有 Demo 仍含商品／SKU 和发行申请，且没有新建游戏、合同页及运营审核路由。

### Task 2: 建立共享场景运行时

**Files:**
- Create: `demos/开发者后台一期/src/next-shared/context.js`
- Modify: `demos/开发者后台一期/build-06.mjs`
- Test: `tests/developer-backend/next-demo-context.test.mjs`

- [ ] **Step 1: 先写共享上下文失败测试**

```js
test('共享上下文保存本方对象并保留协作方只读对象', () => {
  assert.match(source, /gamehub\.developer\.next\.v1/);
  for (const key of ['vendor_id','game_id','app_id','first_build_uploaded','build_id','qualification_status','contract_status']) {
    assert.ok(source.includes(key), `缺少共享字段：${key}`);
  }
  assert.match(source, /emitEvent/);
  assert.match(source, /qualification_reminder/);
});
```

- [ ] **Step 2: 创建共享运行时**

```js
(function exposeNextDemoContext(global) {
  const STORAGE_KEY = 'gamehub.developer.next.v1';
  const seed = {
    schema_version: 1,
    vendor_id: 'VENDOR-202609-001',
    game_id: 'GAME-48291',
    app_id: 'APP-7F3A9C',
    first_build_uploaded: true,
    build_id: 'BUILD-20260904.3',
    qualification_status: 'unsubmitted',
    qualification_version: null,
    profile_status: 'draft',
    profile_version: 'PROFILE-001',
    release_scope_status: 'draft',
    release_scope_version: 'SCOPE-001',
    contract_status: 'effective',
    contract_version: 'CONTRACT-20260901-001',
    contract_valid_to: '2027-08-31',
    messages: [],
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const read = () => {
    try { return { ...clone(seed), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return clone(seed); }
  };
  const write = next => {
    const value = { ...read(), ...clone(next) };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
    return value;
  };
  const emitEvent = event => {
    const current = read();
    const messages = [{
      event_id: `EVENT-${Date.now()}`,
      event_source: event.event_source,
      entity_id: event.entity_id,
      event_type: event.event_type,
      event_status: event.event_status,
      event_time: event.event_time || new Date().toISOString(),
      deep_link: event.deep_link,
      title_zh: event.title_zh,
      title_en: event.title_en,
      read: false,
    }, ...(current.messages || [])];
    return write({ messages });
  };
  global.GHNextDemoContext = { STORAGE_KEY, seed: clone(seed), read, write, emitEvent };
})(window);
```

- [ ] **Step 3: 将共享运行时打包进 Demo 06**

```js
const sharedRuntime = read('next-shared', 'context.js').trim();
const runtime = `${sharedRuntime}\n\n${read('demo06', 'app.js').trim()}`;
```

- [ ] **Step 4: 运行上下文测试**

```powershell
node --test tests/developer-backend/next-demo-context.test.mjs
```

Expected: PASS。

### Task 3: 改造 Demo 06 路由和开发者导航

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`
- Modify: `demos/开发者后台一期/src/demo06/styles.css`
- Modify: `demos/开发者后台一期/build-06.mjs`

- [ ] **Step 1: 定义稳定页面路由**

```js
const routes = {
  'P06-01': { role: 'developer', page: 'games', title: '游戏管理' },
  'P06-02': { role: 'developer', page: 'create-game', title: '新建游戏' },
  'P06-03': { role: 'developer', page: 'overview', title: '游戏概览' },
  'P06-04': { role: 'developer', page: 'store-profile', title: '商店展示资料' },
  'P06-05': { role: 'developer', page: 'qualification', title: '游戏资质' },
  'P06-06': { role: 'developer', page: 'release-scope', title: '发行范围' },
  'P06-07': { role: 'developer', page: 'contract', title: '合同状态' },
  'P06-08': { role: 'operations', page: 'review-list', title: '游戏资料审核' },
  'P06-09': { role: 'operations', page: 'review-detail', title: '审核详情' },
  'P06-10': { role: 'operations', page: 'contract-maintenance', title: '合同状态维护' },
};

const parseRoute = () => {
  const id = (location.hash.match(/P06-\d{2}/) || ['P06-01'])[0];
  return { id, ...routes[id] };
};
const go = id => { location.hash = `/${id}`; };
```

- [ ] **Step 2: 将左侧导航限定为本方页面**

```js
const developerNav = [
  ['P06-03', '概览'],
  ['P06-04', '商店展示资料'],
  ['P06-05', '游戏资质'],
  ['P06-06', '发行范围'],
  ['P06-07', '合同状态'],
];
```

删除 `商品与 SKU`、`游戏运营`、`游戏服务`、`数据分析` 和页头“申请平台测试／发行”。游戏概览只读展示 `BUILD-20260904.3` 及来源更新时间，并提供“前往包体与发布”深链。

- [ ] **Step 3: 增加 Hash 监听与返回路径**

```js
window.addEventListener('hashchange', render);
document.addEventListener('click', event => {
  const control = event.target.closest('[data-route]');
  if (control) go(control.dataset.route);
});
```

- [ ] **Step 4: 更新桌面和移动端导航**

```css
@media (max-width: 720px) {
  .d6-main.is-game { display: block; }
  .d6-game-sidebar { min-height: auto; border-right: 0; border-bottom: 1px solid #dce2eb; }
  .d6-nav { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; }
  .d6-content { padding: 20px 16px 36px; }
}
```

- [ ] **Step 5: 构建并验证路由测试**

```powershell
node --check demos/开发者后台一期/src/demo06/app.js
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.test.mjs
```

Expected: 路由与禁用项断言 PASS；页面交互测试仍因表单未完成而失败。

### Task 4: 完成游戏创建、展示资料和发行范围

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`
- Modify: `demos/开发者后台一期/src/demo06/styles.css`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: 实现新建游戏校验和创建**

```js
const createGame = form => {
  const zh = form.elements.game_name_zh.value.trim();
  const en = form.elements.game_name_en.value.trim();
  const platforms = [...form.querySelectorAll('[name="platforms"]:checked')].map(item => item.value);
  if (!zh || !en || !platforms.length) return showFieldError(form, '请填写中英文名称并选择至少一个平台');
  ctx.write({ game_id: 'GAME-48291', app_id: 'APP-7F3A9C', game_name_zh: zh, game_name_en: en, target_platforms: platforms });
  ctx.emitEvent({ event_source:'game', entity_id:'GAME-48291', event_type:'game_created', event_status:'success', deep_link:'06-游戏创建与发行资料demo.html#/P06-03', title_zh:'游戏创建成功', title_en:'Game created' });
  go('P06-03');
};
```

- [ ] **Step 2: 将游戏资料改为商店展示资料**

保留现有中英文切换和预览，字段固定为：中英文名称、短简介、详细介绍、开发商、发行商、图片、视频、支持语言、三平台展示配置和标签。提交时生成 `profile_version`，进入 `pending`，并产生通知事件。

```js
const submitProfile = () => {
  const current = ctx.read();
  const nextVersion = `PROFILE-${Date.now()}`;
  ctx.write({ profile_status:'pending', profile_version:nextVersion });
  ctx.emitEvent({ event_source:'profile', entity_id:current.game_id, event_type:'profile_review', event_status:'pending', deep_link:'06-游戏创建与发行资料demo.html#/P06-04', title_zh:'商店展示资料已提交', title_en:'Store profile submitted' });
};
```

- [ ] **Step 3: 保留国家选择器并移除价格／SKU 依赖**

发行范围仅保存 `regions`、`platforms`、`release_at` 和 `timezone`；中国大陆、香港、台湾继续分开保存。保存后写入 `release_scope_version`，不检查版号、SKU、Build 或价格。

```js
ctx.write({
  release_scope_status: 'pending',
  release_scope_version: `SCOPE-${Date.now()}`,
  release_scope: { regions, platforms, release_at, timezone },
});
```

- [ ] **Step 4: 运行开发者端浏览器测试**

```powershell
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: 游戏列表、新建、概览、资料、范围和 390px 国家选择器测试 PASS。

### Task 5: 将资质改为独立警示项并补合同页

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: 以首包状态决定是否展示待办**

```js
const renderQualificationReminder = current => current.first_build_uploaded && current.qualification_status !== 'approved'
  ? notice('首个包体已上传，请补充游戏资质。资质状态将纳入运营审核，但不影响测试或发行申请。', 'warning', 'P06-05')
  : '';
```

- [ ] **Step 2: 统一资质状态并提交独立审核**

```js
const qualificationLabels = {
  unsubmitted:'未提交', pending:'审核中', supplement:'待补充', approved:'已通过', rejected:'未通过',
};
const submitQualification = () => {
  const version = `QUAL-${Date.now()}`;
  ctx.write({ qualification_status:'pending', qualification_version:version });
  ctx.emitEvent({ event_source:'qualification', entity_id:ctx.read().game_id, event_type:'qualification_review', event_status:'pending', deep_link:'06-游戏创建与发行资料demo.html#/P06-05', title_zh:'游戏资质已提交', title_en:'Qualification submitted' });
};
```

移除 `gateItems()`、`allPass`、`mainlandReleaseReady()` 和全部禁用发行申请的逻辑。大陆资质仍可作为资质材料字段保留，但不在本 Demo 做发行门禁判断。

- [ ] **Step 3: 渲染开发者合同只读页**

```js
const renderContract = current => card('合同状态', `
  ${readonly('合同编号', 'GH-PC-2026-091')}
  ${readonly('合作类型', '平台代理发行')}
  ${readonly('有效期', `2026-09-01 至 ${current.contract_valid_to}`)}
  ${readonly('当前状态', contractLabel(current.contract_status))}
  ${readonly('确认时间', '2026-09-01 18:30')}
`);
```

证据链接不出现在开发者端。

- [ ] **Step 4: 运行资质和合同测试**

```powershell
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: 五种资质状态可通过场景参数展示，所有状态均无测试／发行禁用按钮；合同页不含证据链接。

### Task 6: 完成运营审核与合同维护

**Files:**
- Modify: `demos/开发者后台一期/src/demo06/app.js`
- Modify: `demos/开发者后台一期/src/demo06/styles.css`
- Modify: `tests/developer-backend/game-profile-release-demo.browser.test.mjs`

- [ ] **Step 1: 增加运营审核列表和筛选**

列表字段固定为申请编号、游戏／厂商、申请类型、版本、状态、提交时间和操作；申请类型为商店展示资料、游戏资质、发行范围。

```js
const filtered = reviewRows.filter(row =>
  (!filters.keyword || `${row.id}${row.game}${row.vendor}`.includes(filters.keyword)) &&
  (!filters.type || row.type === filters.type) &&
  (!filters.status || row.status === filters.status)
);
```

- [ ] **Step 2: 增加独立审核详情**

详情展示本次版本、上一通过版本、字段差异和附件；操作固定为“通过”“要求补充”“拒绝”。要求补充和拒绝均必填 1—500 字原因，运营不得改开发者原值。

```js
const finishReview = (action, reason) => {
  if (action !== 'approved' && !reason.trim()) return showToast('请填写处理原因');
  ctx.write({ [`${activeReview.object}_status`]: action });
  ctx.emitEvent({ event_source:activeReview.object, entity_id:activeReview.game_id, event_type:'review_result', event_status:action, deep_link:activeReview.deep_link, title_zh:resultTitle(action), title_en:resultTitleEn(action) });
  go('P06-08');
};
```

- [ ] **Step 3: 增加合同状态维护**

运营字段固定为合同编号、合作类型、有效期、状态、确认人、确认时间和证据链接。保存时写入 `contract_version`，开发者页读取最新已保存结果。

- [ ] **Step 4: 运行运营端测试**

```powershell
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: 筛选、详情、通过、补充、拒绝、并发结果和合同回显测试 PASS。

### Task 7: 视觉验收与提交

**Files:**
- Modify: `demos/开发者后台一期/06-游戏创建与发行资料demo.html`
- Modify: `demos/开发者后台一期/README.md`
- Create/Update: `tests/developer-backend/evidence/game-profile-release/`

- [ ] **Step 1: 更新输出文件名与构建配置**

```js
const moduleConfig = {
  id:'06',
  name:'游戏创建与发行资料',
  output:'06-游戏创建与发行资料demo.html',
  defaultRoute:'P06-01',
};
```

构建后删除旧文件引用，但不删除用户文件；先确认旧文件已由 Git 跟踪且新输出验收通过，再使用 `git mv` 重命名。

- [ ] **Step 2: 截取关键证据**

捕获 1440×900 的游戏概览、资质待办、商店展示资料、运营审核详情，以及 390×844 的游戏概览和发行范围选择器。

- [ ] **Step 3: 运行最终测试**

```powershell
node --check demos/开发者后台一期/src/next-shared/context.js
node --check demos/开发者后台一期/src/demo06/app.js
node demos/开发者后台一期/build-06.mjs
node --test tests/developer-backend/next-demo-context.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs
```

Expected: 全部 PASS；1440、1280、390、320 均无根节点横向溢出和页面错误。

- [ ] **Step 4: 只提交 Demo 06 范围文件**

```powershell
git add -- demos/开发者后台一期/build-06.mjs demos/开发者后台一期/src/next-shared/context.js demos/开发者后台一期/src/demo06 demos/开发者后台一期/06-游戏创建与发行资料demo.html demos/开发者后台一期/README.md tests/developer-backend/next-demo-context.test.mjs tests/developer-backend/game-profile-release-demo.test.mjs tests/developer-backend/game-profile-release-demo.browser.test.mjs tests/developer-backend/evidence/game-profile-release
git commit -m "feat: align developer game profile demo scope"
```
