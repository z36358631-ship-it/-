import { describe, expect, it } from 'vitest';

import {
  PLAYTEST_SEEDS,
  assertBalanceGates,
  runBalanceValidation,
} from '../../simulation/report';

describe('six-lane balance simulation gates', () => {
  const report = runBalanceValidation({
    seeds: PLAYTEST_SEEDS,
    targetingTrials: 10_000,
  });

  it('replays identical seeds and actions byte-identically', () => {
    for (const seed of report.seeds) {
      expect(seed.deterministic, `seed ${seed.seed}`).toBe(true);
    }
    expect(report.targeting.deterministicTrials).toBe(10_000);
    expect(report.targeting.ambiguousTargets).toBe(0);
  });

  it('keeps every playtest seed solvable without a fixed answer', () => {
    for (const seed of report.seeds) {
      expect(seed.solvable, `seed ${seed.seed}`).toBe(true);
      expect(seed.solutions).toHaveLength(2);
      expect(seed.solutions.every((solution) => solution.won)).toBe(true);
      expect(seed.solutionMoveDistance).toBeGreaterThanOrEqual(3);
    }
    expect(report.medianSolutionMoveDistance).toBeGreaterThanOrEqual(4);
  });

  it('proves R1/R2/R3 counterfactual reversal value in every seed', () => {
    for (const seed of report.seeds) {
      for (const tag of ['R1', 'R2', 'R3'] as const) {
        const reversal = seed.reversals[tag];
        expect(reversal.present, `seed ${seed.seed} ${tag}`).toBe(true);
        expect(reversal.correctActionSurvives, `seed ${seed.seed} ${tag}`).toBe(
          true,
        );
        expect(
          reversal.wrongActionLoses || reversal.integrityDelta >= 3,
          `seed ${seed.seed} ${tag}`,
        ).toBe(true);
      }
    }
  });

  it('attributes every point of core damage to one source', () => {
    expect(report.attribution.coreDamageEvents).toBeGreaterThan(0);
    expect(report.attribution.untraceableDamageEvents).toBe(0);
    expect(report.attribution.untraceableRate).toBe(0);
  });

  it('keeps heuristic outcomes inside the agreed strategy bands', () => {
    expect(report.strategies.idle.winRate).toBeLessThan(0.1);
    expect(report.strategies.nearestThreat.winRate).toBeLessThan(0.4);
    expect(report.strategies.matchEnemyType.wins).toBeGreaterThan(0);
    expect(report.strategies.minExpectedLoss.wins).toBeGreaterThan(0);
    expect(report.strongestHeuristicWinRate).toBeGreaterThanOrEqual(0.7);
    expect(report.strongestHeuristicWinRate).toBeLessThanOrEqual(0.9);
    expect(report.maxFailureWaveShare).toBeLessThanOrEqual(0.5);
  });

  it('passes the executable release gate', () => {
    expect(() => assertBalanceGates(report)).not.toThrow();
    expect(report.gates.every((gate) => gate.passed)).toBe(true);
  });
});
