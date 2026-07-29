import { describe, expect, it, vi } from "vitest";
import { installNightMarketReadOnlyHooks } from "../../../apps/monster-night-market/src/testing/install-read-only-hooks";

describe("怪兽夜市测试快照", () => {
  it("只注册快照，不暴露强制胜负、提交或时间推进", () => {
    const register = vi.fn(() => vi.fn());
    installNightMarketReadOnlyHooks(
      { register } as never,
      {
        snapshot: vi.fn(() => ({
          seed: "42",
          moveCount: 0,
        })),
      },
    );

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(
      "nightMarket.snapshot",
      expect.any(Function),
    );
  });
});
