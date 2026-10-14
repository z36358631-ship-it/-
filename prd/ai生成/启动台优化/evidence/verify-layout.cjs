const {chromium}=require('playwright-core');
const path=require('path');
const fs=require('fs');
const assert=require('assert/strict');
const {pathToFileURL}=require('url');

(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
 const page=await browser.newPage({deviceScaleFactor:2});
 await page.goto(pathToFileURL(path.join(root,'dock.html')).href);
 await page.locator('#replay').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gamehub-launchpad-demo-v2')).notificationRead);await page.locator('#announcementSettings').click();
 const checks=[];
 for(const [width,height,name] of [[1680,1120,'wide'],[1366,900,'desktop-1366'],[820,1180,'compact-820'],[390,844,'phone-390']]){
  await page.setViewportSize({width,height});
  const result=await page.locator('#launchpadSettingsRow').evaluate(row=>{
   const r=row.getBoundingClientRect(),copy=row.querySelector('.client-row-copy').getBoundingClientRect();
   const p=row.querySelector('.client-row-copy p'),s=row.querySelector('button').getBoundingClientRect();
   return {contained:copy.top>=r.top&&copy.bottom<=r.bottom,oneLine:getComputedStyle(p).whiteSpace==='nowrap'&&p.offsetHeight<=parseFloat(getComputedStyle(p).lineHeight)+1,noOverlap:copy.right<=s.left,noOverflow:document.documentElement.scrollWidth<=innerWidth};
  });
  assert.deepEqual(result,{contained:true,oneLine:true,noOverlap:true,noOverflow:true});
  checks.push({width,height,...result});
  if(name==='wide'){
   await page.locator('#stage').screenshot({path:path.join(root,'images','01-client-settings-off.png'),animations:'disabled'});
   await page.locator('#launchpadSettingsRow').screenshot({path:path.join(root,'images','13-settings-row.png'),animations:'disabled'});
  }else await page.screenshot({path:path.join(root,'evidence',name+'.png'),fullPage:true,animations:'disabled'});
 }
 fs.writeFileSync(path.join(root,'evidence','layout-verification.json'),JSON.stringify({status:'PASS',checks,time:new Date().toISOString()},null,2));
 console.log('PASS subtitle, content bounds and switch spacing at all four viewports');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
