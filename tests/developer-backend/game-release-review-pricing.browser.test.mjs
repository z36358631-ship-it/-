import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mountReview, openReviewHarness, readReviewDatabase, seedV25ReviewFixtures } from './game-release-review-fixtures.browser.test.mjs';

let browser;
before(async () => { browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] }); });
after(async () => { await browser?.close(); });

async function seedRegionalPricing(page) {
  await page.evaluate(async () => {
    const regionalSku = {
      skuId: 'BASE', type: 'base_game', title: '星海远征基础游戏', installContentRef: 'BUILD-GLOBAL-100',
      pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '19.99', discountPrice: '14.99',
      discountStartAt: '2099-09-10T00:00', discountEndAt: '2099-10-10T00:00',
      regionalPrices: {
        JP: { listPrice: '2200', discountPrice: '1650' },
        DE: { listPrice: '18.99', discountPrice: '' },
      },
    };
    const db = await window.PublisherStorageSchema.open();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['profiles', 'submissions'], 'readwrite');
      const profiles = transaction.objectStore('profiles');
      const submissions = transaction.objectStore('submissions');
      const profileRequest = profiles.get('review-v25-global');
      profileRequest.onsuccess = () => {
        profileRequest.result.draft.catalog.baseGame = structuredClone(regionalSku);
        profiles.put(profileRequest.result);
      };
      const submissionRequest = submissions.get('REVIEW-V25-GLOBAL');
      submissionRequest.onsuccess = () => {
        submissionRequest.result.draft.catalog.baseGame = structuredClone(regionalSku);
        submissions.put(submissionRequest.result);
      };
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  });
}

test('全球服与中国大陆按范围展示 USD/CNY，基础游戏与 DLC 各自定价', async () => {
  const { context, page } = await openReviewHarness(browser);
  try {
    await seedV25ReviewFixtures(page, { legacy: false });
    await mountReview(page);
    await page.locator('[data-game-review-open="REVIEW-V25-GLOBAL"]').click();
    const globalSkus = page.locator('[data-game-review-section="catalog"]');
    assert.equal(await globalSkus.locator('[data-game-review-sku]').count(), 2);
    assert.match(await globalSkus.innerText(), /基础游戏[\s\S]*免费/);
    assert.match(await globalSkus.innerText(), /星图扩展包[\s\S]*收费（单次买断）[\s\S]*USD 9\.99 → USD 6\.99/);
    assert.match(await globalSkus.innerText(), /2099\/9\/10[\s\S]*2099\/10\/10/);
    assert.doesNotMatch(await globalSkus.innerText(), /CNY/);

    await page.locator('[data-game-review-back]').click();
    await page.locator('[data-game-review-open="REVIEW-V25-DOMESTIC"]').click();
    const domesticSkus = page.locator('[data-game-review-section="catalog"]');
    assert.equal(await domesticSkus.locator('[data-game-review-sku]').count(), 1);
    assert.match(await domesticSkus.innerText(), /CNY 68\.00 → CNY 48\.00/);
    assert.doesNotMatch(await domesticSkus.innerText(), /USD/);
  } finally { await context.close(); }
});

