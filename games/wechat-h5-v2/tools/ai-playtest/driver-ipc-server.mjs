import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

import {
  createDriverSessionState,
  VIEWPORT,
} from "./driver-session-state.mjs";

const HOST = "127.0.0.1";
const COMMAND_PATH = "/v1/command";
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_TIMEOUTS = Object.freeze({
  headersTimeout: 2_000,
  requestTimeout: 5_000,
  keepAliveTimeout: 500,
});
const ALLOWED_COMMANDS = Object.freeze([
  "ready",
  "heartbeat",
  "capture",
  "visible",
  "touchTap",
  "touchBegin",
  "touchMove",
  "touchEnd",
  "touchCancel",
]);
const ALLOWED_COMMAND_SET = new Set(ALLOWED_COMMANDS);

function protocolError(code, status = 409) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function errorCode(error) {
  if (
    error
    && typeof error.code === "string"
    && /^AI_DRIVER_[A-Z0-9_]+$/u.test(error.code)
  ) {
    return error.code;
  }
  return "AI_DRIVER_INTERNAL_ERROR";
}

function errorStatus(error) {
  if (Number.isInteger(error?.status)) return error.status;
  if (errorCode(error) === "AI_DRIVER_INTERNAL_ERROR") return 500;
  return 409;
}

function json(response, status, value) {
  if (response.writableEnded) return;
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, {
    "cache-control": "no-store",
    connection: "close",
    "content-length": String(body.byteLength),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function readBearer(request) {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length);
}

function safeTokenEqual(candidate, expected) {
  const candidateBytes = Buffer.from(candidate, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (candidateBytes.byteLength !== expectedBytes.byteLength) return false;
  return timingSafeEqual(candidateBytes, expectedBytes);
}

function hasJsonContentType(request) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string") return false;
  return contentType.split(";", 1)[0].trim().toLowerCase()
    === "application/json";
}

function declaredContentLength(request) {
  const lengths = [];
  let hasTransferEncoding = false;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index].toLowerCase();
    if (name === "content-length") {
      lengths.push(request.rawHeaders[index + 1]);
    }
    if (name === "transfer-encoding") hasTransferEncoding = true;
  }
  if (
    hasTransferEncoding
    || lengths.length !== 1
    || !/^[0-9]+$/u.test(lengths[0])
  ) {
    throw protocolError("AI_DRIVER_HTTP_FRAMING_INVALID", 400);
  }
  const length = BigInt(lengths[0]);
  if (length > BigInt(MAX_BODY_BYTES)) {
    throw protocolError("AI_DRIVER_BODY_TOO_LARGE", 413);
  }
  return Number(length);
}

async function readBoundedJson(request, declaredLength) {
  if (declaredLength > MAX_BODY_BYTES) {
    request.resume();
    throw protocolError("AI_DRIVER_BODY_TOO_LARGE", 413);
  }

  const chunks = [];
  let byteLength = 0;
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    request.on("data", (chunk) => {
      if (settled) return;
      byteLength += chunk.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        chunks.length = 0;
        request.resume();
        finish(
          reject,
          protocolError("AI_DRIVER_BODY_TOO_LARGE", 413),
        );
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (byteLength !== declaredLength) {
        finish(
          reject,
          protocolError("AI_DRIVER_CONTENT_LENGTH_MISMATCH", 400),
        );
        return;
      }
      finish(resolve);
    });
    request.on("aborted", () => finish(
      reject,
      protocolError("AI_DRIVER_CONTENT_LENGTH_MISMATCH", 400),
    ));
    request.on("error", (error) => finish(reject, error));
  });

  try {
    return JSON.parse(Buffer.concat(chunks, byteLength).toString("utf8"));
  } catch {
    throw protocolError("AI_DRIVER_JSON_INVALID", 400);
  }
}

