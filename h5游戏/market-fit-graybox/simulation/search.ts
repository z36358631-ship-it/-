import { buildRunContent, STEP_MS } from '../src/domain/content';
import {
  advance,
  createRun,
  gameReducer,
  moveSelectedGuard,
  selectGuard,
} from '../src/domain/reducer';
import { selectAllLaneThreats } from '../src/domain/selectors';
import type {
  GameContent,
  GameState,
  LaneId,
  Phase,
  PuzzleTag,
} from '../src/domain/types';
import {
  STRATEGY_NAMES,
  chooseStrategyMove,
  enumerateVisibleLegalMoves,
  type StrategyMove,
  type StrategyName,
} from './strategies';

const MAX_FIXED_STEPS = 4_000;
const DEFAULT_BEAM_WIDTH = 160;
const solutionDecisionCache = new Map<string, Decision[][]>();

export interface Decision {
  wave: number;
  phase: 'prep' | 'rescue';
  move: StrategyMove | null;
}

export interface RunTrace {
  seed: number;
  won: boolean;
  finalIntegrity: number;
  failedWave: number | null;
  decisions: Decision[];
  finalState: GameState;
}

export interface PassingSolution extends RunTrace {
  won: true;
}

export interface ReversalAudit {
  present: boolean;
  correctActionSurvives: boolean;
  wrongActionLoses: boolean;
  integrityDelta: number;
  wave: number | null;
}

export interface SeedAudit {
  seed: number;
  deterministic: boolean;
  solvable: boolean;
  solutions: PassingSolution[];
  solutionMoveDistance: number;
  finalIntegrities: number[];
  reversals: Record<PuzzleTag, ReversalAudit>;
  traces: GameState[];
}

export interface StrategyPoolResult {
  strategy: StrategyName;
  runs: number;
  wins: number;
  winRate: number;
  failureWaves: Record<number, number>;
  integrityDistribution: Record<number, number>;
  traces: GameState[];
}

export interface TargetingAudit {
  deterministicTrials: number;
  ambiguousTargets: number;
}

interface BeamNode {
  state: GameState;
  decisions: Decision[];
  nextSeq: number;
}

function isCommandPhase(phase: Phase): phase is 'prep' | 'rescue' {
  return phase === 'prep' || phase === 'rescue';
}

function commandKey(state: GameState): string | null {
  return isCommandPhase(state.phase) ? `${state.wave}:${state.phase}` : null;
}

function assertTerminates(state: GameState, steps: number): void {
  if (steps >= MAX_FIXED_STEPS && state.phase !== 'won' && state.phase !== 'lost') {
    throw new Error(
      `Seed ${state.seed} did not terminate within ${MAX_FIXED_STEPS} fixed steps`,
    );
  }
}

function advanceUntilNextDecision(
  input: GameState,
  previousKey: string | null,
): GameState {
  let state = input;
  let steps = 0;
  while (state.phase !== 'won' && state.phase !== 'lost') {
    const key = commandKey(state);
    if (key !== null && key !== previousKey) return state;
    state = gameReducer(state, advance(STEP_MS));
    steps += 1;
    assertTerminates(state, steps);
  }
  return state;
}

function applyMove(
  input: GameState,
  move: StrategyMove | null,
  nextSeq: number,
): { state: GameState; nextSeq: number } {
  if (!move) return { state: input, nextSeq };
  const selected = gameReducer(input, selectGuard(move.guardId, nextSeq));
  const moved = gameReducer(selected, moveSelectedGuard(move.lane, nextSeq + 1));
  const accepted = moved.moveHistory.length === input.moveHistory.length + 1;
  if (!accepted) {
    throw new Error(
      `Illegal simulated move ${move.guardId}->${move.lane} at wave ${input.wave} ${input.phase}`,
    );
  }
  return { state: moved, nextSeq: nextSeq + 2 };
}

function runFromDecisions(
  seed: number,
  decisions: readonly Decision[],
): RunTrace {
  let state = advanceUntilNextDecision(createRun(seed), null);
  let nextSeq = 1;
  let index = 0;
  const actual: Decision[] = [];

  while (state.phase !== 'won' && state.phase !== 'lost') {
    if (!isCommandPhase(state.phase)) {
      throw new Error(`Expected command phase, got ${state.phase}`);
    }
    const expected = decisions[index];
    const move =
      expected && expected.wave === state.wave && expected.phase === state.phase
        ? expected.move
        : null;
    const decision: Decision = { wave: state.wave, phase: state.phase, move };
    actual.push(decision);
    const currentKey = commandKey(state);
    const applied = applyMove(state, move, nextSeq);
    state = advanceUntilNextDecision(applied.state, currentKey);
    nextSeq = applied.nextSeq;
    index += 1;
  }

  return {
    seed,
    won: state.phase === 'won',
    finalIntegrity: state.coreIntegrity,
    failedWave: state.phase === 'lost' ? state.wave : null,
    decisions: actual,
    finalState: state,
  };
}

