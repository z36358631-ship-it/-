import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const outputDir = path.join(root, 'prd', '发行平台专项', '领导同步', 'assets', 'screens');
const viewport = { width: 1600, height: 900 };
const browserPath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(file => file && fs.existsSync(file));

if (!browserPath) throw new Error('未找到 Chrome 或 Edge');
fs.mkdirSync(outputDir, { recursive: true });

const demoUrl = (file, hash) => {
  const source = path.join(demoDir, file);
  if (!fs.existsSync(source)) throw new Error(`缺少 Demo 源文件：${source}`);
  const url = pathToFileURL(source);
  url.hash = hash;
  return url.href;
};

const developerCases = [
  ['developer-home', '01-开发者平台与资料demo.html', '/P01-01'],
  ['enterprise-pending', '01-开发者平台与资料demo.html', '/P01-03?preview=pending', 'pending'],
  ['game-management', '06-游戏创建与发行资料demo.html', '/P06-01'],
  ['create-game', '06-游戏创建与发行资料demo.html', '/P06-02'],
  ['store-profile', '06-游戏创建与发行资料demo.html', '/P06-04'],
  ['release-scope', '06-游戏创建与发行资料demo.html', '/P06-06'],
  ['appid-environment', '07-开发接入与资源中心demo.html', '/P07-02'],
  ['test-accounts', '07-开发接入与资源中心demo.html', '/P07-03'],
  ['build-upload', '03-包体测试与发布demo.html', '/P03-03'],
  ['release-rollback', '03-包体测试与发布demo.html', '/P03-12'],
  ['cdkey-overview', '02-CDKEY商品与供给demo.html', '/P02-01'],
  ['key-channel-api', '02-CDKEY商品与供给demo.html', '/P02-05'],
  ['operation-dashboard', '04-精准投放与数据demo.html', '/P04-01'],
  ['settlement-dashboard', '04-精准投放与数据demo.html', '/P04-02'],
];

const operationsCases = [
  ['enterprise-review', '01-开发者平台与资料demo.html', '/P01-08?preview=pending'],
  ['game-review-detail', '06-游戏创建与发行资料demo.html', '/P06-09'],
  ['version-review', '03-包体测试与发布demo.html', '/P03-09'],
  ['key-reconciliation', '02-CDKEY商品与供给demo.html', '/P02-06'],
];

const totals = {
  screenshots: 0,
  pageErrors: [],
  consoleErrors: [],
  remoteRequests: [],
};

const unique = values => [...new Set(values)];

const settle = async page => {
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.scrollTo(0, 0);
  });
};

const verifyPngSize = file => {
  const bytes = fs.readFileSync(file);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== viewport.width || height !== viewport.height) {
    throw new Error(`${path.basename(file)}: 期望 ${viewport.width}×${viewport.height}，实际 ${width}×${height}`);
  }
};

const openRuntime = async (browser, file, hash, label) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.name = '';
  });

  const page = await context.newPage();
  page.on('pageerror', error => totals.pageErrors.push(`${label}: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') totals.consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on('request', request => {
    if (/^https?:/i.test(request.url())) totals.remoteRequests.push(`${label}: ${request.url()}`);
  });
  await context.route(/^https?:/i, route => route.abort('blockedbyclient'));

  await page.goto(demoUrl(file, hash), { waitUntil: 'load' });
  await page.locator('.product-frame, #app .gh-app, #app > :first-child').first().waitFor({ state: 'visible' });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.demo-status-switcher{display:none!important}',
  });
  await settle(page);
  return { context, page };
};

const saveScreenshot = async (page, name) => {
  const output = path.join(outputDir, `${name}.png`);
  await settle(page);
  await page.screenshot({ path: output, animations: 'disabled', caret: 'hide' });
  verifyPngSize(output);
  totals.screenshots += 1;
  process.stdout.write(`captured ${name}.png\n`);
};

const showPendingVendorSettings = async page => {
  const vendorSettingsTab = page.getByRole('tab', { name: '厂商设置', exact: true });
  if (await vendorSettingsTab.count()) await vendorSettingsTab.click();
  const notice = page.locator('.platform-verification-notice');
  await notice.waitFor({ state: 'visible' });
  if (!/正在申请中|审核中/.test(await notice.innerText())) {
    throw new Error('企业认证状态条未展示审核中状态');
  }
};

const captureDirect = async (browser, captureCase) => {
  const [name, file, hash, state] = captureCase;
  const { context, page } = await openRuntime(browser, file, hash, name);
  try {
    if (state === 'pending') await showPendingVendorSettings(page);
    await saveScreenshot(page, name);
  } finally {
    await context.close();
  }
};

const captureCertificationJourney = async browser => {
  const label = 'enterprise-certification-journey';
  const { context, page } = await openRuntime(browser, '01-开发者平台与资料demo.html', '/P01-01', label);
  try {
    await page.locator('.public-login-button').click();
    await page.locator('[data-login-panel="zh"]').waitFor({ state: 'visible' });
    await saveScreenshot(page, 'cert-login');

    await page.locator('.login-qr-button').click();
    await page.getByText('选择当前入驻方式', { exact: true }).waitFor({ state: 'visible' });
    await saveScreenshot(page, 'cert-entry');

    await page.getByRole('button', { name: '申请认证', exact: true }).click();
    await page.locator('.qualification-intro-panel').waitFor({ state: 'visible' });
    await saveScreenshot(page, 'cert-intro');

    await page.getByRole('button', { name: '开始填写资料', exact: true }).click();
    await page.locator('[data-qualification-form-page]').waitFor({ state: 'visible' });
    await saveScreenshot(page, 'cert-form');
  } finally {
    await context.close();
  }

  const pending = await openRuntime(browser, '01-开发者平台与资料demo.html', '/P01-03?preview=pending', 'cert-pending');
  try {
    await showPendingVendorSettings(pending.page);
    await saveScreenshot(pending.page, 'cert-pending');
  } finally {
    await pending.context.close();
  }
};

const expectedNames = [
  ...developerCases.map(([name]) => name),
  ...operationsCases.map(([name]) => name),
  'cert-login',
  'cert-entry',
  'cert-intro',
  'cert-form',
  'cert-pending',
];
if (expectedNames.length !== 23 || new Set(expectedNames).size !== 23) {
  throw new Error(`截图契约应为 23 个唯一文件名，当前为 ${expectedNames.length}`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: browserPath,
  args: [
    '--allow-file-access-from-files',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
  ],
});

try {
  for (const captureCase of developerCases) await captureDirect(browser, captureCase);
  for (const captureCase of operationsCases) await captureDirect(browser, captureCase);
  await captureCertificationJourney(browser);
} finally {
  await browser.close();
}

totals.consoleErrors = unique(totals.consoleErrors);
totals.remoteRequests = unique(totals.remoteRequests);

const summary = `${totals.screenshots} screenshots captured; ${totals.pageErrors.length} page errors; ${totals.consoleErrors.length} console errors; ${totals.remoteRequests.length} remote requests`;
process.stdout.write(`${summary}.\n`);

if (
  totals.screenshots !== expectedNames.length
  || totals.pageErrors.length
  || totals.consoleErrors.length
  || totals.remoteRequests.length
) {
  const details = [
    ...totals.pageErrors,
    ...totals.consoleErrors,
    ...totals.remoteRequests,
  ];
  throw new Error(`截图验收失败：${summary}${details.length ? `\n${details.join('\n')}` : ''}`);
}
