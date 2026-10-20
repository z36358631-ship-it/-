(function () {
  'use strict';
  const GH = window.GH, M = GH.guideStore, P = GH.guidePosts;
  const esc = v => GH.esc(String(v == null ? '' : v));
  const names = {article:'图文指南',table:'数据表',gallery:'图片资料库',album:'大图图册',entity:'实体资料',version:'版本索引'};
  const statuses = {ready:'已收录',building:'建设中',paused:'暂停维护'};
  const displayTitle=v=>String(v||'');
  const directoryTitle=displayTitle;
  let s;
  function reset() { s={view:'portal',id:'article-beginner',category:'b-11',postId:'post-first-trip',categoryPage:0,postLikes:[],postFollows:[],compose:{title:'',body:''},composeError:'',query:'',tabs:{},filters:{},sort:{},listQueries:{},scrolls:{},tabScrolls:{},anchorScroll:0,stack:[],favorites:[],comments:{},commentDrafts:{},panel:'',share:false,zoom:null,zoomFocus:'zoom-close',returnZoomFocus:null,snapshot:null,activeAnchor:'b-0',editorDraft:null,editorError:''}; }
  reset();
  const act=(action,label,extra='')=>`<button type="button" data-gr-action="${action}" ${extra}>${label}</button>`;
  const link=(id,label,cls='gr-link')=>`<button type="button" class="${cls}" data-guide-open="${esc(id)}">${esc(label || displayTitle(M.get(id)?.title) || id)}<span aria-hidden="true">›</span></button>`;
  const photo=(asset,caption,cls='',crop='cover')=>GH.asset(asset)?`<img style="object-fit:${crop==='contain'?'contain':'cover'}" class="${cls}" src="${esc(GH.asset(asset))}" alt="${esc(caption||'资料配图')}" loading="lazy">`:'<div class="gr-no-photo">暂无对应资料图片</div>';
  const fmt=v=>v===undefined||v===null||v===''?'未提供':typeof v==='number'?v.toLocaleString('zh-CN'):String(v);
  function capture() { const node=document.querySelector('[data-gr-scroll]');if(node)s.scrolls[key()]=node.scrollTop;document.querySelectorAll('[data-gr-local-tabs]').forEach(el=>s.tabScrolls[el.dataset.grLocalTabs]=el.scrollLeft);const anchors=document.querySelector('.gr-anchor-nav');if(anchors)s.anchorScroll=anchors.scrollLeft; }
  function key(){return s.view==='portal'?'portal':s.view==='category'?'category:'+s.category:s.view==='post'?'post:'+s.postId:s.view==='compose'?'compose':s.view+':'+s.id;}
  function position(){return {view:s.view,id:s.id,category:s.category,postId:s.postId,panel:s.panel};}
  function goPost(id){if(!P.get(id))return;capture();s.stack.push(position());s.view='post';s.postId=id;s.panel='';s.share=false;GH.render();}
  function goCategory(id){capture();s.stack.push(position());s.category=id;s.view='category';s.panel='';GH.render();}
  function rerender(){capture();GH.render();}
  function open(id,{retainStack=false}={}) {if(!M.get(id))return false;if(!retainStack&&id!==s.id)s.stack=[{view:'portal',id:s.id,panel:''}];s.view='record';s.id=id;s.panel='';s.share=false;s.snapshot=null;s.zoom=null;return true;}
  function go(id) {if(!M.get(id))return;capture();s.stack.push(position());open(id,{retainStack:true});GH.render();}
  function back() {capture();const prev=s.stack.pop();if(prev)Object.assign(s,prev);else s.view='portal';s.snapshot=null;s.zoom=null;s.share=false;GH.render();}
  function blocks(record,skipImage) {return (record.blocks||[]).filter(b=>b.id!==skipImage).map(b=>{
    const id='gr-block-'+record.id+'-'+b.id;
    if(b.type==='heading')return `<h2 id="${esc(id)}" tabindex="-1">${esc(b.text)}</h2>`;
    if(b.type==='paragraph')return `<p class="gr-paragraph">${esc(b.text)}</p>`;
    if(b.type==='list'){const tag=b.ordered?'ol':'ul';return `<${tag} class="gr-body-list">${(b.items||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</${tag}>`;}
    if(b.type==='quote')return `<blockquote class="gr-body-quote"><p>${esc(b.text)}</p>${b.cite||b.source?`<cite>${esc(b.cite||b.source)}</cite>`:''}</blockquote>`;
    if(b.type==='link'){const href=b.href||b.url||'';return /^https?:\/\//i.test(href)?`<p class="gr-body-link"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(b.text||href)} <span aria-hidden="true">↗</span></a></p>`:'';}
    if(b.type==='callout')return `<aside class="gr-callout">${esc(b.text)}</aside>`;
    if(b.type==='image')return `<figure class="gr-figure">${photo(b.asset,b.caption,'',b.crop)}${b.caption?`<figcaption>${esc(b.caption)}</figcaption>`:''}</figure>`;
    if(b.type==='table')return `<div class="gr-wide" tabindex="0" aria-label="横向滚动正文表格"><table><thead><tr>${(b.headers||[]).map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${(b.rows||[]).map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if(b.type==='related')return `<section class="gr-related-block"><h3>${esc(b.text||'关联资料')}</h3>${(b.ids||[]).map(id=>link(id)).join('')}</section>`;
    return '';
  }).join('');}
  function visibleEntities(record,onRead,cfg=M.config()){
    let rows=(record.entityIds||[]).map(id=>M.get(id)).filter(Boolean);
    if(!onRead)return rows;
    const query=(s.listQueries[record.id]||'').trim().toLocaleLowerCase();
    const allowed=cfg.table?.[record.schemaId];const selected=Object.fromEntries(Object.entries(s.filters[record.id]||{}).filter(([id])=>(allowed?.filters||[]).includes(id)));
    rows=rows.filter(r=>(!query||Object.values(r.values||{}).join(' ').toLocaleLowerCase().includes(query))&&Object.entries(selected).every(([id,value])=>!value||String(r.values[id])===value));
    const sorting=s.sort[record.id];
    if(sorting&&(allowed?.columns||[]).includes(sorting.split(':')[0])){const [field,dir]=sorting.split(':');rows.sort((a,b)=>{const x=a.values[field],y=b.values[field];if(x==null)return 1;if(y==null)return -1;const n=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'zh-CN');return dir==='desc'?-n:n;});}
    return rows;
  }
  function controls(record,onRead,cfg=M.config()){
    if(!onRead)return '';
    const schema=M.schema(record.schemaId,cfg),config=cfg.table?.[record.schemaId];
    if(!schema)return '';
    const all=(record.entityIds||[]).map(id=>M.get(id)).filter(Boolean);
    return `<div class="gr-filter-controls"><label class="gr-search"><span>检索${esc(schema.label)}</span><input id="gr-list-query-${esc(record.id)}" data-gr-list-query="${esc(record.id)}" value="${esc(s.listQueries[record.id]||'')}" placeholder="输入名称或资料关键词"></label><div class="gr-filter-row">${(config?.filters||[]).map(id=>{
      const field=schema.fields.find(f=>f.id===id);if(!field)return '';
      const options=[...new Set(all.map(r=>r.values[id]).filter(v=>v!==undefined&&v!==null&&v!==''))];
      return `<label><span>${esc(field.label)}</span><select data-gr-filter="${esc(id)}" data-gr-record="${esc(record.id)}"><option value="">全部${esc(field.label)}</option>${options.map(v=>`<option value="${esc(v)}" ${s.filters[record.id]?.[id]===String(v)?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
    }).join('')}<label><span>排序</span><select data-gr-sort="${esc(record.id)}"><option value="">默认顺序</option>${schema.fields.filter(f=>f.type==='number'&&(config?.columns||[]).includes(f.id)).map(f=>['asc','desc'].map(dir=>`<option value="${esc(f.id+':'+dir)}" ${s.sort[record.id]===f.id+':'+dir?'selected':''}>${esc(f.label)}${dir==='asc'?'从低到高':'从高到低'}</option>`).join('')).join('')}</select></label></div><div class="gr-results-meta"><span>${visibleEntities(record,true,cfg).length} / ${all.length} 条资料</span>${act('clear-filters','清除条件')}</div></div>`;
  }
  function collection(record,onRead,cfg=M.config()){
    const schema=M.schema(record.schemaId,cfg),config=cfg.table?.[record.schemaId],rows=visibleEntities(record,onRead,cfg);
    if(!schema)return '<p class="gr-callout">此资料的字段定义暂不可用。</p>';
    const cols=(config?.columns||schema.fields.map(f=>f.id)).map(id=>schema.fields.find(f=>f.id===id)).filter(Boolean);
    let content='';
    if(record.template==='table') content=`<p class="gr-horizontal-hint">左右滑动查看完整参数 · 点名称进入详情</p><div class="gr-wide gr-data-table" tabindex="0" aria-label="横向滚动数据表"><table><thead><tr>${cols.map(f=>`<th data-gr-column="${esc(f.id)}">${esc(f.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr data-gr-entity="${esc(r.id)}">${cols.map(f=>`<td>${f.id==='name'?link(r.id,fmt(r.values[f.id]),'gr-table-link'):esc(fmt(r.values[f.id]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    else content=`<div class="gr-gallery">${rows.map(r=>`<button type="button" data-guide-open="${esc(r.id)}" class="gr-gallery-card" data-gr-entity="${esc(r.id)}">${photo((r.blocks||[]).find(b=>b.type==='image')?.asset,r.title)}<span class="gr-gallery-copy"><strong>${esc(r.values.name||r.title)}</strong><small>${esc([r.values.category,r.values.manufacturer||r.values.location].filter(Boolean).join(' · '))}</small><b>${r.values.price==null?'价格未提供':esc(fmt(r.values.price))+' 游戏币'}</b><small>${esc(r.values.version||'版本未提供')}</small></span></button>`).join('')}</div>`;
    return controls(record,onRead,cfg)+(rows.length?content:`<div class="gr-empty"><strong>没有符合条件的资料</strong><p>调整关键词，或清除当前筛选。</p>${act('clear-filters','清除条件')}</div>`);
  }
  function album(record,onRead){return `<div class="gr-album">${(record.items||[]).map((item,index)=>`<figure>${onRead?`<button type="button" class="gr-album-image" data-gr-zoom="${index}" aria-label="放大${esc(item.caption||'图片')}">${photo(item.asset,item.caption,'',item.crop)}</button>`:photo(item.asset,item.caption,'',item.crop)}<figcaption><span>${index+1} / ${record.items.length} · ${esc(item.caption)}</span>${item.entityId?link(item.entityId,'查看实体资料'):''}</figcaption></figure>`).join('')}</div>`;}
  function entity(record,cfg=M.config()){const schema=M.schema(record.schemaId,cfg);return `<dl class="gr-entity-fields">${(schema?.fields||[]).map(f=>`<div data-gr-field="${esc(f.id)}"><dt>${esc(f.label)}</dt><dd>${esc(fmt(record.values?.[f.id]))}</dd></div>`).join('')}</dl>`;}
  function version(record){return `<div class="gr-version-index">${(record.children||[]).map(item=>{const child=M.get(item.id),img=(child?.blocks||[]).find(b=>b.type==='image');return `<button type="button" class="gr-version-card" data-guide-open="${esc(item.id)}">${img?photo(img.asset,child.title):''}<span><small>${item.current?'当期入口':'历史资料'} · ${esc(item.date)}</small><strong>${esc(item.label)}</strong><span>${esc(displayTitle(child?.title||'资料暂不可用'))}</span></span><b>›</b></button>`;}).join('')}</div>`;}
  function related(record){const ids=new Set(record.relatedIds||[]);if(record.template==='entity')M.list().filter(r=>(r.entityIds||[]).includes(record.id)||(r.items||[]).some(i=>i.entityId===record.id)).forEach(r=>ids.add(r.id));return ids.size?`<details class="gr-related"><summary>关联资料 <span>${ids.size}</span></summary>${[...ids].map(id=>link(id)).join('')}</details>`:'';}
  function morePosts(record,preview){const posts=(record.relatedPostIds||[]).map(id=>P.get(id)).filter(Boolean);return posts.length?`<section class="gr-more-posts" data-gr-related-posts><h2>更多攻略帖</h2>${posts.map(post=>`<button type="button" ${preview?'tabindex="-1"':`data-gr-post="${esc(post.id)}"`} class="gr-mixed-entry">${post.cover?photo(post.cover,post.title,'gr-entry-thumb'):''}<span><strong>${esc(post.title)}</strong><small>${esc(post.author)} · 玩家攻略帖</small></span><b aria-hidden="true">›</b></button>`).join('')}</section>`:'';}
  function editTime(value){
    if(!value)return '';
    const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
    const parts=Object.fromEntries(new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part=>[part.type,part.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  }
  function editMetadata(record,{readOnly=false}={}){
    const revision=M.history(record.id).find(item=>item.revision===record.revision),time=editTime(revision?.time);
    return `<div class="gr-edit-metadata" data-gr-edit-metadata><span>${time?`最后编辑于 <time datetime="${esc(revision.time)}">${esc(time)}</time>（北京时间）`:'暂无编辑记录'}${revision?.author?`<span class="gr-editor-name">编辑者：${esc(revision.author)}</span>`:''}</span>${readOnly?'':act('history','编辑历史')}</div>`;
  }
  function guideRender(record,{preview=false,onRead=false,readOnly=false,config=null}={}){
    if(!record)return '<div class="gr-empty">资料不存在或已不可用。</div>';
    const content=record.template==='table'||record.template==='gallery'?collection(record,onRead&&!preview,config||M.config()):record.template==='album'?album(record,onRead&&!preview):record.template==='entity'?entity(record,config||M.config()):record.template==='version'?version(record):'';
    const headings=(record.blocks||[]).filter(b=>b.type==='heading');const leadImage=record.template==='entity'?(record.blocks||[]).find(b=>b.type==='image'):null;const compact=['table','gallery'].includes(record.template);
    return `<article class="gr-document" data-gr-template="${esc(record.template)}" data-gr-record-id="${esc(record.id)}"><div class="gr-document-kicker"><span>修订 ${record.revision}</span></div><h1>${esc(displayTitle(record.title))}</h1>${(onRead||readOnly)&&!preview?editMetadata(record,{readOnly}):''}<div class="gr-document-scope">${esc(record.scope)}${record.status!=='ready'?` <span class="gr-status gr-status-${esc(record.status)}">${esc(statuses[record.status])}</span>`:''}</div>${record.summary?(compact?`<details class="gr-view-description"><summary>资料说明</summary><p>${esc(record.summary)}</p></details>`:`<p class="gr-document-summary">${esc(record.summary)}</p>`):''}${record.status!=='ready'?`<aside class="gr-callout">${record.status==='paused'?'这份资料已暂停维护，请先核对时效；现有说明仍可阅读。':'这份资料正在建设，现有内容不代表完整资料集。'}</aside>`:''}${headings.length?`<details class="gr-toc" open><summary>本篇目录 · ${headings.length} 节</summary>${headings.map((b,i)=>`<button type="button" data-gr-jump="${esc('gr-block-'+record.id+'-'+b.id)}"><span>${String(i+1).padStart(2,'0')}</span>${esc(b.text)}</button>`).join('')}</details>`:''}${leadImage?`<figure class="gr-figure gr-entity-lead">${photo(leadImage.asset,leadImage.caption,'',leadImage.crop)}${leadImage.caption?`<figcaption>${esc(leadImage.caption)}</figcaption>`:''}</figure>`:''}${content}<div class="gr-blocks">${blocks(record,leadImage?.id)}</div>${related(record)}${morePosts(record,preview)}${preview?'<p class="gr-source-note">只读预览，未保存</p>':''}</article>`;
  }
  GH.guideRender=guideRender;
  const categoryMedia={'b-0':'wiki-community','b-1':'wiki-weekly','b-2':'wiki-launch','b-3':'wiki-map','b-4':'wiki-property','b-5':'wiki-online','b-6':'wiki-solo','b-7':'wiki-vehicle','b-8':'wiki-map','b-9':'wiki-weapon','b-10':'wiki-career','b-11':'wiki-register','b-12':'guideHero','b-13':'wiki-account','b-14':'wiki-community','b-15':'wiki-clothes'};
  const content=id=>M.get(id)||P.get(id);
  const contentLabel=r=>r.template?'共建资料':r.author+' · 玩家攻略帖';
  const target=r=>r.template?`data-guide-open="${esc(r.id)}"`:`data-gr-post="${esc(r.id)}"`;
  function categoryBlock(cfg=M.config(),{preview=false}={}){
    const visible=M.shortcuts?M.shortcuts(cfg).filter(item=>item.visible!==false):cfg.portal.filter(p=>p.visible).map(p=>({id:p.sectionId,title:p.title,cover:p.cover,targetType:'section',targetId:p.sectionId}));
    const pages=Array.from({length:Math.ceil(visible.length/8)},(_,index)=>visible.slice(index*8,index*8+8));
    const page=preview?0:Math.max(0,Math.min(s.categoryPage,pages.length-1));if(!preview)s.categoryPage=page;
    const id='gr-category-pages'+(preview?'-preview':'');
    return `<section class="gr-categories" data-gr-category-pagination><h2>资料分类</h2>${pages.length?`<div class="gr-category-pager" id="${id}" ${preview?'':'data-gr-category-pager tabindex="0"'} role="region" aria-roledescription="轮播" aria-label="资料分类，左右滑动切换" data-gr-page-count="${pages.length}" data-gr-current-page="${page}">${pages.map((items,index)=>`<div class="gr-category-grid" data-gr-category-page="${index}" role="group" aria-label="第 ${index+1} 页，共 ${pages.length} 页" aria-hidden="${index!==page}" ${index!==page?'inert':''}>${items.map(item=>`<button type="button" data-gr-shortcut="${esc(item.id)}" ${preview?'tabindex="-1"':item.targetType==='record'?`data-guide-open="${esc(item.targetId)}"`:`data-gr-category="${esc(item.targetId)}"`} aria-label="${esc(item.title)}"><span class="gr-category-image">${photo(item.cover||categoryMedia[item.targetId],item.title)}</span><span>${esc(item.title)}</span></button>`).join('')}</div>`).join('')}</div>${pages.length>1?`<nav class="gr-category-dots" aria-label="资料分类分页">${pages.map((_,index)=>`<button type="button" class="gr-category-dot" data-gr-category-dot="${index}" aria-label="显示第 ${index+1} 页分类" aria-current="${index===page?'true':'false'}" aria-controls="${id}" ${preview?'disabled tabindex="-1"':''}><span aria-hidden="true"></span></button>`).join('')}</nav>`:''}`:'<div class="gr-empty">暂无资料分类</div>'}</section>`;
  }
  GH.guideShortcutPreview=(config,{orientation='portrait'}={})=>`<div class="gr-portal-preview ${orientation==='landscape'?'gr-landscape':''}" data-gr-preview="shortcuts">${categoryBlock(config,{preview:true})}</div>`;
  const layoutName=value=>({cards:'image-top',list:'text'}[value]||(['text','image-top','image-left','banner'].includes(value)?value:'image-top'));
  const layoutColumns=(layout,columns,direction)=>layout==='banner'?1:Math.max(1,Math.min(layout==='image-left'?2:4,Number(columns[direction])||1));
  const entryId=entry=>typeof entry==='string'?entry:entry?.recordId||entry?.postId||entry?.id;
  const entryImage=(record,fallback)=>record.cover||(record.blocks||[]).find(b=>b.type==='image')?.asset||record.items?.[0]?.asset||(record.entityIds||[]).map(id=>M.get(id)).filter(Boolean).map(r=>(r.blocks||[]).find(b=>b.type==='image')?.asset).find(Boolean)||fallback;
  function configuredEntries(section,tab,{preview=false,orientation=GH.orientation}={}){
    if(!tab)return '<div class="gr-empty" data-gr-empty="tabs">当前没有展示的分类</div>';
    const layout=layoutName(tab.layout||section.layout),columns={...{portrait:2,landscape:3},...section.columns,...tab.columns};
    const count=direction=>layoutColumns(layout,columns,direction);
    const textList=layout==='text'&&count(orientation==='landscape'?'landscape':'portrait')===1;
    const rows=(tab.entries||[]).map(entry=>({entry,record:content(entryId(entry))})).filter(row=>row.record);
    return `<div class="gr-config-entries gr-layout-${layout}" data-gr-layout="${layout}" data-gr-tab-entries="${esc(tab.id)}" data-gr-columns="${count(orientation==='landscape'?'landscape':'portrait')}" data-gr-columns-portrait="${count('portrait')}" data-gr-columns-landscape="${count('landscape')}" style="--gr-columns-portrait:${count('portrait')};--gr-columns-landscape:${count('landscape')}">${rows.map(({entry,record:r})=>{
      const title=directoryTitle(typeof entry==='object'&&entry.title||r.title),image=entryImage(r,section.cover||categoryMedia[section.id]||'guideHero');
      return `<button type="button" class="gr-config-entry" data-gr-entry="${esc(r.id)}" ${preview?'tabindex="-1"':target(r)} aria-label="${esc(title)}">${layout!=='text'?photo(image,title,'gr-config-image'):''}${textList?'<span class="gr-text-list-dot" aria-hidden="true"></span>':''}<span class="gr-config-copy"><strong>${esc(title)}</strong></span>${layout==='banner'?'<span class="gr-banner-arrow" aria-hidden="true">›</span>':textList?'<span class="gr-text-list-arrow" aria-hidden="true">›</span>':''}</button>`;
    }).join('')||'<div class="gr-empty" data-gr-empty="entries">暂时没有收录内容</div>'}</div>`;
  }
  function visibleSection(id,cfg=M.config()){return M.sections(cfg).find(section=>section.id===id&&section.visible!==false);}
  function sectionTabs(section){return (section?.tabs||[]).filter(tab=>tab.visible!==false);}
  function selectedTab(section,id){const tabs=sectionTabs(section);return tabs.find(tab=>tab.id===id)||tabs[0];}
  function localTabs(section,selected,{preview=false}={}){
    const tabs=sectionTabs(section);if(!tabs.length||tabs.length===1&&tabs[0].label==='默认')return '';
    return `<nav class="gr-local-tabs" ${preview?'data-gr-preview-tabs':`data-gr-local-tabs="${esc(section.id)}"`} aria-label="${esc(section.title)}分类">${tabs.map(tab=>`<button type="button" ${preview?'tabindex="-1" aria-disabled="true"':`data-gr-tab="${esc(tab.id)}" data-gr-section-id="${esc(section.id)}"`} class="${tab.id===selected?.id?'active':''}" aria-pressed="${tab.id===selected?.id}">${esc(tab.label)}</button>`).join('')}</nav>`;
  }
  function curated(){
    const sections=M.sections();
    const homeOrder=['b-4','b-5','b-7','b-3'];
    return `<div class="gr-home-sections">${homeOrder.map(id=>{
      const section=sections.find(item=>item.id===id&&item.visible!==false);if(!section)return '';
      const tab=selectedTab(section,s.tabs[id]),layout=layoutName(tab?.layout||section.layout),columns={portrait:2,landscape:3,...section.columns,...tab?.columns};
      if(tab)s.tabs[id]=tab.id;
      const count=layoutColumns(layout,columns,GH.orientation==='landscape'?'landscape':'portrait');
      return `<section class="gr-curated gr-home-section" data-gr-home-section="${esc(id)}" data-gr-curated-section="${esc(id)}" data-gr-home-layout="${layout}" data-gr-home-variant="${layout}-${count}"><div class="gr-home-section-heading"><h2>${esc(id==='b-11'?'入坑必看':section.title)}</h2></div>${localTabs(section,tab)}${configuredEntries(section,tab)}</section>`;
    }).join('')}</div>`;
  }
  GH.guidePortalPreview=function(config,{orientation='portrait',sectionId,tabId}={}){
    const section=M.sections(config).find(section=>section.id===sectionId)||M.sections(config).find(section=>section.visible!==false);
    if(!section)return '<div class="gr-empty">当前没有展示的栏目</div>';
    const tab=selectedTab(section,tabId);
    return `<div class="gr-portal-preview ${orientation==='landscape'?'gr-landscape':''}" data-gr-preview="portal"><section class="gr-category-content" data-gr-section="${esc(section.id)}"><h1>${esc(section.title)}</h1>${localTabs(section,tab,{preview:true})}${configuredEntries(section,tab,{preview:true,orientation})}</section></div>`;
  };
  function postCard(p){return `<article class="gr-post-card" data-gr-post-card="${esc(p.id)}"><div class="gr-post-byline">${photo(p.avatar,p.author,'gr-avatar')}<span><strong>${esc(p.author)}</strong><small>${esc(p.date)} · GTA 5</small></span></div><button class="gr-post-open" type="button" data-gr-post="${esc(p.id)}"><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${p.cover?photo(p.cover,p.title,'gr-post-cover'):''}</button><footer><span aria-label="点赞 ${p.likes+(s.postLikes.includes(p.id)?1:0)}">${GH.icon('like',16)}${p.likes+(s.postLikes.includes(p.id)?1:0)}</span><span aria-label="收藏 ${p.saves+(s.favorites.includes(p.id)?1:0)}">${GH.icon('save',16)}${p.saves+(s.favorites.includes(p.id)?1:0)}</span><span aria-label="评论 ${p.comments.length+(s.comments[p.id]||[]).length}">${GH.icon('comment',16)}${p.comments.length+(s.comments[p.id]||[]).length}</span><span aria-label="转发 ${p.shares}">${GH.icon('share',16)}${p.shares}</span></footer></article>`;}
  function portal(){return `<header class="gr-community-header"><div><span>关注</span><strong>游戏圈</strong></div><nav class="gr-header-tools" aria-label="社区工具">${act('search',GH.icon('search',21),'aria-label="搜索"')}<a href="messages.html" aria-label="消息">${GH.icon('bell',21)}</a>${act('orientation',GH.icon('device',21),'aria-label="横竖屏切换"')}</nav></header><div class="gr-game-tabs"><span>全部</span><span>盖世游戏</span><b>GTA 5</b><span>管理</span></div><div class="gr-game-card"><img src="${esc(GH.asset('gtaIcon'))}" alt="GTA 5"><div><h2>GTA 5</h2><p>洛圣都的任务、载具与玩家经验</p></div></div><nav class="gr-content-tabs"><span>综合</span><span>精选</span><b aria-current="page">攻略</b><span>求助</span></nav><div class="gr-portal-tools">${act('search',GH.icon('search',18)+'<span>搜索 GTA5 攻略、载具、武器</span>','class="gr-search-entry"')}${act('editor-application',editorEntryLabel(),'class="gr-editor-entry"')}</div>${categoryBlock()}${curated()}<section class="gr-player-feed"><div class="gr-feed-heading"><h2>玩家攻略</h2><span>玩家经验与心得</span></div>${P.list().map(postCard).join('')}</section><div class="gr-portal-secondary">${act('site-favorite',s.favorites.includes('__portal')?'已收藏攻略站':'收藏攻略站')}${act('contributions','共建贡献记录')}</div><div class="gr-publish-dock">${act('compose',GH.icon('plus',38),'class="gr-publish" aria-label="发布动态"')}</div>`;}
  const editorState=()=>GH.guideGovernance?.editorApplication?.()||{role:'contributor',blocked:false,application:null};
  function editorEntryLabel(){const current=editorState();return current.role==='editor'||current.role==='manager'?'精编工作台':current.application?.status==='pending'?'申请审核中':current.application?.status==='rejected'?'申请未通过':'成为编辑';}
  function editorApplication(){
    const current=editorState(),application=current.application,isEditor=['editor','manager'].includes(current.role),pending=application?.status==='pending';
    const result=isEditor?'<section class="gr-application-state" data-gr-application-status="approved"><strong>已成为精编</strong><p>你已获得'+(current.role==='manager'?'高级':'初级')+'精编身份。</p></section>':pending?'<section class="gr-application-state" data-gr-application-status="pending"><strong>申请审核中</strong><p>申请已提交，请等待审核结果。</p><p class="gr-application-text">'+esc(application.text)+'</p></section>':application?.status==='rejected'?'<section class="gr-application-state" data-gr-application-status="rejected"><strong>申请未通过</strong><p>原因：'+esc(application.reason)+'</p><p>补充申请说明后可重新提交。</p></section>':'';
    return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>成为编辑</strong></header><section class="gr-application-page"><h1>参与攻略共建</h1><p>普通用户可以直接编辑公共资料的正文和数据，保存后生效。</p><h2>申请初级精编</h2><p>初级精编还可以创建词条、批量维护数据和组织首页栏目。账号权限仍按对应身份开放。</p>${result}${current.blocked?'<p class="gr-application-error" role="status">当前账号暂不能提交申请或进入精编工作台。</p>':isEditor?act('editor-workspace','进入精编工作台','class="gr-application-submit"'):pending?'':`<form data-gr-editor-application><label for="gr-editor-reason">申请说明</label><textarea id="gr-editor-reason" data-gr-editor-reason maxlength="200" rows="5" placeholder="介绍你希望维护的内容，以及相关整理经验">${esc(s.editorDraft??application?.text??'')}</textarea><span class="gr-application-hint">最多200字</span><p class="gr-application-error" data-gr-editor-error role="status">${esc(s.editorError)}</p><button type="submit" class="gr-application-submit">${application?.status==='rejected'?'重新提交申请':'提交申请'}</button></form>`}</section>`;
  }
  function category(){
    const section=visibleSection(s.category);
    if(!section)return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>资料分类</strong></header><div class="gr-empty">此栏目当前未展示，请返回查看其他分类。</div>`;
    const selected=selectedTab(section,s.tabs[section.id]);
    if(selected)s.tabs[section.id]=selected.id;
    return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>${esc(section.title)}</strong></header><section class="gr-portal-section gr-category-content" data-gr-section="${esc(section.id)}"><h1>${esc(section.title)}</h1>${localTabs(section,selected)}${configuredEntries(section,selected)}</section>`;
  }
  function search(){const terms=s.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean),rows=[...M.list(),...P.list()].filter(r=>terms.every(t=>[r.title,r.summary,r.scope,r.author,...Object.values(r.values||{}),...(r.blocks||[]).map(b=>b.text||''),...(r.body||[])].join(' ').toLocaleLowerCase().includes(t)));return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>攻略与资料搜索</strong></header><div class="gr-search-panel"><label class="gr-search"><span>搜索 GTA5 攻略和资料</span><input id="gr-site-query" value="${esc(s.query)}" placeholder="攻略、作者、载具或武器" data-gr-site-query></label><p class="gr-results-meta">${terms.length?`找到 ${rows.length} 条内容`:'输入关键词查找攻略与共建资料'}</p>${terms.length?rows.map(r=>`<button type="button" class="gr-search-result" ${target(r)}><small>${esc(contentLabel(r))}</small><strong>${esc(displayTitle(r.title))}</strong><span>${esc(r.summary)}</span></button>`).join('')||'<div class="gr-empty">没有匹配结果，请尝试更短关键词。</div>':''}</div>`;}
  function post(){const p=P.get(s.postId);if(!p)return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>玩家攻略</strong></header><div class="gr-empty">原帖暂不可用</div>`;return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>攻略原帖</strong></header><article class="gr-original-post" data-gr-original-post="${esc(p.id)}"><div class="gr-post-byline">${photo(p.avatar,p.author,'gr-avatar')}<span><strong>${esc(p.author)}</strong><small>${esc(p.date)} · GTA 5 · 攻略</small></span>${act('post-follow',s.postFollows.includes(p.author)?'已关注':'关注',`aria-pressed="${s.postFollows.includes(p.author)}"`)}</div><h1>${esc(p.title)}</h1><div class="gr-post-body">${p.body.map(t=>`<p>${esc(t)}</p>`).join('')}${p.cover?photo(p.cover,p.title,'gr-post-cover'):''}</div><div class="gr-post-interactions">${act('post-like',GH.icon('like',18)+(s.postLikes.includes(p.id)?'已赞 ':'点赞 ')+(p.likes+(s.postLikes.includes(p.id)?1:0)),`aria-pressed="${s.postLikes.includes(p.id)}"`)}${act('post-save',GH.icon('save',18)+(s.favorites.includes(p.id)?'已收藏':'收藏'),`aria-pressed="${s.favorites.includes(p.id)}"`)}${act('post-comments',GH.icon('comment',18)+'评论 '+(p.comments.length+(s.comments[p.id]||[]).length))}<span>${GH.icon('share',18)}转发</span></div><section class="gr-post-comments"><h2>评论</h2>${p.comments.map(c=>`<article><strong>${esc(c.author)}</strong><small>${esc(c.date)}</small><p>${esc(c.text)}</p></article>`).join('')}${(s.comments[p.id]||[]).map(c=>`<article><strong>我</strong><small>刚刚</small><p>${esc(c)}</p></article>`).join('')}<form data-gr-post-comment-form><label>写下你的交流和补充<textarea id="gr-post-comment" maxlength="500">${esc(s.commentDrafts[p.id]||'')}</textarea></label><button type="submit">发布评论</button><small data-gr-comment-error></small></form></section></article>`;}
  function compose(){return `<header class="gr-subheader">${act('back','取消')}<strong>发布动态</strong></header><form class="gr-compose" data-gr-compose><div class="gr-compose-tags"><span>GTA 5</span><span>攻略</span></div><label>标题<input maxlength="160" data-gr-compose-title value="${esc(s.compose.title)}" placeholder="分享你的游戏经验"></label><label>正文<textarea maxlength="20000" data-gr-compose-body placeholder="写下适用版本、游玩模式与具体步骤">${esc(s.compose.body)}</textarea></label>${s.composeError?`<p class="gr-compose-error" role="alert">${esc(s.composeError)}</p>`:''}<button type="submit">发布攻略</button></form>`;}
  function histories(){const r=M.get(s.id);return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>编辑历史</strong></header><div class="gr-history"><h2>${esc(displayTitle(r.title))}</h2><p>每篇资料独立记录；查看旧版不会修改公开内容。</p>${M.history(r.id).map(h=>`<button type="button" data-gr-history="${h.revision}"><b>修订 ${h.revision}${h.revision===r.revision?' · 当前':''}</b><span>${esc(h.author)} · ${esc(new Date(h.time).toLocaleString('zh-CN',{hour12:false}))}</span><small>${esc(h.changeSummary||h.note)}</small><i>查看 ›</i></button>`).join('')}</div>`;}
  function contributions(){const rows=M.list().flatMap(r=>M.history(r.id).filter(h=>h.revision>1).map(h=>({...h,id:r.id,title:r.title}))).sort((a,b)=>b.timestamp-a.timestamp);return `<header class="gr-subheader">${act('back','‹ 返回')}<strong>共建贡献记录</strong></header><div class="gr-history"><h2>内容贡献</h2><p>只统计成功保存的新修订，预览、取消和失败均不计入。</p>${rows.length?rows.map(h=>`<button type="button" data-guide-open="${esc(h.id)}"><b>${esc(h.title)}</b><span>${esc(h.author)} · 修订 ${h.revision}</span><small>${esc(h.changeSummary||h.note)}</small><i>查看资料 ›</i></button>`).join(''):'<div class="gr-empty">暂无贡献记录，编辑词条后可在这里查看。</div>'}</div>`;}
  function discussion(r){const rows=s.comments[r.id]||[];return `<section class="gr-comments"><h2>评论 <span>${rows.length}</span></h2>${rows.map(c=>`<article><b>我</b><small>刚刚</small><p>${esc(c)}</p></article>`).join('')}<form data-gr-comment-form><label><span>补充阅读反馈</span><textarea id="gr-comment-input" maxlength="500" placeholder="说明版本和需要核对的内容">${esc(s.commentDrafts[r.id]||'')}</textarea></label><button type="submit">发布评论</button><small data-gr-comment-error></small></form></section>`;}
  function renderDocument(){
    const current=M.get(s.id),r=s.snapshot||current;if(!r)return '<div class="gr-empty">资料不可用</div>';
    return `<header class="gr-subheader gr-record-header">${act('back','‹ 返回')}<strong>${s.snapshot?'历史只读版本':'词条'}</strong><span aria-hidden="true"></span></header><div class="gr-game-tools" data-gr-game-tools><img src="${esc(GH.asset('gtaIcon'))}" alt="GTA 5"><strong>GTA 5</strong>${!s.snapshot?act('favorite',GH.icon('save',18)+(s.favorites.includes(r.id)?'已收藏':'收藏'),`aria-pressed="${s.favorites.includes(r.id)}"`):''}</div>${s.snapshot?`<div class="gr-historical-banner">正在查看修订 ${r.revision}；公开内容仍为修订 ${current.revision}${act('current','回到当前版本')}</div>`:''}${guideRender(r,{onRead:!s.snapshot,readOnly:!!s.snapshot})}${!s.snapshot?`<div class="gr-record-actions">${act('edit','编辑词条','class="gr-primary"')}${act('comments','评论 '+(s.comments[r.id]||[]).length)}${act('share','分享')}</div>${s.share?`<section class="gr-share"><b>分享词条</b><p>${esc(r.title)}</p><code>${esc('gamehub://guide/'+r.id)}</code>${act('share','收起')}</section>`:''}${s.panel==='comments'?discussion(r):''}`:''}`;
  }

  function zoom(){if(!s.zoom)return '';const r=M.get(s.zoom.id),item=r?.items?.[s.zoom.index];if(!item)return '';return `<div class="gr-lightbox" role="dialog" aria-modal="true" aria-label="图册大图"><header><span>${s.zoom.index+1} / ${r.items.length}</span>${act('zoom-close','关闭 ×')}</header><figure>${photo(item.asset,item.caption,'','contain')}<figcaption>${esc(item.caption)}</figcaption></figure><nav>${act('zoom-prev','‹ 上一张',s.zoom.index===0?'disabled':'')}${act('zoom-next','下一张 ›',s.zoom.index===r.items.length-1?'disabled':'')}</nav></div>`;}
  function render(){const land=GH.orientation==='landscape';return `<div class="gr-reader ${land?'gr-landscape':''}" data-gr-view="${esc(s.view)}">${land&&s.view==='portal'?`<aside class="gr-side"><img src="${esc(GH.asset('gtaIcon'))}" alt="GTA 5"><h2>GTA 5</h2><p>攻略与资料</p>${act('portal','攻略首页')}${act('search','搜索资料')}${act('contributions','共建贡献')}</aside>`:''}<main class="gr-main"><div class="gr-scroll" data-gr-scroll>${s.view==='portal'?portal():s.view==='category'?category():s.view==='post'?post():s.view==='compose'?compose():s.view==='search'?search():s.view==='history'?histories():s.view==='contributions'?contributions():s.view==='editor-application'?editorApplication():renderDocument()}</div></main>${zoom()}</div>`;}
  function closeZoom(){s.returnZoomFocus=s.zoom?.origin??s.zoom?.index??0;s.zoom=null;rerender();}
  function bindCategoryPager(host){
    const pager=host.querySelector('[data-gr-category-pager]');if(!pager)return;
    const count=Number(pager.dataset.grPageCount),dots=[...host.querySelectorAll('[data-gr-category-dot]')],pages=[...pager.querySelectorAll('[data-gr-category-page]')];
    const clamp=value=>Math.max(0,Math.min(count-1,value));
    function sync(page){s.categoryPage=clamp(page);pager.dataset.grCurrentPage=s.categoryPage;dots.forEach((dot,index)=>dot.setAttribute('aria-current',String(index===s.categoryPage)));pages.forEach((node,index)=>{node.inert=index!==s.categoryPage;node.setAttribute('aria-hidden',String(index!==s.categoryPage));});}
    function move(page,{smooth=true,focus=false}={}){sync(page);pager.scrollTo({left:s.categoryPage*pager.clientWidth,behavior:smooth&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});if(focus)dots[s.categoryPage]?.focus({preventScroll:true});}
    move(s.categoryPage,{smooth:false});
    pager.addEventListener('scroll',()=>{if(pager.clientWidth)sync(Math.round(pager.scrollLeft/pager.clientWidth));},{passive:true});
    dots.forEach(dot=>dot.onclick=()=>move(Number(dot.dataset.grCategoryDot)));
    const keydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?count-1:s.categoryPage+(e.key==='ArrowRight'?1:-1);move(next,{focus:e.target.closest('.gr-category-dots')!==null});};
    pager.onkeydown=keydown;host.querySelector('.gr-category-dots')?.addEventListener('keydown',keydown);
    let drag=null,suppressClickUntil=0;
    pager.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:pager.scrollLeft,page:s.categoryPage,locked:false};});
    pager.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.locked){if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.2)return;drag.locked=true;pager.setPointerCapture(e.pointerId);pager.classList.add('is-dragging');}
      e.preventDefault();pager.scrollLeft=drag.left-dx;
    });
    function finish(e){if(!drag||e.pointerId!==drag.id)return;const previous=drag;drag=null;pager.classList.remove('is-dragging');if(!previous.locked)return;suppressClickUntil=Date.now()+400;if(pager.hasPointerCapture(e.pointerId))pager.releasePointerCapture(e.pointerId);const dx=e.clientX-previous.x,next=e.type==='pointercancel'?Math.round(pager.scrollLeft/pager.clientWidth):Math.abs(dx)>Math.max(40,pager.clientWidth*.12)?previous.page+(dx<0?1:-1):previous.page;move(next);}
    pager.addEventListener('pointerup',finish);pager.addEventListener('pointercancel',finish);
    pager.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
    pager.addEventListener('dragstart',e=>e.preventDefault());
  }
  function bind(host){
    const scroller=host.querySelector('[data-gr-scroll]');if(scroller)scroller.scrollTop=s.scrolls[key()]||0;host.querySelectorAll('[data-gr-local-tabs]').forEach(el=>el.scrollLeft=s.tabScrolls[el.dataset.grLocalTabs]||0);const anchors=host.querySelector('.gr-anchor-nav');if(anchors)anchors.scrollLeft=s.anchorScroll;
    host.querySelectorAll('[data-guide-open]').forEach(el=>el.onclick=()=>go(el.dataset.guideOpen));
    host.querySelectorAll('[data-gr-post]').forEach(el=>el.onclick=()=>goPost(el.dataset.grPost));
    host.querySelectorAll('[data-gr-category]').forEach(el=>el.onclick=()=>goCategory(el.dataset.grCategory));
    bindCategoryPager(host);
    host.querySelectorAll('[data-gr-anchor]').forEach(el=>el.onclick=()=>{s.activeAnchor=el.dataset.grAnchor;host.querySelectorAll('[data-gr-anchor]').forEach(b=>b.classList.toggle('active',b===el));host.querySelector('#gr-section-'+s.activeAnchor)?.scrollIntoView({block:'start',behavior:'auto'});});
    host.querySelectorAll('[data-gr-tab]').forEach(el=>el.onclick=()=>{const sectionId=el.dataset.grSectionId,tabId=el.dataset.grTab;s.tabs[sectionId]=tabId;rerender();document.querySelector(`[data-gr-section-id="${sectionId}"][data-gr-tab="${tabId}"]`)?.focus({preventScroll:true});});
    host.querySelectorAll('[data-gr-jump]').forEach(el=>el.onclick=()=>{const target=document.getElementById(el.dataset.grJump);if(!host.contains(target))return;target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});});
    host.querySelectorAll('[data-gr-filter]').forEach(el=>el.onchange=()=>{(s.filters[el.dataset.grRecord] ||= {})[el.dataset.grFilter]=el.value;rerender();});
    host.querySelectorAll('[data-gr-sort]').forEach(el=>el.onchange=()=>{s.sort[el.dataset.grSort]=el.value;rerender();});
    host.querySelectorAll('[data-gr-list-query]').forEach(el=>el.oninput=()=>{s.listQueries[el.dataset.grListQuery]=el.value;rerender();});
    const search=host.querySelector('[data-gr-site-query]');if(search)search.oninput=()=>{s.query=search.value;rerender();};
    host.querySelectorAll('[data-gr-zoom]').forEach(el=>el.onclick=()=>{s.zoom={id:s.id,index:Number(el.dataset.grZoom),origin:Number(el.dataset.grZoom)};s.zoomFocus='zoom-close';rerender();});
    host.querySelectorAll('[data-gr-history]').forEach(el=>el.onclick=()=>{capture();s.stack.push({view:s.view,id:s.id});s.snapshot=M.history(s.id).find(h=>h.revision===Number(el.dataset.grHistory))?.record;s.view='record';GH.render();});
    host.querySelectorAll('[data-gr-action]').forEach(el=>el.onclick=()=>{
      const a=el.dataset.grAction;
      if(a==='back')return back();
      if(a==='orientation'){capture();GH.orientation=GH.orientation==='portrait'?'landscape':'portrait';return GH.render();}
      if(a==='compose'){capture();s.stack.push(position());s.view='compose';s.composeError='';return GH.render();}
      if(a==='post-like'||a==='post-save'||a==='post-follow'){const p=P.get(s.postId),field=a==='post-like'?'postLikes':a==='post-follow'?'postFollows':'favorites',id=a==='post-follow'?p.author:p.id;s[field]=s[field].includes(id)?s[field].filter(v=>v!==id):[...s[field],id];return rerender();}
      if(a==='post-comments'){document.querySelector('.gr-post-comments')?.scrollIntoView({block:'start'});return;}

      if(a==='edit')return GH.openGuideStudio?.(s.id,'edit');
      if(a==='editor-workspace'){const current=editorState();if(!current.blocked&&['editor','manager'].includes(current.role)){GH.guideStudio?.setRole(current.role);return GH.openGuideStudio?.(s.id,'edit');}return;}
      if(a==='editor-application'){capture();s.stack.push(position());s.view='editor-application';s.editorError='';return GH.render();}
      if(a==='clear-filters'){s.filters[s.id]={};s.listQueries[s.id]='';s.sort[s.id]='';return rerender();}
      if(a==='favorite'||a==='site-favorite'){const id=a==='site-favorite'?'__portal':s.id;s.favorites=s.favorites.includes(id)?s.favorites.filter(v=>v!==id):[...s.favorites,id];return rerender();}
      if(a==='comments'){s.panel=s.panel==='comments'?'':'comments';rerender();host=document.querySelector('#module-host');host?.querySelector('.gr-comments')?.scrollIntoView({block:'start'});return;}
      if(a==='share'){s.share=!s.share;return rerender();}
      if(a==='current'){s.snapshot=null;return rerender();}
      if(a==='zoom-close')return closeZoom();
      if(a==='zoom-prev'||a==='zoom-next'){s.zoom.index+=a==='zoom-prev'?-1:1;s.zoomFocus=a;return rerender();}
      if(['portal','search','history','contributions'].includes(a)){capture();s.stack.push(position());s.view=a;s.panel='';s.snapshot=null;s.zoom=null;return GH.render();}
    });
    const editorInput=host.querySelector('[data-gr-editor-reason]');if(editorInput)editorInput.oninput=()=>{s.editorDraft=editorInput.value;s.editorError='';const error=host.querySelector('[data-gr-editor-error]');if(error)error.textContent='';};
    const editorForm=host.querySelector('[data-gr-editor-application]');if(editorForm)editorForm.onsubmit=e=>{e.preventDefault();const result=GH.guideGovernance?.applyEditor(editorInput.value);if(result?.ok){s.editorDraft=null;s.editorError='';}else s.editorError=result?.message||'申请暂时无法提交，请重试。';rerender();};
    const postInput=host.querySelector('#gr-post-comment');if(postInput)postInput.oninput=()=>s.commentDrafts[s.postId]=postInput.value;
    const postForm=host.querySelector('[data-gr-post-comment-form]');if(postForm)postForm.onsubmit=e=>{e.preventDefault();const text=postInput.value.trim();if(!text){postForm.querySelector('[data-gr-comment-error]').textContent='请输入评论内容';return;}(s.comments[s.postId]||=[]).push(text);s.commentDrafts[s.postId]='';rerender();};
    const composeForm=host.querySelector('[data-gr-compose]');if(composeForm){composeForm.querySelector('[data-gr-compose-title]').oninput=e=>s.compose.title=e.target.value;composeForm.querySelector('[data-gr-compose-body]').oninput=e=>s.compose.body=e.target.value;composeForm.onsubmit=e=>{e.preventDefault();const result=P.publish(s.compose);if(!result.ok){s.composeError=result.message;return rerender();}s.compose={title:'',body:''};s.composeError='';s.view='post';s.postId=result.post.id;GH.render();};}
    const input=host.querySelector('#gr-comment-input');if(input)input.oninput=()=>{s.commentDrafts[s.id]=input.value;};
    const form=host.querySelector('[data-gr-comment-form]');if(form)form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text){form.querySelector('[data-gr-comment-error]').textContent='请输入评论内容';return;}(s.comments[s.id] ||= []).push(text);s.commentDrafts[s.id]='';rerender();};
    if(s.zoom){const box=host.querySelector('.gr-lightbox');const focus=box.querySelector('[data-gr-action="'+s.zoomFocus+'"]:not(:disabled)')||box.querySelector('button');focus?.focus({preventScroll:true});box.onclick=e=>{if(e.target===box||e.target.tagName==='FIGURE')closeZoom();};box.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeZoom();return;}if(e.key==='ArrowLeft'&&s.zoom.index>0){e.preventDefault();s.zoom.index--;rerender();return;}if(e.key==='ArrowRight'&&s.zoom.index<M.get(s.zoom.id).items.length-1){e.preventDefault();s.zoom.index++;rerender();return;}if(e.key==='Tab'){const list=[...host.querySelectorAll('.gr-lightbox button:not(:disabled)')];if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}}};}else if(s.returnZoomFocus!==null){host.querySelector('[data-gr-zoom="'+s.returnZoomFocus+'"]')?.focus({preventScroll:true});s.returnZoomFocus=null;}
  }
  const scenarios=[['portal','攻略首页'],['category','分类收录'],['post','作者原帖'],['article','图文与目录'],['table','载具宽表'],['gallery','两列图片库'],['album','大图图册'],['entity','实体资料'],['version','版本索引'],['search','站内检索'],['history','编辑历史'],['building','建设中'],['paused','暂停维护']].map(([id,label])=>({id,label}));
  function scenario(id){s.stack=[];s.panel='';s.snapshot=null;s.zoom=null;const ids={article:'article-beginner',table:'table-vehicles',gallery:'gallery-assets',album:'album-pegassi',entity:'entity-horus',version:'version-index',building:'article-building',paused:'article-paused-map'};if(ids[id])open(ids[id]);else if(id==='history'){open('article-beginner');s.view='history';}else if(id==='search'){s.view='search';s.query='载具';}else if(id==='category'){s.view='category';s.category='b-11';}else if(id==='post'){s.view='post';s.postId='post-first-trip';}else s.view='portal';}
  GH.modules.legacyGuide=GH.modules.guide;
  GH.modules.guide={title:'GTA V 攻略站',subtitle:'分类收录 · 作者原帖 · 公共资料共建',render,bind,open,reset,scenario,scenarios,navigationMode:()=>s.view==='portal'?'root':'detail',inspect:()=>JSON.parse(JSON.stringify({...s,currentRecord:M.get(s.id),visibleEntityIds:M.get(s.id)?.entityIds?visibleEntities(M.get(s.id),true).map(r=>r.id):[],sectionCount:M.sections().length,tabCount:M.sections().reduce((n,v)=>n+v.tabs.filter(t=>t.label!=='默认').length,0),totalTabCount:M.sections().reduce((n,v)=>n+v.tabs.length,0)})),notes:()=>['首页借鉴米游社分类与原帖承接；个人攻略保留作者，不向他人开放词条编辑。搜索同时检索原帖与共建资料。','普通发布沿用游戏＋攻略，本地会话发布后进入原帖；关注、点赞、收藏和评论均不连接真实社区。','实体资料只维护一次，表格、图片库与详情共用同一对象，保存后直接生效。','首页按Banner、上图下文、左图右文、文字各展示一栏；数量Tab分别穷举1、1–4、1–2、1–4列。16栏目共45Tab仍保留分类访问，内容未完整填充。','读者查看资料，贡献者维护内容，管理员配置固定模板和展示结构。编辑、评论、收藏、分享仅本页会话有效，刷新重置。','当前图文行内目录与固定模板排版为盖世设计派生；不是对竞品页面的像素复刻。']};
})();
