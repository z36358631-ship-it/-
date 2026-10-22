const path = require("path");
const { chromium } = require("playwright-core");

const fileUrl = "file:///" + path.resolve(__dirname, "盖世游戏适合本机WebView-demo.html").replace(/\\/g, "/");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const results = [];
  const push = (name, ok, extra) => results.push({ name, ok, extra: extra === undefined ? "" : String(extra) });

  const executablePath = process.env.CHROME_PATH || "C:/Users/z3635/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 880 },
      deviceScaleFactor: 2,
      permissions: ["clipboard-read", "clipboard-write"]
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push("console: " + message.text());
    });

    await page.goto(fileUrl + "?screen=compatibility", { waitUntil: "load" });
    await wait(400);

    // 1. 查询页分享入口
    push("查询页右上角有分享按钮", Boolean(await page.$("[data-share-open]")));
    const geometry = await page.evaluate(() => {
      const button = document.querySelector("[data-share-open]");
      const h1 = document.querySelector(".page-header h1");
      if (!button || !h1) return null;
      const b = button.getBoundingClientRect();
      const t = h1.getBoundingClientRect();
      return { buttonLeft: Math.round(b.left), titleRight: Math.round(t.right), viewport: window.innerWidth };
    });
    push("分享按钮在标题右侧", geometry && geometry.buttonLeft >= geometry.titleRight - 1, JSON.stringify(geometry));

    // 2. 点击直接拉起通用分享
    await page.click("[data-share-open]");
    await wait(250);
    const sheet = await page.evaluate(() => {
      const panel = document.querySelector(".share-sheet");
      if (!panel) return null;
      return {
        channels: [...panel.querySelectorAll("[data-share-channel]")].map((b) => ({
          id: b.dataset.shareChannel, label: b.textContent.trim()
        })),
        url: panel.querySelector(".share-link span")?.textContent || "",
        status: panel.querySelector("[data-share-status]")?.textContent.trim() || "",
        pageInert: document.querySelector(".page")?.hasAttribute("inert")
      };
    });
    push("点击直接拉起分享面板", Boolean(sheet));
    push("渠道为微信/朋友圈/QQ/微博/复制链接",
      sheet && sheet.channels.map((c) => c.id).join(",") === "wechat,moments,qq,weibo,link",
      sheet ? JSON.stringify(sheet.channels.map((c) => c.label)) : "");
    push("面板展示固定站外链接",
      Boolean(sheet && sheet.url === "https://h5.gaishi.com/compatibility"), sheet ? sheet.url : "");
    push("面板打开时底层页面 inert", sheet && sheet.pageInert === true);
    await page.screenshot({ path: "_shot_01_share_sheet.png" });

    // 3. 渠道反馈与自动收起
    await page.click('[data-share-channel="wechat"]');
    await wait(200);
    const wechatStatus = await page.$eval("[data-share-status]", (node) => node.textContent.trim());
    push("点击微信有分享反馈", wechatStatus.includes("已分享至微信"), wechatStatus);
    await wait(2300);
    const afterClose = await page.evaluate(() => ({
      sheet: Boolean(document.querySelector(".share-sheet")),
      buttonSuccess: document.querySelector("[data-share-open]")?.classList.contains("is-success")
    }));
    push("反馈后自动收起并留状态", afterClose.sheet === false, JSON.stringify(afterClose));

    // 4. 复制链接
    await wait(500);
    await page.click("[data-share-open]");
    await wait(200);
    await page.click('[data-share-channel="link"]');
    await wait(600);
    const linkStatus = await page.$eval("[data-share-status]", (node) => ({
      text: node.textContent.trim(),
      success: node.classList.contains("is-success"),
      error: node.classList.contains("is-error")
    }));
    push("复制链接有成功/失败反馈", linkStatus.success || linkStatus.error, JSON.stringify(linkStatus));
    await page.keyboard.press("Escape");
    await wait(250);
    push("Esc 关闭面板", (await page.$(".share-sheet")) === null);
    await wait(2200);
    await page.screenshot({ path: "_shot_02_query_portrait.png" });

    // 5. 站外页
    await page.click('[data-demo-screen="web-landing"]');
    await wait(400);
    const web = await page.evaluate(() => {
      const root = document.querySelector(".web-page");
      if (!root) return null;
      return {
        url: document.querySelector(".browser-url")?.textContent || "",
        tag: document.querySelector(".browser-tag")?.textContent || "",
        cards: document.querySelectorAll(".web-card").length,
        filters: [...document.querySelectorAll(".filter-control strong")].map((n) => n.textContent.trim()),
        hasCopyButton: Boolean(document.querySelector("[data-config-copy]")),
        cta: [...document.querySelectorAll("[data-web-cta]")].map((n) => n.textContent.trim()),
        tip: document.querySelector(".web-tip")?.textContent.trim() || ""
      };
    });
    push("站外页渲染", Boolean(web));
    push("站外页显示固定地址与站外标记",
      web && web.url === "https://h5.gaishi.com/compatibility" && web.tag === "站外",
      web ? web.url + " / " + web.tag : "");
    push("站外页有只读结果卡片", web && web.cards > 0, web ? web.cards + " 张" : "");
    push("站外页不自动识别机型（默认全部机型）",
      web && web.filters[1] === "全部机型", web ? JSON.stringify(web.filters) : "");
    push("站外页没有复制分享码按钮", web && web.hasCopyButton === false);
    push("站外页有打开/下载 App 引导", web && web.cta.length === 2, web ? JSON.stringify(web.cta) : "");
    push("站外页有只读说明", web && web.tip.includes("不复制分享码"), web ? web.tip : "");
    await page.screenshot({ path: "_shot_03_web_portrait.png" });

    // 6. 站外页筛选
    await page.click(".web-page .filter-select [data-filter-trigger]");
    await wait(250);
    await page.click(".web-page .filter-menu .filter-option");
    await wait(350);
    const filtered = await page.evaluate(() => ({
      cards: document.querySelectorAll(".web-card").length,
      heading: document.querySelector(".web-result-heading h2")?.textContent.trim(),
      count: document.querySelector(".web-result-heading strong")?.textContent.trim()
    }));
    push("站外页筛选后结果更新", filtered.heading === "兼容记录" && filtered.cards > 0, JSON.stringify(filtered));
    await page.screenshot({ path: "_shot_04_web_filtered.png" });

    // 7. 两个场景筛选互不干扰
    await page.click('[data-demo-screen="compatibility"]');
    await wait(400);
    const appFilters = await page.evaluate(() =>
      [...document.querySelectorAll(".filter-control strong")].map((n) => n.textContent.trim()));
    push("回到 App 内查询页筛选独立",
      appFilters[0] === "全部游戏" && appFilters[1] !== "全部机型", JSON.stringify(appFilters));

    // 8. 横屏
    await page.click('[data-preview="desktop"]');
    await wait(350);
    const landscapeShare = await page.evaluate(() => {
      const button = document.querySelector("[data-share-open]");
      const h1 = document.querySelector(".page-header h1");
      return button && h1 ? button.getBoundingClientRect().left > h1.getBoundingClientRect().right : false;
    });
    push("横屏下分享按钮仍在右上", landscapeShare);
    await page.screenshot({ path: "_shot_05_query_landscape.png" });
    await page.click('[data-demo-screen="web-landing"]');
    await wait(350);
    await page.screenshot({ path: "_shot_06_web_landscape.png" });

    // 9. 两个 App 内入口进入查询页后都有分享入口
    await page.click('[data-demo-screen="pc-games"]');
    await wait(350);
    await page.click("[data-open-compatibility]");
    await wait(400);
    const fromHome = await page.evaluate(() => ({
      share: Boolean(document.querySelector("[data-share-open]")),
      hardware: [...document.querySelectorAll(".filter-control strong")].map((n) => n.textContent.trim())
    }));
    push("首页入口进入查询页有分享按钮", fromHome.share === true, JSON.stringify(fromHome));

    await page.click('[data-demo-screen="game-detail"]');
    await wait(350);
    await page.click("[data-open-compatibility]");
    await wait(400);
    const fromDetail = await page.evaluate(() => ({
      share: Boolean(document.querySelector("[data-share-open]")),
      game: document.querySelector(".filter-control strong")?.textContent.trim()
    }));
    push("详情入口进入查询页有分享按钮", fromDetail.share === true, JSON.stringify(fromDetail));

    push("无脚本报错", errors.length === 0, errors.join(" | "));
  } finally {
    await browser.close();
  }

  let failed = 0;
  results.forEach((item) => {
    if (!item.ok) failed += 1;
    console.log((item.ok ? "PASS  " : "FAIL  ") + item.name + (item.extra ? "  -> " + item.extra : ""));
  });
  console.log("\n合计 " + results.length + " 项，失败 " + failed + " 项");
})();
