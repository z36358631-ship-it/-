import { describe, expect, it } from "vitest";
import {
  dailyKeyAt,
  listPlayableDailyKeys,
  ordinaryFallbackSeed,
  resolveChallengeSeed,
  resolveDailySeed,
} from "../../../apps/monster-night-market/src/meta/daily-challenge";

describe("daily challenge", () => {
  it("按 Asia/Shanghai 的自然日生成固定种子", () => {
    const beforeMidnight = new Date(
      "2026-07-29T15:59:59.000Z",
    );
    const afterMidnight = new Date(
      "2026-07-29T16:00:01.000Z",
    );

    expect(dailyKeyAt(beforeMidnight)).toBe("2026-07-29");
    expect(dailyKeyAt(afterMidnight)).toBe("2026-07-30");
    expect(resolveDailySeed("2026-07-30")).toBe(
      "monster-night-market:daily:v1:2026-07-30",
    );
  });

  it("当天加最近六天共七个日期均可补玩", () => {
    expect(
      listPlayableDailyKeys(
        new Date("2026-07-29T08:00:00.000Z"),
      ),
    ).toEqual([
      "2026-07-29",
      "2026-07-28",
      "2026-07-27",
      "2026-07-26",
      "2026-07-25",
      "2026-07-24",
      "2026-07-23",
    ]);
  });

  it("非法日期不会破坏进度，而是回退普通挑战", () => {
    expect(resolveChallengeSeed("2026-02-31", "session-a")).toEqual({
      mode: "ordinary",
      seed: ordinaryFallbackSeed("session-a"),
      reason: "invalid-daily-key",
    });
    expect(() => resolveDailySeed("29/07/2026")).toThrow(
      "Invalid daily key",
    );
  });

  it("同一日期键不会混入本地时刻或游玩次数", () => {
    const seeds = Array.from({ length: 3 }, () =>
      resolveDailySeed("2026-07-29"),
    );
    expect(new Set(seeds)).toEqual(
      new Set([
        "monster-night-market:daily:v1:2026-07-29",
      ]),
    );
  });
});
