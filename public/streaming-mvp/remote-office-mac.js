/* AI办公一期电脑端适配：仅浏览器DOM串流演示，不调用AI或远控服务。 */
const remoteOfficeMac={origin:'detail',capture:'desktop',thread:'',query:'',empty:false,notice:'',guide:false,demo:'all',listState:'ready',devices:{}};
const romThreads=[
 {id:'win-vscode',device:'win',app:'vscode',title:'远程工作台原型',summary:'检查页面效果与交互细节',time:'今天 15:20'},
 {id:'win-claude',device:'win',app:'claude',title:'接口与异常处理',summary:'继续处理接口返回和错误提示',time:'今天 14:42'},
 {id:'work-workbuddy',device:'work',app:'workbuddy',title:'产品介绍页',summary:'检查网页排版',time:'今天 11:30'},
 {id:'mac-claude',device:'mac',app:'claude',title:'需求文档整理',summary:'整理功能说明与待确认项',time:'昨天 18:10'}
];
const romApps=[{id:'vscode',name:'VS Code',icon:'file'},{id:'claude',name:'Claude',icon:'chat'},{id:'workbuddy',name:'WorkBuddy',icon:'grid'},{id:'browser',name:'浏览器',icon:'monitor'},{id:'editor',name:'代码编辑器',icon:'file'}];
function romAppIcon(id){return typeof remoteAiIcon==='function'?remoteAiIcon(id):icon(romApps.find(a=>a.id===id)?.icon||'chat');}
function romStore(){return remoteOfficeMac.devices[s.device] ||= {closed:[],drafts:{},messages:{},browserTab:'preview',code:'// 项目工作区\nconst title = "Remote workspace";\n\n// 在这里继续编辑电脑上的文件。'};}
function romThread(){return romThreads.find(x=>x.id===remoteOfficeMac.thread&&x.device===s.device);}
function romDraftKey(id){return romThread()?.app===id?romThread().id:romThreads.find(x=>x.device===s.device&&x.app===id)?.id||id;}
function romWindowName(id){return romApps.find(x=>x.id===id)?.name||'全桌面';}
function romAvailable(){const store=romStore();return s.previewEmptyWindows?[]:romApps.filter(x=>!store.closed.includes(x.id));}
function romClear(){Object.assign(remoteOfficeMac,{origin:'detail',capture:'desktop',thread:'',query:'',empty:false,notice:'',guide:false,demo:'all',listState:'ready',devices:{}});}
function romDenied(){const d=device();return !d?'暂无可连接的电脑。':!d.online?'设备已离线，请在电脑上线后重试。':d.blocked?'该电脑未允许被控，请在电脑设置中开启权限。':isUnsupportedDevice(d)?'此设备暂不支持远程控制。':'';}
function romGuide(){return '<section class="rom-connect-guide" id="rom-connect-guide"><h3>连接指引</h3><ol><li><strong>两端登录同一盖世账号</strong><p>手机或主控电脑与被控电脑均安装盖世远程。</p></li><li><strong>电脑开启被控权限</strong><p>允许同账号远控，并完成系统屏幕录制与辅助功能授权。</p></li><li><strong>在电脑上打开 AI 客户端</strong><p>打开 VS Code、Claude 或 WorkBuddy，并创建或继续一个会话。</p></li></ol></section>';}
function romSessions(){
 const noDevices=s.empty||!devices.some(d=>!isUnsupportedDevice(d));
 const rows=(remoteOfficeMac.empty||noDevices)?[]:romThreads.filter(x=>devices.some(d=>d.id===x.device)&&[x.title,x.summary,romWindowName(x.app),devices.find(d=>d.id===x.device)?.name].join(' ').toLowerCase().includes(remoteOfficeMac.query.toLowerCase()));
 const card=x=>{const d=devices.find(d=>d.id===x.device);return '<button class="rom-session-card" data-action="rom:open:'+x.id+'"><span class="rom-app-icon">'+romAppIcon(x.app)+'</span><span class="rom-session-copy"><span class="rom-session-heading"><strong>'+esc(x.title)+'</strong><small>'+esc(x.time)+'</small></span><span class="rom-session-summary">'+esc(x.summary)+'</span><span class="rom-session-meta"><span>'+romWindowName(x.app)+'</span><span>'+esc(d.name)+'</span><span class="'+(d.online?'rom-online':'rom-offline')+'">'+(d.online?'在线':'离线')+'</span>'+(d.blocked?'<span class="rom-status-tag">未允许被控</span>':'')+(d.busy?'<span class="rom-status-tag">正在被控</span>':'')+'</span></span>'+icon('chevron')+'</button>';};
 const groups=[['online','在线会话',true],['offline','离线会话',false]].map(([key,label,online])=>{const group=rows.filter(x=>!!devices.find(d=>d.id===x.device)?.online===online);return '<section class="rom-session-group" data-status="'+key+'"><h2>'+label+' <span data-count="'+group.length+'">'+group.length+'</span></h2><div class="rom-session-group-list">'+(group.length?group.map(card).join(''):'<p class="rom-group-empty">暂无'+label+'</p>')+'</div></section>';}).join('');
 let body=groups;
 if(remoteOfficeMac.listState==='loading')body='<div class="blank rom-list-loading" role="status">'+icon('refresh')+'<h2>正在加载会话</h2><p>正在获取电脑上的会话列表。</p></div>';
 else if(remoteOfficeMac.listState==='error')body='<div class="blank rom-list-error" role="alert">'+icon('warning')+'<h2>会话加载失败</h2><p>暂时无法获取会话，请稍后重试。</p>'+btn('重试','rom:retry','primary')+'</div>';
 else if(!rows.length)body='<div class="blank rom-list-empty">'+icon('chat')+'<h2>'+(remoteOfficeMac.query?'没有找到相关会话':noDevices?'尚未连接电脑':'暂无 AI 会话')+'</h2><p>'+(remoteOfficeMac.query?'换个关键词，或清空搜索。':noDevices?'先在电脑上安装盖世远程，登录同一盖世账号。':'在电脑上打开 VS Code、Claude 或 WorkBuddy，并创建会话。')+'</p>'+btn(remoteOfficeMac.query?'清空搜索':'查看连接指引',remoteOfficeMac.query?'rom:clear-query':'rom:guide','primary')+'</div>';
 return '<header class="head"><h1>AI 会话</h1><span class="muted">'+(remoteOfficeMac.listState==='ready'?rows.length+' 个会话':'')+'</span>'+btn(remoteOfficeMac.guide?'收起连接指引':'连接指引','rom:guide','ghost').replace('<button','<button aria-expanded="'+remoteOfficeMac.guide+'" aria-controls="rom-connect-guide"')+'</header><main class="content rom-sessions"><div class="rom-list-intro"><p>找到电脑上的任务，打开对应应用继续工作。</p><label class="rom-search">'+icon('search')+'<input id="rom-search" type="search" maxlength="100" aria-label="搜索AI会话" placeholder="搜索会话、应用或电脑" value="'+esc(remoteOfficeMac.query)+'"></label></div>'+(remoteOfficeMac.guide?romGuide():'')+'<p class="rom-inline-notice" role="status">'+esc(remoteOfficeMac.notice)+'</p><div class="rom-session-list">'+body+'</div></main>';
}
function romDemoState(state){
 if(!['default','all','no-sessions','loading','error','offline','blocked','busy'].includes(state))return;
 clearTimeout(connectTimer);s.modal='';s.panel='';s.macConnected=false;s.macMaximized=false;resetMacNetwork();
 devices=state==='default'?[]:structuredClone(initialDevices);s.empty=state==='default';s.loading=false;s.error='';s.device=devices[0]?.id||'win';s.page='office-sessions';
 remoteOfficeMac.demo=state;remoteOfficeMac.listState=['loading','error'].includes(state)?state:'ready';remoteOfficeMac.empty=state==='no-sessions';remoteOfficeMac.query='';remoteOfficeMac.notice='';remoteOfficeMac.thread='';remoteOfficeMac.capture='desktop';
 if(state==='offline')devices.forEach(d=>{d.online=false;d.busy=false;});
 if(state==='blocked')Object.assign(devices.find(d=>d.id==='win'),{online:true,blocked:true,busy:false});
 if(state==='busy')Object.assign(devices.find(d=>d.id==='win'),{online:true,blocked:false,busy:true});
 render();
}

