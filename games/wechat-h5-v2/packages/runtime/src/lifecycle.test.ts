import { describe, expect, it, vi } from "vitest";
import {
  bindRuntimeLifecycle,
  bindWebGLRecovery,
} from "./index";

describe("runtime browser guards", () => {
  it("pauses on visibility and never resumes automatically", () => {
    const runtime = {
      pause: vi.fn(),
      resume: vi.fn(),
    };
    const documentListeners = new Map<string, EventListener>();
    const windowListeners = new Map<string, EventListener>();
    const binding = bindRuntimeLifecycle(runtime, {
      document: {
        hidden: true,
        addEventListener: (name: string, listener: EventListener) =>
          documentListeners.set(name, listener),
        removeEventListener: vi.fn(),
      },
      window: {
        addEventListener: (name: string, listener: EventListener) =>
          windowListeners.set(name, listener),
        removeEventListener: vi.fn(),
      },
    });
    documentListeners.get("visibilitychange")?.(
      new Event("visibilitychange"),
    );
    expect(runtime.pause).toHaveBeenCalledWith("visibility");
    expect(runtime.resume).not.toHaveBeenCalled();
    binding.dispose();
  });

  it("pauses immediately when the WebGL context is lost", () => {
    const listeners = new Map<string, EventListener>();
    const canvas = {
      addEventListener: (name: string, listener: EventListener) =>
        listeners.set(name, listener),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;
    const onLost = vi.fn();
    const binding = bindWebGLRecovery(canvas, {
      onLost,
      onRestored: vi.fn(),
    });
    const event = new Event("webglcontextlost", {
      cancelable: true,
    });
    listeners.get("webglcontextlost")?.(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledOnce();
    binding.dispose();
  });
});
