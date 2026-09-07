/* 01/02 共用的发行资料存储结构：升级时保留 Blob 与历史提交原文。 */
(function (global) {
  'use strict';

  const DB_NAME = 'gamehub-publisher-profiles-v1';
  const DB_VERSION = 2;
  const STORES = ['profiles', 'submissions', 'qualificationApplications'];
  const localeAliases = {
    '简体中文': 'zh', '中文': 'zh', '英语': 'en', English: 'en',
    '繁体中文': 'zh-Hant', '日语': 'ja', '日本語': 'ja',
  };
  let connection;

  const clone = value => value == null ? value : structuredClone(value);
  const unique = values => [...new Set(values.filter(Boolean))];
  const localeCode = value => localeAliases[value] || value;
  const emptyAssets = () => ({ icon: null, landscape: [], portrait: [], screenshots: [], trailer: null, gameplay: null });
  const fileExists = value => Boolean(value && (value.blob instanceof Blob || value.name || value.size));

  function legacyLocales(source) {
    const values = [
      ...(source.storeLocales?.enabled || []),
      ...(source.nameLanguages || []),
      ...(source.assetLanguageSettings?.nameLanguages || []),
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
      rightsRelationship: source.relationship === 'publisher' ? 'agency' : 'self_owned',
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

  function open() {
    if (!connection) connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = request.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === 'profiles' ? 'gameKey' : 'id' });
        }
        if (event.oldVersion < 2 && request.transaction?.objectStoreNames.contains('profiles')) migrateProfiles(request.transaction.objectStore('profiles'));
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = null; };
        resolve(db);
      };
      request.onerror = () => { connection = null; reject(request.error); };
      request.onblocked = () => { connection = null; reject(new Error('storage-upgrade-blocked')); };
    });
    return connection;
  }

  global.PublisherStorageSchema = { DB_NAME, DB_VERSION, STORES, open, normalizeDraft, normalizeProfile, normalizeSubmission };
})(window);
