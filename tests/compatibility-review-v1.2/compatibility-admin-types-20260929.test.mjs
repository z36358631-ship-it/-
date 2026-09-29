import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const demo = path.join(root, 'demos/后台管理/GUANWANGGAID-25-兼容性评价改版-B端demo.html');

test('国内兼容性筛选、列表、详情和CSV统一四类，兼容历史并隔离海外评分', async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(pathToFileURL(demo).href);
    assert.equal(await page.locator('#ms-dom-stars').count(), 0);
    assert.equal(await page.locator('#ms-dom-type input').count(), 4);
    assert.match(await page.locator('#dom-fb-table thead').innerText(), /兼容性/);
    assert.doesNotMatch(await page.locator('#dom-fb-table thead').innerText(), /星级|评分/);
    const labels = { perfect: '完美兼容', basic: '基本可玩', partial: '部分兼容', unplayable: '不可玩' };
    for (const [type, label] of Object.entries(labels)) {
      if (!await page.locator(`#ms-dom-type input[value="${type}"]`).isVisible()) {
        await page.locator('#ms-dom-type .ms-trigger').click();
      }
      await page.locator(`#ms-dom-type input[value="${type}"]`).check();
      assert.equal(await page.locator('#ms-dom-type-text').innerText(), label);
      await page.evaluate(() => window.queryCompatFeedbacks('domestic'));
      const results = await page.locator('#dom-fb-tbody [data-compat-type]').evaluateAll(els => els.map(el => el.dataset.compatType));
      assert.ok(results.length > 0);
      assert.ok(results.every(value => value === type));
      await page.evaluate(() => window.resetCompatFeedbackFilters('domestic'));
    }
    await page.evaluate(() => {
      const base = JSON.parse(localStorage.getItem('gh_compat_feedbacks_v2'))[0];
      const fixtures = [
        { id: 'new-only', compatType: 'basic', stars: undefined, tags: [] },
        { id: 'conflict', compatType: 'partial', stars: 5, tags: ['完美兼容', '操作流畅'] },
        { id: 'legacy-tag', compatType: 'invalid', stars: 5, tags: ['有部分问题'] },
        { id: 'legacy-star', compatType: undefined, stars: 4, tags: [] },
        { id: 'legacy-unplayable', compatType: undefined, stars: 1, tags: [] },
      ].map(item => ({ ...base, snapshot: null, pinned: false, ...item }));
      localStorage.setItem('gh_compat_feedbacks_v2', JSON.stringify(fixtures));
      window.queryCompatFeedbacks('domestic');
    });
    for (const [id, type] of Object.entries({ 'new-only': 'basic', conflict: 'partial', 'legacy-tag': 'partial', 'legacy-star': 'perfect', 'legacy-unplayable': 'unplayable' })) {
      const row = page.locator(`#dom-fb-tbody [data-feedback-id="${id}"]`);
      assert.equal(await row.locator('[data-compat-type]').innerText(), labels[type]);
      await row.locator('[data-action="view-review"]').click();
      const detail = await page.locator('#compat-review-detail-fields').innerText();
      assert.match(detail, new RegExp(labels[type]));
      assert.doesNotMatch(detail, /评分与类型|\d 星/);
      await page.evaluate(() => window.closeCompatReviewDetail());
    }
    const conflictText = await page.locator('#dom-fb-tbody [data-feedback-id="conflict"]').innerText();
    assert.doesNotMatch(conflictText, /完美兼容/);
    assert.match(conflictText, /操作流畅/);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gh_compat_feedbacks_v2')).find(item => item.id === 'conflict'));
    assert.equal(stored.stars, 5, '展示不得迁移或覆盖旧内部字段');

    async function exportCsv(region) {
      await page.evaluate(region => window.openCompatExportPreview(region, 'filtered'), region);
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#compat-export-confirm').click();
      const download = await downloadPromise;
      return fs.readFileSync(await download.path(), 'utf8');
    }
    const domesticCsv = await exportCsv('domestic');
    assert.match(domesticCsv.split('\r\n')[0], /"兼容性"/);
    assert.doesNotMatch(domesticCsv.split('\r\n')[0], /星级|评分/);
    assert.match(domesticCsv, /review_snapshot_id/);
    assert.match(domesticCsv.split('\r\n').find(row => row.startsWith('"conflict"')), /"部分兼容","部分兼容\|操作流畅"/);
    assert.doesNotMatch(domesticCsv, /有部分问题/);

    await page.evaluate(() => window.openAdminSection('page-compat-overseas'));
    assert.equal(await page.locator('#ms-ovs-stars input').count(), 5);
    assert.match(await page.locator('#ovs-fb-table thead').innerText(), /星级/);
    await page.locator('#ovs-fb-tbody [data-feedback-id="conflict"] [data-action="view-review"]').click();
    assert.match(await page.locator('#compat-review-detail-fields').innerText(), /评分与类型[\s\S]*5 星/);
    await page.evaluate(() => window.closeCompatReviewDetail());
    const overseasCsv = await exportCsv('overseas');
    assert.match(overseasCsv.split('\r\n')[0], /"星级"/);
    assert.match(overseasCsv.split('\r\n').find(row => row.startsWith('"conflict"')), /"5","完美兼容\|操作流畅"/);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
