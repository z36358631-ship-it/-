/* 01/02 共用的发行资料存储结构：升级时保留 Blob 与历史提交原文。 */
(function (global) {
  'use strict';

  const DB_NAME = 'gamehub-publisher-profiles-v1';
  const DB_VERSION = 2;
  const STORES = ['profiles', 'submissions', 'qualificationApplications'];
  const ACCOUNT_DATABASE_PREFIX = `${DB_NAME}::account-v1::`;
  const MIGRATION_DATABASE = `${DB_NAME}::scope-migration-v1`;
  const MIGRATION_STORE = 'claims';
  const LEGACY_CLAIM_ID = 'legacy-unscoped-database';
  const localeAliases = {
    '简体中文': 'zh', '中文': 'zh', '英语': 'en', English: 'en',
    '繁体中文': 'zh-Hant', '日语': 'ja', '日本語': 'ja',
  };
  const connections = new Map();
  let migrationConnection;
  let migrationQueue = Promise.resolve();

  const clone = value => value == null ? value : structuredClone(value);
  const unique = values => [...new Set(values.filter(Boolean))];
  const localeCode = value => localeAliases[value] || value;
  const emptyAssets = () => ({ icon: null, landscape: [], portrait: [], screenshots: [], trailer: null, gameplay: null });
  const fileExists = value => Boolean(value && (value.blob instanceof Blob || value.name || value.size));

  function legacyLocales(source) {
    const configured = source.storeLocales?.enabled || source.nameLanguages || source.assetLanguageSettings?.nameLanguages;
    if (Array.isArray(configured)) {
      const values = unique(configured.map(localeCode));
      return values.length ? values : [localeCode(source.storeLocales?.default || source.defaultNameLanguage || 'en')];
    }
    const values = [
      ...(source.languages || []).map(localeCode),
      ...Object.keys(source.gameNames || {}),
      ...Object.keys(source.localizedContent || {}),
      ...Object.keys(source.localizedAssets || {}),
    ].map(localeCode);
    if (!values.length) values.push(source.defaultNameLanguage || 'en');
    return unique(values);
  }

  function normalizeCatalog(source) {
    if (source.catalog?.baseGame) {
      return {
        baseGame: { ...source.catalog.baseGame, skuId: source.catalog.baseGame.skuId || 'BASE', type: 'base_game' },
        dlcs: Array.isArray(source.catalog.dlcs) ? source.catalog.dlcs.map(item => ({ ...item, type: 'dlc' })) : [],
      };
    }
    const pricing = source.pricing || {};
    const mode = pricing.model === 'paid' ? 'paid' : 'free';
    return {
      baseGame: {
        skuId: 'BASE', type: 'base_game', title: '基础游戏', installContentRef: source.installContentRef || '',
        pricingModel: mode,
        listPrice: mode === 'paid' ? String(pricing.globalPrice || pricing.domesticPrice || '') : '',
        discountPrice: '', discountStartAt: '', discountEndAt: '',
      },
      dlcs: [],
    };
  }

  function normalizeRelease(source) {
    if (source.releaseConfig?.mode) {
      return {
        mode: source.releaseConfig.mode === 'domestic' ? 'domestic' : 'global',
        globalTerritoryCodes: unique(source.releaseConfig.globalTerritoryCodes || []).filter(code => code !== 'CN'),
        releaseStatus: source.releaseConfig.releaseStatus || 'released',
        effectiveMode: source.releaseConfig.effectiveMode === 'scheduled' ? 'scheduled' : 'immediate',
        scheduledAt: source.releaseConfig.scheduledAt || '',
        domesticDraft: clone(source.releaseConfig.domesticDraft || null),
      };
    }
    const regions = Array.isArray(source.releaseRegions) ? source.releaseRegions : [];
    const territoryCodes = (source.releaseTerritories || []).map(item => item?.code).filter(Boolean);
    const hasDomestic = regions.includes('domestic') || territoryCodes.includes('CN');
    const hasGlobal = regions.includes('global') || territoryCodes.some(code => code !== 'CN');
    return {
      mode: hasDomestic && !hasGlobal ? 'domestic' : 'global',
      globalTerritoryCodes: unique(territoryCodes.filter(code => code !== 'CN')),
      releaseStatus: source.releaseStatus || (source.releaseTerritories || []).find(item => item?.status)?.status || 'released',
      effectiveMode: source.publication?.mode === 'scheduled' ? 'scheduled' : 'immediate',
      scheduledAt: source.publication?.scheduledAt || '',
      domesticDraft: hasDomestic && hasGlobal ? {
        licenseNumber: source.licenseNumber || '',
        content: clone(source.localizedContent?.zh || { tagline: source.taglineZh || '', description: source.descriptionZh || '' }),
      } : null,
    };
  }

  function normalizeQualifications(source) {
    const current = source.qualifications || {};
    if ('activeVersion' in current || 'pendingApplication' in current || Array.isArray(current.history)) {
      return {
        rightsRelationship: current.rightsRelationship || 'self_owned',
        rightsDeclarationAccepted: Boolean(current.rightsDeclarationAccepted),
        activeVersion: clone(current.activeVersion || null),
        pendingApplication: clone(current.pendingApplication || null),
        history: clone(current.history || []),
        draft: clone(current.draft || {}),
      };
    }
    const attachments = Object.entries(current).filter(([, value]) => fileExists(value)).map(([kind, value]) => ({ kind, file: clone(value) }));
    return {
      rightsRelationship: source.relationship === 'publisher' ? 'agent' : 'self_owned',
      rightsDeclarationAccepted: false,
      activeVersion: null,
      pendingApplication: null,
      history: attachments.length ? [{ versionId: `LEGACY-${source.gameKey || 'UNKNOWN'}`, status: 'legacy_unknown', migratedAt: new Date().toISOString(), attachments }] : [],
      draft: {},
    };
  }

  function normalizeDraft(input = {}, game = {}) {
    const source = clone(input) || {};
    const enabled = legacyLocales(source);
    const defaultLocale = enabled.includes(source.storeLocales?.default) ? source.storeLocales.default
      : enabled.includes(source.defaultNameLanguage) ? source.defaultNameLanguage : enabled[0] || 'en';
    const currentLocale = enabled.includes(source.storeLocales?.current) ? source.storeLocales.current
      : enabled.includes(source.currentNameLanguage) ? source.currentNameLanguage : defaultLocale;
    const gameNames = clone(source.gameProfileDraft?.gameNames || source.gameNames || {});
    if (source.gameNameEn && !gameNames.en) gameNames.en = source.gameNameEn;
    if (source.gameNameZh && !gameNames.zh) gameNames.zh = source.gameNameZh;
    const localizedContent = clone(source.gameProfileDraft?.localizedContent || source.localizedContent || {});
    const localizedAssets = clone(source.gameProfileDraft?.localizedAssets || source.localizedAssets || {});
    enabled.forEach(code => {
      localizedContent[code] ||= { tagline: '', description: '', developerWords: '' };
      localizedAssets[code] ||= emptyAssets();
    });
    if (source.assets && !localizedAssets[defaultLocale]) localizedAssets[defaultLocale] = clone(source.assets);
    const releaseConfig = normalizeRelease(source);
    return {
      ...source,
      schemaVersion: 2,
      gameKey: source.gameKey || game.gameKey || '',
      gameProfileDraft: {
        ...(source.gameProfileDraft || {}), gameNames, defaultLocale, currentLocale, localizedContent, localizedAssets,
        genres: clone(source.gameProfileDraft?.genres || source.genres || game.genres || []),
        platforms: clone(source.gameProfileDraft?.platforms || source.platforms || []),
        relationship: source.gameProfileDraft?.relationship || source.relationship || game.relationship || 'developer_publisher',
        developerName: source.gameProfileDraft?.developerName ?? source.developerName ?? game.developerName ?? '',
        website: source.gameProfileDraft?.website ?? source.website ?? '',
        playerGroupName: source.gameProfileDraft?.playerGroupName ?? source.playerGroupName ?? '',
        playerGroupNumber: source.gameProfileDraft?.playerGroupNumber ?? source.playerGroupNumber ?? '',
        listedElsewhere: Boolean(source.gameProfileDraft?.listedElsewhere ?? source.listedElsewhere),
      },
      storeLocales: { enabled, default: defaultLocale, current: currentLocale },
      catalog: normalizeCatalog(source),
      releaseConfig,
      qualifications: normalizeQualifications(source),
      currentReleaseReview: clone(source.currentReleaseReview || (source.submissionId ? {
        submissionId: source.submissionId,
        status: source.reviewStatus || 'reviewing',
        submittedAt: source.submittedAt || source.savedAt || '',
      } : null)),
      releaseSubmissions: clone(source.releaseSubmissions || []),
      reviewRecords: clone(source.reviewRecords || []),
    };
  }

  function normalizeProfile(record = {}) {
    const result = clone(record) || {};
    result.draft = normalizeDraft(result.draft || result.profile || {}, result.game || {});
    result.gameKey = result.gameKey || result.draft.gameKey;
    result.qualifications = clone(result.qualifications || result.draft.qualifications);
    return result;
  }

  const normalizeSubmission = submission => ({ ...clone(submission), normalizedDraft: normalizeDraft(submission?.draft || {}, submission?.game || {}) });

  function migrateProfiles(store) {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      cursor.update(normalizeProfile(cursor.value));
      cursor.continue();
    };
  }

  const accountKey = () => global.PublisherAccountContext?.currentAccountKey?.(global.sessionStorage) || '';
  const databaseNameForAccount = value => {
    const normalized = String(value || '').trim();
    return normalized ? `${ACCOUNT_DATABASE_PREFIX}${encodeURIComponent(normalized)}` : DB_NAME;
  };

  function openDatabase(name) {
    if (!connections.has(name)) connections.set(name, new Promise((resolve, reject) => {
      const request = indexedDB.open(name, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === 'profiles' ? 'gameKey' : 'id' });
        }
        if (event.oldVersion < 2 && request.transaction?.objectStoreNames.contains('profiles')) migrateProfiles(request.transaction.objectStore('profiles'));
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connections.delete(name); };
        resolve(db);
      };
      request.onerror = () => { connections.delete(name); reject(request.error); };
      request.onblocked = () => { connections.delete(name); reject(new Error('storage-upgrade-blocked')); };
    }));
    return connections.get(name);
  }

  function openMigrationDatabase() {
    if (!migrationConnection) migrationConnection = new Promise((resolve, reject) => {
      const request = indexedDB.open(MIGRATION_DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(MIGRATION_STORE, { keyPath: 'id' });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); migrationConnection = null; };
        resolve(db);
      };
      request.onerror = () => { migrationConnection = null; reject(request.error); };
      request.onblocked = () => { migrationConnection = null; reject(new Error('storage-migration-blocked')); };
    });
    return migrationConnection;
  }

  async function claimLegacyDatabase(ownerAccountKey) {
    const db = await openMigrationDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MIGRATION_STORE, 'readwrite');
      const store = transaction.objectStore(MIGRATION_STORE);
      const request = store.get(LEGACY_CLAIM_ID);
      let claim = null;
      request.onsuccess = () => {
        const existing = request.result;
        if (!existing) {
          claim = { id: LEGACY_CLAIM_ID, accountKey: ownerAccountKey, status: 'claiming', claimedAt: new Date().toISOString(), completedAt: '' };
          store.add(claim);
          return;
        }
        claim = existing;
      };
      transaction.oncomplete = () => resolve(claim);
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('storage-migration-claim-failed'));
    });
  }

  async function completeLegacyClaim(ownerAccountKey) {
    const db = await openMigrationDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MIGRATION_STORE, 'readwrite');
      const store = transaction.objectStore(MIGRATION_STORE);
      const request = store.get(LEGACY_CLAIM_ID);
      request.onsuccess = () => {
        const claim = request.result;
        if (!claim || claim.accountKey !== ownerAccountKey) {
          transaction.abort();
          return;
        }
        store.put({ ...claim, status: 'complete', completedAt: new Date().toISOString() });
      };
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('storage-migration-complete-failed'));
    });
  }

  const readLegacyRecords = async db => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES, 'readonly');
    const requests = Object.fromEntries(STORES.map(name => [name, transaction.objectStore(name).getAll()]));
    transaction.oncomplete = () => resolve(Object.fromEntries(STORES.map(name => [name, requests[name].result || []])));
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('storage-migration-read-failed'));
  });

  const copyMissingRecords = async (db, records) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES, 'readwrite');
    for (const name of STORES) {
      const store = transaction.objectStore(name);
      const keyPath = name === 'profiles' ? 'gameKey' : 'id';
      for (const source of records[name] || []) {
        const value = clone(source);
        const key = value?.[keyPath];
        if (key == null || key === '') continue;
        const request = store.get(key);
        request.onsuccess = () => { if (request.result === undefined) store.put(value); };
      }
    }
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('storage-migration-copy-failed'));
  });

  async function migrateLegacyDatabase(ownerAccountKey, targetDatabase) {
    const claim = await claimLegacyDatabase(ownerAccountKey);
    if (!claim || claim.accountKey !== ownerAccountKey || claim.status === 'complete') return false;
    const legacyDatabase = await openDatabase(DB_NAME);
    const records = await readLegacyRecords(legacyDatabase);
    await copyMissingRecords(targetDatabase, records);
    await completeLegacyClaim(ownerAccountKey);
    return true;
  }

  async function open(options = {}) {
    const ownerAccountKey = String(options.accountKey || accountKey()).trim();
    if (!ownerAccountKey) return openDatabase(DB_NAME);
    const target = await openDatabase(databaseNameForAccount(ownerAccountKey));
    migrationQueue = migrationQueue.catch(() => undefined).then(() => migrateLegacyDatabase(ownerAccountKey, target));
    await migrationQueue;
    return target;
  }

  global.PublisherStorageSchema = {
    DB_NAME, DB_VERSION, STORES, open, accountKey, databaseNameForAccount,
    normalizeDraft, normalizeProfile, normalizeSubmission,
  };
})(window);
