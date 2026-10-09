import {chromium,request} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const out='test-results/compatibility-review-v1.2/2026-10-09-mac-parameters';
fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const assetRequest=await request.newContext({proxy:process.env.COMPATIBILITY_IMAGE_PROXY?{server:process.env.COMPATIBILITY_IMAGE_PROXY}:undefined});
try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const url='https://z36358631-ship-it.github.io/-/previews/compatibility-review-v1.2/index.html?platform=mac&t='+Date.now();
 const response=await p.goto(url,{waitUntil:'load',timeout:45000});assert.equal(response.status(),200);
 assert.equal(await p.getByRole('tab').count(),3);
 await p.click('#macCompatibilityEntry');
 const cases=[['m1',1,'landscape'],['m7',2,'landscape'],['m8',3,'landscape'],['m9',1,'portrait'],['m10',2,'portrait'],['m11',3,'portrait'],['m12',2,'mixed'],['m13',3,'mixed']];
 for(const width of [1440,900,600]){
  await p.setViewportSize({width,height:1000});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const [id,count,layout] of cases){
   const gallery=p.locator('.review[data-review="'+id+'"] .photos');
   assert.equal(await gallery.locator('img').count(),count);
   await p.waitForFunction(id=>[...document.querySelectorAll('.review[data-review="'+id+'"] .photos img')].every(i=>i.complete&&i.naturalWidth>0),id);
   assert.equal(await gallery.getAttribute('data-layout'),layout);
   assert.ok(await gallery.locator('img').evaluateAll((items,fit)=>items.every(i=>getComputedStyle(i).objectFit===fit),count>1?'cover':'contain'));
   if(count>1){
    const geometry=await gallery.evaluate(e=>{const r=e.getBoundingClientRect(),gap=parseFloat(getComputedStyle(e).columnGap);return{width:r.width,x:r.x,gap}});
    const cellWidth=(geometry.width-geometry.gap*2)/3;
    const boxes=await gallery.locator('button').evaluateAll(items=>items.map(i=>{const r=i.getBoundingClientRect();return{width:r.width,height:r.height,y:r.y,right:r.right}}));
    assert.ok(boxes.every(r=>Math.abs(r.width-cellWidth)<1&&Math.abs(r.height-cellWidth)<1&&Math.abs(r.y-boxes[0].y)<1));
    assert.ok(Math.abs(boxes.at(-1).right-geometry.x-(count*cellWidth+(count-1)*geometry.gap))<1);
    if(count===2)assert.ok(geometry.x+geometry.width-boxes.at(-1).right>=cellWidth-1);
   }
   const orientations=await gallery.locator('img').evaluateAll(items=>items.map(i=>i.naturalWidth<i.naturalHeight?'portrait':'landscape'));
   if(layout==='mixed')assert.equal(new Set(orientations).size,2);else assert.ok(orientations.every(o=>o===layout));
  }
 }
 await p.setViewportSize({width:1440,height:1000});
 await p.locator('.review[data-review="m12"]').screenshot({path:out+'/online-mac-two-photo-grid.png'});
 await p.locator('.review[data-review="m13"]').screenshot({path:out+'/online-mac-three-photo-grid.png'});
 await p.locator('.review[data-review="m13"] .photos button').last().click();
 assert.equal(await p.locator('.image-caption').innerText(),'3 / 3');
 await p.waitForFunction(()=>{const i=document.querySelector('.image-dialog img');return i.complete&&i.naturalWidth>0});
 assert.ok(await p.locator('.image-dialog img').evaluate(i=>{const r=i.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<.01}));
 await p.screenshot({path:out+'/online-mac-orientations.png'});
 await p.getByRole('button',{name:'关闭图片',exact:true}).click();
 await p.click('#macWriteReview');
 assert.match(await p.locator('.dialog').innerText(),/最多 3 张/);
 assert.ok(await p.locator('#macDescription').isVisible());await p.evaluate(()=>macClose());
 await p.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
 assert.equal(await p.locator('#macApplyConfig').isDisabled(),true);
 assert.deepEqual(await p.locator('.snapshot-group h3').allTextContents(),['Steam','通用','兼容性','图形']);
 assert.deepEqual(await p.locator('.snapshot-parameter dt').allTextContents(),['Steam Input（实验性）','环境变量','启动参数','兼容层','同步模式','跳过音视频解码','手柄兼容模式','AVX 指令集','切换图形栈','切换 OpenGL','切换 MoltenVK']);
 assert.deepEqual(await p.locator('.snapshot-parameter dd').allTextContents(),['关闭','未设置','未设置','wine-proton_11.0','MSync','关闭','开启','关闭','gptk-3.0-3','builtin','builtin']);
 await p.click('#macCopyConfig');
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('gh-mac-local-schemes')).find(s=>s.sourceReviewId==='m2').parameters),await p.evaluate(()=>macCompatibilityDemo.getReviews().find(r=>r.id==='m2').snapshot.parameters));
 await p.screenshot({path:out+'/online-mac.png'});
 await p.getByRole('tab',{name:'后台',exact:true}).click();assert.ok(await p.locator('#page-compat-domestic').isVisible());
 await p.getByRole('tab',{name:'Android 端',exact:true}).click();await p.waitForTimeout(450);await p.click('#openCompatibilityReviews');await p.click('#manualReviewButton');
 assert.ok(await p.locator('#modalFeedback.show').isVisible());
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/online.json',JSON.stringify({url,status:'PASS',tabs:3,macPhotoCases:cases.length,orientations:['landscape','portrait','mixed'],viewportWidths:[1440,900,600],fixedThreeColumns:true,twoPhotosLeaveThirdCellEmpty:true,uniformSquareThumbnails:true,multiPhotoFit:'cover',originalRatioPreview:true,uploadLimit:3,macCompose:true,macSnapshotParameters:11,macSnapshotGroups:4,copyPreservesSnapshotParameters:true,crossChipDisabled:true,androidCompose:true,admin:true,errors},null,2));
 const text=fs.readFileSync('prd/【PRD】《盖世游戏》兼容性评价改版V1.2需求.md','utf8');
 const urls=[...new Set([...text.matchAll(/!\[[^\]]*\]\((https:\/\/[^)]+)\)/g)].map(m=>m[1]))];
 assert.equal(urls.length,27);
 const checkpoint=out+'/public-images.json';
 const previous=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):[];
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 const checks=[];
 for(const url of urls){
  const file=url.split('/').pop(),expected=hash(fs.readFileSync('public/prd/compatibility-review-v1.2/'+file));
  const saved=previous.find(c=>c.url===url&&c.sha256===expected&&c.status===200);
  if(saved){checks.push(saved);continue}
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const response=await assetRequest.get(url,{timeout:15000,maxRetries:2});assert.equal(response.status(),200,url);assert.match(response.headers()['content-type'],/image\/png/);
    const bytes=await response.body();assert.equal(hash(bytes),expected,file);
    checks.push({url,file,status:200,type:'image/png',sha256:hash(bytes)});break;
   }catch(error){if(attempt===3)throw error}
  }
  fs.writeFileSync(checkpoint,JSON.stringify(checks,null,2));
  console.log('Public image PASS: '+file);
 }
 assert.equal(checks.length,27);fs.writeFileSync(checkpoint,JSON.stringify(checks,null,2));
 console.log('Public three-tab demo PASS; 8 photo cases and 27 images HTTP200 and SHA256 match');
}finally{await assetRequest.dispose();await b.close();}
