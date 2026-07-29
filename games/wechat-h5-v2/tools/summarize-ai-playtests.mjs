import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  GAME_IDS,
  PLAYTEST_ROUNDS,
  REVIEWER_ROLES,
  SCORE_KEYS,
  validateAiPlaytestReport,
} from "./validate-ai-playtest-report.mjs";

export const SCORE_WEIGHTS = Object.freeze({
  first30Seconds: 0.15,
  inputFeedback: 0.15,
  decisionAgency: 0.15,
  threeRunVariety: 0.15,
  failureReplayUrge: 0.10,
  audiovisualQuality: 0.15,
  metaReturnReason: 0.10,
  completeness: 0.05,
});

const ROUND_ORDER = new Map(PLAYTEST_ROUNDS.map((round, index) => [round, index]));

function roundNumber(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function incompleteResult(reports, reasons) {
  return {
    gameId: reports[0]?.gameId ?? null,
    roundId: reports[0]?.roundId ?? null,
    buildCommit: null,
    reviewerCount: new Set(reports.map((report) => report.reviewerRole)).size,
    dimensionMeans: null,
    weightedMean: null,
    replayVotes: 0,
    replayEligibleReviewers: 0,
    issueCounts: { P0: 0, P1: 0, P2: 0 },
    decision: "INCOMPLETE",
    reasons,
  };
}

export function scoreGameRound(reports, options = {}) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return incompleteResult([], ["no reports"]);
  }
  const expectedRoles = options.roles ?? REVIEWER_ROLES;
  const validationErrors = [];
  for (const report of reports) {
    try {
      validateAiPlaytestReport(report);
    } catch (error) {
      validationErrors.push(error.message);
    }
  }
  if (validationErrors.length > 0) {
    return incompleteResult(reports, validationErrors);
  }
  const gameIds = new Set(reports.map((report) => report.gameId));
  const roundIds = new Set(reports.map((report) => report.roundId));
  const roles = reports.map((report) => report.reviewerRole);
  const uniqueRoles = new Set(roles);
  const commits = new Set(reports.map((report) => report.buildCommit));
  const structuralReasons = [];
  if (gameIds.size !== 1) structuralReasons.push("mixed game IDs");
  if (roundIds.size !== 1) structuralReasons.push("mixed round IDs");
  if (commits.size !== 1) structuralReasons.push("mixed build commits");
  if (reports.length !== expectedRoles.length) {
    structuralReasons.push(`expected ${expectedRoles.length} reports, got ${reports.length}`);
  }
  if (uniqueRoles.size !== reports.length) structuralReasons.push("duplicate reviewer role");
  for (const role of expectedRoles) {
    if (!uniqueRoles.has(role)) structuralReasons.push(`missing reviewer role ${role}`);
  }
  if (structuralReasons.length > 0) return incompleteResult(reports, structuralReasons);

  const dimensionMeans = Object.fromEntries(SCORE_KEYS.map((key) => [
    key,
    roundNumber(mean(reports.map((report) => report.scores[key]))),
  ]));
  const weightedMean = roundNumber(SCORE_KEYS.reduce(
    (sum, key) => sum + dimensionMeans[key] * SCORE_WEIGHTS[key],
    0,
  ));
  const replayEligible = reports.filter((report) => report.interactionMode === "browser-touch");
  const replayVotes = replayEligible.filter((report) => report.wouldReplay).length;
  const issueCounts = { P0: 0, P1: 0, P2: 0 };
  for (const report of reports) {
    for (const problem of report.problems) issueCounts[problem.severity] += 1;
  }
  const minimumDimension = Math.min(...Object.values(dimensionMeans));
  const reasons = [];
  let decision;
  if (issueCounts.P0 > 0) {
    decision = "DROP";
    reasons.push(`${issueCounts.P0} P0 issue(s)`);
  } else if (weightedMean < 60) {
    decision = "DROP";
    reasons.push(`weighted mean ${weightedMean} is below 60`);
  } else if (replayVotes <= 1) {
    decision = "DROP";
    reasons.push(`only ${replayVotes} eligible replay vote(s)`);
  } else if (
    weightedMean >= 75
    && minimumDimension >= 60
    && replayVotes >= 4
    && issueCounts.P1 === 0
  ) {
    decision = "RETAIN";
    reasons.push("all retain thresholds passed");
  } else {
    decision = "REWORK";
    if (weightedMean < 75) reasons.push(`weighted mean ${weightedMean} is below 75`);
    if (minimumDimension < 60) reasons.push(`minimum dimension ${minimumDimension} is below 60`);
    if (replayVotes < 4) reasons.push(`only ${replayVotes} eligible replay votes`);
    if (issueCounts.P1 > 0) reasons.push(`${issueCounts.P1} P1 issue(s)`);
  }
  return {
    gameId: reports[0].gameId,
    roundId: reports[0].roundId,
    buildCommit: reports[0].buildCommit,
    reviewerCount: reports.length,
    dimensionMeans,
    weightedMean,
    replayVotes,
    replayEligibleReviewers: replayEligible.length,
    issueCounts,
    decision,
    reasons,
  };
}

