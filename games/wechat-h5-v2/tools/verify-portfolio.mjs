import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PORTFOLIO_GAME_IDS = Object.freeze([
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function safeRelativeAssetUrl(url) {
  return typeof url === "string"
    && url.startsWith("./")
    && !url.includes("\\")
    && !url.split("/").includes("..")
    && !/^(?:https?:|data:)/iu.test(url)
    && !/\p{Extended_Pictographic}/u.test(url);
}

export async function resolveManifestAssetPath(publicDir, manifestDir, url) {
  if (!safeRelativeAssetUrl(url)) {
    throw new Error(`unsafe asset URL: ${url}`);
  }
  const relative = url.slice(2);
  const candidates = [
    path.resolve(manifestDir, relative),
    path.resolve(publicDir, relative),
  ];
  if (relative.startsWith("assets/")) {
    candidates.push(path.resolve(manifestDir, relative.slice("assets/".length)));
  }
  const publicRoot = path.resolve(publicDir);
  for (const candidate of [...new Set(candidates)]) {
    if (!(candidate === publicRoot || candidate.startsWith(`${publicRoot}${path.sep}`))) continue;
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`missing asset: ${url}`);
}

function parseCatalog(source) {
  const entries = [];
  for (const id of PORTFOLIO_GAME_IDS) {
    const start = source.indexOf(`id: "${id}"`);
    if (start < 0) continue;
    const end = source.indexOf("\n  },", start);
    const block = source.slice(start, end < 0 ? source.length : end);
    const field = (name) => block.match(new RegExp(`${name}:\\s*"([^"]+)"`, "u"))?.[1] ?? "";
    entries.push({
      id,
      href: field("href"),
      art: field("art"),
      coreInput: field("coreInput"),
      duration: field("duration"),
    });
  }
  return entries;
}

async function validateAssetBytes(errors, asset, assetPath, prefix) {
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) {
    errors.push(`${prefix} bytes must be a positive integer`);
  } else {
    const metadata = await stat(assetPath);
    if (metadata.size !== asset.bytes) {
      errors.push(`${prefix} bytes mismatch: manifest ${asset.bytes}, file ${metadata.size}`);
    }
  }
  if (!/^[0-9a-f]{64}$/u.test(asset.sha256 ?? "")) {
    errors.push(`${prefix} sha256 must be 64 lowercase hexadecimal characters`);
  } else {
    const digest = createHash("sha256").update(await readFile(assetPath)).digest("hex");
    if (digest !== asset.sha256) errors.push(`${prefix} sha256 mismatch`);
  }
}

export async function collectPortfolioErrors({
  rootDir,
  catalog,
  expectedGameIds = PORTFOLIO_GAME_IDS,
  requireBuilds = true,
  manifests = {},
  publicDirs = {},
} = {}) {
  const errors = [];
  const root = path.resolve(rootDir);
  let resolvedCatalog = catalog;
  if (!resolvedCatalog) {
    const catalogPath = path.join(root, "apps", "hub", "src", "catalog.ts");
    try {
      resolvedCatalog = parseCatalog(await readFile(catalogPath, "utf8"));
    } catch (error) {
      return [`catalog unavailable: ${error.message}`];
    }
  }
  const catalogIds = resolvedCatalog.map((entry) => entry.id);
  if (JSON.stringify(catalogIds) !== JSON.stringify(expectedGameIds)) {
    errors.push(
      `catalog IDs must be exactly ${expectedGameIds.join(",")}; got ${catalogIds.join(",")}`,
    );
  }
  if (new Set(resolvedCatalog.map((entry) => entry.coreInput)).size !== resolvedCatalog.length) {
    errors.push("catalog coreInput values must be unique");
  }
  for (const entry of resolvedCatalog) {
    const expectedHref = `../${entry.id}/`;
    if (entry.href !== expectedHref) errors.push(`${entry.id} href must equal ${expectedHref}`);
    if (!/^\.\/assets\/[a-z0-9-]+\.webp$/u.test(entry.art ?? "")) {
      errors.push(`${entry.id} catalog art must be a local WebP path`);
    }
    if (!entry.coreInput) errors.push(`${entry.id} coreInput is required`);
    if (!entry.duration && catalog === undefined) errors.push(`${entry.id} duration is required`);
    if (catalog === undefined) {
      const artPath = path.join(root, "apps", "hub", "public", entry.art.slice(2));
      if (!(await exists(artPath))) errors.push(`${entry.id} catalog art is missing`);
    }
    if (requireBuilds) {
      const buildIndex = path.join(root, "dist", entry.id, "index.html");
      if (!(await exists(buildIndex))) errors.push(`${entry.id} build index is missing`);
    }
  }

  for (const gameId of expectedGameIds) {
    const publicDir = path.resolve(
      publicDirs[gameId] ?? path.join(root, "apps", gameId, "public"),
    );
    const manifestDir = path.join(publicDir, "assets");
    let manifest = manifests[gameId];
    if (!manifest) {
      const manifestPath = path.join(manifestDir, "asset-manifest.json");
      try {
        manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      } catch (error) {
        errors.push(`${gameId} strict asset manifest unavailable: ${error.message}`);
        continue;
      }
    }
    if (!isObject(manifest) || manifest.schemaVersion !== 1 || manifest.gameId !== gameId) {
      errors.push(`${gameId} strict asset manifest identity is invalid`);
      continue;
    }
    if (!Array.isArray(manifest.groups) || manifest.groups.length === 0) {
      errors.push(`${gameId} asset groups are missing`);
      continue;
    }
    const boot = manifest.groups.find((group) => group.id === "boot");
    if (!boot || boot.required !== true || !Array.isArray(boot.assets) || boot.assets.length === 0) {
      errors.push(`${gameId} requires a non-empty required boot asset group`);
    }
    const assetIds = new Set();
    for (const group of manifest.groups) {
      if (!Array.isArray(group.assets)) {
        errors.push(`${gameId}:${group.id} assets must be an array`);
        continue;
      }
      for (const asset of group.assets) {
        const prefix = `${gameId}:${group.id}:${asset.id ?? "unknown"}`;
        if (!asset.id || assetIds.has(asset.id)) errors.push(`${prefix} asset ID is missing/duplicate`);
        assetIds.add(asset.id);
        if (typeof asset.url === "string" && /^https?:/iu.test(asset.url)) {
          errors.push(`${prefix} remote URL is forbidden`);
          continue;
        }
        if (typeof asset.url === "string" && /^data:/iu.test(asset.url)) {
          errors.push(`${prefix} data URI is forbidden`);
          continue;
        }
        if (typeof asset.url === "string" && /\p{Extended_Pictographic}/u.test(asset.url)) {
          errors.push(`${prefix} emoji URL is forbidden`);
          continue;
        }
        let assetPath;
        try {
          assetPath = await resolveManifestAssetPath(publicDir, manifestDir, asset.url);
        } catch {
          errors.push(`${prefix} missing asset: ${asset.url}`);
          continue;
        }
        if (catalog === undefined) await validateAssetBytes(errors, asset, assetPath, prefix);
      }
    }
  }

  if (catalog === undefined) {
    try {
      const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
      const requiredScripts = ["typecheck", "test", "build", "test:e2e"];
      for (const command of requiredScripts) {
        if (!packageJson.scripts?.[command]) errors.push(`package script ${command} is required`);
      }
    } catch (error) {
      errors.push(`package.json unavailable: ${error.message}`);
    }
  }
  return errors;
}

export async function verifyPortfolio(rootDir) {
  const errors = await collectPortfolioErrors({ rootDir });
  if (errors.length > 0) {
    throw new Error(`PORTFOLIO_INVALID\n- ${errors.join("\n- ")}`);
  }
  return {
    schemaVersion: 1,
    gameIds: [...PORTFOLIO_GAME_IDS],
    gameCount: PORTFOLIO_GAME_IDS.length,
  };
}

async function main(argv) {
  if (argv.length > 1) {
    throw new Error("Usage: node verify-portfolio.mjs [wechat-h5-v2-root]");
  }
  const defaultRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const result = await verifyPortfolio(argv[0] ?? defaultRoot);
  process.stdout.write(
    `PORTFOLIO PASS | ${result.gameCount} games | local strict assets | build entries present\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
