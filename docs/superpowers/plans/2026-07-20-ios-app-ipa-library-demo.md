# iOS App and IPA Library Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, fully interactive Mac-style Demo for the confirmed “iOS 应用 → 我的 App / IPA 资源” workflow without modifying the existing rental Demo.

**Architecture:** Create one self-contained HTML file with scoped CSS, deterministic in-memory data, pure render functions, delegated DOM events, simulated macOS folder selection, debounced source validation, and deterministic download/install task state machines. Reuse the visual language of the existing Mac game library, but isolate all iOS state and use square App icons.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, inline SVG/CSS icons, browser-native timers, headless Microsoft Edge smoke verification.

---

## File map

- Create: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html` — standalone interactive Demo, styles, state, renderers, events, and smoke tests.
- Reference only: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html` — visual shell and interaction conventions; do not modify because it already contains unrelated user changes.
- Reference only: `docs/superpowers/specs/2026-07-20-ios-app-ipa-library-design.md` — confirmed and reviewed product rules.

### Task 1: Build the isolated Mac shell and iOS state model

**Files:**
- Create: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html`

- [ ] **Step 1: Add the semantic shell and Mac visual foundation**

Create a full-viewport `.app-shell` containing `.mac-rail`, `.content-shell`, `#app`, `#modalLayer`, `#toast`, and `#taskNotice`. Define CSS variables and responsive rules without external fonts or icon CDNs:

```html
<body>
  <div class="app-shell">
    <aside class="mac-rail" aria-label="主导航"></aside>
    <main class="content-shell" id="app"></main>
  </div>
  <div id="taskNotice" class="task-notice" hidden></div>
  <div id="modalLayer" class="modal-layer" hidden></div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
</body>
```

Use a 72px dark translucent rail, a dark blue-black content background, green primary actions, 14–18px corner radii, and 1:1 App icons. At widths below 980px, keep the rail fixed and allow the page toolbar to wrap.

- [ ] **Step 2: Define isolated deterministic data**

Add a single `state.ios` object and independent arrays; do not reuse rental Demo names:

```js
const state = {
  page: 'ios-apps',
  ios: {
    tab: 'apps',
    appLibraryPath: '',
    pathStatus: 'unset',
    appQuery: '',
    appFilter: 'all',
    appSort: 'recent',
    sourceQuery: '',
    sourceFilter: 'all',
    sourceValidation: { url: '', status: 'idle', message: '', requestId: 0 },
    selectedImportIds: new Set(),
    selectedResourceIds: new Set(),
    selectedInstallIds: new Set(),
    importCandidates: [],
    downloadTasks: [],
    pendingInstallIds: new Set(),
    batchMode: false,
    refreshStatus: 'idle',
    taskActive: false,
    highlightAppId: '',
    pendingResourceId: '',
    installResult: null
  }
};
```

Provide at least five App candidates and six IPA resources. Include normal, update, damaged, incompatible, no-hash, download-failed, and validation-failed fixtures. Use CSS gradient icons with initials so the Demo has no image-network dependency.

- [ ] **Step 3: Add render and event foundations**

Define these functions and call `renderApp()` once on boot:

```js
function renderApp() {
  document.querySelector('.mac-rail').innerHTML = renderRail();
  document.getElementById('app').innerHTML = renderIOSPage();
}

function renderIOSPage() {
  return `<section class="ios-page">
    ${renderIOSHeader()}
    ${state.ios.tab === 'apps' ? renderMyApps() : renderIPAResources()}
  </section>`;
}

document.addEventListener('click', handleClick);
document.addEventListener('input', handleInput);
document.addEventListener('change', handleChange);
```

Every interactive button must have `data-action`; every input/select must have `data-input` or `data-change`.

- [ ] **Step 4: Run the script syntax check**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html','utf8');const s=h.match(/<script>([\s\S]*?)<\/script>/);if(!s)throw Error('script missing');new Function(s[1]);console.log('syntax-ok')"
```

Expected: `syntax-ok`.

### Task 2: Implement the “我的 App” directory and import journey

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html`

- [ ] **Step 1: Render the unset and empty-directory states**

When `pathStatus === 'unset'`, render this exact user-facing structure:

```html
<h2>设置 App 库位置</h2>
<p>选择一个文件夹，用于保存、导入和管理 iOS App。已有 App 不会被移动或删除。</p>
<button data-action="choose-ios-library">选择文件夹</button>
<small>已有 iOS App？选择原 App 所在文件夹即可识别。</small>
```

When a valid empty directory is selected, retain the path and render “App 库已设置，当前文件夹中还没有 App”，plus `浏览 IPA 资源` and `更改文件夹` actions.

