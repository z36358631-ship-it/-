import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { STEP_MS } from '../domain/content';
import {
  advance,
  createRun,
  gameReducer,
  moveSelectedGuard,
  restart as restartAction,
  selectGuard,
  togglePause as togglePauseAction,
} from '../domain/reducer';
import type { GameState, GuardKind, LaneId } from '../domain/types';
import {
  createLocalTelemetry,
  type LocalTelemetry,
  type TelemetryDebugStatus,
} from './localTelemetry';

const MAX_STEPS_PER_FRAME = 4;

export interface FrameScheduler {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
  now: () => number;
}

export interface UseGameSessionOptions {
  initialSeed?: number;
  scheduler?: FrameScheduler;
  idFactory?: () => string;
  telemetry?: LocalTelemetry;
}

export interface GameSession {
  state: GameState;
  runId: string;
  telemetryStatus: TelemetryDebugStatus;
  selectGuard: (guardId: GuardKind) => void;
  moveGuard: (lane: LaneId) => void;
  togglePause: () => void;
  restart: (seed?: number) => void;
  exportTelemetry: () => string;
}

const defaultScheduler: FrameScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
  now: () => performance.now(),
};

function defaultRunId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `run-${Math.floor(performance.now())}-${Math.random().toString(36).slice(2)}`;
  }
}

function nextSeed(seed: number): number {
  return (seed + 1) >>> 0;
}

export function useGameSession(options: UseGameSessionOptions = {}): GameSession {
  const initialSeed = options.initialSeed ?? 17;
  const schedulerRef = useRef(options.scheduler ?? defaultScheduler);
  const idFactoryRef = useRef(options.idFactory ?? defaultRunId);
  const telemetryRef = useRef(options.telemetry ?? createLocalTelemetry());
  const actionSeqRef = useRef(1);
  const lastRecordedEventRef = useRef(0);
  const [state, dispatch] = useReducer(gameReducer, initialSeed, createRun);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [runId, setRunId] = useState(() => idFactoryRef.current());
  const [telemetryStatus, setTelemetryStatus] = useState(() =>
    telemetryRef.current.getDebugStatus(),
  );

  const refreshTelemetryStatus = useCallback(() => {
    const latest = telemetryRef.current.getDebugStatus();
    setTelemetryStatus((current) =>
      current.ok === latest.ok && current.message === latest.message ? current : latest,
    );
  }, []);

  useEffect(() => {
    telemetryRef.current.beginRun(runId, state.seed, schedulerRef.current.now());
    refreshTelemetryStatus();
  }, [refreshTelemetryStatus, runId, state.seed]);

  useEffect(() => {
    const events = state.eventLog.filter((event) => event.id > lastRecordedEventRef.current);
    if (events.length > 0) {
      telemetryRef.current.appendDomainEvents(runId, events);
      lastRecordedEventRef.current = events.at(-1)?.id ?? lastRecordedEventRef.current;
      refreshTelemetryStatus();
    }
    if (state.phase === 'won' || state.phase === 'lost') {
      telemetryRef.current.completeRun(
        runId,
        state.phase,
        state.coreIntegrity,
        schedulerRef.current.now(),
      );
      refreshTelemetryStatus();
    }
  }, [refreshTelemetryStatus, runId, state.coreIntegrity, state.eventLog, state.phase]);

  useEffect(() => {
    const scheduler = schedulerRef.current;
    let frameId = 0;
    let lastFrameAt = scheduler.now();
    let accumulator = 0;
    let disposed = false;

    const frame = (now: number) => {
      if (disposed) return;
      const elapsed = Math.max(0, now - lastFrameAt);
      lastFrameAt = now;
      const current = stateRef.current;
      if (!current.paused && current.phase !== 'won' && current.phase !== 'lost') {
        accumulator = Math.min(accumulator + elapsed, STEP_MS * MAX_STEPS_PER_FRAME);
        const steps = Math.min(Math.floor(accumulator / STEP_MS), MAX_STEPS_PER_FRAME);
        for (let index = 0; index < steps; index += 1) {
          dispatch(advance());
        }
        accumulator -= steps * STEP_MS;
      } else {
        accumulator = 0;
      }
      frameId = scheduler.request(frame);
    };

    frameId = scheduler.request(frame);
    return () => {
      disposed = true;
      scheduler.cancel(frameId);
    };
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => {
      const current = stateRef.current;
      if (
        document.visibilityState === 'hidden' &&
        !current.paused &&
        current.phase !== 'won' &&
        current.phase !== 'lost'
      ) {
        dispatch(togglePauseAction());
      }
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const chooseGuard = useCallback((guardId: GuardKind) => {
    dispatch(selectGuard(guardId, actionSeqRef.current));
    actionSeqRef.current += 1;
  }, []);

  const moveGuard = useCallback((lane: LaneId) => {
    dispatch(moveSelectedGuard(lane, actionSeqRef.current));
    actionSeqRef.current += 1;
  }, []);

  const togglePause = useCallback(() => {
    dispatch(togglePauseAction());
  }, []);

  const restart = useCallback((seed?: number) => {
    const targetSeed = seed ?? nextSeed(stateRef.current.seed);
    lastRecordedEventRef.current = 0;
    actionSeqRef.current = 1;
    setRunId(idFactoryRef.current());
    dispatch(restartAction(targetSeed));
  }, []);

  const exportTelemetry = useCallback(() => telemetryRef.current.exportJson(), []);

  return {
    state,
    runId,
    telemetryStatus,
    selectGuard: chooseGuard,
    moveGuard,
    togglePause,
    restart,
    exportTelemetry,
  };
}
