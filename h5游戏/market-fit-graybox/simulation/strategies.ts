import { GUARD_KINDS, LANE_IDS } from '../src/domain/content';
import {
  selectAllGuardMatchups,
  selectAllLaneThreats,
  selectNextWaveThreats,
  selectPhaseLabel,
} from '../src/domain/selectors';
import type {
  EnemyCounts,
  GameState,
  GuardKind,
  LaneId,
  LaneThreat,
} from '../src/domain/types';

export const STRATEGY_NAMES = [
  'idle',
  'nearestThreat',
  'matchEnemyType',
  'minExpectedLoss',
] as const;

export type StrategyName = (typeof STRATEGY_NAMES)[number];

export interface StrategyMove {
  guardId: GuardKind;
  lane: LaneId;
}

interface VisibleGuard {
  guardId: GuardKind;
  lane: LaneId;
}

interface VisibleDecision {
  threats: LaneThreat[];
  guards: VisibleGuard[];
  emptyLanes: LaneId[];
}

function observe(state: GameState): VisibleDecision {
  const current = selectAllLaneThreats(state);
  const nextWave =
    selectPhaseLabel(state) === '救场调防' ? selectNextWaveThreats(state) : [];
  const threats = current.map((threat) => {
    const next = nextWave.find((candidate) => candidate.lane === threat.lane);
    if (!next) return threat;
    const nextWeight = 0.1;
    return {
      ...threat,
      score: threat.score + next.score * nextWeight,
      counts: {
        swarm: threat.counts.swarm + next.counts.swarm * nextWeight,
        speed: threat.counts.speed + next.counts.speed * nextWeight,
        armor: threat.counts.armor + next.counts.armor * nextWeight,
      },
      nextArrivalMs:
        threat.nextArrivalMs ??
        (next.nextArrivalMs === null ? null : next.nextArrivalMs + 24_000),
      expectedCoreDamage:
        threat.expectedCoreDamage + next.expectedCoreDamage * nextWeight,
    };
  });
  const guards = selectAllGuardMatchups(state).map(({ guardId, lane }) => ({
    guardId,
    lane,
  }));
  const occupied = new Set(guards.map((guard) => guard.lane));
  return {
    threats,
    guards,
    emptyLanes: LANE_IDS.filter((lane) => !occupied.has(lane)),
  };
}

function countTotal(counts: EnemyCounts): number {
  return counts.swarm + counts.speed + counts.armor;
}

function affinity(guardId: GuardKind, counts: EnemyCounts): number {
  if (guardId === 'heavy') {
    return counts.armor * 4 + counts.speed * 0.75 + counts.swarm * 0.15;
  }
  if (guardId === 'rapid') {
    return counts.speed * 3 + counts.armor * 1.1 + counts.swarm * 0.8;
  }
  return counts.swarm * 4 + counts.speed * 1.15 + counts.armor * 0.1;
}

function threatAt(view: VisibleDecision, lane: LaneId): LaneThreat {
  const threat = view.threats.find((candidate) => candidate.lane === lane);
  if (!threat) throw new Error(`Missing visible threat for lane ${lane}`);
  return threat;
}

function nearestThreat(view: VisibleDecision): StrategyMove | null {
  const candidates = view.threats
    .filter(
      (threat) =>
        countTotal(threat.counts) > 0 && view.emptyLanes.includes(threat.lane),
    )
    .sort((left, right) => {
      const leftArrival = left.nextArrivalMs ?? Number.POSITIVE_INFINITY;
      const rightArrival = right.nextArrivalMs ?? Number.POSITIVE_INFINITY;
      return leftArrival - rightArrival || right.score - left.score || left.lane - right.lane;
    });
  const destination = candidates[0];
  if (!destination) return null;

  const source = [...view.guards].sort((left, right) => {
    const leftThreat = threatAt(view, left.lane);
    const rightThreat = threatAt(view, right.lane);
    const leftArrival = leftThreat.nextArrivalMs ?? Number.POSITIVE_INFINITY;
    const rightArrival = rightThreat.nextArrivalMs ?? Number.POSITIVE_INFINITY;
    return rightArrival - leftArrival || leftThreat.score - rightThreat.score || left.guardId.localeCompare(right.guardId);
  })[0];

  return source ? { guardId: source.guardId, lane: destination.lane } : null;
}

