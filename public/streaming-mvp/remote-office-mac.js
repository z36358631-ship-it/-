/* AI办公一期电脑端适配：仅浏览器DOM串流演示，不调用AI或远控服务。 */
const remoteOfficeMac={origin:'detail',capture:'desktop',thread:'',query:'',empty:false,notice:'',guide:false,demo:'all',listState:'ready',treeOpen:{},devices:{},filterDevice:'all'};
const romThreads=[
 {id:'win-vscode',device:'win',app:'vscode',folder:'晴川记账',folderEn:'Clearbrook Ledger',title:'新增月度预算提醒',titleEn:'Add monthly budget reminders',summary:'设置预算阈值与提醒时机',summaryEn:'Set budget thresholds and reminder timing',time:'刚刚',timeEn:'Just now'},
 {id:'win-ledger-filter',device:'win',app:'vscode',folder:'晴川记账',folderEn:'Clearbrook Ledger',title:'优化账单筛选',titleEn:'Improve transaction filters',summary:'按日期和收支分类筛选',summaryEn:'Filter by date and transaction category',time:'20分钟前',timeEn:'20 min ago'},
 {id:'win-travel-export',device:'win',app:'vscode',folder:'旅途清单',folderEn:'Journey Checklist',title:'导出行程为 PDF',titleEn:'Export an itinerary as PDF',summary:'检查行程导出的分页效果',summaryEn:'Review pagination in itinerary exports',time:'昨天',timeEn:'Yesterday'},
 {id:'win-claude',device:'win',app:'claude',title:'整理春季活动文案',titleEn:'Organize spring campaign copy',summary:'梳理活动介绍和页面文案',summaryEn:'Refine campaign introductions and page copy',time:'1小时前',timeEn:'1 hour ago'},
 {id:'win-content-faq',device:'win',app:'claude',title:'补充常见问题说明',titleEn:'Expand frequently asked questions',summary:'核对读者疑问与解释',summaryEn:'Review reader questions and explanations',time:'昨天',timeEn:'Yesterday'},
 {id:'work-workbuddy',device:'work',app:'workbuddy',folder:'任务',folderEn:'Tasks',title:'汇总本周项目进度',titleEn:'Summarize weekly project progress',summary:'整理里程碑与后续事项',summaryEn:'Organize milestones and next steps',time:'今天',timeEn:'Today'},
 {id:'work-task-catalog',device:'work',app:'workbuddy',folder:'任务',folderEn:'Tasks',title:'归档活动素材',titleEn:'Archive campaign assets',summary:'按用途归档图文素材',summaryEn:'Organize images and copy by purpose',time:'昨天',timeEn:'Yesterday'},
 {id:'work-task-stats',device:'work',app:'workbuddy',folder:'任务',folderEn:'Tasks',title:'校验数据统计口径',titleEn:'Validate metric definitions',summary:'核对统计周期和计数规则',summaryEn:'Check reporting periods and counting rules',time:'2天前',timeEn:'2 days ago'},
 {id:'mac-claude',device:'mac',app:'claude',title:'复核帮助中心文案',titleEn:'Review help center copy',summary:'核对指引与说明内容',summaryEn:'Review instructions and explanations',time:'3天前',timeEn:'3 days ago'}
];
const romL=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const romTitle=x=>x?romL(x.title,x.titleEn||x.title):'';
const romFolder=x=>romL(x.folder||'会话',x.folderEn||'Sessions');
const romTime=x=>romL(x.time||'刚刚',x.timeEn||'Just now');
const romApps=[{id:'vscode',name:'ChatGPT',icon:'file'},{id:'claude',name:'Claude',icon:'chat'},{id:'workbuddy',name:'WorkBuddy',icon:'grid'},{id:'browser',name:'Chrome',icon:'monitor'},{id:'files',name:'文件资源管理器',icon:'folder'},{id:'document',name:'文档',icon:'file'},{id:'editor',name:'代码编辑器',icon:'file'}];
function romAppIcon(id){if(id==='files')return icon('folder');if(id==='document')return icon('file');return typeof remoteAiIcon==='function'?remoteAiIcon(id):icon(romApps.find(a=>a.id===id)?.icon||'chat');}
function romStore(){return remoteOfficeMac.devices[s.device] ||= {closed:[],drafts:{},messages:{},recentThreads:{},browserTab:'preview',code:'// 项目工作区\nconst title = "Remote workspace";\n\n// 在这里继续编辑电脑上的文件。'};}
// 每台电脑、每个软件与其当前 AI 账号分别记住最近主题。/2026.10.29修改
function romRecentKey(app){return app+'|'+(window.RemoteAiAccounts?.active?.(s.device,app)||'primary');}
function romRecentThread(app){const rows=romThreads.filter(x=>x.device===s.device&&x.app===app);if(!rows.length)return;const saved=(romStore().recentThreads||{})[romRecentKey(app)];return rows.find(x=>x.id===saved)||rows[0];}
function romSelectThread(app,explicit=''){
 const selected=explicit?romThreads.find(x=>x.id===explicit&&x.device===s.device&&x.app===app):romRecentThread(app);
 remoteOfficeMac.thread=selected?.id||'';
 if(selected)(romStore().recentThreads||={})[romRecentKey(app)]=selected.id;
 return selected;
}
function romThread(){const app=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;return romRecentThread(app);}
function romDraftKey(id){return romRecentThread(id)?.id||id;}
function romWindowName(id){return romApps.find(x=>x.id===id)?.name||'全桌面';}
function romAvailable(){const store=romStore();return s.previewEmptyWindows?[]:romApps.filter(x=>!store.closed.includes(x.id));}
function romClear(){Object.assign(remoteOfficeMac,{origin:'detail',capture:'desktop',thread:'',query:'',empty:false,notice:'',guide:false,demo:'all',listState:'ready',treeOpen:{},devices:{},filterDevice:'all'});}
function romDenied(){const d=device();return !d?'暂无可连接的电脑。':!d.online?'设备已离线，请在电脑上线后重试。':d.blocked?'该电脑未允许被控，请在电脑设置中开启权限。':isUnsupportedDevice(d)?'此设备暂不支持远程控制。':'';}
function romGuide(){return '<section class="rom-connect-guide" id="rom-connect-guide"><h3>连接指引</h3><ol><li><strong>两端登录同一盖世账号</strong><p>手机或主控电脑与被控电脑均安装盖世远程。</p></li><li><strong>电脑开启被控权限</strong><p>允许同账号远控，并完成系统屏幕录制与辅助功能授权。</p></li><li><strong>在电脑上打开 AI 客户端</strong><p>打开 ChatGPT、Claude 或 WorkBuddy，并创建或继续一个会话。</p></li></ol></section>';}
// 同页展开电脑、软件、文件夹与主题会话。/2026.10.29修改
function romTreeDetails(key,cls,summary,body,open=false,attrs=''){
 const expanded=remoteOfficeMac.query.trim()||((remoteOfficeMac.treeOpen||{})[key]??open);
 return '<details class="'+cls+'" data-rom-tree="'+esc(key)+'" '+attrs+(expanded?' open':'')+'><summary>'+summary+'</summary>'+body+'</details>';
}
// 会话列表按软件平列；状态、对话与打开客户端分别呈现。/2026.10.29修改
const romTaskSamples=['unread','needs-input','needs-approval','error','idle','running','running','unread','idle'];
function romTaskState(x){const key=x.app+'|'+(window.RemoteAiAccounts?.active?.(x.device,x.app)||'primary')+'|'+x.id;const store=remoteOfficeMac.devices[x.device];return store?.readThreads?.[key]?'idle':romTaskSamples[romThreads.indexOf(x)%romTaskSamples.length]||'idle';}
function romMarkRead(x){if(romTaskState(x)!=='unread')return;const key=x.app+'|'+(window.RemoteAiAccounts?.active?.(x.device,x.app)||'primary')+'|'+x.id;(romStore().readThreads||={})[key]=true;}
function romTaskMark(x){
 const status=romTaskState(x),label=({running:romL('运行中','Running'),'needs-input':romL('待输入','Needs input'),'needs-approval':romL('待批准','Needs approval'),error:romL('任务失败','Task failed'),unread:romL('有未读内容','Unread'),idle:romL('已结束且已读','Read / idle')})[status];
 if(status==='idle')return '<span class="rom-task-marker is-idle" data-task-state="idle" aria-label="'+label+'"></span>';
 let shape='';
 if(status==='running')shape='<svg class="rom-task-spinner" viewBox="0 0 24 24" aria-hidden="true"><path opacity=".3" d="M18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12ZM20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" fill="currentColor"/><path d="M12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12H6C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6V4Z" fill="currentColor"/></svg>';
 else if(status==='unread')shape='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>';
 else if(status==='error')shape='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor"/><circle cx="8" cy="5.6" r=".68" fill="currentColor"/><path d="M8 8v2.7" stroke="currentColor" stroke-linecap="round"/></svg>';
 else shape=label;
 return '<span class="rom-task-marker is-'+status+'" data-task-state="'+status+'" title="'+label+'" aria-label="'+label+'">'+shape+'</span>';
}
function romChatIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-8.8 8.1 10 10 0 0 1-3.4-.6L3 21l1.5-5.2A7.8 7.8 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" stroke-linejoin="round"/><circle cx="8" cy="11.5" r=".65" fill="currentColor" stroke="none"/><circle cx="12" cy="11.5" r=".65" fill="currentColor" stroke="none"/><circle cx="16" cy="11.5" r=".65" fill="currentColor" stroke="none"/></svg>';}
function romSessionRow(x){const d=devices.find(d=>d.id===x.device);return '<article class="rom-session-card rom-flat-row '+(!d?.online?'is-offline':'')+'" data-session="'+x.id+'" data-device="'+x.device+'" data-app="'+x.app+'"><div class="rom-session-copy"><div class="rom-flat-heading">'+romTaskMark(x)+'<strong>'+esc(romTitle(x))+'</strong></div><small>'+esc(romTime(x))+'</small></div><div class="rom-row-actions"><button class="rom-chat-entry" data-action="rom:preview:'+x.id+'" aria-label="'+romL('进行对话','Open conversation')+'：'+esc(romTitle(x))+'" title="'+romL('进行对话','Open conversation')+'">'+romChatIcon()+'</button><button class="rom-client-entry" data-action="rom:open:'+x.id+'" aria-label="'+romL('打开客户端','Open client')+'：'+esc(romTitle(x))+'" title="'+romL('打开客户端','Open client')+'">'+icon('chevron')+'</button></div></article>';}
function romSessions(){
 const supported=devices.filter(d=>!isUnsupportedDevice(d));
 if(remoteOfficeMac.filterDevice!=='all'&&!supported.some(d=>d.id===remoteOfficeMac.filterDevice))remoteOfficeMac.filterDevice='all';
 const noDevices=s.empty||!supported.length,q=remoteOfficeMac.query.trim().toLowerCase();
 const rows=(remoteOfficeMac.empty||noDevices)?[]:romThreads.filter(x=>supported.some(d=>d.id===x.device)&&(remoteOfficeMac.filterDevice==='all'||x.device===remoteOfficeMac.filterDevice)&&[x.title,x.titleEn,romWindowName(x.app),supported.find(d=>d.id===x.device)?.name].join(' ').toLowerCase().includes(q));
 let body=['vscode','claude','workbuddy'].map(app=>{const appRows=rows.filter(x=>x.app===app);return appRows.length?'<section class="rom-flat-software" data-app="'+app+'"><h3><span class="rom-flat-app-icon">'+romAppIcon(app)+'</span>'+romWindowName(app)+'</h3><div>'+appRows.map(romSessionRow).join('')+'</div></section>':'';}).join('');
 if(remoteOfficeMac.listState==='loading')body='<div class="blank rom-list-loading" role="status">'+icon('refresh')+'<h2>正在加载会话</h2><p>正在获取电脑上的会话列表。</p></div>';
 else if(remoteOfficeMac.listState==='error')body='<div class="blank rom-list-error" role="alert">'+icon('warning')+'<h2>会话加载失败</h2><p>暂时无法获取会话，请稍后重试。</p>'+btn('重试','rom:retry','primary')+'</div>';
 else if(!rows.length)body='<div class="blank rom-list-empty">'+icon('chat')+'<h2>'+(remoteOfficeMac.query?'没有找到相关会话':noDevices?'尚未连接电脑':'暂无 AI 会话')+'</h2><p>'+(remoteOfficeMac.query?'换个关键词，或清空搜索。':noDevices?'先在电脑上安装盖世远程，登录同一盖世账号。':'在电脑上打开 ChatGPT、Claude 或 WorkBuddy，并创建会话。')+'</p>'+btn(remoteOfficeMac.query?'清空搜索':'查看连接指引',remoteOfficeMac.query?'rom:clear-query':'rom:guide','primary')+'</div>';
 const tabs='<nav class="rom-device-tabs" role="tablist" aria-label="'+romL('会话所属电脑','Session computer')+'">'+[['all',romL('全部','All')],...supported.map(d=>[d.id,d.name])].map(([id,name])=>'<button role="tab" aria-selected="'+(remoteOfficeMac.filterDevice===id)+'" data-action="rom:filter:'+id+'">'+icon('monitor')+'<span>'+esc(name)+'</span></button>').join('')+'</nav>';
 const count=remoteOfficeMac.filterDevice==='all'?romL('全部会话','All sessions'):romL('会话','Sessions');
 return '<header class="head"><h1>AI 会话</h1></header><main class="content rom-sessions"><div class="rom-list-intro"><label class="rom-search">'+icon('search')+'<input id="rom-search" type="search" maxlength="100" aria-label="'+romL('搜索AI会话','Search AI sessions')+'" placeholder="'+romL('搜索会话、软件或电脑','Search sessions, clients or computers')+'" value="'+esc(remoteOfficeMac.query)+'"></label></div>'+tabs+(remoteOfficeMac.guide?romGuide():'')+(remoteOfficeMac.notice?'<p class="rom-inline-notice" role="status">'+esc(remoteOfficeMac.notice)+'</p>':'')+'<section class="rom-flat-list"><h2>'+count+'（'+rows.length+'）</h2><div class="rom-session-list">'+body+'</div></section></main>';
}
// 适配对话复用原会话内容，与打开电脑客户端保留独立入口。/2026.10.29修改
function romConversationPreview(){const x=romThreads.find(x=>x.id===remoteOfficeMac.thread&&x.device===s.device);if(!x)return romSessions();const readonly=romDenied()?' readonly':'',disabled=romDenied()?' disabled':'';return '<header class="head">'+ib(romL('返回','Back'),'rom:preview-back','back')+'<h1>'+esc(romTitle(x))+'</h1>'+btn(romL('打开客户端','Open client'),'rom:open:'+x.id,'ghost','chevron')+'</header><main class="rom-conversation-preview"><p class="rom-preview-research">'+romL('适配对话（待继续技术调研，方案待确定）。默认将会话 ID 传入电脑并打开对应 AI 软件；此处为对话演示。','Adapted conversation (further technical research required). By default, the session ID is sent to the computer and its AI client opens. This is a conversation demo.')+'</p>'+romChat(x.app,romTitle(x),x.id,romStore(),readonly,disabled)+'</main>';}
function romOpenPreview(id){const x=romThreads.find(x=>x.id===id);if(!x||!devices.some(d=>d.id===x.device))return;s.device=x.device;const denied=romDenied();if(denied){remoteOfficeMac.notice=denied;render();return;}if(device().busy){s.pendingAction='rom:preview:'+id;s.modal='takeover';render();return;}remoteOfficeMac.capture=x.app;romSelectThread(x.app,x.id);romMarkRead(x);remoteOfficeMac.notice='';s.page='office-conversation';s.view=false;s.panel='';s.modal='';render();}

