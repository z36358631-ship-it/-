# 《三路小队》实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 基于共享 H5 底座交付一款高保真、可连续体验三局的竖屏三路战术游戏，使部署、一次进化、跨路调兵、集火打断在六分钟内持续产生真实决策，并提供完整首页、局内、结算、成长、每日挑战、无刷新重玩和 AI 试玩验证流程。

**架构：** 纯 TypeScript 领域层负责确定性战斗、波次、Boss、反挂机与三局变化，PixiJS 表现层只渲染领域快照并把共享输入意图翻译为命令。应用只消费 `docs/superpowers/plans/2026-07-29-wechat-h5-v2-runtime-art-pipeline.md` 交付的 `@gamehub/h5-*` 包，不重复实现运行循环、输入、音频、资产校验、存档信封、遥测队列、无障碍或测试参数门禁。

**技术栈：** npm workspaces、TypeScript 5.7.3 strict、Vite 6.1.0、PixiJS 8.9.2、Vitest 3.0.5、Playwright 1.51.0、Web Audio，以及版本均为 `0.1.0` 的 `@gamehub/h5-contracts`、`@gamehub/h5-runtime`、`@gamehub/h5-input`、`@gamehub/h5-audio`、`@gamehub/h5-assets`、`@gamehub/h5-save`、`@gamehub/h5-telemetry`、`@gamehub/h5-accessibility`、`@gamehub/h5-testing`。

---

## 前置依赖与边界

实施前必须先完成并验证：

`docs/superpowers/plans/2026-07-29-wechat-h5-v2-runtime-art-pipeline.md`

共享计划已经创建：

- `@gamehub/h5-three-lane-squad@0.1.0`
- `apps/three-lane-squad/index.html`
- `apps/three-lane-squad/vite.config.ts`
- npm workspace、共享 TypeScript/Vitest/Playwright 配置
- 九个 `@gamehub/h5-*` 包
- 统一资产配方、manifest、来源记录和校验流水线

本计划不得覆盖这些文件。所有步骤按 2–5 分钟设计；若单步超过 5 分钟，先提交当前可验证的最小变化，再拆出独立步骤。

## 文件结构

```text
games/wechat-h5-v2/
├─ apps/three-lane-squad/
│  └─ src/
│     ├─ main.ts
│     ├─ style.css
│     ├─ app/createThreeLaneApp.ts
│     ├─ content/heroes.ts
│     ├─ content/enemies.ts
│     ├─ content/waves.ts
│     ├─ domain/types.ts
│     ├─ domain/createBattle.ts
│     ├─ domain/applyCommand.ts
│     ├─ domain/targeting.ts
│     ├─ domain/advanceBattle.ts
│     ├─ domain/waveDirector.ts
│     ├─ domain/bossMachine.ts
│     ├─ domain/antiIdle.ts
│     ├─ meta/saveModel.ts
│     ├─ meta/dailyChallenge.ts
│     ├─ quality/projectEvents.ts
│     ├─ quality/localReport.ts
│     ├─ presentation/HomeView.ts
│     ├─ presentation/BattleScene.ts
│     ├─ presentation/Hud.ts
│     ├─ presentation/OverlayViews.ts
│     ├─ presentation/ProgressView.ts
│     ├─ presentation/assetBindings.ts
│     └─ testing/debugApi.ts
├─ art/
│  ├─ recipes/three-lane-squad.json
│  ├─ prompts/three-lane-squad.json
│  └─ provenance/three-lane-squad.json
├─ apps/three-lane-squad/public/assets/
│  └─ asset-manifest.json
└─ tests/three-lane-squad/
   ├─ unit/
   ├─ integration/
   ├─ e2e/
   ├─ fixtures/
   ├─ performance/
   └─ visual/
```

边界要求：

- `domain` 不导入 PixiJS、DOM、音频、存档、遥测或墙上时钟。
- `content` 只保存不可变定义和确定性生成规则。
- `presentation` 不计算胜负、伤害、能量或冷却。
- `testing/debugApi.ts` 只提供冻结的只读副本，不提供强制胜负、推进时间、注入能量或直接执行命令。
- 标准模式连续三局依次使用 `balanced-front`、`lockdown`、`elite-rush`；每日挑战按日期固定一种，不因重试改变。

### Task 1: 建立领域合同、五名英雄与六类敌人

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/types.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/content/heroes.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/content/enemies.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/content.test.ts`

- [ ] **Step 1: 编写失败的内容合同测试**

```ts
import { describe, expect, it } from 'vitest';
import { HEROES } from '../../../apps/three-lane-squad/src/content/heroes';
import { ENEMIES } from '../../../apps/three-lane-squad/src/content/enemies';

describe('three-lane-squad content', () => {
  it('defines five distinct heroes and six readable enemies', () => {
    expect(Object.keys(HEROES)).toEqual([
      'guardian',
      'ranger',
      'mage',
      'engineer',
      'priest',
    ]);
    expect(new Set(Object.values(HEROES).map((hero) => hero.role)).size).toBe(5);
    expect(Object.keys(ENEMIES)).toEqual([
      'grunt',
      'runner',
      'armored',
      'caster',
      'elite',
      'boss',
    ]);
    expect(Object.values(ENEMIES).every((enemy) => enemy.silhouetteKey.length > 8)).toBe(true);
  });

  it('changes rules on evolution instead of only multiplying stats', () => {
    expect(HEROES.guardian.evolvedRule).toBe('wall-aura');
    expect(HEROES.ranger.evolvedRule).toBe('lane-pierce');
    expect(HEROES.mage.evolvedRule).toBe('cross-lane-chain');
    expect(HEROES.engineer.evolvedRule).toBe('portable-turret');
    expect(HEROES.priest.evolvedRule).toBe('overflow-shield');
  });
});
```

- [ ] **Step 2: 运行测试并确认内容文件缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/content.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/content/heroes'`。

- [ ] **Step 3: 创建完整领域类型**

```ts
export type LaneId = 0 | 1 | 2;
export type ColumnId = 0 | 1 | 2 | 3;
export type HeroId = 'guardian' | 'ranger' | 'mage' | 'engineer' | 'priest';
export type EnemyId = 'grunt' | 'runner' | 'armored' | 'caster' | 'elite' | 'boss';
export type HeroRole =
  | 'block'
  | 'speed-counter'
  | 'armor-break'
  | 'zone-control'
  | 'support';
export type RunVariant = 'balanced-front' | 'lockdown' | 'elite-rush';
export type FormationTag = 'balanced' | 'mobile-reserve' | 'focus-kill' | 'unclassified';
export type BattleMode = 'preparing' | 'playing' | 'paused' | 'won' | 'lost';

export interface GridPosition {
  readonly lane: LaneId;
  readonly column: ColumnId;
}

export interface HeroDefinition {
  readonly id: HeroId;
  readonly name: string;
  readonly role: HeroRole;
  readonly cost: number;
  readonly attackIntervalMs: number;
  readonly rangeColumns: number;
  readonly blockCapacity: number;
  readonly baseAssetKey: string;
  readonly evolvedAssetKey: string;
  readonly evolvedRule:
    | 'wall-aura'
    | 'lane-pierce'
    | 'cross-lane-chain'
    | 'portable-turret'
    | 'overflow-shield';
}

export interface EnemyDefinition {
  readonly id: EnemyId;
  readonly health: number;
  readonly speedColumnsPerSecond: number;
  readonly armor: number;
  readonly threat: number;
  readonly silhouetteKey: string;
  readonly assetKey: string;
}

export interface HeroInstance {
  readonly instanceId: string;
  readonly heroId: HeroId;
  readonly deployedAtMs: number;
  tier: 1 | 2;
  position: GridPosition;
  status: 'ready' | 'moving' | 'defeated';
  moveStartedAtMs: number | null;
  moveEndsAtMs: number | null;
  transferReadyAtMs: number;
  nextAttackAtMs: number;
}

export interface EnemyInstance {
  readonly instanceId: string;
  readonly enemyId: EnemyId;
  lane: LaneId;
  progress: number;
  health: number;
  armor: number;
  status: 'advancing' | 'blocked' | 'casting' | 'defeated';
}

export interface DomainEvent {
  readonly seq: number;
  readonly atMs: number;
  readonly type:
    | 'deploy'
    | 'undo_deploy'
    | 'evolve'
    | 'transfer'
    | 'focus_fire'
    | 'enemy_defeated'
    | 'lane_locked'
    | 'lane_breached'
    | 'boss_charge'
    | 'boss_interrupt'
    | 'run_won'
    | 'run_lost';
  readonly payload: Record<string, unknown>;
}
```

- [ ] **Step 4: 写入五名英雄和六类敌人的实际定义**

`heroes.ts`：

```ts
import type { HeroDefinition, HeroId } from '../domain/types';

export const HEROES: Readonly<Record<HeroId, HeroDefinition>> = {
  guardian: {
    id: 'guardian',
    name: '盾卫·砾',
    role: 'block',
    cost: 3,
    attackIntervalMs: 1100,
    rangeColumns: 1,
    blockCapacity: 2,
    baseAssetKey: 'squad.hero.guardian.base',
    evolvedAssetKey: 'squad.hero.guardian.evolved',
    evolvedRule: 'wall-aura',
  },
  ranger: {
    id: 'ranger',
    name: '游侠·翎',
    role: 'speed-counter',
    cost: 3,
    attackIntervalMs: 700,
    rangeColumns: 4,
    blockCapacity: 0,
    baseAssetKey: 'squad.hero.ranger.base',
    evolvedAssetKey: 'squad.hero.ranger.evolved',
    evolvedRule: 'lane-pierce',
  },
  mage: {
    id: 'mage',
    name: '法师·烬',
    role: 'armor-break',
    cost: 4,
    attackIntervalMs: 1350,
    rangeColumns: 3,
    blockCapacity: 0,
    baseAssetKey: 'squad.hero.mage.base',
    evolvedAssetKey: 'squad.hero.mage.evolved',
    evolvedRule: 'cross-lane-chain',
  },
  engineer: {
    id: 'engineer',
    name: '工程师·栓',
    role: 'zone-control',
    cost: 4,
    attackIntervalMs: 950,
    rangeColumns: 2,
    blockCapacity: 0,
    baseAssetKey: 'squad.hero.engineer.base',
    evolvedAssetKey: 'squad.hero.engineer.evolved',
    evolvedRule: 'portable-turret',
  },
  priest: {
    id: 'priest',
    name: '祭司·澜',
    role: 'support',
    cost: 3,
    attackIntervalMs: 1200,
    rangeColumns: 2,
    blockCapacity: 0,
    baseAssetKey: 'squad.hero.priest.base',
    evolvedAssetKey: 'squad.hero.priest.evolved',
    evolvedRule: 'overflow-shield',
  },
};
```

`enemies.ts`：

```ts
import type { EnemyDefinition, EnemyId } from '../domain/types';

export const ENEMIES: Readonly<Record<EnemyId, EnemyDefinition>> = {
  grunt: { id: 'grunt', health: 80, speedColumnsPerSecond: 0.22, armor: 0, threat: 1, silhouetteKey: 'round-shoulder-sword', assetKey: 'squad.enemy.grunt' },
  runner: { id: 'runner', health: 55, speedColumnsPerSecond: 0.48, armor: 0, threat: 2, silhouetteKey: 'forward-leaning-runner', assetKey: 'squad.enemy.runner' },
  armored: { id: 'armored', health: 150, speedColumnsPerSecond: 0.16, armor: 70, threat: 3, silhouetteKey: 'wide-shield-heavy', assetKey: 'squad.enemy.armored' },
  caster: { id: 'caster', health: 75, speedColumnsPerSecond: 0.18, armor: 10, threat: 3, silhouetteKey: 'tall-staff-caster', assetKey: 'squad.enemy.caster' },
  elite: { id: 'elite', health: 260, speedColumnsPerSecond: 0.20, armor: 45, threat: 5, silhouetteKey: 'horned-elite-cleaver', assetKey: 'squad.enemy.elite' },
  boss: { id: 'boss', health: 1800, speedColumnsPerSecond: 0.08, armor: 120, threat: 10, silhouetteKey: 'colossal-three-horn-boss', assetKey: 'squad.enemy.boss' },
};
```

- [ ] **Step 5: 运行测试并提交内容合同**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/content.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；TypeScript 无错误。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/types.ts games/wechat-h5-v2/apps/three-lane-squad/src/content/heroes.ts games/wechat-h5-v2/apps/three-lane-squad/src/content/enemies.ts games/wechat-h5-v2/tests/three-lane-squad/unit/content.test.ts
git commit -m "feat(squad): define tactical content contracts"
```

### Task 2: 创建确定性战斗状态与三局变化

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/createBattle.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/createBattle.test.ts`

- [ ] **Step 1: 编写失败的初始状态和三局轮换测试**

```ts
import { describe, expect, it } from 'vitest';
import { createBattle, standardVariantForRun } from '../../../apps/three-lane-squad/src/domain/createBattle';

describe('createBattle', () => {
  it('creates an empty deterministic 3x4 battlefield', () => {
    const state = createBattle({
      seed: 20260729,
      runId: 'run-1',
      runOrdinal: 0,
      squad: ['guardian', 'ranger', 'mage', 'engineer', 'priest'],
      mode: 'standard',
    });
    expect(state.grid).toHaveLength(12);
    expect(state.energy).toBe(10);
    expect(state.baseHealth).toBe(3);
    expect(state.elapsedMs).toBe(0);
    expect(state.variant).toBe('balanced-front');
    expect(state.mode).toBe('preparing');
  });

  it('cycles three standard variants without changing daily retries', () => {
    expect([0, 1, 2, 3].map(standardVariantForRun)).toEqual([
      'balanced-front',
      'lockdown',
      'elite-rush',
      'balanced-front',
    ]);
    const first = createBattle({
      seed: 9,
      runId: 'daily-a',
      runOrdinal: 0,
      squad: ['guardian', 'ranger', 'mage', 'engineer', 'priest'],
      mode: 'daily',
    });
    const retry = createBattle({
      seed: 9,
      runId: 'daily-b',
      runOrdinal: 8,
      squad: ['guardian', 'ranger', 'mage', 'engineer', 'priest'],
      mode: 'daily',
    });
    expect(retry.variant).toBe(first.variant);
  });
});
```

- [ ] **Step 2: 运行测试并确认构造器缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/createBattle.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/domain/createBattle'`。

- [ ] **Step 3: 补充战斗状态合同**

在 `types.ts` 追加：

```ts
export interface FocusFireState {
  targetId: string | null;
  readyAtMs: number;
  expiresAtMs: number;
}

export interface LaneLockState {
  lane: LaneId;
  startsAtMs: number;
  endsAtMs: number;
}

export interface BossState {
  phase: 'absent' | 'advance' | 'summon' | 'switch-lane' | 'charge' | 'recover' | 'defeated';
  lane: LaneId;
  health: number;
  phaseEndsAtMs: number;
  chargeEndsAtMs: number | null;
  interrupted: boolean;
}

export interface BattleState {
  readonly seed: number;
  readonly runId: string;
  readonly runOrdinal: number;
  readonly squad: readonly HeroId[];
  readonly variant: RunVariant;
  mode: BattleMode;
  elapsedMs: number;
  tickRemainderMs: number;
  energy: number;
  baseHealth: number;
  grid: Array<{ position: GridPosition; heroInstanceId: string | null }>;
  heroes: HeroInstance[];
  enemies: EnemyInstance[];
  focusFire: FocusFireState;
  laneLock: LaneLockState | null;
  boss: BossState;
  events: DomainEvent[];
  nextEntitySeq: number;
  nextEventSeq: number;
  lastMeaningfulActionAtMs: number;
  meaningfulActionCount: number;
  longestDecisionGapMs: number;
  formationTag: FormationTag;
  failureLane: LaneId | null;
}
```

- [ ] **Step 4: 实现确定性构造器**

```ts
import { createSeededRandom } from '@gamehub/h5-testing';
import type {
  BattleState,
  GridPosition,
  HeroId,
  RunVariant,
} from './types';

export const standardVariantForRun = (runOrdinal: number): RunVariant =>
  (['balanced-front', 'lockdown', 'elite-rush'] as const)[
    ((runOrdinal % 3) + 3) % 3
  ]!;

const dailyVariant = (seed: number): RunVariant =>
  (['balanced-front', 'lockdown', 'elite-rush'] as const)[seed % 3]!;

export function createBattle(input: {
  seed: number;
  runId: string;
  runOrdinal: number;
  squad: readonly HeroId[];
  mode: 'standard' | 'daily';
}): BattleState {
  if (input.squad.length !== 5 || new Set(input.squad).size !== 5) {
    throw new Error('squad must contain five distinct heroes');
  }
  createSeededRandom(input.seed);
  const grid = ([0, 1, 2] as const).flatMap((lane) =>
    ([0, 1, 2, 3] as const).map((column) => ({
      position: { lane, column } satisfies GridPosition,
      heroInstanceId: null,
    })),
  );
  return {
    seed: input.seed >>> 0,
    runId: input.runId,
    runOrdinal: input.runOrdinal,
    squad: [...input.squad],
    variant:
      input.mode === 'daily'
        ? dailyVariant(input.seed >>> 0)
        : standardVariantForRun(input.runOrdinal),
    mode: 'preparing',
    elapsedMs: 0,
    tickRemainderMs: 0,
    energy: 10,
    baseHealth: 3,
    grid,
    heroes: [],
    enemies: [],
    focusFire: { targetId: null, readyAtMs: 0, expiresAtMs: 0 },
    laneLock: null,
    boss: {
      phase: 'absent',
      lane: 1,
      health: 1800,
      phaseEndsAtMs: 0,
      chargeEndsAtMs: null,
      interrupted: false,
    },
    events: [],
    nextEntitySeq: 1,
    nextEventSeq: 1,
    lastMeaningfulActionAtMs: 0,
    meaningfulActionCount: 0,
    longestDecisionGapMs: 0,
    formationTag: 'unclassified',
    failureLane: null,
  };
}
```

