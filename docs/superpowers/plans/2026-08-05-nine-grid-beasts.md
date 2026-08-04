# Nine Grid Beasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete landscape, single-player, six-round Nine Grid Beasts run with recruiting, 3×3 placement, bonds, formation eyes, readable auto-combat, win/loss settlement, immediate seeded replay, and the approved analytics events.

**Architecture:** Keep all deterministic rules in a pure TypeScript engine and use Phaser only for rendering battle actors, ranges, damage, and effects. A small DOM controller owns accessible recruit/formation/augment controls, orientation blocking, lifecycle pause/resume, and analytics; it mounts through the single public `mountNineGrid` contract and delegates event delivery to the shared non-blocking analytics client.

**Tech Stack:** Vite, TypeScript strict mode, Phaser 3, CSS, Vitest, jsdom, Playwright.

---

All `Run:` commands execute from `github/four-experiment-pilot`. Git commands also execute from that directory. This plan owns only `src/apps/nine-grid/**`, `src/apps/nine-grid/nine-grid.css`, `tests/e2e/nine-grid.spec.ts`, and the Nine Grid original-asset inventory. It imports the platform-owned `AnalyticsClient` and `AnalyticsEventName` from `src/shared/analytics.ts`; it does not modify routing, the shared analytics SDK, API, Worker, D1, dashboard, or another experiment.

The platform-owned analytics contract consumed by this plan is exact and read-only:

```ts
interface AnalyticsClient {
  track(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void;
  flush(): Promise<void>;
}
```

Gameplay never awaits `track`; the shared client owns bounded local queuing and retries. The controller calls `flush()` when the page becomes hidden and after complete settlement.

## File map

- `src/apps/nine-grid/types.ts`: stable domain types used by rules, UI, Phaser, and tests.
- `src/apps/nine-grid/content.ts`: eight original beasts, three bonds, augments, threats, and deterministic candidate/eye generation.
- `src/apps/nine-grid/engine.ts`: pure seeded game state transitions, resonance, placement, bond/eye scoring, battle settlement, and replay.
- `src/apps/nine-grid/engine.test.ts`: rule-level acceptance tests for the entire six-round loop.
- `src/apps/nine-grid/layout.ts`: pure responsive board and effect-budget calculations.
- `src/apps/nine-grid/layout.test.ts`: landscape, portrait-blocking, safe-area, and low-end effect tests.
- `src/apps/nine-grid/visuals.ts`: project-original procedural Phaser textures and effect helpers.
- `src/apps/nine-grid/NineGridScene.ts`: battle-only Phaser scene; DOM remains the reliable control surface.
- `src/apps/nine-grid/controller.ts`: accessible controls, forced first battle, phase transitions, event emission, pause/resume, and replay.
- `src/apps/nine-grid/index.ts`: public mount/unmount adapter required by the platform router.
- `src/apps/nine-grid/mount.ts`: platform-owned route seam changed from its placeholder mount to an exact re-export of the finished app mount.
- `src/apps/nine-grid/index.test.ts`: route-seam re-export, mount contract, analytics order, orientation, lifecycle, and cleanup tests.
- `src/apps/nine-grid/nine-grid.css`: scoped landscape layout, readable states, portrait rotation screen, and mobile safe areas.
- `src/apps/nine-grid/assets/original-assets.json`: source, license, prompt/design notes, modification history, and final use for every original visual/audio asset.
- `src/apps/nine-grid/assets/ORIGINAL_ASSETS.md`: human review checklist proving that no competitor asset is copied.
- `tests/e2e/nine-grid.spec.ts`: desktop, Android, iPhone orientation, full-run, replay, lifecycle, console, and frame-budget acceptance.

### Task 1: Lock the domain content and deterministic rules

**Files:**
- Create: `src/apps/nine-grid/types.ts`
- Create: `src/apps/nine-grid/content.ts`
- Create: `src/apps/nine-grid/engine.test.ts`
- Create: `src/apps/nine-grid/engine.ts`

- [ ] **Step 1: Create the shared domain types**

Create `src/apps/nine-grid/types.ts`:

```ts
export type BondId = 'fang' | 'aegis' | 'spirit';
export type EyeKind = 'flame' | 'life';
export type Phase = 'recruit' | 'formation' | 'battle' | 'augment' | 'complete';
export type Outcome = 'victory' | 'defeat';

export interface BeastDefinition {
  id: string;
  name: string;
  bond: BondId;
  attack: number;
  vitality: number;
  skillName: string;
  skillText: string;
  color: number;
  silhouette: readonly [number, number][];
}

export interface Unit {
  uid: string;
  beastId: string;
  tier: 1 | 2;
}

export interface FormationEye {
  cell: number;
  kind: EyeKind;
}

export interface Threat {
  name: string;
  cell: number;
  power: number;
  range: 'single' | 'row' | 'column';
}

export interface Augment {
  id: string;
  name: string;
  text: string;
  attack: number;
  vitality: number;
}

export interface CombatSummary {
  outcome: Outcome;
  playerPower: number;
  enemyPower: number;
  bondBonus: number;
  eyeBonus: number;
  positionBonus: number;
  lines: string[];
}

export interface GameState {
  seed: number;
  phase: Phase;
  round: number;
  resources: number;
  candidates: string[];
  bench: Unit[];
  board: Array<Unit | null>;
  selectedUid: string | null;
  eyes: FormationEye[];
  threat: Threat;
  augmentChoices: Augment[];
  augments: string[];
  wins: number;
  losses: number;
  combat: CombatSummary | null;
  lastOutcome: Outcome | null;
}

export interface GameSnapshot {
  state: GameState;
  boardNames: string[];
  activeBonds: string[];
}
```

- [ ] **Step 2: Create the complete first-version content catalog**

Create `src/apps/nine-grid/content.ts`:

```ts
import type { Augment, BeastDefinition, BondId, EyeKind, FormationEye, Threat } from './types';

export const BEASTS: readonly BeastDefinition[] = [
  { id: 'cinder-horn', name: '烬角', bond: 'fang', attack: 8, vitality: 5, skillName: '焚脉', skillText: '下一击溅射邻格', color: 0xc66b3d, silhouette: [[4, 28], [18, 5], [29, 25], [50, 8], [58, 38], [28, 57]] },
  { id: 'ore-claw', name: '矿爪', bond: 'fang', attack: 7, vitality: 6, skillName: '裂岩', skillText: '攻击最低生命目标', color: 0xb88b4a, silhouette: [[5, 16], [24, 8], [38, 2], [55, 22], [43, 51], [15, 56]] },
  { id: 'ink-wing', name: '墨翎', bond: 'fang', attack: 6, vitality: 5, skillName: '掠影', skillText: '穿过一列敌人', color: 0x58756f, silhouette: [[3, 31], [20, 10], [30, 25], [50, 6], [57, 35], [30, 53]] },
  { id: 'bronze-shell', name: '铜甲', bond: 'aegis', attack: 4, vitality: 10, skillName: '镇壳', skillText: '首次受击获得护盾', color: 0x648c72, silhouette: [[8, 20], [24, 4], [47, 11], [57, 30], [45, 52], [16, 55], [3, 38]] },
  { id: 'mountain-tusk', name: '山牙', bond: 'aegis', attack: 5, vitality: 9, skillName: '拒阵', skillText: '推开正前方目标', color: 0x7d8062, silhouette: [[2, 26], [15, 8], [38, 6], [57, 25], [48, 50], [20, 57]] },
  { id: 'jade-back', name: '碧脊', bond: 'aegis', attack: 5, vitality: 8, skillName: '回甲', skillText: '低血量时减伤', color: 0x4e9b80, silhouette: [[5, 34], [12, 14], [29, 2], [51, 13], [58, 39], [38, 55], [13, 51]] },
  { id: 'spring-tail', name: '泉尾', bond: 'spirit', attack: 4, vitality: 7, skillName: '生息', skillText: '治疗最弱友军', color: 0x77a68d, silhouette: [[4, 23], [20, 5], [39, 13], [57, 4], [49, 32], [56, 50], [24, 56]] },
  { id: 'golden-pupil', name: '金瞳', bond: 'spirit', attack: 6, vitality: 6, skillName: '照魄', skillText: '强化相邻友军', color: 0xc8a657, silhouette: [[3, 31], [16, 8], [31, 17], [45, 5], [58, 29], [47, 52], [19, 56]] },
];

export const BOND_NAMES: Record<BondId, string> = { fang: '锐牙', aegis: '玄甲', spirit: '生息' };

export const AUGMENTS: readonly Augment[] = [
  { id: 'keen-edge', name: '矿金锐锋', text: '全队攻击 +2', attack: 2, vitality: 0 },
  { id: 'deep-hide', name: '青铜厚皮', text: '全队生命 +2', attack: 0, vitality: 2 },
  { id: 'balanced-vein', name: '山脉共振', text: '全队攻击与生命 +1', attack: 1, vitality: 1 },
  { id: 'eye-reader', name: '阵眼观测', text: '阵眼收益额外 +3', attack: 0, vitality: 0 },
  { id: 'bond-echo', name: '羁绊回声', text: '激活羁绊收益额外 +3', attack: 0, vitality: 0 },
  { id: 'steady-step', name: '稳阵步', text: '克制威胁收益额外 +3', attack: 0, vitality: 0 },
];

export const THREATS: readonly Omit<Threat, 'cell'>[] = [
  { name: '裂角先锋', power: 24, range: 'single' },
  { name: '横扫石蜥', power: 34, range: 'row' },
  { name: '贯阵长蛇', power: 45, range: 'column' },
  { name: '蚀甲凶鸟', power: 56, range: 'single' },
  { name: '三首岩兽', power: 68, range: 'row' },
  { name: '深渊蜃主', power: 82, range: 'column' },
];

export function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function pickDistinct<T>(items: readonly T[], count: number, seed: number): { values: T[]; seed: number } {
  const pool = [...items];
  const values: T[] = [];
  let cursor = seed >>> 0;
  while (values.length < count && pool.length > 0) {
    cursor = nextSeed(cursor);
    values.push(pool.splice(cursor % pool.length, 1)[0]);
  }
  return { values, seed: cursor };
}

export function generateRound(seed: number, round: number): { candidates: string[]; eyes: FormationEye[]; threat: Threat; seed: number } {
  const beasts = pickDistinct(BEASTS, 3, seed);
  const cells = pickDistinct([0, 1, 2, 3, 4, 5, 6, 7, 8], 2, beasts.seed);
  const kinds: readonly EyeKind[] = round % 2 === 0 ? ['life', 'flame'] : ['flame', 'life'];
  const threatSeed = nextSeed(cells.seed);
  return {
    candidates: beasts.values.map((beast) => beast.id),
    eyes: cells.values.map((cell, index) => ({ cell, kind: kinds[index] })),
    threat: { ...THREATS[round - 1], cell: threatSeed % 9 },
    seed: threatSeed,
  };
}

export function generateAugments(seed: number): { choices: Augment[]; seed: number } {
  const result = pickDistinct(AUGMENTS, 3, seed);
  return { choices: result.values, seed: result.seed };
}

export function beastById(id: string): BeastDefinition {
  const beast = BEASTS.find((entry) => entry.id === id);
  if (!beast) throw new Error(`Unknown beast: ${id}`);
  return beast;
}
```

