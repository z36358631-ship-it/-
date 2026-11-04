/* Existing app header, using registered transparent screenshots of native icons. */
function nativeAppbar(){return `<div class="console-appbar native-appbar"><button type="button" class="native-search" data-act="destination" data-title="搜索" aria-label="搜索游戏">${media('icon-search','','native-search-icon')}<span>生化危机7</span></button><button type="button" class="native-header-action native-message" data-act="destination" data-title="消息" aria-label="消息，有未读消息">${media('icon-bell','','native-header-icon')}<i class="native-unread-dot" aria-hidden="true"></i></button><button type="button" class="native-header-action" data-act="destination" data-title="设备" aria-label="设备">${media('icon-device','','native-header-icon')}</button></div>`;}
consoleHeader=function(title,backButton=false){return consoleStatus()+(backButton?`<div class="console-appbar native-subbar">${consoleButton(consoleIcon('back'),'back','aria-label="返回"','console-round')}<h1>${title}</h1></div>`:nativeAppbar());};
const nativeOriginalBusiness=business;
business=function(){
 const template=document.createElement('template');template.innerHTML=nativeOriginalBusiness();
 template.content.querySelectorAll('.business-module .section-title [data-act="destination"]').forEach(button=>{
  if(['秒玩上新','组队云玩'].includes(button.dataset.title))button.remove();
 });
 return template.innerHTML;
};
function nativeNormalizeNavigation(screen){
 if(!screen)return;
 const back=screen.querySelector('.subhead>[data-act="back"]');
 if(back){
  back.innerHTML=consoleIcon('back');back.classList.add('native-back');back.setAttribute('aria-label','返回上一页');
  screen.querySelectorAll('.content [data-act="back"]').forEach(button=>{if(/^(←\s*)?返回$/.test(button.textContent.trim()))button.remove();});
 }
 screen.querySelectorAll('.section-title,.calendar-heading').forEach(header=>{
  const title=header.querySelector('h2,h3');if(!title)return;
  const link=[...header.querySelectorAll('button')].find(button=>button.classList.contains('calendar-more')||/^更多/.test(button.textContent.trim()));
  if(!link)return;
  link.innerHTML=consoleIcon('back');link.classList.add('native-section-link');link.setAttribute('aria-label',`查看${title.textContent.trim()}`);
  header.classList.add('native-section-heading');title.insertAdjacentElement('afterend',link);
  if(header.classList.contains('calendar-heading')){
   const date=header.querySelector('.calendar-today');
   if(date){date.textContent=date.textContent.replace(/\s*·\s*今天\s*$/,'');date.insertAdjacentElement('afterend',link);}
   header.querySelector('.calendar-entry')?.remove();
  }
 });
}
const nativeHeaderRender=render;
render=function(preserve=false){
 nativeHeaderRender(preserve);
 if(['home','pc'].includes(appState.page)){const old=document.querySelector('.screen .appbar');if(old)old.outerHTML=nativeAppbar();}
 const screen=document.querySelector('.screen.device-landscape,.screen.device-tablet');
 const bar=screen?.querySelector('.native-appbar'),nav=screen?.querySelector('.device-top-nav');
 if(bar&&nav){const row=document.createElement('div');row.className='native-wide-header';bar.parentNode.insertBefore(row,bar);row.append(nav,bar);}
 nativeNormalizeNavigation(document.querySelector('.screen'));
};
