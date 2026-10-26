const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const errors=[],checks=[];const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
 const url='file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/');const click=a=>p.locator('[data-action="'+a+'"]').first().click();
 try{
  await p.goto(url+'?state=profile');assert.deepEqual(await p.locator('.personal-row strong').allTextContents(),['帮助中心','检查更新','关于','退出登录']);
  assert.equal(await p.locator('.personal-account-card button,.personal-account-card [data-action],.personal-account-card .grow+svg,[data-action=mobile-settings-open]').count(),0);
  await p.locator('.personal-avatar').click();assert.equal(await p.locator('.personal-account-popover').count(),0);
  await p.locator('.mobile-independent-shell').screenshot({path:path.join(__dirname,'assets','simplify-mobile-profile.png')});
  await click('mobile-support:update');assert.equal(await p.evaluate(()=>s.page),'mobile-profile');assert.equal(await p.locator('.update-inline-row').isDisabled(),true);const request=await p.evaluate(()=>remoteSupportState.updateGeneration);await p.evaluate(()=>action('mobile-support:update'));assert.equal(await p.evaluate(()=>remoteSupportState.updateGeneration),request);
  await p.waitForFunction(()=>remoteSupportState.update==='done');assert.match(await p.locator('.update-inline-result').innerText(),/无可用更新/);assert.equal(await p.evaluate(()=>s.page),'mobile-profile');
  await click('mobile-support:update');await click('mobile-tab:devices');await p.waitForTimeout(600);await click('mobile-tab:profile');assert.equal(await p.locator('.update-inline-result').innerText(),'');
  await click('mobile-support:about');assert.equal(await p.locator('.support-about .personal-row').count(),4);await click('mobile-personal-back');assert.equal(await p.evaluate(()=>s.page),'mobile-profile');
  await click('mobile-support:update');await click('mobile-logout');await p.waitForTimeout(600);assert.equal(await p.locator('.mobile-login').count(),1);assert.equal(await p.evaluate(()=>remoteSupportState.update),'idle');assert.equal(await p.locator('.update-inline-result').count(),0);
  await p.goto(url+'?state=settings');assert.equal(await p.evaluate(()=>s.page),'mobile-profile');assert.equal(await p.getByRole('heading',{name:'设置',exact:true}).count(),0);
  checks.push('我的四项直接入口/静态账号无箭头与点击/原地更新禁重/离页和退出取消旧结果/关于返回我的/旧设置地址转我的');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'personal-simplify-test-report.json'),JSON.stringify({pass:true,checks,errors},null,2));console.log(JSON.stringify({pass:true,checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
