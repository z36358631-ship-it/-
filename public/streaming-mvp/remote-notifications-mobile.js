/* Mobile notification bridge. Inbox and Push state belong to remote-notifications.js. */
(()=>{
 'use strict';
 const office=window.RemoteOfficeMobile;
 if(!office)return;
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 const aiApps={vscode:'ChatGPT',claude:'Claude',workbuddy:'WorkBuddy'};
 let centerOpenFor='';
 const loggedIn=()=>!!mobileAuth.loggedIn;
 const owner=()=>loggedIn()?mobileAuth.region+'|'+mobileAuth.accountPhone:'';
 const sessionKey=()=>owner()+'|'+mobileAuth.generation;
 const centerVisible=()=>!!centerOpenFor&&centerOpenFor===sessionKey();
 const activeAccount=(device,app)=>window.RemoteAiAccounts?.active(device,app)||'primary';
 const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
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
  return {device,app,thread,aiAccount:Object.hasOwn(aiApps,app)&&loggedIn()?activeAccount(device,app):'',viewing:!!(record&&!centerVisible()&&!s.modal&&(native||client))};
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
 function badge(element,unread){
  element.querySelectorAll('.rn-badge').forEach(node=>node.remove());
  const count=Math.max(0,Math.floor(Number(unread)||0));
  if(!count)return;
  const mark=document.createElement('span');mark.className='rn-badge';mark.textContent=String(count);
  mark.setAttribute('aria-label',L(count+' 条未读',count+' unread'));
  const chevron=element.classList.contains('rn-profile-entry')?element.lastElementChild:null;
  element.insertBefore(mark,chevron);
 }
 function injectEntry(unread){
  if(!loggedIn()||centerVisible())return;
  const shell=document.querySelector('.mobile-independent-shell');
  if(!shell)return;
  const label=L('消息通知','Notifications');
  if(['office-ai','list'].includes(s.page)){
   const header=shell.querySelector('.head');
   if(!header)return;
   let entry=header.querySelector('[data-action="rn:open"]');
   if(!entry){entry=document.createElement('button');entry.type='button';entry.className='rn-entry';entry.dataset.action='rn:open';entry.innerHTML=bell;header.insertBefore(entry,header.querySelector('.ai-account-entry'));}
   entry.setAttribute('aria-label',label);entry.title=label;badge(entry,unread);
  }else if(s.page==='mobile-profile'){
   const panel=shell.querySelector('.personal-page .personal-panel');
   if(!panel)return;
   let entry=panel.querySelector('[data-action="rn:open"]');
   if(!entry){entry=document.createElement('button');entry.type='button';entry.className='personal-row rn-profile-entry';entry.dataset.action='rn:open';entry.innerHTML=bell+'<span class="grow"><strong></strong></span>'+icon('chevron');panel.insertBefore(entry,panel.firstChild);}
   entry.querySelector('strong').textContent=label;entry.setAttribute('aria-label',label);badge(entry,unread);
  }
 }
 function mount(){
  if(!loggedIn())return null;
  const shell=document.querySelector('.mobile-independent-shell');
  if(!shell)return null;
  centerOpenFor=sessionKey();
  let host=shell.querySelector(':scope > .rn-page-host');
  if(host)return host;
  host=document.createElement('div');host.className='rn-page-host rn-mobile-page-host';
  host.style.cssText='display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;overflow:hidden;';
  const status=shell.querySelector(':scope > .status');
  shell.insertBefore(host,status?status.nextSibling:shell.firstChild);
  for(const child of [...shell.childNodes]){
   if(child===host||child===status||child.nodeType===1&&child.matches('.bottom'))continue;
   host.appendChild(child);
  }
  return host;
 }
 window.RemoteNotificationAdapter={platform:'mobile',owner,loggedIn,mount,targets,current,navigate,injectEntry,onOpen:()=>{centerOpenFor=sessionKey();},onClose:()=>{centerOpenFor='';}};
})();
