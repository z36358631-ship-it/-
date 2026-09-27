const {chromium}=require('playwright-core'),assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1450,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/'));
 const forbidden=['全部设备','终端','远程协助','调整顺序'];
 for(const platform of ['app','landscape','mac']){
  await page.evaluate(p=>{s.platform=p;applyState('list');action('review')},platform);
  for(const group of await page.locator('#review-group option').allTextContents()){
   await page.locator('#review-group').selectOption(group);
   const text=await page.locator('.review').innerText();
   for(const word of forbidden)assert(!text.includes(word),platform+' 状态预览仍显示 '+word);
   assert.equal(await page.locator('.review-item-row').count()>0,true);
  }
  await page.locator('#review-group').selectOption('设备与详情');
  await page.locator('[data-action="review-preset:list:full"]').click();
  assert.equal(await page.evaluate(()=>s.page),'list');
  assert.equal(await page.locator('.all-devices-content,[data-action="all"]').count(),0);
  await page.evaluate(()=>applyState('all'));assert.equal(await page.evaluate(()=>s.page),'list');
  await page.evaluate(()=>action('all'));assert.equal(await page.evaluate(()=>s.page),'list');
  assert.equal(await page.locator('.all-devices-content,[data-action="all"],[data-action="terminal"]').count(),0);
 }
 assert.deepEqual(errors,[]);
 const report={checks:['APP、横屏、Mac所有预览分类均已移除全部设备、终端、远程协助、调整顺序','设备列表穷举直达当前我的设备；旧all状态与动作均回落当前列表'],errors};
 fs.writeFileSync(path.join(__dirname,'scope-cleanup-test-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
