import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { connect as netConnect } from "node:net";
import { describe, it } from "node:test";

import { createBrowserTouchAdapter } from "../../tools/ai-playtest/browser-touch-adapter.mjs";
import { startDriverIpcServer } from "../../tools/ai-playtest/driver-ipc-server.mjs";

const SESSION_ID = "session-1";
const TOKEN = "c".repeat(64);
const JSON_CONTENT_TYPE = "application/json";

function command(type, requestSeq = 1, overrides = {}) {
  return {
    type,
    sessionId: SESSION_ID,
    requestSeq,
    actionId: `${type}-${requestSeq}`,
    frameSeq: 0,
    ...overrides,
  };
}

function fakeAdapter(overrides = {}) {
  const calls = [];
  const invoke = (type, result) => async (input) => {
    calls.push({ type, input });
    return result;
  };
  return {
    calls,
    capture: invoke("capture", Buffer.from("png-bytes")),
    visible: invoke("visible", {
      text: "Play",
      controls: [{
        controlId: "control-1",
        label: "Play",
        enabled: true,
        rect: { x: 10, y: 20, width: 30, height: 40 },
      }],
    }),
    touchTap: invoke("touchTap", { ok: true }),
    touchBegin: invoke("touchBegin", { ok: true }),
    touchMove: invoke("touchMove", { ok: true }),
    touchEnd: invoke("touchEnd", { ok: true }),
    touchCancel: invoke("touchCancel", { ok: true }),
    ...overrides,
  };
}

async function rawRequest(controller, {
  method = "POST",
  path = "/v1/command",
  bearer = TOKEN,
  contentType = JSON_CONTENT_TYPE,
  body = "",
  headers = {},
} = {}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const requestHeaders = {
    connection: "close",
    ...headers,
  };
  if (bearer !== null) requestHeaders.authorization = `Bearer ${bearer}`;
  if (contentType !== null) requestHeaders["content-type"] = contentType;
  if (!("content-length" in requestHeaders)) {
    requestHeaders["content-length"] = String(bytes.byteLength);
  }

  return new Promise((resolve, reject) => {
    const request = httpRequest({
      host: controller.address.host,
      port: controller.address.port,
      method,
      path,
      headers: requestHeaders,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          // Tests for malformed requests still expect a JSON error response.
        }
        resolve({
          status: response.statusCode,
          headers: response.headers,
          text,
          json,
        });
      });
    });
    request.on("error", reject);
    request.end(bytes);
  });
}

function sendCommand(controller, value, options = {}) {
  return rawRequest(controller, {
    ...options,
    body: JSON.stringify(value),
  });
}

async function startTestServer({
  adapter = fakeAdapter(),
  now,
  randomId,
  timeouts,
  healthCheckIntervalMs,
} = {}) {
  const faults = [];
  const controller = await startDriverIpcServer({
    sessionId: SESSION_ID,
    token: TOKEN,
    adapter,
    now,
    randomId,
    timeouts,
    healthCheckIntervalMs,
    onFault: (code) => faults.push(code),
  });
  return { controller, adapter, faults };
}

function rawHttp(controller, payload) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    const socket = netConnect({
      host: controller.address.host,
      port: controller.address.port,
    });
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => {
      socket.destroy();
      finish(reject, new Error("RAW_HTTP_TIMEOUT"));
    }, 2_000);
    socket.on("connect", () => socket.end(payload));
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => finish(
      resolve,
      Buffer.concat(chunks).toString("utf8"),
    ));
    socket.on("close", () => finish(
      resolve,
      Buffer.concat(chunks).toString("utf8"),
    ));
    socket.on("error", (error) => finish(reject, error));
  });
}

function rawCommandHeaders(extraHeaders = []) {
  return [
    "POST /v1/command HTTP/1.1",
    "Host: 127.0.0.1",
    `Authorization: Bearer ${TOKEN}`,
    "Content-Type: application/json",
    ...extraHeaders,
  ];
}

