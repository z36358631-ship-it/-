/* Existing app header, using registered transparent screenshots of native icons. */
function nativeAppbar(){return `<div class="console-appbar native-appbar"><button type="button" class="native-search" data-act="destination" data-title="搜索" aria-label="搜索游戏">${media('icon-search','','native-search-icon')}<span>生化危机7</span></button><button type="button" class="native-header-action native-message" data-act="destination" data-title="消息" aria-label="消息，有未读消息">${media('icon-bell','','native-header-icon')}<i class="native-unread-dot" aria-hidden="true"></i></button><button type="button" class="native-header-action" data-act="destination" data-title="设备" aria-label="设备">${media('icon-device','','native-header-icon')}</button></div>`;}
consoleHeader=function(title,backButton=false){return consoleStatus()+(backButton?`<div class="console-appbar native-subbar">${consoleButton(consoleIcon('back'),'back','aria-label="返回"','console-round')}<h1>${title}</h1></div>`:nativeAppbar());};
const nativeHeaderRender=render;
render=function(preserve=false){
 nativeHeaderRender(preserve);
 if(['home','pc'].includes(appState.page)){const old=document.querySelector('.screen .appbar');if(old)old.outerHTML=nativeAppbar();}
 const screen=document.querySelector('.screen.device-landscape,.screen.device-tablet');
 const bar=screen?.querySelector('.native-appbar'),nav=screen?.querySelector('.device-top-nav');
 if(bar&&nav){const row=document.createElement('div');row.className='native-wide-header';bar.parentNode.insertBefore(row,bar);row.append(nav,bar);}
};
