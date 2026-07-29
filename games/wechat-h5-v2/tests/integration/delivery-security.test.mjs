import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test, { before } from "node:test";
import {
  exportGitSnapshot,
  validateDeliveryAllowlist,
} from "../../tools/export-git-snapshot.mjs";
import {
  verifyExtractedDelivery,
  verifySha256Sidecar,
} from "../../tools/verify-delivery.mjs";
import {
  GAME_IDS,
  REVIEWER_ROLES,
} from "../../tools/validate-ai-playtest-report.mjs";
import { validateAiPlaytestMatrix } from "../../tools/validate-ai-playtest-matrix.mjs";
import {
  assertReferencedTraceLimits,
  referencedEvidencePaths,
} from "../../tools/ai-playtest/formal-evidence-set.mjs";
import { readBoundedZip } from "../../tools/ai-playtest/zip-evidence.mjs";
import {
  createAiPlaytestEvidenceFixture,
} from "../helpers/ai-playtest-evidence-fixture.mjs";

const execFileAsync = promisify(execFile);
let realCapture;

before(async () => {
  realCapture = await createAiPlaytestEvidenceFixture();
});

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

async function listRelativeFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  }
  await visit(root);
  return files.sort((left, right) => left.localeCompare(right));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const [entryName, content] of entries) {
    const name = Buffer.from(entryName);
    const body = Buffer.from(content);
    const checksum = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + body.length;
  }
  const centralBytes = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.size, 8);
  end.writeUInt16LE(entries.size, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralBytes, end]);
}

const traceByGame = new Map();

function traceForGame(game) {
  const cached = traceByGame.get(game);
  if (cached) return cached;
  const original = realCapture.evidenceByPath.get("session-trace.zip");
  if (game === "ricochet-crew") {
    traceByGame.set(game, original);
    return original;
  }
  const sourceUrl = "http://127.0.0.1:4173/ricochet-crew/";
  const targetUrl = `http://127.0.0.1:4173/${game}/`;
  const entries = readBoundedZip(original);
  for (const entryName of ["trace.trace", "trace.network"]) {
    entries.set(
      entryName,
      Buffer.from(entries.get(entryName).toString("utf8").replaceAll(sourceUrl, targetUrl)),
    );
  }
  const transformed = storedZip(entries);
  traceByGame.set(game, transformed);
  return transformed;
}

function subjectiveFields() {
  return {
    scores: {
      first30Seconds: 80,
      inputFeedback: 80,
      decisionAgency: 80,
      threeRunVariety: 80,
      failureReplayUrge: 80,
      audiovisualQuality: 80,
      metaReturnReason: 80,
      completeness: 80,
    },
    wouldReplay: true,
    positives: ["clear action", "responsive feedback", "meaningful variation"],
    problems: [
      { severity: "P2", evidence: "minor copy density" },
      { severity: "P2", evidence: "minor visual noise" },
      { severity: "P2", evidence: "minor meta clarity" },
    ],
    facts: ["three runs completed"],
    inferences: ["variation appears systemic"],
    unverified: ["long-term retention"],
  };
}

