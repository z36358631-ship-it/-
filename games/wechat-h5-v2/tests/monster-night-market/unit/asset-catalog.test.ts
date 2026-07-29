import { describe, expect, it } from "vitest";
import {
  NIGHT_MARKET_ASSET_CATALOG,
  requiredRuntimeAssetIds,
} from "../../../apps/monster-night-market/src/content/asset-catalog";

describe("怪兽夜市资产目录", () => {
  it("首屏原画有唯一 ID，且预算不超过 5MB", () => {
    const ids =
      NIGHT_MARKET_ASSET_CATALOG.assets.map(
        (asset) => asset.id,
      );
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      requiredRuntimeAssetIds.every((id) =>
        ids.includes(id),
      ),
    ).toBe(true);
    expect(
      NIGHT_MARKET_ASSET_CATALOG.groups.find(
        (group) => group.id === "boot",
      )?.budgetBytes,
    ).toBe(5 * 1024 * 1024);
  });
});