function visibleResult(value) {
  const text = typeof value?.text === "string" ? value.text : "";
  const controls = Array.isArray(value?.controls)
    ? value.controls.map((control) => ({
        controlId:
          typeof control?.controlId === "string" ? control.controlId : "",
        label: typeof control?.label === "string" ? control.label : "",
        enabled: control?.enabled === true,
        rect: {
          x: control?.rect?.x,
          y: control?.rect?.y,
          width: control?.rect?.width,
          height: control?.rect?.height,
        },
      }))
    : [];
  return { text, controls };
}

function touchInput(command, overrides = {}) {
  return {
    actionId: command.actionId,
    requestSeq: command.requestSeq,
    frameSeq: command.frameSeq,
    ...(command.x === undefined ? {} : { x: command.x }),
    ...(command.y === undefined ? {} : { y: command.y }),
    ...(command.gestureId === undefined
      ? {}
      : { gestureId: command.gestureId }),
    ...overrides,
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, HOST);
  });
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function timeoutValue(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export async function startDriverIpcServer({
  sessionId,
  token,
  adapter,
  gameId = null,
  now = Date.now,
  randomId,
  onFault = () => {},
  timeouts = {},
}) {
  const state = createDriverSessionState({
    sessionId,
    token,
    now,
    ...(randomId === undefined ? {} : { randomId }),
  });
  for (const method of [
    "capture",
    "visible",
    "touchTap",
    "touchBegin",
    "touchMove",
    "touchEnd",
    "touchCancel",
  ]) {
    if (!adapter || typeof adapter[method] !== "function") {
      throw protocolError("AI_DRIVER_ADAPTER_INVALID", 500);
    }
  }
  if (typeof onFault !== "function") {
    throw protocolError("AI_DRIVER_ON_FAULT_INVALID", 500);
  }

  let latchedFault = null;
  let commandInFlight = false;

  const latchFault = (reason) => {
    const code = errorCode(reason);
    if (latchedFault) return latchedFault;
    latchedFault = code;
    try {
      const notified = onFault(code);
      if (notified && typeof notified.catch === "function") {
        notified.catch(() => {});
      }
    } catch {
      // The protocol fault remains authoritative even if reporting fails.
    }
    return latchedFault;
  };

  const assertNotLatched = () => {
    if (latchedFault) throw protocolError(latchedFault);
  };

  const dispatch = async (command, authorization) => {
    const requestedAt = now();
    switch (command.type) {
      case "ready": {
        const snapshot = state.snapshot();
        return {
          ok: true,
          sessionId,
          gameId,
          viewport: VIEWPORT,
          frameSeq: authorization.frameSeq,
          runCount: snapshot.runCount,
          allowedCommands: ALLOWED_COMMANDS,
        };
      }
      case "heartbeat":
        return state.heartbeat();
      case "capture": {
        const png = await adapter.capture();
        if (!Buffer.isBuffer(png) && !(png instanceof Uint8Array)) {
          throw protocolError("AI_DRIVER_CAPTURE_INVALID", 500);
        }
        return {
          pngBase64: Buffer.from(png).toString("base64"),
          frameSeq: state.advanceFrame(),
        };
      }
      case "visible":
        return visibleResult(await adapter.visible());
      case "touchTap":
        await adapter.touchTap(touchInput(command, { requestedAt }));
        return { ok: true };
      case "touchBegin": {
        const gesture = state.beginGesture(command);
        await adapter.touchBegin(touchInput(command, {
          requestedAt,
          gestureId: gesture.gestureId,
        }));
        return { ok: true, gestureId: gesture.gestureId };
      }
      case "touchMove": {
        const gesture = state.moveGesture(command);
        await adapter.touchMove(touchInput(command, {
          requestedAt,
          gestureId: gesture.gestureId,
          x: gesture.x,
          y: gesture.y,
        }));
        return { ok: true, gestureId: gesture.gestureId };
      }
      case "touchEnd": {
        const gesture = state.endGesture(command);
        await adapter.touchEnd(touchInput(command, {
          requestedAt,
          gestureId: gesture.gestureId,
          x: gesture.x,
          y: gesture.y,
        }));
        return { ok: true, gestureId: gesture.gestureId };
      }
      case "touchCancel": {
        const gesture = state.cancelGesture(command);
        await adapter.touchCancel(touchInput(command, {
          requestedAt,
          gestureId: gesture.gestureId,
        }));
        return { ok: true, gestureId: gesture.gestureId };
      }
      default:
        throw protocolError("AI_DRIVER_COMMAND_FORBIDDEN", 403);
    }
  };

  const server = createServer(async (request, response) => {
    try {
      assertNotLatched();
      if (request.url !== COMMAND_PATH) {
        throw protocolError("AI_DRIVER_ROUTE_NOT_FOUND", 404);
      }
      if (request.method !== "POST") {
        throw protocolError("AI_DRIVER_METHOD_NOT_ALLOWED", 405);
      }
      if (!hasJsonContentType(request)) {
        throw protocolError("AI_DRIVER_CONTENT_TYPE_REQUIRED", 415);
      }
      if (!safeTokenEqual(readBearer(request), token)) {
        throw protocolError("AI_DRIVER_UNAUTHORIZED", 401);
      }

      const contentLength = declaredContentLength(request);
      const command = await readBoundedJson(request, contentLength);
      assertNotLatched();
      const authorization = state.authorize({
        ...command,
        token,
      });
      if (!ALLOWED_COMMAND_SET.has(command.type)) {
        throw protocolError("AI_DRIVER_COMMAND_FORBIDDEN", 403);
      }
      if (commandInFlight) {
        throw protocolError("AI_DRIVER_CONCURRENT_COMMAND");
      }

      commandInFlight = true;
      try {
        const result = await dispatch(command, authorization);
        json(response, 200, result);
      } finally {
        commandInFlight = false;
      }
    } catch (error) {
      const code = latchFault(error);
      json(response, errorStatus(error), { error: code });
    }
  });
  server.headersTimeout = timeoutValue(
    timeouts.headersTimeout,
    DEFAULT_TIMEOUTS.headersTimeout,
  );
  server.requestTimeout = timeoutValue(
    timeouts.requestTimeout,
    DEFAULT_TIMEOUTS.requestTimeout,
  );
  server.keepAliveTimeout = timeoutValue(
    timeouts.keepAliveTimeout,
    DEFAULT_TIMEOUTS.keepAliveTimeout,
  );

  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  server.on("clientError", (_error, socket) => {
    const code = latchFault(
      protocolError("AI_DRIVER_HTTP_PARSE_ERROR", 400),
    );
    if (!socket.writable || socket.writableEnded) {
      socket.destroy();
      return;
    }
    const body = Buffer.from(JSON.stringify({ error: code }));
    const response = [
      "HTTP/1.1 400 Bad Request",
      "Connection: close",
      `Content-Length: ${body.byteLength}`,
      "Content-Type: application/json; charset=utf-8",
      "Cache-Control: no-store",
      "X-Content-Type-Options: nosniff",
      "",
      body.toString("utf8"),
    ].join("\r\n");
    socket.end(response, () => socket.destroy());
  });

  await listen(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw protocolError("AI_DRIVER_LISTEN_FAILED", 500);
  }
  const publicAddress = Object.freeze({
    host: HOST,
    port: address.port,
  });
  const descriptor = Object.freeze({
    schemaVersion: 1,
    sessionId,
    url: `http://${HOST}:${address.port}${COMMAND_PATH}`,
    token,
  });
  let closing = null;
  const close = () => {
    if (closing) return closing;
    closing = new Promise((resolve, reject) => {
      const finish = (error) => {
        if (error) reject(error);
        else resolve();
      };
      if (server.listening) server.close(finish);
      else resolve();
      for (const socket of sockets) socket.destroy();
    });
    return closing;
  };

  return Object.freeze({
    address: publicAddress,
    descriptor,
    recordRun(index) {
      assertNotLatched();
      try {
        return state.recordRun(index);
      } catch (error) {
        latchFault(error);
        throw error;
      }
    },
    close,
    fatalReason: () => latchedFault,
  });
}
