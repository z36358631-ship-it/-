import { expect, test } from "@playwright/test";

test("home, tactical input, pause, result, progress and three variants work without reload", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?test=1&seed=73029&speed=6");
  await expect(page.getByRole("heading", { name: "三路小队" })).toBeVisible();
  await expect(page.getByText("均衡前线", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /开始出征/ }).click();

  const deployHero = async (heroId: string, x: number, y: number) => {
    const before = await page.evaluate(() =>
      window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.events
        .filter(({ type }) => type === "deploy").length ?? 0,
    );
    const card = page.locator(`[data-hero-card="${heroId}"]`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(card).toHaveClass(/is-selected/);
    await page.touchscreen.tap(x, y);
    await expect.poll(async () =>
      page.evaluate(() =>
        window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.events
          .filter(({ type }) => type === "deploy").length ?? 0,
      ),
    ).toBe(before + 1);
  };
  const waitForResult = async () => {
    await expect.poll(
      async () => page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().screen),
      { timeout: 60_000 },
    ).toBe("result");
    await expect(page.getByRole("heading", { name: /远征成功|防线失守/ })).toBeVisible();
  };

  await deployHero("ranger", 67, 300);
  await deployHero("ranger", 195, 300);
  const evolve = page.getByRole("button", { name: "合并进化" });
  await expect(evolve).toBeEnabled();
  await evolve.click();
  await deployHero("guardian", 323, 520);
  const firstSnapshot = await page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot());
  expect(firstSnapshot?.battle?.heroes.some(({ tier }) => tier === 2)).toBe(true);

  await page.mouse.move(323, 520);
  await page.mouse.down();
  await page.mouse.move(67, 520, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () =>
    page.evaluate(() =>
      window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.events.some(({ type }) => type === "transfer"),
    ),
  ).toBe(true);

  const focusEventsBefore = await page.evaluate(() =>
    window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.events
      .filter(({ type }) => type === "focus_fire").length ?? 0,
  );
  let focusSnapshot: ReturnType<NonNullable<typeof window.__THREE_LANE_SQUAD_DEBUG__>["snapshot"]> | null = null;
  for (let attempt = 0; attempt < 5 && !focusSnapshot; attempt += 1) {
    const enemyPoint = await page.evaluate(() => {
      const enemy = window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.enemies
        .find(({ status }) => status !== "defeated");
      return enemy
        ? {
            x: enemy.lane * 128 + 67,
            y: Math.min(570, 170 + enemy.progress * 100),
          }
        : null;
    });
    if (!enemyPoint) {
      await page.waitForTimeout(50);
      continue;
    }
    await page.touchscreen.tap(enemyPoint.x, enemyPoint.y);
    await page.waitForTimeout(25);
    const candidate = await page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot() ?? null);
    const focusEventCount = candidate?.battle?.events
      .filter(({ type }) => type === "focus_fire").length ?? 0;
    if (focusEventCount > focusEventsBefore) focusSnapshot = candidate;
  }
  expect(focusSnapshot?.battle?.focusFire.targetId).not.toBeNull();
  expect(focusSnapshot?.battle?.events.some(({ type }) => type === "focus_fire")).toBe(true);

  await page.getByRole("button", { name: "暂停游戏" }).click();
  await expect(page.getByRole("heading", { name: "战斗暂停" })).toBeVisible();
  await page.getByRole("button", { name: "继续战斗" }).click();
  await expect(page.getByLabel("战斗状态")).toBeVisible();
  await waitForResult();
  const firstResult = await page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot());
  expect(firstResult?.battle?.variant).toBe("balanced-front");

  await page.getByRole("button", { name: "立即再战" }).click();
  await expect.poll(async () =>
    page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.variant),
  ).toBe("lockdown");
  await waitForResult();

  await expect(page.getByText("连续两次失守，已备好一次整备演练")).toBeVisible();
  await page.getByRole("button", { name: "带整备再战" }).click();
  await expect.poll(async () =>
    page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.variant),
  ).toBe("elite-rush");
  await expect.poll(async () =>
    page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle?.baseMaxHealth),
  ).toBe(4);
  await waitForResult();
  await expect(page.getByRole("button", { name: "带整备再战" })).toHaveCount(0);
  await page.getByRole("button", { name: "查看成长" }).click();
  await expect(page.getByRole("heading", { name: "战术成长" })).toBeVisible();
  await expect(page.getByText("3 局", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /balanced-front|lockdown|elite-rush|mobile-reserve|focus-kill|unclassified|speed-counter|armor-break|zone-control/u,
  );

  const keys = await page.evaluate(() => Object.keys(window.__THREE_LANE_SQUAD_DEBUG__ ?? {}));
  expect(keys).toEqual(["snapshot"]);
  expect(errors).toEqual([]);
});

test("two losses offer a transparent recovery run that can be declined", async ({
  page,
}) => {
  await page.goto("/?test=1&seed=73029&speed=20");
  await page.getByRole("button", { name: /开始出征/ }).click();
  const waitForResult = () =>
    expect.poll(
      () =>
        page.evaluate(
          () => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().screen,
        ),
      { timeout: 30_000 },
    ).toBe("result");
  await waitForResult();
  await page.getByRole("button", { name: "立即再战" }).click();
  await waitForResult();
  await expect(
    page.getByText("连续两次失守，已备好一次整备演练"),
  ).toBeVisible();
  await page.getByRole("button", { name: "按原难度再战" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle
            ?.baseMaxHealth,
      ),
    )
    .toBe(3);
});
