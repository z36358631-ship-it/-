import { describe, expect, it } from "vitest";
import {
  GAME_EVENT_NAMES,
  GAME_IDS,
  PERFORMANCE_PROFILES,
  type AssetManifest,
  type GameEvent,
  type GameSaveEnvelope,
} from "./index";

describe("shared contracts", () => {
  it("locks game ids and common event names", () => {
    expect(GAME_IDS).toEqual([
      "hub",
      "ricochet-crew",
      "monster-night-market",
      "three-lane-squad",
    ]);
    expect(GAME_EVENT_NAMES).toContain("performance_tier_changed");
    expect(GAME_EVENT_NAMES).toContain("save_recovered");
  });

  it("locks performance budgets", () => {
    expect(PERFORMANCE_PROFILES.low).toEqual({
      dprCap: 1,
      targetFps: 30,
      particleScale: 0.5,
      postEffects: false,
    });
  });

  it("keeps save, event, and asset envelopes assignable", () => {
    const save = {} as GameSaveEnvelope<{ unlocked: string[] }>;
    const event = {} as GameEvent;
    const manifest = {} as AssetManifest;
    expect([save, event, manifest]).toHaveLength(3);
  });
});
