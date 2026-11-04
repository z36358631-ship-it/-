const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const {chromium}=require('../steam-integration-20261028/node_modules/playwright-core');
(async()=>{
 const out=path.join(__dirname,'evidence');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const p=await browser.newPage({viewport:{width:1280,height:835}});p.setDefaultTimeout(6500);
 const errors=[],requests=[],results=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const url=pathToFileURL(path.join(__dirname,'MacSteam接入Demo.html')).href;
 const api=(name,arg)=>p.evaluate(([n,a])=>SteamDemo[n](a),[name,arg]);
 const host=(name,arg)=>p.evaluate(([n,a])=>MacHost[n](a),[name,arg]);
 const state=()=>api('getState');const act=(name)=>p.locator(`[data-s-action="${name}"]`).first().click();
 const shot=async id=>{await p.evaluate(()=>MacReview.setOpen(false));await p.screenshot({path:path.join(out,id+'.png')});await p.screenshot({path:path.join(out,id+'.jpg'),type:'jpeg',quality:78});};
 async function test(name,fn){await p.goto(url);await fn();results.push({name,status:'passed'});console.log('PASS '+name);}
 try{
 await test('默认展示重构游戏库，首次入口必须勾选且默认窗口',async()=>{
  assert.equal((await host('getState')).page,'library');await shot('new-library');
  await api('scenario','first');assert.equal((await state()).mode,'window');assert.equal((await state()).remember,false);
  assert(await p.locator('[data-s-action="mode-confirm"]').isDisabled());await shot('mode');
  await act('legal');assert(await p.getByRole('dialog',{name:'免责声明',exact:true}).isVisible());
  assert((await p.locator('.ms-legal-scroll').innerText()).includes('本平台绝不获取、记录或存储您的明文密码'));
  await act('legal-close');assert(await p.locator('[data-s-action="mode-confirm"]').isDisabled());
  await p.locator('[data-s-change="consent"]').check();await act('mode-confirm');
  assert.equal((await state()).screen,'prepare');assert.equal(await p.locator('.ms-prepare button').count(),0);await shot('prepare');
  await p.waitForFunction(()=>SteamDemo.getState().screen==='login');await shot('login');
  assert(await p.locator('.ms-qr').isVisible());await act('login');assert.equal((await state()).screen,'native');assert((await host('getState')).account);await shot('steam');
 });
 await test('旧版已登录首次仍确认，确认后复用账号',async()=>{await api('scenario','legacy');assert.equal((await state()).screen,'mode');assert((await state()).account);assert(await p.locator('[data-s-action="mode-confirm"]').isDisabled());await p.locator('[data-s-change="consent"]').check();await act('mode-confirm');await p.waitForFunction(()=>SteamDemo.getState().screen==='native');});
 await test('真实点击宿主入口与再次进入保持库目标，不重复协议',async()=>{await p.locator('[data-host="steam"]').first().click();await p.locator('[data-s-change="consent"]').check();await p.locator('[data-s-change="remember"]').check();await act('mode-confirm');await p.waitForFunction(()=>SteamDemo.getState().screen==='login');await act('login');assert.equal((await state()).page,'library');await act('bubble-open');await act('return');await p.locator('[data-host="steam"]').first().click();assert.equal((await state()).screen,'native');assert.equal((await state()).page,'library');});
 await test('设置账号入口首次必须同意并继续原管理目标',async()=>{await host('setAccount',{id:'demo-star',nickname:'星际玩家'});await host('navigate','steam-settings');await p.locator('[data-host="accounts"]').first().click();assert.equal((await state()).screen,'mode');await p.locator('[data-s-change="consent"]').check();await act('mode-confirm');await p.waitForFunction(()=>SteamDemo.getState().screen==='native');assert.equal((await state()).modal,'accounts');});
 await test('设置记忆与当前会话模式分开，缩放范围100至150',async()=>{
  await api('scenario','first');await p.locator('[data-s-change="consent"]').check();await p.locator('[data-s-change="remember"]').check();await act('mode-confirm');await p.waitForFunction(()=>SteamDemo.getState().screen==='login');await act('login');
  await act('bubble-open');await p.locator('[data-s-action="session-mode"][data-value="big"]').click();assert.equal((await state()).mode,'big');assert.equal((await host('getState')).preferredMode,'window');
  const slider=p.locator('#ms-scale');assert.equal(await slider.getAttribute('min'),'100');assert.equal(await slider.getAttribute('max'),'150');await slider.fill('150');await slider.dispatchEvent('change');assert.equal((await state()).scale,150);
  await shot('panel');await act('bubble-minimize');assert.equal(await p.locator('.ms-ball-panel').count(),0);assert(await p.locator('.ms-ball').isVisible());
  await api('close');await api('enter',{});assert.equal((await state()).screen,'native');assert.equal((await state()).mode,'window');
 });
 await test('从详情进入保持游戏目标',async()=>{await api('scenario','ready');await api('close');await api('enter',{target:'stardew'});if((await state()).screen==='mode')await act('mode-confirm');assert.equal((await state()).target,'stardew');assert.equal((await state()).page,'detail');});
 await test('网络失败重试恢复页面，同步失败保留记录',async()=>{
  await api('scenario','network-error');await shot('network-error');await act('network-retry');assert.equal((await state()).network,'loading');await p.waitForFunction(()=>SteamDemo.getState().network==='ready');
  await api('scenario','sync-error');const before=await p.locator('.ms-game-card').count();await shot('sync-error');await act('sync-retry');assert.equal((await state()).sync,'loading');await p.waitForFunction(()=>SteamDemo.getState().sync==='ready');assert((await p.locator('.ms-game-card').count())>=before);
 });
 await test('空态保留分类切换，准备失败仅重试',async()=>{await api('scenario','empty');await shot('empty');assert.equal(await p.locator('[role="tab"]').count(),2);await api('scenario','download-error');assert.equal(await p.locator('.ms-prepare button').count(),1);await act('download-retry');assert.equal((await state()).downloadError,false);});
 await test('账号切换不串导入记录，退出更新盖世账号',async()=>{await api('scenario','ready');await api('importGame');await p.waitForFunction(()=>SteamDemo.getState().sync==='ready');assert.equal((await state()).imported,true);await api('openAccounts');await shot('account');await p.locator('[data-s-action="account-switch"][data-value="demo-rain"]').click();assert.equal((await state()).imported,false);assert.equal((await host('getState')).account.id,'demo-rain');await api('openAccounts');await act('logout');assert.equal((await host('getState')).account,null);assert.equal((await state()).screen,'login');});
 await test('Steam下载完成同步盖世记录',async()=>{await api('scenario','ready');await p.locator('[data-s-action="game"][data-value="cyber"]').click();await act('download-game');await p.waitForFunction(()=>SteamDemo.getState().launchStatus==='idle');const s=await host('getState');assert(JSON.stringify(s).includes('cyber'),'盖世记录中应有Steam下载游戏');});
 await test('重构页面与新方案设置可切换，Mac默认发现',async()=>{
  assert.equal((await host('getState')).landing,'discovery');await host('setBaseline',true);
  for(const [page,id]of [['discovery','baseline-discovery'],['library','baseline-library'],['detail','baseline-detail'],['settings','baseline-settings'],['steam-settings','baseline-steam-settings'],['legacy-steam','baseline-steam']]){await host('navigate',page);await shot(id);}
  await host('setBaseline',false);for(const [page,id]of [['settings','new-settings'],['steam-settings','new-steam-settings']]){await host('navigate',page);await shot(id);}
  await p.evaluate(()=>{MacHost.setPreference('landing','steam');MacReview.setOpen(true)});await p.locator('[data-dc="reopen"]').click();assert.equal((await state()).screen,'mode');
  await p.reload();assert.equal((await host('getState')).landing,'discovery');assert.equal((await host('getState')).page,'library');assert.equal((await state()).open,false);
 });
 await test('大屏呈现独立布局，下载基础游戏合并不重复，社区保留原用途',async()=>{await p.locator('[data-host="host-community"]').click();assert.equal((await state()).open,false);await api('scenario','big');await shot('big');assert.equal(await p.locator('.ms-steam-side').count(),1);assert.equal(await p.locator('.ms-steam-side').isVisible(),false);await api('close');await host('setAccount',{id:'demo-star',nickname:'星际玩家'});await p.evaluate(()=>MacHost.setSteamGames([{id:'hades',name:'哈迪斯',installed:true,source:'steam'}],'demo-star'));await host('navigate','library');assert.equal(await p.locator('[data-host="game"][data-game="hades"]').count(),1);});
 await test('1024×720缩窗可用，图片离线加载，无JS错误',async()=>{await p.setViewportSize({width:1024,height:720});await api('scenario','panel');await shot('small-window');assert(await p.locator('[data-s-action="bubble-minimize"]').isVisible());const broken=await p.locator('img').evaluateAll(xs=>xs.filter(x=>!x.complete||!x.naturalWidth).length);assert.equal(broken,0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({status:'passed',viewport:'1280x835 / 1024x720',results,errors,externalRequests:requests},null,2));
 }catch(e){await p.screenshot({path:path.join(out,'failure.png')});fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({status:'failed',results,error:e.stack,errors},null,2));throw e;}finally{await browser.close();}
})();
