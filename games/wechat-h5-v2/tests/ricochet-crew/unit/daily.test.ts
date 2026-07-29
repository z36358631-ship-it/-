import { describe, expect, it } from "vitest";
import {
  dailySeed,
  recentShanghaiDays,
  shanghaiDateKey,
} from "../../../apps/ricochet-crew/src/run/daily";

describe("每日遗迹", () => {
  it("按上海时区切换日期", () => {
    expect(shanghaiDateKey(new Date("2026-07-28T15:59:59Z"))).toBe(
      "2026-07-28",
    );
    expect(shanghaiDateKey(new Date("2026-07-28T16:00:00Z"))).toBe(
      "2026-07-29",
    );
  });

  it("提供最近七天且同日种子固定", () => {
    const days = recentShanghaiDays(new Date("2026-07-29T08:00:00Z"));
    expect(days).toHaveLength(7);
    expect(days[0]?.key).toBe("2026-07-29");
    expect(days[6]?.key).toBe("2026-07-23");
    expect(dailySeed(days[0]!.key)).toBe(dailySeed("2026-07-29"));
    expect(dailySeed(days[0]!.key)).not.toBe(dailySeed(days[1]!.key));
  });
});
