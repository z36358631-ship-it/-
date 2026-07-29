import { variantForSeed } from "../domain/createBattle";

const UTC_DAY_MS = 86_400_000;

const parseDate = (date: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("INVALID_ISO_DATE");
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value)) throw new Error("INVALID_ISO_DATE");
  return value;
};

export const seedForDate = (date: string): number => {
  parseDate(date);
  let hash = 2_166_136_261;
  for (const character of date) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

export function dailyChallengeForDate(date: string) {
  const seed = seedForDate(date);
  return { date, seed, variant: variantForSeed(seed) };
}

export function recentDailyDates(today: string): string[] {
  const start = parseDate(today);
  return Array.from({ length: 7 }, (_, index) =>
    new Date(start - index * UTC_DAY_MS).toISOString().slice(0, 10),
  );
}