- [ ] **Step 2: Implement the simulated macOS folder picker**

Render a dark macOS-style dialog with three deterministic choices:

```js
const directoryChoices = [
  { id: 'existing', path: '/Users/walle/Applications/iOS', label: '已有 App 的目录', outcome: 'apps' },
  { id: 'empty', path: '/Users/walle/GaishiApps', label: '空目录', outcome: 'empty' },
  { id: 'denied', path: '/Volumes/External/iOS Apps', label: '无写入权限的目录', outcome: 'denied' }
];
```

`取消` closes the dialog without mutation or error. `选择` on `denied` shows an inline permission error and keeps the old path. `existing` starts a visible scan then opens the import dialog. `empty` saves the directory and shows the valid empty state.

- [ ] **Step 3: Implement the fixed-header import dialog**

The dialog must include a fixed header, scrollable list, fixed footer, and this explanatory text:

```text
导入后可在盖世中启动和管理这些 App，不会移动或删除原文件。
```

Default-select all importable items. Disabled rows display `已导入`, `文件结构损坏`, or `当前系统不兼容`. Maintain the count as `已选 N 项 · 可导入 N 项 · 共识别 N 项`. Implement `全选`, `取消全选`, row toggle, cancel, and confirm actions.

- [ ] **Step 4: Implement App cards and all App actions**

Render a square-icon grid with search, status filter, and sorting. Each card displays name, version, size/source, and state. Implement:

```text
open-ios-app
update-ios-app
view-ios-app-error
uninstall-ios-app
show-ios-library-in-finder
rescan-ios-library
change-ios-library
reauthorize-ios-library
```

Uninstall confirmation must say “App 将被移除，用户数据会保留”. Path-change confirmation must say the new path becomes the only active path and old files are not moved or deleted. When `taskActive` is true, block path changes with “下载或安装完成后才能更改”.

- [ ] **Step 5: Verify the App journey manually**

Open the Demo and verify both directory choices:

```text
取消选择 → no mutation
选择空目录 → valid empty library
选择已有目录 → scan → import dialog → App grid
更改目录 → clear warning → no file migration claim
```

Expected: all buttons update visible state and no page reload occurs.

### Task 3: Implement IPA source validation and aggregated resources

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html`

- [ ] **Step 1: Build the no-source state and source dialog**

The empty state must disclose third-party ownership and provide `添加来源`. The source dialog contains one URL input, a fixed-height two-line validation area, `取消`, and a disabled `导入` button.

- [ ] **Step 2: Implement 500ms deterministic validation with request tokens**

Use this state transition and never issue a real network request:

```js
let validationTimer = 0;

function scheduleSourceValidation(url) {
  clearTimeout(validationTimer);
  const requestId = ++state.ios.sourceValidation.requestId;
  state.ios.sourceValidation = { url, status: url ? 'pending' : 'idle', message: '', requestId };
  updateSourceValidationUI();
  if (!url) return;
  validationTimer = window.setTimeout(() => validateDemoSource(url, requestId), 500);
}
```

Recognize the following deterministic cases:

```text
https://apphub.example/source.json → valid, AppHub, 126 resources
https://mirror.example/repo.json → valid, Mirror Repo, 42 resources
URL containing timeout → network failure
URL containing empty → no recognizable IPA
non-HTTPS URL → unsupported
already added URL → duplicate
all other HTTPS URLs → invalid source format
```

Only the latest `requestId` may update the dialog. Editing a previously valid URL immediately disables `导入`.

- [ ] **Step 3: Add source management and cached refresh states**

Implement source list actions: refresh, enable/disable, and delete. Source deletion must not uninstall Apps. Manual refresh of `Mirror Repo` alternates into an error state while cached cards remain visible with `刷新失败，展示上次缓存` and the last successful time.

- [ ] **Step 4: Aggregate and render resources**

Implement deterministic helpers:

```js
function compareVersions(a, b) {
  const left = `${a.version}.${a.build}`.split('.').map(Number);
  const right = `${b.version}.${b.build}`.split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference;
  }
  return 0;
}

function aggregateIpaResources(resources, sources) {
  const enabledIds = new Set(sources.filter(source => source.enabled).map(source => source.id));
  const result = new Map();
  resources.filter(resource => enabledIds.has(resource.sourceId) && resource.compatible).forEach(resource => {
    const current = result.get(resource.bundleId);
    if (!current || compareVersions(resource, current) > 0) result.set(resource.bundleId, resource);
  });
  return [...result.values()];
}
```

Add name search, source filter, installed/update status filter, manual refresh, and normal/batch selection modes. Use 1:1 icons and show source, version, build, size, and compatibility.

- [ ] **Step 5: Verify source and aggregation states**

Expected checks:

```text
invalid URL → 导入 disabled
valid URL → fixed feedback says 可以导入, button enabled
editing valid URL → button immediately disabled
duplicate URL → explicit duplicate message
same Bundle ID → only highest compatible version visible
failed source refresh → cached cards stay visible
```

### Task 4: Implement download, validation, install, update, and uninstall loops

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html`

