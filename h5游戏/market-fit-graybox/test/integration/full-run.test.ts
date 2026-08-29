import { describe, expect, it } from 'vitest';

import { runStrategy } from '../../simulation/search';
import { gameReducer, restart } from '../../src/domain/reducer';

describe('complete playable loop', () => {
  it('reaches an attributed loss and a deterministic win, then restarts cleanly', () => {
    const losingRun = runStrategy(7300, 'idle');
    expect(losingRun.won).toBe(false);
    expect(losingRun.finalState.phase).toBe('lost');
    expect(losingRun.finalState.finalCause?.code).toBe('core_breached');
    expect(losingRun.finalState.finalCause?.summary).not.toBe('');
    expect(losingRun.finalState.finalCause?.summary).not.toMatch(/armor|speed|swarm/);

    const winningRun = runStrategy(7300, 'matchEnemyType');
    expect(winningRun.won).toBe(true);
    expect(winningRun.finalState.phase).toBe('won');
    expect(winningRun.finalState.coreIntegrity).toBeGreaterThan(0);

    const restarted = gameReducer(winningRun.finalState, restart(7301));
    expect(restarted.seed).toBe(7301);
    expect(restarted.wave).toBe(1);
    expect(restarted.phase).toBe('demo');
    expect(restarted.coreIntegrity).toBe(restarted.maxCoreIntegrity);
    expect(restarted.moveHistory).toEqual([]);
  });
});
