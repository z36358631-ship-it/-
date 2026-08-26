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

const legacySharedKeys = [
  'gamehub_onboarding_source_v2',
  'gamehub_onboarding_handoff_v1',
  'gamehub_install_id',
  'gamehub_existing_personalization_v2',
];
const demoHtml = fs.readFileSync(demoPath, 'utf8');
for (const key of legacySharedKeys) {
  assert.equal(demoHtml.includes(key), false, `独立首玩 Demo 仍包含旧共享键: ${key}`);
}

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

await page.goto(pathToFileURL(demoPath).href);
assert.equal(await page.title(), '盖世游戏按游戏资产分流首玩 Demo');
const legacySentinel = 'legacy-demo-sentinel';
const preservedLegacyValues = await page.evaluate(({ keys, sentinel }) => {
  for (const key of keys) localStorage.setItem(key, sentinel);
  resetAll();
  return Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
}, { keys: legacySharedKeys, sentinel: legacySentinel });
assert.deepEqual(
  preservedLegacyValues,
  Object.fromEntries(legacySharedKeys.map(key => [key, legacySentinel])),
  'resetAll() 不得删除旧 Demo 的共享键数据',
);
assert.deepEqual(pageErrors, []);

await browser.close();
console.log('PASS segmented first-play onboarding smoke');