export function summarizePlaytestRounds(reports, options = {}) {
  const groups = new Map();
  for (const report of reports) {
    const key = `${report.gameId}:${report.roundId}`;
    const list = groups.get(key) ?? [];
    list.push(report);
    groups.set(key, list);
  }
  const presentGames = GAME_IDS.filter((gameId) =>
    reports.some((report) => report.gameId === gameId));
  const games = presentGames.map((gameId) => {
    const roundHistory = PLAYTEST_ROUNDS
      .map((roundId) => scoreGameRound(groups.get(`${gameId}:${roundId}`) ?? []))
      .filter((result) => result.roundId !== null)
      .sort((left, right) => ROUND_ORDER.get(left.roundId) - ROUND_ORDER.get(right.roundId));
    if (roundHistory.length === 0) {
      return {
        gameId,
        decision: "INCOMPLETE",
        currentRoundId: null,
        roundHistory: [],
        reasons: ["no complete round"],
      };
    }
    const latest = roundHistory.at(-1);
    let decision = latest.decision;
    const reasons = [...latest.reasons];
    if (latest.roundId === "rework-2" && latest.decision !== "RETAIN") {
      decision = "DROP";
      reasons.push("maximum of two rework rounds exhausted");
    }
    return {
      gameId,
      decision,
      currentRoundId: latest.roundId,
      buildCommit: latest.buildCommit,
      dimensionMeans: latest.dimensionMeans,
      weightedMean: latest.weightedMean,
      replayVotes: latest.replayVotes,
      issueCounts: latest.issueCounts,
      reasons,
      roundHistory,
    };
  });
  const incomplete = options.requireAllGames
    ? GAME_IDS.filter((gameId) => !presentGames.includes(gameId))
    : [];
  for (const gameId of incomplete) {
    games.push({
      gameId,
      decision: "INCOMPLETE",
      currentRoundId: null,
      roundHistory: [],
      reasons: ["missing baseline evidence"],
    });
  }
  return {
    schemaVersion: 1,
    thresholds: {
      retainWeightedMean: 75,
      minimumDimensionMean: 60,
      minimumReplayVotes: 4,
      requiredP0: 0,
      requiredP1: 0,
      maximumReworkRounds: 2,
    },
    weights: SCORE_WEIGHTS,
    games,
  };
}

async function findReports(root) {
  const reports = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && entry.name === "report.json") {
        const report = JSON.parse(await readFile(target, "utf8"));
        validateAiPlaytestReport(report);
        reports.push(report);
      }
    }
  }
  await visit(path.resolve(root));
  return reports;
}

function renderDecisionMarkdown(summary) {
  const lines = [
    "# AI 资深玩家评审决定",
    "",
    "> 本文由确定性评分器从已验证报告生成，不代表真实用户留存或微信生产验收。",
    "",
    "| 游戏 | 最新轮次 | 加权总分 | 有效重玩票 | P0 / P1 | 决定 |",
    "|---|---:|---:|---:|---:|---|",
  ];
  for (const game of summary.games) {
    lines.push(
      `| ${game.gameId} | ${game.currentRoundId ?? "—"} | ${game.weightedMean ?? "—"} | `
      + `${game.replayVotes ?? 0} | ${game.issueCounts?.P0 ?? 0} / ${game.issueCounts?.P1 ?? 0} | `
      + `${game.decision} |`,
    );
  }
  lines.push("", "真实用户测试状态：NOT EXECUTED", "微信生产状态：NOT EXECUTED", "");
  return lines.join("\n");
}

async function main(argv) {
  const [root, decisionPath, ...rest] = argv;
  if (!root || rest.length > 0) {
    throw new Error(
      "Usage: node summarize-ai-playtests.mjs <playtest-root> [decision.md]",
    );
  }
  const reports = await findReports(root);
  const summary = summarizePlaytestRounds(reports, { requireAllGames: true });
  const baselineReports = reports.filter((report) => report.roundId === "baseline");
  const baselineRunIds = new Set(baselineReports.flatMap((report) =>
    report.runs.map((run) => run.runId)));
  if (baselineReports.length !== 18 || baselineRunIds.size !== 54) {
    throw new Error(
      `AI_PLAYTEST_BASELINE_INCOMPLETE expected 18 reports/54 runs, got `
      + `${baselineReports.length}/${baselineRunIds.size}`,
    );
  }
  const summaryPath = path.join(path.resolve(root), "summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
  if (decisionPath) {
    await writeFile(decisionPath, renderDecisionMarkdown(summary), { flag: "wx" });
  }
  process.stdout.write(
    `AI PLAYTEST SCORE PASS | ${summary.games.map((game) =>
      `${game.gameId}:${game.decision}`).join(" | ")}\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
