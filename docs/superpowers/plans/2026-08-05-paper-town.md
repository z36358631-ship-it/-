# Paper Town Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete vertical, 8–10 minute 《纸镇失控》 single-run Phaser game with five normal waves, one Boss wave, active paper-slash combat, upgrades, win/loss/replay, and all nine experiment events.

**Architecture:** Keep deterministic combat rules in framework-free TypeScript and render them through one Phaser scene mounted behind a narrow app boundary. `mountPaperTown` owns DOM/Phaser lifecycle while the platform owns routing and supplies `AnalyticsClient`; art is original local 2D SVG/audio assets recorded in a commercial-use manifest. Vitest locks rules and event semantics; Playwright locks the public `/paper-town` journey, portrait behavior, safe area, and background pause.

**Tech Stack:** Vite, TypeScript, Phaser 3, Vitest, Playwright, CSS

---

## File map and platform contract

- `github/four-experiment-pilot/src/apps/paper-town/types.ts`: domain and analytics event types.
- `github/four-experiment-pilot/src/apps/paper-town/content.ts`: three guardians, seven enemy definitions, six waves, and twelve upgrades.
- `github/four-experiment-pilot/src/apps/paper-town/model.ts`: deterministic game state, waves, targeting, slash geometry, upgrades, victory, loss, and restart.
- `github/four-experiment-pilot/src/apps/paper-town/model.test.ts`: rule tests independent of Phaser.
- `github/four-experiment-pilot/src/apps/paper-town/PaperTownScene.ts`: Phaser rendering, pointer input, time loop, portrait guard, pause/resume, and analytics triggers.
- `github/four-experiment-pilot/src/apps/paper-town/index.ts`: exports the required mount boundary and destroys all owned resources on unmount.
- `github/four-experiment-pilot/src/apps/paper-town/mount.ts`: replaces the platform placeholder export with a direct re-export of the real `mountPaperTown` implementation before browser tests run.
- `github/four-experiment-pilot/src/apps/paper-town/paper-town.css`: vertical layout, safe-area controls, original palette, overlays, and reduced-motion behavior.
- `github/four-experiment-pilot/src/apps/paper-town/assets/manifest.json`: source/license/prompt/modification/final-use record for every asset.
- `github/four-experiment-pilot/src/apps/paper-town/assets/README.md`: reproducible original-asset requirements and IP review checklist.
- `github/four-experiment-pilot/src/apps/paper-town/analytics.test.ts`: exactly-once event-contract tests.
- `github/four-experiment-pilot/tests/e2e/paper-town.spec.ts`: desktop/mobile, full-run, rotation, safe-area, and background-resume coverage.

The platform must already provide this import; this plan does not edit it:

```ts
import type { AnalyticsClient } from '../../shared/analytics';
```

The app boundary is fixed:

```ts
export async function mountPaperTown(
  root: HTMLElement,
  analytics: AnalyticsClient,
): Promise<() => void>;
```

The shared contract is exact: `track(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>): void` and `flush(): Promise<void>`. `track` queues failures locally without blocking play; the game calls `flush()` on page hide and final settlement.

### Task 1: Deterministic content and core state

**Files:**
- Create: `github/four-experiment-pilot/src/apps/paper-town/types.ts`
- Create: `github/four-experiment-pilot/src/apps/paper-town/content.ts`
- Create: `github/four-experiment-pilot/src/apps/paper-town/model.ts`
- Create: `github/four-experiment-pilot/src/apps/paper-town/model.test.ts`

- [ ] **Step 1: Write the failing core-state tests**

```ts
// github/four-experiment-pilot/src/apps/paper-town/model.test.ts
import { describe, expect, it } from 'vitest';
import { createInitialState, restartGame, startGame } from './model';

describe('paper-town core state', () => {
  it('starts with five fixed lantern slots and three guardian choices', () => {
    const state = createInitialState();
    expect(state.slots).toHaveLength(5);
    expect(state.slots.every((slot) => slot.guardianId === null)).toBe(true);
    expect(state.availableGuardianIds).toEqual(['needle', 'cracker', 'ink']);
  });

  it('starts at wave one with a full wick', () => {
    const state = startGame(createInitialState(), 0);
    expect(state.phase).toBe('running');
    expect(state.wave).toBe(1);
    expect(state.wick).toBe(state.maxWick);
    expect(state.startedAt).toBe(0);
  });

  it('restarts to a clean unstarted run', () => {
    const played = { ...startGame(createInitialState(), 0), wick: 3, wave: 4 };
    const restarted = restartGame(played);
    expect(restarted.phase).toBe('ready');
    expect(restarted.wave).toBe(0);
    expect(restarted.wick).toBe(restarted.maxWick);
    expect(restarted.runId).not.toBe(played.runId);
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing modules fail**

Run: `cd github/four-experiment-pilot && npm run test -- src/apps/paper-town/model.test.ts`

Expected: FAIL with `Failed to resolve import "./model"`.

- [ ] **Step 3: Define the domain types**

```ts
// github/four-experiment-pilot/src/apps/paper-town/types.ts
export type Point = { x: number; y: number };
export type GamePhase = 'ready' | 'running' | 'upgrade' | 'won' | 'lost';
export type GuardianId = 'needle' | 'cracker' | 'ink';
export type EnemyId = 'wisp' | 'runner' | 'shield' | 'swarm' | 'healer' | 'elite' | 'shadow-judge';
export type UpgradeId =
  | 'sharp-edge' | 'red-thread' | 'wide-cut' | 'quick-fold'
  | 'needle-rain' | 'burst-seal' | 'ink-pool' | 'double-tear'
  | 'wick-guard' | 'paper-wall' | 'echo-cut' | 'last-light';

export interface GuardianDefinition {
  id: GuardianId;
  name: string;
  damage: number;
  cooldownMs: number;
  range: number;
  splashRadius: number;
  slowRatio: number;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  hp: number;
  speed: number;
  wickDamage: number;
  reward: number;
  isBoss: boolean;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
}

export interface WaveDefinition {
  index: number;
  enemies: ReadonlyArray<{ id: EnemyId; count: number; spacingMs: number }>;
}

export interface LanternSlot { id: number; position: Point; guardianId: GuardianId | null; }
export interface EnemyState {
  uid: string;
  definitionId: EnemyId;
  hp: number;
  progress: number;
  markedUntil: number;
  slowUntil: number;
  alive: boolean;
}

export interface PaperTownState {
  runId: string;
  phase: GamePhase;
  wave: number;
  wick: number;
  maxWick: number;
  currency: number;
  startedAt: number | null;
  completedAt: number | null;
  slashReadyAt: number;
  slashDamage: number;
  slashCooldownMs: number;
  tearMultiplier: number;
  slots: LanternSlot[];
  enemies: EnemyState[];
  upgrades: UpgradeId[];
  pendingUpgradeChoices: UpgradeId[];
  availableGuardianIds: GuardianId[];
}

