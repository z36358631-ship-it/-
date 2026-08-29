import { GUARD_KINDS, LANE_IDS } from './content';
import type {
  EnemyCounts,
  EnemyKind,
  FinalCause,
  GameState,
  GuardKind,
  GuardMatchup,
  LaneId,
  LaneThreat,
  Phase,
} from './types';

function emptyCounts(): EnemyCounts {
  return { swarm: 0, speed: 0, armor: 0 };
}

function currentEnemyArrival(state: GameState, lane: LaneId): number | null {
  const arrivals = state.enemies
    .filter((enemy) => enemy.lane === lane)
    .map((enemy) => {
      const spec = state.content.enemySpecs[enemy.kind];
      return Math.max(0, enemy.distance * spec.moveIntervalMs - enemy.moveAccumulatorMs);
    });
  return arrivals.length > 0 ? Math.min(...arrivals) : null;
}

function previewEnemyArrival(state: GameState, lane: LaneId): number | null {
  const preview = state.previews.find((candidate) => candidate.lane === lane);
  if (!preview || preview.nextSpawnInMs === null) return null;
  const possibleKinds = (Object.keys(preview.counts) as EnemyKind[]).filter(
    (kind) => preview.counts[kind] > 0,
  );
  if (possibleKinds.length === 0) return null;
  const fastestTravel = Math.min(
    ...possibleKinds.map((kind) => state.content.enemySpecs[kind].moveIntervalMs * state.content.laneLength),
  );
  return preview.nextSpawnInMs + fastestTravel;
}

export function selectNextArrival(state: GameState, lane: LaneId): number | null {
  const values = [currentEnemyArrival(state, lane), previewEnemyArrival(state, lane)].filter(
    (value): value is number => value !== null,
  );
  return values.length > 0 ? Math.min(...values) : null;
}

export function selectLaneThreat(state: GameState, lane: LaneId): LaneThreat {
  const enemies = state.enemies.filter((enemy) => enemy.lane === lane);
  const counts = enemies.reduce<EnemyCounts>((result, enemy) => {
    result[enemy.kind] += 1;
    return result;
  }, emptyCounts());
  const preview = state.previews.find((candidate) => candidate.lane === lane);
  if (preview) {
    counts.swarm += preview.counts.swarm;
    counts.speed += preview.counts.speed;
    counts.armor += preview.counts.armor;
  }
  const expectedCoreDamage = enemies.reduce(
    (total, enemy) => total + state.content.enemySpecs[enemy.kind].coreDamage,
    0,
  );
  const previewWeight = counts.swarm + counts.speed * 1.5 + counts.armor * 2.5;
  const proximityWeight = enemies.reduce(
    (total, enemy) => total + (state.content.laneLength - enemy.distance + 1),
    0,
  );

  return {
    lane,
    score: expectedCoreDamage * 3 + proximityWeight + previewWeight,
    enemyCount: enemies.length,
    counts,
    nearestDistance:
      enemies.length > 0 ? Math.min(...enemies.map((enemy) => enemy.distance)) : null,
    nextArrivalMs: selectNextArrival(state, lane),
    expectedCoreDamage,
  };
}

export function selectAllLaneThreats(state: GameState): LaneThreat[] {
  return LANE_IDS.map((lane) => selectLaneThreat(state, lane));
}

export function selectNextWaveThreats(state: GameState): LaneThreat[] {
  if (state.wave >= 12 || state.phase === 'won' || state.phase === 'lost') return [];
  const nextWave = state.content.waves.find((wave) => wave.wave === state.wave + 1);
  const spawns = (nextWave?.spawns ?? []).filter((spawn) => spawn.phase === 'combatA');

  return LANE_IDS.map((lane) => {
    const laneSpawns = spawns.filter((spawn) => spawn.lane === lane);
    const counts = laneSpawns.reduce<EnemyCounts>((result, spawn) => {
      result[spawn.kind] += 1;
      return result;
    }, emptyCounts());
    const expectedCoreDamage = laneSpawns.reduce(
      (total, spawn) => total + state.content.enemySpecs[spawn.kind].coreDamage,
      0,
    );
    const nextArrivalMs = laneSpawns.length
      ? Math.min(
          ...laneSpawns.map(
            (spawn) =>
              spawn.atMs +
              state.content.laneLength * state.content.enemySpecs[spawn.kind].moveIntervalMs,
          ),
        )
      : null;
    const typeWeight = counts.swarm + counts.speed * 1.5 + counts.armor * 2.5;
    return {
      lane,
      score: expectedCoreDamage * 3 + typeWeight,
      enemyCount: laneSpawns.length,
      counts,
      nearestDistance: null,
      nextArrivalMs,
      expectedCoreDamage,
    };
  });
}

function matchupWeight(guardId: GuardKind, counts: EnemyCounts): number {
  if (guardId === 'heavy') return counts.armor * 3 + counts.speed + counts.swarm * 0.5;
  if (guardId === 'rapid') return counts.speed * 3 + counts.armor * 1.25 + counts.swarm;
  return counts.swarm * 3 + counts.speed + counts.armor * 0.5;
}

export function selectGuardMatchup(state: GameState, guardId: GuardKind): GuardMatchup {
  const guard = state.guards[guardId];
  const threat = selectLaneThreat(state, guard.lane);
  const total = threat.counts.swarm + threat.counts.speed + threat.counts.armor;
  const score = matchupWeight(guardId, threat.counts);
  const preferredCount = threat.counts[state.content.guardSpecs[guardId].preferredEnemy];
  let label: GuardMatchup['label'] = '空闲';
  if (total > 0) {
    const ratio = preferredCount / total;
    label = ratio >= 0.5 ? '优势' : ratio > 0 ? '均势' : '劣势';
  }
  return {
    guardId,
    lane: guard.lane,
    score,
    label,
    preferredEnemy: state.content.guardSpecs[guardId].preferredEnemy,
  };
}

export function selectAllGuardMatchups(state: GameState): GuardMatchup[] {
  return GUARD_KINDS.map((guardId) => selectGuardMatchup(state, guardId));
}

export function selectLegalDestinationLanes(state: GameState): LaneId[] {
  if (
    (state.phase !== 'prep' && state.phase !== 'rescue') ||
    !state.selectedGuard ||
    state.paused ||
    state.windowMoveUsed
  ) {
    return [];
  }
  const occupied = new Set(GUARD_KINDS.map((guardId) => state.guards[guardId].lane));
  return LANE_IDS.filter((lane) => !occupied.has(lane));
}

const PHASE_LABELS: Record<Phase, string> = {
  demo: '演示波',
  prep: '预备调防',
  combatA: '前半波',
  rescue: '救场调防',
  combatB: '后半波',
  won: '防守成功',
  lost: '核心失守',
};

export function selectPhaseLabel(state: GameState): string {
  return PHASE_LABELS[state.phase];
}

export function selectPrimaryFailureCause(state: GameState): FinalCause | null {
  return state.finalCause;
}
