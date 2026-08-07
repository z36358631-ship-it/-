# GameHub Compatibility Reference Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current multi-view compatibility library with one GameHub-styled page that uses three instant filters, local game covers, a desktop result table, and mobile result cards.

**Architecture:** Keep one offline HTML artifact and one normalized catalog. A single state object and one `filteredRuns()` pipeline drive both responsive result layouts; the viewport changes presentation only. Static and Playwright verifiers replace all old detail/config contracts with the new reference-page flow.

**Tech Stack:** HTML5, CSS media queries, vanilla JavaScript, local JPEG assets, Node.js built-ins, Playwright Core, taskctl CLI.

---

## Scope and file map

The work is one testable subsystem: a single-page offline compatibility query Demo.

- Modify `tools/verify-compatibility-webview-demo.mjs`: define the new static contract, local-cover checks, forbidden legacy markers, offline policy, and inline JavaScript syntax check.
- Create `demos/适合本机/assets/compatibility/black-myth-wukong.jpg`: local cover for Black Myth: Wukong.
- Create `demos/适合本机/assets/compatibility/elden-ring.jpg`: local cover for Elden Ring.
- Create `demos/适合本机/assets/compatibility/hades.jpg`: local cover for Hades.
- Create `demos/适合本机/assets/compatibility/sekiro.jpg`: local cover for Sekiro.
- Create `demos/适合本机/assets/compatibility/cyberpunk-2077.jpg`: local cover for Cyberpunk 2077.
- Create `demos/适合本机/assets/compatibility/starfield.jpg`: local cover for Starfield.
- Replace `demos/适合本机/盖世游戏适合本机WebView-demo.html`: rebuild the page shell, GameHub visuals, data Adapter, selectors, popular games, unified results, state panels, and public WebView API.
- Replace `tools/capture-compatibility-webview-demo.mjs`: verify desktop/mobile flows, shared state, sorting, recovery, invalid data, offline behavior, and visual evidence.
- Create screenshots in `test-results/compatibility-reference-redesign/`: desktop initial/results, mobile initial/results, and empty result.
- Use `docs/superpowers/specs/2026-08-07-gamehub-compatibility-reference-redesign-design.md` as the accepted design source.

### Task 1: Replace the static contract with a failing specification

**Files:**
- Modify: `tools/verify-compatibility-webview-demo.mjs`
- Test: `demos/适合本机/盖世游戏适合本机WebView-demo.html`

- [ ] **Step 1: Replace the required and forbidden contract lists**

Keep the existing path resolution and `fail()` helper. Replace the old `required` array and add the local cover list:

```js
const required = [
  'id="compatibility-app"',
  'id="game-select"',
  'id="target-select"',
  'id="rating-select"',
  'data-popular-game',
  'data-result-row',
  'data-result-card',
  'data-sort-field="rating"',
  'data-sort-field="verifiedAt"',
  'window.GameHubCompatibility',
  'setContext(context)',
  'setCatalog(catalog)',
  'setCatalogLoading()',
  'setCatalogError()',
  'filteredRuns()',
  'renderPopularGames()',
  'renderResults()',
  '选择游戏',
  '设备 / GPU',
  '最低评价（可选）',
  '热门游戏',
  '平均 FPS',
  '验证时间'
];

const legacy = [
  'id="game-view"',
  'id="gpu-view"',
  'id="config-view"',
  '按游戏查',
  '按 GPU 查',
  'filter-sidebar',
  'filter-panel',
  'downloadAndApplyConfig',
  'downloadConfig',
  'openGame(gameId',
  'openGpu(gpuId',
  'openConfig(configId'
];

const covers = [
  'black-myth-wukong.jpg',
  'elden-ring.jpg',
  'hades.jpg',
  'sekiro.jpg',
  'cyberpunk-2077.jpg',
  'starfield.jpg'
];
```

After the required loop, reject every legacy marker and require non-trivial local JPEGs:

```js
for (const marker of legacy) {
  if (html.includes(marker)) fail(`legacy contract remains: ${marker}`);
}

const coverDir = path.join(path.dirname(demoPath), 'assets', 'compatibility');
for (const cover of covers) {
  const coverPath = path.join(coverDir, cover);
  if (!fs.existsSync(coverPath)) fail(`cover not found: ${cover}`);
  else if (fs.statSync(coverPath).size < 20_000) fail(`cover is too small: ${cover}`);
}
```

Retain the existing external script, stylesheet, iframe, network URL, and inline script syntax checks. Change the success line to:

```js
console.log('PASS: compatibility reference redesign contracts, local assets, offline policy, and JavaScript syntax');
```

- [ ] **Step 2: Run the static verifier and confirm it fails for the old Demo**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: exit code `1`, including `missing contract: id="compatibility-app"` and legacy contract failures.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- tools/verify-compatibility-webview-demo.mjs
git commit -m "test: define compatibility reference redesign contract"
```

### Task 2: Add the six local game covers

**Files:**
- Create: `demos/适合本机/assets/compatibility/black-myth-wukong.jpg`
- Create: `demos/适合本机/assets/compatibility/elden-ring.jpg`
- Create: `demos/适合本机/assets/compatibility/hades.jpg`
- Create: `demos/适合本机/assets/compatibility/sekiro.jpg`
- Create: `demos/适合本机/assets/compatibility/cyberpunk-2077.jpg`
- Create: `demos/适合本机/assets/compatibility/starfield.jpg`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [ ] **Step 1: Create the scoped asset directory**

```powershell
New-Item -ItemType Directory -Force -Path 'demos\适合本机\assets\compatibility'
```

Expected: the directory exists inside the Demo directory; no other asset directories change.

- [ ] **Step 2: Download the verified 600×900 Steam library covers**

```powershell
Invoke-WebRequest -Uri 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/library_600x900.jpg' -OutFile 'demos\适合本机\assets\compatibility\black-myth-wukong.jpg'
Invoke-WebRequest -Uri 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900.jpg' -OutFile 'demos\适合本机\assets\compatibility\elden-ring.jpg'
Invoke-WebRequest -Uri 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900.jpg' -OutFile 'demos\适合本机\assets\compatibility\hades.jpg'
Invoke-WebRequest -Uri 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/814380/library_600x900.jpg' -OutFile 'demos\适合本机\assets\compatibility\sekiro.jpg'
Invoke-WebRequest -Uri 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900.jpg' -OutFile 'demos\适合本机\assets\compatibility\cyberpunk-2077.jpg'
Invoke-WebRequest -Uri 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_600x900.jpg' -OutFile 'demos\适合本机\assets\compatibility\starfield.jpg'
```

Expected: six `image/jpeg` files, each larger than 20 KB. These exact URLs returned HTTP 200 during plan preparation on 2026-08-07.

- [ ] **Step 3: Check asset sizes and names**

```powershell
Get-ChildItem -LiteralPath 'demos\适合本机\assets\compatibility' -Filter '*.jpg' |
  Sort-Object Name |
  Select-Object Name,Length
