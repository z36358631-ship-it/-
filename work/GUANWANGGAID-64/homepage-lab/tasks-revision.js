(() => {
  'use strict';

  // Task names and destinations come from the existing retention Demo.
  // Rewards and growth-task rules were not supplied; this module does not invent them.
  const TASKS = [
    {id:'checkin',name:'签到',description:'每天来盖世看看',page:null},
    {id:'play',name:'畅玩游戏',description:'前往游戏库选择游戏',page:'library'},
    {id:'community',name:'社区互动',description:'看看喜欢的帖子',page:'community'},
    {id:'comment',name:'社区评论',description:'进入社区参与讨论',page:'community'},
    {id:'share',name:'分享帖子',description:'发现值得分享的内容',page:'community'},
    {id:'ad',name:'观看广告',description:'广告任务暂未接入',page:null}
  ];

  function create(ctx) {
    const {state,esc,action}=ctx;
    state.retTaskTab ||= 'daily';
    state.retSigned ??= false;
    const amount=value=>Number.isFinite(value)&&value>=0?esc(String(value)):'—';
    const reward=()=>amount(state.signInReward);
    const balance=()=>amount(state.pointsBalance);
    const signed=()=>!!state.retSigned;

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
      const configured=Number.isFinite(state.signInReward)&&state.signInReward>=0;
      return `<div class="tasks-revision-page tasks-revision-signin" data-component-id="D-TASK-SIGNIN"><div class="tasks-revision-summary"><section class="tasks-revision-balance"><span>我的盖世积分</span><strong>${balance()}</strong></section><section class="tasks-revision-card tasks-revision-checkin"><span class="tasks-revision-status ${signed()?'is-signed':''}" aria-hidden="true">${signed()?'✓':'＋'}</span><h2>${signed()?'今日已签到':'每日签到'}</h2><p role="status">${signed()?'获得盖世积分':'签到获得盖世积分'}</p><div class="tasks-revision-reward"><strong>${signed()&&configured?'+':''}${reward()}</strong><span>盖世积分</span></div>${signed()?'<span class="tasks-revision-signed-label">明天再来</span>':action('签到','ret-checkin','','tasks-revision-sign-button')}</section></div><section class="tasks-revision-card tasks-revision-more tasks-revision-entry"><div class="tasks-revision-more-heading"><h2>盖世任务中心</h2><span>每日任务 · 成长任务</span></div>${action('获得更多积分','ret-task-center','','tasks-revision-sign-button')}</section></div>`;
    }

    function renderTasks() {
      return `<div class="tasks-revision-page tasks-revision-center" data-component-id="D-TASK-CENTER">${moreTasks()}</div>`;
    }

    function signIn() {
      // Only update the existing local Demo flag. No balance mutation or award receipt.
      if(!state.retSigned)state.retSigned=true;
    }

    function page(name) {
      if(name==='ret-task-center')return renderTasks();
      if(name==='ret-task'&&state.retTask==='checkin')return renderSignIn();
      return null;
    }

    function handle(name,data={}) {
      switch(name) {
        case 'lab-signin':
          signIn();state.retTask='checkin';state.retTaskTab='daily';ctx.go('ret-task');return true;
        case 'ret-task':
          if(data.task!=='checkin')return false;
          state.retTask='checkin';state.retTaskTab='daily';ctx.go('ret-task');return true;
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
