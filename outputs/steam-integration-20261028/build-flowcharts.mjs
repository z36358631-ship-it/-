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
function withLaunchSources(c){
 const dy=450;
 c.nodes=c.nodes.map(n=>({...n,y:n.y+dy}));
 c.edges=c.edges.map(e=>({...e,d:e.d.replace(/M(\d+) (\d+)/g,(_,x,y)=>`M${x} ${+y+dy}`).replace(/V(\d+)/g,(_,y)=>`V${+y+dy}`),y:e.y===undefined?undefined:e.y+dy}));
 c.height=3300;
 c.title='01 启动与进入：落地页、统一门禁和游戏目标';
 c.subtitle='未设置：竖屏主页、横屏游戏库 · 显式选择优先 · PC游戏目标跨准备及登录保留';
 c.nodes.unshift(
  {x:255,y:165,text:'APP 冷启动',type:'end',w:340},
  {x:255,y:290,text:'本次落地为 Steam？',type:'decision',w:380},
  {x:255,y:440,text:'主页 / 社区 / 游戏库\n未设置时：竖屏主页、横屏游戏库',type:'end',w:390},
  {x:690,y:165,text:'游戏库 Steam 卡片\n登录后显示昵称 + 头像',w:380},
  {x:1110,y:165,text:'PC 游戏启动 / 导入成功\n仅当前已接入 PC 游戏范围',w:380}
 );
 c.edges.unshift(
  {d:'M255 200 V241'},
  {d:'M255 339 V405',label:'否',x:280,y:378},
  {d:'M445 290 H690 V580',label:'是：仍执行必要条件',x:745,y:430},
  {d:'M690 200 V580'},
  {d:'M1110 200 V615 H880',label:'保留游戏目标',x:1120,y:430}
 );
 c.nodes.push(
  {x:1110,y:2590,text:'承接指定 PC 游戏\n发起实际游戏运行请求',w:380},
  {x:1110,y:2760,text:'实际运行结果？',type:'decision',w:380},
  {x:1110,y:2940,text:'进入目标游戏',type:'end',w:380},
  {x:690,y:2940,text:'失败：保留目标，可明确重试\n取消：停止本次自动继续',type:'error',w:390}
 );
 c.edges.push(
  {d:'M1300 1050 H1340 V2500 H690 V2555',label:'复用会话后继续本次目标',x:1135,y:2482},
  {d:'M880 2590 H920',label:'有游戏目标',x:902,y:2565},
  {d:'M1110 2625 V2711'},
  {d:'M1110 2809 V2905',label:'成功',x:1140,y:2860},
  {d:'M920 2760 H900 V2940 H885',label:'失败',x:928,y:2860},
  {d:'M690 2975 V3060 H1340 V2590 H1300',label:'用户明确重试',x:1110,y:3040}
 );
 c.notes=['冷启动未设置与旧版缺字段均按启动时方向；设置只有主页、社区、游戏库、Steam四项。旋转当前页面不跳转。','收起不暂停：下载、校验、准备继续；后台完成或失败不抢跳。再点入口重开当前状态，已就绪则启动。','资料昵称头像不取登录账号字符串；Demo仅模拟落地、资料与运行结果，真实认证、文件导入及游戏运行仍需联调。'];
 return c;
}
const first=chart(withLaunchSources({title:'01 进入 Steam：模式、协议与扫码登录',subtitle:'旧版已登录也须首次确认 · 准备弹窗仅状态、进度和操作 · 实际登录成功才进入',height:2560,nodes:[
{x:690,y:165,text:'统一进入 Steam\n保留本次来源与游戏目标',type:'end'},
{x:690,y:290,text:'新方案和当前声明已确认？',type:'decision',w:380},
{x:255,y:440,text:'模式选择 + 记忆开关 + 协议勾选\n首次未勾选，继续禁用',w:390},
{x:255,y:600,text:'勾选后继续\n保存模式、声明版本及新流程确认',w:390},
{x:1110,y:440,text:'本方案有效会话可恢复？',type:'decision',w:380},
{x:1110,y:600,text:'复用本方案会话与原模式\n有新游戏目标则继续该目标',type:'end',w:380},
{x:690,y:760,text:'确定本次启动模式\n首次新方案按所选模式启动',w:380},
{x:255,y:760,text:'未记忆模式 → 选择页\n已确认协议可回显；取消不保存',w:380},
{x:690,y:920,text:'组件可用且已准备？',type:'decision',w:380},
{x:690,y:1080,text:'简洁准备弹窗：下载组件\n实际进度，仅保留收起',w:380},
{x:255,y:1080,text:'断网 / 空间不足\n保留有效内容，明确重试',type:'error',w:380},
{x:690,y:1240,text:'同一弹窗：校验 → 准备\n收起后任务也持续执行',w:380},
{x:1110,y:1080,text:'收起弹窗 → 留在原页\n下载 / 校验 / 准备继续',w:380},
{x:1110,y:1240,text:'后台完成或失败 → 不抢跳\n再次进入查看当前阶段 / 结果',type:'end',w:380},
{x:255,y:1240,text:'校验失败 / 准备失败\n重取损坏内容 / 重试准备',type:'error',w:380},
{x:690,y:1400,text:'同一弹窗：启动 Steam\n等待真实可用结果',w:380},
{x:1110,y:1400,text:'启动失败\n重试复用有效组件，或收起',type:'error',w:380},
{x:690,y:1560,text:'Steam 登录态仍有效？',type:'decision',w:380},
{x:690,y:1720,text:'关闭弹窗 → 登录页\n上方扫码，下方账号密码',w:380},
{x:255,y:1720,text:'二维码加载 / 有效 / 过期 / 失败\n过期刷新，获取失败重试',w:390},
{x:255,y:1880,text:'已扫码：等待手机确认\n扫码本身不算登录成功',w:380},
{x:690,y:1880,text:'原生认证结果\n扫码或账号密码，两路径只进入一次',type:'decision',w:400},
{x:1110,y:1880,text:'登录失败\n保留输入及原目标，可重试',type:'error',w:380},
{x:690,y:2140,text:'Steam 界面可用\n进入库或继续指定游戏目标',type:'steam',w:380},
{x:690,y:2310,text:'返回盖世游戏\n保留本方案会话，不注销',type:'end',w:380},
],edges:[
{d:'M690 200 V241'},
{d:'M500 290 H255 V405',label:'否：含旧版已登录',x:284,y:325},
{d:'M880 290 H1110 V391',label:'是',x:1065,y:325},
{d:'M1110 489 V565',label:'是',x:1140,y:535},
{d:'M920 440 H690 V711',label:'否：按偏好',x:767,y:520},
{d:'M255 475 V565',label:'勾选后继续',x:255,y:530},
{d:'M445 600 H480 V760 H500',label:'首次按所选模式',x:470,y:695},
{d:'M500 740 H445',label:'需询问',x:470,y:717},
{d:'M445 778 H500',label:'继续',x:472,y:812},
{d:'M690 795 V871'},
{d:'M690 969 V1045',label:'否',x:719,y:1013},
{d:'M880 920 H1315 V1320 H690 V1365',label:'是：复用',x:1195,y:952},
{d:'M500 1063 H445',label:'中断',x:473,y:1043},
{d:'M445 1098 H500',label:'恢复',x:473,y:1141},
{d:'M690 1115 V1205'},
{d:'M500 1223 H445',label:'失败',x:473,y:1203},
{d:'M445 1258 H500',label:'重试',x:473,y:1301},
{d:'M65 1240 H30 V990 H690 V1045',label:'校验失败重取损坏内容',x:265,y:975},
{d:'M690 1275 V1365',label:'前台可见且已就绪',x:785,y:1325},
{d:'M880 1080 H920'},
{d:'M1110 1115 V1205'},
{d:'M920 1240 H900 V1320 H690 V1365',label:'再次进入且已就绪',x:1138,y:1318},
{d:'M880 1383 H920',label:'失败',x:900,y:1356},
{d:'M920 1418 H880',label:'重试',x:900,y:1459},
{d:'M690 1435 V1511',label:'仍在进入流程',x:779,y:1482},
{d:'M690 1609 V1685',label:'否',x:719,y:1650},
{d:'M880 1560 H1315 V2140 H880',label:'是：含有效旧登录态',x:1165,y:2118},
{d:'M500 1720 H450'},
{d:'M255 1755 V1845',label:'扫码',x:283,y:1807},
{d:'M445 1880 H490'},
{d:'M690 1755 V1831',label:'账号密码登录',x:778,y:1807},
{d:'M890 1880 H920',label:'失败',x:903,y:1858},
{d:'M1110 1845 V1720 H880',label:'重试',x:1095,y:1701},
{d:'M690 1929 V2105',label:'实际成功：更新昵称头像',x:740,y:2020},
{d:'M690 2175 V2275'},
],notes:['旧版首次接入不能凭已登录或记忆模式跳过；继续后按本次模式启动新界面，有效登录态保留。','未勾选不能继续；取消不保存本次更改；声明全文只读往返保留选择，登录页不再重复勾选。','Demo 二维码仅为模拟；原生扫码、账号迁移、游戏运行及输入仍须联调。']}));
const second=chart({title:'02 使用中：返回、设置与原生能力承接',subtitle:'当前模式可即时切换，与下次启动偏好独立 · 圆圈X只收菜单 · 球无关闭及开关',height:1980,nodes:[
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
 {x:275,y:1200,text:'通用设置 → 启动后进入\n主页 / 社区 / 游戏库 / Steam',w:380},
 {x:275,y:1350,text:'下次冷启动生效\n未设置：竖屏主页、横屏游戏库',type:'end',w:380},
 {x:690,y:1110,text:'首次Steam库：启动页轻提示\n准备 / 登录 / 游戏启动中不展示',w:380},
 {x:690,y:1350,text:'知道了 → 收起提示\n去设置或知道了均记录已处理',type:'end',w:380},
 {x:275,y:1570,text:'悬浮菜单右上圆圈 X',w:380},
 {x:275,y:1730,text:'仅收起菜单\n常规球继续显示',type:'end',w:380},
 {x:690,y:1570,text:'菜单当前模式：大屏 / 窗口',w:380},
 {x:690,y:1730,text:'立即切换当前Steam界面\n不修改下次启动偏好',type:'end',w:380},
 {x:1105,y:1570,text:'Steam内容缩放100%—150%\n整数比例，默认100%',w:380},
 {x:1105,y:1730,text:'同会话保留，新会话100%\n盖世宿主 / 菜单 / 球不缩放',type:'end',w:380},
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
 {d:'M275 710 V615 H25 V125 H690 V140',label:'完成当前确认后恢复',x:272,y:599},
 {d:'M275 780 V850'}, {d:'M275 920 V1000'},
 {d:'M1265 175 H1320 V1035 H1275',label:'悬浮球菜单',x:1283,y:941},
 {d:'M1105 1070 V1120'},
 {d:'M95 885 H45 V1200 H85'},
 {d:'M275 1235 V1315'},
 {d:'M690 1145 V1315'},
 {d:'M500 1110 H475 V1200 H465',label:'去设置',x:480,y:1166},
 {d:'M275 1605 V1695'},
 {d:'M690 1605 V1695'},
 {d:'M1105 1605 V1695'},
],notes:['Demo 仅演示路由和状态：不发送真实消息、不登录真实账号、不下载真实组件、不启动真实游戏。','切换当前模式保留会话、Steam页面、登录输入及游戏目标；账号管理和开发者选项仅占位，具体以接入Steam Demo为准。']});
fs.writeFileSync(path.join(root,'首次进入流程.svg'),first);
fs.writeFileSync(path.join(root,'返回与设置流程.svg'),second);
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steam 接入 · 用户流程图</title><style>*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#24344b;font-family:system-ui,'Microsoft YaHei',sans-serif}header{padding:25px 32px;background:#fff;border-bottom:1px solid #dce4ee;display:flex;align-items:center;gap:20px;flex-wrap:wrap;position:sticky;top:0;z-index:1}h1{font-size:22px;margin:0}header span{font-size:13px;color:#687a91}nav{display:flex;gap:8px;margin-left:auto}button,a{padding:10px 15px;border:1px solid #cfd9e6;border-radius:8px;background:white;color:#344965;text-decoration:none;font-size:14px;cursor:pointer}button[aria-selected=true]{background:#172f4d;color:white}main{max-width:1440px;margin:24px auto;padding:0 20px}article{background:#f7f9fc;border:1px solid #d8e2ed;border-radius:18px;overflow:auto;box-shadow:0 12px 40px #1c35500a}svg{width:100%;height:auto;min-width:680px;display:block}.legend{display:flex;gap:24px;margin:15px 5px 22px;font-size:13px;color:#687a91}.legend i{display:inline-block;width:12px;height:12px;background:#e7f4ff;border:1px solid #abc9e3;margin-right:6px}.legend i.err{background:#fff2e7;border-color:#e7c5a5}.legend i.end{background:#e7f5ef;border-color:#bddace}[hidden]{display:none!important}@media print{header{position:static}nav{display:none}article[hidden]{display:block!important}article{break-after:page;box-shadow:none;border:0}main{padding:0;margin:0}}</style><header><h1>Steam 接入 · 用户流程</h1><span>2026.10.28 / 已确认方案 / 两张完整路径图</span><nav><button aria-selected="true" data-tab="0">首次进入与异常</button><button aria-selected="false" data-tab="1">返回与设置</button><a href="Steam接入Demo.html">打开交互 Demo ↗</a></nav></header><main><div class="legend"><span><i></i>条件分支</span><span><i class="err"></i>异常与恢复</span><span><i class="end"></i>结果状态</span><span>页面可打印；同目录提供独立 SVG</span></div><article id="c0">${first}</article><article id="c1" hidden>${second}</article></main><script>document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.getElementById('c0').hidden=b.dataset.tab!=='0';document.getElementById('c1').hidden=b.dataset.tab!=='1';window.scrollTo(0,0)})</script></html>`;
fs.writeFileSync(path.join(root,'用户流程图.html'),html);
console.log('Created two SVG flowcharts and 用户流程图.html');
