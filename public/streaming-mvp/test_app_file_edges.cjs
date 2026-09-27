const {chromium}=require('playwright-core');
const assert=require('assert');
const fs=require('fs');
const path=require('path');

(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1450,height:1050}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Keep progress deterministic: this suite drives the same public tick used by the timer.
 await page.addInitScript(()=>{window.setInterval=()=>0;});
 await page.goto('file:///'+path.join(__dirname,'mobile.html').replaceAll('\\','/'));
 page.setDefaultTimeout(5000);
 const click=async a=>page.locator('[data-action="'+a+'"]').first().click();
 const state=async()=>page.evaluate(()=>({files:s.files,saved:s.appSavedFiles,modal:s.modal,notice:s.appFileNotice}));
 const finish=async()=>page.evaluate(()=>{for(let i=0;i<15;i++)appFilesTick();render();});
 const select=async (pick='file',item='')=>{await click('file-pick:'+pick);await click('file-selected'+(item?':'+item:''));};

 for(const platform of ['app','landscape']){
  await page.evaluate(platform=>{s.platform=platform;applyState('files');},platform);
  assert.equal(await page.locator('.file-top>button').count(),3);
  assert.equal(await page.locator('.file-section').count(),3);
  assert.equal(await page.locator('.file-item').count(),0);

  // Canceling the chooser creates no task. Pausing reserves a name but saves no file.
  await click('file-pick:file');await click('cancel');assert.equal((await state()).files.length,0);
  await select();let task=(await state()).files[0];
  await click('file-pause:'+task.id);
  await page.evaluate(()=>{appFilesTick();render();});
  assert.equal((await state()).files[0].progress,0);
  assert.equal((await state()).files[0].paused,true);
  await select();assert.equal((await state()).modal,'conflict');
  await click('file-skip');assert.equal((await state()).files.length,1);
  await click('file-pause:'+task.id);await finish();
  assert.equal((await state()).files[0].kind,'sent');

  // Clear requires confirmation and leaves the saved file available for conflict detection.
  await click('file-manage:sent');await click('cancel');assert.equal((await state()).files.length,1);
  await click('file-manage:sent');await click('clear-confirm');assert.equal((await state()).files.length,0);
  assert.equal((await state()).saved[JSON.stringify(['win','upload'])][0].name,'项目说明.txt');
  await select();assert.equal((await state()).modal,'conflict');await click('file-keep');
  assert.equal((await state()).files[0].name,'项目说明 (1).txt');await finish();
  await click('file-manage:sent');await click('clear-confirm');
  await select();await click('file-keep');assert.equal((await state()).files[0].name,'项目说明 (2).txt');

  // Download is a separate destination; saved files and active download copies both conflict.
  await select('download');assert.equal((await state()).modal,'');
  assert.equal((await state()).files.filter(f=>f.direction==='download').length,1);
  await select('download');assert.equal((await state()).modal,'conflict');await click('file-keep');
  assert.equal((await state()).files.filter(f=>f.direction==='download').at(-1).name,'项目说明 (1).txt');
  await finish();assert.equal((await state()).files.filter(f=>f.kind==='received').length,2);
  await click('file-manage:received');await click('clear-confirm');
  await select('download');assert.equal((await state()).modal,'conflict');await click('file-skip');
  checks.push(platform+'：3入口3记录区；选择取消；活动任务与已保存文件同名检测；清记录二次确认；上传/下载副本连续递增');

  // Outage freezes progress and requires an explicit continuation after recovery.
  await page.evaluate(()=>applyState('files'));await select();
  await page.evaluate(()=>{appFilesTick();device().online=false;appFilesTick();render();});
  let snapshot=await state();task=snapshot.files[0];const stopped=task.progress;
  assert.equal(task.waiting,true);assert.equal(task.paused,true);
  assert(await page.locator('[data-action="file-pause:'+task.id+'"]').isDisabled());
  assert(await page.locator('[data-action="file-pick:file"]').isDisabled());
  await page.evaluate(()=>{appFileAction('file-pick:file');appFilesTick();});
  assert.equal((await state()).modal,'');assert.equal((await state()).files.length,1);
  await page.evaluate(()=>{device().online=true;appFilesTick();render();});
  assert.equal((await state()).files[0].progress,stopped);
  await click('file-pause:'+task.id);await finish();assert.equal((await state()).files[0].kind,'sent');

  // Existing preview failures remain still until the user retries, then restart at zero.
  await page.evaluate(()=>applyState('file-failed'));task=(await state()).files[0];
  await page.evaluate(()=>appFilesTick());assert.equal((await state()).files[0].failed,true);
  await page.evaluate(()=>{device().online=false;render();});
  assert(await page.locator('[data-action="file-retry:'+task.id+'"]').isDisabled());
  await page.evaluate(()=>{device().online=true;render();});await click('file-retry:'+task.id);
  assert.equal((await state()).files[0].progress,0);assert.equal((await state()).files[0].failed,false);
  await click('file-cancel:'+task.id);assert.equal((await state()).files.length,0);
  assert.equal((await state()).saved[JSON.stringify(['win','upload'])]?.length||0,0);
  checks.push(platform+'：断线等待、离线禁止新建/恢复、重新上线需手动继续、失败重试从零、取消不落盘');

  // Multi-task management, folder demo, device isolation, and escaped names.
  await page.evaluate(()=>applyState('files'));await select('file');await select('media');await select('download','folder');
  assert.equal((await state()).files.length,3);assert.equal((await state()).files.at(-1).type,'folder');
  await click('file-manage:running');await click('pause-all');assert((await state()).files.every(f=>f.paused));
  await click('file-manage:running');await click('resume-all');assert((await state()).files.every(f=>!f.paused));
  await click('file-manage:running');await click('cancel-all');assert.equal((await state()).files.length,0);
  await page.evaluate(()=>{
   s.files=[{id:'escaped',name:'<img src=x onerror="alert(1)">.txt',size:'84 B',kind:'running',progress:36,paused:true}];render();
  });
  assert.equal(await page.locator('.file-item img').count(),0);
  assert.equal(await page.locator('.file-item h3').innerText(),'<img src=x onerror="alert(1)">.txt');
  await page.evaluate(()=>{devices.push({id:'second',name:'另一台电脑',os:'Windows',online:true,busy:false});s.device='second';render();});
  assert.equal(await page.locator('.file-item').count(),0);await select();assert.equal((await state()).modal,'');
  assert.equal((await state()).files.at(-1).deviceId,'second');
  checks.push(platform+'：文件/媒体/文件夹并行任务，批量暂停/继续/取消，设备隔离，文件名转义');

  await page.evaluate(()=>applyState('conflict'));assert.equal(await page.locator('[data-action="file-keep"]').count(),1);
  await click('file-keep');assert.equal((await state()).files[0].name,'项目说明 (1).txt');
  await page.locator('.shell').screenshot({path:path.join(__dirname,'review-shots','app-file-edges-'+platform+'.png')});
 }
 assert.deepEqual(errors,[]);
 const report={checks,errors,scope:'纯内存 Demo；未调用系统文件选择器或访问真实文件'};
 fs.writeFileSync(path.join(__dirname,'app-file-edges-test-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
