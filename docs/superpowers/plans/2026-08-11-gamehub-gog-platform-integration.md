# GameHub GOG Platform Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained annotated GOG integration demo and an implementation-ready PRD covering the GameHub profile, library, game detail, and search experiences in portrait and landscape.

**Architecture:** Add one new self-contained HTML demo without modifying the old EPIC demo. The HTML owns an in-memory state model, nine page renderers, platform-routing rules, annotations, and failure simulations. Separate Node scripts provide static checks, Playwright interaction checks, visual captures, and PRD checks.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Node.js 24, `node:vm`, `playwright-core` 1.61.1, local Google Chrome, Markdown.

---

## File map

- Create: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html` — all pages, styles, state, annotations, and interactions.
- Create: `tools/verify-gog-platform-demo.mjs` — static content, mapping, routing, security, and JavaScript syntax checks.
- Create: `tools/verify-gog-platform-demo-ui.mjs` — Playwright interaction, layout, and recovery checks.
- Create: `tools/capture-gog-platform-demo.mjs` — screenshots written to `.tmp/gog-platform-demo-captures/`.
- Create: `prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md` — C-side domestic/overseas PRD without embedded images.
- Create: `tools/verify-gog-platform-prd.mjs` — PRD structure, rule, security, and placeholder checks.
- Preserve: `demos/PC与Mac端/epic接入demo.html` — read-only reference.

## Task 1: Add the static demo contract

**Files:**

- Create: `tools/verify-gog-platform-demo.mjs`
- Test: `tools/verify-gog-platform-demo.mjs`

- [ ] **Step 1: Write the failing static verifier**

```js
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const mode = process.argv[2] || 'all';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pass = name => console.log(`PASS ${name}`);

function shell() {
  for (const token of ['gogDemoShell','leftNav','demoCanvas','annoPanel','interactionTab','edgeTab','toggleMarkers','togglePanel'])
    assert(html.includes(token), `Missing shell token: ${token}`);
  pass('shell');
}
function pages() {
  for (const id of ['profile-unbound','gog-login','profile-bound','library-unbound','library-bound','detail-gog','detail-switch','search-portrait','search-landscape'])
    assert(html.includes(`id:'${id}'`) || html.includes(`id: '${id}'`), `Missing page: ${id}`);
  pass('pages');
}
function platformModel() {
  for (const token of ['sourcePlatform','selectedPlatform','ownedPlatforms','platformAppId','gameId','resolveSelectedPlatform','lowConfidenceNoMerge'])
    assert(html.includes(token), `Missing model token: ${token}`);
  assert(html.includes("['steam','epic','gog']"), 'Default platform priority missing');
  pass('platformModel');
}
function states() {
  for (const token of ['loading','empty','error','expired','cancelled','cached'])
    assert(html.includes(token), `Missing recovery state: ${token}`);
  pass('states');
}
function security() {
  assert(html.includes('GOG 官方登录'), 'Official login boundary missing');
  assert(html.includes('不保存邮箱或密码'), 'Credential-storage prohibition missing');
  assert(!html.includes("localStorage.setItem('gogPassword'"), 'GOG password must not be stored');
  pass('security');
}
function syntax() {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert(scripts.length === 1, `Expected one inline script, found ${scripts.length}`);
  scripts.forEach((code, index) => new vm.Script(code, { filename: `gog-inline-${index}.js` }));
  pass('syntax');
}
const tasks = { shell, pages, platformModel, states, security, syntax };
if (mode === 'all') Object.values(tasks).forEach(task => task());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);
```

- [ ] **Step 2: Confirm the verifier fails before the demo exists**

Run: `node tools/verify-gog-platform-demo.mjs shell`

Expected: `ENOENT` for `盖世游戏GOG平台接入-交互标注版.html`.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- tools/verify-gog-platform-demo.mjs
git commit -m "test: define GOG platform demo contract"
```

## Task 2: Build the shell and platform state model

**Files:**

- Create: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Test: `tools/verify-gog-platform-demo.mjs`

- [ ] **Step 1: Create the three-column shell**

