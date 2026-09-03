window.GameHubDemo = window.GameHubDemo || {};

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
  const hashFor = (route, role = route.role, state = 'default') => `#/${route.id}?role=${role}&state=${state}`;
  const primaryAction = (page, route) => {
    const actions = Array.isArray(page?.actions) ? page.actions : [];
    const byLabel = actions.find(action => action.label === page.primaryAction);
    if (byLabel) return byLabel.id;
    const preferred = actions.find(action => !/reject|interrupt|exclude|stop/.test(action.id || ''));
    return preferred?.id || `primary-${route.id}`;
  };

  const renderTopBar = ({ module, fixture, role, redacted }) => {
    const roleInfo = roleMeta[role] || roleMeta.developer;
    const account = redacted ? null : fixture.accounts?.[role];
    const context = redacted ? null : fixture.context;
    const help = redacted ? '' : `<button class="top-help-button" type="button" data-help-open data-demo-action="open-help">${icon('info')}<span>帮助中心</span></button>`;
    return `<header class="top-bar"><div class="brand-block"><div class="brand-mark">${icon('logo')}</div><div class="brand-copy"><div class="brand-title">盖世游戏</div><div class="brand-subtitle">开发者后台一期</div></div></div><div class="top-context"><strong>${e(module?.name || '开发者后台')}</strong><span class="environment-badge">${e(context?.environment || '演示环境')}</span></div>${help}<div class="top-account"><div class="account-avatar">${e((account?.name || roleInfo.label).slice(0, 1))}</div><div class="account-copy"><strong>${e(account?.name || roleInfo.label)}</strong><span>${e(account?.roleName || roleInfo.roleName)}</span></div></div></header>`;
  };

  const renderSideNav = ({ routes, route, role }) => {
    const allowed = routes.filter(item => item.role === role);
    return `<aside class="side-nav" data-side-nav data-component="SideNav" data-variant="dark"><div class="nav-label">${e(roleMeta[role]?.label || '当前角色')}导航</div><nav class="nav-list" aria-label="业务页导航">${allowed.map(item => `<a class="nav-item${item.id === route.id ? ' is-active' : ''}" data-component="NavItem" data-variant="${item.id === route.id ? 'active' : 'default'}" href="${e(hashFor(item, role))}"${item.id === route.id ? ' aria-current="page"' : ''}>${icon(routeIcon(item))}<span>${e(item.title.replace(/页$/, ''))}</span></a>`).join('')}</nav><div class="nav-footer">仅展示当前角色在本模块可访问的页面</div></aside>`;
  };

  const renderContext = ({ fixture, redacted }) => {
    if (redacted) return '';
    const context = fixture.context || {};
    return `<div class="context-bar">${icon('vendor')}<span class="context-value">${e(context.vendorName || '示例厂商')}</span><span class="context-divider">/</span>${icon('game')}<span class="context-value">${e(context.gameName || '首款签约游戏')}</span><span class="context-divider">/</span><span>${e(context.versionName || '1.0.0')}</span></div>`;
  };

  const renderPageHeader = ({ route, page, state, redacted }) => {
    if (route.id === 'P01-01') return '';
    const safeSummary = redacted ? '当前账号无法访问此页面，页面内容已隐藏。' : (page.summary || '一期业务页面演示');
    const actionLabel = redacted ? '返回可访问页面' : (page.primaryAction || '继续');
    const action = redacted ? 'default-state' : primaryAction(page, route);
    return `<header class="page-header"><div><div class="page-eyebrow">${e(route.id)} / ${e(route.templateId)}</div><h1 class="page-title">${e(route.title)}</h1><p class="page-summary">${e(safeSummary)}</p></div><div class="page-actions">${!redacted && state === 'default' ? c.statusTag(page.status || '待处理') : ''}${c.button({ label: actionLabel, variant: 'primary', action, primary: true, disabled: !redacted && Boolean(page.primaryActionDisabled) })}</div></header>`;
  };

  const renderReviewTools = ({ routes, route, role, state }) => {
    const cdkeyScenarios = route.id === 'P02-01'
      ? `<div class="review-scenarios"><span>CDKEY 场景</span>${[
        ['quota-exceeded', '额度不足'],
        ['channel-denied', '渠道未授权'],
        ['publishing-paused', '发行暂停'],
        ['generation-failed', '生成失败'],
      ].map(([id, label]) => `<button type="button" data-review-scenario="${id}" data-demo-action="review-${id}">${label}</button>`).join('')}</div>`
      : '';
    return `<aside class="review-tools" data-review-only="true"><div class="review-tools__title">评审工具<span>不属于正式后台功能</span></div><div class="review-tools__grid"><label>页面<select data-review-route>${routes.map(item => `<option value="${e(item.id)}"${item.id === route.id ? ' selected' : ''}>${e(item.id)} ${e(item.title)}</option>`).join('')}</select></label><label>角色<select data-review-role>${Object.entries(roleMeta).map(([id, meta]) => `<option value="${id}"${id === role ? ' selected' : ''}>${e(meta.label)}</option>`).join('')}</select></label><label>页面状态<select data-review-state>${['default', 'loading', 'empty', 'error', 'permission'].map(item => `<option value="${item}"${item === state ? ' selected' : ''}>${item}</option>`).join('')}</select></label><label>刷新规则<select disabled><option>恢复 Fixture</option></select></label></div>${cdkeyScenarios}<div class="review-tools__actions">${c.button({ label: '恢复初始演示', variant: 'ghost', size: 'small', action: 'reset-demo', iconName: 'refresh' })}</div></aside>`;
  };

  const renderHelpCenter = help => `<section class="help-center" data-help-center hidden>
    <header class="help-center__header"><button class="text-back" type="button" data-help-back data-demo-action="close-help">返回</button><div><div class="page-eyebrow">GLOBAL HELP</div><h1>${e(help.title)}</h1></div></header>
    <div class="help-grid"><section class="panel"><header class="panel-header"><h2 class="panel-title">常见问题</h2></header><div class="panel-body"><div class="faq-list">${help.faq.map((item, index) => `<article class="faq-item"><button type="button" aria-expanded="false" data-demo-action="toggle-faq" data-faq-index="${index}"><span>${e(item.question)}</span><span aria-hidden="true">＋</span></button><p hidden>${e(item.answer)}</p></article>`).join('')}</div></div></section>
    <aside class="contact-card"><div class="page-eyebrow">CONTACT</div><h2>联系我们</h2><strong>${e(help.contact.supportName)}</strong><span>${e(help.contact.serviceHours)}</span><span>${e(help.contact.channel)}</span><p>${e(help.contact.fallback)}</p></aside></div>
  </section>`;

  const renderBusiness = ({ module, routes, route, page, fixture, role, state, content }) => {
    const redacted = state === 'permission';
    const isLogin = route.id === 'P01-01' && !redacted;
    return `<div class="demo-stage"><main class="product-frame${isLogin ? ' is-login' : ''}" data-frame-id="${e(route.id)}" data-role="${e(role)}" data-template-id="${e(route.templateId)}" data-page-state="${e(state)}">${renderTopBar({ module, fixture, role, redacted })}${isLogin ? '' : renderSideNav({ routes, route, role })}<section class="workspace">${isLogin ? '' : renderContext({ fixture, redacted })}<div class="page-wrap">${renderPageHeader({ route, page, state, redacted })}<div data-runtime-result></div>${content}</div>${redacted ? '' : renderHelpCenter(fixture.helpCenter)}</section></main>${renderReviewTools({ routes, route, role, state })}</div>`;
  };

  const renderOverview = ({ modules, routes }) => `<main class="overview-page"><section class="overview-hero"><div class="overview-kicker">GAMEHUB DEVELOPER BACKEND / MVP</div><h1 class="overview-title">开发者后台一期评审总览</h1><p class="overview-copy">以 4 份最新 PRD 为唯一业务基线，共 4 个模块、37 个业务页（10／6／13／8），覆盖独立平台双登录、三系统发行、双链 CDKEY 供给、经营数据与轻量渠道归因。</p><div class="overview-note">${icon('info')}<span>仅供评审，不属于正式后台功能；不发起真实接口请求。</span></div></section><section class="overview-grid">${modules.map(module => {
    const moduleRoutes = routes.filter(route => route.moduleId === module.id);
    const first = moduleRoutes[0];
    return `<article class="overview-card"><div class="overview-card__head"><span class="overview-card__id">MODULE ${e(module.id)}</span>${c.statusTag(`${moduleRoutes.length} 页`, 'info')}</div><h2>${e(module.name)}</h2><p>${e(module.description || '一期业务闭环中的必要管理与处理页面。')}</p><a class="overview-link" href="${e(module.output + hashFor(first))}">进入模块${icon('chevron')}</a></article>`;
  }).join('')}</section><section class="overview-section"><div class="overview-section__header"><h2>三类业务角色</h2><span>非本角色页面进入通用无权限态</span></div><div class="role-grid">${Object.entries(roleMeta).map(([id, meta]) => `<article class="role-card"><strong>${e(meta.label)} <span class="number">${e(id)}</span></strong><span>${e(meta.description)}</span></article>`).join('')}</div></section><section class="overview-section"><div class="overview-section__header"><h2>37 个业务页索引</h2><span>Frame ID 与 Hash 路由唯一对应</span></div><div class="route-index">${modules.map(module => `<section class="route-group"><h3>${e(module.name)}</h3>${routes.filter(route => route.moduleId === module.id).map(route => `<a href="${e(module.output + hashFor(route))}"><code>${e(route.id)}</code><span>${e(route.title)}</span></a>`).join('')}</section>`).join('')}</div></section></main>`;

  namespace.shell = { roleMeta, hashFor, renderBusiness, renderOverview };
})(window.GameHubDemo);
