import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

test('图片评价：单图、多图、无文字、无快照和配置入口', async () => {
  const root = process.cwd();
  const out = path.join(root, 'test-results/compatibility-review-v1.2/2026-09-29-images');
  fs.mkdirSync(out, { recursive: true });
  const demo = path.join(root, 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html');
  const src = fs.readFileSync(demo, 'utf8').match(/const PHOTO_REVIEW_EXAMPLE = '(data:[^']+)'/)[1];
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, offline: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(pathToFileURL(path.join(root, 'demos/游戏详情/GUANWANGGAID-25-兼容性评价改版-C端demo.html')).href);
    await page.waitForTimeout(450);
    await page.click('#openCompatibilityReviews');
    for (const count of [1, 3, 9, 0]) {
      await page.evaluate(({ src, count }) => {
        const reviews = getFeedbacks();
        const item = reviews.find(f => f.id === 's1');
        item.html = '';
        item.text = count === 9 ? '' : '画面和操作都很流畅，分享一下本次游玩截图和使用的配置。';
        item.media = Array.from({ length: count }, () => ({ type: 'image', src }));
        saveFeedbacks(reviews);
        refreshPanel('ls');
      }, { src, count });
      const item = page.locator('#listLs #ci-s1');
      assert.equal(await item.locator('.ci-media img').count(), count);
      assert.equal(await item.locator('.review-solution-card').count(), 1);
      assert.equal(await item.locator('.review-solution-duration').innerText(), '本次游玩 18分42秒');
      if (count) {
        const layout = await item.evaluate(el => {
          const media = el.querySelector('.ci-media').getBoundingClientRect();
          const card = el.querySelector('.review-solution-card').getBoundingClientRect();
          return { gap: card.top - media.bottom, widthDiff: card.width - media.width, aligned: card.left - media.left,
            loaded: [...el.querySelectorAll('img')].every(img => img.complete && img.naturalWidth > 0) };
        });
        assert.ok(layout.gap >= 8 && Math.abs(layout.widthDiff) < 1 && Math.abs(layout.aligned) < 1);
        assert.ok(layout.loaded);
        if (count === 1) {
          const ratio = await item.evaluate(el => el.querySelector('.ci-media-image').getBoundingClientRect().width / el.querySelector('.ci-media').getBoundingClientRect().width);
          assert.ok(Math.abs(ratio - 2/3) < 0.01, '单张横图占内容宽度的2/3');
        }
        assert.equal(await item.evaluate(el => getComputedStyle(el).borderBottomWidth), '1px');
        await item.screenshot({ path: path.join(out, `photo-review-${count}.png`) });
        if (count === 1) {
          await item.scrollIntoViewIfNeeded();
          await page.locator('#shell').screenshot({ path: path.join(out, 'photo-review-screen.png') });
        }
      } else assert.equal(await item.locator('.ci-media').count(), 0);
    }
    await page.locator('#listLs #ci-s1 .review-solution-card').click();
    assert.equal(await page.locator('#solutionDetailPage').isVisible(), true);
    await page.evaluate(() => {
      const item = { ...getFeedbacks().find(f => f.id === 's1'), reviewSnapshotId: null };
      document.querySelector('#listLs').innerHTML = renderItem(item);
    });
    assert.equal(await page.locator('#listLs .review-solution-card').count(), 0);
    await page.goto(pathToFileURL(demo).href + '?example=photo-review');
    await page.waitForTimeout(650);
    assert.equal(await page.locator('#listLs #ci-s1 .ci-media img').count(), 1);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const item = page.locator('#listLs #ci-s1');
      assert.ok(await item.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      assert.ok(await item.locator('.review-solution-duration').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#listLs #ci-s1').screenshot({ path: path.join(out, 'photo-example-final.png') });
    await page.locator('#shell').screenshot({ path: path.join(out, 'photo-example-page.png') });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
