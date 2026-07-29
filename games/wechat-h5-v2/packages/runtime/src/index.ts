import {
  PERFORMANCE_PROFILES,
  type PauseReason,
  type PerformanceProfile,
  type PerformanceTier,
} from "@gamehub/h5-contracts";

export interface RuntimeSnapshot {
  state: "idle" | "running" | "paused" | "stopped" | "disposed";
  pauseReason: PauseReason | null;
  performanceTier: PerformanceTier;
  fixedUpdates: number;
  renderedFrames: number;
  droppedFrameDebtMs: number;
}

export interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export interface GameRuntime {
  start(): void;
  pause(reason: PauseReason): void;
  resume(): void;
  stop(): void;
  setPerformanceTier(tier: PerformanceTier): void;
  snapshot(): RuntimeSnapshot;
  dispose(): void;
}

export interface GameRuntimeOptions {
  fixedStepMs?: number;
  maxCatchUpSteps?: number;
  onFixedUpdate(stepSeconds: number): void;
  onRender(alpha: number): void;
  onPauseChange?(paused: boolean, reason: PauseReason | null): void;
  onPerformanceTierChange?(tier: PerformanceTier): void;
  scheduler?: FrameScheduler;
}

const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export function createGameRuntime(options: GameRuntimeOptions): GameRuntime {
  const stepMs = options.fixedStepMs ?? 1000 / 60;
  const maxSteps = options.maxCatchUpSteps ?? 5;
  if (!(stepMs > 0)) throw new Error("RUNTIME_STEP_INVALID");
  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new Error("RUNTIME_CATCH_UP_INVALID");
  }

  const scheduler = options.scheduler ?? browserScheduler;
  let state: RuntimeSnapshot["state"] = "idle";
  let pauseReason: PauseReason | null = null;
  let tier: PerformanceTier = "high";
  let handle: number | null = null;
  let previous: number | null = null;
  let accumulator = 0;
  let fixedUpdates = 0;
  let renderedFrames = 0;
  let droppedFrameDebtMs = 0;

  const schedule = () => {
    handle = scheduler.request(frame);
  };

  const frame: FrameRequestCallback = (now) => {
    if (state !== "running") return;
    const delta = previous === null ? 0 : Math.max(0, now - previous);
    previous = now;
    accumulator += delta;
    let steps = 0;
    while (accumulator >= stepMs && steps < maxSteps) {
      options.onFixedUpdate(stepMs / 1000);
      accumulator -= stepMs;
      fixedUpdates += 1;
      steps += 1;
    }
    if (accumulator >= stepMs) {
      droppedFrameDebtMs += accumulator - (accumulator % stepMs);
      accumulator %= stepMs;
    }
    options.onRender(accumulator / stepMs);
    renderedFrames += 1;
    schedule();
  };

  const cancelScheduled = () => {
    if (handle !== null) scheduler.cancel(handle);
    handle = null;
  };

  return {
    start() {
      if (state === "disposed" || state === "running") return;
      state = "running";
      pauseReason = null;
      previous = null;
      schedule();
    },
    pause(reason) {
      if (state !== "running") return;
      state = "paused";
      pauseReason = reason;
      cancelScheduled();
      options.onPauseChange?.(true, reason);
    },
    resume() {
      if (state !== "paused") return;
      state = "running";
      pauseReason = null;
      previous = null;
      options.onPauseChange?.(false, null);
      schedule();
    },
    stop() {
      if (state === "disposed") return;
      cancelScheduled();
      state = "stopped";
      pauseReason = null;
      previous = null;
      accumulator = 0;
    },
    setPerformanceTier(nextTier) {
      if (tier === nextTier) return;
      tier = nextTier;
      options.onPerformanceTierChange?.(tier);
    },
    snapshot: () => ({
      state,
      pauseReason,
      performanceTier: tier,
      fixedUpdates,
      renderedFrames,
      droppedFrameDebtMs,
    }),
    dispose() {
      cancelScheduled();
      state = "disposed";
      pauseReason = null;
    },
  };
}