```html
<main class="gog-demo-shell" id="gogDemoShell">
  <aside class="left-nav" id="leftNav"></aside>
  <section class="demo-stage">
    <div class="stage-toolbar" id="stageToolbar"></div>
    <div class="demo-canvas" id="demoCanvas"></div>
    <button class="panel-restore" id="panelRestore" data-action="toggle-panel">展开标注</button>
  </section>
  <aside class="anno-panel" id="annoPanel">
    <header class="anno-header">
      <h2>交互标注</h2>
      <button id="toggleMarkers" data-action="toggle-markers">显示标号</button>
      <button id="togglePanel" data-action="toggle-panel">收起</button>
    </header>
    <nav class="anno-tabs">
      <button id="interactionTab" data-action="anno-tab" data-value="interaction">交互说明</button>
      <button id="edgeTab" data-action="anno-tab" data-value="edge">异常&amp;边界</button>
    </nav>
    <div class="anno-scroll" id="annoScroll"></div>
  </aside>
</main>
```

Use `220px` left navigation, flexible center, `400px` annotation panel, and the approved colors `#1e2235`, `#14161e`, `#1a1e2a`. Panel collapse must remove the right column without covering the canvas.

- [ ] **Step 2: Add the exact state and routing rule**

```js
const PLATFORM_PRIORITY = ['steam','epic','gog'];
const state = {
  screen:'profile-unbound', orientation:'portrait', annotationTab:'interaction',
  showMarkers:false, panelHidden:false, simulation:'normal',
  sourcePlatform:null, selectedPlatform:'gog',
  ownedPlatforms:['steam','epic','gog'],
  accountByPlatform:{
    steam:{ bindStatus:'bound', tokenStatus:'valid' },
    epic:{ bindStatus:'bound', tokenStatus:'valid' },
    gog:{ bindStatus:'unbound', tokenStatus:'none' },
  },
  lowConfidenceNoMerge:true,
};
function resolveSelectedPlatform({ sourcePlatform, ownedPlatforms, accountByPlatform }) {
  if (sourcePlatform) return sourcePlatform;
  return PLATFORM_PRIORITY.find(platform =>
    ownedPlatforms.includes(platform) &&
    accountByPlatform[platform]?.bindStatus === 'bound' &&
    accountByPlatform[platform]?.tokenStatus === 'valid'
  ) || null;
}
```

Expose `window.GogDemoApp = { state, resolveSelectedPlatform, render }`.

- [ ] **Step 3: Define the nine-page registry and simulations**

```js
const FLOW = [
  { id:'profile-unbound', group:'我的页', label:'GOG 未绑定' },
  { id:'gog-login', group:'我的页', label:'GOG 官方登录' },
  { id:'profile-bound', group:'我的页', label:'GOG 已绑定' },
  { id:'library-unbound', group:'游戏库', label:'GOG 未绑定' },
  { id:'library-bound', group:'游戏库', label:'GOG 游戏列表' },
  { id:'detail-gog', group:'游戏详情', label:'GOG 来源详情' },
  { id:'detail-switch', group:'游戏详情', label:'切换启动平台' },
  { id:'search-portrait', group:'搜索结果', label:'搜索结果 · 竖屏' },
  { id:'search-landscape', group:'搜索结果', label:'搜索结果 · 横屏' },
];
const SIMULATIONS = ['normal','loading','empty','error','expired','cancelled','cached'];
```

Switching page must update center content, active navigation, orientation, and annotation group in one `render()` call.

- [ ] **Step 4: Verify shell and model**

```powershell
node tools/verify-gog-platform-demo.mjs shell
node tools/verify-gog-platform-demo.mjs pages
node tools/verify-gog-platform-demo.mjs platformModel
node tools/verify-gog-platform-demo.mjs syntax
```

Expected: four `PASS` lines.

- [ ] **Step 5: Commit the shell and model**

```powershell
git add -- "demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html"
git commit -m "feat: scaffold GOG platform annotated demo"
```

