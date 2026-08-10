# 盖世游戏跨平台兼容性 H5 多参数查询返工 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前“单游戏搜索 + 单个详情”H5 返工为 GameNative Compatibility 式的三参数即时查询页，支持 Android/Mac 专属硬件映射、多条运行记录、桌面表格、手机卡片及响应式配置详情。

**Architecture:** 保留现有离线单文件 H5 和本地封面资源。`PlatformContext` 先确定平台，`CatalogAdapter` 标准化游戏、硬件、运行记录和配置；三个 `SearchableSelect` 只更新统一筛选状态，`filterRecords()` 负责 AND 过滤和排序，`RecordResults` 将同一结果集合渲染为桌面表格或手机卡片，`ConfigViewer` 使用同一 DOM 在桌面变为弹窗、手机变为全屏浮层。现有 `DownloadController` 继续互斥路由 Web Blob 与 `GameHubBridge.downloadConfig`。

**Tech Stack:** 单文件 HTML/CSS/原生 JavaScript、Node.js、Playwright Core、`taskctl` Delivery CLI、Git

---

## Scope check

该规格是一个单一查询体验，不包含可独立发布的后台、登录、上传或配置应用子系统，无需拆成多个实施计划。现有 HTML 已采用单文件离线架构，本次不引入构建工具或框架，也不拆出运行时外链文件。

## File structure

- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
  - 唯一可操作 H5；负责目录 Mock、平台隔离、三筛选、多记录结果、配置浮层和下载。
- Modify: `tools/verify-compatibility-webview-demo.mjs`
  - 静态契约、本地资源、离线依赖和 JavaScript 语法验证。
- Modify: `tools/capture-compatibility-webview-demo.mjs`
  - Playwright 交互、平台隔离、筛选组合、浮层、下载、恢复和响应式验证。
- Replace evidence in: `test-results/compatibility-platform-aware-h5/`
  - 生成 8 张本轮可呈现验收截图；旧 7 张单游戏流程截图不再作为返工验收依据。
- Keep updated: `docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md`
  - 已确认的需求事实来源，不在实现阶段改变产品范围。
- Update only when execution deviations are required: `docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md`
  - 本计划；若实现接口必须调整，先同步计划再写代码。

## Selector contract

后续任务和测试统一使用以下 DOM 契约，不创建同义选择器：

```text
data-filter-select="game|hardware|rating"
data-filter-trigger="game|hardware|rating"
data-filter-query="game|hardware|rating"
data-filter-option="game|hardware|rating"
data-option-value="<catalog id or rating>"
data-filter-clear="game|hardware|rating"
data-clear-filters
data-result-count
data-record-row="<record id>"
data-record-table
data-record-cards
data-config-open="<record id>"
data-config-viewer
data-config-choice="<config id>"
data-config-detail="<config id>"
data-config-close
data-config-download="<config id>"
```

### Task 0: Reconfirm the scoped execution context

**Files:**
- Read only: Taskboard issue `4ade1ed5-07b1-474f-9f53-f8e6b8ba034b`
- Read only: repository status for the task files listed above

- [ ] **Step 1: Read the latest issue and all comments**

```powershell
taskctl.cmd issue get 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json
taskctl.cmd comment list 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json
```

Expected: identifier `GUANWANGGAID-4`, project `guanwang-gaidong`, status `in_progress`, and the latest comments contain no newer rework requirement than this plan. If status or requirements changed, stop before editing.

- [ ] **Step 2: Honor any newly bound development context**

Read `developmentContext` from the issue response. If it is a branch, switch to that branch; if it is a worktree, change the working directory to that exact worktree and verify its branch. If it is `null`, stay in `C:\Users\z3635\官网改动`. Do not create another context.

- [ ] **Step 3: Confirm the task files have no overlapping user edits**

```powershell
git status --short -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs" "tools/capture-compatibility-webview-demo.mjs" "docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md" "docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md" "test-results/compatibility-platform-aware-h5"
```

Expected: no uncommitted changes in these task paths. Ignore unrelated dirty-worktree files; do not stage, revert or commit them.

### Task 1: Define the catalog and filtering contract

**Files:**
- Modify: `tools/verify-compatibility-webview-demo.mjs`
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html:694-1227`

- [ ] **Step 1: Write the failing static data-contract test**

In `tools/verify-compatibility-webview-demo.mjs`, replace the old single-game data markers with these exact contracts:

```js
const dataContracts = [
  'hardware: [',
  'hardwareIds:',
  'filters: {',
  'gameId: null',
  'hardwareId: null',
  'ratingMin: null',
  'queries: {',
  'openFilter: null',
  'viewer: {',
  'recordId: null',
  'filterRecords()',
  'sortRecords(records)',
  '最低评分（≥）'
];

