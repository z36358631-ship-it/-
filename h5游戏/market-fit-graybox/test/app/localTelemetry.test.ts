import { describe, expect, it } from 'vitest';

import { createLocalTelemetry } from '../../src/app/localTelemetry';
import type { DomainEvent } from '../../src/domain/types';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const coreImpact: DomainEvent = {
  id: 7,
  type: 'coreDamaged',
  atMs: 12_500,
  wave: 3,
  phase: 'combatB',
  lane: 4,
  enemyKind: 'speed',
  amount: 1,
};

describe('local anonymous telemetry', () => {
  it('stores a versioned anonymous run and exports stable JSON', () => {
    const storage = new MemoryStorage();
    const telemetry = createLocalTelemetry(storage);
    telemetry.beginRun('run-a', 31, 100);
    telemetry.appendDomainEvents('run-a', [coreImpact]);
    telemetry.completeRun('run-a', 'lost', 0, 500);

    const exported = JSON.parse(telemetry.exportJson()) as {
      schemaVersion: number;
      runs: Array<Record<string, unknown>>;
    };
    expect(exported.schemaVersion).toBe(1);
    expect(exported.runs).toHaveLength(1);
    expect(exported.runs[0]).toMatchObject({
      runId: 'run-a',
      seed: 31,
      startedAtMs: 100,
      endedAtMs: 500,
      outcome: 'lost',
      finalIntegrity: 0,
    });
    expect(exported.runs[0]).not.toHaveProperty('userId');
    expect(exported.runs[0]).not.toHaveProperty('userAgent');
    expect(telemetry.getDebugStatus()).toEqual({ ok: true, message: '本地记录正常' });
  });

  it('deduplicates domain events by event id', () => {
    const telemetry = createLocalTelemetry(new MemoryStorage());
    telemetry.beginRun('run-a', 1, 0);
    telemetry.appendDomainEvents('run-a', [coreImpact, coreImpact]);
    const exported = JSON.parse(telemetry.exportJson()) as {
      runs: Array<{ events: unknown[] }>;
    };
    expect(exported.runs[0].events).toHaveLength(1);
  });

  it('swallows storage failures and reports only debug status', () => {
    class BrokenStorage implements Storage {
      get length(): number {
        throw new Error('blocked');
      }

      clear(): void {
        throw new Error('blocked');
      }

      getItem(): string | null {
        throw new Error('blocked');
      }

      key(): string | null {
        throw new Error('blocked');
      }

      removeItem(): void {
        throw new Error('blocked');
      }

      setItem(): void {
        throw new Error('blocked');
      }
    }
    const telemetry = createLocalTelemetry(new BrokenStorage());

    expect(() => telemetry.beginRun('run-b', 2, 0)).not.toThrow();
    expect(() => telemetry.appendDomainEvents('run-b', [coreImpact])).not.toThrow();
    expect(telemetry.getDebugStatus()).toEqual({ ok: false, message: '本地记录不可用' });
    expect(JSON.parse(telemetry.exportJson())).toEqual({ schemaVersion: 1, runs: [] });
  });
});
