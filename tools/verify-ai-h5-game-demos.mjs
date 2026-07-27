import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright-core';

const root = process.cwd();
const outputDir = path.join(root, 'test-results', 'ai-h5-game-demos');
const demoRoot = 'demos/AI%E6%B8%B8%E6%88%8F%E8%B5%9B%E9%81%93%E8%AF%84%E6%B5%8B';
const pages = [
  { id: 'hub', file: 'index.html' },
  { id: 'ghost-grid', file: '01-ghost-grid.html' },
  { id: 'trap-lab', file: '02-trap-lab.html' },
  { id: 'bio-forge', file: '03-bio-forge.html' },
  { id: 'lotus-guardian', file: '04-lotus-guardian.html' }
];
const viewports = [
  { id: 'desktop', width: 1440, height: 900, touch: false },
  { id: 'mobile', width: 390, height: 844, touch: true }
];

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  }[ext] || 'application/octet-stream';
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const requested = path.resolve(root, `.${urlPath}`);
      if (!requested.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const stat = await fs.stat(requested);
      const file = stat.isDirectory() ? path.join(requested, 'index.html') : requested;
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function browserExecutable() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  return candidates.find(async (candidate) => {
    try {
      await fs.access(candidate);
      return true;
    } catch {
      return false;
    }
  }) || candidates[0];
}

async function exercise(page, gameId, touch) {
  if (gameId === 'hub') {
    await page.locator('.game').first().scrollIntoViewIfNeeded();
    return;
  }
  if (gameId === 'lotus-guardian') {
    const activeStory = page.locator('.story-card.active');
    if (await activeStory.isVisible().catch(() => false)) {
      await activeStory.click();
      await page.waitForTimeout(120);
    }
    const recruit = page.locator('#recruitButton');
    await recruit.click();
    await recruit.click();
    await page.locator('[data-slot="0"]').click();
    await page.locator('[data-slot="1"]').click();
    await page.locator('[data-pad="3"]').click();
    for (let i = 0; i < 4; i += 1) await recruit.click();
    await page.locator('#summonButton').click();
    await page.locator('#battleButton').click();
    await page.locator('#speedButton').click();
    await page.waitForTimeout(900);
    return;
  }

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');

  const candidates = page.locator('button:visible:not([disabled])');
  const count = Math.min(await candidates.count(), touch ? 4 : 3);
  for (let i = 0; i < count; i += 1) {
    const button = candidates.nth(i);
    const text = (await button.innerText().catch(() => '')).trim();
    if (/清空|重置数据|关闭页面/.test(text)) continue;
    await button.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(160);
  }
}

async function verifyPage(browser, baseUrl, entry, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.touch,
    isMobile: viewport.touch
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

  const url = `${baseUrl}/${demoRoot}/${entry.file}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  if (!response || !response.ok()) throw new Error(`${entry.id}/${viewport.id}: HTTP load failed`);
  await page.waitForTimeout(500);

  const layout = await page.evaluate(() => ({
    title: document.title,
    width: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
    visibleText: document.body.innerText.trim().length,
    canvas: document.querySelectorAll('canvas').length,
    buttons: [...document.querySelectorAll('button')].filter((button) => {
      const style = getComputedStyle(button);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).length
  }));
  if (!layout.title) throw new Error(`${entry.id}/${viewport.id}: missing title`);
  if (layout.visibleText < 30) throw new Error(`${entry.id}/${viewport.id}: insufficient visible UI`);
  if (layout.width > layout.client + 2) throw new Error(`${entry.id}/${viewport.id}: horizontal overflow ${layout.width}/${layout.client}`);
  if (layout.buttons < 1) throw new Error(`${entry.id}/${viewport.id}: no interactive button`);

  await exercise(page, entry.id, viewport.touch);
  await page.waitForTimeout(500);

  if (viewport.touch) {
    const tinyTargets = await page.evaluate(() => [...document.querySelectorAll('button')].filter((button) => {
      const style = getComputedStyle(button);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40);
    }).slice(0, 5).map((button) => ({
      text: button.innerText.trim().slice(0, 30),
      width: Math.round(button.getBoundingClientRect().width),
      height: Math.round(button.getBoundingClientRect().height)
    })));
    if (tinyTargets.length) errors.push(`small touch targets: ${JSON.stringify(tinyTargets)}`);
  }

  await page.screenshot({
    path: path.join(outputDir, `${entry.id}-${viewport.id}.png`),
    fullPage: false
  });
  await context.close();
  return { page: entry.id, viewport: viewport.id, layout, errors };
}

await fs.mkdir(outputDir, { recursive: true });
const { server, port } = await startServer();
const executablePath = browserExecutable();
const results = [];
let browser;

try {
  browser = await chromium.launch({ executablePath, headless: true });
  for (const entry of pages) {
    for (const viewport of viewports) {
      results.push(await verifyPage(browser, `http://127.0.0.1:${port}`, entry, viewport));
    }
  }
  await fs.writeFile(path.join(outputDir, 'verification.json'), JSON.stringify(results, null, 2), 'utf8');
  const hardErrors = results.flatMap((result) =>
    result.errors.filter((error) => !error.startsWith('small touch targets:'))
      .map((error) => `${result.page}/${result.viewport}: ${error}`)
  );
  for (const result of results) {
    const note = result.errors.length ? `WARN ${result.errors.join(' | ')}` : 'PASS';
    process.stdout.write(`${result.page.padEnd(16)} ${result.viewport.padEnd(7)} ${note}\n`);
  }
  if (hardErrors.length) {
    process.stderr.write(`${hardErrors.join('\n')}\n`);
    process.exitCode = 1;
  }
} finally {
  await browser?.close();
  server.close();
}
