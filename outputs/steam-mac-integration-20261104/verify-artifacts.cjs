const {chromium}=require('../steam-integration-20261028/node_modules/playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
 await p.goto(pathToFileURL(path.join(__dirname,'review.html')).href);assert.equal(await p.locator('figure img').count(),19);assert.equal(await p.locator('figure img').evaluateAll(xs=>xs.filter(x=>!x.complete||!x.naturalWidth).length),0);await p.locator('figure img').first().click();assert(await p.locator('dialog').isVisible());await p.locator('dialog button').click();await p.screenshot({path:path.join(__dirname,'evidence/review.png')});
 await p.locator('a.open').click();assert.equal((await p.evaluate(()=>MacHost.getState())).page,'library');
 await p.evaluate(()=>SteamDemo.scenario('big'));assert.equal(await p.locator('.ms-steam-side').count(),1);assert.equal(await p.locator('.ms-steam-side').isVisible(),false);
 await p.evaluate(()=>SteamDemo.scenario('panel'));await p.locator('[data-s-action="session-mode"][data-value="window"]').click();assert(await p.locator('.ms-steam-side').isVisible());
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'evidence/artifacts-verification.json'),JSON.stringify({status:'passed',screens:19,checks:['本地流程图链接','19张页面图加载','图片放大','大屏隐藏侧栏','窗口恢复侧栏'],errors},null,2));
 }finally{await b.close()}})();
