/* P01-08 游戏发布审核：V2.5 列表摘要、五模块快照与 V2.4 历史兼容。 */
(function (global) {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const present = value => Boolean(String(value ?? '').trim());
  const time = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
  const statusText = { reviewing: '待审核', approved: '已通过', rejected: '已驳回', withdrawn: '已撤销', unavailable: '历史记录' };
  const relationshipText = { self_owned: '自研且自有全部权利', agent: '代理发行', co_publish: '联合发行', third_party_ip: '使用第三方 IP', developer_publisher: '我是开发商和发行商', publisher: '我是发行商', developer: '我是开发商' };
  const languageNames = { zh: '简体中文', 'zh-Hant': '繁体中文', en: '英语', ja: '日语', ko: '韩语', id: '印尼语', th: '泰语', pt: '葡萄牙语', vi: '越南语', hi: '印地语', ms: '马来语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', ar: '阿拉伯语' };
  const labelFiles = { icon: '游戏图标', landscape: '横版宣传图', portrait: '竖版宣传图', screenshots: '游戏截图', trailer: '宣传片', gameplay: '游戏实机录屏', rights: '游戏权属文件', authorization: '发行授权文件', copyright: '软件著作权证明', mainland: '游戏版号证明', safety: '安全评估报告', icp: 'ICP 核准证明' };
  const errorText = error => ({
    'reason-required': '请填写明确的驳回原因。',
    'reason-too-long': '驳回原因不能超过 2000 字。',
    'already-reviewed': '此提交已被审核或开发者撤销，已刷新最新结果。',
    'submission-missing': '当前提交不存在，请返回列表刷新。',
    'approval-incomplete': '提交快照存在缺项，不能通过。请驳回并说明需要修改的内容。',
  }[error?.message] || '处理失败，原状态和输入已保留，请重试。');

  const field = (label, value, wide = false, options = {}) => `<div class="pgr-field${wide ? ' pgr-wide' : ''}${options.emphasis ? ' is-emphasis' : ''}"><dt>${esc(label)}</dt><dd>${esc(present(value) ? value : '—')}</dd></div>`;
  const panel = (key, title, body, hint = '') => `<section class="pgr-panel" data-game-review-section="${esc(key)}"><header class="pgr-panel__header"><div><h2>${esc(title)}</h2>${hint ? `<p>${esc(hint)}</p>` : ''}</div></header>${body}</section>`;
  const badge = status => `<span class="pgr-tag pgr-tag--${esc(status)}">${esc(statusText[status] || status || '—')}</span>`;
  const languageLabel = code => languageNames[code] || code;

  let activeController;

  async function mount(host, state, { reviewer = '运营审核员（本地演示）' } = {}) {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const signal = controller.signal;
    Object.assign(state, {
      status: state.status || '',
      region: state.region || '',
      keyword: state.keyword || '',
      rows: [],
      loading: true,
      error: '',
      busy: false,
      reason: state.reason || '',
      selectedId: state.selectedId || '',
      storeLanguage: state.storeLanguage || '',
    });

    const urls = new Map();
    const revoke = () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
    signal.addEventListener('abort', revoke, { once: true });
    const fileUrl = file => {
      if (!(file?.blob instanceof Blob) || !file.blob.size) return '';
      if (!urls.has(file.blob)) urls.set(file.blob, URL.createObjectURL(file.blob));
      return urls.get(file.blob);
    };

    const renderFiles = (key, source, { label = labelFiles[key] || key, required = false } = {}) => {
      const entries = list(source).filter(Boolean);
      return `<section class="pgr-files-section" data-game-review-files="${esc(key)}"><h3>${esc(label)}<small>${entries.length} 个文件</small></h3>${entries.length ? `<div class="pgr-files">${entries.map(file => {
        const url = fileUrl(file);
        const type = file.type || file.blob?.type || '';
        const media = !url
          ? '<div class="pgr-file-unavailable">原文件不可用<br>需开发者重新上传</div>'
          : type.startsWith('video/') ? `<video controls preload="metadata" src="${esc(url)}" aria-label="${esc(file.name || label)}"></video>`
            : type === 'application/pdf' ? `<object type="application/pdf" data="${esc(url)}" aria-label="${esc(file.name || label)}"><p>请使用下方链接查看 PDF。</p></object>`
              : type.startsWith('image/') ? `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(file.name || label)}"></a>`
                : '<div class="pgr-file-unavailable">附件</div>';
        return `<article class="pgr-file">${media}<div><strong>${esc(file.name || '未命名文件')}</strong><small>${esc(type || '未记录类型')}${file.width ? ` · ${file.width} × ${file.height}` : ''}</small>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">查看原文件</a>` : ''}</div></article>`;
      }).join('')}</div>` : `<p class="pgr-muted">未上传（${required ? '必填' : '选填'}）</p>`}</section>`;
    };

    const v25Locale = (row, draft) => {
      const profile = draft.gameProfileDraft || {};
      const locales = [...new Set(list(draft.storeLocales?.enabled).length ? list(draft.storeLocales.enabled) : Object.keys(profile.gameNames || {}))];
      const required = global.PublisherGameReviewStore.releaseMode(draft) === 'domestic' ? 'zh' : 'en';
      const fallback = draft.storeLocales?.default || required;
      const current = locales.includes(state.storeLanguage) ? state.storeLanguage : locales.includes(fallback) ? fallback : locales.includes(required) ? required : locales[0] || required;
      state.storeLanguage = current;
      const content = profile.localizedContent?.[current] || {};
      const localizedAssets = profile.localizedAssets || {};
      const ownAssets = localizedAssets[current] || {};
      const defaultAssets = localizedAssets[fallback] || {};
      const assets = key => {
        const own = ownAssets[key];
        const hasOwn = Array.isArray(own) ? own.length > 0 : Boolean(own);
        return { value: hasOwn ? own : defaultAssets[key], fallback: current !== fallback && !hasOwn && Boolean(Array.isArray(defaultAssets[key]) ? defaultAssets[key].length : defaultAssets[key]) };
      };
      return { profile, locales, required, fallback, current, content, assets };
    };

    const legacyLocale = draft => {
      const locales = [...new Set(list(draft.nameLanguages).length ? list(draft.nameLanguages) : ['zh', 'en'])];
      const fallback = draft.defaultNameLanguage || (list(draft.releaseRegions).includes('domestic') ? 'zh' : 'en');
      const current = locales.includes(state.storeLanguage) ? state.storeLanguage : locales.includes(fallback) ? fallback : locales[0];
      state.storeLanguage = current;
      const content = draft.localizedContent?.[current] || (current === 'zh' ? { tagline: draft.taglineZh, description: draft.descriptionZh, developerWords: draft.developerWordsZh } : { tagline: draft.tagline, description: draft.description, developerWords: draft.developerWords });
      const name = draft.gameNames?.[current] || (current === 'zh' ? draft.gameNameZh : draft.gameNameEn);
      const localizedAssets = draft.localizedAssets || {};
      const ownAssets = localizedAssets[current] || {};
      const defaultAssets = localizedAssets[fallback] || draft.assets || {};
      const assets = key => {
        const own = ownAssets[key];
        const hasOwn = Array.isArray(own) ? own.length > 0 : Boolean(own);
        return { value: hasOwn ? own : defaultAssets[key], fallback: current !== fallback && !hasOwn && Boolean(Array.isArray(defaultAssets[key]) ? defaultAssets[key].length : defaultAssets[key]) };
      };
      return { locales, fallback, current, content, name, assets };
    };

    const localePicker = locale => `<label class="pgr-language-picker">商店资料语言<select data-game-review-store-language data-game-review-content-language data-game-review-asset-language>${locale.locales.map(code => `<option value="${esc(code)}"${locale.current === code ? ' selected' : ''}>${esc(languageLabel(code))}${locale.fallback === code ? ' · 默认' : ''}${locale.required === code ? ' · 当前发行必填' : ''}</option>`).join('')}</select></label>`;

    const assetSections = locale => ['icon', 'landscape', 'portrait', 'screenshots', 'trailer', 'gameplay'].map(key => {
      const resolved = locale.assets(key);
      return `${resolved.fallback ? `<p class="pgr-asset-fallback" data-game-review-asset-fallback="${esc(key)}">当前语种未上传${esc(labelFiles[key])}，展示默认${esc(languageLabel(locale.fallback))}素材。</p>` : ''}${renderFiles(key, resolved.value)}`;
    }).join('');

    const renderGameDetails = (row, draft) => {
      if (global.PublisherGameReviewStore.isV25(draft)) {
        const locale = v25Locale(row, draft);
        const profile = locale.profile;
        return `${localePicker(locale)}<div class="pgr-subsection"><h3>基础信息</h3><dl class="pgr-fields">${field('后台项目名称', row.summary.projectName, true, { emphasis: true })}${field('商店游戏名称', profile.gameNames?.[locale.current], true)}${field('一句话介绍', locale.content.tagline, true)}${field('完整介绍', locale.content.description, true)}${field('开发者的话', locale.content.developerWords, true)}${field('资料语种', locale.locales.map(languageLabel).join('、'), true)}${field('游戏类型', list(profile.genres).join('、'))}${field('支持平台', list(profile.platforms).join('、'))}${field('主体关系', relationshipText[profile.relationship] || profile.relationship)}${field('开发商', profile.developerName)}${field('官网', profile.website)}${field('玩家群', [profile.playerGroupName, profile.playerGroupNumber].filter(Boolean).join(' / '))}</dl></div><div class="pgr-subsection"><h3>游戏素材</h3>${assetSections(locale)}</div>`;
      }
      const locale = legacyLocale(draft);
      return `<div class="pgr-legacy-note">历史 V2.4 提交：按提交时原字段只读展示，不补写 V2.5 结构。</div>${localePicker(locale)}<dl class="pgr-fields">${field('后台项目名称', row.summary.projectName, true, { emphasis: true })}${field('商店游戏名称', locale.name, true)}${field('一句话介绍', locale.content.tagline, true)}${field('完整介绍', locale.content.description, true)}${field('开发者的话', locale.content.developerWords, true)}${field('游戏类型', list(draft.genres).join('、'))}${field('支持平台', list(draft.platforms).join('、'))}${field('主体关系', relationshipText[draft.relationship] || draft.relationship)}${field('开发商', draft.developerName)}</dl><div class="pgr-subsection"><h3>游戏素材</h3>${assetSections(locale)}</div>`;
    };

    const skuPrice = (sku, currency) => {
      if (sku.pricingModel === 'free') return '免费';
      if (sku.pricingModel !== 'paid') return '未配置';
      const base = `${currency} ${global.PublisherGameReviewStore.validPrice(sku.listPrice) ? Number(sku.listPrice).toFixed(2) : sku.listPrice || '未填写'}`;
      return present(sku.discountPrice) ? `${base} → ${currency} ${global.PublisherGameReviewStore.validPrice(sku.discountPrice) ? Number(sku.discountPrice).toFixed(2) : sku.discountPrice}` : base;
    };

    const renderCatalog = draft => {
      const rows = global.PublisherGameReviewStore.skuRows(draft);
      const currency = global.PublisherGameReviewStore.releaseMode(draft) === 'domestic' ? 'CNY' : 'USD';
      if (!rows.length) return '<p class="pgr-muted">历史提交未记录收费设置。</p>';
      return `<div class="pgr-sku-list" data-game-review-pricing>${rows.map((sku, index) => `<article class="pgr-sku" data-game-review-sku="${esc(sku.skuId || index)}"><header><span>${index === 0 ? '基础游戏' : 'DLC'}</span><strong>${esc(sku.title || sku.skuId || `DLC ${index}`)}</strong><small>${esc(sku.skuId || '—')}</small></header><dl class="pgr-fields">${field('安装内容／包体版本', sku.installContentRef || (sku.legacy ? '历史提交未记录' : ''), true)}${field('收费方式', sku.pricingModel === 'free' ? '免费' : sku.pricingModel === 'paid' ? '收费（单次买断）' : '未配置')}${field('售价／折扣价', skuPrice(sku, currency))}${sku.pricingModel === 'paid' && (sku.discountStartAt || sku.discountEndAt) ? field('折扣期限', `${time(sku.discountStartAt)} 至 ${time(sku.discountEndAt)}`, true) : ''}</dl></article>`).join('')}</div>`;
    };

    const territoryGroups = draft => {
      const codes = global.PublisherGameReviewStore.territoryCodes(draft);
      if (global.PublisherGameReviewStore.releaseMode(draft) === 'domestic') return '<div class="pgr-territory-fixed"><strong>中国大陆</strong><small>国内服固定发行地区</small></div>';
      const component = global.PublisherReleaseRegions;
      const byCode = new Map(list(component?.globalCatalog || component?.catalog).map(item => [item.code, item]));
      const groups = new Map();
      codes.forEach(code => {
        const continent = byCode.get(code)?.continent || 'other';
        if (!groups.has(continent)) groups.set(continent, []);
        groups.get(continent).push(code);
      });
      return `<div class="pgr-territory-groups">${[...groups].map(([continent, values]) => `<section><header><strong>${esc(component?.continentLabel?.(continent, 'zh') || continent)}</strong><span>${values.length}</span></header><div>${values.map(code => `<span data-game-review-territory="${esc(code)}">${esc(component?.territoryLabel?.(code, 'zh') || code)} <small>${esc(code)}</small></span>`).join('')}</div></section>`).join('')}</div>`;
    };

    const renderRelease = (row, draft) => {
      const release = draft.releaseConfig || {};
      const mode = global.PublisherGameReviewStore.releaseMode(draft);
      const legacyScopes = list(draft.releaseRegions);
      const scope = row.isLegacy && legacyScopes.length > 1 ? `${legacyScopes.map(value => value === 'domestic' ? '国内服' : '全球服').join('、')}（历史双范围）` : row.summary.scope;
      const effective = global.PublisherGameReviewStore.isV25(draft)
        ? release.effectiveMode === 'scheduled' ? `定时生效：${time(release.scheduledAt)}` : '审核通过后立即生效'
        : draft.publication?.mode === 'scheduled' ? `定时生效：${time(draft.publication.scheduledAt)}` : '审核通过后立即生效';
      return `<dl class="pgr-fields">${field('发行范围', scope, true, { emphasis: true })}${field('国家／地区摘要', row.summary.territory, true)}${field('发行状态', row.summary.releaseStatus)}${field('生效方式', effective)}${field('提交版本', draft.versionName || draft.version || '—')}${field('发布计划', ({ reservation: '预约', testing: '测试', test: '测试', launch: '准备上线' })[draft.releasePlan] || draft.releasePlan)}</dl><div class="pgr-subsection"><h3>完整地区</h3>${territoryGroups(draft)}</div>${mode === 'domestic' ? `<p class="pgr-release-callout">中国大陆上架需同时核对简体中文资料、CNY 定价、版号和当前引用资质版本。</p>` : '<p class="pgr-release-callout">全球服不含中国大陆，所选国家共用同一发行状态。</p>'}`;
    };

    const renderV25Qualifications = (row, draft) => {
      const versionId = global.PublisherGameReviewStore.qualificationVersionId(row, draft);
      const version = global.PublisherGameReviewStore.qualificationVersion(row, draft);
      if (!version) return `<div class="pgr-qualification-missing"><strong>未引用已通过资质版本</strong><p>上架审核不能通过。</p></div>`;
      const snapshot = version.snapshot || {};
      const authorization = snapshot.authorization || {};
      const domestic = snapshot.domestic || {};
      return `<div class="pgr-version-reference"><span>本次提交引用</span><strong data-game-review-qualification-version>${esc(versionId)}</strong>${badge(version.status === 'active' ? 'approved' : version.status)}</div><dl class="pgr-fields">${field('权利关系', relationshipText[snapshot.rightsRelationship] || snapshot.rightsRelationship)}${field('权利与合规声明', snapshot.rightsDeclarationAccepted ? '已确认' : '未确认')}${field('审核通过时间', time(version.reviewedAt))}${field('资质审核员', version.reviewer)}</dl>${snapshot.rightsRelationship && snapshot.rightsRelationship !== 'self_owned' ? `<div class="pgr-subsection"><h3>发行授权及 IP 权利证明</h3><dl class="pgr-fields">${field('授权方', authorization.grantor)}${field('被授权方', authorization.grantee)}${field('授权类型', authorization.authorizationType)}${field('授权平台', list(authorization.platforms).join('、'))}${field('授权地区', list(authorization.territoryCodes).join('、'), true)}${field('授权期限', `${authorization.startsAt || '—'} 至 ${authorization.endsAt || '—'}`)}${field('商业化范围', authorization.commercializationScope)}${field('转授权范围', authorization.sublicensingScope, true)}</dl>${renderFiles('authorization', authorization.files, { label: '独代授权书及 IP 类授权书', required: true })}</div>` : '<p class="pgr-muted">自研且自有全部权利，本版本通过权利声明审核。</p>'}${global.PublisherGameReviewStore.releaseMode(draft) === 'domestic' ? `<div class="pgr-subsection" data-game-review-domestic-qualification><h3>中国大陆 PC 发行信息</h3><dl class="pgr-fields">${field('游戏版号', domestic.licenseNumber || draft.licenseNumber, true, { emphasis: true })}${field('游戏联网方式', domestic.networkMode === 'online' ? '提供联网游戏服务' : domestic.networkMode === 'offline' ? '离线单机' : '')}${field('软件著作权登记号', domestic.copyrightNumber)}${field('ICP 核准情况', ({ approved: '已核准', not_approved: '暂未核准', not_applicable: '不适用' })[domestic.icpStatus] || domestic.icpStatus)}${field('防沉迷要求', domestic.antiAddictionAcknowledged ? '已知悉' : '未确认')}${field('游戏防沉迷方案', domestic.gameAntiAddiction === 'connected' ? '已接入' : domestic.gameAntiAddiction)}${field('国家防沉迷实名验证系统', domestic.nationalRealName === 'connected' ? '已接入' : domestic.nationalRealName)}</dl>${renderFiles('mainland', domestic.publicationApprovalFiles, { label: '游戏版号证明（选填）' })}${renderFiles('copyright', domestic.copyrightFiles)}${renderFiles('icp', domestic.icpFiles)}${renderFiles('safety', domestic.safetyAssessmentFiles)}</div>` : ''}`;
    };

    const renderLegacyQualifications = draft => {
      const files = draft.qualifications || {};
      return `<div class="pgr-legacy-note">历史 V2.4 快照未包含独立资质版本 ID，以当时附件原文展示。</div><dl class="pgr-fields">${field('游戏版号', draft.licenseNumber || (list(draft.releaseRegions).includes('domestic') ? '缺少' : '全球服不适用'), true)}${draft.compliance ? field('游戏联网方式', draft.compliance.networkMode === 'online' ? '提供联网游戏服务' : draft.compliance.networkMode === 'offline' ? '离线单机' : '') : ''}</dl>${['rights', 'authorization', 'copyright', 'mainland', 'icp', 'safety'].filter(key => files[key]).map(key => renderFiles(key, files[key])).join('') || '<p class="pgr-muted">历史提交未记录资质附件。</p>'}`;
    };

    const renderAudit = (row, issues) => {
      const canReview = row.status === 'reviewing';
      const result = row.reviewResult ? `<div class="pgr-result pgr-result--${esc(row.reviewResult.decision)}" data-game-review-result><strong>${esc(statusText[row.reviewResult.decision])}</strong><p>${row.reviewResult.decision === 'approved' ? '上架快照审核通过。' : row.reviewResult.decision === 'withdrawn' ? '开发者已撤销本次上架审核，原快照只读保留。' : esc(row.reviewResult.reason)}</p><small>${esc(row.reviewResult.reviewer || '—')} · ${esc(time(row.reviewResult.reviewedAt))}</small></div>` : '';
      return `${result}<ol class="pgr-timeline"><li><strong>开发者提交上架审核</strong><span>${esc(time(row.submittedAt))}</span><small>${esc(row.id)} · ${esc(row.submitter || '当前开发者')}</small></li>${row.reviewResult ? `<li><strong>${esc(statusText[row.reviewResult.decision])}</strong><span>${esc(time(row.reviewResult.reviewedAt))}</span><small>${esc(row.reviewResult.reviewer || '—')}</small>${row.reviewResult.reason ? `<p>${esc(row.reviewResult.reason)}</p>` : ''}</li>` : '<li><strong>等待平台审核</strong><span>提交快照已锁定</span></li>'}</ol>${canReview ? `${issues.length ? `<div class="pgr-issues" data-game-review-issues><strong>系统校验发现 ${issues.length} 项问题</strong><ul>${issues.map(issue => `<li>${esc(issue)}</li>`).join('')}</ul></div>` : '<p class="pgr-review-ready">结构化快照校验已通过，请完成人工核对。</p>'}<label class="pgr-reason">驳回原因 <span>驳回时必填</span><textarea data-game-review-reason maxlength="2000" rows="5" placeholder="说明需修改的模块、字段和原因">${esc(state.reason)}</textarea></label><div class="pgr-actions"><button type="button" class="pgr-button pgr-button--danger" data-game-review-decision="rejected"${state.busy ? ' disabled' : ''}>${state.busy ? '处理中…' : '驳回'}</button><button type="button" class="pgr-button pgr-button--primary" data-game-review-decision="approved"${state.busy || issues.length ? ' disabled' : ''}>通过审核</button></div>` : row.status === 'unavailable' ? '<p class="pgr-muted">此历史快照不是当前待审版本，不能执行审核。</p>' : ''}<p class="pgr-error" data-game-review-error role="alert">${esc(state.error)}</p>`;
    };

    const detail = row => {
      const draft = row.draft || {};
      const issues = global.PublisherGameReviewStore.approvalIssues(draft, row);
      return `<article class="publisher-game-review pgr-detail" data-game-review data-game-review-detail="${esc(row.id)}"><header class="pgr-detail-header"><div><button type="button" class="pgr-back" data-game-review-back>← 返回游戏发布审核</button><h1>${esc(row.summary.projectName)}</h1><p>${row.summary.storeName ? `${esc(row.summary.storeName)} · ` : ''}${esc(row.id)} · 提交于 ${esc(time(row.submittedAt))}</p></div><div class="pgr-detail-header__status">${row.isLegacy ? '<span class="pgr-version-badge">V2.4 历史快照</span>' : '<span class="pgr-version-badge">V2.5</span>'}${badge(row.status)}</div></header><div class="pgr-detail-sections">${panel('profile', '游戏资料', renderGameDetails(row, draft), '后台项目名仅用于管理；商店名称、介绍和素材按同一语种查看。')}${panel('catalog', '商品与 SKU', renderCatalog(draft), '基础游戏与每个 DLC 分别核对安装内容、售价和折扣期限。')}${panel('release', '发行设置', renderRelease(row, draft), '发行范围、国家／地区、发行状态和生效时间来自本次提交快照。')}${panel('qualifications', '资质版本', row.isLegacy ? renderLegacyQualifications(draft) : renderV25Qualifications(row, draft), '上架提交只引用已审核通过的资质版本，后续修改不会改变此快照。')}${panel('audit', '审核记录', renderAudit(row, issues), '审核与开发者撤销只允许首个终态成功。')}</div><p class="pgr-local-note">本地演示 · 不会向真实平台发送审核结果或通知。</p></article>`;
    };

    const matchesRegion = row => !state.region || global.PublisherGameReviewStore.releaseMode(row.draft) === state.region || row.isLegacy && list(row.draft?.releaseRegions).includes(state.region);
    const filteredRows = () => {
      const keyword = state.keyword.trim().toLocaleLowerCase();
      return state.rows.filter(row => (!state.status || row.status === state.status || state.status === 'reviewed' && ['approved', 'rejected'].includes(row.status)) && matchesRegion(row) && (!keyword || `${row.summary.projectName} ${row.summary.storeName} ${row.id} ${row.game?.vendorName || ''}`.toLocaleLowerCase().includes(keyword)));
    };

    const listView = () => {
      const rows = filteredRows();
      const filters = (values, selected) => values.map(([value, label]) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`).join('');
      return `<section class="publisher-game-review" data-game-review><header class="operations-review__header pgr-list-header"><div><div class="page-eyebrow">DISTRIBUTION PLATFORM</div><h1>游戏发布审核</h1><p>审核开发者提交的上架快照，并区分全球服与中国大陆的地区、价格和资质要求。</p></div><span class="pgr-tag pgr-tag--reviewing">${state.rows.filter(row => row.status === 'reviewing').length} 项待审核</span></header><section class="pgr-filter"><label>项目／商店名／提交编号<input type="search" data-game-review-keyword value="${esc(state.keyword)}" placeholder="输入关键词"></label><label>审核状态<select data-game-review-status>${filters([['', '全部状态'], ['reviewing', '待审核'], ['reviewed', '已审核'], ['approved', '已通过'], ['rejected', '已驳回'], ['withdrawn', '已撤销']], state.status)}</select></label><label>发行范围<select data-game-review-region>${filters([['', '全部范围'], ['global', '全球服（不含中国大陆）'], ['domestic', '中国大陆']], state.region)}</select></label><button type="button" class="pgr-button" data-game-review-reset>重置</button><button type="button" class="pgr-button pgr-button--primary" data-game-review-search>查询</button><button type="button" class="pgr-button" data-game-review-refresh>刷新队列</button></section><p class="pgr-error" role="alert">${esc(state.error)}</p><section class="operations-table-card pgr-list-card"><header><div><h2>上架审核申请</h2><p>每次提交保留独立快照、资质版本和审核结果。</p></div><span>共 ${rows.length} 条</span></header><div class="operations-table-wrap pgr-table-wrap"><table data-game-review-table><thead><tr><th>游戏名称</th><th>提交编号</th><th>发行范围</th><th>国家／地区摘要</th><th>发行状态</th><th>基础游戏／DLC 价格摘要</th><th>提交时间</th><th>审核状态</th><th>操作</th></tr></thead><tbody>${rows.map(row => `<tr data-game-review-row="${esc(row.id)}"><td data-label="游戏名称"><strong>${esc(row.summary.projectName)}</strong><small>${esc(row.summary.storeName || '商店名称未记录')}</small>${row.isLegacy ? '<em>V2.4</em>' : ''}</td><td data-label="提交编号"><code>${esc(row.id)}</code></td><td data-label="发行范围">${esc(row.summary.scope)}</td><td data-label="地区摘要">${esc(row.summary.territory)}</td><td data-label="发行状态">${esc(row.summary.releaseStatus)}</td><td data-label="价格摘要" class="pgr-price-summary">${esc(row.summary.price)}</td><td data-label="提交时间">${esc(time(row.submittedAt))}</td><td data-label="审核状态">${badge(row.status)}</td><td data-label="操作"><button type="button" class="pgr-link" data-game-review-open="${esc(row.id)}">查看详情</button></td></tr>`).join('')}</tbody></table>${rows.length ? '' : `<div class="pgr-empty"><strong>${state.loading ? '正在读取提交…' : state.rows.length ? '没有匹配的申请' : '暂无游戏发布申请'}</strong><p>${state.rows.length ? '请调整筛选条件。' : '开发者在 02 提交上架审核后，申请会显示在这里。'}</p></div>`}</div></section><p class="pgr-local-note">本地演示 · 队列只展示当前浏览器保存的真实提交。</p></section>`;
    };

    const captureScroll = () => {
      const values = [];
      for (let node = host; node; node = node.parentElement) values.push([node, node.scrollTop, node.scrollLeft]);
      return { pageX: global.scrollX, pageY: global.scrollY, values };
    };
    const restoreScroll = snapshot => {
      snapshot.values.forEach(([node, top, left]) => {
        node.scrollTop = top;
        node.scrollLeft = left;
      });
      global.scrollTo(snapshot.pageX, snapshot.pageY);
    };

    const render = () => {
      if (signal.aborted || !host.isConnected) { revoke(); return; }
      const scroll = captureScroll();
      const row = state.rows.find(item => item.id === state.selectedId);
      host.innerHTML = row ? detail(row) : listView();
      bind();
      restoreScroll(scroll);
    };

    const search = () => {
      state.keyword = host.querySelector('[data-game-review-keyword]')?.value || '';
      state.status = host.querySelector('[data-game-review-status]')?.value || '';
      state.region = host.querySelector('[data-game-review-region]')?.value || '';
      render();
    };

    const bind = () => {
      host.querySelectorAll('[data-game-review-open]').forEach(button => button.addEventListener('click', () => {
        state.selectedId = button.dataset.gameReviewOpen;
        state.reason = '';
        state.error = '';
        state.storeLanguage = '';
        render();
      }, { signal }));
      host.querySelector('[data-game-review-back]')?.addEventListener('click', () => { state.selectedId = ''; state.error = ''; state.reason = ''; render(); }, { signal });
      host.querySelector('[data-game-review-store-language]')?.addEventListener('change', event => { state.storeLanguage = event.target.value; render(); }, { signal });
      host.querySelector('[data-game-review-search]')?.addEventListener('click', search, { signal });
      host.querySelector('[data-game-review-keyword]')?.addEventListener('keydown', event => { if (event.key === 'Enter') search(); }, { signal });
      ['status', 'region'].forEach(key => host.querySelector(`[data-game-review-${key}]`)?.addEventListener('change', search, { signal }));
      host.querySelector('[data-game-review-reset]')?.addEventListener('click', () => { state.keyword = ''; state.status = ''; state.region = ''; render(); }, { signal });
      host.querySelector('[data-game-review-refresh]')?.addEventListener('click', () => { state.error = ''; refresh(); }, { signal });
      host.querySelector('[data-game-review-reason]')?.addEventListener('input', event => { state.reason = event.target.value; }, { signal });
      host.querySelectorAll('[data-game-review-decision]').forEach(button => button.addEventListener('click', async () => {
        if (state.busy) return;
        const row = state.rows.find(item => item.id === state.selectedId);
        if (!row) return;
        const decision = button.dataset.gameReviewDecision;
        const reason = String(state.reason || '').trim();
        if (decision === 'rejected' && !reason) {
          state.error = errorText(new Error('reason-required'));
          render();
          host.querySelector('[data-game-review-reason]')?.focus({ preventScroll: true });
          return;
        }
        if (reason.length > 2000) {
          state.error = errorText(new Error('reason-too-long'));
          render();
          host.querySelector('[data-game-review-reason]')?.focus({ preventScroll: true });
          return;
        }
        state.busy = true;
        state.error = '';
        render();
        try {
          await global.PublisherGameReviewStore.decide({ submissionId: row.id, decision, reason, reviewer });
          state.reason = '';
        } catch (error) {
          state.error = errorText(error);
        }
        state.busy = false;
        await refresh();
      }, { signal }));
    };

    async function refresh() {
      try {
        state.rows = await global.PublisherGameReviewStore.loadQueue();
        state.loading = false;
      } catch {
        state.error = '无法读取本地提交记录，请检查浏览器存储后重试。';
        state.loading = false;
      }
      render();
    }

    const refreshOnExternalChange = () => { if (!state.busy) refresh(); };
    global.addEventListener('focus', refreshOnExternalChange, { signal });
    try {
      const channel = new BroadcastChannel('gamehub-publisher-review');
      channel.onmessage = refreshOnExternalChange;
      signal.addEventListener('abort', () => channel.close(), { once: true });
    } catch { /* 手动刷新仍可读取最新状态。 */ }
    render();
    await refresh();
  }

  global.PublisherGameReview = { mount, dispose: () => activeController?.abort(), statusText };
})(window);
