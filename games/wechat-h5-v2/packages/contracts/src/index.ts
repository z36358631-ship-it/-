export const GAME_IDS = [
  "hub",
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const;

export type GameId = (typeof GAME_IDS)[number];
export type PlayableGameId = Exclude<GameId, "hub">;
export type PerformanceTier = "high" | "balanced" | "low";
export type PauseReason =
  | "user"
  | "visibility"
  | "pagehide"
  | "orientation"
  | "asset-error"
  | "context-lost";

export interface PerformanceProfile {
  dprCap: number;
  targetFps: 30 | 60;
  particleScale: number;
  postEffects: boolean;
}

export const PERFORMANCE_PROFILES: Record<
  PerformanceTier,
  PerformanceProfile
> = {
  high: {
    dprCap: 2,
    targetFps: 60,
    particleScale: 1,
    postEffects: true,
  },
  balanced: {
    dprCap: 1.5,
    targetFps: 60,
    particleScale: 0.75,
    postEffects: false,
  },
  low: {
    dprCap: 1,
    targetFps: 30,
    particleScale: 0.5,
    postEffects: false,
  },
};

export const GAME_EVENT_NAMES = [
  "game_boot",
  "game_ready",
  "run_start",
  "first_input",
  "first_payoff",
  "choice_presented",
  "choice_selected",
  "strategy_changed",
  "run_end",
  "replay_start",
  "daily_start",
  "daily_end",
  "lifecycle_pause",
  "lifecycle_resume",
  "performance_tier_changed",
  "asset_error",
  "save_recovered",
] as const;

export type GameEventName = (typeof GAME_EVENT_NAMES)[number];

export interface GameEvent {
  eventId: string;
  sessionId: string;
  runId: string | null;
  gameId: GameId;
  event: GameEventName;
  seq: number;
  clientAt: number;
  schemaVersion: 1;
  testMode: boolean;
  payload: Record<string, unknown>;
}

export interface GameSaveEnvelope<T> {
  schemaVersion: number;
  gameId: GameId;
  updatedAt: number;
  checksum: string;
  payload: T;
}

export type RuntimeAssetType =
  | "texture"
  | "atlas"
  | "audio"
  | "font"
  | "json";

export interface AssetEntry {
  id: string;
  groupId: string;
  type: RuntimeAssetType;
  url: string;
  bytes: number;
  sha256: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface AssetGroup {
  id: string;
  required: boolean;
  assets: AssetEntry[];
}

export interface AssetManifest {
  schemaVersion: 1;
  gameId: GameId;
  revision: string;
  groups: AssetGroup[];
}
