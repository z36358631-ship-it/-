import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cleanGeneratedBundles } from "./clean-dist-bundles.mjs";

test("removes only generated bundles and preserves runtime art", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-clean-bundles-"));
  const assets = path.join(root, "dist", "hub", "assets");
  await mkdir(assets, { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "dist", "hub", "index.html"), "old html"),
    writeFile(path.join(assets, "app-old.js"), "old js"),
    writeFile(path.join(assets, "app-old.js.map"), "old map"),
    writeFile(path.join(assets, "index-old.css"), "old css"),
    writeFile(path.join(assets, "hub-key-art.webp"), "keep art"),
    writeFile(path.join(assets, "asset-manifest.json"), "keep manifest"),
  ]);

  const removed = await cleanGeneratedBundles(root);

  assert.deepEqual(removed, [
    "dist/hub/assets/app-old.js",
    "dist/hub/assets/app-old.js.map",
    "dist/hub/assets/index-old.css",
  ]);
  await assert.rejects(readFile(path.join(root, "dist", "hub", "index.html")));
  assert.equal(await readFile(path.join(assets, "hub-key-art.webp"), "utf8"), "keep art");
  assert.equal(await readFile(path.join(assets, "asset-manifest.json"), "utf8"), "keep manifest");
});
