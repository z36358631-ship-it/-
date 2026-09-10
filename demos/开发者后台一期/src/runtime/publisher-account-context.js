/* 01/02 共用的会话交接和按账号、游戏隔离的发行工作区存储。 */
(function registerPublisherAccountContext(scope) {
  'use strict';

  const SESSION_KEY = 'gamehub-developer-session-v2';
  const ACCOUNTS_KEY = 'gamehub-developer-publisher-accounts-v2';
  const LEGACY_SESSION_KEY = 'gamehub-developer-session-v1';
  const LEGACY_WORKSPACE_KEY = 'gamehub-developer-publisher-workspace-v1';
  const HANDOFF_SOURCE = 'gamehub-developer-platform';
  const HANDOFF_VERSION = 1;
  const STORAGE_VERSION = 2;
  const qualificationStatuses = new Set(['unsubmitted', 'pending', 'rejected', 'approved', 'delisted']);

  const stringValue = value => String(value ?? '').trim();
  const clone = value => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  };
  const recordFrom = value => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  const parseRecord = value => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return recordFrom(parsed);
    } catch {
      return null;
    }
  };
  const pathFor = (accountKey, gameId) => [stringValue(accountKey), stringValue(gameId)];
  const validExpiry = (value, now) => Number.isFinite(Number(value)) && Number(value) > Number(now);
  const normalizedQualificationStatus = value => {
    if (value == null || value === '') return 'unsubmitted';
    return qualificationStatuses.has(value) ? value : '';
  };

  const normalizeSession = (value, now = Date.now()) => {
    const source = parseRecord(value);
    if (!source || source.authenticated !== true) return null;
    const accountKey = stringValue(source.accountKey);
    if (!accountKey || !validExpiry(source.expiresAt, now)) return null;
    const qualificationStatus = normalizedQualificationStatus(source.qualificationStatus);
    if (!qualificationStatus) return null;

    return {
      version: STORAGE_VERSION,
      authenticated: true,
      accountKey,
      vendorId: stringValue(source.vendorId),
      activeGameId: stringValue(source.activeGameId),
      qualificationStatus,
      expiresAt: Number(source.expiresAt),
    };
  };

  const readHandoff = (raw, now = Date.now()) => {
    const source = parseRecord(raw);
    if (!source
      || source.source !== HANDOFF_SOURCE
      || Number(source.version) !== HANDOFF_VERSION
      || source.authenticated !== true
      || !stringValue(source.accountKey)
      || !validExpiry(source.expiresAt, now)) return null;
    const qualificationStatus = normalizedQualificationStatus(source.qualificationStatus);
    if (!qualificationStatus) return null;

    return {
      source: HANDOFF_SOURCE,
      version: HANDOFF_VERSION,
      authenticated: true,
      accountKey: stringValue(source.accountKey),
      vendorId: stringValue(source.vendorId),
      activeGameId: stringValue(source.activeGameId),
      qualificationStatus,
      targetRoute: stringValue(source.targetRoute || source.targetPage),
      targetTab: stringValue(source.targetTab),
      expiresAt: Number(source.expiresAt),
    };
  };

  const readStorageRecord = (storage, key) => {
    try {
      return parseRecord(storage?.getItem?.(key));
    } catch {
      return null;
    }
  };

  const readSession = (storage, now = Date.now()) => {
    const session = normalizeSession(readStorageRecord(storage, SESSION_KEY), now);
    if (!session) {
      try { storage?.removeItem?.(SESSION_KEY); } catch { /* 无法清理时仍按未登录处理。 */ }
    }
    return session;
  };

  const currentAccountKey = (storage, now = Date.now()) => {
    const current = readSession(storage, now);
    if (current?.accountKey) return current.accountKey;
    const legacy = readStorageRecord(storage, LEGACY_SESSION_KEY);
    return legacy?.authenticated === true ? stringValue(legacy.accountKey) : '';
  };

  const scopeFor = (storage, gameKey, now = Date.now()) => {
    const accountKey = currentAccountKey(storage, now);
    const logicalGameKey = stringValue(gameKey);
    return accountKey && logicalGameKey ? Object.freeze({ accountKey, gameKey: logicalGameKey }) : null;
  };

  const saveSession = (storage, value, now = Date.now()) => {
    const session = normalizeSession(value, now);
    if (!session) return false;
    try {
      storage?.setItem?.(SESSION_KEY, JSON.stringify(session));
      return true;
    } catch {
      return false;
    }
  };

  const clearSession = storage => {
    try {
      storage?.removeItem?.(SESSION_KEY);
      storage?.removeItem?.(LEGACY_SESSION_KEY);
      return true;
    } catch {
      return false;
    }
  };

  const normalizeAccountsRoot = value => {
    const source = recordFrom(value) || {};
    return {
      ...source,
      version: STORAGE_VERSION,
      accounts: recordFrom(source.accounts) || {},
    };
  };

  const readAccountsRoot = storage => normalizeAccountsRoot(readStorageRecord(storage, ACCOUNTS_KEY));

  const loadWorkspace = (storage, accountKey, gameId) => {
    const [accountId, gameKey] = pathFor(accountKey, gameId);
    if (!accountId || !gameKey) return null;
    const root = readAccountsRoot(storage);
    const account = recordFrom(root.accounts[accountId]);
    const workspaces = recordFrom(account?.publisherWorkspaces);
    const workspace = recordFrom(workspaces?.[gameKey]);
    try {
      return workspace ? clone(workspace) : null;
    } catch {
      return null;
    }
  };

  const saveWorkspace = (storage, accountKey, gameId, workspace) => {
    const [accountId, gameKey] = pathFor(accountKey, gameId);
    const source = recordFrom(workspace);
    if (!accountId || !gameKey || !source) return false;

    try {
      const root = readAccountsRoot(storage);
      const currentAccounts = recordFrom(root.accounts) || {};
      const currentAccount = recordFrom(currentAccounts[accountId]) || {};
      const currentWorkspaces = recordFrom(currentAccount.publisherWorkspaces) || {};
      const nextWorkspace = clone(source);
      const nextRoot = {
        ...root,
        version: STORAGE_VERSION,
        accounts: {
          ...currentAccounts,
          [accountId]: {
            ...currentAccount,
            publisherWorkspaces: {
              ...currentWorkspaces,
              [gameKey]: nextWorkspace,
            },
          },
        },
      };
      storage?.setItem?.(ACCOUNTS_KEY, JSON.stringify(nextRoot));
      return true;
    } catch {
      return false;
    }
  };

  const migrateLegacyWorkspace = (storage, accountKey, gameId) => {
    const [accountId, gameKey] = pathFor(accountKey, gameId);
    if (!accountId || !gameKey) return null;
    const legacyWorkspace = readStorageRecord(storage, LEGACY_WORKSPACE_KEY);
    if (!legacyWorkspace) return null;
    if (!saveWorkspace(storage, accountId, gameKey, legacyWorkspace)) return null;

    try { storage?.removeItem?.(LEGACY_WORKSPACE_KEY); } catch { /* 新数据已安全写入，后续仍优先读取新键。 */ }
    return loadWorkspace(storage, accountId, gameKey);
  };

  scope.PublisherAccountContext = Object.freeze({
    keys: Object.freeze({
      session: SESSION_KEY,
      accounts: ACCOUNTS_KEY,
      legacySession: LEGACY_SESSION_KEY,
      legacyWorkspace: LEGACY_WORKSPACE_KEY,
    }),
    pathFor,
    normalizeSession,
    readSession,
    currentAccountKey,
    scopeFor,
    saveSession,
    clearSession,
    readHandoff,
    loadWorkspace,
    saveWorkspace,
    migrateLegacyWorkspace,
  });
})(window);