function romRemoteTopics(app,selected){
 const rows=romThreads.filter(x=>x.device===s.device&&x.app===app),folders=[...new Set(rows.map(x=>x.folder||'会话'))];
 if(app==='claude')return '<div class="rom-remote-topics rom-remote-recent"><h4>'+romL('最近的','Recents')+'</h4>'+rows.map(x=>'<button class="rom-remote-topic '+(x.id===selected?'selected':'')+'" data-action="rom:thread:'+x.id+'"'+(s.view?' disabled':'')+'><strong>'+esc(romTitle(x))+'</strong><small>'+esc(romTime(x))+'</small></button>').join('')+'</div>';
 return '<div class="rom-remote-topics">'+folders.map(folder=>{const themes=rows.filter(x=>(x.folder||'会话')===folder);return '<details class="rom-remote-folder" open><summary>'+icon(app==='workbuddy'?'grid':'folder')+'<span>'+esc(romFolder(themes[0]))+'</span><small>'+themes.length+'</small></summary>'+(app!=='workbuddy'?'<small class="rom-remote-theme-label">'+romL('会话','Sessions')+'</small>':'')+themes.map(x=>'<button class="rom-remote-topic '+(x.id===selected?'selected':'')+'" data-action="rom:thread:'+x.id+'"'+(s.view?' disabled':'')+'><strong>'+esc(romTitle(x))+'</strong><small>'+esc(romTime(x))+'</small></button>').join('')+'</details>';}).join('')+'</div>';
}
function romDemoState(state){
 if(!['default','all','no-sessions','loading','error','offline','blocked','busy'].includes(state))return;
 clearTimeout(connectTimer);s.modal='';s.panel='';s.macConnected=false;s.macMaximized=false;resetMacNetwork();
 devices=state==='default'?[]:structuredClone(initialDevices);s.empty=state==='default';s.loading=false;s.error='';s.device=devices[0]?.id||'win';s.page='office-sessions';
 remoteOfficeMac.treeOpen={};remoteOfficeMac.filterDevice='all';if(state==='all')for(const store of Object.values(remoteOfficeMac.devices))store.readThreads={};remoteOfficeMac.demo=state;remoteOfficeMac.listState=['loading','error'].includes(state)?state:'ready';remoteOfficeMac.empty=state==='no-sessions';remoteOfficeMac.query='';remoteOfficeMac.notice='';remoteOfficeMac.thread='';remoteOfficeMac.capture='desktop';
 if(state==='offline')devices.forEach(d=>{d.online=false;d.busy=false;});
 if(state==='blocked')Object.assign(devices.find(d=>d.id==='win'),{online:true,blocked:true,busy:false});
 if(state==='busy')Object.assign(devices.find(d=>d.id==='win'),{online:true,blocked:false,busy:true});
 render();
}

