import type { BattleState, FormationTag } from "./types";

export function classifyFormation(state: BattleState): FormationTag {
  const focusCount = state.events.filter(({ type }) => type === "focus_fire").length;
  const transferCount = state.events.filter(({ type }) => type === "transfer").length;
  if (focusCount >= 3) return "focus-kill";
  if (transferCount >= 2) return "mobile-reserve";
  const occupiedLanes = new Set(
    state.heroes.filter(({ status }) => status !== "defeated").map(({ position }) => position.lane),
  );
  return occupiedLanes.size === 3 ? "balanced" : "unclassified";
}

export function evaluateRunQuality(input: {
  elapsedMs: number;
  meaningfulActionCount: number;
  longestDecisionGapMs: number;
}): { passed: boolean; actionsPerMinute: number; longestDecisionGapMs: number } {
  const actionsPerMinute =
    input.elapsedMs <= 0
      ? 0
      : Number((input.meaningfulActionCount / (input.elapsedMs / 60_000)).toFixed(2));
  return {
    passed: actionsPerMinute >= 5 && input.longestDecisionGapMs <= 20_000,
    actionsPerMinute,
    longestDecisionGapMs: input.longestDecisionGapMs,
  };
}

export function evaluateThreeRunVariety(tags: readonly FormationTag[]): {
  passed: boolean;
  uniqueFormationCount: number;
} {
  const uniqueFormationCount = new Set(tags.filter((tag) => tag !== "unclassified")).size;
  return { passed: tags.length === 3 && uniqueFormationCount >= 2, uniqueFormationCount };
}
