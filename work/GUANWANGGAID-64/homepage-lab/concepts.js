(() => {
  'use strict';
  // Independent operating banners; campaign selection never overwrites game eligibility.
  const operations={banners:[
    {id:'giveaways',image:'promo-sorry',title:'盖世喜加一',subtitle:'Epic · Steam · GOG',action:'ret-giveaways'},
    {id:'calendar',image:'release-archeage',title:'游戏日历',subtitle:'每日发售提醒',action:'ret-calendar'}
  ]};
  const articles = {
    'community-night': {id:'community-night',game:'cyber',category:'社区精选',title:'把夜之城的这一段路，留给今天',deck:'不接新任务，只沿着街道走一走，看看熟悉世界里的另一面。',image:'scene-cyber',sections:[['把视角放低一点','除了任务标记，路口、招牌和街边的声音也组成了夜之城。选一条路线慢慢走，观察自己过去没有留意的细节。'],['重新认识熟悉的游戏','重复打开同一款游戏，不一定总是为了推进进度。换一种观察方式，也可能找到新的游玩乐趣。'],['今天你会停在哪个路口','可以把下一次探索的起点留在一个自己喜欢的位置，再决定继续任务还是看看别处。']]},
    'community-doors': {id:'community-doors',game:'hades',category:'社区精选',title:'选祝福还是选金币？聊聊过门前的犹豫',deck:'同一场逃脱，状态不同，选择也会不同。',image:'scene-hades',sections:[['先看自己缺什么','当前生命、已有祝福和手头金币，都会影响下一扇门的选择。先看眼前状态，再判断奖励能补上什么。'],['留一点试错空间','有时会想试一个新祝福，有时更想稳稳走到下一层。两种选择都有各自的游玩目标。'],['把选择说具体','讨论时带上当前武器、状态和已有祝福，比只问哪扇门更好更容易获得有用的建议。']]},
    'community-break': {id:'community-break',game:'elden',category:'社区精选',title:'下次打开时，你还记得自己要去哪里吗？',deck:'一个地图标记，给下一次探索留下起点。',image:'scene-elden',sections:[['结束前做一个小整理','回顾刚刚探索到的位置，标记一处下一次想去的地方。不需要长篇记录，留一个自己能看懂的线索就够了。'],['重返游戏先看地图','先确认身处哪里、周围有哪些已到达的赐福。找回探索方向之后，再决定这次要玩多久。'],['进度之外，也留住兴趣','有时值得记录的并非任务，而是一条想走的路或一个想再挑战的对手。']]}
  };

  function home(direction,ctx){
    const {state,MEDIA,GAMES,ARTICLES,esc,image,action,section,gameGrid,compatible,localReady,retention:R,purchase:P,conversion:C}=ctx;
    const communityArticles={...articles,...ARTICLES};
    const compat=id=>compatible(id)?`<span class="compat-mark" role="img" aria-label="完美兼容">${image('compatibility','')}</span>`:'';

    function localModule(){
      if(state.capability==='local'&&state.match==='matched')return section('本机可玩',gameGrid(['hades','elden'],{compact:true}),'local-list');
      return section('本机适配',`<button class="concept-path-link" data-action="adapt-list"><span>${state.match==='unknown'?'识别设备后，再查看对应的适配记录':state.match==='empty'?'暂未找到当前设备的匹配记录':'先核对设备与运行条件'}</span><b>查看适配记录 ›</b></button>`);
    }

    function communityBlock(){
      const pages=[['community-night','community-doors','community-break'],['nightcity','routine','controls']];
      const selected=Math.max(0,Math.min(pages.length-1,Number(state.communityPage)||0));
      return `<div class="community-module" data-module="community-picks"><div class="community-carousel" aria-label="社区精选，每页三条内容" tabindex="0">${pages.map((ids,index)=>`<div class="community-page" data-community-page="${index}" id="community-${direction}-page-${index}" role="group" aria-label="第 ${index+1} 页，共 ${pages.length} 页">${ids.map(id=>{const a=communityArticles[id];return `<button class="community-list-item" data-action="article" data-article="${id}"><div class="community-item-copy"><h3>${esc(a.title)}</h3><p>${esc(a.category)}<span>·</span>${esc(GAMES[a.game].name)}</p></div>${image(a.image,'')}</button>`;}).join('')}</div>`).join('')}</div><div class="community-dots" aria-label="社区精选分页">${pages.map((ids,index)=>`<button type="button" data-action="community-page" data-index="${index}" class="${selected===index?'is-selected':''}" aria-label="查看社区精选第 ${index+1} 页" aria-controls="community-${direction}-page-${index}" aria-pressed="${selected===index}"><span></span></button>`).join('')}</div></div>`;
    }
    const community=()=>section('社区精选',communityBlock());
    function operationsBanner(){
      const items=operations.banners.filter(item=>item&&MEDIA[item.image]&&['ret-calendar','ret-giveaways','purchase-rental'].includes(item.action));
      if(!items.length)return '';
      const selected=Math.max(0,Math.min(items.length-1,Number(state.operationsIndex)||0)),item=items[selected];
      return `<section class="operations-slot" data-ops-slot="home-banner" aria-label="首页运营轮播"><button type="button" class="concept-operations-banner" data-content-source="operations" data-banner-id="${esc(item.id)}" data-action="${item.action}" aria-label="${esc(item.title)}">${image(item.image,'')}<span class="concept-operations-copy"><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></span></button><div class="operations-dots" aria-label="运营轮播分页">${items.map((item,index)=>`<button type="button" data-action="operations-page" data-index="${index}" aria-label="${esc(item.title)}" aria-pressed="${index===selected}" class="${index===selected?'is-selected':''}"><span></span></button>`).join('')}</div></section>`;
    }

    function conversion(){
      const cloudFirst=state.capability==='weak';
      return `<div class="concept-home concept-conversion" data-module="paid-conversion">${operationsBanner()}${R.continueStrip()}${P.shortcuts()}${cloudFirst?C.cloud():''}${C.membership()}${cloudFirst?'':C.cloud()}${P.budget()}${P.following()}${R.giveaways({compact:true})}${community()}${R.calendar({compact:true})}${R.tasks()}${localModule()}${R.business({kind:'all'})}</div>`;
    }

    function playableHero(){
      const id='hades',cloud=state.route==='cloud';
      const matched=compatible(id),ready=localReady(id);
      let label='准备游戏',status='适配已匹配 · 尚需准备游戏';
      if(cloud){label='查看云游戏';status='云端供给与网络待确认';}
      else if(!matched){label='核对适配';status=state.match==='unknown'?'设备未识别':state.capability==='weak'?'本机运行条件待核对':'暂无匹配记录';}
      else if(ready){const returning=Array.isArray(state.recentPlayed)&&state.recentPlayed.includes(id);label=returning?'继续游玩':'开始游玩';status='适配已匹配 · 游戏已准备';}
      return `<section class="concept-playable-hero" data-content-source="device-match" data-module="compatible-feature" data-game-state="${cloud?'cloud':ready?'ready':matched?'preparation':'unknown'}">${image('scene-hades','哈迪斯游戏画面')}<div class="concept-playable-shade"></div><div class="concept-playable-copy"><small>动作 · 肉鸽</small><h2>${GAMES[id].name}</h2><div class="concept-playable-status">${matched&&!cloud?'<i aria-hidden="true"></i>':''}<span>${status}</span></div>${action(label,'game',`data-game="${id}" data-route="${cloud?'cloud':'local'}"`,'concept-feature-cta')}</div>${matched&&!cloud?compat(id):''}</section>`;
    }

    function adaptationRecords(){
      const ids=['hades','elden'].filter(id=>compatible(id));
      const list=ids.length?`<div class="concept-adaptation-list">${ids.map(id=>`<button type="button" data-action="conditions" data-game="${id}">${image('cover-'+id,'')}<div><h3>${GAMES[id].name}</h3><p>适配已匹配 · 查看运行条件</p></div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="concept-adaptation-empty"><h3>${state.match==='unknown'?'先识别当前设备':'暂无匹配的适配记录'}</h3><p>有对应记录后，再确认本机运行条件。</p>${action('打开兼容性查询','local-list','','concept-text-action')}</div>`;
      return section('适配记录',list,'adapt-list');
    }

    function gameplay(){
      const clip=MEDIA['clip-hades'];
      const media=clip?`<video controls playsinline preload="none" poster="${MEDIA['poster-hades']||MEDIA['scene-hades']}" aria-label="哈迪斯官方玩法片段"><source src="${clip}" type="video/mp4"></video>`:image('scene-hades','哈迪斯游戏画面');
      return section('玩法视频',`<div class="concept-play-film"><div class="concept-video">${media}</div><div class="concept-film-copy"><small>官方玩法片段</small><h3>哈迪斯</h3>${action('查看游戏','game',`data-game="hades" data-route="${state.route}"`,'concept-feature-cta')}</div></div>`);
    }

    function discovery(){
      return `<div class="concept-home concept-discover" data-module="play-discovery">${operationsBanner()}${R.continueStrip()}${P.shortcuts()}${playableHero()}${localModule()}${adaptationRecords()}${gameplay()}${community()}${R.calendar({compact:true})}${R.discounts({compact:true})}${R.giveaways({compact:true})}${R.tasks()}${R.business({kind:'all'})}</div>`;
    }

    function daily(){
      return `<div class="concept-home concept-daily" data-module="daily-brief">${operationsBanner()}${R.continueStrip()}${P.shortcuts()}${community()}${R.calendar({compact:false})}${R.discounts({compact:false})}${R.giveaways({compact:false})}${R.tasks()}${localModule()}${R.business({kind:'all'})}</div>`;
    }
    return ({value:conversion,play:discovery,content:daily}[direction]||discovery)();
  }
  window.LAB_CONTENT={articles,home,operations};
})();



