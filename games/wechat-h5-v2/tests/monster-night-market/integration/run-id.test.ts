import { describe, expect, it, vi } from "vitest";
import {
  bootstrapNightMarket,
  type BootstrapDeps,
} from "../../../apps/monster-night-market/src/app/bootstrap-night-market";
import { createDefaultSave } from "../../../apps/monster-night-market/src/meta/night-market-save";
import type { ViewAction } from "../../../apps/monster-night-market/src/presentation/night-market-view";
import type { InputIntent } from "@gamehub/h5-input";

function createDeps(
  createRunId?: () => string,
  now: () => number = () => 1_234,
): {
  deps: BootstrapDeps;
  beginRun: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  endRun: ReturnType<typeof vi.fn>;
  action: (action: ViewAction) => void;
  input: (intent: InputIntent) => void;
} {
  let actionHandler: (action: ViewAction) => void = () => undefined;
  let inputHandler: (intent: InputIntent) => void = () => undefined;
  const beginRun = vi.fn();
  const emit = vi.fn();
  const endRun = vi.fn();
  const view = {
    setKeyArt: vi.fn(),
    renderHome: vi.fn(),
    renderTutorial: vi.fn(),
    renderPlaying: vi.fn(),
    updateRun: vi.fn(),
    renderBoard: vi.fn(),
    renderPreview: vi.fn(),
    clearPreview: vi.fn(),
    showMessage: vi.fn(),
    animate: vi.fn(async () => undefined),
    renderResult: vi.fn(),
    renderMeta: vi.fn(),
    boardRect: vi.fn(() => ({
      x: 0,
      y: 0,
      size: 400,
    })),
    onAction: vi.fn((handler: (action: ViewAction) => void) => {
      actionHandler = handler;
    }),
  };
  const deps = {
    view,
    assets: {
      loadGroup: vi.fn(async () => undefined),
      get: vi.fn(() => "blob:keyart"),
      dispose: vi.fn(async () => undefined),
    },
    runtime: { dispose: vi.fn() },
    input: {
      setEnabled: vi.fn(),
      subscribe: vi.fn((handler: (intent: InputIntent) => void) => {
        inputHandler = handler;
        return vi.fn();
      }),
      destroy: vi.fn(),
    },
    audio: {
      unlockFromGesture: vi.fn(async () => undefined),
      play: vi.fn(),
      dispose: vi.fn(async () => undefined),
    },
    save: {
      load: vi.fn(async () => ({
        payload: createDefaultSave(),
        recovered: false,
      })),
      save: vi.fn(async () => undefined),
    },
    telemetry: {
      beginRun,
      endRun,
      emit,
      dispose: vi.fn(),
    },
    accessibility: {
      announce: vi.fn(),
      snapshot: vi.fn(() => ({ reducedMotion: false })),
      dispose: vi.fn(),
    },
    testHarness: {
      enabled: false,
      speed: 1,
      registry: {},
      expose: vi.fn(),
      dispose: vi.fn(),
    },
    now,
    ...(createRunId ? { createRunId } : {}),
  } as unknown as BootstrapDeps;

  return {
    deps,
    beginRun,
    emit,
    endRun,
    action: (action) => actionHandler(action),
    input: (intent) => inputHandler(intent),
  };
}

function swipeRowZeroRight(fixture: ReturnType<typeof createDeps>): void {
  fixture.input({
    kind: "swipe",
    start: { x: 20, y: 20, pointerId: 1, at: 1_000 },
    end: { x: 120, y: 20, pointerId: 1, at: 1_100 },
    axis: "x",
    direction: "right",
    delta: 100,
    durationMs: 100,
  });
}

