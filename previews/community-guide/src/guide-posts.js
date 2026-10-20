/* Fictional local community posts. Portal curation stores references, never copies. */
(()=>{
  'use strict';
  const GH=window.GH;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const sourceNote='演示玩家创作的虚构示例，仅供本地交互评审；不代表真实作者、互动或当前游戏事实。';
  const seeds=[
    {id:'post-first-trip',title:'第一次到洛圣都：先看任务提示，再熟悉操作',summary:'一个新玩家整理的故事模式入门习惯，先确认当前目标再继续。',author:'洛圣都慢行者',avatar:'avatarAuthor',cover:'wiki-launch',date:'2026-10-18',game:'GTA5',type:'攻略',body:['我第一次玩故事模式时，总想一口气把任务做完，后来发现先看画面上的当前目标会更顺。这里整理的是我的阅读与操作习惯，适用于故事模式的入门交流。','先跟随序章的游戏提示熟悉移动、掩体和驾驶。如果任务没有继续，先检查是否到达目标位置、同伴是否跟上，以及当前画面是否还有提示。','键鼠、手柄和盖世映射的按键显示可能不同。涉及具体操作时，以当前游戏提示和自己的映射为准；遇到卡点可以记录任务名称、版本与当前步骤再提问。'],likes:28,comments:[{id:'comment-trip-1',author:'周末玩一会',text:'把模式和任务名称一起说清楚，交流时确实方便。',date:'2026-10-19'}]},
    {id:'post-controller',title:'用手柄读攻略时，我会先核对这三件事',summary:'确认模式、按键说明和映射，再跟着步骤操作。',author:'手柄研究中',avatar:'avatarAuthor',cover:'wiki-online',date:'2026-10-17',game:'GTA5',type:'攻略',body:['我跟着攻略操作前，会先确认自己在故事模式还是Online，再看文章采用键鼠还是手柄说明。','如果自己的界面显示与文章不同，先查看游戏内设置和当前控制映射，不直接把键盘文字替换成某个虚拟按钮。','调整映射后先在轻松的场景确认移动与交互，再回到原来的任务。记录自己改了什么，排查冲突时容易找到原因。'],likes:19,comments:[]},
    {id:'post-vehicle-choice',title:'新手选车先想用途：我的对照清单',summary:'先明确用途和预算，再查看同一载具的参数与获取说明。',author:'车库整理员',avatar:'avatarAuthor',cover:'wiki-horus-photo',date:'2026-10-19',game:'GTA5',type:'攻略',body:['刚开始看载具攻略时，我会先写下用途：任务通勤、自由驾驶，还是收集外观。这比只看一项价格更容易缩小选择范围。','接着核对模式、版本和自己的预算，再进入公共载具资料查看参数。玩家的使用心得与公共参数是两种内容，价格和获取方式仍需以当前游戏为准。','保留自己的偏好清单，再对照已有资料做决定。'],likes:36,comments:[{id:'comment-car-1',author:'沿海兜风',text:'我更在意驾驶手感，会先明确自己的用途。',date:'2026-10-20'}]}
  ].map(post=>({...post,saves:0,shares:0,sourceNote}));
  let posts,sequence;
  function reset(){posts=new Map(seeds.map(post=>[post.id,clone(post)]));sequence=0;}
  function publish(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.title!=='string'||typeof input.body!=='string')return {ok:false,code:'validation',message:'请填写标题和正文。'};
    const title=input.title.trim(),body=input.body.trim();
    if(!title||input.title.length>160)return {ok:false,code:'validation',message:'标题为必填，最多160字。'};
    if(!body||input.body.length>20000)return {ok:false,code:'validation',message:'正文为必填，最多20000字。'};
    const post={id:'post-local-'+(++sequence),title,summary:body.replace(/\s+/g,' ').slice(0,100),author:'我',avatar:'avatarAuthor',cover:null,date:new Date().toISOString().slice(0,10),game:'GTA5',type:'攻略',body:body.split(/\r?\n+/).map(paragraph=>paragraph.trim()).filter(Boolean),likes:0,saves:0,shares:0,comments:[],sourceNote};
    posts.set(post.id,post);
    return {ok:true,code:'success',message:'已发布；攻略站收录需由管理员配置。',post:clone(post)};
  }
  reset();
  GH.guidePosts=Object.freeze({list:()=>clone([...posts.values()]),get:id=>clone(posts.get(id)||null),reset,publish});
})();
