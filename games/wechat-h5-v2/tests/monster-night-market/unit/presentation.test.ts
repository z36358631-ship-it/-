import { describe, expect, it } from "vitest";
import {
  buildAnimationTimeline,
  computeNightMarketLayout,
} from "../../../apps/monster-night-market/src/presentation/presentation-rules";

describe("怪兽夜市表现规则", () => {
  it("双单三连灶按位移、出餐、顾客、庆典顺序反馈", () => {
    expect(
      buildAnimationTimeline({
        completedOrders: 2,
        festivalTriggered: true,
        reducedMotion: false,
      }),
    ).toEqual([
      { id: "shift", durationMs: 160 },
      { id: "snap", durationMs: 80 },
      { id: "serve", durationMs: 220 },
      { id: "customer", durationMs: 240 },
      { id: "festival", durationMs: 380 },
    ]);
  });

  it.each([
    [360, 800],
    [390, 844],
    [430, 932],
  ])("%ix%i 下棋盘与操作区均留在安全区内", (width, height) => {
    const layout = computeNightMarketLayout(width, height);
    expect(layout.board.x).toBeGreaterThanOrEqual(12);
    expect(layout.board.x + layout.board.size).toBeLessThanOrEqual(
      width - 12,
    );
    expect(layout.board.y + layout.board.size).toBeLessThan(
      layout.actionBar.y,
    );
    expect(
      layout.actionBar.y + layout.actionBar.height,
    ).toBeLessThanOrEqual(height);
  });
});