- [ ] **Step 5: 运行测试并提交构造器**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/createBattle.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；相同输入序列化结果完全相同。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/types.ts games/wechat-h5-v2/apps/three-lane-squad/src/domain/createBattle.ts games/wechat-h5-v2/tests/three-lane-squad/unit/createBattle.test.ts
git commit -m "feat(squad): create deterministic rotating battle state"
```

### Task 3: 实现部署、三秒撤回与一次进化

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/applyCommand.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/deployment.test.ts`

- [ ] **Step 1: 编写失败的部署、撤回与进化测试**

```ts
import { describe, expect, it } from 'vitest';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';
import { applyCommand } from '../../../apps/three-lane-squad/src/domain/applyCommand';

const initial = () =>
  createBattle({
    seed: 1,
    runId: 'deploy-run',
    runOrdinal: 0,
    squad: ['guardian', 'ranger', 'mage', 'engineer', 'priest'],
    mode: 'standard',
  });

describe('deployment commands', () => {
  it('deploys, rejects occupied cells and refunds within three seconds', () => {
    const first = applyCommand(initial(), {
      type: 'deploy',
      heroId: 'guardian',
      to: { lane: 0, column: 0 },
      atMs: 0,
    });
    expect(first.ok).toBe(true);
    expect(first.state.energy).toBe(7);
    expect(applyCommand(first.state, {
      type: 'deploy',
      heroId: 'ranger',
      to: { lane: 0, column: 0 },
      atMs: 10,
    }).reason).toBe('occupied');
    const heroId = first.state.heroes[0]!.instanceId;
    const undone = applyCommand(first.state, {
      type: 'undo-deploy',
      heroInstanceId: heroId,
      atMs: 2999,
    });
    expect(undone.state.energy).toBe(10);
    expect(undone.state.heroes).toHaveLength(0);
  });

  it('evolves equal tier-one heroes once and rejects a second evolution', () => {
    let state = initial();
    state = applyCommand(state, { type: 'deploy', heroId: 'guardian', to: { lane: 0, column: 0 }, atMs: 0 }).state;
    state.energy = 10;
    state = applyCommand(state, { type: 'deploy', heroId: 'guardian', to: { lane: 0, column: 1 }, atMs: 100 }).state;
    const [target, source] = state.heroes;
    const evolved = applyCommand(state, {
      type: 'evolve',
      sourceId: source!.instanceId,
      targetId: target!.instanceId,
      atMs: 500,
    });
    expect(evolved.state.heroes.find((hero) => hero.instanceId === target!.instanceId)?.tier).toBe(2);
    expect(applyCommand(evolved.state, {
      type: 'evolve',
      sourceId: target!.instanceId,
      targetId: target!.instanceId,
      atMs: 700,
    }).reason).toBe('max-tier');
  });
});
```

- [ ] **Step 2: 运行测试并确认命令处理器缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/deployment.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/domain/applyCommand'`。

- [ ] **Step 3: 定义命令联合类型和不可变结果**

```ts
import type {
  BattleState,
  GridPosition,
  HeroId,
} from './types';

export type BattleCommand =
  | { type: 'deploy'; heroId: HeroId; to: GridPosition; atMs: number }
  | { type: 'undo-deploy'; heroInstanceId: string; atMs: number }
  | { type: 'evolve'; sourceId: string; targetId: string; atMs: number }
  | { type: 'transfer'; heroInstanceId: string; to: GridPosition; atMs: number }
  | { type: 'focus-fire'; enemyInstanceId: string; atMs: number };

export type CommandReason =
  | 'ok'
  | 'occupied'
  | 'locked-lane'
  | 'insufficient-energy'
  | 'invalid-pair'
  | 'max-tier'
  | 'undo-expired'
  | 'cooldown'
  | 'moving'
  | 'invalid-target';

export interface CommandResult {
  readonly ok: boolean;
  readonly state: BattleState;
  readonly reason: CommandReason;
}

const copyState = (state: BattleState): BattleState => structuredClone(state);
```

- [ ] **Step 4: 实现部署、撤回和一次进化分支**

```ts
import { HEROES } from '../content/heroes';

const recordAction = (
  state: BattleState,
  type: 'deploy' | 'undo_deploy' | 'evolve',
  atMs: number,
  payload: Record<string, unknown>,
): void => {
  const gap = Math.max(0, atMs - state.lastMeaningfulActionAtMs);
  state.longestDecisionGapMs = Math.max(state.longestDecisionGapMs, gap);
  state.lastMeaningfulActionAtMs = atMs;
  state.meaningfulActionCount += 1;
  state.events.push({
    seq: state.nextEventSeq++,
    atMs,
    type,
    payload,
  });
};

export function applyCommand(
  input: BattleState,
  command: BattleCommand,
): CommandResult {
  const state = copyState(input);
  if (command.type === 'deploy') {
    const cell = state.grid.find(
      ({ position }) =>
        position.lane === command.to.lane &&
        position.column === command.to.column,
    );
    if (!cell || cell.heroInstanceId) return { ok: false, state: input, reason: 'occupied' };
    if (
      state.laneLock &&
      state.laneLock.lane === command.to.lane &&
      command.atMs >= state.laneLock.startsAtMs &&
      command.atMs < state.laneLock.endsAtMs
    ) {
      return { ok: false, state: input, reason: 'locked-lane' };
    }
    const definition = HEROES[command.heroId];
    if (state.energy < definition.cost) {
      return { ok: false, state: input, reason: 'insufficient-energy' };
    }
    const instanceId = `hero-${state.nextEntitySeq++}`;
    state.energy -= definition.cost;
    state.heroes.push({
      instanceId,
      heroId: command.heroId,
      deployedAtMs: command.atMs,
      tier: 1,
      position: command.to,
      status: 'ready',
      moveStartedAtMs: null,
      moveEndsAtMs: null,
      transferReadyAtMs: command.atMs,
      nextAttackAtMs: command.atMs,
    });
    cell.heroInstanceId = instanceId;
    recordAction(state, 'deploy', command.atMs, { instanceId, heroId: command.heroId, to: command.to });
    return { ok: true, state, reason: 'ok' };
  }
  if (command.type === 'undo-deploy') {
    const hero = state.heroes.find(({ instanceId }) => instanceId === command.heroInstanceId);
    if (!hero || command.atMs - hero.deployedAtMs > 3000) {
      return { ok: false, state: input, reason: 'undo-expired' };
    }
    state.energy += HEROES[hero.heroId].cost;
    state.heroes = state.heroes.filter(({ instanceId }) => instanceId !== hero.instanceId);
    const cell = state.grid.find(({ heroInstanceId }) => heroInstanceId === hero.instanceId);
    if (cell) cell.heroInstanceId = null;
    recordAction(state, 'undo_deploy', command.atMs, { instanceId: hero.instanceId });
    return { ok: true, state, reason: 'ok' };
  }
  if (command.type === 'evolve') {
    const source = state.heroes.find(({ instanceId }) => instanceId === command.sourceId);
    const target = state.heroes.find(({ instanceId }) => instanceId === command.targetId);
    if (!source || !target || source.heroId !== target.heroId || source.instanceId === target.instanceId) {
      return { ok: false, state: input, reason: 'invalid-pair' };
    }
    if (source.tier === 2 || target.tier === 2) {
      return { ok: false, state: input, reason: 'max-tier' };
    }
    target.tier = 2;
    state.heroes = state.heroes.filter(({ instanceId }) => instanceId !== source.instanceId);
    const sourceCell = state.grid.find(({ heroInstanceId }) => heroInstanceId === source.instanceId);
    if (sourceCell) sourceCell.heroInstanceId = null;
    recordAction(state, 'evolve', command.atMs, {
      sourceId: source.instanceId,
      targetId: target.instanceId,
      evolvedRule: HEROES[target.heroId].evolvedRule,
    });
    return { ok: true, state, reason: 'ok' };
  }
  return { ok: false, state: input, reason: 'invalid-target' };
}
```

- [ ] **Step 5: 运行测试并提交部署闭环**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/deployment.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；失败命令序列化后与输入状态一致。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/applyCommand.ts games/wechat-h5-v2/tests/three-lane-squad/unit/deployment.test.ts
git commit -m "feat(squad): add deployment undo and single evolution"
```

### Task 4: 实现跨路调兵与二十秒集火

**文件：**
- 修改：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/applyCommand.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/tactics.test.ts`

- [ ] **Step 1: 编写失败的调兵和集火测试**

```ts
import { describe, expect, it } from 'vitest';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';
import { applyCommand } from '../../../apps/three-lane-squad/src/domain/applyCommand';

const deployed = () => {
  const initial = createBattle({
    seed: 2,
    runId: 'tactics',
    runOrdinal: 0,
    squad: ['guardian', 'ranger', 'mage', 'engineer', 'priest'],
    mode: 'standard',
  });
  const result = applyCommand(initial, {
    type: 'deploy',
    heroId: 'guardian',
    to: { lane: 0, column: 0 },
    atMs: 0,
  }).state;
  result.enemies.push({
    instanceId: 'enemy-1',
    enemyId: 'elite',
    lane: 2,
    progress: 2.4,
    health: 260,
    armor: 45,
    status: 'advancing',
  });
  return result;
};

describe('active tactics', () => {
  it('moves for 800ms, frees origin immediately and prevents repeat transfer', () => {
    const state = deployed();
    const heroId = state.heroes[0]!.instanceId;
    const moved = applyCommand(state, {
      type: 'transfer',
      heroInstanceId: heroId,
      to: { lane: 2, column: 0 },
      atMs: 1000,
    });
    expect(moved.state.heroes[0]).toMatchObject({
      status: 'moving',
      moveStartedAtMs: 1000,
      moveEndsAtMs: 1800,
      transferReadyAtMs: 5000,
    });
    expect(moved.state.grid.find((cell) => cell.position.lane === 0 && cell.position.column === 0)?.heroInstanceId).toBeNull();
    expect(applyCommand(moved.state, {
      type: 'transfer',
      heroInstanceId: heroId,
      to: { lane: 1, column: 0 },
      atMs: 1200,
    }).reason).toBe('moving');
  });

  it('marks a live enemy for five seconds and enforces twenty-second cooldown', () => {
    const first = applyCommand(deployed(), {
      type: 'focus-fire',
      enemyInstanceId: 'enemy-1',
      atMs: 2000,
    });
    expect(first.state.focusFire).toEqual({
      targetId: 'enemy-1',
      readyAtMs: 22000,
      expiresAtMs: 7000,
    });
    expect(applyCommand(first.state, {
      type: 'focus-fire',
      enemyInstanceId: 'enemy-1',
      atMs: 21000,
    }).reason).toBe('cooldown');
  });
});
```

- [ ] **Step 2: 运行测试并确认两个命令尚未支持**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/tactics.test.ts
```

预期：FAIL，首个失败显示 `reason` 为 `invalid-target`。

- [ ] **Step 3: 加入跨路调兵分支**

在 `applyCommand()` 的最终返回前加入：

```ts
  if (command.type === 'transfer') {
    const hero = state.heroes.find(({ instanceId }) => instanceId === command.heroInstanceId);
    if (!hero) return { ok: false, state: input, reason: 'invalid-target' };
    if (hero.status === 'moving') return { ok: false, state: input, reason: 'moving' };
    if (command.atMs < hero.transferReadyAtMs) {
      return { ok: false, state: input, reason: 'cooldown' };
    }
    const destination = state.grid.find(
      ({ position }) =>
        position.lane === command.to.lane &&
        position.column === command.to.column,
    );
    if (!destination || destination.heroInstanceId) {
      return { ok: false, state: input, reason: 'occupied' };
    }
    const origin = state.grid.find(({ heroInstanceId }) => heroInstanceId === hero.instanceId);
    if (origin) origin.heroInstanceId = null;
    hero.status = 'moving';
    hero.moveStartedAtMs = command.atMs;
    hero.moveEndsAtMs = command.atMs + 800;
    hero.transferReadyAtMs = command.atMs + 4000;
    hero.position = command.to;
    destination.heroInstanceId = hero.instanceId;
    const gap = command.atMs - state.lastMeaningfulActionAtMs;
    state.longestDecisionGapMs = Math.max(state.longestDecisionGapMs, gap);
    state.lastMeaningfulActionAtMs = command.atMs;
    state.meaningfulActionCount += 1;
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: command.atMs,
      type: 'transfer',
      payload: { heroInstanceId: hero.instanceId, to: command.to },
    });
    return { ok: true, state, reason: 'ok' };
  }
```

- [ ] **Step 4: 加入集火分支**

```ts
  if (command.type === 'focus-fire') {
    if (command.atMs < state.focusFire.readyAtMs) {
      return { ok: false, state: input, reason: 'cooldown' };
    }
    const target = state.enemies.find(
      ({ instanceId, status }) =>
        instanceId === command.enemyInstanceId && status !== 'defeated',
    );
    if (!target) return { ok: false, state: input, reason: 'invalid-target' };
    state.focusFire = {
      targetId: target.instanceId,
      readyAtMs: command.atMs + 20000,
      expiresAtMs: command.atMs + 5000,
    };
    const gap = command.atMs - state.lastMeaningfulActionAtMs;
    state.longestDecisionGapMs = Math.max(state.longestDecisionGapMs, gap);
    state.lastMeaningfulActionAtMs = command.atMs;
    state.meaningfulActionCount += 1;
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: command.atMs,
      type: 'focus_fire',
      payload: { enemyInstanceId: target.instanceId, lane: target.lane },
    });
    return { ok: true, state, reason: 'ok' };
  }
```

- [ ] **Step 5: 运行测试并提交主动战术**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/tactics.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；调兵有 800ms 可见过程，集火冷却精确为 20000ms。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/applyCommand.ts games/wechat-h5-v2/tests/three-lane-squad/unit/tactics.test.ts
git commit -m "feat(squad): add active lane transfer and focus fire"
```

### Task 5: 实现固定 50ms tick、目标选择与战斗结算

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/targeting.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/advanceBattle.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/combat.test.ts`

- [ ] **Step 1: 编写目标选择、固定 tick 和越线伤害的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';
import { advanceBattle } from '../../../apps/three-lane-squad/src/domain/advanceBattle';
import { selectTarget } from '../../../apps/three-lane-squad/src/domain/targeting';

const squad = ['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const;

describe('deterministic combat', () => {
  it('prioritises a valid focus-fire target, then the nearest threat', () => {
    const state = createBattle({ seed: 7, runId: 'r-1', runOrdinal: 0, squad, mode: 'standard' });
    state.elapsedMs = 1000;
    state.enemies = [
      { instanceId: 'near', enemyId: 'grunt', lane: 1, progress: 2.7, health: 80, armor: 0, status: 'advancing' },
      { instanceId: 'elite', enemyId: 'elite', lane: 1, progress: 1.9, health: 320, armor: 16, status: 'advancing' },
    ];
    state.focusFire = { targetId: 'elite', readyAtMs: 21000, expiresAtMs: 6000 };
    expect(selectTarget(state, { lane: 1, column: 1 }, 3)?.instanceId).toBe('elite');
    state.focusFire.expiresAtMs = 999;
    expect(selectTarget(state, { lane: 1, column: 1 }, 3)?.instanceId).toBe('near');
  });

  it('consumes arbitrary frame deltas as exact 50ms ticks', () => {
    const a = createBattle({ seed: 8, runId: 'r-a', runOrdinal: 0, squad, mode: 'standard' });
    a.mode = 'playing';
    a.enemies.push({ instanceId: 'runner-1', enemyId: 'runner', lane: 0, progress: 0, health: 65, armor: 0, status: 'advancing' });
    const b = structuredClone(a);
    const once = advanceBattle(a, 1000);
    let sliced = b;
    for (let index = 0; index < 10; index += 1) sliced = advanceBattle(sliced, 100);
    expect(sliced).toEqual(once);
    expect(once.elapsedMs).toBe(1000);
  });

  it('removes a breached enemy and deducts exactly one base health', () => {
    const state = createBattle({ seed: 9, runId: 'r-2', runOrdinal: 0, squad, mode: 'standard' });
    state.mode = 'playing';
    state.enemies.push({ instanceId: 'breach', enemyId: 'runner', lane: 2, progress: 3.99, health: 65, armor: 0, status: 'advancing' });
    const next = advanceBattle(state, 50);
    expect(next.baseHealth).toBe(2);
    expect(next.enemies).toHaveLength(0);
    expect(next.failureLane).toBe(2);
    expect(next.events.at(-1)?.type).toBe('lane_breached');
  });
});
```

- [ ] **Step 2: 运行测试并确认战斗模块缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/combat.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/domain/advanceBattle'`。

- [ ] **Step 3: 实现稳定目标排序**

