import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const sections=[
 {id:'baseline',title:'重构页面还原',note:'以 Mac 1.0.0 实机为基准。以下为重建后的可操作页面，账号和内容为演示数据。',steps:[
  ['baseline-discovery','发现','保留首页精选结构，作为 Mac 默认启动落地。','?baseline=1&page=discovery'],
  ['baseline-library','游戏库','保留平台标签、搜索筛选、管理平台和导入游戏。','?baseline=1&page=library'],
  ['baseline-detail','游戏详情','保留大封面及启动区，新方案从这里承接游戏目标。','?baseline=1&page=detail'],
  ['baseline-settings','常规设置','沿用现有设置结构和“进入主屏时”位置。','?baseline=1&page=settings'],
  ['baseline-steam-settings','Steam 设置','保留独立分类、账号卡、游戏偏好与维护分组。','?baseline=1&page=steam-settings'],
  ['baseline-steam','原 Steam 页面','原自建统计页作为对照；新方案保留盖世 UI，原生功能按需承接。','?baseline=1&page=legacy-steam']
 ]},
 {id:'entry',title:'首次进入',note:'2026.11.6修改：需要 Steam 能力的入口统一确认协议与组件；只浏览详情、云玩和非 Steam 本地导入不拦截。',flow:true,steps:[
 ['new-library','游戏库入口','点击 Steam；首次确认协议，登录后入口回显账号。','?page=library'],
 ['consent','协议确认','首次和旧登录首次需主动勾选；不再选择启动模式。','?scene=first'],
 ['prepare','准备原生组件','2026.11.6修改：组件未就绪时准备；可关闭取消，回到原入口。','?scene=prepare'],
 ['metered','计费网络提醒','2026.11.6修改：计费网络先确认；普通 Wi-Fi／有线不提示。','?scene=metered'],
 ['login','登录 Steam','扫码或密码登录。有效登录态可复用。','?scene=login'],
 ['big','大屏模式','完成前置步骤后默认进入 Steam 大屏模式。','?scene=big']
 ]},
 {id:'native',title:'模式与准备',note:'新启动固定大屏；需窗口时从悬浮球右上设置切换。组件准备按需执行。',flow:true,steps:[
 ['prepare','准备原生组件','2026.11.6修改：右上×取消准备，不在后台继续；失败可重试或取消。','?scene=prepare'],
 ['big','默认大屏','进入 Steam 大屏界面，适合手柄操作。','?scene=big'],
 ['panel-settings','悬浮球设置','点悬浮面板右上设置，手动切换窗口／大屏，仅影响本次会话。','?scene=panel-settings'],
 ['window','窗口模式','切换后在窗口内使用 Steam，保留盖世背景。','?scene=window']
 ]}, {id:'details',title:'详情功能分工',note:'2026.11.6修改：缺组件时显示下载／更新组件，准备后校验安装状态。SDK 页面与深链为占位，不新增 SDK 内导入或盖世来源分类。',steps:[
 ['component-required','缺少组件','下载组件 → 协议 → 按需下载；取消留在当前详情。','?page=detail'],
 ['component-update','旧组件待更新','更新后核对原游戏文件，不重复下载已安装游戏。','?scene=component-update'],
 ['detail-achievements','成就','盖世保留摘要，完整列表进入对应游戏的 Steam 成就页。','?tab=achievements'],
 ['detail-reviews','评价','盖世评价与 Steam 评测分区展示，来源不混用。','?tab=reviews'],
 ['detail-dlc','DLC','盖世展示信息占位；具体内容与后续操作由 Steam 承接。','?tab=dlc'],
 ['detail-mods','MOD / 创意工坊','本地 MOD 管理保留盖世入口，工坊浏览订阅进入 Steam。订阅不等于安装生效。','?tab=mods'],
 ['native-feature','原生功能定位','携带游戏目标打开原生功能，返回恢复盖世原详情标签。此处演示成就页。','?native=achievements']
 ]}, {id:'session',title:'会话与设置',note:'返回盖世后重入恢复当前模式与页面；新启动仍为大屏。',steps:[
  ['panel','悬浮球面板','2026.11.6修改：此处为 SDK 功能占位，以实际接入为准；本期不另扩展悬浮能力。','?scene=panel'],
  ['account','账号管理','2026.11.6修改：账号页按 SDK 实际能力；入口仍检查协议和组件，身份变化更新盖世卡片。','?scene=accounts'],
  ['new-settings','启动落地页','在原四项中新增 Steam。Mac 默认发现，Demo 初始展示游戏库。','?page=settings'],
  ['new-steam-settings','Steam 设置','保留账号与原有设置；移除启动模式和记忆开关。','?page=steam-settings']
 ]},
 {id:'states',title:'异常与缺省状态',note:'左侧功能栏可切换页面、详情功能和异常场景；浏览器刷新重置。',steps:[
  ['download-error','组件下载失败','2026.11.6修改：可重试或关闭取消；取消后不再自动进入。','?scene=download-error'],
  ['network-error','网络连接失败','给出重试入口，恢复后回到原目标。','?scene=network-error'],
  ['sync-error','列表加载失败','保留已有记录；重试后更新当前账号列表。','?scene=sync-error'],
  ['empty','空游戏库','2026.11.6修改：区分加载失败与空库，不新增盖世来源分类。','?scene=empty']
 ]}
];
const picture=id=>{const paths=['evidence-review-20261106','evidence-meeting-20261105','evidence-v4'].map(folder=>path.join(dir,folder,id+'.jpg'));const p=paths.find(p=>fs.existsSync(p));if(!p)throw Error('Missing capture '+id);return 'data:image/jpeg;base64,'+fs.readFileSync(p).toString('base64')};
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mac Steam 接入 · 页面与流程</title><style>body{margin:0;background:#edf2f8;color:#223b59;font:15px/1.75 'Microsoft YaHei',sans-serif}main{max-width:1560px;margin:24px auto;background:#fff;padding:38px;border-radius:16px}h1{font-size:29px;margin:4px 0 14px}h2{font-size:24px;margin:0 0 12px}.tag{font-size:13px;color:#71869f}a{color:#286bb6}nav{display:flex;gap:12px;margin:25px 0;flex-wrap:wrap}nav a,.open{padding:8px 15px;background:#edf4fc;border-radius:8px;text-decoration:none}.open{display:inline-block;background:#223b59;color:white}.board{padding:25px;margin-top:26px;border:1px solid #dbe5f1;border-radius:14px;scroll-margin:16px}.note{padding:12px 16px;background:#f2f6fc;color:#526b88;border-radius:8px;margin:0 0 25px}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}.cards.flow{display:flex;overflow-x:auto;padding-bottom:15px}.flow figure{min-width:420px;max-width:420px}.flow figure:not(:last-child)::after{content:'→';position:absolute;right:-24px;top:48%;color:#7795ba;font-size:22px}figure{margin:0;position:relative}figure strong{font-size:17px;display:block}figure p{font-size:13px;color:#6a7e97;margin:5px 0 10px;min-height:42px}figure img{width:100%;display:block;border:1px solid #d9e3ef;border-radius:10px;cursor:zoom-in}figure a{font-size:13px}.footer{padding:18px 22px;background:#f6f8fc;border-radius:10px;color:#687c94;margin-top:28px}dialog{border:0;border-radius:12px;padding:16px;max-width:95vw;max-height:94vh}dialog::backdrop{background:#16314bd9}dialog img{max-width:90vw;max-height:82vh;display:block}dialog button{display:block;margin:0 0 12px auto;padding:7px 18px;border:0;background:#edf3fa;border-radius:6px;cursor:pointer}@media(max-width:800px){main{padding:18px;margin:0}.cards{grid-template-columns:1fr}.board{padding:16px}h1{font-size:24px}}</style></head><body><main><div class="tag">Mac · GameHub 1.0.0 重构基线 · 2026.11.06</div><h1>Steam 接入 · 页面与流程</h1><p>先还原当前 Mac 页面，再接入 Steam 新方案。保留现有导航、平台标签与设置结构。</p><a class="open" href="demo.html">打开可操作 Demo</a><nav>${sections.map(s=>`<a href="#${s.id}">${s.title}</a>`).join('')}</nav>${sections.map(s=>`<section class="board" id="${s.id}"><h2>${s.title}</h2><p class="note">${s.note}</p><div class="cards ${s.flow?'flow':''}">${s.steps.map(([id,title,note,query])=>`<figure><strong>${title}</strong><p>${note}</p><img src="${picture(id)}" alt="${title}" onclick="zoom(this)"><a href="demo.html${query}">体验此页 →</a></figure>`).join('')}</div></section>`).join('')}<div class="footer">登录、二维码、组件下载、账号导入、同步及游戏启动均为模拟。2026.11.6修改：公开详情／商店浏览不加盖世登录门槛；SDK 游客浏览能力待验，获取游戏按 SDK 登录。真实 Steam 服务、Mac 容器和 SDK 仍需联调。游戏资料仅作占位，资源位另行设计。</div></main><dialog id="zoom"><button onclick="this.parentElement.close()">关闭</button><img alt="放大页面"></dialog><script>function zoom(img){let d=document.getElementById('zoom');d.querySelector('img').src=img.src;d.querySelector('img').alt=img.alt;d.showModal()}</script></body></html>`;
fs.writeFileSync(path.join(dir,'review.html'),html.replaceAll('href="demo.html','href="MacSteam接入Demo.html'));fs.writeFileSync(path.resolve(dir,'../../public/steam-mac-integration/review.html'),html);console.log('Built Mac review');
