const DAILY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function assertDailyKey(key: string): void {
  if (!DAILY_KEY.test(key)) {
    throw new Error("Invalid daily key");
  }

  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  const candidate = new Date(
    Date.UTC(year, month - 1, day),
  );
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("Invalid daily key");
  }
}

export function dailyKeyAt(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Invalid current date");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (
    type: Intl.DateTimeFormatPartTypes,
  ): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

function keyToUtcDate(key: string): Date {
  assertDailyKey(key);
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

export function listPlayableDailyKeys(
  now: Date,
): string[] {
  const current = keyToUtcDate(dailyKeyAt(now));
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(current);
    date.setUTCDate(current.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  });
}

export function resolveDailySeed(key: string): string {
  assertDailyKey(key);
  return `monster-night-market:daily:v1:${key}`;
}

export function ordinaryFallbackSeed(
  sessionId: string,
): string {
  return `monster-night-market:ordinary:v1:${sessionId}`;
}

export type ChallengeSeedResolution =
  | {
      readonly mode: "daily";
      readonly seed: string;
      readonly key: string;
    }
  | {
      readonly mode: "ordinary";
      readonly seed: string;
      readonly reason: "invalid-daily-key";
    };

export function resolveChallengeSeed(
  requestedDailyKey: string,
  sessionId: string,
): ChallengeSeedResolution {
  try {
    return {
      mode: "daily",
      seed: resolveDailySeed(requestedDailyKey),
      key: requestedDailyKey,
    };
  } catch {
    return {
      mode: "ordinary",
      seed: ordinaryFallbackSeed(sessionId),
      reason: "invalid-daily-key",
    };
  }
}
