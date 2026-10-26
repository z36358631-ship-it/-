const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base='file:///'+path.join(__dirname,'mac.html').replaceAll('\\','/');
 const act=a=>page.evaluate(a=>action(a),a);
 const id=()=>page.evaluate(()=>standaloneMac.challenge.id);
 const state=key=>page.evaluate(key=>RemoteQrDemo.get(key)?.state,key);
 try{
  for(const screen of ['welcome','login'])for(const region of ['domestic','overseas']){
   await page.goto(base+'?state='+screen+'&region='+region);
   assert.equal(await page.locator('.sr-scannable-qr svg').count(),1);
   assert.equal(await page.locator('#sr-consent').isChecked(),false);
   assert.equal(await page.locator('.mac-account-entry,.mac-more-entry,.personal-dropdown').count(),0);
   const download=page.getByRole('link',{name:'盖世游戏 App 官网下载'});
   assert.equal(await download.getAttribute('href'),'https://gamehub.xiaoji.com/'+(region==='overseas'?'en/':'zh-cn/'));
   const before=await id();assert.equal(await state(before),'blocked');
   await act('sr-qr-scan:'+before);await act('sr-qr-confirm:'+before);await act('sr-qr-success:'+before);
   assert.equal(await page.evaluate(()=>standaloneMac.signed),false);
   await page.locator('#sr-consent').check();const current=await id();assert.notEqual(current,before);assert.equal(await state(before),'cancelled');
   await act('sr-qr-scan:'+current);await page.locator('#sr-consent').uncheck();assert.equal(await state(current),'cancelled');
   await page.locator('#sr-consent').check();await act('sr-qr-confirm:'+current);await act('sr-qr-success:'+current);assert.equal(await page.evaluate(()=>standaloneMac.signed),false);
   const ok=await id();await act('sr-qr-scan:'+ok);await act('sr-qr-confirm:'+ok);await act('sr-qr-success:'+ok);
   assert.equal(await page.locator('.sr-workspace').count(),1);assert.equal(await page.locator('.mac-account-entry,.mac-more-entry').count(),2);
   await act('mac-more-toggle');await act('sr-logout');assert.equal(await page.locator('.mac-account-entry,.mac-more-entry,.personal-dropdown').count(),0);assert.equal(await page.locator('.sr-scannable-qr svg').count(),1);
   checks.push(screen+'/'+region+'：默认二维码、官网链接、协议门禁/撤回、登录/退出显隐');
  }
  await page.goto(base+'?state=login');await page.locator('#sr-consent').check();let old=await id();await act('sr-region:overseas');assert.equal(await state(old),'cancelled');
  await page.locator('#sr-consent').check();old=await id();await act('sr-welcome');assert.equal(await state(old),'cancelled');
  await page.locator('#sr-consent').check();old=await id();await act('sr-open-login');assert.equal(await state(old),'cancelled');
  const preview=await id();await page.evaluate(key=>{const r=RemoteQrDemo.get(key);r.expiresAt=Date.now()-1;localStorage.setItem(RemoteQrDemo.prefix+key,JSON.stringify(r));macObserveDemoQr();},preview);
  assert.equal(await page.locator('[data-qr-state=expired]').count(),1);await act('sr-qr-refresh');assert.equal(await page.locator('.sr-scannable-qr svg').count(),1);assert.equal(await state(await id()),'blocked');
  checks.push('切区、首页/登录页切换、展示码过期及未勾协议刷新');
  await page.goto(base+'?state=login');await page.locator('#sr-consent').check();await page.locator('#sr-credential').fill('13800138000');
  const qrAccount=await id();await page.evaluate(key=>{RemoteQrDemo.update(key,'confirmed','139****9000');macObserveDemoQr();},qrAccount);
  assert.equal(await page.evaluate(()=>standaloneMac.accountIdentity),'139****9000');assert.equal(await state(qrAccount),'completed');
  await page.goto(base+'?state=login');await page.locator('#sr-consent').check();const unused=await id();await act('sr-fill');await act('sr-send-code');await page.locator('#sr-code').fill('123456');await page.locator('#sr-account-form button[type=submit]').click();assert.equal(await state(unused),'cancelled');
  checks.push('扫码使用手机确认账号，不采纳未提交的手机号；验证码登录取消旧二维码');
  for(const screen of ['welcome','login']){
   await page.goto(base+'?state='+screen);
   await page.locator('.sr-client').screenshot({path:path.join(__dirname,'assets','resume-desktop-'+screen+'.png')});
   const overflow=await page.locator('.sr-client').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false);
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,'login-resume-test-report.json'),JSON.stringify({pass:true,checks,errors},null,2));console.log(JSON.stringify({pass:true,checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
