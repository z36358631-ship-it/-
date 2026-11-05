const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const HERE=__dirname, target=process.env.HOME_LAB_URL||'file:///'+path.resolve('public/gamehub-home-lab/index.html').replaceAll('\\','/');
const prefix=process.env.HOME_LAB_URL?'live-':'';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],external=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==target)external.push(r.url());});
 await page.goto(target,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>!!window.HOME_LAB);
 const api=async(name,...args)=>page.evaluate(({name,args})=>window.HOME_LAB[name](...args),{name,args});
 const state=()=>api('getState');
 const click=async(selector)=>page.locator('.device '+selector).first().click();
 const settle=()=>page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 const geometry=()=>page.evaluate(()=>{
   const d=document.querySelector('.device'),b=document.querySelector('.app-body');
   return {documentOverflow:document.documentElement.scrollWidth>innerWidth+1,deviceOverflow:d.scrollWidth>d.clientWidth+1,bodyOverflow:b.scrollWidth>b.clientWidth+1,images:[...document.images].filter(i=>i.getBoundingClientRect().width>0).every(i=>i.complete&&i.naturalWidth>0),bodyH:b.clientHeight};
 });
 const ensure=async(label)=>{await settle();const g=await geometry();assert(!g.documentOverflow&&!g.deviceOverflow&&!g.bodyOverflow&&g.images&&g.bodyH>50,label+' '+JSON.stringify(g));return g;};
 for(const direction of ['value','play','content']){
   for(const scenario of ['new','import','steam','weak']){
     await api('reset');await api('setDirection',direction);if(scenario==='weak')await api('setScenario','import');await api('setScenario',scenario);
     for(const form of ['portrait','landscape','tablet']){
       await api('setForm',form);const g=await ensure(direction+'/'+scenario+'/'+form);
       if(form!=='portrait'){
         assert.equal(await page.locator('.land-nav nav button').first().innerText(),'游戏库');
         assert.equal(await page.locator('.device .app-bottom').count(),0);
         assert(!await page.locator('.device').innerText().then(t=>t.includes('继续游戏')));
       }
       const s=await state();assert.equal(s.source,scenario==='new'?'none':scenario==='steam'?'steam':'import');
       checks.push({direction,scenario,form,...g});
     }
   }
 }
 // Same source can move to a cloud path without becoming a different identity.
 for(const source of ['none','import','steam']){
   await api('setScenario',{lifecycle:'new',source,capability:'local',route:'local',match:'matched'});
   await api('setScenario','weak');const s=await state();assert.equal(s.source,source);assert.equal(s.lifecycle,'new');assert.equal(s.route,'cloud');
 }
 checks.push({case:'cloud overlays source and lifecycle',passed:true});
 await api('reset');await api('setDirection','play');await api('setScenario','import');
 await click('[data-action="game"][data-game="hades"]');assert.equal((await state()).page,'game');
 await click('[data-action="player"]');assert.equal((await state()).page,'player');
 assert((await page.locator('#runtime-caption').innerText()).includes('不运行真实游戏'));
 await click('[data-action="back"]');assert.equal((await state()).page,'game');
 await click('[data-action="back"]');assert.equal((await state()).page,'home');
 checks.push({case:'prepared game -> player preview -> detail -> home',passed:true});
 await api('setScenario','new');await click('[data-action="game"][data-game="hades"]');
 assert.equal(await page.locator('.device [data-action="player"]').count(),0);
 await click('[data-action="help"]');assert.equal((await state()).page,'help');
 checks.push({case:'not prepared -> help, never instant start',passed:true});
 for(const match of ['unknown','empty']){
   await api('setScenario',{source:'import',capability:'local',route:'local',match});
   assert.equal(await page.locator('.device .compat-mark').count(),0);
   assert((await page.locator('.app-body').innerText()).length>70);
   await ensure('match-'+match);
 }
 checks.push({case:'unknown / empty compatibility avoids false badges',passed:true});
 await api('reset');await api('setDirection','value');await api('setScenario','import');
 await click('[data-action="cloud-info"]');assert.equal((await state()).page,'cloud-info');
 await click('[data-action="pricing"]');assert.equal((await state()).page,'pricing');
 const pricing=await page.locator('.app-body').innerText();assert(pricing.includes('暂无可选套餐'));assert(!/¥\s*\d|￥\s*\d/.test(pricing));
 assert.equal(await page.locator('.device button[data-action="pay"]:enabled').count(),0);
 checks.push({case:'paid-service conditions -> honest package empty state; no payment',passed:true});
 await api('setDirection','content');await api('setScenario','import');
 const headlines=await page.locator('.editorial-headlines').innerText();
 await click('[data-action="banner"][data-index="1"]');assert.equal(await page.locator('.editorial-headlines').innerText(),headlines);
 await page.locator('.app-body').evaluate(e=>e.scrollTop=240);const scrollBefore=await page.locator('.app-body').evaluate(e=>e.scrollTop);
 await click('.story-card');assert.equal((await state()).page,'article');
 assert(await page.locator('.article-body p').count()>=3);
 await click('[data-action="save"]');assert.equal((await state()).saved.length,1);
 await click('[data-action="back"]');assert.equal((await state()).page,'home');
 assert(Math.abs(await page.locator('.app-body').evaluate(e=>e.scrollTop)-scrollBefore)<5);
 checks.push({case:'independent editorial columns; article, save and scroll-restoring return',passed:true});
 // Regression for concrete scenario-review revisions.
 await api('reset');await api('setScenario','steam');
 await click('[data-action="game"][data-game="hades"]');
 assert.equal(await page.locator('.device [data-action="player"]').count(),0);
 await api('setScenario',{preparation:'ready'});await click('[data-action="game"][data-game="hades"]');
 assert.equal(await page.locator('.device [data-action="player"]').count(),1);
 checks.push({case:'ownership and compatibility do not imply content readiness',passed:true});
 await api('reset');await api('setScenario','weak');await api('setScenario',{route:'local'});
 assert(!await page.locator('.device .app-body').innerText().then(t=>t.includes('云端游戏选题')));
 assert.equal(await page.locator('.device .compat-mark').count(),0);
 checks.push({case:'weak-device user can explicitly keep local route without false compatibility',passed:true});
 await api('reset');await api('setDirection','play');
 assert(!await page.locator('.device .app-body').innerText().then(t=>t.includes('我的游戏 · 本机可玩')));
 assert.equal(await page.locator('.device .game-card').count(),2);
 await api('setDirection','value');
 assert.equal(await page.locator('.app-body > :first-child').getAttribute('class'),'local-entry');
 await api('setDirection','content');
 assert.equal(await page.locator('.story-card').first().getAttribute('data-article'),'routine');
 await click('[data-action="article"][data-article="controls"]');await click('[data-action="follow"]');
 assert.equal((await state()).following.length,1);await click('[data-action="back"]');
 await click('[data-action="article"][data-article="routine"]');
 assert.equal(await page.locator('.device [data-action="follow"]').getAttribute('aria-pressed'),'false');
 checks.push({case:'revised inventory, early library, distinct story and per-topic follow',passed:true});
 // Each concept must have distinct visible subjects, not the same rail rearranged.
 const subjects={};for(const d of ['value','play','content']){await api('setDirection',d);subjects[d]=await page.locator('.app-body h2').allTextContents();}
 assert(new Set(Object.values(subjects).map(JSON.stringify)).size===3);
 checks.push({case:'different content subjects',subjects});
 await page.setViewportSize({width:1440,height:1080});
 for(const direction of ['value','play','content']){
   await api('reset');await api('setDirection',direction);await api('setScenario','import');await settle();
   await page.screenshot({path:path.join(HERE,prefix+'v2-'+direction+'-desktop.png')});
   await page.locator('.device').screenshot({path:path.join(HERE,prefix+'v2-'+direction+'-portrait.png')});
   await api('setForm','landscape');await settle();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'v2-'+direction+'-landscape.png')});
 }
 await api('reset');await api('setScenario','new');await settle();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'v2-play-new.png')});
 await api('setForm','tablet');await settle();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'v2-play-tablet.png')});
 for(const width of [360,390,768]){
   await page.setViewportSize({width,height:1000});await api('reset');await api('setDirection','play');await api('setScenario','import');
   for(const form of ['portrait','landscape','tablet']){await api('setForm',form);checks.push({case:'responsive',width,form,...await ensure(width+'/'+form)});}
 }
 await page.setViewportSize({width:1440,height:1080});await api('reset');await api('setDirection','play');await api('setScenario','steam');await api('setScenario','weak');await settle();
 await page.locator('.device').screenshot({path:path.join(HERE,prefix+'v2-cloud-from-steam.png')});
 await page.locator('[data-action="os"][data-os="ios"]').click();await ensure('ios');assert.equal((await state()).os,'ios');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={status:'passed',artifactSha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve('public/gamehub-home-lab/index.html'))).digest('hex'),scope:'HTML scenario behavior and geometry only; no real users, device benchmark, emulator, payment or cloud session',target,checks,errors,external};
 fs.writeFileSync(path.join(HERE,prefix+'verification.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({status:'passed',checks:checks.length,errors,external}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
