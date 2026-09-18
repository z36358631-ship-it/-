# APP 会员游戏库入口与租号列表线框化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 APP 游戏库收敛为“会员游戏｜PC游戏｜复古游戏”，在发现列表穷举首租、已租号、可畅玩三种状态，并将 Demo 中的内容图片全部替换为离线线框图，最后同步 PRD 文案与截图。

**Architecture:** 以 `demo.template.html` 为唯一产品与交互源，使用显式的顶层游戏库 Tab、PC 子类型和三类演示用户状态驱动横竖屏渲染。使用一个离线 `wireframeMedia()` 组件取代所有内容位图和裁切逻辑，再由构建脚本生成普通版和标注版。验证脚本先定义源码契约和运行时契约，截图脚本再将相同状态输出到 PRD 图片。

**Tech Stack:** 单文件 HTML/CSS/JavaScript、Node.js ESM、Playwright Core、Markdown PRD、Git 分片暂存。

---

## 文件边界

- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html` — 状态、线框媒体、横竖屏页面和交互唯一源。
- Modify: `tools/build-app-rental-demo.mjs` — 去除内容位图嵌入，同步生成普通版和标注版。
- Generated: `demos/APP租号功能/盖世游戏APP租号功能demo.html` — 由构建脚本覆盖生成，不手工编辑。
- Generated: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html` — 由构建脚本覆盖生成，不手工编辑。
- Modify: `tools/verify-app-rental-demo.mjs` — 增加 Tab、入口、三种列表状态、有效期、无按钮与无位图契约。
- Modify: `tools/capture-app-rental-prd-screenshots.mjs` — 将会员库截图定位到统一游戏库 Tab，对截图前的页面状态做断言。
- Modify: `public/prd/app-rental/09-play-portrait.png`、`09-play-landscape.png`、`11-ranking-portrait.png`、`11-ranking-landscape.png`、`12-library-portrait.png`、`12-library-landscape.png`、`15-member-library-portrait.png`、`15-member-library-landscape.png` — 从最新线框 Demo 重新生成。
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md` — 同步页面入口、列表状态、有效期和无位图说明。
- Preserve without staging: 本工作树已有的售后通知文档、图片、脚本和相同 HTML 中的既有售后改动。每次提交前使用 `git diff --cached --name-only` 和 `git diff --cached` 确认本轮范围；同文件使用 `git add -p` 只暂存本轮片段。

### Task 1: 先补产品契约，让旧 Demo 按新规则失败

**Files:**
- Modify: `tools/verify-app-rental-demo.mjs:97-160`
- Modify: `tools/verify-app-rental-demo.mjs:180-680`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加源码契约**

在 `finalReviewSourceChecks` 后增加一组本轮契约，代码使用下列明确签名：

```js
const memberLibraryEntrySourceChecks = [
  ['游戏库顶层顺序', templateSource.includes("[['member', '会员游戏'], ['pc', 'PC游戏'], ['retro', '复古游戏']]")],
  ['PC子类型不占顶层', templateSource.includes('pcLibrarySource') && templateSource.includes('导入游戏')],
  ['会员入口统一进游戏库', templateSource.includes('openMemberLibrary') && !templateSource.includes("navigate('member-library')")],
  ['发现列表三种固定状态', ['first-rental', 'rented', 'playable'].every((value) => templateSource.includes(value))],
  ['发现列表无独立操作', !templateSource.includes('data-action="play-card-action"')],
  ['游戏库权益与有效期', templateSource.includes('renderLibraryEntitlementMeta') && templateSource.includes('剩余${')],
  ['内容媒体全部线框化', templateSource.includes('wireframeMedia') && !templateSource.includes('<img data-real-asset="true"')],
  ['禁止内部准备状态', !/\u5185部账号准备状态|\u8d26号分配中|\u6b63在获取登录凭据|\u6b63在自动登录/.test(templateSource)],
];
const failedMemberLibraryEntryChecks = memberLibraryEntrySourceChecks.filter(([, passed]) => !passed).map(([name]) => name);
assert(failedMemberLibraryEntryChecks.length === 0, `MEMBER_LIBRARY_ENTRY 源码契约未通过：${failedMemberLibraryEntryChecks.join('、')}`);
```

- [ ] **Step 2: 增加运行时契约**

在 Playwright 打开 Demo 后依次调用公开 API，断言实际 DOM：

```js
await page.evaluate(() => window.__appRentalDemo.openCaptureState('library'));
const libraryContract = await page.evaluate(() => ({
  tabs: [...document.querySelectorAll('[data-library-top-tab]')].map((node) => node.textContent.trim()),
  active: document.querySelector('[data-library-top-tab][aria-selected="true"]')?.dataset.value,
  cardActions: document.querySelectorAll('[data-library-game-card] button').length,
  visibleInternalState: /\u5206\u914d|\u51ed\u636e|\u81ea\u52a8\u767b\u5f55/.test(document.querySelector('[data-page-id="library"]')?.innerText || ''),
}));
assert(JSON.stringify(libraryContract.tabs) === JSON.stringify(['会员游戏', 'PC游戏', '复古游戏']), '游戏库顶层 Tab 顺序错误');
assert(libraryContract.active === 'pc', '未开会员默认应进入 PC 游戏');
assert(libraryContract.cardActions === 0 && !libraryContract.visibleInternalState, '游戏库不得出现列表操作或后台过程');