function createPlaytestCell({
  role,
  game,
  buildCommit,
}) {
  const session = structuredClone(realCapture.session);
  const sessionId = `${role}-${game}-session`;
  const entryUrl = `http://127.0.0.1:4173/${game}/`;
  const runIdByOriginal = new Map();
  session.roundId = "baseline";
  session.matrixCellId = `baseline:${role}:${game}`;
  session.reviewerRole = role;
  session.gameId = game;
  session.requestedEntryUrl = entryUrl;
  session.entryUrl = entryUrl;
  session.buildCommit = buildCommit;
  session.source.expectedCommit = buildCommit;
  session.source.headCommit = buildCommit;
  session.sourceAtFinish.expectedCommit = buildCommit;
  session.sourceAtFinish.headCommit = buildCommit;
  session.servedDist.start.expectedCommit = buildCommit;
  session.servedDist.start.gameId = game;
  session.servedDist.finish.expectedCommit = buildCommit;
  session.servedDist.finish.gameId = game;
  session.driver.sessionId = sessionId;
  session.runs = session.runs.map((run, index) => {
    const runId = `${role}-${game}-run-${index + 1}`;
    runIdByOriginal.set(run.runId, runId);
    return { ...run, runId };
  });

  const evidence = new Map(
    [...realCapture.evidenceByPath].map(([relativePath, bytes]) => [
      relativePath,
      Buffer.from(bytes),
    ]),
  );
  evidence.set("session-trace.zip", traceForGame(game));
  const actions = evidence.get("session-actions.jsonl")
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map(JSON.parse)
    .map((action) => ({
      ...action,
      sessionId,
      gameId: game,
      runId: runIdByOriginal.get(action.runId),
    }));
  evidence.set(
    "session-actions.jsonl",
    Buffer.from(`${actions.map((action) => JSON.stringify(action)).join("\n")}\n`),
  );
  for (const run of session.runs) {
    const eventLog = JSON.parse(
      evidence.get(run.eventLogPath).toString("utf8"),
    );
    eventLog.runId = run.runId;
    eventLog.events = eventLog.events.map((event) => ({
      ...event,
      sessionId,
      gameId: game,
      runId: run.runId,
    }));
    evidence.set(
      run.eventLogPath,
      Buffer.from(`${JSON.stringify(eventLog)}\n`),
    );
  }
  session.evidenceSha256 = Object.fromEntries(
    [...evidence].map(([relativePath, bytes]) => [
      relativePath,
      sha256(bytes),
    ]),
  );
  const sessionBytes = Buffer.from(`${JSON.stringify(session)}\n`);
  evidence.set("session-evidence.json", sessionBytes);
  const evidenceSha256 = Object.fromEntries(
    [...evidence].map(([relativePath, bytes]) => [
      relativePath,
      sha256(bytes),
    ]),
  );
  const report = {
    schemaVersion: 1,
    draftOnly: false,
    evidenceOnly: false,
    subjectiveScoresGenerated: true,
    roundId: "baseline",
    matrixCellId: `baseline:${role}:${game}`,
    reviewerId: `fixture-${role}`,
    reviewerRole: role,
    gameId: game,
    buildCommit,
    entryUrl,
    interactionMode: "browser-touch",
    claimsActualPlay: true,
    sessionId,
    sessionEvidencePath: "session-evidence.json",
    sessionEvidenceSha256: evidenceSha256["session-evidence.json"],
    entryScreenshotPath: "entry.png",
    entryScreenshotSha256: evidenceSha256["entry.png"],
    actionLogPath: "session-actions.jsonl",
    actionLogSha256: evidenceSha256["session-actions.jsonl"],
    tracePath: "session-trace.zip",
    traceSha256: evidenceSha256["session-trace.zip"],
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    runs: session.runs.map((run, index) => ({
      ...structuredClone(run),
      strategyTag: `strategy-${index + 1}`,
    })),
    evidenceSha256,
    ...subjectiveFields(),
  };
  assert.equal(referencedEvidencePaths(report).length, 13);
  return { evidence, report };
}

