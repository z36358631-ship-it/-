import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const GAME_ID = "ricochet-crew";
const ENTRY_URL = `http://127.0.0.1:4173/${GAME_ID}/`;
const COMMIT = "a".repeat(40);
const DIST_HASH = "b".repeat(64);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function contentType(filePath) {
  return new Map([
    [".css", "text/css; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".png", "image/png"],
    [".svg", "image/svg+xml"],
  ]).get(path.extname(filePath).toLowerCase())
    ?? "application/octet-stream";
}

async function startExclusiveDistServer(distRoot) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, ENTRY_URL).pathname,
      );
      const relative = pathname === `/${GAME_ID}/`
        ? `${GAME_ID}/index.html`
        : pathname.replace(/^\/+/u, "");
      const target = path.resolve(distRoot, relative);
      if (!target.startsWith(`${path.resolve(distRoot)}${path.sep}`)) {
        response.writeHead(404).end();
        return;
      }
      const metadata = await stat(target);
      if (!metadata.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": contentType(target),
      });
      response.end(await readFile(target));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(4173, "127.0.0.1", resolve);
  });
  return server;
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function eventRecord({
  event,
  eventId,
  sessionId,
  runId,
  seq,
  clientAt,
  payload = {},
}) {
  return {
    eventId,
    sessionId,
    runId,
    gameId: GAME_ID,
    event,
    seq,
    clientAt,
    schemaVersion: 1,
    testMode: false,
    payload,
  };
}

