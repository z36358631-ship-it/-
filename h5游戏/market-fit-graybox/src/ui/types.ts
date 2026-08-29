export type LaneId = 0 | 1 | 2 | 3 | 4 | 5;

export type GuardKind = 'heavy' | 'rapid' | 'sweep';

export type EnemyKind = 'swarm' | 'speed' | 'armor';

export type Phase =
  | 'demo'
  | 'prep'
  | 'combatA'
  | 'rescue'
  | 'combatB'
  | 'won'
  | 'lost';

export interface GuardViewState {
  id: GuardKind;
  kind: GuardKind;
  lane: LaneId;
  cooldownRemainingMs?: number;
}

export interface EnemyViewState {
  id: string;
  kind: EnemyKind;
  lane: LaneId;
  hp: number;
  maxHp: number;
  /** laneLength is the entrance; 0 is the central core. */
  distance: number;
}

export interface LanePreviewViewState {
  lane: LaneId;
  counts: Record<EnemyKind, number>;
  nextSpawnInMs: number | null;
}

export interface GameScreenState {
  seed: number;
  wave: number;
  phase: Phase;
  phaseElapsedMs: number;
  coreIntegrity: number;
  maxCoreIntegrity: number;
  guards: Record<GuardKind, GuardViewState>;
  enemies: EnemyViewState[];
  previews: LanePreviewViewState[];
  selectedGuard: GuardKind | null;
  paused: boolean;
}

export type ThreatLevel = 'calm' | 'watch' | 'danger';

export interface LaneSignalView {
  lane: LaneId;
  threatLevel: ThreatLevel;
  threatLabel: string;
  nextArrivalMs: number | null;
}

export interface ResultView {
  status: 'won' | 'lost';
  cause: string;
  actionHint?: string;
  replaySummary?: string;
}

export interface SelectorView {
  phaseLabel: string;
  phaseTimeRemainingMs?: number | null;
  laneLength: number;
  legalDestinationLanes: LaneId[];
  lanes: LaneSignalView[];
  result?: ResultView;
}

export type FeedbackKind =
  | 'guardMove'
  | 'hit'
  | 'defeat'
  | 'warning'
  | 'coreImpact';

export interface FeedbackEventView {
  sequence: number;
  kind: FeedbackKind;
  lane?: LaneId;
  guardId?: GuardKind;
  enemyId?: string;
}

export const LANE_IDS: LaneId[] = [0, 1, 2, 3, 4, 5];

export const LANE_NAMES: Record<LaneId, string> = {
  0: '北线',
  1: '东北线',
  2: '东南线',
  3: '南线',
  4: '西南线',
  5: '西北线',
};

export const GUARD_NAMES: Record<GuardKind, string> = {
  heavy: '重击',
  rapid: '连击',
  sweep: '横扫',
};

export const ENEMY_NAMES: Record<EnemyKind, string> = {
  swarm: '群敌',
  speed: '速敌',
  armor: '甲敌',
};
