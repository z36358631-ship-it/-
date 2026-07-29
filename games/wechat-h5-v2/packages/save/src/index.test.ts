import { describe, expect, it } from "vitest";
import {
  createMemorySaveAdapter,
  createSaveStore,
} from "./index";

interface Progress {
  unlocked: string[];
  runs: number;
}

describe("save store", () => {
  it("migrates one schema version at a time", async () => {
    const adapter = createMemorySaveAdapter();
    const v1 = createSaveStore<Progress>({
      gameId: "monster-night-market",
      currentSchemaVersion: 1,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {},
      adapter,
      now: () => 100,
    });
    await v1.save({ unlocked: ["grill"], runs: 1 });
    const v2 = createSaveStore<Progress>({
      gameId: "monster-night-market",
      currentSchemaVersion: 2,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {
        1: (value) => ({ ...value, unlocked: [...value.unlocked, "dessert"] }),
      },
      adapter,
      now: () => 200,
    });
    const loaded = await v2.load();
    expect(loaded.payload.unlocked).toEqual(["grill", "dessert"]);
    expect(loaded.envelope.schemaVersion).toBe(2);
  });

  it("restores the last valid backup without touching another game", async () => {
    const adapter = createMemorySaveAdapter();
    const ricochet = createSaveStore<Progress>({
      gameId: "ricochet-crew",
      currentSchemaVersion: 1,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {},
      adapter,
      now: () => 300,
    });
    const squad = createSaveStore<Progress>({
      gameId: "three-lane-squad",
      currentSchemaVersion: 1,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {},
      adapter,
      now: () => 300,
    });
    await ricochet.save({ unlocked: ["hero-a"], runs: 1 });
    await ricochet.save({ unlocked: ["hero-b"], runs: 2 });
    await squad.save({ unlocked: ["guard"], runs: 1 });
    await adapter.set("save:ricochet-crew:primary", "{broken");
    const restored = await ricochet.load();
    expect(restored.recovered).toBe(true);
    expect(restored.payload.unlocked).toEqual(["hero-a"]);
    expect((await squad.load()).payload.unlocked).toEqual(["guard"]);
  });
});
