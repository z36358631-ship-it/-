const {chromium}=require('playwright-core'),assert=require('assert'),path=require('path'),fs=require('fs');
(async()=>{
 let html=fs.readFileSync(path.join(__dirname,'mobile.html'),'utf8');
 const start=html.indexOf('// GameHub adaptations requested'),end=html.indexOf('/* Local artwork crops',start);
 assert(start>0&&end>start);html=html.slice(0,start)+fs.readFileSync(path.join(__dirname,'remote-controls.js'),'utf8')+'\n'+html.slice(end);
 html=html.replace('</style>',fs.readFileSync(path.join(__dirname,'remote-controls.css'),'utf8')+'</style>');
 html=html.replace(/function keyboardPanel\(\)\{[^\n]+/,`function keyboardPanel(){return '<div class="keyboard-nav">'+seg('keyboard',['输入法','快捷键','电脑键盘'])+ib('关闭键盘','panel-close','close')+'</div>'+(s.keyboard==='电脑键盘'?computerKeyboard():imeKeyboard());}`);
 const temp=path.join(__dirname,'.review-controls-preview.html');fs.writeFileSync(temp,html);
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:1000},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+temp.replaceAll('\\','/')+'?state=computer-keyboard');
 assert.equal(await page.locator('[data-action^="computer-key:"]').count(),104);
 await page.locator('[data-action="computer-key:Ctrl"]').click();await page.locator('[data-action="computer-key:F6"]').click();assert.equal(await page.evaluate(()=>s.lastRemoteKey),'Ctrl+F6');assert.equal(await page.evaluate(()=>s.computerModifiers.length),0);
 await page.locator('[data-action="computer-key:Shift"]').click();await page.locator('[data-action="computer-key:A"]').click();assert((await page.evaluate(()=>s.doc)).includes('A'));
 await page.evaluate(()=>{s.view=true;render();});assert(await page.locator('[data-action="computer-key:A"]').isDisabled());const original=await page.evaluate(()=>s.doc);await page.evaluate(()=>{action('computer-key:B');action('key:C');action('desktop');action('windows');action('panel:text');});assert.equal(await page.evaluate(()=>s.doc),original);assert.equal(await page.evaluate(()=>s.panel),'keyboard');
 await page.evaluate(()=>{applyState('session');s.doc=Array.from({length:100},(_,i)=>'滚动测试 '+i).join('\n');s.mouseOpen=true;render();});await page.waitForTimeout(80);
 await page.locator('[data-action="mouse-scroll:down"]').click();assert((await page.locator('.doc').evaluate(e=>e.scrollTop))>0);await page.locator('.doc').evaluate(e=>e.scrollTop=0);const wheel=await page.locator('.mouse-wheel').boundingBox();const pos=await page.locator('.floating-mouse').boundingBox();await page.mouse.move(wheel.x+wheel.width/2,wheel.y+wheel.height-5);await page.mouse.down();await page.mouse.move(wheel.x+wheel.width/2,wheel.y+4,{steps:5});await page.mouse.up();assert((await page.locator('.doc').evaluate(e=>e.scrollTop))>0);assert.deepEqual(await page.locator('.floating-mouse').boundingBox(),pos);
 const grip=await page.locator('.mouse-grip').boundingBox();await page.mouse.move(grip.x+15,grip.y+10);await page.mouse.down();await page.waitForTimeout(260);await page.mouse.move(grip.x-45,grip.y+60,{steps:4});await page.mouse.up();assert.notDeepEqual(await page.locator('.floating-mouse').boundingBox(),pos);
 const beforeMouse=await page.locator('.floating-mouse').boundingBox(),canvas=await page.locator('.remote-canvas').boundingBox(),beforeDoc=await page.evaluate(()=>s.doc);const client=await page.context().newCDPSession(page);const cx=canvas.x+canvas.width/2,cy=canvas.y+canvas.height/2;
 const touch=async(type,d)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:cx-d,y:cy,id:1},{x:cx+d,y:cy,id:2}]});
 await touch('touchStart',35);await touch('touchMove',75);await touch('touchEnd');assert((await page.evaluate(()=>s.remoteZoom))>1);assert.deepEqual(await page.locator('.remote-canvas').boundingBox(),canvas);assert.deepEqual(await page.locator('.floating-mouse').boundingBox(),beforeMouse);assert.equal(await page.evaluate(()=>s.doc),beforeDoc);
 await page.evaluate(()=>{s.platform='landscape';render();});await page.waitForTimeout(50);assert.equal(await page.locator('.remote-zoom-surface').count(),1);assert((await page.locator('.remote-zoom-surface').evaluate(e=>e.style.transform)).includes('scale('));
 assert.deepEqual(errors,[]);console.log('PASS: 104 keys, Ctrl+F6, Shift input, view-only guards, wheel scroll vs mouse drag, pinch preserves canvas/mouse/doc, landscape rerender.');
 }finally{await browser.close();fs.unlinkSync(temp);}
})().catch(e=>{console.error(e);process.exit(1)});
