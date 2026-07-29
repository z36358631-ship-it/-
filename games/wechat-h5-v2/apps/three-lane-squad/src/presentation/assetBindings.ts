export const REQUIRED_ASSET_KEYS = [
  "three-lane-keyart-v1",
  "three-lane-hero-roster-v1",
  "cover-art-fallback",
] as const;
export type ThreeLaneAssetKey = (typeof REQUIRED_ASSET_KEYS)[number];
