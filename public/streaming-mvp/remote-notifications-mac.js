/* 电脑端通知挂接；消息存储、已读与Push演示由共享通知模块维护。/2026.10.29修改 */
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
 function mount(){return document.querySelector('.sr-client .computer-detail')||document.querySelector('.sr-client .rom-body')||null;}
 function titlebarEntry(unread){
  if(!loggedIn())return '';
  const count=Math.max(0,Math.floor(Number(unread)||0));
  return '<button type="button" class="ghost rn-entry rn-mac-entry" data-action="rn:open" aria-label="'+L('消息通知','Notifications')+'" title="'+L('消息通知','Notifications')+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>'+(count?'<span class="rn-badge" aria-label="'+L(count+' 条未读',count+' unread')+'">'+(count>99?'99+':count)+'</span>':'')+'</button>';
 }
 function injectEntry(unread){
  document.querySelectorAll('.rn-mac-entry').forEach(el=>el.remove());
  if(!loggedIn()||(typeof macAppWindow!=='undefined'&&macAppWindow.status!=='visible'))return;
  const bar=document.querySelector('.sr-client .sr-titlebar')||document.querySelector('.sr-client .rom-title');
  if(!bar)return;
  const before=bar.querySelector('.mac-account-entry')||bar.querySelector('.mac-app-window-actions');
  if(before)before.insertAdjacentHTML('beforebegin',titlebarEntry(unread));else bar.insertAdjacentHTML('beforeend',titlebarEntry(unread));
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
  // 两条原入口保留占用接管确认；消息点击不批准AI操作，也不直接修改通知已读状态。
  action('rom:'+(mode==='preview'?'preview:':'open:')+thread.id);
  return {ok:true};
 }
 window.RemoteNotificationAdapter={platform:'mac',entryAction:'rn:open',owner,loggedIn,mount,titlebarEntry,injectEntry,targets:targetList,current,navigate,onOpen(){},onClose(){}};
})();
