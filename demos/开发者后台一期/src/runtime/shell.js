window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerShell(namespace) {
  const c = namespace.components;
  const e = c.escapeHtml;
  const icon = name => namespace.icons.render(name);
  const roleMeta = {
    developer: { label: '开发者', roleName: '已认证开发者', description: '维护资料、接入三系统 SDK、提交 Build，并管理 CDKEY、Campaign 与聚合数据。' },
    operations: { label: '发行运营', roleName: '平台发行运营', description: '维护账号映射、录入线下结果、配置供给并执行版本发布。' },
    tester: { label: '测试人员', roleName: '平台测试人员', description: '仅处理分配给本人的待测任务，历史结果不可覆盖。' },
  };
  const moduleIcon = { '01': 'vendor', '02': 'key', '03': 'build', '04': 'target' };
  const routeIcon = route => {
    if (route.templateId === 'T15') return 'chart';
    if (route.id === 'P01-04') return 'chart';
    if (route.id === 'P01-05') return 'game';
    if (route.id === 'P01-06') return 'build';
    if (route.id === 'P01-07') return 'publish';
    if (route.role === 'tester') return 'test';
    if (route.role === 'operations') return 'review';
    return moduleIcon[route.moduleId] || 'home';
  };
  const publicTitles = {
    'P01-01': '开发者平台',
    'P01-02': '工作台',
    'P01-03': '开发者认证',
    'P01-04': '数据总览',
    'P01-05': '游戏资料',
    'P01-06': 'APPID 与 SDK',
    'P01-07': '测试与发布',
    'P01-08': '企业认证审核',
    'P01-09': '认证内容配置',
    'P01-10': '游戏资料与上架结果',
    'P02-01': 'CDKEY 商品与供给',
    'P02-02': '外部 Key 异常详情',
    'P02-03': '商品与 SKU 管理',
    'P02-04': '外部 Key 供给配置',
    'P02-05': '盖世 Key 与渠道 API',
    'P02-06': '供给异常与对账',
    'P03-01': '版本管理',
    'P03-02': '创建／编辑版本',
    'P03-03': '包体上传与 Build 详情',
    'P03-04': '提交测试',
    'P03-05': '测试不通过详情',
    'P03-06': '待测任务',
    'P03-07': '测试任务详情',
    'P03-08': '提交测试结果',
    'P03-09': '版本审核',
    'P03-10': '上架结论',
    'P03-11': '待发布版本',
    'P03-12': '发布与回滚',
    'P03-13': '线上版本管理',
    'P04-01': '整体经营看板',
    'P04-02': '交易、退款与结算',
    'P04-03': 'Key 供给与兑换',
    'P04-04': '下载、更新与首次启动',
    'P04-05': 'Campaign／UTM 管理',
    'P04-06': '发行资源需求',
    'P04-07': '渠道归因分析',
    'P04-08': '数据导出与说明',
  };
  const pageMeta = {
    'P01-04': { summary: '查看当前游戏的发行准备、阶段结果与核心数据。', status: '预发布需修改', primaryAction: '编辑游戏资料', action: 'edit-game-profile' },
    'P01-05': { summary: '维护当前游戏的基础资料、发行信息、系统要求与宣传素材。', status: '资料已确认' },
    'P01-06': { summary: '查看当前游戏的唯一 APPID，下载三系统 SDK 并打开接入文档。', status: 'APPID 已创建' },
    'P01-07': { summary: '按当前游戏查看先锋测试、预发布、正式上线申请与结果记录。', status: '预发布需修改', primaryAction: '查看修改要求', action: 'view-release-issue' },
  };
  const publicTitle = route => publicTitles[route.id] || route.title.replace(/页$/, '');
  const publicCopy = value => String(value || '')
    .replaceAll('门禁', '检查项');
  const hashFor = route => `#/${route.id}`;
  const primaryAction = (page, route) => {
    const actions = Array.isArray(page?.actions) ? page.actions : [];
    const byLabel = actions.find(action => action.label === page.primaryAction);
    if (byLabel) return byLabel.id;
    const preferred = actions.find(action => !/reject|interrupt|exclude|stop/.test(action.id || ''));
    return preferred?.id || `primary-${route.id}`;
  };

  const renderTopBar = ({ module, portalData, role, redacted, isLogin, isOnboarding, qualification, language, registration }) => {
    const roleInfo = roleMeta[role] || roleMeta.developer;
    const account = redacted || isLogin ? null : portalData.accounts?.[role];
    const isEnglish = language === 'en';
    const help = redacted ? '' : `<button class="top-help-button" type="button" data-help-open data-portal-action="open-help">${icon('info')}<span>${isEnglish && role === 'developer' ? 'Help Center' : '帮助中心'}</span></button>`;
    const languageSwitch = !redacted && role === 'developer' ? `<button class="top-language-button" type="button" data-portal-action="toggle-interface-language" aria-label="${isEnglish ? 'Switch to Chinese' : '切换英语'}">${isEnglish ? 'Switch to Chinese' : '切换英语'}</button>` : '';
    const login = isLogin ? `<button class="top-login-button" type="button" data-login-open data-portal-action="open-login">${icon('user')}<span>${isEnglish ? 'Sign in' : '登录'}</span></button>` : '';
    const context = role === 'operations' ? '<div class="top-context"><strong>发行平台后台</strong><span>企业认证与内容运营</span></div>' : '';
    const accountTier = registration?.accountTier || 'unselected';
    const qualificationRole = accountTier === 'unselected'
      ? (isEnglish ? 'Choose onboarding option' : '待选择入驻方式')
      : accountTier === 'registered'
        ? (isEnglish ? 'Platform developer' : '平台开发者')
        : ({ unsubmitted: isEnglish ? 'Company verification incomplete' : '待完成企业认证', pending: isEnglish ? 'Company verification pending' : '企业认证审核中', approved: isEnglish ? 'Company verified' : '企业认证已通过', rejected: isEnglish ? 'Verification needs changes' : '企业认证待修改' }[qualification?.status]);
    const accountRole = role === 'developer' ? (qualificationRole || roleInfo.roleName) : (account?.roleName || roleInfo.roleName);
    const accountBlock = account && role === 'developer'
      ? `<div class="top-account-menu" data-account-menu><button class="top-account" type="button" data-portal-action="toggle-account-menu" aria-haspopup="menu" aria-expanded="false"><div class="account-avatar">${e(account.name.slice(0, 1))}</div><div class="account-copy"><strong>${e(account.name)}</strong><span>${e(accountRole)}</span></div>${icon('chevron')}</button><div class="top-account-dropdown" role="menu"><button type="button" role="menuitem" data-portal-action="logout">${isEnglish ? 'Sign out' : '退出登录'}</button></div></div>`
      : account ? `<div class="top-account"><div class="account-avatar">${e(account.name.slice(0, 1))}</div><div class="account-copy"><strong>${e(account.name)}</strong><span>${e(accountRole)}</span></div></div>` : '';
    const consoleLink = account && role === 'developer'
      ? `<button class="top-console-button" type="button" data-portal-action="go-console" hidden>${icon('chart')}<span>${isEnglish ? 'Console' : '控制台'}</span></button>`
      : '';
    const developerTools = `${consoleLink}${help}${languageSwitch}${accountBlock}${login}`;
    const operationsTools = `${accountBlock}${help}`;
    return `<header class="top-bar"><button class="brand-block" type="button" data-portal-action="home" aria-label="${role === 'operations' ? '返回发行平台后台首页' : (isEnglish ? 'Back to developer home' : '返回开发者首页')}"><div class="brand-mark">${icon('logo')}</div><div class="brand-copy"><div class="brand-title">${role === 'operations' ? 'gamesir-dashboard' : '盖世游戏'}</div><div class="brand-subtitle">${role === 'operations' ? '运营管理后台' : (isEnglish && role === 'developer' ? 'Developer Platform' : '开发者平台')}</div></div></button>${context}${role === 'developer' ? developerTools : operationsTools}</header>`;
  };

  const renderSideNav = ({ routes, route, role, editorMode = 'edit', registration, qualification, language = 'zh' }) => {
    const allowed = routes.filter(item => item.role === role && item.id !== 'P01-01');
    const consoleRouteIds = ['P01-04', 'P01-05', 'P01-06', 'P01-07'];
    if (role === 'operations' && route.moduleId === '01') {
      const items = [
        ['P01-08', 'vendor', '企业认证审核'],
        ['P01-09', 'file', '认证内容配置'],
      ];
      return `<aside class="side-nav side-nav--operations" data-side-nav data-component="SideNav" data-variant="light"><div class="nav-label">发行平台后台</div><nav class="nav-list" aria-label="发行平台后台">${items.map(([id, iconName, label]) => `<a class="nav-item${route.id === id ? ' is-active' : ''}" href="#/${id}"${route.id === id ? ' aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></a>`).join('')}<div class="nav-group-label">后续能力</div><span class="nav-item is-disabled">${icon('game')}<span>游戏资料审核</span></span><span class="nav-item is-disabled">${icon('chart')}<span>发行数据管理</span></span></nav></aside>`;
    }
    if (role === 'developer' && route.id === 'P02-01') {
      const developerModule = '01-开发者平台与资料demo.html';
      return `<aside class="side-nav side-nav--game" data-side-nav data-component="SideNav" data-variant="dark"><a class="game-nav-back" href="${developerModule}#/P01-02">${icon('chevron')}<span>返回全部游戏</span></a><div class="game-nav-current"><div>${icon('game')}</div><span><strong>星海远征</strong><small>GAME-48291</small></span></div><div class="nav-label">控制台</div><nav class="nav-list" aria-label="单游戏控制台"><a class="nav-item" href="${developerModule}#/P01-04">${icon('chart')}<span>数据总览</span></a><div class="nav-group-label">游戏管理</div><a class="nav-item" href="${developerModule}#/P01-05">${icon('game')}<span>游戏资料</span></a><a class="nav-item" href="${developerModule}#/P01-06">${icon('build')}<span>APPID 与 SDK</span></a><a class="nav-item" href="${developerModule}#/P01-07">${icon('publish')}<span>测试与发布</span></a><div class="nav-group-label">发行与供给</div><a class="nav-item is-active" href="#/P02-01" aria-current="page">${icon('key')}<span>商品与 CDKEY</span></a></nav></aside>`;
    }
    if (role === 'developer' && route.id === 'P01-03') {
      const isEnglish = language === 'en';
      const activeTab = registration?.consoleTab || (qualification?.status === 'unsubmitted' ? 'overview' : 'qualification');
      const items = [
        ['overview', 'chart', isEnglish ? 'Overview' : '数据总览'],
        ['games', 'game', isEnglish ? 'Game management' : '游戏管理'],
        ['resources', 'build', isEnglish ? 'Integration resources' : '接入资料'],
        ['qualification', 'vendor', isEnglish ? 'Become a developer' : '成为开发者'],
      ];
      const navTitle = isEnglish ? 'Platform developer console' : '平台开发者控制台';
      return `<nav class="platform-tab-bar" data-platform-tab-bar aria-label="${navTitle}"><div class="platform-tab-list" role="tablist">${items.map(([value, iconName, label]) => {
        const startsVerification = value === 'qualification' && qualification?.status === 'unsubmitted';
        const action = startsVerification ? 'start-company-verification' : 'platform-console-tab';
        const isActive = activeTab === value;
        return `<button class="platform-tab${isActive ? ' is-active' : ''}" type="button" role="tab" aria-selected="${isActive}" tabindex="${isActive ? '0' : '-1'}" data-portal-action="${action}"${startsVerification ? '' : ` data-platform-console-tab="${value}"`}>${label}</button>`;
      }).join('')}</div></nav>`;
    }
    if (role === 'developer' && route.moduleId === '01' && route.id === 'P01-02') {
      return `<aside class="side-nav" data-side-nav data-component="SideNav" data-variant="dark"><div class="nav-label">厂商工作台</div><nav class="nav-list" aria-label="厂商导航"><a class="nav-item is-active" href="${e(hashFor(route))}" aria-current="page">${icon('game')}<span>游戏管理</span></a></nav></aside>`;
    }
    if (role === 'developer' && route.id === 'P01-05' && editorMode === 'create') {
      return `<aside class="side-nav side-nav--game" data-side-nav data-component="SideNav" data-variant="dark"><a class="game-nav-back" href="#/P01-02" data-demo-action="back-to-games">${icon('chevron')}<span>返回全部游戏</span></a><div class="game-nav-current"><div>${icon('game')}</div><span><strong>创建游戏</strong><small>尚未生成 Game ID</small></span></div><div class="nav-label">新建项目</div><nav class="nav-list" aria-label="创建游戏"><a class="nav-item is-active" href="#/P01-05" aria-current="page">${icon('game')}<span>基础资料</span></a></nav></aside>`;
    }
    if (role === 'developer' && consoleRouteIds.includes(route.id)) {
      const consoleRoutes = allowed.filter(item => consoleRouteIds.includes(item.id));
      return `<aside class="side-nav side-nav--game" data-side-nav data-component="SideNav" data-variant="dark"><a class="game-nav-back" href="#/P01-02" data-demo-action="back-to-games">${icon('chevron')}<span>返回全部游戏</span></a><div class="game-nav-current"><div>${icon('game')}</div><span><strong>星海远征</strong><small>GAME-48291</small></span></div><div class="nav-label">控制台</div><nav class="nav-list" aria-label="单游戏控制台">${consoleRoutes.map((item, index) => `${index === 1 ? '<div class="nav-group-label">游戏管理</div>' : ''}<a class="nav-item${item.id === route.id ? ' is-active' : ''}" href="${e(hashFor(item))}"${item.id === 'P01-05' ? ' data-demo-action="edit-game-profile"' : ''}${item.id === route.id ? ' aria-current="page"' : ''}>${icon(routeIcon(item))}<span>${e(publicTitle(item))}</span></a>`).join('')}<div class="nav-group-label">发行与供给</div><a class="nav-item" href="02-CDKEY商品与供给demo.html#/P02-01" data-demo-action="open-cdkey-console">${icon('key')}<span>商品与 CDKEY</span></a></nav></aside>`;
    }
    return `<aside class="side-nav" data-side-nav data-component="SideNav" data-variant="dark"><div class="nav-label">功能导航</div><nav class="nav-list" aria-label="业务导航">${allowed.map(item => `<a class="nav-item${item.id === route.id ? ' is-active' : ''}" data-component="NavItem" data-variant="${item.id === route.id ? 'active' : 'default'}" href="${e(hashFor(item, role))}"${item.id === route.id ? ' aria-current="page"' : ''}>${icon(routeIcon(item))}<span>${e(publicTitle(item))}</span></a>`).join('')}</nav></aside>`;
  };

  const renderContext = ({ portalData, redacted, route, editorMode = 'edit' }) => {
    if (redacted) return '';
    const context = portalData.context || {};
    if (route.id === 'P01-02') return `<div class="context-bar">${icon('vendor')}<span class="context-value">${e(context.vendorName || '未选择厂商')}</span><span class="context-divider">/</span><span>厂商工作台</span></div>`;
    if (route.id === 'P01-05' && editorMode === 'create') return `<div class="context-bar">${icon('vendor')}<span class="context-value">${e(context.vendorName || '未选择厂商')}</span><span class="context-divider">/</span>${icon('game')}<span>创建游戏</span></div>`;
    if (route.id === 'P02-01') return `<div class="context-bar">${icon('vendor')}<span>${e(context.vendorName || '未选择厂商')}</span><span class="context-divider">/</span>${icon('game')}<span class="context-value">${e(context.gameName || '未选择游戏')}</span><span class="context-divider">/</span><span>商品与 CDKEY</span></div>`;
    if (['P01-04', 'P01-05', 'P01-06', 'P01-07'].includes(route.id)) return `<div class="context-bar">${icon('vendor')}<span>${e(context.vendorName || '未选择厂商')}</span><span class="context-divider">/</span>${icon('game')}<span class="context-value">${e(context.gameName || '未选择游戏')}</span><span class="context-divider">/</span><span>${e(publicTitle(route))}</span></div>`;
    return `<div class="context-bar">${icon('vendor')}<span class="context-value">${e(context.vendorName || '未选择厂商')}</span><span class="context-divider">/</span>${icon('game')}<span class="context-value">${e(context.gameName || '未选择游戏')}</span><span class="context-divider">/</span><span>${e(context.versionName || '未选择版本')}</span></div>`;
  };

  const renderPageHeader = ({ route, page, state, redacted, editorMode = 'edit' }) => {
    if (['P01-01', 'P01-02', 'P01-03', 'P01-08', 'P01-09'].includes(route.id)) return '';
    const meta = pageMeta[route.id] || {};
    const safeSummary = redacted
      ? '当前账号无法访问此页面，页面内容已隐藏。'
      : (route.id === 'P01-05' && editorMode === 'create'
        ? '填写新游戏的基础资料、发行范围与素材；创建前不存在 Game ID 或 APPID。'
        : publicCopy(meta.summary || page.summary || '查看并处理当前业务信息。'));
    const actionLabel = redacted ? '返回可访问页面' : (meta.primaryAction || page.primaryAction || '继续');
    const action = redacted ? 'default-state' : (meta.action || primaryAction(page, route));
    const title = route.id === 'P01-05' && editorMode === 'create' ? '创建游戏' : publicTitle(route);
    return `<header class="page-header"><div><h1 class="page-title" data-page-title>${e(title)}</h1><p class="page-summary">${e(safeSummary)}</p></div><div class="page-actions">${!redacted && state === 'default' ? c.statusTag(route.id === 'P01-05' && editorMode === 'create' ? '待创建' : (meta.status || page.status || '待处理')) : ''}${c.button({ label: actionLabel, variant: 'primary', action, primary: true, disabled: !redacted && Boolean(page.primaryActionDisabled) })}</div></header>`;
  };

  const renderHelpLine = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) ? `<a href="mailto:${e(value)}">${e(value)}</a>` : e(value);
  const unsafeScriptPattern = new RegExp('<' + 'script\\b[^>]*>[\\s\\S]*?<\\/' + 'script>', 'gi');
  const renderManagedHtml = value => String(value || '')
    .replace(unsafeScriptPattern, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
  const renderHelpArticle = (article, index, language) => `<article class="help-article" data-help-article="${e(article.id)}"${index === 0 ? '' : ' hidden'}>
    <div class="help-breadcrumb">${language === 'en' ? 'Help Center' : '帮助中心'}<span>/</span>${e(article.category)}${article.section ? `<span>/</span>${e(article.section)}` : ''}</div>
    <h1>${e(article.question)}</h1>
    ${article.bodyHtml ? `<div class="help-article__rich managed-rich-content">${renderManagedHtml(article.bodyHtml)}</div>` : `<p class="help-article__lead">${e(article.answer)}</p>${article.steps?.length ? `<section><h2>${e(article.sectionTitle || (language === 'en' ? 'Steps' : '操作步骤'))}</h2><ol>${article.steps.map(step => `<li>${renderHelpLine(step)}</li>`).join('')}</ol></section>` : ''}${article.details?.length ? `<section><h2>${e(article.detailTitle || (language === 'en' ? 'Details' : '处理说明'))}</h2><ul>${article.details.map(detail => `<li>${renderHelpLine(detail)}</li>`).join('')}</ul></section>` : ''}`}
    ${article.note ? `<div class="help-note">${icon('info')}<div><strong>${language === 'en' ? 'Note' : '请注意'}</strong><p>${e(article.note)}</p></div></div>` : ''}
  </article>`;

  const renderHelpCenter = (help, language = 'zh') => {
    const isEnglish = language === 'en';
    const articles = [...help.faq, {
      id: 'contact', category: isEnglish ? 'Contact us' : '联系我们', question: isEnglish ? 'Contact developer support' : '联系开发者支持',
      answer: isEnglish ? 'If the Help Center does not resolve the issue, contact developer support through the partnership group, project representative or email.' : '如帮助文档无法解决问题，可通过合作群、项目对接人或邮件联系开发者支持。',
      sectionTitle: isEnglish ? 'Contact options' : '联系方式',
      steps: [help.contact.supportName, help.contact.serviceHours, help.contact.channel, help.contact.email],
      details: [help.contact.fallback], detailTitle: isEnglish ? 'Urgent issues' : '紧急问题',
    }];
    const categories = [...new Set(articles.map(article => article.category))];
    const renderHelpCategory = category => {
      let currentSection = '';
      return articles.map((article, index) => {
        if (article.category !== category) return '';
        const articleSection = String(article.section || '');
        const sectionHeading = articleSection && articleSection !== currentSection
          ? `<h3 class="help-nav-subgroup-title">${e(articleSection)}</h3>`
          : '';
        currentSection = articleSection;
        return `${sectionHeading}<button type="button" data-portal-action="help-topic" data-help-topic="${e(article.id)}" class="help-nav-item${index === 0 ? ' is-active' : ''}"${index === 0 ? ' aria-current="page"' : ''}>${icon('file')}<span>${e(article.question)}</span></button>`;
      }).join('');
    };
    return `<section class="help-center" data-help-center hidden>
      <header class="help-center__header"><div class="help-center__heading"><h1>${e(help.title)}</h1></div><div class="help-search" role="search"><label class="sr-only" for="help-search-input">${isEnglish ? 'Search help articles' : '搜索帮助文章'}</label><input id="help-search-input" type="search" placeholder="${isEnglish ? 'Search help articles' : '搜索帮助文章'}" autocomplete="off" data-help-search-input><button type="button" data-portal-action="search-help" aria-label="${isEnglish ? 'Search' : '搜索'}">${icon('search')}<span>${isEnglish ? 'Search' : '搜索'}</span></button></div></header>
      <div class="help-library">
        <aside class="help-library__nav"><div class="help-library__nav-title">${isEnglish ? 'Documentation' : '文档目录'}</div><nav aria-label="${isEnglish ? 'Help documentation' : '帮助文档目录'}">${categories.map(category => `<section class="help-nav-group"><h2>${e(category)}</h2>${renderHelpCategory(category)}</section>`).join('')}</nav></aside>
        <main class="help-library__content"><section class="help-search-results" data-help-search-results hidden></section>${articles.map((article, index) => renderHelpArticle(article, index, language)).join('')}</main>
      </div>
    </section>`;
  };

  const renderBusiness = ({ module, routes, route, page, portalData, role, state, editorMode = 'edit', content, qualification, language, managedContent, registration }) => {
    const redacted = state === 'permission';
    const isLogin = route.id === 'P01-01' && !redacted;
    const accountTier = registration?.accountTier || 'unselected';
    const showPlatformConsole = route.id === 'P01-03' && (accountTier === 'registered' || (['pending', 'approved', 'rejected'].includes(qualification?.status) && !qualification?.editing));
    const isOnboarding = route.id === 'P01-03' && !showPlatformConsole;
    const isEntryChoice = isOnboarding && accountTier === 'unselected' && qualification?.status === 'unsubmitted';
    const isConfiguration = route.id === 'P01-09';
    const helpLanguage = role === 'developer' ? language : 'zh';
    const helpContent = managedContent?.[helpLanguage]?.help || portalData.helpCenter;
    const frameClass = `${isLogin ? ' is-login' : ''}${isOnboarding ? ' is-onboarding' : ''}${isEntryChoice ? ' is-entry-choice' : ''}${showPlatformConsole ? ' is-platform-console' : ''}`;
    const showContext = !isLogin && !isOnboarding && !isConfiguration && !showPlatformConsole && route.id !== 'P01-08';
    return `<div class="portal-stage"><main class="product-frame${frameClass}" data-role="${e(role)}" data-page-state="${e(state)}" data-qualification-status="${e(qualification?.status || 'not-applicable')}">${renderTopBar({ module, portalData, role, redacted, isLogin, isOnboarding, qualification, language, registration })}${isLogin || isOnboarding ? '' : renderSideNav({ routes, route, role, editorMode, registration, qualification, language })}<section class="workspace">${showContext ? renderContext({ portalData, redacted, route, editorMode }) : ''}<div class="page-wrap">${renderPageHeader({ route, page, state, redacted, editorMode })}<div data-runtime-result></div>${content}</div>${redacted ? '' : renderHelpCenter(helpContent, helpLanguage)}</section></main></div>`;
  };
  namespace.shell = { roleMeta, publicTitle, hashFor, renderBusiness };
})(window.GameHubDeveloperPortal);
