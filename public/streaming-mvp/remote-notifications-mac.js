/* 电脑端 Push 目标与连接守卫。/2026.10.30修改 */
(()=>{
 'use strict';
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 const loggedIn=()=>typeof standaloneMac!=='undefined'&&!!standaloneMac.signed;
 const owner=()=>loggedIn()?standaloneMac.region+'|'+(standaloneMac.accountUid||'demo')+'|'+standaloneMac.generation:'';
 const activeAccount=(deviceId,app)=>window.RemoteAiAccounts?.active?.(deviceId,app)||'primary';
 const supportedDevices=()=>typeof devices==='undefined'||s.empty?[]:devices.filter(d=>!isUnsupportedDevice(d));
 const appName=app=>typeof romWindowName==='function'?romWindowName(app):({vscode:'ChatGPT',claude:'Claude',workbuddy:'WorkBuddy'}[app]||app);
 const targetList=()=>{
  if(!loggedIn()||!window.RemoteOfficeMac)return [];
  const supported=supportedDevices();
  return RemoteOfficeMac.threads.filter(t=>['vscode','claude','workbuddy'].includes(t.app)&&supported.some(d=>d.id===t.device)).map(t=>({device:t.device,app:t.app,thread:t.id,targetId:t.id,title:t.title,titleEn:t.titleEn||t.title,deviceName:supported.find(d=>d.id===t.device).name,appName:appName(t.app),aiAccount:activeAccount(t.device,t.app)}));
 };
 function current(){
  const id=typeof s==='undefined'?'':s.device;
  const result={device:id,app:'',thread:'',aiAccount:'',viewing:false};
  if(!loggedIn()||!window.RemoteOfficeMac||!['session','office-conversation'].includes(s.page))return result;
  const store=RemoteOfficeMac.state.devices[id]||{};
  const app=RemoteOfficeMac.state.capture==='desktop'?store.desktopApp:RemoteOfficeMac.state.capture;
  if(!['vscode','claude','workbuddy'].includes(app))return result;
  const thread=s.page==='office-conversation'?RemoteOfficeMac.threads.find(t=>t.id===RemoteOfficeMac.state.thread&&t.device===id&&t.app===app):romRecentThread(app);
  Object.assign(result,{app,thread:thread?.id||'',aiAccount:activeAccount(id,app)});
  const device=supportedDevices().find(d=>d.id===id);
  const visibleWindow=typeof macAppWindow==='undefined'||macAppWindow.status==='visible';
  const topicShown=s.page==='office-conversation'?!!document.querySelector('.rom-conversation-preview .rom-remote-chat'):!!document.querySelector('.rom-remote-app[data-remote-app="'+app+'"] .rom-remote-chat');
  result.viewing=!!thread&&!!device&&device.online&&!device.blocked&&visibleWindow&&!s.modal&&topicShown;
  return result;
 }
 function navigate(target,mode='client'){
  if(!loggedIn())return {ok:false,error:L('登录已失效，请重新登录。','Your session expired. Sign in again.')};
  if(target?.owner&&target.owner!==owner())return {ok:false,error:L('此消息不属于当前账号。','This message belongs to a different account.')};
  if(!['preview','client'].includes(mode))return {ok:false,error:L('此消息入口暂不可用。','This message action is unavailable.')};
  if(typeof macAppWindow!=='undefined'&&macAppWindow.status!=='visible')return {ok:false,error:L('请先恢复主窗口。','Restore the main window first.')};
  const threadId=target?.thread||target?.targetId;
  const thread=window.RemoteOfficeMac?.threads.find(t=>t.id===threadId&&t.device===target?.device&&t.app===target?.app&&['vscode','claude','workbuddy'].includes(t.app));
  const device=supportedDevices().find(d=>d.id===target?.device);
  if(!thread||!device)return {ok:false,error:L('对应电脑或会话已不可用。','The computer or conversation is no longer available.')};
  const aiAccount=activeAccount(thread.device,thread.app);
  if(target.aiAccount!=null&&target.aiAccount!==aiAccount)return {ok:false,error:L('当前 AI 账号与消息不一致，请先在 AI 账号中切换。','This message belongs to another AI account. Switch accounts in AI accounts first.')};
  if(!device.online)return {ok:false,error:L('电脑已离线，恢复在线后可打开会话。','The computer is offline. Open the conversation after it reconnects.')};
  if(device.blocked)return {ok:false,error:L('电脑未允许被控，请先在电脑开启权限。','Enable remote control on this computer first.')};
  // 保留占用接管确认；点击 Push 不批准 AI 操作。
  action('rom:'+(mode==='preview'?'preview:':'open:')+thread.id);
  return {ok:true};
 }
 window.RemoteNotificationAdapter={platform:'mac',owner,loggedIn,targets:targetList,current,navigate};
})();
