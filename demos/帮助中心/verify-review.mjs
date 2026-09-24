import {chromium} from 'playwright-core';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../public/prd/app-help-center-20260924');
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),checks=[],errors=[];
try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(dir,'帮助中心后台demo.html')).href);
 await p.locator('[data-ha-package]').selectOption('overseas');
 assert.equal(await p.locator('[data-ha-row="HC-N001"]').count(),0);assert.equal(await p.locator('[data-ha-row="HC-ON001"]').count(),1);
 await p.locator('[data-ha-tab="docs"]').click();await p.locator('[data-ha-action="languages"][data-id="HC-OD002"]').click();
 const count=await p.evaluate(()=>HelpStore.draft.docs.length);await p.locator('[data-ha-action="language-edit"][data-id="hi"]').click();
 assert.match(await p.locator('[data-ha-title]').inputValue(),/वीडियो/);assert.equal(await p.evaluate(()=>HelpStore.draft.docs.length),count);
 await p.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await p.screenshot({path:path.join(out,'09-admin-multilingual.png'),fullPage:true});checks.push('国内海外列表隔离；同ID集中切换六语言且不新增对象');
 const model=await p.evaluate(()=>{const s=HelpStore,d=s.get('docs','HC-OD001'),out={};out.cross=s.visible(d,'domestic');d.ja.title='途中';out.partial=s.publish('docs',d.id);d.ja.title='';out.complete=s.publish('docs',d.id);out.fallback=s.locale(s.published.docs.find(x=>x.id===d.id),'ja').title;out.foreign=s.update('docs',d.id,{navId:'HC-N001'});d.en.title='Draft only';out.order=s.setOrder('docs',d.id,5);out.live=s.published.docs.find(x=>x.id===d.id).en.title;out.weight=s.published.docs.find(x=>x.id===d.id).order;out.bad=s.setOrder('docs',d.id,-1);out.sanitize=s.sanitize('<span style="font-size:20px;color:red" onclick="x()">字</span><span style="font-size:999px">坏</span>');return out;});
 assert.equal(model.cross,false);assert.match(model.partial,/同时填写/);assert.equal(model.complete,'');assert.equal(model.fallback,'Welcome to the Help Center');assert.match(model.foreign,/跨包/);assert.equal(model.order,'');assert.equal(model.live,'Welcome to the Help Center');assert.equal(model.weight,5);assert.match(model.bad,/整数/);assert.match(model.sanitize,/font-size:20px/);assert.doesNotMatch(model.sanitize,/onclick|color|999/);checks.push('半译阻止、整篇回退、跨包阻止、排序与内容隔离、字号安全');
 await p.reload();await p.locator('[data-ha-tab="docs"]').click();await p.locator('[data-ha-action="edit"][data-id="HC-D001"]').click();
 await p.locator('[data-ha-body]').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.querySelector('p'));const s=getSelection();s.removeAllRanges();s.addRange(r);el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await p.locator('[data-ha-font-size]').selectOption('20');await p.locator('[data-ha-action="back"]').first().click();await p.locator('[data-ha-action="publish"][data-id="HC-D001"]').click();assert.match(await p.evaluate(()=>HelpStore.published.docs.find(d=>d.id==='HC-D001').zh.html),/font-size:20px/);checks.push('可视化字号选择经草稿保存与发布后保留');
 await p.locator('[data-ha-order="HC-D002"]').fill('1');await p.locator('[data-ha-action="save-order"][data-id="HC-D002"]').click();assert.equal(await p.locator('tbody tr').first().getAttribute('data-ha-row'),'HC-D002');checks.push('手工权重输入与独立保存排序');
 const appUrl=pathToFileURL(path.join(dir,'帮助中心demo.html')).href;
 await p.setViewportSize({width:390,height:867});await p.goto(appUrl+'?capture=1&package=overseas&lang=hi&page=help');await p.screenshot({path:path.join(out,'10-help-hindi.png')});
 await p.locator('[data-doc="HC-OD002"]').click();await p.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await p.screenshot({path:path.join(out,'11-article-hindi.png')});assert.match(await p.locator('.app-header h1').innerText(),/सहायता/);
 for(const viewport of [{width:320,height:740},{width:1040,height:468}]){await p.setViewportSize(viewport);await p.goto(appUrl+`?capture=1&package=overseas&lang=hi&page=help&orientation=${viewport.width>600?'landscape':'portrait'}`);await p.evaluate(()=>{const d=HelpStore.published.docs.find(x=>x.id==='HC-OD001');d.hi.title='सहायता केंद्र की जानकारी और वीडियो पढ़ने के लिए विस्तृत निर्देश '.repeat(6);d.hi.html='<p>'+'बहुत लंबा सर्वर से प्राप्त पाठ '.repeat(100)+'</p>';HelpApp.go('article',d.id);});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await p.evaluate(()=>{const e=document.querySelector('.article-content');return e.scrollWidth>e.clientWidth+1;}),false);}
 checks.push('印地语UI与内容，320竖屏及1040横屏服务端长文案无水平溢出');
 await p.goto(appUrl+'?capture=1&package=overseas&version=0.0.1&page=help');assert.equal(await p.locator('.help-row').count(),4);assert.equal(await p.locator('#version').count(),0);checks.push('帮助内容不按版本筛选，旧版本参数不影响阅读');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'evidence/review-verification.json'),JSON.stringify({status:'pass',checks,errors},null,2));console.log(JSON.stringify({status:'pass',checks},null,2));
}finally{await b.close();}