export type PaperTownEventName =
  | 'game_view' | 'game_start' | 'first_action' | 'tower_build'
  | 'paper_slash' | 'upgrade_pick' | 'wave_complete'
  | 'game_complete' | 'replay_click';
```

- [ ] **Step 4: Add the complete first-run content catalogue**

```ts
// github/four-experiment-pilot/src/apps/paper-town/content.ts
import type { EnemyDefinition, GuardianDefinition, UpgradeDefinition, WaveDefinition } from './types';

export const guardians: Record<string, GuardianDefinition> = {
  needle: { id: 'needle', name: '穿云针偶', damage: 12, cooldownMs: 320, range: 210, splashRadius: 0, slowRatio: 0 },
  cracker: { id: 'cracker', name: '朱砂爆偶', damage: 22, cooldownMs: 900, range: 170, splashRadius: 62, slowRatio: 0 },
  ink: { id: 'ink', name: '墨池灯偶', damage: 7, cooldownMs: 700, range: 185, splashRadius: 36, slowRatio: 0.32 },
};

export const enemies: Record<string, EnemyDefinition> = {
  wisp: { id: 'wisp', name: '游影', hp: 45, speed: 0.034, wickDamage: 1, reward: 2, isBoss: false },
  runner: { id: 'runner', name: '疾纸', hp: 32, speed: 0.055, wickDamage: 1, reward: 2, isBoss: false },
  shield: { id: 'shield', name: '甲影', hp: 105, speed: 0.024, wickDamage: 2, reward: 4, isBoss: false },
  swarm: { id: 'swarm', name: '碎屑', hp: 20, speed: 0.043, wickDamage: 1, reward: 1, isBoss: false },
  healer: { id: 'healer', name: '续命纸', hp: 70, speed: 0.029, wickDamage: 1, reward: 4, isBoss: false },
  elite: { id: 'elite', name: '红衣煞', hp: 310, speed: 0.026, wickDamage: 4, reward: 10, isBoss: false },
  'shadow-judge': { id: 'shadow-judge', name: '无面判影', hp: 1450, speed: 0.014, wickDamage: 10, reward: 30, isBoss: true },
};

export const waves: WaveDefinition[] = [
  { index: 1, enemies: [{ id: 'wisp', count: 9, spacingMs: 850 }, { id: 'runner', count: 3, spacingMs: 900 }] },
  { index: 2, enemies: [{ id: 'swarm', count: 14, spacingMs: 430 }, { id: 'shield', count: 3, spacingMs: 1200 }] },
  { index: 3, enemies: [{ id: 'runner', count: 10, spacingMs: 520 }, { id: 'healer', count: 2, spacingMs: 1600 }] },
  { index: 4, enemies: [{ id: 'shield', count: 8, spacingMs: 820 }, { id: 'elite', count: 1, spacingMs: 1500 }] },
  { index: 5, enemies: [{ id: 'swarm', count: 20, spacingMs: 300 }, { id: 'healer', count: 4, spacingMs: 900 }, { id: 'elite', count: 2, spacingMs: 1400 }] },
  { index: 6, enemies: [{ id: 'shadow-judge', count: 1, spacingMs: 0 }, { id: 'wisp', count: 12, spacingMs: 650 }] },
];

export const upgrades: UpgradeDefinition[] = [
  { id: 'sharp-edge', name: '开刃', description: '裁纸斩基础伤害 +12' },
  { id: 'red-thread', name: '红线', description: '标记持续时间 +1.2 秒' },
  { id: 'wide-cut', name: '阔裁', description: '划线命中宽度 +14' },
  { id: 'quick-fold', name: '疾折', description: '裁纸斩冷却缩短 18%' },
  { id: 'needle-rain', name: '针雨', description: '穿云针偶伤害 +25%' },
  { id: 'burst-seal', name: '爆符', description: '朱砂爆偶范围 +25%' },
  { id: 'ink-pool', name: '墨潭', description: '墨池灯偶减速增强' },
  { id: 'double-tear', name: '重撕', description: '撕裂倍率 +0.35' },
  { id: 'wick-guard', name: '护芯', description: '灯芯上限与当前值 +2' },
  { id: 'paper-wall', name: '纸垣', description: '敌人抵达灯芯时伤害 -1，最低 1' },
  { id: 'echo-cut', name: '回裁', description: '裁纸斩命中 5 个目标时返还 35% 冷却' },
  { id: 'last-light', name: '残灯', description: '灯芯低于 4 时纸偶伤害 +30%' },
];
```

- [ ] **Step 5: Implement initial state and restart**

```ts
// github/four-experiment-pilot/src/apps/paper-town/model.ts
import { upgrades } from './content';
import type { PaperTownState, Point, UpgradeId } from './types';

const slotPositions: Point[] = [
  { x: 96, y: 226 }, { x: 286, y: 284 }, { x: 112, y: 430 },
  { x: 300, y: 510 }, { x: 168, y: 650 },
];

const newRunId = (): string => crypto.randomUUID();

export function createInitialState(): PaperTownState {
  return {
    runId: newRunId(), phase: 'ready', wave: 0, wick: 10, maxWick: 10,
    currency: 10, startedAt: null, completedAt: null, slashReadyAt: 0,
    slashDamage: 18, slashCooldownMs: 6500, tearMultiplier: 1,
    slots: slotPositions.map((position, id) => ({ id, position, guardianId: null })),
    enemies: [], upgrades: [], pendingUpgradeChoices: [],
    availableGuardianIds: ['needle', 'cracker', 'ink'],
  };
}

export function startGame(state: PaperTownState, now: number): PaperTownState {
  return { ...state, phase: 'running', wave: 1, startedAt: now, slashReadyAt: now };
}

export function restartGame(_state: PaperTownState): PaperTownState {
  return createInitialState();
}

export function chooseUpgradeChoices(state: PaperTownState, seed: number): UpgradeId[] {
  const available = upgrades.filter((item) => !state.upgrades.includes(item.id));
  return [0, 1, 2].map((offset) => available[(seed + offset * 5) % available.length].id);
}
```

- [ ] **Step 6: Run the core tests**

Run: `cd github/four-experiment-pilot && npm run test -- src/apps/paper-town/model.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 7: Commit the domain foundation**

```bash
git add src/apps/paper-town/types.ts src/apps/paper-town/content.ts src/apps/paper-town/model.ts src/apps/paper-town/model.test.ts
git commit -m "feat(paper-town): define deterministic game domain"
```

