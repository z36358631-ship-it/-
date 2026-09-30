// GameHub adaptations requested on 2026-09-27. Local interaction simulation only.
const remoteWindows=[{id:'doc',title:'项目讨论记录 — 文档',label:'文档',icon:'file'},{id:'ai',title:'AI 工具 — 浏览器',label:'浏览器',icon:'monitor'},{id:'code',title:'项目代码 — 编辑器',label:'编辑器',icon:'terminal'}];
function remoteText(){return s.activeWindow==='ai'?(s.aiText||''):s.activeWindow==='code'?(s.codeText||''):s.doc;}
function writeRemote(text){if(s.view)return;if(s.activeWindow==='ai')s.aiText=text;else if(s.activeWindow==='code')s.codeText=text;else s.doc=text;}
function remoteWindow(){if(s.mode==='game')return gamePreview();const w=remoteWindows.find(w=>w.id===s.activeWindow)||remoteWindows[0];return '<div class="remote-window"><div class="windowbar">'+esc(s.quickOpenedApp?s.quickOpenedApp+' — 远端应用示意':w.title)+'</div><div class="menubar"><span>文件</span><span>编辑</span><span>查看</span></div>'+(w.id==='ai'?'<div class="ai-empty">AI 工具页面<small>在电脑的浏览器中继续提问</small></div>':'')+'<textarea aria-label="电脑文档" class="doc" placeholder="'+(w.id==='ai'?'输入问题；本原型不会提交或生成回答':'点击此处输入')+'" '+(s.view?'readonly':'')+'>'+esc(remoteText())+'</textarea></div>';}
function imeKeyboard(){return '<div class="ime"><textarea id="remote-input" aria-label="远程输入" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="点击输入文字，使用系统键盘" '+(s.view?'readonly':'')+'>'+esc(s.imeBuffer||'')+'</textarea><div class="ime-bottom">'+btn('长文本输入','panel:text','ghost')+'<small>使用手机系统输入法</small></div></div>';}
function focusRemoteInput(){if(!s.view&&s.keyboard==='输入法'&&s.panel==='keyboard')document.querySelector('#remote-input')?.focus();}

