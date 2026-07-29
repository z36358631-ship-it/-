import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { validateDeliveryAllowlist } from "./export-git-snapshot.mjs";

const execFileAsync = promisify(execFile);
const SINGLE_REPORT_FIELDS = Object.freeze([
  "decisionReport",
  "baselineMatrixReport",
  "collaborationReport",
  "miniProgramShellReport",
]);

async function git(repo, args, options = {}) {
  const result = await execFileAsync("git", args, {
    cwd: repo,
    encoding: options.buffer ? "buffer" : "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  return options.buffer ? result.stdout : result.stdout.trim();
}

function assertSafePackagePath(value) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.includes("\0")
    || value.includes("\\")
    || value.startsWith("/")
    || /^[a-z]:\//iu.test(value)
    || value.split("/").some((part) => part === "" || part === "." || part === "..")
    || path.posix.normalize(value) !== value
  ) {
    throw new Error(`PACKAGE_PATH_ESCAPE:${value}`);
  }
}

function assertAllowedPackageContentPath(value) {
  assertSafePackagePath(value);
  const lower = value.toLowerCase();
  const basename = path.posix.basename(lower);
  if (
    /^\.env(?:\.|$)/u.test(basename)
    || basename === "project.private.config.json"
    || /(?:^|[._-])(?:credential|credentials|secret|secrets|token|tokens)(?:[._-]|$)/u.test(basename)
    || /\.(?:pem|key|p12|pfx|jks|keystore|mobileprovision)$/u.test(basename)
    || /\.(?:map|zip|tar|tgz|gz|7z|rar)$/u.test(basename)
    || lower.includes("/node_modules/")
    || lower.startsWith("node_modules/")
    || lower.includes("/.git/")
    || lower.startsWith(".git/")
  ) {
    throw new Error(`PACKAGE_FORBIDDEN_PATH:${value}`);
  }
}

function assertNoCaseCollisions(paths) {
  const seen = new Map();
  for (const item of paths) {
    const folded = item.toLocaleLowerCase("en-US");
    const previous = seen.get(folded);
    if (previous && previous !== item) {
      throw new Error(`PACKAGE_CASE_COLLISION:${previous}:${item}`);
    }
    seen.set(folded, item);
  }
}

async function listPackageFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) throw new Error(`PACKAGE_SYMLINK:${absolute}`);
      if (metadata.isDirectory()) {
        await visit(absolute);
      } else if (metadata.isFile()) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        assertSafePackagePath(relative);
        files.push(relative);
      } else {
        throw new Error(`PACKAGE_SPECIAL_FILE:${absolute}`);
      }
    }
  }
  await visit(root);
  return files.sort((left, right) => left.localeCompare(right));
}

function sameSortedPaths(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function parseLsTreePaths(output) {
  return output
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const match = record.match(/^(\d{6}) ([^ ]+) ([0-9a-f]+)\t([\s\S]+)$/u);
      if (!match) throw new Error(`TRUSTED_TREE_INVALID:${record}`);
      return { mode: match[1], type: match[2], objectId: match[3], path: match[4] };
    });
}

function allowlistSelectors(allowlist) {
  return [
    ...allowlist.files,
    ...allowlist.runtimePaths,
    ...allowlist.reports,
    ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
    ...allowlist.documentation,
  ];
}

function reportPaths(allowlist) {
  return [
    ...allowlist.reports,
    ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
  ];
}

function collectCommitBindings(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCommitBindings(item, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (["testedSourceCommit", "buildCommit", "gitCommit"].includes(key)
      && typeof child === "string") {
      output.push({ key, value: child });
    } else {
      collectCommitBindings(child, output);
    }
  }
  return output;
}

async function assertPackagedReports(packageDir, allowlist, testedSourceCommit) {
  for (const reportPath of reportPaths(allowlist)) {
    let report;
    try {
      report = JSON.parse(await readFile(path.join(packageDir, ...reportPath.split("/")), "utf8"));
    } catch (error) {
      throw new Error(`PACKAGE_REPORT_JSON:${reportPath}:${error.message}`);
    }
    const bindings = collectCommitBindings(report);
    if (bindings.length === 0) throw new Error(`PACKAGE_REPORT_COMMIT_MISSING:${reportPath}`);
    for (const binding of bindings) {
      if (binding.value !== testedSourceCommit) {
        throw new Error(`PACKAGE_MIXED_COMMIT:${reportPath}:${binding.key}:${binding.value}`);
      }
    }
    if ("exitCode" in report && report.exitCode !== 0) {
      throw new Error(`PACKAGE_REPORT_NONZERO_EXIT:${reportPath}`);
    }
    if (report.sourceState?.testedPathsDirty === true) {
      throw new Error(`PACKAGE_REPORT_DIRTY_SOURCE:${reportPath}`);
    }
    const blocked = report.games?.find((game) => game.decision && game.decision !== "RETAIN");
    if (blocked) throw new Error(`PACKAGE_REPORT_NON_RETAIN:${reportPath}:${blocked.gameId}`);
    if ("reportCount" in report && report.reportCount !== 18) {
      throw new Error(`PACKAGE_REPORT_MATRIX_COUNT:${reportPath}`);
    }
    if ("runCount" in report && report.runCount !== 54) {
      throw new Error(`PACKAGE_REPORT_RUN_COUNT:${reportPath}`);
    }
  }
}