function romUsageChoice(){const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;return '<main class="usage-choice"><div class="usage-choice-inner"><span class="usage-choice-mark">'+icon('monitor')+'</span><h1>'+L('你想如何使用盖世远程？','How will you use GameHub Remote?')+'</h1><p>'+L('选择使用场景，进入对应首页。','Choose a use case to get started.')+'</p><div class="usage-choice-options">'+[['office','办公','Work','进入 AI 会话列表，继续电脑上的工作','Open AI sessions and continue your work','chat'],['other','非办公','Non-work','进入设备列表，连接你的电脑','Open devices and connect to your computer','monitor']].map(([id,zh,en,desc,descEn,ic])=>'<button data-action="usage-choice:'+id+'">'+icon(ic)+'<span><strong>'+L(zh,en)+'</strong><small>'+L(desc,descEn)+'</small></span>'+icon('chevron')+'</button>').join('')+'</div><p class="usage-choice-hint">'+L('进入后可随时切换 AI 会话和我的设备。','You can switch between AI sessions and My devices at any time.')+'</p></div></main>';}
const romBaseSide=remoteMacSide;
remoteMacSide=function(){if(s.page==='usage-choice')return '';let html=romBaseSide();const nav='<nav class="rom-side-nav" aria-label="工作区导航">'+btn('我的设备','rom:devices',s.page==='list'?'selected':'ghost','monitor')+btn('AI 会话','rom:sessions',['office-sessions','office-conversation'].includes(s.page)?'selected':'ghost','chat')+'</nav>';return html.replace('<div class="sr-side-heading">我的设备</div>',nav+'<div class="sr-side-heading rom-device-heading">电脑</div>').replace(s.page==='office-sessions'?'computer-item selected':'__unused','computer-item');};
const romBaseList=remoteMacList;
remoteMacList=function(){return s.page==='usage-choice'?romUsageChoice():s.page==='office-sessions'?romSessions():s.page==='office-conversation'?romConversationPreview():romBaseList();};
quickCatalog=function(){return romApps.map(x=>({id:x.id,name:x.name}));};
quickApps=function(){s.quickAppsByDevice ||= {};const current=s.quickAppsByDevice[s.device];return s.quickAppsByDevice[s.device]=Array.isArray(current)?current.filter(x=>romApps.some(a=>a.id===x)):['vscode','claude','workbuddy','browser'];};
gptQuickLaunch=function(){const disabled=!device().online||device().blocked;return '<div class="gpt-quick-row">'+quickApps().map(id=>{const a=romApps.find(x=>x.id===id);return '<button class="gpt-quick rom-quick" data-action="rom:app:'+id+'"'+(disabled?' disabled':'')+'>'+romAppIcon(a.id)+'<span>'+a.name+'</span></button>';}).join('')+btn('添加应用','quicklaunch','gpt-add','plus')+'</div>';};
function romCapturePicker(){return '<section class="rom-capture-picker" aria-label="选择串流画面"><div class="row spread"><h3>选择串流画面</h3>'+ib('关闭画面选择','rom:picker-close','close')+'</div><button class="rom-capture-option '+(remoteOfficeMac.capture==='desktop'?'selected':'')+'" data-action="rom:capture:desktop">'+icon('monitor')+'<span><strong>全桌面</strong><small>显示电脑完整桌面</small></span></button><h4>应用窗口</h4>'+(romAvailable().length?romAvailable().map(a=>'<button class="rom-capture-option '+(remoteOfficeMac.capture===a.id?'selected':'')+'" data-action="rom:capture:'+a.id+'">'+romAppIcon(a.id)+'<span><strong>'+a.name+'</strong><small>仅显示此应用窗口</small></span>'+(remoteOfficeMac.capture===a.id?icon('check'):'')+'</button>').join(''):'<p class="rom-empty-windows">暂无打开的窗口，可返回桌面打开应用。</p>')+'</section>';}
function romChat(id,title,key,store,readonly,disabled){
 const texts={vscode:[romL('继续处理“'+title+'”。','Continue working on “'+title+'”.'),romL('已打开对应项目文件。可以查看当前代码，并继续此主题的讨论。','The project files are open. Review the code and continue this topic.')],claude:[romL('继续讨论“'+title+'”。','Continue discussing “'+title+'”.'),romL('已保留当前文件夹与主题的讨论内容，可以继续核对具体说明。','The folder and topic context are preserved. Continue reviewing the details.')],workbuddy:[romL('继续任务“'+title+'”。','Continue the task “'+title+'”.'),romL('已保留当前任务的工作区与产物，可以继续核对执行步骤。','The task workspace and outputs are preserved. Continue reviewing the steps.')]};
 const intro=texts[id],messages=store.messages[key]||[];
 return '<div class="rom-remote-chat"><header><strong>'+esc(title)+'</strong><span>'+({vscode:'AI 助手',claude:'会话',workbuddy:'任务对话'}[id])+'</span></header><div class="rom-transcript" tabindex="0" aria-label="远端应用会话内容"><div class="rom-human">'+intro[0]+'</div><div class="rom-agent"><strong>'+romWindowName(id)+'</strong><p>'+intro[1]+'</p><p>浏览器中保留了页面预览，切换串流画面即可检查效果。</p><ul><li>检查页面与导航。</li><li>核对输入和按钮状态。</li><li>继续处理当前工作区。</li></ul></div>'+messages.map(x=>'<div class="rom-human">'+esc(x)+'</div>').join('')+'</div><div class="rom-composer"><textarea id="rom-compose" maxlength="2000" aria-label="远端应用输入" placeholder="在电脑应用中输入"'+readonly+'>'+esc(store.drafts[key]||'')+'</textarea><button data-action="rom:send"'+disabled+'>'+icon('chevron')+'<span>发送</span></button></div></div>';
}
function romRemoteApp(id){
 const a=romApps.find(x=>x.id===id),store=romStore(),thread=romThread();if(!a)return '';
 const disabled=s.view?' disabled':'',readonly=s.view?' readonly':'',clientLogin=window.RemoteAiAccounts?.loginRequested(s.device,id);let content='';
 if(clientLogin){content=window.RemoteAiAccounts.loginPage();}
 else if(['vscode','claude','workbuddy'].includes(id)){
  const activeThread=romRecentThread(id);if(activeThread&&s.page==='session'&&s.modal!=='connecting'&&!romDenied())romMarkRead(activeThread);const title=romTitle(activeThread)||romL('新的工作区','New workspace'),key=activeThread?.id||id,chat=romChat(id,title,key,store,readonly,disabled);
  if(id==='vscode'){
   content='<div class="rom-vscode-menubar"><span>文件</span><span>编辑</span><span>选择</span><span>查看</span><span>终端</span><span>帮助</span></div><div class="rom-vscode-workspace"><aside class="rom-vscode-activity">'+icon('file')+icon('search')+icon('copy')+icon('settings')+'</aside><aside class="rom-vscode-explorer"><strong>资源管理器</strong><h4>REMOTE-WORKSPACE</h4><span>'+icon('folder')+' src</span><span class="rom-tree-item selected">'+icon('file')+' main.js</span><span class="rom-tree-item">'+icon('file')+' styles.css</span><span>'+icon('file')+' package.json</span><span>'+icon('file')+' README.md</span></aside><div class="rom-vscode-editor"><div class="rom-code-tabs"><span>main.js</span><small>src / main.js</small></div><textarea id="rom-code" class="rom-code" aria-label="ChatGPT远端编辑器" maxlength="10000"'+readonly+'>'+esc(store.code)+'</textarea><div class="rom-terminal"><strong>终端</strong><p>workspace &gt; npm run dev</p><p>Local: http://localhost:3000</p></div></div><section class="rom-vscode-chat">'+romRemoteTopics(id,activeThread?.id)+chat+'</section></div><footer class="rom-vscode-status"><span>main</span><span>JavaScript</span><span>UTF-8</span></footer>';
  }else if(id==='claude'){
   content='<div class="rom-app-layout rom-claude-workspace"><aside class="rom-remote-sidebar rom-claude-history"><strong>Claude</strong><span>'+icon('chat')+' 会话</span>'+romRemoteTopics(id,activeThread?.id)+'</aside>'+chat+'</div>';
  }else{
   content='<div class="rom-app-layout rom-workbuddy-workspace"><aside class="rom-remote-sidebar rom-workbuddy-nav"><strong>WorkBuddy</strong><span>'+icon('grid')+' 工作台</span><span>'+icon('folder')+' 文件</span>'+romRemoteTopics(id,activeThread?.id)+'</aside><div class="rom-workbuddy-main"><header class="rom-workbuddy-project"><strong>'+esc(title)+'</strong><small>当前任务工作区</small></header><div class="rom-workbuddy-columns"><section class="rom-task-workspace"><h3>任务步骤</h3><div>'+icon('check')+' 整理任务资料</div><div>'+icon('check')+' 核对任务内容</div><div>'+icon('clock')+' 复查当前结果</div><h3>工作区文件</h3><article>'+icon('file')+' 任务清单.md</article><article>'+icon('file')+' 任务说明.md</article></section>'+chat+'</div></div></div>';
  }
 }else if(id==='files'){
  content='<div class="rom-file-preview" aria-label="'+romL('远端文件资源管理器','Remote File Explorer')+'"><div class="rom-file-location">'+icon('folder')+'<span>'+romL('此电脑','This PC')+' › '+romL('文档','Documents')+' › '+romL('项目资料','Project resources')+'</span></div><div class="rom-file-workspace"><aside><span>'+icon('clock')+romL('最近使用','Recent')+'</span><span>'+icon('monitor')+romL('桌面','Desktop')+'</span><span class="selected">'+icon('folder')+romL('文档','Documents')+'</span><span>'+icon('download')+romL('下载','Downloads')+'</span></aside><section><header><strong>'+romL('名称','Name')+'</strong><span>'+romL('修改日期','Date modified')+'</span><span>'+romL('类型','Type')+'</span></header>'+[['folder',romL('项目预览','Project previews'),'2026/10/29',romL('文件夹','Folder')],['folder',romL('参考图片','Reference images'),'2026/10/29',romL('文件夹','Folder')],['file',romL('项目说明.docx','Project notes.docx'),'2026/10/28',romL('文档','Document')],['file',romL('页面反馈.png','Page feedback.png'),'2026/10/28',romL('图片','Image')]].map(([ic,name,date,type])=>'<div class="rom-file-preview-row"><strong>'+icon(ic)+name+'</strong><span>'+date+'</span><span>'+type+'</span></div>').join('')+'<p class="rom-file-preview-note">'+romL('远端窗口示例；文件操作在电脑端进行。','Sample remote window. File operations take place on the computer.')+'</p></section></div></div>';
 }else if(id==='document'){
  content='<div class="rom-document-preview" aria-label="'+romL('远端文档窗口','Remote document window')+'"><div class="rom-document-toolbar"><strong>'+romL('项目说明.docx','Project notes.docx')+'</strong><span>'+romL('开始　插入　布局　审阅　视图','Home　Insert　Layout　Review　View')+'</span></div><article><h1>'+romL('项目说明','Project notes')+'</h1><p>'+romL('本周核对页面展示、会话列表与操作入口。','This week, review page layouts, session lists, and action entries.')+'</p><h2>'+romL('一、当前进展','1. Current progress')+'</h2><p>'+romL('页面预览已更新，可以在电脑端继续检查具体内容。','The page preview has been updated. Continue reviewing details on the computer.')+'</p><h2>'+romL('二、后续事项','2. Next steps')+'</h2><p>'+romL('整理反馈，复核文案和交互，再确认下一步修改。','Collect feedback, review copy and interactions, and confirm the next changes.')+'</p></article></div>';
 }else if(id==='browser'){
  content='<div class="rom-browser-bar"><span>'+icon('lock')+' localhost / workspace</span></div><div class="rom-browser-tabs">'+btn('页面预览','rom:browser:preview',store.browserTab==='preview'?'selected':'').replace('<button','<button'+disabled)+btn('项目说明','rom:browser:readme',store.browserTab==='readme'?'selected':'').replace('<button','<button'+disabled)+'</div><div class="rom-browser-page" tabindex="0"><small>REMOTE WORKSPACE</small><h1>'+(store.browserTab==='preview'?'让工作继续':'项目说明')+'</h1><p>'+(store.browserTab==='preview'?'你的项目、文件与应用，始终留在自己的电脑上。':'这是当前工作区的页面预览，点击页签可查看不同内容。')+'</p><div class="rom-preview-cards"><article><h3>任务进展</h3><p>检查最近修改与页面效果。</p></article><article><h3>项目文件</h3><p>继续处理原有工作区。</p></article></div><h2>当前页面</h2><p>在电脑上打开的浏览器窗口中查看内容。滚动此区域可继续阅读。</p><p>桌面与应用窗口可以随时切换，切换捕获画面不会关闭应用。</p><div class="rom-preview-footer">页面预览</div></div>';
 }else{content='<div class="rom-editor-bar">workspace / main.js</div><textarea id="rom-code" class="rom-code" aria-label="远端代码编辑器" maxlength="10000"'+readonly+'>'+esc(store.code)+'</textarea>';}
 return '<section class="rom-remote-app rom-client-'+id+'" data-remote-app="'+id+'"><header class="rom-windowbar"><span>'+romAppIcon(a.id)+a.name+(!clientLogin&&thread?.app===id?' · '+esc(romTitle(thread)):'')+'</span>'+ib('关闭远端窗口','rom:close-window','close').replace('<button','<button'+disabled)+'</header>'+content+'</section>';
}

