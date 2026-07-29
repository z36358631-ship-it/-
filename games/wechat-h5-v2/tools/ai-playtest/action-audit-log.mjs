import { open } from "node:fs/promises";

const ACTION_FIELDS = new Set([
  "schemaVersion",
  "type",
  "actionId",
  "requestSeq",
  "frameSeq",
  "gestureId",
  "x",
  "y",
  "requestedAt",
  "executedAt",
  "completedAt",
  "result",
  "errorCode",
  "sessionId",
  "gameId",
  "runId",
]);

const ACTION_TYPES = new Set([
  "touchTap",
  "touchBegin",
  "touchMove",
  "touchEnd",
  "touchCancel",
]);
const ACTION_RESULTS = new Set(["success", "failure"]);
const SAFE_OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,127}$/u;

function actionLogError(code, detail = "") {
  const error = new Error(`${code}${detail ? `:${detail}` : ""}`);
  error.code = code;
  return error;
}

function validSafeInteger(value, minimum) {
  return Number.isSafeInteger(value) && value >= minimum;
}

function validFiniteNumber(value, minimum = Number.NEGATIVE_INFINITY) {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= minimum
  );
}

const FIELD_VALIDATORS = Object.freeze({
  schemaVersion: (value) => value === 1,
  type: (value) => (
    typeof value === "string" && ACTION_TYPES.has(value)
  ),
  actionId: (value) => (
    typeof value === "string" && SAFE_OPAQUE_ID.test(value)
  ),
  requestSeq: (value) => validSafeInteger(value, 1),
  frameSeq: (value) => validSafeInteger(value, 0),
  gestureId: (value) => (
    typeof value === "string" && SAFE_OPAQUE_ID.test(value)
  ),
  x: (value) => validFiniteNumber(value),
  y: (value) => validFiniteNumber(value),
  requestedAt: (value) => validFiniteNumber(value, 0),
  executedAt: (value) => validFiniteNumber(value, 0),
  completedAt: (value) => validFiniteNumber(value, 0),
  result: (value) => (
    typeof value === "string" && ACTION_RESULTS.has(value)
  ),
  errorCode: (value) => (
    typeof value === "string" && SAFE_ERROR_CODE.test(value)
  ),
  sessionId: (value) => (
    typeof value === "string" && SAFE_OPAQUE_ID.test(value)
  ),
  gameId: (value) => (
    typeof value === "string" && SAFE_OPAQUE_ID.test(value)
  ),
  runId: (value) => (
    typeof value === "string" && SAFE_OPAQUE_ID.test(value)
  ),
});

function serializeRecord(record) {
  if (
    !record
    || typeof record !== "object"
    || Array.isArray(record)
  ) {
    throw actionLogError("AI_DRIVER_ACTION_LOG_RECORD_INVALID");
  }
  const forbidden = Object.keys(record).find(
    (field) => !ACTION_FIELDS.has(field),
  );
  if (forbidden) {
    throw actionLogError(
      "AI_DRIVER_ACTION_LOG_FORBIDDEN_FIELD",
      forbidden,
    );
  }
  for (const [field, value] of Object.entries(record)) {
    if (!FIELD_VALIDATORS[field](value)) {
      throw actionLogError(
        "AI_DRIVER_ACTION_LOG_FIELD_INVALID",
        field,
      );
    }
  }
  return `${JSON.stringify(record)}\n`;
}

export async function createActionAuditLog(target, {
  forbiddenValues = [],
  openFile = open,
} = {}) {
  const handle = await openFile(target, "wx");
  let closed = false;
  let closing = null;
  let persistenceFailure = null;
  let pending = Promise.resolve();

  const latchPersistenceFailure = (error) => {
    if (!persistenceFailure) persistenceFailure = error;
    return persistenceFailure;
  };

  return Object.freeze({
    async write(record) {
      if (persistenceFailure) throw persistenceFailure;
      if (closed) {
        throw actionLogError("AI_DRIVER_ACTION_LOG_CLOSED");
      }
      const line = serializeRecord(record);
      if (
        forbiddenValues.some((value) => (
          typeof value === "string"
          && value.length > 0
          && line.includes(value)
        ))
      ) {
        throw actionLogError("AI_DRIVER_ACTION_LOG_SECRET_VALUE");
      }
      const operation = pending.then(async () => {
        if (persistenceFailure) throw persistenceFailure;
        try {
          await handle.writeFile(line, "utf8");
          await handle.sync();
        } catch (error) {
          throw latchPersistenceFailure(error);
        }
      });
      pending = operation.catch(() => {});
      return operation;
    },
    async close() {
      if (closing) return closing;
      closed = true;
      closing = (async () => {
        await pending;
        let closeFailure = null;
        try {
          await handle.close();
        } catch (error) {
          closeFailure = error;
        }
        if (persistenceFailure && closeFailure) {
          throw new AggregateError(
            [persistenceFailure, closeFailure],
            "AI_DRIVER_ACTION_LOG_PERSIST_AND_CLOSE_FAILED",
            { cause: persistenceFailure },
          );
        }
        if (persistenceFailure) throw persistenceFailure;
        if (closeFailure) throw closeFailure;
      })();
      return closing;
    },
  });
}
