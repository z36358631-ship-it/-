import { describe, expect, it } from "vitest";
import {
  applyRunSummary,
  createDefaultSave,
  migrateNightMarketSave,
} from "../../../apps/monster-night-market/src/meta/night-market-save";

describe("NightMarketSave", () => {
  it("只解锁玩法选择、图鉴与外观，不保存永久数值强度", () => {
    const next = applyRunSummary(createDefaultSave(), {
      seed: "run-001",
      score: 900,
      completedRecipeIds: ["emberTofu", "fishBroth"],
      metCustomerIds: ["fireCub", "riverImp"],
      nearMisses: [
        { orderId: "a", missingRecipeId: "lotusIce", distance: 1 },
        { orderId: "b", missingRecipeId: "sharedHotpot", distance: 1 },
        { orderId: "c", missingRecipeId: "doubleSkewer", distance: 1 },
        { orderId: "d", missingRecipeId: "vipTwinDish", distance: 2 },
      ],
    });

    expect(next.unlockedRecipeIds).toEqual(
      expect.arrayContaining(["emberTofu", "fishBroth"]),
    );
    expect(next.customerCodexIds).toEqual(
      expect.arrayContaining(["fireCub", "riverImp"]),
    );
    expect(next.lastRunNearMisses).toHaveLength(3);
    expect(next.bestScore).toBe(900);
    expect(JSON.stringify(next)).not.toMatch(
      /attack|power|multiplier|damage/i,
    );
  });

  it("重复结算仍保持集合唯一且最好成绩不会倒退", () => {
    const first = applyRunSummary(createDefaultSave(), {
      seed: "run-001",
      score: 900,
      completedRecipeIds: ["emberTofu"],
      metCustomerIds: ["fireCub"],
      nearMisses: [],
    });
    const second = applyRunSummary(first, {
      seed: "run-002",
      score: 600,
      completedRecipeIds: ["emberTofu"],
      metCustomerIds: ["fireCub"],
      nearMisses: [],
    });

    expect(second.runCount).toBe(2);
    expect(second.bestScore).toBe(900);
    expect(
      second.unlockedRecipeIds.filter(
        (recipeId) => recipeId === "emberTofu",
      ),
    ).toHaveLength(1);
  });

  it("将 v0 数组存档确定性迁移到 v1", () => {
    const migrated = migrateNightMarketSave(0, {
      recipes: ["fishBroth", "emberTofu", "fishBroth"],
    });

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.unlockedRecipeIds).toEqual([
      "emberTofu",
      "mushroomSkewer",
      "fishBroth",
    ]);
  });
});
