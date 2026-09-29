import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

test('兼容性单选提交、编辑、旧草稿恢复及概览左右布局', async () => {
  const root = process.cwd();
  const out = path.join(root, 'test-results/compatibility-review-v1.2/2026-09-29');
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(pathToFileURL(path.join(root, 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html')).href);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    assert.equal(await page.locator('#entrySub, #entrySubLs, #fbStarsWrap').count(), 0);
    await page.locator('#shell').screenshot({ path: path.join(out, '01-detail.png'), animations: 'disabled' });
    await page.click('#openCompatibilityReviews');
    assert.deepEqual(await page.locator('#chipsLs .chip').allTextContents(), ['全部', '同配置', '支持最多', '我的']);
    assert.equal(await page.locator('#chipsLs .chip.active').getAttribute('data-view'), 'device');
    await page.click('#chipsLs [data-view="all"]');
    await page.click('#compatPage .compat-page-back');
    await page.waitForTimeout(420);
    await page.click('#openCompatibilityReviews');
    assert.equal(await page.locator('#chipsLs .chip.active').getAttribute('data-view'), 'device', '返回后重新进入，高亮仍应对应同配置而非第一项');
    await page.locator('#shell').screenshot({ path: path.join(out, '02-overview.png'), animations: 'disabled' });
    const summary = await page.locator('.ov-summary').boundingBox();
    const bars = await page.locator('#distBarsLs').boundingBox();
    assert.ok(bars.x >= summary.x + summary.width, '结论和条数应在分布左侧');
    assert.equal(await page.locator('#distBarsLs .dist-row').count(), 4);
    await page.click('#manualReviewButton');
    await page.click('#modalFeedback .btn-submit');
    assert.ok(await page.locator('#modalFeedback').evaluate(el => el.classList.contains('show')));
    for (const type of ['unplayable', 'partial', 'basic', 'perfect']) {
      await page.click(`#fbTypeWrap [data-type="${type}"]`);
      assert.equal(await page.locator('#fbSolutionSection').isVisible(), ['basic', 'perfect'].includes(type));
    }
    await page.fill('#fbEditor', '选择兼容性后直接提交');
    await page.check('#shareSessionCheckbox');
    await page.waitForTimeout(2400);
    await page.locator('#shell').screenshot({ path: path.join(out, '03-form.png'), animations: 'disabled' });
    await page.click('#modalFeedback .btn-submit');
    const original = await page.evaluate(() => window.getFeedbacks().find(x => x.uid === 'me_demo_user'));
    assert.equal(original.compatType, 'perfect');
    assert.ok(original.reviewSnapshotId);
    await page.locator(`[data-feedback-id="${original.id}"] .ci-more-btn`).click();
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    assert.equal(await page.locator('#fbTypeWrap [data-type="perfect"]').getAttribute('aria-pressed'), 'true');
    await page.fill('#fbEditor', '只修改文字');
    await page.click('#modalFeedback .btn-submit');
    const edited = await page.evaluate(id => window.getFeedbacks().find(x => x.id === id), original.id);
    assert.equal(edited.reviewSnapshotId, original.reviewSnapshotId);
    assert.equal(edited.text, '只修改文字');
    await page.evaluate(() => localStorage.setItem('gh_compat_review_v12_draft', JSON.stringify({ type: 'basic', stars: 1, text: '旧草稿', shareSessionRequested: true })));
    await page.click('#manualReviewButton');
    assert.equal(await page.locator('#shareSessionCheckbox').isChecked(), true);
    await page.click('#fbTypeWrap [data-type="partial"]');
    assert.equal(await page.locator('#fbSolutionSection').isVisible(), false);
    await page.click('#modalFeedback .btn-submit');
    const latest = await page.evaluate(() => window.getFeedbacks().find(x => x.text === '旧草稿'));
    assert.equal(latest.compatType, 'partial');
    assert.equal(latest.stars, 2);
    assert.equal(latest.reviewSnapshotId, '');
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      const bounds = await page.locator('.compat-overview').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
      assert.ok(bounds.scroll <= bounds.width, '概览不能溢出');
      const left = await page.locator('.ov-summary').boundingBox();
      const right = await page.locator('#distBarsLs').boundingBox();
      assert.ok(right.x >= left.x + left.width);
      await page.screenshot({ path: path.join(out, `overview-${viewport.width}.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { window.saveFeedbacks([]); window.refreshPanel('ls'); window.refreshEntryCard(); });
    assert.equal(await page.locator('#ovLevelLs').innerText(), '暂无评价');
    assert.equal(await page.locator('#distBarsLs .dist-row').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