async function writePlaytestCell(root, {
  role,
  game,
  buildCommit,
  sharedFiles,
}) {
  const directory = path.join(root, `${role}-${game}`);
  await mkdir(directory, { recursive: true });
  const { evidence, report } = createPlaytestCell({ role, game, buildCommit });
  const hardlinkable = new Set([
    "entry.png",
    "session-trace.zip",
    ...report.runs.flatMap((run) => run.screenshotPaths),
  ]);
  for (const [relativePath, bytes] of evidence) {
    const destination = path.join(directory, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    const sharedKey = `${game}:${relativePath}`;
    if (hardlinkable.has(relativePath) && sharedFiles.has(sharedKey)) {
      try {
        await link(sharedFiles.get(sharedKey), destination);
        continue;
      } catch {
        // Filesystems without hard-link support still exercise the same bytes.
      }
    }
    await writeFile(destination, bytes);
    if (hardlinkable.has(relativePath)) sharedFiles.set(sharedKey, destination);
  }
  await writeJson(path.join(directory, "report.json"), report);
  assert.equal((await listRelativeFiles(directory)).length, 14);
}

async function createFixtureRepository({
  collaborationMinutes = 480,
  mutateMatrix = null,
  mutateEvidence = null,
} = {}) {
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

  const baselineRoot = path.join(
    repo,
    "games",
    "wechat-h5-v2",
    "test-results",
    "ai-playtests",
    "baseline",
  );
  const sharedFiles = new Map();
  for (const role of REVIEWER_ROLES) {
    for (const game of GAME_IDS) {
      await writePlaytestCell(baselineRoot, {
        role,
        game,
        buildCommit: sourceCommit,
        sharedFiles,
      });
    }
  }
  if (mutateEvidence) await mutateEvidence(baselineRoot);
  const matrix = await validateAiPlaytestMatrix({
    root: baselineRoot,
    roundId: "baseline",
    expectedReports: 18,
    expectedRuns: 54,
    checkEvidenceFiles: !mutateEvidence,
  });
  const matrixReport = {
    ...matrix,
    testedSourceCommit: sourceCommit,
    reports: matrix.reports.map((report) => ({
      matrixCellId: report.matrixCellId,
      reviewerId: report.reviewerId,
      interactionMode: report.interactionMode,
      runIds: report.runs.map((run) => run.runId),
    })),
  };
  if (mutateMatrix) mutateMatrix(matrixReport);
  await writeJson(path.join(baselineRoot, "matrix.json"), matrixReport);

  const allowlist = {
    schemaVersion: 1,
    scope: "wechat-h5-v2-non-production-review",
    files: ["delivery-allowlist.json"],
    runtimePaths: ["runtime"],
    playtestEvidencePaths: REVIEWER_ROLES.flatMap((role) =>
      GAME_IDS.map((game) =>
        `games/wechat-h5-v2/test-results/ai-playtests/baseline/${role}-${game}`)),
    reports: ["reports/verification.json"],
    decisionReport: "reports/decision.json",
    baselineMatrixReport: "games/wechat-h5-v2/test-results/ai-playtests/baseline/matrix.json",
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
    games: GAME_IDS.map((gameId) => ({
      gameId,
      decision: "RETAIN",
      buildCommit: sourceCommit,
    })),
  });
  await writeJson(path.join(repo, "reports", "collaboration.json"), {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    verifiedActiveUnionMinutes: collaborationMinutes,
    roleCount: 6,
    evidenceRows: 18,
    invalidRows: 0,
  });
  await writeJson(path.join(repo, "reports", "miniprogram-shell.json"), {
    schemaVersion: 1,
    testedSourceCommit: sourceCommit,
    exitCode: 0,
  });
  await git(repo, [
    "add",
    "--",
    "delivery-allowlist.json",
    "reports",
    "games/wechat-h5-v2/test-results/ai-playtests",
  ]);
  await git(repo, ["commit", "-m", "evidence"]);
  const packageCommit = await git(repo, ["rev-parse", "HEAD"]);
  return { repo, allowlist, sourceCommit, packageCommit };
}

