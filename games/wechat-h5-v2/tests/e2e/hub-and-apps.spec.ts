import { expect, test } from "@playwright/test";

test("hub renders three distinct locally decoded game cards", async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173") {
      external.push(request.url());
    }
  });
  const response = await page.goto("/hub/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator(".game-card")).toHaveCount(3);
  await expect(page.locator(".play")).toHaveCount(3);
  const images = await page.locator(".game-card img").evaluateAll((nodes) =>
    nodes.map((node) => {
      const image = node as HTMLImageElement;
      return {
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      };
    }),
  );
  expect(images.every((image) =>
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  )).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(response?.headers()["cache-control"]).toBe("no-store");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
});

for (const gameId of [
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const) {
  test(`${gameId} boots directly without decode or page errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${gameId}/?test=1&seed=17`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
