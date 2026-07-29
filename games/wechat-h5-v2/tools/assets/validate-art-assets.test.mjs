import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { validateRuntimeAssets } from "./validate-art-assets.mjs";

test("rejects an atlas wider than 2048px", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-budget-"));
  const asset = path.join(root, "wide.png");
  await sharp({
    create: {
      width: 2049,
      height: 64,
      channels: 4,
      background: "#ffffff",
    },
  }).png().toFile(asset);
  const result = await validateRuntimeAssets({
    root,
    manifest: {
      schemaVersion: 1,
      gameId: "hub",
      revision: "fixture",
      groups: [{
        id: "boot",
        required: true,
        assets: [{
          id: "wide",
          groupId: "boot",
          type: "texture",
          url: "wide.png",
          bytes: 1,
          sha256: "0".repeat(64),
          width: 2049,
          height: 64,
        }],
      }],
    },
    provenance: [],
  });
  assert(result.errors.some((error) => error.includes("ATLAS_DIMENSION:wide")));
});

test("rejects a boot group above 5MB", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-boot-"));
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "large.bin"), Buffer.alloc(5_000_001));
  const result = await validateRuntimeAssets({
    root,
    manifest: {
      schemaVersion: 1,
      gameId: "hub",
      revision: "fixture",
      groups: [{
        id: "boot",
        required: true,
        assets: [{
          id: "large",
          groupId: "boot",
          type: "json",
          url: "large.bin",
          bytes: 5_000_001,
          sha256: "0".repeat(64),
        }],
      }],
    },
    provenance: [],
  });
  assert(result.errors.includes("BOOT_BYTES:5000001>5000000"));
});
