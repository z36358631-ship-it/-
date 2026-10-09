import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const evidenceDir=path.resolve('test-results/compatibility-review-v1.2/2026-10-09-mac-parameters');
const demoPath=path.resolve('demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-Mac端demo.html');
const baselinePath=path.resolve('.codex-worktrees/compatibility-review-final-main/demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-Mac端demo.html');
const publicSnapshot=path.resolve('public/prd/compatibility-review-v1.2/m04-snapshot.png');
const expectedFields=[
 ['steamInput','Steam Input（实验性）','关闭'],
 ['environmentVariables','环境变量','未设置'],
 ['launchArguments','启动参数','未设置'],
 ['compatibilityLayer','兼容层','wine-proton_11.0'],
 ['synchronizationMode','同步模式','MSync'],
 ['skipVideoDecoding','跳过音视频解码','关闭'],
 ['controllerCompatibility','手柄兼容模式','开启'],
 ['avx','AVX 指令集','关闭'],
 ['graphicsTranslation','切换图形栈','gptk-3.0-3'],
 ['openGL','切换 OpenGL','builtin'],
 ['moltenVK','切换 MoltenVK','builtin']
];
const evidence={status:'RUNNING',date:'2026-10-09',demo:demoPath,checks:[],responsive:[],errors:[]};
await fs.mkdir(evidenceDir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let context;
function passed(name,details={}){evidence.checks.push({name,status:'PASS',...details})}
async function valueOf(page,key){return page.locator('[data-parameter="'+key+'"] dd').textContent()}
async function assertNoOverflow(page){
 const metrics=await page.locator('.dialog').evaluate(element=>{
  const rect=element.getBoundingClientRect();
  return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,viewportWidth:innerWidth,viewportHeight:innerHeight,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight};
 });
 assert.ok(metrics.x>=0&&metrics.x+metrics.width<=metrics.viewportWidth+1,'dialog stays inside viewport horizontally');
 assert.ok(metrics.y>=0&&metrics.y+metrics.height<=metrics.viewportHeight+1,'dialog stays inside viewport vertically');
 assert.ok(metrics.scrollWidth<=metrics.clientWidth+1,'dialog has no horizontal overflow');
 for(const overflow of await page.locator('.snapshot-parameter dd').evaluateAll(elements=>elements.map(e=>({key:e.parentElement.dataset.parameter,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}))))assert.ok(overflow.scrollWidth<=overflow.clientWidth+1,overflow.key+' wraps without horizontal overflow');
 return metrics;
}
async function getSnapshot(page,id){return page.evaluate(id=>macCompatibilityDemo.getReviews().find(r=>r.id===id).snapshot,id)}
async function installParameters(page,parameters,id='m1'){
 await page.evaluate(({parameters,id})=>{macReviews.find(r=>r.id===id).snapshot.parameters=parameters;macCompatibilityDemo.openSnapshot(id)},{parameters,id});
}

