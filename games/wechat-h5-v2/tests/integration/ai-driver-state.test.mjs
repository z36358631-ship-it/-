import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRIVER_DISCONNECT_MS,
  DRIVER_HEARTBEAT_INTERVAL_MS,
  GESTURE_LEASE_MS,
  VIEWPORT,
  createDriverSessionState,
} from "../../tools/ai-playtest/driver-session-state.mjs";

const SESSION_ID = "session-1";
const TOKEN = "a".repeat(64);

function command(overrides = {}) {
  return {
    sessionId: SESSION_ID,
    token: TOKEN,
    requestSeq: 1,
    actionId: "action-1",
    frameSeq: 0,
    ...overrides,
  };
}

describe("AI driver protocol constants", () => {
  it("exports the immutable viewport and exact timing contract", () => {
    assert.deepEqual(VIEWPORT, { width: 390, height: 844 });
    assert.equal(Object.isFrozen(VIEWPORT), true);
    assert.equal(DRIVER_HEARTBEAT_INTERVAL_MS, 2_000);
    assert.equal(DRIVER_DISCONNECT_MS, 10_000);
    assert.equal(GESTURE_LEASE_MS, 2_000);
    assert.throws(() => {
      VIEWPORT.width = 1;
    }, TypeError);
  });
});

describe("AI driver authorization", () => {
  it("requires a 64-character lowercase hexadecimal constructor token", () => {
    for (const token of [
      "",
      "a".repeat(63),
      "a".repeat(65),
      "A".repeat(64),
      "g".repeat(64),
      123,
    ]) {
      assert.throws(
        () => createDriverSessionState({
          sessionId: SESSION_ID,
          token,
          now: () => 1_000,
        }),
        /AI_DRIVER_TOKEN_INVALID/u,
      );
    }
  });

  it("rejects non-object requests and unsafe sequence integers before field access", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    for (const request of [null, [], "request", 1]) {
      assert.throws(
        () => state.authorize(request),
        /AI_DRIVER_REQUEST_INVALID/u,
      );
    }
    for (const requestSeq of [
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      Number.POSITIVE_INFINITY,
    ]) {
      assert.throws(
        () => state.authorize(command({ requestSeq })),
        /AI_DRIVER_REQUEST_SEQ_INVALID/u,
      );
    }
    assert.equal(state.authorize(command()).ok, true);
  });

  it("requires the exact session and token without consuming a rejected sequence", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    assert.throws(
      () => state.authorize(command({ sessionId: "another-session" })),
      /AI_DRIVER_SESSION_MISMATCH/u,
    );
    assert.throws(
      () => state.authorize(command({ token: "b".repeat(64) })),
      /AI_DRIVER_TOKEN_MISMATCH/u,
    );
    assert.equal(state.authorize(command()).ok, true);
    assert.equal(state.snapshot().lastRequestSeq, 1);
    assert.equal("token" in state.snapshot(), false);
  });

  it("rejects request replay and duplicate action IDs without poisoning later requests", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    state.authorize(command());
    assert.throws(
      () => state.authorize(command({
        actionId: "action-2",
      })),
      /AI_DRIVER_REQUEST_REPLAY/u,
    );
    assert.throws(
      () => state.authorize(command({
        requestSeq: 2,
      })),
      /AI_DRIVER_DUPLICATE_ACTION/u,
    );
    assert.equal(state.authorize(command({
      requestSeq: 2,
      actionId: "action-2",
    })).ok, true);
  });

  it("requires the current frame without consuming rejected sequences", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    const missingFrame = command();
    delete missingFrame.frameSeq;
    assert.throws(
      () => state.authorize(missingFrame),
      /AI_DRIVER_STALE_FRAME/u,
    );
    assert.equal(state.snapshot().lastRequestSeq, 0);
    state.authorize(command());
    assert.equal(state.advanceFrame(), 1);
    assert.throws(
      () => state.authorize(command({
        requestSeq: 2,
        actionId: "action-2",
        frameSeq: 0,
      })),
      /AI_DRIVER_STALE_FRAME/u,
    );
    assert.equal(state.authorize(command({
      requestSeq: 2,
      actionId: "action-2",
      frameSeq: 1,
    })).ok, true);
  });

  it("accepts inclusive viewport edges and rejects non-finite or outside coordinates", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    assert.equal(state.authorize(command({ x: 0, y: 0 })).ok, true);
    assert.equal(state.authorize(command({
      requestSeq: 2,
      actionId: "action-2",
      x: VIEWPORT.width,
      y: VIEWPORT.height,
    })).ok, true);
    for (const [x, y] of [
      [-1, 0],
      [VIEWPORT.width + 1, 0],
      [0, -1],
      [0, VIEWPORT.height + 1],
      [Number.NaN, 0],
    ]) {
      assert.throws(
        () => state.authorize(command({
          requestSeq: 3,
          actionId: `invalid-${String(x)}-${String(y)}`,
          x,
          y,
        })),
        /AI_DRIVER_COORDINATE_OUT_OF_RANGE/u,
      );
    }
    assert.equal(state.snapshot().lastRequestSeq, 2);
  });
});

