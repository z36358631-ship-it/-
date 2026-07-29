import { describe, expect, it } from "vitest";
import {
  applyRunSummary,
  createDefaultSave,
  migrateNightMarketSave,
} from "../../../apps/monster-night-market/src/meta/night-market-save";

describe("night market save round trip", () => {
  it("可 JSON 往返并保留规则侧移成长", () => {
    const settled = applyRunSummary(createDefaultSave(), {
      seed: "round-trip",
      score: 1200,
      completedRecipeIds: ["fishBroth"],
      metCustomerIds: ["riverImp"],
      nearMisses: [
        {
          orderId: "near-1",
          missingRecipeId: "lotusIce",
          distance: 1,
        },
      ],
    });
    const loaded = migrateNightMarketSave(
      1,
      JSON.parse(JSON.stringify(settled)),
    );

    expect(loaded).toEqual(settled);
    expect(loaded.lastRunSeed).toBe("round-trip");
  });
});
