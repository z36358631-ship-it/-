import { describe, expect, it } from "vitest";
import { RECIPES } from "../../../apps/monster-night-market/src/content/catalog";
import { findShortestPlan } from "../../../apps/monster-night-market/src/domain/solver";
import {
  FIRST_ORDER,
  FIRST_ORDER_BOARD,
  RUN_PHASES,
  phaseAt,
  tutorialHint,
} from "../../../apps/monster-night-market/src/domain/tutorial";

describe("怪兽夜市首单教学", () => {
  it("首单在一次预演右滑后可完成", () => {
    const recipe = RECIPES.find((item) => item.id === "emberTofu");
    expect(recipe).toBeDefined();
    expect(findShortestPlan(FIRST_ORDER_BOARD, recipe!, 1)).toEqual([
      { axis: "row", index: 0, direction: "right" },
    ]);
    expect(FIRST_ORDER.recipeIds).toEqual(["emberTofu"]);
  });

  it("五秒前不提示，五秒后只高亮行列不泄露方向", () => {
    expect(tutorialHint(4_999)).toBeNull();
    expect(tutorialHint(5_000)).toEqual({ axis: "row", index: 0 });
  });

  it("六阶段连续覆盖 0–300 秒", () => {
    expect(RUN_PHASES.map((phase) => [phase.startMs, phase.endMs])).toEqual([
      [0, 20_000],
      [20_000, 60_000],
      [60_000, 120_000],
      [120_000, 180_000],
      [180_000, 240_000],
      [240_000, 300_000],
    ]);
    expect(phaseAt(19_999).id).toBe("first-order");
    expect(phaseAt(240_000).id).toBe("glutton-finale");
  });
});
