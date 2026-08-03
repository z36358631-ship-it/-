import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'demos', 'APP租号功能', '盖世游戏APP租号功能demo.html');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(fs.existsSync(htmlPath), `找不到 Demo：${htmlPath}`);
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__appRentalDemo));
    const contract = await page.evaluate(() => ({
      orientation: window.__appRentalDemo.snapshot().orientation,
      screen: window.__appRentalDemo.snapshot().screen,
      root: Boolean(document.querySelector('#appRentalDemo')),
    }));
    assert(contract.root, '缺少 #appRentalDemo');
    assert(contract.orientation === 'portrait', '默认方向应为 portrait');
    assert(contract.screen === 'home', '默认页面应为 home');
    process.stdout.write('CONTRACT 3/3 PASS\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
