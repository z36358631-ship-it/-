const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[],checks=[];
 const live=!!process.env.LIVE_URL,prefix=live?'live-revision-':'revision-';
 page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const click=selector=>page.locator(selector).first().click();
 const state=()=>page.evaluate(()=>GAMEHUB_CONSOLE_PREVIEW.getState());
 const record=(name,data)=>checks.push({name,passed:true,data});
 const shot=async name=>{await page.waitForTimeout(500);await page.locator('.hardware-device').screenshot({path:path.join(__dirname,prefix+name+'.png')});};
 const show=async(form,os,scene)=>page.evaluate(({form,os,scene})=>{CONSOLE_DEVICE_PREVIEW.setForm(form);CONSOLE_DEVICE_PREVIEW.setOS(os);GAMEHUB_CONSOLE_PREVIEW.show(scene);},{form,os,scene});
 try{
  const response=await page.goto(process.env.LIVE_URL||'file:///'+path.resolve(__dirname,'../../public/gamehub-pc-console-demo/index.html').replaceAll('\\','/'),{timeout:120000});
  if(live)assert.equal(response.status(),200);
  assert.equal((await state()).page,'home');
  await show('portrait','android','steam');
  assert.equal(await page.locator('[data-act="lab-form"]').count(),4);
  assert.equal(await page.locator('[data-act="lab-os"]').count(),2);
  assert.equal(await page.locator('.native-appbar button').count(),3);
  assert.equal(await page.locator('.native-appbar .native-message .native-unread-dot').count(),1);
  assert.equal(await page.locator('.native-appbar [data-act="console-sound"]').count(),0);
  assert.equal(await page.locator('.native-search span').textContent(),'生化危机7');
  assert.equal(await page.evaluate(()=>document.querySelector('.console-feature-art img').src===CONSOLE_SCENES[consoleGame().key]),true);
  await shot('portrait-android-library');
  await page.screenshot({path:path.join(__dirname,prefix+'desktop.png'),fullPage:true});
  record('左侧四形态与双系统；顶部原生搜索、铃铛红点、设备；真实场景内嵌');
  await click('[data-act="console-select"][data-index="1"]');
  assert.equal((await state()).selected,1);
  await click('.immersive-direct-start');
  assert.equal((await state()).page,'console-launch');
  const launchId=await page.evaluate(()=>consoleState.launchId);
  await page.evaluate(()=>{consoleStart();consoleSelect(2);});
  assert.equal(await page.evaluate(()=>consoleState.launchId),launchId);
  assert.equal((await state()).selected,1);
  await click('[data-form="landscape"]');
  assert.equal((await state()).page,'console-launch');
  await page.waitForTimeout(1150);
  const stage=(await state()).stage;
  await click('[data-form="tablet"]');
  assert.equal((await state()).stage,stage);
  await click('[data-act="console-cancel"]');
  assert.equal((await state()).page,'steam');
  assert.equal((await state()).selected,1);
  await page.waitForTimeout(3300);assert.equal((await state()).page,'steam');
  record('单步开玩、防连点及游戏锁定；启动中切形态不重置；取消回原库且定时器失效');
  await show('portrait','android','steam');
  await click('.immersive-space-link');
  await click('[data-act="console-launch"]');
  await click('[data-act="console-cancel"]');assert.equal((await state()).page,'console-game');
  await click('[data-act="console-back"]');assert.equal((await state()).page,'steam');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');assert.equal((await state()).page,'console-launch');
  await page.keyboard.press('Escape');assert.equal((await state()).page,'steam');
  await click('.immersive-direct-start');
  await page.waitForFunction(()=>GAMEHUB_CONSOLE_PREVIEW.getState().page==='console-player');
  assert.equal(await page.locator('.pc-control-deck').count(),1);
  record('空间启动取消回空间；方向键Enter直启；演示流程结束进入PC控制器预览');
  const matrix=[];
  for(const form of ['portrait','landscape','tablet','duo']){
   for(const os of form==='duo'?['ios']:['android','ios']){
    await show(form,os,'steam');
    assert.equal(await page.locator(`.hardware-device.form-${form}.os-${os}`).count(),1);
    assert.equal(await page.locator('.console-channel').count(),4);
    assert.equal(await page.locator('.device-system-bar').count(),1);
    assert.equal(await page.locator('.hardware-camera').count(),1);
    if(['landscape','tablet'].includes(form)){assert.equal(await page.locator('.device-top-nav').count(),1);assert.equal(await page.locator('.screen .bottom').count(),0);}
    if(form==='duo'){assert.equal(await page.locator('.device-duo-upper .console-showcase').count(),1);assert.equal(await page.locator('.screen .console-channels').count(),1);}
    await shot(form+'-'+os+'-library');
    await show(form,os,'console-player');
    assert.equal(await page.locator('[data-stick]').count(),2);
    assert.equal(await page.locator('.pc-face-buttons [data-pad]').count(),4);
    assert.equal(await page.locator('.pc-shoulders [data-pad]').count(),4);
    if(form==='duo')assert.equal(await page.locator('.device-duo-upper .pc-game-display').count(),1);
    await shot(form+'-'+os+'-player');
    const button=page.locator('[data-pad="A"]');await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    assert.equal(await button.getAttribute('aria-pressed'),'true');await page.mouse.up();assert.equal(await button.getAttribute('aria-pressed'),'false');
    const stick=page.locator('[data-stick="left"]');await stick.scrollIntoViewIfNeeded();const rect=await stick.boundingBox();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+18,rect.y+rect.height/2);
    assert((await page.evaluate(()=>CONSOLE_DEVICE_PREVIEW.getState())).sticks.left.x>0);
    await page.mouse.up();assert.deepEqual((await page.evaluate(()=>CONSOLE_DEVICE_PREVIEW.getState())).sticks.left,{x:0,y:0});
    await click('[data-act="console-menu"]');assert.equal(await page.locator('.console-game-menu').count(),1);
    await page.keyboard.press('Escape');assert.equal((await state()).menu,false);
    await click('[data-act="console-menu"]');await click('[data-act="console-library"]');assert.equal((await state()).page,'steam');
    matrix.push({form,os,library:true,player:true,button:true,stick:true,menu:true});
   }
  }
  await show('duo','ios','steam');await page.evaluate(()=>CONSOLE_DEVICE_PREVIEW.setOS('android'));assert.equal(await page.evaluate(()=>CONSOLE_DEVICE_PREVIEW.getOS()),'ios');
  record('七组系统/形态组合，独立重排、上下屏、底部手势条；按键按压/摇杆回中/菜单返回',matrix);
  const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'baseline.json'),'utf8'));
  for(const form of ['portrait','landscape','tablet','duo']){
   await show(form,form==='duo'?'ios':'android','home');
   assert.deepEqual(await page.locator('[data-module]').evaluateAll(es=>es.map(e=>e.dataset.module)),['playable','community','calendar','discounts','giveaways','return','instant','team']);
   if(['landscape','tablet'].includes(form))assert.equal(await page.locator('.device-top-nav button').first().getAttribute('data-page'),'steam');
   assert.equal(await page.locator('.native-appbar .native-message').count(),1);
   assert.equal(await page.locator('.story-open').first().evaluate(e=>getComputedStyle(e).display),'flex');
   const banner=await page.locator('.hero-open').first().boundingBox(),caption=await page.locator('.feature-caption').first().boundingBox();
   assert(banner.height<=155,'Editorial banner became oversized');
   assert(caption.height>=36&&caption.y+caption.height<=banner.y+banner.height+1,'Editorial title clipped');
   if(form==='landscape')assert(await page.locator('.content').evaluate(e=>e.clientHeight>240),'Landscape app chrome consumed reading area');
   await shot(form+'-home');
   await show(form,form==='duo'?'ios':'android','pc');
   assert.deepEqual(await page.locator('.content h2,.content h3').allTextContents(),baseline.pcTitles);
   await shot(form+'-pc');
  }
  record('四形态首页选游前置、宽屏游戏库首位；PC原内容与榜单保留');
  await show('portrait','android','home');
  await page.locator('.content').evaluate(e=>e.scrollTop=340);
  await click('.homeplay-next-peek');
  await click('[data-act="homeplay-detail"]');
  await click('[data-act="console-back"]');assert.equal((await state()).page,'home');
  await click('.calendar-more');assert.equal(await page.locator('.release-calendar-page').count(),1);
  await click('[data-act="back"]');
  await click('[data-module="return"] [data-page="task-center"]');assert.equal((await state()).page,'task-center');
  await click('[data-act="back"]');
  await click('[data-act="promo-giveaways-open"]');assert.equal((await state()).page,'giveaways');
  record('首页游戏返回来源、日历、任务及喜加一既有承接页可达');
  for(const width of [360,390,768]){
   await page.setViewportSize({width,height:1100});
   for(const form of ['portrait','landscape','tablet','duo']){
    await show(form,form==='duo'?'ios':'android','steam');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Body overflow '+width+' '+form);
   }
   if(width===390){await show('portrait','ios','steam');await page.screenshot({path:path.join(__dirname,prefix+'mobile.png'),fullPage:true});}
  }
  record('360/390/768外层无横溢出；宽设备仅在预览舞台内横向浏览');
  await page.setViewportSize({width:1440,height:1100});await show('portrait','android','steam');
  assert.equal((await state()).sound,false);await click('.lab-sound');assert.equal((await state()).sound,true);await click('.lab-sound');
  await page.emulateMedia({reducedMotion:'reduce'});await click('.immersive-space-link');assert.equal(await page.locator('.console-cover-flight').count(),0);
  const bad=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt));assert.deepEqual(bad,[]);
  const original=fs.readFileSync(path.resolve(__dirname,'../../public/gamehub-70-home-demo/index.html'));
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),baseline.sha256);
  assert.deepEqual(errors,[]);assert.equal(requests.length,live?1:0);
  record('音效开关、减少动画、图片解码、主稿SHA保持；JS异常0，无新增网络资源');
  const result={url:process.env.LIVE_URL||'local generated multidevice demo',checks,errors,requests};
  fs.writeFileSync(path.join(__dirname,live?'live-revision-ui.json':'verification.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({checks:checks.length,matrix:matrix.length,errors,requests:requests.length}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
