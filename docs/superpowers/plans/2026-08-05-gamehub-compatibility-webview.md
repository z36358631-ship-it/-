# GameHub Compatibility WebView Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline, single-file WebView demo that helps a novice discover games suitable for the current device, search a target game, apply a verified plan, and troubleshoot launch failures.

**Architecture:** One HTML file owns presentation, mock domain data, rendering, responsive layout, and the public WebView adapter. A small Node verifier checks required states, API names, offline constraints, and script syntax; the demo and future real data both enter through `window.GameHubCompatibility`.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, inline SVG, Node.js built-ins.

---

## File map

- Create `demos/适合本机/盖世游戏适合本机WebView-demo.html`: complete offline interactive demo.
- Create `tools/verify-compatibility-webview-demo.mjs`: static contract and JavaScript syntax checks.
- Create `tools/capture-compatibility-webview-demo.mjs`: browser screenshots and interaction/recovery checks.
- Modify `docs/superpowers/plans/2026-08-05-gamehub-compatibility-webview.md`: mark completed execution steps.

### Task 1: Lock the demo contract with a failing verifier

**Files:**
- Create: `tools/verify-compatibility-webview-demo.mjs`
- Test: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [x] **Step 1: Create the verifier**

The script reads the demo as UTF-8 and asserts these exact contracts:

```js
const required = [
  'id="device-card"', 'id="game-grid"', 'id="detail-view"',
  'id="troubleshooting"', 'window.GameHubCompatibility',
  'setContext(context)', 'setGames(games)', 'openGame(gameId)',
  'applyPlanAndLaunch', 'applyPlanAndDownload', 'openGameDetail'
];
```

It also rejects `<script src>`, `<link href>`, `http://`, `https://`, `iframe`, and scripts that fail `new Function(script)`.

- [x] **Step 2: Run the verifier and confirm failure**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: exits non-zero because the demo does not yet exist.

- [x] **Step 3: Commit the verifier**

```powershell
git add -- tools/verify-compatibility-webview-demo.mjs
git commit -m "test: define compatibility webview demo contract"
```

### Task 2: Build the responsive shell and standard data adapter

**Files:**
- Create: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [x] **Step 1: Add the HTML shell**

Create a single document with these top-level elements:

```html
<main class="app-shell" data-orientation="portrait">
  <section id="discovery-view" class="view is-active"></section>
  <section id="detail-view" class="view"></section>
</main>
```

Use GameHub tokens: black background, `#1a1a1a` cards, `#ffcc43` primary action, `#33d8a4` positive status, 8/12/16px radii, MiSans/PingFang system font stack.

- [x] **Step 2: Add the domain state and adapter**

Use one normalized state object:

```js
const state = {
  orientation: 'portrait',
  view: 'discovery',
  query: '',
  context: null,
  games: [],
  selectedGameId: null,
  expanded: { device: false, runs: false, reviews: false, config: false },
  issueKey: null,
  actionState: 'idle'
};
```

Expose `setContext`, `setGames`, `openGame`, and `setContextUnavailable` through `window.GameHubCompatibility`. Normalize injected raw records before rendering.

- [x] **Step 3: Add responsive rules**

At widths under 600px, use a two-column card grid and vertical detail. At widths of 600px and above, use at least four cards and a two-column detail layout. Add a demo-only portrait/landscape switch that changes the preview frame without creating a second data state.

- [x] **Step 4: Run the verifier**

Run `node tools/verify-compatibility-webview-demo.mjs`.

Expected: the file is found, JavaScript parses, and any missing feature contracts are listed explicitly.

### Task 3: Implement discovery and search

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [x] **Step 1: Render device context**

Render `loading`, `ready`, and `unavailable` separately. Only `ready` may render compatibility conclusions. The expanded device card shows model, GPU, Android, GameHub, and kernel versions.

- [x] **Step 2: Render default discovery**

Filter to `direct` and `adjusted`, then sort by evidence level, valid users, and freshness. Each card contains cover art, store, conclusion, evidence level, FPS range, and valid-run count.

- [x] **Step 3: Implement search**

Search `name` and `aliases` case-insensitively. Search results include all four conclusions and distinguish stores. Clearing the query restores discovery.

- [x] **Step 4: Add empty and retry states**

Provide visible actions for no search result, context failure, and list loading failure without Toasts or new pages.

- [x] **Step 5: Run the verifier**

Run `node tools/verify-compatibility-webview-demo.mjs`.

Expected: PASS for offline and public API contracts.

### Task 4: Implement the game decision and action flow

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [x] **Step 1: Render conclusion and evidence independently**

Map result states to `可直接玩`, `调整后可玩`, `暂不建议`, `暂无结论`; map evidence to `当前设备已验证`, `同 GPU 设备已验证`, `同类设备参考`, `样本较少`.

- [x] **Step 2: Render the versioned plan**

Show applicable environment, expected result, plan version, verified users, 1–3 ordered steps, known issues, and a collapsible full configuration.

- [x] **Step 3: Resolve one primary action**

Use this resolver:

```js
if (game.result.status === 'not_recommended') return '查看其他可玩游戏';
if (game.result.status === 'unknown') return '查看已有记录';
if (game.installed) return '使用方案并启动';
if (game.owned) return '使用方案并下载';
return '查看游戏详情';
```

Call the matching `window.GameHubBridge` method when present; otherwise update the button inline to an observable demo result.

- [x] **Step 4: Render proof and reviews**

Show real-run summary and player reviews to every user. Keep details collapsible, but do not gate them by membership.

- [x] **Step 5: Verify all mock games**

Include direct, adjusted, not-recommended, and unknown games across Steam and Epic, with owned/installed combinations that exercise every primary action.

### Task 5: Implement launch-failure troubleshooting

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [x] **Step 1: Add five issue choices**

Render `无法启动`, `黑屏`, `闪退`, `手柄异常`, and `声音/画面问题` inside `#troubleshooting`.

- [x] **Step 2: Render plan-aware steps inline**

Selecting an issue replaces only the troubleshooting body and shows 1–3 ordered steps. Do not navigate to a fault center and do not use a modal or Toast.

- [x] **Step 3: Add fallback wording**

If the current game has no matched instructions, show generic checks plus `暂无针对当前设备的验证结果`.

- [x] **Step 4: Preserve issue state during orientation changes**

Re-render from `state.issueKey` and keep the selected issue highlighted.

### Task 6: Verify behavior and visual quality

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Modify: `tools/verify-compatibility-webview-demo.mjs`

- [x] **Step 1: Run static verification**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs
```

Expected: verifier prints all checks passed; diff check prints nothing.

- [x] **Step 2: Capture portrait and landscape screenshots**

Open the local HTML in a browser at 390×844 and 874×402. Capture default discovery, search results, adjusted-game detail, and troubleshooting states.

- [x] **Step 3: Review seven UI criteria**

Check color tokens, type hierarchy, radii, spacing, interaction feedback, realistic content, and exact phone frame sizes. Fix every issue that affects demonstration.

- [x] **Step 4: Run product, interaction, and engineering review**

Product checks requirement coverage; interaction checks core path and state feedback; engineering checks data adapter, Bridge fallback, and JavaScript errors. Fix every must-fix finding.

- [x] **Step 5: Commit the completed demo**

```powershell
git add -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs docs/superpowers/plans/2026-08-05-gamehub-compatibility-webview.md
git commit -m "feat: add GameHub compatibility webview demo"
```
