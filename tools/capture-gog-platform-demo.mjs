import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
const output = path.join(root, '.tmp', 'gog-platform-demo-captures');
const sourceOutput = path.join(root, '.tmp', 'gog-platform-demo-source-captures');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(executablePath, 'Local Chrome not found');
assert(fs.existsSync(demo), `Demo not found: ${demo}`);
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(sourceOutput, { recursive: true });

for (const directory of [output, sourceOutput]) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      fs.unlinkSync(path.join(directory, entry.name));
    }
  }
}

const captures = [
  ['01-profile-portrait', 'profile-portrait'],
  ['02-gog-login', 'gog-login'],
  ['03-library-home-portrait', 'library-home-portrait'],
  ['04-library-home-landscape', 'library-home-landscape'],
  ['05-gog-library-portrait', 'gog-library-portrait'],
  ['06-gog-library-landscape', 'gog-library-landscape'],
  ['07-search-portrait', 'search-portrait'],
  ['08-search-landscape', 'search-landscape'],
  ['09-detail-portrait', 'detail-portrait'],
  ['10-detail-landscape', 'detail-landscape'],
];

const stateCaptures = [
  ['11-profile-gog-logout-dialog', 'profile-portrait', async () => {
    await page.click('[data-profile-platform="gog"]');
    await page.click('[data-action="toggle-account-menu"]');
    await page.click('[data-action="logout-platform"]');
  }],
  ['12-profile-epic-free-games', 'profile-portrait', async () => {
    if (await page.locator('[data-action="close-logout-gog"]').count()) {
      await page.click('[data-action="close-logout-gog"]');
    }
    await page.click('[data-profile-platform="epic"]');
  }],
  ['13-detail-switch-portrait', 'detail-portrait', async () => {
    await page.click('[data-detail-platform-tab][data-platform="epic"]');
  }],
  ['14-detail-switch-landscape', 'detail-landscape', async () => {
    await page.click('[data-detail-platform-tab][data-platform="epic"]');
  }],
];

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(10000);
await page.emulateMedia({ reducedMotion: 'reduce' });

const pageErrors = [];
const remoteRequests = [];
const layoutSnapshots = {};
page.on('pageerror', error => pageErrors.push(error.message));
page.on('request', request => {
  if (/^https?:/i.test(request.url())) remoteRequests.push(request.url());
});

async function settle() {
  await page.waitForFunction(() => document.fonts?.status === 'loaded');
  await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => {
    document.querySelector('#demoCanvas')?.scrollTo(0, 0);
    document.querySelector('#annoScroll')?.scrollTo(0, 0);
    document.querySelector('#leftNav')?.scrollTo(0, 0);
  });
}

async function verifyScreenContract(screen) {
  if (screen === 'search-portrait' || screen === 'search-landscape') {
    const result = await page.evaluate(currentScreen => {
      const viewport = document.querySelector(`[data-screen="${currentScreen}"]`);
      const grid = viewport.querySelector('.search-results');
      const cards = [...grid.querySelectorAll('.search-result')];
      return {
        columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        cardCount:cards.length,
        labelsInsideCover:cards.every(card => card.querySelector('.search-result__cover-wrap .search-result__platform')),
        labelsOutsideCover:cards.some(card => card.querySelector('.search-result__body .search-result__platform')),
      };
    }, screen);
    assert.equal(result.columns, screen === 'search-portrait' ? 2 : 1, `${screen}: search-result columns mismatch`);
    assert.equal(result.cardCount, 4, `${screen}: expected four search-result cards`);
    assert.equal(result.labelsInsideCover, true, `${screen}: platform label must be inside every cover`);
    assert.equal(result.labelsOutsideCover, false, `${screen}: platform label must not appear below the cover`);
  }
  if (screen === 'detail-portrait' || screen === 'detail-landscape') {
    const result = await page.evaluate(currentScreen => {
      const viewport = document.querySelector(`[data-screen="${currentScreen}"]`);
      const tabs = viewport.querySelector('[data-detail-platform-tabs]');
      const tags = viewport.querySelector('.detail-tags');
      const tabBox = tabs?.getBoundingClientRect();
      const tagsBox = tags?.getBoundingClientRect();
      return {
        platforms:[...tabs.querySelectorAll('[data-detail-platform-tab]')].map(node => node.dataset.platform),
        selected:[...tabs.querySelectorAll('[data-detail-platform-tab].active')].map(node => node.dataset.platform),
        tabsBeforeTags:Boolean(tabBox && tagsBox && tabBox.bottom <= tagsBox.top + 1),
        hasDuplicateSwitch:Boolean(viewport.querySelector('[data-platform-switch]')),
        hasLegacyObtain:Boolean(viewport.querySelector('[data-obtain-platforms]')),
        hasEngineCopy:viewport.textContent.includes('PC游戏引擎') || currentScreen === 'detail-landscape',
        hasCloudCopy:viewport.textContent.includes('云存档'),
        hasHoursCopy:viewport.textContent.includes('游戏时长'),
      };
    }, screen);
    assert.deepEqual(result.platforms, ['steam','epic','gog'], `${screen}: platform tab order mismatch`);
    assert.equal(result.selected.length, 1, `${screen}: expected one selected platform tab`);
    assert.equal(result.tabsBeforeTags, true, `${screen}: platform tabs must precede genre tags`);
    assert.equal(result.hasDuplicateSwitch, false, `${screen}: duplicate platform switch remains`);
    assert.equal(result.hasLegacyObtain, false, `${screen}: legacy obtain row remains`);
    assert.equal(result.hasEngineCopy, true, `${screen}: PC game engine copy missing`);
    assert.equal(result.hasCloudCopy, true, `${screen}: cloud-save copy missing`);
    assert.equal(result.hasHoursCopy, true, `${screen}: playtime copy missing`);
  }
}