- [ ] **Step 3: Write failing rule tests for recruiting, resonance, formation, eyes, six rounds, and replay**

Create `src/apps/nine-grid/engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BEASTS } from './content';
import { activeBonds, chooseAugment, createGame, finishBattle, lockFormation, placeUnit, recruit, restartGame } from './engine';

function prepareBattle(seed = 7) {
  let state = createGame(seed);
  state = recruit(state, state.candidates[0]);
  const uid = state.bench[0]?.uid;
  if (!uid) throw new Error('Expected recruited unit');
  state = placeUnit(state, uid, state.eyes[0].cell);
  return lockFormation(state);
}

describe('Nine Grid rules', () => {
  it('starts with three candidates, two public eyes, fixed resources and a round threat', () => {
    const state = createGame(11);
    expect(state.phase).toBe('recruit');
    expect(state.candidates).toHaveLength(3);
    expect(state.eyes).toHaveLength(2);
    expect(new Set(state.eyes.map((eye) => eye.cell)).size).toBe(2);
    expect(state.resources).toBe(1);
    expect(state.threat.name).toBeTruthy();
  });

  it('turns a duplicate pair into one tier-two resonance and never creates tier three', () => {
    let state = createGame(19);
    const beastId = state.candidates[0];
    state = recruit(state, beastId);
    state = { ...state, phase: 'recruit', resources: 1, candidates: [beastId, ...state.candidates.slice(1)] };
    state = recruit(state, beastId);
    expect(state.bench).toEqual([{ uid: expect.any(String), beastId, tier: 2 }]);
    expect(state.bench.some((unit) => unit.tier > 2)).toBe(false);
  });

  it('uses reliable select-then-cell placement and caps the board at five units', () => {
    let state = createGame(23);
    for (let index = 0; index < 5; index += 1) {
      const beastId = BEASTS[index].id;
      state = { ...state, phase: 'recruit', resources: 1, candidates: [beastId] };
      state = recruit(state, beastId);
      const unit = state.bench.at(-1);
      if (unit) state = placeUnit(state, unit.uid, index);
    }
    expect(state.board.filter(Boolean)).toHaveLength(5);
    expect(() => placeUnit({ ...state, bench: [{ uid: 'sixth', beastId: state.candidates[0], tier: 1 }] }, 'sixth', 8)).toThrow('Board is full');
  });

  it('reports bond, eye and position contributions in every combat summary', () => {
    const battle = prepareBattle(29);
    expect(battle.phase).toBe('battle');
    expect(battle.combat?.lines).toEqual(expect.arrayContaining([
      expect.stringContaining('羁绊'),
      expect.stringContaining('阵眼'),
      expect.stringContaining('站位'),
    ]));
    expect(battle.combat?.playerPower).toBeGreaterThan(0);
  });

  it('activates one of the three bonds only at two matching units', () => {
    let state = createGame(31);
    const [first, second] = BEASTS.filter((beast) => beast.bond === 'fang').map((beast) => beast.id);
    state = { ...state, candidates: [first] };
    state = recruit(state, first);
    const one = state.bench[0];
    state = placeUnit(state, one.uid, 0);
    expect(activeBonds(state)).toEqual([]);
    state = { ...state, phase: 'formation', bench: [{ uid: 'ally', beastId: second, tier: 1 }] };
    state = placeUnit(state, 'ally', 1);
    expect(activeBonds(state)).toHaveLength(1);
  });

  it('completes exactly six rounds, makes round six a boss, and restarts with a new seed', () => {
    let state = createGame(37);
    for (let round = 1; round <= 6; round += 1) {
      state = recruit(state, state.candidates[0]);
      const unit = state.bench[0];
      if (unit && state.board.filter(Boolean).length < 5) state = placeUnit(state, unit.uid, state.board.findIndex((cell) => cell === null));
      state = lockFormation(state);
      state = finishBattle(state);
      if (round < 6) state = chooseAugment(state, state.augmentChoices[0].id);
    }
    expect(state.phase).toBe('complete');
    expect(state.round).toBe(6);
    expect(state.threat.name).toBe('深渊蜃主');
    expect(state.wins + state.losses).toBe(6);
    const replay = restartGame(state);
    expect(replay.phase).toBe('recruit');
    expect(replay.round).toBe(1);
    expect(replay.seed).not.toBe(state.seed);
  });
});
```

- [ ] **Step 4: Run the rule test and verify the missing engine failure**

Run: `npx vitest run src/apps/nine-grid/engine.test.ts`

Expected: FAIL with `Failed to load url ./engine` or `Cannot find module './engine'`.

- [ ] **Step 5: Implement the minimal complete pure engine**

Create `src/apps/nine-grid/engine.ts`:

