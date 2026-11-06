(() => {
  'use strict';

  // Fixed review fixtures. These dates are examples, not a live compatibility feed.
  const COMPATIBILITY = [
    {id:'hades',key:'cover-hades',name:'哈迪斯',date:'2026-11-01',tags:'动作 · 肉鸽'},
    {id:'elden',key:'cover-elden',name:'艾尔登法环',date:'2026-11-02',tags:'开放世界 · 动作角色扮演'},
    {id:'cyber',key:'cover-cyber',name:'赛博朋克 2077',date:'2026-11-02',tags:'开放世界 · 角色扮演'}
  ];
  const RELEASE_SNAPSHOT = [
    {id:'fleming',key:'release-fleming',name:'弗莱明庄园命案',date:'2026-11-03',tags:'冒险 · 独立'},
    {id:'figure',key:'release-figure',name:'Figure Me Out',date:'2026-11-03',tags:'动作 · 休闲'},
    {id:'dailygold',key:'release-dailygold',name:'日进斗金',date:'2026-11-03',tags:'休闲 · 独立'},
    {id:'archeage',key:'release-archeage',name:'上古世纪编年史',date:'2026-11-04',tags:'动作 · 冒险'},
    {id:'floatopia',key:'release-floatopia',name:'乐浮岛',date:'2026-11-04',tags:'冒险 · 休闲'}
  ];
  // 2026.11.6修改：测试结果的官方批次，不受当前机型过滤；说明也是演示数据。
  const BATCH_NOTES={'2026-11-01':'动作游戏兼容测试记录更新；具体机型及运行条件以各游戏测试记录为准。','2026-11-02':'开放世界游戏测试记录更新；请查看各游戏的芯片、机型适用条件及已知问题。'};
  const ROUTES = ['ret-calendar','latest-compatibility'];
  const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '');
  const shiftedMonth = (value, offset) => {
    const [year, month] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
  };

  function create(ctx) {
    const {state,esc,image,action} = ctx;
    const parsed = Date.parse(state.demoNow || '2026-11-02T10:00:00+08:00');
    const now = Number.isFinite(parsed) ? parsed : Date.parse('2026-11-02T10:00:00+08:00');
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
    const todayMonth = today.slice(0,7);
    state.timelineMonths ||= {};
    state.latestCompatSubscribed ??= false;
    state.retReleaseSubscribed ??= false;
    const kind = page => page === 'latest-compatibility' ? 'compatibility' : 'release';
    const entries = page => kind(page) === 'compatibility' ? COMPATIBILITY : (window.LAB_RETENTION?.releases || RELEASE_SNAPSHOT);
    const currentMonth = page => validMonth(state.timelineMonths[page]) ? state.timelineMonths[page] : todayMonth;

    function calendarIcon() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3v5m8-5v5M4 10h16M8 13h2m4 0h2m-8 4h2m4 0h2"/></svg>';
    }

    function monthHeader(page) {
      const selected = currentMonth(page), [year,month] = selected.split('-').map(Number);
      return `<div class="timeline-toolbar"><div class="timeline-month-title"><time datetime="${selected}">${year} 年 ${month} 月</time>${action('今天','timeline-today','aria-label="定位到今天"','timeline-today')}</div><nav class="timeline-months" aria-label="月份选择">${[-3,-2,-1,0,1,2,3].map(offset=>{const value=shiftedMonth(selected,offset);return action(`${Number(value.slice(-2))}月`,'timeline-month',`data-month="${value}" aria-label="${value.slice(0,4)}年${Number(value.slice(-2))}月" aria-pressed="${value===selected}"`,value===selected?'is-selected':'');}).join('')}${action(calendarIcon(),'timeline-today','aria-label="回到本月"','timeline-calendar-icon')}</nav></div>`;
    }

    function row(item,page) {
      const compatible = kind(page) === 'compatibility';
      if(compatible)return `<article class="timeline-game" data-timeline-game="${esc(item.id)}">${image(item.key,item.name)}<div class="timeline-game-copy"><h3>${esc(item.name)}</h3><div class="timeline-tags">${item.tags.split(' · ').map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></div><span class="timeline-game-status">兼容更新</span></article>`;
      const subscribed=(state.releaseSubscriptions||[]).includes(item.id),released=item.date<=today;
      return `<article class="timeline-game" data-timeline-game="${esc(item.id)}"><a class="timeline-store" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" data-store-route="steam-native" aria-label="浏览${esc(item.name)} Steam商店">${image(item.key,item.name)}<div class="timeline-game-copy"><h3>${esc(item.name)}</h3><div class="timeline-tags">${item.tags.split(' · ').map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></div></a><div class="timeline-release-actions"><small>${item.date<=today?'已发售':'即将发售'}</small>${action(subscribed?'已订阅':released?'已发售':'订阅','release-subscribe',`${released&&!subscribed?'disabled ':''}data-release="${esc(item.id)}" aria-label="${subscribed?'取消订阅':'订阅'}${esc(item.name)}发售提醒" aria-pressed="${subscribed}"`,subscribed?'timeline-subscribe is-on':'timeline-subscribe')}</div></article>`;
    }

    function subscribeBar(page) {
      const compatible=kind(page)==='compatibility';
      const on=compatible?state.latestCompatSubscribed:state.retReleaseSubscribed;
      return `<footer class="timeline-subscription" data-timeline-subscription="${compatible?'compatibility':'release'}"><div><b>${compatible?'兼容提醒':'发售提醒'}</b><small>${compatible?'有新的官方兼容更新时提醒':'仅提醒已订阅游戏的发售'}</small><span>站内信 · Push</span></div>${action(on?'已订阅':compatible?'订阅兼容提醒':'订阅发售提醒','timeline-subscribe',`aria-pressed="${on}"`,on?'timeline-subscribe is-on':'timeline-subscribe')}</footer>`;
    }

    function page(name) {
      if(!ROUTES.includes(name))return null;
      const month=currentMonth(name);
      const list=entries(name).filter(item=>item.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
      const dates=[...new Set(list.map(item=>item.date))];
      const content=dates.length?dates.map(date=>`<section class="timeline-day" data-timeline-date="${date}"><h2><time datetime="${date}">${date.replaceAll('-','.')}</time>${date===today?'<span>今天</span>':''}</h2>${kind(name)==='compatibility'?`<p class="timeline-batch-note" data-batch-note="${date}">${esc(BATCH_NOTES[date]||'兼容测试记录更新，适用条件请查看具体游戏。')}</p>`:''}<div class="timeline-day-games">${list.filter(item=>item.date===date).map(item=>row(item,name)).join('')}</div></section>`).join(''):`<div class="timeline-empty"><h3>${kind(name)==='compatibility'?'本月暂无兼容更新':'本月暂无发售游戏'}</h3></div>`;
      return `<div class="timeline-page" data-timeline-kind="${kind(name)}">${monthHeader(name)}${kind(name)==='compatibility'?'<p class="timeline-global-note">官方兼容更新动态 · 不代表全部适配当前设备</p>':'<p class="timeline-global-note">订阅感兴趣的游戏，发售时接收提醒</p>'}<div class="timeline-content">${content}</div>${kind(name)==='compatibility'?subscribeBar(name):''}</div>`;
    }

    function locateToday() {
      requestAnimationFrame(()=>{
        const scroller=document.querySelector('.app-body');
        const days=[...document.querySelectorAll('[data-timeline-date]')];
        if(!scroller||!days.length)return;
        const target=days.find(node=>node.dataset.timelineDate>=today)||days[days.length-1];
        const toolbar=document.querySelector('.timeline-toolbar');
        // Keep the month selector visible while moving the nearest date under it.
        const offset=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop-(toolbar?.offsetHeight||0)-12;
        scroller.scrollTop=Math.max(0,offset);
      });
    }

    function handle(name,data={}) {
      const active=ROUTES.includes(state.page)?state.page:'ret-calendar';
      switch(name) {
        case 'ret-calendar':
        case 'latest-compatibility': {
          if(name==='ret-calendar'){
            state.retSelectedRelease=data.release||'';
            const record=entries(name).find(item=>item.id===data.release);
            if(record)state.timelineMonths[name]=record.date.slice(0,7);
          }
          ctx.go(name);
          return true;
        }
        case 'timeline-month':
          if(validMonth(data.month)){state.timelineMonths[active]=data.month;ctx.render(0);}
          return true;
        case 'timeline-today':
          state.timelineMonths[active]=todayMonth;
          ctx.render(0);
          locateToday();
          return true;
        case 'release-subscribe':
          if(entries('ret-calendar').some(x=>x.id===data.release&&(x.date>today||(state.releaseSubscriptions||[]).includes(x.id))))window.LAB_SUBSCRIPTIONS.create(ctx).subscribe('release',data.release);
          return true;
        case 'timeline-subscribe':
          if(kind(active)==='compatibility')window.LAB_SUBSCRIPTIONS.create(ctx).subscribe('compatibility');
          return true;
        default:return false;
      }
    }
    return {page,handle};
  }
  window.LAB_TIMELINE={create};
})();
