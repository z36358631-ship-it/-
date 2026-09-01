const path = require("path");
const { chromium } = require("C:/Users/z3635/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const jobs = [
  { html: "02-developer-flow.html", png: "02-developer-flow.png", width: 2000, height: 900 },
  { page: "vendor-home", png: "02-vendor-home.png", width: 1800, height: 2200 },
  { page: "game-publisher-entry", png: "02-game-publisher-entry.png", width: 1800, height: 2200 },
  { page: "developer-login", png: "02-developer-login.png", width: 1800, height: 1100 },
  { page: "developer-home", png: "02-developer-home.png", width: 1800, height: 1100 },
  { page: "vendor-profile", png: "02-vendor-profile.png", width: 1800, height: 1100 },
  { page: "game-list", png: "02-game-list.png", width: 1800, height: 1100 },
  { page: "game-editor", png: "02-game-editor.png", width: 1800, height: 1380 },
  { page: "review-result", png: "02-review-result.png", width: 1800, height: 1100 },
  { page: "partner-account", png: "02-partner-account.png", width: 1800, height: 1100 },
  { page: "vendor-review", png: "02-vendor-review.png", width: 1800, height: 1100 },
  { page: "game-review", png: "02-game-review.png", width: 1800, height: 1100 },
];

const requestedPage = process.argv[2];
const selectedJobs = requestedPage ? jobs.filter((job) => job.page === requestedPage) : jobs;
if (requestedPage && selectedJobs.length === 0) {
  throw new Error(`Unknown page: ${requestedPage}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const job of selectedJobs) {
      const browserPage = await browser.newPage({ viewport: { width: job.width, height: job.height }, deviceScaleFactor: 1 });
      const html = job.html || "developer-screens.html";
      const htmlPath = path.resolve(__dirname, html).replaceAll("\\", "/");
      const query = job.page ? `?page=${encodeURIComponent(job.page)}` : "";
      await browserPage.goto(`file:///${htmlPath}${query}`, { waitUntil: "load" });
      await browserPage.screenshot({ path: path.resolve(__dirname, job.png), fullPage: false });
      await browserPage.close();
    }
  } finally {
    await browser.close();
  }
})();