### Task 2: Fixed lantern placement, waves, slash, upgrades, and completion

**Files:**
- Modify: `github/four-experiment-pilot/src/apps/paper-town/model.test.ts`
- Modify: `github/four-experiment-pilot/src/apps/paper-town/model.ts`

- [ ] **Step 1: Replace the test file with complete rule coverage**

```ts
// github/four-experiment-pilot/src/apps/paper-town/model.test.ts
import { describe, expect, it } from 'vitest';
import {
  applyGuardianHit, applyUpgrade, buildGuardian, completeWave, createInitialState,
  performSlash, restartGame, spawnWave, startGame, updateEnemies,
} from './model';

describe('paper-town rules', () => {
  it('only builds on an empty fixed slot and charges four paper', () => {
    const state = startGame(createInitialState(), 0);
    const built = buildGuardian(state, 2, 'needle');
    expect(built.slots[2].guardianId).toBe('needle');
    expect(built.currency).toBe(6);
    expect(() => buildGuardian(built, 2, 'ink')).toThrow('slot_unavailable');
  });

  it('spawns configured first wave enemies', () => {
    const state = spawnWave(startGame(createInitialState(), 0), 1);
    expect(state.enemies).toHaveLength(12);
    expect(state.enemies[0].definitionId).toBe('wisp');
  });

  it('marks slash targets and increases chained tear damage', () => {
    const base = spawnWave(startGame(createInitialState(), 0), 1);
    const aligned = { ...base, enemies: base.enemies.slice(0, 3).map((enemy, index) => ({ ...enemy, progress: 0.12 + index * 0.04 })) };
    const result = performSlash(aligned, { x: 40, y: 170 }, { x: 340, y: 350 }, 1000);
    expect(result.hitCount).toBeGreaterThanOrEqual(2);
    expect(result.state.enemies.filter((enemy) => enemy.markedUntil > 1000).length).toBe(result.hitCount);
    expect(result.tearMultiplier).toBeGreaterThan(1);
  });

  it('adds tear damage when a guardian hits a marked enemy', () => {
    const state = spawnWave(startGame(createInitialState(), 0), 1);
    const marked = { ...state, enemies: state.enemies.map((enemy, index) => index === 0 ? { ...enemy, markedUntil: 5000 } : enemy) };
    const before = marked.enemies[0].hp;
    const after = applyGuardianHit(marked, marked.enemies[0].uid, 'needle', 1000);
    expect(before - after.enemies[0].hp).toBeGreaterThan(10);
  });

  it('offers an upgrade after waves one through five and wins after Boss', () => {
    const normal = completeWave({ ...startGame(createInitialState(), 0), wave: 3 }, 8000);
    expect(normal.phase).toBe('upgrade');
    expect(normal.pendingUpgradeChoices).toHaveLength(3);
    const boss = completeWave({ ...normal, phase: 'running', wave: 6 }, 500000);
    expect(boss.phase).toBe('won');
    expect(boss.completedAt).toBe(500000);
  });

  it('applies an upgrade and advances to the next wave', () => {
    const upgrading = completeWave(startGame(createInitialState(), 0), 5000);
    const next = applyUpgrade(upgrading, upgrading.pendingUpgradeChoices[0]);
    expect(next.phase).toBe('running');
    expect(next.wave).toBe(2);
    expect(next.upgrades).toHaveLength(1);
  });

  it('loses when enemies consume the final wick and can restart', () => {
    const spawned = spawnWave({ ...startGame(createInitialState(), 0), wick: 1 }, 1);
    const escaped = { ...spawned, enemies: spawned.enemies.map((enemy) => ({ ...enemy, progress: 0.999 })) };
    const lost = updateEnemies(escaped, 1000, 1000);
    expect(lost.phase).toBe('lost');
    expect(restartGame(lost).phase).toBe('ready');
  });
});
```

- [ ] **Step 2: Run tests to verify the rule functions are missing**

Run: `cd github/four-experiment-pilot && npm run test -- src/apps/paper-town/model.test.ts`

Expected: FAIL with missing exports such as `performSlash` and `completeWave`.

- [ ] **Step 3: Replace the model with the complete deterministic implementation**

