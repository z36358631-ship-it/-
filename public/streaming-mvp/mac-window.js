// 主窗口模拟与账号、远控窗口分别管理；不关闭真实浏览器。
const macAppWindow={status:'visible',running:true};
function macCloseWindowMode(){return remoteMacPrefs().closeWindowBehavior==='quit'?'quit':'hide';}
function macAppWindowButtons(){return '<div class="mac-app-window-actions" aria-label="主窗口操作">'+ib('最小化主窗口','mac-app-minimize','minus')+ib('关闭主窗口','mac-app-close','close')+'</div>';}
const macWindowTitle=remoteMacTitle;
remoteMacTitle=function(){return macWindowTitle().replace('</header>',macAppWindowButtons()+'</header>');};
const macWindowSettings=desktopRemoteSettings;
desktopRemoteSettings=function(){const mode=macCloseWindowMode();const row='<section class="panel list-panel mac-close-window-panel"><div class="line"><label for="mac-close-window-mode" class="grow">关闭窗口时</label><select id="mac-close-window-mode" aria-label="关闭窗口时"><option value="hide" '+(mode==='hide'?'selected':'')+'>隐藏至菜单栏</option><option value="quit" '+(mode==='quit'?'selected':'')+'>退出主程序</option></select></div></section>';return macWindowSettings().replace('<h3>运行与文件</h3>','<h3>运行与文件</h3>'+row);};
function macAppWindowReview(){const state=macAppWindow.status;const label=state==='minimized'?'主窗口已最小化，主程序继续运行。':state==='hidden'?'主窗口已隐藏至菜单栏，主程序继续运行。':'主程序已退出。';const button=state==='quit'?btn('重新打开应用','mac-app-reopen','primary'):btn(state==='minimized'?'从 Dock 恢复':'从菜单栏恢复','mac-app-restore','primary');return '<aside class="sr-demo-note mac-window-review"><div class="row spread"><strong>交互评审 Demo</strong><span>电脑端</span></div><p role="status">'+label+'</p><div class="sr-review-actions">'+button+'</div><p>此处模拟系统入口，不会关闭真实浏览器窗口。</p></aside>';}
const macWindowRender=renderMac;
renderMac=function(){
 if(macAppWindow.status!=='visible'){document.body.classList.add('remote-light');$('#app').innerHTML='<div class="stage sr-stage mac-window-suspended"><div class="mac-window-placeholder" aria-hidden="true"></div>'+macAppWindowReview()+'</div>';return;}
 macWindowRender();const remoteTitle=document.querySelector('.mac-remote-title');if(remoteTitle&&!remoteTitle.querySelector('.mac-app-window-actions'))remoteTitle.insertAdjacentHTML('beforeend',macAppWindowButtons());
};
function macAppWindowReleaseInput(){s.computerModifiers=[];if(typeof cancelRemoteGestures==='function')cancelRemoteGestures();if(typeof remoteTouches!=='undefined')remoteTouches.clear();if(typeof remotePinch!=='undefined')remotePinch=null;if(typeof computerSwipe!=='undefined')computerSwipe=null;}
function macAppWindowHide(state){macPersonal.menu='';remoteUpdateCancel();macAppWindowReleaseInput();macAppWindow.status=state;render();}
function macAppWindowQuit(){
 macPersonal.menu='';remoteUpdateCancel();macAppWindowReleaseInput();remoteMacInvalidate('cancelled');remoteMacClearRuntime();
 standaloneMac.onboarding=false;standaloneMac.policy='';standaloneMac.credential='';standaloneMac.accountError='';standaloneMac.screen='welcome';
 macAppWindow.running=false;macAppWindow.status='quit';render();
}
function macAppWindowReopen(){
 if(macAppWindow.status!=='quit')return;macAppWindow.running=true;macAppWindow.status='visible';
 if(standaloneMac.signed){resumeStandaloneMacIntervals();previousMacState('list');}else{standaloneMac.consent=false;standaloneMac.screen='welcome';remoteMacInvalidate();render();}
}
const macWindowAction=action;
action=function(value){
 if(s.platform!=='mac')return macWindowAction(value);
 if(value==='mac-app-restore'){if(['hidden','minimized'].includes(macAppWindow.status)){macAppWindow.status='visible';render();}return;}
 if(value==='mac-app-reopen'){macAppWindowReopen();return;}
 if(macAppWindow.status!=='visible')return;
 if(value==='mac-app-minimize'){macAppWindowHide('minimized');return;}
 if(value==='mac-app-close'){if(macCloseWindowMode()==='quit')macAppWindowQuit();else macAppWindowHide('hidden');return;}
 return macWindowAction(value);
};
document.addEventListener('change',e=>{if(e.target.id!=='mac-close-window-mode'||!standaloneMac.signed||macAppWindow.status!=='visible')return;const value=e.target.value;if(!['hide','quit'].includes(value))return;remoteMacPrefs().closeWindowBehavior=value;saveMacRemotePreferences();});
window.addEventListener('keydown',e=>{if(macAppWindow.status!=='visible'&&!e.target.closest?.('.mac-window-review')){e.preventDefault();e.stopImmediatePropagation();}},true);
render();
