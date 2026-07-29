import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  GAME_IDS,
  REVIEWER_ROLES,
  validateAiPlaytestReport,
} from "../../tools/validate-ai-playtest-report.mjs";
import { validateAiPlaytestMatrix } from "../../tools/validate-ai-playtest-matrix.mjs";
import { validateSessionOptions } from "../../tools/run-ai-playtest-session.mjs";

const COMMIT = "a".repeat(40);

function makeReport({
  gameId = GAME_IDS[0],
  reviewerRole = REVIEWER_ROLES[0],
  roundId = "baseline",
  runPrefix = `${reviewerRole}-${gameId}`,
  buildCommit = COMMIT,
} = {}) {
  return {
    schemaVersion: 1,
    roundId,
    matrixCellId: `${roundId}:${reviewerRole}:${gameId}`,
    reviewerId: `fixture-${reviewerRole}`,
    reviewerRole,
    gameId,
    buildCommit,
    entryUrl: `http://127.0.0.1/${gameId}/`,
    interactionMode: "browser-touch",
    startedAt: "2026-07-29T00:00:00.000Z",
    finishedAt: "2026-07-29T00:30:00.000Z",
    runs: Array.from({ length: 3 }, (_, index) => ({
      runId: `${runPrefix}-run-${index + 1}`,
      outcome: index === 1 ? "loss" : "win",
      firstInputMs: 800 + index,
      firstPayoffMs: 2_400 + index,
      strategyTag: `strategy-${index + 1}`,
      screenshotPaths: [
        `screens/run-${index + 1}-start.png`,
        `screens/run-${index + 1}-result.png`,
      ],
      tracePath: `traces/run-${index + 1}.zip`,
      eventLogPath: `events/run-${index + 1}.json`,
    })),
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
    positives: ["clear first action", "responsive feedback", "meaningful variation"],
    problems: [
      { severity: "P2", evidence: "late copy is dense" },
      { severity: "P2", evidence: "one effect is visually busy" },
      { severity: "P2", evidence: "meta reward needs one more example" },
    ],
    facts: ["three runs completed"],
    inferences: ["variation appears systemic"],
    unverified: ["long-term retention"],
  };
}

describe("AI playtest report validator", () => {
  it("accepts a complete three-run browser-touch report", () => {
    expect(validateAiPlaytestReport(makeReport())).toMatchObject({
      gameId: GAME_IDS[0],
      reviewerRole: REVIEWER_ROLES[0],
    });
  });

  it.each([
    ["not exactly three runs", (report) => { report.runs.pop(); }],
    ["test-mode entry URL", (report) => { report.entryUrl += "?test=1"; }],
    ["missing first input", (report) => { delete report.runs[0].firstInputMs; }],
    ["fewer than six screenshots", (report) => {
      report.runs.forEach((run) => { run.screenshotPaths = ["one.png"]; });
    }],
    ["missing trace", (report) => { report.runs[0].tracePath = ""; }],
    ["fewer than three positives", (report) => { report.positives = ["one"]; }],
    ["fewer than three problems", (report) => { report.problems = []; }],
    ["missing replay vote", (report) => { delete report.wouldReplay; }],
  ])("rejects %s", (_label, mutate) => {
    const report = makeReport();
    mutate(report);
    expect(() => validateAiPlaytestReport(report)).toThrow();
  });
});

describe("AI playtest evidence session runner", () => {
  it("accepts only normal entry URLs and non-overwriting round cells", () => {
    expect(validateSessionOptions({
      roundId: "baseline",
      gameId: "ricochet-crew",
      reviewerRole: "action",
      entryUrl: "http://127.0.0.1:5174/",
      output: "evidence/baseline/action-ricochet-crew",
    }).matrixCellId).toBe("baseline:action:ricochet-crew");
    expect(() => validateSessionOptions({
      roundId: "baseline",
      gameId: "ricochet-crew",
      reviewerRole: "action",
      entryUrl: "http://127.0.0.1:5174/?test=1",
      output: "evidence/baseline/action-ricochet-crew",
    })).toThrow(/normal entry/i);
  });
});

describe("AI playtest matrix validator", () => {
  async function writeBaseline({ duplicateRun = false, mixedCommit = false } = {}) {
    const root = await mkdtemp(join(tmpdir(), "ai-matrix-"));
    for (const [roleIndex, role] of REVIEWER_ROLES.entries()) {
      for (const [gameIndex, game] of GAME_IDS.entries()) {
        const dir = join(root, `${role}-${game}`);
        await mkdir(dir, { recursive: true });
        const report = makeReport({
          reviewerRole: role,
          gameId: game,
          runPrefix: duplicateRun && roleIndex === 5 && gameIndex === 2
            ? `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`
            : `${role}-${game}`,
          buildCommit: mixedCommit && roleIndex === 5 && gameIndex === 2
            ? "b".repeat(40)
            : COMMIT,
        });
        await writeFile(join(dir, "report.json"), JSON.stringify(report));
      }
    }
    return root;
  }

  it("requires exactly 18 reports and 54 globally unique run IDs", async () => {
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
    expect(matrix.buildCommit).toBe(COMMIT);
  });

  it("rejects a missing cell, duplicate run ID, or mixed commit", async () => {
    const missingRoot = await writeBaseline();
    const missingPath = join(
      missingRoot,
      `${REVIEWER_ROLES[0]}-${GAME_IDS[0]}`,
      "report.json",
    );
    await writeFile(missingPath, "{}");
    await expect(validateAiPlaytestMatrix({
      root: missingRoot,
      roundId: "baseline",
      expectedReports: 18,
      expectedRuns: 54,
    })).rejects.toThrow();

    await expect(validateAiPlaytestMatrix({
      root: await writeBaseline({ duplicateRun: true }),
      roundId: "baseline",
      expectedReports: 18,
      expectedRuns: 54,
    })).rejects.toThrow(/runId/i);

    await expect(validateAiPlaytestMatrix({
      root: await writeBaseline({ mixedCommit: true }),
      roundId: "baseline",
      expectedReports: 18,
      expectedRuns: 54,
    })).rejects.toThrow(/commit/i);
  });
});
