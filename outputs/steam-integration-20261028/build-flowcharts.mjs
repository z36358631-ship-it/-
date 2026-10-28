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
const first=chart({title:'01 进入 Steam：首次声明与准备弹窗',subtitle:'首次从游戏库弹声明，同意后选择模式 · 下载、校验、准备和启动均在弹窗内展示',height:2690,nodes:[
{x:690,y:165,text:'游戏库 → Steam 入口',type:'end'},
{x:690,y:285,text:'会话及登录仍有效？',type:'decision',w:360},
{x:1110,y:285,text:'恢复原 Steam 页面与模式\n不因声明更新打断有效会话',type:'end',w:360},
{x:690,y:435,text:'当前声明版本已同意？',type:'decision',w:360},
{x:255,y:435,text:'游戏库上弹免责声明全文\n可滚动阅读，尚不下载组件',w:360},
{x:255,y:585,text:'不同意 → 关闭弹窗\n停留游戏库，不开始下载',type:'end',w:360},
{x:690,y:595,text:'已记住启动模式？',type:'decision',w:360},
{x:255,y:745,text:'整页选择大屏 / 窗口\n记住我的选择默认关闭',w:360},
{x:255,y:875,text:'取消 → 返回游戏库\n不保存本次模式偏好',type:'end',w:360},
{x:690,y:745,text:'使用选择或已保存的模式'},
{x:690,y:895,text:'组件可用且已准备？',type:'decision',w:360},
{x:690,y:1045,text:'游戏库上的准备弹窗\n下载组件，展示进度，可暂停继续',w:360},
{x:255,y:1045,text:'断网 / 空间不足 / 收起弹窗\n保留有效内容；重进后继续',type:'error',w:360},
{x:690,y:1205,text:'同一弹窗：校验 → 准备\n100% 下载不代表可以使用',w:360},
{x:255,y:1205,text:'校验或准备失败\n重取损坏内容 / 重试准备',type:'error',w:360},
{x:690,y:1365,text:'同一弹窗：启动 Steam\n等待实际可用回执',w:360},
{x:1110,y:1365,text:'启动失败\n原弹窗重试，复用有效组件',type:'error',w:360},
{x:690,y:1525,text:'原生登录仍有效？',type:'decision',w:360},
{x:690,y:1675,text:'关闭准备弹窗 → 登录页\n回显已同意勾选；输入后点击登录',w:390},
{x:690,y:1835,text:'点击登录时仍已勾选？',type:'decision',w:360},
{x:255,y:1835,text:'登录声明弹窗：可滚动全文\n知晓并同意 / 不同意（纯文字）',w:390},
{x:690,y:1995,text:'提交本次登录请求\n等待真实登录结果，不提前进入',w:360},
{x:690,y:2155,text:'实际登录结果？',type:'decision',w:360},
{x:1110,y:2155,text:'登录未完成\n保留输入与目标，可重试或返回',type:'error',w:360},
{x:690,y:2320,text:'关闭准备弹窗 / 登录完成\nSteam 界面可用，进入库或原目标',type:'steam',w:390},
{x:690,y:2470,text:'返回盖世游戏\n保留 Steam 会话，不注销',type:'end'},
],edges:[
{d:'M690 200 V236'}, {d:'M870 285 H930',label:'是',x:900,y:268},
{d:'M690 334 V386',label:'否',x:715,y:365},
{d:'M510 435 H435',label:'否',x:473,y:417},
{d:'M255 470 V550',label:'不同意',x:300,y:517},
{d:'M435 450 H475 V530 H690 V546',label:'知晓并同意：保存版本',x:627,y:517},
{d:'M690 484 V546',label:'是',x:715,y:525},
{d:'M510 595 H475 V665 H255 V710',label:'否',x:433,y:650},
{d:'M690 644 V710',label:'是',x:715,y:685},
{d:'M435 745 H535',label:'继续',x:485,y:728},
{d:'M255 780 V840',label:'取消',x:288,y:813},
{d:'M690 780 V846'},
{d:'M690 944 V1010',label:'否',x:715,y:984},
{d:'M870 895 H940 V1295 H690 V1330',label:'是：复用有效组件',x:1050,y:945},
{d:'M510 1030 H435',label:'中断',x:473,y:1010},
{d:'M435 1063 H510',label:'恢复 / 重试',x:475,y:1105},
{d:'M690 1080 V1170'},
{d:'M510 1190 H435',label:'失败',x:473,y:1170},
{d:'M435 1223 H510',label:'重试准备',x:473,y:1265},
{d:'M75 1205 H35 V970 H690 V1010',label:'校验失败：重取损坏内容',x:267,y:957},
{d:'M690 1240 V1330'},
{d:'M870 1348 H930',label:'失败',x:900,y:1328},
{d:'M930 1383 H870',label:'重试',x:900,y:1423},
{d:'M690 1400 V1476'},
{d:'M690 1574 V1640',label:'否',x:715,y:1612},
{d:'M870 1525 H1315 V2320 H885',label:'是：直接进入',x:1190,y:2302},
{d:'M690 1710 V1786'},
{d:'M510 1835 H450',label:'已取消',x:480,y:1815},
{d:'M690 1884 V1960',label:'是',x:715,y:1930},
{d:'M255 1800 V1675 H495',label:'不同意：关闭且保留输入',x:282,y:1648},
{d:'M255 1870 V1995 H510',label:'知晓并同意',x:386,y:1977},
{d:'M690 2030 V2106'},
{d:'M870 2155 H930',label:'失败',x:900,y:2135},
{d:'M1110 2120 V1995 H870',label:'重试',x:1058,y:1977},
{d:'M690 2204 V2285',label:'成功',x:719,y:2250},
{d:'M690 2355 V2435'},
],notes:['入口同版本已同意不重复弹；新版本在下一次新启动前确认。登录页回显已有同意，正常主链不重复确认。','准备弹窗收起后下载暂停并保留进度；重进按已选模式 / 偏好及有效阶段恢复。只有启动可用后才进入登录或 Steam。','声明链接只读，不自动授权；用户正文原样保留，法律及服务事实仍需核对。APK 真实登录、游戏运行与迁移须真机联调。']});
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