async function expectPermanentFault({
  request,
  expected,
  setup,
}) {
  const context = await startTestServer(setup);
  try {
    const response = await request(context.controller);
    assert.equal(response.json?.error, expected);
    assert.equal(context.controller.fatalReason(), expected);
    assert.deepEqual(context.faults, [expected]);

    const afterFault = await sendCommand(
      context.controller,
      command("ready", 999),
    );
    assert.equal(afterFault.json?.error, expected);
    assert.deepEqual(context.faults, [expected]);
  } finally {
    await context.controller.close();
  }
}

describe("AI driver loopback HTTP transport", () => {
  it("binds only a random 127.0.0.1 port and keeps the descriptor controller-only", async () => {
    const { controller } = await startTestServer();
    try {
      assert.deepEqual(controller.address, {
        host: "127.0.0.1",
        port: controller.address.port,
      });
      assert.equal(Number.isInteger(controller.address.port), true);
      assert.equal(controller.address.port > 0, true);
      assert.deepEqual(controller.descriptor, {
        schemaVersion: 1,
        sessionId: SESSION_ID,
        url: `http://127.0.0.1:${controller.address.port}/v1/command`,
        token: TOKEN,
      });

      const ready = await sendCommand(controller, command("ready"));
      assert.equal(ready.status, 200);
      assert.equal(ready.json.sessionId, SESSION_ID);
      assert.equal(ready.json.frameSeq, 0);
      assert.equal(JSON.stringify(ready.json).includes(TOKEN), false);
      assert.equal("descriptor" in ready.json, false);
    } finally {
      await controller.close();
    }
  });

  it("rejects any route, method, or content type outside the one-command contract", async () => {
    const scenarios = [
      {
        expected: "AI_DRIVER_ROUTE_NOT_FOUND",
        request: (controller) => rawRequest(controller, {
          path: "/v1/descriptor",
          body: "{}",
        }),
      },
      {
        expected: "AI_DRIVER_METHOD_NOT_ALLOWED",
        request: (controller) => rawRequest(controller, {
          method: "GET",
          body: "",
        }),
      },
      {
        expected: "AI_DRIVER_CONTENT_TYPE_REQUIRED",
        request: (controller) => rawRequest(controller, {
          contentType: "text/plain",
          body: "{}",
        }),
      },
    ];
    for (const scenario of scenarios) {
      await expectPermanentFault(scenario);
    }
  });

  it("uses bearer authentication and never reflects the token in errors", async () => {
    const context = await startTestServer();
    try {
      const response = await sendCommand(
        context.controller,
        command("ready"),
        { bearer: "d".repeat(64) },
      );
      assert.equal(response.status, 401);
      assert.equal(response.json.error, "AI_DRIVER_UNAUTHORIZED");
      assert.equal(response.text.includes(TOKEN), false);
      assert.equal(response.text.includes("d".repeat(64)), false);
      assert.deepEqual(context.faults, ["AI_DRIVER_UNAUTHORIZED"]);
    } finally {
      await context.controller.close();
    }
  });

  it("rejects malformed and over-64-KiB JSON bodies", async () => {
    await expectPermanentFault({
      expected: "AI_DRIVER_JSON_INVALID",
      request: (controller) => rawRequest(controller, {
        body: "{\"type\":",
      }),
    });
    await expectPermanentFault({
      expected: "AI_DRIVER_BODY_TOO_LARGE",
      request: (controller) => rawRequest(controller, {
        body: Buffer.alloc((64 * 1024) + 1, 0x20),
      }),
    });
  });

  it("rejects chunked, duplicate-length, ambiguous, and parser-invalid raw HTTP", async () => {
    const body = JSON.stringify(command("ready"));
    const scenarios = [
      {
        expected: "AI_DRIVER_HTTP_FRAMING_INVALID",
        payload: [
          ...rawCommandHeaders(["Transfer-Encoding: chunked"]),
          "",
          `${body.length.toString(16)}\r\n${body}\r\n0`,
          "",
          "",
        ].join("\r\n"),
      },
      {
        expected: "AI_DRIVER_HTTP_FRAMING_INVALID",
        payload: [
          ...rawCommandHeaders(),
          "",
          body,
        ].join("\r\n"),
      },
      {
        expected: "AI_DRIVER_HTTP_PARSE_ERROR",
        payload: [
          ...rawCommandHeaders([
            `Content-Length: ${Buffer.byteLength(body)}`,
            `Content-Length: ${Buffer.byteLength(body)}`,
          ]),
          "",
          body,
        ].join("\r\n"),
      },
      {
        expected: "AI_DRIVER_HTTP_PARSE_ERROR",
        payload: [
          ...rawCommandHeaders([
            `Content-Length: ${Buffer.byteLength(body)}`,
            "Transfer-Encoding: chunked",
          ]),
          "",
          body,
        ].join("\r\n"),
      },
      {
        expected: "AI_DRIVER_HTTP_PARSE_ERROR",
        payload: "THIS IS NOT HTTP\r\n\r\n",
      },
      {
        expected: "AI_DRIVER_HTTP_PARSE_ERROR",
        payload: [
          ...rawCommandHeaders([
            `Content-Length: ${Buffer.byteLength(body) + 1}`,
          ]),
          "",
          body,
        ].join("\r\n"),
      },
    ];

    for (const { expected, payload } of scenarios) {
      const context = await startTestServer();
      try {
        const response = await rawHttp(context.controller, payload);
        assert.match(response, /^HTTP\/1\.1 400 /u);
        assert.match(response, new RegExp(expected, "u"));
        assert.equal(context.controller.fatalReason(), expected);
        assert.deepEqual(context.faults, [expected]);
      } finally {
        await context.controller.close();
      }
    }
  });

  it("closes promptly and destroys half-header and half-body sockets", async () => {
    const context = await startTestServer({
      timeouts: {
        headersTimeout: 100,
        requestTimeout: 100,
        keepAliveTimeout: 50,
      },
    });
    const sockets = [
      netConnect(context.controller.address.port, context.controller.address.host),
      netConnect(context.controller.address.port, context.controller.address.host),
    ];
    try {
      await Promise.all(sockets.map((socket) => new Promise(
        (resolve, reject) => {
          socket.once("connect", resolve);
          socket.once("error", reject);
        },
      )));
      sockets[0].write("POST /v1/command HTTP/1.1\r\nHost: 127.0.0.1\r\n");
      sockets[1].write([
        ...rawCommandHeaders(["Content-Length: 100"]),
        "",
        "{",
      ].join("\r\n"));

      await Promise.race([
        context.controller.close(),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("AI_DRIVER_CLOSE_BLOCKED")),
            500,
          );
        }),
      ]);
      await Promise.all(sockets.map((socket) => new Promise(
        (resolve, reject) => {
          if (socket.destroyed) {
            resolve();
            return;
          }
          const timer = setTimeout(
            () => reject(new Error("AI_DRIVER_CLIENT_SOCKET_OPEN")),
            500,
          );
          socket.once("close", () => {
            clearTimeout(timer);
            resolve();
          });
        },
      )));
      assert.equal(sockets.every((socket) => socket.destroyed), true);
    } finally {
      for (const socket of sockets) socket.destroy();
      await context.controller.close();
    }
  });

  it("waits for an in-flight touch audit and latched fault before close returns", async () => {
    let releaseTouch;
    let markTouchStarted;
    let touchFinished = false;
    const touchStarted = new Promise((resolve) => {
      markTouchStarted = resolve;
    });
    const blockedTouch = new Promise((resolve) => {
      releaseTouch = resolve;
    });
    const touchError = new Error("delayed touch audit failed");
    touchError.code = "AI_DRIVER_DELAYED_TOUCH_FAILED";
    const adapter = fakeAdapter({
      async touchTap(input) {
        adapter.calls.push({ type: "touchTap", input });
        markTouchStarted();
        await blockedTouch;
        touchFinished = true;
        throw touchError;
      },
    });
    const context = await startTestServer({ adapter });
    const request = sendCommand(
      context.controller,
      command("touchTap", 1, { x: 10, y: 20 }),
    ).catch((error) => error);
    try {
      await touchStarted;
      let closeSettled = false;
      const close = context.controller.close().then(() => {
        closeSettled = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(closeSettled, false);
      releaseTouch();
      await close;
      await request;
      assert.equal(touchFinished, true);
      assert.equal(
        context.controller.fatalReason(),
        "AI_DRIVER_DELAYED_TOUCH_FAILED",
      );
      assert.deepEqual(context.faults, ["AI_DRIVER_DELAYED_TOUCH_FAILED"]);
    } finally {
      releaseTouch();
      await request;
      await context.controller.close();
    }
  });

  it("permanently faults a silent heartbeat timeout and clears its watchdog on close", async () => {
    let now = 1_000;
    const context = await startTestServer({
      now: () => now,
      healthCheckIntervalMs: 5,
    });
    try {
      now += 10_001;
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(
        context.controller.fatalReason(),
        "AI_DRIVER_HEARTBEAT_TIMEOUT",
      );
      assert.deepEqual(context.faults, ["AI_DRIVER_HEARTBEAT_TIMEOUT"]);
      await context.controller.close();
      now += 10_001;
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.deepEqual(context.faults, ["AI_DRIVER_HEARTBEAT_TIMEOUT"]);
    } finally {
      await context.controller.close();
    }
  });

  it("serializes concurrent commands and permanently rejects overlap", async () => {
    let releaseVisible;
    let markVisibleStarted;
    const visibleStarted = new Promise((resolve) => {
      markVisibleStarted = resolve;
    });
    const adapter = fakeAdapter({
      async visible(input) {
        adapter.calls.push({ type: "visible", input });
        markVisibleStarted();
        await new Promise((resolve) => {
          releaseVisible = resolve;
        });
        return { text: "ready", controls: [] };
      },
    });
    const context = await startTestServer({ adapter });
    try {
      const first = sendCommand(
        context.controller,
        command("visible", 1),
      );
      await visibleStarted;
      const second = await sendCommand(
        context.controller,
        command("heartbeat", 2),
      );
      assert.equal(second.json.error, "AI_DRIVER_CONCURRENT_COMMAND");
      releaseVisible();
      const firstResponse = await first;
      assert.equal(firstResponse.status, 200);
      assert.equal(adapter.calls.length, 1);
      assert.deepEqual(context.faults, ["AI_DRIVER_CONCURRENT_COMMAND"]);
    } finally {
      releaseVisible?.();
      await context.controller.close();
    }
  });
});

