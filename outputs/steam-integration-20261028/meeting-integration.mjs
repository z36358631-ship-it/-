// Meeting revision: local interaction examples; no real Steam requests or credentials.
export const meetingCss=String.raw`
.prepare-modal{position:relative}.prepare-cancel{position:absolute;right:9px;top:7px;font-size:24px}.prepare-body{padding-top:18px}.source-tabs{display:flex;gap:8px;margin-bottom:14px}.source-tabs button{border:1px solid #62798c66;border-radius:7px;background:#ffffff08;color:#aabccb;padding:9px 13px;font-size:12px}.source-tabs button[aria-selected=true]{background:#284a62;color:#fff;border-color:#5d9dc0}.sync-status{display:flex;align-items:center;justify-content:flex-start;gap:10px;margin:0 0 14px;padding:9px 11px;background:#ffffff08;border-radius:7px;font-size:12px;color:#bdcbd6}.sync-status.error{color:#edb398}.sync-status button{background:none;border:0;color:#7dd4fb;padding:4px 6px}.source-note{font-size:11px;color:#9aafbf;margin:0 0 14px;line-height:1.6}.source-card-label{font-size:10px!important;color:#9db1c1!important;padding-top:0!important}.network-state{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#bdcbd6}.network-state p{margin:0}.host-sync{grid-column:1/-1;margin:0}.library .host-sync{margin-bottom:14px}.recent-row{grid-template-columns:repeat(3,minmax(0,1fr))}.recent-card small{display:block;font-size:10px;margin:0 10px 10px;color:#9aa5af}.window-sidebar .sidebar-heading{padding-bottom:7px}.source-tabs button:focus-visible{outline:2px solid #78d0f0;outline-offset:2px}.landscape .network-state{min-height:150px}.steam-big .source-tabs{margin-bottom:13px}
`;

