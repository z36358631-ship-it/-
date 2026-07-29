import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCompleteRunObservation,
  assertExpectedEntryUrl,
  assertNormalRuntimeSnapshot,
  assertSourceState,
  assertStableSourceState,
  buildReportDraft,
  buildRunEventLog,
  buildRunMachineFacts,
  collectRunCompletionIssues,
  createRunObservationState,
  finalizeSessionEvidence,
  hashRunEvidence,
  normalizeOutcome,
  observeRunPoll,
  runClaimedSessionLifecycle,
  stopAndPublishSessionTrace,
  validateSessionOptions,
  verifyServedDistFiles,
  writeJsonExclusive,
} from "../../tools/run-ai-playtest-session.mjs";
import {
  claimOutputDirectory,
  publishBufferExclusive,
  publishTemporaryFileExclusive,
  quarantineIncompleteSession,
} from "../../tools/ai-playtest/exclusive-artifacts.mjs";
import {
  runSessionLifecycle,
} from "../../tools/ai-playtest/session-lifecycle.mjs";

const COMMIT = "a".repeat(40);

function validOptions(overrides = {}) {
  return {
    roundId: "baseline",
    gameId: "ricochet-crew",
    reviewerRole: "action",
    entryUrl: "http://127.0.0.1:5174/",
    output: "evidence/baseline/action-ricochet-crew",
    expectedCommit: COMMIT,
    ...overrides,
  };
}

function lifecycleEvent(event, runId, seq, eventId = `${event}-${runId}-${seq}`) {
  return {
    eventId,
    sessionId: "session-1",
    runId,
    gameId: "ricochet-crew",
    event,
    seq,
    clientAt: seq * 1_000,
    schemaVersion: 1,
    testMode: false,
    payload: event === "run_end" ? { result: "won" } : {},
  };
}

