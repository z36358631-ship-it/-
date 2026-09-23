import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const htmlPath = path.resolve(root, 'output/family-routine/workday-family-routine-a4.html');
const outputPath = path.resolve(root, 'output/family-routine/workday-family-routine-a4.png');

const candidates = [
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1187/chrome-win/chrome.exe')
];
const executablePath = candidates.find(existsSync);

if (!executablePath) {
  throw new Error('No Playwright Chromium executable found.');
}

const browser = await chromium.launch({ executablePath, headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 3508, height: 2480 },
    deviceScaleFactor: 1
  });

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const bodyText = await page.locator('body').innerText();
  const requiredText = [
    '07:25',
    '08:10',
    '普通日 · 周二 / 周三 / 周五',
    '课外班日 · 周一 / 周四',
    '爸爸或妈妈',
    '21:15 熄灯',
    '21:25–21:30 熄灯'
  ];

  for (const text of requiredText) {
    if (!bodyText.includes(text)) {
      throw new Error(`Missing required text: ${text}`);
    }
  }

  const duplicateChecks = [
    ['普通日 · 周二 / 周三 / 周五', 1],
    ['课外班日 · 周一 / 周四', 1]
  ];
  for (const [text, expected] of duplicateChecks) {
    const count = bodyText.split(text).length - 1;
    if (count !== expected) {
      throw new Error(`Unexpected occurrence count for ${text}: ${count}`);
    }
  }

  const layout = await page.locator('.sheet').evaluate((sheet) => {
    const sheetRect = sheet.getBoundingClientRect();
    const overflowing = [...sheet.querySelectorAll('*')]
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        rect: element.getBoundingClientRect()
      }))
      .filter(({ rect }) => (
        rect.left < sheetRect.left - 0.5 ||
        rect.top < sheetRect.top - 0.5 ||
        rect.right > sheetRect.right + 0.5 ||
        rect.bottom > sheetRect.bottom + 0.5
      ))
      .map(({ tag, className, rect }) => ({
        tag,
        className,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      }));

    return {
      clientWidth: sheet.clientWidth,
      clientHeight: sheet.clientHeight,
      scrollWidth: sheet.scrollWidth,
      scrollHeight: sheet.scrollHeight,
      overflowing
    };
  });

  if (layout.clientWidth !== 3508 || layout.clientHeight !== 2480) {
    throw new Error(`Unexpected sheet size: ${layout.clientWidth}x${layout.clientHeight}`);
  }
  if (layout.scrollWidth > layout.clientWidth || layout.scrollHeight > layout.clientHeight) {
    throw new Error(`Sheet overflow: ${layout.scrollWidth}x${layout.scrollHeight}`);
  }
  if (layout.overflowing.length > 0) {
    throw new Error(`Child elements overflow sheet: ${JSON.stringify(layout.overflowing.slice(0, 5))}`);
  }
  if (pageErrors.length > 0) {
    throw new Error(`Page errors: ${pageErrors.join('; ')}`);
  }

  await page.locator('.sheet').screenshot({
    path: outputPath,
    animations: 'disabled'
  });
} finally {
  await browser.close();
}

const png = readFileSync(outputPath);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== 3508 || height !== 2480) {
  throw new Error(`Unexpected PNG size: ${width}x${height}`);
}

console.log(`PASS ${path.basename(outputPath)} ${width}x${height}`);
