const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const output=path.join(__dirname,'review','v47');fs.mkdirSync(output,{recursive:true});
const report={pass:false,checks:[],errors:[],screenshots:[],scanSource:'浏览器截图解码 Mac 实际二维码；同源双标签 localStorage 演示桥，无真实账号服务'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);if(!['mac.html','mobile.html'].includes(name)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,name)));});
let browser;
async function shot(page,selector,name){const filename='consent-'+name+'.png';await page.locator(selector).screenshot({path:path.join(output,filename)});report.screenshots.push(filename);}
function watch(page){page.on('pageerror',error=>report.errors.push(error.message));page.setDefaultTimeout(12000);}
async function click(page,action){await page.locator('[data-action="'+action+'"]').first().click();}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const region of ['domestic','overseas']){
  const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage();watch(page);
  await page.goto(base+'/mac.html?region='+region);
  assert.equal(await page.locator('#sr-consent').isChecked(),false);assert.equal(await page.locator('.sr-first-guide').count(),0);
  await page.locator('#sr-credential').fill(region==='domestic'?'13800138000':'demo@gamehub.test');
  assert.equal(await page.locator('[data-action=sr-send-code]').isEnabled(),true);await click(page,'sr-send-code');await page.locator('#sr-code').fill('123456');
  assert.equal(await page.locator('.sr-submit').isEnabled(),true);await page.locator('.sr-submit').click();
  assert.equal(await page.locator('.sr-login-error').innerText(),'请先勾选协议');assert.equal(await page.evaluate(()=>standaloneMac.signed),false);
  await shot(page,'.sr-client','mac-'+region+'-submit-blocked');
  if(region==='overseas'){assert.equal(await page.locator('[data-action=sr-google]').isEnabled(),true);await click(page,'sr-google');assert.equal(await page.locator('.sr-login-error').innerText(),'请先勾选协议');assert.equal(await page.evaluate(()=>standaloneMac.google),'idle');assert.equal(await page.evaluate(()=>standaloneMac.googleRequest),null);}
  const sent=await page.evaluate(()=>standaloneMac.sent),id=await page.evaluate(()=>standaloneMac.challenge.id);
  await page.locator('#sr-consent').check();assert.deepEqual(await page.evaluate(()=>standaloneMac.sent),sent);assert.equal(await page.locator('#sr-code').inputValue(),'123456');assert.equal(await page.evaluate(()=>standaloneMac.challenge.id),id);
  await page.locator('.sr-submit').click();assert.equal(await page.evaluate(()=>standaloneMac.signed),true);assert.equal(await page.locator('.sr-first-guide').count(),1);
  report.checks.push('Mac '+region+'：未勾可填/取码/提交精确提示，勾选保留验证码与二维码并成功登录'+(region==='overseas'?'；Google 未勾可点击但不启动授权':''));await context.close();
 }
 for(const region of ['domestic','overseas']){
  const context=await browser.newContext({viewport:{width:1020,height:1100}}),page=await context.newPage();watch(page);await page.goto(base+'/mobile.html?region='+region);
  assert.equal(await page.locator('#mobile-agreement').isChecked(),false);await page.locator(region==='domestic'?'#mobile-phone':'#mobile-email').fill(region==='domestic'?'13800138000':'demo@gamehub.test');
  await click(page,'mobile-sms');assert.equal(await page.evaluate(()=>mobileAuth.sent),true);await page.locator('#mobile-code').fill('123456');await click(page,'mobile-login-submit');
  assert.equal(await page.locator('.mobile-login-error').innerText(),'请先勾选协议');assert.equal(await page.evaluate(()=>mobileAuth.loggedIn),false);await shot(page,'.mobile-independent-shell','mobile-'+region+'-submit-blocked');
  for(const actionName of ['mobile-gamehub-open',...(region==='overseas'?['mobile-google-open']:[])]){assert.equal(await page.locator('[data-action="'+actionName+'"]').isEnabled(),true);await click(page,actionName);assert.equal(await page.locator('.mobile-login-error').innerText(),'请先勾选协议');assert.equal(await page.evaluate(()=>s.page),'login');assert.equal(await page.evaluate(()=>mobileAuth.pending),false);}
  const sentFor=await page.evaluate(()=>mobileAuth.sentFor);await page.locator('#mobile-agreement').check();assert.equal(await page.evaluate(()=>mobileAuth.sent),true);assert.equal(await page.evaluate(()=>mobileAuth.sentFor),sentFor);assert.equal(await page.locator('#mobile-code').inputValue(),'123456');await click(page,'mobile-login-submit');assert.equal(await page.evaluate(()=>mobileAuth.loggedIn),true);
  report.checks.push('移动端 '+region+'：未勾可填/取码/提交精确提示，第三方入口提示且不启动，勾选保留验证码并成功登录');await context.close();
 }
 const context=await browser.newContext({viewport:{width:1600,height:1100}}),mac=await context.newPage(),phone=await context.newPage();watch(mac);watch(phone);
 await mac.goto(base+'/mac.html');await phone.goto(base+'/mobile.html?state=list');
 const scanCurrent=async()=>{
  await phone.evaluate(()=>action('remote-scan-open'));
  const png=await mac.locator('.sr-scannable-qr').screenshot();
  return phone.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,img.width,img.height),decoded=jsQR(pixels.data,pixels.width,pixels.height);if(!decoded)throw new Error('Mac QR screenshot decode failed');remoteScanRead(decoded.data);return JSON.parse(decoded.data);},png.toString('base64'));
 };
 const payload=await scanCurrent();await mac.waitForFunction(()=>standaloneMac.qr==='pending');assert.equal(await phone.evaluate(()=>remoteScanState.phase),'confirm');assert.equal(await mac.evaluate(()=>standaloneMac.consent),false);
 await click(phone,'remote-scan-confirm');assert.equal(await phone.locator('.remote-scan-confirm .remote-scan-error').innerText(),'请先勾选协议');assert.equal(await mac.evaluate(()=>standaloneMac.signed),false);assert.equal(await phone.evaluate(id=>RemoteQrDemo.get(id).state,payload.id),'scanned');
 await shot(phone,'.mobile-independent-shell','scan-confirm-blocked');await shot(mac,'.sr-client','mac-unchecked-scanned');
 await mac.locator('#sr-consent').check();assert.equal(await mac.evaluate(()=>standaloneMac.challenge.id),payload.id);await phone.waitForFunction(id=>RemoteQrDemo.get(id).consent,payload.id);await click(phone,'remote-scan-confirm');await mac.waitForFunction(()=>standaloneMac.signed);
 assert.equal(await phone.evaluate(()=>remoteScanState.phase),'done');assert.equal(await phone.evaluate(id=>RemoteQrDemo.get(id).state,payload.id),'completed');assert.equal(await mac.locator('.sr-first-guide').count(),1);await shot(mac,'.sr-client','mac-scanned-login-guide');
 report.checks.push('同源双标签：解码实际 Mac 二维码→未勾可扫码到确认→精确提示/不能登录→Mac 勾选同码→手机再次确认→Mac 登录后指引');
 await mac.goto(base+'/mac.html');await mac.locator('#sr-consent').check();await phone.evaluate(()=>action('remote-scan-done'));const old=await scanCurrent();await mac.waitForFunction(()=>standaloneMac.qr==='pending');await mac.locator('#sr-consent').uncheck();
 const next=await mac.evaluate(()=>standaloneMac.challenge.id);assert.notEqual(next,old.id);assert.equal(await mac.evaluate(id=>RemoteQrDemo.get(id).state,old.id),'cancelled');assert.equal(await mac.evaluate(()=>RemoteQrDemo.get(standaloneMac.challenge.id).state),'waiting');assert.equal(await mac.evaluate(()=>RemoteQrDemo.get(standaloneMac.challenge.id).consent),false);
 await phone.waitForFunction(()=>remoteScanState.phase==='error');assert.match(await phone.locator('.remote-scan-error').innerText(),/二维码已失效/);assert.equal(await phone.evaluate(id=>RemoteQrDemo.update(id,'confirmed'),old.id),null);await mac.locator('#sr-consent').check();assert.equal(await mac.evaluate(()=>standaloneMac.signed),false);await shot(phone,'.mobile-independent-shell','revoked-qr-rejected');
 report.checks.push('撤勾使已扫码旧码 cancelled，手机显示失效；新码 waiting/consent=false，旧码不能确认，重新勾选不自动登录');
 await context.close();assert.deepEqual(report.errors,[]);report.pass=true;
})().catch(error=>{report.failure=error.stack;process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(output,'consent-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});
