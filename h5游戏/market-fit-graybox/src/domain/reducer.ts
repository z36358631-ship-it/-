import { GUARD_KINDS, LANE_IDS, STEP_MS, buildRunContent } from './content';
import type {
  CombatPhase,
  DomainEvent,
  EnemyCounts,
  EnemyState,
  FinalCause,
  GameAction,
  GameContent,
  GameState,
  GuardKind,
  LaneId,
  LanePreview,
  Phase,
  SpawnDefinition,
} from './types';

const TERMINAL_PHASES: readonly Phase[] = ['won', 'lost'];
const COMMAND_PHASES: readonly Phase[] = ['prep', 'rescue'];
const MAX_EVENT_LOG_LENGTH = 2_000;

function isTerminal(phase: Phase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

function isCommandWindow(phase: Phase): phase is 'prep' | 'rescue' {
  return COMMAND_PHASES.includes(phase);
}

function combatPhaseForPreview(phase: Phase): CombatPhase | null {
  if (phase === 'demo') return 'demo';
  if (phase === 'prep' || phase === 'combatA') return 'combatA';
  if (phase === 'rescue' || phase === 'combatB') return 'combatB';
  return null;
}

function emptyCounts(): EnemyCounts {
  return { swarm: 0, speed: 0, armor: 0 };
}

function phaseSpawns(content: GameContent, wave: number, phase: CombatPhase): SpawnDefinition[] {
  const definition = content.waves.find((candidate) => candidate.wave === wave);
  return (definition?.spawns ?? [])
    .filter((candidate) => candidate.phase === phase)
    .sort((left, right) => left.atMs - right.atMs || left.spawnId.localeCompare(right.spawnId));
}

function createPreviews(
  content: GameContent,
  wave: number,
  phase: Phase,
  phaseElapsedMs: number,
): LanePreview[] {
  const previewPhase = combatPhaseForPreview(phase);
  const elapsed = phase === previewPhase ? phaseElapsedMs : 0;
  const upcoming = previewPhase
    ? phaseSpawns(content, wave, previewPhase).filter((candidate) => candidate.atMs >= elapsed)
    : [];

  return LANE_IDS.map((lane) => {
    const laneSpawns = upcoming.filter((candidate) => candidate.lane === lane);
    const counts = laneSpawns.reduce<EnemyCounts>((result, candidate) => {
      result[candidate.kind] += 1;
      return result;
    }, emptyCounts());
    const nextSpawn = laneSpawns[0];
    return {
      lane,
      counts,
      nextSpawnInMs: nextSpawn ? Math.max(0, nextSpawn.atMs - elapsed) : null,
    };
  });
}

function cloneForUpdate(state: GameState): GameState {
  return {
    ...state,
    guards: {
      heavy: { ...state.guards.heavy },
      rapid: { ...state.guards.rapid },
      sweep: { ...state.guards.sweep },
    },
    enemies: state.enemies.map((enemy) => ({ ...enemy })),
    previews: state.previews.map((preview) => ({ ...preview, counts: { ...preview.counts } })),
    processedActionSeqs: [...state.processedActionSeqs],
    eventLog: [...state.eventLog],
    moveHistory: [...state.moveHistory],
  };
}

function emit(
  state: GameState,
  event: Omit<DomainEvent, 'id' | 'atMs' | 'wave' | 'phase'>,
): void {
  state.eventLog.push({
    id: state.nextEventSerial,
    atMs: state.activeClockMs,
    wave: state.wave,
    phase: state.phase,
    ...event,
  });
  state.nextEventSerial += 1;
  if (state.eventLog.length > MAX_EVENT_LOG_LENGTH) {
    state.eventLog.splice(0, state.eventLog.length - MAX_EVENT_LOG_LENGTH);
  }
}

function transitionTo(state: GameState, phase: Phase, wave = state.wave): void {
  state.wave = wave;
  state.phase = phase;
  state.phaseElapsedMs = 0;
  state.spawnCursor = 0;
  state.selectedGuard = null;
  state.windowMoveUsed = false;
  state.previews = createPreviews(state.content, state.wave, phase, 0);
  emit(state, { type: 'phaseChanged' });
}

function deriveFailureCause(state: GameState): FinalCause {
  const totals = new Map<string, { lane: LaneId; enemyKind: EnemyState['kind']; amount: number }>();
  for (const event of state.eventLog) {
    if (event.type !== 'coreDamaged' || event.lane === undefined || !event.enemyKind) continue;
    const key = `${event.lane}:${event.enemyKind}`;
    const current = totals.get(key) ?? { lane: event.lane, enemyKind: event.enemyKind, amount: 0 };
    current.amount += event.amount ?? 0;
    totals.set(key, current);
  }
  const primary = [...totals.values()].sort(
    (left, right) => right.amount - left.amount || left.lane - right.lane || left.enemyKind.localeCompare(right.enemyKind),
  )[0] ?? { lane: 0 as LaneId, enemyKind: 'swarm' as const, amount: 0 };
  const guardName = primary.enemyKind === 'armor' ? '重击' : primary.enemyKind === 'speed' ? '连击' : '横扫';
  const enemyName = primary.enemyKind === 'armor' ? '甲敌' : primary.enemyKind === 'speed' ? '速敌' : '群敌';

  return {
    code: 'core_breached',
    lane: primary.lane,
    enemyKind: primary.enemyKind,
    amount: primary.amount,
    summary: `${primary.lane + 1}号线${enemyName}突破最多`,
    recommendation: `优先把${guardName}调往${primary.lane + 1}号线`,
  };
}

function spawnDueEnemies(state: GameState): void {
  if (state.phase !== 'demo' && state.phase !== 'combatA' && state.phase !== 'combatB') return;
  const definitions = phaseSpawns(state.content, state.wave, state.phase);
  while (
    state.spawnCursor < definitions.length &&
    definitions[state.spawnCursor].atMs <= state.phaseElapsedMs
  ) {
    const definition = definitions[state.spawnCursor];
    const spec = state.content.enemySpecs[definition.kind];
    const enemy: EnemyState = {
      id: `enemy-${state.nextEnemySerial}`,
      sourceSpawnId: definition.spawnId,
      kind: definition.kind,
      lane: definition.lane,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      distance: state.content.laneLength,
      moveAccumulatorMs: 0,
      spawnOrder: state.nextEnemySerial,
      spawnedAtMs: state.activeClockMs,
    };
    state.nextEnemySerial += 1;
    state.spawnCursor += 1;
    state.enemies.push(enemy);
    emit(state, {
      type: 'enemySpawned',
      lane: enemy.lane,
      enemyId: enemy.id,
      enemyKind: enemy.kind,
      sourceSpawnId: enemy.sourceSpawnId,
    });
  }
}

function moveEnemies(state: GameState): void {
  for (const enemy of state.enemies) {
    const interval = state.content.enemySpecs[enemy.kind].moveIntervalMs;
    enemy.moveAccumulatorMs += STEP_MS;
    while (enemy.moveAccumulatorMs >= interval && enemy.distance > 0) {
      enemy.moveAccumulatorMs -= interval;
      enemy.distance -= 1;
      emit(state, {
        type: 'enemyMoved',
        lane: enemy.lane,
        enemyId: enemy.id,
        enemyKind: enemy.kind,
        sourceSpawnId: enemy.sourceSpawnId,
      });
    }
  }
}

function nearestFirst(left: EnemyState, right: EnemyState): number {
  return left.distance - right.distance || left.spawnOrder - right.spawnOrder;
}

function attackWithGuards(state: GameState): void {
  for (const guardId of GUARD_KINDS) {
    const guard = state.guards[guardId];
    const spec = state.content.guardSpecs[guardId];
    guard.cooldownRemainingMs = Math.max(0, guard.cooldownRemainingMs - STEP_MS);
    if (guard.cooldownRemainingMs > 0) continue;

    const candidates = state.enemies
      .filter((enemy) => enemy.lane === guard.lane && enemy.hp > 0)
      .sort(nearestFirst);
    const targets = spec.attackMode === 'lane' ? candidates : candidates.slice(0, 1);
    if (targets.length === 0) continue;

    for (const target of targets) {
      const amount = Math.min(spec.damage, target.hp);
      target.hp -= spec.damage;
      emit(state, {
        type: 'guardAttacked',
        lane: target.lane,
        guardId,
        enemyId: target.id,
        enemyKind: target.kind,
        sourceSpawnId: target.sourceSpawnId,
        amount,
      });
    }
    guard.cooldownRemainingMs = spec.attackIntervalMs;
  }

  const survivors: EnemyState[] = [];
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      survivors.push(enemy);
      continue;
    }
    emit(state, {
      type: 'enemyDefeated',
      lane: enemy.lane,
      enemyId: enemy.id,
      enemyKind: enemy.kind,
      sourceSpawnId: enemy.sourceSpawnId,
    });
  }
  state.enemies = survivors;
}