function romSurface(){const capture=remoteOfficeMac.capture,available=romAvailable(),store=romStore();if(capture!=='desktop'&&!available.some(x=>x.id===capture))return '<div class="rom-unavailable">'+icon('screen')+'<h2>此窗口已关闭或不可用</h2><p>切换到其他窗口，或返回桌面打开应用。</p>'+btn('选择串流画面','rom:picker','primary')+btn('返回全桌面','rom:capture:desktop','ghost')+'</div>';if(capture!=='desktop')return romRemoteApp(capture);const active=available.find(x=>x.id===store.desktopApp);return '<div class="rom-desktop"><div class="rom-desktop-shortcuts">'+romApps.map(a=>'<button data-action="rom:desktop-app:'+a.id+'"'+(s.view?' disabled':'')+'>'+romAppIcon(a.id)+'<span>'+a.name+'</span></button>').join('')+'</div>'+(active?'<div class="rom-desktop-window">'+romRemoteApp(active.id)+'</div>':'<div class="rom-desktop-caption"><strong>'+esc(device().name)+'</strong><span>桌面</span></div>')+'<footer class="rom-desktop-taskbar">'+romApps.map(a=>'<button aria-label="打开'+a.name+'" data-action="rom:desktop-app:'+a.id+'"'+(s.view?' disabled':'')+'>'+romAppIcon(a.id)+'</button>').join('')+'</footer></div>';}
const romBaseSession=macSession;
macSession=function(){ensureMacConnection();const denied=romDenied();return '<div class="session mac-remote-session rom-session"><header class="mac-remote-title rom-title"><div class="mac-traffic">'+ib('退出远控','exit','back')+ib('最小化远控','mac-minimize','minus')+ib(s.macMaximized?'退出全屏':'全屏','mac-maximize','expand')+'</div><div class="mac-host-name">'+icon('monitor')+'<strong>'+esc(device().name)+'</strong></div><button class="rom-capture-trigger" data-action="rom:picker" aria-expanded="'+(s.panel==='rom-capture')+'">'+icon(remoteOfficeMac.capture==='desktop'?'monitor':'screen')+'<span>'+romWindowName(remoteOfficeMac.capture)+'</span>'+icon('chevron')+'</button><div class="grow"></div>'+macConnectionWidget()+btn('控制中心','panel:operation',s.panel==='operation'?'selected':'','settings')+'</header><div class="rom-session-toolbar"><span>串流画面 · '+(remoteOfficeMac.capture==='desktop'?'全桌面':'应用窗口')+'</span>'+(s.view?'<span class="rom-view-label">仅观看 · 不发送操作</span>':'')+'<div class="grow"></div>'+btn('缩小','rom:zoom:out','ghost','minus')+'<output aria-label="画面缩放">'+Math.round((s.remoteZoom||1)*100)+'%</output>'+btn('放大','rom:zoom:in','ghost','plus')+btn('适应窗口','rom:zoom:reset','ghost')+'</div><div class="mac-remote-body rom-body">'+macNetworkBanner()+'<div class="rom-screen-scroll"><div class="rom-screen" data-capture="'+remoteOfficeMac.capture+'" style="--rom-zoom:'+(s.remoteZoom||1)+'">'+(denied?'<div class="rom-unavailable">'+icon('warning')+'<h2>当前无法继续远控</h2><p>'+denied+'</p>'+btn('返回','exit','primary')+'</div>':romSurface())+'</div></div>'+(s.panel==='rom-capture'?romCapturePicker():s.panel==='operation'?macControlMenu():s.panel==='keyboard'?'<section class="session-panel mac-control-panel">'+macKeyboard()+'</section>':s.panel==='text'?'<section class="session-panel mac-control-panel">'+textPanel()+'</section>':'')+'</div></div>';};
const romBaseWindowPanel=windowPanel;
windowPanel=function(){return s.platform==='mac'?romCapturePicker():romBaseWindowPanel();};
const romBaseRemoteText=remoteText,romBaseWrite=writeRemote;
remoteText=function(){if(s.platform!=='mac')return romBaseRemoteText();const id=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(id==='editor')return romStore().code;return romStore().drafts[romDraftKey(id)]||'';};
writeRemote=function(value){if(s.platform!=='mac')return romBaseWrite(value);if(s.view||romDenied())return;const id=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(id==='editor')romStore().code=value;else if(['vscode','claude','workbuddy'].includes(id))romStore().drafts[romDraftKey(id)]=value;};
const romBaseTextPanel=textPanel;
textPanel=function(){if(s.platform!=='mac')return romBaseTextPanel();const id=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;return '<div class="row spread"><h3>长文本输入</h3>'+ib('关闭输入','panel-close','close')+'</div><p>当前窗口：'+romWindowName(id)+'</p><textarea id="office-draft" aria-label="长文本草稿" class="inputbox" maxlength="2000"'+(s.view?' readonly':'')+'>'+esc(s.textDraft||'')+'</textarea><p>先定位电脑应用的输入框，仅输入文字，不自动发送。</p>'+btn('输入到电脑','write-draft','primary').replace('<button','<button'+(s.view||!['vscode','claude','workbuddy','editor'].includes(id)?' disabled':''));};
const romBaseReview=remoteMacReview;
remoteMacReview=function(){const enabled=standaloneMac.signed;const demos=[['default','缺省态：无设备'],['all','穷举态：完整样例'],['no-sessions','无会话'],['loading','加载中'],['error','加载失败'],['offline','全部离线'],['blocked','未允许被控'],['busy','设备占用']];const button=(label,act)=>btn(label,act,'ghost').replace('<button','<button'+(enabled?'':' disabled'));return romBaseReview().replace('</aside>','<section class="rom-review-note"><strong>AI 办公交互演示</strong><p>会话与窗口为本地样例。默认将会话 ID 传至电脑，打开对应的 ChatGPT、Claude 或 WorkBuddy；保留手机适配的直接对话界面，根据技术方案确定，技术支持后实现。会话识别、定位和真实串流待接入验证。</p><div class="sr-review-actions rom-demo-states" aria-label="AI会话缺省与穷举状态">'+demos.map(([id,label])=>button(label,'rom:demo:'+id)).join('')+(remoteOfficeMac.listState==='loading'?button('模拟加载完成','rom:load-complete'):'')+(enabled&&s.page==='session'?button('模拟无打开窗口','rom:no-windows')+button('恢复窗口样例','rom:restore-windows'):'')+'</div></section></aside>');};

