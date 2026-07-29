import { describe, expect, it } from "vitest";
import {
  GAME_IDS,
  REVIEWER_ROLES,
} from "../../tools/validate-ai-playtest-report.mjs";
import {
  scoreGameRound,
  summarizePlaytestRounds,
} from "../../tools/summarize-ai-playtests.mjs";

const COMMIT = "c".repeat(40);

function reportsFor({
  gameId = GAME_IDS[0],
  roundId = "baseline",
  score = 80,
  votes = 6,
  evidenceReviewVotes = 0,
  severity = "P2",
  roles = REVIEWER_ROLES,
} = {}) {
  return roles.map((reviewerRole, index) => ({
    schemaVersion: 1,
    roundId,
    matrixCellId: `${roundId}:${reviewerRole}:${gameId}`,
    reviewerId: `fixture-${reviewerRole}`,
    reviewerRole,
    gameId,
    buildCommit: COMMIT,
    entryUrl: `http://127.0.0.1/${gameId}/`,
    interactionMode: index < evidenceReviewVotes ? "evidence-review" : "browser-touch",
    startedAt: "2026-07-29T00:00:00.000Z",
    finishedAt: "2026-07-29T00:30:00.000Z",
    runs: Array.from({ length: 3 }, (_, runIndex) => ({
      runId: `${roundId}-${gameId}-${reviewerRole}-${runIndex}`,
      outcome: runIndex === 1 ? "loss" : "win",
      firstInputMs: 500,
      firstPayoffMs: 2_000,
      strategyTag: `s${runIndex}`,
      screenshotPaths: [`a${runIndex}.png`, `b${runIndex}.png`],
      tracePath: `trace-${runIndex}.zip`,
      eventLogPath: `events-${runIndex}.json`,
    })),
    scores: {
      first30Seconds: score,
      inputFeedback: score,
      decisionAgency: score,
      threeRunVariety: score,
      failureReplayUrge: score,
      audiovisualQuality: score,
      metaReturnReason: score,
      completeness: score,
    },
    wouldReplay: index < votes,
    positives: ["one", "two", "three"],
    problems: [
      { severity, evidence: "one" },
      { severity: "P2", evidence: "two" },
      { severity: "P2", evidence: "three" },
    ],
    facts: ["fact"],
    inferences: ["inference"],
    unverified: ["unverified"],
  }));
}

describe("deterministic AI playtest scoring", () => {
  it("retains only at >=75, every dimension >=60, four valid votes and no P0/P1", () => {
    const result = scoreGameRound(reportsFor({ score: 75, votes: 4 }));
    expect(result.decision).toBe("RETAIN");
    expect(result.weightedMean).toBe(75);
    expect(result.replayVotes).toBe(4);
  });

  it("does not count evidence-review reports as replay votes", () => {
    const result = scoreGameRound(reportsFor({
      score: 80,
      votes: 6,
      evidenceReviewVotes: 3,
    }));
    expect(result.replayVotes).toBe(3);
    expect(result.decision).toBe("REWORK");
  });

  it("reworks for a low dimension or P1 and drops for P0", () => {
    const lowDimension = reportsFor({ score: 80 });
    lowDimension.forEach((report) => { report.scores.decisionAgency = 59; });
    expect(scoreGameRound(lowDimension).decision).toBe("REWORK");
    expect(scoreGameRound(reportsFor({ severity: "P1" })).decision).toBe("REWORK");
    expect(scoreGameRound(reportsFor({ severity: "P0" })).decision).toBe("DROP");
  });

  it("marks missing roles incomplete and forces DROP after failed rework-2", () => {
    expect(scoreGameRound(reportsFor({
      roles: REVIEWER_ROLES.slice(0, 5),
    })).decision).toBe("INCOMPLETE");

    const summary = summarizePlaytestRounds([
      ...reportsFor({ roundId: "baseline", score: 70 }),
      ...reportsFor({ roundId: "rework-1", score: 72 }),
      ...reportsFor({ roundId: "rework-2", score: 74 }),
    ]);
    const game = summary.games.find((item) => item.gameId === GAME_IDS[0]);
    expect(game.decision).toBe("DROP");
    expect(game.roundHistory).toHaveLength(3);
  });
});
