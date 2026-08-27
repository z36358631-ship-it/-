# Google Play 竖屏文件管理 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有方案 C 离线 Demo 改造成只支持竖屏、仅管理内部存储，并完整支持授权、目录浏览、复制、重命名和删除的文件管理 MVP。

**Architecture:** 保留一个离线单文件 HTML 和一个 Manager 实例，以 `permission + orientation + libraryTab + pathStack + pendingAction` 统一状态驱动 DOM。文件树使用内存对象，复制、重命名、删除直接修改当前目录数组；PC游戏和复古游戏继续使用独立 Panel，不读取文件 Manager 状态。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、内嵌 SVG/Base64 WebP、PowerShell 静态校验、Node.js 内联脚本语法校验、Codex in-app Browser 人工交互检查。

---

## 1. 文件结构与责任

### 修改

- `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
  - 唯一用户可操作 Demo。
  - 保留手机 Shell、底部五栏、原首页和本地内嵌媒体。
  - 承载文件授权、目录树、三项文件操作、PC游戏、复古游戏和方向状态。
- `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
  - 从旧方案 C 验收更新为竖屏文件管理 MVP 静态契约。
- `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`
  - 记录最新决策、实际验证结果、未完成视觉证据和外部审核风险。

### 不创建

- 不拆分外链 CSS、JavaScript、字体或图片。
- 不创建 Android Activity、Fragment、Manifest 或 AAB。
- 不创建横屏文件管理页面。

### 视觉和交互来源

- PC游戏：用户提供的布局调整截图 + `screen-18`。
- 内部存储卡：用户提供的圆环容量卡截图。
- 重命名：用户提供的“修改信息”弹窗截图。
- 复制：用户提供的“复制布局”弹窗截图。
- 删除：`screen-27` 危险确认。
- 组件：`C-SHELL-P`、`C-NAV-P`、`C-TAB`、`C-INPUT-SEARCH`、`C-SHEET`、`C-DIALOG`、`C-FEEDBACK`、`C-BUTTON-GLOW`、`C-BUTTON-SECONDARY`。

---

### Task 1: 先更新会失败的静态契约

**Files:**

- Modify: `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`
- Test: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`

- [ ] **Step 1: 替换新规格的必需项检查**

在现有 `$fixedNavigation`、`Require-Text` 和 `Forbid-Pattern` 结构内，将旧的权限、游戏添加能力检查替换为：

```powershell
Require-Text $fixedNavigation 'Missing fixed five-tab navigation semantics'
Require-Text 'data-library-tab="files"' 'Missing Files tab'
Require-Text 'data-library-tab="pc"' 'Missing PC Games tab'
Require-Text 'data-library-tab="retro"' 'Missing Retro Games tab'
Require-Text 'data-component-id="C-CAPACITY"' 'Missing internal storage capacity card'
Require-Text 'data-permission-state="denied"' 'Missing denied permission state'
Require-Text 'data-system-settings-sim' 'Missing Android system settings simulation'
Require-Text 'data-file-action="copy"' 'Missing Copy action'
Require-Text 'data-file-action="rename"' 'Missing Rename action'
Require-Text 'data-file-action="delete"' 'Missing Delete action'
Require-Text 'id="nameActionDialog"' 'Missing copy/rename naming dialog'
Require-Text 'id="deleteConfirmDialog"' 'Missing delete confirmation dialog'
Require-Text "permission:'unknown'" 'Initial permission is not unknown'
Require-Text 'pathStack:[]' 'Missing directory stack'
Require-Text 'function enterFolder' 'Missing folder navigation'
Require-Text 'function confirmCopy' 'Missing copy implementation'
Require-Text 'function confirmRename' 'Missing rename implementation'
Require-Text 'function confirmDelete' 'Missing delete implementation'
Require-Text 'isMobileLandscape' 'Missing portrait-only orientation rule'
```

- [ ] **Step 2: 加入新规格的禁止项检查**

```powershell
Forbid-Pattern 'data-storage="sd"|data-storage="usb"' 'SD or USB storage is still present'
Forbid-Pattern 'count-label|\d+\s*项' 'File count copy is still present'
Forbid-Pattern 'action-bar|data-file-action="move"|add-game' 'Removed file actions are still present'
Forbid-Pattern 'GAMEHUB LOCAL|permission-chip' 'Legacy file header is still present'
Forbid-Pattern 'data-option=|function\s+setOption|location\.hash' 'A/B or hash mode is still present'
Forbid-Pattern 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'Demo is not a fully offline single file'
```

- [ ] **Step 3: 运行脚本确认旧 Demo 失败**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: exit code `1`，至少报告容量卡、未授权状态、目录栈、复制/重命名/删除实现、SD卡仍存在和旧操作栏仍存在。

- [ ] **Step 4: 精确提交验收脚本**

```powershell
git add -- scripts/validate-google-play-file-library-demo.ps1
git diff --cached --name-only
git commit -m "test: update portrait file library validation"
```

Expected: 暂存清单只有 `scripts/validate-google-play-file-library-demo.ps1`。

---

### Task 2: 收敛竖屏页面骨架和内部存储卡

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:7-52`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:125-150`

- [ ] **Step 1: 删除旧文件页标题和多存储结构**

从 `managerTemplate` 删除：

```html
<header class="topbar">…GAMEHUB LOCAL…permission-chip…</header>
<div class="storage-grid">…内部存储…SD 卡…USB…</div>
<span class="count-label">6 项</span>
<div class="action-bar">…</div>
```

Expected: 文件页第一块可见内容是三个业务 Tab，不再存在 SD、USB、数量或多选操作栏。

- [ ] **Step 2: 使用单一顶部 Tab**

```html
<div class="library-tabs" role="tablist" aria-label="文件库分类" data-component-id="C-TAB">
  <button class="library-tab active" role="tab" aria-selected="true" data-library-tab="files">文件</button>
  <button class="library-tab" role="tab" aria-selected="false" data-library-tab="pc">PC游戏</button>
  <button class="library-tab" role="tab" aria-selected="false" data-library-tab="retro">复古游戏</button>
