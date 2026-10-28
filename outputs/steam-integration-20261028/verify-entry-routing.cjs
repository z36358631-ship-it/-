const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=__dirname,results=[],errors=[],remote=[];
let browser,page;
const state=()=>page.evaluate(()=>window.demo.getState());
const api=(name,arg)=>page.evaluate(([n,a])=>window.demo[n](a),[name,arg]);
const action=name=>page.locator('#screen [data-action="'+name+'"]:not([inert] *)').first().click();
const outer=async name=>{await api('setReviewOpen',true);const el=page.locator('#rail [data-action="'+name+'"]');if(!await el.isVisible())await page.locator('#rail details summary').click();await el.click();await api('setReviewOpen',false)};
const choose=async value=>page.locator('#screen [data-action="landing-select"][data-landing="'+value+'"]').click();
async function consent(mode='window'){await page.locator('#screen [data-mode="'+mode+'"]').click();await page.locator('#remember').check();await page.locator('#consent').check();await action('confirm-mode')}
async function ready(){for(let i=0;i<10;i++){const s=await state();if(['login','steam'].includes(s.page))return;if(s.page!=='prepare')throw Error('Unexpected page '+s.page);await api('advance')}throw Error('Prepare did not finish')}
async function login(method='qr',success=true){if(method==='qr')await outer('qr-scan');else{await page.locator('#loginUser').fill('private_login_name');await page.locator('#loginPassword').fill('private_password');await action('submit-login')}await outer(success?'login-success':'login-fail')}
async function hostGame(game='elden'){await page.locator('#screen [data-action="launch-host-game"][data-game="'+game+'"]').first().click()}
async function shot(name){await page.screenshot({path:path.join(root,'screenshots',name+'.png'),fullPage:true})}
async function savedLanding(value,missing=false){
  await page.evaluate(({value,missing})=>{const key='gamehub-steam-demo-v1',pref=JSON.parse(localStorage.getItem(key)||'{}');if(missing)delete pref.landingPage;else pref.landingPage=value;localStorage.setItem(key,JSON.stringify(pref))},{value,missing});
  await api('coldStart');
}
async function test(name,fn){
  try{await api('reset');await api('setOrientation','portrait');await api('setReviewOpen',false);await fn();results.push({name,status:'passed'});console.log('PASS '+name)}
  catch(error){results.push({name,status:'failed',reason:error.message,state:await state().catch(()=>null)});console.error('FAIL '+name+' '+error.message)}
}
(async()=>{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  page=await browser.newPage({viewport:{width:1480,height:1140}});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url())});
  await page.goto(pathToFileURL(path.join(root,'Steam接入Demo.html')).href);
  await page.waitForFunction(()=>!!window.demo);
  await test('未设置默认页时冷启动按方向落地',async()=>{
    await savedLanding(null);
    for(const [orientation,expected] of [['portrait','home'],['landscape','library']]){await api('setOrientation',orientation);await api('coldStart');assert.equal((await state()).page,expected);assert.equal((await state()).pref.landingPage,null)}
  });
  await test('旧版缺默认页字段时仍按方向落地',async()=>{
    await savedLanding(null,true);
    for(const [orientation,expected] of [['portrait','home'],['landscape','library']]){await api('setOrientation',orientation);await api('coldStart');assert.equal((await state()).page,expected)}
  });
  await test('主页社区游戏库显式设置跨方向优先',async()=>{
    for(const landing of ['home','community','library']){await savedLanding(landing);for(const orientation of ['portrait','landscape']){await api('setOrientation',orientation);await api('coldStart');assert.equal((await state()).page,landing);assert.equal((await state()).pref.landingPage,landing)}}
  });
  await test('Steam显式默认页冷启动仍经过模式协议门禁',async()=>{
    await savedLanding('steam');
    for(const orientation of ['portrait','landscape']){await api('setOrientation',orientation);await api('coldStart');assert.equal((await state()).page,'mode');assert.equal(await page.locator('#consent').isChecked(),false);assert.equal(await page.locator('[data-action="confirm-mode"]').isEnabled(),false)}
  });
  await test('旋转已打开的页面不重新导航',async()=>{
    await savedLanding(null);await api('setOrientation','portrait');await api('coldStart');assert.equal((await state()).page,'home');await api('setOrientation','landscape');assert.equal((await state()).page,'home');await api('coldStart');assert.equal((await state()).page,'library');await api('setOrientation','portrait');assert.equal((await state()).page,'library');
  });
  await test('设置仅四个选项且未设置时回显当前方向默认',async()=>{
    for(const [orientation,value] of [['portrait','home'],['landscape','library']]){await api('setOrientation',orientation);await outer('settings');await action('landing-settings');assert.deepEqual(await page.locator('[data-action="landing-select"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.landing)),['home','community','library','steam']);assert.equal(await page.locator('[data-action="landing-select"][aria-checked="true"]').getAttribute('data-landing'),value);await shot(orientation==='portrait'?'52-启动后进入-竖屏':'53-启动后进入-横屏');await action('close-modal');await action('settings-back')}
  });
  await test('取消不写偏好，保存只影响下次冷启动',async()=>{
    await outer('settings');await action('landing-settings');await choose('community');await action('close-modal');assert.equal((await state()).pref.landingPage,null);await action('landing-settings');assert.equal((await state()).landingSelection,'home');await choose('community');await action('save-landing');assert.equal((await state()).page,'settings');assert.equal((await state()).pref.landingPage,'community');await action('settings-back');assert.equal((await state()).page,'library');await api('coldStart');assert.equal((await state()).page,'community');await api('coldStart');assert.equal((await state()).page,'community');
  });
  await test('新版主页与游戏库支持实际导航且图片可加载',async()=>{
    await api('coldStart');assert.equal((await state()).page,'home');await shot('50-主页-竖屏');await action('library');assert.equal((await state()).page,'library');await api('setOrientation','landscape');await api('coldStart');assert.equal((await state()).page,'library');await shot('51-冷启动默认游戏库-横屏');assert.deepEqual(await page.locator('img').evaluateAll(nodes=>nodes.filter(n=>!n.complete||!n.naturalWidth).map(n=>n.alt)),[]);
  });
  await test('旧版已登录默认Steam也必须重新模式勾选',async()=>{
    await api('loadFixture','legacy-login');await savedLanding('steam');assert.equal((await state()).page,'mode');assert.equal(await page.locator('#consent').isChecked(),false);assert.equal((await state()).pref.flowVersion,0);
  });
  await test('PC游戏与导入游戏均经过模式准备登录后只请求一次启动',async()=>{
    for(const [game,mode,method] of [['elden','gamepad','password'],['hades','window','qr']]){await api('reset');await hostGame(game);assert.equal((await state()).page,'mode');assert.equal((await state()).pendingGame,game);assert.equal((await state()).gameStatus,'idle');await consent(mode);assert.equal((await state()).page,'prepare');await ready();assert.equal((await state()).page,'login');assert.equal((await state()).pendingGame,game);assert.equal(await page.locator('.landing-guide').count(),0);await login(method);const s=await state();assert.equal(s.page,'steam');assert.equal(s.steamPage,'detail');assert.equal(s.game,game);assert.equal(s.currentMode,mode);assert.equal(s.gameStatus,'waiting');assert.equal(s.launchCount,1);assert.equal(await page.locator('.landing-guide').count(),0);await action('launch-game');assert.equal((await state()).launchCount,1);await api('setOrientation','landscape');assert.equal((await state()).launchCount,1);await outer('game-success');assert.equal((await state()).gameStatus,'ack');await api('setOrientation','portrait')}
    await shot('56-导入游戏启动回执-竖屏');
  });
  await test('准备失败及登录失败保留游戏目标，重试后恢复目标',async()=>{
    await api('setScenario','prepare');await hostGame('hades');await consent();await api('advance');await api('advance');await api('advance');assert.equal((await state()).stage,'prepareError');assert.equal((await state()).pendingGame,'hades');await api('setScenario','normal');await action('download-control');await ready();await login('password',false);assert.equal((await state()).page,'login');assert.equal((await state()).pendingGame,'hades');assert.equal((await state()).pref.account,null);assert.equal(await page.locator('#loginPassword').inputValue(),'private_password');await action('submit-login');await outer('login-success');assert.equal((await state()).game,'hades');assert.equal((await state()).gameStatus,'waiting');assert.equal((await state()).launchCount,1);
  });
  await test('模式取消与准备收起清理游戏目标，普通Steam入口不串游戏',async()=>{
    await hostGame('hades');await action('library');assert.equal((await state()).pendingGame,null);assert.equal((await state()).autoLaunch,false);await action('enter-steam');await consent();await ready();await login();assert.equal((await state()).steamPage,'library');assert.equal((await state()).gameStatus,'idle');assert.equal((await state()).launchCount,0);
    await api('reset');await hostGame('elden');await consent();await action('library');assert.equal((await state()).pendingGame,null);await action('enter-steam');await ready();await login();assert.equal((await state()).steamPage,'library');assert.equal((await state()).launchCount,0);
  });
  await test('有效登录账号从盖世游戏卡直接启动目标且仍等待回执',async()=>{
    await api('loadFixture','library-account');await hostGame('hades');const s=await state();assert.equal(s.page,'steam');assert.equal(s.game,'hades');assert.equal(s.steamPage,'detail');assert.equal(s.gameStatus,'waiting');assert.equal(s.launchCount,1);await shot('55-盖世游戏直达Steam启动中');await outer('game-fail');assert.equal((await state()).gameStatus,'error');await action('launch-game');assert.equal((await state()).launchCount,2);await outer('game-success');assert.equal((await state()).gameStatus,'ack');
  });
  await test('登录成功才更新账号卡，失败和过期仍为Steam入口',async()=>{
    assert.equal((await page.locator('[data-testid="steam-entry"]').innerText()).trim(),'Steam');await action('enter-steam');await consent();await ready();await login('password',false);assert.equal((await state()).pref.account,null);await action('library');assert.equal((await page.locator('[data-testid="steam-entry"]').innerText()).trim(),'Steam');await action('enter-steam');await action('submit-login');await outer('login-success');assert.equal((await state()).loginPassword,'');await action('library');assert.equal(await page.locator('.account-name').innerText(),'星际玩家');assert.equal(await page.locator('.account-avatar img').count(),1);await shot('54-游戏库昵称头像-竖屏');const stored=await page.evaluate(()=>localStorage.getItem('gamehub-steam-demo-v1'));assert.ok(!stored.includes('private_login_name')&&!stored.includes('private_password'));await api('setScenario','login');assert.equal((await page.locator('[data-testid="steam-entry"]').innerText()).trim(),'Steam');assert.equal((await state()).pref.account,null);
  });
  await test('账号无昵称头像时显示默认头像与Steam玩家且横竖可点击',async()=>{
    for(const orientation of ['portrait','landscape']){await api('loadFixture','library-account-fallback');await api('setOrientation',orientation);assert.equal(await page.locator('.account-name').innerText(),'Steam 玩家');assert.equal(await page.locator('.account-avatar svg').count(),1);await action('enter-steam');assert.equal((await state()).page,'steam')}
  });
  await test('首次Steam库展示非阻断引导，知道了持久化且不再展示',async()=>{
    await action('enter-steam');await consent();assert.equal(await page.locator('.landing-guide').count(),0);await ready();assert.equal(await page.locator('.landing-guide').count(),0);await login();assert.equal(await page.locator('.landing-guide').count(),1);assert.equal(await page.locator('.landing-guide [data-action="landing-guide-dismiss"]').count(),1);await shot('57-首次启动页引导-竖屏');await api('setOrientation','landscape');await shot('58-首次启动页引导-横屏');await action('landing-guide-dismiss');assert.equal((await state()).pref.landingGuideSeen,true);assert.equal(await page.locator('.landing-guide').count(),0);await action('library');await action('enter-steam');assert.equal(await page.locator('.landing-guide').count(),0);await api('coldStart');if((await state()).page==='home')await action('library');await action('enter-steam');await ready();assert.equal(await page.locator('.landing-guide').count(),0);
  });
  await test('引导去设置打开通用默认页四选项，保存后返回不跳页',async()=>{
    await api('loadFixture','landing-guide');await action('landing-guide-settings');assert.equal((await state()).page,'settings');assert.equal((await state()).modal,'landing');assert.equal((await state()).pref.landingGuideSeen,true);await choose('steam');await action('save-landing');assert.equal((await state()).page,'settings');await action('settings-back');assert.equal((await state()).page,'steam');assert.equal(await page.locator('.landing-guide').count(),0);await api('coldStart');assert.equal((await state()).page,'prepare');await ready();assert.equal((await state()).page,'steam');assert.equal(await page.locator('.landing-guide').count(),0);
  });
  const record={date:'2026-10-28',artifact:'Steam接入Demo.html',results,scriptErrors:errors,remoteRequests:remote,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length};
  fs.writeFileSync(path.join(root,'入口与默认页验证.json'),JSON.stringify(record,null,2));await browser.close();console.log(JSON.stringify({passed:record.passed,failed:record.failed}));if(record.failed||errors.length||remote.length)process.exitCode=1;
})().catch(async error=>{console.error(error);if(browser)await browser.close();process.exitCode=1});