```ts
// github/four-experiment-pilot/src/apps/paper-town/model.ts
import { enemies, guardians, upgrades, waves } from './content';
import type { EnemyState, GuardianId, PaperTownState, Point, UpgradeId } from './types';

const route: Point[] = [
  { x: 24, y: 150 }, { x: 320, y: 230 }, { x: 78, y: 380 },
  { x: 330, y: 520 }, { x: 184, y: 720 },
];
const slots: Point[] = [{ x: 96, y: 226 }, { x: 286, y: 284 }, { x: 112, y: 430 }, { x: 300, y: 510 }, { x: 168, y: 650 }];
const newRunId = (): string => crypto.randomUUID();

export function createInitialState(): PaperTownState {
  return { runId: newRunId(), phase: 'ready', wave: 0, wick: 10, maxWick: 10, currency: 10,
    startedAt: null, completedAt: null, slashReadyAt: 0, slashDamage: 18, slashCooldownMs: 6500,
    tearMultiplier: 1, slots: slots.map((position, id) => ({ id, position, guardianId: null })),
    enemies: [], upgrades: [], pendingUpgradeChoices: [], availableGuardianIds: ['needle', 'cracker', 'ink'] };
}

export function startGame(state: PaperTownState, now: number): PaperTownState {
  return spawnWave({ ...state, phase: 'running', wave: 1, startedAt: now, slashReadyAt: now }, 1);
}
export function restartGame(_state: PaperTownState): PaperTownState { return createInitialState(); }

export function buildGuardian(state: PaperTownState, slotId: number, guardianId: GuardianId): PaperTownState {
  const slot = state.slots[slotId];
  if (!slot || slot.guardianId !== null || state.currency < 4) throw new Error('slot_unavailable');
  return { ...state, currency: state.currency - 4,
    slots: state.slots.map((item) => item.id === slotId ? { ...item, guardianId } : item) };
}

export function spawnWave(state: PaperTownState, waveIndex: number): PaperTownState {
  const definition = waves[waveIndex - 1];
  const spawned: EnemyState[] = definition.enemies.flatMap((group, groupIndex) =>
    Array.from({ length: group.count }, (_, index) => {
      const source = enemies[group.id];
      return { uid: `${state.runId}-${waveIndex}-${groupIndex}-${index}`, definitionId: group.id,
        hp: source.hp, progress: -(groupIndex * 0.04 + index * source.speed * group.spacingMs / 1000),
        markedUntil: 0, slowUntil: 0, alive: true };
    }));
  return { ...state, wave: waveIndex, enemies: spawned };
}

export function routePoint(progress: number): Point {
  const safe = Math.max(0, Math.min(0.9999, progress));
  const scaled = safe * (route.length - 1); const index = Math.floor(scaled); const t = scaled - index;
  return { x: route[index].x + (route[index + 1].x - route[index].x) * t,
    y: route[index].y + (route[index + 1].y - route[index].y) * t };
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x; const dy = end.y - start.y;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function performSlash(state: PaperTownState, start: Point, end: Point, now: number) {
  if (now < state.slashReadyAt) return { state, hitCount: 0, tearMultiplier: 1 };
  const width = state.upgrades.includes('wide-cut') ? 38 : 24;
  const hitIds = state.enemies.filter((enemy) => enemy.alive && enemy.progress >= 0 && distanceToSegment(routePoint(enemy.progress), start, end) <= width).map((enemy) => enemy.uid);
  const chain = 1 + Math.max(0, hitIds.length - 1) * 0.22 + (state.upgrades.includes('double-tear') ? 0.35 : 0);
  const cooldownRefund = state.upgrades.includes('echo-cut') && hitIds.length >= 5 ? 0.65 : 1;
  const markedFor = state.upgrades.includes('red-thread') ? 4200 : 3000;
  const next = state.enemies.map((enemy) => hitIds.includes(enemy.uid)
    ? { ...enemy, hp: enemy.hp - state.slashDamage, markedUntil: now + markedFor, slowUntil: now + 1100, alive: enemy.hp > state.slashDamage }
    : enemy);
  return { state: { ...state, enemies: next, tearMultiplier: chain, slashReadyAt: now + state.slashCooldownMs * cooldownRefund }, hitCount: hitIds.length, tearMultiplier: chain };
}

export function applyGuardianHit(state: PaperTownState, uid: string, guardianId: GuardianId, now: number, damageMultiplier = 1): PaperTownState {
  const guardian = guardians[guardianId];
  const primary = state.enemies.find((enemy) => enemy.uid === uid);
  if (!primary) return state;
  const primaryPoint = routePoint(primary.progress);
  const damageBonus = guardianId === 'needle' && state.upgrades.includes('needle-rain') ? 1.25 : 1;
  const radiusBonus = guardianId === 'cracker' && state.upgrades.includes('burst-seal') ? 1.25 : 1;
  const slowBonus = guardianId === 'ink' && state.upgrades.includes('ink-pool') ? 1.35 : 1;
  return { ...state, enemies: state.enemies.map((enemy) => {
    if (!enemy.alive) return enemy;
    const inSplash = enemy.uid === uid || (guardian.splashRadius > 0 && Math.hypot(routePoint(enemy.progress).x - primaryPoint.x, routePoint(enemy.progress).y - primaryPoint.y) <= guardian.splashRadius * radiusBonus);
    if (!inSplash) return enemy;
    const base = guardian.damage * damageBonus * damageMultiplier;
    const total = base + (enemy.markedUntil > now ? base * state.tearMultiplier : 0);
    return { ...enemy, hp: enemy.hp - total, alive: enemy.hp > total,
      slowUntil: guardian.slowRatio > 0 ? Math.max(enemy.slowUntil, now + 1200 * slowBonus) : enemy.slowUntil };
  }) };
}

export function updateEnemies(state: PaperTownState, deltaMs: number, now: number): PaperTownState {
  let wick = state.wick;
  const updated = state.enemies.map((enemy) => {
    if (!enemy.alive || enemy.progress < 0) return { ...enemy, progress: enemy.progress + deltaMs / 1000 * enemies[enemy.definitionId].speed };
    const slow = enemy.slowUntil > now ? 0.55 : 1;
    const progress = enemy.progress + deltaMs / 1000 * enemies[enemy.definitionId].speed * slow;
    if (progress < 1) return { ...enemy, progress };
    const reduction = state.upgrades.includes('paper-wall') ? 1 : 0;
    wick -= Math.max(1, enemies[enemy.definitionId].wickDamage - reduction);
    return { ...enemy, progress: 1, alive: false };
  });
  return { ...state, enemies: updated, wick: Math.max(0, wick), phase: wick <= 0 ? 'lost' : state.phase, completedAt: wick <= 0 ? now : state.completedAt };
}

export function completeWave(state: PaperTownState, now: number): PaperTownState {
  if (state.wave === 6) return { ...state, phase: 'won', completedAt: now, enemies: [] };
  return { ...state, phase: 'upgrade', enemies: [], currency: state.currency + 5,
    pendingUpgradeChoices: chooseUpgradeChoices(state, state.wave * 3) };
}

export function chooseUpgradeChoices(state: PaperTownState, seed: number): UpgradeId[] {
  const available = upgrades.filter((item) => !state.upgrades.includes(item.id));
  return [0, 1, 2].map((offset) => available[(seed + offset * 5) % available.length].id);
}

export function applyUpgrade(state: PaperTownState, id: UpgradeId): PaperTownState {
  if (!state.pendingUpgradeChoices.includes(id)) throw new Error('upgrade_unavailable');
  let next = { ...state, phase: 'running' as const, upgrades: [...state.upgrades, id], pendingUpgradeChoices: [] as UpgradeId[] };
  if (id === 'sharp-edge') next.slashDamage += 12;
  if (id === 'quick-fold') next.slashCooldownMs *= 0.82;
  if (id === 'wick-guard') { next.maxWick += 2; next.wick += 2; }
  return spawnWave(next, state.wave + 1);
}
```

- [ ] **Step 4: Run rule tests**

Run: `cd github/four-experiment-pilot && npm run test -- src/apps/paper-town/model.test.ts`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit complete game rules**

```bash
git add src/apps/paper-town/model.ts src/apps/paper-town/model.test.ts
git commit -m "feat(paper-town): implement waves slash upgrades and outcomes"
```

### Task 3: Phaser scene and active combat loop

**Files:**
- Create: `github/four-experiment-pilot/src/apps/paper-town/PaperTownScene.ts`

- [ ] **Step 1: Create the complete Phaser scene**

