(() => {
  'use strict';
  const articles = {
    'weapon-shield': {id:'weapon-shield',game:'hades',category:'武器玩法',title:'盾牌开局：挡住，再找机会出手',deck:'不急着贴身连打，试试防御、蓄力冲锋和投掷的节奏。',image:'scene-hades',sections:[['先挡一次，而不是多打一下','持盾蓄力时可以抵挡来自正面的攻击。先面对敌人观察攻击方向，再用蓄力冲锋接近；四周都有敌人时，仍要及时调整位置。'],['投掷之后，给自己留一条路','盾牌特殊攻击可以攻击远处目标。投出盾牌后，利用移动和冲刺重新站位，别停在原地等它回来。'],['这一局只练一个习惯','进入房间后先看远程敌人在哪，再决定面朝哪个方向。先让自己少吃一次伤害，再考虑攻击组合。']]},
    'weapon-bow': {id:'weapon-bow',game:'hades',category:'武器玩法',title:'拿起弓，把战斗距离拉开',deck:'走位、蓄力、出手，远程武器也有自己的节奏。',image:'scene-hades',sections:[['站位先于输出','弓的蓄力会占用出手时间。先和近战敌人拉开距离，再选择蓄力射击；被包围时优先冲出空隙。'],['把普通攻击和特殊攻击分开理解','普通攻击适合瞄准远处目标，扇形特殊攻击可以处理不同距离的威胁。试着观察一次出手后敌人的位置，而不只是连续按键。'],['祝福围绕常用动作选','这一局如果主要依靠普通攻击，就留意对普通攻击有帮助的祝福。先玩出一种稳定节奏，再尝试更多组合。']]},
    'hades-touch': {id:'hades-touch',game:'hades',category:'操作经验',title:'冲刺和攻击，先练好这一个衔接',deck:'从安全的房间开始，熟悉移动中出手的手感。',image:'scene-hades',sections:[['先认清三个常用操作','移动、攻击和冲刺是频繁使用的动作。进入战斗前，先确认自己在看画面时能否准确找到对应按键。'],['一次只练一个组合','找一个不拥挤的场景，先试移动接冲刺，再加上攻击。触屏与手柄的按键位置不同，不必照搬同一种手势。'],['留意手指有没有挡住目标','如果手指遮住角色或来袭攻击，先调整握持和按键位置。舒服的操作布局应该帮助看清战场。']]},
    'elden-explore': {id:'elden-explore',game:'elden',category:'探索路线',title:'先不打主线，去宁姆格福走一圈',deck:'赐福、地图碎片、教堂，把探索变成今天的小目标。',image:'scene-elden',sections:[['先让地图变得好读','沿道路寻找地图碎片，遇到赐福就先点亮。用能够辨认的地形和已到达的地点建立自己的路线。'],['看到岔路，可以先做标记','洞窟、废墟和教堂可能通向不同的内容。遇到暂时不想挑战的敌人，可以先标记位置，继续探索别处。'],['回到熟悉的地方，检查收获','结束一小段探索后，回看获得的物品和开启的赐福。下一次打开游戏，就有一个明确的落脚点。']]},
    'elden-guard': {id:'elden-guard',game:'elden',category:'战斗技巧',title:'别一直举盾：给精力留一点余地',deck:'观察一轮攻击，理解防御、翻滚和反击之间的空隙。',image:'scene-elden',sections:[['先看精力条','格挡和翻滚都需要精力。连续承受攻击后，先确认还剩多少精力，再决定反击或拉开距离。'],['防御也需要方向','盾牌需要朝向来袭攻击，背后和侧面的威胁仍然存在。锁定目标之外，也要留意周围是否有其他敌人。'],['在熟悉的敌人身上练节奏','先选一个已经了解的敌人，观察它攻击结束的时机。一次只尝试一个动作，比在陌生战斗里同时试很多操作更容易判断问题。']]},
    'elden-controls': {id:'elden-controls',game:'elden',category:'操作经验',title:'小屏玩探索，先把视角转顺',deck:'移动时观察道路，战斗时留意锁定，两个场景分开练。',image:'scene-elden',sections:[['先在安全区域练移动和转视角','移动方向和镜头方向分别控制。先走一段熟悉的路，确认自己能同时保持前进和观察周围。'],['锁定适合具体场景','锁定可以帮助面对一个目标，也会改变镜头表现。面对多个敌人或狭窄环境时，留意是否需要解除锁定。'],['菜单也属于游玩体验','看装备说明和地图时，确认文字能否看清、操作能否准确。长时间游玩前，先把这些高频环节走一遍。']]},
    'hades-loop': {id:'hades-loop',game:'hades',category:'玩法片段',title:'房门后还有什么？再试一局哈迪斯',deck:'在一间间战斗房中选择奖励，让武器和祝福形成这一次的打法。',image:'scene-hades',sections:[['每扇门，都是下一步选择','战斗房结束后，下一间房的奖励会影响成长方向。恢复、金币或祝福，应该结合当前状态决定。'],['同一条路，可以打得不一样','换一把武器，或围绕另一种攻击选择祝福，会改变接近敌人和躲避攻击的方式。'],['不必一开始就追求最优解','先找到自己喜欢的攻击节奏，再逐渐认识祝福之间的关系。一次结束之后，也可以带着新的想法再次出发。']]},
    'theme-roam': {id:'theme-roam',game:'horizon',category:'今晚怎么玩',title:'今晚不赶进度，只想去远处看看',deck:'开放世界里的小目标，可以是一处高地，也可以是一段没走过的路。',image:'cover-horizon',sections:[['把目的地换成一处风景','暂时放下主线目标，挑选地图上一处没到过的地方。沿途观察地形，给自己留一段不赶时间的探索。'],['经过营地时停一下','整理装备、看任务描述、了解世界信息，也是一段游玩的组成部分。不必每次都用完成多少任务衡量收获。'],['下次从一个明确地点继续','结束前选一个便于继续探索的位置。下一次打开游戏，就知道自己接下来想去哪里。']]},
    'theme-challenge': {id:'theme-challenge',game:'wukong',category:'今晚怎么玩',title:'就挑战这一招，读懂对手的节奏',deck:'把一次战斗拆成观察、躲避和出手三个小目标。',image:'scene-wukong',sections:[['这一轮先看动作','先观察对手抬手、连招和收招的差别。不急着把全部输出打完，先看清什么时候真正安全。'],['给自己一个能判断的目标','这一轮只练一次躲避，或只尝试一个反击时机。目标具体，才更容易知道下一次应该改什么。'],['卡住时也可以去探索','如果连续尝试开始疲惫，先去另一条岔路看看。探索获得的新信息，有时能让下一次挑战更有方向。']]},
    'community-night': {id:'community-night',game:'cyber',category:'社区精选',title:'把夜之城的这一段路，留给今天',deck:'不接新任务，只沿着街道走一走，看看熟悉世界里的另一面。',image:'scene-cyber',sections:[['把视角放低一点','除了任务标记，路口、招牌和街边的声音也组成了夜之城。选一条路线慢慢走，观察自己过去没有留意的细节。'],['重新认识熟悉的游戏','重复打开同一款游戏，不一定总是为了推进进度。换一种观察方式，也可能找到新的游玩乐趣。'],['今天你会停在哪个路口','可以把下一次探索的起点留在一个自己喜欢的位置，再决定继续任务还是看看别处。']]},
    'community-doors': {id:'community-doors',game:'hades',category:'社区精选',title:'选祝福还是选金币？聊聊过门前的犹豫',deck:'同一场逃脱，状态不同，选择也会不同。',image:'scene-hades',sections:[['先看自己缺什么','当前生命、已有祝福和手头金币，都会影响下一扇门的选择。先看眼前状态，再判断奖励能补上什么。'],['留一点试错空间','有时会想试一个新祝福，有时更想稳稳走到下一层。两种选择都有各自的游玩目标。'],['把选择说具体','讨论时带上当前武器、状态和已有祝福，比只问哪扇门更好更容易获得有用的建议。']]},
    'community-break': {id:'community-break',game:'elden',category:'社区精选',title:'下次打开时，你还记得自己要去哪里吗？',deck:'一个地图标记，给下一次探索留下起点。',image:'scene-elden',sections:[['结束前做一个小整理','回顾刚刚探索到的位置，标记一处下一次想去的地方。不需要长篇记录，留一个自己能看懂的线索就够了。'],['重返游戏先看地图','先确认身处哪里、周围有哪些已到达的赐福。找回探索方向之后，再决定这次要玩多久。'],['进度之外，也留住兴趣','有时值得记录的并非任务，而是一条想走的路或一个想再挑战的对手。']]}
  };

  function home(direction,ctx){
    const {state,MEDIA,GAMES,esc,image,action,section,gameGrid,compatible,retention:R}=ctx;
    const focus=state.focusGame==='elden'?'elden':'hades';
    const scene=id=>MEDIA['scene-'+id]?'scene-'+id:'cover-'+id;
    const articleCard=(id,{large=false}={})=>{const a=articles[id];return `<button class="concept-article ${large?'concept-article-large':''}" data-action="article" data-article="${id}"><div class="concept-article-image">${image(a.image,'')}<span>${a.category}</span></div><div class="concept-article-copy"><h3>${a.title}</h3><p>${a.deck}</p></div></button>`;};
    const articleRows=ids=>`<div class="concept-article-rows">${ids.map(id=>{const a=articles[id];return `<button data-action="article" data-article="${id}" class="concept-article-row">${image(a.image,'')}<div><small>${a.category}</small><h3>${a.title}</h3></div><span aria-hidden="true">›</span></button>`;}).join('')}</div>`;
    const compat=id=>compatible(id)?`<span class="compat-mark" role="img" aria-label="完美兼容">${image('compatibility','')}</span>`:'';
    const dailyBase=()=>R.calendar({compact:true})+R.discounts({compact:true})+R.giveaways({compact:true})+R.tasks()+R.business({kind:'all'});
    const devices=()=>state.route==='cloud'?`<button class="concept-path-link" data-action="cloud-info" data-game="${focus}"><span>想换到云端玩？</span><b>看看游玩条件 ›</b></button>`:state.source==='none'?`<button class="concept-path-link" data-action="help"><span>已经有自己的 PC 游戏？</span><b>添加到游戏库 ›</b></button>`:'';
    const ownRoute=state.source==='none'?'先了解这款游戏':state.source==='steam'?'查看我的 Steam 游戏':'查看我的导入游戏';
    function localModule(){
      if(state.capability==='local'&&state.match==='matched')return section('本机可玩',gameGrid(['hades','elden'],{compact:true}),'local-list');
      return section('先看看适配情况',`<button class="concept-path-link" data-action="adapt-list"><span>${state.match==='unknown'?'识别设备后再确认本机适配':state.match==='empty'?'暂未找到匹配记录':'查看当前设备的运行条件'}</span><b>查看适配记录 ›</b></button>`);
    }
    function ownHome(){
      const hades=focus==='hades';
      const ids=hades?['hades-touch','weapon-bow']:['elden-guard','elden-controls'];
      const featured=hades?'weapon-shield':'elden-explore';
      const gameFocus=`<section class="concept-focus"><div class="concept-focus-heading"><h2>${state.source==='none'?'从一款游戏开始':'这款游戏，试试这样玩'}</h2>${action('›','library','aria-label="查看游戏库"','heading-link')}</div><div class="concept-focus-games">${['hades','elden'].map(id=>`<button class="${id===focus?'is-selected':''}" data-action="focus-game" data-game="${id}" aria-pressed="${id===focus}">${image('cover-'+id,'')}<span>${GAMES[id].name}</span></button>`).join('')}</div></section>`;
      const focused=`<div class="concept-focus-world">${image(scene(focus),'')}<div class="concept-focus-shade"></div><div class="concept-focus-copy"><small>${GAMES[focus].name}</small><h2>${hades?'这次，试试盾牌开局。':'今天，先去岔路走走。'}</h2><p>${hades?'挡住正面的攻击，再蓄力冲出包围。':'暂时放下主线，给宁姆格福留一段探索。'}</p>${action(hades?'看看这一局怎么打':'看看这条探索思路','article',`data-article="${featured}"`,'concept-feature-cta')}</div></div>`;
      const utility=`<div class="concept-tool-pair"><button data-action="conditions" data-game="${focus}"><span class="concept-tool-icon">◎</span><div><b>适配与运行条件</b><small>设备、版本与已知问题</small></div><span>›</span></button><button data-action="article" data-article="${hades?'hades-touch':'elden-controls'}"><span class="concept-tool-icon">⌘</span><div><b>${hades?'冲刺与攻击的衔接':'移动与视角的配合'}</b><small>触屏与手柄操作经验</small></div><span>›</span></button></div>`;
      return `<div class="concept-home concept-own" data-module="owned-experience">${R.continueStrip()}${gameFocus}${focused}${section(hades?'换一种操作，换一种打法':'打不过时，也有别的目标',`<div class="concept-two-stories">${ids.map(id=>articleCard(id)).join('')}</div>`)}${section('玩起来更顺手',utility)}${section('社区精选',communityBlock())}<button class="concept-library-link" data-action="${state.source==='none'?'game':'library'}" data-game="${focus}" data-route="${state.route}">${image('cover-'+focus,'')}<div><b>${GAMES[focus].name}</b><span>${ownRoute}</span></div><span aria-hidden="true">›</span></button>${localModule()}${devices()}${dailyBase()}</div>`;
    }
    function discovery(){
      const clip=MEDIA['clip-hades'];
      const video=`<section class="concept-play-film"><div class="concept-video">${clip?`<video controls playsinline preload="none" poster="${MEDIA['poster-hades']||MEDIA['scene-hades']}" aria-label="哈迪斯玩法片段"><source src="${clip}" type="video/mp4"></video>`:image('scene-hades','哈迪斯玩法画面')}</div><div class="concept-film-copy"><small>哈迪斯 · 动作肉鸽</small><h2>下一扇门，会遇到什么？</h2><p>冲刺、出手、选择祝福。每一局，换一种逃脱的打法。</p>${action('想玩这款','game',`data-game="hades" data-route="${state.route}"`,'concept-feature-cta')}</div></section>`;
      const themes=`<div class="concept-theme-list">${[['theme-roam','horizon','想慢慢逛一个世界','探索 · 风景 · 不赶进度'],['theme-challenge','wukong','想认真打一场','观察 · 躲避 · 找到破绽']].map(([id,g,t,d])=>`<button class="concept-theme" data-action="article" data-article="${id}">${image(scene(g),'')}<div><small>${d}</small><h3>${t}</h3><span>看看怎么玩 ›</span></div></button>`).join('')}</div>`;
      const adapt=`<div class="concept-adapt-cards">${['elden','hades'].map(id=>`<button data-action="conditions" data-game="${id}"><div>${image(scene(id),'')}${compat(id)}</div><h3>${GAMES[id].name}</h3><p>${id==='elden'?'探索与小屏操作':'战斗与按键衔接'} <span>›</span></p></button>`).join('')}</div>`;
      return `<div class="concept-home concept-discover" data-module="play-discovery">${R.continueStrip()}${video}${localModule()}${section('今天，想怎么玩？',themes)}${section('适配与操作体验',adapt,'adapt-list')}${section('先看懂一局，再决定',articleRows(['hades-loop','elden-explore']))}${section('社区精选',communityBlock())}${devices()}${R.calendar({compact:true})}${R.discounts({compact:true})}${R.giveaways({compact:true})}${R.tasks()}${R.business({kind:'all'})}</div>`;
    }
    function communityBlock(){
      const pages={
        value:[['hades-touch','elden-controls','theme-challenge'],['weapon-bow','community-night','theme-roam']],
        play:[['community-night','theme-challenge','community-doors'],['theme-roam','elden-guard','hades-touch']],
        content:[['community-night','community-doors','community-break'],['theme-challenge','theme-roam','elden-controls']]
      }[direction]||[];
      const selected=Math.max(0,Math.min(pages.length-1,Number(state.communityPage)||0));
      return `<div class="community-module" data-module="community-picks"><div class="community-carousel" aria-label="社区精选，每页三条内容" tabindex="0">${pages.map((ids,index)=>`<div class="community-page" data-community-page="${index}" id="community-${direction}-page-${index}" role="group" aria-label="第 ${index+1} 页，共 ${pages.length} 页">${ids.map(id=>{const a=articles[id];return `<button class="community-list-item" data-action="article" data-article="${id}"><div class="community-item-copy"><h3>${esc(a.title)}</h3><p>${esc(a.category)}<span>·</span>${esc(GAMES[a.game].name)}</p></div>${image(a.image,'')}</button>`;}).join('')}</div>`).join('')}</div><div class="community-dots" aria-label="社区精选分页">${pages.map((ids,index)=>`<button type="button" data-action="community-page" data-index="${index}" class="${selected===index?'is-selected':''}" aria-label="查看社区精选第 ${index+1} 页" aria-controls="community-${direction}-page-${index}" aria-pressed="${selected===index}"><span></span></button>`).join('')}</div></div>`;
    }
    function daily(){
      return `<div class="concept-home concept-daily" data-module="daily-brief">${R.continueStrip()}${section('社区精选',communityBlock())}${R.calendar({compact:false})}${R.discounts({compact:false})}${R.giveaways({compact:false})}${R.tasks()}${localModule()}${R.business({kind:'all'})}</div>`;
    }
    return ({value:ownHome,play:discovery,content:daily}[direction]||discovery)();
  }
  window.LAB_CONTENT={articles,home};
})();
