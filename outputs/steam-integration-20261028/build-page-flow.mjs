import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const sections=[
 {id:'entry',name:'首次进入',title:'首次进入',intro:'',steps:[
 ['01-library','进入 Steam','点击游戏库中的 Steam。'],
 ['02-mode','模式与协议','默认窗口；勾选协议后继续，可记住模式。'],
 ['03-prepare','组件准备','显示下载进度，失败可重试。'],
 ['09-login','登录 Steam','扫码或账号密码登录，已登录可跳过。'],
 ['31-landing-guide','打开游戏库','从游戏卡进入时，继续启动该游戏。']
 ],note:'旧版已登录用户首次进入，也需选择模式并勾选协议。'},
 {id:'accounts',name:'账号管理',title:'账号管理',intro:'',steps:[
 ['40-account-manager','管理账号','查看、切换或退出账号，也可登录新账号。'],
 ['41-account-import','填写账号','输入用户名和 Refresh token。'],
 ['42-account-import-list','加入列表','确认待导入账号。'],
 ['45-account-imported','导入账号','导入后可在已保存账号中选择。'],
 ['28-library-account','昵称与头像','登录后，Steam 入口显示账号信息。']
 ],note:''},
 {id:'controls',name:'悬浮球',title:'悬浮球',intro:'',steps:[
 ['04-steam','展开菜单','点击盖世 Logo 悬浮球。'],
 ['05-bubble','切换模式','即时切换大屏或窗口。'],
 ['37-bubble-scale150','调整缩放','100%–150%，只缩放 Steam 页面。'],
 ['14-bubble-minimized','最小化','右上角“−”缩成小图标，点击小图标展开。']
 ],note:'悬浮球可拖动，不支持关闭，无设置开关。',wide:['36-bubble-landscape','横屏效果','']},
 {id:'settings',name:'启动页设置',title:'启动页设置',intro:'',steps:[
 ['31-landing-guide','首次引导','点击“去设置”，选择 App 启动页。'],
 ['06-settings','设置入口','盖世设置 → 启动后进入。'],
 ['29-landing-settings','选择启动页','主页、社区、游戏库、Steam，下次启动生效。'],
 ['26-home-current','默认启动页','未设置时：竖屏主页，横屏游戏库。']
 ],note:'旧版升级沿用横竖屏默认规则；已设置的优先。旋转屏幕不跳页。'}
];
const summary=[
 ['组件准备','不支持暂停、收起或关闭；失败仅可重试。'],
 ['模式与缩放','菜单切换不改变启动偏好，保留当前页面、输入和待启动游戏。缩放在本次会话内保留，下次进入恢复100%。'],
 ['启动条件','设为启动进入 Steam，也需完成协议确认、组件准备和登录。'],
 ['首次引导','只展示一次；之后可从盖世设置修改启动页。'],
 ['演示操作','浏览器刷新回到游戏库，点击 Steam 开始首次流程。“模拟重新打开 App”可验证已保存的启动页；演示面板可切换缺省和异常状态。']
];
const files=new Set(sections.flatMap(s=>[...s.steps,...(s.wide?[s.wide]:[])].map(x=>x[0])));
const media=Object.fromEntries([...files].map(x=>[x,'data:image/png;base64,'+fs.readFileSync(path.join(root,'prd-assets',x+'.png')).toString('base64')]));
const image=(file,title)=>`<button class="shot" data-title="${title}" aria-label="放大：${title}"><img src="${media[file]}" alt="${title}实际Demo页面"></button>`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steam 接入方案</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#edf2f8;color:#223b59;font:15px/1.75 'Microsoft YaHei',system-ui,sans-serif}main{max-width:1560px;margin:24px auto;background:#fff;padding:38px;border-radius:16px}h1{font-size:29px;margin:4px 0 16px;line-height:1.45}h2{font-size:24px;margin:0 0 12px}h3{font-size:19px}.tag{font-size:13px;color:#71869f}a{color:#286bb6}.intro{max-width:1100px}nav{display:flex;flex-wrap:wrap;gap:12px;margin:25px 0}nav a{padding:8px 15px;background:#edf4fc;border-radius:8px;text-decoration:none}.flow-board{padding:30px 24px;margin-top:26px;border:1px solid #dbe5f1;border-radius:14px;background:#fff;scroll-margin:16px}.flow-note{margin:0 0 25px;padding:12px 16px;background:#f2f6fc;color:#526b88;border-radius:8px}#accounts .flow-note{background:#fff7e5;color:#8b6d2e}.steps{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:34px;align-items:start}.step{position:relative;min-width:0;margin:0}.step:not(:last-child)::after{content:'→';position:absolute;right:-29px;top:50%;font-size:29px;color:#7795ba}.step figcaption{min-height:100px}.step strong{font-size:17px;display:block}.step p{font-size:13px;color:#6a7e97;margin:7px 0 16px;line-height:1.65}.shot{display:block;padding:0;border:0;background:none;width:100%;cursor:zoom-in}.shot img{display:block;width:100%;height:auto;border:1px solid #d9e3ef;border-radius:15px;background:#f5f8fc}.wide-shot{display:grid;grid-template-columns:260px 1fr;gap:28px;margin-top:30px;padding-top:24px;border-top:1px solid #e2e9f2;align-items:center}.wide-shot p{color:#6a7e97;font-size:14px}.rule-note{font-size:13px;color:#6a7e97;margin:22px 0 0}.summary{margin:35px 0 0;scroll-margin:16px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #dfe7f0;text-align:left;padding:12px 16px}th{background:#f3f7fc}td:first-child{width:220px;font-weight:600}.footer{padding:18px 22px;background:#f6f8fc;border-radius:10px;color:#687c94;margin-top:28px}dialog{border:0;border-radius:12px;padding:16px;max-width:94vw;max-height:94vh}dialog::backdrop{background:#16314bd9}dialog img{display:block;max-width:90vw;max-height:81vh;object-fit:contain}.dialog-head{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:12px}.dialog-head button{padding:7px 18px;border:0;background:#edf3fa;border-radius:6px;cursor:pointer}dialog strong{font-size:14px}@media(max-width:800px){main{padding:18px;margin:0;border-radius:0}.flow-board{overflow:auto;padding:20px 16px}.steps{min-width:1080px}.wide-shot{min-width:1080px}h1{font-size:24px}h2{font-size:21px}td:first-child{width:110px}.flow-note,.rule-note{min-width:280px}}@media print{body{background:white}main{margin:0;padding:15px}nav,.demo-link{display:none}.flow-board{break-inside:avoid}.shot img{border-radius:6px}.wide-shot{display:none}dialog{display:none}}
</style></head><body><main><div class="tag">盖世游戏 · 2026.10.29</div><h1>Steam 接入方案</h1><p class="intro">游戏库 Steam 入口接入新版界面。点击截图可放大。</p><p class="demo-link"><a href="Steam接入Demo.html">打开 Steam 接入 Demo ↗</a></p><nav aria-label="流程导航">${sections.map(s=>`<a href="#${s.id}">${s.name}</a>`).join('')}<a href="#summary">补充规则</a></nav>${sections.map(s=>`<section class="flow-board" id="${s.id}" data-export="${s.title}"><h2>${s.title}</h2>${s.intro?`<p class="flow-note">${s.intro}</p>`:''}<div class="steps" style="--columns:${s.steps.length}">${s.steps.map(([file,title,desc],i)=>`<figure class="step"><figcaption><strong>${String(i+1).padStart(2,'0')} ${title}</strong><p>${desc}</p></figcaption>${image(file,title)}</figure>`).join('')}</div>${s.note?`<p class="rule-note">${s.note}</p>`:''}${s.wide?`<div class="wide-shot"><div><h3>${s.wide[1]}</h3>${s.wide[2]?`<p>${s.wide[2]}</p>`:''}</div>${image(s.wide[0],s.wide[1])}</div>`:''}</section>`).join('')}<section class="summary" id="summary"><h2>补充规则</h2><div class="table-wrap"><table><thead><tr><th>项目</th><th>规则</th></tr></thead><tbody>${summary.map(([name,desc])=>`<tr><td>${name}</td><td>${desc}</td></tr>`).join('')}</tbody></table></div></section><div class="footer">页面为交互演示，账号、下载与启动均为模拟；具体以 Steam 接入为准。</div></main><dialog aria-label="页面大图"><div class="dialog-head"><strong></strong><button aria-label="关闭大图">关闭</button></div><img alt=""></dialog><script>
const dialog=document.querySelector('dialog');document.querySelectorAll('.shot').forEach(button=>button.onclick=()=>{dialog.querySelector('img').src=button.querySelector('img').src;dialog.querySelector('img').alt=button.dataset.title;dialog.querySelector('strong').textContent=button.dataset.title;dialog.showModal()});dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
</script></body></html>`;
fs.writeFileSync(path.join(root,'用户流程图.html'),html);
console.log('Built long-page review: '+sections.length+' flows, '+files.size+' actual Demo screenshots');
