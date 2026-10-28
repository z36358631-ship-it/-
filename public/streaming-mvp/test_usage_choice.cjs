const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.USAGE_TEST_OUT||path.join(__dirname,'review/v413/usage-choice-local');
fs.mkdirSync(out,{recursive:true});
const report={pass:false,checks:[],errors:[],scope:'Demo 登录后场景分流，不验证真实授权服务'};
const click=(p,a)=>p.locator('[data-action="'+a+'"]').first().click();
const pageState=p=>p.evaluate(()=>s.page);
async function authenticate(p,side,method){
 const overseas=['email','google'].includes(method);
 if(side==='mobile'){
  await p.locator('#mobile-agreement').check();
  if(['google','app'].includes(method)){await click(p,method==='google'?'mobile-google-open':'mobile-gamehub-open');await click(p,'mobile-auth-confirm');}
  else{await p.locator(overseas?'#mobile-email':'#mobile-phone').fill(overseas?'player@example.com':'13600008000');await click(p,'mobile-sms');await p.locator('#mobile-code').fill('987654');await click(p,'mobile-login-submit');}
 }else{
  await p.locator('#sr-consent').check();
  if(method==='google'){await click(p,'sr-google');await p.locator('[data-action^="sr-google-success:"]').click();}
  else if(method==='qr'){await p.locator('[data-action^="sr-qr-scan:"]').click();await p.locator('[data-action^="sr-qr-confirm:"]').click();await p.locator('[data-action^="sr-qr-success:"]').click();}
  else{await p.locator('#sr-credential').fill(overseas?'player@example.com':'13600008000');await click(p,'sr-send-code');await p.locator('#sr-code').fill('000000');await p.locator('#sr-account-form button[type=submit]').click();}
 }
 await p.waitForFunction(()=>s.page==='usage-choice');
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 for(const side of ['mobile','mac'])for(const [index,method] of (side==='mobile'?['phone','email','google','app']:['phone','email','google','qr']).entries()){
  const p=await browser.newPage({viewport:{width:side==='mobile'?390:1510,height:1050}});p.on('pageerror',e=>report.errors.push(e.message));p.setDefaultTimeout(10000);
  try{
   const base=process.env.REMOTE_BASE_URL||'file:///'+__dirname.replaceAll('\\','/');
   await p.goto(base+'/'+side+'.html?lang=zh&region='+(['email','google'].includes(method)?'overseas':'domestic'));
   assert.equal(await p.locator('.usage-choice').count(),0);
   await authenticate(p,side,method);assert.equal(await p.locator('.sr-first-guide').count(),0);
   assert.equal(await p.locator('.usage-choice-options>button').count(),2);
   await p.locator('[data-remote-language="en"]').click();await p.waitForFunction(()=>document.querySelector('.usage-choice h1')?.textContent.includes('How will'));
   assert.equal(await pageState(p),'usage-choice');
   await p.locator('[data-remote-language="zh"]').click();await p.waitForFunction(()=>document.querySelector('.usage-choice h1')?.textContent.includes('如何'));
   const choice=index%2?'other':'office',target=choice==='other'?'list':side==='mobile'?'office-ai':'office-sessions';
   await click(p,'usage-choice:'+choice);assert.equal(await pageState(p),target);
   if(side==='mac'){assert.equal(await p.locator('.sr-first-guide').count(),1);await click(p,'sr-onboard-skip');assert.equal(await pageState(p),target);}
   await click(p,side==='mobile'?'mobile-tab:devices':'rom:devices');assert.equal(await pageState(p),'list');
   await click(p,side==='mobile'?'mobile-tab:ai':'rom:sessions');assert.equal(await pageState(p),side==='mobile'?'office-ai':'office-sessions');
   assert.equal(await p.locator('.usage-choice').count(),0);
   if(method==='phone'){
    await p.evaluate(side=>action(side==='mobile'?'mobile-logout':'sr-logout'),side);await click(p,'remote-logout:confirm');
    await authenticate(p,side,method);await click(p,'usage-choice:other');assert.equal(await pageState(p),'list');assert.equal(await p.locator('.sr-first-guide').count(),0);
   }
   report.checks.push(side+' '+method+'：登录前无选择、登录后询问、中英切换、'+choice+'分流、Tab互换'+(method==='phone'?'、退出重登重新询问':''));
  }catch(e){report.errors.push(side+' '+method+': '+e.stack);}finally{await p.close();}
 }
 }finally{await browser.close();report.pass=!report.errors.length;fs.writeFileSync(path.join(out,'usage-choice-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;}
})();
