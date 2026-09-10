/* 01 游戏发布审核：审核不可变上架快照，与 02 共用 IndexedDB v2。 */
(function (global) {
  'use strict';

  const REVIEWING = 'reviewing';
  const TERMINAL = ['approved', 'rejected', 'withdrawn'];
  const clone = value => value == null ? value : structuredClone(value);
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const present = value => Boolean(String(value ?? '').trim());
  const unique = values => [...new Set(values.filter(Boolean))];
  const validFile = file => Boolean(file?.blob instanceof Blob && file.blob.size > 0);
  const validPrice = value => /^\d+(?:\.\d{1,2})?$/.test(String(value ?? '').trim()) && Number.isFinite(Number(value)) && Number(value) > 0;
  const isV25 = draft => Number(draft?.schemaVersion) >= 2 && Boolean(draft?.releaseConfig && draft?.catalog && draft?.gameProfileDraft);
  const statusLabels = { reviewing: '待审核', approved: '已通过', rejected: '已驳回', withdrawn: '已撤销', unavailable: '历史记录' };
  const fallbackCurrencies = Object.freeze({
    US: 'USD', CN: 'CNY', HK: 'HKD', MO: 'MOP', TW: 'TWD', JP: 'JPY', KR: 'KRW', GB: 'GBP',
    DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', CA: 'CAD', AU: 'AUD', BR: 'BRL',
    TR: 'TRY', RU: 'RUB', IN: 'INR', ID: 'IDR', TH: 'THB', MX: 'MXN', PH: 'PHP', SG: 'SGD',
    IQ: 'IQD', PK: 'PKR', CO: 'COP', EG: 'EGP', DZ: 'DZD', AR: 'ARS', VN: 'VND', VE: 'VES',
  });

  const open = async () => {
    if (!global.PublisherStorageSchema?.open) throw new Error('publisher-storage-schema-unavailable');
    return global.PublisherStorageSchema.open();
  };

  const releaseMode = draft => {
    if (isV25(draft)) return ['global', 'domestic'].includes(draft.releaseConfig.mode) ? draft.releaseConfig.mode : '';
    const regions = list(draft?.releaseRegions);
    return regions.length === 1 && ['global', 'domestic'].includes(regions[0]) ? regions[0] : regions.includes('domestic') && !regions.includes('global') ? 'domestic' : regions.includes('global') ? 'global' : '';
  };

  const scopeLabel = draft => {
    if (!isV25(draft) && list(draft?.releaseRegions).includes('domestic') && list(draft?.releaseRegions).includes('global')) return '国内服、全球服（V2.4 历史双范围）';
    return releaseMode(draft) === 'domestic' ? '中国大陆' : releaseMode(draft) === 'global' ? '全球服（不含中国大陆）' : '未明确';
  };
  const releaseStatus = draft => isV25(draft) ? draft.releaseConfig.releaseStatus : draft?.releaseStatus || list(draft?.releaseTerritories)[0]?.status || '';
  const releaseStatusLabel = draft => global.PublisherReleaseRegions?.statusLabel?.(releaseStatus(draft), 'zh') || ({ coming_soon: '敬请期待', pre_registration: '预约', demo: '正式上线（试玩版）', released: '正式上线' }[releaseStatus(draft)] || releaseStatus(draft) || '—');

  function territoryCodes(draft) {
    if (isV25(draft)) return releaseMode(draft) === 'domestic' ? ['CN'] : unique(list(draft.releaseConfig.globalTerritoryCodes)).filter(code => code !== 'CN');
    const explicit = list(draft?.releaseTerritories).map(item => typeof item === 'string' ? item : item?.code).filter(Boolean);
    if (explicit.length) return unique(explicit);
    return list(draft?.releaseRegions).flatMap(region => region === 'domestic' ? ['CN'] : []);
  }

  function territorySummary(draft) {
    const codes = territoryCodes(draft);
    if (releaseMode(draft) === 'domestic') return '中国大陆';
    if (!codes.length) return '未选择国家／地区';
    const component = global.PublisherReleaseRegions;
    const byCode = new Map(list(component?.globalCatalog || component?.catalog).map(item => [item.code, item]));
    const groups = new Map();
    codes.forEach(code => {
      const continent = byCode.get(code)?.continent || 'other';
      groups.set(continent, (groups.get(continent) || 0) + 1);
    });
    const grouped = [...groups].map(([continent, count]) => `${component?.continentLabel?.(continent, 'zh') || continent} ${count}`).join('、');
    return `${codes.length} 个国家／地区${grouped ? ` · ${grouped}` : ''}`;
  }

  const currencyFor = draft => releaseMode(draft) === 'domestic' ? 'CNY' : 'USD';
  const territoryCurrency = code => global.PublisherReleaseRegions?.currencyForTerritory?.(code) || fallbackCurrencies[code] || 'USD';
  const money = value => validPrice(value) ? Number(value).toFixed(2) : present(value) ? `格式无效：${String(value).trim()}` : '未填写';
  const moneyWithCurrency = (currency, value) => `${currency} ${money(value)}`;
  const normalizePrice = value => ({ listPrice: String(value?.listPrice ?? ''), discountPrice: String(value?.discountPrice ?? '') });
  function normalizeRegionalPrices(source, draft) {
    const entries = source && typeof source === 'object' && !Array.isArray(source) ? Object.entries(source) : [];
    const raw = Object.fromEntries(entries.map(([code, value]) => [String(code).toUpperCase(), normalizePrice(value)]));
    const normalized = Object.fromEntries(Object.entries(raw).filter(([code]) => /^[A-Z]{2}$/.test(code)));
    territoryCodes(draft).forEach(code => {
      const legacy = raw[territoryCurrency(code)];
      if (!normalized[code] && legacy) normalized[code] = { ...legacy };
    });
    return normalized;
  }
  const pricingStrategyFor = (sku, draft) => releaseMode(draft) === 'domestic' ? 'uniform' : sku?.pricingStrategy === 'regional' ? 'regional' : 'uniform';
  const activeRegionalPrices = (sku, draft) => {
    if (sku?.pricingModel !== 'paid' || pricingStrategyFor(sku, draft) !== 'regional') return {};
    const normalized = normalizeRegionalPrices(sku?.regionalPrices, draft);
    return Object.fromEntries(territoryCodes(draft).filter(code => Object.prototype.hasOwnProperty.call(normalized, code)).map(code => [code, normalized[code]]));
  };
  function skuRows(draft) {
    if (isV25(draft)) return [draft.catalog?.baseGame, ...list(draft.catalog?.dlcs)].filter(Boolean).map((sku, index) => {
      const normalized = {
        ...sku,
        type: index === 0 ? 'base_game' : 'dlc',
        title: sku.title || (index === 0 ? '基础游戏' : `DLC ${index}`),
        pricingStrategy: pricingStrategyFor(sku, draft),
        regionalPrices: normalizeRegionalPrices(sku.regionalPrices, draft),
      };
      if (normalized.pricingModel !== 'paid') Object.assign(normalized, { pricingStrategy: 'uniform', listPrice: '', discountPrice: '', discountStartAt: '', discountEndAt: '', regionalPrices: {} });
      if (releaseMode(draft) === 'domestic' || normalized.pricingStrategy !== 'regional') normalized.regionalPrices = {};
      return normalized;
    });
    if (!Object.prototype.hasOwnProperty.call(draft || {}, 'pricing')) return [];
    const model = draft.pricing?.model;
    const amount = releaseMode(draft) === 'domestic' ? draft.pricing?.domesticPrice : draft.pricing?.globalPrice;
    return [{ skuId: 'LEGACY-BASE', type: 'base_game', title: '基础游戏', installContentRef: '', pricingModel: model, pricingStrategy: 'uniform', listPrice: amount, discountPrice: '', discountStartAt: '', discountEndAt: '', regionalPrices: {}, legacy: true }];
  }

  function pricingSnapshot(draft) {
    const codes = territoryCodes(draft);
    return skuRows(draft).map(sku => ({
      ...sku,
      baseCurrency: currencyFor(draft),
      territoryCodes: [...codes],
      pricingStrategy: pricingStrategyFor(sku, draft),
      regionalPrices: activeRegionalPrices(sku, draft),
    }));
  }

  function priceSummary(draft) {
    const rows = pricingSnapshot(draft);
    if (!rows.length) return '未记录（历史提交）';
    return rows.map((sku, index) => {
      const prefix = index === 0 ? '基础游戏' : `DLC·${sku.title || sku.skuId || index}`;
      if (sku.pricingModel === 'free') return `${prefix} 免费`;
      if (sku.pricingModel !== 'paid') return `${prefix} 未配置`;
      const discount = present(sku.discountPrice) ? ` → ${moneyWithCurrency(sku.baseCurrency, sku.discountPrice)}` : '';
      const base = `${moneyWithCurrency(sku.baseCurrency, sku.listPrice)}${discount}`;
      if (sku.pricingStrategy !== 'regional') return `${prefix} ${base}`;
      const overrideCount = Object.keys(sku.regionalPrices).length;
      return `${prefix} 分区定价 · 基准 ${base} · ${overrideCount} 个例外价`;
    }).join('；');
  }

  function qualificationVersionId(submissionOrDraft, maybeDraft) {
    const submission = maybeDraft ? submissionOrDraft : null;
    const draft = maybeDraft || submissionOrDraft || {};
    const active = draft.qualifications?.activeVersion;
    return submission?.qualificationVersionId || draft.qualificationVersionId || active?.id || active?.versionId || '';
  }

  function qualificationVersion(submissionOrDraft, maybeDraft) {
    const draft = maybeDraft || submissionOrDraft || {};
    const id = qualificationVersionId(submissionOrDraft, maybeDraft);
    const versions = [draft.qualifications?.activeVersion, ...list(draft.qualifications?.history)];
    return versions.find(item => [item?.id, item?.versionId].includes(id)) || draft.qualifications?.activeVersion || null;
  }

  const discountIssues = (sku, draft) => {
    const regional = pricingStrategyFor(sku, draft) === 'regional';
    const overrides = regional ? activeRegionalPrices(sku, draft) : {};
    const discountPrices = [sku.discountPrice, ...Object.values(overrides).map(price => price.discountPrice)];
    const hasDiscount = discountPrices.some(present);
    const hasTime = present(sku.discountStartAt) || present(sku.discountEndAt);
    if (!hasDiscount && !hasTime) return [];
    if (!hasDiscount || !present(sku.discountStartAt) || !present(sku.discountEndAt)) return ['折扣价、折扣开始和结束时间需同时填写。'];
    if (present(sku.discountPrice) && (!validPrice(sku.discountPrice) || !validPrice(sku.listPrice) || Number(sku.discountPrice) >= Number(sku.listPrice))) return ['折扣价必须大于 0 且低于售价。'];
    for (const [code, price] of Object.entries(overrides)) {
      if (present(price.discountPrice) && (!validPrice(price.discountPrice) || !validPrice(price.listPrice) || Number(price.discountPrice) >= Number(price.listPrice))) {
        const label = global.PublisherReleaseRegions?.territoryLabel?.(code, 'zh') || code;
        return [`${label}（${code}）例外折扣价必须大于 0 且低于售价。`];
      }
    }
    const startsAt = Date.parse(sku.discountStartAt);
    const endsAt = Date.parse(sku.discountEndAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) return ['折扣期限无效，结束时间必须晚于开始时间。'];
    if (endsAt <= Date.now()) return ['折扣期限已过，请重新设置。'];
    return [];
  };

  function v25ApprovalIssues(draft, submission) {
    const issues = [];
    const release = draft.releaseConfig || {};
    const mode = releaseMode(draft);
    if (!mode) issues.push('发行范围必须明确选择全球服或中国大陆。');
    if (Array.isArray(draft.releaseRegions) && (draft.releaseRegions.length !== 1 || draft.releaseRegions[0] !== mode)) issues.push('一次上架提交只能包含一种发行范围。');

    if (mode === 'global') {
      const codes = list(release.globalTerritoryCodes);
      const normalized = global.PublisherReleaseRegions?.normalizeTerritoryCodes?.(codes) || unique(codes).filter(code => code !== 'CN');
      if (!codes.length) issues.push('全球服需选择至少一个中国大陆以外的国家或地区。');
      else if (codes.includes('CN') || normalized.length !== codes.length) issues.push('全球服国家／地区范围无效，不能包含中国大陆或重复项。');
    }
    if (Array.isArray(draft.releaseTerritories)) {
      const actual = unique(draft.releaseTerritories.map(item => item?.code).filter(Boolean));
      const expected = mode === 'domestic' ? ['CN'] : unique(list(release.globalTerritoryCodes));
      if (actual.length !== expected.length || actual.some(code => !expected.includes(code))) issues.push('提交快照的国家／地区与发行范围不一致。');
      if (draft.releaseTerritories.some(item => item?.status && item.status !== release.releaseStatus)) issues.push('所选国家／地区的发行状态与统一发行状态不一致。');
    }
    if (!global.PublisherReleaseRegions?.statuses?.includes(release.releaseStatus)) issues.push('请选择有效的发行状态。');

    const requiredLocale = mode === 'domestic' ? 'zh' : 'en';
    const locales = list(draft.storeLocales?.enabled);
    const profile = draft.gameProfileDraft || {};
    const localized = profile.localizedContent?.[requiredLocale] || {};
    if (!locales.includes(requiredLocale) || !present(profile.gameNames?.[requiredLocale]) || !present(localized.tagline) || !present(localized.description)) {
      issues.push(mode === 'domestic' ? '国内服简体中文商店资料不完整。' : '全球服英语商店资料不完整。');
    }

    const skus = skuRows(draft);
    if (!draft.catalog?.baseGame) issues.push('缺少基础游戏 SKU。');
    skus.forEach((sku, index) => {
      const title = sku.title || sku.skuId || 'SKU';
      const rawSku = index === 0 ? draft.catalog?.baseGame : list(draft.catalog?.dlcs)[index - 1];
      if (!present(sku.installContentRef)) issues.push(`${title} 未关联安装内容／包体版本。`);
      if (!['free', 'paid'].includes(sku.pricingModel)) issues.push(`${title} 未选择免费或单次买断。`);
      if (sku.pricingModel === 'paid') {
        if (mode === 'global' && present(rawSku?.pricingStrategy) && !['uniform', 'regional'].includes(rawSku.pricingStrategy)) issues.push(`${title} 未选择全球统一价或分区定价。`);
        if (mode === 'domestic' && (rawSku?.pricingStrategy === 'regional' || Object.keys(normalizeRegionalPrices(rawSku?.regionalPrices, draft)).length)) issues.push(`${title} 中国大陆发行不允许分区定价。`);
        if (!validPrice(sku.listPrice)) issues.push(`${title} 售价无效。`);
        if (pricingStrategyFor(sku, draft) === 'regional') {
          const normalizedPrices = normalizeRegionalPrices(sku.regionalPrices, draft);
          const selectedCodes = territoryCodes(draft);
          const outsideCodes = Object.keys(normalizedPrices).filter(code => !selectedCodes.includes(code));
          if (outsideCodes.length) issues.push(`${title} 地区例外价包含非当前发行范围：${outsideCodes.join('、')}。`);
          Object.entries(activeRegionalPrices(sku, draft)).forEach(([code, price]) => {
            if (!validPrice(price.listPrice)) {
              const label = global.PublisherReleaseRegions?.territoryLabel?.(code, 'zh') || code;
              issues.push(`${title} ${label}（${code}）例外售价无效。`);
            }
          });
        }
        discountIssues(sku, draft).forEach(issue => issues.push(`${title} ${issue}`));
      }
    });

    const version = qualificationVersion(submission || draft, submission ? draft : undefined);
    const referenceId = qualificationVersionId(submission || draft, submission ? draft : undefined);
    const context = global.PublisherGameQualifications?.contextFor?.(draft);
    const approved = global.PublisherGameQualifications?.approvedVersionFor?.(draft.qualifications, context);
    if (!referenceId || !version || !['approved', 'active'].includes(version.status || '') || !approved || ![approved.id, approved.versionId].includes(referenceId)) {
      issues.push('缺少已审核通过且覆盖当前发行范围的资质版本。');
    }
    const license = draft.licenseNumber || release.licenseNumber || version?.snapshot?.domestic?.licenseNumber;
    if (mode === 'domestic' && !present(license)) issues.push('中国大陆发行缺少游戏版号。');
    return unique(issues);
  }

  function legacyApprovalIssues(draft = {}) {
    const issues = [];
    const regionComponent = global.PublisherReleaseRegions;
    const hasTerritories = Object.prototype.hasOwnProperty.call(draft, 'releaseTerritories');
    const regions = hasTerritories && regionComponent ? regionComponent.regionsFor(draft.releaseTerritories, { fallbackGlobal: false }) : draft.releaseRegions || [];
    if (hasTerritories && (!regionComponent || Object.keys(regionComponent.validate(draft.releaseTerritories)).length)) issues.push('请完整选择有效的发行国家／地区和对应游戏状态。');
    if (Object.prototype.hasOwnProperty.call(draft, 'releaseStatus') && (!regionComponent?.statuses.includes(draft.releaseStatus) || !Array.isArray(draft.releaseTerritories) || draft.releaseTerritories.some(item => item?.status !== draft.releaseStatus))) issues.push('所选地区的发行状态与统一发行状态不一致，需要重新确认。');
    if (hasTerritories && [...regions].sort().join(',') !== [...(draft.releaseRegions || [])].sort().join(',')) issues.push('发行服务与所选国家／地区不一致，需要开发者重新确认。');
    if (!regions.length || regions.some(region => !['domestic', 'global'].includes(region))) issues.push('发行范围未明确，需开发者补充国内服或全球服。');
    if (Object.prototype.hasOwnProperty.call(draft, 'pricing')) {
      const pricing = draft.pricing;
      if (!['free', 'paid'].includes(pricing?.model)) issues.push('收费方式未明确，需要开发者选择免费或付费。');
      if (pricing?.model === 'paid') {
        if (regions.includes('global') && !validPrice(pricing.globalPrice)) issues.push('全球服付费价格需填写大于 0、最多两位小数的美元（USD）金额。');
        if (regions.includes('domestic') && !validPrice(pricing.domesticPrice)) issues.push('国内服付费价格需填写大于 0、最多两位小数的人民币（CNY）金额。');
      }
    }
    if (regions.includes('domestic')) {
      if (!present(draft.licenseNumber)) issues.push('国内服发行缺少游戏版号。');
      if (!['gameNameZh', 'taglineZh', 'descriptionZh'].every(key => present(draft[key]))) issues.push('国内服中文名称、简介或完整介绍不完整。');
    }
    if (regions.includes('global') && !['gameNameEn', 'tagline', 'description'].every(key => present(draft[key]))) issues.push('全球服英语名称、简介或完整介绍不完整。');
    if (draft.compliance) {
      const rules = global.PublisherGameQualifications;
      if (!rules) issues.push('资质校验暂不可用，请刷新页面后重新审核。');
      else issues.push(...unique(Object.values(rules.validate(draft)).map(code => rules.text('zh', code))));
    }
    if (!validFile(draft.assets?.icon)) issues.push('缺少有效游戏图标文件。');
    if (!list(draft.assets?.landscape).some(validFile) || list(draft.assets?.screenshots).filter(validFile).length < 3) issues.push('横版宣传图或至少 3 张游戏截图不完整。');
    const copyrightOwnership = Boolean(global.PublisherGameQualifications?.hasCopyrightProof(draft));
    const hasOwnership = draft.relationship === 'publisher' ? validFile(draft.qualifications?.authorization) : validFile(draft.qualifications?.rights) || copyrightOwnership;
    if (!hasOwnership) issues.push('缺少对应权属或发行授权文件。');
    return unique(issues);
  }

  const approvalIssues = (draft, submission) => isV25(draft) ? v25ApprovalIssues(draft, submission) : legacyApprovalIssues(draft);

  const projectName = row => row?.game?.projectName || row?.game?.name || row?.projectName || row?.draft?.projectName || row?.gameKey || '未命名项目';
  const primaryStoreName = draft => {
    if (isV25(draft)) {
      const preferred = draft.storeLocales?.default || (releaseMode(draft) === 'domestic' ? 'zh' : 'en');
      return draft.gameProfileDraft?.gameNames?.[preferred] || draft.gameProfileDraft?.gameNames?.[releaseMode(draft) === 'domestic' ? 'zh' : 'en'] || '';
    }
    return draft?.gameNames?.[draft.defaultNameLanguage] || (releaseMode(draft) === 'domestic' ? draft?.gameNameZh || draft?.gameNameEn : draft?.gameNameEn || draft?.gameNameZh) || '';
  };

  function summaryFor(submission, profile) {
    const draft = submission?.draft || {};
    const game = submission?.game || profile?.game || {};
    return {
      projectName: projectName({ game, draft, gameKey: submission?.gameKey }),
      storeName: primaryStoreName(draft),
      submissionId: submission?.id || '',
      scope: scopeLabel(draft),
      territory: territorySummary(draft),
      releaseStatus: releaseStatusLabel(draft),
      price: priceSummary(draft),
      qualificationVersionId: qualificationVersionId(submission, draft),
      legacy: !isV25(draft),
    };
  }

  async function loadQueue() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readonly');
      const submissions = transaction.objectStore('submissions').getAll();
      const profiles = transaction.objectStore('profiles').getAll();
      transaction.oncomplete = () => {
        const byKey = new Map((profiles.result || []).map(record => [record.gameKey, global.PublisherStorageSchema.normalizeProfile(record)]));
        const rows = (submissions.result || []).map(submission => {
          const profile = byKey.get(submission.gameKey);
          const reviewResult = (profile?.reviewRecords || []).find(record => record.submissionId === submission.id)
            || (profile?.draft?.reviewResult?.submissionId === submission.id ? profile.draft.reviewResult : null)
            || null;
          const current = profile?.draft?.currentReleaseReview;
          const inferred = current?.submissionId === submission.id ? current.status : profile?.draft?.submissionId === submission.id ? profile.draft.reviewStatus : '';
          const status = reviewResult?.decision || submission.status || inferred || 'unavailable';
          const game = clone(submission.game || profile?.game || {});
          return {
            ...clone(submission),
            game,
            draft: clone(submission.draft || {}),
            normalizedDraft: global.PublisherStorageSchema.normalizeDraft(submission.draft || {}, game),
            reviewResult: clone(reviewResult),
            status,
            isLegacy: !isV25(submission.draft),
            summary: summaryFor(submission, profile),
          };
        }).sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
        resolve(rows);
      };
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('load-failed'));
    });
  }

  async function decide({ submissionId, decision, reason = '', reviewer = '运营审核员（本地演示）' } = {}) {
    if (!['approved', 'rejected'].includes(decision)) throw new Error('invalid-decision');
    const trimmedReason = String(reason).trim();
    if (decision === 'rejected' && !trimmedReason) throw new Error('reason-required');
    if (trimmedReason.length > 2000) throw new Error('reason-too-long');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
      const profiles = transaction.objectStore('profiles');
      const submissions = transaction.objectStore('submissions');
      let result;
      let failure;
      const abort = code => { failure = new Error(code); transaction.abort(); };
      const snapshotRequest = submissions.get(submissionId);
      snapshotRequest.onsuccess = () => {
        const submission = snapshotRequest.result;
        if (!submission) { abort('submission-missing'); return; }
        const profileRequest = profiles.get(submission.gameKey);
        profileRequest.onsuccess = () => {
          const record = profileRequest.result;
          const current = record?.draft?.currentReleaseReview;
          const currentReviewing = current?.submissionId === submissionId
            ? current.status === REVIEWING
            : record?.draft?.submissionId === submissionId && record.draft.reviewStatus === REVIEWING;
          if (!record || submission.status && submission.status !== REVIEWING || !currentReviewing || list(record.reviewRecords).some(item => item.submissionId === submissionId)) {
            abort('already-reviewed');
            return;
          }
          if (decision === 'approved' && approvalIssues(submission.draft, submission).length) { abort('approval-incomplete'); return; }
          const reviewedAt = new Date().toISOString();
          result = { submissionId, decision, reason: decision === 'rejected' ? trimmedReason : '', reviewer, reviewedAt };
          record.reviewRecords = [...list(record.reviewRecords), clone(result)];
          Object.assign(record.draft, {
            reviewStatus: decision,
            reviewResult: clone(result),
            currentReleaseReview: { ...(current || {}), submissionId, status: decision, submittedAt: submission.submittedAt, reviewedAt },
          });
          record.draft.reviewRecords = clone(record.reviewRecords);
          record.draft.releaseSubmissions = list(record.draft.releaseSubmissions).map(item => item.id === submissionId ? { ...item, status: decision, reviewedAt } : item);
          profiles.put(record);
          submissions.put({ ...submission, status: decision, reviewedAt });
        };
      };
      transaction.oncomplete = () => {
        try {
          const channel = new BroadcastChannel('gamehub-publisher-review');
          channel.postMessage({ type: 'review-updated', submissionId, decision });
          channel.close();
        } catch { /* 刷新与重新聚焦仍可恢复最新结果。 */ }
        resolve(clone(result));
      };
      transaction.onerror = transaction.onabort = () => reject(failure || transaction.error || new Error('review-failed'));
    });
  }

  global.PublisherGameReviewStore = {
    loadQueue,
    decide,
    approvalIssues,
    validPrice,
    validFile,
    isV25,
    releaseMode,
    scopeLabel,
    territoryCodes,
    territorySummary,
    releaseStatus,
    releaseStatusLabel,
    skuRows,
    pricingSnapshot,
    pricingStrategyFor,
    normalizeRegionalPrices,
    activeRegionalPrices,
    territoryCurrency,
    priceSummary,
    qualificationVersionId,
    qualificationVersion,
    summaryFor,
    statusLabels,
    terminalStatuses: TERMINAL,
  };
})(window);