- [ ] **Step 1: Add single and batch download state machines**

Normal cards use a direct download action; `批量选择` reveals checkboxes and a fixed bottom bar with selected count and total size. Simulate each task through:

```text
等待下载 → 下载中 → 校验中 → 待确认安装
```

Use fixture outcomes so one selected item can fail download and another can fail validation. Wait until every selected item reaches a terminal state (`ready`, `download-failed`, `validation-failed`) before opening install confirmation. Failed items do not block ready items.

- [ ] **Step 2: Implement the install confirmation dialog**

Use a fixed header/footer with a scrollable list. Display icon, name, old version → new version, size, source domain, and status. Default-select fully validated items. Disable failed/incompatible rows. No-hash items display `缺少来源哈希，未验证来源一致性`, remain unselected, and require a second risk confirmation when manually selected.

- [ ] **Step 3: Preserve pending packages when confirmation is cancelled**

Closing the install dialog must keep ready files in `pendingInstallIds`. Resource cards then show `已下载，待安装`, with `继续安装` and `删除安装包`. Continuing installation reopens the dialog without downloading again.

- [ ] **Step 4: Install to the active App directory and render results**

If no library path exists, preserve `pendingResourceId`, open the directory picker, and resume after a valid directory is selected. Installation updates or adds App records only after confirmation. The result dialog stays visible and shows success/failure counts, `仅重试失败项`, `打开`, and `前往我的 App`. Going to My Apps sets `highlightAppId` and visibly highlights the installed card.

- [ ] **Step 5: Verify update and uninstall safety**

Update uses the same download/validation/confirmation path. A simulated update failure must leave the old App version launchable. Uninstall removes only the App record/package in the Demo and explicitly preserves user data.

### Task 5: Add smoke tests and perform final validation

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html`

- [ ] **Step 1: Add a deterministic smoke runner**

Expose `window.__demoSmoke`. Snapshot all state and arrays, execute pure helper and DOM assertions, and restore state/timers in `finally`. Cover:

```js
const requiredChecks = [
  'ios-entry-and-tabs',
  'folder-picker-cancel-safe',
  'empty-folder-valid',
  'import-disabled-reasons',
  'app-search-filter-sort',
  'source-valid-invalid-button-rule',
  'bundle-id-latest-compatible-only',
  'batch-terminal-states-do-not-block',
  'install-disabled-and-risk-items',
  'cancel-install-keeps-pending-package',
  'uninstall-preserves-user-data-copy',
  'all-buttons-have-actions'
];
```

When `?smoke=1` is present, run the suite, set `document.body.dataset.smokeStatus` to `pass` or `fail`, and append hidden JSON in `#smokeResult`.

- [ ] **Step 2: Run syntax verification**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html','utf8');const s=h.match(/<script>([\s\S]*?)<\/script>/);if(!s)throw Error('script missing');new Function(s[1]);console.log('syntax-ok')"
```

Expected: `syntax-ok`.

- [ ] **Step 3: Run headless Edge smoke verification**

Run:

```powershell
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$uri = [System.Uri]::new((Resolve-Path 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html')).AbsoluteUri + '?smoke=1'
& $edge --headless --disable-gpu --run-all-compositor-stages-before-draw --virtual-time-budget=5000 --dump-dom $uri
```

Expected DOM contains `data-smoke-status="pass"` and a `#smokeResult` JSON object with `"pass":true`.

- [ ] **Step 4: Capture and inspect a visual screenshot**

Run:

```powershell
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$uri = [System.Uri]::new((Resolve-Path 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html')).AbsoluteUri
& $edge --headless --disable-gpu --window-size=1440,960 --screenshot='.tmp/ios-app-ipa-demo.png' $uri
```

Inspect `.tmp/ios-app-ipa-demo.png` for readable text, non-overlapping controls, visible square icons, usable modal height, and a stable source-validation feedback area.

- [ ] **Step 5: Commit only the plan and Demo**

Run:

```powershell
git add -- 'docs/superpowers/plans/2026-07-20-ios-app-ipa-library-demo.md' 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html'
git diff --cached --check
git commit -m 'feat: add Mac iOS app and IPA library demo'
```

Expected: the commit contains exactly the implementation plan and new Demo file; no existing rental, community, or advertising file is included.
