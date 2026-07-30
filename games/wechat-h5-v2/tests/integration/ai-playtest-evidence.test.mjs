import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  referencedEvidencePaths as sharedReferencedEvidencePaths,
} from "../../tools/ai-playtest/formal-evidence-set.mjs";
import {
  GAME_IDS,
  REVIEWER_ROLES,
  referencedEvidencePaths,
  validateAiPlaytestReport,
  validateReportEvidenceFiles,
} from "../../tools/validate-ai-playtest-report.mjs";
import {
  validateAiPlaytestMatrix,
} from "../../tools/validate-ai-playtest-matrix.mjs";
import {
  createAiPlaytestEvidenceFixture,
} from "../helpers/ai-playtest-evidence-fixture.mjs";

const COMMIT = "a".repeat(40);
const temporaryRoots = [];
let realCapture;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function cloneCapture(source = realCapture) {
  return {
    session: structuredClone(source.session),
    evidenceByPath: new Map(
      [...source.evidenceByPath].map(([name, bytes]) => [
        name,
        Buffer.from(bytes),
      ]),
    ),
  };
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
    positives: ["clear input", "responsive feedback", "visible variety"],
    problems: [
      { severity: "P2", evidence: "copy could be shorter" },
      { severity: "P2", evidence: "one effect is busy" },
      { severity: "P2", evidence: "meta reward needs another example" },
    ],
    facts: ["three production runs completed"],
    inferences: ["variation appears systemic"],
    unverified: ["long-term retention"],
  };
}

function refreshFormalReport(fixture, {
  reviewerRole = "action",
  gameId = "ricochet-crew",
  roundId = "baseline",
  sessionId = fixture.session.driver.sessionId,
  runPrefix = null,
  buildCommit = fixture.session.buildCommit,
} = {}) {
  const sessionBytes = Buffer.from(`${JSON.stringify(fixture.session)}\n`);
  const evidenceSha256 = {
    ...fixture.session.evidenceSha256,
    "session-evidence.json": sha256(sessionBytes),
  };
  const entryUrl = `http://127.0.0.1:4173/${gameId}/`;
  const report = {
    schemaVersion: 1,
    draftOnly: false,
    evidenceOnly: false,
    subjectiveScoresGenerated: true,
    roundId,
    matrixCellId: `${roundId}:${reviewerRole}:${gameId}`,
    reviewerId: `fixture-${reviewerRole}`,
    reviewerRole,
    gameId,
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
    startedAt: fixture.session.startedAt,
    finishedAt: fixture.session.finishedAt,
    runs: fixture.session.runs.map((run, index) => ({
      ...structuredClone(run),
      ...(runPrefix ? { runId: `${runPrefix}-run-${index + 1}` } : {}),
      strategyTag: `strategy-${index + 1}`,
    })),
    evidenceSha256,
    ...subjectiveFields(),
  };
  return { report, sessionBytes };
}

function createFormalFixture() {
  const fixture = cloneCapture();
  const { report, sessionBytes } = refreshFormalReport(fixture);
  return { ...fixture, report, sessionBytes };
}

function syncMutatedFixture(fixture) {
  fixture.session.evidenceSha256 = Object.fromEntries(
    [...fixture.evidenceByPath].map(([name, bytes]) => [
      name,
      sha256(bytes),
    ]),
  );
  const refreshed = refreshFormalReport(fixture);
  const subjective = {
    scores: fixture.report.scores,
    wouldReplay: fixture.report.wouldReplay,
    positives: fixture.report.positives,
    problems: fixture.report.problems,
    facts: fixture.report.facts,
    inferences: fixture.report.inferences,
    unverified: fixture.report.unverified,
  };
  fixture.report = {
    ...refreshed.report,
    ...subjective,
  };
  fixture.sessionBytes = refreshed.sessionBytes;
}

