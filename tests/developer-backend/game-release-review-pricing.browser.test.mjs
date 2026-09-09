import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mountReview, openReviewHarness, readReviewDatabase, seedV25ReviewFixtures } from './game-release-review-fixtures.browser.test.mjs';

let browser;
before(async () => { browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] }); });
after(async () => { await browser?.close(); });

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
      return {
        valid: store.approvalIssues(row.draft, row),
        badPrices: ['', '0', '-1', '1.001', 'abc', 'Infinity', '1e2', '.5'].map(value => assess(sku => { sku.listPrice = value; sku.discountPrice = ''; sku.discountStartAt = ''; sku.discountEndAt = ''; })),
        partial: assess(sku => { sku.discountPrice = '5'; sku.discountStartAt = ''; }),
        high: assess(sku => { sku.discountPrice = '10'; }),
        reversed: assess(sku => { sku.discountStartAt = '2099-11-01'; sku.discountEndAt = '2099-10-01'; }),
        expired: assess(sku => { sku.discountStartAt = '2020-01-01'; sku.discountEndAt = '2020-02-01'; }),
        free: assess(sku => { sku.pricingModel = 'free'; sku.listPrice = 'bad'; sku.discountPrice = '999'; sku.discountStartAt = 'bad'; sku.discountEndAt = 'bad'; }),
      };
    });
    assert.deepEqual(result.valid, []);
    assert.ok(result.badPrices.every(issues => issues.some(issue => issue.includes('售价无效'))));
    assert.match(result.partial.join(' '), /需同时填写/);
    assert.match(result.high.join(' '), /低于售价/);
    assert.match(result.reversed.join(' '), /结束时间必须晚于/);
    assert.match(result.expired.join(' '), /已过/);
    assert.deepEqual(result.free, []);
  } finally { await context.close(); }
});

test('审核后修改当前草稿价格不会改变已提交的 SKU 快照', async () => {
  const { context, page } = await openReviewHarness(browser);
  try {
    await seedV25ReviewFixtures(page, { legacy: false });
    await page.evaluate(async () => {
      await window.PublisherGameReviewStore.decide({ submissionId: 'REVIEW-V25-GLOBAL', decision: 'approved' });
      const db = await window.PublisherStorageSchema.open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('profiles', 'readwrite');
        const request = tx.objectStore('profiles').get('review-v25-global');
        request.onsuccess = () => {
          request.result.draft.catalog.dlcs[0].listPrice = '14.99';
          request.result.draft.catalog.dlcs[0].discountPrice = '8.99';
          tx.objectStore('profiles').put(request.result);
        };
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    });
    const database = await readReviewDatabase(page);
    const profile = database.profiles.find(item => item.gameKey === 'review-v25-global');
    const snapshot = database.submissions.find(item => item.id === 'REVIEW-V25-GLOBAL');
    assert.equal(profile.draft.catalog.dlcs[0].listPrice, '14.99');
    assert.equal(snapshot.draft.catalog.dlcs[0].listPrice, '9.99');
    assert.equal(snapshot.draft.catalog.dlcs[0].discountPrice, '6.99');
  } finally { await context.close(); }
});
