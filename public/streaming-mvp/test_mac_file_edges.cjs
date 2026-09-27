const {chromium}=require('playwright-core'),assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),p=await b.newPage({viewport:{width:1450,height:1050}}),errors=[];p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.setInterval=()=>0;});await p.goto('file:///'+path.join(__dirname,'mac.html').replaceAll('\\','/')+'?state=files');
 const click=async a=>p.locator('[data-action="'+a+'"]').first().click(),tasks=()=>p.evaluate(()=>s.macFileTasks),finish=()=>p.evaluate(()=>{for(let i=0;i<11;i++)macFilesTick();render();});
 await click('mac-file-open:remote:2');assert.equal(await p.evaluate(()=>s.macFilePaths.remote),'此电脑/文档');
 // Base files, queued copies and completed copies all reserve their destination names.
 await click('mac-file-select:remote:2');await click('mac-file-send:remote');await finish();await click('mac-file-batch:clear');
 await click('mac-file-select:local:received0');await click('mac-file-send:local');let t=(await tasks())[0];assert.equal(t.status,'conflict');
 await click('mac-file-conflict:skip:'+t.id);assert.equal((await tasks())[0].status,'skipped');
 await click('mac-file-select:local:received0');await click('mac-file-send:local');t=(await tasks()).at(-1);await click('mac-file-conflict:keep:'+t.id);assert.equal((await tasks()).at(-1).outputName,'项目方案 (1).pdf');
 await click('mac-file-select:local:received0');await click('mac-file-send:local');t=(await tasks()).at(-1);await click('mac-file-conflict:keep:'+t.id);assert.equal((await tasks()).at(-1).outputName,'项目方案 (2).pdf');
 await finish();await click('mac-file-batch:clear');assert.equal((await tasks()).length,0);assert((await p.locator('.mac-file-pane').last().innerText()).includes('项目方案 (2).pdf'));
 // Folder checkbox sends it, while clicking its name still opens the directory.
 await p.locator('[data-mac-file-side="local"][data-mac-file-id="0"]').check();await click('mac-file-send:local');await finish();
 await click('mac-file-open:remote:received2');assert((await p.locator('.mac-file-pane').last().innerText()).includes('项目记录.txt'));await click('mac-file-back:remote');assert.equal(await p.evaluate(()=>s.macFilePaths.remote),'此电脑/文档');
 // Disconnect must stop progress, and reconnection alone must not resume.
 await click('mac-file-select:local:2');await click('mac-file-send:local');await p.evaluate(()=>{macFilesTick();device().online=false;macFilesTick();render();});t=(await tasks()).at(-1);assert.equal(t.status,'waiting');const progress=t.progress;
 assert(await p.locator('[data-action="mac-file-task:resume:'+t.id+'"]').isDisabled());assert(await p.locator('[data-action="mac-file-send:local"]').isDisabled());
 await p.evaluate(()=>{device().online=true;macFilesTick();render();});assert.equal((await tasks()).at(-1).progress,progress);await click('mac-file-task:resume:'+t.id);await finish();assert.equal((await tasks()).at(-1).status,'done');
 // Failed fixture is recoverable; cancel never writes a copy.
 await p.evaluate(()=>{s.macFileTasks.push({id:'failed-fixture',name:'失败测试.zip',size:'1 MB',kind:'file',source:'/Users/mac/Documents',target:'此电脑/文档',targetSide:'remote',status:'failed',progress:0});render();});
 await click('mac-file-task:resume:failed-fixture');assert.equal((await tasks()).at(-1).status,'running');await click('mac-file-task:cancel:failed-fixture');await finish();assert(!(await p.locator('.mac-file-pane').last().innerText()).includes('失败测试.zip'));
 await p.evaluate(()=>{s.macFileTasks.push({id:'offline-conflict',name:'项目方案.pdf',size:'3.2 MB',kind:'file',source:'/Users/mac/Documents',target:'此电脑/文档',targetSide:'remote',status:'conflict',progress:0});device().online=false;render();});
 await click('mac-file-conflict:keep:offline-conflict');assert.equal((await tasks()).at(-1).status,'waiting');
 await p.locator('.shell').screenshot({path:path.join(__dirname,'review-shots','mac-file-boundaries.png')});
 assert.deepEqual(errors,[]);const report={checks:['目录点击进入/历史返回与勾选发送分离','同名跳过与保留两者：基础文件、排队副本、已完成副本均检测且序号递增','清完成任务保留虚拟文件、传输文件夹保留内容','断线停止/上线手动继续、失败重试、取消不写入、离线同名副本保持等待'],errors,scope:'本地内存文件 Demo'};fs.writeFileSync(path.join(__dirname,'mac-file-edges-test-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
