window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function startApplication(namespace) {
  const c = namespace.components;
  const root = document.getElementById('app');
  const parseJson = id => JSON.parse(document.getElementById(id).textContent);
  const moduleConfig = parseJson('portal-module');
  const routes = parseJson('portal-routes');
  const portalData = parseJson('portal-data');
  const modules = parseJson('portal-modules');
  const readStorage = (storage, key, fallback) => {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };
  const writeStorage = (storage, key, value) => {
    try { storage.setItem(key, JSON.stringify(value)); } catch { /* 浏览器禁用存储时仍保持本次会话可用 */ }
  };
  const cloneJson = value => JSON.parse(JSON.stringify(value));
  const qualificationStorageKey = 'gamehub-company-verification-v3';
  const registrationStorageKey = 'gamehub-developer-registration-v1';
  const sessionStorageKey = 'gamehub-developer-session-v1';
  const accountStatesStorageKey = 'gamehub-developer-account-states-v1';
  const languageStorageKey = 'gamehub-developer-language-v1';
  const managedContentStorageKey = 'gamehub-developer-content-published-v1';
  const managedContentDraftStorageKey = 'gamehub-developer-content-drafts-v1';
  const publisherFixtureGameKeys = new Set(['draft', 'reviewing', 'existing', 'pioneer', 'prerelease', 'live', 'delisted']);
  const createQualification = (prefill = true) => ({
    applicationId: 'ENT-20260903-001',
    status: 'unsubmitted',
    step: 0,
    view: 'intro',
    editing: false,
    revision: 0,
    acceptedContentRevision: 0,
    submittedAt: '',
    reviewedAt: '',
    reviewer: '',
    rejectReason: '',
    delistedAt: '',
    delistedBy: '',
    delistReason: '',
    history: [],
    submissions: [],
    currentSubmission: null,
    form: prefill ? {
      subjectType: '公司／企业', region: '中国大陆', legalName: '深圳星海互动科技有限公司', registrationNumber: '9144XXXXXXXXXXXXXX', registeredAddress: '广东省深圳市南山区科技园示例路 88 号', businessLicenseName: '营业执照.jpg',
      legalEnglishName: 'Shenzhen Xinghai Interactive Technology Co., Ltd.', mailingAddress: '广东省深圳市南山区科技园示例路 88 号',
      bankAccountName: '深圳星海互动科技有限公司', bankName: '中国建设银行深圳科技园支行', bankAccountNumber: '6222000000008899', bankBranch: '中国建设银行深圳科技园支行', bankProofName: '银行开户证明.jpg',
      vendorName: '星海互动', vendorEnglishName: 'Xinghai Interactive', vendorIntro: '专注于 PC 游戏研发与发行。', logoName: '',
      contactName: '林晨', mobile: '138 0000 1234', email: 'contact@xinghai-interactive.com',
      signatoryName: '林晨', signatoryTitle: '业务负责人', agreementAccepted: true,
    } : { subjectType: '公司／企业', region: '中国大陆', agreementAccepted: false },
  });
  const storedSession = readStorage(sessionStorage, sessionStorageKey, null);
  const storedAccountKey = storedSession && typeof storedSession === 'object' ? String(storedSession.accountKey || '') : '';
  const storedAccountStates = readStorage(localStorage, accountStatesStorageKey, {});
  const activeStoredAccount = storedAccountKey && storedAccountStates && typeof storedAccountStates === 'object' ? storedAccountStates[storedAccountKey] : null;
  const storedQualification = activeStoredAccount?.qualification || (storedAccountKey ? null : readStorage(localStorage, qualificationStorageKey, null));
  const defaultQualification = createQualification(false);
  const restoredQualification = storedQualification ? {
    ...defaultQualification,
    ...storedQualification,
    editing: false,
    form: { ...defaultQualification.form, ...(storedQualification.form || {}) },
    history: storedQualification.history || [],
    submissions: storedQualification.submissions || [],
  } : defaultQualification;
  if (storedQualification?.form && storedQualification.form.agreementAccepted === undefined) {
    restoredQualification.form.agreementAccepted = Boolean(storedQualification.form.ndaAccepted && storedQualification.form.distributionAccepted);
  }
  delete restoredQualification.form.ndaAccepted;
  delete restoredQualification.form.distributionAccepted;
  delete restoredQualification.form.website;
  const storedRegistration = activeStoredAccount?.registration || (storedAccountKey ? null : readStorage(localStorage, registrationStorageKey, null));
  const hasCompanyVerificationProgress = restoredQualification.status !== 'unsubmitted' || Number(restoredQualification.step) > 0 || Number(restoredQualification.revision) > 0;
  const restoredRegistration = hasCompanyVerificationProgress
    ? { accountTier: restoredQualification.status === 'delisted' ? 'registered' : 'enterprise', registeredAt: storedRegistration?.registeredAt || restoredQualification.submittedAt || '', consoleTab: storedRegistration?.consoleTab || 'games' }
    : { accountTier: storedRegistration?.accountTier || 'unselected', registeredAt: storedRegistration?.registeredAt || '', consoleTab: storedRegistration?.consoleTab || 'games' };
  if (!restoredQualification.currentSubmission && Number(restoredQualification.revision) > 0) {
    restoredQualification.currentSubmission = {
      applicationId: restoredQualification.applicationId,
      revision: restoredQualification.revision,
      submittedAt: restoredQualification.submittedAt,
      acceptedContentRevision: restoredQualification.acceptedContentRevision || 1,
      form: cloneJson(restoredQualification.form),
    };
  }
  if (restoredQualification.currentSubmission?.form) {
    const submittedForm = restoredQualification.currentSubmission.form;
    if (submittedForm.agreementAccepted === undefined) submittedForm.agreementAccepted = Boolean(submittedForm.ndaAccepted && submittedForm.distributionAccepted);
    delete submittedForm.ndaAccepted;
    delete submittedForm.distributionAccepted;
    delete submittedForm.website;
  }
  if (restoredQualification.status === 'pending') {
    const lastSubmissionIndex = (restoredQualification.history || []).findLastIndex(item => /提交企业认证申请|submitted company verification/i.test(String(item?.action || '')));
    if (lastSubmissionIndex >= 0) restoredQualification.history = restoredQualification.history.slice(0, lastSubmissionIndex + 1);
  }
  const defaultManagedContent = cloneJson(portalData.managedContent || {});
  const storedManagedContent = readStorage(localStorage, managedContentStorageKey, null);
  const storedManagedContentDraft = readStorage(localStorage, managedContentDraftStorageKey, null);
  const legacyHelpBody = article => {
    if (String(article?.bodyHtml || '').trim()) return article.bodyHtml;
    const answer = String(article?.answer || '').trim();
    const steps = Array.isArray(article?.steps) ? article.steps : [];
    const details = Array.isArray(article?.details) ? article.details : [];
    return `${answer ? `<p>${c.escapeHtml(answer)}</p>` : '<p><br></p>'}${steps.length ? `<h2>操作步骤</h2><ol>${steps.map(item => `<li>${c.escapeHtml(item)}</li>`).join('')}</ol>` : ''}${details.length ? `<h2>处理说明</h2><ul>${details.map(item => `<li>${c.escapeHtml(item)}</li>`).join('')}</ul>` : ''}`;
  };
  const normalizeManagedContent = source => {
    const content = cloneJson(source || {});
    content.zh = content.zh || {};
    content.en = content.en || {};
    if (!Array.isArray(content.certificationArticles)) {
      const articleSources = [
        ['intro', '认证介绍', 'Introduction', 'introTitle', 'introDescription'],
        ['nda', '保密协议', 'Confidentiality Agreement', 'ndaTitle', 'ndaBody'],
        ['cooperation', '合作协议', 'Cooperation Agreement', 'distributionTitle', 'distributionBody'],
      ];
      content.certificationArticles = articleSources.map(([position, zhPosition, enPosition, titleKey, bodyKey], index) => ({
        id: `CERT-ARTICLE-${String(index + 1).padStart(3, '0')}`,
        position,
        positionLabel: { zh: zhPosition, en: enPosition },
        updatedAt: content.publishedAt || '2026-09-03 10:00',
        zh: { title: content.zh[titleKey] || '', bodyHtml: content.zh[bodyKey] || '' },
        en: { title: content.en[titleKey] || '', bodyHtml: content.en[bodyKey] || '' },
      }));
    }
    const zhFaq = Array.isArray(content.zh.help?.faq) ? content.zh.help.faq : [];
    const enFaq = Array.isArray(content.en.help?.faq) ? content.en.help.faq : [];
    if (!Array.isArray(content.helpNavigations)) {
      const enById = new Map(enFaq.map(article => [article.id, article]));
      const categories = [];
      zhFaq.forEach(article => {
        const zhTitle = String(article.category || '').trim() || '未分类';
        if (categories.some(item => item.zh === zhTitle)) return;
        categories.push({ zh: zhTitle, en: String(enById.get(article.id)?.category || zhTitle).trim() || zhTitle });
      });
      enFaq.forEach(article => {
        const enTitle = String(article.category || '').trim() || 'Uncategorized';
        if (categories.some(item => item.en === enTitle)) return;
        categories.push({ zh: enTitle, en: enTitle });
      });
      content.helpNavigations = categories.map((category, index) => ({
        id: `HC-NAV-${String(index + 1).padStart(3, '0')}`,
        sortOrder: index + 1,
        updatedAt: content.publishedAt || '2026-09-03 10:00',
        zh: { title: category.zh },
        en: { title: category.en },
      }));
    }
    if (!Array.isArray(content.helpDocuments)) {
      const enById = new Map(enFaq.map(article => [article.id, article]));
      const zhById = new Map(zhFaq.map(article => [article.id, article]));
      const ids = [...new Set([...zhFaq.map(article => article.id), ...enFaq.map(article => article.id)])];
      const counts = new Map();
      content.helpDocuments = ids.map((id, index) => {
        const zhArticle = zhById.get(id) || {};
        const enArticle = enById.get(id) || {};
        const navigation = content.helpNavigations.find(item => item.zh?.title === zhArticle.category || item.en?.title === enArticle.category) || content.helpNavigations[0];
        const navigationId = navigation?.id || '';
        const nextOrder = (counts.get(navigationId) || 0) + 1;
        counts.set(navigationId, nextOrder);
        return {
          id: /^HC-DOC-/i.test(String(id || '')) ? id : `HC-DOC-${String(index + 1).padStart(3, '0')}`,
          legacyId: id,
          navigationId,
          sortOrder: nextOrder,
          updatedAt: content.publishedAt || '2026-09-03 10:00',
          zh: { title: zhArticle.question || '', bodyHtml: legacyHelpBody(zhArticle) },
          en: { title: enArticle.question || '', bodyHtml: legacyHelpBody(enArticle) },
        };
      });
    }
    ['certificationArticles', 'helpNavigations', 'helpDocuments'].forEach(collectionName => {
      content[collectionName] = (content[collectionName] || []).map(item => ({
        ...item,
        status: item?.status === 'draft' ? 'draft' : 'published',
      }));
    });
    return content;
  };
  const managedContent = normalizeManagedContent(storedManagedContent?.zh && storedManagedContent?.en ? storedManagedContent : defaultManagedContent);
  const managedContentDraft = normalizeManagedContent(storedManagedContentDraft?.zh && storedManagedContentDraft?.en ? storedManagedContentDraft : managedContent);
  const memory = {
    page: Object.create(null),
    result: Object.create(null),
    upload: Object.create(null),
    business: Object.create(null),
    shell: { helpOpen: false, scrollTop: 0, language: readStorage(localStorage, languageStorageKey, 'zh') },
    session: { authenticated: Boolean(storedAccountKey && storedSession?.authenticated), accountKey: storedAccountKey },
    registration: restoredRegistration,
    qualification: restoredQualification,
    qualificationPreview: null,
    managedContent,
    operationsReview: { view: 'list', actionMode: '', attachmentMode: '', selectedApplicationId: '' },
    contentEditor: {
      language: 'zh',
      view: 'list',
      entity: '',
      helpTab: 'navigation',
      selectedId: '',
      search: '',
      navigationFilter: '',
      deleteTarget: null,
      issuedIds: new Set([
        ...(managedContentDraft.certificationArticles || []).map(item => item.id),
        ...(managedContentDraft.helpNavigations || []).map(item => item.id),
        ...(managedContentDraft.helpDocuments || []).map(item => item.id),
      ]),
      draft: cloneJson(managedContentDraft),
    },
  };
  try {
    const handoff = JSON.parse(window.name || 'null');
    if (handoff?.source === 'gamehub-developer-platform' && handoff?.authenticated === true && handoff?.qualification === 'approved' && Number(handoff.expiresAt) > Date.now()) {
      memory.session.authenticated = true;
      memory.registration = { ...memory.registration, accountTier: 'enterprise' };
      memory.qualification = { ...memory.qualification, status: 'approved', editing: false };
    }
  } catch { /* window.name 不是本平台交接数据时忽略 */ }
  if (moduleConfig.id === '02') {
    memory.session.authenticated = true;
    memory.registration = { ...memory.registration, accountTier: 'enterprise', consoleTab: 'games' };
    memory.qualification = { ...memory.qualification, status: 'approved', editing: false };
    memory.page['P02-01'] = {
      workspaceView: 'games',
      gameTab: 'overview',
      gameSection: 'release-overview',
      selectedGame: 'existing',
      addGameOpen: false,
      cdkeyTab: 0,
      gameSearch: '',
      gameStatusFilter: 'all',
      gameMenuOpen: '',
      deleteGameKey: '',
      deletedGameKeys: [],
    };
  }
  const fallbackPage = route => ({
    summary: `${namespace.shell.publicTitle(route)}暂时无法加载，请稍后重试。`,
    status: '加载失败',
    primaryAction: '重试',
  });
  const parseLocation = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    const [routePart, queryPart = ''] = raw.split('?');
    const query = new URLSearchParams(queryPart);
    const requested = routes.find(item => item.id === routePart);
    let route = requested || routes.find(item => item.id === moduleConfig.defaultRoute) || routes[0];
    const previewStatus = moduleConfig.id === '01' && ['pending', 'approved', 'rejected', 'delisted'].includes(query.get('preview')) ? query.get('preview') : '';
    if (previewStatus) {
      const previewSubmittedAt = '2026-09-02 10:30';
      const previewForm = { ...createQualification(true).form, ...(memory.qualification.form || {}) };
      const previewApplicationId = memory.qualification.applicationId || 'ENT-20260903-001';
      const previewSubmission = memory.qualification.currentSubmission || {
        applicationId: previewApplicationId,
        revision: 1,
        submittedAt: previewSubmittedAt,
        acceptedContentRevision: Number(memory.managedContent.revision) || 1,
        agreementAcceptedAt: previewSubmittedAt,
        agreementAcceptedBy: '企业用户 王明',
        form: cloneJson(previewForm),
      };
      memory.session.authenticated = true;
      memory.registration = { ...memory.registration, accountTier: 'enterprise', registeredAt: memory.registration.registeredAt || previewSubmittedAt, consoleTab: memory.registration.consoleTab || 'games' };
      memory.qualification = {
        ...memory.qualification,
        applicationId: previewApplicationId,
        status: previewStatus,
        editing: false,
        repairReason: '',
        revision: Math.max(1, Number(memory.qualification.revision) || 0),
        submittedAt: previewSubmittedAt,
        rejectReason: previewStatus === 'rejected'
          ? (memory.qualification.rejectReason || '工商执照证明图片不清晰，请上传完整、无遮挡的彩色扫描件。')
          : '',
        delistReason: previewStatus === 'delisted'
          ? (memory.qualification.delistReason || '发现企业主体信息发生变更，请联系开发者支持确认恢复条件。')
          : '',
        form: previewForm,
        currentSubmission: previewSubmission,
        submissions: memory.qualification.submissions?.length ? memory.qualification.submissions : [cloneJson(previewSubmission)],
        history: memory.qualification.history?.length ? memory.qualification.history : [{ action: '提交企业认证申请 REV-01', actor: '企业用户 王明', time: previewSubmittedAt }],
      };
      if (previewStatus !== 'pending') {
        memory.qualification.notification = buildReviewNotification({
          status: previewStatus,
          vendorName: previewForm.vendorName,
          email: previewForm.email,
          mobile: previewForm.mobile,
          sentAt: memory.qualification.reviewedAt || '2026-09-04 10:30',
          mode: 'preview',
        });
      } else {
        memory.qualification.notification = null;
      }
    }
    if (moduleConfig.id === '01' && route?.role === 'developer') {
      if (requested?.id === 'P01-01') route = requested;
      else if (!memory.session.authenticated) route = routes.find(item => item.id === 'P01-01') || route;
      else if (memory.qualification.status !== 'approved') route = routes.find(item => item.id === 'P01-03') || route;
      else if (!requested) route = routes.find(item => item.id === 'P01-02') || route;
    }
    const role = route.role;
    const state = 'default';
    const requestedTab = Number(query.get('tab'));
    const cdkeyTab = Number.isInteger(requestedTab) && requestedTab >= 0 && requestedTab <= 3 ? requestedTab : null;
    return { route, role, state, cdkeyTab };
  };
  const navigate = ({ routeId, state }) => {
    const current = parseLocation();
    const nextRoute = routes.find(route => route.id === routeId) || current.route;
    const nextHash = namespace.shell.hashFor(nextRoute, nextRoute.role, state || 'default');
    if (location.hash === nextHash) render();
    else location.hash = nextHash;
  };
  const clearPreviewQuery = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    const [routePart] = raw.split('?');
    if (!routePart || !raw.includes('?')) return;
    history.replaceState(null, '', `${location.href.split('#')[0]}#/${routePart}`);
  };
  const persistAccountState = () => {
    const accountKey = String(memory.session.accountKey || '');
    if (!accountKey) return false;
    const accountStates = readStorage(localStorage, accountStatesStorageKey, {});
    const nextAccountStates = accountStates && typeof accountStates === 'object' ? accountStates : {};
    nextAccountStates[accountKey] = {
      registration: cloneJson(memory.registration),
      qualification: cloneJson(memory.qualification),
    };
    writeStorage(localStorage, accountStatesStorageKey, nextAccountStates);
    return true;
  };
  const persistQualification = () => {
    if (!persistAccountState()) writeStorage(localStorage, qualificationStorageKey, memory.qualification);
  };
  const persistRegistration = () => {
    if (!persistAccountState()) writeStorage(localStorage, registrationStorageKey, memory.registration);
  };
  const switchDeveloperAccount = accountKey => {
    const normalizedAccountKey = String(accountKey || '').trim();
    if (!normalizedAccountKey) return;
    const accountStates = readStorage(localStorage, accountStatesStorageKey, {});
    const storedAccount = accountStates && typeof accountStates === 'object' ? accountStates[normalizedAccountKey] : null;
    const accountQualification = storedAccount?.qualification;
    const accountRegistration = storedAccount?.registration;
    const blankQualification = createQualification(false);
    const storedQualificationForm = accountQualification?.form && typeof accountQualification.form === 'object' ? cloneJson(accountQualification.form) : {};
    memory.session = { authenticated: true, accountKey: normalizedAccountKey };
    memory.registration = accountRegistration
      ? { accountTier: accountRegistration.accountTier || 'unselected', registeredAt: accountRegistration.registeredAt || '', consoleTab: accountRegistration.consoleTab || 'games' }
      : { accountTier: 'unselected', registeredAt: '', consoleTab: 'games' };
    memory.qualification = accountQualification
      ? {
        ...blankQualification,
        ...cloneJson(accountQualification),
        editing: false,
        form: { ...blankQualification.form, ...storedQualificationForm },
        history: cloneJson(accountQualification.history || []),
        submissions: cloneJson(accountQualification.submissions || []),
      }
      : blankQualification;
    memory.qualificationPreview = null;
    delete memory.result['P01-03'];
    writeStorage(sessionStorage, sessionStorageKey, memory.session);
    persistAccountState();
  };
  const nowText = () => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const sanitizeManagedHtml = value => {
    const template = document.createElement('template');
    template.innerHTML = String(value || '').trim();
    template.content.querySelectorAll('script, iframe, object, embed, style').forEach(node => node.remove());
    template.content.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const valueText = attribute.value.trim();
        if (name.startsWith('on') || name === 'style') node.removeAttribute(attribute.name);
        if ((name === 'href' || name === 'src') && /^javascript:/i.test(valueText)) node.removeAttribute(attribute.name);
      });
      if (node.tagName === 'IMG' && !/^(?:data:image\/(?:jpeg|png|webp);base64,|https:\/\/)/i.test(node.getAttribute('src') || '')) node.remove();
    });
    return template.innerHTML.trim();
  };
  const setNestedValue = (target, path, value) => {
    const keys = String(path || '').split('.').filter(Boolean);
    if (!keys.length) return;
    let cursor = target;
    keys.slice(0, -1).forEach((key, index) => {
      if (cursor[key] === undefined || cursor[key] === null) cursor[key] = /^\d+$/.test(keys[index + 1] || '') ? [] : {};
      cursor = cursor[key];
    });
    cursor[keys.at(-1)] = value;
  };
  const getNestedValue = (target, path) => String(path || '').split('.').filter(Boolean).reduce((value, key) => value?.[key], target);
  const persistManagedContentDraft = () => writeStorage(localStorage, managedContentDraftStorageKey, memory.contentEditor.draft);
  const collectManagedContentForm = () => {
    const draft = memory.contentEditor.draft;
    if (!draft) return;
    let changed = false;
    root.querySelectorAll('[data-content-editor-form] [data-content-path]').forEach(field => {
      const value = field.hasAttribute('data-rich-editor-body')
        ? sanitizeManagedHtml(field.innerHTML)
        : String(field.value || '').trim();
      if (String(getNestedValue(draft, field.dataset.contentPath) || '') !== String(value || '')) changed = true;
      setNestedValue(draft, field.dataset.contentPath, value);
    });
    if (changed && memory.contentEditor.entity && memory.contentEditor.selectedId) {
      const collection = draft[contentCollection(memory.contentEditor.entity)] || [];
      const selected = collection.find(item => item.id === memory.contentEditor.selectedId);
      if (selected) {
        selected.status = 'draft';
        selected.updatedAt = nowText();
      }
      persistManagedContentDraft();
    }
  };
  const managedText = value => String(value || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
  const validateManagedContent = content => {
    const positions = ['intro', 'nda', 'cooperation'];
    const articles = Array.isArray(content?.certificationArticles) ? content.certificationArticles : [];
    for (const position of positions) {
      const matches = articles.filter(article => article.position === position);
      if (matches.length !== 1) return { language: 'zh', entity: 'certification', routeId: 'P01-09', label: `${position === 'intro' ? '认证介绍' : position === 'nda' ? '保密协议' : '合作协议'}文章` };
    }
    for (const language of ['zh', 'en']) {
      for (const article of articles) {
        if (!String(article?.[language]?.title || '').trim() || !managedText(article?.[language]?.bodyHtml)) {
          return { language, entity: 'certification', selectedId: article.id, routeId: 'P01-09', label: language === 'zh' ? '中文认证文章标题和正文' : 'English certification article title and content' };
        }
      }
      for (const navigation of content.helpNavigations || []) {
        if (!String(navigation?.[language]?.title || '').trim()) {
          return { language, entity: 'navigation', selectedId: navigation.id, routeId: 'P01-10', label: language === 'zh' ? '中文导航名称' : 'English navigation title' };
        }
      }
      const navigationIds = new Set((content.helpNavigations || []).map(item => item.id));
      for (const document of content.helpDocuments || []) {
        if (!navigationIds.has(document.navigationId) || !String(document?.[language]?.title || '').trim() || !managedText(document?.[language]?.bodyHtml)) {
          return { language, entity: 'document', selectedId: document.id, routeId: 'P01-10', label: language === 'zh' ? '中文子文档导航、标题和正文' : 'English document navigation, title and content' };
        }
      }
      const locale = content?.[language] || {};
      for (const field of ['supportName', 'serviceHours', 'channel', 'fallback']) {
        if (!String(locale.help?.contact?.[field] || '').trim()) return { language, entity: 'help', routeId: 'P01-10', label: language === 'zh' ? '中文联系支持文案' : 'English support contact copy' };
      }
    }
    return null;
  };
  const validateManagedContentItem = (entity, item, content) => {
    if (!item) return { language: 'zh', label: '待发布内容' };
    for (const language of ['zh', 'en']) {
      const locale = item?.[language] || {};
      if (!String(locale.title || '').trim()) {
        return { language, label: language === 'zh' ? '中文标题' : 'English title' };
      }
      if (entity !== 'navigation' && !managedText(locale.bodyHtml)) {
        return { language, label: language === 'zh' ? '中文正文' : 'English content' };
      }
    }
    if (entity === 'certification' && !['intro', 'nda', 'cooperation'].includes(item.position)) {
      return { language: 'zh', label: '文章位置' };
    }
    if (entity === 'document') {
      const publishedNavigation = (memory.managedContent.helpNavigations || []).find(navigation => navigation.id === item.navigationId);
      if (!publishedNavigation) return { language: 'zh', label: '已发布的所属导航', parentMissing: true };
    }
    return null;
  };
  const syncManagedContentPublicFields = content => {
    const result = cloneJson(content);
    const byPosition = new Map((result.certificationArticles || []).map(article => [article.position, article]));
    const fieldMap = {
      intro: ['introTitle', 'introDescription'],
      nda: ['ndaTitle', 'ndaBody'],
      cooperation: ['distributionTitle', 'distributionBody'],
    };
    const navigations = [...(result.helpNavigations || [])].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
    const navigationById = new Map(navigations.map(item => [item.id, item]));
    const documents = [...(result.helpDocuments || [])].sort((a, b) => {
      const navDifference = Number(navigationById.get(a.navigationId)?.sortOrder || 0) - Number(navigationById.get(b.navigationId)?.sortOrder || 0);
      return navDifference || Number(a.sortOrder) - Number(b.sortOrder);
    });
    for (const language of ['zh', 'en']) {
      result[language] = result[language] || {};
      for (const [position, fields] of Object.entries(fieldMap)) {
        const article = byPosition.get(position);
        result[language][fields[0]] = article?.[language]?.title || '';
        result[language][fields[1]] = article?.[language]?.bodyHtml || '';
      }
      result[language].help = result[language].help || { title: language === 'zh' ? '帮助中心' : 'Help Center', contact: {} };
      result[language].help.faq = documents.map(document => ({
        id: document.id,
        navigationId: document.navigationId,
        category: navigationById.get(document.navigationId)?.[language]?.title || '',
        question: document?.[language]?.title || '',
        bodyHtml: document?.[language]?.bodyHtml || '',
      }));
    }
    return result;
  };
  const contentCollection = entity => ({
    certification: 'certificationArticles',
    navigation: 'helpNavigations',
    document: 'helpDocuments',
  }[entity] || '');
  const nextContentId = entity => {
    const prefix = { certification: 'CERT-ARTICLE', navigation: 'HC-NAV', document: 'HC-DOC' }[entity] || 'CONTENT';
    let sequence = 1;
    let id = `${prefix}-${String(sequence).padStart(3, '0')}`;
    while (memory.contentEditor.issuedIds.has(id)) id = `${prefix}-${String(++sequence).padStart(3, '0')}`;
    memory.contentEditor.issuedIds.add(id);
    return id;
  };
  const resequenceContent = (items, filter = () => true) => {
    let order = 1;
    items.filter(filter).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)).forEach(item => { item.sortOrder = order++; });
  };
  const collectQualificationForm = () => {
    const form = { ...(memory.qualification.form || {}) };
    root.querySelectorAll('[data-qualification-form] [name]').forEach(field => {
      if (field.type === 'file') {
        const nameField = field.dataset.qualificationFile;
        if (field.files?.[0] && nameField) form[nameField] = field.files[0].name;
        return;
      }
      if (field.type === 'checkbox') {
        form[field.name] = field.checked;
        return;
      }
      form[field.name] = field.value.trim();
    });
    memory.qualification.form = form;
    return form;
  };
  const validateQualificationForm = form => {
    root.querySelectorAll('[data-qualification-form] [aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
    root.querySelectorAll('.qualification-field-error').forEach(message => message.remove());
    root.querySelectorAll('.qualification-upload.is-invalid, .agreement-check.is-invalid, .qualification-anchor.is-invalid').forEach(field => field.classList.remove('is-invalid'));
    const isEnglish = memory.shell.language === 'en';
    const labels = isEnglish ? {
      legalName: 'legal company name', registrationNumber: 'business license number', registeredAddress: 'registered address', businessLicenseName: 'business license proof',
      signatoryName: 'authorized signatory', signatoryTitle: 'signatory title', agreementAccepted: 'agreement confirmation',
      bankAccountName: 'account holder name', bankName: 'bank name', bankAccountNumber: 'bank account number', bankBranch: 'branch information', bankProofName: 'bank proof',
      vendorName: 'publisher brand name', vendorIntro: 'publisher profile', contactName: 'contact name', email: 'contact email',
    } : {
      legalName: '企业法定名称', registrationNumber: '工商执照号码', registeredAddress: '企业注册地址', businessLicenseName: '工商执照证明附件',
      signatoryName: '授权签署人姓名', signatoryTitle: '签署人职务', agreementAccepted: '平台协议确认',
      bankAccountName: '银行账户户名', bankName: '开户银行', bankAccountNumber: '银行账号', bankBranch: '开户支行／联行信息', bankProofName: '银行卡证明附件',
      vendorName: '厂商品牌名称', vendorIntro: '厂商简介', contactName: '联系人', email: '联系邮箱',
    };
    const errors = [];
    const markSection = element => {
      const sectionId = element?.closest('[data-qualification-section]')?.dataset.qualificationSection;
      if (!sectionId) return;
      root.querySelector(`[data-qualification-anchor="${sectionId}"]`)?.classList.add('is-invalid');
    };
    const markField = (name, message) => {
      const field = root.querySelector(`[data-qualification-form] [name="${name}"]`);
      if (!field) return;
      field.setAttribute('aria-invalid', 'true');
      const container = field.closest('.field');
      if (container && !container.querySelector('.qualification-field-error')) container.insertAdjacentHTML('beforeend', `<span class="field-error qualification-field-error">${c.escapeHtml(message)}</span>`);
      if (field.type === 'checkbox') field.closest('.agreement-check')?.classList.add('is-invalid');
      markSection(field);
    };
    const markUpload = nameField => {
      const input = root.querySelector(`[data-qualification-file="${nameField}"]`);
      input?.setAttribute('aria-invalid', 'true');
      input?.closest('.qualification-upload')?.classList.add('is-invalid');
      markSection(input);
    };
    ['legalName', 'registrationNumber', 'registeredAddress', 'bankAccountName', 'bankName', 'bankAccountNumber', 'bankBranch', 'vendorName', 'vendorIntro', 'contactName', 'email', 'signatoryName', 'signatoryTitle'].forEach(name => {
      if (String(form[name] || '').trim()) return;
      errors.push(labels[name]);
      markField(name, isEnglish ? 'This field is required.' : '此项为必填。');
    });
    ['businessLicenseName', 'bankProofName'].forEach(name => {
      if (String(form[name] || '').trim()) return;
      errors.push(labels[name]);
      markUpload(name);
    });
    ['agreementAccepted'].forEach(name => {
      if (form[name]) return;
      errors.push(labels[name]);
      markField(name, isEnglish ? 'Acceptance is required.' : '请确认接受当前协议。');
    });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.push(isEnglish ? 'valid email' : '正确的邮箱格式');
      markField('email', isEnglish ? 'Enter a valid email address.' : '请输入正确的邮箱地址。');
    }
    if (!errors.length) return true;
    const uniqueErrors = [...new Set(errors)];
    resultMessage('P01-03', isEnglish ? 'Complete the required information' : '请完善必填资料', isEnglish ? `Check: ${uniqueErrors.slice(0, 5).join(', ')}${uniqueErrors.length > 5 ? '…' : ''}` : `请检查：${uniqueErrors.slice(0, 5).join('、')}${uniqueErrors.length > 5 ? '等项目' : ''}`, 'warning');
    const firstInvalid = root.querySelector('[data-qualification-form] [aria-invalid="true"]');
    firstInvalid?.closest('[data-qualification-section]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (firstInvalid?.type !== 'file') firstInvalid?.focus();
    return false;
  };
  const validateQualificationStep = () => {
    const form = collectQualificationForm();
    return validateQualificationForm(form);
  };
  const resultMessage = (routeId, title, detail, variant = 'success') => {
    memory.result[routeId] = { title, detail, variant };
    const target = root.querySelector('[data-developer-login]:not([hidden]) [data-login-result]') || root.querySelector('[data-runtime-result]');
    if (target) target.innerHTML = c.resultStrip(memory.result[routeId]);
  };
  const developerPortalUrl = 'https://developer.xiaoji.com';
  const buildReviewNotification = ({ status, vendorName, email, mobile, sentAt = '', mode = 'sent' }) => {
    const name = vendorName || '星海互动';
    const statusCopy = status === 'approved'
      ? `您申请的开发者“${name}”已通过审核，详情可前往开发者后台查看：${developerPortalUrl}`
      : status === 'delisted'
        ? `您的开发者“${name}”发行资格已被下架，具体原因可前往开发者后台查看：${developerPortalUrl}`
        : `您申请的开发者“${name}”审核未通过，具体原因可前往开发者后台查看：${developerPortalUrl}`;
    return {
      status: mode === 'preview' ? '已发送（Demo）' : mode === 'sent' ? '已发送' : mode,
      sentAt,
      reasonVisibility: status === 'approved' ? 'none' : 'platform-only',
      developerPortalUrl,
      sms: { recipient: mobile || '未填写', content: `【盖世游戏】${statusCopy}` },
      email: {
        recipient: email || '未填写',
        subject: '盖世游戏开发者认证审核结果通知',
        content: `您好，${statusCopy}。\n\n如需进一步协助，请联系 dev@xiaoji.com。`,
      },
    };
  };
  const applyQualificationReview = (routeId, nextStatus, reason = '') => {
    const currentStatus = memory.qualification.status;
    const allowed = (nextStatus === 'approved' || nextStatus === 'rejected') ? currentStatus === 'pending' : nextStatus === 'delisted' && currentStatus === 'approved';
    if (!allowed) {
      memory.operationsReview.actionMode = '';
      resultMessage(routeId, '当前状态不可执行此操作', nextStatus === 'delisted' ? '只有已通过的企业认证可以下架发行资格。' : '只有待审核申请可以执行通过或拒绝。', 'warning');
      return false;
    }
    const reviewedAt = nowText();
    const actor = '平台运营 李然';
    const submittedForm = memory.qualification.currentSubmission?.form || memory.qualification.form || {};
    const notification = buildReviewNotification({
      status: nextStatus,
      vendorName: submittedForm.vendorName,
      email: submittedForm.email,
      mobile: submittedForm.mobile,
      sentAt: reviewedAt,
      mode: 'sent',
    });
    const actionText = nextStatus === 'approved'
      ? '企业认证审核通过'
      : nextStatus === 'rejected'
        ? `企业认证审核拒绝：${reason}`
        : `企业发行资格下架：${reason}`;
    memory.qualification = {
      ...memory.qualification,
      status: nextStatus,
      reviewedAt: nextStatus === 'delisted' ? memory.qualification.reviewedAt : reviewedAt,
      reviewer: nextStatus === 'delisted' ? memory.qualification.reviewer : actor,
      rejectReason: nextStatus === 'rejected' ? reason : '',
      delistedAt: nextStatus === 'delisted' ? reviewedAt : '',
      delistedBy: nextStatus === 'delisted' ? actor : '',
      delistReason: nextStatus === 'delisted' ? reason : '',
      notification,
      history: [...(memory.qualification.history || []), { action: actionText, actor, time: reviewedAt }],
    };
    memory.registration = {
      ...memory.registration,
      accountTier: nextStatus === 'approved' ? 'enterprise' : nextStatus === 'delisted' ? 'registered' : memory.registration.accountTier,
      consoleTab: 'games',
    };
    memory.qualificationPreview = null;
    memory.operationsReview.actionMode = '';
    persistRegistration();
    persistQualification();
    delete memory.result['P01-03'];
    memory.result[routeId] = nextStatus === 'approved'
      ? { title: '企业认证已通过', detail: '发行合作权限已开通，短信和邮件已生成固定通知任务。', variant: 'success' }
      : nextStatus === 'rejected'
        ? { title: '企业认证已拒绝', detail: '拒绝原因仅在开发者后台展示；短信和邮件已生成固定通知任务。', variant: 'danger' }
        : { title: '发行资格已下架', detail: '下架原因仅在开发者后台展示；短信和邮件已生成固定通知任务。', variant: 'danger' };
    // 运营审核会改变真实业务状态；清除 Demo 预览参数，避免下一次渲染又被 ?preview=pending 覆盖。
    clearPreviewQuery();
    render();
    return true;
  };
  const setLoginFieldMessage = (panel, key, message = '', variant = 'error') => {
    const target = panel?.querySelector(`[data-login-error="${key}"]`);
    if (!target) return;
    target.textContent = message || '\u00A0';
    target.dataset.variant = message ? variant : 'idle';
    target.hidden = false;
  };
  const primaryDestination = routeId => ({
    'P01-02': 'P01-05', 'P01-04': 'P01-05', 'P01-05': 'P01-06',
    'P01-08': 'P01-09', 'P01-09': 'P01-10',
    'P02-03': 'P02-04',
    'P03-01': 'P03-02', 'P03-02': 'P03-03', 'P03-03': 'P03-04',
    'P03-06': 'P03-07', 'P03-07': 'P03-08', 'P03-09': 'P03-10', 'P03-11': 'P03-12',
    'P04-01': 'P04-02', 'P04-02': 'P04-03', 'P04-04': 'P04-05', 'P04-05': 'P04-06', 'P04-06': 'P04-07', 'P04-07': 'P04-08',
  }[routeId]);
  const primaryBusinessAction = routeId => ({
    'P01-06': 'download-sdk',
    'P01-08': 'send-password-setup',
    'P03-13': 'resume-download',
  }[routeId]);
  const variantForStatus = status => {
    if (/已下架|已结束|失败|已作废|已撤销/.test(status)) return 'danger';
    if (/暂停|待|排期/.test(status)) return 'warning';
    return 'success';
  };
  const setStatusTag = (tag, status) => {
    if (!tag) return;
    tag.textContent = status;
    tag.dataset.variant = variantForStatus(status);
  };
  const setSummaryStatus = (label, status) => {
    const item = Array.from(root.querySelectorAll('.task-summary > div')).find(node => node.querySelector(':scope > span')?.textContent.trim() === label);
    setStatusTag(item?.querySelector('.status-tag'), status);
  };
  const setGateStatus = (label, status) => {
    const item = Array.from(root.querySelectorAll('.gate-item')).find(node => node.querySelector('strong')?.textContent.trim() === label);
    setStatusTag(item?.querySelector('.status-tag'), status);
  };
  const setActionDisabled = (action, disabled) => {
    root.querySelectorAll(`[data-portal-action="${action}"]`).forEach(control => {
      control.disabled = disabled;
      control.setAttribute('aria-disabled', String(disabled));
    });
  };
  const toggleHelp = open => {
    const frame = root.querySelector('.product-frame');
    const workspace = root.querySelector('.workspace');
    const pageWrap = root.querySelector('.page-wrap');
    const help = root.querySelector('[data-help-center]');
    if (!workspace || !pageWrap || !help) return;
    if (open) memory.shell.scrollTop = workspace.scrollTop || 0;
    memory.shell.helpOpen = open;
    pageWrap.hidden = open;
    help.hidden = !open;
    frame?.classList.toggle('is-help-open', open);
    const helpButton = root.querySelector('[data-help-open]');
    if (helpButton) {
      helpButton.classList.toggle('is-active', open);
      helpButton.setAttribute('aria-pressed', String(open));
    }
    const consoleButton = root.querySelector('.top-console-button');
    if (consoleButton) consoleButton.hidden = !open;
    if (!open) workspace.scrollTop = memory.shell.scrollTop;
    else workspace.scrollTop = 0;
  };
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlightedText = (value, query) => {
    const pattern = new RegExp(escapeRegExp(query), 'gi');
    let cursor = 0;
    let output = '';
    for (const match of value.matchAll(pattern)) {
      output += c.escapeHtml(value.slice(cursor, match.index));
      output += `<mark>${c.escapeHtml(match[0])}</mark>`;
      cursor = match.index + match[0].length;
    }
    return output + c.escapeHtml(value.slice(cursor));
  };
  const selectHelpTopic = topic => {
    root.querySelectorAll('[data-help-topic]').forEach(item => {
      const active = item.dataset.helpTopic === topic;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    const results = root.querySelector('[data-help-search-results]');
    if (results) results.hidden = true;
    root.querySelectorAll('[data-help-article]').forEach(article => { article.hidden = article.dataset.helpArticle !== topic; });
    root.querySelector('.help-library__content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const searchHelp = () => {
    const input = root.querySelector('[data-help-search-input]');
    const results = root.querySelector('[data-help-search-results]');
    const query = input?.value.trim() || '';
    const isEnglish = memory.shell.language === 'en';
    if (!input || !results) return;
    if (!query) {
      input.focus();
      input.setAttribute('aria-invalid', 'true');
      results.hidden = false;
      results.innerHTML = isEnglish
        ? '<div class="help-search-empty"><strong>Enter a search term</strong><p>Try “sign in”, “verification”, “review” or “support”.</p></div>'
        : '<div class="help-search-empty"><strong>请输入搜索内容</strong><p>可以搜索“登录”“认证”“审核”“支持”等关键词。</p></div>';
      root.querySelectorAll('[data-help-article]').forEach(article => { article.hidden = true; });
      return;
    }
    input.removeAttribute('aria-invalid');
    const matches = [...root.querySelectorAll('[data-help-article]')].filter(article => article.textContent.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    root.querySelectorAll('[data-help-article]').forEach(article => { article.hidden = true; });
    results.hidden = false;
    if (!matches.length) {
      results.innerHTML = `<div class="help-search-summary"><span>${isEnglish ? 'SEARCH RESULTS' : '搜索结果'}</span><h1>${isEnglish ? `No articles found for “${c.escapeHtml(query)}”` : `未找到与“${c.escapeHtml(query)}”相关的文章`}</h1><p>${isEnglish ? 'Try a shorter term or choose an article from the documentation menu.' : '请尝试缩短关键词，或从左侧文档目录选择文章。'}</p></div>`;
      return;
    }
    results.innerHTML = `<div class="help-search-summary"><span>${isEnglish ? 'SEARCH RESULTS' : '搜索结果'}</span><h1>${isEnglish ? `${matches.length} article${matches.length > 1 ? 's' : ''} found for “${c.escapeHtml(query)}”` : `找到 ${matches.length} 篇与“${c.escapeHtml(query)}”相关的文章`}</h1><p>${isEnglish ? 'Search covers article titles, categories, content, steps and details.' : '搜索范围包括文章标题、分类、正文、步骤与处理说明。'}</p></div><div class="help-result-list">${matches.map(article => {
      const title = article.querySelector('h1')?.textContent.trim() || (isEnglish ? 'Help article' : '帮助文章');
      const category = article.querySelector('.help-breadcrumb')?.textContent.replace(isEnglish ? 'Help Center/' : '帮助中心/', '').trim() || (isEnglish ? 'Help Center' : '帮助中心');
      const plainText = article.textContent.replace(/\s+/g, ' ').trim();
      const lower = plainText.toLocaleLowerCase();
      const position = lower.indexOf(query.toLocaleLowerCase());
      const start = Math.max(0, position - 46);
      const excerpt = `${start > 0 ? '…' : ''}${plainText.slice(start, start + 180)}${start + 180 < plainText.length ? '…' : ''}`;
      return `<article class="help-result-item"><button type="button" data-help-result-topic="${c.escapeHtml(article.dataset.helpArticle)}"><span>${c.escapeHtml(category)}</span><h2>${highlightedText(title, query)}</h2><p>${highlightedText(excerpt, query)}</p></button></article>`;
    }).join('')}</div>`;
    results.querySelectorAll('[data-help-result-topic]').forEach(button => button.addEventListener('click', () => selectHelpTopic(button.dataset.helpResultTopic)));
    root.querySelector('.help-library__content')?.scrollTo({ top: 0 });
  };
  const setCdkeyTab = (routeId, index, remember = true) => {
    const nextIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
    if (remember) {
      memory.page[routeId] = { ...(memory.page[routeId] || {}), cdkeyTab: nextIndex };
      const nextHash = `#/${routeId}?tab=${nextIndex}`;
      if (location.hash !== nextHash) history.replaceState(null, '', nextHash);
    }
    root.querySelectorAll('[data-cdkey-panel]').forEach((panel, panelIndex) => { panel.hidden = panelIndex !== nextIndex; });
    root.querySelectorAll('[data-component="Tabs"][data-variant="task"] [role="tab"]').forEach((tab, tabIndex) => {
      const active = tabIndex === nextIndex;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  };
  const updatePublisherWorkspace = patch => {
    const routeId = 'P02-01';
    memory.page[routeId] = { ...(memory.page[routeId] || {}), ...patch };
    render();
  };
  const createSecret = () => {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return `sec_${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`;
  };
  const downloadTextFile = (fileName, content, type = 'text/plain;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const openCdkeyTab = index => {
    const targetModule = modules.find(item => item.id === '02');
    if (!targetModule) return;
    location.href = `${targetModule.output}#/P02-01?tab=${index}`;
  };
  const renderMemoryRecords = records => {
    const timeline = root.querySelector('.timeline');
    if (!timeline) return;
    timeline.querySelectorAll('[data-memory-record]').forEach(node => node.remove());
    records.slice().reverse().forEach(record => {
      timeline.insertAdjacentHTML('afterbegin', `<li class="timeline-item" data-memory-record><div class="timeline-title">${c.escapeHtml(record)}</div><div class="timeline-meta number">刚刚</div></li>`);
    });
  };
  const applyBusinessState = routeId => {
    const state = memory.business[routeId];
    if (!state) return;
    if (routeId === 'P03-13') {
      if (state.download) { setSummaryStatus('下载开关', state.download); setGateStatus('下载能力', state.download); }
      if (state.launch) { setSummaryStatus('启动开关', state.launch); setGateStatus('启动能力', state.launch); }
      if (state.game) setGateStatus('游戏发布状态', state.game);
      if (state.download === '允许下载') {
        setActionDisabled('resume-download', true);
        root.querySelectorAll('[data-primary-action]').forEach(control => { control.disabled = true; control.setAttribute('aria-disabled', 'true'); });
      }
      if (state.game === '已下架') setActionDisabled('unpublish-game', true);
    }
    renderMemoryRecords(state.records || []);
  };
  const updateBusinessState = (routeId, patch, record) => {
    const previous = memory.business[routeId] || { records: [] };
    memory.business[routeId] = { ...previous, ...patch, records: [...(previous.records || []), record] };
    applyBusinessState(routeId);
  };
  const handleBusinessAction = (routeId, action) => {
    const requireReason = (selector, label) => {
      const field = root.querySelector(selector);
      if (field?.value.trim()) {
        field.removeAttribute('aria-invalid');
        return true;
      }
      field?.setAttribute('aria-invalid', 'true');
      field?.focus();
      resultMessage(routeId, `请先填写${label}`, '说明问题现象、处置依据和影响范围后再执行。', 'warning');
      return false;
    };
    if (routeId === 'P03-13' && action === 'resume-download') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { download: '允许下载' }, '恢复下载 · 门禁校验通过');
      resultMessage(routeId, '下载已恢复', '当前线上版本已允许新增下载，处置记录已保存。');
      return true;
    }
    if (routeId === 'P03-13' && action === 'pause-launch') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { launch: '启动暂停' }, '暂停启动 · 影响已安装玩家');
      resultMessage(routeId, '启动已暂停', '新的启动请求已停止，处置记录已保存。', 'warning');
      return true;
    }
    if (routeId === 'P03-13' && action === 'unpublish-game') {
      if (!requireReason('.disposition-form textarea', '处置原因')) return true;
      updateBusinessState(routeId, { game: '已下架' }, '下架游戏 · 保留版本与历史记录');
      resultMessage(routeId, '游戏已下架', '版本文件、测试和发布历史未删除。', 'danger');
      return true;
    }
    return false;
  };

  const bindInteractions = ({ route, role, state }) => {
    root.querySelectorAll('a[href^="#/"]:not([data-demo-action])').forEach(link => link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const nextHash = event.currentTarget.getAttribute('href');
      if (!nextHash) return;
      if (location.hash === nextHash) render();
      else location.hash = nextHash;
    }));
    root.querySelectorAll('[data-portal-action]').forEach(control => control.addEventListener('click', event => {
      const action = event.currentTarget.dataset.portalAction;
      if (!action || event.currentTarget.disabled) return;
      if (action === 'home') {
        memory.shell.helpOpen = false;
        if (moduleConfig.id === '02') {
          updatePublisherWorkspace({ workspaceView: 'games', addGameOpen: false, gameMenuOpen: '' });
          return;
        }
        navigate({ routeId: role === 'operations' ? 'P01-08' : 'P01-01', state: 'default' });
        return;
      }
      if (action === 'go-console') {
        memory.shell.helpOpen = false;
        navigate({ routeId: 'P01-03', state: 'default' });
        return;
      }
      if (action === 'toggle-account-menu') {
        const menu = event.currentTarget.closest('[data-account-menu]');
        const open = !menu?.classList.contains('is-open');
        menu?.classList.toggle('is-open', open);
        event.currentTarget.setAttribute('aria-expanded', String(open));
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-tab') {
        const requested = event.currentTarget.dataset.publisherTab;
        updatePublisherWorkspace({ workspaceView: requested === 'data' ? 'data' : 'games', addGameOpen: false });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-game-search') {
        updatePublisherWorkspace({
          workspaceView: 'games',
          gameSearch: root.querySelector('[data-publisher-game-search]')?.value.trim() || '',
          gameStatusFilter: root.querySelector('[data-publisher-game-status]')?.value || 'all',
          gameMenuOpen: '',
          addGameOpen: false,
        });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-game-menu') {
        const gameKey = event.currentTarget.dataset.publisherGame || '';
        updatePublisherWorkspace({ gameMenuOpen: memory.page[route.id]?.gameMenuOpen === gameKey ? '' : gameKey });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-request-delete-game') {
        const gameKey = event.currentTarget.dataset.publisherGame || '';
        if (!['draft', 'created'].includes(gameKey)) return;
        if (gameKey === 'draft' && (memory.page[route.id]?.deletedGameKeys || []).includes('draft')) return;
        if (gameKey === 'created' && !memory.page[route.id]?.createdGame) return;
        updatePublisherWorkspace({ deleteGameKey: gameKey, gameMenuOpen: '', addGameOpen: false });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-cancel-delete-game') {
        updatePublisherWorkspace({ deleteGameKey: '', gameMenuOpen: '' });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-confirm-delete-game') {
        const gameKey = event.currentTarget.dataset.publisherGame || memory.page[route.id]?.deleteGameKey || '';
        if (gameKey === 'draft') {
          const deletedGameKeys = [...new Set([...(memory.page[route.id]?.deletedGameKeys || []), 'draft'])];
          updatePublisherWorkspace({ deletedGameKeys, deleteGameKey: '', gameMenuOpen: '', selectedGame: 'existing', workspaceView: 'games' });
          return;
        }
        if (gameKey === 'created') {
          updatePublisherWorkspace({ createdGame: null, deleteGameKey: '', gameMenuOpen: '', selectedGame: '', workspaceView: 'games' });
        }
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-copy-game-id') {
        const gameId = event.currentTarget.dataset.gameId || '';
        updatePublisherWorkspace({ gameMenuOpen: '' });
        resultMessage(route.id, 'Game ID 已准备复制', `${gameId} 可用于后台查询与接口配置。`, 'info');
        return;
      }
      if (route.id === 'P02-01' && action === 'open-add-game') {
        updatePublisherWorkspace({ workspaceView: 'games', addGameOpen: true, gameMenuOpen: '' });
        return;
      }
      if (route.id === 'P02-01' && action === 'close-add-game') {
        updatePublisherWorkspace({ addGameOpen: false });
        return;
      }
      if (route.id === 'P02-01' && action === 'create-publisher-game') {
        const nameField = root.querySelector('input[name="publisherGameName"]');
        const developerField = root.querySelector('input[name="publisherDeveloperName"]');
        const systemsField = root.querySelector('select[name="publisherSystems"]');
        const releaseMethodField = root.querySelector('select[name="publisherReleaseMethod"]');
        const name = String(nameField?.value || '').trim();
        if (!name) {
          nameField?.setAttribute('aria-invalid', 'true');
          nameField?.focus();
          resultMessage(route.id, '请填写游戏名称', '创建项目前需先填写游戏名称。', 'warning');
          return;
        }
        memory.page[route.id] = {
          ...(memory.page[route.id] || {}),
          workspaceView: 'games',
          addGameOpen: false,
          gameMenuOpen: '',
          createdGame: {
            name,
            developer: String(developerField?.value || '星海互动').trim(),
            systems: String(systemsField?.value || 'Windows'),
            releaseMethod: String(releaseMethodField?.value || '盖世直接下载'),
            gameId: 'GAME-58302',
          },
        };
        resultMessage(route.id, '游戏项目已创建', `已生成 Game ID GAME-58302；${name}当前为草稿，不代表通过发行审核。`);
        render();
        return;
      }
      if (route.id === 'P02-01' && action === 'enter-publisher-game') {
        const requestedGame = event.currentTarget.dataset.publisherGame || 'existing';
        if (!publisherFixtureGameKeys.has(requestedGame) && requestedGame !== 'created') return;
        if ((memory.page[route.id]?.deletedGameKeys || []).includes(requestedGame)) return;
        if (requestedGame === 'created' && !memory.page[route.id]?.createdGame) return;
        updatePublisherWorkspace({ workspaceView: 'game', selectedGame: requestedGame, gameTab: 'overview', gameSection: 'release-overview', addGameOpen: false, gameMenuOpen: '' });
        return;
      }
      if (route.id === 'P02-01' && action === 'back-publisher-games') {
        updatePublisherWorkspace({ workspaceView: 'games', addGameOpen: false, gameMenuOpen: '' });
        return;
      }
      if (route.id === 'P02-01' && action === 'enter-publisher-review') {
        const requestedGame = event.currentTarget.dataset.publisherGame || 'existing';
        if (!publisherFixtureGameKeys.has(requestedGame) && requestedGame !== 'created') return;
        if ((memory.page[route.id]?.deletedGameKeys || []).includes(requestedGame)) return;
        if (requestedGame === 'created' && !memory.page[route.id]?.createdGame) return;
        updatePublisherWorkspace({ workspaceView: 'game', selectedGame: requestedGame, gameTab: 'overview', gameSection: 'review-records', addGameOpen: false, gameMenuOpen: '' });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-open-cdkey') {
        updatePublisherWorkspace({ workspaceView: 'game', selectedGame: 'existing', gameTab: 'store', gameSection: 'cdkey', cdkeyTab: 0, addGameOpen: false, gameMenuOpen: '' });
        return;
      }
      if (route.id === 'P02-01' && action === 'game-console-tab') {
        const requested = event.currentTarget.dataset.gameTab || 'overview';
        const defaults = { overview: 'release-overview', store: 'store-profile', operations: 'announcements', services: 'appid-sdk', analytics: 'core-metrics' };
        const requestedSection = event.currentTarget.dataset.gameSection;
        updatePublisherWorkspace({ gameTab: defaults[requested] ? requested : 'overview', gameSection: requestedSection || defaults[requested] || defaults.overview });
        return;
      }
      if (route.id === 'P02-01' && action === 'game-console-section') {
        updatePublisherWorkspace({ gameSection: event.currentTarget.dataset.gameSection || 'release-overview' });
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-upload-build') {
        resultMessage(route.id, '已打开 PC 包体上传任务', '支持分片上传与断点续传；完成后再进行文件完整性校验。', 'info');
        return;
      }
      if (route.id === 'P02-01' && action === 'publisher-demo-feedback') {
        event.currentTarget.blur();
        return;
      }
      if (action === 'create-game') {
        if (route.id === 'P01-03') {
          memory.registration = { ...memory.registration, consoleTab: 'game-create', verificationNoticeOpen: false };
          persistRegistration();
          render();
          return;
        }
        memory.page['P01-05'] = { ...(memory.page['P01-05'] || {}), editorMode: 'create' };
        navigate({ routeId: 'P01-05', state: 'default' });
        return;
      }
      if (action === 'back-to-game-management') {
        memory.registration = { ...memory.registration, consoleTab: 'games' };
        persistRegistration();
        render();
        return;
      }
      if (action === 'enter-game-console') {
        navigate({ routeId: 'P01-04', state: 'default' });
        return;
      }
      if (action === 'back-to-games') {
        navigate({ routeId: 'P01-02', state: 'default' });
        return;
      }
      if (action === 'edit-game-profile') {
        memory.page['P01-05'] = { ...(memory.page['P01-05'] || {}), editorMode: 'edit' };
        navigate({ routeId: 'P01-05', state: 'default' });
        return;
      }
      if (action === 'open-publishing' || action === 'enter-game-review') {
        memory.page['P01-07'] = { ...(memory.page['P01-07'] || {}), releaseTab: 'audit', focusReview: true };
        navigate({ routeId: 'P01-07', state: 'default' });
        return;
      }
      if (action === 'qualification-workspace') {
        if (memory.qualification.status === 'approved') navigate({ routeId: 'P01-02', state: 'default' });
        return;
      }
      if (action === 'release-tab') {
        const target = event.currentTarget.dataset.releaseTab;
        root.querySelectorAll('[data-release-tab]').forEach(tab => {
          const active = tab === event.currentTarget;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', String(active));
        });
        root.querySelectorAll('[data-release-panel]').forEach(panel => { panel.hidden = panel.dataset.releasePanel !== target; });
        return;
      }
      if (action === 'view-release-issue') {
        const auditTab = root.querySelector('[data-release-tab="audit"]');
        auditTab?.click();
        root.querySelector('[data-review-record="pre-release"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (action === 'submit-release-application') {
        resultMessage(route.id, '申请尚不可提交', '请先按预发布审核意见完成修改；平台审核结果仍由运营依据线下结论录入。', 'warning');
        return;
      }
      if (action === 'create-game-project') {
        if (route.id === 'P01-03') {
          memory.registration = { ...memory.registration, consoleTab: 'games', createdGame: true };
          persistRegistration();
          resultMessage(route.id, '游戏项目已创建', '已生成 Game ID；游戏资料、商店与服务接入由后续 PRD 继续定义。');
          render();
          return;
        }
        resultMessage(route.id, '游戏项目已创建', '系统将为新项目生成独立 Game ID，并在建档完成后生成唯一 APPID。');
        return;
      }
      if (action === 'gamehub-login') {
        switchDeveloperAccount('gamehub:demo-user');
        navigate({ routeId: 'P01-03', state: 'default' });
        return;
      }
      if (action === 'toggle-language') {
        const current = event.currentTarget.dataset.currentLanguage || 'zh';
        const next = current === 'zh' ? 'en' : 'zh';
        memory.shell.language = next;
        writeStorage(localStorage, languageStorageKey, next);
        root.querySelectorAll('[data-login-panel]').forEach(panel => { panel.hidden = panel.dataset.loginPanel !== next; });
        event.currentTarget.dataset.currentLanguage = next;
        event.currentTarget.textContent = next === 'zh' ? 'English' : '中文';
        root.querySelector(`[data-login-panel="${next}"] input`)?.focus();
        return;
      }
      if (action === 'toggle-interface-language') {
        memory.shell.language = memory.shell.language === 'zh' ? 'en' : 'zh';
        writeStorage(localStorage, languageStorageKey, memory.shell.language);
        render();
        return;
      }
      if (action === 'logout') {
        memory.session.authenticated = false;
        try { sessionStorage.removeItem(sessionStorageKey); } catch { /* 当前页面仍可退出 */ }
        window.name = '';
        memory.shell.helpOpen = false;
        navigate({ routeId: 'P01-01', state: 'default' });
        return;
      }
      if (action === 'register-platform-developer') {
        memory.registration = { accountTier: 'registered', registeredAt: nowText(), consoleTab: 'games' };
        persistRegistration();
        render();
        return;
      }
      if (action === 'platform-console-tab') {
        const requestedTab = event.currentTarget.dataset.platformConsoleTab || 'games';
        memory.registration = { ...memory.registration, consoleTab: ['games', 'overview'].includes(requestedTab) ? requestedTab : 'games', verificationNoticeOpen: false };
        persistRegistration();
        render();
        return;
      }
      if (action === 'resource-category') {
        const category = event.currentTarget.dataset.resourceCategory;
        root.querySelectorAll('[data-resource-category]').forEach(button => button.classList.toggle('is-active', button === event.currentTarget));
        root.querySelectorAll('[data-resource-document]').forEach(documentPanel => { documentPanel.hidden = documentPanel.dataset.resourceDocument !== category; });
        return;
      }
      if (action === 'verification-required') {
        resultMessage(route.id, memory.shell.language === 'en' ? 'Company verification required' : '请先完成企业认证', memory.shell.language === 'en' ? 'Game creation becomes available after company verification is approved.' : '企业认证审核通过后，系统将自动开通游戏创建与发行能力。', 'warning');
        return;
      }
      if (action === 'open-cdkey-console' || action === 'cdkey-external-entry') {
        const cdkeyModule = modules.find(item => item.id === '02');
        if (cdkeyModule) {
          window.name = JSON.stringify({ source: 'gamehub-developer-platform', authenticated: true, qualification: memory.qualification.status, expiresAt: Date.now() + 30 * 60 * 1000 });
          location.href = `${cdkeyModule.output}#/P02-01${action === 'cdkey-external-entry' ? '?tab=0' : ''}`;
        }
        return;
      }
      if (action === 'start-company-verification') {
        if (memory.qualification.status === 'pending') {
          memory.registration = { ...memory.registration, accountTier: 'enterprise', consoleTab: 'games', verificationNoticeOpen: true, verificationNoticeSource: event.currentTarget.closest('[data-account-menu]') ? 'account-menu' : 'game-notice' };
          persistRegistration();
          render();
          requestAnimationFrame(() => root.querySelector('[data-existing-application-modal] [data-demo-action="qualification-existing-close"]')?.focus());
          return;
        }
        memory.registration = { ...memory.registration, accountTier: 'enterprise', consoleTab: 'games', verificationNoticeOpen: false };
        memory.qualification = { ...memory.qualification, step: 1, view: memory.qualification.status === 'rejected' ? 'form' : 'intro', editing: memory.qualification.status === 'rejected' };
        persistRegistration();
        render();
        return;
      }
      if (action === 'qualification-existing-open') {
        memory.registration = { ...memory.registration, accountTier: 'enterprise', registeredAt: memory.registration.registeredAt || memory.qualification.submittedAt || '2026-09-02 10:30', consoleTab: 'games', verificationNoticeOpen: false, verificationNoticeSource: '' };
        memory.qualification = { ...memory.qualification, view: 'form', readOnly: true, editing: false };
        persistRegistration();
        render();
        requestAnimationFrame(() => root.querySelector('[data-qualification-form-page]')?.focus());
        return;
      }
      if (action === 'qualification-withdraw') {
        const withdrawnAt = nowText();
        memory.qualificationPreview = null;
        memory.qualification = {
          ...memory.qualification,
          status: 'unsubmitted',
          step: 1,
          view: 'form',
          readOnly: false,
          editing: false,
          repairReason: '',
          rejectReason: '',
          delistReason: '',
          reviewedAt: '',
          reviewer: '',
          notification: null,
          form: cloneJson(memory.qualification.currentSubmission?.form || memory.qualification.form || createQualification(false).form),
          history: [...(memory.qualification.history || []), { action: '企业用户撤回认证申请', actor: '企业用户 王明', time: withdrawnAt }],
        };
        memory.registration = { ...memory.registration, accountTier: 'enterprise', consoleTab: 'games', verificationNoticeOpen: false };
        delete memory.result[route.id];
        persistRegistration();
        persistQualification();
        clearPreviewQuery();
        render();
        requestAnimationFrame(() => root.querySelector('[data-qualification-form-page]')?.focus());
        return;
      }
      if (action === 'qualification-resubmit-delisted') {
        const repairReason = memory.qualificationPreview?.delistReason || memory.qualification.delistReason || '';
        memory.qualificationPreview = null;
        memory.qualification = {
          ...memory.qualification,
          step: 1,
          view: 'form',
          readOnly: false,
          editing: true,
          repairReason,
          form: cloneJson(memory.qualification.currentSubmission?.form || memory.qualification.form || createQualification(false).form),
        };
        memory.registration = { ...memory.registration, accountTier: 'enterprise', consoleTab: 'games', verificationNoticeOpen: false };
        delete memory.result[route.id];
        clearPreviewQuery();
        render();
        requestAnimationFrame(() => root.querySelector('[data-qualification-form-page]')?.focus());
        return;
      }
      if (action === 'qualification-existing-close') {
        const restoreSelector = memory.registration.verificationNoticeSource === 'account-menu'
          ? '[data-portal-action="toggle-account-menu"]'
          : '[data-demo-action="qualification-existing-open"]';
        memory.registration = { ...memory.registration, verificationNoticeOpen: false, verificationNoticeSource: '' };
        persistRegistration();
        render();
        requestAnimationFrame(() => root.querySelector(restoreSelector)?.focus());
        return;
      }
      if (action === 'qualification-view') {
        if (memory.qualification.view === 'form') collectQualificationForm();
        memory.qualification = { ...memory.qualification, view: event.currentTarget.dataset.qualificationView === 'form' ? 'form' : 'intro' };
        render();
        return;
      }
      if (action === 'back-to-platform-console') {
        memory.registration = { ...memory.registration, accountTier: 'registered', consoleTab: 'games', verificationNoticeOpen: false };
        memory.qualification = { ...memory.qualification, view: 'intro', readOnly: false, editing: false };
        persistRegistration();
        render();
        return;
      }
      if (action === 'back-to-entry-choice') {
        if (memory.qualification.status !== 'unsubmitted' || Number(memory.qualification.revision) > 0) return;
        memory.registration = { accountTier: 'unselected', registeredAt: memory.registration.registeredAt || '' };
        memory.qualification = { ...memory.qualification, step: 0, editing: false };
        persistRegistration();
        render();
        return;
      }
      if (action === 'qualification-start') {
        memory.registration = { ...memory.registration, accountTier: 'enterprise' };
        persistRegistration();
        memory.qualification = { ...memory.qualification, step: 1, view: 'form' };
        render();
        return;
      }
      if (action === 'qualification-anchor') {
        root.querySelectorAll('[data-qualification-anchor]').forEach(anchor => anchor.classList.toggle('is-active', anchor === event.currentTarget));
        root.querySelector(`[data-qualification-section="${event.currentTarget.dataset.qualificationAnchor}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (action === 'qualification-agreement-link') {
        root.querySelector(`[data-agreement-document="${event.currentTarget.dataset.agreementTarget}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (action === 'qualification-example') {
        const modal = root.querySelector(`[data-qualification-example-modal="${event.currentTarget.dataset.exampleType}"]`);
        if (modal) {
          modal.hidden = false;
          modal.querySelector('[data-portal-action="qualification-example-close"]')?.focus();
        }
        return;
      }
      if (action === 'qualification-example-close') {
        event.currentTarget.closest('[data-qualification-example-modal]')?.setAttribute('hidden', '');
        return;
      }
      if (action === 'qualification-next') {
        const currentStep = Number(memory.qualification.step) || 1;
        if (!validateQualificationStep(currentStep)) return;
        memory.qualification.step = Math.min(5, currentStep + 1);
        render();
        return;
      }
      if (action === 'qualification-previous') {
        collectQualificationForm();
        memory.qualification.step = Math.max(1, (Number(memory.qualification.step) || 1) - 1);
        render();
        return;
      }
      if (action === 'qualification-restart') {
        const previous = memory.qualification;
        const hasSubmittedHistory = Number(previous.revision) > 0;
        memory.qualification = {
          ...previous,
          status: hasSubmittedHistory ? previous.status : 'unsubmitted',
          step: 0,
          view: 'form',
          editing: hasSubmittedHistory,
          form: createQualification(false).form,
          applicationId: previous.applicationId,
          revision: previous.revision,
          history: [...(previous.history || [])],
          submissions: [...(previous.submissions || [])],
          currentSubmission: previous.currentSubmission ? cloneJson(previous.currentSubmission) : null,
        };
        delete memory.result[route.id];
        render();
        return;
      }
      if (action === 'qualification-submit') {
        const currentForm = collectQualificationForm();
        if (!validateQualificationForm(currentForm)) return;
        memory.qualificationPreview = null;
        const form = cloneJson(currentForm);
        const submittedAt = nowText();
        const revision = (Number(memory.qualification.revision) || 0) + 1;
        const applicationId = memory.qualification.applicationId || 'ENT-20260903-001';
        const submission = {
          applicationId,
          revision,
          submittedAt,
          acceptedContentRevision: Number(memory.managedContent.revision) || 1,
          agreementAcceptedAt: submittedAt,
          agreementAcceptedBy: memory.session.authenticated ? '企业用户 王明' : '当前企业账号',
          form,
        };
        memory.qualification = {
          ...memory.qualification,
          applicationId,
          status: 'pending',
          step: 5,
          editing: false,
          revision,
          acceptedContentRevision: submission.acceptedContentRevision,
          submittedAt,
          reviewedAt: '',
          reviewer: '',
          repairReason: '',
          rejectReason: '',
          delistReason: '',
          notification: null,
          form,
          currentSubmission: submission,
          submissions: [...(memory.qualification.submissions || []), cloneJson(submission)],
          history: [...(memory.qualification.history || []), { action: `提交企业认证申请 REV-${String(revision).padStart(2, '0')}`, actor: '企业用户 王明', time: submittedAt }],
        };
        memory.registration = { ...memory.registration, accountTier: 'enterprise', registeredAt: memory.registration.registeredAt || submittedAt, consoleTab: 'games', verificationNoticeOpen: false };
        persistRegistration();
        persistQualification();
        // 提交后的待审核状态统一由控制台顶部提示条承载，避免旧的结果条与审核中提示重复展示。
        delete memory.result[route.id];
        clearPreviewQuery();
        render();
        return;
      }
      if (action === 'qualification-edit-rejected') {
        const repairReason = memory.qualificationPreview?.rejectReason || memory.qualification.rejectReason || '';
        memory.qualificationPreview = null;
        memory.qualification.editing = true;
        memory.qualification.readOnly = false;
        memory.qualification.step = 1;
        memory.qualification.view = 'form';
        memory.qualification.repairReason = repairReason;
        memory.qualification.form = cloneJson(memory.qualification.currentSubmission?.form || memory.qualification.form || createQualification(false).form);
        memory.registration = { ...memory.registration, accountTier: 'enterprise', consoleTab: 'games', verificationNoticeOpen: false };
        delete memory.result[route.id];
        clearPreviewQuery();
        render();
        requestAnimationFrame(() => root.querySelector('[data-qualification-section="subject"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        return;
      }
      if (action === 'review-application') {
        memory.operationsReview = { view: 'detail', actionMode: '', attachmentMode: '', selectedApplicationId: event.currentTarget.dataset.applicationId || memory.qualification.applicationId || '' };
        render();
        return;
      }
      if (action === 'review-application-back') {
        memory.operationsReview = { ...memory.operationsReview, view: 'list', actionMode: '', attachmentMode: '' };
        delete memory.result[route.id];
        render();
        return;
      }
      if (action === 'qualification-review-attachment-open') {
        memory.operationsReview.actionMode = '';
        memory.operationsReview.attachmentMode = event.currentTarget.dataset.attachmentType || '';
        render();
        requestAnimationFrame(() => root.querySelector('[data-review-attachment-modal] [aria-label="关闭附件预览"]')?.focus());
        return;
      }
      if (action === 'qualification-review-attachment-close') {
        memory.operationsReview.attachmentMode = '';
        render();
        return;
      }
      if (action === 'qualification-review-action-open') {
        memory.operationsReview.actionMode = event.currentTarget.dataset.reviewAction || '';
        memory.operationsReview.attachmentMode = '';
        memory.operationsReview.selectedApplicationId = memory.qualification.applicationId || '';
        render();
        requestAnimationFrame(() => (root.querySelector('[name="reviewReason"]') || root.querySelector('[data-review-action-modal] .gh-button[data-variant="primary"]'))?.focus());
        return;
      }
      if (action === 'qualification-review-action-close') {
        memory.operationsReview.actionMode = '';
        render();
        return;
      }
      if (action === 'qualification-review-filter') {
        const keyword = root.querySelector('[data-review-filter-keyword]')?.value.trim().toLowerCase() || '';
        const statusValue = root.querySelector('[data-review-filter-status]')?.value || '';
        const startDate = root.querySelector('[data-review-filter-start]')?.value || '';
        const endDate = root.querySelector('[data-review-filter-end]')?.value || '';
        const rows = [...root.querySelectorAll('[data-qualification-review-row]')];
        let visible = 0;
        rows.forEach(row => {
          const submittedDate = row.dataset.submittedDate || '';
          const matches = (!keyword || (row.dataset.keywords || '').toLowerCase().includes(keyword))
            && (!statusValue || row.dataset.status === statusValue)
            && (!startDate || submittedDate >= startDate)
            && (!endDate || submittedDate <= endDate);
          row.hidden = !matches;
          if (matches) visible += 1;
        });
        const empty = root.querySelector('[data-review-filter-empty]');
        if (empty) empty.hidden = visible > 0;
        return;
      }
      if (action === 'qualification-review-reset') {
        root.querySelectorAll('[data-review-filter-keyword], [data-review-filter-status], [data-review-filter-start], [data-review-filter-end]').forEach(field => { field.value = ''; });
        root.querySelector('[data-portal-action="qualification-review-filter"]')?.click();
        return;
      }
      if (['qualification-preview-pending', 'qualification-preview-approved', 'qualification-preview-rejected', 'qualification-preview-delisted'].includes(action)) {
        const nextStatus = action.replace('qualification-preview-', '');
        const reviewedAt = nextStatus === 'pending' ? '' : nowText();
        const isEnglish = memory.shell.language === 'en';
        const sourceHistory = memory.qualification.history || [];
        const lastSubmissionIndex = sourceHistory.findLastIndex(item => /提交企业认证申请|submitted company verification/i.test(String(item?.action || '')));
        const previewHistory = cloneJson(lastSubmissionIndex >= 0 ? sourceHistory.slice(0, lastSubmissionIndex + 1) : sourceHistory.filter(item => !item.previewStatus));
        if (nextStatus === 'approved') previewHistory.push({ action: isEnglish ? 'Company verification approved' : '企业认证审核通过', actor: isEnglish ? 'Platform operations' : '平台运营 李然', time: reviewedAt, previewStatus: true });
        if (nextStatus === 'rejected') previewHistory.push({ action: isEnglish ? 'Company verification rejected: The business license image is unclear.' : '企业认证审核拒绝：工商执照证明图片不清晰，请上传完整、无遮挡的彩色扫描件。', actor: isEnglish ? 'Platform operations' : '平台运营 李然', time: reviewedAt, previewStatus: true });
        if (nextStatus === 'delisted') previewHistory.push({ action: isEnglish ? 'Publishing access delisted: Contact developer support.' : '企业发行合作资格已下架：请联系开发者支持。', actor: isEnglish ? 'Platform operations' : '平台运营 李然', time: reviewedAt, previewStatus: true });
        const previewForm = { ...createQualification(true).form, ...(memory.qualification.form || {}) };
        memory.qualificationPreview = {
          ...memory.qualification,
          status: nextStatus,
          editing: false,
          repairReason: '',
          reviewedAt,
          reviewer: nextStatus === 'pending' ? '' : (isEnglish ? 'Platform operations' : '平台运营 李然'),
          rejectReason: nextStatus === 'rejected'
            ? (isEnglish ? 'The business license image is unclear. Upload a complete, unobstructed color scan.' : '工商执照证明图片不清晰，请上传完整、无遮挡的彩色扫描件。')
            : '',
          delistReason: nextStatus === 'delisted'
            ? (isEnglish ? 'Company publishing access was delisted. Contact developer support to confirm recovery conditions.' : '发现企业主体信息发生变更，请联系开发者支持确认恢复条件。')
            : '',
          notification: nextStatus === 'pending' ? null : buildReviewNotification({
            status: nextStatus,
            vendorName: previewForm.vendorName,
            email: previewForm.email,
            mobile: previewForm.mobile,
            sentAt: reviewedAt,
            mode: 'preview',
          }),
          history: previewHistory,
        };
        delete memory.result[route.id];
        clearPreviewQuery();
        render();
        return;
      }
      if (action === 'qualification-approve') {
        applyQualificationReview(route.id, 'approved');
        return;
      }
      if (action === 'content-language') {
        collectManagedContentForm();
        memory.contentEditor.language = event.currentTarget.dataset.contentLanguage === 'en' ? 'en' : 'zh';
        render();
        return;
      }
      if (action === 'content-help-tab') {
        collectManagedContentForm();
        memory.contentEditor.helpTab = event.currentTarget.dataset.contentHelpTab === 'document' ? 'document' : 'navigation';
        memory.contentEditor.view = 'list';
        memory.contentEditor.entity = '';
        memory.contentEditor.selectedId = '';
        memory.contentEditor.search = '';
        render();
        return;
      }
      if (action === 'content-create') {
        collectManagedContentForm();
        const entity = event.currentTarget.dataset.contentEntity;
        const collectionName = contentCollection(entity);
        const collection = memory.contentEditor.draft?.[collectionName];
        if (!collectionName || !Array.isArray(collection)) return;
        let item;
        if (entity === 'certification') {
          const positions = ['intro', 'nda', 'cooperation'];
          const nextPosition = positions.find(position => !collection.some(article => article.position === position));
          if (!nextPosition) {
            resultMessage(route.id, '暂无可创建的文章位置', '认证介绍、保密协议和合作协议均已配置；删除对应文章后可重新创建。', 'warning');
            return;
          }
          item = { id: nextContentId(entity), position: nextPosition, status: 'draft', updatedAt: nowText(), zh: { title: '', bodyHtml: '<p><br></p>' }, en: { title: '', bodyHtml: '<p><br></p>' } };
        } else if (entity === 'navigation') {
          item = { id: nextContentId(entity), sortOrder: collection.length + 1, status: 'draft', updatedAt: nowText(), zh: { title: '未命名导航' }, en: { title: 'Untitled navigation' } };
          memory.contentEditor.helpTab = 'navigation';
        } else if (entity === 'document') {
          const navigation = [...(memory.contentEditor.draft.helpNavigations || [])].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))[0];
          if (!navigation) {
            resultMessage(route.id, '请先创建导航', '目录子文档必须归属于一个已存在的导航。', 'warning');
            return;
          }
          const order = (collection.filter(document => document.navigationId === navigation.id).length || 0) + 1;
          item = { id: nextContentId(entity), navigationId: navigation.id, sortOrder: order, status: 'draft', updatedAt: nowText(), zh: { title: '未命名子文档', bodyHtml: '<p><br></p>' }, en: { title: 'Untitled document', bodyHtml: '<p><br></p>' } };
          memory.contentEditor.helpTab = 'document';
        } else {
          return;
        }
        collection.push(item);
        memory.contentEditor.entity = entity;
        memory.contentEditor.selectedId = item.id;
        memory.contentEditor.view = 'editor';
        persistManagedContentDraft();
        delete memory.result[route.id];
        render();
        return;
      }
      if (action === 'content-edit') {
        collectManagedContentForm();
        memory.contentEditor.entity = event.currentTarget.dataset.contentEntity || '';
        memory.contentEditor.selectedId = event.currentTarget.dataset.contentId || '';
        memory.contentEditor.view = 'editor';
        delete memory.result[route.id];
        render();
        return;
      }
      if (action === 'content-back') {
        collectManagedContentForm();
        const collection = memory.contentEditor.draft?.[contentCollection(memory.contentEditor.entity)] || [];
        const selected = collection.find(item => item.id === memory.contentEditor.selectedId);
        if (selected) {
          selected.status = 'draft';
          selected.updatedAt = nowText();
        }
        persistManagedContentDraft();
        memory.contentEditor.view = 'list';
        memory.contentEditor.entity = '';
        memory.contentEditor.selectedId = '';
        resultMessage(route.id, '内容已保存为草稿', '草稿不会影响开发者端；请在列表中点击“发布”后生效。', 'success');
        render();
        return;
      }
      if (action === 'content-delete-open') {
        memory.contentEditor.deleteTarget = { entity: event.currentTarget.dataset.contentEntity || '', id: event.currentTarget.dataset.contentId || '' };
        render();
        return;
      }
      if (action === 'content-delete-close') {
        memory.contentEditor.deleteTarget = null;
        render();
        return;
      }
      if (action === 'content-delete-confirm') {
        const target = memory.contentEditor.deleteTarget || {};
        const collectionName = contentCollection(target.entity);
        const collection = memory.contentEditor.draft?.[collectionName] || [];
        const index = collection.findIndex(item => item.id === target.id);
        if (target.entity === 'navigation' && (memory.contentEditor.draft.helpDocuments || []).some(document => document.navigationId === target.id)) {
          memory.contentEditor.deleteTarget = null;
          resultMessage(route.id, '该导航仍有子文档，无法删除', '请先迁移或删除该导航下的目录子文档。', 'warning');
          render();
          return;
        }
        if (index >= 0) {
          const [removed] = collection.splice(index, 1);
          if (target.entity === 'navigation') resequenceContent(collection);
          if (target.entity === 'document') resequenceContent(collection, item => item.navigationId === removed.navigationId);
          const publishedCollection = memory.managedContent?.[collectionName] || [];
          const publishedIndex = publishedCollection.findIndex(item => item.id === target.id);
          if (publishedIndex >= 0) {
            publishedCollection.splice(publishedIndex, 1);
            const publishedAt = nowText();
            const nextRevision = (Number(memory.managedContent.revision) || 0) + 1;
            memory.managedContent = syncManagedContentPublicFields({
              ...memory.managedContent,
              revision: nextRevision,
              publishedAt,
              publishedBy: '平台运营 李然',
            });
            writeStorage(localStorage, managedContentStorageKey, memory.managedContent);
          }
          persistManagedContentDraft();
          memory.contentEditor.deleteTarget = null;
          memory.contentEditor.view = 'list';
          resultMessage(route.id, '删除成功', publishedIndex >= 0 ? `${removed.id} 已删除，并同步从开发者端移除。` : `${removed.id} 草稿已删除。`, 'success');
          render();
          return;
        }
        memory.contentEditor.deleteTarget = null;
        render();
        return;
      }
      if (action === 'content-sort') {
        collectManagedContentForm();
        const entity = event.currentTarget.dataset.contentEntity || '';
        const id = event.currentTarget.dataset.contentId || '';
        const direction = event.currentTarget.dataset.contentDirection === 'down' ? 1 : -1;
        const collection = memory.contentEditor.draft?.[contentCollection(entity)] || [];
        const current = collection.find(item => item.id === id);
        if (!current || entity === 'certification') return;
        const group = collection.filter(item => entity !== 'document' || item.navigationId === current.navigationId).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
        const index = group.findIndex(item => item.id === id);
        const target = group[index + direction];
        if (!target) return;
        const currentOrder = current.sortOrder;
        current.sortOrder = target.sortOrder;
        target.sortOrder = currentOrder;
        current.status = 'draft';
        target.status = 'draft';
        current.updatedAt = nowText();
        target.updatedAt = nowText();
        persistManagedContentDraft();
        render();
        return;
      }
      if (action === 'content-search') {
        memory.contentEditor.search = root.querySelector('[data-content-search]')?.value.trim() || '';
        render();
        return;
      }
      if (action === 'content-search-reset') {
        memory.contentEditor.search = '';
        memory.contentEditor.navigationFilter = '';
        render();
        return;
      }
      if (action === 'rich-editor-command') {
        const editorBody = event.currentTarget.closest('[data-rich-editor]')?.querySelector('[data-rich-editor-body]');
        if (!editorBody) return;
        editorBody.focus();
        document.execCommand(event.currentTarget.dataset.richCommand || '', false, event.currentTarget.dataset.richValue || null);
        return;
      }
      if (action === 'rich-editor-link') {
        const editorBody = event.currentTarget.closest('[data-rich-editor]')?.querySelector('[data-rich-editor-body]');
        if (!editorBody) return;
        const rawUrl = prompt('请输入链接地址（https://）', 'https://');
        if (!rawUrl) return;
        const url = /^https:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim().replace(/^\/+/, '')}`;
        editorBody.focus();
        document.execCommand('createLink', false, url);
        return;
      }
      if (action === 'rich-editor-image') {
        document.getElementById(event.currentTarget.dataset.richImageTarget || '')?.click();
        return;
      }
      if (action === 'content-publish-item') {
        collectManagedContentForm();
        const entity = event.currentTarget.dataset.contentEntity || '';
        const id = event.currentTarget.dataset.contentId || '';
        const collectionName = contentCollection(entity);
        const draftCollection = memory.contentEditor.draft?.[collectionName] || [];
        const item = draftCollection.find(entry => entry.id === id);
        const issue = validateManagedContentItem(entity, item, memory.contentEditor.draft);
        if (issue) {
          memory.contentEditor.language = issue.language;
          memory.contentEditor.entity = entity;
          memory.contentEditor.selectedId = id;
          memory.contentEditor.view = issue.parentMissing ? 'list' : 'editor';
          memory.result[route.id] = {
            title: `请完善${issue.label}`,
            detail: issue.parentMissing ? '目录子文档只能发布到已发布的导航下，请先发布所属导航。' : '中文与 English 内容完整后才能发布；当前线上内容不受影响。',
            variant: 'warning',
          };
          render();
          return;
        }
        const publishedAt = nowText();
        const nextRevision = (Number(memory.managedContent.revision) || 0) + 1;
        const publishedSource = cloneJson(memory.managedContent);
        const publishedCollection = publishedSource[collectionName] || (publishedSource[collectionName] = []);
        const publishedIndex = publishedCollection.findIndex(entry => entry.id === id);
        const publishedItem = { ...cloneJson(item), status: 'published', updatedAt: publishedAt, publishedAt };
        if (publishedIndex >= 0) publishedCollection[publishedIndex] = publishedItem;
        else publishedCollection.push(publishedItem);
        const published = syncManagedContentPublicFields({
          ...publishedSource,
          revision: nextRevision,
          publishedAt,
          publishedBy: '平台运营 李然',
        });
        published.zh.help.contact.email = 'dev@xiaoji.com';
        published.en.help.contact.email = 'dev@xiaoji.com';
        memory.managedContent = published;
        item.status = 'published';
        item.updatedAt = publishedAt;
        item.publishedAt = publishedAt;
        memory.contentEditor.draft.revision = nextRevision;
        memory.contentEditor.draft.publishedAt = publishedAt;
        writeStorage(localStorage, managedContentStorageKey, published);
        persistManagedContentDraft();
        memory.result[route.id] = { title: `${item?.[memory.contentEditor.language]?.title || id} 已发布`, detail: `已生成线上版本 V${nextRevision}，开发者端立即读取本条最新内容。`, variant: 'success' };
        render();
        return;
      }
      if (action === 'qualification-reject') {
        const reasonField = root.querySelector('[name="reviewReason"]');
        const rejectReason = reasonField?.value.trim() || '';
        if (!rejectReason) {
          reasonField?.setAttribute('aria-invalid', 'true');
          reasonField?.focus();
          resultMessage(route.id, '请填写拒绝原因', '拒绝原因将同步给企业用户，不能为空。', 'warning');
          return;
        }
        applyQualificationReview(route.id, 'rejected', rejectReason);
        return;
      }
      if (action === 'qualification-delist') {
        const reasonField = root.querySelector('[name="reviewReason"]');
        const delistReason = reasonField?.value.trim() || '';
        if (!delistReason) {
          reasonField?.setAttribute('aria-invalid', 'true');
          reasonField?.focus();
          resultMessage(route.id, '请填写下架原因', '下架原因将同步给企业用户，不能为空。', 'warning');
          return;
        }
        applyQualificationReview(route.id, 'delisted', delistReason);
        return;
      }
      if (action === 'send-verification-code') {
        const sendButton = event.currentTarget;
        const language = event.currentTarget.dataset.codeLanguage || 'zh';
        const panel = root.querySelector(`[data-login-panel="${language}"]`);
        const account = panel?.querySelector('input[name="loginAccount"]');
        const accountValue = account?.value.trim() || '';
        const valid = language === 'zh' ? /^1\d{10}$/.test(accountValue) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountValue);
        if (!valid) {
          account?.setAttribute('aria-invalid', 'true');
          account?.focus();
          setLoginFieldMessage(panel, 'account', language === 'zh' ? '请输入 11 位手机号' : 'Enter a valid email address');
          return;
        }
        account.removeAttribute('aria-invalid');
        setLoginFieldMessage(panel, 'account');
        const label = sendButton.querySelector('span');
        let seconds = 60;
        sendButton.disabled = true;
        sendButton.setAttribute('aria-disabled', 'true');
        if (label) label.textContent = language === 'zh' ? `已发送（${seconds}s）` : `Sent (${seconds}s)`;
        const timer = setInterval(() => {
          seconds -= 1;
          if (seconds <= 0 || !sendButton.isConnected) {
            clearInterval(timer);
            if (sendButton.isConnected) {
              sendButton.disabled = false;
              sendButton.removeAttribute('aria-disabled');
              if (label) label.textContent = language === 'zh' ? '重新获取' : 'Resend';
            }
            return;
          }
          if (label) label.textContent = language === 'zh' ? `已发送（${seconds}s）` : `Sent (${seconds}s)`;
        }, 1000);
        setLoginFieldMessage(panel, 'code', language === 'zh' ? '验证码已发送，请查看手机短信' : 'Verification code sent. Check your email.', 'info');
        return;
      }
      if (action === 'open-help') { toggleHelp(true); return; }
      if (action === 'close-help') { toggleHelp(false); return; }
      if (action === 'open-login') {
        toggleHelp(false);
        const loginView = root.querySelector('[data-developer-login]');
        if (loginView) loginView.hidden = false;
        root.querySelector(`[data-login-panel="${memory.shell.language === 'en' ? 'en' : 'zh'}"] input`)?.focus();
        return;
      }
      if (action === 'close-login') {
        const loginView = root.querySelector('[data-developer-login]');
        if (loginView) loginView.hidden = true;
        return;
      }
      if (action === 'public-scroll') {
        root.querySelector(`#${event.currentTarget.dataset.publicTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (action === 'search-help') { searchHelp(); return; }
      if (action === 'help-topic') {
        const topic = event.currentTarget.dataset.helpTopic;
        selectHelpTopic(topic);
        return;
      }
      if (action === 'cdkey-tab') {
        setCdkeyTab(route.id, Number(event.currentTarget.dataset.tabIndex));
        return;
      }
      if (action === 'cdkey-jump-tab') {
        setCdkeyTab(route.id, Number(event.currentTarget.dataset.cdkeyTargetTab));
        root.querySelector('.workspace')?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (action === 'view-supply-exception') {
        if (route.id === 'P02-01') {
          resultMessage(route.id, '外部 Key 库存低于阈值', '该类 Key 只能由供应商或运营受控入库，平台不生成、不替换。', 'warning');
          return;
        }
        const target = routes.find(item => item.id === 'P02-02');
        if (target) navigate({ routeId: target.id, state: 'default' });
        return;
      }
      if (action === 'view-key-batch') {
        const target = event.currentTarget.closest('.key-batch-item');
        target?.classList.toggle('is-expanded');
        resultMessage(route.id, '批次详情已展开', '可查看用途、渠道、地区、配额、有效期与明文下载状态。', 'info');
        return;
      }
      if (action === 'add-credential-scope') {
        resultMessage(route.id, '可添加已授权 Scope', '仅展示当前厂商已获授权的 Game／SKU、地区和剩余额度。', 'info');
        return;
      }
      if (route.id === 'P02-05') {
        const targetTab = { 'create-key-batch': 1, 'create-api-credential': 2, 'api-doc-section': 3 }[action];
        if (Number.isInteger(targetTab)) { openCdkeyTab(targetTab); return; }
      }
      if (action === 'create-key-batch') {
        const target = root.querySelector('[data-key-batch-result]');
        if (!target) { openCdkeyTab(1); return; }
        target.innerHTML = '<div class="one-time-result" data-key-batch-generating><strong>生成中</strong><span>正在按当前授权范围校验配额并生成盖世平台 Key。</span></div>';
        setActionDisabled('create-key-batch', true);
        setTimeout(() => {
          const fileName = 'KEY-20260903-002.csv';
          target.innerHTML = `<div class="one-time-result" data-one-time-key-download><strong>批次生成成功</strong><span>${fileName}；请在当前有效窗口内完成一次性下载，成功后不能再次查看 Key 明文。</span><div class="form-actions">${c.button({ label: '下载 CSV', variant: 'primary', action: 'download-key-csv' })}</div></div>`;
          target.querySelector('[data-portal-action="download-key-csv"]')?.addEventListener('click', clickEvent => {
            downloadTextFile(fileName, 'key,batch_id,game_id,sku_id\nGH-7Q4M-9K2P-X8LW,KEY-20260903-002,GAME-48291,SKU-CN-001\n', 'text/csv;charset=utf-8');
            clickEvent.currentTarget.closest('[data-one-time-key-download]')?.remove();
            resultMessage(route.id, 'CSV 已下载', '一次性下载窗口已关闭，后续仅保留批次信息和审计记录。');
          });
          resultMessage(route.id, 'Key 批次已创建', '2000 个盖世平台 Key 已进入一次性下载窗口。');
        }, 300);
        return;
      }
      if (action === 'create-api-credential' || action === 'rotate-api-credential') {
        const target = root.querySelector('[data-credential-result]');
        if (!target) { openCdkeyTab(2); return; }
        const secret = createSecret();
        target.innerHTML = `<div class="one-time-result" data-one-time-secret><strong>client_secret 仅显示一次</strong><span>请立即复制或下载。关闭提示、刷新或离开页面后均无法恢复。</span><code>${c.escapeHtml(secret)}</code><div class="form-actions">${c.button({ label: '复制 Secret', action: 'copy-one-time-secret' })}${c.button({ label: '下载 TXT', action: 'download-one-time-secret' })}${c.button({ label: '我已保存并关闭', variant: 'primary', action: 'acknowledge-secret' })}</div></div>`;
        target.querySelector('[data-portal-action="copy-one-time-secret"]')?.addEventListener('click', () => {
          if (!navigator.clipboard?.writeText) {
            resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择 Secret。', 'warning');
            return;
          }
          navigator.clipboard.writeText(secret)
            .then(() => resultMessage(route.id, 'Secret 已复制', '仍请在关闭当前窗口前保存到安全位置。'))
            .catch(() => resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择 Secret。', 'warning'));
        });
        target.querySelector('[data-portal-action="download-one-time-secret"]')?.addEventListener('click', () => {
          downloadTextFile('gamehub-channel-secret.txt', `client_id=cli_xh_20260901\nclient_secret=${secret}\n`, 'text/plain;charset=utf-8');
          resultMessage(route.id, 'Secret 文件已下载', '下载文件不会再次生成，请妥善保管。');
        });
        target.querySelector('[data-portal-action="acknowledge-secret"]')?.addEventListener('click', clickEvent => {
          clickEvent.currentTarget.closest('[data-one-time-secret]')?.remove();
          resultMessage(route.id, 'Secret 已隐藏', '后续只显示末四位；遗失时必须轮换。', 'warning');
        });
        resultMessage(route.id, action === 'create-api-credential' ? '渠道凭据已创建' : '渠道凭据已轮换', action === 'create-api-credential' ? '本次关闭后只显示末四位。' : '旧 Secret 已失效；本次关闭后只显示末四位。');
        return;
      }
      if (['pause-api-credential', 'resume-api-credential', 'revoke-api-credential', 'pause-key-batch', 'resume-key-batch', 'void-key-batch'].includes(action)) {
        const recordLabel = {
          'pause-api-credential': '暂停渠道凭据',
          'resume-api-credential': '恢复渠道凭据',
          'revoke-api-credential': '撤销渠道凭据',
          'pause-key-batch': '暂停 Key 批次',
          'resume-key-batch': '恢复 Key 批次',
          'void-key-batch': '作废未分配库存',
        }[action];
        updateBusinessState(route.id, { lastCdkeyAction: action }, `${recordLabel} · 状态更新成功`);
        const keyStatus = root.querySelector('[data-cdkey-panel="batches"] .status-tag');
        const credentialStatus = root.querySelector('[data-cdkey-panel="credentials"] .status-tag');
        if (action === 'pause-key-batch') setStatusTag(keyStatus, '已暂停');
        if (action === 'resume-key-batch') setStatusTag(keyStatus, '可用');
        if (action === 'void-key-batch') setStatusTag(keyStatus, '已作废');
        if (action === 'pause-api-credential') setStatusTag(credentialStatus, '已暂停');
        if (action === 'resume-api-credential') setStatusTag(credentialStatus, '正常');
        if (action === 'revoke-api-credential') setStatusTag(credentialStatus, '已撤销');
        resultMessage(route.id, '状态已更新', '历史审计和已交付记录继续保留。', action.includes('revoke') || action.includes('void') ? 'danger' : 'warning');
        return;
      }
      if (action === 'api-doc-section') {
        const apiTarget = event.currentTarget.dataset.apiTarget;
        if (apiTarget) root.querySelector(`#${apiTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else resultMessage(route.id, '接口说明入口已打开', '渠道 API 使用 HMAC-SHA256、request_id 幂等与分配确认机制。', 'info');
        return;
      }
      if (action === 'filter-api-error') {
        resultMessage(route.id, `错误码：${event.currentTarget.textContent.trim()}`, '已定位对应错误说明。', 'info');
        return;
      }
      if (action === 'copy-api-example') {
        const example = root.querySelector('.code-block code')?.textContent || '';
        if (!navigator.clipboard?.writeText) {
          resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择示例文本。', 'warning');
          return;
        }
        navigator.clipboard.writeText(example)
          .then(() => resultMessage(route.id, '示例已复制', '仅写入当前浏览器剪贴板。'))
          .catch(() => resultMessage(route.id, '复制失败', '当前浏览器未授予剪贴板权限，请手动选择示例文本。', 'warning'));
        return;
      }
      if (action === 'retry-state' || action === 'default-state') {
        const allowed = routes.find(item => item.role === role) || routes.find(item => item.id === moduleConfig.defaultRoute) || routes[0];
        navigate({ routeId: state === 'permission' ? allowed.id : route.id, state: 'default' });
        return;
      }
      if (action === 'login') {
        const activePanel = root.querySelector('[data-login-panel]:not([hidden])');
        const language = activePanel?.dataset.loginPanel || 'zh';
        const account = activePanel?.querySelector('input[name="loginAccount"]');
        const code = activePanel?.querySelector(`input[name="${language}-verification-code"]`);
        const accountValid = language === 'zh' ? /^1\d{10}$/.test(account?.value.trim() || '') : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account?.value.trim() || '');
        if (!accountValid) {
          account?.setAttribute('aria-invalid', 'true');
          account?.focus();
          setLoginFieldMessage(activePanel, 'account', language === 'zh' ? '请输入 11 位手机号' : 'Enter a valid email address');
          return;
        }
        account.removeAttribute('aria-invalid');
        setLoginFieldMessage(activePanel, 'account');
        if (!/^\d{6}$/.test(code?.value.trim() || '')) {
          code?.setAttribute('aria-invalid', 'true');
          code?.focus();
          setLoginFieldMessage(activePanel, 'code', language === 'zh' ? '请输入 6 位验证码' : 'Enter the 6-digit verification code');
          return;
        }
        code.removeAttribute('aria-invalid');
        setLoginFieldMessage(activePanel, 'code');
        memory.shell.language = language;
        writeStorage(localStorage, languageStorageKey, language);
        const accountValue = account.value.trim();
        const accountKey = language === 'zh' ? `phone:${accountValue}` : `email:${accountValue.toLowerCase()}`;
        switchDeveloperAccount(accountKey);
        navigate({ routeId: 'P01-03', state: 'default' });
        return;
      }
      if (action.startsWith('primary-')) {
        if (route.id === 'P02-01') { setCdkeyTab(route.id, 1); return; }
        if (route.id === 'P04-03') {
          const cdkeyModule = modules.find(item => item.id === '02');
          if (cdkeyModule) location.href = `${cdkeyModule.output}#/P02-01`;
          return;
        }
        const businessAction = primaryBusinessAction(route.id);
        if (businessAction && handleBusinessAction(route.id, businessAction)) return;
        const destination = primaryDestination(route.id);
        if (destination) navigate({ routeId: destination, state: 'default' });
        else resultMessage(route.id, '操作已完成', '最新状态已保存。');
        return;
      }
      if (handleBusinessAction(route.id, action)) return;
      if (action === 'record-offline-result') { resultMessage(route.id, '线下结果已保存', '结果、原因、审核人、时间和提交快照已写入审计记录。'); return; }
      if (action === 'rollback-release') {
        updateBusinessState(route.id, { pointer: '0.9.0' }, '回滚历史 Build · 三组 Release Pointer 原子切换');
        resultMessage(route.id, '回滚配置已提交', '三组 OS／架构 Pointer 已切换到 0.9.0；历史 Build、Manifest 与 Chunk 均保留。', 'warning');
        return;
      }
      if (action === 'create-campaign') { resultMessage(route.id, 'Campaign 已创建', '已生成唯一 campaign_id 与 UTM 追踪链接；不触发自动广告投放。'); return; }
      if (action === 'submit-resource-request') { resultMessage(route.id, '资源需求已提交', '已生成新修订并进入处理中；该状态不代表资源承诺。', 'info'); return; }
      if (action === 'generate-export') {
        const target = root.querySelector('[data-export-result]');
        if (target) target.innerHTML = '<div class="one-time-result"><strong>聚合文件生成成功</strong><span>EXP-20260903-001 · 120 行 · XLSX／CSV；下载地址短期有效。</span></div>';
        resultMessage(route.id, '聚合文件已生成', '文件复用 QRY-20260903-001，未包含用户、订单、设备或 Key 明文。');
        return;
      }
      if (action === 'download-sdk') { resultMessage(route.id, 'SDK 下载已开始', '请在下载完成后核对版本与 SHA-256 校验值。', 'info'); return; }
      if (action === 'open-sdk-docs') { resultMessage(route.id, '接入文档已打开', '仅已授权的开发者账号可以访问接入文档。', 'info'); return; }
      if (action === 'send-password-setup') { resultMessage(route.id, '密码设置邮件已发送', '仅向已验证邮箱发送；不会创建第二个 account_id。', 'info'); return; }
      if (action === 'save-draft') {
        const now = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
        memory.page[route.id] = { ...(memory.page[route.id] || {}), savedAt: now };
        root.querySelectorAll('[data-save-state]').forEach(node => { node.textContent = `最近保存：${now}`; });
        resultMessage(route.id, '草稿已保存', '提交审核前可继续修改。');
        return;
      }
      if (action === 'approve') { resultMessage(route.id, '审核已通过', '审核结果已保存并写入处理记录。'); return; }
      if (action === 'reject') { resultMessage(route.id, '已驳回并记录原因', '请开发者修改后重新提交。', 'danger'); return; }
      if (action === 'start-upload') {
        memory.upload[route.id] = 'uploading';
        const bar = root.querySelector('[data-upload-progress]');
        const label = root.querySelector('[data-upload-label]');
        if (bar) bar.style.width = '82%';
        if (label) label.textContent = '上传中 82%，已完成分片正在校验';
        resultMessage(route.id, '分片上传已开始', '已创建本次上传任务，可在当前页面查看进度。', 'info');
        return;
      }
      if (action === 'interrupt-upload') {
        memory.upload[route.id] = 'interrupted';
        const label = root.querySelector('[data-upload-label]');
        if (label) label.textContent = '网络中断，已完成分片保留，可继续上传';
        resultMessage(route.id, '上传已中断', '已完成分片已保留，请在页面内继续。', 'warning');
        return;
      }
      if (action === 'retry-upload') {
        memory.upload[route.id] = 'verified';
        const bar = root.querySelector('[data-upload-progress]');
        const label = root.querySelector('[data-upload-label]');
        if (bar) bar.style.width = '100%';
        if (label) label.textContent = '分片已全部上传，完整性校验通过';
        resultMessage(route.id, '继续上传完成', '包体完整性校验通过。');
        return;
      }
      if (action === 'test-pass') {
        root.querySelectorAll('.choice-card').forEach(node => node.classList.remove('is-selected'));
        event.currentTarget.closest('.choice-card')?.classList.add('is-selected');
        resultMessage(route.id, '已选择测试通过', '提交后将生成不可覆盖的历史记录。', 'info');
        return;
      }
      if (action === 'submit-test-result') { resultMessage(route.id, '测试结果已提交', '历史结果不可覆盖，开发者可查看处理记录。'); return; }
      if (action === 'schedule-release' || action === 'release-now') {
        const scheduled = action === 'schedule-release';
        root.querySelectorAll('.publish-option').forEach(node => node.classList.toggle('is-active', node.dataset.portalAction === action));
        const scheduleField = root.querySelector('[data-schedule-field]');
        const scheduleInput = scheduleField?.querySelector('input');
        scheduleField?.classList.toggle('is-disabled', !scheduled);
        if (scheduleInput) {
          scheduleInput.disabled = !scheduled;
          scheduleInput.setAttribute('aria-disabled', String(!scheduled));
          if (!scheduled) scheduleInput.value = '';
        }
        root.querySelectorAll('[data-release-submit], [data-primary-action]').forEach(control => {
          control.dataset.portalAction = action;
          const label = control.querySelector('span');
          if (label) label.textContent = scheduled ? '定时发布' : '立即发布';
        });
        resultMessage(route.id, action === 'schedule-release' ? '已选择定时发布' : '已选择立即发布', '运营发布前仍需通过全部门禁；失败时保持原线上版本。', 'warning');
        return;
      }
      if (action === 'add-target-rule') { event.currentTarget.classList.toggle('is-active'); resultMessage(route.id, '包含规则已更新', '仅使用已确认的地区、语言、设备／系统和平台行为标签。', 'info'); return; }
      if (action === 'exclude-rule') { event.currentTarget.classList.toggle('is-excluded'); resultMessage(route.id, '排除规则已更新', '请保存配置后继续预估人群。', 'info'); return; }
      if (action === 'dashboard-range') {
        event.currentTarget.parentElement?.querySelectorAll('[data-dashboard-range]').forEach(node => node.dataset.variant = node === event.currentTarget ? 'primary' : 'secondary');
        resultMessage(route.id, '时间范围已切换', '指标、趋势和明细已按所选范围更新。', 'info');
        return;
      }
      if (action === 'dashboard-filter') {
        event.currentTarget.parentElement?.querySelectorAll('[data-dashboard-filter]').forEach(node => node.dataset.variant = node === event.currentTarget ? 'primary' : 'secondary');
        resultMessage(route.id, '筛选条件已更新', '指标、趋势和明细已同步刷新。', 'info');
        return;
      }
      if (action === 'tab') {
        event.currentTarget.parentElement.querySelectorAll('.tab').forEach(node => { node.classList.toggle('is-active', node === event.currentTarget); node.setAttribute('aria-selected', String(node === event.currentTarget)); });
        return;
      }
      if (action.startsWith('page-')) { resultMessage(route.id, '列表已更新', '筛选条件和页码保持不变。', 'info'); return; }
      const destination = primaryDestination(route.id);
      if (event.currentTarget.hasAttribute('data-primary-action') && destination) { navigate({ routeId: destination, state: 'default' }); return; }
      resultMessage(route.id, '操作已完成', '最新状态已保存。');
    }));
    root.querySelector('[data-help-search-input]')?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      searchHelp();
    });
    root.querySelector('[data-review-filter-keyword]')?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      root.querySelector('[data-portal-action="qualification-review-filter"]')?.click();
    });
    root.querySelector('[data-content-search]')?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      root.querySelector('[data-portal-action="content-search"]')?.click();
    });
    root.querySelector('[data-publisher-game-search]')?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      root.querySelector('[data-portal-action="publisher-game-search"]')?.click();
    });
    root.querySelector('[data-content-navigation-filter]')?.addEventListener('change', event => {
      memory.contentEditor.navigationFilter = event.currentTarget.value || '';
      render();
    });
    root.querySelector('[data-content-navigation-select]')?.addEventListener('change', event => {
      const documents = memory.contentEditor.draft?.helpDocuments || [];
      const selected = documents.find(item => item.id === memory.contentEditor.selectedId);
      if (!selected) return;
      const previousNavigationId = selected.navigationId;
      collectManagedContentForm();
      if (selected.navigationId !== previousNavigationId) {
        resequenceContent(documents, item => item.navigationId === previousNavigationId);
        const targetItems = documents.filter(item => item.id !== selected.id && item.navigationId === selected.navigationId);
        selected.sortOrder = targetItems.length + 1;
        selected.updatedAt = nowText();
      }
    });
    root.querySelectorAll('[data-platform-tab-bar] [role="tab"]').forEach((tab, index, tabs) => tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const targetIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const targetValue = tabs[targetIndex].dataset.platformConsoleTab;
      tabs[targetIndex].click();
      requestAnimationFrame(() => root.querySelector(`[data-platform-console-tab="${targetValue}"]`)?.focus());
    }));
    root.querySelectorAll('[data-qualification-file]').forEach(input => input.addEventListener('change', event => {
      const file = event.currentTarget.files?.[0];
      const nameField = event.currentTarget.dataset.qualificationFile;
      if (!file || !nameField) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
        event.currentTarget.value = '';
        event.currentTarget.setAttribute('aria-invalid', 'true');
        event.currentTarget.closest('.qualification-upload')?.classList.add('is-invalid');
        resultMessage(route.id, memory.shell.language === 'en' ? 'Image does not meet the requirements' : '图片不符合要求', memory.shell.language === 'en' ? 'Upload a JPG, PNG or WEBP image no larger than 10 MB.' : '请上传不超过 10 MB 的 JPG、PNG 或 WEBP 图片。', 'warning');
        return;
      }
      memory.qualification.form = { ...(memory.qualification.form || {}), [nameField]: file.name };
      event.currentTarget.removeAttribute('aria-invalid');
      event.currentTarget.closest('.qualification-upload')?.classList.remove('is-invalid');
      const label = root.querySelector(`[data-file-name="${nameField}"]`);
      if (label) label.textContent = file.name;
      resultMessage(route.id, memory.shell.language === 'en' ? 'Image selected' : '已选择证明图片', memory.shell.language === 'en' ? 'The file is kept in this in-progress submission and uploaded only after formal submission.' : '文件仅保留在本次填写中，正式提交后才生成申请快照。', 'info');
    }));
    root.querySelectorAll('[data-rich-editor-image-input]').forEach(input => input.addEventListener('change', event => {
      const file = event.currentTarget.files?.[0];
      const editorBody = event.currentTarget.closest('[data-rich-editor]')?.querySelector('[data-rich-editor-body]');
      if (!file || !editorBody) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        event.currentTarget.value = '';
        resultMessage(route.id, '图片插入失败', '请选择不超过 5 MB 的 JPG、PNG 或 WEBP 图片。', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const image = document.createElement('img');
        image.src = String(reader.result || '');
        image.alt = file.name;
        editorBody.append(image);
        editorBody.focus();
        resultMessage(route.id, '图片已插入正文', '图片已写入当前草稿；返回列表并发布本条内容后，开发者端才会更新。', 'success');
      });
      reader.addEventListener('error', () => resultMessage(route.id, '图片读取失败', '请重新选择图片后再试。', 'danger'));
      reader.readAsDataURL(file);
    }));
    root.querySelectorAll('[data-qualification-form] input, [data-qualification-form] textarea, [data-qualification-form] select').forEach(field => {
      const clearInvalid = event => {
        event.currentTarget.removeAttribute('aria-invalid');
        event.currentTarget.closest('.field, .agreement-check')?.classList.remove('is-invalid');
        event.currentTarget.closest('.field')?.querySelector('.qualification-field-error')?.remove();
      };
      field.addEventListener('input', clearInvalid);
      field.addEventListener('change', clearInvalid);
    });
    root.querySelectorAll('[data-login-panel] input').forEach(input => input.addEventListener('input', event => {
      const field = event.currentTarget;
      if (field.hasAttribute('data-login-numeric')) field.value = field.value.replace(/\D/g, '').slice(0, Number(field.maxLength) || undefined);
      field.removeAttribute('aria-invalid');
      const message = field.closest('.login-field-stack')?.querySelector('[data-login-error]');
      if (message) {
        message.textContent = '\u00A0';
        message.dataset.variant = 'idle';
        message.hidden = false;
      }
    }));
  };

  const render = () => {
    const { route, role, state, cdkeyTab } = parseLocation();
    const page = portalData.pages?.[route.id] || fallbackPage(route);
    const editorMode = route.id === 'P01-05' ? (memory.page[route.id]?.editorMode || 'edit') : 'edit';
    const qualificationForView = role === 'developer' && route.id === 'P01-03' && memory.qualificationPreview
      ? memory.qualificationPreview
      : memory.qualification;
    document.documentElement.lang = memory.shell.language === 'en' && role === 'developer' ? 'en' : 'zh-CN';
    const content = namespace.templates.render({ route, page, state, editorMode, qualification: qualificationForView, language: memory.shell.language, managedContent: memory.managedContent, contentEditor: memory.contentEditor, operationsReview: memory.operationsReview, registration: memory.registration, authenticated: memory.session.authenticated, workspaceState: memory.page[route.id] || {} });
    root.innerHTML = namespace.shell.renderBusiness({ module: moduleConfig, routes, route, page, portalData, role, state, editorMode, content, qualification: qualificationForView, language: memory.shell.language, managedContent: memory.managedContent, registration: memory.registration });
    if (role === 'developer' && route.id === 'P01-03' && qualificationForView.readOnly && qualificationForView.status === 'pending') {
      root.querySelector('.qualification-pending-note')?.insertAdjacentHTML('beforeend', c.button({ label: memory.shell.language === 'en' ? 'Withdraw application' : '撤回申请', variant: 'danger', action: 'qualification-withdraw', size: 'small' }));
    }
    if (memory.result[route.id] && state === 'default') {
      const target = root.querySelector('[data-runtime-result]');
      if (target) target.innerHTML = c.resultStrip(memory.result[route.id]);
    }
    if (memory.page[route.id]?.savedAt) root.querySelectorAll('[data-save-state]').forEach(node => { node.textContent = `最近保存：${memory.page[route.id].savedAt}`; });
    applyBusinessState(route.id);
    bindInteractions({ route, role, state });
    if (route.id === 'P01-07' && state === 'default' && memory.page[route.id]?.releaseTab === 'audit') {
      root.querySelector('[data-release-tab="audit"]')?.click();
      if (memory.page[route.id]?.focusReview) {
        memory.page[route.id].focusReview = false;
        requestAnimationFrame(() => root.querySelector('[data-review-record="pre-release"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }
    }
    if (memory.shell.helpOpen) toggleHelp(true);
    requestAnimationFrame(() => root.querySelector('.platform-tab.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
    if (route.id === 'P02-01' && state === 'default') setCdkeyTab(route.id, cdkeyTab ?? memory.page[route.id]?.cdkeyTab ?? 0, false);
  };

  addEventListener('hashchange', render);
  addEventListener('keydown', event => {
    const existingApplicationModal = root.querySelector('[data-existing-application-modal]');
    if (event.key === 'Tab' && existingApplicationModal) {
      const focusable = [...existingApplicationModal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(node => !node.hidden && node.getClientRects().length > 0);
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (event.key !== 'Escape') return;
    if (existingApplicationModal) {
      const restoreSelector = memory.registration.verificationNoticeSource === 'account-menu'
        ? '[data-portal-action="toggle-account-menu"]'
        : '[data-demo-action="qualification-existing-open"]';
      memory.registration = { ...memory.registration, verificationNoticeOpen: false, verificationNoticeSource: '' };
      persistRegistration();
      render();
      requestAnimationFrame(() => root.querySelector(restoreSelector)?.focus());
      return;
    }
    root.querySelectorAll('[data-qualification-example-modal]:not([hidden])').forEach(modal => modal.setAttribute('hidden', ''));
  });
  addEventListener('storage', event => {
    if (event.key !== managedContentStorageKey || !event.newValue) return;
    try {
      const next = JSON.parse(event.newValue);
      if (!next?.zh || !next?.en || Number(next.revision) <= Number(memory.managedContent.revision)) return;
      memory.managedContent = next;
      memory.contentEditor.draft = cloneJson(next);
      render();
    } catch { /* 忽略其他页面写入的无效内容 */ }
  });
  render();
})(window.GameHubDeveloperPortal);
