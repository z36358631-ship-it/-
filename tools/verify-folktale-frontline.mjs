import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoPath = '/demos/AI%E6%B8%B8%E6%88%8F%E8%B5%9B%E9%81%93%E8%AF%84%E6%B5%8B/04-lotus-guardian.html';
const outputDir = path.join(root, 'test-results', 'ai-h5-game-demos');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
      const requested = path.resolve(root, `.${pathname}`);
      if (!requested.startsWith(root)) throw new Error('Forbidden');
      const data = await fs.readFile(requested);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    server,
    port: server.address().port
  })));
}

await fs.mkdir(outputDir, { recursive: true });
const { server, port } = await startServer();
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));

  await page.goto(`http://127.0.0.1:${port}${demoPath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(520);

  const storyCount = await page.locator('#storyList .story-card').count();
  expect(storyCount === 3, `expected 3 story packages, got ${storyCount}`);
  await page.locator('[data-story="vikram"]').click();
  expect((await page.locator('#storyTitle').innerText()).includes('Vikram'), 'India story package did not apply');
  await page.locator('#storyTrigger').click();
  await page.locator('[data-story="thach"]').click();
  expect((await page.locator('#storyTitle').innerText()).includes('Thạch Sanh'), 'Vietnam story package did not apply');
  await page.locator('#storyTrigger').click();
  await page.locator('[data-story="timun"]').click();
  expect((await page.locator('#storyTitle').innerText()).includes('Timun Mas'), 'Indonesia story package did not apply');

  const dimensions = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: innerHeight,
    phoneHeight: document.querySelector('#phone').getBoundingClientRect().height,
    benchSlots: document.querySelectorAll('.bench-slot').length,
    fieldPads: document.querySelectorAll('.field-pad').length
  }));
  expect(dimensions.documentHeight <= dimensions.viewportHeight, `page scrolls: ${JSON.stringify(dimensions)}`);
  expect(dimensions.benchSlots === 5, `expected 5 bench slots, got ${dimensions.benchSlots}`);
  expect(dimensions.fieldPads === 6, `expected 6 field pads, got ${dimensions.fieldPads}`);

  const recruit = page.locator('#recruitButton');
  await recruit.click();
  await recruit.click();
  expect(await page.locator('.bench-slot.filled').count() === 2, 'opening pair was not recruited');
  expect(await page.locator('#foodCount').innerText() === '78', 'recruit food cost did not increase correctly');
  expect(await page.locator('#recruitCost').innerText() === '14', 'next recruit cost is not visible');

  await page.locator('[data-slot="0"]').click();
  await page.locator('[data-slot="1"]').click();
  expect(await page.locator('.bench-slot.filled').count() === 1, 'matching pair did not merge');
  expect((await page.locator('[data-slot="0"] small').innerText()).includes('Lv.2'), 'merged unit is not level 2');

  await page.locator('[data-pad="3"]').click();
  expect(await page.locator('[data-pad="3"].filled').count() === 1, 'melee unit was not deployed to an outer pad');

  for (let i = 0; i < 4; i += 1) await recruit.click();
  expect(await page.locator('.fragment.found').count() === 2, 'two name fragments were not collected');
  await page.locator('#summonButton').click();
  expect(await page.locator('#heroUnit.show').count() === 1, 'localized hero was not summoned');

  await page.locator('#shopButton').click();
  await page.locator('[data-item="gear"][data-method="token"]').click();
  expect(await page.locator('.item.owned').count() === 1, 'token item path did not grant the item');
  await page.locator('[data-close]').nth(1).click();

  await page.locator('#shopButton').click();
  await page.locator('[data-item="skill"][data-method="ad"]').click();
  await page.waitForTimeout(3300);
  await page.locator('#shopButton').click();
  expect(await page.locator('.item.owned').count() === 2, 'rewarded-ad path did not grant the same item state');
  await page.locator('[data-close]').nth(1).click();

  await page.locator('#battleButton').click();
  await page.locator('#speedButton').click();
  await page.waitForTimeout(5400);
  expect((await page.locator('#timerLabel').innerText()).endsWith('s'), 'battle timer did not start');

  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-h5-playtest-events-v1') || '[]'));
  const names = new Set(events.map(event => event.event));
  expect(names.has('first_input'), 'missing first_input event');
  expect(names.has('ad_choice'), 'missing ad_choice event');
  expect(names.has('ai_change_shown'), 'missing ai_change_shown event');
  expect(names.has('core_payoff'), 'missing core_payoff event');
  expect(errors.length === 0, `runtime errors: ${errors.join(' | ')}`);

  const screenshot = path.join(outputDir, '04-folktale-frontline-mobile.png');
  await page.screenshot({ path: screenshot, fullPage: false });
  await page.locator('#result.show').waitFor({ state: 'visible', timeout: 40000 });
  const resultTitle = await page.locator('#resultTitle').innerText();
  expect(resultTitle === '守护成功', `seeded first run should be winnable without a forced ad, got ${resultTitle}`);
  const resultScreenshot = path.join(outputDir, '04-folktale-frontline-result.png');
  await page.screenshot({ path: resultScreenshot, fullPage: false });
  await page.locator('#retryButton').click();
  expect(await page.locator('#timerLabel').innerText() === '备战中', 'free retry did not reset to preparation');

  const result = {
    status: 'PASS',
    dimensions,
    storyPackages: storyCount,
    eventNames: [...names],
    resultTitle,
    screenshot,
    resultScreenshot
  };
  await fs.writeFile(path.join(outputDir, 'folktale-frontline-verification.json'), JSON.stringify(result, null, 2), 'utf8');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  await context.close();
} finally {
  await browser.close();
  server.close();
}
