/* Review controls only; these shortcuts are outside the app canvas. */
const labAppRender=render;
function paintLabControls(){
 const page=appState.page;
 const scene=consoleState.menu?'menu':page;
 const button=(title,id)=>`<button type="button" data-act="lab-scene" data-scene="${id}" aria-pressed="${scene===id}" class="${scene===id?'active':''}">${title}</button>`;
 document.querySelector('#page-nav').innerHTML=`<section><h2>页面</h2><div class="lab-page-grid">${button('游戏库','steam')}${button('游戏空间','console-game')}${button('启动过程','console-launch')}${button('游戏画面','console-player')}${button('游戏菜单','menu')}</div></section><section><h2>首页内容</h2><div class="lab-page-grid">${[['home','推荐首页'],['pc','PC 游戏']].map(([id,title])=>`<button type="button" data-act="page" data-page="${id}" aria-pressed="${page===id}" class="${page===id?'active':''}">${title}</button>`).join('')}</div></section>`;
 document.querySelector('#lab-sound').innerHTML=`<button type="button" class="lab-sound" data-act="console-sound" aria-pressed="${consoleState.sound}"><span>界面音效</span><span class="lab-switch ${consoleState.sound?'on':''}" aria-hidden="true"><i></i></span></button>`;
}
render=function(preserve=false){labAppRender(preserve);paintLabControls();};
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-act="lab-scene"]');if(!el)return;
 event.preventDefault();event.stopImmediatePropagation();
 consoleCancelTimer();consoleCancelTransition();consoleState.menu=false;consoleState.origin=null;trail.length=0;overlayData=null;appState.detail={};
 const scene=el.dataset.scene;
 if(scene==='console-launch'){appState.page='console-game';consoleStart();}
 else {appState.page=scene==='menu'?'console-player':scene;consoleState.menu=scene==='menu';render();}
},true);
