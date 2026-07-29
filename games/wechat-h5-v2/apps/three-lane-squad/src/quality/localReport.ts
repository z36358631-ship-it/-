import { evaluateRunQuality, evaluateThreeRunVariety } from "../domain/antiIdle";
import type { FormationTag, RunVariant } from "../domain/types";

export interface LocalRunReport {
  runId: string;
  variant: RunVariant;
  result: "won" | "lost";
  elapsedMs: number;
  meaningfulActionCount: number;
  longestDecisionGapMs: number;
  formationTag: FormationTag;
  actionsPerMinute: number;
  decisionGatePassed: boolean;
}

export function buildLocalRunReport(
  input: Omit<LocalRunReport, "actionsPerMinute" | "decisionGatePassed">,
): LocalRunReport {
  const quality = evaluateRunQuality(input);
  return { ...input, actionsPerMinute: quality.actionsPerMinute, decisionGatePassed: quality.passed };
}

export function buildThreeRunReport(runs: readonly LocalRunReport[]) {
  const variety = evaluateThreeRunVariety(runs.map(({ formationTag }) => formationTag));
  const uniqueVariants = new Set(runs.map(({ variant }) => variant)).size;
  return {
    passed: runs.length === 3 && uniqueVariants === 3 && variety.passed && runs.every(({ decisionGatePassed }) => decisionGatePassed),
    totalRuns: runs.length,
    uniqueVariants,
    uniqueFormations: variety.uniqueFormationCount,
  };
}
