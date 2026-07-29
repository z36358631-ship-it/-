import { expect, test, type Page } from "@playwright/test";
import type { RicochetSnapshot } from "../../../apps/ricochet-crew/src/game/contracts";

interface ReadOnlyApi {
  list(): string[];
  invoke<T>(name: string): Promise<T>;
}

async function snapshot(page: Page): Promise<RicochetSnapshot> {
  return page.evaluate(async () => {
    const api = (
      window as typeof window & {
        __GAME_TEST__?: ReadOnlyApi;
      }
    ).__GAME_TEST__;
    if (!api) throw new Error("TEST_API_MISSING");
    return api.invoke<RicochetSnapshot>("ricochet.snapshot");
  });
}

async function aimAt(
  page: Page,
  target: { x: number; y: number },
): Promise<void> {
  const arena = page.locator(".rc-arena");
  const rect = await arena.boundingBox();
  if (!rect) throw new Error("ARENA_NOT_VISIBLE");
  const launcher = { x: 195, y: 730 };
  const dx = target.x - launcher.x;
  const dy = target.y - launcher.y;
  const length = Math.hypot(dx, dy) || 1;
  const pull = 105;
  const start = {
    x: rect.x + (launcher.x / 390) * rect.width,
    y: rect.y + (launcher.y / 844) * rect.height,
  };
  const end = {
    x: start.x - (dx / length) * (pull / 390) * rect.width,
    y: start.y - (dy / length) * (pull / 844) * rect.height,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}

test("真实瞄准、途中技能、改造、结算与无刷新重玩", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/?test=1&seed=42&speed=8");
  await expect(
    page.getByRole("button", { name: /进入遗迹/ }),
  ).toBeVisible();
  const heroButtons = page.locator(
    '.hero-select [data-action="hero"]',
  );
  await expect(heroButtons).toHaveCount(3);
  await expect(
    page.locator(
      '.hero-select .hero-portrait[data-portrait-position="left"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.hero-select .hero-portrait[data-portrait-position="center"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.hero-select .hero-portrait[data-portrait-position="right"]',
    ),
  ).toHaveCount(1);
  await expect(page.getByText("ORIGINAL KEY ART")).toHaveCount(0);
  await page.screenshot({
    path: "tests/ricochet-crew/e2e/screenshots/home.png",
  });
  await page.getByRole("button", { name: /进入遗迹/ }).click();
  await expect(
    page.getByRole("img", { name: "岩铠·拓头像" }),
  ).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const api = (
          window as typeof window & {
            __GAME_TEST__?: ReadOnlyApi;
          }
        ).__GAME_TEST__;
        return api?.list() ?? [];
      }),
    )
    .toEqual(["ricochet.snapshot"]);

  const before = await snapshot(page);
  const firstTarget = before.targets.find((target) => target.active)!;
  await aimAt(page, firstTarget.position);
  await expect.poll(async () => (await snapshot(page)).mode).toBe("flying");
  await expect
    .poll(async () => (await snapshot(page)).shot?.position.y ?? 730)
    .not.toBe(730);
  await page.getByRole("button", { name: /再加速/ }).click();
  await expect(
    page.getByRole("button", { name: "技能已用" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "tests/ricochet-crew/e2e/screenshots/playing.png",
  });

  let sawChoice = false;
  for (let turn = 0; turn < 300; turn += 1) {
    const state = await snapshot(page);
    if (state.mode === "won" || state.mode === "lost") break;
    if (state.mode === "choosing") {
      sawChoice = true;
      await page
        .locator('[data-action="choose"]')
        .first()
        .click();
      continue;
    }
    if (state.mode === "flying") {
      await page.waitForTimeout(55);
      continue;
    }
    const target = state.targets.find((item) => item.active);
    await aimAt(page, target?.position ?? { x: 195, y: 120 });
    await page.waitForTimeout(55);
  }
  expect(sawChoice).toBe(true);

  await expect
    .poll(async () => (await snapshot(page)).mode, {
      timeout: 8_000,
    })
    .toMatch(/won|lost/);
  await expect(page.locator(".rc-result")).toBeVisible();
  await page.screenshot({
    path: "tests/ricochet-crew/e2e/screenshots/result.png",
  });

  const urlBeforeReplay = page.url();
  const seedBeforeReplay = (await snapshot(page)).seed;
  await page
    .getByRole("button", { name: /按原种子再试/ })
    .click();
  expect(page.url()).toBe(urlBeforeReplay);
  expect((await snapshot(page)).seed).toBe(seedBeforeReplay);
  await expect(page.locator(".rc-arena")).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("每日遗迹同日期固定种子，换局无需刷新", async ({ page }) => {
  await page.goto("/?test=1");
  const daily = page.locator('[data-action="daily"]').first();
  const dateKey = await daily.getAttribute("data-date");
  await daily.click();
  expect((await snapshot(page)).seed).toBeDefined();
  const firstSeed = (await snapshot(page)).seed;
  await page.reload();
  await page.locator(`[data-action="daily"][data-date="${dateKey}"]`).click();
  expect((await snapshot(page)).seed).toBe(firstSeed);
});

test("window release completes aim while system cancellation does not fire", async ({
  page,
}) => {
  await page.goto("/?test=1&seed=42&speed=8");
  await page
    .getByRole("button", { name: /进入遗迹/ })
    .click();

  const dragPastArena = async (
    endType: "pointerup" | "pointercancel",
  ) => {
    await page.locator(".rc-arena").evaluate((arena, type) => {
      arena.setPointerCapture = () => undefined;
      const rect = arena.getBoundingClientRect();
      const pointerId = 41;
      const base = {
        bubbles: true,
        isPrimary: true,
        pointerId,
        pointerType: "touch",
      };
      arena.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...base,
          buttons: 1,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height * 0.82,
        }),
      );
      arena.dispatchEvent(
        new PointerEvent("pointermove", {
          ...base,
          buttons: 1,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom + 60,
        }),
      );
      window.dispatchEvent(
        new PointerEvent(type, {
          ...base,
          buttons: 0,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom + 60,
        }),
      );
    }, endType);
  };

  await dragPastArena("pointerup");
  await expect
    .poll(async () => (await snapshot(page)).shotsRemaining)
    .toBe(4);
  await expect.poll(async () => (await snapshot(page)).mode).toBe("aiming");

  await dragPastArena("pointercancel");
  expect((await snapshot(page)).shotsRemaining).toBe(4);
  expect((await snapshot(page)).mode).toBe("aiming");
  await expect(page.locator(".trajectory polyline")).toHaveAttribute(
    "points",
    "",
  );

  await dragPastArena("pointerup");
  await expect.poll(async () => (await snapshot(page)).mode).toBe("flying");
  await expect
    .poll(async () => (await snapshot(page)).shotsRemaining)
    .toBe(3);
});

for (const viewport of [
  { width: 360, height: 800, name: "360x800" },
  { width: 390, height: 844, name: "390x844" },
  { width: 430, height: 932, name: "430x932" },
]) {
  test(`竖屏安全区 ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /进入遗迹/ }),
    ).toBeInViewport();
    await page.screenshot({
      path: `tests/ricochet-crew/e2e/screenshots/home-${viewport.name}.png`,
    });
  });
}

test("主线程动画帧预算可用", async ({ page }) => {
  await page.goto("/");
  const p95 = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const samples: number[] = [];
        let previous = performance.now();
        const frame = (now: number) => {
          samples.push(now - previous);
          previous = now;
          if (samples.length < 90) {
            requestAnimationFrame(frame);
            return;
          }
          const sorted = samples.slice(10).sort((a, b) => a - b);
          resolve(sorted[Math.floor(sorted.length * 0.95)] ?? 999);
        };
        requestAnimationFrame(frame);
      }),
  );
  expect(p95).toBeLessThan(50);
});