async function captureCanvas(name, screen, prepare = null) {
  await page.click(`[data-page="${screen}"]`);
  await page.waitForSelector(`[data-screen="${screen}"]`);
  if (prepare) await prepare();
  await settle();
  await verifyScreenContract(screen);

  const target = path.join(output, `${name}.png`);
  const viewport = page.locator(`.app-viewport[data-screen="${screen}"]`);
  const box = await viewport.boundingBox();
  assert(box, `Viewport not found for ${screen}`);
  const expected = screen.endsWith('landscape') ? { width: 880, height: 396 } : { width: 405, height: 900 };
  assert.equal(Math.round(box.width), expected.width, `${name} viewport width mismatch`);
  assert.equal(Math.round(box.height), expected.height, `${name} viewport height mismatch`);
  await page.screenshot({
    path: target,
    animations: 'disabled',
    clip: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: expected.width,
      height: expected.height,
    },
  });
  const size = fs.statSync(target).size;
  const png = fs.readFileSync(target);
  assert.equal(png.readUInt32BE(16), expected.width, `${name}.png width mismatch`);
  assert.equal(png.readUInt32BE(20), expected.height, `${name}.png height mismatch`);
  assert(size > 20 * 1024, `${name}.png is unexpectedly small (${size} bytes)`);
  layoutSnapshots[screen] = await viewport.evaluate(root => {
    const selectors = [
      '.portrait-status','.mobile-topbar','.mobile-bottom-nav','.handheld-nav',
      '.library-tabs','.library-entry-row','.current-library','.hero-track',
      '.landscape-game-summary','.landscape-entry-row','.platform-account-topbar',
      '.platform-account','.platform-library-title','.platform-game-grid',
      '.search-top','.landscape-search-body','.search-results','.detail-media',
      '.detail-summary','.detail-platform-tabs','.detail-tags','.detail-engine','.detail-actions','.landscape-detail-content',
      '.landscape-metrics',
    ];
    const rootBox = root.getBoundingClientRect();
    const rect = node => {
      const box = node.getBoundingClientRect();
      return {
        x:Math.round((box.x-rootBox.x)*100)/100,
        y:Math.round((box.y-rootBox.y)*100)/100,
        width:Math.round(box.width*100)/100,
        height:Math.round(box.height*100)/100,
      };
    };
    return Object.fromEntries(selectors.flatMap(selector => {
      const node = root.querySelector(selector);
      return node ? [[selector, rect(node)]] : [];
    }));
  });
  console.log(`CAPTURED ${name}.png (${size} bytes)`);
}

