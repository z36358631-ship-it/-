import { execFile } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import {
  GAME_IDS,
  PLAYTEST_ROUNDS,
  REVIEWER_ROLES,
} from "./validate-ai-playtest-report.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_URLS = Object.freeze({
  "ricochet-crew": "http://127.0.0.1:5174/",
  "monster-night-market": "http://127.0.0.1:5175/",
  "three-lane-squad": "http://127.0.0.1:5176/",
});
const FORBIDDEN_ENTRY_PARAMS = ["test", "seed", "speed", "mute"];

async function pathExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export function validateSessionOptions(options) {
  const {
    roundId,
    gameId,
    reviewerRole,
    entryUrl = DEFAULT_URLS[gameId],
    output,
  } = options;
  if (!PLAYTEST_ROUNDS.includes(roundId)) throw new Error(`invalid roundId: ${roundId}`);
  if (!GAME_IDS.includes(gameId)) throw new Error(`invalid gameId: ${gameId}`);
  if (!REVIEWER_ROLES.includes(reviewerRole)) {
    throw new Error(`invalid reviewerRole: ${reviewerRole}`);
  }
  if (!output || typeof output !== "string") throw new Error("output is required");
  let parsedUrl;
  try {
    parsedUrl = new URL(entryUrl);
  } catch {
    throw new Error("entryUrl must be absolute");
  }
  const forbidden = FORBIDDEN_ENTRY_PARAMS.find((key) => parsedUrl.searchParams.has(key));
  if (forbidden) {
    throw new Error(`normal entry required; entryUrl contains forbidden ${forbidden}`);
  }
  const resolvedOutput = path.resolve(output);
  if (path.basename(path.dirname(resolvedOutput)) !== roundId
    || path.basename(resolvedOutput) !== `${reviewerRole}-${gameId}`) {
    throw new Error(
      "output must be <root>/<round>/<reviewer>-<game> to prevent matrix-cell overwrite",
    );
  }
  return {
    ...options,
    roundId,
    gameId,
    reviewerRole,
    entryUrl: parsedUrl.href,
    output: resolvedOutput,
    matrixCellId: `${roundId}:${reviewerRole}:${gameId}`,
  };
}

async function gitCommit(cwd) {
  try {
    const result = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd });
    const commit = result.stdout.trim();
    return /^[0-9a-f]{40}$/u.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

async function readTelemetry(page, gameId) {
  return page.evaluate((storageKey) => {
    try {
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }, `telemetry:${gameId}:queue`);
}

export async function captureAiPlaytestSession(rawOptions) {
  const options = validateSessionOptions(rawOptions);
  if (await pathExists(options.output)) {
    throw new Error(`AI_PLAYTEST_OUTPUT_EXISTS:${options.output}`);
  }
  await mkdir(options.output, { recursive: true });
  const browser = await chromium.launch({ headless: options.headed !== true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const badResponses = [];
  const externalRequests = [];
  const entryOrigin = new URL(options.entryUrl).origin;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push({ url: response.url(), status: response.status() });
    }
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (!["data:", "blob:"].includes(requestUrl.protocol) && requestUrl.origin !== entryOrigin) {
      externalRequests.push(request.url());
    }
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const startedAt = new Date().toISOString();
  const observedRuns = new Map();
  let terminalError = null;
  try {
    await page.goto(options.entryUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(options.output, "entry.png"), fullPage: true });
    const deadline = Date.now() + (options.timeoutMs ?? 15 * 60_000);
    while (Date.now() < deadline && observedRuns.size < 3) {
      const events = await readTelemetry(page, options.gameId);
      const starts = events.filter((event) => event.event === "run_start" && event.runId);
      const ends = events.filter((event) => event.event === "run_end" && event.runId);
      for (const start of starts) {
        if (!observedRuns.has(start.runId)) {
          observedRuns.set(start.runId, {
            runId: start.runId,
            startedEvent: start,
            endedEvent: null,
          });
          const index = observedRuns.size;
          await page.screenshot({
            path: path.join(options.output, `run-${index}-start.png`),
            fullPage: true,
          });
        }
      }
      for (const end of ends) {
        const run = observedRuns.get(end.runId);
        if (!run || run.endedEvent) continue;
        run.endedEvent = end;
        const index = [...observedRuns.keys()].indexOf(end.runId) + 1;
        await page.screenshot({
          path: path.join(options.output, `run-${index}-result.png`),
          fullPage: true,
        });
        const runEvents = events.filter((event) => event.runId === end.runId);
        await writeFile(
          path.join(options.output, `run-${index}-events.json`),
          `${JSON.stringify(runEvents, null, 2)}\n`,
          { flag: "wx" },
        );
      }
      const completed = [...observedRuns.values()].filter((run) => run.endedEvent);
      if (completed.length >= 3) break;
      await page.waitForTimeout(500);
    }
  } catch (error) {
    terminalError = error instanceof Error ? error.message : String(error);
  } finally {
    await context.tracing.stop({ path: path.join(options.output, "session-trace.zip") });
    await browser.close();
  }

  const completedRuns = [...observedRuns.values()].filter((run) => run.endedEvent).slice(0, 3);
  const evidence = {
    schemaVersion: 1,
    evidenceOnly: true,
    subjectiveScoresGenerated: false,
    status: terminalError || completedRuns.length !== 3 ? "INCOMPLETE" : "CAPTURED",
    roundId: options.roundId,
    matrixCellId: options.matrixCellId,
    reviewerRole: options.reviewerRole,
    gameId: options.gameId,
    entryUrl: options.entryUrl,
    buildCommit: await gitCommit(process.cwd()),
    interactionMode: "browser-touch",
    startedAt,
    finishedAt: new Date().toISOString(),
    runs: completedRuns.map((run, index) => ({
      runId: run.runId,
      outcome: run.endedEvent.payload?.result ?? "unknown",
      screenshotPaths: [`run-${index + 1}-start.png`, `run-${index + 1}-result.png`],
      tracePath: "session-trace.zip",
      eventLogPath: `run-${index + 1}-events.json`,
    })),
    diagnostics: {
      consoleErrors,
      pageErrors,
      requestFailures,
      badResponses,
      externalRequests: [...new Set(externalRequests)],
      terminalError,
    },
  };
  await writeFile(
    path.join(options.output, "session-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    { flag: "wx" },
  );
  if (evidence.status !== "CAPTURED") {
    throw new Error(
      `AI_PLAYTEST_SESSION_INCOMPLETE captured ${completedRuns.length}/3 completed runs`,
    );
  }
  return evidence;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--headed") {
      args.headed = true;
      continue;
    }
    const value = argv[index + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`invalid argument near ${key}`);
    }
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const evidence = await captureAiPlaytestSession({
    roundId: args.round,
    gameId: args.game,
    reviewerRole: args.reviewer,
    entryUrl: args.url ?? DEFAULT_URLS[args.game],
    output: args.output,
    timeoutMs: args["timeout-ms"] ? Number(args["timeout-ms"]) : undefined,
    headed: args.headed,
  });
  process.stdout.write(
    `AI PLAYTEST EVIDENCE CAPTURED | ${evidence.matrixCellId} | 3 runs | no scores generated\n`,
  );
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