```ts
import { AUGMENTS, BOND_NAMES, beastById, generateAugments, generateRound, nextSeed } from './content';
import type { BondId, GameSnapshot, GameState, Unit } from './types';

const EMPTY_BOARD = (): Array<Unit | null> => Array.from({ length: 9 }, () => null);

export function createGame(seed: number): GameState {
  const round = generateRound(seed >>> 0, 1);
  return {
    seed: round.seed,
    phase: 'recruit',
    round: 1,
    resources: 1,
    candidates: round.candidates,
    bench: [],
    board: EMPTY_BOARD(),
    selectedUid: null,
    eyes: round.eyes,
    threat: round.threat,
    augmentChoices: [],
    augments: [],
    wins: 0,
    losses: 0,
    combat: null,
    lastOutcome: null,
  };
}

function allUnits(state: GameState): Unit[] {
  return [...state.bench, ...state.board.filter((unit): unit is Unit => unit !== null)];
}

export function recruit(state: GameState, beastId: string): GameState {
  if (state.phase !== 'recruit') throw new Error('Recruiting is closed');
  if (state.resources < 1) throw new Error('Not enough resources');
  if (!state.candidates.includes(beastId)) throw new Error('Candidate is not available');
  const existing = allUnits(state).find((unit) => unit.beastId === beastId && unit.tier === 1);
  if (existing) {
    const board = state.board.map((unit) => unit?.uid === existing.uid ? { ...unit, tier: 2 as const } : unit);
    const bench = state.bench.filter((unit) => unit.uid !== existing.uid);
    if (!board.some((unit) => unit?.uid === existing.uid)) bench.push({ ...existing, tier: 2 });
    return { ...state, phase: 'formation', resources: 0, board, bench, selectedUid: existing.uid };
  }
  const unit: Unit = { uid: `${beastId}-${state.round}-${state.seed}`, beastId, tier: 1 };
  return { ...state, phase: 'formation', resources: 0, bench: [...state.bench, unit], selectedUid: unit.uid };
}

export function placeUnit(state: GameState, uid: string, cell: number): GameState {
  if (state.phase !== 'formation') throw new Error('Formation is locked');
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new Error('Invalid board cell');
  const currentIndex = state.board.findIndex((unit) => unit?.uid === uid);
  const fromBench = state.bench.find((unit) => unit.uid === uid);
  const moving = currentIndex >= 0 ? state.board[currentIndex] : fromBench;
  if (!moving) throw new Error('Unknown unit');
  if (currentIndex < 0 && state.board.filter(Boolean).length >= 5 && state.board[cell] === null) throw new Error('Board is full');
  const board = [...state.board];
  const displaced = board[cell];
  if (currentIndex >= 0) board[currentIndex] = displaced;
  else if (displaced) throw new Error('Choose an empty cell for a bench unit');
  board[cell] = moving;
  return { ...state, board, bench: state.bench.filter((unit) => unit.uid !== uid), selectedUid: null };
}

export function activeBonds(state: GameState): BondId[] {
  const counts = new Map<BondId, number>();
  for (const unit of state.board) {
    if (!unit) continue;
    const bond = beastById(unit.beastId).bond;
    counts.set(bond, (counts.get(bond) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([bond]) => bond);
}

function hasAugment(state: GameState, id: string): boolean {
  return state.augments.includes(id);
}

export function lockFormation(state: GameState): GameState {
  if (state.phase !== 'formation') throw new Error('Formation cannot be locked');
  const units = state.board.filter((unit): unit is Unit => unit !== null);
  if (units.length === 0) throw new Error('Place at least one beast');
  const augments = state.augments.map((id) => AUGMENTS.find((entry) => entry.id === id)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const rawPower = units.reduce((sum, unit) => {
    const beast = beastById(unit.beastId);
    const tierMultiplier = unit.tier === 2 ? 1.65 : 1;
    return sum + Math.round((beast.attack + beast.vitality) * tierMultiplier);
  }, 0);
  const statBonus = units.length * augments.reduce((sum, augment) => sum + augment.attack + augment.vitality, 0);
  const bonds = activeBonds(state);
  const bondBonus = bonds.length * 6 + (hasAugment(state, 'bond-echo') && bonds.length > 0 ? 3 : 0);
  const occupiedEyes = state.eyes.filter((eye) => state.board[eye.cell] !== null);
  const eyeBonus = occupiedEyes.reduce((sum, eye) => sum + (eye.kind === 'flame' ? 5 : 4), 0) + (hasAugment(state, 'eye-reader') && occupiedEyes.length > 0 ? 3 : 0);
  const threatRow = Math.floor(state.threat.cell / 3);
  const threatColumn = state.threat.cell % 3;
  const safeUnits = state.board.reduce((sum, unit, cell) => {
    if (!unit) return sum;
    const row = Math.floor(cell / 3);
    const column = cell % 3;
    if (state.threat.range === 'row') return sum + (row !== threatRow ? 1 : 0);
    if (state.threat.range === 'column') return sum + (column !== threatColumn ? 1 : 0);
    return sum + (cell !== state.threat.cell ? 1 : 0);
  }, 0);
  const positionBonus = safeUnits * 2 + (hasAugment(state, 'steady-step') && safeUnits > 0 ? 3 : 0);
  const playerPower = rawPower + statBonus + bondBonus + eyeBonus + positionBonus;
  const variance = (state.seed % 7) - 3;
  const enemyPower = state.threat.power + variance;
  const outcome = playerPower >= enemyPower ? 'victory' : 'defeat';
  return {
    ...state,
    phase: 'battle',
    combat: {
      outcome,
      playerPower,
      enemyPower,
      bondBonus,
      eyeBonus,
      positionBonus,
      lines: [
        `羁绊：${bonds.length > 0 ? bonds.map((bond) => BOND_NAMES[bond]).join('、') : '未激活'}，贡献 ${bondBonus}`,
        `阵眼：占据 ${occupiedEyes.length} 个，贡献 ${eyeBonus}`,
        `站位：避开 ${safeUnits} 个威胁格，贡献 ${positionBonus}`,
      ],
    },
  };
}

export function finishBattle(state: GameState): GameState {
  if (state.phase !== 'battle' || !state.combat) throw new Error('No battle to finish');
  const victory = state.combat.outcome === 'victory';
  if (state.round === 6) {
    return { ...state, phase: 'complete', wins: state.wins + (victory ? 1 : 0), losses: state.losses + (victory ? 0 : 1), lastOutcome: state.combat.outcome };
  }
  const choices = generateAugments(state.seed);
  return {
    ...state,
    phase: 'augment',
    seed: choices.seed,
    wins: state.wins + (victory ? 1 : 0),
    losses: state.losses + (victory ? 0 : 1),
    lastOutcome: state.combat.outcome,
    augmentChoices: choices.choices,
  };
}

export function chooseAugment(state: GameState, augmentId: string): GameState {
  if (state.phase !== 'augment') throw new Error('No augment choice is open');
  if (!state.augmentChoices.some((augment) => augment.id === augmentId)) throw new Error('Augment is not offered');
  const nextRound = state.round + 1;
  const generated = generateRound(state.seed, nextRound);
  return {
    ...state,
    seed: generated.seed,
    phase: 'recruit',
    round: nextRound,
    resources: 1,
    candidates: generated.candidates,
    eyes: generated.eyes,
    threat: generated.threat,
    augmentChoices: [],
    augments: [...state.augments, augmentId],
    combat: null,
    selectedUid: null,
  };
}

export function restartGame(state: GameState): GameState {
  if (state.phase !== 'complete') throw new Error('Run is not complete');
  return createGame(nextSeed(state.seed));
}

export function snapshot(state: GameState): GameSnapshot {
  return {
    state,
    boardNames: state.board.filter((unit): unit is Unit => Boolean(unit)).map((unit) => `${beastById(unit.beastId).name}·${unit.tier}阶`),
    activeBonds: activeBonds(state).map((bond) => BOND_NAMES[bond]),
  };
}
```

- [ ] **Step 6: Run the engine tests**

Run: `npx vitest run src/apps/nine-grid/engine.test.ts`

Expected: PASS with `6 passed` and no unhandled error.

- [ ] **Step 7: Commit the deterministic rules**

```bash
git add src/apps/nine-grid/types.ts src/apps/nine-grid/content.ts src/apps/nine-grid/engine.ts src/apps/nine-grid/engine.test.ts
git commit -m "feat(nine-grid): add deterministic six-round rules"
```

### Task 2: Define responsive layout and original procedural art

**Files:**
- Create: `src/apps/nine-grid/layout.test.ts`
- Create: `src/apps/nine-grid/layout.ts`
- Create: `src/apps/nine-grid/visuals.ts`
- Create: `src/apps/nine-grid/assets/original-assets.json`
- Create: `src/apps/nine-grid/assets/ORIGINAL_ASSETS.md`

- [ ] **Step 1: Write failing layout and effect-budget tests**

Create `src/apps/nine-grid/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeBattleLayout, effectBudget } from './layout';

describe('Nine Grid layout', () => {
  it('blocks portrait instead of shrinking the board', () => {
    expect(computeBattleLayout(390, 844).mode).toBe('rotate');
  });

  it('keeps a readable 3x3 board inside compact Android landscape', () => {
    const layout = computeBattleLayout(844, 390);
    expect(layout.mode).toBe('play');
    expect(layout.cell).toBeGreaterThanOrEqual(72);
    expect(layout.boardSize).toBe(layout.cell * 3);
  });

  it('caps particles for low-end devices and full effects for stronger devices', () => {
    expect(effectBudget(2, true)).toEqual({ particles: 10, floatingLabels: 4 });
    expect(effectBudget(8, false)).toEqual({ particles: 36, floatingLabels: 10 });
  });
});
```

- [ ] **Step 2: Run the layout test and verify it fails**

Run: `npx vitest run src/apps/nine-grid/layout.test.ts`

Expected: FAIL with `Failed to load url ./layout`.

- [ ] **Step 3: Implement pure layout calculations**

Create `src/apps/nine-grid/layout.ts`:

```ts
export interface BattleLayout {
  mode: 'play' | 'rotate';
  width: number;
  height: number;
  cell: number;
  boardSize: number;
  boardX: number;
  boardY: number;
}

export function computeBattleLayout(width: number, height: number): BattleLayout {
  if (height > width) return { mode: 'rotate', width, height, cell: 0, boardSize: 0, boardX: 0, boardY: 0 };
  const cell = Math.max(72, Math.min(136, Math.floor((height - 96) / 3)));
  const boardSize = cell * 3;
  return {
    mode: 'play',
    width,
    height,
    cell,
    boardSize,
    boardX: Math.max(24, Math.floor((width - boardSize) / 2)),
    boardY: Math.max(48, Math.floor((height - boardSize) / 2)),
  };
}

export function effectBudget(hardwareConcurrency: number, reducedMotion: boolean): { particles: number; floatingLabels: number } {
  if (reducedMotion || hardwareConcurrency <= 4) return { particles: 10, floatingLabels: 4 };
  return { particles: 36, floatingLabels: 10 };
}
```

- [ ] **Step 4: Add complete project-original procedural texture generation**

Create `src/apps/nine-grid/visuals.ts`:

```ts
import Phaser from 'phaser';
import { BEASTS } from './content';
import type { EyeKind } from './types';

export function createOriginalTextures(scene: Phaser.Scene): void {
  for (const beast of BEASTS) {
    if (scene.textures.exists(beast.id)) continue;
    const graphics = scene.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x151c1a, 1).fillCircle(32, 34, 30);
    graphics.lineStyle(4, 0xc5a45a, 0.8).fillStyle(beast.color, 1);
    graphics.beginPath();
    beast.silhouette.forEach(([x, y], index) => index === 0 ? graphics.moveTo(x + 3, y + 3) : graphics.lineTo(x + 3, y + 3));
    graphics.closePath().fillPath().strokePath();
    graphics.fillStyle(0xe4ca73, 1).fillCircle(39, 26, 3);
    graphics.generateTexture(beast.id, 64, 64);
    graphics.destroy();
  }
  createEyeTexture(scene, 'eye-flame', 'flame');
  createEyeTexture(scene, 'eye-life', 'life');
  createThreatTexture(scene);
}

function createEyeTexture(scene: Phaser.Scene, key: string, kind: EyeKind): void {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const color = kind === 'flame' ? 0xd86b3d : 0x62a881;
  graphics.lineStyle(3, color, 0.95).strokeCircle(24, 24, 19);
  graphics.lineStyle(2, 0xc9aa5d, 0.8).beginPath().moveTo(24, 12).lineTo(36, 24).lineTo(24, 36).lineTo(12, 24).closePath().strokePath();
  graphics.generateTexture(key, 48, 48);
  graphics.destroy();
}

function createThreatTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('threat-core')) return;
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x381f25, 1).fillCircle(36, 36, 33);
  graphics.lineStyle(4, 0xbd684b, 1).strokeTriangle(36, 4, 67, 64, 5, 64);
  graphics.fillStyle(0xe4ca73, 1).fillCircle(36, 31, 6);
  graphics.generateTexture('threat-core', 72, 72);
  graphics.destroy();
}

export function drawRange(graphics: Phaser.GameObjects.Graphics, range: 'single' | 'row' | 'column', cell: number, x: number, y: number, size: number): void {
  const row = Math.floor(cell / 3);
  const column = cell % 3;
  graphics.clear().fillStyle(0xb7473f, 0.18).lineStyle(2, 0xdf7a59, 0.75);
  if (range === 'row') graphics.fillRect(x, y + row * size, size * 3, size).strokeRect(x, y + row * size, size * 3, size);
  else if (range === 'column') graphics.fillRect(x + column * size, y, size, size * 3).strokeRect(x + column * size, y, size, size * 3);
  else graphics.fillRect(x + column * size, y + row * size, size, size).strokeRect(x + column * size, y + row * size, size, size);
}
```

