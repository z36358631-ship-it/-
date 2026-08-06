# GameHub Compatibility Responsive Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing compatibility WebView into one responsive H5 with high-fidelity hierarchical filters and a read-only configuration detail view.

**Architecture:** Keep the single offline HTML and its four existing views. Add isolated `gameFilters` and `gpuFilters` state, one shared filter renderer, and CSS container-query layouts: a full-screen two-column filter layer at 390×844 and a persistent category rail with an option flyout at 874×402. Download/apply stays in configuration cards; configuration detail never owns an action.

**Tech Stack:** HTML5, CSS container queries, vanilla JavaScript, inline SVG, Node.js built-ins, Playwright Core.

---

## File map

- Modify `demos/适合本机/盖世游戏适合本机WebView-demo.html`: filter state, filtering rules, responsive filter UI, and read-only configuration detail.
- Modify `tools/verify-compatibility-webview-demo.mjs`: require filter contracts and read-only detail contracts.
- Modify `tools/capture-compatibility-webview-demo.mjs`: exercise portrait/landscape filtering, state retention, list actions, and detail isolation.
- Reuse `test-results/compatibility-library-v2/`: overwrite the six representative screenshots with the final H5 states.

### Task 1: Add failing responsive-filter contracts

**Files:**
- Modify: `tools/verify-compatibility-webview-demo.mjs`
- Modify: `tools/capture-compatibility-webview-demo.mjs`

- [x] **Step 1: Add static contracts**

Require these markers before implementation:

```js
const required = [
  'filter-trigger', 'filter-sidebar', 'filter-panel',
  'data-filter-group', 'data-filter-option',
  'gameFilters', 'gpuFilters', 'clearFilters',
  'GPU 型号', '运行表现', '游戏平台', '配置状态',
  'GPU 厂商', 'GPU 系列', '性能档位', '验证状态'
];
```

- [x] **Step 2: Add browser assertions that initially fail**

```js
if (!await page.locator('.filter-trigger').isVisible()) errors.push('portrait filter trigger is missing');
await page.locator('.filter-trigger').click();
if (!await page.locator('.filter-layer').isVisible()) errors.push('portrait filter layer did not open');
if (await page.locator('#config-view [data-apply-config]').count() !== 0) errors.push('config detail still owns an action');
```

- [x] **Step 3: Run the tests and confirm failure**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
```

Expected: filter contracts fail because the responsive filter UI does not exist yet.

### Task 2: Add isolated filter state and deterministic filtering

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [x] **Step 1: Add filter state**

```js
const emptyGameFilters=()=>({gpuIds:[],statuses:[],stores:[],configStates:[]});
const emptyGpuFilters=()=>({vendors:[],families:[],tiers:[],verifiedStates:[]});
Object.assign(state,{
  gameFilters:emptyGameFilters(),gpuFilters:emptyGpuFilters(),
  filterOpen:false,filterGroup:'gpuIds'
});
```

- [x] **Step 2: Add filter definitions and helpers**

```js
const tierBand=tier=>tier>=85?'flagship':tier>=70?'high':'mainstream';
const includesAny=(selected,value)=>!selected.length||selected.includes(value);
const toggleValue=(list,value)=>list.includes(value)?list.filter(x=>x!==value):[...list,value];
const activeGameGpuIds=()=>state.localOnly&&state.context?.status==='ready'
  ?[state.context.gpuId]:state.gameFilters.gpuIds;
