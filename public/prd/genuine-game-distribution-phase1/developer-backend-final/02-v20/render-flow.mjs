import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(currentDir, 'flow-source.html');
const output = path.join(currentDir, 'flow.png');
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});

try {
  const page = await browser.newPage({
    viewport: { width: 2400, height: 1350 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(source).href, { waitUntil: 'load' });
  await page.screenshot({ path: output, type: 'png', fullPage: false });
} finally {
  await browser.close();
}

console.log(output);