async function authenticateAgainstTrustedRepo(packageDir, manifest, trustedRepo) {
  const repo = path.resolve(trustedRepo);
  const packageCommit = await git(repo, [
    "rev-parse",
    "--verify",
    `${manifest.packageCommit}^{commit}`,
  ]);
  const testedSourceCommit = await git(repo, [
    "rev-parse",
    "--verify",
    `${manifest.testedSourceCommit}^{commit}`,
  ]);
  try {
    await git(repo, ["merge-base", "--is-ancestor", testedSourceCommit, packageCommit]);
  } catch {
    throw new Error("TRUSTED_TESTED_COMMIT_NOT_ANCESTOR");
  }
  const allowlistBytes = await readFile(path.join(
    packageDir,
    ...manifest.allowlistPath.split("/"),
  ));
  const trustedAllowlistBytes = await git(
    repo,
    ["show", `${packageCommit}:${manifest.allowlistPath}`],
    { buffer: true },
  );
  if (!allowlistBytes.equals(trustedAllowlistBytes)) {
    throw new Error("TRUSTED_ALLOWLIST_MISMATCH");
  }
  const allowlist = validateDeliveryAllowlist(
    JSON.parse(allowlistBytes.toString("utf8")),
  );
  const expectedReports = reportPaths(allowlist)
    .sort((left, right) => left.localeCompare(right));
  const manifestReports = [...(manifest.verificationReports ?? [])]
    .sort((left, right) => left.localeCompare(right));
  if (!sameSortedPaths(expectedReports, manifestReports)) {
    throw new Error("TRUSTED_REPORT_SET_MISMATCH");
  }
  const tree = parseLsTreePaths(await git(
    repo,
    ["ls-tree", "-r", "-z", packageCommit, "--", ...allowlistSelectors(allowlist)],
  ));
  for (const entry of tree) {
    if (entry.mode === "120000") throw new Error(`TRUSTED_SYMLINK:${entry.path}`);
    if (entry.type !== "blob") throw new Error(`TRUSTED_NON_BLOB:${entry.path}`);
  }
  const expectedPaths = tree.map((entry) => entry.path)
    .sort((left, right) => left.localeCompare(right));
  const manifestPaths = manifest.files.map((entry) => entry.path)
    .sort((left, right) => left.localeCompare(right));
  if (!sameSortedPaths(expectedPaths, manifestPaths)) {
    throw new Error("TRUSTED_ALLOWLIST_FILE_SET_MISMATCH");
  }
  const runtimeChanges = await git(repo, [
    "diff",
    "--name-only",
    testedSourceCommit,
    packageCommit,
    "--",
    ...allowlist.runtimePaths,
  ]);
  if (runtimeChanges.length > 0) {
    throw new Error(`TRUSTED_RUNTIME_CHANGED_AFTER_TEST:${runtimeChanges}`);
  }
  await assertPackagedReports(packageDir, allowlist, testedSourceCommit);
  for (const file of manifest.files) {
    const trustedBytes = await git(
      repo,
      ["show", `${packageCommit}:${file.path}`],
      { buffer: true },
    );
    const packagedBytes = await readFile(path.join(packageDir, ...file.path.split("/")));
    if (!packagedBytes.equals(trustedBytes)) {
      throw new Error(`TRUSTED_BLOB_MISMATCH:${file.path}`);
    }
    const trustedObjectId = await git(repo, [
      "rev-parse",
      `${packageCommit}:${file.path}`,
    ]);
    if (file.gitObjectId !== trustedObjectId) {
      throw new Error(`TRUSTED_OBJECT_ID_MISMATCH:${file.path}`);
    }
  }
  return true;
}

