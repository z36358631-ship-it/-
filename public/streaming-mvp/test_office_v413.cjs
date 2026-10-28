// Independent V4.13 AI-office acceptance. Run only after the final demo build.
// All device status changes below are isolated browser fixtures, not real devices.
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=process.env.OFFICE_TEST_OUT||path.join(__dirname,'review/v413');
const report={pass:false,version:'V4.13',testSide:process.env.OFFICE_TEST_SIDE||'mobile+mac',scope:'本地交互模拟；不证明真实远控、会话读取、远端APP定位或公网服务联调',checks:[],errors:[],screenshots:[]};
const clients={mobile:{file:'mobile.html',shell:'.mobile-independent-shell'},mac:{file:'mac.html',shell:'.sr-client'}};
let browser;
function url(file){return process.env.REMOTE_BASE_URL?process.env.REMOTE_BASE_URL.replace(/\/$/,'')+'/'+file:'file:///'+path.join(__dirname,file).replaceAll('\\','/');}
async function click(p,action){await p.locator('[data-action="'+action+'"]').first().click();}
async function invoke(p,action){await p.evaluate(a=>window.action?window.action(a):action(a),action);}
async function state(p){return p.evaluate(()=>({page:s.page,device:s.device,view:!!s.view,gameActive:!!s.gameActive,mapping:!!s.mapping,modal:s.modal}));}
async function shot(p,side,name){const file=side+'-'+name+'.png';await p.locator(clients[side].shell).screenshot({path:path.join(out,file)});report.screenshots.push(file);}
async function open(side){const p=await browser.newPage({viewport:{width:side==='mac'?1510:1320,height:1050}});p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(side+': '+e.message));await p.goto(url(clients[side].file)+'?lang=zh');return p;}
async function login(p,side){
 if(side==='mobile'){
  assert.equal(await p.locator('#mobile-agreement').isChecked(),false);
  assert.match(await p.locator('.mobile-independent-shell').innerText(),/中国移动认证服务协议/);
  await p.locator('#mobile-phone').fill('13600008000');await click(p,'mobile-sms');await p.locator('#mobile-code').fill('123456');
  await click(p,'mobile-login-submit');assert.equal(await p.evaluate(()=>mobileAuth.loggedIn),false);
  await p.locator('#mobile-agreement').check();await click(p,'mobile-login-submit');
 }else{
  assert.equal(await p.locator('#sr-consent').isChecked(),false);
  assert.doesNotMatch(await p.locator('.sr-consent').innerText(),/中国移动认证服务协议/);
  await p.locator('#sr-credential').fill('13600008000');await click(p,'sr-send-code');await p.locator('#sr-code').fill('123456');
  await p.locator('#sr-account-form button[type=submit]').click();assert.equal(await p.evaluate(()=>standaloneMac.signed),false);
  await p.locator('#sr-consent').check();await p.locator('#sr-account-form button[type=submit]').click();
  if(await p.locator('.sr-first-guide').count())await click(p,'sr-onboard-skip');
 }
 await p.waitForFunction(()=>s.page==='list');
 assert.deepEqual(await p.evaluate(()=>devices.map(d=>({id:d.id,online:d.online,busy:!!d.busy,blocked:!!d.blocked}))),[
  {id:'win',online:true,busy:false,blocked:false},{id:'work',online:true,busy:true,blocked:false},{id:'phone',online:true,busy:false,blocked:false},{id:'mac',online:false,busy:false,blocked:true},{id:'off',online:false,busy:false,blocked:false}
 ]);
 report.checks.push(side+'：自然验证码登录与未勾协议拦截；默认设备在线/忙/离线/禁控不被AI办公改写');
}
async function noLegacy(p,side){
 const actions=['gpt-game-launch:gamehub','gpt-game-launch:steam','quick-open:gamehub','quick-open:steam','virtual-key-layout','mapping-plan','mapping-layout','toggle:mapping','toggle:virtualPad','rlc:open','rlc:new','rlc:publish','mode:game','state:game'];
 const baseline=await state(p);
 for(const action of actions){await invoke(p,action);await p.waitForTimeout(20);assert.equal((await state(p)).gameActive,false,side+' old action '+action);assert.equal((await state(p)).page,baseline.page,side+' old action changed page '+action);assert.equal(await p.locator('.rlc-overlay,.rlc-game-keys').count(),0,side+' layout opened by '+action);}
 assert.equal(await p.locator('[data-action^="gpt-game-launch:"],[data-action="virtual-key-layout"],[data-action="mapping-plan"],[data-action="mode:game"],[data-action="state:game"]').count(),0);
 report.checks.push(side+'：游戏/虚拟按键/布局/云分享旧action与评审入口不可达');
}
async function run(name,fn){try{await fn();}catch(e){report.errors.push(name+': '+e.stack);}}

