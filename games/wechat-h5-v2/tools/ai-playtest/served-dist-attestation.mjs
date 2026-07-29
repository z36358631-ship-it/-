import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { GAME_IDS } from "../validate-ai-playtest-report.mjs";

const execFileAsync = promisify(execFile);
const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;

async function readCommittedDistFiles(expectedCommit, gameId) {
  const prefix = `dist/${gameId}/`;
  const treeResult = await execFileAsync(
    "git",
    ["ls-tree", "-r", "-z", expectedCommit, "--", prefix],
    {
      cwd: SOURCE_ROOT,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  const entries = treeResult.stdout
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const match = /^([0-9]{6}) blob ([0-9a-f]{40})\t(.+)$/u.exec(line);
      if (!match || !match[3].startsWith(prefix)) {
        throw new Error(`AI_PLAYTEST_DIST_TREE_INVALID:${line}`);
      }
      return {
        mode: match[1],
        objectId: match[2],
        path: match[3],
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  if (entries.length === 0) {
    throw new Error(`AI_PLAYTEST_DIST_TREE_EMPTY:${expectedCommit}:${gameId}`);
  }
  return Promise.all(entries.map(async (entry) => {
    const blobResult = await execFileAsync(
      "git",
      ["cat-file", "blob", entry.objectId],
      {
        cwd: SOURCE_ROOT,
        encoding: null,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    return {
      ...entry,
      bytes: Buffer.isBuffer(blobResult.stdout)
        ? blobResult.stdout
        : Buffer.from(blobResult.stdout),
    };
  }));
}

export async function verifyServedDistFiles({
  expectedCommit,
  gameId,
  files,
  fetchImpl = globalThis.fetch,
}) {
  if (!COMMIT_PATTERN.test(expectedCommit ?? "")) {
    throw new Error("AI_PLAYTEST_EXPECTED_COMMIT_REQUIRED");
  }
  if (!GAME_IDS.includes(gameId)) throw new Error(`invalid gameId: ${gameId}`);
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("AI_PLAYTEST_DIST_FILES_REQUIRED");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("AI_PLAYTEST_FETCH_UNAVAILABLE");
  }
  const prefix = `dist/${gameId}/`;
  const records = [];
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    if (!file.path.startsWith(prefix) || !Buffer.isBuffer(file.bytes)) {
      throw new Error(`AI_PLAYTEST_DIST_FILE_INVALID:${file.path ?? "unknown"}`);
    }
    const relativePath = file.path.slice("dist/".length);
    const url = new URL(
      relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/"),
      "http://127.0.0.1:4173/",
    ).href;
    let response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        redirect: "error",
        cache: "no-store",
      });
    } catch (error) {
      throw new Error(
        `AI_PLAYTEST_SERVED_DIST_FETCH:${relativePath}:`
        + `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response?.ok) {
      throw new Error(
        `AI_PLAYTEST_SERVED_DIST_HTTP:${relativePath}:${response?.status ?? "unavailable"}`,
      );
    }
    const servedBytes = Buffer.from(await response.arrayBuffer());
    const expectedSha256 = createHash("sha256").update(file.bytes).digest("hex");
    const servedSha256 = createHash("sha256").update(servedBytes).digest("hex");
    if (servedSha256 !== expectedSha256) {
      throw new Error(
        `AI_PLAYTEST_SERVED_DIST_HASH_MISMATCH:${relativePath}:`
        + `expected ${expectedSha256}, got ${servedSha256}`,
      );
    }
    records.push(Object.freeze({
      path: file.path,
      url,
      bytes: file.bytes.length,
      sha256: expectedSha256,
    }));
  }
  const aggregateSha256 = createHash("sha256")
    .update(JSON.stringify(records))
    .digest("hex");
  const frozenFiles = Object.freeze(records);
  return Object.freeze({
    schemaVersion: 1,
    expectedCommit,
    gameId,
    origin: "http://127.0.0.1:4173",
    fileCount: frozenFiles.length,
    aggregateSha256,
    files: frozenFiles,
    verifiedAt: new Date().toISOString(),
  });
}

export async function attestServedDist(expectedCommit, gameId) {
  return verifyServedDistFiles({
    expectedCommit,
    gameId,
    files: await readCommittedDistFiles(expectedCommit, gameId),
  });
}
