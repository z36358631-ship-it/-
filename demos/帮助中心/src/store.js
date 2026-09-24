(function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const listeners = new Set();
  const languages = [
    {code:'zh',label:'简体中文'}, {code:'en',label:'English'}, {code:'ja',label:'日本語'},
    {code:'pt-BR',label:'Português (Brasil)'}, {code:'ru',label:'Русский'}, {code:'hi',label:'हिन्दी（印地语）'}
  ];
  const protocols=[{code:'android-official',label:'安卓官方包'},{code:'ios-official',label:'iOS官方包'},{code:'zhangyou-android',label:'盖世掌游安卓'},{code:'zhangyou-ios',label:'盖世掌游iOS'},{code:'harmony',label:'安卓鸿蒙渠道'},{code:'lenovo',label:'安卓联想渠道'},{code:'logitech',label:'安卓罗技渠道'},{code:'redmagic',label:'安卓红魔渠道'}];
  const defaultProtocols=['android-official','ios-official'];
  const languageCodes = languages.map(item => item.code);
  const defaults = {domestic:'zh',overseas:'en'};
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeLink = value => /^https:\/\/[^\s<>"']+$/i.test(String(value || '').trim());
  const safeImage = value => /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value || '');
  const safeVideo = value => /^data:video\/(?:mp4|webm|ogg);base64,[a-z0-9+/=\s]+$/i.test(value || '');
  function sanitize(html) {
    const template = document.createElement('template'); template.innerHTML = String(html || '');
    const permitted = new Set(['FONT','P','BR','H2','H3','STRONG','B','EM','I','U','UL','OL','LI','BLOCKQUOTE','A','IMG','VIDEO','DIV','SPAN']);
    function clean(node) {
      for (let child of [...node.childNodes]) {
        if (child.nodeType===3) continue;
        if (child.nodeType!==1 || ['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT'].includes(child.tagName)) { child.remove(); continue; }
        clean(child);
        if (!permitted.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
        const src=child.getAttribute('src'),href=child.getAttribute('href'),alt=child.getAttribute('alt');
        const fontAttr=child.getAttribute('size'), fontStyle=child.style.fontSize;
        if(child.tagName==='FONT'){const span=document.createElement('span');span.append(...child.childNodes);child.replaceWith(span);child=span;}
        [...child.attributes].forEach(attr=>child.removeAttribute(attr.name));
        if(child.tagName==='SPAN') { const match=String(fontStyle||'').match(/^(14|16|18|20|24)px$/i); if(match)child.setAttribute('style',`font-size:${match[1]}px`); }
        if(child.tagName==='A') { if(safeLink(href)){child.setAttribute('href',href.trim());child.setAttribute('target','_blank');child.setAttribute('rel','noopener noreferrer');} else child.replaceWith(...child.childNodes); }
        if(child.tagName==='IMG') { if(!safeImage(src)){child.remove();continue;} child.setAttribute('src',src);child.setAttribute('alt',alt||'文章配图'); }
        if(child.tagName==='VIDEO') { if(!safeVideo(src)){child.remove();continue;} child.setAttribute('src',src);child.setAttribute('controls','');child.setAttribute('playsinline','');child.setAttribute('preload','metadata'); }
        if(fontAttr && child.tagName==='SPAN' && !child.getAttribute('style')) { const map={1:'14px',2:'14px',3:'16px',4:'18px',5:'24px',6:'24px',7:'24px'};if(map[fontAttr])child.setAttribute('style',`font-size:${map[fontAttr]}`); }
      }
    }
    clean(template.content); return template.innerHTML;
  }
  const localeSet=(title,html='')=>Object.fromEntries(languageCodes.map(code=>[code,{title:code==='zh'?title:(code==='en'?title:''),...(html!==undefined?{html:code==='zh'?html:''}:{})}]));
  const seed={navs:[
    {id:'HC-N001',package:'domestic',zh:{title:'入门指南'},en:{title:'Getting started'},order:10},
    {id:'HC-N002',package:'domestic',zh:{title:'常见问题'},en:{title:'Frequently asked questions'},order:20},
    {id:'HC-ON001',package:'overseas',en:{title:'Getting started'},hi:{title:'शुरू करना'},zh:{title:''},order:10},
    {id:'HC-ON002',package:'overseas',en:{title:'Frequently asked questions'},hi:{title:'अक्सर पूछे जाने वाले प्रश्न'},zh:{title:''},order:20}
  ],docs:[
    {id:'HC-D001',package:'domestic',navId:'HC-N001',order:10,...localeSet('认识帮助中心','<h2>从这里开始</h2><p>这是一篇阅读演示文章，用于展示帮助中心的内容排版。</p><p>你可以在目录分组下选择文章，阅读文字、图片与视频。</p><ol><li>浏览目录分组。</li><li>在分组下选择一篇文章。</li></ol>')},
    {id:'HC-D002',package:'domestic',navId:'HC-N001',order:20,...localeSet('图文与视频阅读示例','<h2>文字与图片</h2><p>以下配图演示正文中的图片展示效果。</p><p>[[DEMO_IMAGE]]</p><h2>视频演示</h2><p>点击播放，视频不会自动播放。</p><p>[[DEMO_VIDEO]]</p>')},
    {id:'HC-D003',package:'domestic',navId:'HC-N002',order:10,...localeSet('如何浏览文章？','<h2>按目录阅读</h2><p>在目录分组下选择一篇文章，点击标题查看正文。</p>')},
    {id:'HC-D004',package:'domestic',navId:'HC-N002',order:20,...localeSet('如何观看正文视频？','<h2>点击播放</h2><p>含视频的文章会显示播放器，点击后可暂停或拖动进度。</p>')},
    {id:'HC-OD001',package:'overseas',navId:'HC-ON001',order:10,...localeSet('Welcome to the Help Center','<h2>Start here</h2><p>This sample explains how to browse articles under a category heading.</p>')},
    {id:'HC-OD002',package:'overseas',navId:'HC-ON001',order:20,...localeSet('Reading images and videos','<h2>Media example</h2><p>Press play to watch the sample. It does not autoplay.</p>')},
    {id:'HC-OD003',package:'overseas',navId:'HC-ON002',order:10,...localeSet('How do I browse articles?','<h2>Browse by category</h2><p>Select an article title under a category heading.</p>')},
    {id:'HC-OD004',package:'overseas',navId:'HC-ON002',order:20,...localeSet('How do I watch a video?','<h2>Press play</h2><p>Video articles contain controls and do not autoplay.</p>')}
  ]};
  const englishTitles=['Welcome to the Help Center','Reading images and videos','How do I browse articles?','How do I watch a video?'];
  const englishBodies=['<h2>Start here</h2><p>Select an article under a category heading to read it.</p>','<h2>Media example</h2><p>[[DEMO_IMAGE]]</p><p>Press play to watch the sample. It does not autoplay.</p><p>[[DEMO_VIDEO]]</p>','<h2>Browse by category</h2><p>Select an article title under a category heading.</p>','<h2>Press play</h2><p>Video articles contain playback controls. Videos do not autoplay.</p>'];
  const hindiTitles=['सहायता केंद्र में आपका स्वागत है','चित्र और वीडियो पढ़ना','लेख कैसे पढ़ें?','वीडियो कैसे देखें?'];
  const hindiBodies=['<h2>यहाँ से शुरू करें</h2><p>पढ़ने के लिए किसी श्रेणी के अंतर्गत एक लेख चुनें। यह सामग्री केवल नमूना है।</p>','<h2>चित्र और वीडियो का नमूना</h2><p>[[DEMO_IMAGE]]</p><p>वीडियो देखने के लिए प्ले दबाएँ। वीडियो अपने आप नहीं चलता।</p><p>[[DEMO_VIDEO]]</p>','<h2>श्रेणी के अनुसार पढ़ें</h2><p>लेख पढ़ने के लिए श्रेणी के अंतर्गत उसके शीर्षक पर क्लिक करें।</p>','<h2>प्ले दबाएँ</h2><p>वीडियो देखने के लिए प्ले दबाएँ। नियंत्रणों से वीडियो रोकें या आगे बढ़ाएँ।</p>'];
  for(const nav of seed.navs)for(const code of languageCodes)nav[code] ||= {title:''};
  seed.docs.forEach((doc,index)=>{doc.protocols=[...defaultProtocols];doc.en={title:englishTitles[index%4],html:englishBodies[index%4]};if(doc.package==='overseas'){doc.zh={title:'',html:''};doc.hi={title:hindiTitles[index%4],html:hindiBodies[index%4]};}});
  const ownedPackages=new Map([...seed.navs,...seed.docs].map(item=>[item.id,item.package]));
  const hasBody=html=>{const element=document.createElement('div');element.innerHTML=sanitize(html);return !!(element.textContent.trim()||element.querySelector('img,video'));};
  const validOrder=value=>Number.isInteger(Number(value))&&String(value).trim()!==''&&Number(value)>=0&&Number(value)<=999999;
  const store={draft:clone(seed),published:clone(seed),languages,protocols,pendingMedia:new Set(),escape,sanitize,safeLink,
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},notify(){listeners.forEach(fn=>fn(store));},
    get(type,id){return store.draft[type].find(item=>item.id===id);},
    locale(item,language){const code=language||defaults[item?.package]||'zh';return item?.[code]?.title?.trim()?item[code]:item?.[defaults[item?.package]||'zh']||{title:'',html:''};},
    visible(item,pack,protocol='android-official'){if(!item||item.package!==pack)return false;if(Object.prototype.hasOwnProperty.call(item,'navId')&&(!Array.isArray(item.protocols)||!item.protocols.includes(protocol)))return false;return true;},
    status(type,id){const draft=store.get(type,id),live=store.published[type].find(item=>item.id===id);const content=value=>{const copy=clone(value);delete copy.order;return JSON.stringify(copy);};return !live?'草稿':content(draft)===content(live)?'已发布':'有未发布修改';},
    update(type,id,changes){const item=store.get(type,id);if(!item)return '内容不存在。';if(changes.package&&changes.package!==ownedPackages.get(id))return '内容包创建后不可更改。';if(type==='docs'&&changes.navId&&store.get('navs',changes.navId)?.package!==item.package)return '不能跨包迁移文章。';Object.assign(item,changes);store.notify();return '';},
    create(type,pack='domestic'){if(!defaults[pack])throw new Error('无效的内容包。');const number=++serial;const prefix=pack==='overseas'?'O':'';const item={id:`HC-${prefix}${type==='navs'?'N':'D'}${String(number).padStart(3,'0')}`,package:pack,order:Math.min(999999,Math.max(0,...store.draft[type].filter(row=>row.package===pack).map(row=>row.order))+10)};if(type==='docs'){item.navId=store.draft.navs.filter(nav=>nav.package===pack).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))[0]?.id||'';item.order=Math.min(999999,Math.max(0,...store.draft.docs.filter(doc=>doc.navId===item.navId).map(doc=>doc.order))+10);item.protocols=[...defaultProtocols];}languageCodes.forEach(code=>{item[code]={title:'',...(type==='docs'?{html:''}:{})};});ownedPackages.set(item.id,pack);store.draft[type].push(item);store.notify();return item;},
    validate(type,id){
      const item=store.get(type,id);if(!item)return '内容不存在。';
      if(item.package!==ownedPackages.get(id))return '内容包创建后不可更改。';
      if(!validOrder(item.order))return '排序权重必须为 0–999999 的整数。';
      if(type==='docs'&&store.pendingMedia.has(id))return '请等待该文档的媒体处理完成后再发布。';
      for(const {code,label} of languages){const locale=item[code]||{};const title=String(locale.title||'').trim(),body=type==='docs'&&hasBody(locale.html||'');
        if(code===defaults[item.package]&&(!title||(type==='docs'&&!body)))return `请完善默认语言${label}内容。`;
        if(type==='docs'&&!!title!==!!body)return `${label}需要同时填写标题和正文，或全部清空。`;
      }
      if(type==='docs'){
        if(!Array.isArray(item.protocols)||!item.protocols.length)return '请至少选择一个 APP协议。';
        if(item.protocols.some(code=>!protocols.some(protocol=>protocol.code===code)))return 'APP协议包含未知配置，请重新选择。';
        if(store.get('navs',item.navId)?.package!==item.package)return '不能跨包迁移文章。';
        if(!store.published.navs.some(nav=>nav.id===item.navId&&nav.package===item.package))return '请先发布所属导航，再发布子文档。';
      }
      return '';
    },
    publish(type,id){const error=store.validate(type,id);if(error)return error;const item=clone(store.get(type,id));if(type==='docs')languageCodes.forEach(code=>{if(item[code])item[code].html=sanitize(item[code].html||'');});const index=store.published[type].findIndex(row=>row.id===id);if(index<0)store.published[type].push(item);else store.published[type][index]=item;Object.assign(store.get(type,id),clone(item));store.notify();return'';},
    remove(type,id){if(type==='navs'&&[...store.draft.docs,...store.published.docs].some(doc=>doc.navId===id))return'该导航仍有关联子文档，请先迁移并发布或删除子文档。';store.draft[type]=store.draft[type].filter(item=>item.id!==id);store.published[type]=store.published[type].filter(item=>item.id!==id);store.notify();return'';},
    setOrder(type,id,value){const item=store.get(type,id);if(!item)return '内容不存在。';if(!validOrder(value))return '排序权重必须为 0–999999 的整数。';item.order=Number(value);const live=store.published[type].find(row=>row.id===id);if(live)live.order=item.order;store.notify();return '';},
    move(type,id,direction){const item=store.get(type,id),group=store.draft[type].filter(row=>row.package===item.package&&(type==='navs'||row.navId===item.navId)).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));const index=group.findIndex(row=>row.id===id),target=index+direction;if(target<0||target>=group.length)return;const other=group[target];if(item.order===other.order)return '权重相同，请编辑排序权重。';const old=item.order;store.setOrder(type,id,other.order);store.setOrder(type,other.id,old);return '';},
    setDemoMedia(image,video){if(typeof image==='object'&&image){video=image.video;image=image.image;}const imageHtml=safeImage(image)?`<img src="${image}" alt="图文阅读示例">`:'',videoHtml=safeVideo(video)?`<video src="${video}" controls playsinline preload="metadata"></video>`:'';for(const state of [store.draft,store.published])for(const doc of state.docs)for(const code of languageCodes){if(imageHtml&&doc[code])doc[code].html=String(doc[code].html||'').replace('[[DEMO_IMAGE]]',imageHtml);if(videoHtml&&doc[code])doc[code].html=String(doc[code].html||'').replace('[[DEMO_VIDEO]]',videoHtml);}store.notify();}
  };
  let serial=10;window.HelpStore=store;store.setDemoMedia(window.HELP_DEMO_IMAGE,window.HELP_DEMO_VIDEO);
})();
