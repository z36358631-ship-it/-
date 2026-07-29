import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_IDS = [
  "hub",
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
];

const GENERATED_BUNDLE = /^(?:app|chunk)-.+\.js(?:\.map)?$|^index-.+\.css(?:\.map)?$|\.map$/u;

export async function cleanGeneratedBundles(root) {
  const removed = [];
  for (const appId of APP_IDS) {
    const appRoot = path.join(root, "dist", appId);
    const assetsRoot = path.join(appRoot, "assets");
    await rm(path.join(appRoot, "index.html"), { force: true });
    let entries = [];
    try {
      entries = await readdir(assetsRoot, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !GENERATED_BUNDLE.test(entry.name)) continue;
      const target = path.join(assetsRoot, entry.name);
      await rm(target, { force: true });
      removed.push(path.relative(root, target).replaceAll("\\", "/"));
    }
  }
  return removed.sort();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const removed = await cleanGeneratedBundles(root);
  process.stdout.write(`CLEANED_GENERATED_BUNDLES:${removed.length}\n`);
}