export function runStrategy(seed: number, strategy: StrategyName): RunTrace {
  let state = advanceUntilNextDecision(createRun(seed), null);
  let nextSeq = 1;
  const decisions: Decision[] = [];

  while (state.phase !== 'won' && state.phase !== 'lost') {
    if (!isCommandPhase(state.phase)) {
      throw new Error(`Expected command phase, got ${state.phase}`);
    }
    const move = chooseStrategyMove(strategy, state);
    decisions.push({ wave: state.wave, phase: state.phase, move });
    const currentKey = commandKey(state);
    const applied = applyMove(state, move, nextSeq);
    state = advanceUntilNextDecision(applied.state, currentKey);
    nextSeq = applied.nextSeq;
  }

  return {
    seed,
    won: state.phase === 'won',
    finalIntegrity: state.coreIntegrity,
    failedWave: state.phase === 'lost' ? state.wave : null,
    decisions,
    finalState: state,
  };
}

function decisionSignature(decision: Decision): string {
  return decision.move
    ? `${decision.move.guardId}->${decision.move.lane}`
    : 'hold';
}

export function sequenceDistance(
  left: readonly Decision[],
  right: readonly Decision[],
): number {
  const length = Math.max(left.length, right.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ? decisionSignature(left[index]) : 'missing';
    const rightValue = right[index] ? decisionSignature(right[index]) : 'missing';
    if (leftValue !== rightValue) distance += 1;
  }
  return distance;
}

function stateScore(state: GameState): number {
  if (state.phase === 'won') return 1_000_000 + state.coreIntegrity * 1_000;
  if (state.phase === 'lost') return -1_000_000 + state.wave * 1_000;
  const threat = selectAllLaneThreats(state).reduce(
    (total, lane) => total + lane.score,
    0,
  );
  return state.wave * 20_000 + state.coreIntegrity * 1_000 - threat * 5;
}

function compactStateHash(state: GameState): string {
  const guards = Object.values(state.guards)
    .map((guard) => `${guard.id}:${guard.lane}:${guard.cooldownRemainingMs}`)
    .sort()
    .join('|');
  const enemies = state.enemies
    .map(
      (enemy) =>
        `${enemy.sourceSpawnId}:${enemy.hp}:${enemy.distance}:${enemy.moveAccumulatorMs}`,
    )
    .sort()
    .join('|');
  return `${state.wave}:${state.phase}:${state.coreIntegrity}:${guards}:${enemies}`;
}

function diversify(nodes: BeamNode[], beamWidth: number): BeamNode[] {
  const perState = new Map<string, BeamNode[]>();
  for (const node of nodes.sort((left, right) => stateScore(right.state) - stateScore(left.state))) {
    const key = compactStateHash(node.state);
    const existing = perState.get(key) ?? [];
    if (
      existing.length < 2 &&
      existing.every(
        (candidate) =>
          sequenceDistance(candidate.decisions, node.decisions) >= 2,
      )
    ) {
      existing.push(node);
      perState.set(key, existing);
    }
  }
  return [...perState.values()]
    .flat()
    .sort((left, right) => stateScore(right.state) - stateScore(left.state))
    .slice(0, beamWidth);
}

export function searchPassingSequences(
  seed: number,
  beamWidth = DEFAULT_BEAM_WIDTH,
): PassingSolution[] {
  const scheduleKey = JSON.stringify(buildRunContent(seed).waves);
  const cached = solutionDecisionCache.get(scheduleKey);
  if (cached) {
    return cached
      .map((decisions) => runFromDecisions(seed, decisions))
      .filter((trace): trace is PassingSolution => trace.won);
  }
  const start = advanceUntilNextDecision(createRun(seed), null);
  let beam: BeamNode[] = [{ state: start, decisions: [], nextSeq: 1 }];
  const wins: PassingSolution[] = [];

  for (let windowIndex = 0; windowIndex < 24 && beam.length > 0; windowIndex += 1) {
    const next: BeamNode[] = [];
    for (const node of beam) {
      if (node.state.phase === 'lost') continue;
      if (node.state.phase === 'won') {
        wins.push({
          seed,
          won: true,
          finalIntegrity: node.state.coreIntegrity,
          failedWave: null,
          decisions: node.decisions,
          finalState: node.state,
        });
        continue;
      }
      if (!isCommandPhase(node.state.phase)) continue;

      const moves: Array<StrategyMove | null> = [
        null,
        ...enumerateVisibleLegalMoves(node.state),
      ];
      for (const move of moves) {
        const decision: Decision = {
          wave: node.state.wave,
          phase: node.state.phase,
          move,
        };
        const applied = applyMove(node.state, move, node.nextSeq);
        const state = advanceUntilNextDecision(
          applied.state,
          commandKey(node.state),
        );
        const decisions = [...node.decisions, decision];
        if (state.phase === 'won') {
          wins.push({
            seed,
            won: true,
            finalIntegrity: state.coreIntegrity,
            failedWave: null,
            decisions,
            finalState: state,
          });
        } else if (state.phase !== 'lost') {
          next.push({ state, decisions, nextSeq: applied.nextSeq });
        }
      }
    }

    const diverseWins = selectDiversePair(wins);
    if (diverseWins.length === 2 && sequenceDistance(diverseWins[0].decisions, diverseWins[1].decisions) >= 4) {
      solutionDecisionCache.set(
        scheduleKey,
        diverseWins.map((solution) => solution.decisions),
      );
      return diverseWins;
    }
    beam = diversify(next, beamWidth);
  }

  const result = selectDiversePair(wins);
  if (result.length > 0) {
    solutionDecisionCache.set(
      scheduleKey,
      result.map((solution) => solution.decisions),
    );
  }
  return result;
}

