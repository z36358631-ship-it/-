import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const workDir = path.join(root, 'prd', '发行平台专项', '领导同步');
const dataFile = path.join(workDir, 'deck-data.json');
const htmlFile = path.join(workDir, 'leadership-sync.html');
const outputDir = path.join(workDir, 'output');
const expectedSlideIds = [
  '01-product-landscape',
  '02-onboarding-and-game',
  '03-integration-test-release',
  '04-commerce-and-operation',
  '05-operations-and-scope',
  '06-enterprise-certification',
];
const expectedPngNames = expectedSlideIds.map(id => `${id}.png`);
const expectedCertificationImages = [
  'developer-home.png',
  'cert-login.png',
  'cert-entry.png',
  'cert-intro.png',
  'cert-form.png',
  'cert-pending.png',
];
const forbiddenCopy = [
  'TBD',
  'TODO',
  'APK 加固',
  '工单系统',
  '问题单系统',
  '消息通知中心',
  '完整功能已交付',
];

const readDeck = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const pngSize = file => {
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.length >= 24, `${path.basename(file)} 不是完整 PNG`);
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${path.basename(file)} 格式错误`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

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

test('领导同步材料内容契约完整', () => {
  assert.ok(fs.existsSync(dataFile), `缺少内容契约：${dataFile}`);
  const deck = readDeck();
  assert.deepEqual(deck.canvas, { width: 1920, height: 1080 });
  assert.equal(deck.slides.length, 6);
  assert.deepEqual(deck.slides.map(item => item.id), expectedSlideIds);
  assert.equal(new Set(deck.slides.map(item => item.id)).size, 6);
  assert.deepEqual(deck.statusLegend.map(item => item.label), [
    '已有 PRD＋Demo',
    '已有 Demo，待 PRD',
    '依赖专项／外部确认',
    '后续能力',
  ]);
  const content = JSON.stringify(deck);
  for (const forbidden of forbiddenCopy) {
    assert.equal(content.includes(forbidden), false, `内容契约不得出现：${forbidden}`);
  }
  assert.doesNotMatch(content, /P08-|08-消息/);

  const knownStatuses = new Set(deck.statusLegend.map(item => item.id));
  for (const slide of deck.slides) {
    for (const screen of slide.screens || []) {
      assert.ok(knownStatuses.has(screen.status), `${slide.id} 使用了未定义状态：${screen.status}`);
    }
  }
  const certification = deck.slides.find(item => item.id === '06-enterprise-certification');
  assert.ok(certification, '缺少企业认证附页');
  assert.equal(certification.steps.length, 6, '企业认证须保留六个流程步骤');
  assert.deepEqual(
    certification.screens.map(item => item.image),
    expectedCertificationImages,
    '企业认证附页须用六张实际页面图对应六步流程',
  );
});

test('Demo 截图证据尺寸一致', () => {
  const deck = readDeck();
  const names = new Set(deck.slides.flatMap(slide => (slide.screens || []).map(item => item.image)));
  assert.ok(names.size >= 19, '核心五页与附页应覆盖足够的真实 Demo 证据');
  for (const name of names) {
    const file = path.join(workDir, 'assets', 'screens', name);
    assert.ok(fs.existsSync(file), `缺少 Demo 截图：${name}`);
    assert.deepEqual(pngSize(file), { width: 1600, height: 900 }, `${name} 尺寸应为 1600×900`);
  }
});

test('HTML 页面、截图映射和卡片数量完整', () => {
  assert.ok(fs.existsSync(htmlFile), `缺少 HTML：${htmlFile}`);
  const html = fs.readFileSync(htmlFile, 'utf8');
  assert.equal((html.match(/class="leadership-slide(?:\s|\")/g) || []).length, 6);
  const ids = [...html.matchAll(/<section[^>]+data-slide-id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, expectedSlideIds);

  const imageSources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(imageSources.length > 0, 'HTML 至少应使用一张本地 Demo 截图');
  for (const image of imageSources) {
    assert.doesNotMatch(image, /^https?:/i, `图片不得使用远程地址：${image}`);
    assert.ok(fs.existsSync(path.resolve(workDir, image)), `缺少截图：${image}`);
  }

  for (const [index, id] of expectedSlideIds.entries()) {
    const start = html.indexOf(`data-slide-id="${id}"`);
    const nextId = expectedSlideIds[index + 1];
    const end = nextId ? html.indexOf(`data-slide-id="${nextId}"`, start + 1) : html.length;
    assert.ok(start >= 0 && end > start, `${id} HTML 区段缺失`);
    const body = html.slice(start, end);
    const cardCount = (body.match(/class="screen-card(?:\s|\")/g) || []).length;
    if (id === '01-product-landscape') assert.ok(cardCount <= 1, '全景页最多一张视觉锚点');
    else if (id === '06-enterprise-certification') assert.equal(cardCount, 6, '认证附页应有六个流程画面');
    else assert.ok(cardCount > 0 && cardCount <= 4, `${id} 应有 1—4 个截图卡片`);
  }

  const landscapeStart = html.indexOf('data-slide-id="01-product-landscape"');
  const landscapeEnd = html.indexOf('data-slide-id="02-onboarding-and-game"', landscapeStart + 1);
  const landscapeBody = html.slice(landscapeStart, landscapeEnd);
  assert.doesNotMatch(landscapeBody, /status-legend|flow-node-status|later-inline/, '全景泳道图不得展示交付进度图例、节点状态色或后续状态条');

  const assetReferences = [...html.matchAll(/<(?:img|script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  for (const reference of assetReferences) {
    assert.doesNotMatch(reference, /^https?:/i, `HTML 不得引用远程资源：${reference}`);
    if (!/^(?:data:|blob:|#)/i.test(reference)) {
      assert.ok(fs.existsSync(path.resolve(workDir, reference)), `缺少本地资源：${reference}`);
    }
  }
  for (const forbidden of forbiddenCopy) {
    assert.equal(html.includes(forbidden), false, `HTML 不得出现：${forbidden}`);
  }
  assert.doesNotMatch(html, /P08-|08-消息/);
});

test('六张 PNG 适合飞书查看', () => {
  assert.ok(fs.existsSync(outputDir), `缺少 PNG 输出目录：${outputDir}`);
  const files = fs.readdirSync(outputDir).filter(name => /\.png$/i.test(name)).sort();
  assert.deepEqual(files, expectedPngNames);
  for (const name of files) {
    const file = path.join(outputDir, name);
    assert.deepEqual(pngSize(file), { width: 1920, height: 1080 });
    assert.ok(fs.statSync(file).size < 5 * 1024 * 1024, `${name} 超过 5 MB`);
  }
});

test('浏览器加载无缺图、远程请求或运行错误', async () => {
  assert.ok(fs.existsSync(htmlFile), `缺少 HTML：${htmlFile}`);
  assert.ok(browserPath, `未找到 Chrome 或 Edge：${browserCandidates.join(', ')}`);
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
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
  page.on('requestfailed', request => failedRequests.push(request.url()));

  try {
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const audit = await page.evaluate(() => {
      const slides = [...document.querySelectorAll('.leadership-slide')];
      return {
        ids: slides.map(slide => slide.getAttribute('data-slide-id')),
        sizes: slides.map(slide => {
          const rect = slide.getBoundingClientRect();
          return [Math.round(rect.width), Math.round(rect.height)];
        }),
        missingImages: [...document.images]
          .filter(image => !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)
          .map(image => image.getAttribute('src')),
      };
    });
    assert.deepEqual(audit.ids, expectedSlideIds);
    assert.deepEqual(audit.sizes, expectedSlideIds.map(() => [1920, 1080]));
    assert.deepEqual(audit.missingImages, []);
    assert.deepEqual(remoteRequests, []);
    assert.deepEqual(failedRequests, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
    await browser.close();
  }
});
