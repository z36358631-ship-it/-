import assert from "node:assert/strict";
import { createServer } from "node:http";
import { before, describe, it } from "node:test";

import {
  validatePlaywrightTrace,
} from "../../tools/ai-playtest/playwright-trace-evidence.mjs";
import {
  validateCapturedSessionEvidence,
} from "../../tools/ai-playtest/session-evidence-validator.mjs";
import {
  readBoundedZip,
} from "../../tools/ai-playtest/zip-evidence.mjs";
import {
  buildReportDraft,
} from "../../tools/run-ai-playtest-session.mjs";
import {
  createAiPlaytestEvidenceFixture,
} from "../helpers/ai-playtest-evidence-fixture.mjs";

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

function storedZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const [entryName, value] of entries) {
    const name = Buffer.from(entryName);
    const bytes = Buffer.from(value);
    const checksum = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, bytes);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(bytes.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + bytes.length;
  }
  const centralBytes = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.size, 8);
  end.writeUInt16LE(entries.size, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralBytes, end]);
}

function cloneFixture(source) {
  const session = structuredClone(source.session);
  const report = structuredClone(source.report);
  const evidenceByPath = new Map(
    [...source.evidenceByPath].map(([name, bytes]) => [
      name,
      Buffer.from(bytes),
    ]),
  );
  return { session, report, evidenceByPath };
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Buffer.from(digest).toString("hex");
}

async function replaceEvidence(fixture, relativePath, bytes) {
  const value = Buffer.from(bytes);
  fixture.evidenceByPath.set(relativePath, value);
  const digest = await sha256(value);
  fixture.session.evidenceSha256[relativePath] = digest;
  fixture.report.evidenceSha256[relativePath] = digest;
}

async function mutateEventLog(fixture, runIndex, mutate) {
  const relativePath = fixture.session.runs[runIndex].eventLogPath;
  const value = JSON.parse(
    fixture.evidenceByPath.get(relativePath).toString("utf8"),
  );
  mutate(value);
  await replaceEvidence(
    fixture,
    relativePath,
    Buffer.from(`${JSON.stringify(value)}\n`),
  );
}

async function mutateActions(fixture, mutate) {
  const relativePath = fixture.session.actionLogPath;
  const actions = fixture.evidenceByPath.get(relativePath)
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map(JSON.parse);
  mutate(actions);
  await replaceEvidence(
    fixture,
    relativePath,
    Buffer.from(`${actions.map((action) => JSON.stringify(action)).join("\n")}\n`),
  );
}

async function mutateTrace(fixture, mutate) {
  const relativePath = fixture.session.tracePath;
  const entries = readBoundedZip(fixture.evidenceByPath.get(relativePath));
  mutate(entries);
  await replaceEvidence(fixture, relativePath, storedZip(entries));
}

async function mutateTraceJson(fixture, entryName, mutate) {
  await mutateTrace(fixture, (entries) => {
    const records = entries.get(entryName).toString("utf8")
      .trimEnd().split("\n").map(JSON.parse);
    mutate(records, entries);
    entries.set(
      entryName,
      Buffer.from(`${records.map((record) => JSON.stringify(record)).join("\n")}\n`),
    );
  });
}

function traceOptions(fixture) {
  return {
    entryUrl: fixture.session.entryUrl,
    startedAt: fixture.session.startedAt,
    finishedAt: fixture.session.finishedAt,
  };
}

let realFixture;

before(async () => {
  realFixture = await createAiPlaytestEvidenceFixture();
});

