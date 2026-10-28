import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const sections=[
 {id:'entry',name:'首次进入',title:'首次进入与旧版升级',intro:'从 Steam 入口进入新方案，先选择模式并勾选协议，再完成组件准备与登录。旧版已登录用户也必须首次确认。',steps:[
 ['01-library','进入 Steam','点击 Steam 卡片；PC 与导入游戏入口保留原游戏目标。'],
 ['02-mode','模式与协议','默认窗口，协议未勾选；可记住选择，勾选后继续。'],
 ['03-prepare','组件准备','展示下载进度，依次完成校验与准备；不支持暂停。'],
 ['09-login','登录 Steam','上方扫码、下方账号密码；有效登录态可跳过。'],
 ['31-landing-guide','进入原目标','普通进入游戏库；游戏入口继续原目标，等待实际启动结果。']
 ],note:'仅阅读声明或取消不等于同意。首次进入 Steam 游戏库可通过轻引导设置 App 启动页，处理后不重复。'},
 {id:'accounts',name:'账号管理与导入',title:'账号管理与导入账号',intro:'按接入 Demo 展示账号管理、扫码或密码登录、导入账号及已保存账号；账号和认证数据均为占位。',steps:[
 ['40-account-manager','打开账号管理','查看当前账号和已保存账号，选择扫码、密码登录或导入账号。'],
 ['41-account-import','填写导入信息','输入演示用户名与 Token；加入列表后清空 Token 输入。'],
 ['42-account-import-list','确认待导入列表','查看暂存的用户名列表；点击导入执行模拟结果。'],
 ['45-account-imported','返回账号管理','关闭导入框，已保存账号列表增加演示账号；可选择进入。'],
 ['28-library-account','回显 Steam 身份','认证成功后，入口卡片显示昵称头像；导入模拟账号使用占位身份。']
 ],note:'账号导入、保存、切换与退出均由接入能力承接；本稿不代表真实凭据处理、多账号同步和迁移已完成。'},
 {id:'controls',name:'悬浮球与界面',title:'悬浮球、模式切换与缩放',intro:'Steam 内使用盖世 Logo 悬浮球；无关闭和设置开关。菜单右上角“−”直接将悬浮球最小化。',steps:[
 ['04-steam','展开悬浮菜单','点击常规悬浮球，展开盖世快捷操作。'],
 ['05-bubble','切换当前模式','大屏／窗口即时切换，不覆盖下次启动偏好。'],
 ['37-bubble-scale150','调整缩放','支持100%—150%；仅缩放 Steam 内容，菜单和球不变。'],
 ['14-bubble-minimized','最小化悬浮球','点击右上角“−”缩成小图标；点小图标恢复并展开菜单。']
 ],note:'切换保留当前页面、输入与游戏目标；同会话保留缩放，新会话回100%。菜单底部不再重复放置最小化项。',wide:['36-bubble-landscape','横屏悬浮菜单','掌机横屏使用同样的模式、缩放与右上角最小化操作。']},
 {id:'settings',name:'启动后进入',title:'App 启动页设置',intro:'从首次 Steam 游戏库轻引导或盖世设置进入“启动后进入”，仅四个选项。盖世设置不再增加独立“Steam 设置”行。',steps:[
 ['31-landing-guide','查看轻引导','点击去设置，直达启动页选择；处理后不重复展示。'],
 ['06-settings','打开盖世设置','通用设置中选择“启动后进入”。'],
 ['29-landing-settings','保存启动页','主页、社区、游戏库、Steam；保存后下次冷启动生效。'],
 ['26-home-current','按默认规则落地','未设置或旧版缺字段：竖屏主页、横屏游戏库。']
 ],note:'显式设置优先；旋转屏幕不跳转当前页面。选择 Steam 仍需满足协议、组件和账号条件。'},
 {id:'background',name:'后台准备',title:'收起准备弹窗与再次进入',intro:'收起仅关闭准备弹窗，下载、校验与准备继续；完成后不抢占当前盖世页面。',steps:[
 ['03-prepare','组件下载中','显示当前进度，仅提供收起操作。'],
 ['38-background-download','收起后继续','留在盖世，后台继续当前任务。'],
 ['39-background-ready','后台准备完成','仍停留在当前页面，不自动打开 Steam 或启动游戏。'],
 ['04-steam','再次进入 Steam','复用任务与结果；未完成展示进度，失败展示原错误，就绪后继续。']
 ],note:'收起停止本次自动跳转及游戏自动启动意图；失败保留有效内容，重试恢复，不以计时结束冒充真实成功。'}
];
const summary=[
 ['Steam 接入入口','替换游戏库 Steam 入口后页面；启动落地、Steam 卡片、PC 及导入游戏启动共用接入门禁，保留原目标。'],
 ['首次模式与协议','默认窗口，支持记住选择；协议默认未勾选。新用户和旧版已登录用户首次进入均需主动确认。'],
 ['组件准备','展示下载进度与校验、准备状态；无暂停，收起继续任务，后台完成不抢跳；再次进入复用任务和有效内容。'],
 ['Steam 登录','扫码与账号密码两种方式；等待认证结果，失败保留输入。有效账号态可复用。'],
 ['账号管理与导入','展示当前账号、已保存账号及导入界面；信息为占位，账号处理与具体交互以 Steam Demo 接入为准。'],
 ['账号入口卡片','Steam 登录成功后回显昵称和头像；资料缺失使用默认显示，过期后回到未登录入口。'],
 ['悬浮球','盖世 Logo，常规及小图标两态，可拖动；无关闭及设置开关。菜单右上“−”直接最小化，底部不重复提供。'],
 ['模式与缩放','当前大屏／窗口即时切换；100%—150%缩放仅影响 Steam 内容，同会话保留，新会话默认100%。'],
 ['启动后进入','主页、社区、游戏库、Steam四项。未设置或旧版缺字段：竖屏主页、横屏游戏库；显式设置在下次冷启动生效。'],
 ['游戏与原生能力承接','保留游戏目标与启动参数，实际回执才算启动成功；好友、工坊及开发者选项按接入能力承接，不用截图宣称已接通。'],
 ['演示方式','当前浏览器每次刷新重置首次体验；“模拟重新打开 App”用于验证设置记忆。演示面板可切换缺省与异常状态。']
];
const files=new Set(sections.flatMap(s=>[...s.steps,...(s.wide?[s.wide]:[])].map(x=>x[0])));
const media=Object.fromEntries([...files].map(x=>[x,'data:image/png;base64,'+fs.readFileSync(path.join(root,'prd-assets',x+'.png')).toString('base64')]));
const image=(file,title)=>`<button class="shot" data-title="${title}" aria-label="放大：${title}"><img src="${media[file]}" alt="${title}实际Demo页面"></button>`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>盖世 Steam 接入方案评审稿｜功能点与界面流程</title><style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#edf2f8;color:#223b59;font:15px/1.75 'Microsoft YaHei',system-ui,sans-serif}main{max-width:1560px;margin:24px auto;background:#fff;padding:38px;border-radius:16px}h1{font-size:29px;margin:4px 0 16px;line-height:1.45}h2{font-size:24px;margin:0 0 12px}h3{font-size:19px}.tag{font-size:13px;color:#71869f}a{color:#286bb6}.intro{max-width:1100px}.decisions{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:24px 0}.decisions>div{padding:19px 22px;border:1px solid #cddff3;background:#f1f7ff;border-radius:12px}.decisions>div:last-child{background:#fffaf0;border-color:#e9dcb9}.decisions strong{font-size:18px}.decisions p{margin:8px 0 0}nav{display:flex;flex-wrap:wrap;gap:12px;margin:25px 0}nav a{padding:8px 15px;background:#edf4fc;border-radius:8px;text-decoration:none}.flow-board{padding:30px 24px;margin-top:26px;border:1px solid #dbe5f1;border-radius:14px;background:#fff;scroll-margin:16px}.flow-note{margin:0 0 25px;padding:12px 16px;background:#f2f6fc;color:#526b88;border-radius:8px}#accounts .flow-note{background:#fff7e5;color:#8b6d2e}.steps{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:34px;align-items:start}.step{position:relative;min-width:0;margin:0}.step:not(:last-child)::after{content:'→';position:absolute;right:-29px;top:50%;font-size:29px;color:#7795ba}.step figcaption{min-height:112px}.step strong{font-size:17px;display:block}.step p{font-size:13px;color:#6a7e97;margin:7px 0 16px;line-height:1.65}.shot{display:block;padding:0;border:0;background:none;width:100%;cursor:zoom-in}.shot img{display:block;width:100%;height:auto;border:1px solid #d9e3ef;border-radius:15px;background:#f5f8fc}.wide-shot{display:grid;grid-template-columns:260px 1fr;gap:28px;margin-top:30px;padding-top:24px;border-top:1px solid #e2e9f2;align-items:center}.wide-shot p{color:#6a7e97;font-size:14px}.rule-note{font-size:13px;color:#6a7e97;margin:22px 0 0}.summary{margin:35px 0 0;scroll-margin:16px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #dfe7f0;text-align:left;padding:12px 16px}th{background:#f3f7fc}td:first-child{width:220px;font-weight:600}.footer{padding:18px 22px;background:#f6f8fc;border-radius:10px;color:#687c94;margin-top:28px}dialog{border:0;border-radius:12px;padding:16px;max-width:94vw;max-height:94vh}dialog::backdrop{background:#16314bd9}dialog img{display:block;max-width:90vw;max-height:81vh;object-fit:contain}.dialog-head{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:12px}.dialog-head button{padding:7px 18px;border:0;background:#edf3fa;border-radius:6px;cursor:pointer}dialog strong{font-size:14px}@media(max-width:800px){main{padding:18px;margin:0;border-radius:0}.decisions{grid-template-columns:1fr}.flow-board{overflow:auto;padding:20px 16px}.steps{min-width:1080px}.wide-shot{min-width:1080px}h1{font-size:24px}h2{font-size:21px}td:first-child{width:110px}.flow-note,.rule-note{min-width:280px}}@media print{body{background:white}main{margin:0;padding:15px}nav,.demo-link{display:none}.flow-board{break-inside:avoid}.shot img{border-radius:6px}.wide-shot{display:none}dialog{display:none}}
</style></head><body><main><div class="tag">Steam 新接入 · 界面流程评审 · 2026.10.28</div><h1>盖世 Steam 接入方案评审稿｜功能点与界面流程</h1><p class="intro">替换游戏库 Steam 入口后的页面，补齐模式选择、协议确认、组件准备及盖世侧承接。下方用当前可操作 Demo 的实际页面串起流程，截图可点击放大；账号、下载与启动结果为演示数据。</p><p class="demo-link"><a href="Steam接入Demo.html">打开 Steam 接入 Demo ↗</a></p><div class="decisions"><div><strong>默认方案：窗口模式 · 首次主动确认</strong><p>首次选择模式并勾选协议，旧版已登录也需确认。支持记住选择，后续按保存偏好进入。</p></div><div><strong>接入边界：账号与原生功能以 Demo 为准</strong><p>账号管理、导入账号及开发者选项按接入界面展示；当前为占位交互，真实认证、迁移与运行仍需联调。</p></div></div><nav aria-label="流程导航">${sections.map(s=>`<a href="#${s.id}">${s.name}</a>`).join('')}<a href="#summary">功能点总结</a></nav>${sections.map(s=>`<section class="flow-board" id="${s.id}" data-export="${s.title}"><h2>${s.title}</h2><p class="flow-note">${s.intro}</p><div class="steps" style="--columns:${s.steps.length}">${s.steps.map(([file,title,desc],i)=>`<figure class="step"><figcaption><strong>${String(i+1).padStart(2,'0')} ${title}</strong><p>${desc}</p></figcaption>${image(file,title)}</figure>`).join('')}</div><p class="rule-note">${s.note}</p>${s.wide?`<div class="wide-shot"><div><h3>${s.wide[1]}</h3><p>${s.wide[2]}</p></div>${image(s.wide[0],s.wide[1])}</div>`:''}</section>`).join('')}<section class="summary" id="summary"><h2>功能点总结</h2><div class="table-wrap"><table><thead><tr><th>功能</th><th>方案说明</th></tr></thead><tbody>${summary.map(([name,desc])=>`<tr><td>${name}</td><td>${desc}</td></tr>`).join('')}</tbody></table></div></section><div class="footer">真实 Steam SDK、账号与数据迁移、组件分发、游戏启动回执、即时模式切换及缩放仍需接入联调；本 Demo 不代表真实服务已接通。用户提供的免责声明正文保持原文。</div></main><dialog aria-label="页面大图"><div class="dialog-head"><strong></strong><button aria-label="关闭大图">关闭</button></div><img alt=""></dialog><script>
const dialog=document.querySelector('dialog');document.querySelectorAll('.shot').forEach(button=>button.onclick=()=>{dialog.querySelector('img').src=button.querySelector('img').src;dialog.querySelector('img').alt=button.dataset.title;dialog.querySelector('strong').textContent=button.dataset.title;dialog.showModal()});dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
</script></body></html>`;
fs.writeFileSync(path.join(root,'用户流程图.html'),html);
console.log('Built long-page review: '+sections.length+' flows, '+files.size+' actual Demo screenshots');