## Task 3: Implement profile, official login, and library

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Create: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: Write failing Playwright profile and library flows**

```js
await page.click('[data-page="profile-unbound"]');
await page.click('[data-action="bind-gog"]');
assert.equal(await page.locator('[data-screen="gog-login"]').count(), 1);
assert((await page.locator('#demoCanvas').innerText()).includes('不保存邮箱或密码'));
await page.click('[data-action="gog-authorize-success"]');
assert.equal(await page.locator('[data-screen="profile-bound"]').count(), 1);
assert((await page.locator('#demoCanvas').innerText()).includes('GalaxyRider'));
await page.click('[data-page="library-unbound"]');
await page.click('[data-action="bind-gog"]');
await page.click('[data-action="gog-authorize-success"]');
assert.equal(await page.locator('[data-screen="library-bound"]').count(), 1);
assert.equal(await page.locator('[data-game-card][data-platform="gog"]').count(), 6);
```

Also assert GOG refresh, switch cancellation, and logout leave Steam/EPIC objects unchanged.

Use a deterministic mode dispatcher in the UI verifier:

```js
const checks = { profile:profileFlow, library:libraryFlow, detailSearch, annotations, all:browserRuntime };
if (!checks[mode]) throw new Error(`Unknown mode: ${mode}`);
await checks[mode]();
```

- [ ] **Step 2: Confirm browser failure before implementing controls**

Run: `node tools/verify-gog-platform-demo-ui.mjs profile`

Expected: first missing selector such as `[data-action="bind-gog"]`.

- [ ] **Step 3: Implement profile and official-login renderers**

Implement `renderProfileUnbound()`, `renderGogLogin()`, and `renderProfileBound()` with one Steam/EPIC/GOG card, official-login copy, bound values `GalaxyRider`, `¥6.8k`, `438h`, `126`, refresh, switch, and logout. The simulated login page may show masked visual fields but must have no email/password state keys. New account authorization must succeed before replacing the old account.

- [ ] **Step 4: Implement library renderers with stable data**

```js
const GOG_GAMES = [
  { gameId:'the-witcher-3', platformAppId:'gog-1495134320', name:'巫师 3：狂猎', hours:168 },
  { gameId:'cyberpunk-2077', platformAppId:'gog-1423049311', name:'赛博朋克 2077', hours:74 },
  { gameId:'control', platformAppId:'gog-1808684453', name:'Control', hours:26 },
  { gameId:'baldurs-gate-3', platformAppId:'gog-1456460669', name:'博德之门 3', hours:52 },
  { gameId:'disco-elysium', platformAppId:'gog-1962937292', name:'极乐迪斯科', hours:31 },
  { gameId:'frostpunk', platformAppId:'gog-1440162894', name:'冰汽时代', hours:19 },
];
```

Each card needs `data-game-id`, `data-platform-app-id`, and `data-platform="gog"`. Click sets source/selected platform to `gog` and opens `detail-gog`.

- [ ] **Step 5: Verify and commit profile/library**

```powershell
node tools/verify-gog-platform-demo.mjs states
node tools/verify-gog-platform-demo.mjs security
node tools/verify-gog-platform-demo-ui.mjs profile
node tools/verify-gog-platform-demo-ui.mjs library
git add -- "demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html" tools/verify-gog-platform-demo-ui.mjs
git commit -m "feat: add GOG account and library flows"
```

Expected: four passes before commit.

## Task 4: Implement detail routing and multi-platform search

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: Add failing detail/search checks**

```js
await page.click('[data-page="search-portrait"]');
assert.equal(await page.locator('[data-search-result][data-platform="epic"]').count(), 2);
assert.equal(await page.locator('[data-search-result][data-platform="gog"]').count(), 2);
await page.click('[data-search-result][data-platform="gog"]');
assert.equal(await page.evaluate(() => window.GogDemoApp.state.sourcePlatform), 'gog');
assert.equal(await page.evaluate(() => window.GogDemoApp.state.selectedPlatform), 'gog');
assert((await page.locator('[data-launch-platform]').innerText()).includes('GOG 启动'));
assert.equal(await page.evaluate(() => window.GogDemoApp.convertEpicScore(4.4)), 8.8);
```

