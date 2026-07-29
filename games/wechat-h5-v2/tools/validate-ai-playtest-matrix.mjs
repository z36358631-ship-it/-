import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  GAME_IDS,
  PLAYTEST_ROUNDS,
  REVIEWER_ROLES,
  validateAiPlaytestReport,
  validateReportEvidenceFiles,
} from "./validate-ai-playtest-report.mjs";

async function findReportFiles(root) {
  const found = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(target);
      } else if (entry.isFile() && entry.name === "report.json") {
        found.push(target);
      }
    }
  }
  await visit(path.resolve(root));
  return found.sort((left, right) => left.localeCompare(right));
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export async function validateAiPlaytestMatrix({
  root,
  roundId,
  roles = REVIEWER_ROLES,
  games = GAME_IDS,
  expectedReports = roles.length * games.length,
  expectedRuns = expectedReports * 3,
  checkEvidenceFiles = false,
} = {}) {
  if (!root) throw new Error("matrix root is required");
  if (!PLAYTEST_ROUNDS.includes(roundId)) throw new Error(`invalid round: ${roundId}`);
  const uniqueRoles = [...new Set(roles)];
  const uniqueGames = [...new Set(games)];
  if (uniqueRoles.length !== roles.length || roles.some((role) => !REVIEWER_ROLES.includes(role))) {
    throw new Error("roles must be unique supported reviewer roles");
  }
  if (uniqueGames.length !== games.length || games.some((game) => !GAME_IDS.includes(game))) {
    throw new Error("games must be unique supported game IDs");
  }
  const expectedReportCount = parsePositiveInteger(expectedReports, "expectedReports");
  const expectedRunCount = parsePositiveInteger(expectedRuns, "expectedRuns");
  if (expectedReportCount !== roles.length * games.length) {
    throw new Error("expectedReports must equal roles × games");
  }
  if (expectedRunCount !== expectedReportCount * 3) {
    throw new Error("expectedRuns must equal expectedReports × 3");
  }

  const basename = path.basename(path.resolve(root));
  if (PLAYTEST_ROUNDS.includes(basename) && basename !== roundId) {
    throw new Error(`matrix directory round ${basename} does not match ${roundId}`);
  }
  const reportFiles = await findReportFiles(root);
  if (reportFiles.length !== expectedReportCount) {
    throw new Error(
      `AI_PLAYTEST_MATRIX_REPORT_COUNT expected ${expectedReportCount}, got ${reportFiles.length}`,
    );
  }

  const reports = [];
  const cells = new Map();
  const runIds = new Map();
  const commits = new Set();
  for (const reportPath of reportFiles) {
    let report;
    try {
      report = JSON.parse(await readFile(reportPath, "utf8"));
    } catch (error) {
      throw new Error(`AI_PLAYTEST_MATRIX_JSON ${reportPath}: ${error.message}`);
    }
    validateAiPlaytestReport(report, { expectedRound: roundId });
    if (!roles.includes(report.reviewerRole) || !games.includes(report.gameId)) {
      throw new Error(`AI_PLAYTEST_MATRIX_UNEXPECTED_CELL ${report.matrixCellId}`);
    }
    if (checkEvidenceFiles) await validateReportEvidenceFiles(report, reportPath);
    if (cells.has(report.matrixCellId)) {
      throw new Error(`AI_PLAYTEST_MATRIX_DUPLICATE_CELL ${report.matrixCellId}`);
    }
    cells.set(report.matrixCellId, reportPath);
    commits.add(report.buildCommit);
    for (const run of report.runs) {
      const previous = runIds.get(run.runId);
      if (previous) {
        throw new Error(
          `AI_PLAYTEST_MATRIX_DUPLICATE_RUN_ID duplicate runId ${run.runId}: `
          + `${previous} and ${reportPath}`,
        );
      }
      runIds.set(run.runId, reportPath);
    }
    reports.push(report);
  }

  for (const role of roles) {
    for (const game of games) {
      const cell = `${roundId}:${role}:${game}`;
      if (!cells.has(cell)) throw new Error(`AI_PLAYTEST_MATRIX_MISSING_CELL ${cell}`);
    }
  }
  if (runIds.size !== expectedRunCount) {
    throw new Error(`AI_PLAYTEST_MATRIX_RUN_COUNT expected ${expectedRunCount}, got ${runIds.size}`);
  }
  if (commits.size !== 1) {
    throw new Error(`AI_PLAYTEST_MATRIX_MIXED_COMMIT ${[...commits].join(",")}`);
  }

  return {
    schemaVersion: 1,
    roundId,
    buildCommit: [...commits][0],
    roles: [...roles],
    games: [...games],
    reportCount: reports.length,
    runCount: runIds.size,
    matrixCells: [...cells.keys()].sort(),
    reports,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`invalid argument near ${key}`);
    }
    options[key.slice(2)] = value;
    index += 1;
  }
  return options;
}

async function main(argv) {
  const args = parseArgs(argv);
  const matrix = await validateAiPlaytestMatrix({
    root: args.root,
    roundId: args.round,
    roles: args.roles ? args.roles.split(",") : REVIEWER_ROLES,
    games: args.games ? args.games.split(",") : GAME_IDS,
    expectedReports: args["expected-reports"]
      ? parsePositiveInteger(args["expected-reports"], "expected-reports")
      : undefined,
    expectedRuns: args["expected-runs"]
      ? parsePositiveInteger(args["expected-runs"], "expected-runs")
      : undefined,
    checkEvidenceFiles: args["check-files"] !== "false",
  });
  const output = {
    ...matrix,
    reports: matrix.reports.map((report) => ({
      matrixCellId: report.matrixCellId,
      reviewerId: report.reviewerId,
      interactionMode: report.interactionMode,
      runIds: report.runs.map((run) => run.runId),
    })),
  };
  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (args.output) await writeFile(args.output, json, { flag: "wx" });
  process.stdout.write(
    `AI PLAYTEST MATRIX PASS | ${output.reportCount} reports | ${output.runCount} unique runIds | ${output.buildCommit}\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
