import { describe, expect, it } from "vitest";
import { createBoard } from "../../../apps/monster-night-market/src/domain/board";
import {
  assertReachable,
  findShortestPlan,
} from "../../../apps/monster-night-market/src/domain/solver";
import type { RecipeDefinition } from "../../../apps/monster-night-market/src/domain/types";

const emberTofu: RecipeDefinition = {
  id: "emberTofu",
  label: "火纹豆腐",
  ingredients: ["tofu", "chili"],
  arrangement: "ordered",
  stall: "grill",
};

describe("怪兽夜市盘面求解器", () => {
  it("为首单找到确定性的一步解", () => {
    const board = createBoard([
      ["chili", "mushroom", "lotus", "tofu"],
      ["fish", "riceCake", "ice", "broth"],
      ["mushroom", "lotus", "fish", "riceCake"],
      ["ice", "broth", "tofu", "mushroom"],
    ]);

    expect(findShortestPlan(board, emberTofu, 1)).toEqual([
      { axis: "row", index: 0, direction: "right" },
    ]);
  });

  it("深度不足时返回 null，同一输入始终返回同一路径", () => {
    const board = createBoard([
      ["chili", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "mushroom"],
      ["lotus", "fish", "riceCake", "ice"],
      ["broth", "mushroom", "lotus", "tofu"],
    ]);

    expect(findShortestPlan(board, emberTofu, 0)).toBeNull();
    expect(findShortestPlan(board, emberTofu, 4)).toEqual(
      findShortestPlan(board, emberTofu, 4),
    );
  });

  it("无法在门限内成单时拒绝生成盘面", () => {
    const board = createBoard([
      ["mushroom", "lotus", "fish", "riceCake"],
      ["riceCake", "ice", "broth", "mushroom"],
      ["lotus", "fish", "riceCake", "ice"],
      ["broth", "mushroom", "lotus", "fish"],
    ]);
    expect(() => assertReachable(board, emberTofu, 4)).toThrow(
      "cannot reach recipe emberTofu",
    );
  });
});
