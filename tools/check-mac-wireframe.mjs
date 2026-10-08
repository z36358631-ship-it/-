import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-Mac端demo.html')).href);
 const prefix='public/prd/compatibility-review-v1.2/';
 const entry=await page.locator('#macCompatibilityEntry').boundingBox(), info=await page.locator('.detail-info').boundingBox(),media=await page.locator('.detail-media').boundingBox();
 assert.ok(entry.x>media.x+media.width && entry.y>=info.y+info.height);
 assert.ok(!/条|★/.test(await page.locator('#macCompatibilityEntry').innerText()));
 await page.screenshot({path:prefix+'m01-detail.png',fullPage:true});
 await page.click('#macCompatibilityEntry');
 assert.deepEqual(await page.getByRole('tab').allTextContents(),['全部','同配置','支持最多','我的']);
 const tabs=await page.locator('.tabs').boundingBox(),write=await page.locator('#macWriteReview').boundingBox();
 assert.ok(Math.abs(tabs.y-write.y)<10 && write.x>tabs.x+tabs.width);
 await page.screenshot({path:prefix+'m02-reviews.png',fullPage:true});
 await page.click('#macWriteReview');await page.screenshot({path:prefix+'m03-compose.png'});
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));await page.screenshot({path:prefix+'m04-snapshot.png'});
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.click('#macBackToDetail');assert.ok(await page.locator('#macCompatibilityEntry').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS: right-column placement, filter order, toolbar placement, compose, snapshot, return; no page errors');
}finally{await browser.close()}
