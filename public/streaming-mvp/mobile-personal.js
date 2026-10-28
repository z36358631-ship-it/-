// 移动端个人页：静态账号展示，功能直接进入，不再增加设置层级。
function mobileRootNav(){if(!mobileAuth.loggedIn||!['list','mobile-profile'].includes(s.page))return '';return '<nav class="bottom mobile-root-tabs" aria-label="主导航" role="tablist"><button role="tab" aria-selected="'+(s.page==='list')+'" class="'+(s.page==='list'?'selected':'')+'" data-action="mobile-tab:devices">'+icon('monitor')+'<span>我的设备</span></button><button role="tab" aria-selected="'+(s.page==='mobile-profile')+'" class="'+(s.page==='mobile-profile'?'selected':'')+'" data-action="mobile-tab:profile">'+icon('user')+'<span>我的</span></button></nav>';}
function mobilePersonalAccount(){return '<section class="personal-account-card"><span class="personal-avatar" role="img" aria-label="账户头像">'+icon('user')+'</span><div class="grow"><div class="personal-nickname-row"><strong>盖世玩家</strong>'+remoteLogoutButton('mobile')+'</div><p>盖世账号 · '+esc(mobileMaskedPhone(mobileAuth.accountPhone))+'</p></div></section>';}
function mobileProfilePage(){return '<main class="content personal-page"><div class="personal-profile-actions">'+ib('扫一扫','remote-scan-open','scan')+'</div>'+mobilePersonalAccount()+'<section class="personal-panel">'+remoteSupportRow('帮助中心','mobile-support:help','info')+remoteUpdateRow('mobile')+remoteSupportRow('关于','mobile-support:about','info')+'</section></main>';}
mobileAccountMenu=function(){return '';};
const mobilePersonalRender=renderContent;
renderContent=function(){mobilePersonalRender();document.body.classList.add('remote-light');document.querySelector('.mobile-independent-shell')?.insertAdjacentHTML('beforeend',remoteUpdateModal('mobile')+remoteLogoutModal('mobile'));document.querySelector('.mobile-preview-tools')?.insertAdjacentHTML('beforeend',remoteUpdateReview());};
const mobilePersonalClear=mobileClearAccountState;
mobileClearAccountState=function(){s.mobilePersonalReturn='mobile-profile';remoteSupportState.query='';remoteSupportState.article='';remoteUpdateCancel();return mobilePersonalClear();};
const mobilePersonalAction=action;
action=function(value){
 if(remoteLogoutAction(value,'mobile',()=>mobilePersonalAction('mobile-logout')))return;
 if(remoteUpdateAction(value,'mobile'))return;
 if(value==='mobile-account'||value==='mobile-avatar'){s.mobileAccountMenu=false;return;}
 if(!['mobile-support:update','mobile-support:check'].includes(value))remoteUpdateCancel();
 if(value.startsWith('mobile-tab:')){if(!mobileAuth.loggedIn)return;s.mobileAccountMenu=false;s.page=value.endsWith('profile')?'mobile-profile':'list';render();return;}
 if(value==='mobile-settings-open'){if(!mobileAuth.loggedIn)return;s.page='mobile-profile';render();return;}
 if(value==='mobile-personal-back'){s.page=s.page==='support-article'?'support-help':'mobile-profile';render();return;}
 if(value.startsWith('mobile-support:')){if(!mobileAuth.loggedIn)return;const kind=value.split(':')[1];if(kind==='update'||kind==='check'){remoteUpdateCheck('mobile');return;}if(kind.startsWith('policy-')){const note=document.getElementById('support-policy-note');if(note)note.textContent='正式内容与地址待接入，当前 Demo 仅展示入口。';return;}if(kind==='help')remoteSupportState.query='';s.page='support-'+kind;render();return;}
 if(value.startsWith('mobile-article:')){remoteSupportState.article=value.split(':')[1];s.page='support-article';render();return;}
 if(value==='remote-scan-open')s.mobileScanReturn='mobile-profile';
 return mobilePersonalAction(value);
};
if(['my','profile','mobile-profile','settings','mobile-settings'].includes(params.get('state'))){mobilePreview('list');s.page='mobile-profile';}
render();
