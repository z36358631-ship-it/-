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
    if (route.role === 'tester') return 'test';
    if (route.role === 'operations') return 'review';
    return moduleIcon[route.moduleId] || 'home';
  };
  const publicTitles = {
    'P01-01': '开发者账号登录',
    'P01-02': '工作台',
    'P01-03': '开发者认证',
    'P01-04': '游戏管理',
    'P01-05': '创建／编辑游戏',
    'P01-06': 'APPID 与 SDK 接入',
    'P01-07': '资料审核结果',
    'P01-08': '开发者账号管理',
    'P01-09': '厂商资质结果',
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

  const renderTopBar = ({ module, portalData, role, redacted, isLogin, isOnboarding }) => {
    const roleInfo = roleMeta[role] || roleMeta.developer;
    const account = redacted || isLogin ? null : portalData.accounts?.[role];
    const help = redacted ? '' : `<button class="top-help-button" type="button" data-help-open data-portal-action="open-help">${icon('info')}<span>帮助中心</span></button>`;
    const context = isLogin ? '' : `<div class="top-context"><strong>${e(module?.name || '开发者平台')}</strong></div>`;
    const accountRole = isOnboarding ? '待完成开发者认证' : (account?.roleName || roleInfo.roleName);
    const accountBlock = account ? `<div class="top-account"><div class="account-avatar">${e(account.name.slice(0, 1))}</div><div class="account-copy"><strong>${e(account.name)}</strong><span>${e(accountRole)}</span></div></div>` : '';
    return `<header class="top-bar"><div class="brand-block"><div class="brand-mark">${icon('logo')}</div><div class="brand-copy"><div class="brand-title">盖世游戏</div><div class="brand-subtitle">开发者平台</div></div></div>${context}${help}${accountBlock}</header>`;
  };

  const renderSideNav = ({ routes, route, role }) => {
    const allowed = routes.filter(item => item.role === role && item.id !== 'P01-01');
    return `<aside class="side-nav" data-side-nav data-component="SideNav" data-variant="dark"><div class="nav-label">功能导航</div><nav class="nav-list" aria-label="业务导航">${allowed.map(item => `<a class="nav-item${item.id === route.id ? ' is-active' : ''}" data-component="NavItem" data-variant="${item.id === route.id ? 'active' : 'default'}" href="${e(hashFor(item, role))}"${item.id === route.id ? ' aria-current="page"' : ''}>${icon(routeIcon(item))}<span>${e(publicTitle(item))}</span></a>`).join('')}</nav></aside>`;
  };

  const renderContext = ({ portalData, redacted }) => {
    if (redacted) return '';
    const context = portalData.context || {};
    return `<div class="context-bar">${icon('vendor')}<span class="context-value">${e(context.vendorName || '未选择厂商')}</span><span class="context-divider">/</span>${icon('game')}<span class="context-value">${e(context.gameName || '未选择游戏')}</span><span class="context-divider">/</span><span>${e(context.versionName || '未选择版本')}</span></div>`;
  };

  const renderPageHeader = ({ route, page, state, redacted }) => {
    if (route.id === 'P01-01') return '';
    const safeSummary = redacted ? '当前账号无法访问此页面，页面内容已隐藏。' : publicCopy(page.summary || '查看并处理当前业务信息。');
    const actionLabel = redacted ? '返回可访问页面' : (page.primaryAction || '继续');
    const action = redacted ? 'default-state' : primaryAction(page, route);
    return `<header class="page-header"><div><h1 class="page-title" data-page-title>${e(publicTitle(route))}</h1><p class="page-summary">${e(safeSummary)}</p></div><div class="page-actions">${!redacted && state === 'default' ? c.statusTag(page.status || '待处理') : ''}${c.button({ label: actionLabel, variant: 'primary', action, primary: true, disabled: !redacted && Boolean(page.primaryActionDisabled) })}</div></header>`;
  };

  const renderHelpCenter = help => `<section class="help-center" data-help-center hidden>
    <header class="help-center__header"><button class="text-back" type="button" data-help-back data-portal-action="close-help">返回</button><div><div class="page-eyebrow">帮助与支持</div><h1>${e(help.title)}</h1></div></header>
    <div class="help-grid"><section class="panel"><header class="panel-header"><h2 class="panel-title">常见问题</h2></header><div class="panel-body"><div class="faq-list">${help.faq.map((item, index) => `<article class="faq-item"><button type="button" aria-expanded="false" data-portal-action="toggle-faq" data-faq-index="${index}"><span>${e(item.question)}</span><span aria-hidden="true">＋</span></button><p hidden>${e(item.answer)}</p></article>`).join('')}</div></div></section>
    <aside class="contact-card"><div class="page-eyebrow">服务支持</div><h2>联系我们</h2><strong>${e(help.contact.supportName)}</strong><span>${e(help.contact.serviceHours)}</span><span>${e(help.contact.channel)}</span><a href="mailto:${e(help.contact.email)}">${e(help.contact.email)}</a><p>${e(help.contact.fallback)}</p></aside></div>
  </section>`;

  const renderBusiness = ({ module, routes, route, page, portalData, role, state, content }) => {
    const redacted = state === 'permission';
    const isLogin = route.id === 'P01-01' && !redacted;
    const isOnboarding = route.id === 'P01-03' && page.status === '草稿';
    const frameClass = `${isLogin ? ' is-login' : ''}${isOnboarding ? ' is-onboarding' : ''}`;
    return `<div class="portal-stage"><main class="product-frame${frameClass}" data-role="${e(role)}" data-page-state="${e(state)}">${renderTopBar({ module, portalData, role, redacted, isLogin, isOnboarding })}${isLogin || isOnboarding ? '' : renderSideNav({ routes, route, role })}<section class="workspace">${isLogin || isOnboarding ? '' : renderContext({ portalData, redacted })}<div class="page-wrap">${renderPageHeader({ route, page, state, redacted })}<div data-runtime-result></div>${content}</div>${redacted ? '' : renderHelpCenter(portalData.helpCenter)}</section></main></div>`;
  };
  namespace.shell = { roleMeta, publicTitle, hashFor, renderBusiness };
})(window.GameHubDeveloperPortal);