- [ ] **Step 5: Record the machine-readable original-asset inventory**

Create `src/apps/nine-grid/assets/original-assets.json`:

```json
{
  "project": "Nine Grid Beasts first playable experiment",
  "commercialUseReview": "approved-for-project-original-runtime-generation",
  "assets": [
    { "id": "cinder-horn", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "angular ember horn silhouette; bronze rim; mineral orange body", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "ore-claw", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "low ore-crab silhouette; mineral gold body", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "ink-wing", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "split-wing ink silhouette; desaturated bronze green", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "bronze-shell", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "round armored silhouette; bronze-green shell", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "mountain-tusk", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "heavy mountain-tusk silhouette; rock green body", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "jade-back", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "faceted jade-back silhouette; cool mineral green", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "spring-tail", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "flowing spring-tail silhouette; pale bronze green", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "golden-pupil", "kind": "procedural-texture", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "single-eye hooked silhouette; mineral gold body", "prompt": "none; authored as code coordinates", "modifications": "none", "use": "beast unit" },
    { "id": "eye-flame", "kind": "procedural-icon", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "orange circular formation seal", "prompt": "none; authored as code primitives", "modifications": "none", "use": "flame formation eye" },
    { "id": "eye-life", "kind": "procedural-icon", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "green circular formation seal", "prompt": "none; authored as code primitives", "modifications": "none", "use": "life formation eye" },
    { "id": "threat-core", "kind": "procedural-icon", "source": "src/apps/nine-grid/visuals.ts", "license": "project-original", "design": "red-black triangular threat marker", "prompt": "none; authored as code primitives", "modifications": "none", "use": "enemy threat" },
    { "id": "ui-font", "kind": "system-font-stack", "source": "local operating system", "license": "not redistributed", "design": "system sans-serif", "prompt": "none", "modifications": "none", "use": "interface text" },
    { "id": "audio", "kind": "none", "source": "none", "license": "not applicable", "design": "first playable ships without music or sound files", "prompt": "none", "modifications": "none", "use": "none" }
  ]
}
```

- [ ] **Step 6: Record the human original-asset review checklist**

Create `src/apps/nine-grid/assets/ORIGINAL_ASSETS.md`:

```markdown
# Nine Grid Beasts original-asset review

- [x] All eight beast names, silhouettes, coordinates, colors, skills, and labels were authored for this project.
- [x] Formation-eye and threat icons use project-authored geometric primitives.
- [x] No screenshot, icon, board, character, equipment, shop, bond badge, UI hierarchy, value table, music, or sound from TFT, 金铲铲之战, another modern 山海经 work, or another game is included.
- [x] The public-domain 山海经 theme is only a cultural starting point; the shipped expression is newly authored.
- [x] The runtime has no remote image, font, audio, or tracking dependency in this app directory.
- [x] `original-assets.json` records source, license, design notes, modification history, and final use for every shipped asset category.
- [x] The working title requires store, search-engine, domain, and China trademark review before paid commercial release.
```

- [ ] **Step 7: Run layout tests**

Run: `npx vitest run src/apps/nine-grid/layout.test.ts`

Expected: PASS with `3 passed`.

- [ ] **Step 8: Validate the asset inventory**

Run: `node -e "const m=require('./src/apps/nine-grid/assets/original-assets.json'); if(m.assets.length!==14||m.assets.some(x=>!x.source||!x.license||!x.use)) process.exit(1); console.log('asset inventory ok')"`

Expected: prints `asset inventory ok` and exits 0.

- [ ] **Step 9: Commit layout and original assets**

```bash
git add src/apps/nine-grid/layout.ts src/apps/nine-grid/layout.test.ts src/apps/nine-grid/visuals.ts src/apps/nine-grid/assets/original-assets.json src/apps/nine-grid/assets/ORIGINAL_ASSETS.md
git commit -m "feat(nine-grid): add responsive layout and original art"
```

### Task 3: Render readable Phaser auto-combat

**Files:**
- Create: `src/apps/nine-grid/NineGridScene.ts`

- [ ] **Step 1: Add the complete battle-only Phaser scene**

Create `src/apps/nine-grid/NineGridScene.ts`:

```ts
import Phaser from 'phaser';
import { beastById } from './content';
import { computeBattleLayout, effectBudget } from './layout';
import type { GameState, Unit } from './types';
import { createOriginalTextures, drawRange } from './visuals';

export interface BattleSceneData {
  state: GameState;
  onFinished: () => void;
}

export class NineGridScene extends Phaser.Scene {
  private payload: BattleSceneData | null = null;
  private finishTimer: Phaser.Time.TimerEvent | null = null;
  private finished = false;

  constructor() {
    super('nine-grid-battle');
  }

  init(data: BattleSceneData): void {
    this.payload = data;
    this.finished = false;
  }

  create(): void {
    if (!this.payload) throw new Error('Battle scene requires state');
    createOriginalTextures(this);
    const { width, height } = this.scale;
    const layout = computeBattleLayout(width, height);
    this.cameras.main.setBackgroundColor('#101615');
    if (layout.mode === 'rotate') return;
    const range = this.add.graphics().setDepth(0);
    drawRange(range, this.payload.state.threat.range, this.payload.state.threat.cell, layout.boardX, layout.boardY, layout.cell);
    const grid = this.add.graphics().lineStyle(2, 0x77917f, 0.75).setDepth(1);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        grid.strokeRoundedRect(layout.boardX + column * layout.cell + 4, layout.boardY + row * layout.cell + 4, layout.cell - 8, layout.cell - 8, 12);
      }
    }
    for (const eye of this.payload.state.eyes) {
      const point = this.cellCenter(eye.cell, layout.boardX, layout.boardY, layout.cell);
      this.add.image(point.x, point.y, `eye-${eye.kind}`).setAlpha(0.72).setDisplaySize(layout.cell * 0.48, layout.cell * 0.48).setDepth(2);
    }
    this.payload.state.board.forEach((unit, cell) => {
      if (unit) this.addUnit(unit, cell, layout.boardX, layout.boardY, layout.cell);
    });
    const enemyCell = this.cellCenter(this.payload.state.threat.cell, layout.boardX, layout.boardY, layout.cell);
    const enemy = this.add.image(enemyCell.x, Math.max(38, layout.boardY - 30), 'threat-core').setDepth(4);
    this.add.text(enemy.x, enemy.y + 44, this.payload.state.threat.name, { color: '#e8c97a', fontSize: '15px' }).setOrigin(0.5).setDepth(5);
    this.animateCombat(enemy, layout.boardX, layout.boardY, layout.cell);
  }

  private addUnit(unit: Unit, cell: number, x: number, y: number, size: number): void {
    const point = this.cellCenter(cell, x, y, size);
    const beast = beastById(unit.beastId);
    const sprite = this.add.image(point.x, point.y, beast.id).setDisplaySize(size * 0.58, size * 0.58).setDepth(4).setName(unit.uid);
    this.add.text(point.x, point.y + size * 0.34, `${beast.name} · ${unit.tier}阶`, { color: '#f2e3b3', fontSize: `${Math.max(12, Math.floor(size / 8))}px`, backgroundColor: '#101615cc', padding: { x: 5, y: 2 } }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: sprite, y: point.y - 5, duration: 520, yoyo: true, repeat: 3, ease: 'Sine.inOut' });
  }

  private animateCombat(enemy: Phaser.GameObjects.Image, x: number, y: number, size: number): void {
    if (!this.payload?.state.combat) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const budget = effectBudget(navigator.hardwareConcurrency || 4, reducedMotion);
    const units = this.payload.state.board.filter((unit): unit is Unit => Boolean(unit));
    units.slice(0, budget.floatingLabels).forEach((unit, index) => {
      const sprite = this.children.getByName(unit.uid) as Phaser.GameObjects.Image | null;
      if (!sprite) return;
      this.time.delayedCall(350 + index * 260, () => {
        const beam = this.add.graphics().lineStyle(3, beastById(unit.beastId).color, 0.95).setDepth(3);
        beam.lineBetween(sprite.x, sprite.y, enemy.x, enemy.y);
        this.tweens.add({ targets: beam, alpha: 0, duration: 340, onComplete: () => beam.destroy() });
        const damage = this.add.text(enemy.x + (index % 2 ? 22 : -22), enemy.y - 16, `-${beastById(unit.beastId).attack * unit.tier}`, { color: '#ffd475', fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
        this.tweens.add({ targets: damage, y: damage.y - 35, alpha: 0, duration: 620, onComplete: () => damage.destroy() });
      });
    });
    for (let index = 0; index < budget.particles; index += 1) {
      this.time.delayedCall(800 + index * 24, () => {
        const fleck = this.add.circle(enemy.x, enemy.y, 2 + index % 3, index % 2 ? 0xc9a75d : 0x5b8d75, 0.8).setDepth(3);
        this.tweens.add({ targets: fleck, x: enemy.x + ((index * 37) % 90) - 45, y: enemy.y + ((index * 53) % 70) - 35, alpha: 0, duration: 500, onComplete: () => fleck.destroy() });
      });
    }
    const result = this.payload.state.combat;
    this.time.delayedCall(2450, () => {
      this.add.text(this.scale.width / 2, this.scale.height - 42, result.outcome === 'victory' ? '本轮胜利' : '本轮失守', { color: result.outcome === 'victory' ? '#dfc36c' : '#df8066', fontSize: '26px', fontStyle: 'bold', backgroundColor: '#101615dd', padding: { x: 16, y: 8 } }).setOrigin(0.5).setDepth(8);
    });
    this.finishTimer = this.time.delayedCall(3200, () => this.finishOnce());
  }

  private cellCenter(cell: number, x: number, y: number, size: number): { x: number; y: number } {
    return { x: x + (cell % 3) * size + size / 2, y: y + Math.floor(cell / 3) * size + size / 2 };
  }

  private finishOnce(): void {
    if (this.finished || !this.payload) return;
    this.finished = true;
    this.payload.onFinished();
  }

  shutdown(): void {
    this.finishTimer?.remove(false);
    this.finishTimer = null;
    this.payload = null;
  }
}
```