```ts
// github/four-experiment-pilot/src/apps/paper-town/PaperTownScene.ts
import Phaser from 'phaser';
import type { AnalyticsClient } from '../../shared/analytics';
import { guardians, upgrades } from './content';
import { applyGuardianHit, applyUpgrade, buildGuardian, completeWave, createInitialState, performSlash, restartGame, routePoint, startGame, updateEnemies } from './model';
import type { GuardianId, PaperTownEventName, PaperTownState, Point, UpgradeId } from './types';

export class PaperTownScene extends Phaser.Scene {
  private state: PaperTownState = createInitialState();
  private selected: GuardianId = 'needle';
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private dragStart: Point | null = null;
  private firstActionSent = false;
  private waveEventSent = 0;
  private readonly lastShot = new Map<number, number>();

  constructor(private readonly analytics: AnalyticsClient) { super('PaperTown'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#17120f');
    this.graphics = this.add.graphics();
    this.hud = this.add.text(16, 16, '', { color: '#f1e5ca', fontFamily: 'system-ui', fontSize: '16px' }).setDepth(20);
    this.overlay = this.add.container(0, 0).setDepth(30);
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onDown(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onUp(pointer));
    (['needle', 'cracker', 'ink'] as GuardianId[]).forEach((id, index) => {
      const button = this.add.text(22 + index * 126, 790, guardians[id].name.slice(0, 3), { backgroundColor: '#58251f', color: '#fff5dc', padding: { x: 11, y: 9 }, fontSize: '14px' }).setDepth(25).setInteractive();
      button.on('pointerup', () => { this.selected = id; });
    });
    this.showReady();
    this.renderState();
  }

  private emit(name: PaperTownEventName, properties: Record<string, string | number | boolean>): void {
    try { this.analytics.track(name, { experiment: 'paper-town', run_id: this.state.runId, ...properties }); } catch { /* telemetry never blocks play */ }
  }

  private showReady(): void {
    this.overlay.removeAll(true);
    const title = this.add.text(195, 260, '纸镇失控', { color: '#d94835', fontSize: '38px', fontStyle: 'bold' }).setOrigin(0.5);
    const copy = this.add.text(195, 320, '守住灯芯，划屏裁断影祟\n5 波之后迎战无面判影', { color: '#f1e5ca', align: 'center', fontSize: '17px' }).setOrigin(0.5);
    const start = this.add.text(195, 410, '开始守夜', { backgroundColor: '#a72d25', color: '#fff5dc', padding: { x: 34, y: 16 }, fontSize: '20px' }).setOrigin(0.5).setInteractive();
    start.on('pointerup', () => { this.state = startGame(this.state, this.time.now); this.emit('game_start', { wave: 1 }); this.overlay.removeAll(true); this.renderState(); });
    this.overlay.add([title, copy, start]);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.state.phase !== 'running') return;
    this.dragStart = { x: pointer.worldX, y: pointer.worldY };
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.state.phase !== 'running' || !this.dragStart) return;
    const end = { x: pointer.worldX, y: pointer.worldY };
    const gestureLength = Phaser.Math.Distance.Between(this.dragStart.x, this.dragStart.y, end.x, end.y);
    if (gestureLength < 36) {
      const slot = this.state.slots.find((item) => Phaser.Math.Distance.Between(item.position.x, item.position.y, end.x, end.y) <= 28);
      if (slot) this.build(slot.id);
    } else {
      const result = performSlash(this.state, this.dragStart, end, this.time.now);
      this.state = result.state;
      if (result.hitCount > 0) {
        this.sendFirstAction('paper_slash');
        this.emit('paper_slash', { wave: this.state.wave, hit_count: result.hitCount, tear_multiplier: Number(result.tearMultiplier.toFixed(2)) });
      }
    }
    this.dragStart = null;
  }

  private sendFirstAction(action: string): void {
    if (this.firstActionSent) return;
    this.firstActionSent = true;
    this.emit('first_action', { action, elapsed_ms: Math.round(this.time.now - (this.state.startedAt ?? this.time.now)), within_15s: this.time.now - (this.state.startedAt ?? 0) <= 15000 });
  }

  private build(slotId: number): void {
    try {
      this.state = buildGuardian(this.state, slotId, this.selected);
      this.sendFirstAction('tower_build');
      this.emit('tower_build', { wave: this.state.wave, slot_id: slotId, guardian_id: this.selected });
    } catch { return; }
  }

  private attack(now: number): void {
    this.state.slots.forEach((slot) => {
      if (!slot.guardianId || now - (this.lastShot.get(slot.id) ?? 0) < guardians[slot.guardianId].cooldownMs) return;
      const target = this.state.enemies.filter((enemy) => enemy.alive && enemy.progress >= 0).sort((a, b) => b.progress - a.progress)[0];
      if (!target) return;
      const point = routePoint(target.progress);
      if (Phaser.Math.Distance.Between(slot.position.x, slot.position.y, point.x, point.y) > guardians[slot.guardianId].range) return;
      const damageMultiplier = this.state.upgrades.includes('last-light') && this.state.wick < 4 ? 1.3 : 1;
      this.state = applyGuardianHit(this.state, target.uid, slot.guardianId, now, damageMultiplier);
      this.lastShot.set(slot.id, now);
    });
  }

  update(_time: number, delta: number): void {
    if (this.state.phase !== 'running') return;
    this.state = updateEnemies(this.state, Math.min(delta, 40), this.time.now);
    this.attack(this.time.now);
    if (this.state.phase === 'lost') { this.finish(false); return; }
    if (this.state.enemies.length > 0 && this.state.enemies.every((enemy) => !enemy.alive)) {
      const completed = this.state.wave;
      this.state = completeWave(this.state, this.time.now);
      if (this.waveEventSent !== completed) { this.waveEventSent = completed; this.emit('wave_complete', { wave: completed, wick: this.state.wick }); }
      if (this.state.phase === 'upgrade') this.showUpgrades();
      if (this.state.phase === 'won') this.finish(true);
    }
    this.renderState();
  }

  private showUpgrades(): void {
    this.overlay.removeAll(true);
    const panel = this.add.rectangle(195, 420, 350, 350, 0x17120f, 0.96);
    const heading = this.add.text(195, 280, '三选一 · 纸术', { color: '#f1e5ca', fontSize: '24px' }).setOrigin(0.5);
    const cards = this.state.pendingUpgradeChoices.map((id, index) => {
      const item = upgrades.find((upgrade) => upgrade.id === id)!;
      const card = this.add.text(195, 350 + index * 78, `${item.name}\n${item.description}`, { backgroundColor: '#58251f', color: '#fff5dc', align: 'center', fixedWidth: 300, padding: { y: 10 }, fontSize: '16px' }).setOrigin(0.5).setInteractive();
      card.on('pointerup', () => this.pickUpgrade(id)); return card;
    });
    this.overlay.add([panel, heading, ...cards]);
  }

  private pickUpgrade(id: UpgradeId): void {
    this.state = applyUpgrade(this.state, id);
    this.emit('upgrade_pick', { wave: this.state.wave - 1, upgrade_id: id });
    this.overlay.removeAll(true);
  }

  private finish(won: boolean): void {
    this.emit('game_complete', { result: won ? 'win' : 'loss', wave: this.state.wave, duration_ms: Math.round((this.state.completedAt ?? this.time.now) - (this.state.startedAt ?? this.time.now)) });
    void this.analytics.flush().catch(() => undefined);
    this.overlay.removeAll(true);
    const result = this.add.text(195, 330, won ? '灯火未灭' : '灯芯熄灭', { color: won ? '#f1e5ca' : '#d94835', fontSize: '36px', fontStyle: 'bold' }).setOrigin(0.5);
    const replay = this.add.text(195, 420, '再守一夜', { backgroundColor: '#a72d25', color: '#fff5dc', padding: { x: 32, y: 15 }, fontSize: '20px' }).setOrigin(0.5).setInteractive();
    replay.on('pointerup', () => { this.emit('replay_click', { previous_result: won ? 'win' : 'loss' }); this.state = restartGame(this.state); this.firstActionSent = false; this.waveEventSent = 0; this.lastShot.clear(); this.showReady(); });
    this.overlay.add([result, replay]);
  }

  private renderState(): void {
    this.graphics.clear();
    this.graphics.lineStyle(18, 0x3b3029, 1).beginPath().moveTo(24, 150).lineTo(320, 230).lineTo(78, 380).lineTo(330, 520).lineTo(184, 720).strokePath();
    this.state.slots.forEach((slot) => {
      this.graphics.fillStyle(slot.guardianId ? 0xb9362b : 0xe8d7b8, 1).fillCircle(slot.position.x, slot.position.y, 23);
    });
    this.state.enemies.filter((enemy) => enemy.alive && enemy.progress >= 0).forEach((enemy) => {
      const p = routePoint(enemy.progress);
      this.graphics.fillStyle(enemy.markedUntil > this.time.now ? 0xd94835 : 0x15110f, 1).fillTriangle(p.x, p.y - 13, p.x - 12, p.y + 12, p.x + 12, p.y + 12);
    });
    const cooldown = Math.max(0, this.state.slashReadyAt - this.time.now);
    this.hud.setText(`灯芯 ${this.state.wick}/${this.state.maxWick}   纸钱 ${this.state.currency}\n第 ${this.state.wave || '-'} / 6 波   裁纸斩 ${cooldown === 0 ? '就绪' : `${(cooldown / 1000).toFixed(1)}s`}`);
  }
}
```

