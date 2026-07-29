import type { HeroId } from "../domain/types";

export const HERO_ATLAS_URL = "./assets/concept/three-lane-hero-roster-v1.png";

export interface HeroAtlasEntry {
  readonly index: 0 | 1 | 2 | 3 | 4;
  readonly cssX: "0%" | "25%" | "50%" | "75%" | "100%";
  readonly cssY: string;
  readonly sourceYRatio: number;
}

/**
 * The generated roster order is guardian, ranger, mage, priest, engineer.
 * Keep this mapping explicit because the gameplay catalog stores engineer
 * before priest.
 */
export const HERO_ATLAS: Readonly<Record<HeroId, HeroAtlasEntry>> = {
  guardian: { index: 0, cssX: "0%", cssY: "22%", sourceYRatio: 0.08 },
  ranger: { index: 1, cssX: "25%", cssY: "31%", sourceYRatio: 0.18 },
  mage: { index: 2, cssX: "50%", cssY: "25%", sourceYRatio: 0.12 },
  priest: { index: 3, cssX: "75%", cssY: "30%", sourceYRatio: 0.18 },
  engineer: { index: 4, cssX: "100%", cssY: "42%", sourceYRatio: 0.26 },
};