function romUsageChoice(){const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;return '<main class="usage-choice"><div class="usage-choice-inner"><span class="usage-choice-mark">'+icon('monitor')+'</span><h1>'+L('你想如何使用盖世远程？','How will you use GameHub Remote?')+'</h1><p>'+L('选择使用场景，进入对应首页。','Choose a use case to get started.')+'</p><div class="usage-choice-options">'+[['office','办公','Work','进入 AI 会话列表，继续电脑上的工作','Open AI sessions and continue your work','chat'],['other','非办公','Non-work','进入设备列表，连接你的电脑','Open devices and connect to your computer','monitor']].map(([id,zh,en,desc,descEn,ic])=>'<button data-action="usage-choice:'+id+'">'+icon(ic)+'<span><strong>'+L(zh,en)+'</strong><small>'+L(desc,descEn)+'</small></span>'+icon('chevron')+'</button>').join('')+'</div><p class="usage-choice-hint">'+L('进入后可随时切换 AI 会话和我的设备。','You can switch between AI sessions and My devices at any time.')+'</p></div></main>';}
const romBaseSide=remoteMacSide;
remoteMacSide=function(){if(s.page==='usage-choice')return '';let html=romBaseSide();const nav='<nav class="rom-side-nav" aria-label="工作区导航">'+btn('我的设备','rom:devices',s.page==='list'?'selected':'ghost','monitor')+btn('AI 会话','rom:sessions',s.page==='office-sessions'?'selected':'ghost','chat')+'</nav>';return html.replace('<div class="sr-side-heading">我的设备</div>',nav+'<div class="sr-side-heading rom-device-heading">电脑</div>').replace(s.page==='office-sessions'?'computer-item selected':'__unused','computer-item');};
const romBaseList=remoteMacList;
remoteMacList=function(){return s.page==='usage-choice'?romUsageChoice():s.page==='office-sessions'?romSessions():romBaseList();};
quickCatalog=function(){return romApps.map(x=>({id:x.id,name:x.name}));};
quickApps=function(){s.quickAppsByDevice ||= {};const current=s.quickAppsByDevice[s.device];return s.quickAppsByDevice[s.device]=Array.isArray(current)?current.filter(x=>romApps.some(a=>a.id===x)):['vscode','claude','workbuddy','browser'];};
gptQuickLaunch=function(){const disabled=!device().online||device().blocked;return '<div class="gpt-quick-row">'+quickApps().map(id=>{const a=romApps.find(x=>x.id===id);return '<button class="gpt-quick rom-quick" data-action="rom:app:'+id+'"'+(disabled?' disabled':'')+'>'+romAppIcon(a.id)+'<span>'+a.name+'</span></button>';}).join('')+btn('添加应用','quicklaunch','gpt-add','plus')+'</div>';};
function romCapturePicker(){return '<section class="rom-capture-picker" aria-label="选择串流画面"><div class="row spread"><h3>选择串流画面</h3>'+ib('关闭画面选择','rom:picker-close','close')+'</div><button class="rom-capture-option '+(remoteOfficeMac.capture==='desktop'?'selected':'')+'" data-action="rom:capture:desktop">'+icon('monitor')+'<span><strong>全桌面</strong><small>显示电脑完整桌面</small></span></button><h4>应用窗口</h4>'+(romAvailable().length?romAvailable().map(a=>'<button class="rom-capture-option '+(remoteOfficeMac.capture===a.id?'selected':'')+'" data-action="rom:capture:'+a.id+'">'+romAppIcon(a.id)+'<span><strong>'+a.name+'</strong><small>仅显示此应用窗口</small></span>'+(remoteOfficeMac.capture===a.id?icon('check'):'')+'</button>').join(''):'<p class="rom-empty-windows">暂无打开的窗口，可返回桌面打开应用。</p>')+'</section>';}
function romChat(id,title,key,store,readonly,disabled){
 const texts={vscode:['检查远程工作台原型，整理需要调整的代码。','已打开项目文件。可以在编辑器查看当前代码，并在右侧继续讨论实现。'],claude:['继续检查接口与异常处理。','已整理接口返回和错误处理思路。可以继续核对具体场景。'],workbuddy:['整理产品介绍页的任务和交付物。','已整理任务步骤，工作区保留了页面稿和项目资料。']};
 const intro=texts[id],messages=store.messages[key]||[];
 return '<div class="rom-remote-chat"><header><strong>'+esc(title)+'</strong><span>'+({vscode:'AI 助手',claude:'会话',workbuddy:'任务对话'}[id])+'</span></header><div class="rom-transcript" tabindex="0" aria-label="远端应用会话内容"><div class="rom-human">'+intro[0]+'</div><div class="rom-agent"><strong>'+romWindowName(id)+'</strong><p>'+intro[1]+'</p><p>浏览器中保留了页面预览，切换串流画面即可检查效果。</p><ul><li>检查页面与导航。</li><li>核对输入和按钮状态。</li><li>继续处理当前工作区。</li></ul></div>'+messages.map(x=>'<div class="rom-human">'+esc(x)+'</div>').join('')+'</div><div class="rom-composer"><textarea id="rom-compose" maxlength="2000" aria-label="远端应用输入" placeholder="在电脑应用中输入"'+readonly+'>'+esc(store.drafts[key]||'')+'</textarea><button data-action="rom:send"'+disabled+'>'+icon('chevron')+'<span>发送</span></button></div></div>';
}
function romRemoteApp(id){
 const a=romApps.find(x=>x.id===id),store=romStore(),thread=romThread();if(!a)return '';
 const disabled=s.view?' disabled':'',readonly=s.view?' readonly':'';let content='';
 if(['vscode','claude','workbuddy'].includes(id)){
  const activeThread=thread?.app===id?thread:romThreads.find(x=>x.device===s.device&&x.app===id),title=activeThread?.title||'新的工作区',key=activeThread?.id||id,chat=romChat(id,title,key,store,readonly,disabled);
  if(id==='vscode'){
   content='<div class="rom-vscode-menubar"><span>文件</span><span>编辑</span><span>选择</span><span>查看</span><span>终端</span><span>帮助</span></div><div class="rom-vscode-workspace"><aside class="rom-vscode-activity">'+icon('file')+icon('search')+icon('copy')+icon('settings')+'</aside><aside class="rom-vscode-explorer"><strong>资源管理器</strong><h4>REMOTE-WORKSPACE</h4><span>'+icon('folder')+' src</span><span class="rom-tree-item selected">'+icon('file')+' main.js</span><span class="rom-tree-item">'+icon('file')+' styles.css</span><span>'+icon('file')+' package.json</span><span>'+icon('file')+' README.md</span></aside><div class="rom-vscode-editor"><div class="rom-code-tabs"><span>main.js</span><small>src / main.js</small></div><textarea id="rom-code" class="rom-code" aria-label="VS Code远端编辑器" maxlength="10000"'+readonly+'>'+esc(store.code)+'</textarea><div class="rom-terminal"><strong>终端</strong><p>workspace &gt; npm run dev</p><p>Local: http://localhost:3000</p></div></div><section class="rom-vscode-chat">'+chat+'</section></div><footer class="rom-vscode-status"><span>main</span><span>JavaScript</span><span>UTF-8</span></footer>';
  }else if(id==='claude'){
   content='<div class="rom-app-layout rom-claude-workspace"><aside class="rom-remote-sidebar rom-claude-history"><strong>Claude</strong><span>'+icon('chat')+' 会话</span><span>'+icon('folder')+' 项目</span><small>最近会话</small><div class="rom-remote-thread">'+esc(title)+'</div><span class="rom-history-item">页面结构讨论</span><span class="rom-history-item">项目说明整理</span><div class="rom-claude-project"><small>当前项目</small><strong>远程工作台</strong></div></aside>'+chat+'</div>';
  }else{
   content='<div class="rom-app-layout rom-workbuddy-workspace"><aside class="rom-remote-sidebar rom-workbuddy-nav"><strong>WorkBuddy</strong><span>'+icon('grid')+' 工作台</span><span>'+icon('folder')+' 文件</span><small>最近任务</small><div class="rom-remote-thread">'+esc(title)+'</div><span class="rom-history-item">需求整理</span><span class="rom-history-item">页面检查</span></aside><div class="rom-workbuddy-main"><header class="rom-workbuddy-project"><strong>'+esc(title)+'</strong><small>当前任务工作区</small></header><div class="rom-workbuddy-columns"><section class="rom-task-workspace"><h3>任务步骤</h3><div>'+icon('check')+' 整理页面内容</div><div>'+icon('check')+' 生成介绍页初稿</div><div>'+icon('clock')+' 检查交互效果</div><h3>工作区文件</h3><article>'+icon('file')+' 产品介绍.html</article><article>'+icon('file')+' 任务说明.md</article></section>'+chat+'</div></div></div>';
  }
 }else if(id==='browser'){
  content='<div class="rom-browser-bar"><span>'+icon('lock')+' localhost / workspace</span></div><div class="rom-browser-tabs">'+btn('页面预览','rom:browser:preview',store.browserTab==='preview'?'selected':'').replace('<button','<button'+disabled)+btn('项目说明','rom:browser:readme',store.browserTab==='readme'?'selected':'').replace('<button','<button'+disabled)+'</div><div class="rom-browser-page" tabindex="0"><small>REMOTE WORKSPACE</small><h1>'+(store.browserTab==='preview'?'让工作继续':'项目说明')+'</h1><p>'+(store.browserTab==='preview'?'你的项目、文件与应用，始终留在自己的电脑上。':'这是当前工作区的页面预览，点击页签可查看不同内容。')+'</p><div class="rom-preview-cards"><article><h3>任务进展</h3><p>检查最近修改与页面效果。</p></article><article><h3>项目文件</h3><p>继续处理原有工作区。</p></article></div><h2>当前页面</h2><p>在电脑上打开的浏览器窗口中查看内容。滚动此区域可继续阅读。</p><p>桌面与应用窗口可以随时切换，切换捕获画面不会关闭应用。</p><div class="rom-preview-footer">页面预览</div></div>';
 }else{content='<div class="rom-editor-bar">workspace / main.js</div><textarea id="rom-code" class="rom-code" aria-label="远端代码编辑器" maxlength="10000"'+readonly+'>'+esc(store.code)+'</textarea>';}
 return '<section class="rom-remote-app rom-client-'+id+'" data-remote-app="'+id+'"><header class="rom-windowbar"><span>'+romAppIcon(a.id)+a.name+(thread?.app===id?' · '+esc(thread.title):'')+'</span>'+ib('关闭远端窗口','rom:close-window','close').replace('<button','<button'+disabled)+'</header>'+content+'</section>';
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
remoteMacReview=function(){const enabled=standaloneMac.signed;const demos=[['default','缺省态：无设备'],['all','穷举态：完整样例'],['no-sessions','无会话'],['loading','加载中'],['error','加载失败'],['offline','全部离线'],['blocked','未允许被控'],['busy','设备占用']];const button=(label,act)=>btn(label,act,'ghost').replace('<button','<button'+(enabled?'':' disabled'));return romBaseReview().replace('</aside>','<section class="rom-review-note"><strong>AI 办公交互演示</strong><p>会话与窗口为本地样例。VS Code、Claude、WorkBuddy会话识别、定位和真实串流待接入验证；手机原生 AI 对话需继续技术调研。</p><div class="sr-review-actions rom-demo-states" aria-label="AI会话缺省与穷举状态">'+demos.map(([id,label])=>button(label,'rom:demo:'+id)).join('')+(remoteOfficeMac.listState==='loading'?button('模拟加载完成','rom:load-complete'):'')+(enabled&&s.page==='session'?button('模拟无打开窗口','rom:no-windows')+button('恢复窗口样例','rom:restore-windows'):'')+'</div></section></aside>');};

const romBaseClear=remoteMacClearRuntime;
remoteMacClearRuntime=function(){romClear();return romBaseClear();};
const romBasePreview=remoteMacPreview;
remoteMacPreview=function(id){if(id==='ai-sessions'){romBasePreview('list');s.page='office-sessions';remoteOfficeMac.notice='';render();return;}if(/game|mapping|gpt|entry-library|layout|cloud/i.test(id)){romBasePreview('list');return;}return romBasePreview(id);};
const romBaseRender=renderMac;
renderMac=function(){s.gameActive=false;s.mapping=false;s.virtualPad=false;s.mode='office';if(s.page==='gpt')s.page='office-sessions';if(['mapping','layout'].includes(s.panel))s.panel='';if(s.page==='session'&&s.panel==='windows')s.panel='rom-capture';return romBaseRender();};
function romOpen(app,threadId='',origin='detail'){
 if(!romApps.some(x=>x.id===app))return;const denied=romDenied();if(denied){remoteOfficeMac.notice=denied;if(s.page==='office-sessions')render();else toast(denied);return;}
 const pending=threadId?'rom:open:'+threadId:'rom:app:'+app;if(device().busy){s.pendingAction=pending;s.modal='takeover';render();return;}
 remoteOfficeMac.origin=origin;remoteOfficeMac.capture=app;remoteOfficeMac.thread=threadId;remoteOfficeMac.notice='';romStore().closed=romStore().closed.filter(x=>x!==app);s.previewEmptyWindows=false;s.view=false;s.modal='';s.panel='';s.gameActive=false;s.mapping=false;s.gptDesktop=false;s.mode='office';requestConnection('control');
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
  if(kind==='capture'){if(arg!=='desktop'&&!romAvailable().some(x=>x.id===arg))return;remoteOfficeMac.capture=arg;s.remoteZoom=1;s.panel='';render();return;}
  if(kind==='zoom'){s.remoteZoom=arg==='reset'?1:Math.max(1,Math.min(2,(s.remoteZoom||1)+(arg==='in'?.25:-.25)));render();return;}
  if(kind==='no-windows'||kind==='restore-windows'){s.previewEmptyWindows=kind==='no-windows';if(kind==='restore-windows')romStore().closed=[];s.panel='rom-capture';render();return;}
  if(s.view||romDenied())return;
  if(kind==='desktop-app'){if(!romApps.some(x=>x.id===arg))return;romStore().closed=romStore().closed.filter(x=>x!==arg);s.previewEmptyWindows=false;romStore().desktopApp=arg;render();return;}
  if(kind==='close-window'){const app=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(!app)return;if(!romStore().closed.includes(app))romStore().closed.push(app);if(remoteOfficeMac.capture==='desktop')romStore().desktopApp='';render();return;}
  if(kind==='browser'){if(['preview','readme'].includes(arg))romStore().browserTab=arg;render();return;}
  if(kind==='send'){const app=remoteOfficeMac.capture==='desktop'?romStore().desktopApp:remoteOfficeMac.capture;if(!['vscode','claude','workbuddy'].includes(app)||romStore().closed.includes(app))return;const key=romThread()?.app===app?romThread().id:romThreads.find(x=>x.device===s.device&&x.app===app)?.id||app;const text=(romStore().drafts[key]||'').trim();if(!text)return;(romStore().messages[key] ||= []).push(text);romStore().drafts[key]='';render();document.querySelector('.rom-transcript')?.scrollTo(0,1e6);return;}
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
document.addEventListener('input',e=>{if(!standaloneMac.signed)return;if(e.target.id==='rom-search'){remoteOfficeMac.query=e.target.value;const start=e.target.selectionStart;render();const input=document.getElementById('rom-search');input?.focus();try{input?.setSelectionRange(start,start);}catch{}return;}if(s.page!=='session'||s.view||romDenied())return;const store=romStore(),app=remoteOfficeMac.capture==='desktop'?store.desktopApp:remoteOfficeMac.capture;if(e.target.id==='rom-compose'){const key=romThread()?.app===app?romThread().id:romThreads.find(x=>x.device===s.device&&x.app===app)?.id||app;store.drafts[key]=e.target.value;}if(e.target.id==='rom-code')store.code=e.target.value;});
window.RemoteOfficeMac={state:remoteOfficeMac,threads:romThreads,apps:romApps,snapshot:()=>structuredClone(remoteOfficeMac)};
window.addEventListener('remote-language-change',()=>{if(s.page==='usage-choice')render();});
if(params.get('state')==='ai-sessions')remoteMacPreview('ai-sessions');else render();

