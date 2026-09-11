/* 厂商设置：企业认证通过后管理三类生效资料，修改按页签独立审核。 */
(function registerPublisherVendorSettings(scope) {
  'use strict';

  const groupKeys = ['subject', 'profile', 'finance'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const emptyReview = () => ({
    applicationId:'', status:'idle', pendingData:null, draftData:null, submittedData:null,
    effectiveData:null, changedFields:[], submittedAt:'', reviewedAt:'', rejectReason:'',
  });
  const createReviews = () => Object.fromEntries(groupKeys.map(key => [key, emptyReview()]));
  const normalizeReviews = reviews => {
    const defaults = createReviews();
    return Object.fromEntries(groupKeys.map((key, index) => {
      const merged = { ...defaults[key], ...(reviews?.[key] || {}) };
      if (!['idle', 'pending', 'approved', 'rejected'].includes(merged.status)) merged.status = 'idle';
      if (merged.status !== 'idle' && !merged.applicationId) merged.applicationId = `CHG-20260904-${String(index + 1).padStart(3, '0')}`;
      if (!merged.submittedData && merged.pendingData) merged.submittedData = clone(merged.pendingData);
      return [key, merged];
    }));
  };
  const nextApplicationId = (reviews, nowText = '') => {
    const date = String(nowText || '2026-09-11').slice(0, 10).replaceAll('/', '').replaceAll('-', '');
    const prefix = `CHG-${date}-`;
    const latest = Object.values(reviews || {}).reduce((max, review) => {
      const id = String(review?.applicationId || '');
      return id.startsWith(prefix) ? Math.max(max, Number(id.slice(prefix.length)) || 0) : max;
    }, 0);
    return `${prefix}${String(latest + 1).padStart(3, '0')}`;
  };

  const text = (zh, en, language) => language === 'en' ? en : zh;
  const groupsFor = language => ({
    subject: {
      label:text('企业主体信息','Company information',language),
      fields:[
        { key:'subjectType', label:text('主体类型','Entity type',language), type:'select', options:['公司／企业'], required:true },
        { key:'region', label:text('注册地区','Registration region',language), type:'select', options:language === 'en' ? [
          { label:'Mainland China', value:'中国大陆' }, { label:'Hong Kong, China', value:'中国香港' },
          { label:'Macao, China', value:'中国澳门' }, { label:'United States', value:'美国' },
          { label:'Singapore', value:'新加坡' }, { label:'Other country or region', value:'其他国家或地区' },
        ] : ['中国大陆','中国香港','中国澳门','美国','新加坡','其他国家或地区'], required:true },
        { key:'province', label:text('省／自治区／直辖市','Province / municipality',language), required:true, mainlandOnly:true },
        { key:'city', label:text('市／地区','City / prefecture',language), required:true, mainlandOnly:true },
        { key:'district', label:text('区／县','District / county',language), required:true, mainlandOnly:true },
        { key:'legalName', label:text('企业法定名称','Legal company name',language), required:true, hint:text('需与企业登记证明完全一致','Must match the registration certificate',language) },
        { key:'legalEnglishName', label:text('企业英文名称','Legal name in English',language), hint:text('选填','Optional',language) },
        { key:'registrationNumber', label:text('企业登记编号／统一社会信用代码','Company registration number',language), required:true },
        { key:'registeredAddress', label:text('企业注册地址','Registered address',language), type:'textarea', required:true, wide:true },
        { key:'mailingAddress', label:text('通信地址','Mailing address',language), type:'textarea', hint:text('选填，与注册地址不同时填写','Optional when different from the registered address',language), wide:true },
        { key:'businessLicenseName', label:text('企业登记证明附件','Company registration proof',language), type:'file', required:true, wide:true },
      ],
    },
    profile: {
      label:text('厂商资料','Publisher profile',language),
      fields:[
        { key:'vendorName', label:text('厂商品牌名称','Publisher brand name',language), required:true },
        { key:'vendorEnglishName', label:text('厂商英文名称','Publisher name in English',language), hint:text('选填','Optional',language) },
        { key:'vendorIntro', label:text('厂商简介','Publisher profile',language), type:'textarea', required:true, hint:text('用于介绍厂商及游戏发行业务','Introduce the studio and publishing business',language), wide:true },
        { key:'contactName', label:text('业务联系人','Business contact',language), required:true },
        { key:'email', label:text('联系邮箱','Contact email',language), type:'email', required:true, hint:text('用于接收重要业务通知','Receives important business notices',language) },
        { key:'mobile', label:text('联系电话','Mobile',language), hint:text('选填','Optional',language) },
      ],
    },
    finance: {
      label:text('财务信息','Financial information',language),
      fields:[
        { key:'bankAccountName', label:text('银行账户户名','Account holder name',language), required:true, hint:text('必须与企业法定名称一致','Must match the legal company name',language) },
        { key:'bankName', label:text('开户银行','Bank name',language), required:true },
        { key:'bankAccountNumber', label:text('银行账号','Bank account number',language), required:true },
        { key:'bankBranch', label:text('开户支行／联行信息','Branch / routing information',language), required:true },
        { key:'bankProofName', label:text('银行账户证明附件','Bank account proof',language), type:'file', required:true, wide:true },
      ],
    },
  });

  const render = ({ language = 'zh', access = {}, qualification = {}, registration = {} } = {}) => {
    const portal = window.GameHubDeveloperPortal;
    const c = portal.components;
    const e = c.escapeHtml;
    const icon = name => portal.icons.render(name);
    const isEnglish = language === 'en';
    const title = isEnglish ? 'Company settings' : '厂商设置';
    const pageTitle = `<header class="publisher-vendor-title"><h1>${title}</h1></header>`;

    if (!access.canManageVendor && !access.isPublisherReadOnly) {
      const status = access.qualificationStatus || 'unsubmitted';
      const actionLabel = status === 'rejected'
        ? text('修改认证资料','Update verification',language)
        : status === 'pending'
          ? text('查看进度','View progress',language)
          : text('申请开发者认证','Apply for verification',language);
      const progress = status === 'pending' ? `<div class="qualification-pending-note publisher-vendor-progress" data-publisher-verification-progress>${icon('info')}<div><strong>${text('审核进行中','Verification in progress',language)}</strong><p>${text('已于 2026-09-02 提交，预计于 2026-09-09 前完成审核（5 个工作日）。','Submitted on Sep 2, 2026. Review is expected by Sep 9, 2026 (5 business days).',language)}</p></div>${c.button({ label:actionLabel, variant:'secondary', action:'publisher-enterprise-verification', size:'small' })}</div>` : '';
      const action = status === 'pending' ? '' : c.button({ label:actionLabel, variant:'primary', action:'publisher-enterprise-verification' });
      return `<section class="publisher-vendor-settings" data-publisher-page="vendor" data-publisher-vendor-restriction="${e(status)}">${pageTitle}${progress}<div class="publisher-empty-state publisher-vendor-placeholder">${icon('vendor')}<strong>${text('提交申请前，请先完成开发者认证','Complete developer verification before submitting an application',language)}</strong>${action}</div></section>`;
    }

    const status = access.qualificationStatus || qualification.status || 'approved';
    const suspended = Boolean(access.isPublisherReadOnly);
    const groups = groupsFor(language);
    const activeTab = groupKeys.includes(registration.vendorSettingsTab) ? registration.vendorSettingsTab : 'subject';
    const reviews = normalizeReviews(registration.vendorReviews);
    const effectiveData = qualification.form || {};

    const renderField = ({ field, value, effectiveValue, editable, pending, mainlandSelected }) => {
      const originalValue = String(effectiveValue ?? '');
      const currentValue = String(value ?? '');
      const fieldEditable = editable && (!field.mainlandOnly || mainlandSelected);
      const common = `data-vendor-setting-field="${e(field.key)}" data-original-value="${e(originalValue)}"${field.mainlandOnly ? ' data-mainland-region-detail' : ''}`;
      const effectiveHint = pending && currentValue !== originalValue
        ? `<small class="vendor-settings-effective-value">${text('当前生效','Currently active',language)}：${e(originalValue || text('未填写','Not provided',language))}</small>`
        : '';
      if (field.type === 'file') {
        return `<label class="field vendor-settings-file${field.wide ? ' is-wide' : ''}"><span class="field-label"><span>${e(field.label)}${field.required ? '<span class="field-required">*</span>' : ''}</span><span class="field-hint">${text('支持 JPG、PNG、WEBP，单张不超过 10 MB','JPG, PNG or WEBP; up to 10 MB',language)}</span></span><span class="vendor-settings-file__box${editable ? '' : ' is-disabled'}"><span data-vendor-setting-field="${e(field.key)}" data-original-value="${e(originalValue)}" data-current-value="${e(currentValue)}">${e(currentValue || text('未上传','No file uploaded',language))}</span>${editable ? `<label class="vendor-settings-file__upload">${text('重新上传','Replace',language)}<input type="file" accept="image/jpeg,image/png,image/webp" data-vendor-settings-file="${e(field.key)}"></label>` : ''}</span>${effectiveHint}</label>`;
      }
      if (field.type === 'textarea') return `${c.textarea({ label:field.label, name:field.key, value:currentValue, required:field.required, hint:field.hint || '', disabled:!fieldEditable, extra:common })}${effectiveHint}`;
      if (field.type === 'select') return `<label class="field"><span class="field-label"><span>${e(field.label)}${field.required ? '<span class="field-required">*</span>' : ''}</span></span><select class="gh-select" name="${e(field.key)}" ${common}${fieldEditable ? '' : ' disabled aria-disabled="true"'}>${field.options.map(option => { const optionValue = typeof option === 'object' ? option.value : option; const optionLabel = typeof option === 'object' ? option.label : option; return `<option value="${e(optionValue)}"${currentValue === optionValue ? ' selected' : ''}>${e(optionLabel)}</option>`; }).join('')}</select>${effectiveHint}</label>`;
      return `${c.input({ label:field.label, name:field.key, type:field.type || 'text', value:currentValue, required:field.required, hint:field.hint || '', disabled:!fieldEditable, extra:common })}${effectiveHint}`;
    };

    const tabs = groupKeys.map(key => {
      const reviewStatus = reviews[key].status || 'idle';
      const dotStatus = ['pending','rejected','approved'].includes(reviewStatus) ? reviewStatus : '';
      return `<button type="button" class="vendor-settings-tab${activeTab === key ? ' is-active' : ''}" data-portal-action="vendor-settings-tab" data-vendor-settings-tab="${e(key)}" role="tab" aria-selected="${activeTab === key}">${e(groups[key].label)}<i class="status-dot${dotStatus ? ` is-${dotStatus}` : ''}"></i></button>`;
    }).join('');

    const panels = groupKeys.map(key => {
      const group = groups[key];
      const review = reviews[key];
      const reviewStatus = review.status || 'idle';
      const candidateData = review.draftData || review.pendingData || {};
      const displayedData = ['pending','rejected'].includes(reviewStatus) || review.draftData ? { ...effectiveData, ...candidateData } : effectiveData;
      const editable = !suspended && status === 'approved' && reviewStatus !== 'pending';
      const changedFields = group.fields.filter(field => String(displayedData[field.key] ?? '') !== String(effectiveData[field.key] ?? ''));
      const notice = suspended
        ? { tone:'is-rejected', copy:text('企业发行资格已暂停，当前资料仅支持查看。','Publishing access is suspended. The current information is read-only.',language) }
        : reviewStatus === 'pending'
          ? { tone:'is-pending', copy:text(`本次变更已于 ${review.submittedAt || '—'} 提交。审核通过前，当前已生效资料继续使用。`,`Changes were submitted at ${review.submittedAt || '—'}. Current active information remains in use until approval.`,language) }
          : reviewStatus === 'rejected'
            ? { tone:'is-rejected', copy:text(`资料修改审核未通过，原因：${review.rejectReason || '请核对本次提交内容。'} 修改后可重新提交。`,`Changes were rejected: ${review.rejectReason || 'Please check the submitted information.'}`,language) }
            : reviewStatus === 'approved'
              ? { tone:'is-approved', copy:text(`资料修改已于 ${review.reviewedAt || '—'} 审核通过并生效。`,`Changes were approved at ${review.reviewedAt || '—'} and are now active.`,language) }
              : { tone:'', copy:text('以下为当前已生效资料。修改后需提交平台人工审核，通过后生效。','The current approved information is shown below. Any change requires platform review.',language) };
      const statusLabel = suspended ? text('仅查看','Read-only',language) : reviewStatus === 'pending' ? text('审核中','Pending',language) : reviewStatus === 'rejected' ? text('未通过','Rejected',language) : text('已生效','Active',language);
      const statusTone = suspended || reviewStatus === 'rejected' ? 'danger' : reviewStatus === 'pending' ? 'warning' : 'success';
      const submitHint = reviewStatus === 'pending'
        ? text(`本次共修改 ${changedFields.length} 项，正在等待审核。`,`${changedFields.length} changed field(s) are waiting for review.`,language)
        : suspended
          ? text('当前只能查看已生效资料。','Only active information can be viewed.',language)
          : text('仅提交本次变更项；审核期间不影响当前已生效资料。','Only changed fields are submitted. Active values remain unchanged during review.',language);
      const demoReview = reviewStatus === 'pending' ? `<section class="vendor-review-demo"><strong>${text('Demo：资料修改审核结果','Demo: review result',language)}</strong><div class="form-actions">${c.button({ label:text('模拟通过','Approve',language), variant:'primary', action:'vendor-settings-review-preview', size:'small', extra:`data-vendor-settings-group="${e(key)}" data-vendor-review-result="approved"` })}${c.button({ label:text('模拟拒绝','Reject',language), variant:'danger', action:'vendor-settings-review-preview', size:'small', extra:`data-vendor-settings-group="${e(key)}" data-vendor-review-result="rejected"` })}</div></section>` : '';
      const mainlandSelected = displayedData.region === '中国大陆';
      return `<section class="vendor-settings-panel" data-vendor-settings-panel="${e(key)}"${activeTab === key ? '' : ' hidden'} role="tabpanel"><div class="vendor-settings-panel__notice ${notice.tone}">${icon(notice.tone === 'is-rejected' ? 'warning' : notice.tone === 'is-approved' ? 'check' : 'info')}<span>${e(notice.copy)}</span></div><form class="vendor-settings-form-grid${mainlandSelected ? ' is-mainland' : ''}" data-vendor-settings-form="${e(key)}">${group.fields.map(field => renderField({ field, value:displayedData[field.key], effectiveValue:effectiveData[field.key], editable, pending:reviewStatus === 'pending', mainlandSelected })).join('')}</form><footer class="vendor-settings-panel__footer"><span>${e(submitHint)}</span><div class="form-actions">${c.statusTag(statusLabel,statusTone)}${suspended ? '' : c.button({ label:reviewStatus === 'pending' ? text('审核中','Pending review',language) : text('提交审核','Submit for review',language), variant:'primary', action:'vendor-settings-submit', disabled:!editable || !changedFields.length, extra:`data-vendor-settings-group="${e(key)}"` })}</div></footer>${demoReview}</section>`;
    }).join('');

    return `<section class="publisher-vendor-settings" data-publisher-page="vendor" data-vendor-qualification-status="${e(status)}">${pageTitle}<section class="publisher-vendor-card"><nav class="vendor-settings-tabs" role="tablist" aria-label="${text('厂商资料','Company information',language)}">${tabs}</nav>${panels}</section><aside class="publisher-vendor-support">${icon('info')}<span>${text('如有资料变更或审核疑问，请联系开发者支持：','For information changes or review questions, contact developer support:',language)} <a href="mailto:dev@xiaoji.com">dev@xiaoji.com</a></span></aside></section>`;
  };

  scope.PublisherVendorSettings = Object.freeze({ groupKeys, groupsFor, createReviews, normalizeReviews, nextApplicationId, render });
})(window);
