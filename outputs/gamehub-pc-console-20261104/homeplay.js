/* Homepage direction study. Installation/history are review fixtures, never device tests. */
const homePlayState={audience:'returning',selected:0,paused:false};
const homePlayOrder=[1,2,0,3];
const homePlayCopy={
 hades:{genre:'动作肉鸽',title:'冲出冥界，再来一局',description:'挥剑、闪避，搭配神祇祝福。每次出发，都有新打法。'},
 cyber:{genre:'开放世界',title:'今晚，去夜之城兜一圈',description:'开车穿过霓虹街头，接一单委托，走进你的赛博人生。'},
 elden:{genre:'开放世界 · 动作',title:'下一片风景，在迷雾之后',description:'骑马探索交界地，挑战强敌，找到属于自己的冒险路线。'},
 wukong:{genre:'动作冒险',title:'提起金箍棒，踏上取经路',description:'看破招式，闪身反击，在熟悉的西游故事里迎战妖王。'}
};
let homePlayObserver=null,homePlayPointer=null;
const homePlayMotion=matchMedia('(prefers-reduced-motion: reduce)');
function homePlayGame(){return consoleGames[homePlayOrder[homePlayState.selected]];}
function homePlayReady(game){return homePlayState.audience==='returning'&&['elden','hades'].includes(game.key);}
function homePlayMedia(game){
 const clip=game.key==='hades'&&typeof HOME_PLAY_CLIP==='string';
 const poster=clip?HOME_PLAY_POSTER:consoleSceneSource(game.key);
 return `<div class="homeplay-media">${clip?`<video class="homeplay-video" poster="${poster}" muted playsinline loop preload="none" aria-label="哈迪斯官方玩法片段"></video>`:`<img src="${poster}" alt="${game.name}官方游戏画面" decoding="async">`}<span class="homeplay-media-source">${clip?'官方玩法':'官方游戏画面'}</span>${clip?`<button type="button" class="homeplay-motion" data-act="homeplay-motion" aria-label="播放玩法片段" aria-pressed="false">▶</button>`:''}</div>`;
}
function homePlayAction(game,cls='homeplay-start'){
 const ready=homePlayReady(game);
 return `<button type="button" class="${cls}" data-act="${ready?'homeplay-start':'homeplay-detail'}" data-key="${game.key}" aria-label="${ready?'开始游戏':'查看游戏'}：${game.name}">${ready?consoleIcon('play'):''}<span>${ready?'开始游戏':'查看游戏'}</span>${ready?'':'<span aria-hidden="true">↗</span>'}</button>`;
}
const homePlayOriginalContinue=continueStrip;
continueStrip=function(){
 if(appState.page!=='home')return homePlayOriginalContinue();
 if(homePlayState.audience==='new'||!appState.recent||appState.recentFolded)return '';
 const game=consoleGames[0];
 return `<div class="continue-row homeplay-continue" data-testid="continue-strip"><span class="continue-label"><span aria-hidden="true">▷</span>继续</span>${media(game.key,game.name,'homeplay-recent-cover')}<div class="homeplay-recent-copy"><b>${game.name}</b><small>上次游玩 ${game.last}</small></div>${homePlayAction(game,'homeplay-recent-start')}</div>`;
};
function homePlayModule(){
 const game=homePlayGame(),copy=homePlayCopy[game.key],ready=homePlayReady(game);
 const heading=`<div class="section-title"><h2>本机可玩</h2><button type="button" data-act="open-compatibility">更多 ›</button></div>`;
 if(appState.playableMode!=='known')return `<section class="section homeplay-module playable-module" data-module="playable">${heading}<div class="state-block">${appState.playableMode==='unknown'?'暂无法识别当前设备':'暂无匹配的游戏'}<p>到兼容性查询看看</p><button data-act="open-compatibility">兼容性查询</button></div></section>`;
 const next=consoleGames[homePlayOrder[(homePlayState.selected+1)%homePlayOrder.length]];
 return `<section class="section homeplay-module playable-module" data-module="playable">${heading}<div class="homeplay-focus-track" aria-label="本机可玩游戏"><article class="homeplay-feature-card" data-key="${game.key}">${homePlayMedia(game)}<div class="homeplay-feature-info"><div class="homeplay-game-heading"><h3>${game.name}</h3><span>${copy.genre}</span></div><p class="homeplay-hook">${copy.title}</p><p class="homeplay-description">${copy.description}</p><div class="homeplay-card-bottom"><span class="homeplay-install-state ${ready?'is-ready':''}"><i></i>${ready?'已安装 · 沿用上次配置':'未添加到游戏库'}</span>${homePlayAction(game)}</div></div></article><button type="button" class="homeplay-next-peek" data-act="homeplay-next" aria-label="下一款：${next.name}">${media(next.key,next.name)}<span aria-hidden="true">›</span></button></div><div class="homeplay-picker" role="group" aria-label="选择本机可玩游戏"><button type="button" class="homeplay-prev" data-act="homeplay-prev" aria-label="上一款游戏">‹</button><div class="homeplay-picker-games">${homePlayOrder.map((index,i)=>{const g=consoleGames[index];return `<button type="button" data-act="homeplay-select" data-index="${i}" class="${i===homePlayState.selected?'is-selected':''}" aria-label="选择${g.name}" aria-pressed="${i===homePlayState.selected}">${media(g.key,'')}<span>${g.name}</span></button>`;}).join('')}</div><button type="button" class="homeplay-next" data-act="homeplay-next" aria-label="下一款游戏">›</button></div></section>`;
}
home=function(){return `${continueStrip()}<div class="retention-home homeplay-home">${homePlayModule()}${editorial()}${calendarModule()}${steamDiscountModule()}${giveawayModule()}${activityModule()}<div class="secondary-business">${business()}</div></div>`;};
const homePlayOriginalSpace=consoleGameSpace;
consoleGameSpace=function(){
 const game=consoleGame();
 if(!appState.detail.homePlay||homePlayReady(game))return homePlayOriginalSpace();
 const copy=homePlayCopy[game.key];
 return `<div class="screen portrait console-skin homeplay-game-detail">${consoleHeader('游戏详情',true)}<div class="content homeplay-detail-content" tabindex="0"><div class="homeplay-detail-scene">${consoleSceneImage(game.key,game.name+'官方游戏画面')}<span>官方游戏画面</span></div><div class="homeplay-detail-copy"><span class="console-overline">${game.english}</span><h2>${game.name}</h2><p class="homeplay-detail-genre">${game.genre}</p><h3>${copy.title}</h3><p>${copy.description}</p><span class="homeplay-detail-state">未添加到游戏库</span><div class="homeplay-detail-actions"><button data-act="open-compatibility">兼容性查询</button><button data-act="community-home">社区</button></div></div></div>${consoleFooter()}</div>`;
};
const homePlayOriginalStart=consoleStart;
consoleStart=function(){if(appState.detail.homePlay&&!homePlayReady(consoleGame()))return;homePlayOriginalStart();};
function homePlaySelect(index,focus=false){
 homePlayState.selected=(index+homePlayOrder.length)%homePlayOrder.length;homePlayState.paused=false;consoleTone();render(true);
 if(focus)document.querySelector(`[data-act="homeplay-select"][data-index="${homePlayState.selected}"]`)?.focus({preventScroll:true});
}
function homePlayOpen(key,start){
 const index=consoleGames.findIndex(game=>game.key===key);if(index<0)return;
 consoleState.selected=index;
 if(start){if(homePlayReady(consoleGames[index]))consoleStart();return;}
 consoleState.origin={snapshot:snapshot(),trail:trail.slice()};consoleState.menu=false;
 go('console-game',{from:'home',homePlay:true});
}
function homePlaySyncMotion(){
 const video=document.querySelector('.homeplay-video'),control=document.querySelector('.homeplay-motion');if(!video)return;
 const visible=video.dataset.visible==='true'&&!document.hidden;
 if(visible&&!homePlayState.paused&&!homePlayMotion.matches){
  if(!video.src)video.src=HOME_PLAY_CLIP;
  video.muted=true;video.play().catch(()=>{if(control){control.textContent='▶';control.setAttribute('aria-label','播放玩法片段');control.setAttribute('aria-pressed','false');}});
 }else video.pause();
 if(control){const playing=visible&&!homePlayState.paused&&!homePlayMotion.matches;control.textContent=playing?'Ⅱ':'▶';control.setAttribute('aria-label',playing?'暂停玩法片段':'播放玩法片段');control.setAttribute('aria-pressed',String(playing));control.disabled=homePlayMotion.matches;}
}
function homePlayMount(){
 if(appState.page==='home')document.querySelector('.screen')?.classList.add('homeplay-screen');
 const video=document.querySelector('.homeplay-video');if(!video)return;
 homePlayObserver=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.dataset.visible=String(entry.isIntersecting&&entry.intersectionRatio>=.4);}homePlaySyncMotion();},{threshold:[0,.4,1]});
 homePlayObserver.observe(video);
}
const homePlayOriginalDuoUpper=deviceMakeDuoUpper;
deviceMakeDuoUpper=function(screen){
 if(appState.page!=='home'||!screen.querySelector('.homeplay-media'))return homePlayOriginalDuoUpper(screen);
 const upper=document.createElement('section');upper.className='device-duo-upper homeplay-duo-upper';upper.setAttribute('aria-label','上屏游戏玩法');
 upper.innerHTML=`<div class="device-duo-status">${consoleStatus()}</div>`;upper.append(screen.querySelector('.homeplay-media'));return upper;
};
const homePlayOriginalRender=render;
render=function(preserve=false){
 document.querySelectorAll('.homeplay-video').forEach(video=>video.pause());homePlayObserver?.disconnect();homePlayObserver=null;
 homePlayOriginalRender(preserve);
 const wideNav=document.querySelector('.device-top-nav');if(wideNav){const library=wideNav.querySelector('[data-page="steam"]');if(library)wideNav.prepend(library);}
 homePlayMount();
};
window.addEventListener('click',event=>{
 const button=event.target.closest('[data-act^="homeplay-"]');if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 switch(button.dataset.act){
  case 'homeplay-select':homePlaySelect(Number(button.dataset.index),true);break;
  case 'homeplay-prev':homePlaySelect(homePlayState.selected-1,true);break;
  case 'homeplay-next':homePlaySelect(homePlayState.selected+1,true);break;
  case 'homeplay-start':homePlayOpen(button.dataset.key,true);break;
  case 'homeplay-detail':homePlayOpen(button.dataset.key,false);break;
  case 'homeplay-motion':homePlayState.paused=!homePlayState.paused;homePlaySyncMotion();break;
 }
},true);
document.addEventListener('pointerdown',event=>{if(event.target.closest('.homeplay-focus-track')&&!event.target.closest('button'))homePlayPointer={x:event.clientX,y:event.clientY};else homePlayPointer=null;},{passive:true});
document.addEventListener('pointerup',event=>{const start=homePlayPointer;homePlayPointer=null;if(!start||appState.page!=='home')return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)homePlaySelect(homePlayState.selected+(dx<0?1:-1),false);},{passive:true});
document.addEventListener('pointercancel',()=>homePlayPointer=null,{passive:true});
document.addEventListener('visibilitychange',homePlaySyncMotion);homePlayMotion.addEventListener('change',homePlaySyncMotion);
window.GAMEHUB_HOME_PLAY_PREVIEW={
 setAudience(audience){if(!['new','returning'].includes(audience))throw new TypeError('Unknown audience');homePlayState.audience=audience;homePlayState.selected=0;homePlayState.paused=false;appState.recent=audience==='returning';appState.recentFolded=false;consoleCancelTimer();consoleState.menu=false;consoleState.origin=null;trail.length=0;appState.detail={};appState.page='home';render();},
 setPlayableMode(mode){if(!['known','unknown','none'].includes(mode))throw new TypeError('Unknown playable state');appState.playableMode=mode;render(true);},
 getState(){return {...homePlayState,key:homePlayGame().key,ready:homePlayReady(homePlayGame()),playableMode:appState.playableMode};}
};
appState.page='home';