async function materialize(fixture) {
  const root = await mkdtemp(join(tmpdir(), "ai-formal-evidence-"));
  temporaryRoots.push(root);
  for (const [relativePath, bytes] of fixture.evidenceByPath) {
    await writeFile(join(root, relativePath), bytes);
  }
  await writeFile(join(root, "session-evidence.json"), fixture.sessionBytes);
  const reportPath = join(root, "report.json");
  await writeFile(reportPath, `${JSON.stringify(fixture.report, null, 2)}\n`);
  return { root, reportPath };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function syntheticTraceZip() {
  const entries = new Map([
    ["trace.trace", Buffer.from("{\"type\":\"context-options\"}\n")],
    ["trace.network", Buffer.from("{\"type\":\"resource-snapshot\"}\n")],
    ["trace.stacks", Buffer.from("{\"files\":[],\"stacks\":[]}")],
    ["resources/source.txt", Buffer.from("synthetic")],
  ]);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [nameValue, bytes] of entries) {
    const name = Buffer.from(nameValue);
    const checksum = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, bytes);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(bytes.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + bytes.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.size, 8);
  end.writeUInt16LE(entries.size, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

beforeAll(async () => {
  realCapture = await createAiPlaytestEvidenceFixture();
}, 60_000);

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { recursive: true, force: true })));
});

describe("formal report canonical evidence contract", () => {
  it("shares one pure referenced path collector with canonical order", () => {
    const { report } = createFormalFixture();
    expect(referencedEvidencePaths).toBe(sharedReferencedEvidencePaths);
    expect(referencedEvidencePaths(report)).toEqual([
      "session-evidence.json",
      "entry.png",
      "session-actions.jsonl",
      "session-trace.zip",
      "run-1-start.png",
      "run-1-result.png",
      "run-1-events.json",
      "run-2-start.png",
      "run-2-result.png",
      "run-2-events.json",
      "run-3-start.png",
      "run-3-result.png",
      "run-3-events.json",
    ]);
  });

  it("accepts a promoted report backed by the real Task 7 capture", async () => {
    const fixture = createFormalFixture();
    const { reportPath } = await materialize(fixture);
    expect(validateAiPlaytestReport(fixture.report)).toBe(fixture.report);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .resolves.toBe(fixture.report);
  });

  it("requires four literal top-level paths and one shared run trace", () => {
    const mutations = [
      (report) => { report.sessionEvidencePath = "other-session.json"; },
      (report) => { delete report.entryScreenshotPath; },
      (report) => { report.actionLogPath = "logs/actions.jsonl"; },
      (report) => { report.tracePath = "trace.zip"; },
      (report) => { report.runs[0].tracePath = "run-1-trace.zip"; },
    ];
    for (const mutate of mutations) {
      const { report } = createFormalFixture();
      mutate(report);
      expect(() => validateAiPlaytestReport(report)).toThrow(
        /AI_PLAYTEST_REPORT_INVALID/u,
      );
    }
  });

  it("requires exact local entry URL and dedicated hashes to equal the map", () => {
    const wrongUrl = createFormalFixture().report;
    wrongUrl.entryUrl = "http://localhost:4173/ricochet-crew/";
    expect(() => validateAiPlaytestReport(wrongUrl)).toThrow(/entryUrl must equal/u);

    const wrongHash = createFormalFixture().report;
    wrongHash.traceSha256 = "c".repeat(64);
    expect(() => validateAiPlaytestReport(wrongHash)).toThrow(
      /traceSha256 must equal evidenceSha256/u,
    );
  });

  it("rejects a wrong session file hash before semantic validation", async () => {
    const fixture = createFormalFixture();
    fixture.report.sessionEvidenceSha256 = "c".repeat(64);
    fixture.report.evidenceSha256["session-evidence.json"] = "c".repeat(64);
    const { reportPath } = await materialize(fixture);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .rejects.toThrow(/EVIDENCE_HASH_MISMATCH/u);
  });

  it("rejects INCOMPLETE session evidence", async () => {
    const fixture = createFormalFixture();
    fixture.session.status = "INCOMPLETE";
    syncMutatedFixture(fixture);
    const { reportPath } = await materialize(fixture);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .rejects.toThrow(/SESSION_CONTRACT/u);
  });

  it("rejects a 1x1 PNG even when every hash is recomputed", async () => {
    const fixture = createFormalFixture();
    fixture.evidenceByPath.set(
      "run-1-start.png",
      await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 4,
          background: { r: 1, g: 2, b: 3, alpha: 1 },
        },
      }).png().toBuffer(),
    );
    syncMutatedFixture(fixture);
    const { reportPath } = await materialize(fixture);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .rejects.toThrow(/AI_PLAYTEST_PNG_DIMENSIONS/u);
  });

  it("rejects a synthetic trace with internally consistent hashes", async () => {
    const fixture = createFormalFixture();
    fixture.evidenceByPath.set("session-trace.zip", syntheticTraceZip());
    syncMutatedFixture(fixture);
    const { reportPath } = await materialize(fixture);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .rejects.toThrow(/AI_PLAYTEST_TRACE_CONTEXT_INVALID/u);
  });

  it("rejects an event missing a production field", async () => {
    const fixture = createFormalFixture();
    const path = "run-1-events.json";
    const eventLog = JSON.parse(fixture.evidenceByPath.get(path));
    delete eventLog.events[1].sessionId;
    fixture.evidenceByPath.set(
      path,
      Buffer.from(`${JSON.stringify(eventLog)}\n`),
    );
    syncMutatedFixture(fixture);
    const { reportPath } = await materialize(fixture);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .rejects.toThrow(/EVENT_CONTRACT/u);
  });

  it("rejects report/session identity mismatch", async () => {
    const fixture = createFormalFixture();
    fixture.report.sessionId = "other-session";
    const { reportPath } = await materialize(fixture);
    await expect(validateReportEvidenceFiles(fixture.report, reportPath))
      .rejects.toThrow(/REPORT_BINDING/u);
  });
});

