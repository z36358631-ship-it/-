import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export async function exportRecipe(recipe) {
  await mkdir(path.dirname(recipe.target), { recursive: true });
  const pipeline = sharp(recipe.source)
    .rotate()
    .resize(recipe.width, recipe.height, {
      fit: recipe.fit,
      position: "centre",
      withoutEnlargement: false,
    });
  if (recipe.format === "png") {
    pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  } else {
    pipeline.webp({ quality: recipe.quality, effort: 6, smartSubsample: true });
  }
  await pipeline.toFile(recipe.target);
  const bytes = await readFile(recipe.target);
  return {
    target: recipe.target,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    width: recipe.width,
    height: recipe.height,
  };
}

export async function exportRecipeFile(recipeFile, cwd = process.cwd()) {
  const parsed = JSON.parse(await readFile(recipeFile, "utf8"));
  const results = [];
  for (const output of parsed.outputs) {
    results.push(
      await exportRecipe({
        ...output,
        source: path.resolve(cwd, output.source),
        target: path.resolve(cwd, output.target),
      }),
    );
  }
  const reportFile = path.resolve(
    cwd,
    `art/reports/${parsed.gameId}-export.json`,
  );
  await mkdir(path.dirname(reportFile), { recursive: true });
  await writeFile(reportFile, `${JSON.stringify(results, null, 2)}\n`);
  return results;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const requested = process.argv.slice(2);
  const files = requested.length
    ? requested
    : (await readdir("art/recipes"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => path.join("art/recipes", file));
  for (const file of files) await exportRecipeFile(file);
}
