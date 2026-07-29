import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const evidenceDir = "tests/three-lane-squad/visual";

test("captures verified mobile home and battle evidence", async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  await page.goto("/?test=1&seed=73029");
  await expect(page.getByRole("heading", { name: "三路小队" })).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/home-mobile.png`, fullPage: true });

  await page.getByRole("button", { name: /开始出征/ }).click();
  await expect(page.locator('#game-canvas[data-hero-atlas-state="ready"]')).toBeVisible();
  await page.locator('[data-hero-card="guardian"]').click();
  await page.touchscreen.tap(67, 520);
  await page.locator('[data-hero-card="ranger"]').click();
  await page.touchscreen.tap(195, 300);
  await page.locator('[data-hero-card="priest"]').click();
  await page.touchscreen.tap(323, 410);
  await expect(page.getByLabel("战斗状态")).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/battle-mobile.png`, fullPage: true });

  await page.mouse.move(67, 520);
  await page.mouse.down();
  await page.mouse.move(195, 520, { steps: 8 });
  await expect.poll(() =>
    page.evaluate(() =>
      window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().transferPreview?.feedback,
    ),
  ).toBe("可调往此处");
  await page.screenshot({
    path: `${evidenceDir}/transfer-preview-mobile.png`,
    fullPage: true,
  });
  await page.mouse.up();
});
