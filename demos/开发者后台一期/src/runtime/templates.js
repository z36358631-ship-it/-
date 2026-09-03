window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerTemplates(namespace) {
  const c = namespace.components;
  const e = c.escapeHtml;
  const icon = name => namespace.icons.render(name);

  const actionOf = (page, fallbackId, fallbackLabel) => {
    const actions = Array.isArray(page?.actions) ? page.actions : [];
    const exact = actions.find(action => action.id === fallbackId);
    return exact || { id: fallbackId, label: fallbackLabel };
  };
  const renderActionButtons = (page, excluded = []) => {
    const actions = Array.isArray(page?.actions) ? page.actions : [];
    const visible = actions.filter(action => action?.id && !excluded.includes(action.id));
    return visible.length ? `<div class="form-actions">${visible.map(action => c.button({ label: action.label || action.id, variant: /reject|interrupt|stop|remove/.test(action.id) ? 'danger' : 'secondary', action: action.id })).join('')}</div>` : '';
  };
  const sectionList = items => `<div class="section-list">${(items.length ? items : ['待补充业务内容']).map((item, index) => `<div class="section-item"><span>${e(item)}</span><span class="section-item__index">${String(index + 1).padStart(2, '0')}</span></div>`).join('')}</div>`;
  const panel = ({ title, body, description = '' }) => `<section class="panel"><header class="panel-header"><div><h2 class="panel-title">${e(title)}</h2>${description ? `<div class="panel-description">${e(description)}</div>` : ''}</div></header><div class="panel-body">${body}</div></section>`;
  const readonlyField = ({ label, value, hint = '', wide = false }) => `<div class="field readonly-field${wide ? ' is-wide' : ''}"><span class="field-label"><span>${e(label)}</span>${hint ? `<span class="field-hint">${e(hint)}</span>` : ''}</span><div class="readonly-value">${e(value)}</div></div>`;
  const gateList = items => `<div class="gate-list">${items.map(item => `<div class="gate-item"><span><strong>${e(item.label)}</strong>${item.detail ? `<small>${e(item.detail)}</small>` : ''}</span>${c.statusTag(item.status)}</div>`).join('')}</div>`;
  const listViews = {
    'P01-04': {
      tabs: ['全部游戏', '待处理', '已发布'],
      placeholder: '输入游戏名称',
      filters: [{ label: '发行方式', options: ['全部方式', '第三方平台激活', '盖世直接下载'] }, { label: '资料状态', options: ['全部状态', '草稿', '审核中', '已通过', '已驳回'] }],
      headers: ['游戏名称', '发行方式', '资料状态', '供给／版本', '发布状态', '投放', '更新时间', '操作'],
      rows: [[{ text: '星海远征', subtext: 'GAME-48291 · Windows' }, '盖世直接下载', { status: '已通过' }, '版本 1.0.0 · 测试不通过', { status: '尚未发布' }, '暂无投放', '2026-09-01 18:24', { action: '查看资料', demoAction: 'row-detail' }]],
    },
    'P01-08': {
      tabs: ['全部账号', '正常', '异常映射', '已停用'],
      placeholder: '输入 account_id、邮箱或厂商名称',
      filters: [{ label: '账号状态', options: ['全部状态', '正常', '待设置密码', '已停用'] }, { label: '盖世映射', options: ['全部映射', '已映射', '未映射', '冲突待处理'] }],
      headers: ['独立平台账号', '登录凭据', '开发者资格／厂商', '盖世身份映射', '账号状态', '最近登录', '操作'],
      rows: [[{ text: 'ACC-202609-001', subtext: 'wang***@xinghai.games' }, '密码已设置／盖世登录', '已确认 · 星海互动', { status: '已映射' }, { status: '正常' }, '2026-09-03 09:42', { action: '查看映射', demoAction: 'row-detail' }]],
    },
    'P02-01': {
      tabs: ['全部商品', '供给异常', '可供货'],
      placeholder: '输入游戏名称或 SKU',
      filters: [{ label: '供给状态', options: ['全部状态', '可供货', '库存不足', '售罄', '异常', '未知'] }, { label: '可售条件', options: ['全部条件', '已通过', '有阻塞项'] }],
      headers: ['游戏／商品', 'SKU', '发行方式', '商品状态', '供给状态', '可售条件', '更新时间', '操作'],
      rows: [[{ text: '星海远征', subtext: '标准版商品' }, 'SKU-CN-001', '第三方平台激活', { status: '停售' }, { status: '供给异常' }, '价格与来源待恢复', '2026-09-01 17:50', { action: '查看异常', demoAction: 'row-detail' }]],
    },
    'P02-03': {
      tabs: ['全部商品', '异常待处理', '条件未齐'],
      placeholder: '输入游戏、厂商或 SKU',
      filters: [{ label: '发布与可售', options: ['全部状态', '待发布', '可售', '停售'] }, { label: '供给状态', options: ['全部供给', '可供货', '异常'] }],
      headers: ['商品', 'SKU 数', '发行方式', '商业条件', '供给状态', '发布／可售', '更新时间', '操作'],
      rows: [[{ text: '星海远征', subtext: '星海互动' }, '1 个', '第三方平台激活', { status: '已通过' }, { status: '异常待处理' }, { status: '停售' }, '2026-09-01 17:50', { action: '配置商品', demoAction: 'row-detail' }]],
    },
    'P02-06': {
      tabs: ['异常生效中', '待恢复确认', '已恢复'],
      placeholder: '输入异常编号、商品或 SKU',
      filters: [{ label: '异常类型', options: ['全部类型', '库存', '价格', '来源', '商业供给'] }, { label: '处理状态', options: ['全部状态', '异常生效中', '待恢复确认', '已恢复'] }],
      headers: ['异常编号', '商品／SKU', '来源类型', '异常类型', '影响订单', '处理状态', '更新时间', '操作'],
      rows: [[{ text: 'SUP-20260901-001', subtext: '首次发现 16:20' }, '星海远征 · SKU-CN-001', '供应商 API', '当前价格不可用', '新增销售已停止；既有订单不变', { status: '异常生效中' }, '2026-09-01 17:50', { action: '处理异常', demoAction: 'row-detail' }]],
    },
    'P03-01': {
      tabs: ['全部版本', '测试中', '待发布', '已发布'],
      placeholder: '输入版本号或修订号',
      filters: [{ label: '测试状态', options: ['全部状态', '待提交', '测试中', '测试不通过', '测试通过'] }, { label: '发布状态', options: ['全部状态', '尚未发布', '待发布', '已发布', '已撤回'] }],
      headers: ['版本号', '包体修订', '测试轮次', '测试状态', '发布状态', '更新时间', '操作'],
      rows: [[{ text: '1.0.0', subtext: 'Windows／macOS／Linux' }, '3 个 Build · Manifest 永久保留', '第 1 轮', { status: '测试不通过' }, { status: '尚未发布' }, '2026-09-03 09:36', { action: '查看结果', demoAction: 'row-detail' }]],
    },
    'P03-06': {
      tabs: ['待测试', '测试中', '已完成'],
      placeholder: '输入任务、游戏或版本',
      filters: [{ label: '任务状态', options: ['全部状态', '待测试', '测试中', '已完成', '已失效'] }, { label: '分配时间', options: ['全部时间', '今天', '近 7 天'] }],
      headers: ['待测任务', '游戏／版本', '包体修订', '测试轮次', '测试人员', '分配时间', '任务状态', '操作'],
      rows: [[{ text: 'TEST-202609-002', subtext: '正式环境验收' }, '星海远征 · 1.0.0', 'BUILD-WIN-003', '第 1 轮', '陈宇（本人）', '2026-09-01 13:10', { status: '待测试' }, { action: '领取并查看', demoAction: 'row-detail' }]],
    },
    'P03-09': {
      tabs: ['待分配', '测试中', '测试通过待确认', '异常'],
      placeholder: '输入厂商、游戏或版本',
      filters: [{ label: '测试结果', options: ['全部结果', '未提交', '测试通过', '测试不通过'] }, { label: '审核状态', options: ['全部状态', '待分配', '待确认', '已确认'] }],
      headers: ['厂商／游戏', '版本／修订', '轮次', '有效任务', '测试结果', '审核状态', '发布条件', '操作'],
      rows: [[{ text: '星海互动', subtext: '星海远征' }, '1.0.0 · BUILD-WIN-003', '第 1 轮', '尚未分配', '未提交', { status: '待分配' }, '测试结果待完成', { action: '分配测试', demoAction: 'row-detail' }]],
    },
    'P03-11': {
      tabs: ['待配置', '已排期', '发布失败'],
      placeholder: '输入游戏、版本或修订',
      filters: [{ label: '发布条件', options: ['全部条件', '已通过', '有阻塞项'] }, { label: '发布方式', options: ['全部方式', '未配置', '立即发布', '定时发布'] }],
      headers: ['候选版本', '发布条件', '当前线上版本', '发布方式／时间', '最近结果', '状态', '操作'],
      rows: [[{ text: '1.0.0', subtext: 'BUILD-REV-003 · 星海远征' }, { status: '已通过' }, '0.9.0', '未配置', '暂无发布记录', { status: '待发布' }, { action: '发布配置', demoAction: 'row-detail' }]],
    },
    'P04-01': {
      tabs: ['全部需求', '草稿', '平台处理中', '已结束'],
      placeholder: '输入投放需求或游戏',
      filters: [{ label: '需求状态', options: ['全部状态', '草稿', '开发者已提交', '平台配置中', '已排期', '已驳回'] }, { label: '期望时间', options: ['全部时间', '近 7 天', '近 30 天'] }],
      headers: ['投放需求', '游戏', '投放目标', '期望时间', '需求状态', '更新时间', '操作'],
      rows: [[{ text: 'CMP-202609-001', subtext: '素材修订 01' }, '星海远征', '详情访问', '2026-09-10 — 2026-09-20', { status: '开发者已提交' }, '2026-09-01 18:05', { action: '查看详情', demoAction: 'row-detail' }]],
    },
    'P04-05': {
      tabs: ['待处理', '平台配置中', '已排期', '投放中', '已结束'],
      placeholder: '输入计划、游戏或厂商',
      filters: [{ label: '计划状态', options: ['全部状态', '开发者已提交', '平台配置中', '已排期', '投放中', '已暂停', '已结束'] }, { label: '负责人', options: ['全部负责人', '待领取', '我负责的'] }],
      headers: ['投放计划', '厂商／游戏', '目标', '资源位', '期望／实际排期', '负责人', '计划状态', '操作'],
      rows: [[{ text: 'CMP-202609-001', subtext: '2026-09-01 提交' }, '星海互动 · 星海远征', '详情访问', '待配置', '期望 09-10 — 09-20／实际待定', '待领取', { status: '开发者已提交' }, { action: '开始配置', demoAction: 'row-detail' }]],
    },
  };
  const defaultFooter = (page, options = {}) => {
    const save = actionOf(page, 'save-draft', '保存草稿');
    return `<footer class="form-footer"><span class="save-state" data-save-state>尚未保存</span><div class="form-actions">${options.noSave ? '' : c.button({ label: save.label, action: save.id })}${renderActionButtons(page, [save.id])}</div></footer>`;
  };

  const renderLoginPanel = ({ language, accountPlaceholder, codeLabel, codePlaceholder, loginLabel, autoRegister, activeLanguage }) => `<div data-login-panel="${language}"${language === activeLanguage ? '' : ' hidden'}>
    <h3 class="login-method-title">${language === 'zh' ? '手机号码登录' : 'Email sign-in'}</h3>
    <div class="login-form__fields">
      <div class="login-field-stack">${c.input({ label: language === 'zh' ? '手机号' : 'Email', name: 'loginAccount', placeholder: accountPlaceholder, type: language === 'zh' ? 'tel' : 'email', required: true, extra: language === 'zh' ? 'maxlength="11" inputmode="numeric" autocomplete="tel" data-login-numeric' : 'autocomplete="email"' })}<small class="login-inline-message" data-login-error="account" data-variant="idle" aria-live="polite">&nbsp;</small></div>
      <div class="verification-row"><div class="login-field-stack">${c.input({ label: codeLabel, name: `${language}-verification-code`, placeholder: codePlaceholder, required: true, extra: 'maxlength="6" inputmode="numeric" autocomplete="one-time-code" data-login-numeric' })}<small class="login-inline-message" data-login-error="code" data-variant="idle" aria-live="polite">&nbsp;</small></div>${c.button({ label: language === 'zh' ? '获取验证码' : 'Get code', action: 'send-verification-code', extra: `data-code-language="${language}"` })}</div>
    </div>
    <div class="login-form__action">${c.button({ label: loginLabel, variant: 'primary', action: 'login', primary: true })}</div>
    <div class="login-help">${autoRegister}</div>
  </div>`;

  const renderT01 = ({ language = 'zh', authenticated = false }) => {
    const activeLanguage = language === 'en' ? 'en' : 'zh';
    const isEnglish = activeLanguage === 'en';
    const t = isEnglish ? {
      brand: 'GameHub', platform: 'Developer Platform', help: 'Help Center', language: '中文', login: 'Sign in', console: 'Enter Console',
      heroTitle: '<span class="hero-title-line">An integrated publishing platform</span><span class="hero-title-line">for <span class="hero-title-accent">PC game publishers</span></span>', statsLabel: 'Platform reach',
      stats: [['Monthly active users', 'Approx. 4M+'], ['Monthly impressions', 'Approx. 40M+'], ['Daily active users', 'Approx. 250K+']],
      capabilityTitle: 'From publishing to play, complete global delivery in one place', capabilityDescription: 'Connect onboarding, multi-channel delivery, downloads and launches, then reach global players with targeted campaigns and measurable results.',
      capabilities: [['vendor', 'Game onboarding and global publishing', 'Complete company verification, game setup and multi-platform build testing, then move each version toward release.'], ['key', 'Multi-channel delivery and downloads', 'Support CDKEY and direct-download supply so channels and players can complete claiming, downloading and installation smoothly.'], ['target', 'Targeted campaigns and performance data', 'Reach global players and track impressions, conversions, downloads and launches with campaign attribution.']],
      lifecycleEyebrow: 'GAME LIFECYCLE', lifecycleTitle: 'The right publishing service for every stage', lifecycleDescription: 'From onboarding and launch to live operations, platform records connect content, builds, channel supply, campaigns and performance data.', lifecycleAction: 'Start company verification',
      phases: [['Onboarding', 'Complete company verification, agreements, payment details and game setup'], ['Testing', 'Submit Windows, macOS and Linux builds and receive test feedback'], ['Launch', 'Coordinate release, CDKEY supply and third-party channels'], ['Live operations', 'Support growth with targeted campaigns, channel attribution and performance data']],
      caseEyebrow: 'USE CASES', caseTitle: 'Support for PC games at different publishing stages', caseDescription: 'Combine the services each project needs, from new releases to long-term operations.',
      cases: [['NEW RELEASE', 'New release', 'Coordinate onboarding, testing and publishing', 'Bring company verification, game information, multi-platform build testing and release preparation into one clear workflow.'], ['LIVE OPS', 'Live operations', 'Support sustainable growth with campaigns and data', 'Use targeted campaigns, channel attribution and performance data to monitor impressions, conversion, downloads and launches.'], ['CHANNEL', 'Channel publishing', 'Connect third-party sales channels', 'Use CDKEY batches and standard APIs to supply channels, deliver entitlements and retain traceable records within authorization.']],
      contact: 'Company verification and publishing partnerships', close: 'Close sign-in dialog', qrLabel: 'Sign in by scanning with GameHub', qrDescription: 'Or scan with GameHub to sign in', downloadPrompt: 'Don’t have the GameHub app?', downloadAction: 'Download from the official website',
    } : {
      brand: '盖世游戏', platform: '开发者平台', help: '帮助中心', language: 'EN', login: '登录', console: '进入控制台',
      heroTitle: '<span class="hero-title-line hero-title-line--group"><span class="hero-title-accent">面向</span><span class="hero-title-accent">PC 游戏</span><span>厂商的</span></span><span class="hero-title-line">一体化发行平台</span>', statsLabel: '平台规模数据',
      stats: [['月活用户', '约 400 万+'], ['月曝光次数', '约 4000 万+'], ['日活用户', '约 25 万+']],
      capabilityTitle: '从游戏发行到玩家开玩，一站式完成', capabilityDescription: '贯通游戏接入、多渠道交付、下载与启动，再通过精准投放连接全球用户，让发行与经营形成完整闭环。',
      capabilities: [['vendor', '游戏接入与全球发行', '完成企业认证、游戏建档与三系统包体测试，统一推进每个版本发布。'], ['key', '多渠道交付与下载', '支持 CDKEY 与直接下载两类供给，让第三方渠道和玩家顺畅完成领取、下载与安装。'], ['target', '精准投放与经营数据', '连接全球用户，通过定向投放与归因数据持续观察曝光、转化、下载和启动。']],
      lifecycleEyebrow: '游戏全生命周期', lifecycleTitle: '围绕每个发行阶段，提供对应服务', lifecycleDescription: '从入驻准备到正式发行，再到长线运营，平台把资料、包体、渠道供给、投放和数据贯通起来，帮助开发者持续推进每个阶段的关键任务。', lifecycleAction: '开始企业认证',
      phases: [['接入准备', '完成企业认证、合作协议、收款资料与游戏建档'], ['测试期', '统一提交 Windows、macOS、Linux 包体并获取测试反馈'], ['首发期', '协同版本发布、CDKEY 与第三方渠道供给'], ['运营期', '通过精准化投放、渠道归因与经营数据支持持续增长']],
      caseEyebrow: '合作案例', caseTitle: '服务不同阶段的 PC 游戏发行', caseDescription: '从新品首发到长线运营，为合作项目提供可组合的发行支持。',
      cases: [['NEW RELEASE', '新品首发', '让接入、测试与发布协同推进', '统一承接企业认证、游戏资料、三系统包体测试与版本发布，帮助合作团队清晰推进首发准备。'], ['LIVE OPS', '长线运营', '用投放与经营数据支持持续增长', '结合精准化投放、渠道归因与经营数据，持续观察曝光、转化、下载和启动结果。'], ['CHANNEL', '渠道发行', '灵活连接第三方销售渠道', '通过 CDKEY 批次和标准 API，在授权范围内完成渠道供给、交付与记录追溯。']],
      contact: '了解企业认证或发行合作', close: '关闭登录弹窗', qrLabel: '使用盖世游戏扫码登录', qrDescription: '或第三方盖世游戏扫码登录', downloadPrompt: '未安装盖世游戏 App？', downloadAction: '前往官网下载',
    };
    const caseClasses = ['launch', 'growth', 'channel'];
    const entryAction = authenticated ? 'go-console' : 'open-login';
    const entryLabel = authenticated ? t.console : t.login;
    return `<div class="developer-public">
    <header class="public-header" data-public-header><div class="public-header__inner"><div class="public-brand"><div class="brand-mark">${icon('logo')}</div><div><strong>${e(t.brand)}</strong><span>${e(t.platform)}</span></div></div><nav class="public-header__tools" aria-label="${e(t.platform)}"><button type="button" data-demo-action="open-help">${e(t.help)}</button><button class="public-language-button" type="button" data-demo-action="toggle-interface-language">${e(t.language)}</button><button class="public-login-button" type="button" data-login-open data-demo-action="${entryAction}">${e(entryLabel)}</button></nav></div></header>
    <main class="public-landing" data-public-landing>
      <section class="public-hero public-hero--centered"><div class="public-hero__copy"><h1 class="public-hero-title${isEnglish ? ' is-english' : ''}">${t.heroTitle}</h1><div class="public-hero__actions">${c.button({ label: t.console, variant: 'primary', action: entryAction })}</div></div><div class="public-platform-stats" aria-label="${e(t.statsLabel)}">${t.stats.map(([label, value]) => `<div><small>${e(label)}</small><strong>${e(value)}</strong></div>`).join('')}</div></section>
      <section class="public-capabilities" id="public-capabilities"><div class="public-section-heading"><h2>${e(t.capabilityTitle)}</h2><p>${e(t.capabilityDescription)}</p></div><div class="public-capability-grid">${t.capabilities.map(([iconName, title, description], index) => `<article>${icon(iconName)}<span>${String(index + 1).padStart(2, '0')}</span><h3>${e(title)}</h3><p>${e(description)}</p></article>`).join('')}</div></section>
      <section class="public-lifecycle" id="public-lifecycle"><div class="public-lifecycle__visual"><div class="lifecycle-track">${t.phases.map(([title, description], index) => `<div><span>${String(index + 1).padStart(2, '0')}</span><strong>${e(title)}</strong><small>${e(description)}</small></div>`).join('')}</div></div><div class="public-lifecycle__copy"><span>${e(t.lifecycleEyebrow)}</span><h2>${e(t.lifecycleTitle)}</h2><p>${e(t.lifecycleDescription)}</p><button type="button" data-demo-action="${entryAction}">${e(t.lifecycleAction)} ${icon('chevron')}</button></div></section>
      <section class="public-cases" id="public-cases"><div class="public-section-heading"><span>${e(t.caseEyebrow)}</span><h2>${e(t.caseTitle)}</h2><p>${e(t.caseDescription)}</p></div><div class="public-case-stage">${t.cases.map(([eyebrow, label, title, description], index) => `<article class="public-case-card public-case-card--${caseClasses[index]}"><div class="public-case-art"><span>${e(eyebrow)}</span><strong>${e(label)}</strong></div><div><span>${e(label)}</span><h3>${e(title)}</h3><p>${e(description)}</p></div></article>`).join('')}</div><footer><span>${e(t.contact)}</span><a href="mailto:dev@xiaoji.com">dev@xiaoji.com</a></footer></section>
    </main>
    <section class="public-login-view" data-developer-login hidden><button class="login-modal__backdrop" type="button" data-demo-action="close-login" aria-label="${e(t.close)}"></button><div class="login-shell developer-login" role="dialog" aria-modal="true" aria-labelledby="developer-login-title"><h2 class="login-modal__title" id="developer-login-title">${isEnglish ? 'Developer Center Sign In' : '开发者中心登录'}</h2><button class="login-modal__close" type="button" data-demo-action="close-login" aria-label="${e(t.close)}">×</button><section class="login-form"><div data-password-login>${renderLoginPanel({ language: 'zh', accountPlaceholder: '请输入手机号', codeLabel: '手机验证码', codePlaceholder: '请输入 6 位验证码', loginLabel: '登录 / 注册', autoRegister: '未注册的账号将在登录时自动注册。', activeLanguage })}${renderLoginPanel({ language: 'en', accountPlaceholder: 'Enter your email', codeLabel: 'Email verification code', codePlaceholder: 'Enter the 6-digit code', loginLabel: 'Sign in / Sign up', autoRegister: 'Accounts not yet registered will be created automatically when signing in.', activeLanguage })}</div></section><section class="login-qr-side"><div class="login-qr-side__content"><p class="login-qr-intro">${e(t.qrDescription)}</p><button class="login-qr-button" type="button" data-demo-action="gamehub-login" aria-label="${e(t.qrLabel)}"><span class="login-qr"><i>${icon('logo')}</i></span></button><p class="login-download-prompt"><span>${e(t.downloadPrompt)}</span><a href="https://hub.xiaoji.com/download/" target="_blank" rel="noopener noreferrer">${e(t.downloadAction)}</a></p></div></section></div></section>
  </div>`;
  };

  const renderT02 = () => `<div class="publisher-workspace">
    <section class="workspace-welcome"><div><div class="page-eyebrow">PUBLISHER WORKSPACE</div><h1>我的游戏</h1><p>统一查看本厂商游戏、当前发行阶段与最新审核结果。</p></div><div class="workspace-welcome__actions"><div class="verified-publisher">${icon('check')}<span><strong>星海互动</strong><small>开发者认证已通过</small></span></div>${c.button({ label: '创建游戏', variant: 'primary', action: 'create-game', primary: true })}</div></section>
    <section class="game-library" aria-labelledby="game-library-title"><header class="game-library__header"><div><h2 id="game-library-title">游戏项目</h2><p>选择游戏进入独立控制台；新建游戏仅创建项目，不代表已通过发行审核。</p></div><span class="game-count">1 款游戏</span></header>
      <div class="game-card-grid">
        <button class="create-game-card" type="button" data-demo-action="create-game"><span class="create-game-card__icon">+</span><strong>创建游戏</strong><small>填写基础资料并建立游戏项目</small></button>
        <button class="game-project-card" type="button" data-demo-action="enter-game-console" aria-label="进入星海远征控制台">
          <span class="game-project-card__cover"><span class="game-project-card__art">${icon('game')}</span><span class="game-project-card__state">预发布需修改</span></span>
          <span class="game-project-card__body"><span class="game-project-card__heading"><span><strong>星海远征</strong><small>Windows／macOS／Linux</small></span>${icon('chevron')}</span><span class="game-project-card__ids"><span>Game ID&nbsp; GAME-48291</span><span>APPID&nbsp; APP-7F3A9C</span></span><span class="game-project-card__progress"><i class="is-done"></i><i class="is-done"></i><i class="is-warning"></i><i></i></span><span class="game-project-card__footer"><span>当前阶段：预发布</span><time>09-03 14:20 更新</time></span></span>
        </button>
      </div>
    </section>
    <section class="workspace-notice"><div>${icon('info')}<span><strong>待处理：预发布资料需修改</strong><small>开始时间与测试服务器说明未通过线下确认。</small></span></div><button type="button" data-demo-action="enter-game-review">查看修改要求 ${icon('chevron')}</button></section>
  </div>`;

  const renderListView = (config, tabOptions = {}) => {
    const filters = config.filters.map(filter => c.select(filter)).join('');
    return `<div>${c.tabs({ items: config.tabs, active: 0, ...tabOptions })}<div class="filter-bar"><label class="field"><span class="field-label">关键词</span><span class="search-field">${icon('search')}<input class="gh-input" data-component="Input" data-variant="search" placeholder="${e(config.placeholder)}"></span></label>${filters}${c.button({ label: '查询', action: 'filter-list', iconName: 'search' })}</div>${c.table({ headers: config.headers, rows: config.rows })}${c.pagination({ total: config.rows.length, page: 1 })}</div>`;
  };

  const renderSupplyList = data => {
    const ledgers = data.supplyLedgers || { external: [], gamehub: [] };
    const external = ledgers.external[0] || { source: 'Steam Key', batch: 'EXT-STEAM-202608-07', sku: 'SKU-CN-001', received: 5000, available: 214, state: '库存不足', updatedAt: '2026-09-03 09:18' };
    const gamehub = ledgers.gamehub[0] || { source: '盖世平台 Key', batch: 'KEY-20260902-001', sku: 'SKU-CN-001', generated: 2000, allocated: 640, available: 1360, state: '可供给', updatedAt: '2026-09-03 10:18' };
    return `<div class="supply-overview">
      <section class="supply-product-card"><div class="supply-product-card__art">${icon('game')}</div><div><span>当前商品</span><h2>星海远征 · 标准版</h2><p>SKU-CN-001 · 第三方平台激活 + 盖世渠道兑换</p></div><div class="supply-product-card__status">${c.statusTag('停售', 'danger')}<small>外部 Key 库存不足，新增销售已停止</small></div></section>
      <div class="supply-rule-banner">${icon('info')}<div><strong>两类 Key 库存独立核算</strong><span>外部平台 Key 只允许受控导入或供应商同步；盖世平台 Key 才能由发行方自助生成。两条库存不得相加、互换或自动补位。</span></div></div>
      <div class="supply-ledger-grid">
        <section class="supply-ledger supply-ledger--external"><header><div><span>EXTERNAL KEY · 入站</span><h2>外部 Key 入站账本</h2><p>记录第三方平台 Key 的接收、锁定与剩余数量，平台不生成、不替换。</p></div>${c.statusTag(external.state, 'warning')}</header><div class="ledger-metrics"><div><span>累计接收</span><strong class="number">${e(external.received)}</strong></div><div><span>当前可用</span><strong class="number">${e(external.available)}</strong></div><div><span>来源</span><strong>${e(external.source)}</strong></div></div><dl class="ledger-detail"><div><dt>入站批次</dt><dd>${e(external.batch)}</dd></div><div><dt>适用 SKU</dt><dd>${e(external.sku)}</dd></div><div><dt>最近同步</dt><dd>${e(external.updatedAt)}</dd></div></dl><footer><span>补货需由供应商或运营侧完成</span>${c.button({ label: '查看异常', variant: 'secondary', action: 'view-supply-exception' })}</footer></section>
        <section class="supply-ledger supply-ledger--gamehub"><header><div><span>GAMEHUB KEY · 出站</span><h2>盖世 Key 出站账本</h2><p>记录盖世 Key 的生成、渠道分配与未分配库存，支持自助批次与渠道 API。</p></div>${c.statusTag(gamehub.state, 'success')}</header><div class="ledger-metrics"><div><span>累计生成</span><strong class="number">${e(gamehub.generated)}</strong></div><div><span>已分配</span><strong class="number">${e(gamehub.allocated)}</strong></div><div><span>未分配</span><strong class="number">${e(gamehub.available)}</strong></div></div><dl class="ledger-detail"><div><dt>最近批次</dt><dd>${e(gamehub.batch)}</dd></div><div><dt>适用 SKU</dt><dd>${e(gamehub.sku)}</dd></div><div><dt>最近更新</dt><dd>${e(gamehub.updatedAt)}</dd></div></dl><footer><span>仅在平台授权额度内生成和分配</span>${c.button({ label: '进入 Key 批次', variant: 'primary', action: 'cdkey-jump-tab', extra: 'data-cdkey-target-tab="1"' })}</footer></section>
      </div>
      ${panel({ title: '商品与可售条件', description: '商品资料、定价、地区和供给均满足后才允许新增销售', body: `<div class="sale-readiness"><div class="is-done">${icon('check')}<span><strong>游戏资料</strong><small>资料修订 03 已确认</small></span>${c.statusTag('已通过')}</div><div class="is-done">${icon('check')}<span><strong>定价与地区</strong><small>SKU-CN-001 · 中国大陆</small></span>${c.statusTag('已通过')}</div><div class="is-warning">${icon('warning')}<span><strong>外部 Key 供给</strong><small>安全库存阈值 300，当前仅 214</small></span>${c.statusTag('需补货')}</div><div class="is-done">${icon('check')}<span><strong>盖世 Key 供给</strong><small>剩余配额 ${e(data.authorization.remainingQuota)}</small></span>${c.statusTag('正常')}</div></div>` })}
    </div>`;
  };

  const renderKeyBatchPanel = data => `<div class="key-batch-workspace">
    <section class="cdkey-quota-strip"><div><span>授权总额度</span><strong class="number">${e(data.authorization.totalQuota || 10000)}</strong></div><div><span>已占用额度</span><strong class="number">${e(data.authorization.usedQuota || 2000)}</strong></div><div><span>剩余可生成</span><strong class="number">${e(data.authorization.remainingQuota)}</strong></div><div><span>授权有效期</span><strong>${e(data.authorization.validUntil || '2026-12-31 23:59')}</strong></div></section>
    <div class="cdkey-panel-grid cdkey-panel-grid--batches">
      ${panel({ title: '创建盖世 Key 批次', description: '用途、渠道、地区、数量和有效期全部纳入本次批次快照', body: `<div class="form-grid">
        ${c.input({ label: '批次名称', value: '星云商城首发批次', required: true })}
        ${c.select({ label: 'Key 来源', options: [{ label: data.keySources[0].label, value: data.keySources[0].id }], value: 'gamehub_generated' })}
        ${c.select({ label: '游戏 / SKU', options: ['星海远征 / 标准版（SKU-CN-001）', '星海远征 / 豪华版（SKU-CN-002）'], value: '星海远征 / 标准版（SKU-CN-001）' })}
        ${c.input({ label: '用途', value: '星云商城首发销售', required: true })}
        ${c.select({ label: '渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
        ${c.select({ label: '地区', options: data.authorization.regions || ['中国大陆'], value: (data.authorization.regions || ['中国大陆'])[0] })}
        ${c.input({ label: '数量', value: '2000', type: 'number', required: true, hint: `当前剩余配额 ${data.authorization.remainingQuota}` })}
        ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
      </div><div class="source-boundary"><strong>${e(data.keySources[1].label)}不在此处生成</strong><span>${e(data.keySources[1].rule)}；如需补货，请由运营在外部 Key 供给配置中处理。</span></div><div data-key-batch-result></div><footer class="form-footer"><span class="save-state">生成成功后仅提供一次 Key 明文下载窗口</span>${c.button({ label: '创建批次', variant: 'primary', action: 'create-key-batch' })}</footer>` })}
      ${panel({ title: '批次列表', description: '已分配 Key 永久留痕；暂停或作废只影响尚未分配的库存', body: `<div class="key-batch-list">${data.keyBatches.map((batch, index) => `<article class="key-batch-item"><header><div><strong>${e(batch.name)}</strong><span>${e(batch.batchId)}</span></div>${c.statusTag(batch.status)}</header><div class="key-batch-item__stats"><div><span>总量</span><strong class="number">${e(batch.quantity)}</strong></div><div><span>已分配</span><strong class="number">${e(batch.allocated)}</strong></div><div><span>剩余</span><strong class="number">${e(batch.remaining)}</strong></div></div><dl><div><dt>用途／渠道</dt><dd>${e(batch.purpose || '渠道销售')} · ${e(batch.channel)}</dd></div><div><dt>地区／有效期</dt><dd>${e(batch.region || '中国大陆')} · ${e(batch.expiresAt || '—')}</dd></div><div><dt>明文下载</dt><dd>${e(batch.download)}</dd></div></dl><footer>${c.button({ label: '查看详情', variant: 'text', action: 'view-key-batch', extra: `data-key-batch-index="${index}"` })}${batch.remaining > 0 ? c.button({ label: batch.status === '已暂停' ? '恢复' : '暂停', action: batch.status === '已暂停' ? 'resume-key-batch' : 'pause-key-batch' }) : ''}${batch.remaining > 0 ? c.button({ label: '作废未分配', variant: 'danger', action: 'void-key-batch' }) : ''}</footer></article>`).join('')}</div>` })}
    </div>
  </div>`;

  const renderCredentialPanel = data => {
    const credential = data.credentials[0];
    const scopes = credential.scopes || [{ game: '星海远征', gameId: 'GAME-48291', sku: '标准版', skuId: 'SKU-CN-001', region: '中国大陆', quota: 5000 }];
    return `<div class="credential-workspace">
      <div class="credential-rule-banner">${icon('key')}<div><strong>凭据归属：厂商＋渠道</strong><span>同一渠道凭据可配置多个 Game／SKU Scope；平台在每次调用时校验地区、额度和有效期，不能由单款游戏自行扩大授权。</span></div></div>
      <div class="cdkey-panel-grid cdkey-panel-grid--credentials">
        ${panel({ title: '创建渠道 API 凭据', description: '创建后 client_secret 仅显示一次，关闭或刷新页面后无法恢复', body: `<div class="form-grid">
          ${c.input({ label: '凭据名称', value: '星云商城正式凭据', required: true })}
          ${readonlyField({ label: '归属厂商', value: '星海互动', hint: '跟随当前企业主体' })}
          ${c.select({ label: '白名单渠道', options: data.authorization.channels, value: data.authorization.channels[0] })}
          ${c.input({ label: '单日调用上限', value: '1000', type: 'number', required: true })}
          ${c.input({ label: '有效期', value: '2026-12-31T23:59', type: 'datetime-local', required: true })}
        </div><section class="scope-builder"><header><div><strong>Game／SKU Scope</strong><span>凭据可跨当前厂商的多款已授权游戏配置，以下为本次授权明细。</span></div>${c.button({ label: '添加 Scope', action: 'add-credential-scope', size: 'small' })}</header><div class="scope-builder__row"><span>星海远征</span><span>标准版 · SKU-CN-001</span><span>中国大陆</span><span>额度 5,000</span></div><div class="scope-builder__row"><span>星海远征</span><span>豪华版 · SKU-CN-002</span><span>中国港澳台</span><span>额度 1,200</span></div></section><div data-credential-result></div><footer class="form-footer"><span class="save-state">Scope 只能从平台已授权范围中选择</span>${c.button({ label: '创建凭据', variant: 'primary', action: 'create-api-credential' })}</footer>` })}
        <section class="credential-list-panel"><header><div><span>已创建凭据</span><h2>${e(credential.name)}</h2><p>${e(credential.clientId)} · ${e(credential.ownerType || '厂商＋渠道')}</p></div>${c.statusTag(credential.status, 'success')}</header><div class="credential-secret-line"><span>client_secret</span><strong>${e(credential.secretHint)}</strong><small>遗失后只能轮换 Secret，旧值立即失效</small></div><div class="credential-usage"><div><span>今日调用</span><strong class="number">${e(credential.callsToday || 0)}</strong></div><div><span>今日剩余</span><strong class="number">${e(credential.remainingToday || 0)}</strong></div><div><span>最近调用</span><strong>${e(credential.lastCalledAt)}</strong></div><div><span>有效期</span><strong>${e(credential.expiresAt)}</strong></div></div><section class="credential-scopes"><h3>授权 Scope</h3>${scopes.map(scope => `<div><span><strong>${e(scope.game)}</strong><small>${e(scope.gameId)}</small></span><span><strong>${e(scope.sku)}</strong><small>${e(scope.skuId)}</small></span><span><strong>${e(scope.region)}</strong><small>额度 ${e(scope.quota)}</small></span></div>`).join('')}</section><footer class="credential-actions">${c.button({ label: '轮换 Secret', action: 'rotate-api-credential' })}${c.button({ label: '暂停调用', action: 'pause-api-credential' })}${c.button({ label: '恢复调用', action: 'resume-api-credential' })}${c.button({ label: '撤销凭据', variant: 'danger', action: 'revoke-api-credential' })}</footer></section>
      </div>
    </div>`;
  };

  const renderApiDocs = (docs, apiExample) => {
    const errorDescriptions = {
      '无权限': 'client_id 不属于当前厂商或渠道', '签名失败': '签名串、Secret 或请求头不匹配', '时间戳过期': '客户端时间与服务端偏差超出允许范围', '渠道暂停': '凭据或渠道当前已暂停调用',
      '游戏未授权': 'game_id／sku_id 不在凭据 Scope 内', '配额不足': '渠道或 Scope 剩余额度不足', '无可用 Key': '对应盖世 Key 批次无未分配库存', '重复订单冲突': '同一渠道订单使用了不同 request_id', '服务异常': '结果未知时先查询，禁止直接换 request_id 重试',
    };
    return `<div class="api-docs-shell">
      <aside class="api-docs-sidebar"><nav class="api-docs-nav" aria-label="接口说明目录">${[['auth', '01 鉴权与签名'], ['endpoints', '02 接口目录'], ['fields', '03 请求字段'], ['example', '04 请求示例'], ['recovery', '05 结果恢复'], ['errors', '06 错误码']].map(([id, label]) => `<button type="button" data-demo-action="api-doc-section" data-api-target="api-doc-${id}">${e(label)}</button>`).join('')}</nav><section class="api-contact-card"><span>环境地址</span><strong>由商务线下提供</strong><p>Demo 不连接生产服务，不展示真实域名、client_id 或 Secret。</p></section></aside>
      <div class="api-docs-content">
        <section id="api-doc-auth">${panel({ title: '鉴权、签名与幂等', description: '所有请求使用 HTTPS，Secret 永不进入 URL 或业务日志', body: `<div class="api-rule-grid"><article><span>01</span><strong>生成签名串</strong><p>按 method、path、timestamp、nonce 与 body_hash 固定顺序拼接。</p></article><article><span>02</span><strong>HMAC-SHA256</strong><p>${e(docs.auth)}</p></article><article><span>03</span><strong>request_id 幂等</strong><p>${e(docs.idempotency)}</p></article></div>` })}</section>
        <section id="api-doc-endpoints">${panel({ title: '接口目录', body: `<div class="endpoint-list">${docs.endpoints.map((item, index) => `<article><span class="endpoint-method">${e(item.method)}</span><code>${e(item.path)}</code><div><strong>${e(item.purpose)}</strong><small>${index === 0 ? '首次调用；成功时返回已分配 Key' : index === 1 ? '超时或网络中断后优先调用' : '渠道确认已经向最终用户交付'}</small></div></article>`).join('')}</div>` })}</section>
        <section id="api-doc-fields">${panel({ title: '核心请求字段', body: `<div class="api-field-grid">${[['request_id', '必填 · string', '渠道生成的全局唯一幂等请求号；同一业务重试必须复用。'], ['channel_order_id', '必填 · string', '渠道订单号；同一订单不得映射多个 request_id。'], ['game_id', '必填 · string', '必须属于当前厂商并位于凭据 Scope。'], ['sku_id', '必填 · string', '必须属于 game_id 且地区与额度均可用。'], ['status', '响应 · enum', 'PROCESSING／ALLOCATED／CONFIRMED／FAILED。']].map(([name, meta, copy]) => `<article><code>${name}</code><span>${meta}</span><p>${copy}</p></article>`).join('')}</div>` })}</section>
        <section id="api-doc-example">${c.codeBlock({ title: '申请一个盖世 Key · 请求示例', code: apiExample })}</section>
        <section id="api-doc-recovery">${panel({ title: '网络结果未知时的恢复流程', description: '避免重复扣减库存或向同一订单发放多个 Key', body: `<div class="recovery-flow"><div><span>1</span><strong>保留原 request_id</strong><small>不要新建请求号</small></div><i></i><div><span>2</span><strong>查询分配状态</strong><small>GET allocations/{request_id}</small></div><i></i><div><span>3</span><strong>按状态继续</strong><small>已分配则读取原结果；处理中稍后重查</small></div><i></i><div><span>4</span><strong>确认交付</strong><small>用户收到后调用 confirm</small></div></div><div class="network-unknown-note">${icon('warning')}<span><strong>网络结果未知不等于分配失败</strong><small>只有查询明确返回 FAILED 且标记可重试时，才允许使用原 request_id 重试。</small></span></div>` })}</section>
        <section id="api-doc-errors">${panel({ title: '错误码与处理建议', body: `<div class="api-error-list">${docs.errors.map(item => `<button type="button" data-demo-action="filter-api-error"><strong>${e(item)}</strong><span>${e(errorDescriptions[item] || '根据响应说明检查请求参数后处理')}</span></button>`).join('')}</div>` })}</section>
      </div>
    </div>`;
  };

  const renderCdkeyWorkspace = page => {
    const data = page.cdkeySelfService;
    const apiExample = `POST /openapi/v1/cdkeys/allocate\nX-Client-Id: cli_xh_20260901\nX-Timestamp: 1788336000\nX-Nonce: 4f8a9c2e7b13\nX-Signature: a71ef0284c8bd902\n\n{\n  "request_id": "REQ-ALLOC-20260903-001",\n  "channel_order_id": "ORDER-CHANNEL-20260903-001",\n  "game_id": "GAME-48291",\n  "sku_id": "SKU-CN-001"\n}`;
    return `<div class="cdkey-workspace" data-cdkey-workspace>
      <section class="cdkey-context-header"><div><span>当前游戏</span><h2>星海远征</h2><p>GAME-48291 · 商品与 CDKEY</p></div><div><span>授权主体</span><strong>星海互动</strong><small>${e(data.authorization.scope)}</small></div><div><span>剩余盖世 Key 配额</span><strong class="number">${e(data.authorization.remainingQuota)}</strong><small>外部 Key 库存不计入此额度</small></div><div>${c.statusTag(data.authorization.status, 'success')}<small>有效至 ${e(data.authorization.validUntil || '2026-12-31 23:59')}</small></div></section>
      ${c.tabs({ items: data.tabs, active: 0, variant: 'task', action: 'cdkey-tab', idPrefix: 'cdkey-tab' })}
      <section role="tabpanel" aria-labelledby="cdkey-tab-0" id="cdkey-tab-0-panel" data-cdkey-panel="supply">${renderSupplyList(data)}</section>
      <section role="tabpanel" aria-labelledby="cdkey-tab-1" id="cdkey-tab-1-panel" data-cdkey-panel="batches" hidden>${renderKeyBatchPanel(data)}</section>
      <section role="tabpanel" aria-labelledby="cdkey-tab-2" id="cdkey-tab-2-panel" data-cdkey-panel="credentials" hidden>${renderCredentialPanel(data)}</section>
      <section role="tabpanel" aria-labelledby="cdkey-tab-3" id="cdkey-tab-3-panel" data-cdkey-panel="api-docs" hidden>${renderApiDocs(data.apiDocs, apiExample)}</section>
    </div>`;
  };

  const qualificationValue = (qualification, key, fallback = '') => qualification?.form?.[key] ?? fallback;
  const qualificationStatusLabel = (status, language = 'zh') => (language === 'en'
    ? ({ unsubmitted: 'Not submitted', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', delisted: 'Delisted' }[status] || 'Not submitted')
    : ({ unsubmitted: '未提交', pending: '待审核', approved: '已通过', rejected: '已拒绝', delisted: '已下架' }[status] || '未提交'));
  const renderManagedHtml = value => {
    const source = String(value || '').trim();
    if (!source) return '';
    if (!/<(?:p|h[1-6]|ul|ol|li|blockquote|img|div|strong|em|a|br)\b/i.test(source)) return e(source).replaceAll('\n', '<br>');
    const unsafeScriptPattern = new RegExp('<' + 'script\\b[^>]*>[\\s\\S]*?<\\/' + 'script>', 'gi');
    return source
      .replace(unsafeScriptPattern, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
      .replace(/javascript:/gi, '');
  };
  const qualificationHistory = qualification => qualification?.history?.length
    ? qualification.history.map(item => `${item.action} · ${item.actor} · ${item.time}`)
    : ['尚未提交企业认证申请'];

  const renderDeveloperEntryChoice = ({ language }) => {
    const isEnglish = language === 'en';
    const choices = isEnglish ? [
      {
        variant: 'registered', iconName: 'file', title: 'Register as a platform developer', review: 'No review required', action: 'Quick registration', actionId: 'register-platform-developer',
        sections: [['Available now', 'Help Center, onboarding guides and company verification entry'], ['Access boundary', 'Game creation, builds, CDKEY supply, campaigns and publishing data remain unavailable until company verification is approved.'], ['Registration details', 'Use the current signed-in account. No company documents are required.']],
      },
      {
        variant: 'enterprise', iconName: 'vendor', title: 'Verify as an enterprise developer', review: 'Operations review · within 5 business days', action: 'Apply for verification', actionId: 'start-company-verification',
        sections: [['Available after approval', 'Game onboarding and publishing, multi-platform builds, CDKEY supply, targeted campaigns and publishing data'], ['Required information', 'Business registration, agreements, bank details, publisher profile and business contact'], ['Account continuity', 'Verification upgrades the current platform account; no new account is created.']],
      },
    ] : [
      {
        variant: 'registered', iconName: 'file', title: '注册平台开发者', review: '无需审核', action: '快速注册', actionId: 'register-platform-developer',
        sections: [['当前可使用', '帮助中心、接入资料与企业认证入口'], ['权限边界', '企业认证通过前，暂不可创建游戏，也不可使用包体、CDKEY、精准投放与发行数据能力。'], ['注册资料', '沿用当前登录账号，无需提交企业材料。']],
      },
      {
        variant: 'enterprise', iconName: 'vendor', title: '认证企业开发者', review: '平台运营审核 · 预计 5 个工作日内', action: '申请认证', actionId: 'start-company-verification',
        sections: [['审核通过后开通', '游戏接入与发行、三系统包体、CDKEY 供给、精准化投放与发行数据'], ['申请资料', '企业工商、合作协议、银行资料、厂商品牌与业务联系人'], ['账号关系', '认证将在当前平台账号上升级，不会创建新的账号。']],
      },
    ];
    return `<section class="developer-entry" data-developer-entry>
      <header class="developer-entry__header"><h1>${isEnglish ? 'Choose how you want to get started' : '选择当前入驻方式'}</h1><p>${isEnglish ? 'Your platform account has been created. You can browse onboarding resources first or submit company verification for publishing access.' : '平台账号已创建。你可以先浏览接入资料，也可以提交企业认证以申请发行权限。'}</p></header>
      <div class="developer-entry__grid">${choices.map(choice => `<article class="developer-entry-card developer-entry-card--${choice.variant}"><div class="developer-entry-card__icon">${icon(choice.iconName)}</div><h2>${e(choice.title)}</h2><strong class="developer-entry-card__review">${e(choice.review)}</strong>${c.button({ label: choice.action, variant: 'primary', action: choice.actionId })}<div class="developer-entry-card__details">${choice.sections.map(([title, description]) => `<section><h3><i></i>${e(title)}</h3><p>${e(description)}</p></section>`).join('')}</div></article>`).join('')}</div>
    </section>`;
  };

  const renderPlatformAccountOverview = ({ isEnglish, status, verificationLabel, accessEnabled, activeTab }) => {
    const gameCount = accessEnabled ? '1' : '0';
    const pendingCount = status === 'pending' ? '1' : status === 'rejected' ? '1' : accessEnabled ? '1' : '1';
    const verificationCopy = status === 'pending'
      ? (isEnglish ? 'Submitted, expected within 5 business days' : '资料已提交，预计 5 个工作日内完成')
      : status === 'rejected'
        ? (isEnglish ? 'Update the rejected fields and resubmit' : '请按审核意见修改后重新提交')
        : accessEnabled
          ? (isEnglish ? 'Publishing capabilities are enabled' : '发行合作能力已开通')
          : (isEnglish ? 'Verification is required before publishing' : '完成认证后才能创建游戏并申请发行');
    return `<section class="platform-console-panel" data-platform-console-panel="overview"${activeTab === 'overview' ? '' : ' hidden'}>
      <header class="platform-dashboard-hero"><div><span>${isEnglish ? 'DEVELOPER CONSOLE' : '开发者控制台'}</span><h1>${isEnglish ? 'Welcome back' : '你好，星海互动'}</h1><p>${isEnglish ? 'Review account access, game onboarding progress and tasks that need attention.' : '集中查看账号权限、游戏接入进度和需要继续处理的事项。'}</p></div><div class="platform-dashboard-hero__identity">${icon(accessEnabled ? 'check' : 'vendor')}<span><strong>${isEnglish ? 'Xinghai Interactive' : '星海互动'}</strong><small>${e(verificationLabel)}</small></span></div></header>
      <div class="metric-grid platform-account-metrics">${c.metricCard({ label: isEnglish ? 'Platform account' : '平台账号', value: isEnglish ? 'Active' : '正常', trend: isEnglish ? 'Signed in and registered' : '已登录并完成平台注册' })}${c.metricCard({ label: isEnglish ? 'Company verification' : '企业认证', value: verificationLabel, trend: verificationCopy })}${c.metricCard({ label: isEnglish ? 'Games' : '游戏数量', value: gameCount, trend: accessEnabled ? (isEnglish ? '1 title in pre-release' : '1 款处于预发布阶段') : (isEnglish ? 'Available after approval' : '认证通过后可创建') })}${c.metricCard({ label: isEnglish ? 'Open tasks' : '待处理事项', value: pendingCount, trend: accessEnabled ? (isEnglish ? 'Pre-release changes required' : '预发布资料需修改') : verificationCopy })}</div>
      <div class="platform-dashboard-grid">
        <section class="platform-account-card"><header><div><span>${isEnglish ? 'ACCOUNT & ACCESS' : '账号与权限'}</span><h2>${isEnglish ? 'Current access' : '当前账号能力'}</h2></div>${c.statusTag(isEnglish ? 'Active' : '账号正常', 'success')}</header><div class="platform-account-lines"><div>${icon('check')}<span><strong>${isEnglish ? 'Platform developer' : '平台开发者'}</strong><small>${isEnglish ? 'Help Center and integration resources are available.' : '已可使用帮助中心与接入资料。'}</small></span></div><div class="${accessEnabled ? 'is-enabled' : 'is-locked'}">${icon(accessEnabled ? 'check' : 'lock')}<span><strong>${isEnglish ? 'Game publishing' : '游戏发行能力'}</strong><small>${accessEnabled ? (isEnglish ? 'Game setup, builds, CDKEY and publishing data are enabled.' : '游戏建档、包体、CDKEY 和发行数据已开通。') : (isEnglish ? 'Enabled after company verification.' : '企业认证通过后开通。')}</small></span></div><div class="${accessEnabled ? 'is-enabled' : 'is-locked'}">${icon(accessEnabled ? 'check' : 'lock')}<span><strong>${isEnglish ? 'Channel API' : '渠道 API'}</strong><small>${accessEnabled ? (isEnglish ? 'Credentials remain limited by publisher and channel scopes.' : '凭据仍受厂商、渠道和 Scope 授权限制。') : (isEnglish ? 'Enabled after company verification.' : '企业认证通过后开通。')}</small></span></div></div></section>
        <section class="platform-onboarding-card"><header><div><span>${isEnglish ? 'ONBOARDING' : '游戏接入进度'}</span><h2>${accessEnabled ? (isEnglish ? 'Ocean Expedition' : '星海远征') : (isEnglish ? 'Publishing access not enabled' : '尚未开通游戏接入')}</h2></div>${c.statusTag(accessEnabled ? (isEnglish ? 'Pre-release' : '预发布') : verificationLabel, accessEnabled ? 'warning' : 'info')}</header>${accessEnabled ? `<div class="platform-progress-track"><div class="is-done"><i>${icon('check')}</i><span><strong>游戏资料</strong><small>已确认</small></span></div><div class="is-done"><i>${icon('check')}</i><span><strong>APPID 与 SDK</strong><small>三系统已接入</small></span></div><div class="is-warning"><i>${icon('warning')}</i><span><strong>预发布审核</strong><small>需修改 2 项资料</small></span></div><div><i>4</i><span><strong>正式上线</strong><small>待预发布通过</small></span></div></div><footer>${c.button({ label: isEnglish ? 'Open game console' : '进入游戏控制台', variant: 'primary', action: 'enter-game-console' })}</footer>` : `<div class="platform-empty-progress">${icon('lock')}<strong>${isEnglish ? 'Complete company verification first' : '请先完成企业认证'}</strong><p>${verificationCopy}</p>${c.button({ label: status === 'pending' ? (isEnglish ? 'View progress' : '查看审核进度') : status === 'rejected' ? (isEnglish ? 'Update application' : '修改认证资料') : (isEnglish ? 'Apply for verification' : '申请企业认证'), variant: 'primary', action: status === 'unsubmitted' ? 'start-company-verification' : 'platform-console-tab', extra: status === 'unsubmitted' ? '' : 'data-platform-console-tab="qualification"' })}</div>`}</section>
        <section class="platform-task-card"><header><div><span>${isEnglish ? 'TO DO' : '待处理事项'}</span><h2>${isEnglish ? 'Continue setup' : '继续完成以下事项'}</h2></div><strong>${pendingCount}</strong></header><div class="platform-task-list">${accessEnabled ? `<button type="button" data-demo-action="enter-game-review"><span class="task-level is-warning">优先</span><span><strong>修改预发布申请</strong><small>开始时间与测试服务器说明需要补充</small></span>${icon('chevron')}</button><button type="button" data-demo-action="cdkey-external-entry"><span class="task-level">供给</span><span><strong>补充外部 Key 库存</strong><small>当前低于安全库存阈值 300</small></span>${icon('chevron')}</button>` : `<button type="button" data-demo-action="${status === 'unsubmitted' ? 'start-company-verification' : 'platform-console-tab'}"${status === 'unsubmitted' ? '' : ' data-platform-console-tab="qualification"'}><span class="task-level is-warning">认证</span><span><strong>${verificationLabel}</strong><small>${verificationCopy}</small></span>${icon('chevron')}</button>`}</div></section>
        <section class="platform-shortcuts"><header><span>${isEnglish ? 'QUICK ACTIONS' : '快捷入口'}</span><h2>${isEnglish ? 'Common tasks' : '常用操作'}</h2></header><div><button type="button" data-demo-action="platform-console-tab" data-platform-console-tab="games">${icon('game')}<span><strong>${isEnglish ? 'Game management' : '游戏管理'}</strong><small>${accessEnabled ? (isEnglish ? 'Open game projects' : '进入游戏项目') : (isEnglish ? 'View access requirements' : '查看开通条件')}</small></span></button><button type="button" data-demo-action="platform-console-tab" data-platform-console-tab="resources">${icon('file')}<span><strong>${isEnglish ? 'Integration resources' : '接入资料'}</strong><small>${isEnglish ? 'Read SDK and API guides' : '查看 SDK 与 API 指南'}</small></span></button><button type="button" data-demo-action="platform-console-tab" data-platform-console-tab="qualification">${icon('vendor')}<span><strong>${isEnglish ? 'Company verification' : '企业认证'}</strong><small>${verificationLabel}</small></span></button></div></section>
      </div>
    </section>`;
  };

  const renderPlatformGameManagement = ({ isEnglish, status, verificationLabel, accessEnabled, activeTab }) => `<section class="platform-console-panel" data-platform-console-panel="games"${activeTab === 'games' ? '' : ' hidden'}>
    <header class="platform-section-header"><div><span>${isEnglish ? 'GAME MANAGEMENT' : '游戏管理'}</span><h1>${isEnglish ? 'Game projects' : '我的游戏'}</h1><p>${isEnglish ? 'Create a project, review identifiers and continue each game in its own console.' : '创建游戏项目，查看 Game ID、APPID、发行阶段和最新审核结果；每款游戏使用独立控制台。'}</p></div>${c.button({ label: isEnglish ? 'Create game' : '创建游戏', variant: 'primary', action: accessEnabled ? 'create-game' : 'verification-required', disabled: !accessEnabled })}</header>
    ${accessEnabled ? `<section class="platform-game-library"><header><div><h2>${isEnglish ? 'All games' : '全部游戏'}</h2><p>${isEnglish ? '1 title · sorted by latest update' : '共 1 款 · 按最近更新时间排序'}</p></div><div class="platform-game-filter"><span>${icon('search')}<input type="search" placeholder="${isEnglish ? 'Search by title, Game ID or APPID' : '搜索游戏名称、Game ID 或 APPID'}"></span><select aria-label="${isEnglish ? 'Release stage' : '发行阶段'}"><option>${isEnglish ? 'All stages' : '全部阶段'}</option><option>${isEnglish ? 'Pre-release' : '预发布'}</option></select></div></header><div class="platform-game-grid"><button class="platform-create-game" type="button" data-demo-action="create-game"><i>+</i><strong>${isEnglish ? 'Create game' : '创建游戏'}</strong><small>${isEnglish ? 'Start with basic information' : '填写基础资料并建立项目'}</small></button><button class="platform-game-card" type="button" data-demo-action="enter-game-console"><span class="platform-game-card__cover">${icon('game')}<em>${isEnglish ? 'Pre-release' : '预发布'}</em></span><span class="platform-game-card__body"><span class="platform-game-card__title"><span><strong>${isEnglish ? 'Ocean Expedition' : '星海远征'}</strong><small>Windows／macOS／Linux</small></span>${c.statusTag(isEnglish ? 'Changes required' : '需修改', 'warning')}</span><span class="platform-game-card__ids"><span><small>Game ID</small><strong>GAME-48291</strong></span><span><small>APPID</small><strong>APP-7F3A9C</strong></span></span><span class="platform-game-card__steps"><i class="is-done"></i><i class="is-done"></i><i class="is-warning"></i><i></i></span><span class="platform-game-card__result"><span><small>${isEnglish ? 'Latest review' : '最新审核结果'}</small><strong>${isEnglish ? 'Pre-release application needs changes' : '预发布申请需修改'}</strong></span><time>2026-09-03 14:20</time></span></span></button></div></section>` : `<section class="platform-access-gate">${icon('lock')}<span>${isEnglish ? 'PUBLISHING ACCESS' : '发行权限未开通'}</span><h2>${isEnglish ? 'Company verification is required before creating a game' : '企业认证通过后才能创建游戏'}</h2><p>${status === 'pending' ? (isEnglish ? 'Your application is being reviewed. Game creation will be enabled automatically after approval.' : '企业认证正在审核中，通过后将自动开通游戏创建与单游戏控制台。') : status === 'rejected' ? (isEnglish ? 'Update the rejected company information and submit again.' : '请根据审核意见修改企业资料并重新提交。') : (isEnglish ? 'Submit company details, agreements, payment information and contacts for review.' : '请先提交企业工商、协议、银行资料与联系人信息。')}</p>${c.button({ label: status === 'pending' ? (isEnglish ? 'View review progress' : '查看审核进度') : status === 'rejected' ? (isEnglish ? 'Edit application' : '修改认证资料') : (isEnglish ? 'Apply for verification' : '申请企业认证'), variant: 'primary', action: status === 'unsubmitted' ? 'start-company-verification' : 'platform-console-tab', extra: status === 'unsubmitted' ? '' : 'data-platform-console-tab="qualification"' })}<small>${isEnglish ? `Current status: ${verificationLabel}` : `当前状态：${verificationLabel}`}</small></section>`}
  </section>`;

  const renderPlatformResources = ({ isEnglish, activeTab }) => {
    const categories = isEnglish ? [
      ['quickstart', 'Quick start'], ['sdk', 'SDK & authentication'], ['builds', 'Builds & release'], ['cdkey', 'CDKEY & Channel API'],
    ] : [['quickstart', '快速开始'], ['sdk', 'SDK 与鉴权'], ['builds', '包体与发布'], ['cdkey', 'CDKEY 与渠道 API']];
    const documents = isEnglish ? [
      ['quickstart', 'Quick start', 'Complete company verification, create a game, obtain an APPID, integrate the SDK and submit a test build.', ['Register and verify the company', 'Create the game and obtain the APPID', 'Complete SDK initialization and sign-in checks', 'Upload a build and submit a test request']],
      ['sdk', 'SDK & authentication', 'Use the same APPID for Windows, macOS and Linux. The minimum integration includes initialization, sign-in state, entitlement checks, launch authorization, errors and logs.', ['Initialize SDK and read the environment', 'Check platform sign-in state', 'Verify entitlement before first launch', 'Handle error codes and upload logs']],
      ['builds', 'Builds & release', 'Upload resumable builds, verify file integrity and manage versions, test allowlists and release applications.', ['Create a build revision', 'Upload files with resumable chunks', 'Configure test users and entitlements', 'Submit pioneer test, pre-release and launch applications']],
      ['cdkey', 'CDKEY & Channel API', 'External keys are imported only. GameHub keys can be generated by the publisher and allocated through scoped channel credentials.', ['Confirm product and SKU authorization', 'Create a GameHub Key batch', 'Create publisher + channel credentials', 'Allocate, query and confirm with request_id']],
    ] : [
      ['quickstart', '快速开始', '按企业认证、创建游戏、获取 APPID、接入 SDK、上传测试包体的顺序完成首次接入。', ['完成平台注册与企业认证', '创建游戏并获取 Game ID／APPID', '完成 SDK 初始化与登录验权', '上传包体并提交先锋测试']],
      ['sdk', 'SDK 与鉴权', 'Windows、macOS、Linux 共用同一 APPID；最小接入包含初始化、登录状态、权益校验、启动授权、错误码和日志上报。', ['初始化 SDK 并读取运行环境', '校验盖世平台登录状态', '首次启动前校验账户权益', '处理错误码并上报必要日志']],
      ['builds', '包体与发布', '支持断点续传、文件完整性校验、构建版本、测试白名单和发布申请；每次提交形成独立记录。', ['创建构建版本与 Build 修订', '分片上传并完成完整性校验', '配置测试白名单与测试权益', '依次提交先锋测试、预发布和正式上线申请']],
      ['cdkey', 'CDKEY 与渠道 API', '外部平台 Key 只允许受控导入；盖世 Key 支持厂商自助生成，并通过厂商＋渠道级凭据进行 API 分配。', ['确认商品、SKU 与渠道授权', '创建盖世 Key 批次并一次性下载', '创建厂商＋渠道凭据和 Scope', '使用 request_id 完成分配、查询与确认']],
    ];
    const deliverables = {
      quickstart: isEnglish ? ['Company verification approved', 'Game information', 'Three-OS development plan'] : ['企业认证通过', '游戏基础资料', '三系统开发计划'],
      sdk: isEnglish ? ['Current game APPID', 'SDK package', 'Server-side verification environment'] : ['当前游戏 APPID', 'SDK 下载包', '服务端校验环境'],
      builds: isEnglish ? ['SDK-integrated build', 'Version and release notes', 'Test allowlist accounts'] : ['已接入 SDK 的包体', '版本号与更新说明', '测试白名单账号'],
      cdkey: isEnglish ? ['Product and SKU authorization', 'Channel and quota', 'Server callback and idempotency plan'] : ['商品与 SKU 授权', '渠道名称与额度', '服务端回调与幂等方案'],
    };
    return `<section class="platform-console-panel" data-platform-console-panel="resources"${activeTab === 'resources' ? '' : ' hidden'}><header class="platform-section-header"><div><span>${isEnglish ? 'DOCUMENTATION' : '接入资料'}</span><h1>${isEnglish ? 'Integration guide' : '开发者接入指南'}</h1><p>${isEnglish ? 'Start with the quick guide, then open detailed SDK, build or channel delivery instructions.' : '先按快速开始完成首次接入，再根据开发进度查看 SDK、包体发布与渠道交付说明。'}</p></div>${c.button({ label: isEnglish ? 'Open Help Center' : '进入帮助中心', action: 'open-help' })}</header><div class="platform-resource-library"><aside><strong>${isEnglish ? 'Documentation' : '文档目录'}</strong><nav>${categories.map(([id, label], index) => `<button type="button" data-demo-action="resource-category" data-resource-category="${id}" class="${index === 0 ? 'is-active' : ''}">${icon(id === 'quickstart' ? 'file' : id === 'sdk' || id === 'builds' ? 'build' : 'key')}<span>${e(label)}</span>${icon('chevron')}</button>`).join('')}</nav><div class="platform-resource-support">${icon('info')}<span><strong>${isEnglish ? 'Need help?' : '需要协助？'}</strong><small>${isEnglish ? 'Contact developer support' : '联系开发者支持'}<br>dev@xiaoji.com</small></span></div></aside><main>${documents.map(([id, title, description, steps], index) => `<article data-resource-document="${id}"${index === 0 ? '' : ' hidden'}><div class="resource-breadcrumb">${isEnglish ? 'Integration resources' : '接入资料'}<span>/</span>${e(title)}</div><h2>${e(title)}</h2><p class="resource-lead">${e(description)}</p><section><h3>${isEnglish ? 'Recommended steps' : '推荐接入步骤'}</h3><ol>${steps.map((step, stepIndex) => `<li><span>${String(stepIndex + 1).padStart(2, '0')}</span><strong>${e(step)}</strong></li>`).join('')}</ol></section><section class="resource-deliverables"><h3>${isEnglish ? 'Before you continue' : '继续前请准备'}</h3><div>${(deliverables[id] || []).map(item => `<span>${icon('check')}${e(item)}</span>`).join('')}</div></section><footer><span>${isEnglish ? 'The formal interface address and credentials are provided after authorization.' : '正式接口地址与生产凭据将在授权后由商务线下提供。'}</span>${id === 'cdkey' ? c.button({ label: isEnglish ? 'Open CDKEY console' : '进入 CDKEY 控制台', variant: 'primary', action: 'open-cdkey-console' }) : c.button({ label: isEnglish ? 'View detailed article' : '查看详细说明', action: 'open-help' })}</footer></article>`).join('')}</main></div></section>`;
  };

  const renderPlatformDeveloperAccount = ({ registration, qualification, language }) => {
    const isEnglish = language === 'en';
    const activeTab = registration?.consoleTab || (qualification?.status === 'unsubmitted' ? 'overview' : 'qualification');
    const status = qualification?.status || 'unsubmitted';
    const verificationLabel = qualificationStatusLabel(status, language);
    const accessEnabled = status === 'approved';
    const reviewSwitcher = status === 'unsubmitted' ? '' : `<section class="demo-status-switcher" aria-label="${isEnglish ? 'Demo review status switcher' : 'Demo 审核状态切换'}"><strong>${isEnglish ? 'Demo status' : '演示状态'}</strong><div class="form-actions">${c.button({ label: isEnglish ? 'Under review' : '审核中', action: 'qualification-preview-pending', disabled: status === 'pending', size: 'small' })}${c.button({ label: isEnglish ? 'Approved' : '审核通过', variant: 'primary', action: 'qualification-preview-approved', disabled: status === 'approved', size: 'small' })}${c.button({ label: isEnglish ? 'Rejected' : '审核未通过', variant: 'danger', action: 'qualification-preview-rejected', disabled: status === 'rejected', size: 'small' })}</div></section>`;
    const overview = `<section class="platform-console-panel" data-platform-console-panel="overview"${activeTab === 'overview' ? '' : ' hidden'}>
      <header class="platform-console-hero"><div><span>${isEnglish ? 'GAME PERFORMANCE' : '游戏数据'}</span><h1>${isEnglish ? 'Game performance overview' : '游戏数据总览'}</h1><p>${isEnglish ? 'Game-level performance will appear here after a title is onboarded.' : '游戏接入后，在这里查看每款游戏的浏览、下载、预约、转化与收益数据。'}</p></div>${c.statusTag(isEnglish ? 'Account active' : '账号正常', 'info')}</header>
      <div class="metric-grid platform-console-metrics">${c.metricCard({ label: isEnglish ? 'Views' : '浏览量', value: '—', trend: isEnglish ? 'Awaiting game onboarding' : '等待游戏接入' })}${c.metricCard({ label: isEnglish ? 'Downloads' : '下载量', value: '—', trend: isEnglish ? 'Awaiting game onboarding' : '等待游戏接入' })}${c.metricCard({ label: isEnglish ? 'Reservations' : '预约量', value: '—', trend: isEnglish ? 'Awaiting game onboarding' : '等待游戏接入' })}${c.metricCard({ label: isEnglish ? 'Conversion' : '转化效果', value: '—', trend: isEnglish ? 'Definition pending' : '口径待后续 PRD' })}${c.metricCard({ label: isEnglish ? 'Revenue' : '收益金额', value: '—', trend: isEnglish ? 'Settlement data pending' : '结算数据待接入' })}</div>
      <div class="content-grid platform-console-overview"><div class="span-7">${panel({ title: isEnglish ? 'Game data scope' : '游戏数据范围', description: isEnglish ? 'Summary of current onboarding status' : '汇总当前游戏接入状态', body: `<div class="platform-permission-list"><div class="is-enabled">${icon('chart')}<span><strong>${isEnglish ? 'Game list and date range' : '按游戏与日期查看'}</strong><small>${isEnglish ? 'Views, downloads, reservations and conversion' : '浏览量、下载量、预约量与转化效果'}</small></span></div><div class="is-enabled">${icon('file')}<span><strong>${isEnglish ? 'Revenue details' : '收益金额明细'}</strong><small>${isEnglish ? 'Definitions follow the later analytics PRD' : '数据口径与结算规则以后续 PRD 为准'}</small></span></div></div>` })}</div><div class="span-5">${panel({ title: isEnglish ? 'Company verification' : '企业认证', body: `<div class="platform-next-step"><strong>${e(verificationLabel)}</strong><p>${status === 'pending' ? (isEnglish ? 'Review is expected within 5 business days.' : '预计在提交后的 5 个工作日内完成审核。') : accessEnabled ? (isEnglish ? 'Publishing access has been enabled.' : '发行合作权限已经开通。') : (isEnglish ? 'Complete verification to request publishing access.' : '完成企业认证后可申请发行合作权限。')}</p>${c.button({ label: status === 'pending' ? (isEnglish ? 'View progress' : '查看审核进度') : accessEnabled ? (isEnglish ? 'View result' : '查看认证结果') : (isEnglish ? 'Apply now' : '立即申请'), variant: 'primary', action: status === 'unsubmitted' ? 'start-company-verification' : 'platform-console-tab', extra: status === 'unsubmitted' ? '' : 'data-platform-console-tab="qualification"' })}</div>` })}</div></div>
    </section>`;
    const games = `<section class="platform-console-panel" data-platform-console-panel="games"${activeTab === 'games' ? '' : ' hidden'}>${panel({ title: isEnglish ? 'Game management' : '游戏管理', description: isEnglish ? 'Information architecture placeholder for later game-management specifications.' : '本期仅展示后续游戏管理的信息架构占位。', body: `<div class="future-capability-grid"><article>${icon('chart')}<span>${isEnglish ? 'Overview' : '概览'}</span><p>${isEnglish ? 'Views, downloads, reservations, conversion and revenue by date.' : '按日期查看浏览量、下载量、预约量、转化效果与收益金额。'}</p></article><article>${icon('game')}<span>${isEnglish ? 'Store' : '商店'}</span><p>${isEnglish ? 'Version management, game testing, builds, qualifications and buyout games.' : '版本管理、游戏测试、游戏包管理、资质与审核、买断制游戏。'}</p></article><article>${icon('build')}<span>${isEnglish ? 'Game services' : '游戏服务'}</span><p>${isEnglish ? 'GameHub sign-in, launch verification, cloud saves and APK protection.' : '盖世游戏登录、启动校验、云存档与 APK 加固等服务。'}</p></article></div><div class="future-capability-note">${icon('info')}<span>${isEnglish ? 'This release is a placeholder only. Lists, creation and game-detail interactions follow later PRDs.' : '本期仅作占位；游戏列表、创建和详情交互等待后续 PRD 定义。'}</span></div>` })}</section>`;
    const resources = `<section class="platform-console-panel" data-platform-console-panel="resources"${activeTab === 'resources' ? '' : ' hidden'}><div class="platform-resource-grid"><article>${icon('file')}<span>${isEnglish ? 'GETTING STARTED' : '入驻说明'}</span><h2>${isEnglish ? 'Company verification guide' : '企业认证说明'}</h2><p>${isEnglish ? 'Learn about required company, agreement, bank and contact information.' : '了解企业工商、协议、银行资料与联系人要求。'}</p></article><article>${icon('build')}<span>${isEnglish ? 'INTEGRATION' : '接入资料'}</span><h2>${isEnglish ? 'Build and SDK overview' : '包体与 SDK 接入说明'}</h2><p>${isEnglish ? 'Review the Windows, macOS and Linux integration workflow.' : '查看 Windows、macOS、Linux 三系统接入流程。'}</p></article><article>${icon('key')}<span>${isEnglish ? 'DELIVERY' : '发行交付'}</span><h2>${isEnglish ? 'CDKEY and channel delivery' : 'CDKEY 与渠道交付说明'}</h2><p>${isEnglish ? 'Understand CDKEY supply and third-party channel delivery.' : '了解 CDKEY 供给与第三方渠道交付方式。'}</p></article></div></section>`;
    const qualificationPanel = `<section class="platform-console-panel" data-platform-console-panel="qualification"${activeTab === 'qualification' ? '' : ' hidden'}>${status === 'pending' ? `<div class="platform-verification-status is-pending"><div class="platform-verification-status__icon">${icon('info')}</div><div><span>${isEnglish ? 'COMPANY VERIFICATION' : '企业认证'}</span><h1>${isEnglish ? 'Your application is under review' : '企业认证正在审核中'}</h1><p>${isEnglish ? 'The platform team is reviewing the submitted snapshot. The result is expected within 5 business days after submission.' : '平台运营正在审核本次提交的资料快照，预计在提交后的 5 个工作日内完成。'}</p></div>${c.statusTag(isEnglish ? 'Under review' : '审核中', 'warning')}</div><div class="content-grid"><div class="span-7">${panel({ title: isEnglish ? 'Application details' : '申请信息', body: `<div class="summary-grid">${readonlyField({ label: isEnglish ? 'Application ID' : '申请编号', value: qualification.applicationId || '—' })}${readonlyField({ label: isEnglish ? 'Revision' : '申请修订', value: `REV-${String(qualification.revision || 1).padStart(2, '0')}` })}${readonlyField({ label: isEnglish ? 'Company' : '企业主体', value: qualificationValue(qualification, 'legalName', '—') })}${readonlyField({ label: isEnglish ? 'Submitted at' : '提交时间', value: qualification.submittedAt || '—' })}</div>` })}</div><div class="span-5">${panel({ title: isEnglish ? 'Progress' : '处理进度', body: `${c.timeline({ items: qualificationHistory(qualification) })}<div class="support-contact">${icon('info')}<span>${isEnglish ? 'Questions? Contact' : '如有疑问，请联系'} <a href="mailto:dev@xiaoji.com">dev@xiaoji.com</a></span></div>` })}</div></div>${reviewSwitcher}` : status === 'rejected' ? `<div class="platform-verification-status is-rejected"><div class="platform-verification-status__icon">${icon('warning')}</div><div class="platform-verification-status__copy"><span>${isEnglish ? 'COMPANY VERIFICATION' : '企业认证'}</span><h1>${isEnglish ? 'Company verification was not approved' : '企业认证未通过'}</h1><p>${e(qualification.rejectReason || (isEnglish ? 'Update the requested information and submit again.' : '工商执照证明图片不清晰，请上传完整、无遮挡的彩色扫描件。'))}</p></div><div class="platform-verification-status__actions">${c.statusTag(isEnglish ? 'Rejected' : '未通过', 'danger')}${c.button({ label: isEnglish ? 'Edit and resubmit' : '修改并重新提交', variant: 'primary', action: 'qualification-edit-rejected' })}</div></div>${reviewSwitcher}` : status === 'delisted' ? `<div class="platform-verification-status is-rejected"><div class="platform-verification-status__icon">${icon('warning')}</div><div class="platform-verification-status__copy"><span>${isEnglish ? 'PUBLISHING ACCESS' : '发行合作资格'}</span><h1>${isEnglish ? 'Publishing access has been delisted' : '发行合作资格已下架'}</h1><p>${e(qualification.delistReason || (isEnglish ? 'Contact developer support if you need clarification.' : '平台已收回发行合作资格，如有疑问请联系开发者支持。'))}</p></div><div class="platform-verification-status__actions">${c.statusTag(isEnglish ? 'Delisted' : '已下架', 'danger')}</div></div><div class="support-contact platform-status-contact">${icon('info')}<span>${isEnglish ? 'Contact' : '联系开发者支持'} <a href="mailto:dev@xiaoji.com">dev@xiaoji.com</a></span></div>${reviewSwitcher}` : status === 'approved' ? `<div class="platform-verification-status is-approved"><div class="platform-verification-status__icon">${icon('check')}</div><div><span>${isEnglish ? 'COMPANY VERIFICATION' : '企业认证'}</span><h1>${isEnglish ? 'Company verification approved' : '企业认证已通过'}</h1><p>${isEnglish ? 'The company identity has been verified. Publishing access is now available.' : '企业主体已完成认证，发行合作权限已经开通。'}</p></div>${c.statusTag(isEnglish ? 'Approved' : '已通过', 'success')}</div><div class="platform-status-action">${c.button({ label: isEnglish ? 'View game management' : '查看游戏管理', variant: 'primary', action: 'platform-console-tab', extra: 'data-platform-console-tab="games"' })}</div>${reviewSwitcher}` : `<div class="platform-verification-status"><div class="platform-verification-status__icon">${icon('vendor')}</div><div><span>${isEnglish ? 'COMPANY VERIFICATION' : '企业认证'}</span><h1>${isEnglish ? 'Become an enterprise developer' : '申请成为企业开发者'}</h1><p>${isEnglish ? 'Read the introduction, complete the required information on one page and submit it for review.' : '先阅读认证介绍，再在一个页面内完整填写资料并提交审核。'}</p></div></div><div class="platform-status-action">${c.button({ label: isEnglish ? 'Start application' : '开始申请企业认证', variant: 'primary', action: 'start-company-verification' })}</div>`}</section>`;
    return `<section class="platform-developer-console" data-platform-developer-console>${overview}${games}${resources}${qualificationPanel}</section>`;
  };

  const renderQualificationResult = ({ qualification, language }) => {
    const isEnglish = language === 'en';
    const status = qualification.status;
    const isPending = status === 'pending';
    const isApproved = status === 'approved';
    const title = isPending
      ? (isEnglish ? 'Your company verification has been submitted' : '企业认证资料已提交')
      : isApproved
        ? (isEnglish ? 'Company verification approved' : '企业认证已通过')
        : (isEnglish ? 'Company verification needs changes' : '企业认证申请未通过');
    const detail = isPending
      ? (isEnglish ? 'The platform team is reviewing your submission. You can return here to check the result.' : '平台运营正在审核本次提交；再次登录后可在此查看处理结果。')
      : isApproved
        ? (isEnglish ? 'Your company identity has been verified. You can now create games and enter the game console.' : '企业主体已完成认证；现在可以创建游戏并进入单游戏控制台。')
        : (isEnglish ? 'Update the information based on the review note and submit a new revision.' : '请根据审核意见修改原资料并重新提交，新修订不会覆盖历史记录。');
    const variant = status === 'rejected' ? 'danger' : status === 'approved' ? 'success' : 'warning';
    const resultMeta = [
      [isEnglish ? 'Application ID' : '申请编号', qualification.applicationId || '—'],
      [isEnglish ? 'Revision' : '申请修订', `REV-${String(qualification.revision || 1).padStart(2, '0')}`],
      [isEnglish ? 'Company' : '企业主体', qualificationValue(qualification, 'legalName', '—')],
      [isEnglish ? 'Status' : '当前状态', qualificationStatusLabel(status, language)],
    ];
    return `<div class="qualification-result" data-qualification-result="${e(status)}">
      <section class="qualification-result__hero qualification-result__hero--${e(variant)}">
        <div class="qualification-result__icon">${icon(isApproved ? 'check' : isPending ? 'info' : 'warning')}</div>
        <div><div class="page-eyebrow">${isEnglish ? 'COMPANY VERIFICATION' : '企业认证'}</div><h1>${e(title)}</h1><p>${e(detail)}</p></div>
        ${c.statusTag(qualificationStatusLabel(status, language))}
      </section>
      <div class="qualification-result__grid">
        ${panel({ title: isEnglish ? 'Application details' : '申请信息', body: `<div class="summary-grid">${resultMeta.map(([label, value]) => readonlyField({ label, value })).join('')}</div>${status === 'rejected' ? `<div class="review-reason"><strong>${isEnglish ? 'Review note' : '审核意见'}</strong><p>${e(qualification.rejectReason || '企业登记信息与提交资料不一致，请核对后重新提交。')}</p></div>` : ''}${status === 'rejected' ? `<footer class="form-footer"><span class="save-state">${isEnglish ? 'Your previous submission and review history remain available.' : '原提交快照与处理记录继续保留。'}</span>${c.button({ label: isEnglish ? 'Edit and resubmit' : '修改并重新提交', variant: 'primary', action: 'qualification-edit-rejected' })}</footer>` : isApproved ? `<footer class="form-footer"><span class="save-state">${isEnglish ? 'Developer workspace access is enabled.' : '已开通开发者工作台权限。'}</span>${c.button({ label: isEnglish ? 'Enter workspace' : '进入工作台', variant: 'primary', action: 'qualification-workspace' })}</footer>` : ''}` })}
        ${panel({ title: isEnglish ? 'Progress' : '处理进度', body: `${c.timeline({ items: qualificationHistory(qualification) })}<div class="support-contact">${icon('info')}<span>${isEnglish ? 'Questions? Contact' : '如有疑问，请联系'} <a href="mailto:dev@xiaoji.com">dev@xiaoji.com</a></span></div>` })}
      </div>
    </div>`;
  };

  const renderQualificationWizard = ({ qualification, language, managedContent, registration }) => {
    const isEnglish = language === 'en';
    const locale = managedContent?.[language] || {};
    const form = qualification.form || {};
    const view = qualification.view === 'form' ? 'form' : 'intro';
    const repairReason = qualification.editing ? String(qualification.repairReason || qualification.rejectReason || '') : '';
    const licenseNeedsRepair = /工商执照|business license/i.test(repairReason);
    const agreementVersion = `V${Number(managedContent?.revision) || 1}`;
    const backAction = registration?.registeredAt ? 'back-to-platform-console' : 'back-to-entry-choice';
    const introSteps = locale.introSteps || (isEnglish
      ? ['Understand the partnership scope', 'Prepare company and bank documents', 'Accept platform agreements', 'Submit the application', 'Unlock publishing access after approval']
      : ['了解平台合作范围', '准备企业与银行资料', '确认平台合作协议', '提交企业认证申请', '审核通过后开通能力']);
    const introRequirements = locale.introRequirements || [];
    const introRules = locale.introRules || [];
    const imageUpload = ({ field, nameField, title, hint, exampleType, issue = false }) => `<div class="qualification-upload-wrap${issue ? ' has-review-issue' : ''}"><label class="qualification-upload"><span class="qualification-upload__preview">${icon('upload')}</span><span><strong>${e(title)}<i>*</i></strong><small>${e(hint)}</small><input type="file" name="${e(field)}" accept="image/jpeg,image/png,image/webp" data-qualification-file="${e(nameField)}"><em data-file-name="${e(nameField)}">${e(form[nameField] || (isEnglish ? 'No image selected' : '尚未选择图片'))}</em>${issue ? `<b class="qualification-review-field-note">${isEnglish ? 'Review feedback: replace this file with a complete, clear image.' : '审核反馈：请重新上传完整、清晰、无遮挡的证明图片。'}</b>` : ''}</span></label><button class="qualification-example-link" type="button" data-portal-action="qualification-example" data-example-type="${e(exampleType)}">${isEnglish ? 'View example' : '参考示例'}</button></div>`;
    const agreementDocument = ({ id, title, body }) => `<section class="agreement-document" data-agreement-document="${e(id)}"><header><strong>${e(title)}</strong><span>${isEnglish ? 'Effective version' : '当前生效版本'} · ${e(agreementVersion)}</span></header><div class="managed-rich-content">${renderManagedHtml(body)}</div></section>`;
    const exampleModal = ({ type, title, copy, bank = false }) => `<section class="qualification-example-modal" data-qualification-example-modal="${e(type)}" hidden><button class="qualification-example-modal__backdrop" type="button" data-portal-action="qualification-example-close" aria-label="${isEnglish ? 'Close example' : '关闭示例'}"></button><div class="qualification-example-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="qualification-example-${e(type)}"><header><div><h2 id="qualification-example-${e(type)}">${e(title)}</h2><p>${e(copy)}</p></div><button type="button" data-portal-action="qualification-example-close" aria-label="${isEnglish ? 'Close' : '关闭'}">×</button></header><div class="qualification-example-image"><svg viewBox="0 0 720 430" role="img" aria-label="${e(title)}"><rect width="720" height="430" rx="16" fill="#f7f8fa"/><rect x="32" y="30" width="656" height="370" rx="10" fill="#fff" stroke="#cbd3df" stroke-width="2"/><rect x="58" y="58" width="118" height="118" rx="8" fill="${bank ? '#e9f6f2' : '#eef1ff'}"/><path d="M83 134h68M83 109h68M83 84h42" stroke="${bank ? '#23936d' : '#6878e8'}" stroke-width="8" stroke-linecap="round"/><rect x="206" y="62" width="350" height="18" rx="7" fill="#23324a"/><rect x="206" y="96" width="290" height="12" rx="6" fill="#93a0b5"/><rect x="58" y="205" width="604" height="2" fill="#e3e7ed"/><rect x="58" y="232" width="245" height="14" rx="6" fill="#66758b"/><rect x="58" y="264" width="530" height="11" rx="5" fill="#c1c9d4"/><rect x="58" y="292" width="470" height="11" rx="5" fill="#c1c9d4"/><rect x="58" y="320" width="390" height="11" rx="5" fill="#c1c9d4"/><circle cx="606" cy="324" r="48" fill="none" stroke="${bank ? '#36aa83' : '#7988eb'}" stroke-width="6" opacity=".75"/><path d="M578 324h56M606 296v56" stroke="${bank ? '#36aa83' : '#7988eb'}" stroke-width="5" opacity=".75"/></svg></div><footer>${icon('info')}<span>${isEnglish ? 'Upload a complete, clear, unobstructed image. The example is illustrative only.' : '请上传完整、清晰、无遮挡的图片；示例仅用于说明版式。'}</span></footer></div></section>`;
    const subject = `<div data-qualification-form><div class="form-grid">${c.select({ label: isEnglish ? 'Entity type' : '主体类型', name: 'subjectType', options: isEnglish ? [{ label: 'Company / Enterprise', value: '公司／企业' }] : ['公司／企业'], value: form.subjectType || '公司／企业' })}${c.select({ label: isEnglish ? 'Registration region' : '注册地区', name: 'region', options: isEnglish ? [{ label: 'Mainland China', value: '中国大陆' }, { label: 'Hong Kong, China', value: '中国香港' }, { label: 'Other country or region', value: '其他国家或地区' }] : ['中国大陆', '中国香港', '其他国家或地区'], value: form.region || '中国大陆' })}${c.input({ label: isEnglish ? 'Legal company name' : '企业法定名称', name: 'legalName', value: form.legalName || '', required: true, hint: isEnglish ? 'Enter the exact name on the license' : '需与工商执照完全一致' })}${c.input({ label: isEnglish ? 'Legal company name in English' : '企业英文名称', name: 'legalEnglishName', value: form.legalEnglishName || '', hint: isEnglish ? 'Optional' : '选填' })}${c.input({ label: isEnglish ? 'Business license number' : '工商执照号码／统一社会信用代码', name: 'registrationNumber', value: form.registrationNumber || '', required: true })}${c.textarea({ label: isEnglish ? 'Registered address' : '企业注册地址', name: 'registeredAddress', value: form.registeredAddress || '', required: true })}${c.textarea({ label: isEnglish ? 'Mailing address' : '通信地址', name: 'mailingAddress', value: form.mailingAddress || '', hint: isEnglish ? 'Optional; enter only if different from the registered address' : '选填，与注册地址不同时填写' })}</div>${imageUpload({ field: 'businessLicenseFile', nameField: 'businessLicenseName', title: isEnglish ? 'Business license proof' : '工商执照证明附件', hint: isEnglish ? 'JPG, PNG or WEBP, up to 10 MB.' : '支持 JPG、PNG、WEBP，单张不超过 10 MB。', exampleType: 'license', issue: licenseNeedsRepair })}</div>`;
    const bank = `<div data-qualification-form><div class="form-grid">${c.input({ label: isEnglish ? 'Account holder name' : '银行账户户名', name: 'bankAccountName', value: form.bankAccountName || '', required: true, hint: isEnglish ? 'Must match the legal company name' : '必须与企业法定名称一致' })}${c.input({ label: isEnglish ? 'Bank name' : '开户银行', name: 'bankName', value: form.bankName || '', required: true })}${c.input({ label: isEnglish ? 'Bank account number' : '银行账号', name: 'bankAccountNumber', value: form.bankAccountNumber || '', required: true })}${c.input({ label: isEnglish ? 'Branch / routing information' : '开户支行／联行信息', name: 'bankBranch', value: form.bankBranch || '', required: true })}</div>${imageUpload({ field: 'bankProofFile', nameField: 'bankProofName', title: isEnglish ? 'Bank account proof' : '银行账户证明附件', hint: isEnglish ? 'JPG, PNG or WEBP, up to 10 MB.' : '支持 JPG、PNG、WEBP，单张不超过 10 MB。', exampleType: 'bank' })}</div>`;
    const profile = `<div data-qualification-form><div class="form-grid">${c.input({ label: isEnglish ? 'Publisher brand name' : '厂商品牌名称', name: 'vendorName', value: form.vendorName || '', required: true })}${c.input({ label: isEnglish ? 'Publisher brand name in English' : '厂商英文名称', name: 'vendorEnglishName', value: form.vendorEnglishName || '', hint: isEnglish ? 'Optional' : '选填' })}${c.textarea({ label: isEnglish ? 'Publisher profile' : '厂商简介', name: 'vendorIntro', value: form.vendorIntro || '', required: true, hint: isEnglish ? 'Describe the studio and publishing business' : '用于介绍厂商及游戏发行业务' })}${c.input({ label: isEnglish ? 'Contact name' : '联系人姓名', name: 'contactName', value: form.contactName || '', required: true })}${c.input({ label: isEnglish ? 'Contact email' : '联系邮箱', name: 'email', type: 'email', value: form.email || '', required: true, hint: isEnglish ? 'Receives statements, settlement and important business notices' : '用于接收账单、结算及重要业务通知' })}${c.input({ label: isEnglish ? 'Mobile' : '手机号', name: 'mobile', value: form.mobile || '', hint: isEnglish ? 'Optional' : '选填' })}</div></div>`;
    const ndaAgreementTitle = locale.ndaTitle || (isEnglish ? 'GameHub Developer Platform Confidentiality Agreement' : '《盖世游戏开发者平台保密协议》');
    const distributionAgreementTitle = locale.distributionTitle || (isEnglish ? 'GameHub Developer Platform Distribution Partnership Agreement' : '《盖世游戏开发者平台发行合作协议》');
    const agreements = `<div data-qualification-form class="agreement-stack">${agreementDocument({ id: 'nda', title: ndaAgreementTitle, body: locale.ndaBody || '' })}${agreementDocument({ id: 'distribution', title: distributionAgreementTitle, body: locale.distributionBody || '' })}<div class="form-grid agreement-signer">${c.input({ label: isEnglish ? 'Authorized signatory' : '授权签署人姓名', name: 'signatoryName', value: form.signatoryName || '', required: true })}${c.input({ label: isEnglish ? 'Title' : '签署人职务', name: 'signatoryTitle', value: form.signatoryTitle || '', required: true })}</div><div class="agreement-check"><input id="agreement-accepted" type="checkbox" name="agreementAccepted"${form.agreementAccepted ? ' checked' : ''}><label for="agreement-accepted">${isEnglish ? `I am authorized to represent the company and accept the current ${e(ndaAgreementTitle)} and ${e(distributionAgreementTitle)}.` : `我已获授权代表企业，并统一接受当前生效的${e(ndaAgreementTitle)}与${e(distributionAgreementTitle)}。`}</label></div></div>`;
    const sectionNavigation = [["subject", isEnglish ? 'Company information' : '企业主体与工商信息'], ["bank", isEnglish ? 'Bank and settlement' : '银行与结算资料'], ["profile", isEnglish ? 'Publisher and contact' : '厂商资料与联系人'], ["agreements", isEnglish ? 'Agreements' : '合作协议与授权签署'], ["submit", isEnglish ? 'Submit' : '提交审核']];
    const intro = `<section class="qualification-intro-panel"${view === 'intro' ? '' : ' hidden'}><header><h1>${e(locale.introTitle || (isEnglish ? 'Join the GameHub Developer Platform' : '加入盖世游戏开发者平台'))}</h1><div class="qualification-intro-description managed-rich-content">${renderManagedHtml(locale.introDescription || '')}</div></header><ol class="qualification-intro-flow">${introSteps.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><strong>${e(item)}</strong></li>`).join('')}</ol><div class="qualification-intro-grid">${panel({ title: isEnglish ? 'Information to prepare' : '申请前需准备', body: `<ul class="qualification-bullet-list">${introRequirements.map(item => `<li>${e(item)}</li>`).join('')}</ul>` })}${panel({ title: isEnglish ? 'Content and partnership requirements' : '内容与合作要求', body: `<ul class="qualification-bullet-list">${introRules.map(item => `<li>${e(item)}</li>`).join('')}</ul>` })}</div><div class="qualification-review-note">${icon('info')}<div><strong>${isEnglish ? 'Review timing' : '审核说明'}</strong><p>${e(locale.introReviewNote || (isEnglish ? 'Review is normally completed within 5 business days.' : '平台运营通常在提交后的 5 个工作日内完成审核。'))}</p></div></div><footer><div><strong>${isEnglish ? 'Ready to apply?' : '资料准备完成后即可申请'}</strong><span>${isEnglish ? 'All fields are completed on one page.' : '所有资料在一个页面内填写并提交。'}</span></div>${c.button({ label: isEnglish ? 'Start entering information' : '开始填写资料', variant: 'primary', action: 'qualification-start' })}</footer></section>`;
    const applicationForm = `<section class="qualification-form-page"${view === 'form' ? '' : ' hidden'}><header class="qualification-form-page__header"><h1>${isEnglish ? 'Company verification application' : '企业认证资料提交'}</h1><p>${isEnglish ? 'Complete every required field and submit the application for review.' : '请填写全部必填资料并提交审核；提交前可随时修改或清空重填。'}</p></header>${repairReason ? `<div class="qualification-repair-notice">${icon('warning')}<div><strong>${isEnglish ? 'Review feedback' : '本次审核意见'}</strong><p>${e(repairReason)}</p></div></div>` : ''}<div class="qualification-form-layout"><aside class="qualification-anchor-nav"><strong>${isEnglish ? 'Application sections' : '填写目录'}</strong>${sectionNavigation.map(([id, label], index) => `<button type="button" class="qualification-anchor${index === 0 ? ' is-active' : ''}${index === 0 && licenseNeedsRepair ? ' has-review-issue' : ''}" data-portal-action="qualification-anchor" data-qualification-anchor="${id}"><span>${String(index + 1).padStart(2, '0')}</span>${e(label)}</button>`).join('')}<div class="support-contact"><span>${isEnglish ? 'Partnership support' : '合作联系'}</span><a href="mailto:dev@xiaoji.com">dev@xiaoji.com</a></div></aside><main class="qualification-form-main"><section class="qualification-form-section${licenseNeedsRepair ? ' has-review-issue' : ''}" data-qualification-section="subject">${panel({ title: isEnglish ? 'Company and business license' : '企业主体与工商信息', description: isEnglish ? 'Enter the exact legal information shown on the business license.' : '请严格按工商执照填写企业法定信息。', body: subject })}</section><section class="qualification-form-section" data-qualification-section="bank">${panel({ title: isEnglish ? 'Bank and settlement details' : '银行与结算资料', description: isEnglish ? 'Provide a company account matching the legal company name.' : '请填写与企业法定名称一致的公司银行账户。', body: bank })}</section><section class="qualification-form-section" data-qualification-section="profile">${panel({ title: isEnglish ? 'Publisher profile and contact' : '厂商资料与联系人', description: isEnglish ? 'The contact email receives statements, settlement and important notices.' : '联系邮箱将用于接收账单、结算及重要业务通知。', body: profile })}</section><section class="qualification-form-section" data-qualification-section="agreements">${panel({ title: isEnglish ? 'Agreements and authorized signatory' : '合作协议与授权签署', description: isEnglish ? `Review both complete agreements and confirm version ${agreementVersion}.` : `请阅读两份完整协议并统一确认当前版本 ${agreementVersion}。`, body: agreements })}</section><section class="qualification-submit-section" data-qualification-section="submit"><div><strong>${isEnglish ? 'Submit for platform review' : '提交平台审核'}</strong><p>${isEnglish ? 'A submitted revision and the accepted agreement version are retained. Review is expected within 5 business days.' : '提交后将保留本次资料修订及协议版本，预计 5 个工作日内完成审核。'}</p></div><div class="form-actions">${c.button({ label: isEnglish ? 'Start over' : '清空重填', variant: 'secondary', action: 'qualification-restart' })}${c.button({ label: isEnglish ? 'Submit for review' : '提交审核', variant: 'primary', action: 'qualification-submit' })}</div></section></main></div></section>`;
    return `<div class="qualification-application" data-qualification-application><nav class="qualification-view-tabs" aria-label="${isEnglish ? 'Company verification pages' : '企业认证页面'}"><button type="button" class="${view === 'intro' ? 'is-active' : ''}" data-portal-action="qualification-view" data-qualification-view="intro">${isEnglish ? 'Introduction' : '认证介绍'}</button><button type="button" class="${view === 'form' ? 'is-active' : ''}" data-portal-action="qualification-view" data-qualification-view="form">${isEnglish ? 'Application information' : '资料填写'}</button><span></span><button type="button" data-portal-action="${backAction}">${isEnglish ? (registration?.registeredAt ? 'Back to console' : 'Back to options') : (registration?.registeredAt ? '返回控制台' : '返回选择')}</button></nav>${intro}${applicationForm}${exampleModal({ type: 'license', title: isEnglish ? 'Business license example' : '工商执照证明示例', copy: isEnglish ? 'Upload the complete business license with all edges visible.' : '需包含完整工商执照，四角完整且文字清晰。' })}${exampleModal({ type: 'bank', title: isEnglish ? 'Bank account proof example' : '银行账户证明示例', copy: isEnglish ? 'Upload a bank-issued account opening certificate or equivalent proof.' : '可上传银行出具的开户证明或其他有效账户证明。', bank: true })}</div>`;
  };

  const renderQualificationOperations = ({ qualification, operationsReview }) => {
    const reviewState = operationsReview || { view: 'list', actionMode: '', attachmentMode: '', selectedApplicationId: '' };
    const status = qualificationStatusLabel(qualification.status);
    const submission = qualification.currentSubmission || null;
    const submittedQualification = { ...qualification, form: submission?.form || qualification.form || {} };
    const hasApplication = Boolean(submission) && qualification.status !== 'unsubmitted' && Number(qualification.revision) > 0;
    const isPending = qualification.status === 'pending';
    const isApproved = qualification.status === 'approved';
    const applicationId = qualification.applicationId || 'ENT-20260903-001';
    const bankNumber = qualificationValue(submittedQualification, 'bankAccountNumber', '');
    const acceptedContentRevision = submission?.acceptedContentRevision || qualification.acceptedContentRevision || 1;
    const submittedDate = String(qualification.submittedAt || '').match(/\d{4}[/-]\d{2}[/-]\d{2}/)?.[0].replaceAll('/', '-') || '';
    const accepted = Boolean(qualificationValue(submittedQualification, 'agreementAccepted', false));
    const licenseName = qualificationValue(submittedQualification, 'businessLicenseName', '未上传');
    const bankProofName = qualificationValue(submittedQualification, 'bankProofName', '未上传');
    const attachmentCard = (title, fileName, type, sensitive = false) => {
      const content = `<span class="review-attachment-card__preview${sensitive ? ' is-sensitive' : ''}">${icon(sensitive ? 'lock' : 'file')}</span><span><strong>${e(title)}</strong><small>${e(fileName)}</small><em>${fileName === '未上传' ? '缺少附件' : '图片已上传 · 点击受控预览'}</em></span>`;
      return fileName === '未上传'
        ? `<article class="review-attachment-card is-disabled" aria-disabled="true">${content}</article>`
        : `<button type="button" class="review-attachment-card" data-portal-action="qualification-review-attachment-open" data-attachment-type="${e(type)}" aria-label="预览${e(title)}">${content}</button>`;
    };
    const snapshot = `<div class="review-snapshot-groups">
      <section><h3>企业主体与工商信息</h3><div class="summary-grid">${readonlyField({ label: '主体类型', value: qualificationValue(submittedQualification, 'subjectType', '—') })}${readonlyField({ label: '注册地区', value: qualificationValue(submittedQualification, 'region', '—') })}${readonlyField({ label: '企业法定名称', value: qualificationValue(submittedQualification, 'legalName', '—') })}${readonlyField({ label: '企业英文名称', value: qualificationValue(submittedQualification, 'legalEnglishName', '—') })}${readonlyField({ label: '工商执照号码／统一社会信用代码', value: qualificationValue(submittedQualification, 'registrationNumber', '—'), wide: true })}${readonlyField({ label: '企业注册地址', value: qualificationValue(submittedQualification, 'registeredAddress', '—'), wide: true })}${readonlyField({ label: '通信地址', value: qualificationValue(submittedQualification, 'mailingAddress', '—'), wide: true })}</div><div class="review-attachment-grid">${attachmentCard('工商执照证明附件', licenseName, 'license')}</div></section>
      <section><h3>银行与结算资料</h3><div class="summary-grid">${readonlyField({ label: '银行账户户名', value: qualificationValue(submittedQualification, 'bankAccountName', '—') })}${readonlyField({ label: '开户银行', value: qualificationValue(submittedQualification, 'bankName', '—') })}${readonlyField({ label: '银行账号', value: bankNumber ? `**** ${String(bankNumber).slice(-4)}` : '—' })}${readonlyField({ label: '开户支行／联行信息', value: qualificationValue(submittedQualification, 'bankBranch', '—') })}</div><div class="review-attachment-grid">${attachmentCard('银行账户证明附件', bankProofName, 'bank', true)}</div></section>
      <section><h3>厂商资料与联系人</h3><div class="summary-grid">${readonlyField({ label: '厂商品牌名称', value: qualificationValue(submittedQualification, 'vendorName', '—') })}${readonlyField({ label: '厂商英文名称', value: qualificationValue(submittedQualification, 'vendorEnglishName', '—') })}${readonlyField({ label: '厂商简介', value: qualificationValue(submittedQualification, 'vendorIntro', '—'), wide: true })}${readonlyField({ label: '联系人姓名', value: qualificationValue(submittedQualification, 'contactName', '—') })}${readonlyField({ label: '联系邮箱', value: qualificationValue(submittedQualification, 'email', '—'), hint: '账单、结算及重要业务通知接收邮箱' })}${readonlyField({ label: '手机号', value: qualificationValue(submittedQualification, 'mobile', '未填写') })}</div></section>
      <section><h3>合作协议与确认记录</h3><div class="summary-grid">${readonlyField({ label: '授权签署人', value: qualificationValue(submittedQualification, 'signatoryName', '—') })}${readonlyField({ label: '签署人职务', value: qualificationValue(submittedQualification, 'signatoryTitle', '—') })}${readonlyField({ label: '协议确认', value: accepted ? `已统一接受两份协议 · 内容 V${acceptedContentRevision}` : '未确认', wide: true })}${readonlyField({ label: '确认账号', value: submission?.agreementAcceptedBy || '—' })}${readonlyField({ label: '确认时间', value: submission?.agreementAcceptedAt || submission?.submittedAt || '—' })}</div></section>
    </div>`;
    const quickActions = isPending
      ? `${c.button({ label: '拒绝', variant: 'danger', action: 'qualification-review-action-open', size: 'small', extra: 'data-review-action="reject"' })}${c.button({ label: '通过', variant: 'primary', action: 'qualification-review-action-open', size: 'small', extra: 'data-review-action="approve"' })}`
      : isApproved
        ? c.button({ label: '下架', variant: 'danger', action: 'qualification-review-action-open', size: 'small', extra: 'data-review-action="delist"' })
        : '';
    const reviewRow = hasApplication ? `<tr data-qualification-review-row data-keywords="${e(`${qualificationValue(submittedQualification, 'legalName', '')} ${qualificationValue(submittedQualification, 'vendorName', '')} ${applicationId}`)}" data-status="${e(qualification.status)}" data-submitted-date="${e(submittedDate)}"><td><strong>${e(qualificationValue(submittedQualification, 'legalName', '—'))}</strong><small>${e(applicationId)} · REV-${String(qualification.revision || 1).padStart(2, '0')}</small></td><td>${e(qualificationValue(submittedQualification, 'vendorName', '—'))}</td><td><div class="review-list-attachments"><span>${icon('file')}2 个图片附件</span><small>${licenseName === '未上传' || bankProofName === '未上传' ? '存在缺失' : '均已上传'}</small></div></td><td>${e(qualification.submittedAt || '—')}</td><td>${c.statusTag(status)}</td><td><div class="review-row-actions">${quickActions}${c.button({ label: '查看详情', variant: 'text', action: 'review-application', size: 'small', extra: `data-application-id="${e(applicationId)}"` })}</div></td></tr>` : '';
    const filters = `<section class="operations-filter"><label><span>企业名称／申请编号</span><div>${icon('search')}<input type="search" placeholder="输入企业名称或申请编号" data-review-filter-keyword></div></label><label><span>审核状态</span><select data-review-filter-status><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="rejected">已拒绝</option><option value="delisted">已下架</option></select></label><label><span>提交日期（开始）</span><input type="date" data-review-filter-start></label><label><span>提交日期（结束）</span><input type="date" data-review-filter-end></label><div class="operations-filter__actions">${c.button({ label: '重置', action: 'qualification-review-reset' })}${c.button({ label: '查询', variant: 'primary', action: 'qualification-review-filter', iconName: 'search' })}</div></section>`;
    const queue = `<section class="operations-table-card"><header><div><h2>企业认证申请</h2><p>支持按企业、申请编号、状态和提交日期筛选。</p></div><span>共 ${hasApplication ? '1' : '0'} 条</span></header><div class="operations-table-wrap"><table><thead><tr><th>企业主体／申请编号</th><th>厂商品牌</th><th>证明附件</th><th>提交时间</th><th>审核状态</th><th>操作</th></tr></thead><tbody>${reviewRow}</tbody></table><div class="operations-filter-empty" data-review-filter-empty ${hasApplication ? 'hidden' : ''}>${icon('file')}<strong>${hasApplication ? '没有匹配的申请' : '暂无企业认证申请'}</strong><p>${hasApplication ? '请调整筛选条件后重新查询。' : '企业完成正式提交后，申请会进入审核列表。'}</p></div></div><footer>共 <strong>${hasApplication ? '1' : '0'}</strong> 条记录</footer></section>`;
    const actionModes = {
      approve: { title: '确认通过企业认证？', copy: '通过后将开通企业发行合作权限，并把审核结果同步给企业用户。', action: 'qualification-approve', label: '确认通过', variant: 'primary' },
      reject: { title: '拒绝企业认证申请', copy: '请填写明确的拒绝原因；该内容会展示给企业用户并用于后续修改。', action: 'qualification-reject', label: '确认拒绝', variant: 'danger', reason: true },
      delist: { title: '下架企业发行资格', copy: '下架后立即收回发行合作权限；企业仍可登录并查看原因和历史记录。', action: 'qualification-delist', label: '确认下架', variant: 'danger', reason: true },
    };
    const actionConfig = actionModes[reviewState.actionMode];
    const actionModal = actionConfig ? `<section class="review-action-modal" data-review-action-modal><button class="review-action-modal__backdrop" type="button" data-portal-action="qualification-review-action-close" aria-label="关闭"></button><div class="review-action-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="review-action-title"><header><div><h2 id="review-action-title">${e(actionConfig.title)}</h2><p>${e(actionConfig.copy)}</p></div><button type="button" data-portal-action="qualification-review-action-close" aria-label="关闭">×</button></header>${actionConfig.reason ? `<div class="review-action-modal__body">${c.textarea({ label: reviewState.actionMode === 'delist' ? '下架原因' : '拒绝原因', name: 'reviewReason', placeholder: reviewState.actionMode === 'delist' ? '请说明下架原因、影响范围和恢复条件' : '请明确需修改的资料项和原因', required: true })}</div>` : ''}<footer>${c.button({ label: '取消', action: 'qualification-review-action-close' })}${c.button({ label: actionConfig.label, variant: actionConfig.variant, action: actionConfig.action })}</footer></div></section>` : '';
    const attachmentMode = ['license', 'bank'].includes(reviewState.attachmentMode) ? reviewState.attachmentMode : '';
    const attachmentModal = attachmentMode ? (() => {
      const isBank = attachmentMode === 'bank';
      const title = isBank ? '银行账户证明附件' : '工商执照证明附件';
      const fileName = isBank ? bankProofName : licenseName;
      const legalName = qualificationValue(submittedQualification, 'legalName', '—');
      const documentBody = isBank
        ? `<div class="review-document review-document--bank"><span>企业银行账户证明</span><strong>${e(qualificationValue(submittedQualification, 'bankName', '—'))}</strong><dl><div><dt>账户名称</dt><dd>${e(qualificationValue(submittedQualification, 'bankAccountName', '—'))}</dd></div><div><dt>账号</dt><dd>${bankNumber ? `**** ${e(String(bankNumber).slice(-4))}` : '—'}</dd></div><div><dt>开户支行</dt><dd>${e(qualificationValue(submittedQualification, 'bankBranch', '—'))}</dd></div></dl><i>银行业务专用章</i></div>`
        : `<div class="review-document review-document--license"><span>营业执照</span><small>统一社会信用代码</small><strong>${e(qualificationValue(submittedQualification, 'registrationNumber', '—'))}</strong><dl><div><dt>名称</dt><dd>${e(legalName)}</dd></div><div><dt>住所</dt><dd>${e(qualificationValue(submittedQualification, 'registeredAddress', '—'))}</dd></div><div><dt>类型</dt><dd>${e(qualificationValue(submittedQualification, 'subjectType', '—'))}</dd></div></dl><i>市场监督管理部门登记专用章</i></div>`;
      return `<section class="review-action-modal review-attachment-modal" data-review-attachment-modal><button class="review-action-modal__backdrop" type="button" data-portal-action="qualification-review-attachment-close" aria-label="关闭附件预览"></button><div class="review-action-modal__dialog review-attachment-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="review-attachment-title"><header><div><h2 id="review-attachment-title">${e(title)}</h2><p>${e(fileName)} · 已鉴权 · 当前申请只读</p></div><button type="button" data-portal-action="qualification-review-attachment-close" aria-label="关闭附件预览">×</button></header><div class="review-attachment-modal__body">${documentBody}<p>${icon('lock')}附件仅供当前申请审核；关闭后返回原详情位置，查看记录写入审计日志。</p></div><footer>${c.button({ label: '关闭预览', action: 'qualification-review-attachment-close', variant: 'primary' })}</footer></div></section>`;
    })() : '';
    const detailAction = isPending
      ? `<div class="review-detail-actions"><p>通过后开通发行权限；拒绝时必须填写并同步原因。</p><div class="form-actions">${c.button({ label: '拒绝', variant: 'danger', action: 'qualification-review-action-open', extra: 'data-review-action="reject"' })}${c.button({ label: '通过', variant: 'primary', action: 'qualification-review-action-open', extra: 'data-review-action="approve"' })}</div></div>`
      : isApproved
        ? `<div class="review-detail-actions"><p>如需收回发行资格，请填写下架原因。企业可继续登录查看结果。</p>${c.button({ label: '下架发行资格', variant: 'danger', action: 'qualification-review-action-open', extra: 'data-review-action="delist"' })}</div>`
        : c.resultStrip({ title: qualification.status === 'delisted' ? '发行资格已下架' : '审核未通过', detail: qualification.status === 'delisted' ? `下架原因：${qualification.delistReason || '未填写'}` : `拒绝原因：${qualification.rejectReason || '未填写'}`, variant: 'danger' });
    if (reviewState.view === 'detail' && hasApplication) {
      return `<div class="operations-review operations-review--detail" data-review-status="${e(qualification.status)}"><header class="operations-detail-header"><div><button type="button" data-portal-action="review-application-back">${icon('arrow-left')}返回申请列表</button><div class="page-eyebrow">APPLICATION DETAIL</div><h1>${e(qualificationValue(submittedQualification, 'legalName', '企业认证申请'))}</h1><p>${e(applicationId)} · REV-${String(qualification.revision || 1).padStart(2, '0')} · 提交于 ${e(qualification.submittedAt || '—')}</p></div>${c.statusTag(status)}</header><section class="review-detail" data-review-detail><div class="review-detail__main">${panel({ title: '申请资料快照', description: '企业正式提交版本 · 运营只读', body: snapshot })}</div><aside class="review-detail__side">${panel({ title: '审核处理', description: isPending ? '结果将同步给企业用户' : '可查看当前结果并继续合规操作', body: detailAction })}${panel({ title: '处理记录', body: c.timeline({ items: qualificationHistory(qualification) }) })}</aside></section>${actionModal}${attachmentModal}</div>`;
    }
    return `<div class="operations-review" data-review-status="${e(qualification.status)}"><header class="operations-review__header"><div><div class="page-eyebrow">DISTRIBUTION PLATFORM</div><h1>企业认证审核</h1><p>审核企业正式提交的资料快照；运营可查询、查看、通过、拒绝或下架，不能代替企业修改。</p></div>${c.statusTag(isPending ? '1 项待审核' : status)}</header>${filters}${queue}${actionModal}</div>`;
  };

  const renderManagedContentEditor = ({ managedContent, contentEditor }) => {
    const editor = contentEditor || { language: 'zh', section: 'intro', view: 'list', selectedArticleIndex: 0, draft: managedContent };
    const language = editor.language === 'en' ? 'en' : 'zh';
    const locale = editor.draft?.[language] || managedContent?.[language] || {};
    const help = locale.help || { title: '', faq: [], contact: {} };
    const attr = path => `data-content-path="${e(path)}"`;
    const input = (label, path, value, hint = '', required = true) => c.input({ label, value: value || '', required, hint, extra: attr(path) });
    const textarea = (label, path, value, hint = '') => c.textarea({ label, value: value || '', required: true, hint, extra: attr(path) });
    const isEnglish = language === 'en';
    const toRichHtml = value => {
      const text = String(value || '').trim();
      if (!text) return '<p><br></p>';
      if (/<(?:p|h[1-6]|ul|ol|li|blockquote|img|div|strong|em|a)\b/i.test(text)) return text;
      return `<p>${e(text).replaceAll('\n', '<br>')}</p>`;
    };
    const articleBody = article => article.bodyHtml || `<p>${e(article.answer || '')}</p>${article.steps?.length ? `<h2>${isEnglish ? 'Steps' : '操作步骤'}</h2><ol>${article.steps.map(item => `<li>${e(item)}</li>`).join('')}</ol>` : ''}${article.details?.length ? `<h2>${isEnglish ? 'Notes' : '处理说明'}</h2><ul>${article.details.map(item => `<li>${e(item)}</li>`).join('')}</ul>` : ''}`;
    const richEditor = (label, path, value, hint) => {
      const inputId = `rich-image-${path.replace(/[^a-z0-9]+/gi, '-')}`;
      return `<section class="rich-editor-field"><div class="field-label"><span>${e(label)}<span class="field-required">*</span></span><span class="field-hint">${e(hint)}</span></div><div class="rich-editor" data-rich-editor><div class="rich-editor__toolbar" role="toolbar" aria-label="${e(label)}格式工具"><button type="button" data-portal-action="rich-editor-command" data-rich-command="formatBlock" data-rich-value="H2" title="二级标题">H2</button><button type="button" data-portal-action="rich-editor-command" data-rich-command="bold" title="加粗"><strong>B</strong></button><button type="button" data-portal-action="rich-editor-command" data-rich-command="insertUnorderedList" title="项目符号列表">• 列表</button><button type="button" data-portal-action="rich-editor-command" data-rich-command="insertOrderedList" title="编号列表">1. 列表</button><button type="button" data-portal-action="rich-editor-link" title="插入链接">链接</button><button type="button" data-portal-action="rich-editor-image" data-rich-image-target="${e(inputId)}" title="插入图片">${icon('upload')}图片</button><button type="button" data-portal-action="rich-editor-command" data-rich-command="removeFormat" title="清除格式">清除格式</button><input id="${e(inputId)}" type="file" accept="image/jpeg,image/png,image/webp" data-rich-editor-image-input hidden></div><div class="rich-editor__body" contenteditable="true" role="textbox" aria-multiline="true" data-rich-editor-body ${attr(path)}>${toRichHtml(value)}</div></div></section>`;
    };
    const selectedIndex = Math.max(0, Math.min(Number(editor.selectedArticleIndex) || 0, Math.max(0, (help.faq || []).length - 1)));
    const selectedArticle = (help.faq || [])[selectedIndex] || { id: '', category: '', section: '', question: '', answer: '' };
    const helpRows = (help.faq || []).map((article, index) => `<tr><td><strong>${e(article.question || (isEnglish ? 'Untitled article' : '未命名文章'))}</strong><small>${e(article.id || '')}</small></td><td>${e(article.category || '—')}</td><td>${e(article.section || (isEnglish ? 'No group' : '未分组'))}</td><td>${article.bodyHtml ? c.statusTag(isEnglish ? 'Rich text' : '富文本') : c.statusTag(isEnglish ? 'Legacy migrated' : '待迁移', 'warning')}</td><td>${c.button({ label: isEnglish ? 'Edit' : '查看配置／编辑', variant: 'text', action: 'content-help-edit', size: 'small', extra: `data-article-index="${index}"` })}</td></tr>`).join('');
    const helpList = `<div data-content-editor-form>${panel({ title: isEnglish ? 'Help Center basics' : '帮助中心基础文案', description: isEnglish ? 'Controls the public Help Center title.' : '配置开发者端帮助中心的基础标题。', body: `<div class="form-grid">${input(isEnglish ? 'Help Center title' : '帮助中心标题', 'help.title', help.title)}</div>` })}<section class="content-article-list"><header><div><h2>${isEnglish ? 'Help articles' : '文章列表'}</h2><p>${isEnglish ? 'Open one article to edit its directory and rich-text body.' : '进入单篇文章配置页维护目录和富文本正文。'}</p></div><span>${(help.faq || []).length} ${isEnglish ? 'articles' : '篇文章'}</span></header><div class="operations-table-wrap"><table><thead><tr><th>${isEnglish ? 'Article' : '文章标题／ID'}</th><th>${isEnglish ? 'Category' : '分类'}</th><th>${isEnglish ? 'Directory group' : '目录分组'}</th><th>${isEnglish ? 'Body format' : '正文格式'}</th><th>${isEnglish ? 'Action' : '操作'}</th></tr></thead><tbody>${helpRows}</tbody></table></div></section>${panel({ title: isEnglish ? 'Contact support' : '联系我们', description: 'dev@xiaoji.com', body: `<div class="form-grid">${input(isEnglish ? 'Support name' : '支持名称', 'help.contact.supportName', help.contact?.supportName)}${input(isEnglish ? 'Service hours' : '服务时间', 'help.contact.serviceHours', help.contact?.serviceHours)}${input(isEnglish ? 'Contact channel' : '联系渠道', 'help.contact.channel', help.contact?.channel)}${c.input({ label: isEnglish ? 'External email' : '对外邮箱', value: 'dev@xiaoji.com', disabled: true, hint: isEnglish ? 'Unified platform contact email' : '平台统一对外合作邮箱' })}${textarea(isEnglish ? 'Urgent issue note' : '紧急问题说明', 'help.contact.fallback', help.contact?.fallback)}</div>` })}</div>`;
    const helpEditor = `<section class="content-article-editor" data-content-editor-form><header><button type="button" data-portal-action="content-help-back">${icon('arrow-left')}${isEnglish ? 'Back to article list' : '返回文章列表'}</button><div><span>${isEnglish ? 'ARTICLE CONFIGURATION' : '帮助文章配置'}</span><h2>${e(selectedArticle.question || (isEnglish ? 'Untitled article' : '未命名文章'))}</h2><p>${e(selectedArticle.id || '')}</p></div></header><div class="content-article-editor__form"><div class="form-grid">${input(isEnglish ? 'Category' : '分类', `help.faq.${selectedIndex}.category`, selectedArticle.category)}${input(isEnglish ? 'Directory group' : '目录分组', `help.faq.${selectedIndex}.section`, selectedArticle.section, isEnglish ? 'Optional; used as the second-level navigation heading' : '选填，用作帮助中心二级目录标题', false)}${input(isEnglish ? 'Article title' : '文章标题', `help.faq.${selectedIndex}.question`, selectedArticle.question)}</div>${richEditor(isEnglish ? 'Article body' : '正文', `help.faq.${selectedIndex}.bodyHtml`, articleBody(selectedArticle), isEnglish ? 'Insert text, headings, lists, links and images.' : '可自由输入文字，并插入标题、列表、链接与图片。')}</div></section>`;
    const sections = {
      intro: panel({ title: isEnglish ? 'Company verification introduction' : '企业认证介绍', description: isEnglish ? 'Shown at the top of the company verification application.' : '展示在企业认证申请页面顶部。', body: `<div data-content-editor-form>${input(isEnglish ? 'Introduction title' : '介绍标题', 'introTitle', locale.introTitle)}${richEditor(isEnglish ? 'Introduction content' : '介绍正文', 'introDescription', locale.introDescription, isEnglish ? 'Explain what is collected and how review works.' : '说明需准备的资料、合作范围及审核方式。')}</div>` }),
      nda: panel({ title: isEnglish ? 'Confidentiality Agreement' : '保密协议', description: isEnglish ? 'The published version is shown on the company verification application.' : '发布后在企业认证申请页面展示。', body: `<div data-content-editor-form>${input(isEnglish ? 'Agreement title' : '协议标题', 'ndaTitle', locale.ndaTitle)}${richEditor(isEnglish ? 'Agreement content' : '协议正文', 'ndaBody', locale.ndaBody, isEnglish ? 'Enter the complete effective text.' : '填写当前完整生效正文，可使用标题、列表、链接和图片。')}</div>` }),
      distribution: panel({ title: isEnglish ? 'Distribution Agreement' : '发行协议', description: isEnglish ? 'The published version is shown on the company verification application.' : '发布后在企业认证申请页面展示。', body: `<div data-content-editor-form>${input(isEnglish ? 'Agreement title' : '协议标题', 'distributionTitle', locale.distributionTitle)}${richEditor(isEnglish ? 'Agreement content' : '协议正文', 'distributionBody', locale.distributionBody, isEnglish ? 'Enter the complete effective text.' : '填写当前完整生效正文，可使用标题、列表、链接和图片。')}</div>` }),
      help: editor.view === 'article' ? helpEditor : helpList,
    };
    const sectionTabs = [['intro', '认证介绍'], ['nda', '保密协议'], ['distribution', '发行协议'], ['help', '帮助中心']];
    return `<div class="managed-content" data-managed-content><section class="managed-content__toolbar"><nav class="content-section-tabs" aria-label="内容类型">${sectionTabs.map(([value, label]) => `<button type="button" data-portal-action="content-section" data-content-section="${value}" class="${editor.section === value ? 'is-active' : ''}">${label}</button>`).join('')}</nav><div class="managed-content__meta"><span>当前生效 V${e(managedContent?.revision || 1)} · ${e(managedContent?.publishedAt || '—')}</span><div class="content-language-tabs" role="group" aria-label="编辑语言"><button type="button" data-portal-action="content-language" data-content-language="zh" class="${language === 'zh' ? 'is-active' : ''}">中文</button><button type="button" data-portal-action="content-language" data-content-language="en" class="${language === 'en' ? 'is-active' : ''}">English</button></div></div></section><section class="managed-content__body">${sections[editor.section] || sections.intro}</section><footer class="managed-content__footer"><div>${icon('info')}<span>保存并生效会同时校验并原子发布中文与 English；校验失败时继续使用上一版。</span></div>${c.button({ label: '保存并生效', variant: 'primary', action: 'content-publish' })}</footer></div>`;
  };

  const renderGameDashboard = () => `<div class="game-dashboard">
    <section class="game-console-hero"><div class="game-console-hero__art">${icon('game')}</div><div class="game-console-hero__copy"><span>当前游戏</span><h2>星海远征</h2><p>Game ID&nbsp; GAME-48291&nbsp;&nbsp;·&nbsp;&nbsp;APPID&nbsp; APP-7F3A9C</p></div><div class="game-console-hero__stage"><span>当前发行阶段</span><strong>预发布</strong>${c.statusTag('需修改')}</div></section>
    <div class="metric-grid game-data-metrics">${c.metricCard({ label: '净收入', value: '—', trend: '正式上线后生成' })}${c.metricCard({ label: '支付订单', value: '—', trend: '正式上线后生成' })}${c.metricCard({ label: '激活用户', value: '286', trend: '先锋测试累计' })}${c.metricCard({ label: '发行准备度', value: '72%', trend: '6 项已完成 · 2 项待处理' })}</div>
    <div class="content-grid game-dashboard-grid"><div class="span-8">${panel({ title: '发行进度', description: '每个阶段独立提交并保留结果', body: `<div class="release-overview"><div class="is-done"><span>${icon('check')}</span><div><strong>游戏资料</strong><small>资料修订 03</small></div>${c.statusTag('已确认')}</div><div class="is-done"><span>${icon('check')}</span><div><strong>先锋测试</strong><small>TEST-20260818-01</small></div>${c.statusTag('已通过')}</div><div class="is-warning"><span>${icon('warning')}</span><div><strong>预发布</strong><small>PRE-20260902-01</small></div>${c.statusTag('需修改')}</div><div><span>04</span><div><strong>正式上线</strong><small>待预发布通过</small></div>${c.statusTag('未提交')}</div></div>` })}</div>
      <div class="span-4">${panel({ title: '待处理', body: `<div class="console-todo"><span class="console-todo__level">优先</span><strong>修改预发布申请</strong><p>完善开始时间与测试服务器说明后重新提交。</p>${c.button({ label: '查看审核意见', action: 'open-publishing' })}</div><div class="console-todo console-todo--muted"><strong>SDK 接入已完成</strong><p>Windows／macOS／Linux 使用同一 APPID。</p></div>` })}</div>
      <div class="span-12">${panel({ title: '发行数据', description: '正式上线后展示交易、退款与收入趋势', body: `<div class="data-placeholder"><div class="data-placeholder__chart"><i></i><i></i><i></i><i></i><i></i><i></i></div><div><strong>暂无正式发行数据</strong><p>当前游戏仍处于预发布阶段，正式上线后开始统计。</p></div></div>` })}</div></div>
  </div>`;

  const renderT03 = ({ route, page, qualification, operationsReview }) => {
    if (route.id === 'P01-08') return renderQualificationOperations({ qualification, operationsReview });
    if (route.id === 'P02-01') return renderCdkeyWorkspace(page);
    if (route.id === 'P01-04') return renderGameDashboard();
    const view = listViews[route.id];
    const fallback = { tabs: ['全部', '待处理', '已完成'], placeholder: '输入名称或 ID', filters: [{ label: '业务状态', options: ['全部状态', '待处理', '处理中', '已完成'] }], headers: ['对象', '状态', '更新时间', '操作'], rows: [] };
    const config = view || fallback;
    return renderListView(config);
  };

  const renderT04 = ({ qualification, language, managedContent, registration }) => {
    const accountTier = registration?.accountTier || 'unselected';
    if (qualification.status === 'unsubmitted' && accountTier === 'unselected') return renderDeveloperEntryChoice({ language });
    if (accountTier === 'registered' || (['pending', 'approved', 'rejected', 'delisted'].includes(qualification.status) && !qualification.editing)) return renderPlatformDeveloperAccount({ registration, qualification, language });
    return renderQualificationWizard({ qualification, language, managedContent, registration });
  };

  const renderT05 = ({ editorMode = 'edit' }) => {
    const creating = editorMode === 'create';
    const value = (createdValue, emptyValue = '') => creating ? emptyValue : createdValue;
    const activeTag = creating ? '' : ' is-active';
    const screenshotCount = creating ? '0 / 10' : '3 / 10';
    const screenshotHint = creating ? '尚未上传' : '已上传 3 张';
    const submitLabel = creating ? '创建游戏项目' : '提交资料';
    const submitAction = creating ? 'create-game-project' : 'submit-game-review';
    return `<div class="game-editor"><div class="content-grid"><div class="span-8">${panel({
      title: creating ? '新游戏基础资料' : '游戏基本资料',
      description: creating ? '项目创建前不占用现有游戏的 Game ID 或 APPID' : '修改当前游戏的资料，不影响已保留的历史审核快照',
      body: `<div class="form-grid game-form-grid">
        ${c.input({ label: '游戏名称', value: value('星海远征'), placeholder: '请输入游戏名称', required: true })}
        ${c.input({ label: '开发商', value: value('星海互动'), placeholder: '请输入开发商名称', required: true })}
        ${c.input({ label: '短简介', value: value('面向 PC 玩家的完整冒险。'), placeholder: '用一句话介绍游戏', required: true })}
        ${readonlyField({ label: '归属厂商', value: '星海互动', hint: '当前已认证厂商' })}
        ${creating ? readonlyField({ label: 'Game ID／APPID', value: '创建后生成', hint: '新项目不复用现有游戏标识' }) : ''}
        ${c.textarea({ label: '游戏介绍', value: value('玩家将探索未知区域、完成挑战并逐步解锁新的能力与内容。'), placeholder: '请填写游戏玩法、特色与内容说明', required: true })}
      </div><div class="game-config-section"><div class="game-compact-grid">
        ${c.select({ label: '支持语言', options: ['简体中文', '繁体中文', '英语'], value: '简体中文' })}
        ${c.select({ label: '销售地区', options: ['全球（授权地区）'], value: '全球（授权地区）' })}
        ${readonlyField({ label: '支持系统', value: 'Windows／macOS／Linux', hint: '一期全球版支持范围' })}
      </div><div class="requirements-grid">
        ${c.input({ label: 'Windows 要求', value: value('Windows 10 64 位 · x64'), placeholder: '例：Windows 10 64 位 · x64', required: true })}
        ${c.input({ label: 'macOS 要求', value: value('macOS 13 · Apple Silicon／Intel'), placeholder: '例：macOS 13 · Apple Silicon／Intel', required: true })}
        ${c.input({ label: 'Linux 要求', value: value('Ubuntu 22.04 · x64'), placeholder: '例：Ubuntu 22.04 · x64', required: true })}
      </div><div class="candidate-tags"><span class="field-label">Steam 标签</span><div class="rule-chips"><button class="rule-chip${activeTag}" data-demo-action="candidate-tag">动作</button><button class="rule-chip${activeTag}" data-demo-action="candidate-tag">冒险</button><button class="rule-chip${activeTag}" data-demo-action="candidate-tag">单人</button><button class="rule-chip" data-demo-action="candidate-tag">角色扮演</button></div><small>复用 Steam 全量标签字典；线下确认后生效</small></div><div class="release-choice compact-release-choice"><label class="choice-card is-selected"><input type="radio" name="release-method" checked data-demo-action="release-direct-download"><span><strong>盖世直接下载</strong><small>提交三系统 Build，由平台测试与发布</small></span></label><label class="choice-card"><input type="radio" name="release-method" data-demo-action="release-third-party"><span><strong>第三方平台激活</strong><small>由平台配置商品、SKU 与外部 Key 供给</small></span></label></div></div><footer class="form-footer"><span class="save-state" data-save-state>尚未保存</span><div class="form-actions">${c.button({ label: '保存草稿', action: 'save-draft' })}${c.button({ label: submitLabel, variant: 'primary', action: submitAction })}</div></footer>`,
    })}</div><div class="span-4">${panel({ title: '游戏素材', description: '单项失败可重试，不清空其他素材', body: `<div class="asset-grid compact-assets"><div class="asset-card"><div class="asset-placeholder asset-placeholder--icon">1:1</div><strong>游戏图标</strong><span>${creating ? '待上传' : '1024 × 1024'}</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--landscape">16:9</div><strong>横版封面</strong><span>${creating ? '待上传' : '1920 × 1080'}</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--portrait">3:4</div><strong>竖版封面</strong><span>${creating ? '待上传' : '900 × 1200'}</span></div><div class="asset-card"><div class="asset-placeholder asset-placeholder--screens">${screenshotCount}</div><strong>游戏截图</strong><span>${screenshotHint}</span></div></div>${c.button({ label: creating ? '上传素材' : '上传／替换素材', action: 'manage-game-assets' })}` })}</div></div></div>`;
  };

  const renderGamePublishing = () => `<div class="game-publishing" data-game-publishing>
    <nav class="release-page-tabs" role="tablist" aria-label="测试与发布视图"><button class="is-active" type="button" role="tab" aria-selected="true" data-demo-action="release-tab" data-release-tab="progress">发行进度</button><button type="button" role="tab" aria-selected="false" data-demo-action="release-tab" data-release-tab="audit">审核记录</button></nav>
    <section data-release-panel="progress"><div class="publishing-summary">${icon('info')}<div><strong>当前阶段：预发布需修改</strong><p>开发者提交阶段申请，平台运营依据线下结论录入结果；本页不执行自动审批。</p></div></div>
      <div class="release-stage-grid">
        <article class="release-stage-card is-complete"><header><span class="release-stage-card__index">01</span>${c.statusTag('已通过')}</header><div class="release-stage-card__icon">${icon('test')}</div><h2>先锋测试</h2><p>小规模验证游戏启动、权益和基础发行链路。</p><dl><div><dt>申请编号</dt><dd>TEST-20260818-01</dd></div><div><dt>结果录入</dt><dd>08-20 16:42</dd></div></dl><footer><span>${icon('check')} 历史结果已保留</span></footer></article>
        <article class="release-stage-card is-current"><header><span class="release-stage-card__index">02</span>${c.statusTag('需修改')}</header><div class="release-stage-card__icon">${icon('review')}</div><h2>预发布</h2><p>确认发行范围、测试服务器与计划开始时间。</p><dl><div><dt>申请编号</dt><dd>PRE-20260902-01</dd></div><div><dt>结果录入</dt><dd>09-03 14:20</dd></div></dl><footer>${c.button({ label: '查看修改意见', variant: 'primary', action: 'view-release-issue' })}</footer></article>
        <article class="release-stage-card is-locked"><header><span class="release-stage-card__index">03</span>${c.statusTag('未提交')}</header><div class="release-stage-card__icon">${icon('publish')}</div><h2>正式上线</h2><p>提交正式发行范围、商品、包体及上线计划。</p><dl><div><dt>前置条件</dt><dd>预发布已通过</dd></div><div><dt>当前状态</dt><dd>尚未满足</dd></div></dl><footer>${c.button({ label: '提交正式上线申请', action: 'submit-release-application', disabled: true })}</footer></article>
      </div>
      <section class="release-review-note"><div>${icon('warning')}<span><strong>预发布修改意见</strong><small>补充计划开始时间，并说明测试服务器的登录方式与开放范围。</small></span></div><button type="button" data-demo-action="view-release-issue">查看完整记录 ${icon('chevron')}</button></section>
    </section>
    <section data-release-panel="audit" hidden><div class="audit-record-summary"><div><span>当前游戏</span><strong>星海远征</strong><small>GAME-48291 · APP-7F3A9C</small></div><div><span>最新结果</span><strong>预发布需修改</strong><small>2026-09-03 14:20</small></div></div>
      <div class="audit-record-list">
        <article data-review-record="pre-release" class="audit-record is-warning"><span class="audit-record__node"></span><div class="audit-record__main"><header><div><strong>预发布申请</strong><small>PRE-20260902-01 · 提交版本 01</small></div>${c.statusTag('需修改')}</header><p>开始时间未确定；测试服务器登录方式和开放范围说明不完整。</p><footer><span>提交：09-02 11:08</span><span>结果录入：09-03 14:20</span>${c.button({ label: '查看修改要求', action: 'view-release-issue' })}</footer></div></article>
        <article class="audit-record is-success"><span class="audit-record__node"></span><div class="audit-record__main"><header><div><strong>先锋测试申请</strong><small>TEST-20260818-01 · 提交版本 02</small></div>${c.statusTag('已通过')}</header><p>线下结果已确认；测试范围与当前包体修订一致。</p><footer><span>提交：08-18 10:16</span><span>结果录入：08-20 16:42</span></footer></div></article>
        <article class="audit-record is-success"><span class="audit-record__node"></span><div class="audit-record__main"><header><div><strong>游戏资料提交</strong><small>PROFILE-REV-03</small></div>${c.statusTag('已确认')}</header><p>基础资料、三系统配置、发行方式与宣传素材已录入有效快照。</p><footer><span>提交：08-12 09:34</span><span>结果录入：08-14 15:06</span></footer></div></article>
      </div>
    </section>
  </div>`;

  const renderT06 = ({ page, route }) => {
    if (route.id === 'P01-07') return renderGamePublishing();
    if (route.id === 'P03-05') {
      return `<div><div class="task-summary"><div><span>版本</span><strong>1.0.0</strong></div><div><span>包体修订</span><strong>BUILD-REV-003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>测试时间</span><strong>2026-09-01 15:36</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${c.resultStrip({ title: '测试不通过', detail: '启动后主窗口持续白屏，当前包体修订不满足发布条件', variant: 'danger' })}${panel({ title: '具体问题项', body: c.table({ headers: ['问题项', '问题现象', '复现条件', '影响范围'], rows: [['启动与首屏', 'Game.exe 启动后主窗口持续白屏', 'Windows 11 64 位；首次安装后直接启动', '阻塞玩家进入游戏'], ['退出与重启', '结束进程后再次启动仍复现', '同一安装目录连续启动 2 次', '影响全部当前修订测试']] }) })}<div class="issue-result-note"><strong>修订判断</strong><p>需替换包体并生成新修订；旧测试轮次和问题记录保持只读，不可直接改为通过。</p><span>附件摘要：启动白屏截图 1 张 · 测试日志摘要 1 份</span></div></div><div class="span-4">${panel({ title: '测试处理时间线', body: c.timeline({ items: ['测试结果提交 · 不通过 · 陈宇 · 15:36', '问题复现并记录附件 · 15:28', '任务开始测试 · 14:50', '第 1 轮任务分配完成 · 13:10'] }) })}</div></div></div>`;
    }
    return `<div><div class="task-summary"><div><span>资料对象</span><strong>开发者注册 · 厂商资料</strong></div><div><span>资料修订</span><strong>VEN-REV-002</strong></div><div><span>线下结果</span>${c.statusTag(page.status || '需修改')}</div><div><span>录入时间</span><strong>2026-09-03 11:20</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${c.resultStrip({ title: '线下结果：需修改', detail: '平台已录入商务／法务的既有线下结论；请按意见修订后重新提交。', variant: 'warning' })}${panel({ title: '结果摘要与修改意见', body: c.table({ headers: ['资料项', '本次提交', '线下结论摘要', '处理建议'], rows: [['主体登记编号', '9144XXXXXXXXXXXXXX', '登记编号与证明材料需保持一致', '核对后重新填写'], ['厂商 Logo', 'PNG · 1024 × 1024', '品牌归属证明待补充', '联系发行运营补充线下材料']] }) })}<div class="issue-result-note"><strong>生效说明</strong><p>待线下结果期间继续使用上一已确认快照；当前修改稿不会进入 Game、商品、包体或数据链路。</p></div></div><div class="span-4">${panel({ title: '处理记录', body: c.timeline({ items: ['线下结果录入 · 需修改 · 运营李佳 · 11:20', '商务／法务线下结论完成 · 10:55', '资料修订 02 提交 · 09:42', '资料修订 01 已确认 · 2026-08-20'] }) })}</div></div></div>`;
  };

  const renderT07 = ({ page, route, managedContent, contentEditor }) => {
    if (route.id === 'P01-09') return renderManagedContentEditor({ managedContent, contentEditor });
    const isVendor = route.id === 'P01-09';
    const isGame = route.id === 'P01-10';
    const rows = isVendor ? [
      ['主体类型／地区', '公司／企业 · 中国大陆', '线下结论材料中的主体一致'], ['法定名称／登记编号', '深圳星海互动科技有限公司 · 9144…', '按既有商务／法务结论录入'], ['合作授权', '合同 GH-2026-001', '授权地区及有效期已在线下确认'],
    ] : isGame ? [
      ['Game／APPID', '星海远征 · APP-7F3A9C', '项目归属和唯一 APPID 一致'], ['系统与发行方式', 'Windows／macOS／Linux · 盖世直接下载', '线下上架范围已确认'], ['Steam 标签／素材', '动作、冒险、单人 · 素材修订 03', '最终生效项来自既有线下结论'],
    ] : [
      ['候选版本', '1.0.0 · 三系统 Build', '与测试锁定 Manifest 一致'], ['测试结果', '第 1 轮通过', '历史测试终态不可覆盖'], ['上架结论', '允许进入待发布', '由线下既有结论录入，不在线审批'],
    ];
    return `<div>${c.resultStrip({ title: '录入既有线下结果', detail: '本页不执行在线审核，仅将商务、法务或发行团队已完成的线下结论写入平台。', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: isVendor ? '厂商资质结果' : isGame ? '游戏资料与上架结果' : '版本上架结论', body: `${c.table({ headers: ['结果对象', '当前提交快照', '线下核验依据'], rows })}<div class="form-section"><div class="form-grid">${c.select({ label: '线下结果', options: ['已确认', '需修改', '不予上架'], value: '已确认' })}${c.input({ label: '线下审核人', value: '李佳', required: true })}${c.input({ label: '线下审核时间', value: '2026-09-03T11:20', type: 'datetime-local', required: true })}${c.input({ label: '结论依据编号', value: isVendor ? 'LEGAL-20260903-01' : 'BIZ-20260903-02', required: true })}${c.textarea({ label: '结果原因摘要', value: '线下审核已完成，确认当前提交快照可进入下一业务环节。', required: true })}</div></div><footer class="form-footer"><span class="save-state">保存后保留结果、原因、审核人、时间和资料快照；不覆盖历史修订。</span>${c.button({ label: page.primaryAction || '保存线下结果', variant: 'primary', action: 'record-offline-result' })}</footer>` })}</div><div class="span-4">${panel({ title: '保存说明', body: gateList([{ label: '仅录入既有事实', detail: '不得在本页替代线下合同或资质审核', status: '不可修改' }, { label: '生效资料快照', detail: '保存成功后下游读取最新已确认快照', status: '待保存' }, { label: '历史可追溯', detail: '旧结果、资料修订和操作审计永久保留', status: '不可修改' }]) })}</div></div></div>`;
  };

  const renderT08 = ({ page, route }) => {
    const views = {
      'P01-06': {
        title: 'APPID 与三系统 SDK', description: '一个 Game 创建一个公开 APPID；APPID 不是密钥',
        body: `<div class="summary-grid">${readonlyField({ label: 'Game', value: '星海远征 · GAME-48291' })}${readonlyField({ label: 'APPID', value: 'APP-7F3A9C', hint: '全平台唯一，只读' })}${readonlyField({ label: 'SDK 授权规则', value: '首次在线授权成功后允许离线运行', wide: true })}${readonlyField({ label: '数据边界', value: '不做持续心跳、并发限制或即时踢线', wide: true })}</div><div class="form-section"><div class="form-section__title"><strong>SDK 下载</strong><span>三系统能力一致，版本与校验值可追溯</span></div>${c.table({ headers: ['系统', '架构', 'SDK 版本', '校验值', '操作'], rows: [['Windows', 'x64／arm64', '1.0.0', 'SHA-256 · 8f0a…', { action: '下载', demoAction: 'download-sdk' }], ['macOS', 'Intel／Apple Silicon', '1.0.0', 'SHA-256 · 2d4c…', { action: '下载', demoAction: 'download-sdk' }], ['Linux', 'x64／arm64', '1.0.0', 'SHA-256 · 7b19…', { action: '下载', demoAction: 'download-sdk' }]] })}<div class="form-actions" style="margin-top:14px">${c.button({ label: '打开 Google Docs 接入文档', action: 'open-sdk-docs' })}</div></div>`,
        gates: [{ label: 'APPID 唯一', detail: '一个 Game 只创建一个 APPID', status: '已创建' }, { label: '三系统一致', detail: '授权、日志与错误码口径一致', status: '已通过' }, { label: '接入文档', detail: '仅限已授权账号访问', status: '可打开' }], save: false,
      },
      'P02-04': {
        title: '外部 Key 入站供给配置', description: '外部平台 Key 只能受控导入或通过供应商 API 同步，平台不生成外部 Key',
        body: `<div class="form-grid">${readonlyField({ label: '游戏／SKU', value: '星海远征 · SKU-CN-001' })}${c.select({ label: '入站方式', options: ['供应商 API', '受控文件导入'], value: '供应商 API' })}${c.select({ label: '外部激活平台', options: ['Steam', 'Epic'], value: 'Steam' })}${c.input({ label: '来源商品 ID', value: 'SUPPLIER-ITEM-7821', required: true })}${c.select({ label: '授权地区', options: ['中国大陆', '全球（授权地区）'], value: '中国大陆' })}${readonlyField({ label: '最后一次正常库存快照', value: '1,248 · 2026-09-01 15:55' })}${readonlyField({ label: '最后一次正常价格快照', value: '¥ 68.00 CNY · 2026-09-01 15:55' })}${c.select({ label: '异常策略', options: ['停止新增销售', '标记未知并人工确认'], value: '停止新增销售' })}</div>`,
        gates: [{ label: '来源授权', detail: '来源、SKU、地区必须一致', status: '已通过' }, { label: '去重与加密', detail: 'Key 入站去重且明文受控', status: '已通过' }, { label: '价格／库存', detail: '异常时不得沿用旧值', status: '待保存' }], save: true,
      },
      'P02-05': {
        title: '盖世 Key 计划、批次与渠道 API', description: '盖世只生成由自身兑换服务校验的 Key，并在预授权范围内供三方渠道履约',
        body: `<div class="summary-grid">${readonlyField({ label: 'Key 计划', value: 'KEYPLAN-001 · 已启用' })}${readonlyField({ label: '授权游戏／SKU', value: '星海远征 · SKU-CN-001' })}${readonlyField({ label: '生成总额度', value: '10,000' })}${readonlyField({ label: '剩余额度', value: '8,000' })}</div><div class="form-section">${c.table({ headers: ['批次／凭据', '渠道', '配额／剩余', '有效期', '状态'], rows: [['KEY-20260902-001', '星云商城', '2,000／1,360', '2026-12-31', { status: '可用' }], ['cli_xh_20260901', '星云商城', '5,000／4,680', '2026-12-31', { status: '正常' }]] })}<div class="form-actions" style="margin-top:14px">${c.button({ label: '创建 Key 批次', action: 'create-key-batch' })}${c.button({ label: '创建渠道 API 凭据', action: 'create-api-credential' })}${c.button({ label: '查看接口说明', action: 'api-doc-section' })}</div></div>`,
        gates: [{ label: '一次性明文', detail: 'Key 文件和 client_secret 仅在创建结果中展示一次', status: '不可修改' }, { label: '渠道白名单', detail: '凭据不得扩大游戏、SKU、渠道和配额', status: '已通过' }, { label: '幂等与审计', detail: 'request_id 与分配确认完整留痕', status: '已通过' }], save: false,
      },
      'P03-02': {
        title: '版本资料与三系统矩阵', description: '同一发行版本可关联多个 OS／CPU 架构 Build；每个 Build 生成独立 Manifest',
        body: `<div class="form-grid">${readonlyField({ label: '游戏／厂商', value: '星海远征 · 星海互动' })}${c.input({ label: '发行版本号', value: '1.0.0', required: true })}${c.textarea({ label: '更新说明', value: '首个三系统正式版本，包含基础关卡与完整启动流程。', required: true })}</div><div class="form-section">${c.table({ headers: ['OS', 'CPU 架构', 'Build', 'Manifest', '启动配置'], rows: [['Windows', 'x64', 'BUILD-WIN-003', 'MANIFEST-WIN-003', 'Game.exe'], ['macOS', 'Apple Silicon', 'BUILD-MAC-002', 'MANIFEST-MAC-002', 'Game.app'], ['Linux', 'x64', '上传中断', '--', './game']] })}</div>`,
        gates: [{ label: '版本号唯一性', detail: '已发布版本号永久占用', status: '已通过' }, { label: 'OS／架构唯一', detail: '同一版本每组 OS＋架构只关联一个候选 Build', status: '已通过' }, { label: '编辑权限', detail: '当前为草稿，可编辑', status: '可编辑' }], save: true,
      },
      'P03-04': {
        title: '提交测试确认', description: '提交后锁定本轮版本资料、三系统 Build 和 Manifest 快照',
        body: `<div class="summary-grid">${readonlyField({ label: '游戏／发行版本', value: '星海远征 · 1.0.0' })}${readonlyField({ label: '测试轮次', value: '第 1 轮' })}${readonlyField({ label: 'Build 数量', value: '3 个 OS／架构组合' })}${readonlyField({ label: 'Manifest 状态', value: '3 个均已生成并永久保留' })}</div><div class="form-section">${c.table({ headers: ['OS／架构', '锁定 Build', 'Manifest', '基础校验'], rows: [['Windows／x64', 'BUILD-WIN-003', 'MANIFEST-WIN-003', { status: '已通过' }], ['macOS／Apple Silicon', 'BUILD-MAC-002', 'MANIFEST-MAC-002', { status: '已通过' }], ['Linux／x64', 'BUILD-LINUX-001', 'MANIFEST-LINUX-001', { status: '已通过' }]] })}</div>`,
        gates: [{ label: '项目归属与授权', detail: '星海互动 · 星海远征', status: '已通过' }, { label: '三系统 Build', detail: '完整性、可读性与启动配置', status: '已通过' }, { label: '快照锁定', detail: '测试中不得替换本轮 Build／Manifest', status: '待提交' }], save: false,
      },
      'P04-08': {
        title: '聚合导出确认', description: '导出严格复用当前页面 query_snapshot_id，只包含开发者可见的聚合行',
        body: `<div class="summary-grid">${readonlyField({ label: '查询快照', value: 'QRY-20260903-001' })}${readonlyField({ label: '数据更新至', value: '2026-09-02 23:59（T+1）' })}${readonlyField({ label: '筛选', value: '星海远征 · 近 30 天 · 全部渠道', wide: true })}${readonlyField({ label: '维度', value: '日期、游戏、渠道、Campaign、OS／架构', wide: true })}${readonlyField({ label: '指标', value: '交易、退款、Key、下载、首次启动' })}${readonlyField({ label: '预计行数／格式', value: '120 行 · CSV／XLSX' })}${readonlyField({ label: '币种', value: 'CNY；不做无汇率版本的跨币种合计' })}${readonlyField({ label: '脱敏', value: '不含用户、订单、设备、Key 明文' })}</div><div data-export-result></div>`,
        gates: [{ label: '数据公式', detail: '页面与导出使用同一口径版本', status: '已通过' }, { label: '权限与隐私阈值', detail: '只输出当前厂商可见的聚合结果', status: '已通过' }, { label: '短期下载地址', detail: '成功后限时有效；失败不生成空文件', status: '待生成' }], save: false,
      },
    };
    const view = views[route.id] || views['P03-02'];
    const footerNotes = {
      'P01-06': 'SDK 版本与校验值由平台统一维护。',
      'P02-05': '批次、凭据和接口操作均保留审计记录。',
      'P03-04': '提交后将锁定本轮三系统 Build 与 Manifest 快照。',
      'P04-08': '导出任务异步生成；失败可按同一查询快照重试。',
    };
    const footer = view.save ? defaultFooter(page) : `<footer class="form-footer"><span class="save-state">${footerNotes[route.id] || '当前信息为只读内容。'}</span>${route.id === 'P04-08' ? c.button({ label: page.primaryAction, variant: 'primary', action: 'generate-export' }) : ''}</footer>`;
    const sideTitle = route.id === 'P04-08' ? '导出说明' : route.id === 'P01-06' ? '接入状态' : route.id === 'P02-05' ? '安全规则' : '提交检查';
    return `<div class="content-grid"><div class="span-8">${panel({ title: view.title, description: view.description, body: `${view.body}${footer}` })}</div><div class="span-4">${panel({ title: sideTitle, body: gateList(view.gates) })}</div></div>`;
  };

  const renderT09 = ({ page }) => `<div><div class="task-summary"><div><span>异常编号</span><strong>SUP-20260901-001</strong></div><div><span>游戏／商品</span><strong>星海远征 · 标准版</strong></div><div><span>SKU</span><strong>SKU-CN-001</strong></div><div><span>首次发现</span><strong>2026-09-01 16:20</strong></div></div><div class="content-grid" style="margin-top:16px"><section class="exception-hero span-12"><div class="exception-icon">${icon('warning')}</div><div><h2>停止新增销售</h2><p>当前价格不可可靠读取，SKU 按最严格结果进入停售；既有订单及其履约证据保持不变。</p></div>${c.statusTag(page.status)}</section><div class="span-7">${panel({ title: '异常影响与恢复条件', body: `<div class="summary-grid">${readonlyField({ label: '异常类型', value: '当前价格不可用' })}${readonlyField({ label: '最近更新时间', value: '2026-09-01 17:50' })}${readonlyField({ label: '影响范围', value: 'SKU-CN-001 新增销售', wide: true })}${readonlyField({ label: '影响地区', value: '中国大陆' })}${readonlyField({ label: '开发者建议', value: '等待平台确认恢复；无需处理既有订单' })}</div><div class="form-section"><div class="form-section__title"><strong>恢复条件</strong><span>来源恢复不自动开售</span></div>${gateList([{ label: '来源价格恢复', detail: '取得可靠当前价格快照', status: '待恢复' }, { label: '供给与地区重校', detail: '来源、SKU、授权地区一致', status: '待校验' }, { label: '平台确认恢复', detail: '全部阻塞消除后由运营确认', status: '待确认' }])}</div>` })}</div><div class="span-5">${panel({ title: '处理时间线', body: c.timeline({ items: ['同步重试仍未取得可靠价格 · 17:50', 'SKU 停止新增销售 · 16:22', '检测到当前价格不可用 · 16:20', '最近一次正常同步 · 15:55'] }) })}</div></div></div></div>`;

  const renderT10 = ({ page }) => {
    const retry = actionOf(page, 'retry-upload', '继续上传');
    return `<div class="content-grid"><div class="span-8">${panel({ title: '包体上传与 Build 详情', description: '每个 OS／CPU 架构独立生成 Build、Manifest 和 Chunk 记录', body: `${c.table({ headers: ['OS／架构', 'Build', 'Manifest', 'Chunk', '状态'], rows: [['Windows／x64', 'BUILD-WIN-003', 'MANIFEST-WIN-003', '246 个', { status: '已完成' }], ['macOS／Apple Silicon', 'BUILD-MAC-002', 'MANIFEST-MAC-002', '218 个', { status: '已完成' }], ['Linux／x64', 'BUILD-LINUX-001', '生成中', '142／210', { status: '已中断' }]] })}<div class="upload-zone" style="min-height:170px;margin-top:16px"><div><div class="upload-zone__icon">${icon('upload')}</div><h3>Linux x64 Build 上传已中断</h3><p>已完成 Chunk 永久保留，可从 68% 继续；重新上传不会覆盖旧 Build／Manifest。</p>${c.statusTag('已中断')}</div></div><div class="upload-progress"><div class="progress-track"><div class="progress-bar" data-upload-progress></div></div><div class="progress-meta"><span data-upload-label>已上传 68%，142 个 Chunk 已保留</span><span class="number">6.8 GB / 10.0 GB</span></div></div><footer class="form-footer"><span class="save-state">完成后将生成新的 Manifest</span><div class="form-actions">${c.button({ label: retry.label, variant: 'primary', action: retry.id })}</div></footer>` })}</div><div class="span-4">${panel({ title: '存储说明', body: gateList([{ label: 'Build 永久保留', detail: '新上传生成新 Build ID，不覆盖历史', status: '不可修改' }, { label: 'Manifest 永久保留', detail: '文件清单、哈希和 Chunk 关系不可改写', status: '不可修改' }, { label: 'Release Pointer', detail: '发布时按 app_id＋OS＋CPU 架构切换指向', status: '发布时更新' }]) })}</div></div>`;
  };

  const renderT11 = ({ page, route }) => {
    if (route.id === 'P03-07') {
      return `<div><div class="task-summary"><div><span>测试任务</span><strong>TEST-202609-002</strong></div><div><span>版本／修订</span><strong>1.0.0 · BUILD-REV-003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>任务状态</span>${c.statusTag(page.status)}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '测试任务详情', description: '只读使用本轮锁定的资料与包体修订', body: `<div class="summary-grid">${readonlyField({ label: '游戏／平台', value: '星海远征 · Windows' })}${readonlyField({ label: '测试环境', value: '正式环境验收' })}${readonlyField({ label: '启动文件', value: 'Game.exe' })}${readonlyField({ label: '启动参数', value: '-language=zh-CN' })}${readonlyField({ label: '运行说明', value: '首次启动进行资源校验，安装目录需可写', wide: true })}</div><div class="form-section"><div class="form-section__title"><strong>测试范围</strong><span>获取失败可重试，不自动记为不通过</span></div>${gateList([{ label: '安装与启动', detail: '完成安装、首启与基础运行检查', status: '待测试' }, { label: '核心流程', detail: '验证基础关卡与退出流程', status: '待测试' }, { label: '包体基础校验', detail: '完整性与启动文件已通过', status: '已通过' }])}</div>` })}</div><div class="span-4">${panel({ title: '领取与开始记录', body: c.timeline({ items: ['任务已分配给陈宇 · 2026-09-01 13:10', '包体获取权限已生成', '等待测试人员开始本轮测试'] }) })}</div></div></div>`;
    }
    const pass = actionOf(page, 'test-pass', '测试通过');
    const submit = actionOf(page, 'submit-test-result', '提交测试结果');
    return `<div><div class="task-summary"><div><span>测试任务</span><strong>TEST-202609-002</strong></div><div><span>版本／修订</span><strong>1.0.0 · BUILD-REV-003</strong></div><div><span>测试轮次</span><strong>第 1 轮</strong></div><div><span>任务状态</span>${c.statusTag(page.status)}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-7">${panel({ title: '提交测试结果', description: '每轮首个成功终态生效，提交后不可修改', body: `<div class="test-choice"><label class="choice-card is-selected"><input type="radio" name="test-result" checked data-demo-action="${e(pass.id)}"><strong>${e(pass.label)}</strong></label><label class="choice-card"><input type="radio" name="test-result" data-demo-action="test-fail"><strong>测试不通过</strong></label></div><div class="test-result-form">${c.textarea({ label: '问题描述', placeholder: '不通过时必填；填写现象、复现条件和影响范围' })}${readonlyField({ label: '附件状态', value: '未添加附件', hint: '仅展示当前任务附件状态' })}</div><footer class="form-footer"><span class="save-state">提交失败保持测试中并保留输入；历史结果不可覆盖</span>${c.button({ label: submit.label, variant: 'primary', action: submit.id })}</footer>` })}</div><div class="span-5">${panel({ title: '提交检查与记录', body: `${gateList([{ label: '任务有效性', detail: 'TEST-202609-002 为当前有效任务', status: '已通过' }, { label: '修订一致性', detail: 'BUILD-REV-003 · 第 1 轮', status: '已通过' }, { label: '结果完整性', detail: '不通过时问题描述必填', status: '待提交' }])}<div style="margin-top:14px">${c.timeline({ items: ['任务开始测试 · 陈宇', '包体获取成功', '任务分配完成'] })}</div>` })}</div></div></div>`;
  };

  const renderT12 = ({ page, route }) => {
    if (route.id === 'P03-13') {
      const dispositionActions = `<div class="disposition-actions">${c.button({ label: '恢复下载', variant: 'primary', action: 'resume-download' })}${c.button({ label: '暂停启动', action: 'pause-launch' })}${c.button({ label: '下架游戏', variant: 'danger', action: 'unpublish-game' })}</div>`;
      return `<div><div class="task-summary"><div><span>当前线上版本</span><strong>0.9.0 · BUILD-REV-090</strong></div><div><span>发布时间</span><strong>2026-08-15 14:30</strong></div><div><span>下载开关</span>${c.statusTag('下载暂停')}</div><div><span>启动开关</span>${c.statusTag('允许启动')}</div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '线上版本处置', description: '处置只影响当前线上版本能力，不删除文件、测试或发布历史', body: `${gateList([{ label: '下载能力', detail: '平台问题处理中，暂停新增下载', status: '下载暂停' }, { label: '启动能力', detail: '已安装玩家仍可启动', status: '允许启动' }, { label: '游戏发布状态', detail: '商品停售不等于游戏下架', status: '已发布' }])}<div class="form-section"><div class="form-section__title"><strong>处置信息</strong><span>请填写处置原因与影响范围后执行</span></div><div class="form-grid disposition-form">${c.textarea({ label: '处置原因', placeholder: '请填写问题现象、处置依据和恢复条件', required: true })}${c.select({ label: '影响范围', options: ['仅新增下载', '仅启动能力', '下载与启动', '整款游戏发布状态'], value: '仅新增下载' })}</div></div><div class="form-section"><div class="form-section__title"><strong>可执行处置</strong><span>恢复前重新校验问题、当前版本与发布条件</span></div>${dispositionActions}</div><footer class="form-footer"><span class="save-state">所有处置记录前后开关、原因、影响范围、操作人和结果</span></footer>` })}</div><div class="span-4">${panel({ title: '处置记录', body: c.timeline({ items: ['下载暂停 · 平台问题处理中 · 运营李佳', '版本 0.9.0 发布成功', '发布条件校验通过'] }) })}</div></div></div>`;
    }
    const schedule = actionOf(page, 'schedule-release', '定时发布');
    const now = actionOf(page, 'release-now', '立即发布');
    return `<div><div class="task-summary"><div><span>候选发行版本</span><strong>1.0.0</strong></div><div><span>Release Pointer</span><strong>3 个 OS／架构组合</strong></div><div><span>测试轮次</span><strong>第 2 轮 · 测试通过</strong></div><div><span>当前线上版本</span><strong>0.9.0</strong></div></div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: '发布与 Release Pointer 配置', description: '按 app_id＋OS＋CPU 架构切换 Pointer；Build、Manifest、Chunk 均不删除', body: `<div class="publish-options"><button class="publish-option is-active" data-demo-action="${e(now.id)}"><strong>${e(now.label)}</strong><span>发布条件通过后切换三组线上 Pointer</span></button><button class="publish-option" data-demo-action="${e(schedule.id)}"><strong>${e(schedule.label)}</strong><span>按统一时区设置未来发布时间</span></button></div><div class="schedule-field is-disabled" data-schedule-field>${c.input({ label: '定时发布时间', value: '', placeholder: '选择定时发布后填写', type: 'datetime-local', hint: '仅在选择定时发布时填写', disabled: true })}</div><div class="form-section">${c.table({ headers: ['Pointer Key', '当前线上 Build', '候选 Build', '状态'], rows: [['APP-7F3A9C／Windows／x64', 'BUILD-WIN-002', 'BUILD-WIN-004', { status: '待切换' }], ['APP-7F3A9C／macOS／arm64', 'BUILD-MAC-001', 'BUILD-MAC-002', { status: '待切换' }], ['APP-7F3A9C／Linux／x64', 'BUILD-LINUX-000', 'BUILD-LINUX-001', { status: '待切换' }]] })}</div><div class="form-section"><div class="form-section__title"><strong>回滚历史 Build</strong><span>回滚会生成一条新的 Pointer 切换记录，并保留原因和操作者</span></div><div class="form-grid">${c.select({ label: '目标历史发布', options: ['0.9.0 · REL-090', '0.8.2 · REL-082'], value: '0.9.0 · REL-090' })}${c.textarea({ label: '回滚原因', value: '线上异常，恢复到上一稳定发布。', required: true })}</div><div class="form-actions" style="margin-top:12px">${c.button({ label: '回滚历史 Build', variant: 'danger', action: 'rollback-release' })}</div></div><footer class="form-footer"><span class="save-state">发布或回滚失败时保持全部原线上 Pointer 不变</span><div class="form-actions">${c.button({ label: '保持原线上版本', action: 'keep-online-version' })}${c.button({ label: page.primaryAction || now.label, variant: 'primary', action: now.id, extra: 'data-release-submit' })}</div></footer>` })}</div><div class="span-4">${panel({ title: '发布条件与历史', body: `${gateList([{ label: '项目授权与资料', detail: '已确认快照可读取', status: '已通过' }, { label: '三系统 Build／Manifest', detail: '候选组合完整且测试通过', status: '已通过' }, { label: '商品／权益与供给', detail: '当前发行方式条件已满足', status: '已通过' }, { label: '一致性切换', detail: '任一 Pointer 失败则全部保持原值', status: '不可修改' }])}<div style="margin-top:14px">${c.timeline({ items: ['0.9.0 发布成功 · REL-090', '0.8.2 回滚完成 · 保留全部历史 Build', '0.8.0 首次发布'] })}</div>` })}</div></div></div>`;
  };

  const renderT13 = ({ page, route }) => {
    if (route.id === 'P04-06') return `<div>${c.resultStrip({ title: '人工资源协作', detail: '已提交不代表资源承诺；只有运营回填实际时间和证据后才记为已执行。', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: '提交资源需求', body: `<div class="form-grid">${c.select({ label: '游戏／Campaign', options: ['星海远征 · CMP-202609-001'], value: '星海远征 · CMP-202609-001' })}${c.select({ label: '资源类型', options: ['首页推荐', '专题页', '站外合作'], value: '首页推荐' })}${c.select({ label: '推广目标', options: ['购买／领取', '成功交付', '首次启动'], value: '购买／领取' })}${c.input({ label: '期望开始时间', value: '2026-09-10', type: 'date', required: true })}${c.input({ label: '期望结束时间', value: '2026-09-20', type: 'date', required: true })}${c.input({ label: '素材引用', value: 'ASSET-REV-003', required: true })}${c.textarea({ label: '需求说明', value: '希望配合首发期进行首页推荐；最终资源与时间以运营实际执行为准。', required: true })}</div><footer class="form-footer"><span class="save-state">提交、修改或取消均新增修订并保留历史</span>${c.button({ label: page.primaryAction, variant: 'primary', action: 'submit-resource-request' })}</footer>` })}</div><div class="span-4">${panel({ title: '平台执行结果', body: `${gateList([{ label: '需求状态', detail: 'REQ-202609-001 · 修订 02', status: '处理中' }, { label: '实际资源位／渠道', detail: '等待运营线下协调后回填', status: '--' }, { label: '实际起止时间', detail: '已执行时必填', status: '--' }, { label: '原因与证据', detail: '未执行填原因；已执行填证据引用', status: '待回填' }])}<div class="receipt-note"><strong>最近处理记录</strong><p>运营已领取需求，正在协调首页资源；当前不构成资源承诺。</p><span>2026-09-03 10:20 · 平台发行运营</span></div>` })}</div></div></div>`;
    return `<div>${c.resultStrip({ title: 'Campaign／UTM', detail: '用于渠道来源标识与归因有效期，不承担竞价、频控或自动排期。', variant: 'info' })}<div class="content-grid"><div class="span-8">${panel({ title: 'Campaign 配置', body: `<div class="form-grid">${c.input({ label: '活动名称', value: '秋季首发合作', required: true })}${c.select({ label: '游戏', options: ['星海远征'], value: '星海远征' })}${c.select({ label: 'SKU（可选）', options: ['全部 SKU', 'SKU-CN-001'], value: 'SKU-CN-001' })}${c.select({ label: '渠道', options: ['Bilibili 达人', 'Steam 社区', '自有媒体'], value: 'Bilibili 达人' })}${c.input({ label: 'utm_source', value: 'bilibili', required: true })}${c.input({ label: 'utm_medium', value: 'creator', required: true })}${c.input({ label: 'utm_campaign', value: 'autumn_launch', required: true })}${c.input({ label: '归因开始日期（可选）', value: '2026-09-10', type: 'date' })}${c.input({ label: '归因结束日期（可选）', value: '2026-09-20', type: 'date' })}${c.textarea({ label: '备注', value: '达人首发视频与动态使用同一 Campaign。' })}</div><div class="form-section">${readonlyField({ label: '生成后追踪链接', value: 'https://gamehub.com/game/APP-7F3A9C?campaign_id=CMP-202609-001&utm_source=bilibili&utm_medium=creator&utm_campaign=autumn_launch', wide: true })}</div>${defaultFooter(page)}` })}</div><div class="span-4">${panel({ title: 'Campaign 状态', body: gateList([{ label: 'campaign_id', detail: '保存成功后唯一生成', status: 'CMP-202609-001' }, { label: '活动状态', detail: '草稿／有效／已停用', status: page.status }, { label: '重复 UTM 组合', detail: '提示风险但允许不同 Campaign', status: '已检查' }, { label: '停用影响', detail: '停止建立新归因，历史来源快照不变', status: '不可修改' }]) })}</div></div></div>`;
  };

  const renderT15 = ({ page, route }) => {
    const range = actionOf(page, 'dashboard-range', '近 7 天');
    const configs = {
      'P04-01': {
        metrics: [['支付订单', '3,284', '成功支付终态'], ['成功退款', '126', '退款率 3.84%'], ['盖世／外部 Key', '8,920', '可供给与已分配'], ['首次成功启动', '2,408', 'uid＋app_id 去重']],
        chart: '交易、Key、下载与首次启动整体经营趋势', title: '经营漏斗', unit: '数量（次）', legend: '成功支付／领取',
        rows: [['成功支付／领取', '3,284', '交易与权益终态', '2026-09-02 23:59'], ['成功交付', '3,108', 'Key／直接权益终态', '2026-09-02 23:59'], ['成功下载', '2,774', '客户端成功终态', '2026-09-02 23:59'], ['首次成功启动', '2,408', 'uid＋app_id 历史首个成功终态', '2026-09-02 23:59']],
        definitions: ['支付订单：订单达到支付成功终态后计入。', '成功交付：外部 Key 或盖世权益完成交付后计入。', '首次成功启动：同一 uid＋app_id 仅记录历史首次成功。', '交易与 Key 数据小时级更新；客户端数据次日更新。'],
        filters: ['全部游戏'],
      },
      'P04-02': {
        metrics: [['实付金额', '¥ 226,548', 'CNY 分币种汇总'], ['成功退款金额', '¥ 8,694', '仅成功退款'], ['预估净收入', '¥ 181,320', '非最终结算'], ['锁定月结算', '¥ 176,804', '2026-08 已锁定']],
        chart: '支付、退款与预估净收入按日趋势', title: '结算与退款明细聚合', unit: '金额（CNY）', legend: '实付金额',
        rows: [['2026-08', '¥ 214,980', '¥ 8,176', '¥ 176,804（已锁定）'], ['2026-09（截至 02 日）', '¥ 11,568', '¥ 518', '--（未锁定）']],
        headers: ['结算月', '实付金额', '成功退款', '最终结算'],
        definitions: ['实付金额：仅统计支付成功订单，按币种分别汇总。', '成功退款：仅统计退款成功终态，不包含处理中申请。', '预估净收入用于经营参考，最终金额以锁定月结算为准。', '-- 表示当前结算月尚未锁定，不代表金额为 0。'],
        filters: ['全部游戏'],
      },
      'P04-03': {
        metrics: [['外部 Key 可供库存', '1,248', 'Steam／Epic 聚合'], ['盖世 Key 剩余额度', '8,000', '计划 KEYPLAN-001'], ['渠道分配成功', '4,682', '不含测试行为'], ['盖世 Key 已兑换', '3,916', '兑换成功终态']],
        chart: '外部 Key 交付与盖世 Key 分配／兑换趋势', title: '双类 Key 账本', unit: 'Key 数量（个）', legend: '渠道分配成功',
        rows: [['外部 Key', 'SKU-CN-001', '1,248', '876 次交付'], ['盖世 Key', 'KEYPLAN-001', '8,000', '3,916 次兑换']],
        headers: ['Key 类型', 'SKU／计划', '可用库存／额度', '成功结果'],
        definitions: ['外部 Key 库存按可用且未预留状态统计。', '盖世 Key 剩余额度为计划总额度扣除已生成数量。', '渠道分配按 request_id 去重，不重复扣减库存。', '测试订单和测试兑换全部排除。'],
        filters: ['全部游戏', '全部渠道'],
      },
      'P04-04': {
        metrics: [['成功下载', '2,774', '三系统聚合'], ['成功更新', '1,986', '成功终态'], ['首次成功启动', '2,408', 'uid＋app_id 去重'], ['主要失败', '网络中断', '仅聚合分类']],
        chart: 'Windows、macOS、Linux 下载／更新／首次启动趋势', title: 'OS／架构交付表现', unit: '设备数（台）', legend: '首次成功启动',
        rows: [['Windows／x64', '1,842', '1,354', '1,621'], ['macOS／Apple Silicon', '612', '428', '506'], ['Linux／x64', '320', '204', '281']],
        headers: ['OS／架构', '成功下载', '成功更新', '首次启动'],
        definitions: ['成功下载和更新以客户端完成校验的终态为准。', '首次成功启动按 uid＋app_id 去重，与设备数量无关。', '失败原因仅展示聚合分类，不提供用户或设备明细。', '客户端结果次日更新；-- 表示数据尚未完成聚合。'],
        filters: ['全部游戏', '全部系统'],
      },
      'P04-07': {
        metrics: [['Campaign 点击', '8,920', '点击可用渠道'], ['渠道订单', '1,482', '固化来源快照'], ['成功交付', '1,366', '权益／Key 终态'], ['首次成功启动', '1,104', '归因窗口内']],
        chart: 'Campaign／UTM 渠道转化漏斗', title: '渠道与 Campaign 对比', unit: '转化数量（次）', legend: '成功交付',
        rows: [['CMP-202609-001／Bilibili', '5,420', '982', '874', '706'], ['CMP-202608-014／Steam 社区', '--', '318', '306', '251'], ['自然流量', '--', '182', '186', '147']],
        headers: ['Campaign／渠道', '点击', '订单／领取', '成功交付', '首次启动'],
        definitions: ['订单创建时固化 Campaign／UTM 来源快照，后续不改写。', '首次成功启动只统计归因有效期内完成的用户。', '同一请求与订单按 request_id、channel_order_id 去重。', '-- 表示该渠道不提供对应指标，不按 0 处理。'],
        filters: ['全部游戏', '全部渠道'],
      },
    };
    const config = configs[route.id] || configs['P04-01'];
    const headers = config.headers || ['经营阶段', '聚合结果', '权威来源／口径', '数据更新至'];
    return `<div><div class="dashboard-toolbar"><div class="dashboard-toolbar__group">${c.button({ label: range.label, variant: 'primary', action: 'dashboard-range', extra: 'data-dashboard-range' })}${c.button({ label: '近 90 天', action: 'dashboard-range', extra: 'data-dashboard-range' })}${config.filters.map((label, index) => c.button({ label, variant: index === 0 ? 'primary' : 'secondary', action: 'dashboard-filter', extra: 'data-dashboard-filter' })).join('')}</div><span class="save-state">数据更新：交易／Key 小时级，客户端 T+1；测试行为全部排除</span></div><div class="metric-grid">${config.metrics.map(([label, value, trend]) => c.metricCard({ label, value, trend })).join('')}</div><div class="content-grid" style="margin-top:16px"><div class="span-8">${panel({ title: config.title, body: `${c.chart({ label: config.chart, unit: config.unit, legend: config.legend })}<div class="form-section">${c.table({ headers, rows: config.rows })}</div>` })}</div><div class="span-4">${panel({ title: '数据口径', body: sectionList(config.definitions) })}</div></div></div>`;
  };

  const registry = {
    T01: renderT01,
    T02: renderT02,
    T03: renderT03,
    T04: renderT04,
    T05: renderT05,
    T06: renderT06,
    T07: renderT07,
    T08: renderT08,
    T09: renderT09,
    T10: renderT10,
    T11: renderT11,
    T12: renderT12,
    T13: renderT13,
    T15: renderT15,
  };

  namespace.templates = {
    registry,
    render({ route, page, state = 'default', editorMode = 'edit', qualification, language = 'zh', managedContent, contentEditor, operationsReview, registration, authenticated = false }) {
      if (state !== 'default') return c.statePanel({ state, primaryAction: page?.primaryAction, onRetry: state === 'error' });
      const renderer = registry[route.templateId] || registry.T03;
      return `<section class="page-template template-${route.templateId.toLowerCase()}" data-page-state="default">${renderer({ route, page, editorMode, qualification, language, managedContent, contentEditor, operationsReview, registration, authenticated })}</section>`;
    },
  };
})(window.GameHubDeveloperPortal);
