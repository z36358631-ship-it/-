import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const root = process.cwd();
const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));
const host = path.join(root, 'tests', 'developer-backend', '.publisher-storage-test-host.html');
const runtime = file => path.join(root, 'demos', '开发者后台一期', 'src', 'runtime', file);
let browser;

before(async () => {
  assert.ok(chrome, 'Chrome or Edge not found');
  fs.writeFileSync(host, '<!doctype html><html><body></body></html>', 'utf8');
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--allow-file-access-from-files'] });
});

after(async () => {
  await browser?.close();
  try { fs.unlinkSync(host); } catch { /* test host is already absent */ }
});

async function openHarness({ withStores = true } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(host).href);
  await page.addScriptTag({ path: runtime('publisher-account-context.js') });
  if (withStores) {
    for (const file of [
      'publisher-storage-schema.js',
      'publisher-game-qualifications.js',
      'publisher-profile-store.js',
      'publisher-qualification-review-store.js',
    ]) await page.addScriptTag({ path: runtime(file) });
    await page.evaluate(() => { window.PublisherGameBuilds = { prepareForSubmission: value => value || [] }; });
  }
  return { context, page, errors };
}

const setAccount = (page, accountKey) => page.evaluate(key => {
  const expiresAt = Date.now() + 60 * 60 * 1000;
  if (!window.PublisherAccountContext.saveSession(sessionStorage, {
    version: 2, authenticated: true, accountKey: key, vendorId: `V-${key}`,
    activeGameId: '', qualificationStatus: 'approved', expiresAt,
  })) throw new Error('session-save-failed');
}, accountKey);

const saveGame = (page, { gameKey, projectName, applicant }) => page.evaluate(async input => {
  const qualifications = window.PublisherGameQualifications.createQualificationState();
  const draft = {
    schemaVersion: 2,
    gameKey: input.gameKey,
    projectName: input.projectName,
    reviewStatus: 'draft',
    ui: {},
    buildPackages: [],
    storeLocales: { enabled: ['en'], default: 'en', current: 'en' },
    gameProfileDraft: {
      gameNames: { en: input.projectName }, defaultLocale: 'en', currentLocale: 'en',
      localizedContent: { en: { tagline: 'Account scoped profile', description: input.projectName, developerWords: '' } },
      localizedAssets: { en: { icon: null, landscape: [], portrait: [], screenshots: [], trailer: null, gameplay: null } },
      genres: ['Adventure'], platforms: ['Windows'], relationship: 'developer_publisher', developerName: input.applicant,
    },
    catalog: { baseGame: { skuId: 'BASE', type: 'base_game', title: input.projectName, installContentRef: 'BUILD-1', pricingModel: 'free' }, dlcs: [] },
    releaseConfig: { mode: 'global', globalTerritoryCodes: ['US'], releaseStatus: 'released', effectiveMode: 'immediate', scheduledAt: '', domesticDraft: null },
    qualifications,
  };
  await window.PublisherProfileStore.save(draft, { gameKey: input.gameKey, projectName: input.projectName, name: input.projectName });
  const stored = (await window.PublisherProfileStore.loadAll()).find(item => item.gameKey === input.gameKey);
  await window.PublisherProfileStore.submit(stored.draft, stored.game);
  const proof = new Blob([input.applicant], { type: 'image/png' });
  const snapshot = window.PublisherGameQualifications.createApplicationDraft({
    rightsRelationship: 'self_owned', rightsDeclarationAccepted: true,
    authorization: { files: [{ name: `${input.applicant}-rights.png`, type: proof.type, size: proof.size, blob: proof }] },
  });
  await window.PublisherQualificationReviewStore.submit({
    gameKey: input.gameKey,
    snapshot,
    applicant: input.applicant,
    context: { mode: 'global', territoryCodes: ['US'], platforms: ['Windows'], releaseStatus: 'released', effectiveAt: '2026-09-10T00:00:00.000Z' },
  });
}, { gameKey, projectName, applicant });

const accountSnapshot = page => page.evaluate(async () => ({
  database: (await window.PublisherStorageSchema.open()).name,
  profiles: (await window.PublisherProfileStore.loadAll()).map(item => ({ gameKey: item.gameKey, projectName: item.game.projectName })).sort((a, b) => a.gameKey.localeCompare(b.gameKey)),
  submissions: (await window.PublisherProfileStore.loadSubmissions()).map(item => ({ gameKey: item.gameKey, submitter: item.submitter })),
  qualifications: (await window.PublisherQualificationReviewStore.loadQueue()).map(item => ({ gameKey: item.gameKey, applicant: item.applicant, versionId: item.versionId })),
}));

