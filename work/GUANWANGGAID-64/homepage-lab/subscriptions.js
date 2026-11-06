(() => {
  'use strict';
  // 2026.11.6修改：栏目/单游戏订阅共用盖世登录与通知权限；权限不影响站内信。
  // Offline preview only. No account credentials, OS permissions or real pushes are used.
  function create(ctx) {
    const {state,action}=ctx;
    state.releaseSubscriptions ||= [];
    state.notificationPermission ||= 'unknown';
    const render=()=>ctx.render(ctx.getScroll());
    function finish(target) {
      if(target.kind==='giveaways')state.giveawaySubscribed=true;
      if(target.kind==='compatibility')state.latestCompatSubscribed=true;
      if(target.kind==='release'&&!state.releaseSubscriptions.includes(target.id))state.releaseSubscriptions.push(target.id);
      state.pendingSubscription=null;
      state.subscriptionDialog=state.notificationPermission==='unknown'?'permission':state.notificationPermission==='blocked'?'settings':'';
      render();
    }
    function subscribe(kind,id='') {
      if(kind==='giveaways'&&state.giveawaySubscribed){state.giveawaySubscribed=false;render();return;}
      if(kind==='compatibility'&&state.latestCompatSubscribed){state.latestCompatSubscribed=false;render();return;}
      if(kind==='release'&&state.releaseSubscriptions.includes(id)){state.releaseSubscriptions=state.releaseSubscriptions.filter(x=>x!==id);render();return;}
      const target={kind,id};
      if(!state.accountLoggedIn){state.pendingSubscription=target;state.subscriptionDialog='login';render();return;}
      finish(target);
    }
    function overlay() {
      const type=state.subscriptionDialog;
      if(!type)return '';
      const descriptions={login:['登录盖世','登录后可同步订阅并接收站内信。'],permission:['接收订阅通知','订阅已保存。开启系统通知可及时收到提醒；暂不开启仍可收到站内信。'],settings:['开启通知提醒','订阅已保存。系统暂不能再次申请通知权限，可前往系统设置开启；站内信不受影响。'],settingsPreview:['系统通知设置','离线演示：此处模拟系统设置，实际 App 将进入系统通知设置页。']};
      const [title,description]=descriptions[type];
      const buttons=type==='login'?action('暂不登录','subscription-close','','secondary')+action('演示登录并订阅','subscription-login','','primary'):type==='permission'?action('暂不开启','subscription-deny','','secondary')+action('允许通知（演示）','subscription-allow','','primary'):type==='settings'?action('暂不开启','subscription-close','','secondary')+action('前往设置','subscription-settings','','primary'):action('返回盖世','subscription-close','','primary');
      return `<div class="subscription-overlay"><section class="subscription-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-title"><h3 id="subscription-title">${title}</h3><p>${description}</p>${type==='login'?'<small>当前为登录流程演示，不连接真实账号。</small>':''}<div>${buttons}</div></section></div>`;
    }
    function handle(name) {
      if(name==='subscription-close'){state.subscriptionDialog='';state.pendingSubscription=null;render();return true;}
      if(name==='subscription-login'){state.accountLoggedIn=true;finish(state.pendingSubscription);return true;}
      if(name==='subscription-deny'){state.notificationPermission='denied';state.subscriptionDialog='';render();return true;}
      if(name==='subscription-allow'){state.notificationPermission='granted';state.subscriptionDialog='';render();return true;}
      if(name==='subscription-settings'){state.subscriptionDialog='settingsPreview';render();return true;}
      return false;
    }
    return {subscribe,overlay,handle};
  }
  // Compare stable identities, not totals: replacing one of five games is still an increment.
  const addedGiveaways=(previous,current)=>{const known=new Set(previous.map(x=>`${x.platform}:${x.id}`));return current.filter(x=>!known.has(`${x.platform}:${x.id}`));};
  window.LAB_SUBSCRIPTIONS={create,addedGiveaways};
})();
