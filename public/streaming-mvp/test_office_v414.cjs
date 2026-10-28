// V4.14 independent acceptance. Run after the supervisor rebuilds mobile.html/mac.html.
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=process.env.OFFICE_TEST_OUT||path.join(__dirname,'review/v414');
const report={version:'V4.14',pass:false,testSide:process.env.OFFICE_TEST_SIDE||'mobile+mac',checks:[],errors:[],screenshots:[],scope:'浏览器内交互与状态验收，不证明三款AI的真实集成、实时会话读取或公网串流联调'};
const variants={
 mobile:{file:'mobile.html',shell:'.mobile-independent-shell',demo:'office-demo:',ai:'mobile-tab:ai',devices:'mobile-tab:devices',aiPage:'office-ai',cards:'.office-session-main',groups:'.office-session-group',count:'.office-group-count',stream:'.office-stream',input:'#office-remote-input',send:'office-send',back:'office-back',capture:'office-capture:',picker:'office-capture-panel'},
 mac:{file:'mac.html',shell:'.sr-client',demo:'rom:demo:',ai:'rom:sessions',devices:'rom:devices',aiPage:'office-sessions',cards:'.rom-session-card',groups:'.rom-session-group',count:'[data-count]',stream:'.rom-screen',input:'#rom-compose',send:'rom:send',back:'exit',capture:'rom:capture:',picker:'rom:picker'}
};
const demoStates=['default','all','no-sessions','loading','error','offline','blocked','busy'];
let browser;
const source=file=>process.env.REMOTE_BASE_URL?process.env.REMOTE_BASE_URL.replace(/\/$/,'')+'/'+file:'file:///'+path.join(__dirname,file).replaceAll('\\','/');
const selector=action=>'[data-action="'+action+'"]';
const click=(p,a)=>p.locator(selector(a)).first().click();
const invoke=(p,a)=>p.evaluate(value=>action(value),a);
const st=p=>p.evaluate(()=>({page:s.page,modal:s.modal,device:s.device,view:!!s.view,game:!!s.gameActive}));
const signed=(p,side)=>p.evaluate(side=>side==='mobile'?mobileAuth.loggedIn:standaloneMac.signed,side);
async function shot(p,side,name){const nameOnDisk=side+'-'+name+'.png';await p.locator(variants[side].shell).screenshot({path:path.join(out,nameOnDisk)});if(!report.screenshots.includes(nameOnDisk))report.screenshots.push(nameOnDisk);}
async function open(side){const p=await browser.newPage({viewport:{width:side==='mac'?1510:1320,height:1050}});p.setDefaultTimeout(10000);p.on('pageerror',e=>report.errors.push(side+': '+e.message));await p.goto(source(variants[side].file)+'?lang=zh');return p;}
async function login(p,side,phone='13600008000',choice='office'){
 const v=variants[side],before=(await st(p)).page;
 for(const mode of demoStates.concat(side==='mobile'?['preview','preview-closed']:[])){
  const control=p.locator(selector(v.demo+mode)).first();assert.equal(await control.count(),1,'missing demo state '+mode);
  if(!await control.isDisabled())await control.click();
  await invoke(p,v.demo+mode);assert.equal(await signed(p,side),false);assert.equal((await st(p)).page,before);assert.equal(await p.locator(side==='mobile'?'.office-stream':'.rom-session').count(),0);
 }
 await invoke(p,'usage-choice:office');assert.equal(await signed(p,side),false);
 if(side==='mobile'){
  assert.match(await p.locator('.mobile-agreement').innerText(),/中国移动认证服务协议/);assert.equal(await p.locator('#mobile-agreement').isChecked(),false);
  await p.locator('#mobile-phone').fill(phone);await click(p,'mobile-sms');await p.locator('#mobile-code').fill('864209');await click(p,'mobile-login-submit');assert.equal(await signed(p,side),false);await p.locator('#mobile-agreement').check();await click(p,'mobile-login-submit');
 }else{
  assert.doesNotMatch(await p.locator('.sr-consent').innerText(),/中国移动认证服务协议/);assert.equal(await p.locator('#sr-consent').isChecked(),false);
  await p.locator('#sr-credential').fill(phone);await click(p,'sr-send-code');await p.locator('#sr-code').fill('864209');await p.locator('#sr-account-form button[type=submit]').click();assert.equal(await signed(p,side),false);await p.locator('#sr-consent').check();await p.locator('#sr-account-form button[type=submit]').click();
 }
 await p.waitForFunction(()=>s.page==='usage-choice');await shot(p,side,'usage-choice');await click(p,'usage-choice:'+choice);
 if(side==='mac'&&await p.locator('.sr-first-guide').count())await click(p,'sr-onboard-skip');
 assert.equal((await st(p)).page,choice==='office'?v.aiPage:'list');
 report.checks.push(side+'：未登录评审入口不绕过认证；协议未勾拦截、任意六位码、登录后用途选择与正确落点');
}
async function grouped(p,side){
 const v=variants[side];
 for(const status of ['online','offline']){
  const group=p.locator(v.groups+'['+(side==='mobile'?'data-group':'data-status')+'="'+status+'"]');assert.equal(await group.count(),1,'missing group '+status);
  assert.equal(Number(await group.locator(v.count).innerText()),await group.locator(v.cards).count());
  assert.match(await group.locator('h2').innerText(),status==='online'?/在线会话|Online sessions/:/离线会话|Offline sessions/);
 }
}
async function forbidden(p,side){
 const prior=await st(p);
 for(const a of ['gpt-game-launch:gamehub','quick-open:steam','virtual-key-layout','mapping-plan','rlc:open','rlc:publish','mode:game','state:game']){await invoke(p,a);assert.equal((await st(p)).game,false);if(a!=='state:game')assert.equal((await st(p)).page,prior.page);assert.notEqual((await st(p)).page,'session');assert.equal(await p.locator('.rlc-overlay').count(),0);}
 report.checks.push(side+'：旧游戏、虚拟按键与云分享动作继续不可达');
}
async function demoMatrix(p,side){
 const v=variants[side],empty=side==='mobile'?'.office-session-empty':'.rom-list-empty',guide=side==='mobile'?'office-guide':'rom:guide',guideBody=side==='mobile'?'.office-connection-guide ol':'#rom-connect-guide';
 await click(p,v.demo+'default');assert.equal(await p.locator(v.cards).count(),0);assert.match(await p.locator(empty).innerText(),/电脑/);await shot(p,side,'default-no-devices');
 // Empty states may expand guidance automatically; its actual toggle remains operable.
 await click(p,guide);if(!await p.locator(guideBody).count())await click(p,guide);assert.equal(await p.locator(guideBody+' li').count(),3);
 await click(p,v.demo+'all');await grouped(p,side);assert.equal(await p.locator(v.cards).count(),side==='mobile'?12:4);assert.equal(await p.locator(v.cards+' .remote-ai-icon').count(),side==='mobile'?12:4);assert(await p.locator(v.cards+' .remote-ai-icon').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0&&img.src.startsWith('data:'))));for(const name of ['VS Code','Claude','WorkBuddy'])assert(await p.locator(v.cards+' .remote-ai-icon[alt="'+name+'"]').count()>0);await shot(p,side,'grouped-sessions');
 await click(p,guide);if(!await p.locator(guideBody).count())await click(p,guide);assert.equal(await p.locator(guideBody+' li').count(),3);await shot(p,side,'connection-guide');
 await click(p,v.demo+'no-sessions');assert.equal(await p.locator(v.cards).count(),0);assert.match(await p.locator(empty).innerText(),/暂无.*会话/);
 await click(p,v.demo+'loading');assert.equal(await p.locator(side==='mobile'?'.office-list-loading':'.rom-list-loading').count(),1);assert.equal(await p.locator(v.cards).count(),0);await shot(p,side,'loading');
 if(side==='mobile'){assert.equal(await p.locator('.office-ai-list '+selector('office-demo:all')).count(),0);await click(p,v.demo+'all');}else await click(p,'rom:load-complete');
 await grouped(p,side);await click(p,v.demo+'error');assert.equal(await p.locator(side==='mobile'?'.office-list-error':'.rom-list-error').count(),1);await shot(p,side,'error');await click(p,side==='mobile'?'office-retry':'rom:retry');if(side==='mac'){assert.equal(await p.locator('.rom-list-loading').count(),1);await click(p,'rom:load-complete');}await grouped(p,side);
 await click(p,v.demo+'offline');await grouped(p,side);assert.equal(await p.locator(v.groups+'['+(side==='mobile'?'data-group':'data-status')+'="online"] '+v.cards).count(),0);await shot(p,side,'offline-group');
 await invoke(p,side==='mobile'?'office-thread:win:vscode:plan':'rom:open:win-vscode');assert.equal((await st(p)).page,v.aiPage);assert.match(await p.locator(side==='mobile'?'.office-notice':'.rom-inline-notice').innerText(),/离线/);
 await click(p,v.demo+'blocked');await invoke(p,side==='mobile'?'office-thread:win:vscode:plan':'rom:open:win-vscode');assert.equal((await st(p)).page,v.aiPage);assert.match(await p.locator(side==='mobile'?'.office-notice':'.rom-inline-notice').innerText(),/不允许|未允许|权限/);
 await click(p,v.demo+'busy');await click(p,side==='mobile'?'office-thread:win:vscode:plan':'rom:open:win-vscode');assert.equal((await st(p)).modal,'takeover');await click(p,'cancel');assert.equal((await st(p)).page,v.aiPage);await click(p,v.demo+'all');
 await p.locator('[data-remote-language=en]').click();await grouped(p,side);assert.match(await p.locator(v.groups).first().locator('h2').innerText(),/Online sessions/i);await shot(p,side,'grouped-english');await p.locator('[data-remote-language=zh]').click();
 await click(p,v.devices);assert.equal((await st(p)).page,'list');await click(p,v.ai);assert.equal((await st(p)).page,v.aiPage);await forbidden(p,side);
 report.checks.push(side+'：在线/离线分组及计数、列表/空态连接指引、全部评审状态、加载结束/失败重试、离线/禁控/忙与中英文Tab检查');
}
async function appFlows(p,side){
 const v=variants[side];
 for(const app of ['vscode','claude','workbuddy']){
  await click(p,v.demo+'all');const act=side==='mobile'?'office-thread:win:'+app+':'+({vscode:'plan',claude:'review',workbuddy:'workspace'}[app]):'rom:open:'+({vscode:'win-vscode',claude:'win-claude',workbuddy:'work-workbuddy'}[app]);
  await click(p,act);if((await st(p)).modal==='takeover')await click(p,'takeover-confirm');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator(v.stream).getAttribute('data-capture'),app);
  assert.equal(await p.locator(side==='mobile'?'.office-client-'+app:'.rom-'+app+'-workspace').count(),1);assert.equal(await p.locator('.office-native-workspace').count(),0);
  const text='V414 '+side+' '+app;await p.locator(v.input).fill(text);await click(p,v.send);assert((await p.locator(side==='mobile'?'.office-remote-scroll':'.rom-transcript').innerText()).includes(text));await shot(p,side,'app-'+app);
  await invoke(p,'toggle-view');assert.equal(await p.locator(v.input).getAttribute('readonly'),'');assert(await p.locator(selector(v.send)).isDisabled());const before=await p.locator(side==='mobile'?'.office-remote-scroll':'.rom-transcript').innerText();await invoke(p,v.send);assert.equal(await p.locator(side==='mobile'?'.office-remote-scroll':'.rom-transcript').innerText(),before);await invoke(p,'toggle-view');
  const draft='V414 keep draft '+app;await p.locator(v.input).fill(draft);await click(p,v.demo+'default');await click(p,v.demo+'all');await click(p,act);if((await st(p)).modal==='takeover')await click(p,'takeover-confirm');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator(v.input).inputValue(),draft);
  await click(p,v.picker);const panel=side==='mobile'?'.office-capture-panel':'.rom-capture-picker';await p.locator(panel+' '+selector(v.capture+'desktop')).click();assert.equal(await p.locator(v.stream).getAttribute('data-capture'),'desktop');await click(p,v.picker);await p.locator(panel+' '+selector(v.capture+'browser')).click();assert.equal(await p.locator(v.stream).getAttribute('data-capture'),'browser');await click(p,v.back);assert.equal((await st(p)).page,v.aiPage);
 }
 report.checks.push(side+'：VS Code/Claude/WorkBuddy各有桌面结构和真实输入；默认会话进入远端应用，观看禁写，缺省/全量恢复不清草稿，桌面/浏览器切换及来源返回');
}
async function mobilePreview(p){
 await click(p,'office-demo:preview');assert.equal((await st(p)).page,'office-native');const native=p.locator('.office-native-preview');assert.equal(await native.getAttribute('data-preview-state'),'ready');
 const draft='V414 原生未发送草稿';await p.locator('#office-native-input').fill(draft);const context=await p.evaluate(()=>({app:RemoteOfficeMobile.state.app,thread:RemoteOfficeMobile.state.thread,device:s.device}));
 const a=await native.boundingBox(),b=await p.locator('.office-native-messages').boundingBox(),c=await p.locator('#office-native-form').boundingBox();assert(a.y+a.height<=b.y+2);assert(b.y+b.height<=c.y+2);
 await click(p,'office-preview-tab:1');assert.equal(await p.locator('.office-preview-content').getAttribute('data-preview-tab'),'1');await click(p,'office-preview-toggle');assert.equal(await p.locator('.office-preview-content').count(),0);assert.equal(await p.locator('#office-native-input').inputValue(),draft);await click(p,'office-preview-toggle');await shot(p,'mobile','native-preview');
 await p.locator('[data-remote-language=en]').click();assert.equal(await p.locator('#office-native-input').inputValue(),draft);assert.match(await native.innerText(),/Web preview/);await p.locator('[data-remote-language=zh]').click();
 await click(p,'office-preview-expand');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator('.office-stream').getAttribute('data-capture'),'browser');await click(p,'office-preview-tab:0');await click(p,'office-back');assert.equal((await st(p)).page,'office-native');assert.deepEqual(await p.evaluate(()=>({app:RemoteOfficeMobile.state.app,thread:RemoteOfficeMobile.state.thread,device:s.device})),context);assert.equal(await p.locator('#office-native-input').inputValue(),draft);
 await click(p,'office-demo:preview-closed');assert.equal(await native.getAttribute('data-preview-state'),'closed');assert.equal(await p.locator('.office-preview-content').count(),0);assert(await p.locator(selector('office-preview-expand')).isDisabled());await shot(p,'mobile','preview-closed');
 // Closing the browser blocks the preview; closing the selected AI app also blocks chat.
 await click(p,'office-native-stream');await p.waitForFunction(()=>s.page==='session'&&!s.modal);await click(p,'office-close-window');await click(p,'office-back');assert(await p.locator(selector('office-native-send')).isDisabled());assert.equal(await p.locator('#office-native-input').getAttribute('readonly'),'');await invoke(p,'office-native-send');assert.equal(await p.locator('#office-native-input').inputValue(),draft);
 await click(p,'office-demo:offline');await click(p,'office-native:win:vscode:plan');assert.equal(await native.getAttribute('data-preview-state'),'offline');assert(await p.locator(selector('office-native-send')).isDisabled());assert(await p.locator(selector('office-preview-expand')).isDisabled());await shot(p,'mobile','offline-history');
 await click(p,'office-demo:all');await click(p,'office-native:win:vscode:plan');assert.equal(await p.locator('#office-native-input').inputValue(),draft);await click(p,'office-native-send');assert.equal(await p.locator('.office-native-message p').filter({hasText:draft}).count(),1);
 report.checks.push('mobile：上网页预览/下聊天输入，展开折叠和网页交互，放大浏览器串流后恢复原会话与草稿；浏览器关闭不伪造预览、AI窗口关闭及离线禁发；英文切换保留输入');
}
async function accountIsolation(p,side){
 const v=variants[side];await click(p,v.demo+'all');await click(p,side==='mobile'?'office-native:win:vscode:plan':'rom:open:win-vscode');if(side==='mac')await p.waitForFunction(()=>s.page==='session'&&!s.modal);const input=side==='mobile'?'#office-native-input':'#rom-compose';await p.locator(input).fill('V414 私有账号草稿');
 if(side==='mobile'){await invoke(p,'mobile-tab:profile');await click(p,'mobile-logout');}else{await click(p,'exit');await click(p,'mac-account');await click(p,'sr-logout');}await click(p,'remote-logout:confirm');
 await login(p,side,'13900009000','other');await click(p,v.ai);await click(p,v.demo+'all');await click(p,side==='mobile'?'office-native:win:vscode:plan':'rom:open:win-vscode');if(side==='mac')await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.notEqual(await p.locator(input).inputValue(),'V414 私有账号草稿');assert(!(await p.locator(v.shell).innerText()).includes('V414 私有账号草稿'));
 report.checks.push(side+'：评审恢复不保留上一账号草稿，二次登录非办公落设备且可切AI会话');
}
async function mobileFlow(p){await login(p,'mobile');await demoMatrix(p,'mobile');await appFlows(p,'mobile');await mobilePreview(p);await accountIsolation(p,'mobile');}
async function macFlow(p){await login(p,'mac');await demoMatrix(p,'mac');await appFlows(p,'mac');await accountIsolation(p,'mac');}
async function main(){
 for(const side of ['mobile','mac']){if(process.env.OFFICE_TEST_SIDE&&process.env.OFFICE_TEST_SIDE!==side)continue;const p=await open(side);try{await(side==='mobile'?mobileFlow(p):macFlow(p));}catch(e){report.errors.push(side+': '+e.stack);await shot(p,side,'failure').catch(()=>{});}finally{await p.close();}}
 assert.deepEqual(report.errors,[]);report.pass=true;
}
(async()=>{fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await main();})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();fs.writeFileSync(path.join(out,'office-v414-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});
