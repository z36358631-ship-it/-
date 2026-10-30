// Push-only 专项回归：系统权限、后台卡片和目标连接均为 Demo 模拟。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname,out=process.env.PUSH_TEST_OUT||path.join(root,'review/prd-v422/push');
const report={pass:false,checks:[],errors:[]};
const sel=a=>'[data-action='+JSON.stringify(a)+']';
const invoke=(p,a)=>p.evaluate(a=>action(a),a);
const snapshot=p=>p.evaluate(()=>RemoteNotifications.snapshot());
const emit=(p,type,target,id,extra={})=>p.evaluate(({type,target,id,extra})=>RemoteNotifications.emit({type,target,id,...extra}),{type,target,id,extra});
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 for(const side of ['mobile','mac']){
  const p=await b.newPage({viewport:{width:1450,height:1150}});p.on('pageerror',e=>report.errors.push(side+': '+e.message));p.setDefaultTimeout(12000);
  const shell=side==='mobile'?'.mobile-independent-shell':'.sr-client';
  let file=path.join(root,side+'.html');
  if(process.env.PUSH_SOURCE_TEST){
   let html=fs.readFileSync(file,'utf8');const start=html.indexOf(side==='mobile'?'/* Mobile notification bridge.':'/* 电脑端通知挂接；');assert(start>=0,'source adapter marker');
   html=html.slice(0,start)+fs.readFileSync(path.join(root,'remote-notifications-'+side+'.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'remote-notifications.js'),'utf8')+'</script></body></html>';
   html=html.replace('</style>',fs.readFileSync(path.join(root,'remote-notifications.css'),'utf8')+'</style>');
   file=path.join(out,'source-'+side+'.html');fs.writeFileSync(file,html);
  }
  const base=process.env.REMOTE_BASE_URL?process.env.REMOTE_BASE_URL.replace(/\/$/,'')+'/'+side+'.html':pathToFileURL(file).href;
  await p.goto(base+'?lang=zh&v=v422-push');
  if(side==='mobile'){
   await p.locator('#mobile-phone').fill('13600008000');await p.locator(sel('mobile-sms')).click();await p.locator('#mobile-code').fill('846201');await p.locator('#mobile-agreement').check();await p.locator(sel('mobile-login-submit')).click();
  }else{
   await p.locator('#sr-credential').fill('13600008000');await p.locator(sel('sr-send-code')).click();await p.locator('#sr-code').fill('846201');await p.locator('#sr-consent').check();await p.locator('#sr-account-form button[type=submit]').click();
  }
  await p.waitForFunction(()=>s.page==='usage-choice');await invoke(p,'usage-choice:office');if(side==='mac'&&await p.locator('.sr-first-guide').count())await invoke(p,'sr-onboard-skip');
  const check=async(name,fn)=>{await fn();report.checks.push({side,name,pass:true});};
  const shot=async name=>p.locator(shell).screenshot({path:path.join(out,side+'-'+name+'.png'),animations:'disabled'});
  const target=await p.evaluate(()=>RemoteNotificationAdapter.targets()[0]);assert(target);
  await check('站内入口、历史列表、未读数与旧演示动作全部移除',async()=>{
   assert.equal(await p.locator('.rn-entry,.rn-center,.rn-badge,.rn-message').count(),0);
   const x=await snapshot(p);assert(!Object.hasOwn(x,'items'));assert(!Object.hasOwn(x,'unread'));assert.equal(x.push,null);
   for(const a of ['rn:open','rn:demo:all','rn:demo:empty','rn:filter:unread','rn:read-all'])await invoke(p,a);
   assert.equal(await p.locator('.rn-center').count(),0);assert.equal(await p.evaluate(()=>s.page),side==='mobile'?'office-ai':'office-sessions');await shot('sessions');
  });
  await check('默认关闭，主动开启授权可取消，拒绝后不假授权',async()=>{
   assert.equal((await snapshot(p)).permission.enabled,false);assert.equal((await snapshot(p)).permission.status,'default');
   await invoke(p,'rn:toggle');assert.equal(await p.locator('.rn-permission-dialog').count(),1);await p.keyboard.press('Escape');assert.equal((await snapshot(p)).permission.enabled,false);
   await invoke(p,'rn:toggle');await invoke(p,'rn:permission:denied');await invoke(p,'rn:toggle');assert.equal((await snapshot(p)).permission.status,'denied');assert.equal((await snapshot(p)).permission.enabled,false);assert.equal(await p.locator('.rn-permission-dialog').count(),0);assert.match(await p.evaluate(()=>s.toast),/系统设置/);
  });
  await check('开关授权后开启，再次关闭，重新开启不重复授权',async()=>{
   await invoke(p,'rn:permission:default');await invoke(p,'rn:toggle');await invoke(p,'rn:permission:granted');assert.equal((await snapshot(p)).permission.enabled,true);
   await invoke(p,'rn:toggle');assert.equal((await snapshot(p)).permission.enabled,false);await invoke(p,'rn:toggle');assert.equal((await snapshot(p)).permission.enabled,true);assert.equal(await p.locator('.rn-permission-dialog').count(),0);
  });
  await check('前台不Push、历史不补发、同事件去重与跨账号丢弃',async()=>{
   assert(await emit(p,'completed',target,'foreground'));assert.equal((await snapshot(p)).push,null);await invoke(p,'rn:background');
   assert(await emit(p,'completed',target,'historical',{historical:true}));assert.equal((await snapshot(p)).push,null);assert.equal(await emit(p,'completed',target,'foreground'),false);
   assert.equal(await emit(p,'completed',target,'wrong-owner',{owner:'another-user'}),false);assert.equal(await emit(p,'completed',{...target,owner:'another-user'},'wrong-target-owner'),false);
  });
  await check('四类Push与通用隐私文案，关闭不修改任务状态',async()=>{
   const before=await p.evaluate(t=>RemoteNotificationAdapter.targets().find(x=>x.thread===t.thread)?.taskStatus,target);
   for(const type of ['completed','needs-input','needs-approval','error']){
    await emit(p,type,target,'type-'+type);assert.equal((await snapshot(p)).push.type,type);const text=await p.locator('.rn-push').innerText();assert(!text.includes(target.title));assert(!text.includes(target.deviceName));await shot('push-'+type);await invoke(p,'rn:push-dismiss');assert.equal((await snapshot(p)).push,null);
   }
   const after=await p.evaluate(t=>RemoteNotificationAdapter.targets().find(x=>x.thread===t.thread)?.taskStatus,target);assert.equal(after,before);
  });
  await check('关闭开关、拒绝权限不Push，重新开启不补旧事件',async()=>{
   await invoke(p,'rn:toggle');await emit(p,'error',target,'switch-off');assert.equal((await snapshot(p)).push,null);await invoke(p,'rn:toggle');assert.equal((await snapshot(p)).push,null);assert.equal(await emit(p,'error',target,'switch-off'),false);
   await invoke(p,'rn:permission:denied');await emit(p,'error',target,'denied');assert.equal((await snapshot(p)).push,null);await invoke(p,'rn:permission:granted');assert.equal((await snapshot(p)).push,null);
  });
  await check('Push点击定位原电脑软件主题，不批准AI操作',async()=>{
   await emit(p,'needs-approval',target,'open-client');await p.locator(sel('rn:push-open')).click();await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.evaluate(()=>RemoteNotificationAdapter.current().thread),target.thread);assert.equal((await snapshot(p)).push,null);await shot('client');
  });
  await check('目标失效、AI账号不符与电脑离线不回站内消息页',async()=>{
   const cases=[{target:{...target,thread:'missing-topic'},word:/会话|不可用/},{target:{...target,aiAccount:'wrong-ai'},word:/账号/}];
   for(let i=0;i<cases.length;i++){await invoke(p,'rn:background');await emit(p,'error',cases[i].target,'bad-'+i);await invoke(p,'rn:push-open');assert.match(await p.evaluate(()=>s.toast),cases[i].word);assert.equal(await p.locator('.rn-center').count(),0);assert.equal((await snapshot(p)).push,null);}
   await p.evaluate(id=>devices.find(d=>d.id===id).online=false,target.device);await invoke(p,'rn:background');await emit(p,'error',target,'offline');await invoke(p,'rn:push-open');assert.match(await p.evaluate(()=>s.toast),/离线/);await p.evaluate(id=>devices.find(d=>d.id===id).online=true,target.device);
  });
  await check('禁控拦截，占用保留二次接管且取消不连接',async()=>{
   await p.evaluate(id=>devices.find(d=>d.id===id).blocked=true,target.device);await invoke(p,'rn:background');await emit(p,'error',target,'blocked');await invoke(p,'rn:push-open');assert.match(await p.evaluate(()=>s.toast),/权限|被控/);await p.evaluate(id=>devices.find(d=>d.id===id).blocked=false,target.device);
   await invoke(p,side==='mobile'?'mobile-tab:ai':'rom:sessions');await p.evaluate(id=>devices.find(d=>d.id===id).busy=true,target.device);await invoke(p,'rn:background');await emit(p,'completed',target,'busy');await invoke(p,'rn:push-open');assert(await p.evaluate(()=>!!s.modal));await invoke(p,'cancel');assert.notEqual(await p.evaluate(()=>s.page),'session');await p.evaluate(id=>devices.find(d=>d.id===id).busy=false,target.device);
  });
  await check('英文Push和窄屏无横向溢出',async()=>{
   await p.locator('[data-remote-language=en]').click();await invoke(p,'rn:background');await emit(p,'needs-input',target,'english');assert.match(await p.locator('.rn-push').innerText(),/Needs input/);await p.setViewportSize({width:side==='mobile'?390:1000,height:1050});const size=await p.locator('.rn-push').evaluate(e=>({client:e.clientWidth,scroll:e.scrollWidth}));assert(size.scroll<=size.client+1);await shot('push-en');await invoke(p,'rn:foreground');
  });
  await check('退出清Push、去重状态与旧账号事件',async()=>{
   const oldOwner=(await snapshot(p)).owner;await invoke(p,'rn:background');await emit(p,'completed',target,'logout-pending');await invoke(p,side==='mobile'?'mobile-logout':'sr-logout');await invoke(p,'remote-logout:confirm');const x=await snapshot(p);assert.equal(x.owner,'');assert.equal(x.push,null);assert.equal(x.seenCount,0);assert.equal(await emit(p,'completed',target,'stale',{owner:oldOwner}),false);
  });
  await p.close();
 }
 assert.equal(report.errors.length,0);report.pass=true;
 }catch(e){report.errors.push(e.stack);process.exitCode=1;}finally{await b.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,errors:report.errors}));}})();