- [ ] **Step 2: Type-check the Phaser scene against strict mode**

Run: `npx tsc --noEmit`

Expected: exits 0 with no TypeScript diagnostic in `src/apps/nine-grid/NineGridScene.ts`.

- [ ] **Step 3: Commit the battle renderer**

```bash
git add src/apps/nine-grid/NineGridScene.ts
git commit -m "feat(nine-grid): render readable auto combat"
```

### Task 4: Add the public mount contract, reliable controls, analytics, and lifecycle behavior

**Files:**
- Create: `src/apps/nine-grid/index.test.ts`
- Create: `src/apps/nine-grid/controller.ts`
- Create: `src/apps/nine-grid/index.ts`
- Modify: `src/apps/nine-grid/mount.ts`
- Create: `src/apps/nine-grid/nine-grid.css`

- [ ] **Step 1: Write failing mount, event, orientation, lifecycle, and cleanup tests**

Create `src/apps/nine-grid/index.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsClient, AnalyticsEventName } from '../../shared/analytics';

const destroy = vi.fn();
const pause = vi.fn();
const resume = vi.fn();
const start = vi.fn((_key: string, data: { onFinished: () => void }) => data.onFinished());

vi.mock('phaser', () => ({
  default: {
    AUTO: 0,
    Scale: { RESIZE: 0, CENTER_BOTH: 0 },
    Scene: class {},
    Game: class {
      scene = { start, pause, resume };
      destroy = destroy;
    },
  },
}));

vi.mock('./NineGridScene', () => ({ NineGridScene: class {} }));

function analytics() {
  const events: AnalyticsEventName[] = [];
  const client: AnalyticsClient = {
    track: vi.fn((name: AnalyticsEventName) => events.push(name)),
    flush: vi.fn(async () => undefined),
  };
  return { client, events };
}

async function loadMount() {
  return (await import('./mount')).mountNineGrid;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('mountNineGrid', () => {
  it('re-exports the finished app through the platform route seam and emits game_view once', async () => {
    const root = document.createElement('main');
    document.body.append(root);
    const log = analytics();
    const mountNineGrid = await loadMount();
    const unmount = await mountNineGrid(root, log.client);
    expect(unmount).toBeTypeOf('function');
    expect(log.events).toEqual(['game_view']);
    unmount();
    expect(destroy).toHaveBeenCalledWith(true);
    expect(root.innerHTML).toBe('');
  });

  it('emits the approved main-loop events in order without awaiting analytics', async () => {
    const root = document.createElement('main');
    document.body.append(root);
    const log = analytics();
    const mountNineGrid = await loadMount();
    const unmount = await mountNineGrid(root, log.client);
    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="recruit"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="unit"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="cell"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="lock"]')?.click();
    expect(log.events).toEqual(expect.arrayContaining(['game_view', 'game_start', 'round_start', 'unit_recruit', 'unit_place', 'formation_lock', 'round_result']));
    unmount();
  });

  it('blocks portrait, pauses in background, resumes in foreground, and flushes on hide', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    const root = document.createElement('main');
    document.body.append(root);
    const log = analytics();
    const mountNineGrid = await loadMount();
    const unmount = await mountNineGrid(root, log.client);
    window.dispatchEvent(new Event('resize'));
    expect(root.querySelector('[data-role="rotate"]')?.getAttribute('aria-hidden')).toBe('false');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pause).toHaveBeenCalled();
    expect(log.client.flush).toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(resume).toHaveBeenCalled();
    unmount();
  });
});
```

- [ ] **Step 2: Run the mount tests and verify the missing entry failure**

Run: `npx vitest run src/apps/nine-grid/index.test.ts`

Expected: FAIL with `Failed to load url ./index`.

- [ ] **Step 3: Implement the complete DOM controller and approved event mapping**

Create `src/apps/nine-grid/controller.ts`:

