# iOS App and IPA Library Annotated Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file, high-fidelity annotated Demo for Gaishi Mac that preserves the complete iOS App/IPA workflow, matches the existing Gaishi client shell, uses a macOS Applications-style icon grid, and demonstrates the complete resource lifecycle.

**Architecture:** Create a new standalone HTML file without modifying the existing business Demo. The document contains an outer annotation shell, a fixed 1440×900 macOS desktop stage, a 1240×780 Gaishi window, isolated business state/renderers, an annotation controller, deterministic state fixtures, and in-page Smoke Tests.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, inline SVG icons, browser DOM APIs, PowerShell/Node syntax checks, GitHub Pages.

---

### Task 1: Create the standalone annotated shell and exact Gaishi client frame

**Files:**
- Create: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`
- Reference: `Mac端demo/mac端租号功能/Mac端租号功能-标注版.html`
- Reference: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo.html`

- [ ] **Step 1: Create a failing shell structure check**

Run:

```powershell
$p='Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html'
$html=Get-Content -Raw -Encoding UTF8 $p
@('annotation-app','flow-nav','desktop-stage','gaishi-window','annotation-panel') | ForEach-Object {
  if($html -notmatch $_){ throw "missing $_" }
}
```

Expected: FAIL because the target file does not exist.

- [ ] **Step 2: Add the outer annotation shell and fixed desktop stage**

Create the file with these stable roots:

```html
<div id="annotationApp" class="annotation-app">
  <aside id="flowNav" class="flow-nav"></aside>
  <main class="stage-shell">
    <div id="stageViewport" class="stage-viewport">
      <section id="desktopStage" class="desktop-stage">
        <div class="macos-menu-bar"></div>
        <section id="gaishiWindow" class="gaishi-window">
          <header class="window-titlebar"></header>
          <div class="client-body">
            <aside id="clientRail" class="mac-rail"></aside>
            <main id="businessApp" class="client-main"></main>
          </div>
        </section>
        <div id="businessOverlay" class="business-overlay"></div>
        <div id="annotationOverlay" class="annotation-overlay"></div>
      </section>
    </div>
  </main>
  <aside id="annotationPanel" class="annotation-panel"></aside>
</div>
```

- [ ] **Step 3: Add exact client rail tokens and menu order**

Use the existing Gaishi rail values without approximation:

```css
.mac-rail{width:72px;background:#141516;border-right:1px solid #2a2c2e;display:flex;flex-direction:column;align-items:center;padding:20px 0;gap:15px}
.mac-rail button{width:42px;height:42px;border:0;border-radius:8px;background:transparent;color:#858b90;display:grid;place-items:center}
.mac-rail button.active,.mac-rail button:hover:not(:disabled){background:#292b2d;color:#fff}
.mac-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #4a4d50}
```

Render the order `探索、云游戏、数据、找游戏、游戏库、iOS 应用、订单中心`, followed by `搜索、下载管理、头像`.

- [ ] **Step 4: Add macOS desktop/window visuals and scale controller**

Implement a `1440×900` logical desktop, `28px` menu bar, `1240×780` centered window, `44px` titlebar, traffic lights, gradient wallpaper, and a `ResizeObserver` scale calculation:

```js
function fitDesktopStage(){
  const viewport=document.getElementById('stageViewport');
  const stage=document.getElementById('desktopStage');
  const scale=Math.min(viewport.clientWidth/1440,viewport.clientHeight/900);
  stage.style.setProperty('--stage-scale',String(Math.max(.42,scale)));
}
```

- [ ] **Step 5: Run the shell structure check**

Expected: PASS with no output.

- [ ] **Step 6: Commit the shell**

```powershell
git add -- 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html'
git commit -m "feat: add high fidelity annotated Mac shell"
```

### Task 2: Implement the Mac Applications grid and layered resource state model

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Add failing state-model assertions**

Add Smoke assertions for fourteen display states and the old-version-plus-update combination:

```js
check('all-resource-visual-states',DISPLAY_FIXTURES.length===14);
check('update-keeps-installed-version',fixture('update-download').install.status==='installed'&&fixture('update-download').download.status==='downloading');
```

Expected: FAIL until fixtures and layered state helpers exist.

- [ ] **Step 2: Define independent resource/download/install layers**

```js
const fixture=(id)=>resourceFixtures.find(item=>item.id===id);
function deriveDisplayState(item){
  if(!item.resource.compatible)return'incompatible';
  if(item.install.status==='install-failed')return'install-failed';
  if(item.install.status==='installing')return'installing';
  if(item.download.status!=='idle')return item.download.status;
  if(item.install.status==='installed'&&compareVersions(item.resource.version,item.install.version)>0)return'update';
  if(item.install.status==='installed')return'installed';
  return item.resource.hash?'not-downloaded':'hash-risk';
}
```

Fixtures must cover: `not-downloaded`, `queued`, `downloading`, `paused`, `validating`, `ready`, `installing`, `installed`, `update`, `download-failed`, `validation-failed`, `install-failed`, `incompatible`, and `hash-risk`.

- [ ] **Step 3: Replace large cards with icon-grid units**

Use a responsive seven/six/five-column grid with `120px` cells and `80px` icons. Every item must render a real icon/fallback, one-line name, fixed-height status, and one compact primary action.

```js
function renderResourceTile(item){
  const display=deriveDisplayState(item);
  const spec=RESOURCE_PRESENTATION[display];
  return `<article class="app-tile state-${display}" data-resource-id="${item.id}">
    ${renderProgressRing(item)}${renderResourceIcon(item)}
    <strong class="app-tile-name">${escapeHtml(item.resource.name)}</strong>
    <span class="app-tile-status">${spec.label(item)}</span>
    ${renderTileAction(item,spec)}
  </article>`;
}
```

- [ ] **Step 4: Add categories, compact filters, and detail popover**

Render `全部、游戏、工具、娱乐、社交、创意、其他`; keep source and status filters compact; show version, build, size, Bundle ID, source, hash, and compatibility reason in a click popover instead of permanent card metadata.

- [ ] **Step 5: Implement per-task deterministic transitions**

Start timers only after a user action, bind callbacks to `taskId + generationToken`, and keep default fixtures static. Implement pause/resume, retry, delete-and-redownload, install retry, and old-version-open actions.

- [ ] **Step 6: Run state Smoke Tests**

Expected: all state-model, unique-action, and update-preservation checks PASS.

- [ ] **Step 7: Commit the grid and state model**

```powershell
git add -- 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html'
git commit -m "feat: add Mac app grid and IPA lifecycle states"
```

### Task 3: Implement import dialogs, source selection, and batch mode

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Add failing dialog-flow checks**

Add assertions that `导入 IPA` is always visible, source import is two-step, invalid copy is exact, the select-all control appears only at top right, and demo shortcuts are outside the business modal.

- [ ] **Step 2: Implement permanent local IPA import**

Keep `导入 IPA` visible in empty/non-empty/filter-empty/read-only states. If no App library path exists, choose the path first and resume the pending IPA picker action automatically.

- [ ] **Step 3: Rebuild import dialogs from the Steam library glass template**

Use a blurred client-only overlay, large glass dialog, back/title/path header, one top-right `全选/取消全选`, bottom-left `已选 X / Y`, and bottom-right `取消/导入`. Remove bottom duplicate select-all controls.

- [ ] **Step 4: Implement source validation and second-step resource selection**

Map invalid URL, invalid JSON, missing target, and unrecognized schema to the exact copy `链接无效，JSON无效或未找到！`. The first import button opens `选择要导入的 IPA`; it does not save the source. Save the source and selected resources only after final confirmation.

- [ ] **Step 5: Move AppHub/Mirror/network shortcuts outside the modal**

Place the three state shortcuts in the annotation navigation. The business dialog DOM must not contain `.example-link` or equivalent demo-only controls.

