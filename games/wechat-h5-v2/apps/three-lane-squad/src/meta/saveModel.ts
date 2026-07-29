import type { FormationTag, RunVariant } from "../domain/types";

export interface RunRecord {
  runId: string;
  result: "won" | "lost";
  formationTag: FormationTag;
  variant: RunVariant;
  elapsedMs: number;
  date: string;
}

export interface ThreeLaneSave {
  schemaVersion: 1;
  commanderLevel: number;
  unlockedDoctrineIds: Array<"opening-scout" | "rapid-relay" | "reserve-slot">;
  unlockedBannerIds: Array<"default" | "iron-wall" | "storm-line">;
  runHistory: RunRecord[];
  completedDailyDates: string[];
  settings: { muted: boolean; reducedMotion: boolean };
}

export function createDefaultSave(): ThreeLaneSave {
  return {
    schemaVersion: 1,
    commanderLevel: 1,
    unlockedDoctrineIds: ["opening-scout"],
    unlockedBannerIds: ["default"],
    runHistory: [],
    completedDailyDates: [],
    settings: { muted: false, reducedMotion: false },
  };
}

export function recordRun(save: ThreeLaneSave, record: RunRecord): ThreeLaneSave {
  const runHistory = [...save.runHistory.filter(({ runId }) => runId !== record.runId), record].slice(-30);
  const doctrines = new Set(save.unlockedDoctrineIds);
  const banners = new Set(save.unlockedBannerIds);
  if (runHistory.length >= 1) doctrines.add("rapid-relay");
  if (runHistory.some(({ formationTag }) => formationTag === "balanced")) {
    doctrines.add("reserve-slot");
  }
  if (runHistory.some(({ formationTag }) => formationTag === "balanced")) banners.add("iron-wall");
  if (runHistory.some(({ formationTag }) => formationTag === "focus-kill")) banners.add("storm-line");
  return {
    ...save,
    commanderLevel: Math.min(10, 1 + runHistory.length),
    unlockedDoctrineIds: [...doctrines],
    unlockedBannerIds: [...banners],
    runHistory,
    completedDailyDates:
      record.result === "won"
        ? [...new Set([...save.completedDailyDates, record.date])].slice(-7)
        : [...save.completedDailyDates],
  };
}
