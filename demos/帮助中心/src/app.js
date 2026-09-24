(()=>{'use strict';
const $=s=>document.querySelector(s), device=$('#device');
const params=new URLSearchParams(location.search);
const state={page:params.get('page')||'settings',docId:params.get('doc')||'',orientation:params.get('orientation')==='landscape'?'landscape':'portrait',lang:params.get('lang')||'zh',package:params.get('package')||'domestic',version:params.get('version')||'6.3.2',protocol:params.get('protocol')||'android-official',scenario:'normal',surface:params.get('surface')==='admin'?'admin':'app'};
const scrollPositions={settings:0,help:0,feedback:0};
const isLandscape=()=>state.orientation==='landscape'&&window.innerWidth>=600;
if(params.has('capture'))document.body.classList.add('capture-mode');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hindi={'返回':'वापस','设置':'सेटिंग्स','账号管理':'खाता प्रबंधन','模式切换':'मोड बदलें','兑换中心':'रिडीम केंद्र','通知':'सूचनाएँ','按键音':'बटन की आवाज़','隐私设置':'गोपनीयता सेटिंग्स','存储管理':'स्टोरेज प्रबंधन','下载任务':'डाउनलोड','探索模式':'एक्सप्लोर मोड','帮助中心':'सहायता केंद्र','反馈&建议':'प्रतिक्रिया और सुझाव','关于':'परिचय','退出登录':'लॉग आउट','提交反馈':'प्रतिक्रिया भेजें','反馈历史':'प्रतिक्रिया इतिहास','官方网站':'आधिकारिक वेबसाइट','重新加载':'फिर से लोड करें','正在加载':'लोड हो रहा है','暂时无法加载':'लोड नहीं हो सका','请检查网络后重试':'नेटवर्क की जाँच करें और फिर कोशिश करें','暂无帮助内容':'कोई सहायता सामग्री नहीं','请稍后再来查看':'कृपया बाद में फिर देखें','内容暂不可用':'सामग्री उपलब्ध नहीं','该文章可能已被移除，请返回帮助中心':'यह लेख हटा दिया गया हो सकता है। सहायता केंद्र पर वापस जाएँ।','选择文章查看帮助':'पढ़ने के लिए लेख चुनें','视频暂时无法播放':'वीडियो नहीं चल सका','重试':'फिर कोशिश करें','图片加载失败':'चित्र उपलब्ध नहीं'};
const text=(zh,en)=>state.lang==='zh'?zh:state.lang==='hi'?(hindi[zh]||en):en;
const img=(id,cl='')=>`<img class="${cl}" src="${window.HELP_ASSETS[id]}" alt="">`;
const arrow=()=>img('arrow','row-arrow');
const navs=()=>[...HelpStore.published.navs].filter(n=>!n.package||n.package===state.package).sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
const docs=()=>[...HelpStore.published.docs].filter(d=>(!d.package||d.package===state.package)&&(!HelpStore.visible||HelpStore.visible(d,state.package,state.version,state.protocol))&&navs().some(n=>n.id===d.navId)).sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
const locale=o=>HelpStore.locale?HelpStore.locale(o,state.lang):o?.[state.lang]||o?.en||o?.zh||{title:'',html:''};
const back=()=>`<button class="app-back" data-back aria-label="${text('返回','Back')}">${img('back')}</button>`;
const status=()=>`<div class="statusbar" aria-hidden="true"><span>10:11</span><span class="status-right"><span class="signal">▂▄▆</span><span>⌁</span><span class="battery">91</span></span></div>`;
const rows=[['account','账号管理','Account'],['mode','模式切换','Mode'],['gift','兑换中心','Redeem'],['bell','通知','Notifications'],['sound','按键音','Key sounds'],['shield','隐私设置','Privacy'],['storage','存储管理','Storage'],['download','下载任务','Downloads']];
function settingRow(icon,label,en,route='',value=''){
 return `<${route?'button':'div'} class="setting-row" ${route?`data-route="${route}"`:''}>${img(icon,'row-icon')}<span class="row-label">${text(label,en)}</span>${value?`<span class="row-value">${value}</span>`:''}${arrow()}</${route?'button':'div'}>`;
}
function settings(){return `<div class="settings-main"><div class="settings-card" data-component-id="C-SETTINGS-MAIN">${rows.map(r=>settingRow(...r,'',r[0]==='mode'?text('探索模式','Explore'): '')).join('')}</div></div><div class="settings-secondary"><div class="settings-card" data-component-id="C-SETTINGS-SUPPORT">${params.has('baseline')?'':settingRow('feedback','帮助中心','Help Center','help')}${settingRow('feedback','反馈&建议','Feedback','feedback')}${settingRow('info','关于','About')}</div><div class="settings-card"><div class="setting-row logout-row">${text('退出登录','Log out')}</div></div></div>`;}
function feedback(){return `<div class="settings-card">${['提交反馈','反馈历史','官方网站'].map((s,i)=>`<div class="setting-row"><span class="row-label">${text(s,['Submit feedback','Feedback history','Official website'][i])}</span>${arrow()}</div>`).join('')}</div>`;}
function groups(){return navs().map(n=>{const list=docs().filter(d=>d.navId===n.id);return list.length?`<section class="help-group"><h2>${esc(locale(n).title)}</h2><div class="help-card">${list.map(d=>`<button class="help-row" data-doc="${esc(d.id)}" ${state.docId===d.id?'aria-current="page"':''}><span>${esc(locale(d).title)}</span>${arrow()}</button>`).join('')}</div></section>`:'';}).join('');}
function empty(title,copy='',retry=false){return `<div class="state-content"><h2>${title}</h2>${copy?`<p>${copy}</p>`:''}${retry?`<button class="inline-retry" data-retry>${text('重新加载','Try again')}</button>`:''}</div>`;}
function helpState(articlePage=false){
 if(state.scenario==='loading')return `<div class="state-content" role="status"><span class="spinner"></span><h2>${text('正在加载','Loading')}</h2></div>`;
 if(state.scenario==='error')return empty(text('暂时无法加载','Unable to load'),text('请检查网络后重试','Check your connection and try again'),true);
 if(state.scenario==='empty'||(!articlePage&&!docs().length))return empty(text('暂无帮助内容','No help content'),text('请稍后再来查看','Please check back later'));
 return '';
}
function article(){
 const d=docs().find(d=>d.id===state.docId);
 if(!d)return empty(text('内容暂不可用','Content unavailable'),text('该文章可能已被移除，请返回帮助中心','This article may have been removed. Return to Help Center.'));
 const n=navs().find(n=>n.id===d.navId);
 return `<article class="article"><h2>${esc(locale(d).title)}</h2><p class="article-category">${esc(locale(n).title)}</p><div class="article-content">${locale(d).html||''}</div></article>`;
}
function pauseVideos(){device.querySelectorAll('video').forEach(v=>v.pause());}
function render(){
 pauseVideos();device.className=`device ${isLandscape()?'landscape':'portrait'}`;
 const title=state.page==='settings'?text('设置','Settings'):state.page==='feedback'?text('反馈&建议','Feedback'):text('帮助中心','Help Center');
 const err=state.page==='help'||state.page==='article'?helpState(state.page==='article'):'';
 if(!isLandscape()){
  const content=state.page==='settings'?settings():state.page==='feedback'?feedback():err||(state.page==='article'?article():groups());
  device.innerHTML=`${status()}<header class="app-header" data-component-id="C-TOPBAR">${back()}<h1>${title}</h1></header><div class="app-body" data-page="${state.page}">${content}</div>`;
 }else{
  let content;
  if(state.page==='settings')content=`<div class="land-settings">${settings()}</div>`;
  else if(state.page==='feedback')content=`<div class="land-reading">${feedback()}</div>`;
  else content=`<div class="land-layout"><aside class="land-menu">${err?'':groups()}</aside><div class="land-reading">${err||(state.docId?article():`<div class="land-placeholder">${text('选择文章查看帮助','Select an article to read')}</div>`)}</div></div>`;
  device.innerHTML=`<header class="land-header" data-component-id="C-TOPBAR">${back()}<h1>${title}</h1><span class="land-clock">10:11　▂▄▆　91%</span></header>${content}`;
 }
 const scroller=device.querySelector('.app-body');if(scroller&&state.page!=='article')scroller.scrollTop=scrollPositions[state.page]||0;
 device.lang=state.lang;fitLabels();bindMedia();
}
function fitLabels(){device.querySelectorAll('.setting-row .row-label,.setting-row .row-value,.app-header h1,.land-header h1').forEach(el=>{el.style.fontSize='';let size=parseFloat(getComputedStyle(el).fontSize);while((el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)&&size>12){size-=.5;el.style.fontSize=size+'px';}});}
function bindMedia(){
 device.querySelectorAll('.article-content video').forEach(v=>{
  v.controls=true;v.autoplay=false;v.removeAttribute('autoplay');v.setAttribute('playsinline','');v.preload='metadata';
  const original=v.currentSrc||v.getAttribute('src')||v.querySelector('source')?.src;
  const failed=()=>{if(v.nextElementSibling?.classList.contains('media-error'))return;v.hidden=true;const panel=document.createElement('div');panel.className='media-error';panel.setAttribute('role','status');panel.innerHTML=`${text('视频暂时无法播放','Unable to play this video')}<button class="inline-retry">${text('重试','Retry')}</button>`;v.after(panel);panel.querySelector('button').onclick=()=>{panel.remove();v.hidden=false;v.src=original;v.load();state.scenario='normal';$('#scenario').value='normal';};};
  v.addEventListener('error',failed);
  if(state.scenario==='media-error')failed();
 });
 device.querySelectorAll('.article-content img').forEach(im=>im.addEventListener('error',()=>{im.alt=text('图片加载失败','Image unavailable');}));
 device.querySelectorAll('.article-content a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
}
function go(page,docId=''){const scroller=device.querySelector('.app-body');if(scroller&&state.page!=='article')scrollPositions[state.page]=scroller.scrollTop;state.page=page;state.docId=docId;if(page==='help'&&isLandscape())state.docId=docs()[0]?.id||'';render();}
function goBack(){if(isLandscape()&&['help','article'].includes(state.page)){go('settings');}else if(state.page==='article'){go('help');}else if(state.page!=='settings'){go('settings');}}
device.addEventListener('click',e=>{const b=e.target.closest('[data-route],[data-doc],[data-back],[data-retry]');if(!b)return;if(b.hasAttribute('data-back'))goBack();else if(b.dataset.doc)go('article',b.dataset.doc);else if(b.dataset.route)go(b.dataset.route);else{state.scenario='normal';$('#scenario').value='normal';render();}});
function surface(next){pauseVideos();state.surface=next;$('#app-stage').hidden=next!=='app';$('#admin-stage').hidden=next!=='admin';document.querySelectorAll('[data-surface]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.surface===next)));$('.demo-options').hidden=next!=='app';if(next==='admin'){HelpAdmin.mount($('#admin-stage'));}else{HelpAdmin.unmount?.();render();}}
document.querySelectorAll('[data-surface]').forEach(b=>b.onclick=()=>surface(b.dataset.surface));
$('#orientation').onclick=()=>{state.orientation=state.orientation==='portrait'?'landscape':'portrait';if(state.orientation==='landscape'&&state.page==='help'&&!state.docId)state.docId=docs()[0]?.id||'';$('#orientation').textContent=state.orientation==='portrait'?'横屏':'竖屏';$('#orientation').setAttribute('aria-pressed',String(state.orientation==='landscape'));render();};
$('#protocol').onchange=e=>{state.protocol=e.target.value;state.docId='';if(state.page==='article')state.page='help';render();};
$('#package').onchange=e=>{state.package=e.target.value;state.docId='';if(state.page==='article')state.page='help';render();};
$('#version').onchange=e=>{state.version=e.target.value.trim()||'6.3.2';state.docId='';if(state.page==='article')state.page='help';render();};
$('#language-select').onchange=e=>{state.lang=e.target.value;render();};
$('#scenario').onchange=e=>{state.scenario=e.target.value;if(state.page==='settings'||state.page==='feedback')state.page='help';if(state.scenario==='media-error'){state.docId=docs().find(d=>locale(d).html.includes('<video'))?.id||docs()[0]?.id;state.page='article';}render();};
document.addEventListener('keydown',e=>{if(state.surface!=='app')return;if(e.key==='Escape'){e.preventDefault();goBack();}if(state.orientation==='landscape'&&['ArrowDown','ArrowUp'].includes(e.key)){const list=[...device.querySelectorAll('button')];let idx=list.indexOf(document.activeElement);idx=(idx+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;list[idx]?.focus();e.preventDefault();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseVideos();});
window.addEventListener('resize',()=>{if(state.surface==='app')render();});
HelpStore.subscribe(()=>{if(state.surface==='app')render();});
window.HelpApp={state,render,go,surface};
$('#protocol').innerHTML=HelpStore.protocols.map(p=>`<option value="${esc(p.code)}">${esc(p.label)}</option>`).join('');$('#protocol').value=state.protocol;
if($('#package'))$('#package').value=state.package;
if($('#version'))$('#version').value=state.version;
if($('#language-select'))$('#language-select').value=state.lang;
surface(state.surface);
})();