export const meetingFunctions=String.raw`
// 2026.11.6修改：SDK原生页面以接入包为准，不在库内自建来源分类或导入同步。
const meetingFixtures=[['steam-network-loading','Steam 联网 · 加载中'],['steam-network-error','Steam 联网 · 失败'],['login-network-error','登录联网 · 失败'],['cellular-download','非 Wi-Fi · 下载确认'],['component-update','组件 · 需要更新'],['imported-game','本地导入 · 盖世启动']];
fixtureGroups[0][1]=fixtureGroups[0][1].filter(x=>x[0]!=='imported-game');
fixtureGroups.push(['联网与组件',meetingFixtures]);
let meeting={network:'ready',connection:'wifi',dataApproved:false,source:'steam',imports:['hades'],accounts:{},timer:null,epoch:0,entryFrom:'library'};
const meetingBaseStamp=stamp;
stamp=function(){return meetingBaseStamp().replace('Wi-Fi',meeting.connection==='cellular'?'5G':'Wi-Fi')};
function meetingAccountId(){return (pref.account&&pref.account.id)||'demo-steam-user'}
function cancelMeetingWork(){if(meeting.timer)clearTimeout(meeting.timer);meeting.timer=null;meeting.epoch++}
function resetMeeting(){cancelMeetingWork();meeting={network:'ready',connection:'wifi',dataApproved:false,source:'steam',imports:['hades'],accounts:{},timer:null,epoch:meeting.epoch,entryFrom:'library'}}
function setMeetingNetwork(status){if(!['ready','loading','error'].includes(status))throw Error('Unknown network status');cancelMeetingWork();meeting.network=status;render()}
function networkState(){return '<div class="network-state" role="status"><p>'+(meeting.network==='loading'?'<i class="loading-dot"></i>正在加载':'网络连接失败')+'</p>'+(meeting.network==='error'?'<button class="native-secondary" data-action="meeting-network-retry">重试</button>':'')+'</div>'}
const meetingBaseInner=steamInner;
steamInner=function(){return meeting.network!=='ready'?networkState():meetingBaseInner()};
const meetingBaseLogin=renderLogin;
renderLogin=function(){return meeting.network==='ready'?meetingBaseLogin():networkState()};
const meetingBaseLibrary=renderLibrary;
renderLibrary=function(){let html=meetingBaseLibrary();const label=id=>id==='hades'?(state.localLaunch==='hades'?'正在启动本机游戏':'本机导入'):!pref.prepared?(state.componentUpdate?'更新组件':'下载组件'):'本机已下载';html=html.replace(/(<button class="gamecard" data-action="launch-host-game" data-game="([^"]+)"[\s\S]*?<p>)[\s\S]*?(<\/p>)/g,(_,a,id,b)=>a+label(id)+b);html=html.replace(/(<button class="recent-card" data-action="launch-host-game" data-game="([^"]+)"[\s\S]*?<\/strong>)/g,(_,a,id)=>a+'<small>'+label(id)+'</small>');return html};
const meetingBaseReset=reset;
reset=function(){resetMeeting();state.gameSource=null;state.localLaunch=null;state.componentUpdate=false;meetingBaseReset()};actions.reset=reset;
const meetingBaseEnter=enter;
enter=function(target){if(['library','home','community','settings','profile'].includes(state.page))meeting.entryFrom=state.page;meetingBaseEnter(target)};
function entryBackground(){return meeting.entryFrom==='home'?renderHome():meeting.entryFrom==='community'?renderCommunity():meeting.entryFrom==='settings'?renderSettings():meeting.entryFrom==='profile'?renderProfile():renderLibrary()}
const meetingBaseMode=renderMode;
renderMode=function(){return meetingBaseMode().replace(renderLibrary(),entryBackground()).replace('data-action="library">取消','data-action="entry-cancel">取消')};
const meetingBasePrepare=renderPrepare;
renderPrepare=function(){if(state.stage==='cellular')return '<div class="prepare-underlay" inert aria-hidden="true">'+entryBackground()+'</div><div class="overlay prepare-overlay"><section class="modal prepare-modal" role="dialog" aria-modal="true" aria-labelledby="dataTitle"><h3 id="dataTitle">使用移动网络下载？</h3><p class="muted">当前非 Wi-Fi 网络，下载 Steam 组件将消耗约 256 MB 流量。</p><div class="buttons"><button class="btn" data-action="entry-cancel">取消</button><button class="btn primary" data-action="data-download">继续下载</button></div></section></div>';return meetingBasePrepare().replace(renderLibrary(),entryBackground()).replace('<div class="prepare-body">','<button class="prepare-cancel iconbtn" data-action="entry-cancel" aria-label="取消下载">×</button><div class="prepare-body">')};
const meetingBaseDownload=startDownload;
startDownload=function(){if(meeting.connection==='cellular'&&!meeting.dataApproved){setStage('cellular');return}meetingBaseDownload()};
function cancelEntry(){stopTimer();stopPrepareTimer();cancelMeetingWork();state.prepareActive=false;state.prepareHidden=false;state.stage='idle';state.modal=null;state.modeGate=false;state.consent=false;meeting.dataApproved=false;clearLaunchIntent();transition(meeting.entryFrom||'library')}
const meetingBaseBack=back;
back=function(){if(['prepare','mode'].includes(state.page)){cancelEntry();return}meetingBaseBack()};actions.back=back;
const meetingBaseCold=coldStart;
coldStart=function(){cancelMeetingWork();meeting.network='ready';meeting.dataApproved=false;meeting.entryFrom='library';meetingBaseCold()};actions['cold-start']=coldStart;
const meetingBaseInvalidate=invalidateSteamAccount;
invalidateSteamAccount=function(){cancelMeetingWork();meeting.network='ready';meetingBaseInvalidate()};
const meetingBaseSwitch=actions['account-switch'];
actions['account-switch']=el=>{cancelMeetingWork();meeting.network='ready';meetingBaseSwitch(el)};
const meetingBaseHostLaunch=launchHostGame;
launchHostGame=function(id){if(id==='hades'){clearLaunchIntent();state.localLaunch=id;state.gameSource='imported_pc';state.gameStatus='waiting';state.launchCount=(state.launchCount||0)+1;render();return}state.gameSource='steam_game';state.localLaunch=null;meetingBaseHostLaunch(id)};
actions['launch-host-game']=el=>launchHostGame(el.dataset.game);
const meetingBaseFixture=loadFixture;
loadFixture=function(key){if(!meetingFixtures.some(x=>x[0]===key)){meetingBaseFixture(key);if(state.loggedIn&&!pref.account){pref.account={id:'demo-steam-user',nickname:'星际玩家',avatar:'hades'};persist();render()}return}if(['cellular-download','component-update','imported-game'].includes(key)){meetingBaseFixture('library');currentFixture=key;if(key==='component-update')state.componentUpdate=true;if(key==='imported-game')launchHostGame('hades');if(key==='cellular-download'){pref.accepted=LEGAL_VERSION;pref.flowVersion=FLOW_VERSION;meeting.connection='cellular';state.stage='cellular';state.page='prepare';state.prepareActive=true}persist();render();return}meetingBaseFixture('steam-library');pref.account={id:'demo-steam-user',nickname:'星际玩家',avatar:'hades'};state.loggedIn=true;currentFixture=key;if(key==='steam-network-loading')meeting.network='loading';if(key==='steam-network-error'||key==='login-network-error')meeting.network='error';if(key==='login-network-error'){state.page='login';invalidateSteamAccount();meeting.network='error'}persist();render()};
const meetingBaseRail=rail;
rail=function(){return meetingBaseRail().replace('<details>','<div class="control-grid"><button class="smallbtn" data-action="connection-toggle">网络：'+(meeting.connection==='wifi'?'Wi-Fi':'移动网络')+'</button><button class="smallbtn" data-action="meeting-network-ready" '+(meeting.network==='ready'?'disabled':'')+'>模拟网络恢复</button></div><p class="review-hint">2026.11.6修改：下载可取消，非 Wi-Fi 先确认流量；本地导入沿用盖世。SDK 登录、账号、悬浮内容为占位，以接入包为准。竖屏适配、启动转屏和待机功耗待实测。</p><details>')};
Object.assign(actions,{
 'entry-cancel':cancelEntry,
 'data-download':()=>{meeting.dataApproved=true;previewFrozen=false;startDownload()},
 'connection-toggle':()=>{meeting.connection=meeting.connection==='wifi'?'cellular':'wifi';meeting.dataApproved=false;if(state.prepareActive&&state.stage==='downloading'&&meeting.connection==='cellular'){stopPrepareTimer();setStage('cellular')}else render()},
 'meeting-network-retry':()=>{cancelMeetingWork();meeting.network='loading';render();const epoch=meeting.epoch;meeting.timer=setTimeout(()=>{if(meeting.epoch===epoch){meeting.network='ready';render()}},650)},
 'meeting-network-ready':()=>{cancelMeetingWork();meeting.network='ready';render()}
});
`;