function windowPanel(){return '<div class="row spread"><h3>电脑上已打开的窗口</h3>'+ib('收起面板','panel-close','close')+'</div><div class="office-windows">'+(s.previewEmptyWindows?'<div class="blank"><h3>暂无打开的窗口</h3><p>可先在电脑桌面打开应用。</p></div>':remoteWindows.map(w=>'<button data-action="window:'+w.id+'" class="office-window '+((s.activeWindow||'doc')===w.id?'active':'')+'">'+icon(w.icon)+'<span>'+w.title+'<small>'+w.label+'</small></span></button>').join(''))+'</div><div class="office-actions">'+btn('长文本输入','panel:text','','keyboard')+btn('显示桌面','office-desktop','','monitor')+'</div><small>没有找到需要的窗口？在电脑桌面打开应用。</small>';}
function textPanel(){const w=remoteWindows.find(w=>w.id===(s.activeWindow||'doc'));return '<div class="row spread"><h3>长文本输入</h3>'+ib('收起面板','panel-close','close')+'</div><p class="text-target">当前窗口：'+w.title+'</p><textarea id="office-draft" aria-label="长文本草稿" class="inputbox" placeholder="在这里编辑，再输入到电脑">'+esc(s.textDraft||'')+'</textarea><p class="draft-hint">先在远程窗口中定位输入框。仅输入文字，不自动提交。</p>'+btn('输入到电脑','write-draft','primary').replace('<button','<button '+(s.view?'disabled':''))+(s.view?'<small>仅观看模式不能输入</small>':'')+'<small>收起后保留本次草稿</small>';}
const mouseSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 10h12"/></svg>';
function floatingMouse(){if(s.platform==='mac'||s.view)return '';const p=s.mousePos||{x:.86,y:.70};return '<div class="floating-mouse '+(s.mouseOpen?'expanded':'')+'" style="left:'+p.x*100+'%;top:'+p.y*100+'%" aria-label="悬浮鼠标" '+(s.mouseOpen?'':'data-action="mouse-open"')+'>'+(s.mouseOpen?'<div class="mouse-grip" aria-label="拖动鼠标">⠿</div>'+ib('收起鼠标','mouse-close','close')+'<div class="mouse-buttons">'+btn('左键','mouse-left')+btn('右键','mouse-right')+'</div><div class="mouse-wheel">'+btn('▴','mouse-scroll:up')+btn('▾','mouse-scroll:down')+'</div><div class="mouse-bottom">鼠标</div>':'<button data-action="mouse-open" aria-label="展开悬浮鼠标">'+mouseSvg+'</button>')+'</div>'+(s.mouseMenu?'<div class="mouse-context">'+btn('全选文字','mouse-select')+btn('关闭','mouse-menu-close')+'</div>':'');}
function controlAction(a){const [k,v]=a.split(':');
 if(s.view&&(k==='key'||k==='computer-key'||k==='windows'||k==='desktop'||k==='office-desktop'||k==='window'||k==='write-draft'||k==='panel'&&['keyboard','text','windows'].includes(v)))return true;
 if(k==='computer-key')return computerKeyAction(v);
 if(k==='computer-combo'){if(s.view)return true;s.computerCombo=!s.computerCombo;s.computerModifiers=[];render();return true;}
 if(k==='computer-page'){s.computerKeyPage=Number(v)===1?1:0;render();return true;}
 if(k==='set'&&v==='keyboard'){s.computerModifiers=[];s.imeBuffer='';s.keyboard=a.split(':')[2]==='电脑键盘'?'电脑键盘':'输入法';render();focusRemoteInput();return true;}
 if(k==='panel'&&v==='keyboard'){s.computerModifiers=[];s.panel=s.panel==='keyboard'?'':'keyboard';s.imeBuffer='';render();focusRemoteInput();return true;}
 if(k==='key')s.imeBuffer='';
 if(['toggle-view','panel-close','rotate','exit','exit-confirm'].includes(k)){s.computerModifiers=[];cancelRemoteGestures();}
 if(['quicklaunch','open-files','apps-permission'].includes(k)){
  if(!device().online||device().blocked){toast(!device().online?'设备已离线，无法操作':'该设备不允许被控');return true;}
  if(device().busy){s.pendingAction=a;s.modal='takeover';render();return true;}
 }
 if(k==='more'&&device().online&&device().busy){s.pendingAction=a;s.modal='takeover';render();return true;}
 if(k==='power'||k==='power-start'){const kind=k==='power'?v:s.powerKind;if(kind!=='boot'&&(!device().online||device().blocked)){toast(!device().online?'设备已离线，无法发送操作':'该设备不允许远程操作');return true;}if(device().busy){s.pendingAction=a;s.modal='takeover';render();return true;}}
 if(k==='mouse-open'||k==='mouse-close'){s.mouseOpen=k==='mouse-open';render();clampMouse();return true;}
 if(k==='ime-numbers'){s.numbers=!s.numbers;render();return true;}
 if(k==='ime-shift'){s.shift=!s.shift;render();return true;}
 if(k==='window'){if(s.view){toast('仅观看模式不能切换电脑窗口');return true;}s.activeWindow=v;s.desktop=false;s.panel='';render();return true;}
 if(k==='office-desktop'){s.desktop=true;s.panel='';render();return true;}
 if(k==='write-draft'){if(s.view)return true;writeRemote(remoteText()+(s.textDraft||''));s.textDraft='';s.desktop=false;s.panel='';render();return true;}
 if(k.startsWith('mouse-')){if(s.view)return true;const doc=$('.doc');if(k==='mouse-left')doc?.focus();if(k==='mouse-right'){s.mouseMenu=!s.mouseMenu;render();}if(k==='mouse-scroll')doc?.scrollBy(0,v==='up'?-80:80);if(k==='mouse-select'){s.mouseMenu=false;render();$('.doc')?.select();}if(k==='mouse-menu-close'){s.mouseMenu=false;render();}return true;}
 return false;
}
function clampMouse(){const m=$('.floating-mouse'),c=$('.remote-viewport');if(!m||!c)return;const p=s.mousePos||{x:.86,y:.70};const x=Math.max(m.offsetWidth/2+2,Math.min(c.clientWidth-m.offsetWidth/2-2,p.x*c.clientWidth)),y=Math.max(m.offsetHeight/2+2,Math.min(c.clientHeight-m.offsetHeight/2-2,p.y*c.clientHeight));m.style.left=x+'px';m.style.top=y+'px';}
let mouseDrag=null,mouseWheelDrag=null,ignoreMouseClick=false,mousePressTimer=0;
function cancelRemoteGestures(){clearTimeout(mousePressTimer);mouseDrag=null;mouseWheelDrag=null;}
document.addEventListener('pointerdown',e=>{
 const m=e.target.closest('.floating-mouse');if(!m||s.view)return;
 const wheel=e.target.closest('.mouse-wheel');
 if(wheel){e.preventDefault();mouseWheelDrag={id:e.pointerId,y:e.clientY,startY:e.clientY,moved:false};(e.target.closest('button')||wheel).setPointerCapture(e.pointerId);return;}
 if(s.mouseOpen&&e.target.closest('button'))return;
 const viewport=$('.remote-viewport');if(!viewport)return;
 clearTimeout(mousePressTimer);mouseDrag={id:e.pointerId,startX:e.clientX,startY:e.clientY,c:viewport.getBoundingClientRect(),m,active:false};m.setPointerCapture(e.pointerId);
 mousePressTimer=setTimeout(()=>{if(mouseDrag?.id===e.pointerId)mouseDrag.active=true;},220);
});
document.addEventListener('pointermove',e=>{
 if(s.view){cancelRemoteGestures();return;}
 if(mouseWheelDrag?.id===e.pointerId){const d=mouseWheelDrag,delta=d.y-e.clientY;if(Math.abs(e.clientY-d.startY)>3)d.moved=true;if(d.moved){e.preventDefault();ignoreMouseClick=true;$('.doc')?.scrollBy(0,delta*3);}d.y=e.clientY;return;}
 if(!mouseDrag||mouseDrag.id!==e.pointerId)return;const d=mouseDrag;
 if(!d.active){if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>8){clearTimeout(mousePressTimer);mouseDrag=null;}return;}
 ignoreMouseClick=true;s.mousePos={x:Math.max(0,Math.min(1,(e.clientX-d.c.left)/d.c.width)),y:Math.max(0,Math.min(1,(e.clientY-d.c.top)/d.c.height))};clampMouse();
});
function endMouseGesture(e){if(mouseDrag?.id!==e.pointerId&&mouseWheelDrag?.id!==e.pointerId)return;cancelRemoteGestures();setTimeout(()=>ignoreMouseClick=false,0);}
document.addEventListener('pointerup',endMouseGesture);document.addEventListener('pointercancel',endMouseGesture);
document.addEventListener('click',e=>{if(ignoreMouseClick&&e.target.closest('.floating-mouse')){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('input',e=>{if(e.target.id==='office-draft')s.textDraft=e.target.value;});

function commitIme(value){if(s.view)return;const old=s.imeBuffer||'';writeRemote(remoteText().slice(0,Math.max(0,remoteText().length-old.length))+value);s.imeBuffer=value;const doc=$('.doc');if(doc)doc.value=remoteText();}

function previewMode(mode){clearTimeout(powerTimer);clearTimeout(connectTimer);if(s.page!=='session'){applyState('session');}s.mode=mode;s.review=false;s.modal='';s.panel='';s.desktop=false;s.mouseOpen=false;s.mouseMenu=false;s.mapping=mode==='game';s.activeWindow=mode==='office'?'ai':'doc';render();}
function gamePreview(){return '<div class="game-preview"><img src="'+HOME_MEDIA.gta+'" alt="游戏场景预览"><div><small>游戏操作预览</small><h2>继续电脑上的游戏</h2><p>键盘、鼠标与按键映射</p></div></div>';}

// Two compact pages; all keyboard effects remain local demonstrations.
const computerKeyPages=[[
 ['Minus','Equal','BracketLeft','BracketRight','Backslash','Semicolon','Quote','Comma','Period','Slash'],
 [...'1234567890'],[...'QWERTYUIOP'],[...'ASDFGHJKL','Backspace'],[...'ZXCVBNM','Space','Enter']
],[['Esc','Tab','Backquote','PrintScreen','ScrollLock','Pause'],['F1','F2','F3','Insert','Home','PageUp'],['F4','F5','F6','Delete','End','PageDown'],['F7','F8','F9','CapsLock','ArrowUp',null],['F10','F11','F12','ArrowLeft','ArrowDown','ArrowRight']]];
const computerKeyGroups=[['keys',computerKeyPages.flat(2).filter(Boolean).concat(['Ctrl','Shift','Alt','Win'])]];
const computerKeyLabels={Backquote:'`',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Space:'空格',ArrowUp:'↑',ArrowLeft:'←',ArrowDown:'↓',ArrowRight:'→'};
function computerKeyLabel(key){return computerKeyLabels[key]||key;}
function computerModifier(key){return key;}
function computerModifierLabel(key){return device().os==='macOS'?({Ctrl:'Control',Shift:'Shift',Alt:'Option',Win:'⌘'}[key]||computerKeyLabel(key)):computerKeyLabel(key);}
function computerKeyboard(){
 const mods=s.computerModifiers||[],page=s.computerKeyPage===1?1:0,dual={Minus:'_ −',Equal:'+ =',BracketLeft:'{ [',BracketRight:'} ]',Backslash:'| \\',Semicolon:': ;',Quote:'" \'',Comma:'< ,',Period:'> .',Slash:'? /'};
 const key=(k,modifier=false)=>!k?'<span class="computer-key-empty"></span>':'<button data-action="computer-key:'+k+'"'+(s.view?' disabled':'')+(modifier?' aria-pressed="'+mods.includes(k)+'"':'')+' class="computer-key '+(mods.includes(k)?'active ':'')+(['Space','Enter'].includes(k)?'key-wide':'')+'" aria-label="'+k+'">'+esc(modifier?computerModifierLabel(k):dual[k]||({Backspace:'⌫',Backquote:'~ `',PrintScreen:'PrtScr',ScrollLock:'ScrLK',Delete:'Del',CapsLock:'Caps',PageUp:'PgUp',PageDown:'PgDn'}[k]||computerKeyLabel(k)))+'</button>';
 return '<div class="computer-keyboard"><div class="computer-modifiers"><label class="computer-combo"><input type="checkbox" data-action="computer-combo" '+(s.computerCombo?'checked ':'')+(s.view?'disabled':'')+'>组合键模式</label><div class="computer-modifier-keys">'+['Ctrl','Shift','Alt','Win'].map(k=>key(k,true)).join('')+'</div></div><div class="computer-key-pages" data-key-page="'+page+'" aria-label="电脑键盘第 '+(page+1)+' 页">'+computerKeyPages[page].map(row=>'<div class="computer-key-row">'+row.map(k=>key(k)).join('')+'</div>').join('')+'</div><div class="computer-key-pagination">'+[0,1].map(i=>'<button aria-label="键盘第 '+(i+1)+' 页" aria-pressed="'+(page===i)+'" class="'+(page===i?'active':'')+'" data-action="computer-page:'+i+'"><span></span></button>').join('')+'</div></div>';
}
let computerSwipe=null,computerSuppressClickUntil=0;
document.addEventListener('pointerdown',e=>{const area=e.target.closest('.computer-key-pages');if(area)computerSwipe={id:e.pointerId,x:e.clientX,y:e.clientY,area};});
document.addEventListener('pointerup',e=>{const d=computerSwipe;if(!d||d.id!==e.pointerId)return;computerSwipe=null;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5){computerSuppressClickUntil=Date.now()+500;controlAction('computer-page:'+(dx<0?1:0));}},true);
document.addEventListener('pointercancel',()=>computerSwipe=null);
document.addEventListener('click',e=>{if(Date.now()<computerSuppressClickUntil&&e.target.closest('.computer-key-pages')){e.preventDefault();e.stopImmediatePropagation();}},true);
function computerKeyAction(key){
 if(!computerKeyGroups.some(([,keys])=>keys.includes(key)))return true;
 if(s.view){s.computerModifiers=[];return true;}
 s.imeBuffer='';const modifier=computerModifier(key),mods=s.computerModifiers||(s.computerModifiers=[]);
 if(['Ctrl','Alt','Shift','Win'].includes(modifier)){if(!s.computerCombo){s.lastRemoteKey=computerModifierLabel(key);s.computerModifiers=[];render();return true;}s.computerModifiers=mods.includes(modifier)?mods.filter(m=>m!==modifier):s.computerCombo?[...mods,modifier]:[modifier];render();return true;}
 s.lastRemoteKey=[...mods.map(computerModifierLabel),computerKeyLabel(key)].join('+');s.computerModifiers=[];
 let text=remoteText(),next=text;const doc=$('.doc'),start=doc?.selectionStart??text.length,end=doc?.selectionEnd??start;
 const insert=value=>text.slice(0,start)+value+text.slice(end);
 if(mods.includes('Ctrl')){
  if(key==='A'){render();$('.doc')?.select();return true;}
  if(key==='C'||key==='X'){s.remoteClipboard=text.slice(start,end);if(key==='X')next=insert('');}
  if(key==='V')next=insert(s.remoteClipboard||'');
  if(key==='Z'&&s.remoteUndo!==undefined){next=s.remoteUndo;s.remoteRedo=text;}
  if(key==='Y'&&s.remoteRedo!==undefined)next=s.remoteRedo;
 }else if(!mods.some(m=>m==='Alt'||m==='Win')){
  if(key==='CapsLock')s.remoteCaps=!s.remoteCaps;
  else if(key==='Backspace')next=start!==end?insert(''):text.slice(0,Math.max(0,start-1))+text.slice(end);
  else if(key==='Delete')next=start!==end?insert(''):text.slice(0,start)+text.slice(end+1);
  else if(key==='Enter'||key==='NumpadEnter')next=insert('\n');
  else if(key==='Space')next=insert(' ');
  else if(key==='Tab')next=insert('\t');
  else {let value=computerKeyLabel(key);if(value.length===1&&!key.startsWith('Arrow')){if(/^[A-Z]$/.test(key))value=mods.includes('Shift')!==!!s.remoteCaps?value:value.toLowerCase();else if(mods.includes('Shift')&&!key.startsWith('Numpad')){const plain="`1234567890-=[]\\;',./",shift='~!@#$%^&*()_+{}|:"<>?';const index=plain.indexOf(value);if(index>=0)value=shift[index];}next=insert(value);}}
 }
 if(next!==text){if(key!=='Z'&&key!=='Y')s.remoteUndo=text;writeRemote(next);}render();return true;
}

// Scale only the screen contents inside the existing letterboxed viewport.
// Floating mouse and virtual controls are intentionally outside this transform.
function prepareRemoteSurface(canvas){
 if(canvas.querySelector(':scope > .remote-zoom-surface'))return;
 const surface=document.createElement('div');surface.className='remote-zoom-surface';
 for(const child of [...canvas.children])if(!child.matches('.mapping-pad,.game-virtual-keys,.pill'))surface.append(child);
 canvas.prepend(surface);surface.style.transform='scale('+(s.remoteZoom||1)+')';
}
const remoteTouches=new Map();let remotePinch=null,blockRemoteClickUntil=0;
document.addEventListener('pointerdown',e=>{
 const canvas=e.target.closest('.remote-canvas');if(!canvas||e.pointerType!=='touch'||e.target.closest('button,.mapping-pad,.game-virtual-keys'))return;
 prepareRemoteSurface(canvas);remoteTouches.set(e.pointerId,{x:e.clientX,y:e.clientY,canvas});
 if(remoteTouches.size===2){const points=[...remoteTouches.values()];if(points[0].canvas!==points[1].canvas)return;e.preventDefault();remotePinch={canvas,distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),zoom:s.remoteZoom||1};for(const id of remoteTouches.keys())canvas.setPointerCapture(id);blockRemoteClickUntil=Date.now()+500;}
},true);
document.addEventListener('pointermove',e=>{
 const point=remoteTouches.get(e.pointerId);if(!point)return;point.x=e.clientX;point.y=e.clientY;
 if(!remotePinch||remoteTouches.size<2)return;e.preventDefault();e.stopImmediatePropagation();const points=[...remoteTouches.values()];const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);s.remoteZoom=Math.max(1,Math.min(3,remotePinch.zoom*distance/Math.max(1,remotePinch.distance)));remotePinch.canvas.querySelector('.remote-zoom-surface').style.transform='scale('+s.remoteZoom+')';blockRemoteClickUntil=Date.now()+500;
},true);
function endRemoteTouch(e){remoteTouches.delete(e.pointerId);if(remotePinch){blockRemoteClickUntil=Date.now()+500;if(remoteTouches.size<2)remotePinch=null;}}
document.addEventListener('pointerup',endRemoteTouch,true);document.addEventListener('pointercancel',endRemoteTouch,true);
document.addEventListener('click',e=>{if(Date.now()<blockRemoteClickUntil&&e.target.closest('.remote-canvas')){e.preventDefault();e.stopImmediatePropagation();}},true);
new MutationObserver(()=>{document.querySelectorAll('.remote-canvas').forEach(prepareRemoteSurface);}).observe(document.body,{childList:true,subtree:true});

window.addEventListener('blur',()=>{s.computerModifiers=[];cancelRemoteGestures();if(s.page==='session'&&s.panel==='keyboard')render();});
