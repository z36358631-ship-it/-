import { describe, expect, it } from 'vitest';

import { createRun, gameReducer, selectGuard } from '../../src/domain/reducer';
import {
  selectAllLaneThreats,
  selectGuardMatchup,
  selectLaneThreat,
  selectLegalDestinationLanes,
  selectNextArrival,
  selectNextWaveThreats,
  selectPhaseLabel,
  selectPrimaryFailureCause,
} from '../../src/domain/selectors';
import type { EnemyState, FinalCause, GameState } from '../../src/domain/types';

function enemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 'enemy-test',
    sourceSpawnId: 'spawn-test',
    kind: 'speed',
    lane: 1,
    hp: 2,
    maxHp: 2,
    distance: 3,
    moveAccumulatorMs: 250,
    spawnOrder: 1,
    spawnedAtMs: 0,
    ...overrides,
  };
}

describe('domain selectors', () => {
  it('exposes all six lane threats and a deterministic arrival', () => {
    const base = createRun(1);
    const state: GameState = {
      ...base,
      wave: 2,
      phase: 'combatA',
      enemies: [enemy()],
      previews: base.previews.map((preview) => ({
        ...preview,
        counts: { swarm: 0, speed: 0, armor: 0 },
        nextSpawnInMs: null,
      })),
    };

    expect(selectAllLaneThreats(state)).toHaveLength(6);
    expect(selectNextArrival(state, 1)).toBe(2_750);
    expect(selectLaneThreat(state, 1)).toMatchObject({
      lane: 1,
      enemyCount: 1,
      counts: { speed: 1 },
      nearestDistance: 3,
      expectedCoreDamage: 1,
    });
  });

  it('shows legal empty lanes only after selecting in a command window', () => {
    const prep = { ...createRun(2), wave: 2, phase: 'prep' as const };
    expect(selectLegalDestinationLanes(prep)).toEqual([]);

    const selected = gameReducer(prep, selectGuard('heavy', 1));
    expect(selectLegalDestinationLanes(selected)).toEqual([1, 3, 5]);
    expect(selectLegalDestinationLanes({ ...selected, windowMoveUsed: true })).toEqual([]);
  });

  it('labels guard matchup from visible enemies and previews', () => {
    const base = createRun(3);
    const state: GameState = {
      ...base,
      guards: { ...base.guards, heavy: { ...base.guards.heavy, lane: 0 } },
      enemies: [enemy({ id: 'armor', kind: 'armor', lane: 0, hp: 7, maxHp: 7 })],
      previews: base.previews.map((preview) => ({
        ...preview,
        counts: { swarm: 0, speed: 0, armor: 0 },
        nextSpawnInMs: null,
      })),
    };

    expect(selectGuardMatchup(state, 'heavy')).toMatchObject({
      guardId: 'heavy',
      lane: 0,
      label: '优势',
      preferredEnemy: 'armor',
    });
  });

  it('returns the stable phase label and primary result cause', () => {
    const cause: FinalCause = {
      code: 'core_breached',
      lane: 5,
      enemyKind: 'swarm',
      amount: 4,
      summary: '群敌从6号线突破',
      recommendation: '提前调入横扫',
    };
    const state = { ...createRun(4), phase: 'lost' as const, finalCause: cause };
    expect(selectPhaseLabel(state)).toBe('核心失守');
    expect(selectPrimaryFailureCause(state)).toEqual(cause);
  });

  it('exposes only the next wave combatA threats for legal pre-positioning', () => {
    const state = { ...createRun(9), wave: 6, phase: 'rescue' as const };
    const nextWaveSpawns = state.content.waves
      .find((wave) => wave.wave === 7)!
      .spawns.filter((spawn) => spawn.phase === 'combatA');
    const threats = selectNextWaveThreats(state);

    expect(threats).toHaveLength(6);
    expect(threats.reduce((total, threat) => total + threat.enemyCount, 0)).toBe(
      nextWaveSpawns.length,
    );
    expect(selectNextWaveThreats({ ...state, wave: 12 })).toEqual([]);
    expect(selectNextWaveThreats({ ...state, phase: 'lost' })).toEqual([]);
  });
});