test('相同逻辑游戏键在两个登录账号下隔离资料、上架提交和资质申请', async () => {
  const { context, page, errors } = await openHarness();
  try {
    await setAccount(page, 'account-A');
    await saveGame(page, { gameKey: 'shared-game', projectName: 'Account A Game', applicant: 'Developer A' });
    await saveGame(page, { gameKey: 'account-a-only', projectName: 'Only A', applicant: 'Developer A' });
    const accountA = await accountSnapshot(page);

    await setAccount(page, 'account-B');
    assert.deepEqual(await accountSnapshot(page), {
      database: await page.evaluate(() => window.PublisherStorageSchema.databaseNameForAccount('account-B')),
      profiles: [], submissions: [], qualifications: [],
    });
    await saveGame(page, { gameKey: 'shared-game', projectName: 'Account B Game', applicant: 'Developer B' });
    const accountB = await accountSnapshot(page);

    await setAccount(page, 'account-A');
    const restoredA = await accountSnapshot(page);

    assert.notEqual(accountA.database, accountB.database);
    assert.deepEqual(accountA.profiles, [
      { gameKey: 'account-a-only', projectName: 'Only A' },
      { gameKey: 'shared-game', projectName: 'Account A Game' },
    ]);
    assert.equal(accountA.submissions.length, 2);
    assert.deepEqual(accountA.qualifications.map(item => item.applicant), ['Developer A', 'Developer A']);
    assert.deepEqual(accountB.profiles, [{ gameKey: 'shared-game', projectName: 'Account B Game' }]);
    assert.equal(accountB.submissions.length, 1);
    assert.deepEqual(accountB.qualifications, [{ gameKey: 'shared-game', applicant: 'Developer B', versionId: 'QUAL-V1' }]);
    assert.deepEqual(restoredA, accountA);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test('旧全局数据库只迁移给首个登录账号并完整保留 Blob 与提交原文', async () => {
  const { context, page, errors } = await openHarness({ withStores: false });
  try {
    const seeded = await page.evaluate(async () => {
      const databaseName = 'gamehub-publisher-profiles-v1';
      const opening = indexedDB.open(databaseName, 2);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        db.createObjectStore('profiles', { keyPath: 'gameKey' });
        db.createObjectStore('submissions', { keyPath: 'id' });
        db.createObjectStore('qualificationApplications', { keyPath: 'id' });
      };
      const db = await new Promise((resolve, reject) => { opening.onsuccess = () => resolve(opening.result); opening.onerror = () => reject(opening.error); });
      const blob = new Blob(['legacy-image'], { type: 'image/png' });
      const transaction = db.transaction(['profiles', 'submissions', 'qualificationApplications'], 'readwrite');
      transaction.objectStore('profiles').put({ gameKey: 'legacy-game', game: { gameKey: 'legacy-game', projectName: 'Legacy Game' }, draft: { gameKey: 'legacy-game', marker: 'legacy-profile', assets: { icon: { name: 'legacy.png', size: blob.size, blob } } } });
      transaction.objectStore('submissions').put({ id: 'LEGACY-SUBMISSION', gameKey: 'legacy-game', submittedAt: '2026-09-01T00:00:00.000Z', draft: { marker: 'immutable-original' } });
      transaction.objectStore('qualificationApplications').put({ id: 'legacy-game::QUAL-V1', gameKey: 'legacy-game', versionId: 'QUAL-V1', applicant: 'Legacy Developer', status: 'approved' });
      await new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = transaction.onabort = () => reject(transaction.error); });
      db.close();
      return blob.size;
    });

    await setAccount(page, 'migration-owner');
    for (const file of ['publisher-storage-schema.js', 'publisher-game-qualifications.js', 'publisher-profile-store.js', 'publisher-qualification-review-store.js']) await page.addScriptTag({ path: runtime(file) });
    const owner = await page.evaluate(async () => {
      const profiles = await window.PublisherProfileStore.loadAll();
      const submissions = await window.PublisherProfileStore.loadSubmissions();
      const applications = await window.PublisherQualificationReviewStore.loadQueue();
      return {
        profileMarker: profiles[0]?.draft?.marker,
        iconBytes: profiles[0]?.draft?.gameProfileDraft?.localizedAssets?.en?.icon?.blob?.size || profiles[0]?.draft?.assets?.icon?.blob?.size,
        submissionMarker: submissions[0]?.draft?.marker,
        applicant: applications[0]?.applicant,
      };
    });
    await setAccount(page, 'second-account');
    const second = await accountSnapshot(page);
    const legacyBackup = await page.evaluate(async () => {
      const opening = indexedDB.open('gamehub-publisher-profiles-v1', 2);
      const db = await new Promise((resolve, reject) => { opening.onsuccess = () => resolve(opening.result); opening.onerror = () => reject(opening.error); });
      const request = db.transaction('profiles', 'readonly').objectStore('profiles').get('legacy-game');
      const record = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      db.close();
      return record?.draft?.assets?.icon?.blob?.size || 0;
    });

    assert.deepEqual(owner, { profileMarker: 'legacy-profile', iconBytes: seeded, submissionMarker: 'immutable-original', applicant: 'Legacy Developer' });
    assert.deepEqual(second.profiles, []);
    assert.deepEqual(second.submissions, []);
    assert.deepEqual(second.qualifications, []);
    assert.equal(legacyBackup, seeded, '迁移后保留旧库原始 Blob 作为无损备份');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
