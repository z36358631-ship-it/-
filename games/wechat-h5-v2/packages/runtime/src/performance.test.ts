import { describe, expect, it, vi } from "vitest";
import { createFrameBudgetMonitor } from "./index";

describe("createFrameBudgetMonitor", () => {
  it("downgrades after three slow p95 windows", () => {
    const changed = vi.fn();
    const monitor = createFrameBudgetMonitor({
      initialTier: "high",
      sampleSize: 5,
      slowWindowsBeforeDowngrade: 3,
      onTierChange: changed,
    });
    for (let window = 0; window < 3; window += 1) {
      [21, 22, 23, 24, 25].forEach((ms) => monitor.record(ms));
    }
    expect(monitor.snapshot().tier).toBe("balanced");
    expect(changed).toHaveBeenCalledWith("balanced");
  });

  it("does not downgrade a healthy frame window", () => {
    const changed = vi.fn();
    const monitor = createFrameBudgetMonitor({
      initialTier: "high",
      sampleSize: 5,
      slowWindowsBeforeDowngrade: 1,
      onTierChange: changed,
    });
    [15, 16, 17, 18, 19].forEach((ms) => monitor.record(ms));
    expect(monitor.snapshot().tier).toBe("high");
    expect(changed).not.toHaveBeenCalled();
  });
});