describe("AI driver command authorization and whitelist", () => {
  it("exposes only the nine named commands without evaluate, CDP, HTML, or selectors", async () => {
    for (const type of ["evaluate", "cdp", "html", "selector", "descriptor"]) {
      await expectPermanentFault({
        expected: "AI_DRIVER_COMMAND_FORBIDDEN",
        request: (controller) => sendCommand(
          controller,
          command(type, 1, {
            expression: "globalThis.__AI_DRIVER_ESCAPE__ = true",
          }),
        ),
      });
    }
  });

  it("authorizes ready, heartbeat, capture, and visible with explicit frame sequences", async () => {
    const context = await startTestServer();
    try {
      const ready = await sendCommand(
        context.controller,
        command("ready", 1),
      );
      assert.deepEqual(ready.json.allowedCommands, [
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

      const heartbeat = await sendCommand(
        context.controller,
        command("heartbeat", 2),
      );
      assert.equal(heartbeat.json.ok, true);

      const capture = await sendCommand(
        context.controller,
        command("capture", 3),
      );
      assert.equal(capture.json.pngBase64, Buffer.from("png-bytes").toString("base64"));
      assert.equal(capture.json.frameSeq, 1);

      const visible = await sendCommand(
        context.controller,
        command("visible", 4, {
          frameSeq: 1,
          expression: "document.documentElement.outerHTML",
        }),
      );
      assert.deepEqual(visible.json, {
        text: "Play",
        controls: [{
          controlId: "control-1",
          label: "Play",
          enabled: true,
          rect: { x: 10, y: 20, width: 30, height: 40 },
        }],
      });
      assert.equal("html" in visible.json, false);
      assert.equal("selector" in visible.json.controls[0], false);
      assert.equal(
        context.adapter.calls.some(({ input }) => (
          input && "expression" in input
        )),
        false,
      );
    } finally {
      await context.controller.close();
    }
  });

  it("rejects wrong sessions, replay, duplicate actions, stale frames, and coordinates", async () => {
    await expectPermanentFault({
      expected: "AI_DRIVER_SESSION_MISMATCH",
      request: (controller) => sendCommand(
        controller,
        command("ready", 1, { sessionId: "another-session" }),
      ),
    });

    for (const scenario of [
      {
        expected: "AI_DRIVER_REQUEST_REPLAY",
        second: command("ready", 1, { actionId: "ready-2" }),
      },
      {
        expected: "AI_DRIVER_DUPLICATE_ACTION",
        second: command("ready", 2, { actionId: "ready-1" }),
      },
      {
        expected: "AI_DRIVER_STALE_FRAME",
        second: command("ready", 2, { frameSeq: 1 }),
      },
      {
        expected: "AI_DRIVER_STALE_FRAME",
        second: command("ready", 2, { frameSeq: undefined }),
      },
      {
        expected: "AI_DRIVER_COORDINATE_OUT_OF_RANGE",
        second: command("touchTap", 2, { x: 391, y: 10 }),
      },
    ]) {
      await expectPermanentFault({
        expected: scenario.expected,
        request: async (controller) => {
          const first = await sendCommand(controller, command("ready", 1));
          assert.equal(first.status, 200);
          return sendCommand(controller, scenario.second);
        },
      });
    }
  });

  it("dispatches tap and runner-owned gesture operations without pass-through", async () => {
    const context = await startTestServer({
      randomId: () => "gesture-1",
    });
    try {
      assert.equal((await sendCommand(
        context.controller,
        command("touchTap", 1, { x: 10, y: 20 }),
      )).status, 200);
      const begin = await sendCommand(
        context.controller,
        command("touchBegin", 2, { x: 20, y: 30 }),
      );
      assert.equal(begin.json.gestureId, "gesture-1");
      assert.equal((await sendCommand(
        context.controller,
        command("touchMove", 3, {
          gestureId: "gesture-1",
          x: 30,
          y: 40,
        }),
      )).status, 200);
      assert.equal((await sendCommand(
        context.controller,
        command("touchEnd", 4, {
          gestureId: "gesture-1",
          x: 40,
          y: 50,
        }),
      )).status, 200);
      assert.deepEqual(
        context.adapter.calls.map(({ type }) => type),
        ["touchTap", "touchBegin", "touchMove", "touchEnd"],
      );
      for (const { input } of context.adapter.calls) {
        assert.deepEqual(
          Object.keys(input).filter((key) => (
            ["expression", "selector", "html", "cdp"].includes(key)
          )),
          [],
        );
      }
    } finally {
      await context.controller.close();
    }

    const cancelContext = await startTestServer({
      randomId: () => "gesture-cancel",
    });
    try {
      await sendCommand(
        cancelContext.controller,
        command("touchBegin", 1, { x: 1, y: 2 }),
      );
      const cancelled = await sendCommand(
        cancelContext.controller,
        command("touchCancel", 2, {
          gestureId: "gesture-cancel",
        }),
      );
      assert.equal(cancelled.status, 200);
      assert.deepEqual(
        cancelContext.adapter.calls.map(({ type }) => type),
        ["touchBegin", "touchCancel"],
      );
    } finally {
      await cancelContext.controller.close();
    }
  });

  it("permanently faults expired gestures and heartbeat disconnects", async () => {
    let now = 1_000;
    await expectPermanentFault({
      expected: "AI_DRIVER_GESTURE_EXPIRED",
      setup: {
        now: () => now,
        randomId: () => "gesture-timeout",
      },
      request: async (controller) => {
        const begin = await sendCommand(
          controller,
          command("touchBegin", 1, { x: 10, y: 10 }),
        );
        assert.equal(begin.status, 200);
        now += 2_001;
        return sendCommand(
          controller,
          command("touchMove", 2, {
            gestureId: "gesture-timeout",
            x: 11,
            y: 11,
          }),
        );
      },
    });

    now = 1_000;
    await expectPermanentFault({
      expected: "AI_DRIVER_HEARTBEAT_TIMEOUT",
      setup: { now: () => now },
      request: async (controller) => {
        now += 10_001;
        return sendCommand(controller, command("heartbeat", 1));
      },
    });
  });

  it("locks input after run three and reports invalid fourth-run attempts", async () => {
    const context = await startTestServer();
    try {
      assert.equal(context.controller.recordRun(1), 1);
      assert.equal(context.controller.recordRun(2), 2);
      assert.equal(context.controller.recordRun(3), 3);
      assert.equal(context.controller.fatalReason(), null);
      const response = await sendCommand(
        context.controller,
        command("touchTap", 1, { x: 10, y: 10 }),
      );
      assert.equal(response.json.error, "AI_DRIVER_RUNS_COMPLETE");
      assert.deepEqual(context.faults, ["AI_DRIVER_RUNS_COMPLETE"]);
    } finally {
      await context.controller.close();
    }

    const fourth = await startTestServer();
    try {
      assert.throws(
        () => fourth.controller.recordRun(4),
        /AI_DRIVER_FOURTH_RUN/u,
      );
      assert.equal(fourth.controller.fatalReason(), "AI_DRIVER_FOURTH_RUN");
      assert.deepEqual(fourth.faults, ["AI_DRIVER_FOURTH_RUN"]);
    } finally {
      await fourth.controller.close();
    }
  });
});

describe("visible-only browser touch adapter", () => {
  it("captures PNG bytes and evaluates one fixed visible projection without request JavaScript", async () => {
    const visibleButton = {
      innerText: "Play",
      getAttribute: (name) => (name === "aria-label" ? "Start" : null),
      matches: () => false,
      getBoundingClientRect: () => ({
        x: 10,
        y: 20,
        width: 30,
        height: 40,
      }),
      style: {
        display: "block",
        visibility: "visible",
        opacity: "1",
      },
    };
    const hiddenButton = {
      ...visibleButton,
      innerText: "Hidden",
      style: {
        display: "none",
        visibility: "visible",
        opacity: "1",
      },
    };
    const offscreenButton = {
      ...visibleButton,
      innerText: "Offscreen",
      getBoundingClientRect: () => ({
        x: 500,
        y: 20,
        width: 30,
        height: 40,
      }),
    };
    const partialButton = {
      ...visibleButton,
      innerText: "Partial",
      getBoundingClientRect: () => ({
        x: -5,
        y: 20,
        width: 10,
        height: 40,
      }),
    };
    const ancestorHiddenButton = {
      ...visibleButton,
      innerText: "Ancestor hidden",
      getClientRects: () => [],
    };
    for (const element of [
      visibleButton,
      hiddenButton,
      offscreenButton,
      partialButton,
    ]) {
      element.getClientRects = () => [element.getBoundingClientRect()];
    }
    const previousDocument = globalThis.document;
    const previousGetComputedStyle = globalThis.getComputedStyle;
    globalThis.document = {
      body: { innerText: "Visible body text" },
      documentElement: { clientWidth: 390, clientHeight: 844 },
      querySelectorAll(selector) {
        assert.equal(
          selector,
          "button,a,input,select,textarea,[role=button],[tabindex]",
        );
        return [
          visibleButton,
          hiddenButton,
          offscreenButton,
          partialButton,
          ancestorHiddenButton,
        ];
      },
    };
    globalThis.getComputedStyle = (element) => element.style;

    const evaluateCalls = [];
    const page = {
      touchscreen: { tap: async () => {} },
      async screenshot(options) {
        assert.deepEqual(options, { type: "png" });
        return Buffer.from("real-png");
      },
      async evaluate(...args) {
        evaluateCalls.push(args);
        return args[0]();
      },
    };
    const adapter = createBrowserTouchAdapter({
      page,
      cdp: { send: async () => ({ secret: "not-audited" }) },
      writeAction: async () => {},
    });

    try {
      assert.deepEqual(await adapter.capture(), Buffer.from("real-png"));
      const visible = await adapter.visible({
        expression: "document.documentElement.outerHTML",
      });
      assert.deepEqual(visible, {
        text: "Visible body text",
        controls: [{
          controlId: "control-1",
          label: "Play",
          enabled: true,
          rect: { x: 10, y: 20, width: 30, height: 40 },
        }, {
          controlId: "control-2",
          label: "Partial",
          enabled: true,
          rect: { x: -5, y: 20, width: 10, height: 40 },
        }],
      });
      assert.equal(evaluateCalls.length, 1);
      assert.equal(evaluateCalls[0].length, 1);
      assert.doesNotMatch(
        evaluateCalls[0][0].toString(),
        /outerHTML|expression|localStorage|globalThis/u,
      );
    } finally {
      if (previousDocument === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = previousDocument;
      }
      if (previousGetComputedStyle === undefined) {
        delete globalThis.getComputedStyle;
      } else {
        globalThis.getComputedStyle = previousGetComputedStyle;
      }
    }
  });

  it("uses touchscreen tap and audits successful and failed attempts in finally", async () => {
    const audits = [];
    let shouldFail = false;
    const page = {
      screenshot: async () => Buffer.alloc(0),
      evaluate: async () => ({ text: "", controls: [] }),
      touchscreen: {
        async tap(x, y) {
          if (shouldFail) {
            const error = new Error("tap failed");
            error.code = "TOUCH_FAILED";
            throw error;
          }
          assert.deepEqual([x, y], [10, 20]);
        },
      },
    };
    const adapter = createBrowserTouchAdapter({
      page,
      cdp: { send: async () => {} },
      writeAction: async (record) => audits.push(record),
    });
    const input = {
      actionId: "tap-1",
      requestSeq: 1,
      frameSeq: 0,
      x: 10,
      y: 20,
    };

    await adapter.touchTap(input);
    shouldFail = true;
    await assert.rejects(
      adapter.touchTap({ ...input, actionId: "tap-2", requestSeq: 2 }),
      /tap failed/u,
    );
    assert.deepEqual(
      audits.map(({ type, actionId, result, errorCode }) => ({
        type,
        actionId,
        result,
        errorCode,
      })),
      [
        {
          type: "touchTap",
          actionId: "tap-1",
          result: "success",
          errorCode: undefined,
        },
        {
          type: "touchTap",
          actionId: "tap-2",
          result: "failure",
          errorCode: "TOUCH_FAILED",
        },
      ],
    );
    assert.equal(JSON.stringify(audits).includes("tap failed"), false);
  });

  it("preserves touch and audit failures while the server returns only a safe code", async () => {
    const performError = new Error(`perform leaked ${TOKEN}`);
    performError.code = "TOUCH_SECRET_FAILURE";
    const auditError = new Error("audit writer secret failure");
    const adapter = createBrowserTouchAdapter({
      page: {
        screenshot: async () => Buffer.alloc(0),
        evaluate: async () => ({ text: "", controls: [] }),
        touchscreen: {
          tap: async () => {
            throw performError;
          },
        },
      },
      cdp: { send: async () => {} },
      writeAction: async () => {
        throw auditError;
      },
    });
    let aggregate;
    try {
      await adapter.touchTap({
        actionId: "double-failure",
        requestSeq: 1,
        frameSeq: 0,
        x: 10,
        y: 20,
      });
      assert.fail("Expected touch and audit failures");
    } catch (error) {
      aggregate = error;
    }
    assert.equal(aggregate instanceof AggregateError, true);
    assert.deepEqual(aggregate.errors, [performError, auditError]);

    const context = await startTestServer({ adapter });
    try {
      const response = await sendCommand(
        context.controller,
        command("touchTap", 1, { x: 10, y: 20 }),
      );
      assert.equal(response.status, 500);
      assert.equal(response.json.error, "AI_DRIVER_TOUCH_AUDIT_FAILED");
      assert.equal(response.text.includes(TOKEN), false);
      assert.equal(response.text.includes("secret"), false);
      assert.deepEqual(context.faults, ["AI_DRIVER_TOUCH_AUDIT_FAILED"]);
    } finally {
      await context.controller.close();
    }
  });

  it("uses only runner-owned CDP touch events and audits begin, move, end, and cancel", async () => {
    const cdpCalls = [];
    const audits = [];
    const adapter = createBrowserTouchAdapter({
      page: {
        screenshot: async () => Buffer.alloc(0),
        evaluate: async () => ({ text: "", controls: [] }),
        touchscreen: { tap: async () => {} },
      },
      cdp: {
        async send(method, params) {
          cdpCalls.push({ method, params });
          return { privateCdpResponse: true };
        },
      },
      writeAction: async (record) => audits.push(record),
    });

    await adapter.touchBegin({
      actionId: "begin-1",
      requestSeq: 1,
      frameSeq: 0,
      gestureId: "gesture-1",
      x: 10,
      y: 20,
    });
    await adapter.touchMove({
      actionId: "move-1",
      requestSeq: 2,
      frameSeq: 0,
      gestureId: "gesture-1",
      x: 30,
      y: 40,
    });
    await adapter.touchEnd({
      actionId: "end-1",
      requestSeq: 3,
      frameSeq: 0,
      gestureId: "gesture-1",
      x: 50,
      y: 60,
    });
    await adapter.touchBegin({
      actionId: "begin-2",
      requestSeq: 4,
      frameSeq: 0,
      gestureId: "gesture-2",
      x: 70,
      y: 80,
    });
    await adapter.touchCancel({
      actionId: "cancel-2",
      requestSeq: 5,
      frameSeq: 0,
      gestureId: "gesture-2",
    });

    assert.deepEqual(cdpCalls, [
      {
        method: "Input.dispatchTouchEvent",
        params: {
          type: "touchStart",
          touchPoints: [{ x: 10, y: 20 }],
        },
      },
      {
        method: "Input.dispatchTouchEvent",
        params: {
          type: "touchMove",
          touchPoints: [{ x: 30, y: 40 }],
        },
      },
      {
        method: "Input.dispatchTouchEvent",
        params: { type: "touchEnd", touchPoints: [] },
      },
      {
        method: "Input.dispatchTouchEvent",
        params: {
          type: "touchStart",
          touchPoints: [{ x: 70, y: 80 }],
        },
      },
      {
        method: "Input.dispatchTouchEvent",
        params: { type: "touchCancel", touchPoints: [] },
      },
    ]);
    assert.deepEqual(
      audits.map(({ type, result }) => ({ type, result })),
      [
        { type: "touchBegin", result: "success" },
        { type: "touchMove", result: "success" },
        { type: "touchEnd", result: "success" },
        { type: "touchBegin", result: "success" },
        { type: "touchCancel", result: "success" },
      ],
    );
    assert.equal(JSON.stringify(audits).includes("privateCdpResponse"), false);
  });
});
