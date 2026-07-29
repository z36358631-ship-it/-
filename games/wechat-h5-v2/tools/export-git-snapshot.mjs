import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const REVIEW_SCOPE = "wechat-h5-v2-non-production-review";
const SINGLE_REPORT_FIELDS = Object.freeze([
  "decisionReport",
  "baselineMatrixReport",
  "collaborationReport",
  "miniProgramShellReport",
]);
const ARRAY_FIELDS = Object.freeze([
  "files",
  "runtimePaths",
  "reports",
  "documentation",
]);

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function git(repo, args, options = {}) {
  const result = await execFileAsync("git", args, {
    cwd: repo,
    encoding: options.buffer ? "buffer" : "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
  return options.buffer ? result.stdout : result.stdout.trim();
}

function assertSafeRepoPath(value, code = "ALLOWLIST_PATH") {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${code}_EMPTY`);
  }
  if (
    value.includes("\0")
    || value.includes("\\")
    || value.startsWith("/")
    || /^[a-z]:\//iu.test(value)
    || value.split("/").some((part) => part === "" || part === "." || part === "..")
    || path.posix.normalize(value) !== value
  ) {
    throw new Error(`${code}_UNSAFE:${value}`);
  }
}

function assertAllowedContentPath(value, code = "ALLOWLIST_FORBIDDEN_PATH") {
  assertSafeRepoPath(value);
  const lower = value.toLowerCase();
  const basename = path.posix.basename(lower);
  const forbidden = (
    /^\.env(?:\.|$)/u.test(basename)
    || basename === "project.private.config.json"
    || /(?:^|[._-])(?:credential|credentials|secret|secrets|token|tokens)(?:[._-]|$)/u.test(basename)
    || /\.(?:pem|key|p12|pfx|jks|keystore|mobileprovision)$/u.test(basename)
    || /\.(?:map|zip|tar|tgz|gz|7z|rar)$/u.test(basename)
    || lower.includes("/node_modules/")
    || lower.startsWith("node_modules/")
    || lower.includes("/.git/")
    || lower.startsWith(".git/")
  );
  if (forbidden) throw new Error(`${code}:${value}`);
}

function assertNoCaseCollisions(paths, code = "ALLOWLIST_CASE_COLLISION") {
  const seen = new Map();
  for (const item of paths) {
    const folded = item.toLocaleLowerCase("en-US");
    const previous = seen.get(folded);
    if (previous && previous !== item) {
      throw new Error(`${code}:${previous}:${item}`);
    }
    seen.set(folded, item);
  }
}

export function validateDeliveryAllowlist(allowlist) {
  if (!allowlist || typeof allowlist !== "object" || Array.isArray(allowlist)) {
    throw new Error("ALLOWLIST_OBJECT_REQUIRED");
  }
  if (allowlist.schemaVersion !== 1) throw new Error("ALLOWLIST_SCHEMA_VERSION");
  if (allowlist.scope !== REVIEW_SCOPE) throw new Error("ALLOWLIST_SCOPE");
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(allowlist[field])) throw new Error(`ALLOWLIST_${field.toUpperCase()}_ARRAY`);
  }
  for (const field of SINGLE_REPORT_FIELDS) {
    if (allowlist[field] !== null && typeof allowlist[field] !== "string") {
      throw new Error(`ALLOWLIST_${field.toUpperCase()}_PATH`);
    }
  }
  const selectors = [
    ...ARRAY_FIELDS.flatMap((field) => allowlist[field]),
    ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
  ];
  selectors.forEach((item) => assertAllowedContentPath(item));
  if (new Set(selectors).size !== selectors.length) throw new Error("ALLOWLIST_DUPLICATE_PATH");
  assertNoCaseCollisions(selectors);
  return structuredClone(allowlist);
}

function allSelectors(allowlist) {
  return [
    ...allowlist.files,
    ...allowlist.runtimePaths,
    ...allowlist.reports,
    ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
    ...allowlist.documentation,
  ];
}

function exactFileSelectors(allowlist) {
  return [
    ...allowlist.files,
    ...allowlist.reports,
    ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
    ...allowlist.documentation,
  ];
}

function parseLsTree(output) {
  return output
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const match = record.match(/^(\d{6}) ([^ ]+) ([0-9a-f]+)\t([\s\S]+)$/u);
      if (!match) throw new Error(`GIT_LS_TREE_RECORD_INVALID:${record}`);
      return { mode: match[1], type: match[2], objectId: match[3], path: match[4] };
    });
}

async function resolveCommit(repo, revision, label) {
  if (!revision) throw new Error(`${label}_REQUIRED`);
  const commit = await git(repo, ["rev-parse", "--verify", `${revision}^{commit}`]);
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error(`${label}_INVALID`);
  return commit;
}

async function assertAncestor(repo, ancestor, descendant) {
  try {
    await git(repo, ["merge-base", "--is-ancestor", ancestor, descendant]);
  } catch {
    throw new Error(`TESTED_COMMIT_NOT_ANCESTOR:${ancestor}:${descendant}`);
  }
}

async function readGitBlob(repo, commit, filePath) {
  return git(repo, ["show", `${commit}:${filePath}`], { buffer: true });
}

async function expandAllowlist(repo, commit, allowlist) {
  const selectors = allSelectors(allowlist);
  const raw = await git(repo, ["ls-tree", "-r", "-z", commit, "--", ...selectors]);
  const entries = parseLsTree(raw);
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));
  for (const exact of exactFileSelectors(allowlist)) {
    const entry = byPath.get(exact);
    if (!entry || entry.type !== "blob") throw new Error(`ALLOWLIST_FILE_MISSING:${exact}`);
  }
  for (const runtimePath of allowlist.runtimePaths) {
    const found = entries.some((entry) =>
      entry.path === runtimePath || entry.path.startsWith(`${runtimePath}/`));
    if (!found) throw new Error(`ALLOWLIST_RUNTIME_PATH_MISSING:${runtimePath}`);
  }
  for (const entry of entries) {
    assertAllowedContentPath(entry.path, "FORBIDDEN_PATH");
    if (entry.mode === "120000") throw new Error(`SYMLINK_FORBIDDEN:${entry.path}`);
    if (entry.mode === "160000" || entry.type === "commit") {
      throw new Error(`SUBMODULE_FORBIDDEN:${entry.path}`);
    }
    if (entry.type !== "blob") throw new Error(`NON_BLOB_FORBIDDEN:${entry.path}`);
  }
  assertNoCaseCollisions(entries.map((entry) => entry.path), "PACKAGE_CASE_COLLISION");
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

async function assertCleanAllowlistedPaths(repo, allowlist) {
  const status = await git(repo, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--",
    ...allSelectors(allowlist),
  ]);
  if (status.length > 0) {
    throw new Error(`DIRTY_ALLOWLISTED_PATH:${status.replaceAll("\0", "|")}`);
  }
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

async function assertReportsBoundToCommit(repo, packageCommit, testedSourceCommit, allowlist) {
  const reportPaths = [
    ...allowlist.reports,
    ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
  ];
  for (const reportPath of reportPaths) {
    let report;
    try {
      report = JSON.parse((await readGitBlob(repo, packageCommit, reportPath)).toString("utf8"));
    } catch (error) {
      throw new Error(`REPORT_JSON_INVALID:${reportPath}:${error.message}`);
    }
    const bindings = collectCommitBindings(report);
    if (bindings.length === 0) throw new Error(`REPORT_COMMIT_MISSING:${reportPath}`);
    for (const binding of bindings) {
      if (binding.value !== testedSourceCommit) {
        throw new Error(
          `MIXED_COMMIT:${reportPath}:${binding.key}:${binding.value}:${testedSourceCommit}`,
        );
      }
    }
    if ("exitCode" in report && report.exitCode !== 0) {
      throw new Error(`REPORT_NONZERO_EXIT:${reportPath}:${report.exitCode}`);
    }
    if (report.sourceState?.testedPathsDirty === true) {
      throw new Error(`REPORT_DIRTY_SOURCE:${reportPath}`);
    }
    if (Array.isArray(report.games)) {
      const blocked = report.games.find((game) => game.decision && game.decision !== "RETAIN");
      if (blocked) throw new Error(`REPORT_NON_RETAIN:${reportPath}:${blocked.gameId}`);
    }
    if ("reportCount" in report && report.reportCount !== 18) {
      throw new Error(`REPORT_MATRIX_COUNT:${reportPath}:${report.reportCount}`);
    }
    if ("runCount" in report && report.runCount !== 54) {
      throw new Error(`REPORT_RUN_COUNT:${reportPath}:${report.runCount}`);
    }
  }
}

async function assertRuntimeUnchanged(repo, testedSourceCommit, packageCommit, runtimePaths) {
  const changed = await git(repo, [
    "diff",
    "--name-only",
    testedSourceCommit,
    packageCommit,
    "--",
    ...runtimePaths,
  ]);
  if (changed.length > 0) throw new Error(`RUNTIME_CHANGED_AFTER_TEST:${changed}`);
}

export async function exportGitSnapshot({
  repo,
  allowlistPath,
  packageCommit: packageRevision = "HEAD",
  testedSourceCommit: testedRevision,
  output,
}) {
  const repoRoot = path.resolve(repo);
  const outputRoot = path.resolve(output);
  assertSafeRepoPath(allowlistPath, "ALLOWLIST_PATH");
  if (await exists(outputRoot)) throw new Error(`OUTPUT_EXISTS:${outputRoot}`);
  const packageCommit = await resolveCommit(repoRoot, packageRevision, "PACKAGE_COMMIT");
  const testedSourceCommit = await resolveCommit(
    repoRoot,
    testedRevision,
    "TESTED_SOURCE_COMMIT",
  );
  await assertAncestor(repoRoot, testedSourceCommit, packageCommit);
  let allowlist;
  try {
    allowlist = validateDeliveryAllowlist(JSON.parse(
      (await readGitBlob(repoRoot, packageCommit, allowlistPath)).toString("utf8"),
    ));
  } catch (error) {
    throw new Error(`ALLOWLIST_INVALID:${error.message}`);
  }
  if (!allowlist.files.includes(allowlistPath)) {
    throw new Error(`ALLOWLIST_MUST_INCLUDE_SELF:${allowlistPath}`);
  }
  const entries = await expandAllowlist(repoRoot, packageCommit, allowlist);
  await assertCleanAllowlistedPaths(repoRoot, allowlist);
  await assertRuntimeUnchanged(
    repoRoot,
    testedSourceCommit,
    packageCommit,
    allowlist.runtimePaths,
  );
  await assertReportsBoundToCommit(
    repoRoot,
    packageCommit,
    testedSourceCommit,
    allowlist,
  );
  await mkdir(outputRoot);
  const files = [];
  for (const entry of entries) {
    const bytes = await readGitBlob(repoRoot, packageCommit, entry.path);
    const destination = path.join(outputRoot, ...entry.path.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
    files.push({
      path: entry.path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      gitMode: entry.mode,
      gitObjectId: entry.objectId,
    });
  }
  const manifest = {
    schemaVersion: 1,
    scope: allowlist.scope,
    packageCommit,
    testedSourceCommit,
    createdAt: new Date().toISOString(),
    allowlistPath,
    files,
    verificationReports: [
      ...allowlist.reports,
      ...SINGLE_REPORT_FIELDS.map((field) => allowlist[field]).filter(Boolean),
    ],
    sourceDiff: {
      allowlistedPathsDirty: false,
      runtimeChangedAfterTestedCommit: false,
      statusCheck: "git-status-porcelain-v1",
    },
  };
  await writeFile(
    path.join(outputRoot, "delivery-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx" },
  );
  return manifest;
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
  const manifest = await exportGitSnapshot({
    repo: args.repo,
    allowlistPath: args.allowlist,
    packageCommit: args.commit ?? "HEAD",
    testedSourceCommit: args["tested-source-commit"],
    output: args.output,
  });
  process.stdout.write(
    `GIT SNAPSHOT EXPORTED | ${manifest.files.length} files | `
    + `${manifest.packageCommit} | tested ${manifest.testedSourceCommit}\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
