import type {
  BuildTag,
  HeroId,
} from "../game/contracts";

export interface RicochetProgressV1 {
  readonly schemaVersion: 1;
  readonly runCount: number;
  readonly wins: number;
  readonly bestCombo: number;
  readonly unlockedHeroIds: readonly HeroId[];
  readonly unlockedModuleIds: readonly string[];
  readonly cosmeticIds: readonly string[];
}

export function createDefaultProgress(): RicochetProgressV1 {
  return {
    schemaVersion: 1,
    runCount: 0,
    wins: 0,
    bestCombo: 0,
    unlockedHeroIds: ["tuo"],
    unlockedModuleIds: ["bank-plus"],
    cosmeticIds: ["trail:ember"],
  };
}

export function applyRunProgress(
  progress: RicochetProgressV1,
  result: {
    readonly won: boolean;
    readonly heroId: HeroId;
    readonly maxCombo: number;
    readonly buildTags: readonly BuildTag[];
  },
): RicochetProgressV1 {
  const runCount = progress.runCount + 1;
  const heroes = new Set(progress.unlockedHeroIds);
  if (result.won) heroes.add("mio");
  if (progress.wins + (result.won ? 1 : 0) >= 2) {
    heroes.add("nia");
  }
  return {
    ...progress,
    runCount,
    wins: progress.wins + (result.won ? 1 : 0),
    bestCombo: Math.max(
      progress.bestCombo,
      result.maxCombo,
    ),
    unlockedHeroIds: [...heroes],
    unlockedModuleIds: [
      ...new Set([
        ...progress.unlockedModuleIds,
        ...result.buildTags.map(
          (tag) => `module:${tag}`,
        ),
      ]),
    ],
    cosmeticIds:
      runCount >= 3
        ? [
            ...new Set([
              ...progress.cosmeticIds,
              "trail:starlight",
            ]),
          ]
        : progress.cosmeticIds,
  };
}
