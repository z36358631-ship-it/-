const path=require('path');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const jobs=[
  ['install-path','06-install-path.png'],['download-task','06-download-task.png'],['download-manager','06-download-manager.png'],
  ['install-result','06-install-result.png'],['library-launch-state','06-library-launch-state.png'],['required-update','06-required-update.png'],
  ['update-task','06-update-task.png'],['launch-recovery','06-launch-recovery.png'],['game-management','06-game-management.png'],
  ['repair','06-repair.png'],['uninstall','06-uninstall.png']
];
const requested=process.argv[2];
const selected=requested?jobs.filter(([page])=>page===requested):jobs;
if(requested&&!selected.length)throw new Error(`Unknown page: ${requested}`);
(async()=>{const browser=await chromium.launch({headless:true});try{for(const [pageName,png] of selected){const page=await browser.newPage({viewport:{width:1080,height:2400},deviceScaleFactor:1});const html=path.resolve(__dirname,'local-delivery-screens.html').replaceAll('\\','/');await page.goto(`file:///${html}?page=${encodeURIComponent(pageName)}`,{waitUntil:'load'});const dims=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,bw:document.body.scrollWidth,bh:document.body.scrollHeight}));if(dims.w!==1080||dims.h!==2400||dims.bw!==1080||dims.bh!==2400)throw new Error(`${pageName} overflow ${JSON.stringify(dims)}`);await page.screenshot({path:path.resolve(__dirname,png),fullPage:false});console.log(`${pageName}: 1080x2400 PASS`);await page.close()}}finally{await browser.close()}})();