test('全球服分区定价在列表和详情展示基准价、继承地区及当地币种例外价', async () => {
  const { context, page } = await openReviewHarness(browser);
  try {
    await seedV25ReviewFixtures(page, { legacy: false });
    await seedRegionalPricing(page);
    await mountReview(page);
    const row = page.locator('[data-game-review-row="REVIEW-V25-GLOBAL"]');
    assert.match(await row.locator('.pgr-price-summary').innerText(), /基础游戏 分区定价 · 基准 USD 19\.99 → USD 14\.99 · 2 个例外价/);
    await row.locator('[data-game-review-open]').click();
    const catalog = page.locator('[data-game-review-section="catalog"]');
    const regional = catalog.locator('[data-game-review-sku="BASE"]');
    assert.equal(await regional.getAttribute('data-pricing-strategy'), 'regional');
    assert.equal(await regional.locator('[data-game-review-price-override]').count(), 2);
    assert.deepEqual(await regional.locator('[data-game-review-price-override]').evaluateAll(rows => rows.map(item => item.dataset.gameReviewPriceOverride)), ['JP', 'DE']);
    const text = await regional.innerText();
    assert.match(text, /基准售价／折扣价[\s\S]*USD 19\.99 → USD 14\.99/);
    assert.match(text, /发行地区[\s\S]*3 个/);
    assert.match(text, /继承基准价地区[\s\S]*1 个/);
    assert.match(text, /日本（JP）[\s\S]*售价 JPY 2200\.00[\s\S]*折扣价 JPY 1650\.00/);
    assert.match(text, /德国（DE）[\s\S]*售价 EUR 18\.99[\s\S]*继承基准折扣比例/);
  } finally { await context.close(); }
});

test('SKU 校验拒绝无效售价及不完整、倒置或过期折扣，免费 SKU 忽略备用价', async () => {
  const { context, page } = await openReviewHarness(browser);
  try {
    await seedV25ReviewFixtures(page, { legacy: false });
    const result = await page.evaluate(async () => {
      const store = window.PublisherGameReviewStore;
      const row = (await store.loadQueue()).find(item => item.id === 'REVIEW-V25-GLOBAL');
      const assess = mutate => {
        const draft = structuredClone(row.draft);
        mutate(draft.catalog.dlcs[0], draft);
        return store.approvalIssues(draft, { ...row, draft }).filter(message => /DLC|\u661f图扩展包/.test(message));
      };
      const assessBase = mutate => {
        const draft = structuredClone(row.draft);
        Object.assign(draft.catalog.baseGame, {
          pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '19.99', discountPrice: '14.99',
          discountStartAt: '2099-09-10T00:00', discountEndAt: '2099-10-10T00:00',
          regionalPrices: { JP: { listPrice: '2200', discountPrice: '1650' } },
        });
        mutate(draft.catalog.baseGame, draft);
        return store.approvalIssues(draft, { ...row, draft }).filter(message => /基础游戏/.test(message));
      };
      const legacyCurrencyDraft = structuredClone(row.draft);
      Object.assign(legacyCurrencyDraft.catalog.baseGame, {
        pricingModel: 'paid', pricingStrategy: 'regional', listPrice: '', discountPrice: '',
        discountStartAt: '', discountEndAt: '',
        regionalPrices: { USD: { listPrice: '19.99' }, EUR: { listPrice: '18.99' }, JPY: { listPrice: '2200' } },
      });
      return {
        valid: store.approvalIssues(row.draft, row),
        badPrices: ['', '0', '-1', '1.001', 'abc', 'Infinity', '1e2', '.5'].map(value => assess(sku => { sku.listPrice = value; sku.discountPrice = ''; sku.discountStartAt = ''; sku.discountEndAt = ''; })),
        partial: assess(sku => { sku.discountPrice = '5'; sku.discountStartAt = ''; }),
        high: assess(sku => { sku.discountPrice = '10'; }),
        reversed: assess(sku => { sku.discountStartAt = '2099-11-01'; sku.discountEndAt = '2099-10-01'; }),
        expired: assess(sku => { sku.discountStartAt = '2020-01-01'; sku.discountEndAt = '2020-02-01'; }),
        free: assess(sku => { sku.pricingModel = 'free'; sku.listPrice = 'bad'; sku.discountPrice = '999'; sku.discountStartAt = 'bad'; sku.discountEndAt = 'bad'; }),
        regionalValid: assessBase(() => {}),
        regionalMissingBase: assessBase(sku => { sku.listPrice = ''; }),
        regionalMissingOverride: assessBase(sku => { sku.regionalPrices.JP.listPrice = ''; }),
        regionalHighOverrideDiscount: assessBase(sku => { sku.regionalPrices.JP.discountPrice = '2200'; }),
        regionalOutsideScope: assessBase(sku => { sku.regionalPrices.BR = { listPrice: '59.90', discountPrice: '' }; }),
        domesticRegional: assessBase((sku, draft) => { draft.releaseConfig.mode = 'domestic'; sku.regionalPrices = { JP: { listPrice: '2200', discountPrice: '' } }; }),
        legacyCurrencySnapshot: store.pricingSnapshot(legacyCurrencyDraft)[0],
      };
    });
    assert.deepEqual(result.valid, []);
    assert.ok(result.badPrices.every(issues => issues.some(issue => issue.includes('售价无效'))));
    assert.match(result.partial.join(' '), /需同时填写/);
    assert.match(result.high.join(' '), /低于售价/);
    assert.match(result.reversed.join(' '), /结束时间必须晚于/);
    assert.match(result.expired.join(' '), /已过/);
    assert.deepEqual(result.free, []);
    assert.deepEqual(result.regionalValid, []);
    assert.match(result.regionalMissingBase.join(' '), /售价无效/);
    assert.match(result.regionalMissingOverride.join(' '), /日本（JP）例外售价无效/);
    assert.match(result.regionalHighOverrideDiscount.join(' '), /日本（JP）例外折扣价必须大于 0 且低于售价/);
    assert.match(result.regionalOutsideScope.join(' '), /非当前发行范围：BR/);
    assert.match(result.domesticRegional.join(' '), /中国大陆发行不允许分区定价/);
    assert.equal(result.legacyCurrencySnapshot.listPrice, '', '不得从旧币种例外价推断 USD 基准价');
    assert.deepEqual(result.legacyCurrencySnapshot.regionalPrices, {
      US: { listPrice: '19.99', discountPrice: '' },
      JP: { listPrice: '2200', discountPrice: '' },
      DE: { listPrice: '18.99', discountPrice: '' },
    });
  } finally { await context.close(); }
});

