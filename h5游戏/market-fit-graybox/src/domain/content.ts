import type {
  CombatPhase,
  EnemyKind,
  GameContent,
  GuardKind,
  LaneId,
  PuzzleTag,
  SpawnDefinition,
  WaveDefinition,
} from './types';

export const STEP_MS = 250 as const;
export const LANE_IDS: readonly LaneId[] = [0, 1, 2, 3, 4, 5];
export const GUARD_KINDS: readonly GuardKind[] = ['heavy', 'rapid', 'sweep'];
export const ENEMY_KINDS: readonly EnemyKind[] = ['swarm', 'speed', 'armor'];

export const DEFAULT_PHASE_DURATIONS = {
  demo: 18_000,
  prep: 6_000,
  combatA: 18_000,
  rescue: 4_000,
  combatB: 18_000,
} as const;

export const DEFAULT_GUARD_SPECS: GameContent['guardSpecs'] = {
  heavy: {
    kind: 'heavy',
    damage: 4,
    attackIntervalMs: 3_000,
    attackMode: 'single',
    preferredEnemy: 'armor',
  },
  rapid: {
    kind: 'rapid',
    damage: 1,
    attackIntervalMs: 1_000,
    attackMode: 'single',
    preferredEnemy: 'speed',
  },
  sweep: {
    kind: 'sweep',
    damage: 1,
    attackIntervalMs: 3_000,
    attackMode: 'lane',
    preferredEnemy: 'swarm',
  },
};

export const DEFAULT_ENEMY_SPECS: GameContent['enemySpecs'] = {
  swarm: { kind: 'swarm', maxHp: 1, moveIntervalMs: 2_000, coreDamage: 1 },
  speed: { kind: 'speed', maxHp: 2, moveIntervalMs: 1_000, coreDamage: 1 },
  armor: { kind: 'armor', maxHp: 7, moveIntervalMs: 3_000, coreDamage: 2 },
};

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.trunc(seed) >>> 0;
}

function laneAt(index: number, rotation: number): LaneId {
  return ((index + rotation) % 6) as LaneId;
}

function spawn(
  wave: number,
  phase: CombatPhase,
  index: number,
  atMs: number,
  lane: LaneId,
  kind: EnemyKind,
): SpawnDefinition {
  return {
    spawnId: `w${wave}-${phase}-${index}`,
    phase,
    atMs,
    lane,
    kind,
  };
}

function genericWave(wave: number, rotation: number): WaveDefinition {
  const primary = ENEMY_KINDS[(wave - 2) % ENEMY_KINDS.length];
  const secondary = ENEMY_KINDS[(wave - 1) % ENEMY_KINDS.length];
  const firstLane = laneAt(wave, rotation);
  const secondLane = laneAt(wave + 2, rotation);
  const thirdLane = laneAt(wave + 4, rotation);
  const spawns: SpawnDefinition[] = [
    spawn(wave, 'combatA', 0, 0, firstLane, primary),
    spawn(wave, 'combatA', 1, 2_500, secondLane, secondary),
    spawn(wave, 'combatA', 2, 5_000, firstLane, primary),
    spawn(wave, 'combatB', 3, 0, thirdLane, secondary),
    spawn(wave, 'combatB', 4, 2_750, firstLane, primary),
  ];

  if (wave >= 6) {
    spawns.push(spawn(wave, 'combatA', 6, 7_500, thirdLane, primary));
  }
  if (wave >= 9) {
    spawns.push(spawn(wave, 'combatB', 7, 8_000, secondLane, secondary));
  }

  return { wave, puzzleTags: [], spawns };
}

function appendPuzzle(
  definition: WaveDefinition,
  tag: PuzzleTag,
  rotation: number,
): WaveDefinition {
  const spawns = [...definition.spawns];
  const baseIndex =
    spawns.reduce((highest, candidate) => {
      const suffix = Number(candidate.spawnId.match(/-(\d+)$/)?.[1] ?? -1);
      return Math.max(highest, suffix);
    }, -1) + 1;

  if (tag === 'R1') {
    const lane = laneAt(1, rotation);
    for (let index = 0; index < 5; index += 1) {
      spawns.push(spawn(definition.wave, 'combatB', baseIndex + index, index * 1_250, lane, 'swarm'));
    }
  }

  if (tag === 'R2') {
    spawns.push(
      spawn(definition.wave, 'combatB', baseIndex, 0, laneAt(2, rotation), 'armor'),
      spawn(definition.wave, 'combatB', baseIndex + 1, 750, laneAt(5, rotation), 'armor'),
    );
  }

  if (tag === 'R3') {
    spawns.push(
      spawn(definition.wave, 'combatB', baseIndex, 0, laneAt(0, rotation), 'speed'),
      spawn(definition.wave, 'combatB', baseIndex + 1, 1_000, laneAt(0, rotation), 'speed'),
      spawn(definition.wave, 'combatB', baseIndex + 2, 0, laneAt(3, rotation), 'swarm'),
    );
  }

  return { ...definition, puzzleTags: [tag], spawns };
}

export function buildRunContent(seed: number): GameContent {
  const normalizedSeed = normalizeSeed(seed);
  const rotation = normalizedSeed % 6;
  const waves: WaveDefinition[] = [
    {
      wave: 1,
      puzzleTags: [],
      spawns: [
        spawn(1, 'demo', 0, 0, laneAt(0, rotation), 'swarm'),
        spawn(1, 'demo', 1, 4_000, laneAt(2, rotation), 'speed'),
        spawn(1, 'demo', 2, 8_000, laneAt(4, rotation), 'armor'),
      ],
    },
  ];

  for (let wave = 2; wave <= 12; wave += 1) {
    let definition = genericWave(wave, rotation);
    if (wave === 4) definition = appendPuzzle(definition, 'R1', rotation);
    if (wave === 7) definition = appendPuzzle(definition, 'R2', rotation);
    if (wave === 10) definition = appendPuzzle(definition, 'R3', rotation);
    waves.push(definition);
  }

  return {
    version: 1,
    seed: normalizedSeed,
    initialCoreIntegrity: 27,
    laneLength: 6,
    phaseDurations: { ...DEFAULT_PHASE_DURATIONS },
    guardSpecs: {
      heavy: { ...DEFAULT_GUARD_SPECS.heavy },
      rapid: { ...DEFAULT_GUARD_SPECS.rapid },
      sweep: { ...DEFAULT_GUARD_SPECS.sweep },
    },
    enemySpecs: {
      swarm: { ...DEFAULT_ENEMY_SPECS.swarm },
      speed: { ...DEFAULT_ENEMY_SPECS.speed },
      armor: { ...DEFAULT_ENEMY_SPECS.armor },
    },
    waves,
  };
}
