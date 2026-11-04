const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[],checks=[];
 const live=!!process.env.LIVE_URL,prefix=live?'live-homeplay-':'homeplay-';
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const state=()=>page.evaluate(()=>GAMEHUB_HOME_PLAY_PREVIEW.getState());
 const app=()=>page.evaluate(()=>GAMEHUB_CONSOLE_PREVIEW.getState());
 const record=(name,data)=>checks.push({name,passed:true,data});
 const show=async(form='portrait',os='android')=>{await page.evaluate(({form,os})=>{CONSOLE_DEVICE_PREVIEW.setForm(form);CONSOLE_DEVICE_PREVIEW.setOS(os);GAMEHUB_CONSOLE_PREVIEW.show('home');},{form,os});await page.waitForTimeout(200);};
 const shot=async name=>{await page.waitForTimeout(350);await page.locator('.hardware-device').screenshot({path:path.join(__dirname,prefix+name+'.png')});};
 const swipeGame=async(next=true)=>{const box=await page.locator('.homeplay-card-open').boundingBox();await page.mouse.move(box.x+box.width*(next ? 0.8 : 0.3),box.y+Math.min(45,box.height/2));await page.mouse.down();await page.mouse.move(box.x+box.width*(next ? 0.3 : 0.8),box.y+Math.min(45,box.height/2),{steps:6});await page.mouse.up();await page.waitForTimeout(300);};
 try{
  await page.goto(process.env.LIVE_URL||'file:///'+path.resolve(__dirname,'../../public/gamehub-pc-console-demo/index.html').replaceAll('\\','/'),{timeout:120000});
  assert.equal((await app()).page,'home');
  const placement=await page.locator('.canvas-area,.sidebar').evaluateAll(es=>es.map(e=>({cls:e.className,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right})));
  assert(placement.find(e=>e.cls==='sidebar').right<=placement.find(e=>e.cls==='canvas-area').x,'Desktop controls must be left of demo');
  assert.equal(await page.locator('.screen').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(14, 14, 16)');
  assert.equal(await page.locator('.content').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(14, 14, 16)');
  assert.equal(await page.locator('.homeplay-feature-card').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(27, 29, 33)');
  assert.equal(await page.locator('[data-act="lab-audience"]').count(),2);
  assert.equal(await page.locator('[data-testid="continue-strip"]').count(),1);
  assert.equal(await page.locator('.homeplay-feature-card h3').textContent(),'哈迪斯');
  assert.equal(await page.locator('.homeplay-recent-copy b').textContent(),'艾尔登法环');
  const bounds=await page.locator('.content').boundingBox(),cta=await page.locator('.homeplay-feature-card [data-act="homeplay-detail"]').boundingBox();
  assert(cta.y+cta.height<bounds.y+bounds.height,'Initial start CTA is below fold');
  const compact=await page.locator('.homeplay-feature-card').boundingBox(),recent=await page.locator('.homeplay-continue').boundingBox(),art=await page.locator('.homeplay-recent-art').boundingBox(),play=await page.locator('.homeplay-recent-start').boundingBox();
  assert(compact.height<=215,'Playable card still too tall');assert(recent.height<=92,'Continue card oversized');
  assert(art.x<play.x&&play.width===play.height,'Continue card must have art left and circular play right');
  assert.equal(await page.locator('.homeplay-recent-copy>span').textContent(),'继续游戏');
  assert.equal(await page.locator('.homeplay-recent-copy small').textContent(),'Steam');
  assert.equal(await page.locator('.homeplay-install-state').count(),0);
  assert.equal(await page.locator('.homeplay-module .homeplay-platform,.homeplay-hook,.homeplay-game-heading,.homeplay-start').count(),0);
  assert.equal(await page.locator('.homeplay-feature-info').textContent(),'哈迪斯');
  assert.equal(await page.locator('.homeplay-picker,[data-act="homeplay-select"],[data-act="homeplay-prev"]').count(),0);
  assert(!/沿用上次配置|已安装/.test(await page.locator('.content').textContent()),'Homepage retained configuration/installation description');
  assert.equal(await page.locator('.homeplay-description').isVisible(),false,'Long description still consumes homepage space');
  await shot('returning-portrait');await page.screenshot({path:path.join(__dirname,prefix+'desktop.png'),fullPage:true});
  record('左侧控制右侧演示，深色首页；继续卡Steam，本机可玩仅画面与单一名称',{playableHeight:compact.height,continueHeight:recent.height});
  await page.waitForFunction(()=>{const v=document.querySelector('.homeplay-video');return v&&!v.paused&&v.currentTime>.2;});
  assert.equal(await page.locator('video').evaluate(v=>v.muted&&v.loop&&v.playsInline),true);
  await page.locator('[data-act="homeplay-motion"]').click();assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
  await page.locator('[data-act="homeplay-motion"]').click();await page.waitForFunction(()=>!document.querySelector('video').paused);
  await page.locator('.content').evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(400);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
  await page.locator('.content').evaluate(e=>e.scrollTop=0);await page.waitForFunction(()=>!document.querySelector('video').paused);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
  assert.equal(await page.locator('.homeplay-motion').isDisabled(),true);await page.emulateMedia({reducedMotion:'no-preference'});
  record('官方片段真实解码、静音循环、暂停/继续、滚出暂停、减少动态静图');
  const right=await page.locator('.editorial-stories').textContent();
  await swipeGame();
  assert.equal((await state()).key,'cyber');assert.equal((await app()).page,'home','Portrait swipe incorrectly opened details');
  assert.equal((await state()).key,'cyber');
  assert.equal(await page.locator('.editorial-stories').textContent(),right);
  assert.equal(await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').count(),0);
  await page.locator('[data-act="homeplay-detail"]').click();assert.equal((await app()).page,'console-game');
  assert.equal(await page.locator('.homeplay-detail-state').textContent(),'未添加到游戏库');
  assert.equal(await page.locator('[data-act="console-launch"]').count(),0);
  await page.evaluate(()=>consoleStart());assert.equal((await app()).page,'console-game');
  await page.locator('[data-act="console-back"]').click();assert.equal((await app()).page,'home');assert.equal((await state()).key,'cyber');
  await swipeGame(false);assert.equal((await state()).key,'hades');
  await page.locator('.homeplay-card-open').click();assert.equal((await app()).page,'console-game');
  await page.locator('[data-act="console-launch"]').click();assert.equal((await app()).page,'console-launch');assert.equal((await app()).selected,1);
  await page.locator('[data-act="console-cancel"]').click();assert.equal((await app()).page,'console-game');
  await page.locator('[data-act="console-back"]').click();assert.equal((await app()).page,'home');assert.equal((await state()).key,'hades');
  await page.waitForTimeout(3300);assert.equal((await app()).page,'home');
  await page.locator('.homeplay-recent-start').click();assert.equal((await app()).selected,0);assert.equal((await app()).page,'console-launch');
  await page.locator('[data-act="console-cancel"]').click();assert.equal((await app()).page,'home');
  record('卡片进入原详情且选择与社区独立；未添加不可启动，已添加在详情启动，继续卡直接启动');
  await page.locator('[data-audience="new"]').click();assert.equal((await state()).audience,'new');
  assert.equal(await page.locator('[data-testid="continue-strip"]').count(),0);
  assert.equal(await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').count(),0);
  await page.locator('[data-act="homeplay-detail"]').click();assert.equal(await page.locator('[data-act="console-launch"]').count(),0);
  await page.locator('[data-act="console-back"]').click();
  await shot('new-portrait');
  for(const mode of ['unknown','none']){await page.evaluate(mode=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode(mode),mode);assert.equal(await page.locator('.homeplay-feature-card').count(),0);assert.equal(await page.locator('.homeplay-module .state-block').count(),1);}
  await show('duo','ios');
  for(const mode of ['unknown','none']){await page.evaluate(mode=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode(mode),mode);assert.equal(await page.locator('.device-duo-upper img,.device-duo-upper video').count(),0);assert.equal(await page.locator('.homeplay-duo-empty').count(),1);}
  await page.evaluate(()=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode('known'));
  await show();
  await page.locator('[data-audience="returning"]').click();
  record('新用户无继续/无虚假一键开始；未识别与无结果不展示本机适配结果');
  const matrix=[];
  for(const form of ['portrait','landscape','tablet','duo']){
   for(const os of form==='duo'?['ios']:['android','ios']){
    await show(form,os);
    assert.deepEqual(await page.locator('[data-module]').evaluateAll(es=>es.map(e=>e.dataset.module)),['playable','community','calendar','discounts','giveaways','return','instant','team']);
    const screen=await page.locator('.screen').boundingBox();
    assert.equal(await page.locator('.homeplay-picker,[data-act="homeplay-select"],[data-act="homeplay-prev"]').count(),0,'Bottom picker remains '+form+os);
    assert.equal(await page.locator('.screen').evaluate(e=>e.scrollWidth>e.clientWidth),false,'Inner horizontal overflow '+form+os);
    if(['landscape','tablet'].includes(form)){
     assert.equal(await page.locator('.device-top-nav button').first().getAttribute('data-page'),'steam');
     const nav=await page.locator('.device-top-nav [data-page="steam"]').first();await nav.click();assert.equal((await app()).page,'steam');
     assert.equal(await page.locator('.device-top-nav button').first().getAttribute('data-page'),'steam');
     await page.locator('.device-top-nav [data-page="home"]').click();assert.equal((await app()).page,'home');
     assert.equal(await page.locator('[data-testid="continue-strip"]').count(),0,'Wide home must not have continue card');
     const playable=await page.locator('.homeplay-module').boundingBox(),community=await page.locator('.editorial-section').boundingBox(),calendar=await page.locator('.calendar-module').boundingBox();
     assert(community.y>=playable.y+playable.height&&calendar.y>=community.y+community.height,'Wide homepage modules must occupy consecutive rows');
     assert(Math.abs(community.x-playable.x)<1&&Math.abs(community.width-playable.width)<1&&Math.abs(calendar.width-playable.width)<1,'Wide modules must use the same full width');
     const rows=await page.locator('[data-module]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {name:e.dataset.module,x:r.x,y:r.y,width:r.width,bottom:r.bottom};}));
     for(let i=0;i<rows.length;i++){assert(Math.abs(rows[i].width-playable.width)<2&&Math.abs(rows[i].x-playable.x)<2,'Wide module is not full width: '+rows[i].name);if(i)assert(rows[i].y>=rows[i-1].bottom-1,'Wide module shares another row: '+rows[i].name);}
     assert.equal(await page.locator('.homeplay-wide-card').count(),4);
     assert.equal(await page.locator('.homeplay-focus-track,.homeplay-picker,.homeplay-next-peek,[data-act="homeplay-prev"],[data-act="homeplay-next"]').count(),0,'Wide home retained carousel controls');
     const cards=await page.locator('.homeplay-wide-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
     for(let i=1;i<cards.length;i++)assert(cards[i].x>cards[i-1].x&&Math.abs(cards[i].y-cards[0].y)<1,'Wide playable games must be in a single fixed row');
     const beforeSwipe=(await state()).key;
     await page.locator('.homeplay-wide-card').first().evaluate(e=>{e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:220,clientY:180}));e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:90,clientY:180}));});
     assert.equal((await state()).key,beforeSwipe,'Wide card swipe must not switch game');
     const contentBounds=await page.locator('.content').boundingBox();
     for(const card of cards)assert(card.right<=playable.x+playable.width+1&&card.bottom<=contentBounds.y+contentBounds.height+1,'Wide grid card clipped or below initial fold');
    }else if(form==='portrait')assert.equal(await page.locator('.bottom button').first().getAttribute('data-page'),'home');
    if(form==='duo'){assert.equal(await page.locator('.device-duo-upper .homeplay-media').count(),1);assert.equal(await page.locator('.screen .homeplay-media').count(),0);}
    const primary=await page.locator('.homeplay-module [data-act="homeplay-detail"]').first().boundingBox(),content=await page.locator('.content').boundingBox();
    assert(primary.y+primary.height<=content.y+content.height+1,'Start CTA clipped '+form+os);
    assert(primary.x>=screen.x&&primary.x+primary.width<=screen.x+screen.width,'Start CTA side overflow '+form+os);
    await shot(form+'-'+os);matrix.push({form,os});
   }
  }
  record('7种设备/系统组合首屏可操作，宽屏游戏库首位，Duo上玩法下选游',matrix);
  await show('tablet','ios');await page.locator('.calendar-module').scrollIntoViewIfNeeded();await shot('tablet-calendar-row');await page.locator('[data-module="instant"]').scrollIntoViewIfNeeded();await shot('tablet-business-rows');
  await show('landscape','android');
  for(const [key,start] of [['hades',true],['cyber',false],['elden',true],['wukong',false]]){
   const card=page.locator(`.homeplay-wide-card[data-key="${key}"]`);
   assert.equal(await card.locator('.homeplay-platform,.homeplay-start').count(),0);
   assert.equal(await card.locator('h3').count(),1);
   await card.locator('.homeplay-card-open').click();assert.equal((await app()).page,'console-game');
   assert.equal(await page.locator('[data-act="console-launch"]').count(),start?1:0);
   await page.locator('[data-act="console-back"]').click();assert.equal((await app()).page,'home');
  }
  await page.locator('[data-audience="new"]').click();assert.equal(await page.locator('.homeplay-wide-card [data-act="homeplay-start"]').count(),0);assert.equal(await page.locator('.homeplay-wide-card [data-act="homeplay-detail"]').count(),4);
  for(const mode of ['unknown','none']){await page.evaluate(mode=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode(mode),mode);assert.equal(await page.locator('.homeplay-wide-grid').count(),0);assert.equal(await page.locator('.homeplay-module .state-block').count(),1);}
  await page.evaluate(()=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode('known'));await page.locator('[data-audience="returning"]').click();
  record('横屏每栏目独占整行，四张固定卡并排，无滑动/翻页；每卡仅名称，四游戏进详情并返回，新用户及缺省态正常');
  await show();
  assert.equal(await page.locator('.business-module .section-title button').count(),0,'Instant/team must not have more links');
  const links=await page.locator('.native-section-link').evaluateAll(es=>es.map(e=>{const before=e.previousElementSibling,r=e.getBoundingClientRect(),t=before.getBoundingClientRect();return {text:e.textContent,tag:before.tagName,calendar:e.classList.contains('calendar-more'),gap:r.x-t.right,label:e.getAttribute('aria-label'),svg:e.querySelectorAll('svg').length};}));
  assert(links.length>=5);for(const link of links){assert.equal(link.text,'');assert.equal(link.tag,link.calendar?'SPAN':'H2');assert(link.gap>=0&&link.gap<=6,'Section arrow not adjacent to title/date');assert(link.label&&link.svg===1);}
  assert.deepEqual(await page.locator('.calendar-heading').evaluate(e=>[...e.children].map(c=>c.tagName)),['H2','SPAN','BUTTON']);
  assert.match(await page.locator('.calendar-today').textContent(),/^\d{2}月\d{2}日$/);
  assert.equal(await page.locator('.calendar-entry').count(),0,'Duplicate calendar entry remains');
  for(const target of ['秒玩上新','组队云玩']){
   await page.evaluate(title=>go('destination',{title}),target);
   const back=page.locator('.subhead [data-act="back"]');assert.equal(await back.textContent(),'');assert.equal(await back.locator('svg').count(),1);assert.equal(await back.getAttribute('aria-label'),'返回上一页');assert.equal(await page.locator('.content [data-act="back"]').count(),0);
   await back.click();assert.equal((await app()).page,'home');
  }
  const originalRight=await page.locator('.editorial-stories').textContent();await page.locator('[data-act="slide-select"]').nth(1).click();assert.equal(await page.locator('.editorial-stories').textContent(),originalRight);
  await page.locator('.calendar-more').click();assert.equal(await page.locator('.release-calendar-page').count(),1);assert.equal(await page.locator('.subhead [data-act="back"]').textContent(),'');assert.equal(await page.locator('.native-back').evaluate(e=>getComputedStyle(e,':before').content),'none');await shot('calendar-back');await page.locator('[data-act="back"]').first().click();
  await page.locator('[data-module="return"] [data-page="task-center"]').click();assert.equal((await app()).page,'task-center');await page.locator('[data-act="back"]').first().click();
  await page.locator('[data-module="discounts"] .native-section-link').click();assert.equal((await app()).page,'discounts');assert.equal(await page.locator('.subhead [data-act="back"]').textContent(),'');await page.locator('[data-act="back"]').first().click();
  await page.locator('[data-act="promo-giveaways-open"]').first().click();assert.equal((await app()).page,'giveaways');
  record('标题旁纯箭头、秒玩/组队无更多，单一左箭头返回；社区、日历、任务和喜加一原落点正常',links);
  for(const width of [360,390,768]){await page.setViewportSize({width,height:1100});await show();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width<600){const main=await page.locator('.canvas-area').boundingBox(),controls=await page.locator('.sidebar').boundingBox();assert(controls.y<main.y,'Narrow layout keeps controls above demo');}if(width===390)await page.screenshot({path:path.join(__dirname,prefix+'mobile.png'),fullPage:true});}
  assert.deepEqual(errors,[]);assert.equal(requests.length,live?1:0);
  record('三宽度无页面横溢出、JS异常0、全部媒体内嵌');
  fs.writeFileSync(path.join(__dirname,live?'live-homeplay-verification.json':'homeplay-verification.json'),JSON.stringify({url:process.env.LIVE_URL||'local',checks,errors,requests},null,2));
  console.log(JSON.stringify({checks:checks.length,matrix:matrix.length,errors,requests:requests.length}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
