/* Device shells are review-only DOM. No native execution or emulator input is claimed. */
const deviceState={os:'android',form:'portrait',pressed:new Set(),sticks:{left:{x:0,y:0},right:{x:0,y:0}}};
const deviceBaseRender=render;
const devicePointerSticks=new Map();
const devicePointerButtons=new Map();
function deviceSceneImage(game){
  if(typeof consoleSceneImage==='function')return consoleSceneImage(game.key,game.name+'游戏场景');
  return media(game.key,game.name+'游戏场景');
}
function devicePadButton(label,key,cls='',attrs=''){
  return `<button type="button" class="pc-pad-button ${cls}" data-pad="${key}" aria-label="${key}" aria-pressed="false" ${attrs}>${label}</button>`;
}
function deviceStick(side){
  return `<div class="pc-stick pc-stick-${side}" data-stick="${side}" tabindex="0" role="group" aria-label="${side==='left'?'左':'右'}摇杆" aria-roledescription="虚拟摇杆"><span class="pc-stick-rim"></span><span class="pc-stick-cap"><i></i></span></div>`;
}
function deviceDpad(){
 return `<div class="pc-dpad" role="group" aria-label="十字方向键"><span class="pc-dpad-cross"></span>${devicePadButton('<span></span>','方向上','pc-dpad-key pc-dpad-up')}${devicePadButton('<span></span>','方向左','pc-dpad-key pc-dpad-left')}${devicePadButton('<span></span>','方向右','pc-dpad-key pc-dpad-right')}${devicePadButton('<span></span>','方向下','pc-dpad-key pc-dpad-down')}<span class="pc-dpad-center"></span></div>`;
}
function deviceControls(){
 return `<div class="console-player-lower pc-control-deck" aria-label="PC虚拟控制器"><div class="pc-shoulders"><div>${devicePadButton('LT','LT','pc-trigger')}${devicePadButton('LB','LB','pc-bumper')}</div><span class="pc-deck-brand">GAMEHUB <i></i></span><div>${devicePadButton('RB','RB','pc-bumper')}${devicePadButton('RT','RT','pc-trigger')}</div></div><div class="pc-control-field">${deviceStick('left')}${deviceDpad()}<div class="pc-face-buttons" role="group" aria-label="ABXY按键">${devicePadButton('Y','Y','pc-face pc-face-y')}${devicePadButton('X','X','pc-face pc-face-x')}${devicePadButton('B','B','pc-face pc-face-b')}${devicePadButton('A','A','pc-face pc-face-a')}</div>${deviceStick('right')}<div class="pc-center-mark"><span>G</span><i></i></div></div><div class="pc-bottom-controls"><div>${devicePadButton('<span></span>','SELECT','pc-small-system')}<small>SELECT</small></div>${consoleButton('<span>G</span>','menu','aria-label="打开游戏菜单"','pc-hub-menu')}<div>${devicePadButton('<span></span>','START','pc-small-system')}<small>START</small></div></div><span class="console-preview-chip pc-preview-note">静态画面演示 · 按键仅作交互预览</span></div>`;
}
consolePlayer=function(){
 const game=consoleGame();
 return `<div class="screen portrait console-skin console-player-screen pc-player"><div class="status console-status"><span>9:41</span><span class="console-status-right"><i></i><i></i><i></i><span class="console-battery"></span></span></div><div class="console-player-top"><span><i class="pc-running-dot"></i>${game.name}</span>${consoleButton(consoleIcon('menu'),'menu','aria-label="打开游戏菜单"','console-round')}</div><div class="console-player-art pc-game-display">${deviceSceneImage(game)}<span class="pc-scene-label">PC · 画面预览</span></div>${deviceControls()}${consoleState.menu?`<div class="console-menu-scrim"><section class="console-game-menu" role="dialog" aria-modal="true" aria-label="游戏菜单"><span class="console-menu-handle"></span><span class="console-overline">GAMEHUB MENU</span><h2>${game.name}</h2><p>随时回到你的游戏空间</p>${consoleButton(`${consoleIcon('play')}返回画面`,'menu','','console-primary')}${consoleButton('回到游戏空间','space','','console-secondary')}${consoleButton('返回游戏库','library','','console-menu-exit')}</section></div>`:''}</div>`;
};
function deviceCamera(){return `<span class="hardware-camera" aria-hidden="true"><i></i></span><i class="hardware-side hardware-action" aria-hidden="true"></i><i class="hardware-side hardware-volume" aria-hidden="true"></i><i class="hardware-side hardware-power" aria-hidden="true"></i>`;}
function deviceSystemBar(){return '<div class="device-system-bar" aria-hidden="true"><span></span></div>';}
function deviceMakeDuoUpper(screen){
 const upper=document.createElement('section');upper.className='device-duo-upper';upper.setAttribute('aria-label','上屏游戏展示');
 upper.innerHTML=`<div class="device-duo-status">${consoleStatus()}</div>`;
 let content=null;
 if(appState.page==='steam')content=screen.querySelector('.console-showcase');
 else if(appState.page==='console-player')content=screen.querySelector('.console-player-art');
 else if(appState.page==='console-game')content=screen.querySelector('.console-game-hero');
 if(content){upper.append(content);}
 else {const game=consoleGame();const preview=document.createElement('div');preview.className='device-duo-preview';preview.innerHTML=`${deviceSceneImage(game)}<div><small>${game.english}</small><strong>${game.name}</strong>${appState.page==='console-launch'?`<span>${consoleLaunchStages[consoleState.stage]}…</span>`:''}</div>`;upper.append(preview);}
 return upper;
}
function deviceMount(){
 deviceState.pressed.clear();devicePointerSticks.clear();devicePointerButtons.clear();deviceState.sticks={left:{x:0,y:0},right:{x:0,y:0}};
 const screen=document.querySelector('#center .screen');if(!screen)return;
 screen.classList.remove('portrait','landscape');screen.classList.add('device-'+deviceState.form);
 const hardware=document.createElement('div');hardware.className=`hardware-device os-${deviceState.os} form-${deviceState.form}`;hardware.setAttribute('data-device-os',deviceState.os);hardware.setAttribute('data-device-form',deviceState.form);
 screen.parentNode.insertBefore(hardware,screen);
 if(deviceState.form==='duo'){
  const upper=deviceMakeDuoUpper(screen);hardware.append(upper);
  const hinge=document.createElement('div');hinge.className='hardware-hinge';hinge.setAttribute('aria-hidden','true');hinge.innerHTML='<i></i>';hardware.append(hinge);
  if(consoleState.menu&&appState.page==='console-player'){upper.inert=true;upper.setAttribute('aria-hidden','true');}
 }
 hardware.append(screen);hardware.insertAdjacentHTML('beforeend',deviceCamera());
 screen.insertAdjacentHTML('beforeend',deviceSystemBar());
 if(['landscape','tablet'].includes(deviceState.form)){
  screen.querySelector('.console-foot-curve')?.remove();
  const navigation=screen.querySelector('.bottom');
  if(navigation){navigation.className='device-top-nav';const anchor=screen.querySelector('.content')||screen.querySelector('.console-player-art');if(anchor)screen.insertBefore(navigation,anchor);if(consoleState.menu){navigation.inert=true;navigation.setAttribute('aria-hidden','true');}}
  if(appState.page==='steam'){
   const content=screen.querySelector('.console-library-content');
   const showcase=content?.querySelector('.console-showcase');
   if(content&&showcase){const display=document.createElement('div');display.className='device-library-display';display.append(showcase);const picker=document.createElement('div');picker.className='device-library-picker';[...content.children].forEach(child=>picker.append(child));content.append(display,picker);}
  }
 }
}
render=function(preserve=false){deviceBaseRender(preserve);deviceMount();};
function deviceSetPressed(button,pressed){
 const key=button.dataset.pad;button.classList.toggle('is-pressed',pressed);button.setAttribute('aria-pressed',String(pressed));if(pressed){deviceState.pressed.add(key);consoleTone('tick');}else deviceState.pressed.delete(key);
}
function deviceUpdateStick(element,dx,dy){
 const radius=element.clientWidth*.24,length=Math.hypot(dx,dy),scale=length>radius?radius/length:1;
 const x=dx*scale,y=dy*scale; element.style.setProperty('--stick-x',x+'px');element.style.setProperty('--stick-y',y+'px');element.classList.toggle('is-dragging',length>0);deviceState.sticks[element.dataset.stick]={x:Math.round(x/radius*100),y:Math.round(y/radius*100)};
}
document.addEventListener('pointerdown',event=>{
 if(appState.page!=='console-player'||consoleState.menu)return;
 const stick=event.target.closest('[data-stick]');
 if(stick){event.preventDefault();stick.focus({preventScroll:true});stick.setPointerCapture(event.pointerId);const rect=stick.getBoundingClientRect();devicePointerSticks.set(event.pointerId,{element:stick,x:rect.left+rect.width/2,y:rect.top+rect.height/2});deviceUpdateStick(stick,event.clientX-rect.left-rect.width/2,event.clientY-rect.top-rect.height/2);return;}
 const button=event.target.closest('[data-pad]');if(!button)return;event.preventDefault();button.focus({preventScroll:true});button.setPointerCapture(event.pointerId);devicePointerButtons.set(event.pointerId,button);deviceSetPressed(button,true);
},true);
document.addEventListener('pointermove',event=>{const pointer=devicePointerSticks.get(event.pointerId);if(!pointer)return;event.preventDefault();deviceUpdateStick(pointer.element,event.clientX-pointer.x,event.clientY-pointer.y);},{capture:true,passive:false});
function deviceReleasePointer(event){const pointer=devicePointerSticks.get(event.pointerId);if(pointer){deviceUpdateStick(pointer.element,0,0);devicePointerSticks.delete(event.pointerId);}const button=devicePointerButtons.get(event.pointerId);if(button){devicePointerButtons.delete(event.pointerId);if(![...devicePointerButtons.values()].some(other=>other.dataset.pad===button.dataset.pad))deviceSetPressed(button,false);}}
document.addEventListener('pointerup',deviceReleasePointer,true);document.addEventListener('pointercancel',deviceReleasePointer,true);
window.addEventListener('blur',()=>{document.querySelectorAll('[data-pad].is-pressed').forEach(button=>deviceSetPressed(button,false));devicePointerButtons.clear();devicePointerSticks.forEach(pointer=>deviceUpdateStick(pointer.element,0,0));devicePointerSticks.clear();});
window.addEventListener('keydown',event=>{
 const stick=event.target.closest?.('[data-stick]');
 if(stick&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();const [x,y]={ArrowLeft:[-22,0],ArrowRight:[22,0],ArrowUp:[0,-22],ArrowDown:[0,22]}[event.key];deviceUpdateStick(stick,x,y);return;}
 const button=event.target.closest?.('[data-pad]');if(button&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();deviceSetPressed(button,true);}
},true);
window.addEventListener('keyup',event=>{const stick=event.target.closest?.('[data-stick]');if(stick&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))deviceUpdateStick(stick,0,0);const button=event.target.closest?.('[data-pad]');if(button&&['Enter',' '].includes(event.key))deviceSetPressed(button,false);},true);
window.CONSOLE_DEVICE_PREVIEW={
 setOS(os){if(!['ios','android'].includes(os))throw new TypeError('Unknown device OS');if(deviceState.form==='duo'&&os==='android')return deviceState.os;deviceState.os=os;render(true);return os;},
 getOS(){return deviceState.os;},
 setForm(form){if(!['portrait','landscape','tablet','duo'].includes(form))throw new TypeError('Unknown device form');deviceState.form=form;if(form==='duo')deviceState.os='ios';render(true);return form;},
 getForm(){return deviceState.form;},
 getState(){return {os:deviceState.os,form:deviceState.form,pressed:[...deviceState.pressed],sticks:JSON.parse(JSON.stringify(deviceState.sticks))};}
};