Also test: no source returns Steam; unavailable GOG source stays selected and shows a switch prompt instead of silently launching Steam.

- [ ] **Step 2: Confirm failure before implementation**

Run: `node tools/verify-gog-platform-demo-ui.mjs detailSearch`

Expected: missing search or launch selector.

- [ ] **Step 3: Implement detail and platform switch**

```js
const DETAIL_BY_PLATFORM = {
  steam:{ label:'Steam', hours:'212 小时', cloud:'云存档正常', launch:'Steam 启动' },
  epic:{ label:'EPIC', hours:'96 小时', cloud:'云存档正常', launch:'EPIC 启动' },
  gog:{ label:'GOG', hours:'74 小时', cloud:'云存档已同步', launch:'GOG 启动' },
};
```

Selecting a platform must update hours, cloud, logo, and launch copy together. Expired/unavailable source must show re-login/switch actions and not call default priority.

- [ ] **Step 4: Implement portrait/landscape search with shared data**

```js
const SEARCH_RESULTS = [
  { gameId:'cyberpunk-2077', platform:'epic', platformAppId:'epic-cyberpunk', name:'赛博朋克 2077', rawScore:4.4 },
  { gameId:'cyberpunk-2077', platform:'gog', platformAppId:'gog-1423049311', name:'赛博朋克 2077', rawScore:null },
  { gameId:'the-witcher-3', platform:'epic', platformAppId:'epic-witcher-3', name:'巫师 3：狂猎', rawScore:4.7 },
  { gameId:'the-witcher-3', platform:'gog', platformAppId:'gog-1495134320', name:'巫师 3：狂猎', rawScore:null },
];
function convertEpicScore(score) {
  return Math.min(10, Math.max(0, Math.round(score * 20) / 10));
}
```

GOG rows show no fabricated rating. Both orientations use the same click handler and platform data.

- [ ] **Step 5: Verify and commit detail/search**

```powershell
node tools/verify-gog-platform-demo.mjs platformModel
node tools/verify-gog-platform-demo-ui.mjs detailSearch
git add -- "demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html" tools/verify-gog-platform-demo-ui.mjs
git commit -m "feat: add GOG detail routing and search states"
```

Expected: two passes before commit.

## Task 5: Complete annotations, simulations, and responsive behavior

**Files:**

- Modify: `demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html`
- Modify: `tools/verify-gog-platform-demo-ui.mjs`

- [ ] **Step 1: Add failing annotation/layout checks**

Check nine nav items, interaction/edge Tabs, numeric/`G`/`E1` badges, annotation flash, marker toggle, panel collapse/restore, all six simulations, portrait/landscape ratios, non-overlap, and zero `pageerror` events.

Run: `node tools/verify-gog-platform-demo-ui.mjs annotations`

Expected: failure before annotation behavior exists.

- [ ] **Step 2: Add structured annotation data**

```js
const ANNOTATIONS = {
  'profile-unbound': {
    interaction:[
      { id:'1', ref:'platform-tabs', title:'平台切换', trigger:'点击 GOG 标志', display:'同一卡片切换到 GOG 状态', interaction:'不改变 Steam/EPIC 状态' },
      { id:'2', ref:'bind-gog', title:'绑定 GOG', trigger:'点击绑定按钮', display:'打开 GOG 官方登录页', interaction:'成功后返回原入口' },
      { id:'G', ref:'platform-card', title:'账号状态隔离', trigger:'任一平台操作', display:'只更新当前平台', interaction:'其他平台保持不变' },
    ],
    edge:[
      { id:'E1', ref:'bind-gog', title:'授权页面不可达', display:'展示失败说明和重试按钮' },
    ],
  },
};
```

Add equivalent entries for all nine screens. Every marker must point to an existing `data-annotation-ref`.

- [ ] **Step 3: Implement simulation behavior**

