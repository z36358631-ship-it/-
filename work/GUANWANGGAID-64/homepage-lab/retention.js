(() => {
  'use strict';

  // These records retain the original review snapshot; they are not a live feed.
  const PLATFORMS = {epic:'Epic',steam:'Steam',gog:'GOG'};
  const GIVEAWAYS = [
    {id:'sorry',key:'promo-sorry',name:'对不起，我们关门了',platform:'epic',original:78,end:'2026-11-05T16:00:00Z',url:'https://store.epicgames.com/zh-CN/p/sorry-were-closed-724c86'},
    {id:'asleep',key:'promo-asleep',name:'Asleep: Act 1',platform:'steam',original:42,end:'2026-11-02T18:00:00Z',url:'https://store.steampowered.com/app/1583850/Asleep_Act_1/'},
  ];
  const DISCOUNTS = [
    {id:'raft',key:'promo-raft',name:'Raft',original:77,price:51.59,discount:33,end:null,url:'https://store.steampowered.com/app/648800/Raft/'},
    {id:'repo',key:'promo-repo',name:'R.E.P.O.',original:35,price:22.75,discount:35,end:null,url:'https://store.steampowered.com/app/3241660/REPO/'}
  ];
  const RELEASES = [
    {id:'fleming',key:'release-fleming',name:'弗莱明庄园命案',date:'2026-11-03',tags:'冒险 · 独立',url:'https://store.steampowered.com/app/3758950/'},
    {id:'figure',key:'release-figure',name:'Figure Me Out',date:'2026-11-03',tags:'动作 · 休闲',url:'https://store.steampowered.com/app/5313470/'},
    {id:'dailygold',key:'release-dailygold',name:'日进斗金',date:'2026-11-03',tags:'休闲 · 独立',url:'https://store.steampowered.com/app/3684530/'},
    {id:'archeage',key:'release-archeage',name:'上古世纪编年史',date:'2026-11-04',tags:'动作 · 冒险',url:'https://store.steampowered.com/app/3218230/'},
    {id:'floatopia',key:'release-floatopia',name:'乐浮岛',date:'2026-11-04',tags:'冒险 · 休闲',url:'https://store.steampowered.com/app/2320980/'}
  ];
  const BUSINESS = [
    {id:'phantom',key:'cover-phantom',name:'影之刃零',kind:'instant',description:'在刀光剑影间，感受武侠动作世界。'},
    {id:'horizon',key:'cover-horizon',name:'地平线：零之曙光',kind:'instant',description:'与埃洛伊一起，探索机械与自然交织的世界。'},
    {id:'battle',key:'cover-battle',name:'Battletoads',kind:'team',description:'横版动作冒险，和伙伴一起迎接下一场战斗。'},
    {id:'catquest',key:'cover-catquest',name:'猫咪斗恶龙 2',kind:'team',description:'一猫一狗结伴出发，走进菲灵洛的奇幻冒险。'}
  ];
  // 2026.11.6修改：移除社区评论任务，保留既有任务口径。
  const TASKS = [
    {id:'checkin',name:'签到',description:'每日签到',page:null},
    {id:'play',name:'畅玩游戏',description:'前往游戏库选择游戏',page:'library'},
    {id:'community',name:'社区互动',description:'看看喜欢的帖子',page:'community'},
    {id:'share',name:'分享帖子',description:'发现值得分享的内容',page:'community'},
    {id:'ad',name:'观看广告',description:'查看任务参与条件',page:null}
  ];

  function create(ctx) {
    const {state,esc,image,action,heading,section} = ctx;
    state.retPlatform ||= 'epic';
    // 2026.11.6修改：整栏目订阅；平台Tab仅筛选展示。
    state.giveawaySubscribed ??= false;
    state.retReleaseSubscribed ??= false;
    state.retSigned ??= false;
    state.retTaskTab ||= 'daily';
    state.retTask ||= 'checkin';
    state.retSelectedRelease ||= '';
    state.retSelectedDiscount ||= '';
    state.retBusiness ||= 'phantom';
    const parsedNow=Date.parse(state.demoNow||'2026-11-02T10:00:00+08:00');
    const now=Number.isFinite(parsedNow)?parsedNow:Date.parse('2026-11-02T10:00:00+08:00');
    const isActive=item=>item.end===null||Date.parse(item.end)>now;
    const money=value=>'¥'+Number(value).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
    const dateText=date=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(date)).replaceAll('/','.');
    const todayText=()=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit'}).format(new Date(state.timelineNow||state.signInNow||Date.now()));
    const remaining=end=>{const minutes=Math.max(0,Math.ceil((Date.parse(end)-now)/60000));const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;return days?`${days}天${hours}小时`:hours?`${hours}小时${mins}分`:`${mins}分钟`;};
    const storeLink=(item,label='官方商店')=>`<a class="ret-store-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true">↗</span></a>`;
    const promoArt=(item,cls='')=>image(item.key,item.name,cls);

    function calendar({compact=false}={}) {
      const entries=compact?RELEASES.slice(0,4):RELEASES;
      return `<section class="app-section ret-calendar" data-module="calendar"><div class="section-heading ret-calendar-heading"><h2>游戏日历</h2><time>${todayText()}</time>${action('›','ret-calendar','aria-label="查看发售日历"','heading-link')}</div><div class="ret-calendar-rail">${entries.map(item=>`<a class="ret-calendar-card" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" data-store-route="steam-native"><span class="ret-calendar-art">${promoArt(item)}<span>${item.date.slice(5).replace('-','/')} 发售</span></span><b>${esc(item.name)}</b></a>`).join('')}</div></section>`;
    }

    function discounts({compact=false}={}) {
      const entries=DISCOUNTS.filter(isActive).slice(0,compact?2:3);
      return `<section class="app-section ret-discounts" data-module="discounts">${heading('Steam 折扣','ret-discounts')}<p class="ret-price-snapshot">11.05 国区价格快照</p><div class="ret-promo-grid ${compact?'ret-promo-compact':''}">${entries.length?entries.map(item=>`<button type="button" class="ret-promo-card" data-action="ret-discounts" data-offer="${item.id}"><span class="ret-promo-art">${promoArt(item)}</span><b>${esc(item.name)}</b><span class="ret-price"><em>-${item.discount}%</em><strong>${money(item.price)}</strong></span></button>`).join(''):'<p class="ret-empty-inline">暂无进行中的折扣</p>'}</div></section>`;
    }

    function giveaways({compact=false}={}) {
      const entries=GIVEAWAYS.filter(isActive).slice(0,compact?2:3);
      return `<section class="app-section ret-giveaways" data-module="giveaways">${heading('盖世喜加一','ret-giveaways')}<div class="ret-promo-grid ${compact?'ret-promo-compact':''}">${entries.length?entries.map(item=>`<button type="button" class="ret-promo-card" data-action="ret-giveaways" data-platform="${item.platform}"><span class="ret-promo-art">${promoArt(item)}<small>${PLATFORMS[item.platform]}</small></span><b>${esc(item.name)}</b><span class="ret-free">免费领取</span></button>`).join(''):'<p class="ret-empty-inline">暂无可领取游戏</p>'}</div></section>`;
    }

    function tasks() {
      if(!(window.LAB_CONTENT.operations.taskIds||[]).length)return '';
      return `<section class="app-section ret-tasks" data-module="tasks">${heading('任务活动','ret-task-center')}<div class="ret-task-buttons">${TASKS.filter(task=>(window.LAB_CONTENT.operations.taskIds||[]).includes(task.id)).map(task=>action(task.name,'ret-task',`data-task="${task.id}"`,'ret-task-button')).join('')}</div></section>`;
    }

    function business({kind='all'}={}) {
      return ['instant','team'].filter(type=>type!=='team'||ctx.features.cloud).filter(type=>kind==='all'||kind===type).map(type=>`<section class="app-section ret-business" data-module="${type}">${heading(type==='instant'?'秒玩上新':'组队云玩')}<div class="ret-business-grid">${BUSINESS.filter(item=>item.kind===type).map(item=>`<article class="ret-business-card"><button type="button" class="ret-business-art" data-action="ret-business" data-business="${item.id}">${promoArt(item)}</button><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><div class="ret-business-actions">${type==='instant'?action('秒玩','ret-business',`data-business="${item.id}"`,'secondary'):action('快速加入','ret-business',`data-business="${item.id}" data-intent="join"`,'secondary')+action('创建房间','ret-business',`data-business="${item.id}" data-intent="create"`,'secondary')}</div></article>`).join('')}</div></section>`).join('');
    }

    function continueStrip() {
      if(state.lifecycle!=='returning'||state.source==='none'||state.preparation!=='ready'||state.capability!=='local'||state.match!=='matched'||state.form!=='portrait'||!Array.isArray(state.recentPlayed)||!state.recentPlayed.length)return '';
      const ids=state.recentPlayed.filter(id=>ctx.GAMES[id]&&ctx.localReady(id));
      if(!ids.length)return '';
      return `<section class="app-section ret-continue" data-module="continue"><div class="section-heading"><h2>继续游玩</h2></div><div class="ret-continue-row">${ids.map(id=>`<button type="button" class="ret-continue-card" data-action="game" data-game="${id}" data-route="local">${image('cover-'+id,ctx.GAMES[id].name)}<span><b>${ctx.GAMES[id].name}</b><small>${state.source==='steam'?'Steam':'本地导入'}</small></span><i aria-hidden="true">›</i></button>`).join('')}</div></section>`;
    }

    function calendarPage() { return window.LAB_TIMELINE.create(ctx).page('ret-calendar'); }

    function discountPage() {
      return `<div class="ret-offer-page"><div class="ret-page-intro"><span>STEAM SPECIALS</span><h2>Steam 折扣</h2><p>国区 · 游戏本体</p></div>${DISCOUNTS.map(item=>`<article class="ret-offer-row ${state.retSelectedDiscount===item.id?'is-selected':''}" data-offer-id="${item.id}">${promoArt(item)}<div><h3>${esc(item.name)}</h3><div class="ret-price"><em>-${item.discount}%</em><strong>${money(item.price)}</strong><del>${money(item.original)}</del></div><small>${isActive(item)?(item.end?dateText(item.end)+' 截止':'11.05 价格快照'):'折扣已结束'}</small>${isActive(item)?storeLink(item,'查看 Steam 商店'):'<span class="ret-ended">已结束</span>'}</div></article>`).join('')}</div>`;
    }

    function giveawayPage() {
      const platform=PLATFORMS[state.retPlatform]?state.retPlatform:'epic';
      const entries=GIVEAWAYS.filter(item=>item.platform===platform),active=entries.filter(isActive),ended=entries.filter(item=>!isActive(item));
      const subscribed=!!state.giveawaySubscribed;
      const offer=item=>`<article class="ret-offer-row ret-giveaway-row ${isActive(item)?'':'is-ended'}">${promoArt(item)}<div><h3>${esc(item.name)}</h3><div class="ret-free-line"><strong>${isActive(item)?'免费领取':'领取已结束'}</strong>${item.original!==null?`<del>${money(item.original)}</del>`:''}</div><small>${dateText(item.end)} 截止</small>${isActive(item)?storeLink(item,'前往领取'):'<span class="ret-ended">已结束</span>'}</div></article>`;
      return `<div class="ret-giveaway-page"><div class="ret-giveaway-intro"><span>FREE TO KEEP</span><h2>盖世喜加一</h2><p>Epic · Steam · GOG</p>${action(subscribed?'已订阅':'订阅提醒','ret-subscribe',`aria-pressed="${subscribed}"`,'primary ret-column-subscribe')}</div><p class="timeline-global-note">有新增可领游戏时提醒 · 站内信 / 系统通知</p><nav class="ret-platform-tabs" aria-label="领取平台">${Object.entries(PLATFORMS).map(([id,name])=>action(`${name}<small>${GIVEAWAYS.filter(item=>item.platform===id&&isActive(item)).length} 款</small>`,'ret-platform',`data-platform="${id}" aria-pressed="${id===platform}"`,id===platform?'is-selected':'')).join('')}</nav><h3 class="ret-list-heading">当前可领 <small>${active.length} 款</small></h3>${active.length?active.map(offer).join(''):'<div class="ret-empty"><h3>暂无当前限免</h3><p>订阅后，有新限免时提醒你。</p></div>'}${ended.length?`<h3 class="ret-list-heading">已结束</h3>${ended.map(offer).join('')}`:''}</div>`;
    }

    function taskCenterPage() {
      const daily=state.retTaskTab!=='growth';
      return `<div class="ret-task-center"><div class="ret-task-center-top"><h2>任务中心</h2><p>签到、畅玩、参与社区</p></div><nav class="ret-task-tabs" aria-label="任务分类">${action('每日任务','ret-task-tab','data-tab="daily" aria-pressed="'+daily+'"',daily?'is-selected':'')}${action('成长任务','ret-task-tab','data-tab="growth" aria-pressed="'+!daily+'"',!daily?'is-selected':'')}</nav>${daily?`<div class="ret-task-list">${TASKS.map((task,index)=>`<article class="ret-task-row"><span class="ret-task-symbol" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><div><h3>${task.name}</h3><p>${task.description}</p></div>${action(task.id==='checkin'&&state.retSigned?'已签到':task.id==='checkin'?'签到':'去完成','ret-task',`data-task="${task.id}" ${task.id==='checkin'&&state.retSigned?'disabled':''}`,'secondary')}</article>`).join('')}</div>`:'<div class="ret-empty"><h3>暂无成长任务</h3></div>'}</div>`;
    }

    function taskPage() {
      const task=TASKS.find(item=>item.id===state.retTask)||TASKS[0];
      if(task.id==='checkin')return `<div class="ret-checkin-page"><div class="ret-checkin-mark" aria-hidden="true">${state.retSigned?'✓':'＋'}</div><h2>${state.retSigned?'今日已签到':'每日签到'}</h2><p>${state.retSigned?'明天再来，看看新内容。':'打开盖世，发现今天的新内容。'}</p>${action(state.retSigned?'已签到':'签到','ret-checkin',state.retSigned?'disabled':'','primary full-button')}</div>`;
      return `<div class="ret-empty"><h3>${task.name}</h3><p>${task.id==='ad'?'广告任务暂未接入。':task.description}</p>${task.page?action('前往社区','community','','primary'):action('暂未接入','ret-noop','disabled','secondary')}</div>`;
    }

    function widgetPage() {
      const subscribed=!!state.giveawaySubscribed;
      const entries=GIVEAWAYS.filter(item=>subscribed&&isActive(item));
      const nearest=entries.length?entries.reduce((min,item)=>Date.parse(item.end)<Date.parse(min.end)?item:min):null;
      return `<div class="ret-widget-page"><h2>领免提醒</h2><p>订阅盖世喜加一，有新增可领游戏时提醒你。</p><button type="button" class="ret-native-widget" data-action="ret-giveaways"><span class="ret-widget-brand"><i aria-hidden="true"></i>盖世喜加一</span><strong>${!subscribed?'开启领免订阅':entries.length?`当前可领 ${entries.length} 款`:'暂无可领游戏'}</strong><span class="ret-widget-time">${nearest?'最近截止剩余 '+remaining(nearest.end):subscribed?'新限免发布后更新':'站内信 · Push 提醒'}</span><span class="ret-widget-arrow" aria-hidden="true">›</span></button></div>`;
    }

    function businessPage() {
      const item=BUSINESS.find(entry=>entry.id===state.retBusiness)||BUSINESS[0];
      return `<div class="ret-business-page">${promoArt(item,'ret-business-detail-art')}<span class="ret-business-type">${item.kind==='instant'?'秒玩':'组队云玩'}</span><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p><section class="condition-card"><h3>${item.kind==='instant'?'秒玩服务':'组队游玩'}暂未接入</h3><dl><div><dt>游戏供给</dt><dd>待接入</dd></div><div><dt>账号条件</dt><dd>待确认</dd></div><div><dt>服务状态</dt><dd>暂未连接</dd></div></dl></section>${action(item.kind==='instant'?'暂不可开始':'暂不可进入房间','ret-noop','disabled','primary full-button')}</div>`;
    }

    function page(name) {
      return ({'ret-calendar':calendarPage,'ret-discounts':discountPage,'ret-giveaways':giveawayPage,'ret-task-center':taskCenterPage,'ret-task':taskPage,'ret-widget':widgetPage,'ret-business':businessPage})[name]?.()??null;
    }

    function handle(name,data) {
      switch(name) {
        case 'ret-calendar':ctx.go('ret-calendar',{retSelectedRelease:data.release||''});return true;
        case 'ret-discounts':ctx.go('ret-discounts',{retSelectedDiscount:data.offer||''});return true;
        case 'ret-giveaways':if(PLATFORMS[data.platform])state.retPlatform=data.platform;ctx.go('ret-giveaways');return true;
        case 'ret-platform':if(PLATFORMS[data.platform]){state.retPlatform=data.platform;ctx.render(0);}return true;
        case 'ret-subscribe':window.LAB_SUBSCRIPTIONS.create(ctx).subscribe('giveaways');return true;
        
        case 'ret-task-center':ctx.go('ret-task-center');return true;
        case 'ret-task-tab':state.retTaskTab=data.tab==='growth'?'growth':'daily';ctx.render(0);return true;
        case 'ret-task':{const task=TASKS.find(item=>item.id===data.task)||TASKS[0];state.retTask=task.id;if(task.id==='checkin'||task.id==='ad')ctx.go('ret-task');else ctx.go(task.page);return true;}
        case 'ret-checkin':state.retSigned=true;ctx.render(ctx.getScroll());return true;
        case 'ret-widget':ctx.go('ret-widget');return true;
        case 'ret-business':if(!ctx.features.cloud&&BUSINESS.some(item=>item.id===data.business&&item.kind==='team'))return true;if(BUSINESS.some(item=>item.id===data.business))state.retBusiness=data.business;state.retBusinessIntent=data.intent||'';ctx.go('ret-business');return true;
        case 'ret-noop':return true;
        default:return false;
      }
    }
    return {calendar,discounts,giveaways,tasks,business,continueStrip,page,handle};
  }

  window.LAB_RETENTION={create,releases:RELEASES};
})();

