(function gameProfileDemo() {
  const app = document.querySelector('#app');
  const ctx = window.GHNextDemoContext;
  const query = new URLSearchParams(location.search);
  const requestedLang = query.get('lang') === 'en' ? 'en' : 'zh';
  const routes = {
    'P06-01': { role:'developer', page:'games', zh:'游戏管理', en:'Games' },
    'P06-02': { role:'developer', page:'create', zh:'新建游戏', en:'Create game' },
    'P06-03': { role:'developer', page:'overview', zh:'游戏概览', en:'Game overview' },
    'P06-04': { role:'developer', page:'profile', zh:'商店展示资料', en:'Store profile' },
    'P06-05': { role:'developer', page:'qualification', zh:'游戏资质', en:'Qualifications' },
    'P06-06': { role:'developer', page:'scope', zh:'发行范围', en:'Release scope' },
    'P06-07': { role:'developer', page:'contract', zh:'合同状态', en:'Contract' },
    'P06-08': { role:'operations', page:'reviews', zh:'游戏资料审核', en:'Reviews' },
    'P06-09': { role:'operations', page:'review-detail', zh:'审核详情', en:'Review details' },
    'P06-10': { role:'operations', page:'contract-admin', zh:'合同状态维护', en:'Contract maintenance' },
  };
  const routeId = () => (location.hash.match(/P06-\d{2}/) || ['P06-01'])[0];
  const hashParams = () => new URLSearchParams((location.hash.split('?')[1] || ''));
  const currentRoute = () => routes[routeId()] || routes['P06-01'];
  const lang = () => currentRoute().role === 'operations' ? 'zh' : requestedLang;
  const tx = (zh, en) => lang() === 'en' ? en : zh;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const routeTo = (id, params = '') => { location.hash = `/${id}${params ? `?${params}` : ''}`; };
  const statusLabels = {
    unsubmitted:'未提交', pending:'审核中', supplement:'待补充', approved:'已通过', rejected:'未通过',
    draft:'草稿', effective:'生效中', expired:'已过期', terminated:'已终止',
  };
  const statusTone = value => ({ approved:'success', effective:'success', pending:'warning', supplement:'warning', rejected:'danger', expired:'danger', terminated:'danger', draft:'info', unsubmitted:'' }[value] || '');
  const state = {
    toast:'', toastError:false, dialog:'', activeAction:'', actionError:'', uploadNames:{},
    marketKeyword:'', selectedMarkets:['CN','US','SG','HK','MO'],
    reviewFilters:{ keyword:'', type:'', status:'' },
    reviewRows:[
      { id:'REV-20260905-021', game:'星海远征', vendor:'星海互动科技有限公司', type:'游戏资质', object:'qualification', version:'QUAL-20260905-001', status:'pending', submitted:'2026-09-05 10:32' },
      { id:'REV-20260904-118', game:'星海远征', vendor:'星海互动科技有限公司', type:'商店展示资料', object:'profile', version:'PROFILE-20260904-003', status:'supplement', submitted:'2026-09-04 17:46' },
      { id:'REV-20260903-076', game:'星海远征', vendor:'星海互动科技有限公司', type:'发行范围', object:'release_scope', version:'SCOPE-20260903-002', status:'approved', submitted:'2026-09-03 14:05' },
    ],
  };
  const showToast = (message, isError = false) => {
    state.toast = message; state.toastError = isError; render();
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { state.toast = ''; render(); }, 2200);
  };
  const logo = () => `<svg viewBox="0 0 36 36" aria-hidden="true"><defs><linearGradient id="d6g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd86a"/><stop offset="1" stop-color="#e49a00"/></linearGradient></defs><rect width="36" height="36" rx="10" fill="url(#d6g)"/><path d="M10 18.3c0-5.3 3.7-9.1 8.9-9.1 2.6 0 4.8.9 6.4 2.4l-3.1 3.1a4.7 4.7 0 0 0-3.3-1.3c-2.8 0-4.7 2-4.7 4.9 0 2.8 1.9 4.9 4.8 4.9 2 0 3.3-.8 4-2.1h-4.6v-3.8h8.7c.1.6.1 1.2.1 1.8 0 5.1-3.4 8.8-8.3 8.8-5.2 0-8.9-4-8.9-9.6Z" fill="#422d00"/></svg>`;
  const icon = text => `<span class="gh-nav-icon" aria-hidden="true">${text}</span>`;
  const tag = (label, tone = '') => `<span class="gh-tag ${tone}">${escapeHtml(label)}</span>`;
  const button = (label, action, tone = '', attrs = '') => `<button class="gh-button ${tone}" type="button" data-action="${action}" ${attrs}>${escapeHtml(label)}</button>`;
  const topbar = role => `<header class="gh-topbar"><div class="gh-brand">${logo()}<span>${role === 'operations' ? '发行平台运营后台' : tx('盖世游戏开发者平台','GameHub Developer')}<small>${role === 'operations' ? '内部管理' : tx('游戏发行与服务','Publishing & services')}</small></span></div><div class="gh-top-actions"><button class="gh-top-link optional" data-action="open-messages">${tx('消息通知','Messages')}</button><button class="gh-top-link optional" data-action="open-resources">${tx('开发资源','Resources')}</button><div class="gh-user"><span class="gh-avatar">${role === 'operations' ? '运' : '王'}</span><span class="gh-user-copy"><strong>${role === 'operations' ? '李瑜' : '王明'}</strong><small>${role === 'operations' ? '发行运营' : tx('企业开发者','Enterprise')}</small></span></div></div></header>`;
  const developerNav = [
    ['P06-01','游戏管理','Games','01'],
    ['P06-03','游戏概览','Overview','02'],
    ['P06-04','商店展示资料','Store profile','03'],
    ['P06-05','游戏资质','Qualifications','04'],
    ['P06-06','发行范围','Release scope','05'],
    ['P06-07','合同状态','Contract','06'],
  ];
  const operationNav = [
    ['P06-08','游戏资料审核','Reviews','01'],
    ['P06-10','合同状态维护','Contracts','02'],
    ['P07-06','SDK 资源管理','Resources','03'],
    ['P08-03','系统公告','Announcements','04'],
  ];
  const sidebar = role => {
    const nav = role === 'operations' ? operationNav : developerNav;
    return `<aside class="gh-sidebar"><div class="gh-sidebar-label">${role === 'operations' ? '发行平台后台' : tx('游戏工作台','Game workspace')}</div><nav class="gh-nav">${nav.map(([id,zh,en,num]) => `<button type="button" class="${routeId() === id || (id === 'P06-08' && routeId() === 'P06-09') ? 'is-active' : ''}" data-route="${id}">${icon(num)}<span>${role === 'operations' ? zh : tx(zh,en)}</span></button>`).join('')}</nav></aside>`;
  };
  const pageHead = (title, description, actions = '') => `<section class="gh-page-head"><div><h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div>${actions ? `<div class="gh-head-actions">${actions}</div>` : ''}</section>`;
  const breadcrumb = (tail = '') => `<nav class="gh-breadcrumb"><button data-route="P06-01">${tx('游戏管理','Games')}</button><span>/</span><span>${escapeHtml(ctx.read().game_name_zh)}</span>${tail ? `<span>/</span><span>${escapeHtml(tail)}</span>` : ''}</nav>`;
  const readonly = (label, value, hint = '') => `<div class="gh-readonly"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</div>`;
  const field = ({label,name,value='',type='text',required=false,hint='',placeholder='',wide=false}) => `<div class="gh-field ${wide ? 'wide' : ''}"><label class="${required ? 'gh-required' : ''}" for="${name}">${escapeHtml(label)}</label><input class="gh-input" id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''}>${hint ? `<small class="gh-hint">${escapeHtml(hint)}</small>` : ''}<div class="gh-error" data-error-for="${name}"></div></div>`;
  const textarea = ({label,name,value='',required=false,hint='',wide=true}) => `<div class="gh-field ${wide ? 'wide' : ''}"><label class="${required ? 'gh-required' : ''}" for="${name}">${escapeHtml(label)}</label><textarea class="gh-textarea" id="${name}" name="${name}" ${required ? 'required' : ''}>${escapeHtml(value)}</textarea>${hint ? `<small class="gh-hint">${escapeHtml(hint)}</small>` : ''}<div class="gh-error" data-error-for="${name}"></div></div>`;
  const qualificationNotice = current => current.first_build_uploaded && current.qualification_status !== 'approved' ? `<div class="gh-notice warning"><div><strong>${tx('首个包体已上传，请补充游戏资质。','Your first build is ready. Add the required qualifications.')}</strong><p>${tx('资质状态将纳入运营审核，但不影响测试或发行申请。','Qualification status is included in operations review, but does not block test or release requests.')}</p></div>${button(tx('去补充','Add now'),'go-qualification','')}</div>` : '';

  function renderGames() {
    const current = ctx.read();
    return `${pageHead(tx('游戏管理','Games'),tx('创建和管理游戏项目。','Create and manage game projects.'),button(tx('新建游戏','Create game'),'create-game','primary'))}
    <section class="gh-card"><header class="gh-card-head"><div><h2>${tx('全部游戏','All games')}</h2><p>${tx('共 1 款，按最近更新排序','1 game, sorted by latest update')}</p></div></header><div class="gh-card-body"><button class="d6-game-row" data-action="enter-game"><span class="d6-game-art"></span><span class="d6-game-info"><span class="d6-game-title"><span><strong>${escapeHtml(lang() === 'en' ? current.game_name_en : current.game_name_zh)}</strong><small class="gh-hint">Windows / macOS / Linux</small></span>${tag(tx('资料准备中','Preparing'), 'warning')}</span><span class="d6-game-meta">${readonly('Game ID',current.game_id)}${readonly('APPID',current.app_id)}${readonly(tx('商店资料','Store profile'),statusLabels[current.profile_status] || current.profile_status)}${readonly(tx('游戏资质','Qualifications'),statusLabels[current.qualification_status] || current.qualification_status)}</span></span></button></div></section>`;
  }
  function renderCreate() {
    return `${breadcrumb(tx('新建游戏','Create game'))}${pageHead(tx('新建游戏','Create game'),tx('创建后生成唯一 Game ID 和 APPID。','A Game ID and APPID will be created automatically.'))}<form class="gh-card" id="createGameForm"><header class="gh-card-head"><div><h2>${tx('基本信息','Basic information')}</h2><p>${tx('名称和平台后续可在商店资料中完善。','Complete store content after the project is created.')}</p></div></header><div class="gh-card-body"><div class="gh-grid-2">${field({label:tx('游戏中文名','Chinese title'),name:'game_name_zh',required:true,placeholder:'例：星海远征'})}${field({label:tx('游戏英文名','English title'),name:'game_name_en',required:true,placeholder:'Ocean Expedition'})}<div class="gh-field wide"><span class="gh-label gh-required">${tx('目标平台','Target platforms')}</span><div class="gh-checks"><label><input type="checkbox" name="platforms" value="Windows" checked> Windows</label><label><input type="checkbox" name="platforms" value="macOS"> macOS</label><label><input type="checkbox" name="platforms" value="Linux"> Linux</label></div><div class="gh-error" data-error-for="platforms"></div></div>${textarea({label:tx('项目说明','Project note'),name:'note',hint:tx('仅供项目成员查看，不对外展示。','Internal only; not shown publicly.')})}</div><div class="gh-form-actions">${button(tx('取消','Cancel'),'back-games')}${button(tx('创建游戏','Create game'),'submit-create','primary')}</div></div></form>`;
  }
  function renderOverview() {
    const current = ctx.read();
    const done = [current.profile_status === 'approved', current.qualification_status === 'approved', current.release_scope_status === 'approved', current.contract_status === 'effective'];
    const completed = done.filter(Boolean).length;
    return `${breadcrumb(tx('游戏概览','Game overview'))}${pageHead(`${escapeHtml(lang() === 'en' ? current.game_name_en : current.game_name_zh)} ${tx('概览','Overview')}`,tx('查看资料、资质、发行范围和合同状态。','Review profile, qualifications, release scope and contract.'))}${qualificationNotice(current)}<section class="gh-grid-4">${readonly('Game ID',current.game_id)}${readonly('APPID',current.app_id)}${readonly(tx('最新包体','Latest build'),current.build_id,tx('由包体与发布模块同步','Synced from Build & Release'))}${readonly(tx('合同状态','Contract'),statusLabels[current.contract_status] || current.contract_status)}</section><section class="gh-card"><header class="gh-card-head"><div><h2>${tx('发行资料进度','Publishing profile progress')}</h2><p>${completed} / 4 ${tx('项已完成','complete')}</p></div>${tag(`${Math.round(completed / 4 * 100)}%`, completed === 4 ? 'success' : 'warning')}</header><div class="gh-card-body"><div class="d6-progress"><i style="width:${completed / 4 * 100}%"></i></div><div class="d6-step-list"><div class="d6-step ${done[0] ? 'done':''}"><span class="d6-step-index">1</span><span><strong>${tx('商店展示资料','Store profile')}</strong><small>${tx('中英文介绍、素材、语言和平台信息','Localized content, media, languages and platforms')}</small></span>${tag(statusLabels[current.profile_status] || current.profile_status,statusTone(current.profile_status))}</div><div class="d6-step ${done[1] ? 'done':''}"><span class="d6-step-index">2</span><span><strong>${tx('游戏资质','Qualifications')}</strong><small>${tx('权属、授权和不同地区的发行材料','Ownership, authorization and regional materials')}</small></span>${tag(statusLabels[current.qualification_status] || current.qualification_status,statusTone(current.qualification_status))}</div><div class="d6-step ${done[2] ? 'done':''}"><span class="d6-step-index">3</span><span><strong>${tx('发行范围','Release scope')}</strong><small>${tx('国家／地区、平台和计划发行时间','Markets, platforms and planned release time')}</small></span>${tag(statusLabels[current.release_scope_status] || current.release_scope_status,statusTone(current.release_scope_status))}</div><div class="d6-step ${done[3] ? 'done':''}"><span class="d6-step-index">4</span><span><strong>${tx('合同状态','Contract')}</strong><small>${tx('合作类型、生效时间和有效期','Type, effective date and validity')}</small></span>${tag(statusLabels[current.contract_status] || current.contract_status,statusTone(current.contract_status))}</div></div></div></section>`;
  }
  function renderProfile() {
    const current = ctx.read();
    return `${breadcrumb(tx('商店展示资料','Store profile'))}${pageHead(tx('商店展示资料','Store profile'),tx('维护对外展示的文案、素材和平台信息。','Manage public copy, media and platform details.'),tag(statusLabels[current.profile_status] || current.profile_status,statusTone(current.profile_status)))}<form class="gh-card" id="profileForm"><header class="gh-card-head"><div><h2>${tx('对外展示内容','Public content')}</h2><p>${tx('中文与 English 必须同时完成。','Chinese and English content are both required.')}</p></div></header><div class="gh-card-body"><div class="gh-split"><div class="gh-grid-2">${field({label:'游戏中文名',name:'title_zh',value:current.game_name_zh,required:true})}${field({label:'Game title',name:'title_en',value:current.game_name_en,required:true})}${textarea({label:'中文短介介',name:'summary_zh',value:'踏入未知星域，开启你的远征。',required:true})}${textarea({label:'Short description',name:'summary_en',value:'Begin your expedition beyond the stars.',required:true})}${textarea({label:'中文详细介绍',name:'description_zh',value:'在开放星域中探索未知世界，完成战斗、建造与成长挑战。',required:true})}${textarea({label:'Full description',name:'description_en',value:'Explore uncharted worlds and complete combat, building, and progression challenges.',required:true})}${field({label:'开发商',name:'developer',value:'星海互动科技有限公司',required:true})}${field({label:'发行商',name:'publisher',value:'盖世游戏',required:true})}<div class="gh-field wide"><span class="gh-label gh-required">支持语言</span><div class="gh-checks"><label><input type="checkbox" checked> 简体中文</label><label><input type="checkbox" checked> 繁体中文</label><label><input type="checkbox" checked> English</label><label><input type="checkbox"> 日语</label></div></div><div class="gh-field wide"><span class="gh-label gh-required">商店素材</span><label class="gh-upload"><strong data-upload-label="profile">选择封面、截图或宣传视频</strong><small>PNG / JPG / MP4，单个文件不超过 500 MB</small><input type="file" data-upload="profile" accept="image/png,image/jpeg,video/mp4" multiple></label></div></div><aside><div class="d6-cover"><h2>${escapeHtml(lang() === 'en' ? current.game_name_en : current.game_name_zh)}</h2><p>${tx('踏入未知星域，开启你的远征。','Begin your expedition beyond the stars.')}</p><div class="d6-cover-tags"><span>${tx('动作','Action')}</span><span>${tx('冒险','Adventure')}</span><span>${tx('单人','Single-player')}</span></div></div><small class="gh-hint">${tx('商店展示预览','Store preview')}</small></aside></div><div class="gh-form-actions">${button(tx('保存草稿','Save draft'),'save-profile')}${button(tx('提交审核','Submit for review'),'submit-profile','primary')}</div></div></form>`;
  }
  function renderQualification() {
    const current = ctx.read();
    return `${breadcrumb(tx('游戏资质','Qualifications'))}${pageHead(tx('游戏资质','Qualifications'),tx('提交权属、授权和发行资质。','Submit ownership, authorization and publishing documents.'),tag(statusLabels[current.qualification_status] || current.qualification_status,statusTone(current.qualification_status)))}${qualificationNotice(current)}<div class="gh-notice"><div><strong>${tx('资质状态将纳入运营审核','Qualification status is included in operations review')}</strong><p>${tx('未提交或审核中不影响你继续测试或提交发行申请。','Unsubmitted or pending materials do not block test or release requests.')}</p></div></div><form class="gh-card" id="qualificationForm"><header class="gh-card-head"><div><h2>${tx('权属与授权','Ownership & authorization')}</h2><p>${tx('根据实际合作关系提交资料。','Provide documents that match the actual relationship.')}</p></div></header><div class="gh-card-body"><div class="gh-grid-2"><div class="gh-field wide"><span class="gh-label gh-required">${tx('权属类型','Rights type')}</span><div class="gh-checks"><label><input type="radio" name="rights_type" value="self" checked> ${tx('自研游戏','Self-developed')}</label><label><input type="radio" name="rights_type" value="agency"> ${tx('代理发行','Licensed publishing')}</label></div></div>${field({label:tx('著作权人／权利方','Rights holder'),name:'rights_holder',value:'星海互动科技有限公司',required:true})}${field({label:tx('软件著作权登记号','Copyright registration no.'),name:'copyright_no',value:'2026SR0884217',required:true})}${field({label:tx('授权开始日','License start'),name:'license_start',type:'date',value:'2026-08-01'})}${field({label:tx('授权截止日','License end'),name:'license_end',type:'date',value:'2028-07-31'})}<div class="gh-field"><span class="gh-label gh-required">${tx('软件著作权证明','Copyright certificate')}</span><label class="gh-upload"><strong data-upload-label="copyright">${tx('上传图片','Upload image')}</strong><small>PNG / JPG，不超过 20 MB</small><input type="file" data-upload="copyright" accept="image/png,image/jpeg"></label></div><div class="gh-field"><span class="gh-label">${tx('授权证明','License document')}</span><label class="gh-upload"><strong data-upload-label="license">${tx('上传图片','Upload image')}</strong><small>${tx('代理发行时必填','Required for licensed publishing')}</small><input type="file" data-upload="license" accept="image/png,image/jpeg"></label></div><div class="gh-field wide"><span class="gh-label">${tx('中国大陆出版审批','Mainland China publishing approval')}</span><div class="gh-grid-2">${field({label:tx('审批文号','Approval no.'),name:'approval_no',placeholder:'例：新广出审〔2026〔XX号'})}${field({label:tx('审批名称','Approved title'),name:'approval_title',value:'星海远征'})}</div><small class="gh-hint">${tx('若尚在申请，可先提交已有资料，后续补充。','If approval is pending, submit the available materials now and add the rest later.')}</small></div></div><div class="gh-form-actions">${button(tx('保存草稿','Save draft'),'save-qualification')}${button(tx('提交平台审核','Submit for review'),'submit-qualification','primary')}</div></div></form>`;
  }
  const markets = [
    ['CN','中国大陆','Mainland China'],['HK','中国香港','Hong Kong SAR'],['MO','中国澳门','Macao SAR'],['TW','中国台湾','Taiwan'],
    ['US','美国','United States'],['CA','加拿大','Canada'],['SG','新加坡','Singapore'],['JP','日本','Japan'],['KR','韩国','South Korea'],['GB','英国','United Kingdom'],['DE','德国','Germany'],['FR','法国','France'],
  ];
  function renderScope() {
    const current = ctx.read();
    const keyword = state.marketKeyword.toLowerCase();
    const visible = markets.filter(item => !keyword || item.join(' ').toLowerCase().includes(keyword));
    return `${breadcrumb(tx('发行范围','Release scope'))}${pageHead(tx('发行范围','Release scope'),tx('选择计划发行的国家／地区、平台和时间。','Choose target markets, platforms and release time.'),tag(statusLabels[current.release_scope_status] || current.release_scope_status,statusTone(current.release_scope_status)))}<form class="gh-card" id="scopeForm"><header class="gh-card-head"><div><h2>${tx('市场与平台','Markets & platforms')}</h2><p>${tx('中国大陆、中国香港、中国澳门和中国台湾分开选择。','Mainland China, Hong Kong, Macao and Taiwan are selected separately.')}</p></div></header><div class="gh-card-body"><div class="gh-grid-2"><div class="gh-field wide"><label for="marketSearch">${tx('搜索国家或地区','Search markets')}</label><input class="gh-input" id="marketSearch" data-action="market-search" value="${escapeHtml(state.marketKeyword)}" placeholder="${tx('输入名称或代码','Name or code')}"></div><div class="gh-field wide"><div class="d6-market-grid">${visible.map(([code,zh,en]) => `<label class="d6-market-option"><input type="checkbox" name="markets" value="${code}" ${state.selectedMarkets.includes(code) ? 'checked':''}> <span>${tx(zh,en)}</span><small>${code}</small></label>`).join('')}</div></div><div class="gh-field wide"><span class="gh-label gh-required">${tx('支持平台','Platforms')}</span><div class="gh-checks"><label><input type="checkbox" name="release_platforms" value="Windows" checked> Windows</label><label><input type="checkbox" name="release_platforms" value="macOS" checked> macOS</label><label><input type="checkbox" name="release_platforms" value="Linux"> Linux</label></div></div>${field({label:tx('计划发行时间','Planned release'),name:'release_at',type:'datetime-local',value:'2026-11-20T14:30',required:true})}<div class="gh-field"><label for="timezone">${tx('时区','Time zone')}</label><select class="gh-select" id="timezone" name="timezone"><option>UTC+08:00 北京</option><option>UTC+00:00 伦敦</option><option>UTC-08:00 洛杉矶</option></select></div></div><div class="gh-form-actions">${button(tx('保存草稿','Save draft'),'save-scope')}${button(tx('提交审核','Submit for review'),'submit-scope','primary')}</div></div></form>`;
  }
  function renderContract() {
    const current = ctx.read();
    return `${breadcrumb(tx('合同状态','Contract'))}${pageHead(tx('合同状态','Contract'),tx('查看当前合作合同，内容由平台运营维护。','View the active publishing contract managed by operations.'),tag(statusLabels[current.contract_status] || current.contract_status,statusTone(current.contract_status)))}<section class="gh-card"><header class="gh-card-head"><div><h2>${tx('合同信息','Contract information')}</h2><p>${tx('如有疑问，请联系 dev@xiaoji.com。','Contact dev@xiaoji.com if you have questions.')}</p></div></header><div class="gh-card-body"><div class="gh-grid-2">${readonly(tx('合同编号','Contract no.'),'GH-PC-2026-091')}${readonly(tx('合作类型','Cooperation type'),tx('平台代理发行','Platform publishing'))}${readonly(tx('有效期','Validity'),`2026-09-01 ${tx('至','to')} ${current.contract_valid_to}`)}${readonly(tx('当前状态','Status'),statusLabels[current.contract_status] || current.contract_status)}${readonly(tx('确认时间','Confirmed at'),'2026-09-01 18:30')}${readonly(tx('对接邮箱','Contact'),'dev@xiaoji.com')}</div></div></section>`;
  }
  const filteredReviews = () => state.reviewRows.filter(row => (!state.reviewFilters.keyword || `${row.id}${row.game}${row.vendor}`.includes(state.reviewFilters.keyword)) && (!state.reviewFilters.type || row.type === state.reviewFilters.type) && (!state.reviewFilters.status || row.status === state.reviewFilters.status));
  function renderReviews() {
    const rows = filteredReviews();
    return `${pageHead('游戏资料审核','查看商店资料、游戏资质和发行范围申请。')}<section class="gh-card"><div class="gh-filter"><input class="gh-input" data-filter="keyword" value="${escapeHtml(state.reviewFilters.keyword)}" placeholder="搜索申请编号、游戏或厂商"><select class="gh-select" data-filter="type"><option value="">全部类型</option>${['商店展示资料','游戏资质','发行范围'].map(value => `<option ${state.reviewFilters.type === value ? 'selected':''}>${value}</option>`).join('')}</select><select class="gh-select" data-filter="status"><option value="">全部状态</option><option value="pending" ${state.reviewFilters.status === 'pending' ? 'selected':''}>审核中</option><option value="supplement" ${state.reviewFilters.status === 'supplement' ? 'selected':''}>待补充</option><option value="approved" ${state.reviewFilters.status === 'approved' ? 'selected':''}>已通过</option><option value="rejected" ${state.reviewFilters.status === 'rejected' ? 'selected':''}>未通过</option></select><button class="gh-button" data-action="reset-review-filter">重置</button></div><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>申请编号</th><th>游戏／厂商</th><th>申请类型</th><th>版本</th><th>状态</th><th>提交时间</th><th>操作</th></tr></thead><tbody>${rows.length ? rows.map(row => `<tr><td><strong>${row.id}</strong></td><td><strong>${row.game}</strong><small>${row.vendor}</small></td><td>${row.type}</td><td>${row.version}</td><td>${tag(statusLabels[row.status],statusTone(row.status))}</td><td>${row.submitted}</td><td><div class="gh-row-actions">${button('查看详情','review-detail','link',`data-id="${row.id}"`)}${row.status === 'pending' ? button('通过','quick-approve','link',`data-id="${row.id}"`) : ''}</div></td></tr>`).join('') : `<tr><td colspan="7"><div class="gh-empty">未找到匹配申请</div></td></tr>`}</tbody></table></div><div class="gh-pagination">共 ${rows.length} 条</div></section>`;
  }
  function activeReview() {
    return state.reviewRows.find(row => row.id === hashParams().get('id')) || state.reviewRows[0];
  }
  function renderReviewDetail() {
    const review = activeReview();
    return `${breadcrumb('审核详情')}${pageHead('审核详情',`${review.id} · ${review.type}`,`${button('返回列表','back-reviews')}${review.status === 'pending' ? `${button('要求补充','review-supplement')}${button('拒绝','review-reject','danger')}${button('通过','review-approve','primary')}` : ''}`)}<section class="gh-grid-3">${readonly('游戏',review.game,ctx.read().game_id)}${readonly('厂商',review.vendor,ctx.read().vendor_id)}${readonly('提交版本',review.version,review.submitted)}</section><section class="gh-card"><header class="gh-card-head"><div><h2>本次提交</h2><p>运营只审核，不修改开发者原值。</p></div>${tag(statusLabels[review.status],statusTone(review.status))}</header><div class="gh-card-body"><div class="gh-kv"><span>申请类型</span><strong>${review.type}</strong></div><div class="gh-kv"><span>申请主体</span><strong>星海互动科技有限公司</strong></div><div class="gh-kv"><span>关联游戏</span><strong>星海远征（GAME-48291）</strong></div><div class="gh-kv"><span>附件</span><div><a href="#" data-action="preview-file">软件著作权证明.png</a> · <a href="#" data-action="preview-file">授权证明.png</a></div></div></div></section><section class="gh-card"><header class="gh-card-head"><div><h2>与上一通过版本对比</h2><p>仅展示实际变更字段。</p></div></header><div><div class="d6-diff"><span>字段</span><del>上一版</del><ins>本次提交</ins></div><div class="d6-diff"><span>授权截止日</span><del>2027-07-31</del><ins>2028-07-31</ins></div><div class="d6-diff"><span>授权范围</span><del>海外地区</del><ins>全球（不含受限地区）</ins></div></div></section>`;
  }
  function renderContractAdmin() {
    const current = ctx.read();
    return `${pageHead('合同状态维护','为开发者维护当前合同状态。')}<form class="gh-card" id="contractForm"><header class="gh-card-head"><div><h2>合同信息</h2><p>保存后同步到开发者端合同状态页。</p></div>${tag(statusLabels[current.contract_status],statusTone(current.contract_status))}</header><div class="gh-card-body"><div class="gh-grid-2">${field({label:'合同编号',name:'contract_no',value:'GH-PC-2026-091',required:true})}<div class="gh-field"><label for="contract_type">合作类型</label><select class="gh-select" id="contract_type" name="contract_type"><option>平台代理发行</option><option>联合发行</option></select></div>${field({label:'生效日',name:'valid_from',type:'date',value:'2026-09-01',required:true})}${field({label:'截止日',name:'valid_to',type:'date',value:current.contract_valid_to,required:true})}<div class="gh-field"><label for="contract_status">状态</label><select class="gh-select" id="contract_status" name="contract_status"><option value="effective" ${current.contract_status === 'effective' ? 'selected':''}>生效中</option><option value="expired" ${current.contract_status === 'expired' ? 'selected':''}>已过期</option><option value="terminated" ${current.contract_status === 'terminated' ? 'selected':''}>已终止</option></select></div>${field({label:'确认人',name:'confirmed_by',value:'李瑜',required:true})}${field({label:'证据链接',name:'evidence_url',value:'https://docs.google.com/document/u/0/',type:'url',required:true,wide:true,hint:'仅运营端可见。'})}</div><div class="gh-form-actions">${button('保存','save-contract','primary')}</div></div></form>`;
  }
  function renderDialog() {
    if (!state.dialog) return '';
    if (state.dialog === 'review-action') {
      const label = state.activeAction === 'approved' ? '通过' : state.activeAction === 'supplement' ? '要求补充' : '拒绝';
      const reasonRequired = state.activeAction !== 'approved';
      return `<div class="gh-dialog-layer"><section class="gh-dialog" role="dialog" aria-modal="true" aria-label="${label}"><header class="gh-dialog-head"><div><h2>${label}申请</h2><p>${reasonRequired ? '原因将在平台内完整展示给开发者。' : '通过后开发者将看到最新状态。'}</p></div><button class="gh-dialog-close" data-action="close-dialog">×</button></header><div class="gh-dialog-body"><div class="gh-field"><label class="${reasonRequired ? 'gh-required':''}" for="reviewReason">处理意见</label><textarea class="gh-textarea" id="reviewReason" maxlength="500" placeholder="${reasonRequired ? '请输入 1—500 字' : '选填'}"></textarea><div class="gh-error">${escapeHtml(state.actionError)}</div></div></div><footer class="gh-dialog-foot">${button('取消','close-dialog')}${button('确认'+label,'confirm-review',state.activeAction === 'rejected' ? 'danger' : 'primary')}</footer></section></div>`;
    }
    return '';
  }
  function renderPage() {
    const route = currentRoute();
    const pages = { games:renderGames, create:renderCreate, overview:renderOverview, profile:renderProfile, qualification:renderQualification, scope:renderScope, contract:renderContract, reviews:renderReviews, 'review-detail':renderReviewDetail, 'contract-admin':renderContractAdmin };
    return pages[route.page]();
  }
  function render() {
    const route = currentRoute();
    document.documentElement.lang = lang() === 'en' ? 'en' : 'zh-CN';
    app.innerHTML = `<div class="gh-app">${topbar(route.role)}<div class="gh-layout">${sidebar(route.role)}<main class="gh-main"><div class="gh-content">${renderPage()}</div></main></div>${renderDialog()}${state.toast ? `<div class="gh-toast ${state.toastError ? 'error':''}" role="status">${escapeHtml(state.toast)}</div>` : ''}</div>`;
  }
  const syncFiles = input => {
    const label = document.querySelector(`[data-upload-label="${input.dataset.upload}"]`);
    if (label) label.textContent = input.files.length ? [...input.files].map(file => file.name).join('、') : '选择文件';
  };
  document.addEventListener('input', event => {
    if (event.target.matches('[data-filter]')) { state.reviewFilters[event.target.dataset.filter] = event.target.value; render(); }
    if (event.target.matches('[data-action="market-search"]')) { state.marketKeyword = event.target.value; render(); requestAnimationFrame(() => document.querySelector('#marketSearch')?.focus()); }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-upload]')) syncFiles(event.target);
    if (event.target.name === 'markets') {
      state.selectedMarkets = [...document.querySelectorAll('[name="markets"]:checked')].map(item => item.value);
    }
  });
  document.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      const id = routeButton.dataset.route;
      if (routes[id]) routeTo(id);
      else if (id.startsWith('P07')) location.href = `07-开发接入与资源中心demo.html#/${id}`;
      else if (id.startsWith('P08')) location.href = `08-消息通知中心demo.html#/${id}`;
      return;
    }
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    if (action === 'create-game') return routeTo('P06-02');
    if (action === 'back-games') return routeTo('P06-01');
    if (action === 'enter-game') return routeTo('P06-03');
    if (action === 'go-qualification') return routeTo('P06-05');
    if (action === 'open-resources') { location.href = '07-开发接入与资源中心demo.html#/P07-01'; return; }
    if (action === 'open-messages') { location.href = '08-消息通知中心demo.html#/P08-01'; return; }
    if (action === 'submit-create') {
      const form = document.querySelector('#createGameForm');
      const zh = form.elements.game_name_zh.value.trim(); const en = form.elements.game_name_en.value.trim();
      const platforms = [...form.querySelectorAll('[name="platforms"]:checked')].map(item => item.value);
      if (!zh || !en || !platforms.length) return showToast(tx('请填写中英文名称并选择至少一个平台','Complete both titles and select at least one platform.'),true);
      ctx.write({ game_id:'GAME-48291', app_id:'APP-7F3A9C', game_name_zh:zh, game_name_en:en, target_platforms:platforms });
      ctx.emitEvent({ event_source:'game', entity_id:'GAME-48291', event_type:'game_created', event_status:'success', deep_link:'06-游戏创建与发行资料demo.html#/P06-03', title_zh:'游戏创建成功', title_en:'Game created', body_zh:'游戏项目已创建，可继续完善发行资料。', body_en:'The game project is ready for publishing profile setup.' });
      return routeTo('P06-03');
    }
    if (action === 'save-profile') return showToast(tx('草稿已保存','Draft saved'));
    if (action === 'submit-profile') {
      ctx.write({ profile_status:'pending', profile_version:`PROFILE-${Date.now()}` });
      ctx.emitEvent({ event_source:'profile', entity_id:ctx.read().game_id, event_type:'profile_review', event_status:'pending', deep_link:'06-游戏创建与发行资料demo.html#/P06-04', title_zh:'商店展示资料已提交', title_en:'Store profile submitted' });
      return showToast(tx('已提交审核','Submitted for review'));
    }
    if (action === 'save-qualification') return showToast(tx('草稿已保存','Draft saved'));
    if (action === 'submit-qualification') {
      ctx.write({ qualification_status:'pending', qualification_version:`QUAL-${Date.now()}` });
      ctx.emitEvent({ event_source:'qualification', entity_id:ctx.read().game_id, event_type:'qualification_review', event_status:'pending', deep_link:'06-游戏创建与发行资料demo.html#/P06-05', title_zh:'游戏资质已提交', title_en:'Qualifications submitted', body_zh:'资质已进入平台审核。', body_en:'Qualifications are under platform review.' });
      return showToast(tx('资质已提交，不影响其他流程','Qualifications submitted without blocking other flows'));
    }
    if (action === 'save-scope') return showToast(tx('发行范围草稿已保存','Release scope draft saved'));
    if (action === 'submit-scope') {
      if (!state.selectedMarkets.length) return showToast(tx('请至少选择一个国家或地区','Select at least one market'),true);
      ctx.write({ release_scope_status:'pending', release_scope_version:`SCOPE-${Date.now()}`, release_scope:{ regions:state.selectedMarkets } });
      ctx.emitEvent({ event_source:'release_scope', entity_id:ctx.read().game_id, event_type:'scope_review', event_status:'pending', deep_link:'06-游戏创建与发行资料demo.html#/P06-06', title_zh:'发行范围已提交', title_en:'Release scope submitted' });
      return showToast(tx('已提交审核','Submitted for review'));
    }
    if (action === 'reset-review-filter') { state.reviewFilters = {keyword:'',type:'',status:''}; return render(); }
    if (action === 'review-detail') return routeTo('P06-09',`id=${encodeURIComponent(control.dataset.id)}`);
    if (action === 'back-reviews') return routeTo('P06-08');
    if (action === 'quick-approve') {
      const row = state.reviewRows.find(item => item.id === control.dataset.id); if (row) row.status = 'approved'; showToast('已通过该申请'); return;
    }
    if (['review-supplement','review-reject','review-approve'].includes(action)) {
      state.activeAction = action === 'review-supplement' ? 'supplement' : action === 'review-reject' ? 'rejected' : 'approved'; state.dialog = 'review-action'; state.actionError = ''; return render();
    }
    if (action === 'close-dialog') { state.dialog = ''; state.actionError = ''; return render(); }
    if (action === 'confirm-review') {
      const reason = document.querySelector('#reviewReason')?.value.trim() || '';
      if (state.activeAction !== 'approved' && !reason) { state.actionError = '请填写处理原因'; return render(); }
      const row = activeReview(); row.status = state.activeAction;
      const key = row.object === 'release_scope' ? 'release_scope_status' : `${row.object}_status`;
      ctx.write({ [key]:state.activeAction });
      ctx.emitEvent({ event_source:row.object, entity_id:ctx.read().game_id, event_type:'review_result', event_status:state.activeAction, deep_link:`06-游戏创建与发行资料demo.html#/${row.object === 'profile' ? 'P06-04' : row.object === 'qualification' ? 'P06-05' : 'P06-06'}`, title_zh:`${row.type}${statusLabels[state.activeAction]}`, title_en:`${row.type} review updated`, reason });
      state.dialog = ''; routeTo('P06-08'); return;
    }
    if (action === 'save-contract') {
      const form = document.querySelector('#contractForm');
      ctx.write({ contract_status:form.elements.contract_status.value, contract_valid_to:form.elements.valid_to.value, contract_version:`CONTRACT-${Date.now()}` });
      return showToast('合同状态已保存');
    }
    if (action === 'preview-file') { event.preventDefault(); return showToast('正在预览附件'); }
  });
  window.addEventListener('hashchange', render);
  if (!location.hash) routeTo('P06-01'); else render();
})();
