import {chromium} from 'playwright-core';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
const evidence=path.join(dir,'evidence'),shots=path.join(root,'public/prd/app-help-center-20260924');
fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(shots,{recursive:true});
const url=pathToFileURL(path.join(dir,'evidence/integration-demo.html')).href;
const checks=[],errors=[],requests=[];
const record=(name,details)=>checks.push({name,status:'pass',details});
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--disable-background-networking']});
try{
 const p=await b.newPage({viewport:{width:1440,height:1100}});
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await p.goto(url);
 await p.locator('[data-route="help"]').click();assert.equal(await p.locator('.help-row').count(),4);
 await p.locator('[data-doc="HC-D002"]').click();
 const video=p.locator('.article-content video');await video.scrollIntoViewIfNeeded();await video.evaluate(v=>v.play());await p.waitForFunction(()=>document.querySelector('.article-content video').currentTime>0.1);
 assert.equal(await video.evaluate(v=>v.paused),false);record('设置→帮助分组→正文，内嵌视频真实播放');
 await p.evaluate(()=>window.__playingVideo=document.querySelector('.article-content video'));
 await p.locator('[data-back]').click();assert.equal(await p.evaluate(()=>window.__playingVideo.paused),true);record('离开文章暂停媒体');
 await p.locator('#language-select').selectOption('en');assert.match(await p.locator('.help-row').first().innerText(),/Welcome/);await p.locator('#language-select').selectOption('zh');record('App中英文内容切换');
 for(const [scenario,txt]of [['empty','暂无帮助内容'],['loading','正在加载'],['error','暂时无法加载']]){await p.locator('#scenario').selectOption(scenario);assert.match(await p.locator('#device').innerText(),new RegExp(txt));}
 await p.locator('[data-retry]').click();assert.equal(await p.locator('.help-row').count(),4);record('加载、空态、错误与重试');
 await p.locator('#scenario').selectOption('media-error');assert.equal(await p.locator('.media-error').count(),1);assert.ok((await p.locator('.article-content').innerText()).includes('文字与图片'));await p.locator('.media-error button').click();assert.equal(await p.locator('.media-error').count(),0);await video.evaluate(v=>v.play());await video.evaluate(v=>v.pause());record('视频失败隔离与重试恢复');
 await p.locator('[data-surface="admin"]').click();
 await p.locator('[data-ha-action="delete"][data-id="HC-N001"]').click();assert.match(await p.locator('[data-ha-feedback]').innerText(),/关联子文档/);assert.equal(await p.locator('[data-ha-action="confirm-delete"]').count(),0);record('引用目录禁止删除');
 await p.locator('[data-ha-tab="docs"]').click();await p.locator('[data-ha-action="edit"][data-id="HC-D001"]').click();
 await p.locator('[data-ha-title]').fill('修改中的入门文章');
 assert.equal(await p.evaluate(()=>HelpStore.published.docs[0].zh.title),'认识帮助中心');
 await p.locator('[data-ha-action="back"]').first().click();await p.locator('[data-ha-action="languages"][data-id="HC-D001"]').click();await p.locator('[data-ha-action="language-edit"][data-id="en"]').click();await p.locator('[data-ha-title]').fill('Updated welcome article');await p.locator('[data-ha-action="language-close"]').click();await p.locator('[data-ha-action="edit"][data-id="HC-D001"]').click();assert.equal(await p.locator('[data-ha-title]').inputValue(),'修改中的入门文章');record('双语切换保留输入且草稿不泄露');
 await p.locator('[data-ha-video-file]').setInputFiles(path.join(dir,'assets/example.webm'));await p.waitForFunction(()=>document.querySelector('[data-ha-feedback]').textContent.includes('视频已插入'));
 assert.equal(await p.locator('[data-ha-body] video').count(),1);
 await p.locator('[data-ha-image-file]').setInputFiles(path.join(dir,'assets/example.png'));await p.waitForFunction(()=>document.querySelector('[data-ha-feedback]').textContent.includes('图片已插入'));
 assert.equal(await p.locator('[data-ha-body] img').count(),1);record('后台真实文件插入图片和视频');
 const before=await p.locator('[data-ha-body]').innerHTML();
 await p.locator('[data-ha-video-file]').setInputFiles({name:'bad.mp4',mimeType:'video/mp4',buffer:Buffer.from('invalid video')});await p.waitForFunction(()=>document.querySelector('[data-ha-feedback]').textContent.includes('插入失败'));
 assert.equal(await p.locator('[data-ha-body]').innerHTML(),before);record('不可播放视频拒绝且原正文保留');
 await p.locator('[data-ha-action="back"]').first().click();await p.locator('[data-ha-action="publish"][data-id="HC-D001"]').click();assert.equal(await p.evaluate(()=>HelpStore.published.docs[0].zh.title),'修改中的入门文章');
 await p.locator('[data-surface="app"]').click();await p.evaluate(()=>HelpApp.go('help'));await p.locator('[data-doc="HC-D001"]').click();assert.equal(await p.locator('.article-content video').count(),1);assert.equal(await p.locator('.article h2').first().innerText(),'修改中的入门文章');record('后台发布后的标题图片视频在App一致呈现');
 const api=await p.evaluate(()=>{
  const s=HelpStore,r={};
  const old=s.published.docs.find(d=>d.id==='HC-D002').zh.title;s.get('docs','HC-D002').zh.title='排序不可发布此草稿';s.move('docs','HC-D002',-1);
  r.order=s.published.docs.filter(d=>d.navId==='HC-N001').sort((a,b)=>a.order-b.order).map(d=>d.id);
  r.draftIsolated=s.published.docs.find(d=>d.id==='HC-D002').zh.title===old;
  const n=s.create('navs');n.zh.title='新目录';r.missingEn=s.validate('navs',n.id);n.en.title='New category';
  const d=s.create('docs');d.navId=n.id;d.zh={title:'新文章',html:'<p>说明</p>'};d.en={title:'New article',html:'<p>Example</p>'};r.parentUnpublished=s.publish('docs',d.id);s.publish('navs',n.id);r.newPublish=s.publish('docs',d.id);
  const moved=s.get('docs','HC-D001');moved.navId=n.id;r.oldReference=s.remove('navs','HC-N001');
  const sanitized=s.sanitize('<p onclick="alert(1)">安全</p><script>alert(1)</script><a href="javascript:alert(1)">危险</a><img src=x onerror="alert(1)"><iframe src="https://example.com"></iframe>');r.sanitized=sanitized;
  r.removal=s.remove('docs',d.id);r.deleted=!s.published.docs.some(x=>x.id===d.id);return r;
 });
 assert.equal(api.order[0],'HC-D002');assert.equal(api.draftIsolated,true);assert.equal(api.missingEn,'');assert.match(api.parentUnpublished,/先发布/);assert.equal(api.newPublish,'');assert.match(api.oldReference,/关联/);assert.doesNotMatch(api.sanitized,/script|onclick|onerror|iframe|javascript/);assert.equal(api.deleted,true);
 record('顺序与内容隔离、默认语言必填与其他语言可空、父目录发布依赖、迁移引用保护、删除快照同步、富文本安全净化',api);
 // UI delete and cancellation are separate from the model contract checks above.
 await p.locator('[data-surface="admin"]').click();await p.locator('[data-ha-tab="docs"]').click();await p.locator('[data-ha-action="delete"][data-id="HC-D004"]').click();await p.locator('[data-ha-action="cancel-delete"]').click();assert.equal(await p.locator('[data-ha-action="edit"][data-id="HC-D004"]').count(),1);
 await p.locator('[data-ha-action="delete"][data-id="HC-D004"]').click();assert.match(await p.locator('.ha-delete').innerText(),/App 移除/);await p.locator('[data-ha-action="confirm-delete"]').click();assert.equal(await p.locator('[data-ha-action="edit"][data-id="HC-D004"]').count(),0);record('删除确认、取消及发布态影响提示');
 await p.locator('[data-ha-search]').fill('HC-D002');await p.locator('[data-ha-action="search"]').click();assert.equal(await p.locator('tbody tr').count(),1);await p.locator('[data-ha-action="reset"]').click();assert.ok(await p.locator('tbody tr').count()>1);record('后台搜索与重置');
 await p.reload();assert.equal(await p.evaluate(()=>HelpStore.published.docs[0].zh.title),'认识帮助中心');record('刷新恢复初始示例，无持久化误导');
 for(const size of [{width:390,height:867},{width:320,height:740},{width:1040,height:468}]){
  await p.setViewportSize(size);await p.goto(url+`?capture=1${size.width>900?'&orientation=landscape':''}`);await p.locator('[data-route="help"]').click();await p.locator('[data-doc="HC-D002"]').click();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await p.evaluate(()=>{const r=document.querySelector('.article-content').getBoundingClientRect();return r.right>innerWidth+.5;}),false);
 }
 record('320/390竖屏与1040×468横屏无根节点/文章溢出');
 await p.setViewportSize({width:1040,height:468});await p.goto(url+'?capture=1&orientation=landscape');await p.locator('[data-route="help"]').click();assert.equal(await p.locator('.article').count(),1);await p.locator('[data-doc="HC-D002"]').click();await p.locator('[data-back]').click();assert.equal(await p.locator('[data-route="help"]').count(),1);record('横屏独立双栏、首篇选择与返回设置');
 // Capture clean canonical states, independent of tests above.
 const q=await b.newPage({viewport:{width:390,height:867},deviceScaleFactor:2});
 await q.goto(url+'?capture=1');await q.screenshot({path:path.join(shots,'01-settings.png')});
 await q.locator('[data-route="help"]').click();await q.screenshot({path:path.join(shots,'02-help.png')});
 await q.locator('[data-doc="HC-D002"]').click();await q.screenshot({path:path.join(shots,'03-article.png')});
 await q.locator('[data-back]').click();await q.locator('[data-back]').click();await q.locator('[data-route="feedback"]').click();await q.screenshot({path:path.join(evidence,'feedback.png')});
 await q.setViewportSize({width:1040,height:468});await q.goto(url+'?capture=1&orientation=landscape&page=article&doc=HC-D002');await q.screenshot({path:path.join(shots,'07-landscape.png')});
 const a=await b.newPage({viewport:{width:1440,height:1000}});await a.goto(pathToFileURL(path.join(dir,'帮助中心后台demo.html')).href);await a.screenshot({path:path.join(shots,'04-admin-nav.png')});await a.locator('[data-ha-tab="docs"]').click();await a.screenshot({path:path.join(shots,'05-admin-docs.png')});await a.locator('[data-ha-action="edit"][data-id="HC-D002"]').click();await a.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await a.screenshot({path:path.join(shots,'06-admin-editor.png'),fullPage:true});
 // Baseline comparison is rendered at native source dimensions, with no raster resizing.
 const ref=await b.newPage({viewport:{width:558,height:1240},deviceScaleFactor:2});await ref.goto(url+'?capture=1&baseline=1');await ref.addStyleTag({content:'html{zoom:1.4307692307692308} .capture-mode #app-stage{width:390px} .capture-mode .device.portrait{width:390px;height:866.6666666666666px}'});await ref.screenshot({path:path.join(evidence,'settings-baseline-dom.png')});
 const geometry=await ref.evaluate(()=>Object.fromEntries(['.app-header','.settings-main .settings-card','.settings-secondary .settings-card','.logout-row'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x*2,y:r.y*2,width:r.width*2,height:r.height*2}];})));fs.writeFileSync(path.join(evidence,'geometry.json'),JSON.stringify(geometry,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);record('无JavaScript异常、离线运行无HTTP依赖');
 console.log(JSON.stringify({status:'pass',count:checks.length,checks},null,2));
}catch(e){console.error(e);checks.push({name:'执行失败',status:'fail',details:e.stack});process.exitCode=1;}finally{fs.writeFileSync(path.join(evidence,'verification.json'),JSON.stringify({date:new Date().toISOString(),checks,errors,requests},null,2));await b.close();}