```ts
import type Phaser from 'phaser';
import type { AnalyticsClient, AnalyticsEventName } from '../../shared/analytics';
import { BOND_NAMES, beastById } from './content';
import { activeBonds, chooseAugment, createGame, finishBattle, lockFormation, placeUnit, recruit, restartGame } from './engine';
import type { GameState, Unit } from './types';

const EXPERIMENT = 'nine-grid-beasts';

export class NineGridController {
  private state = createGame(Date.now() >>> 0);
  private started = false;
  private selectedUid: string | null = null;
  private firstBattleTimer: number | null = null;
  private readonly onClick = (event: Event) => this.handleClick(event);
  private readonly onVisibility = () => this.handleVisibility();
  private readonly onResize = () => this.renderOrientation();

  constructor(private readonly root: HTMLElement, private readonly analytics: AnalyticsClient, private readonly game: Phaser.Game) {}

  mount(): void {
    this.root.addEventListener('click', this.onClick);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('resize', this.onResize);
    this.track('game_view', { page: '/nine-grid-beasts' });
    this.render();
  }

  destroy(): void {
    if (this.firstBattleTimer !== null) window.clearTimeout(this.firstBattleTimer);
    this.root.removeEventListener('click', this.onClick);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('resize', this.onResize);
    this.game.destroy(true);
    this.root.replaceChildren();
  }

  private track(name: AnalyticsEventName, properties: Record<string, string | number | boolean> = {}): void {
    this.analytics.track(name, { experiment: EXPERIMENT, ...properties });
  }

  private startRun(): void {
    if (this.started) return;
    this.started = true;
    this.track('game_start', { seed: this.state.seed });
    this.track('round_start', { round: 1, boss: false });
    this.firstBattleTimer = window.setTimeout(() => this.forceFirstBattle(), 25_000);
    this.render();
  }

  private forceFirstBattle(): void {
    if (!this.started || this.state.round !== 1 || this.state.phase === 'battle' || this.state.phase === 'augment' || this.state.phase === 'complete') return;
    if (this.state.phase === 'recruit') {
      const beastId = this.state.candidates[0];
      this.state = recruit(this.state, beastId);
      this.track('unit_recruit', { round: 1, beast_id: beastId, resonance: false, forced: true });
    }
    const unit = this.state.bench[0];
    if (unit) {
      const cell = this.state.eyes[0].cell;
      this.state = placeUnit(this.state, unit.uid, cell);
      this.track('unit_place', { round: 1, beast_id: unit.beastId, cell, forced: true });
    }
    this.beginBattle(true);
  }

  private handleClick(event: Event): void {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'start') this.startRun();
    if (action === 'recruit' && button.dataset.beastId) this.recruitUnit(button.dataset.beastId);
    if (action === 'unit' && button.dataset.uid) { this.selectedUid = button.dataset.uid; this.render(); }
    if (action === 'cell' && button.dataset.cell) this.placeSelected(Number(button.dataset.cell));
    if (action === 'lock') this.beginBattle(false);
    if (action === 'augment' && button.dataset.augmentId) this.pickAugment(button.dataset.augmentId);
    if (action === 'replay') this.replay();
  }

  private recruitUnit(beastId: string): void {
    const before = [...this.state.board, ...this.state.bench].filter((unit): unit is Unit => Boolean(unit)).find((unit) => unit.beastId === beastId && unit.tier === 1);
    this.state = recruit(this.state, beastId);
    this.selectedUid = this.state.selectedUid;
    this.track('unit_recruit', { round: this.state.round, beast_id: beastId, resonance: Boolean(before), forced: false });
    this.render();
  }

  private placeSelected(cell: number): void {
    if (!this.selectedUid) return;
    const unit = [...this.state.board, ...this.state.bench].find((entry) => entry?.uid === this.selectedUid);
    if (!unit) return;
    try {
      this.state = placeUnit(this.state, this.selectedUid, cell);
      this.track('unit_place', { round: this.state.round, beast_id: unit.beastId, cell, forced: false });
      this.selectedUid = null;
      this.render();
    } catch (error) {
      this.render(error instanceof Error ? error.message : '无法放置');
    }
  }

  private beginBattle(forced: boolean): void {
    try {
      if (this.firstBattleTimer !== null) window.clearTimeout(this.firstBattleTimer);
      this.state = lockFormation(this.state);
      this.track('formation_lock', { round: this.state.round, units: this.state.board.filter(Boolean).length, forced });
      this.render();
      this.game.scene.start('nine-grid-battle', { state: this.state, onFinished: () => this.finishCurrentBattle() });
    } catch (error) {
      this.render(error instanceof Error ? error.message : '无法锁定阵型');
    }
  }

  private finishCurrentBattle(): void {
    const combat = this.state.combat;
    if (!combat || this.state.phase !== 'battle') return;
    this.track('round_result', { round: this.state.round, outcome: combat.outcome, player_power: combat.playerPower, enemy_power: combat.enemyPower, boss: this.state.round === 6 });
    this.state = finishBattle(this.state);
    if (this.state.phase === 'complete') {
      this.track('game_complete', { outcome: this.state.wins >= this.state.losses ? 'victory' : 'defeat', rounds: 6, wins: this.state.wins, losses: this.state.losses });
      void this.analytics.flush();
    }
    this.render();
  }

  private pickAugment(augmentId: string): void {
    this.state = chooseAugment(this.state, augmentId);
    this.track('round_start', { round: this.state.round, boss: this.state.round === 6 });
    this.render();
  }

  private replay(): void {
    this.track('replay_click', { previous_wins: this.state.wins, previous_losses: this.state.losses });
    this.state = restartGame(this.state);
    this.started = true;
    this.track('game_start', { seed: this.state.seed, replay: true });
    this.track('round_start', { round: 1, boss: false, replay: true });
    this.firstBattleTimer = window.setTimeout(() => this.forceFirstBattle(), 25_000);
    this.render();
  }

  private handleVisibility(): void {
    if (document.visibilityState === 'hidden') {
      this.game.scene.pause('nine-grid-battle');
      void this.analytics.flush();
    } else {
      this.game.scene.resume('nine-grid-battle');
    }
  }

  private render(message = ''): void {
    const board = this.state.board.map((unit, cell) => this.renderCell(unit, cell)).join('');
    const bonds = activeBonds(this.state).map((bond) => BOND_NAMES[bond]).join('、') || '尚未激活';
    this.root.innerHTML = `
      <section class="nine-grid" data-phase="${this.state.phase}">
        <div class="nine-grid__rotate" data-role="rotate" aria-hidden="true"><span aria-hidden="true">↻</span><strong>请旋转为横屏</strong><small>九格棋盘仅在横屏运行</small></div>
        <header class="nine-grid__header"><div><p>原创异兽构筑实验</p><h1>九格异兽</h1></div><div class="nine-grid__round">第 ${this.state.round}/6 轮${this.state.round === 6 ? ' · Boss' : ''}</div></header>
        <div class="nine-grid__status" role="status">${message || this.phaseMessage()}</div>
        ${this.started ? `<main class="nine-grid__play"><aside>${this.renderRecruitOrAugment()}</aside><section><div class="nine-grid__threat"><strong>${this.state.threat.name}</strong><span>威胁格 ${this.state.threat.cell + 1} · ${this.rangeName()}</span></div><div class="nine-grid__board" aria-label="3乘3九格阵型">${board}</div><div class="nine-grid__bench">${this.state.bench.map((unit) => this.renderUnitButton(unit)).join('')}</div></section><aside><h2>本轮复盘</h2><p>羁绊：${bonds}</p>${this.state.combat ? this.state.combat.lines.map((line) => `<p>${line}</p>`).join('') : '<p>锁阵后显示羁绊、阵眼与站位贡献。</p>'}${this.renderPrimaryAction()}</aside></main>` : `<div class="nine-grid__intro"><p>三选一招募，点选异兽后再点格子。每轮公开阵眼与敌方威胁，六轮约 10–12 分钟。</p><button data-action="start" class="nine-grid__primary">开始构筑</button></div>`}
        <div class="nine-grid__canvas" data-role="canvas"></div>
      </section>`;
    this.renderOrientation();
  }

  private renderCell(unit: Unit | null, cell: number): string {
    const eye = this.state.eyes.find((entry) => entry.cell === cell);
    const selected = unit?.uid === this.selectedUid;
    return `<div class="nine-grid__cell${selected ? ' is-selected' : ''}">${eye ? `<span class="nine-grid__eye is-${eye.kind}">${eye.kind === 'flame' ? '烈' : '生'}</span>` : ''}<button data-action="cell" data-cell="${cell}" class="nine-grid__cell-target" aria-label="格子 ${cell + 1}${eye ? `，${eye.kind === 'flame' ? '烈阵眼' : '生阵眼'}` : ''}">${unit ? '<span class="nine-grid__occupied">选择此格</span>' : '<span class="nine-grid__empty">空位</span>'}</button>${unit ? this.renderUnitButton(unit) : ''}</div>`;
  }

  private renderUnitButton(unit: Unit): string {
    const beast = beastById(unit.beastId);
    return `<button data-action="unit" data-uid="${unit.uid}" class="nine-grid__unit${this.selectedUid === unit.uid ? ' is-selected' : ''}"><span class="nine-grid__sigil" style="--beast:#${beast.color.toString(16).padStart(6, '0')}"></span><strong>${beast.name} · ${unit.tier}阶</strong><small>${BOND_NAMES[beast.bond]} · ${beast.skillName}</small></button>`;
  }

  private renderRecruitOrAugment(): string {
    if (this.state.phase === 'augment') return `<h2>选择强化</h2>${this.state.augmentChoices.map((augment) => `<button data-action="augment" data-augment-id="${augment.id}" class="nine-grid__choice"><strong>${augment.name}</strong><small>${augment.text}</small></button>`).join('')}`;
    return `<h2>三选一招募</h2>${this.state.candidates.map((id) => { const beast = beastById(id); return `<button data-action="recruit" data-beast-id="${id}" class="nine-grid__choice" ${this.state.phase !== 'recruit' ? 'disabled' : ''}><strong>${beast.name}</strong><small>${BOND_NAMES[beast.bond]} · ${beast.skillText}</small></button>`; }).join('')}`;
  }

  private renderPrimaryAction(): string {
    if (this.state.phase === 'formation') return '<button data-action="lock" class="nine-grid__primary">锁定阵型并战斗</button>';
    if (this.state.phase === 'complete') return `<div class="nine-grid__settlement"><strong>${this.state.wins >= this.state.losses ? '异兽阵成' : '深渊未破'}</strong><span>${this.state.wins} 胜 · ${this.state.losses} 负</span></div><button data-action="replay" class="nine-grid__primary">新种子立即重开</button>`;
    return '';
  }

  private phaseMessage(): string {
    if (this.state.phase === 'recruit') return '选择一只异兽；同种两只会共鸣为二阶。';
    if (this.state.phase === 'formation') return '点选异兽，再点选九格位置；最多上阵五只。';
    if (this.state.phase === 'battle') return '自动战斗中：攻击来源、目标、范围与伤害均显示在棋盘。';
    if (this.state.phase === 'augment') return `${this.state.lastOutcome === 'victory' ? '本轮胜利' : '本轮失守'}；选择一项强化。`;
    return `${this.state.lastOutcome === 'victory' ? '本轮胜利' : '本轮失守'}；完整六轮已结算，可立即用新种子重开。`;
  }

  private rangeName(): string {
    return this.state.threat.range === 'row' ? '横排攻击' : this.state.threat.range === 'column' ? '纵列攻击' : '单格攻击';
  }

  private renderOrientation(): void {
    const rotate = this.root.querySelector<HTMLElement>('[data-role="rotate"]');
    if (!rotate) return;
    const portrait = window.innerHeight > window.innerWidth;
    rotate.setAttribute('aria-hidden', String(!portrait));
    this.root.querySelector('.nine-grid')?.classList.toggle('is-portrait', portrait);
    this.root.parentElement?.classList.toggle('is-portrait', portrait);
  }
}
```

- [ ] **Step 4: Implement the exact platform mount/unmount adapter**

Create `src/apps/nine-grid/index.ts`:

```ts
import Phaser from 'phaser';
import type { AnalyticsClient } from '../../shared/analytics';
import { NineGridScene } from './NineGridScene';
import { NineGridController } from './controller';
import './nine-grid.css';

export async function mountNineGrid(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void> {
  root.replaceChildren();
  const shell = document.createElement('div');
  shell.className = 'nine-grid-host';
  root.append(shell);
  const canvasHost = document.createElement('div');
  canvasHost.className = 'nine-grid-canvas-host';
  const controllerHost = document.createElement('div');
  controllerHost.className = 'nine-grid-ui-host';
  shell.append(canvasHost, controllerHost);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasHost,
    transparent: true,
    scene: [NineGridScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: '100%', height: '100%' },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60, min: 30 },
  });
  const controller = new NineGridController(controllerHost, analytics, game);
  controller.mount();
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    controller.destroy();
    root.replaceChildren();
  };
}

export type { AnalyticsClient } from '../../shared/analytics';
```

- [ ] **Step 5: Replace the platform placeholder with the exact finished-app re-export**

Replace the complete contents of `src/apps/nine-grid/mount.ts` with:

```ts
export { mountNineGrid } from "./index";
```

This step must finish before any E2E command. The platform router continues importing its stable `src/apps/nine-grid/mount.ts` seam, while that seam now resolves the real implementation instead of the placeholder page.

- [ ] **Step 6: Add the complete scoped visual and orientation CSS**

Create `src/apps/nine-grid/nine-grid.css`:

```css
.nine-grid-host { position: relative; min-height: 100dvh; color: #f0e3b7; background: radial-gradient(circle at 50% 20%, #244138 0, #121b18 48%, #090d0c 100%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; overflow: hidden; }
.nine-grid { position: relative; min-height: 100dvh; padding: max(14px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left)); box-sizing: border-box; }
.nine-grid button { font: inherit; color: inherit; }
.nine-grid button:focus-visible { outline: 3px solid #e1bd65; outline-offset: 3px; }
.nine-grid__header { display: flex; align-items: center; justify-content: space-between; height: 66px; position: relative; z-index: 20; }
.nine-grid__header p { margin: 0; color: #8fb59f; font-size: 12px; letter-spacing: .16em; }
.nine-grid__header h1 { margin: 2px 0 0; font-family: Georgia, 'Noto Serif SC', serif; font-size: clamp(24px, 3vw, 38px); letter-spacing: .12em; }
.nine-grid__round { border: 1px solid #7f9b86; border-radius: 999px; padding: 8px 15px; background: #14221ed9; }
.nine-grid__status { position: relative; z-index: 20; min-height: 20px; margin: 2px auto 10px; text-align: center; color: #c8d4c8; }
.nine-grid__play { display: grid; grid-template-columns: minmax(180px, 22vw) minmax(330px, 1fr) minmax(190px, 23vw); gap: clamp(10px, 2vw, 26px); position: relative; z-index: 20; height: calc(100dvh - 116px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
.nine-grid__play > aside { min-width: 0; overflow: auto; border: 1px solid #405f50; border-radius: 16px; padding: 14px; background: #101a17e8; box-shadow: inset 0 0 40px #080d0b88; }
.nine-grid__play > section { display: flex; flex-direction: column; min-width: 0; align-items: center; }
.nine-grid h2 { margin: 0 0 10px; color: #d4b760; font-family: Georgia, 'Noto Serif SC', serif; font-size: 18px; }
.nine-grid__choice, .nine-grid__unit { display: flex; width: 100%; flex-direction: column; align-items: flex-start; gap: 3px; margin: 0 0 8px; border: 1px solid #547261; border-radius: 12px; padding: 10px; background: linear-gradient(135deg, #20362e, #13201c); cursor: pointer; }
.nine-grid__choice:hover:not(:disabled), .nine-grid__unit:hover { border-color: #d0ad58; transform: translateY(-1px); }
.nine-grid__choice:disabled { opacity: .45; cursor: default; }
.nine-grid__choice small, .nine-grid__unit small { color: #9fb5a8; text-align: left; }
.nine-grid__threat { display: flex; gap: 12px; align-items: baseline; margin-bottom: 8px; color: #df8066; }
.nine-grid__threat span { color: #bcaaa2; font-size: 13px; }
.nine-grid__board { display: grid; grid-template-columns: repeat(3, minmax(72px, 1fr)); width: min(49vh, 42vw); aspect-ratio: 1; border: 2px solid #79917e; border-radius: 17px; background: linear-gradient(135deg, #173128, #101817); box-shadow: 0 18px 60px #0009, inset 0 0 60px #3b71502e; }
.nine-grid__cell { position: relative; min-width: 0; border: 1px solid #496655; background: #15251f99; }
.nine-grid__cell-target { position: absolute; inset: 0; width: 100%; border: 0; background: transparent; cursor: pointer; }
.nine-grid__cell:nth-child(1) { border-radius: 14px 0 0; }
.nine-grid__cell:nth-child(3) { border-radius: 0 14px 0 0; }
.nine-grid__cell:nth-child(7) { border-radius: 0 0 0 14px; }
.nine-grid__cell:nth-child(9) { border-radius: 0 0 14px; }
.nine-grid__cell:hover, .nine-grid__cell.is-selected { background: #2a493b; box-shadow: inset 0 0 0 2px #d3b35d; }
.nine-grid__cell .nine-grid__unit { position: absolute; inset: 7%; width: 86%; height: 86%; justify-content: center; align-items: center; margin: 0; padding: 5px; text-align: center; }
.nine-grid__cell .nine-grid__unit small { display: none; }
.nine-grid__eye { position: absolute; top: 4px; right: 5px; z-index: 3; display: grid; width: 26px; height: 26px; place-items: center; border-radius: 50%; font-weight: 800; }
.nine-grid__eye.is-flame { color: #ffd0a0; border: 1px solid #dd7245; background: #7b2f21; }
.nine-grid__eye.is-life { color: #c6f1d9; border: 1px solid #6aac85; background: #245f43; }
.nine-grid__empty { color: #6e8879; font-size: 12px; }
.nine-grid__occupied { position: absolute; inset: 0; overflow: hidden; color: transparent; }
.nine-grid__sigil { width: 28px; height: 28px; border: 2px solid #d0ad58; border-radius: 45% 55% 58% 42%; background: radial-gradient(circle at 65% 35%, #e4ca73 0 7%, var(--beast) 8% 65%, #111 66%); }
.nine-grid__bench { display: flex; gap: 8px; width: min(56vh, 48vw); min-height: 60px; margin-top: 8px; }
.nine-grid__bench .nine-grid__unit { width: 140px; margin: 0; }
.nine-grid__primary { display: block; width: 100%; margin-top: 14px; border: 1px solid #e0bd63; border-radius: 12px; padding: 12px 14px; color: #111713; font-weight: 800; background: linear-gradient(135deg, #e3c56e, #a78336); cursor: pointer; }
.nine-grid__intro { position: relative; z-index: 20; width: min(620px, 80vw); margin: 15vh auto 0; border: 1px solid #66816f; border-radius: 20px; padding: 28px; background: #101b18ee; text-align: center; box-shadow: 0 20px 90px #000b; }
.nine-grid__settlement { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; border-top: 1px solid #496655; padding-top: 14px; color: #dfc36c; }
.nine-grid__canvas, .nine-grid-canvas-host { position: absolute; inset: 0; pointer-events: none; }
.nine-grid-canvas-host { z-index: 10; }
.nine-grid[data-phase='battle'] .nine-grid__play { visibility: hidden; }
.nine-grid__rotate { display: none; position: fixed; inset: 0; z-index: 100; place-content: center; gap: 12px; background: radial-gradient(circle, #213c32, #0b100e 72%); text-align: center; }
.nine-grid__rotate span { color: #d6b75e; font-size: 70px; }
.nine-grid__rotate strong { font-size: 28px; }
.nine-grid__rotate small { color: #9fb5a8; }
.nine-grid.is-portrait .nine-grid__rotate { display: grid; }
.nine-grid.is-portrait > :not(.nine-grid__rotate) { visibility: hidden; }
.nine-grid-host.is-portrait .nine-grid-canvas-host { display: none; }
@media (max-height: 500px) { .nine-grid__header { height: 48px; } .nine-grid__header h1 { font-size: 24px; } .nine-grid__status { margin-bottom: 5px; font-size: 13px; } .nine-grid__play { height: calc(100dvh - 82px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); } .nine-grid__play > aside { padding: 10px; } .nine-grid__choice { padding: 7px; } .nine-grid__board { width: min(63vh, 43vw); } }
@media (prefers-reduced-motion: reduce) { .nine-grid *, .nine-grid *::before, .nine-grid *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
```

- [ ] **Step 7: Run mount tests through the platform route seam**

Run: `npx vitest run src/apps/nine-grid/index.test.ts`

Expected: PASS with `3 passed`; importing `./mount` reaches the real `mountNineGrid`, and the mock verifies one `game_view`, main-loop events, portrait block, pause/resume, flush, and idempotent teardown.

- [ ] **Step 8: Run the complete Nine Grid unit suite**

Run: `npx vitest run src/apps/nine-grid/*.test.ts`

Expected: PASS with `12 passed` across three test files.

- [ ] **Step 9: Commit the public application boundary and route seam together**

```bash
git add src/apps/nine-grid/controller.ts src/apps/nine-grid/index.ts src/apps/nine-grid/mount.ts src/apps/nine-grid/index.test.ts src/apps/nine-grid/nine-grid.css
git commit -m "feat(nine-grid): add mount controls analytics and lifecycle"
```

### Task 5: Verify a full run, immediate replay, browsers, lifecycle, and performance

**Files:**
- Create: `tests/e2e/nine-grid.spec.ts`

- [ ] **Step 1: Write the complete failing browser acceptance suite**

