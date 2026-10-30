const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname,out=path.join(root,'review/prd-v422'),assets=path.join(root,'assets');
const report={pass:false,images:[],errors:[]};
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
for(const side of ['mobile','mac']){
 const p=await b.newPage({viewport:{width:1500,height:1250},deviceScaleFactor:1.25});p.on('pageerror',e=>report.errors.push(e.message));
 const invoke=a=>p.evaluate(a=>action(a),a),shell=side==='mobile'?'.mobile-independent-shell':'.sr-client';
 const snap=async name=>{const file=name+'-v422.png';await p.locator(shell).screenshot({path:path.join(assets,file),animations:'disabled'});report.images.push(file);};
 await p.goto(pathToFileURL(path.join(root,side+'.html')).href+'?state='+ (side==='mobile'?'profile':'remote-settings'));
 if(side==='mobile'){
  await invoke('mobile-tab:ai');await invoke('office-demo:all');await snap('standalone-mobile-office-sessions');
  await invoke('office-device:win');await snap('standalone-mobile-office-device-sessions');
  await p.locator('.office-flat-list').screenshot({path:path.join(assets,'standalone-mobile-office-statuses-v422.png'),animations:'disabled'});report.images.push('standalone-mobile-office-statuses-v422.png');
  await invoke('mobile-tab:devices');await snap('notifications-mobile-devices');
  await invoke('mobile-tab:profile');await snap('standalone-mobile-profile');
 }else{
  await snap('standalone-desktop-settings');await invoke('rom:sessions');await invoke('rom:demo:all');await snap('standalone-mac-office-sessions');
  await invoke('rom:filter:win');await snap('standalone-mac-office-device-sessions');
  await invoke('rom:preview:win-vscode');await snap('standalone-mac-office-preview');
  await invoke('remote-settings');await invoke('mac-account');await snap('standalone-desktop-account');
 }
 await invoke(side+'-account:delete');assert.equal(await p.locator('.remote-delete-dialog').count(),1);await snap('standalone-'+side+'-account-deletion');await invoke('remote-delete:cancel');
 await invoke(side==='mobile'?'mobile-logout':'sr-logout');assert.equal(await p.locator('.remote-logout-dialog').count(),1);await snap('standalone-'+side+'-logout');await invoke('remote-logout:cancel');
 await invoke(side+'-support:about');assert.equal(await p.locator('[data-action="'+side+'-support:cancel-account"]').count(),0);await snap('standalone-'+(side==='mac'?'desktop':side)+'-about');
 if(side==='mobile')await invoke('mobile-tab:profile');else {await invoke('remote-settings');await invoke('mac-more-toggle');}
 await invoke('remote-update:scenario-available');await invoke(side+'-support:update');await p.locator('.remote-update-dialog').waitFor();await snap('standalone-'+side+'-update');await invoke('remote-update:later');
 await invoke(side==='mobile'?'mobile-tab:profile':'remote-settings');
 await invoke('rn:toggle');await p.locator('.rn-permission-dialog').waitFor();await snap('notifications-'+side+'-permission');await invoke('rn:permission:granted');
 await snap('notifications-'+side+'-settings-on');
 const target=await p.evaluate(()=>RemoteNotificationAdapter.targets().find(t=>t.device==='win'));
 await invoke('rn:background');await p.evaluate(target=>RemoteNotifications.emit({id:'review-push',type:'needs-approval',target}),target);await snap('notifications-'+side+'-push');
 await invoke('rn:push-open');await p.waitForFunction(()=>s.page==='session'&&!s.modal);await snap('notifications-'+side+'-client');
 assert.equal(await p.locator('.rn-entry,.rn-center,.rn-message,.rn-badge').count(),0);
 await p.close();
}
assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.errors.push(e.stack);process.exitCode=1;}finally{await b.close();fs.writeFileSync(path.join(out,'screenshots.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