- [ ] **Step 2: Type-check the scene**

Run: `cd github/four-experiment-pilot && npm run typecheck`

Expected: PASS with no TypeScript errors. If the repository script is named `check`, run `npm run check` and expect exit code 0.

- [ ] **Step 3: Commit the playable scene**

```bash
git add src/apps/paper-town/PaperTownScene.ts
git commit -m "feat(paper-town): add active Phaser combat scene"
```

### Task 4: Mount boundary, vertical shell, pause safety, and original assets

**Files:**
- Create: `github/four-experiment-pilot/src/apps/paper-town/index.ts`
- Modify: `github/four-experiment-pilot/src/apps/paper-town/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/paper-town/paper-town.css`
- Create: `github/four-experiment-pilot/src/apps/paper-town/assets/manifest.json`
- Create: `github/four-experiment-pilot/src/apps/paper-town/assets/README.md`

- [ ] **Step 1: Add the exact mount/unmount implementation**

```ts
// github/four-experiment-pilot/src/apps/paper-town/index.ts
import Phaser from 'phaser';
import type { AnalyticsClient } from '../../shared/analytics';
import { PaperTownScene } from './PaperTownScene';
import './paper-town.css';

export async function mountPaperTown(root: HTMLElement, analytics: AnalyticsClient): Promise<() => void> {
  root.innerHTML = '<main class="paper-town" data-testid="paper-town"><div class="paper-town__rotate" role="status">请旋转至竖屏继续守夜</div><div class="paper-town__stage" data-testid="paper-town-stage"></div></main>';
  const stage = root.querySelector<HTMLElement>('.paper-town__stage');
  if (!stage) throw new Error('paper_town_stage_missing');
  try { analytics.track('game_view', { experiment: 'paper-town', page: '/paper-town' }); } catch { /* telemetry never blocks mount */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: stage, width: 390, height: 844, transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    fps: { target: 60, min: 30 }, scene: [new PaperTownScene(analytics)],
  });
  const onVisibility = (): void => {
    const scene = game.scene.getScene('PaperTown');
    if (!scene) return;
    if (document.hidden) {
      scene.scene.pause();
      void analytics.flush().catch(() => undefined);
    } else scene.scene.resume();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    game.destroy(true);
    root.replaceChildren();
  };
}
```

- [ ] **Step 2: Replace the platform placeholder mount with the real app export**

```ts
// github/four-experiment-pilot/src/apps/paper-town/mount.ts
export { mountPaperTown } from "./index";
```

- [ ] **Step 3: Verify the platform entry resolves the real implementation**

Run: `cd github/four-experiment-pilot && rg -n -x 'export \{ mountPaperTown \} from "\./index";' src/apps/paper-town/mount.ts && npm run typecheck`

Expected: `rg` prints exactly `1:export { mountPaperTown } from "./index";`; type-check exits 0 with no duplicate or unresolved `mountPaperTown` export. Do not start Playwright while this check fails, because `/paper-town` would still render the platform placeholder.

- [ ] **Step 4: Add portrait, safe-area, paper texture, and reduced-motion CSS**

```css
/* github/four-experiment-pilot/src/apps/paper-town/paper-town.css */
.paper-town { position: fixed; inset: 0; overflow: hidden; background: #17120f; color: #f1e5ca; touch-action: none; }
.paper-town::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .18; background-image: radial-gradient(#f1e5ca 0.45px, transparent .7px); background-size: 5px 5px; }
.paper-town__stage { position: absolute; inset: 0 0 max(env(safe-area-inset-bottom), 12px); display: grid; place-items: center; }
.paper-town__stage canvas { max-width: 100%; max-height: 100%; filter: drop-shadow(0 12px 32px rgb(0 0 0 / .45)); }
.paper-town__rotate { display: none; position: absolute; inset: 0; z-index: 50; place-items: center; padding: 32px; background: #17120f; color: #f1e5ca; text-align: center; font: 600 20px/1.5 system-ui, sans-serif; }
@media (orientation: landscape) and (max-height: 600px) { .paper-town__stage { visibility: hidden; } .paper-town__rotate { display: grid; } }
@media (prefers-reduced-motion: reduce) { .paper-town__stage canvas { filter: none; } }
```

- [ ] **Step 5: Record the original-asset manifest**