- [ ] **Step 6: Implement explicit batch mode**

Show checkboxes only in batch mode, put `全选/取消全选` at the page top right, select only current filtered eligible resources, and show the bottom glass action bar.

- [ ] **Step 7: Run dialog and batch Smoke Tests**

Expected: all checks PASS, including cancel/back state preservation and disabled final import at zero selection.

- [ ] **Step 8: Commit dialog workflows**

```powershell
git add -- 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html'
git commit -m "feat: complete IPA import and batch workflows"
```

### Task 4: Add annotation navigation, state replay, and right-side documentation

**Files:**
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Add annotation fixtures and failing linkage checks**

Create `G`, numeric, and `E` annotation entries with `page`, `state`, `target`, `title`, and `body`; assert that every left navigation state has a matching annotation group and a target.

- [ ] **Step 2: Implement left navigation replay**

Include page entries, import-dialog states, source-valid/invalid/resource-selection states, all resource lifecycle groups, batch mode, install confirmation, and failure result states.

- [ ] **Step 3: Implement right-panel controls**

Support `交互说明`/`异常&边界`, badge visibility, panel collapse/restore, annotation click replay, target positioning, and flash highlight. Use only `data-anno-action` for annotation controls.

- [ ] **Step 4: Isolate business and annotation events**

Scope business events to `#desktopStage`/`#businessApp`; keep annotation controls outside business selectors; recalculate overlay positions after every business render.

- [ ] **Step 5: Run annotation linkage Smoke Tests**

Expected: navigation, replay, badge visibility, panel collapse, and post-render target positioning PASS without changing business fixture state unexpectedly.

- [ ] **Step 6: Commit annotation interactions**

```powershell
git add -- 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html'
git commit -m "feat: add interactive annotations and state replay"
```

### Task 5: Produce product documents, verify, and prepare GitHub Pages delivery

**Files:**
- Create: `prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Create: `prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md`
- Modify: `Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html`

- [ ] **Step 1: Write the single-document PRD**

Include background, scope, stable feature IDs, information architecture, the layered state model, local IPA import, source validation/selection, icon-grid UI, batch download, install/update/uninstall, exceptions, analytics, non-functional requirements, and numbered acceptance criteria. Mark user-confirmed rules as `已确认` and technical closures as `建议方案`.

- [ ] **Step 2: Write the Feishu feature-point summary**

Use one plain Markdown line per feature point, without tables or nested bullets. Each line must describe one independently testable behavior.

- [ ] **Step 3: Run syntax and Smoke Tests**

Extract the final inline script and parse it with Node:

```powershell
$html=Get-Content -Raw -Encoding UTF8 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html'
$script=[regex]::Match($html,'<script>([\s\S]*)</script>').Groups[1].Value
$script | node --check
```

Open `?smoke=1` and require the hidden `#smokeResult` JSON to report `pass:true` with zero failed checks.

- [ ] **Step 4: Run visual screenshot checks**

Capture and inspect: Mac shell and sidebar, My App grid with permanent IPA import, all-state resource panorama, glass import dialog, invalid source dialog, source-resource selection, batch mode, and right annotation panel.

- [ ] **Step 5: Check scoped Git changes and commit**

```powershell
git diff --check -- 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html' 'prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md' 'prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md'
git add -- 'Mac端demo/mac端租号功能/盖世游戏Mac端-iOS应用与IPA资源库demo-标注版.html' 'prd/【PRD】盖世游戏Mac端-iOS应用与IPA资源库.md' 'prd/【飞书功能点】盖世游戏Mac端-iOS应用与IPA资源库.md' 'docs/superpowers/plans/2026-07-20-ios-app-ipa-library-annotated-demo.md'
git commit -m "docs: add Mac iOS library PRD and delivery notes"
```

- [ ] **Step 6: Push and verify the preview URL**

```powershell
git push origin master
```

Verify the GitHub Pages URL for the encoded path returns HTTP 200 and the page title matches the annotated Demo.