function bestAffinityGain(view: VisibleDecision): StrategyMove | null {
  let best: { move: StrategyMove; gain: number; destinationScore: number } | null = null;

  for (const guard of view.guards) {
    const current = threatAt(view, guard.lane);
    const currentFit = affinity(guard.guardId, current.counts);
    for (const lane of view.emptyLanes) {
      const destination = threatAt(view, lane);
      if (countTotal(destination.counts) === 0) continue;
      const gain = affinity(guard.guardId, destination.counts) - currentFit;
      const candidate = {
        move: { guardId: guard.guardId, lane },
        gain,
        destinationScore: destination.score,
      };
      if (
        !best ||
        candidate.gain > best.gain ||
        (candidate.gain === best.gain &&
          candidate.destinationScore > best.destinationScore) ||
        (candidate.gain === best.gain &&
          candidate.destinationScore === best.destinationScore &&
          candidate.move.lane < best.move.lane)
      ) {
        best = candidate;
      }
    }
  }

  return best && best.gain > 0 ? best.move : null;
}

function laneResidual(
  threat: LaneThreat,
  assignedGuard: GuardKind | null,
): number {
  const raw =
    threat.score +
    threat.expectedCoreDamage * 5 +
    (threat.nextArrivalMs === null
      ? 0
      : Math.max(0, 8_000 - threat.nextArrivalMs) / 1_000);
  if (!assignedGuard) return raw;
  const prevention = affinity(assignedGuard, threat.counts) * 2.4;
  return Math.max(0, raw - prevention);
}

function globalExpectedLoss(view: VisibleDecision): StrategyMove | null {
  const assignments = new Map<LaneId, GuardKind>();
  for (const guard of view.guards) assignments.set(guard.lane, guard.guardId);

  const scoreAssignment = (next: Map<LaneId, GuardKind>): number =>
    view.threats.reduce(
      (total, threat) =>
        total + laneResidual(threat, next.get(threat.lane) ?? null),
      0,
    );

  const baseline = scoreAssignment(assignments);
  let best: { move: StrategyMove; score: number; destinationFit: number } | null = null;
  for (const guard of view.guards) {
    for (const lane of view.emptyLanes) {
      const next = new Map(assignments);
      next.delete(guard.lane);
      next.set(lane, guard.guardId);
      const score = scoreAssignment(next);
      const destinationFit = affinity(guard.guardId, threatAt(view, lane).counts);
      if (
        !best ||
        score < best.score ||
        (score === best.score && destinationFit > best.destinationFit) ||
        (score === best.score &&
          destinationFit === best.destinationFit &&
          lane < best.move.lane) ||
        (score === best.score &&
          destinationFit === best.destinationFit &&
          lane === best.move.lane &&
          guard.guardId.localeCompare(best.move.guardId) < 0)
      ) {
        best = { move: { guardId: guard.guardId, lane }, score, destinationFit };
      }
    }
  }

  return best && best.score < baseline ? best.move : null;
}

export function chooseStrategyMove(
  strategy: StrategyName,
  state: GameState,
): StrategyMove | null {
  const view = observe(state);
  if (strategy === 'idle') return null;
  if (strategy === 'nearestThreat') return nearestThreat(view);
  if (strategy === 'matchEnemyType') return bestAffinityGain(view);
  return globalExpectedLoss(view);
}

export function enumerateVisibleLegalMoves(state: GameState): StrategyMove[] {
  const view = observe(state);
  return GUARD_KINDS.flatMap((guardId) =>
    view.emptyLanes.map((lane) => ({ guardId, lane })),
  );
}