function selectDiversePair(wins: PassingSolution[]): PassingSolution[] {
  if (wins.length <= 1) return wins.slice(0, 1);
  let pair: [PassingSolution, PassingSolution] = [wins[0], wins[1]];
  let bestDistance = sequenceDistance(pair[0].decisions, pair[1].decisions);
  const candidates = wins
    .sort((left, right) => right.finalIntegrity - left.finalIntegrity)
    .slice(0, 128);
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const distance = sequenceDistance(
        candidates[left].decisions,
        candidates[right].decisions,
      );
      if (
        distance > bestDistance ||
        (distance === bestDistance &&
          candidates[left].finalIntegrity + candidates[right].finalIntegrity >
            pair[0].finalIntegrity + pair[1].finalIntegrity)
      ) {
        pair = [candidates[left], candidates[right]];
        bestDistance = distance;
      }
    }
  }
  return pair;
}

function stateAtWindow(
  seed: number,
  decisions: readonly Decision[],
  wave: number,
  phase: 'prep' | 'rescue',
): { state: GameState; nextSeq: number } | null {
  let state = advanceUntilNextDecision(createRun(seed), null);
  let nextSeq = 1;
  let index = 0;
  while (state.phase !== 'won' && state.phase !== 'lost') {
    if (!isCommandPhase(state.phase)) return null;
    if (state.wave === wave && state.phase === phase) return { state, nextSeq };
    const decision = decisions[index];
    const move =
      decision && decision.wave === state.wave && decision.phase === state.phase
        ? decision.move
        : null;
    const applied = applyMove(state, move, nextSeq);
    state = advanceUntilNextDecision(applied.state, commandKey(state));
    nextSeq = applied.nextSeq;
    index += 1;
  }
  return null;
}

function auditReversal(
  seed: number,
  solution: PassingSolution | undefined,
  tag: PuzzleTag,
): ReversalAudit {
  const content = buildRunContent(seed);
  const wave = content.waves.find((candidate) => candidate.puzzleTags.includes(tag))?.wave ?? null;
  if (wave === null || !solution) {
    return {
      present: wave !== null,
      correctActionSurvives: false,
      wrongActionLoses: false,
      integrityDelta: 0,
      wave,
    };
  }
  const snapshot = stateAtWindow(seed, solution.decisions, wave, 'rescue');
  if (!snapshot) {
    return {
      present: true,
      correctActionSurvives: false,
      wrongActionLoses: true,
      integrityDelta: 0,
      wave,
    };
  }

  const outcomes = [null, ...enumerateVisibleLegalMoves(snapshot.state)].map(
    (move) => {
      const applied = applyMove(snapshot.state, move, snapshot.nextSeq);
      const after = advanceUntilNextDecision(
        applied.state,
        commandKey(snapshot.state),
      );
      return {
        coreIntegrity: after.coreIntegrity,
        survived: after.phase !== 'lost',
      };
    },
  );
  const best = Math.max(...outcomes.map((outcome) => outcome.coreIntegrity));
  const worst = Math.min(...outcomes.map((outcome) => outcome.coreIntegrity));

  return {
    present: true,
    correctActionSurvives: outcomes.some(
      (outcome) => outcome.survived && outcome.coreIntegrity === best,
    ),
    wrongActionLoses: outcomes.some((outcome) => !outcome.survived),
    integrityDelta: best - worst,
    wave,
  };
}

