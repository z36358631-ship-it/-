const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.ACCOUNT_TEST_OUT||path.join(__dirname,'review/prd-v422/account');
const report={pass:false,checks:[],errors:[]};
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 for(const side of ['mobile','mac']){
  const p=await b.newPage({viewport:{width:1500,height:1150}});p.on('pageerror',e=>report.errors.push(side+': '+e.message));
  const base=process.env.REMOTE_BASE_URL?process.env.REMOTE_BASE_URL+'/'+side+'.html':pathToFileURL(path.join(__dirname,side+'.html')).href;
  const entry=side==='mobile'?'profile':'remote-settings';
  const invoke=async a=>p.evaluate(a=>action(a),a);
  const click=async a=>p.locator('[data-action="'+a+'"]').first().click();
  const signed=()=>p.evaluate(h=>h==='mobile'?mobileAuth.loggedIn:standaloneMac.signed,side);
  const shot=async name=>p.locator(side==='mobile'?'.mobile-independent-shell':'.sr-client').screenshot({path:path.join(out,side+'-'+name+'.png'),animations:'disabled'});
  await p.goto(base+'?state='+entry+'&v=v422');
  assert(await signed());assert.equal(await p.locator('.personal-notification-settings [role=switch]').count(),1);
  await shot('settings');report.checks.push(side+':设置消息通知开关');
  if(side==='mac')await click('mac-account');
  assert.equal(await p.locator('[data-action="'+side+'-account:delete"]').count(),1);await shot('account');
  await click(side+'-account:delete');assert.equal(await p.locator('.remote-delete-dialog').count(),1);assert(await signed());
  assert.equal(await p.locator('.remote-delete-dialog h2').innerText(),'注销账号？');await shot('delete-confirm');
  await click('remote-delete:cancel');assert(await signed());assert.equal(await p.locator('.remote-delete-dialog').count(),0);
  await click(side+'-account:delete');await p.keyboard.press('Escape');assert(await signed());assert.equal(await p.locator('.remote-delete-dialog').count(),0);
  report.checks.push(side+':注销确认文案、取消和Esc不注销');
  await click(side+'-account:delete');await p.evaluate(h=>{if(h==='mobile')mobileAuth.generation++;else standaloneMac.generation++;},side);await invoke('remote-delete:confirm');assert(await signed());assert.equal(await p.locator('.remote-delete-dialog').count(),0);
  report.checks.push(side+':过期登录代次确认不执行');
  if(side==='mac'&&!await p.locator('[data-action="mac-account:delete"]').count())await click('mac-account');
  await click(side+'-account:delete');await click('remote-delete:confirm');assert(!await signed());assert.equal(await p.locator('.remote-delete-dialog').count(),0);
  assert.equal(await p.locator(side==='mobile'?'#mobile-phone':'#sr-credential').count(),1);
  const state=await p.evaluate(()=>({notification:RemoteNotifications.snapshot(),draft:s.textDraft,files:s.files}));assert.equal(state.notification.owner,'');assert.equal(state.notification.push,null);assert(!state.draft);assert.equal(state.files.length,0);await shot('deleted-login');
  await invoke('remote-delete:confirm');assert(!await signed());await invoke(side+'-account:delete');await invoke(side+'-support:cancel-account');assert.equal(await p.locator('.remote-delete-dialog').count(),0);
  report.checks.push(side+':确认清账号态返回登录，重复和未登录调用不执行');
  await p.goto(base+'?state='+entry+'&lang=en&v=v422');if(side==='mac')await click('mac-account');await click(side+'-account:delete');assert.equal(await p.locator('.remote-delete-dialog h2').innerText(),'Delete your account?');await shot('delete-en');
  await click('remote-delete:cancel');await invoke(side+'-support:about');assert.equal(await p.locator('[data-action="'+side+'-support:cancel-account"]').count(),0);
  report.checks.push(side+':英文注销确认及关于移除重复入口');
  await p.close();
 }
 assert.equal(report.errors.length,0);report.pass=true;
 }catch(e){report.errors.push(e.stack);process.exitCode=1;}finally{await b.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
