/* 仅演示系统 Push；不保存站内消息，不接真实通知服务。/2026.10.30修改 */
(()=>{
 'use strict';
 const a=window.RemoteNotificationAdapter;if(!a)return;
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 const types={completed:['任务已完成','Task completed'],error:['任务失败','Task failed'],'needs-input':['待输入','Needs input'],'needs-approval':['待批准','Needs approval']};
 const ui={owner:'',seen:new Set(),background:false,push:null,prompt:false};
 const permission={status:'default',enabled:false};let serial=0;
 const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>';
 const key=t=>[t.device,t.app,t.aiAccount,t.thread].join('|');
 const btn=(label,action,cls='')=>'<button type="button" class="rn-button '+cls+'" data-action="rn:'+action+'">'+label+'</button>';
 const enabled=()=>permission.status==='granted'&&permission.enabled;
 function sync(){
  const owner=a.loggedIn()?a.owner():'';
  if(owner!==ui.owner)Object.assign(ui,{owner,seen:new Set(),background:false,push:null,prompt:false});
  return !!owner;
 }
 function emit(event){
  if(!sync()||!event||!types[event.type]||!event.id)return false;
  const owner=event.owner??ui.owner,target=event.target;
  if(owner!==ui.owner||!target||target.owner&&target.owner!==ui.owner||!target.device||!target.app||!target.thread||!target.aiAccount)return false;
  const id=[owner,key(target),event.id].join('|');if(ui.seen.has(id))return false;ui.seen.add(id);
  // 前台、历史、未授权或关闭开关的事件不补发，不形成站内消息。
  if(!event.historical&&(ui.background||document.hidden)&&enabled())ui.push={id,eventId:event.id,type:event.type,target:{...target,owner}};
  render();return true;
 }
 function settingsRow(){
  const on=enabled(),status=permission.status==='denied'?L('系统通知未允许','System notifications blocked'):on?L('接收 AI 任务结果和待处理提醒','Receive AI task results and requests'):L('已关闭','Off');
  return '<div class="rn-setting-row"><div><strong>'+L('消息通知','Message notifications')+'</strong><small>'+status+'</small></div><button type="button" class="rn-setting-switch" role="switch" aria-label="'+L('消息通知','Message notifications')+'" aria-checked="'+on+'" data-action="rn:toggle"><span></span></button></div>';
 }
 function overlays(){
  let html='';
  if(ui.background)html+='<div class="rn-background"><div class="rn-home-clock">09:41</div><p>'+L('盖世远程已在后台','GameHub Remote is in the background')+'</p>'+btn(L('返回应用','Return to app'),'foreground')+'<small>'+L('系统通知演示','System notification demo')+'</small></div>';
  if(ui.push)html+='<aside class="rn-push" role="status" aria-label="'+L('系统 Push 通知演示','System Push notification demo')+'"><div class="rn-push-icon">'+bell+'</div><button class="rn-push-open" data-action="rn:push-open"><span><strong>'+L('盖世远程','GameHub Remote')+'</strong><small>'+L('现在 · 系统通知演示','Now · system notification demo')+'</small></span><b>'+L(...types[ui.push.type])+'</b><p>'+L('点击查看并继续处理','Open to view and continue')+'</p></button><button class="rn-push-dismiss" data-action="rn:push-dismiss" aria-label="'+L('关闭通知','Dismiss notification')+'">×</button></aside>';
  if(ui.prompt)html+='<div class="rn-permission-shade"><section class="rn-permission-dialog" role="dialog" aria-modal="true" aria-labelledby="rn-permission-title">'+bell+'<h2 id="rn-permission-title">'+L('允许盖世远程发送通知？','Allow GameHub Remote notifications?')+'</h2><p>'+L('用于提醒 AI 任务结果与待处理事项。','Receive AI task results and requests for your attention.')+'</p><small>'+L('系统授权演示，不请求浏览器权限','System permission demo. No browser permission is requested.')+'</small><div>'+btn(L('不允许','Don’t allow'),'permission:denied')+btn(L('允许','Allow'),'permission:granted','primary')+'</div></section></div>';
  return html;
 }
 function tools(){return '<section class="rn-demo-tools" aria-label="Push 演示"><strong>'+L('Push 演示','Push demo')+'</strong>'+[['event:completed','任务完成','Completed'],['event:needs-input','待输入','Needs input'],['event:needs-approval','待批准','Needs approval'],['event:error','任务失败','Task failed'],['background',ui.background?'已在后台':'切到后台',ui.background?'In background':'Move to background'],['foreground','返回前台','Return to foreground'],['permission:granted','允许通知','Allow notifications'],['permission:denied','拒绝通知','Block notifications'],['permission:default','重置授权','Reset permission']].map(([action,zh,en])=>btn(L(zh,en),action)).join('')+'<small>'+L('仅模拟系统 Push，不连接系统通知服务。','System Push simulation; no notification service is connected.')+'</small></section>';}
 function paint(){
  if(!sync())return;
  const shell=document.querySelector(a.platform==='mobile'?'.mobile-independent-shell':'.sr-client');
  shell?.insertAdjacentHTML('beforeend',overlays());
  const host=document.querySelector(a.platform==='mobile'?'.office-review-tools':'.rom-demo-states')||document.querySelector(a.platform==='mobile'?'.mobile-preview-tools':'.sr-preview-tools');host?.insertAdjacentHTML('beforeend',tools());
 }
 function go(){
  const record=ui.push;if(!record)return;
  ui.background=false;ui.push=null;ui.prompt=false;
  const result=a.navigate(record.target,'client');
  if(!result?.ok){toast(result?.error||L('此会话暂时无法打开，请稍后重试。','This session cannot be opened right now. Try again later.'));return;}
  render();
 }
 function toggle(){
  if(enabled()){permission.enabled=false;ui.push=null;ui.prompt=false;return;}
  if(permission.status==='granted'){permission.enabled=true;return;}
  if(permission.status==='denied'){toast(L('请在系统设置中允许盖世远程发送通知。','Allow GameHub Remote notifications in system settings.'));return;}
  ui.prompt=true;
 }
 function demoEvent(type){
  const all=a.targets(),index={completed:0,'needs-input':1,'needs-approval':2,error:3}[type],target=all[index%Math.max(all.length,1)];
  if(target)emit({id:'demo-run-'+Date.now()+'-'+(++serial),type,target});
 }
 const baseAction=action;action=function(value){
  if(!String(value).startsWith('rn:'))return baseAction(value);
  if(!sync())return;const [,kind,id]=value.split(':');
  if(kind==='push-open'){go();return;}
  else if(kind==='push-dismiss')ui.push=null;
  else if(kind==='toggle'||kind==='request')toggle();
  else if(kind==='permission'){if(['granted','denied','default'].includes(id)){permission.status=id;permission.enabled=id==='granted';ui.prompt=false;if(id!=='granted')ui.push=null;}}
  else if(kind==='background'){ui.background=true;ui.prompt=false;ui.push=null;}
  else if(kind==='foreground'){ui.background=false;ui.push=null;}
  else if(kind==='event'){demoEvent(id);return;}
  else return;
  render();
 };
 const baseRender=renderContent;renderContent=function(){sync();baseRender();paint();};
 window.addEventListener('remote-ai-task-event',e=>emit(e.detail||{}));
 window.addEventListener('remote-language-change',()=>render());
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.prompt){e.preventDefault();e.stopImmediatePropagation();ui.prompt=false;render();}},true);
 window.RemoteNotifications={emit,settingsRow,snapshot:()=>({owner:ui.owner,permission:{...permission},background:ui.background,push:ui.push?structuredClone(ui.push):null,prompt:ui.prompt,seenCount:ui.seen.size}),bell};
 render();
})();
