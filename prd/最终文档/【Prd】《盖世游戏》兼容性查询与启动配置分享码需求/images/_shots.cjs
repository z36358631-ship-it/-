const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");

const demo = path.resolve(__dirname, "..", "..", "..", "..", "demos", "适合本机", "盖世游戏适合本机WebView-demo.html");
const fileUrl = "file:///" + demo.replace(/\\/g, "/");
const outDir = path.resolve(__dirname, "v19");
fs.mkdirSync(outDir, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const executablePath = process.env.CHROME_PATH || "C:/Users/z3635/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(fileUrl + "?screen=compatibility", { waitUntil: "load" });
    await wait(500);

    const shoot = async (selector, name) => {
      await page.evaluate(() => document.activeElement?.blur?.());
      await wait(120);
      await page.locator(selector).screenshot({ path: path.join(outDir, name) });
      console.log("shot " + name);
    };

    // 竖屏：查询页右上角分享入口
    await shoot(".frame", "P05-query-share-entry.png");

    // 竖屏：通用分享面板
    await page.click("[data-share-open]");
    await wait(250);
    await shoot(".frame", "P06-share-sheet.png");

    // 竖屏：分享成功反馈（复制链接）
    await page.click('[data-share-channel="link"]');
    await wait(500);
    await shoot(".frame", "P07-share-copied.png");
    await page.keyboard.press("Escape");
    await wait(300);

    // 竖屏：站外只读页
    await page.click('[data-demo-screen="web-landing"]');
    await wait(450);
    await shoot(".frame", "W01-outside-query-portrait.png");

    // 横屏：查询页分享入口 + 面板
    await page.click('[data-preview="desktop"]');
    await page.click('[data-demo-screen="compatibility"]');
    await wait(450);
    await shoot(".frame", "L05-query-share-entry.png");
    await page.click("[data-share-open]");
    await wait(300);
    await shoot(".frame", "L06-share-sheet.png");
    await page.keyboard.press("Escape");
    await wait(300);

    // 横屏：站外只读页
    await page.click('[data-demo-screen="web-landing"]');
    await wait(450);
    await shoot(".frame", "W02-outside-query-landscape.png");

    await context.close();
  } finally {
    await browser.close();
  }
})();
