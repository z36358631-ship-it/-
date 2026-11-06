(() => {
  'use strict';

  // Task names and destinations come from the existing retention Demo.
  // Rewards and growth-task rules were not supplied; this module does not invent them.
  // 2026.11.6修改：移除社区评论任务，保留既有任务口径。
  const TASKS = [
    {id:'checkin',name:'签到',description:'每天来盖世看看',page:null},
    {id:'play',name:'畅玩游戏',description:'前往游戏库选择游戏',page:'library'},
    {id:'community',name:'社区互动',description:'看看喜欢的帖子',page:'community'},
    {id:'share',name:'分享帖子',description:'发现值得分享的内容',page:'community'},
    {id:'ad',name:'观看广告',description:'广告任务暂未接入',page:null}
  ];

  function create(ctx) {
    const {state,esc,action}=ctx;
    state.retTaskTab ||= 'daily';
    state.retSigned ??= false;
    state.retCalendarExpanded ??= false;
    const amount=value=>Number.isFinite(value)&&value>=0?esc(String(value)):'—';
    const reward=()=>amount(state.signInReward);
    const balance=()=>amount(state.pointsBalance);
    // Sign-in has its own clock: the other Demo pages intentionally use an old
    // offer/release date. An optional internal clock makes date boundaries testable.
    const dateParts=()=>{
      const supplied=Date.parse(state.signInNow||'');
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(Number.isFinite(supplied)?supplied:Date.now());
      return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
    };
    const today=()=>{const p=dateParts();return `${p.year}-${p.month}-${p.day}`;};
    state.retSignedDates=Array.isArray(state.retSignedDates)?[...new Set(state.retSignedDates.filter(value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)))]:[];
    const signed=()=>state.retSigned=state.retSignedDates.includes(today());
    signed();

    function monthCalendar() {
      const p=dateParts(),year=Number(p.year),month=Number(p.month),day=Number(p.day);
      const prefix=`${p.year}-${p.month}-`,days=new Date(Date.UTC(year,month,0)).getUTCDate();
      const offset=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7;
      const monthDates=state.retSignedDates.filter(key=>key.startsWith(prefix)&&Number(key.slice(-2))>=1&&Number(key.slice(-2))<=days);
      const expanded=state.retCalendarExpanded,todayKey=today();
      const weekOffset=(new Date(Date.UTC(year,month-1,day)).getUTCDay()+6)%7;
      const startDay=expanded?1:day-weekOffset;
      const blanks=expanded?Array.from({length:offset},()=>'<span class="tasks-month-blank" aria-hidden="true"></span>').join(''):'';
      const cells=Array.from({length:expanded?days:7},(_,index)=>{
        const date=new Date(Date.UTC(year,month-1,startDay+index)),cellYear=date.getUTCFullYear(),cellMonth=date.getUTCMonth()+1,n=date.getUTCDate();
        const key=`${cellYear}-${String(cellMonth).padStart(2,'0')}-${String(n).padStart(2,'0')}`,checked=state.retSignedDates.includes(key);
        const current=key===todayKey,past=key<todayKey,outside=cellMonth!==month||cellYear!==year;
        const kind=checked?'signed':past?'missed':current?'today':'future';
        const status=checked?'已签到':past?'未签到':current?'待签到':'未到';
        return `<div class="tasks-month-day is-${kind}${current?' is-today':''}${outside?' is-other-month':''}" data-date="${key}" data-status="${kind}" aria-label="${cellMonth}月${n}日，${current?'今日，':''}${status}"${current?' aria-current="date"':''}><span class="tasks-month-date">${outside?`${cellMonth}/${n}`:n}</span><span class="tasks-month-mark" aria-hidden="true">${checked?'✓':current?'今天':'·'}</span><span class="tasks-month-state">${checked?'已签':past?'未签':current?'待签':'未到'}</span></div>`;
      }).join('');
      return `<section class="tasks-revision-card tasks-revision-checkin tasks-month-card" aria-label="本月签到记录"><div class="tasks-month-heading"><h2>连续签到</h2><span>${year}年${month}月 · 已签 <b>${monthDates.length}</b> 天</span></div><div class="tasks-month-week" aria-hidden="true">${['一','二','三','四','五','六','日'].map(text=>`<span>${text}</span>`).join('')}</div><div class="tasks-month-grid" id="tasks-signin-calendar" aria-label="${expanded?'整月':'本周'}签到日期">${blanks}${cells}</div>${action(expanded?'收起 ⌃':'更多 ⌄','ret-calendar-toggle',`aria-expanded="${expanded}" aria-controls="tasks-signin-calendar"`,'tasks-month-toggle')}<div class="tasks-month-footer"><div class="tasks-month-result"><strong role="status">${signed()?'今日已签到':'今日未签到'}</strong><span>${signed()?'今日获得':'签到可得'} <b>${signed()&&Number.isFinite(state.signInReward)?'+':''}${reward()}</b> 盖世积分</span></div>${signed()?'<span class="tasks-revision-signed-label">明天再来</span>':action('签到','ret-checkin','','tasks-revision-sign-button')}</div></section>`;
    }

    function tabs() {
      return `<nav class="tasks-revision-tabs" aria-label="任务分类">${['daily','growth'].map((id,index)=>action(index?'成长任务':'每日任务','ret-task-tab',`data-tab="${id}" aria-pressed="${state.retTaskTab===id}"`,state.retTaskTab===id?'is-selected':'')).join('')}</nav>`;
    }

    function taskList() {
      if(state.retTaskTab==='growth')return '<div class="tasks-revision-empty"><h3>暂无成长任务</h3><p>有新任务时会在这里显示</p></div>';
      return `<div class="tasks-revision-list">${TASKS.map((task,index)=>`<article class="tasks-revision-row"><span class="tasks-revision-order" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><div class="tasks-revision-copy"><h3>${esc(task.name)}</h3><p>${esc(task.description)}</p></div>${action(task.id==='checkin'?(signed()?'已签到':'签到'):task.id==='ad'?'暂未接入':'去完成',task.id==='checkin'?'ret-checkin':'ret-task',`data-task="${task.id}" ${task.id==='checkin'&&signed()||task.id==='ad'?'disabled':''}`,task.id==='checkin'&&signed()?'tasks-revision-done':'tasks-revision-go')}</article>`).join('')}</div>`;
    }

    function moreTasks() {
      return `<section class="tasks-revision-card tasks-revision-more" aria-labelledby="tasks-revision-more-title"><div class="tasks-revision-more-heading"><h2 id="tasks-revision-more-title">获得更多积分</h2></div>${tabs()}${taskList()}</section>`;
    }

    function renderSignIn() {
      return `<div class="tasks-revision-page tasks-revision-signin" data-component-id="D-TASK-SIGNIN"><div class="tasks-revision-summary"><section class="tasks-revision-balance"><span>我的盖世积分</span><strong>${balance()}</strong></section>${monthCalendar()}</div>${moreTasks()}</div>`;
    }

    function renderTasks() {
      return `<div class="tasks-revision-page tasks-revision-center" data-component-id="D-TASK-CENTER">${moreTasks()}</div>`;
    }

    function signIn() {
      // Only record this local Demo date. No balance mutation or award receipt.
      if(!signed())state.retSignedDates.push(today());
      signed();
    }

    function page(name) {
      if(name==='ret-task-center')return renderTasks();
      if(name==='ret-task'&&state.retTask==='checkin')return renderSignIn();
      return null;
    }

    function handle(name,data={}) {
      switch(name) {
        case 'lab-signin':
          signIn();state.retTask='checkin';state.retTaskTab='daily';state.retCalendarExpanded=false;ctx.go('ret-task');return true;
        case 'ret-task':
          if(data.task!=='checkin'){
            const task=TASKS.find(item=>item.id===data.task);
            if(!task)return false;
            if(task.page)ctx.go(task.page);
            return true;
          }
          state.retTask='checkin';state.retTaskTab='daily';state.retCalendarExpanded=false;ctx.go('ret-task');return true;
        case 'ret-calendar-toggle':
          state.retCalendarExpanded=!state.retCalendarExpanded;ctx.render(ctx.getScroll());return true;
        case 'ret-task-center':
          state.retTaskTab='daily';ctx.go('ret-task-center');return true;
        case 'ret-task-tab':
          state.retTaskTab=data.tab==='growth'?'growth':'daily';ctx.render(ctx.getScroll());return true;
        case 'ret-checkin':
          signIn();state.retTask='checkin';
          if(state.page==='ret-task')ctx.render(ctx.getScroll());else ctx.go('ret-task');
          return true;
        default:return false;
      }
    }

    return {renderSignIn,renderTasks,page,handle};
  }
  window.LAB_TASKS_REVISION={create,tasks:TASKS};
})();
