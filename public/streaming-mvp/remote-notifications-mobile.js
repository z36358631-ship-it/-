/* 手机端 Push 目标与连接守卫。/2026.10.30修改 */
(()=>{
 'use strict';
 const office=window.RemoteOfficeMobile;
 if(!office)return;
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 const aiApps={vscode:'ChatGPT',claude:'Claude',workbuddy:'WorkBuddy'};
 const loggedIn=()=>!!mobileAuth.loggedIn;
 const owner=()=>loggedIn()?mobileAuth.region+'|'+mobileAuth.accountPhone+'|'+mobileAuth.generation:'';
 const activeAccount=(device,app)=>window.RemoteAiAccounts?.active(device,app)||'primary';
 function targets(){
  if(!loggedIn()||s.empty)return [];
  return devices.filter(d=>!isUnsupportedDevice(d)).flatMap(d=>office.data(d.id).threads.filter(t=>Object.hasOwn(aiApps,t.app)).map(t=>({
   owner:owner(),device:d.id,app:t.app,thread:t.id,title:t.title,titleEn:t.en||t.title,
   deviceName:d.name,appName:aiApps[t.app],aiAccount:activeAccount(d.id,t.app),
   taskStatus:t.taskStatus||'idle',online:!!d.online,blocked:!!d.blocked,busy:!!d.busy
  })));
 }
 function current(){
  const device=s.device,app=office.state.app,thread=office.state.thread;
  const record=loggedIn()&&Object.hasOwn(aiApps,app)?office.data(device).threads.find(t=>t.id===thread&&t.app===app):null;
  const native=s.page==='office-native'&&!!document.querySelector('.mobile-independent-shell .office-native-workspace');
  const client=s.page==='session'&&office.state.capture===app&&!!office.data(device).windows[app]&&!!document.querySelector('.mobile-independent-shell .office-client-chat');
  return {device,app,thread,aiAccount:Object.hasOwn(aiApps,app)&&loggedIn()?activeAccount(device,app):'',viewing:!!(record&&!s.modal&&(native||client))};
 }
 function navigate(target,mode='client'){
  const fail=(zh,en)=>({ok:false,error:L(zh,en)});
  if(!loggedIn())return fail('请先登录盖世账号。','Sign in to GameHub first.');
  if(!target||!['preview','client'].includes(mode))return fail('此消息的会话已不可用。','The session for this message is unavailable.');
  if(target.owner&&target.owner!==owner())return fail('此消息不属于当前盖世账号。','This message belongs to another GameHub account.');
  const d=devices.find(item=>item.id===target.device);
  if(s.empty||!d||isUnsupportedDevice(d)||!Object.hasOwn(aiApps,target.app))return fail('此消息对应的电脑或软件已不可用。','The computer or app for this message is unavailable.');
  if(!target.aiAccount||target.aiAccount!==activeAccount(target.device,target.app))return fail('AI 账号已切换，请先切回消息对应的账号。','The AI account has changed. Switch back to the account for this message first.');
  const t=office.data(target.device).threads.find(item=>item.id===target.thread&&item.app===target.app);
  if(!t)return fail('此消息的会话已不可用。','The session for this message is unavailable.');
  if(mode==='client'&&!d.online)return fail('电脑已离线，恢复在线后可打开客户端。','The computer is offline. Reconnect to open the client.');
  if(mode==='client'&&d.blocked)return fail('电脑未允许被控，请先在电脑开启权限。','Enable remote control on the computer first.');
  // Preview retains the existing cached-history behavior for offline/blocked computers.
  // The client action retains connection and occupied-device confirmation guards.
  action((mode==='preview'?'office-native:':'office-thread:')+target.device+':'+target.app+':'+target.thread);
  return {ok:true};
 }
 window.RemoteNotificationAdapter={platform:'mobile',owner,loggedIn,targets,current,navigate};
})();
