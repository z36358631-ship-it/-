const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const url='file:///'+path.join(__dirname,'mac.html').replaceAll('\\','/'),errors=[],checks=[];
 try{
  for(const [method,dismiss] of [['phone','skip'],['email','close'],['qr','complete'],['google','escape']]){
   const context=await browser.newContext({viewport:{width:1510,height:1020}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   const act=a=>page.evaluate(a=>action(a),a);
   await page.goto(url);await page.evaluate(()=>{localStorage.setItem('standalone-remote-mac-onboarding-v1','seen');localStorage.removeItem('standalone-remote-mac-postlogin-onboarding-v2');});await page.reload();
   assert.equal(await page.locator('.sr-first-guide').count(),0);assert.equal(await page.locator('[data-action=sr-onboard-review]').count(),0);await act('sr-onboard-review');assert.equal(await page.locator('.sr-first-guide').count(),0);
   const login=async()=>{
    await act('sr-open-login');if(['email','google'].includes(method))await act('sr-region:overseas');
    assert.equal(await page.locator('.sr-first-guide').count(),0);await page.locator('#sr-consent').check();
    if(method==='qr'){
     const id=await page.evaluate(()=>standaloneMac.challenge.id);await act('sr-qr-scan:'+id);assert.equal(await page.locator('.sr-first-guide').count(),0);await act('sr-qr-confirm:'+id);assert.equal(await page.locator('.sr-first-guide').count(),0);await act('sr-qr-success:'+id);
    }else if(method==='google'){
     await act('sr-google');assert.equal(await page.locator('.sr-first-guide').count(),0);const id=await page.evaluate(()=>standaloneMac.googleRequest.id);await act('sr-google-success:'+id);
    }else{
     await act('sr-fill');await act('sr-send-code');await page.locator('#sr-code').fill('000000');await page.locator('#sr-account-form button[type=submit]').click();assert.equal(await page.locator('.sr-first-guide').count(),0);await page.locator('#sr-code').fill('123456');await page.locator('#sr-account-form button[type=submit]').click();
    }
   };
   await login();assert.equal(await page.evaluate(()=>standaloneMac.signed),true);assert.equal(await page.locator('.sr-first-guide').count(),1);assert.equal(await page.locator('.sr-first-guide .primary').innerText(),'知道了');
   assert.deepEqual(await page.evaluate(()=>({allowed:remoteMacPrefs().allowSameAccount,screen:standaloneMac.permission.screen,input:standaloneMac.permission.input,connected:s.macConnected})),{allowed:false,screen:false,input:false,connected:false});
   if(dismiss==='close')await page.getByRole('button',{name:'关闭新手引导',exact:true}).click();else if(dismiss==='escape')await page.keyboard.press('Escape');else await act(dismiss==='skip'?'sr-onboard-skip':'sr-onboard-start');
   assert.equal(await page.locator('.sr-first-guide').count(),0);assert.equal(await page.evaluate(()=>s.page),'list');assert.equal(await page.evaluate(()=>standaloneMac.signed),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('standalone-remote-mac-postlogin-onboarding-v2')),'seen');
   await act('sr-logout');assert.equal(await page.locator('.sr-first-guide').count(),0);await login();assert.equal(await page.locator('.sr-first-guide').count(),0);
   await page.reload();assert.equal(await page.locator('.sr-first-guide').count(),0);await login();assert.equal(await page.locator('.sr-first-guide').count(),0);
   await act('sr-onboard-review');assert.equal(await page.locator('.sr-first-guide').count(),1);await act('sr-onboard-start');assert.equal(await page.locator('.sr-workspace').count(),1);
   checks.push(method+'：成功后首次引导/'+dismiss+'/退出与刷新后记忆/仅登录可重看/无自动被控');await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