describe("AI driver heartbeat and gesture leases", () => {
  it("allows the exact disconnect boundary and permanently fails one millisecond later", () => {
    let now = 1_000;
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => now,
    });
    now += DRIVER_DISCONNECT_MS;
    assert.equal(state.assertConnected(), true);
    now += 1;
    assert.throws(
      () => state.assertConnected(),
      /AI_DRIVER_HEARTBEAT_TIMEOUT/u,
    );
    now = 1_000;
    assert.throws(
      () => state.heartbeat(),
      /AI_DRIVER_HEARTBEAT_TIMEOUT/u,
    );
    assert.equal(state.snapshot().fatalReason, "AI_DRIVER_HEARTBEAT_TIMEOUT");
  });

  it("refreshes the heartbeat deadline before timeout", () => {
    let now = 1_000;
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => now,
    });
    now += DRIVER_HEARTBEAT_INTERVAL_MS;
    assert.equal(state.heartbeat(command({
      actionId: "heartbeat-1",
      frameSeq: 0,
    })).ok, true);
    now += DRIVER_DISCONNECT_MS;
    assert.equal(state.assertConnected(), true);
  });

  it("supports one gesture at a time with injected deterministic IDs", () => {
    let now = 1_000;
    const gestureIds = ["gesture-one", "gesture-two"];
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => now,
      randomId: () => gestureIds.shift(),
    });
    const gesture = state.beginGesture({
      actionId: "begin-1",
      x: 10,
      y: 10,
    });
    assert.equal(gesture.gestureId, "gesture-one");
    assert.throws(
      () => state.beginGesture({ actionId: "begin-2", x: 20, y: 20 }),
      /AI_DRIVER_GESTURE_ACTIVE/u,
    );
    now += GESTURE_LEASE_MS;
    assert.equal(state.moveGesture({
      actionId: "move-1",
      gestureId: gesture.gestureId,
      x: VIEWPORT.width,
      y: VIEWPORT.height,
    }).x, VIEWPORT.width);
    assert.throws(
      () => state.endGesture({
        actionId: "end-wrong",
        gestureId: "wrong",
      }),
      /AI_DRIVER_GESTURE_MISMATCH/u,
    );
    assert.equal(state.endGesture({
      actionId: "end-1",
      gestureId: gesture.gestureId,
    }).gestureId, gesture.gestureId);
    assert.equal(state.snapshot().activeGesture, null);
    const second = state.beginGesture({
      actionId: "begin-3",
      x: 0,
      y: 0,
    });
    assert.equal(state.cancelGesture({
      actionId: "cancel-1",
      gestureId: second.gestureId,
    }).gestureId, second.gestureId);
  });

  it("requires non-empty gesture action IDs and gesture IDs", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
      randomId: () => "gesture-fixed",
    });
    for (const actionId of ["", "   ", null]) {
      assert.throws(
        () => state.beginGesture({ actionId, x: 1, y: 1 }),
        /AI_DRIVER_ACTION_ID_REQUIRED/u,
      );
    }
    const gesture = state.beginGesture({
      actionId: "begin-1",
      x: 1,
      y: 1,
    });
    for (const invoke of [
      () => state.moveGesture({
        actionId: "",
        gestureId: gesture.gestureId,
        x: 2,
        y: 2,
      }),
      () => state.endGesture({
        actionId: " ",
        gestureId: gesture.gestureId,
      }),
      () => state.cancelGesture({
        actionId: null,
        gestureId: gesture.gestureId,
      }),
    ]) {
      assert.throws(invoke, /AI_DRIVER_ACTION_ID_REQUIRED/u);
    }
    assert.throws(
      () => state.moveGesture({
        actionId: "move-1",
        gestureId: "",
        x: 2,
        y: 2,
      }),
      /AI_DRIVER_GESTURE_ID_REQUIRED/u,
    );
    assert.equal(state.cancelGesture({
      actionId: "cancel-1",
      gestureId: gesture.gestureId,
    }).gestureId, gesture.gestureId);
  });

  it("rejects empty or reused random gesture IDs within one session", () => {
    const invalid = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
      randomId: () => "",
    });
    assert.throws(
      () => invalid.beginGesture({ actionId: "begin-1", x: 1, y: 1 }),
      /AI_DRIVER_GESTURE_ID_INVALID/u,
    );
    assert.equal(invalid.snapshot().activeGesture, null);

    const collision = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
      randomId: () => "gesture-fixed",
    });
    const first = collision.beginGesture({
      actionId: "begin-1",
      x: 1,
      y: 1,
    });
    collision.cancelGesture({
      actionId: "cancel-1",
      gestureId: first.gestureId,
    });
    assert.throws(
      () => collision.beginGesture({ actionId: "begin-2", x: 2, y: 2 }),
      /AI_DRIVER_GESTURE_ID_COLLISION/u,
    );
    assert.equal(collision.snapshot().activeGesture, null);
  });

  it("expires one gesture after two seconds and never recovers", () => {
    let now = 1_000;
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => now,
      randomId: () => "gesture-fixed",
    });
    const gesture = state.beginGesture({
      actionId: "begin-1",
      x: 10,
      y: 10,
    });
    now += GESTURE_LEASE_MS + 1;
    assert.throws(() => state.moveGesture({
      actionId: "move-1",
      gestureId: gesture.gestureId,
      x: 20,
      y: 20,
    }), /AI_DRIVER_GESTURE_EXPIRED/u);
    now = 1_000;
    assert.throws(
      () => state.cancelGesture({
        actionId: "cancel-1",
        gestureId: gesture.gestureId,
      }),
      /AI_DRIVER_GESTURE_EXPIRED/u,
    );
    assert.equal(state.snapshot().fatalReason, "AI_DRIVER_GESTURE_EXPIRED");
  });
});

