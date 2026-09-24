(function () {
  'use strict';
  const store=window.HelpStore,e=store.escape;
  const state={tab:'navs',language:'zh',package:'domestic',selected:'',search:'',filter:'',feedback:'',deleting:'',range:null,busy:false,modal:null};
  const languageDrafts=new Map();
  let root=null;
  const btn=(label,action,extra='',variant='')=>`<button type="button" class="ha-btn ${variant}" data-ha-action="${action}" ${extra}>${label}</button>`;
  const textBtn=(label,action,id,extra='',variant='')=>`<button type="button" class="ha-text ${variant}" data-ha-action="${action}" data-id="${id}" ${extra}>${label}</button>`;
  const current=()=>store.get(state.modal?.type||state.tab,state.modal?.id||state.selected);
  const defaultLanguage=()=>state.package==='domestic'?'zh':'en';
  const rich=()=>root?.querySelector('[data-ha-body]');
  const title=row=>store.locale(row,state.language)?.title||'未命名';
  const sorted=(type,navId)=>store.draft[type].filter(row=>row.package===state.package&&(!navId||row.navId===navId)).slice().sort((a,b)=>{
    if(type==='docs'&&!navId) {const first=store.get('navs',a.navId)?.order??Infinity,second=store.get('navs',b.navId)?.order??Infinity;if(first!==second)return first-second;if(a.navId!==b.navId)return a.navId.localeCompare(b.navId);}
    return a.order-b.order||a.id.localeCompare(b.id);
  });
  function languageSearch(item){return store.languages.map(lang=>item[lang.code]?.title||'').join(' ');}
  function save() {
    const item=current(); if(!item||!root) return;
    const titleInput=root.querySelector('[data-ha-title]');
    if(!titleInput)return;
    if(!item[state.language]) item[state.language]={title:'',...(state.tab==='docs'?{html:''}:{})};
    if(titleInput) item[state.language].title=titleInput.value;
    if(rich()) item[state.language].html=store.sanitize(rich().innerHTML);
    if(root.querySelector('[data-ha-protocols]'))item.protocols=[...root.querySelectorAll('[data-ha-protocol]:checked')].map(input=>input.value);
    const nav=root.querySelector('[data-ha-nav]');
    if(nav&&item.navId!==nav.value) {item.navId=nav.value;item.order=Math.min(999999,Math.max(0,...store.draft.docs.filter(doc=>doc.navId===nav.value).map(doc=>doc.order))+10);}
    store.notify();
    if(state.modal){
      const card=root.querySelector(`[data-ha-language-card="${state.language}"]`);
      if(card){
        card.querySelector('.ha-language-card-title').textContent=item[state.language].title||'尚未填写标题';
        const excerpt=card.querySelector('.ha-language-excerpt');
        if(excerpt){const fragment=document.createElement('div');fragment.innerHTML=store.sanitize(item[state.language].html||'');excerpt.textContent=fragment.textContent.trim().slice(0,100)||(fragment.querySelector('img,video')?'含图片或视频':'尚未填写正文');}
      }
    }
    const saved=root.querySelector('[data-ha-saved]'); if(saved) saved.textContent='草稿已自动保留 · 发布后才会同步 App';
  }
  function feedback(message) {state.feedback=message;const node=root?.querySelector('[data-ha-language-dialog] [data-ha-feedback]')||root?.querySelector('[data-ha-feedback]');if(node) node.textContent=message;}
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
    const all=sorted(state.tab).filter(item=>item.package===state.package),keyword=state.search.trim().toLowerCase();
    const rows=all.filter(item=>(!keyword||`${item.id} ${languageSearch(item)}`.toLowerCase().includes(keyword))&&(!docs||!state.filter||item.navId===state.filter));
    return `<section class="ha-panel"><div class="ha-panel-head"><div><h2>${docs?'目录子文档':'导航目录'}</h2><p>${docs?'所属导航发布后，子文档可独立发布至 App。':'分别维护导航与子文档，同一条内容集中维护多语言，完成默认语言后逐条发布。'}</p></div>${btn(docs?'＋ 新建子文档':'＋ 新建导航','create','','primary')}</div><div class="ha-filters"><input type="search" data-ha-search aria-label="搜索标题或编号" placeholder="${docs?'输入文档标题或唯一编号':'输入导航名称或唯一编号'}" value="${e(state.search)}">${docs?`<select data-ha-filter aria-label="按导航筛选"><option value="">全部导航</option>${sorted('navs').filter(nav=>nav.package===state.package).map(nav=>`<option value="${nav.id}" ${nav.id===state.filter?'selected':''}>${e(title(nav))}</option>`).join('')}</select>`:''}${btn('查询','search','','primary')}${btn('重置','reset')}</div><div class="ha-table-wrap"><table><thead><tr><th>${docs?'文档标题':'导航名称'} / 唯一编号</th>${docs?'<th>所属导航</th>':'<th>子文档</th>'}<th>语言配置</th><th>排序权重</th><th>发布状态</th><th>操作</th></tr></thead><tbody>${rows.map(item=>{
      const status=store.status(state.tab,item.id);
      return `<tr data-ha-row="${item.id}"><td><strong>${e(title(item))}</strong><small>${item.id}</small></td><td>${docs?e(title(store.get('navs',item.navId))):`${store.draft.docs.filter(doc=>doc.navId===item.id).length} 篇`}</td><td><small>${store.languages.filter(lang=>item[lang.code]?.title?.trim()).length} / 6 种语言</small></td><td><input class="ha-weight" data-ha-order="${item.id}" aria-label="${e(title(item))}排序权重" type="number" min="0" max="999999" step="1" value="${item.order}">${textBtn('保存排序','save-order',item.id)}</td><td><span class="ha-state ${status==='已发布'?'':'draft'}">${status}</span></td><td><div class="ha-actions">${status!=='已发布'?textBtn('发布','publish',item.id,'','orange'):''}${textBtn('编辑','edit',item.id,'','orange')}${textBtn('删除','delete',item.id,'','red')}${textBtn('多语言','languages',item.id,'','orange')}</div></td></tr>`;
    }).join('')||'<tr><td colspan="6" class="ha-empty">没有匹配的内容，请调整筛选条件。</td></tr>'}</tbody></table></div>${state.deleting?`<div class="ha-delete"><span>确认删除「${e(title(store.get(state.tab,state.deleting)))}」？${store.published[state.tab].some(item=>item.id===state.deleting)?'已发布内容将同步从 App 移除。':'该草稿将被移除。'}</span>${btn('取消','cancel-delete')}${btn('确认删除','confirm-delete','','danger')}</div>`:''}<footer class="ha-foot">共 ${rows.length} ${docs?'篇子文档':'个导航'}</footer></section><p class="ha-note">权重越小越靠前，相同权重按编号排序。保存排序只同步权重；标题、正文和APP协议修改须逐条发布。</p>`;
  }
  function editor() {
    const item=current(),docs=state.tab==='docs',en=state.language==='en';
    const locale=item?.[state.language]||{title:'',html:''};
    if(!item){state.selected='';return list();}
    return `<section class="ha-panel"><header class="ha-editor-head"><button class="ha-back" data-ha-action="back">← 返回列表</button><div class="ha-editor-meta"><div><h2>${docs?'目录子文档配置':'帮助中心导航配置'}</h2><small>${item.id} · ${e(store.languages.find(lang=>lang.code===state.language)?.label||state.language)}</small></div><span class="ha-state draft">编辑草稿</span></div></header><div class="ha-form"><div class="ha-language-config"><div><strong>默认语言内容</strong><p>当前编辑 ${e(store.languages.find(lang=>lang.code===state.language)?.label)}；其他语言请返回列表，点击操作栏「多语言」维护。</p></div></div><div class="ha-fields"><label class="ha-field"><span>唯一编号</span><input value="${item.id}" disabled><small>系统生成，创建后不可修改</small></label><label class="ha-field"><span>所属包</span><input data-ha-object-package value="${item.package==='domestic'?'国内包':'海外包'}" disabled><small>创建后固定，不支持跨包迁移</small></label>${docs?`<label class="ha-field"><span>所属导航<em>*</em></span><select data-ha-nav>${sorted('navs',null).filter(nav=>nav.package===item.package).map(nav=>`<option value="${nav.id}" ${nav.id===item.navId?'selected':''}>${e(title(nav))}</option>`).join('')}</select><small>变更后移至目标导航末尾，发布后生效</small></label>`:''}${docs?`<fieldset class="ha-protocols ha-field full" data-ha-protocols><legend>APP协议<em>*</em></legend><div class="ha-protocol-options">${store.protocols.map(protocol=>`<label><input type="checkbox" data-ha-protocol value="${protocol.code}" ${(item.protocols||[]).includes(protocol.code)?'checked':''}><span>${e(protocol.label)}</span></label>`).join('')}</div><small>至少选择一项；与所属包共同决定文章展示范围。</small></fieldset>`:''}<label class="ha-field ${docs?'full':''}"><span>${en?'Title':docs?'文档标题':'导航名称'}${state.language===(state.package==='domestic'?'zh':'en')?'<em>*</em>':''}</span><input data-ha-title maxlength="120" value="${e(locale.title)}" placeholder="${en?'Enter title':'请输入标题'}"><small>${state.language===(state.package==='domestic'?'zh':'en')?'当前包默认语言，发布前须完整填写。':(docs?'可全部留空；填写时须同时完成标题与正文。':'可留空，展示时回退当前包默认语言。')}</small></label></div>${docs?`<div class="ha-field"><span>${en?'Article body':'文档正文'}${state.language===(state.package==='domestic'?'zh':'en')?'<em>*</em>':''}</span><small>支持文字、标题、列表、链接、图片与视频混排。</small></div><div class="ha-rich"><div class="ha-rich-toolbar" role="toolbar" aria-label="正文格式工具"><select data-ha-font-size aria-label="字号"><option value="">字号</option>${[14,16,18,20,24].map(size=>`<option value="${size}">${size}px</option>`).join('')}</select><button type="button" data-ha-command="formatBlock" data-value="H2" title="二级标题">H2</button><button type="button" data-ha-command="formatBlock" data-value="P" title="正文">正文</button><button type="button" data-ha-command="bold" title="加粗"><b>B</b></button><button type="button" data-ha-command="insertUnorderedList" title="无序列表">• 列表</button><button type="button" data-ha-command="insertOrderedList" title="有序列表">1. 列表</button><button type="button" data-ha-action="link">↗ 链接</button><button type="button" data-ha-action="image">▧ 插入图片</button><button type="button" data-ha-action="video">▷ 插入视频</button></div><div class="ha-inline-link" data-ha-link hidden><input type="url" data-ha-url aria-label="链接地址" placeholder="https://example.com">${btn('插入','insert-link')}${btn('取消','close-link')}</div><div class="ha-rich-body" data-ha-body contenteditable="true" role="textbox" aria-multiline="true" aria-label="${en?'Article body':'文档正文'}">${store.sanitize(locale.html||'')}</div></div><input hidden data-ha-image-file type="file" accept="image/png,image/jpeg,image/gif,image/webp"><input hidden data-ha-video-file type="file" accept="video/mp4,video/webm,video/ogg"><p class="ha-note">本地图片：PNG / JPG / GIF / WebP；视频：MP4 / WebM / Ogg。播放器不自动播放。</p>`:''}</div><footer class="ha-editor-footer"><small data-ha-saved>草稿已自动保留 · 发布后才会同步 App</small>${btn('保存草稿并返回','back','','primary')}</footer></section>`;
  }
  function configuredLanguages(item) {
    const extra=languageDrafts.get(item.id)||new Set();
    return store.languages.filter(lang=>lang.code===(item.package==='domestic'?'zh':'en')||extra.has(lang.code)||item[lang.code]?.title?.trim()||String(item[lang.code]?.html||'').replace(/<[^>]+>/g,'').trim()||/<(?:img|video)\b/i.test(item[lang.code]?.html||''));
  }
  function languageEditor() {
    const template=document.createElement('template');template.innerHTML=editor();
    const field=template.content.querySelector('[data-ha-title]').closest('label').outerHTML;
    const mediaNodes=['.ha-rich','[data-ha-image-file]','[data-ha-video-file]'].map(selector=>template.content.querySelector(selector)?.outerHTML||'').join('');
    return `<section class="ha-language-editor" data-ha-language-editor="${state.language}"><header><strong>${e(store.languages.find(lang=>lang.code===state.language)?.label)}</strong><small>仅修改当前语言，其他语言与公共配置保持独立。</small></header>${field}${state.tab==='docs'?'<div class="ha-language-body-label">文档正文</div>':''}${mediaNodes}<footer><small data-ha-saved>草稿自动保留，统一发布后生效。</small>${btn('保存本语言草稿','language-save','','primary')}</footer></section>`;
  }
  function languageModal() {
    const item=current(),modal=state.modal,configured=configuredLanguages(item),remaining=store.languages.filter(lang=>!configured.some(row=>row.code===lang.code));
    const cards=configured.map(lang=>{
      const locale=item[lang.code]||{},isDefault=lang.code===(item.package==='domestic'?'zh':'en');
      const fragment=document.createElement('div');fragment.innerHTML=store.sanitize(locale.html||'');
      const excerpt=fragment.textContent.trim().slice(0,100)||(fragment.querySelector('img,video')?'含图片或视频':'尚未填写正文');
      return `<article class="ha-language-card ${modal.edit===lang.code?'active':''}" data-ha-language-card="${lang.code}"><div><strong>${e(lang.label)}</strong>${isDefault?'<span class="ha-lang-pill">默认语言</span>':''}</div><p class="ha-language-card-title">${e(locale.title||'尚未填写标题')}</p>${state.tab==='docs'?`<p class="ha-language-excerpt">${e(excerpt)}</p>`:''}<div class="ha-language-card-actions">${textBtn('编辑','language-edit',lang.code,'','orange')}${textBtn('删除','language-delete',lang.code,isDefault?'disabled title="默认语言必须保留，不能删除"':'','red')}</div>${isDefault?'<small>默认语言必须保留，不能删除。</small>':''}${modal.deleting===lang.code?`<div class="ha-language-delete"><span>删除此语言翻译草稿？统一发布后才会影响 App。</span>${btn('取消','language-delete-cancel')}${btn('确认删除','language-delete-confirm',`data-id="${lang.code}"`,'danger')}</div>`:''}</article>`;
    }).join('');
    return `<div class="ha-modal-layer"><section class="ha-language-dialog" data-ha-language-dialog role="dialog" aria-modal="true" aria-labelledby="ha-language-dialog-title"><header class="ha-dialog-head"><div><h2 id="ha-language-dialog-title">多语言配置</h2><p>${e(item.id)} · ${item.package==='domestic'?'国内包':'海外包'} · 同一内容的各语言文案</p></div>${btn('关闭','language-close','aria-label="关闭多语言弹窗"')}</header><div class="ha-dialog-note">新增、编辑、删除只修改翻译草稿；关闭弹窗后，在列表统一发布。</div><div class="ha-feedback" data-ha-feedback role="status">${e(state.feedback)}</div><div class="ha-dialog-layout"><aside class="ha-language-list"><div class="ha-language-add"><select data-ha-add-language aria-label="待新增语言" ${remaining.length?'':'disabled'}>${remaining.length?remaining.map(lang=>`<option value="${lang.code}">${lang.label}</option>`).join(''):'<option>已配置全部语言</option>'}</select>${btn('新增语言','language-add',remaining.length?'':'disabled')}</div>${cards}</aside><main class="ha-language-detail">${modal.edit?languageEditor():'<div class="ha-language-placeholder"><h3>选择一种语言查看或编辑</h3><p>左侧分别展示每种语言的标题与正文摘要。<br>点击「编辑」查看完整文案。</p></div>'}</main></div></section></div>`;
  }
  function closeLanguages() {
    if(!state.modal)return;save();const id=state.modal.id;root?.querySelectorAll('video').forEach(video=>video.pause());state.modal=null;state.language=defaultLanguage();state.feedback='多语言草稿已保留，统一发布后生效。';render();root?.querySelector(`[data-ha-action="languages"][data-id="${id}"]`)?.focus();
  }
  function render() {
    if(!root)return;
    root.querySelectorAll('video').forEach(video=>video.pause());
    root.innerHTML=`<div class="ha"><aside class="ha-side"><div class="ha-logo">GameHub</div><small>内容配置</small><div class="ha-side-item active">帮助中心</div></aside><div class="ha-main"><div class="ha-top"><span>内容管理　/　<strong>帮助中心</strong></span><span>平台运营</span></div><div class="ha-content"><div class="ha-heading"><div><h1>帮助中心</h1><p class="ha-sub">管理 App 帮助内容，让解答清晰易读。</p></div><div class="ha-langs" role="group" aria-label="包与多语言"><select data-ha-package aria-label="内容包"><option value="domestic" ${state.package==='domestic'?'selected':''}>国内包</option><option value="overseas" ${state.package==='overseas'?'selected':''}>海外包</option></select></div></div><nav class="ha-tabs" aria-label="内容类型"><button data-ha-tab="navs" class="${state.tab==='navs'?'active':''}">导航目录</button><button data-ha-tab="docs" class="${state.tab==='docs'?'active':''}">目录子文档</button></nav><div class="ha-feedback" data-ha-feedback role="status">${e(state.feedback)}</div>${state.selected?editor():list()}</div></div></div>`;
    if(state.modal){root.querySelector('.ha-side').inert=true;root.querySelector('.ha-main').inert=true;root.querySelector('.ha').insertAdjacentHTML('beforeend',languageModal());}
    state.range=null;
  }
  async function media(file,kind) {
    if(!file)return;
    const docId=current()?.id,lang=state.language;
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
      if(root&&current()?.id===docId&&state.language===lang&&rich()){insert(html);feedback(`${kind==='image'?'图片':'视频'}已插入，发布后同步 App。`);}
      else {const item=store.get('docs',docId);if(item){item[lang].html+=store.sanitize(html);store.notify();}feedback('媒体已保留到原文章草稿。');}
    } catch(error) {feedback('媒体插入失败：文件无法读取或播放，原正文已保留。');}
    finally {state.busy=false;store.pendingMedia.delete(docId);}
  }
  function click(event) {
    const button=event.target.closest('button');if(!button||!root.contains(button))return;
    if(state.modal&&!button.closest('[data-ha-language-dialog]'))return;
    if(button.dataset.haLang){save();state.language=button.dataset.haLang;state.feedback='';render();return;}
    if(button.dataset.haTab){save();state.tab=button.dataset.haTab;state.selected='';state.search='';state.filter='';state.deleting='';state.feedback='';render();return;}
    if(button.dataset.haCommand){restoreSelection();document.execCommand(button.dataset.haCommand,false,button.dataset.value||null);save();rememberSelection();return;}
    const action=button.dataset.haAction,id=button.dataset.id;
    if(!action)return;
    if(action==='language-close'){closeLanguages();return;}
    if(action.startsWith('language-')){
      save();state.feedback='';const modal=state.modal,item=current();if(!modal||!item)return;
      if(action==='language-edit'){state.language=id;modal.edit=id;modal.deleting='';}
      if(action==='language-add'){const code=root.querySelector('[data-ha-add-language]').value;if(!store.languages.some(lang=>lang.code===code))return;const extra=languageDrafts.get(item.id)||new Set();extra.add(code);languageDrafts.set(item.id,extra);item[code]||={title:'',...(state.tab==='docs'?{html:''}:{})};state.language=code;modal.edit=code;modal.deleting='';}
      if(action==='language-save'){modal.edit='';state.feedback='本语言草稿已保存，发布后生效。';}
      if(action==='language-delete'){if(id===(item.package==='domestic'?'zh':'en'))return;if(store.pendingMedia.has(item.id)){feedback('正在处理媒体，请完成后再删除翻译。');return;}modal.deleting=id;}
      if(action==='language-delete-cancel')modal.deleting='';
      if(action==='language-delete-confirm'){if(id===(item.package==='domestic'?'zh':'en'))return;if(store.pendingMedia.has(item.id)){feedback('正在处理媒体，请完成后再删除翻译。');return;}item[id]={title:'',...(state.tab==='docs'?{html:''}:{})};languageDrafts.get(item.id)?.delete(id);modal.deleting='';if(modal.edit===id)modal.edit='';state.feedback='翻译草稿已删除，已发布内容仍保留至下次发布。';}
      store.notify();render();root.querySelector(modal.edit?'[data-ha-title]':'[data-ha-action="language-close"]')?.focus();return;
    }
    if(action==='image'||action==='video'){rememberSelection();root.querySelector(`[data-ha-${action}-file]`).click();return;}
    if(action==='link'){rememberSelection();root.querySelector('[data-ha-link]').hidden=false;root.querySelector('[data-ha-url]').focus();return;}
    if(action==='close-link'){root.querySelector('[data-ha-link]').hidden=true;return;}
    if(action==='insert-link'){const url=root.querySelector('[data-ha-url]').value.trim();if(!store.safeLink(url)){feedback('请输入有效的 https:// 链接；不支持脚本或其他协议。');return;}restoreSelection();const selection=window.getSelection();if(selection.isCollapsed)insert(`<a href="${e(url)}">${e(url)}</a>`);else{document.execCommand('createLink',false,url);save();}root.querySelector('[data-ha-link]').hidden=true;feedback('链接已加入草稿。');return;}
    save();state.feedback='';
    if(action==='edit'){state.selected=id;state.language=defaultLanguage();state.deleting='';}
    if(action==='languages'){state.selected='';state.deleting='';state.language=defaultLanguage();state.modal={id,type:state.tab,edit:'',deleting:''};}
    if(action==='back'){state.selected='';state.feedback='草稿已保存，尚未发布的修改不会影响 App。';}
    if(action==='create'){if(state.tab==='docs'&&!store.draft.navs.some(nav=>nav.package===state.package)){feedback('请先在当前包创建导航，再创建子文档。');return;}state.language=state.package==='domestic'?'zh':'en';state.selected=store.create(state.tab,state.package).id;}
    if(action==='search'){state.search=root.querySelector('[data-ha-search]').value;state.filter=root.querySelector('[data-ha-filter]')?.value||'';}
    if(action==='reset'){state.search='';state.filter='';}
    if(action==='save-order'){state.feedback=store.setOrder(state.tab,id,root.querySelector(`[data-ha-order="${id}"]`).value)||'排序已保存，只同步权重，不发布内容草稿。';}
    if(action==='publish'){state.feedback=store.publish(state.tab,id)||'已发布，App 端内容已同步。';}
    if(action==='up'||action==='down'){store.move(state.tab,id,action==='up'?-1:1);state.feedback='排序已更新；已发布内容同步顺序，标题与正文草稿仍需单独发布。';}
    if(action==='delete'){if(state.tab==='navs'&&[...store.draft.docs,...store.published.docs].some(doc=>doc.navId===id))state.feedback='该导航仍有关联子文档，请先迁移并发布或删除子文档。';else state.deleting=id;}
    if(action==='cancel-delete')state.deleting='';
    if(action==='confirm-delete'){state.feedback=store.remove(state.tab,state.deleting)||'内容已删除。';state.deleting='';}
    render();if(action==='languages')root.querySelector('[data-ha-action="language-close"]')?.focus();
  }
  function change(event) {
    if(state.modal&&!event.target.closest('[data-ha-language-dialog]'))return;
    if(event.target.matches('[data-ha-package]')){save();state.package=event.target.value;state.language=state.package==='domestic'?'zh':'en';state.selected='';state.filter='';state.search='';state.deleting='';state.feedback='';render();}
    else if(event.target.matches('[data-ha-font-size]')){const size=Number(event.target.value);if(![14,16,18,20,24].includes(size))return;restoreSelection();const selection=window.getSelection();if(selection.isCollapsed){feedback('请先选中要调整字号的文字。');return;}const range=selection.getRangeAt(0);const span=document.createElement('span');span.style.fontSize=`${size}px`;span.append(range.extractContents());range.insertNode(span);range.selectNodeContents(span);selection.removeAllRanges();selection.addRange(range);rememberSelection();save();event.target.value='';}
    else if(event.target.matches('[data-ha-image-file]')){media(event.target.files[0],'image');event.target.value='';}
    else if(event.target.matches('[data-ha-video-file]')){media(event.target.files[0],'video');event.target.value='';}
    else if(event.target.matches('[data-ha-nav],[data-ha-protocol]'))save();
    else if(event.target.matches('[data-ha-filter]')){state.filter=event.target.value;state.search=root.querySelector('[data-ha-search]').value;render();}
  }
  function input(event){if(event.target.matches('[data-ha-title],[data-ha-body]'))save();}
  function paste(event){if(!event.target.closest('[data-ha-body]'))return;event.preventDefault();const html=event.clipboardData.getData('text/html'),text=event.clipboardData.getData('text/plain');rememberSelection();insert(html||`<p>${e(text).replace(/\n/g,'<br>')}</p>`);}
  function drop(event){if(!event.target.closest('[data-ha-body]'))return;event.preventDefault();feedback('请使用工具栏插入媒体；正文内容已保留。');}
  function keydown(event){if(state.modal){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeLanguages();return;}if(event.key==='Tab'){const dialog=root.querySelector('[data-ha-language-dialog]'),nodes=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[contenteditable="true"]')].filter(node=>!node.hidden&&node.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}if(event.key==='Enter'&&event.target.matches('[data-ha-search]')){event.preventDefault();state.search=event.target.value;render();}}
  function mousedown(event){if(event.target.matches('[data-ha-font-size]'))rememberSelection();if(event.target.closest('[data-ha-command],.ha-rich-toolbar button')){rememberSelection();event.preventDefault();}}
  const events={click,change,input,paste,drop,keydown,mousedown,keyup:rememberSelection,mouseup:rememberSelection};
  window.HelpAdmin={
    mount(element){if(root)this.unmount();root=element;render();Object.entries(events).forEach(([name,handler])=>root.addEventListener(name,handler));},
    unmount(){if(root){save();root.querySelectorAll('video').forEach(video=>video.pause());Object.entries(events).forEach(([name,handler])=>root.removeEventListener(name,handler));root=null;}}
  };
})();

