import { describe, expect, it } from "vitest";
import path from "node:path";
import { createAppViteConfig } from "./vite.app.config";

describe("app vite config", () => {
  it("builds each app to its own directory without asset inlining", () => {
    const appDir = path.resolve("apps/ricochet-crew");
    const config = createAppViteConfig(appDir, "ricochet-crew");
    expect(config.base).toBe("./");
    expect(config.build?.assetsInlineLimit).toBe(0);
    expect(config.build?.sourcemap).toBe(false);
    expect(config.build?.outDir).toBe(
      path.resolve("dist/ricochet-crew"),
    );
  });
});