export async function createAiPlaytestEvidenceFixture({
  distRoot = path.resolve("dist"),
  interaction = "tap",
  extraTraceTap = false,
} = {}) {
  if (!["tap", "gesture"].includes(interaction)) {
    throw new Error("AI_PLAYTEST_FIXTURE_INTERACTION");
  }
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), "ai-playtest-task7-"),
  );
  const tracePath = path.join(temporaryRoot, "session-trace.zip");
  let server;
  let browser;
  let context;
  try {
    server = await startExclusiveDistServer(distRoot);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await context.tracing.start({
      screenshots: false,
      snapshots: true,
      sources: false,
    });
    const startedAtMs = Date.now();
    const page = await context.newPage();
    await page.goto(ENTRY_URL, { waitUntil: "load" });
    const cdp = interaction === "gesture"
      ? await context.newCDPSession(page)
      : null;
    const files = new Map();
    files.set("entry.png", await page.screenshot({ type: "png" }));

    const sessionId = "session-task7-real";
    const runs = [];
    const actions = [];
    let requestSeq = 0;
    let eventSeq = 1;
    const coordinates = [
      { x: 195, y: 714 },
      { x: 308, y: 806 },
      { x: 308, y: 806 },
    ];
    for (let index = 1; index <= 3; index += 1) {
      const runId = `run-${index}`;
      const runStartedAt = Date.now();
      const startPath = `run-${index}-start.png`;
      const resultPath = `run-${index}-result.png`;
      files.set(startPath, await page.screenshot({ type: "png" }));

      const auditAction = async ({
        type,
        x,
        y,
        gestureId,
        perform,
      }) => {
        const requestedAt = Date.now();
        const executedAt = Date.now();
        await perform();
        const completedAt = Date.now();
        requestSeq += 1;
        actions.push({
          schemaVersion: 1,
          type,
          actionId: `action-${requestSeq}`,
          requestSeq,
          frameSeq: index - 1,
          ...(gestureId ? { gestureId } : {}),
          x,
          y,
          requestedAt,
          executedAt,
          completedAt,
          result: "success",
          sessionId,
          gameId: GAME_ID,
          runId,
        });
        return completedAt;
      };
      let firstInputAt;
      if (interaction === "tap") {
        firstInputAt = await auditAction({
          type: "touchTap",
          ...coordinates[index - 1],
          perform: () => page.touchscreen.tap(
            coordinates[index - 1].x,
            coordinates[index - 1].y,
          ),
        });
      } else {
        const gestureId = `gesture-${index}`;
        const start = coordinates[index - 1];
        firstInputAt = await auditAction({
          type: "touchBegin",
          ...start,
          gestureId,
          perform: () => cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [start],
          }),
        });
        const moved = { x: start.x + 5, y: start.y + 5 };
        await auditAction({
          type: "touchMove",
          ...moved,
          gestureId,
          perform: () => cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [moved],
          }),
        });
        await auditAction({
          type: "touchEnd",
          ...moved,
          gestureId,
          perform: () => cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          }),
        });
      }
      await page.waitForTimeout(120);
      files.set(resultPath, await page.screenshot({ type: "png" }));
      const runFinishedAt = Date.now();
      const outcome = index === 2 ? "loss" : "win";
      const events = [
        eventRecord({
          event: "run_start",
          eventId: `event-${eventSeq}`,
          sessionId,
          runId,
          seq: eventSeq++,
          clientAt: runStartedAt,
        }),
        eventRecord({
          event: "first_input",
          eventId: `event-${eventSeq}`,
          sessionId,
          runId,
          seq: eventSeq++,
          clientAt: firstInputAt,
        }),
        eventRecord({
          event: "first_payoff",
          eventId: `event-${eventSeq}`,
          sessionId,
          runId,
          seq: eventSeq++,
          clientAt: Math.min(runFinishedAt - 1, firstInputAt + 10),
        }),
        eventRecord({
          event: "run_end",
          eventId: `event-${eventSeq}`,
          sessionId,
          runId,
          seq: eventSeq++,
          clientAt: runFinishedAt,
          payload: { result: outcome },
        }),
      ];
      const eventPath = `run-${index}-events.json`;
      files.set(eventPath, Buffer.from(`${JSON.stringify({
        runId,
        outcome,
        events,
      })}\n`));
      runs.push({
        runId,
        outcome,
        firstInputMs: Math.round(firstInputAt - runStartedAt),
        firstInputNote: "derived from production telemetry",
        firstPayoffMs: Math.round(
          events[2].clientAt - runStartedAt,
        ),
        firstPayoffNote: "derived from production telemetry",
        screenshotPaths: [startPath, resultPath],
        tracePath: "session-trace.zip",
        eventLogPath: eventPath,
      });
    }
    if (extraTraceTap) await page.touchscreen.tap(50, 50);
    const finishedAtMs = Date.now();
    await page.title();
    files.set(
      "session-actions.jsonl",
      Buffer.from(actions.map((action) => JSON.stringify(action)).join("\n") + "\n"),
    );
    await context.tracing.stop({ path: tracePath });
    files.set("session-trace.zip", await readFile(tracePath));

    const evidenceSha256 = Object.fromEntries(
      [...files].map(([name, bytes]) => [name, sha256(bytes)]),
    );
    const source = {
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: true,
      statusEntries: [],
    };
    const served = {
      expectedCommit: COMMIT,
      gameId: GAME_ID,
      aggregateSha256: DIST_HASH,
      fileCount: 1,
      files: [],
    };
    const sessionEvidence = {
      schemaVersion: 1,
      evidenceOnly: true,
      subjectiveScoresGenerated: false,
      roundId: "baseline",
      matrixCellId: `baseline:action:${GAME_ID}`,
      reviewerRole: "action",
      gameId: GAME_ID,
      requestedEntryUrl: ENTRY_URL,
      entryUrl: ENTRY_URL,
      buildCommit: COMMIT,
      source,
      sourceAtFinish: structuredClone(source),
      sourceStable: true,
      servedDist: {
        start: served,
        finish: structuredClone(served),
        stable: true,
      },
      interactionMode: "browser-touch",
      executionTrust: "local-audited",
      entryScreenshotPath: "entry.png",
      actionLogPath: "session-actions.jsonl",
      tracePath: "session-trace.zip",
      driver: {
        protocol: "loopback-whitelist-v1",
        sessionId,
        descriptorPath: null,
        fatalReason: null,
      },
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      runtimeSafety: { normalEntry: true },
      status: "CAPTURED",
      runs,
      evidenceSha256,
      diagnostics: {
        terminalError: null,
        terminalErrors: [],
        completionNotes: [],
        consoleErrors: [],
        pageErrors: [],
        requestFailures: [],
        badResponses: [],
        externalRequests: [],
      },
    };
    const reportDraft = {
      schemaVersion: 1,
      draftOnly: true,
      evidenceOnly: true,
      subjectiveReviewRequired: true,
      subjectiveScoresGenerated: false,
      roundId: sessionEvidence.roundId,
      matrixCellId: sessionEvidence.matrixCellId,
      reviewerId: null,
      reviewerRole: sessionEvidence.reviewerRole,
      gameId: GAME_ID,
      buildCommit: COMMIT,
      entryUrl: ENTRY_URL,
      interactionMode: "browser-touch",
      claimsActualPlay: null,
      sessionId,
      startedAt: sessionEvidence.startedAt,
      finishedAt: sessionEvidence.finishedAt,
      evidenceSha256: structuredClone(evidenceSha256),
      runs: runs.map((run) => ({
        ...structuredClone(run),
        strategyTag: null,
        strategyTagNote: "external reviewer required",
      })),
    };
    return {
      session: sessionEvidence,
      report: reportDraft,
      evidenceByPath: files,
      sessionEvidence,
      reportDraft,
      files,
      actualBrowserCapture: true,
      capture: {
        browserName: "chromium",
        entryUrl: ENTRY_URL,
        port: 4173,
        tapCount: interaction === "tap"
          ? 3 + Number(extraTraceTap)
          : 0,
        interaction,
      },
    };
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server) await closeServer(server).catch(() => {});
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
