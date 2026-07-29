import { expect, test } from "@playwright/test";

async function swipeFirstRow(
  page: import("@playwright/test").Page,
): Promise<void> {
  const board = page.locator("[data-role='board']");
  const rect = await board.boundingBox();
  if (!rect) {
    throw new Error("board is not visible");
  }
  await page.mouse.move(
    rect.x + rect.width * 0.18,
    rect.y + rect.height * 0.12,
  );
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.48,
    rect.y + rect.height * 0.12,
    { steps: 8 },
  );
  await page.mouse.up();
}

test("首页、教学、真实滑动、结算、成长和无刷新重玩", async ({
  page,
}) => {
  page.on("pageerror", (error) => {
    process.stderr.write(`PAGE_ERROR:${error.message}\n`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      process.stderr.write(
        `BROWSER_ERROR:${message.text()}\n`,
      );
    }
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "开始营业" }),
  ).toBeVisible();
  await page.screenshot({
    path: "tests/monster-night-market/e2e/screenshots/home.png",
  });

  await page
    .getByRole("button", { name: "开始营业" })
    .click();
  await expect(
    page.getByText("第一单 · 10 秒学会"),
  ).toBeVisible();
  await expect(page.locator(".tutorial-card")).not.toContainText(
    /🌶️|◻️|🍄|🪷|🐟|🍥|💎|🫕/u,
  );
  await expect(page.locator(".mini-ingredient-art")).toHaveCount(8);
  await page.screenshot({
    path: "tests/monster-night-market/e2e/screenshots/tutorial.png",
  });

  await page
    .getByRole("button", { name: "我来试一单" })
    .click();
  await expect(page.getByRole("gridcell")).toHaveCount(16);
  const boardArt = page.locator("[data-role='board'] .ingredient-art");
  await expect(boardArt).toHaveCount(16);
  await expect(
    boardArt.first(),
  ).toHaveCSS("background-image", /^url\("blob:/u);
  await expect(page.locator("[data-role='board']")).not.toContainText(
    /🌶️|◻️|🍄|🪷|🐟|🍥|💎|🫕/u,
  );
  await expect(page.getByText("VIP 顺序单")).toBeVisible();
  await swipeFirstRow(page);
  await expect(page.locator("#live-region")).toContainText(
    "完成 1 单",
  );
  await expect(
    page.locator("[data-role='served-orders']"),
  ).toHaveText("1");
  await page.screenshot({
    path: "tests/monster-night-market/e2e/screenshots/playing.png",
  });

  await page
    .getByRole("button", { name: "提前收摊结算" })
    .click();
  await expect(page.getByText("营业完成")).toBeVisible();
  await expect(page.getByText(/本局完成 1 单/)).toBeVisible();
  await page.screenshot({
    path: "tests/monster-night-market/e2e/screenshots/result.png",
  });

  const urlBeforeReplay = page.url();
  await page
    .getByRole("button", { name: "再开一局" })
    .click();
  await expect(page.getByRole("gridcell")).toHaveCount(16);
  await expect(
    page.locator("[data-role='served-orders']"),
  ).toHaveText("0");
  expect(page.url()).toBe(urlBeforeReplay);
  await page
    .getByRole("button", { name: "提前收摊结算" })
    .click();
  await page
    .getByRole("button", { name: "查看摊位成长" })
    .click();
  await expect(page.getByText("规则侧移成长")).toBeVisible();
});

test("test=1 只暴露只读快照", async ({ page }) => {
  await page.goto("/?test=1&seed=42&speed=8");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const api = (
          window as typeof window & {
            __GAME_TEST__?: { list(): string[] };
          }
        ).__GAME_TEST__;
        return api?.list() ?? [];
      }),
    )
    .toEqual(["nightMarket.snapshot"]);
});

for (const viewport of [
  { width: 360, height: 800, name: "360x800" },
  { width: 390, height: 844, name: "390x844" },
  { width: 430, height: 932, name: "430x932" },
]) {
  test(`竖屏安全区 ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const start = page.getByRole("button", {
      name: "开始营业",
    });
    await expect(start).toBeInViewport();
    await page.screenshot({
      path: `tests/monster-night-market/e2e/screenshots/home-${viewport.name}.png`,
    });
  });
}
