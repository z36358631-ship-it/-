const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1100,height:1120},hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const base='file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/');
 const evidence=path.join(__dirname,'mobile-regional-login-evidence');fs.mkdirSync(evidence,{recursive:true});
const click=async a=>{const raw=v=>page.locator('[data-action="'+v+'"]').first().click();if(a.startsWith('device:')&&await page.locator('[data-action="'+a+'"]').count()===0)await raw('mobile-tab:devices');if(a==='mobile-logout'&&await page.locator('[data-action="mobile-logout"]').count()===0)await raw('mobile-tab:profile');return raw(a);};
 const consent=()=>page.locator('#mobile-agreement');
 const state=()=>page.locator('.shell').getAttribute('data-page');
 const shot=name=>page.locator('.mobile-independent-shell').screenshot({path:path.join(evidence,name+'.png')});
 const goto=async(query='')=>{await page.goto(base+query);assert.equal(await state(),'login');};
 const send=async(value)=>{await page.locator('#mobile-phone,#mobile-email').fill(value);await click('mobile-sms');};
 const fillCode=()=>page.locator('#mobile-code').fill('123456');
 const captureCallback=()=>page.evaluate(()=>{window.__mobileOldTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>{if(ms===650)window.__mobileLateCallback=fn;return window.__mobileOldTimeout(fn,ms,...args);};});
 const lateCallback=async()=>{await page.evaluate(()=>window.__mobileLateCallback());await page.waitForTimeout(750);};
 const openApp=async()=>{await consent().check();await click('mobile-gamehub-open');assert.equal(await state(),'gamehub-authorize');};
 try{
  await goto();
  assert.equal(await consent().isChecked(),false);
  assert.equal(await page.locator('#mobile-email,[data-action="mobile-google-open"],.mobile-login-illustration,.app-qr').count(),0);
  assert.equal(await page.locator('.mobile-brand span').innerText(),'盖世远程');
  assert.doesNotMatch(await page.locator('.mobile-login').innerText(),/连接自己的电脑|微信|QQ|密码/);
  const logo=await page.locator('.mobile-brand img').getAttribute('src');
  assert.deepEqual(Buffer.from(logo.split(',')[1],'base64'),fs.readFileSync(path.join(__dirname,'../../demos/logo.svg')));
  await page.locator('.mobile-brand img').evaluate(image=>image.decode());
  await shot('01-domestic-login');
  assert.equal(await page.locator('.mobile-agreement .mobile-protocol-link').count(),3);
  assert.equal(await page.locator('.mobile-independent-shell .mobile-region-tools').count(),0);
  for(const action of ['mobile-sms','mobile-gamehub-open','mobile-login-submit']){await click(action);assert.equal(await state(),'login');assert.match(await page.locator('.mobile-login-error').innerText(),/先阅读并同意/);assert.equal(await page.locator('.toast').count(),0);}
  assert.equal(await page.evaluate(()=>mobileAuth.sent),false);
  for(const [index,name] of ['用户协议','隐私协议','中国移动认证服务协议'].entries()){await click('mobile-protocol:'+index);assert.equal(await page.locator('#mobile-protocol-title').innerText(),name);assert.match(await page.locator('.mobile-protocol-dialog').innerText(),/正式协议待接入/);if(index===2)await shot('02-protocol-preview');await click('mobile-protocol-close');assert.equal(await consent().isChecked(),false);}
  await consent().check();await send('123');assert.match(await page.locator('.mobile-login-error').innerText(),/正确的手机号/);
  await send('13800138000');await fillCode();await consent().uncheck();
  assert.deepEqual(await page.evaluate(()=>({sent:mobileAuth.sent,code:mobileAuth.code,pending:mobileAuth.pending})),{sent:false,code:'',pending:false});
  await consent().check();await fillCode();await click('mobile-login-submit');assert.equal(await state(),'login');assert.match(await page.locator('.mobile-login-error').innerText(),/先获取验证码/);
  await send('13800138000');await page.locator('#mobile-code').fill('111111');await click('mobile-login-submit');assert.match(await page.locator('.mobile-login-error').innerText(),/验证码错误/);
  await fillCode();await click('mobile-login-submit');assert.equal(await state(),'list');await click('mobile-tab:profile');assert.match(await page.locator('.personal-account-card').innerText(),/138\*{4}8000/);await click('mobile-logout');assert.equal(await consent().isChecked(),false);
  await page.evaluate(()=>mobilePreview('not-installed'));await consent().check();await click('mobile-gamehub-open');assert.equal(await state(),'login');assert.match(await page.locator('.mobile-login-error').innerText(),/未安装/);await send('13800138000');await fillCode();await click('mobile-login-submit');assert.equal(await state(),'list');
  await goto();await openApp();await shot('03-app-authorize');await click('mobile-auth-confirm');await page.waitForTimeout(750);assert.equal(await state(),'list');
  await goto();await captureCallback();await openApp();await click('mobile-auth-confirm');await consent().uncheck();await lateCallback();assert.equal(await state(),'gamehub-authorize');assert.equal(await page.evaluate(()=>mobileAuth.loggedIn),false);await click('mobile-auth-confirm');assert.match(await page.locator('.mobile-login-error').innerText(),/先阅读并同意/);await consent().check();await click('mobile-auth-confirm');await page.waitForTimeout(750);assert.equal(await state(),'list');
  await goto();await captureCallback();await openApp();await click('mobile-auth-confirm');await click('mobile-auth-cancel');await lateCallback();assert.equal(await state(),'login');assert.equal(await consent().isChecked(),false);assert.match(await page.locator('.mobile-login-error').innerText(),/取消/);
  await goto();await captureCallback();await openApp();await click('mobile-auth-confirm');await page.evaluate(()=>action('mobile-logout'));await lateCallback();assert.equal(await state(),'login');assert.equal(await consent().isChecked(),false);
  await goto();await page.locator('#mobile-phone').fill('13800138000');await captureCallback();await openApp();await click('mobile-auth-confirm');await click('mobile-region:overseas');await lateCallback();assert.equal(await state(),'login');assert.equal(await page.locator('#mobile-email').inputValue(),'');assert.equal(await consent().isChecked(),false);assert.equal(await page.evaluate(()=>mobileAuth.phone),'');assert.match(page.url(),/region=overseas/);
  assert.equal(await page.locator('#mobile-phone').count(),0);assert.equal(await page.locator('#mobile-email').getAttribute('maxlength'),'254');assert.equal(await page.locator('#mobile-code').getAttribute('maxlength'),'6');assert.equal(await page.locator('.mobile-agreement .mobile-protocol-link').count(),2);assert.equal(await page.locator('[data-action="mobile-google-open"]').count(),1);await shot('04-overseas-login');
  await click('mobile-google-open');assert.equal(await state(),'login');assert.match(await page.locator('.mobile-login-error').innerText(),/先阅读并同意/);
  await consent().check();await send('invalid-email');assert.match(await page.locator('.mobile-login-error').innerText(),/正确的邮箱/);await send('player@example.com');await fillCode();await consent().uncheck();await consent().check();await fillCode();await click('mobile-login-submit');assert.match(await page.locator('.mobile-login-error').innerText(),/先获取验证码/);
  await send('player@example.com');await fillCode();await click('mobile-login-submit');assert.equal(await state(),'list');await click('mobile-tab:profile');assert.match(await page.locator('.personal-account-card').innerText(),/pl\*{3}@example.com/);await click('mobile-logout');
  await consent().check();await click('mobile-google-open');assert.match(await page.locator('.mobile-provider-header').innerText(),/Google/);await shot('05-google-authorize');await click('mobile-auth-confirm');await page.waitForTimeout(750);assert.equal(await state(),'list');
  await goto('?region=overseas');await captureCallback();await consent().check();await click('mobile-google-open');await click('mobile-auth-confirm');await click('mobile-auth-cancel');await lateCallback();assert.equal(await state(),'login');
  await page.evaluate(()=>mobilePreview('gamehub-logged-out'));assert.equal(await consent().isChecked(),false);await consent().check();await send('gamehub@example.com');await fillCode();await click('mobile-login-submit');assert.match(await page.locator('.mobile-auth-account').innerText(),/ga\*{3}@example.com/);await click('mobile-auth-confirm');await page.waitForTimeout(750);assert.equal(await state(),'list');
  await goto('?platform=landscape&region=overseas');await shot('06-overseas-landscape');assert.equal(await page.locator('.mobile-login').evaluate(element=>element.scrollWidth>element.clientWidth+1),false);
  await goto('?platform=landscape');await shot('07-domestic-landscape');
  assert.deepEqual(errors,[]);
  console.log('PASS: domestic phone / overseas email+Google / GameHub App, real embedded logo, unchecked consent, regional protocol preview, no consent actions, invalid identity/code, revoked verification, App return/cancel/logout/region stale callback guards, logged-out GameHub, outside-shell region controls, portrait+landscape. Evidence: '+evidence);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
