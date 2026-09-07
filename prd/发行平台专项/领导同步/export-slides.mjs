import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const htmlFile = path.join(scriptDir, 'leadership-sync.html');
const outputDir = path.join(scriptDir, 'output');
const expectedSlideIds = [
  '01-product-landscape',
  '02-onboarding-and-game',
  '03-integration-test-release',
  '04-commerce-and-operation',
  '05-operations-and-scope',
  '06-enterprise-certification',
];

const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
    : null,
].filter(Boolean);

const browserPath = browserCandidates.find(candidate => fs.existsSync(candidate));

if (!fs.existsSync(htmlFile)) {
  throw new Error(`缺少领导同步 HTML：${htmlFile}`);
}
if (!browserPath) {
  throw new Error(`未找到 Chrome 或 Edge。已检查：\n${browserCandidates.join('\n')}`);
}

fs.mkdirSync(outputDir, { recursive: true });
const resolvedOutputDir = path.resolve(outputDir);
if (!resolvedOutputDir.startsWith(`${path.resolve(scriptDir)}${path.sep}`)) {
  throw new Error(`输出目录越界：${resolvedOutputDir}`);
}

const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const remoteRequests = [];
const failedRequests = [];

await context.route(/^https?:\/\//i, async route => {
  remoteRequests.push(route.request().url());
  await route.abort('blockedbyclient');
});

page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => pageErrors.push(error.message));
page.on('request', request => {
  if (/^https?:/i.test(request.url())) remoteRequests.push(request.url());
});
page.on('requestfailed', request => {
  failedRequests.push(`${request.url()} (${request.failure()?.errorText || 'unknown error'})`);
});

try {
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });

  const runtimeAudit = await page.evaluate(() => {
    const slides = [...document.querySelectorAll('.leadership-slide')];
    const images = [...document.querySelectorAll('.leadership-slide img')];
    return {
      slideIds: slides.map(slide => slide.getAttribute('data-slide-id') || ''),
      missingImages: images
        .filter(image => !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)
        .map(image => image.getAttribute('src') || '(empty src)'),
      remoteAssets: [...document.querySelectorAll('[src],[href]')]
        .map(node => node.getAttribute('src') || node.getAttribute('href') || '')
        .filter(value => /^https?:/i.test(value)),
    };
  });

  if (runtimeAudit.slideIds.length !== expectedSlideIds.length) {
    throw new Error(`页面数量应为 ${expectedSlideIds.length}，实际为 ${runtimeAudit.slideIds.length}`);
  }
  if (new Set(runtimeAudit.slideIds).size !== runtimeAudit.slideIds.length) {
    throw new Error(`页面 ID 重复：${runtimeAudit.slideIds.join(', ')}`);
  }
  if (runtimeAudit.slideIds.join('|') !== expectedSlideIds.join('|')) {
    throw new Error(`页面顺序或 ID 不符：${runtimeAudit.slideIds.join(', ')}`);
  }
  if (runtimeAudit.missingImages.length) {
    throw new Error(`存在未加载图片：${runtimeAudit.missingImages.join(', ')}`);
  }
  if (runtimeAudit.remoteAssets.length || remoteRequests.length) {
    const requests = [...new Set([...runtimeAudit.remoteAssets, ...remoteRequests])];
    throw new Error(`禁止远程请求：${requests.join(', ')}`);
  }
  if (consoleErrors.length || pageErrors.length || failedRequests.length) {
    throw new Error([
      ...consoleErrors.map(item => `console: ${item}`),
      ...pageErrors.map(item => `page: ${item}`),
      ...failedRequests.map(item => `request: ${item}`),
    ].join('\n'));
  }

  for (const name of fs.readdirSync(outputDir)) {
    if (/\.png$/i.test(name)) fs.rmSync(path.join(outputDir, name));
  }

  for (const id of expectedSlideIds) {
    const slide = page.locator(`.leadership-slide[data-slide-id="${id}"]`);
    if (await slide.count() !== 1) throw new Error(`${id}: 未找到唯一页面节点`);
    const box = await slide.boundingBox();
    if (!box || Math.round(box.width) !== 1920 || Math.round(box.height) !== 1080) {
      throw new Error(`${id}: 页面尺寸应为 1920×1080，实际为 ${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'unknown'}`);
    }
    const output = path.join(outputDir, `${id}.png`);
    await slide.screenshot({ path: output, animations: 'disabled' });
    const bytes = fs.readFileSync(output);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== 1920 || height !== 1080) {
      throw new Error(`${id}: 导出 PNG 尺寸错误 ${width}×${height}`);
    }
    console.log(`${path.basename(output)}\t${bytes.length} bytes`);
  }

  const missingAfterExport = await page.evaluate(() => [...document.images]
    .filter(image => !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)
    .map(image => image.getAttribute('src') || '(empty src)'));
  if (missingAfterExport.length || remoteRequests.length || consoleErrors.length || pageErrors.length || failedRequests.length) {
    throw new Error([
      ...missingAfterExport.map(item => `image: ${item}`),
      ...[...new Set(remoteRequests)].map(item => `remote: ${item}`),
      ...consoleErrors.map(item => `console: ${item}`),
      ...pageErrors.map(item => `page: ${item}`),
      ...failedRequests.map(item => `request: ${item}`),
    ].join('\n'));
  }

  console.log(`Exported ${expectedSlideIds.length} leadership slides; 0 missing images; 0 remote requests; 0 console errors.`);
} finally {
  await context.close();
  await browser.close();
}
