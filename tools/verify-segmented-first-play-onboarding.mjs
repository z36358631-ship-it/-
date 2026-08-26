import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '新手首玩按游戏资产分流demo.html');
const sourcePath = path.join(root, 'demos', '新手引导完整链路demo.html');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const executablePath = chromeCandidates.find(fs.existsSync);

assert(fs.existsSync(sourcePath), '只读基线 Demo 不存在');
assert(fs.existsSync(demoPath), '独立首玩 Demo 尚未创建');
assert(executablePath, 'Local Chrome not found');

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(demoPath).href);
assert.equal(await page.title(), '盖世游戏按游戏资产分流首玩 Demo');
assert.deepEqual(pageErrors, []);

await browser.close();
console.log('PASS segmented first-play onboarding smoke');
