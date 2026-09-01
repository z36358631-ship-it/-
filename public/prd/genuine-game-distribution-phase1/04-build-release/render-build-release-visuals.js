const path = require('path');
const { chromium } = require('C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const jobs = [
  { html: '04-build-release-flow.html', png: '04-build-release-flow.png', width: 3200, height: 1000 },
  { page: 'version-list', png: '04-version-list.png' },
  { page: 'version-editor', png: '04-version-editor.png' },
  { page: 'build-upload', png: '04-build-upload.png' },
  { page: 'submit-test', png: '04-submit-test.png' },
  { page: 'test-rejection', png: '04-test-rejection.png' },
  { page: 'test-task-list', png: '04-test-task-list.png' },
  { page: 'test-task-detail', png: '04-test-task-detail.png' },
  { page: 'test-result', png: '04-test-result.png' },
  { page: 'ops-version-list', png: '04-ops-version-list.png' },
  { page: 'ops-version-detail', png: '04-ops-version-detail.png' },
  { page: 'release-list', png: '04-release-list.png' },
  { page: 'release-config', png: '04-release-config.png' },
  { page: 'live-disposal', png: '04-live-disposal.png' }
];

const requestedPage = process.argv[2];
const selected = requestedPage ? jobs.filter((job) => job.page === requestedPage || job.html === requestedPage) : jobs;
if (requestedPage && selected.length === 0) throw new Error(`Unknown page: ${requestedPage}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const job of selected) {
      const width = job.width || 1800;
      const height = job.height || 1100;
      const htmlPath = path.resolve(__dirname, job.html || 'build-release-screens.html').replaceAll('\\', '/');
      const query = job.page ? `?page=${encodeURIComponent(job.page)}` : '';
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(`file:///${htmlPath}${query}`, { waitUntil: 'load' });
      const dimensions = await page.evaluate(() => ({
        innerWidth,
        innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      }));
      if (dimensions.scrollWidth !== width || dimensions.scrollHeight !== height) {
        throw new Error(`${job.page} overflow: ${JSON.stringify(dimensions)}`);
      }
      await page.screenshot({ path: path.resolve(__dirname, job.png), fullPage: false });
      console.log(`${job.page || job.html}: ${dimensions.scrollWidth}x${dimensions.scrollHeight} PASS`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
