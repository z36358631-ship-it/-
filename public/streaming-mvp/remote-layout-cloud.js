/* Reuse boundary only: existing GameHub layout UI is represented as a wireframe. */
(()=>{
 const ui={open:false,page:'',device:'',owner:''};
 const L=(zh,en)=>document.documentElement.lang==='en'?en:zh;
 const owner=()=>mobileAuth.loggedIn?mobileAuth.region+'|'+mobileAuth.accountPhone:'';
 function close(){ui.open=false;document.querySelector('.rlc-overlay')?.remove();}
 function valid(){return ui.open&&owner()&&owner()===ui.owner&&s.page===ui.page&&s.device===ui.device&&!s.view;}
 function card(name,en,type){return '<div class="rlc-wire-card"><div class="rlc-wire-preview"><span>'+L('布局缩略图','Layout preview')+'</span><i></i><i></i><i></i><i></i></div><strong>'+L(name,en)+'</strong><small>'+L(type==='game'?'游戏布局':'通用布局',type==='game'?'Game layout':'General layout')+'</small></div>';}
 function paint(){document.querySelector('.rlc-overlay')?.remove();if(!valid()){ui.open=false;return;}const shell=document.querySelector('.mobile-independent-shell');if(!shell)return;
  const el=document.createElement('section');el.className='rlc-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',L('按键与布局 · 复用占位','Keys and layouts · Reuse placeholder'));
  el.innerHTML='<header class="rlc-wire-head"><button data-action="rlc:close" aria-label="'+L('返回远控','Back to remote session')+'">'+icon('back')+'</button><h2>'+L('按键与布局','Keys and layouts')+'</h2><span>'+L('线框占位','Wireframe')+'</span></header><div class="rlc-wire-scroll"><aside class="rlc-reuse-note"><strong>'+L('复用盖世游戏现有「按键与布局」模块','Reuse GameHub’s existing Keys and layouts module')+'</strong><p>'+L('以下仅展示已有功能结构，具体页面与交互复用原模块。','Existing features are shown below. Screens and interactions reuse the original module.')+'</p></aside><nav class="rlc-wire-tools" aria-label="'+L('已有功能（占位）','Existing features (placeholder)')+'">'+[['排行','Rankings','grid'],['自定义','Customize','settings'],['图标管理器','Icon manager','game']].map(([zh,en,i])=>'<button disabled>'+icon(i)+L(zh,en)+'</button>').join('')+'</nav><div class="rlc-wire-search">'+icon('search')+'<span>'+L('搜索','Search')+'</span></div><div class="rlc-wire-title"><h3>'+L('适合当前游戏的布局','Layouts for the current game')+'</h3><span>'+L('更多','More')+' ›</span></div><div class="rlc-wire-rail">'+card('游戏布局','Game layout','game')+card('游戏布局','Game layout','game')+card('游戏布局','Game layout','game')+'</div><div class="rlc-wire-title"><h3>'+L('全部布局','All layouts')+'</h3></div><div class="rlc-wire-grid">'+card('手柄默认布局','Default controller layout','common')+card('键鼠默认布局','Default keyboard & mouse layout','common')+'</div><aside class="rlc-reuse-details"><strong>'+L('编辑与云分享：复用现有流程','Editing and cloud sharing: reuse existing flows')+'</strong><p>'+L('布局详情、应用、编辑、我的方案、云分享及分享码导入均复用盖世游戏已有能力。本 Demo 不展开这些流程。','Layout details, applying, editing, My layouts, cloud sharing and share-code import reuse existing GameHub features. These flows are not expanded in this demo.')+'</p></aside></div>';
  shell.append(el);
 }
 function open(){if(!owner()||s.view||s.page!=='session')return;Object.assign(ui,{open:true,page:s.page,device:s.device,owner:owner()});s.panel='';render();}
 const previousAction=action;action=function(value){if(['mapping-plan','virtual-key-layout','mapping-layout'].includes(value)&&s.platform!=='mac'){open();return;}if(value.startsWith('rlc:')){if(value==='rlc:close')close();return;}return previousAction(value);};
 const previousRender=renderContent;renderContent=function(){previousRender();paint();};
 const previousClear=mobileClearAccountState;mobileClearAccountState=function(){close();return previousClear();};
 document.addEventListener('keydown',event=>{if(valid()&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}},true);
 let lang=document.documentElement.lang;new MutationObserver(()=>{if(lang!==document.documentElement.lang){lang=document.documentElement.lang;paint();}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