```json
{
  "project": "paper-town",
  "palette": ["#d94835", "#17120f", "#f1e5ca"],
  "policy": "All production visuals and audio are newly created for this experiment; no competitor screenshots or proprietary employer material.",
  "assets": [
    { "id": "guardian-needle", "path": "guardian-needle.svg", "source": "original vector", "license": "project-owned", "prompt": "angular needle paper guardian, front-readable silhouette, vermilion and ivory", "modifications": "manual silhouette cleanup and contrast pass", "use": "single-target guardian" },
    { "id": "guardian-cracker", "path": "guardian-cracker.svg", "source": "original vector", "license": "project-owned", "prompt": "round bursting paper guardian, cut-paper silhouette, vermilion and ivory", "modifications": "manual silhouette cleanup and contrast pass", "use": "area guardian" },
    { "id": "guardian-ink", "path": "guardian-ink.svg", "source": "original vector", "license": "project-owned", "prompt": "low wide ink paper guardian, cut-paper silhouette, black and ivory", "modifications": "manual silhouette cleanup and contrast pass", "use": "slow guardian" },
    { "id": "enemy-sheet", "path": "enemy-sheet.svg", "source": "original vector", "license": "project-owned", "prompt": "seven abstract shadow-paper enemies with distinct readable silhouettes, no folklore character copy", "modifications": "manual size normalization", "use": "five common enemies, elite, Boss" },
    { "id": "slash", "path": "slash.svg", "source": "original vector", "license": "project-owned", "prompt": "torn paper slash streak with rough fibers", "modifications": "manual alpha and edge cleanup", "use": "active slash feedback" },
    { "id": "paper-texture", "path": "paper-texture.svg", "source": "procedural original", "license": "project-owned", "prompt": "none", "modifications": "two-layer noise reduced for mobile readability", "use": "subtle background texture" },
    { "id": "sfx", "path": "paper-town-sfx.ogg", "source": "original recording and synthesis", "license": "project-owned", "prompt": "none", "modifications": "normalized to -16 LUFS, trimmed and encoded as OGG", "use": "build, slash, hit, upgrade, win and loss cues" }
  ]
}
```

- [ ] **Step 6: Add the asset production and review checklist**

```md
# Paper Town original asset checklist

1. Produce only the seven assets listed in `manifest.json`; keep units, route, hit source, and slash marks more legible than decoration.
2. Use layered 2D SVG/PNG, shadows, scale, and gentle sway. Do not add skeletal animation or physical paper simulation.
3. Store source files beside the manifest and update the matching manifest record whenever an asset is changed.
4. Confirm fonts, audio encoders, and all runtime dependencies permit commercial use.
5. Compare only generic genre behaviors; do not trace or reproduce competitor UI, maps, icons, characters, numerical combinations, or information hierarchy.
6. Before paid release or expanded distribution, search the working title, primary characters, app stores, search engines, domains, and relevant Chinese trademark classes, then request focused legal review.
```

- [ ] **Step 7: Run type-check and production build**

Run: `cd github/four-experiment-pilot && npm run typecheck && npm run build`

Expected: both commands exit 0; Vite emits the production bundle, resolves `mount.ts` through `index.ts`, and reports no unresolved paper-town imports or placeholder entry.

- [ ] **Step 8: Commit mount bridge, CSS, and asset provenance**

```bash
git add src/apps/paper-town/index.ts src/apps/paper-town/mount.ts src/apps/paper-town/paper-town.css src/apps/paper-town/assets/manifest.json src/apps/paper-town/assets/README.md
git commit -m "feat(paper-town): mount portrait game with original art policy"
```

### Task 5: Analytics contract and exactly-once behavior

**Files:**
- Create: `github/four-experiment-pilot/src/apps/paper-town/analytics.test.ts`
- Modify: `github/four-experiment-pilot/src/apps/paper-town/PaperTownScene.ts`

- [ ] **Step 1: Write the analytics contract test**

```ts
// github/four-experiment-pilot/src/apps/paper-town/analytics.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsClient } from '../../shared/analytics';
import { PaperTownScene } from './PaperTownScene';

describe('paper-town analytics contract', () => {
  it('uses only the approved event names and always identifies the experiment', () => {
    const track = vi.fn();
    const scene = new PaperTownScene({ track, flush: vi.fn().mockResolvedValue(undefined) } as unknown as AnalyticsClient);
    const emit = (scene as unknown as { emit: (name: string, props: Record<string, unknown>) => void }).emit.bind(scene);
    const names = ['game_start', 'first_action', 'tower_build', 'paper_slash', 'upgrade_pick', 'wave_complete', 'game_complete', 'replay_click'];
    names.forEach((name) => emit(name, { wave: 1 }));
    expect(track.mock.calls.map(([name]) => name)).toEqual(names);
    expect(track.mock.calls.every(([, props]) => props.experiment === 'paper-town')).toBe(true);
  });

  it('does not throw when analytics fails', () => {
    const scene = new PaperTownScene({ track: () => { throw new Error('offline'); }, flush: vi.fn().mockResolvedValue(undefined) } as unknown as AnalyticsClient);
    const emit = (scene as unknown as { emit: (name: string, props: Record<string, unknown>) => void }).emit.bind(scene);
    expect(() => emit('game_start', { wave: 1 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the analytics test**

Run: `cd github/four-experiment-pilot && npm run test -- src/apps/paper-town/analytics.test.ts`

Expected: PASS, 2 tests against the fixed shared `track(...)` and `flush()` contract.

- [ ] **Step 3: Verify event coverage in source**

Run: `cd github/four-experiment-pilot && rg -o "'(game_view|game_start|first_action|tower_build|paper_slash|upgrade_pick|wave_complete|game_complete|replay_click)'" src/apps/paper-town | Sort-Object -Unique`

Expected: all nine event names appear; `game_view` is emitted by `index.ts` and the other eight by `PaperTownScene.ts`.

- [ ] **Step 4: Commit analytics coverage**

```bash
git add src/apps/paper-town/analytics.test.ts src/apps/paper-town/PaperTownScene.ts
git commit -m "test(paper-town): lock experiment analytics contract"
```

### Task 6: Mobile browser, full-run, orientation, safe area, and background E2E

**Files:**
- Create: `github/four-experiment-pilot/tests/e2e/paper-town.spec.ts`

**Precondition:** Task 4 Steps 2–3 must pass and `src/apps/paper-town/mount.ts` must contain the exact re-export before writing or running any Playwright command. The E2E route must exercise `index.ts`, never the platform placeholder page.

- [ ] **Step 1: Write the complete browser acceptance test**

```ts
// github/four-experiment-pilot/tests/e2e/paper-town.spec.ts
import { expect, test } from '@playwright/test';