test("allowlist rejects unsafe paths and keeps repository selectors trustworthy", async () => {
  const base = {
    schemaVersion: 1,
    scope: "wechat-h5-v2-non-production-review",
    files: ["delivery-allowlist.json"],
    runtimePaths: ["runtime"],
    playtestEvidencePaths: [],
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
    "notes/archive.zip",
    "games/wechat-h5-v2/test-results/ai-playtests/baseline/action-ricochet-crew/session-trace.zip/payload.txt",
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

  const gameRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const repoRoot = path.resolve(gameRoot, "../..");
  const allowlist = validateDeliveryAllowlist(JSON.parse(await readFile(
    path.join(gameRoot, "delivery-allowlist.json"),
    "utf8",
  )));
  for (const selector of [...allowlist.files, ...allowlist.documentation]) {
    await git(repoRoot, ["cat-file", "-e", `HEAD:${selector}`]);
  }
  for (const selector of allowlist.runtimePaths) {
    const entries = await git(repoRoot, [
      "ls-tree",
      "-r",
      "--name-only",
      "HEAD",
      "--",
      selector,
    ]);
    assert.notEqual(entries, "", selector);
  }
  assert.ok(allowlist.documentation.includes("docs/wechat-h5-v2/ai-playtest-runbook.md"));
  assert.ok(allowlist.documentation.includes("docs/wechat-h5-v2/ai-player-prompts.md"));
  assert.ok(!allowlist.documentation.includes("docs/wechat-h5-v2/ai-playtest-decision.md"));

  const dynamicReports = [
    ...allowlist.reports,
    allowlist.decisionReport,
    allowlist.baselineMatrixReport,
    allowlist.collaborationReport,
    allowlist.miniProgramShellReport,
  ].filter(Boolean);
  for (const selector of dynamicReports) {
    assert.equal(path.posix.normalize(selector), selector);
    assert.match(selector, /^games\/wechat-h5-v2\/test-results\/.+\.json$/u);
  }
});

test("canonical trace limits reject missing, renamed and oversized references", () => {
  const reportPath = "baseline/action-ricochet-crew/report.json";
  const packageTracePath = "baseline/action-ricochet-crew/session-trace.zip";
  const report = {
    tracePath: "session-trace.zip",
    runs: [
      {
        screenshotPaths: ["screens/run-1-start.png", "screens/run-1-result.png"],
        eventLogPath: "events/run-1.jsonl",
      },
    ],
  };

  assert.throws(
    () => assertReferencedTraceLimits({
      reports: [{ reportPath, report }],
      sizeByPackagePath: new Map(),
    }),
    /PLAYTEST_TRACE_SIZE_MISSING/,
  );
  assert.throws(
    () => assertReferencedTraceLimits({
      reports: [{
        reportPath,
        report: { ...report, tracePath: "renamed-trace.bin" },
      }],
      sizeByPackagePath: new Map([
        ["baseline/action-ricochet-crew/renamed-trace.bin", 1],
      ]),
    }),
    /PLAYTEST_TRACE_REFERENCE_COUNT/,
  );
  assert.throws(
    () => assertReferencedTraceLimits({
      reports: [{ reportPath, report }],
      sizeByPackagePath: new Map([[packageTracePath, 11]]),
      maxTraceBytes: 10,
    }),
    /PLAYTEST_TRACE_TOO_LARGE/,
  );
});

test("canonical trace limits apply the aggregate cap and deduplicate package paths", () => {
  const report = {
    tracePath: "session-trace.zip",
    runs: [],
  };
  const first = {
    reportPath: "baseline/action-ricochet-crew/report.json",
    report,
  };
  const duplicateFirst = {
    reportPath: first.reportPath,
    report: { ...report },
  };
  const second = {
    reportPath: "baseline/casual-ricochet-crew/report.json",
    report,
  };
  const sizes = new Map([
    ["baseline/action-ricochet-crew/session-trace.zip", 5],
    ["baseline/casual-ricochet-crew/session-trace.zip", 6],
  ]);

  assert.deepEqual(
    assertReferencedTraceLimits({
      reports: [first, duplicateFirst],
      sizeByPackagePath: sizes,
      maxTraceBytes: 5,
      maxTotalTraceBytes: 5,
    }),
    { traceCount: 1, totalTraceBytes: 5 },
  );
  assert.throws(
    () => assertReferencedTraceLimits({
      reports: [first, second],
      sizeByPackagePath: sizes,
      maxTraceBytes: 6,
      maxTotalTraceBytes: 10,
    }),
    /PLAYTEST_TRACE_TOTAL_TOO_LARGE/,
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
  assert.deepEqual(manifest.trust, {
    metadataType: "verification-metadata",
    generatedManifestIsGitBlob: false,
    packageAuthentication: "derived-by-verifier-against-fixed-git-commit",
    executionTrust: "derived-by-verifier-from-local-audited-evidence",
    independentAttestation: "not-present",
  });
  assert.ok(manifest.files.some(({ path: filePath }) => filePath === "runtime/index.html"));

  const verified = await verifyExtractedDelivery({
    packageDir: output,
    trustedRepo: fixture.repo,
  });
  assert.deepEqual(verified, {
    packageAuthenticated: true,
    executionTrust: "local-audited",
    independentlyAttested: false,
    packageCommit: manifest.packageCommit,
    testedSourceCommit: manifest.testedSourceCommit,
    fileCount: manifest.files.length,
  });

  const manifestPath = path.join(output, "delivery-manifest.json");
  const cleanManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  await writeJson(manifestPath, { ...cleanManifest, authenticated: true });
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: output, trustedRepo: fixture.repo }),
    /DELIVERY_MANIFEST_LEGACY_TRUST_CLAIM/,
  );
  await writeJson(manifestPath, {
    ...cleanManifest,
    trust: {
      ...cleanManifest.trust,
      note: "AUTHENTICATED DELIVERY",
    },
  });
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: output, trustedRepo: fixture.repo }),
    /DELIVERY_MANIFEST_LEGACY_TRUST_CLAIM/,
  );
  await writeJson(manifestPath, cleanManifest);

  await writeFile(path.join(output, "runtime", "index.html"), "<h1>tampered</h1>\n");
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: output, trustedRepo: fixture.repo }),
    /(?:BYTE_COUNT|HASH)_MISMATCH/,
  );
});