async function macFlow(p){
 await login(p,'mac');await click(p,'mac-account');const uid=await p.locator('.mac-account-popover small').innerText();assert.match(uid,/^UID · \d{9}$/);await click(p,'mac-account');
 await noLegacy(p,'mac');
 await click(p,'rom:sessions');assert.equal((await state(p)).page,'office-sessions');assert((await p.locator('.rom-session-card').count())>0);assert.equal(await p.locator('#rom-compose').count(),0);await shot(p,'mac','ai-sessions');
 await click(p,'rom:open:win-codex');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator('.rom-screen').getAttribute('data-capture'),'codex');assert.match(await p.locator('.rom-remote-thread').innerText(),/远程工作台原型/);await shot(p,'mac','remote-codex');
 const message='V413 远端窗口验收 <文本>';await p.locator('#rom-compose').fill(message);await click(p,'rom:send');assert((await p.locator('.rom-transcript').innerText()).includes(message));
 for(const capture of ['desktop','browser','editor','codex']){await click(p,'rom:picker');await click(p,'rom:capture:'+capture);assert.equal(await p.locator('.rom-screen').getAttribute('data-capture'),capture);}
 assert((await p.locator('.rom-transcript').innerText()).includes(message));await shot(p,'mac','capture-switch');
 await invoke(p,'toggle-view');assert.equal((await state(p)).view,true);assert.equal(await p.locator('#rom-compose').getAttribute('readonly'),'');assert(await p.locator('[data-action="rom:send"]').isDisabled());
 const before=await p.evaluate(()=>RemoteOfficeMac.snapshot());for(const action of ['rom:send','rom:close-window','rom:desktop-app:browser'])await invoke(p,action);assert.deepEqual(await p.evaluate(()=>RemoteOfficeMac.snapshot()),before);await shot(p,'mac','view-only');await invoke(p,'toggle-view');
 await click(p,'rom:close-window');assert.match(await p.locator('.rom-unavailable').innerText(),/窗口已关闭或不可用/);await click(p,'rom:capture:desktop');await click(p,'rom:desktop-app:codex');assert.equal(await p.locator('.rom-desktop [data-remote-app="codex"]').count(),1);
 await invoke(p,'rom:no-windows');assert.match(await p.locator('.rom-empty-windows').innerText(),/暂无打开/);await invoke(p,'rom:restore-windows');await click(p,'rom:picker-close');await click(p,'exit');assert.equal((await state(p)).page,'office-sessions');
 report.checks.push('mac：AI卡定位远端APP会话；远端输入、全桌面/单窗口动态切换保留内容；观看禁写；窗口关闭/空窗口恢复；退出回AI来源');
 await click(p,'rom:open:mac-claude');assert.equal((await state(p)).page,'office-sessions');assert.match(await p.locator('.rom-inline-notice').innerText(),/离线/);
 await p.evaluate(()=>{devices.find(d=>d.id==='win').blocked=true;});await click(p,'rom:open:win-codex');assert.equal((await state(p)).page,'office-sessions');assert.match(await p.locator('.rom-inline-notice').innerText(),/未允许|权限/);await p.evaluate(()=>{devices.find(d=>d.id==='win').blocked=false;});
 await click(p,'rom:open:work-codex');assert.equal((await state(p)).modal,'takeover');await click(p,'cancel');assert.equal((await state(p)).page,'office-sessions');assert.equal(await p.evaluate(()=>devices.find(d=>d.id==='work').busy),true);
 await click(p,'rom:open:work-codex');await click(p,'takeover-confirm');await p.waitForFunction(()=>s.page==='session'&&!s.modal);await click(p,'exit');assert.equal((await state(p)).page,'office-sessions');
 await click(p,'rom:devices');await click(p,'device:win');await click(p,'connect');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator('.rom-screen').getAttribute('data-capture'),'desktop');await click(p,'exit');assert.equal((await state(p)).page,'detail');
 await shot(p,'mac','detail-office');report.checks.push('mac：离线/禁控拦截；占用取消不接管、确认后定位；设备详情进入默认全桌面并返回详情');
 return uid;
}
async function mobileFlow(p){
 await login(p,'mobile');await click(p,'mobile-tab:profile');const uid=await p.locator('.personal-account-card p').innerText();assert.match(uid,/^UID · \d{9}$/);await click(p,'mobile-tab:devices');await noLegacy(p,'mobile');
 assert.match(await p.locator('.office-review-note').innerText(),/手机原生对话（待继续技术调研，方案待确定）/);
 await click(p,'mobile-tab:ai');assert.equal((await state(p)).page,'office-ai');assert((await p.locator('.office-session-main').count())>0);await shot(p,'mobile','ai-sessions');
 await click(p,'office-thread:win:codex:plan');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator('.office-stream').getAttribute('data-capture'),'codex');assert.equal(await p.locator('.office-native-workspace').count(),0);assert.match(await p.locator('.office-app-main h3').innerText(),/梳理项目实现方案/);await shot(p,'mobile','remote-codex');
 const remoteMessage='V413 远端应用消息 <内容>';await p.locator('#office-remote-input').fill(remoteMessage);await click(p,'office-send');assert.equal(await p.locator('.office-remote-scroll p').filter({hasText:remoteMessage}).count(),1);
 for(const capture of ['desktop','browser','notes','codex']){await click(p,'office-capture-panel');await p.locator('.office-capture-panel [data-action="office-capture:'+capture+'"]').click();assert.equal(await p.locator('.office-stream').getAttribute('data-capture'),capture);}
 assert((await p.locator('.office-remote-scroll').innerText()).includes(remoteMessage));await shot(p,'mobile','capture-switch');
 await invoke(p,'toggle-view');assert.equal((await state(p)).view,true);assert.equal(await p.locator('#office-remote-input').getAttribute('readonly'),'');assert(await p.locator('[data-action="office-send"]').isDisabled());
 const readonly=await p.evaluate(()=>RemoteOfficeMobile.snapshot().state.devices);for(const action of ['office-send','office-close-window','office-open-app:browser','office-browser:1'])await invoke(p,action);assert.deepEqual(await p.evaluate(()=>RemoteOfficeMobile.snapshot().state.devices),readonly);await shot(p,'mobile','view-only');await invoke(p,'toggle-view');
 await mobileToolFlow(p);
 await click(p,'office-close-window');assert.match(await p.locator('.office-unavailable').innerText(),/窗口不可用/);await click(p,'office-desktop');await click(p,'office-open-app:codex');assert.equal(await p.locator('.office-stream').getAttribute('data-capture'),'codex');await click(p,'office-back');assert.equal((await state(p)).page,'office-ai');
 report.checks.push('mobile：默认会话卡定位远端APP；远端窗口输入和动态捕获切换保留消息；观看禁写；关闭窗口恢复；返回AI来源');
 await click(p,'office-native:win:codex:plan');assert.equal((await state(p)).page,'office-native');assert.equal(await p.locator('.office-stream').count(),0);const nativeMessage='V413 手机原生研究消息';await p.locator('#office-native-input').fill(nativeMessage);await click(p,'office-native-send');assert.equal(await p.locator('.office-native-message p').filter({hasText:nativeMessage}).count(),1);await click(p,'office-native-history');assert.match(await p.locator('.office-native-history').innerText(),/我的 Windows 电脑.*Codex/s);await click(p,'office-native-select:plan');assert.equal(await p.locator('.office-native-history').count(),0);await shot(p,'mobile','native-research');
 await click(p,'office-native-stream');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert((await p.locator('.office-remote-scroll').innerText()).includes(nativeMessage));await click(p,'office-back');assert.equal((await state(p)).page,'office-native');await click(p,'office-back');assert.equal((await state(p)).page,'office-ai');
 report.checks.push('mobile：手机原生研究入口独立可操作，发送不重复、按电脑/应用切历史、转串流及逐级返回；外部保留技术调研标记');
 await click(p,'office-thread:mac:codex:plan');assert.equal((await state(p)).page,'office-ai');assert.match(await p.locator('.office-notice').innerText(),/离线/);
 await p.evaluate(()=>{devices.find(d=>d.id==='win').blocked=true;});await click(p,'office-thread:win:codex:plan');assert.equal((await state(p)).page,'office-ai');assert.match(await p.locator('.office-notice').innerText(),/不允许|权限/);await p.evaluate(()=>{devices.find(d=>d.id==='win').blocked=false;});
 await click(p,'office-thread:work:codex:plan');assert.equal((await state(p)).modal,'takeover');await click(p,'cancel');assert.equal((await state(p)).page,'office-ai');assert.equal(await p.evaluate(()=>devices.find(d=>d.id==='work').busy),true);
 await click(p,'office-thread:work:codex:plan');await click(p,'takeover-confirm');await p.waitForFunction(()=>s.page==='session'&&!s.modal);await click(p,'office-back');assert.equal((await state(p)).page,'office-ai');
 await click(p,'mobile-tab:devices');await click(p,'device:win');await click(p,'connect');await p.waitForFunction(()=>s.page==='session'&&!s.modal);assert.equal(await p.locator('.office-stream').getAttribute('data-capture'),'desktop');await click(p,'office-back');assert.equal((await state(p)).page,'detail');await shot(p,'mobile','detail-office');
 report.checks.push('mobile：离线/禁控拦截，占用取消和确认分支，设备详情默认全桌面并返回详情');
 await invoke(p,'mobile-tab:profile');await click(p,'mobile-logout');await click(p,'remote-logout:confirm');await p.locator('#mobile-phone').fill('13900009000');await click(p,'mobile-sms');await p.locator('#mobile-code').fill('123456');await p.locator('#mobile-agreement').check();await click(p,'mobile-login-submit');await click(p,'mobile-tab:ai');await click(p,'office-native:win:codex:plan');assert(!(await p.locator('.office-native-messages').innerText()).includes(nativeMessage));assert(!(await p.locator('.office-native-messages').innerText()).includes(remoteMessage));
 report.checks.push('mobile：退出后换账号，不继承上一账号远端/原生演示消息');return uid;
}
async function mobileToolFlow(p){
 const data=await p.evaluate(()=>RemoteOfficeMobile.snapshot().state.devices);
 assert.equal(await p.locator('.office-floating-tools').count(),1);assert.equal(await p.locator('.office-floating-menu').count(),0);assert.equal(await p.locator('.office-stream-toolbar').count(),0);
 await click(p,'office-float-toggle');assert.equal(await p.locator('.office-float-toggle').getAttribute('aria-expanded'),'true');assert.equal(await p.locator('.office-floating-menu button').count(),5);assert.deepEqual(await p.evaluate(()=>RemoteOfficeMobile.snapshot().state.devices),data);await shot(p,'mobile','floating-expanded');
 for(const selector of ['.office-stream-head [data-action="office-back"]','.office-stream-head [data-action="office-capture-panel"]','[data-action="office-send"]','.office-app-titlebar [data-action="office-close-window"]'])await p.locator(selector).click({trial:true,timeout:2500});
 await click(p,'office-float-toggle');assert.equal(await p.locator('.office-floating-menu').count(),0);assert.deepEqual(await p.evaluate(()=>RemoteOfficeMobile.snapshot().state.devices),data);
 await click(p,'office-float-toggle');await p.locator('.office-floating-menu [data-action="panel:keyboard"]').click();assert.equal(await p.evaluate(()=>s.panel),'keyboard');assert.equal(await p.locator('.office-floating-menu').count(),0);await click(p,'panel-close');
 await click(p,'office-float-toggle');await p.locator('.office-floating-menu [data-action="office-capture-panel"]').click();assert.equal(await p.locator('.office-capture-panel').count(),1);await p.locator('.office-capture-panel [data-action="office-capture-panel"]').click();
 await click(p,'office-float-toggle');await p.locator('.office-floating-menu [data-action="panel:operation"]').click();assert.equal(await p.evaluate(()=>s.panel),'operation');await click(p,'panel-close');assert.deepEqual(await p.evaluate(()=>RemoteOfficeMobile.snapshot().state.devices),data);await shot(p,'mobile','floating-collapsed');
 report.checks.push('mobile：悬浮工具真实展开/收起，键盘/窗口/操作可打开；远端数据未被穿透修改，返回/切换/发送/关窗核心按钮可点击');
}
async function main(){
 if(process.env.OFFICE_TEST_SIDE==='mac'){const p=await open('mac');try{await macFlow(p);}finally{await p.close();}return;}
 const ids={};for(const side of ['mobile','mac']){if(process.env.OFFICE_TEST_SIDE&&process.env.OFFICE_TEST_SIDE!==side)continue;await run(side,async()=>{const p=await open(side);try{ids[side]=await (side==='mobile'?mobileFlow(p):macFlow(p));}catch(error){await shot(p,side,'failure').catch(()=>{});throw error;}finally{await p.close();}});}if(ids.mobile&&ids.mac){assert.equal(ids.mobile,ids.mac);report.checks.push('双端自然登录同一账号，昵称下方UID一致');}
}
(async()=>{fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});await main();assert.deepEqual(report.errors,[]);report.pass=true;})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();fs.writeFileSync(path.join(out,'office-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});
