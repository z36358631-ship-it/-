import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  exportGitSnapshot,
  validateDeliveryAllowlist,
} from "../../tools/export-git-snapshot.mjs";
import {
  verifyExtractedDelivery,
  verifySha256Sidecar,
} from "../../tools/verify-delivery.mjs";

const execFileAsync = promisify(execFile);

async function git(repo, args, input) {
  const result = await execFileAsync("git", args, {
    cwd: repo,
    input,
    encoding: "utf8",
  });
  return result.stdout.trim();
}

async function writeJson(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

async function createFixtureRepository() {
  const repo = await mkdtemp(path.join(tmpdir(), "delivery-repo-"));
  await git(repo, ["init"]);
  await git(repo, ["config", "user.email", "delivery@example.test"]);
  await git(repo, ["config", "user.name", "Delivery Fixture"]);
  await mkdir(path.join(repo, "runtime"), { recursive: true });
  await mkdir(path.join(repo, "notes"), { recursive: true });
  await writeFile(path.join(repo, "runtime", "index.html"), "<h1>fixture</h1>\n");
  await writeFile(path.join(repo, "notes", "readme.md"), "# Fixture\n");
  await git(repo, ["add", "--", "runtime/index.html", "notes/readme.md"]);
  await git(repo, ["commit", "-m", "source"]);
  const sourceCommit = await git(repo, ["rev-parse", "HEAD"]);

  const allowlist = {
    schemaVersion: 1,
    scope: "wechat-h5-v2-non-production-review",
    files: ["delivery-allowlist.json"],
    runtimePaths: ["runtime"],
    reports: ["reports/verification.json"],
    decisionReport: "reports/decision.json",
    baselineMatrixReport: "reports/matrix.json",
    collaborationReport: "reports/collaboration.json",
    miniProgramShellReport: "reports/miniprogram-shell.json",
    documentation: ["notes/readme.md"],
  };
  const report = {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    exitCode: 0,
  };
  await writeJson(path.join(repo, "delivery-allowlist.json"), allowlist);
  await writeJson(path.join(repo, "reports", "verification.json"), report);
  await writeJson(path.join(repo, "reports", "decision.json"), {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    games: [{ gameId: "fixture", decision: "RETAIN", buildCommit: sourceCommit }],
  });
  await writeJson(path.join(repo, "reports", "matrix.json"), {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    buildCommit: sourceCommit,
  });
  await writeJson(path.join(repo, "reports", "collaboration.json"), {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    verifiedActiveUnionMinutes: 480,
  });
  await writeJson(path.join(repo, "reports", "miniprogram-shell.json"), {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    exitCode: 0,
  });
  await git(repo, ["add", "--", "delivery-allowlist.json", "reports"]);
  await git(repo, ["commit", "-m", "evidence"]);
  const packageCommit = await git(repo, ["rev-parse", "HEAD"]);
  return { repo, allowlist, sourceCommit, packageCommit };
}

test("allowlist rejects traversal, absolute paths, secrets, private config and case collisions", () => {
  const base = {
    schemaVersion: 1,
    scope: "wechat-h5-v2-non-production-review",
    files: ["delivery-allowlist.json"],
    runtimePaths: ["runtime"],
    reports: [],
    decisionReport: null,
    baselineMatrixReport: null,
    collaborationReport: null,
    miniProgramShellReport: null,
    documentation: [],
  };
  for (const badPath of [
    "../escape.txt",
    "/absolute.txt",
    "C:/drive.txt",
    "runtime\\windows.txt",
    ".env",
    "runtime/project.private.config.json",
    "runtime/client-secret.json",
    "runtime/app.js.map",
  ]) {
    assert.throws(
      () => validateDeliveryAllowlist({ ...base, files: [...base.files, badPath] }),
      /ALLOWLIST_/,
      badPath,
    );
  }
  assert.throws(
    () => validateDeliveryAllowlist({
      ...base,
      files: [...base.files, "runtime/Readme.txt", "runtime/README.txt"],
    }),
    /CASE_COLLISION/,
  );
});

test("exports only committed Git blobs and authenticates every byte against the trusted repo", async () => {
  const fixture = await createFixtureRepository();
  const output = path.join(await mkdtemp(path.join(tmpdir(), "delivery-output-")), "payload");
  const manifest = await exportGitSnapshot({
    repo: fixture.repo,
    allowlistPath: "delivery-allowlist.json",
    packageCommit: fixture.packageCommit,
    testedSourceCommit: fixture.sourceCommit,
    output,
  });
  assert.equal(manifest.packageCommit, fixture.packageCommit);
  assert.equal(manifest.testedSourceCommit, fixture.sourceCommit);
  assert.equal(manifest.sourceDiff.allowlistedPathsDirty, false);
  assert.ok(manifest.files.some(({ path: filePath }) => filePath === "runtime/index.html"));

  const verified = await verifyExtractedDelivery({
    packageDir: output,
    trustedRepo: fixture.repo,
  });
  assert.equal(verified.authenticated, true);
  assert.equal(verified.fileCount, manifest.files.length);

  await writeFile(path.join(output, "runtime", "index.html"), "<h1>tampered</h1>\n");
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: output, trustedRepo: fixture.repo }),
    /(?:BYTE_COUNT|HASH)_MISMATCH/,
  );
});

