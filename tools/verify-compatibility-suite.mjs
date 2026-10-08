import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const out='test-results/compatibility-review-v1.2/2026-10-08';
fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const url='https://z36358631-ship-it.github.io/-/previews/compatibility-review-v1.2/index.html?platform=mac&v=22e2d075e&t='+Date.now();
 const response=await p.goto(url,{waitUntil:'load',timeout:45000});assert.equal(response.status(),200);
 assert.equal(await p.getByRole('tab').count(),3);
 await p.click('#macCompatibilityEntry');await p.click('#macWriteReview');
 assert.ok(await p.locator('#macDescription').isVisible());await p.evaluate(()=>macClose());
 await p.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
 assert.equal(await p.locator('#macApplyConfig').isDisabled(),true);
 await p.screenshot({path:out+'/online-mac.png'});
 await p.getByRole('tab',{name:'后台',exact:true}).click();assert.ok(await p.locator('#page-compat-domestic').isVisible());
 await p.getByRole('tab',{name:'Android 端',exact:true}).click();await p.waitForTimeout(450);await p.click('#openCompatibilityReviews');await p.click('#manualReviewButton');
 assert.ok(await p.locator('#modalFeedback.show').isVisible());
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/online.json',JSON.stringify({url,status:'PASS',tabs:3,macCompose:true,crossChipDisabled:true,androidCompose:true,admin:true,errors},null,2));
 const text=fs.readFileSync('prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md','utf8');
 const urls=[...new Set([...text.matchAll(/!\[[^\]]*\]\((https:\/\/[^)]+)\)/g)].map(m=>m[1]))];
 const checks=[];
 for(let i=0;i<urls.length;i++){
  const group=await Promise.all(urls.slice(i,i+1).map(async url=>{
   const response=await p.request.get(url,{timeout:45000,maxRetries:3});assert.equal(response.status(),200,url);assert.match(response.headers()['content-type'],/image\/png/);
   const bytes=await response.body();const file=url.split('/').pop();const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
   assert.equal(hash(bytes),hash(fs.readFileSync('public/prd/compatibility-review-v1.2/'+file)),file);
   return{file,status:200,type:'image/png',sha256:hash(bytes)};
  }));checks.push(...group);fs.writeFileSync(out+'/public-images.json',JSON.stringify(checks,null,2));
 }
 assert.equal(checks.length,19);fs.writeFileSync(out+'/public-images.json',JSON.stringify(checks,null,2));
 console.log('Public three-tab demo PASS; 19 images HTTP200 and SHA256 match');
}finally{await b.close();}
