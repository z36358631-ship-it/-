(function () {
  'use strict';
  const store=window.HelpStore,e=store.escape;
  const state={tab:'navs',language:'zh',selected:'',search:'',filter:'',feedback:'',deleting:'',range:null,busy:false};
  let root=null;
  const btn=(label,action,extra='',variant='')=>`<button type="button" class="ha-btn ${variant}" data-ha-action="${action}" ${extra}>${label}</button>`;
  const textBtn=(label,action,id,extra='',variant='')=>`<button type="button" class="ha-text ${variant}" data-ha-action="${action}" data-id="${id}" ${extra}>${label}</button>`;
  const current=()=>store.get(state.tab,state.selected);
  const rich=()=>root?.querySelector('[data-ha-body]');
  const title=row=>row?.[state.language]?.title||'未命名';
  const sorted=(type,navId)=>store.draft[type].filter(row=>!navId||row.navId===navId).slice().sort((a,b)=>{
    if(type==='docs'&&!navId) {const first=store.get('navs',a.navId)?.order??Infinity,second=store.get('navs',b.navId)?.order??Infinity;if(first!==second)return first-second;}
    return a.order-b.order;
  });
  function save() {
    const item=current(); if(!item||!root) return;
    const titleInput=root.querySelector('[data-ha-title]');
    if(titleInput) item[state.language].title=titleInput.value;
    if(rich()) item[state.language].html=store.sanitize(rich().innerHTML);
    const nav=root.querySelector('[data-ha-nav]');
    if(nav&&item.navId!==nav.value) {item.navId=nav.value;item.order=Math.max(0,...store.draft.docs.filter(doc=>doc.navId===nav.value).map(doc=>doc.order))+10;}
    store.notify();
    const saved=root.querySelector('[data-ha-saved]'); if(saved) saved.textContent='草稿已自动保留 · 发布后才会同步 App';
  }
  function feedback(message) {state.feedback=message;const node=root?.querySelector('[data-ha-feedback]');if(node) node.textContent=message;}
  function rememberSelection() {const selection=window.getSelection();if(selection?.rangeCount&&rich()?.contains(selection.anchorNode))state.range=selection.getRangeAt(0).cloneRange();}
  function restoreSelection() {
    const body=rich(); if(!body) return false; body.focus(); const selection=window.getSelection();selection.removeAllRanges();
    if(state.range&&body.contains(state.range.commonAncestorContainer)) selection.addRange(state.range);
    else {const range=document.createRange();range.selectNodeContents(body);range.collapse(false);selection.addRange(range);}
    return true;
  }
  function insert(html) {if(!restoreSelection())return;document.execCommand('insertHTML',false,store.sanitize(html));save();rememberSelection();}
  function list() {
    const docs=state.tab==='docs';
    const all=sorted(state.tab),keyword=state.search.trim().toLowerCase();
    const rows=all.filter(item=>(!keyword||`${item.id} ${item.zh.title} ${item.en.title}`.toLowerCase().includes(keyword))&&(!docs||!state.filter||item.navId===state.filter));
    return `<section class="ha-panel"><div class="ha-panel-head"><div><h2>${docs?'目录子文档':'导航目录'}</h2><p>${docs?'所属导航发布后，子文档可独立发布至 App。':'分别维护导航与子文档，确认中英文内容后逐条发布。'}</p></div>${btn(docs?'＋ 新建子文档':'＋ 新建导航','create','','primary')}</div><div class="ha-filters"><input type="search" data-ha-search aria-label="搜索标题或编号" placeholder="${docs?'输入文档标题或唯一编号':'输入导航名称或唯一编号'}" value="${e(state.search)}">${docs?`<select data-ha-filter aria-label="按导航筛选"><option value="">全部导航</option>${sorted('navs').map(nav=>`<option value="${nav.id}" ${nav.id===state.filter?'selected':''}>${e(title(nav))}</option>`).join('')}</select>`:''}${btn('查询','search','','primary')}${btn('重置','reset')}</div><div class="ha-table-wrap"><table><thead><tr><th>${docs?'文档标题':'导航名称'} / 唯一编号</th>${docs?'<th>所属导航</th>':'<th>子文档</th>'}<th>多语言</th><th>发布状态</th><th>操作</th></tr></thead><tbody>${rows.map(item=>{
      const group=sorted(state.tab,docs?item.navId:null),index=group.indexOf(item),status=store.status(state.tab,item.id);
      return `<tr><td><strong>${e(title(item))}</strong><small>${item.id}</small></td><td>${docs?e(title(store.get('navs',item.navId))):`${store.draft.docs.filter(doc=>doc.navId===item.id).length} 篇`}</td><td><span class="ha-lang-pill">中文 ${item.zh.title.trim()?'✓':'—'}</span><span class="ha-lang-pill">EN ${item.en.title.trim()?'✓':'—'}</span></td><td><span class="ha-state ${status==='已发布'?'':'draft'}">${status}</span></td><td><div class="ha-actions">${status!=='已发布'?textBtn('发布','publish',item.id,'','orange'):''}${textBtn('上移','up',item.id,index===0?'disabled':'')}${textBtn('下移','down',item.id,index===group.length-1?'disabled':'')}${textBtn('编辑','edit',item.id,'','orange')}${textBtn('删除','delete',item.id,'','red')}</div></td></tr>`;
    }).join('')||'<tr><td colspan="5" class="ha-empty">没有匹配的内容，请调整筛选条件。</td></tr>'}</tbody></table></div>${state.deleting?`<div class="ha-delete"><span>确认删除「${e(title(store.get(state.tab,state.deleting)))}」？${store.published[state.tab].some(item=>item.id===state.deleting)?'已发布内容将同步从 App 移除。':'该草稿将被移除。'}</span>${btn('取消','cancel-delete')}${btn('确认删除','confirm-delete','','danger')}</div>`:''}<footer class="ha-foot">共 ${rows.length} ${docs?'篇子文档':'个导航'}</footer></section><p class="ha-note">编辑后逐条发布；排序立即同步已发布内容，未发布草稿不会提前展示。</p>`;
  }
  function editor() {
    const item=current(),docs=state.tab==='docs',en=state.language==='en';
    if(!item){state.selected='';return list();}
    return `<section class="ha-panel"><header class="ha-editor-head"><button class="ha-back" data-ha-action="back">← 返回列表</button><div class="ha-editor-meta"><div><h2>${docs?'目录子文档配置':'帮助中心导航配置'}</h2><small>${item.id} · ${en?'English':'中文'}</small></div><span class="ha-state draft">编辑草稿</span></div></header><div class="ha-form"><div class="ha-fields"><label class="ha-field"><span>唯一编号</span><input value="${item.id}" disabled><small>系统生成，创建后不可修改</small></label>${docs?`<label class="ha-field"><span>所属导航<em>*</em></span><select data-ha-nav>${sorted('navs').map(nav=>`<option value="${nav.id}" ${nav.id===item.navId?'selected':''}>${e(title(nav))}</option>`).join('')}</select><small>变更后移至目标导航末尾，发布后生效</small></label>`:''}<label class="ha-field ${docs?'full':''}"><span>${en?'Title':docs?'文档标题':'导航名称'}<em>*</em></span><input data-ha-title maxlength="120" value="${e(item[state.language].title)}" placeholder="${en?'Enter title':'请输入标题'}"><small>${en?'This version is shown in English.':'此版本用于中文界面。'}</small></label></div>${docs?`<div class="ha-field"><span>${en?'Article body':'文档正文'}<em>*</em></span><small>支持文字、标题、列表、链接、图片与视频混排。</small></div><div class="ha-rich"><div class="ha-rich-toolbar" role="toolbar" aria-label="正文格式工具"><button type="button" data-ha-command="formatBlock" data-value="H2" title="二级标题">H2</button><button type="button" data-ha-command="formatBlock" data-value="P" title="正文">正文</button><button type="button" data-ha-command="bold" title="加粗"><b>B</b></button><button type="button" data-ha-command="insertUnorderedList" title="无序列表">• 列表</button><button type="button" data-ha-command="insertOrderedList" title="有序列表">1. 列表</button><button type="button" data-ha-action="link">↗ 链接</button><button type="button" data-ha-action="image">▧ 插入图片</button><button type="button" data-ha-action="video">▷ 插入视频</button></div><div class="ha-inline-link" data-ha-link hidden><input type="url" data-ha-url aria-label="链接地址" placeholder="https://example.com">${btn('插入','insert-link')}${btn('取消','close-link')}</div><div class="ha-rich-body" data-ha-body contenteditable="true" role="textbox" aria-multiline="true" aria-label="${en?'Article body':'文档正文'}">${store.sanitize(item[state.language].html)}</div></div><input hidden data-ha-image-file type="file" accept="image/png,image/jpeg,image/gif,image/webp"><input hidden data-ha-video-file type="file" accept="video/mp4,video/webm,video/ogg"><p class="ha-note">本地图片：PNG / JPG / GIF / WebP；视频：MP4 / WebM / Ogg。播放器不自动播放。</p>`:''}</div><footer class="ha-editor-footer"><small data-ha-saved>草稿已自动保留 · 发布后才会同步 App</small>${btn('保存草稿并返回','back','','primary')}</footer></section>`;
  }
  function render() {
    if(!root)return;
    root.innerHTML=`<div class="ha"><aside class="ha-side"><div class="ha-logo">GameHub</div><small>内容配置</small><div class="ha-side-item active">帮助中心</div></aside><div class="ha-main"><div class="ha-top"><span>内容管理　/　<strong>帮助中心</strong></span><span>平台运营</span></div><div class="ha-content"><div class="ha-heading"><div><h1>帮助中心</h1><p class="ha-sub">管理 App 帮助内容，让解答清晰易读。</p></div><div class="ha-langs" role="group" aria-label="编辑语言"><button data-ha-lang="zh" class="${state.language==='zh'?'active':''}">中文</button><button data-ha-lang="en" class="${state.language==='en'?'active':''}">English</button></div></div><nav class="ha-tabs" aria-label="内容类型"><button data-ha-tab="navs" class="${state.tab==='navs'?'active':''}">导航目录</button><button data-ha-tab="docs" class="${state.tab==='docs'?'active':''}">目录子文档</button></nav><div class="ha-feedback" data-ha-feedback role="status">${e(state.feedback)}</div>${state.selected?editor():list()}</div></div></div>`;
    state.range=null;
  }
  async function media(file,kind) {
    if(!file)return;
    const docId=state.selected,lang=state.language;
    if(state.busy){feedback('正在读取媒体，请稍候。');return;}
    const allowed=kind==='image'?/^image\/(png|jpeg|gif|webp)$/:/^video\/(mp4|webm|ogg)$/;
    if(!allowed.test(file.type)){feedback('文件格式不受支持，原正文已保留。');return;}
    const max=kind==='image'?10:30;
    if(file.size>max*1024*1024){feedback(`本 Demo 单个${kind==='image'?'图片':'视频'}限 ${max} MB，原正文已保留。`);return;}
    state.busy=true;store.pendingMedia.add(docId);feedback('正在读取并校验媒体…');
    try {
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('读取失败'));reader.readAsDataURL(file);});
      await new Promise((resolve,reject)=>{
        const element=document.createElement(kind==='image'?'img':'video');const timer=setTimeout(()=>{element.removeAttribute('src');reject(new Error('校验超时'));},10000);
        const done=fn=>{clearTimeout(timer);element.removeAttribute('src');fn();};
        element[kind==='image'?'onload':'onloadedmetadata']=()=>done(resolve);element.onerror=()=>done(()=>reject(new Error('无法解码')));element.src=data;
      });
      const html=kind==='image'?`<p><img src="${data}" alt="${e(file.name)}"></p><p><br></p>`:`<p><video src="${data}" controls playsinline preload="metadata"></video></p><p><br></p>`;
      if(root&&state.selected===docId&&state.language===lang&&rich()){insert(html);feedback(`${kind==='image'?'图片':'视频'}已插入，发布后同步 App。`);}
      else {const item=store.get('docs',docId);if(item){item[lang].html+=store.sanitize(html);store.notify();}feedback('媒体已保留到原文章草稿。');}
    } catch(error) {feedback('媒体插入失败：文件无法读取或播放，原正文已保留。');}
    finally {state.busy=false;store.pendingMedia.delete(docId);}
  }
  function click(event) {
    const button=event.target.closest('button');if(!button||!root.contains(button))return;
    if(button.dataset.haLang){save();state.language=button.dataset.haLang;state.feedback='';render();return;}
    if(button.dataset.haTab){save();state.tab=button.dataset.haTab;state.selected='';state.search='';state.filter='';state.deleting='';state.feedback='';render();return;}
    if(button.dataset.haCommand){restoreSelection();document.execCommand(button.dataset.haCommand,false,button.dataset.value||null);save();rememberSelection();return;}
    const action=button.dataset.haAction,id=button.dataset.id;
    if(!action)return;
    if(action==='image'||action==='video'){rememberSelection();root.querySelector(`[data-ha-${action}-file]`).click();return;}
    if(action==='link'){rememberSelection();root.querySelector('[data-ha-link]').hidden=false;root.querySelector('[data-ha-url]').focus();return;}
    if(action==='close-link'){root.querySelector('[data-ha-link]').hidden=true;return;}
    if(action==='insert-link'){const url=root.querySelector('[data-ha-url]').value.trim();if(!store.safeLink(url)){feedback('请输入有效的 https:// 链接；不支持脚本或其他协议。');return;}restoreSelection();const selection=window.getSelection();if(selection.isCollapsed)insert(`<a href="${e(url)}">${e(url)}</a>`);else{document.execCommand('createLink',false,url);save();}root.querySelector('[data-ha-link]').hidden=true;feedback('链接已加入草稿。');return;}
    save();state.feedback='';
    if(action==='edit'){state.selected=id;state.deleting='';}
    if(action==='back'){state.selected='';state.feedback='草稿已保存，尚未发布的修改不会影响 App。';}
    if(action==='create'){if(state.tab==='docs'&&!store.draft.navs.length){feedback('请先新建导航，再创建子文档。');return;}state.selected=store.create(state.tab).id;}
    if(action==='search'){state.search=root.querySelector('[data-ha-search]').value;state.filter=root.querySelector('[data-ha-filter]')?.value||'';}
    if(action==='reset'){state.search='';state.filter='';}
    if(action==='publish'){state.feedback=store.publish(state.tab,id)||'已发布，App 端内容已同步。';}
    if(action==='up'||action==='down'){store.move(state.tab,id,action==='up'?-1:1);state.feedback='排序已更新；已发布内容同步顺序，标题与正文草稿仍需单独发布。';}
    if(action==='delete'){if(state.tab==='navs'&&[...store.draft.docs,...store.published.docs].some(doc=>doc.navId===id))state.feedback='该导航仍有关联子文档，请先迁移并发布或删除子文档。';else state.deleting=id;}
    if(action==='cancel-delete')state.deleting='';
    if(action==='confirm-delete'){state.feedback=store.remove(state.tab,state.deleting)||'内容已删除。';state.deleting='';}
    render();
  }
  function change(event) {
    if(event.target.matches('[data-ha-image-file]')){media(event.target.files[0],'image');event.target.value='';}
    else if(event.target.matches('[data-ha-video-file]')){media(event.target.files[0],'video');event.target.value='';}
    else if(event.target.matches('[data-ha-nav]'))save();
    else if(event.target.matches('[data-ha-filter]')){state.filter=event.target.value;state.search=root.querySelector('[data-ha-search]').value;render();}
  }
  function input(event){if(event.target.matches('[data-ha-title],[data-ha-body]'))save();}
  function paste(event){if(!event.target.closest('[data-ha-body]'))return;event.preventDefault();const html=event.clipboardData.getData('text/html'),text=event.clipboardData.getData('text/plain');rememberSelection();insert(html||`<p>${e(text).replace(/\n/g,'<br>')}</p>`);}
  function drop(event){if(!event.target.closest('[data-ha-body]'))return;event.preventDefault();feedback('请使用工具栏插入媒体；正文内容已保留。');}
  function keydown(event){if(event.key==='Enter'&&event.target.matches('[data-ha-search]')){event.preventDefault();state.search=event.target.value;render();}}
  function mousedown(event){if(event.target.closest('[data-ha-command],.ha-rich-toolbar button')){rememberSelection();event.preventDefault();}}
  const events={click,change,input,paste,drop,keydown,mousedown,keyup:rememberSelection,mouseup:rememberSelection};
  window.HelpAdmin={
    mount(element){if(root)this.unmount();root=element;render();Object.entries(events).forEach(([name,handler])=>root.addEventListener(name,handler));},
    unmount(){if(root){save();root.querySelectorAll('video').forEach(video=>video.pause());Object.entries(events).forEach(([name,handler])=>root.removeEventListener(name,handler));root=null;}}
  };
})();

