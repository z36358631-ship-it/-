/* Derived direction study: Emuly material/focus language, GameHub PC workflow.
   Local fixtures only. No emulator, installation, device benchmark or save restore. */
const consoleGames = [
  {key:'elden',name:'艾尔登法环',english:'ELDEN RING',line:'交界地，等你回来。',genre:'开放世界 · 动作角色扮演',last:'昨天',preset:'上次使用的配置',resolution:'1280 × 720',quality:'低画质'},
  {key:'hades',name:'哈迪斯',english:'HADES',line:'再来一次，冲出冥界。',genre:'动作 · 肉鸽冒险',last:'2 天前',preset:'上次使用的配置',resolution:'1280 × 720',quality:'默认画质'},
  {key:'cyber',name:'赛博朋克 2077',english:'CYBERPUNK 2077',line:'夜之城，还有未完的故事。',genre:'开放世界 · 角色扮演',last:'3 天前',preset:'上次使用的配置',resolution:'1280 × 720',quality:'低画质'},
  {key:'wukong',name:'黑神话：悟空',english:'BLACK MYTH: WUKONG',line:'重走西游，再赴山海。',genre:'动作 · 角色扮演',last:'上周',preset:'上次使用的配置',resolution:'1280 × 720',quality:'低画质'}
];
const consoleState={selected:0,sound:false,stage:0,timer:null,launchId:0,menu:false,origin:null,transition:null};
const consoleOriginalScreen=screen;
const consoleOriginalRender=render;
const consoleOriginalControls=controls;
const consoleOriginalMainNav=mainNav;
const consoleOriginalPageTitle=pageTitle;
const consoleRouteTitles=new Map(pages.map(([key,title])=>[key,title.replace(/^\d+ /,'')]));
const consoleCustomPages=['steam','console-game','console-launch','console-player'];
const consoleIcons={
  home:'<path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/>',
  pc:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  community:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8Z"/><path d="M7 9h10M7 13h6"/>',
  ranking:'<path d="M4 21V11h5v10m1 0V4h5v17m1 0v-7h5v7"/>',
  steam:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16m5-11 4 3-4 3Z"/>',
  profile:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  sound:'<path d="m4 9 4 0 5-4v14l-5-4H4V9Z"/><path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute:'<path d="m4 9 4 0 5-4v14l-5-4H4V9Zm13 0 5 6m0-6-5 6"/>',
  play:'<path d="m8 5 11 7-11 7Z"/>',
  back:'<path d="m14 5-7 7 7 7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'
};
function consoleIcon(name){return `<svg class="console-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${consoleIcons[name]||consoleIcons.pc}</svg>`;}
function consoleButton(label,action,attrs='',cls=''){return `<button type="button" class="${cls}" data-act="console-${action}" ${attrs}>${label}</button>`;}
function consoleGame(){return consoleGames[consoleState.selected]||consoleGames[0];}
function consoleTone(kind='tick'){
  if(!consoleState.sound)return;
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const ctx=consoleTone.ctx||(consoleTone.ctx=new C());if(ctx.state==='suspended')ctx.resume();
    const frequencies=kind==='start'?[523.25,659.25,783.99]:kind==='confirm'?[660,990]:[820];
    frequencies.forEach((frequency,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain();const time=ctx.currentTime+i*.065;oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.025,time+.008);gain.gain.exponentialRampToValueAtTime(.001,time+.12);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(time);oscillator.stop(time+.14);});
  }catch(_){consoleState.sound=false;}
}
function consoleStatus(){return '<div class="status console-status"><span>9:41</span><span class="console-status-right"><i></i><i></i><i></i><span class="console-battery"></span></span></div>';}
function consoleSoundButton(){return consoleButton(consoleIcon(consoleState.sound?'sound':'mute'),'sound',`aria-label="${consoleState.sound?'关闭':'开启'}界面音效" aria-pressed="${consoleState.sound}"`,'console-round console-sound');}
mainNav=function(){return primaryNav.map(([p,t])=>`<button type="button" data-act="main-nav" data-page="${p}" data-title="${t}" class="${appState.page===p||(p==='steam'&&consoleCustomPages.includes(appState.page))||(p==='home'&&['pc','playable','controller','calendar','campaign','task-center','discounts','giveaways'].includes(appState.page))?'selected':''}">${consoleIcon(p)}<span>${t}</span></button>`).join('');};
function consoleHeader(title,backButton=false){return `${consoleStatus()}<div class="console-appbar">${backButton?consoleButton(consoleIcon('back'),'back','aria-label="返回"','console-round'):'<span class="console-brand-mark">G<span></span></span>'}<div><span class="console-eyebrow">GAMEHUB</span><h1>${title}</h1></div>${consoleSoundButton()}</div>`;}
function consoleFooter(){return `<div class="console-foot-curve"></div><nav class="bottom console-bottom" aria-label="主导航">${mainNav()}</nav>`;}
function consoleLibrary(){const g=consoleGame();return `<div class="screen portrait console-skin console-library">${consoleHeader('我的游戏')}<div class="content console-library-content" tabindex="0" aria-label="个人游戏库"><section class="console-showcase" aria-label="选中游戏"><div class="console-wallpaper" aria-hidden="true">${media(g.key,'')}</div><div class="console-showcase-top"><span><i></i> PC 游戏</span><span>${String(consoleState.selected+1).padStart(2,'0')} <small>/ 04</small></span></div><button class="console-feature-art" data-act="console-open" aria-label="进入${g.name}游戏空间">${media(g.key,g.name)}<span class="console-art-glint"></span></button><div class="console-feature-copy"><span class="console-overline">${g.english}</span><h2>${g.name}</h2><p>${g.line}</p></div>${consoleButton(`${consoleIcon('play')}<span>进入游戏</span>`,'open','','console-primary console-open-game')}</section><div class="console-shelf-heading"><h2>游戏频道 <small>${consoleGames.length}</small></h2><span>轻点选中，再点进入</span></div><div class="console-channels" role="group" aria-label="选择游戏">${consoleGames.map((item,i)=>`<button class="console-channel ${i===consoleState.selected?'is-focused':''}" data-act="console-select" data-index="${i}" aria-label="${item.name}${i===consoleState.selected?'，已选中':''}" aria-pressed="${i===consoleState.selected}">${media(item.key,item.name)}<span class="console-channel-copy"><b>${item.name}</b><small>PC</small></span><span class="console-channel-dot"></span></button>`).join('')}</div><div class="console-library-tail"><span class="console-tail-dot"></span><span>你的游戏，随时回来。</span></div></div>${consoleFooter()}</div>`;}
function consoleGameSpace(){const g=consoleGame();return `<div class="screen portrait console-skin console-game-space">${consoleHeader('游戏空间',true)}<div class="content console-space-content" tabindex="0" aria-label="游戏空间"><section class="console-game-hero"><div class="console-detail-backdrop" aria-hidden="true">${media(g.key,'')}</div><div class="console-detail-art">${media(g.key,g.name)}</div><div class="console-game-caption"><span class="console-overline">${g.english}</span><h2>${g.name}</h2><p>${g.genre}</p></div></section><section class="console-ready-card"><span class="console-ready-icon">${consoleIcon('check')}</span><div><strong>沿用上次配置</strong><p>少一点设置，多一点游戏。</p></div><span class="console-small-tag">PC</span></section><div class="console-last-played"><span>上次游玩</span><strong>${g.last}</strong></div><details class="console-config"><summary>${consoleIcon('settings')}<span>配置详情</span><span class="console-detail-chevron">⌄</span></summary><dl><div><dt>配置</dt><dd>${g.preset}</dd></div><div><dt>分辨率</dt><dd>${g.resolution}</dd></div><div><dt>画质</dt><dd>${g.quality}</dd></div></dl></details><div class="console-start-actions">${consoleButton('游戏库','library','','console-secondary')}${consoleButton(`${consoleIcon('play')}开始游戏`,'launch','','console-primary')}</div><p class="console-save-hint">游戏进度以游戏内存档为准</p></div>${consoleFooter()}</div>`;}
const consoleLaunchStages=['载入游戏配置','准备运行环境','打开游戏窗口'];
function consoleLaunch(){const g=consoleGame();return `<div class="screen portrait console-skin console-launch-screen">${consoleHeader('启动演示',true)}<div class="content console-launch-content" tabindex="0" aria-label="启动流程演示"><div class="console-launch-cover">${media(g.key,g.name)}<span class="console-orbit"></span></div><span class="console-overline">${g.english}</span><h2>${g.name}</h2><p class="console-launch-now" aria-live="polite">${consoleLaunchStages[consoleState.stage]}…</p><div class="console-progress" role="progressbar" aria-label="演示启动进度" aria-valuenow="${[25,60,90][consoleState.stage]}" aria-valuemin="0" aria-valuemax="100"><span style="width:${[25,60,90][consoleState.stage]}%"></span></div><ol class="console-stage-list">${consoleLaunchStages.map((s,i)=>`<li class="${i<consoleState.stage?'done':i===consoleState.stage?'current':''}"><span>${i<consoleState.stage?consoleIcon('check'):String(i+1).padStart(2,'0')}</span>${s}</li>`).join('')}</ol>${consoleButton('取消启动','cancel','','console-secondary')}<small class="console-preview-note">本地流程演示，不运行真实 PC 游戏</small></div></div>`;}
function consolePlayer(){const g=consoleGame();return `<div class="screen portrait console-skin console-player-screen">${consoleStatus()}<div class="console-player-top"><span>PC · 画面预览</span>${consoleButton(consoleIcon('menu'),'menu','aria-label="打开游戏菜单"','console-round')}</div><div class="console-player-art">${media(g.key,g.name)}<div class="console-player-shade"></div><div class="console-player-copy"><span>${g.english}</span><h2>${g.name}</h2><p>这里承接真实游戏画面</p></div></div><div class="console-player-lower"><span class="console-preview-chip">静态画面演示</span><p>在真实运行中，这里将交由 PC 模拟器显示。</p>${consoleButton(`${consoleIcon('menu')}游戏菜单`,'menu','','console-secondary')}</div>${consoleState.menu?`<div class="console-menu-scrim"><section class="console-game-menu" role="dialog" aria-modal="true" aria-label="游戏菜单"><span class="console-menu-handle"></span><span class="console-overline">GAMEHUB MENU</span><h2>${g.name}</h2><p>随时回到你的游戏空间</p>${consoleButton(`${consoleIcon('play')}返回画面`,'menu','','console-primary')}${consoleButton('回到游戏空间','space','','console-secondary')}${consoleButton('返回游戏库','library','','console-menu-exit')}</section></div>`:''}</div>`;}
screen=function(){appState.mode='portrait';switch(appState.page){case 'steam':return consoleLibrary();case 'console-game':return consoleGameSpace();case 'console-launch':return consoleLaunch();case 'console-player':return consolePlayer();default:{const original=consoleOriginalScreen();return ['home','pc'].includes(appState.page)?original.replace('class="screen ','class="screen console-skin '):original;}}};
pageTitle=function(){if(appState.page==='calendar')return '游戏发售日历';return consoleRouteTitles.get(appState.page)||consoleOriginalPageTitle();};
controls=function(){return `<span class="console-toolbar-label">${consoleCustomPages.includes(appState.page)?'PC 游戏体验':'首页内容体验'}</span><span class="console-toolbar-spacer"></span>${consoleButton(`${consoleIcon(consoleState.sound?'sound':'mute')}音效${consoleState.sound?'开':'关'}`,'sound',`aria-pressed="${consoleState.sound}"`,'console-toolbar-sound')}`;};
function consoleCancelTimer(){if(consoleState.timer!==null)clearTimeout(consoleState.timer);consoleState.timer=null;consoleState.launchId++;}
function consoleCancelTransition(){const animation=consoleState.transition;if(!animation)return;consoleState.transition=null;animation.effect?.target?.remove();animation.cancel();}
render=function(preserve=false){consoleCancelTransition();if(appState.page!=='console-launch'&&consoleState.timer!==null)consoleCancelTimer();appState.mode='portrait';consoleOriginalRender(preserve);document.body.classList.add('console-experiment');document.querySelector('.content')?.setAttribute('aria-label',consoleCustomPages.includes(appState.page)?'PC 游戏体验':'页面内容');if(consoleState.menu&&appState.page==='console-player'){document.querySelectorAll('.console-player-screen > :not(.console-menu-scrim)').forEach(element=>{element.inert=true;element.setAttribute('aria-hidden','true');});document.querySelector('.console-game-menu button')?.focus({preventScroll:true});}};
function consoleCoverTransition(source){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
  const image=source?.querySelector('img')||document.querySelector('.console-channel.is-focused img')||document.querySelector('.console-feature-art img');
  if(!image)return null;const rect=image.getBoundingClientRect();if(!rect.width||!rect.height)return null;
  const clone=image.cloneNode(false);clone.classList.add('console-cover-flight');clone.removeAttribute('alt');clone.setAttribute('aria-hidden','true');clone.style.cssText=`position:fixed;z-index:9999;pointer-events:none;object-fit:cover;max-width:none;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;border-radius:12px;box-shadow:0 10px 25px #24475e20;`;
  return {rect,clone};
}
function consoleAnimateCover(preview){
  if(!preview)return;const content=document.querySelector('.console-space-content');if(content)content.style.animation='none';const target=document.querySelector('.console-detail-art');if(!target)return;
  consoleCancelTransition();
  const rect=target.getBoundingClientRect(),clone=preview.clone;target.style.opacity='0';document.body.append(clone);
  const animation=clone.animate([{top:`${preview.rect.top}px`,left:`${preview.rect.left}px`,width:`${preview.rect.width}px`,height:`${preview.rect.height}px`,borderRadius:'12px'},{top:`${rect.top+5}px`,left:`${rect.left+5}px`,width:`${rect.width-10}px`,height:`${rect.height-10}px`,borderRadius:'12px'}],{duration:420,easing:'cubic-bezier(.22,.75,.15,1)',fill:'forwards'});
  consoleState.transition=animation;const cleanup=()=>{target.style.opacity='';clone.remove();if(consoleState.transition===animation)consoleState.transition=null;};animation.onfinish=cleanup;animation.oncancel=cleanup;
}
function consoleGo(page,source=null){
  const preview=page==='console-game'&&appState.page!=='console-game'&&appState.page!=='console-player'?consoleCoverTransition(source):null;
  if(page==='console-game'&&(appState.page==='steam'||!consoleCustomPages.includes(appState.page)))consoleState.origin={snapshot:snapshot(),trail:trail.slice()};
  consoleTone('confirm');consoleState.menu=false;go(page,{from:appState.page});consoleAnimateCover(preview);
}
function consoleReturnLibrary(){consoleCancelTimer();consoleState.menu=false;consoleState.origin=null;topLevel('steam');}
function consoleReturnOrigin(){
  consoleCancelTimer();consoleState.menu=false;const origin=consoleState.origin;consoleState.origin=null;
  if(!origin){topLevel('steam');return;}const prev=origin.snapshot;trail.splice(0,trail.length,...origin.trail);Object.assign(appState,{page:prev.page,detail:prev.detail,mode:'portrait',communityScope:prev.scope,navCollapsed:prev.navCollapsed});render();const content=document.querySelector('.content');if(content){recordingRestore=true;content.scrollTop=prev.scroll;previousScroll=prev.scroll;requestAnimationFrame(()=>recordingRestore=false);}
}
function consoleSelect(index,focus=false){consoleState.selected=(index+consoleGames.length)%consoleGames.length;consoleTone();render(true);if(focus)document.querySelector(`[data-act="console-select"][data-index="${consoleState.selected}"]`)?.focus({preventScroll:true});}
function consoleStart(){consoleCancelTimer();consoleState.stage=0;consoleState.menu=false;consoleTone('start');go('console-launch',{from:'console-game'});const launchId=consoleState.launchId;function advance(){if(launchId!==consoleState.launchId||appState.page!=='console-launch')return;if(consoleState.stage<2){consoleState.stage++;render();consoleState.timer=setTimeout(advance,1050);}else{consoleState.timer=null;appState.page='console-player';render();}}consoleState.timer=setTimeout(advance,1050);}
function consoleBack(){consoleTone();if(consoleState.menu){consoleState.menu=false;render();document.querySelector('[data-act="console-menu"]')?.focus({preventScroll:true});return;}if(appState.page==='console-launch'){consoleCancelTimer();appState.page='console-game';render();return;}if(appState.page==='console-player'){consoleState.menu=true;render();return;}if(appState.page==='console-game'){consoleReturnOrigin();return;}if(appState.page==='steam')return;back();}
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-act]');if(!el)return;const action=el.dataset.act;
  if(action==='game'){
    const index=consoleGames.findIndex(g=>g.name===el.dataset.game);if(index<0)return;
    event.preventDefault();event.stopImmediatePropagation();consoleState.selected=index;consoleGo('console-game',el);return;
  }
  if(action==='main-nav'&&el.dataset.page==='steam'){
    event.preventDefault();event.stopImmediatePropagation();consoleTone('confirm');consoleReturnLibrary();return;
  }
  if(!action?.startsWith('console-'))return;
  event.preventDefault();event.stopImmediatePropagation();
  switch(action){
    case 'console-select':if(Number(el.dataset.index)===consoleState.selected)consoleGo('console-game',el);else consoleSelect(Number(el.dataset.index),true);break;
    case 'console-open':consoleGo('console-game',el);break;
    case 'console-launch':consoleStart();break;
    case 'console-cancel':consoleCancelTimer();appState.page='console-game';render();break;
    case 'console-menu':consoleState.menu=!consoleState.menu;consoleTone();render();if(!consoleState.menu)document.querySelector('[data-act="console-menu"]')?.focus();break;
    case 'console-space':consoleState.menu=false;consoleGo('console-game');break;
    case 'console-library':consoleTone('confirm');consoleReturnLibrary();break;
    case 'console-back':consoleBack();break;
    case 'console-sound':consoleState.sound=!consoleState.sound;consoleTone('confirm');render(true);document.querySelector('.console-sound')?.focus({preventScroll:true});break;
  }
},true);
document.addEventListener('keydown',event=>{
  if(!consoleCustomPages.includes(appState.page)||/input|textarea|select/i.test(event.target.tagName))return;
  if(consoleState.menu&&event.key==='Tab'){
    const buttons=[...document.querySelectorAll('.console-game-menu button')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;
  }
  if(event.key==='Escape'||event.key.toLowerCase()==='b'){event.preventDefault();event.stopImmediatePropagation();consoleBack();return;}
  if(appState.page==='steam'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();consoleSelect(consoleState.selected+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-2,ArrowDown:2}[event.key]),true);return;}
  if(event.key==='Enter'&&!event.target.closest('button,a,summary')){event.preventDefault();event.stopImmediatePropagation();if(appState.page==='steam')consoleGo('console-game');else if(appState.page==='console-game')consoleStart();}
},true);
pages.splice(0,pages.length,['steam','游戏库'],['home','推荐首页'],['pc','PC 游戏']);
appState.page='steam';appState.mode='portrait';
window.GAMEHUB_CONSOLE_PREVIEW={show(page='steam'){consoleCancelTimer();consoleState.menu=false;consoleState.origin=null;topLevel(page);},getState(){return {page:appState.page,selected:consoleState.selected,sound:consoleState.sound,stage:consoleState.stage,menu:consoleState.menu};}};
