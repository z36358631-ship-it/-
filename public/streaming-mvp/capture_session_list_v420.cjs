const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname,out=path.join(root,'review/prd-v420'),assets=path.join(root,'assets');
const act=a=>'[data-action='+JSON.stringify(a)+']';
async function invoke(p,a){await p.evaluate(a=>action(a),a);}
async function login(p,side){
 await p.goto(pathToFileURL(path.join(root,side+'.html')).href+'?lang=zh');
 if(side==='mobile'){
  await p.locator('#mobile-phone').fill('13600008000');await p.locator(act('mobile-sms')).click();await p.locator('#mobile-code').fill('864209');await p.locator('#mobile-agreement').check();await p.locator(act('mobile-login-submit')).click();
 }else{
  await p.locator('#sr-credential').fill('13600008000');await p.locator(act('sr-send-code')).click();await p.locator('#sr-code').fill('864209');await p.locator('#sr-consent').check();await p.locator('#sr-account-form button[type=submit]').click();
 }
 await p.waitForFunction(()=>s.page==='usage-choice');await invoke(p,'usage-choice:office');
 if(side==='mac'&&await p.locator('.sr-first-guide').count())await invoke(p,'sr-onboard-skip');
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const report={screenshots:[],pageErrors:[]};
 try{
  const p=await b.newPage({viewport:{width:1450,height:1250},deviceScaleFactor:1.5});p.on('pageerror',e=>report.pageErrors.push(e.message));
  await login(p,'mobile');
  async function snap(selector,name){await p.locator(selector).screenshot({path:path.join(assets,name+'.png'),animations:'disabled'});report.screenshots.push(name+'.png');}
  await invoke(p,'office-demo:all');await snap('.shell','standalone-mobile-office-sessions-v420');
  await invoke(p,'office-device:win');await snap('.shell','standalone-mobile-office-device-sessions-v420');
  report.fonts=await p.locator('.office-session-title').first().evaluate(el=>{const result=[];for(let n=el;n&&n!==document.body;n=n.parentElement)result.push({node:n.className,font:getComputedStyle(n).fontFamily});return result;});
  // 供六状态评审截图完整展示列表内容，仍为当前实际 DOM，不重画界面。
  await p.addStyleTag({content:'.office-ai-page,.office-sessions-page{max-height:none!important}'});
  const list=p.locator('.office-flat-list');if(await list.count())await list.screenshot({path:path.join(assets,'standalone-mobile-office-statuses-v420.png'),animations:'disabled'});
  await invoke(p,'office-thread:win:vscode:plan');await p.waitForFunction(()=>s.page==='session');
  await invoke(p,'office-capture-panel');await snap('.shell','standalone-mobile-window-picker-v420');
  await invoke(p,'mobile-tab:profile');await snap('.shell','notifications-mobile-profile-v420');
  await invoke(p,'mobile-tab:devices');await snap('.shell','notifications-mobile-devices-v420');
  await p.close();
  const m=await b.newPage({viewport:{width:1480,height:1150},deviceScaleFactor:1.25});m.on('pageerror',e=>report.pageErrors.push(e.message));
  await login(m,'mac');await invoke(m,'rom:demo:all');
  await m.locator('.sr-client').screenshot({path:path.join(assets,'standalone-mac-office-sessions-v420.png'),animations:'disabled'});report.screenshots.push('standalone-mac-office-sessions-v420.png');
  await invoke(m,'rom:filter:win');await m.locator('.sr-client').screenshot({path:path.join(assets,'standalone-mac-office-device-sessions-v420.png'),animations:'disabled'});report.screenshots.push('standalone-mac-office-device-sessions-v420.png');
  await invoke(m,'rom:preview:win-vscode');await m.locator('.sr-client').screenshot({path:path.join(assets,'standalone-mac-office-preview-v420.png'),animations:'disabled'});report.screenshots.push('standalone-mac-office-preview-v420.png');
  await m.close();
 }finally{await b.close();fs.writeFileSync(path.join(out,'screenshots.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report));if(report.pageErrors.length)process.exitCode=1;
})();