describe("monster night market run identity", () => {
  it("keeps deterministic gameplay seeds while assigning a fresh injected telemetry runId", async () => {
    const createRunId = vi
      .fn<() => string>()
      .mockReturnValueOnce("night-run-a")
      .mockReturnValueOnce("night-run-b");
    const fixture = createDeps(createRunId);
    const app = await bootstrapNightMarket(fixture.deps);

    fixture.action("start");
    fixture.action("tutorialContinue");
    await vi.waitFor(() => {
      expect(fixture.beginRun).toHaveBeenCalledWith("night-run-a");
    });
    expect(app.snapshot().run?.seed).toBe("normal:1234");

    fixture.action("finishEarly");
    await vi.waitFor(() => {
      expect(app.snapshot().screen).toBe("result");
    });
    fixture.action("replay");
    await vi.waitFor(() => {
      expect(fixture.beginRun).toHaveBeenLastCalledWith("night-run-b");
    });

    expect(createRunId).toHaveBeenCalledTimes(2);
    expect(app.snapshot().run?.seed).toBe("normal:1234:retry:2");
  });

  it("uses a production UUID when no runId factory is injected", async () => {
    const fixture = createDeps();
    await bootstrapNightMarket(fixture.deps);

    fixture.action("start");
    fixture.action("tutorialContinue");
    await vi.waitFor(() => {
      expect(fixture.beginRun).toHaveBeenCalledOnce();
    });

    expect(fixture.beginRun.mock.calls[0]?.[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });

  it("emits first-input and first-payoff once per run and resets them on replay", async () => {
    const fixture = createDeps(() => `run-${fixture.beginRun.mock.calls.length + 1}`);
    await bootstrapNightMarket(fixture.deps);

    fixture.action("start");
    fixture.action("tutorialContinue");
    await vi.waitFor(() => expect(fixture.beginRun).toHaveBeenCalledOnce());

    swipeRowZeroRight(fixture);
    swipeRowZeroRight(fixture);
    await vi.waitFor(() => {
      expect(
        fixture.emit.mock.calls.filter(([event]) => event === "first_input"),
      ).toHaveLength(1);
      expect(
        fixture.emit.mock.calls.filter(([event]) => event === "first_payoff"),
      ).toHaveLength(1);
    });

    fixture.action("finishEarly");
    await vi.waitFor(() => {
      expect(fixture.endRun).toHaveBeenLastCalledWith(
        expect.objectContaining({ result: "won" }),
      );
    });
    fixture.action("replay");
    await vi.waitFor(() => expect(fixture.beginRun).toHaveBeenCalledTimes(2));
    swipeRowZeroRight(fixture);
    await vi.waitFor(() => {
      expect(
        fixture.emit.mock.calls.filter(([event]) => event === "first_input"),
      ).toHaveLength(2);
      expect(
        fixture.emit.mock.calls.filter(([event]) => event === "first_payoff"),
      ).toHaveLength(2);
    });
  });

  it("measures telemetry elapsed time on the same wall-clock as run start", async () => {
    let wallClock = 50_000;
    const fixture = createDeps(
      () => "clock-run",
      () => wallClock,
    );
    await bootstrapNightMarket(fixture.deps);

    fixture.action("start");
    fixture.action("tutorialContinue");
    await vi.waitFor(() => expect(fixture.beginRun).toHaveBeenCalledOnce());

    wallClock = 51_250;
    swipeRowZeroRight(fixture);
    await vi.waitFor(() => {
      expect(fixture.emit).toHaveBeenCalledWith(
        "first_input",
        expect.objectContaining({ elapsedMs: 1_250 }),
      );
      expect(fixture.emit).toHaveBeenCalledWith(
        "first_payoff",
        expect.objectContaining({ elapsedMs: 1_250 }),
      );
    });
  });

  it("ends an unserved run as lost without fabricating first payoff", async () => {
    const fixture = createDeps(() => "unserved-run");
    await bootstrapNightMarket(fixture.deps);

    fixture.action("start");
    fixture.action("tutorialContinue");
    await vi.waitFor(() => expect(fixture.beginRun).toHaveBeenCalledOnce());
    fixture.action("finishEarly");

    await vi.waitFor(() => {
      expect(fixture.endRun).toHaveBeenCalledWith(
        expect.objectContaining({ result: "lost" }),
      );
    });
    expect(
      fixture.emit.mock.calls.some(([event]) => event === "first_payoff"),
    ).toBe(false);
  });
});