function resolveCoreDamage(state: GameState): void {
  const active: EnemyState[] = [];
  for (const enemy of state.enemies) {
    if (enemy.distance > 0) {
      active.push(enemy);
      continue;
    }
    const amount = state.content.enemySpecs[enemy.kind].coreDamage;
    state.coreIntegrity = Math.max(0, state.coreIntegrity - amount);
    emit(state, {
      type: 'coreDamaged',
      lane: enemy.lane,
      enemyId: enemy.id,
      enemyKind: enemy.kind,
      sourceSpawnId: enemy.sourceSpawnId,
      amount,
    });
  }
  state.enemies = active;

  if (state.coreIntegrity === 0) {
    state.phase = 'lost';
    state.paused = false;
    state.selectedGuard = null;
    state.finalCause = deriveFailureCause(state);
    state.previews = createPreviews(state.content, state.wave, state.phase, 0);
    emit(state, { type: 'result', reason: state.finalCause.summary });
  }
}

function finishPhaseIfNeeded(state: GameState): void {
  if (isTerminal(state.phase)) return;
  const duration = state.content.phaseDurations[
    state.phase as keyof GameContent['phaseDurations']
  ];
  if (state.phaseElapsedMs < duration) return;

  if (state.phase === 'demo') {
    transitionTo(state, 'prep', 2);
    return;
  }
  if (state.phase === 'prep') {
    transitionTo(state, 'combatA');
    return;
  }
  if (state.phase === 'combatA') {
    transitionTo(state, 'rescue');
    return;
  }
  if (state.phase === 'rescue') {
    transitionTo(state, 'combatB');
    return;
  }
  if (state.phase === 'combatB' && state.wave < 12) {
    transitionTo(state, 'prep', state.wave + 1);
    return;
  }
  if (state.phase === 'combatB' && state.wave === 12 && state.enemies.length === 0) {
    state.phase = 'won';
    state.paused = false;
    state.selectedGuard = null;
    state.finalCause = {
      code: 'survived',
      lane: null,
      enemyKind: null,
      amount: state.maxCoreIntegrity - state.coreIntegrity,
      summary: '核心完成了12波防守',
      recommendation: '再守一次，尝试用不同的调防顺序降低损伤',
    };
    state.previews = createPreviews(state.content, state.wave, state.phase, 0);
    emit(state, { type: 'result', reason: state.finalCause.summary });
  }
}

