const path = require("path");
const { chromium } = require("C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const jobs = [
  { html: "01-end-to-end-flow.html", png: "01-end-to-end-flow.png", width: 3000, height: 900 },
  { html: "02-platform-surfaces.html", png: "02-platform-surfaces.png", width: 2400, height: 1060 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const job of jobs) {
      const page = await browser.newPage({ viewport: { width: job.width, height: job.height }, deviceScaleFactor: 1 });
      const htmlPath = path.resolve(__dirname, job.html).replaceAll("\\", "/");
      await page.goto(`file:///${htmlPath}`, { waitUntil: "load" });
      await page.screenshot({ path: path.resolve(__dirname, job.png), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
