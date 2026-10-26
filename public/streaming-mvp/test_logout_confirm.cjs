const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const errors=[],checks=[],evidence=path.join(__dirname,'review','v47');fs.mkdirSync(evidence,{recursive:true});
 try{for(const host of ['mobile','mac']){
  const p=await browser.newPage({viewport:host==='mac'?{width:1600,height:1100}:{width:390,height:1050}});p.on('pageerror',e=>errors.push(e.message));
  const base='file:///'+path.join(__dirname,host+'.html').replaceAll('\\','/'),logout=host==='mac'?'sr-logout':'mobile-logout',shell=host==='mac'?'.sr-client':'.mobile-independent-shell';
  const click=a=>p.locator('[data-action="'+a+'"]').first().click();
  const signed=()=>p.evaluate(h=>h==='mac'?standaloneMac.signed:mobileAuth.loggedIn,host);
  const snapshot=()=>p.evaluate(h=>({signed:h==='mac'?standaloneMac.signed:mobileAuth.loggedIn,identity:h==='mac'?standaloneMac.accountIdentity:mobileAuth.accountPhone,files:s.files,tasks:s.macFileTasks,draft:s.textDraft,devices:devices.map(x=>x.id)}),host);
  await p.goto(base+'?state='+(host==='mac'?'list':'profile'));
  // 没有打开确认框，不能通过直接提交确认来退出。
  await p.evaluate(()=>action('remote-logout:confirm'));assert.equal(await signed(),true);
  if(host==='mac')await click('mac-account');
  const trigger=p.locator('.personal-nickname-row [data-action="'+logout+'"]');
  assert.equal(await trigger.count(),1);assert.equal(await trigger.getAttribute('aria-label'),'退出登录');assert.equal((await trigger.innerText()).trim(),'');assert.equal(await trigger.locator('svg').count(),1);
  assert.equal(await p.locator(host==='mac'?'.mac-account-logout':'.personal-logout').count(),0);
  await p.locator(shell).screenshot({path:path.join(__dirname,'assets',host==='mac'?'standalone-desktop-account.png':'standalone-mobile-profile.png')});
  await p.evaluate(()=>{s.files=[{id:'review-paused',kind:'paused',progress:24}];s.macFileTasks=[{id:'review-task',status:'paused',progress:36}];s.textDraft='退出确认前保留的草稿';});
  const before=await snapshot();await trigger.click();assert.equal(await p.locator('.remote-logout-dialog').count(),1);assert.equal(await p.locator('.remote-logout-dialog').getAttribute('role'),'dialog');assert.equal(await signed(),true);assert.deepEqual(await snapshot(),before);
  const dialog=await p.locator('.remote-logout-dialog').boundingBox(),bounds=await p.locator(shell).boundingBox();assert(dialog.x>=bounds.x&&dialog.y>=bounds.y&&dialog.x+dialog.width<=bounds.x+bounds.width+1&&dialog.y+dialog.height<=bounds.y+bounds.height+1);
  await p.locator(shell).screenshot({path:path.join(__dirname,'assets','standalone-'+host+'-logout.png')});await p.locator(shell).screenshot({path:path.join(evidence,host+'-logout.png')});
  await click('remote-logout:cancel');assert.equal(await p.locator('.remote-logout-dialog').count(),0);assert.deepEqual(await snapshot(),before);
  await p.evaluate(()=>action('remote-logout:confirm'));assert.deepEqual(await snapshot(),before);
  if(host==='mac'&&!await p.locator('.mac-account-popover').count())await click('mac-account');await click(logout);await p.keyboard.press('Escape');assert.equal(await p.locator('.remote-logout-dialog').count(),0);assert.deepEqual(await snapshot(),before);
  checks.push(host+'：昵称右侧仅退出图标/无障碍名称/取消与Esc不改账号任务/未打开确认不能退出');
  // 检查更新进行中打开退出确认，不能在确认层背后出现迟到通知。
  if(host==='mac'){await click('mac-more-toggle');await click('mac-support:update');await click('mac-account');}
  else await click('mobile-support:update');
  await click(logout);await p.waitForTimeout(600);assert.equal(await p.locator('.remote-update-dialog').count(),0);assert.equal(await p.locator('.remote-logout-dialog').count(),1);assert.equal(await signed(),true);await click('remote-logout:cancel');assert.equal(await p.evaluate(()=>remoteSupportState.update),'idle');
  if(host==='mac'&&!await p.locator('.mac-account-popover').count())await click('mac-account');await click(logout);await click('remote-logout:confirm');await p.waitForTimeout(600);
  assert.equal(await signed(),false);assert.equal(await p.locator('.remote-logout-dialog,.remote-update-dialog').count(),0);assert.equal(await p.evaluate(()=>s.files.length),0);assert.equal(await p.evaluate(()=>s.textDraft||''),'');assert.equal(await p.evaluate(()=>remoteSupportState.update),'idle');
  if(host==='mac'){assert.equal(await p.locator('.mac-account-entry,.mac-more-entry').count(),0);assert.equal(await p.locator('#sr-credential').count(),1);assert.equal(await p.evaluate(()=>s.macFileTasks.length),0);}
  else{assert.equal(await p.locator('.mobile-login').count(),1);assert.equal(await p.evaluate(()=>mobileAuth.accountPhone),'');}
  await p.evaluate(()=>action('remote-logout:confirm'));assert.equal(await signed(),false);
  checks.push(host+'：确认才退出并清理/检查更新迟到结果隔离/重复确认无效');await p.close();
 }
 assert.deepEqual(errors,[]);const report={pass:true,checks,errors};fs.writeFileSync(path.join(evidence,'logout-confirm-review.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(__dirname,'logout-confirm-test-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
