import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FrameScheduler } from '../../src/app/useGameSession';
import { useGameSession } from '../../src/app/useGameSession';

class ManualFrameScheduler implements FrameScheduler {
  private clock = 0;
  private nextId = 1;
  private callbacks = new Map<number, FrameRequestCallback>();

  now = () => this.clock;

  request = (callback: FrameRequestCallback) => {
    const id = this.nextId;
    this.nextId += 1;
    this.callbacks.set(id, callback);
    return id;
  };

  cancel = (id: number) => {
    this.callbacks.delete(id);
  };

  tick(milliseconds: number) {
    this.clock += milliseconds;
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    callbacks.forEach((callback) => callback(this.clock));
  }

  pendingCount() {
    return this.callbacks.size;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('useGameSession', () => {
  it('steps the domain every 250 ms and caps catch-up at four steps', () => {
    const scheduler = new ManualFrameScheduler();
    const { result } = renderHook(() => useGameSession({ initialSeed: 11, scheduler }));

    act(() => scheduler.tick(250));
    expect(result.current.state.activeClockMs).toBe(250);

    act(() => scheduler.tick(5_000));
    expect(result.current.state.activeClockMs).toBe(1_250);
  });

  it('pauses when the page becomes hidden and requires manual resume', () => {
    const scheduler = new ManualFrameScheduler();
    const { result } = renderHook(() => useGameSession({ scheduler }));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.state.paused).toBe(true);
    act(() => scheduler.tick(1_000));
    expect(result.current.state.activeClockMs).toBe(0);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.state.paused).toBe(true);
    act(() => result.current.togglePause());
    expect(result.current.state.paused).toBe(false);
  });

  it('supports manual pause and creates a new run id on restart', () => {
    const scheduler = new ManualFrameScheduler();
    const ids = ['run-1', 'run-2'];
    const { result } = renderHook(() =>
      useGameSession({ scheduler, idFactory: () => ids.shift() ?? 'unexpected' }),
    );
    const firstRunId = result.current.runId;

    act(() => result.current.togglePause());
    expect(result.current.state.paused).toBe(true);
    act(() => result.current.restart(55));

    expect(result.current.runId).not.toBe(firstRunId);
    expect(result.current.runId).toBe('run-2');
    expect(result.current.state).toMatchObject({ seed: 55, wave: 1, phase: 'demo', paused: false });
  });

  it('cancels its frame loop on teardown and never creates duplicate loops', () => {
    const scheduler = new ManualFrameScheduler();
    const { unmount } = renderHook(() => useGameSession({ scheduler }));
    expect(scheduler.pendingCount()).toBe(1);
    act(() => scheduler.tick(250));
    expect(scheduler.pendingCount()).toBe(1);
    unmount();
    expect(scheduler.pendingCount()).toBe(0);
  });
});