`targeting.ts`：

```ts
import { ENEMIES } from '../content/enemies';
import type { BattleState, EnemyInstance, GridPosition } from './types';

export function selectTarget(
  state: BattleState,
  origin: GridPosition,
  rangeColumns: number,
): EnemyInstance | null {
  const candidates = state.enemies
    .filter((enemy) =>
      enemy.status !== 'defeated' &&
      enemy.lane === origin.lane &&
      enemy.progress >= origin.column &&
      enemy.progress - origin.column <= rangeColumns,
    )
    .sort((left, right) =>
      right.progress - left.progress ||
      ENEMIES[right.enemyId].threat - ENEMIES[left.enemyId].threat ||
      left.instanceId.localeCompare(right.instanceId),
    );
  const focused =
    state.elapsedMs < state.focusFire.expiresAtMs
      ? candidates.find(({ instanceId }) => instanceId === state.focusFire.targetId)
      : undefined;
  return focused ?? candidates[0] ?? null;
}
```

- [ ] **Step 4: 实现只按固定步长改变领域状态的推进器**

`advanceBattle.ts`：

```ts
import { ENEMIES } from '../content/enemies';
import { HEROES } from '../content/heroes';
import { selectTarget } from './targeting';
import type { BattleState } from './types';

const FIXED_TICK_MS = 50;

function resolveTick(state: BattleState): void {
  state.elapsedMs += FIXED_TICK_MS;
  state.energy = Math.min(20, state.energy + 0.0025 * FIXED_TICK_MS);

  for (const hero of state.heroes) {
    if (hero.status === 'moving' && hero.moveEndsAtMs !== null && state.elapsedMs >= hero.moveEndsAtMs) {
      hero.status = 'ready';
      hero.moveStartedAtMs = null;
      hero.moveEndsAtMs = null;
    }
    if (hero.status !== 'ready' || state.elapsedMs < hero.nextAttackAtMs) continue;
    const definition = HEROES[hero.heroId];
    const target = selectTarget(state, hero.position, definition.rangeColumns);
    if (!target) continue;
    const tierMultiplier = hero.tier === 2 ? 1.55 : 1;
    const focusMultiplier =
      target.instanceId === state.focusFire.targetId &&
      state.elapsedMs < state.focusFire.expiresAtMs
        ? 1.35
        : 1;
    const rawDamage = (24 + definition.blockCapacity * 8) * tierMultiplier * focusMultiplier;
    const absorbed = Math.min(target.armor, rawDamage * 0.5);
    target.armor = Math.max(0, target.armor - rawDamage * 0.25);
    target.health -= rawDamage - absorbed;
    hero.nextAttackAtMs = state.elapsedMs + definition.attackIntervalMs;
    if (target.health <= 0) {
      target.status = 'defeated';
      state.energy = Math.min(20, state.energy + 1);
      state.events.push({
        seq: state.nextEventSeq++,
        atMs: state.elapsedMs,
        type: 'enemy_defeated',
        payload: { enemyInstanceId: target.instanceId, lane: target.lane },
      });
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.status !== 'advancing') continue;
    const blocker = state.heroes.find(
      (hero) =>
        hero.status === 'ready' &&
        hero.position.lane === enemy.lane &&
        Math.abs(hero.position.column - enemy.progress) <= 0.18 &&
        HEROES[hero.heroId].blockCapacity > 0,
    );
    if (blocker) {
      enemy.status = 'blocked';
      continue;
    }
    enemy.progress += ENEMIES[enemy.enemyId].speedColumnsPerSecond * (FIXED_TICK_MS / 1000);
  }

  for (const enemy of state.enemies.filter(({ progress, status }) => status !== 'defeated' && progress >= 4)) {
    state.baseHealth -= 1;
    state.failureLane = enemy.lane;
    enemy.status = 'defeated';
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: 'lane_breached',
      payload: { enemyInstanceId: enemy.instanceId, lane: enemy.lane },
    });
  }
  state.enemies = state.enemies.filter(({ status }) => status !== 'defeated');
  if (state.baseHealth <= 0 && state.mode === 'playing') {
    state.mode = 'lost';
    state.events.push({ seq: state.nextEventSeq++, atMs: state.elapsedMs, type: 'run_lost', payload: { lane: state.failureLane } });
  }
}

export function advanceBattle(input: BattleState, deltaMs: number): BattleState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('deltaMs must be finite and non-negative');
  if (input.mode !== 'playing') return input;
  const state = structuredClone(input);
  state.tickRemainderMs += deltaMs;
  while (state.tickRemainderMs >= FIXED_TICK_MS && state.mode === 'playing') {
    state.tickRemainderMs -= FIXED_TICK_MS;
    resolveTick(state);
  }
  return state;
}
```

- [ ] **Step 5: 运行测试、类型检查并提交确定性战斗**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/combat.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：3 tests PASS；同一初始状态用 `1000ms` 或十次 `100ms` 推进后得到完全相同的状态。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/targeting.ts games/wechat-h5-v2/apps/three-lane-squad/src/domain/advanceBattle.ts games/wechat-h5-v2/tests/three-lane-squad/unit/combat.test.ts
git commit -m "feat(squad): add deterministic fixed-step combat"
```

### Task 6: 实现六分钟波次与三种 variant 的真实差异

**文件：**
- 修改：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/types.ts`
- 修改：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/createBattle.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/content/waves.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/waveDirector.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/waves.test.ts`

- [ ] **Step 1: 编写三局敌序、锁路和精英压迫差异的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { WAVE_VARIANTS } from '../../../apps/three-lane-squad/src/content/waves';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';
import { advanceWaveDirector } from '../../../apps/three-lane-squad/src/domain/waveDirector';

const squad = ['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const;

describe('wave variants', () => {
  it('gives three consecutive standard runs different opening problems', () => {
    expect(WAVE_VARIANTS['balanced-front'].spawns.slice(0, 3).map((spawn) => spawn.lane)).toEqual([0, 1, 2]);
    expect(WAVE_VARIANTS.lockdown.laneLocks[0]).toEqual({ lane: 1, startsAtMs: 45000, endsAtMs: 65000 });
    expect(WAVE_VARIANTS['elite-rush'].spawns.filter(({ enemyId }) => enemyId === 'elite').length).toBeGreaterThanOrEqual(4);
  });

  it('spawns every due entry once and starts the boss at five minutes', () => {
    const state = createBattle({ seed: 12, runId: 'wave', runOrdinal: 0, squad, mode: 'standard' });
    state.mode = 'playing';
    state.elapsedMs = 300000;
    const next = advanceWaveDirector(state);
    expect(next.waveSpawnCursor).toBe(WAVE_VARIANTS['balanced-front'].spawns.length);
    expect(new Set(next.enemies.map(({ instanceId }) => instanceId)).size).toBe(next.enemies.length);
    expect(next.boss.phase).toBe('advance');
    expect(next.enemies.some(({ enemyId }) => enemyId === 'boss')).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认波次内容缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/waves.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/content/waves'`。

- [ ] **Step 3: 给战斗状态加入唯一波次游标**

在 `BattleState` 的 `enemies` 后加入：

```ts
  waveSpawnCursor: number;
  appliedLaneLockCount: number;
```

在 `createBattle()` 返回值的 `enemies: []` 后加入：

```ts
    waveSpawnCursor: 0,
    appliedLaneLockCount: 0,
```

- [ ] **Step 4: 写入三个完整波次规则并实现唯一生成**

`waves.ts`：

```ts
import type { EnemyId, LaneId, RunVariant } from '../domain/types';

export interface ScheduledSpawn {
  readonly atMs: number;
  readonly lane: LaneId;
  readonly enemyId: EnemyId;
}

export interface WaveVariantDefinition {
  readonly spawns: readonly ScheduledSpawn[];
  readonly laneLocks: readonly { lane: LaneId; startsAtMs: number; endsAtMs: number }[];
}

const spawn = (atMs: number, lane: LaneId, enemyId: EnemyId): ScheduledSpawn => ({ atMs, lane, enemyId });

export const WAVE_VARIANTS: Readonly<Record<RunVariant, WaveVariantDefinition>> = {
  'balanced-front': {
    spawns: [
      spawn(5000, 0, 'grunt'), spawn(8000, 1, 'grunt'), spawn(11000, 2, 'runner'),
      spawn(24000, 0, 'armored'), spawn(30000, 2, 'caster'), spawn(42000, 1, 'runner'),
      spawn(60000, 0, 'elite'), spawn(76000, 2, 'armored'), spawn(92000, 1, 'caster'),
      spawn(115000, 0, 'runner'), spawn(124000, 1, 'elite'), spawn(136000, 2, 'runner'),
      spawn(160000, 2, 'armored'), spawn(178000, 0, 'caster'), spawn(196000, 1, 'elite'),
      spawn(220000, 0, 'elite'), spawn(238000, 2, 'caster'), spawn(260000, 1, 'armored'),
    ],
    laneLocks: [],
  },
  lockdown: {
    spawns: [
      spawn(5000, 1, 'runner'), spawn(9000, 0, 'grunt'), spawn(13000, 2, 'grunt'),
      spawn(30000, 1, 'caster'), spawn(47000, 0, 'armored'), spawn(50000, 2, 'runner'),
      spawn(68000, 1, 'elite'), spawn(82000, 0, 'caster'), spawn(100000, 2, 'armored'),
      spawn(122000, 2, 'elite'), spawn(144000, 1, 'runner'), spawn(166000, 0, 'elite'),
      spawn(190000, 1, 'caster'), spawn(214000, 2, 'runner'), spawn(238000, 0, 'armored'),
      spawn(260000, 1, 'elite'), spawn(278000, 2, 'caster'),
    ],
    laneLocks: [
      { lane: 1, startsAtMs: 45000, endsAtMs: 65000 },
      { lane: 0, startsAtMs: 170000, endsAtMs: 190000 },
    ],
  },
  'elite-rush': {
    spawns: [
      spawn(5000, 2, 'runner'), spawn(8500, 1, 'runner'), spawn(12000, 0, 'runner'),
      spawn(25000, 2, 'elite'), spawn(40000, 0, 'armored'), spawn(55000, 1, 'elite'),
      spawn(75000, 2, 'caster'), spawn(95000, 0, 'elite'), spawn(118000, 1, 'armored'),
      spawn(142000, 2, 'elite'), spawn(164000, 0, 'caster'), spawn(186000, 1, 'elite'),
      spawn(208000, 2, 'armored'), spawn(230000, 0, 'elite'), spawn(250000, 1, 'caster'),
      spawn(270000, 2, 'elite'), spawn(285000, 0, 'runner'),
    ],
    laneLocks: [],
  },
};
```

`waveDirector.ts`：

```ts
import { ENEMIES } from '../content/enemies';
import { WAVE_VARIANTS } from '../content/waves';
import type { BattleState } from './types';

export function advanceWaveDirector(input: BattleState): BattleState {
  const state = structuredClone(input);
  const definition = WAVE_VARIANTS[state.variant];
  while (
    state.waveSpawnCursor < definition.spawns.length &&
    definition.spawns[state.waveSpawnCursor]!.atMs <= state.elapsedMs
  ) {
    const scheduled = definition.spawns[state.waveSpawnCursor]!;
    const enemy = ENEMIES[scheduled.enemyId];
    state.enemies.push({
      instanceId: `enemy-${state.nextEntitySeq++}`,
      enemyId: scheduled.enemyId,
      lane: scheduled.lane,
      progress: 0,
      health: enemy.health,
      armor: enemy.armor,
      status: 'advancing',
    });
    state.waveSpawnCursor += 1;
  }
  const dueLocks = definition.laneLocks.filter(({ startsAtMs }) => startsAtMs <= state.elapsedMs);
  if (state.appliedLaneLockCount < dueLocks.length) {
    const lock = dueLocks[state.appliedLaneLockCount]!;
    state.laneLock = { ...lock };
    state.appliedLaneLockCount += 1;
    state.events.push({ seq: state.nextEventSeq++, atMs: lock.startsAtMs, type: 'lane_locked', payload: { lane: lock.lane, endsAtMs: lock.endsAtMs } });
  }
  if (state.laneLock && state.elapsedMs >= state.laneLock.endsAtMs) state.laneLock = null;
  if (state.elapsedMs >= 300000 && state.boss.phase === 'absent') {
    const boss = ENEMIES.boss;
    state.boss.phase = 'advance';
    state.boss.phaseEndsAtMs = state.elapsedMs + 12000;
    state.enemies.push({
      instanceId: `enemy-${state.nextEntitySeq++}`,
      enemyId: 'boss',
      lane: state.boss.lane,
      progress: 0,
      health: boss.health,
      armor: boss.armor,
      status: 'advancing',
    });
  }
  return state;
}
```

- [ ] **Step 5: 运行测试、类型检查并提交三局变化**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/waves.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；连续三局开场敌路、锁路规则和精英密度均不同，Boss 固定在 300000ms 进入战场。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/types.ts games/wechat-h5-v2/apps/three-lane-squad/src/domain/createBattle.ts games/wechat-h5-v2/apps/three-lane-squad/src/content/waves.ts games/wechat-h5-v2/apps/three-lane-squad/src/domain/waveDirector.ts games/wechat-h5-v2/tests/three-lane-squad/unit/waves.test.ts
git commit -m "feat(squad): add three distinct six-minute wave variants"
```

### Task 7: 实现 Boss 换路、蓄力与集火打断

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/bossMachine.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/bossMachine.test.ts`

- [ ] **Step 1: 编写 Boss 换路、蓄力和打断的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';
import { applyBossDamage, advanceBoss } from '../../../apps/three-lane-squad/src/domain/bossMachine';

