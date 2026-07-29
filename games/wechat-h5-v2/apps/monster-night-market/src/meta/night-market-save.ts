import type {
  CustomerId,
  RecipeId,
  StallId,
} from "../domain/types";

export interface NearMiss {
  readonly orderId: string;
  readonly missingRecipeId: RecipeId;
  readonly distance: number;
}

export type ChefTalentId =
  | "previewPlus"
  | "queueChoice"
  | "starterReroll";

export interface DailyRecord {
  readonly score: number;
  readonly completed: boolean;
}

export interface NightMarketSaveV1 {
  readonly schemaVersion: 1;
  readonly runCount: number;
  readonly bestScore: number;
  readonly unlockedStallIds: readonly StallId[];
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly customerCodexIds: readonly CustomerId[];
  readonly chefTalentIds: readonly ChefTalentId[];
  readonly cosmeticIds: readonly string[];
  readonly lastRunSeed: string | null;
  readonly lastRunNearMisses: readonly NearMiss[];
  readonly dailyRecords: Readonly<
    Record<string, DailyRecord>
  >;
}

export interface RunSummary {
  readonly seed: string;
  readonly score: number;
  readonly completedRecipeIds: readonly RecipeId[];
  readonly metCustomerIds: readonly CustomerId[];
  readonly nearMisses: readonly NearMiss[];
}

const unique = <T>(values: readonly T[]): T[] => [
  ...new Set(values),
];

export function createDefaultSave(): NightMarketSaveV1 {
  return {
    schemaVersion: 1,
    runCount: 0,
    bestScore: 0,
    unlockedStallIds: ["grill"],
    unlockedRecipeIds: [
      "emberTofu",
      "mushroomSkewer",
    ],
    customerCodexIds: [],
    chefTalentIds: [],
    cosmeticIds: ["stall:lantern-red"],
    lastRunSeed: null,
    lastRunNearMisses: [],
    dailyRecords: {},
  };
}

function unlockSidegrades(
  save: NightMarketSaveV1,
  runCount: number,
): Pick<
  NightMarketSaveV1,
  "unlockedStallIds" | "chefTalentIds" | "cosmeticIds"
> {
  const stalls = [...save.unlockedStallIds];
  const talents = [...save.chefTalentIds];
  const cosmetics = [...save.cosmeticIds];

  if (runCount >= 2) {
    stalls.push("dessert");
  }
  if (runCount >= 3) {
    talents.push("queueChoice");
  }
  if (runCount >= 4) {
    stalls.push("hotpot");
  }
  if (runCount >= 5) {
    talents.push("previewPlus");
  }
  if (runCount >= 6) {
    talents.push("starterReroll");
    cosmetics.push("stall:moonlight-blue");
  }

  return {
    unlockedStallIds: unique(stalls),
    chefTalentIds: unique(talents),
    cosmeticIds: unique(cosmetics),
  };
}

export function applyRunSummary(
  save: NightMarketSaveV1,
  summary: RunSummary,
): NightMarketSaveV1 {
  const runCount = save.runCount + 1;
  const sidegrades = unlockSidegrades(save, runCount);

  return {
    ...save,
    ...sidegrades,
    runCount,
    bestScore: Math.max(save.bestScore, summary.score),
    unlockedRecipeIds: unique([
      ...save.unlockedRecipeIds,
      ...summary.completedRecipeIds,
    ]),
    customerCodexIds: unique([
      ...save.customerCodexIds,
      ...summary.metCustomerIds,
    ]),
    lastRunSeed: summary.seed,
    lastRunNearMisses: [...summary.nearMisses]
      .sort(
        (left, right) =>
          left.distance - right.distance ||
          left.orderId.localeCompare(right.orderId),
      )
      .slice(0, 3),
  };
}

export function migrateNightMarketSave(
  fromVersion: number,
  payload: unknown,
): NightMarketSaveV1 {
  if (fromVersion === 1) {
    return payload as NightMarketSaveV1;
  }
  if (fromVersion !== 0) {
    throw new Error(
      `Unsupported night market save version ${fromVersion}`,
    );
  }

  const legacy = payload as {
    readonly recipes?: readonly RecipeId[];
  };
  const defaults = createDefaultSave();
  return {
    ...defaults,
    unlockedRecipeIds: unique([
      ...defaults.unlockedRecipeIds,
      ...(Array.isArray(legacy?.recipes)
        ? legacy.recipes
        : []),
    ]),
  };
}
