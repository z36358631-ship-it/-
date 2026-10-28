const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.MEDIA_TEST_OUT||path.join(__dirname,'review/v414/media-local');fs.mkdirSync(out,{recursive:true});
const report={pass:false,checks:[],errors:[],screenshots:[]};
const click=(p,a)=>p.locator('[data-action="'+a+'"]').first().click();
async function pick(p,target){const [chooser]=await Promise.all([p.waitForEvent('filechooser'),click(p,'phone-media:pick:'+target)]);await chooser.setFiles(path.join(__dirname,'assets/ai-icons/vscode.png'));}
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const p=await b.newPage({viewport:{width:390,height:1050}});p.on('pageerror',e=>report.errors.push(e.message));
try{
 const base=process.env.REMOTE_BASE_URL||'file:///'+__dirname.replaceAll('\\','/');await p.goto(base+'/mobile.html?state=ai-sessions&lang=zh');
 await click(p,'office-demo:preview');await pick(p,'attachment');assert.equal(await p.locator('.phone-media-drafts img').count(),1);
 await p.locator('#office-native-input').fill('按图片修改界面');await click(p,'office-native-send');assert.equal(await p.locator('.phone-media-message img').count(),1);assert.equal(await p.locator('.phone-media-drafts img').count(),0);assert.match(await p.locator('.office-native-messages').innerText(),/按图片修改界面/);
 await pick(p,'attachment');await p.locator('[data-action^="phone-media:remove:"]').click();assert.equal(await p.locator('.phone-media-drafts img').count(),0);
 await pick(p,'attachment');await click(p,'office-native-send');assert.equal(await p.locator('.phone-media-message img').count(),2);
 report.checks.push('原生对话选图、缩略图、移除、图文一起发送、仅图片发送');
 await pick(p,'clipboard');assert.equal(await p.locator('.phone-media-clipboard img').count(),1);await click(p,'phone-media:paste');assert.equal(await p.locator('.phone-media-drafts img').count(),1);
 await p.locator('[data-action^="phone-media:remove:"]').click();await click(p,'phone-media:clipboard');
 await p.locator('.mobile-independent-shell').screenshot({path:path.join(out,'phone-media-combined.png')});report.screenshots.push('phone-media-combined.png');
 await click(p,'office-native-stream');await p.waitForFunction(()=>s.page==='session'&&!s.modal);await click(p,'phone-media:panel');await pick(p,'attachment');await p.locator('#phone-media-feedback').fill('手机直接提交图片修改意见');await click(p,'phone-media:send');assert.equal(await p.locator('.phone-media-message img').count(),3);await click(p,'phone-media:panel');
 await p.evaluate(()=>action('toggle-view'));assert(await p.locator('[data-action="phone-media:pick:attachment"]').isDisabled());await p.evaluate(()=>action('toggle-view'));
 await p.locator('.mobile-independent-shell').screenshot({path:path.join(out,'phone-media-remote.png')});report.screenshots.push('phone-media-remote.png');
 report.checks.push('传电脑剪贴板、粘贴为AI附件、远端AI发送、仅观看禁上传');
 await click(p,'office-back');await p.evaluate(()=>{devices.find(d=>d.id===s.device).online=false;render();});assert(await p.locator('[data-action="phone-media:pick:clipboard"]').isDisabled());assert(await p.locator('[data-action="office-native-send"]').isDisabled());
 await p.evaluate(()=>action('mobile-logout'));await click(p,'remote-logout:confirm');assert.deepEqual(await p.evaluate(()=>RemotePhoneMedia.snapshot().clipboard),[]);
 report.checks.push('离线禁发送，退出账号清除手机图片和远端剪贴板演示记录');
}catch(e){report.errors.push(e.stack);}finally{await b.close();report.pass=!report.errors.length;fs.writeFileSync(path.join(out,'phone-media-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;}})();
