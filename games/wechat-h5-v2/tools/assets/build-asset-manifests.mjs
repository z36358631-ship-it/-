import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function buildManifest(recipeFile, cwd = process.cwd()) {
  const recipe = JSON.parse(await readFile(recipeFile, "utf8"));
  const reportFile = path.resolve(
    cwd,
    `art/reports/${recipe.gameId}-export.json`,
  );
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  const byTarget = new Map(report.map((item) => [path.resolve(item.target), item]));
  const groups = new Map();
  for (const output of recipe.outputs) {
    const target = path.resolve(cwd, output.target);
    const exported = byTarget.get(target);
    if (!exported) throw new Error(`EXPORT_REPORT_MISSING:${output.id}`);
    const asset = {
      id: output.id,
      groupId: output.groupId,
      type: output.type,
      url: `./${path.basename(output.target)}`,
      bytes: exported.bytes,
      sha256: exported.sha256,
      width: exported.width,
      height: exported.height,
    };
    const group = groups.get(output.groupId) ?? [];
    group.push(asset);
    groups.set(output.groupId, group);
  }
  const manifest = {
    schemaVersion: 1,
    gameId: recipe.gameId,
    revision: report.map((item) => item.sha256.slice(0, 8)).join("-"),
    groups: [...groups].map(([id, assets]) => ({
      id,
      required: id === "boot",
      assets,
    })),
  };
  const target = path.resolve(
    cwd,
    `apps/${recipe.gameId}/public/assets/asset-manifest.json`,
  );
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const requested = process.argv.slice(2);
  const recipeFiles = requested.length
    ? requested
    : (await readdir("art/recipes"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => path.join("art/recipes", file));
  for (const recipeFile of recipeFiles) await buildManifest(recipeFile);
}
