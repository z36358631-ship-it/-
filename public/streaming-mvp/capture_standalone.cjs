const { chromium } = require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const ROOT=__dirname;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const report=[];
 try{
  for(const [name,file,state,selector,vp] of [
   ['mobile-login','mobile.html','login','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-login-overseas','mobile.html','login&region=overseas','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-account','mobile.html','profile','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-auth','mobile.html','auth','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-devices','mobile.html','list','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-detail','mobile.html','detail','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-session','mobile.html','session','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-keyboard','mobile.html','computer-keyboard','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-files','mobile.html','files','.mobile-independent-shell',{width:1100,height:1100}],
   ['mobile-landscape','mobile.html','list&platform=landscape','.mobile-independent-shell',{width:1200,height:950}],
   ['desktop-login','mac.html','login','.shell',{width:1600,height:1100}],
   ['desktop-login-overseas','mac.html','login&region=overseas','.shell',{width:1600,height:1100}],
   ['desktop-onboarding','mac.html','onboarding','.shell',{width:1600,height:1100}],
   ['desktop-welcome','mac.html','welcome','.shell',{width:1600,height:1100}],
   ['desktop-devices','mac.html','list','.shell',{width:1600,height:1100}],
   ['desktop-detail','mac.html','detail','.shell',{width:1600,height:1100}],
   ['desktop-files','mac.html','files','.shell',{width:1600,height:1100}],
   ['desktop-settings','mac.html','remote-settings','.shell',{width:1600,height:1100}],
   ['desktop-session','mac.html','session','.shell',{width:1600,height:1100}]
  ]){
   const page=await browser.newPage({viewport:vp});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file:///'+path.join(ROOT,file).replaceAll('\\','/')+'?state='+state);
   await page.waitForTimeout(150);await page.locator(selector).first().screenshot({path:path.join(ROOT,'assets','standalone-'+name+'.png')});
   report.push({name,state,errors,title:await page.title(),text:(await page.locator(selector).first().innerText()).slice(0,1200)});await page.close();
  }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(ROOT,'standalone-capture-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})();

