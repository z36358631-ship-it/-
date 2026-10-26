const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1100,height:1120}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
const click=async a=>{const raw=v=>page.locator('[data-action="'+v+'"]').first().click();if(a.startsWith('device:')&&await page.locator('[data-action="'+a+'"]').count()===0)await raw('mobile-tab:devices');if(a==='mobile-logout'&&await page.locator('[data-action="mobile-logout"]').count()===0)await raw('mobile-tab:profile');return raw(a);};
 const login=async phone=>{await page.locator('#mobile-agreement').check();await page.locator('#mobile-phone').fill(phone);await click('mobile-sms');assert.equal(await page.locator('.mobile-login-error.is-success').count(),1);await page.locator('#mobile-code').fill('123456');await click('mobile-login-submit');};
 const logout=async()=>{await click('gpt-back');await click('back');await click('mobile-tab:profile');await click('mobile-logout');};
 try{
 await page.goto('file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/'));
 await login('13800138000');await click('mobile-tab:profile');assert.match(await page.locator('.personal-account-card').innerText(),/138\*{4}8000/);await click('mobile-tab:profile');
 await click('device:win');await click('quicklaunch');await click('apps-permission');await click('apps-scan-allow');await click('quick-add:browser');await click('back');
 await click('open-files');await click('file-pick:file');await click('file-selected');await click('file-back');
 await click('gpt-launch');await page.locator('#gpt-input').fill('账号 A 已发送的私人消息');await page.locator('#gpt-upload').setInputFiles({name:'账号A-已发送附件.txt',mimeType:'text/plain',buffer:Buffer.from('secret')});await page.locator('#gpt-form button[type=submit]').click();await page.waitForTimeout(1900);
 await page.locator('#gpt-input').fill('账号 A 未发送的私人草稿');await page.locator('#gpt-upload').setInputFiles({name:'账号A-未发送附件.txt',mimeType:'text/plain',buffer:Buffer.from('draft secret')});
 assert.match(await page.locator('.gpt-attachments').innerText(),/未发送附件/);
 await page.evaluate(()=>{s.quality='流畅 2M';s.localWolRelay=true;});
 await logout();
 assert.deepEqual(await page.evaluate(()=>({gpt:s.gptDevices,quick:s.quickAppsByDevice,scan:s.quickScanAllowed,files:s.files,saved:s.appSavedFiles,pending:s.appFilePending})),{gpt:{},quick:{},scan:{},files:[],saved:{},pending:null});
 assert.deepEqual(await page.evaluate(()=>({quality:s.quality,localWolRelay:s.localWolRelay})),{quality:'流畅 2M',localWolRelay:true});
 await login('13900139000');await click('mobile-tab:profile');assert.match(await page.locator('.personal-account-card').innerText(),/139\*{4}9000/);await click('mobile-tab:profile');await click('device:win');
 assert.equal(await page.locator('[data-action="quick-open:browser"]').count(),0);await click('quicklaunch');assert.equal(await page.locator('[data-action="apps-permission"]').count(),1);await click('back');
 await click('open-files');assert.deepEqual(await page.evaluate(()=>s.files),[]);await click('file-back');await click('gpt-launch');
 assert.equal(await page.locator('#gpt-input').inputValue(),'');assert.equal(await page.locator('.gpt-attachments').count(),0);assert.doesNotMatch(await page.locator('.gpt-workspace').innerText(),/账号 A|账号A-/);
 await page.locator('#gpt-input').fill('账号 B 等待回执的消息');await page.locator('#gpt-form button[type=submit]').click();await logout();await login('13500135000');await click('device:win');await click('gpt-launch');await page.waitForTimeout(1900);assert.doesNotMatch(await page.locator('.gpt-workspace').innerText(),/账号 A|账号A-|账号 B|演示消息已添加/);
 await logout();await click('mobile-preview:gamehub-logged-out');await login('13700137000');assert.match(await page.locator('.mobile-auth-account').innerText(),/137\*{4}7000/);await click('mobile-auth-confirm');await page.waitForTimeout(750);await click('mobile-tab:profile');assert.match(await page.locator('.personal-account-card').innerText(),/137\*{4}7000/);
 assert.deepEqual(errors,[]);console.log('PASS: real UI flow isolates GPT sent/draft attachments, quick launch permissions/apps, transfer tasks/saved files; stale GPT callback cannot reach new session; system preferences retained; SMS/authorization account labels follow entered phone; SMS success uses neutral success color.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
