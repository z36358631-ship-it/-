# Google Play File Library Viewer Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing portrait file-library Demo with a stable text-only more menu, dual filter/sort controls, a root-level sample folder, five read-only file viewers, and ZIP extraction into the current folder.

**Architecture:** Keep the existing single `managerState` and nested `fileSystem`; replace the old `filter/recent` shortcut with explicit type-filter and sort state, and add one full-screen viewer shell that dispatches to type-specific renderers. ZIP remains a list action with its own confirmation dialog. A deterministic Node helper embeds one local JPEG and one local MP4 into the outside-repository HTML so the final Demo remains a fully offline single file.

**Tech Stack:** Offline single-file HTML, semantic DOM, CSS, vanilla JavaScript, PowerShell static validator, Node.js media embedding helper.

---

## File map

- Modify `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`: all visual structure, state, sample data and interactions; this file is outside Git.
- Modify `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`: static regression contract for the newly confirmed scope.
- Create `C:\Users\z3635\官网改动\scripts\embed-google-play-file-library-demo-media.mjs`: reproducibly embeds the local MP4 as a data URI.
- Modify `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`: records final evidence and remaining manual checks.
- Verify `C:\Users\z3635\官网改动\docs\superpowers\specs\2026-08-27-google-play-file-library-portrait-mvp-design.md`: source of truth; no implementation edit.

---

### Task 1: Extend the failing static contract

**Files:**

- Modify: `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
- Test: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`

- [ ] **Step 1: Add required menu, sorting, viewer and extraction markers**

Insert after the current `isMobileLandscape` requirement:

```powershell
Require-Text '<h3 id="sheetTitle">更多菜单</h3>' 'More menu title is not fixed'
Require-Text 'data-sheet-close' 'More menu close button is missing'
Require-Text '.sheet-actions{border-top:0}' 'Divider still appears between menu title and first action'
Require-Text 'data-sort="modified"' 'Modified-time sort button is missing'
Require-Text 'data-sort="size"' 'Size sort button is missing'
Require-Text "typeFilter:'all'" 'Default type filter is not all'
Require-Text "sortBy:'modified'" 'Default sort is not modified time'
Require-Text "sortOrder:'desc'" 'Default sort order is not descending'
Require-Text "name:'示例文件'" 'Root-level sample folder is missing'
Require-Text "name:'示例图片.jpg'" 'Sample image is missing'
Require-Text "name:'示例文本.txt'" 'Sample text is missing'
Require-Text "name:'示例网页.html'" 'Sample HTML is missing'
Require-Text "name:'示例文档.pdf'" 'Sample PDF is missing'
Require-Text "name:'示例视频.mp4'" 'Sample video is missing'
Require-Text "name:'示例压缩包.zip'" 'Sample ZIP is missing'
Require-Text 'id="fileViewer"' 'Unified file viewer is missing'
Require-Text 'id="viewerClose"' 'Viewer close control is missing'
Require-Text 'function openFileViewer' 'Viewer open behavior is missing'
Require-Text 'function renderViewerContent' 'Viewer renderer is missing'
Require-Text 'id="extractConfirmDialog"' 'ZIP extraction confirmation is missing'
Require-Text 'function openExtractConfirm' 'ZIP extraction open behavior is missing'
Require-Text 'function confirmExtract' 'ZIP extraction implementation is missing'
Require-Text 'data:image/jpeg;base64,' 'Offline sample image was not embedded'
Require-Text 'data:video/mp4;base64,' 'Offline sample video was not embedded'
```

- [ ] **Step 2: Replace the obsolete recent-boolean requirements**

Remove these five old requirements:

```powershell
Require-Text 'recent:true' 'Demo data is missing explicit recent=true state'
Require-Text 'recent:false' 'Demo data is missing explicit recent=false state'
Require-Text 'item.recent===true' 'Recent filter is not based on explicit recent state'
Require-Text 'copy.recent=true' 'Copied item is not marked as recently modified'
Require-Text 'state.actionTarget.recent=true' 'Renamed item is not marked as recently modified'
```

Insert these replacements:

```powershell
Require-Text 'modifiedAt:' 'Demo items are missing modified-time metadata'
Require-Text 'sizeBytes:' 'Demo items are missing size metadata'
Require-Text 'function sortDirectoryItems' 'Directory sorting implementation is missing'
Require-Text 'function renderFilterSortControls' 'Filter/sort state rendering is missing'
Require-Text 'copy.modifiedAt=new Date().toISOString()' 'Copied item is not marked as newest'
Require-Text 'state.actionTarget.modifiedAt=new Date().toISOString()' 'Renamed item is not marked as newest'
```

- [ ] **Step 3: Add forbidden regression patterns**

Insert before the remote-dependency check:

