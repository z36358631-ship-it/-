const {chromium}=require('playwright-core'),assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1450,height:1050}}),errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);
 await p.goto('file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/'));
 const click=async a=>p.locator('[data-action="'+a+'"]').first().click();
 for(const platform of ['app','landscape','mac']){
  await p.evaluate(platform=>{s.platform=platform;applyState('session');s.desktop=false;render();},platform);
  await click('panel:operation');await click(platform==='mac'?'mac-category:quality':'panel:display');
  await click(platform==='mac'?'mac-option:quality:自定义':'set:quality:自定义');
  const slider=p.locator(platform==='mac'?'#mac-bitrate':'#session-bitrate');await slider.fill('23');
  assert.equal(await slider.locator('..').locator('output').innerText(),'23 Mbps');
  await click('panel-close').catch(async()=>{await click('panel:operation');});
  await click('panel:operation');await click(platform==='mac'?'mac-category:quality':'panel:display');
  assert.equal(await p.locator(platform==='mac'?'#mac-bitrate':'#session-bitrate').inputValue(),'23');
  if(platform==='mac')await click('mac-category:screen');
  const resolutionAction=platform==='mac'?'mac-screen-resolution':'settings-resolution';await click(resolutionAction);
  assert.equal(await p.locator('.settings-options button').count(),9);await click('cancel');assert.equal(await p.evaluate(()=>s.resolution),'1920 × 1080');
  await click(resolutionAction);await click('settings-resolution-set:1280 × 720');assert.equal(await p.evaluate(()=>s.resolution),'1280 × 720');
  assert.equal(await p.getByRole('dialog').count(),0);
  await click(platform==='mac'?'mac-option:scale:125%':'set:scale:125%');
  assert.equal(await p.locator('.remote-canvas').evaluate(e=>getComputedStyle(e).getPropertyValue('--remote-scale')),'1.25');
  const superAction=platform==='mac'?'mac-super-resolution':'settings-super';
  await click(superAction);await click('cancel');assert.equal(await p.evaluate(()=>s.superScreen),false);
  await click(superAction);await click('settings-super-confirm');assert.equal(await p.evaluate(()=>s.superScreen),true);assert.equal(await p.evaluate(()=>s.macVirtual),false);assert.equal(await p.evaluate(()=>s.resolution),'2480 × 1116');
  await click(superAction);await click('settings-super-confirm');assert.equal(await p.evaluate(()=>s.resolution),'1280 × 720');assert.equal(await p.evaluate(()=>s.scale),'125%');
  if(platform==='mac'){await click('mac-category:security');}else{await click('panel:operation');await click('panel:security');}
  await click('toggle:macLockAfter');assert.equal(await p.evaluate(()=>s.macLockAfter),true);
  await click('toggle:autoUnlock');assert(await p.locator('[data-action="settings-unlock-confirm"]').isDisabled());await click('cancel');assert.equal(await p.evaluate(()=>s.autoUnlock),false);
  await click('toggle:autoUnlock');await p.locator('#settings-password').fill('demo-only');await click('settings-unlock-confirm');assert.equal(await p.evaluate(()=>s.autoUnlock),true);assert.equal(await p.locator('#settings-password').count(),0);
  await click('set:macPrivacy:自定义屏保');await click('settings-privacy');await click('settings-privacy-set:纯黑屏保');assert.equal(await p.evaluate(()=>s.privacyPreset),'纯黑屏保');
  await p.locator('.shell').screenshot({path:path.join(__dirname,'review-shots','session-security-'+platform+'.png')});
  if(platform==='mac'){
   await click('mac-category:window');await click('mac-option:macFit:实际大小 1:1');assert.equal(await p.locator('.mac-desktop').getAttribute('data-fit'),'实际大小 1:1');assert.equal(await p.locator('.mac-desktop').evaluate(e=>getComputedStyle(e).backgroundSize),'1920px 1080px');
   await click('mac-option:macWindowOpacity:80%');await click('mac-small-window');assert.equal(await p.locator('.shell').evaluate(e=>getComputedStyle(e).opacity),'0.8');
   await click('panel:operation');await click('mac-category:window');await click('mac-small-window');assert.equal(await p.locator('.shell').evaluate(e=>getComputedStyle(e).opacity),'1');
   await click('panel:operation');await click('mac-category:quality');assert(!(await p.locator('.mac-control-submenu').innerText()).includes('HDR'));
   await click('mac-category:tools');assert(await p.locator('[data-action="panel:windows"]').isVisible());assert(await p.locator('[data-action="panel:text"]').isVisible());assert(!(await p.locator('.mac-control-submenu').innerText()).includes('游戏排队'));
  }
  await p.evaluate(()=>{device().os='macOS';s.panel=s.platform==='mac'?'operation':'security';s.macControlCategory='security';render();});
  assert.equal(await p.locator('[data-action="set:macPrivacy:黑屏"],[data-action="toggle:autoUnlock"]').count(),0);
  checks.push(platform+'：分辨率选择/取消、码率持续保存、缩放、超级屏确认/恢复/互斥、安全开关及屏保返回；平台限制有效');
 }
 checks.push('Mac：1:1显示实际应用，小窗透明度生效且还原；窗口/长文本原入口保留');
 assert.deepEqual(errors,[]);const report={checks,errors,scope:'界面模拟，不修改真实主机设置、密码、画质或音频'};fs.writeFileSync(path.join(__dirname,'session-settings-test-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