</div>
```

- [ ] **Step 3: 新增紧凑内部存储容量卡**

```html
<section class="capacity-card" data-component-id="C-CAPACITY" aria-label="内部存储容量">
  <div class="capacity-ring" style="--used:43.7%">
    <div><strong>26.3 GB</strong><span>可用</span></div>
  </div>
  <div class="capacity-copy">
    <span>已用</span><strong>20.4 GB</strong>
    <small><i class="used-dot"></i>已安装 20.4 GB</small>
    <small><i class="free-dot"></i>可用 26.3 GB</small>
  </div>
</section>
```

使用真实 DOM 和 CSS `conic-gradient` 绘制圆环，不使用 Canvas、背景截图或远程资源。

- [ ] **Step 4: 加入容量卡样式**

```css
.capacity-card{margin:14px 16px;min-height:126px;padding:16px 18px;display:grid;grid-template-columns:112px 1fr;gap:20px;align-items:center;border-radius:20px;background:linear-gradient(145deg,#2d2e33,#25262b);border:1px solid rgba(255,255,255,.09)}
.capacity-ring{--used:43.7%;width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#379bf2 0 var(--used),rgba(255,255,255,.08) var(--used) 100%)}
.capacity-ring:before{content:"";grid-area:1/1;width:76px;height:76px;border-radius:50%;background:#303138}
.capacity-ring>div{grid-area:1/1;z-index:1;text-align:center}.capacity-ring strong,.capacity-ring span{display:block}
.capacity-copy{display:grid;gap:5px}.capacity-copy>strong{font-size:20px}.capacity-copy small{color:#8d8e95}.capacity-copy i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px}.used-dot{background:#379bf2}.free-dot{background:#777980}
```

- [ ] **Step 5: 保留搜索、筛选和路径容器**

```html
<section class="library-panel active" data-library-panel="files">
  <div class="permission-state" data-permission-state="granted">
    <!-- 容量卡 -->
    <label class="search" data-component-id="C-INPUT-SEARCH">…</label>
    <div class="quick-row">…全部 / 最近修改 / 压缩包 / 文件夹…</div>
    <div class="path-head"><button class="path-back" aria-label="返回上一级">…</button><strong class="path-label">内部存储</strong></div>
    <div class="file-list"></div>
  </div>
  <div class="permission-state" data-permission-state="denied" data-component-id="C-FEEDBACK">…</div>
</section>
```

- [ ] **Step 6: 运行新脚本确认仍失败但骨架错误减少**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: 不再报告容量卡、SD/USB、数量、多选操作栏；仍报告权限模拟、目录和三项操作函数。

---

### Task 3: 实现首次授权和未授权缺省态

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:114-120`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:152-238`

- [ ] **Step 1: 用系统设置模拟替换旧权限弹窗**

```html
<div class="system-settings-sim" data-system-settings-sim hidden>
  <section class="system-settings-card" role="dialog" aria-modal="true" aria-labelledby="systemSettingsTitle">
    <span class="system-kicker">Android 系统设置模拟</span>
    <h3 id="systemSettingsTitle">允许管理所有文件</h3>
    <p>允许盖世游戏访问、管理和整理设备内部存储中的文件。</p>
    <div class="system-actions">
      <button id="systemPermissionBack" class="secondary">返回</button>
      <button id="systemPermissionAllow" class="primary">允许</button>
    </div>
  </section>
</div>
```

Demo 必须显示“模拟”，防止把 HTML 行为描述成真实 Android 设置。

- [ ] **Step 2: 写入未授权缺省态**

```html
<div class="permission-state permission-denied" data-permission-state="denied" data-component-id="C-FEEDBACK">
  <svg class="permission-visual icon"><use href="#i-folder"/></svg>
  <h3>未获得文件访问权限</h3>
  <p>允许访问设备文件后，才能浏览和管理内部存储中的文件。</p>
  <button class="primary" id="requestPermission">去授权</button>
</div>
```

- [ ] **Step 3: 定义唯一 Manager 初始状态**

```javascript
const state={
  host,
  permission:'unknown',
  libraryTab:'files',
  orientation:'portrait',
  pathStack:[],
  query:'',
  filter:'all',
  pendingAction:null,
  actionTarget:null,
  draftName:'',
  firstPermissionPrompted:false
};
```

- [ ] **Step 4: 实现权限渲染和模拟系统跳转**

```javascript
function renderPermission(state){
  const granted=state.permission==='granted';
  state.host.querySelector('[data-permission-state="granted"]').hidden=!granted;
  state.host.querySelector('[data-permission-state="denied"]').hidden=granted;
  if(granted) renderCurrentDirectory(state);
}

function openSystemPermission(state){
  state.firstPermissionPrompted=true;
  document.querySelector('[data-system-settings-sim]').hidden=false;
}

function resolveSystemPermission(state,granted){
  document.querySelector('[data-system-settings-sim]').hidden=true;
  state.permission=granted?'granted':'denied';
  state.pathStack=[];
  renderPermission(state);
}
```

- [ ] **Step 5: 绑定首次自动拉起和再次授权**

```javascript
document.getElementById('requestPermission').onclick=()=>openSystemPermission(managerState);
document.getElementById('systemPermissionAllow').onclick=()=>resolveSystemPermission(managerState,true);
document.getElementById('systemPermissionBack').onclick=()=>resolveSystemPermission(managerState,false);
requestAnimationFrame(()=>{
  if(!managerState.firstPermissionPrompted) openSystemPermission(managerState);
});
```

- [ ] **Step 6: 静态检查权限状态**

Run:

```powershell
rg -n "permission:'unknown'|data-system-settings-sim|未获得文件访问权限|requestPermission|resolveSystemPermission" 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: 五类标记均存在；旧 `permissionModal`、`permission-chip`、`permission:'granted'` 不存在。

---

### Task 4: 实现内部存储目录树和文件夹进入

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:154-220`

- [ ] **Step 1: 用嵌套目录替换多存储 datasets**

```javascript
const fileSystem={
  name:'内部存储',type:'folder',children:[
    {name:'Download',meta:'文件夹 · 今天 10:42',type:'folder',children:[
      {name:'安装包',meta:'文件夹 · 3 个项目',type:'folder',children:[]},
      {name:'GameSave_Backup.zip',meta:'压缩包 · 245 MB',type:'archive'}
    ]},
    {name:'Games',meta:'文件夹 · 2 个项目',type:'folder',children:[
      {name:'Hollow_Knight_Silksong.exe',meta:'PC 游戏 · 8.6 GB',type:'game'},
      {name:'Cyberpunk2077.exe',meta:'PC 游戏 · 71.2 GB',type:'game'}
    ]},
    {name:'Documents',meta:'文件夹 · 昨天 20:15',type:'folder',children:[]},
    {name:'MetalSlug.zip',meta:'压缩包 · 86 MB',type:'archive'}
  ]
};
```

- [ ] **Step 2: 定义当前目录读取**

```javascript
function currentDirectory(state){
  return state.pathStack.reduce((dir,name)=>dir.children.find(item=>item.type==='folder'&&item.name===name),fileSystem);
}

function currentItems(state){
  return currentDirectory(state).children;
}
```

- [ ] **Step 3: 实现目录入栈和返回**

```javascript
function enterFolder(state,name){
  const target=currentItems(state).find(item=>item.type==='folder'&&item.name===name);
  if(!target)return;
  state.pathStack.push(name);
  state.query='';
  state.host.querySelector('input[type="search"]').value='';
  renderCurrentDirectory(state);
}

function leaveFolder(state){
  if(state.pathStack.length===0)return;
  state.pathStack.pop();
  renderCurrentDirectory(state);
}
```

- [ ] **Step 4: 路径和返回按钮与状态同步**

```javascript
function renderPath(state){
  state.host.querySelector('.path-label').textContent=['内部存储',...state.pathStack].join(' / ');
  state.host.querySelector('.path-back').hidden=state.pathStack.length===0;
}
```

- [ ] **Step 5: 定义当前目录完整渲染**

```javascript
function renderCurrentDirectory(state){
  renderPath(state);
  const list=state.host.querySelector('.file-list');
  const empty=state.host.querySelector('.empty-search');
  let items=[...currentItems(state)];
  if(state.filter!=='all')items=items.filter(item=>state.filter==='recent'?item.type!=='folder':item.type===state.filter);
  if(state.query)items=items.filter(item=>item.name.toLowerCase().includes(state.query.toLowerCase()));
  list.innerHTML=items.map(item=>`<div class="file-row ${item.type}"><span class="file-glyph">${svg(item.type==='folder'?'i-folder':item.type==='game'?'i-game':'i-file')}</span><span class="file-info"><span class="file-name">${item.name}</span><span class="file-meta">${item.meta}</span></span><button class="more-btn" aria-label="${item.name}更多操作">${svg('i-more')}</button></div>`).join('');
  empty.textContent=state.query?'没有匹配的文件':'此文件夹为空';
  empty.classList.toggle('show',items.length===0);
  [...list.children].forEach((row,index)=>bindFileRow(state,row,items[index]));
}
```

- [ ] **Step 6: 文件行点击行为改为文件夹进入**

```javascript
function bindFileRow(state,row,item){
  row.onclick=e=>{
    if(e.target.closest('.more-btn'))return;
    if(item.type==='folder')enterFolder(state,item.name);
  };
  row.querySelector('.more-btn').onclick=e=>{
    e.stopPropagation();
    openActionMenu(state,item);
  };
}

state.host.querySelector('input[type="search"]').oninput=e=>{
  state.query=e.target.value.trim();
  renderCurrentDirectory(state);
};
state.host.querySelectorAll('.quick').forEach(btn=>btn.onclick=()=>{
  state.host.querySelectorAll('.quick').forEach(item=>item.classList.remove('active'));
  btn.classList.add('active');
  state.filter=btn.dataset.filter;
  renderCurrentDirectory(state);
});
state.host.querySelector('.path-back').onclick=()=>leaveFolder(state);
```

不得再切换 `.selected` 或显示多选栏。

- [ ] **Step 7: 运行 Node 内联语法检查**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const a=h.indexOf('<script>');const b=h.lastIndexOf('</script>');new Function(h.slice(a+8,b));console.log('PASS: inline JavaScript syntax valid');"
```

Expected: `PASS: inline JavaScript syntax valid`。

---

### Task 5: 实现复制、重命名、删除完整交互

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:114-124`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:220-280`

- [ ] **Step 1: 将更多 Sheet 收敛为三项**

```html
<section class="sheet item-action-sheet" id="actionSheet" aria-label="文件操作">
  <h3 id="sheetTitle">文件操作</h3>
  <button class="sheet-row" data-file-action="copy">复制</button>
  <button class="sheet-row" data-file-action="rename">重命名</button>
  <button class="sheet-row danger" data-file-action="delete">删除</button>
</section>
```

Expected: Sheet 不存在移动和添加到PC/复古游戏。

- [ ] **Step 2: 新增复制/重命名共用命名弹窗**

```html
<div class="modal-backdrop" id="nameActionDialog">
  <section class="modal naming-modal" role="dialog" aria-modal="true" aria-labelledby="nameActionTitle">
    <button class="modal-close" data-name-close aria-label="关闭">×</button>
    <h3 id="nameActionTitle">复制文件</h3>
    <p id="nameActionDescription">副本将保存到当前目录，是否使用以下命名</p>
    <label class="name-field"><input id="nameActionInput" maxlength="50"/><span id="nameCounter">0/50</span></label>
    <p class="name-error" id="nameActionError" hidden></p>
    <div class="modal-actions"><button class="secondary" data-name-cancel>取消</button><button class="primary" id="nameActionConfirm">确认</button></div>
  </section>
</div>
```

- [ ] **Step 3: 新增删除确认**

```html
<div class="modal-backdrop" id="deleteConfirmDialog">
  <section class="modal danger-modal" role="alertdialog" aria-modal="true" aria-labelledby="deleteTitle">
    <h3 id="deleteTitle">提示</h3>
    <p id="deleteMessage">是否删除该项目？</p>
    <div class="modal-actions"><button class="secondary" data-delete-cancel>取消</button><button class="primary danger" id="deleteConfirm">删除</button></div>
  </section>
</div>
```

- [ ] **Step 4: 定义副本名和命名校验**

```javascript
function defaultCopyName(item){
  if(item.type==='folder')return `${item.name}_副本`;
  const dot=item.name.lastIndexOf('.');
  return dot>0?`${item.name.slice(0,dot)}_副本${item.name.slice(dot)}`:`${item.name}_副本`;
}

function validateDraftName(state){
  const value=state.draftName.trim();
  if(!value)return '请输入名称';
  if(value.length>50)return '名称不能超过50个字符';
  if(/[\\/:*?"<>|]/.test(value))return '名称包含不可用字符';
  if(currentItems(state).some(item=>item!==state.actionTarget&&item.name===value))return '当前目录已存在同名项目';
  return '';
}
```

- [ ] **Step 5: 打开三项操作**

```javascript
function openActionMenu(state,item){
  state.actionTarget=item;
  document.getElementById('sheetTitle').textContent=item.name;
  document.getElementById('actionSheet').classList.add('show');
}

function openNameAction(state,action){
  document.getElementById('actionSheet').classList.remove('show');
  state.pendingAction=action;
  state.draftName=action==='copy'?defaultCopyName(state.actionTarget):state.actionTarget.name;
  document.getElementById('nameActionTitle').textContent=action==='copy'?(state.actionTarget.type==='folder'?'复制文件夹':'复制文件'):'重命名';
  document.getElementById('nameActionDescription').hidden=action!=='copy';
  const input=document.getElementById('nameActionInput');
  input.value=state.draftName;
  renderNameValidation(state);
  document.getElementById('nameActionDialog').classList.add('show');
}
```

- [ ] **Step 6: 定义命名校验渲染和关闭行为**

```javascript
function renderNameValidation(state){
  const error=validateDraftName(state);
  const errorNode=document.getElementById('nameActionError');
  document.getElementById('nameCounter').textContent=`${state.draftName.length}/50`;
  errorNode.textContent=error;
  errorNode.hidden=!error;
  document.getElementById('nameActionConfirm').disabled=Boolean(error);
}

function closeNameAction(state){
  document.getElementById('nameActionDialog').classList.remove('show');
  state.pendingAction=null;
  state.actionTarget=null;
  state.draftName='';
}

function closeDeleteConfirm(state){
  document.getElementById('deleteConfirmDialog').classList.remove('show');
  state.pendingAction=null;
  state.actionTarget=null;
}
```

- [ ] **Step 7: 完成复制数据操作**

```javascript
function cloneItem(item){
  return {name:item.name,meta:item.meta,type:item.type,...(item.children?{children:item.children.map(cloneItem)}:{})};
}

function confirmCopy(state){
  const error=validateDraftName(state);
  if(error)return renderNameValidation(state);
  const copy=cloneItem(state.actionTarget);
  copy.name=state.draftName.trim();
  currentItems(state).push(copy);
  closeNameAction(state);
  renderCurrentDirectory(state);
}
```

- [ ] **Step 8: 完成重命名数据操作**

```javascript
function confirmRename(state){
  const error=validateDraftName(state);
  if(error)return renderNameValidation(state);
  state.actionTarget.name=state.draftName.trim();
  closeNameAction(state);
  renderCurrentDirectory(state);
}
```

- [ ] **Step 9: 完成删除二次确认**

```javascript
function openDeleteConfirm(state){
  document.getElementById('actionSheet').classList.remove('show');
  state.pendingAction='delete';
  document.getElementById('deleteMessage').textContent=`是否删除“${state.actionTarget.name}”？`;
  document.getElementById('deleteConfirmDialog').classList.add('show');
}

function confirmDelete(state){
  const items=currentItems(state);
  const index=items.indexOf(state.actionTarget);
  if(index>=0)items.splice(index,1);
  closeDeleteConfirm(state);
  renderCurrentDirectory(state);
}
```

- [ ] **Step 10: 绑定取消、关闭、输入和确认**

```javascript
document.querySelector('[data-file-action="copy"]').onclick=()=>openNameAction(managerState,'copy');
document.querySelector('[data-file-action="rename"]').onclick=()=>openNameAction(managerState,'rename');
document.querySelector('[data-file-action="delete"]').onclick=()=>openDeleteConfirm(managerState);
document.getElementById('nameActionInput').oninput=e=>{managerState.draftName=e.target.value;renderNameValidation(managerState)};
document.getElementById('nameActionConfirm').onclick=()=>managerState.pendingAction==='copy'?confirmCopy(managerState):confirmRename(managerState);
document.querySelectorAll('[data-name-close],[data-name-cancel]').forEach(btn=>btn.onclick=()=>closeNameAction(managerState));
document.querySelector('[data-delete-cancel]').onclick=()=>closeDeleteConfirm(managerState);
document.getElementById('deleteConfirm').onclick=()=>confirmDelete(managerState);
```

- [ ] **Step 11: 验证三项能力与禁止项**

Run:

```powershell
rg -n 'data-file-action="copy"|data-file-action="rename"|data-file-action="delete"|function confirmCopy|function confirmRename|function confirmDelete' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
rg -n 'data-file-action="move"|add-game|action-bar' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: 第一条命令命中六类必需项；第二条命令无输出。

---

### Task 6: 还原 PC游戏布局调整版并实现横屏隐藏文件

**Files:**

- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:41-52`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:148-152`
- Modify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html:280-330`

- [ ] **Step 1: 将 PC游戏 Panel 改为用户截图结构**

```html
<section class="library-panel pc-library" data-library-panel="pc">
  <div class="platform-row">
    <button class="platform-card">Steam</button>
    <button class="platform-card">Epic</button>
    <button class="platform-card import-card"><svg class="icon"><use href="#i-plus"/></svg>导入游戏</button>
  </div>
  <div class="my-games-head">
    <div><strong>我的游戏</strong><span>1款</span></div>
    <div class="library-tools"><button aria-label="搜索">…</button><button aria-label="设置">…</button><button>最近游玩</button><button aria-label="筛选">…</button></div>
  </div>
  <div class="library-game-grid" data-game-grid="pc"></div>
</section>
```

使用现有内嵌媒体作为游戏封面；不把用户截图作为整页背景。

- [ ] **Step 2: 复古游戏保持独立 Panel**

复古 Panel 保留现有正式结构和卡片数据，不复用文件容量卡、权限或目录 DOM。

- [ ] **Step 3: 定义移动横屏判断**

```javascript
function isMobileLandscape(){
  return window.innerWidth<=900&&window.innerWidth>window.innerHeight;
}

function applyOrientation(state){
  const landscape=isMobileLandscape();
  state.orientation=landscape?'landscape':'portrait';
  state.host.querySelector('[data-library-tab="files"]').hidden=landscape;
  state.host.querySelector('[data-library-panel="files"]').hidden=landscape;
  if(landscape&&state.libraryTab==='files')setLibraryTab(state,'pc');
}
```

- [ ] **Step 4: 绑定方向变化**

```javascript
window.addEventListener('resize',()=>applyOrientation(managerState));
applyOrientation(managerState);
```

`<=900px` 限制用于避免桌面中的竖屏手机预览因为外层桌面浏览器是横向画布而错误隐藏文件 Tab。

- [ ] **Step 5: 加入 CSS 兜底**

```css
@media (orientation:landscape) and (max-width:900px){
  [data-library-tab="files"],[data-library-panel="files"]{display:none!important}
}
```

- [ ] **Step 6: 检查横屏规则没有创建文件占位页**

Run:

```powershell
rg -n '不支持横屏|横屏文件|landscape-file|file-landscape' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: 无匹配；横屏通过隐藏和自动切 PC游戏完成，不显示占位提示。

---

### Task 7: 完整静态、语法和交互验收

**Files:**

- Test: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`
- Test: `C:\Users\z3635\官网改动\scripts\validate-google-play-file-library-demo.ps1`

- [ ] **Step 1: 运行静态契约**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate-google-play-file-library-demo.ps1
```

Expected: `PASS: Google Play file library demo static validation passed`。

- [ ] **Step 2: 运行内联 JavaScript 语法检查**

Run:

```powershell
node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/z3635/Documents/Codex/2026-08-26/new-chat/outputs/google-play-file-home-ab-demo.html','utf8');const a=h.indexOf('<script>');const b=h.lastIndexOf('</script>');if(a<0||b<a)throw new Error('inline script not found');new Function(h.slice(a+8,b));console.log('PASS: inline JavaScript syntax valid');"
```

Expected: `PASS: inline JavaScript syntax valid`。

- [ ] **Step 3: 运行离线依赖检查**

Run:

```powershell
rg -n 'https?://|<iframe\b|<canvas\b|<script\b[^>]*\bsrc=|<link\b[^>]*\brel=' 'C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html'
```

Expected: 无输出。

- [ ] **Step 4: 验收首次授权闭环**

在竖屏打开或刷新 Demo，依次验证：

```text
首次自动出现“Android 系统设置模拟”
点击返回 → 未授权缺省态
点击去授权 → 再次打开设置模拟
点击允许 → 只显示内部存储容量、搜索、筛选和根目录
```

Expected: 未授权时文件行数量为 0；授权后根目录恢复；没有 SD/USB。

- [ ] **Step 5: 验收目录栈**

```text
点击 Download → 路径变为“内部存储 / Download”
点击 安装包 → 路径变为“内部存储 / Download / 安装包”
连续点击返回 → 回到内部存储根目录
```

Expected: 文件夹点击不进入选中态；根目录返回按钮隐藏。

- [ ] **Step 6: 验收复制完整交互**

```text
打开 GameSave_Backup.zip 的 … → 复制
默认名为 GameSave_Backup_副本.zip
清空名称 → 显示内联错误且确认不可用
输入已有名称 GameSave_Backup.zip → 显示重名错误
输入 GameSave_Backup_副本.zip → 确认
```

Expected: 当前目录同时存在原文件和副本；无 Toast。

- [ ] **Step 7: 验收重命名完整交互**

```text
打开副本的 … → 重命名
关闭 → 名称不变
再次打开 → 输入 GameSave_Archive.zip → 确认
```

Expected: 原副本名称更新为 `GameSave_Archive.zip`，类型仍为压缩包；无 Toast。

- [ ] **Step 8: 验收删除二次确认**

```text
打开 GameSave_Archive.zip 的 … → 删除
取消 → 文件仍存在
再次删除 → 确认
```

Expected: 文件从当前目录消失；无 Toast或结果页。

- [ ] **Step 9: 验收 PC/复古和横屏**

```text
切 PC游戏 → 平台入口卡、我的游戏和游戏卡存在
切 复古游戏 → 原复古内容存在
竖屏回文件 → 文件状态仍可访问
移动设备横屏且当前为文件 → 文件 Tab隐藏并自动切 PC游戏
横屏回竖屏 → 文件 Tab恢复但保持 PC游戏
```

Expected: PC/复古不出现文件容量、权限或目录组件。

- [ ] **Step 10: 检查页面错误**

读取浏览器控制台页面错误。

Expected: `error` 级别页面脚本错误为 `0`。若本地 `file://` 自动浏览器控制受安全策略阻止，必须记录“交互/截图待用户人工验收”，不得使用其他浏览器表面或绕过策略冒充自动验收。

---

### Task 8: 回写状态卡并做最终范围检查

**Files:**

- Modify: `C:\Users\z3635\官网改动\prd\workflow-state\GUANWANGGAID-21-google-play-review.md`
- Verify: `C:\Users\z3635\官网改动\docs\superpowers\specs\2026-08-27-google-play-file-library-portrait-mvp-design.md`
- Verify: `C:\Users\z3635\Documents\Codex\2026-08-26\new-chat\outputs\google-play-file-home-ab-demo.html`

- [ ] **Step 1: 更新有效决策**

状态卡至少记录：

```markdown
- D-006：文件管理仅支持竖屏；横屏隐藏文件并自动切 PC游戏。
- D-007：只保留内部存储，容量卡采用圆环结构；移除 SD/USB 和数量文案。
- D-008：首次进入自动拉起所有文件访问设置模拟；拒绝后显示页内缺省态和去授权。
- D-009：文件夹支持进入下一层；`…` 只保留复制、重命名、删除并完成全部交互。
```

- [ ] **Step 2: 记录真实证据状态**

```markdown
- 静态契约：PASS / FAIL（按实际结果）。
- 内联 JavaScript：PASS / FAIL（按实际结果）。
- 浏览器交互：PASS / 待用户人工验收（按实际结果）。
- 严格视觉：待审；没有同构完整文件页原稿，不声明 95% PASS。
- Android App：未修改。
- AAB：未生成。
- Google Play：未提交。
```

- [ ] **Step 3: 检查没有扩大范围**

Run:

```powershell
git status --short -- scripts/validate-google-play-file-library-demo.ps1 prd/workflow-state/GUANWANGGAID-21-google-play-review.md
git diff --name-only HEAD
```

Expected: 本轮 Git 变更只包含验证脚本和状态卡；Demo 位于仓库外；Android、Manifest、AAB 和无关用户文件未被本轮修改。

- [ ] **Step 4: 精确提交状态卡**

```powershell
git add -- prd/workflow-state/GUANWANGGAID-21-google-play-review.md
git diff --cached --name-only
git commit -m "docs: record portrait file library mvp evidence"
```

Expected: 暂存清单只有状态卡。

- [ ] **Step 5: 最终交付检查**

最终汇报必须分别声明：

```text
本地 Demo：已修改；列出静态、语法和交互的真实状态
Android App：未修改
AAB：未生成
Google Play：未提交、未验证真实通过率
严格视觉：待审，不以模拟概率或局部截图替代同构证据
```

提供 Demo、规格、计划、验证脚本和状态卡的绝对路径。

---

## 2. 计划自检

### 规格覆盖

- 顶部三 Tab：Task 2。
- 单内部存储圆环容量卡、移除 SD/USB 和数量：Task 2。
- 首次自动授权、拒绝缺省态、再次授权：Task 3。
- 目录进入和返回：Task 4。
- `…` 的复制、重命名、删除完整交互：Task 5。
- PC游戏布局调整版和复古内容保留：Task 6。
- 横屏隐藏文件并切 PC游戏：Task 6。
- 离线、语法、交互、控制台和范围：Task 7、Task 8。

### 类型一致性

- 统一使用 `pendingAction`、`actionTarget`、`draftName`。
- 统一使用 `fileSystem`、`currentDirectory()`、`currentItems()` 管理目录数据。
- 统一使用 `openNameAction()` 分流复制和重命名；提交分别调用 `confirmCopy()`、`confirmRename()`。
- 统一使用 `openDeleteConfirm()`、`confirmDelete()` 完成危险操作。
- 统一使用 `isMobileLandscape()` 和 `applyOrientation()` 控制方向，不创建横屏文件 Panel。

### 范围结论

本规格为一个可独立测试的子系统：竖屏文件管理 Demo。PC游戏、复古游戏只做既有布局承接；Android 实现、商店素材和 Google Play 提交不属于本计划。