export async function verifyExtractedDelivery({ packageDir, trustedRepo = null }) {
  const root = path.resolve(packageDir);
  const manifestPath = path.join(root, "delivery-manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`DELIVERY_MANIFEST_INVALID:${error.message}`);
  }
  if (
    manifest.schemaVersion !== 1
    || manifest.scope !== "wechat-h5-v2-non-production-review"
    || !/^[0-9a-f]{40}$/u.test(manifest.packageCommit ?? "")
    || !/^[0-9a-f]{40}$/u.test(manifest.testedSourceCommit ?? "")
    || !Array.isArray(manifest.files)
    || typeof manifest.allowlistPath !== "string"
    || manifest.sourceDiff?.allowlistedPathsDirty !== false
    || manifest.sourceDiff?.runtimeChangedAfterTestedCommit !== false
  ) {
    throw new Error("DELIVERY_MANIFEST_CONTRACT");
  }
  assertAllowedPackageContentPath(manifest.allowlistPath);
  const manifestPaths = manifest.files.map((file) => file.path);
  manifestPaths.forEach(assertAllowedPackageContentPath);
  if (new Set(manifestPaths).size !== manifestPaths.length) {
    throw new Error("DELIVERY_MANIFEST_DUPLICATE_PATH");
  }
  assertNoCaseCollisions(manifestPaths);
  const actualPaths = await listPackageFiles(root);
  const expectedPaths = [...manifestPaths, "delivery-manifest.json"]
    .sort((left, right) => left.localeCompare(right));
  if (!sameSortedPaths(actualPaths, expectedPaths)) {
    throw new Error(
      `DELIVERY_FILE_SET_MISMATCH expected=${expectedPaths.join(",")} `
      + `actual=${actualPaths.join(",")}`,
    );
  }
  for (const file of manifest.files) {
    if (
      !Number.isSafeInteger(file.bytes)
      || file.bytes < 0
      || !/^[0-9a-f]{64}$/u.test(file.sha256 ?? "")
      || !/^[0-9a-f]{40}$/u.test(file.gitObjectId ?? "")
      || !["100644", "100755"].includes(file.gitMode)
    ) {
      throw new Error(`DELIVERY_FILE_CONTRACT:${file.path}`);
    }
    const bytes = await readFile(path.join(root, ...file.path.split("/")));
    if (bytes.length !== file.bytes) throw new Error(`BYTE_COUNT_MISMATCH:${file.path}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== file.sha256) throw new Error(`HASH_MISMATCH:${file.path}`);
  }
  let packagedAllowlist;
  try {
    packagedAllowlist = validateDeliveryAllowlist(JSON.parse(await readFile(
      path.join(root, ...manifest.allowlistPath.split("/")),
      "utf8",
    )));
  } catch (error) {
    throw new Error(`PACKAGE_ALLOWLIST_INVALID:${error.message}`);
  }
  const expectedReports = reportPaths(packagedAllowlist)
    .sort((left, right) => left.localeCompare(right));
  const manifestReports = [...(manifest.verificationReports ?? [])]
    .sort((left, right) => left.localeCompare(right));
  if (!sameSortedPaths(expectedReports, manifestReports)) {
    throw new Error("PACKAGE_REPORT_SET_MISMATCH");
  }
  await assertPackagedReports(root, packagedAllowlist, manifest.testedSourceCommit);
  const authenticated = trustedRepo
    ? await authenticateAgainstTrustedRepo(root, manifest, trustedRepo)
    : false;
  return {
    authenticated,
    packageCommit: manifest.packageCommit,
    testedSourceCommit: manifest.testedSourceCommit,
    fileCount: manifest.files.length,
  };
}

export async function verifySha256Sidecar(archivePath, sidecarPath) {
  const archive = path.resolve(archivePath);
  const sidecar = await readFile(sidecarPath, "utf8");
  const match = sidecar.trim().match(/^([0-9a-f]{64}) {2}([^\r\n]+)$/u);
  if (!match) throw new Error("SIDECAR_FORMAT");
  if (match[2] !== path.basename(archive)) throw new Error("SIDECAR_FILENAME");
  const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
  if (digest !== match[1]) throw new Error(`SIDECAR_MISMATCH:${match[1]}:${digest}`);
  return { sha256: digest, archive };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`INVALID_ARGUMENT:${key ?? ""}`);
    args[key.slice(2)] = value;
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.zip || args.sha256) {
    if (!args.zip || !args.sha256) throw new Error("ZIP_AND_SHA256_REQUIRED_TOGETHER");
    await verifySha256Sidecar(args.zip, args.sha256);
  }
  if (!args["package-dir"]) throw new Error("PACKAGE_DIR_REQUIRED");
  const result = await verifyExtractedDelivery({
    packageDir: args["package-dir"],
    trustedRepo: args["trusted-repo"] ?? null,
  });
  process.stdout.write(
    result.authenticated
      ? `AUTHENTICATED DELIVERY PASS | ${result.fileCount} files | ${result.packageCommit}\n`
      : `INTEGRITY PASS | UNAUTHENTICATED | ${result.fileCount} files\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
