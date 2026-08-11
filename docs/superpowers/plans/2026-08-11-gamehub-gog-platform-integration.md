# 盖世游戏 GOG 平台真实页面返修 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 GOG 标注 Demo 返修为基于盖世游戏现行页面的横竖双版高保真 Demo，并同步修正验证脚本与 PRD，确保 GOG 账号库参照 EPIC 且完全没有账号价值。

**Architecture:** 保留单文件三栏标注壳，将中间 APP 拆成独立的竖屏与横屏布局渲染器；账号、来源路由、异常状态和事件处理器共用同一状态模型。先冻结真实页面截图并建立失败契约，再依次完成游戏库/账号库、我的页/授权、搜索/详情、标注/异常、视觉取证和 PRD 对齐。

**Tech Stack:** HTML5、CSS、Vanilla JavaScript、Node.js 24、`node:vm`、`playwright-core` 1.61.1、本地 Google Chrome、Markdown、PowerShell、`taskctl`。

---

## 文件结构

- Create: `assets/reference/gog-platform-real-pages/01-library-home-portrait.png` — 新版竖屏游戏库首页基准。
- Create: `assets/reference/gog-platform-real-pages/02-library-home-landscape.png` — 新版横屏游戏库首页基准。
- Create: `assets/reference/gog-platform-real-pages/03-epic-library-landscape.png` — 横屏 EPIC 账号库结构基准。
- Create: `assets/reference/gog-platform-real-pages/04-epic-library-portrait.png` — 竖屏 EPIC 账号库结构基准。
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html` — 三栏标注壳、10 个真实页面视图、共享状态和全部交互。
- Modify: `tools/verify-gog-platform-demo.mjs` — 静态结构、页面、平台能力、安全和语法契约。
- Modify: `tools/verify-gog-platform-demo-ui.mjs` — Playwright 交互、布局、账号价值缺失、异常和回归检查。
- Modify: `tools/capture-gog-platform-demo.mjs` — 10 个中间页面及 1 张完整标注壳截图。
- Modify: `prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md` — 新版游戏库与“无账号价值”唯一口径。
- Modify: `tools/verify-gog-platform-prd.mjs` — PRD 页面范围、视觉基准和禁用口径检查。
- Preserve: `demos/PC与Mac端/epic接入demo.html` — 只读参考，禁止修改。
- Reference: `demos/首页与探索/游戏库demo.html` — 新版游戏库行为和布局参考。
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/30-我的.png`。
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/09-竖版搜索默认页.png`。
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/10-竖版游戏详情.png`。
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/43-掌机模式-搜索.png`。
- Reference: `_outputs/盖世游戏V6.1.1使用说明手册/图片和附件/44-掌机模式-游戏详情.png`。

## Task 1: 冻结真实页面基准并建立失败契约

**Files:**

- Create: `assets/reference/gog-platform-real-pages/*.png`
- Modify: `tools/verify-gog-platform-demo.mjs:1-48`
- Test: `tools/verify-gog-platform-demo.mjs`

- [ ] **Step 1: 将 4 张临时截图复制为稳定只读参考资产**

```powershell
New-Item -ItemType Directory -Force 'assets/reference/gog-platform-real-pages' | Out-Null
Copy-Item -LiteralPath 'C:\Users\z3635\AppData\Local\Temp\codex-clipboard-84d9ec4d-d299-4d62-a95a-0b2ca10e4fdb.png' -Destination 'assets/reference/gog-platform-real-pages/01-library-home-portrait.png'
Copy-Item -LiteralPath 'C:\Users\z3635\AppData\Local\Temp\codex-clipboard-5c8cfe74-533a-4b8d-8555-68a67c8bbeac.png' -Destination 'assets/reference/gog-platform-real-pages/02-library-home-landscape.png'
Copy-Item -LiteralPath 'C:\Users\z3635\AppData\Local\Temp\codex-clipboard-12048fd2-9313-4f4e-bdd3-529a34aed612.png' -Destination 'assets/reference/gog-platform-real-pages/03-epic-library-landscape.png'
Copy-Item -LiteralPath 'C:\Users\z3635\AppData\Local\Temp\codex-clipboard-8a7363ff-b599-46e3-a058-9ea0127d6234.png' -Destination 'assets/reference/gog-platform-real-pages/04-epic-library-portrait.png'
```

Expected dimensions, in file-name order: `395×800`、`822×487`、`941×443`、`416×813`。

- [ ] **Step 2: 用实际页面清单替换旧九页契约**

Add these constants and checks to `tools/verify-gog-platform-demo.mjs`:

```js
const realPages = [
  'profile-portrait',
  'gog-login',
  'library-home-portrait',
  'library-home-landscape',
  'gog-library-portrait',
  'gog-library-landscape',
  'search-portrait',
  'search-landscape',
  'detail-portrait',
  'detail-landscape',
];

function pages() {
  for (const id of realPages) {
    assert(html.includes(`id:'${id}'`) || html.includes(`id: '${id}'`), `Missing page: ${id}`);
  }
  pass('pages');
}

function realPageStructure() {
  for (const token of [
    'renderProfilePortrait', 'renderLibraryHomePortrait', 'renderLibraryHomeLandscape',
    'renderGogLibraryPortrait', 'renderGogLibraryLandscape',
    'renderSearchPortrait', 'renderSearchLandscape',
    'renderDetailPortrait', 'renderDetailLandscape',
  ]) assert(html.includes(token), `Missing real-page renderer: ${token}`);
  pass('realPageStructure');
}

function gogCapabilities() {
  assert(/supportsAccountValue\s*:\s*false/.test(html), 'GOG must explicitly disable account value');
  assert(/accountValue\s*:\s*null/.test(html), 'GOG account value must be null');
  assert(!html.includes('¥6.8k'), 'Legacy fabricated GOG value remains');
  pass('gogCapabilities');
}
```

Register `realPageStructure` and `gogCapabilities` in `tasks`.

- [ ] **Step 3: 运行契约并确认旧实现失败**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs pages
node tools/verify-gog-platform-demo.mjs realPageStructure
node tools/verify-gog-platform-demo.mjs gogCapabilities
```

Expected: three commands fail, respectively reporting a missing real page, missing renderer, and missing/legacy GOG capability.

- [ ] **Step 4: 提交参考资产和失败契约**

```powershell
git add -- 'assets/reference/gog-platform-real-pages' tools/verify-gog-platform-demo.mjs
git commit -m 'test: define real-page GOG rebuild contract'
```

## Task 2: 重构共享状态与 10 页面注册表

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:1273-1453`
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:1847-2175`
- Test: `tools/verify-gog-platform-demo.mjs`

- [ ] **Step 1: 用方向明确的页面注册表替换旧 `FLOW`**

```js
const FLOW = [
  { id:'profile-portrait', group:'我的页', label:'我的 · 竖屏', orientation:'portrait' },
  { id:'gog-login', group:'我的页', label:'GOG 官方授权', orientation:'portrait' },
  { id:'library-home-portrait', group:'游戏库', label:'首页 · 竖屏', orientation:'portrait' },
  { id:'library-home-landscape', group:'游戏库', label:'首页 · 横屏', orientation:'landscape' },
  { id:'gog-library-portrait', group:'游戏库', label:'GOG 账号库 · 竖屏', orientation:'portrait' },
  { id:'gog-library-landscape', group:'游戏库', label:'GOG 账号库 · 横屏', orientation:'landscape' },
  { id:'search-portrait', group:'搜索', label:'搜索 · 竖屏', orientation:'portrait' },
  { id:'search-landscape', group:'搜索', label:'搜索 · 横屏', orientation:'landscape' },
  { id:'detail-portrait', group:'详情', label:'详情 · 竖屏', orientation:'portrait' },
  { id:'detail-landscape', group:'详情', label:'详情 · 横屏', orientation:'landscape' },
];
```

- [ ] **Step 2: 把 GOG 的“无账号价值”写入共享状态**

```js
const GOG_ACCOUNT = {
  platform:'gog',
  supportsAccountValue:false,
  accountValue:null,
  username:'GalaxyRider',
  gogId:'gog_20876491',
  avatar:'G',
  gameCount:126,
  totalPlaytime:'438 小时',
  lastSyncedAt:'今天 14:32',
};

const state = {
  screen:'profile-portrait',
  orientation:'portrait',
  annotationTab:'interaction',
  showMarkers:false,
  panelHidden:false,
  simulation:'normal',
  platformSwitchOpen:false,
  profilePlatform:'gog',
  sourcePlatform:null,
  selectedPlatform:'gog',
  selectedGame:null,
  ownedPlatforms:['steam','epic','gog'],
  accountByPlatform:{
    steam:{ bindStatus:'bound', tokenStatus:'valid' },
    epic:{ bindStatus:'bound', tokenStatus:'valid' },
    gog:{ bindStatus:'bound', tokenStatus:'valid', account:{ ...GOG_ACCOUNT } },
  },
};
```

- [ ] **Step 3: 让方向只由页面注册表决定**

```js
function selectPage(pageId) {
  const next = FLOW.find(page => page.id === pageId);
  if (!next) throw new Error(`Unknown page: ${pageId}`);
  state.screen = next.id;
  state.orientation = next.orientation;
  render();
}
```

All navigation clicks must call `selectPage(pageId)`. Remove the old special case that only treats `search-landscape` as landscape.

Add one dispatcher; the renderer functions are implemented in Tasks 3–4:

```js
function renderRealPage(page) {
  const renderers = {
    'profile-portrait':renderProfilePortrait,
    'gog-login':renderGogLogin,
    'library-home-portrait':renderLibraryHomePortrait,
    'library-home-landscape':renderLibraryHomeLandscape,
    'gog-library-portrait':renderGogLibraryPortrait,
    'gog-library-landscape':renderGogLibraryLandscape,
    'search-portrait':renderSearchPortrait,
    'search-landscape':renderSearchLandscape,
    'detail-portrait':renderDetailPortrait,
    'detail-landscape':renderDetailLandscape,
  };
  const renderer = renderers[page.id];
  if (!renderer) throw new Error(`Missing renderer: ${page.id}`);
  return renderer();
}
```

- [ ] **Step 4: 运行静态契约**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs pages
node tools/verify-gog-platform-demo.mjs platformModel
node tools/verify-gog-platform-demo.mjs syntax
```

Expected: `PASS pages`、`PASS platformModel`、`PASS syntax`。

- [ ] **Step 5: 提交页面注册表和状态模型**

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m 'refactor: share GOG state across real portrait and landscape pages'
```

## Task 3: 先还原游戏库首页与 GOG 账号库

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:43-1160`
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:1605-1650`
- Modify: `tools/verify-gog-platform-demo-ui.mjs:1-360`
- Test: `tools/verify-gog-platform-demo.mjs`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 先写失败的结构、顺序和账号价值测试**

Add `realLibraryFlow()` to `tools/verify-gog-platform-demo-ui.mjs`:

```js
async function realLibraryFlow() {
  await resetDemo();
  for (const screen of ['library-home-portrait','library-home-landscape']) {
    await page.click(`[data-page="${screen}"]`);
    const order = await page.locator('[data-library-entry]').evaluateAll(nodes => nodes.map(node => node.dataset.libraryEntry));
    const epic = order.indexOf('epic');
    assert(epic >= 0, `${screen}: EPIC entry missing`);
    assert.deepEqual(order.slice(epic, epic + 3), ['epic','gog','import'], `${screen}: GOG entry order is wrong`);
  }

  for (const screen of ['gog-library-portrait','gog-library-landscape']) {
    await page.click(`[data-page="${screen}"]`);
    const text = await page.locator('#demoCanvas').innerText();
    assert(!text.includes('账号价值'), `${screen}: account value label must not render`);
    assert(!text.includes('¥6.8k'), `${screen}: fabricated account value must not render`);
    assert.equal(await page.locator('[data-account-metric="account-value"]').count(), 0);
    for (const metric of ['gog-id','game-count','total-playtime']) {
      assert.equal(await page.locator(`[data-account-metric="${metric}"]`).count(), 1, `${screen}: ${metric} missing`);
    }
  }
  console.log('PASS realLibraryFlow');
}
```

Register mode `realLibrary` and run it. Expected: failure on missing `library-home-portrait`.

- [ ] **Step 2: 建立不靠截图底图的横竖 APP 画布**

Use these stable layout contracts in the HTML CSS:

```css
.app-viewport[data-orientation="portrait"] { width:402px; height:874px; }
.app-viewport[data-orientation="landscape"] { width:874px; height:402px; }
.app-viewport { position:relative; overflow:hidden; background:#0d0f15; color:#f5f7fb; }
.app-scroll { height:100%; overflow:auto; scrollbar-width:none; }
.app-scroll::-webkit-scrollbar { display:none; }
.portrait-layout, .landscape-layout { min-height:100%; background:#0d0f15; }
```

Do not add `background-image:url(...reference...)` to `.app-viewport` or page roots.

- [ ] **Step 3: 实现竖屏和横屏游戏库首页**

Build the shared navigation, top bars, content section and entry function before the two layout renderers:

```js
const CURRENT_LIBRARY_GAMES = [
  { name:'黑神话：悟空', meta:'最近游玩 2 小时前' },
  { name:'艾尔登法环', meta:'最近游玩 昨天' },
  { name:'赛博朋克 2077', meta:'最近游玩 3 天前' },
  { name:'博德之门 3', meta:'最近游玩 1 周前' },
];

const LIBRARY_ENTRIES = [
  { id:'pc', label:'PC 游戏' },
  { id:'steam', label:'Steam' },
  { id:'epic', label:'EPIC' },
  { id:'gog', label:'GOG' },
  { id:'import', label:'导入游戏' },
];

function renderLibraryEntry(entry) {
  return `<button class="library-entry library-entry--${entry.id}" data-library-entry="${entry.id}" data-action="open-library-entry">
    <span class="library-entry__icon" aria-hidden="true"></span>
    <span class="library-entry__copy"><strong>${entry.label}</strong><small>${entry.id === 'import' ? '手动添加' : '查看游戏'}</small></span>
  </button>`;
}

function renderPortraitTopBar(title) {
  return `<header class="mobile-topbar"><button aria-label="返回">‹</button><h1>${title}</h1><button aria-label="搜索" data-action="open-search">⌕</button></header>`;
}

function renderLandscapeTopBar(title) {
  return `<header class="handheld-topbar"><h1>${title}</h1><button aria-label="搜索" data-action="open-search">⌕</button></header>`;
}

function renderPortraitBottomNav(active) {
  return `<nav class="mobile-bottom-nav" aria-label="主导航">
    ${['home','explore','library','profile'].map(id => `<button class="${id === active ? 'active' : ''}" data-nav="${id}">${{home:'首页',explore:'探索',library:'游戏库',profile:'我的'}[id]}</button>`).join('')}
  </nav>`;
}

function renderLandscapeSideNav(active) {
  return `<nav class="handheld-side-nav" aria-label="掌机主导航">
    ${['home','explore','library','profile'].map(id => `<button class="${id === active ? 'active' : ''}" data-nav="${id}">${{home:'首页',explore:'探索',library:'游戏库',profile:'我的'}[id]}</button>`).join('')}
  </nav>`;
}

function renderCurrentLibrarySections(orientation) {
  return `<section class="current-library current-library--${orientation}" data-annotation-ref="current-library">
    <header><h2>我的游戏</h2><button data-action="open-all-games">查看全部</button></header>
    <div class="current-library__grid">${CURRENT_LIBRARY_GAMES.map(game => `<article class="current-game"><div class="current-game__cover" aria-hidden="true"></div><strong>${game.name}</strong><span>${game.meta}</span></article>`).join('')}</div>
  </section>`;
}

function renderLibraryHomePortrait() {
  return `<section class="app-viewport" data-screen="library-home-portrait" data-orientation="portrait">
    <div class="app-scroll portrait-layout library-home library-home--portrait">
      ${renderPortraitTopBar('游戏库')}
      <div class="library-entry-row">${LIBRARY_ENTRIES.map(renderLibraryEntry).join('')}</div>
      ${renderCurrentLibrarySections('portrait')}
      ${renderPortraitBottomNav('library')}
    </div>
  </section>`;
}

function renderLibraryHomeLandscape() {
  return `<section class="app-viewport" data-screen="library-home-landscape" data-orientation="landscape">
    <div class="landscape-layout library-home library-home--landscape">
      ${renderLandscapeSideNav('library')}
      <main class="app-scroll landscape-content">
        ${renderLandscapeTopBar('游戏库')}
        <div class="library-entry-row">${LIBRARY_ENTRIES.map(renderLibraryEntry).join('')}</div>
        ${renderCurrentLibrarySections('landscape')}
      </main>
    </div>
  </section>`;
}
```

Match the corresponding reference screenshot for entry dimensions, header height, content density, navigation position, card radius and spacing before adding GOG-specific colors.

Follow the required two-phase sequence inside this step:

1. Render the screenshot baseline with the red-frame position kept as an empty reserved slot; capture `.tmp/gog-platform-baseline-library-portrait.png` and `.tmp/gog-platform-baseline-library-landscape.png`.
2. Compare header/content heights and navigation anchors with the two real screenshots.
3. Replace only the reserved slot with the final `gog` entry shown in `LIBRARY_ENTRIES`; do not move the EPIC or import entries.

Route the new entry without creating a second account state:

```js
function openLibraryEntry(entryId) {
  if (entryId !== 'gog') return;
  const suffix = state.orientation === 'landscape' ? 'landscape' : 'portrait';
  const gog = state.accountByPlatform.gog;
  if (gog.bindStatus !== 'bound' || gog.tokenStatus !== 'valid') {
    beginAuthorization('bind');
    return;
  }
  selectPage(`gog-library-${suffix}`);
}
```

- [ ] **Step 4: 实现参照 EPIC 的 GOG 横竖账号库**

```js
function renderGogAccountSummary(orientation) {
  return `<section class="platform-account platform-account--${orientation}" data-annotation-ref="account-summary">
    <span class="platform-account__avatar" aria-hidden="true">${GOG_ACCOUNT.avatar}</span>
    <div class="platform-account__identity"><strong>${GOG_ACCOUNT.username}</strong><span data-account-metric="gog-id">GOG ID ${GOG_ACCOUNT.gogId}</span></div>
    <div class="platform-account__metric" data-account-metric="game-count"><span>游戏</span><strong>${GOG_ACCOUNT.gameCount}</strong></div>
    <div class="platform-account__metric" data-account-metric="total-playtime"><span>总时长</span><strong>${GOG_ACCOUNT.totalPlaytime}</strong></div>
  </section>`;
}

function renderPlatformLibrary({ orientation, screen, platform, account, games }) {
  const body = `<main class="app-scroll platform-library__content">
    ${orientation === 'portrait' ? renderPortraitTopBar('GOG 游戏') : renderLandscapeTopBar('GOG 游戏')}
    ${account}
    <section class="platform-game-grid" data-annotation-ref="game-grid">
      ${games.map(game => `<button class="platform-game-card" data-game-card data-platform="${platform}" data-game-id="${game.gameId}" data-platform-app-id="${game.platformAppId}"><span class="platform-game-card__cover" aria-hidden="true"></span><strong>${game.name}</strong><small>${game.hours} 小时</small><em>GOG</em></button>`).join('')}
    </section>
  </main>`;
  const navigation = orientation === 'portrait' ? renderPortraitBottomNav('library') : renderLandscapeSideNav('library');
  return `<section class="app-viewport platform-library platform-library--${orientation}" data-screen="${screen}" data-orientation="${orientation}">${orientation === 'landscape' ? navigation : ''}${body}${orientation === 'portrait' ? navigation : ''}</section>`;
}

function renderGogLibraryPortrait() {
  return renderPlatformLibrary({ orientation:'portrait', screen:'gog-library-portrait', platform:'gog', account:renderGogAccountSummary('portrait'), games:GOG_GAMES });
}

function renderGogLibraryLandscape() {
  return renderPlatformLibrary({ orientation:'landscape', screen:'gog-library-landscape', platform:'gog', account:renderGogAccountSummary('landscape'), games:GOG_GAMES });
}
```

The account summary must have exactly three metrics: GOG ID, game count and total playtime. Username/avatar are identity fields, not metrics.

- [ ] **Step 5: 运行游戏库契约并提交**

Run:

```powershell
node tools/verify-gog-platform-demo.mjs realPageStructure
node tools/verify-gog-platform-demo.mjs gogCapabilities
node tools/verify-gog-platform-demo-ui.mjs realLibrary
```

Expected: `PASS realPageStructure`、`PASS gogCapabilities`、`PASS realLibraryFlow`。

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' tools/verify-gog-platform-demo-ui.mjs
git commit -m 'feat: rebuild current game library pages with GOG'
```

## Task 4: 还原我的页、授权、搜索和详情横竖版

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:1518-1786`
- Modify: `tools/verify-gog-platform-demo-ui.mjs:20-250`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 把旧 UI 流程断言改为“无账号价值”和新页面 ID**

Replace the legacy profile values assertion with:

```js
await page.click('[data-page="profile-portrait"]');
await page.evaluate(() => {
  window.GogDemoApp.state.accountByPlatform.gog = { bindStatus:'unbound', tokenStatus:'none', account:null };
  window.GogDemoApp.render();
});
await page.click('[data-action="bind-gog"]');
assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1);
assert((await page.locator('#demoCanvas').innerText()).includes('不保存邮箱或密码'));
await page.click('[data-action="gog-authorize-success"]');
assert.equal(await page.locator('[data-screen="profile-portrait"]').count(), 1);
const profileText = await page.locator('#demoCanvas').innerText();
for (const value of ['GalaxyRider', 'GOG ID', '126', '438 小时']) {
  assert(profileText.includes(value), `bound profile missing ${value}`);
}
assert(!profileText.includes('账号价值'));
assert(!profileText.includes('¥6.8k'));
```

Add an orientation loop for search/detail:

```js
for (const orientation of ['portrait','landscape']) {
  await page.click(`[data-page="search-${orientation}"]`);
  await page.click('[data-search-result][data-platform="gog"]');
  assert.equal(await page.locator(`[data-screen="detail-${orientation}"]`).count(), 1);
  assert.equal(await page.evaluate(() => window.GogDemoApp.state.sourcePlatform), 'gog');
  assert((await page.locator('[data-launch-platform]').innerText()).includes('GOG 启动'));
}
```

Run `node tools/verify-gog-platform-demo-ui.mjs profile` and `node tools/verify-gog-platform-demo-ui.mjs detailSearch`.

Expected: both fail against the old page IDs or old value assertion.

- [ ] **Step 2: 按真实我的页实现 GOG 绑定态**

Implement `renderProfilePortrait()` using the structure of `30-我的.png`. Keep Steam/EPIC/GOG in the existing platform area. The GOG state uses:

```js
const PROFILE_GOG_FIELDS = [
  ['GOG ID', GOG_ACCOUNT.gogId],
  ['游戏', String(GOG_ACCOUNT.gameCount)],
  ['总时长', GOG_ACCOUNT.totalPlaytime],
];

function renderProfilePortrait() {
  const gog = state.accountByPlatform.gog;
  const body = gog.bindStatus === 'bound' && gog.account
    ? `<section class="profile-platform-card" data-annotation-ref="account-summary"><header><span class="profile-avatar">${GOG_ACCOUNT.avatar}</span><div><strong>${GOG_ACCOUNT.username}</strong><small>GOG</small></div></header><dl>${PROFILE_GOG_FIELDS.map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><footer><button data-action="refresh-gog">更新刷新</button><button data-action="switch-gog">切换账号</button><button data-action="logout-gog">退出账号</button></footer></section>`
    : `<section class="profile-platform-card profile-platform-card--unbound" data-annotation-ref="account-summary"><h2>GOG 数据同步功能</h2><p>绑定账号后可查看个人游戏库数据</p><button data-action="bind-gog">绑定 GOG 账号</button></section>`;
  return `<section class="app-viewport profile-page" data-screen="profile-portrait" data-orientation="portrait"><div class="app-scroll portrait-layout">${renderProfileHeader()}<section class="profile-platform-tabs" data-annotation-ref="platform-tabs"><button>Steam</button><button>EPIC</button><button class="active">GOG</button></section>${body}${renderProfileBaseSections()}${renderPortraitBottomNav('profile')}</div></section>`;
}

function renderProfileHeader() {
  return `<header class="profile-header"><div class="profile-header__tools"><button aria-label="下载">⇩</button><button aria-label="设置">⬡</button></div><span class="profile-header__avatar">😊</span><h1>哈哈11他还好哈 <em>未实名</em></h1><p>UID jxgz1ws2s5k</p></header>`;
}

function renderProfileBaseSections() {
  return `<a class="official-community-banner" href="#" aria-label="加入盖世游戏官方游戏圈"><strong>加入盖世游戏官方游戏圈</strong><span>更多玩家资讯等你来</span></a><section class="profile-devices"><h2>我的设备</h2><button class="profile-device-empty" data-action="add-device"><span aria-hidden="true">🎮</span><strong>添加设备</strong></button></section>`;
}
```

Match the proportions and order in `30-我的.png`: profile identity → platform card → official community banner → 我的设备 → bottom navigation. Do not render an account-value field, divider, skeleton or empty placeholder. Keep refresh, switch and logout scoped to `accountByPlatform.gog`.

- [ ] **Step 3: 保留 GOG 官方授权安全边界**

`renderGogLogin()` must show the GOG official page context and these application-side actions only:

```html
<button data-action="gog-authorize-success">模拟授权成功</button>
<button data-action="gog-authorize-failure">模拟授权失败</button>
<button data-action="gog-authorize-cancel">取消并返回</button>
```

State must contain no key matching `/email|password/i`. Successful authorization returns to the exact originating page and orientation; cancellation/failure does not replace the previous GOG account.

- [ ] **Step 4: 分别实现真实搜索和详情布局**

Expose separate renderers with shared data:

```js
function renderSearchLayout({ orientation, screen }) {
  const rows = SEARCH_RESULTS.map(result => {
    const score = result.platform === 'epic' && result.rawScore != null
      ? `<span data-score>${convertEpicScore(result.rawScore)}</span>`
      : '<span class="search-result__no-score">暂无评分</span>';
    return `<button class="search-result" data-search-result data-game-id="${result.gameId}" data-platform-app-id="${result.platformAppId}" data-platform="${result.platform}"><span class="search-result__cover" aria-hidden="true"></span><span class="search-result__body"><strong>${result.name}</strong><small>${result.platform.toUpperCase()}</small>${score}</span></button>`;
  }).join('');
  const nav = orientation === 'portrait' ? renderPortraitBottomNav('explore') : renderLandscapeSideNav('explore');
  return `<section class="app-viewport search-page search-page--${orientation}" data-screen="${screen}" data-orientation="${orientation}">${orientation === 'landscape' ? nav : ''}<main class="app-scroll search-page__content">${orientation === 'portrait' ? renderPortraitTopBar('搜索') : renderLandscapeTopBar('搜索')}<label class="search-box"><span>⌕</span><input value="赛博朋克" readonly aria-label="搜索词"></label><section class="search-results" data-annotation-ref="search-results">${rows}</section></main>${orientation === 'portrait' ? nav : ''}</section>`;
}

function renderDetailLayout({ orientation, screen }) {
  const platform = state.selectedPlatform || resolveSelectedPlatform(state);
  const detail = DETAIL_BY_PLATFORM[platform];
  const nav = orientation === 'portrait' ? renderPortraitBottomNav('explore') : renderLandscapeSideNav('explore');
  return `<section class="app-viewport detail-page detail-page--${orientation}" data-screen="${screen}" data-orientation="${orientation}">${orientation === 'landscape' ? nav : ''}<main class="app-scroll detail-page__content">${orientation === 'portrait' ? renderPortraitTopBar('游戏详情') : renderLandscapeTopBar('游戏详情')}<section class="detail-hero" aria-label="${getSelectedGameName()}"></section><section class="detail-summary" data-annotation-ref="detail-context"><h1>${getSelectedGameName()}</h1><button data-action="open-platform-switch" data-detail-platform-logo>${detail.label}</button><dl><div><dt>游玩时长</dt><dd data-detail-hours>${detail.hours}</dd></div><div><dt>云存档</dt><dd data-detail-cloud>${detail.cloud}</dd></div></dl><button class="detail-launch" data-launch-platform>${detail.launch}</button></section>${state.platformSwitchOpen ? renderPlatformSwitch() : ''}</main>${orientation === 'portrait' ? nav : ''}</section>`;
}

function renderPlatformSwitch() {
  return `<section class="platform-switch" data-platform-switch data-annotation-ref="platform-switch"><header><strong>选择启动平台</strong><button data-action="close-platform-switch">关闭</button></header>${state.ownedPlatforms.map(platform => `<button data-action="select-detail-platform" data-platform="${platform}" class="${platform === state.selectedPlatform ? 'active' : ''}">${DETAIL_BY_PLATFORM[platform].label}</button>`).join('')}</section>`;
}

function renderSearchPortrait() { return renderSearchLayout({ orientation:'portrait', screen:'search-portrait' }); }
function renderSearchLandscape() { return renderSearchLayout({ orientation:'landscape', screen:'search-landscape' }); }
function renderDetailPortrait() { return renderDetailLayout({ orientation:'portrait', screen:'detail-portrait' }); }
function renderDetailLandscape() { return renderDetailLayout({ orientation:'landscape', screen:'detail-landscape' }); }
```

Portrait search/detail must match `09`/`10`; landscape search/detail must match `43`/`44`. Both search renderers use one `SEARCH_RESULTS`; both detail renderers use one `DETAIL_BY_PLATFORM` and the same `sourcePlatform`/`selectedPlatform` rules.

Update the shared game-opening handler so both library cards and search results preserve the current orientation:

```js
function openPlatformGame(card) {
  state.selectedGame = {
    gameId:card.dataset.gameId,
    platformAppId:card.dataset.platformAppId,
    platform:card.dataset.platform,
  };
  state.sourcePlatform = card.dataset.platform;
  state.selectedPlatform = card.dataset.platform;
  const suffix = state.orientation === 'landscape' ? 'landscape' : 'portrait';
  selectPage(`detail-${suffix}`);
}

function openPlatformSwitch() { state.platformSwitchOpen = true; render(); }
function closePlatformSwitch() { state.platformSwitchOpen = false; render(); }
function selectDetailPlatform(platform) {
  state.selectedPlatform = platform;
  state.platformSwitchOpen = false;
  render();
}
```

- [ ] **Step 5: 运行流程检查并提交**

```powershell
node tools/verify-gog-platform-demo.mjs security
node tools/verify-gog-platform-demo-ui.mjs profile
node tools/verify-gog-platform-demo-ui.mjs detailSearch
node tools/verify-gog-platform-demo-ui.mjs realLibrary
```

Expected: four commands pass。

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' tools/verify-gog-platform-demo-ui.mjs
git commit -m 'feat: rebuild GOG profile search and detail in both orientations'
```

## Task 5: 对齐 10 页面标注与六类恢复状态

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:1308-1408`
- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html:1787-2165`
- Modify: `tools/verify-gog-platform-demo-ui.mjs:250-520`
- Test: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: 把标注测试从 9 页改为 10 页**

```js
const expectedScreens = [
  'profile-portrait','gog-login','library-home-portrait','library-home-landscape',
  'gog-library-portrait','gog-library-landscape','search-portrait','search-landscape',
  'detail-portrait','detail-landscape',
];
assert.equal(await page.locator('.nav-item[data-page]').count(), expectedScreens.length);
```

For every screen, assert at least one numeric annotation, one `G`, one `E1`, and every `data-ref` resolves to exactly one `data-annotation-ref` target.

- [ ] **Step 2: 用明确蓝图生成 10 页面结构化标注**

Use an explicit blueprint so every page has its own target and wording without duplicating renderer logic:

```js
const ANNOTATION_BLUEPRINTS = {
  'profile-portrait':{ ref:'account-summary', title:'GOG 账号', display:'复用现有平台卡，不展示账号价值', edge:'刷新或切换失败时保留旧账号' },
  'gog-login':{ ref:'official-login', title:'官方授权', display:'凭证只在 GOG 官方页面输入', edge:'取消或失败返回发起入口' },
  'library-home-portrait':{ ref:'gog-entry', title:'竖屏 GOG 入口', display:'位于 EPIC 与导入游戏之间', edge:'未绑定时进入官方授权' },
  'library-home-landscape':{ ref:'gog-entry', title:'横屏 GOG 入口', display:'位于 EPIC 与导入游戏之间', edge:'未绑定时保持横屏返回目标' },
  'gog-library-portrait':{ ref:'account-summary', title:'竖屏 GOG 账号库', display:'显示 GOG ID、游戏数和总时长', edge:'空库与加载失败必须区分' },
  'gog-library-landscape':{ ref:'account-summary', title:'横屏 GOG 账号库', display:'与 EPIC 横屏结构一致', edge:'无账号价值及其占位' },
  'search-portrait':{ ref:'search-results', title:'竖屏搜索来源', display:'EPIC 与 GOG 分条展示', edge:'GOG 无评分时显示暂无评分' },
  'search-landscape':{ ref:'search-results', title:'横屏搜索来源', display:'与竖屏共用结果模型', edge:'方向切换不丢失搜索上下文' },
  'detail-portrait':{ ref:'detail-context', title:'竖屏 GOG 详情', display:'来源、数据和启动按钮一致', edge:'来源不可用时不静默切换' },
  'detail-landscape':{ ref:'detail-context', title:'横屏 GOG 详情', display:'使用真实掌机详情结构', edge:'平台切换只改变 selectedPlatform' },
};

const ANNOTATIONS = Object.fromEntries(Object.entries(ANNOTATION_BLUEPRINTS).map(([pageId, item]) => [pageId, {
  interaction:[
    { id:'1', ref:item.ref, title:item.title, trigger:'进入当前页面', display:item.display, interaction:'点击对应元素执行当前页面操作' },
    { id:'G', ref:item.ref, title:'跨页面平台规则', trigger:'绑定、跳转或切换方向', display:'保留 GOG 账号与 sourcePlatform', interaction:'Steam、EPIC 状态不变' },
  ],
  edge:[
    { id:'E1', ref:item.ref, title:'异常与恢复', trigger:'接口、授权或来源不可用', display:item.edge, interaction:'按当前页面提供重试、返回或重新登录' },
  ],
}]));
```

- [ ] **Step 3: 让异常状态复用当前页面与方向**

```js
const SIMULATIONS = ['normal','loading','empty','error','expired','cancelled','cached'];

function renderSimulationState(page) {
  const view = {
    loading:renderLoadingState,
    empty:renderEmptyState,
    error:renderErrorState,
    expired:renderExpiredState,
    cancelled:renderCancelledState,
    cached:renderCachedState,
  }[state.simulation];
  return view ? view(page) : renderRealPage(page);
}
```

`recoverSimulation()` must return `state.simulation` to `normal` without changing `state.screen`, `state.orientation`, Steam or EPIC state.

Define all six renderers in the same task so `renderSimulationState()` has no undeclared dependency:

```js
function renderStateFrame(page, kind, title, copy, action) {
  return `<section class="app-viewport state-page state-page--${kind}" data-screen="${page.id}" data-orientation="${page.orientation}"><main class="state-page__body" data-annotation-ref="simulation-recovery"><span class="state-page__icon" aria-hidden="true"></span><h2>${title}</h2><p>${copy}</p>${action ? `<button data-action="${action.id}">${action.label}</button>` : ''}</main></section>`;
}
function renderLoadingState(page) { return renderStateFrame(page, 'loading', '正在同步 GOG 数据', '请稍候，当前操作不可重复提交。', null); }
function renderEmptyState(page) { return renderStateFrame(page, 'empty', '暂无 GOG 游戏', '账号已绑定，可重新同步游戏库。', { id:'simulation-refresh', label:'重新同步' }); }
function renderErrorState(page) { return renderStateFrame(page, 'error', 'GOG 数据加载失败', '绑定状态和其他平台数据均已保留。', { id:'simulation-retry', label:'重试' }); }
function renderExpiredState(page) { return renderStateFrame(page, 'expired', 'GOG 授权已过期', '重新登录后返回当前页面。', { id:'simulation-reauthorize', label:'重新登录 GOG' }); }
function renderCancelledState(page) { return renderStateFrame(page, 'cancelled', '已取消 GOG 授权', '未写入新的绑定记录。', { id:'simulation-return', label:'返回原页面' }); }
function renderCachedState(page) { return renderStateFrame(page, 'cached', '正在展示缓存内容', '网络恢复后可重新同步。', { id:'simulation-retry', label:'重新同步' }); }
```

- [ ] **Step 4: 验证并提交标注/异常**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs annotations
node tools/verify-gog-platform-demo-ui.mjs all
```

Expected: static suite passes, then `PASS annotationsFlow` and `PASS browserRuntime`。

```powershell
git add -- 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html' tools/verify-gog-platform-demo-ui.mjs
git commit -m 'feat: align GOG annotations and recovery states with real pages'
```

## Task 6: 更新视觉截图并做逐页对照

**Files:**

- Modify: `tools/capture-gog-platform-demo.mjs:26-118`
- Test output: `.tmp/gog-platform-demo-captures/*.png`

- [ ] **Step 1: 把截图清单改为 10 页面加完整标注壳**

```js
const captures = [
  ['01-profile-portrait','profile-portrait'],
  ['02-gog-login','gog-login'],
  ['03-library-home-portrait','library-home-portrait'],
  ['04-library-home-landscape','library-home-landscape'],
  ['05-gog-library-portrait','gog-library-portrait'],
  ['06-gog-library-landscape','gog-library-landscape'],
  ['07-search-portrait','search-portrait'],
  ['08-search-landscape','search-landscape'],
  ['09-detail-portrait','detail-portrait'],
  ['10-detail-landscape','detail-landscape'],
];
```

Update the final expected count to `11` and the final shell filename to `11-full-annotation-shell.png`.

- [ ] **Step 2: 生成稳定截图**

Run:

```powershell
node tools/capture-gog-platform-demo.mjs
```

Expected: ten `CAPTURED` canvas lines plus `CAPTURED 11-full-annotation-shell.png`, ending in `PASS visualCaptures (11 PNG files)`。

- [ ] **Step 3: 按映射逐页视觉复核**

Use these pairs at original aspect ratio:

- `03-library-home-portrait.png` ↔ `01-library-home-portrait.png`
- `04-library-home-landscape.png` ↔ `02-library-home-landscape.png`
- `05-gog-library-portrait.png` ↔ `04-epic-library-portrait.png`
- `06-gog-library-landscape.png` ↔ `03-epic-library-landscape.png`
- `01-profile-portrait.png` ↔ `30-我的.png`
- `07-search-portrait.png` ↔ `09-竖版搜索默认页.png`
- `08-search-landscape.png` ↔ `43-掌机模式-搜索.png`
- `09-detail-portrait.png` ↔ `10-竖版游戏详情.png`
- `10-detail-landscape.png` ↔ `44-掌机模式-游戏详情.png`

Required checks: vertical section heights, navigation placement, first-content baseline, platform-entry order, card density, type hierarchy, no clipping/overlap, and no GOG account-value label or blank gap.

- [ ] **Step 4: 修正视觉差异后重跑全量 UI**

```powershell
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
```

Expected: `PASS browserRuntime` and `PASS visualCaptures (11 PNG files)`。

- [ ] **Step 5: 提交截图工具与视觉修正**

```powershell
git add -- tools/capture-gog-platform-demo.mjs 'demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html'
git commit -m 'test: capture real-page GOG portrait and landscape views'
```

Do not add `.tmp/gog-platform-demo-captures/*.png` to Git.

## Task 7: 同步返修 PRD 与 PRD 验证器

**Files:**

- Modify: `prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md`
- Modify: `tools/verify-gog-platform-prd.mjs`
- Test: `tools/verify-gog-platform-prd.mjs`

- [ ] **Step 1: 先增加“无账号价值”和 10 页面失败契约**

Add to `tools/verify-gog-platform-prd.mjs`:

```js
function currentPageRules() {
  for (const token of [
    '新版游戏库', 'EPIC → GOG → 导入游戏',
    '游戏库首页：竖屏', '游戏库首页：横屏',
    'GOG 账号游戏库：竖屏', 'GOG 账号游戏库：横屏',
    'GOG 不展示账号价值',
  ]) assert(prd.includes(token), `Missing current-page rule: ${token}`);

  for (const forbidden of [
    '用户名、账号价值', '账号价值不可计算', '账号价值缺失显示',
    'GOG 可返回的账号价值', '账号价值模型是否覆盖 GOG', '¥6.8k',
  ]) assert(!prd.includes(forbidden), `Forbidden legacy value rule: ${forbidden}`);
  pass('currentPageRules');
}
```

Register the check and run it. Expected: failure on the first missing current-page rule.

- [ ] **Step 2: 把 PRD 的旧九页和账号价值口径全部改写**

The final PRD must state:

```markdown
- GOG 不展示账号价值；页面不渲染标题、数值、骨架或占位空间，也不以 0 或“--”代替。
- 新版游戏库入口顺序固定为：EPIC → GOG → 导入游戏。
- GOG 账号游戏库参照 EPIC 的横竖版结构，保留头像、用户名、GOG ID、游戏数和总时长。
- Demo 共 10 个页面视图：我的页、GOG 授权、游戏库首页横竖版、GOG 账号库横竖版、搜索横竖版、详情横竖版。
```

Remove every positive GOG account-value statement from user stories, page tables, field tables, acceptance cases, pending items and self-review. Replace “九个页面”/“9 个页面” with the 10-view scope.

- [ ] **Step 3: 运行 PRD 自检并提交**

```powershell
node tools/verify-gog-platform-prd.mjs all
rg -n '用户名、账号价值|账号价值不可计算|账号价值缺失显示|GOG 可返回的账号价值|账号价值模型是否覆盖 GOG|¥6\.8k|九个页面|9 个页面' 'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md'
```

Expected: verifier ends in all `PASS` lines; `rg` returns no matches。

```powershell
git add -- 'prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md' tools/verify-gog-platform-prd.mjs
git commit -m 'docs: align GOG PRD with current game library pages'
```

## Task 8: 全量验收并回写 GUANWANGGAID-26

**Files:**

- Verify: all files above
- Preserve: `demos/PC与Mac端/epic接入demo.html`
- External tracking: `GUANWANGGAID-26`

- [ ] **Step 1: 运行静态、UI、截图和 PRD 全量检查**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
node tools/verify-gog-platform-prd.mjs all
git diff --exit-code HEAD -- 'demos/PC与Mac端/epic接入demo.html'
```

Expected: all suites pass, 11 captures are regenerated, and EPIC demo diff is empty。

- [ ] **Step 2: 检查工作区只包含本任务的预期提交**

```powershell
git log --oneline -8
git status --short
```

Expected: the new commits match Tasks 1–7; unrelated pre-existing dirty files remain unstaged and are not included in these commits。

- [ ] **Step 3: 将验证证据追加到任务板并移到评审**

```powershell
$issue = taskctl.cmd issue get GUANWANGGAID-26 --json | ConvertFrom-Json
$body = @'
已按确认设计完成真实页面返修：
- 游戏库使用新版横竖页面，GOG 位于 EPIC 与导入游戏之间；
- GOG 账号库参照 EPIC 横竖结构，完全移除账号价值及占位；
- 我的页、搜索、详情按真实截图重建，横竖布局独立、业务状态共用；
- sourcePlatform、账号隔离和六类异常恢复保留；
- 静态、Playwright、11 张视觉截图与 PRD 校验全部通过；EPIC 原 Demo 未修改。
请评审。
'@
taskctl.cmd comment add GUANWANGGAID-26 --body $body --json
$latest = taskctl.cmd issue get GUANWANGGAID-26 --json | ConvertFrom-Json
taskctl.cmd issue move GUANWANGGAID-26 --status in_review --if-version $latest.task.version --json
```

Expected: comment creation succeeds; final issue JSON has `status: "in_review"`。Do not move the issue to `done` until the user explicitly accepts the finished Demo.

- [ ] **Step 4: 交付最终文件与验证结果**

Provide clickable links to the Demo, PRD, design and plan; report the exact commit SHAs and test outputs. Open the Demo in the in-app browser for user review.