try{
 context=await browser.newContext({viewport:{width:1440,height:1100}});
 const page=await context.newPage();
 page.on('pageerror',error=>evidence.errors.push(error.message));
 // Preserve a view of the prior published/source version before testing the new details.
 await page.goto(pathToFileURL(baselinePath).href);
 await page.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
 await page.screenshot({path:path.join(evidenceDir,'baseline.png'),fullPage:true});
 const oldReviews=await page.evaluate(()=>macCompatibilityDemo.getReviews());
 passed('baseline captured',{file:'baseline.png'});
 await page.goto(pathToFileURL(demoPath).href);
 await page.evaluate(()=>macCompatibilityDemo.reset());
 await page.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
 assert.deepEqual(await page.locator('.snapshot-group h3').allTextContents(),['Steam','通用','兼容性','图形']);
 assert.deepEqual(await page.locator('.snapshot-parameter dt').allTextContents(),expectedFields.map(([,label])=>label));
 for(const [key,,value] of expectedFields)assert.equal(await valueOf(page,key),value,key+' screenshot value');
 passed('eleven user-visible labels, group order, screenshot values and explicit empty values',{fields:expectedFields.map(([,label,value])=>({label,value}))});
 assert.equal(await page.locator('#macApplyConfig').isDisabled(),true);
 assert.equal(await page.locator('#macCopyConfig').isEnabled(),true);
 assert.match(await page.locator('.notice.warn').innerText(),/当前芯片与配置芯片不同/);
 const originalCross=await getSnapshot(page,'m2');
 await page.click('#macCopyConfig');
 const copiedCross=await page.evaluate(()=>JSON.parse(localStorage.getItem('gh-mac-local-schemes')).find(r=>r.sourceReviewId==='m2'));
 assert.deepEqual(copiedCross.parameters,originalCross.parameters);
 assert.deepEqual(await getSnapshot(page,'m2'),originalCross);
 assert.equal(await page.evaluate(()=>localStorage.getItem('gh-mac-active-scheme')),null);
 passed('cross-chip view/copy preserves all parameters and cannot apply');
 await page.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
 await assertNoOverflow(page);
 await page.screenshot({path:path.join(evidenceDir,'snapshot-cross-chip.png'),fullPage:true});
 await page.screenshot({path:publicSnapshot,fullPage:true});

 for(const width of [1440,900,600]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
  const metrics=await assertNoOverflow(page);
  await page.getByRole('button',{name:'关闭',exact:true}).scrollIntoViewIfNeeded();
  assert.ok(await page.getByRole('button',{name:'关闭',exact:true}).isVisible());
  await page.getByRole('button',{name:'复制到本地',exact:true}).scrollIntoViewIfNeeded();
  const actionRect=await page.locator('#macCopyConfig').boundingBox();
  assert.ok(actionRect.y>=0&&actionRect.y+actionRect.height<=900,'copy action remains reachable');
  assert.ok(await page.locator('#macApplyConfig').isVisible());
  await page.screenshot({path:path.join(evidenceDir,'snapshot-cross-chip-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert.equal(await page.getByRole('dialog').count(),0);
  evidence.responsive.push({width,...metrics,closeAndActionsReachable:true});
 }
 passed('1440/900/600 dialogs remain in viewport, scroll vertically as needed, actions and close are reachable');

 await page.setViewportSize({width:1440,height:1100});
 await installParameters(page,{});
 for(const [key]of expectedFields)assert.equal(await valueOf(page,key),'未记录',key+' missing');
 await installParameters(page,null);
 for(const [key]of expectedFields)assert.equal(await valueOf(page,key),'未记录',key+' null parameter container');
 const invalids={steamInput:'false',skipVideoDecoding:0,controllerCompatibility:null,avx:'true',environmentVariables:null,launchArguments:42,compatibilityLayer:null,synchronizationMode:1,graphicsTranslation:{},openGL:false,moltenVK:[]};
 await installParameters(page,invalids);
 for(const [key]of expectedFields)assert.equal(await valueOf(page,key),'未记录',key+' malformed value');
 for(const environmentVariables of [[null],[{name:'VALID',value:1}],[{name:'',value:'valid'}],[{name:'VALID'}]]){
  await installParameters(page,{...originalCross.parameters,environmentVariables});
  assert.equal(await valueOf(page,'environmentVariables'),'未记录','malformed environment row');
 }
 passed('missing/null/malformed values display 未记录, including booleans that must not become 关闭');

 const nonempty={...originalCross.parameters,steamInput:true,environmentVariables:[{name:'WINEDEBUG',value:'-all'},{name:'CUSTOM_<img src=x onerror="window.__snapshotXss=1">',value:'<script>window.__snapshotXss=2</script>&"\n第二行'}],launchArguments:'--config="'+('非常长的参数片段<svg onload="window.__snapshotXss=3">&'.repeat(75))+'"\n--second-line=true'};
 await installParameters(page,nonempty);
 assert.equal(await valueOf(page,'environmentVariables'),nonempty.environmentVariables.map(item=>item.name+'='+item.value).join('\n'));
 assert.equal(await valueOf(page,'launchArguments'),nonempty.launchArguments);
 assert.equal(await valueOf(page,'steamInput'),'开启');
 assert.equal(await page.locator('.snapshot-parameter dd img, .snapshot-parameter dd script, .snapshot-parameter dd svg').count(),0);
 assert.equal(await page.evaluate(()=>window.__snapshotXss),undefined);
 for(const width of [1440,900,600]){
  await page.setViewportSize({width,height:900});
  await assertNoOverflow(page);
 }
 passed('environment name/value rows and long arguments remain complete, wrap, and are HTML-safe',{argumentCharacters:nonempty.launchArguments.length,environmentRows:nonempty.environmentVariables.length});

 const sourceMatch=await getSnapshot(page,'m1');
 await page.click('#macCopyConfig');
 const copiedMatch=await page.evaluate(()=>JSON.parse(localStorage.getItem('gh-mac-local-schemes')).find(r=>r.sourceReviewId==='m1'));
 assert.deepEqual(copiedMatch.parameters,sourceMatch.parameters);
 assert.deepEqual(await getSnapshot(page,'m1'),sourceMatch);
 assert.ok(await page.locator('#macApplyConfig').isEnabled());
 await page.click('#macApplyConfig');
 assert.equal(await page.getByRole('heading',{name:'应用配置',exact:true}).count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('gh-mac-active-scheme')),null,'confirmation does not apply yet');
 await page.getByRole('button',{name:'取消',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('gh-mac-active-scheme')),null,'cancel leaves current scheme alone');
 await page.click('#macApplyConfig');
 await page.getByRole('button',{name:'确认应用',exact:true}).click();
 const applied=await page.evaluate(()=>JSON.parse(localStorage.getItem('gh-mac-active-scheme')));
 assert.deepEqual(applied,sourceMatch);
 assert.deepEqual(await getSnapshot(page,'m1'),sourceMatch);
 passed('matching-chip copy/apply keeps all eleven source values, requires confirmation and does not modify the snapshot');
 // Capture the normal matched-chip example separately from the deliberately long unsafe test strings.
 await page.setViewportSize({width:1440,height:1100});
 await installParameters(page,originalCross.parameters);
 await page.screenshot({path:path.join(evidenceDir,'snapshot-same-chip.png'),fullPage:true});

 const oldSeed=oldReviews.find(r=>r.id==='m1');
 const cancelled=oldReviews.find(r=>r.id==='m3');
 const existing=oldReviews.find(r=>r.id==='m2');
 delete oldSeed.snapshot.parameters;
 oldSeed.text='用户已编辑的评价，升级时不能改写';oldSeed.likes=73;oldSeed.supported=true;
 delete cancelled.snapshot;
 existing.snapshot.parameters={steamInput:true,compatibilityLayer:'user-selected-version'};
 const external={...structuredClone(oldSeed),id:'user-existing-without-parameters',name:'真实用户示例'};
 oldReviews.push(external);
 await page.evaluate(reviews=>localStorage.setItem('gh-compatibility-mac-v12',JSON.stringify(reviews)),oldReviews);
 await page.reload();
 const migrated=await page.evaluate(()=>macCompatibilityDemo.getReviews());
 const restored=migrated.find(r=>r.id==='m1');
 assert.equal(restored.text,oldSeed.text);assert.equal(restored.likes,73);assert.equal(restored.supported,true);
 assert.deepEqual(restored.snapshot.parameters,originalCross.parameters);
 assert.equal(Object.hasOwn(migrated.find(r=>r.id==='m3'),'snapshot'),false,'cancelled share remains cancelled');
 assert.deepEqual(migrated.find(r=>r.id==='m2').snapshot.parameters,existing.snapshot.parameters,'existing incomplete parameters not overwritten by demo defaults');
 assert.equal(Object.hasOwn(migrated.find(r=>r.id===external.id).snapshot,'parameters'),false,'non-seed historical snapshot not filled with sample values');
 await page.evaluate(()=>macCompatibilityDemo.openSnapshot('m2'));
 assert.equal(await valueOf(page,'steamInput'),'开启');
 assert.equal(await valueOf(page,'compatibilityLayer'),'user-selected-version');
 assert.equal(await valueOf(page,'avx'),'未记录');
 passed('old demo seed migration fills absent parameters only; text, support, cancellation and existing partial parameters preserved');
 assert.deepEqual(evidence.errors,[]);
 evidence.status='PASS';
 console.log('PASS: Mac snapshot parameters, data preservation, copy/apply, responsive display and legacy cache migration');
}catch(error){
 evidence.status='FAIL';evidence.failure={message:error.message,stack:error.stack};
 console.error(error.stack);process.exitCode=1;
}finally{
 await fs.writeFile(path.join(evidenceDir,'snapshot-parameters.json'),JSON.stringify(evidence,null,2)+'\n');
 await context?.close();await browser.close();
}