test("rejects 479 collaboration minutes and forged playtest matrix fields", async () => {
  const shortCollaboration = await createFixtureRepository({
    collaborationMinutes: 479,
  });
  const shortOutput = path.join(
    await mkdtemp(path.join(tmpdir(), "delivery-short-collab-")),
    "payload",
  );
  await exportGitSnapshot({
    repo: shortCollaboration.repo,
    allowlistPath: "delivery-allowlist.json",
    packageCommit: shortCollaboration.packageCommit,
    testedSourceCommit: shortCollaboration.sourceCommit,
    output: shortOutput,
  });
  await assert.rejects(
    verifyExtractedDelivery({
      packageDir: shortOutput,
      trustedRepo: shortCollaboration.repo,
    }),
    /COLLAB_ACTIVE_UNION/,
  );

  const forgedMatrix = await createFixtureRepository({
    mutateMatrix(matrix) {
      matrix.matrixCells[17] = matrix.matrixCells[0];
      matrix.runIds[53] = matrix.runIds[0];
      matrix.reportHashes[0].sha256 = "0".repeat(64);
    },
  });
  const forgedOutput = path.join(
    await mkdtemp(path.join(tmpdir(), "delivery-forged-matrix-")),
    "payload",
  );
  await exportGitSnapshot({
    repo: forgedMatrix.repo,
    allowlistPath: "delivery-allowlist.json",
    packageCommit: forgedMatrix.packageCommit,
    testedSourceCommit: forgedMatrix.sourceCommit,
    output: forgedOutput,
  });
  await assert.rejects(
    verifyExtractedDelivery({
      packageDir: forgedOutput,
      trustedRepo: forgedMatrix.repo,
    }),
    /PLAYTEST_MATRIX/,
  );
});

test("rejects tampered, missing or renamed canonical evidence before export", async () => {
  const tampered = await createFixtureRepository({
    async mutateEvidence(baselineRoot) {
      const cell = path.join(
        baselineRoot,
        `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`,
      );
      const report = JSON.parse(await readFile(path.join(cell, "report.json"), "utf8"));
      const screenshotPath = report.runs[0].screenshotPaths[0];
      const screenshot = path.join(cell, ...screenshotPath.split("/"));
      await rm(screenshot);
      await writeFile(screenshot, "tampered");
    },
  });
  const output = path.join(
    await mkdtemp(path.join(tmpdir(), "delivery-tampered-evidence-")),
    "payload",
  );
  await assert.rejects(
    exportGitSnapshot({
      repo: tampered.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: tampered.packageCommit,
      testedSourceCommit: tampered.sourceCommit,
      output,
    }),
    /EVIDENCE_HASH/,
  );

  const missingSession = await createFixtureRepository({
    async mutateEvidence(baselineRoot) {
      const cell = path.join(
        baselineRoot,
        `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`,
      );
      await rm(path.join(cell, "session-evidence.json"));
    },
  });
  await assert.rejects(
    exportGitSnapshot({
      repo: missingSession.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: missingSession.packageCommit,
      testedSourceCommit: missingSession.sourceCommit,
      output: path.join(missingSession.repo, "out-missing-session"),
    }),
    /(?:session-evidence\.json|ENOENT)/,
  );

  const renamedTrace = await createFixtureRepository({
    async mutateEvidence(baselineRoot) {
      const cell = path.join(
        baselineRoot,
        `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`,
      );
      await rename(
        path.join(cell, "session-trace.zip"),
        path.join(cell, "renamed-trace.bin"),
      );
    },
  });
  await assert.rejects(
    exportGitSnapshot({
      repo: renamedTrace.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: renamedTrace.packageCommit,
      testedSourceCommit: renamedTrace.sourceCommit,
      output: path.join(renamedTrace.repo, "out-renamed-trace"),
    }),
    /(?:session-trace\.zip|ENOENT)/,
  );
});

