(() => {
  'use strict';
  // Prices and entitlement types are copied from the confirmed APP rental demo.
  // They are historical planning samples, not a live inventory or payment feed.
  const SOURCE='demos/APP租号功能/盖世游戏APP租号功能demo.template.html';
  const PLANS=[{id:'weekly',name:'周卡',price:39,days:7},{id:'monthly',name:'月卡',price:129,days:30}];

  function create(ctx){
    const {state,image,action,heading,section}=ctx;
    if(!PLANS.some(p=>p.id===state.conversionPlan))state.conversionPlan='weekly';
    const price=value=>'¥'+value;
    const sample=()=>'<p class="conversion-source-note">既有租号方案样例 · 非当前在售</p>';

    function membership(){
      return `<section class="app-section conversion-membership" data-module="membership">${heading('会员游戏库','conversion-member-library')}<div class="conversion-member-banner"><div><small>会员游戏库 · 历史方案样例</small><h3>会员周卡</h3><p>会员有效期内使用库内账号权益</p><div class="conversion-member-price"><strong>¥39</strong><span>/ 7天周卡</span></div>${action('查看会员方案','conversion-member','','conversion-secondary')}</div><button type="button" class="conversion-member-cover" data-action="conversion-member-library" aria-label="查看会员游戏库">${image('cover-elden','艾尔登法环')}<span>艾尔登法环</span></button></div></section>`;
    }

    function cloud(){
      const weak=state.capability==='weak';
      return `<section class="app-section conversion-cloud" data-module="cloud-service">${heading('云游戏')}<button type="button" class="conversion-cloud-entry" data-action="cloud-list"><span class="conversion-cloud-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18a4 4 0 0 1-1-7.9A7 7 0 0 1 18.6 9 4.5 4.5 0 0 1 18 18H6Z"/></svg></span><span><b>云游戏列表</b><small>游戏供给、网络与账号条件分别确认</small></span><i aria-hidden="true">›</i></button></section>`;
    }

    function memberPage(){
      const plan=PLANS.find(p=>p.id===state.conversionPlan);
      return `<div class="conversion-member-page"><small class="conversion-kicker">会员游戏库 · 方案样例</small><h2>会员方案</h2><p class="conversion-detail-intro">周卡 / 月卡</p><button type="button" class="conversion-library-entry" data-action="conversion-member-library">${image('cover-elden','')}<span><b>会员游戏库</b><small>查看源方案中的游戏样例</small></span><i aria-hidden="true">›</i></button><div class="conversion-plan-list" role="group" aria-label="会员方案">${PLANS.map(item=>`<button type="button" data-action="conversion-plan" data-plan="${item.id}" class="${plan.id===item.id?'is-selected':''}" aria-pressed="${plan.id===item.id}"><b>${item.name}</b><strong>${price(item.price)}</strong><small>${item.days}天</small></button>`).join('')}</div>${sample()}<section class="conversion-condition-card"><h3>会员权益</h3><p>所选${plan.name}周期为${plan.days}天，样例价格${price(plan.price)}。有效期内使用会员库范围内的账号权益，具体可用游戏与库存需以服务端确认为准。</p><p>会员库账号权益与本机适配分别判断；不会向个人 Steam 库新增所有权，也不表示全部游戏可玩。</p></section>${action('演示不付款','conversion-noop','disabled','conversion-primary conversion-full')}<p class="conversion-demo-note">仅切换方案展示，不扣费、不生成会员订单或已开通状态。</p></div>`;
    }

    function memberLibrary(){
      return `<div class="conversion-member-library"><small class="conversion-kicker">会员游戏库 · 源方案样例</small><h2>会员游戏库</h2><p class="conversion-detail-intro">这里展示已登记的会员库游戏样例。实时可用范围待接入。</p><button type="button" class="conversion-member-game" data-action="conditions" data-game="elden">${image('cover-elden','艾尔登法环')}<span><b>艾尔登法环</b><small>会员库游戏样例 · 查看本机适配</small></span><i aria-hidden="true">›</i></button>${action('查看会员方案','conversion-member','','conversion-secondary conversion-full')}${sample()}</div>`;
    }

    function page(name){return ({'conversion-member':memberPage,'conversion-member-library':memberLibrary})[name]?.()??null;}
    function handle(name,data){
      switch(name){
        case 'conversion-member':ctx.go('conversion-member');return true;
        case 'conversion-member-library':ctx.go('conversion-member-library');return true;
        case 'conversion-plan':if(PLANS.some(p=>p.id===data.plan)){state.conversionPlan=data.plan;ctx.render(ctx.getScroll());}return true;
        case 'conversion-noop':return true;
        default:return false;
      }
    }
    return {membership,cloud,page,handle};
  }
  window.LAB_CONVERSION={create,plans:PLANS,source:SOURCE};
})();




