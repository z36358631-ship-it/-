const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=__dirname,base=process.env.REMOTE_BASE_URL||'file:///'+root.replaceAll('\\','/'),out=path.join(root,'review/v412'),assetOut=process.env.REMOTE_BASE_URL?out:path.join(root,'assets');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],checks=[];try{
 const context=await b.newContext({viewport:{width:1500,height:1100}}),m=await context.newPage(),p=await context.newPage();for(const page of [m,p])page.on('pageerror',e=>errors.push(e.message));
 const click=(page,a)=>page.locator('[data-action="'+a+'"]').first().click();
 for(const [region,lang,suffix] of [['domestic','zh',''],['overseas','zh','-overseas'],['domestic','en','-en']]){
  await m.goto(base+'/mac.html?state=login&region='+region+'&lang='+lang);
  assert.equal(await m.locator('.sr-consent button').count(),2);assert.equal(await m.locator('[data-action="sr-policy:carrier"]').count(),0);
  await m.evaluate(()=>action('sr-policy:carrier'));assert.equal(await m.locator('.sr-policy').count(),0);
  await click(m,'sr-policy:user');assert.equal(await m.locator('.sr-policy').count(),1);await click(m,'sr-policy-close');assert.equal(await m.locator('#sr-consent').isChecked(),false);
  await m.locator('.sr-client').screenshot({path:path.join(assetOut,'standalone-desktop-login'+suffix+'.png')});
 }
 checks.push('电脑国内/海外、中英登录均仅用户协议和隐私协议，旧移动协议事件不能打开；阅读协议不勾选');
 await p.goto(base+'/mobile.html?region=domestic&lang=zh');assert.match(await p.locator('.mobile-agreement').innerText(),/中国移动认证服务协议/);
 await p.locator('#mobile-phone').fill('13600008000');await click(p,'mobile-sms');await p.locator('#mobile-code').fill('123456');await p.locator('#mobile-agreement').check();await click(p,'mobile-login-submit');await click(p,'mobile-tab:profile');const uid=await p.locator('.personal-account-card p').innerText();assert.match(uid,/^UID · \d{9}$/);assert.doesNotMatch(uid,/13600008000/);await p.locator('.mobile-independent-shell').screenshot({path:path.join(assetOut,'standalone-mobile-profile.png')});
 await m.goto(base+'/mac.html?region=domestic&lang=zh');await m.locator('#sr-credential').fill('13600008000');await click(m,'sr-send-code');await m.locator('#sr-code').fill('123456');await m.locator('#sr-consent').check();await m.locator('.sr-submit').click();await click(m,'sr-onboard-skip');await click(m,'mac-account');assert.equal(await m.locator('.mac-account-popover small').innerText(),uid);await m.locator('.sr-client').screenshot({path:path.join(assetOut,'standalone-desktop-account.png')});
 await click(m,'sr-logout');await click(m,'remote-logout:cancel');assert.equal(await m.evaluate(()=>standaloneMac.signed),true);await click(p,'mobile-logout');await click(p,'remote-logout:cancel');assert.equal(await p.evaluate(()=>mobileAuth.loggedIn),true);
 checks.push('国内App保留移动协议；双端昵称下方同账号UID一致、无手机号邮箱；退出图标及取消保留登录');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'account-report.json'),JSON.stringify({pass:true,checks,errors},null,2));console.log(JSON.stringify({pass:true,checks,errors}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
