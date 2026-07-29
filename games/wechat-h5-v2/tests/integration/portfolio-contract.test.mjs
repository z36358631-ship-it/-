import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  collectPortfolioErrors,
  resolveManifestAssetPath,
} from "../../tools/verify-portfolio.mjs";

describe("portfolio verifier", () => {
  it("resolves both manifest-relative and public-root asset URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "portfolio-assets-"));
    const publicDir = join(root, "public");
    const manifestDir = join(publicDir, "assets");
    await mkdir(join(manifestDir, "concept"), { recursive: true });
    await writeFile(join(manifestDir, "concept", "keyart.png"), "fixture");

    await expect(resolveManifestAssetPath(
      publicDir,
      manifestDir,
      "./concept/keyart.png",
    )).resolves.toBe(join(manifestDir, "concept", "keyart.png"));

    await expect(resolveManifestAssetPath(
      publicDir,
      manifestDir,
      "./assets/concept/keyart.png",
    )).resolves.toBe(join(manifestDir, "concept", "keyart.png"));
  });

  it("rejects remote, data, emoji and missing asset URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "portfolio-invalid-"));
    const publicDir = join(root, "public");
    const manifestDir = join(publicDir, "assets");
    await mkdir(manifestDir, { recursive: true });
    const errors = await collectPortfolioErrors({
      rootDir: root,
      catalog: [{
        id: "fixture-game",
        href: "../fixture-game/",
        art: "./assets/fixture.webp",
        coreInput: "tap",
      }],
      expectedGameIds: ["fixture-game"],
      requireBuilds: false,
      manifests: {
        "fixture-game": {
          schemaVersion: 1,
          gameId: "fixture-game",
          groups: [{
            id: "boot",
            required: true,
            assets: [
              { id: "remote", url: "https://example.test/a.png" },
              { id: "inline", url: "data:image/png;base64,AA==" },
              { id: "emoji", url: "./concept/🔥.png" },
              { id: "missing", url: "./concept/missing.png" },
            ],
          }],
        },
      },
      publicDirs: { "fixture-game": publicDir },
    });

    expect(errors.join("\n")).toMatch(/remote URL/i);
    expect(errors.join("\n")).toMatch(/data URI/i);
    expect(errors.join("\n")).toMatch(/emoji/i);
    expect(errors.join("\n")).toMatch(/missing asset/i);
  });
});
