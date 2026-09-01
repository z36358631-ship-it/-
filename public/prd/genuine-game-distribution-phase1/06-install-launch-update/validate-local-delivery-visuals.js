const fs=require('fs');
const path=require('path');
const {chromium}=require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname;
const jobs=[
  ['install-path','06-install-path.png'],['download-task','06-download-task.png'],['download-manager','06-download-manager.png'],
  ['install-result','06-install-result.png'],['library-launch-state','06-library-launch-state.png'],['required-update','06-required-update.png'],
  ['update-task','06-update-task.png'],['launch-recovery','06-launch-recovery.png'],['game-management','06-game-management.png'],
  ['repair','06-repair.png'],['uninstall','06-uninstall.png']
];
const pngs=['06-local-delivery-flow.png',...jobs.map(([,png])=>png)];
const sources=['06-local-delivery-flow.mmd','06-local-delivery-flow.html','local-delivery-screens.html','local-delivery-screens.css','render-local-delivery-flow.js','render-local-delivery-visuals.js'];
function assert(ok,msg){if(!ok)throw new Error(msg)}
(async()=>{
  assert(pngs.length===12,'PNG count must be 12');
  for(const file of [...pngs,...sources]){const p=path.join(root,file);assert(fs.existsSync(p),`missing ${file}`);assert(fs.statSync(p).size>0,`empty ${file}`)}
  const browser=await chromium.launch({headless:true});
  try{
    const html=path.resolve(root,'local-delivery-screens.html').replaceAll('\\','/');
    for(const [name] of jobs){
      const page=await browser.newPage({viewport:{width:1080,height:2400},deviceScaleFactor:1});
      await page.goto(`file:///${html}?page=${name}`,{waitUntil:'load'});
      const result=await page.evaluate(()=>{
        const text=document.body.innerText;
        const clipped=[...document.querySelectorAll('.evidence,.title,.tag,.btn,.info,.line,.notice,.task-card,.stage,.menu,.dialog,.sheet,.input,.check,.timeitem,.state-card,.inline-actions,.scope-item,.persist,.lock-banner')].filter(el=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1).map(el=>`${el.tagName}.${el.className}:${el.textContent.trim().slice(0,48)}`);
        const disabledButtons=[...document.querySelectorAll('button:disabled')].map(el=>el.textContent.trim());
        return {w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,text,clipped,disabledButtons};
      });
      assert(result.w===1080&&result.h===2400,`${name} viewport overflow ${result.w}x${result.h}`);
      assert(result.clipped.length===0,`${name} clipped ${result.clipped.join(' | ')}`);
      assert(result.text.includes('证据边界'),`${name} missing evidence boundary`);
      assert(result.text.includes('盖世直接下载')||name==='download-manager'||name==='install-result',`${name} missing direct delivery context`);
      assert(!/CDKEY.*下载|第三方平台激活.*下载/.test(result.text),`${name} mixes CDKEY into direct delivery`);
      assert(!/预载|P2P|多正式分支|自助回滚|云存档/.test(result.text)||name==='game-management',`${name} contains excluded capability as a feature`);
      if(name==='download-manager'){
        for(const required of ['重试','取消任务','已替代','superseded','不再阻塞','查看新任务'])assert(result.text.includes(required),`download-manager missing ${required}`);
      }
      if(name==='install-result'){
        for(const required of ['校验失败','安装失败','重试','取消任务','当前 task_id','暂存文件'])assert(result.text.includes(required),`install-result missing ${required}`);
      }
      if(name==='required-update'){
        assert(result.text.includes('开始更新')&&result.text.includes('返回游戏库'),'required-update missing corrected actions');
        assert(!/更新并启动|稍后处理/.test(result.text),'required-update contains rejected actions');
      }
      if(name==='update-task'){
        for(const required of ['更新任务','正在下载更新','暂停更新','继续更新','校验中／安装中','不可暂停或取消','重试更新','取消任务','旧版本保护','v1.0.0','先创建新 task_id','原子提交后旧任务才进入已替代'])assert(result.text.includes(required),`update-task missing ${required}`);
        assert(!result.text.includes('旧任务进入已替代，再创建新 task_id'),'update-task reverses atomic replacement order');
        assert(!result.text.includes('更新前校验')&&!result.text.includes('未创建更新任务'),'update-task still shows blocked precheck state');
      }
      if(name==='launch-recovery'){
        assert(result.text.includes('修复游戏文件')&&result.text.includes('返回游戏库'),'launch-recovery missing corrected actions');
        assert(!result.text.includes('再次启动'),'launch-recovery contains rejected retry action');
      }
      if(name==='repair'){
        for(const required of ['版本清单内托管文件','暂停','继续','取消任务','重试','校验／安装中','不可暂停或取消','未托管文件'])assert(result.text.includes(required),`repair missing ${required}`);
      }
      if(name==='uninstall'){
        for(const required of ['卸载中','action_id','实际安装版本清单','完整性异常','禁止启动','重试卸载','权益有效时可','成功后才移除'])assert(result.text.includes(required),`uninstall missing ${required}`);
      }
      await page.close();console.log(`${name}: boundary, scope, text and overflow PASS`);
    }
    const flow=await browser.newPage({viewport:{width:3200,height:1000},deviceScaleFactor:1});
    const flowHtml=path.resolve(root,'06-local-delivery-flow.html').replaceAll('\\','/');
    await flow.goto(`file:///${flowHtml}`,{waitUntil:'load'});
    const fr=await flow.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,text:document.body.innerText,clipped:[...document.querySelectorAll('.node > b,.node > span,.rec,.guard span')].filter(el=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1).length}));
    assert(fr.w===3200&&fr.h===1000,'flow viewport overflow');assert(fr.clipped===0,'flow clipped content');
    for(const required of ['游戏库下载','安装位置','下载任务','完整性校验','安装','启动前校验','启动游戏','必须更新','更新后启动','修复','卸载'])assert(fr.text.includes(required),`flow missing ${required}`);
    await flow.close();
  }finally{await browser.close()}
  console.log('12 PNG files and editable sources PASS');
})();
