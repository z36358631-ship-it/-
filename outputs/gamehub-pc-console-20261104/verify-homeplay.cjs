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
 try{
  await page.goto(process.env.LIVE_URL||'file:///'+path.resolve(__dirname,'../../public/gamehub-pc-console-demo/index.html').replaceAll('\\','/'),{timeout:120000});
  assert.equal((await app()).page,'home');
  assert.equal(await page.locator('[data-act="lab-audience"]').count(),2);
  assert.equal(await page.locator('[data-testid="continue-strip"]').count(),1);
  assert.equal(await page.locator('.homeplay-feature-card h3').textContent(),'哈迪斯');
  assert.equal(await page.locator('.homeplay-recent-copy b').textContent(),'艾尔登法环');
  const bounds=await page.locator('.content').boundingBox(),cta=await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').boundingBox();
  assert(cta.y+cta.height<bounds.y+bounds.height,'Initial start CTA is below fold');
  await shot('returning-portrait');await page.screenshot({path:path.join(__dirname,prefix+'desktop.png'),fullPage:true});
  record('默认首页，继续与主卡游戏不同，首屏主卡动作可见');
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
  await page.locator('[data-act="homeplay-select"][data-index="1"]').click();assert.equal((await state()).key,'cyber');
  assert.equal(await page.locator('.editorial-stories').textContent(),right);
  assert.equal(await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').count(),0);
  await page.locator('[data-act="homeplay-detail"]').click();assert.equal((await app()).page,'console-game');
  assert.equal(await page.locator('.homeplay-detail-state').textContent(),'未添加到游戏库');
  assert.equal(await page.locator('[data-act="console-launch"]').count(),0);
  await page.evaluate(()=>consoleStart());assert.equal((await app()).page,'console-game');
  await page.locator('[data-act="console-back"]').click();assert.equal((await app()).page,'home');assert.equal((await state()).key,'cyber');
  await page.locator('[data-act="homeplay-prev"]').click();assert.equal((await state()).key,'hades');
  await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').click();assert.equal((await app()).page,'console-launch');assert.equal((await app()).selected,1);
  await page.locator('[data-act="console-cancel"]').click();assert.equal((await app()).page,'home');assert.equal((await state()).key,'hades');
  await page.waitForTimeout(3300);assert.equal((await app()).page,'home');
  await page.locator('.homeplay-recent-start').click();assert.equal((await app()).selected,0);assert.equal((await app()).page,'console-launch');
  await page.locator('[data-act="console-cancel"]').click();assert.equal((await app()).page,'home');
  record('选择与社区独立，未安装只看详情且无法启动，已安装/继续直接启动，取消返回原首页');
  await page.locator('[data-audience="new"]').click();assert.equal((await state()).audience,'new');
  assert.equal(await page.locator('[data-testid="continue-strip"]').count(),0);
  assert.equal(await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').count(),0);
  await page.locator('[data-act="homeplay-detail"]').click();assert.equal(await page.locator('[data-act="console-launch"]').count(),0);
  await page.locator('[data-act="console-back"]').click();
  await shot('new-portrait');
  for(const mode of ['unknown','none']){await page.evaluate(mode=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode(mode),mode);assert.equal(await page.locator('.homeplay-feature-card').count(),0);assert.equal(await page.locator('.homeplay-module .state-block').count(),1);}
  await page.evaluate(()=>GAMEHUB_HOME_PLAY_PREVIEW.setPlayableMode('known'));
  await page.locator('[data-audience="returning"]').click();
  record('新用户无继续/无虚假一键开始；未识别与无结果不展示本机适配结果');
  const matrix=[];
  for(const form of ['portrait','landscape','tablet','duo']){
   for(const os of form==='duo'?['ios']:['android','ios']){
    await show(form,os);
    assert.deepEqual(await page.locator('[data-module]').evaluateAll(es=>es.map(e=>e.dataset.module)),['playable','community','calendar','discounts','giveaways','return','instant','team']);
    const screen=await page.locator('.screen').boundingBox();
    assert.equal(await page.locator('.screen').evaluate(e=>e.scrollWidth>e.clientWidth),false,'Inner horizontal overflow '+form+os);
    if(['landscape','tablet'].includes(form)){
     assert.equal(await page.locator('.device-top-nav button').first().getAttribute('data-page'),'steam');
     const nav=await page.locator('.device-top-nav [data-page="steam"]').first();await nav.click();assert.equal((await app()).page,'steam');
     assert.equal(await page.locator('.device-top-nav button').first().getAttribute('data-page'),'steam');
     await page.locator('.device-top-nav [data-page="home"]').click();assert.equal((await app()).page,'home');
     const media=await page.locator('.homeplay-media').boundingBox(),copy=await page.locator('.homeplay-feature-info').boundingBox();assert(copy.x>media.x+media.width-2,'Wide card not independently split');
    }else if(form==='portrait')assert.equal(await page.locator('.bottom button').first().getAttribute('data-page'),'home');
    if(form==='duo'){assert.equal(await page.locator('.device-duo-upper .homeplay-media').count(),1);assert.equal(await page.locator('.screen .homeplay-media').count(),0);}
    const primary=await page.locator('.homeplay-feature-card [data-act="homeplay-start"]').boundingBox(),content=await page.locator('.content').boundingBox();
    assert(primary.y+primary.height<=content.y+content.height+1,'Start CTA clipped '+form+os);
    assert(primary.x>=screen.x&&primary.x+primary.width<=screen.x+screen.width,'Start CTA side overflow '+form+os);
    await shot(form+'-'+os);matrix.push({form,os});
   }
  }
  record('7种设备/系统组合首屏可操作，宽屏游戏库首位，Duo上玩法下选游',matrix);
  await show();
  const originalRight=await page.locator('.editorial-stories').textContent();await page.locator('[data-act="slide-select"]').nth(1).click();assert.equal(await page.locator('.editorial-stories').textContent(),originalRight);
  await page.locator('.calendar-more').click();assert.equal(await page.locator('.release-calendar-page').count(),1);await page.locator('[data-act="back"]').first().click();
  await page.locator('[data-module="return"] [data-page="task-center"]').click();assert.equal((await app()).page,'task-center');await page.locator('[data-act="back"]').first().click();
  await page.locator('[data-act="promo-giveaways-open"]').first().click();assert.equal((await app()).page,'giveaways');
  record('既有社区左右独立、发售日历、任务中心和喜加一入口正常');
  for(const width of [360,390,768]){await page.setViewportSize({width,height:1100});await show();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===390)await page.screenshot({path:path.join(__dirname,prefix+'mobile.png'),fullPage:true});}
  assert.deepEqual(errors,[]);assert.equal(requests.length,live?1:0);
  record('三宽度无页面横溢出、JS异常0、全部媒体内嵌');
  fs.writeFileSync(path.join(__dirname,live?'live-homeplay-verification.json':'homeplay-verification.json'),JSON.stringify({url:process.env.LIVE_URL||'local',checks,errors,requests},null,2));
  console.log(JSON.stringify({checks:checks.length,matrix:matrix.length,errors,requests:requests.length}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
