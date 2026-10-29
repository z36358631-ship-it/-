/* 双端任务消息与系统通知演示；不接真实通知服务。/2026.10.29修改 */
(()=>{
 'use strict';
 const a=window.RemoteNotificationAdapter;if(!a)return;
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const types={completed:['任务已完成','Task completed','check'],error:['任务失败','Task failed','!'],'needs-input':['待输入','Needs input','chat'],'needs-approval':['待批准','Needs approval','check']};
 const ui={owner:'',items:[],seen:new Set(),open:false,filter:'all',phase:'ready',notice:'',background:false,push:null,prompt:false,help:false};
 const permission={status:'default',enabled:true};let serial=0;
 const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>';
 const key=t=>[t.device,t.app,t.aiAccount,t.thread].join('|');
 const same=(x,y)=>!!x&&!!y&&key(x)===key(y);
 const unread=()=>ui.items.filter(x=>!x.read).length;
 const targetTitle=t=>L(t.title,t.titleEn||t.title);
 const btn=(label,action,cls='')=>'<button type="button" class="rn-button '+cls+'" data-action="rn:'+action+'">'+label+'</button>';
 const matchesCurrent=t=>!ui.open&&!ui.background&&!document.hidden&&a.current()?.viewing&&same(t,a.current());
 function sync(){
  const owner=a.loggedIn()?a.owner():'';
  if(owner!==ui.owner){a.onClose?.();Object.assign(ui,{owner,items:[],seen:new Set(),open:false,filter:'all',phase:'ready',notice:'',background:false,push:null,prompt:false,help:false});if(owner)seed();}
  return !!owner;
 }
 function seed(){
  const targets=a.targets(),order=['completed','needs-input','needs-approval','error'];[...order].reverse().forEach(type=>{const i=order.indexOf(type),target=targets[i%Math.max(targets.length,1)];if(target)receive({id:'history-'+type,type,target,owner:ui.owner,historical:true,read:i===3,timeLabel:['09:40','09:30','09:18','09:05'][i]},false);});
 }
 function receive(event,repaint=true){
  if(!event||!types[event.type]||!ui.owner||event.owner!==ui.owner||!event.id)return false;
  const target=event.target;if(!target||!target.device||!target.app||!target.thread||!target.aiAccount)return false;
  const id=[ui.owner,key(target),event.id].join('|');if(ui.seen.has(id))return false;ui.seen.add(id);
  const record={id:'notice-'+(++serial),eventId:event.id,type:event.type,target:{...target,owner:ui.owner},createdAt:Date.now(),timeLabel:event.timeLabel||'',historical:!!event.historical,read:!!event.read||matchesCurrent(target)};
  ui.items.unshift(record);
  if(!event.historical&&!record.read&&(ui.background||document.hidden)&&permission.status==='granted'&&permission.enabled)ui.push={id:record.id,type:record.type};
  if(repaint)render();return true;
 }
 function emit(event){sync();return receive({...event,owner:event.owner??ui.owner});}
 function markViewed(){const c=a.current();if(ui.open||ui.background||document.hidden||!c?.viewing)return;ui.items.forEach(x=>{if(same(x.target,c))x.read=true;});}
 function messageRow(x){
  const label=L(...types[x.type]),time=x.historical?L('今天 ','Today ')+E(x.timeLabel):L('刚刚','Just now');
  return '<article class="rn-message '+(x.read?'is-read':'is-unread')+'" data-notification="'+x.id+'" data-notice-type="'+x.type+'"><div class="rn-message-state is-'+x.type+'" aria-label="'+E(label)+'">'+(x.type==='error'?'!':x.type==='needs-input'?'…':x.type==='needs-approval'?'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6v4l3 2"/></svg>':'✓')+'</div><div class="rn-message-copy"><div class="rn-message-top"><strong>'+label+'</strong><time>'+time+'</time>'+(!x.read?'<span class="rn-unread-dot" aria-label="'+L('未读','Unread')+'"></span>':'')+'</div><button class="rn-message-subject" data-action="rn:target:'+x.id+':client">'+E(targetTitle(x.target))+'</button><p>'+E(x.target.deviceName)+' · '+E(x.target.appName)+'</p><div class="rn-message-actions">'+btn(L('打开客户端','Open client'),'target:'+x.id+':client','rn-link')+btn(L('预览对话','Preview chat'),'target:'+x.id+':preview','rn-link')+'</div></div></article>';
 }
 function center(){
  const count=unread(),permitted=permission.status==='granted'&&permission.enabled;
  const stateText=permission.status==='denied'?L('系统通知未允许','System notifications blocked'):permitted?L('已开启','On'):L('未开启','Off');
  const permissionAction=permission.status==='denied'?'help':permission.status==='granted'?'toggle':'request';
  const rows=ui.items.filter(x=>ui.filter==='all'||!x.read);let body=rows.map(messageRow).join('');
  if(ui.phase==='loading')body='<div class="rn-blank" role="status"><span class="rn-loading"></span><h2>'+L('正在获取消息','Loading notifications')+'</h2></div>';
  else if(ui.phase==='error')body='<div class="rn-blank"><h2>'+L('暂时无法获取消息','Unable to load notifications')+'</h2><p>'+L('请检查网络后重试。','Check your connection and try again.')+'</p>'+btn(L('重试','Retry'),'retry')+'</div>';
  else if(!rows.length)body='<div class="rn-blank">'+bell+'<h2>'+L(ui.filter==='unread'?'暂无未读消息':'暂无消息',ui.filter==='unread'?'No unread notifications':'No notifications yet')+'</h2><p>'+L('任务有新结果或需要你处理时，会显示在这里。','Task results and requests for your attention will appear here.')+'</p></div>';
  return '<section class="rn-center"><header class="rn-head">'+btn('‹','back','rn-back')+'<h1>'+L('消息通知','Notifications')+'</h1>'+btn(L('全部已读','Mark all read'),'read-all','rn-link')+'</header><div class="rn-permission">'+bell+'<div><strong>'+L('Push 提醒','Push notifications')+'</strong><small>'+stateText+'</small></div>'+btn(L(permission.status==='denied'?'查看开启方式':permitted?'关闭':'开启',permission.status==='denied'?'How to enable':permitted?'Turn off':'Enable'),permissionAction,'rn-link')+'</div>'+(ui.help?'<p class="rn-help">'+L('请在系统设置中允许盖世远程发送通知。此 Demo 可在页面外切换“允许通知”进行演示。','Allow GameHub Remote notifications in system settings. For this demo, use Allow notifications outside the app.')+'</p>':'')+'<nav class="rn-tabs" aria-label="'+L('消息筛选','Notification filter')+'">'+btn(L('全部','All')+'（'+ui.items.length+'）','filter:all',ui.filter==='all'?'selected':'')+btn(L('未读','Unread')+'（'+count+'）','filter:unread',ui.filter==='unread'?'selected':'')+'</nav>'+(ui.notice?'<p class="rn-notice" role="status">'+E(ui.notice)+'</p>':'')+'<div class="rn-message-list">'+body+'</div></section>';
 }
 function overlays(){
  let html='';
  if(ui.background)html+='<div class="rn-background"><div class="rn-home-clock">09:41</div><p>'+L('盖世远程已在后台','GameHub Remote is in the background')+'</p>'+btn(L('返回应用','Return to app'),'foreground')+'<small>'+L('系统通知演示','System notification demo')+'</small></div>';
  if(ui.push)html+='<aside class="rn-push" role="status" aria-label="'+L('系统 Push 通知演示','System Push notification demo')+'"><div class="rn-push-icon">'+bell+'</div><button class="rn-push-open" data-action="rn:push-open"><span><strong>'+L('盖世远程','GameHub Remote')+'</strong><small>'+L('现在 · 系统通知演示','Now · system notification demo')+'</small></span><b>'+L(...types[ui.push.type])+'</b><p>'+L('点击查看并继续处理','Open to view and continue')+'</p></button><button class="rn-push-dismiss" data-action="rn:push-dismiss" aria-label="'+L('关闭通知','Dismiss notification')+'">×</button></aside>';
  if(ui.prompt)html+='<div class="rn-permission-shade"><section class="rn-permission-dialog" role="dialog" aria-modal="true" aria-labelledby="rn-permission-title">'+bell+'<h2 id="rn-permission-title">'+L('允许盖世远程发送通知？','Allow GameHub Remote notifications?')+'</h2><p>'+L('用于提醒 AI 任务结果与待处理事项。','Receive AI task results and requests for your attention.')+'</p><small>'+L('系统授权演示，不请求浏览器权限','System permission demo. No browser permission is requested.')+'</small><div>'+btn(L('不允许','Don’t allow'),'permission:denied')+btn(L('允许','Allow'),'permission:granted','primary')+'</div></section></div>';
  return html;
 }
 function tools(){return '<section class="rn-demo-tools" aria-label="通知演示"><strong>'+L('通知演示','Notification demo')+'</strong>'+[['open','站内信','Inbox'],['demo:all','全部消息','All messages'],['demo:empty','无消息','Empty'],['demo:loading','加载','Loading'],['demo:error','失败态','Load error'],['event:completed','任务完成','Completed'],['event:needs-input','待输入','Needs input'],['event:needs-approval','待批准','Needs approval'],['event:error','任务失败','Task failed'],['background',ui.background?'已在后台':'切到后台',ui.background?'In background':'Move to background'],['foreground','返回前台','Return to foreground'],['permission:granted','允许通知','Allow notifications'],['permission:denied','拒绝通知','Block notifications']].map(([action,zh,en])=>btn(L(zh,en),action)).join('')+'<small>'+L('只演示站内信和 Push，不连接系统通知服务。','Inbox and Push simulation; no system notification service is connected.')+'</small></section>';}
 function paint(){
  if(!sync())return;if(!ui.open)a.onClose?.();markViewed();a.injectEntry(unread());
  if(ui.open){const host=a.mount();if(host)host.innerHTML=center();}
  const shell=document.querySelector(a.platform==='mobile'?'.mobile-independent-shell':'.sr-client');
  shell?.classList.toggle('rn-center-open',ui.open);if(shell)shell.insertAdjacentHTML('beforeend',overlays());
  const host=document.querySelector(a.platform==='mobile'?'.office-review-tools':'.rom-demo-states')||document.querySelector(a.platform==='mobile'?'.mobile-preview-tools':'.sr-preview-tools');host?.insertAdjacentHTML('beforeend',tools());
 }
 function go(record,mode){
  if(!record)return;ui.background=false;ui.push=null;ui.open=false;ui.notice='';a.onClose?.();
  const result=a.navigate(record.target,mode);
  if(!result?.ok){ui.open=true;ui.notice=result?.error||L('此会话暂时无法打开，请稍后重试。','This session cannot be opened right now. Try again later.');}
  render();
 }
 function demoEvent(type){
  const all=a.targets(),index={completed:0,'needs-input':1,'needs-approval':2,error:3}[type],target=all[index%Math.max(all.length,1)];
  if(target)emit({id:'demo-run-'+Date.now()+'-'+(++serial),type,target});
 }
 const baseAction=action;action=function(value){
  if(!String(value).startsWith('rn:')){if(ui.open&&(/^(mobile-tab:|remote-mac-nav:|rom:nav:|sr-nav:|ai-account:manage|device:)/.test(value)||['rom:devices','rom:sessions','remote-settings'].includes(value))){ui.open=false;ui.notice='';a.onClose?.();}return baseAction(value);}
  if(!sync())return;const [,kind,id,mode]=value.split(':');
  if(kind==='open'){ui.open=true;ui.notice='';ui.background=false;a.onOpen?.();}
  else if(kind==='back'){ui.open=false;ui.notice='';ui.help=false;a.onClose?.();}
  else if(kind==='filter'){if(['all','unread'].includes(id))ui.filter=id;}
  else if(kind==='read-all')ui.items.forEach(x=>x.read=true);
  else if(kind==='target'){go(ui.items.find(x=>x.id===id),mode==='preview'?'preview':'client');return;}
  else if(kind==='push-open'){go(ui.items.find(x=>x.id===ui.push?.id),'client');return;}
  else if(kind==='push-dismiss')ui.push=null;
  else if(kind==='request')ui.prompt=true;
  else if(kind==='toggle'){permission.enabled=!permission.enabled;if(!permission.enabled)ui.push=null;}
  else if(kind==='help')ui.help=!ui.help;
  else if(kind==='permission'){if(['granted','denied','default'].includes(id)){permission.status=id;permission.enabled=id==='granted';ui.prompt=false;ui.help=false;if(id!=='granted')ui.push=null;}}
  else if(kind==='background'){ui.background=true;ui.prompt=false;ui.push=null;}
  else if(kind==='foreground'){ui.background=false;ui.push=null;}
  else if(kind==='event'){demoEvent(id);return;}
  else if(kind==='retry')ui.phase='ready';
  else if(kind==='demo'){ui.open=true;ui.notice='';ui.phase=['loading','error'].includes(id)?id:'ready';if(id==='empty')ui.items=[];else if(id==='all'){ui.items=[];ui.seen.clear();seed();}}
  render();
 };
 const baseRender=renderContent;renderContent=function(){sync();baseRender();paint();};
 window.addEventListener('remote-ai-task-event',e=>emit(e.detail||{}));
 window.addEventListener('remote-language-change',()=>render());
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.prompt){e.preventDefault();e.stopImmediatePropagation();ui.prompt=false;render();}},true);
 window.RemoteNotifications={emit,snapshot:()=>({owner:ui.owner,items:structuredClone(ui.items),open:ui.open,filter:ui.filter,phase:ui.phase,unread:unread(),permission:{...permission},background:ui.background,push:ui.push?{...ui.push}:null}),bell};
 render();
})();