test("rejects dirty allowlisted paths, existing output and mixed report commits", async () => {
  const fixture = await createFixtureRepository();
  await writeFile(path.join(fixture.repo, "runtime", "index.html"), "<h1>dirty</h1>\n");
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: fixture.packageCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: path.join(fixture.repo, "out-dirty"),
    }),
    /DIRTY_ALLOWLISTED_PATH/,
  );
  await git(fixture.repo, ["restore", "--", "runtime/index.html"]);

  const existing = path.join(fixture.repo, "existing");
  await mkdir(existing);
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: fixture.packageCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: existing,
    }),
    /OUTPUT_EXISTS/,
  );

  const decisionPath = path.join(fixture.repo, "reports", "decision.json");
  const decision = JSON.parse(await readFile(decisionPath, "utf8"));
  decision.games[0].buildCommit = "f".repeat(40);
  await writeJson(decisionPath, decision);
  await git(fixture.repo, ["add", "--", "reports/decision.json"]);
  await git(fixture.repo, ["commit", "-m", "mixed commit"]);
  const mixedPackageCommit = await git(fixture.repo, ["rev-parse", "HEAD"]);
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: mixedPackageCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: path.join(fixture.repo, "out-mixed"),
    }),
    /MIXED_COMMIT/,
  );
});

test("rejects Git symlinks and forbidden private files hidden under an allowed tree", async () => {
  const fixture = await createFixtureRepository();
  const blob = await git(fixture.repo, ["hash-object", "-w", "runtime/index.html"]);
  await git(fixture.repo, [
    "update-index",
    "--add",
    "--cacheinfo",
    `120000,${blob},runtime/link`,
  ]);
  await git(fixture.repo, ["commit", "-m", "symlink"]);
  const symlinkCommit = await git(fixture.repo, ["rev-parse", "HEAD"]);
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: symlinkCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: path.join(fixture.repo, "out-symlink"),
    }),
    /SYMLINK/,
  );

  await git(fixture.repo, ["rm", "--cached", "runtime/link"]);
  await writeFile(path.join(fixture.repo, "runtime", "project.private.config.json"), "{}\n");
  await git(fixture.repo, ["add", "--", "runtime/project.private.config.json"]);
  await git(fixture.repo, ["commit", "-m", "private config"]);
  const privateCommit = await git(fixture.repo, ["rev-parse", "HEAD"]);
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: privateCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: path.join(fixture.repo, "out-private"),
    }),
    /FORBIDDEN_PATH/,
  );
});

test("verifies SHA-256 sidecars and rejects mismatches", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "delivery-sidecar-"));
  const archive = path.join(root, "review.zip");
  const sidecar = `${archive}.sha256`;
  await writeFile(archive, "fixture archive");
  const { createHash } = await import("node:crypto");
  const digest = createHash("sha256").update("fixture archive").digest("hex");
  await writeFile(sidecar, `${digest}  review.zip\n`);
  assert.equal((await verifySha256Sidecar(archive, sidecar)).sha256, digest);
  await writeFile(sidecar, `${"0".repeat(64)}  review.zip\n`);
  await assert.rejects(verifySha256Sidecar(archive, sidecar), /SIDECAR_MISMATCH/);
});

test("rejects forged package traversal and credentials even without a trusted repository", async () => {
  const fixture = await createFixtureRepository();
  const root = await mkdtemp(path.join(tmpdir(), "delivery-forged-"));
  const escapedOutput = path.join(root, "escaped");
  await exportGitSnapshot({
    repo: fixture.repo,
    allowlistPath: "delivery-allowlist.json",
    packageCommit: fixture.packageCommit,
    testedSourceCommit: fixture.sourceCommit,
    output: escapedOutput,
  });
  const escapedManifestPath = path.join(escapedOutput, "delivery-manifest.json");
  const escapedManifest = JSON.parse(await readFile(escapedManifestPath, "utf8"));
  escapedManifest.files[0].path = "../outside.txt";
  await writeJson(escapedManifestPath, escapedManifest);
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: escapedOutput }),
    /PACKAGE_PATH_ESCAPE/,
  );

  const credentialOutput = path.join(root, "credential");
  await exportGitSnapshot({
    repo: fixture.repo,
    allowlistPath: "delivery-allowlist.json",
    packageCommit: fixture.packageCommit,
    testedSourceCommit: fixture.sourceCommit,
    output: credentialOutput,
  });
  const credentialPath = path.join(credentialOutput, ".env");
  await writeFile(credentialPath, "TOKEN=forged\n");
  const credentialBytes = await readFile(credentialPath);
  const { createHash } = await import("node:crypto");
  const credentialManifestPath = path.join(credentialOutput, "delivery-manifest.json");
  const credentialManifest = JSON.parse(await readFile(credentialManifestPath, "utf8"));
  credentialManifest.files.push({
    path: ".env",
    bytes: credentialBytes.length,
    sha256: createHash("sha256").update(credentialBytes).digest("hex"),
    gitMode: "100644",
    gitObjectId: "0".repeat(40),
  });
  await writeJson(credentialManifestPath, credentialManifest);
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: credentialOutput }),
    /PACKAGE_FORBIDDEN_PATH/,
  );
});

test("PowerShell publisher requires a frozen commit and publishes without overwrite", async () => {
  const scriptPath = new URL("../../tools/build-delivery.ps1", import.meta.url);
  const script = await readFile(scriptPath, "utf8");
  assert.match(script, /\[Parameter\(Mandatory = \$true\)\][\s\S]*\$TestedSourceCommit/u);
  assert.match(script, /DELIVERY_OUTPUT_EXISTS/u);
  assert.doesNotMatch(script, /Move-Item[^\r\n]*-Force/u);
  const sidecarMove = script.indexOf(
    "Move-Item -LiteralPath $candidateSidecar -Destination $finalSidecar",
  );
  const archiveMove = script.indexOf(
    "Move-Item -LiteralPath $candidateArchive -Destination $finalArchive",
  );
  assert.ok(sidecarMove >= 0 && archiveMove > sidecarMove);
});