```

Use OR inside one group and AND between groups. `运行表现` is disabled until `activeGameGpuIds()` is non-empty. A game matches selected statuses only when one record has both a selected GPU and a selected status.

- [x] **Step 3: Replace `catalogItems()`**

```js
function catalogItems(){
  const q=state.query.trim().toLowerCase();
  if(state.mode==='game'){
    const f=state.gameFilters,gpuIds=activeGameGpuIds();
    return state.games.filter(game=>{
      const records=recordsForGame(game.id);
      const queryMatch=!q||[game.name,...game.aliases].some(v=>v.toLowerCase().includes(q));
      const storeMatch=includesAny(f.stores,game.store);
      const gpuMatch=!gpuIds.length||records.some(record=>gpuIds.includes(record.gpuId));
      const statusMatch=!f.statuses.length||records.some(record=>gpuIds.includes(record.gpuId)&&f.statuses.includes(record.status));
      const hasConfig=configCountForGame(game.id)>0;
      const configMatch=!f.configStates.length||f.configStates.includes(hasConfig?'has':'none');
      return queryMatch&&storeMatch&&gpuMatch&&statusMatch&&configMatch;
    });
  }
  const f=state.gpuFilters;
  return state.gpus.filter(gpu=>!q||gpu.name.toLowerCase().includes(q))
    .filter(gpu=>includesAny(f.vendors,gpu.vendor))
    .filter(gpu=>includesAny(f.families,gpu.family))
    .filter(gpu=>includesAny(f.tiers,tierBand(gpu.tier)))
    .filter(gpu=>!f.verifiedStates.length||f.verifiedStates.some(value=>value==='configured'
      ?configCountForGpu(gpu.id)>0:value==='verified'?recordsForGpu(gpu.id).length>0:false));
}
```

- [x] **Step 4: Run static syntax verification**

Run: `node tools/verify-compatibility-webview-demo.mjs`

Expected: JavaScript syntax passes; UI marker checks may still fail until Task 3.

### Task 3: Build one high-fidelity filter component for both orientations

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [x] **Step 1: Render mode-specific filter groups**

```js
function filterGroups(){
  return state.mode==='game'?[{
    key:'gpuIds',label:'GPU 型号',options:state.gpus.map(g=>({value:g.id,label:g.name}))
  },{
    key:'statuses',label:'运行表现',disabled:!activeGameGpuIds().length,
    options:Object.entries(statusMap).map(([value,item])=>({value,label:item.label}))
  },{
    key:'stores',label:'游戏平台',options:[...new Set(state.games.map(g=>g.store))].map(value=>({value,label:value}))
  },{
    key:'configStates',label:'配置状态',options:[{value:'has',label:'有可用配置'},{value:'none',label:'暂无配置'}]
  }]:[{
    key:'vendors',label:'GPU 厂商',options:[...new Set(state.gpus.map(g=>g.vendor))].map(value=>({value,label:value}))
  },{
    key:'families',label:'GPU 系列',options:[{value:'Adreno',label:'Adreno'},{value:'Mali',label:'Mali'}]
  },{
    key:'tiers',label:'性能档位',options:[{value:'flagship',label:'旗舰'},{value:'high',label:'高端'},{value:'mainstream',label:'主流'}]
  },{
    key:'verifiedStates',label:'验证状态',options:[{value:'configured',label:'有可用配置'},{value:'verified',label:'已有验证记录'}]
  }];
}
```

- [x] **Step 2: Render responsive filter structures**

Portrait renders a right-side drawer with vertically stacked groups, three-column options, and fixed `重置` / `确定（X 项）` actions. Landscape renders the category rail and option flyout. Both use `data-filter-group` and `data-filter-option` and share one filter state.

- [x] **Step 3: Add responsive CSS**

```css
.filter-shell{display:none}
@container phone (min-width:700px){
  .catalog-layout{display:grid;grid-template-columns:142px minmax(0,1fr);gap:14px}
  .filter-shell{display:block;position:relative}
  .filter-sidebar{position:sticky;top:0;background:#202122;border-radius:10px}
  .filter-panel{position:absolute;left:142px;top:0;width:250px;z-index:8}
  .filter-trigger{display:none}
}
@container phone (max-width:699px){
  .filter-trigger{display:flex}
  .filter-layer{position:absolute;inset:0;z-index:20;display:grid;grid-template-columns:108px minmax(0,1fr)}
  .filter-layer[hidden]{display:none}
  .filter-footer{position:absolute;left:0;right:0;bottom:0}
}
```

- [x] **Step 4: Add event handling**

Clicking a group changes `filterGroup`. Clicking an option toggles only the active mode's array. `清空` resets only the active mode. Closing the portrait layer keeps the filters. Switching mode restores that mode's `filterGroup` and selections.

- [x] **Step 5: Run portrait and landscape browser tests**

Run: `node tools/capture-compatibility-webview-demo.mjs`

Expected: portrait layer opens and filters results; landscape category rail remains visible; rotating preserves selections.

### Task 4: Make configuration detail strictly read-only

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Modify: `tools/capture-compatibility-webview-demo.mjs`

- [x] **Step 1: Remove detail actions**

`renderConfig()` must not render `.config-footer`, `[data-apply-config]`, `actionLabel()`, `actionClass()`, or mismatch action copy. It continues to render environment, result, settings, instructions, known issues, and full parameters.

- [x] **Step 2: Move action tests to the configuration list**

```js
if (await page.locator('#config-view [data-apply-config]').count() !== 0) errors.push('config detail is not read-only');
await page.locator('.view.active [data-back]').click();
await page.locator('[data-apply-config="cfg_elden_830_stable"]').click();
```

Validate matched calls use `downloadAndApplyConfig`; mismatched calls use `downloadConfig`. Returning from detail must preserve the selected game and GPU.

- [x] **Step 3: Run the browser test**

Run: `node tools/capture-compatibility-webview-demo.mjs`

Expected: detail is read-only and both list actions still pass request binding, stale callback, timeout, and mismatch safety checks.

### Task 5: Final visual and regression verification

**Files:**
- Modify: `tools/capture-compatibility-webview-demo.mjs`
- Verify: `test-results/compatibility-library-v2/*.png`

- [x] **Step 1: Capture six final states**

Capture game catalog portrait, portrait filter layer, filtered game result, read-only config detail, mismatched config detail, and landscape GPU catalog with persistent filters.

- [x] **Step 2: Run all checks**

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs
```

Expected: both scripts print `PASS`; diff check prints nothing.

- [x] **Step 3: Review screenshots**

Verify 390×844 and 874×402 have no horizontal overflow; portrait footer stays visible; landscape flyout does not permanently shrink the result grid; selected counts and disabled status filter are legible.

- [x] **Step 4: Commit only task files**

```powershell
git add -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs docs/superpowers/plans/2026-08-06-gamehub-compatibility-responsive-filters.md
git commit -m "feat: add responsive compatibility filters"
```