- `loading`: skeleton and disabled actions.
- `empty`: bound account with zero games and refresh.
- `error`: no-cache failure and retry.
- `expired`: re-login without changing Steam/EPIC.
- `cancelled`: restore original entry.
- `cached`: cached content, timestamp, and retry.

Returning to `normal` rerenders without reloading the document.

- [ ] **Step 4: Verify and commit annotations**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs annotations
node tools/verify-gog-platform-demo-ui.mjs all
git add -- "demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html" tools/verify-gog-platform-demo-ui.mjs
git commit -m "feat: complete GOG demo annotations and recovery states"
```

Expected: static suite passes, annotations pass, full runtime ends with `PASS browserRuntime`.

## Task 6: Add deterministic screenshots and visual verification

**Files:**

- Create: `tools/capture-gog-platform-demo.mjs`
- Test output: `.tmp/gog-platform-demo-captures/*.png`

- [ ] **Step 1: Create the capture script**

```js
const captures = [
  ['01-profile-unbound','profile-unbound'], ['02-gog-login','gog-login'],
  ['03-profile-bound','profile-bound'], ['04-library-bound','library-bound'],
  ['05-detail-gog','detail-gog'], ['06-detail-switch','detail-switch'],
  ['07-search-portrait','search-portrait'], ['08-search-landscape','search-landscape'],
];
for (const [name, screen] of captures) {
  await page.click(`[data-page="${screen}"]`);
  await page.locator('#demoCanvas').screenshot({ path:path.join(output, `${name}.png`) });
}
await page.screenshot({ path:path.join(output, '09-full-annotation-shell.png') });
```

Use local Chrome, `1920 × 1080`, `deviceScaleFactor:1`, and `fs.mkdirSync(output,{ recursive:true })`. Do not add `.tmp` images to Git.

- [ ] **Step 2: Generate and inspect captures**

Run: `node tools/capture-gog-platform-demo.mjs`

Inspect `09-full-annotation-shell.png`, `03-profile-bound.png`, `04-library-bound.png`, and `08-search-landscape.png`. Required: no overlap, clipping, broken scrolling, low contrast, or unreadable annotation.

- [ ] **Step 3: Rerun UI checks after visual corrections**

```powershell
node tools/verify-gog-platform-demo-ui.mjs all
node tools/capture-gog-platform-demo.mjs
```

Expected: `PASS browserRuntime` and nine regenerated images.

- [ ] **Step 4: Commit capture tooling and verified corrections**

```powershell
git add -- tools/capture-gog-platform-demo.mjs "demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html"
git commit -m "test: add GOG demo visual captures"
```

## Task 7: Write and verify the PRD

**Files:**

- Create: `prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md`
- Create: `tools/verify-gog-platform-prd.mjs`

- [ ] **Step 1: Write the failing PRD verifier**

```js
for (const heading of ['一、需求背景','二、需求目标','三、需求范围','四、详细设计','五、数据与指标','六、异常与降级','七、安全与隐私','八、验收标准','九、待确认项','十、自检记录'])
  assert(prd.includes(heading), `Missing PRD heading: ${heading}`);
for (const token of ['我的页','游戏库','游戏详情','搜索结果','sourcePlatform','platformAppId','Steam > EPIC > GOG','不保存 GOG 邮箱或密码','国内包','海外包'])
  assert(prd.includes(token), `Missing PRD rule: ${token}`);
const placeholders = ['T'+'BD','T'+'ODO','待补充','稍后完善'];
assert(!placeholders.some(token => prd.includes(token)), 'PRD contains a placeholder');
assert(!/!\[[^\]]*\]\((?:\.{0,2}\/|[A-Za-z]:\\|file:|localhost|data:)/.test(prd), 'PRD contains a prohibited image URL');
```

Run: `node tools/verify-gog-platform-prd.mjs`

Expected: `ENOENT` before PRD creation.

- [ ] **Step 2: Read the required to-prd references**

Read in full:

- `.agents/skills/to-prd/references/MERGED-PRD-TEMPLATE.md`
- `prd/Skills/输出规范/PRD自查清单-前端展示易遗漏项.md`
- `prd/Skills/输出规范/盖世游戏APP国内海外差异.txt`
- `prd/Skills/输出规范/飞书标准化md.txt`
- One relevant C-side PDF under `prd/Skills/需求描述参考/C端文档参照/` using PyMuPDF.

- [ ] **Step 3: Write the PRD from the approved design**

Include C-side only, domestic/overseas differences, all nine Demo pages, account/recovery matrices, stable mapping, source routing, score conversion, security, events, metrics, acceptance cases, risks, and self-check record.

Do not embed images. Add: `本 PRD 无图示；交互与页面状态以同目录交付的单文件标注 Demo 为准。`

- [ ] **Step 4: Verify and commit the PRD**

```powershell
node tools/verify-gog-platform-prd.mjs
$forbidden = @(('T'+'BD'),('T'+'ODO'),'待补充','稍后完善','localhost','file://','data:image')
$hits = Select-String -Path "prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md" -Pattern $forbidden
if ($hits) { $hits; exit 1 }
git add -- "prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md" tools/verify-gog-platform-prd.mjs
git commit -m "docs: add GOG platform integration PRD"
```

Expected: four PRD passes; `rg` returns no matches before commit.

## Task 8: Run final verification and return the issue for review

**Files:**

- Verify all new Demo, PRD, verifier, and capture files.

- [ ] **Step 1: Run all checks**

```powershell
node tools/verify-gog-platform-demo.mjs all
node tools/verify-gog-platform-demo-ui.mjs all
node tools/verify-gog-platform-prd.mjs
node tools/capture-gog-platform-demo.mjs
```

Expected: all static checks pass, UI ends with `PASS browserRuntime`, PRD reports four passes, and nine images regenerate.

- [ ] **Step 2: Confirm scope and preserve the EPIC reference**

```powershell
git status --short -- "demos/PC与Mac端/盖世游戏GOG平台接入-交互标注版.html" "demos/PC与Mac端/epic接入demo.html" "prd/ai生成/【Prd】《盖世游戏》GOG平台接入需求.md" tools/verify-gog-platform-demo.mjs tools/verify-gog-platform-demo-ui.mjs tools/verify-gog-platform-prd.mjs tools/capture-gog-platform-demo.mjs
$epicHash = (Get-FileHash -Algorithm SHA256 "demos/PC与Mac端/epic接入demo.html").Hash
if ($epicHash -ne '514577A7B777D516A683CE3610DD7C0894C5E60F9093AB780BDDE226ADC91B1C') { throw "EPIC reference demo changed: $epicHash" }
```

Expected: no uncommitted delivery changes and exit code `0` for the EPIC demo check.

- [ ] **Step 3: Re-read taskboard state and comments**

```powershell
taskctl.cmd issue get GUANWANGGAID-26 --json
taskctl.cmd comment list GUANWANGGAID-26 --json
```

Reconcile any newer requirement before writing.

- [ ] **Step 4: Add the verification comment and move to review**

```powershell
$latestIssue = taskctl.cmd issue get GUANWANGGAID-26 --json | ConvertFrom-Json
$latestVersion = $latestIssue.task.version
taskctl.cmd comment add GUANWANGGAID-26 --body "已完成 GOG 平台接入交付：新增单文件交互标注 Demo 和 C 端国内/海外 PRD；覆盖我的页、官方登录、游戏库、详情启动与平台切换、横竖屏搜索、异常恢复、数据映射和安全边界。已通过静态契约、Playwright 全链路、JavaScript 语法、PRD 结构及关键截图检查。旧 EPIC Demo 未修改。剩余风险：正式开发前需验证 GOG 官方授权与数据字段可用范围。" --json
taskctl.cmd issue move GUANWANGGAID-26 --status in_review --if-version $latestVersion --json
```

The version is read immediately before the write; do not move directly to `done`.

- [ ] **Step 5: Deliver clickable local files**

Link the absolute Demo, PRD, design, and plan paths. Report automated/visual verification, `in_review` taskboard status, and the remaining GOG API feasibility risk.
