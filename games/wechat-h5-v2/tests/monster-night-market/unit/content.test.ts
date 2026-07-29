import { describe, expect, it } from "vitest";
import {
  CUSTOMERS,
  INGREDIENTS,
  RECIPES,
  STALLS,
  UPGRADES,
} from "../../../apps/monster-night-market/src/content/catalog";

describe("怪兽夜市首版内容", () => {
  it("交付 8 食材、12 配方、8 顾客、3 摊位、12 改造", () => {
    expect(INGREDIENTS).toHaveLength(8);
    expect(RECIPES).toHaveLength(12);
    expect(CUSTOMERS).toHaveLength(8);
    expect(STALLS).toHaveLength(3);
    expect(UPGRADES).toHaveLength(12);
  });

  it("每类 ID 唯一且配方通过摆法签名形成真实差异", () => {
    const expectUnique = (items: readonly { id: string }[]) => {
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    };
    expectUnique(INGREDIENTS);
    expectUnique(RECIPES);
    expectUnique(CUSTOMERS);
    expectUnique(STALLS);
    expectUnique(UPGRADES);

    const signatures = RECIPES.map(
      (recipe) =>
        `${recipe.ingredients.join(">")}:${recipe.arrangement}:${recipe.stall}`,
    );
    expect(new Set(signatures).size).toBe(RECIPES.length);
    expect(RECIPES.every((recipe) => recipe.ingredients.length >= 2)).toBe(
      true,
    );
  });
});