```

Expected: exactly six rows and no `Length` below `20000`.

- [ ] **Step 4: Commit the local covers**

```powershell
git add -- demos/适合本机/assets/compatibility
git commit -m "assets: add local compatibility game covers"
```

### Task 3: Rebuild the single-page shell, GameHub visuals, and normalized catalog

**Files:**
- Replace: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [ ] **Step 1: Replace the old four-view body with one page**

Set the document title to `盖世游戏｜游戏兼容性`, retain the existing viewport meta tag, and replace the body with this exact shell:

```html
<body>
  <div class="workbench">
    <div class="demo-bar">
      <div class="demo-name"><span class="demo-mark">GH</span><span>游戏兼容性 · Web Demo</span></div>
      <div class="demo-controls" aria-label="预览尺寸">
        <button class="control active" data-preview="desktop">桌面</button>
        <button class="control" data-preview="mobile">移动</button>
      </div>
    </div>
    <div class="frame" data-preview="desktop">
      <main id="compatibility-app" class="app"></main>
    </div>
  </div>
</body>
```

- [ ] **Step 2: Add GameHub black-gold responsive styles**

Define the shared tokens and responsive frame without any purple/cyan brand gradient:

```css
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#050505;--surface:#141414;--raised:#1d1d1f;--line:#343434;
  --text:#fff;--sub:#d8d8dc;--muted:#85878c;--gold:#ffcc43;
  --green:#33d8a4;--orange:#ffb54a;--red:#ff667f;
  --font:'MiSans VF','MiSans','PingFang SC',-apple-system,BlinkMacSystemFont,sans-serif;
}
body{min-height:100vh;background:#0d0e10;color:var(--text);font-family:var(--font)}
button,input{font:inherit}button{border:0;color:inherit;cursor:pointer}
button:focus-visible,input:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.workbench{min-height:100vh;display:grid;place-items:center;padding:24px;background:#0d0e10}
.frame{width:min(1150px,calc(100vw - 48px));height:min(820px,calc(100vh - 92px));overflow:hidden;border:1px solid #2e2e31;border-radius:20px;background:var(--bg)}
.app{height:100%;overflow:auto;background:var(--bg)}
.page{width:min(100%,1150px);min-height:100%;margin:auto;padding:24px 28px 40px}
.filter-card,.result-card{border:1px solid var(--line);border-radius:14px;background:rgba(20,20,20,.96)}
.filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:20px}
.popular-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}
.result-mobile{display:none}
.frame[data-preview=mobile]{width:390px;height:844px}
.frame[data-preview=mobile] .page{padding:16px 14px 28px}
.frame[data-preview=mobile] .filter-grid{grid-template-columns:1fr;padding:16px}
.frame[data-preview=mobile] .popular-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.frame[data-preview=mobile] .result-desktop{display:none}
.frame[data-preview=mobile] .result-mobile{display:grid;gap:10px}
@media(max-width:520px){.workbench{padding:0}.demo-bar{position:fixed;z-index:80;right:8px;bottom:8px}.frame,.frame[data-preview=desktop],.frame[data-preview=mobile]{width:100vw;height:100vh;border:0;border-radius:0}}
.demo-bar{width:min(1150px,calc(100vw - 48px));min-height:48px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:7px 10px 7px 14px;border:1px solid #2e2e31;border-radius:12px;background:#17181b}
.demo-name,.demo-controls{display:flex;align-items:center;gap:8px}.demo-name{font-size:14px}.demo-mark{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;color:#171717;background:var(--gold);font-size:11px;font-weight:700}
.control{min-height:32px;padding:0 11px;border-radius:8px;color:#9b9da2;background:transparent}.control.active{color:#171717;background:var(--gold);font-weight:650}
.page-header{padding:8px 0 24px}.back-button{min-height:34px;margin-bottom:18px;color:var(--gold);background:transparent}.page-header h1{font-size:32px;line-height:1.2}.page-header p{margin-top:8px;color:var(--muted);font-size:15px}
.filter-field{position:relative;min-width:0}.filter-field label{display:block;margin-bottom:8px;color:var(--sub);font-size:12px}.select-trigger,.filter-field select{width:100%;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border:1px solid var(--line);border-radius:9px;color:var(--muted);background:#0d0d0e;text-align:left}.select-trigger.selected{color:var(--text)}
.field-clear{display:block;margin:6px 0 0 auto;color:var(--muted);background:transparent;font-size:11px}.field-clear:hover{color:var(--gold)}
.picker{position:absolute;z-index:30;top:76px;left:0;width:100%;padding:8px;border:1px solid var(--line);border-radius:10px;background:#171719;box-shadow:0 16px 40px rgba(0,0,0,.5)}
.picker input{width:100%;height:38px;padding:0 10px;border:1px solid var(--line);border-radius:7px;color:var(--text);background:#0d0d0e}.picker-list{max-height:280px;margin-top:7px;overflow:auto}.picker-option{width:100%;display:flex;align-items:center;gap:9px;padding:8px;border-radius:7px;background:transparent;text-align:left}.picker-option:hover{background:var(--raised)}.picker-option img{width:32px;height:44px;border-radius:5px;object-fit:cover}.picker-option span,.picker-option strong,.picker-option small{min-width:0;display:block}.picker-option strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.picker-option small{margin-top:3px;color:var(--muted);font-size:10px}.picker-empty{padding:18px;text-align:center;color:var(--muted);font-size:12px}
.popular-section,.result-section{margin-top:18px;padding:20px}.section-head,.result-summary{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}.section-head h2,.result-summary h2{font-size:18px}.section-head p,.result-summary p{margin-top:4px;color:var(--muted);font-size:11px}
.popular-game{min-width:0;background:transparent;text-align:left}.game-cover{position:relative;display:block;overflow:hidden;aspect-ratio:2/3;border-radius:10px;background:var(--raised)}.game-cover img{width:100%;height:100%;display:block;object-fit:cover}.cover-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--gold);font-weight:700}.popular-game strong{display:block;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.popular-game>span:last-child{display:block;margin-top:3px;color:var(--muted);font-size:10px}
.result-summary>button,.state-panel button{min-height:34px;padding:0 12px;border-radius:8px;color:#171717;background:var(--gold);font-size:11px;font-weight:650}.result-desktop{overflow-x:auto}.result-table{width:100%;border-collapse:collapse;font-size:11px}.result-table th,.result-table td{padding:12px 10px;border-bottom:1px solid #29292c;text-align:left;vertical-align:top}.result-table th{color:#bbbcc0;font-weight:600}.result-table th button{color:inherit;background:transparent}.result-table small{display:block;margin-top:3px;color:var(--muted)}
.game-cell{min-width:132px;display:flex;align-items:center;gap:8px}.game-cell img{width:34px;height:48px;border-radius:5px;object-fit:cover}.game-cell span,.game-cell strong{min-width:0;display:block}.rating{color:var(--gold);white-space:nowrap}.tag{display:inline-flex;margin:0 4px 4px 0;padding:3px 6px;border-radius:999px;color:#ffd977;background:rgba(255,204,67,.1);white-space:nowrap}
.mobile-run{padding:13px;border:1px solid #303034;border-radius:11px;background:#18181a}.mobile-run-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.mobile-run-head>div:last-child{text-align:right}.mobile-run-head>div:last-child strong{display:block;margin-top:4px}.mobile-run dl{margin-top:12px}.mobile-run dl>div{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;padding:7px 0;border-top:1px solid #29292c}.mobile-run dt{color:var(--muted);font-size:10px}.mobile-run dd{color:var(--sub);font-size:10px;line-height:1.5}
.state-panel{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:18px;padding:28px;text-align:center}.state-panel h2{font-size:17px}.state-panel p{max-width:360px;margin:7px 0 14px;color:var(--muted);font-size:12px;line-height:1.6}
.frame[data-preview=mobile] .page-header h1{font-size:26px}.frame[data-preview=mobile] .picker{position:fixed;top:78px;right:12px;left:12px;width:auto}.frame[data-preview=mobile] .popular-section,.frame[data-preview=mobile] .result-section{padding:15px}.frame[data-preview=mobile] .demo-name{display:none}
```

- [ ] **Step 3: Define a single state and controlled cover map**

```js
const coverMap={
  wukong:'assets/compatibility/black-myth-wukong.jpg',
  elden:'assets/compatibility/elden-ring.jpg',
  hades:'assets/compatibility/hades.jpg',
  sekiro:'assets/compatibility/sekiro.jpg',
  cyberpunk:'assets/compatibility/cyberpunk-2077.jpg',
  starfield:'assets/compatibility/starfield.jpg'
};

const state={
  gameId:null,
  targetType:null,
  targetId:null,
  ratingMin:null,
  sortField:'rating',
  sortDirection:'desc',
  openPicker:null,
  gameQuery:'',
  targetQuery:'',
  context:null,
  catalogStatus:'ready',
  games:[],
  targets:[],
  runs:[]
};
```

- [ ] **Step 4: Add six games, searchable targets, and trustworthy runs**

Use the six accepted games and at least twelve records so every filter and sort has meaningful data:

```js
const mockCatalog={
  games:[
    {id:'steam_2358720',name:'黑神话：悟空',aliases:['BLACK MYTH WUKONG','悟空'],version:'1.0.15',coverKey:'wukong',popular:1},
    {id:'steam_1245620',name:'艾尔登法环',aliases:['ELDEN RING','老头环'],version:'1.16.1',coverKey:'elden',popular:2},
    {id:'steam_1145360',name:'哈迪斯',aliases:['HADES','黑帝斯'],version:'1.38290',coverKey:'hades',popular:3},
    {id:'steam_814380',name:'只狼：影逝二度',aliases:['SEKIRO','只狼'],version:'1.06',coverKey:'sekiro',popular:4},
    {id:'gog_1091500',name:'赛博朋克 2077',aliases:['CYBERPUNK 2077','赛博朋克'],version:'2.31',coverKey:'cyberpunk',popular:5},
    {id:'steam_1716740',name:'星空',aliases:['STARFIELD'],version:'1.15.222',coverKey:'starfield',popular:6}
  ],
  targets:[
    {id:'oneplus_13',type:'device',displayName:'一加 13',aliases:['OnePlus 13','骁龙 8 至尊版','Adreno 830'],deviceModel:'一加 13',soc:'骁龙 8 至尊版',gpu:'Adreno 830'},
    {id:'xiaomi_14',type:'device',displayName:'小米 14',aliases:['Xiaomi 14','骁龙 8 Gen 3','Adreno 750'],deviceModel:'小米 14',soc:'骁龙 8 Gen 3',gpu:'Adreno 750'},
    {id:'oneplus_11',type:'device',displayName:'一加 11',aliases:['OnePlus 11','骁龙 8 Gen 2','Adreno 740'],deviceModel:'一加 11',soc:'骁龙 8 Gen 2',gpu:'Adreno 740'},
    {id:'adreno_830',type:'gpu',displayName:'Adreno 830',aliases:['骁龙 8 至尊版'],deviceModel:'多款旗舰设备',soc:'Qualcomm',gpu:'Adreno 830'},
    {id:'mali_g720',type:'gpu',displayName:'Mali-G720',aliases:['天玑 9300'],deviceModel:'多款天玑设备',soc:'MediaTek',gpu:'Mali-G720'}
  ],
  runs:[
    {id:'run_wukong_13',gameId:'steam_2358720',targetId:'oneplus_13',gpu:'Adreno 830',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:5,avgFps:39,tags:['基本流畅'],notes:'首次进入新区域会短暂编译着色器。',sampleCount:96,verifiedAt:'2026-08-04'},
    {id:'run_wukong_14',gameId:'steam_2358720',targetId:'xiaomi_14',gpu:'Adreno 750',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:4,avgFps:31,tags:['需调低画质'],notes:'建议 720P 低画质。',sampleCount:63,verifiedAt:'2026-08-02'},
    {id:'run_elden_13',gameId:'steam_1245620',targetId:'oneplus_13',gpu:'Adreno 830',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:4,avgFps:35,tags:['基本流畅'],notes:'开放世界偶尔出现帧时间波动。',sampleCount:52,verifiedAt:'2026-08-03'},
    {id:'run_elden_14',gameId:'steam_1245620',targetId:'xiaomi_14',gpu:'Adreno 750',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:4,avgFps:30,tags:['需调低画质'],notes:'关闭光线追踪后更稳定。',sampleCount:41,verifiedAt:'2026-08-01'},
    {id:'run_hades_13',gameId:'steam_1145360',targetId:'oneplus_13',gpu:'Adreno 830',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:5,avgFps:60,tags:['稳定运行'],notes:'高画质可稳定运行。',sampleCount:83,verifiedAt:'2026-08-02'},
    {id:'run_hades_11',gameId:'steam_1145360',targetId:'oneplus_11',gpu:'Adreno 740',androidVersion:'14',appVersion:'6.1.0',kernelVersion:'Wine 9.1 · GS3',rating:5,avgFps:57,tags:['稳定运行'],notes:'中高画质表现稳定。',sampleCount:56,verifiedAt:'2026-07-31'},
    {id:'run_sekiro_13',gameId:'steam_814380',targetId:'oneplus_13',gpu:'Adreno 830',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:5,avgFps:52,tags:['基本流畅'],notes:'过场动画可能短暂掉帧。',sampleCount:64,verifiedAt:'2026-08-01'},
    {id:'run_sekiro_14',gameId:'steam_814380',targetId:'xiaomi_14',gpu:'Adreno 750',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:4,avgFps:46,tags:['基本流畅'],notes:'建议中画质。',sampleCount:48,verifiedAt:'2026-07-31'},
    {id:'run_cp_13',gameId:'gog_1091500',targetId:'oneplus_13',gpu:'Adreno 830',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:3,avgFps:31,tags:['可运行','波动明显'],notes:'市中心驾驶场景可能降至 25 FPS。',sampleCount:41,verifiedAt:'2026-07-31'},
    {id:'run_cp_14',gameId:'gog_1091500',targetId:'xiaomi_14',gpu:'Adreno 750',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:2,avgFps:22,tags:['不建议'],notes:'当前体验不稳定。',sampleCount:22,verifiedAt:'2026-07-28'},
    {id:'run_star_13',gameId:'steam_1716740',targetId:'oneplus_13',gpu:'Adreno 830',androidVersion:'15',appVersion:'6.1.0',kernelVersion:'Wine 9.2 · GS3',rating:2,avgFps:19,tags:['样本较少'],notes:'仅完成启动与短时测试。',sampleCount:2,verifiedAt:'2026-07-26'},
    {id:'run_hades_mali',gameId:'steam_1145360',targetId:'mali_g720',gpu:'Mali-G720',androidVersion:'14',appVersion:'6.1.0',kernelVersion:'Wine 9.1 · GS3',rating:4,avgFps:55,tags:['基本流畅'],notes:'个别房间切换会短暂卡顿。',sampleCount:34,verifiedAt:'2026-07-29'}
  ]
};
```

- [ ] **Step 5: Implement the defensive Adapter**

```js
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const text=(value,fallback='')=>(typeof value==='string'||typeof value==='number')?String(value).slice(0,240):fallback;
const number=(value,fallback=0,min=0,max=1_000_000)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
const list=value=>Array.isArray(value)?value:[];
const uniqueBy=(items,keyOf)=>{const seen=new Set();return items.filter(item=>{const key=keyOf(item);if(seen.has(key))return false;seen.add(key);return true})};

function normalizeCatalog(raw={}){
  raw=raw&&typeof raw==='object'?raw:{};
  const games=uniqueBy(list(raw.games).filter(Boolean).map((item,index)=>({
    id:text(item.id,`game_${index}`),name:text(item.name,'未命名游戏'),
    aliases:list(item.aliases).slice(0,10).map(value=>text(value)).filter(Boolean),
    version:text(item.version,'未记录'),coverKey:Object.hasOwn(coverMap,item.coverKey)?item.coverKey:'',
    popular:number(item.popular,999,1,999)
  })),item=>item.id);
  const targets=uniqueBy(list(raw.targets).filter(Boolean).map((item,index)=>({
    id:text(item.id,`target_${index}`),type:['device','gpu'].includes(item.type)?item.type:'gpu',
    displayName:text(item.displayName,'未知设备 / GPU'),aliases:list(item.aliases).slice(0,10).map(value=>text(value)).filter(Boolean),
    deviceModel:text(item.deviceModel,'未记录'),soc:text(item.soc,'未记录'),gpu:text(item.gpu,'未记录')
  })),item=>item.id);
  const gameIds=new Set(games.map(item=>item.id));
  const targetIds=new Set(targets.map(item=>item.id));
  const runs=uniqueBy(list(raw.runs).filter(item=>item&&gameIds.has(text(item.gameId))&&targetIds.has(text(item.targetId))).map((item,index)=>({
    id:text(item.id,`run_${index}`),gameId:text(item.gameId),targetId:text(item.targetId),gpu:text(item.gpu,'未记录'),
    androidVersion:text(item.androidVersion,'未记录'),appVersion:text(item.appVersion,'未记录'),kernelVersion:text(item.kernelVersion,'未记录'),
    rating:number(item.rating,1,1,5),avgFps:item.avgFps==null?null:number(item.avgFps,0,0,240),
    tags:list(item.tags).slice(0,5).map(value=>text(value)).filter(Boolean),notes:text(item.notes,'—'),
    sampleCount:number(item.sampleCount,0,0,1_000_000),verifiedAt:/^\d{4}-\d{2}-\d{2}$/.test(text(item.verifiedAt))?text(item.verifiedAt):'未记录'
  })),item=>item.id);
  return{games,targets,runs};
}
```

- [ ] **Step 6: Render the header and popular games as the first passing slice**

```js
function coverFor(game){return coverMap[game?.coverKey]||''}
function renderPopularGames(){
  const popular=[...state.games].sort((a,b)=>a.popular-b.popular).slice(0,6);
  return `<section class="result-card popular-section"><div class="section-head"><div><h2>热门游戏</h2><p>选择游戏，立即查看已验证的设备表现</p></div></div><div class="popular-grid">${popular.map(game=>`<button class="popular-game" data-popular-game="${esc(game.id)}"><span class="game-cover">${coverFor(game)?`<img src="${esc(coverFor(game))}" alt="${esc(game.name)}封面">`:'<span class="cover-fallback">GH</span>'}</span><strong>${esc(game.name)}</strong><span>查看兼容性</span></button>`).join('')}</div></section>`;
}

function render(){
  document.getElementById('compatibility-app').innerHTML=`<div class="page"><header class="page-header"><button class="back-button" aria-label="返回">← 返回</button><h1>游戏兼容性</h1><p>查看你的游戏能否在当前设备上流畅运行</p></header><section class="filter-card"><div class="filter-grid"></div></section>${renderPopularGames()}</div>`;
}
```

- [ ] **Step 7: Run the static verifier**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: local cover and legacy checks pass; remaining new selector/result contracts may still fail until Task 4.

- [ ] **Step 8: Commit the shell, visuals, catalog, and Adapter**

```powershell
git add -- demos/适合本机/盖世游戏适合本机WebView-demo.html
git commit -m "feat: rebuild compatibility page foundation"
```

### Task 4: Implement the three instant selectors and unified results

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/verify-compatibility-webview-demo.mjs`

- [ ] **Step 1: Add selectors whose selected value and search query are separate**

Use one renderer for game and target selectors and a native compact rating selector:

```js
const gameBy=id=>state.games.find(item=>item.id===id);
const targetBy=id=>state.targets.find(item=>item.id===id);
const normalizeQuery=value=>String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
const matches=(query,values)=>!query||values.some(value=>normalizeQuery(value).includes(query));

function selector({id,label,placeholder,value,query,items,type}){
  const open=state.openPicker===type;
  return `<div class="filter-field"><label for="${id}">${label}</label><button id="${id}" class="select-trigger ${value?'selected':''}" data-open-picker="${type}" aria-expanded="${open}"><span>${esc(value||placeholder)}</span><span aria-hidden="true">⌄</span></button>${open?`<div class="picker"><input data-picker-input="${type}" value="${esc(query)}" placeholder="搜索${esc(label)}"><div class="picker-list">${items.map(item=>`<button class="picker-option" data-select-${type}="${esc(item.id)}">${type==='game'?`<img src="${esc(coverFor(item))}" alt="">`:''}<span><strong>${esc(type==='game'?item.name:item.displayName)}</strong>${type==='target'?`<small>${esc(item.deviceModel)} · ${esc(item.gpu)}</small>`:''}</span></button>`).join('')||'<p class="picker-empty">没有匹配项</p>'}</div></div>`:''}${value?`<button class="field-clear" data-clear-field="${type}">清除</button>`:''}</div>`;
}

function renderFilters(){
  const gameQuery=normalizeQuery(state.gameQuery);
  const targetQuery=normalizeQuery(state.targetQuery);
  const games=state.games.filter(game=>matches(gameQuery,[game.name,...game.aliases]));
  const targets=state.targets.filter(target=>matches(targetQuery,[target.displayName,target.deviceModel,target.soc,target.gpu,...target.aliases]));
  return `<div class="filter-grid">${selector({id:'game-select',label:'选择游戏',placeholder:'搜索游戏名称',value:gameBy(state.gameId)?.name,query:state.gameQuery,items:games,type:'game'})}${selector({id:'target-select',label:'设备 / GPU',placeholder:'搜索手机型号或 GPU',value:targetBy(state.targetId)?.displayName,query:state.targetQuery,items:targets,type:'target'})}<div class="filter-field"><label for="rating-select">最低评价（可选）</label><select id="rating-select"><option value="">全部评价</option><option value="5">5 分</option><option value="4">4 分及以上</option><option value="3">3 分及以上</option><option value="2">2 分及以上</option><option value="1">1 分及以上</option></select>${state.ratingMin?'<button class="field-clear" data-clear-field="rating">清除</button>':''}</div></div>`;
}
```

- [ ] **Step 2: Add the single filtering and sorting pipeline**

```js
function hasFilters(){return Boolean(state.gameId||state.targetId||state.ratingMin)}

function filteredRuns(){
  const direction=state.sortDirection==='asc'?1:-1;
  return state.runs.filter(run=>!state.gameId||run.gameId===state.gameId)
    .filter(run=>!state.targetId||run.targetId===state.targetId)
    .filter(run=>state.ratingMin==null||run.rating>=state.ratingMin)
    .sort((left,right)=>{
      const primary=state.sortField==='verifiedAt'
        ?String(left.verifiedAt).localeCompare(String(right.verifiedAt))
        :left.rating-right.rating;
      if(primary)return primary*direction;
      return String(right.verifiedAt).localeCompare(String(left.verifiedAt));
    });
}
```

- [ ] **Step 3: Render one record vocabulary in desktop and mobile layouts**

```js
const stars=rating=>`<span class="rating" aria-label="${rating} 分">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span>`;
const environment=run=>`Android ${esc(run.androidVersion)} · 盖世 ${esc(run.appVersion)} · ${esc(run.kernelVersion)}`;
const gameCell=game=>`<div class="game-cell"><img src="${esc(coverFor(game))}" alt=""><span><strong>${esc(game?.name)}</strong><small>v${esc(game?.version)}</small></span></div>`;

function desktopRow(run){
  const game=gameBy(run.gameId),target=targetBy(run.targetId);
  return `<tr data-result-row="${esc(run.id)}"><td>${gameCell(game)}</td><td><strong>${esc(target?.displayName)}</strong><small>${esc(run.gpu)}</small></td><td>${esc(environment(run))}</td><td>${stars(run.rating)}</td><td>${run.avgFps==null?'—':`${run.avgFps} FPS`}</td><td>${run.tags.map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')||'—'}</td><td>${esc(run.notes)}</td><td>${run.sampleCount} 个样本<br>${esc(run.verifiedAt)}</td></tr>`;
}

function mobileCard(run){
  const game=gameBy(run.gameId),target=targetBy(run.targetId);
  return `<article class="mobile-run" data-result-card="${esc(run.id)}"><div class="mobile-run-head">${gameCell(game)}<div>${stars(run.rating)}<strong>${run.avgFps==null?'—':`${run.avgFps} FPS`}</strong></div></div><dl><div><dt>设备 / GPU</dt><dd>${esc(target?.displayName)} · ${esc(run.gpu)}</dd></div><div><dt>运行环境</dt><dd>${esc(environment(run))}</dd></div><div><dt>问题与备注</dt><dd>${run.tags.map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')||'—'} ${esc(run.notes)}</dd></div><div><dt>验证信息</dt><dd>${run.sampleCount} 个样本 · ${esc(run.verifiedAt)}</dd></div></dl></article>`;
}

function renderResults(){
  const runs=filteredRuns();
  if(!runs.length)return `<section class="result-card state-panel"><h2>暂无符合条件的兼容记录</h2><p>可以调整条件或清空筛选后重新查看。</p><button data-clear-all>清空筛选</button></section>`;
  const head=field=>`<button data-sort-field="${field}">${field==='rating'?'兼容评价':'验证时间'}${state.sortField===field?(state.sortDirection==='desc'?' ↓':' ↑'):''}</button>`;
  return `<section class="result-card result-section"><div class="result-summary"><div><h2>兼容结果</h2><p>共 ${runs.length} 条已验证记录</p></div><button data-clear-all>清空筛选</button></div><div class="result-desktop"><table class="result-table"><thead><tr><th>游戏</th><th>设备 / GPU</th><th>运行环境</th><th>${head('rating')}</th><th>平均 FPS</th><th>问题标签</th><th>备注</th><th>${head('verifiedAt')}</th></tr></thead><tbody>${runs.map(desktopRow).join('')}</tbody></table></div><div class="result-mobile">${runs.map(mobileCard).join('')}</div></section>`;
}
```

- [ ] **Step 4: Add all selector, clear, sort, popular-game, and preview events**

```js
document.addEventListener('input',event=>{
  if(event.target.matches('[data-picker-input="game"]'))state.gameQuery=event.target.value;
  else if(event.target.matches('[data-picker-input="target"]'))state.targetQuery=event.target.value;
  else return;
  render();
  const input=document.querySelector(`[data-picker-input="${state.openPicker}"]`);
  input?.focus();input?.setSelectionRange(input.value.length,input.value.length);
});

document.addEventListener('change',event=>{
  if(event.target.id!=='rating-select')return;
  state.ratingMin=event.target.value?Number(event.target.value):null;
  render();
});

document.addEventListener('click',event=>{
  const preview=event.target.closest('[data-preview]');
  if(preview){document.querySelector('.frame').dataset.preview=preview.dataset.preview;document.querySelectorAll('[data-preview]').forEach(button=>button.classList.toggle('active',button===preview));return}
  const popular=event.target.closest('[data-popular-game]');
  if(popular){state.gameId=popular.dataset.popularGame;state.openPicker=null;render();return}
  const open=event.target.closest('[data-open-picker]');
  if(open){state.openPicker=state.openPicker===open.dataset.openPicker?null:open.dataset.openPicker;render();return}
  const game=event.target.closest('[data-select-game]');
  if(game){state.gameId=game.dataset.selectGame;state.gameQuery='';state.openPicker=null;render();return}
  const target=event.target.closest('[data-select-target]');
  if(target){state.targetId=target.dataset.selectTarget;state.targetType=targetBy(state.targetId)?.type||null;state.targetQuery='';state.openPicker=null;render();return}
  const clear=event.target.closest('[data-clear-field]');
  if(clear){if(clear.dataset.clearField==='game')state.gameId=null;if(clear.dataset.clearField==='target'){state.targetId=null;state.targetType=null}if(clear.dataset.clearField==='rating')state.ratingMin=null;render();return}
  if(event.target.closest('[data-clear-all]')){Object.assign(state,{gameId:null,targetType:null,targetId:null,ratingMin:null,openPicker:null,gameQuery:'',targetQuery:''});render();return}
  const sort=event.target.closest('[data-sort-field]');
  if(sort){const field=sort.dataset.sortField;if(state.sortField===field)state.sortDirection=state.sortDirection==='desc'?'asc':'desc';else{state.sortField=field;state.sortDirection='desc'}render()}
});
```

- [ ] **Step 5: Complete `render()` with explicit loading, error, initial, and result states**

```js
function statePanel(title,copy,action=''){
  return `<section class="result-card state-panel"><h2>${esc(title)}</h2><p>${esc(copy)}</p>${action?`<button data-state-action="${action}">${action==='reload'?'重新加载':'清空筛选'}</button>`:''}</section>`;
}

function render(){
  let content='';
  if(state.catalogStatus==='loading')content=statePanel('正在加载兼容数据','正在获取游戏、设备和验证记录。');
  else if(state.catalogStatus==='error')content=statePanel('兼容数据加载失败','暂时无法获取兼容记录，请稍后重试。','reload');
  else if(!state.games.length||!state.targets.length)content=statePanel('暂无兼容数据','当前没有可展示的游戏或设备记录。','reload');
  else content=hasFilters()?renderResults():renderPopularGames();
  document.getElementById('compatibility-app').innerHTML=`<div class="page"><header class="page-header"><button class="back-button" aria-label="返回">← 返回</button><h1>游戏兼容性</h1><p>查看你的游戏能否在当前设备上流畅运行</p></header><section class="filter-card">${renderFilters()}</section>${content}</div>`;
  const rating=document.getElementById('rating-select');if(rating)rating.value=state.ratingMin==null?'':String(state.ratingMin);
}
```

- [ ] **Step 6: Run the static verifier until it passes**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: `PASS: compatibility reference redesign contracts, local assets, offline policy, and JavaScript syntax`.

- [ ] **Step 7: Commit the complete page behavior**

```powershell
git add -- demos/适合本机/盖世游戏适合本机WebView-demo.html
git commit -m "feat: add instant compatibility query flow"
```

### Task 5: Add the minimal WebView injection API and recovery behavior

**Files:**
- Modify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Test: `tools/capture-compatibility-webview-demo.mjs`

- [ ] **Step 1: Add catalog reconciliation and public methods**

```js
function reconcile(){
  if(state.gameId&&!gameBy(state.gameId))state.gameId=null;
  if(state.targetId&&!targetBy(state.targetId)){state.targetId=null;state.targetType=null}
}

function setCatalog(raw){
  const catalog=normalizeCatalog(raw);
  state.games=catalog.games;state.targets=catalog.targets;state.runs=catalog.runs;
  state.catalogStatus='ready';reconcile();render();
}

window.GameHubCompatibility={
  setContext(context){
    state.context=context&&typeof context==='object'?context:null;
    const targetId=text(context?.targetId);
    if(targetId&&targetBy(targetId)){state.targetId=targetId;state.targetType=targetBy(targetId).type}
    render();
  },
  setCatalog(catalog){setCatalog(catalog)},
  setCatalogLoading(){state.catalogStatus='loading';render()},
  setCatalogError(){state.catalogStatus='error';render()}
};

setCatalog(mockCatalog);
```

Do not expose `openGame`, `openGpu`, `openConfig`, action-result callbacks, or any config Bridge methods.

- [ ] **Step 2: Add the local reload fallback**

Extend the click handler:

```js
const stateAction=event.target.closest('[data-state-action]');
if(stateAction?.dataset.stateAction==='reload'){
  state.catalogStatus='loading';render();
  if(typeof window.GameHubBridge?.reloadCompatibilityCatalog==='function')window.GameHubBridge.reloadCompatibilityCatalog();
  else setTimeout(()=>setCatalog(mockCatalog),500);
  return;
}
```

- [ ] **Step 3: Run the static verifier**

Run:

```powershell
node tools/verify-compatibility-webview-demo.mjs
```

Expected: PASS with no legacy Bridge or detail marker.

- [ ] **Step 4: Commit the WebView API and recovery behavior**

```powershell
git add -- demos/适合本机/盖世游戏适合本机WebView-demo.html
git commit -m "feat: add compatibility catalog injection API"
```

### Task 6: Replace browser verification and capture review evidence

**Files:**
- Replace: `tools/capture-compatibility-webview-demo.mjs`
- Create: `test-results/compatibility-reference-redesign/01-desktop-initial.png`
- Create: `test-results/compatibility-reference-redesign/02-desktop-results.png`
- Create: `test-results/compatibility-reference-redesign/03-mobile-initial.png`
- Create: `test-results/compatibility-reference-redesign/04-mobile-results.png`
- Create: `test-results/compatibility-reference-redesign/05-empty-results.png`

- [ ] **Step 1: Keep the browser bootstrap and point output to the new directory**

```js
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const demoPath=path.join(root,'demos','适合本机','盖世游戏适合本机WebView-demo.html');
const outputDir=path.join(root,'test-results','compatibility-reference-redesign');
fs.mkdirSync(outputDir,{recursive:true});
const executablePath=[chromium.executablePath(),'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
if(!executablePath)throw new Error('No Chromium-compatible browser executable found');
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});
const errors=[];
page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
page.on('request',request=>{if(!request.url().startsWith('file:')&&!request.url().startsWith('data:'))errors.push(`unexpected network request: ${request.url()}`)});
await page.goto(pathToFileURL(demoPath).href,{waitUntil:'load'});
const frame=page.locator('.frame');
```

- [ ] **Step 2: Verify and capture the desktop initial state**

```js
if(await page.locator('[data-popular-game]').count()!==6)errors.push('initial popular games count is not six');
if(await page.locator('[data-result-row]').count()!==0)errors.push('initial page rendered result rows without filters');
if(await page.locator('#game-select').count()!==1||await page.locator('#target-select').count()!==1||await page.locator('#rating-select').count()!==1)errors.push('three selectors are incomplete');
await frame.screenshot({path:path.join(outputDir,'01-desktop-initial.png')});
```

- [ ] **Step 3: Verify popular-game direct query, combined filters, sorting, and clearing**

```js
await page.locator('[data-popular-game="steam_1245620"]').click();
if(await page.locator('[data-result-row]').count()!==2)errors.push('Elden Ring popular entry did not return two rows');
await page.locator('#target-select').click();
await page.locator('[data-picker-input="target"]').fill('小米 14');
await page.locator('[data-select-target="xiaomi_14"]').click();
if(await page.locator('[data-result-row]').count()!==1)errors.push('game plus target filters did not return one row');
await page.locator('#rating-select').selectOption('5');
if(!await page.getByText('暂无符合条件的兼容记录',{exact:true}).isVisible())errors.push('empty combined-filter state is missing');
await page.locator('[data-clear-field="rating"]').click();
if(await page.locator('[data-result-row]').count()!==1)errors.push('clearing rating did not restore the target result');
await frame.screenshot({path:path.join(outputDir,'02-desktop-results.png')});
await page.locator('[data-sort-field="verifiedAt"]').click();
if(await page.locator('[data-result-row]').count()!==1)errors.push('sorting changed the filtered result set');
```

- [ ] **Step 4: Verify the mobile layout reuses state and data**

```js
await page.locator('[data-preview="mobile"]').click();
const mobileSize=await frame.evaluate(element=>({width:element.clientWidth,height:element.clientHeight,scrollWidth:element.scrollWidth}));
if(mobileSize.width!==390||mobileSize.height!==844)errors.push(`mobile frame is ${mobileSize.width}x${mobileSize.height}`);
if(mobileSize.scrollWidth>mobileSize.width)errors.push('mobile frame has horizontal overflow');
if(await page.locator('[data-result-card]').count()!==1)errors.push('mobile cards did not reuse the desktop filter state');
if(await page.locator('[data-result-row]').count()!==1)errors.push('desktop result DOM lost shared data during preview change');
await frame.screenshot({path:path.join(outputDir,'04-mobile-results.png')});
await page.locator('[data-clear-all]').click();
if(await page.locator('[data-popular-game]').count()!==6)errors.push('clear all did not restore popular games');
await frame.screenshot({path:path.join(outputDir,'03-mobile-initial.png')});
```

- [ ] **Step 5: Verify no-result recovery, error/reload, context injection, and invalid data**

```js
await page.locator('#rating-select').selectOption('5');
await page.locator('#game-select').click();
await page.locator('[data-picker-input="game"]').fill('星空');
await page.locator('[data-select-game="steam_1716740"]').click();
if(!await page.getByText('暂无符合条件的兼容记录',{exact:true}).isVisible())errors.push('no-result state is missing');
await frame.screenshot({path:path.join(outputDir,'05-empty-results.png')});
await page.locator('[data-clear-all]').click();
await page.evaluate(()=>window.GameHubCompatibility.setContext({targetId:'oneplus_13'}));
if(!await page.locator('#target-select').getByText('一加 13',{exact:true}).isVisible())errors.push('recognized device was not selected');
await page.evaluate(()=>window.GameHubCompatibility.setCatalogError());
if(!await page.getByText('兼容数据加载失败',{exact:true}).isVisible())errors.push('catalog error state is missing');
await page.locator('[data-state-action="reload"]').click();
await page.waitForTimeout(700);
if(await page.locator('[data-popular-game]').count()!==6)errors.push('local reload did not recover the catalog');
await page.evaluate(()=>window.GameHubCompatibility.setCatalog({
  games:[null,{id:'g1',name:'异常游戏',aliases:null,coverKey:'https://bad.example/cover.jpg'},{id:'g1',name:'重复游戏'}],
  targets:[null,{id:'t1',type:'bad',displayName:'异常设备',aliases:null,gpu:'Adreno Test'},{id:'t1',displayName:'重复设备'}],
  runs:[null,{id:'r1',gameId:'missing',targetId:'t1'},{id:'r2',gameId:'g1',targetId:'t1',rating:99,avgFps:999,tags:null,notes:'<img src=x onerror=alert(1)>',verifiedAt:'bad'}]
}));
await page.evaluate(()=>{document.querySelector('[data-popular-game="g1"]')?.click()});
if(await page.locator('[data-result-row]').count()!==1)errors.push('invalid and duplicate catalog data did not normalize to one row');
if(await page.locator('.rating').first().getAttribute('aria-label')!=='5 分')errors.push('rating was not clamped to five');
if((await page.locator('[data-result-row]').first().innerText()).includes('<img'))errors.push('notes were not escaped');
```

- [ ] **Step 6: Close the browser and report all failures**

```js
await browser.close();
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('PASS: compatibility reference redesign interactions, responsive rendering, Adapter, recovery, and five screenshots');
```

- [ ] **Step 7: Run the browser verifier**

Run:

```powershell
node tools/capture-compatibility-webview-demo.mjs
```

Expected: `PASS: compatibility reference redesign interactions, responsive rendering, Adapter, recovery, and five screenshots`.

- [ ] **Step 8: Commit the browser verifier**

```powershell
git add -- tools/capture-compatibility-webview-demo.mjs
git commit -m "test: verify compatibility reference redesign"
```

### Task 7: Perform final visual and regression verification

**Files:**
- Verify: `demos/适合本机/盖世游戏适合本机WebView-demo.html`
- Verify: `demos/适合本机/assets/compatibility/*.jpg`
- Verify: `tools/verify-compatibility-webview-demo.mjs`
- Verify: `tools/capture-compatibility-webview-demo.mjs`
- Verify: `test-results/compatibility-reference-redesign/*.png`

- [ ] **Step 1: Run both automated verifiers**

```powershell
node tools/verify-compatibility-webview-demo.mjs
node tools/capture-compatibility-webview-demo.mjs
```

Expected: both commands print PASS and exit `0`.

- [ ] **Step 2: Check task files for whitespace errors**

```powershell
git diff --check -- demos/适合本机/盖世游戏适合本机WebView-demo.html demos/适合本机/assets/compatibility tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs
```

Expected: no output.

- [ ] **Step 3: Review all five screenshots**

Open every file in `test-results/compatibility-reference-redesign/` and verify:

- GameHub black/gray/gold styling is consistent and no purple/cyan reference branding remains.
- Six covers are real, sharp, consistently cropped, and locally loaded.
- Desktop selectors align in one row and result columns remain readable.
- Mobile selectors stack, popular games use two columns, and results use one column without horizontal overflow.
- Empty results preserve the selected filters and expose clear recovery.

- [ ] **Step 4: Check that only task files are included in the implementation commits**

```powershell
git status --short -- demos/适合本机/盖世游戏适合本机WebView-demo.html demos/适合本机/assets/compatibility tools/verify-compatibility-webview-demo.mjs tools/capture-compatibility-webview-demo.mjs docs/superpowers/specs/2026-08-07-gamehub-compatibility-reference-redesign-design.md docs/superpowers/plans/2026-08-07-gamehub-compatibility-reference-redesign.md
```

Expected: no unstaged task-file changes. Unrelated dirty files elsewhere in the repository remain untouched.

### Task 8: Create and submit the Taskboard Delivery

**Files:**
- Create temporary manifest: `.tmp/GUANWANGGAID-4-delivery.json`
- Register Demo: `demos/适合本机/`
- Register images: `test-results/compatibility-reference-redesign/01-desktop-initial.png`, `02-desktop-results.png`, `03-mobile-initial.png`, `04-mobile-results.png`, `05-empty-results.png`
- Register Markdown: `docs/superpowers/specs/2026-08-07-gamehub-compatibility-reference-redesign-design.md`

- [ ] **Step 1: Write the ready Delivery manifest as UTF-8 JSON**

```json
{
  "conclusion": "ready",
  "summaryItems": [
    "将复杂兼容库收敛为三项即时筛选与同页结果展示",
    "按盖世游戏黑金风格重建桌面表格和移动端结果卡片",
    "增加六款本地真实游戏封面及热门游戏直达入口",
    "支持游戏、手机型号/GPU、最低评价筛选与结果排序",
    "补齐异常数据、加载失败、无结果和离线运行验证"
  ],
  "acceptanceSteps": [
    "打开 Demo，确认初始展示六款热门游戏且可点击直达兼容结果",
    "分别选择游戏、设备/GPU和最低评价，确认结果即时变化并可单项清除",
    "切换桌面与移动预览，确认筛选状态保留且移动端无横向滚动",
    "点击兼容评价和验证时间排序，并检查游戏版本、运行环境、FPS与验证信息",
    "查看五张验收截图并确认整体视觉为盖世游戏黑金风格"
  ],
  "attentionItems": [
    "Demo 使用本地 Mock 兼容记录，真实上线仍需由 App 或接口注入正式数据",
    "兼容结论必须与游戏版本、盖世版本、内核版本和验证时间共同展示"
  ],
  "technicalDetails": "静态验证：node tools/verify-compatibility-webview-demo.mjs；交互与视觉验证：node tools/capture-compatibility-webview-demo.mjs；桌面与移动共用 filteredRuns() 数据链，HTML 与封面离线运行且无外部请求。"
}
```

Save it to `.tmp/GUANWANGGAID-4-delivery.json` without committing it.

- [ ] **Step 2: Create the Delivery**

```powershell
$delivery = taskctl.cmd delivery create GUANWANGGAID-4 --manifest-file '.tmp\GUANWANGGAID-4-delivery.json' --json | ConvertFrom-Json
$deliveryId = $delivery.delivery.id
if (-not $deliveryId) { throw 'Delivery ID missing' }
```

Expected: a JSON Delivery object in draft state and a non-empty `$deliveryId`.

- [ ] **Step 3: Register the operable Demo**

```powershell
taskctl.cmd delivery artifact add $deliveryId --title '盖世游戏兼容性可操作 Demo' --kind demo --path 'demos/适合本机' --entry '盖世游戏适合本机WebView-demo.html' --content-type 'text/html' --json
```

Expected: artifact creation succeeds and the Demo preview can load its local `assets/compatibility/` covers.

- [ ] **Step 4: Register every visual and Markdown artifact**

```powershell
taskctl.cmd delivery artifact add $deliveryId --title '桌面端初始热门游戏' --kind image --path 'test-results/compatibility-reference-redesign/01-desktop-initial.png' --content-type 'image/png' --json
taskctl.cmd delivery artifact add $deliveryId --title '桌面端兼容结果' --kind image --path 'test-results/compatibility-reference-redesign/02-desktop-results.png' --content-type 'image/png' --json
taskctl.cmd delivery artifact add $deliveryId --title '移动端初始热门游戏' --kind image --path 'test-results/compatibility-reference-redesign/03-mobile-initial.png' --content-type 'image/png' --json
taskctl.cmd delivery artifact add $deliveryId --title '移动端兼容结果' --kind image --path 'test-results/compatibility-reference-redesign/04-mobile-results.png' --content-type 'image/png' --json
taskctl.cmd delivery artifact add $deliveryId --title '筛选无结果状态' --kind image --path 'test-results/compatibility-reference-redesign/05-empty-results.png' --content-type 'image/png' --json
taskctl.cmd delivery artifact add $deliveryId --title '兼容性网页收敛改版设计规格' --kind markdown --path 'docs/superpowers/specs/2026-08-07-gamehub-compatibility-reference-redesign-design.md' --content-type 'text/markdown' --json
```

Expected: all six artifact commands succeed. Do not submit if any preview source is missing.

- [ ] **Step 5: Re-read the issue and submit with its latest version**

```powershell
$issue = taskctl.cmd issue get 4ade1ed5-07b1-474f-9f53-f8e6b8ba034b --json | ConvertFrom-Json
if ($issue.task.identifier -ne 'GUANWANGGAID-4') { throw 'Unexpected issue' }
if ($issue.task.status -ne 'in_progress') { throw "Unexpected issue status: $($issue.task.status)" }
taskctl.cmd delivery submit $deliveryId --if-version $issue.task.version --json
```

Expected: Delivery submission succeeds and the issue enters `in_review`. Do not use `issue move --status in_review` and do not move the issue to `done`.
