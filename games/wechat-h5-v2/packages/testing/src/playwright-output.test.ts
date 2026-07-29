import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const configs = [
  "playwright.config.ts",
  "tests/monster-night-market/playwright.config.ts",
  "tests/ricochet-crew/playwright.config.ts",
  "tests/three-lane-squad/playwright.config.ts",
];

describe("Playwright evidence isolation", () => {
  it("keeps runner cleanup away from AI playtest evidence", async () => {
    for (const config of configs) {
      const source = await readFile(config, "utf8");
      expect(source, `${config} needs an explicit outputDir`).toMatch(
        /outputDir:\s*["'][^"']+["']/,
      );
      expect(source).not.toMatch(
        /outputDir:\s*["'][^"']*ai-playtests/i,
      );
    }
  });
});
