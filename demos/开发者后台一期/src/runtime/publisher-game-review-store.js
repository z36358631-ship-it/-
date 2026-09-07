/* 游戏发布审核与 02 共用 v2 存储；提交快照只读，审核结果独立留在游戏记录内。 */
(function () {
  'use strict';
  const open = () => {
    if (!window.PublisherStorageSchema) return Promise.reject(new Error('publisher-storage-schema-unavailable'));
    return window.PublisherStorageSchema.open();
  };
  const validFile = file => file?.blob instanceof Blob && file.blob.size > 0;
  const validPrice = value => /^\d+(?:\.\d{1,2})?$/.test(String(value ?? '').trim()) && Number.isFinite(Number(value)) && Number(value) > 0;
  const approvalIssues = draft => {
    const issues = [];
    if (draft?.schemaVersion >= 2 && draft.releaseConfig) {
      const mode = draft.releaseConfig.mode;
      if (!['global', 'domestic'].includes(mode)) issues.push('发行范围必须明确选择全球服或中国大陆。');
      if (mode === 'global' && (!(draft.releaseConfig.globalTerritoryCodes || []).length || draft.releaseConfig.globalTerritoryCodes.includes('CN'))) issues.push('全球服需选择至少一个中国大陆以外的国家或地区。');
      const requiredLocale = mode === 'domestic' ? 'zh' : 'en';
      const names = draft.gameProfileDraft?.gameNames || {};
      const content = draft.gameProfileDraft?.localizedContent?.[requiredLocale] || {};
      if (!String(names[requiredLocale] || '').trim() || !String(content.tagline || '').trim() || !String(content.description || '').trim()) issues.push(mode === 'domestic' ? '国内服中文商店资料不完整。' : '全球服英语商店资料不完整。');
      const skus = [draft.catalog?.baseGame, ...(draft.catalog?.dlcs || [])].filter(Boolean);
      for (const sku of skus) {
        if (!String(sku.installContentRef || '').trim()) issues.push(`${sku.title || sku.skuId || 'SKU'} 未关联安装内容。`);
        if (!['free', 'paid'].includes(sku.pricingModel)) issues.push(`${sku.title || sku.skuId || 'SKU'} 未选择收费方式。`);
        if (sku.pricingModel === 'paid') {
          if (!validPrice(sku.listPrice)) issues.push(`${sku.title || sku.skuId || 'SKU'} 售价无效。`);
          if (sku.discountPrice && (!validPrice(sku.discountPrice) || Number(sku.discountPrice) >= Number(sku.listPrice))) issues.push(`${sku.title || sku.skuId || 'SKU'} 折扣价无效。`);
          if ((sku.discountStartAt || sku.discountEndAt) && (!sku.discountStartAt || !sku.discountEndAt || new Date(sku.discountStartAt) >= new Date(sku.discountEndAt))) issues.push(`${sku.title || sku.skuId || 'SKU'} 折扣期限无效。`);
        }
      }
      if (mode === 'domestic' && !String(draft.licenseNumber || draft.releaseConfig.licenseNumber || '').trim()) issues.push('国内服发行缺少游戏版号。');
      if (!draft.qualifications?.activeVersion) issues.push('缺少已审核通过且适用于当前发行范围的资质版本。');
      return [...new Set(issues)];
    }
    const regionComponent = window.PublisherReleaseRegions;
    const hasTerritories = Object.prototype.hasOwnProperty.call(draft || {}, 'releaseTerritories');
    const regions = hasTerritories && regionComponent ? regionComponent.regionsFor(draft.releaseTerritories, { fallbackGlobal: false }) : draft?.releaseRegions || [];
    if (hasTerritories && (!regionComponent || Object.keys(regionComponent.validate(draft.releaseTerritories)).length)) issues.push('请完整选择有效的发行国家／地区和对应游戏状态。');
    if (Object.prototype.hasOwnProperty.call(draft || {}, 'releaseStatus') && (!regionComponent?.statuses.includes(draft.releaseStatus) || !Array.isArray(draft.releaseTerritories) || draft.releaseTerritories.some(item => item?.status !== draft.releaseStatus))) issues.push('所选地区的发行状态与统一发行状态不一致，需要重新确认。');
    if (hasTerritories && [...regions].sort().join(',') !== [...(draft?.releaseRegions || [])].sort().join(',')) issues.push('发行服务与所选国家／地区不一致，需要开发者重新确认。');
    if (!regions.length || regions.some(region => !['domestic', 'global'].includes(region))) issues.push('发行范围未明确，需开发者补充国内服或全球服。');
    // 历史快照没有收费字段，保留其原始含义；已有字段必须按本次发行范围完整审核。
    if (Object.prototype.hasOwnProperty.call(draft || {}, 'pricing')) {
      const pricing = draft.pricing;
      if (!['free', 'paid'].includes(pricing?.model)) issues.push('收费方式未明确，需要开发者选择免费或付费。');
      if (pricing?.model === 'paid') {
        if (regions.includes('global') && !validPrice(pricing.globalPrice)) issues.push('全球服付费价格需填写大于 0、最多两位小数的美元（USD）金额。');
        if (regions.includes('domestic') && !validPrice(pricing.domesticPrice)) issues.push('国内服付费价格需填写大于 0、最多两位小数的人民币（CNY）金额。');
      }
    }
    if (regions.includes('domestic')) {
      if (!String(draft.licenseNumber || '').trim()) issues.push('国内服发行缺少游戏版号。');
      if (!['gameNameZh', 'taglineZh', 'descriptionZh'].every(key => String(draft[key] || '').trim())) issues.push('国内服中文名称、简介或完整介绍不完整。');
    }
    if (regions.includes('global') && !['gameNameEn', 'tagline', 'description'].every(key => String(draft[key] || '').trim())) issues.push('全球服英语名称、简介或完整介绍不完整。');
    if (draft?.compliance) {
      const qualifications = window.PublisherGameQualifications;
      if (!qualifications) issues.push('资质校验暂不可用，请刷新页面后重新审核。');
      else issues.push(...new Set(Object.values(qualifications.validate(draft)).map(code => qualifications.text('zh', code))));
    }
    if (!validFile(draft?.assets?.icon)) issues.push('缺少有效游戏图标文件。');
    if (!(draft?.assets?.landscape || []).some(validFile) || (draft?.assets?.screenshots || []).filter(validFile).length < 3) issues.push('横版宣传图或至少 3 张游戏截图不完整。');
    const copyrightOwnership = Boolean(window.PublisherGameQualifications?.hasCopyrightProof(draft));
    const hasOwnership = draft.relationship === 'publisher' ? validFile(draft?.qualifications?.authorization) : validFile(draft?.qualifications?.rights) || copyrightOwnership;
    if (!hasOwnership) issues.push('缺少对应权属或发行授权文件。');
    return issues;
  };
  const loadQueue = async () => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readonly');
      const submissions = transaction.objectStore('submissions').getAll();
      const profiles = transaction.objectStore('profiles').getAll();
      transaction.oncomplete = () => {
        const byKey = new Map(profiles.result.map(record => [record.gameKey, window.PublisherStorageSchema.normalizeProfile(record)]));
        resolve(submissions.result.map(submission => {
          const profile = byKey.get(submission.gameKey);
          const result = (profile?.reviewRecords || []).find(record => record.submissionId === submission.id) || (profile?.draft?.reviewResult?.submissionId === submission.id ? profile.draft.reviewResult : null);
          return { ...submission, normalizedDraft: window.PublisherStorageSchema.normalizeDraft(submission.draft, submission.game || profile?.game || {}), game: submission.game || profile?.game || {}, reviewResult: result, status: result?.decision || submission.status || (profile?.draft?.submissionId === submission.id && profile.draft.reviewStatus === 'reviewing' ? 'reviewing' : 'unavailable') };
        }).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))));
      };
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('load-failed'));
    });
  };
  const decide = async ({ submissionId, decision, reason = '', reviewer = '运营审核员（本地演示）' }) => {
    if (!['approved', 'rejected'].includes(decision)) throw new Error('invalid-decision');
    const trimmedReason = String(reason).trim();
    if (decision === 'rejected' && !trimmedReason) throw new Error('reason-required');
    if (trimmedReason.length > 2000) throw new Error('reason-too-long');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
      const profiles = transaction.objectStore('profiles');
      let error;
      let result;
      const abort = message => { error = new Error(message); transaction.abort(); };
      const snapshot = transaction.objectStore('submissions').get(submissionId);
      snapshot.onsuccess = () => {
        if (!snapshot.result) { abort('submission-missing'); return; }
        const request = profiles.get(snapshot.result.gameKey);
        request.onsuccess = () => {
          const record = request.result;
          if (!record || record.draft?.submissionId !== submissionId || record.draft.reviewStatus !== 'reviewing' || record.reviewRecords?.some(item => item.submissionId === submissionId)) { abort('already-reviewed'); return; }
          if (decision === 'approved' && approvalIssues(snapshot.result.draft).length) { abort('approval-incomplete'); return; }
          result = { submissionId, decision, reason: decision === 'rejected' ? trimmedReason : '', reviewer, reviewedAt: new Date().toISOString() };
          record.draft.reviewStatus = decision;
          record.draft.reviewResult = result;
          record.draft.currentReleaseReview = { submissionId, status: decision, submittedAt: snapshot.result.submittedAt, reviewedAt: result.reviewedAt };
          record.draft.releaseSubmissions = (record.draft.releaseSubmissions || []).map(item => item.id === submissionId ? { ...item, status: decision, reviewedAt: result.reviewedAt } : item);
          record.reviewRecords = [...(record.reviewRecords || []), result];
          record.draft.reviewRecords = structuredClone(record.reviewRecords);
          profiles.put(record);
          snapshot.result.status = decision;
          transaction.objectStore('submissions').put(snapshot.result);
        };
      };
      transaction.oncomplete = () => {
        try { const channel = new BroadcastChannel('gamehub-publisher-review'); channel.postMessage({ type: 'review-updated', submissionId }); channel.close(); } catch { /* 刷新与重新聚焦仍可恢复结果。 */ }
        resolve(result);
      };
      transaction.onerror = transaction.onabort = () => reject(error || transaction.error || new Error('review-failed'));
    });
  };
  window.PublisherGameReviewStore = { loadQueue, decide, approvalIssues, validPrice };
})();
