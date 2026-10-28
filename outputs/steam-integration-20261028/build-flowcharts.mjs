import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function chart({title,subtitle,height,nodes,edges,notes}){
 let out=`<svg xmlns="http://www.w3.org/2000/svg" width="1380" height="${height}" viewBox="0 0 1380 ${height}" role="img" aria-label="${title}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#6c7d91"/></marker></defs><style>text{font-family:'Microsoft YaHei','PingFang SC',sans-serif}.title{font-size:30px;font-weight:700;fill:#17273b}.sub{font-size:15px;fill:#65738a}.label{font-size:15px;fill:#4a5c73;paint-order:stroke;stroke:#f7f9fc;stroke-width:7px;stroke-linejoin:round}.node{font-size:18px;font-weight:600;fill:#24344b}.small{font-size:14px;font-weight:400;fill:#5c6d82}.note{font-size:16px;fill:#53677f}</style><rect width="1380" height="${height}" fill="#f7f9fc"/><text class="title" x="60" y="58">${title}</text><text class="sub" x="60" y="90">${subtitle}</text>`;
 for(const e of edges){out+=`<path d="${e.d}" fill="none" stroke="${e.color||'#8b9aae'}" stroke-width="2" ${e.dash?'stroke-dasharray="6 6"':''} marker-end="url(#arrow)"/>`;if(e.label)out+=`<text class="label" x="${e.x}" y="${e.y}" text-anchor="middle">${esc(e.label)}</text>`;}
 for(const n of nodes){const w=n.w||310,h=n.h||70,x=n.x-w/2,y=n.y-h/2;const fill=n.type==='decision'?'#e7f4ff':n.type==='error'?'#fff2e7':n.type==='end'?'#e7f5ef':n.type==='steam'?'#e6edf6':'#ffffff';
 if(n.type==='decision')out+=`<path d="M${n.x} ${y-14} L${x+w} ${n.y} L${n.x} ${y+h+14} L${x} ${n.y} Z" fill="${fill}" stroke="#aac9e4" stroke-width="1.5"/>`;
 else out+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${n.type==='error'?'#e7c5a5':'#c8d4e0'}" stroke-width="1.5"/>`;
 const lines=n.text.split('\n');for(let i=0;i<lines.length;i++)out+=`<text class="${i===0?'node':'small'}" text-anchor="middle" x="${n.x}" y="${n.y-(lines.length-1)*11+i*24+6}">${esc(lines[i])}</text>`;}
 for(let i=0;i<notes.length;i++)out+=`<text class="note" x="60" y="${height-80+i*26}">${esc(notes[i])}</text>`;
 return (out+'</svg>').replaceAll('id="arrow"',`id="arrow-${title.slice(0,2)}"`).replaceAll('url(#arrow)',`url(#arrow-${title.slice(0,2)})`);
}
const first=chart({title:'01 进入 Steam：模式、组件与登录声明',subtitle:'声明确认位于首次账号登录授权 · 模式页仅选择启动方式 · 所有成功以实际回执为准',height:2240,nodes:[
{x:690,y:165,text:'游戏库 → Steam 入口',type:'end'},
{x:690,y:285,text:'会话及登录仍有效？',type:'decision',w:360},
{x:1110,y:285,text:'恢复原 Steam 页面与模式',type:'steam'},
{x:690,y:420,text:'已记住启动模式？',type:'decision',w:360},
{x:255,y:420,text:'选择大屏 / 窗口\n记住我的选择默认关闭',w:360},
{x:255,y:550,text:'取消 → 返回游戏库\n不保存本次模式偏好',type:'end',w:360},
{x:690,y:550,text:'使用选择或已保存的模式'},
{x:690,y:695,text:'组件可用且已准备？',type:'decision',w:360},
{x:690,y:830,text:'下载运行组件\n真实字节进度，可暂停继续'},
{x:255,y:830,text:'网络 / 空间异常或离开\n保留有效分片，恢复后重试',type:'error',w:360},
{x:690,y:970,text:'校验 → 准备\n100% 下载不代表可以使用'},
{x:255,y:970,text:'校验或准备失败\n重取损坏内容 / 重试准备',type:'error',w:360},
{x:690,y:1110,text:'启动 Steam'},
{x:1110,y:1110,text:'启动失败\n重试或返回，不重复下载有效包',type:'error',w:360},
{x:690,y:1245,text:'原生登录仍有效？',type:'decision',w:360},
{x:255,y:1245,text:'登录页：账号、密码、声明\n首次默认未勾选，全文可只读查看',w:390},
{x:255,y:1385,text:'点击登录时已勾选？',type:'decision',w:360},
{x:255,y:1535,text:'声明弹窗：全文可上下滚动\n知晓并同意 / 不同意（纯文字）',w:390},
{x:690,y:1535,text:'提交本次登录授权\n保存当前声明版本，等待登录结果'},
{x:690,y:1680,text:'实际登录结果？',type:'decision',w:360},
{x:1110,y:1680,text:'登录未完成\n保留输入与目标，可重试或返回',type:'error',w:360},
{x:690,y:1830,text:'Steam 界面可用\n进入库或原目标',type:'steam'},
{x:690,y:1970,text:'返回盖世游戏\n保留 Steam 会话，不注销',type:'end'},
],edges:[
{d:'M690 200 V236'}, {d:'M870 285 H955',label:'是',x:910,y:270}, {d:'M1110 320 H1320 V1830 H845',label:'有效会话恢复',x:1200,y:1810},
{d:'M690 334 V371',label:'否',x:714,y:360}, {d:'M510 420 H435',label:'否',x:474,y:404}, {d:'M255 455 V515',label:'取消',x:289,y:492}, {d:'M435 435 H475 V550 H535',label:'继续',x:495,y:524}, {d:'M690 469 V515',label:'是',x:714,y:492},
{d:'M690 585 V646'}, {d:'M690 744 V795',label:'否',x:714,y:779}, {d:'M870 695 H900 V1050 H690 V1075',label:'是',x:924,y:740},
{d:'M535 815 H435',label:'中断',x:486,y:799}, {d:'M435 849 H535',label:'恢复 / 重试',x:486,y:880}, {d:'M690 865 V935'},
{d:'M535 955 H435',label:'失败',x:486,y:941}, {d:'M435 990 H535',label:'重试准备',x:486,y:1022}, {d:'M75 970 H35 V760 H690 V795',label:'校验失败重取损坏内容',x:260,y:747},
{d:'M690 1005 V1075'}, {d:'M845 1095 H930',label:'失败',x:889,y:1080}, {d:'M930 1128 H845',label:'重试',x:889,y:1160}, {d:'M690 1145 V1196'},
{d:'M510 1245 H450',label:'否',x:480,y:1230}, {d:'M690 1294 V1455 H925 V1830 H845',label:'是：直接进入',x:993,y:1450},
{d:'M255 1280 V1336'}, {d:'M435 1385 H690 V1500',label:'是',x:554,y:1370}, {d:'M255 1434 V1500',label:'否',x:279,y:1479},
{d:'M450 1535 H535',label:'知晓并同意',x:491,y:1517}, {d:'M60 1535 H20 V1245 H60',label:'不同意：保留账号密码',x:158,y:1630},
{d:'M690 1570 V1631'}, {d:'M870 1680 H930',label:'失败',x:900,y:1664}, {d:'M1110 1645 V1535 H845',label:'重试',x:1065,y:1518}, {d:'M690 1729 V1795',label:'成功',x:719,y:1773}, {d:'M690 1865 V1935'},
],notes:['声明同版本已同意可回显；新版本在下次登录授权确认，不因版本变化打断有效会话。只读查看不自动同意或登录。','悬浮球最小化只缩小球，不改变 Steam 页面；不同于“返回盖世游戏”。用户提供声明正文，法律及服务事实仍需核对。','图为产品方案；APK 当前模拟器启动受阻，真实登录、游戏启动与迁移须真机联调。']});
const second=chart({title:'02 使用中：返回、设置与原生能力承接',subtitle:'Steam 与盖世模式独立 · 最小化球不改变 Steam 页面 · 球无关闭及开关',height:1350,nodes:[
 {x:690,y:175,text:'Steam 窗口式 / 大屏式界面',type:'steam',w:360},
 {x:275,y:340,text:'好友 / 消息通知',w:320},
 {x:690,y:340,text:'游戏库 → 启动游戏',w:320},
 {x:1105,y:340,text:'创意工坊',w:320},
 {x:275,y:480,text:'Steam 原生好友 / 对应 event\n未就绪时保留目标'},
 {x:690,y:615,text:'盖世游戏运行桥接\n启动参数 / 邀请参数须透传',w:360},
 {x:1105,y:480,text:'Steam 原生工坊\n保留具体游戏上下文'},
 {x:690,y:745,text:'实际启动结果？',type:'decision'},
 {x:1105,y:745,text:'启动失败\n保留上下文；可重试或返回',type:'error'},
 {x:690,y:875,text:'进入游戏',type:'end'},
 {x:275,y:745,text:'球 / 固定返回 → 返回盖世\n保留当前模式与会话'},
 {x:275,y:885,text:'设置 → Steam 设置 → 启动模式\n每次询问 / 大屏 / 窗口'},
 {x:275,y:1035,text:'下次新启动应用新偏好\n恢复已有会话仍沿用当前模式',type:'end',w:360},
 {x:1105,y:1035,text:'菜单 → 最小化悬浮球\n球缩成小图标，Steam页面不变',type:'end',w:340},
 {x:1105,y:1155,text:'点击小图标\n恢复常规球并展开菜单',type:'end',w:340},
],edges:[
 {d:'M510 175 H275 V305'}, {d:'M690 210 V305'}, {d:'M870 175 H1105 V305'},
 {d:'M275 375 V445'}, {d:'M1105 375 V445'},
 {d:'M690 375 V580'},
 {d:'M430 480 H490 V615 H510',label:'接受游戏邀请',x:516,y:548},
 {d:'M690 650 V696'},
 {d:'M845 745 H950',label:'失败',x:900,y:730},
 {d:'M1105 710 V615 H870',label:'重试',x:1040,y:598},
 {d:'M690 794 V840',label:'成功',x:719,y:827},
 {d:'M510 195 H65 V745 H120',label:'收起 Steam',x:125,y:635},
 {d:'M275 710 V615 H25 V125 H690 V140',label:'再次点 Steam，恢复',x:272,y:599},
 {d:'M275 780 V850'}, {d:'M275 920 V1000'},
 {d:'M1265 175 H1320 V1035 H1275',label:'悬浮球菜单',x:1283,y:941},
 {d:'M1105 1070 V1120'},
],notes:['Demo 仅演示路由和状态：不发送真实消息、不登录真实账号、不下载真实组件、不启动真实游戏。','账号与下载迁移、组件更新、手柄输入、原生页面内 View 覆盖及游戏启动桥接均需单独联调验收。']});
fs.writeFileSync(path.join(root,'首次进入流程.svg'),first);
fs.writeFileSync(path.join(root,'返回与设置流程.svg'),second);
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steam 接入 · 用户流程图</title><style>*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#24344b;font-family:system-ui,'Microsoft YaHei',sans-serif}header{padding:25px 32px;background:#fff;border-bottom:1px solid #dce4ee;display:flex;align-items:center;gap:20px;flex-wrap:wrap;position:sticky;top:0;z-index:1}h1{font-size:22px;margin:0}header span{font-size:13px;color:#687a91}nav{display:flex;gap:8px;margin-left:auto}button,a{padding:10px 15px;border:1px solid #cfd9e6;border-radius:8px;background:white;color:#344965;text-decoration:none;font-size:14px;cursor:pointer}button[aria-selected=true]{background:#172f4d;color:white}main{max-width:1440px;margin:24px auto;padding:0 20px}article{background:#f7f9fc;border:1px solid #d8e2ed;border-radius:18px;overflow:auto;box-shadow:0 12px 40px #1c35500a}svg{width:100%;height:auto;min-width:680px;display:block}.legend{display:flex;gap:24px;margin:15px 5px 22px;font-size:13px;color:#687a91}.legend i{display:inline-block;width:12px;height:12px;background:#e7f4ff;border:1px solid #abc9e3;margin-right:6px}.legend i.err{background:#fff2e7;border-color:#e7c5a5}.legend i.end{background:#e7f5ef;border-color:#bddace}[hidden]{display:none!important}@media print{header{position:static}nav{display:none}article[hidden]{display:block!important}article{break-after:page;box-shadow:none;border:0}main{padding:0;margin:0}}</style><header><h1>Steam 接入 · 用户流程</h1><span>2026.10.28 / 已确认方案 / 两张完整路径图</span><nav><button aria-selected="true" data-tab="0">首次进入与异常</button><button aria-selected="false" data-tab="1">返回与设置</button><a href="Steam接入Demo.html">打开交互 Demo ↗</a></nav></header><main><div class="legend"><span><i></i>条件分支</span><span><i class="err"></i>异常与恢复</span><span><i class="end"></i>结果状态</span><span>页面可打印；同目录提供独立 SVG</span></div><article id="c0">${first}</article><article id="c1" hidden>${second}</article></main><script>document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.getElementById('c0').hidden=b.dataset.tab!=='0';document.getElementById('c1').hidden=b.dataset.tab!=='1';window.scrollTo(0,0)})</script></html>`;
fs.writeFileSync(path.join(root,'用户流程图.html'),html);
console.log('Created two SVG flowcharts and 用户流程图.html');