export interface FrameBudgetSnapshot {
  tier: PerformanceTier;
  p95Ms: number;
  samples: number;
  consecutiveSlowWindows: number;
  profile: PerformanceProfile;
}

export interface FrameBudgetMonitor {
  record(frameMs: number): void;
  snapshot(): FrameBudgetSnapshot;
}

export function createFrameBudgetMonitor(options: {
  initialTier: PerformanceTier;
  sampleSize?: number;
  slowWindowsBeforeDowngrade?: number;
  onTierChange(tier: PerformanceTier): void;
}): FrameBudgetMonitor {
  let tier = options.initialTier;
  let samples: number[] = [];
  let p95Ms = 0;
  let slowWindows = 0;
  const sampleSize = options.sampleSize ?? 300;
  const requiredSlowWindows = options.slowWindowsBeforeDowngrade ?? 3;
  if (!Number.isInteger(sampleSize) || sampleSize < 1) {
    throw new Error("FRAME_MONITOR_SAMPLE_SIZE_INVALID");
  }
  if (
    !Number.isInteger(requiredSlowWindows) ||
    requiredSlowWindows < 1
  ) {
    throw new Error("FRAME_MONITOR_WINDOW_COUNT_INVALID");
  }

  const downgrade = () => {
    const next =
      tier === "high" ? "balanced" : tier === "balanced" ? "low" : "low";
    if (next !== tier) {
      tier = next;
      options.onTierChange(tier);
    }
  };

  return {
    record(frameMs) {
      if (!Number.isFinite(frameMs) || frameMs < 0) return;
      samples.push(frameMs);
      if (samples.length < sampleSize) return;
      const ordered = [...samples].sort((a, b) => a - b);
      p95Ms = ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0;
      const limit = tier === "low" ? 33 : 20;
      slowWindows = p95Ms > limit ? slowWindows + 1 : 0;
      samples = [];
      if (slowWindows >= requiredSlowWindows) {
        slowWindows = 0;
        downgrade();
      }
    },
    snapshot() {
      return {
        tier,
        p95Ms,
        samples: samples.length,
        consecutiveSlowWindows: slowWindows,
        profile: PERFORMANCE_PROFILES[tier],
      };
    },
  };
}

export interface RuntimeLifecycleBinding {
  dispose(): void;
}

export function bindRuntimeLifecycle(
  runtime: Pick<GameRuntime, "pause" | "resume">,
  environment: {
    document: Pick<
      Document,
      "hidden" | "addEventListener" | "removeEventListener"
    >;
    window: Pick<Window, "addEventListener" | "removeEventListener">;
  } = { document, window },
): RuntimeLifecycleBinding {
  const onVisibility = () => {
    if (environment.document.hidden) runtime.pause("visibility");
  };
  const onPageHide = () => runtime.pause("pagehide");
  environment.document.addEventListener("visibilitychange", onVisibility);
  environment.window.addEventListener("pagehide", onPageHide);
  return {
    dispose() {
      environment.document.removeEventListener(
        "visibilitychange",
        onVisibility,
      );
      environment.window.removeEventListener("pagehide", onPageHide);
    },
  };
}

export interface WebGLRecoveryBinding {
  dispose(): void;
}

export function bindWebGLRecovery(
  canvas: HTMLCanvasElement,
  callbacks: {
    onLost(): void;
    onRestored(): void | Promise<void>;
    onFatal?(error: unknown): void;
  },
): WebGLRecoveryBinding {
  const lost = (event: Event) => {
    event.preventDefault();
    callbacks.onLost();
  };
  const restored = () => {
    Promise.resolve(callbacks.onRestored()).catch((error: unknown) => {
      callbacks.onFatal?.(error);
    });
  };
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return {
    dispose() {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    },
  };
}
