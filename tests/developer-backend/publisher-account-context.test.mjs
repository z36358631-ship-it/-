import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope = { window: {} };
vm.runInNewContext(
  fs.readFileSync(new URL('../../demos/开发者后台一期/src/runtime/publisher-account-context.js', import.meta.url), 'utf8'),
  scope,
);
const context = scope.window.PublisherAccountContext;

class MemoryStorage {
  constructor(seed = {}) {
    this.values = new Map(Object.entries(seed));
    this.writes = [];
  }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    const serialized = String(value);
    this.writes.push([key, serialized]);
    this.values.set(key, serialized);
  }
  removeItem(key) { this.values.delete(key); }
}

const now = 1_800_000_000_000;
const validSession = (overrides = {}) => ({
  version: 2,
  authenticated: true,
  accountKey: 'phone:13800138001',
  vendorId: 'V-01',
  activeGameId: 'GAME-A',
  qualificationStatus: 'pending',
  expiresAt: now + 60_000,
  ...overrides,
});

test('handoff accepts each enterprise state and returns only a fresh normalized object', () => {
  for (const qualificationStatus of ['unsubmitted', 'pending', 'rejected', 'approved', 'delisted']) {
    const source = {
      source: 'gamehub-developer-platform',
      version: 1,
      authenticated: true,
      accountKey: ' phone:13800138001 ',
      vendorId: 'V-01',
      activeGameId: 'GAME-A',
      qualificationStatus,
      targetRoute: 'P02-01',
      targetTab: 'versions',
      expiresAt: now + 60_000,
      ignored: 'do-not-copy',
    };
    const handoff = context.readHandoff(JSON.stringify(source), now);
    assert.equal(handoff.accountKey, 'phone:13800138001');
    assert.equal(handoff.qualificationStatus, qualificationStatus);
    assert.equal(handoff.ignored, undefined);
    assert.notEqual(handoff, source);
  }
});

test('handoff rejects malformed, incomplete, expired and unsupported payloads', () => {
  const payload = {
    source: 'gamehub-developer-platform', version: 1, authenticated: true,
    accountKey: 'phone:13800138001', qualificationStatus: 'pending', expiresAt: now + 60_000,
  };
  assert.equal(context.readHandoff('not-json', now), null);
  assert.equal(context.readHandoff('{"expiresAt":0}', now), null);
  assert.equal(context.readHandoff(JSON.stringify({ ...payload, source: 'other-app' }), now), null);
  assert.equal(context.readHandoff(JSON.stringify({ ...payload, version: 2 }), now), null);
  assert.equal(context.readHandoff(JSON.stringify({ ...payload, authenticated: false }), now), null);
  assert.equal(context.readHandoff(JSON.stringify({ ...payload, accountKey: ' ' }), now), null);
  assert.equal(context.readHandoff(JSON.stringify({ ...payload, qualificationStatus: 'unknown' }), now), null);
  assert.equal(context.readHandoff(JSON.stringify({ ...payload, expiresAt: now }), now), null);
});

test('session validation rejects signed-out, anonymous and expired data', () => {
  const normalized = context.normalizeSession(validSession(), now);
  assert.equal(normalized.accountKey, 'phone:13800138001');
  assert.equal(normalized.qualificationStatus, 'pending');
  assert.equal(normalized.authenticated, true);
  assert.equal(context.normalizeSession(validSession({ authenticated: false }), now), null);
  assert.equal(context.normalizeSession(validSession({ accountKey: '' }), now), null);
  assert.equal(context.normalizeSession(validSession({ expiresAt: now - 1 }), now), null);
  assert.equal(context.normalizeSession(validSession({ qualificationStatus: 'bad-state' }), now), null);
});

test('session read, save and clear use the versioned key and clear the legacy key', () => {
  const storage = new MemoryStorage({
    'gamehub-developer-session-v1': JSON.stringify({ authenticated: true, accountKey: 'legacy' }),
  });
  assert.equal(context.saveSession(storage, validSession(), now), true);
  assert.equal(context.readSession(storage, now).activeGameId, 'GAME-A');
  assert.equal(storage.values.has(context.keys.session), true);

  assert.equal(context.clearSession(storage), true);
  assert.equal(storage.values.has(context.keys.session), false);
  assert.equal(storage.values.has(context.keys.legacySession), false);
});

