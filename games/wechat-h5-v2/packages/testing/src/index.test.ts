import { describe, expect, it } from "vitest";
import {
  createSeededRandom,
  createTestHarness,
} from "./index";

describe("test harness", () => {
  it("replays the same random sequence from the same seed", () => {
    const first = createSeededRandom("daily-2026-07-29");
    const second = createSeededRandom("daily-2026-07-29");
    expect([first.next(), first.int(1, 6), first.pick(["a", "b", "c"])])
      .toEqual([
        second.next(),
        second.int(1, 6),
        second.pick(["a", "b", "c"]),
      ]);
  });

  it("ignores speed and seed without test=1", () => {
    const target = {} as Window;
    const normal = createTestHarness({
      search: "?speed=30&seed=1",
      gameId: "monster-night-market",
      defaultSeed: 99,
    });
    normal.registry.register("snapshot", () => ({ ok: true }));
    normal.expose(target);
    expect(normal).toMatchObject({ enabled: false, speed: 1, seed: 99 });
    expect((target as Window & { __GAME_TEST__?: unknown }).__GAME_TEST__)
      .toBeUndefined();
  });

  it("clamps test speed and exposes registered hooks", () => {
    const target = {} as Window;
    const harness = createTestHarness({
      search: "?test=1&speed=100&seed=7",
      gameId: "ricochet-crew",
      defaultSeed: 99,
      maxSpeed: 30,
    });
    harness.registry.register("snapshot", () => ({ run: 1 }));
    harness.expose(target);
    expect(harness).toMatchObject({ enabled: true, speed: 30, seed: 7 });
    expect(
      (target as Window & {
        __GAME_TEST__: { list(): string[] };
      }).__GAME_TEST__.list(),
    ).toEqual(["snapshot"]);
  });
});
