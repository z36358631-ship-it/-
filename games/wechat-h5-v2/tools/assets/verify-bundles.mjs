import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const appIds = [
  "hub",
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
];

async function filesUnder(root) {
  const output = [];
  for (const name of await readdir(root)) {
    const absolute = path.join(root, name);
    if ((await stat(absolute)).isDirectory()) {
      output.push(...await filesUnder(absolute));
    } else {
      output.push(absolute);
    }
  }
  return output;
}

for (const appId of appIds) {
  const root = path.resolve("dist", appId);
  const indexFile = path.join(root, "index.html");
  const index = await readFile(indexFile, "utf8");
  if (!index.includes("./assets/")) {
    throw new Error(`BUNDLE_RELATIVE_ASSETS_MISSING:${appId}`);
  }
  const files = await filesUnder(root);
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (relative.startsWith("../") || path.isAbsolute(relative)) {
      throw new Error(`BUNDLE_PATH_ESCAPE:${appId}:${relative}`);
    }
    if (relative.endsWith(".map")) {
      throw new Error(`BUNDLE_SOURCE_MAP_FORBIDDEN:${appId}:${relative}`);
    }
  }
  const manifestFile = path.join(root, "assets", "asset-manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  if (manifest.gameId !== appId) {
    throw new Error(
      `BUNDLE_MANIFEST_GAME_ID:${appId}:${manifest.gameId}`,
    );
  }
  for (const group of manifest.groups) {
    for (const asset of group.assets) {
      if (
        /^https?:/i.test(asset.url) ||
        asset.url.includes("..") ||
        asset.url.includes("\\")
      ) {
        throw new Error(`BUNDLE_ASSET_URL:${appId}:${asset.url}`);
      }
    }
  }
}

process.stdout.write("BUNDLE_BOUNDARIES_OK 4 apps\n");