test('审核后修改当前草稿价格不会改变已提交的 SKU 快照', async () => {
  const { context, page } = await openReviewHarness(browser);
  try {
    await seedV25ReviewFixtures(page, { legacy: false });
    await seedRegionalPricing(page);
    await page.evaluate(async () => {
      await window.PublisherGameReviewStore.decide({ submissionId: 'REVIEW-V25-GLOBAL', decision: 'approved' });
      const db = await window.PublisherStorageSchema.open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('profiles', 'readwrite');
        const request = tx.objectStore('profiles').get('review-v25-global');
        request.onsuccess = () => {
          request.result.draft.catalog.baseGame.listPrice = '24.99';
          request.result.draft.catalog.baseGame.discountPrice = '16.99';
          request.result.draft.catalog.baseGame.regionalPrices.JP.listPrice = '2600';
          request.result.draft.catalog.baseGame.regionalPrices.JP.discountPrice = '1800';
          tx.objectStore('profiles').put(request.result);
        };
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    });
    const database = await readReviewDatabase(page);
    const profile = database.profiles.find(item => item.gameKey === 'review-v25-global');
    const snapshot = database.submissions.find(item => item.id === 'REVIEW-V25-GLOBAL');
    assert.equal(profile.draft.catalog.baseGame.listPrice, '24.99');
    assert.equal(profile.draft.catalog.baseGame.regionalPrices.JP.listPrice, '2600');
    assert.equal(snapshot.draft.catalog.baseGame.listPrice, '19.99');
    assert.equal(snapshot.draft.catalog.baseGame.discountPrice, '14.99');
    assert.deepEqual(snapshot.draft.catalog.baseGame.regionalPrices, {
      JP: { listPrice: '2200', discountPrice: '1650' },
      DE: { listPrice: '18.99', discountPrice: '' },
    });
  } finally { await context.close(); }
});
