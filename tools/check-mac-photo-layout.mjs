import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out='test-results/compatibility-review-v1.2/2026-10-09';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-Mac端demo.html')).href);
 await page.click('#macCompatibilityEntry');
 const cases=[['m1',1,'landscape','m05-photo-1'],['m7',2,'landscape','m06-photo-2'],['m8',3,'landscape','m07-photo-3'],['m9',1,'portrait','m08-portrait-1'],['m10',2,'portrait','m09-portrait-2'],['m11',3,'portrait','m10-portrait-3'],['m12',2,'mixed','m11-mixed-2'],['m13',3,'mixed','m12-mixed-3']];
 for(const width of [1440,900,600]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const [id,count,layout] of cases){
   const article=page.locator('.review[data-review="'+id+'"]'),gallery=article.locator('.photos'),images=gallery.locator('img');
   assert.equal(await images.count(),count);
   await page.waitForFunction(id=>[...document.querySelectorAll('.review[data-review="'+id+'"] .photos img')].every(i=>i.complete&&i.naturalWidth>0),id);
   assert.equal(await gallery.getAttribute('data-layout'),layout);
   const orientations=await images.evaluateAll(items=>items.map(i=>i.naturalWidth<i.naturalHeight?'portrait':'landscape'));
   if(layout==='mixed')assert.deepEqual([...new Set(orientations)].sort(),['landscape','portrait']);else assert.ok(orientations.every(o=>o===layout));
   assert.ok(await images.evaluateAll((items,fit)=>items.every(i=>getComputedStyle(i).objectFit===fit),count>1?'cover':'contain'));
   const boxes=await gallery.locator('button').evaluateAll(items=>items.map(i=>{const r=i.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}}));
   const container=await gallery.boundingBox();
   assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<1&&Math.abs(b.width-boxes[0].width)<1&&b.right<=container.x+container.width+1));
   if(count===1&&layout==='landscape'){const content=await article.evaluate(e=>e.clientWidth-parseFloat(getComputedStyle(e).paddingLeft)-parseFloat(getComputedStyle(e).paddingRight));assert.ok(Math.abs(container.width/content-2/3)<.02)}
   if(count===1&&layout==='portrait')assert.ok(boxes[0].height>boxes[0].width);
   if(count>1){
    const gap=await gallery.evaluate(e=>parseFloat(getComputedStyle(e).columnGap));
    const cellWidth=(container.width-gap*2)/3;
    assert.ok(boxes.every(b=>Math.abs(b.width-cellWidth)<1&&Math.abs(b.height-cellWidth)<1));
    assert.ok(boxes[1].x>boxes[0].right);
    assert.ok(Math.abs(boxes.at(-1).right-container.x-(cellWidth*count+gap*(count-1)))<1);
    if(count===2)assert.ok(container.x+container.width-boxes.at(-1).right>=cellWidth-1);
   }
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const [id,count,layout,file] of cases){
  const article=page.locator('.review[data-review="'+id+'"]');
  await article.screenshot({path:'public/prd/compatibility-review-v1.2/'+file+'.png'});
  await article.locator('.photos button').last().click();
  assert.equal(await page.locator('.image-caption').innerText(),count+' / '+count);
  await page.waitForFunction(()=>{const i=document.querySelector('.image-dialog img');return i.complete&&i.naturalWidth>0});
  assert.ok(await page.locator('.image-dialog img').evaluate(i=>{const r=i.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)<.01}));
  await page.getByRole('button',{name:'关闭图片',exact:true}).click();
 }
 await page.click('#macWriteReview');
 assert.match(await page.locator('.dialog').innerText(),/最多 3 张/);
 const inputs=[path.resolve('demos/assets/macos-launcher/cyber.jpg'),path.resolve('demos/assets/compatibility-review/mac-portrait-1.jpg'),path.resolve('demos/assets/compatibility-review/mac-portrait-2.jpg')];
 await page.locator('#macUploads input').setInputFiles([...inputs,inputs[0]]);
 assert.equal(await page.locator('#macFormError').innerText(),'最多上传 3 张图片');
 assert.equal(await page.locator('.upload-thumb').count(),0);
 await page.locator('#macUploads input').setInputFiles(inputs);
 await page.waitForFunction(()=>document.querySelectorAll('#macUploads .upload-thumb').length===3&&!document.getElementById('macSubmit').disabled);
 assert.equal(await page.locator('#macUploads .upload').count(),0);
 await page.getByRole('button',{name:'移除配图 2',exact:true}).click();
 assert.equal(await page.locator('.upload-thumb').count(),2);
 assert.equal(await page.locator('#macUploads .upload').count(),1);
 await page.locator('#macUploads input').setInputFiles(inputs[1]);
 await page.waitForFunction(()=>document.querySelectorAll('#macUploads .upload-thumb').length===3&&!document.getElementById('macSubmit').disabled);
 await page.click('#macSubmit');
 assert.equal(await page.locator('.review[data-review="m3"] .photos img').count(),3);
 await page.waitForFunction(()=>document.querySelector('.review[data-review="m3"] .photos').dataset.layout==='mixed');
 await page.reload();await page.click('#macCompatibilityEntry');await page.getByRole('tab',{name:'我的',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.review[data-review="m3"] .photos').dataset.layout==='mixed');
 await page.evaluate(()=>macCompatibilityDemo.openCompose('m3'));
 assert.equal(await page.locator('.upload-thumb').count(),3);
 await page.getByRole('button',{name:'移除配图 3',exact:true}).click();await page.click('#macSubmit');
 assert.equal(await page.locator('.review[data-review="m3"] .photos img').count(),2);
 await page.evaluate(()=>{const reviews=macCompatibilityDemo.getReviews().filter(r=>!['m7','m8','m9','m10','m11','m12','m13'].includes(r.id));reviews.find(r=>r.id==='m3').text='已保存的个人评价';localStorage.setItem('gh-compatibility-mac-v12',JSON.stringify(reviews))});
 await page.reload();await page.reload();
 const restored=await page.evaluate(()=>macCompatibilityDemo.getReviews());
 assert.equal(restored.filter(r=>['m7','m8','m9','m10','m11','m12','m13'].includes(r.id)).length,7);
 assert.equal(restored.find(r=>r.id==='m3').text,'已保存的个人评价');
 assert.deepEqual(errors,[]);
 const result={status:'PASS',counts:[1,2,3],orientations:['landscape','portrait','mixed'],cases:cases.length,viewportWidths:[1440,900,600],fixedThreeColumns:true,twoPhotosLeaveThirdCellEmpty:true,uniformSquareThumbnails:true,multiPhotoFit:'cover',singlePhotoFit:'contain',originalRatioPreview:true,uploadLimit:3,removeAndEdit:true,cachedDataPreserved:true,errors};
 fs.writeFileSync(out+'/mac-photo-layout.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser.close()}
