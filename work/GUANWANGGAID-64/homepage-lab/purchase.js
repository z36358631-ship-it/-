(() => {
  'use strict';

  // Steam CN store prices observed 2026-11-05. Compatibility is a separate demo input.
  const ITEMS = [
    {id:'repo',appid:'3241660',key:'promo-repo',name:'R.E.P.O.',price:22.75,original:35,discount:35,genre:'多人合作 · 恐怖冒险',line:'和伙伴小心搬运，每一次响动都可能惊动怪物。'},
    {id:'raft',appid:'648800',key:'promo-raft',name:'Raft',price:51.59,original:77,discount:33,genre:'生存 · 海上建造',line:'从一块木筏出发，把漂泊变成自己的海上生活。'},
    {id:'hades',appid:'1145360',key:'cover-hades',name:'哈迪斯',price:92,original:92,discount:0,genre:'动作 · 肉鸽',line:'选择武器与祝福，试试这一局能走多远。'},
    {id:'elden',appid:'1245620',key:'cover-elden',name:'艾尔登法环',price:298,original:298,discount:0,genre:'开放世界 · 动作角色扮演',line:'去交界地的岔路走走，留下下一次探索的起点。'},
    {id:'re4',appid:'2050650',key:'promo-re4',name:'生化危机 4',price:198,original:198,discount:0,genre:'生存 · 冒险',line:'走入危机四伏的村庄，开启里昂的营救之旅。'}
  ];
  const SNAPSHOT='2026.11.05';
  const BUDGETS=[['all','全部'],['30','¥30 内'],['50','¥50 内'],['100','¥100 内']];
  const icon=kind=>{
    const paths={
      compat:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="m8.5 12 2.3 2.3 4.7-5M10 18h4"/>',
      gift:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M3 6h18v4H3zM12 6v15M12 6H8.5A2.5 2.5 0 1 1 11 3.5L12 6Zm0 0h3.5A2.5 2.5 0 1 0 13 3.5L12 6Z"/>',
      tag:'<path d="M3 4h8l10 10-7 7L3 10V4Z"/><circle cx="7.5" cy="8" r="1"/><path d="m12 10 5 5"/>',
      rental:'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.5-2.5 4.5-2.5 5 0M14 10h4m-4 4h3"/>',
      bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 3 6 3 8H3c0-2 3-2 3-8Zm4 12h4"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]||paths.tag}</svg>`;
  };

  function create(ctx){
    const {state,esc,image,action,heading,section,compatible}=ctx;
    if(!BUDGETS.some(([value])=>value===state.purchaseBudget))state.purchaseBudget='all';
    if(!Array.isArray(state.purchaseFollowing))state.purchaseFollowing=[];
    state.purchaseFollowing=state.purchaseFollowing.filter(id=>ITEMS.some(item=>item.id===id));
    if(!ITEMS.some(item=>item.id===state.purchaseSelected))state.purchaseSelected='repo';
    const itemById=id=>ITEMS.find(item=>item.id===id);
    const money=price=>'¥'+price.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
    const followed=id=>state.purchaseFollowing.includes(id);
    const isCompatible=item=>['hades','elden'].includes(item.id)&&compatible(item.id);
    const inLibrary=item=>['hades','elden'].includes(item.id)&&state.source!=='none';
    const offerAttrs=item=>`data-offer="${item.id}"`;
    const compatText=item=>isCompatible(item)?'适配已匹配':state.match==='unknown'?'设备待识别':'先查适配';
    const compatBadge=item=>`<span class="purchase-compat ${isCompatible(item)?'is-matched':''}" data-compat="${isCompatible(item)?'matched':'unknown'}">${isCompatible(item)?'<i aria-hidden="true">✓</i>':''}${compatText(item)}</span>`;
    const priceLine=(item,{large=false}={})=>`<span class="purchase-price ${large?'is-large':''}">${item.discount?`<em>-${item.discount}%</em>`:''}<strong>${money(item.price)}</strong>${item.discount?`<del>${money(item.original)}</del>`:''}</span>`;
    const stamp=()=>`<p class="purchase-snapshot">Steam 国区 · ${SNAPSHOT} 价格快照</p>`;
    const followButton=(item,cls='purchase-follow')=>action(`${followed(item.id)?'已关注':'关注降价'}`,'purchase-follow',`${offerAttrs(item)} aria-pressed="${followed(item.id)}"`,`${cls} ${followed(item.id)?'is-on':''}`);

    function shortcuts(){
      return `<nav class="purchase-shortcuts" data-module="shortcuts" aria-label="首页快捷入口">${[
        ['compat','兼容性查询','local-list'],['gift','喜加一','ret-giveaways'],['tag','Steam 折扣','purchase-deals'],['rental','Steam 租号','purchase-rental']
      ].map(([symbol,label,dest])=>`<button type="button" class="purchase-shortcut is-${symbol}" data-action="${dest}"><span>${icon(symbol)}</span><b>${label}</b></button>`).join('')}</nav>`;
    }

    function hero(){
      const item=itemById('repo');
      return `<section class="purchase-hero" aria-label="好价推荐 ${item.name}">${image(item.key,'')}<div class="purchase-hero-shade"></div><div class="purchase-hero-copy"><span class="purchase-eyebrow">STEAM · 11.05 折扣</span><h2>Steam 折扣</h2><h3>${item.name}</h3>${priceLine(item,{large:true})}<div class="purchase-hero-bottom">${action('查看详情','purchase-detail',offerAttrs(item),'purchase-main-cta')}${compatBadge(item)}</div></div></section>`;
    }

    function dealCard(item){
      return `<article class="purchase-deal-card" data-purchase-item="${item.id}"><button type="button" class="purchase-deal-open" data-action="purchase-detail" ${offerAttrs(item)} aria-label="查看${esc(item.name)}价格与适配"><span class="purchase-deal-art">${image(item.key,'')}${compatBadge(item)}</span><h3>${esc(item.name)}</h3><p>${esc(item.genre)}</p>${priceLine(item)}</button>${followButton(item)}</article>`;
    }

    function budget({full=false}={}){
      const active=ITEMS.filter(item=>item.discount>0);
      const shown=active.filter(item=>state.purchaseBudget==='all'||item.price<=Number(state.purchaseBudget));
      return `<section class="app-section purchase-budget" data-module="discounts">${heading(full?'正在打折':'Steam 折扣',full?undefined:'purchase-deals')}<div class="purchase-budget-tabs" role="group" aria-label="游戏预算">${BUDGETS.map(([value,label])=>action(label,'purchase-budget',`data-budget="${value}" aria-pressed="${state.purchaseBudget===value}"`,state.purchaseBudget===value?'is-selected':'')).join('')}</div><div class="purchase-deal-grid">${shown.length?shown.map(dealCard).join(''):'<div class="purchase-empty"><h3>这个预算暂时没有折扣游戏</h3><p>换个预算，再看看。</p></div>'}</div>${stamp()}</section>`;
    }

    function matchedWaiting(){
      const candidates=ITEMS.filter(item=>['hades','elden'].includes(item.id)&&isCompatible(item));
      if(!candidates.length)return `<section class="app-section purchase-matched"><div class="purchase-fit-empty"><span>${icon('compat')}</span><div><h3>本机适配</h3><p>${state.match==='unknown'?'识别设备后，再查看适配记录。':'暂未找到本机已匹配的折扣游戏。'}</p></div>${action('›','local-list','aria-label="查看兼容性查询"','heading-link')}</div></section>`;
      if(state.source!=='none')return `<section class="app-section purchase-matched">${heading('手上的游戏，先玩起来','library')}<button type="button" class="purchase-owned" data-action="library"><span class="purchase-owned-covers">${candidates.map(item=>image(item.key,'')).join('')}</span><span><b>${candidates.map(item=>esc(item.name)).join(' · ')}</b><small>已在游戏库，查看游玩准备</small></span><i aria-hidden="true">›</i></button></section>`;
      return `<section class="app-section purchase-matched">${heading('已适配，等个好价')}<div class="purchase-waiting-list">${candidates.map(item=>`<article class="purchase-waiting-row">${image(item.key,'')}<div><h3>${item.name}</h3><p>${compatText(item)} · 当前无折扣</p><strong>${money(item.price)}</strong></div>${followButton(item)}</article>`).join('')}</div></section>`;
    }

    function following({full=false}={}){
      const entries=ITEMS.filter(item=>followed(item.id));
      return `<section class="app-section purchase-following" data-module="price-following">${heading(full?'我关注的价格':'价格关注',full?undefined:'purchase-following')}${entries.length?`<div class="purchase-watch-list">${entries.map(item=>`<article class="purchase-watch-row"><button type="button" data-action="purchase-detail" ${offerAttrs(item)}>${image(item.key,'')}<span><b>${esc(item.name)}</b><small>${item.discount?'当前折扣 -'+item.discount+'%':'当前无折扣'}</small></span><strong>${money(item.price)}</strong></button>${followButton(item)}</article>`).join('')}</div>`:`<div class="purchase-follow-empty"><span>${icon('bell')}</span><div><h3>暂无关注的游戏</h3><p>可订阅降价提醒。</p></div>${action('挑选游戏','purchase-deals','','purchase-inline-link')}</div>`}${full?`<div class="purchase-reminder-note"><b>降价提醒</b><span>站内信 · Push</span><p>本演示仅记录关注状态，不发送通知。</p></div>${stamp()}`:''}</section>`;
    }

    function detail(){
      const item=itemById(state.purchaseSelected),known=['hades','elden'].includes(item.id),owned=inLibrary(item);
      return `<div class="purchase-detail" data-purchase-detail="${item.id}"><div class="purchase-detail-art">${image(item.key,item.name)}${compatBadge(item)}</div><span class="purchase-eyebrow">STEAM · 游戏本体</span><h2>${esc(item.name)}</h2><p class="purchase-detail-genre">${esc(item.genre)}</p><p class="purchase-detail-line">${esc(item.line)}</p>${priceLine(item,{large:true})}${!item.discount?'<span class="purchase-no-discount">当前无折扣</span>':''}${stamp()}<section class="purchase-check-card"><h3>${isCompatible(item)?'适配记录已匹配':'本机适配待核对'}</h3><p>${isCompatible(item)?'请核对测试设备、游戏版本及运行环境后，再决定购买。':state.match==='unknown'?'当前设备尚未识别，先查看兼容性查询。':'暂未匹配这款游戏的本机测试记录，购买前先确认运行条件。'}</p>${action(known?'核对本机适配':'打开兼容性查询',known?'conditions':'local-list',known?`data-game="${item.id}"`:'','purchase-inline-link')}</section>${owned?`<div class="purchase-already-library"><p>这款游戏已在演示游戏库中。</p>${action('查看游戏库','library','','purchase-inline-link')}</div>`:''}<div class="purchase-detail-actions">${followButton(item,'purchase-detail-follow')}${owned?'':`<a class="purchase-store-link" href="https://store.steampowered.com/app/${item.appid}/" target="_blank" rel="noopener noreferrer">查看 Steam 商店 <span aria-hidden="true">↗</span></a>`}</div><div class="purchase-reminder-note"><span>降价提醒：站内信 · Push</span><p>本演示仅记录关注状态，不发送通知。价格及购买条件以官方商店为准。</p></div></div>`;
    }

    function rental(){
      return `<div class="purchase-rental"><div class="purchase-rental-symbol">${icon('rental')}</div><span class="purchase-eyebrow">STEAM 账号服务</span><h2>Steam 租号</h2><p>账号服务暂未接入。</p><section class="purchase-check-card"><h3>使用条件</h3><dl><div><dt>账号与游戏供给</dt><dd>待确认</dd></div><div><dt>价格与可用时长</dt><dd>待接入</dd></div><div><dt>当前设备运行条件</dt><dd>需另行核对</dd></div></dl></section>${action('暂不可租用','purchase-noop','disabled','purchase-main-cta full-button')}${action('先查本机适配','local-list','','purchase-inline-link full-button')}</div>`;
    }

    function home({retention:R,community,localModule}){
      const resolve=value=>typeof value==='function'?value():value||'';
      return `<div class="purchase-home" data-module="deal-discovery">${R.continueStrip()}${hero()}${shortcuts()}${budget()}${matchedWaiting()}${following()}${R.giveaways({compact:false})}${resolve(community)}${R.calendar({compact:true})}${R.tasks()}${resolve(localModule)}${R.business({kind:'all'})}</div>`;
    }

    function page(name){
      switch(name){
        case 'purchase-deals':return `<div class="purchase-deals-page"><div class="purchase-page-intro"><span class="purchase-eyebrow">STEAM SPECIALS</span><h2>Steam 折扣</h2><p>国区 · 游戏本体</p></div>${budget({full:true})}${section('游戏价格',`<div class="purchase-catalog-list">${ITEMS.filter(item=>!item.discount).map(item=>`<article class="purchase-catalog-row"><button type="button" data-action="purchase-detail" ${offerAttrs(item)}>${image(item.key,'')}<span><b>${esc(item.name)}</b><small>${inLibrary(item)?'已在演示游戏库':'当前无折扣'}</small></span><strong>${money(item.price)}</strong></button>${followButton(item)}</article>`).join('')}</div>`)}${following()}</div>`;
        case 'purchase-detail':return detail();
        case 'purchase-following':return following({full:true});
        case 'purchase-rental':return rental();
        default:return null;
      }
    }

    function handle(name,data){
      switch(name){
        case 'purchase-deals':ctx.go('purchase-deals');return true;
        case 'purchase-detail':if(itemById(data.offer)){state.purchaseSelected=data.offer;ctx.go('purchase-detail');}return true;
        case 'purchase-budget':if(BUDGETS.some(([value])=>value===data.budget)){state.purchaseBudget=data.budget;ctx.render(ctx.getScroll());}return true;
        case 'purchase-follow':if(itemById(data.offer)){const index=state.purchaseFollowing.indexOf(data.offer);if(index<0)state.purchaseFollowing.push(data.offer);else state.purchaseFollowing.splice(index,1);ctx.render(ctx.getScroll());}return true;
        case 'purchase-following':ctx.go('purchase-following');return true;
        case 'purchase-rental':ctx.go('purchase-rental');return true;
        case 'purchase-noop':return true;
        default:return false;
      }
    }
    return {shortcuts,budget,following,page,handle};
  }
  window.LAB_PURCHASE={create,items:ITEMS,snapshot:SNAPSHOT};
})();

