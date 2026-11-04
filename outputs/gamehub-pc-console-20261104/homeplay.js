/* Homepage direction study. Installation/history are review fixtures, never device tests. */
const homePlayState={audience:'returning',selected:0,paused:false};
const homePlayOrder=[1,2,0,3];
const homePlayCopy={
 hades:{genre:'动作肉鸽',title:'冲出冥界，再来一局',description:'挥剑、闪避，搭配神祇祝福。每次出发，都有新打法。'},
 cyber:{genre:'开放世界',title:'今晚，去夜之城兜一圈',description:'开车穿过霓虹街头，接一单委托，走进你的赛博人生。'},
 elden:{genre:'开放世界 · 动作',title:'下一片风景，在迷雾之后',description:'骑马探索交界地，挑战强敌，找到属于自己的冒险路线。'},
 wukong:{genre:'动作冒险',title:'提起金箍棒，踏上取经路',description:'看破招式，闪身反击，在熟悉的西游故事里迎战妖王。'}
};
let homePlayObserver=null,homePlayPointer=null,homePlaySwipeUntil=0;
const homePlayMotion=matchMedia('(prefers-reduced-motion: reduce)');
function homePlayGame(){return consoleGames[homePlayOrder[homePlayState.selected]];}
function homePlayWide(){return ['landscape','tablet'].includes(deviceState.form);}
function homePlayPlatform(game){return 'Steam';}
function homePlayReady(game){return homePlayState.audience==='returning'&&['elden','hades'].includes(game.key);}
const HOME_PLAY_COMPATIBILITY_ICONS="data:image/png;base64,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";
function homePlayMedia(game){
 const clip=game.key==='hades'&&typeof HOME_PLAY_CLIP==='string';
 const poster=clip?HOME_PLAY_POSTER:consoleSceneSource(game.key);
 return `<div class="homeplay-media">${clip?`<video class="homeplay-video" poster="${poster}" muted playsinline loop preload="none" aria-label="哈迪斯官方玩法片段"></video>`:`<img src="${poster}" alt="${game.name}官方游戏画面" decoding="async">`}<span class="homeplay-compatibility-tag" role="img" aria-label="兼容状态" data-compatibility="reference"><img src="${HOME_PLAY_COMPATIBILITY_ICONS}" alt="" width="83" height="22"></span>${clip?`<button type="button" class="homeplay-motion" data-act="homeplay-motion" aria-label="播放玩法片段" aria-pressed="false">▶</button>`:''}</div>`;
}
function homePlayCardOpen(game){
 return `<button type="button" class="homeplay-card-open" data-act="homeplay-detail" data-key="${game.key}" aria-label="查看${game.name}游戏详情"></button>`;
}
const homePlayOriginalContinue=continueStrip;
continueStrip=function(){
 if(appState.page!=='home')return homePlayOriginalContinue();
 if(['landscape','tablet'].includes(deviceState.form))return '';
 if(homePlayState.audience==='new'||!appState.recent||appState.recentFolded)return '';
 const game=consoleGames[0];
 return `<div class="continue-row homeplay-continue" data-testid="continue-strip"><div class="homeplay-recent-art">${consoleSceneImage(game.key,game.name+'游戏画面','homeplay-recent-cover')}<span class="homeplay-recent-time"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.5V8l2.2 1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>${game.last}</span></div><div class="homeplay-recent-copy"><span>继续游戏</span><b>${game.name}</b><small>${homePlayPlatform(game)}</small></div><button type="button" class="homeplay-recent-start" data-act="homeplay-start" data-key="${game.key}" aria-label="继续游戏：${game.name}">${consoleIcon('play')}</button></div>`;
};
function homePlayWideCards(){
 return `<div class="homeplay-wide-grid" aria-label="本机可玩游戏">${homePlayOrder.map(index=>{const game=consoleGames[index];return `<article class="homeplay-wide-card" data-key="${game.key}">${homePlayMedia(game)}<div class="homeplay-wide-info"><h3>${game.name}</h3></div>${homePlayCardOpen(game)}</article>`;}).join('')}</div>`;
}
function homePlayModule(){
 const game=homePlayGame();
 const heading=`<div class="section-title"><h2>本机可玩</h2><button type="button" data-act="open-compatibility">更多 ›</button></div>`;
 if(appState.playableMode!=='known')return `<section class="section homeplay-module playable-module" data-module="playable">${heading}<div class="state-block">${appState.playableMode==='unknown'?'暂无法识别当前设备':'暂无匹配的游戏'}<p>到兼容性查询看看</p><button data-act="open-compatibility">兼容性查询</button></div></section>`;
 if(homePlayWide())return `<section class="section homeplay-module playable-module" data-module="playable">${heading}${homePlayWideCards()}</section>`;
 const next=consoleGames[homePlayOrder[(homePlayState.selected+1)%homePlayOrder.length]];
 return `<section class="section homeplay-module playable-module" data-module="playable">${heading}<div class="homeplay-focus-track" aria-label="本机可玩游戏"><article class="homeplay-feature-card" data-key="${game.key}">${homePlayMedia(game)}<div class="homeplay-feature-info"><h3>${game.name}</h3></div>${homePlayCardOpen(game)}</article><button type="button" class="homeplay-next-peek" data-act="homeplay-next" aria-label="下一款：${next.name}">${media(next.key,'')}<span aria-hidden="true">›</span></button></div></section>`;
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
 if(focus)document.querySelector('.homeplay-next-peek')?.focus({preventScroll:true});
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
 document.querySelector('.screen')?.classList.add('app-dark');
 if(appState.page==='home')document.querySelector('.screen')?.classList.add('homeplay-screen');
 const video=document.querySelector('.homeplay-video');if(!video)return;
 homePlayObserver=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.dataset.visible=String(entry.isIntersecting&&entry.intersectionRatio>=.4);}homePlaySyncMotion();},{threshold:[0,.4,1]});
 homePlayObserver.observe(video);
}
const homePlayOriginalDuoUpper=deviceMakeDuoUpper;
deviceMakeDuoUpper=function(screen){
 if(appState.page!=='home')return homePlayOriginalDuoUpper(screen);
 const upper=document.createElement('section');upper.className='device-duo-upper homeplay-duo-upper';upper.setAttribute('aria-label','上屏游戏玩法');
 upper.innerHTML=`<div class="device-duo-status">${consoleStatus()}</div>`;
 const media=screen.querySelector('.homeplay-media');
 if(media)upper.append(media);
 else upper.insertAdjacentHTML('beforeend',`<div class="homeplay-duo-empty"><span>GAMEHUB</span><h2>本机可玩</h2><p>${appState.playableMode==='unknown'?'暂无法识别当前设备':'暂无匹配的游戏'}</p></div>`);
 return upper;
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
 if(button.dataset.act==='homeplay-detail'&&performance.now()<homePlaySwipeUntil)return;
 switch(button.dataset.act){
  case 'homeplay-select':homePlaySelect(Number(button.dataset.index),true);break;
  case 'homeplay-prev':homePlaySelect(homePlayState.selected-1,true);break;
  case 'homeplay-next':homePlaySelect(homePlayState.selected+1,true);break;
  case 'homeplay-start':homePlayOpen(button.dataset.key,true);break;
  case 'homeplay-detail':homePlayOpen(button.dataset.key,false);break;
  case 'homeplay-motion':homePlayState.paused=!homePlayState.paused;homePlaySyncMotion();break;
 }
},true);
document.addEventListener('pointerdown',event=>{if(!homePlayWide()&&event.target.closest('.homeplay-focus-track')&&!event.target.closest('button:not(.homeplay-card-open)'))homePlayPointer={x:event.clientX,y:event.clientY};else homePlayPointer=null;},{passive:true});
document.addEventListener('pointerup',event=>{const start=homePlayPointer;homePlayPointer=null;if(!start||homePlayWide()||appState.page!=='home')return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4){homePlaySwipeUntil=performance.now()+250;homePlaySelect(homePlayState.selected+(dx<0?1:-1),false);}},{passive:true});
document.addEventListener('pointercancel',()=>homePlayPointer=null,{passive:true});
document.addEventListener('visibilitychange',homePlaySyncMotion);homePlayMotion.addEventListener('change',homePlaySyncMotion);
window.GAMEHUB_HOME_PLAY_PREVIEW={
 setAudience(audience){if(!['new','returning'].includes(audience))throw new TypeError('Unknown audience');homePlayState.audience=audience;homePlayState.selected=0;homePlayState.paused=false;appState.recent=audience==='returning';appState.recentFolded=false;consoleCancelTimer();consoleState.menu=false;consoleState.origin=null;trail.length=0;appState.detail={};appState.page='home';render();},
 setPlayableMode(mode){if(!['known','unknown','none'].includes(mode))throw new TypeError('Unknown playable state');appState.playableMode=mode;render(true);},
 getState(){return {...homePlayState,key:homePlayGame().key,ready:homePlayReady(homePlayGame()),playableMode:appState.playableMode};}
};
appState.page='home';
