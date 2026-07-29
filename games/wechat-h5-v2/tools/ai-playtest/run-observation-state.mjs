export function createRunObservationState() {
  return {
    processedLifecycleEventIds: new Set(),
    runs: new Map(),
    activeRunId: null,
    startCount: 0,
    endCount: 0,
    lastLifecycleSeq: 0,
  };
}

function assertLifecycleEvent(event) {
  if (
    !event
    || typeof event.eventId !== "string"
    || event.eventId.length === 0
    || typeof event.runId !== "string"
    || event.runId.length === 0
    || !Number.isInteger(event.seq)
    || event.seq < 1
  ) {
    throw new Error("AI_PLAYTEST_LIFECYCLE_EVENT_INVALID");
  }
}

export function observeRunPoll(state, events) {
  if (!Array.isArray(events)) throw new Error("AI_PLAYTEST_TELEMETRY_INVALID");
  const lifecycleEvents = events.filter((event) =>
    event?.event === "run_start" || event?.event === "run_end");
  const localEventIds = new Set();
  const newLifecycleEvents = [];
  for (const event of lifecycleEvents) {
    assertLifecycleEvent(event);
    if (localEventIds.has(event.eventId)) {
      throw new Error(`AI_PLAYTEST_DUPLICATE_EVENT_ID:${event.eventId}`);
    }
    localEventIds.add(event.eventId);
    if (!state.processedLifecycleEventIds.has(event.eventId)) {
      newLifecycleEvents.push(event);
    }
  }

  const firstSeenKinds = new Map();
  for (const event of newLifecycleEvents) {
    const kinds = firstSeenKinds.get(event.runId) ?? new Set();
    kinds.add(event.event);
    firstSeenKinds.set(event.runId, kinds);
  }
  for (const [runId, kinds] of firstSeenKinds) {
    if (kinds.has("run_start") && kinds.has("run_end")) {
      throw new Error(`AI_PLAYTEST_FAST_RUN:${runId}`);
    }
  }

  const transitions = [];
  for (const event of newLifecycleEvents) {
    state.processedLifecycleEventIds.add(event.eventId);
    if (event.seq <= state.lastLifecycleSeq) {
      throw new Error(
        `AI_PLAYTEST_LIFECYCLE_OUT_OF_ORDER:${event.runId}:${event.seq}`,
      );
    }
    state.lastLifecycleSeq = event.seq;
    if (event.event === "run_start") {
      if (state.startCount >= 3) {
        throw new Error(`AI_PLAYTEST_FOURTH_RUN_START:${event.runId}`);
      }
      if (state.runs.has(event.runId)) {
        throw new Error(`AI_PLAYTEST_DUPLICATE_START:${event.runId}`);
      }
      if (state.activeRunId !== null) {
        throw new Error(
          `AI_PLAYTEST_LIFECYCLE_OUT_OF_ORDER:${event.runId}:`
          + `active ${state.activeRunId}`,
        );
      }
      const run = {
        index: state.startCount + 1,
        runId: event.runId,
        startedEvent: event,
        endedEvent: null,
        events: [],
      };
      state.startCount += 1;
      state.activeRunId = event.runId;
      state.runs.set(event.runId, run);
      transitions.push({ type: "start", run });
      continue;
    }

    if (state.endCount >= 3) {
      throw new Error(`AI_PLAYTEST_FOURTH_RUN_END:${event.runId}`);
    }
    const run = state.runs.get(event.runId);
    if (run?.endedEvent) {
      throw new Error(`AI_PLAYTEST_DUPLICATE_END:${event.runId}`);
    }
    if (!run || state.activeRunId !== event.runId) {
      throw new Error(
        `AI_PLAYTEST_LIFECYCLE_OUT_OF_ORDER:${event.runId}:`
        + `active ${state.activeRunId ?? "none"}`,
      );
    }
    run.endedEvent = event;
    run.events = events.filter((item) => item.runId === event.runId);
    state.endCount += 1;
    state.activeRunId = null;
    transitions.push({ type: "end", run });
  }
  return transitions;
}

export function assertCompleteRunObservation(state) {
  if (
    state.startCount !== 3
    || state.endCount !== 3
    || state.runs.size !== 3
    || state.activeRunId !== null
  ) {
    throw new Error(
      `AI_PLAYTEST_RUN_COUNT starts ${state.startCount}/3, ends ${state.endCount}/3`,
    );
  }
  return [...state.runs.values()];
}

export function collectRunCompletionIssues(runs) {
  const issues = [];
  if (runs.length !== 3) issues.push(`expected 3 completed runs, got ${runs.length}`);
  for (const run of runs) {
    if (run.outcome === "unknown") issues.push(`run ${run.runId} has unknown outcome`);
    if (!Number.isInteger(run.firstInputMs) || run.firstInputMs < 0) {
      issues.push(`run ${run.runId} is missing first_input`);
    }
  }
  return issues;
}
