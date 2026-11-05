const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const HERE=__dirname,target=process.env.HOME_LAB_URL||'file:///'+path.resolve('public/gamehub-home-lab/index.html').replaceAll('\\','/');
const prefix=process.env.HOME_LAB_URL?'live-':'';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1080},hasTouch:true}),errors=[],requests=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==target)requests.push(r.url());});
 const response=await page.goto(target,{waitUntil:'load',timeout:60000});
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.resolve('public/gamehub-home-lab/index.html'))).digest('hex');
 if(process.env.HOME_LAB_URL){assert.equal(response.status(),200);assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),hash);}
 await page.waitForFunction(()=>window.HOME_LAB);
 const api=(name,...args)=>page.evaluate(({name,args})=>HOME_LAB[name](...args),{name,args});
 const state=()=>api('getState'),click=async s=>page.locator('.device '+s).first().click();
 const record=(name,details={})=>checks.push({case:name,passed:true,...details});
 const ensure=async label=>{await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));const g=await page.evaluate(()=>{const d=document.querySelector('.device'),b=document.querySelector('.app-body');return {windowOverflow:document.documentElement.scrollWidth>innerWidth+1,bodyOverflow:b.scrollWidth>b.clientWidth+1,deviceOverflow:d.scrollWidth>d.clientWidth+1,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),height:b.clientHeight};});assert(!g.windowOverflow&&!g.bodyOverflow&&!g.deviceOverflow&&g.images&&g.height>50,label+JSON.stringify(g));};
 const snap=async name=>{await ensure(name);await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r7-'+name+'.png')});};
 await api('reset');assert.deepEqual(await page.locator('.home-shortcuts b').allTextContents(),['兼容性查询','喜加一','游戏日历','盖世讨论区']);assert.equal((await state()).direction,'play');assert.equal(await page.locator('#direction-controls button').count(),1);record('selected direction is default and sole visible review direction');
 for(const scenario of ['new','import','steam','weak'])for(const form of ['portrait','landscape','tablet']){
  await api('reset');await api('setScenario',scenario);await api('setForm',form);await ensure(scenario+'/'+form);
  const modules=await page.locator('.app-body [data-module]').evaluateAll(es=>es.map(e=>e.dataset.module));
  for(const key of ['calendar','latest-compatibility','community-picks','tasks','instant','team','shortcuts'])assert(modules.includes(key),key);
  for(const key of ['discounts','giveaways','compatible-feature'])assert(!modules.includes(key),key);
  assert.equal(await page.locator('.device video').count(),0);assert.equal(await page.locator('.device [data-action="purchase-rental"]').count(),0);
  assert.equal(await page.locator('.home-shortcuts button').count(),4);
  if(form==='portrait'){assert.deepEqual(await page.locator('.app-bottom button').allTextContents(),['首页','排行榜','游戏库','社区','我的']);assert.equal(modules.includes('continue'),scenario==='import');}
  else{assert.equal(await page.locator('.land-nav nav button').first().innerText(),'游戏库');assert.equal(await page.locator('.app-bottom').count(),0);assert(!modules.includes('continue'));}
  if(form==='landscape'){const ratio=await page.locator('.home-feature-row').evaluate(e=>{const a=e.querySelector('.operations-slot').getBoundingClientRect(),b=e.querySelector('.home-shortcuts').getBoundingClientRect();return {ratio:a.width/b.width,sameY:Math.abs(a.top-b.top)<1,ordered:a.right<b.left};});assert(Math.abs(ratio.ratio-4)<.03&&ratio.sameY&&ratio.ordered,JSON.stringify(ratio));}
  if(scenario==='import')await snap(form+'-home');record('scenario/layout',{scenario,form});
 }
 await api('reset');
 assert.deepEqual(await page.locator('.channel-tabs button').allTextContents(),['推荐','PC游戏','兼容游戏','云游戏','云游组队玩','复古游戏']);
 for(const [channel,label] of [['local-list','PC游戏'],['compatibility','兼容游戏'],['cloud-list','云游戏'],['team-list','云游组队玩'],['retro-list','复古游戏'],['home','推荐']]){
  await click('[data-channel="'+channel+'"]');assert.equal((await state()).page,channel);assert.equal(await page.locator('.channel-tabs .is-selected').innerText(),label);assert.equal(await page.locator('.app-bottom .is-selected').innerText(),'首页');assert.equal(await page.locator('.device .back-button').count(),0);await ensure(channel);
 }
 record('six original home channels, compatibility placement and channel switching');
 for(const form of ['portrait','landscape','tablet']){await api('setForm',form);assert.equal(await page.locator('.local-collection-icon-row').count(),2);assert.equal(await page.locator('.local-collection-game').count(),6);assert(await page.locator('.local-collection-game>img').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1;})));await page.locator('.local-collection').scrollIntoViewIfNeeded();await snap(form+'-collection');}
 record('two-row square icon collection in portrait, landscape and tablet');
 await api('reset');await click('.local-collection-card');await click('.fit-page .game-card[data-game="cyber"]');assert.equal((await state()).page,'game');assert.equal(await page.locator('.device [data-action="player"]').count(),0);record('additional collection samples do not imply game content is prepared');
 await api('reset');
 assert.equal(await page.locator('.community-page').count(),2);for(const group of await page.locator('.community-page').all())assert.equal(await group.locator('.community-list-item').count(),3);
 assert(await page.locator('.community-list-item').first().evaluate(e=>e.querySelector('.community-item-copy').getBoundingClientRect().right<=e.querySelector('img').getBoundingClientRect().left));
 await click('[data-action="community-page"][data-index="1"]');await page.waitForFunction(()=>document.querySelector('.community-carousel').scrollLeft>100);
 await click('.community-page:nth-child(2) .community-list-item');assert.equal((await state()).page,'article');await click('[data-action="save"]');assert.equal((await state()).saved.length,1);await click('[data-action="back"]');assert.equal((await state()).communityPage,1);record('three-row community pagination, article and return');
 const config=await page.evaluate(()=>JSON.parse(JSON.stringify(LAB_CONTENT.operations)));
 await page.evaluate(()=>{LAB_CONTENT.operations.homeOrder=['latest','collections','community'];HOME_LAB.setForm('portrait');});
 assert.equal(await page.locator('.concept-discover > .app-section:not(.ret-continue)').first().locator('h2').innerText(),'盖世最新兼容');
 await page.evaluate(()=>{LAB_CONTENT.operations.collections=[];LAB_CONTENT.operations.communityPages=[];LAB_CONTENT.operations.latestGames=[];LAB_CONTENT.operations.banners=[];LAB_CONTENT.operations.shortcuts=[];HOME_LAB.setForm('landscape');});
 assert.equal(await page.locator('.device .app-section,.device .operations-slot,.device .home-shortcuts,.device .community-module').count(),0);
 await page.evaluate(c=>{Object.assign(LAB_CONTENT.operations,c);HOME_LAB.reset();},config);record('configured section order and empty configuration hiding');
 await page.evaluate(()=>{LAB_CONTENT.operations.taskIds=[];HOME_LAB.reset();});assert.equal(await page.locator('[data-module="tasks"]').count(),0);
 await page.evaluate(c=>{LAB_CONTENT.operations.taskIds=c.taskIds;HOME_LAB.reset();},config);assert.equal(await page.locator('.ret-task-buttons button').count(),3);record('task content configuration and empty hiding');
 await click('.local-collection-card');assert.equal((await state()).page,'compatibility');assert.equal(await page.locator('.channel-tabs .is-selected').innerText(),'兼容游戏');assert.equal(await page.locator('.app-bottom .is-selected').innerText(),'首页');assert.equal(await page.locator('.fit-page .game-card').count(),6);
 await page.selectOption('[data-fit="genre"]','rogue');assert.equal(await page.locator('.fit-page .game-card').count(),1);await page.selectOption('[data-fit="device"]','other');assert((await page.locator('.fit-page').innerText()).includes('暂无该机型数据'));assert.equal(await page.locator('.fit-page .compat-mark').count(),0);record('collection enters compatibility tab and model/type filters');
 await api('reset');for(const match of ['unknown','empty']){await api('setScenario',{match});assert.equal(await page.locator('.device .compat-mark').count(),0);await click('.channel-tabs [data-action="compatibility"]');assert.equal(await page.locator('.fit-page .game-card').count(),0);await ensure('compatibility '+match);}
 record('unknown and unmatched devices avoid false compatibility');
 await api('reset');await click('.local-collection-card');await api('setForm','landscape');assert.equal(await page.locator('.land-nav .is-selected').innerText(),'首页');await api('setForm','portrait');await click('.fit-page .game-card');assert.equal((await state()).page,'game');await click('[data-action="player"]');assert.equal((await state()).page,'player');await click('[data-action="back"]');await click('[data-action="back"]');assert.equal((await state()).page,'compatibility');record('compatible game detail and prepared game preview');
 for(const route of ['ret-calendar','latest-compatibility'])for(const form of ['portrait','landscape','tablet']){
  await api('reset');await api('setForm',form);await click('.section-heading [data-action="'+route+'"]');assert.equal((await state()).page,route);
  assert.equal(await page.locator('.device .back-button').innerText(),'‹');assert.equal(await page.locator('.timeline-page select').count(),0);assert(await page.locator('.timeline-day').count()>0);
  await click('[data-action="timeline-month"][data-month="2026-12"]');assert.equal(await page.locator('.timeline-empty').count(),1);
  await click('[data-action="timeline-today"]');assert((await page.locator('.timeline-month-title').innerText()).includes('2026 年 11 月'));assert(await page.locator('.timeline-day').count()>0);
  const key=route==='ret-calendar'?'retReleaseSubscribed':'latestCompatSubscribed';await click('[data-action="timeline-subscribe"]');assert.equal((await state())[key],true);
  await snap(route+'-'+form);assert(await page.locator('.timeline-subscription').evaluate(e=>{const r=e.getBoundingClientRect(),b=document.querySelector('.app-body').getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom+1;}));
  await click('[data-action="back"]');assert.equal((await state()).page,'home');await click('.section-heading [data-action="'+route+'"]');assert.equal((await state())[key],true);await click('[data-action="timeline-subscribe"]');assert.equal((await state())[key],false);record('date timeline, empty month, today, subscription and return',{route,form});
 }
 await api('reset');await click('.home-shortcuts [data-action="ret-giveaways"]');assert.deepEqual(await page.locator('.ret-platform-tabs button').evaluateAll(es=>es.map(e=>e.dataset.platform)),['epic','steam']);
 for(const platform of ['epic','steam']){await click('[data-action="ret-platform"][data-platform="'+platform+'"]');await click('[data-action="ret-subscribe"]');assert.equal((await state()).retSubscriptions[platform],true);}
 assert.equal(await page.locator('.ret-giveaway-page [data-action="ret-widget"]').count(),0);record('two-platform giveaway subscription without duplicate widget entry');
 await api('reset');await click('.home-checkin');assert.equal((await state()).page,'ret-task-center');await click('[data-task="checkin"]');await click('[data-action="ret-checkin"]');assert((await state()).retSigned);record('task center and checkin');
 for(const form of ['portrait','landscape','tablet']){await api('reset');await api('setForm',form);await click('.home-shortcuts [data-action="ret-calendar"]');assert.equal((await state()).page,'ret-calendar');await click('[data-action="back"]');await click('.home-shortcuts [data-action="gamehub-forum"]');assert.equal((await state()).page,'gamehub-forum');assert.equal(await page.locator('.subheader h2').innerText(),'盖世游戏');assert.equal(await page.locator('[data-community-section="gamehub"]').count(),1);assert.equal(await page.locator((form==='portrait'?'.app-bottom':'.land-nav')+' .is-selected').innerText(),'社区');await click('[data-action="forum-tab"][data-tab="guide"]');await ensure('forum '+form);await snap('forum-'+form);await click('.forum-feed [data-action="article"]');assert.equal((await state()).page,'article');await click('[data-action="back"]');assert.equal((await state()).page,'gamehub-forum');await click('[data-action="back"]');assert.equal((await state()).page,'home');record('four shortcuts and direct GameHub subsection with nested return',{form});}
 await api('reset');assert.equal(await page.locator('.channel-tabs .nav-update').count(),1);await click('.channel-tabs [data-action="compatibility"]');assert.equal(await page.locator('.channel-tabs .nav-update').count(),0);await click('.app-bottom [data-page="community"]');assert.equal(await page.locator('.app-bottom .nav-update').count(),0);record('independent tab update badges clear on visiting');
 for(const width of [375,768])for(const form of ['portrait','landscape','tablet']){await page.setViewportSize({width,height:1000});await api('reset');await api('setForm',form);await ensure(width+'/'+form);record('narrow viewport no clipping',{width,form});}
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);record('no runtime errors or external runtime resources');
 const result={version:'r7.3',status:'passed',artifactSha256:hash,target,checks:checks.length,results:checks,errors,externalRequests:requests};
 fs.writeFileSync(path.join(HERE,prefix+'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,sha256:hash,target}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