test("rejects an unreferenced draft in packaged playtest evidence", async () => {
  const withDraft = await createFixtureRepository({
    async mutateEvidence(baselineRoot) {
      const cell = path.join(
        baselineRoot,
        `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`,
      );
      await writeJson(path.join(cell, "report-draft.json"), {
        schemaVersion: 1,
        draftOnly: true,
      });
    },
  });
  const output = path.join(
    await mkdtemp(path.join(tmpdir(), "delivery-unreferenced-evidence-")),
    "payload",
  );
  await exportGitSnapshot({
    repo: withDraft.repo,
    allowlistPath: "delivery-allowlist.json",
    packageCommit: withDraft.packageCommit,
    testedSourceCommit: withDraft.sourceCommit,
    output,
  });
  await assert.rejects(
    verifyExtractedDelivery({ packageDir: output, trustedRepo: withDraft.repo }),
    /PLAYTEST_UNREFERENCED_FILE/,
  );
});

test("rejects oversized individual and aggregate playtest traces", async () => {
  const fixture = await createFixtureRepository();
  const traceSizes = await Promise.all(REVIEWER_ROLES.flatMap((role) =>
    GAME_IDS.map(async (game) => (
      await readFile(path.join(
        fixture.repo,
        "games",
        "wechat-h5-v2",
        "test-results",
        "ai-playtests",
        "baseline",
        `${role}-${game}`,
        "session-trace.zip",
      ))
    ).length)));
  const largestTraceBytes = Math.max(...traceSizes);
  const totalTraceBytes = traceSizes.reduce((total, bytes) => total + bytes, 0);
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: fixture.packageCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: path.join(fixture.repo, "out-trace-single-limit"),
      maxTraceBytes: largestTraceBytes - 1,
    }),
    /PLAYTEST_TRACE_TOO_LARGE/,
  );
  await assert.rejects(
    exportGitSnapshot({
      repo: fixture.repo,
      allowlistPath: "delivery-allowlist.json",
      packageCommit: fixture.packageCommit,
      testedSourceCommit: fixture.sourceCommit,
      output: path.join(fixture.repo, "out-trace-total-limit"),
      maxTraceBytes: largestTraceBytes,
      maxTotalTraceBytes: totalTraceBytes - 1,
    }),
    /PLAYTEST_TRACE_TOTAL_TOO_LARGE/,
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
  const verifierPath = new URL("../../tools/verify-delivery.mjs", import.meta.url);
  const verifier = await readFile(verifierPath, "utf8");
  const verifierCli = verifier.slice(verifier.indexOf("async function main"));
  assert.match(script, /TESTED_SOURCE_COMMIT_REQUIRED[\s\S]*-TestedSourceCommit/u);
  assert.match(script, /DELIVERY_OUTPUT_EXISTS/u);
  for (const output of [
    "PACKAGE_AUTHENTICATED=true",
    "EXECUTION_TRUST=local-audited",
    "INDEPENDENTLY_ATTESTED=false",
  ]) {
    assert.ok(script.includes(output), output);
    assert.ok(verifierCli.includes(output.split("=")[0]), output);
  }
  assert.doesNotMatch(script, /AUTHENTICATED DELIVERY|playtest authenticated/iu);
  assert.doesNotMatch(
    verifierCli,
    /AUTHENTICATED DELIVERY|playtest authenticated|result\.authenticated/iu,
  );
  assert.doesNotMatch(script, /Move-Item[^\r\n]*-Force/u);
  const archiveMove = script.indexOf(
    "Move-Item -LiteralPath $candidateArchive -Destination $finalArchive",
  );
  const sidecarMove = script.indexOf(
    "Move-Item -LiteralPath $candidateSidecar -Destination $finalSidecar",
  );
  assert.ok(archiveMove >= 0 && sidecarMove > archiveMove);
});
