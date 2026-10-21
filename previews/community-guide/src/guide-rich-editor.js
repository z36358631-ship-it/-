/* One editing surface; only structured blocks and allowlisted inline marks are saved. */
(()=>{
  'use strict';
  const GH=window.GH,M=()=>GH.guideStore,E=value=>GH.esc(value??'');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const sessions=new WeakMap(),sourceDrafts=new WeakMap();
  const textTypes=new Set(['paragraph','heading','quote','callout','link']);
  const icon=(name,fallback)=>GH.icon?.(name)||fallback;
  function toolbarButton(action,label,symbol){return `<button type="button" data-re-action="${action}" title="${label}" aria-label="${label}">${symbol}</button>`;}
  function render(record,{canEdit=true}={}){
    const draft=sourceDrafts.get(record),html=draft?.mode==='html';
    return `<section class="gre-editor ${html?'is-html-mode':''}" data-rich-record="${E(record.id)}"><header class="gre-toolbar" role="toolbar" aria-label="正文格式"><div class="gre-format-tools" data-re-format-tools ${html?'hidden':''}><select data-re-format aria-label="文字样式" ${!canEdit?'disabled':''}><option value="p">正文</option><option value="h2">小标题</option></select><select data-re-size aria-label="字号" ${!canEdit?'disabled':''}>${M().richFontSizes().map(size=>`<option value="${size}" ${size===16?'selected':''}>${size}px</option>`).join('')}</select>${toolbarButton('bold','加粗','<b>B</b>')}${toolbarButton('italic','斜体','<i>I</i>')}${toolbarButton('underline','下划线','<u>U</u>')}${toolbarButton('removeFormat','清除格式','Tx')}<span class="gre-toolbar-separator"></span>${toolbarButton('link','插入超链接',icon('link','链接'))}${toolbarButton('image','插入图片',icon('image','图片'))}${toolbarButton('video','插入视频',icon('video','视频'))}${toolbarButton('component','插入共享组件',icon('layout-template','组件'))}</div><nav class="gre-mode-switch" aria-label="正文编辑方式"><button type="button" data-re-mode="rich" aria-pressed="${!html}">富文本</button><button type="button" data-re-mode="html" aria-pressed="${html}">HTML</button></nav></header><div class="gre-insert-panel" data-re-panel hidden></div><div class="gre-feedback ${draft?.error?'is-error':''}" data-re-status role="status">${E(draft?.error||'')}</div><div class="gre-surface" data-re-surface ${html?'hidden':''} contenteditable="${canEdit?'true':'false'}" role="textbox" aria-label="统一正文编辑器" aria-multiline="true">${bodyHTML(record,canEdit)}</div><textarea class="gre-html-source" data-re-html ${!html?'hidden':''} ${!canEdit?'readonly':''} aria-label="HTML 正文源码" spellcheck="false">${E(draft?.source||'')}</textarea><footer class="gre-footer"><span data-re-mode-label>${html?'HTML 源码':canEdit?'正文':'只读正文'}</span><span data-re-count>${(record.blocks||[]).length} 个内容段落</span></footer></section>`;
  }
  function bodyHTML(record,canEdit){const blocks=record.blocks||[],last=blocks.at(-1);return blocks.map(block=>blockHTML(block,record,canEdit)).join('')+(!last||canEdit&&!textTypes.has(last.type)&&last.type!=='list'?'<p data-re-placeholder><br></p>':'');}
  function blockHTML(block,record,canEdit){
    const attrs=`data-re-id="${E(block.id)}" data-re-kind="${E(block.type)}"`;
    if(textTypes.has(block.type)){
      const tag=block.type==='heading'?'h2':block.type==='quote'?'blockquote':block.type==='callout'?'aside':'p';
      let value=M().richBlockText(block)||'<br>';
      if(block.type==='link'&&!block.inline)value=`<a href="${E(M().linkError(block.href)?'':block.href)}" target="_blank" rel="noopener noreferrer">${value}</a>`;
      return `<${tag} ${attrs}>${value}</${tag}>`;
    }
    if(block.type==='list'){const tag=block.ordered?'ol':'ul';return `<${tag} ${attrs}>${(block.items||[]).map((item,index)=>'<li>'+M().richListItem(block,index)+'</li>').join('')}</${tag}>`;}
    let content='';
    if(block.type==='image')content=`<img src="${E(M().assetSrc(block.asset))}" alt="${E(block.caption)}" style="object-fit:${block.crop==='contain'?'contain':'cover'}"><figcaption>${E(block.caption||'图片')}</figcaption>`;
    else if(block.type==='video')content=`<video controls playsinline preload="metadata" src="${E(M().videoSrc(block.src))}"></video><figcaption>${E(block.caption||'视频')}</figcaption>`;
    else if(block.type==='component')content=GH.guideComponentRender?.(block,{preview:true,recordId:record.id})||`<div class="gre-component-preview"><b>${E(block.title||M().components().find(c=>c.id===block.layout)?.label)}</b>${(block.items||[]).map(item=>'<span>'+E(item.title)+'</span>').join('')||'<span>暂无内容项</span>'}</div>`;
    else if(block.type==='table')content=`<div class="gre-table-scroll"><table><thead><tr>${(block.headers||[]).map(value=>'<th>'+E(value)+'</th>').join('')}</tr></thead><tbody>${(block.rows||[]).map(row=>'<tr>'+row.map(value=>'<td>'+E(value)+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`;
    else if(block.type==='related')content=`<div class="gre-component-preview"><b>${E(block.text||'关联资料')}</b>${(block.ids||[]).map(id=>'<span>'+E(M().get(id)?.title||id)+'</span>').join('')}</div>`;
    else content='<div>已有内容</div>';
    return `<figure ${attrs} data-re-atom="${E(block.id)}" contenteditable="false" tabindex="0">${content}${canEdit?`<div class="gre-atom-actions">${['image','video','component','table'].includes(block.type)?`<button type="button" data-re-edit="${E(block.id)}">编辑</button>`:''}<button type="button" data-re-move="${E(block.id)}|-1" aria-label="上移内容">↑</button><button type="button" data-re-move="${E(block.id)}|1" aria-label="下移内容">↓</button><button type="button" data-re-delete="${E(block.id)}">删除</button></div>`:''}</figure>`;
  }
  function inlineFromDOM(root){
    const runs=[];
    const walk=(node,marks={})=>{
      if(node.nodeType===3){if(node.textContent)runs.push({...marks,text:node.textContent});return;}
      if(node.nodeType!==1||['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE'].includes(node.tagName))return;
      if(node.tagName==='BR'){runs.push({...marks,text:'\n'});return;}
      const next={...marks},tag=node.tagName;
      if(tag==='B'||tag==='STRONG'||Number(node.style.fontWeight)>=600)next.bold=true;
      if(tag==='I'||tag==='EM'||node.style.fontStyle==='italic')next.italic=true;
      if(tag==='U'||node.style.textDecorationLine==='underline')next.underline=true;
      let size=parseInt(node.style.fontSize,10);
      if(tag==='FONT'&&!size)size=({1:12,2:14,3:16,4:18,5:24,6:28,7:32})[node.getAttribute('size')];
      if(M().richFontSizes().includes(size))next.size=size;
      if(tag==='A'){const href=node.getAttribute('href')||'';if(!M().linkError(href))next.href=href;}
      [...node.childNodes].forEach(child=>walk(child,next));
      if(node!==root&&['DIV','P'].includes(tag))runs.push({...marks,text:'\n'});
    };
    walk(root);
    const merged=[];
    for(const run of runs){const last=merged.at(-1);if(last&&JSON.stringify({...last,text:''})===JSON.stringify({...run,text:''}))last.text+=run.text;else merged.push(run);}
    return merged;
  }
  // Source mode parses into the same allowlisted blocks; raw source never enters the live editor DOM.
  function sourceHTML(record){
    const id=block=>` data-gh-id="${E(block.id)}"`;
    return (record.blocks||[]).map(block=>{
      if(textTypes.has(block.type)){
        const tag=block.type==='heading'?'h2':block.type==='quote'?'blockquote':block.type==='callout'?'aside':'p';
        let text=M().richBlockText(block)||'<br>';
        if(block.type==='link'&&!block.inline)text=`<a href="${E(block.href)}">${text}</a>`;
        return `<${tag}${id(block)}${block.cite?` cite="${E(block.cite)}"`:''}>${text}</${tag}>`;
      }
      if(block.type==='list'){const tag=block.ordered?'ol':'ul';return `<${tag}${id(block)}>\n${block.items.map((_,i)=>'  <li>'+M().richListItem(block,i)+'</li>').join('\n')}\n</${tag}>`;}
      if(block.type==='image')return `<figure${id(block)} data-gh-kind="image" data-gh-asset="${E(block.asset)}" data-gh-crop="${E(block.crop||'cover')}"><img src="${E(M().assetSrc(block.asset))}" alt="${E(block.caption||'')}"><figcaption>${E(block.caption||'')}</figcaption></figure>`;
      if(block.type==='video')return `<figure${id(block)} data-gh-kind="video"><video src="${E(block.src)}" controls></video><figcaption>${E(block.caption||'')}</figcaption></figure>`;
      if(block.type==='table')return `<table${id(block)}><thead><tr>${block.headers.map(text=>'<th>'+E(text)+'</th>').join('')}</tr></thead><tbody>${block.rows.map(row=>'<tr>'+row.map(text=>'<td>'+E(text)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
      if(block.type==='related')return `<nav${id(block)} data-gh-related="${E((block.ids||[]).join('|'))}">${E(block.text||'')}</nav>`;
      if(block.type==='component')return `<section${id(block)} data-gh-component="${E(block.layout)}" data-gh-title="${E(block.title||'')}" data-gh-columns="${block.columns.portrait},${block.columns.landscape}">\n${block.items.map(item=>`  <a data-gh-item="${E(item.id)}" data-gh-target="${E(item.targetId)}" data-gh-cover="${E(item.cover||'')}">${E(item.title)}</a>`).join('\n')}\n</section>`;
      throw new Error('当前内容段落不支持 HTML 编辑：'+block.type);
    }).join('\n\n');
  }
  function parseSource(source,record){
    if(typeof source!=='string'||source.length>4000000)return {ok:false,error:'HTML 源码过长，请缩减后重试。'};
    const template=document.createElement('template');template.innerHTML=source;
    const root=template.content,allowed=new Set(['P','DIV','H2','H3','BLOCKQUOTE','ASIDE','UL','OL','LI','STRONG','B','EM','I','U','SPAN','FONT','BR','A','FIGURE','IMG','FIGCAPTION','VIDEO','TABLE','THEAD','TBODY','TR','TH','TD','SECTION','NAV']);
    const common=new Set(['data-gh-id']),inlineTags=new Set(['STRONG','B','EM','I','U','SPAN','FONT','BR','A']);
    const attributes={A:['href','target','rel','data-gh-item','data-gh-target','data-gh-cover'],SPAN:['style'],FONT:['style','size'],P:['style'],DIV:['style'],H2:['style'],H3:['style'],BLOCKQUOTE:['cite','style'],ASIDE:['style'],LI:['style'],FIGURE:['data-gh-kind','data-gh-asset','data-gh-crop'],IMG:['src','alt'],VIDEO:['src','controls','playsinline','preload'],SECTION:['data-gh-component','data-gh-title','data-gh-columns'],NAV:['data-gh-related']};
    const fail=error=>({ok:false,error});
    const safeStyle=element=>{
      for(const property of [...element.style]){
        const value=element.style.getPropertyValue(property).trim();
        if(property==='font-size'&&/^\d+px$/.test(value)&&M().richFontSizes().includes(parseInt(value,10)))continue;
        if(property==='font-weight'&&/^(bold|normal|[1-9]00)$/.test(value))continue;
        if(property==='font-style'&&/^(italic|normal)$/.test(value))continue;
        if((property==='text-decoration'||property==='text-decoration-line')&&/^(underline|none)$/.test(value))continue;
        return '不支持样式 '+property+'；可使用编辑器提供的字号、加粗、斜体和下划线。';
      }
      return '';
    };
    for(const element of root.querySelectorAll('*')){
      if(!allowed.has(element.tagName))return fail('不支持 <'+element.tagName.toLowerCase()+'> 标签；源码已保留，请修改后重试。');
      for(const attr of [...element.attributes])if(!common.has(attr.name)&&!(attributes[element.tagName]||[]).includes(attr.name))return fail('不支持 '+attr.name+' 属性；源码已保留，请修改后重试。');
      if(element.hasAttribute('style')){const error=safeStyle(element);if(error)return fail(error);}
      if(element.tagName==='FONT'&&element.hasAttribute('size')&&!/^[1-7]$/.test(element.getAttribute('size')))return fail('font size 仅支持1至7，或使用编辑器字号。');
      if(element.tagName==='A'&&element.hasAttribute('href')){const error=M().linkError(element.getAttribute('href'));if(error)return fail(error);}
      if(element.tagName==='IMG'){
        const figure=element.parentElement,asset=figure?.getAttribute('data-gh-asset'),url=element.getAttribute('src')||'';
        const error=asset&&M().assetSrc(asset)===url?M().imageError(asset):M().imageError(url);if(error)return fail(error);
      }
      if(element.tagName==='VIDEO'){const error=M().videoError(element.getAttribute('src')||'');if(error)return fail(error);}
    }
    const comments=document.createTreeWalker(root,NodeFilter.SHOW_COMMENT);if(comments.nextNode())return fail('不支持 HTML 注释；请删除注释后重试，源码已保留。');
    const blocks=[],used=new Set(),original=new Map((record.blocks||[]).map(block=>[block.id,block]));
    const getId=node=>{const proposed=node.getAttribute?.('data-gh-id')||uid('body');if(!/^[a-zA-Z0-9_-]{1,120}$/.test(proposed)||used.has(proposed))throw Error('内容段落 ID 无效或重复。');used.add(proposed);return proposed;};
    const inlineOnly=node=>{for(const child of node.querySelectorAll('*'))if(!inlineTags.has(child.tagName))throw Error('文本段落内不支持 <'+child.tagName.toLowerCase()+'>；请作为独立段落添加。');};
    try{
      for(const node of root.childNodes){
        if(node.nodeType===3){if(node.textContent.trim())blocks.push({id:uid('body'),type:'paragraph',text:node.textContent,inline:[{text:node.textContent}]});continue;}
        if(node.nodeType!==1)throw Error('HTML 包含无法识别的内容节点。');
        const id=getId(node),tag=node.tagName;
        if(['P','DIV','H2','H3','BLOCKQUOTE','ASIDE'].includes(tag)){
          inlineOnly(node);const inline=inlineFromDOM(node),text=inline.map(run=>run.text).join(''),type=['H2','H3'].includes(tag)?'heading':tag==='BLOCKQUOTE'?'quote':tag==='ASIDE'?'callout':'paragraph';
          const block={id,type,text,inline};if(tag==='BLOCKQUOTE'&&node.hasAttribute('cite'))block.cite=node.getAttribute('cite');blocks.push(block);continue;
        }
        if(tag==='UL'||tag==='OL'){
          if([...node.children].some(child=>child.tagName!=='LI'))throw Error('列表中仅支持 li 项目。');
          const inlineItems=[...node.children].map(li=>{inlineOnly(li);return inlineFromDOM(li);}),items=inlineItems.map(runs=>runs.map(run=>run.text).join(''));if(!items.length||items.some(item=>!item.trim()))throw Error('列表至少需要一条非空内容。');
          blocks.push({id,type:'list',ordered:tag==='OL',items,inlineItems});continue;
        }
        if(tag==='FIGURE'){
          const children=[...node.children],kind=node.getAttribute('data-gh-kind'),media=children.find(child=>child.tagName==='IMG'||child.tagName==='VIDEO'),caption=children.find(child=>child.tagName==='FIGCAPTION');
          if(!media||children.some(child=>child!==media&&child!==caption)||children.length!==(caption?2:1))throw Error('figure 仅支持一张图片或一个视频和可选 figcaption。');
          if(caption?.children.length)throw Error('图片或视频说明仅支持纯文本。');
          if(media.tagName==='IMG'){
            if(kind&&kind!=='image')throw Error('图片内容类型不一致。');const src=media.getAttribute('src'),asset=node.getAttribute('data-gh-asset');
            const crop=node.getAttribute('data-gh-crop')||'cover';if(!['cover','contain'].includes(crop))throw Error('图片显示方式仅支持 cover 或 contain。');
            blocks.push({id,type:'image',asset:asset&&M().assetSrc(asset)===src?asset:src,caption:caption?.textContent??media.getAttribute('alt')??'',crop});
          }else{if(kind&&kind!=='video')throw Error('视频内容类型不一致。');blocks.push({id,type:'video',src:media.getAttribute('src'),caption:caption?.textContent||''});}continue;
        }
        if(tag==='IMG'){blocks.push({id,type:'image',asset:node.getAttribute('src'),caption:node.getAttribute('alt')||'',crop:'cover'});continue;}
        if(tag==='VIDEO'){if(node.children.length)throw Error('video 请直接使用 src 地址，不支持嵌套内容。');blocks.push({id,type:'video',src:node.getAttribute('src'),caption:''});continue;}
        if(tag==='TABLE'){
          if([...node.querySelectorAll('*')].some(child=>!['THEAD','TBODY','TR','TH','TD'].includes(child.tagName)))throw Error('表格单元格仅支持纯文本。');
          const rows=[...node.rows];if(!rows.length)throw Error('表格至少需要一行表头。');
          const headers=[...rows[0].cells].map(cell=>cell.textContent),body=rows.slice(1).map(row=>[...row.cells].map(cell=>cell.textContent));if(!headers.length||body.some(row=>row.length!==headers.length))throw Error('表头和每行列数须一致。');
          blocks.push({id,type:'table',headers,rows:body});continue;
        }
        if(tag==='NAV'){
          if(node.children.length||!node.hasAttribute('data-gh-related'))throw Error('nav 仅用于保留关联资料组件。');
          const ids=node.getAttribute('data-gh-related').split('|').filter(Boolean);if(new Set(ids).size!==ids.length||ids.some(target=>!M().list().some(item=>item.id===target)||target===record.id))throw Error('关联资料必须引用当前地区和分区的其他词条。');blocks.push({id,type:'related',ids,text:node.textContent});continue;
        }
        if(tag==='SECTION'){
          const layout=node.getAttribute('data-gh-component'),columns=(node.getAttribute('data-gh-columns')||'').split(',').map(Number),max=layout==='banner'?1:layout==='image-left'?2:4;
          if(!M().components().some(item=>item.id===layout)||columns.length!==2||columns.some(value=>!Number.isInteger(value)||value<1||value>max))throw Error('组件类型或横竖屏列数无效。');
          const items=[...node.children].map(child=>{if(child.tagName!=='A'||child.children.length||!child.hasAttribute('data-gh-item')||!child.hasAttribute('data-gh-target')||child.hasAttribute('href'))throw Error('组件项目仅支持带 data-gh-item 和 data-gh-target 的纯文本 a 标签。');return {id:child.getAttribute('data-gh-item'),title:child.textContent,targetId:child.getAttribute('data-gh-target'),cover:child.getAttribute('data-gh-cover')||''};});
          if(items.length>24||new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>!item.id||!item.title.trim()||!M().list().some(target=>target.id===item.targetId&&target.id!==record.id)||(item.cover&&M().imageError(item.cover))))throw Error('组件项目需有唯一 ID、标题、有效配图和同区其他词条。');
          blocks.push({id,type:'component',layout,title:node.getAttribute('data-gh-title')||'',columns:{portrait:columns[0],landscape:columns[1]},items});continue;
        }
        if(inlineTags.has(tag)){inlineOnly(node);const inline=inlineFromDOM(node);blocks.push({id,type:'paragraph',text:inline.map(run=>run.text).join(''),inline});continue;}
        throw Error('<'+tag.toLowerCase()+'> 必须放在对应的段落或表格中，无法作为独立内容。');
      }
      const moderation=M().moderationError(blocks);if(moderation)return fail(moderation);
      if(blocks.length>100)return fail('正文最多支持100个内容段落。');
      return {ok:true,blocks};
    }catch(error){return fail(error.message+'源码已保留，请修改后重试。');}
  }
  function bind(host,{record,canEdit=true,onChange=()=>{}}={}){
    const editor=host.matches?.('.gre-editor')?host:host.querySelector?.('.gre-editor');
    if(!editor||!record)return null;
    const previous=sessions.get(editor);if(previous)return previous.api;
    record.blocks=record.blocks||[];
    const surface=editor.querySelector('[data-re-surface]'),panel=editor.querySelector('[data-re-panel]'),source=editor.querySelector('[data-re-html]');
    const draft=sourceDrafts.get(record)||{mode:'rich',source:'',error:''};sourceDrafts.set(record,draft);
    const session={editor,surface,panel,source,draft,record,canEdit,onChange,range:null,originals:new Map(),markup:new Map(),panelState:null};
    const feedback=(text,error=false)=>{const target=editor.querySelector('[data-re-status]');target.textContent=text;target.classList.toggle('is-error',error);};
    function remember(){const selection=getSelection();if(selection?.rangeCount){const range=selection.getRangeAt(0);if(surface.contains(range.startContainer)&&surface.contains(range.endContainer))session.range=range.cloneRange();}}
    function restore(){const range=session.range?.cloneRange();surface.focus();const selection=getSelection();if(range&&surface.contains(range.startContainer)&&surface.contains(range.endContainer)){selection.removeAllRanges();selection.addRange(range);session.range=range;}else{const end=document.createRange();end.selectNodeContents(surface);end.collapse(false);selection.removeAllRanges();selection.addRange(end);session.range=end;}}
    function index(){session.originals=new Map(record.blocks.map(block=>[block.id,clone(block)]));session.markup=new Map([...surface.children].filter(el=>el.dataset.reId).map(el=>[el.dataset.reId,el.outerHTML]));}
    function serialize(){
      const blocks=[],used=new Set();
      for(const node of [...surface.childNodes]){
        if(node.nodeType!==1&&node.nodeType!==3)continue;
        if(node.nodeType===3&&!node.textContent.trim())continue;
        const element=node.nodeType===1?node:null,original=element&&session.originals.get(element.dataset.reId),isAtom=element?.hasAttribute('data-re-atom');
        if(element?.hasAttribute('data-re-placeholder')&&!element.textContent.trim())continue;
        if(isAtom&&original){blocks.push(clone(original));used.add(original.id);continue;}
        if(element&&original&&!used.has(original.id)&&session.markup.get(original.id)===element.outerHTML){blocks.push(clone(original));used.add(original.id);continue;}
        const id=original&&!used.has(original.id)?original.id:uid('body');used.add(id);
        if(element&&['UL','OL'].includes(element.tagName)){const inlineItems=[...element.children].filter(child=>child.tagName==='LI').map(li=>inlineFromDOM(li)).filter(runs=>runs.some(run=>run.text.trim())),items=inlineItems.map(runs=>runs.map(run=>run.text).join(''));if(items.length)blocks.push({id,type:'list',items,inlineItems,ordered:element.tagName==='OL'});element.dataset.reId=id;element.dataset.reKind='list';continue;}
        const inline=node.nodeType===3?[{text:node.textContent}]:inlineFromDOM(element),plain=inline.map(run=>run.text).join('');
        if(!plain&&node.nodeType===3)continue;
        const tag=element?.tagName,type=tag==='H2'||tag==='H3'?'heading':tag==='BLOCKQUOTE'?'quote':element?.dataset.reKind==='callout'?'callout':'paragraph';
        const block={id,type,text:plain,inline};if(type==='quote'&&original?.cite)block.cite=original.cite;
        blocks.push(block);
        if(element){element.dataset.reId=id;element.dataset.reKind=type;}
      }
      return blocks;
    }
    function change(reason='input'){
      if(!canEdit||draft.mode==='html')return;
      const blocks=serialize();record.blocks=blocks;
      session.originals=new Map(blocks.map(block=>[block.id,clone(block)]));
      session.markup=new Map([...surface.children].filter(el=>el.dataset.reId).map(el=>[el.dataset.reId,el.outerHTML]));
      const error=M().moderationError(blocks);feedback(error,error!=='');
      editor.querySelector('[data-re-count]').textContent=blocks.length+' 个内容段落';
      onChange({record,blocks,reason});remember();
    }
    function flushSource(){
      const result=parseSource(source.value,record);draft.source=source.value;draft.error=result.ok?'':result.error;feedback(draft.error,!result.ok);
      if(!result.ok)return result;
      if(canEdit){record.blocks=result.blocks;onChange({record,blocks:record.blocks,reason:'html'});}
      editor.querySelector('[data-re-count]').textContent=result.blocks.length+' 个内容段落';return result;
    }
    function setMode(mode){
      if(mode===draft.mode)return true;
      if(mode==='html'){change('mode');try{draft.source=sourceHTML(record);}catch(error){feedback(error.message,true);return false;}source.value=draft.source;closePanel();draft.mode='html';}
      else{const result=flushSource();if(!result.ok)return false;draft.mode='rich';surface.innerHTML=bodyHTML(record,canEdit);index();bindAtoms();}
      editor.classList.toggle('is-html-mode',draft.mode==='html');surface.hidden=draft.mode==='html';source.hidden=draft.mode!=='html';editor.querySelector('[data-re-format-tools]').hidden=draft.mode==='html';editor.querySelector('[data-re-mode-label]').textContent=draft.mode==='html'?'HTML 源码':canEdit?'正文':'只读正文';
      editor.querySelectorAll('[data-re-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reMode===draft.mode)));return true;
    }
    function redraw(reason){surface.innerHTML=bodyHTML(record,canEdit);index();bindAtoms();change(reason);}
    function closePanel(){panel.hidden=true;panel.innerHTML='';session.panelState=null;}
    function insertBlock(block){restore();const selection=getSelection(),range=selection?.rangeCount?selection.getRangeAt(0):null;let child=range?.startContainer;while(child&&child.parentNode!==surface)child=child.parentNode;if(child?.parentNode===surface){const i=record.blocks.findIndex(item=>item.id===child.dataset?.reId);record.blocks.splice(i<0?record.blocks.length:i+1,0,block);}else record.blocks.push(block);redraw('insert-'+block.type);closePanel();feedback('已插入'+({image:'图片',video:'视频',component:'组件'}[block.type]||'内容')+'。');}
    function bindAtoms(){
      surface.querySelectorAll('[data-re-edit]').forEach(button=>button.onclick=()=>{if(!canEdit)return;const block=record.blocks.find(item=>item.id===button.dataset.reEdit);if(block)showPanel(block.type,block);});
      surface.querySelectorAll('[data-re-delete]').forEach(button=>button.onclick=()=>{if(!canEdit)return;change('sync');record.blocks=record.blocks.filter(block=>block.id!==button.dataset.reDelete);redraw('delete');});
      surface.querySelectorAll('[data-re-move]').forEach(button=>button.onclick=()=>{if(!canEdit)return;change('sync');const [id,d]=button.dataset.reMove.split('|'),index=record.blocks.findIndex(block=>block.id===id),to=index+Number(d);if(to>=0&&to<record.blocks.length)[record.blocks[index],record.blocks[to]]=[record.blocks[to],record.blocks[index]];redraw('reorder');});
      surface.querySelectorAll('a').forEach(link=>link.onclick=event=>event.preventDefault());
    }
    function field(label,key,value='',type='text'){return `<label class="gre-field"><span>${label}</span><input type="${type}" data-re-value="${key}" value="${E(value)}" maxlength="${key==='url'?2048:2000}"></label>`;}
    function panelMessage(message){const target=panel.querySelector('[data-re-panel-error]');target.textContent=message;}
    function showPanel(kind,existing){
      if(!canEdit)return;remember();change('sync');
      const current=existing&&record.blocks.find(block=>block.id===existing.id),draft=current?clone(current):kind==='component'?{id:uid('component'),type:'component',layout:'banner',title:'',columns:{portrait:1,landscape:1},items:[]}:null;
      session.panelState={kind,draft};panel.hidden=false;
      let body='';
      if(kind==='link')body=field('链接文字','label',getSelection()?.toString()||'')+field('链接地址','url','','url');
      if(kind==='image'){
        const asset=current?.asset||'',names=Object.keys(window.DEMO_DATA?.assets||{}).filter(name=>name.startsWith('wiki-')||['guideHero','gtaIcon'].includes(name));
        body=`<label class="gre-field"><span>登记素材</span><select data-re-value="asset"><option value="">请选择登记素材</option>${names.map(name=>`<option value="${E(name)}" ${asset===name?'selected':''}>${E(name.replace('wiki-','资料 · '))}</option>`).join('')}</select></label>${field('图片 URL','url',/^https?:/.test(asset)?asset:'','url')}<label class="gre-field"><span>本地图片</span><input type="file" data-re-file accept="image/png,image/jpeg,image/webp,image/gif"></label>${field('图片说明','caption',current?.caption||'')}<label class="gre-field"><span>显示方式</span><select data-re-value="crop"><option value="cover" ${current?.crop!=='contain'?'selected':''}>居中填充</option><option value="contain" ${current?.crop==='contain'?'selected':''}>完整显示</option></select></label><p class="gre-note">本地图片支持 PNG / JPG / WebP / GIF，最大 2 MB。</p>`;
        session.panelState.asset=asset;
      }
      if(kind==='video')body=field('视频 URL','url',current?.src||'','url')+field('视频说明','caption',current?.caption||'')+'<p class="gre-note">填写可直接播放的视频地址，支持 http(s) 链接。</p>';
      if(kind==='component'){renderComponentPanel();return;}
      if(kind==='table')body=field('表头（每列用 | 分隔）','headers',(current.headers||[]).join('|'))+`<label class="gre-field"><span>表格内容（每行一条，每列用 | 分隔）</span><textarea data-re-value="rows">${E((current.rows||[]).map(row=>row.join('|')).join('\n'))}</textarea></label>`;
      panel.innerHTML=`<div class="gre-panel-heading"><strong>${current?'编辑':'插入'}${{link:'链接',image:'图片',video:'视频',table:'表格'}[kind]}</strong><button type="button" data-re-close aria-label="关闭插入面板">×</button></div>${body}<p class="gre-panel-error" data-re-panel-error role="alert"></p><div class="gre-panel-actions"><button type="button" data-re-close>取消</button><button type="button" data-re-apply>${current?'应用修改':'插入正文'}</button></div>`;
      panel.querySelectorAll('[data-re-close]').forEach(button=>button.onclick=closePanel);
      panel.querySelector('[data-re-file]')?.addEventListener('change',async event=>{
        const file=event.target.files?.[0];if(!file)return;
        const error=M().moderationError(file.name);if(error||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>M().maxImageBytes){session.panelState.asset='';panelMessage(error||'请选择 2 MB 以内的 PNG、JPG、WebP 或 GIF 图片。');return;}
        const currentPanel=session.panelState,reader=new FileReader();reader.onload=()=>{if(session.panelState!==currentPanel)return;const result=M().registerImage(reader.result);if(!result.ok){panelMessage(result.message);return;}currentPanel.asset=reader.result;panel.querySelector('[data-re-value="url"]').value='';panel.querySelector('[data-re-value="asset"]').value='';panelMessage('本地图片已载入。');};reader.onerror=()=>{if(session.panelState===currentPanel)panelMessage('图片读取失败，请重选。');};reader.readAsDataURL(file);
      });
      panel.querySelector('[data-re-value="asset"]')?.addEventListener('change',event=>{session.panelState.asset=event.target.value;panel.querySelector('[data-re-value="url"]').value='';});
      panel.querySelector('[data-re-value="url"]')?.addEventListener('input',()=>{if(kind==='image')session.panelState.asset='';});
      panel.querySelector('[data-re-apply]').onclick=()=>{
        const value=key=>panel.querySelector('[data-re-value="'+key+'"]')?.value||'';
        if(kind==='link'){
          const url=value('url').trim(),label=value('label');const error=M().linkError(url)||M().moderationError(label);if(error||!label.trim()){panelMessage(error||'请填写链接文字。');return;}
          restore();document.execCommand('insertHTML',false,'<a href="'+E(url)+'" target="_blank" rel="noopener noreferrer">'+E(label)+'</a>');change('link');closePanel();return;
        }
        let block;
        if(kind==='image'){const asset=value('url').trim()||session.panelState.asset,error=M().imageError(asset)||M().moderationError(value('caption'));if(error){panelMessage(error);return;}block={id:current?.id||uid('image'),type:'image',asset,caption:value('caption'),crop:value('crop')};}
        if(kind==='video'){const src=value('url').trim(),error=M().videoError(src)||M().moderationError(value('caption'));if(error){panelMessage(error);return;}block={id:current?.id||uid('video'),type:'video',src,caption:value('caption')};}
        if(kind==='table'){const headers=value('headers').split('|'),rows=value('rows').split('\n').map(row=>row.split('|'));if(!headers.length||headers.some(v=>v.length>200)||rows.some(row=>row.length!==headers.length||row.some(v=>v.length>2000))){panelMessage('表头与每行列数须一致，表头最长200字、单元格最长2000字。');return;}const error=M().moderationError({headers,rows});if(error){panelMessage(error);return;}block={...current,headers,rows};}
        if(current){record.blocks[record.blocks.findIndex(item=>item.id===current.id)]=block;redraw('update-'+kind);closePanel();}else insertBlock(block);
      };
    }
    function renderComponentPanel(){
      const block=session.panelState.draft,targets=M().list().filter(item=>item.id!==record.id),sizes=block.layout==='banner'?[1]:block.layout==='image-left'?[1,2]:[1,2,3,4];
      const componentImage=(item,index)=>`<label class="gre-field"><span>登记配图</span><select data-re-item-asset="${index}"><option value="">请选择登记素材</option>${Object.keys(window.DEMO_DATA?.assets||{}).filter(name=>name.startsWith('wiki-')||['guideHero','gtaIcon'].includes(name)).map(name=>`<option value="${E(name)}" ${name===item.cover?'selected':''}>${E(name.replace('wiki-','资料 · '))}</option>`).join('')}</select></label>${field('配图 URL / 登记素材名','item-cover-'+index,item.cover?.startsWith('data:')?'':item.cover)}<label class="gre-field"><span>本地配图（最大 2 MB）</span><input type="file" data-re-item-file="${index}" accept="image/png,image/jpeg,image/webp,image/gif"></label>${item.cover?`<div class="gre-image-state"><img src="${E(M().assetSrc(item.cover))}" alt="内容项配图"><button type="button" data-re-item-clear="${index}">移除配图</button></div>`:''}`;
      panel.innerHTML=`<div class="gre-panel-heading"><strong>共享入口组件</strong><button type="button" data-re-close aria-label="关闭组件面板">×</button></div><div class="gre-panel-grid"><label class="gre-field"><span>组件类型</span><select data-re-component-layout>${M().components().map(component=>`<option value="${component.id}" ${block.layout===component.id?'selected':''}>${E(component.label)}</option>`).join('')}</select></label>${field('组件标题','title',block.title)}${['portrait','landscape'].map(key=>`<label class="gre-field"><span>${key==='portrait'?'竖屏':'横屏'}每行</span><select data-re-component-column="${key}">${sizes.map(n=>`<option value="${n}" ${block.columns[key]===n?'selected':''}>${n} 个</option>`).join('')}</select></label>`).join('')}</div><div class="gre-component-items">${block.items.map((item,index)=>`<article>${field('展示标题','item-title-'+index,item.title)}<label class="gre-field"><span>点击跳转词条</span><select data-re-item-target="${index}"><option value="">请选择同区词条</option>${targets.map(target=>`<option value="${E(target.id)}" ${item.targetId===target.id?'selected':''}>${E(target.title)}</option>`).join('')}</select></label>${field('配图 URL / 登记素材名','item-cover-'+index,item.cover)}<div class="gre-item-actions"><button type="button" data-re-item-move="${index}|-1" ${index===0?'disabled':''}>↑</button><button type="button" data-re-item-move="${index}|1" ${index===block.items.length-1?'disabled':''}>↓</button><button type="button" data-re-item-delete="${index}">删除</button></div></article>`).join('')||'<p class="gre-note">暂无内容项，可添加同区词条入口。</p>'}</div><button type="button" data-re-item-add ${block.items.length>=24||!targets.length?'disabled':''}>＋ 添加内容项</button>${!targets.length?'<p class="gre-note">当前分区暂无其他词条，需先新建可跳转词条。</p>':''}<p class="gre-panel-error" data-re-panel-error role="alert"></p><div class="gre-panel-actions"><button type="button" data-re-close>取消</button><button type="button" data-re-component-apply>插入 / 应用组件</button></div>`;
      panel.querySelectorAll('[data-re-value^="item-cover-"]').forEach(input=>{const index=Number(input.dataset.reValue.slice('item-cover-'.length));const holder=input.closest('label');holder.outerHTML=componentImage(block.items[index],index);});
      const sync=()=>{block.title=panel.querySelector('[data-re-value="title"]').value;block.items.forEach((item,i)=>{item.title=panel.querySelector('[data-re-value="item-title-'+i+'"]').value;const value=panel.querySelector('[data-re-value="item-cover-'+i+'"]').value.trim();item.cover=value||(item.cover?.startsWith('data:')?item.cover:'');item.targetId=panel.querySelector('[data-re-item-target="'+i+'"]').value;});};
      panel.querySelectorAll('[data-re-item-asset]').forEach(select=>select.onchange=()=>{sync();block.items[Number(select.dataset.reItemAsset)].cover=select.value;renderComponentPanel();});
      panel.querySelectorAll('[data-re-item-file]').forEach(input=>input.onchange=()=>{
        const file=input.files?.[0];if(!file)return;sync();
        const error=M().moderationError(file.name);if(error||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>M().maxImageBytes){panelMessage(error||'请选择 2 MB 以内的 PNG、JPG、WebP 或 GIF 图片。');return;}
        const currentPanel=session.panelState,item=block.items[Number(input.dataset.reItemFile)],reader=new FileReader();reader.onload=()=>{if(session.panelState!==currentPanel||!block.items.includes(item))return;const result=M().registerImage(reader.result);if(!result.ok){panelMessage(result.message);return;}item.cover=reader.result;renderComponentPanel();};reader.onerror=()=>{if(session.panelState===currentPanel)panelMessage('图片读取失败，请重选。');};reader.readAsDataURL(file);
      });
      panel.querySelectorAll('[data-re-item-clear]').forEach(button=>button.onclick=()=>{sync();block.items[Number(button.dataset.reItemClear)].cover='';renderComponentPanel();});
      panel.querySelectorAll('[data-re-close]').forEach(button=>button.onclick=closePanel);
      panel.querySelector('[data-re-component-layout]').onchange=event=>{sync();block.layout=event.target.value;const max=block.layout==='banner'?1:block.layout==='image-left'?2:4;for(const key of ['portrait','landscape'])block.columns[key]=Math.min(max,block.columns[key]||1);renderComponentPanel();};
      panel.querySelectorAll('[data-re-component-column]').forEach(select=>select.onchange=()=>block.columns[select.dataset.reComponentColumn]=Number(select.value));
      panel.querySelector('[data-re-item-add]').onclick=()=>{sync();block.items.push({id:uid('item'),title:targets[0].title,cover:'',targetId:targets[0].id});renderComponentPanel();};
      panel.querySelectorAll('[data-re-item-delete]').forEach(button=>button.onclick=()=>{sync();block.items.splice(Number(button.dataset.reItemDelete),1);renderComponentPanel();});
      panel.querySelectorAll('[data-re-item-move]').forEach(button=>button.onclick=()=>{sync();const [i,d]=button.dataset.reItemMove.split('|').map(Number),to=i+d;[block.items[i],block.items[to]]=[block.items[to],block.items[i]];renderComponentPanel();});
      panel.querySelector('[data-re-component-apply]').onclick=()=>{sync();const error=M().moderationError(block)||block.items.map(item=>!item.title.trim()?'请填写内容项标题':!targets.some(target=>target.id===item.targetId)?'请选择同区其他词条':item.cover?M().imageError(item.cover):'').find(Boolean);if(error){panelMessage(error);return;}const index=record.blocks.findIndex(item=>item.id===block.id);if(index>=0){record.blocks[index]=clone(block);redraw('update-component');closePanel();}else insertBlock(clone(block));};
    }
    surface.oninput=()=>change();surface.onmouseup=remember;surface.onkeyup=remember;surface.onfocus=remember;
    surface.onpaste=event=>{if(!canEdit)return;event.preventDefault();document.execCommand('insertText',false,event.clipboardData?.getData('text/plain')||'');change('paste');};
    surface.ondrop=event=>event.preventDefault();
    editor.querySelectorAll('[data-re-action]').forEach(button=>{button.disabled=!canEdit;button.onmousedown=event=>{remember();event.preventDefault();};button.onclick=()=>{if(!canEdit)return;const action=button.dataset.reAction;if(['link','image','video','component'].includes(action)){showPanel(action);return;}restore();document.execCommand(action,false,null);change('format');};});
    editor.querySelector('[data-re-format]').onchange=event=>{if(!canEdit)return;restore();document.execCommand('formatBlock',false,event.target.value);change('heading');};
    editor.querySelector('[data-re-size]').onchange=event=>{if(!canEdit)return;restore();document.execCommand('fontSize',false,'7');surface.querySelectorAll('font[size="7"]').forEach(font=>{font.removeAttribute('size');font.style.fontSize=event.target.value+'px';});change('font-size');};
    source.oninput=()=>{if(canEdit)flushSource();};editor.querySelectorAll('[data-re-mode]').forEach(button=>button.onclick=()=>setMode(button.dataset.reMode));
    index();bindAtoms();
    const api={flush:()=>{if(draft.mode==='html'){const result=flushSource();return result.ok?record.blocks:null;}change('flush');return record.blocks;},error:()=>draft.error,mode:()=>draft.mode,setMode,focus:()=>draft.mode==='html'?source.focus():surface.focus(),destroy:()=>sessions.delete(editor)};
    session.api=api;sessions.set(editor,session);return api;
  }
  function flush(host=document){const editor=host.matches?.('.gre-editor')?host:host.querySelector?.('.gre-editor'),session=editor&&sessions.get(editor);if(!session)return {ok:true,blocks:[]};const blocks=session.api.flush();return {ok:blocks!==null,blocks:blocks||[],error:session.draft.error};}
  // A caller may append validated structured content after flushing this editor.
  // Keep HTML mode in sync when the studio re-renders the same draft object.
  function refreshSource(record){const draft=sourceDrafts.get(record);if(draft){draft.source=sourceHTML(record);draft.error='';}}
  GH.guideRichEditor=Object.freeze({render,bind,inlineFromDOM,sourceHTML,parseSource,flush,refreshSource,error:(host=document)=>{const editor=host.matches?.('.gre-editor')?host:host.querySelector?.('.gre-editor');return sessions.get(editor)?.draft.error||'';}});
})();
