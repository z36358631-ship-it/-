// Native-style More and Account menus, reusing the existing Mac workspace.
const macPersonal={menu:'',avatarNote:false};
function macPersonalMenu(){if(!standaloneMac.signed||!macPersonal.menu)return '';if(macPersonal.menu==='account')return '<section class="personal-dropdown mac-account-popover" aria-label="个人账号"><h3>个人账号</h3><div class="row"><button class="personal-avatar" data-action="mac-avatar" aria-label="账户头像">'+icon('user')+'</button><div class="grow"><strong>'+(standaloneMac.signed?'盖世玩家':'未登录')+'</strong><small>'+(standaloneMac.signed?esc(standaloneMac.accountIdentity||'盖世演示账号'):'登录后查看个人账号')+'</small></div></div>'+(standaloneMac.signed?'<p class="personal-avatar-note">'+(macPersonal.avatarNote?'演示头像；正式资料由盖世账号体系提供。':'盖世游戏账号')+'</p>':btn('登录','sr-open-login','primary'))+'</section>';return '<nav class="personal-dropdown mac-more-menu" aria-label="更多菜单">'+(standaloneMac.signed?remoteSupportRow('本机设置','mac-more:settings','settings')+remoteSupportRow('连接教程','mac-more:guide','monitor'):'')+remoteSupportRow('帮助中心','mac-support:help','info')+remoteSupportRow('检查更新','mac-support:update','refresh','当前版本：MVP 演示版')+remoteSupportRow('关于','mac-support:about','info')+(standaloneMac.signed?remoteSupportRow('退出登录','sr-logout','power'):'')+'</nav>';}
remoteMacTitle=function(){return '<header class="sr-titlebar">'+remoteMark()+'<strong>盖世远程</strong><div class="grow"></div>'+(standaloneMac.signed?'<button class="ghost mac-account-entry" data-action="mac-account" aria-label="账户" aria-expanded="'+(macPersonal.menu==='account')+'">'+icon('user')+'<span>账户</span></button><button class="ghost mac-more-entry" data-action="mac-more-toggle" aria-expanded="'+(macPersonal.menu==='more')+'">更多'+icon('chevron')+'</button>':'')+'</header>';};
const macPersonalRender=renderMac;
renderMac=function(){macPersonalRender();document.body.classList.add('remote-light');const shell=document.querySelector('.sr-client');if(shell&&s.page!=='session')shell.insertAdjacentHTML('beforeend',macPersonalMenu());};
const macPersonalFinish=remoteMacFinish;
remoteMacFinish=function(method='code'){const a=standaloneMac;if(!a.consent||a.signed)return false;const record=a.challenge?RemoteQrDemo.get(a.challenge.id):null;a.accountIdentity=method==='qr'?(record?.account||'盖世扫码账号'):method==='google'?'Google 演示账号':a.credential?(a.region==='overseas'?a.credential.replace(/^(.{2}).*(@.*)$/,'$1***$2'):a.credential.slice(0,3)+'****'+a.credential.slice(-4)):'盖世演示账号';if(record&&method!=='qr')RemoteQrDemo.update(record.id,'cancelled');macPersonal.menu='';return macPersonalFinish();};
const macPersonalBaseWelcome=remoteMacWelcome;
remoteMacWelcome=function(){if(s.macSupportPublic)return remoteSupportPage(s.macSupportPublic,'mac');return macPersonalBaseWelcome();};
const macPersonalAction=action;
action=function(value){
 if(value==='mac-account'||value==='mac-more-toggle'){if(!standaloneMac.signed){macPersonal.menu='';return;}const key=value==='mac-account'?'account':'more';macPersonal.menu=macPersonal.menu===key?'':key;render();return;}
 if(value==='mac-avatar'){macPersonal.avatarNote=!macPersonal.avatarNote;render();return;}
 if(value.startsWith('mac-support:')){const kind=value.split(':')[1];macPersonal.menu='';if(kind==='check'){remoteSupportState.checked=true;render();return;}if(kind.startsWith('policy-')){const note=document.getElementById('support-policy-note');if(note)note.textContent='正式内容与地址待接入，当前 Demo 仅展示入口。';return;}if(kind==='help')remoteSupportState.query='';if(kind==='update')remoteSupportState.checked=false;if(standaloneMac.signed){s.page='support-'+kind;}else{s.macSupportPublic=kind;standaloneMac.screen='welcome';}render();return;}
 if(value.startsWith('mac-article:')){remoteSupportState.article=value.split(':')[1];if(standaloneMac.signed)s.page='support-article';else s.macSupportPublic='article';render();return;}
 if(value.startsWith('mac-more:')){macPersonal.menu='';if(!standaloneMac.signed)return;if(value.endsWith('settings'))return macPersonalAction('remote-settings');return macPersonalAction('guide');}
 if(value==='sr-logout'||value.startsWith('sr-state:')||value==='sr-open-login'){macPersonal.menu='';s.macSupportPublic='';}
 return macPersonalAction(value);
};
document.addEventListener('click',e=>{if(macPersonal.menu&&!e.target.closest('.personal-dropdown,.mac-account-entry,.mac-more-entry')){macPersonal.menu='';render();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&macPersonal.menu){macPersonal.menu='';render();}});
render();

function macObserveDemoQr(){const a=standaloneMac,c=a.challenge;if(a.signed||!c)return;const r=RemoteQrDemo.get(c.id);if(!r)return;if(r.state==='scanned'&&a.qr==='waiting'&&remoteMacChallengeValid(c.id)){a.qr='pending';render();}else if(r.state==='confirmed'&&remoteMacChallengeValid(c.id)){RemoteQrDemo.update(c.id,'completed');remoteMacFinish('qr');}else if(['cancelled','expired','failed'].includes(r.state)&&a.qr!==r.state){a.qr=r.state;a.challenge=null;render();}}
window.addEventListener('storage',e=>{if(e.key?.startsWith(RemoteQrDemo.prefix))macObserveDemoQr();});
setInterval(macObserveDemoQr,1000);
