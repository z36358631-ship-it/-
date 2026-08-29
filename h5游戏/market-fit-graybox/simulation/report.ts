import type { PuzzleTag } from '../src/domain/types';

import {
  auditAttribution,
  auditSeed,
  auditTargeting,
  runStrategyPool,
  type SeedAudit,
  type StrategyPoolResult,
  type TargetingAudit,
} from './search';

export const PLAYTEST_SEEDS = [
  7300, 7301, 7302, 7303, 7304, 7305, 7306, 7307, 7308, 7309, 7310, 7311,
] as const;

export interface GateResult {
  id: string;
  passed: boolean;
  actual: number | string;
  expected: string;
}

export interface BalanceReport {
  generatedAt: string;
  seeds: SeedAudit[];
  strategies: Record<StrategyPoolResult['strategy'], StrategyPoolResult>;
  targeting: TargetingAudit;
  attribution: ReturnType<typeof auditAttribution>;
  medianSolutionMoveDistance: number;
  strongestHeuristicWinRate: number;
  maxFailureWaveShare: number;
  gates: GateResult[];
}

export interface ValidationOptions {
  seeds: readonly number[];
  targetingTrials?: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function gate(
  id: string,
  passed: boolean,
  actual: number | string,
  expected: string,
): GateResult {
  return { id, passed, actual, expected };
}

export function runBalanceValidation(options: ValidationOptions): BalanceReport {
  const seeds = options.seeds.map((seed) => auditSeed(seed));
  const strategyResults = runStrategyPool(options.seeds);
  const strategies = Object.fromEntries(
    strategyResults.map((result) => [result.strategy, result]),
  ) as BalanceReport['strategies'];
  const targeting = auditTargeting(options.targetingTrials ?? 10_000);
  const attribution = auditAttribution([...seeds, ...strategyResults]);
  const medianSolutionMoveDistance = median(
    seeds.map((seed) => seed.solutionMoveDistance),
  );
  const strongestHeuristicWinRate = Math.max(
    strategies.matchEnemyType.winRate,
    strategies.minExpectedLoss.winRate,
  );
  const failureWaves = strategyResults.flatMap((strategy) =>
    Object.entries(strategy.failureWaves).map(([wave, count]) => ({
      wave: Number(wave),
      count,
    })),
  );
  const totalFailures = failureWaves.reduce((sum, entry) => sum + entry.count, 0);
  const failuresByWave = new Map<number, number>();
  for (const entry of failureWaves) {
    failuresByWave.set(
      entry.wave,
      (failuresByWave.get(entry.wave) ?? 0) + entry.count,
    );
  }
  const maxFailureWaveShare =
    totalFailures === 0
      ? 0
      : Math.max(...failuresByWave.values()) / totalFailures;

  const requiredTags: PuzzleTag[] = ['R1', 'R2', 'R3'];
  const allSeedsDeterministic = seeds.every((seed) => seed.deterministic);
  const allSeedsHaveTwoSolutions = seeds.every(
    (seed) =>
      seed.solvable &&
      seed.solutions.length >= 2 &&
      seed.solutions.every((solution) => solution.won) &&
      seed.solutionMoveDistance >= 3,
  );
  const allReversalsPass = seeds.every((seed) =>
    requiredTags.every((tag) => {
      const reversal = seed.reversals[tag];
      return (
        reversal.present &&
        reversal.correctActionSurvives &&
        (reversal.wrongActionLoses || reversal.integrityDelta >= 3)
      );
    }),
  );

  const gates = [
    gate(
      'determinism',
      allSeedsDeterministic && targeting.ambiguousTargets === 0,
      `${seeds.filter((seed) => seed.deterministic).length}/${seeds.length}; ${targeting.ambiguousTargets} ambiguous`,
      'all seeds deterministic and 0 ambiguous targets',
    ),
    gate(
      'two-solutions-per-seed',
      allSeedsHaveTwoSolutions,
      `${seeds.filter((seed) => seed.solutions.length >= 2).length}/${seeds.length}`,
      'all seeds have 2 wins with move distance >= 3',
    ),
    gate(
      'median-solution-distance',
      medianSolutionMoveDistance >= 4,
      medianSolutionMoveDistance,
      '>= 4',
    ),
    gate(
      'reversal-puzzles',
      allReversalsPass,
      `${seeds.filter((seed) => requiredTags.every((tag) => seed.reversals[tag].present)).length}/${seeds.length}`,
      'R1/R2/R3 pass in every seed',
    ),
    gate(
      'damage-attribution',
      attribution.untraceableDamageEvents === 0,
      attribution.untraceableDamageEvents,
      '0 untraceable core-damage events',
    ),
    gate(
      'idle-strategy',
      strategies.idle.winRate < 0.1,
      strategies.idle.winRate,
      '< 0.10',
    ),
    gate(
      'nearest-threat-strategy',
      strategies.nearestThreat.winRate < 0.4,
      strategies.nearestThreat.winRate,
      '< 0.40',
    ),
    gate(
      'heuristic-strategies-can-win',
      strategies.matchEnemyType.wins > 0 && strategies.minExpectedLoss.wins > 0,
      `${strategies.matchEnemyType.wins}/${strategies.minExpectedLoss.wins}`,
      'both strategies win at least one seed',
    ),
    gate(
      'strongest-heuristic-band',
      strongestHeuristicWinRate >= 0.7 && strongestHeuristicWinRate <= 0.9,
      strongestHeuristicWinRate,
      '0.70..0.90',
    ),
    gate(
      'failure-wave-concentration',
      maxFailureWaveShare <= 0.5,
      maxFailureWaveShare,
      '<= 0.50',
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    seeds,
    strategies,
    targeting,
    attribution,
    medianSolutionMoveDistance,
    strongestHeuristicWinRate,
    maxFailureWaveShare,
    gates,
  };
}

export function assertBalanceGates(report: BalanceReport): void {
  const failed = report.gates.filter((entry) => !entry.passed);
  if (failed.length > 0) {
    const detail = failed
      .map(
        (entry) =>
          `${entry.id}: actual=${String(entry.actual)}, expected=${entry.expected}`,
      )
      .join('\n');
    throw new Error(`Balance gates failed:\n${detail}`);
  }
}

export function formatBalanceReport(report: BalanceReport): string {
  const gateLines = report.gates
    .map(
      (entry) =>
        `| ${entry.id} | ${entry.passed ? '通过' : '失败'} | ${String(entry.actual)} | ${entry.expected} |`,
    )
    .join('\n');
  const strategyLines = Object.values(report.strategies)
    .map(
      (entry) =>
        `| ${entry.strategy} | ${entry.wins}/${entry.runs} | ${(entry.winRate * 100).toFixed(2)}% | ${JSON.stringify(entry.failureWaves)} |`,
    )
    .join('\n');
  const seedLines = report.seeds
    .map(
      (entry) =>
        `| ${entry.seed} | ${entry.solvable ? '是' : '否'} | ${entry.solutions.length} | ${entry.solutionMoveDistance} | ${entry.finalIntegrities.join(', ')} |`,
    )
    .join('\n');

  return `# 六向环阵调防数值报告\n\n- 内容版本：v0.1\n- 生成时间：${report.generatedAt}\n- 试玩种子：${report.seeds.length}\n- 索敌确定性采样：${report.targeting.deterministicTrials}\n\n## 门禁\n\n| 门禁 | 结果 | 实际 | 要求 |\n|---|---|---:|---|\n${gateLines}\n\n## 策略结果\n\n| 策略 | 胜场 | 胜率 | 失败波次 |\n|---|---:|---:|---|\n${strategyLines}\n\n## 种子可解性\n\n| Seed | 可解 | 通关序列 | 序列差异 | 结束完整度 |\n|---:|---|---:|---:|---|\n${seedLines}\n\n## 归因\n\n- 核心受损事件：${report.attribution.coreDamageEvents}\n- 不可追溯受损：${report.attribution.untraceableDamageEvents}\n- 不可归因率：${(report.attribution.untraceableRate * 100).toFixed(2)}%\n`;
}
