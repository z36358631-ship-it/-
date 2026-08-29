export type LaneId = 0 | 1 | 2 | 3 | 4 | 5;
export type GuardKind = 'heavy' | 'rapid' | 'sweep';
export type EnemyKind = 'swarm' | 'speed' | 'armor';
export type Phase = 'demo' | 'prep' | 'combatA' | 'rescue' | 'combatB' | 'won' | 'lost';
export type CombatPhase = 'demo' | 'combatA' | 'combatB';
export type PuzzleTag = 'R1' | 'R2' | 'R3';

export type GameAction =
  | { type: 'selectGuard'; guardId: GuardKind; seq: number }
  | { type: 'moveSelectedGuard'; lane: LaneId; seq: number }
  | { type: 'advance'; ms: 250 }
  | { type: 'togglePause' }
  | { type: 'restart'; seed: number };

export interface GuardSpec {
  kind: GuardKind;
  damage: number;
  attackIntervalMs: number;
  attackMode: 'single' | 'lane';
  preferredEnemy: EnemyKind;
}

export interface EnemySpec {
  kind: EnemyKind;
  maxHp: number;
  moveIntervalMs: number;
  coreDamage: number;
}

export interface SpawnDefinition {
  spawnId: string;
  phase: CombatPhase;
  atMs: number;
  lane: LaneId;
  kind: EnemyKind;
}

export interface WaveDefinition {
  wave: number;
  puzzleTags: PuzzleTag[];
  spawns: SpawnDefinition[];
}

export interface PhaseDurations {
  demo: number;
  prep: number;
  combatA: number;
  rescue: number;
  combatB: number;
}

export interface GameContent {
  version: 1;
  seed: number;
  initialCoreIntegrity: number;
  laneLength: number;
  phaseDurations: PhaseDurations;
  guardSpecs: Record<GuardKind, GuardSpec>;
  enemySpecs: Record<EnemyKind, EnemySpec>;
  waves: WaveDefinition[];
}

export interface GuardState {
  id: GuardKind;
  kind: GuardKind;
  lane: LaneId;
  cooldownRemainingMs: number;
}

export interface EnemyState {
  id: string;
  sourceSpawnId: string;
  kind: EnemyKind;
  lane: LaneId;
  hp: number;
  maxHp: number;
  distance: number;
  moveAccumulatorMs: number;
  spawnOrder: number;
  spawnedAtMs: number;
}

export interface EnemyCounts {
  swarm: number;
  speed: number;
  armor: number;
}

export interface LanePreview {
  lane: LaneId;
  counts: EnemyCounts;
  nextSpawnInMs: number | null;
}

export type DomainEventType =
  | 'phaseChanged'
  | 'guardSelected'
  | 'guardMoved'
  | 'actionRejected'
  | 'enemySpawned'
  | 'enemyMoved'
  | 'guardAttacked'
  | 'enemyDefeated'
  | 'coreDamaged'
  | 'result';

export interface DomainEvent {
  id: number;
  type: DomainEventType;
  atMs: number;
  wave: number;
  phase: Phase;
  lane?: LaneId;
  guardId?: GuardKind;
  enemyId?: string;
  enemyKind?: EnemyKind;
  sourceSpawnId?: string;
  amount?: number;
  fromLane?: LaneId;
  toLane?: LaneId;
  reason?: string;
}

export interface MoveRecord {
  wave: number;
  phase: 'prep' | 'rescue';
  guardId: GuardKind;
  fromLane: LaneId;
  toLane: LaneId;
  atMs: number;
}

export interface FinalCause {
  code: 'core_breached' | 'survived';
  lane: LaneId | null;
  enemyKind: EnemyKind | null;
  amount: number;
  summary: string;
  recommendation: string;
}

export interface GameState {
  seed: number;
  wave: number;
  phase: Phase;
  phaseElapsedMs: number;
  activeClockMs: number;
  coreIntegrity: number;
  maxCoreIntegrity: number;
  guards: Record<GuardKind, GuardState>;
  enemies: EnemyState[];
  previews: LanePreview[];
  selectedGuard: GuardKind | null;
  windowMoveUsed: boolean;
  paused: boolean;
  processedActionSeqs: number[];
  eventLog: DomainEvent[];
  finalCause: FinalCause | null;
  content: GameContent;
  spawnCursor: number;
  nextEnemySerial: number;
  nextEventSerial: number;
  moveHistory: MoveRecord[];
}

export interface LaneThreat {
  lane: LaneId;
  score: number;
  enemyCount: number;
  counts: EnemyCounts;
  nearestDistance: number | null;
  nextArrivalMs: number | null;
  expectedCoreDamage: number;
}

export interface GuardMatchup {
  guardId: GuardKind;
  lane: LaneId;
  score: number;
  label: '优势' | '均势' | '劣势' | '空闲';
  preferredEnemy: EnemyKind;
}
