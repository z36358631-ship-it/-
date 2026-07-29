import { describe, expect, it, vi } from "vitest";
import { createGameRuntime } from "./index";

describe("createGameRuntime", () => {
  it("uses fixed updates and caps catch-up work", () => {
    let frame: FrameRequestCallback | undefined;
    const update = vi.fn();
    const render = vi.fn();
    const runtime = createGameRuntime({
      fixedStepMs: 1000 / 60,
      maxCatchUpSteps: 5,
      onFixedUpdate: update,
      onRender: render,
      scheduler: {
        request: (callback) => {
          frame = callback;
          return 1;
        },
        cancel: vi.fn(),
      },
    });
    runtime.start();
    frame?.(0);
    frame?.(250);
    expect(update).toHaveBeenCalledTimes(5);
    expect(render).toHaveBeenCalledTimes(2);
    expect(runtime.snapshot().droppedFrameDebtMs).toBeGreaterThan(0);
  });

  it("does not advance while paused and requires explicit resume", () => {
    let frame: FrameRequestCallback | undefined;
    const update = vi.fn();
    const runtime = createGameRuntime({
      onFixedUpdate: update,
      onRender: vi.fn(),
      scheduler: {
        request: (callback) => {
          frame = callback;
          return 2;
        },
        cancel: vi.fn(),
      },
    });
    runtime.start();
    frame?.(0);
    runtime.pause("visibility");
    frame?.(1000);
    expect(update).not.toHaveBeenCalled();
    expect(runtime.snapshot().pauseReason).toBe("visibility");
    runtime.resume();
    frame?.(1016.7);
    expect(runtime.snapshot().state).toBe("running");
  });
});
