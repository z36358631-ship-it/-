const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const out=path.join(__dirname,'review/v49');fs.mkdirSync(out,{recursive:true});
const report={pass:false,checks:[],errors:[]};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!['mobile.html','mac.html'].includes(name)){res.writeHead(404);return res.end();}res.setHeader('content-type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(__dirname,name)));});
let browser;
async function click(page,value){await page.locator('[data-action="'+value+'"]').first().click();}
async function screenshot(page,selector,name){await page.locator(selector).screenshot({path:path.join(out,name+'.png')});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.REMOTE_BASE_URL||'http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1400,height:1150}});
 const mobile=await context.newPage(),mac=await context.newPage();for(const p of [mobile,mac])p.on('pageerror',e=>report.errors.push(e.message));
 await mobile.goto(base+'/mobile.html?state=old-version');
 await mobile.locator('#mobile-agreement').check();await click(mobile,'mobile-gamehub-open');
 assert.match(await mobile.locator('.mobile-login-error').innerText(),/版本过低/);assert.equal(await mobile.evaluate(()=>s.page),'login');
 assert.equal(await mobile.locator('a:has-text("更新盖世游戏 App")').getAttribute('href'),'https://gamehub.xiaoji.com/zh-cn/');
 await screenshot(mobile,'.mobile-independent-shell','old-gamehub-version');
 await mobile.locator('#mobile-phone').fill('13600008000');await click(mobile,'mobile-sms');await mobile.locator('#mobile-code').fill('123456');await click(mobile,'mobile-login-submit');assert.equal(await mobile.evaluate(()=>mobileAuth.loggedIn),true);
 report.checks.push('旧版盖世App拦截授权、官网更新入口正确，验证码登录仍可用');
 await click(mobile,'mobile-tab:profile');const uid=await mobile.locator('.personal-account-card p').innerText();assert.match(uid,/^UID · \d{9}$/);assert.equal(await mobile.locator('.personal-avatar[data-action]').count(),0);
 await screenshot(mobile,'.mobile-independent-shell','mobile-uid');await click(mobile,'mobile-support:about');await click(mobile,'mobile-support:cancel-account');assert.match(await mobile.locator('#support-policy-note').innerText(),/待接入/);assert.equal(await mobile.evaluate(()=>mobileAuth.loggedIn),true);await screenshot(mobile,'.mobile-independent-shell','account-deletion-entry');
 await click(mobile,'mobile-personal-back');await click(mobile,'mobile-tab:devices');await click(mobile,'guide');assert.match(await mobile.locator('.guide-dialog').innerText(),/公网/);await click(mobile,'guide-done');
 await mobile.evaluate(()=>{action('rotate');});assert.equal(await mobile.evaluate(()=>s.platform),'app');
 await mobile.evaluate(()=>{s.device='win';action('gpt-game-launch:gamehub');});await mobile.waitForTimeout(1600);assert.equal(await mobile.evaluate(()=>s.platform),'landscape');assert.equal(await mobile.locator('.mobile-independent-shell.landscape').count(),1);await screenshot(mobile,'.mobile-independent-shell','game-landscape');
 await mobile.evaluate(()=>{s.page='list';render();});assert.equal(await mobile.evaluate(()=>s.platform),'app');report.checks.push('设备页固定竖屏、游戏启动横屏、离开游戏回竖屏');
 await mac.goto(base+'/mac.html');assert.equal(await mac.locator('.sr-qr-login h2').innerText(),'App 扫码登录');assert.match(await mac.locator('.sr-qr-login').innerText(),/盖世远程或.*盖世游戏 App/s);await screenshot(mac,'.sr-client','mac-scan-copy');
 await mac.locator('#sr-credential').fill('13600008000');await click(mac,'sr-send-code');await mac.locator('#sr-code').fill('123456');await mac.locator('#sr-consent').check();await mac.locator('.sr-submit').click();await click(mac,'sr-onboard-skip');await click(mac,'mac-account');assert.equal(await mac.locator('.mac-account-popover small').innerText(),uid);await screenshot(mac,'.sr-client','mac-uid');
 await click(mac,'mac-more-toggle');await click(mac,'mac-support:about');await click(mac,'mac-support:cancel-account');assert.match(await mac.locator('#support-policy-note').innerText(),/待接入/);assert.equal(await mac.evaluate(()=>standaloneMac.signed),true);
 report.checks.push('双端UID同账号一致、头像静态、关于页注销入口不模拟删号、扫码说明支持双App');
 await mobile.goto(base+'/mobile.html?state=old-version&lang=en');await mobile.waitForTimeout(100);assert.match(await mobile.locator('.mobile-login-error').innerText(),/too old/);await screenshot(mobile,'.mobile-independent-shell','old-gamehub-version-en');
 await mac.goto(base+'/mac.html?lang=en');await mac.waitForTimeout(100);assert.equal(await mac.locator('.sr-qr-login h2').innerText(),'Scan with an App');await screenshot(mac,'.sr-client','mac-scan-copy-en');
 report.checks.push('新增扫码、旧版提示中英切换正常');
 assert.deepEqual(report.errors,[]);report.pass=true;
})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'second-review-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser?.close();server.close();});