test.describe('paper town', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('mounts in portrait, starts, accepts slash input, and respects safe area', async ({ page }) => {
    const events: string[] = [];
    await page.route('**/api/events', async (route) => {
      const body = route.request().postDataJSON() as { name?: string; event?: string };
      events.push(body.name ?? body.event ?? '');
      await route.fulfill({ status: 202, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/paper-town?e2e=1');
    await expect(page.getByTestId('paper-town')).toBeVisible();
    await page.getByText('开始守夜').click();
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('paper_town_canvas_missing');
    await page.mouse.move(box.x + 40, box.y + 190);
    await page.mouse.down();
    await page.mouse.move(box.x + 340, box.y + 360, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => events.includes('game_start')).toBe(true);
    const bottom = await page.getByTestId('paper-town-stage').evaluate((node) => getComputedStyle(node).bottom);
    expect(bottom).not.toBe('0px');
  });

  test('shows an explicit rotation guard instead of compressing the game', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/paper-town');
    await expect(page.getByRole('status')).toContainText('请旋转至竖屏');
    await expect(page.locator('canvas')).toBeHidden();
  });

  test('pauses in background and does not add offline elapsed time', async ({ page, context }) => {
    await page.goto('/paper-town');
    await page.getByText('开始守夜').click();
    const before = await page.locator('canvas').screenshot();
    const other = await context.newPage();
    await other.goto('about:blank');
    await other.bringToFront();
    await page.waitForTimeout(1200);
    await page.bringToFront();
    const after = await page.locator('canvas').screenshot();
    expect(Buffer.compare(before, after)).toBe(0);
  });

  test('can reach a result and immediately start a fresh run in deterministic E2E mode', async ({ page }) => {
    await page.goto('/paper-town?e2e=1');
    await page.getByText('开始守夜').click();
    await expect(page.getByText(/灯火未灭|灯芯熄灭/)).toBeVisible({ timeout: 30000 });
    await page.getByText('再守一夜').click();
    await expect(page.getByText('开始守夜')).toBeVisible();
  });
});
```

- [ ] **Step 2: Recheck the real mount bridge before the first E2E run**

Run: `cd github/four-experiment-pilot && rg -n -x 'export \{ mountPaperTown \} from "\./index";' src/apps/paper-town/mount.ts && npm run build`

Expected: `rg` prints the one exact re-export line and the production build exits 0. Stop before Playwright if either command fails.

- [ ] **Step 3: Run mobile Chromium acceptance**

Run: `cd github/four-experiment-pilot && npx playwright test tests/e2e/paper-town.spec.ts --project=chromium`

Expected: PASS, 4 tests. The last case requires the platform's existing E2E clock/fast-forward hook activated by `?e2e=1`; it must accelerate time only and must not bypass wave, upgrade, result, replay, or event code paths.

- [ ] **Step 4: Run iPhone and Android viewport projects**

Run: `cd github/four-experiment-pilot && npx playwright test tests/e2e/paper-town.spec.ts --project=mobile-chrome --project=mobile-safari`

Expected: PASS in both configured mobile projects with no uncaught page errors.

- [ ] **Step 5: Run the complete game verification set**

Run: `cd github/four-experiment-pilot && npm run test -- src/apps/paper-town && npx playwright test tests/e2e/paper-town.spec.ts && npm run build`

Expected: all paper-town unit tests and four E2E cases pass; production build exits 0.

- [ ] **Step 6: Commit browser acceptance**

```bash
git add tests/e2e/paper-town.spec.ts
git commit -m "test(paper-town): cover portrait run pause and replay"
```

## Final acceptance and scope gate

Specification traceability:

| Approved requirement | Planned evidence |
|---|---|
| 竖屏、8–10 分钟、5 个普通波次加 1 个 Boss | Task 1 wave catalogue, Task 2 completion rules, Task 6 full-run check |
| 一张折线路线、5 个固定灯位、三种纸偶 | `route`, fixed `slots`, guardian selector, placement test |
| 五种普通敌人、一个精英模板、一个原创 Boss | `content.ts` enemy catalogue and six-wave spawn test |
| 每波三选一、首版 9–12 个纸术 | twelve-entry upgrade catalogue, three-choice rule and upgrade test |
| 10 秒内第一次主动操作、45 秒内连锁清屏 | timestamped `first_action`, slash chain properties, normal-speed acceptance play |
| 朱红、墨黑、米白原创剪纸/皮影视觉 | CSS palette, vector rendering and original asset manifest |
| 全面屏安全区、切后台暂停、不补算离线时间 | CSS safe-area, visibility pause/flush, mobile E2E |
| 限制同屏单位、对象池、粒子降级 | finite wave caps and batched `Graphics` rendering create no per-enemy display objects or particles, so an object pool/particle fallback is unnecessary in this slice; 30 FPS remains the measured gate |
| 九个实验事件及首轮漏斗 | fixed event union, exactly-once tests and properties needed to compute 30% start, 70% first action, 45% wave-three, 25% completion, and 15% replay thresholds |

- [ ] Complete one normal-speed run in 8–10 minutes: five normal waves, one Boss, explicit win/loss, and immediate replay.
- [ ] Confirm first useful input can occur within 10 seconds and a readable chained clear can occur within 45 seconds with normal play.
- [ ] Confirm five fixed lantern slots only; there is no free placement or path blocking.
- [ ] Confirm three guardian roles, five common enemy types, one elite template, one original Boss, and twelve simple upgrades are present.
- [ ] Confirm units, route, targeting, attack source, slash mark, and damage feedback remain readable before decorative texture.
- [ ] Confirm Android, iPhone, desktop Chrome, portrait guard, safe-area spacing, background pause, and no offline catch-up.
- [ ] Confirm object count remains bounded by wave definitions; production profiling stays responsive at 30 FPS minimum, with no blocking console errors.
- [ ] Confirm each approved event fires once with correct properties; failed telemetry does not block play and shared analytics owns bounded retry/deduplication.
- [ ] Confirm every shipped visual/audio item has source, license, generation prompt where applicable, modification record, and final use in `assets/manifest.json`.
- [ ] Confirm excluded scope is absent: accounts, PVP, leaderboard, season, meta shop, payment, ads, formal domain, backend administration, and bulk content production.
- [ ] Confirm internal or AI playtests are labeled as quality evidence and are not reported as real market traffic.

Run interface scan:

```powershell
rg -n "mountPaperTown|AnalyticsClient|game_view|game_start|first_action|tower_build|paper_slash|upgrade_pick|wave_complete|game_complete|replay_click" src/apps/paper-town tests/e2e/paper-town.spec.ts
```

Expected: the exact mount signature, shared analytics import, and all nine approved event names are present with no alternate spellings.
