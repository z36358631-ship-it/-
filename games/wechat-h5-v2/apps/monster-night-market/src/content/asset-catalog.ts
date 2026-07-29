export const NIGHT_MARKET_ASSET_CATALOG = {
  maxAtlasEdge: 2048,
  groups: [
    {
      id: "boot",
      budgetBytes: 5 * 1024 * 1024,
    },
    {
      id: "run",
      budgetBytes: 12 * 1024 * 1024,
    },
  ],
  assets: [
    {
      id: "concept.keyart",
      type: "texture",
      path: "./assets/concept/market-keyart-v1.png",
      groupId: "boot",
    },
  ],
} as const;

export const requiredRuntimeAssetIds = [
  "concept.keyart",
] as const;
