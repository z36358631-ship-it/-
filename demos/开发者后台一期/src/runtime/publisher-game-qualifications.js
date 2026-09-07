/* 01/02 共用 PC 发行资质规则。新资质独立审核，历史上架快照不追补字段。 */
(function (global) {
  'use strict';

  const TYPE = 'release_rights';
  const RELATIONSHIPS = ['self_owned', 'agent', 'co_publish', 'third_party_ip'];
  const IMAGE_TYPES = ['image/png', 'image/jpeg'];
  const labels = {
    networkMode: ['游戏联网方式', 'Game connectivity'], offline: ['离线单机', 'Offline single-player'], online: ['提供联网游戏服务', 'Online game services'],
    networkHint: ['国内服按是否提供网络游戏服务选择，供判断实名与防沉迷是否适用；不单凭更新下载等联网功能判断。', 'For domestic releases, declare whether the game provides online game services to determine real-name and anti-addiction requirements. Downloads or updates alone do not determine this.'],
    copyrightNumber: ['软件著作权登记号', 'Software copyright registration number'], copyrightHint: ['选填；填写登记号时请同时上传登记证书，上传证书时请补充登记号。', 'Optional. Provide the registration number and certificate together.'],
    safety: ['安全评估报告（选填）', 'Security assessment report (optional)'], safetyHint: ['按实际服务形态补充，不作为所有 PC 游戏的统一必填项。', 'Provide this where the actual service model requires it. It is not mandatory for every PC game.'],
    mainlandScan: ['游戏版号扫描件（选填）', 'Game publication approval document (optional)'], mainlandScanHint: ['版号号码为国内服提审必填项；证明文件选填，可上传用于审核核对。', 'The approval number is required for domestic review; evidence is optional and may be uploaded for verification.'],
    icp: ['ICP 核准证明', 'ICP approval document'], icpStatus: ['ICP 核准情况', 'ICP approval status'], approved: ['已核准', 'Approved'], not_approved: ['暂未核准', 'Not approved'], not_applicable: ['不适用', 'Not applicable'],
    icpExemptionReason: ['ICP 适用情况说明（选填）', 'ICP applicability notes (optional)'], icpHint: ['根据服务主体及实际互联网服务补充信息，不作为所有 PC 游戏的统一提审必填项。', 'Provide supplementary information based on the service provider and actual internet services. This is not a universal PC game submission requirement.'],
    antiAddictionAcknowledged: ['已知悉网络游戏防沉迷要求', 'I acknowledge the online game anti-addiction requirements'], gameAntiAddiction: ['游戏防沉迷方案', 'In-game anti-addiction controls'], nationalRealName: ['国家防沉迷实名验证系统', 'National real-name verification system'], connected: ['已接入', 'Connected'], not_connected: ['暂未接入', 'Not connected'],
    onlineQualification: ['国内网络游戏服务信息', 'Domestic online game service information'], onlineHint: ['国内网络游戏开放试玩或正式上线前需完成适用的实名与防沉迷接入；离线单机及全球服不套用此门槛。ICP 信息按实际服务选填。', 'Complete applicable real-name and anti-addiction integration before a domestic online demo or release. Offline and global releases are excluded from this gate. ICP information is supplementary.'],
    referenceNotice: ['查看网络游戏防沉迷通知', 'Read the online game anti-addiction notice'], historicalCompliance: ['历史提交未配置本组资质信息，按原提交展示。', 'This historical submission did not include these qualification fields.'],
    networkRequired: ['请选择游戏联网方式。', 'Select the game connectivity.'], copyrightPair: ['请同时填写软件著作权登记号并上传有效登记证书，或将两项同时留空。', 'Provide both the copyright registration number and a valid certificate, or leave both empty.'],
    antiAcknowledgementRequired: ['请确认已知悉网络游戏防沉迷要求。', 'Acknowledge the online game anti-addiction requirements.'], gameAntiRequired: ['国内联网游戏开放试玩或正式上线前，须完成游戏防沉迷方案接入。', 'Connect in-game anti-addiction controls before a domestic online demo or release.'], nationalRealNameRequired: ['国内联网游戏开放试玩或正式上线前，须完成国家防沉迷实名验证系统接入。', 'Connect the national real-name verification system before a domestic online demo or release.'],
    rightsCard: ['发行权属证明', 'Release-rights evidence'], rightsCardHint: ['上传能够证明当前主体拥有本次发行权利的附件。', 'Upload attachments proving that the current company owns the rights required for this release.'], selfOwnedRightsCardHint: ['上传能够证明当前主体拥有本次发行权利的附件；软件著作权可作为其中一种证明，不是海外发行唯一必填材料。', 'Upload attachments proving the current company has the required release rights. A software copyright certificate may be used as evidence, but is not the only mandatory document for overseas release.'],
    globalQualificationCard: ['全球（不含中国大陆）发行资质', 'Global release qualification (excluding mainland China)'], globalQualificationHint: ['适用于中国香港、中国澳门及其他中国大陆以外地区；仅需上传发行权属证明，可一次提交多个附件。', 'Applies to Hong Kong, Macao and other regions outside mainland China. Upload one or more release-rights attachments.'], domesticQualificationCard: ['中国大陆发行资质', 'Mainland China release qualification'], domesticQualificationHint: ['用于中国大陆发行，需提交发行权属证明，并按实际发行与联网情况补充版号等材料。', 'Required for mainland China release. Upload release-rights evidence and provide approval or service materials applicable to the game.'],
    mainlandCard: ['游戏版号', 'Game publication approval'], domesticRightsCard: ['权属或发行授权', 'Ownership or distribution authorization'], copyrightCard: ['软件著作权证明', 'Software copyright evidence'], safetyCard: ['安全评估报告', 'Security assessment report'], antiAddictionCard: ['实名与防沉迷', 'Real-name and anti-addiction'],
    self_owned: ['自研且自有全部权利', 'Self-developed and fully owned'], agent: ['代理发行', 'Publishing agent'], co_publish: ['联合发行', 'Joint publishing'], third_party_ip: ['使用第三方 IP', 'Third-party IP'],
    notSubmitted: ['未提交', 'Not submitted'], reviewing: ['审核中', 'In review'], supplement_required: ['需补充材料', 'Supplement required'], rejected: ['已驳回', 'Rejected'], withdrawn: ['已撤销', 'Withdrawn'], active: ['已生效', 'Active'], superseded: ['历史版本', 'Previous version'], legacy_unknown: ['历史资料，状态未知', 'Legacy material, status unknown'],
    upload: ['上传', 'Upload'], fillDeclaration: ['填写声明', 'Complete declaration'], fillLicense: ['填写版号', 'Enter approval number'], view: ['查看', 'View'], modify: ['修改', 'Modify'], optional: ['选填', 'Optional'], required: ['必填', 'Required'], conditional: ['按条件', 'Conditional'], licenseNumberRequiredFileOptional: ['版号号码必填／证明文件选填', 'Approval number required / evidence optional'],
    declarationRequired: ['请确认权利及合规声明。', 'Accept the rights and compliance declaration.'], relationshipRequired: ['请选择与游戏的权利关系。', 'Select the rights relationship.'], rightsFilesRequired: ['请上传 1–10 张 JPG/PNG 权属证明附件。', 'Upload 1–10 JPG/PNG images proving ownership.'], rightsFilesInvalid: ['权属证明仅支持 JPG/PNG，最多 10 张。', 'Ownership evidence must contain no more than 10 JPG/PNG images.'], authorizationFilesRequired: ['请上传 1–10 张 JPG/PNG 完整授权链。', 'Upload 1–10 JPG/PNG images forming the complete authorization chain.'], authorizationFilesInvalid: ['授权材料仅支持 JPG/PNG，最多 10 张。', 'Authorization evidence must contain no more than 10 JPG/PNG images.'], authorizationPartyRequired: ['请补充授权方和被授权方。', 'Provide both grantor and grantee.'], authorizationTypeRequired: ['请选择授权类型。', 'Select an authorization type.'], authorizationPlatformRequired: ['授权平台未完整覆盖本次发行平台。', 'The authorization does not cover every release platform.'], authorizationTerritoryRequired: ['授权地区未完整覆盖本次发行地区。', 'The authorization does not cover every release territory.'], authorizationDateRequired: ['请填写有效的授权起止时间。', 'Provide a valid authorization start and end date.'], authorizationTermRequired: ['授权期限未覆盖计划生效时间。', 'The authorization term does not cover the planned effective date.'], commercializationRequired: ['请说明商业化授权范围。', 'Describe the commercialization scope.'], sublicensingRequired: ['请说明转授权范围或明确不允许转授权。', 'Describe the sublicensing scope or state that sublicensing is prohibited.'],
    licenseRequired: ['国内服发行必须填写游戏版号。', 'A publication approval number is required for a domestic release.'], publicationFilesInvalid: ['版号扫描件仅支持 JPG/PNG，最多 10 张。', 'Publication approval evidence must contain no more than 10 JPG/PNG images.'], copyrightFilesInvalid: ['软件著作权证书仅支持 JPG/PNG，最多 10 张。', 'Copyright evidence must contain no more than 10 JPG/PNG images.'], icpDocumentRequired: ['已核准时请上传有效 ICP 核准证明。', 'Upload valid evidence of ICP approval.'], icpReasonRequired: ['请填写 ICP 不适用的具体原因，供平台审核确认。', 'Explain why ICP approval does not apply for platform review.'], fileInvalid: ['材料仅支持 JPG/PNG，最多 10 张。', 'Evidence must contain no more than 10 JPG/PNG images.'],
  };

  const text = (lang, key) => labels[key]?.[lang === 'en' ? 1 : 0] || '';
  const clone = value => value == null ? value : structuredClone(value);
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const present = value => Boolean(String(value ?? '').trim());
  const blobLike = blob => blob && typeof blob.size === 'number' && typeof blob.type === 'string';
  const validLegacyFile = file => Boolean(blobLike(file?.blob) && file.blob.size > 0 && (!file.size || file.size === file.blob.size) && ['application/pdf', ...IMAGE_TYPES].includes(file.type || file.blob.type));
  const validImageFile = file => Boolean(blobLike(file?.blob) && file.blob.size > 0 && (!file.size || file.size === file.blob.size) && IMAGE_TYPES.includes(file.type || file.blob.type));
  const validImageFiles = (files, { required = false } = {}) => {
    const values = list(files);
    return (!required || values.length > 0) && values.length <= 10 && values.every(validImageFile);
  };
  const relationship = value => ({ joint: 'co_publish', agency: 'agent' }[value] || value);
  const hasCopyrightProof = draft => validLegacyFile(draft?.qualifications?.copyright) && present(draft?.compliance?.copyrightNumber);

  function createData(old = {}) {
    if (!old.compliance && ['reviewing', 'approved'].includes(old.reviewStatus) && old.submissionId) return null;
    const prior = old.compliance || {};
    return {
      version: 1,
      networkMode: prior.networkMode || '', copyrightNumber: prior.copyrightNumber || '',
      icpStatus: prior.icpStatus || '', icpExemptionReason: prior.icpExemptionReason || '',
      antiAddictionAcknowledged: prior.antiAddictionAcknowledged === true,
      gameAntiAddiction: prior.gameAntiAddiction || '', nationalRealName: prior.nationalRealName || '',
    };
  }

  function legacyRequiredFields(draft) {
    const details = draft.compliance;
    if (!details) return [];
    const domestic = (draft.releaseRegions || []).includes('domestic');
    const onlinePlayable = domestic && details.networkMode === 'online' && ['demo', 'released'].includes(draft.releaseStatus);
    const files = draft.qualifications || {};
    const result = [];
    if (domestic) result.push(['compliance.networkMode', ['offline', 'online'].includes(details.networkMode), 'networkRequired']);
    const hasNumber = present(details.copyrightNumber);
    if (hasNumber || files.copyright) result.push(
      ['compliance.copyrightNumber', hasNumber, 'copyrightPair'],
      ['qualifications.copyright', validLegacyFile(files.copyright), 'copyrightPair'],
    );
    if (onlinePlayable) result.push(
      ['compliance.antiAddictionAcknowledged', details.antiAddictionAcknowledged === true, 'antiAcknowledgementRequired'],
      ['compliance.gameAntiAddiction', details.gameAntiAddiction === 'connected', 'gameAntiRequired'],
      ['compliance.nationalRealName', details.nationalRealName === 'connected', 'nationalRealNameRequired'],
    );
    return result;
  }

  function contextFor(value = {}, options = {}) {
    const source = value.draft || value;
    const release = source.releaseConfig || {};
    const legacyRegions = Array.isArray(source.releaseRegions) ? source.releaseRegions : [];
    const mode = ['global', 'domestic'].includes(release.mode) ? release.mode : legacyRegions.length === 1 && legacyRegions[0] === 'domestic' ? 'domestic' : 'global';
    const legacyTerritories = list(source.releaseTerritories).map(item => typeof item === 'string' ? item : item?.code).filter(Boolean);
    const territoryCodes = mode === 'domestic' ? ['CN'] : list(release.globalTerritoryCodes).length ? list(release.globalTerritoryCodes) : legacyTerritories.filter(code => code !== 'CN');
    const platforms = list(source.gameProfileDraft?.platforms || source.platforms).filter(Boolean);
    const releaseStatus = release.releaseStatus || source.releaseStatus || 'released';
    const scheduledAt = release.effectiveMode === 'scheduled' ? release.scheduledAt : source.scheduledAt;
    return { mode, territoryCodes, platforms, releaseStatus, effectiveAt: scheduledAt || options.referenceDate || new Date().toISOString() };
  }

  function createApplicationDraft(value = {}) {
    const source = value.applicationDraft || value.draft || value;
    const domestic = source.domestic || {};
    const authorization = source.authorization || {};
    return {
      type: TYPE,
      rightsRelationship: RELATIONSHIPS.includes(relationship(source.rightsRelationship)) ? relationship(source.rightsRelationship) : 'self_owned',
      rightsDeclarationAccepted: source.rightsDeclarationAccepted === true,
      authorization: {
        grantor: authorization.grantor || '', grantee: authorization.grantee || '', authorizationType: authorization.authorizationType || '',
        platforms: list(authorization.platforms), territoryCodes: list(authorization.territoryCodes), startsAt: authorization.startsAt || '', endsAt: authorization.endsAt || '',
        commercializationScope: authorization.commercializationScope || '', sublicensingScope: authorization.sublicensingScope || '', files: list(authorization.files).map(clone),
      },
      domestic: {
        licenseNumber: domestic.licenseNumber || source.licenseNumber || '', publicationApprovalFiles: list(domestic.publicationApprovalFiles).map(clone),
        copyrightNumber: domestic.copyrightNumber || '', copyrightFiles: list(domestic.copyrightFiles).map(clone), networkMode: domestic.networkMode || '',
        icpApplicable: domestic.icpApplicable === true, icpStatus: domestic.icpStatus || '', icpExemptionReason: domestic.icpExemptionReason || '', icpFiles: list(domestic.icpFiles).map(clone),
        safetyAssessmentApplicable: domestic.safetyAssessmentApplicable === true, safetyAssessmentFiles: list(domestic.safetyAssessmentFiles).map(clone),
        antiAddictionAcknowledged: domestic.antiAddictionAcknowledged === true, gameAntiAddiction: domestic.gameAntiAddiction || '', nationalRealName: domestic.nationalRealName || '',
      },
    };
  }

  function createQualificationState(value = {}) {
    const source = value.qualifications && (Object.prototype.hasOwnProperty.call(value.qualifications, 'activeVersion') || value.qualifications.applicationDraft || value.qualifications.draft) ? value.qualifications : value;
    const applicationDraft = createApplicationDraft(source.applicationDraft || source.draft || source);
    return {
      rightsRelationship: RELATIONSHIPS.includes(relationship(source.rightsRelationship)) ? relationship(source.rightsRelationship) : applicationDraft.rightsRelationship,
      rightsDeclarationAccepted: source.rightsDeclarationAccepted === true || applicationDraft.rightsDeclarationAccepted,
      draft: applicationDraft, activeVersion: clone(source.activeVersion || null), pendingApplication: clone(source.pendingApplication || null), history: list(source.history).map(clone),
    };
  }

  const day = value => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).setUTCHours(0, 0, 0, 0) : NaN;
  };

  function authorizationIssues(authorization = {}, context = {}) {
    const issues = {};
    if (!present(authorization.grantor) || !present(authorization.grantee)) issues['authorization.parties'] = 'authorizationPartyRequired';
    if (!present(authorization.authorizationType)) issues['authorization.authorizationType'] = 'authorizationTypeRequired';
    if (!list(context.platforms).every(item => list(authorization.platforms).includes(item))) issues['authorization.platforms'] = 'authorizationPlatformRequired';
    if (!list(context.territoryCodes).every(item => list(authorization.territoryCodes).includes(item))) issues['authorization.territoryCodes'] = 'authorizationTerritoryRequired';
    const startsAt = day(authorization.startsAt);
    const endsAt = day(authorization.endsAt);
    const effectiveAt = day(context.effectiveAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt > endsAt) issues['authorization.term'] = 'authorizationDateRequired';
    else if (Number.isFinite(effectiveAt) && (startsAt > effectiveAt || endsAt < effectiveAt)) issues['authorization.coverage'] = 'authorizationTermRequired';
    if (!present(authorization.commercializationScope)) issues['authorization.commercializationScope'] = 'commercializationRequired';
    if (!present(authorization.sublicensingScope)) issues['authorization.sublicensingScope'] = 'sublicensingRequired';
    if (!validImageFiles(authorization.files, { required: true })) issues['authorization.files'] = list(authorization.files).length ? 'authorizationFilesInvalid' : 'authorizationFilesRequired';
    return issues;
  }

  function validateApplication(value = {}, contextValue, options = {}) {
    const application = createApplicationDraft(value);
    const context = contextValue?.mode ? contextValue : contextFor(contextValue || value, options);
    const errors = {};
    if (!validImageFiles(application.authorization.files, { required: true })) errors['authorization.files'] = list(application.authorization.files).length ? 'rightsFilesInvalid' : 'rightsFilesRequired';
    if (context.mode === 'domestic') {
      const domestic = application.domestic;
      if (!present(domestic.licenseNumber)) errors['domestic.licenseNumber'] = 'licenseRequired';
      if (!['offline', 'online'].includes(domestic.networkMode)) errors['domestic.networkMode'] = 'networkRequired';
      if (list(domestic.publicationApprovalFiles).length && !validImageFiles(domestic.publicationApprovalFiles)) errors['domestic.publicationApprovalFiles'] = 'publicationFilesInvalid';
      const hasCopyrightNumber = present(domestic.copyrightNumber);
      const hasCopyrightFiles = list(domestic.copyrightFiles).length > 0;
      if ((hasCopyrightNumber || hasCopyrightFiles) && (!hasCopyrightNumber || !validImageFiles(domestic.copyrightFiles, { required: true }))) {
        if (!hasCopyrightNumber) errors['domestic.copyrightNumber'] = 'copyrightPair';
        if (!validImageFiles(domestic.copyrightFiles, { required: true })) errors['domestic.copyrightFiles'] = hasCopyrightFiles ? 'copyrightFilesInvalid' : 'copyrightPair';
      }
      if (list(domestic.icpFiles).length && !validImageFiles(domestic.icpFiles)) errors['domestic.icpFiles'] = 'fileInvalid';
      if (domestic.icpStatus === 'approved' && !validImageFiles(domestic.icpFiles, { required: true })) errors['domestic.icpFiles'] = 'icpDocumentRequired';
      if (domestic.icpStatus === 'not_applicable' && !present(domestic.icpExemptionReason)) errors['domestic.icpExemptionReason'] = 'icpReasonRequired';
      if (list(domestic.safetyAssessmentFiles).length && !validImageFiles(domestic.safetyAssessmentFiles)) errors['domestic.safetyAssessmentFiles'] = 'fileInvalid';
      const onlinePlayable = domestic.networkMode === 'online' && ['demo', 'released'].includes(context.releaseStatus);
      if (onlinePlayable) {
        if (!domestic.antiAddictionAcknowledged) errors['domestic.antiAddictionAcknowledged'] = 'antiAcknowledgementRequired';
        if (domestic.gameAntiAddiction !== 'connected') errors['domestic.gameAntiAddiction'] = 'gameAntiRequired';
        if (domestic.nationalRealName !== 'connected') errors['domestic.nationalRealName'] = 'nationalRealNameRequired';
      }
    }
    return errors;
  }

  function requiredFields(value, contextValue, options) {
    if (value?.submissionId && !value?.compliance && !value?.applicationDraft && !value?.authorization && !value?.domestic) return [];
    if (!value?.applicationDraft && !value?.authorization && !value?.domestic && value?.compliance) return legacyRequiredFields(value);
    const errors = validateApplication(value, contextValue, options);
    return Object.entries(errors).map(([key, code]) => [key, false, code]);
  }
  const validate = (value, contextValue, options) => Object.fromEntries(requiredFields(value, contextValue, options).filter(([, valid]) => !valid).map(([key, , code]) => [key, code]));

  function lifecycleStatus(stateValue = {}) {
    const state = createQualificationState(stateValue);
    if (state.pendingApplication) return state.pendingApplication.status || 'reviewing';
    if (state.activeVersion) return 'active';
    return 'notSubmitted';
  }

  function cardsFor(contextValue = {}, stateValue = {}) {
    const context = contextValue.mode ? contextValue : contextFor(contextValue);
    const state = createQualificationState(stateValue);
    const draft = state.draft;
    const status = lifecycleStatus(state);
    const lifecycleAction = state.pendingApplication?.status === 'reviewing' ? 'view' : state.pendingApplication?.status === 'supplement_required' || state.activeVersion ? 'modify' : 'upload';
    const card = (key, nameKey, descriptionKey, requirement, files = [], kind = 'upload', initialAction = 'upload') => ({ key, name: nameKey, description: descriptionKey, requirement, files: list(files), kind, status, action: lifecycleAction === 'upload' ? initialAction : lifecycleAction });
    const global = context.mode === 'global';
    return [card('rights', global ? 'globalQualificationCard' : 'domesticQualificationCard', global ? 'globalQualificationHint' : 'domesticQualificationHint', 'required', draft.authorization.files, 'upload', 'upload')];
  }

  function approvedVersionFor(stateValue = {}, contextValue) {
    const state = createQualificationState(stateValue);
    const active = state.activeVersion;
    if (!active || !active.id || active.status && active.status !== 'approved' && active.status !== 'active') return null;
    if (active.snapshot && Object.keys(validateApplication(active.snapshot, contextValue)).length) return null;
    return clone(active);
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function renderCards(contextValue, stateValue, lang = 'zh') {
    return `<div class="pgp-qualification-grid" data-qualification-cards>${cardsFor(contextValue, stateValue).map(card => {
      const statusLabel = text(lang, card.status);
      const actionLabel = text(lang, card.action);
      return `<article class="pgp-asset pgp-qualification-card" data-qualification-card="${esc(card.key)}"><div class="pgp-asset-placeholder" aria-hidden="true">◇</div><div class="pgp-asset-info"><strong>${esc(text(lang, card.name))}</strong><small>${esc(text(lang, card.requirement))} · ${esc(statusLabel)}</small><p class="pgp-hint">${esc(text(lang, card.description))}</p>${card.files.length ? `<p class="pgp-hint" data-qualification-file-count="${card.key}">${card.files.length} ${lang === 'en' ? 'file(s)' : '个文件'}</p>` : ''}</div><div class="pgp-asset-actions"><button type="button" data-qualification-card-action="${esc(card.key)}" data-qualification-action="${esc(card.action)}">${esc(actionLabel)}</button>${card.kind === 'upload' && card.action !== 'view' ? `<input type="file" hidden multiple accept="image/png,image/jpeg" data-qualification-upload="${esc(card.key)}" aria-label="${esc(actionLabel)} ${esc(text(lang, card.name))}">` : ''}</div></article>`;
    }).join('')}</div>`;
  }

  function bindCards(root, handlers = {}) {
    const controller = new AbortController();
    const signal = controller.signal;
    root.querySelectorAll('[data-qualification-card-action]').forEach(button => button.addEventListener('click', async () => {
      const key = button.dataset.qualificationCardAction;
      const action = button.dataset.qualificationAction;
      if (action === 'view') { await handlers.onView?.(key); return; }
      const proceed = await handlers.onEdit?.(key, action);
      if (proceed === false) return;
      root.querySelector(`[data-qualification-upload="${CSS.escape(key)}"]`)?.click();
    }, { signal }));
    root.querySelectorAll('[data-qualification-upload]').forEach(input => input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!validImageFiles(files.map(file => ({ blob: file, size: file.size, type: file.type })), { required: true })) await handlers.onError?.('authorizationFilesInvalid', input.dataset.qualificationUpload);
      else await handlers.onFiles?.(input.dataset.qualificationUpload, files);
      input.value = '';
    }, { signal }));
    return () => controller.abort();
  }

  global.PublisherGameQualifications = {
    TYPE, RELATIONSHIPS, IMAGE_TYPES, createData, createApplicationDraft, createQualificationState, contextFor,
    requiredFields, validate, validateApplication, authorizationIssues, validFile: validImageFile, validImageFile, validImageFiles, hasCopyrightProof,
    cardsFor, renderCards, bindCards, lifecycleStatus, approvedVersionFor, text,
    referenceUrl: 'https://www.taptap.cn/moment/181742963355815529',
  };
})(window);
