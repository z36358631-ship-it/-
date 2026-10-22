(function () {
  'use strict';
  const GH = window.GH;
  // Shared by the current reader, homepage entries and editor previews.
  GH.guideComponentRender=function(component,{preview=false,orientation=GH.orientation,recordId='',showTitle=true,allowPosts=false,allowSections=false,tabId=''}={}){
    const store=GH.guideStore,escape=value=>GH.esc(String(value??''));
    const layouts=['shortcuts','text','image-top','image-left','banner'];
    const layout=layouts.includes(component?.layout)?component.layout:'image-top';
    const columns=component?.columns||{},limit=layout==='banner'?1:layout==='image-left'?2:4;
    const count=direction=>Math.max(1,Math.min(limit,Math.floor(Number(columns[direction])||1)));
    const direction=orientation==='landscape'?'landscape':'portrait',textList=layout==='text'&&count(direction)===1;
    const context=store?.context?.()||{region:'mainland',sectionId:'gta5'};
    const rows=(component?.items||[]).filter(item=>item&&(item.targetType==='external'||typeof item.targetId==='string'&&item.targetId!==recordId)).map(item=>{
      if(item.targetType==='external')return !store?.linkError(item.url)?{item,target:{id:item.id,title:item.title,url:item.url},kind:'external'}:null;
      if(allowSections&&item.targetType==='section'){const section=store?.sections().find(section=>section.id===item.targetId&&section.visible!==false);return section?{item,target:section,kind:'section'}:null;}
      const target=store?.get(item.targetId);
      if(target&&(!store.inContext||store.inContext(target)))return {item,target,kind:'record'};
      const post=allowPosts&&context.region==='mainland'&&context.sectionId==='gta5'&&GH.guidePosts?.get(item.targetId);
      return post?{item,target:post,kind:'post'}:null;
    }).filter(Boolean);
    const grid=`<div class="gr-config-entries gr-layout-${layout}" data-gr-layout="${layout}" ${tabId?`data-gr-tab-entries="${escape(tabId)}"`:''} data-gr-columns="${count(direction)}" data-gr-columns-portrait="${count('portrait')}" data-gr-columns-landscape="${count('landscape')}" style="--gr-columns-portrait:${count('portrait')};--gr-columns-landscape:${count('landscape')}">${rows.map(({item,target,kind})=>{
      const title=String(item.title||target.title||''),src=store.assetSrc?.(item.cover)||'';
      const picture=src?`<img class="${layout==='shortcuts'?'':'gr-config-image'}" src="${escape(src)}" alt="${escape(title)}" loading="lazy">`:'<div class="gr-no-photo">暂无对应资料图片</div>';
      const external=kind==='external',tag=external?'a':'button';
      const action=preview?'tabindex="-1" aria-disabled="true"':external?`href="${escape(target.url)}" target="_blank" rel="noopener noreferrer" data-gr-external`:kind==='section'?`data-gr-category="${escape(target.id)}"`:kind==='post'?`data-gr-post="${escape(target.id)}"`:`data-guide-open="${escape(target.id)}"`;
      return `<${tag} ${external?'':'type="button"'} class="gr-config-entry" data-gr-entry="${escape(target.id)}" data-gr-component-item="${escape(item.id||target.id)}" ${action} aria-label="${escape(title)}">${layout==='shortcuts'?`<span class="gr-category-image">${picture}</span>`:layout==='text'?'':picture}${textList?'<span class="gr-text-list-dot" aria-hidden="true"></span>':''}<span class="gr-config-copy"><strong>${escape(title)}</strong></span>${layout==='banner'?'<span class="gr-banner-arrow" aria-hidden="true">›</span>':textList?'<span class="gr-text-list-arrow" aria-hidden="true">›</span>':''}</${tag}>`;
    }).join('')||'<div class="gr-empty" data-gr-empty="entries">暂时没有收录内容</div>'}</div>`;
    return showTitle?`<section class="gr-inline-component" data-gr-component="${escape(component?.id||'')}">${component?.title?`<h2>${escape(component.title)}</h2>`:''}${grid}</section>`:grid;
  };
  let title = 'GTA5 增强版小白入坑指南';
  const original = '先确认游戏版本\n本条目适用于 GTA V 增强版的 Online 模式。传承版和故事模式请先确认对应说明，不直接套用本条目的步骤。\n\n进入线上模式\n先完成游戏内的新手引导，再根据当前任务提示继续游玩。遇到无法进入游戏的问题，请在求助区说明版本与报错。\n\n第一次创建角色\n创建前先确认所选角色和游戏模式。涉及角色资产的操作，执行前请阅读游戏内提示。';
  const extra = '\n\n补充：切换模式前先保存\n从故事模式切换前，先确认已完成当前进度的保存，再返回菜单选择 Online。两种模式的任务进度分别查看。';
  const suggested = original + extra;
  const documentSeeds = [
    { id: 'beginner', title: 'GTA5 增强版小白入坑指南', category: 'intro', alias: '新手 入门 角色 Online', summary: '版本确认、线上入门与角色创建，从第一步开始。', body: original },
    { id: 'versions', title: '版本与模式说明', category: 'intro', alias: '传承版 增强版 故事模式 Online', summary: '先区分增强版、传承版与游玩模式，再查找对应内容。', body: '确认游戏版本\n打开游戏前，先确认当前使用增强版还是传承版。查找攻略时，同时核对平台与版本。\n\n区分故事与线上\n故事模式与 Online 使用不同的任务和进度。请按当前模式查找攻略。\n\n求助时提供信息\n遇到问题时，说明版本、模式、平台与报错内容，方便其他玩家判断。' },
    { id: 'online', title: '线上任务入门', category: 'online', alias: '任务 差事 新手 引导', summary: '完成新手引导，按游戏提示熟悉任务与地图。', body: '完成新手引导\n首次进入线上模式时，先完成游戏提供的新手引导。\n\n查看任务提示\n打开任务菜单，阅读参与人数、任务要求和当前提示。不同任务的开启条件可能不同。\n\n组队前先沟通\n与其他玩家组队前，先确认目标任务和适用版本。卡住时可在求助区描述当前步骤。' },
    { id: 'vehicles', title: '载具使用基础', category: 'vehicles', alias: '车辆 载具 车库', summary: '确认可用载具，按任务要求选择并管理车辆。', body: '确认可用载具\n先查看当前角色拥有和可使用的载具，再根据任务提示选择。\n\n任务中的限制\n部分任务对载具和参与方式有单独要求，以游戏内说明为准。\n\n结束任务后\n离开任务前，确认当前进度和载具状态；涉及资产变更时仔细阅读提示。' },
    { id: 'weekly', title: '2026.10.15 周报', category: 'weekly', alias: '周报 轮换 每周 更新', summary: '轮换活动的查看方法与版本核对提醒。', body: '本周轮换内容\n每周轮换内容以游戏内当前活动说明为准。查阅旧周报时，请先核对日期。\n\n领取与参与条件\n活动可能包含不同的参与和领取条件，操作前阅读游戏内提示。\n\n过期内容\n历史周报保留供查阅；过期内容不作为当前可领取或可参与的保证。' },
    { id: 'help', title: '常用问题与检索', category: 'intro', alias: '常见 问题 搜索 报错', summary: '用版本、任务名或报错关键词定位需要的说明。', body: '先用关键词检索\n可用任务名、模式或关键词查找词条；组合关键词可以缩小范围。\n\n没找到需要的内容\n换用较短的关键词，或切换到全部分类。如果仍未解决，可在求助区说明现象。\n\n发现内容有误\n先核对适用版本和上下文，再补充或更正已有词条，保留仍然有效的内容。' }
  ];
  documentSeeds.push(
    { id: 'rotation', title: '其他轮换内容', category: 'weekly', alias: '轮换 车行 厢型车', summary: '核对轮换日期和游戏内当期说明。', body: '查看轮换日期\n先核对当期轮换日期，再查看车行与厢型车内容。本文为门户结构演示样例。\n\n车行\n不同版本可售内容可能不同，购买前请核对游戏内车型和价格。\n\n其他轮换项目\n回收站抢劫、重点档案及挑战按游戏内当期提示查看。' },
    { id: 'gta-plus', title: 'GTA+ 每月福利', category: 'weekly', alias: 'GTA+ 月度 订阅', summary: '核对适用平台和当期福利。', body: '核对当期内容\n订阅内容存在日期和平台限制。本文仅作百科入口样例，不表示任何权益可领取。\n\n适用范围\n请在游戏官方说明中核对平台、版本和有效期。' },
    { id: 'updates', title: '版本更新一览', category: 'weekly', alias: '更新 历史 版本', summary: '按版本查找更新资料。', body: '版本更新一览\n查询更新资料前，请先确认当前客户端版本和平台。\n\n历史内容\n历史资料保留供对照；版本差异以实际游戏为准。' }
  );
  const entryCategories = [{ id: 'all', label: '全部' }, { id: 'intro', label: '新手入门' }, { id: 'online', label: '线上任务' }, { id: 'vehicles', label: '载具' }, { id: 'weekly', label: '轮换周报' }];
  const esc = value => GH.esc(String(value == null ? '' : value));
  let s;
  function reset() {
    title = documentSeeds[0].title;
    s = { view: 'list', tab: '攻略', current: 3, body: original, draft: original, summary: '', base: 3, baseBody: original,
      conflictDraft: null, error: '', status: '', checked: false,
      failNext: false, permission: true, available: true, empty: false, joined: false, jump: null, catalogScroll: 0, restoreCatalog: false,
      versions: [{ n: 3, body: original, author: '洛圣都攻略组', note: '补充适用版本与模式', time: '今天 10:24' },
        { n: 2, body: original.split('\n\n').slice(0, 2).join('\n\n'), author: '入门整理组', note: '整理新手入门步骤', time: '昨天 18:40' }], selectedVersion: 3,
      siteFavorite: false, assetsTab: '总览', editMode: false, articleTab: 'article', favorites: [], origin: 'list', searchBack: 'list', searchScroll: 0, hubTab: 'contribution', historyOrigin: 'read', selectedSnapshot: null, activeAnchor: 'community', welcomeTab: '入坑指南', lookupTab: '线上任务', infoKey: 'editor', infoOrigin: 'list', entryId: 'beginner', query: '', entryCategory: 'all', articleScroll: 0, documents: documentSeeds.map((doc, index) => ({ ...doc, current: 3, status: '', versions: index === 0 ? null : [{ n: 3, body: doc.body, author: '百科整理组', note: '核对适用范围与阅读说明', time: '今天 10:24' }, { n: 2, body: doc.body.split('\n\n').slice(0, 2).join('\n\n'), author: '百科整理组', note: '整理基础说明', time: '昨天 18:40' }] })) };
    for (const doc of s.documents) for (const v of doc.versions || s.versions) {
      v.timestamp = Date.parse(v.n===3 ? '2026-10-19T10:24:00+08:00' : '2026-10-18T18:40:00+08:00');
      v.time = formatTime(v.timestamp);
    }
    syncDocument();
  }
  function formatTime(timestamp) {
    return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(timestamp));
  }
  reset();
  function syncDocument() {
    const doc = s.documents.find(doc => doc.id === s.entryId);
    if (doc) Object.assign(doc, { current: s.current, body: s.body, versions: s.versions, status: s.status === 'saved' ? 'saved' : '' });
  }
  function openDocument(id) {
    syncDocument();
    const doc = s.documents.find(doc => doc.id === id);
    if (!doc) return;
    title = doc.title;
    Object.assign(s, { entryId: id, current: doc.current, body: doc.body, versions: doc.versions, status: doc.status, conflictDraft: null, draft: doc.body, summary: '', base: doc.current, baseBody: doc.body, error: '', selectedVersion: doc.current, view: 'read', articleTab: 'article', articleScroll: 0, jump: 'top', savedDraft: null });
  }
  function refresh() { syncDocument(); GH.render(); }
  function icon(name, size) { return GH.icon(name, size || 20); }
  function scopeLabels() {
    return ({ beginner: ['增强版', 'Online 模式', 'PC'], versions: ['增强版 / 传承版', '故事 / 线上', '版本核对'], online: ['Online 模式', '任务入门', '版本核对'], vehicles: ['载具基础', '版本核对'], weekly: ['历史周报', '2026.10.15', '时效核对'], help: ['常见问题', '版本核对'] })[s.entryId] || ['适用范围待核对'];
  }
  function avatar(name) { return `<img class="avatar guide-avatar" src="${GH.asset(name)}" alt="">`; }
  function button(action, label, klass, extraAttrs) {
    return `<button type="button" class="${klass || 'secondary'}" data-guide-action="${action}" ${extraAttrs || ''}>${label}</button>`;
  }
  function contextCard(compact) {
    return `<section class="guide-game ${compact ? 'guide-game-compact' : ''}" data-component-id="D-GAME-CARD"><div class="guide-game-head"><img src="${GH.asset('gtaIcon')}" class="guide-game-icon" alt="GTA 5"><strong>GTA 5</strong>${button('join', s.joined ? '已加入' : '加入', s.joined ? 'secondary guide-join' : 'primary guide-join')}</div><p>洛圣都不缺故事，任务、线上、载具、差事和自由整活都在这里。</p></section>`;
  }
  function communityHeader() {
    return `<header class="guide-community-header"><div class="guide-community-titles"><span>关注</span><strong>游戏圈</strong></div><div class="guide-header-tools"><span class="guide-source-icon">${icon('search', 23)}</span><span class="guide-source-icon">${icon('bell', 23)}</span><span class="guide-source-icon">${icon('device', 23)}</span></div></header><div class="guide-game-tabs"><span>全部</span><strong>GTA 5</strong><span>Steam</span><span class="guide-last-game">黑神话：悟空</span></div>`;
  }
  function tabs() {
    return `<nav class="guide-content-tabs" aria-label="GTA5 内容分类" data-component-id="C-TAB">${['综合', '精选', '攻略', '求助'].map(t => `<button type="button" class="guide-content-tab ${s.tab === t ? 'guide-selected' : ''}" data-guide-tab="${t}" aria-current="${s.tab === t ? 'page' : 'false'}">${t}</button>`).join('')}</nav>`;
  }
  function sections(value = s.body) {
    return value.split(/\n\s*\n/).filter(block => block.trim()).map((block, index) => {
      const lines = block.trim().split('\n');
      const heading = lines.shift();
      return {index, heading, body: lines.join('\n')};
    });
  }
  function chapterButton(section, context) {
    return `<button type="button" class="guide-chapter-link ${context === 'toc' ? 'guide-toc-link' : ''}" data-guide-section="${section.index}" data-guide-entry="${context}" aria-label="跳转到${esc(section.heading)}"><span class="guide-chapter-number">${String(section.index + 1).padStart(2, '0')}</span><span class="guide-chapter-copy"><strong>${esc(section.heading)}</strong>${context === 'catalog' ? `<small>${esc(section.body)}</small>` : ''}</span><span class="guide-chapter-arrow" aria-hidden="true">›</span></button>`;
  }
  const portalSections = [['community', '社区答疑'], ['rotation', '轮换内容'], ['welcome', '欢迎来到洛圣都'], ['lookup', '常用检索'], ['assets','资产与生意']];
  function entryLink(id, label, klass) {
    const doc = s.documents.find(d => d.id === id);
    return `<button type="button" class="${klass || 'guide-wiki-link'}" data-guide-entry-id="${id}">${esc(label || doc.title)}<span aria-hidden="true">›</span></button>`;
  }
  function portalBanner(id, label, subtitle, media) {
    return `<button type="button" class="guide-wiki-banner" data-guide-entry-id="${id}"><img src="${GH.asset(media)}" alt=""><span><strong>${label}</strong><small>${subtitle}</small></span><b aria-hidden="true">›</b></button>`;
  }
  function portalGrid(items) {
    const direct = {online:'online', vehicle:'vehicles'};
    return `<div class="guide-wiki-triple guide-wiki-six">${items.map(([id,label])=>`<button type="button" ${direct[id]?`data-guide-entry-id="${direct[id]}"`:`data-guide-info="${id}"`}><img src="${GH.asset('wiki-'+id)}" alt="游戏资料配图"><span>${label}</span></button>`).join('')}</div>`;
  }
  function sharedCard() {
    syncDocument();
    return `<section class="guide-wiki-portal" data-guide-catalog data-component-id="D-WIKI-DIRECTORY">
      <div class="guide-wiki-tools"><div class="guide-wiki-search-row">${button('search', `${icon('search',18)}<span>在 GTA 5 百科中搜索</span>`, 'guide-wiki-search-entry')}${button('site-favorite', `${icon('save',18)}${s.siteFavorite?'已收藏':'收藏'}`, 'guide-wiki-tool', `aria-pressed="${s.siteFavorite}"`)}</div><div class="guide-wiki-tool-row">${button('edit-mode', s.editMode ? '退出编辑 ×' : '编辑模式 ›', 'guide-wiki-tool', `aria-pressed="${s.editMode}"`)}${button('contributions','贡献榜 ›','guide-wiki-tool')}${button('editor-info','成为精编 ›','guide-wiki-tool')}</div></div>
      <h2 class="guide-wiki-list-head">攻略资料</h2>
      <div class="guide-wiki-entries">${s.documents.map(doc=>`<button type="button" class="guide-search-result" data-guide-entry-id="${esc(doc.id)}"><strong>${esc(doc.title)}</strong><span><img src="${GH.asset('gtaIcon')}" alt="">GTA 5 <b>›</b></span></button>`).join('')}</div>
    </section>`;
  }
  function searchPage() {
    const words = s.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const matches = words.length ? s.documents.filter(doc => words.every(w => `${doc.title} ${doc.alias} ${doc.body}`.toLocaleLowerCase().includes(w))) : [];
    return `${topbar('搜索')}<div class="guide-search-scroll scroll-region"><form class="guide-search-form" id="guide-search-form" role="search"><label class="guide-search-input">${icon('search',18)}<input id="guide-search" type="search" maxlength="80" aria-label="在 GTA 5 百科内搜索" placeholder="在 GTA 5 百科内搜索" value="${esc(s.query)}"></label>${s.query?button('clear-search','清空','text-button'):''}</form><div class="guide-search-results">${words.length?`<h2>词条</h2>${matches.length?matches.map(doc=>`<button type="button" class="guide-search-result" data-guide-entry-id="${doc.id}"><strong>${esc(doc.title)}</strong><span><img src="${GH.asset('gtaIcon')}" alt="">GTA 5 <b>›</b></span></button>`).join(''):'<div class="guide-search-blank">没有找到相关词条</div>'}`:'<div class="guide-search-blank">暂无数据</div>'}</div></div>`;
  }
  const infoContent = {
    register: ['注册游戏','注册游戏','开始前先核对游戏运行平台与账号要求，按游戏官方页面完成账号注册，并保管好登录与验证信息。','本地阅读样例；不提供账号注册或外部登录。'],
    purchase: ['购买游戏','购买前核对版本','先确认平台、增强版或传承版及所购版本包含的内容，再按商店当前说明选择。','本地阅读样例；不提供购买、价格或付款。'],
    account: ['账号绑定','核对账号绑定关系','绑定前先确认当前登录的游戏平台和游戏账号。涉及解绑与重新绑定时，请先阅读官方页面提示。','本地阅读样例；不操作真实账号或权限。'],
    launch: ['进入游戏','开始洛圣都之旅','先确认游戏版本并完成必要的安装与更新。选择故事模式或 Online 后，按游戏当前提示继续。','可从常用检索查看版本与模式说明。'],
    solo: ['卡单人战局','单人游玩资料说明','查阅战局相关资料时，先核对客户端版本和游戏当前可用的战局选项。本文不包含网络调整或绕过游戏限制的步骤。','本地精简阅读样例，未还原完整攻略库。'],
    property: ['在线模式资产','资产与生意','查看资产资料时，先确认解锁条件、当前角色资产与对应任务。购买前阅读游戏内价格及提示。','本地样例未提供完整资产数据或收益排行。'],
    weapon: ['武器大全','武器资料检索','查看武器的获取与使用条件时，请按游戏版本及当前任务限制核对。','本地精简阅读样例，未录入完整武器数据。'],
    map: ['点位地图','地图点位资料','根据任务名称、所在区域和版本查找对应资料；遇到点位不一致时核对更新时间。','本地只读说明，未接入交互地图或实时点位。'],
    career: ['职业进度','查看职业进度','按游戏内职业进度页检查任务目标、已完成条件与可领取内容，历史攻略只作对照。','本地精简阅读样例，不读取玩家进度。'],
    clothes: ['限时服饰 [停更]','限时服饰资料 [停更]','该栏目作为历史资料入口保留。限时物品的可获取状态请以游戏内当前说明为准。','历史资料样例，不表示目前仍可领取。'],
    editor: ['成为百科编辑','一起整理有用的游戏资料','百科由玩家共同维护。补充前请核对版本、日期与已有内容，修改时保留其他玩家仍然有效的信息。','本 Demo 在编辑模式下提供 App 内词条编辑，属于盖世适配。小黑盒取证中的编辑表单在浏览器后台；此处不提交精编申请。'],
    community: ['社区交流群','社区答疑','可先通过百科检索与游戏圈求助交流，描述当前版本、平台和遇到的具体问题。','当前为本地演示，不提供真实入群或群链接。'],
    feedback: ['错误反馈','发现内容有误','先核对词条适用版本与上下文。开启编辑模式后，可在词条中更正正文，并填写修改说明。','本地保存会立即更新当前词条，不向竞品或外部系统提交内容。']
  };
  function infoPage() {
    const c = infoContent[s.infoKey] || infoContent.editor;
    return `${topbar(c[0])}<div class="guide-article-scroll scroll-region"><h1 class="guide-info-heading">${c[1]}</h1><img class="guide-info-media" src="${GH.asset(['editor','community','feedback'].includes(s.infoKey)?'wiki-'+s.infoKey:GH.asset('wiki-'+s.infoKey)?'wiki-'+s.infoKey:'guideHero')}" alt="游戏画面"><p class="guide-info-text">${c[2]}</p><p class="guide-info-note">${c[3]}</p>${s.infoKey==='editor'||s.infoKey==='feedback'?button('enable-edit','开启编辑模式','secondary'):s.infoKey==='community'?button('help-tab','查看游戏圈求助','secondary'):''}</div>`;
  }
  function ordinaryPost() {
    const help = s.tab === '求助';
    return `<article class="guide-ordinary-post"><div class="guide-author">${avatar('avatarOfficial')}<div><strong>洛圣都玩家</strong><span>2天前</span></div><span class="guide-more">${icon('more')}</span></div><h2>${help ? '新手线上任务从哪里开始？' : 'GTA5增强版小白入坑经验'}</h2><p>${help ? '刚进洛圣都，想先跟着任务熟悉地图，大家有什么入门建议？' : '先确认自己的游戏版本，再开始洛圣都的第一段旅程。把踩过的坑整理给刚入门的朋友。'}</p><img class="guide-post-media" src="${GH.asset('guideHero')}" alt="GTA5 游戏画面"><div class="guide-post-metrics"><span>${icon('like', 18)}6</span><span>${icon('save', 18)}2</span><span>${icon('comment', 18)}暂无回复</span><span>${icon('share', 18)}</span></div></article>`;
  }
  function listContent() {
    if (s.empty) return `<div class="guide-empty"><h2>暂无共建攻略</h2><p>先看看玩家分享的攻略和经验。</p></div>${ordinaryPost()}`;
    return `${s.tab !== '求助' ? sharedCard() + '<h2 class="guide-player-heading">玩家攻略</h2>' : ''}${ordinaryPost()}`;
  }
  function list() {
    if (GH.orientation === 'landscape') return `<div class="guide-root guide-landscape guide-landscape-home"><aside class="guide-circle-pane">${contextCard(true)}<h3>GTA 5 游戏圈</h3><p class="muted">分享经验，一起探索洛圣都</p>${tabs()}</aside><section class="guide-list-pane scroll-region">${listContent()}</section></div>`;
    return `<div class="guide-root guide-portrait">${communityHeader()}<div class="guide-list-scroll scroll-region">${contextCard()}${tabs()}${listContent()}</div></div>`;
  }
  function topbar(label, actionLabel) {
    return `<header class="guide-subheader"><button type="button" class="back-button" data-guide-action="back" aria-label="返回">${icon('back', 22)}</button><strong>${esc(label)}</strong>${actionLabel ? `<span class="guide-small muted">${esc(actionLabel)}</span>` : '<span></span>'}</header>`;
  }
  function textBody(value, comparison, changeClass) {
    const otherBlocks = comparison == null ? null : String(comparison).split('\n\n');
    return String(value).split('\n\n').map(block => {
      const lines = block.split('\n');
      const changed = otherBlocks && !otherBlocks.includes(block);
      return `<section class="guide-article-section ${changed ? 'guide-changed-' + changeClass : ''}">${changed ? `<span class="guide-change-label">${changeClass === 'add' ? '新增或修改' : '删除或修改'}</span>` : ''}<h3>${esc(lines.shift())}</h3><p>${esc(lines.join('\n'))}</p></section>`;
    }).join('');
  }
  function statusBlock() {
    if (s.status === 'saved') return `<section class="guide-status guide-status-saved" role="status"><strong>保存成功，正文已更新</strong><p>版本 ${s.current} · 本次编辑者：洛圣都玩家</p></section>`;
    return '';
  }
  function richBody(value, entryId = s.entryId) {
    return sections(value).map(section => richSection(section, entryId)).join('');
  }
  function richSection(section, entryId = s.entryId) {
    let extra = '';
    if (entryId === 'beginner' && section.index === 0) extra = `<blockquote>查资料前先确认游戏版本与模式，避免套用不同版本的步骤。</blockquote><img class="guide-article-media" src="${GH.asset('guideHero')}" alt="洛圣都游戏场景"><table class="guide-data-table"><thead><tr><th>核对项</th><th>阅读前检查</th></tr></thead><tbody><tr><td>游戏版本</td><td>增强版 / 传承版</td></tr><tr><td>游戏模式</td><td>故事模式 / Online</td></tr><tr><td>平台与日期</td><td>按当前客户端与资料更新时间核对</td></tr></tbody></table>`;
    if (entryId === 'beginner' && section.index === 1) extra = '<ol><li>完成游戏提供的新手引导。</li><li>查看当前任务的参与条件。</li><li>遇到问题时记录平台、版本与报错。</li></ol>';
    if (entryId === 'weekly' && section.index === 0) extra = '<blockquote>历史资料示例 · 2026.10.15。活动有效期以游戏内说明为准。</blockquote><table class="guide-data-table"><thead><tr><th>轮换项目</th><th>查看位置</th></tr></thead><tbody><tr><td>车行</td><td>游戏内当期展示</td></tr><tr><td>回收站抢劫</td><td>游戏内任务列表</td></tr><tr><td>重点档案</td><td>游戏内当期提示</td></tr></tbody></table>';
    return `<section class="guide-article-section" data-guide-chapter="${section.index}" id="guide-chapter-${section.index}" tabindex="-1"><h3>${esc(section.heading)}</h3><p>${esc(section.body)}</p>${extra}</section>`;
  }
  function article() {
    const entries = sections();
    return `<header class="guide-subheader guide-reader-header"><button type="button" class="back-button" data-guide-action="back" aria-label="返回">${icon('back',22)}</button><nav aria-label="词条内容"><button type="button" data-guide-action="article-tab" class="${s.articleTab==='article'?'active':''}">词条</button><button type="button" data-guide-action="comments-tab" class="${s.articleTab==='comments'?'active':''}">评论</button></nav><span></span></header><div class="guide-reading-tools"><div class="guide-reader-game"><img src="${GH.asset('gtaIcon')}" alt=""><strong>GTA 5</strong></div><div>${button('search','搜索','text-button')}${button('favorite',s.favorites.includes(s.entryId)?'已收藏':'收藏','text-button',`aria-pressed="${s.favorites.includes(s.entryId)}"`)}<button type="button" class="text-button" data-guide-toc-toggle aria-expanded="false" aria-controls="guide-reading-toc">目录</button></div></div>
      <div class="guide-article-scroll scroll-region">${!s.available?'<section class="guide-status guide-status-unavailable"><strong>此攻略已下架</strong><p>当前不可公开阅读或编辑，历史记录仍保留。</p></section>':s.articleTab==='comments'?'<div class="guide-comments-empty"><strong>暂无评论</strong><p>当前为只读评论展示</p></div>':`<div class="guide-article-title guide-wiki-decorated"><h1>${esc(title)}</h1></div><div class="guide-wiki-update">该词条最后编辑于 ${esc(s.versions[0].time)} ${button('versions','编辑历史','text-button')}</div>${statusBlock()}${s.editMode?`<div class="guide-edit-mode-row"><span>编辑模式</span>${button('edit',s.permission?'编辑词条':'暂无编辑权限','text-button',!s.permission?'disabled':'')}</div>`:''}<article class="guide-article">${richBody(s.body)}</article><div class="guide-article-end">已显示全部</div>`}</div>
      <footer class="guide-reader-footer"><span>来说点什么吧！</span><small>只读演示</small></footer><div id="guide-reading-toc" class="guide-reading-toc" hidden><button type="button" class="guide-toc-backdrop" data-guide-toc-close aria-label="关闭章节目录"></button><nav class="guide-toc-drawer" role="dialog" aria-modal="true" aria-label="章节目录"><div class="guide-toc-title">目录<button type="button" data-guide-toc-close aria-label="关闭目录">×</button></div>${entries.map(section=>`<button type="button" class="guide-toc-link" data-guide-section="${section.index}" data-guide-entry="toc">${esc(section.heading)}</button>`).join('')}</nav></div>`;
  }
  function editor() {
    const reference = s.status === 'conflict' ? `<div class="guide-status guide-status-conflict"><strong>已载入最新版本 ${s.current}</strong><p>正文保留了最新内容，请参考原草稿补充你的修改，再重新保存。</p></div><details class="guide-saved-draft"><summary>查看已保留的原草稿</summary><div>${textBody(s.savedDraft || s.conflictDraft.body)}</div></details>` : '';
    return `${topbar('编辑词条', `基于版本 ${s.base}`)}<div class="guide-editor-scroll scroll-region"><h1 class="guide-form-title">${title}</h1><p class="guide-editor-hint">盖世适配 · App 内编辑。保存后立即更新公开正文，请保留其他玩家仍有效的内容。</p>${reference}<form id="guide-edit-form"><label class="guide-form-label" for="guide-body">攻略正文 <span>必填</span></label><textarea id="guide-body" class="field guide-body-input" maxlength="4000" required>${esc(s.draft)}</textarea><div class="guide-count"><span>适用：${esc(scopeLabels().join(' · '))}</span><span data-guide-body-count>${s.draft.length}/4000</span></div><label class="guide-form-label" for="guide-summary">修改说明 <span>必填</span></label><textarea id="guide-summary" class="field guide-summary-input" maxlength="120" placeholder="说明补充或更正了什么">${esc(s.summary)}</textarea>${s.status === 'conflict' ? `<label class="guide-check"><input id="guide-checked" type="checkbox" ${s.checked ? 'checked' : ''}>我已核对最新正文，保留其他玩家的有效修改</label>` : ''}${s.error ? `<p class="inline-error guide-error" role="alert">${esc(s.error)}</p>` : ''}</form></div><footer class="guide-action-footer">${button('cancel-edit', '取消', 'secondary')}${button('preview', '预览', 'secondary')}<button type="submit" form="guide-edit-form" class="primary" ${!s.permission || !s.available ? 'disabled' : ''}>保存修改</button></footer>`;
  }
  function diffPanel(label, value, type, comparison) {
    return `<section class="guide-diff-panel guide-diff-${type}"><h3>${esc(label)}</h3><div>${textBody(value, comparison, type === 'after' ? 'add' : 'delete')}</div></section>`;
  }
  function preview() {
    return `${topbar('预览词条', '尚未保存')}<div class="guide-article-scroll scroll-region"><div class="guide-article-title"><span class="guide-shared-label">编辑预览</span><h1>${esc(title)}</h1><p class="guide-editor-hint">以下为本次编辑内容，公开正文尚未改变。保存后立即更新。</p></div>${richBody(s.draft)}</div><footer class="guide-action-footer">${button('return-edit', '返回编辑', 'secondary')}${button('save', '保存修改', 'primary', !s.permission || !s.available ? 'disabled' : '')}</footer>`;
  }
  function conflict() {
    const r = s.conflictDraft;
    return `${topbar('核对版本更新')}<div class="guide-conflict-scroll scroll-region"><section class="guide-status guide-status-conflict"><strong>正文已有更新，当前草稿不能直接保存</strong><p>你基于版本 ${r.base} 编辑，最新正文已是版本 ${s.current}。请保留最新内容，核对后重新保存。</p></section><div class="guide-diff-grid">${diffPanel(`最新公开正文 · 版本 ${s.current}`, s.body, 'before', r.body)}${diffPanel('你的草稿 · 已保留', r.body, 'after', r.oldBody)}</div></div><footer class="guide-action-footer">${button('read', '阅读最新正文', 'secondary')}${button('resolve-conflict', '按最新版本核对', 'primary')}</footer>`;
  }
  function historyTabs() {
    return `<div class="guide-history-tabs"><button type="button" data-guide-hub-tab="contribution" class="${s.hubTab==='contribution'?'active':''}">百科贡献</button><button type="button" data-guide-hub-tab="history" class="${s.hubTab==='history'?'active':''}">编辑历史</button></div>`;
  }
  function historyTable(rows, all) {
    return `<table class="guide-history-table"><thead><tr>${all?'<th>词条名</th>':''}<th>编辑者</th><th>更新时间</th><th>操作</th></tr></thead><tbody>${rows.map(({doc,v})=>`<tr>${all?`<td>${esc(doc.title)}</td>`:''}<td>${esc(v.author)}${!all&&v.n===s.current?'<small class="guide-current-label">当前</small>':''}</td><td>${esc(v.time)}</td><td><button type="button" ${all?`data-guide-snapshot="${doc.id}:${v.n}"`:`data-guide-version="${v.n}"`}>查看</button></td></tr>`).join('')}</tbody></table><p class="guide-history-end">已显示全部</p>`;
  }
  function versions() {
    const selected = s.versions.find(v=>v.n===s.selectedVersion)||s.versions[0];
    return `${topbar('编辑历史')}<div class="guide-version-scroll guide-history-scroll scroll-region">${historyTabs()}${historyTable(s.versions.map(v=>({doc:{title},v})),false)}${s.selectedSnapshot?`<section class="guide-history-body"><h2>版本 ${selected.n} 的正文</h2><p class="guide-info-note">本地演示快照 · 只读查看</p>${richBody(selected.body)}</section>`:''}</div>`;
  }
  function contributions() {
    syncDocument();
    const people = [['百科整理组',128],['洛圣都攻略组',96],['入门整理组',58],['洛圣都玩家',s.documents.reduce((n,d)=>n+d.versions.filter(v=>v.author==='洛圣都玩家').length,0)]];
    return `${topbar('百科贡献')}<div class="guide-version-scroll guide-history-scroll scroll-region">${historyTabs()}${s.hubTab==='history'?historyTable(s.documents.flatMap(doc=>doc.versions.map(v=>({doc,v}))).sort((a,b)=>(b.v.timestamp||0)-(a.v.timestamp||0)),true):`<div class="guide-contribution-head"><span>编辑者</span><span>贡献度</span></div>${people.map(([name,value],i)=>`<div class="guide-contribution-row"><b>${i+1}</b>${avatar('avatarOfficial')}<div><p><strong>${name}</strong><span>${value||'暂无数据'}</span></p><div class="guide-contribution-track"><i style="width:${Math.max(3,value/128*100)}%"></i></div></div></div>`).join('')}<p class="guide-info-note">本地示例数据，用于展示榜单结构；未接入正式贡献度计算。</p>`}</div>`;
  }
  function snapshotPage() {
    const [id,n]=s.selectedSnapshot.split(':');
    const doc=s.documents.find(d=>d.id===id); const v=doc.versions.find(v=>v.n===Number(n));
    return `${topbar('历史词条')}<div class="guide-article-scroll scroll-region"><div class="guide-wiki-decorated guide-article-title"><h1>${esc(doc.title)}</h1></div><p class="guide-info-note">本地历史快照 · 版本 ${v.n} · 只读</p><section class="guide-history-body">${richBody(v.body, doc.id)}</section></div>`;
  }
  function render() {
    if (s.view === 'list') return list();
    const pages = {read:article, edit:editor, preview, conflict, versions, search:searchPage, info:infoPage, contributions, snapshot:snapshotPage};
    const output = (pages[s.view] || article)();
    if (GH.orientation === 'landscape') return `<div class="guide-root guide-landscape guide-landscape-detail"><aside class="guide-context-sidebar">${contextCard(true)}<p class="guide-sidebar-kicker">GTA 5 百科</p><h2>${s.view==='search'?'搜索':s.view==='contributions'?'百科贡献':esc(title)}</h2><p class="muted">${esc(scopeLabels().join(' · '))}</p>${button('list','返回攻略站','secondary')}</aside><section class="guide-workspace">${output}</section></div>`;
    return `<div class="guide-root guide-portrait guide-detail">${output}</div>`;
  }
  function save() {
    s.error = '';
    if (!s.available || !s.permission) s.error = '当前无法保存。攻略或编辑权限已发生变化，你的内容已保留。';
    else if (!s.draft.trim()) s.error = '请填写攻略正文。';
    else if (!s.summary.trim()) s.error = '请填写修改说明，便于追溯本次变更。';
    else if (s.draft.length > 4000 || s.summary.length > 120) s.error = '正文或修改说明超出本地演示字数限制，请调整后再保存。';
    else if (s.draft.trim() === s.body.trim()) s.error = '正文尚未修改，请补充或更正内容后再保存。';
    else if (s.status === 'conflict' && !s.checked) s.error = '请先核对最新正文，并确认保留其他玩家的有效修改。';
    else if (s.base !== s.current) {
      s.conflictDraft = { base: s.base, oldBody: s.baseBody, body: s.draft, summary: s.summary };
      s.view = 'conflict'; s.status = 'conflict';
    }
    else if (s.failNext) { s.failNext = false; s.error = '保存失败，内容已保留。请重试。'; }
    else {
      s.current += 1; s.body = s.draft.trim(); s.draft = s.body;
      const timestamp = Math.max(Date.now(), ...s.documents.flatMap(d=>d.versions.map(v=>(v.timestamp||0)+1)));
      s.versions.unshift({ n: s.current, body: s.body, note: s.summary.trim(), author: '洛圣都玩家', timestamp, time: formatTime(timestamp) });
      s.status = 'saved'; s.view = 'read'; s.selectedVersion = s.current; s.base = s.current; s.baseBody = s.body;
      s.conflictDraft = null; s.savedDraft = null; s.checked = false; s.jump = 'top';
    }
    if (s.error && s.view === 'preview') s.view = 'edit';
    refresh();
  }
  function action(id) {
    s.error = '';
    if (id === 'join') s.joined = !s.joined;
    else if (id === 'list') { s.view = 'list'; s.restoreCatalog = true; }
    else if (id === 'search') { s.searchBack = s.view; s.view = 'search'; }
    else if (id === 'site-favorite') s.siteFavorite=!s.siteFavorite;
    else if (id === 'favorite') { s.favorites = s.favorites.includes(s.entryId) ? s.favorites.filter(id=>id!==s.entryId) : [...s.favorites,s.entryId]; }
    else if (id === 'edit-mode') s.editMode = !s.editMode;
    else if (id === 'editor-info') { s.infoKey='editor'; s.infoOrigin=s.view; s.view='info'; }
    else if (id === 'enable-edit') { s.editMode=true; s.view='list'; }
    else if (id === 'help-tab') { s.tab='求助'; s.view='list'; }
    else if (id === 'contributions') { s.hubOrigin=s.view; s.hubTab='contribution'; s.view='contributions'; }
    else if (id === 'article-tab') s.articleTab='article';
    else if (id === 'comments-tab') s.articleTab='comments';
    else if (id === 'clear-search' || id === 'reset-search') { s.query = ''; s.searchScroll=0; }
    else if (id === 'read') s.view = 'read';
    else if (id === 'back') {
      if (s.view === 'read') { s.view=s.origin||'list'; s.restoreCatalog=true; }
      else if (s.view === 'search') s.view=s.searchBack||'list';
      else if (s.view === 'favorites') s.view='list';
      else if (s.view === 'info') s.view=s.infoOrigin||'list';
      else if (s.view === 'contributions') s.view=s.hubOrigin||'list';
      else if (s.view === 'snapshot') s.view='contributions';
      else if (s.view === 'preview') s.view='edit';
      else s.view='read';
    }
    else if (id === 'preview') { if (!s.draft.trim()) s.error = '请先填写攻略正文。'; else s.view = 'preview'; }
    else if (id === 'return-edit') s.view = 'edit';
    else if (id === 'save') { save(); return; }
    else if (id === 'edit') {
      if (!s.permission || !s.available) return;
      s.editMode=true; s.view = 'edit'; s.draft = s.body; s.summary = ''; s.base = s.current; s.baseBody = s.body; s.checked = false;
      s.status = ''; s.conflictDraft = null; s.savedDraft = null;
    }
    else if (id === 'cancel-edit') { s.view = 'read'; s.status = ''; s.conflictDraft = null; s.savedDraft = null; }
    else if (id === 'versions') { s.selectedVersion = s.current; s.selectedSnapshot=null; s.hubTab='history'; s.view = 'versions'; }
    else if (id === 'resolve-conflict') {
      s.savedDraft = s.conflictDraft.body; s.draft = s.body; s.summary = s.conflictDraft.summary;
      s.base = s.current; s.baseBody = s.body; s.checked = false; s.view = 'edit'; s.status = 'conflict';
    }
    refresh();
  }
  function bind(root) {
    const catalogScroller = root.querySelector('.guide-list-scroll, .guide-list-pane');
    if (catalogScroller) catalogScroller.addEventListener('scroll', () => {
      s.catalogScroll = catalogScroller.scrollTop;
      const nav=root.querySelector('.guide-wiki-anchors');
      if (!nav) return;
      const navBottom=nav.getBoundingClientRect().bottom;
      let active='community';
      root.querySelectorAll('[data-guide-portal-section]').forEach(section=>{if(section.getBoundingClientRect().top<=navBottom+22) active=section.dataset.guidePortalSection;});
      s.activeAnchor=active;
      root.querySelectorAll('[data-guide-anchor]').forEach(el=>{el.classList.toggle('active',el.dataset.guideAnchor===active);});
    }, { passive: true });
    const searchScroller=root.querySelector('.guide-search-scroll');
    if(searchScroller) { searchScroller.scrollTop=s.searchScroll; searchScroller.addEventListener('scroll',()=>{s.searchScroll=searchScroller.scrollTop;},{passive:true}); }
    function portalJump(id) {
      const target=root.querySelector(`[data-guide-portal-section="${id}"]`), nav=root.querySelector('.guide-wiki-anchors');
      if(!target||!catalogScroller||!nav) return;
      catalogScroller.scrollTop+=target.getBoundingClientRect().top-catalogScroller.getBoundingClientRect().top-nav.offsetHeight;
      s.activeAnchor=id; s.catalogScroll=catalogScroller.scrollTop;
      root.querySelectorAll('[data-guide-anchor]').forEach(el=>el.classList.toggle('active',el.dataset.guideAnchor===id));
      root.querySelector(`[data-guide-anchor="${id}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});
    }
    root.querySelectorAll('[data-guide-anchor]').forEach(el=>el.onclick=()=>portalJump(el.dataset.guideAnchor));
    root.querySelectorAll('[data-guide-home-anchor]').forEach(el=>el.onclick=()=>{s.view='list';s.pendingAnchor=el.dataset.guideHomeAnchor;refresh();});
    root.querySelectorAll('[data-guide-info]').forEach(el=>el.onclick=()=>{s.infoKey=el.dataset.guideInfo;s.infoOrigin=s.view;s.view='info';refresh();});
    root.querySelectorAll('[data-guide-welcome-tab]').forEach(el=>el.onclick=()=>{s.welcomeTab=el.dataset.guideWelcomeTab;refresh();});
    root.querySelectorAll('[data-guide-assets-tab]').forEach(el=>el.onclick=()=>{s.assetsTab=el.dataset.guideAssetsTab;refresh();});
    root.querySelectorAll('[data-guide-lookup-tab]').forEach(el=>el.onclick=()=>{s.lookupTab=el.dataset.guideLookupTab;refresh();});
    root.querySelectorAll('[data-guide-hub-tab]').forEach(el=>el.onclick=()=>{s.hubTab=el.dataset.guideHubTab;if(s.hubTab==='contribution'){s.hubOrigin=s.view==='versions'?'read':s.hubOrigin;s.view='contributions';}refresh();});
    root.querySelectorAll('[data-guide-snapshot]').forEach(el=>el.onclick=()=>{s.selectedSnapshot=el.dataset.guideSnapshot;s.view='snapshot';refresh();});
    const articleScroller = root.querySelector('.guide-article-scroll');
    if (articleScroller) articleScroller.addEventListener('scroll', () => { s.articleScroll = articleScroller.scrollTop; }, { passive: true });
    root.querySelectorAll('[data-guide-action]').forEach(el => el.addEventListener('click', () => {
      if (s.view === 'list') s.catalogScroll = root.querySelector('.guide-list-scroll, .guide-list-pane')?.scrollTop || 0;
      action(el.dataset.guideAction);
    }));
    root.querySelectorAll('[data-guide-tab]').forEach(el => el.addEventListener('click', () => { s.tab = el.dataset.guideTab; refresh(); }));
    root.querySelectorAll('[data-guide-version]').forEach(el => el.addEventListener('click', () => { s.selectedVersion = Number(el.dataset.guideVersion); s.selectedSnapshot='single'; refresh(); root.querySelector('.guide-history-body')?.scrollIntoView({block:'nearest'}); }));
    root.querySelectorAll('[data-guide-entry-category]').forEach(el => el.addEventListener('click', () => { s.entryCategory = el.dataset.guideEntryCategory; s.catalogScroll = 0; s.restoreCatalog = true; refresh(); }));
    root.querySelectorAll('[data-guide-entry-id]').forEach(el => el.addEventListener('click', () => { if(s.view==='list') s.catalogScroll=catalogScroller?.scrollTop||0; s.origin=s.view; openDocument(el.dataset.guideEntryId); refresh(); }));
    const search = root.querySelector('#guide-search');
    if (search) search.addEventListener('input', () => { s.query = search.value; s.searchScroll=0; refresh(); });
    const searchForm = root.querySelector('#guide-search-form');
    if (searchForm) searchForm.addEventListener('submit', event => { event.preventDefault(); s.query = search.value; s.searchScroll=0; refresh(); });
    function jumpToSection(index) {
      const scroller = root.querySelector('.guide-article-scroll');
      const target = root.querySelector(`[data-guide-chapter="${index}"]`);
      if (!scroller || !target) return;
      const toc = root.querySelector('#guide-reading-toc');
      const toggle = root.querySelector('[data-guide-toc-toggle]');
      closeToc(false);
      const article = root.querySelector('.guide-article');
      if (article) article.style.paddingBottom = `${Math.max(80, scroller.clientHeight - target.offsetHeight)}px`;
      scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 14;
      target.focus({preventScroll:true});
      root.querySelectorAll('[data-guide-entry="toc"]').forEach(el => el.setAttribute('aria-current', el.dataset.guideSection === String(index) ? 'location' : 'false'));
    }
    root.querySelectorAll('[data-guide-section]').forEach(el => el.addEventListener('click', () => {
      const index = Number(el.dataset.guideSection);
      if (s.view === 'read') jumpToSection(index);
      else { s.catalogScroll = root.querySelector('.guide-list-scroll, .guide-list-pane')?.scrollTop || 0; s.jump = index; s.view = 'read'; refresh(); }
    }));
    const toggle = root.querySelector('[data-guide-toc-toggle]');
    const toc=root.querySelector('#guide-reading-toc');
    function closeToc(focus=true) { if(toc) toc.hidden=true; if(toggle) toggle.setAttribute('aria-expanded','false'); if(focus) toggle?.focus({preventScroll:true}); }
    if (toggle) toggle.addEventListener('click', () => {
      toc.hidden=!toc.hidden; toggle.setAttribute('aria-expanded',String(!toc.hidden));
      if(!toc.hidden) toc.querySelector('[data-guide-toc-close] ~ nav button, .guide-toc-drawer button')?.focus({preventScroll:true});
    });
    root.querySelectorAll('[data-guide-toc-close]').forEach(el=>el.onclick=()=>closeToc());
    root.addEventListener('keydown', event=>{
      if(!toc||toc.hidden) return;
      if(event.key==='Escape') {event.preventDefault();event.stopPropagation();closeToc();}
      if(event.key==='Tab') {
        const items=[...toc.querySelector('.guide-toc-drawer').querySelectorAll('button')];
        const first=items[0],last=items[items.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    if (s.view === 'read' && s.jump !== null) {
      const target = s.jump; s.jump = null; s.articleScroll = 0;
      window.requestAnimationFrame(() => {
        if (!root.isConnected) return;
        if (target === 'top') { const scroller = root.querySelector('.guide-article-scroll'); if (scroller) scroller.scrollTop = 0; }
        else jumpToSection(target);
      });
    }
    if (s.view === 'list') {
      s.restoreCatalog = false;
      window.requestAnimationFrame(() => { if (root.isConnected) { const scroller = root.querySelector('.guide-list-scroll, .guide-list-pane'); if (scroller) scroller.scrollTop = s.catalogScroll; if(s.pendingAnchor){const id=s.pendingAnchor;s.pendingAnchor=null;portalJump(id);} } });
    }
    if (s.view === 'read' && s.jump === null && s.articleScroll > 0) {
      window.requestAnimationFrame(() => { if (root.isConnected) { const scroller = root.querySelector('.guide-article-scroll'); if (scroller) scroller.scrollTop = s.articleScroll; } });
    }
    const body = root.querySelector('#guide-body');
    if (body) body.addEventListener('input', () => { s.draft = body.value; const counter = root.querySelector('[data-guide-body-count]'); if (counter) counter.textContent = `${s.draft.length}/4000`; });
    const summary = root.querySelector('#guide-summary');
    if (summary) summary.addEventListener('input', () => { s.summary = summary.value; });
    const checked = root.querySelector('#guide-checked');
    if (checked) checked.addEventListener('change', () => { s.checked = checked.checked; });
    const form = root.querySelector('#guide-edit-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); save(); });
  }
  function scenario(id) {
    const ids = ['default', 'read', 'search', 'search-empty', 'second-entry', 'history', 'edit', 'preview', 'conflict', 'saved', 'failed', 'empty', 'no-permission', 'unavailable'];
    if (!ids.includes(id)) return;
    reset();
    if (id === 'read') s.view = 'read';
    else if (id === 'search') {s.query = '线上';s.view='search';}
    else if (id === 'search-empty') {s.query = '不存在的词条';s.view='search';}
    else if (id === 'second-entry') openDocument('online');
    else if (id === 'history') {s.view = 'versions';s.hubTab='history';}
    else if (id === 'preview' || id === 'edit' || id === 'failed' || id === 'saved') {
      s.editMode=true; s.view = id === 'preview' ? 'preview' : 'edit'; s.draft = suggested; s.summary = '补充进入线上前的保存提醒。';
      if (id === 'failed') s.failNext = true;
      if (id === 'saved') save();
    }
    else if (id === 'conflict') {
      s.conflictDraft = { base: 3, oldBody: original, body: suggested, summary: '补充切换模式前的保存提醒。' };
      s.draft = suggested; s.summary = s.conflictDraft.summary;
      s.current = 4; s.body = original + '\n\n补充：进入前检查\n进入 Online 前请先确认当前网络连接正常。';
      s.versions.unshift({ n: 4, body: s.body, author: '另一位贡献者', note: '补充进入前的网络检查', timestamp: Date.parse('2026-10-19T11:32:00+08:00'), time: '2026-10-19 11:32:00' });
      s.view = 'conflict'; s.status = 'conflict';
    }
    else if (id === 'empty') s.empty = true;
    else if (id === 'no-permission') { s.view = 'read'; s.permission = false; s.editMode=true; }
    else if (id === 'unavailable') { s.view = 'read'; s.available = false; }
  }
  GH.modules.guide = {
    title: '攻略站', subtitle: 'GTA 5 · 目录检索、词条编辑，保存后立即更新正文', render, bind, scenario, reset,
    inspect: () => {
      syncDocument();
      return JSON.parse(JSON.stringify({ view: s.view, entryId: s.entryId, title, scope: scopeLabels(), query: s.query, category: s.entryCategory, current: s.current, body: s.body, draft: s.draft, summary: s.summary, base: s.base, status: s.status, permission: s.permission, available: s.available, error: s.error, checked: s.checked, failNext: s.failNext, conflictDraft: s.conflictDraft, versions: s.versions, documents: s.documents.map(doc => ({ id: doc.id, title: doc.title, body: doc.body, current: doc.current, status: doc.status, versions: doc.versions })), catalogScroll: s.catalogScroll, articleScroll: s.articleScroll, editMode:s.editMode, articleTab:s.articleTab, favorites:s.favorites, siteFavorite:s.siteFavorite, assetsTab:s.assetsTab, origin:s.origin, hubTab:s.hubTab, activeAnchor:s.activeAnchor, welcomeTab:s.welcomeTab, lookupTab:s.lookupTab }));
    },
    scenarios: [{ id: 'default', label: '百科目录' }, { id: 'search', label: '词条搜索' }, { id: 'search-empty', label: '搜索无结果' }, { id: 'second-entry', label: '阅读另一词条' }, { id: 'read', label: '阅读正文' }, { id: 'history', label: '单篇历史' }, { id: 'edit', label: '编辑词条' }, { id: 'preview', label: '预览编辑内容' }, { id: 'conflict', label: '版本冲突' }, { id: 'saved', label: '保存成功' }, { id: 'failed', label: '保存失败 · 保留内容' }, { id: 'empty', label: '暂无共建条目' }, { id: 'no-permission', label: '无编辑权限' }, { id: 'unavailable', label: '条目已下架' }],
    notes: () => ['本轮按小黑盒实机还原百科门户、分类锚点、独立搜索、阅读目录抽屉、贡献榜和编辑历史；盖世外层与深色主题保留。', '门户所有分区在同一长页，横向分类用于锚点定位；欢迎与常用检索的局部Tab仅切换本区内容。', '站点收藏与词条收藏在当前会话内可切换；编辑模式开启后阅读页提供编辑词条。App内编辑、横屏布局、冲突核对及历史快照为盖世适配。', '保存后当前词条立即生效，同篇和全库历史同步；预览、取消与失败不改公开正文，冲突保留输入。', '玩家评论仅只读空态，交流群与精编入口仅本地说明；没有真实外发、申请或后台连接。', '新增词条与榜单为匿名演示数据，不代表实时活动或贡献度口径。原历史严格视觉FAIL不以本轮替代。']
  };
}());
