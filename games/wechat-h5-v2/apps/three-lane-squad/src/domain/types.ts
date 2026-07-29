export type LaneId = 0 | 1 | 2;
export type ColumnId = 0 | 1 | 2 | 3;
export type HeroId = "guardian" | "ranger" | "mage" | "engineer" | "priest";
export type EnemyId = "grunt" | "runner" | "armored" | "caster" | "elite" | "boss";
export type HeroRole = "block" | "speed-counter" | "armor-break" | "zone-control" | "support";
export type RunVariant = "balanced-front" | "lockdown" | "elite-rush";
export type FormationTag = "balanced" | "mobile-reserve" | "focus-kill" | "unclassified";
export type BattleMode = "preparing" | "playing" | "paused" | "won" | "lost";

export interface GridPosition {
  lane: LaneId;
  column: ColumnId;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  role: HeroRole;
  cost: number;
  attack: number;
  attackIntervalMs: number;
  rangeColumns: number;
  blockCapacity: number;
  evolvedRule:
    | "wall-aura"
    | "lane-pierce"
    | "cross-lane-chain"
    | "portable-turret"
    | "overflow-shield";
  color: string;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  health: number;
  speedColumnsPerSecond: number;
  armor: number;
  threat: number;
  reward: number;
  color: string;
}

export interface HeroInstance {
  instanceId: string;
  heroId: HeroId;
  deployedAtMs: number;
  tier: 1 | 2;
  position: GridPosition;
  status: "ready" | "moving" | "defeated";
  moveStartedAtMs: number | null;
  moveEndsAtMs: number | null;
  transferReadyAtMs: number;
  nextAttackAtMs: number;
}

export interface EnemyInstance {
  instanceId: string;
  enemyId: EnemyId;
  lane: LaneId;
  progress: number;
  health: number;
  maxHealth: number;
  armor: number;
  status: "advancing" | "blocked" | "casting" | "defeated";
}

export interface DomainEvent {
  seq: number;
  atMs: number;
  type:
    | "deploy"
    | "undo_deploy"
    | "evolve"
    | "transfer"
    | "focus_fire"
    | "enemy_spawned"
    | "enemy_defeated"
    | "lane_locked"
    | "lane_breached"
    | "boss_charge"
    | "boss_interrupt"
    | "run_won"
    | "run_lost";
  payload: Record<string, unknown>;
}

export interface BossState {
  phase: "absent" | "advance" | "switch-lane" | "charge" | "recover" | "defeated";
  instanceId: string | null;
  lane: LaneId;
  health: number;
  maxHealth: number;
  phaseEndsAtMs: number;
  chargeEndsAtMs: number | null;
  chargeDamage: number;
  interrupted: boolean;
}

export interface BattleState {
  seed: number;
  runId: string;
  runOrdinal: number;
  squad: HeroId[];
  variant: RunVariant;
  mode: BattleMode;
  elapsedMs: number;
  tickRemainderMs: number;
  energy: number;
  baseHealth: number;
  baseMaxHealth: number;
  grid: Array<{ position: GridPosition; heroInstanceId: string | null }>;
  heroes: HeroInstance[];
  enemies: EnemyInstance[];
  focusFire: { targetId: string | null; readyAtMs: number; expiresAtMs: number };
  laneLock: { lane: LaneId; startsAtMs: number; endsAtMs: number } | null;
  boss: BossState;
  waveSpawnCursor: number;
  appliedLaneLockCount: number;
  events: DomainEvent[];
  nextEntitySeq: number;
  nextEventSeq: number;
  lastMeaningfulActionAtMs: number;
  meaningfulActionCount: number;
  longestDecisionGapMs: number;
  formationTag: FormationTag;
  failureLane: LaneId | null;
}
