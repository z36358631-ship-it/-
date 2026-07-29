import { describe, expect, it, vi } from "vitest";
import { installRicochetReadOnlyHook } from "../../../apps/ricochet-crew/src/testing/read-only-hook";

describe("弹珠测试门禁", () => {
  it("只注册冻结快照", () => {
    const register = vi.fn(() => vi.fn());
    installRicochetReadOnlyHook(
      { register } as never,
      { snapshot: () => ({ mode: "aiming" }) },
    );
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(
      "ricochet.snapshot",
      expect.any(Function),
    );
  });
});