async function assertExclusiveBufferRace(payloads) {
  const root = await mkdtemp(path.join(tmpdir(), "ai-buffer-race-"));
  const target = path.join(root, "entry.png");
  try {
    const results = await Promise.allSettled(
      payloads.map((payload) => publishBufferExclusive(target, payload)),
    );
    assert.equal(
      results.filter(({ status }) => status === "fulfilled").length,
      1,
    );
    assert.equal(
      results.filter(({ status }) => status === "rejected").length,
      1,
    );
    assert.match(
      String(results.find(({ status }) => status === "rejected")?.reason),
      /AI_PLAYTEST_ARTIFACT_EXISTS/u,
    );
    const published = await readFile(target);
    assert.equal(payloads.some((payload) => published.equals(payload)), true);
    assert.deepEqual(
      (await readdir(root)).filter((entry) => entry.endsWith(".tmp")),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function fakeBrowserResources({
  failurePoint,
  calls,
  traceOptions,
  closeFailures = [],
}) {
  const failAt = (point) => {
    if (failurePoint === point) {
      throw new Error(`simulated ${point} initialization failure`);
    }
  };
  const page = {
    async close() {
      calls.push("close:page");
      if (closeFailures.includes("page")) throw new Error("page-close-failed");
    },
  };
  const context = {
    tracing: {
      async start(options) {
        calls.push("init:tracing");
        traceOptions.push(options);
        failAt("tracing");
      },
    },
    async newPage() {
      calls.push("init:page");
      failAt("page");
      return page;
    },
    async close() {
      calls.push("close:context");
      if (closeFailures.includes("context")) {
        throw new Error("context-close-failed");
      }
    },
  };
  const browser = {
    async newContext() {
      calls.push("init:context");
      failAt("context");
      return context;
    },
    async close() {
      calls.push("close:browser");
      if (closeFailures.includes("browser")) {
        throw new Error("browser-close-failed");
      }
    },
  };
  return {
    async launch() {
      calls.push("init:launch");
      failAt("launch");
      return browser;
    },
    async configurePage() {
      calls.push("init:configure_page");
      failAt("configure_page");
    },
    async execute() {},
    async stopTracing() {
      calls.push("stop:tracing");
    },
  };
}

function expectedClosures(failurePoint) {
  return {
    launch: [],
    context: ["close:browser"],
    page: ["close:context", "close:browser"],
    configure_page: ["close:page", "close:context", "close:browser"],
    tracing: ["close:page", "close:context", "close:browser"],
  }[failurePoint];
}

describe("formal AI playtest staged lifecycle", () => {
  for (const failurePoint of [
    "launch",
    "context",
    "page",
    "configure_page",
    "tracing",
  ]) {
    it(`closes every initialized resource when ${failurePoint} initialization fails`, async () => {
      const calls = [];
      const traceOptions = [];
      await assert.rejects(
        runSessionLifecycle(
          fakeBrowserResources({ failurePoint, calls, traceOptions }),
        ),
        /AI_PLAYTEST_INITIALIZATION/u,
      );
      assert.deepEqual(
        calls.filter((name) => name.startsWith("close:")),
        expectedClosures(failurePoint),
      );
      if (failurePoint === "tracing") {
        assert.equal(calls.includes("stop:tracing"), true);
      }
    });
  }

  it("starts tracing with only snapshots enabled", async () => {
    const calls = [];
    const traceOptions = [];
    await runSessionLifecycle(
      fakeBrowserResources({ failurePoint: null, calls, traceOptions }),
    );
    assert.deepEqual(traceOptions, [{
      screenshots: false,
      snapshots: true,
      sources: false,
    }]);
    assert.deepEqual(
      calls.filter((name) => name.startsWith("close:")),
      ["close:page", "close:context", "close:browser"],
    );
  });

  it("preserves tracing start, stop and every close failure", async () => {
    const calls = [];
    const traceOptions = [];
    const recorded = [];
    const resources = fakeBrowserResources({
      failurePoint: "tracing",
      calls,
      traceOptions,
      closeFailures: ["page", "context", "browser"],
    });
    resources.stopTracing = async () => {
      calls.push("stop:tracing");
      throw new Error("trace-stop-failed");
    };
    resources.recordError = (error) => recorded.push(error);
    await assert.rejects(
      runSessionLifecycle(resources),
      (error) => {
        assert.equal(error instanceof AggregateError, true);
        const messages = error.errors.map((item) => item.message).join("|");
        assert.match(messages, /tracing initialization failure/u);
        assert.match(messages, /trace-stop-failed/u);
        assert.match(messages, /page-close-failed/u);
        assert.match(messages, /context-close-failed/u);
        assert.match(messages, /browser-close-failed/u);
        return true;
      },
    );
    assert.equal(recorded.length, 4);
  });

  it("cleans a partial trace through the claimed-session orchestration", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-trace-partial-"));
    const partial = path.join(root, ".session-trace.partial.tmp");
    const calls = [];
    const terminalErrors = [];
    try {
      const page = {
        async close() {
          calls.push("close:page");
        },
      };
      const context = {
        tracing: {
          async start() {},
          async stop({ path: target }) {
            await writeFile(target, "partial", { flag: "wx" });
            throw new Error("trace-stop-partial-failed");
          },
        },
        async newPage() {
          return page;
        },
        async close() {
          calls.push("close:context");
        },
      };
      const browser = {
        async newContext() {
          return context;
        },
        async close() {
          calls.push("close:browser");
        },
      };
      const lifecycle = await runClaimedSessionLifecycle({
        output: root,
        launch: async () => browser,
        configurePage: async () => {},
        execute: async () => {},
        recordError: (error) => terminalErrors.push(error.message),
        stopTraceOptions: {
          temporaryPath: async () => partial,
          cleanupRetryDelaysMs: [0, 0],
          wait: async () => {},
        },
      });
      assert.match(lifecycle.traceError.message, /trace-stop-partial-failed/u);
      assert.match(terminalErrors.join("|"), /trace-stop-partial-failed/u);
      await assert.rejects(readFile(partial), { code: "ENOENT" });
      assert.deepEqual(calls, [
        "close:page",
        "close:context",
        "close:browser",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves the trace error when partial trace cleanup also fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-trace-cleanup-"));
    const partial = path.join(root, ".session-trace.partial.tmp");
    const traceError = new Error("trace-stop-partial-failed");
    const cleanupError = Object.assign(new Error("trace-cleanup-failed"), {
      code: "EBUSY",
    });
    try {
      await assert.rejects(
        stopAndPublishSessionTrace({
          context: {
            tracing: {
              async stop({ path: target }) {
                await writeFile(target, "partial", { flag: "wx" });
                throw traceError;
              },
            },
          },
          output: root,
          temporaryPath: async () => partial,
          unlinkImpl: async () => {
            throw cleanupError;
          },
          cleanupRetryDelaysMs: [0, 0],
          wait: async () => {},
        }),
        (error) => {
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(traceError), true);
          assert.equal(error.errors.includes(cleanupError), true);
          assert.match(error.message, /trace-stop-partial-failed/u);
          assert.match(error.message, /AI_PLAYTEST_TRACE_TEMP_CLEANUP_FAILED/u);
          return true;
        },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes INCOMPLETE evidence without success hashing when trace stop fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-trace-failure-"));
    const calls = [];
    const traceOptions = [];
    const terminalErrors = [];
    let hashCalls = 0;
    try {
      const resources = fakeBrowserResources({
        failurePoint: null,
        calls,
        traceOptions,
      });
      resources.stopTracing = async () => {
        throw new Error("trace-stop-failed");
      };
      resources.recordError = (error) => {
        terminalErrors.push(error instanceof Error ? error.message : String(error));
      };
      const lifecycle = await runSessionLifecycle(resources);
      const result = await finalizeSessionEvidence({
        output: directory,
        traceError: lifecycle.traceError,
        completedRuns: [],
        terminalErrors,
        hashEvidence: async () => {
          hashCalls += 1;
          throw new Error("success-only hasher must not run");
        },
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.match(result.diagnostics.terminalErrors.join("|"), /trace-stop-failed/u);
      assert.equal(hashCalls, 0);
      assert.equal(
        JSON.parse(
          await readFile(path.join(directory, "session-evidence.json"), "utf8"),
        ).status,
        "INCOMPLETE",
      );
      await assert.rejects(
        readFile(path.join(directory, "report-draft.json")),
        { code: "ENOENT" },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("quarantines durable INCOMPLETE evidence and returns its diagnostic path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-finalize-quarantine-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    try {
      await claimOutputDirectory(output);
      const result = await finalizeSessionEvidence({
        output,
        traceError: new Error("trace-stop-failed"),
        completedRuns: [],
        invalidRoot,
        sessionId: "session-1",
        quarantineImpl: (options) => quarantineIncompleteSession({
          ...options,
          randomId: () => "fixed-id",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        }),
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.match(result.invalidOutput, /session-1-fixed-id/u);
      assert.equal(
        JSON.parse(
          await readFile(
            path.join(result.invalidOutput, "session-evidence.json"),
            "utf8",
          ),
        ).status,
        "INCOMPLETE",
      );
      await assert.rejects(readFile(path.join(output, "session-evidence.json")), {
        code: "ENOENT",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("finalizes and quarantines evidence after launch initialization fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-init-quarantine-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const calls = [];
    const traceOptions = [];
    let initializationFailure;
    let hashCalls = 0;
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        runSessionLifecycle(fakeBrowserResources({
          failurePoint: "launch",
          calls,
          traceOptions,
        })),
        (error) => {
          initializationFailure = error;
          return /AI_PLAYTEST_INITIALIZATION_LAUNCH/u.test(error.message);
        },
      );
      const result = await finalizeSessionEvidence({
        output,
        completedRuns: [],
        terminalErrors: [initializationFailure],
        invalidRoot,
        sessionId: "session-1",
        hashEvidence: async () => {
          hashCalls += 1;
          throw new Error("success-only hasher must not run");
        },
        quarantineImpl: (options) => quarantineIncompleteSession({
          ...options,
          randomId: () => "fixed-id",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        }),
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.equal(hashCalls, 0);
      assert.match(
        result.diagnostics.terminalErrors.join("|"),
        /AI_PLAYTEST_INITIALIZATION_LAUNCH/u,
      );
      assert.equal(
        JSON.parse(
          await readFile(
            path.join(result.invalidOutput, "session-evidence.json"),
            "utf8",
          ),
        ).status,
        "INCOMPLETE",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("downgrades and quarantines when a CAPTURED candidate write fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-captured-write-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const reportError = new Error("report-candidate-write-failed");
    try {
      await claimOutputDirectory(output);
      const result = await finalizeSessionEvidence({
        output,
        baseEvidence: {
          roundId: "baseline",
          matrixCellId: "baseline:action:ricochet-crew",
          reviewerRole: "action",
          gameId: "ricochet-crew",
          buildCommit: COMMIT,
          entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
          startedAt: "2026-07-29T00:00:00.000Z",
          finishedAt: "2026-07-29T00:01:00.000Z",
        },
        completedRuns: [],
        complete: true,
        hashEvidence: async () => ({}),
        invalidRoot,
        sessionId: "session-1",
        writeEvidence: async (target, value) => {
          if (path.basename(target).includes("report-draft")) throw reportError;
          await writeFile(target, `${JSON.stringify(value)}\n`, { flag: "wx" });
        },
        quarantineImpl: (options) => quarantineIncompleteSession({
          ...options,
          randomId: () => "fixed-id",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        }),
      });
      assert.equal(result.status, "INCOMPLETE");
      assert.match(
        result.diagnostics.terminalErrors.join("|"),
        /report-candidate-write-failed/u,
      );
      const durable = JSON.parse(
        await readFile(
          path.join(result.invalidOutput, "session-evidence.json"),
          "utf8",
        ),
      );
      assert.equal(durable.status, "INCOMPLETE");
      await assert.rejects(
        readFile(path.join(result.invalidOutput, "report-draft.json")),
        { code: "ENOENT" },
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("quarantines partial output and aggregates an INCOMPLETE write failure", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-write-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const originalError = new Error("original-session-failure");
    const writeError = new Error("incomplete-evidence-write-failed");
    let caught;
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        finalizeSessionEvidence({
          output,
          completedRuns: [],
          terminalErrors: [originalError],
          invalidRoot,
          sessionId: "session-1",
          writeEvidence: async () => {
            throw writeError;
          },
          quarantineImpl: (options) => quarantineIncompleteSession({
            ...options,
            randomId: () => "fixed-id",
            now: () => Date.parse("2026-07-29T01:02:03.456Z"),
          }),
        }),
        (error) => {
          caught = error;
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(originalError), true);
          assert.equal(error.errors.includes(writeError), true);
          assert.match(error.invalidOutput, /session-1-fixed-id/u);
          return true;
        },
      );
      assert.equal(caught.output, output);
      assert.equal(
        caught.evidencePath,
        path.join(output, "session-evidence.json"),
      );
      await assert.rejects(readdir(output), { code: "ENOENT" });
      assert.deepEqual(await readdir(caught.invalidOutput), []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("aggregates recorded errors when quarantine itself fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-quarantine-failure-"));
    const output = path.join(root, "active");
    const invalidRoot = path.join(root, "invalid");
    const originalError = new Error("original-session-failure");
    const quarantineError = new Error("quarantine-failed");
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        finalizeSessionEvidence({
          output,
          completedRuns: [],
          terminalErrors: [originalError],
          invalidRoot,
          sessionId: "session-1",
          quarantineImpl: async () => {
            throw quarantineError;
          },
        }),
        (error) => {
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(originalError), true);
          assert.equal(error.errors.includes(quarantineError), true);
          assert.equal(error.output, output);
          assert.equal(
            error.evidencePath,
            path.join(output, "session-evidence.json"),
          );
          assert.match(error.message, /AI_PLAYTEST_QUARANTINE_FAILED/u);
          return true;
        },
      );
      assert.equal(
        JSON.parse(
          await readFile(path.join(output, "session-evidence.json"), "utf8"),
        ).status,
        "INCOMPLETE",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("formal AI playtest source gate", () => {
  it("uses the single 4173 dist server and game path by default", () => {
    const options = validOptions({ entryUrl: undefined });
    assert.equal(
      validateSessionOptions(options).entryUrl,
      "http://127.0.0.1:4173/ricochet-crew/",
    );
  });

  it("rejects an invalid or mismatched expected commit before capture", () => {
    assert.throws(
      () => validateSessionOptions(validOptions({ expectedCommit: "HEAD" })),
      /expectedCommit/i,
    );
    assert.throws(() => assertSourceState({
      expectedCommit: COMMIT,
      headCommit: "b".repeat(40),
      clean: true,
      statusEntries: [],
    }), /COMMIT_MISMATCH/);
  });

  it("rejects a dirty game source tree", () => {
    assert.throws(() => assertSourceState({
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: false,
      statusEntries: [" M apps/example.ts"],
    }), /SOURCE_DIRTY/);
  });

  it("rejects a source tree that becomes dirty after capture", () => {
    const start = {
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: true,
      statusEntries: [],
    };
    assert.throws(() => assertStableSourceState(start, {
      expectedCommit: COMMIT,
      headCommit: COMMIT,
      clean: false,
      statusEntries: [" M apps/example.ts"],
    }), /SOURCE_DIRTY/);
  });
});

describe("formal AI playtest page safety", () => {
  it("requires the exact game URL at startup and during every poll", () => {
    assert.equal(
      assertExpectedEntryUrl(
        "http://127.0.0.1:4173/ricochet-crew/",
        "ricochet-crew",
      ),
      "http://127.0.0.1:4173/ricochet-crew/",
    );
    for (const invalid of [
      "http://localhost:4173/ricochet-crew/",
      "http://127.0.0.1:4174/ricochet-crew/",
      "http://127.0.0.1:4173/monster-night-market/",
      "http://127.0.0.1:4173/ricochet-crew/?test=0",
      "http://127.0.0.1:4173/ricochet-crew/#play",
      "https://127.0.0.1:4173/ricochet-crew/",
    ]) {
      assert.throws(
        () => assertExpectedEntryUrl(invalid, "ricochet-crew"),
        /ENTRY_URL_MISMATCH/,
      );
    }
  });

  it("rejects exposed debug globals or test telemetry", () => {
    assert.throws(() => assertNormalRuntimeSnapshot({
      debugGlobals: ["__GAME_TEST__"],
      telemetryTestModes: [false],
      publicState: { testMode: "unavailable", timeScale: "unavailable" },
    }), /DEBUG_GLOBAL_EXPOSED/);
    assert.throws(() => assertNormalRuntimeSnapshot({
      debugGlobals: [],
      telemetryTestModes: [false, true],
      publicState: { testMode: "unavailable", timeScale: "unavailable" },
    }), /testMode/i);
  });

  it("accepts unavailable public state without injecting a probe", () => {
    assert.deepEqual(assertNormalRuntimeSnapshot({
      debugGlobals: [],
      telemetryTestModes: [false],
      publicState: { testMode: "unavailable", timeScale: "unavailable" },
    }).normalEntry, true);
  });

  it("rejects served dist bytes that differ from the expected commit", async () => {
    const files = [{
      path: "dist/ricochet-crew/index.html",
      bytes: Buffer.from("expected"),
    }];
    await assert.rejects(
      verifyServedDistFiles({
        expectedCommit: COMMIT,
        gameId: "ricochet-crew",
        files,
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => Uint8Array.from(Buffer.from("tampered")).buffer,
        }),
      }),
      /SERVED_DIST_HASH_MISMATCH/,
    );

    const attestation = await verifyServedDistFiles({
      expectedCommit: COMMIT,
      gameId: "ricochet-crew",
      files,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => Uint8Array.from(Buffer.from("expected")).buffer,
      }),
    });
    assert.equal(attestation.fileCount, 1);
    assert.equal(attestation.expectedCommit, COMMIT);
    assert.match(attestation.aggregateSha256, /^[a-f0-9]{64}$/);
    assert.equal(Object.isFrozen(attestation), true);
    assert.equal(Object.isFrozen(attestation.files), true);
  });
});

describe("formal AI playtest machine facts", () => {
  for (const [input, expected] of [
    ["won", "win"],
    ["win", "win"],
    ["lost", "loss"],
    ["loss", "loss"],
    ["unknown", "unknown"],
    [undefined, "unknown"],
  ]) {
    it(`normalizes outcome ${String(input)} to ${expected}`, () => {
      assert.equal(normalizeOutcome(input), expected);
    });
  }

  it("records a missing payoff as null with an explicit non-inference note", () => {
    const facts = buildRunMachineFacts({
      index: 1,
      runId: "run-1",
      startedEvent: {
        event: "run_start",
        runId: "run-1",
        clientAt: 1_000,
        testMode: false,
        payload: {},
      },
      endedEvent: {
        event: "run_end",
        runId: "run-1",
        clientAt: 5_000,
        testMode: false,
        payload: { result: "lost" },
      },
      events: [{
        event: "first_input",
        runId: "run-1",
        clientAt: 1_450,
        testMode: false,
        payload: {},
      }],
    });
    assert.equal(facts.outcome, "loss");
    assert.equal(facts.firstInputMs, 450);
    assert.equal(facts.firstPayoffMs, null);
    assert.match(facts.firstPayoffNote, /未记录 first_payoff/);
    assert.match(facts.firstPayoffNote, /不推断|未推断/);
  });

  it("marks the cell incomplete when first_input is missing but permits missing payoff", () => {
    const runs = Array.from({ length: 3 }, (_, index) => buildRunMachineFacts({
      index: index + 1,
      runId: `run-${index + 1}`,
      startedEvent: lifecycleEvent("run_start", `run-${index + 1}`, index * 3 + 1),
      endedEvent: lifecycleEvent("run_end", `run-${index + 1}`, index * 3 + 3),
      events: index === 0 ? [] : [{
        ...lifecycleEvent("first_input", `run-${index + 1}`, index * 3 + 2),
        event: "first_input",
      }],
    }));
    assert.equal(runs[0].firstInputMs, null);
    assert.equal(runs[0].firstPayoffMs, null);
    assert.deepEqual(
      collectRunCompletionIssues(runs),
      ["run run-1 is missing first_input"],
    );
  });

  it("wraps the event log with the normalized run outcome", () => {
    const events = [{ event: "run_end", runId: "run-1" }];
    assert.deepEqual(buildRunEventLog("run-1", "won", events), {
      runId: "run-1",
      outcome: "win",
      events,
    });
  });
});

describe("formal AI playtest exact three-run state machine", () => {
  it("invalidates a run whose start and end are first observed in one poll", () => {
    const state = createRunObservationState();
    assert.throws(() => observeRunPoll(state, [
      lifecycleEvent("run_start", "run-1", 1),
      lifecycleEvent("run_end", "run-1", 2),
    ]), /FAST_RUN/);
  });

  it("rejects a fourth run, duplicates and out-of-order lifecycle events", () => {
    const state = createRunObservationState();
    const events = [];
    for (let index = 1; index <= 3; index += 1) {
      events.push(lifecycleEvent("run_start", `run-${index}`, index * 2 - 1));
      observeRunPoll(state, events);
      events.push(lifecycleEvent("run_end", `run-${index}`, index * 2));
      observeRunPoll(state, events);
    }
    assert.equal(assertCompleteRunObservation(state).length, 3);
    events.push(lifecycleEvent("run_start", "run-4", 7));
    assert.throws(() => observeRunPoll(state, events), /FOURTH_RUN/);
    events.push(lifecycleEvent("run_end", "run-4", 8));
    assert.throws(() => observeRunPoll(state, events), /FOURTH_RUN_END/);

    const duplicate = createRunObservationState();
    observeRunPoll(duplicate, [lifecycleEvent("run_start", "run-1", 1)]);
    assert.throws(() => observeRunPoll(duplicate, [
      lifecycleEvent("run_start", "run-1", 1),
      lifecycleEvent("run_start", "run-1", 2, "duplicate-start"),
    ]), /DUPLICATE_START/);

    assert.throws(() => observeRunPoll(
      createRunObservationState(),
      [lifecycleEvent("run_end", "run-1", 1)],
    ), /OUT_OF_ORDER/);
  });

  it("requires exactly three ordered starts and ends at finalization", () => {
    const state = createRunObservationState();
    observeRunPoll(state, [lifecycleEvent("run_start", "run-1", 1)]);
    assert.throws(() => assertCompleteRunObservation(state), /RUN_COUNT/);
  });
});

describe("formal AI playtest exclusive outputs", () => {
  it("atomically allows only one runner to claim a matrix cell", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cell-"));
    const cell = path.join(root, "casual-ricochet-crew");
    try {
      const results = await Promise.allSettled([
        claimOutputDirectory(cell),
        claimOutputDirectory(cell),
      ]);
      assert.equal(
        results.filter(({ status }) => status === "fulfilled").length,
        1,
      );
      assert.match(
        String(results.find(({ status }) => status === "rejected")?.reason),
        /AI_PLAYTEST_OUTPUT_EXISTS/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires the output parent directory to already exist", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cell-parent-"));
    const output = path.join(root, "missing", "casual-ricochet-crew");
    try {
      await assert.rejects(
        claimOutputDirectory(output),
        /AI_PLAYTEST_OUTPUT_PARENT_MISSING/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never replaces a fixed screenshot or trace", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-artifact-"));
    const target = path.join(root, "entry.png");
    try {
      await publishBufferExclusive(target, Buffer.from("first"));
      await assert.rejects(
        publishBufferExclusive(target, Buffer.from("second")),
        /AI_PLAYTEST_ARTIFACT_EXISTS/u,
      );
      assert.equal(await readFile(target, "utf8"), "first");

      const temporary = path.join(root, ".trace-one.tmp");
      await writeFile(temporary, "trace-one", { flag: "wx" });
      await assert.rejects(
        publishTemporaryFileExclusive(temporary, target),
        /AI_PLAYTEST_ARTIFACT_EXISTS/u,
      );
      await assert.rejects(readFile(temporary), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("atomically publishes exactly one of two concurrent screenshot buffers", async () => {
    await assertExclusiveBufferRace([
      Buffer.from("first-screenshot"),
      Buffer.from("second-screenshot"),
    ]);
  });

  it("never tears either large payload during a concurrent buffer race", async () => {
    await assertExclusiveBufferRace([
      Buffer.alloc(256 * 1024, 0x41),
      Buffer.alloc(256 * 1024, 0x42),
    ]);
  });

  it("reports cleanup failure after the target was published", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cleanup-published-"));
    const temporary = path.join(root, ".trace.tmp");
    const target = path.join(root, "session-trace.zip");
    let unlinkAttempts = 0;
    try {
      await writeFile(temporary, "trace", { flag: "wx" });
      await assert.rejects(
        publishTemporaryFileExclusive(temporary, target, {
          unlinkImpl: async () => {
            unlinkAttempts += 1;
            throw Object.assign(new Error("temporary file is busy"), {
              code: "EBUSY",
            });
          },
          cleanupRetryDelaysMs: [0, 0, 0],
          wait: async () => {},
        }),
        (error) => {
          assert.match(
            error.message,
            /AI_PLAYTEST_TEMP_CLEANUP_FAILED:PUBLISHED/u,
          );
          assert.equal(error.targetPublished, true);
          return true;
        },
      );
      assert.equal(unlinkAttempts, 3);
      assert.equal(await readFile(target, "utf8"), "trace");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves the original write error when temporary cleanup also fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-cleanup-write-"));
    const target = path.join(root, "entry.png");
    const writeError = Object.assign(new Error("simulated write failure"), {
      code: "EIO",
    });
    let unlinkAttempts = 0;
    try {
      await assert.rejects(
        publishBufferExclusive(target, Buffer.from("payload"), {
          randomId: () => "fixed",
          openImpl: async () => ({
            writeFile: async () => {
              throw writeError;
            },
            sync: async () => {},
            close: async () => {},
          }),
          unlinkImpl: async () => {
            unlinkAttempts += 1;
            throw Object.assign(new Error("simulated cleanup failure"), {
              code: "EBUSY",
            });
          },
          cleanupRetryDelaysMs: [0, 0],
          wait: async () => {},
        }),
        (error) => {
          assert.match(
            error.message,
            /AI_PLAYTEST_TEMP_CLEANUP_FAILED:NOT_PUBLISHED/u,
          );
          assert.equal(error.targetPublished, false);
          assert.equal(error instanceof AggregateError, true);
          assert.equal(error.errors.includes(writeError), true);
          return true;
        },
      );
      assert.equal(unlinkAttempts, 2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("isolates an incomplete session under a unique invalid path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-"));
    const output = path.join(root, "active-session");
    const invalidRoot = path.join(root, "invalid");
    try {
      await claimOutputDirectory(output);
      await writeFile(path.join(output, "entry.png"), "partial", { flag: "wx" });
      const isolated = await quarantineIncompleteSession({
        output,
        invalidRoot,
        sessionId: "session-1",
        now: () => Date.parse("2026-07-29T01:02:03.456Z"),
        randomId: () => "fixed-id",
      });
      assert.equal(
        isolated,
        path.join(
          invalidRoot,
          "2026-07-29T01-02-03-456Z-session-1-fixed-id",
          "active-session",
        ),
      );
      assert.equal(await readFile(path.join(isolated, "entry.png"), "utf8"), "partial");
      await assert.rejects(readFile(path.join(output, "entry.png")), { code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("never replaces an existing quarantine reservation", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-collision-"));
    const output = path.join(root, "active-session");
    const invalidRoot = path.join(root, "invalid");
    const reservation = path.join(
      invalidRoot,
      "2026-07-29T01-02-03-456Z-session-1-fixed-id",
    );
    try {
      await claimOutputDirectory(output);
      await writeFile(path.join(output, "entry.png"), "partial", { flag: "wx" });
      await mkdir(reservation, { recursive: true });
      await writeFile(path.join(reservation, "existing.txt"), "keep", {
        flag: "wx",
      });
      await assert.rejects(
        quarantineIncompleteSession({
          output,
          invalidRoot,
          sessionId: "session-1",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
          randomId: () => "fixed-id",
        }),
        /AI_PLAYTEST_QUARANTINE_EXISTS/u,
      );
      assert.equal(await readFile(path.join(output, "entry.png"), "utf8"), "partial");
      assert.equal(
        await readFile(path.join(reservation, "existing.txt"), "utf8"),
        "keep",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("maps a cross-volume quarantine move to a stable error", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ai-incomplete-exdev-"));
    const output = path.join(root, "active-session");
    const invalidRoot = path.join(root, "invalid");
    try {
      await claimOutputDirectory(output);
      await assert.rejects(
        quarantineIncompleteSession({
          output,
          invalidRoot,
          sessionId: "session-1",
          now: () => Date.parse("2026-07-29T01:02:03.456Z"),
          randomId: () => "fixed-id",
          renameImpl: async () => {
            throw Object.assign(new Error("cross-device link not permitted"), {
              code: "EXDEV",
            });
          },
        }),
        /AI_PLAYTEST_QUARANTINE_CROSS_DEVICE/u,
      );
      assert.deepEqual(await readdir(invalidRoot), []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("copies machine-generated evidence hashes into the report draft", () => {
    const evidenceSha256 = { "session-trace.zip": "a".repeat(64) };
    const draft = buildReportDraft({
      roundId: "baseline",
      matrixCellId: "baseline:action:ricochet-crew",
      reviewerRole: "action",
      gameId: "ricochet-crew",
      buildCommit: COMMIT,
      entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
      startedAt: "2026-07-29T00:00:00.000Z",
      finishedAt: "2026-07-29T00:01:00.000Z",
      source: { clean: true },
      runs: [],
      evidenceSha256,
    });
    assert.equal(draft.evidenceSha256, evidenceSha256);
    assert.equal(draft.claimsActualPlay, null);
  });

  it("hashes each referenced evidence file exactly once", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-playtest-hash-"));
    try {
      await Promise.all([
        writeFile(path.join(directory, "run-1-start.png"), "start"),
        writeFile(path.join(directory, "run-1-result.png"), "result"),
        writeFile(path.join(directory, "run-1-events.json"), "{}"),
        writeFile(path.join(directory, "session-trace.zip"), "trace"),
      ]);
      const hashes = await hashRunEvidence(directory, [{
        screenshotPaths: ["run-1-start.png", "run-1-result.png"],
        tracePath: "session-trace.zip",
        eventLogPath: "run-1-events.json",
      }, {
        screenshotPaths: ["run-1-start.png"],
        tracePath: "session-trace.zip",
        eventLogPath: "run-1-events.json",
      }]);
      assert.deepEqual(Object.keys(hashes).sort(), [
        "run-1-events.json",
        "run-1-result.png",
        "run-1-start.png",
        "session-trace.zip",
      ]);
      assert.match(hashes["session-trace.zip"], /^[a-f0-9]{64}$/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("never overwrites report-draft.json", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "ai-playtest-session-"));
    const target = path.join(directory, "report-draft.json");
    try {
      await writeJsonExclusive(target, { draftOnly: true });
      await assert.rejects(
        writeJsonExclusive(target, { draftOnly: false }),
        /AI_PLAYTEST_ARTIFACT_EXISTS/u,
      );
      assert.deepEqual(
        JSON.parse(await readFile(target, "utf8")),
        { draftOnly: true },
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
