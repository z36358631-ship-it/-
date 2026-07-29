import { describe, expect, it, vi } from "vitest";
import {
  BlindSlideTracker,
  compareBlindSlideRate,
} from "../../../apps/monster-night-market/src/quality/blind-slide";

describe("BlindSlideTracker", () => {
  it("把快速、无有效预演、紧接动画结束且未成单的操作判为盲滑", () => {
    const emit = vi.fn();
    const tracker = new BlindSlideTracker({ emit });
    tracker.markSettled(1_000);
    tracker.markPreview(1_200, []);
    const result = tracker.commit(1_280, {
      action: {
        axis: "row",
        index: 0,
        direction: "left",
      },
      completedOrderIds: [],
      completedRecipeIds: [],
      chain: 0,
      stallId: "grill",
    });

    expect(result.blindSlide).toBe(true);
    expect(emit).toHaveBeenCalledWith(
      "choice_selected",
      expect.objectContaining({
        blindSlide: true,
        previewDurationMs: 80,
        waitAfterSettledMs: 280,
      }),
    );
  });

  it("有明确成单预演或停顿规划时不判盲滑", () => {
    const tracker = new BlindSlideTracker({
      emit: vi.fn(),
    });
    tracker.markSettled(1_000);
    tracker.markPreview(1_100, ["order-a"]);

    expect(
      tracker.commit(1_180, {
        action: {
          axis: "column",
          index: 2,
          direction: "down",
        },
        completedOrderIds: ["order-a"],
        completedRecipeIds: ["fishBroth"],
        chain: 1,
        stallId: "hotpot",
      }).blindSlide,
    ).toBe(false);

    tracker.markSettled(2_000);
    tracker.markPreview(2_100, []);
    expect(
      tracker.commit(2_900, {
        action: {
          axis: "row",
          index: 1,
          direction: "right",
        },
        completedOrderIds: [],
        completedRecipeIds: [],
        chain: 0,
        stallId: "dessert",
      }).blindSlide,
    ).toBe(false);
  });

  it("第三局盲滑率低于第一局才算策略理解提升", () => {
    expect(
      compareBlindSlideRate([
        { runOrdinal: 1, committed: 10, blind: 5 },
        { runOrdinal: 3, committed: 10, blind: 3 },
      ]),
    ).toEqual({
      firstRate: 0.5,
      thirdRate: 0.3,
      improved: true,
    });
    expect(
      compareBlindSlideRate([
        { runOrdinal: 1, committed: 10, blind: 2 },
        { runOrdinal: 3, committed: 10, blind: 2 },
      ]).improved,
    ).toBe(false);
  });
});
