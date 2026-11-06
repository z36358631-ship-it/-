(() => {
  'use strict';
  // Independent operating banners; campaign selection never overwrites game eligibility.
  const operations={banners:[
    {id:'giveaways',image:'promo-sorry',title:'盖世喜加一',subtitle:'Epic · Steam',action:'ret-giveaways'},
    {id:'calendar',image:'release-archeage',title:'游戏日历',subtitle:'订阅心仪游戏的发售提醒',action:'ret-calendar'}
  ],
    homeOrder:['collections','calendar','latest','community','tasks','business'],
    collections:[{id:'local-action',title:'动作与冒险',subtitle:'动作 · 角色扮演 · 开放世界',eyebrow:'游戏合集',caption:'本机兼容精选',games:['hades','elden','cyber','wukong','village','horizon']}],
    latestGames:['hades','elden','cyber'],
    taskIds:['checkin','play','community'],
    communityPages:[['community-night','community-doors','community-break'],['nightcity','routine','controls']],
    shortcuts:[
      {id:'compatibility',name:'兼容性查询',action:'compatibility',icon:'device'},
      {id:'giveaways',name:'喜加一',action:'ret-giveaways',icon:'gift'},
      {id:'calendar',name:'游戏日历',action:'ret-calendar',icon:'calendar'},
      {id:'forum',name:'盖世讨论区',action:'gamehub-forum',icon:'forum'}
    ]
  };
  const articles = {
    'community-night': {id:'community-night',game:'cyber',category:'社区精选',title:'把夜之城的这一段路，留给今天',deck:'不接新任务，只沿着街道走一走，看看熟悉世界里的另一面。',image:'scene-cyber',sections:[['把视角放低一点','除了任务标记，路口、招牌和街边的声音也组成了夜之城。选一条路线慢慢走，观察自己过去没有留意的细节。'],['重新认识熟悉的游戏','重复打开同一款游戏，不一定总是为了推进进度。换一种观察方式，也可能找到新的游玩乐趣。'],['今天你会停在哪个路口','可以把下一次探索的起点留在一个自己喜欢的位置，再决定继续任务还是看看别处。']]},
    'community-doors': {id:'community-doors',game:'hades',category:'社区精选',title:'选祝福还是选金币？聊聊过门前的犹豫',deck:'同一场逃脱，状态不同，选择也会不同。',image:'scene-hades',sections:[['先看自己缺什么','当前生命、已有祝福和手头金币，都会影响下一扇门的选择。先看眼前状态，再判断奖励能补上什么。'],['留一点试错空间','有时会想试一个新祝福，有时更想稳稳走到下一层。两种选择都有各自的游玩目标。'],['把选择说具体','讨论时带上当前武器、状态和已有祝福，比只问哪扇门更好更容易获得有用的建议。']]},
    'community-break': {id:'community-break',game:'elden',category:'社区精选',title:'下次打开时，你还记得自己要去哪里吗？',deck:'一个地图标记，给下一次探索留下起点。',image:'scene-elden',sections:[['结束前做一个小整理','回顾刚刚探索到的位置，标记一处下一次想去的地方。不需要长篇记录，留一个自己能看懂的线索就够了。'],['重返游戏先看地图','先确认身处哪里、周围有哪些已到达的赐福。找回探索方向之后，再决定这次要玩多久。'],['进度之外，也留住兴趣','有时值得记录的并非任务，而是一条想走的路或一个想再挑战的对手。']]}
  };

  // 2026.11.6修改：排行榜顺序为离线接口样例，运营不能手选改变本机兼容事实。
  const RANK_HEAT={hades:60,elden:50,cyber:40,wukong:30,village:20,horizon:10};
  function home(direction,ctx){
    const {state,MEDIA,GAMES,ARTICLES,esc,image,action,section,gameGrid,compatible,localReady,retention:R,purchase:P,conversion:C}=ctx;
    const communityArticles={...articles,...ARTICLES};
    const compat=id=>compatible(id)?`<span class="compat-mark" role="img" aria-label="完美兼容">${image('compatibility','')}</span>`:'';

    function localModule(){
      if(!ctx.features.compatibleCatalog)return '';
      const collections=(operations.collections||[]).filter(item=>item&&item.title);
      if(!collections.length)return '';
      const cards=collections.map(item=>{
        const candidates=Array.isArray(state.deviceCompatibility)?state.deviceCompatibility:ctx.compatibleGames;
        const heat=state.rankingHeat||RANK_HEAT;
        const ids=[...new Set(candidates)].filter(id=>GAMES[id]&&MEDIA['cover-'+id]&&compatible(id)).sort((a,b)=>(heat[b]||0)-(heat[a]||0)||a.localeCompare(b)).slice(0,6);
        if(!ids.length)return '';
        const split=Math.ceil(ids.length/2);
        return `<article class="local-collection" data-collection="${esc(item.id)}"><button type="button" class="local-collection-card" data-content-source="device-compatibility-ranked" data-action="compatibility" aria-label="查看${esc(item.title)}"><div class="local-collection-covers">${[ids.slice(0,split),ids.slice(split)].filter(row=>row.length).map(row=>`<span class="local-collection-icon-row">${row.map(id=>`<span class="local-collection-game" data-collection-game="${id}">${image('cover-'+id,GAMES[id].name)}${compat(id)}</span>`).join('')}</span>`).join('')}</div><span class="local-collection-title"><small>${esc(item.eyebrow||'游戏合集')}</small><b>${esc(item.caption||item.title)}</b></span></button></article>`;
      }).filter(Boolean);
      if(!cards.length&&!ctx.features.compatQuery)return '';
      if(!cards.length)return section('本机可玩',`<button type="button" class="concept-path-link" data-action="compatibility"><span>${state.match==='unknown'?'尚未识别当前设备':'暂无当前设备的兼容游戏'}</span><b>兼容性查询 ›</b></button>`,'compatibility');
      return `<section class="app-section" data-module="local-collections" aria-label="本机可玩"><div class="local-collection-list">${cards.join('')}</div></section>`;
    }

    function shortcuts(){
      const icons={
        device:'<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 18.5h4M10 5.5h4"/>',
        gift:'<path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15"/><path d="M12 6C5 6 6 0 9 2c2 1 3 4 3 4Zm0 0c7 0 6-6 3-4-2 1-3 4-3 4Z"/>',
        task:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 11l2 2 5-5M9 17h6"/>',
        calendar:'<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M7.5 3v4m9-4v4M3.5 10h17M8 14h2m4 0h2M8 17h2"/>',
        forum:'<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9l-6 3V6a2 2 0 0 1 1-2Z"/><path d="M8 9h9M8 13h6"/>'
      };
      const items=(operations.shortcuts||[]).filter(item=>item&&(item.action!=='compatibility'||ctx.features.compatQuery)).filter(item=>item&&icons[item.icon]&&['compatibility','ret-giveaways','ret-calendar','gamehub-forum','article','game'].includes(item.action));
      if(!items.length)return '';
      return `<nav class="home-shortcuts" data-module="shortcuts" aria-label="首页功能入口">${items.map(item=>`<button type="button" data-action="${item.action}" data-shortcut="${esc(item.id)}"${item.article?` data-article="${esc(item.article)}"`:''}${item.game?` data-game="${esc(item.game)}"`:''}><span class="home-shortcut-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[item.icon]}</svg></span><b>${esc(item.name)}</b></button>`).join('')}</nav>`;
    }

    function communityBlock(){
      const now=Date.parse(state.demoNow);
      const schedule=operations.communitySchedule||[];
      const configured=schedule.length?schedule.filter(item=>(!item.start||Date.parse(item.start)<=now)&&(!item.end||Date.parse(item.end)>now)).sort((a,b)=>(a.order||0)-(b.order||0)).map(item=>item.id):(operations.communityPages||[]).flat();
      const ids=[...new Set(configured)].filter(id=>communityArticles[id]).slice(0,6);
      const pages=[];for(let i=0;i<ids.length;i+=3)pages.push(ids.slice(i,i+3));
      if(!pages.length)return '';
      const selected=Math.max(0,Math.min(pages.length-1,Number(state.communityPage)||0));
      return `<div class="community-module" data-module="community-picks"><div class="community-carousel" aria-label="社区精选，每页三条内容" tabindex="0">${pages.map((ids,index)=>`<div class="community-page" data-community-page="${index}" id="community-${direction}-page-${index}" role="group" aria-label="第 ${index+1} 页，共 ${pages.length} 页">${ids.map(id=>{const a=communityArticles[id];return `<button class="community-list-item${a.image?'':' is-text-only'}" data-action="article" data-article="${id}"><div class="community-item-copy"><h3>${esc(a.title)}</h3><p>${esc(a.category)}<span>·</span>${esc(GAMES[a.game].name)}</p></div>${a.image?image(a.image,''):''}</button>`;}).join('')}</div>`).join('')}</div><div class="community-dots" aria-label="社区精选分页">${pages.map((ids,index)=>`<button type="button" data-action="community-page" data-index="${index}" class="${selected===index?'is-selected':''}" aria-label="查看社区精选第 ${index+1} 页" aria-controls="community-${direction}-page-${index}" aria-pressed="${selected===index}"><span></span></button>`).join('')}</div></div>`;
    }
    const community=()=>{const body=communityBlock();return body?section('社区精选',body):'';};
    function operationsBanner(){
      if(state.showBanner===false)return '';
      const items=operations.banners.filter(item=>item&&MEDIA[item.image]&&['ret-calendar','ret-giveaways'].includes(item.action));
      if(!items.length)return '';
      const selected=Math.max(0,Math.min(items.length-1,Number(state.operationsIndex)||0)),item=items[selected];
      return `<section class="operations-slot" data-ops-slot="home-banner" aria-label="首页运营轮播"><span class="operations-label">运营 Banner</span><button type="button" class="concept-operations-banner" data-content-source="operations" data-banner-id="${esc(item.id)}" data-action="${item.action}" aria-label="${esc(item.title)}">${image(item.image,'')}<span class="concept-operations-copy"><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></span></button><div class="operations-dots" aria-label="运营轮播分页">${items.map((item,index)=>`<button type="button" data-action="operations-page" data-index="${index}" aria-label="${esc(item.title)}" aria-pressed="${index===selected}" class="${index===selected?'is-selected':''}"><span></span></button>`).join('')}</div></section>`;
    }

    function conversion(){
      const cloudFirst=state.capability==='weak';
      return `<div class="concept-home concept-conversion" data-module="paid-conversion">${operationsBanner()}${P.shortcuts()}${cloudFirst?C.cloud():''}${C.membership()}${cloudFirst?'':C.cloud()}${P.budget()}${P.following()}${R.giveaways({compact:true})}${community()}${R.calendar({compact:true})}${R.tasks()}${localModule()}${R.business({kind:'all'})}</div>`;
    }

    function adaptationRecords(){
      if(!ctx.features.latestCompatibility)return '';
      const ids=(operations.latestGames||[]).filter(id=>GAMES[id]&&MEDIA['cover-'+id]);
      if(!ids.length)return '';
      return `<section class="app-section" data-module="latest-compatibility">${ctx.heading('盖世最新兼容','latest-compatibility')}<div class="latest-compatibility-rail">${ids.map(id=>`<button type="button" data-action="game" data-game="${id}" data-route="local">${image('cover-'+id,GAMES[id].name)}<b>${esc(GAMES[id].name)}</b></button>`).join('')}</div></section>`;
    }

    function discovery(){
      const banner=operationsBanner(),quick=shortcuts();
      const top=state.form==='landscape'&&banner?`<div class="home-feature-row" data-module="feature-row">${banner}${quick}</div>`:`${banner}${quick}`;
      const modules={collections:localModule,calendar:()=>R.calendar({compact:true}),latest:adaptationRecords,community,tasks:()=>R.tasks(),business:()=>R.business({kind:'all'})};
      const order=[...new Set(operations.homeOrder||[])].filter(id=>modules[id]);
      return `<div class="concept-home concept-discover" data-module="play-discovery">${top}${order.map(id=>modules[id]()).join('')}</div>`;
    }

    function daily(){
      return `<div class="concept-home concept-daily" data-module="daily-brief">${operationsBanner()}${P.shortcuts()}${community()}${R.calendar({compact:false})}${R.discounts({compact:false})}${R.giveaways({compact:false})}${R.tasks()}${localModule()}${R.business({kind:'all'})}</div>`;
    }
    return ({value:conversion,play:discovery,content:daily}[direction]||discovery)();
  }
  window.LAB_CONTENT={articles,home,operations};
})();