const romBaseClear=remoteMacClearRuntime;
remoteMacClearRuntime=function(){romClear();return romBaseClear();};
const romBasePreview=remoteMacPreview;
remoteMacPreview=function(id){if(id==='ai-sessions'){romBasePreview('list');s.page='office-sessions';remoteOfficeMac.notice='';render();return;}if(/game|mapping|gpt|entry-library|layout|cloud/i.test(id)){romBasePreview('list');return;}return romBasePreview(id);};
const romBaseRender=renderMac;
renderMac=function(){s.gameActive=false;s.mapping=false;s.virtualPad=false;s.mode='office';if(s.page==='gpt')s.page='office-sessions';if(['mapping','layout'].includes(s.panel))s.panel='';if(s.page==='session'&&s.panel==='windows')s.panel='rom-capture';return romBaseRender();};
function romOpen(app,threadId='',origin='detail'){
 if(!romApps.some(x=>x.id===app))return;const denied=romDenied();if(denied){remoteOfficeMac.notice=denied;if(s.page==='office-sessions')render();else toast(denied);return;}
 const pending=threadId?'rom:open:'+threadId:'rom:app:'+app;if(device().busy){s.pendingAction=pending;s.modal='takeover';render();return;}
 remoteOfficeMac.origin=origin;remoteOfficeMac.capture=app;romSelectThread(app,threadId);remoteOfficeMac.notice='';romStore().closed=romStore().closed.filter(x=>x!==app);s.previewEmptyWindows=false;s.view=false;s.modal='';s.panel='';s.gameActive=false;s.mapping=false;s.gptDesktop=false;s.mode='office';requestConnection('control');
}
const romBaseAction=action;
action=function(value){
 if(s.platform!=='mac')return romBaseAction(value);
 if(value.startsWith('usage-choice:')){if(!standaloneMac.signed||s.page!=='usage-choice'||macAppWindow.status!=='visible')return;const choice=value.split(':')[1];if(!['office','other'].includes(choice))return;s.page=choice==='office'?'office-sessions':'list';standaloneMac.onboarding=!remoteMacGuideSeen();s.modal='';render();return;}
 if(/^(gpt-|rlc:|virtual-key-layout|mapping-|toggle:(mapping|virtualPad)|mode:game|set:mode:game)/.test(value))return;
 if(value==='panel:mapping')return;
 if(value.startsWith('quick-open:'))return action('rom:app:'+value.split(':')[1]);
 if(value.startsWith('rom:')){
  if(!standaloneMac.signed||macAppWindow.status!=='visible')return;const [,kind,arg]=value.split(':');
  if(kind==='demo'){romDemoState(arg);return;}
  if(kind==='filter'){if(arg==='all'||devices.some(d=>d.id===arg&&!isUnsupportedDevice(d))){remoteOfficeMac.filterDevice=arg;remoteOfficeMac.guide=false;remoteOfficeMac.notice='';render();}return;}
  if(kind==='preview'){romOpenPreview(arg);return;}
  if(kind==='preview-back'){s.page='office-sessions';remoteOfficeMac.notice='';render();return;}
  if(kind==='send'&&s.page==='office-conversation'){if(romDenied())return;const app=remoteOfficeMac.capture,key=romDraftKey(app),text=(romStore().drafts[key]||'').trim();if(!text)return;(romStore().messages[key] ||= []).push(text);romStore().drafts[key]='';render();document.querySelector('.rom-transcript')?.scrollTo(0,1e6);return;}
  if(kind==='guide'){remoteOfficeMac.guide=!remoteOfficeMac.guide;render();return;}
  if(kind==='clear-query'){remoteOfficeMac.query='';render();return;}
  if(kind==='retry'){remoteOfficeMac.listState='loading';render();return;}
  if(kind==='load-complete'){if(remoteOfficeMac.listState!=='loading')return;remoteOfficeMac.listState='ready';remoteOfficeMac.demo='all';render();return;}
  if(kind==='sessions'||kind==='devices'){remoteOfficeMac.notice='';s.page=kind==='sessions'?'office-sessions':'list';s.panel='';s.modal='';macPersonal.menu='';render();return;}
  if(kind==='empty'||kind==='restore'){romDemoState(kind==='empty'?'no-sessions':'all');return;}
  if(kind==='open'){const t=romThreads.find(x=>x.id===arg);if(!t||!devices.some(d=>d.id===t.device))return;s.device=t.device;romOpen(t.app,t.id,'office-sessions');return;}
  if(kind==='app'){romOpen(arg,'','detail');return;}
  if(s.page!=='session')return;
  if(kind==='picker'){s.panel=s.panel==='rom-capture'?'':'rom-capture';render();return;}
  if(kind==='picker-close'){s.panel='';render();return;}
  if(kind==='capture'){if(arg!=='desktop'&&!romAvailable().some(x=>x.id===arg))return;remoteOfficeMac.capture=arg;romSelectThread(arg==='desktop'?romStore().desktopApp:arg);s.remoteZoom=1;s.panel='';render();return;}
  if(kind==='zoom'){s.remoteZoom=arg==='reset'?1:Math.max(1,Math.min(2,(s.remoteZoom||1)+(arg==='in'?.25:-.25)));render();return;}
  if(kind==='no-windows'||kind==='restore-windows'){s.previewEmptyWindows=kind==='no-windows';if(kind==='restore-windows')romStore().closed=[];s.panel='rom-capture';render();return;}
  if(s.view||romDenied())return;
  if(kind==='desktop-app'){if(!romApps.some(x=>x.id===arg))return;romStore().closed=romStore().closed.filter(x=>x!==arg);s.previewEmptyWindows=false;romStore().desktopApp=arg;romSelectThread(arg);render();return;}
  if(kind==='thread'){const t=romThreads.find(x=>x.id===arg&&x.device===s.device);const app=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(!t||t.app!==app||romStore().closed.includes(app))return;romSelectThread(t.app,t.id);render();return;}
  if(kind==='close-window'){const app=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(!app)return;if(!romStore().closed.includes(app))romStore().closed.push(app);if(remoteOfficeMac.capture==='desktop')romStore().desktopApp='';render();return;}
  if(kind==='browser'){if(['preview','readme'].includes(arg))romStore().browserTab=arg;render();return;}
  if(kind==='send'){const app=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(!['vscode','claude','workbuddy'].includes(app)||romStore().closed.includes(app))return;const key=romDraftKey(app);const text=(romStore().drafts[key]||'').trim();if(!text)return;(romStore().messages[key] ||= []).push(text);romStore().drafts[key]='';render();document.querySelector('.rom-transcript')?.scrollTo(0,1e6);return;}
  return;
 }
 if(['connect','watch'].includes(value)){remoteOfficeMac.origin='detail';remoteOfficeMac.capture='desktop';remoteOfficeMac.thread='';}
 if(['windows','panel:windows'].includes(value)&&s.page==='session')return action('rom:picker');
 if(['desktop','office-desktop'].includes(value)&&s.page==='session')return action('rom:capture:desktop');
 if(value==='cancel'&&s.modal==='connecting'){const origin=remoteOfficeMac.origin;romBaseAction(value);s.page=origin;render();return;}
 if(['exit','exit-confirm'].includes(value)&&s.page==='session'){const origin=remoteOfficeMac.origin;romBaseAction(value);s.page=origin;remoteOfficeMac.thread='';remoteOfficeMac.capture='desktop';render();return;}
 if(value==='back'&&s.page==='office-sessions'){s.page='list';render();return;}
 if(s.page==='session'&&(s.view||romDenied())&&/^(key:|computer-key:|write-draft|mac-app:|window:|mouse-|ime-)/.test(value))return;
 return romBaseAction(value);
};
document.addEventListener('input',e=>{if(!standaloneMac.signed)return;if(e.target.id==='rom-search'){remoteOfficeMac.query=e.target.value;const start=e.target.selectionStart;render();const input=document.getElementById('rom-search');input?.focus();try{input?.setSelectionRange(start,start);}catch{}return;}if(!['session','office-conversation'].includes(s.page)||s.view||romDenied())return;const store=romStore(),app=remoteOfficeMac.capture==='desktop'?store.desktopApp:remoteOfficeMac.capture;if(e.target.id==='rom-compose'){const key=romDraftKey(app);store.drafts[key]=e.target.value;}if(e.target.id==='rom-code')store.code=e.target.value;});
document.addEventListener('toggle',event=>{const el=event.target;if(!el?.isConnected||!el.matches?.('details[data-rom-tree]')||remoteOfficeMac.query.trim()||s.page!=='office-sessions')return;(remoteOfficeMac.treeOpen||={})[el.dataset.romTree]=el.open;},true);
window.RemoteOfficeMac={state:remoteOfficeMac,threads:romThreads,apps:romApps,snapshot:()=>structuredClone(remoteOfficeMac)};
window.addEventListener('remote-language-change',()=>{if(['usage-choice','office-sessions','office-conversation','session'].includes(s.page))render();});
if(params.get('state')==='ai-sessions')remoteMacPreview('ai-sessions');else render();

