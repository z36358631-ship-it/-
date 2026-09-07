/* 02 本地资料保存：文件随草稿存储，提交记录与可编辑草稿分开保存。 */
(function () {
  'use strict';
  const open = () => {
    if (!window.PublisherStorageSchema) return Promise.reject(new Error('publisher-storage-schema-unavailable'));
    return window.PublisherStorageSchema.open();
  };
  const loadAll = async () => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('profiles', 'readonly');
      const request = transaction.objectStore('profiles').getAll();
      transaction.oncomplete = () => resolve((request.result || []).map(window.PublisherStorageSchema.normalizeProfile));
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('load-failed'));
    });
  };
  const persist = async (draft, game, submitting) => {
    const db = await open();
    const savedAt = new Date().toISOString();
    const saved = window.PublisherStorageSchema.normalizeDraft(draft, game);
    Object.assign(saved, { savedAt, saving: false, submitting: false, dirty: false, errors: {}, reviewStatus: submitting ? 'reviewing' : 'draft' });
    if (saved.ui) Object.assign(saved.ui, { showMissing: false, publicationOpen: false, reviewPreparing: false });
    const identity = structuredClone(game);
    delete identity.profileDraft;
    const record = { gameKey: draft.gameKey, draft: saved, game: identity, qualifications: structuredClone(saved.qualifications) };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
      const profiles = transaction.objectStore('profiles');
      let result = record;
      const existing = profiles.get(draft.gameKey);
      existing.onsuccess = () => {
        record.reviewRecords = structuredClone(existing.result?.reviewRecords || saved.reviewRecords || []);
        record.draft.reviewRecords = structuredClone(record.reviewRecords);
        record.draft.releaseSubmissions = structuredClone(existing.result?.draft?.releaseSubmissions || saved.releaseSubmissions || []);
        if (existing.result?.draft?.reviewStatus === 'reviewing') {
          if (submitting) { result = existing.result; return; }
          transaction.abort();
          return;
        }
        if (submitting) {
          saved.reviewResult = null;
          saved.legacyReview = false;
          saved.submittedAt = savedAt;
          saved.submissionId = 'REVIEW-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
          saved.currentReleaseReview = { submissionId: saved.submissionId, status: 'reviewing', submittedAt: savedAt };
          saved.releaseSubmissions = [...record.draft.releaseSubmissions, { id: saved.submissionId, submittedAt: savedAt, submitter: '当前开发者', status: 'reviewing', qualificationVersionId: saved.qualifications?.activeVersion?.versionId || saved.qualifications?.activeVersion?.id || '' }];
          const snapshot = structuredClone(saved);
          if (snapshot.pricing) {
            if (snapshot.pricing.model === 'free' || !snapshot.releaseRegions?.includes('global')) snapshot.pricing.globalPrice = '';
            if (snapshot.pricing.model === 'free' || !snapshot.releaseRegions?.includes('domestic')) snapshot.pricing.domesticPrice = '';
          }
          if (snapshot.releaseConfig?.mode === 'global') snapshot.releaseConfig.globalTerritoryCodes = (snapshot.releaseConfig.globalTerritoryCodes || []).filter(code => code !== 'CN');
          transaction.objectStore('submissions').add({ id: saved.submissionId, gameKey: draft.gameKey, submittedAt: savedAt, submitter: '当前开发者', status: 'reviewing', qualificationVersionId: saved.qualifications?.activeVersion?.versionId || saved.qualifications?.activeVersion?.id || '', draft: snapshot });
        }
        record.qualifications = structuredClone(saved.qualifications);
        profiles.put(record);
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('save-failed'));
    });
  };
  const withdraw = async draft => {
    if (!draft?.gameKey || !draft.submissionId || draft.reviewStatus !== 'reviewing') throw new Error('withdraw-unavailable');
    const gameKey = draft.gameKey;
    const submissionId = draft.submissionId;
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
      const profiles = transaction.objectStore('profiles');
      let result;
      let failure;
      const abort = code => { failure = new Error(code); transaction.abort(); };
      const snapshot = transaction.objectStore('submissions').get(submissionId);
      snapshot.onsuccess = () => {
        if (!snapshot.result || snapshot.result.gameKey !== gameKey) { abort('submission-missing'); return; }
        const request = profiles.get(gameKey);
        request.onsuccess = () => {
          const record = request.result;
          if (!record || record.draft?.submissionId !== submissionId || record.draft.reviewStatus !== 'reviewing' || record.reviewRecords?.some(item => item.submissionId === submissionId)) { abort('withdraw-conflict'); return; }
          const reviewedAt = new Date().toISOString();
          record.reviewRecords = [...(record.reviewRecords || []), { submissionId, decision: 'withdrawn', reason: '', reviewer: '开发者', reviewedAt }];
          Object.assign(record.draft, { reviewStatus: 'draft', reviewResult: null, currentReleaseReview: null, savedAt: reviewedAt, saving: false, submitting: false, withdrawing: false, dirty: false, errors: {} });
          record.draft.releaseSubmissions = (record.draft.releaseSubmissions || []).map(item => item.id === submissionId ? { ...item, status: 'withdrawn', reviewedAt } : item);
          if (record.draft.ui) Object.assign(record.draft.ui, { showMissing: false, reviewPreparing: false });
          result = record;
          profiles.put(record);
        };
      };
      transaction.oncomplete = () => {
        try { const channel = new BroadcastChannel('gamehub-publisher-review'); channel.postMessage({ type: 'review-updated', submissionId, decision: 'withdrawn' }); channel.close(); } catch { /* 页面重新聚焦时仍可恢复结果。 */ }
        resolve(result);
      };
      transaction.onerror = transaction.onabort = () => reject(failure || transaction.error || new Error('withdraw-failed'));
    });
  };
  const loadSubmissions = async gameKey => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('submissions', 'readonly');
      const request = transaction.objectStore('submissions').getAll();
      transaction.oncomplete = () => resolve((request.result || []).filter(item => !gameKey || item.gameKey === gameKey).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))));
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('load-submissions-failed'));
    });
  };
  window.PublisherProfileStore = { loadAll, loadSubmissions, save: (draft, game) => persist(draft, game, false), submit: (draft, game) => persist(draft, game, true), withdraw };
})();
