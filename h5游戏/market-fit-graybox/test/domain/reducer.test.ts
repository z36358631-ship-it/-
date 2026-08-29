import { describe, expect, it } from 'vitest';

import { STEP_MS, buildRunContent } from '../../src/domain/content';
import {
  advance,
  createRun,
  gameReducer,
  moveSelectedGuard,
  restart,
  selectGuard,
  togglePause,
} from '../../src/domain/reducer';
import type { EnemyState, GameAction, GameState } from '../../src/domain/types';

function advanceTicks(state: GameState, count: number): GameState {
  let next = state;
  for (let tick = 0; tick < count; tick += 1) {
    next = gameReducer(next, advance());
  }
  return next;
}

function reachFirstPrep(seed = 17): GameState {
  return advanceTicks(createRun(seed), 18_000 / STEP_MS);
}

describe('deterministic domain reducer', () => {
  it('replays the same seed and actions byte-for-byte', () => {
    const play = () => {
      let state = reachFirstPrep(29);
      state = gameReducer(state, selectGuard('heavy', 1));
      state = gameReducer(state, moveSelectedGuard(1, 2));
      state = advanceTicks(state, 6_000 / STEP_MS + 12);
      return JSON.stringify(state);
    };

    expect(play()).toBe(play());
  });

  it('accepts only the fixed 250 ms advance', () => {
    const invalid = { type: 'advance', ms: 500 } as unknown as GameAction;
    expect(() => gameReducer(createRun(1), invalid)).toThrow(/250/);
  });

  it('ignores moves outside command windows without changing state', () => {
    const state = createRun(3);
    expect(gameReducer(state, selectGuard('heavy', 1))).toBe(state);
    expect(gameReducer(state, moveSelectedGuard(1, 2))).toBe(state);
  });

  it('rejects occupied destinations and preserves selection', () => {
    let state = reachFirstPrep();
    state = gameReducer(state, selectGuard('heavy', 1));
    const rejected = gameReducer(state, moveSelectedGuard(2, 2));

    expect(rejected.guards.heavy.lane).toBe(0);
    expect(rejected.selectedGuard).toBe('heavy');
    expect(rejected.processedActionSeqs).toContain(2);
    expect(rejected.eventLog.at(-1)).toMatchObject({
      type: 'actionRejected',
      reason: 'occupied-destination',
    });
  });

  it('processes a command sequence once and permits one move per window', () => {
    let state = reachFirstPrep();
    state = gameReducer(state, selectGuard('heavy', 10));
    const duplicate = gameReducer(state, selectGuard('rapid', 10));
    expect(duplicate).toBe(state);
    expect(duplicate.selectedGuard).toBe('heavy');

    state = gameReducer(state, moveSelectedGuard(1, 11));
    const afterFirstMove = state;
    state = gameReducer(state, selectGuard('rapid', 12));
    state = gameReducer(state, moveSelectedGuard(3, 13));

    expect(state).toBe(afterFirstMove);
    expect(state.guards.heavy.lane).toBe(1);
    expect(state.guards.rapid.lane).toBe(2);
    expect(state.windowMoveUsed).toBe(true);
  });

  it('freezes the active clock while paused', () => {
    const state = gameReducer(createRun(4), togglePause());
    const frozen = advanceTicks(state, 8);
    expect(frozen).toBe(state);
    expect(frozen.activeClockMs).toBe(0);
  });

  it('keeps a terminal result immutable except for restart', () => {
    const terminal: GameState = {
      ...createRun(5),
      phase: 'lost',
      coreIntegrity: 0,
    };
    expect(gameReducer(terminal, togglePause())).toBe(terminal);
    expect(gameReducer(terminal, selectGuard('heavy', 1))).toBe(terminal);
    expect(gameReducer(terminal, advance())).toBe(terminal);

    const next = gameReducer(terminal, restart(6));
    expect(next).toMatchObject({
      seed: 6,
      wave: 1,
      phase: 'demo',
      coreIntegrity: buildRunContent(6).initialCoreIntegrity,
    });
  });

  it('targets the nearest enemy and breaks distance ties by earlier spawn order', () => {
    const base = createRun(7);
    const enemy = (id: string, distance: number, spawnOrder: number): EnemyState => ({
      id,
      sourceSpawnId: `source-${id}`,
      kind: 'armor',
      lane: 0,
      hp: 7,
      maxHp: 7,
      distance,
      moveAccumulatorMs: 0,
      spawnOrder,
      spawnedAtMs: 0,
    });
    const combat: GameState = {
      ...base,
      wave: 2,
      phase: 'combatA',
      enemies: [enemy('later', 2, 2), enemy('earlier', 2, 1), enemy('far', 4, 0)],
      spawnCursor: 99,
    };

    const next = gameReducer(combat, advance());
    expect(next.enemies.find((candidate) => candidate.id === 'earlier')?.hp).toBe(3);
    expect(next.enemies.find((candidate) => candidate.id === 'later')?.hp).toBe(7);
    expect(next.enemies.find((candidate) => candidate.id === 'far')?.hp).toBe(7);
  });
});
