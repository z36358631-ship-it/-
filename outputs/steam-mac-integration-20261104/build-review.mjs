import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const sections=[
 {id:'baseline',title:'重构页面还原',note:'以 Mac 1.0.0 实机为基准。以下为重建后的可操作页面，账号和内容为演示数据。',steps:[
  ['baseline-discovery','发现','保留首页精选结构，作为 Mac 默认启动落地。','?baseline=1&page=discovery'],
  ['baseline-library','游戏库','保留平台标签、搜索筛选、管理平台和导入游戏。','?baseline=1&page=library'],
  ['baseline-detail','游戏详情','保留大封面及启动区，新方案从这里承接游戏目标。','?baseline=1&page=detail'],
  ['baseline-settings','常规设置','沿用现有设置结构和“进入主屏时”位置。','?baseline=1&page=settings'],
  ['baseline-steam-settings','Steam 设置','保留独立分类、账号卡、游戏偏好与维护分组。','?baseline=1&page=steam-settings'],
  ['baseline-steam','原 Steam 页面','当前自建统计页由 Steam 新方案替换，入口位置保留。','?baseline=1&page=legacy-steam']
 ]},
 {id:'entry',title:'进入 Steam',note:'游戏库 Steam 入口 → 模式与协议 → 准备组件 → 登录 → Steam。旧版已登录用户首次同样需要确认。',flow:true,steps:[
  ['new-library','Steam 入口','沿用平台标签；登录后回显当前账号。','?page=library'],
  ['mode','模式与协议','默认窗口。主动勾选后继续，可记住模式；协议链接仅用于阅读。','?scene=first'],
  ['prepare','准备组件','弹窗显示下载、校验、准备；无暂停、收起或关闭。','?scene=prepare'],
  ['login','登录','扫码与账号密码登录。有效旧登录态可跳过。','?scene=login'],
  ['steam','Steam 游戏库','Steam 游戏与盖世导入分组；从游戏详情进入时保留目标。','?scene=ready']
 ]},
 {id:'session',title:'会话与设置',note:'会话内切换即时生效；设置中的启动偏好用于下次进入。',steps:[
  ['big','大屏模式','大封面与清晰焦点适配手柄操作；原生页面以接入结果为准。','?scene=big'],
  ['panel','悬浮球面板','Logo 图标可拖动。右上“−”缩为图标，模式切换与100%–150%缩放在面板内。','?scene=panel'],
  ['account','账号管理','登录、切换与退出同步更新盖世 Steam 入口，账号数据互不混用。','?scene=accounts'],
  ['new-settings','启动落地页','在原四项中新增 Steam。Mac 默认发现，Demo 初始展示游戏库。','?page=settings'],
  ['new-steam-settings','启动模式','在原 Steam 设置内配置窗口/大屏及记忆偏好。','?page=steam-settings']
 ]},
 {id:'states',title:'异常与缺省状态',note:'右下演示工具可随时切换场景；浏览器刷新重置。',steps:[
  ['network-error','网络连接失败','给出重试入口，恢复后回到原目标。','?scene=network-error'],
  ['sync-error','游戏同步失败','保留已有记录；重试后更新当前账号列表。','?scene=sync-error'],
  ['empty','空游戏库','区分尚未加载和确实无游戏，保留来源分类。','?scene=empty']
 ]}
];
const picture=id=>{const p=path.join(dir,'evidence',id+'.jpg');if(!fs.existsSync(p))throw Error('Missing capture '+id);return 'data:image/jpeg;base64,'+fs.readFileSync(p).toString('base64')};
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mac Steam 接入 · 页面与流程</title><style>body{margin:0;background:#edf2f8;color:#223b59;font:15px/1.75 'Microsoft YaHei',sans-serif}main{max-width:1560px;margin:24px auto;background:#fff;padding:38px;border-radius:16px}h1{font-size:29px;margin:4px 0 14px}h2{font-size:24px;margin:0 0 12px}.tag{font-size:13px;color:#71869f}a{color:#286bb6}nav{display:flex;gap:12px;margin:25px 0;flex-wrap:wrap}nav a,.open{padding:8px 15px;background:#edf4fc;border-radius:8px;text-decoration:none}.open{display:inline-block;background:#223b59;color:white}.board{padding:25px;margin-top:26px;border:1px solid #dbe5f1;border-radius:14px;scroll-margin:16px}.note{padding:12px 16px;background:#f2f6fc;color:#526b88;border-radius:8px;margin:0 0 25px}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}.cards.flow{display:flex;overflow-x:auto;padding-bottom:15px}.flow figure{min-width:420px;max-width:420px}.flow figure:not(:last-child)::after{content:'→';position:absolute;right:-24px;top:48%;color:#7795ba;font-size:22px}figure{margin:0;position:relative}figure strong{font-size:17px;display:block}figure p{font-size:13px;color:#6a7e97;margin:5px 0 10px;min-height:42px}figure img{width:100%;display:block;border:1px solid #d9e3ef;border-radius:10px;cursor:zoom-in}figure a{font-size:13px}.footer{padding:18px 22px;background:#f6f8fc;border-radius:10px;color:#687c94;margin-top:28px}dialog{border:0;border-radius:12px;padding:16px;max-width:95vw;max-height:94vh}dialog::backdrop{background:#16314bd9}dialog img{max-width:90vw;max-height:82vh;display:block}dialog button{display:block;margin:0 0 12px auto;padding:7px 18px;border:0;background:#edf3fa;border-radius:6px;cursor:pointer}@media(max-width:800px){main{padding:18px;margin:0}.cards{grid-template-columns:1fr}.board{padding:16px}h1{font-size:24px}}</style></head><body><main><div class="tag">Mac · GameHub 1.0.0 重构基线 · 2026.11.04</div><h1>Steam 接入 · 页面与流程</h1><p>先还原当前 Mac 页面，再接入 Steam 新方案。保留现有导航、平台标签与设置结构。</p><a class="open" href="demo.html">打开可操作 Demo</a><nav>${sections.map(s=>`<a href="#${s.id}">${s.title}</a>`).join('')}</nav>${sections.map(s=>`<section class="board" id="${s.id}"><h2>${s.title}</h2><p class="note">${s.note}</p><div class="cards ${s.flow?'flow':''}">${s.steps.map(([id,title,note,query])=>`<figure><strong>${title}</strong><p>${note}</p><img src="${picture(id)}" alt="${title}" onclick="zoom(this)"><a href="demo.html${query}">体验此页 →</a></figure>`).join('')}</div></section>`).join('')}<div class="footer">登录、二维码、组件下载、账号导入、同步及游戏启动均为模拟。真实 Steam 服务、Mac 容器和 SDK 仍需联调。游戏资料仅作占位，资源位另行设计。</div></main><dialog id="zoom"><button onclick="this.parentElement.close()">关闭</button><img alt="放大页面"></dialog><script>function zoom(img){let d=document.getElementById('zoom');d.querySelector('img').src=img.src;d.querySelector('img').alt=img.alt;d.showModal()}</script></body></html>`;
fs.writeFileSync(path.join(dir,'review.html'),html.replaceAll('href="demo.html','href="MacSteam接入Demo.html'));fs.writeFileSync(path.resolve(dir,'../../public/steam-mac-integration/review.html'),html);console.log('Built Mac review');
