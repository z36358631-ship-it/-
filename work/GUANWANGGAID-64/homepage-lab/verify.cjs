const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const HERE=__dirname,target=process.env.HOME_LAB_URL||'file:///'+path.resolve('public/gamehub-home-lab/index.html').replaceAll('\\','/');
const prefix=process.env.HOME_LAB_URL?'live-':'';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1080},hasTouch:true}),errors=[],external=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==target)external.push(r.url());});
 const response=await page.goto(target,{waitUntil:'load',timeout:60000});if(process.env.HOME_LAB_URL){assert.equal(response.status(),200);assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),crypto.createHash('sha256').update(fs.readFileSync(path.resolve('public/gamehub-home-lab/index.html'))).digest('hex'),'live bytes must equal reviewed artifact');}await page.waitForFunction(()=>!!window.HOME_LAB);
 const api=(name,...args)=>page.evaluate(({name,args})=>HOME_LAB[name](...args),{name,args});
 const state=()=>api('getState');const click=async s=>page.locator('.device '+s).first().click();
 const settle=()=>page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
 const body=()=>page.locator('.app-body').innerText();
 const ensure=async label=>{await settle();const g=await page.evaluate(()=>{const d=document.querySelector('.device'),b=document.querySelector('.app-body');return {windowOverflow:document.documentElement.scrollWidth>innerWidth+1,bodyOverflow:b.scrollWidth>b.clientWidth+1,deviceOverflow:d.scrollWidth>d.clientWidth+1,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),height:b.clientHeight};});assert(!g.windowOverflow&&!g.bodyOverflow&&!g.deviceOverflow&&g.images&&g.height>50,label+' '+JSON.stringify(g));return g;};
 const record=(name,details={})=>checks.push({case:name,passed:true,...details});
 for(const direction of ['value','play','content','deals'])for(const scenario of ['new','import','steam','weak']){
   await api('reset');await api('setDirection',direction);await api('setScenario',scenario);
   for(const form of ['portrait','landscape','tablet']){
     await api('setForm',form);await ensure(direction+'/'+scenario+'/'+form);
     const modules=await page.locator('.app-body [data-module]').evaluateAll(es=>es.map(e=>e.dataset.module));
     for(const name of ['community-picks','calendar','discounts','giveaways','tasks','instant','team'])assert(modules.includes(name),direction+' missing '+name);
     assert(modules.includes({value:'owned-experience',play:'play-discovery',content:'daily-brief',deals:'deal-discovery'}[direction]));
     if(form!=='portrait'){assert.equal(await page.locator('.land-nav nav button').first().innerText(),'游戏库');assert.equal(await page.locator('.device .app-bottom').count(),0);assert(!modules.includes('continue'));}
     if(scenario!=='import')assert(!modules.includes('continue'));
     assert.equal(await page.locator('.community-page').count(),2);
     for(const group of await page.locator('.community-page').all())assert.equal(await group.locator('.community-list-item').count(),3);
     const layout=await page.locator('.community-page').first().locator('.community-list-item').first().evaluate(e=>{const t=e.querySelector('.community-item-copy').getBoundingClientRect(),i=e.querySelector('img').getBoundingClientRect();return t.right<=i.left&&i.width>=80&&i.height>=40;});assert(layout,'left text/right image');
     assert.equal(await page.locator('[data-module="instant"] .heading-link,[data-module="team"] .heading-link').count(),0);
     assert.equal(await page.locator('[data-module="shortcuts"] button').count(),4);
     const tasks=await page.locator('.ret-task-buttons button').allTextContents();assert.deepEqual(tasks,['签到','畅玩游戏','社区互动']);
     assert(await page.locator('.ret-task-buttons').evaluate(e=>{const a=[...e.children].map(x=>x.getBoundingClientRect());return Math.max(...a.map(x=>x.top))-Math.min(...a.map(x=>x.top))<2;}));
     record('concept/scenario/form',{direction,scenario,form});
   }
 }
 // Three first tasks actually differ, including contents beyond the common modules.
 await api('reset');await api('setDirection','value');
 const ownIds=await page.locator('.concept-two-stories [data-article]').evaluateAll(es=>es.map(e=>e.dataset.article));
 await click('[data-action="focus-game"][data-game="elden"]');assert.equal((await state()).focusGame,'elden');
 const changedIds=await page.locator('.concept-two-stories [data-article]').evaluateAll(es=>es.map(e=>e.dataset.article));assert.notDeepEqual(ownIds,changedIds);
 await click('.concept-focus-world [data-action="article"]');assert.equal((await state()).page,'article');assert((await body()).includes('宁姆格福'));await click('[data-action="back"]');assert.equal((await state()).focusGame,'elden');record('existing-game focus changes concrete experience content');
 await api('setDirection','play');assert.equal(await page.locator('.concept-video video').count(),1);assert(await page.locator('.concept-video video').evaluate(e=>!e.autoplay&&e.hasAttribute('controls')&&e.paused));
 await click('.concept-film-copy [data-action="game"]');assert.equal((await state()).page,'game');await click('[data-action="player"]');assert.equal((await state()).page,'player');assert((await page.locator('#runtime-caption').innerText()).includes('不运行真实游戏'));await click('[data-action="back"]');await click('[data-action="back"]');record('discovery -> prepared game -> preview -> return');
 await api('setScenario','new');await click('.concept-film-copy [data-action="game"]');assert.equal(await page.locator('.device [data-action="player"]').count(),0);await click('[data-action="help"]');assert((await body()).includes('未接入'));record('new user preparation boundary');
 await api('reset');await api('setDirection','play');await api('setScenario','steam');await click('.concept-film-copy [data-action="game"]');assert.equal(await page.locator('.device [data-action="player"]').count(),0);await api('setScenario',{preparation:'ready'});assert.equal(await page.locator('[data-module="continue"]').count(),0);await click('.concept-film-copy [data-action="game"]');assert.equal(await page.locator('.device [data-action="player"]').count(),1);record('ownership, readiness and prior play history are independent');
 for(const direction of ['value','play','content','deals'])for(const match of ['unknown','empty']){await api('reset');await api('setDirection',direction);await api('setScenario',{match});assert.equal(await page.locator('.device .compat-mark').count(),0);assert(!await page.locator('.app-body h2').allTextContents().then(a=>a.includes('本机可玩')));await ensure(direction+'/'+match);}
 record('unknown compatibility avoids both false labels and badges');
 for(const source of ['none','import','steam']){await api('setScenario',{lifecycle:'new',source});await api('setScenario','weak');assert.equal((await state()).source,source);assert.equal((await state()).lifecycle,'new');await api('setDirection','play');await click('.concept-film-copy [data-action="game"]');assert.equal((await state()).detailRoute,'cloud');assert.equal((await state()).source,source);assert((await body()).includes('供给待确认'));}
 record('cloud overlays source; main discovery CTA retains chosen route');
 // User requested a true 3-row swipe page, not 3 horizontally arranged cards.
 await api('reset');await api('setDirection','content');await page.locator('.community-carousel').scrollIntoViewIfNeeded();
 await click('[data-action="community-page"][data-index="1"]');await page.waitForFunction(()=>{const c=document.querySelector('.community-carousel');return c.scrollLeft>c.clientWidth*.95;});assert.equal((await state()).communityPage,1);
 const article=page.locator('.community-page').nth(1).locator('.community-list-item').first();await article.scrollIntoViewIfNeeded();const scrollBefore=await page.locator('.app-body').evaluate(e=>e.scrollTop);await article.click();assert.equal((await state()).page,'article');await click('[data-action="save"]');assert.equal((await state()).saved.length,1);await click('[data-action="back"]');assert.equal((await state()).communityPage,1);assert(Math.abs(await page.locator('.app-body').evaluate(e=>e.scrollTop)-scrollBefore)<5);
 await click('[data-action="community-page"][data-index="0"]');await page.waitForFunction(()=>document.querySelector('.community-carousel').scrollLeft<3);
 const cdp=await page.context().newCDPSession(page);const box=await page.locator('.community-carousel').boundingBox();const sx=box.x+box.width*.85,ex=box.x+box.width*.1,y=box.y+35;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y}]});for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx+(ex-sx)*i/6,y}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>document.querySelector('.community-carousel').scrollLeft>document.querySelector('.community-carousel').clientWidth*.9);assert.equal((await state()).page,'home');assert.equal((await state()).communityPage,1);record('3 left-text/right-image rows per group; dots, native touch swipe and article return');
 // Restored first-version destinations and preferences.
 await api('reset');await api('setDirection','content');await click('[data-module="calendar"] .heading-link');assert.equal((await state()).page,'ret-calendar');assert.equal(await page.locator('.ret-release-item').count(),5);assert.equal(await page.locator('.ret-release-page select,.ret-release-page [data-action*="filter"]').count(),0);await click('[data-action="ret-release-subscribe"]');assert((await state()).retReleaseSubscribed);await click('[data-action="back"]');assert.equal((await state()).page,'home');record('release calendar, no filters, daily subscription and return');
 await click('[data-module="discounts"] .heading-link');assert.equal((await state()).page,'ret-discounts');assert.equal(await page.locator('.ret-offer-row').count(),2);assert((await body()).includes('¥51.59'));assert(await page.locator('.ret-offer-row a').evaluateAll(es=>es.every(e=>e.href.startsWith('https://store.steampowered.com/app/')&&e.rel.includes('noopener'))));await click('[data-action="back"]');record('discount amounts and official outbound URLs');
 await click('[data-module="giveaways"] .heading-link');assert.equal((await state()).page,'ret-giveaways');
 for(const platform of ['epic','steam','gog']){await click('[data-action="ret-platform"][data-platform="'+platform+'"]');await click('[data-action="ret-subscribe"]');assert((await state()).retSubscriptions[platform]);assert((await body()).includes('站内信 · Push'));}
 await click('[data-action="ret-widget"]');const widget=await page.locator('.ret-native-widget').innerText();assert(widget.includes('当前可领 3 款'));assert(widget.includes('12小时0分'));assert.equal(await page.locator('.ret-native-widget img').count(),0);assert(!/Asleep|Beginning|我们关门/.test(widget));await click('.ret-native-widget');assert.equal((await state()).page,'ret-giveaways');record('3-platform subscriptions; widget count and nearest deadline, no names or covers');
 await api('setScenario',{demoNow:'2027-01-01T00:00:00Z'});await click('[data-module="giveaways"] .heading-link');assert.equal(await page.locator('.ret-giveaway-row a').count(),0);assert((await body()).includes('暂无当前限免'));await click('[data-action="ret-widget"]');assert((await page.locator('.ret-native-widget').innerText()).includes('暂无可领游戏'));record('expired snapshot cannot offer a claim or negative countdown');
 await api('reset');await api('setDirection','content');await click('[data-module="tasks"] .heading-link');assert.equal((await state()).page,'ret-task-center');assert.equal(await page.locator('.ret-task-row').count(),6);await click('[data-action="ret-task"][data-task="checkin"]');await click('[data-action="ret-checkin"]');assert((await state()).retSigned);await click('[data-action="back"]');await click('[data-action="back"]');assert.equal((await state()).page,'home');await click('[data-module="tasks"] [data-task="play"]');assert.equal((await state()).page,'library');await click('[data-action="back"]');await click('[data-module="tasks"] [data-task="community"]');assert.equal((await state()).page,'community');await click('[data-action="back"]');record('three independent task actions and task-center return');
 for(const kind of ['instant','team']){await click('[data-module="'+kind+'"] [data-action="ret-business"]');assert.equal((await state()).page,'ret-business');assert.equal(await page.locator('.ret-business-page .primary:disabled').count(),1);await click('[data-action="back"]');}record('instant/team destinations without fabricated sessions');
 // Value shopping is a different first task, with prices grounded in the saved official response.
 await api('reset');assert.equal((await state()).direction,'deals');
 const observed=JSON.parse(fs.readFileSync(path.join(HERE,'purchase-source-probe.json'),'utf8'));
 const prices=await page.evaluate(()=>LAB_PURCHASE.items.map(({appid,price,original,discount})=>({appid,price,original,discount})));
 for(const item of prices){const quote=observed.items.find(x=>x.appid===item.appid).response[item.appid].data.price_overview;assert.equal(quote.currency,'CNY');assert.equal(item.price,quote.final/100);assert.equal(item.original,quote.initial/100);assert.equal(item.discount,quote.discount_percent);}
 record('shopping price and discount values match official Steam CN snapshot');
 for(const direction of ['value','play','content','deals']){
   await api('setDirection',direction);
   for(const [entry,destination] of [['local-list','local-list'],['ret-giveaways','ret-giveaways'],['purchase-deals','purchase-deals'],['purchase-rental','purchase-rental']]){
     await click('[data-module="shortcuts"] [data-action="'+entry+'"]');assert.equal((await state()).page,destination);assert.equal(await page.locator('.subheader [data-action="back"]').count(),1);await click('[data-action="back"]');assert.equal((await state()).page,'home');
   }
 }
 record('4 shortcut destinations in every direction, single arrow return');
 await api('reset');
 for(const [budget,expected] of [['30',['repo']],['50',['repo']],['100',['repo','raft']],['all',['repo','raft']]]){
   await click('[data-action="purchase-budget"][data-budget="'+budget+'"]');assert.deepEqual(await page.locator('.purchase-deal-card').evaluateAll(es=>es.map(e=>e.dataset.purchaseItem)),expected);
 }
 record('budget filtering applies actual current offer prices');
 await click('.purchase-hero [data-action="purchase-detail"]');assert.equal((await state()).page,'purchase-detail');assert.equal(await page.locator('.purchase-detail').getAttribute('data-purchase-detail'),'repo');assert((await body()).includes('暂未匹配这款游戏'));assert.equal(await page.locator('.purchase-detail .purchase-compat[data-compat="matched"]').count(),0);
 assert.equal(await page.locator('.purchase-store-link').getAttribute('href'),'https://store.steampowered.com/app/3241660/');assert((await page.locator('.purchase-store-link').getAttribute('rel')).includes('noopener'));
 await click('.purchase-check-card [data-action="local-list"]');assert.equal((await state()).page,'local-list');await click('[data-action="back"]');assert.equal((await state()).purchaseSelected,'repo');assert.equal((await state()).page,'purchase-detail');
 await click('[data-action="purchase-follow"][data-offer="repo"]');assert((await state()).purchaseFollowing.includes('repo'));await click('[data-action="back"]');assert.equal(await page.locator('.purchase-watch-row').count(),1);assert.equal(await page.locator('.purchase-deal-card[data-purchase-item="repo"] [data-action="purchase-follow"]').getAttribute('aria-pressed'),'true');
 await click('.purchase-watch-row [data-action="purchase-follow"]');assert.equal((await state()).purchaseFollowing.length,0);assert.equal(await page.locator('.purchase-watch-row').count(),0);assert.equal(await page.locator('.purchase-deal-card[data-purchase-item="repo"] [data-action="purchase-follow"]').getAttribute('aria-pressed'),'false');
 record('offer detail preserves chosen game, unknown compatibility, official URL, follow/cancel synchronization');
 await click('.purchase-deal-card[data-purchase-item="raft"] [data-action="purchase-follow"]');await click('[data-module="price-following"] .heading-link');assert.equal((await state()).page,'purchase-following');assert((await body()).includes('站内信 · Push'));assert((await body()).includes('不发送通知'));assert.equal(await page.locator('.purchase-watch-row').count(),1);await click('[data-action="back"]');
 record('price following page shows selected games and honest reminder boundary');
 await api('reset');await api('setScenario','new');assert.equal(await page.locator('.purchase-waiting-row').count(),2);assert.equal(await page.locator('.purchase-waiting-row .purchase-price em').count(),0);assert((await body()).includes('当前无折扣'));
 for(const setting of [{match:'unknown'},{match:'empty'},{match:'matched',capability:'weak'}]){await api('setScenario',setting);assert.equal(await page.locator('.device .purchase-compat[data-compat="matched"]').count(),0);assert.equal(await page.locator('.purchase-waiting-row').count(),0);}
 record('known non-discounted fit games differ from unknown sale games; weak/unknown never promises compatibility');
 await api('reset');await click('[data-module="shortcuts"] [data-action="purchase-deals"]');await click('.purchase-catalog-row [data-action="purchase-detail"][data-offer="hades"]');assert.equal(await page.locator('.purchase-store-link').count(),0);assert((await body()).includes('已在演示游戏库'));await click('.purchase-already-library [data-action="library"]');assert.equal((await state()).page,'library');await click('[data-action="back"]');await click('[data-action="back"]');await click('[data-action="back"]');assert.equal((await state()).page,'home');
 await click('[data-module="shortcuts"] [data-action="purchase-rental"]');assert((await body()).includes('暂未接入'));assert.equal(await page.locator('.purchase-rental .purchase-main-cta:disabled').count(),1);assert.equal(await page.locator('.purchase-rental input,.purchase-rental a').count(),0);await click('[data-action="back"]');
 assert(!/史低|即将结束|已发送/.test(await page.locator('.purchase-home').innerText()));
 record('existing demo-library titles avoid duplicate purchase CTA; rental has no fabricated account or checkout');
 // New destination pages must also fit a narrow mobile viewport.
 for(const width of [360,390]){
   await page.setViewportSize({width,height:1000});await api('reset');
   await click('.purchase-hero [data-action="purchase-detail"]');await ensure('purchase-detail/'+width);record('shopping detail responsive',{width});
   await click('[data-action="purchase-follow"][data-offer="repo"]');await click('[data-action="back"]');await click('[data-module="price-following"] .heading-link');await ensure('purchase-following/'+width);record('price following responsive',{width});await click('[data-action="back"]');
   await click('[data-module="shortcuts"] [data-action="purchase-deals"]');await ensure('purchase-deals/'+width);record('budget catalogue responsive',{width});await click('[data-action="back"]');
   await click('[data-module="shortcuts"] [data-action="purchase-rental"]');await ensure('purchase-rental/'+width);record('rental boundary responsive',{width});
 }
 await page.setViewportSize({width:1440,height:1080});await api('reset');
 await click('.purchase-hero [data-action="purchase-detail"]');await page.locator('.purchase-check-card').scrollIntoViewIfNeeded();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r4-purchase-detail.png')});
 await click('[data-action="purchase-follow"][data-offer="repo"]');await click('[data-action="back"]');await click('[data-module="price-following"] .heading-link');await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r4-price-following.png')});
 await api('reset');await api('setScenario','new');await page.locator('.purchase-matched').scrollIntoViewIfNeeded();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r4-fit-waiting.png')});
 // Capture current final screens at actual viewport dimensions.
 for(const direction of ['value','play','content','deals']){await api('reset');await api('setDirection',direction);for(const form of ['portrait','landscape','tablet']){await api('setForm',form);await settle();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r4-'+direction+'-'+form+'-top.png')});}await api('setForm','portrait');await page.locator('.community-module').scrollIntoViewIfNeeded();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r4-'+direction+'-community.png')});await page.locator('[data-module="giveaways"]').scrollIntoViewIfNeeded();await page.locator('.device').screenshot({path:path.join(HERE,prefix+'r4-'+direction+'-benefits.png')});}
 for(const width of [360,390,768])for(const direction of ['value','play','content','deals'])for(const form of ['portrait','landscape','tablet']){await page.setViewportSize({width,height:1000});await api('reset');await api('setDirection',direction);await api('setForm',form);await ensure(width+'/'+direction+'/'+form);record('responsive',{width,direction,form});}
 await page.setViewportSize({width:1440,height:1080});await api('reset');await page.locator('[data-action="os"][data-os="ios"]').click();assert.equal((await state()).os,'ios');await ensure('ios');record('ios system shell');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={status:'passed',version:'2026-11-05-home-lab-r4',artifactSha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve('public/gamehub-home-lab/index.html'))).digest('hex'),scope:'Offline HTML functionality, scenarios and geometry; no real users, emulator, payment, notifications or cloud session',target,checks,errors,external};fs.writeFileSync(path.join(HERE,prefix+'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,errors,external}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