function advanceState(state: GameState): GameState {
  if (state.paused || isTerminal(state.phase)) return state;
  const next = cloneForUpdate(state);
  next.activeClockMs += STEP_MS;
  next.phaseElapsedMs += STEP_MS;

  if (next.phase === 'demo' || next.phase === 'combatA' || next.phase === 'combatB') {
    spawnDueEnemies(next);
    moveEnemies(next);
    attackWithGuards(next);
    resolveCoreDamage(next);
  }
  finishPhaseIfNeeded(next);
  next.previews = createPreviews(next.content, next.wave, next.phase, next.phaseElapsedMs);
  return next;
}

export function createRun(seed: number, content = buildRunContent(seed)): GameState {
  const initialState: GameState = {
    seed: content.seed,
    wave: 1,
    phase: 'demo',
    phaseElapsedMs: 0,
    activeClockMs: 0,
    coreIntegrity: content.initialCoreIntegrity,
    maxCoreIntegrity: content.initialCoreIntegrity,
    guards: {
      heavy: { id: 'heavy', kind: 'heavy', lane: 0, cooldownRemainingMs: 0 },
      rapid: { id: 'rapid', kind: 'rapid', lane: 2, cooldownRemainingMs: 0 },
      sweep: { id: 'sweep', kind: 'sweep', lane: 4, cooldownRemainingMs: 0 },
    },
    enemies: [],
    previews: [],
    selectedGuard: null,
    windowMoveUsed: false,
    paused: false,
    processedActionSeqs: [],
    eventLog: [],
    finalCause: null,
    content,
    spawnCursor: 0,
    nextEnemySerial: 1,
    nextEventSerial: 1,
    moveHistory: [],
  };
  initialState.previews = createPreviews(content, 1, 'demo', 0);
  return initialState;
}