await page.evaluate(() => {
  window.__appRentalDemo.openCaptureState('membership-success');
  window.__appRentalDemo.navigate('library');
});
assert.equal(await page.locator('[data-library-top-tab][aria-selected="true"]').getAttribute('data-value'), 'member', '有效会员首次进入应默认会员游戏');

await page.locator('[data-library-top-tab][data-value="pc"]').click();
await page.evaluate(() => window.__appRentalDemo.navigate('profile'));
await page.evaluate(() => window.__appRentalDemo.navigate('library'));
assert.equal(await page.locator('[data-library-top-tab][aria-selected="true"]').getAttribute('data-value'), 'pc', '用户主动选择的 Tab 必须被记忆');
```

再对 `play`、`ranking`、`member-library` 截图状态断言：

```js
const stateLabels = ['¥1.9 首租', '已租号', '可畅玩'];
for (const pageId of ['play', 'ranking']) {
  await page.evaluate((id) => window.__appRentalDemo.openCaptureState(id), pageId);
  const snapshot = await page.evaluate(() => ({
    labels: [...document.querySelectorAll('[data-discovery-list-state] strong')].map((node) => node.textContent.trim()),
    demands: [...document.querySelectorAll('[data-discovery-list-state] small')].map((node) => node.textContent.trim()),
    inlineActions: document.querySelectorAll('[data-discovery-game-card] > button, [data-discovery-game-card] [data-inline-action]').length,
  }));
  assert(stateLabels.every((label) => snapshot.labels.includes(label)), `${pageId} 未穷举三种列表状态`);
  assert(snapshot.demands.every((text) => text === '99+ 在租'), `${pageId} 在租人数文案不一致`);
  assert(snapshot.inlineActions === 0, `${pageId} 列表不得启动或下载`);
}
```

- [ ] **Step 3: 运行旧 Demo 并确认契约失败**

Run:

```powershell
node tools/verify-app-rental-demo.mjs
```

Expected: 退出码非 0，失败信息至少包含 `MEMBER_LIBRARY_ENTRY 源码契约未通过` 或“游戏库顶层 Tab 顺序错误”。

### Task 2: 将全部内容图片替换为统一线框媒体

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2076-2122`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4599-4635`
- Modify: `tools/build-app-rental-demo.mjs:8-62`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 把图片契约收紧为无位图、无外链**

在验证脚本中增加：

```js
for (const [label, source] of [['普通版', fs.readFileSync(htmlPath, 'utf8')], ['标注版', annotationSource]]) {
  assert(!/<img\b/i.test(source), `${label}仍包含位图 img`);
  assert(!/data:image\/(?:png|jpe?g|webp)/i.test(source), `${label}仍嵌入位图 data URL`);
  assert(!/(?:src|href)=["']https?:|url\(["']?https?:/i.test(source), `${label}含有外部媒体依赖`);
}
```

- [ ] **Step 2: 用单一组件生成线框图**

删除 `ASSETS`、`ASSET_SIZES`、`realCrop()` 与 `applyRealCrops()`，新增：

```js
function wireframeMedia(_assetKey, _crop, alt, label = '', className = 'cover-art') {
  const safeAlt = escapeAttribute(alt);
  return `<span class="wireframe-media ${className}" role="img" aria-label="${safeAlt}">
    <svg viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
      <rect x="4" y="4" width="92" height="62" rx="7"/>
      <circle cx="72" cy="20" r="8"/>
      <path d="M7 60 30 37l13 12 17-22 33 33"/>
    </svg>
    <small>${label || safeAlt.replace(/(?:\u6a2a\u5c4f|\u7ad6\u5c4f|\u6e38\u620f|\u4f1a\u5458|\u7528\u6237|\u63a8\u8350|\u8d44\u8baf|\u5c01\u9762|\u914d\u56fe|\u753b\u9762|\u4e3b\u89c6\u89c9|\u89c6\u9891\u9884\u89c8)/g, '').trim() || '\u7ebf\u6846\u56fe'}</small>
  </span>`;
}
```

将模板内所有 `realCrop(` 调用机械替换为 `wireframeMedia(`，保留现有参数、容器类名、尺寸、圆角与点击区。CSS 使用低对比深色底、描边与简化山形线条，不加入新艺术素材。

- [ ] **Step 3: 精简构建脚本**

删除 `sourceAssetDir`、`referenceAssetDir`、`assets`、`dataUrl()` 以及占位符替换循环，构建仅执行：

```js
let html = fs.readFileSync(templatePath, 'utf8');
if (/\{\{[A-Z0-9_]+\}\}/.test(html)) throw new Error('模板不得依赖位图占位符');
writeTextWithRetry(outputPath, html);
```

标注版继续复用同一 `html`，不使用 iframe、外链或单独图片表。

- [ ] **Step 4: 构建并确认图片契约通过**

Run:

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: 构建成功；图片契约通过；其他新契约仍保持失败，因为页面逻辑尚未实现。

### Task 3: 收敛游戏库信息架构和会员入口

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2158-2168`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2171-2402`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4478-4567`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4718-4733`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:5026-5068`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:5493-5544`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 分离顶层 Tab 与 PC 子类型状态**

将状态改为：

```js
libraryTab: 'pc',
pcLibrarySource: 'steam',
librarySearch: '',
libraryTabRemembered: false,
```

重置时保持同样字段。用户主动切换 `libraryTab` 后设置 `libraryTabRemembered = true`；仅在首次进入且未记忆时根据会员状态决定默认 Tab。

- [ ] **Step 2: 新增统一会员库入口**

```js
function hasActiveMembership() {
  return Boolean(state.membershipEntitlement.expiresAt > nowFromServer())
    || ['weekly-active', 'monthly-active', 'quarterly-active'].includes(state.membershipStatus);
}

function openMemberLibrary({ remember = true } = {}) {
  state.libraryTab = 'member';
  if (remember) state.libraryTabRemembered = true;
  navigate('library');
}
```

会员中心“查看更多”、会员支付成功“去选游戏”、玩游戏·PC游戏快捷入口均调用该函数。删除独立 `member-library` 导航路由；`member-library` 仅作为截图 pageId，实际 screen 映射到 `library` 并选中 `member`。

- [ ] **Step 3: 重写竖屏游戏库容器**

```js
const LIBRARY_TOP_TABS = Object.freeze([
  ['member', '会员游戏'],
  ['pc', 'PC游戏'],
  ['retro', '复古游戏'],
]);

function renderLibraryTopTabs() {
  return `<div class="page-tabs library-top-tabs" role="tablist">${LIBRARY_TOP_TABS.map(([value, label]) => `<button type="button" role="tab" data-library-top-tab data-action="set-tab" data-group="libraryTab" data-value="${value}" aria-selected="${state.libraryTab === value}" class="${state.libraryTab === value ? 'active' : ''}">${label}</button>`).join('')}</div>`;
}
```

`member` 内容使用完整会员库搜索与一排2个卡片；`pc` 内部再展示 Steam、Epic、导入游戏子类型；`retro` 保留原复古内容。三个顶层 Tab 竖屏一行完整展示，不滚动、不换行。

- [ ] **Step 4: 横屏复用同一状态和顺序**

`renderLandscapeLibrary()` 只做宽屏排版转换，Tab 顺序、PC 子类型、会员搜索和整卡进详情规则与竖屏一致。卡片使用固定最大宽度，不为凑满整行强制拉伸。

- [ ] **Step 5: 运行构建与游戏库契约**

Run:

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: 顶层 Tab、未开会员默认 PC、有效会员入口直达会员 Tab、独立会员库路由移除契约通过。

### Task 4: 穷举排行榜和玩游戏·PC游戏三种状态

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:2860-2945`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4687-4716`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4749-4753`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:5565-5615`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:5630-5639`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 定义仅用于发现列表的显式状态**

不复用搜索页的价格优先级组件，避免把搜索规则混入本轮列表：

```js
const DISCOVERY_LIST_STATES = Object.freeze({
  FIRST_RENTAL: Object.freeze({ id: 'first-rental', label: '¥1.9 首租' }),
  RENTED: Object.freeze({ id: 'rented', label: '已租号' }),
  PLAYABLE: Object.freeze({ id: 'playable', label: '可畅玩' }),
});

function renderDiscoveryListState(stateId) {
  const model = Object.values(DISCOVERY_LIST_STATES).find(({ id }) => id === stateId);
  return `<span class="discovery-list-state" data-discovery-list-state="${model.id}"><strong>${model.label}</strong><small>99+ 在租</small></span>`;
}
```

- [ ] **Step 2: 在每个目标列表放入三个明确样例**

`PLAY_PC_GAMES` 和排行榜数据均增加 `listState`，前三个依次为 `first-rental`、`rented`、`playable`。列表卡只保留线框封面、游戏名和两行状态，整卡使用：

```html
<article data-discovery-game-card data-action="navigate" data-screen="detail" data-game-id="...">
  <!-- 线框封面 + 游戏名 + 两行状态 -->
</article>
```

删除 PC 列表的“启动”、“下载”与 `play-card-action`。点击列表只设置游戏并进入详情，不调用创单、下载或账号准备。

- [ ] **Step 3: 保持搜索页的已确认规则**

`renderDiscoveryDisplay()` 和 `resolveGameDisplayModel()` 仍只服务搜索结果与现有 Banner，不改成“¥1.9 首租 / 99+ 在租”两行列表组件。在源码注释中写明两套规则的使用边界。

- [ ] **Step 4: 验证三种状态和唯一点击路径**

Run:

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: Play 与 Ranking 横竖屏均能读取三个状态，每个状态的第二行均为 `99+ 在租`，独立操作数量为 0。

### Task 5: 在游戏库卡片落地权益和剩余有效期

**Files:**
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:4718-4733`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:5049-5068`
- Modify: `demos/APP租号功能/盖世游戏APP租号功能demo.template.html:5493-5544`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 增加游戏库卡片权益模型**

```js
const LIBRARY_ENTITLEMENT_SAMPLES = Object.freeze([
  Object.freeze({ gameId: 'red-dead-2', edition: '标准版', entitlement: '已租号', expiresAt: () => nowFromServer() + 102 * 60 * 1000 }),
  Object.freeze({ gameId: 'elden-ring', edition: '标准版', entitlement: '单游戏永久', expiresAt: null }),
]);

function formatLibraryRemaining(expiresAt, now = nowFromServer()) {
  const remainingMinutes = Math.max(0, Math.ceil((expiresAt - now) / 60000));
  if (remainingMinutes <= 24 * 60) return `剩余${Math.floor(remainingMinutes / 60)}小时${remainingMinutes % 60}分`;
  return `剩余${Math.floor(remainingMinutes / 1440)}天${Math.floor((remainingMinutes % 1440) / 60)}小时`;
}

function renderLibraryEntitlementMeta(item) {
  const validity = item.expiresAt ? `<small class="library-validity">${formatLibraryRemaining(item.expiresAt())}</small>` : '';
  return `<span class="library-edition-entitlement">${item.edition} · ${item.entitlement}</span>${validity}`;
}
```

- [ ] **Step 2: 按线框已确认的层级渲染**

PC 游戏权益卡片从上到下严格为：线框封面、游戏名、灰色“版本 · 权益”、剩余有效期。单游戏永久不生成第三行。会员游戏卡片仍只显示游戏名和灰色“标准版”；会员到期日放在会员 Tab 顶部状态区，不在每张卡片重复。

- [ ] **Step 3: 验证时长格式和卡片边界**

将 `formatLibraryRemaining` 暴露到 `window.__appRentalDemo`，添加：

```js
assert.equal(await page.evaluate(() => window.__appRentalDemo.formatLibraryRemaining(Date.now() + 102 * 60 * 1000, Date.now())), '剩余1小时42分');
assert.equal(await page.evaluate(() => window.__appRentalDemo.formatLibraryRemaining(Date.now() + 51 * 60 * 60 * 1000, Date.now())), '剩余2天3小时');
```

同时断言单游戏永久卡片不含 `.library-validity`，会员卡片不含“支持云存档”和到期时间。

- [ ] **Step 4: 运行契约验证**

Run:

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: `MEMBER_LIBRARY_ENTRY`、有效期格式、永久无倒计时、会员卡片简化全部通过。

### Task 6: 同步普通版、标注版与页面说明

**Files:**
- Modify: `tools/build-app-rental-demo.mjs:66-360`
- Generated: `demos/APP租号功能/盖世游戏APP租号功能demo.html`
- Generated: `demos/APP租号功能/盖世游戏APP租号功能-标注版.html`
- Test: `tools/verify-app-rental-demo.mjs`

- [ ] **Step 1: 更新构建签名和标注页清单**

`requiredBusinessSignatures` 加入 `LIBRARY_TOP_TABS`、`openMemberLibrary`、`DISCOVERY_LIST_STATES`、`renderDiscoveryListState`、`renderLibraryEntitlementMeta`、`wireframeMedia`，移除 `realCrop`、`data-real-asset`、`play-card-action`和独立会员库路由的签名。

标注文案覆盖：

1. 会员游戏、PC游戏、复古游戏的顶层顺序与默认规则。
2. 排行榜与 PC 游戏的三种状态，列表只进详情。
3. 游戏库权益与剩余有效期的展示位置。
4. 无“内部账号准备状态”、无“分配中”、无列表启动／下载。
5. 会员中心“查看更多”和支付成功均直达统一会员 Tab。

- [ ] **Step 2: 生成两个 Demo**

Run:

```powershell
node tools/build-app-rental-demo.mjs
```

Expected: 普通版和标注版同时更新；两者内嵌业务 HTML 与脚本签名一致；无外链与位图 data URL。

- [ ] **Step 3: 对两个产物执行离线契约**

Run:

```powershell
node tools/verify-app-rental-demo.mjs
```

Expected: 退出码 0，输出包含 `SOURCE`、`ANNOTATION`、`MEMBER_LIBRARY_ENTRY`、`PASS`。

### Task 7: 重新截图并用页面契约阻止回归

**Files:**
- Modify: `tools/capture-app-rental-prd-screenshots.mjs:49-84`
- Modify: `tools/capture-app-rental-prd-screenshots.mjs:305-590`
- Modify: `public/prd/app-rental/09-play-portrait.png`
- Modify: `public/prd/app-rental/09-play-landscape.png`
- Modify: `public/prd/app-rental/11-ranking-portrait.png`
- Modify: `public/prd/app-rental/11-ranking-landscape.png`
- Modify: `public/prd/app-rental/12-library-portrait.png`
- Modify: `public/prd/app-rental/12-library-landscape.png`
- Modify: `public/prd/app-rental/15-member-library-portrait.png`
- Modify: `public/prd/app-rental/15-member-library-landscape.png`
- Test: `tools/capture-app-rental-prd-screenshots.mjs`

- [ ] **Step 1: 将会员库截图映射到统一游戏库**

`openCaptureState('member-library')` 必须返回 `screen: 'library'`、`libraryTab: 'member'`；`openCaptureState('library')` 返回 `screen: 'library'`、`libraryTab: 'pc'`。截图脚本在操作后断言：

```js
if (shot.pageId === 'library') assert.equal(result.libraryTab, 'pc', `${shot.name} 必须展示 PC 游戏`);
if (shot.pageId === 'member-library') assert.equal(result.libraryTab, 'member', `${shot.name} 必须展示会员游戏`);
```

- [ ] **Step 2: 增加截图 DOM 断言**

Play 和 Ranking 要求三种状态和 0 个独立按钮；Library 要求两种权益卡片与正确有效期；Member Library 要求会员状态区有有效期、游戏卡不重复到期时间。所有截图要求 `imgCount === 0`。

- [ ] **Step 3: 生成截图**

Run:

```powershell
node tools/capture-app-rental-prd-screenshots.mjs
```

Expected: 退出码 0；目标 8 张图片更新；截图断言全部通过。

- [ ] **Step 4: 视觉检查 8 张关键截图**

使用本地图片查看器逐张检查：

1. 竖屏三个顶层 Tab 同行，搜索与标题不重叠。
2. 横屏卡片按内容宽度排列，不被强制拉满，无越界。
3. 三种列表状态均为两行，无启动、下载、购买按钮。
4. 首次体验卡的剩余有效期在“标准版 · 已租号”下一行；永久卡无第三行。
5. 媒体区都为统一线框图，文字可读，不发生裁切错位。

### Task 8: 更新 APP PRD 页面规则与截图引用

**Files:**
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md:76-118`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md:164-184`
- Modify: `prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md:352-430`
- Test: Markdown source scan and screenshot existence checks

- [ ] **Step 1: 按原有页面级六要素结构改写相关页面**

保持现有“功能简介／场景描述／输入前置／需求描述／输出后置／补充说明”表格结构，只修改：

- `3.1.2 玩游戏·PC游戏`：穷举三种两行状态，列表无按钮，整卡进详情，会员快捷入口进统一会员 Tab。
- `3.1.4 排行榜`：同样穷举三种状态，不创单、不下载、不启动。
- `3.1.5 游戏库`：顶层固定为“会员游戏｜PC游戏｜复古游戏”；PC 内保留 Steam、Epic、导入；有效期放在版本／权益下一行；删除“内部账号准备状态”。
- `3.1.10 会员中心`：“查看更多”进统一会员 Tab。
- `3.1.11 会员游戏库`：改为游戏库内的会员 Tab，不再描述独立页；会员卡仅名称和版本，会员有效期顶部统一显示。

- [ ] **Step 2: 补充线框 Demo 交付边界**

在 Demo／交互说明中写明：封面、Banner、头像、宣传图是线框占位；功能图标和平台文字保留；线框不改变容器比例、点击热区或业务意义。

- [ ] **Step 3: 更新图片引用并保留可发布边界**

此轮重用原文件名，先确保本地 PRD 和 `public/prd/app-rental` 对应。如 PRD 引用需要新 Git 提交哈希，只在得到明确推送授权后替换 CDN URL 并推送；本计划不擅自推送远端。

- [ ] **Step 4: 执行 PRD 一致性扫描**

Run:

```powershell
rg -n "内部账号准备状态|账号分配中|正在获取登录凭据|正在自动登录|支持云存档" "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
rg -n "会员游戏｜PC游戏｜复古游戏|¥1.9 首租|已租号|可畅玩|剩余X小时X分|剩余X天X小时" "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md"
```

Expected: 第一条无输出；第二条命中游戏库、Play 和排行榜页面描述。

### Task 9: 全链路验收与分片提交

**Files:**
- Modify: `test-results/app-rental-verification/contract-results.json`
- Verify: 本计划列出的所有 Demo、脚本、PRD 和截图

- [ ] **Step 1: 重建并运行完整验证**

Run:

```powershell
node tools/build-app-rental-demo.mjs
node tools/verify-app-rental-demo.mjs
node tools/capture-app-rental-prd-screenshots.mjs
node tools/verify-app-rental-demo.mjs
```

Expected: 四条命令全部退出 0；`contract-results.json` 更新；截图后再验证仍通过。

- [ ] **Step 2: 扫描外链、位图、禁用文案和横竖屏状态**

Run:

```powershell
rg -n "<img|data:image/(png|jpeg|jpg|webp)|内部账号准备状态|账号分配中|正在获取登录凭据|正在自动登录|data-action=\"play-card-action\"" "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "demos/APP租号功能/盖世游戏APP租号功能demo.html" "demos/APP租号功能/盖世游戏APP租号功能-标注版.html"
git diff --check
```

Expected: `rg` 无输出；`git diff --check` 无错误。

- [ ] **Step 3: 查看工作树并仅暂存本轮片段**

Run:

```powershell
git status --short
git diff --cached --name-only
git add -p -- "demos/APP租号功能/盖世游戏APP租号功能demo.template.html" "tools/build-app-rental-demo.mjs" "tools/capture-app-rental-prd-screenshots.mjs" "tools/verify-app-rental-demo.mjs"
git add -- "demos/APP租号功能/盖世游戏APP租号功能demo.html" "demos/APP租号功能/盖世游戏APP租号功能-标注版.html" "prd/【盖世游戏APP】游戏租号需求/【Prd】《盖世游戏APP》游戏租号需求.md" "public/prd/app-rental/09-play-portrait.png" "public/prd/app-rental/09-play-landscape.png" "public/prd/app-rental/11-ranking-portrait.png" "public/prd/app-rental/11-ranking-landscape.png" "public/prd/app-rental/12-library-portrait.png" "public/prd/app-rental/12-library-landscape.png" "public/prd/app-rental/15-member-library-portrait.png" "public/prd/app-rental/15-member-library-landscape.png"
git diff --cached --name-only
git diff --cached --check
```

Expected: 暂存区不包含 `评审补充-消息通知与售后类型.md`、`20-after-sales-refund-portrait.png`、`21-after-sales-replacement-portrait.png`、`22-rental-notifications-portrait.png`、`capture-app-rental-review-pages.mjs` 等既有售后成果。

- [ ] **Step 4: 本地提交已验证成果**

```powershell
git commit -m "feat: unify APP member library entry"
```

Expected: 提交成功。不执行 `git push`；等待用户对 Demo、截图和 PRD 验收后再决定是否推送。
