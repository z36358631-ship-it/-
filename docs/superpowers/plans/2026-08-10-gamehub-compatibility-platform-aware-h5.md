# GameHub Platform-Aware Compatibility H5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild GUANWANGGAID-4 as one high-fidelity responsive H5 that automatically isolates Android and Mac content, supports image-and-text game search, and lets users inspect and download platform-specific launch configurations.

**Architecture:** Keep the established offline Demo shape: one HTML entry point plus local cover assets. A PlatformContext resolves Bridge > query > Demo default, a normalized catalog filters every game, compatibility record, and configuration by platform, and one render pipeline serves portrait WebView and desktop layouts. DownloadController routes mutually exclusively to a local Blob download on the web or GameHubBridge.downloadConfig in App WebView.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, local JPEG assets, Blob downloads, App WebView Bridge, Node.js built-ins, Playwright Core, taskctl CLI.

---

## Scope and file map

This is one testable subsystem and does not require a new backend or a second H5.

- Modify demos/适合本机/盖世游戏适合本机WebView-demo.html: platform context, catalog, high-fidelity responsive UI, image-and-text search, compatibility result, inline configuration detail, and download state machine.
- Reuse demos/适合本机/assets/compatibility/*.jpg: six existing local game covers; do not add runtime network assets.
- Modify tools/verify-compatibility-webview-demo.mjs: replace the old three-filter/no-config contract with the platform/search/config/download contract.
- Replace tools/capture-compatibility-webview-demo.mjs: verify platform priority, cross-platform isolation, search, inline details, Web download, App Bridge results, recovery, responsiveness, and screenshots.
- Create test-results/compatibility-platform-aware-h5/*.png: seven current-review screenshots.
- Use docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md as the accepted design source.
- Create .tmp/GUANWANGGAID-4-platform-aware-delivery.json only for Delivery submission; do not commit it.

## Data and interface contract

The HTML must expose this public API:

~~~js
window.GameHubCompatibility = {
  setContext(context),
  setCatalog(catalog),
  setCatalogLoading(),
  setCatalogError(),
  onDownloadResult(result)
};
~~~

The App download call is:

~~~js
window.GameHubBridge.downloadConfig(JSON.stringify({
  requestId,
  platform,
  gameId,
  configId,
  fileName
}));
~~~

The callback accepts:

~~~js
window.GameHubCompatibility.onDownloadResult({
  requestId,
  ok: true,
  message: "配置已开始下载"
});
~~~

## Task 1: Replace the static contract with a failing platform-aware specification

**Files:**

- Modify: tools/verify-compatibility-webview-demo.mjs
- Test: demos/适合本机/盖世游戏适合本机WebView-demo.html

- [ ] **Step 1: Replace required and legacy markers**

Replace the current required and legacy arrays with:

~~~js
const required = [
  'id="compatibility-app"',
  'id="game-search"',
  'data-platform-badge',
  'data-demo-platform="android"',
  'data-demo-platform="mac"',
  'data-popular-game',
  'data-search-result',
  'data-compatibility-result',
  'data-config-toggle',
  'data-config-download',
  'window.GameHubCompatibility',
  'setContext(context)',
  'setCatalog(catalog)',
  'setCatalogLoading()',
  'setCatalogError()',
  'onDownloadResult(result)',
  'resolvePlatform(context)',
  'filteredCatalog()',
  'renderSearchPanel()',
  'renderCompatibilityResult()',
  'renderConfigDetail(',
  'startDownload(configId)',
  'GameHubBridge.downloadConfig',
  'URL.createObjectURL',
  'Android',
  'Mac',
  '搜索游戏名称',
  '启动配置',
  '下载配置'
];

const legacy = [
  'id="game-select"',
  'id="target-select"',
  'id="rating-select"',
  '最低评价（可选）',
  'data-sort-field="rating"',
  'data-sort-field="verifiedAt"',
  'downloadAndApplyConfig',
  '下载并应用',
  'openGame(gameId',
  'openGpu(gpuId'
];
~~~

Keep the six existing cover checks and the external script, external stylesheet, iframe, network URL, and inline JavaScript syntax checks.

- [ ] **Step 2: Add platform isolation source checks**

After the legacy loop, add:

~~~js
const platformContracts = [
  'platform: "android"',
  'platform: "mac"',
  'platformSource',
  'Bridge > query > Demo',
  'androidVersion',
  'macosVersion',
  'appleChip',
  'mobileGpu'
];

for (const contract of platformContracts) {
  if (!html.includes(contract)) fail(`missing platform contract: ${contract}`);
}
~~~

Change the success output to:

~~~js
console.log('PASS: platform-aware compatibility H5 contracts, local assets, download API, offline policy, and JavaScript syntax');
~~~

- [ ] **Step 3: Run the static verifier and confirm red**

Run:

~~~powershell
node tools/verify-compatibility-webview-demo.mjs
~~~

Expected: exit code 1 with missing contract messages for id="game-search", data-platform-badge, and startDownload(configId).

- [ ] **Step 4: Commit only the failing contract**

~~~powershell
git add -- tools/verify-compatibility-webview-demo.mjs
git diff --cached --check
git commit -m "test: define platform-aware compatibility H5 contract"
~~~

## Task 2: Build the normalized platform catalog and deterministic context

**Files:**

- Modify: demos/适合本机/盖世游戏适合本机WebView-demo.html
- Test: tools/verify-compatibility-webview-demo.mjs

- [ ] **Step 1: Replace the old state with the platform-aware state**

Use this exact state shape:

~~~js
const PLATFORM_PRIORITY = "Bridge > query > Demo";
const DOWNLOAD_TIMEOUT_MS = 3000;
const state = {
  platform: "android",
  platformSource: "demo",
  gameQuery: "",
  selectedGameId: null,
  expandedConfigId: null,
  catalogStatus: "ready",
  download: {
    requestId: null,
    configId: null,
    status: "idle",
    message: ""
  }
};

function clearDownloadState() {
  state.download = {
    requestId: null,
    configId: null,
    status: "idle",
    message: ""
  };
}
~~~

- [ ] **Step 2: Replace targets/runs with one platform-tagged catalog**

The catalog must contain these exact, valid objects for both platforms:

~~~js
const mockCatalog = {
  games: [
    {
      id: "steam_1245620",
      name: "艾尔登法环",
      englishName: "ELDEN RING",
      aliases: ["老头环"],
      coverKey: "elden-ring.jpg",
      platforms: ["android", "mac"],
      popularOn: ["android", "mac"]
    },
    {
      id: "steam_2358720",
      name: "黑神话：悟空",
      englishName: "Black Myth: Wukong",
      aliases: ["黑神话"],
      coverKey: "black-myth-wukong.jpg",
      platforms: ["android"],
      popularOn: ["android"]
    },
    {
      id: "steam_1145360",
      name: "哈迪斯",
      englishName: "Hades",
      aliases: ["HADES"],
      coverKey: "hades.jpg",
      platforms: ["android", "mac"],
      popularOn: ["android", "mac"]
    },
    {
      id: "steam_1091500",
      name: "赛博朋克 2077",
      englishName: "Cyberpunk 2077",
      aliases: ["2077"],
      coverKey: "cyberpunk-2077.jpg",
      platforms: ["android", "mac"],
      popularOn: ["mac"]
    },
    {
      id: "steam_814380",
      name: "只狼：影逝二度",
      englishName: "Sekiro",
      aliases: ["只狼"],
      coverKey: "sekiro.jpg",
      platforms: ["android"],
      popularOn: ["android"]
    },
    {
      id: "steam_1716740",
      name: "星空",
      englishName: "Starfield",
      aliases: ["STARFIELD"],
      coverKey: "starfield.jpg",
      platforms: ["mac"],
      popularOn: ["mac"]
    }
  ],
  records: [
    {
      id: "android_elden",
      platform: "android",
      gameId: "steam_1245620",
      verdict: "调优后流畅",
      rating: 4,
      avgFps: 38,
      verifiedAt: "2026-08-08",
      tags: ["基本流畅", "偶发卡顿"],
      environment: {
        deviceModel: "一加 13",
        soc: "骁龙 8 至尊版",
        mobileGpu: "Adreno 830",
        androidVersion: "Android 15",
        appVersion: "盖世游戏 6.1.0",
        runtime: "Wine 9.2 · GS3"
      }
    },
    {
      id: "android_wukong",
      platform: "android",
      gameId: "steam_2358720",
      verdict: "可进入游戏",
      rating: 3,
      avgFps: 31,
      verifiedAt: "2026-08-07",
      tags: ["需降画质", "首启较慢"],
      environment: {
        deviceModel: "红魔 10 Pro",
        soc: "骁龙 8 至尊版",
        mobileGpu: "Adreno 830",
        androidVersion: "Android 15",
        appVersion: "盖世游戏 6.1.0",
        runtime: "Wine 9.2 · GS3"
      }
    },
    {
      id: "mac_elden",
      platform: "mac",
      gameId: "steam_1245620",
      verdict: "稳定运行",
      rating: 4,
      avgFps: 52,
      verifiedAt: "2026-08-09",
      tags: ["1080P", "中画质"],
      environment: {
        macModel: "MacBook Pro",
        appleChip: "Apple M4 Pro",
        macosVersion: "macOS 26",
        appVersion: "盖世游戏 Mac 2.3.0",
        compatibilityLayer: "Game Porting Toolkit 2",
        displayMode: "1920 × 1080"
      }
    },
    {
      id: "mac_hades",
      platform: "mac",
      gameId: "steam_1145360",
      verdict: "原生级流畅",
      rating: 5,
      avgFps: 60,
      verifiedAt: "2026-08-09",
      tags: ["稳定 60 FPS", "低功耗"],
      environment: {
        macModel: "Mac mini",
        appleChip: "Apple M4",
        macosVersion: "macOS 26",
        appVersion: "盖世游戏 Mac 2.3.0",
        compatibilityLayer: "Game Porting Toolkit 2",
        displayMode: "2560 × 1440"
      }
    }
  ],
  configs: [
    {
      id: "cfg_android_elden",
      platform: "android",
      gameId: "steam_1245620",
      name: "720P 稳定方案",
      version: "2.1",
      fileName: "elden-ring-android-720p.gamehub.json",
      fileSize: "18 KB",
      downloadCount: 1280,
      updatedAt: "2026-08-08",
      summary: "Adreno 830 · 35～45 FPS",
      fields: [
        ["分辨率", "1280 × 720"],
        ["画质", "中"],
        ["运行环境", "Wine 9.2 · GS3"],
        ["光线追踪", "关闭"]
      ]
    },
    {
      id: "cfg_android_wukong",
      platform: "android",
      gameId: "steam_2358720",
      name: "低画质启动方案",
      version: "1.3",
      fileName: "wukong-android-low.gamehub.json",
      fileSize: "16 KB",
      downloadCount: 864,
      updatedAt: "2026-08-07",
      summary: "Adreno 830 · 28～35 FPS",
      fields: [
        ["分辨率", "1280 × 720"],
        ["画质", "低"],
        ["运行环境", "Wine 9.2 · GS3"],
        ["帧率上限", "30 FPS"]
      ]
    },
    {
      id: "cfg_mac_elden",
      platform: "mac",
      gameId: "steam_1245620",
      name: "M4 Pro 1080P 方案",
      version: "1.4",
      fileName: "elden-ring-mac-m4pro.gamehub.json",
      fileSize: "14 KB",
      downloadCount: 526,
      updatedAt: "2026-08-09",
      summary: "Apple M4 Pro · 45～60 FPS",
      fields: [
        ["显示模式", "1920 × 1080"],
        ["画质", "中"],
        ["兼容层", "Game Porting Toolkit 2"],
        ["帧率上限", "60 FPS"]
      ]
    },
    {
      id: "cfg_mac_hades",
      platform: "mac",
      gameId: "steam_1145360",
      name: "M4 高分辨率方案",
      version: "1.1",
      fileName: "hades-mac-m4.gamehub.json",
      fileSize: "12 KB",
      downloadCount: 342,
      updatedAt: "2026-08-09",
      summary: "Apple M4 · 稳定 60 FPS",
      fields: [
        ["显示模式", "2560 × 1440"],
        ["画质", "高"],
        ["兼容层", "Game Porting Toolkit 2"],
        ["垂直同步", "开启"]
      ]
    }
  ]
};
~~~

- [ ] **Step 3: Add normalization and platform resolution**

Add these functions before rendering:

~~~js
function normalizePlatform(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "android" || normalized === "mac" ? normalized : null;
}

function queryPlatform() {
  return normalizePlatform(new URLSearchParams(location.search).get("platform"));
}

function resolvePlatform(context) {
  const bridgePlatform = normalizePlatform(context && context.platform);
  if (bridgePlatform) return { platform: bridgePlatform, source: "bridge" };
  const queryValue = queryPlatform();
  if (queryValue) return { platform: queryValue, source: "query" };
  return { platform: "android", source: "demo" };
}

function applyPlatform(next, source) {
  if (next === state.platform && source === state.platformSource) return;
  state.platform = next;
  state.platformSource = source;
  state.gameQuery = "";
  state.selectedGameId = null;
  state.expandedConfigId = null;
  clearDownloadState();
  render();
}

function filteredCatalog() {
  const games = catalog.games.filter((game) => game.platforms.includes(state.platform));
  const gameIds = new Set(games.map((game) => game.id));
  return {
    games,
    records: catalog.records.filter((record) => record.platform === state.platform && gameIds.has(record.gameId)),
    configs: catalog.configs.filter((config) => config.platform === state.platform && gameIds.has(config.gameId))
  };
}
~~~

On startup use:

~~~js
const initialPlatform = resolvePlatform(null);
state.platform = initialPlatform.platform;
state.platformSource = initialPlatform.source;
setCatalog(mockCatalog);
~~~

- [ ] **Step 4: Add catalog validation**

Use these helpers and the complete normalizer. Configuration URLs are intentionally not part of the normalized object:

~~~js
const allowedCovers = new Set([
  "black-myth-wukong.jpg",
  "elden-ring.jpg",
  "hades.jpg",
  "sekiro.jpg",
  "cyberpunk-2077.jpg",
  "starfield.jpg"
]);

function text(value, max = 100) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function esc(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizeCatalog(raw = {}) {
  const games = uniqueById((Array.isArray(raw.games) ? raw.games : []).map((item) => {
    if (!item || typeof item !== "object") return null;
    const id = text(item.id, 60);
    const name = text(item.name, 60);
    const platforms = [...new Set((Array.isArray(item.platforms) ? item.platforms : [])
      .map(normalizePlatform).filter(Boolean))];
    if (!id || !name || platforms.length === 0) return null;
    const coverKey = text(item.coverKey, 80);
    return {
      id,
      name,
      englishName: text(item.englishName, 80),
      aliases: (Array.isArray(item.aliases) ? item.aliases : []).map((value) => text(value, 50)).filter(Boolean),
      coverKey: allowedCovers.has(coverKey) ? coverKey : "",
      platforms,
      popularOn: (Array.isArray(item.popularOn) ? item.popularOn : [])
        .map(normalizePlatform).filter((platform) => platforms.includes(platform))
    };
  }).filter(Boolean));

  const gameIds = new Set(games.map((game) => game.id));
  const records = uniqueById((Array.isArray(raw.records) ? raw.records : []).map((item) => {
    if (!item || typeof item !== "object") return null;
    const platform = normalizePlatform(item.platform);
    const gameId = text(item.gameId, 60);
    if (!platform || !gameIds.has(gameId)) return null;
    const source = item.environment && typeof item.environment === "object" ? item.environment : {};
    const environment = platform === "android"
      ? {
          deviceModel: text(source.deviceModel),
          soc: text(source.soc),
          mobileGpu: text(source.mobileGpu),
          androidVersion: text(source.androidVersion),
          appVersion: text(source.appVersion),
          runtime: text(source.runtime)
        }
      : {
          macModel: text(source.macModel),
          appleChip: text(source.appleChip),
          macosVersion: text(source.macosVersion),
          appVersion: text(source.appVersion),
          compatibilityLayer: text(source.compatibilityLayer),
          displayMode: text(source.displayMode)
        };
    return {
      id: text(item.id, 60),
      platform,
      gameId,
      verdict: text(item.verdict, 40),
      rating: number(item.rating, 1, 5),
      avgFps: number(item.avgFps, 0, 240),
      verifiedAt: /^\d{4}-\d{2}-\d{2}$/.test(text(item.verifiedAt, 10)) ? text(item.verifiedAt, 10) : "未记录",
      tags: (Array.isArray(item.tags) ? item.tags : []).map((value) => text(value, 30)).filter(Boolean).slice(0, 4),
      environment
    };
  }).filter(Boolean));

  const configs = uniqueById((Array.isArray(raw.configs) ? raw.configs : []).map((item) => {
    if (!item || typeof item !== "object") return null;
    const platform = normalizePlatform(item.platform);
    const gameId = text(item.gameId, 60);
    if (!platform || !gameIds.has(gameId)) return null;
    const fields = (Array.isArray(item.fields) ? item.fields : [])
      .filter((pair) => Array.isArray(pair) && pair.length === 2)
      .map(([label, value]) => [text(label, 30), text(value, 80)])
      .filter(([label, value]) => label && value)
      .slice(0, 6);
    return {
      id: text(item.id, 60),
      platform,
      gameId,
      name: text(item.name, 60),
      version: text(item.version, 20),
      fileName: text(item.fileName, 100).replace(/[^a-zA-Z0-9._-]/g, "-"),
      fileSize: text(item.fileSize, 20),
      downloadCount: number(item.downloadCount, 0),
      updatedAt: text(item.updatedAt, 10),
      summary: text(item.summary, 80),
      fields
    };
  }).filter(Boolean));

  return { games, records, configs };
}

let catalog = normalizeCatalog(mockCatalog);

function setCatalog(raw) {
  catalog = normalizeCatalog(raw);
  state.catalogStatus = "ready";
  if (!filteredCatalog().games.some((game) => game.id === state.selectedGameId)) {
    state.selectedGameId = null;
    state.expandedConfigId = null;
    clearDownloadState();
  }
  render();
}
~~~

- [ ] **Step 5: Run the static verifier**

~~~powershell
node tools/verify-compatibility-webview-demo.mjs
~~~

Expected: it still fails because the new UI and download markers do not exist yet, while JavaScript remains syntactically valid.

## Task 3: Rebuild the high-fidelity portrait-first UI and search flow

**Files:**

- Modify: demos/适合本机/盖世游戏适合本机WebView-demo.html
- Test: tools/verify-compatibility-webview-demo.mjs

- [ ] **Step 1: Replace the workbench toolbar**

Keep desktop/mobile preview controls and add platform controls outside the H5 frame:

~~~html
<div class="demo-bar">
  <div class="demo-name">
    <span class="demo-mark">GH</span>
    <span>跨平台兼容性 · H5 Demo</span>
  </div>
  <div class="demo-toolbar">
    <div class="demo-controls" aria-label="预览平台">
      <button class="control active" data-demo-platform="android" type="button">Android</button>
      <button class="control" data-demo-platform="mac" type="button">Mac</button>
    </div>
    <div class="demo-controls" aria-label="预览尺寸">
      <button class="control" data-preview="desktop" type="button">网页</button>
      <button class="control active" data-preview="mobile" type="button">竖屏</button>
    </div>
  </div>
</div>
<div class="frame" data-preview="mobile">
  <main id="compatibility-app" class="app"></main>
</div>
~~~

- [ ] **Step 2: Apply the GameHub design tokens and portrait hierarchy**

Use the UI-spec tokens:

~~~css
:root {
  --bg-primary: #000000;
  --bg-card: #1a1a1a;
  --bg-elevated: #252525;
  --text-primary: #ffffff;
  --text-secondary: #e6e6e6;
  --text-muted: #7b7b7b;
  --brand-gold: #ffcc43;
  --brand-gold-light: #ffd98f;
  --brand-green: #33d8a4;
  --brand-blue: #338feb;
  --border-default: #353d4e;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 100px;
  --font-primary: "MiSans VF", "MiSans", "PingFang SC", sans-serif;
  --font-number: "D-DIN-PRO", "MiSans VF", sans-serif;
}

.frame[data-preview="mobile"] {
  width: 390px;
  height: 844px;
}

.page {
  width: min(100%, 1120px);
  min-height: 100%;
  margin: 0 auto;
  padding: 28px;
}

.frame[data-preview="mobile"] .page {
  padding: 16px 14px 32px;
}

button,
input {
  min-height: 44px;
  font: inherit;
}

.game-cover {
  width: 64px;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}
~~~

Use 32/20/16/14/12px type roles from the UI spec. Do not introduce purple/cyan branding, iframe, CDN, external script, or runtime URL.

- [ ] **Step 3: Implement the platform header and image-and-text search**

Add these render functions:

~~~js
function platformLabel() {
  return state.platform === "mac" ? "Mac" : "Android";
}

function coverUrl(game) {
  return game.coverKey
    ? "assets/compatibility/" + encodeURIComponent(game.coverKey)
    : "";
}

function matchingGames() {
  const { games } = filteredCatalog();
  const query = state.gameQuery.trim().toLowerCase();
  if (!query) return [];
  return games.filter((game) => {
    return [game.name, game.englishName, ...game.aliases]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }).slice(0, 6);
}

function renderSearchPanel() {
  const candidates = matchingGames();
  const candidateHtml = state.gameQuery
    ? '<div class="search-results">' + (candidates.length
      ? candidates.map((game) => '<button class="search-result" data-search-result="' + esc(game.id) + '" type="button">' +
          '<img class="game-cover" src="' + esc(coverUrl(game)) + '" alt="">' +
          '<span><strong>' + esc(game.name) + '</strong><small>' + esc(game.englishName) + ' · ' + platformLabel() + '</small></span>' +
        '</button>').join("")
      : '<div class="empty-inline">没有找到当前平台可用的游戏</div>') + '</div>'
    : "";
  return '<section class="search-section">' +
    '<label class="search-box" for="game-search"><span aria-hidden="true">⌕</span>' +
      '<input id="game-search" autocomplete="off" placeholder="搜索游戏名称" value="' + esc(state.gameQuery) + '">' +
      (state.gameQuery ? '<button data-clear-search type="button" aria-label="清除搜索">×</button>' : '') +
    '</label>' + candidateHtml +
  '</section>';
}
~~~

- [ ] **Step 4: Implement platform-specific popular games**

~~~js
function renderPopularGames() {
  const games = filteredCatalog().games
    .filter((game) => game.popularOn.includes(state.platform))
    .slice(0, 4);
  return '<section class="popular-section">' +
    '<div class="section-heading"><div><h2>' + platformLabel() + ' 热门游戏</h2><p>查看已验证的运行表现与启动配置</p></div></div>' +
    '<div class="popular-grid">' +
      games.map((game) => '<button class="popular-game" data-popular-game="' + esc(game.id) + '" type="button">' +
        '<img src="' + esc(coverUrl(game)) + '" alt="">' +
        '<span><strong>' + esc(game.name) + '</strong><small>' + esc(game.englishName) + '</small></span>' +
      '</button>').join("") +
    '</div>' +
  '</section>';
}
~~~

- [ ] **Step 5: Implement compatibility result and inline config details**

~~~js
function renderEnvironment(record) {
  const environment = record.environment;
  const rows = state.platform === "android"
    ? [
        ["设备", environment.deviceModel],
        ["SoC / GPU", environment.soc + " · " + environment.mobileGpu],
        ["系统", environment.androidVersion],
        ["运行环境", environment.runtime],
        ["盖世版本", environment.appVersion]
      ]
    : [
        ["设备", environment.macModel + " · " + environment.appleChip],
        ["系统", environment.macosVersion],
        ["兼容层", environment.compatibilityLayer],
        ["显示模式", environment.displayMode],
        ["盖世版本", environment.appVersion]
      ];
  return rows.map(([label, value]) =>
    '<div class="metric-row"><span>' + esc(label) + '</span><strong>' + esc(value || "未记录") + '</strong></div>'
  ).join("");
}

function renderConfigDetail(config) {
  const download = state.download.configId === config.id ? state.download : null;
  return '<div class="config-detail" data-config-detail="' + esc(config.id) + '">' +
    '<div class="config-summary"><strong>' + esc(config.summary) + '</strong><span>v' + esc(config.version) + ' · ' + esc(config.fileSize) + '</span></div>' +
    '<div class="config-fields">' +
      config.fields.map(([label, value]) => '<div><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>').join("") +
    '</div>' +
    '<div class="config-meta">更新于 ' + esc(config.updatedAt) + ' · ' + number(config.downloadCount) + ' 次下载</div>' +
    '<button class="download-button" data-config-download="' + esc(config.id) + '" type="button"' +
      (download && download.status === "pending" ? ' disabled' : '') + '>' +
      (download && download.status === "pending" ? "正在下载…" : "下载配置") +
    '</button>' +
    (download && download.message ? '<p class="download-message ' + esc(download.status) + '" role="status">' + esc(download.message) + '</p>' : '') +
  '</div>';
}

function renderCompatibilityResult() {
  const { games, records, configs } = filteredCatalog();
  const game = games.find((item) => item.id === state.selectedGameId);
  if (!game) return renderPopularGames();
  const record = records.find((item) => item.gameId === game.id);
  const gameConfigs = configs.filter((item) => item.gameId === game.id);
  return '<section class="compatibility-result" data-compatibility-result="' + esc(game.id) + '">' +
    '<button class="result-back" data-result-back type="button">← 返回' + platformLabel() + '游戏</button>' +
    '<div class="result-hero"><img src="' + esc(coverUrl(game)) + '" alt=""><div><span class="platform-badge">' + platformLabel() + '</span><h2>' + esc(game.name) + '</h2><p>' + esc(game.englishName) + '</p></div></div>' +
    (record
      ? '<div class="verdict-card"><div><span>兼容结论</span><strong>' + esc(record.verdict) + '</strong></div><div class="fps"><strong>' + number(record.avgFps) + '</strong><span>FPS</span></div></div>' +
        '<div class="environment-card">' + renderEnvironment(record) + '</div>'
      : '<div class="state-card"><h3>暂无验证记录</h3><p>当前平台还没有可靠的运行数据。</p></div>') +
    '<div class="config-section"><div class="section-heading"><div><h2>启动配置</h2><p>查看适用环境后再下载</p></div></div>' +
      (gameConfigs.length
        ? gameConfigs.map((config) => '<article class="config-card">' +
            '<button data-config-toggle="' + esc(config.id) + '" type="button"><span><strong>' + esc(config.name) + '</strong><small>' + esc(config.summary) + '</small></span><span>' + (state.expandedConfigId === config.id ? "收起" : "查看") + '</span></button>' +
            (state.expandedConfigId === config.id ? renderConfigDetail(config) : '') +
          '</article>').join("")
        : '<div class="state-card"><h3>暂无可下载配置</h3><p>当前平台未提供已验证配置。</p></div>') +
    '</div>' +
  '</section>';
}
~~~

- [ ] **Step 6: Use one render pipeline**

~~~js
function render() {
  let content = "";
  if (state.catalogStatus === "loading") {
    content = renderState("正在加载兼容数据", "正在获取游戏、兼容记录和配置。", "");
  } else if (state.catalogStatus === "error") {
    content = renderState("兼容数据加载失败", "暂时无法获取数据，请重试。", "reload");
  } else if (state.selectedGameId) {
    content = renderCompatibilityResult();
  } else {
    content = renderSearchPanel() + renderPopularGames();
  }
  document.getElementById("compatibility-app").innerHTML =
    '<div class="page"><header class="page-header">' +
      '<button class="back-button" data-back type="button">← 返回</button>' +
      '<span class="platform-pill" data-platform-badge>' + platformLabel() + '</span>' +
      '<h1>游戏兼容性</h1><p>查看当前平台的运行表现与启动配置</p>' +
    '</header>' + content + '</div>';
  document.querySelectorAll("[data-demo-platform]").forEach((button) => {
    button.classList.toggle("active", button.dataset.demoPlatform === state.platform);
    button.disabled = state.platformSource === "bridge";
  });
}

function renderState(title, copy, action) {
  return '<section class="state-card"><h2>' + esc(title) + '</h2><p>' + esc(copy) + '</p>' +
    (action ? '<button data-state-action="' + esc(action) + '" type="button">重新加载</button>' : '') +
  '</section>';
}
~~~

- [ ] **Step 7: Add event handling without extra dialogs**

Use these exact handlers:

~~~js
document.addEventListener("input", (event) => {
  if (event.target.id !== "game-search") return;
  state.gameQuery = event.target.value;
  render();
  const input = document.getElementById("game-search");
  if (input) {
    input.focus();
    input.setSelectionRange(state.gameQuery.length, state.gameQuery.length);
  }
});

document.addEventListener("click", (event) => {
  const preview = event.target.closest(".demo-controls [data-preview]");
  if (preview) {
    document.querySelector(".frame").dataset.preview = preview.dataset.preview;
    document.querySelectorAll("[data-preview]").forEach((button) => {
      button.classList.toggle("active", button === preview);
    });
    return;
  }

  const demoPlatform = event.target.closest("[data-demo-platform]");
  if (demoPlatform) {
    if (state.platformSource !== "bridge") {
      applyPlatform(normalizePlatform(demoPlatform.dataset.demoPlatform), "demo");
    }
    document.querySelectorAll("[data-demo-platform]").forEach((button) => {
      button.classList.toggle("active", button.dataset.demoPlatform === state.platform);
      button.disabled = state.platformSource === "bridge";
    });
    return;
  }

  const selected = event.target.closest("[data-popular-game], [data-search-result]");
  if (selected) {
    state.selectedGameId = selected.dataset.popularGame || selected.dataset.searchResult;
    state.gameQuery = "";
    state.expandedConfigId = null;
    clearDownloadState();
    render();
    return;
  }

  if (event.target.closest("[data-clear-search]")) {
    state.gameQuery = "";
    render();
    return;
  }

  if (event.target.closest("[data-result-back]")) {
    state.selectedGameId = null;
    state.expandedConfigId = null;
    clearDownloadState();
    render();
    return;
  }

  const configToggle = event.target.closest("[data-config-toggle]");
  if (configToggle) {
    const configId = configToggle.dataset.configToggle;
    state.expandedConfigId = state.expandedConfigId === configId ? null : configId;
    clearDownloadState();
    render();
    return;
  }

  const configDownload = event.target.closest("[data-config-download]");
  if (configDownload) {
    startDownload(configDownload.dataset.configDownload);
    return;
  }

  const stateAction = event.target.closest("[data-state-action]");
  if (stateAction && stateAction.dataset.stateAction === "reload") {
    state.catalogStatus = "loading";
    render();
    window.setTimeout(() => setCatalog(mockCatalog), 400);
  }
});
~~~

- [ ] **Step 8: Run the static verifier**

~~~powershell
node tools/verify-compatibility-webview-demo.mjs
~~~

Expected: PASS for platform-aware contracts, local assets, download API, offline policy, and JavaScript syntax after Task 4 adds the download controller.

## Task 4: Add mutually exclusive Web and App download paths

**Files:**

- Modify: demos/适合本机/盖世游戏适合本机WebView-demo.html
- Test: tools/verify-compatibility-webview-demo.mjs

- [ ] **Step 1: Replace the initial download-state helper with timer-aware helpers**

~~~js
let downloadTimer = 0;

function clearDownloadTimer() {
  if (downloadTimer) window.clearTimeout(downloadTimer);
  downloadTimer = 0;
}

function clearDownloadState() {
  clearDownloadTimer();
  state.download = {
    requestId: null,
    configId: null,
    status: "idle",
    message: ""
  };
}

function setDownloadResult(requestId, ok, message) {
  if (!requestId || requestId !== state.download.requestId) return false;
  clearDownloadTimer();
  state.download.status = ok ? "success" : "error";
  state.download.message = text(message) || (ok ? "配置已开始下载" : "下载失败，请重试");
  render();
  return true;
}
~~~

- [ ] **Step 2: Add the controlled Web Blob download**

~~~js
function webDownload(config, requestId) {
  const payload = {
    demo: true,
    platform: config.platform,
    gameId: config.gameId,
    configId: config.id,
    version: config.version,
    fields: Object.fromEntries(config.fields)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = config.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setDownloadResult(requestId, true, "模拟配置已下载");
}
~~~

- [ ] **Step 3: Add App Bridge routing and request protection**

~~~js
function startDownload(configId) {
  if (state.download.status === "pending") return;
  const config = filteredCatalog().configs.find((item) => item.id === configId);
  if (!config || config.platform !== state.platform || config.gameId !== state.selectedGameId) {
    state.download = {
      requestId: "invalid",
      configId,
      status: "error",
      message: "配置与当前平台不一致，请重新选择"
    };
    render();
    return;
  }

  const requestId = "download-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  state.download = { requestId, configId, status: "pending", message: "正在准备配置…" };
  render();

  const bridge = window.GameHubBridge;
  if (!bridge || typeof bridge.downloadConfig !== "function") {
    if (state.platformSource === "bridge") {
      setDownloadResult(requestId, false, "App 连接不可用，请重试");
      return;
    }
    try {
      webDownload(config, requestId);
    } catch (error) {
      setDownloadResult(requestId, false, "浏览器未能下载配置，请重试");
    }
    return;
  }

  downloadTimer = window.setTimeout(() => {
    setDownloadResult(requestId, false, "App 响应超时，请重试");
  }, DOWNLOAD_TIMEOUT_MS);

  const payload = JSON.stringify({
    requestId,
    platform: state.platform,
    gameId: config.gameId,
    configId: config.id,
    fileName: config.fileName
  });

  try {
    const result = bridge.downloadConfig(payload);
    if (result && typeof result.then === "function") {
      result.then((value) => {
        if (value && typeof value === "object") {
          setDownloadResult(requestId, value.ok !== false, value.message);
        }
      }).catch(() => setDownloadResult(requestId, false, "App 下载失败，请重试"));
    } else if (result && typeof result === "object") {
      setDownloadResult(requestId, result.ok !== false, result.message);
    }
  } catch (error) {
    setDownloadResult(requestId, false, "App 连接不可用，请重试");
  }
}
~~~

- [ ] **Step 4: Replace the public API**

~~~js
window.GameHubCompatibility = {
  setContext(context) {
    const resolved = resolvePlatform(context);
    applyPlatform(resolved.platform, resolved.source);
  },
  setCatalog(nextCatalog) {
    setCatalog(nextCatalog);
  },
  setCatalogLoading() {
    state.catalogStatus = "loading";
    render();
  },
  setCatalogError() {
    state.catalogStatus = "error";
    render();
  },
  onDownloadResult(result) {
    if (!result || typeof result !== "object") return false;
    return setDownloadResult(text(result.requestId), result.ok === true, result.message);
  }
};
~~~

- [ ] **Step 5: Run and pass the static verifier**

~~~powershell
node tools/verify-compatibility-webview-demo.mjs
~~~

Expected:

~~~text
PASS: platform-aware compatibility H5 contracts, local assets, download API, offline policy, and JavaScript syntax
~~~

- [ ] **Step 6: Commit the complete H5**

~~~powershell
git add -- demos/适合本机/盖世游戏适合本机WebView-demo.html
git diff --cached --check
git commit -m "feat: build platform-aware compatibility H5"
~~~

## Task 5: Replace browser verification and capture current evidence

**Files:**

- Replace: tools/capture-compatibility-webview-demo.mjs
- Create: test-results/compatibility-platform-aware-h5/01-android-home-portrait.png
- Create: test-results/compatibility-platform-aware-h5/02-android-search-portrait.png
- Create: test-results/compatibility-platform-aware-h5/03-android-config-portrait.png
- Create: test-results/compatibility-platform-aware-h5/04-mac-home-portrait.png
- Create: test-results/compatibility-platform-aware-h5/05-mac-search-portrait.png
- Create: test-results/compatibility-platform-aware-h5/06-mac-config-portrait.png
- Create: test-results/compatibility-platform-aware-h5/07-desktop-web.png

- [ ] **Step 1: Replace the screenshot directory and names**

~~~js
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '适合本机', '盖世游戏适合本机WebView-demo.html');
const outputDir = path.join(root, 'test-results', 'compatibility-platform-aware-h5');
const screenshotNames = [
  '01-android-home-portrait.png',
  '02-android-search-portrait.png',
  '03-android-config-portrait.png',
  '04-mac-home-portrait.png',
  '05-mac-search-portrait.png',
  '06-mac-config-portrait.png',
  '07-desktop-web.png'
];
fs.mkdirSync(outputDir, { recursive: true });

const executablePath = [
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((candidate) => fs.existsSync(candidate));
if (!executablePath) throw new Error('No Chromium-compatible browser executable found');

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
const errors = [];
const externalRequests = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function observePage(targetPage) {
  targetPage.on('console', (message) => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });
  targetPage.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  targetPage.on('request', (request) => {
    if (!request.url().startsWith('file:') &&
        !request.url().startsWith('data:') &&
        !request.url().startsWith('blob:')) {
      externalRequests.push(request.url());
    }
  });
}

async function assertNoHorizontalOverflow(targetPage, label) {
  const dimensions = await targetPage.evaluate(() => {
    const frame = document.querySelector('.frame');
    const app = document.querySelector('#compatibility-app');
    return {
      frameClientWidth: frame.clientWidth,
      frameScrollWidth: frame.scrollWidth,
      appClientWidth: app.clientWidth,
      appScrollWidth: app.scrollWidth
    };
  });
  check(dimensions.frameScrollWidth <= dimensions.frameClientWidth, label + ' frame overflow');
  check(dimensions.appScrollWidth <= dimensions.appClientWidth, label + ' app overflow');
}

observePage(page);
~~~

- [ ] **Step 2: Verify Android default and image-and-text search**

~~~js
await page.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
const frame = page.locator('.frame');
await page.locator('[data-preview="mobile"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Android', 'Demo default is not Android');
check(await page.locator('[data-popular-game]').count() >= 3, 'Android popular games are incomplete');
check(await page.locator('[data-popular-game="steam_1716740"]').count() === 0, 'Mac-only Starfield leaked into Android');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[0]) });

await page.locator('#game-search').fill('艾尔登');
const androidCandidate = page.locator('[data-search-result="steam_1245620"]');
check(await androidCandidate.count() === 1, 'Android image-and-text candidate is missing');
check(await androidCandidate.locator('img').count() === 1, 'Search candidate has no cover');
check((await androidCandidate.innerText()).includes('ELDEN RING'), 'Search candidate has no English name');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[1]) });
await androidCandidate.click();
check((await page.locator('[data-compatibility-result]').innerText()).includes('Android 15'), 'Android version is missing');
check((await page.locator('[data-compatibility-result]').innerText()).includes('Adreno 830'), 'Android GPU is missing');
check(!(await page.locator('[data-compatibility-result]').innerText()).includes('macOS'), 'Mac fields leaked into Android result');
~~~

- [ ] **Step 3: Verify Android configuration and real Web download**

~~~js
await page.locator('[data-config-toggle="cfg_android_elden"]').click();
check(await page.locator('[data-config-detail="cfg_android_elden"]').isVisible(), 'Android config detail did not expand');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[2]) });
const downloadPromise = page.waitForEvent('download');
await page.locator('[data-config-download="cfg_android_elden"]').click();
const webDownload = await downloadPromise;
check(webDownload.suggestedFilename() === 'elden-ring-android-720p.gamehub.json', 'Web download filename is wrong');
check((await page.locator('.download-message').innerText()).includes('模拟配置已下载'), 'Web download success feedback is missing');
~~~

- [ ] **Step 4: Verify Bridge beats query and isolates Mac content**

Open a second page with ?platform=android, inject a Mac Bridge context, and assert Mac wins:

~~~js
const bridgePage = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
observePage(bridgePage);
await bridgePage.goto(pathToFileURL(demoPath).href + '?platform=android', { waitUntil: 'load' });
await bridgePage.evaluate(() => window.GameHubCompatibility.setContext({ platform: 'mac' }));
check(await bridgePage.locator('[data-platform-badge]').textContent() === 'Mac', 'Bridge did not override Android query');
check(await bridgePage.locator('[data-popular-game="steam_2358720"]').count() === 0, 'Android-only Wukong leaked into Mac');
await bridgePage.locator('[data-preview="mobile"]').click();
const bridgeFrame = bridgePage.locator('.frame');
await bridgeFrame.screenshot({ path: path.join(outputDir, screenshotNames[3]) });

await bridgePage.locator('#game-search').fill('艾尔登');
const macCandidate = bridgePage.locator('[data-search-result="steam_1245620"]');
check(await macCandidate.count() === 1, 'Mac image-and-text candidate is missing');
await bridgeFrame.screenshot({ path: path.join(outputDir, screenshotNames[4]) });
await macCandidate.click();
const macResultText = await bridgePage.locator('[data-compatibility-result]').innerText();
check(macResultText.includes('Apple M4 Pro'), 'Mac chip is missing');
check(macResultText.includes('macOS 26'), 'macOS version is missing');
check(!macResultText.includes('Android 15'), 'Android fields leaked into Mac result');
~~~

- [ ] **Step 5: Verify App Bridge success, duplicate protection, failure, and timeout**

Before clicking Mac download, inject:

~~~js
await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.GameHubBridge = {
    downloadConfig(payload) {
      window.__bridgeCalls.push(JSON.parse(payload));
      return Promise.resolve({ ok: true, message: 'App 已接收下载任务' });
    }
  };
});
await bridgePage.locator('[data-config-toggle="cfg_mac_elden"]').click();
await bridgeFrame.screenshot({ path: path.join(outputDir, screenshotNames[5]) });
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.locator('.download-message.success').waitFor();
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'App Bridge call count is not one');
check((await bridgePage.locator('.download-message').innerText()).includes('App 已接收下载任务'), 'App success feedback is missing');

await bridgePage.evaluate(() => {
  window.GameHubBridge.downloadConfig = () => {
    throw new Error('bridge unavailable');
  };
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
check((await bridgePage.locator('.download-message.error').innerText()).includes('App 连接不可用'), 'Bridge exception feedback is missing');

await bridgePage.evaluate(() => {
  window.GameHubBridge.downloadConfig = () => undefined;
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.waitForTimeout(3200);
check((await bridgePage.locator('.download-message.error').innerText()).includes('App 响应超时'), 'Bridge timeout feedback is missing');
~~~

Use this exact duplicate/late-callback test:

~~~js
await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.GameHubBridge.downloadConfig = (payload) => {
    window.__bridgeCalls.push(JSON.parse(payload));
    return undefined;
  };
});
await bridgePage.evaluate(() => {
  document.querySelector('[data-config-download="cfg_mac_elden"]').click();
  document.querySelector('[data-config-download="cfg_mac_elden"]').click();
});
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'Pending download was submitted twice');
const timedOutRequestId = await bridgePage.evaluate(() => window.__bridgeCalls[0].requestId);
await bridgePage.waitForTimeout(3200);
const timeoutText = await bridgePage.locator('.download-message.error').innerText();
check(timeoutText.includes('App 响应超时'), 'Pending download did not time out');
await bridgePage.evaluate((requestId) => {
  window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: true,
    message: '迟到成功'
  });
}, timedOutRequestId);
check((await bridgePage.locator('.download-message.error').innerText()) === timeoutText, 'Late callback overwrote timeout state');
~~~

- [ ] **Step 6: Verify query fallback, demo switching, malformed data, and desktop**

Use this exact query and malformed-data test:

~~~js
const queryPage = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
observePage(queryPage);
await queryPage.goto(pathToFileURL(demoPath).href + '?platform=mac', { waitUntil: 'load' });
check(await queryPage.locator('[data-platform-badge]').textContent() === 'Mac', 'Mac query fallback failed');
await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [
    {
      id: 'cross-game',
      name: '跨平台异常游戏',
      englishName: 'Cross Platform Invalid',
      aliases: [],
      coverKey: 'https://invalid.example/cover.jpg',
      platforms: ['mac'],
      popularOn: ['mac']
    }
  ],
  records: [
    {
      id: 'wrong-record',
      platform: 'android',
      gameId: 'cross-game',
      verdict: '错误串线',
      environment: { androidVersion: 'Android 15' }
    }
  ],
  configs: [
    {
      id: 'wrong-config',
      platform: 'android',
      gameId: 'cross-game',
      name: '错误配置',
      fileName: 'wrong.json',
      fields: []
    }
  ]
}));
await queryPage.locator('[data-popular-game="cross-game"]').click();
const malformedText = await queryPage.locator('[data-compatibility-result]').innerText();
check(malformedText.includes('暂无验证记录'), 'Cross-platform record was not rejected');
check(malformedText.includes('暂无可下载配置'), 'Cross-platform config was not rejected');
check(await queryPage.locator('[data-compatibility-result] img[src*="invalid.example"]').count() === 0, 'Unsafe cover URL survived normalization');

await page.locator('[data-result-back]').click();
await page.locator('[data-demo-platform="mac"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Mac', 'Demo platform did not switch to Mac');
check(await page.locator('[data-compatibility-result]').count() === 0, 'Platform switch kept the old game selection');
check(await page.locator('.download-message').count() === 0, 'Platform switch kept old download state');
await page.locator('[data-demo-platform="android"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Android', 'Demo platform did not switch back to Android');
~~~

Switch the original page to desktop:

~~~js
await page.locator('[data-result-back]').click();
await page.locator('[data-preview="desktop"]').click();
await page.waitForTimeout(300);
await assertNoHorizontalOverflow(page, 'desktop web');
await frame.screenshot({ path: path.join(outputDir, screenshotNames[6]) });
~~~

Close queryPage and bridgePage after all assertions:

~~~js
await queryPage.close();
await bridgePage.close();
~~~

- [ ] **Step 7: Assert evidence and offline behavior**

Use the exact closing assertions:

~~~js
check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
for (const screenshotName of screenshotNames) {
  const screenshotPath = path.join(outputDir, screenshotName);
  check(
    fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 0,
    screenshotName + ' was not created or is empty'
  );
}
await assertNoHorizontalOverflow(page, 'final desktop');
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
~~~

Success output:

~~~js
console.log('PASS: platform priority, Android/Mac isolation, image search, config details, Web/App downloads, recovery, responsive rendering, and seven screenshots');
~~~

- [ ] **Step 8: Run the browser verifier**

~~~powershell
node tools/capture-compatibility-webview-demo.mjs
~~~

Expected: PASS with seven screenshots.

- [ ] **Step 9: Commit the verifier and screenshots**

~~~powershell
git add -- tools/capture-compatibility-webview-demo.mjs test-results/compatibility-platform-aware-h5
git diff --cached --check
git commit -m "test: verify platform-aware compatibility H5"
~~~

## Task 5A: Apply final three-role review corrections

**Files:**

- Modify: demos/适合本机/盖世游戏适合本机WebView-demo.html
- Modify: tools/verify-compatibility-webview-demo.mjs
- Modify: tools/capture-compatibility-webview-demo.mjs

- [ ] **Step 1: Add explicit configuration applicability**

Every normalized configuration must contain applicability.gameVersion, applicability.hardware, and applicability.systemRange. Render them in data-config-applicability before tunable fields, using “适用 GPU” for Android and “适用芯片” for Mac.

~~~js
applicability: {
  gameVersion: text(sourceApplicability.gameVersion, 40) || "未记录",
  hardware: text(sourceApplicability.hardware, 60) || "未记录",
  systemRange: text(sourceApplicability.systemRange, 60) || "未记录"
}
~~~

- [ ] **Step 2: Reject internally cross-wired platform configurations**

Use containsCrossPlatformConfig(platform, values). Android configurations reject macOS, Apple hardware, Mac models, and Game Porting Toolkit; Mac configurations reject Android, Adreno, Snapdragon/骁龙, phone, and Wine tokens. Reject the whole configuration instead of hiding individual foreign fields.

~~~js
function containsCrossPlatformConfig(platform, values) {
  const joined = values.flat(Infinity).map((value) => text(value, 120)).join(" ");
  const forbidden = platform === "android"
    ? /macOS|Apple|MacBook|Mac mini|Mac Studio|Game Porting Toolkit/i
    : /Android|Adreno|骁龙|Snapdragon|手机|Wine/i;
  return forbidden.test(joined);
}
~~~

- [ ] **Step 3: Add the ready-but-empty catalog state**

When filteredCatalog().games.length is zero and catalogStatus is ready, render “当前 Android/Mac 暂无兼容数据” with data-state-action="reload". Keep this state distinct from loading, request failure, and search-no-result.

~~~js
} else if (filteredCatalog().games.length === 0) {
  content = renderState(
    "当前" + platformLabel() + "暂无兼容数据",
    "当前平台暂时没有可展示的游戏，请重新加载。",
    "reload"
  );
}
~~~

- [ ] **Step 4: Make Web download feedback conservative**

After anchor.click(), report “已发起下载，请查看浏览器下载列表；若未出现文件，请重试”. Do not claim the browser completed the download because policy blocking may be silent.

~~~js
setDownloadResult(
  requestId,
  true,
  "已发起下载，请查看浏览器下载列表；若未出现文件，请重试"
);
~~~

- [ ] **Step 5: Preserve the platform label in a real phone viewport**

Do not hide .candidate-platform below 420px. Add a 390×844 Playwright page that fills “艾尔登”, asserts the platform label remains visible, and checks horizontal overflow.

~~~js
const phonePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await phonePage.goto(pathToFileURL(demoPath).href, { waitUntil: "load" });
await phonePage.locator("#game-search").fill("艾尔登");
check(
  await phonePage.locator('[data-search-result="steam_1245620"] .candidate-platform').isVisible(),
  "Real 390px viewport hides the search platform label"
);
~~~

- [ ] **Step 6: Cover recovery and isolation regressions**

The browser verifier must inject a Mac configuration whose top-level platform is correct but whose summary/applicability/fields contain Android/Adreno/Wine values, then assert it is rejected. It must also verify empty-catalog reload, local-cover failure fallback, App path zero Blob calls, and duplicate/late callback rejection.

~~~js
check(await queryPage.locator("[data-config-toggle]").count() === 0, "Cross-wired Mac config survived");
check(await queryPage.locator('[data-state-action="reload"]').count() === 1, "Empty catalog cannot reload");
check(await bridgePage.evaluate(() => window.__blobCalls) === 0, "App path triggered a Blob download");
check(lateCallbackAccepted === false, "Late callback was accepted");
~~~

- [ ] **Step 7: Rerun both verifiers**

~~~powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
~~~

Expected: both commands print PASS; the capture command regenerates all seven screenshots.

## Task 6: Perform visual, accessibility, and regression review

**Files:**

- Verify: demos/适合本机/盖世游戏适合本机WebView-demo.html
- Verify: tools/verify-compatibility-webview-demo.mjs
- Verify: tools/capture-compatibility-webview-demo.mjs
- Verify: test-results/compatibility-platform-aware-h5/*.png

- [ ] **Step 1: Run both automated verifiers**

~~~powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
~~~

Expected: both commands print PASS and exit 0.

- [ ] **Step 2: Check task files for whitespace errors**

~~~powershell
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md
~~~

Expected: no output.

- [ ] **Step 3: Review all seven screenshots**

Open every current screenshot and verify:

- Android and Mac platform pills are immediately visible.
- Android screenshots contain Android/device/GPU content and no Apple/macOS content.
- Mac screenshots contain Apple/macOS/compatibility-layer content and no Android/mobile-GPU content.
- Search candidates show a sharp local cover plus Chinese and English names.
- 390×844 first screens show title, platform, full search field, and useful game content.
- Configuration details have readable grouping and a visible download action.
- Type sizes, spacing, card radii, black/gray/gold colors, and 44px touch targets follow the GameHub UI spec.
- No screenshot contains clipped text, horizontal overflow, overlapping controls, or browser error states.

- [ ] **Step 4: Run the three-role Demo review**

Use product, interaction, and development viewpoints:

- Product: every accepted requirement appears in a demonstrable state.
- Interaction: search → result → config detail → download is understandable without an extra dialog.
- Development: platform isolation, Bridge/download state, and test hooks have no contradictory paths.

Fix every must-fix issue and rerun Steps 1–3. Record optional suggestions only in Delivery attentionItems if they materially affect review.

- [ ] **Step 5: Confirm only task files changed**

~~~powershell
git -c core.quotepath=false status --short -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs test-results/compatibility-platform-aware-h5 docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md
~~~

Expected: no unstaged task-file changes after commits. Leave every unrelated dirty file untouched.

## Task 7: Create and submit the structured Taskboard Delivery

**Files:**

- Create temporary manifest: .tmp/GUANWANGGAID-4-platform-aware-delivery.json
- Register Demo: demos/适合本机
- Register Markdown: docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md
- Register seven images: test-results/compatibility-platform-aware-h5/*.png

- [ ] **Step 1: Write the ready manifest**

Create UTF-8 JSON with exactly:

~~~json
{
  "conclusion": "ready",
  "summaryItems": [
    "将兼容性页面重构为自动识别 Android 与 Mac 的单一高保真 H5",
    "完成带真实封面、中文名和英文名的图文游戏搜索",
    "按平台隔离热门游戏、兼容字段、运行记录和启动配置",
    "支持配置原位查看，以及浏览器与 App Bridge 两种下载路径",
    "补齐竖屏、桌面、异常恢复和跨平台防串线验证"
  ],
  "acceptanceSteps": [
    "打开可操作 Demo，在竖屏预览中分别切换 Android 和 Mac，确认页面内容随平台变化且不串线",
    "输入“艾尔登”，确认搜索候选同时显示封面、中文名、英文名和当前平台",
    "进入游戏结果，检查 Android 的设备与 GPU 字段、Mac 的 Apple 芯片与 macOS 字段",
    "展开启动配置并点击下载，确认浏览器下载与 App Bridge 成功、失败和超时反馈",
    "查看七张验收截图，确认 390×844 竖屏和桌面网页均无溢出或布局异常"
  ],
  "attentionItems": [
    "Demo 使用少量本地模拟游戏、兼容记录和配置，用于验证体验闭环，不代表正式全量目录",
    "浏览器下载的是明确标记的模拟配置；正式 App 下载需接入 GameHubBridge"
  ],
  "technicalDetails": "静态验证：node tools/verify-compatibility-webview-demo.mjs；交互与视觉验证：node tools/capture-compatibility-webview-demo.mjs。平台优先级固定为 Bridge > query > Demo，下载使用 requestId 防止重复和迟到回调，页面与全部封面离线运行且无外部请求。"
}
~~~

- [ ] **Step 2: Create the Delivery**

~~~powershell
$deliveryResponse = taskctl.cmd delivery create GUANWANGGAID-4 --manifest-file ".tmp\GUANWANGGAID-4-platform-aware-delivery.json" --json | ConvertFrom-Json
$deliveryId = $deliveryResponse.delivery.id
if ([string]::IsNullOrWhiteSpace($deliveryId)) { throw "Delivery ID missing" }
~~~

- [ ] **Step 3: Register the operable Demo**

~~~powershell
taskctl.cmd delivery artifact add $deliveryId --title "跨平台兼容性可操作 H5 Demo" --kind demo --path "demos/适合本机" --entry "盖世游戏适合本机WebView-demo.html" --content-type "text/html" --json
~~~

- [ ] **Step 4: Register the Markdown and every current screenshot**

~~~powershell
taskctl.cmd delivery artifact add $deliveryId --title "跨平台兼容性 H5 设计规格" --kind markdown --path "docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md" --content-type "text/markdown" --json
taskctl.cmd delivery artifact add $deliveryId --title "Android 竖屏首页" --kind image --path "test-results/compatibility-platform-aware-h5/01-android-home-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Android 图文搜索" --kind image --path "test-results/compatibility-platform-aware-h5/02-android-search-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Android 配置详情" --kind image --path "test-results/compatibility-platform-aware-h5/03-android-config-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 竖屏首页" --kind image --path "test-results/compatibility-platform-aware-h5/04-mac-home-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 图文搜索" --kind image --path "test-results/compatibility-platform-aware-h5/05-mac-search-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 配置详情" --kind image --path "test-results/compatibility-platform-aware-h5/06-mac-config-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "桌面网页响应式效果" --kind image --path "test-results/compatibility-platform-aware-h5/07-desktop-web.png" --content-type "image/png" --json
~~~

Every artifact command must succeed. Do not submit if any source is missing or cannot preview.

- [ ] **Step 5: Re-read the issue and submit with its latest version**

~~~powershell
$issueResponse = taskctl.cmd issue get 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json | ConvertFrom-Json
if ($issueResponse.task.identifier -ne "GUANWANGGAID-4") { throw "Unexpected issue" }
if ($issueResponse.task.status -ne "in_progress") { throw ("Unexpected issue status: " + $issueResponse.task.status) }
$latestVersion = [int]$issueResponse.task.version
taskctl.cmd delivery submit $deliveryId --if-version $latestVersion --json
~~~

Before submit, verify identifier is GUANWANGGAID-4 and status is still in_progress. On conflict or status change, stop and do not retry automatically.

Expected: Delivery enters submitted state and GUANWANGGAID-4 moves to in_review. Never call issue move --status in_review and never move the issue to done.