```powershell
Forbid-Pattern 'document\.getElementById\([''"]sheetTitle[''"]\)\.textContent' 'More menu title is still dynamic'
Forbid-Pattern '(?is)data-file-action="(?:copy|rename|delete)"[^>]*>\s*<svg\b' 'More menu actions still contain icons'
Forbid-Pattern 'requestAnimationFrame\(\(\)=>sheet\.querySelector' 'More menu still autofocuses the first action'
Forbid-Pattern "filter:'(?:all|recent|archive|folder)'" 'Legacy single filter state is still present'
Forbid-Pattern 'data-filter="recent"' 'Recent modified is still implemented as a filter'
Forbid-Pattern '\.recent\b|recent:' 'Legacy recent boolean state is still present'
Forbid-Pattern '<iframe\b|<canvas\b' 'Viewer uses a forbidden iframe or canvas'
Forbid-Pattern 'data-viewer-action="(?:copy|rename|delete|share)"' 'Viewer contains a forbidden file action'
```

- [ ] **Step 4: Run the expanded contract against the current Demo**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: exit code `1`; failures include the fixed menu title/close control, sort state, sample folder/files, viewer, extraction and video.

- [ ] **Step 5: Commit only the validator**

Run:

```powershell
git add -- scripts/validate-google-play-file-library-demo.ps1
git diff --cached --name-only
git commit -m "test: cover file viewer and extraction interactions"
```

Expected: staged list contains only `scripts/validate-google-play-file-library-demo.ps1`.

---

### Task 2: Stabilize and simplify the more menu

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:47`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:124-130`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:351-363`

- [ ] **Step 1: Replace the Sheet heading and action markup**

Replace the current `actionSheet` body with:

```html
<section class="sheet item-action-sheet" id="actionSheet" data-component-id="C-SHEET" aria-label="更多菜单">
  <header class="sheet-head">
    <h3 id="sheetTitle">更多菜单</h3>
    <button class="sheet-close" type="button" data-sheet-close aria-label="关闭">×</button>
  </header>
  <div class="sheet-actions">
    <button class="sheet-row" data-file-action="copy">复制</button>
    <button class="sheet-row" data-file-action="rename">重命名</button>
    <button class="sheet-row danger" data-file-action="delete">删除</button>
  </div>