export function auditSeed(seed: number): SeedAudit {
  const solutions = searchPassingSequences(seed);
  const first = solutions[0];
  const second = solutions[1];
  const firstReplay = first ? runFromDecisions(seed, first.decisions) : null;
  const secondReplay = second ? runFromDecisions(seed, second.decisions) : null;
  const replayPairs: Array<{
    original: PassingSolution;
    replay: RunTrace;
  }> = [];
  if (first && firstReplay) replayPairs.push({ original: first, replay: firstReplay });
  if (second && secondReplay) replayPairs.push({ original: second, replay: secondReplay });
  const deterministic = replayPairs.every(
    ({ original, replay }) =>
      JSON.stringify(original.finalState) === JSON.stringify(replay.finalState),
  );
  const solutionMoveDistance =
    first && second ? sequenceDistance(first.decisions, second.decisions) : 0;

  return {
    seed,
    deterministic: solutions.length > 0 && deterministic,
    solvable: solutions.length > 0,
    solutions,
    solutionMoveDistance,
    finalIntegrities: solutions.map((solution) => solution.finalIntegrity),
    reversals: {
      R1: auditReversal(seed, first, 'R1'),
      R2: auditReversal(seed, first, 'R2'),
      R3: auditReversal(seed, first, 'R3'),
    },
    traces: solutions.map((solution) => solution.finalState),
  };
}

export function runStrategyPool(
  seeds: readonly number[],
): StrategyPoolResult[] {
  return STRATEGY_NAMES.map((strategy) => {
    const results = seeds.map((seed) => runStrategy(seed, strategy));
    const wins = results.filter((result) => result.won).length;
    const failureWaves: Record<number, number> = {};
    const integrityDistribution: Record<number, number> = {};
    for (const result of results) {
      if (result.failedWave !== null) {
        failureWaves[result.failedWave] =
          (failureWaves[result.failedWave] ?? 0) + 1;
      }
      integrityDistribution[result.finalIntegrity] =
        (integrityDistribution[result.finalIntegrity] ?? 0) + 1;
    }
    return {
      strategy,
      runs: results.length,
      wins,
      winRate: results.length === 0 ? 0 : wins / results.length,
      failureWaves,
      integrityDistribution,
      traces: results.map((result) => result.finalState),
    };
  });
}

function targetingContent(trial: number): GameContent {
  const content = buildRunContent(trial + 1);
  const lowId = `audit-${trial.toString().padStart(5, '0')}-a`;
  const highId = `audit-${trial.toString().padStart(5, '0')}-b`;
  const reverse = trial % 2 === 1;
  const tied = [
    {
      spawnId: lowId,
      phase: 'demo' as const,
      atMs: 0,
      lane: 0 as LaneId,
      kind: 'armor' as const,
    },
    {
      spawnId: highId,
      phase: 'demo' as const,
      atMs: 0,
      lane: 0 as LaneId,
      kind: 'armor' as const,
    },
  ];
  return {
    ...content,
    waves: [
      { wave: 1, puzzleTags: [], spawns: reverse ? tied.reverse() : tied },
      ...content.waves.slice(1),
    ],
  };
}

export function auditTargeting(trials: number): TargetingAudit {
  let ambiguousTargets = 0;
  let deterministicTrials = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    const content = targetingContent(trial);
    const first = gameReducer(createRun(content.seed, content), advance(STEP_MS));
    const second = gameReducer(createRun(content.seed, content), advance(STEP_MS));
    if (JSON.stringify(first) === JSON.stringify(second)) deterministicTrials += 1;
    const firstAttack = first.eventLog.find(
      (event) => event.type === 'guardAttacked' && event.guardId === 'heavy',
    );
    const expected = content.waves[0].spawns
      .map((spawn) => spawn.spawnId)
      .sort()[0];
    if (firstAttack?.sourceSpawnId !== expected) ambiguousTargets += 1;
  }
  return { deterministicTrials, ambiguousTargets };
}

type TraceContainer = { traces: GameState[] };

export function auditAttribution(containers: TraceContainer[]): {
  coreDamageEvents: number;
  untraceableDamageEvents: number;
  untraceableRate: number;
} {
  let coreDamageEvents = 0;
  let untraceableDamageEvents = 0;
  for (const state of containers.flatMap((container) => container.traces)) {
    for (const event of state.eventLog) {
      if (event.type !== 'coreDamaged') continue;
      coreDamageEvents += 1;
      const spawn = state.content.waves
        .flatMap((wave) => wave.spawns)
        .find((candidate) => candidate.spawnId === event.sourceSpawnId);
      if (
        event.lane === undefined ||
        !event.enemyId ||
        !event.enemyKind ||
        !event.sourceSpawnId ||
        !spawn ||
        spawn.lane !== event.lane ||
        spawn.kind !== event.enemyKind
      ) {
        untraceableDamageEvents += 1;
      }
    }
  }
  return {
    coreDamageEvents,
    untraceableDamageEvents,
    untraceableRate:
      coreDamageEvents === 0 ? 0 : untraceableDamageEvents / coreDamageEvents,
  };
}
