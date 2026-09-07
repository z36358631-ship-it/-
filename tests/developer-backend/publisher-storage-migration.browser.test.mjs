import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const schemaScript = path.resolve('demos/开发者后台一期/src/runtime/publisher-storage-schema.js');
const evidence = path.resolve('tests/developer-backend/evidence/profile-v25');
const harness = path.join(evidence, 'storage-migration-harness.html');
let browser;

before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(harness, '<!doctype html><meta charset="utf-8"><title>Publisher storage migration</title>', 'utf8');
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
});

after(async () => { await browser?.close(); });

test('v1 资料升级到 v2 时保留 Blob、国内草稿和历史提交原文', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`file:///${harness.replaceAll('\\', '/')}`);
    const beforeState = await page.evaluate(async () => {
      await new Promise(resolve => { const request = indexedDB.deleteDatabase('gamehub-publisher-profiles-v1'); request.onsuccess = request.onerror = request.onblocked = resolve; });
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('gamehub-publisher-profiles-v1', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('profiles', { keyPath: 'gameKey' });
          request.result.createObjectStore('submissions', { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const blob = new Blob(['blob-bytes-must-survive'], { type: 'image/png' });
      const gameKey = 'migration-game';
      const draft = {
        gameKey, nameLanguages: ['en', 'zh'], defaultNameLanguage: 'en', gameNames: { en: 'Legacy store name' },
        languages: ['English', '简体中文'], localizedContent: { en: { tagline: 'Old', description: 'Old description' } },
        localizedAssets: { en: { icon: { name: 'icon.png', type: 'image/png', size: blob.size, blob }, landscape: [], portrait: [], screenshots: [] } },
        releaseRegions: ['global', 'domestic'], releaseTerritories: [{ code: 'US', status: 'released' }, { code: 'CN', status: 'released' }],
        releaseStatus: 'released', licenseNumber: 'ISBN-LEGACY', pricing: { model: 'paid', globalPrice: '19.99', domesticPrice: '68.00' },
        qualifications: { rights: { name: 'rights.png', type: 'image/png', size: blob.size, blob } },
      };
      const submission = { id: 'REVIEW-LEGACY', gameKey, submittedAt: '2026-09-01T00:00:00.000Z', draft: { marker: 'must-remain-unchanged', assets: { icon: { blob } } } };
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
        transaction.objectStore('profiles').put({ gameKey, game: { gameKey, name: 'Backend project' }, draft });
        transaction.objectStore('submissions').put(submission);
        transaction.oncomplete = resolve;
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
      });
      db.close();
      return { gameKey, iconBytes: blob.size };
    });

    await page.addScriptTag({ path: schemaScript });
    const result = await page.evaluate(async gameKey => {
      const db = await window.PublisherStorageSchema.open();
      const read = (store, key) => new Promise((resolve, reject) => {
        const request = db.transaction(store, 'readonly').objectStore(store).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const profile = await read('profiles', gameKey);
      const submission = await read('submissions', 'REVIEW-LEGACY');
      return {
        version: db.version,
        stores: [...db.objectStoreNames],
        locales: profile.draft.storeLocales.enabled,
        mode: profile.draft.releaseConfig.mode,
        domesticDraftAvailable: Boolean(profile.draft.releaseConfig.domesticDraft),
        price: profile.draft.catalog.baseGame.listPrice,
        iconBytes: profile.draft.gameProfileDraft.localizedAssets.en.icon.blob.size,
        qualificationStatus: profile.draft.qualifications.history[0]?.status,
        submissionMarker: submission.draft.marker,
        submissionHasSchemaVersion: Object.prototype.hasOwnProperty.call(submission.draft, 'schemaVersion'),
      };
    }, beforeState.gameKey);

    assert.equal(result.version, 2);
    assert.deepEqual(result.stores.sort(), ['profiles', 'qualificationApplications', 'submissions'].sort());
    assert.deepEqual(result.locales, ['en', 'zh']);
    assert.equal(result.mode, 'global');
    assert.equal(result.domesticDraftAvailable, true);
    assert.equal(result.price, '19.99');
    assert.equal(result.iconBytes, beforeState.iconBytes);
    assert.equal(result.qualificationStatus, 'legacy_unknown');
    assert.equal(result.submissionMarker, 'must-remain-unchanged');
    assert.equal(result.submissionHasSchemaVersion, false);
  } finally {
    await page.close();
  }
});