</section>
```

- [ ] **Step 2: Replace the Sheet heading/action CSS**

Use these component rules after the existing `.sheet.show` rule:

```css
.sheet-head{height:34px;display:flex;align-items:center;justify-content:space-between;margin:0 0 8px}
.sheet-head h3{min-width:0;margin:0;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sheet-close{flex:0 0 34px;width:34px;height:34px;border:0;background:transparent;color:#96979c;font-size:27px;line-height:1;cursor:pointer}
.sheet-actions{border-top:0}
.sheet-row{gap:0;padding:0 8px}
.sheet-row.danger{color:#ff7d85}
```

Keep the existing row `border-bottom`; it provides separators only between the three operations.

- [ ] **Step 3: Remove the dynamic heading and first-action autofocus**

Replace `openActionMenu` with:

```javascript
function openActionMenu(state,item){
  state.pendingAction=null;
  state.actionTarget=item;
  state.draftName='';
  sheet.classList.add('show');
}
```

Bind the `X` beside the existing action bindings:

```javascript
document.querySelector('[data-sheet-close]').onclick=()=>closeActionSheet(managerState);
```

- [ ] **Step 4: Verify the menu contract**

Run:

```powershell
rg -n '更多菜单|data-sheet-close|data-file-action="copy"|data-file-action="rename"|data-file-action="delete"' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
rg -n 'sheetTitle.*textContent|requestAnimationFrame\(\(\)=>sheet|data-file-action="(?:copy|rename|delete)"[^>]*>\s*<svg' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: first command finds the fixed title, close and three text operations; second command has no output.

- [ ] **Step 5: Run JavaScript syntax validation**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const a=h.indexOf('<script>');const b=h.lastIndexOf('</script>');new Function(h.slice(a+8,b));console.log('PASS: inline JavaScript syntax valid');"
```

Expected: `PASS: inline JavaScript syntax valid`.

No Git commit: the Demo is outside the repository.

---

### Task 3: Add explicit sorting and the root-level sample folder

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:169`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:202-217`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:270-332`

- [ ] **Step 1: Split filter and sort buttons in the current row**

Replace the quick row with:

```html
<div class="quick-row" aria-label="文件筛选和排序">
  <button class="quick active" data-filter="all">全部</button>
  <button class="quick active" data-sort="modified" data-label="最近修改">最近修改↓</button>
  <button class="quick" data-sort="size" data-label="大小">大小</button>
  <button class="quick" data-filter="archive">压缩包</button>
  <button class="quick" data-filter="folder">文件夹</button>
</div>
```

- [ ] **Step 2: Replace the demo data with explicit size/time metadata and sample files**

Use this root structure; retain the current nested `Download`, `Games` and `Documents` children where listed:

```javascript
const fileSystem={
  name:'内部存储',type:'folder',children:[
    {name:'Download',meta:'文件夹 · 今天 10:42',type:'folder',sizeBytes:258998272,modifiedAt:'2026-08-27T10:42:00+08:00',children:[
      {name:'安装包',meta:'文件夹 · 3 个项目',type:'folder',sizeBytes:2097152,modifiedAt:'2026-08-26T19:20:00+08:00',children:[]},
      {name:'GameSave_Backup.zip',meta:'压缩包 · 245 MB',type:'archive',sizeBytes:256901120,modifiedAt:'2026-08-27T09:18:00+08:00',extractChildren:[]}
    ]},
    {name:'示例文件',meta:'文件夹 · 6 个项目',type:'folder',sizeBytes:5421527,modifiedAt:'2026-08-27T12:10:00+08:00',children:[
      {name:'示例图片.jpg',meta:'图片 · 2.4 MB',type:'image',sizeBytes:2516582,modifiedAt:'2026-08-27T12:09:00+08:00'},
      {name:'示例文本.txt',meta:'文本 · 4 KB',type:'text',sizeBytes:4096,modifiedAt:'2026-08-27T12:08:00+08:00',textContent:'GameHub 文件查看示例\n\n这是一个只读文本文件。\n复制、重命名和删除请返回文件列表后，通过“…”处理。'},
      {name:'示例网页.html',meta:'HTML · 8 KB',type:'html',sizeBytes:8192,modifiedAt:'2026-08-27T12:07:00+08:00'},
      {name:'示例文档.pdf',meta:'PDF · 1.2 MB',type:'pdf',sizeBytes:1258291,modifiedAt:'2026-08-27T12:06:00+08:00'},
      {name:'示例视频.mp4',meta:'视频 · 1.4 MB',type:'video',sizeBytes:1462334,modifiedAt:'2026-08-27T12:05:00+08:00'},
      {name:'示例压缩包.zip',meta:'压缩包 · 168 KB',type:'archive',sizeBytes:172032,modifiedAt:'2026-08-27T12:04:00+08:00',extractChildren:[
        {name:'解压说明.txt',meta:'文本 · 1 KB',type:'text',sizeBytes:1024,modifiedAt:'2026-08-27T12:04:00+08:00',textContent:'示例压缩包已解压到当前文件夹。'}
      ]}
    ]},
    {name:'Games',meta:'文件夹 · 2 个项目',type:'folder',sizeBytes:85684597555,modifiedAt:'2026-08-26T18:40:00+08:00',children:[
      {name:'Hollow_Knight_Silksong.exe',meta:'PC 游戏 · 8.6 GB',type:'game',sizeBytes:9234179686,modifiedAt:'2026-08-26T18:35:00+08:00'},
      {name:'Cyberpunk2077.exe',meta:'PC 游戏 · 71.2 GB',type:'game',sizeBytes:76450417869,modifiedAt:'2026-08-25T11:20:00+08:00'}
    ]},
    {name:'Documents',meta:'文件夹 · 昨天 20:15',type:'folder',sizeBytes:0,modifiedAt:'2026-08-26T20:15:00+08:00',children:[]},
    {name:'MetalSlug.zip',meta:'压缩包 · 86 MB',type:'archive',sizeBytes:90177536,modifiedAt:'2026-08-24T16:10:00+08:00',extractChildren:[]}
  ]
};
```

- [ ] **Step 3: Replace the legacy filter state and add stable sorting helpers**

Use these helpers before `renderCurrentDirectory`:

```javascript
function sortMetric(item,sortBy){
  if(sortBy==='size')return Number.isFinite(item.sizeBytes)?item.sizeBytes:null;
  const value=Date.parse(item.modifiedAt);
  return Number.isFinite(value)?value:null;
}

function sortDirectoryItems(items,state){
  return [...items].sort((a,b)=>{
    const av=sortMetric(a,state.sortBy),bv=sortMetric(b,state.sortBy);
    if(av===null&&bv===null)return a.name.localeCompare(b.name,'zh-CN');
    if(av===null)return 1;
    if(bv===null)return -1;
    const delta=av-bv;
    return state.sortOrder==='asc'?delta:-delta;
  });
}

function renderFilterSortControls(state){
  state.host.querySelectorAll('[data-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===state.typeFilter));
  state.host.querySelectorAll('[data-sort]').forEach(btn=>{
    const selected=btn.dataset.sort===state.sortBy;
    btn.classList.toggle('active',selected);
    btn.textContent=`${btn.dataset.label}${selected?(state.sortOrder==='desc'?'↓':'↑'):''}`;
  });
}
```

Replace the state fields in `mountManager` with:

```javascript
const state={host,permission:'unknown',libraryTab:'files',orientation:'portrait',pathStack:[],query:'',typeFilter:'all',sortBy:'modified',sortOrder:'desc',viewingFile:null,pendingAction:null,actionTarget:null,draftName:'',firstPermissionPrompted:false};
```

- [ ] **Step 4: Apply filter, search and sorting in the specified order**

In `renderCurrentDirectory`, replace the old filter block with:

```javascript
let items=[...currentItems(state)];
if(state.typeFilter!=='all')items=items.filter(item=>item.type===state.typeFilter);
if(state.query)items=items.filter(item=>item.name.toLowerCase().includes(state.query.toLowerCase()));
items=sortDirectoryItems(items,state);
renderFilterSortControls(state);
empty.textContent=state.query||state.typeFilter!=='all'?'没有匹配的文件':'此文件夹为空';
```

- [ ] **Step 5: Bind independent filter and sort controls**

Replace the old `.quick` binding with:

```javascript
host.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>{
  state.typeFilter=btn.dataset.filter;
  renderCurrentDirectory(state);
});
host.querySelectorAll('[data-sort]').forEach(btn=>btn.onclick=()=>{
  const next=btn.dataset.sort;
  state.sortOrder=state.sortBy===next?(state.sortOrder==='desc'?'asc':'desc'):'desc';
  state.sortBy=next;
  renderCurrentDirectory(state);
});
```

- [ ] **Step 6: Preserve complete item metadata during copy and mark mutations as newest**

Replace `cloneItem` and update copy/rename:

```javascript
function cloneItem(item){
  return {...item,
    ...(item.children?{children:item.children.map(cloneItem)}:{}),
    ...(item.extractChildren?{extractChildren:item.extractChildren.map(cloneItem)}:{})
  };
}
```

Remove the existing `copy.recent=true` and `state.actionTarget.recent=true` lines. After assigning the copied/renamed name, use:

```javascript
copy.modifiedAt=new Date().toISOString();
state.actionTarget.modifiedAt=new Date().toISOString();
```

- [ ] **Step 7: Run syntax and data checks**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const a=h.indexOf('<script>');const b=h.lastIndexOf('</script>');new Function(h.slice(a+8,b));console.log('PASS: inline JavaScript syntax valid');"
rg -n "name:'示例文件'|name:'示例图片.jpg'|name:'示例文本.txt'|name:'示例网页.html'|name:'示例文档.pdf'|name:'示例视频.mp4'|name:'示例压缩包.zip'|typeFilter:'all'|sortBy:'modified'|sortOrder:'desc'" 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: syntax PASS and all nine data/state markers found.

No Git commit: the Demo is outside the repository.

---

### Task 4: Implement the unified read-only viewer

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:43-50`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:148-150`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:260-270`

- [ ] **Step 1: Add one full-screen viewer shell**

Insert inside `.app-shell`, after the delete dialog:

```html
<section class="file-viewer" id="fileViewer" hidden aria-label="文件查看器">
  <header class="viewer-topbar" data-component-id="C-TOPBAR">
    <button id="viewerClose" class="viewer-close" type="button" aria-label="关闭">×</button>
    <h2 id="viewerTitle"></h2>
    <span class="viewer-balance" aria-hidden="true"></span>
  </header>
  <div class="viewer-content" id="viewerContent"></div>
</section>
```

- [ ] **Step 2: Add viewer CSS without iframe or Canvas**

Add:

```css
.file-viewer{position:absolute;inset:0;z-index:85;display:flex;flex-direction:column;background:#0e0e10;color:var(--text)}
.file-viewer[hidden]{display:none}
.viewer-topbar{height:58px;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:6px;padding:0 12px;border-bottom:1px solid rgba(255,255,255,.08);background:#171719}
.viewer-topbar h2{min-width:0;margin:0;text-align:center;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.viewer-close{width:40px;height:40px;border:0;background:transparent;color:#d5d6d9;font-size:30px;line-height:1;cursor:pointer}
.viewer-balance{width:40px;height:40px}
.viewer-content{min-height:0;flex:1;overflow:auto;padding:18px}
.viewer-image{width:100%;height:100%;display:grid;place-items:center}
.viewer-image img{display:block;max-width:100%;max-height:100%;object-fit:contain;border-radius:12px}
.viewer-text{margin:0;white-space:pre-wrap;color:#d7d8dc;font:12px/1.8 ui-monospace,SFMono-Regular,Consolas,monospace}
.viewer-html{color:#d9dade;font-size:13px;line-height:1.85}
.viewer-html h1{font-size:20px;margin:0 0 16px}.viewer-html p{margin:0 0 14px;color:#b7b8bd}
.pdf-stack{display:grid;gap:16px}.pdf-page{min-height:420px;padding:28px 24px;border-radius:8px;background:#f4f4f2;color:#292a2d;box-shadow:0 8px 30px rgba(0,0,0,.35)}
.pdf-page h3{margin:0 0 18px;font-size:20px}.pdf-page p{font-size:12px;line-height:1.8}
.viewer-video{width:100%;height:100%;display:grid;place-items:center}.viewer-video video{width:100%;max-height:100%;background:#000;border-radius:12px}
```

- [ ] **Step 3: Add type-specific renderers**

Define the media and viewer functions before `bindFileRow`:

```javascript
const sampleImageData='';
const sampleVideoData='';

function viewerImageData(){
  return sampleImageData;
}

function renderViewerContent(item){
  const content=document.getElementById('viewerContent');
  if(item.type==='image'){
    content.innerHTML=`<div class="viewer-image"><img src="${viewerImageData()}" alt="${item.name}"/></div>`;
    return;
  }
  if(item.type==='text'){
    content.innerHTML='<pre class="viewer-text"></pre>';
    content.querySelector('pre').textContent=item.textContent||'';
    return;
  }
  if(item.type==='html'){
    content.innerHTML='<article class="viewer-html"><h1>GameHub 文件查看</h1><p>这是渲染后的 HTML 正文，不显示源代码。</p><p>文件详情只用于查看。复制、重命名和删除请返回列表，通过“…”处理。</p></article>';
    return;
  }
  if(item.type==='pdf'){
    content.innerHTML='<div class="pdf-stack"><article class="pdf-page"><h3>文件管理功能说明</h3><p>第 1 页：文件查看器保持只读，所有文件操作统一留在列表。</p></article><article class="pdf-page"><h3>交互规则</h3><p>第 2 页：关闭后返回原目录，并保留搜索、筛选和排序上下文。</p></article></div>';
    return;
  }
  if(item.type==='video'){
    content.innerHTML=`<div class="viewer-video"><video controls playsinline preload="metadata" src="${sampleVideoData}"></video></div>`;
  }
}

function openFileViewer(state,item){
  state.viewingFile=item;
  document.getElementById('viewerTitle').textContent=item.name;
  renderViewerContent(item);
  document.getElementById('fileViewer').hidden=false;
}

function closeFileViewer(state){
  const video=document.querySelector('#viewerContent video');
  if(video)video.pause();
  document.getElementById('fileViewer').hidden=true;
  document.getElementById('viewerContent').replaceChildren();
  state.viewingFile=null;
}
```

- [ ] **Step 4: Route supported files from the list**

Use this row-click branch; ZIP routing is completed in Task 6:

```javascript
row.onclick=e=>{
  if(e.target.closest('.more-btn'))return;
  if(item.type==='folder')return enterFolder(state,item.name);
  if(item.type==='archive')return openExtractConfirm(state,item);
  if(['image','text','html','pdf','video'].includes(item.type))openFileViewer(state,item);
};
```

- [ ] **Step 5: Bind close and Escape**

Add:

```javascript
document.getElementById('viewerClose').onclick=()=>closeFileViewer(managerState);
```

Place this first in the existing Escape chain:

```javascript
if(!document.getElementById('fileViewer').hidden)closeFileViewer(managerState);
```

- [ ] **Step 6: Verify read-only viewer structure**

Run:

```powershell
rg -n 'id="fileViewer"|id="viewerClose"|function openFileViewer|function renderViewerContent|viewer-image|viewer-text|viewer-html|pdf-stack|viewer-video' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
rg -n 'data-viewer-action="(?:copy|rename|delete|share)"|<iframe\b|<canvas\b' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: viewer markers found; forbidden action/iframe/Canvas scan has no output.

No Git commit: the Demo is outside the repository.

---

### Task 5: Embed real offline sample image and video

**Files:**

- Create: `C:\Users\z3635\官网改动\scripts\embed-google-play-file-library-demo-media.mjs`
- Modify mechanically: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
- Read: `C:\Users\z3635\官网改动\h5游戏\nezha-chen-tang-demo\docs\research\zhaoyun-adou-evidence\07-zhaoyun-start.jpg`
- Read: `C:\Users\z3635\官网改动\储存\详情页沉浸式UI演示视频.mp4`

- [ ] **Step 1: Create the deterministic media embed helper**

Create the script with `apply_patch`:

```javascript
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const workspace=path.resolve(scriptDir,'..');
const demoPath='C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html';
const imagePath=path.join(workspace,'h5游戏','nezha-chen-tang-demo','docs','research','zhaoyun-adou-evidence','07-zhaoyun-start.jpg');
const videoPath=path.join(workspace,'储存','详情页沉浸式UI演示视频.mp4');
const imageBase64=readFileSync(imagePath).toString('base64');
const videoBase64=readFileSync(videoPath).toString('base64');
const replacements=[
  [/const sampleImageData='[^']*';/,`const sampleImageData='data:image/jpeg;base64,${imageBase64}';`],
  [/const sampleVideoData='[^']*';/,`const sampleVideoData='data:video/mp4;base64,${videoBase64}';`]
];
let html=readFileSync(demoPath,'utf8');
for(const [pattern,replacement] of replacements){
  if(!pattern.test(html))throw new Error(`media declaration not found: ${pattern}`);
  html=html.replace(pattern,replacement);
}
writeFileSync(demoPath,html,'utf8');
console.log(`Embedded image=${imageBase64.length}, video=${videoBase64.length} base64 characters into ${demoPath}`);
```

- [ ] **Step 2: Run the helper**

Run:

```powershell
node scripts/embed-google-play-file-library-demo-media.mjs
```

Expected: output begins with `Embedded image=` and ends with the absolute Demo path.

- [ ] **Step 3: Verify the embedded media and syntax**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const image=h.match(/const sampleImageData='(data:image\/jpeg;base64,[^']+)'/),video=h.match(/const sampleVideoData='(data:video\/mp4;base64,[^']+)'/);if(!image||image[1].length<10000)throw new Error('image data URI missing or too small');if(!video||video[1].length<100000)throw new Error('video data URI missing or too small');console.log('PASS: offline image/video embedded',image[1].length,video[1].length);"
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const a=h.indexOf('<script>');const b=h.lastIndexOf('</script>');new Function(h.slice(a+8,b));console.log('PASS: inline JavaScript syntax valid');"
```

Expected: both commands PASS.

- [ ] **Step 4: Commit only the reproducible helper**

Run:

```powershell
git add -- scripts/embed-google-play-file-library-demo-media.mjs
git diff --cached --name-only
git commit -m "build: embed offline file viewer media"
```

Expected: staged list contains only `scripts/embed-google-play-file-library-demo-media.mjs`.

---

### Task 6: Implement ZIP extraction with overwrite

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:142-148`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:260-270`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:430-455`

- [ ] **Step 1: Add the extraction confirmation dialog**

Insert after the delete dialog:

```html
<div class="modal-backdrop" id="extractConfirmDialog">
  <section class="modal" data-component-id="C-DIALOG" role="alertdialog" aria-modal="true" aria-labelledby="extractTitle">
    <h3 id="extractTitle">解压文件</h3>
    <p>是否解压到当前文件夹？</p>
    <div class="modal-actions"><button class="secondary" data-extract-cancel>取消</button><button class="primary" id="extractConfirm">解压</button></div>
  </section>
</div>
```

- [ ] **Step 2: Add exact extraction helpers**

Define:

```javascript
function archiveFolderName(name){
  return name.toLowerCase().endsWith('.zip')?name.slice(0,-4):name;
}

function openExtractConfirm(state,item){
  state.pendingAction='extract';
  state.actionTarget=item;
  document.getElementById('extractConfirmDialog').classList.add('show');
}

function closeExtractConfirm(state){
  document.getElementById('extractConfirmDialog').classList.remove('show');
  state.pendingAction=null;
  state.actionTarget=null;
}

function confirmExtract(state){
  const items=currentItems(state),archive=state.actionTarget;
  const folderName=archiveFolderName(archive.name);
  const folder={
    name:folderName,
    meta:`文件夹 · ${(archive.extractChildren||[]).length} 个项目`,
    type:'folder',
    sizeBytes:(archive.extractChildren||[]).reduce((total,item)=>total+(item.sizeBytes||0),0),
    modifiedAt:new Date().toISOString(),
    children:(archive.extractChildren||[]).map(cloneItem)
  };
  const existingIndex=items.findIndex(item=>item.type==='folder'&&item.name===folderName);
  if(existingIndex>=0)items.splice(existingIndex,1,folder);
  else items.push(folder);
  closeExtractConfirm(state);
  renderCurrentDirectory(state);
}
```

- [ ] **Step 3: Bind cancel, confirm and Escape**

Add:

```javascript
document.querySelector('[data-extract-cancel]').onclick=()=>closeExtractConfirm(managerState);
document.getElementById('extractConfirm').onclick=()=>confirmExtract(managerState);
```

Place this ahead of the menu branch in the Escape chain:

```javascript
else if(document.getElementById('extractConfirmDialog').classList.contains('show'))closeExtractConfirm(managerState);
```

- [ ] **Step 4: Close viewer/extraction before switching to landscape**

Inside the `landscape` branch of `applyOrientation`, add:

```javascript
if(!document.getElementById('fileViewer').hidden)closeFileViewer(state);
if(document.getElementById('extractConfirmDialog').classList.contains('show'))closeExtractConfirm(state);
```

- [ ] **Step 5: Run extraction logic checks**

Run:

```powershell
rg -n 'id="extractConfirmDialog"|是否解压到当前文件夹|function archiveFolderName|function openExtractConfirm|function confirmExtract|existingIndex>=0|items.splice\(existingIndex,1,folder\)' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: every extraction and overwrite marker is present.

No Git commit: the Demo is outside the repository.

---

### Task 7: Run integrated regression and update evidence

**Files:**

- Test: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
- Test: `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
- Modify: `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`

- [ ] **Step 1: Run the complete static contract**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: `PASS: Google Play file library demo static validation passed`.

- [ ] **Step 2: Run syntax and offline dependency checks**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const a=h.indexOf('<script>');const b=h.lastIndexOf('</script>');new Function(h.slice(a+8,b));console.log('PASS: inline JavaScript syntax valid');"
rg -n 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: syntax PASS; dependency scan has no output.

- [ ] **Step 3: Manually verify the confirmed interaction sequence**

Open the existing local Demo and verify in order:

```text
1. Open Download … → stable “更多菜单”; X closes; no icons; no line before Copy.
2. Root defaults to 全部 + 最近修改↓.
3. Size sorts descending, then ascending on the next click.
4. 示例文件 is a root sibling of Download.
5. JPG, TXT, HTML, PDF and MP4 each open the unified read-only viewer.
6. Viewer has only Close + centered filename; closing restores the same directory/filter/sort.
7. MP4 plays, pauses, seeks, changes volume and enters fullscreen.
8. ZIP cancel changes no data.
9. ZIP confirm creates the same-name folder and retains ZIP.
10. A second extraction replaces the same-name folder without a third confirmation.
11. Each sample file still exposes Copy/Rename/Delete only through its list “…”.
12. Landscape hides Files and closes any viewer/extraction dialog.
```

Expected: all 12 checks pass without a new Toast or page error. If local `file://` automation remains blocked, record the click, screenshot and console rows as pending user manual acceptance; do not use another browser surface to bypass the restriction.

- [ ] **Step 4: Update the workflow state card with real evidence**

Use `apply_patch` to record:

```markdown
- D-010：更多菜单固定标题、关闭按钮、纯文字三项且取消自动聚焦。
- D-011：默认按最近修改降序；大小按钮切换升降序；筛选与排序状态独立。
- D-012：内部存储根目录增加同级“示例文件”，内含 JPG/TXT/HTML/PDF/MP4/ZIP。
- D-013：五类文件使用统一只读查看器；详情无分享和文件操作。
- D-014：ZIP 解压到当前目录，保留原 ZIP，同名文件夹直接替换。
```

Also record actual PASS/pending status for static, syntax, offline, video data, clicks, console, screenshots and strict visual review. Keep Android App, Manifest, AAB and Google Play as unchanged/not generated/not submitted.

- [ ] **Step 5: Commit only the state card**

Run:

```powershell
git add -- prd/workflow-state/GUANWANGGAID-21-google-play-review.md
git diff --cached --name-only
git commit -m "docs: record file viewer interaction evidence"
```

Expected: staged list contains only `prd/workflow-state/GUANWANGGAID-21-google-play-review.md`.

---

### Task 8: Center dialog headings and use four mutually exclusive sort fields

**Files:**

- Modify: `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
- Modify: `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`

- [ ] **Step 1: Add the failing static contract**

Replace the old dual filter/sort requirements with:

```powershell
Require-Text 'data-sort="name"' 'Name sort button is missing'
Require-Text 'data-sort="modified"' 'Modified-date sort button is missing'
Require-Text 'data-sort="type"' 'Type sort button is missing'
Require-Text 'data-sort="size"' 'Size sort button is missing'
Require-Text "sortBy:'name'" 'Default sort is not name'
Require-Text "sortOrder:'asc'" 'Default name sort is not ascending'
Require-Text 'function sortTypeRank' 'Type sort ranking is missing'
Require-Text 'function renderSortControls' 'Single-select sort control rendering is missing'
Require-Text '.extract-modal h3{text-align:center}' 'Extract dialog title is not centered'
Require-Text 'grid-template-columns:34px minmax(0,1fr) 34px' 'More menu title is not geometrically centered'
Forbid-Pattern 'data-filter=' 'Legacy type filter button is still present'
Forbid-Pattern 'typeFilter:' 'Legacy type filter state is still present'
```

Run both validators. Expected: FAIL for the new sort/title requirements before the Demo change.

- [ ] **Step 2: Center the two confirmed titles**

Change the Sheet heading CSS to a three-column grid so the center column remains geometrically centered despite the right close button:

```css
.sheet-head{height:34px;display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;margin:0 0 8px}
.sheet-head h3{grid-column:2;min-width:0;margin:0;text-align:center;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sheet-close{grid-column:3}
.extract-modal h3{text-align:center}
```

Add `extract-modal` to the ZIP dialog section:

```html
<section class="modal extract-modal" data-component-id="C-DIALOG" role="alertdialog" aria-modal="true" aria-labelledby="extractTitle">
```

- [ ] **Step 3: Replace the shortcut row with four sort buttons**

Use exactly one default active button:

```html
<div class="quick-row" aria-label="文件排序">
  <button class="quick active" data-sort="name" data-label="名称">名称↑</button>
  <button class="quick" data-sort="modified" data-label="修改日期">修改日期</button>
  <button class="quick" data-sort="type" data-label="类型">类型</button>
  <button class="quick" data-sort="size" data-label="大小">大小</button>
</div>
```

Remove all `data-filter` buttons and bindings.

- [ ] **Step 4: Replace the dual-state sort implementation**

Use a stable type rank and one active `sortBy` field:

```javascript
function sortTypeRank(item){
  const order={folder:0,image:1,video:2,text:3,html:4,pdf:5,archive:6,game:7};
  return Object.prototype.hasOwnProperty.call(order,item.type)?order[item.type]:8;
}

function compareNames(a,b){
  return a.name.localeCompare(b.name,'zh-CN',{numeric:true,sensitivity:'base'});
}

function sortDirectoryItems(items,state){
  const direction=state.sortOrder==='asc'?1:-1;
  return items.map((item,index)=>({item,index})).sort((left,right)=>{
    const a=left.item,b=right.item;
    if(state.sortBy==='name')return compareNames(a,b)*direction||left.index-right.index;
    if(state.sortBy==='type'){
      const rankDelta=(sortTypeRank(a)-sortTypeRank(b))*direction;
      return rankDelta||compareNames(a,b)||left.index-right.index;
    }
    const av=sortMetric(a,state.sortBy),bv=sortMetric(b,state.sortBy);
    if(av===null&&bv!==null)return 1;
    if(av!==null&&bv===null)return -1;
    if(av!==null&&bv!==null&&av!==bv)return (av-bv)*direction;
    return compareNames(a,b)||left.index-right.index;
  }).map(entry=>entry.item);
}

function renderSortControls(state){
  state.host.querySelectorAll('[data-sort]').forEach(btn=>{
    const selected=btn.dataset.sort===state.sortBy;
    btn.classList.toggle('active',selected);
    btn.textContent=`${btn.dataset.label}${selected?(state.sortOrder==='desc'?'↓':'↑'):''}`;
  });
}
```

Initialize the state with:

```javascript
sortBy:'name',sortOrder:'asc'
```

Apply search then sorting, call `renderSortControls(state)`, and bind the four buttons:

```javascript
state.sortOrder=state.sortBy===next
  ?(state.sortOrder==='desc'?'asc':'desc')
  :(next==='modified'||next==='size'?'desc':'asc');
state.sortBy=next;
```

- [ ] **Step 5: Run integrated checks**

Run Windows PowerShell, `pwsh`, Node inline syntax, and the offline dependency scan. Expected: all PASS and no `data-filter` or `typeFilter` marker.

Run a DOM/source assertion that the quick row has four buttons and exactly one static `active` class. Confirm the default label is `名称↑`.

- [ ] **Step 6: Update evidence and commit exact files**

Update D-011 and the current implementation result in the workflow state card to record the four mutually exclusive sort fields and centered titles. Commit the validator/spec/plan/state-card files precisely; the outside-repository Demo remains uncommitted.

---

## Plan self-review

### Spec coverage

- Stable fixed more menu, X, text-only actions and divider rules: Task 2.
- Historical modified-time sort and independent type filtering: Task 3; superseded by the confirmed four-field single-select sort in Task 8.
- Root-level sample folder and six directly nested files: Task 3.
- Unified read-only viewer for image, TXT, HTML, PDF and video: Task 4.
- Real offline sample image and playable video: Task 5.
- ZIP confirmation, current-folder extraction, ZIP retention and direct overwrite: Task 6.
- Landscape cleanup, offline validation and evidence status: Tasks 6 and 7.

### Type consistency

- Final state consistently uses `sortBy`, `sortOrder`, `viewingFile`, `pendingAction`, `actionTarget` and `draftName`; Task 8 removes the obsolete `typeFilter`.
- Demo items consistently use `type`, `sizeBytes`, `modifiedAt`, optional `children`, optional `extractChildren` and optional `textContent`.
- All supported file rows route through `openFileViewer`; ZIP routes through `openExtractConfirm`; list `…` remains the only Copy/Rename/Delete entry.

### Scope conclusion

This is one testable increment on the existing portrait Manager. It does not add Android code, SAF, sharing, editing, external viewers, arbitrary archive support, a landscape file page, AAB generation or Google Play submission.
