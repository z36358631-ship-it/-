(function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const listeners = new Set();
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeLink = value => /^https:\/\/[^\s<>"']+$/i.test(String(value || '').trim());
  const safeImage = value => /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value || '');
  const safeVideo = value => /^data:video\/(?:mp4|webm|ogg);base64,[a-z0-9+/=\s]+$/i.test(value || '');
  function sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const permitted = new Set(['P','BR','H2','H3','STRONG','B','EM','I','U','UL','OL','LI','BLOCKQUOTE','A','IMG','VIDEO','DIV']);
    function clean(node) {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) continue;
        if (child.nodeType !== 1) { child.remove(); continue; }
        if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT'].includes(child.tagName)) { child.remove(); continue; }
        clean(child);
        if (!permitted.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
        const src = child.getAttribute('src'), href = child.getAttribute('href'), alt = child.getAttribute('alt');
        [...child.attributes].forEach(attr => child.removeAttribute(attr.name));
        if (child.tagName === 'A') {
          if (safeLink(href)) { child.setAttribute('href', href.trim()); child.setAttribute('target','_blank'); child.setAttribute('rel','noopener noreferrer'); }
          else child.replaceWith(...child.childNodes);
        }
        if (child.tagName === 'IMG') {
          if (!safeImage(src)) { child.remove(); continue; }
          child.setAttribute('src',src); child.setAttribute('alt',alt || '文章配图');
        }
        if (child.tagName === 'VIDEO') {
          if (!safeVideo(src)) { child.remove(); continue; }
          child.setAttribute('src',src); child.setAttribute('controls',''); child.setAttribute('playsinline',''); child.setAttribute('preload','metadata');
        }
      }
    }
    clean(template.content);
    return template.innerHTML;
  }
  const seed = {
    navs: [
      {id:'HC-N001',zh:{title:'入门指南'},en:{title:'Getting started'},order:10},
      {id:'HC-N002',zh:{title:'常见问题'},en:{title:'Frequently asked questions'},order:20}
    ],
    docs: [
      {id:'HC-D001',navId:'HC-N001',order:10,zh:{title:'认识帮助中心',html:'<h2>从这里开始</h2><p>这是一篇阅读演示文章，用于展示帮助中心的内容排版。</p><p>你可以在目录分组下选择文章，阅读文字、图片与视频。</p><h2>找到想看的内容</h2><ol><li>浏览目录分组。</li><li>在分组下选择一篇文章。</li><li>阅读完成后返回文章列表。</li></ol>'},en:{title:'Welcome to the Help Center',html:'<h2>Start here</h2><p>This sample article demonstrates the Help Center reading layout.</p><p>Choose an article under a category heading to read text, images and videos.</p><ol><li>Browse category headings.</li><li>Select an article under a heading.</li><li>Return to the list after reading.</li></ol>'}},
      {id:'HC-D002',navId:'HC-N001',order:20,zh:{title:'图文与视频阅读示例',html:'<h2>文字与图片</h2><p>以下配图演示正文中的图片展示效果。</p><p>[[DEMO_IMAGE]]</p><h2>视频演示</h2><p>点击播放，查看这段阅读演示视频。视频不会自动播放。</p><p>[[DEMO_VIDEO]]</p><p>以上内容仅供原型演示，不代表具体功能操作指南。</p>'},en:{title:'Reading images and videos',html:'<h2>Text and images</h2><p>The image below demonstrates inline article media.</p><p>[[DEMO_IMAGE]]</p><h2>Video example</h2><p>Press play to watch this sample. It does not play automatically.</p><p>[[DEMO_VIDEO]]</p><p>This content is for prototype demonstration only.</p>'}},
      {id:'HC-D003',navId:'HC-N002',order:10,zh:{title:'如何浏览文章？',html:'<h2>按目录阅读</h2><p>在目录分组下选择一篇文章，点击标题查看正文。</p><p>此文用于演示常见问题的短文阅读，不包含实际业务政策。</p>'},en:{title:'How do I browse articles?',html:'<h2>Browse by category</h2><p>Select an article title under a category heading to read it.</p><p>This sample demonstrates short FAQ content and does not state product policies.</p>'}},
      {id:'HC-D004',navId:'HC-N002',order:20,zh:{title:'如何观看正文视频？',html:'<h2>点击播放</h2><p>含视频的文章会显示播放器。点击播放后，可暂停或拖动进度。</p><p>你可以前往「图文与视频阅读示例」体验播放效果。</p>'},en:{title:'How do I watch an article video?',html:'<h2>Press play</h2><p>Video articles contain a player. Press play, then pause or seek using the controls.</p><p>Open “Reading images and videos” to try the sample.</p>'}}
    ]
  };
  const store = {draft:clone(seed),published:clone(seed),pendingMedia:new Set(),escape,sanitize,safeLink,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    notify() { listeners.forEach(fn => fn(store)); },
    get(type,id) { return store.draft[type].find(item => item.id === id); },
    status(type,id) { const draft=store.get(type,id),live=store.published[type].find(item=>item.id===id); const content=value=>{const copy=clone(value);delete copy.order;return JSON.stringify(copy);}; return !live?'草稿':content(draft)===content(live)?'已发布':'有未发布修改'; },
    update(type,id,changes) { Object.assign(store.get(type,id),changes); store.notify(); },
    create(type) {
      const number = ++serial;
      const item = {id:`HC-${type==='navs'?'N':'D'}${String(number).padStart(3,'0')}`,zh:{title:''},en:{title:''},order:Math.max(0,...store.draft[type].map(row=>row.order))+10};
      if(type==='docs') { item.navId=store.draft.navs[0]?.id || ''; item.zh.html='<p><br></p>'; item.en.html='<p><br></p>'; }
      store.draft[type].push(item); store.notify(); return item;
    },
    validate(type,id) {
      const item=store.get(type,id); if(!item) return '内容不存在。';
      if(type==='docs'&&store.pendingMedia.has(id)) return '请等待该文档的媒体处理完成后再发布。';
      for(const language of ['zh','en']) {
        if(!item[language].title.trim()) return `请填写${language==='zh'?'中文':'English'}标题。`;
        if(type==='docs') { const el=document.createElement('div'); el.innerHTML=sanitize(item[language].html); if(!el.textContent.trim()&&!el.querySelector('img,video')) return `请填写${language==='zh'?'中文':'English'}正文。`; }
      }
      if(type==='docs'&&!store.published.navs.some(nav=>nav.id===item.navId)) return '请先发布所属导航，再发布子文档。';
      return '';
    },
    publish(type,id) {
      const error=store.validate(type,id); if(error) return error;
      const item=clone(store.get(type,id));
      if(type==='docs') ['zh','en'].forEach(lang=>{item[lang].html=sanitize(item[lang].html);});
      const index=store.published[type].findIndex(row=>row.id===id);
      if(index<0) store.published[type].push(item); else store.published[type][index]=item;
      Object.assign(store.get(type,id),clone(item)); syncOrder(type,item.navId); store.notify(); return '';
    },
    remove(type,id) {
      if(type==='navs'&&[...store.draft.docs,...store.published.docs].some(doc=>doc.navId===id)) return '该导航仍有关联子文档，请先迁移并发布或删除子文档。';
      store.draft[type]=store.draft[type].filter(item=>item.id!==id); store.published[type]=store.published[type].filter(item=>item.id!==id); store.notify(); return '';
    },
    move(type,id,direction) {
      const item=store.get(type,id),group=store.draft[type].filter(row=>type==='navs'||row.navId===item.navId).sort((a,b)=>a.order-b.order);
      const index=group.indexOf(item),target=index+direction; if(target<0||target>=group.length) return;
      group.splice(index,1); group.splice(target,0,item);
      const before=group[target-1]?.order,after=group[target+1]?.order;
      item.order=before===undefined?after-10:after===undefined?before+10:(before+after)/2;
      syncOrder(type,item.navId);
      store.notify();
    },
    setDemoMedia(image,video) {
      if(typeof image==='object'&&image) { video=image.video; image=image.image; }
      const imageHtml=safeImage(image)?`<img src="${image}" alt="图文阅读示例">`:'',videoHtml=safeVideo(video)?`<video src="${video}" controls playsinline preload="metadata"></video>`:'';
      for(const state of [store.draft,store.published]) for(const doc of state.docs) for(const lang of ['zh','en']) { if(imageHtml) doc[lang].html=doc[lang].html.replace('[[DEMO_IMAGE]]',imageHtml); if(videoHtml) doc[lang].html=doc[lang].html.replace('[[DEMO_VIDEO]]',videoHtml); }
      store.notify();
    }
  };
  function syncOrder(type,navId) {
    const rows=store.published[type].filter(row=>type==='navs'||row.navId===navId);
    const effectiveOrder=row=>{const draft=store.get(type,row.id);return draft&&(type==='navs'||draft.navId===row.navId)?draft.order:row.order;};
    rows.sort((a,b)=>effectiveOrder(a)-effectiveOrder(b)||a.id.localeCompare(b.id));
    rows.forEach((row,index)=>{row.order=(index+1)*10;});
  }
  let serial=10;
  window.HelpStore=store;
  store.setDemoMedia(window.HELP_DEMO_IMAGE,window.HELP_DEMO_VIDEO);
})();
