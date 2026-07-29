import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { exportRecipe } from "./export-art-assets.mjs";

test("exports a bounded webp runtime image and reports dimensions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-art-"));
  const source = path.join(root, "source.png");
  const target = path.join(root, "runtime.webp");
  await sharp({
    create: {
      width: 2400,
      height: 1600,
      channels: 4,
      background: "#5b3f91",
    },
  }).png().toFile(source);
  const result = await exportRecipe({
    source,
    target,
    width: 960,
    height: 540,
    fit: "cover",
    format: "webp",
    quality: 88,
  });
  const metadata = await sharp(await readFile(target)).metadata();
  assert.deepEqual(
    { width: metadata.width, height: metadata.height, format: metadata.format },
    { width: 960, height: 540, format: "webp" },
  );
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});
