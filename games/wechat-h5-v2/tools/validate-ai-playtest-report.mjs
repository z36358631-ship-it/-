import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  FORMAL_EVIDENCE_PATHS,
  referencedEvidencePaths,
} from "./ai-playtest/formal-evidence-set.mjs";
import {
  validateCapturedSessionEvidence,
} from "./ai-playtest/session-evidence-validator.mjs";

export { referencedEvidencePaths };

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
  if (report.draftOnly !== false) errors.push("draftOnly must equal false");
  if (report.evidenceOnly !== false) errors.push("evidenceOnly must equal false");
  if (report.subjectiveScoresGenerated !== true) {
    errors.push("subjectiveScoresGenerated must equal true");
  }
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
  if (!nonEmptyString(report.sessionId)) errors.push("sessionId is required");
  const dedicatedEvidence = [
    ["sessionEvidencePath", "sessionEvidenceSha256"],
    ["entryScreenshotPath", "entryScreenshotSha256"],
    ["actionLogPath", "actionLogSha256"],
    ["tracePath", "traceSha256"],
  ];
  for (const [pathField, hashField] of dedicatedEvidence) {
    const expectedPath = FORMAL_EVIDENCE_PATHS[pathField];
    if (report[pathField] !== expectedPath) {
      errors.push(`${pathField} must equal ${expectedPath}`);
    }
    validateEvidencePath(errors, report[pathField], pathField);
    if (!/^[a-f0-9]{64}$/u.test(report[hashField] ?? "")) {
      errors.push(`${hashField} must be a lowercase SHA-256`);
    }
  }
  if (!INTERACTION_MODES.has(report.interactionMode)) {
    errors.push("interactionMode is invalid");
  }
  if (typeof report.claimsActualPlay !== "boolean") {
    errors.push("claimsActualPlay must be boolean");
  }
  if (report.claimsActualPlay === true && report.interactionMode !== "browser-touch") {
    errors.push("claimsActualPlay requires interactionMode browser-touch");
  }

  const expectedEntryUrl =
    `http://127.0.0.1:4173/${report.gameId}/`;
  if (report.entryUrl !== expectedEntryUrl) {
    errors.push(`entryUrl must equal ${expectedEntryUrl}`);
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
    const screenshotPaths = new Set();
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
      if (!Number.isInteger(run.firstInputMs) || run.firstInputMs < 0) {
        errors.push(`${field}.firstInputMs must be a non-negative integer`);
      }
      if (run.firstPayoffMs === null) {
        if (!nonEmptyString(run.firstPayoffNote)) {
          errors.push(`${field}.firstPayoffNote is required when firstPayoffMs is null`);
        }
      } else if (!Number.isInteger(run.firstPayoffMs) || run.firstPayoffMs < 0) {
        errors.push(`${field}.firstPayoffMs must be a non-negative integer or null`);
      }
      if (Number.isInteger(run.firstInputMs) && Number.isInteger(run.firstPayoffMs)
        && run.firstPayoffMs < run.firstInputMs) {
        errors.push(`${field}.firstPayoffMs must not precede firstInputMs`);
      }
      if (!nonEmptyString(run.strategyTag)) errors.push(`${field}.strategyTag is required`);
      if (!Array.isArray(run.screenshotPaths)) {
        errors.push(`${field}.screenshotPaths must be an array`);
      } else {
        if (run.screenshotPaths.length < 2) {
          errors.push(`${field}.screenshotPaths must contain start and result screenshots`);
        }
        screenshotCount += run.screenshotPaths.length;
        run.screenshotPaths.forEach((value, screenshotIndex) => {
          validateEvidencePath(errors, value, `${field}.screenshotPaths[${screenshotIndex}]`);
          if (screenshotPaths.has(value)) {
            errors.push(`SCREENSHOT_PATH_DUPLICATE ${value}`);
          } else {
            screenshotPaths.add(value);
          }
        });
      }
      validateEvidencePath(errors, run.tracePath, `${field}.tracePath`);
      if (run.tracePath !== report.tracePath) {
        errors.push(`${field}.tracePath must equal tracePath`);
      }
      validateEvidencePath(errors, run.eventLogPath, `${field}.eventLogPath`);
    });
    if (screenshotCount < 6) errors.push("runs must reference at least six screenshots");
  }

  if (!isObject(report.evidenceSha256)) {
    errors.push("evidenceSha256 must be an object");
  } else if (Array.isArray(report.runs) && report.runs.length === 3) {
    const referenced = referencedEvidencePaths(report);
    const uniqueReferenced = new Set(referenced);
    for (const evidencePath of uniqueReferenced) {
      if (!/^[a-f0-9]{64}$/u.test(report.evidenceSha256[evidencePath] ?? "")) {
        errors.push(`evidenceSha256.${evidencePath} must be a lowercase SHA-256`);
      }
    }
    const extras = Object.keys(report.evidenceSha256)
      .filter((evidencePath) => !uniqueReferenced.has(evidencePath));
    if (extras.length > 0) {
      errors.push(`evidenceSha256 contains unreferenced paths: ${extras.join(",")}`);
    }
    for (const run of report.runs) {
      if (!isObject(run) || !Array.isArray(run.screenshotPaths)
        || run.screenshotPaths.length < 2) continue;
      const startHash = report.evidenceSha256[run.screenshotPaths[0]];
      const resultHash = report.evidenceSha256[run.screenshotPaths.at(-1)];
      if (/^[a-f0-9]{64}$/u.test(startHash ?? "") && startHash === resultHash) {
        errors.push(
          `SCREENSHOT_START_RESULT_IDENTICAL ${run.screenshotPaths[0]} `
          + `${run.screenshotPaths.at(-1)}`,
        );
      }
    }
    for (const [pathField, hashField] of dedicatedEvidence) {
      const evidencePath = report[pathField];
      if (
        /^[a-f0-9]{64}$/u.test(report[hashField] ?? "")
        && report[hashField] !== report.evidenceSha256[evidencePath]
      ) {
        errors.push(
          `${hashField} must equal evidenceSha256.${evidencePath}`,
        );
      }
    }
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
  const evidenceByPath = new Map();
  for (const relativePath of referencedEvidencePaths(report)) {
    const resolved = path.resolve(base, relativePath);
    if (!resolved.startsWith(`${base}${path.sep}`)) {
      throw new Error(`AI_PLAYTEST_EVIDENCE_OUTSIDE_REPORT:${relativePath}`);
    }
    const bytes = await readFile(resolved);
    if (bytes.length === 0) throw new Error(`AI_PLAYTEST_EVIDENCE_EMPTY:${relativePath}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== report.evidenceSha256[relativePath]) {
      throw new Error(`AI_PLAYTEST_EVIDENCE_HASH_MISMATCH:${relativePath}`);
    }
    evidenceByPath.set(relativePath, bytes);
  }
  let session;
  try {
    session = JSON.parse(
      evidenceByPath.get(report.sessionEvidencePath).toString("utf8"),
    );
  } catch {
    throw new Error(
      `AI_PLAYTEST_SESSION_EVIDENCE_JSON_INVALID:${report.sessionEvidencePath}`,
    );
  }
  const canonicalEvidence = new Map(evidenceByPath);
  canonicalEvidence.delete(report.sessionEvidencePath);
  await validateCapturedSessionEvidence({
    session,
    report: {
      ...report,
      draftOnly: true,
      evidenceOnly: true,
      subjectiveScoresGenerated: false,
      evidenceSha256: session.evidenceSha256,
    },
    evidenceByPath: canonicalEvidence,
  });
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
