import { describe, expect, it } from "vitest";
import type { ThreeLaneAppSnapshot } from "../../../apps/three-lane-squad/src/app/createThreeLaneApp";
import { installThreeLaneDebugApi } from "../../../apps/three-lane-squad/src/testing/debugApi";

describe("three lane debug API", () => {
  it("exposes only a frozen snapshot clone", () => {
    const state = {
      screen: "home",
      runOrdinal: 0,
      selectedHeroId: null,
      message: "ready",
      battle: null,
      save: {
        schemaVersion: 1,
        commanderLevel: 1,
        unlockedDoctrineIds: ["opening-scout"],
        unlockedBannerIds: ["default"],
        runHistory: [],
        completedDailyDates: [],
        settings: { muted: false, reducedMotion: false },
      },
      reports: [],
      transferPreview: null,
    } satisfies ThreeLaneAppSnapshot;
    const target = {} as Window;
    const dispose = installThreeLaneDebugApi(target, () => state);
    expect(Object.keys(target.__THREE_LANE_SQUAD_DEBUG__ ?? {})).toEqual(["snapshot"]);
    const snapshot = target.__THREE_LANE_SQUAD_DEBUG__!.snapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.save)).toBe(true);
    expect(() => {
      snapshot.save.settings.muted = true;
    }).toThrow();
    expect(state.save.settings.muted).toBe(false);
    dispose();
    expect(target.__THREE_LANE_SQUAD_DEBUG__).toBeUndefined();
  });
});
