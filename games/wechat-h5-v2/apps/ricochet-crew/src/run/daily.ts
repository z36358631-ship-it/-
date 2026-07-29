export interface DailyRunOption {
  readonly key: string;
  readonly weekday: string;
  readonly day: string;
  readonly today: boolean;
}

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1_000;

export function shanghaiDateKey(now = new Date()): string {
  return new Date(now.getTime() + SHANGHAI_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function dailySeed(dateKey: string): number {
  let value = 2166136261;
  for (const character of `ricochet:${dateKey}`) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function recentShanghaiDays(
  now = new Date(),
): readonly DailyRunOption[] {
  const todayKey = shanghaiDateKey(now);
  const [year, month, day] = todayKey.split("-").map(Number);
  const todayUtc = Date.UTC(year!, month! - 1, day!);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayUtc - index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      weekday: index === 0
        ? "今日"
        : new Intl.DateTimeFormat("zh-CN", {
            weekday: "short",
            timeZone: "UTC",
          }).format(date),
      day: String(date.getUTCDate()).padStart(2, "0"),
      today: index === 0,
    };
  });
}