describe("AI session evidence cross-binding", () => {
  it("exports the exact Task 7 public contracts", () => {
    assert.equal(typeof validatePlaywrightTrace, "function");
    assert.equal(typeof validateCapturedSessionEvidence, "function");
    assert.equal(typeof createAiPlaytestEvidenceFixture, "function");
  });

  it("uses one real Chromium 4173 touch/tracing fixture as the positive source", async () => {
    assert.deepEqual(realFixture.capture, {
      browserName: "chromium",
      entryUrl: "http://127.0.0.1:4173/ricochet-crew/",
      port: 4173,
      tapCount: 3,
      interaction: "tap",
    });
    assert.equal(realFixture.actualBrowserCapture, true);
    assert.equal(realFixture.evidenceByPath.size, 12);
    const pendingTrace = validatePlaywrightTrace(
      realFixture.evidenceByPath.get(realFixture.session.tracePath),
      traceOptions(realFixture),
    );
    assert.equal(pendingTrace instanceof Promise, true);
    const trace = await pendingTrace;
    assert.deepEqual(Object.keys(trace), [
      "entryNames",
      "recordCount",
      "networkRecordCount",
      "resourceCount",
    ]);
    assert.equal(trace.entryNames.includes("trace.trace"), true);
    assert.equal(trace.recordCount > trace.networkRecordCount, true);
    assert.equal(trace.networkRecordCount >= 1, true);
    assert.equal(trace.resourceCount >= 1, true);
    const result = await validateCapturedSessionEvidence(realFixture);
    assert.deepEqual(Object.keys(result), [
      "sessionId",
      "runIds",
      "derivedRuns",
      "evidencePaths",
    ]);
    assert.equal(result.sessionId, "session-task7-real");
    assert.deepEqual(result.runIds, ["run-1", "run-2", "run-3"]);
    assert.deepEqual(
      result.derivedRuns.map(({ outcome }) => outcome),
      ["win", "loss", "win"],
    );
    assert.deepEqual(
      result.evidencePaths,
      [
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
      ],
    );
  });

  it("validates the formal buildReportDraft producer output", async () => {
    const report = buildReportDraft(realFixture.session);
    assert.equal(report.sessionId, realFixture.session.driver.sessionId);
    const result = await validateCapturedSessionEvidence({
      session: realFixture.session,
      report,
      evidenceByPath: realFixture.evidenceByPath,
    });
    assert.equal(result.sessionId, realFixture.session.driver.sessionId);
  });

  it("selects the first successful allowed action after an audited failure", async () => {
    const fixture = cloneFixture(realFixture);
    const firstLog = JSON.parse(
      fixture.evidenceByPath.get(fixture.session.runs[0].eventLogPath),
    );
    await mutateActions(fixture, (actions) => {
      const successful = actions[0];
      const start = firstLog.events[0].clientAt;
      const failed = {
        ...structuredClone(successful),
        actionId: "failed-before-success",
        requestSeq: 1,
        requestedAt: start + 1,
        executedAt: start + 2,
        completedAt: start + 3,
        result: "failure",
        errorCode: "AI_DRIVER_TOUCH_FAILED",
      };
      for (const action of actions) action.requestSeq += 1;
      actions.unshift(failed);
    });
    const result = await validateCapturedSessionEvidence(fixture);
    assert.deepEqual(result.runIds, ["run-1", "run-2", "run-3"]);
  });

  it("binds every successful tap and rejects either unmatched direction", async () => {
    const extraAction = cloneFixture(realFixture);
    const run3Log = JSON.parse(
      extraAction.evidenceByPath.get(
        extraAction.session.runs[2].eventLogPath,
      ),
    );
    await mutateActions(extraAction, (actions) => {
      const last = actions.at(-1);
      actions.push({
        ...structuredClone(last),
        actionId: "extra-success-tap",
        requestSeq: last.requestSeq + 1,
        requestedAt: last.completedAt + 1,
        executedAt: last.completedAt + 2,
        completedAt: Math.min(
          last.completedAt + 3,
          run3Log.events.at(-1).clientAt,
        ),
      });
    });
    await assert.rejects(
      validateCapturedSessionEvidence(extraAction),
      /TRACE_ACTION_COUNT/u,
    );

    const extraTrace = await createAiPlaytestEvidenceFixture({
      extraTraceTap: true,
    });
    await assert.rejects(
      validateCapturedSessionEvidence(extraTrace),
      /TRACE_ACTION_COUNT/u,
    );
  });

  it("accepts real CDP begin/move/end gestures without inventing trace records", async () => {
    const gesture = await createAiPlaytestEvidenceFixture({
      interaction: "gesture",
    });
    const entries = readBoundedZip(
      gesture.evidenceByPath.get(gesture.session.tracePath),
    );
    const traceRecords = entries.get("trace.trace").toString("utf8")
      .trimEnd().split("\n").map(JSON.parse);
    assert.equal(
      traceRecords.some(({ method }) => method === "touchscreenTap"),
      false,
    );
    assert.equal(
      traceRecords.some(({ class: owner, method }) => (
        owner === "CDPSession" || method === "send"
      )),
      false,
    );
    const actions = gesture.evidenceByPath.get(gesture.session.actionLogPath)
      .toString("utf8").trimEnd().split("\n").map(JSON.parse);
    assert.deepEqual(
      actions.map(({ type }) => type),
      [
        "touchBegin", "touchMove", "touchEnd",
        "touchBegin", "touchMove", "touchEnd",
        "touchBegin", "touchMove", "touchEnd",
      ],
    );
    const result = await validateCapturedSessionEvidence(gesture);
    assert.deepEqual(result.runIds, ["run-1", "run-2", "run-3"]);

    const cancelled = cloneFixture(gesture);
    await mutateActions(cancelled, (records) => {
      for (const action of records) {
        if (action.type === "touchEnd") action.type = "touchCancel";
      }
    });
    await validateCapturedSessionEvidence(cancelled);
  });

  it("cross-binds commit, served dist, URL, session, game, and run IDs", async () => {
    const mutations = [
      (fixture) => { fixture.session.buildCommit = "c".repeat(40); },
      (fixture) => {
        fixture.session.servedDist.finish.aggregateSha256 = "c".repeat(64);
      },
      (fixture) => {
        fixture.session.entryUrl =
          "http://localhost:4173/ricochet-crew/";
        fixture.report.entryUrl = fixture.session.entryUrl;
      },
      (fixture) => { fixture.session.driver.sessionId = "other-session"; },
      (fixture) => { fixture.session.gameId = "other-game"; },
      (fixture) => {
        fixture.session.runs[0].runId = "other-run";
        fixture.report.runs[0].runId = "other-run";
      },
    ];
    for (const mutate of mutations) {
      const fixture = cloneFixture(realFixture);
      mutate(fixture);
      await assert.rejects(
        validateCapturedSessionEvidence(fixture),
        /AI_PLAYTEST_SESSION_EVIDENCE_/u,
      );
    }
  });

  it("rejects missing production event fields and recomputed fact drift", async () => {
    const missing = cloneFixture(realFixture);
    await mutateEventLog(missing, 0, (log) => {
      delete log.events[1].sessionId;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(missing),
      /EVENT_CONTRACT/u,
    );

    const drift = cloneFixture(realFixture);
    drift.session.runs[0].firstInputMs += 1;
    drift.report.runs[0].firstInputMs += 1;
    await assert.rejects(
      validateCapturedSessionEvidence(drift),
      /EVENT_DERIVATION/u,
    );
  });

  it("rejects duplicate actions, descending frames, and unclosed gestures", async () => {
    const duplicate = cloneFixture(realFixture);
    await mutateActions(duplicate, (actions) => {
      actions.splice(1, 0, structuredClone(actions[0]));
    });
    await assert.rejects(
      validateCapturedSessionEvidence(duplicate),
      /ACTION_CONTRACT/u,
    );

    const descending = cloneFixture(realFixture);
    await mutateActions(descending, (actions) => {
      actions[0].frameSeq = 2;
      actions[1].frameSeq = 1;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(descending),
      /ACTION_CONTRACT/u,
    );

    const gesture = cloneFixture(realFixture);
    await mutateActions(gesture, (actions) => {
      actions[2].type = "touchBegin";
      actions[2].gestureId = "gesture-open";
    });
    await assert.rejects(
      validateCapturedSessionEvidence(gesture),
      /ACTION_GESTURE_UNCLOSED/u,
    );
  });

  it("rejects actions after the third run and input/action latency outside 2s", async () => {
    const after = cloneFixture(realFixture);
    const lastEventPath = after.session.runs[2].eventLogPath;
    const lastLog = JSON.parse(
      after.evidenceByPath.get(lastEventPath).toString("utf8"),
    );
    const thirdEnd = lastLog.events.at(-1).clientAt;
    await mutateActions(after, (actions) => {
      actions[2].requestedAt = thirdEnd + 1;
      actions[2].executedAt = thirdEnd + 1;
      actions[2].completedAt = thirdEnd + 1;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(after),
      /ACTION_RUN_WINDOW|ACTIONS_AFTER_THREE_RUNS/u,
    );

    const latency = cloneFixture(realFixture);
    await mutateEventLog(latency, 0, (log) => {
      log.events[0].clientAt -= 3_000;
      latency.session.startedAt = new Date(
        log.events[0].clientAt - 1,
      ).toISOString();
      latency.report.startedAt = latency.session.startedAt;
      latency.session.runs[0].firstInputMs += 3_000;
      latency.report.runs[0].firstInputMs += 3_000;
      latency.session.runs[0].firstPayoffMs += 3_000;
      latency.report.runs[0].firstPayoffMs += 3_000;
    });
    const firstLog = JSON.parse(
      latency.evidenceByPath
        .get(latency.session.runs[0].eventLogPath)
        .toString("utf8"),
    );
    await mutateActions(latency, (actions) => {
      actions[0].requestedAt = firstLog.events[0].clientAt + 1;
      actions[0].executedAt = firstLog.events[0].clientAt + 2;
      actions[0].completedAt = firstLog.events[0].clientAt + 3;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(latency),
      /ACTION_FIRST_INPUT/u,
    );
  });

  it("requires CAPTURED status, all 12 files, and exact hashes", async () => {
    const incomplete = cloneFixture(realFixture);
    incomplete.session.status = "INCOMPLETE";
    await assert.rejects(
      validateCapturedSessionEvidence(incomplete),
      /SESSION_CONTRACT/u,
    );

    const missingHash = cloneFixture(realFixture);
    const path = missingHash.session.runs[0].screenshotPaths[0];
    delete missingHash.session.evidenceSha256[path];
    delete missingHash.report.evidenceSha256[path];
    await assert.rejects(
      validateCapturedSessionEvidence(missingHash),
      /HASH_SET/u,
    );

    const extra = cloneFixture(realFixture);
    extra.evidenceByPath.set("extra.txt", Buffer.from("extra"));
    await assert.rejects(
      validateCapturedSessionEvidence(extra),
      /FILE_SET/u,
    );
  });

  it("rejects deleted contexts, changed origins, and truncated traces", async () => {
    const deletedContext = cloneFixture(realFixture);
    await mutateTrace(deletedContext, (entries) => {
      const lines = entries.get("trace.trace").toString("utf8")
        .trimEnd().split("\n").map(JSON.parse)
        .filter(({ type }) => type !== "context-options");
      entries.set(
        "trace.trace",
        Buffer.from(`${lines.map((line) => JSON.stringify(line)).join("\n")}\n`),
      );
    });
    await assert.rejects(
      validateCapturedSessionEvidence(deletedContext),
      /TRACE_CONTEXT_COUNT/u,
    );

    const changedOrigin = cloneFixture(realFixture);
    await mutateTrace(changedOrigin, (entries) => {
      const lines = entries.get("trace.network").toString("utf8")
        .trimEnd().split("\n").map(JSON.parse);
      lines[0].snapshot.request.url = "http://localhost:4173/escape";
      entries.set(
        "trace.network",
        Buffer.from(`${lines.map((line) => JSON.stringify(line)).join("\n")}\n`),
      );
    });
    await assert.rejects(
      validateCapturedSessionEvidence(changedOrigin),
      /TRACE_NETWORK_BINDING/u,
    );

    const truncated = cloneFixture(realFixture);
    const tracePath = truncated.session.tracePath;
    const trace = truncated.evidenceByPath.get(tracePath);
    await replaceEvidence(truncated, tracePath, trace.subarray(0, trace.length - 1));
    await assert.rejects(
      validateCapturedSessionEvidence(truncated),
      /AI_PLAYTEST_ZIP_/u,
    );
  });

  it("requires a unique before/input/after/input-snapshot tap closure", async () => {
    const mutations = [
      (records) => {
        const tap = records.find(({ method }) => method === "touchscreenTap");
        records.splice(
          records.findIndex(({ type, callId }) => (
            type === "input" && callId === tap.callId
          )),
          1,
        );
      },
      (records) => {
        const tap = records.find(({ method }) => method === "touchscreenTap");
        records.find(({ type, callId }) => (
          type === "input" && callId === tap.callId
        )).point.x += 1;
      },
      (records) => {
        const tap = records.find(({ method }) => method === "touchscreenTap");
        records.find(({ snapshot }) => (
          snapshot?.snapshotName === `input@${tap.callId}`
        )).snapshot.timestamp = tap.startTime - 1;
      },
    ];
    for (const mutate of mutations) {
      const fixture = cloneFixture(realFixture);
      await mutateTraceJson(fixture, "trace.trace", mutate);
      await assert.rejects(
        validateCapturedSessionEvidence(fixture),
        /TRACE_TOUCH_/u,
      );
    }
  });

  it("binds every run's first action to this session's trace tap", async () => {
    const otherSession = await createAiPlaytestEvidenceFixture();
    const fixture = cloneFixture(realFixture);
    await replaceEvidence(
      fixture,
      fixture.session.tracePath,
      otherSession.evidenceByPath.get(otherSession.session.tracePath),
    );
    await assert.rejects(
      validateCapturedSessionEvidence(fixture),
      /TRACE_(?:SESSION_WINDOW|RUN_WINDOW|ACTION_BINDING)/u,
    );

    const wrongCoordinate = cloneFixture(realFixture);
    await mutateActions(wrongCoordinate, (actions) => {
      actions[0].x += 1;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(wrongCoordinate),
      /TRACE_ACTION_BINDING/u,
    );
  });

  it("requires non-empty, index-safe stacks bound to trace call IDs", async () => {
    const mutations = [
      (stacks) => { stacks.files = []; },
      (stacks) => { stacks.stacks[0][1][0][0] = 999; },
      (stacks) => { stacks.stacks[0][0] = 999; },
    ];
    for (const mutate of mutations) {
      const fixture = cloneFixture(realFixture);
      await mutateTrace(fixture, (entries) => {
        const stacks = JSON.parse(entries.get("trace.stacks").toString("utf8"));
        mutate(stacks);
        entries.set("trace.stacks", Buffer.from(JSON.stringify(stacks)));
      });
      await assert.rejects(
        validateCapturedSessionEvidence(fixture),
        /TRACE_STACKS_/u,
      );
    }
  });

  it("requires referenced non-empty resources and rejects archive orphans", async () => {
    const noReferences = cloneFixture(realFixture);
    await mutateTraceJson(noReferences, "trace.network", (records) => {
      for (const record of records) {
        delete record.snapshot.response.content._sha1;
      }
    });
    await assert.rejects(
      validateCapturedSessionEvidence(noReferences),
      /TRACE_RESOURCE_REQUIRED/u,
    );

    const empty = cloneFixture(realFixture);
    await mutateTrace(empty, (entries) => {
      const resource = [...entries.keys()]
        .find((name) => name.startsWith("resources/"));
      entries.set(resource, Buffer.alloc(0));
    });
    await assert.rejects(
      validateCapturedSessionEvidence(empty),
      /TRACE_RESOURCE_BINDING/u,
    );

    const orphan = cloneFixture(realFixture);
    await mutateTrace(orphan, (entries) => {
      entries.set(`resources/${"c".repeat(40)}.bin`, Buffer.from("orphan"));
    });
    await assert.rejects(
      validateCapturedSessionEvidence(orphan),
      /TRACE_RESOURCE_ORPHAN/u,
    );
  });

  it("binds document/main-frame network facts and the wall/mono anchor", async () => {
    const mutations = [
      (records) => {
        records.find(({ snapshot }) => (
          snapshot.request.url === realFixture.session.entryUrl
        )).snapshot.response.status = 500;
      },
      (records) => {
        delete records.find(({ snapshot }) => (
          snapshot.request.url === realFixture.session.entryUrl
        )).snapshot._resourceType;
      },
      (records) => {
        records.find(({ snapshot }) => (
          snapshot.request.url === realFixture.session.entryUrl
        )).snapshot.request.headers = {};
      },
      (records) => { records[0].snapshot._frameref = "frame@other"; },
      (records) => { records[0].snapshot._monotonicTime += 20; },
      (records) => {
        records[1].snapshot.request.url = "blob:https://evil.example/id";
      },
    ];
    for (const mutate of mutations) {
      const fixture = cloneFixture(realFixture);
      await mutateTraceJson(fixture, "trace.network", mutate);
      await assert.rejects(
        validateCapturedSessionEvidence(fixture),
        /TRACE_(?:DOCUMENT_REQUEST|NETWORK_BINDING)/u,
      );
    }
  });

  it("rejects touchMove first, late execution, and action after first_input", async () => {
    const move = cloneFixture(realFixture);
    await mutateActions(move, (actions) => {
      actions[0].type = "touchMove";
      actions[0].gestureId = "gesture-move";
    });
    await assert.rejects(
      validateCapturedSessionEvidence(move),
      /ACTION_FIRST_INPUT/u,
    );

    const late = cloneFixture(realFixture);
    await mutateEventLog(late, 0, (log) => {
      log.events[0].clientAt -= 3_000;
      late.session.startedAt = new Date(
        log.events[0].clientAt - 1,
      ).toISOString();
      late.report.startedAt = late.session.startedAt;
      late.session.runs[0].firstInputMs += 3_000;
      late.report.runs[0].firstInputMs += 3_000;
      late.session.runs[0].firstPayoffMs += 3_000;
      late.report.runs[0].firstPayoffMs += 3_000;
    });
    const lateLog = JSON.parse(
      late.evidenceByPath.get(late.session.runs[0].eventLogPath),
    );
    await mutateActions(late, (actions) => {
      actions[0].requestedAt = lateLog.events[0].clientAt + 1;
      actions[0].executedAt = lateLog.events[0].clientAt + 2;
      actions[0].completedAt = lateLog.events[0].clientAt + 3;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(late),
      /ACTION_FIRST_INPUT/u,
    );

    const afterInput = cloneFixture(realFixture);
    const eventLog = JSON.parse(
      afterInput.evidenceByPath.get(
        afterInput.session.runs[0].eventLogPath,
      ),
    );
    const firstInputAt = eventLog.events
      .find(({ event }) => event === "first_input").clientAt;
    await mutateActions(afterInput, (actions) => {
      actions[0].requestedAt = firstInputAt + 1;
      actions[0].executedAt = firstInputAt + 1;
      actions[0].completedAt = firstInputAt + 1;
    });
    await assert.rejects(
      validateCapturedSessionEvidence(afterInput),
      /ACTION_FIRST_INPUT/u,
    );
  });

  it("forbids gestures crossing runs or reusing a gestureId", async () => {
    const crossRun = cloneFixture(realFixture);
    await mutateActions(crossRun, (actions) => {
      actions[0].type = "touchBegin";
      actions[0].gestureId = "gesture-shared";
      actions[1].type = "touchEnd";
      actions[1].gestureId = "gesture-shared";
    });
    await assert.rejects(
      validateCapturedSessionEvidence(crossRun),
      /ACTION_GESTURE_CROSS_RUN/u,
    );

    const reused = cloneFixture(realFixture);
    await mutateActions(reused, (actions) => {
      const end = {
        ...structuredClone(actions[0]),
        type: "touchEnd",
        actionId: "tap-1-end",
        requestSeq: 2,
        gestureId: "gesture-reused",
      };
      actions[0].type = "touchBegin";
      actions[0].gestureId = "gesture-reused";
      actions.splice(1, 0, end);
      for (let index = 2; index < actions.length; index += 1) {
        actions[index].requestSeq = index + 1;
      }
      actions[2].type = "touchBegin";
      actions[2].gestureId = "gesture-reused";
    });
    await assert.rejects(
      validateCapturedSessionEvidence(reused),
      /ACTION_(?:CONTRACT|GESTURE)/u,
    );
  });

  it("enforces literal canonical safe paths and report sessionId", async () => {
    const pathMutations = [
      (fixture) => { fixture.session.entryScreenshotPath = "/entry.png"; },
      (fixture) => { fixture.session.actionLogPath = "..\\actions.jsonl"; },
      (fixture) => {
        fixture.session.runs[0].screenshotPaths[0] = "../run-1-start.png";
        fixture.report.runs[0].screenshotPaths[0] = "../run-1-start.png";
      },
    ];
    for (const mutate of pathMutations) {
      const fixture = cloneFixture(realFixture);
      mutate(fixture);
      await assert.rejects(
        validateCapturedSessionEvidence(fixture),
        /AI_PLAYTEST_SESSION_EVIDENCE_(?:CANONICAL_PATH|PATH_UNSAFE)/u,
      );
    }
    const sessionId = cloneFixture(realFixture);
    delete sessionId.report.sessionId;
    await assert.rejects(
      validateCapturedSessionEvidence(sessionId),
      /REPORT_BINDING/u,
    );
  });

  it("rejects a legal ZIP whose internal trace JSONL ends mid-record", async () => {
    const fixture = cloneFixture(realFixture);
    await mutateTrace(fixture, (entries) => {
      const trace = entries.get("trace.trace");
      entries.set("trace.trace", trace.subarray(0, trace.length - 5));
    });
    await assert.rejects(
      validateCapturedSessionEvidence(fixture),
      /TRACE_JSONL_TRUNCATED/u,
    );
  });

  it("maps malformed bundle shapes to stable session evidence errors", async () => {
    for (const input of [undefined, null, [], "bundle"]) {
      await assert.rejects(
        validateCapturedSessionEvidence(input),
        /AI_PLAYTEST_SESSION_EVIDENCE_BUNDLE_INVALID/u,
      );
    }
    for (const options of [null, [], "options"]) {
      await assert.rejects(
        validatePlaywrightTrace(
          realFixture.evidenceByPath.get(realFixture.session.tracePath),
          options,
        ),
        /AI_PLAYTEST_TRACE_OPTIONS/u,
      );
    }
    const mutations = [
      (fixture) => { delete fixture.report.runs; },
      (fixture) => {
        fixture.session.runs[0] = null;
        fixture.report.runs[0] = null;
      },
      (fixture) => {
        delete fixture.session.runs[0].screenshotPaths;
        delete fixture.report.runs[0].screenshotPaths;
      },
    ];
    for (const mutate of mutations) {
      const fixture = cloneFixture(realFixture);
      mutate(fixture);
      await assert.rejects(
        validateCapturedSessionEvidence(fixture),
        /AI_PLAYTEST_SESSION_EVIDENCE_/u,
      );
    }
  });

  it("rejects an old synthetic trace and trace/session time drift", async () => {
    const synthetic = cloneFixture(realFixture);
    const oldTrace = storedZip(new Map([
      ["trace.trace", Buffer.from("{\"type\":\"context-options\"}\n")],
      ["trace.network", Buffer.from("{\"type\":\"resource-snapshot\"}\n")],
      ["trace.stacks", Buffer.from("{\"files\":[],\"stacks\":[]}")],
      ["resources/source.txt", Buffer.from("synthetic")],
    ]));
    await replaceEvidence(synthetic, synthetic.session.tracePath, oldTrace);
    await assert.rejects(
      validateCapturedSessionEvidence(synthetic),
      /TRACE_CONTEXT_INVALID/u,
    );

    const oldSession = cloneFixture(realFixture);
    oldSession.session.startedAt = "2030-01-01T00:00:00.000Z";
    oldSession.session.finishedAt = "2030-01-01T00:01:00.000Z";
    oldSession.report.startedAt = oldSession.session.startedAt;
    oldSession.report.finishedAt = oldSession.session.finishedAt;
    await assert.rejects(
      validatePlaywrightTrace(
        oldSession.evidenceByPath.get(oldSession.session.tracePath),
        traceOptions(oldSession),
      ),
      /TRACE_SESSION_WINDOW/u,
    );

    const shrunk = cloneFixture(realFixture);
    const run1Log = JSON.parse(
      shrunk.evidenceByPath.get(shrunk.session.runs[0].eventLogPath),
    );
    shrunk.session.startedAt = new Date(
      run1Log.events[0].clientAt + 1,
    ).toISOString();
    shrunk.report.startedAt = shrunk.session.startedAt;
    await assert.rejects(
      validateCapturedSessionEvidence(shrunk),
      /SESSION_RUN_WINDOW/u,
    );
  });

  it("fails closed when another process owns 127.0.0.1:4173", async () => {
    const blocker = createServer((_request, response) => response.end("busy"));
    await new Promise((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(4173, "127.0.0.1", resolve);
    });
    try {
      await assert.rejects(
        createAiPlaytestEvidenceFixture(),
        (error) => error?.code === "EADDRINUSE",
      );
    } finally {
      await new Promise((resolve) => blocker.close(resolve));
    }
  });
});
