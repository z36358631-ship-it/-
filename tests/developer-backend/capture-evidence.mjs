import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const root = process.cwd();
const demoDir = path.join(root, 'demos', '开发者后台一期');
const outputDir = path.join(root, 'test-results', 'developer-backend');
const screenshotDir = path.join(outputDir, 'screenshots');
const routes = JSON.parse(fs.readFileSync(path.join(demoDir, 'src', 'routes.json'), 'utf8'));
const modules = JSON.parse(fs.readFileSync(path.join(demoDir, 'src', 'modules.json'), 'utf8'));
const browserCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

const executablePath = browserCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('未找到本机 Chrome 或 Edge；可通过 CHROME_PATH 指定。');
fs.mkdirSync(screenshotDir, { recursive: true });

const routeUrl = route => {
  const module = modules.find(item => item.id === route.moduleId);
  if (!module) throw new Error(`${route.id}: 缺少模块配置`);
  const url = pathToFileURL(path.join(demoDir, module.output));
  url.hash = `/${route.id}?role=${route.role}&state=default`;
  return url.href;
};

const preparePage = async (browser, route, viewport) => {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  const consoleErrors = [];
  const remoteRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', request => { if (/^https?:/i.test(request.url())) remoteRequests.push(request.url()); });
  await page.goto(routeUrl(route), { waitUntil: 'load' });
  await page.locator(`.product-frame[data-frame-id="${route.id}"]`).waitFor({ state: 'visible' });
  await page.addStyleTag({ content: '[data-review-only="true"]{display:none!important}*{animation:none!important;transition:none!important}' });
  return { page, pageErrors, consoleErrors, remoteRequests };
};

const screenshot = async (page, name) => {
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, animations: 'disabled' });
  return `screenshots/${name}`;
};

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--allow-file-access-from-files', '--disable-background-networking'],
});

const report = [];
try {
  for (const route of routes) {
    const runtime = await preparePage(browser, route, { width: 1440, height: 900 });
    const { page, pageErrors, consoleErrors, remoteRequests } = runtime;
    const file = await screenshot(page, `1440x900-${route.id}.png`);
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    report.push({
      route: route.id,
      role: route.role,
      template: route.templateId,
      viewport: '1440x900',
      file,
      pageErrors,
      consoleErrors,
      remoteRequests: [...new Set(remoteRequests)],
      horizontalOverflow,
    });
    await page.close();
  }

  for (const routeId of ['P01-01', 'P02-01']) {
    const route = routes.find(item => item.id === routeId);
    const { page } = await preparePage(browser, route, { width: 1280, height: 800 });
    await screenshot(page, `1280x800-${routeId}.png`);
    await page.close();
  }

  const p01 = routes.find(item => item.id === 'P01-01');
  const onboarding = await preparePage(browser, p01, { width: 1440, height: 900 });
  await onboarding.page.locator('[data-demo-action="start-onboarding"]').click();
  await screenshot(onboarding.page, '1440x900-P01-01-login-step.png');
  await onboarding.page.close();

  const p02 = routes.find(item => item.id === 'P02-01');
  const cdkey = await preparePage(browser, p02, { width: 1440, height: 900 });
  for (const [index, name] of ['supply', 'key-batches', 'channel-api', 'api-docs'].entries()) {
    await cdkey.page.locator(`[data-tab-index="${index}"]`).click();
    await screenshot(cdkey.page, `1440x900-P02-01-${name}.png`);
  }
  await cdkey.page.locator('[data-help-open]').click();
  await screenshot(cdkey.page, '1440x900-global-help.png');
  await cdkey.page.close();
} finally {
  await browser.close();
}

const summary = {
  routeCount: report.length,
  pageErrorCount: report.reduce((total, item) => total + item.pageErrors.length, 0),
  consoleErrorCount: report.reduce((total, item) => total + item.consoleErrors.length, 0),
  remoteRequestCount: report.reduce((total, item) => total + item.remoteRequests.length, 0),
  horizontalOverflowCount: report.filter(item => item.horizontalOverflow).length,
};
fs.writeFileSync(path.join(outputDir, 'route-report.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), browser: executablePath, summary, routes: report }, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