describe("AI playtest matrix canonical session identity", () => {
  async function writeBaseline({
    duplicateRun = false,
    duplicateSession = false,
    mixedCommit = false,
  } = {}) {
    const root = await mkdtemp(join(tmpdir(), "ai-matrix-"));
    temporaryRoots.push(root);
    const template = createFormalFixture();
    for (const [roleIndex, role] of REVIEWER_ROLES.entries()) {
      for (const [gameIndex, game] of GAME_IDS.entries()) {
        const index = roleIndex * GAME_IDS.length + gameIndex;
        const directory = join(root, `${role}-${game}`);
        await mkdir(directory, { recursive: true });
        const sessionId = duplicateSession && index === 17
          ? "matrix-session-0"
          : `matrix-session-${index}`;
        const { report } = refreshFormalReport(template, {
          reviewerRole: role,
          gameId: game,
          sessionId,
          runPrefix: duplicateRun && index === 17
            ? `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`
            : `${role}-${game}`,
          buildCommit: mixedCommit && index === 17
            ? "b".repeat(40)
            : COMMIT,
        });
        await writeFile(
          join(directory, "report.json"),
          `${JSON.stringify(report)}\n`,
        );
      }
    }
    return root;
  }

  it("returns 18 unique session IDs and hashes them into the matrix", async () => {
    const root = await writeBaseline();
    const matrix = await validateAiPlaytestMatrix({
      root,
      roundId: "baseline",
      expectedReports: 18,
      expectedRuns: 54,
      checkEvidenceFiles: false,
    });
    expect(matrix.reportCount).toBe(18);
    expect(matrix.runCount).toBe(54);
    expect(matrix.sessionIds).toHaveLength(18);
    expect(new Set(matrix.sessionIds).size).toBe(18);
    expect(matrix.matrixSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(matrix.reportHashes).toHaveLength(18);
    for (const item of matrix.reportHashes) {
      expect(sha256(await readFile(join(root, item.reportPath))))
        .toBe(item.sha256);
    }
  });

  it("rejects duplicate session IDs", async () => {
    await expect(validateAiPlaytestMatrix({
      root: await writeBaseline({ duplicateSession: true }),
      roundId: "baseline",
      checkEvidenceFiles: false,
    })).rejects.toThrow(/DUPLICATE_SESSION_ID/u);
  });

  it("still rejects duplicate run IDs and mixed commits", async () => {
    await expect(validateAiPlaytestMatrix({
      root: await writeBaseline({ duplicateRun: true }),
      roundId: "baseline",
      checkEvidenceFiles: false,
    })).rejects.toThrow(/DUPLICATE_RUN_ID/u);
    await expect(validateAiPlaytestMatrix({
      root: await writeBaseline({ mixedCommit: true }),
      roundId: "baseline",
      checkEvidenceFiles: false,
    })).rejects.toThrow(/MIXED_COMMIT/u);
  });
});
