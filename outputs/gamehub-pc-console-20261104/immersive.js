/* D040: selected game scene and a direct launch action. Existing launch remains a local simulation. */
function consoleSceneSource(key){
  return (typeof CONSOLE_SCENES!=='undefined'&&CONSOLE_SCENES[key])||ASSETS[key]||'';
}
function consoleSceneImage(key,alt='',cls=''){
  return `<img class="media-image ${cls}" src="${consoleSceneSource(key)}" alt="${esc(alt)}" decoding="async">`;
}
consoleLibrary=function(){
  const g=consoleGame();
  return `<div class="screen portrait console-skin console-library immersive-library">${consoleHeader('我的游戏')}<div class="content console-library-content" tabindex="0" aria-label="个人游戏库"><section class="console-showcase immersive-showcase" aria-label="选中游戏"><div class="console-wallpaper" aria-hidden="true">${consoleSceneImage(g.key)}</div><button class="console-feature-art" data-act="console-open" aria-label="查看${g.name}游戏空间">${consoleSceneImage(g.key,g.name+'游戏场景')}<span class="immersive-scene-shade"></span></button><div class="console-showcase-top"><span><i></i> PC 游戏</span><span>最近游玩</span></div><div class="immersive-hero-content"><div class="console-feature-copy"><span class="console-overline">${g.english}</span><h2>${g.name}</h2><p>${g.line}</p></div><div class="immersive-start-row">${consoleButton(`${consoleIcon('play')}<span>开始游戏</span>`,'launch',`aria-label="开始游戏：${g.name}"`,'console-primary immersive-direct-start')}${consoleButton('游戏空间 <span aria-hidden="true">›</span>','open',`aria-label="查看${g.name}游戏空间"`,'immersive-space-link')}</div></div></section><div class="console-shelf-heading"><h2>我的游戏 <small>${consoleGames.length}</small></h2><span>上次游玩 ${g.last}</span></div><div class="console-channels" role="group" aria-label="选择游戏">${consoleGames.map((item,i)=>`<button class="console-channel ${i===consoleState.selected?'is-focused':''}" data-act="console-select" data-index="${i}" aria-label="${item.name}${i===consoleState.selected?'，已选中':''}" aria-pressed="${i===consoleState.selected}">${media(item.key,item.name)}<span class="console-channel-copy"><b>${item.name}</b></span><span class="console-channel-dot"></span></button>`).join('')}</div></div>${consoleFooter()}</div>`;
};
const immersiveBaseStart=consoleStart;
const immersiveBaseGame=consoleGame;
const immersiveBaseSelect=consoleSelect;
let immersiveLaunchOrigin=null;
let immersiveLaunchGame=null;
consoleGame=function(){
  if(appState.page==='console-launch'&&immersiveLaunchGame)return immersiveLaunchGame;
  return immersiveBaseGame();
};
consoleSelect=function(index,focus=false){
  if(appState.page==='console-launch')return;
  immersiveBaseSelect(index,focus);
};
consoleStart=function(){
  if(appState.page==='console-launch')return;
  immersiveLaunchOrigin={snapshot:snapshot(),trail:trail.slice(),selected:consoleState.selected};
  immersiveLaunchGame=immersiveBaseGame();
  immersiveBaseStart();
};
function immersiveCancelLaunch(){
  if(appState.page!=='console-launch')return;
  consoleCancelTimer();
  const origin=immersiveLaunchOrigin;
  immersiveLaunchOrigin=null;immersiveLaunchGame=null;consoleState.menu=false;
  if(!origin){appState.page='console-game';render();return;}
  const previous=origin.snapshot;
  consoleState.selected=origin.selected;
  trail.splice(0,trail.length,...origin.trail);
  Object.assign(appState,{page:previous.page,detail:previous.detail,mode:'portrait',communityScope:previous.scope,navCollapsed:previous.navCollapsed});
  render();
  const content=document.querySelector('.content');
  if(content){recordingRestore=true;content.scrollTop=previous.scroll;previousScroll=previous.scroll;requestAnimationFrame(()=>recordingRestore=false);}
}
window.addEventListener('click',event=>{
  const button=event.target.closest('[data-act="console-cancel"]');
  if(!button||appState.page!=='console-launch')return;
  event.preventDefault();event.stopImmediatePropagation();immersiveCancelLaunch();
},true);
window.addEventListener('keydown',event=>{
  if(appState.page==='steam'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&!/input|textarea|select/i.test(event.target.tagName)){
    const grid=document.querySelector('.console-channels');
    const columns=grid?getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length:1;
    event.preventDefault();event.stopImmediatePropagation();
    consoleSelect(consoleState.selected+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key]),true);return;
  }
  if((event.key==='Escape'||event.key.toLowerCase()==='b')&&appState.page==='console-launch'){
    event.preventDefault();event.stopImmediatePropagation();immersiveCancelLaunch();return;
  }
  if(event.key!=='Enter'||appState.page!=='steam'||event.repeat||/input|textarea|select/i.test(event.target.tagName))return;
  const focusedChannel=event.target.closest?.('[data-act="console-select"]');
  const canvas=event.target.closest?.('.console-library');
  if(focusedChannel||(canvas&&!event.target.closest('button,a,summary'))||event.target===document.body){
    event.preventDefault();event.stopImmediatePropagation();consoleStart();
  }
},true);
