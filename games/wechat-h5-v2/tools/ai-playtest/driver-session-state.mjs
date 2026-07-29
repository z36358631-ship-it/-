import { randomUUID } from "node:crypto";

export const VIEWPORT = Object.freeze({
  width: 390,
  height: 844,
});

export const DRIVER_HEARTBEAT_INTERVAL_MS = 2_000;
export const DRIVER_DISCONNECT_MS = 10_000;
export const GESTURE_LEASE_MS = 2_000;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/u;

function driverError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function assertCoordinate(x, y) {
  if (
    !Number.isFinite(x)
    || !Number.isFinite(y)
    || x < 0
    || x > VIEWPORT.width
    || y < 0
    || y > VIEWPORT.height
  ) {
    throw driverError("AI_DRIVER_COORDINATE_OUT_OF_RANGE");
  }
}

function assertOptionalCoordinate(x, y) {
  if (x === undefined && y === undefined) return;
  assertCoordinate(x, y);
}

function assertNonEmptyString(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw driverError(code);
  }
}

export function createDriverSessionState({
  sessionId,
  token,
  now = Date.now,
  randomId = randomUUID,
}) {
  if (!sessionId || typeof sessionId !== "string") {
    throw driverError("AI_DRIVER_SESSION_REQUIRED");
  }
  if (!TOKEN_PATTERN.test(token)) {
    throw driverError("AI_DRIVER_TOKEN_INVALID");
  }

  let frameSeq = 0;
  let lastRequestSeq = 0;
  let lastHeartbeatAt = now();
  let runCount = 0;
  let activeGesture = null;
  let fatalReason = null;
  const seenActionIds = new Set();
  const usedGestureIds = new Set();

  const assertNotFatal = () => {
    if (fatalReason) throw driverError(fatalReason);
  };

  const failFatal = (reason) => {
    if (!fatalReason) fatalReason = reason;
    throw driverError(fatalReason);
  };

  const assertConnected = () => {
    assertNotFatal();
    if (now() - lastHeartbeatAt > DRIVER_DISCONNECT_MS) {
      failFatal("AI_DRIVER_HEARTBEAT_TIMEOUT");
    }
    return true;
  };

  const assertGestureLease = () => {
    if (
      activeGesture
      && now() - activeGesture.startedAt > GESTURE_LEASE_MS
    ) {
      activeGesture = null;
      failFatal("AI_DRIVER_GESTURE_EXPIRED");
    }
  };

  const assertActionOpen = () => {
    assertConnected();
    assertGestureLease();
    assertNotFatal();
    return true;
  };

  const authorize = (request) => {
    if (
      !request
      || typeof request !== "object"
      || Array.isArray(request)
    ) {
      throw driverError("AI_DRIVER_REQUEST_INVALID");
    }
    assertActionOpen();
    if (request?.sessionId !== sessionId) {
      throw driverError("AI_DRIVER_SESSION_MISMATCH");
    }
    if (request.token !== token) {
      throw driverError("AI_DRIVER_TOKEN_MISMATCH");
    }
    if (!Number.isSafeInteger(request.requestSeq) || request.requestSeq < 1) {
      throw driverError("AI_DRIVER_REQUEST_SEQ_INVALID");
    }
    if (request.requestSeq <= lastRequestSeq) {
      throw driverError("AI_DRIVER_REQUEST_REPLAY");
    }
    assertNonEmptyString(request.actionId, "AI_DRIVER_ACTION_ID_REQUIRED");
    if (seenActionIds.has(request.actionId)) {
      throw driverError("AI_DRIVER_DUPLICATE_ACTION");
    }
    if (request.frameSeq !== frameSeq) {
      throw driverError("AI_DRIVER_STALE_FRAME");
    }
    assertOptionalCoordinate(request.x, request.y);
    lastRequestSeq = request.requestSeq;
    seenActionIds.add(request.actionId);
    return Object.freeze({
      ok: true,
      requestSeq: lastRequestSeq,
      actionId: request.actionId,
      frameSeq,
    });
  };

  const heartbeat = (request = null) => {
    if (request) {
      authorize(request);
    } else {
      assertActionOpen();
    }
    lastHeartbeatAt = now();
    return Object.freeze({
      ok: true,
      lastHeartbeatAt,
    });
  };

  const advanceFrame = () => {
    assertActionOpen();
    frameSeq += 1;
    return frameSeq;
  };

  const currentGesture = (gestureId) => {
    assertNonEmptyString(gestureId, "AI_DRIVER_GESTURE_ID_REQUIRED");
    if (!activeGesture || activeGesture.gestureId !== gestureId) {
      throw driverError("AI_DRIVER_GESTURE_MISMATCH");
    }
    return activeGesture;
  };

  const gestureSnapshot = (gesture) => Object.freeze({ ...gesture });

  const beginGesture = ({ actionId, x, y }) => {
    assertActionOpen();
    assertNonEmptyString(actionId, "AI_DRIVER_ACTION_ID_REQUIRED");
    if (activeGesture) throw driverError("AI_DRIVER_GESTURE_ACTIVE");
    assertCoordinate(x, y);
    const gestureId = randomId();
    if (typeof gestureId !== "string" || gestureId.trim().length === 0) {
      throw driverError("AI_DRIVER_GESTURE_ID_INVALID");
    }
    if (usedGestureIds.has(gestureId)) {
      throw driverError("AI_DRIVER_GESTURE_ID_COLLISION");
    }
    usedGestureIds.add(gestureId);
    activeGesture = {
      gestureId,
      actionId,
      startedAt: now(),
      x,
      y,
    };
    return gestureSnapshot(activeGesture);
  };

  const moveGesture = ({ actionId, gestureId, x, y }) => {
    assertActionOpen();
    assertNonEmptyString(actionId, "AI_DRIVER_ACTION_ID_REQUIRED");
    const gesture = currentGesture(gestureId);
    assertCoordinate(x, y);
    activeGesture = {
      ...gesture,
      lastActionId: actionId,
      x,
      y,
    };
    return gestureSnapshot(activeGesture);
  };

  const endGesture = ({ actionId, gestureId, x, y }) => {
    assertActionOpen();
    assertNonEmptyString(actionId, "AI_DRIVER_ACTION_ID_REQUIRED");
    const gesture = currentGesture(gestureId);
    assertOptionalCoordinate(x, y);
    const completed = {
      ...gesture,
      lastActionId: actionId,
      endedAt: now(),
      x: x ?? gesture.x,
      y: y ?? gesture.y,
    };
    activeGesture = null;
    return gestureSnapshot(completed);
  };

  const cancelGesture = ({ actionId, gestureId }) => {
    assertActionOpen();
    assertNonEmptyString(actionId, "AI_DRIVER_ACTION_ID_REQUIRED");
    const gesture = currentGesture(gestureId);
    const cancelled = {
      ...gesture,
      lastActionId: actionId,
      cancelledAt: now(),
    };
    activeGesture = null;
    return gestureSnapshot(cancelled);
  };

  const recordRun = (index) => {
    assertActionOpen();
    if (!Number.isSafeInteger(index) || index < 1) {
      throw driverError("AI_DRIVER_RUN_INDEX_INVALID");
    }
    if (index > 3) failFatal("AI_DRIVER_FOURTH_RUN");
    if (index <= runCount) failFatal("AI_DRIVER_RUN_REPLAY");
    if (index !== runCount + 1) failFatal("AI_DRIVER_RUN_ORDER");
    runCount = index;
    if (runCount === 3 && !fatalReason) {
      fatalReason = "AI_DRIVER_RUNS_COMPLETE";
    }
    return runCount;
  };

  const snapshot = () => Object.freeze({
    sessionId,
    frameSeq,
    lastRequestSeq,
    lastHeartbeatAt,
    runCount,
    seenActionCount: seenActionIds.size,
    activeGesture:
      activeGesture ? gestureSnapshot(activeGesture) : null,
    fatalReason,
  });

  return Object.freeze({
    authorize,
    heartbeat,
    advanceFrame,
    beginGesture,
    moveGesture,
    endGesture,
    cancelGesture,
    recordRun,
    assertConnected,
    assertActionOpen,
    snapshot,
  });
}
