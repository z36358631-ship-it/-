import { describe, expect, it } from "vitest";
import { GAME_CATALOG } from "./catalog";

describe("hub catalog", () => {
  it("publishes exactly three distinct games", () => {
    expect(GAME_CATALOG.map((game) => game.id)).toEqual([
      "ricochet-crew",
      "monster-night-market",
      "three-lane-squad",
    ]);
    expect(new Set(GAME_CATALOG.map((game) => game.coreInput)).size).toBe(3);
  });

  it("uses sibling routes and local card art only", () => {
    for (const game of GAME_CATALOG) {
      expect(game.href).toBe(`../${game.id}/`);
      expect(game.art).toMatch(/^\.\/assets\/[a-z-]+\.webp$/);
      expect(game.art).not.toContain(game.id === "ricochet-crew"
        ? "night-market"
        : "ricochet-card");
    }
  });
});