describe("AI driver run limit and snapshots", () => {
  it("closes permanently after run three", () => {
    const state = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    assert.equal(state.recordRun(1), 1);
    assert.equal(state.recordRun(2), 2);
    assert.equal(state.recordRun(3), 3);
    assert.throws(
      () => state.assertActionOpen(),
      /AI_DRIVER_RUNS_COMPLETE/u,
    );
    assert.throws(
      () => state.authorize(command()),
      /AI_DRIVER_RUNS_COMPLETE/u,
    );
    const snapshot = state.snapshot();
    assert.equal(snapshot.runCount, 3);
    assert.equal(snapshot.fatalReason, "AI_DRIVER_RUNS_COMPLETE");
    assert.equal(Object.isFrozen(snapshot), true);
  });

  it("makes a fourth run a permanent fatal fault and preserves the first reason", () => {
    const fourthRun = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    assert.throws(
      () => fourthRun.recordRun(4),
      /AI_DRIVER_FOURTH_RUN/u,
    );
    assert.throws(
      () => fourthRun.recordRun(1),
      /AI_DRIVER_FOURTH_RUN/u,
    );
    assert.equal(fourthRun.snapshot().fatalReason, "AI_DRIVER_FOURTH_RUN");

    const completed = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    completed.recordRun(1);
    completed.recordRun(2);
    completed.recordRun(3);
    assert.throws(
      () => completed.recordRun(4),
      /AI_DRIVER_RUNS_COMPLETE/u,
    );
    assert.equal(completed.snapshot().fatalReason, "AI_DRIVER_RUNS_COMPLETE");
  });

  it("validates run integers before limits and permanently faults replay or gaps", () => {
    for (const index of [
      Number.NaN,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      Number.POSITIVE_INFINITY,
    ]) {
      const state = createDriverSessionState({
        sessionId: SESSION_ID,
        token: TOKEN,
        now: () => 1_000,
      });
      assert.throws(
        () => state.recordRun(index),
        /AI_DRIVER_RUN_INDEX_INVALID/u,
      );
      assert.equal(state.snapshot().fatalReason, null);
    }

    const replay = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    replay.recordRun(1);
    assert.throws(() => replay.recordRun(1), /AI_DRIVER_RUN_REPLAY/u);
    assert.throws(() => replay.recordRun(4), /AI_DRIVER_RUN_REPLAY/u);
    assert.equal(replay.snapshot().fatalReason, "AI_DRIVER_RUN_REPLAY");

    const gap = createDriverSessionState({
      sessionId: SESSION_ID,
      token: TOKEN,
      now: () => 1_000,
    });
    assert.throws(() => gap.recordRun(2), /AI_DRIVER_RUN_ORDER/u);
    assert.throws(() => gap.recordRun(4), /AI_DRIVER_RUN_ORDER/u);
    assert.equal(gap.snapshot().fatalReason, "AI_DRIVER_RUN_ORDER");
  });
});
