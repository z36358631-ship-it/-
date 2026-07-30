import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSave } from "../../../apps/three-lane-squad/src/meta/saveModel";

const fixture = vi.hoisted(() => ({
  onStandard: null as null | (() => void),
  enemyId: null as string | null,
  cell: { lane: 0, column: 0 } as {
    lane: 0 | 1 | 2;
    column: 0 | 1 | 2 | 3;
  },
  injectDoubleDefeat: false,
}));

vi.mock(
  "../../../apps/three-lane-squad/src/domain/advanceBattle",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../../apps/three-lane-squad/src/domain/advanceBattle")
    >();
    return {
      ...actual,
      advanceBattle: vi.fn(
        (
          state: Parameters<typeof actual.advanceBattle>[0],
          deltaMs: number,
        ) => {
          if (!fixture.injectDoubleDefeat) {
            return actual.advanceBattle(state, deltaMs);
          }
          fixture.injectDoubleDefeat = false;
          const next = structuredClone(state);
          next.elapsedMs += deltaMs;
          const atMs = next.elapsedMs;
          next.events.push(
            {
              seq: next.nextEventSeq++,
              atMs,
              type: "enemy_defeated",
              payload: {
                enemyInstanceId: "same-tick-enemy-1",
                enemyId: "grunt",
                lane: 0,
              },
            },
            {
              seq: next.nextEventSeq++,
              atMs,
              type: "enemy_defeated",
              payload: {
                enemyInstanceId: "same-tick-enemy-2",
                enemyId: "runner",
                lane: 1,
              },
            },
          );
          return next;
        },
      ),
    };
  },
);

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/HomeView",
  () => ({
    createHomeView: vi.fn((input: { onStandard: () => void }) => {
      fixture.onStandard = input.onStandard;
      return {};
    }),
  }),
);

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/BattleScene",
  () => ({
    BattleScene: class {
      render(): void {}
      enemyAt(): string | null {
        return fixture.enemyId;
      }
      cellAt(): typeof fixture.cell {
        return fixture.cell;
      }
      heroAt(): null {
        return null;
      }
    },
  }),
);

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/Hud",
  () => ({ createHud: vi.fn(() => ({})) }),
);

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/OverlayViews",
  () => ({
    createPauseOverlay: vi.fn(() => ({})),
    createResultOverlay: vi.fn(() => ({})),
  }),
);

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/ProgressView",
  () => ({ createProgressView: vi.fn(() => ({})) }),
);

import { createThreeLaneApp } from "../../../apps/three-lane-squad/src/app/createThreeLaneApp";

function createFixture() {
  let clickHero = (): void => undefined;
  const heroButton = {
    dataset: { heroCard: "ranger" },
    textContent: "Ranger",
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "click") clickHero = listener;
    }),
    setPointerCapture: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const onFirstInput = vi.fn();
  const onFirstPayoff = vi.fn();
  const app = createThreeLaneApp({
    host: {
      replaceChildren: vi.fn(),
      querySelectorAll: vi.fn(() => [heroButton]),
      querySelector: vi.fn(() => null),
    } as unknown as HTMLElement,
    canvas: { hidden: false } as unknown as HTMLCanvasElement,
    save: createDefaultSave(),
    today: "2026-07-29",
    timeScale: 1,
    persist: vi.fn(),
    onScreenChange: vi.fn(),
    onMeaningfulInput: vi.fn(),
    onFirstInput,
    onFirstPayoff,
    onRunStart: vi.fn(),
    onRunEnd: vi.fn(),
    onPauseChange: vi.fn(),
    onMutedChange: vi.fn(),
    onReducedMotionChange: vi.fn(),
    createRunId: vi
      .fn<() => string>()
      .mockReturnValueOnce("telemetry-run-1")
      .mockReturnValueOnce("telemetry-run-2"),
  });
  return {
    app,
    onFirstInput,
    onFirstPayoff,
    clickHero: () => clickHero(),
  };
}

describe("three lane production telemetry facts", () => {
  beforeEach(() => {
    fixture.onStandard = null;
    fixture.enemyId = null;
    fixture.cell = { lane: 0, column: 0 };
    fixture.injectDoubleDefeat = false;
  });

  it("counts only accepted commands as first input and resets on a new run", () => {
    const test = createFixture();
    fixture.onStandard!();

    fixture.enemyId = "missing-enemy";
    test.app.handleTap({ x: 10, y: 10 }, 100);
    expect(test.onFirstInput).not.toHaveBeenCalled();

    fixture.enemyId = null;
    test.clickHero();
    test.app.handleTap({ x: 10, y: 10 }, 200);
    fixture.cell = { lane: 0, column: 1 };
    test.clickHero();
    test.app.handleTap({ x: 20, y: 10 }, 300);
    expect(test.onFirstInput).toHaveBeenCalledOnce();
    expect(test.onFirstInput).toHaveBeenCalledWith({
      kind: "deploy",
      elapsedMs: 200,
    });

    fixture.onStandard!();
    fixture.cell = { lane: 1, column: 0 };
    test.clickHero();
    test.app.handleTap({ x: 10, y: 20 }, 400);
    expect(test.onFirstInput).toHaveBeenCalledTimes(2);
  });

  it("reports the first enemy defeat once per run and never invents a payoff", () => {
    const test = createFixture();
    fixture.onStandard!();
    test.app.fixedUpdate(1_000);
    expect(test.onFirstPayoff).not.toHaveBeenCalled();

    test.clickHero();
    test.app.handleTap({ x: 10, y: 10 }, 1_000);
    test.app.fixedUpdate(4_000);
    for (let index = 0; index < 100; index += 1) {
      test.app.fixedUpdate(100);
    }
    expect(test.onFirstPayoff).toHaveBeenCalledOnce();
    expect(test.onFirstPayoff).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "enemy_defeated",
        enemyCount: 1,
      }),
    );

    fixture.onStandard!();
    test.app.fixedUpdate(1_000);
    expect(test.onFirstPayoff).toHaveBeenCalledOnce();

    fixture.cell = { lane: 0, column: 0 };
    test.clickHero();
    test.app.handleTap({ x: 10, y: 10 }, 1_000);
    test.app.fixedUpdate(4_000);
    for (let index = 0; index < 100; index += 1) {
      test.app.fixedUpdate(100);
    }
    expect(test.onFirstPayoff).toHaveBeenCalledTimes(2);
  });

  it("reports one first payoff when two enemies are defeated in the same fixed tick", () => {
    const test = createFixture();
    fixture.onStandard!();
    fixture.injectDoubleDefeat = true;

    test.app.fixedUpdate(50);

    expect(test.onFirstPayoff).toHaveBeenCalledOnce();
    expect(test.onFirstPayoff).toHaveBeenCalledWith({
      kind: "enemy_defeated",
      enemyCount: 1,
      elapsedMs: 50,
    });

    test.app.fixedUpdate(50);
    expect(test.onFirstPayoff).toHaveBeenCalledOnce();
  });
});
