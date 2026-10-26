// Personal center and two root tabs for the portrait mobile client.
function mobileRootNav(){if(!mobileAuth.loggedIn||!['list','mobile-profile'].includes(s.page))return '';return '<nav class="bottom mobile-root-tabs" aria-label="主导航" role="tablist"><button role="tab" aria-selected="'+(s.page==='list')+'" class="'+(s.page==='list'?'selected':'')+'" data-action="mobile-tab:devices">'+icon('monitor')+'<span>我的设备</span></button><button role="tab" aria-selected="'+(s.page==='mobile-profile')+'" class="'+(s.page==='mobile-profile'?'selected':'')+'" data-action="mobile-tab:profile">'+icon('user')+'<span>我的</span></button></nav>';}
function mobilePersonalAccount(){return '<section class="personal-account-card"><button class="personal-avatar" aria-label="账户头像" data-action="mobile-account">'+icon('user')+'</button><div class="grow"><strong>盖世玩家</strong><p>盖世账号 · '+esc(mobileMaskedPhone(mobileAuth.accountPhone))+'</p></div>'+ib('查看个人账号','mobile-account','chevron')+'</section>';}
function mobileProfilePage(){return '<header class="head personal-head"><h1>我的</h1>'+ib('扫一扫','remote-scan-open','scan')+'</header><main class="content personal-page">'+mobilePersonalAccount()+'<section class="personal-panel">'+remoteSupportRow('帮助中心','mobile-support:help','info')+remoteSupportRow('检查更新','mobile-support:update','refresh','当前版本：MVP 演示版')+remoteSupportRow('设置','mobile-settings-open','settings')+'</section></main>';}
function mobileSettingsPage(){return '<header class="head personal-head">'+ib('返回我的','mobile-personal-back','back')+'<h1>设置</h1>'+ib('扫一扫','remote-scan-open','scan')+'</header><main class="content personal-page"><section class="personal-panel">'+remoteSupportRow('关于','mobile-support:about','info')+'</section><section class="personal-panel personal-logout">'+remoteSupportRow('退出登录','mobile-logout','power')+'</section></main>';}
mobileAccountMenu=function(){return s.mobileAccountMenu?'<section class="menu-small mobile-account-menu personal-account-popover" aria-label="个人账号"><div class="row spread"><strong>个人账号</strong>'+ib('关闭个人账号','mobile-account','close')+'</div><div class="row"><button class="personal-avatar" aria-label="账户头像" data-action="mobile-avatar">'+icon('user')+'</button><div class="grow"><strong>盖世玩家</strong><small>'+esc(mobileMaskedPhone(mobileAuth.accountPhone))+'</small></div></div><p class="personal-avatar-note">'+(s.personalAvatarNote?'演示头像；正式资料由盖世账号体系提供。':'盖世游戏账号')+'</p></section>':'';};
const mobilePersonalRender=renderContent;
renderContent=function(){mobilePersonalRender();document.body.classList.add('remote-light');};
const mobilePersonalClear=mobileClearAccountState;
mobileClearAccountState=function(){s.personalAvatarNote=false;s.mobilePersonalReturn='mobile-profile';remoteSupportState.query='';remoteSupportState.article='';remoteSupportState.checked=false;return mobilePersonalClear();};
const mobilePersonalAction=action;
action=function(value){
 if(value.startsWith('mobile-tab:')){if(!mobileAuth.loggedIn)return;s.mobileAccountMenu=false;s.page=value.endsWith('profile')?'mobile-profile':'list';render();return;}
 if(value==='mobile-settings-open'){if(!mobileAuth.loggedIn)return;s.mobileAccountMenu=false;s.page='mobile-settings';render();return;}
 if(value==='mobile-personal-back'){s.page=s.page==='mobile-settings'?'mobile-profile':s.page==='support-article'?'support-help':s.mobileSupportReturn||'mobile-profile';render();return;}
 if(value==='mobile-avatar'){s.personalAvatarNote=!s.personalAvatarNote;render();return;}
 if(value.startsWith('mobile-support:')){if(!mobileAuth.loggedIn)return;const kind=value.split(':')[1];if(s.page==='mobile-profile')s.mobileSupportReturn='mobile-profile';else if(s.page==='mobile-settings')s.mobileSupportReturn='mobile-settings';if(kind==='check'){remoteSupportState.checked=true;render();return;}if(kind.startsWith('policy-')){const note=document.getElementById('support-policy-note');if(note)note.textContent='正式内容与地址待接入，当前 Demo 仅展示入口。';return;}if(kind==='help')remoteSupportState.query='';if(kind==='update')remoteSupportState.checked=false;s.page='support-'+kind;render();return;}
 if(value.startsWith('mobile-article:')){remoteSupportState.article=value.split(':')[1];s.page='support-article';render();return;}
 if(value==='remote-scan-open')s.mobileScanReturn=['mobile-profile','mobile-settings'].includes(s.page)?s.page:'mobile-profile';
 return mobilePersonalAction(value);
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&s.mobileAccountMenu){s.mobileAccountMenu=false;render();}});
if(['my','profile','mobile-profile','settings','mobile-settings'].includes(params.get('state'))){mobilePreview('list');s.page=['settings','mobile-settings'].includes(params.get('state'))?'mobile-settings':'mobile-profile';}
render();