const squad = ['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const;

describe('boss machine', () => {
  it('switches to the weakest lane before charging', () => {
    const state = createBattle({ seed: 2, runId: 'boss', runOrdinal: 0, squad, mode: 'standard' });
    state.elapsedMs = 312000;
    state.boss = { phase: 'switch-lane', lane: 1, health: 1800, phaseEndsAtMs: 312000, chargeEndsAtMs: null, interrupted: false };
    state.heroes.push({
      instanceId: 'only-defender', heroId: 'guardian', deployedAtMs: 0, tier: 1,
      position: { lane: 0, column: 2 }, status: 'ready', moveStartedAtMs: null,
      moveEndsAtMs: null, transferReadyAtMs: 0, nextAttackAtMs: 0,
    });
    const next = advanceBoss(state);
    expect(next.boss.lane).toBe(1);
    expect(next.boss.phase).toBe('charge');
    expect(next.boss.chargeEndsAtMs).toBe(316000);
  });

  it('requires focused burst damage to interrupt a charge', () => {
    const state = createBattle({ seed: 3, runId: 'interrupt', runOrdinal: 0, squad, mode: 'standard' });
    state.elapsedMs = 320000;
    state.boss = { phase: 'charge', lane: 2, health: 1000, phaseEndsAtMs: 324000, chargeEndsAtMs: 324000, interrupted: false };
    state.focusFire = { targetId: 'boss-1', readyAtMs: 340000, expiresAtMs: 325000 };
    const small = applyBossDamage(state, 'boss-1', 120);
    expect(small.boss.phase).toBe('charge');
    const burst = applyBossDamage(small, 'boss-1', 60);
    expect(burst.boss.phase).toBe('recover');
    expect(burst.boss.interrupted).toBe(true);
    expect(burst.events.at(-1)?.type).toBe('boss_interrupt');
  });
});
```

- [ ] **Step 2: 运行测试并确认 Boss 状态机缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/bossMachine.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/domain/bossMachine'`。

- [ ] **Step 3: 实现确定性阶段转换和弱路选择**

`bossMachine.ts`：

```ts
import type { BattleState, LaneId } from './types';

const chargeDamage = new WeakMap<BattleState, number>();

const weakestLane = (state: BattleState): LaneId =>
  ([0, 1, 2] as const)
    .map((lane) => ({
      lane,
      score: state.heroes
        .filter((hero) => hero.status !== 'defeated' && hero.position.lane === lane)
        .reduce((sum, hero) => sum + hero.tier, 0),
    }))
    .sort((left, right) => left.score - right.score || left.lane - right.lane)[0]!.lane;

export function advanceBoss(input: BattleState): BattleState {
  const state = structuredClone(input);
  if (state.boss.phase === 'advance' && state.elapsedMs >= state.boss.phaseEndsAtMs) {
    state.boss.phase = 'summon';
    state.boss.phaseEndsAtMs = state.elapsedMs + 6000;
  } else if (state.boss.phase === 'summon' && state.elapsedMs >= state.boss.phaseEndsAtMs) {
    state.boss.phase = 'switch-lane';
    state.boss.phaseEndsAtMs = state.elapsedMs + 2000;
  } else if (state.boss.phase === 'switch-lane' && state.elapsedMs >= state.boss.phaseEndsAtMs) {
    state.boss.lane = weakestLane(state);
    state.boss.phase = 'charge';
    state.boss.phaseEndsAtMs = state.elapsedMs + 4000;
    state.boss.chargeEndsAtMs = state.boss.phaseEndsAtMs;
    state.boss.interrupted = false;
    chargeDamage.set(state, 0);
    state.events.push({ seq: state.nextEventSeq++, atMs: state.elapsedMs, type: 'boss_charge', payload: { lane: state.boss.lane, endsAtMs: state.boss.chargeEndsAtMs } });
  } else if (state.boss.phase === 'charge' && state.elapsedMs >= state.boss.phaseEndsAtMs) {
    state.baseHealth -= 2;
    state.failureLane = state.boss.lane;
    state.boss.phase = 'recover';
    state.boss.phaseEndsAtMs = state.elapsedMs + 5000;
    state.boss.chargeEndsAtMs = null;
  } else if (state.boss.phase === 'recover' && state.elapsedMs >= state.boss.phaseEndsAtMs) {
    state.boss.phase = 'switch-lane';
    state.boss.phaseEndsAtMs = state.elapsedMs + 2000;
  }
  return state;
}
```

- [ ] **Step 4: 加入可序列化的 180 点集火打断累计**

先在 `BossState` 加入：

```ts
  chargeDamage: number;
```

再在 `createBattle()` 的 `boss` 初始值加入：

```ts
      chargeDamage: 0,
```

删除 `bossMachine.ts` 中的 `WeakMap` 和两处 `chargeDamage.set`，在进入 `charge` 时写入：

```ts
    state.boss.chargeDamage = 0;
```

并在文件末尾加入：

```ts
export function applyBossDamage(
  input: BattleState,
  bossInstanceId: string,
  damage: number,
): BattleState {
  if (!Number.isFinite(damage) || damage <= 0) return input;
  const state = structuredClone(input);
  state.boss.health = Math.max(0, state.boss.health - damage);
  if (
    state.boss.phase === 'charge' &&
    state.focusFire.targetId === bossInstanceId &&
    state.elapsedMs < state.focusFire.expiresAtMs
  ) {
    state.boss.chargeDamage += damage;
    if (state.boss.chargeDamage >= 180) {
      state.boss.phase = 'recover';
      state.boss.phaseEndsAtMs = state.elapsedMs + 6000;
      state.boss.chargeEndsAtMs = null;
      state.boss.interrupted = true;
      state.events.push({ seq: state.nextEventSeq++, atMs: state.elapsedMs, type: 'boss_interrupt', payload: { lane: state.boss.lane, damage: state.boss.chargeDamage } });
    }
  }
  if (state.boss.health === 0) {
    state.boss.phase = 'defeated';
    state.mode = 'won';
    state.events.push({ seq: state.nextEventSeq++, atMs: state.elapsedMs, type: 'run_won', payload: { remainingBaseHealth: state.baseHealth } });
  }
  return state;
}
```

同时把测试中的两个 `boss` 对象补上 `chargeDamage: 0`。

- [ ] **Step 5: 运行测试、类型检查并提交 Boss 决战**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/bossMachine.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；Boss 选择兵力最弱路，只有有效集火窗口内累计至少 180 点伤害才会打断。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/types.ts games/wechat-h5-v2/apps/three-lane-squad/src/domain/createBattle.ts games/wechat-h5-v2/apps/three-lane-squad/src/domain/bossMachine.ts games/wechat-h5-v2/tests/three-lane-squad/unit/bossMachine.test.ts
git commit -m "feat(squad): add boss lane switch and charge interrupt"
```

### Task 8: 建立反挂机与三种阵型质量门禁

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/domain/antiIdle.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/antiIdle.test.ts`

- [ ] **Step 1: 编写决策密度、最长空窗和阵型分类的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { classifyFormation, evaluateRunQuality, evaluateThreeRunVariety } from '../../../apps/three-lane-squad/src/domain/antiIdle';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';

const squad = ['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const;

describe('anti-idle quality gates', () => {
  it('classifies formations from actual placements and tactical events', () => {
    const state = createBattle({ seed: 5, runId: 'formation', runOrdinal: 0, squad, mode: 'standard' });
    state.heroes = ([0, 1, 2] as const).map((lane) => ({
      instanceId: `h-${lane}`, heroId: lane === 0 ? 'guardian' : lane === 1 ? 'ranger' : 'priest',
      deployedAtMs: 0, tier: 1, position: { lane, column: 1 }, status: 'ready' as const,
      moveStartedAtMs: null, moveEndsAtMs: null, transferReadyAtMs: 0, nextAttackAtMs: 0,
    }));
    expect(classifyFormation(state)).toBe('balanced');
    state.events.push({ seq: 1, atMs: 1000, type: 'transfer', payload: {} }, { seq: 2, atMs: 2000, type: 'transfer', payload: {} });
    expect(classifyFormation(state)).toBe('mobile-reserve');
    state.events.push({ seq: 3, atMs: 3000, type: 'focus_fire', payload: {} }, { seq: 4, atMs: 4000, type: 'focus_fire', payload: {} }, { seq: 5, atMs: 5000, type: 'focus_fire', payload: {} });
    expect(classifyFormation(state)).toBe('focus-kill');
  });

  it('fails an idle run and requires three-run strategy variety', () => {
    expect(evaluateRunQuality({ elapsedMs: 360000, meaningfulActionCount: 12, longestDecisionGapMs: 28000 })).toEqual({
      passed: false, actionsPerMinute: 2, longestDecisionGapMs: 28000,
    });
    expect(evaluateThreeRunVariety(['balanced', 'balanced', 'balanced'])).toEqual({
      passed: false, uniqueFormationCount: 1,
    });
    expect(evaluateThreeRunVariety(['balanced', 'mobile-reserve', 'focus-kill']).passed).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认反挂机模块缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/antiIdle.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/domain/antiIdle'`。

- [ ] **Step 3: 实现阵型分类优先级**

`antiIdle.ts`：

```ts
import type { BattleState, FormationTag } from './types';

export function classifyFormation(state: BattleState): FormationTag {
  const focusCount = state.events.filter(({ type }) => type === 'focus_fire').length;
  const transferCount = state.events.filter(({ type }) => type === 'transfer').length;
  if (focusCount >= 3) return 'focus-kill';
  if (transferCount >= 2) return 'mobile-reserve';
  const occupiedLanes = new Set(
    state.heroes.filter(({ status }) => status !== 'defeated').map(({ position }) => position.lane),
  );
  return occupiedLanes.size === 3 ? 'balanced' : 'unclassified';
}
```

- [ ] **Step 4: 实现单局和连续三局的硬门禁**

在 `antiIdle.ts` 追加：

```ts
export interface RunQualityInput {
  readonly elapsedMs: number;
  readonly meaningfulActionCount: number;
  readonly longestDecisionGapMs: number;
}

export function evaluateRunQuality(input: RunQualityInput): {
  passed: boolean;
  actionsPerMinute: number;
  longestDecisionGapMs: number;
} {
  const actionsPerMinute =
    input.elapsedMs === 0
      ? 0
      : Number((input.meaningfulActionCount / (input.elapsedMs / 60000)).toFixed(2));
  return {
    passed: actionsPerMinute >= 5 && input.longestDecisionGapMs <= 20000,
    actionsPerMinute,
    longestDecisionGapMs: input.longestDecisionGapMs,
  };
}

export function evaluateThreeRunVariety(tags: readonly FormationTag[]): {
  passed: boolean;
  uniqueFormationCount: number;
} {
  const uniqueFormationCount = new Set(tags.filter((tag) => tag !== 'unclassified')).size;
  return { passed: tags.length === 3 && uniqueFormationCount >= 2, uniqueFormationCount };
}
```

- [ ] **Step 5: 运行测试并提交反挂机质量门禁**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/antiIdle.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；低于每分钟 5 次有效决策、任意决策空窗超过 20000ms 或三局只有一种阵型时明确失败。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/domain/antiIdle.ts games/wechat-h5-v2/tests/three-lane-squad/unit/antiIdle.test.ts
git commit -m "test(squad): enforce decision density and formation variety"
```

### Task 9: 实现无永久战力的局外成长与七日每日挑战

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/meta/saveModel.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/meta/dailyChallenge.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/meta.test.ts`

- [ ] **Step 1: 编写成长字段护栏和每日种子的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultSave, recordRun } from '../../../apps/three-lane-squad/src/meta/saveModel';
import { dailyChallengeForDate, recentDailyDates } from '../../../apps/three-lane-squad/src/meta/dailyChallenge';

describe('meta progression', () => {
  it('unlocks tactical choices without permanent combat stats', () => {
    const initial = createDefaultSave();
    const next = recordRun(initial, {
      runId: 'run-1', result: 'won', formationTag: 'mobile-reserve',
      variant: 'lockdown', elapsedMs: 331000, date: '2026-07-29',
    });
    const json = JSON.stringify(next);
    expect(json).not.toMatch(/attack|health|damage|power/i);
    expect(next.commanderLevel).toBe(2);
    expect(next.unlockedDoctrineIds).toContain('rapid-relay');
  });

  it('keeps a date seed stable and exposes exactly seven playable dates', () => {
    expect(dailyChallengeForDate('2026-07-29')).toEqual(dailyChallengeForDate('2026-07-29'));
    expect(recentDailyDates('2026-07-29')).toEqual([
      '2026-07-29', '2026-07-28', '2026-07-27', '2026-07-26',
      '2026-07-25', '2026-07-24', '2026-07-23',
    ]);
  });
});
```

- [ ] **Step 2: 运行测试并确认局外模块缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/meta.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/meta/saveModel'`。

- [ ] **Step 3: 实现只解锁战术规则和外观记录的存档模型**

`saveModel.ts`：

```ts
import type { FormationTag, RunVariant } from '../domain/types';

export interface RunRecord {
  readonly runId: string;
  readonly result: 'won' | 'lost';
  readonly formationTag: FormationTag;
  readonly variant: RunVariant;
  readonly elapsedMs: number;
  readonly date: string;
}

export interface ThreeLaneSave {
  readonly schemaVersion: 1;
  readonly commanderLevel: number;
  readonly unlockedDoctrineIds: readonly ('rapid-relay' | 'reserve-slot' | 'opening-scout')[];
  readonly unlockedBannerIds: readonly ('default' | 'iron-wall' | 'storm-line')[];
  readonly runHistory: readonly RunRecord[];
  readonly completedDailyDates: readonly string[];
}

export function createDefaultSave(): ThreeLaneSave {
  return {
    schemaVersion: 1,
    commanderLevel: 1,
    unlockedDoctrineIds: ['opening-scout'],
    unlockedBannerIds: ['default'],
    runHistory: [],
    completedDailyDates: [],
  };
}

export function recordRun(save: ThreeLaneSave, record: RunRecord): ThreeLaneSave {
  const runHistory = [...save.runHistory.filter(({ runId }) => runId !== record.runId), record].slice(-30);
  const commanderLevel = Math.min(10, 1 + runHistory.length);
  const unlockedDoctrineIds = new Set(save.unlockedDoctrineIds);
  const unlockedBannerIds = new Set(save.unlockedBannerIds);
  if (runHistory.length >= 1) unlockedDoctrineIds.add('rapid-relay');
  if (runHistory.length >= 3) unlockedDoctrineIds.add('reserve-slot');
  if (runHistory.some(({ formationTag }) => formationTag === 'balanced')) unlockedBannerIds.add('iron-wall');
  if (runHistory.some(({ formationTag }) => formationTag === 'focus-kill')) unlockedBannerIds.add('storm-line');
  return {
    ...save,
    commanderLevel,
    unlockedDoctrineIds: [...unlockedDoctrineIds],
    unlockedBannerIds: [...unlockedBannerIds],
    runHistory,
    completedDailyDates:
      record.result === 'won'
        ? [...new Set([...save.completedDailyDates, record.date])].slice(-7)
        : save.completedDailyDates,
  };
}
```

- [ ] **Step 4: 实现日期哈希、固定 variant 与最近七天列表**

`dailyChallenge.ts`：

```ts
import type { RunVariant } from '../domain/types';

const UTC_DAY_MS = 86400000;

const dateToUtc = (date: string): number => {
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value)) throw new Error(`invalid ISO date: ${date}`);
  return value;
};

const seedForDate = (date: string): number => {
  let hash = 2166136261;
  for (const character of date) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function dailyChallengeForDate(date: string): {
  date: string;
  seed: number;
  variant: RunVariant;
} {
  dateToUtc(date);
  const seed = seedForDate(date);
  const variants = ['balanced-front', 'lockdown', 'elite-rush'] as const;
  return { date, seed, variant: variants[seed % variants.length]! };
}

export function recentDailyDates(today: string): string[] {
  const start = dateToUtc(today);
  return Array.from({ length: 7 }, (_, index) =>
    new Date(start - index * UTC_DAY_MS).toISOString().slice(0, 10),
  );
}
```

- [ ] **Step 5: 运行测试、类型检查并提交局外循环**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/meta.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；存档不含永久攻击、生命、伤害或战力字段，同一天每日挑战的 seed 与 variant 永远固定。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/meta/saveModel.ts games/wechat-h5-v2/apps/three-lane-squad/src/meta/dailyChallenge.ts games/wechat-h5-v2/tests/three-lane-squad/unit/meta.test.ts
git commit -m "feat(squad): add ethical progression and seven-day challenges"
```

### Task 10: 建立遥测投影与本地决策密度报告

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/quality/projectEvents.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/quality/localReport.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/qualityReport.test.ts`

- [ ] **Step 1: 编写事件白名单和三局报告的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { projectDomainEvent } from '../../../apps/three-lane-squad/src/quality/projectEvents';
import { buildLocalRunReport, buildThreeRunReport } from '../../../apps/three-lane-squad/src/quality/localReport';

describe('quality projection', () => {
  it('projects only gameplay fields and strips arbitrary payload data', () => {
    const event = projectDomainEvent('run-1', {
      seq: 4, atMs: 1200, type: 'transfer',
      payload: { heroInstanceId: 'hero-1', to: { lane: 2, column: 1 }, credential: 'must-not-leak' },
    });
    expect(event).toEqual({
      name: 'squad_transfer',
      payload: { runId: 'run-1', seq: 4, atMs: 1200, heroInstanceId: 'hero-1', lane: 2, column: 1 },
    });
    expect(JSON.stringify(event)).not.toContain('credential');
  });

  it('reports real decision density and three-run formation variety', () => {
    const first = buildLocalRunReport({
      runId: 'a', variant: 'balanced-front', result: 'won', elapsedMs: 360000,
      meaningfulActionCount: 36, longestDecisionGapMs: 12000, formationTag: 'balanced',
    });
    const second = { ...first, runId: 'b', variant: 'lockdown' as const, formationTag: 'mobile-reserve' as const };
    const third = { ...first, runId: 'c', variant: 'elite-rush' as const, formationTag: 'focus-kill' as const };
    expect(first.actionsPerMinute).toBe(6);
    expect(buildThreeRunReport([first, second, third])).toMatchObject({
      passed: true, uniqueVariants: 3, uniqueFormations: 3, totalRuns: 3,
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认质量模块缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/qualityReport.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/quality/projectEvents'`。

- [ ] **Step 3: 实现领域事件的显式白名单投影**

`projectEvents.ts`：

```ts
import type { DomainEvent } from '../domain/types';

export interface ProjectedEvent {
  readonly name:
    | 'squad_deploy'
    | 'squad_transfer'
    | 'squad_evolve'
    | 'squad_focus_fire'
    | 'squad_boss_interrupt'
    | 'squad_run_complete';
  readonly payload: Record<string, string | number | boolean>;
}

const numberAt = (value: unknown, key: string): number =>
  typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>)[key] === 'number'
    ? (value as Record<string, number>)[key]!
    : -1;

const stringAt = (value: unknown, key: string): string =>
  typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>)[key] === 'string'
    ? (value as Record<string, string>)[key]!
    : '';

export function projectDomainEvent(runId: string, event: DomainEvent): ProjectedEvent | null {
  const base = { runId, seq: event.seq, atMs: event.atMs };
  if (event.type === 'deploy') {
    const to = (event.payload.to ?? {}) as Record<string, unknown>;
    return { name: 'squad_deploy', payload: { ...base, heroId: stringAt(event.payload, 'heroId'), lane: numberAt(to, 'lane'), column: numberAt(to, 'column') } };
  }
  if (event.type === 'transfer') {
    const to = (event.payload.to ?? {}) as Record<string, unknown>;
    return { name: 'squad_transfer', payload: { ...base, heroInstanceId: stringAt(event.payload, 'heroInstanceId'), lane: numberAt(to, 'lane'), column: numberAt(to, 'column') } };
  }
  if (event.type === 'evolve') return { name: 'squad_evolve', payload: { ...base, targetId: stringAt(event.payload, 'targetId'), evolvedRule: stringAt(event.payload, 'evolvedRule') } };
  if (event.type === 'focus_fire') return { name: 'squad_focus_fire', payload: { ...base, enemyInstanceId: stringAt(event.payload, 'enemyInstanceId'), lane: numberAt(event.payload, 'lane') } };
  if (event.type === 'boss_interrupt') return { name: 'squad_boss_interrupt', payload: { ...base, lane: numberAt(event.payload, 'lane'), damage: numberAt(event.payload, 'damage') } };
  if (event.type === 'run_won' || event.type === 'run_lost') return { name: 'squad_run_complete', payload: { ...base, won: event.type === 'run_won' } };
  return null;
}
```

- [ ] **Step 4: 实现单局和连续三局本地报告**

`localReport.ts`：

```ts
import { evaluateRunQuality, evaluateThreeRunVariety } from '../domain/antiIdle';
import type { FormationTag, RunVariant } from '../domain/types';

export interface LocalRunReportInput {
  readonly runId: string;
  readonly variant: RunVariant;
  readonly result: 'won' | 'lost';
  readonly elapsedMs: number;
  readonly meaningfulActionCount: number;
  readonly longestDecisionGapMs: number;
  readonly formationTag: FormationTag;
}

export interface LocalRunReport extends LocalRunReportInput {
  readonly actionsPerMinute: number;
  readonly decisionGatePassed: boolean;
}

export function buildLocalRunReport(input: LocalRunReportInput): LocalRunReport {
  const gate = evaluateRunQuality(input);
  return { ...input, actionsPerMinute: gate.actionsPerMinute, decisionGatePassed: gate.passed };
}

export function buildThreeRunReport(runs: readonly LocalRunReport[]): {
  passed: boolean;
  totalRuns: number;
  uniqueVariants: number;
  uniqueFormations: number;
} {
  const uniqueVariants = new Set(runs.map(({ variant }) => variant)).size;
  const variety = evaluateThreeRunVariety(runs.map(({ formationTag }) => formationTag));
  return {
    passed: runs.length === 3 && runs.every(({ decisionGatePassed }) => decisionGatePassed) && uniqueVariants === 3 && variety.passed,
    totalRuns: runs.length,
    uniqueVariants,
    uniqueFormations: variety.uniqueFormationCount,
  };
}
```

- [ ] **Step 5: 运行测试、类型检查并提交质量投影**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/qualityReport.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；任意未列入白名单的 payload 字段不会进入遥测，三局报告必须同时满足 variant、阵型和决策密度门禁。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/quality/projectEvents.ts games/wechat-h5-v2/apps/three-lane-squad/src/quality/localReport.ts games/wechat-h5-v2/tests/three-lane-squad/unit/qualityReport.test.ts
git commit -m "feat(squad): add safe telemetry projection and quality reports"
```

### Task 11: 接入共享高保真资产配方、提示词、来源记录与 manifest

**文件：**
- 创建：`games/wechat-h5-v2/art/recipes/three-lane-squad.json`
- 创建：`games/wechat-h5-v2/art/prompts/three-lane-squad.json`
- 创建：`games/wechat-h5-v2/art/provenance/three-lane-squad.json`
- 创建：`games/wechat-h5-v2/scripts/record-three-lane-provenance.mjs`
- 生成：`games/wechat-h5-v2/apps/three-lane-squad/public/assets/asset-manifest.json`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/presentation/assetBindings.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/assets.test.ts`

- [ ] **Step 1: 编写必需资产键和加载分组的失败测试**

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { REQUIRED_ASSET_KEYS } from '../../../apps/three-lane-squad/src/presentation/assetBindings';

describe('three-lane assets', () => {
  it('binds every required scene, hero, boss, effect and interface asset', async () => {
    const manifest = JSON.parse(await readFile('apps/three-lane-squad/public/assets/asset-manifest.json', 'utf8'));
    const ids = manifest.groups.flatMap((group: { assets: Array<{ id: string }> }) => group.assets.map(({ id }) => id));
    expect(new Set(ids)).toEqual(new Set(REQUIRED_ASSET_KEYS));
    expect(manifest.groups.find(({ id }: { id: string }) => id === 'boot').required).toBe(true);
    expect(manifest.groups.find(({ id }: { id: string }) => id === 'battle').required).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认配方与绑定缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/assets.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/presentation/assetBindings'`。

- [ ] **Step 3: 写入精确导出配方和完整生成提示词**

`art/recipes/three-lane-squad.json`：

```json
{
  "schemaVersion": 1,
  "gameId": "three-lane-squad",
  "outputs": [
    { "id": "cover", "source": "art/source/three-lane-squad/cover.png", "target": "apps/three-lane-squad/public/assets/cover.webp", "width": 780, "height": 1688, "fit": "cover", "format": "webp", "quality": 88, "groupId": "boot", "type": "texture" },
    { "id": "battlefield", "source": "art/source/three-lane-squad/battlefield.png", "target": "apps/three-lane-squad/public/assets/battlefield.webp", "width": 1170, "height": 1800, "fit": "cover", "format": "webp", "quality": 88, "groupId": "battle", "type": "texture" },
    { "id": "hero-guardian", "source": "art/source/three-lane-squad/hero-guardian.png", "target": "apps/three-lane-squad/public/assets/hero-guardian.webp", "width": 512, "height": 768, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "texture" },
    { "id": "hero-ranger", "source": "art/source/three-lane-squad/hero-ranger.png", "target": "apps/three-lane-squad/public/assets/hero-ranger.webp", "width": 512, "height": 768, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "texture" },
    { "id": "hero-mage", "source": "art/source/three-lane-squad/hero-mage.png", "target": "apps/three-lane-squad/public/assets/hero-mage.webp", "width": 512, "height": 768, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "texture" },
    { "id": "hero-engineer", "source": "art/source/three-lane-squad/hero-engineer.png", "target": "apps/three-lane-squad/public/assets/hero-engineer.webp", "width": 512, "height": 768, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "texture" },
    { "id": "hero-priest", "source": "art/source/three-lane-squad/hero-priest.png", "target": "apps/three-lane-squad/public/assets/hero-priest.webp", "width": 512, "height": 768, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "texture" },
    { "id": "enemy-atlas", "source": "art/source/three-lane-squad/enemy-atlas.png", "target": "apps/three-lane-squad/public/assets/enemy-atlas.webp", "width": 2048, "height": 2048, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "atlas" },
    { "id": "boss-atlas", "source": "art/source/three-lane-squad/boss-atlas.png", "target": "apps/three-lane-squad/public/assets/boss-atlas.webp", "width": 2048, "height": 2048, "fit": "contain", "format": "webp", "quality": 92, "groupId": "boss", "type": "atlas" },
    { "id": "effect-atlas", "source": "art/source/three-lane-squad/effect-atlas.png", "target": "apps/three-lane-squad/public/assets/effect-atlas.webp", "width": 2048, "height": 2048, "fit": "contain", "format": "webp", "quality": 90, "groupId": "battle", "type": "atlas" },
    { "id": "ui-frame", "source": "art/source/three-lane-squad/ui-frame.png", "target": "apps/three-lane-squad/public/assets/ui-frame.webp", "width": 1170, "height": 2532, "fit": "contain", "format": "webp", "quality": 88, "groupId": "boot", "type": "texture" }
  ]
}
```

`art/prompts/three-lane-squad.json`：

```json
{
  "cover": "高保真竖屏奇幻战术手游主视觉，五名英雄在三条清晰可辨的遗迹防线上紧急调兵，巨型虚空领主在远景蓄力，蓝紫与熔金配色，角色轮廓不重叠，前中远景完整，底部保留界面暗区，无文字、无标志、无水印、无设备边框。",
  "battlefield": "竖屏三路战术游戏战场，森林遗迹堡垒，三条从下向上延伸且边界明确的道路，每路四个可部署石台，中央有跨路传送桥，远景为Boss入口，2D商业手游原画，高辨识光照，无角色、无文字、无界面。",
  "hero-guardian": "透明背景全身角色立绘，重甲女性守卫，巨盾和金色墙阵符文，正面三分之二视角，清晰剪影，精细材质，商业2D手游品质，无文字、无底座。",
  "hero-ranger": "透明背景全身角色立绘，风行男性游侠，长弓与青色穿透箭，正面三分之二视角，清晰剪影，商业2D手游品质，无文字、无底座。",
  "hero-mage": "透明背景全身角色立绘，紫电女性法师，浮空法环与跨路闪电，正面三分之二视角，清晰剪影，商业2D手游品质，无文字、无底座。",
  "hero-engineer": "透明背景全身角色立绘，少年符文工程师，便携炮塔与工具臂，正面三分之二视角，清晰剪影，商业2D手游品质，无文字、无底座。",
  "hero-priest": "透明背景全身角色立绘，白金男性祭司，护盾圣印与溢出治疗光带，正面三分之二视角，清晰剪影，商业2D手游品质，无文字、无底座。",
  "enemy-atlas": "透明背景敌人动作图集，步兵、疾跑兽、重甲兵、施法者、精英五种单位，每种包含前进、受击、攻击和倒地四帧，横向整齐排列，轮廓差异强，统一奇幻遗迹风格，无文字。",
  "boss-atlas": "透明背景巨型虚空领主动作图集，前进、召唤、换路、四秒蓄力、被打断、恢复、崩解七组动作，12fps设计，蓝紫核心与金色破甲反馈，无文字。",
  "effect-atlas": "透明背景战术特效图集，部署光柱、撤回、进化、跨路残影、集火标记、蓄力警告、打断爆点、胜利崩解，每组8至12帧，边缘干净可叠加，无文字。",
  "ui-frame": "透明背景竖屏奇幻战术手游界面装饰，顶部资源条、三路告警边框、底部五英雄卡槽、暂停按钮、冷却环装饰，蓝黑石材与熔金线条，无任何文字和数字。"
}
```

- [ ] **Step 4: 生成并校验来源记录、manifest 与运行时绑定**

逐条使用 `art/prompts/three-lane-squad.json` 的 11 条完整提示词生成透明或不透明 PNG，并严格保存到配方的 11 个 `source` 路径；人工确认无文字、水印、肢体错误、角色粘连或道路不可读后，创建 `record-three-lane-provenance.mjs`：

```js
import { readFile, writeFile } from 'node:fs/promises';

const recipe = JSON.parse(await readFile('art/recipes/three-lane-squad.json', 'utf8'));
const prompts = JSON.parse(await readFile('art/prompts/three-lane-squad.json', 'utf8'));
const report = JSON.parse(await readFile('art/reports/three-lane-squad-export.json', 'utf8'));
const reportByTarget = new Map(report.map((entry) => [entry.target.replaceAll('\\', '/'), entry]));
const roleById = {
  cover: 'key-art',
  battlefield: 'scene',
  'hero-guardian': 'character',
  'hero-ranger': 'character',
  'hero-mage': 'character',
  'hero-engineer': 'character',
  'hero-priest': 'character',
  'enemy-atlas': 'atlas',
  'boss-atlas': 'boss',
  'effect-atlas': 'effect',
  'ui-frame': 'ui',
};
const usageById = {
  cover: '首页封面与加载主视觉',
  battlefield: '三路四列局内战场背景',
  'hero-guardian': '守卫部署、进化与头像',
  'hero-ranger': '游侠部署、进化与头像',
  'hero-mage': '法师部署、进化与头像',
  'hero-engineer': '工程师部署、进化与头像',
  'hero-priest': '祭司部署、进化与头像',
  'enemy-atlas': '五类普通敌人动作图集',
  'boss-atlas': '首领阶段、蓄力、打断与崩解',
  'effect-atlas': '部署、调兵、集火和胜负特效',
  'ui-frame': '首页、HUD、暂停和结算装饰',
};
if (process.env.HUMAN_APPROVAL !== 'approved') {
  throw new Error('HUMAN_APPROVAL_REQUIRED');
}
const generatedAt = new Date().toISOString();
const provenance = recipe.outputs.map((output) => {
  const exported = reportByTarget.get(output.target);
  if (!exported) throw new Error(`EXPORT_REPORT_MISSING:${output.id}`);
  const prompt = prompts[output.id];
  if (typeof prompt !== 'string' || prompt.length < 20) throw new Error(`PROMPT_MISSING:${output.id}`);
  return {
    id: output.id,
    gameId: 'three-lane-squad',
    role: roleById[output.id],
    sourceFile: output.source,
    runtimeFile: output.target,
    prompt,
    generatedAt,
    usage: usageById[output.id],
    sha256: exported.sha256,
    humanRevisionStatus: 'approved',
    ...(output.type === 'atlas' ? { frameRate: 12 } : {}),
  };
});
await writeFile(
  'art/provenance/three-lane-squad.json',
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(`recorded ${provenance.length} approved assets`);
```

执行导出、来源记录、manifest 和校验：

```powershell
npm.cmd --prefix games/wechat-h5-v2 run assets:export -- art/recipes/three-lane-squad.json
$env:HUMAN_APPROVAL='approved'
npm.cmd --prefix games/wechat-h5-v2 exec -- node scripts/record-three-lane-provenance.mjs
npm.cmd --prefix games/wechat-h5-v2 run assets:manifest -- art/recipes/three-lane-squad.json
npm.cmd --prefix games/wechat-h5-v2 run assets:validate -- three-lane-squad
```

预期：三个命令退出码均为 `0`；生成 11 个 WebP、`art/reports/three-lane-squad-export.json`、11 条状态为 `approved` 且 SHA-256 为 64 位小写十六进制的来源记录，以及非空 `asset-manifest.json`。

`assetBindings.ts`：

```ts
export const REQUIRED_ASSET_KEYS = [
  'cover', 'battlefield', 'hero-guardian', 'hero-ranger', 'hero-mage',
  'hero-engineer', 'hero-priest', 'enemy-atlas', 'boss-atlas',
  'effect-atlas', 'ui-frame',
] as const;

export type ThreeLaneAssetKey = (typeof REQUIRED_ASSET_KEYS)[number];

export const HERO_ASSET_KEYS = {
  guardian: 'hero-guardian',
  ranger: 'hero-ranger',
  mage: 'hero-mage',
  engineer: 'hero-engineer',
  priest: 'hero-priest',
} as const satisfies Record<string, ThreeLaneAssetKey>;
```

- [ ] **Step 5: 运行资产测试并提交固定来源资产**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/assets.test.ts
npm.cmd --prefix games/wechat-h5-v2 run assets:validate -- three-lane-squad
```

预期：1 test PASS；资产校验退出码为 `0`，manifest 中恰有 11 个唯一资产键且没有空分组作为最终交付。

提交：

```powershell
git add -- games/wechat-h5-v2/art/recipes/three-lane-squad.json games/wechat-h5-v2/art/prompts/three-lane-squad.json games/wechat-h5-v2/art/source/three-lane-squad games/wechat-h5-v2/art/provenance/three-lane-squad.json games/wechat-h5-v2/art/reports/three-lane-squad-export.json games/wechat-h5-v2/scripts/record-three-lane-provenance.mjs games/wechat-h5-v2/apps/three-lane-squad/public/assets games/wechat-h5-v2/apps/three-lane-squad/src/presentation/assetBindings.ts games/wechat-h5-v2/tests/three-lane-squad/unit/assets.test.ts
git commit -m "feat(squad): add approved high-fidelity asset pipeline"
```

### Task 12: 实现完整首页与成长页

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/presentation/HomeView.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/presentation/ProgressView.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/homeProgress.test.ts`

- [ ] **Step 1: 编写首页入口、三局预告和成长内容的失败测试**

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createHomeView } from '../../../apps/three-lane-squad/src/presentation/HomeView';
import { createProgressView } from '../../../apps/three-lane-squad/src/presentation/ProgressView';
import { createDefaultSave } from '../../../apps/three-lane-squad/src/meta/saveModel';

describe('home and progress views', () => {
  it('starts standard, daily and progress flows from real buttons', () => {
    const onStandard = vi.fn();
    const onDaily = vi.fn();
    const onProgress = vi.fn();
    const view = createHomeView({ nextRunOrdinal: 1, dailyDate: '2026-07-29', onStandard, onDaily, onProgress });
    document.body.append(view);
    expect(view.querySelector('[data-next-variant]')?.textContent).toContain('封锁战');
    (view.querySelector('[data-action="standard"]') as HTMLButtonElement).click();
    (view.querySelector('[data-action="daily"]') as HTMLButtonElement).click();
    (view.querySelector('[data-action="progress"]') as HTMLButtonElement).click();
    expect([onStandard.mock.calls.length, onDaily.mock.calls.length, onProgress.mock.calls.length]).toEqual([1, 1, 1]);
  });

  it('shows tactical unlocks and never renders permanent combat values', () => {
    const view = createProgressView(createDefaultSave(), vi.fn());
    expect(view.textContent).toContain('开局侦察');
    expect(view.textContent).not.toMatch(/攻击力|生命值|永久伤害|战力/);
  });
});
```

- [ ] **Step 2: 运行测试并确认首页组件缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/homeProgress.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/presentation/HomeView'`。

- [ ] **Step 3: 实现带下一局真实变化预告的首页**

`HomeView.ts`：

```ts
import { standardVariantForRun } from '../domain/createBattle';

const variantLabel = {
  'balanced-front': '均衡前线：三路轮流施压',
  lockdown: '封锁战：中路将在 45 秒封锁',
  'elite-rush': '精英突袭：高威胁单位提前出现',
} as const;

export function createHomeView(input: {
  nextRunOrdinal: number;
  dailyDate: string;
  onStandard: () => void;
  onDaily: () => void;
  onProgress: () => void;
}): HTMLElement {
  const root = document.createElement('main');
  root.className = 'home-view';
  root.innerHTML = `
    <img src="./assets/cover.webp" alt="" class="home-cover">
    <section class="home-panel" aria-labelledby="game-title">
      <p class="eyebrow">六分钟三路战术</p>
      <h1 id="game-title">三路小队</h1>
      <p data-next-variant>${variantLabel[standardVariantForRun(input.nextRunOrdinal)]}</p>
      <button data-action="standard" class="primary">开始出征</button>
      <button data-action="daily">每日挑战 · ${input.dailyDate}</button>
      <button data-action="progress">战术成长</button>
      <a href="../hub/">返回游戏大厅</a>
    </section>`;
  root.querySelector('[data-action="standard"]')!.addEventListener('click', input.onStandard);
  root.querySelector('[data-action="daily"]')!.addEventListener('click', input.onDaily);
  root.querySelector('[data-action="progress"]')!.addEventListener('click', input.onProgress);
  return root;
}
```

- [ ] **Step 4: 实现只展示战术解锁和七日记录的成长页**

`ProgressView.ts`：

```ts
import type { ThreeLaneSave } from '../meta/saveModel';

const doctrineNames = {
  'opening-scout': '开局侦察：显示首波敌序',
  'rapid-relay': '快速接力：首次调兵冷却缩短',
  'reserve-slot': '预备席：开局可更换一次英雄顺序',
} as const;

export function createProgressView(save: ThreeLaneSave, onBack: () => void): HTMLElement {
  const root = document.createElement('main');
  root.className = 'progress-view';
  const doctrines = save.unlockedDoctrineIds.map((id) => `<li>${doctrineNames[id]}</li>`).join('');
  const dailies = save.completedDailyDates.length === 0
    ? '<li>尚未完成每日挑战</li>'
    : save.completedDailyDates.map((date) => `<li>${date} 已完成</li>`).join('');
  root.innerHTML = `
    <header><button data-action="back" aria-label="返回首页">返回</button><h1>战术成长</h1></header>
    <p>指挥官等级 ${save.commanderLevel} · 只解锁新选择，不增加永久数值</p>
    <section><h2>战术条令</h2><ul>${doctrines}</ul></section>
    <section><h2>最近七日</h2><ul>${dailies}</ul></section>`;
  root.querySelector('[data-action="back"]')!.addEventListener('click', onBack);
  return root;
}
```

- [ ] **Step 5: 运行测试并提交首页与成长页**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/homeProgress.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；首页三个按钮分别进入标准局、每日挑战和成长页，成长页不出现任何永久战斗数值。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/presentation/HomeView.ts games/wechat-h5-v2/apps/three-lane-squad/src/presentation/ProgressView.ts games/wechat-h5-v2/tests/three-lane-squad/unit/homeProgress.test.ts
git commit -m "feat(squad): add complete home and progression views"
```

### Task 13: 实现 Pixi 战场、HUD 与真实触摸战术输入

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/presentation/BattleScene.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/presentation/Hud.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/battleInput.test.ts`

- [ ] **Step 1: 编写触摸坐标映射和 HUD 操作的失败测试**

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mapBattleGesture } from '../../../apps/three-lane-squad/src/presentation/BattleScene';
import { createHud } from '../../../apps/three-lane-squad/src/presentation/Hud';

describe('battle touch input', () => {
  it('maps a card drag, hero drag and enemy tap to production commands', () => {
    expect(mapBattleGesture({ kind: 'drag', source: 'card:ranger', start: { x: 80, y: 760 }, end: { x: 195, y: 440 }, atMs: 1000 })).toEqual({
      type: 'deploy', heroId: 'ranger', to: { lane: 1, column: 1 }, atMs: 1000,
    });
    expect(mapBattleGesture({ kind: 'drag', source: 'hero:hero-3', start: { x: 195, y: 440 }, end: { x: 325, y: 320 }, atMs: 2200 })).toEqual({
      type: 'transfer', heroInstanceId: 'hero-3', to: { lane: 2, column: 2 }, atMs: 2200,
    });
    expect(mapBattleGesture({ kind: 'tap', source: 'enemy:enemy-7', point: { x: 120, y: 210 }, atMs: 3000 })).toEqual({
      type: 'focus-fire', enemyInstanceId: 'enemy-7', atMs: 3000,
    });
  });

  it('exposes pause and focus fire cooldown as accessible controls', () => {
    const onPause = vi.fn();
    const hud = createHud({ energy: 12, baseHealth: 2, elapsedMs: 65000, focusReadyAtMs: 80000, onPause });
    (hud.querySelector('[data-action="pause"]') as HTMLButtonElement).click();
    expect(onPause).toHaveBeenCalledOnce();
    expect(hud.textContent).toContain('集火 15秒');
  });
});
```

- [ ] **Step 2: 运行测试并确认战场表现模块缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/battleInput.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/presentation/BattleScene'`。

- [ ] **Step 3: 实现逻辑坐标到三路四列命令的唯一映射**

`BattleScene.ts`：

```ts
import { Container, Sprite, Texture } from 'pixi.js';
import type { BattleCommand } from '../domain/applyCommand';
import type { BattleState, GridPosition, HeroId } from '../domain/types';

type Point = { x: number; y: number };
type BattleGesture =
  | { kind: 'drag'; source: `card:${HeroId}` | `hero:${string}`; start: Point; end: Point; atMs: number }
  | { kind: 'tap'; source: `enemy:${string}`; point: Point; atMs: number };

const toGrid = (point: Point): GridPosition | null => {
  const lane = Math.floor(point.x / 130);
  const column = Math.floor((620 - point.y) / 120);
  if (lane < 0 || lane > 2 || column < 0 || column > 3) return null;
  return { lane: lane as 0 | 1 | 2, column: column as 0 | 1 | 2 | 3 };
};

export function mapBattleGesture(gesture: BattleGesture): BattleCommand | null {
  if (gesture.kind === 'tap') {
    return { type: 'focus-fire', enemyInstanceId: gesture.source.slice(6), atMs: gesture.atMs };
  }
  const to = toGrid(gesture.end);
  if (!to) return null;
  if (gesture.source.startsWith('card:')) {
    return { type: 'deploy', heroId: gesture.source.slice(5) as HeroId, to, atMs: gesture.atMs };
  }
  return { type: 'transfer', heroInstanceId: gesture.source.slice(5), to, atMs: gesture.atMs };
}

export class BattleScene {
  readonly root = new Container();
  private readonly heroSprites = new Map<string, Sprite>();
  private readonly enemySprites = new Map<string, Sprite>();

  constructor(background: Texture) {
    const backdrop = new Sprite(background);
    backdrop.width = 390;
    backdrop.height = 844;
    this.root.addChild(backdrop);
  }

  render(state: BattleState, textureFor: (key: string) => Texture): void {
    for (const hero of state.heroes) {
      const sprite = this.heroSprites.get(hero.instanceId) ?? new Sprite(textureFor(`hero-${hero.heroId}`));
      sprite.anchor.set(0.5, 1);
      sprite.position.set(hero.position.lane * 130 + 65, 620 - hero.position.column * 120);
      sprite.alpha = hero.status === 'moving' ? 0.65 : 1;
      if (!this.heroSprites.has(hero.instanceId)) {
        this.heroSprites.set(hero.instanceId, sprite);
        this.root.addChild(sprite);
      }
    }
    for (const enemy of state.enemies) {
      const sprite = this.enemySprites.get(enemy.instanceId) ?? new Sprite(textureFor('enemy-atlas'));
      sprite.anchor.set(0.5);
      sprite.position.set(enemy.lane * 130 + 65, 120 + enemy.progress * 120);
      if (!this.enemySprites.has(enemy.instanceId)) {
        this.enemySprites.set(enemy.instanceId, sprite);
        this.root.addChild(sprite);
      }
    }
  }
}
```

- [ ] **Step 4: 实现能源、基地、计时、英雄卡和战术冷却 HUD**

`Hud.ts`：

```ts
export function createHud(input: {
  energy: number;
  baseHealth: number;
  elapsedMs: number;
  focusReadyAtMs: number;
  onPause: () => void;
}): HTMLElement {
  const root = document.createElement('section');
  root.className = 'battle-hud';
  root.setAttribute('aria-label', '战斗状态');
  const focusSeconds = Math.max(0, Math.ceil((input.focusReadyAtMs - input.elapsedMs) / 1000));
  const seconds = Math.floor(input.elapsedMs / 1000);
  root.innerHTML = `
    <div class="top-hud">
      <output aria-label="能源">能源 ${Math.floor(input.energy)}</output>
      <output aria-label="基地耐久">基地 ${input.baseHealth}/3</output>
      <time>${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}</time>
      <button data-action="pause" aria-label="暂停游戏">Ⅱ</button>
    </div>
    <output class="focus-status" aria-live="polite">集火 ${focusSeconds === 0 ? '就绪' : `${focusSeconds}秒`}</output>
    <div class="hero-tray">
      ${(['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const)
        .map((id) => `<button data-hero-card="${id}" draggable="false">${id}</button>`).join('')}
    </div>`;
  root.querySelector('[data-action="pause"]')!.addEventListener('click', input.onPause);
  return root;
}
```

- [ ] **Step 5: 运行测试、类型检查并提交真实触摸战场**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/battleInput.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；卡牌拖放生成 `deploy`，已部署英雄拖放生成 `transfer`，敌人点按生成 `focus-fire`，没有测试专用命令分支。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/presentation/BattleScene.ts games/wechat-h5-v2/apps/three-lane-squad/src/presentation/Hud.ts games/wechat-h5-v2/tests/three-lane-squad/unit/battleInput.test.ts
git commit -m "feat(squad): add Pixi battlefield and production touch controls"
```

### Task 14: 实现暂停、设置、胜负结算、失败归因与无刷新重玩

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/presentation/OverlayViews.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/overlays.test.ts`

- [ ] **Step 1: 编写暂停恢复、失败归因和重玩回调的失败测试**

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createPauseOverlay, createResultOverlay } from '../../../apps/three-lane-squad/src/presentation/OverlayViews';

describe('overlay views', () => {
  it('supports resume, mute, reduced motion and return home', () => {
    const onResume = vi.fn();
    const onMuteChange = vi.fn();
    const onMotionChange = vi.fn();
    const onHome = vi.fn();
    const view = createPauseOverlay({ muted: false, reducedMotion: false, onResume, onMuteChange, onMotionChange, onHome });
    (view.querySelector('[data-action="resume"]') as HTMLButtonElement).click();
    (view.querySelector('[data-setting="mute"]') as HTMLInputElement).click();
    (view.querySelector('[data-setting="motion"]') as HTMLInputElement).click();
    (view.querySelector('[data-action="home"]') as HTMLButtonElement).click();
    expect([onResume.mock.calls.length, onMuteChange.mock.calls.length, onMotionChange.mock.calls.length, onHome.mock.calls.length]).toEqual([1, 1, 1, 1]);
  });

  it('shows a concrete correction and replays without navigation', () => {
    const onReplay = vi.fn();
    const view = createResultOverlay({
      result: 'lost', variantLabel: '封锁战', formationLabel: '均衡阵',
      failureLane: 2, longestDecisionGapMs: 24000, onReplay, onProgress: vi.fn(), onHome: vi.fn(),
    });
    expect(view.textContent).toContain('右路');
    expect(view.textContent).toContain('24秒未调度');
    (view.querySelector('[data-action="replay"]') as HTMLButtonElement).click();
    expect(onReplay).toHaveBeenCalledOnce();
    expect(location.href).toBe('http://localhost:3000/');
  });
});
```

- [ ] **Step 2: 运行测试并确认覆盖层模块缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/overlays.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/presentation/OverlayViews'`。

- [ ] **Step 3: 实现可恢复焦点的暂停和设置覆盖层**

`OverlayViews.ts`：

```ts
export function createPauseOverlay(input: {
  muted: boolean;
  reducedMotion: boolean;
  onResume: () => void;
  onMuteChange: (muted: boolean) => void;
  onMotionChange: (reduced: boolean) => void;
  onHome: () => void;
}): HTMLElement {
  const root = document.createElement('section');
  root.className = 'modal-overlay';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pause-title');
  root.innerHTML = `
    <div class="modal-card">
      <h2 id="pause-title">战斗暂停</h2>
      <label><input data-setting="mute" type="checkbox" ${input.muted ? 'checked' : ''}>静音</label>
      <label><input data-setting="motion" type="checkbox" ${input.reducedMotion ? 'checked' : ''}>减少动态效果</label>
      <button data-action="resume" autofocus>继续战斗</button>
      <button data-action="home">返回首页</button>
    </div>`;
  root.querySelector('[data-action="resume"]')!.addEventListener('click', input.onResume);
  root.querySelector('[data-action="home"]')!.addEventListener('click', input.onHome);
  root.querySelector('[data-setting="mute"]')!.addEventListener('change', (event) => input.onMuteChange((event.currentTarget as HTMLInputElement).checked));
  root.querySelector('[data-setting="motion"]')!.addEventListener('change', (event) => input.onMotionChange((event.currentTarget as HTMLInputElement).checked));
  return root;
}
```

- [ ] **Step 4: 实现胜负摘要、失败归因和无导航重玩覆盖层**

在 `OverlayViews.ts` 追加：

```ts
const laneNames = ['左路', '中路', '右路'] as const;

export function createResultOverlay(input: {
  result: 'won' | 'lost';
  variantLabel: string;
  formationLabel: string;
  failureLane: 0 | 1 | 2 | null;
  longestDecisionGapMs: number;
  onReplay: () => void;
  onProgress: () => void;
  onHome: () => void;
}): HTMLElement {
  const root = document.createElement('section');
  root.className = 'modal-overlay result';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const correction =
    input.result === 'won'
      ? `本局以${input.formationLabel}击破首领，下一局将更换敌军规则。`
      : `${input.failureLane === null ? '防线' : laneNames[input.failureLane]}失守；最长 ${Math.ceil(input.longestDecisionGapMs / 1000)}秒未调度，下局优先保留一次跨路支援。`;
  root.innerHTML = `
    <div class="modal-card">
      <p>${input.variantLabel}</p>
      <h2>${input.result === 'won' ? '远征成功' : '防线失守'}</h2>
      <p data-correction>${correction}</p>
      <button data-action="replay" autofocus>立即再战</button>
      <button data-action="progress">查看成长</button>
      <button data-action="home">返回首页</button>
    </div>`;
  root.querySelector('[data-action="replay"]')!.addEventListener('click', input.onReplay);
  root.querySelector('[data-action="progress"]')!.addEventListener('click', input.onProgress);
  root.querySelector('[data-action="home"]')!.addEventListener('click', input.onHome);
  return root;
}
```

- [ ] **Step 5: 运行测试并提交暂停与结算闭环**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/overlays.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：2 tests PASS；暂停可恢复，静音和减少动态效果可切换，结算明确指出失守路和最长决策空窗，重玩不刷新页面。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/presentation/OverlayViews.ts games/wechat-h5-v2/tests/three-lane-squad/unit/overlays.test.ts
git commit -m "feat(squad): add pause settings and actionable results"
```

### Task 15: 组装完整流程并接入全部共享 H5 接口

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/app/createThreeLaneApp.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/main.ts`
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/style.css`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/integration/sharedAssembly.test.ts`

- [ ] **Step 1: 编写共享接口唯一装配和完整页面流的失败测试**

```ts
// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createThreeLaneApp } from '../../../apps/three-lane-squad/src/app/createThreeLaneApp';
import { createDefaultSave } from '../../../apps/three-lane-squad/src/meta/saveModel';

describe('shared assembly', () => {
  it('consumes every shared package once and does not define a second runtime', async () => {
    const source = await readFile('apps/three-lane-squad/src/main.ts', 'utf8');
    for (const call of [
      'createGameRuntime(', 'createInputController(', 'createAudioBus(',
      'createAssetLoader(', 'createSaveStore(', 'createTelemetryClient(',
      'createAccessibilityController(', 'createTestHarness(',
    ]) expect(source).toContain(call);
    expect(source).not.toMatch(/class GameRuntime|function createLocalRuntime|requestAnimationFrame\s*\(/);
  });

  it('moves home to battle to result to progress without a page reload', () => {
    document.body.innerHTML = '<div id="app"></div><canvas id="game-canvas"></canvas><div id="ui-layer"></div>';
    const host = document.querySelector<HTMLElement>('#ui-layer')!;
    const app = createThreeLaneApp({
      host,
      save: createDefaultSave(),
      today: '2026-07-29',
      emit: vi.fn(),
      persist: vi.fn(),
      setPaused: vi.fn(),
    });
    (host.querySelector('[data-action="standard"]') as HTMLButtonElement).click();
    expect(app.snapshot().screen).toBe('battle');
    for (let tick = 0; tick < 7200 && app.snapshot().screen === 'battle'; tick += 1) {
      app.fixedUpdate(50);
    }
    expect(app.snapshot().screen).toBe('result');
    (host.querySelector('[data-action="progress"]') as HTMLButtonElement).click();
    expect(app.snapshot().screen).toBe('progress');
  });
});
```

- [ ] **Step 2: 运行测试并确认应用装配器缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/integration/sharedAssembly.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/app/createThreeLaneApp'`。

- [ ] **Step 3: 实现不依赖共享包内部状态的页面与战斗控制器**

`createThreeLaneApp.ts`：

```ts
import { applyCommand, type BattleCommand } from '../domain/applyCommand';
import { classifyFormation } from '../domain/antiIdle';
import { advanceBattle } from '../domain/advanceBattle';
import { advanceBoss } from '../domain/bossMachine';
import { createBattle } from '../domain/createBattle';
import type { BattleState } from '../domain/types';
import { advanceWaveDirector } from '../domain/waveDirector';
import type { ThreeLaneSave } from '../meta/saveModel';
import { recordRun } from '../meta/saveModel';
import { createHomeView } from '../presentation/HomeView';
import { createHud } from '../presentation/Hud';
import { createPauseOverlay, createResultOverlay } from '../presentation/OverlayViews';
import { createProgressView } from '../presentation/ProgressView';
import { projectDomainEvent } from '../quality/projectEvents';

type Screen = 'home' | 'battle' | 'paused' | 'result' | 'progress';
const squad = ['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const;

export interface ThreeLaneApp {
  snapshot(): { screen: Screen; runOrdinal: number; battle: BattleState | null; save: ThreeLaneSave };
  startDaily(seed: number): void;
  dispatch(command: BattleCommand): void;
  fixedUpdate(stepMs: number): void;
  pause(): void;
  resume(): void;
}

export function createThreeLaneApp(input: {
  host: HTMLElement;
  save: ThreeLaneSave;
  today: string;
  emit: (name: string, payload?: Record<string, unknown>) => void;
  persist: (save: ThreeLaneSave) => void;
  setPaused: (paused: boolean) => void;
}): ThreeLaneApp {
  let screen: Screen = 'home';
  let save = input.save;
  let battle: BattleState | null = null;
  let runOrdinal = save.runHistory.length;
  let projectedEventSeq = 0;

  const replace = (view: HTMLElement): void => input.host.replaceChildren(view);

  const showHome = (): void => {
    screen = 'home';
    replace(createHomeView({
      nextRunOrdinal: runOrdinal,
      dailyDate: input.today,
      onStandard: () => start('standard', 7000 + runOrdinal),
      onDaily: () => start('daily', 0),
      onProgress: showProgress,
    }));
  };

  const showProgress = (): void => {
    screen = 'progress';
    replace(createProgressView(save, showHome));
  };

  const renderHud = (): void => {
    if (!battle) return;
    replace(createHud({
      energy: battle.energy,
      baseHealth: battle.baseHealth,
      elapsedMs: battle.elapsedMs,
      focusReadyAtMs: battle.focusFire.readyAtMs,
      onPause: pause,
    }));
  };

  const start = (mode: 'standard' | 'daily', seed: number): void => {
    battle = createBattle({
      seed,
      runId: `${mode}-${input.today}-${runOrdinal}`,
      runOrdinal,
      squad,
      mode,
    });
    battle.mode = 'playing';
    screen = 'battle';
    projectedEventSeq = 0;
    input.emit('run_started', { runId: battle.runId, variant: battle.variant, mode });
    renderHud();
  };

  const finish = (): void => {
    if (!battle) return;
    const result = battle.mode === 'won' ? 'won' : 'lost';
    const formationTag = classifyFormation(battle);
    battle.formationTag = formationTag;
    const failureLane = battle.failureLane;
    const longestDecisionGapMs = battle.longestDecisionGapMs;
    save = recordRun(save, {
      runId: battle.runId,
      result,
      formationTag,
      variant: battle.variant,
      elapsedMs: battle.elapsedMs,
      date: input.today,
    });
    input.persist(save);
    screen = 'result';
    replace(createResultOverlay({
      result,
      variantLabel: battle.variant,
      formationLabel: formationTag,
      failureLane,
      longestDecisionGapMs,
      onReplay: () => {
        runOrdinal += 1;
        start('standard', 7000 + runOrdinal);
      },
      onProgress: showProgress,
      onHome: showHome,
    }));
  };

  const pause = (): void => {
    if (!battle || screen !== 'battle') return;
    screen = 'paused';
    input.setPaused(true);
    replace(createPauseOverlay({
      muted: false,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onResume: resume,
      onMuteChange: (muted) => input.emit('setting_changed', { muted }),
      onMotionChange: (reducedMotion) => input.emit('setting_changed', { reducedMotion }),
      onHome: showHome,
    }));
  };

  const resume = (): void => {
    if (screen !== 'paused') return;
    screen = 'battle';
    input.setPaused(false);
    renderHud();
  };

  const api: ThreeLaneApp = {
    snapshot: () => structuredClone({ screen, runOrdinal, battle, save }),
    startDaily(seed) { start('daily', seed); },
    dispatch(command) {
      if (!battle || screen !== 'battle') return;
      const result = applyCommand(battle, command);
      if (result.ok) battle = result.state;
    },
    fixedUpdate(stepMs) {
      if (!battle || screen !== 'battle') return;
      battle = advanceWaveDirector(battle);
      battle = advanceBattle(battle, stepMs);
      battle = advanceBoss(battle);
      for (const event of battle.events.filter(({ seq }) => seq > projectedEventSeq)) {
        projectedEventSeq = event.seq;
        const projected = projectDomainEvent(battle.runId, event);
        if (projected) input.emit(projected.name, projected.payload);
      }
      if (battle.mode === 'won' || battle.mode === 'lost') finish();
    },
    pause,
    resume,
  };
  showHome();
  return api;
}
```

- [ ] **Step 4: 使用共享运行时、输入、音频、资产、存档、遥测、无障碍和测试壳启动**

`main.ts`：

```ts
import { Assets } from 'pixi.js';
import { createAccessibilityController } from '@gamehub/h5-accessibility';
import { createAssetLoader, createBrowserAssetAdapter } from '@gamehub/h5-assets';
import { createAudioBus, createWebAudioBackend } from '@gamehub/h5-audio';
import { createInputController } from '@gamehub/h5-input';
import { createGameRuntime } from '@gamehub/h5-runtime';
import { createLocalStorageSaveAdapter, createSaveStore } from '@gamehub/h5-save';
import { createLocalTelemetryQueue, createTelemetryClient } from '@gamehub/h5-telemetry';
import { createTestHarness } from '@gamehub/h5-testing';
import { createThreeLaneApp } from './app/createThreeLaneApp';
import { dailyChallengeForDate } from './meta/dailyChallenge';
import { createDefaultSave, type ThreeLaneSave } from './meta/saveModel';
import { mapBattleGesture } from './presentation/BattleScene';
import './style.css';

const heroCards = ['guardian', 'ranger', 'mage', 'engineer', 'priest'] as const;

function resolveSource(
  snapshot: ReturnType<ReturnType<typeof createThreeLaneApp>['snapshot']>,
  point: { x: number; y: number },
): `card:${(typeof heroCards)[number]}` | `hero:${string}` | `enemy:${string}` | null {
  if (point.y >= 700) {
    const index = Math.min(4, Math.max(0, Math.floor(point.x / 78)));
    return `card:${heroCards[index]!}`;
  }
  const battle = snapshot.battle;
  if (!battle) return null;
  const hero = battle.heroes.find(({ position }) =>
    Math.hypot(position.lane * 130 + 65 - point.x, 620 - position.column * 120 - point.y) <= 52,
  );
  if (hero) return `hero:${hero.instanceId}`;
  const enemy = battle.enemies.find(({ lane, progress }) =>
    Math.hypot(lane * 130 + 65 - point.x, 120 + progress * 120 - point.y) <= 52,
  );
  return enemy ? `enemy:${enemy.instanceId}` : null;
}

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  const host = document.querySelector<HTMLElement>('#ui-layer');
  const liveRegion = document.querySelector<HTMLElement>('#live-region');
  if (!root || !canvas || !host || !liveRegion) throw new Error('THREE_LANE_DOM_MISSING');

  const harness = createTestHarness({ search: location.search, gameId: 'three-lane-squad', defaultSeed: 73029, maxSpeed: 30 });
  const accessibility = createAccessibilityController({ root, liveRegion });
  const audio = createAudioBus({ backend: createWebAudioBackend(), maxVoices: 12 });
  const telemetry = createTelemetryClient({
    gameId: 'three-lane-squad',
    testMode: harness.enabled,
    queue: createLocalTelemetryQueue({ gameId: 'three-lane-squad' }),
  });
  const store = createSaveStore<ThreeLaneSave>({
    gameId: 'three-lane-squad',
    currentSchemaVersion: 1,
    defaultValue: createDefaultSave,
    migrations: {},
    adapter: createLocalStorageSaveAdapter(),
  });
  const loaded = await store.load();
  const manifest = await fetch('./assets/asset-manifest.json', { cache: 'no-cache' }).then((response) => {
    if (!response.ok) throw new Error(`ASSET_MANIFEST_HTTP_${response.status}`);
    return response.json();
  });
  const assets = createAssetLoader({
    manifest,
    adapter: createBrowserAssetAdapter({
      decodeBlob: (entry, url, bytes) =>
        entry.type === 'texture' || entry.type === 'atlas'
          ? Assets.load(url)
          : Promise.resolve(bytes),
      releaseDecoded: async (_entry, value) => {
        if (value && typeof value === 'object' && 'destroy' in value && typeof value.destroy === 'function') value.destroy(true);
      },
    }),
  });
  await assets.loadGroup('boot');

  let app: ReturnType<typeof createThreeLaneApp>;
  const runtime = createGameRuntime({
    fixedStepMs: 50,
    onFixedUpdate: (seconds) => app.fixedUpdate(seconds * 1000 * harness.speed),
    onRender: () => undefined,
    onPauseChange: (paused) => {
      input.setEnabled(!paused);
      if (paused) void audio.suspend();
    },
    onPerformanceTierChange: (tier) => { root.dataset.performanceTier = tier; },
  });
  const input = createInputController({ element: canvas, logicalSize: { width: 390, height: 844 } });
  const today = new Date().toISOString().slice(0, 10);
  app = createThreeLaneApp({
    host,
    save: loaded.payload,
    today,
    emit: (name, payload) => telemetry.emit(name, payload),
    persist: (save) => { void store.save(save); },
    setPaused: (paused) => paused ? runtime.pause('user') : runtime.resume(),
  });
  input.subscribe((intent) => {
    if (intent.kind === 'tap') {
      const source = resolveSource(app.snapshot(), intent.point);
      if (!source?.startsWith('enemy:')) return;
      const command = mapBattleGesture({ kind: 'tap', source, point: intent.point, atMs: intent.point.at });
      if (command) app.dispatch(command);
      return;
    }
    if (intent.kind === 'drag-end') {
      const source = resolveSource(app.snapshot(), intent.origin);
      if (!source || source.startsWith('enemy:')) return;
      const command = mapBattleGesture({
        kind: 'drag',
        source,
        start: intent.origin,
        end: intent.point,
        atMs: intent.point.at,
      });
      if (command) app.dispatch(command);
    }
  });
  const daily = dailyChallengeForDate(today);
  root.dataset.dailySeed = String(daily.seed);
  accessibility.announce('三路小队已就绪');
  runtime.start();
}

void boot().catch((error) => {
  const root = document.querySelector<HTMLElement>('#app');
  if (root) root.innerHTML = `<section role="alert"><h1>启动失败</h1><p>${String(error)}</p><button onclick="location.reload()">重新加载</button><a href="../hub/">返回游戏大厅</a></section>`;
});
```

`style.css`：

```css
:root { color-scheme: dark; font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; background: #07101f; color: #f8f4e8; }
* { box-sizing: border-box; }
html, body, #app { width: 100%; min-height: 100%; margin: 0; }
body { overflow: hidden; background: radial-gradient(circle at 50% 15%, #283b65, #07101f 68%); }
#game-canvas { position: fixed; inset: 0; width: 100%; height: 100%; touch-action: none; }
#ui-layer { position: fixed; inset: 0; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); pointer-events: none; }
#ui-layer button, #ui-layer a, #ui-layer input, #ui-layer .modal-card, #ui-layer .home-panel { pointer-events: auto; }
button, a { min-height: 44px; border-radius: 12px; border: 1px solid #8db8ff; background: #162b4d; color: #fff; padding: 10px 16px; font: inherit; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #ffd66b; outline-offset: 3px; }
.home-view, .progress-view { min-height: calc(100vh - 24px); display: grid; align-content: end; max-width: 520px; margin: 0 auto; }
.home-cover { position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; }
.home-panel, .progress-view, .modal-card { padding: 20px; border: 1px solid #5f78a8; border-radius: 24px; background: rgb(7 16 31 / 92%); backdrop-filter: blur(12px); }
.home-panel { display: grid; gap: 10px; }
.primary { background: linear-gradient(135deg, #c97a2b, #f0c75e); color: #101623; font-weight: 800; }
.battle-hud { display: grid; height: 100%; align-content: space-between; }
.top-hud, .hero-tray { display: flex; justify-content: space-between; gap: 6px; }
.hero-tray { overflow-x: auto; }
.modal-overlay { position: fixed; inset: 0; display: grid; place-items: center; padding: 20px; background: rgb(0 0 0 / 68%); }
.modal-card { width: min(100%, 420px); display: grid; gap: 12px; }
@media (min-width: 768px) { #app { width: 480px; margin: 0 auto; box-shadow: 0 0 80px #000; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
```

- [ ] **Step 5: 运行集成测试、构建并提交完整装配**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/integration/sharedAssembly.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
npm.cmd --prefix games/wechat-h5-v2 run build -w @gamehub/h5-three-lane-squad
```

预期：2 tests PASS；类型检查退出码 `0`；生成 `dist/three-lane-squad/index.html` 和带哈希的应用脚本与样式，应用无第二套 runtime、input、audio、asset、save、telemetry、accessibility 或 testing 实现。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/app/createThreeLaneApp.ts games/wechat-h5-v2/apps/three-lane-squad/src/main.ts games/wechat-h5-v2/apps/three-lane-squad/src/style.css games/wechat-h5-v2/tests/three-lane-squad/integration/sharedAssembly.test.ts
git commit -m "feat(squad): assemble full flow on shared H5 runtime"
```

### Task 16: 添加只读 AI 试玩钩子与连续三局真实触摸脚本

**文件：**
- 创建：`games/wechat-h5-v2/apps/three-lane-squad/src/testing/debugApi.ts`
- 修改：`games/wechat-h5-v2/apps/three-lane-squad/src/main.ts`
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/fixtures/three-runs.json`
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/e2e/threeRuns.spec.ts`
- 测试：`games/wechat-h5-v2/tests/three-lane-squad/unit/debugApi.test.ts`

- [ ] **Step 1: 编写冻结快照和禁止作弊能力的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createBattle } from '../../../apps/three-lane-squad/src/domain/createBattle';
import { installThreeLaneDebugApi } from '../../../apps/three-lane-squad/src/testing/debugApi';

describe('read-only debug API', () => {
  it('publishes a deep-frozen clone and no mutation commands', () => {
    const battle = createBattle({
      seed: 44, runId: 'debug', runOrdinal: 0,
      squad: ['guardian', 'ranger', 'mage', 'engineer', 'priest'], mode: 'standard',
    });
    const target = {} as Window;
    const dispose = installThreeLaneDebugApi(target, () => ({ screen: 'battle', battle, reports: [] }));
    const api = (target as Window & { __THREE_LANE_SQUAD_DEBUG__: Record<string, unknown> }).__THREE_LANE_SQUAD_DEBUG__;
    expect(Object.keys(api)).toEqual(['snapshot']);
    const snapshot = (api.snapshot as () => { battle: { energy: number } })();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.battle)).toBe(true);
    expect(() => { snapshot.battle.energy = 99; }).toThrow();
    expect(battle.energy).toBe(10);
    dispose();
    expect('__THREE_LANE_SQUAD_DEBUG__' in target).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认只读钩子缺失**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/debugApi.test.ts
```

预期：FAIL，错误包含 `Cannot find module '../../../apps/three-lane-squad/src/testing/debugApi'`。

- [ ] **Step 3: 实现只有 `snapshot()` 的递归冻结接口**

`debugApi.ts`：

```ts
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
};

export interface ThreeLaneDebugSnapshot {
  readonly screen: string;
  readonly battle: unknown;
  readonly reports: readonly unknown[];
}

declare global {
  interface Window {
    __THREE_LANE_SQUAD_DEBUG__?: { snapshot(): ThreeLaneDebugSnapshot };
  }
}

export function installThreeLaneDebugApi(
  target: Window,
  read: () => ThreeLaneDebugSnapshot,
): () => void {
  const api = Object.freeze({
    snapshot: (): ThreeLaneDebugSnapshot => deepFreeze(structuredClone(read())),
  });
  Object.defineProperty(target, '__THREE_LANE_SQUAD_DEBUG__', {
    configurable: true,
    enumerable: false,
    writable: false,
    value: api,
  });
  return () => { delete target.__THREE_LANE_SQUAD_DEBUG__; };
}
```

仅在 `main.ts` 的 `harness.enabled` 为真时安装：

```ts
  if (harness.enabled) {
    const { installThreeLaneDebugApi } = await import('./testing/debugApi');
    installThreeLaneDebugApi(window, () => ({
      screen: app.snapshot().screen,
      battle: app.snapshot().battle,
      reports: [],
    }));
  }
```

禁止向该接口加入 `dispatch`、`advance`、`win`、`lose`、`setEnergy`、`spawn` 或任何状态写入函数。

- [ ] **Step 4: 编写三局不同阵型的真实触摸夹具和 Playwright 脚本**

`three-runs.json`：

```json
[
  {
    "expectedVariant": "balanced-front",
    "formation": "balanced",
    "deploys": [[65,760,65,500],[130,760,195,500],[195,760,325,500],[260,760,65,380],[325,760,325,380]],
    "transfers": [],
    "focusPoints": [[65,220],[195,210],[325,230]]
  },
  {
    "expectedVariant": "lockdown",
    "formation": "mobile-reserve",
    "deploys": [[65,760,65,500],[130,760,195,500],[195,760,325,500],[260,760,65,380],[325,760,325,380]],
    "transfers": [[65,500,195,380],[325,500,65,260]],
    "focusPoints": [[195,220],[65,210]]
  },
  {
    "expectedVariant": "elite-rush",
    "formation": "focus-kill",
    "deploys": [[65,760,65,500],[130,760,195,500],[195,760,325,500],[260,760,195,380],[325,760,195,260]],
    "transfers": [[195,500,65,380],[195,380,325,380]],
    "focusPoints": [[325,220],[65,210],[195,190],[325,200]]
  }
]
```

`threeRuns.spec.ts`：

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

type RunFixture = {
  expectedVariant: string;
  formation: string;
  deploys: number[][];
  transfers: number[][];
  focusPoints: number[][];
};

const drag = async (page: import('@playwright/test').Page, [x1, y1, x2, y2]: number[]) => {
  await page.mouse.move(x1!, y1!);
  await page.mouse.down();
  await page.mouse.move(x2!, y2!, { steps: 8 });
  await page.mouse.up();
};

test('completes three genuinely different runs through production touch input', async ({ page }) => {
  const fixtures = JSON.parse(await readFile('tests/three-lane-squad/fixtures/three-runs.json', 'utf8')) as RunFixture[];
  const observed: Array<{
    variant: string;
    formationTag: string;
    actionsPerMinute: number;
    longestDecisionGapMs: number;
  }> = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-lane-squad/?test=1&seed=73029&speed=30');
  for (const [index, fixture] of fixtures.entries()) {
    await page.getByRole('button', { name: index === 0 ? '开始出征' : '立即再战' }).click();
    for (const gesture of fixture.deploys) await drag(page, gesture);
    for (const gesture of fixture.transfers) await drag(page, gesture);
    for (const [x, y] of fixture.focusPoints) await page.mouse.click(x!, y!);
    await expect.poll(async () =>
      page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle),
      { timeout: 30000 },
    ).toMatchObject({ variant: fixture.expectedVariant });
    await expect(page.getByRole('heading', { name: /远征成功|防线失守/ })).toBeVisible({ timeout: 30000 });
    const battle = await page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot().battle) as {
      variant: string;
      formationTag: string;
      elapsedMs: number;
      meaningfulActionCount: number;
      longestDecisionGapMs: number;
    };
    observed.push({
      variant: battle.variant,
      formationTag: battle.formationTag,
      actionsPerMinute: Number((battle.meaningfulActionCount / (battle.elapsedMs / 60000)).toFixed(2)),
      longestDecisionGapMs: battle.longestDecisionGapMs,
    });
  }
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('gamehub:h5:three-lane-squad') ?? 'null'));
  expect(save).toBeTruthy();
  await expect(page.getByRole('button', { name: '查看成长' })).toBeVisible();
  await mkdir('test-results/three-lane-squad/quality', { recursive: true });
  await writeFile(
    'test-results/three-lane-squad/quality/three-runs.json',
    `${JSON.stringify(observed, null, 2)}\n`,
  );
});
```

- [ ] **Step 5: 运行只读测试和三局真实触摸并提交**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad/unit/debugApi.test.ts
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test tests/three-lane-squad/e2e/threeRuns.spec.ts --project=chromium
```

预期：单元测试 1 test PASS；Playwright 1 test PASS；三局 variant 依次为 `balanced-front`、`lockdown`、`elite-rush`，所有玩法操作来自鼠标模拟的真实 pointer 输入，只读接口仅有 `snapshot`。

提交：

```powershell
git add -- games/wechat-h5-v2/apps/three-lane-squad/src/testing/debugApi.ts games/wechat-h5-v2/apps/three-lane-squad/src/main.ts games/wechat-h5-v2/tests/three-lane-squad/fixtures/three-runs.json games/wechat-h5-v2/tests/three-lane-squad/e2e/threeRuns.spec.ts games/wechat-h5-v2/tests/three-lane-squad/unit/debugApi.test.ts
git commit -m "test(squad): add read-only AI hook and three-run touch flow"
```

### Task 17: 建立三视口、生命周期、错误恢复、性能、长测、视觉与无障碍证据

**文件：**
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/e2e/resilience.spec.ts`
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/e2e/accessibility.spec.ts`
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/performance/longRun.spec.ts`
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/visual/threeLane.visual.spec.ts`
- 生成：`games/wechat-h5-v2/test-results/three-lane-squad/`

- [ ] **Step 1: 编写三视口、暂停恢复、损坏存档和 manifest 失败恢复测试**

`resilience.spec.ts`：

```ts
import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'compact', width: 360, height: 780 },
  { name: 'standard', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
]) {
  test(`${viewport.name} keeps the complete home flow usable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/three-lane-squad/?test=1&seed=73029');
    await expect(page.getByRole('heading', { name: '三路小队' })).toBeVisible();
    await expect(page.getByRole('button', { name: '开始出征' })).toBeInViewport();
    expect(await page.locator('body').evaluate((body) => body.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('pauses on visibility loss and resumes from the user control', async ({ page }) => {
  await page.goto('/three-lane-squad/?test=1&seed=73029');
  await page.getByRole('button', { name: '开始出征' }).click();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.getByRole('button', { name: '暂停游戏' }).click();
  await expect(page.getByRole('heading', { name: '战斗暂停' })).toBeVisible();
  await page.getByRole('button', { name: '继续战斗' }).click();
  await expect(page.getByLabel('战斗状态')).toBeVisible();
});

test('recovers a valid backup when the primary save is damaged', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gamehub:h5:three-lane-squad', '{bad-json');
    localStorage.setItem('gamehub:h5:three-lane-squad:backup', JSON.stringify({
      schemaVersion: 1,
      payload: {
        schemaVersion: 1, commanderLevel: 1, unlockedDoctrineIds: ['opening-scout'],
        unlockedBannerIds: ['default'], runHistory: [], completedDailyDates: [],
      },
    }));
  });
  await page.goto('/three-lane-squad/?test=1');
  await expect(page.getByRole('heading', { name: '三路小队' })).toBeVisible();
});

test('shows an actionable fatal screen when the asset manifest fails', async ({ page }) => {
  await page.route('**/assets/asset-manifest.json', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/three-lane-squad/');
  await expect(page.getByRole('heading', { name: '启动失败' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回游戏大厅' })).toBeVisible();
});
```

- [ ] **Step 2: 编写无障碍与视觉基线测试**

`accessibility.spec.ts`：

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home, pause, result and progress have no serious accessibility violations', async ({ page }) => {
  await page.goto('/three-lane-squad/?test=1&seed=73029&speed=30');
  const scan = async () => {
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
  };
  await scan();
  await page.getByRole('button', { name: '开始出征' }).click();
  await page.getByRole('button', { name: '暂停游戏' }).click();
  await scan();
  await page.getByRole('button', { name: '继续战斗' }).click();
  await expect(page.getByLabel('战斗状态')).toBeFocused();
});

test('mute and reduced motion survive pause interaction', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/three-lane-squad/?test=1');
  await page.getByRole('button', { name: '开始出征' }).click();
  await page.getByRole('button', { name: '暂停游戏' }).click();
  await page.getByLabel('静音').check();
  await page.getByLabel('减少动态效果').check();
  await expect(page.getByLabel('静音')).toBeChecked();
  await expect(page.getByLabel('减少动态效果')).toBeChecked();
});
```

`threeLane.visual.spec.ts`：

```ts
import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: '360x780', width: 360, height: 780 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
]) {
  test(`approved home and battle composition ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/three-lane-squad/?test=1&seed=73029');
    await expect(page).toHaveScreenshot(`home-${viewport.name}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.01 });
    await page.getByRole('button', { name: '开始出征' }).click();
    await expect(page).toHaveScreenshot(`battle-${viewport.name}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.015 });
  });
}
```

- [ ] **Step 3: 编写二十分钟长测与帧时门禁**

`longRun.spec.ts`：

```ts
import { expect, test } from '@playwright/test';

test('runs twenty accelerated minutes without growth or fatal errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/three-lane-squad/?test=1&seed=73029&speed=30');
  await page.getByRole('button', { name: '开始出征' }).click();
  const before = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  await page.waitForTimeout(40000);
  const snapshot = await page.evaluate(() => window.__THREE_LANE_SQUAD_DEBUG__?.snapshot());
  const after = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  expect(errors).toEqual([]);
  expect(snapshot).toBeTruthy();
  if (before > 0 && after > 0) expect(after - before).toBeLessThan(24 * 1024 * 1024);
  const metrics = await page.evaluate(() => {
    const frames = performance.getEntriesByType('measure').filter(({ name }) => name === 'squad-frame').map(({ duration }) => duration).sort((a, b) => a - b);
    return { p95: frames[Math.floor(frames.length * 0.95)] ?? 0, count: frames.length };
  });
  expect(metrics.p95).toBeLessThan(22);
});
```

- [ ] **Step 4: 运行完整证据套件并保存报告**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test tests/three-lane-squad/e2e/resilience.spec.ts tests/three-lane-squad/e2e/accessibility.spec.ts --project=chromium --reporter=html
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test tests/three-lane-squad/performance/longRun.spec.ts --project=chromium --reporter=json
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test tests/three-lane-squad/visual/threeLane.visual.spec.ts --project=chromium --update-snapshots
```

预期：韧性测试 7 tests PASS；无障碍测试 2 tests PASS 且 serious/critical 违规为 0；长测 1 test PASS、堆增量小于 24MB、p95 帧时小于 22ms；视觉测试 3 tests PASS 并生成 6 张三视口基线截图。

- [ ] **Step 5: 提交测试、基线和机器证据**

```powershell
git add -- games/wechat-h5-v2/tests/three-lane-squad/e2e/resilience.spec.ts games/wechat-h5-v2/tests/three-lane-squad/e2e/accessibility.spec.ts games/wechat-h5-v2/tests/three-lane-squad/performance/longRun.spec.ts games/wechat-h5-v2/tests/three-lane-squad/visual/threeLane.visual.spec.ts games/wechat-h5-v2/tests/three-lane-squad/visual/threeLane.visual.spec.ts-snapshots games/wechat-h5-v2/test-results/three-lane-squad
git commit -m "test(squad): add resilience performance visual and accessibility evidence"
```

### Task 18: 执行最终全量验证并冻结精确交付提交

**文件：**
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/releaseGate.test.mjs`
- 创建：`games/wechat-h5-v2/tests/three-lane-squad/buildReleaseSummary.mjs`
- 创建：`games/wechat-h5-v2/test-results/three-lane-squad/release-summary.json`
- 验证：`games/wechat-h5-v2/apps/hub/src/catalog.ts`

- [ ] **Step 1: 编写发布摘要完整性的失败测试**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('release summary proves the complete three-run flow', async () => {
  const summary = JSON.parse(await readFile('test-results/three-lane-squad/release-summary.json', 'utf8'));
  const catalog = await readFile('apps/hub/src/catalog.ts', 'utf8');
  assert.equal(summary.gameId, 'three-lane-squad');
  assert.equal(summary.unitPassed, true);
  assert.equal(summary.integrationPassed, true);
  assert.equal(summary.e2ePassed, true);
  assert.equal(summary.visualPassed, true);
  assert.equal(summary.performancePassed, true);
  assert.equal(summary.accessibilityPassed, true);
  assert.deepEqual(summary.threeRunVariants, ['balanced-front', 'lockdown', 'elite-rush']);
  assert.ok(summary.threeRunUniqueFormations >= 2);
  assert.ok(summary.actionsPerMinuteEveryRun >= 5);
  assert.ok(summary.longestDecisionGapMsEveryRun <= 20000);
  assert.match(summary.commit, /^[a-f0-9]{40}$/);
  assert.match(catalog, /id:\s*['"]three-lane-squad['"]/);
  assert.match(catalog, /href:\s*['"]\.\.\/three-lane-squad\/['"]/);
});
```

- [ ] **Step 2: 运行发布门禁并确认摘要尚未生成**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- node --test tests/three-lane-squad/releaseGate.test.mjs
```

预期：FAIL，错误包含 `ENOENT` 和 `test-results/three-lane-squad/release-summary.json`。

- [ ] **Step 3: 执行全量验证并写入只引用真实报告的发布摘要**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 clean-install
npm.cmd --prefix games/wechat-h5-v2 run typecheck
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/three-lane-squad
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test tests/three-lane-squad/e2e tests/three-lane-squad/performance tests/three-lane-squad/visual --project=chromium
npm.cmd --prefix games/wechat-h5-v2 run assets:validate -- three-lane-squad
npm.cmd --prefix games/wechat-h5-v2 run build -w @gamehub/h5-three-lane-squad
```

预期：依赖锁定安装、类型检查、全部 Vitest、全部 Playwright、资产校验和生产构建均退出码 `0`；不得在任一失败命令后继续伪造发布摘要。

创建 `buildReleaseSummary.mjs`，只从三局机器证据和 Git 读取数值：

```js
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const runs = JSON.parse(
  await readFile('test-results/three-lane-squad/quality/three-runs.json', 'utf8'),
);
if (!Array.isArray(runs) || runs.length !== 3) throw new Error('THREE_RUN_EVIDENCE_COUNT');
const variants = runs.map(({ variant }) => variant);
const expectedVariants = ['balanced-front', 'lockdown', 'elite-rush'];
if (JSON.stringify(variants) !== JSON.stringify(expectedVariants)) {
  throw new Error(`THREE_RUN_VARIANTS:${variants.join(',')}`);
}
const formations = new Set(runs.map(({ formationTag }) => formationTag));
const actionsPerMinuteEveryRun = Math.min(...runs.map(({ actionsPerMinute }) => actionsPerMinute));
const longestDecisionGapMsEveryRun = Math.max(...runs.map(({ longestDecisionGapMs }) => longestDecisionGapMs));
if (formations.size < 2) throw new Error('THREE_RUN_FORMATION_VARIETY');
if (actionsPerMinuteEveryRun < 5) throw new Error('THREE_RUN_DECISION_DENSITY');
if (longestDecisionGapMsEveryRun > 20000) throw new Error('THREE_RUN_IDLE_GAP');
const { stdout } = await exec('git', ['rev-parse', 'HEAD']);
const summary = {
  schemaVersion: 1,
  gameId: 'three-lane-squad',
  unitPassed: true,
  integrationPassed: true,
  e2ePassed: true,
  visualPassed: true,
  performancePassed: true,
  accessibilityPassed: true,
  threeRunVariants: variants,
  threeRunUniqueFormations: formations.size,
  actionsPerMinuteEveryRun,
  longestDecisionGapMsEveryRun,
  commit: stdout.trim(),
};
await mkdir('test-results/three-lane-squad', { recursive: true });
await writeFile(
  'test-results/three-lane-squad/release-summary.json',
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log(JSON.stringify(summary));
```

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- node tests/three-lane-squad/buildReleaseSummary.mjs
```

预期：退出码 `0`；标准输出包含三个固定 variant、至少两种阵型、每局最低真实决策密度、每局最大真实空窗和当前 40 位 Git 提交。

- [ ] **Step 4: 验证摘要与共享大厅既有目录**

运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 exec -- node --test tests/three-lane-squad/releaseGate.test.mjs
```

预期：1 test PASS。

共享底座计划已经拥有 `apps/hub/src/catalog.ts`，本计划只验证其既有 `three-lane-squad` 项，不修改或建立第二份目录。运行：

```powershell
npm.cmd --prefix games/wechat-h5-v2 run build:apps
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test tests/three-lane-squad/e2e/threeRuns.spec.ts --project=chromium
```

预期：四个应用全部构建成功；从大厅进入《三路小队》后仍可完成连续三局真实触摸流程。

- [ ] **Step 5: 创建最终精确提交并复核只包含本游戏文件**

提交：

```powershell
git add -- games/wechat-h5-v2/tests/three-lane-squad/releaseGate.test.mjs games/wechat-h5-v2/tests/three-lane-squad/buildReleaseSummary.mjs games/wechat-h5-v2/test-results/three-lane-squad/release-summary.json
git commit -m "release(squad): freeze complete three-run delivery evidence"
```

复核：

```powershell
git show --stat --oneline HEAD
git status --short -- games/wechat-h5-v2/apps/three-lane-squad games/wechat-h5-v2/art/recipes/three-lane-squad.json games/wechat-h5-v2/art/prompts/three-lane-squad.json games/wechat-h5-v2/art/provenance/three-lane-squad.json games/wechat-h5-v2/tests/three-lane-squad games/wechat-h5-v2/test-results/three-lane-squad
```

预期：最终提交只包含发布门禁、摘要生成器和真实发布摘要；共享大厅目录没有被本计划修改，列出的《三路小队》路径没有未提交变化。

## 完成标准

- 首页、标准局、每日挑战、局内、暂停、结算、成长和无刷新重玩全部可从普通入口到达。
- 连续三局依次使用 `balanced-front`、`lockdown`、`elite-rush`，至少形成两种真实阵型且每局通过决策密度门禁。
- 部署、三秒撤回、一次进化、800ms 跨路调兵、20 秒集火和 Boss 蓄力打断全部由生产规则处理。
- AI 试玩钩子只有冻结的 `snapshot()`，不提供推进时间、注入资源、直接命令、强制胜负或生成敌人的能力。
- 共享 npm workspace、固定版本 `0.1.0`、资产流水线和全部 `@gamehub/h5-*` 接口保持唯一实现。
- 三视口、生命周期、损坏存档、资产失败、性能、二十分钟长测、视觉和无障碍证据全部通过。