Create `tests/e2e/nine-grid.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function start(page: Page): Promise<void> {
  await page.goto('/nine-grid-beasts?utm_source=e2e&utm_campaign=nine-grid-acceptance');
  await page.getByRole('button', { name: '开始构筑' }).click();
}

async function playRound(page: Page, round: number): Promise<void> {
  await expect(page.getByText(`第 ${round}/6 轮`, { exact: false })).toBeVisible();
  await page.locator('button[data-action="recruit"]:not([disabled])').first().click();
  const bench = page.locator('.nine-grid__bench button[data-action="unit"]');
  if (await bench.count()) {
    await bench.first().click();
    const emptyCell = page.locator('button[data-action="cell"]', { has: page.locator('.nine-grid__empty') }).first();
    if (await emptyCell.count()) await emptyCell.click();
  }
  await page.getByRole('button', { name: '锁定阵型并战斗' }).click();
  await expect(page.getByText(/本轮胜利|本轮失守/)).toBeVisible({ timeout: 8_000 });
  if (round < 6) {
    await expect(page.getByRole('heading', { name: '选择强化' })).toBeVisible({ timeout: 8_000 });
    await page.locator('button[data-action="augment"]').first().click();
  }
}

test('desktop Chrome completes six rounds and immediately replays with a new seed', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  for (let round = 1; round <= 6; round += 1) await playRound(page, round);
  await expect(page.getByText(/6 胜|5 胜|4 胜|3 胜|2 胜|1 胜|0 胜/)).toBeVisible();
  await page.getByRole('button', { name: '新种子立即重开' }).click();
  await expect(page.getByText('第 1/6 轮', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Android landscape keeps every main control visible and pauses safely in background', async ({ page, context }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await start(page);
  await expect(page.locator('[data-role="rotate"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: '锁定阵型并战斗' })).not.toBeVisible();
  await page.locator('button[data-action="recruit"]').first().click();
  await page.locator('.nine-grid__bench button[data-action="unit"]').first().click();
  await page.locator('button[data-action="cell"]').first().click();
  await expect(page.getByRole('button', { name: '锁定阵型并战斗' })).toBeInViewport();
  const other = await context.newPage();
  await other.goto('about:blank');
  await page.bringToFront();
  await expect(page.locator('.nine-grid')).toHaveAttribute('data-phase', 'formation');
});

test('iPhone portrait shows only the explicit rotate instruction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nine-grid-beasts');
  await expect(page.getByText('请旋转为横屏')).toBeVisible();
  await expect(page.locator('[data-role="rotate"]')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.getByRole('button', { name: '开始构筑' })).not.toBeVisible();
});

test('first battle starts no later than 30 seconds when the player waits', async ({ page }) => {
  await page.clock.install();
  await start(page);
  await page.clock.fastForward('25:100');
  await expect(page.locator('.nine-grid')).toHaveAttribute('data-phase', /battle|augment/);
});

test('battle animation stays responsive under a low-end effect budget', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 2 });
  });
  await start(page);
  await page.locator('button[data-action="recruit"]').first().click();
  await page.locator('.nine-grid__bench button[data-action="unit"]').first().click();
  await page.locator('button[data-action="cell"]').first().click();
  const frames = await page.evaluate(async () => {
    const samples: number[] = [];
    let previous = performance.now();
    for (let index = 0; index < 30; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const now = performance.now();
      samples.push(now - previous);
      previous = now;
    }
    return samples;
  });
  expect(frames.filter((duration) => duration > 100)).toHaveLength(0);
});
```

- [ ] **Step 2: Verify the stable platform route seam cannot open the placeholder page**

Run: `node -e "const fs=require('fs');const path='src/apps/nine-grid/mount.ts';const actual=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');const expected='export { mountNineGrid } from \"./index\";\n';if(actual!==expected)throw new Error(path+' must exactly re-export the finished app mount');console.log('nine-grid route seam ok')"`

Expected: prints `nine-grid route seam ok` and exits 0. A placeholder renderer, local fallback, extra export, or stale stub fails before Playwright opens `/nine-grid-beasts`.

- [ ] **Step 3: Run Chromium acceptance through the finished platform route seam**

Run: `npx playwright test tests/e2e/nine-grid.spec.ts --project=chromium`

Expected: PASS with `5 passed`; `/nine-grid-beasts` shows `开始构筑` rather than the placeholder, the full six-round run finishes, replay returns to round one, portrait is blocked, the 25-second fallback starts battle, background switching preserves legal state, no console/page error appears, and no sampled frame exceeds 100 ms on the low-end budget.

- [ ] **Step 4: Run all configured browser projects**

Run: `npx playwright test tests/e2e/nine-grid.spec.ts`

Expected: PASS in every browser project configured by the platform. If the platform intentionally configures Chromium only, output still reports `5 passed` without skipped Nine Grid cases.

- [ ] **Step 5: Commit browser acceptance**

```bash
git add tests/e2e/nine-grid.spec.ts
git commit -m "test(nine-grid): cover full run replay orientation and performance"
```

### Task 6: Final scope, analytics, IP, and build gate

**Files:**
- Verify: `src/apps/nine-grid/**`
- Verify: `tests/e2e/nine-grid.spec.ts`

- [ ] **Step 1: Verify all nine approved event names and reject accidental extras**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('src/apps/nine-grid/controller.ts','utf8');const expected=['game_view','game_start','round_start','unit_recruit','unit_place','formation_lock','round_result','game_complete','replay_click'];const found=[...s.matchAll(/track\('([a-z_]+)'/g)].map(x=>x[1]);const unique=[...new Set(found)];if(expected.some(x=>!unique.includes(x))||unique.some(x=>!expected.includes(x)))throw new Error(JSON.stringify({expected,unique}));console.log(unique.join(','))"`

Expected: prints exactly `game_view,game_start,round_start,unit_recruit,unit_place,formation_lock,round_result,game_complete,replay_click` and exits 0.

- [ ] **Step 2: Verify the public interface, shared analytics import, and platform route seam are exact**

Run: `node -e "const fs=require('fs');const index=fs.readFileSync('src/apps/nine-grid/index.ts','utf8');const controller=fs.readFileSync('src/apps/nine-grid/controller.ts','utf8');const mount=fs.readFileSync('src/apps/nine-grid/mount.ts','utf8').replace(/\r\n/g,'\n');if(!index.includes('export async function mountNineGrid(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void>'))throw new Error('mount signature mismatch');if(!index.includes(\"from '../../shared/analytics'\")||!controller.includes(\"from '../../shared/analytics'\"))throw new Error('AnalyticsClient import mismatch');if(mount!=='export { mountNineGrid } from \"./index\";\n')throw new Error('route seam mismatch');console.log('nine-grid interfaces ok')"`

Expected: prints `nine-grid interfaces ok` and exits 0, proving the exact `mountNineGrid(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void>` declaration, both shared analytics imports, and the exact `mount.ts → index.ts` re-export.

- [ ] **Step 3: Verify excluded first-round scope did not enter the app**

Run: `if (rg -ni "pvp|account|leaderboard|season pass|商城|支付|广告 sdk|shared card pool|共享卡池|利息|连胜|连败|人口升级|三星" src/apps/nine-grid tests/e2e/nine-grid.spec.ts) { exit 1 } else { Write-Output 'scope exclusions clean' }`

Expected: prints `scope exclusions clean` and exits 0.

- [ ] **Step 4: Run the complete TypeScript gate**

Run: `npx tsc --noEmit`

Expected: exits 0 with no TypeScript diagnostics.

- [ ] **Step 5: Run the complete Nine Grid unit gate**

Run: `npx vitest run src/apps/nine-grid/*.test.ts`

Expected: PASS with `12 passed`.

- [ ] **Step 6: Run the complete Nine Grid browser gate**

Run: `npx playwright test tests/e2e/nine-grid.spec.ts`

Expected: PASS in every configured project with no retry.

- [ ] **Step 7: Run the production build gate**

Run: `npm run build`

Expected: exits 0, Vite emits the production bundle, and there is no unresolved asset or chunk error.

- [ ] **Step 8: Manually inspect the final landscape evidence at desktop and Android sizes**

Run: `npx playwright test tests/e2e/nine-grid.spec.ts --project=chromium --trace=on`

Expected: PASS and a trace showing all controls stay inside the safe area, threat range is visible before lock, attack beams identify source and target, damage labels are legible, the three contribution lines appear after battle, portrait displays only the rotation instruction, and no competitor-derived image or remote asset is present.

- [ ] **Step 9: Commit any verification-only correction**

```bash
git add src/apps/nine-grid tests/e2e/nine-grid.spec.ts
git commit -m "chore(nine-grid): satisfy final playable acceptance"
```

Expected: the commit succeeds when verification produced a correction. When every gate passed without a correction, skip this step because there is no change to commit.

- [ ] **Step 10: Confirm a clean owned-file diff**

```bash
git status --short -- src/apps/nine-grid tests/e2e/nine-grid.spec.ts
```

Expected: the scoped status command prints nothing.

## Spec coverage checklist

- [ ] Target player and value: intro states a short, light strategy run; the engine preserves roster, bond, eye, and positioning decisions without equipment or season rules.
- [ ] Core loop: recruit, place, bond/eye activation, auto-combat, augment, and next round are each implemented and tested.
- [ ] Timing: landscape-only play, a 25-second inactivity fallback, six rounds, 第 6 轮为 Boss, and immediate new-seed replay are automated.
- [ ] Orientation and device behavior: the game runs in landscape; 竖屏访问显示明确旋转提示而不压缩棋盘；低端机 uses the capped effect budget while preserving source, target, range, and damage readability.
- [ ] Content limits: exactly eight original beasts, three bonds, one basic attack assumption, one automatic skill description, one tag, five-unit board cap, fixed one-resource recruit, and pair-only tier-two resonance are encoded.
- [ ] Formation eyes: two public eyes, flame/life meanings, public threat cell/range, and bond/eye/position contribution lines are implemented.
- [ ] Visual and interaction: original bronze-green/mineral-gold/deep-ink procedural art, select-then-cell controls, source/target/range/damage readability, low-end effects, and explicit portrait rotation are covered.
- [ ] Events: all and only the nine approved event names use the shared synchronous `track` contract; `flush()` runs on backgrounding and completion; analytics delivery is not awaited by gameplay.
- [ ] Experiment thresholds remain measurable from the approved events: visit-to-start at least 25%, started users reaching round three at least 40%, first-run completion at least 20%, immediate replay among completers at least 15%, and a core-replay warning when replay remains below 8% after 100 real starts. Threshold calculation and dashboard display stay in the supervisor-owned analytics plan.
- [ ] Reliability: refresh starts a truthful new run, backgrounding pauses without offline catch-up, teardown is idempotent, and analytics failure handling remains delegated to the platform queue.
- [ ] Verification: rule, browser, orientation, lifecycle, performance, build, full-run, and replay checks are exact and repeatable.
- [ ] IP boundary: every shipped asset category has source/license/use records; no employer material, competitor expression, remote asset, or unreviewed commercial dependency enters this app.
- [ ] Scope exclusions: no PVP, account, leaderboard, season, out-of-run progression, store, payment, ad SDK, interest, streak economy, population upgrade, shared card pool, tier three, or complex synthesis chain is planned.
