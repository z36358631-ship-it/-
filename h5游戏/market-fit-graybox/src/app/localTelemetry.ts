import type { DomainEvent, Phase } from '../domain/types';

const STORAGE_KEY = 'six-lane-defense.telemetry.v1';

export interface TelemetryDebugStatus {
  ok: boolean;
  message: '本地记录正常' | '本地记录不可用';
}

interface AnonymousEvent {
  eventId: number;
  type: DomainEvent['type'];
  atMs: number;
  wave: number;
  phase: Phase;
  lane?: DomainEvent['lane'];
  guardId?: DomainEvent['guardId'];
  enemyKind?: DomainEvent['enemyKind'];
  amount?: number;
  reason?: string;
}

interface AnonymousRunLog {
  runId: string;
  seed: number;
  startedAtMs: number;
  endedAtMs: number | null;
  outcome: 'won' | 'lost' | null;
  finalIntegrity: number | null;
  events: AnonymousEvent[];
}

interface TelemetryEnvelope {
  schemaVersion: 1;
  runs: AnonymousRunLog[];
}

export interface LocalTelemetry {
  beginRun: (runId: string, seed: number, startedAtMs: number) => void;
  appendDomainEvents: (runId: string, events: DomainEvent[]) => void;
  completeRun: (
    runId: string,
    outcome: 'won' | 'lost',
    finalIntegrity: number,
    endedAtMs: number,
  ) => void;
  exportJson: () => string;
  getDebugStatus: () => TelemetryDebugStatus;
}

function emptyEnvelope(): TelemetryEnvelope {
  return { schemaVersion: 1, runs: [] };
}

function resolveDefaultStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function sanitizeEvent(event: DomainEvent): AnonymousEvent {
  return {
    eventId: event.id,
    type: event.type,
    atMs: event.atMs,
    wave: event.wave,
    phase: event.phase,
    ...(event.lane === undefined ? {} : { lane: event.lane }),
    ...(event.guardId === undefined ? {} : { guardId: event.guardId }),
    ...(event.enemyKind === undefined ? {} : { enemyKind: event.enemyKind }),
    ...(event.amount === undefined ? {} : { amount: event.amount }),
    ...(event.reason === undefined ? {} : { reason: event.reason }),
  };
}

export function createLocalTelemetry(storage: Storage | null = resolveDefaultStorage()): LocalTelemetry {
  let status: TelemetryDebugStatus = storage
    ? { ok: true, message: '本地记录正常' }
    : { ok: false, message: '本地记录不可用' };

  const markUnavailable = () => {
    status = { ok: false, message: '本地记录不可用' };
  };

  const read = (): TelemetryEnvelope | null => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyEnvelope();
      const parsed = JSON.parse(raw) as Partial<TelemetryEnvelope>;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.runs)) {
        markUnavailable();
        return null;
      }
      return parsed as TelemetryEnvelope;
    } catch {
      markUnavailable();
      return null;
    }
  };

  const write = (envelope: TelemetryEnvelope): void => {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      markUnavailable();
    }
  };

  return {
    beginRun(runId, seed, startedAtMs) {
      const envelope = read();
      if (!envelope || envelope.runs.some((run) => run.runId === runId)) return;
      envelope.runs.push({
        runId,
        seed,
        startedAtMs,
        endedAtMs: null,
        outcome: null,
        finalIntegrity: null,
        events: [],
      });
      write(envelope);
    },

    appendDomainEvents(runId, events) {
      if (events.length === 0) return;
      const envelope = read();
      if (!envelope) return;
      const run = envelope.runs.find((candidate) => candidate.runId === runId);
      if (!run) return;
      const existing = new Set(run.events.map((event) => event.eventId));
      for (const event of events) {
        if (!existing.has(event.id)) {
          run.events.push(sanitizeEvent(event));
          existing.add(event.id);
        }
      }
      write(envelope);
    },

    completeRun(runId, outcome, finalIntegrity, endedAtMs) {
      const envelope = read();
      if (!envelope) return;
      const run = envelope.runs.find((candidate) => candidate.runId === runId);
      if (!run) return;
      run.outcome = outcome;
      run.finalIntegrity = finalIntegrity;
      run.endedAtMs = endedAtMs;
      write(envelope);
    },

    exportJson() {
      return JSON.stringify(read() ?? emptyEnvelope(), null, 2);
    },

    getDebugStatus() {
      return { ...status };
    },
  };
}
