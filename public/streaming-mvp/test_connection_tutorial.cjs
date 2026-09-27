const {chromium}=require('playwright-core'),assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1450,height:1050}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/'));
 for(const platform of ['app','landscape','mac']){
  await page.evaluate(platform=>{localStorage.clear();s.platform=platform;s.page='library';action('enter-remote')},platform);
  assert.equal(await page.locator('.guide-card').count(),2);
  await page.locator('[data-action="guide-done"]').first().click();
  assert.equal(await page.locator('.add-device-notice').count(),0);
  assert.equal(await page.locator('.list-tools').count(),0);
  const entry=page.locator('.connection-tutorial');
  assert.equal(await entry.count(),1);
  assert.equal(await entry.innerText(),'连接教程');
  const bounds=await entry.boundingBox(),shell=await page.locator('.shell').boundingBox();
  assert(bounds.x>shell.x+shell.width/2);
  assert(bounds.y<shell.y+110);
  await page.locator('.shell').screenshot({path:path.join(__dirname,'review-shots','connection-tutorial-'+platform+'.png')});
  for(let i=0;i<2;i++){
   await entry.click();
   assert.equal(await page.getByRole('dialog',{name:'添加你的设备'}).count(),1);
   assert.equal(await page.locator('.guide-card').count(),2);
   await page.locator('[data-action="guide-done"]').first().click();
   assert.equal(await page.getByRole('dialog').count(),0);
  }
  await page.reload();
  await page.evaluate(platform=>{s.platform=platform;s.page='library';action('enter-remote')},platform);
  assert.equal(await page.getByRole('dialog').count(),0);
  await page.locator('.connection-tutorial').click();
  assert.equal(await page.locator('.guide-card').count(),2);
  await page.locator('[data-action="guide-done"]').first().click();
  if(platform!=='mac'){
   await page.locator('[data-action="device:work"]').click();
   assert.equal(await page.locator('.connection-tutorial').count(),0);
  }
  checks.push(platform+'：右上角连接教程直接打开引导；无提示卡片和旧工具行；关闭、重复打开及刷新后打开正常；首次自动引导仅一次');
 }
 assert.deepEqual(errors,[]);
 const report={checks,errors};
 fs.writeFileSync(path.join(__dirname,'connection-tutorial-test-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
