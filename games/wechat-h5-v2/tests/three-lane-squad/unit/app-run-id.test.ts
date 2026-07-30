import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSave } from "../../../apps/three-lane-squad/src/meta/saveModel";

const home = vi.hoisted(() => ({
  onStandard: null as null | (() => void),
}));

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/HomeView",
  () => ({
    createHomeView: vi.fn((input: { onStandard: () => void }) => {
      home.onStandard = input.onStandard;
      return {};
    }),
  }),
);

vi.mock(
  "../../../apps/three-lane-squad/src/presentation/BattleScene",
  () => ({
    BattleScene: class {
      render(): void {}
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

describe("three lane squad run identity", () => {
  beforeEach(() => {
    home.onStandard = null;
  });

  it("keeps the standard seed and variant while assigning a fresh injected battle runId", () => {
    const createRunId = vi
      .fn<() => string>()
      .mockReturnValueOnce("lane-run-a")
      .mockReturnValueOnce("lane-run-b");
    const onRunStart = vi.fn();
    const host = {
      replaceChildren: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      querySelector: vi.fn(() => null),
    };
    const canvas = { hidden: false };
    const app = createThreeLaneApp({
      host: host as unknown as HTMLElement,
      canvas: canvas as unknown as HTMLCanvasElement,
      save: createDefaultSave(),
      today: "2026-07-29",
      timeScale: 1,
      persist: vi.fn(),
      onScreenChange: vi.fn(),
      onMeaningfulInput: vi.fn(),
      onRunStart,
      onRunEnd: vi.fn(),
      onPauseChange: vi.fn(),
      onMutedChange: vi.fn(),
      onReducedMotionChange: vi.fn(),
      createRunId,
    });

    expect(home.onStandard).not.toBeNull();
    home.onStandard!();
    expect(app.snapshot().battle).toMatchObject({
      seed: 73_029,
      variant: "balanced-front",
      runId: "lane-run-a",
    });
    expect(onRunStart).toHaveBeenLastCalledWith("lane-run-a", false);

    home.onStandard!();
    expect(app.snapshot().battle).toMatchObject({
      seed: 73_029,
      variant: "balanced-front",
      runId: "lane-run-b",
    });
    expect(createRunId).toHaveBeenCalledTimes(2);
  });

  it("uses a production UUID when no runId factory is injected", () => {
    const app = createThreeLaneApp({
      host: {
        replaceChildren: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        querySelector: vi.fn(() => null),
      } as unknown as HTMLElement,
      canvas: { hidden: false } as unknown as HTMLCanvasElement,
      save: createDefaultSave(),
      today: "2026-07-29",
      timeScale: 1,
      persist: vi.fn(),
      onScreenChange: vi.fn(),
      onMeaningfulInput: vi.fn(),
      onRunStart: vi.fn(),
      onRunEnd: vi.fn(),
      onPauseChange: vi.fn(),
      onMutedChange: vi.fn(),
      onReducedMotionChange: vi.fn(),
    });

    home.onStandard!();
    expect(app.snapshot().battle?.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });
});
