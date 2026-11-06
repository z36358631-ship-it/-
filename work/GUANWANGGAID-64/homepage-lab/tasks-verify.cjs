const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),vm=require('vm');
const HERE=__dirname,ROOT=path.resolve(HERE,'../../..'),EVIDENCE=path.join(HERE,'tasks-evidence');
const html=path.join(ROOT,'public/gamehub-home-lab/index.html');
const jsFile=path.join(HERE,'tasks-revision.js'),cssFile=path.join(HERE,'tasks-revision.css');
const source=fs.readFileSync(jsFile,'utf8'),stylesheet=fs.readFileSync(cssFile,'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');

(async()=>{
 fs.mkdirSync(EVIDENCE,{recursive:true});
 const checks=[],errors=[],externalRequests=[];
 const record=(name,details={})=>checks.push({case:name,passed:true,...details});
 const sandbox={window:{}};vm.runInNewContext(source,sandbox);
 const demoState={retSigned:false,retTaskTab:'daily',pointsBalance:45,signInReward:3,page:'ret-task'};
 const action=(label,name,attrs='',classes='')=>`<button data-action="${name}" class="${classes}" ${attrs}>${label}</button>`;
 const module=sandbox.window.LAB_TASKS_REVISION.create({state:demoState,esc:String,action,go:name=>demoState.page=name,render:()=>{},getScroll:()=>0});
 for(let n=0;n<3;n++)module.handle('ret-checkin');
 assert.equal(demoState.retSigned,true);assert.equal(demoState.pointsBalance,45);assert.equal(demoState.signInReward,3);
 assert(module.renderSignIn().includes('+3'));assert(!module.renderSignIn().includes('tasks-revision-tabs'));
 record('repeated sign-in changes local sign-in flag only; supplied balances and rewards remain unchanged');
 const unknown=sandbox.window.LAB_TASKS_REVISION.create({state:{},esc:String,action,go:()=>{},render:()=>{},getScroll:()=>0});
 assert(!unknown.renderSignIn().includes('积分待配置'));assert(unknown.renderSignIn().includes('>—</strong>'));
 record('unknown numeric values render a dash without a fabricated amount');

 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url()))externalRequests.push(r.url());});
 await page.goto('file:///'+html.replaceAll('\\','/'),{waitUntil:'load'});
 await page.waitForFunction(()=>window.HOME_LAB);
 const built=fs.readFileSync(html,'utf8').replace(/\r\n/g,'\n');
 const builtContainsRevision=built.includes(source.replace(/\r\n/g,'\n').trim())&&built.includes(stylesheet.replace(/\r\n/g,'\n').trim());
 if(!builtContainsRevision){await page.addScriptTag({path:jsFile});await page.addStyleTag({content:stylesheet});}
 const api=(name,...args)=>page.evaluate(({name,args})=>HOME_LAB[name](...args),{name,args});
 const state=()=>api('getState');
 const click=selector=>page.locator('.device '+selector).first().click();
 const ensure=async label=>{
   const facts=await page.evaluate(()=>{
     const body=document.querySelector('.app-body'),device=document.querySelector('.device');
     return {bodyOverflow:body.scrollWidth>body.clientWidth+1,deviceOverflow:device.scrollWidth>device.clientWidth+1,bodyHeight:body.clientHeight,controls:[...document.querySelectorAll('.tasks-revision-tabs button,.tasks-revision-row button')].map(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))};
   });
   assert(!facts.bodyOverflow&&!facts.deviceOverflow&&facts.bodyHeight>50,label+JSON.stringify(facts));
   assert(facts.controls.every(item=>item.height>=44&&item.width>=44),label+' small target '+JSON.stringify(facts.controls));
 };
 const snap=async name=>{await ensure(name);await page.locator('.device').screenshot({path:path.join(EVIDENCE,name+'.png')});};
 await api('reset');await click('.home-checkin');
 assert.equal((await state()).page,'ret-task');assert.equal((await state()).retSigned,true);
 assert.equal(await page.locator('.tasks-revision-checkin h2').textContent(),'今日已签到');
 assert.equal(await page.locator('.tasks-revision-tabs').count(),0);
 assert.equal(await page.locator('.tasks-revision-entry button').textContent(),'获得更多积分');
 await snap('signin-portrait');
 await click('[data-action="ret-task-center"]');
 assert.equal((await state()).page,'ret-task-center');
 assert.deepEqual(await page.locator('.tasks-revision-tabs button').allTextContents(),['每日任务','成长任务']);
 assert.equal(await page.locator('.tasks-revision-done').textContent(),'已签到');
 assert.equal(await page.locator('.tasks-revision-done').isDisabled(),true);
 assert.equal(await page.locator('[data-task="ad"]').isDisabled(),true);
 await snap('center-daily-portrait');
 await click('[data-action="ret-task-tab"][data-tab="growth"]');
 assert.equal(await page.locator('.tasks-revision-empty h3').textContent(),'暂无成长任务');
 assert.equal(await page.locator('.tasks-revision-row').count(),0);
 await snap('center-growth-portrait');
 await click('[data-action="ret-task-tab"][data-tab="daily"]');
 for(const [task,target] of [['play','library'],['community','community'],['comment','community'],['share','community']]){
   await click(`[data-task="${task}"]`);assert.equal((await state()).page,target);
   await click('[data-action="back"]');assert.equal((await state()).page,'ret-task-center');
 }
 record('sign-in → more points → separate task center; two task groups, disabled ad and signed state, existing task routes and back');
 await click('[data-action="back"]');assert.equal((await state()).page,'ret-task');
 await click('[data-action="back"]');assert.equal((await state()).page,'home');
 const before=await state();await click('.home-checkin');const after=await state();
 assert.equal(after.retSigned,true);assert.equal(after.pointsBalance,before.pointsBalance);
 assert.equal(await page.locator('.tasks-revision-signin [data-action="ret-checkin"]').count(),0);
 record('return to home and sign in again preserves signed state without awarding points twice');

 for(const os of ['android','ios'])for(const region of ['domestic','overseas'])for(const form of ['portrait','landscape','tablet']){
   await api('reset');await api('setPlatform',{os,region});await api('setForm',form);
   await click('.home-checkin');await ensure(`${os}/${region}/${form}/signin`);
   assert.equal((await state()).retSigned,true);
   await click('[data-action="ret-task-center"]');await ensure(`${os}/${region}/${form}/center`);
   assert.equal(await page.locator('.tasks-revision-row').count(),6);
   if(os==='android'&&region==='domestic'&&form!=='portrait'){
     await snap('center-'+form);await click('[data-action="back"]');await snap('signin-'+form);
   }
   record('system/market/device sign-in and task center',{os,region,form});
 }
 await api('reset');await api('setForm','portrait');await click('.home-checkin');await click('[data-action="ret-task-center"]');
 await page.setViewportSize({width:390,height:900});await ensure('narrow viewport');
 await snap('center-narrow');record('narrow viewport retains readable controls and no horizontal body overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
 const result={status:'passed',sourceMode:builtContainsRevision?'built public HTML':'current public HTML with exact tasks JS/CSS injected for source-level integration; root must rebuild the public artifact',htmlSha256:hash(fs.readFileSync(html)),tasksJsSha256:hash(source),tasksCssSha256:hash(stylesheet),checks,errors,externalRequests,limits:['Local HTML demonstration only; no point award, account persistence, ad SDK or real task completion service.','Growth-task details and reward numbers were not provided; growth uses the existing empty state.','Screenshot is a structural reference, not a whole-page pixel reproduction.']};
 fs.writeFileSync(path.join(EVIDENCE,'verification.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({status:result.status,sourceMode:result.sourceMode,checks:checks.length,errors:errors.length,externalRequests:externalRequests.length}));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
