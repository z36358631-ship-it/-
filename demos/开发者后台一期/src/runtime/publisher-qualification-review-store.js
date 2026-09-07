/*
 * 独立资质申请存储。
 * 契约：submit/saveDraft 仅改 profiles.qualifications 与 qualificationApplications；
 * 不修改 currentReleaseReview、releaseSubmissions 或 submissions 快照。
 */
(function (global) {
  'use strict';

  const STORE = 'qualificationApplications';
  const PROFILE_STORE = 'profiles';
  const REVIEWABLE = ['reviewing'];
  const WITHDRAWABLE = ['reviewing', 'supplement_required'];
  const clone = value => value == null ? value : structuredClone(value);
  const now = () => new Date().toISOString();
  const present = value => Boolean(String(value ?? '').trim());
  const newestFirst = (a, b) => String(b.updatedAt || b.submittedAt).localeCompare(String(a.updatedAt || a.submittedAt)) || Number(String(b.versionId || '').match(/\d+$/)?.[0] || 0) - Number(String(a.versionId || '').match(/\d+$/)?.[0] || 0);
  const rules = () => {
    if (!global.PublisherGameQualifications) throw new Error('qualification-rules-unavailable');
    return global.PublisherGameQualifications;
  };
  const open = async () => {
    if (!global.PublisherStorageSchema?.open) throw new Error('qualification-storage-unavailable');
    const db = await global.PublisherStorageSchema.open();
    if (!db.objectStoreNames.contains(PROFILE_STORE) || !db.objectStoreNames.contains(STORE)) throw new Error('qualification-storage-unavailable');
    return db;
  };
  const failure = (code, details) => Object.assign(new Error(code), details ? { details: clone(details) } : {});
  const broadcast = (type, application) => {
    try {
      const channel = new BroadcastChannel('gamehub-publisher-qualification-review');
      channel.postMessage({ type, applicationId: application?.id || '', gameKey: application?.gameKey || '', status: application?.status || '' });
      channel.close();
    } catch { /* 页面重新聚焦或刷新仍会恢复最新状态。 */ }
  };

  function stateFrom(record = {}) {
    return rules().createQualificationState(record.qualifications || record.draft?.qualifications || {});
  }

  function writeState(record, stateValue) {
    const state = clone(stateValue);
    record.qualifications = clone(state);
    if (record.draft && typeof record.draft === 'object') record.draft.qualifications = clone(state);
    return record;
  }

  const pointer = application => ({
    id: application.versionId,
    applicationId: application.id,
    type: application.type,
    status: application.status,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    applicant: application.applicant,
    reviewedAt: application.reviewedAt || '',
    reviewer: application.reviewer || '',
    reason: application.reason || '',
    context: clone(application.context),
    snapshot: clone(application.snapshot),
  });

  function putHistory(state, item) {
    state.history = [...(state.history || []).filter(entry => (entry.applicationId || entry.id) !== (item.applicationId || item.id)), clone(item)];
  }

  function nextVersionId(state) {
    const candidates = [state.activeVersion, state.pendingApplication, ...(state.history || [])];
    const highest = candidates.reduce((max, item) => {
      const matched = String(item?.id || item?.versionId || '').match(/^QUAL-V(\d+)$/);
      return matched ? Math.max(max, Number(matched[1])) : max;
    }, 0);
    return `QUAL-V${highest + 1}`;
  }

  function submitArguments(input, snapshot, options = {}) {
    if (typeof input === 'string') return { gameKey: input, snapshot, ...options };
    return input || {};
  }

  async function saveDraft(input, draft, options = {}) {
    const args = submitArguments(input, draft, options);
    if (!present(args.gameKey)) throw failure('game-key-required');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROFILE_STORE, 'readwrite');
      let result;
      let error;
      const abort = (code, details) => { error = failure(code, details); transaction.abort(); };
      const request = transaction.objectStore(PROFILE_STORE).get(args.gameKey);
      request.onsuccess = () => {
        const record = request.result;
        if (!record) { abort('profile-missing'); return; }
        const state = stateFrom(record);
        if (state.pendingApplication?.status === 'reviewing') { abort('pending-application-exists'); return; }
        state.draft = rules().createApplicationDraft(args.draft || args.snapshot || {});
        state.rightsRelationship = state.draft.rightsRelationship;
        state.rightsDeclarationAccepted = state.draft.rightsDeclarationAccepted;
        writeState(record, state);
        transaction.objectStore(PROFILE_STORE).put(record);
        result = clone(state);
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () => reject(error || transaction.error || failure('qualification-draft-save-failed'));
    });
  }

  async function submit(input, snapshot, options = {}) {
    const args = submitArguments(input, snapshot, options);
    if (!present(args.gameKey)) throw failure('game-key-required');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILE_STORE, STORE], 'readwrite');
      const profiles = transaction.objectStore(PROFILE_STORE);
      const applications = transaction.objectStore(STORE);
      let result;
      let error;
      const abort = (code, details) => { error = failure(code, details); transaction.abort(); };
      const profileRequest = profiles.get(args.gameKey);
      profileRequest.onsuccess = () => {
        const record = profileRequest.result;
        if (!record) { abort('profile-missing'); return; }
        const state = stateFrom(record);
        const qualificationDraft = rules().createApplicationDraft(args.snapshot || args.draft || state.draft);
        const context = clone(args.context || rules().contextFor(record.draft || record, { referenceDate: args.referenceDate }));
        const issues = rules().validateApplication(qualificationDraft, context, { referenceDate: args.referenceDate });
        if (Object.keys(issues).length) { abort('qualification-incomplete', issues); return; }

        if (state.pendingApplication) {
          const pending = state.pendingApplication;
          const requestedId = args.applicationId || args.id || '';
          if (pending.status !== 'supplement_required' || requestedId && ![pending.applicationId, pending.id].includes(requestedId)) { abort('pending-application-exists'); return; }
          const existingRequest = applications.get(pending.applicationId);
          existingRequest.onsuccess = () => {
            const existing = existingRequest.result;
            if (!existing || existing.status !== 'supplement_required') { abort('application-conflict'); return; }
            const changedAt = now();
            const application = {
              ...existing, status: 'reviewing', updatedAt: changedAt, resubmittedAt: changedAt,
              context, snapshot: clone(qualificationDraft), reason: '', reviewer: '', reviewedAt: '',
              audit: [...(existing.audit || []), { action: 'resubmitted', actor: args.applicant || existing.applicant || '开发者', at: changedAt }],
            };
            state.draft = clone(qualificationDraft);
            state.rightsRelationship = qualificationDraft.rightsRelationship;
            state.rightsDeclarationAccepted = qualificationDraft.rightsDeclarationAccepted;
            state.pendingApplication = pointer(application);
            writeState(record, state);
            profiles.put(record);
            applications.put(application);
            result = { application: clone(application), qualifications: clone(state), profile: clone(record) };
          };
          return;
        }

        const versionId = nextVersionId(state);
        const submittedAt = now();
        const application = {
          id: `${args.gameKey}::${versionId}`,
          gameKey: args.gameKey,
          versionId,
          type: args.type || rules().TYPE,
          status: 'reviewing',
          submittedAt,
          updatedAt: submittedAt,
          applicant: args.applicant || '开发者',
          context,
          snapshot: clone(qualificationDraft),
          reason: '', reviewer: '', reviewedAt: '',
          audit: [{ action: 'submitted', actor: args.applicant || '开发者', at: submittedAt }],
        };
        state.draft = clone(qualificationDraft);
        state.rightsRelationship = qualificationDraft.rightsRelationship;
        state.rightsDeclarationAccepted = qualificationDraft.rightsDeclarationAccepted;
        state.pendingApplication = pointer(application);
        writeState(record, state);
        profiles.put(record);
        applications.add(application);
        result = { application: clone(application), qualifications: clone(state), profile: clone(record) };
      };
      transaction.oncomplete = () => { broadcast('qualification-submitted', result?.application); resolve(result); };
      transaction.onerror = transaction.onabort = () => reject(error || transaction.error || failure('qualification-submit-failed'));
    });
  }

  const actionArguments = (input, options = {}) => typeof input === 'string' ? { applicationId: input, ...options } : input || {};
  const applicationKey = args => args.applicationId || (args.gameKey && args.id ? `${args.gameKey}::${args.id}` : args.id) || '';

  async function transition(input, options, action) {
    const args = actionArguments(input, options);
    const key = applicationKey(args);
    if (!present(key)) throw failure('application-id-required');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILE_STORE, STORE], 'readwrite');
      const profiles = transaction.objectStore(PROFILE_STORE);
      const applications = transaction.objectStore(STORE);
      let result;
      let error;
      const abort = (code, details) => { error = failure(code, details); transaction.abort(); };
      const applicationRequest = applications.get(key);
      applicationRequest.onsuccess = () => {
        const application = applicationRequest.result;
        if (!application) { abort('application-missing'); return; }
        const profileRequest = profiles.get(application.gameKey);
        profileRequest.onsuccess = () => {
          const record = profileRequest.result;
          if (!record) { abort('profile-missing'); return; }
          const state = stateFrom(record);
          if (!state.pendingApplication || state.pendingApplication.applicationId !== application.id || state.pendingApplication.status !== application.status) { abort('application-conflict'); return; }
          try {
            action({ args, application, record, state, profiles, applications });
            result = { application: clone(application), qualifications: clone(state), profile: clone(record) };
          } catch (caught) {
            abort(caught?.message || 'qualification-transition-failed', caught?.details);
          }
        };
      };
      transaction.oncomplete = () => { broadcast('qualification-updated', result?.application); resolve(result); };
      transaction.onerror = transaction.onabort = () => reject(error || transaction.error || failure('qualification-transition-failed'));
    });
  }

  const finish = ({ application, record, state, profiles, applications }) => {
    writeState(record, state);
    profiles.put(record);
    applications.put(application);
  };

  function withdraw(input, options = {}) {
    return transition(input, options, ({ args, application, record, state, profiles, applications }) => {
      if (!WITHDRAWABLE.includes(application.status)) throw failure('withdraw-unavailable');
      const changedAt = now();
      Object.assign(application, { status: 'withdrawn', updatedAt: changedAt, reviewedAt: changedAt, reviewer: args.actor || '开发者', reason: '' });
      application.audit = [...(application.audit || []), { action: 'withdrawn', actor: args.actor || '开发者', at: changedAt }];
      state.pendingApplication = null;
      state.draft = clone(application.snapshot);
      putHistory(state, pointer(application));
      finish({ application, record, state, profiles, applications });
    });
  }

  function requestSupplement(input, options = {}) {
    return transition(input, options, ({ args, application, record, state, profiles, applications }) => {
      if (!REVIEWABLE.includes(application.status)) throw failure('already-reviewed');
      const reason = String(args.reason ?? '').trim();
      if (!reason) throw failure('reason-required');
      if (reason.length > 2000) throw failure('reason-too-long');
      const changedAt = now();
      Object.assign(application, { status: 'supplement_required', updatedAt: changedAt, reviewedAt: changedAt, reviewer: args.reviewer || '资质审核员', reason });
      application.audit = [...(application.audit || []), { action: 'supplement_required', actor: application.reviewer, at: changedAt, reason }];
      state.pendingApplication = pointer(application);
      state.draft = clone(application.snapshot);
      finish({ application, record, state, profiles, applications });
    });
  }

  function decide(input, options = {}) {
    return transition(input, options, ({ args, application, record, state, profiles, applications }) => {
      if (!REVIEWABLE.includes(application.status)) throw failure('already-reviewed');
      if (!['approved', 'rejected'].includes(args.decision)) throw failure('invalid-decision');
      const reason = String(args.reason ?? '').trim();
      if (args.decision === 'rejected' && !reason) throw failure('reason-required');
      if (reason.length > 2000) throw failure('reason-too-long');
      if (args.decision === 'approved') {
        const issues = rules().validateApplication(application.snapshot, application.context);
        if (Object.keys(issues).length) throw failure('approval-incomplete', issues);
      }
      const changedAt = now();
      Object.assign(application, { status: args.decision, updatedAt: changedAt, reviewedAt: changedAt, reviewer: args.reviewer || '资质审核员', reason: args.decision === 'rejected' ? reason : '' });
      application.audit = [...(application.audit || []), { action: args.decision, actor: application.reviewer, at: changedAt, reason: application.reason }];
      state.pendingApplication = null;
      state.draft = clone(application.snapshot);
      if (args.decision === 'approved') {
        if (state.activeVersion && state.activeVersion.id !== application.versionId) putHistory(state, { ...state.activeVersion, status: 'superseded', supersededAt: changedAt });
        state.activeVersion = pointer(application);
      } else putHistory(state, pointer(application));
      finish({ application, record, state, profiles, applications });
    });
  }

  async function loadByGame(gameKey) {
    if (!present(gameKey)) throw failure('game-key-required');
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILE_STORE, STORE], 'readonly');
      const profileRequest = transaction.objectStore(PROFILE_STORE).get(gameKey);
      const applicationsRequest = transaction.objectStore(STORE).getAll();
      transaction.oncomplete = () => {
        const profile = profileRequest.result || null;
        resolve({ gameKey, profile: clone(profile), qualifications: profile ? clone(stateFrom(profile)) : null, applications: (applicationsRequest.result || []).filter(item => item.gameKey === gameKey).sort(newestFirst).map(clone) });
      };
      transaction.onerror = transaction.onabort = () => reject(transaction.error || failure('qualification-load-failed'));
    });
  }

  async function loadQueue(filters = {}) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROFILE_STORE, STORE], 'readonly');
      const profileRequest = transaction.objectStore(PROFILE_STORE).getAll();
      const applicationsRequest = transaction.objectStore(STORE).getAll();
      transaction.oncomplete = () => {
        const profiles = new Map((profileRequest.result || []).map(record => [record.gameKey, record]));
        const statuses = Array.isArray(filters.status) ? filters.status : filters.status ? [filters.status] : [];
        const keyword = String(filters.keyword || '').trim().toLocaleLowerCase();
        const rows = (applicationsRequest.result || []).map(application => {
          const profile = profiles.get(application.gameKey);
          return { ...clone(application), game: clone(profile?.game || {}), projectName: profile?.game?.name || profile?.projectName || application.gameKey, qualifications: profile ? clone(stateFrom(profile)) : null };
        }).filter(row => !statuses.length || statuses.includes(row.status)).filter(row => !filters.gameKey || row.gameKey === filters.gameKey).filter(row => !keyword || `${row.projectName} ${row.gameKey} ${row.versionId}`.toLocaleLowerCase().includes(keyword)).sort(newestFirst);
        resolve(rows);
      };
      transaction.onerror = transaction.onabort = () => reject(transaction.error || failure('qualification-load-failed'));
    });
  }

  global.PublisherQualificationReviewStore = { loadQueue, loadByGame, saveDraft, submit, withdraw, decide, requestSupplement };
})(window);
