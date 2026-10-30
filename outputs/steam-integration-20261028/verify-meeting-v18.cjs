const {chromium}=require('playwright-core'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
(async()=>{
 const dir=path.join(__dirname,'meeting-v18-evidence');fs.mkdirSync(dir,{recursive:true});
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const p=await b.newPage({viewport:{width:1480,height:1140}});p.setDefaultTimeout(6000);
 const errors=[],remote=[],results=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});
 await p.goto(pathToFileURL(path.join(__dirname,'Steam接入Demo.html')).href);
 const api=(name,arg)=>p.evaluate(([n,a])=>demo[n](a),[name,arg]);
 const act=n=>p.locator('#screen [data-action="'+n+'"]:not([inert] *)').first().click();
 const control=async n=>{await api('setReviewOpen',true);await p.locator('#rail [data-action="'+n+'"]').click();await api('setReviewOpen',false)};
 const fixture=key=>api('loadFixture',key);
 async function test(name,fn){await api('setOrientation','portrait');await fixture('source-imported');await fn();results.push({name,status:'passed'});console.log('PASS '+name)}
 await test('分类区分Steam游戏及导入来源，空分类保持切换能力',async()=>{
  assert.equal(await p.locator('.steam-card').count(),1);assert(await p.getByText('本机导入游戏，不代表 Steam 已购买').isVisible());
  await p.getByRole('tab',{name:'Steam 游戏',exact:true}).click();assert.equal(await p.locator('.steam-card').count(),3);
  await fixture('source-empty');assert(await p.getByText('暂无盖世导入游戏').isVisible());assert(await p.getByRole('tab',{name:'Steam 游戏',exact:true}).isEnabled());
 });
 await test('导入后仅同步成功新增Steam导入列表，失败保留快照，重复回执不重复',async()=>{
  await control('meeting-import');assert(await p.getByText('正在同步游戏').isVisible());assert.equal(await p.locator('.steam-card').count(),1);
  await control('meeting-sync-fail');assert(await p.getByText('游戏同步失败').isVisible());assert.equal(await p.locator('.steam-card').count(),1);
  await act('meeting-sync-retry');await p.waitForTimeout(750);assert.equal(await p.locator('.steam-card').count(),2);
  await control('meeting-import');await control('meeting-sync-complete');assert.equal(await p.locator('.steam-card').count(),2);
  await p.locator('.steam-card[data-game="wukong"]').click();assert.equal((await api('getState')).gameSource,'imported_pc');assert(await p.getByText('盖世导入 · 本机游戏').isVisible());
 });
 await test('Steam下载同步到盖世，切账号不串私有下载，模拟重启保留当前身份',async()=>{
  await control('meeting-download');await control('meeting-sync-complete');await act('library');assert.equal(await p.locator('.gamecard').count(),3);assert(await p.getByText('Steam 已下载').isVisible());
  await act('enter-steam');await act('account-management');await p.locator('[data-account="demo-rain"]').click();await act('account-close');assert.equal(await p.locator('.steam-card').count(),1);
  await act('library');assert(await p.locator('.account-name').getByText('时雨').isVisible());assert.equal(await p.locator('.gamecard').count(),2);
  await api('coldStart');assert.equal((await api('getState')).pref.account.id,'demo-rain');await act('library');assert(await p.locator('.account-name').getByText('时雨').isVisible());
  await act('enter-steam');await control('advance');await p.waitForTimeout(1250);await act('account-management');await act('account-logout');await act('library');assert.equal(await p.locator('.account-name').count(),0);await api('coldStart');assert.equal((await api('getState')).pref.account,null);
 });
 await test('网络重试保留已填写账号密码及原好友目标',async()=>{
  await fixture('steam-network-error');assert(await p.getByText('网络连接失败').isVisible());await act('meeting-network-retry');assert(await p.getByText('正在加载',{exact:true}).isVisible());await p.waitForTimeout(750);assert(await p.getByRole('tab',{name:'Steam 游戏',exact:true}).isVisible());
  await fixture('login-empty');await api('enter','friends');await api('advance');
  await p.locator('#loginUser').fill('meeting_demo_user');await p.locator('#loginPassword').fill('meeting_demo_password');
  assert.equal((await api('getState')).pendingTarget,'friends');await api('setMeetingNetwork','error');assert(await p.getByText('网络连接失败').isVisible());
  await act('meeting-network-retry');await p.waitForTimeout(750);assert.equal(await p.locator('#loginUser').inputValue(),'meeting_demo_user');assert.equal(await p.locator('#loginPassword').inputValue(),'meeting_demo_password');assert.equal((await api('getState')).pendingTarget,'friends');assert.equal((await api('getState')).loggedIn,false);
  assert(!(await p.evaluate(()=>JSON.stringify(localStorage))).includes('meeting_demo_'));
 });
 await test('模拟重开保留同步失败和未完成状态，不吞失败或套用过期回执',async()=>{
  await control('meeting-download');await control('meeting-sync-fail');await api('coldStart');await act('library');
  assert.equal((await api('getMeetingState')).sync,'error');assert(await p.getByText('游戏同步失败').isVisible());assert.equal(await p.locator('.gamecard').count(),2);
  await act('meeting-sync-retry');await api('coldStart');await act('library');await p.waitForTimeout(750);
  assert.equal((await api('getMeetingState')).sync,'loading');assert(await p.getByText('正在同步游戏').isVisible());assert.equal(await p.locator('.gamecard').count(),2);
  await control('meeting-sync-complete');assert.equal((await api('getMeetingState')).sync,'ready');assert.equal(await p.locator('.gamecard').count(),3);
 });
 await test('切号取消上个账号待完成的同步结果',async()=>{
  await control('meeting-download');await control('meeting-sync-fail');await act('meeting-sync-retry');await act('account-management');await p.locator('[data-account="demo-rain"]').click();await p.waitForTimeout(750);await act('account-close');assert.equal(await p.locator('.steam-card').count(),1);await act('library');assert.equal(await p.locator('.gamecard').count(),2);
 });
 await test('保留原生好友工坊及悬浮球最小化路径，浏览器刷新重置',async()=>{
  await act('bubble');await act('friends');assert(await p.getByRole('heading',{name:'好友与聊天'}).isVisible());await act('bubble');await act('workshop');assert(await p.getByRole('heading',{name:'创意工坊'}).isVisible());await act('bubble');await act('minimize-bubble');assert.equal((await api('getState')).bubbleMinimized,true);await p.reload();assert.equal((await api('getState')).page,'library');assert.equal((await api('getState')).pref.account,null);
 });
 for(const o of ['portrait','landscape']){
  await api('setOrientation',o);
  for(const key of ['steam-library','source-imported','sync-error','steam-network-error','sync-download-complete','source-empty']){
   await fixture(key);await api('setReviewOpen',false);
   assert(await p.locator('#screen').evaluate(el=>el.scrollWidth<=el.clientWidth),o+' '+key+' screen overflow');
   const name=key+'-'+o+'.png';await p.locator('#device').screenshot({path:path.join(dir,name)});
  }
 }
 for(const [key,file] of [['steam-library','04-steam.png'],['sync-download-complete','28-library-account.png'],['source-imported','46-imported-library.png'],['sync-error','47-sync-failed.png'],['steam-network-error','48-network-failed.png'],['sync-download-complete','49-steam-downloaded-host.png']]){
  await api('setOrientation','portrait');await fixture(key);await p.locator('#device').screenshot({path:path.join(__dirname,'prd-assets',file)});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 fs.writeFileSync(path.join(dir,'验证记录.json'),JSON.stringify({scope:'离线交互模拟；模拟重开仅复用已确认身份，未模拟原生身份核对中/失败/外部退出；未验证真实Steam网络和SDK同步能力',passed:results.length,failed:0,results,errors,remote},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
