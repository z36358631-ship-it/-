const path = require("path");
const { chromium } = require("playwright-core");

const html = path.resolve(__dirname, "v19", "_path-c.html");
const fileUrl = "file:///" + html.replace(/\\/g, "/");
const out = path.resolve(__dirname, "v19", "00-path-c-v19.png");

(async () => {
  const executablePath = process.env.CHROME_PATH || "C:/Users/z3635/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1300, height: 760 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(fileUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    await page.locator("body").screenshot({ path: out });
    console.log("shot " + out);
    await context.close();
  } finally {
    await browser.close();
  }
})();
