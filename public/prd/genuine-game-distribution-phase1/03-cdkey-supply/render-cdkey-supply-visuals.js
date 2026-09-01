const path = require("path");
const { chromium } = require("C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const jobs = [
  { html: "03-cdkey-supply-flow.html", png: "03-cdkey-supply-flow.png", width: 2400, height: 900 },
  { page: "developer-supply-status", png: "03-developer-supply-status.png", width: 1800, height: 1100 },
  { page: "supply-error-detail", png: "03-supply-error-detail.png", width: 1800, height: 1100 },
  { page: "ops-product-list", png: "03-ops-product-list.png", width: 1800, height: 1100 },
  { page: "ops-sku-editor", png: "03-ops-sku-editor.png", width: 1800, height: 1100 },
  { page: "ops-supply-link", png: "03-ops-supply-link.png", width: 1800, height: 1100 },
  { page: "ops-stock-error", png: "03-ops-stock-error.png", width: 1800, height: 1100 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const job of jobs) {
      const page = await browser.newPage({ viewport: { width: job.width, height: job.height }, deviceScaleFactor: 1 });
      const html = job.html || "cdkey-supply-screens.html";
      const htmlPath = path.resolve(__dirname, html).replaceAll("\\", "/");
      const query = job.page ? `?page=${encodeURIComponent(job.page)}` : "";
      await page.goto(`file:///${htmlPath}${query}`, { waitUntil: "load" });
      await page.screenshot({ path: path.resolve(__dirname, job.png), fullPage: false });
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
