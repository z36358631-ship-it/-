const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname,out=process.env.DOMESTIC_TEST_OUT||path.join(root,'review/prd-v421/domestic');
const report={pass:false,checks:[],errors:[]};
const sel=a=>'[data-action='+JSON.stringify(a)+']';
async function invoke(p,a){await p.evaluate(a=>action(a),a);}
async function check(name,fn){await fn();report.checks.push({name,pass:true});}
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
for(const side of ['mobile','mac']){
 const p=await b.newPage({viewport:{width:1450,height:1150}});p.on('pageerror',e=>report.errors.push(side+': '+e.message));p.setDefaultTimeout(12000);
 const base=process.env.REMOTE_BASE_URL?process.env.REMOTE_BASE_URL.replace(/\/$/,'')+'/'+side+'.html':pathToFileURL(path.join(root,side+'.html')).href;
 const shell=side==='mobile'?'.mobile-independent-shell':'.sr-client';
 const shot=async name=>p.locator(shell).screenshot({path:path.join(out,side+'-'+name+'.png'),animations:'disabled'});
 await p.goto(base+'?region=overseas&lang=zh&v=v421');
 await check(side+' 旧海外链接仍显示国内手机号，地区/Google入口已移除',async()=>{
  assert.equal(await p.evaluate(side=>side==='mobile'?mobileAuth.region:standaloneMac.region,side),'domestic');
  assert.equal(await p.locator('[data-action^="mobile-region:"],[data-action^="sr-region:"],[data-action*="google"],input[type=email]').count(),0);
  assert(!/海外|Google|邮箱|International|Overseas/.test(await p.locator('body').innerText()));
  await shot('login');await p.screenshot({path:path.join(out,side+'-page.png')});
 });
 await check(side+' 英文只切文案，手机号与国内地区保留',async()=>{
  await p.getByRole('button',{name:'English',exact:true}).click();
  assert.equal(await p.evaluate(side=>side==='mobile'?mobileAuth.region:standaloneMac.region,side),'domestic');
  assert.equal(await p.locator(side==='mobile'?'#mobile-phone':'#sr-credential').getAttribute('type'),'tel');
  assert(!/Google|International|Overseas/.test(await p.locator('body').innerText()));await shot('login-en');
  await p.getByRole('button',{name:'中文',exact:true}).click();
 });
 await check(side+' 旧海外二维码不可用于登录',async()=>{
  const parsed=await p.evaluate(()=>RemoteQrDemo.parse(JSON.stringify({kind:'gamehub-remote-login-demo',id:'legacy-overseas-code-1234',region:'overseas'})));
  assert.equal(parsed,null);
 });
 await check(side+' 手机号和任意六位码登录，未勾协议仍拦截',async()=>{
  if(side==='mobile'){
   await p.locator('#mobile-phone').fill('13600008000');await p.locator(sel('mobile-sms')).click();await p.locator('#mobile-code').fill('517329');
   await p.locator(sel('mobile-login-submit')).click();assert((await p.locator(shell).innerText()).includes('请先勾选协议'));
   await p.locator('#mobile-agreement').check();await p.locator(sel('mobile-login-submit')).click();
  }else{
   assert(!(await p.locator(shell).innerText()).includes('中国移动'));
   await p.locator('#sr-credential').fill('13600008000');await p.locator(sel('sr-send-code')).click();await p.locator('#sr-code').fill('517329');
   await p.locator('#sr-account-form button[type=submit]').click();assert((await p.locator(shell).innerText()).includes('请先勾选协议'));
   await p.locator('#sr-consent').check();await p.locator('#sr-account-form button[type=submit]').click();
  }
  await p.waitForFunction(()=>s.page==='usage-choice');await invoke(p,'usage-choice:office');
  if(side==='mac'&&await p.locator('.sr-first-guide').count())await invoke(p,'sr-onboard-skip');
  assert.equal(await p.evaluate(side=>side==='mobile'?mobileAuth.loggedIn:standaloneMac.signed,side),true);
 });
 await check(side+' 帮助只列国内登录渠道',async()=>{
  await invoke(p,side==='mobile'?'mobile-support:help':'mac-support:help');
  assert.equal(await p.evaluate(()=>s.page),'support-help');
  assert.equal(await p.locator('.support-page input').count(),1);await shot('help');
  await invoke(p,side==='mobile'?'mobile-article:login':'mac-article:login');
  const t=await p.locator(shell).innerText();assert(t.includes('支持哪些登录方式'));assert(t.includes('手机号验证码'));assert(!/海外|Google|邮箱/.test(t));await shot('help-login');
  await invoke(p,side==='mobile'?'mobile-article:add':'mac-article:add');await shot('help-article');
 });
 if(side==='mobile'){
  await check('手机盖世 App 授权继续使用国内账号',async()=>{
   await p.goto(base+'?region=overseas&lang=zh');await p.locator('#mobile-agreement').check();await p.locator(sel('mobile-gamehub-open')).click();
   await p.locator(sel('mobile-auth-confirm')).click();await p.waitForFunction(()=>s.page==='usage-choice');
   assert.equal(await p.evaluate(()=>mobileAuth.accountPhone),'13600008000');
  });
 }else{
  await check('电脑扫码保留协议校验和国内登录结果',async()=>{
   await p.goto(base+'?region=overseas&lang=zh');
   await p.locator('[data-action^="sr-qr-scan:"]').click();await p.locator('[data-action^="sr-qr-confirm:"]').click();
   assert.equal(await p.evaluate(()=>standaloneMac.signed),false);assert((await p.locator(shell).innerText()).includes('请先勾选协议'));
   await p.locator('#sr-consent').check();await p.locator('[data-action^="sr-qr-confirm:"]').click();await p.waitForFunction(()=>standaloneMac.signed);
  });
 }
 await p.close();
}
assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.errors.push(e.stack);process.exitCode=1;}finally{await b.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
