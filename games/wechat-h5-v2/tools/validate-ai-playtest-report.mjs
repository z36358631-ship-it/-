import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PLAYTEST_ROUNDS = Object.freeze(["baseline", "rework-1", "rework-2"]);
export const REVIEWER_ROLES = Object.freeze([
  "action",
  "roguelite",
  "casual",
  "puzzle",
  "tower-defense",
  "skeptical-generalist",
]);
export const GAME_IDS = Object.freeze([
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
]);
export const SCORE_KEYS = Object.freeze([
  "first30Seconds",
  "inputFeedback",
  "decisionAgency",
  "threeRunVariety",
  "failureReplayUrge",
  "audiovisualQuality",
  "metaReturnReason",
  "completeness",
]);

const OUTCOMES = new Set(["win", "loss"]);
const INTERACTION_MODES = new Set(["browser-touch", "evidence-review"]);
const SEVERITIES = new Set(["P0", "P1", "P2"]);
const FORBIDDEN_ENTRY_PARAMS = new Set(["test", "seed", "speed", "mute"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoTimestamp(value) {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateStringList(errors, value, field, minimum = 0) {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }
  if (value.length < minimum) errors.push(`${field} must contain at least ${minimum} items`);
  if (value.some((item) => !nonEmptyString(item))) {
    errors.push(`${field} must contain non-empty strings`);
  }
}

function validateEvidencePath(errors, value, field) {
  if (!nonEmptyString(value)) {
    errors.push(`${field} must be a non-empty path`);
    return;
  }
  if (path.isAbsolute(value) || value.includes("\\") || value.split("/").includes("..")) {
    errors.push(`${field} must be a safe relative POSIX path`);
  }
}

export function collectAiPlaytestReportErrors(report, options = {}) {
  const errors = [];
  if (!isObject(report)) return ["report must be an object"];
  if (report.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
  if (!PLAYTEST_ROUNDS.includes(report.roundId)) errors.push("roundId is invalid");
  if (!REVIEWER_ROLES.includes(report.reviewerRole)) errors.push("reviewerRole is invalid");
  if (!GAME_IDS.includes(report.gameId)) errors.push("gameId is invalid");
  if (options.expectedRound && report.roundId !== options.expectedRound) {
    errors.push(`roundId must equal ${options.expectedRound}`);
  }
  if (options.expectedRole && report.reviewerRole !== options.expectedRole) {
    errors.push(`reviewerRole must equal ${options.expectedRole}`);
  }
  if (options.expectedGame && report.gameId !== options.expectedGame) {
    errors.push(`gameId must equal ${options.expectedGame}`);
  }
  const expectedCell = `${report.roundId}:${report.reviewerRole}:${report.gameId}`;
  if (report.matrixCellId !== expectedCell) {
    errors.push(`matrixCellId must equal ${expectedCell}`);
  }
  if (!nonEmptyString(report.reviewerId)) errors.push("reviewerId is required");
  if (!/^[0-9a-f]{40}$/u.test(report.buildCommit ?? "")) {
    errors.push("buildCommit must be 40 lowercase hexadecimal characters");
  }
  if (!INTERACTION_MODES.has(report.interactionMode)) {
    errors.push("interactionMode is invalid");
  }
  if (report.claimsActualPlay === true && report.interactionMode !== "browser-touch") {
    errors.push("claimsActualPlay requires interactionMode browser-touch");
  }

  if (!nonEmptyString(report.entryUrl)) {
    errors.push("entryUrl is required");
  } else {
    try {
      const entry = new URL(report.entryUrl);
      for (const key of FORBIDDEN_ENTRY_PARAMS) {
        if (entry.searchParams.has(key)) {
          errors.push(`entryUrl must not contain ${key}`);
        }
      }
    } catch {
      errors.push("entryUrl must be an absolute URL");
    }
  }

  if (!validIsoTimestamp(report.startedAt)) errors.push("startedAt must be ISO-8601");
  if (!validIsoTimestamp(report.finishedAt)) errors.push("finishedAt must be ISO-8601");
  if (validIsoTimestamp(report.startedAt) && validIsoTimestamp(report.finishedAt)
    && Date.parse(report.finishedAt) <= Date.parse(report.startedAt)) {
    errors.push("finishedAt must be later than startedAt");
  }

  if (!Array.isArray(report.runs) || report.runs.length !== 3) {
    errors.push("runs must contain exactly three runs");
  } else {
    const runIds = new Set();
    let screenshotCount = 0;
    report.runs.forEach((run, index) => {
      const field = `runs[${index}]`;
      if (!isObject(run)) {
        errors.push(`${field} must be an object`);
        return;
      }
      if (!nonEmptyString(run.runId)) {
        errors.push(`${field}.runId is required`);
      } else if (runIds.has(run.runId)) {
        errors.push(`${field}.runId is duplicated`);
      } else {
        runIds.add(run.runId);
      }
      if (!OUTCOMES.has(run.outcome)) errors.push(`${field}.outcome is invalid`);
      for (const timing of ["firstInputMs", "firstPayoffMs"]) {
        if (!Number.isInteger(run[timing]) || run[timing] < 0) {
          errors.push(`${field}.${timing} must be a non-negative integer`);
        }
      }
      if (Number.isInteger(run.firstInputMs) && Number.isInteger(run.firstPayoffMs)
        && run.firstPayoffMs < run.firstInputMs) {
        errors.push(`${field}.firstPayoffMs must not precede firstInputMs`);
      }
      if (!nonEmptyString(run.strategyTag)) errors.push(`${field}.strategyTag is required`);
      if (!Array.isArray(run.screenshotPaths)) {
        errors.push(`${field}.screenshotPaths must be an array`);
      } else {
        screenshotCount += run.screenshotPaths.length;
        run.screenshotPaths.forEach((value, screenshotIndex) => {
          validateEvidencePath(errors, value, `${field}.screenshotPaths[${screenshotIndex}]`);
        });
      }
      validateEvidencePath(errors, run.tracePath, `${field}.tracePath`);
      validateEvidencePath(errors, run.eventLogPath, `${field}.eventLogPath`);
    });
    if (screenshotCount < 6) errors.push("runs must reference at least six screenshots");
  }

  if (!isObject(report.scores)) {
    errors.push("scores must be an object");
  } else {
    for (const key of SCORE_KEYS) {
      if (!Number.isInteger(report.scores[key])
        || report.scores[key] < 0
        || report.scores[key] > 100) {
        errors.push(`scores.${key} must be an integer from 0 to 100`);
      }
    }
  }
  if (typeof report.wouldReplay !== "boolean") errors.push("wouldReplay must be boolean");
  validateStringList(errors, report.positives, "positives", 3);
  validateStringList(errors, report.facts, "facts");
  validateStringList(errors, report.inferences, "inferences");
  validateStringList(errors, report.unverified, "unverified");
  if (!Array.isArray(report.problems) || report.problems.length < 3) {
    errors.push("problems must contain at least three items");
  } else {
    report.problems.forEach((problem, index) => {
      if (!isObject(problem)
        || !SEVERITIES.has(problem.severity)
        || !nonEmptyString(problem.evidence)) {
        errors.push(`problems[${index}] must have severity P0/P1/P2 and evidence`);
      }
    });
  }
  return errors;
}

export function validateAiPlaytestReport(report, options = {}) {
  const errors = collectAiPlaytestReportErrors(report, options);
  if (errors.length > 0) {
    throw new Error(`AI_PLAYTEST_REPORT_INVALID\n- ${errors.join("\n- ")}`);
  }
  return report;
}

export async function validateReportEvidenceFiles(report, reportPath) {
  validateAiPlaytestReport(report);
  const base = path.dirname(path.resolve(reportPath));
  const paths = report.runs.flatMap((run) => [
    ...run.screenshotPaths,
    run.tracePath,
    run.eventLogPath,
  ]);
  for (const relativePath of paths) {
    const resolved = path.resolve(base, relativePath);
    if (!resolved.startsWith(`${base}${path.sep}`)) {
      throw new Error(`AI_PLAYTEST_EVIDENCE_OUTSIDE_REPORT:${relativePath}`);
    }
    await access(resolved);
  }
  return report;
}

async function main(argv) {
  const [reportPath, ...rest] = argv;
  if (!reportPath || rest.length > 0) {
    throw new Error("Usage: node validate-ai-playtest-report.mjs <report.json>");
  }
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  validateAiPlaytestReport(report);
  await validateReportEvidenceFiles(report, reportPath);
  process.stdout.write(
    `AI PLAYTEST REPORT PASS | ${report.matrixCellId} | 3 runs | 8 scores\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
