import type { BattleState, GridPosition, HeroId, RunVariant } from "./types";

const VARIANTS = ["balanced-front", "lockdown", "elite-rush"] as const;

export const standardVariantForRun = (runOrdinal: number): RunVariant =>
  VARIANTS[((runOrdinal % VARIANTS.length) + VARIANTS.length) % VARIANTS.length]!;

export const variantForSeed = (seed: number): RunVariant =>
  VARIANTS[(seed >>> 0) % VARIANTS.length]!;

export function createBattle(input: {
  seed: number;
  runId: string;
  runOrdinal: number;
  squad: readonly HeroId[];
  mode: "standard" | "daily";
  recovery?: boolean;
}): BattleState {
  if (input.squad.length !== 5 || new Set(input.squad).size !== 5) {
    throw new Error("SQUAD_MUST_HAVE_FIVE_DISTINCT_HEROES");
  }
  const grid = ([0, 1, 2] as const).flatMap((lane) =>
    ([0, 1, 2, 3] as const).map((column) => ({
      position: { lane, column } satisfies GridPosition,
      heroInstanceId: null,
    })),
  );
  return {
    seed: input.seed >>> 0,
    runId: input.runId,
    runOrdinal: input.runOrdinal,
    squad: [...input.squad],
    variant: input.mode === "daily" ? variantForSeed(input.seed) : standardVariantForRun(input.runOrdinal),
    mode: "preparing",
    elapsedMs: 0,
    tickRemainderMs: 0,
    energy: 12,
    baseHealth: input.recovery ? 4 : 3,
    baseMaxHealth: input.recovery ? 4 : 3,
    grid,
    heroes: [],
    enemies: [],
    focusFire: { targetId: null, readyAtMs: 0, expiresAtMs: 0 },
    laneLock: null,
    boss: {
      phase: "absent",
      instanceId: null,
      lane: 1,
      health: 2200,
      maxHealth: 2200,
      phaseEndsAtMs: 0,
      chargeEndsAtMs: null,
      chargeDamage: 0,
      interrupted: false,
    },
    waveSpawnCursor: 0,
    appliedLaneLockCount: 0,
    events: [],
    nextEntitySeq: 1,
    nextEventSeq: 1,
    lastMeaningfulActionAtMs: 0,
    meaningfulActionCount: 0,
    longestDecisionGapMs: 0,
    formationTag: "unclassified",
    failureLane: null,
  };
}