for (const contract of dataContracts) {
  if (!html.includes(contract)) fail(`missing data contract: ${contract}`);
}
```

Do not reject the old renderer in this task. It remains temporarily so the H5 is still operable while the new data layer is introduced; Task 3 removes it together with the replacement result renderer.

- [ ] **Step 2: Run the static test and verify the new contract fails**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: exit code `1` and at least `missing data contract: hardware: [`.

- [ ] **Step 3: Replace the single-game state with multi-filter state**

In the H5, extend the current `state` object with the new fields below. Temporarily keep `gameQuery`, `selectedGameId` and `expandedConfigId` until Task 3 removes the old renderer:

```js
const state = {
  platform: "android",
  platformSource: "demo",
  filters: {
    gameId: null,
    hardwareId: null,
    ratingMin: null
  },
  queries: {
    game: "",
    hardware: "",
    rating: ""
  },
  openFilter: null,
  sort: {
    field: "rating",
    direction: "desc"
  },
  viewer: {
    recordId: null,
    configId: null
  },
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

const ratingOptions = [
  { value: null, label: "全部" },
  { value: 5, label: "5 分及以上" },
  { value: 4, label: "4 分及以上" },
  { value: 3, label: "3 分及以上" },
  { value: 2, label: "2 分及以上" },
  { value: 1, label: "1 分及以上" }
];
```

- [ ] **Step 4: Add hardware references and duplicate-game records to the Mock catalog**

Add a top-level `hardware` array. Every record must reference both the concrete device/model and its GPU/chip so either type can filter the same run:

```js
hardware: [
  {
    id: "android_device_oneplus13",
    platform: "android",
    type: "device",
    displayName: "一加 13",
    aliases: ["OnePlus 13", "骁龙 8 至尊版", "Adreno 830"],
    subtitle: "骁龙 8 至尊版 · Adreno 830"
  },
  {
    id: "android_device_redmagic10pro",
    platform: "android",
    type: "device",
    displayName: "红魔 10 Pro",
    aliases: ["RedMagic 10 Pro", "骁龙 8 至尊版", "Adreno 830"],
    subtitle: "骁龙 8 至尊版 · Adreno 830"
  },
  {
    id: "android_gpu_adreno830",
    platform: "android",
    type: "gpu",
    displayName: "Adreno 830",
    aliases: ["骁龙 8 至尊版 GPU"],
    subtitle: "移动 GPU"
  },
  {
    id: "android_device_xiaomi15",
    platform: "android",
    type: "device",
    displayName: "小米 15",
    aliases: ["Xiaomi 15", "骁龙 8 至尊版", "Adreno 830"],
    subtitle: "骁龙 8 至尊版 · Adreno 830"
  },
  {
    id: "mac_model_mbp_m4pro",
    platform: "mac",
    type: "model",
    displayName: "MacBook Pro",
    aliases: ["MBP", "Apple M4 Pro"],
    subtitle: "Apple M4 Pro · macOS 15～26"
  },
  {
    id: "mac_model_macmini_m4",
    platform: "mac",
    type: "model",
    displayName: "Mac mini",
    aliases: ["Apple M4"],
    subtitle: "Apple M4 · macOS 15～26"
  },
  {
    id: "mac_chip_m4pro",
    platform: "mac",
    type: "chip",
    displayName: "Apple M4 Pro",
    aliases: ["M4 Pro"],
    subtitle: "Apple 芯片"
  },
  {
    id: "mac_chip_m4",
    platform: "mac",
    type: "chip",
    displayName: "Apple M4",
    aliases: ["M4"],
    subtitle: "Apple 芯片"
  },
  {
    id: "mac_model_macstudio_m3max",
    platform: "mac",
    type: "model",
    displayName: "Mac Studio",
    aliases: ["Apple M3 Max"],
    subtitle: "Apple M3 Max · macOS 15～26"
  },
  {
    id: "mac_model_mbp_m4max",
    platform: "mac",
    type: "model",
    displayName: "MacBook Pro M4 Max",
    aliases: ["MBP M4 Max", "Apple M4 Max"],
    subtitle: "Apple M4 Max · macOS 15～26"
  },
  {
    id: "mac_chip_m3max",
    platform: "mac",
    type: "chip",
    displayName: "Apple M3 Max",
    aliases: ["M3 Max"],
    subtitle: "Apple 芯片"
  },
  {
    id: "mac_chip_m4max",
    platform: "mac",
    type: "chip",
    displayName: "Apple M4 Max",
    aliases: ["M4 Max"],
    subtitle: "Apple 芯片"
  }
],
```

Replace the existing Elden Ring records with these four records:

```js
{
  id: "android_elden_oneplus",
  platform: "android",
  gameId: "steam_1245620",
  hardwareIds: ["android_device_oneplus13", "android_gpu_adreno830"],
  gameVersion: "1.16.1",
  verdict: "调优后流畅",
  rating: 4,
  avgFps: 38,
  verifiedAt: "2026-08-08",
  tags: ["基本流畅", "偶发卡顿"],
  notes: "中画质下可稳定游玩，首次进入场景会短暂编译着色器。",
  configIds: ["cfg_android_elden"],
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
  id: "android_elden_redmagic",
  platform: "android",
  gameId: "steam_1245620",
  hardwareIds: ["android_device_redmagic10pro", "android_gpu_adreno830"],
  gameVersion: "1.16.1",
  verdict: "稳定流畅",
  rating: 5,
  avgFps: 46,
  verifiedAt: "2026-08-10",
  tags: ["稳定帧率", "需主动散热"],
  notes: "开启主动散热后大部分场景保持 40 FPS 以上。",
  configIds: [],
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
  id: "mac_elden_mbp_m4pro",
  platform: "mac",
  gameId: "steam_1245620",
  hardwareIds: ["mac_model_mbp_m4pro", "mac_chip_m4pro"],
  gameVersion: "1.16.1",
  verdict: "稳定运行",
  rating: 4,
  avgFps: 52,
  verifiedAt: "2026-08-09",
  tags: ["1080P", "中画质"],
  notes: "默认分辨率下战斗和开放世界帧率稳定。",
  configIds: ["cfg_mac_elden"],
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
  id: "mac_elden_macmini_m4",
  platform: "mac",
  gameId: "steam_1245620",
  hardwareIds: ["mac_model_macmini_m4", "mac_chip_m4"],
  gameVersion: "1.16.1",
  verdict: "基本流畅",
  rating: 4,
  avgFps: 41,
  verifiedAt: "2026-08-08",
  tags: ["1080P", "低画质"],
  notes: "大型场景需要降低阴影与植被质量。",
  configIds: [],
  environment: {
    macModel: "Mac mini",
    appleChip: "Apple M4",
    macosVersion: "macOS 26",
    appVersion: "盖世游戏 Mac 2.3.0",
    compatibilityLayer: "Game Porting Toolkit 2",
    displayMode: "1920 × 1080"
  }
}
```

Add these exact fields to the remaining records:

```js
// android_wukong
hardwareIds: ["android_device_redmagic10pro", "android_gpu_adreno830"],
gameVersion: "1.0.12",
notes: "需要低画质和 30 FPS 上限，首次启动时间较长。",
configIds: ["cfg_android_wukong"]

// android_hades
hardwareIds: ["android_device_xiaomi15", "android_gpu_adreno830"],
gameVersion: "1.38290",
notes: "高画质下可稳定 60 FPS。",
configIds: ["cfg_android_hades"]

// android_sekiro
hardwareIds: ["android_device_oneplus13", "android_gpu_adreno830"],
gameVersion: "1.06",
notes: "中画质战斗稳定，少数区域有短暂掉帧。",
configIds: []

// mac_hades
hardwareIds: ["mac_model_macmini_m4", "mac_chip_m4"],
gameVersion: "1.38290",
notes: "高分辨率下可稳定 60 FPS。",
configIds: ["cfg_mac_hades"]

// mac_cyberpunk
hardwareIds: ["mac_model_macstudio_m3max", "mac_chip_m3max"],
gameVersion: "2.3",
notes: "关闭光追并降低画质后可稳定游玩。",
configIds: ["cfg_mac_cyberpunk"]

// mac_starfield
hardwareIds: ["mac_model_mbp_m4max", "mac_chip_m4max"],
gameVersion: "1.15.216",
notes: "实验方案，复杂场景帧率波动明显。",
configIds: []
```

Add a `recordId` property inside every config object according to this exact mapping:

| Config `id` | Config `recordId` |
|---|---|
| `cfg_android_elden` | `android_elden_oneplus` |
| `cfg_android_wukong` | `android_wukong` |
| `cfg_android_hades` | `android_hades` |
| `cfg_mac_elden` | `mac_elden_mbp_m4pro` |
| `cfg_mac_hades` | `mac_hades` |
| `cfg_mac_cyberpunk` | `mac_cyberpunk` |

For example, the existing `cfg_android_elden` config object receives `recordId: "android_elden_oneplus"` immediately after its `gameId`; do not create a separate runtime mapping object.

- [ ] **Step 5: Normalize hardware references and record fields**

Inside `normalizeCatalog(raw)`, normalize hardware before records and reject cross-platform references:

```js
const hardware = uniqueById((Array.isArray(raw.hardware) ? raw.hardware : []).map((item) => {
  if (!item || typeof item !== "object") return null;
  const id = text(item.id, 60);
  const platform = normalizePlatform(item.platform);
  const type = text(item.type, 16);
  const displayName = text(item.displayName, 80);
  if (!id || !platform || !["device", "gpu", "model", "chip"].includes(type) || !displayName) {
    return null;
  }
  return {
    id,
    platform,
    type,
    displayName,
    aliases: (Array.isArray(item.aliases) ? item.aliases : [])
      .map((value) => text(value, 60)).filter(Boolean),
    subtitle: text(item.subtitle, 100)
  };
}).filter(Boolean));

const hardwareById = new Map(hardware.map((item) => [item.id, item]));
```

In record normalization, add:

```js
const hardwareIds = [...new Set((Array.isArray(item.hardwareIds) ? item.hardwareIds : [])
  .map((value) => text(value, 60))
  .filter((id) => hardwareById.get(id)?.platform === platform))];
if (hardwareIds.length === 0) return null;

return {
  id: text(item.id, 60),
  platform,
  gameId,
  hardwareIds,
  gameVersion: text(item.gameVersion, 40) || "未记录",
  verdict: text(item.verdict, 40),
  rating: number(item.rating, 1, 5),
  avgFps: number(item.avgFps, 0, 240),
  verifiedAt: /^\d{4}-\d{2}-\d{2}$/.test(text(item.verifiedAt, 10))
    ? text(item.verifiedAt, 10) : "未记录",
  tags: (Array.isArray(item.tags) ? item.tags : [])
    .map((value) => text(value, 30)).filter(Boolean).slice(0, 4),
  notes: text(item.notes, 180) || "—",
  configIds: (Array.isArray(item.configIds) ? item.configIds : [])
    .map((value) => text(value, 60)).filter(Boolean),
  environment
};
```

After records are normalized and before configs are normalized, add:

```js
const recordById = new Map(records.map((record) => [record.id, record]));
```

Inside config normalization, validate and retain `recordId`:

```js
const recordId = text(item.recordId, 60);
const record = recordById.get(recordId);
if (!record || record.platform !== platform || record.gameId !== gameId) return null;

return {
  id,
  platform,
  gameId,
  recordId,
  name: text(item.name, 80),
  version: text(item.version, 30),
  fileName: text(item.fileName, 100),
  fileSize: text(item.fileSize, 30),
  downloadCount: number(item.downloadCount),
  updatedAt: text(item.updatedAt, 10),
  summary: text(item.summary, 120),
  applicability,
  fields
};
```

Return `{ games, hardware, records, configs }` and initialize `catalog` with all four arrays.

- [ ] **Step 6: Implement the single filtering and sorting functions**

Add these functions after catalog normalization:

```js
function activeCatalog() {
  return {
    games: catalog.games.filter((game) => game.platforms.includes(state.platform)),
    hardware: catalog.hardware.filter((item) => item.platform === state.platform),
    records: catalog.records.filter((record) => record.platform === state.platform),
    configs: catalog.configs.filter((config) => config.platform === state.platform)
  };
}

function sortRecords(records) {
  const direction = state.sort.direction === "asc" ? 1 : -1;
  return [...records].sort((left, right) => {
    const primary = state.sort.field === "verifiedAt"
      ? left.verifiedAt.localeCompare(right.verifiedAt)
      : left.rating - right.rating;
    if (primary !== 0) return primary * direction;
    return right.verifiedAt.localeCompare(left.verifiedAt);
  });
}

function filterRecords() {
  const { records } = activeCatalog();
  return sortRecords(records.filter((record) => {
    if (state.filters.gameId && record.gameId !== state.filters.gameId) return false;
    if (state.filters.hardwareId && !record.hardwareIds.includes(state.filters.hardwareId)) return false;
    if (state.filters.ratingMin != null && record.rating < state.filters.ratingMin) return false;
    return true;
  }));
}
```

- [ ] **Step 7: Run the static test and commit the data layer**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs
```

Expected: the static test passes the new data contracts, JavaScript syntax passes, and `git diff --check` reports no whitespace errors.

Commit only the two task files:

```powershell
git add -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs"
git commit -m "refactor: add compatibility filter data model"
```

### Task 2: Build the three searchable dropdown filters

**Files:**
- Modify: `tools/verify-compatibility-webview-demo.mjs`
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html:121-687,1233-1733`

- [ ] **Step 1: Add failing UI-contract assertions**

Add these entries to the verifier `required` list:

```js
'data-filter-select="game"',
'data-filter-select="hardware"',
'data-filter-select="rating"',
'data-filter-trigger=',
'data-filter-query=',
'data-filter-option=',
'data-filter-clear=',
'data-clear-filters',
'renderFilterBar()',
'renderSearchableSelect('
```

Do not add the old search/result markers to `legacy` yet; Task 3 removes the old renderer atomically with its replacement.

- [ ] **Step 2: Run the verifier and confirm the filter UI is missing**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: exit code `1` with `missing contract: data-filter-select="game"`.

- [ ] **Step 3: Add reusable filter definitions and candidate matching**

Add:

```js
function filterDefinitions() {
  return [
    { key: "game", label: "游戏", placeholder: "搜索游戏" },
    {
      key: "hardware",
      label: state.platform === "android" ? "设备或 GPU" : "Mac 机型或 Apple 芯片",
      placeholder: state.platform === "android" ? "搜索设备、芯片或 GPU" : "搜索机型或 Apple 芯片"
    },
    { key: "rating", label: "最低评分（≥）", placeholder: "搜索评分" }
  ];
}

function includesQuery(values, query) {
  const normalized = text(query, 80).toLocaleLowerCase("zh-CN");
  if (!normalized) return true;
  return values.some((value) => text(value, 100).toLocaleLowerCase("zh-CN").includes(normalized));
}

function filterOptions(key) {
  const current = activeCatalog();
  if (key === "game") {
    return current.games.filter((game) => includesQuery(
      [game.name, game.englishName, ...game.aliases],
      state.queries.game
    )).map((game) => ({
      value: game.id,
      label: game.name,
      subtitle: game.englishName,
      game
    }));
  }
  if (key === "hardware") {
    return current.hardware.filter((item) => includesQuery(
      [item.displayName, item.subtitle, ...item.aliases],
      state.queries.hardware
    )).map((item) => ({
      value: item.id,
      label: item.displayName,
      subtitle: item.subtitle
    }));
  }
  return ratingOptions.filter((item) => includesQuery(
    [item.label, item.value == null ? "全部" : String(item.value)],
    state.queries.rating
  ));
}
```

- [ ] **Step 4: Render the shared dropdown component and filter bar**

Add:

```js
function selectedFilterLabel(key) {
  const current = activeCatalog();
  if (key === "game") {
    return current.games.find((game) => game.id === state.filters.gameId)?.name || "全部游戏";
  }
  if (key === "hardware") {
    return current.hardware.find((item) => item.id === state.filters.hardwareId)?.displayName ||
      (state.platform === "android" ? "全部设备 / GPU" : "全部机型 / 芯片");
  }
  return ratingOptions.find((item) => item.value === state.filters.ratingMin)?.label || "全部";
}

function renderFilterOption(key, option) {
  const cover = key === "game" ? renderCover(option.game, "filter-option-cover") : "";
  return '<button class="filter-option" data-filter-option="' + esc(key) +
    '" data-option-value="' + esc(option.value == null ? "all" : option.value) + '" type="button">' +
      cover + '<span><strong>' + esc(option.label) + '</strong>' +
      (option.subtitle ? '<small>' + esc(option.subtitle) + '</small>' : '') + '</span>' +
      (key === "game" ? '<em>' + platformLabel() + '</em>' : '') +
    '</button>';
}

function renderSearchableSelect(definition) {
  const key = definition.key;
  const isOpen = state.openFilter === key;
  const options = filterOptions(key);
  const hasSelection = key === "game" ? state.filters.gameId
    : key === "hardware" ? state.filters.hardwareId
    : state.filters.ratingMin != null;
  return '<section class="filter-select' + (isOpen ? ' open' : '') +
    '" data-filter-select="' + esc(key) + '">' +
      '<span class="filter-label">' + esc(definition.label) + '</span>' +
      '<div class="filter-control">' +
        '<button data-filter-trigger="' + esc(key) + '" type="button" aria-expanded="' + isOpen + '">' +
          '<strong>' + esc(selectedFilterLabel(key)) + '</strong><span>⌄</span>' +
        '</button>' +
        (hasSelection ? '<button class="filter-clear" data-filter-clear="' + esc(key) +
          '" type="button" aria-label="清除' + esc(definition.label) + '">×</button>' : '') +
      '</div>' +
      (isOpen ? '<div class="filter-menu">' +
        '<input data-filter-query="' + esc(key) + '" value="' + esc(state.queries[key]) +
          '" placeholder="' + esc(definition.placeholder) + '" autocomplete="off">' +
        '<div class="filter-options">' +
          (options.length ? options.map((option) => renderFilterOption(key, option)).join("")
            : '<p class="filter-empty">暂无匹配选项</p>') +
        '</div></div>' : '') +
    '</section>';
}

function renderFilterBar() {
  const selectedCount = [state.filters.gameId, state.filters.hardwareId, state.filters.ratingMin]
    .filter((value) => value != null).length;
  return '<section class="filter-panel">' +
    '<div class="filter-grid">' + filterDefinitions().map(renderSearchableSelect).join("") + '</div>' +
    '<div class="filter-summary"><span>' + selectedCount + ' 个筛选条件</span>' +
      (selectedCount ? '<button data-clear-filters type="button">清空筛选</button>' : '') +
    '</div></section>';
}
```

- [ ] **Step 5: Replace the old search listeners with filter listeners**

Add the new filter input branch before the existing `#game-search` branch. Keep the old branch until Task 3 deletes the old renderer:

```js
document.addEventListener("input", (event) => {
  const key = event.target.dataset.filterQuery;
  if (!key || !(key in state.queries)) return;
  state.queries[key] = event.target.value;
  render();
  const input = document.querySelector('[data-filter-query="' + key + '"]');
  if (input) {
    input.focus();
    input.setSelectionRange(state.queries[key].length, state.queries[key].length);
  }
});

function clearFilter(key) {
  if (key === "game") state.filters.gameId = null;
  if (key === "hardware") state.filters.hardwareId = null;
  if (key === "rating") state.filters.ratingMin = null;
  state.queries[key] = "";
  state.viewer = { recordId: null, configId: null };
  clearDownloadState();
}
```

Inside the click listener, add these branches before config/download handling:

```js
const trigger = event.target.closest("[data-filter-trigger]");
if (trigger) {
  const key = trigger.dataset.filterTrigger;
  state.openFilter = state.openFilter === key ? null : key;
  render();
  document.querySelector('[data-filter-query="' + key + '"]')?.focus();
  return;
}

const option = event.target.closest("[data-filter-option]");
if (option) {
  const key = option.dataset.filterOption;
  const value = option.dataset.optionValue;
  if (key === "game") state.filters.gameId = value;
  if (key === "hardware") state.filters.hardwareId = value;
  if (key === "rating") state.filters.ratingMin = value === "all" ? null : Number(value);
  state.queries[key] = "";
  state.openFilter = null;
  state.viewer = { recordId: null, configId: null };
  clearDownloadState();
  render();
  return;
}

const clear = event.target.closest("[data-filter-clear]");
if (clear) {
  clearFilter(clear.dataset.filterClear);
  render();
  return;
}

if (event.target.closest("[data-clear-filters]")) {
  state.filters = { gameId: null, hardwareId: null, ratingMin: null };
  state.queries = { game: "", hardware: "", rating: "" };
  state.openFilter = null;
  state.viewer = { recordId: null, configId: null };
  clearDownloadState();
  render();
  return;
}
```

For this intermediate green checkpoint, render `renderFilterBar()` above the existing search/popular/result content. Task 3 replaces that content completely and removes the old event branches.

- [ ] **Step 6: Add filter bar and dropdown styles**

Add CSS with the exact responsive behavior:

```css
.filter-panel { margin-top: 20px; padding: 18px; border: 1px solid var(--line); border-radius: 22px; background: var(--panel); }
.filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.filter-select { position: relative; min-width: 0; }
.filter-label { display: block; margin-bottom: 8px; color: var(--muted); font-size: 12px; }
.filter-control { position: relative; display: flex; }
.filter-control > [data-filter-trigger] { width: 100%; min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 44px 0 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); color: var(--text); text-align: left; }
.filter-clear { position: absolute; right: 4px; top: 4px; width: 44px; height: 44px; border: 0; background: transparent; color: var(--muted); }
.filter-menu { position: absolute; z-index: 30; top: calc(100% + 8px); left: 0; right: 0; padding: 10px; border: 1px solid var(--line); border-radius: 16px; background: #171717; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
.filter-menu input { width: 100%; min-height: 46px; padding: 0 12px; border: 1px solid var(--line); border-radius: 12px; background: #0f0f0f; color: var(--text); }
.filter-options { max-height: 280px; margin-top: 8px; overflow-y: auto; }
.filter-option { width: 100%; min-height: 54px; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 10px; padding: 8px; border: 0; border-radius: 10px; background: transparent; color: var(--text); text-align: left; }
.filter-option:hover, .filter-option:focus-visible { background: rgba(255,255,255,.06); }
.filter-option span { min-width: 0; display: grid; gap: 3px; }
.filter-option small, .filter-option em { color: var(--muted); font-size: 12px; font-style: normal; }
.filter-option-cover { width: 42px; height: 56px; object-fit: cover; border-radius: 7px; }
.filter-empty { padding: 18px 8px; color: var(--muted); text-align: center; }
.filter-summary { min-height: 44px; display: flex; align-items: center; justify-content: space-between; margin-top: 10px; color: var(--muted); font-size: 12px; }

@media (max-width: 700px) {
  .filter-grid { grid-template-columns: 1fr; }
  .filter-menu { position: static; margin-top: 8px; }
}
```

Mirror the mobile rule under `.frame[data-preview="mobile"]` so Demo preview and real 390px viewport behave identically.

- [ ] **Step 7: Verify the filter contracts and commit**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs
```

Expected: PASS and no whitespace errors.

Commit:

```powershell
git add -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs"
git commit -m "feat: add searchable compatibility filters"
```

### Task 3: Render multiple compatibility records

**Files:**
- Modify: `tools/capture-compatibility-webview-demo.mjs`
- Modify: `tools/verify-compatibility-webview-demo.mjs`
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [ ] **Step 1: Add failing result-contract assertions**

Add to the verifier `required` list:

```js
'data-result-count',
'data-record-table',
'data-record-cards',
'data-record-row=',
'data-sort-field="rating"',
'data-sort-field="verifiedAt"',
'renderRecordResults()',
'renderRecordTable(',
'renderRecordCards('
```

Add to `legacy`:

```js
'selectedGameId',
'expandedConfigId',
'renderPopularGames()',
'renderCompatibilityResult()',
'id="game-search"',
'data-popular-game',
'data-search-result',
'data-compatibility-result',
'result-hero',
'verdict-card',
'返回Android游戏',
'返回Mac游戏'
```

- [ ] **Step 2: Replace the opening browser assertions with failing multi-record tests**

In the capture script, replace the old popular-game and single-result flow with:

```js
check(await page.locator('[data-filter-select]').count() === 3, 'Android filter count is not three');
check(
  await page.getByText('添加筛选条件开始查询', { exact: true }).isVisible(),
  'Initial filter prompt is missing'
);

await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
const gameOption = page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]');
check(await gameOption.count() === 1, 'Elden Ring game option is missing');
check(await gameOption.locator('img').count() === 1, 'Game option has no local cover');
check((await gameOption.innerText()).includes('ELDEN RING'), 'Game option has no English name');
check((await gameOption.innerText()).includes('Android'), 'Game option has no platform label');
await gameOption.click();

check(await page.locator('[data-record-row]:visible').count() === 2, 'Game filter did not return two Android records');
check((await page.locator('[data-result-count]').innerText()).includes('2 条兼容记录'), 'Android result count is wrong');
check(await page.locator('[data-record-row="android_elden_redmagic"]:visible').count() === 1, 'Higher-rated Android record is missing');
check(await page.locator('[data-record-row="android_elden_oneplus"]:visible').count() === 1, 'Second Android record is missing');
```

For this checkpoint, delete the remaining old single-game, inline-config, old screenshot and old platform-switch assertions below this block. Keep the shared helpers at the top and finish the script with this green checkpoint tail; later tasks insert new viewer, isolation, download and screenshot cases immediately before this tail:

```js
check(externalRequests.length === 0, 'Unexpected external requests: ' + externalRequests.join(', '));
await page.close();
await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PASS: three searchable filters and multi-record Android results');
```

Run:

```powershell
node tools/capture-compatibility-webview-demo.mjs
```

Expected: exit code `1`; the current page lacks three filters and multi-record rows.

- [ ] **Step 3: Implement shared record presentation helpers**

Add:

```js
function recordGame(record) {
  return activeCatalog().games.find((game) => game.id === record.gameId);
}

function recordHardware(record) {
  const items = activeCatalog().hardware.filter((item) => record.hardwareIds.includes(item.id));
  const primaryTypes = state.platform === "android" ? ["device", "gpu"] : ["model", "chip"];
  return primaryTypes.map((type) => items.find((item) => item.type === type)).filter(Boolean);
}

function ratingStars(rating) {
  return '<span class="rating" aria-label="' + rating + ' 分">' + '★'.repeat(rating) +
    '<i>' + '★'.repeat(5 - rating) + '</i></span>';
}

function configAction(record) {
  const count = activeCatalog().configs.filter((config) => record.configIds.includes(config.id)).length;
  return count
    ? '<button data-config-open="' + esc(record.id) + '" type="button">查看配置（' + count + '）</button>'
    : '<span class="no-config">暂无配置</span>';
}

function recordCells(record) {
  const game = recordGame(record);
  const hardware = recordHardware(record);
  const environment = record.environment;
  return {
    game: renderCover(game, "record-cover") + '<span><strong>' + esc(game.name) +
      '</strong><small>' + esc(game.englishName) + '</small></span>',
    hardware: hardware.map((item) => esc(item.displayName)).join('<small> · </small>'),
    gameVersion: esc(record.gameVersion),
    os: esc(state.platform === "android" ? environment.androidVersion : environment.macosVersion),
    runtime: esc(state.platform === "android" ? environment.runtime : environment.compatibilityLayer),
    appVersion: esc(environment.appVersion),
    rating: ratingStars(record.rating),
    fps: '<strong>' + formatNumber(record.avgFps) + '</strong> FPS',
    tags: record.tags.map((tag) => '<span class="record-tag">' + esc(tag) + '</span>').join(''),
    notes: esc(record.notes),
    config: configAction(record),
    verifiedAt: esc(record.verifiedAt)
  };
}
```

- [ ] **Step 4: Render desktop table and mobile cards from the same array**

Add:

```js
function renderRecordTable(records) {
  return '<div class="record-table-wrap" data-record-table><table class="record-table"><thead><tr>' +
    '<th>游戏</th><th>' + (state.platform === "android" ? '设备 / GPU' : '机型 / 芯片') + '</th>' +
    '<th>游戏版本</th><th>' + (state.platform === "android" ? 'Android' : 'macOS') + '</th>' +
    '<th>运行环境</th><th>盖世版本</th><th><button data-sort-field="rating" type="button">评分</button></th>' +
    '<th>平均 FPS</th><th>标签</th><th>备注</th><th>配置</th>' +
    '<th><button data-sort-field="verifiedAt" type="button">验证时间</button></th>' +
    '</tr></thead><tbody>' + records.map((record) => {
      const cell = recordCells(record);
      return '<tr data-record-row="' + esc(record.id) + '">' +
        '<td class="record-game">' + cell.game + '</td><td>' + cell.hardware + '</td>' +
        '<td>' + cell.gameVersion + '</td><td>' + cell.os + '</td><td>' + cell.runtime + '</td>' +
        '<td>' + cell.appVersion + '</td>' +
        '<td>' + cell.rating + '</td><td>' + cell.fps + '</td><td>' + cell.tags + '</td>' +
        '<td class="record-notes">' + cell.notes + '</td><td>' + cell.config + '</td>' +
        '<td>' + cell.verifiedAt + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function renderRecordCards(records) {
  return '<div class="record-cards" data-record-cards>' + records.map((record) => {
    const cell = recordCells(record);
    return '<article class="record-card" data-record-row="' + esc(record.id) + '">' +
      '<div class="record-card-head"><div class="record-game">' + cell.game + '</div>' + cell.rating + '</div>' +
      '<div class="record-primary"><span>' + cell.hardware + '</span><strong>' + cell.fps + '</strong></div>' +
      '<dl><div><dt>游戏版本</dt><dd>' + cell.gameVersion + '</dd></div>' +
      '<div><dt>' + (state.platform === "android" ? 'Android' : 'macOS') + '</dt><dd>' + cell.os + '</dd></div>' +
      '<div><dt>运行环境</dt><dd>' + cell.runtime + '</dd></div>' +
      '<div><dt>盖世版本</dt><dd>' + esc(record.environment.appVersion) + '</dd></div></dl>' +
      '<div class="record-tags">' + cell.tags + '</div><p>' + cell.notes + '</p>' +
      '<footer><span>验证于 ' + cell.verifiedAt + '</span>' + cell.config + '</footer></article>';
  }).join('') + '</div>';
}

function renderRecordResults() {
  const hasFilter = state.filters.gameId || state.filters.hardwareId || state.filters.ratingMin != null;
  if (!hasFilter) {
    return '<section class="query-prompt"><h2>添加筛选条件开始查询</h2>' +
      '<p>可按游戏、硬件或最低评分独立查询，也可以组合筛选。</p></section>';
  }
  const records = filterRecords();
  if (!records.length) {
    return '<section class="no-results"><h2>暂无符合条件的兼容记录</h2>' +
      '<p>当前筛选条件会继续保留。</p><button data-clear-filters type="button">清空筛选</button></section>';
  }
  return '<section class="record-results"><div class="result-heading">' +
    '<h2>兼容记录</h2><strong data-result-count>共 ' + records.length + ' 条兼容记录</strong></div>' +
    renderRecordTable(records) + renderRecordCards(records) + '</section>';
}
```

In `render()`, replace the single-game branch with:

```js
content = renderFilterBar() + renderRecordResults();
```

Delete the old `renderSearchPanel()`, `renderPopularGames()`, `renderCompatibilityResult()`, `selectedGameId`, `expandedConfigId`, `gameQuery` and their click/input branches in this same step so the new legacy assertions pass.

- [ ] **Step 5: Add result table/card styles and sort handling**

Add CSS:

```css
.record-results { margin-top: 16px; }
.result-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.record-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
.record-table { width: 100%; min-width: 1180px; border-collapse: collapse; font-size: 12px; }
.record-table th, .record-table td { padding: 12px 10px; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; }
.record-table th { position: sticky; top: 0; z-index: 1; background: #181818; color: var(--muted); }
.record-game { min-width: 170px; display: flex; align-items: center; gap: 10px; }
.record-cover { width: 44px; height: 60px; border-radius: 8px; object-fit: cover; }
.record-game span { min-width: 0; display: grid; gap: 4px; }
.record-game small { color: var(--muted); }
.rating { white-space: nowrap; color: var(--gold); }
.rating i { color: #454545; font-style: normal; }
.record-tag { display: inline-flex; margin: 0 4px 4px 0; padding: 4px 7px; border-radius: 999px; background: rgba(255,190,46,.12); color: var(--gold); }
.record-cards { display: none; gap: 12px; }
.record-card { padding: 14px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
.record-card-head, .record-primary, .record-card footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.record-card dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.record-card dl div { padding: 9px; border-radius: 10px; background: var(--surface); }
.record-card dt { color: var(--muted); font-size: 11px; }
.record-card dd { margin: 4px 0 0; font-size: 12px; }

@media (max-width: 700px) {
  .record-table-wrap { display: none; }
  .record-cards { display: grid; }
}
```

Mirror table/card visibility under `.frame[data-preview="mobile"]` and `.frame[data-preview="desktop"]`.

Add sort handling:

```js
const sortButton = event.target.closest("[data-sort-field]");
if (sortButton) {
  const field = sortButton.dataset.sortField;
  if (state.sort.field === field) {
    state.sort.direction = state.sort.direction === "desc" ? "asc" : "desc";
  } else {
    state.sort = { field, direction: "desc" };
  }
  render();
  return;
}
```

- [ ] **Step 6: Run multi-record tests and commit**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
```

Expected at this checkpoint: static verifier and the reduced capture checkpoint both pass. Task 4 then extends the same script before its final cleanup block.

Commit:

```powershell
git add -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs" "tools/capture-compatibility-webview-demo.mjs"
git commit -m "feat: render multi-record compatibility results"
```

### Task 4: Add desktop dialog and mobile full-screen config viewer

**Files:**
- Modify: `tools/capture-compatibility-webview-demo.mjs`
- Modify: `tools/verify-compatibility-webview-demo.mjs`
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [ ] **Step 1: Add failing viewer-contract assertions**

Add to the static verifier:

```js
'data-config-open=',
'data-config-viewer',
'data-config-choice=',
'data-config-close',
'role="dialog"',
'aria-modal="true"',
'renderConfigViewer()',
'openConfigViewer(recordId)',
'closeConfigViewer()'
```

Add to `legacy`:

```js
'data-config-toggle',
'config-toggle-state',
'收起'
```

- [ ] **Step 2: Add failing desktop and mobile viewer tests**

After selecting the Android Elden Ring game, add:

```js
await page.locator('[data-config-open="android_elden_oneplus"]:visible').click();
const androidViewer = page.locator('[data-config-viewer]');
check(await androidViewer.isVisible(), 'Android config viewer did not open');
check(await androidViewer.getAttribute('role') === 'dialog', 'Config viewer has no dialog role');
check((await androidViewer.innerText()).includes('适用范围'), 'Config applicability is missing');
check((await androidViewer.innerText()).includes('Adreno 830'), 'Android config hardware is missing');
check((await androidViewer.innerText()).includes('Android 14～15'), 'Android config OS range is missing');

const beforeCloseCount = await page.locator('[data-record-row]:visible').count();
await page.locator('[data-config-close]').click();
check(await page.locator('[data-config-viewer]').count() === 0, 'Config viewer did not close');
check(await page.locator('[data-record-row]:visible').count() === beforeCloseCount, 'Closing viewer changed result count');
```

On a real `390×844` page, add:

```js
const phonePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(phonePage, 'phone');
await phonePage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
await phonePage.locator('[data-filter-trigger="game"]').click();
await phonePage.locator('[data-filter-query="game"]').fill('艾尔登');
await phonePage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await phonePage.locator('[data-config-open="android_elden_oneplus"]:visible').click();
const phoneViewerBox = await phonePage.locator('[data-config-viewer]').boundingBox();
check(Boolean(phoneViewerBox), 'Phone config viewer has no bounding box');
check(Math.round(phoneViewerBox.width) === 390, 'Phone config viewer is not full width');
check(Math.round(phoneViewerBox.height) === 844, 'Phone config viewer is not full height');
```

Run capture and expect failure because the current config still expands inline.

- [ ] **Step 3: Implement viewer state and configuration selection**

Add:

```js
function recordConfigs(recordId) {
  const record = activeCatalog().records.find((item) => item.id === recordId);
  if (!record) return [];
  return activeCatalog().configs.filter((config) =>
    record.configIds.includes(config.id) && config.recordId === record.id
  );
}

function openConfigViewer(recordId) {
  const configs = recordConfigs(recordId);
  if (!configs.length) return false;
  state.viewer = { recordId, configId: configs[0].id };
  clearDownloadState();
  render();
  return true;
}

function closeConfigViewer() {
  state.viewer = { recordId: null, configId: null };
  clearDownloadState();
  render();
}
```

- [ ] **Step 4: Render one shared dialog/full-screen DOM**

Replace inline `renderConfigDetail()` usage with:

```js
function renderConfigViewer() {
  const configs = recordConfigs(state.viewer.recordId);
  if (!configs.length) return "";
  const selected = configs.find((config) => config.id === state.viewer.configId) || configs[0];
  return '<div class="config-viewer-backdrop" data-config-viewer role="dialog" aria-modal="true"' +
    ' aria-labelledby="config-viewer-title">' +
    '<section class="config-viewer-panel">' +
      '<header><button data-config-close type="button" aria-label="关闭配置详情">←</button>' +
        '<div><span>启动配置</span><h2 id="config-viewer-title">' + esc(selected.name) + '</h2></div>' +
        '<button data-config-close type="button" aria-label="关闭">×</button></header>' +
      (configs.length > 1 ? '<nav class="config-choice-list">' + configs.map((config) =>
        '<button data-config-choice="' + esc(config.id) + '" type="button"' +
          (config.id === selected.id ? ' class="active"' : '') + '>' + esc(config.name) + '</button>'
      ).join('') + '</nav>' : '') +
      '<div class="config-viewer-body">' + renderConfigDetail(selected) + '</div>' +
    '</section></div>';
}
```

Keep `renderConfigDetail(selected)` responsible only for applicability, fields, metadata, download button and download feedback; remove the inline collapse language.

Append the viewer to the ready-state render branch:

```js
content = renderFilterBar() + renderRecordResults() + renderConfigViewer();
```

- [ ] **Step 5: Wire open, choice, close, Escape and backdrop interactions**

Add click branches:

```js
const configOpen = event.target.closest("[data-config-open]");
if (configOpen) {
  openConfigViewer(configOpen.dataset.configOpen);
  return;
}

const configChoice = event.target.closest("[data-config-choice]");
if (configChoice) {
  state.viewer.configId = configChoice.dataset.configChoice;
  clearDownloadState();
  render();
  return;
}

if (event.target.closest("[data-config-close]") ||
    (event.target.matches("[data-config-viewer]") && !event.target.closest(".config-viewer-panel"))) {
  closeConfigViewer();
  return;
}
```

Add keyboard close:

```js
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.viewer.recordId) closeConfigViewer();
});
```

- [ ] **Step 6: Add responsive viewer styles**

Add:

```css
.config-viewer-backdrop { position: fixed; z-index: 80; inset: 0; display: grid; place-items: center; padding: 24px; background: rgba(0,0,0,.72); }
.config-viewer-panel { width: min(760px, 100%); max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-radius: 24px; background: #151515; box-shadow: 0 28px 80px rgba(0,0,0,.6); }
.config-viewer-panel > header { min-height: 72px; display: grid; grid-template-columns: 44px minmax(0,1fr) 44px; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--line); }
.config-viewer-panel > header button { width: 44px; height: 44px; border: 0; border-radius: 12px; background: var(--surface); color: var(--text); }
.config-viewer-panel > header div { min-width: 0; }
.config-viewer-panel > header span { color: var(--gold); font-size: 12px; }
.config-viewer-panel > header h2 { margin: 3px 0 0; font-size: 20px; }
.config-choice-list { display: flex; gap: 8px; padding: 12px 16px 0; overflow-x: auto; }
.config-choice-list button { min-height: 44px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--muted); }
.config-choice-list button.active { border-color: var(--gold); color: var(--gold); }
.config-viewer-body { min-height: 0; padding: 16px; overflow-y: auto; }

@media (max-width: 700px) {
  .config-viewer-backdrop { display: block; padding: 0; }
  .config-viewer-panel { width: 100%; height: 100%; max-height: none; border: 0; border-radius: 0; }
}
```

Apply the same full-screen rules to `.frame[data-preview="mobile"] .config-viewer-backdrop` using `position: absolute` so the Demo’s 390×844 frame is fully covered without covering the external preview toolbar.

- [ ] **Step 7: Run viewer tests and commit**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs
```

Expected: viewer opens, closes, preserves results, uses dialog semantics, and occupies the full real 390×844 viewport.

Commit:

```powershell
git add -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs" "tools/capture-compatibility-webview-demo.mjs"
git commit -m "feat: add responsive config viewer"
```

### Task 5: Cover filter combinations, platform isolation and recovery

**Files:**
- Modify: `tools/capture-compatibility-webview-demo.mjs`
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [ ] **Step 1: Add failing Android filter-combination tests**

After the Android game-only assertion, add:

```js
await page.locator('[data-filter-clear="game"]').click();
await page.locator('[data-filter-trigger="hardware"]').click();
await page.locator('[data-filter-query="hardware"]').fill('Adreno 830');
await page.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').click();
check(await page.locator('[data-record-row]:visible').count() >= 4, 'GPU-only filter did not return multiple Android records');

await page.locator('[data-filter-trigger="rating"]').click();
await page.locator('[data-filter-query="rating"]').fill('4');
await page.locator('[data-filter-option="rating"][data-option-value="4"]').click();
const ratedRows = await page.locator('[data-record-row]:visible').allTextContents();
check(ratedRows.length >= 3, 'GPU + rating filter returned too few records');
check(ratedRows.every((text) => text.includes('★★★★')), 'Rating ≥4 retained a lower-rated record');

await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
check(await page.locator('[data-record-row]:visible').count() === 2, 'Three-filter AND result is not two Elden records');
```

- [ ] **Step 2: Add failing Mac mapping and platform-reset tests**

On the Bridge-controlled Mac page, add:

```js
const bridgePage = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
observePage(bridgePage, 'bridge');
await bridgePage.goto(pathToFileURL(demoPath).href + '?platform=android', { waitUntil: 'load' });
await bridgePage.evaluate(() => window.GameHubCompatibility.setContext({ platform: 'mac' }));
check(await bridgePage.locator('[data-platform-badge]').textContent() === 'Mac', 'Bridge did not override Android query');
check(await bridgePage.locator('[data-demo-platform="android"]').isDisabled(), 'Bridge did not lock Demo platform switch');

check(
  (await bridgePage.locator('[data-filter-select="hardware"] .filter-label').innerText()) ===
    'Mac 机型或 Apple 芯片',
  'Mac hardware filter label is wrong'
);
await bridgePage.locator('[data-filter-trigger="hardware"]').click();
await bridgePage.locator('[data-filter-query="hardware"]').fill('M4 Pro');
check(
  await bridgePage.locator('[data-filter-option="hardware"][data-option-value="mac_chip_m4pro"]').count() === 1,
  'Mac chip option is missing'
);
check(
  await bridgePage.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').count() === 0,
  'Android GPU leaked into Mac candidates'
);
await bridgePage.locator('[data-filter-option="hardware"][data-option-value="mac_chip_m4pro"]').click();
const macRowsText = (await bridgePage.locator('[data-record-row]:visible').allTextContents()).join(' ');
check(macRowsText.includes('Apple M4 Pro'), 'Mac chip filter returned no M4 Pro record');
check(!macRowsText.includes('Android'), 'Android field leaked into Mac results');
check(!macRowsText.includes('Adreno'), 'Android GPU leaked into Mac results');
```

On the Demo-controlled page, select filters, open a config, then switch platform:

```js
await page.locator('[data-config-open="android_elden_oneplus"]:visible').click();
await page.locator('[data-demo-platform="mac"]').click();
check(await page.locator('[data-platform-badge]').textContent() === 'Mac', 'Demo platform did not switch to Mac');
check(await page.locator('[data-config-viewer]').count() === 0, 'Platform switch kept config viewer');
check(await page.locator('[data-record-row]:visible').count() === 0, 'Platform switch kept Android results');
check(await page.locator('[data-clear-filters]').count() === 0, 'Platform switch kept Android filters');
```

- [ ] **Step 3: Add invalid-reference, no-candidate and no-result tests**

Use `setCatalog()` with one Mac game, one Mac chip, an Android-linked record, and a Mac record whose `hardwareIds` reference a missing ID. Assert both records are rejected and the platform empty state remains recoverable.

Create the query page before injecting the invalid catalog:

```js
const queryPage = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
observePage(queryPage, 'query');
await queryPage.goto(pathToFileURL(demoPath).href + '?platform=mac', { waitUntil: 'load' });
check(await queryPage.locator('[data-platform-badge]').textContent() === 'Mac', 'Mac query fallback failed');
```

Inject this exact invalid catalog:

```js
await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [{
    id: 'cross-game', name: '跨平台异常游戏', englishName: 'Cross Invalid', aliases: [],
    coverKey: 'invalid-cover.jpg', platforms: ['mac'], popularOn: []
  }],
  hardware: [{
    id: 'mac_chip_test', platform: 'mac', type: 'chip', displayName: 'Apple M4', aliases: [], subtitle: 'Apple 芯片'
  }],
  records: [
    {
      id: 'wrong-platform-record', platform: 'android', gameId: 'cross-game',
      hardwareIds: ['mac_chip_test'], rating: 5, environment: { androidVersion: 'Android 15' }
    },
    {
      id: 'missing-hardware-record', platform: 'mac', gameId: 'cross-game',
      hardwareIds: ['missing-chip'], rating: 5, environment: { macosVersion: 'macOS 26' }
    }
  ],
  configs: []
}));

check(await queryPage.locator('[data-record-row]:visible').count() === 0, 'Invalid records survived normalization');
check(
  await queryPage.getByText('当前Mac暂无兼容数据', { exact: true }).isVisible(),
  'Invalid-record catalog did not enter the recoverable Mac empty state'
);
check(await queryPage.locator('[data-state-action="reload"]').count() === 1, 'Invalid catalog has no reload action');
```

For UI states, add:

```js
await queryPage.locator('[data-state-action="reload"]').click();
await queryPage.waitForTimeout(500);
check(await queryPage.locator('[data-filter-select]').count() === 3, 'Reload did not restore the Mac filter catalog');

await queryPage.locator('[data-filter-trigger="game"]').click();
await queryPage.locator('[data-filter-query="game"]').fill('不存在');
check(await queryPage.getByText('暂无匹配选项', { exact: true }).isVisible(), 'No-candidate state is missing');

await queryPage.locator('[data-filter-query="game"]').fill('艾尔登');
await queryPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await queryPage.locator('[data-filter-trigger="rating"]').click();
await queryPage.locator('[data-filter-query="rating"]').fill('5');
await queryPage.locator('[data-filter-option="rating"][data-option-value="5"]').click();
check(
  await queryPage.getByText('暂无符合条件的兼容记录', { exact: true }).isVisible(),
  'Mac game + rating no-result state is missing'
);
check(await queryPage.locator('[data-record-row]:visible').count() === 0, 'No-result combination rendered records');
check(
  (await queryPage.locator('[data-filter-trigger="game"]').innerText()).includes('艾尔登法环') &&
    (await queryPage.locator('[data-filter-trigger="rating"]').innerText()).includes('5 分及以上'),
  'No-result state did not retain selected filters'
);
```

Then cover empty-catalog reload and the local-cover fallback explicitly:

```js
await queryPage.evaluate(() => window.GameHubCompatibility.setCatalog({
  games: [],
  hardware: [],
  records: [],
  configs: []
}));
check(
  await queryPage.getByText('当前Mac暂无兼容数据', { exact: true }).isVisible(),
  'Empty Mac catalog state is missing'
);
check(await queryPage.locator('[data-state-action="reload"]').count() === 1, 'Empty Mac catalog has no reload action');
await queryPage.locator('[data-state-action="reload"]').click();
await queryPage.waitForTimeout(500);
check(await queryPage.locator('[data-filter-select]').count() === 3, 'Empty Mac catalog did not recover');

await queryPage.locator('[data-filter-trigger="game"]').click();
const queryCover = queryPage.locator('[data-filter-option="game"] img').first();
expectedMissingCoverError = true;
await queryCover.evaluate((image) => {
  image.src = 'assets/compatibility/missing-local-cover.jpg';
});
await queryPage.locator('[aria-label="封面加载失败"]').first().waitFor();
check(
  await queryPage.locator('[aria-label="封面加载失败"]').count() === 1,
  'Broken local cover did not render the fallback'
);
check(expectedMissingCoverError === false, 'Missing-cover error was not observed');
```

In `render()`, treat a platform catalog with no valid compatibility records as empty even if orphan games or hardware survived normalization:

```js
} else if (activeCatalog().records.length === 0) {
  content = renderState(
    "当前" + platformLabel() + "暂无兼容数据",
    "当前平台暂时没有可展示的兼容记录，请重新加载。",
    "reload"
  );
```

This replaces the old `filteredCatalog().games.length === 0` condition and keeps invalid-reference catalogs recoverable.

- [ ] **Step 4: Reset every dependent state in `applyPlatform()`**

Replace the old single-game reset with:

```js
function resetQueryState() {
  state.filters = { gameId: null, hardwareId: null, ratingMin: null };
  state.queries = { game: "", hardware: "", rating: "" };
  state.openFilter = null;
  state.sort = { field: "rating", direction: "desc" };
  state.viewer = { recordId: null, configId: null };
  clearDownloadState();
}

function applyPlatform(platform, source) {
  const nextPlatform = normalizePlatform(platform) || "android";
  const changed = state.platform !== nextPlatform || state.platformSource !== source;
  state.platform = nextPlatform;
  state.platformSource = source;
  if (changed) resetQueryState();
  render();
}
```

In `setCatalog`, close an invalid viewer and clear selected filters whose IDs no longer exist:

```js
const current = activeCatalog();
if (!current.games.some((game) => game.id === state.filters.gameId)) state.filters.gameId = null;
if (!current.hardware.some((item) => item.id === state.filters.hardwareId)) state.filters.hardwareId = null;
if (!current.records.some((record) => record.id === state.viewer.recordId)) {
  state.viewer = { recordId: null, configId: null };
  clearDownloadState();
}
```

- [ ] **Step 5: Run all interaction and recovery tests**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
```

Expected: PASS for Android game/GPU/rating combinations, Mac chip mapping, platform reset, invalid references, no-candidate, no-result, empty catalog, reload and local-cover fallback.

- [ ] **Step 6: Commit platform and recovery behavior**

```powershell
git add -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/capture-compatibility-webview-demo.mjs"
git commit -m "test: cover compatibility filter isolation"
```

### Task 6: Preserve Web/App downloads inside the viewer

**Files:**
- Modify: `tools/capture-compatibility-webview-demo.mjs`
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [ ] **Step 1: Move the existing Web download test into the open viewer flow**

Use:

```js
await page.locator('[data-demo-platform="android"]').click();
await page.locator('[data-filter-trigger="game"]').click();
await page.locator('[data-filter-query="game"]').fill('艾尔登');
await page.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await page.locator('[data-config-open="android_elden_oneplus"]:visible').click();
const downloadPromise = page.waitForEvent('download');
await page.locator('[data-config-download="cfg_android_elden"]').click();
const webDownload = await downloadPromise;
check(
  webDownload.suggestedFilename() === 'elden-ring-android-720p.gamehub.json',
  'Web download filename is wrong: ' + webDownload.suggestedFilename()
);
check(
  (await page.locator('[data-config-viewer] .download-message.success').innerText()).includes('已发起下载'),
  'Web download feedback is missing inside viewer'
);
await webDownload.delete();
```

Expected before implementation adjustment: FAIL if download lookup still assumes a selected game or inline config.

- [ ] **Step 2: Resolve downloads only through the active viewer record**

Update `startDownload(configId)` lookup:

```js
const config = activeCatalog().configs.find((item) => item.id === configId);
const record = activeCatalog().records.find((item) => item.id === state.viewer.recordId);
if (!config || !record || config.recordId !== record.id || !record.configIds.includes(config.id)) {
  setDownloadResult("", false, "配置与当前兼容记录不一致，请重新选择");
  return;
}
```

Keep the existing payload fields and add `recordId`:

```js
const payload = JSON.stringify({
  requestId,
  platform: state.platform,
  recordId: record.id,
  gameId: record.gameId,
  configId: config.id,
  fileName: config.fileName
});
```

- [ ] **Step 3: Keep the existing App Bridge safety assertions**

Recreate the Bridge/Blob spies because Task 2 replaced the old capture-script body:

```js
await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.__blobCalls = 0;
  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (...args) => {
    window.__blobCalls += 1;
    return originalCreateObjectURL(...args);
  };
  window.GameHubBridge = {
    downloadConfig(payload) {
      window.__bridgeCalls.push(JSON.parse(payload));
      return Promise.resolve({ ok: true, message: 'App 已接收下载任务' });
    }
  };
});

await bridgePage.locator('[data-config-open="mac_elden_mbp_m4pro"]:visible').click();
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.locator('[data-config-viewer] .download-message.success').waitFor();
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'App Bridge call count is not one');
check(await bridgePage.evaluate(() => window.__blobCalls) === 0, 'App download also triggered Web Blob download');
const firstBridgePayload = await bridgePage.evaluate(() => window.__bridgeCalls[0]);
check(firstBridgePayload.platform === 'mac', 'App Bridge payload platform is not Mac');
check(firstBridgePayload.recordId === 'mac_elden_mbp_m4pro', 'App Bridge payload record ID is wrong');
check(firstBridgePayload.configId === 'cfg_mac_elden', 'App Bridge payload config ID is wrong');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.success').innerText()).includes('App 已接收下载任务'),
  'Promise success feedback is missing inside viewer'
);
```

Add the duplicate-callback, synchronous-return, exception, timeout, duplicate-click and late-callback cases immediately after the Promise-success case:

```js
const promiseSuccessText = await bridgePage.locator('[data-config-viewer] .download-message.success').innerText();
const duplicateSuccessAccepted = await bridgePage.evaluate((requestId) => {
  return window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: false,
    message: '重复回调'
  });
}, firstBridgePayload.requestId);
check(duplicateSuccessAccepted === false, 'Duplicate callback after Promise success was accepted');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.success').innerText()) === promiseSuccessText,
  'Duplicate callback changed the Promise success state'
);

await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.GameHubBridge.downloadConfig = (payload) => {
    window.__bridgeCalls.push(JSON.parse(payload));
    return { ok: true, message: 'App 已同步接收下载任务' };
  };
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
await bridgePage.locator('[data-config-viewer] .download-message.success').waitFor();
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'Synchronous Bridge call count is not one');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.success').innerText()).includes('App 已同步接收下载任务'),
  'Synchronous object success feedback is missing inside viewer'
);

await bridgePage.evaluate(() => {
  window.GameHubBridge.downloadConfig = () => {
    throw new Error('bridge unavailable');
  };
});
await bridgePage.locator('[data-config-download="cfg_mac_elden"]').click();
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.error').innerText()).includes('App 连接不可用'),
  'Bridge exception feedback is missing inside viewer'
);

await bridgePage.evaluate(() => {
  window.__bridgeCalls = [];
  window.GameHubBridge.downloadConfig = (payload) => {
    window.__bridgeCalls.push(JSON.parse(payload));
    return undefined;
  };
  document.querySelector('[data-config-download="cfg_mac_elden"]').click();
  document.querySelector('[data-config-download="cfg_mac_elden"]').click();
});
check(await bridgePage.evaluate(() => window.__bridgeCalls.length) === 1, 'Pending download was submitted twice');
const timedOutRequestId = await bridgePage.evaluate(() => window.__bridgeCalls[0].requestId);
await bridgePage.waitForTimeout(3200);
const timeoutText = await bridgePage.locator('[data-config-viewer] .download-message.error').innerText();
check(timeoutText.includes('App 响应超时'), 'Pending download did not time out inside viewer');
const lateCallbackAccepted = await bridgePage.evaluate((requestId) => {
  return window.GameHubCompatibility.onDownloadResult({
    requestId,
    ok: true,
    message: '迟到成功'
  });
}, timedOutRequestId);
check(lateCallbackAccepted === false, 'Late callback was accepted');
check(
  (await bridgePage.locator('[data-config-viewer] .download-message.error').innerText()) === timeoutText,
  'Late callback overwrote the timeout state'
);
check(await bridgePage.evaluate(() => window.__blobCalls) === 0, 'App regression cases triggered Web Blob download');
```

All Promise success, synchronous object success, exception, timeout, duplicate click, duplicate callback and late callback messages must be located inside `[data-config-viewer]`.

- [ ] **Step 4: Run download regression and commit**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
```

Expected: Web Blob and App Bridge are mutually exclusive; viewer stays open through pending/success/error states; repeated or late callbacks do not alter terminal state.

Commit:

```powershell
git add -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/capture-compatibility-webview-demo.mjs"
git commit -m "fix: route config downloads through record viewer"
```

### Task 7: Generate the final eight screenshot artifacts

**Files:**
- Modify: `tools/capture-compatibility-webview-demo.mjs`
- Replace: `test-results/compatibility-platform-aware-h5/*.png`

- [ ] **Step 1: Replace screenshot names with the new review set**

Use exactly:

```js
const screenshotNames = [
  '01-android-filters-portrait.png',
  '02-android-multi-records-portrait.png',
  '03-android-config-fullscreen.png',
  '04-mac-filters-portrait.png',
  '05-mac-multi-records-portrait.png',
  '06-mac-config-fullscreen.png',
  '07-desktop-record-table.png',
  '08-desktop-config-dialog.png'
];
```

Before capture, remove only the previous seven task screenshot filenames through PowerShell `Remove-Item -LiteralPath` after resolving each exact path inside `test-results/compatibility-platform-aware-h5`; do not delete the directory recursively.

- [ ] **Step 2: Capture each required state**

Capture these exact states:

```text
01 Android 390×844: three closed filter controls and initial prompt
02 Android 390×844: Elden Ring + Adreno 830 + ≥4, two record cards visible
03 Android 390×844: config viewer full-screen with applicability and download action
04 Mac 390×844: Game / Mac model or Apple chip / minimum rating controls
05 Mac 390×844: Elden Ring multi-record cards without Android fields
06 Mac 390×844: config viewer full-screen with Apple chip and macOS range
07 Desktop ≥1180px: result table with multiple rows and all competitor fields
08 Desktop ≥1180px: centered config dialog over preserved result table
```

Use `screenshotFrame()` for Demo preview states and `page.screenshot()` for the real 390×844 full-screen viewer so the evidence matches what the user sees.

Implement the screenshot sequence exactly as follows:

```js
const androidShotPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(androidShotPage, 'android-shot');
await androidShotPage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
await androidShotPage.screenshot({ path: path.join(outputDir, screenshotNames[0]), fullPage: true });

await androidShotPage.locator('[data-filter-trigger="game"]').click();
await androidShotPage.locator('[data-filter-query="game"]').fill('艾尔登');
await androidShotPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await androidShotPage.locator('[data-filter-trigger="hardware"]').click();
await androidShotPage.locator('[data-filter-query="hardware"]').fill('Adreno 830');
await androidShotPage.locator('[data-filter-option="hardware"][data-option-value="android_gpu_adreno830"]').click();
await androidShotPage.locator('[data-filter-trigger="rating"]').click();
await androidShotPage.locator('[data-filter-query="rating"]').fill('4');
await androidShotPage.locator('[data-filter-option="rating"][data-option-value="4"]').click();
await androidShotPage.screenshot({ path: path.join(outputDir, screenshotNames[1]), fullPage: true });

await androidShotPage.locator('[data-config-open="android_elden_oneplus"]:visible').click();
await androidShotPage.screenshot({ path: path.join(outputDir, screenshotNames[2]), fullPage: false });
await androidShotPage.locator('[data-config-close]').first().click();

const macShotPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observePage(macShotPage, 'mac-shot');
await macShotPage.goto(pathToFileURL(demoPath).href + '?platform=mac', { waitUntil: 'load' });
await macShotPage.screenshot({ path: path.join(outputDir, screenshotNames[3]), fullPage: true });
await macShotPage.locator('[data-filter-trigger="game"]').click();
await macShotPage.locator('[data-filter-query="game"]').fill('艾尔登');
await macShotPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await macShotPage.screenshot({ path: path.join(outputDir, screenshotNames[4]), fullPage: true });
await macShotPage.locator('[data-config-open="mac_elden_mbp_m4pro"]:visible').click();
await macShotPage.screenshot({ path: path.join(outputDir, screenshotNames[5]), fullPage: false });
await macShotPage.locator('[data-config-close]').first().click();

const desktopShotPage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
observePage(desktopShotPage, 'desktop-shot');
await desktopShotPage.goto(pathToFileURL(demoPath).href, { waitUntil: 'load' });
await desktopShotPage.locator('[data-preview="desktop"]').click();
await desktopShotPage.locator('[data-filter-trigger="game"]').click();
await desktopShotPage.locator('[data-filter-query="game"]').fill('艾尔登');
await desktopShotPage.locator('[data-filter-option="game"][data-option-value="steam_1245620"]').click();
await desktopShotPage.locator('.frame').screenshot({ path: path.join(outputDir, screenshotNames[6]) });
await desktopShotPage.locator('[data-config-open="android_elden_oneplus"]:visible').click();
await desktopShotPage.locator('.frame').screenshot({ path: path.join(outputDir, screenshotNames[7]) });
```

Close the evidence pages before `browser.close()`:

```js
await androidShotPage.close();
await macShotPage.close();
await desktopShotPage.close();
```

- [ ] **Step 3: Strengthen responsive assertions**

For every screenshot state, call `assertNoHorizontalOverflow()` and `assertTouchTargets()` where buttons/inputs are visible. Add:

```js
check(await page.locator('[data-record-table]').isVisible(), 'Desktop record table is hidden');
check(await page.locator('[data-record-cards]').isHidden(), 'Desktop record cards are visible');
check(await phonePage.locator('[data-record-cards]').isVisible(), 'Phone record cards are hidden');
check(await phonePage.locator('[data-record-table]').isHidden(), 'Phone record table is visible');
```

- [ ] **Step 4: Run the complete capture**

Run:

```powershell
node tools/capture-compatibility-webview-demo.mjs
```

Expected final line:

```text
PASS: three searchable filters, multi-record results, Android/Mac isolation, responsive config viewer, Web/App downloads, recovery, and eight screenshots
```

- [ ] **Step 5: Inspect all eight images against a fixed checklist**

Open every PNG with the available image viewer and verify:

```text
- No clipped dropdown, record card, table cell, dialog header or download button
- Three filters have clear labels and visible current values
- Minimum rating says “分及以上”
- Same game visibly appears in more than one record
- Android images contain no Mac/Apple/macOS fields
- Mac images contain no Android/Adreno/phone fields
- Mobile config viewer fills the frame; desktop config viewer is centered
- Text hierarchy, black/gold palette, spacing and local covers remain consistent
```

Any failed checklist item keeps this task incomplete; correct the H5 or capture state and rerun Step 4 before committing.

- [ ] **Step 6: Commit final screenshots and capture script**

```powershell
git add -- "tools/capture-compatibility-webview-demo.mjs" "test-results/compatibility-platform-aware-h5"
git commit -m "test: capture multi-filter compatibility H5"
```

### Task 8: Final regression and Delivery submission

**Files:**
- Verify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Verify: `tools/verify-compatibility-webview-demo.mjs`
- Verify: `tools/capture-compatibility-webview-demo.mjs`
- Verify: `test-results/compatibility-platform-aware-h5/*.png`
- Create with `apply_patch`: `.tmp/GUANWANGGAID-4-multi-filter-delivery.json`

- [ ] **Step 1: Re-read the scoped task and all comments**

Run:

```powershell
taskctl.cmd issue get 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json
taskctl.cmd comment list 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json
```

Expected before continuing: project `guanwang-gaidong`, identifier `GUANWANGGAID-4`, status `in_progress`, development context still matches Task 0, and no new unimplemented rework comment. If status, context or requirements changed, stop without submitting.

- [ ] **Step 2: Run the final regression suite**

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
git diff --check -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs" "tools/capture-compatibility-webview-demo.mjs" "docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md" "docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md"
```

Expected: both scripts pass and `git diff --check` is silent.

- [ ] **Step 3: Verify only task files are committed or staged**

```powershell
git status --short -- "demos/适合本机/盖世游戏适合本机WebView-demo.html" "tools/verify-compatibility-webview-demo.mjs" "tools/capture-compatibility-webview-demo.mjs" "docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md" "docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md" "test-results/compatibility-platform-aware-h5"
git log -8 --oneline -- "demos/适合本机/盖世游戏适合本机WebView-demo.html"
```

Expected: no uncommitted task files remain; unrelated dirty-worktree files are untouched.

- [ ] **Step 4: Create the UTF-8 ready manifest with `apply_patch`**

Write exactly this structure to `.tmp/GUANWANGGAID-4-multi-filter-delivery.json`:

```json
{
  "conclusion": "ready",
  "summaryItems": [
    "将单游戏查询返工为游戏、硬件和最低评分三个可搜索快捷筛选",
    "支持单项查询、AND 组合过滤及同一游戏的多条兼容运行记录",
    "按平台映射 Android 设备或 GPU 与 Mac 机型或 Apple 芯片",
    "使用桌面表格、手机卡片以及响应式启动配置详情",
    "保留浏览器与 App 配置下载，并补齐异常恢复和平台防串线"
  ],
  "acceptanceSteps": [
    "打开可操作 H5，分别使用游戏、硬件和最低评分三个下拉框搜索并选择候选",
    "单独或组合选择筛选条件，确认结果即时变化且同一游戏可出现多条运行记录",
    "切换 Android 与 Mac，确认硬件候选、结果字段和配置不会跨平台串线",
    "在桌面打开配置居中弹窗，在手机打开配置全屏浮层，关闭后确认筛选和结果仍保留",
    "查看八张验收截图，并验证浏览器 Blob 与 App Bridge 下载反馈"
  ],
  "attentionItems": [
    "Demo 使用本地模拟目录验证完整体验，不代表正式全量兼容数据库",
    "正式 App 下载仍需接入 GameHubBridge.downloadConfig，页面不提供一键应用"
  ],
  "technicalDetails": "验证命令：node tools/verify-compatibility-webview-demo.mjs；node tools/capture-compatibility-webview-demo.mjs；git diff --check -- <本任务文件>。结果必须覆盖三项可搜索筛选、AND 组合、多运行记录、Android/Mac 隔离、桌面表格、手机卡片、配置弹窗/全屏浮层、Web/App 下载互斥、异常恢复和八张截图。"
}
```

- [ ] **Step 5: Create the Delivery**

```powershell
$deliveryResponse = taskctl.cmd delivery create GUANWANGGAID-4 --manifest-file ".tmp\GUANWANGGAID-4-multi-filter-delivery.json" --json | ConvertFrom-Json
$deliveryId = $deliveryResponse.delivery.id
if ([string]::IsNullOrWhiteSpace($deliveryId)) { throw "Delivery ID missing" }
```

- [ ] **Step 6: Register the operable Demo and both Markdown sources**

```powershell
taskctl.cmd delivery artifact add $deliveryId --title "跨平台兼容性多参数查询 H5" --kind demo --path "demos/适合本机" --entry "盖世游戏适合本机WebView-demo.html" --content-type "text/html" --json
taskctl.cmd delivery artifact add $deliveryId --title "多参数查询改版设计规格" --kind markdown --path "docs/superpowers/specs/2026-08-10-gamehub-compatibility-platform-aware-h5-design.md" --content-type "text/markdown" --json
taskctl.cmd delivery artifact add $deliveryId --title "多参数查询实施计划" --kind markdown --path "docs/superpowers/plans/2026-08-10-gamehub-compatibility-platform-aware-h5.md" --content-type "text/markdown" --json
```

Expected: every response has `validationStatus: "ready"`.

- [ ] **Step 7: Register all eight image artifacts one by one**

```powershell
taskctl.cmd delivery artifact add $deliveryId --title "Android 三筛选初始态" --kind image --path "test-results/compatibility-platform-aware-h5/01-android-filters-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Android 多条兼容记录" --kind image --path "test-results/compatibility-platform-aware-h5/02-android-multi-records-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Android 配置全屏浮层" --kind image --path "test-results/compatibility-platform-aware-h5/03-android-config-fullscreen.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 三筛选初始态" --kind image --path "test-results/compatibility-platform-aware-h5/04-mac-filters-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 多条兼容记录" --kind image --path "test-results/compatibility-platform-aware-h5/05-mac-multi-records-portrait.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "Mac 配置全屏浮层" --kind image --path "test-results/compatibility-platform-aware-h5/06-mac-config-fullscreen.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "桌面多记录表格" --kind image --path "test-results/compatibility-platform-aware-h5/07-desktop-record-table.png" --content-type "image/png" --json
taskctl.cmd delivery artifact add $deliveryId --title "桌面配置居中弹窗" --kind image --path "test-results/compatibility-platform-aware-h5/08-desktop-config-dialog.png" --content-type "image/png" --json
```

Expected: every image is readable and returns `previewKind: "image"`.

- [ ] **Step 8: Re-read the latest version and submit once**

```powershell
$issueResponse = taskctl.cmd issue get 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json | ConvertFrom-Json
if ($issueResponse.task.status -ne "in_progress") { throw "Task status changed: $($issueResponse.task.status)" }
$latestVersion = $issueResponse.task.version
taskctl.cmd delivery submit $deliveryId --if-version $latestVersion --json
```

Expected: Delivery status becomes `submitted`, issue status becomes `in_review`, and issue version increments exactly once. Do not use `issue move --status in_review`; do not move the issue to `done`.