export function advance(ms: 250 = STEP_MS): GameAction {
  return { type: 'advance', ms };
}

export function selectGuard(guardId: GuardKind, seq: number): GameAction {
  return { type: 'selectGuard', guardId, seq };
}

export function moveSelectedGuard(lane: LaneId, seq: number): GameAction {
  return { type: 'moveSelectedGuard', lane, seq };
}

export function togglePause(): GameAction {
  return { type: 'togglePause' };
}

export function restart(seed: number): GameAction {
  return { type: 'restart', seed };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'restart') return createRun(action.seed);
  if (isTerminal(state.phase)) return state;

  if (action.type === 'advance') {
    if (action.ms !== STEP_MS) {
      throw new RangeError(`advance.ms must equal ${STEP_MS}`);
    }
    return advanceState(state);
  }

  if (action.type === 'togglePause') {
    return { ...state, paused: !state.paused };
  }

  if (state.paused || !isCommandWindow(state.phase) || state.windowMoveUsed) return state;
  if (state.processedActionSeqs.includes(action.seq)) return state;

  if (action.type === 'selectGuard') {
    const next = cloneForUpdate(state);
    next.processedActionSeqs.push(action.seq);
    next.selectedGuard = action.guardId;
    emit(next, { type: 'guardSelected', guardId: action.guardId, lane: next.guards[action.guardId].lane });
    return next;
  }

  if (!state.selectedGuard) return state;
  const selected = state.guards[state.selectedGuard];
  const occupied = GUARD_KINDS.some((guardId) => state.guards[guardId].lane === action.lane);
  const next = cloneForUpdate(state);
  next.processedActionSeqs.push(action.seq);

  if (occupied) {
    emit(next, {
      type: 'actionRejected',
      guardId: selected.id,
      lane: action.lane,
      reason: 'occupied-destination',
    });
    return next;
  }

  next.guards[selected.id].lane = action.lane;
  next.moveHistory.push({
    wave: next.wave,
    phase: state.phase,
    guardId: selected.id,
    fromLane: selected.lane,
    toLane: action.lane,
    atMs: next.activeClockMs,
  });
  emit(next, {
    type: 'guardMoved',
    guardId: selected.id,
    fromLane: selected.lane,
    toLane: action.lane,
    lane: action.lane,
  });
  next.selectedGuard = null;
  next.windowMoveUsed = true;
  return next;
}
