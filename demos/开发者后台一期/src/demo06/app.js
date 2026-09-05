(function startGameProfileReleaseDemo() {
  const root = document.getElementById('app');
  const data = JSON.parse(document.getElementById('portal-data').textContent);
  const hashQuery = new URLSearchParams((location.hash.split('?')[1] || ''));
  const COUNTRY_CODES = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  const COMMON_MARKET_CODES = ['US','CN','RU','FR','DE','JP','IN','HK','GB','ID','TH','AU','CA','BR','TR','PH','TW','SG','NL','IT','MX','IQ','PK','CO','EG','DZ','AR','VN','VE'];
  const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['zh-CN'], { type: 'region' }) : null;
  const regionOverrides = { CN: '中国大陆', HK: '中国香港', TW: '中国台湾', US: '美国', GB: '英国', TR: '土耳其', KR: '韩国', MO: '中国澳门' };
  const countryLabel = code => regionOverrides[code] || regionNames?.of(code) || code;
  const mainlandStatusLabels = {
    not_planned: '暂不在中国大陆发行',
    preparing: '准备中／尚未取得版号',
    applying: '版号申请中',
    approved: '已取得版号',
    change_pending: '变更审批中',
    abnormal: '审批信息异常',
  };
  const state = {
    view: hashQuery.get('view') === 'games' ? 'games' : 'game',
    mainTab: hashQuery.get('tab') || 'overview',
    section: hashQuery.get('section') || 'profile',
    language: 'zh',
    profileEditing: false,
    profileSaved: true,
    qualificationEditing: false,
    qualificationType: 'agency',
    qualificationStatus: 'approved',
    qualificationVersion: 'QUAL-20260903-002',
    skuReady: true,
    releaseEditing: false,
    releaseReady: false,
    releaseDraft: {
      regions: ['US', 'CA', 'GB', 'FR', 'DE', 'JP', 'SG', 'HK', 'TW'],
      platforms: ['Windows', 'macOS', 'Linux'],
      releaseAt: '2026-10-16T10:00',
      timezone: 'UTC+8 北京时间',
      restricted: '受国际制裁或授权限制地区',
    },
    confirmedReleaseScope: null,
    mainlandStatus: hashQuery.get('mainland') === 'approved' ? 'approved' : 'not_planned',
    mainlandReviewPassed: hashQuery.get('mainland') === 'approved',
    mainlandOrigin: 'domestic',
    mainlandQualification: {
      approvalName: '星海远征',
      category: '客户端',
      approvalNumber: '国新出审〔2026〕482号',
      isbn: 'ISBN 978-7-498-14829-6',
      publisher: '示例数字出版有限公司',
      operator: '星海互动科技有限公司',
      approvalDate: '2026-06-18',
    },
    marketDialog: false,
    marketSearch: '',
    marketSelectionDraft: [],
    resumeApplicationAfterSave: false,
    productDialog: false,
    applicationDialog: false,
    applicationStage: 'pioneer',
    reviewSnapshots: [],
    lastSubmittedSnapshot: null,
    showApplicationSuccess: false,
    accountType: hashQuery.get('account') === 'personal' ? 'personal' : 'enterprise',
    toast: '',
  };

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const tag = (label, tone = 'info') => `<span class="d6-tag ${tone}">${escapeHtml(label)}</span>`;
  const button = (label, action, variant = '', extra = '') => `<button type="button" class="d6-button ${variant}" data-action="${action}" ${extra}>${escapeHtml(label)}</button>`;
  const field = ({ label, name, value = '', type = 'text', wide = false, hint = '', required = false }) => `<div class="d6-field${wide ? ' wide' : ''}"><label for="${name}">${escapeHtml(label)}${required ? '<em>*</em>' : ''}</label><input class="d6-input" id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}">${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</div>`;
  const selectField = ({ label, name, options, value, wide = false, required = false }) => `<div class="d6-field${wide ? ' wide' : ''}"><label for="${name}">${escapeHtml(label)}${required ? '<em>*</em>' : ''}</label><select class="d6-select" id="${name}" name="${name}">${options.map(option => `<option ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></div>`;
  const textareaField = ({ label, name, value, hint = '' }) => `<div class="d6-field wide"><label for="${name}">${escapeHtml(label)}</label><textarea class="d6-textarea" id="${name}" name="${name}">${escapeHtml(value)}</textarea>${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</div>`;

  const mainTabs = [
    ['overview', '概览', '◎'],
    ['store', '发行准备', '▤'],
    ['operations', '游戏运营', '⇧'],
    ['services', '游戏服务', '⌘'],
    ['analytics', '数据分析', '▥'],
  ];
  const storeSections = [
    ['profile', '游戏资料'],
    ['qualification', '游戏资质'],
    ['products', '商品与 SKU'],
    ['release-scope', '发行范围'],
  ];
  const pageTitles = {
    overview: `${data.game.name}发行概览`,
    profile: '游戏资料',
    qualification: '游戏资质',
    products: '商品与 SKU',
    'release-scope': '发行范围',
    operations: '游戏运营',
    services: '游戏服务',
    analytics: '数据分析',
  };

  const currentPageKey = () => state.mainTab === 'store' ? state.section : state.mainTab;
  const currentSectionLabel = () => state.mainTab === 'store'
    ? storeSections.find(([id]) => id === state.section)?.[1] || '游戏资料'
    : mainTabs.find(([id]) => id === state.mainTab)?.[1] || '概览';
  const qualificationPassed = () => state.qualificationStatus === 'approved';
  const includesMainland = scope => Boolean(scope?.regions?.includes('CN'));
  const mainlandReleaseReady = () => state.mainlandStatus === 'approved' && state.mainlandReviewPassed;
  const marketNames = codes => (codes || []).map(countryLabel);
  const formatMarkets = codes => marketNames(codes).join('、');
  const compactMarkets = codes => {
    const names = marketNames(codes);
    return names.length > 5 ? `${names.slice(0, 4).join('、')} 等 ${names.length} 个国家／地区` : names.join('、');
  };
  const stageLabel = stage => ({ pioneer: '先锋测试', prerelease: '预发布', live: '正式发行' }[stage] || '先锋测试');
  const formatReleaseAt = value => String(value || '').replace('T', ' ');
  const brandLogo = () => `<svg aria-hidden="true" viewBox="0 0 36 36" fill="currentColor"><path d="M29.7825 9.09231C29.9715 9.09231 30.1478 9.18557 30.2521 9.34061L32.112 12.1066L32.1122 12.1071L34.0737 15.0453L35.9066 17.7713C36.0311 17.9566 36.0311 18.1971 35.9066 18.3823L34.0737 21.1084L32.1122 24.0466L32.112 24.0471L30.136 26.9857L28.2906 29.7502C28.1865 29.9061 28.0096 30 27.82 30H24.8191C24.3712 30 24.1026 29.5104 24.3484 29.1421L25.9117 26.8003L25.9121 26.7998L27.888 23.8612L29.8493 20.923L29.8497 20.9225L31.5576 18.3823C31.6822 18.1971 31.6822 17.9566 31.5576 17.7713L29.8497 15.2311L29.8493 15.2307L28.1053 12.618C28.0012 12.4621 27.8242 12.3681 27.6346 12.3681H12.995C12.5462 12.3681 12.2778 11.8769 12.5254 11.5088L13.9832 9.34061C14.0875 9.18556 14.2639 9.09231 14.4529 9.09231H29.7825ZM11.1868 6C11.6352 6 11.9037 6.49052 11.6568 6.85876L4.44386 17.6182C4.31986 17.8032 4.31986 18.0431 4.44386 18.228L7.89982 23.3829C8.00401 23.5383 8.18064 23.6319 8.3699 23.6319H23.0095C23.4575 23.6319 23.7261 24.1216 23.48 24.4898L22.0318 26.658C21.9276 26.8138 21.7508 26.9077 21.5612 26.9077H6.20804C6.01868 26.9077 5.84198 26.814 5.73782 26.6585L0.092826 18.228C-0.0310117 18.0431 -0.0309333 17.8033 0.0930093 17.6185L7.7152 6.24893C7.8194 6.09352 7.99603 6 8.18529 6H11.1868ZM12.8435 14.9538C13.0508 14.9538 13.2189 15.1192 13.2189 15.3231V16.5041C13.2189 16.708 13.3869 16.8733 13.5943 16.8733H14.8097C15.017 16.8733 15.1851 17.0386 15.1851 17.2426V18.7574C15.1851 18.9614 15.017 19.1267 14.8097 19.1267H13.5943C13.3869 19.1267 13.2189 19.292 13.2189 19.4959V20.6769C13.2189 20.8808 13.0508 21.0462 12.8435 21.0462H11.2861C11.0788 21.0462 10.9108 20.8808 10.9108 20.6769V19.4959C10.9108 19.292 10.7427 19.1267 10.5354 19.1267H9.31992C9.11261 19.1267 8.94456 18.9614 8.94455 18.7574V17.2426C8.94456 17.0386 9.11261 16.8733 9.31992 16.8733H10.5354C10.7427 16.8733 10.9108 16.708 10.9108 16.5041V15.3231C10.9108 15.1192 11.0788 14.9538 11.2861 14.9538H12.8435ZM20.2057 16.1077C21.2681 16.1077 22.1294 16.9549 22.1294 18C22.1294 19.0451 21.2681 19.8923 20.2057 19.8923C19.1432 19.8923 18.2819 19.0451 18.2819 18C18.2819 16.9549 19.1432 16.1077 20.2057 16.1077ZM25.8831 16.1077C26.9456 16.1077 27.8069 16.9549 27.8069 18C27.8069 19.0451 26.9456 19.8923 25.8831 19.8923C24.8207 19.8923 23.9594 19.0451 23.9594 18C23.9594 16.9549 24.8207 16.1077 25.8831 16.1077Z"/></svg>`;
  const includedSkusForStage = stage => stage === 'pioneer' ? ['标准版（测试权益）'] : ['标准版'];
  const currentReleaseScope = () => state.confirmedReleaseScope || state.releaseDraft;

  const renderTopbar = () => `<header class="d6-topbar">
    <div class="d6-brand"><span class="d6-brand-mark">${brandLogo()}</span><span class="d6-brand-copy"><strong>PC 发行平台</strong><small>开发者中心</small></span></div>
    <div class="d6-top-actions">
      <button class="d6-top-link" type="button" data-action="top-help">ⓘ 帮助中心</button>
      <button class="d6-top-link" type="button" data-action="top-download">⇩ 下载中心</button>
      <button class="d6-top-link" type="button" data-action="top-language">切换英语</button>
      <button class="d6-account" type="button" data-action="account-info"><span class="d6-account-avatar">王</span><span class="d6-account-copy"><strong>${escapeHtml(data.account.name)}</strong><small>${state.accountType === 'enterprise' ? '企业认证通过' : '个人开发者'}</small></span><span>⌄</span></button>
    </div>
  </header>`;

  const renderMainNavButton = ([id, label]) => `<button type="button" class="${state.mainTab === id ? 'is-active' : ''}" data-nav-label="${escapeHtml(label)}" data-action="main-tab" data-tab="${id}">${label}</button>`;
  const renderGameSidebar = () => `<aside class="d6-sidebar d6-game-sidebar">
    <div class="d6-game-sidebar-search"><input type="search" data-nav-search aria-label="搜索侧边栏功能" placeholder="搜索功能"></div>
    <nav class="d6-nav d6-game-nav" aria-label="单游戏控制台">
      ${renderMainNavButton(mainTabs[0])}
      <div class="d6-nav-group">
        <button type="button" class="d6-nav-group-trigger${state.mainTab === 'store' ? ' is-current' : ''}" data-nav-label="发行准备" data-action="main-tab" data-tab="store"><span>发行准备</span><span class="d6-nav-chevron" aria-hidden="true">⌄</span></button>
        <div class="d6-nav-sub">${storeSections.map(([id, label]) => `<button type="button" class="${state.mainTab === 'store' && state.section === id ? 'is-active' : ''}" data-nav-label="${escapeHtml(label)}" data-action="store-section" data-section="${id}">${label}</button>`).join('')}</div>
      </div>
      ${mainTabs.slice(2).map(renderMainNavButton).join('')}
    </nav>
    <p class="d6-nav-empty" hidden>未找到相关功能</p>
  </aside>`;
  const renderPlatformSidebar = () => `<aside class="d6-sidebar"><div class="d6-sidebar-title">开发者控制台</div><nav class="d6-nav d6-platform-nav"><button type="button" class="is-active" data-icon="◎">游戏管理</button><button type="button" data-icon="▥" data-action="platform-data">数据总览</button><button type="button" data-icon="⌂" data-action="vendor-settings">厂商设置</button></nav></aside>`;

  const renderBreadcrumb = () => `<nav class="d6-breadcrumb" aria-label="当前位置"><button type="button" data-action="back-games">游戏管理</button><em>/</em><span>${escapeHtml(data.game.name)}</span><em>/</em><span>${escapeHtml(currentSectionLabel())}</span></nav>`;
  const renderPageHead = () => {
    const title = pageTitles[currentPageKey()] || pageTitles.overview;
    const action = state.mainTab === 'store' && state.section === 'profile'
      ? button(state.profileEditing ? '取消编辑' : '编辑游戏资料', state.profileEditing ? 'cancel-profile' : 'edit-profile')
      : state.mainTab === 'store' && state.section === 'qualification'
        ? button(state.qualificationEditing ? '取消编辑' : '编辑资质材料', state.qualificationEditing ? 'cancel-qualification' : 'edit-qualification')
        : state.mainTab === 'store' && state.section === 'products'
          ? button('新增商品资料', 'open-product')
          : state.mainTab === 'store' && state.section === 'release-scope'
            ? button(state.releaseEditing ? '取消编辑' : '编辑发行范围', state.releaseEditing ? 'cancel-release' : 'edit-release')
            : '';
    return `<header class="d6-page-head"><h1>${escapeHtml(title)}</h1><div class="d6-actions">${action}${button('申请平台测试／发行', 'open-application', 'primary')}</div></header>`;
  };

  const renderOverview = () => {
    const scopeStatus = state.releaseReady ? ['已确认', 'success'] : ['待确认', 'warning'];
    const latestSnapshot = state.reviewSnapshots[state.reviewSnapshots.length - 1];
    const snapshotTimeline = [...state.reviewSnapshots].reverse().map(snapshot => `<article><h3>${escapeHtml(snapshot.stageLabel)}申请 · 审核中</h3><p>范围：${escapeHtml(formatMarkets(snapshot.releaseScope.regions))}；平台：${escapeHtml(snapshot.releaseScope.platforms.join(' / '))}；发行时间：${escapeHtml(formatReleaseAt(snapshot.releaseScope.releaseAt))}；SKU：${escapeHtml(snapshot.skus.join('、'))}；Build：${escapeHtml(snapshot.buildId)}；价格版本：${escapeHtml(snapshot.priceVersion)}。${snapshot.excludedMarkets?.length ? ` 本次未包含：${escapeHtml(formatMarkets(snapshot.excludedMarkets))}。` : ''}</p><time>${escapeHtml(snapshot.submittedAt)} · ${escapeHtml(snapshot.id)}</time></article>`).join('');
    return `<section>
      <div class="d6-overview-hero"><div class="d6-game-art">🎮</div><div class="d6-game-copy"><small>当前游戏</small><h2>${escapeHtml(data.game.name)}</h2><p>${escapeHtml(data.game.gameId)} · ${escapeHtml(data.game.appId)}</p></div><div class="d6-hero-stats"><div><span>当前阶段</span><strong>${latestSnapshot ? `${escapeHtml(latestSnapshot.stageLabel)}审核中` : escapeHtml(data.game.stage)}</strong></div><div><span>资料版本</span><strong>${latestSnapshot ? escapeHtml(latestSnapshot.profileVersion) : '编辑草稿 05'}</strong></div></div></div>
      <div class="d6-readiness">
        <article><span>01</span><strong>游戏资料</strong><small>多语言、素材与 PC 配置</small>${tag(state.profileSaved && !state.profileEditing ? '已完成' : '编辑中', state.profileSaved && !state.profileEditing ? 'success' : 'warning')}</article>
        <article><span>02</span><strong>游戏资质</strong><small>权属授权与发行范围一致</small>${tag(qualificationPassed() ? '已通过' : state.qualificationStatus === 'pending' ? '人工复核中' : '待补充', qualificationPassed() ? 'success' : state.qualificationStatus === 'pending' ? 'info' : 'warning')}</article>
        <article><span>03</span><strong>发行范围</strong><small>地区、平台与发行时间</small>${tag(scopeStatus[0], scopeStatus[1])}</article>
        <article><span>04</span><strong>PC 包体状态</strong><small>由包体与发布模块维护</small>${tag('Build 已就绪', 'success')}</article>
        <article><span>05</span><strong>价格状态</strong><small>由定价模块维护</small>${tag('价格已确认', 'success')}</article>
      </div>
      ${!state.releaseReady ? `<div class="d6-notice warning" style="margin-top:16px"><span><strong>发行范围尚未确认</strong>提交申请前需确认销售地区、支持平台和计划发行时间。</span><button type="button" data-action="go-release">前往完善</button></div>` : ''}
      <section class="d6-card"><header class="d6-card-head"><div><h2>提交与审核记录</h2><p>每次提交都会生成不可变快照，编辑草稿不会覆盖审核中的版本。</p></div>${tag(latestSnapshot ? '审核中' : '最近已通过', latestSnapshot ? 'info' : 'success')}</header><div class="d6-card-body"><div class="d6-timeline">${snapshotTimeline}<article><h3>游戏资质审核 · 已通过</h3><p>代理授权范围覆盖当前计划发行地区，有效期至 2027-12-31。</p><time>2026-09-03 16:18</time></article><article><h3>游戏资料修订 04 · 已保存</h3><p>已更新中英文介绍、语言支持和 PC 系统配置。</p><time>2026-09-03 14:42</time></article></div></div></section>
    </section>`;
  };

  const renderProfileRead = () => `<section class="d6-profile-layout"><section class="d6-card"><div class="d6-card-body"><div class="d6-preview"><small>商店详情预览 · 中文</small><h2>星海远征</h2><p>踏入未知星域，完成挑战并解锁新的能力与区域。</p><div class="d6-preview-tags"><span>动作</span><span>冒险</span><span>单人</span></div></div></div></section><section class="d6-card"><header class="d6-card-head"><div><h2>资料完整度</h2><p>当前草稿版本</p></div>${tag('6 / 6', 'success')}</header><div class="d6-card-body"><div class="d6-progress-list"><div class="d6-progress-row"><span class="d6-progress-index">✓</span><span class="d6-progress-copy"><strong>基础信息</strong><small>中英文名称与介绍</small></span>${tag('已完成','success')}</div><div class="d6-progress-row"><span class="d6-progress-index">✓</span><span class="d6-progress-copy"><strong>商店素材</strong><small>封面、图标、截图与视频</small></span>${tag('已完成','success')}</div><div class="d6-progress-row"><span class="d6-progress-index">✓</span><span class="d6-progress-copy"><strong>语言与 PC 配置</strong><small>Windows / macOS / Linux</small></span>${tag('已完成','success')}</div></div></div></section></section>
    <section class="d6-card"><header class="d6-card-head"><div><h2>资料摘要</h2><p>当前编辑草稿，不影响已提交的审核快照。</p></div></header><div class="d6-card-body d6-grid-3"><div class="d6-readonly-box"><span>支持语言</span><strong>简体中文、繁体中文、English、日语</strong><small>中文与 English 支持完整语音</small></div><div class="d6-readonly-box"><span>PC 支持系统</span><strong>Windows / macOS / Linux</strong><small>已填写最低与推荐配置</small></div><div class="d6-readonly-box"><span>商店素材</span><strong>封面 1 · 图标 1 · 截图 6 · 视频 1</strong><small>素材规格检查通过</small></div></div></section>`;

  const renderProfileEdit = () => `<section class="d6-card"><header class="d6-card-head"><div><h2>编辑游戏资料</h2><p>可分别维护中文和 English 商店资料。</p></div><div class="d6-segmented"><button type="button" class="${state.language === 'zh' ? 'is-active' : ''}" data-action="profile-language" data-language="zh">中文</button><button type="button" class="${state.language === 'en' ? 'is-active' : ''}" data-action="profile-language" data-language="en">English</button></div></header><div class="d6-card-body"><div class="d6-form-grid">${state.language === 'zh' ? `${field({ label:'游戏名称',name:'gameNameZh',value:'星海远征',required:true })}${field({ label:'短介绍',name:'shortZh',value:'踏入未知星域，开启你的远征。',required:true })}${textareaField({ label:'完整介绍',name:'descriptionZh',value:'在开放星域中探索未知世界，完成战斗、建造与成长挑战。',hint:'建议 80—1000 字，禁止包含价格或未确认的上线承诺。' })}` : `${field({ label:'Game title',name:'gameNameEn',value:'Ocean Expedition',required:true })}${field({ label:'Short description',name:'shortEn',value:'Begin your expedition beyond the stars.',required:true })}${textareaField({ label:'Full description',name:'descriptionEn',value:'Explore uncharted worlds and complete combat, building, and progression challenges.' })}`}
      <div class="d6-field wide"><label>Steam 标签映射</label><div class="d6-check-grid"><label class="d6-check"><input type="checkbox" checked> 动作</label><label class="d6-check"><input type="checkbox" checked> 冒险</label><label class="d6-check"><input type="checkbox" checked> 单人</label><label class="d6-check"><input type="checkbox"> 合作</label><label class="d6-check"><input type="checkbox"> 开放世界</label><label class="d6-check"><input type="checkbox"> 角色扮演</label></div></div>
      <div class="d6-field wide"><label>支持语言</label><div class="d6-check-grid"><label class="d6-check"><input type="checkbox" checked> 简体中文</label><label class="d6-check"><input type="checkbox" checked> 繁体中文</label><label class="d6-check"><input type="checkbox" checked> English</label><label class="d6-check"><input type="checkbox" checked> 日语</label></div></div>
      ${selectField({ label:'Windows 配置',name:'windowsConfig',options:['已填写最低与推荐配置','暂不支持'],value:'已填写最低与推荐配置' })}${selectField({ label:'macOS 配置',name:'macConfig',options:['已填写最低与推荐配置','暂不支持'],value:'已填写最低与推荐配置' })}${selectField({ label:'Linux 配置',name:'linuxConfig',options:['已填写最低与推荐配置','暂不支持'],value:'已填写最低与推荐配置' })}
      <div class="d6-field"><label>商店素材</label><div class="d6-dropzone" data-action="mock-upload">点击补充封面、截图或宣传视频<br><small>演示不上传真实文件</small></div></div>
    </div><div class="d6-footer-actions">${button('取消','cancel-profile')}${button('保存草稿','save-profile','primary')}</div></div></section>`;
  const renderProfile = () => state.profileEditing ? renderProfileEdit() : renderProfileRead();

  const renderQualification = () => {
    if (state.qualificationEditing) {
      const mainland = state.mainlandQualification;
      const showApprovalFields = ['approved', 'change_pending', 'abnormal'].includes(state.mainlandStatus);
      return `<section class="d6-card"><header class="d6-card-head"><div><h2>权属与授权</h2><p>所有游戏都需维护；材料要求随自研／代理关系和发行国家变化。</p></div><div class="d6-segmented"><button type="button" class="${state.qualificationType === 'self' ? 'is-active' : ''}" data-action="qualification-type" data-type="self">自研游戏</button><button type="button" class="${state.qualificationType === 'agency' ? 'is-active' : ''}" data-action="qualification-type" data-type="agency">代理发行</button></div></header><div class="d6-card-body"><div class="d6-notice"><span><strong>国内厂商不等于在中国大陆发行。</strong>仅面向海外发行时不强制版号，权属与授权仍需通过平台人工复核。</span></div><div class="d6-form-grid">${state.qualificationType === 'agency' ? `${field({label:'原始权利人',name:'rightsOwner',value:'Ocean Labs Pte. Ltd.',required:true})}${field({label:'直接授权方',name:'licensor',value:'Ocean Labs Pte. Ltd.',required:true})}${field({label:'被授权主体',name:'licensee',value:'星海互动科技有限公司',required:true})}${field({label:'授权有效期',name:'licenseEnd',value:'2027-12-31',type:'date',required:true})}${field({label:'授权国家／地区',name:'licenseRegions',value:'全球（不含中国大陆及受限制国家／地区）',wide:true,required:true})}<div class="d6-field wide"><label>授权链文件<em>*</em></label><div class="d6-dropzone" data-action="mock-upload">Ocean-Expedition-License-2026.pdf · 已上传<br><small>需覆盖 Product／SKU、PC 平台、销售渠道、盖世 Key 与有效期</small></div></div>` : `${field({label:'著作权主体',name:'rightsOwner',value:'星海互动科技有限公司',required:true})}${selectField({label:'权属证明类型',name:'rightsType',options:['自研及完整权利声明','软件著作权登记证书','相关公证','发行地区适用的其他证明'],value:'自研及完整权利声明',required:true})}<div class="d6-field wide"><label>权属证明<em>*</em></label><div class="d6-dropzone" data-action="mock-upload">点击上传自研声明或适用的权属证明<br><small>软件著作权是可选权属证明，不等同于中国大陆版号</small></div></div>`}</div><div class="d6-scope-matrix"><div><span>商品范围</span><strong>标准版、豪华版、DLC</strong></div><div><span>PC 平台</span><strong>Windows / macOS / Linux</strong></div><div><span>发行能力</span><strong>直接下载、盖世 Key、渠道 API</strong></div><div><span>第三方权利</span><strong>音乐、美术、字体、商标已声明</strong></div></div></div></section>
      <section class="d6-card"><header class="d6-card-head"><div><h2>中国大陆发行资质</h2><p>长期预留；不计划在中国大陆发行时不会阻断海外流程。</p></div>${tag(mainlandStatusLabels[state.mainlandStatus], state.mainlandStatus === 'approved' && state.mainlandReviewPassed ? 'success' : state.mainlandStatus === 'not_planned' ? 'info' : 'warning')}</header><div class="d6-card-body"><div class="d6-form-grid"><div class="d6-field"><label for="mainlandStatus">大陆发行状态</label><select class="d6-select" id="mainlandStatus">${Object.entries(mainlandStatusLabels).map(([value,label]) => `<option value="${value}" ${value === state.mainlandStatus ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></div><div class="d6-field"><label for="mainlandOrigin">申报类型</label><select class="d6-select" id="mainlandOrigin"><option value="domestic" ${state.mainlandOrigin !== 'imported' ? 'selected' : ''}>国产游戏</option><option value="imported" ${state.mainlandOrigin === 'imported' ? 'selected' : ''}>进口游戏</option></select><small>进口游戏需准备著作权合同登记批复及境外授权链</small></div></div><div class="d6-form-grid d6-mainland-approval-fields" ${showApprovalFields ? '' : 'hidden'}>${field({label:'批准游戏名称',name:'approvalName',value:mainland.approvalName,required:true})}${field({label:'客户端类别',name:'approvalCategory',value:mainland.category,hint:'PC 发行需覆盖“客户端”',required:true})}${field({label:'批复文号',name:'approvalNumber',value:mainland.approvalNumber,required:true})}${field({label:'ISBN',name:'approvalIsbn',value:mainland.isbn,required:true})}${field({label:'出版单位',name:'publisher',value:mainland.publisher,required:true})}${field({label:'运营单位',name:'operator',value:mainland.operator,required:true})}${field({label:'批准日期',name:'approvalDate',value:mainland.approvalDate,type:'date',required:true})}<div class="d6-field"><label>审批证明文件<em>*</em></label><div class="d6-dropzone compact" data-action="mock-upload">点击上传批复或证明文件</div></div></div><div class="d6-notice warning d6-mainland-guidance" ${state.mainlandStatus === 'not_planned' ? 'hidden' : ''}><span><strong>已有版号也需人工复核。</strong>平台将核对游戏名称、客户端类别、出版单位、运营单位及当前平台角色，不会自动放行。</span></div><div class="d6-footer-actions">${button('取消','cancel-qualification')}${button('提交平台人工复核','save-qualification','primary')}</div></div></section>`;
    }
    const qualificationLabel = qualificationPassed() ? '已通过' : state.qualificationStatus === 'pending' ? '审核中' : '待补充';
    const qualificationTone = qualificationPassed() ? 'success' : state.qualificationStatus === 'pending' ? 'info' : 'warning';
    const mainlandTone = state.mainlandStatus === 'approved' && state.mainlandReviewPassed ? 'success' : state.mainlandStatus === 'not_planned' ? 'info' : 'warning';
    const mainlandCopy = state.mainlandStatus === 'not_planned' ? '不影响海外发行' : state.mainlandStatus === 'approved' && state.mainlandReviewPassed ? '已通过平台人工复核' : '仅阻断中国大陆公开发行';
    const mainland = state.mainlandQualification;
    return `<div class="d6-notice${state.qualificationStatus === 'pending' ? ' warning' : ''}"><span><strong>${state.qualificationStatus === 'pending' ? '资质材料正在人工复核。' : '当前海外权属材料与计划发行范围一致。'}</strong>${state.qualificationStatus === 'pending' ? '人工复核通过前不会放行新的发行申请。' : '修改发行模式、SKU、Key 能力或新增授权范围外国家后需重新提交。'}</span></div><section class="d6-card"><header class="d6-card-head"><div><h2>权属与授权摘要</h2><p>代理发行 · 当前审核版本 ${escapeHtml(state.qualificationVersion)}</p></div>${tag(qualificationLabel,qualificationTone)}</header><div class="d6-card-body"><div class="d6-grid-3"><div class="d6-readonly-box"><span>原始权利人／授权方</span><strong>Ocean Labs Pte. Ltd.</strong><small>被授权主体：星海互动科技有限公司</small></div><div class="d6-readonly-box"><span>授权国家／地区</span><strong>全球（不含中国大陆及受限制地区）</strong><small>按国家编码与发行范围核对</small></div><div class="d6-readonly-box"><span>有效期</span><strong>2027-12-31</strong><small>到期前触发重新复核</small></div><div class="d6-readonly-box"><span>商品／平台</span><strong>标准版、豪华版、DLC</strong><small>Windows / macOS / Linux</small></div><div class="d6-readonly-box"><span>发行能力</span><strong>直接下载、盖世 Key、渠道 API</strong><small>允许平台向授权渠道提供权益</small></div><div class="d6-readonly-box"><span>第三方内容</span><strong>权利声明已提交</strong><small>音乐、美术、字体、商标与人物形象</small></div></div></div></section><section class="d6-card"><header class="d6-card-head"><div><h2>中国大陆发行资质</h2><p>厂商主体地区与实际发行地区分别判断。</p></div>${tag(mainlandStatusLabels[state.mainlandStatus],mainlandTone)}</header><div class="d6-card-body"><div class="d6-notice ${state.mainlandStatus === 'not_planned' ? '' : 'warning'}"><span><strong>${escapeHtml(mainlandCopy)}。</strong>${state.mainlandStatus === 'not_planned' ? '国内厂商仍可正常申请海外测试、发行和海外渠道 Key。' : '已有版号也需核对批准名称、客户端类别、出版与运营主体。'}</span></div>${state.mainlandStatus === 'approved' ? `<div class="d6-grid-3"><div class="d6-readonly-box"><span>批准游戏／类别</span><strong>${escapeHtml(mainland.approvalName)} · ${escapeHtml(mainland.category)}</strong><small>${escapeHtml(mainland.approvalNumber)}</small></div><div class="d6-readonly-box"><span>ISBN／批准日期</span><strong>${escapeHtml(mainland.isbn)}</strong><small>${escapeHtml(mainland.approvalDate)}</small></div><div class="d6-readonly-box"><span>出版／运营单位</span><strong>${escapeHtml(mainland.publisher)}</strong><small>${escapeHtml(mainland.operator)}</small></div></div>` : ''}</div></section><section class="d6-card"><header class="d6-card-head"><div><h2>材料清单</h2><p>按权属关系和实际发行国家动态生成。</p></div></header><div class="d6-table-wrap"><table class="d6-table"><thead><tr><th>材料</th><th>覆盖范围</th><th>文件</th><th>复核状态</th><th>更新时间</th></tr></thead><tbody><tr><td><strong>游戏发行授权链</strong><small>必需</small></td><td>SKU、PC、海外国家、盖世 Key 与渠道 API</td><td>Ocean-Expedition-License-2026.pdf</td><td>${tag(qualificationLabel,qualificationTone)}</td><td>${state.qualificationStatus === 'pending' ? '刚刚提交' : '2026-09-03 16:18'}</td></tr><tr><td><strong>第三方内容权利声明</strong><small>必需</small></td><td>音乐、美术、字体、商标与人物形象</td><td>Third-party-rights.pdf</td><td>${tag('已通过','success')}</td><td>2026-09-03 16:18</td></tr><tr><td><strong>软件著作权</strong><small>可选权属证明</small></td><td>海外发行不统一强制</td><td>—</td><td>${tag('无需提交','info')}</td><td>—</td></tr><tr><td><strong>中国大陆出版审批</strong><small>按发行地区适用</small></td><td>${escapeHtml(mainlandCopy)}</td><td>${state.mainlandStatus === 'approved' ? escapeHtml(mainland.approvalNumber) : '—'}</td><td>${tag(mainlandStatusLabels[state.mainlandStatus],mainlandTone)}</td><td>${state.mainlandStatus === 'approved' ? '2026-09-05 10:20' : '—'}</td></tr></tbody></table></div></section>`;
  };

  const renderProducts = () => `<div class="d6-notice"><span><strong>价格由定价模块维护。</strong>本页只编辑商品名称、版本类型和包含内容，并读取最新价格状态。</span></div><section class="d6-card"><header class="d6-card-head"><div><h2>商品与销售版本</h2><p>同一游戏可配置基础版本、多版本与 DLC。</p></div>${tag('3 个 SKU','info')}</header><div class="d6-table-wrap"><table class="d6-table"><thead><tr><th>商品 / SKU</th><th>类型</th><th>包含内容</th><th>供给方式</th><th>价格状态</th><th>销售状态</th><th>操作</th></tr></thead><tbody><tr><td><strong>标准版</strong><small>SKU-GLOBAL-001</small></td><td>基础游戏</td><td>游戏本体</td><td>直接下载 / CDKEY</td><td>${tag('已确认','success')}</td><td>${tag('预发布','info')}</td><td><button data-action="open-product">编辑资料</button></td></tr><tr><td><strong>远征者豪华版</strong><small>SKU-GLOBAL-002</small></td><td>游戏版本</td><td>本体 + 数字原声 + 外观包</td><td>直接下载 / CDKEY</td><td>${tag('待确认','warning')}</td><td>${tag('草稿','info')}</td><td><button data-action="open-product">编辑资料</button></td></tr><tr><td><strong>深空拓展包</strong><small>DLC-GLOBAL-001</small></td><td>DLC</td><td>新地图与任务线</td><td>直接下载</td><td>${tag('未配置','info')}</td><td>${tag('草稿','info')}</td><td><button data-action="open-product">编辑资料</button></td></tr></tbody></table></div></section><section class="d6-card"><header class="d6-card-head"><div><h2>模块交接状态</h2><p>避免资料模块与包体发布模块重复维护同一字段。</p></div></header><div class="d6-card-body d6-grid-2"><div class="d6-readonly-box"><span>PC 包体状态</span><strong>Build 20260904.3 已就绪</strong><small>来源：包体与发布模块 · 2026-09-04 10:30</small></div><div class="d6-readonly-box"><span>价格状态</span><strong>标准版全球价格已确认</strong><small>来源：定价模块 · 豪华版仍待确认</small></div></div></section>`;

  const renderReleaseScope = () => {
    const scope = currentReleaseScope();
    const platformOptions = ['Windows', 'macOS', 'Linux'];
    const selectedTags = state.releaseDraft.regions.map(code => `<span class="d6-market-tag${code === 'CN' ? ' mainland' : ''}">${escapeHtml(countryLabel(code))}</span>`).join('');
    const confirmedTags = scope.regions.map(code => `<span class="d6-market-tag${code === 'CN' ? ' mainland' : ''}">${escapeHtml(countryLabel(code))}</span>`).join('');
    if (state.releaseEditing) return `<section class="d6-card"><header class="d6-card-head"><div><h2>编辑发行范围</h2><p>按国家／地区保存，发布模块将在提交申请时读取本次范围快照。</p></div>${tag('编辑草稿','info')}</header><div class="d6-card-body"><div class="d6-form-grid"><div class="d6-field wide"><label>销售国家或地区<em>*</em></label><div class="d6-market-summary"><div><strong>${state.releaseDraft.regions.length ? escapeHtml(compactMarkets(state.releaseDraft.regions)) : '尚未选择国家／地区'}</strong><small>已选 ${state.releaseDraft.regions.length} 个；中国大陆、中国香港、中国台湾分别管理</small></div>${button('选择国家／地区','open-market-picker')}</div><div class="d6-market-tags">${selectedTags}</div></div>${includesMainland(state.releaseDraft) ? `<div class="d6-notice warning wide"><span><strong>已选择中国大陆。</strong>可以保存发行范围，但预发布／正式发行需通过大陆出版审批人工复核；未通过时仍可仅提交海外范围。</span></div>` : ''}<div class="d6-field wide"><label>支持平台<em>*</em></label><div class="d6-check-grid">${platformOptions.map(platform => `<label class="d6-check"><input name="platforms" type="checkbox" value="${escapeHtml(platform)}" ${state.releaseDraft.platforms.includes(platform) ? 'checked' : ''}> ${escapeHtml(platform)}</label>`).join('')}</div></div>${field({label:'计划发行时间',name:'releaseAt',type:'datetime-local',value:state.releaseDraft.releaseAt,required:true})}${selectField({label:'时区',name:'timezone',options:['UTC+8 北京时间','UTC 世界协调时','按用户当地时间'],value:state.releaseDraft.timezone})}${field({label:'不发行国家／地区说明',name:'restricted',value:state.releaseDraft.restricted,wide:true,hint:'全球发行统一表达为“全球（不含中国大陆及受限制国家／地区）”；最终以已选国家编码为准。'})}</div><div class="d6-footer-actions">${button('取消','cancel-release')}${button(state.resumeApplicationAfterSave ? '保存并继续申请' : '保存并确认范围','save-release','primary')}</div></div></section>`;
    return `<section class="d6-card"><header class="d6-card-head"><div><h2>当前发行范围</h2><p>${state.releaseReady ? '已确认，可在发行申请中生成国家级范围快照。' : '已填写但尚未确认，不能提交发行申请。'}</p></div>${tag(state.releaseReady ? '已确认' : '待确认', state.releaseReady ? 'success' : 'warning')}</header><div class="d6-card-body"><div class="d6-grid-3"><div class="d6-readonly-box"><span>销售国家或地区</span><strong>${escapeHtml(compactMarkets(scope.regions))}</strong><small>共 ${scope.regions.length} 个；不含 ${escapeHtml(scope.restricted)}</small></div><div class="d6-readonly-box"><span>支持平台</span><strong>${escapeHtml(scope.platforms.join(' / '))}</strong><small>与当前 Build 覆盖一致</small></div><div class="d6-readonly-box"><span>计划发行时间</span><strong>${escapeHtml(formatReleaseAt(scope.releaseAt))}</strong><small>${escapeHtml(scope.timezone)}</small></div></div><div class="d6-market-tags" aria-label="已选国家或地区">${confirmedTags}</div>${includesMainland(scope) ? `<div class="d6-notice warning" style="margin:16px 0 0"><span><strong>范围包含中国大陆。</strong>${mainlandReleaseReady() ? '大陆出版审批已通过人工复核。' : '当前大陆资质未通过，不影响已选海外国家继续提交。'}</span></div>` : ''}</div></section><div class="d6-notice ${state.releaseReady ? '' : 'warning'}" style="margin-top:16px"><span><strong>${state.releaseReady ? '发行范围检查通过' : '提交前还需确认'}</strong>${state.releaseReady ? '国家编码、授权范围与 PC Build 覆盖已完成基础检查。' : '当前内容尚未生成可供发布模块读取的范围快照。'}</span>${!state.releaseReady ? '<button type="button" data-action="edit-release">立即确认</button>' : ''}</div>`;
  };

  const renderMarketOption = code => `<label class="d6-market-option" data-market-label="${escapeHtml(countryLabel(code).toLocaleLowerCase('zh-CN'))}"><input type="checkbox" data-market-code="${code}" ${state.marketSelectionDraft.includes(code) ? 'checked' : ''}><span>${escapeHtml(countryLabel(code))}</span><small>${code}</small></label>`;
  const renderMarketDialog = () => {
    if (!state.marketDialog) return '';
    const otherCodes = COUNTRY_CODES.filter(code => !COMMON_MARKET_CODES.includes(code));
    return `<div class="d6-dialog-layer"><section class="d6-dialog wide d6-market-dialog" role="dialog" aria-modal="true" aria-label="选择国家／地区"><header class="d6-dialog-head"><div><h2>选择国家／地区</h2><p>按具体国家编码保存；选择中国大陆后会增加大陆出版审批检查。</p></div><button class="d6-dialog-close" type="button" data-action="cancel-market-picker">×</button></header><div class="d6-dialog-body"><div class="d6-market-search"><input class="d6-input" type="search" data-market-search aria-label="搜索国家或地区" placeholder="搜索国家／地区名称或代码"></div><section class="d6-market-common"><div class="d6-market-section-head"><h3>常用市场</h3><button type="button" data-action="select-common-markets">全选常用市场</button></div><div class="d6-market-grid common">${COMMON_MARKET_CODES.map(renderMarketOption).join('')}</div></section><section class="d6-market-all"><div class="d6-market-section-head"><h3>其他国家／地区</h3><span>支持继续搜索完整国家／地区库</span></div><div class="d6-market-grid all">${otherCodes.map(renderMarketOption).join('')}</div><div class="d6-market-empty" hidden>未找到匹配的国家／地区</div></section></div><footer class="d6-dialog-foot d6-market-foot"><button type="button" class="d6-button" data-action="clear-markets">清空</button><span>已选 <strong data-market-count>${state.marketSelectionDraft.length}</strong> 个国家／地区</span><div>${button('取消','cancel-market-picker')}${button('确认选择','confirm-market-picker','primary')}</div></footer></section></div>`;
  };

  const renderOperations = () => `<section class="d6-card"><header class="d6-card-head"><div><h2>运营内容摘要</h2><p>当前页面沿用既有游戏运营能力，本 Demo 不展开新增流程。</p></div>${tag('预发布准备','info')}</header><div class="d6-table-wrap"><table class="d6-table"><thead><tr><th>内容</th><th>类型</th><th>关联版本</th><th>状态</th><th>更新时间</th></tr></thead><tbody><tr><td>1.0.0 预发布版更新说明</td><td>版本说明</td><td>1.0.0</td><td>${tag('草稿','info')}</td><td>2026-09-04 11:16</td></tr><tr><td>先锋测试结束公告</td><td>运营公告</td><td>0.9.0</td><td>${tag('已发布','success')}</td><td>2026-08-21 10:00</td></tr></tbody></table></div></section>`;
  const renderServices = () => `<section class="d6-card"><header class="d6-card-head"><div><h2>APPID 与接入状态</h2><p>游戏资料审核通过后生成全平台唯一 APPID。</p></div>${tag('已接入','success')}</header><div class="d6-card-body d6-grid-3"><div class="d6-readonly-box"><span>APPID</span><strong>APP-7F3A9C</strong><small>全平台唯一、只读</small></div><div class="d6-readonly-box"><span>SDK 版本</span><strong>1.0.0</strong><small>Windows / macOS / Linux</small></div><div class="d6-readonly-box"><span>核心能力</span><strong>登录、权益、启动授权</strong><small>首次在线验权后允许离线</small></div></div></section>`;
  const renderAnalytics = () => `<section class="d6-grid-3"><div class="d6-card"><div class="d6-card-body"><span>商店浏览</span><h2 class="number">18,640</h2><small>近 30 天</small></div></div><div class="d6-card"><div class="d6-card-body"><span>成功下载</span><h2 class="number">5,286</h2><small>测试订单已排除</small></div></div><div class="d6-card"><div class="d6-card-body"><span>首次启动</span><h2 class="number">4,118</h2><small>uid + app_id 去重</small></div></div></section>`;

  const renderContent = () => {
    if (state.mainTab === 'overview') return renderOverview();
    if (state.mainTab === 'operations') return renderOperations();
    if (state.mainTab === 'services') return renderServices();
    if (state.mainTab === 'analytics') return renderAnalytics();
    if (state.section === 'qualification') return renderQualification();
    if (state.section === 'products') return renderProducts();
    if (state.section === 'release-scope') return renderReleaseScope();
    return renderProfile();
  };

  const renderGamePage = () => `<div class="d6-main is-game">${renderGameSidebar()}<main class="d6-content"><div class="d6-content-inner">${renderBreadcrumb()}${renderPageHead()}${renderContent()}</div></main></div>`;
  const renderGameList = () => `<div class="d6-main is-list">${renderPlatformSidebar()}<main class="d6-content"><div class="d6-content-inner"><section class="d6-list-page-head"><h1>我的游戏</h1>${button('添加游戏','mock-create','primary')}</section><section class="d6-card d6-game-list"><header class="d6-card-head"><div><h2>全部游戏</h2><p>共 1 款 · 按最近更新时间排序</p></div></header><div class="d6-card-body"><button type="button" class="d6-game-item" data-action="enter-game"><span class="d6-game-item-art">🎮</span><span class="d6-game-item-body"><span class="d6-game-item-heading"><span><strong>${escapeHtml(data.game.name)}</strong><small>Windows / macOS / Linux</small></span>${tag(state.reviewSnapshots.length ? '审核中' : '预发布准备', state.reviewSnapshots.length ? 'info' : 'warning')}</span><span class="d6-game-item-meta"><span class="d6-readonly-box"><span>Game ID</span><strong>${escapeHtml(data.game.gameId)}</strong></span><span class="d6-readonly-box"><span>APPID</span><strong>${escapeHtml(data.game.appId)}</strong></span><span class="d6-readonly-box"><span>资料状态</span><strong>资料已完成</strong></span><span class="d6-readonly-box"><span>发行范围</span><strong>${state.releaseReady ? '已确认' : '待确认'}</strong></span></span></span></button></div></section></div></main></div>`;

  const gateItems = () => {
    const scope = currentReleaseScope();
    const items = [
      { key:'enterprise', label:'企业认证', detail:state.accountType === 'enterprise' ? '企业开发者认证已通过' : '当前为个人开发者', pass:state.accountType === 'enterprise', target:'account' },
      { key:'contract', label:'线下合作与合同', detail:'合作状态有效，合同在有效期内', pass:true },
      { key:'qualification', label:'游戏资质', detail:state.qualificationEditing ? '请先保存或退出当前编辑' : qualificationPassed() ? '代理授权审核已通过' : state.qualificationStatus === 'pending' ? '资质材料正在审核' : '权属材料需要补充', pass:qualificationPassed() && !state.qualificationEditing, target:'qualification' },
      { key:'profile', label:'游戏与商店资料', detail:state.profileSaved && !state.profileEditing ? '多语言、素材与配置完整' : '请先保存或退出当前编辑', pass:state.profileSaved && !state.profileEditing, target:'profile' },
      { key:'sku', label:'商品 / SKU 资料', detail:state.productDialog ? '请先保存或退出商品资料编辑' : state.applicationStage === 'pioneer' ? '标准版测试权益资料完整' : '本次仅提交标准版，商品资料完整', pass:state.skuReady && !state.productDialog, target:'products' },
      { key:'scope', label:'发行范围', detail:state.releaseEditing ? '请先保存或退出当前编辑' : state.releaseReady ? '地区、平台和时间已确认' : '发行范围尚未确认', pass:state.releaseReady && !state.releaseEditing, target:'release-scope' },
      { key:'build', label:'PC 包体状态', detail:'本次关联 Build 20260904.3', pass:true },
    ];
    if (state.applicationStage !== 'pioneer') items.push({ key:'price', label:'价格状态', detail:'本次标准版价格版本 PRICE-20260904.2 已确认', pass:true });
    if (state.applicationStage !== 'pioneer' && includesMainland(scope)) items.push({ key:'mainland', label:'中国大陆发行资质', detail:mainlandReleaseReady() ? '版号及平台角色已通过人工复核' : `${mainlandStatusLabels[state.mainlandStatus]}，仅影响中国大陆范围`, pass:mainlandReleaseReady(), target:'qualification' });
    if (state.applicationStage === 'live') {
      const prereleasePassed = state.reviewSnapshots.some(snapshot => snapshot.stage === 'prerelease' && snapshot.result === 'approved');
      items.push({ key:'previous-stage', label:'阶段前置', detail:prereleasePassed ? '预发布审核已通过' : '正式发行前需先通过预发布审核', pass:prereleasePassed });
    }
    return items;
  };

  const renderApplicationDialog = () => {
    if (!state.applicationDialog) return '';
    if (state.showApplicationSuccess && state.lastSubmittedSnapshot) {
      const snapshot = state.lastSubmittedSnapshot;
      return `<div class="d6-dialog-layer"><section class="d6-dialog"><div class="d6-dialog-body"><div class="d6-success"><div class="d6-success-mark">✓</div><h2>发行申请已提交</h2><p>已生成不可变审核快照，审核期间修改资料将保存为下一版本草稿。</p><div class="d6-snapshot"><div><span>申请编号</span><strong>${escapeHtml(snapshot.id)}</strong></div><div><span>申请阶段</span><strong>${escapeHtml(snapshot.stageLabel)}</strong></div><div><span>当前状态</span><strong>审核中</strong></div><div><span>SKU</span><strong>${escapeHtml(snapshot.skus.join('、'))}</strong></div><div><span>发行范围</span><strong>${escapeHtml(compactMarkets(snapshot.releaseScope.regions))}</strong></div><div><span>发行时间</span><strong>${escapeHtml(formatReleaseAt(snapshot.releaseScope.releaseAt))}</strong></div>${snapshot.excludedMarkets?.length ? `<div><span>本次未提交</span><strong>${escapeHtml(formatMarkets(snapshot.excludedMarkets))}</strong></div>` : ''}</div></div></div><footer class="d6-dialog-foot">${button('返回发行概览','close-success','primary')}</footer></section></div>`;
    }
    const gates = gateItems();
    const allPass = gates.every(item => item.pass);
    const overseasPass = gates.filter(item => item.key !== 'mainland').every(item => item.pass);
    const scope = currentReleaseScope();
    const canSubmitOverseas = state.applicationStage !== 'pioneer' && includesMainland(scope) && !mainlandReleaseReady() && overseasPass;
    const snapshotObjects = `<div class="d6-application-scope"><span><strong>本次提交对象</strong><small>${escapeHtml(includedSkusForStage(state.applicationStage).join('、'))} · Build 20260904.3${state.applicationStage === 'pioneer' ? ' · 测试权益不校验销售价格' : ' · PRICE-20260904.2'}</small></span><span><strong>范围草稿</strong><small>${escapeHtml(compactMarkets(scope.regions))} · ${escapeHtml(scope.platforms.join(' / '))}</small></span></div>`;
    const failureCopy = canSubmitOverseas ? '中国大陆资质尚未满足，可先提交其余海外国家；中国大陆仍保留在发行范围草稿中。' : state.accountType === 'personal' ? '个人开发者需先完成企业认证；如状态异常，可通过 dev@xiaoji.com 反馈。' : '请先完成上方缺项，已填写草稿会继续保留。';
    return `<div class="d6-dialog-layer"><section class="d6-dialog wide" role="dialog" aria-modal="true"><header class="d6-dialog-head"><div><h2>申请平台测试／发行</h2><p>选择阶段后，平台会统一检查资料线、国家范围和包体发布线。</p></div><button class="d6-dialog-close" type="button" data-action="close-application">×</button></header><div class="d6-dialog-body"><div class="d6-stage-choice"><button type="button" class="${state.applicationStage === 'pioneer' ? 'is-active' : ''}" data-action="choose-stage" data-stage="pioneer"><strong>先锋测试</strong><small>白名单内验证启动、权益和测试链路；不代表中国大陆公开发行。</small></button><button type="button" class="${state.applicationStage === 'prerelease' ? 'is-active' : ''}" data-action="choose-stage" data-stage="prerelease"><strong>预发布</strong><small>确认资料、SKU、国家范围、Build 与价格。</small></button><button type="button" class="${state.applicationStage === 'live' ? 'is-active' : ''}" data-action="choose-stage" data-stage="live"><strong>正式发行</strong><small>需先通过预发布，再提交最终发行快照。</small></button></div>${snapshotObjects}<div class="d6-gate-list">${gates.map(item => `<div class="d6-gate-item ${item.pass ? '' : 'warning'}"><span class="d6-gate-icon">${item.pass ? '✓' : '!'}</span><span class="d6-gate-copy"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span>${!item.pass && item.target !== 'account' ? `<button type="button" data-action="go-gate" data-target="${item.target}">前往完善</button>` : ''}</div>`).join('')}</div>${!allPass ? `<div class="d6-notice warning" style="margin:18px 0 0"><span><strong>${canSubmitOverseas ? '中国大陆暂不纳入本次申请。' : '暂不能提交申请。'}</strong>${escapeHtml(failureCopy)}</span></div>` : `<div class="d6-notice" style="margin:18px 0 0"><span><strong>全部检查已通过。</strong>提交后冻结本次 SKU、Build、价格版本与国家级发行范围。</span></div>`}</div><footer class="d6-dialog-foot">${button('取消','close-application')}${canSubmitOverseas ? button('仅提交海外范围','submit-overseas') : ''}${button('提交审核快照','submit-application','primary',allPass ? '' : 'disabled')}</footer></section></div>`;
  };

  const renderProductDialog = () => !state.productDialog ? '' : `<div class="d6-dialog-layer"><section class="d6-dialog" role="dialog" aria-modal="true"><header class="d6-dialog-head"><div><h2>编辑商品资料</h2><p>只维护商品定义，价格在定价模块处理。</p></div><button class="d6-dialog-close" type="button" data-action="close-product">×</button></header><div class="d6-dialog-body"><div class="d6-form-grid">${field({label:'商品名称',name:'productName',value:'远征者豪华版',required:true})}${selectField({label:'商品类型',name:'productType',options:['基础游戏','游戏版本','DLC'],value:'游戏版本',required:true})}${field({label:'SKU ID',name:'skuId',value:'SKU-GLOBAL-002',hint:'创建后只读'})}${selectField({label:'供给方式',name:'supplyMethod',options:['直接下载','CDKEY','直接下载 / CDKEY'],value:'直接下载 / CDKEY'})}${textareaField({label:'包含内容',name:'included',value:'游戏本体、数字原声带、远征者外观包。'})}<div class="d6-field wide"><label>价格状态</label><div class="d6-readonly-box"><strong>待定价模块确认</strong><small>本页不提供价格编辑，避免与发布模块产生两份数据。</small></div></div></div></div><footer class="d6-dialog-foot">${button('取消','close-product')}${button('保存商品资料','save-product','primary')}</footer></section></div>`;

  const submitApplicationSnapshot = ({ overseasOnly = false } = {}) => {
    const sourceScope = JSON.parse(JSON.stringify(state.confirmedReleaseScope));
    const excludedMarkets = overseasOnly && sourceScope.regions.includes('CN') ? ['CN'] : [];
    if (overseasOnly) sourceScope.regions = sourceScope.regions.filter(code => code !== 'CN');
    const sequence = String(state.reviewSnapshots.length + 4).padStart(3, '0');
    const snapshot = Object.freeze({
      id: `RELEASE-20260905-${sequence}`,
      stage: state.applicationStage,
      stageLabel: stageLabel(state.applicationStage),
      result: 'reviewing',
      accountType: state.accountType,
      contractVersion: 'CONTRACT-20260901-001',
      qualificationVersion: state.qualificationVersion,
      profileVersion: 'PROFILE-DRAFT-005',
      skus: includedSkusForStage(state.applicationStage),
      buildId: 'BUILD-20260904.3',
      priceVersion: state.applicationStage === 'pioneer' ? '测试权益不适用价格' : 'PRICE-20260904.2',
      releaseScope: sourceScope,
      excludedMarkets,
      submittedAt: '2026-09-05 15:30',
    });
    state.reviewSnapshots = [...state.reviewSnapshots, snapshot];
    state.lastSubmittedSnapshot = snapshot;
    state.showApplicationSuccess = true;
    render();
  };

  const render = () => {
    root.innerHTML = `<div class="d6-app">${renderTopbar()}${state.view === 'games' ? renderGameList() : renderGamePage()}${renderApplicationDialog()}${renderProductDialog()}${renderMarketDialog()}${state.toast ? `<div class="d6-toast" role="status">${escapeHtml(state.toast)}</div>` : ''}</div>`;
  };

  const showToast = message => {
    state.toast = message;
    render();
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { state.toast = ''; render(); }, 1800);
  };
  const openStoreSection = section => {
    state.view = 'game';
    state.mainTab = 'store';
    state.section = section;
    state.applicationDialog = false;
    render();
  };

  const filterGameNavigation = query => {
    const navigation = root.querySelector('.d6-game-nav');
    if (!navigation) return;
    const keyword = String(query || '').trim().toLocaleLowerCase('zh-CN');
    const matches = element => !keyword || String(element.dataset.navLabel || '').toLocaleLowerCase('zh-CN').includes(keyword);
    const primaryItems = [...navigation.querySelectorAll(':scope > button[data-nav-label]')];
    primaryItems.forEach(item => { item.hidden = !matches(item); });
    const group = navigation.querySelector('.d6-nav-group');
    const groupTrigger = group?.querySelector('.d6-nav-group-trigger');
    const secondaryItems = [...(group?.querySelectorAll('.d6-nav-sub button[data-nav-label]') || [])];
    const groupMatched = groupTrigger ? matches(groupTrigger) : false;
    secondaryItems.forEach(item => { item.hidden = Boolean(keyword) && !groupMatched && !matches(item); });
    if (group) group.hidden = Boolean(keyword) && !groupMatched && !secondaryItems.some(item => !item.hidden);
    const hasResult = primaryItems.some(item => !item.hidden) || Boolean(group && !group.hidden);
    const empty = root.querySelector('.d6-nav-empty');
    if (empty) empty.hidden = hasResult;
  };

  root.addEventListener('input', event => {
    if (event.target.matches('[data-nav-search]')) filterGameNavigation(event.target.value);
    if (event.target.matches('[data-market-search]')) {
      const keyword = String(event.target.value || '').trim().toLocaleLowerCase('zh-CN');
      state.marketSearch = keyword;
      const options = [...root.querySelectorAll('.d6-market-option')];
      options.forEach(option => {
        const code = option.querySelector('[data-market-code]')?.dataset.marketCode?.toLocaleLowerCase('zh-CN') || '';
        option.hidden = Boolean(keyword) && !option.dataset.marketLabel.includes(keyword) && !code.includes(keyword);
      });
      const empty = root.querySelector('.d6-market-empty');
      if (empty) empty.hidden = options.some(option => !option.hidden);
    }
  });

  root.addEventListener('change', event => {
    if (event.target.matches('[data-market-code]')) {
      const code = event.target.dataset.marketCode;
      const selected = new Set(state.marketSelectionDraft);
      if (event.target.checked) selected.add(code); else selected.delete(code);
      state.marketSelectionDraft = [...selected];
      root.querySelectorAll(`[data-market-code="${code}"]`).forEach(input => { input.checked = event.target.checked; });
      const count = root.querySelector('[data-market-count]');
      if (count) count.textContent = String(state.marketSelectionDraft.length);
    }
    if (event.target.matches('#mainlandStatus')) {
      state.mainlandStatus = event.target.value;
      state.mainlandReviewPassed = false;
      const showFields = ['approved', 'change_pending', 'abnormal'].includes(state.mainlandStatus);
      const fields = root.querySelector('.d6-mainland-approval-fields');
      const guidance = root.querySelector('.d6-mainland-guidance');
      if (fields) fields.hidden = !showFields;
      if (guidance) guidance.hidden = state.mainlandStatus === 'not_planned';
    }
    if (event.target.matches('#mainlandOrigin')) state.mainlandOrigin = event.target.value;
  });

  root.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    if (action === 'main-tab') {
      state.mainTab = control.dataset.tab || 'overview';
      if (state.mainTab === 'store' && !storeSections.some(([id]) => id === state.section)) state.section = 'profile';
      render();
      return;
    }
    if (action === 'store-section') { state.mainTab = 'store'; state.section = control.dataset.section || 'profile'; render(); return; }
    if (action === 'back-games') { state.view = 'games'; render(); return; }
    if (action === 'enter-game') { state.view = 'game'; state.mainTab = 'overview'; state.section = 'profile'; render(); return; }
    if (action === 'edit-profile') { state.profileEditing = true; render(); return; }
    if (action === 'cancel-profile') {
      state.profileEditing = false;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      render();
      return;
    }
    if (action === 'profile-language') { state.language = control.dataset.language === 'en' ? 'en' : 'zh'; render(); return; }
    if (action === 'save-profile') {
      state.profileEditing = false;
      state.profileSaved = true;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      showToast('游戏资料草稿已保存，不影响已提交的审核快照。');
      return;
    }
    if (action === 'edit-qualification') { state.qualificationEditing = true; render(); return; }
    if (action === 'cancel-qualification') {
      state.qualificationEditing = false;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      render();
      return;
    }
    if (action === 'qualification-type') { state.qualificationType = control.dataset.type === 'self' ? 'self' : 'agency'; state.qualificationStatus = 'draft'; render(); return; }
    if (action === 'save-qualification') {
      state.mainlandStatus = root.querySelector('#mainlandStatus')?.value || state.mainlandStatus;
      state.mainlandOrigin = root.querySelector('#mainlandOrigin')?.value || state.mainlandOrigin || 'domestic';
      if (['approved', 'change_pending', 'abnormal'].includes(state.mainlandStatus)) {
        state.mainlandQualification = {
          approvalName: root.querySelector('#approvalName')?.value.trim() || state.mainlandQualification.approvalName,
          category: root.querySelector('#approvalCategory')?.value.trim() || state.mainlandQualification.category,
          approvalNumber: root.querySelector('#approvalNumber')?.value.trim() || state.mainlandQualification.approvalNumber,
          isbn: root.querySelector('#approvalIsbn')?.value.trim() || state.mainlandQualification.isbn,
          publisher: root.querySelector('#publisher')?.value.trim() || state.mainlandQualification.publisher,
          operator: root.querySelector('#operator')?.value.trim() || state.mainlandQualification.operator,
          approvalDate: root.querySelector('#approvalDate')?.value || state.mainlandQualification.approvalDate,
        };
      }
      state.qualificationEditing = false;
      state.qualificationStatus = 'pending';
      state.mainlandReviewPassed = false;
      state.qualificationVersion = `QUAL-20260905-${String(state.reviewSnapshots.length + 3).padStart(3, '0')}`;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      showToast('资质材料已提交平台人工复核，通过前不会放行对应发行范围。');
      return;
    }
    if (action === 'open-product') { state.productDialog = true; render(); return; }
    if (action === 'close-product') { state.productDialog = false; render(); return; }
    if (action === 'save-product') {
      state.productDialog = false;
      state.skuReady = true;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      showToast('商品资料草稿已保存，价格状态未改变。');
      return;
    }
    if (action === 'edit-release') {
      if (state.confirmedReleaseScope) state.releaseDraft = JSON.parse(JSON.stringify(state.confirmedReleaseScope));
      state.releaseEditing = true;
      render();
      return;
    }
    if (action === 'cancel-release') {
      state.releaseEditing = false;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      render();
      return;
    }
    if (action === 'save-release') {
      const regions = [...state.releaseDraft.regions];
      const platforms = [...root.querySelectorAll('input[name="platforms"]:checked')].map(input => input.value);
      const releaseAt = root.querySelector('#releaseAt')?.value;
      if (!regions.length || !platforms.length || !releaseAt) { showToast('请至少选择一个地区、一个平台并填写发行时间。'); return; }
      state.releaseDraft = {
        regions,
        platforms,
        releaseAt,
        timezone: root.querySelector('#timezone')?.value || 'UTC+8 北京时间',
        restricted: root.querySelector('#restricted')?.value.trim() || '受国际制裁或授权限制地区',
      };
      state.confirmedReleaseScope = JSON.parse(JSON.stringify(state.releaseDraft));
      state.releaseEditing = false;
      state.releaseReady = true;
      if (state.resumeApplicationAfterSave) { state.resumeApplicationAfterSave = false; state.applicationDialog = true; }
      showToast('发行范围已确认，可用于下一次发行申请快照。');
      return;
    }
    if (action === 'open-market-picker') {
      state.toast = '';
      state.marketSelectionDraft = [...state.releaseDraft.regions];
      state.marketSearch = '';
      state.marketDialog = true;
      render();
      return;
    }
    if (action === 'cancel-market-picker') { state.marketDialog = false; state.marketSearch = ''; render(); return; }
    if (action === 'clear-markets') { state.marketSelectionDraft = []; render(); return; }
    if (action === 'select-common-markets') {
      state.marketSelectionDraft = [...new Set([...state.marketSelectionDraft, ...COMMON_MARKET_CODES])];
      render();
      return;
    }
    if (action === 'confirm-market-picker') {
      state.releaseDraft.regions = COUNTRY_CODES.filter(code => state.marketSelectionDraft.includes(code));
      state.marketDialog = false;
      state.marketSearch = '';
      render();
      return;
    }
    if (action === 'go-release') { state.releaseEditing = true; openStoreSection('release-scope'); return; }
    if (action === 'open-application') { state.toast = ''; state.showApplicationSuccess = false; state.applicationDialog = true; render(); return; }
    if (action === 'close-application') { state.applicationDialog = false; state.resumeApplicationAfterSave = false; render(); return; }
    if (action === 'choose-stage') { state.applicationStage = control.dataset.stage || 'pioneer'; render(); return; }
    if (action === 'go-gate') {
      const target = control.dataset.target || 'profile';
      state.resumeApplicationAfterSave = true;
      if (target === 'profile') state.profileEditing = true;
      if (target === 'qualification') state.qualificationEditing = true;
      if (target === 'release-scope') state.releaseEditing = true;
      if (target === 'products') state.productDialog = true;
      openStoreSection(target);
      return;
    }
    if (action === 'submit-application') {
      if (!gateItems().every(item => item.pass)) return;
      submitApplicationSnapshot();
      return;
    }
    if (action === 'submit-overseas') {
      const gates = gateItems();
      if (!gates.filter(item => item.key !== 'mainland').every(item => item.pass) || !includesMainland(currentReleaseScope())) return;
      submitApplicationSnapshot({ overseasOnly: true });
      return;
    }
    if (action === 'close-success') { state.applicationDialog = false; state.showApplicationSuccess = false; state.mainTab = 'overview'; render(); return; }
    if (action === 'mock-upload') { showToast('演示不上传真实文件，已保留当前资料。'); return; }
    if (action === 'top-help') { showToast('帮助中心由既有 Demo 提供。问题反馈：dev@xiaoji.com'); return; }
    if (action === 'top-download') { showToast('下载中心将在后续独立 Demo 中展开。'); return; }
    if (action === 'top-language') { showToast('当前 Demo 重点演示中文业务流程。'); return; }
    if (action === 'account-info') { showToast(state.accountType === 'enterprise' ? '企业认证已通过，线下合作状态有效。' : '当前为个人开发者，申请测试或发行前需完成企业认证。'); return; }
    if (action === 'platform-data') { showToast('数据总览沿用 Demo 2 已确认页面。'); return; }
    if (action === 'vendor-settings') { showToast('厂商设置由开发者平台与资料 Demo 提供。'); return; }
    if (action === 'mock-create') { showToast('本 Demo 聚焦已创建游戏后的资料与发行范围。'); }
  });

  render();
}());
