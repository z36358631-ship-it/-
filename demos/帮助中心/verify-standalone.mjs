import {chromium} from 'playwright-core';import {pathToFileURL,fileURLToPath} from 'node:url';import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../public/prd/app-help-center-20260924');
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const results=[];
try{
 const p=await b.newPage({viewport:{width:390,height:844}});await p.goto(pathToFileURL(path.join(dir,'帮助中心demo.html')).href);
 assert.equal(await p.locator('[data-surface="admin"]').count(),0);
 await p.locator('[data-route="help"]').click();await p.locator('#orientation').click();assert.equal(await p.locator('.device.portrait').count(),1);await p.locator('[data-doc="HC-D001"]').click();await p.locator('[data-back]').click();assert.equal(await p.locator('.help-row').count(),4);results.push('独立前端无后台入口；窄屏横屏请求降级单栏，返回列表');
 await p.setViewportSize({width:1440,height:1000});await p.goto(pathToFileURL(path.join(dir,'帮助中心后台demo.html')).href);
 assert.equal(await p.locator('#device').count(),0);assert.match(await p.locator('body').innerText(),/不更新另一份前端 Demo/);
 await p.screenshot({path:path.join(out,'04-admin-nav.png')});await p.locator('[data-ha-action="edit"][data-id="HC-N001"]').click();await p.screenshot({path:path.join(out,'08-admin-nav-editor.png')});await p.locator('[data-ha-action="back"]').first().click();await p.locator('[data-ha-tab="docs"]').click();await p.screenshot({path:path.join(out,'05-admin-docs.png')});await p.locator('[data-ha-action="edit"][data-id="HC-D002"]').click();await p.waitForFunction(()=>document.querySelector('video').readyState>=2);await p.screenshot({path:path.join(out,'06-admin-editor.png'),fullPage:true});
 const busy=await p.evaluate(()=>{HelpStore.pendingMedia.add('HC-D002');const result=HelpStore.publish('docs','HC-D002');HelpStore.pendingMedia.delete('HC-D002');return result;});assert.match(busy,/媒体处理完成/);results.push('独立后台可编辑，媒体处理期间禁止发布本篇');
 await p.locator('[data-ha-title]').fill('独立后台文章');await p.locator('[data-ha-action="back"]').first().click();await p.locator('[data-ha-action="publish"][data-id="HC-D002"]').click();assert.equal(await p.evaluate(()=>HelpStore.published.docs.find(x=>x.id==='HC-D002').zh.title),'独立后台文章');results.push('独立后台草稿修改与逐条发布');
 console.log(JSON.stringify({status:'pass',results},null,2));fs.writeFileSync(path.join(dir,'evidence/standalone-verification.json'),JSON.stringify({status:'pass',results},null,2));
}finally{await b.close();}
