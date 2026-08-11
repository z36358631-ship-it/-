import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demos', 'PC与Mac端', '盖世游戏GOG平台接入-交互标注版.html');
const output = path.join(root, '.tmp', 'gog-platform-demo-captures');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(executablePath, 'Local Chrome not found');
assert(fs.existsSync(demo), `Demo not found: ${demo}`);
fs.mkdirSync(output, { recursive: true });

for (const entry of fs.readdirSync(output, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
    fs.unlinkSync(path.join(output, entry.name));
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

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(10000);
await page.emulateMedia({ reducedMotion: 'reduce' });

const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

async function settle() {
  await page.waitForFunction(() => document.fonts?.status === 'loaded');
  await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => {
    document.querySelector('#demoCanvas')?.scrollTo(0, 0);
    document.querySelector('#annoScroll')?.scrollTo(0, 0);
    document.querySelector('#leftNav')?.scrollTo(0, 0);
  });
}

async function captureCanvas(name, screen) {
  await page.click(`[data-page="${screen}"]`);
  await page.waitForSelector(`[data-screen="${screen}"]`);
  await settle();

  const target = path.join(output, `${name}.png`);
  const viewport = page.locator(`.app-viewport[data-screen="${screen}"]`);
  const box = await viewport.boundingBox();
  assert(box, `Viewport not found for ${screen}`);
  const expected = screen.endsWith('landscape') ? { width: 874, height: 402 } : { width: 402, height: 874 };
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
  console.log(`CAPTURED ${name}.png (${size} bytes)`);
}

try {
  await page.goto(pathToFileURL(demo).href, { waitUntil: 'load' });
  await page.waitForSelector('#gogDemoShell');
  await settle();

  for (const [name, screen] of captures) {
    await captureCanvas(name, screen);
  }

  await page.click('#interactionTab');
  if ((await page.locator('.annotation-marker:visible').count()) === 0) {
    await page.click('#toggleMarkers');
  }
  await settle();

  const shellTarget = path.join(output, '11-full-annotation-shell.png');
  await page.screenshot({
    path: shellTarget,
    animations: 'disabled',
  });
  const shellSize = fs.statSync(shellTarget).size;
  assert(shellSize > 40 * 1024, `11-full-annotation-shell.png is unexpectedly small (${shellSize} bytes)`);
  console.log(`CAPTURED 11-full-annotation-shell.png (${shellSize} bytes)`);

  assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join(' | ')}`);
  const files = fs.readdirSync(output)
    .filter(file => file.toLowerCase().endsWith('.png'))
    .sort();
  assert.equal(files.length, 11, `Expected exactly 11 PNG captures, found ${files.length}`);
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
    '11-full-annotation-shell.png',
  ]);
  console.log(`PASS visualCaptures (${files.length} PNG files)`);
} finally {
  await browser.close();
}
