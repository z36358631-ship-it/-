const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core');
const path=require('path'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 await page.goto('file:///'+path.resolve('public/gamehub-pc-console-demo/index.html').replaceAll('\\','/'));
 await page.screenshot({path:path.join(__dirname,'baseline-current.png'),fullPage:false});
 const facts=await page.evaluate(()=>({title:document.title,background:getComputedStyle(document.querySelector('.screen')).backgroundColor,controlsLeft:document.querySelector('.sidebar')?.getBoundingClientRect().x,screenX:document.querySelector('.screen').getBoundingClientRect().x}));
 fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify({source:'public/gamehub-pc-console-demo/index.html',facts,scope:'Current HTML baseline, not current native-app proof'},null,2));
 console.log(JSON.stringify(facts));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
