import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BOOT_LIMIT = 5_000_000;
const RUN_LIMIT = 18_000_000;
const TEXTURE_LIMIT = 80 * 1024 * 1024;

export async function validateRuntimeAssets({ root, manifest, provenance }) {
  const errors = [];
  const allAssets = manifest.groups.flatMap((group) => group.assets);
  const bootBytes =
    manifest.groups.find((group) => group.id === "boot")?.assets.reduce(
      (sum, asset) => sum + asset.bytes,
      0,
    ) ?? 0;
  const runBytes = allAssets.reduce((sum, asset) => sum + asset.bytes, 0);
  const textureBytes = allAssets.reduce(
    (sum, asset) =>
      sum + (asset.width && asset.height ? asset.width * asset.height * 4 : 0),
    0,
  );
  if (bootBytes > BOOT_LIMIT) errors.push(`BOOT_BYTES:${bootBytes}>${BOOT_LIMIT}`);
  if (runBytes > RUN_LIMIT) errors.push(`RUN_BYTES:${runBytes}>${RUN_LIMIT}`);
  if (textureBytes > TEXTURE_LIMIT) {
    errors.push(`TEXTURE_BYTES:${textureBytes}>${TEXTURE_LIMIT}`);
  }
  const provenanceById = new Map(provenance.map((item) => [item.id, item]));
  for (const asset of allAssets) {
    if (
      (asset.width ?? 0) > 2048 ||
      (asset.height ?? 0) > 2048
    ) {
      errors.push(`ATLAS_DIMENSION:${asset.id}`);
    }
    if (
      asset.frameRate !== undefined &&
      (asset.frameRate < 8 || asset.frameRate > 12)
    ) {
      errors.push(`ANIMATION_FPS:${asset.id}`);
    }
    const file = path.resolve(root, asset.url);
    try {
      const bytes = await readFile(file);
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hash !== asset.sha256) errors.push(`HASH_MISMATCH:${asset.id}`);
      if (bytes.length !== asset.bytes) errors.push(`BYTE_MISMATCH:${asset.id}`);
    } catch {
      errors.push(`FILE_MISSING:${asset.id}`);
    }
    const source = provenanceById.get(asset.id);
    if (
      !source ||
      !["retouched", "approved"].includes(source.humanRevisionStatus)
    ) {
      errors.push(`PROVENANCE_NOT_APPROVED:${asset.id}`);
    }
  }
  return { errors, bootBytes, runBytes, textureBytes };
}

export async function validateApp(gameId, cwd = process.cwd()) {
  const assets = path.resolve(cwd, `apps/${gameId}/public/assets`);
  const manifest = JSON.parse(
    await readFile(path.join(assets, "asset-manifest.json"), "utf8"),
  );
  const provenance = JSON.parse(
    await readFile(
      path.resolve(cwd, `art/provenance/${gameId}.json`),
      "utf8",
    ),
  );
  const result = await validateRuntimeAssets({
    root: assets,
    manifest,
    provenance,
  });
  if (result.errors.length) {
    throw new Error(
      `ASSET_VALIDATION_FAILED:${gameId}\n${result.errors.join("\n")}`,
    );
  }
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const requested = process.argv.slice(2);
  const gameIds = requested.length
    ? requested
    : (await readdir("art/recipes"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => path.basename(file, ".json"));
  for (const gameId of gameIds) await validateApp(gameId);
}
