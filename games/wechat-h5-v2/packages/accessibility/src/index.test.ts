import { describe, expect, it, vi } from "vitest";
import { createAccessibilityController } from "./index";

describe("accessibility controller", () => {
  it("starts from system reduced motion and announces state", async () => {
    const root = { dataset: {} } as unknown as HTMLElement;
    const liveRegion = {
      textContent: "",
      setAttribute: vi.fn(),
    } as unknown as HTMLElement;
    const controller = createAccessibilityController({
      root,
      liveRegion,
      matchReducedMotion: () => true,
    });
    expect(controller.snapshot().reducedMotion).toBe(true);
    expect(root.dataset.reducedMotion).toBe("true");
    controller.announce("Boss 正在蓄力", "assertive");
    await Promise.resolve();
    expect(liveRegion.textContent).toBe("Boss 正在蓄力");
    expect(liveRegion.setAttribute).toHaveBeenCalledWith(
      "aria-live",
      "assertive",
    );
  });

  it("notifies listeners after a user setting change", () => {
    const controller = createAccessibilityController({
      root: { dataset: {} } as unknown as HTMLElement,
      liveRegion: {
        textContent: "",
        setAttribute: vi.fn(),
      } as unknown as HTMLElement,
      matchReducedMotion: () => false,
    });
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setReducedMotion(true);
    expect(listener).toHaveBeenCalledWith({ reducedMotion: true });
  });
});
