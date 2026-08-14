import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('C:/Users/z3635/AppData/Local/npm-cache/_npx/67dcf0932bafa1af/node_modules/playwright'));
}

const root = path.resolve(import.meta.dirname, '..');
const demo = path.join(root, 'demos', 'APP-PS4模拟器', '盖世游戏APP-主机模拟器接入demo.html');
const output = path.join(root, 'public', 'prd', 'ps4-emulator');
await fs.mkdir(output, { recursive: true });

const scenes = [
  ['01-library-portrait', 'library', '.phone'],
  ['02-library-landscape', 'library_landscape', '.landscape'],
  ['03-import-method', 'import', '.phone'],
  ['04-pkg-file-picker', 'pkgPicker', '.phone'],
  ['05-pkg-recognize', 'pkgRecognize', '.phone'],
  ['06-folder-scan', 'folderScan', '.phone'],
  ['07-folder-select', 'folderSelect', '.phone'],
  ['08-install-progress', 'folderInstall', '.phone'],
  ['09-game-management', 'more', '.phone'],
  ['10-save-management', 'saves', '.phone'],
  ['11-save-delete-confirm', 'saves_delete', '.phone'],
  ['12-emulator-settings', 'settings', '.phone'],
  ['13-unsupported-device', 'unsupported', '.phone'],
  ['14-required-components', 'component', '.phone'],
  ['15-landscape-running', 'playing', '.landscape'],
  ['16-exit-confirm', 'playing_exit', '.landscape'],
  ['17-plugin-admin', 'admin', '.admin-shell']
];

const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
let executablePath;
for (const candidate of chromeCandidates) {
  try { await fs.access(candidate); executablePath = candidate; break; } catch {}
}
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

for (const [name, scene, selector] of scenes) {
  const url = `${pathToFileURL(demo).href}?scene=${scene}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible' });
  await locator.screenshot({ path: path.join(output, `${name}.png`) });
}

await browser.close();
if (errors.length) {
  throw new Error(`页面脚本错误：${errors.join(' | ')}`);
}
console.log(JSON.stringify({ screenshots: scenes.length, output }, null, 2));
