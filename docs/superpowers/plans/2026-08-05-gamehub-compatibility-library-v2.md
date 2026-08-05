# GameHub Compatibility Library V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing device-first demo into a public game/GPU compatibility library with viewable, downloadable, and directly applicable configuration packages.

**Architecture:** Keep one offline HTML artifact and replace the device-first state with a normalized catalog containing games, GPUs, compatibility records, and configuration packages. Four views—catalog, game, GPU, and config—share one router/state object and one App Bridge action state machine.

**Tech Stack:** HTML5, CSS container queries, vanilla JavaScript, inline SVG, Node.js built-ins, Playwright Core.

---

## File map

- Modify `demos/适合本机/盖世游戏适合本机WebView-demo.html`: rebuild the UI and interactions.
- Modify `tools/verify-compatibility-webview-demo.mjs`: replace the device-first contract with library/config contracts.
- Modify `tools/capture-compatibility-webview-demo.mjs`: verify game/GPU search, detail navigation, configuration view, download/apply and mismatch behavior.
- Modify `docs/superpowers/specs/2026-08-05-gamehub-compatibility-webview-design.md`: record the confirmed V2 product definition.

### Task 1: Replace the state and Adapter

- [x] **Step 1: Define catalog state**

```js
const state = {
  view: 'catalog', mode: 'game', query: '', family: 'all', localOnly: false,
  context: null, games: [], gpus: [], records: [], configs: [],
  selectedGameId: null, selectedGpuId: null, selectedConfigId: null,
  actionState: 'idle', actionMessage: '', actionConfigId: null, activeRequestId: null
};
```

- [x] **Step 2: Normalize all four object types**

Reject invalid enums, clamp numeric values, filter `null` list items, limit arrays, and accept only internal `coverKey` values. Records referencing missing games/GPUs and configs referencing missing records remain hidden.

- [x] **Step 3: Expose the catalog API**

```js
window.GameHubCompatibility = {
  setContext(context), setCatalog(catalog), setCatalogLoading(), setCatalogError(),
  openGame(gameId, gpuId), openGpu(gpuId), openConfig(configId), setActionResult(result)
};
```

### Task 2: Build the game/GPU catalog

- [x] **Step 1: Add “按游戏查 / 按 GPU 查” tabs**

The game tab searches game names and aliases. The GPU tab searches GPU names and supports `全部 / Adreno / Mali` family filters.

- [x] **Step 2: Keep current-device behavior optional**

`只看本机` defaults off. If context is unavailable, the catalog remains visible and the switch is hidden.

- [x] **Step 3: Render catalog cards**

Game cards show verified GPU and config counts. GPU cards show verified games, direct-play games, config counts, and an optional `本机` badge.

- [x] **Step 4: Separate loading, data-empty, and search-empty states**

Catalog loading/error includes reload. Search-empty includes clear search. An empty catalog explicitly says there is no compatibility data.

### Task 3: Build game and GPU detail views

- [x] **Step 1: Render game GPU summary**

Show evidence-derived recommended GPU and lowest verified GPU, then list all records with status, FPS, evidence, users, and config counts.

- [x] **Step 2: Select a GPU record inline**

Clicking a record updates `selectedGpuId` and renders its config packages without creating an intermediate route.

- [x] **Step 3: Render GPU detail**

Show GPU vendor, architecture, representative devices, totals, and verified game records. Clicking a game opens game detail with the GPU preselected.

### Task 4: Build config listing and config detail

- [x] **Step 1: Render config cards**

Each card shows applicable environment, result, verified users, update time, size and downloads, plus `查看配置` and a download action.

- [x] **Step 2: Render full configuration details**

Directly show environment, expected performance, settings, steps, known issues, solutions and complete parameters.

- [x] **Step 3: Implement the matched-device action**

For a matching GPU call:

```js
window.GameHubBridge?.downloadAndApplyConfig({ requestId, configId, gameId, gpuId });
```

Without a Bridge, simulate download then application and finish as `配置已应用`.

- [x] **Step 4: Implement the mismatched-device action**

Call `downloadConfig({ requestId, configId, gameId, gpuId })` and finish as `已保存到配置库`. Never call the apply method. Show the current/target GPU mismatch next to the action.

- [x] **Step 5: Implement callback, failure and timeout states**

Promise Bridge resolves normally; a synchronous Bridge waits for `setActionResult`; no callback becomes `操作超时，点击重试` after 8 seconds. Accept a result only when its `requestId + configId` matches the active request.

### Task 5: Verify V2

- [x] **Step 1: Replace static contracts**

The verifier requires catalog tabs, game/GPU/config view IDs, catalog API, download/apply Bridge names, all statuses, and offline constraints.

- [x] **Step 2: Capture six representative states**

Capture game catalog, GPU catalog, game detail, matching config detail, mismatched config detail, and landscape GPU detail.

- [x] **Step 3: Exercise recovery and safety paths**

Test invalid catalog data, search state during orientation changes, catalog error/reload, stale selections, matching apply, mismatch download-only, native callback failure and local fallback.

- [x] **Step 4: Run final checks**

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs
```

Expected: both scripts print `PASS`; diff check prints nothing.
