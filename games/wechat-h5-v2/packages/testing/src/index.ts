import type { GameId } from "@gamehub/h5-contracts";

export interface SeededRandom {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  fork(label: string): SeededRandom;
  snapshot(): number;
}

function hashSeed(seed: number | string): number {
  if (typeof seed === "number") return seed >>> 0;
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createSeededRandom(seed: number | string): SeededRandom {
  let state = hashSeed(seed);
  const api: SeededRandom = {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(minInclusive, maxInclusive) {
      if (maxInclusive < minInclusive) {
        throw new Error("RANDOM_RANGE_INVALID");
      }
      return (
        minInclusive +
        Math.floor(api.next() * (maxInclusive - minInclusive + 1))
      );
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("RANDOM_PICK_EMPTY");
      return items[api.int(0, items.length - 1)] as T;
    },
    fork(label) {
      return createSeededRandom(`${state}:${label}`);
    },
    snapshot: () => state,
  };
  return api;
}

export interface TestHookRegistry {
  register<TArgs extends unknown[], TResult>(
    name: string,
    handler: (...args: TArgs) => TResult | Promise<TResult>,
  ): () => void;
  invoke<TResult>(name: string, ...args: unknown[]): Promise<TResult>;
  list(): string[];
  expose(target?: Window): void;
  dispose(): void;
}

export interface TestHarness {
  readonly enabled: boolean;
  readonly seed: number;
  readonly speed: number;
  readonly random: SeededRandom;
  readonly registry: TestHookRegistry;
  expose(target?: Window): void;
  dispose(): void;
}

export function createTestHarness(options: {
  search: string;
  gameId: GameId;
  defaultSeed: number;
  maxSpeed?: number;
}): TestHarness {
  const params = new URLSearchParams(options.search);
  const enabled = params.get("test") === "1";
  const requestedSeed = Number(params.get("seed"));
  const requestedSpeed = Number(params.get("speed"));
  const seed =
    enabled && Number.isFinite(requestedSeed)
      ? requestedSeed >>> 0
      : options.defaultSeed >>> 0;
  const speed =
    enabled && Number.isFinite(requestedSpeed)
      ? Math.max(1, Math.min(options.maxSpeed ?? 30, requestedSpeed))
      : 1;
  const hooks = new Map<
    string,
    (...args: unknown[]) => unknown | Promise<unknown>
  >();
  let exposedTarget: (Window & { __GAME_TEST__?: unknown }) | null = null;
  const registry: TestHookRegistry = {
    register(name, handler) {
      if (hooks.has(name)) throw new Error(`TEST_HOOK_DUPLICATE:${name}`);
      hooks.set(name, handler as (...args: unknown[]) => unknown);
      return () => hooks.delete(name);
    },
    async invoke<TResult>(name: string, ...args: unknown[]) {
      const hook = hooks.get(name);
      if (!hook) throw new Error(`TEST_HOOK_UNKNOWN:${name}`);
      return (await hook(...args)) as TResult;
    },
    list: () => [...hooks.keys()].sort(),
    expose(target = window) {
      if (!enabled) return;
      exposedTarget = target as Window & { __GAME_TEST__?: unknown };
      exposedTarget.__GAME_TEST__ = Object.freeze({
        gameId: options.gameId,
        seed,
        speed,
        list: registry.list,
        invoke: registry.invoke,
      });
    },
    dispose() {
      if (exposedTarget) delete exposedTarget.__GAME_TEST__;
      exposedTarget = null;
      hooks.clear();
    },
  };
  return {
    enabled,
    seed,
    speed,
    random: createSeededRandom(seed),
    registry,
    expose: (target) => registry.expose(target),
    dispose: () => registry.dispose(),
  };
}
