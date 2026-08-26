import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoPath = path.join(root, 'demos', '首页与探索', '游戏盲盒demo.html');
const outputDir = path.join(root, 'test-results', 'game-blind-box', 'visual');
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);
if (!executablePath) throw new Error('Local Chrome or Edge not found');
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });

async function capture({ orientation, cssWidth, cssHeight, pixelWidth, pixelHeight, file }) {
  const dpr = pixelWidth / cssWidth;
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${pathToFileURL(demoPath).href}?test=1`, { waitUntil: 'load' });
  await page.evaluate(({ orientation, cssWidth, cssHeight }) => {
    demo.setOrientation(orientation);
    demo.setLocale('zh-CN');
    demo.setDemoState('library');
    const node = document.querySelector('#device');
    node.style.width = `${cssWidth}px`;
    node.style.height = `${cssHeight}px`;
  }, { orientation, cssWidth, cssHeight });
  await page.waitForTimeout(320);
  const output = path.join(outputDir, file);
  await page.locator('#device').screenshot({ path: output });
  const size = await page.locator('#device').evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
  await context.close();
  if (errors.length) throw new Error(errors.join('; '));
  return { output, css: size, pixels: [pixelWidth, pixelHeight], dpr };
}

try {
  const portraitDpr = 526 / 402;
  const landscapeDpr = 943 / 874;
  const rows = [];
  // Locator screenshots include rasterized rows around the rounded device edge.
  rows.push(await capture({ orientation: 'portrait', cssWidth: 402, cssHeight: (928 - 1) / portraitDpr, pixelWidth: 526, pixelHeight: 928, file: 'implementation-portrait.png' }));
  rows.push(await capture({ orientation: 'landscape', cssWidth: 874, cssHeight: 530 / landscapeDpr, pixelWidth: 943, pixelHeight: 530, file: 'implementation-landscape.png' }));
  console.log(JSON.stringify({ outputDir, rows }, null, 2));
} finally {
  await browser.close();
}
