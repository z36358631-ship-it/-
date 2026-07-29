import { describe, expect, it } from "vitest";
import {
  createMemoryTelemetryQueue,
  createTelemetryClient,
} from "./index";

describe("telemetry client", () => {
  it("creates ordered local events and closes the run", () => {
    const queue = createMemoryTelemetryQueue();
    const client = createTelemetryClient({
      gameId: "three-lane-squad",
      testMode: true,
      queue,
      sessionId: "session-1",
      idFactory: (() => {
        let id = 0;
        return () => `event-${++id}`;
      })(),
      now: () => 1234,
    });
    client.beginRun("run-1");
    client.emit("first_input", { action: "deploy" });
    client.endRun({ outcome: "won" });
    expect(client.snapshot()).toMatchObject({
      runId: null,
      queuedEvents: 3,
      nextSeq: 4,
    });
    expect(queue.read().map((event) => event.event)).toEqual([
      "run_start",
      "first_input",
      "run_end",
    ]);
  });

  it("rejects credential-shaped payload keys", () => {
    const client = createTelemetryClient({
      gameId: "ricochet-crew",
      testMode: false,
      queue: createMemoryTelemetryQueue(),
      sessionId: "session-2",
    });
    expect(() =>
      client.emit("game_boot", { session_key: "secret" }),
    ).toThrow("TELEMETRY_SENSITIVE_KEY:session_key");
  });
});