test('current account and game scope follow the active session with a legacy fallback', () => {
  const storage = new MemoryStorage();
  context.saveSession(storage, validSession(), now);
  assert.equal(context.currentAccountKey(storage, now), 'phone:13800138001');
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.scopeFor(storage, ' GAME-A ', now))),
    { accountKey: 'phone:13800138001', gameKey: 'GAME-A' },
  );
  assert.equal(context.scopeFor(storage, '', now), null);

  const legacy = new MemoryStorage({
    'gamehub-developer-session-v1': JSON.stringify({ authenticated: true, accountKey: ' legacy-account ' }),
  });
  assert.equal(context.currentAccountKey(legacy, now), 'legacy-account');
  assert.equal(context.scopeFor(new MemoryStorage(), 'GAME-A', now), null);
});

test('workspaces are isolated by account and game and cloned in both directions', () => {
  const storage = new MemoryStorage();
  const source = { marker: 'A/A', nested: { value: 1 } };
  assert.equal(context.saveWorkspace(storage, 'account-a', 'game-a', source), true);
  context.saveWorkspace(storage, 'account-a', 'game-b', { marker: 'A/B' });
  context.saveWorkspace(storage, 'account-b', 'game-a', { marker: 'B/A' });

  source.nested.value = 99;
  const loaded = context.loadWorkspace(storage, 'account-a', 'game-a');
  assert.equal(loaded.marker, 'A/A');
  assert.equal(loaded.nested.value, 1);
  loaded.nested.value = 77;
  assert.equal(context.loadWorkspace(storage, 'account-a', 'game-a').nested.value, 1);
  assert.equal(context.loadWorkspace(storage, 'account-a', 'game-b').marker, 'A/B');
  assert.equal(context.loadWorkspace(storage, 'account-b', 'game-a').marker, 'B/A');

  const root = JSON.parse(storage.getItem(context.keys.accounts));
  assert.equal(root.accounts['account-a'].publisherWorkspaces['game-b'].marker, 'A/B');
  assert.equal(root.accounts['account-b'].publisherWorkspaces['game-a'].marker, 'B/A');
});

test('missing account or game never reads or writes publisher workspace data', () => {
  const storage = new MemoryStorage();
  assert.equal(context.saveWorkspace(storage, '', 'GAME-A', { marker: 'x' }), false);
  assert.equal(context.saveWorkspace(storage, 'account-a', '', { marker: 'x' }), false);
  assert.equal(context.loadWorkspace(storage, '', 'GAME-A'), null);
  assert.equal(context.loadWorkspace(storage, 'account-a', ''), null);
  assert.equal(storage.writes.length, 0);
});

test('legacy workspace migrates once and all later writes stay on the scoped key', () => {
  const legacy = { marker: 'legacy', profileDrafts: { A: { title: 'Draft A' } } };
  const storage = new MemoryStorage({
    'gamehub-developer-publisher-workspace-v1': JSON.stringify(legacy),
  });

  const migrated = context.migrateLegacyWorkspace(storage, 'account-a', 'game-a');
  assert.equal(migrated.marker, 'legacy');
  assert.equal(context.loadWorkspace(storage, 'account-a', 'game-a').profileDrafts.A.title, 'Draft A');
  assert.equal(storage.getItem(context.keys.legacyWorkspace), null);

  context.saveWorkspace(storage, 'account-a', 'game-a', { marker: 'updated' });
  assert.equal(context.loadWorkspace(storage, 'account-a', 'game-a').marker, 'updated');
  assert.equal(storage.writes.some(([key]) => key === context.keys.legacyWorkspace), false);
  assert.equal(context.migrateLegacyWorkspace(storage, 'account-a', 'game-a'), null);
});

test('legacy workspace remains when the scoped write fails', () => {
  const legacyKey = 'gamehub-developer-publisher-workspace-v1';
  const storage = new MemoryStorage({ [legacyKey]: JSON.stringify({ marker: 'legacy' }) });
  storage.setItem = () => { throw new Error('quota exceeded'); };

  assert.equal(context.migrateLegacyWorkspace(storage, 'account-a', 'game-a'), null);
  assert.notEqual(storage.getItem(legacyKey), null);
});