async function captureSourceResolutions() {
  const configurations = [
    { orientation:'portrait', css:{ width:405, height:900 }, pixels:{ width:1080, height:2400 } },
    { orientation:'landscape', css:{ width:880, height:396 }, pixels:{ width:2400, height:1080 } },
  ];
  for (const configuration of configurations) {
    const deviceScaleFactor = configuration.pixels.width / configuration.css.width;
    const context = await browser.newContext({ viewport:{ width:1920, height:1080 }, deviceScaleFactor });
    const sourcePage = await context.newPage();
    const requests = [];
    sourcePage.on('request', request => { if (/^https?:/i.test(request.url())) requests.push(request.url()); });
    await sourcePage.goto(pathToFileURL(demo).href, { waitUntil:'load' });
    await sourcePage.waitForSelector('#gogDemoShell');
    const orientationCaptures = captures.filter(([, value]) => configuration.orientation === 'portrait' ? !value.endsWith('landscape') : value.endsWith('landscape'));
    for (const [name, screen] of orientationCaptures) {
      await sourcePage.click(`[data-page="${screen}"]`);
      await sourcePage.waitForSelector(`[data-screen="${screen}"]`);
      await sourcePage.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
      const viewport = sourcePage.locator(`.app-viewport[data-screen="${screen}"]`);
      const box = await viewport.boundingBox();
      assert(box, `Source viewport not found for ${screen}`);
      const target = path.join(sourceOutput, `${name}.png`);
      await sourcePage.screenshot({
        path:target,
        animations:'disabled',
        scale:'device',
        clip:{
          x:box.x,
          y:box.y,
          width:configuration.css.width,
          height:configuration.css.height,
        },
      });
      const png = fs.readFileSync(target);
      assert.equal(png.readUInt32BE(16), configuration.pixels.width, `${name} source width mismatch`);
      assert.equal(png.readUInt32BE(20), configuration.pixels.height, `${name} source height mismatch`);
      console.log(`SOURCE ${name}.png (${configuration.pixels.width}x${configuration.pixels.height})`);
    }
    assert.deepEqual(requests, [], `Source captures made remote requests: ${requests.join(' | ')}`);
    await context.close();
  }
}

try {
  await page.goto(pathToFileURL(demo).href, { waitUntil: 'load' });
  await page.waitForSelector('#gogDemoShell');
  await settle();

  for (const [name, screen] of captures) {
    await captureCanvas(name, screen);
  }

  for (const [name, screen, prepare] of stateCaptures) {
    await captureCanvas(name, screen, prepare);
  }

  await page.click('#interactionTab');
  if ((await page.locator('.annotation-marker:visible').count()) === 0) {
    await page.click('#toggleMarkers');
  }
  await settle();

  const shellTarget = path.join(output, '15-full-annotation-shell.png');
  await page.screenshot({
    path: shellTarget,
    animations: 'disabled',
  });
  const shellSize = fs.statSync(shellTarget).size;
  assert(shellSize > 40 * 1024, `15-full-annotation-shell.png is unexpectedly small (${shellSize} bytes)`);
  console.log(`CAPTURED 15-full-annotation-shell.png (${shellSize} bytes)`);

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(remoteRequests, [], `Runtime remote requests: ${remoteRequests.join(' | ')}`);
  fs.writeFileSync(path.join(output, 'computed-layout.json'), `${JSON.stringify(layoutSnapshots, null, 2)}\n`, 'utf8');
  await captureSourceResolutions();
  const files = fs.readdirSync(output)
    .filter(file => file.toLowerCase().endsWith('.png'))
    .sort();
  assert.equal(files.length, 15, `Expected exactly 15 PNG captures, found ${files.length}`);
  assert.deepEqual(files, [
    '01-profile-portrait.png',
    '02-gog-login.png',
    '03-library-home-portrait.png',
    '04-library-home-landscape.png',
    '05-gog-library-portrait.png',
    '06-gog-library-landscape.png',
    '07-search-portrait.png',
    '08-search-landscape.png',
    '09-detail-portrait.png',
    '10-detail-landscape.png',
    '11-profile-gog-logout-dialog.png',
    '12-profile-epic-free-games.png',
    '13-detail-switch-portrait.png',
    '14-detail-switch-landscape.png',
    '15-full-annotation-shell.png',
  ]);
  assert.equal(fs.readdirSync(sourceOutput).filter(file => file.endsWith('.png')).length, 10, 'Expected 10 source-resolution captures');
  console.log(`PASS visualCaptures (${files.length} PNG files)`);
} finally {
  await browser.close();
}
