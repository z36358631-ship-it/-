import { expect, test } from "@playwright/test";

for (const gameId of [
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const) {
  test(`${gameId} keeps its loaded mobile scene within the 33ms frame tier`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const frames: number[] = [];
      let previous = 0;
      const sample = (now: number) => {
        if (previous > 0) frames.push(now - previous);
        previous = now;
        requestAnimationFrame(sample);
      };
      (window as Window & { __FRAME_SAMPLES__?: number[] })
        .__FRAME_SAMPLES__ = frames;
      requestAnimationFrame(sample);
    });
    await page.goto(`/${gameId}/?test=1&seed=31`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2_000);
    const result = await page.evaluate(() => {
      const frames = (
        window as Window & { __FRAME_SAMPLES__?: number[] }
      ).__FRAME_SAMPLES__ ?? [];
      const stable = frames.filter((value) => value <= 250).sort((a, b) => a - b);
      const p95 = stable[Math.max(0, Math.ceil(stable.length * 0.95) - 1)] ?? 0;
      return { samples: stable.length, p95 };
    });
    expect(result.samples).toBeGreaterThan(60);
    expect(result.p95).toBeLessThanOrEqual(33);
    expect(errors).toEqual([]);
  });
}
