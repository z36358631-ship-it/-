import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

test('整合离线 Demo 三端切换、Android草稿和后台回归',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.context().setOffline(true);
  await page.goto(pathToFileURL(path.resolve('demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-整合demo.html')).href);
  await page.waitForTimeout(450);
  assert.equal(await page.getByRole('tab').count(),3);
  assert.equal(await page.locator('iframe').count(),0);
  await page.click('#openCompatibilityReviews');
  await page.click('#manualReviewButton');
  await page.click('#fbTypeWrap [data-type="basic"]');
  await page.fill('#fbEditor','三端切换后保留草稿');
  await page.getByRole('tab',{name:'后台',exact:true}).click();
  assert.ok(await page.locator('#page-compat-domestic').isVisible());
  await page.evaluate(()=>window.adminHideCompatFeedback('cf1'));
  await page.getByRole('tab',{name:'Mac 端',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('data-demo-platform'),'mac');
  assert.match(await page.locator('body').innerText(),/赛博朋克|兼容性/);
  await page.click('#macCompatibilityEntry');
  await page.click('#macWriteReview');
  await page.fill('#macDescription','Mac跨端切换草稿');
  await page.getByRole('tab',{name:'后台',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gh_compat_feedbacks_v2')).find(r=>r.id==='cf1').hidden),true);
  await page.getByRole('tab',{name:'Mac 端',exact:true}).click();
  await page.click('#macCompatibilityEntry');
  await page.click('#macWriteReview');
  assert.equal(await page.inputValue('#macDescription'),'Mac跨端切换草稿');
  await page.evaluate(()=>macClose());
  await page.evaluate(()=>window.macCompatibilityDemo.openSnapshot('m2'));
  assert.equal(await page.locator('#macApplyConfig').isDisabled(),true);
  assert.equal(await page.locator('#macCopyConfig').isDisabled(),false);
  await page.evaluate(()=>macClose());
  fs.mkdirSync('test-results/compatibility-review-v1.2/2026-10-08',{recursive:true});
  await page.screenshot({path:'test-results/compatibility-review-v1.2/2026-10-08/suite-mac.png',fullPage:true});
  for(let i=0;i<2;i++){
   await page.getByRole('tab',{name:'后台',exact:true}).click();
   await page.getByRole('tab',{name:'Android 端',exact:true}).click();
   await page.waitForTimeout(450);
   await page.click('#openCompatibilityReviews');
   await page.click('#manualReviewButton');
   assert.equal(await page.inputValue('#fbEditor'),'三端切换后保留草稿');
   await page.getByRole('tab',{name:'Mac 端',exact:true}).click();
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(remote,[]);
 }finally{await browser.close();}
});
