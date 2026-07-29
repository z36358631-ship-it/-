import type {
  GameEvent,
  GameEventName,
  GameId,
} from "@gamehub/h5-contracts";

export interface TelemetryQueue {
  append(event: GameEvent): void;
  read(): GameEvent[];
  remove(eventIds: string[]): void;
  clear(): void;
}

export interface TelemetryTransport {
  send(events: readonly GameEvent[]): Promise<{
    acceptedEventIds: string[];
  }>;
}

export interface FlushResult {
  attempted: number;
  accepted: number;
  retained: number;
  transport: "none" | "configured";
}

export interface TelemetrySnapshot {
  sessionId: string;
  runId: string | null;
  queuedEvents: number;
  nextSeq: number;
}

export interface TelemetryClient {
  beginRun(runId: string): void;
  emit(
    event: GameEventName,
    payload?: Record<string, unknown>,
  ): GameEvent;
  endRun(payload?: Record<string, unknown>): GameEvent;
  flush(): Promise<FlushResult>;
  snapshot(): TelemetrySnapshot;
  dispose(): void;
}

const SENSITIVE_KEYS = new Set([
  "openid",
  "openId",
  "session_key",
  "sessionKey",
  "token",
  "access_token",
  "phone",
  "mobile",
  "payment",
]);

function assertSafePayload(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      throw new Error(`TELEMETRY_SENSITIVE_KEY:${key}`);
    }
    assertSafePayload(child);
  }
}

export function createTelemetryClient(options: {
  gameId: GameId;
  testMode: boolean;
  queue: TelemetryQueue;
  transport?: TelemetryTransport;
  sessionId?: string;
  idFactory?: () => string;
  now?: () => number;
}): TelemetryClient {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const now = options.now ?? Date.now;
  let runId: string | null = null;
  let seq = 1;
  const api: TelemetryClient = {
    beginRun(nextRunId) {
      if (runId) throw new Error(`TELEMETRY_RUN_ACTIVE:${runId}`);
      runId = nextRunId;
      api.emit("run_start");
    },
    emit(event, payload = {}) {
      assertSafePayload(payload);
      const item: GameEvent = {
        eventId: idFactory(),
        sessionId,
        runId,
        gameId: options.gameId,
        event,
        seq,
        clientAt: now(),
        schemaVersion: 1,
        testMode: options.testMode,
        payload: structuredClone(payload),
      };
      seq += 1;
      options.queue.append(item);
      return item;
    },
    endRun(payload = {}) {
      if (!runId) throw new Error("TELEMETRY_RUN_NOT_ACTIVE");
      const item = api.emit("run_end", payload);
      runId = null;
      return item;
    },
    async flush() {
      const events = options.queue.read();
      if (!options.transport) {
        return {
          attempted: 0,
          accepted: 0,
          retained: events.length,
          transport: "none",
        };
      }
      const result = await options.transport.send(events);
      options.queue.remove(result.acceptedEventIds);
      return {
        attempted: events.length,
        accepted: result.acceptedEventIds.length,
        retained: options.queue.read().length,
        transport: "configured",
      };
    },
    snapshot: () => ({
      sessionId,
      runId,
      queuedEvents: options.queue.read().length,
      nextSeq: seq,
    }),
    dispose() {
      runId = null;
    },
  };
  return api;
}

export function createMemoryTelemetryQueue(): TelemetryQueue {
  let events: GameEvent[] = [];
  return {
    append: (event) => events.push(structuredClone(event)),
    read: () => structuredClone(events),
    remove: (ids) => {
      const accepted = new Set(ids);
      events = events.filter((event) => !accepted.has(event.eventId));
    },
    clear: () => {
      events = [];
    },
  };
}

export function createLocalTelemetryQueue(options: {
  gameId: GameId;
  storage?: Storage;
  maxEvents?: number;
}): TelemetryQueue {
  const storage = options.storage ?? localStorage;
  const key = `telemetry:${options.gameId}:queue`;
  const maxEvents = options.maxEvents ?? 1000;
  const load = (): GameEvent[] => {
    try {
      return JSON.parse(storage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  };
  const save = (events: GameEvent[]) =>
    storage.setItem(key, JSON.stringify(events.slice(-maxEvents)));
  return {
    append: (event) => save([...load(), event]),
    read: load,
    remove: (ids) => {
      const accepted = new Set(ids);
      save(load().filter((event) => !accepted.has(event.eventId)));
    },
    clear: () => storage.removeItem(key),
  };
}
