(() => {
  'use strict';
  // Prices and entitlement types are copied from the confirmed APP rental demo.
  // They are historical planning samples, not a live inventory or payment feed.
  const SOURCE='demos/APP租号功能/盖世游戏APP租号功能demo.template.html';
  const OFFER={id:'phantom',name:'影之刃零',trial:{id:'trial',name:'首次体验',price:1.9,duration:'2小时'},permanent:{id:'permanent',name:'单游戏永久账号权益',price:198,duration:'长期有效'}};
  const PLANS=[{id:'weekly',name:'周卡',price:39,days:7},{id:'monthly',name:'月卡',price:129,days:30}];

  function create(ctx){
    const {state,image,action,heading,section}=ctx;
    state.trialEligible ??= true;
    if(!PLANS.some(p=>p.id===state.conversionPlan))state.conversionPlan='weekly';
    if(!['trial','permanent'].includes(state.conversionSku)||(!state.trialEligible&&state.conversionSku==='trial'))state.conversionSku=state.trialEligible?'trial':'permanent';
    const price=value=>'¥'+value;
    const selected=()=>state.trialEligible&&state.conversionSku==='trial'?OFFER.trial:OFFER.permanent;
    const sample=()=>'<p class="conversion-source-note">既有租号方案样例 · 非当前在售</p>';
    const deviceNote=()=>state.match==='unknown'?'当前设备待识别，租号前先确认能否运行。':state.capability==='weak'?'当前设备较弱，账号权益不会改变本机运行能力。':'本机适配尚待核对，账号权益与运行条件分别确认。';

    function hero(){
      if(state.capability==='weak'||state.route==='cloud')return `<section class="conversion-hero conversion-cloud-hero" data-ops-slot="home-primary" data-content-source="catalog-and-eligibility" data-module="paid-conversion" data-conversion-route="cloud">${image('scene-cyber','')}<div class="conversion-hero-shade"></div><div class="conversion-hero-copy"><small>云端游玩 · 供给待确认</small><h2>手机带不动，也想玩大作？</h2><h3>先看看云端这条路</h3><p class="conversion-cloud-hero-note">目标游戏、网络与时长服务，分别确认。</p><div class="conversion-hero-bottom">${action('先看云端游戏','cloud-list','','conversion-primary')}${action('查看时长服务','pricing','','conversion-cloud-price-link')}</div></div></section>`;
      const offer=state.trialEligible?OFFER.trial:OFFER.permanent;
      return `<section class="conversion-hero" data-ops-slot="home-primary" data-content-source="catalog-and-eligibility" data-module="paid-conversion" data-trial-eligible="${state.trialEligible}" data-conversion-route="rental">${image('cover-phantom','')}<div class="conversion-hero-shade"></div><div class="conversion-hero-copy"><small>租号体验 · 历史方案样例</small><h2>${state.trialEligible?'先体验，再决定。':'想长期玩，先看清权益。'}</h2><h3>${OFFER.name}</h3><div class="conversion-hero-price"><strong>${price(offer.price)}</strong><span>${offer.duration}${state.trialEligible?' · 仅限符合首租资格':''}</span></div><div class="conversion-hero-bottom">${action(state.trialEligible?'查看首租体验':'查看账号权益','conversion-offer','data-offer="phantom"','conversion-primary')}<span>${state.trialEligible?'2小时账号使用权益':'单游戏账号权益'}</span></div></div></section>`;
    }

    function membership(){
      return `<section class="app-section conversion-membership" data-module="membership">${heading('换着玩，看看会员库','conversion-member-library')}<div class="conversion-member-banner"><div><small>会员游戏库 · 历史方案样例</small><h3>这一周，想玩点不一样的。</h3><p>会员有效期内使用库内账号权益</p><div class="conversion-member-price"><strong>¥39</strong><span>/ 7天周卡</span></div>${action('查看会员方案','conversion-member','','conversion-secondary')}</div><button type="button" class="conversion-member-cover" data-action="conversion-member-library" aria-label="查看会员游戏库">${image('cover-elden','艾尔登法环')}<span>艾尔登法环</span></button></div></section>`;
    }

    function cloud(){
      const weak=state.capability==='weak';
      return `<section class="app-section conversion-cloud" data-module="cloud-service">${heading(weak?'设备带不动，了解云端路径':'想换一种方式，也可以看看云端')}<button type="button" class="conversion-cloud-entry" data-action="cloud-list"><span class="conversion-cloud-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18a4 4 0 0 1-1-7.9A7 7 0 0 1 18.6 9 4.5 4.5 0 0 1 18 18H6Z"/></svg></span><span><b>先看看云端能玩什么</b><small>游戏供给、网络与账号条件分别确认</small></span><i aria-hidden="true">›</i></button></section>`;
    }

    function offerPage(){
      const sku=selected();
      const skus=state.trialEligible?[OFFER.trial,OFFER.permanent]:[OFFER.permanent];
      return `<div class="conversion-offer-page" data-conversion-offer="phantom"><div class="conversion-detail-art">${image('cover-phantom',OFFER.name)}</div><small class="conversion-kicker">STEAM 账号使用权益</small><h2>${OFFER.name}</h2><p class="conversion-detail-intro">先看清可用时长和权益，再决定怎么体验。</p><div class="conversion-sku-list" role="group" aria-label="租号权益方案">${skus.map(item=>`<button type="button" data-action="conversion-sku" data-sku="${item.id}" class="${sku.id===item.id?'is-selected':''}" aria-pressed="${sku.id===item.id}"><span><b>${item.name}</b><small>${item.duration}${item.id==='trial'?' · 仅限符合首租资格':''}</small></span><strong>${price(item.price)}</strong></button>`).join('')}</div>${sample()}<section class="conversion-condition-card"><h3>购买前，先确认</h3><dl><div><dt>当前选择</dt><dd>${sku.name} · ${sku.duration}</dd></div><div><dt>首租资格</dt><dd>${state.trialEligible?'样例：符合首租资格':'样例：首租资格已使用'}</dd></div><div><dt>账号与库存</dt><dd>未连接实时供给</dd></div></dl><p>${deviceNote()}</p>${action('打开兼容性查询','local-list','','conversion-text-link')}</section><div class="conversion-rights-note"><b>账号权益与游戏购买分别确认</b><p>这里展示账号使用权益，不向个人 Steam 游戏库新增游戏所有权；“单游戏永久”沿用源方案名称，具体服务条件需另行确认。</p></div>${action('演示不付款','conversion-noop','disabled','conversion-primary conversion-full')}<p class="conversion-demo-note">本页仅演示购前选择，不创建订单、不分配账号。</p></div>`;
    }

    function memberPage(){
      const plan=PLANS.find(p=>p.id===state.conversionPlan);
      return `<div class="conversion-member-page"><small class="conversion-kicker">会员游戏库 · 方案样例</small><h2>换着玩，也有一种选择。</h2><p class="conversion-detail-intro">先看库内游戏，再选择适合自己的使用周期。</p><button type="button" class="conversion-library-entry" data-action="conversion-member-library">${image('cover-elden','')}<span><b>会员游戏库</b><small>查看源方案中的游戏样例</small></span><i aria-hidden="true">›</i></button><div class="conversion-plan-list" role="group" aria-label="会员方案">${PLANS.map(item=>`<button type="button" data-action="conversion-plan" data-plan="${item.id}" class="${plan.id===item.id?'is-selected':''}" aria-pressed="${plan.id===item.id}"><b>${item.name}</b><strong>${price(item.price)}</strong><small>${item.days}天</small></button>`).join('')}</div>${sample()}<section class="conversion-condition-card"><h3>这项服务包含什么</h3><p>所选${plan.name}周期为${plan.days}天，样例价格${price(plan.price)}。有效期内使用会员库范围内的账号权益，具体可用游戏与库存需以服务端确认为准。</p><p>会员库账号权益与本机适配分别判断；不会向个人 Steam 库新增所有权，也不表示全部游戏可玩。</p></section>${action('演示不付款','conversion-noop','disabled','conversion-primary conversion-full')}<p class="conversion-demo-note">仅切换方案展示，不扣费、不生成会员订单或已开通状态。</p></div>`;
    }

    function memberLibrary(){
      return `<div class="conversion-member-library"><small class="conversion-kicker">会员游戏库 · 源方案样例</small><h2>先看想玩的，再选服务。</h2><p class="conversion-detail-intro">这里展示已登记的会员库游戏样例。实时可用范围待接入。</p><button type="button" class="conversion-member-game" data-action="conditions" data-game="elden">${image('cover-elden','艾尔登法环')}<span><b>艾尔登法环</b><small>会员库游戏样例 · 查看本机适配</small></span><i aria-hidden="true">›</i></button>${action('查看会员方案','conversion-member','','conversion-secondary conversion-full')}${sample()}</div>`;
    }

    function page(name){return ({'conversion-offer':offerPage,'conversion-member':memberPage,'conversion-member-library':memberLibrary})[name]?.()??null;}
    function handle(name,data){
      switch(name){
        case 'purchase-rental':
          state.conversionSku=state.trialEligible?'trial':'permanent';ctx.go('conversion-offer');
          return true;
        case 'conversion-offer':state.conversionSku=state.trialEligible?'trial':'permanent';ctx.go('conversion-offer');return true;
        case 'conversion-sku':if(['trial','permanent'].includes(data.sku)&&(data.sku!=='trial'||state.trialEligible)){state.conversionSku=data.sku;ctx.render(ctx.getScroll());}return true;
        case 'conversion-member':ctx.go('conversion-member');return true;
        case 'conversion-member-library':ctx.go('conversion-member-library');return true;
        case 'conversion-plan':if(PLANS.some(p=>p.id===data.plan)){state.conversionPlan=data.plan;ctx.render(ctx.getScroll());}return true;
        case 'conversion-noop':return true;
        default:return false;
      }
    }
    return {hero,membership,cloud,page,handle};
  }
  window.LAB_CONVERSION={create,offer:OFFER,plans:PLANS,source:SOURCE};
})();

