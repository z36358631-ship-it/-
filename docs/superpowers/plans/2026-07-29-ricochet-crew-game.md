# 《弹珠暴走团》Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在共享 H5 底座之上交付《弹珠暴走团》竖屏高保真垂直成品，包含固定步长 Sweep 碰撞、两次反弹瞄准预演、三名英雄途中技能、五房间与三部位 Boss、18 项改造、三流派、局外成长、七日每日种子、质量事件、AI 试玩钩子及功能/性能/视觉证据。

**Architecture:** 玩法采用纯 TypeScript 确定性领域层与 PixiJS 表现层分离：`physics`、`combat`、`content`、`run` 不持有 PixiJS、DOM、微信凭证或共享运行时内部状态，所有局时推进只消费固定的 `1 / 120` 秒步长。应用仅消费 `docs/superpowers/plans/2026-07-29-wechat-h5-v2-runtime-art-pipeline.md` 交付的九个 `@gamehub/h5-*` 包，不在本计划重复实现启动、生命周期、触控归一化、音频解锁、资产下载/校验、存档信封、事件队列、无障碍和测试参数门禁。

**Tech Stack:** npm workspaces、Vite 6.1.0、TypeScript 5.7.3 strict、PixiJS 8.9.2、Vitest 3.0.5、Playwright 1.51.0、`@gamehub/h5-contracts`、`@gamehub/h5-runtime`、`@gamehub/h5-input`、`@gamehub/h5-audio`、`@gamehub/h5-assets`、`@gamehub/h5-save`、`@gamehub/h5-telemetry`、`@gamehub/h5-accessibility`、`@gamehub/h5-testing`。

---

## 前置依赖与执行边界

实施本计划前先完成并通过共享计划：

`docs/superpowers/plans/2026-07-29-wechat-h5-v2-runtime-art-pipeline.md`

本游戏只消费以下共享能力，不复制实现：

```ts
import type {
  GameEventName,
  GameSaveEnvelope,
  PerformanceTier,
  RuntimeSnapshot,
} from '@gamehub/h5-contracts';
import { createGameRuntime } from '@gamehub/h5-runtime';
import { createInputController } from '@gamehub/h5-input';
import { createAudioBus, createWebAudioBackend } from '@gamehub/h5-audio';
import { createAssetLoader, createBrowserAssetAdapter } from '@gamehub/h5-assets';
import { createLocalStorageSaveAdapter, createSaveStore } from '@gamehub/h5-save';
import { createLocalTelemetryQueue, createTelemetryClient } from '@gamehub/h5-telemetry';
import { createAccessibilityController } from '@gamehub/h5-accessibility';
import { createTestHarness } from '@gamehub/h5-testing';
```

如共享计划最终导出的名称与上方不一致，先在共享计划中统一合同；不得在游戏目录创建第二套生命周期、输入、资产、存档或遥测实现作为规避。

所有步骤预计 2–5 分钟；超出时应停止扩张当前步骤，将可独立验证的下一部分拆为新的步骤。每个 Task 结束都提交一次；不得把不同 Task 压成一个大提交。

## 文件结构

```text
games/wechat-h5-v2/
├─ apps/ricochet-crew/
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  └─ src/
│     ├─ main.ts
│     ├─ style.css
│     ├─ game/
│     │  ├─ contracts.ts
│     │  ├─ createRicochetGame.ts
│     │  └─ constants.ts
│     ├─ physics/
│     │  ├─ vector.ts
│     │  ├─ sweep.ts
│     │  ├─ world.ts
│     │  └─ preview.ts
│     ├─ combat/
│     │  ├─ damage.ts
│     │  ├─ skills.ts
│     │  ├─ modifiers.ts
│     │  └─ shotSystem.ts
│     ├─ content/
│     │  ├─ heroes.ts
│     │  ├─ modifierCatalog.ts
│     │  ├─ rooms.ts
│     │  └─ boss.ts
│     ├─ run/
│     │  ├─ runMachine.ts
│     │  ├─ progression.ts
│     │  ├─ daily.ts
│     │  └─ recap.ts
│     ├─ presentation/
│     │  ├─ RicochetScene.ts
│     │  ├─ Hud.ts
│     │  ├─ effectPolicy.ts
│     │  └─ assetBindings.ts
│     ├─ quality/
│     │  ├─ events.ts
│     │  └─ localReport.ts
│     └─ testing/
│        └─ debugApi.ts
├─ art/
│  ├─ recipes/ricochet-crew.json
│  ├─ prompts/ricochet-crew.json
│  └─ provenance/ricochet-crew.json
├─ apps/ricochet-crew/public/assets/
│  ├─ asset-manifest.json
│  └─ generated runtime asset files
└─ tests/ricochet-crew/
   ├─ unit/
   ├─ integration/
   ├─ e2e/
   ├─ performance/
   ├─ visual/
   └─ fixtures/
```

职责约束：

- `physics` 只做连续碰撞、位置/速度积分与轨迹预演，不知道敌人血量、连击或英雄身份。
- `combat` 把物理命中转换为伤害、破甲、连击、技能和改造效果。
- `content` 仅保存不可变内容定义和确定性房间生成器。
- `run` 管理五房间、Boss、选择、结算、每日与存档 payload。
- `presentation` 只将领域快照映射为 PixiJS、DOM HUD、音效和特效，不反向决定胜负。
- `quality` 生成游戏专属事件 payload 与本地玩法报告。
- `testing/debugApi.ts` 只在共享 `createTestHarness()` 返回 `enabled: true` 时挂载。

## 核心类型合同

后续任务统一使用以下类型，不得在不同文件创造同义字段：

```ts
export type HeroId = 'tuo' | 'mio' | 'luo';
export type BuildTag = 'blast' | 'split' | 'recall';
export type RunMode =
  | 'boot'
  | 'aiming'
  | 'flying'
  | 'resolving'
  | 'choosing'
  | 'won'
  | 'lost'
  | 'paused';

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface ShotState {
  readonly id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  remainingSeconds: number;
  skillAvailable: boolean;
  recallRequested: boolean;
  wallBounces: number;
  combo: number;
  maxCombo: number;
}

export interface TargetState {
  readonly id: string;
  readonly kind: 'enemy' | 'armor' | 'weakpoint' | 'mechanism' | 'boss-part';
  position: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  armor: number;
  active: boolean;
  tags: readonly string[];
}

export interface RicochetRunState {
  readonly runId: string;
  readonly seed: number;
  readonly heroId: HeroId;
  mode: RunMode;
  elapsedMs: number;
  roomIndex: number;
  shotsFired: number;
  enemiesAdvanced: number;
  skillUses: number;
  firstInputAtMs: number | null;
  firstPayoffAtMs: number | null;
  build: readonly string[];
  buildTags: Readonly<Record<BuildTag, number>>;
  targets: TargetState[];
  shot: ShotState | null;
  boss: BossState | null;
  lastShotTrace: readonly TracePoint[];
  failureReason: FailureReason | null;
}

export type FailureReason =
  | 'frontline-breached'
  | 'boss-overrun'
  | 'shot-limit-exhausted';
```

### Task 1: 建立独立应用入口与领域合同

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/game/contracts.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/game/constants.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/contracts.test.ts`

- [ ] **Step 1: 写入失败的合同测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  GAME_ID,
  PHYSICS_DT,
  SHOT_MAX_SECONDS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../../apps/ricochet-crew/src/game/constants';

describe('ricochet contracts', () => {
  it('uses a 390x844 logical world and a 120Hz deterministic physics step', () => {
    expect(GAME_ID).toBe('ricochet-crew');
    expect(WORLD_WIDTH).toBe(390);
    expect(WORLD_HEIGHT).toBe(844);
    expect(PHYSICS_DT).toBeCloseTo(1 / 120, 12);
    expect(SHOT_MAX_SECONDS).toBe(8);
  });
});
```

- [ ] **Step 2: 运行测试并确认因文件不存在而失败**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/contracts.test.ts`

Expected: FAIL，错误包含 `Cannot find module '../../../apps/ricochet-crew/src/game/constants'`。

- [ ] **Step 3: 在共享应用骨架内创建领域常量和合同**

共享计划已经创建 `@gamehub/h5-ricochet-crew@0.1.0`、`index.html` 与 `vite.config.ts`；本步骤不得覆盖这些文件。创建 `constants.ts`：

```ts
export const GAME_ID = 'ricochet-crew' as const;
export const WORLD_WIDTH = 390;
export const WORLD_HEIGHT = 844;
export const PHYSICS_DT = 1 / 120;
export const MAX_SWEEP_ITERATIONS = 8;
export const SHOT_MAX_SECONDS = 8;
export const SHOT_STOP_SPEED = 28;
export const SHOT_RADIUS = 14;
export const MAX_ACTIVE_PROJECTILES = 16;
export const MAX_ACTIVE_TARGETS = 80;
```

`contracts.ts` 写入“核心类型合同”的全部类型，并追加：

```ts
export interface TracePoint {
  readonly atMs: number;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly hitId: string | null;
}

export interface BossState {
  phase: 'shielded' | 'weapon-exposed' | 'core-exposed' | 'defeated';
  interruptCharge: number;
  parts: Record<'armor' | 'weapon' | 'core', TargetState>;
}
```

- [ ] **Step 4: 运行合同测试和类型检查**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/contracts.test.ts && npm.cmd --prefix games/wechat-h5-v2 run typecheck`

Expected: 1 test PASS；TypeScript 输出无错误。

- [ ] **Step 5: 提交应用骨架**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/game/contracts.ts games/wechat-h5-v2/apps/ricochet-crew/src/game/constants.ts games/wechat-h5-v2/tests/ricochet-crew/unit/contracts.test.ts
git commit -m "feat(ricochet): scaffold game contracts"
```

### Task 2: 实现向量运算与连续 Sweep 碰撞

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/physics/vector.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/physics/sweep.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/sweep.test.ts`

- [ ] **Step 1: 写入高速运动与擦边命中的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { sweepCircleAgainstCircle, sweepCircleAgainstSegment } from '../../../apps/ricochet-crew/src/physics/sweep';

describe('continuous circle sweep', () => {
  it('does not tunnel through a target at high speed', () => {
    const hit = sweepCircleAgainstCircle(
      { x: 20, y: 100 },
      { x: 1400, y: 0 },
      0.1,
      12,
      { x: 100, y: 100 },
      18,
      'enemy-a',
    );
    expect(hit?.colliderId).toBe('enemy-a');
    expect(hit?.toi).toBeCloseTo(50 / 140, 5);
    expect(hit?.normal.x).toBeLessThan(0);
  });

  it('reflects from a vertical wall using the impact normal', () => {
    const hit = sweepCircleAgainstSegment(
      { x: 40, y: 80 },
      { x: -600, y: 0 },
      0.1,
      10,
      { x: 0, y: 0 },
      { x: 0, y: 160 },
      'left-wall',
    );
    expect(hit?.colliderId).toBe('left-wall');
    expect(hit?.toi).toBeCloseTo(0.5, 5);
    expect(hit?.normal).toEqual({ x: 1, y: 0 });
  });
});
```

- [ ] **Step 2: 运行测试并确认导入失败**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/sweep.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../physics/sweep`。

- [ ] **Step 3: 实现无分配向量函数和圆 Sweep**

`vector.ts`：

```ts
import type { Vec2 } from '../game/contracts';

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, n: number): Vec2 => ({ x: v.x * n, y: v.y * n });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const lengthSq = (v: Vec2): number => dot(v, v);
export const normalize = (v: Vec2): Vec2 => {
  const length = Math.sqrt(lengthSq(v));
  return length > 1e-9 ? scale(v, 1 / length) : { x: 0, y: -1 };
};
export const reflect = (velocity: Vec2, normal: Vec2): Vec2 =>
  sub(velocity, scale(normal, 2 * dot(velocity, normal)));
```

`sweep.ts` 的圆对圆实现：

```ts
import type { Vec2 } from '../game/contracts';
import { add, dot, normalize, scale, sub } from './vector';

export interface SweepHit {
  readonly colliderId: string;
  readonly toi: number;
  readonly point: Vec2;
  readonly normal: Vec2;
}

export function sweepCircleAgainstCircle(
  origin: Vec2,
  velocity: Vec2,
  dt: number,
  movingRadius: number,
  center: Vec2,
  targetRadius: number,
  colliderId: string,
): SweepHit | null {
  const delta = scale(velocity, dt);
  const relative = sub(origin, center);
  const radius = movingRadius + targetRadius;
  const a = dot(delta, delta);
  const b = 2 * dot(relative, delta);
  const c = dot(relative, relative) - radius * radius;
  if (a <= 1e-12 || c <= 0) return null;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const toi = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (toi < 0 || toi > 1) return null;
  const point = add(origin, scale(delta, toi));
  return { colliderId, toi, point, normal: normalize(sub(point, center)) };
}
```

- [ ] **Step 4: 实现圆对线段 Sweep 并跑测试**

在 `sweep.ts` 追加：

```ts
export function sweepCircleAgainstSegment(
  origin: Vec2,
  velocity: Vec2,
  dt: number,
  radius: number,
  start: Vec2,
  end: Vec2,
  colliderId: string,
): SweepHit | null {
  const edge = sub(end, start);
  const edgeLength = Math.sqrt(dot(edge, edge));
  if (edgeLength <= 1e-9) {
    return sweepCircleAgainstCircle(origin, velocity, dt, radius, start, 0, colliderId);
  }
  const tangent = scale(edge, 1 / edgeLength);
  const candidateNormal = { x: -tangent.y, y: tangent.x };
  const signedDistance = dot(sub(origin, start), candidateNormal);
  const normal =
    signedDistance >= 0 ? candidateNormal : scale(candidateNormal, -1);
  const toward = dot(velocity, normal);
  if (toward >= -1e-9) return null;
  const seconds = (radius - Math.abs(signedDistance)) / toward;
  const toi = seconds / dt;
  if (toi < 0 || toi > 1) return null;
  const centerAtHit = add(origin, scale(velocity, seconds));
  const contact = sub(centerAtHit, scale(normal, radius));
  const projection = dot(sub(contact, start), tangent);
  if (projection >= 0 && projection <= edgeLength) {
    return { colliderId, toi, point: centerAtHit, normal };
  }
  const first = sweepCircleAgainstCircle(origin, velocity, dt, radius, start, 0, colliderId);
  const second = sweepCircleAgainstCircle(origin, velocity, dt, radius, end, 0, colliderId);
  if (!first) return second;
  if (!second) return first;
  return first.toi <= second.toi ? first : second;
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/sweep.test.ts`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交连续碰撞基础**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/physics games/wechat-h5-v2/tests/ricochet-crew/unit/sweep.test.ts
git commit -m "feat(ricochet): add swept collision primitives"
```

### Task 3: 实现固定步长世界与确定性碰撞排序

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/physics/world.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/world.test.ts`

- [ ] **Step 1: 写入帧率无关和同 TOI 排序失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createPhysicsWorld } from '../../../apps/ricochet-crew/src/physics/world';

describe('fixed-step physics world', () => {
  it('produces the same shot after 30fps and 60fps render schedules', () => {
    const simulate = (renderDt: number) => {
      const world = createPhysicsWorld({
        walls: [
          { id: 'left', start: { x: 0, y: 0 }, end: { x: 0, y: 844 } },
          { id: 'right', start: { x: 390, y: 844 }, end: { x: 390, y: 0 } },
        ],
        circles: [],
      });
      world.launch({ x: 195, y: 760 }, { x: 420, y: -900 }, 14);
      for (let elapsed = 0; elapsed < 2; elapsed += renderDt) world.update(renderDt);
      return world.snapshot();
    };
    expect(simulate(1 / 30)).toEqual(simulate(1 / 60));
  });

  it('uses collider id as the stable tie-breaker for equal impact time', () => {
    const world = createPhysicsWorld({
      walls: [],
      circles: [
        { id: 'b', center: { x: 185, y: 200 }, radius: 20 },
        { id: 'a', center: { x: 205, y: 200 }, radius: 20 },
      ],
    });
    world.launch({ x: 195, y: 300 }, { x: 0, y: -600 }, 10);
    world.update(0.2);
    expect(world.drainHits()[0]?.colliderId).toBe('a');
  });
});
```

- [ ] **Step 2: 运行测试并确认世界实现缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/world.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../physics/world`。

- [ ] **Step 3: 创建固定步长世界与快照接口**

```ts
import { MAX_SWEEP_ITERATIONS, PHYSICS_DT } from '../game/constants';
import type { Vec2 } from '../game/contracts';
import { reflect } from './vector';
import {
  sweepCircleAgainstCircle,
  sweepCircleAgainstSegment,
  type SweepHit,
} from './sweep';

export interface WallCollider {
  readonly id: string;
  readonly start: Vec2;
  readonly end: Vec2;
}

export interface CircleCollider {
  readonly id: string;
  readonly center: Vec2;
  readonly radius: number;
}

export interface PhysicsWorldSnapshot {
  readonly active: boolean;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly radius: number;
  readonly simulatedTicks: number;
}

export function createPhysicsWorld(config: {
  walls: readonly WallCollider[];
  circles: readonly CircleCollider[];
}) {
  let accumulator = 0;
  let simulatedTicks = 0;
  let active = false;
  let position: Vec2 = { x: 0, y: 0 };
  let velocity: Vec2 = { x: 0, y: 0 };
  let radius = 0;
  const hits: SweepHit[] = [];

  const candidates = (remaining: number): SweepHit[] => [
    ...config.walls
      .map((wall) =>
        sweepCircleAgainstSegment(
          position,
          velocity,
          remaining,
          radius,
          wall.start,
          wall.end,
          wall.id,
        ),
      )
      .filter((hit): hit is SweepHit => hit !== null),
    ...config.circles
      .map((circle) =>
        sweepCircleAgainstCircle(
          position,
          velocity,
          remaining,
          radius,
          circle.center,
          circle.radius,
          circle.id,
        ),
      )
      .filter((hit): hit is SweepHit => hit !== null),
  ].sort((a, b) => a.toi - b.toi || a.colliderId.localeCompare(b.colliderId));
```

- [ ] **Step 4: 完成子步积分、命中排空与帧率无关更新**

在同一工厂函数中追加并返回：

```ts
  const step = () => {
    let remaining = PHYSICS_DT;
    for (let iteration = 0; iteration < MAX_SWEEP_ITERATIONS && remaining > 1e-7; iteration += 1) {
      const hit = candidates(remaining)[0];
      if (!hit) {
        position = {
          x: position.x + velocity.x * remaining,
          y: position.y + velocity.y * remaining,
        };
        remaining = 0;
        break;
      }
      position = hit.point;
      velocity = reflect(velocity, hit.normal);
      hits.push(hit);
      remaining *= 1 - hit.toi;
      position = {
        x: position.x + hit.normal.x * 0.001,
        y: position.y + hit.normal.y * 0.001,
      };
    }
    simulatedTicks += 1;
  };

  return {
    launch(origin: Vec2, initialVelocity: Vec2, shotRadius: number) {
      position = { ...origin };
      velocity = { ...initialVelocity };
      radius = shotRadius;
      accumulator = 0;
      simulatedTicks = 0;
      active = true;
      hits.length = 0;
    },
    update(renderSeconds: number) {
      accumulator += Math.min(renderSeconds, 0.25);
      while (active && accumulator + 1e-12 >= PHYSICS_DT) {
        step();
        accumulator -= PHYSICS_DT;
      }
    },
    setVelocity(next: Vec2) {
      velocity = { ...next };
    },
    stop() {
      active = false;
    },
    drainHits(): SweepHit[] {
      return hits.splice(0);
    },
    snapshot(): PhysicsWorldSnapshot {
      const round = (value: number) => Number(value.toFixed(6));
      return {
        active,
        position: { x: round(position.x), y: round(position.y) },
        velocity: { x: round(velocity.x), y: round(velocity.y) },
        radius,
        simulatedTicks,
      };
    },
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/world.test.ts`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交固定步长世界**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/physics/world.ts games/wechat-h5-v2/tests/ricochet-crew/unit/world.test.ts
git commit -m "feat(ricochet): add deterministic fixed-step world"
```

### Task 4: 让瞄准预演复用真实 Sweep

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/physics/preview.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/preview.test.ts`

- [ ] **Step 1: 写入最多两次反弹和实弹一致性失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { buildAimPreview } from '../../../apps/ricochet-crew/src/physics/preview';

describe('aim preview', () => {
  const walls = [
    { id: 'left', start: { x: 0, y: 0 }, end: { x: 0, y: 844 } },
    { id: 'right', start: { x: 390, y: 844 }, end: { x: 390, y: 0 } },
    { id: 'top', start: { x: 390, y: 60 }, end: { x: 0, y: 60 } },
  ];

  it('returns launch segment plus at most two bounces', () => {
    const preview = buildAimPreview(
      { x: 195, y: 760 },
      { x: 600, y: -1000 },
      14,
      walls,
      [],
      2,
    );
    expect(preview.segments).toHaveLength(3);
    expect(preview.bounceCount).toBe(2);
    expect(preview.segments[0]?.colliderId).toBe('right');
  });

  it('marks the first target hit without revealing later hidden targets', () => {
    const preview = buildAimPreview(
      { x: 195, y: 760 },
      { x: 0, y: -1000 },
      14,
      walls,
      [{ id: 'weakpoint', center: { x: 195, y: 400 }, radius: 22 }],
      2,
    );
    expect(preview.segments[0]?.colliderId).toBe('weakpoint');
    expect(preview.targetId).toBe('weakpoint');
  });
});
```

- [ ] **Step 2: 运行测试并确认预演模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/preview.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../physics/preview`。

- [ ] **Step 3: 实现预演类型和最近命中选择**

```ts
import type { Vec2 } from '../game/contracts';
import { reflect } from './vector';
import {
  sweepCircleAgainstCircle,
  sweepCircleAgainstSegment,
  type SweepHit,
} from './sweep';
import type { CircleCollider, WallCollider } from './world';

export interface PreviewSegment {
  readonly from: Vec2;
  readonly to: Vec2;
  readonly colliderId: string | null;
}

export interface AimPreview {
  readonly segments: readonly PreviewSegment[];
  readonly bounceCount: number;
  readonly targetId: string | null;
}

function firstHit(
  origin: Vec2,
  velocity: Vec2,
  radius: number,
  walls: readonly WallCollider[],
  circles: readonly CircleCollider[],
): SweepHit | null {
  const horizon = 2;
  const hits = [
    ...walls.map((wall) =>
      sweepCircleAgainstSegment(origin, velocity, horizon, radius, wall.start, wall.end, wall.id),
    ),
    ...circles.map((circle) =>
      sweepCircleAgainstCircle(origin, velocity, horizon, radius, circle.center, circle.radius, circle.id),
    ),
  ]
    .filter((hit): hit is SweepHit => hit !== null)
    .sort((a, b) => a.toi - b.toi || a.colliderId.localeCompare(b.colliderId));
  return hits[0] ?? null;
}
```

- [ ] **Step 4: 实现限制为两次反弹的完整预演**

```ts
export function buildAimPreview(
  origin: Vec2,
  initialVelocity: Vec2,
  radius: number,
  walls: readonly WallCollider[],
  circles: readonly CircleCollider[],
  maxBounces: 2,
): AimPreview {
  const segments: PreviewSegment[] = [];
  let cursor = { ...origin };
  let velocity = { ...initialVelocity };
  let bounceCount = 0;
  let targetId: string | null = null;
  while (segments.length < maxBounces + 1) {
    const hit = firstHit(cursor, velocity, radius, walls, circles);
    if (!hit) {
      segments.push({
        from: cursor,
        to: { x: cursor.x + velocity.x * 0.75, y: cursor.y + velocity.y * 0.75 },
        colliderId: null,
      });
      break;
    }
    segments.push({ from: cursor, to: hit.point, colliderId: hit.colliderId });
    if (circles.some((circle) => circle.id === hit.colliderId)) {
      targetId = hit.colliderId;
      break;
    }
    bounceCount += 1;
    if (bounceCount > maxBounces) break;
    velocity = reflect(velocity, hit.normal);
    cursor = {
      x: hit.point.x + hit.normal.x * 0.001,
      y: hit.point.y + hit.normal.y * 0.001,
    };
  }
  return { segments, bounceCount: Math.min(bounceCount, maxBounces), targetId };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/preview.test.ts`

Expected: 2 tests PASS；没有独立的“预测物理”数值路径。

- [ ] **Step 5: 提交瞄准预演**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/physics/preview.ts games/wechat-h5-v2/tests/ricochet-crew/unit/preview.test.ts
git commit -m "feat(ricochet): add two-bounce aim preview"
```

### Task 5: 实现三名英雄的飞行中一次性技能

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/content/heroes.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/combat/skills.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/skills.test.ts`

- [ ] **Step 1: 写入技能改变轨迹且每发仅一次的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { activateHeroSkill } from '../../../apps/ricochet-crew/src/combat/skills';
import { HEROES } from '../../../apps/ricochet-crew/src/content/heroes';

describe('mid-flight hero skills', () => {
  it('Tuo dashes along the current direction and gains armor break', () => {
    const result = activateHeroSkill('tuo', {
      velocity: { x: 300, y: -400 },
      skillAvailable: true,
      nearestTarget: { x: 200, y: 200 },
    });
    expect(result.velocity).toEqual({ x: 720, y: -960 });
    expect(result.effects).toContain('armor-break');
    expect(result.skillAvailable).toBe(false);
  });

  it('Mio creates exactly three trajectories and cannot activate twice', () => {
    const first = activateHeroSkill('mio', {
      velocity: { x: 0, y: -1000 },
      skillAvailable: true,
      nearestTarget: null,
    });
    expect(first.spawnedVelocities).toHaveLength(2);
    expect(() =>
      activateHeroSkill('mio', {
        velocity: first.velocity,
        skillAvailable: first.skillAvailable,
        nearestTarget: null,
      }),
    ).toThrow('skill already consumed');
  });

  it('defines three heroes with distinct build affinity', () => {
    expect(Object.keys(HEROES)).toEqual(['tuo', 'mio', 'luo']);
    expect(new Set(Object.values(HEROES).map((hero) => hero.primaryTag)).size).toBe(3);
  });
});
```

- [ ] **Step 2: 运行测试并确认技能模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/skills.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../combat/skills`。

- [ ] **Step 3: 定义三英雄内容**

```ts
import type { BuildTag, HeroId } from '../game/contracts';

export interface HeroDefinition {
  readonly id: HeroId;
  readonly name: string;
  readonly skill: 'dash' | 'split' | 'orbit';
  readonly primaryTag: BuildTag;
  readonly launchSpeed: number;
  readonly skillLabel: string;
}

export const HEROES: Readonly<Record<HeroId, HeroDefinition>> = {
  tuo: {
    id: 'tuo',
    name: '岩铠·拓',
    skill: 'dash',
    primaryTag: 'blast',
    launchSpeed: 1060,
    skillLabel: '重冲破甲',
  },
  mio: {
    id: 'mio',
    name: '镜羽·澪',
    skill: 'split',
    primaryTag: 'split',
    launchSpeed: 980,
    skillLabel: '三影归一',
  },
  luo: {
    id: 'luo',
    name: '旋刃·洛',
    skill: 'orbit',
    primaryTag: 'recall',
    launchSpeed: 1020,
    skillLabel: '回旋追猎',
  },
};
```

- [ ] **Step 4: 实现冲刺、分裂和回旋结果**

```ts
import type { HeroId, Vec2 } from '../game/contracts';
import { normalize, scale } from '../physics/vector';

export interface SkillContext {
  readonly velocity: Vec2;
  readonly skillAvailable: boolean;
  readonly nearestTarget: Vec2 | null;
}

export interface SkillResult {
  readonly velocity: Vec2;
  readonly spawnedVelocities: readonly Vec2[];
  readonly effects: readonly ('armor-break' | 'illusion' | 'orbit-hit')[];
  readonly skillAvailable: false;
}

const rotate = (velocity: Vec2, radians: number): Vec2 => ({
  x: velocity.x * Math.cos(radians) - velocity.y * Math.sin(radians),
  y: velocity.x * Math.sin(radians) + velocity.y * Math.cos(radians),
});

export function activateHeroSkill(heroId: HeroId, context: SkillContext): SkillResult {
  if (!context.skillAvailable) throw new Error('skill already consumed');
  if (heroId === 'tuo') {
    return {
      velocity: scale(context.velocity, 2.4),
      spawnedVelocities: [],
      effects: ['armor-break'],
      skillAvailable: false,
    };
  }
  if (heroId === 'mio') {
    return {
      velocity: context.velocity,
      spawnedVelocities: [rotate(context.velocity, -0.24), rotate(context.velocity, 0.24)],
      effects: ['illusion'],
      skillAvailable: false,
    };
  }
  const targetDirection = context.nearestTarget
    ? normalize(context.nearestTarget)
    : normalize({ x: -context.velocity.y, y: context.velocity.x });
  return {
    velocity: scale(targetDirection, Math.hypot(context.velocity.x, context.velocity.y)),
    spawnedVelocities: [],
    effects: ['orbit-hit'],
    skillAvailable: false,
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/skills.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交三英雄技能**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/content/heroes.ts games/wechat-h5-v2/apps/ricochet-crew/src/combat/skills.ts games/wechat-h5-v2/tests/ricochet-crew/unit/skills.test.ts
git commit -m "feat(ricochet): add active hero flight skills"
```

### Task 6: 将物理命中转换为伤害、破甲、连击和机关

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/combat/damage.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/combat/shotSystem.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/damage.test.ts`

- [ ] **Step 1: 写入破甲、弱点、连击与机关失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { applyHit } from '../../../apps/ricochet-crew/src/combat/damage';
import type { TargetState } from '../../../apps/ricochet-crew/src/game/contracts';

const target = (overrides: Partial<TargetState>): TargetState => ({
  id: 'target',
  kind: 'enemy',
  position: { x: 100, y: 100 },
  radius: 20,
  hp: 100,
  maxHp: 100,
  armor: 0,
  active: true,
  tags: [],
  ...overrides,
});

describe('ricochet damage', () => {
  it('consumes armor before hp and reports an armor break', () => {
    const result = applyHit(target({ armor: 30 }), {
      baseDamage: 40,
      combo: 1,
      effects: [],
    });
    expect(result.target.armor).toBe(0);
    expect(result.target.hp).toBe(90);
    expect(result.events).toContain('armor-broken');
  });

  it('doubles weakpoint damage and advances combo', () => {
    const result = applyHit(target({ kind: 'weakpoint' }), {
      baseDamage: 30,
      combo: 4,
      effects: [],
    });
    expect(result.target.hp).toBe(40);
    expect(result.nextCombo).toBe(5);
  });

  it('activates a mechanism without treating it as an enemy kill', () => {
    const result = applyHit(target({ kind: 'mechanism', hp: 1, maxHp: 1 }), {
      baseDamage: 1,
      combo: 2,
      effects: [],
    });
    expect(result.events).toEqual(['mechanism-triggered']);
    expect(result.killed).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认伤害模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/damage.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../combat/damage`。

- [ ] **Step 3: 实现伤害解析器**

```ts
import type { TargetState } from '../game/contracts';

export interface HitInput {
  readonly baseDamage: number;
  readonly combo: number;
  readonly effects: readonly ('armor-break' | 'illusion' | 'orbit-hit')[];
}

export interface HitResult {
  readonly target: TargetState;
  readonly damage: number;
  readonly nextCombo: number;
  readonly killed: boolean;
  readonly events: readonly (
    | 'armor-broken'
    | 'target-hit'
    | 'target-killed'
    | 'mechanism-triggered'
  )[];
}

export function applyHit(target: TargetState, input: HitInput): HitResult {
  if (target.kind === 'mechanism') {
    return {
      target: { ...target, active: false },
      damage: 0,
      nextCombo: input.combo + 1,
      killed: false,
      events: ['mechanism-triggered'],
    };
  }
  const multiplier = target.kind === 'weakpoint' ? 2 : 1;
  let pending = input.baseDamage * multiplier;
  let armor = target.armor;
  const events: HitResult['events'][number][] = [];
  if (armor > 0) {
    const armorDamage = input.effects.includes('armor-break')
      ? Math.max(armor, pending)
      : Math.min(armor, pending);
    armor -= armorDamage;
    pending = Math.max(0, pending - armorDamage);
    if (armor === 0) events.push('armor-broken');
  }
  const hp = Math.max(0, target.hp - pending);
  const killed = hp === 0;
  events.push(killed ? 'target-killed' : 'target-hit');
  return {
    target: { ...target, armor, hp, active: !killed },
    damage: target.hp - hp,
    nextCombo: input.combo + 1,
    killed,
    events,
  };
}
```

- [ ] **Step 4: 实现单发命中聚合器并验证上限**

`shotSystem.ts`：

```ts
import { MAX_ACTIVE_PROJECTILES, MAX_ACTIVE_TARGETS } from '../game/constants';
import type { ShotState, TargetState } from '../game/contracts';
import { applyHit, type HitResult } from './damage';

export interface ShotResolution {
  readonly shot: ShotState;
  readonly targets: readonly TargetState[];
  readonly result: HitResult;
}

export function resolveShotHit(
  shot: ShotState,
  targets: readonly TargetState[],
  colliderId: string,
  effects: readonly ('armor-break' | 'illusion' | 'orbit-hit')[],
): ShotResolution {
  if (targets.length > MAX_ACTIVE_TARGETS) throw new Error('target cap exceeded');
  const index = targets.findIndex((target) => target.id === colliderId && target.active);
  if (index < 0) throw new Error(`active collider not found: ${colliderId}`);
  const result = applyHit(targets[index]!, {
    baseDamage: 24,
    combo: shot.combo,
    effects,
  });
  const nextTargets = targets.slice();
  nextTargets[index] = result.target;
  return {
    shot: {
      ...shot,
      combo: result.nextCombo,
      maxCombo: Math.max(shot.maxCombo, result.nextCombo),
    },
    targets: nextTargets,
    result,
  };
}

export function assertProjectileCount(count: number): void {
  if (count > MAX_ACTIVE_PROJECTILES) throw new Error('projectile cap exceeded');
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/damage.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交战斗命中解析**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/combat/damage.ts games/wechat-h5-v2/apps/ricochet-crew/src/combat/shotSystem.ts games/wechat-h5-v2/tests/ricochet-crew/unit/damage.test.ts
git commit -m "feat(ricochet): resolve combat hits and combos"
```

### Task 7: 定义 18 项会改变瞄准决策的三流派改造

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/content/modifierCatalog.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/combat/modifiers.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/modifiers.test.ts`

- [ ] **Step 1: 写入数量、流派、选择与行为变化失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { MODIFIER_CATALOG } from '../../../apps/ricochet-crew/src/content/modifierCatalog';
import { chooseModifierOffer, deriveShotRules } from '../../../apps/ricochet-crew/src/combat/modifiers';

describe('modifier catalog', () => {
  it('contains exactly six modifiers for each build tag', () => {
    expect(MODIFIER_CATALOG).toHaveLength(18);
    for (const tag of ['blast', 'split', 'recall'] as const) {
      expect(MODIFIER_CATALOG.filter((entry) => entry.tag === tag)).toHaveLength(6);
    }
  });

  it('offers three distinct ids and at least two tags', () => {
    const offer = chooseModifierOffer(20260729, 2, []);
    expect(new Set(offer.map((entry) => entry.id)).size).toBe(3);
    expect(new Set(offer.map((entry) => entry.tag)).size).toBeGreaterThanOrEqual(2);
  });

  it('changes collision and recall rules rather than only attack values', () => {
    const rules = deriveShotRules(['blast-chain', 'split-first-wall', 'recall-damage']);
    expect(rules.explodeOnArmorBreak).toBe(true);
    expect(rules.splitTrigger).toBe('first-wall');
    expect(rules.recallDealsDamage).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认改造目录缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/modifiers.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../content/modifierCatalog`。

- [ ] **Step 3: 写入 18 项完整目录**

```ts
import type { BuildTag } from '../game/contracts';

export type ModifierId =
  | 'blast-chain'
  | 'blast-barrel-seek'
  | 'blast-shrapnel'
  | 'blast-breach-line'
  | 'blast-overload'
  | 'blast-finisher'
  | 'split-first-wall'
  | 'split-skill-echo'
  | 'split-crossfire'
  | 'split-mark-return'
  | 'split-prism'
  | 'split-converge'
  | 'recall-damage'
  | 'recall-manual'
  | 'recall-hook'
  | 'recall-retrace'
  | 'recall-weakpoint'
  | 'recall-last-stand';

export interface ModifierDefinition {
  readonly id: ModifierId;
  readonly name: string;
  readonly tag: BuildTag;
  readonly changesDecision: string;
}

export const MODIFIER_CATALOG: readonly ModifierDefinition[] = [
  { id: 'blast-chain', name: '破甲连爆', tag: 'blast', changesDecision: '优先击破护甲以产生范围爆破' },
  { id: 'blast-barrel-seek', name: '药桶磁引', tag: 'blast', changesDecision: '药桶附近碰撞会偏折向药桶' },
  { id: 'blast-shrapnel', name: '背面弹片', tag: 'blast', changesDecision: '爆破从目标背面发射三枚弹片' },
  { id: 'blast-breach-line', name: '贯甲直线', tag: 'blast', changesDecision: '重冲命中护甲后保持原方向' },
  { id: 'blast-overload', name: '机关过载', tag: 'blast', changesDecision: '先触发机关会放大下一次破甲爆破' },
  { id: 'blast-finisher', name: '核心震爆', tag: 'blast', changesDecision: '一发内第二次部位破坏引发全场震爆' },
  { id: 'split-first-wall', name: '镜面初裂', tag: 'split', changesDecision: '首次撞墙生成左右幻影' },
  { id: 'split-skill-echo', name: '技能复影', tag: 'split', changesDecision: '途中技能额外保留一道延迟幻影' },
  { id: 'split-crossfire', name: '交叉标记', tag: 'split', changesDecision: '两条轨迹命中同目标才引爆标记' },
  { id: 'split-mark-return', name: '幻影归标', tag: 'split', changesDecision: '归一时优先飞向已标记目标' },
  { id: 'split-prism', name: '棱镜机关', tag: 'split', changesDecision: '经过旋转板会复制当前角度' },
  { id: 'split-converge', name: '三线会聚', tag: 'split', changesDecision: '三轨迹包围目标时暴露弱点' },
  { id: 'recall-damage', name: '回收刃路', tag: 'recall', changesDecision: '回收路线可造成伤害' },
  { id: 'recall-manual', name: '主动返航', tag: 'recall', changesDecision: '飞行中再次点按可提前进入回收' },
  { id: 'recall-hook', name: '返航钩索', tag: 'recall', changesDecision: '回收经过的首个敌人被拉向中心线' },
  { id: 'recall-retrace', name: '逆轨重演', tag: 'recall', changesDecision: '回收优先逆向经过最近两次碰撞点' },
  { id: 'recall-weakpoint', name: '弱点回切', tag: 'recall', changesDecision: '去程命中弱点后返程锁定同一部位' },
  { id: 'recall-last-stand', name: '绝境返杀', tag: 'recall', changesDecision: '敌军临近底线时可从底线强制返航' },
] as const;
```

- [ ] **Step 4: 实现确定性三选一和规则派生**

```ts
import { MODIFIER_CATALOG, type ModifierDefinition, type ModifierId } from '../content/modifierCatalog';

const mix = (seed: number): number => {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
};

export function chooseModifierOffer(
  seed: number,
  roomIndex: number,
  owned: readonly ModifierId[],
): readonly [ModifierDefinition, ModifierDefinition, ModifierDefinition] {
  const available = MODIFIER_CATALOG
    .filter((entry) => !owned.includes(entry.id))
    .map((entry, index) => ({ entry, order: mix(seed ^ (roomIndex * 4099) ^ index) }))
    .sort((a, b) => a.order - b.order || a.entry.id.localeCompare(b.entry.id));
  const first = available[0]!.entry;
  const second =
    available.find(({ entry }) => entry.tag !== first.tag)?.entry ?? available[1]!.entry;
  const third =
    available.find(
      ({ entry }) => entry.id !== first.id && entry.id !== second.id,
    )!.entry;
  return [first, second, third];
}

export function deriveShotRules(owned: readonly ModifierId[]) {
  return {
    explodeOnArmorBreak: owned.includes('blast-chain'),
    seekBarrels: owned.includes('blast-barrel-seek'),
    splitTrigger: owned.includes('split-first-wall') ? ('first-wall' as const) : null,
    skillCreatesEcho: owned.includes('split-skill-echo'),
    recallDealsDamage: owned.includes('recall-damage'),
    manualRecall: owned.includes('recall-manual'),
    retraceCount: owned.includes('recall-retrace') ? 2 : 0,
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/modifiers.test.ts`

Expected: 3 tests PASS；18 项改造无纯“攻击力 +N%”条目。

- [ ] **Step 5: 提交三流派改造**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/content/modifierCatalog.ts games/wechat-h5-v2/apps/ricochet-crew/src/combat/modifiers.ts games/wechat-h5-v2/tests/ricochet-crew/unit/modifiers.test.ts
git commit -m "feat(ricochet): add eighteen decision-changing modifiers"
```

### Task 8: 建立五房间确定性内容与 30 秒首个五连击保障

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/content/rooms.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/rooms.test.ts`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/fixtures/seed-20260729.json`

- [ ] **Step 1: 写入五房间、目标上限和首房五连击路径测试**

```ts
import { describe, expect, it } from 'vitest';
import { createRoomSequence } from '../../../apps/ricochet-crew/src/content/rooms';

describe('five-room sequence', () => {
  const rooms = createRoomSequence(20260729);

  it('creates five distinct rooms before the boss', () => {
    expect(rooms).toHaveLength(5);
    expect(rooms.map((room) => room.kind)).toEqual([
      'intro',
      'mechanism',
      'armor',
      'priority',
      'last-stand',
    ]);
  });

  it('keeps every room within target and collider budgets', () => {
    for (const room of rooms) {
      expect(room.targets.length).toBeLessThanOrEqual(16);
      expect(room.walls.length).toBeLessThanOrEqual(8);
    }
  });

  it('places a guaranteed five-hit bank shot in the intro room', () => {
    expect(rooms[0]?.teachingShot).toEqual({
      origin: { x: 195, y: 748 },
      dragTo: { x: 145, y: 808 },
      expectedMinimumCombo: 5,
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认房间模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/rooms.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../content/rooms`。

- [ ] **Step 3: 定义房间合同与固定墙体**

```ts
import type { TargetState, Vec2 } from '../game/contracts';
import type { WallCollider } from '../physics/world';

export type RoomKind = 'intro' | 'mechanism' | 'armor' | 'priority' | 'last-stand';

export interface RoomDefinition {
  readonly id: string;
  readonly kind: RoomKind;
  readonly widthScale: number;
  readonly targetAdvance: number;
  readonly walls: readonly WallCollider[];
  readonly targets: readonly TargetState[];
  readonly teachingShot: {
    readonly origin: Vec2;
    readonly dragTo: Vec2;
    readonly expectedMinimumCombo: number;
  } | null;
}

const baseWalls = (inset: number): readonly WallCollider[] => [
  { id: 'left-wall', start: { x: inset, y: 80 }, end: { x: inset, y: 760 } },
  { id: 'top-wall', start: { x: 390 - inset, y: 80 }, end: { x: inset, y: 80 } },
  { id: 'right-wall', start: { x: 390 - inset, y: 760 }, end: { x: 390 - inset, y: 80 } },
];

const target = (
  id: string,
  kind: TargetState['kind'],
  x: number,
  y: number,
  armor = 0,
  tags: readonly string[] = [],
): TargetState => ({
  id,
  kind,
  position: { x, y },
  radius: kind === 'mechanism' ? 18 : 22,
  hp: kind === 'mechanism' ? 1 : 72,
  maxHp: kind === 'mechanism' ? 1 : 72,
  armor,
  active: true,
  tags,
});
```

- [ ] **Step 4: 实现五个不同的参数化房间**

```ts
const jitter = (seed: number, salt: number): number =>
  (((seed ^ (salt * 2654435761)) >>> 0) % 17) - 8;

export function createRoomSequence(seed: number): readonly RoomDefinition[] {
  return [
    {
      id: 'room-1-intro',
      kind: 'intro',
      widthScale: 1,
      targetAdvance: 20,
      walls: baseWalls(18),
      targets: [
        target('intro-1', 'enemy', 148, 565),
        target('intro-2', 'enemy', 88, 450),
        target('intro-3', 'enemy', 110, 315),
        target('intro-4', 'enemy', 210, 235),
        target('intro-5', 'weakpoint', 302, 325),
      ],
      teachingShot: {
        origin: { x: 195, y: 748 },
        dragTo: { x: 145, y: 808 },
        expectedMinimumCombo: 5,
      },
    },
    {
      id: 'room-2-mechanism',
      kind: 'mechanism',
      widthScale: 1,
      targetAdvance: 24,
      walls: [
        ...baseWalls(18),
        { id: 'bank-board', start: { x: 118, y: 360 }, end: { x: 250, y: 300 } },
      ],
      targets: [
        target('switch-a', 'mechanism', 78, 260, 0, ['rotator']),
        target('enemy-2a', 'enemy', 155, 500),
        target('enemy-2b', 'enemy', 285, 420),
        target('weak-2', 'weakpoint', 310, 220),
      ],
      teachingShot: null,
    },
    {
      id: 'room-3-armor',
      kind: 'armor',
      widthScale: 0.94,
      targetAdvance: 28,
      walls: baseWalls(28),
      targets: [
        target('armor-3a', 'armor', 110 + jitter(seed, 1), 460, 48, ['heavy']),
        target('barrel-3', 'mechanism', 195, 360, 0, ['barrel']),
        target('armor-3b', 'armor', 280 + jitter(seed, 2), 260, 48, ['heavy']),
      ],
      teachingShot: null,
    },
    {
      id: 'room-4-priority',
      kind: 'priority',
      widthScale: 0.9,
      targetAdvance: 32,
      walls: baseWalls(36),
      targets: [
        target('runner-4', 'enemy', 195, 570, 0, ['runner']),
        target('elite-4', 'weakpoint', 110 + jitter(seed, 3), 270, 24, ['elite']),
        target('switch-4', 'mechanism', 300, 410, 0, ['rotator']),
      ],
      teachingShot: null,
    },
    {
      id: 'room-5-last-stand',
      kind: 'last-stand',
      widthScale: 0.82,
      targetAdvance: 38,
      walls: baseWalls(52),
      targets: [
        target('breacher-5a', 'armor', 120, 585, 54, ['breacher']),
        target('barrel-5', 'mechanism', 195, 455, 0, ['barrel']),
        target('breacher-5b', 'armor', 270, 335, 54, ['breacher']),
        target('weak-5', 'weakpoint', 195, 190, 18, ['elite']),
      ],
      teachingShot: null,
    },
  ];
}
```

把 seed `20260729` 的房间 id、目标 id、坐标和墙体 id 序列写入 `seed-20260729.json`，再运行：

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/rooms.test.ts`

Expected: 3 tests PASS；固定种子 fixture 与生成结果一致。

- [ ] **Step 5: 提交五房间内容**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/content/rooms.ts games/wechat-h5-v2/tests/ricochet-crew/unit/rooms.test.ts games/wechat-h5-v2/tests/ricochet-crew/fixtures/seed-20260729.json
git commit -m "feat(ricochet): add five deterministic combat rooms"
```

### Task 9: 实现五房间、改造选择和失败推进的运行状态机

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/run/runMachine.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/runMachine.test.ts`

- [ ] **Step 1: 写入状态迁移、选择门禁与失守失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createRunMachine } from '../../../apps/ricochet-crew/src/run/runMachine';

describe('ricochet run machine', () => {
  it('moves from aiming to flying, resolving and choosing', () => {
    const run = createRunMachine({ seed: 20260729, heroId: 'tuo', runId: 'run-a' });
    expect(run.state.mode).toBe('aiming');
    run.launch({ x: 0, y: -1000 }, 1);
    expect(run.state.mode).toBe('flying');
    run.finishShot();
    expect(run.state.mode).toBe('resolving');
    run.replaceTargets(
      run.state.targets.map((target) => ({ ...target, active: false, hp: 0 })),
    );
    run.clearCurrentRoom();
    expect(run.state.mode).toBe('choosing');
    expect(run.getOffer()).toHaveLength(3);
  });

  it('does not enter the next room before a valid choice', () => {
    const run = createRunMachine({ seed: 20260729, heroId: 'mio', runId: 'run-b' });
    run.launch({ x: 0, y: -1000 }, 1);
    run.finishShot();
    run.replaceTargets(
      run.state.targets.map((target) => ({ ...target, active: false, hp: 0 })),
    );
    run.clearCurrentRoom();
    expect(() => run.choose('recall-damage')).toThrow('modifier not offered');
  });

  it('loses when any active frontline crosses y=704', () => {
    const run = createRunMachine({ seed: 20260729, heroId: 'luo', runId: 'run-c' });
    run.replaceTargets([
      {
        id: 'breacher',
        kind: 'enemy',
        position: { x: 195, y: 705 },
        radius: 22,
        hp: 1,
        maxHp: 1,
        armor: 0,
        active: true,
        tags: ['breacher'],
      },
    ]);
    run.advanceEnemies();
    expect(run.state.mode).toBe('lost');
    expect(run.state.failureReason).toBe('frontline-breached');
  });
});
```

- [ ] **Step 2: 运行测试并确认状态机缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/runMachine.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../run/runMachine`。

- [ ] **Step 3: 创建初始状态、只读 state 和合法发射**

```ts
import type { HeroId, RicochetRunState, TargetState, Vec2 } from '../game/contracts';
import { SHOT_MAX_SECONDS, SHOT_RADIUS } from '../game/constants';
import { chooseModifierOffer } from '../combat/modifiers';
import type { ModifierId } from '../content/modifierCatalog';
import { createRoomSequence } from '../content/rooms';

export function createRunMachine(input: {
  seed: number;
  heroId: HeroId;
  runId: string;
}) {
  const rooms = createRoomSequence(input.seed);
  let offered: readonly ModifierId[] = [];
  const state: RicochetRunState = {
    runId: input.runId,
    seed: input.seed,
    heroId: input.heroId,
    mode: 'aiming',
    elapsedMs: 0,
    roomIndex: 0,
    shotsFired: 0,
    enemiesAdvanced: 0,
    skillUses: 0,
    firstInputAtMs: null,
    firstPayoffAtMs: null,
    build: [],
    buildTags: { blast: 0, split: 0, recall: 0 },
    targets: rooms[0]!.targets.map((target) => ({ ...target })),
    shot: null,
    boss: null,
    lastShotTrace: [],
    failureReason: null,
  };

  return {
    state,
    launch(velocity: Vec2, nowMs: number) {
      if (state.mode !== 'aiming') throw new Error(`cannot launch from ${state.mode}`);
      state.mode = 'flying';
      state.shotsFired += 1;
      state.firstInputAtMs ??= nowMs;
      state.shot = {
        id: state.shotsFired,
        position: { x: 195, y: 748 },
        velocity,
        radius: SHOT_RADIUS,
        remainingSeconds: SHOT_MAX_SECONDS,
        skillAvailable: true,
        recallRequested: false,
        wallBounces: 0,
        combo: 0,
        maxCombo: 0,
      };
    },
```

- [ ] **Step 4: 完成回合、房间、选择和失败迁移**

在返回对象中追加：

```ts
    finishShot() {
      if (state.mode !== 'flying') throw new Error(`cannot finish from ${state.mode}`);
      state.mode = 'resolving';
      state.shot = null;
    },
    clearCurrentRoom() {
      if (state.mode !== 'resolving') throw new Error(`cannot clear from ${state.mode}`);
      if (state.targets.some((target) => target.active && target.kind !== 'mechanism')) {
        throw new Error('room still contains active threats');
      }
      offered = chooseModifierOffer(
        state.seed,
        state.roomIndex,
        state.build as readonly ModifierId[],
      ).map((entry) => entry.id);
      state.mode = 'choosing';
    },
    getOffer() {
      return [...offered];
    },
    choose(modifierId: ModifierId) {
      if (state.mode !== 'choosing') throw new Error(`cannot choose from ${state.mode}`);
      if (!offered.includes(modifierId)) throw new Error('modifier not offered');
      const definition = chooseModifierOffer(
        state.seed,
        state.roomIndex,
        state.build as readonly ModifierId[],
      ).find((entry) => entry.id === modifierId)!;
      state.build = [...state.build, modifierId];
      state.buildTags = {
        ...state.buildTags,
        [definition.tag]: state.buildTags[definition.tag] + 1,
      };
      state.roomIndex += 1;
      offered = [];
      if (state.roomIndex < rooms.length) {
        state.targets = rooms[state.roomIndex]!.targets.map((target) => ({ ...target }));
        state.mode = 'aiming';
      } else {
        state.mode = 'resolving';
      }
    },
    replaceTargets(targets: readonly TargetState[]) {
      state.targets = targets.map((target) => ({ ...target }));
    },
    advanceEnemies() {
      state.enemiesAdvanced += 1;
      if (state.targets.some((target) => target.active && target.position.y >= 704)) {
        state.mode = 'lost';
        state.failureReason = 'frontline-breached';
      } else if (state.mode === 'resolving') {
        state.mode = 'aiming';
      }
    },
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/runMachine.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交运行状态机**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/run/runMachine.ts games/wechat-h5-v2/tests/ricochet-crew/unit/runMachine.test.ts
git commit -m "feat(ricochet): add five-room run state machine"
```

### Task 10: 实现护甲、武器、核心三部位 Boss 与技能打断

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/content/boss.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/boss.test.ts`

- [ ] **Step 1: 写入部位顺序、独立碎裂和打断失败测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  applyBossPartHit,
  createBossState,
  tickBossCharge,
} from '../../../apps/ricochet-crew/src/content/boss';

describe('three-part boss', () => {
  it('keeps weapon and core invulnerable until armor breaks', () => {
    const boss = createBossState();
    const early = applyBossPartHit(boss, 'weapon', 999);
    expect(early.boss.parts.weapon.hp).toBe(160);
    expect(early.events).toEqual(['part-blocked']);
    const broken = applyBossPartHit(boss, 'armor', 240);
    expect(broken.boss.phase).toBe('weapon-exposed');
    expect(broken.events).toContain('part-destroyed');
  });

  it('interrupts the charged weapon with an active skill hit', () => {
    const boss = tickBossCharge(
      { ...createBossState(), phase: 'weapon-exposed' },
      9,
    );
    const result = applyBossPartHit(boss, 'weapon', 24, true);
    expect(result.boss.interruptCharge).toBe(0);
    expect(result.events).toContain('boss-interrupted');
  });

  it('wins only after armor, weapon and core are destroyed', () => {
    let boss = createBossState();
    boss = applyBossPartHit(boss, 'armor', 240).boss;
    boss = applyBossPartHit(boss, 'weapon', 160).boss;
    boss = applyBossPartHit(boss, 'core', 320).boss;
    expect(boss.phase).toBe('defeated');
  });
});
```

- [ ] **Step 2: 运行测试并确认 Boss 模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/boss.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../content/boss`。

- [ ] **Step 3: 创建 Boss 三部位状态**

```ts
import type { BossState, TargetState } from '../game/contracts';

const part = (
  id: string,
  x: number,
  y: number,
  hp: number,
  tags: readonly string[],
): TargetState => ({
  id,
  kind: 'boss-part',
  position: { x, y },
  radius: id === 'boss-core' ? 28 : 34,
  hp,
  maxHp: hp,
  armor: id === 'boss-armor' ? 72 : 0,
  active: true,
  tags,
});

export function createBossState(): BossState {
  return {
    phase: 'shielded',
    interruptCharge: 0,
    parts: {
      armor: part('boss-armor', 195, 230, 240, ['armor']),
      weapon: part('boss-weapon', 286, 315, 160, ['weapon']),
      core: part('boss-core', 195, 350, 320, ['core']),
    },
  };
}

export function tickBossCharge(boss: BossState, seconds: number): BossState {
  if (boss.phase !== 'weapon-exposed') return boss;
  return { ...boss, interruptCharge: Math.min(10, boss.interruptCharge + seconds) };
}
```

- [ ] **Step 4: 实现部位门禁、破坏和技能打断**

```ts
export interface BossHitResult {
  readonly boss: BossState;
  readonly events: readonly (
    | 'part-blocked'
    | 'part-hit'
    | 'part-destroyed'
    | 'boss-interrupted'
    | 'boss-defeated'
  )[];
}

export function applyBossPartHit(
  boss: BossState,
  partId: keyof BossState['parts'],
  damage: number,
  skillHit = false,
): BossHitResult {
  const allowed =
    partId === 'armor' ||
    (partId === 'weapon' && boss.phase === 'weapon-exposed') ||
    (partId === 'core' && boss.phase === 'core-exposed');
  if (!allowed) return { boss, events: ['part-blocked'] };
  const current = boss.parts[partId];
  const hp = Math.max(0, current.hp - damage);
  const parts = {
    ...boss.parts,
    [partId]: { ...current, hp, active: hp > 0 },
  };
  const events: BossHitResult['events'][number][] = [
    hp === 0 ? 'part-destroyed' : 'part-hit',
  ];
  let phase = boss.phase;
  if (partId === 'armor' && hp === 0) phase = 'weapon-exposed';
  if (partId === 'weapon' && hp === 0) phase = 'core-exposed';
  if (partId === 'core' && hp === 0) {
    phase = 'defeated';
    events.push('boss-defeated');
  }
  const interrupted = partId === 'weapon' && skillHit && boss.interruptCharge >= 8;
  if (interrupted) events.push('boss-interrupted');
  return {
    boss: {
      ...boss,
      phase,
      parts,
      interruptCharge: interrupted ? 0 : boss.interruptCharge,
    },
    events,
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/boss.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交 Boss 战**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/content/boss.ts games/wechat-h5-v2/tests/ricochet-crew/unit/boss.test.ts
git commit -m "feat(ricochet): add destructible three-part boss"
```

### Task 11: 实现无永久战力的局外成长、七日每日种子和最后一发复盘

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/run/progression.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/run/daily.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/run/recap.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/progression.test.ts`

- [ ] **Step 1: 写入成长不含战力、七日补玩和轨迹复盘失败测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  applyRunProgress,
  createDefaultProgress,
} from '../../../apps/ricochet-crew/src/run/progression';
import { listDailyChallenges } from '../../../apps/ricochet-crew/src/run/daily';
import { buildLastShotRecap } from '../../../apps/ricochet-crew/src/run/recap';

describe('meta progression and daily', () => {
  it('unlocks heroes, cores and mastery without permanent combat stats', () => {
    const progress = applyRunProgress(createDefaultProgress(), {
      heroId: 'tuo',
      won: true,
      maxCombo: 22,
      buildTags: { blast: 3, split: 0, recall: 1 },
      dailyKey: null,
    });
    expect(progress.unlockedHeroes).toContain('mio');
    expect(progress.mastery['tuo-20-combo']).toBe(true);
    expect(progress).not.toHaveProperty('attack');
    expect(progress).not.toHaveProperty('maxHp');
  });

  it('provides today plus six prior dates with stable seeds', () => {
    const first = listDailyChallenges(new Date('2026-07-29T12:00:00+08:00'));
    const second = listDailyChallenges(new Date('2026-07-29T23:59:00+08:00'));
    expect(first).toHaveLength(7);
    expect(first).toEqual(second);
    expect(first[0]?.key).toBe('2026-07-29');
    expect(first[6]?.key).toBe('2026-07-23');
  });

  it('identifies a recoverable angle from the last trace', () => {
    const recap = buildLastShotRecap(
      [
        { atMs: 0, position: { x: 195, y: 748 }, velocity: { x: 200, y: -900 }, hitId: null },
        { atMs: 420, position: { x: 290, y: 380 }, velocity: { x: -200, y: -900 }, hitId: 'right-wall' },
      ],
      { x: 195, y: 220 },
    );
    expect(recap.angleDeltaDegrees).toBeGreaterThan(0);
    expect(recap.message).toMatch(/向左|向右/);
  });
});
```

- [ ] **Step 2: 运行测试并确认三个模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/progression.test.ts`

Expected: FAIL，首个错误包含 `Cannot find module .../run/progression`。

- [ ] **Step 3: 实现侧向解锁与九项技巧成就**

```ts
import type { BuildTag, HeroId } from '../game/contracts';

export type CoreModuleId = 'breach-core' | 'mirror-core' | 'return-core';
export type MasteryId =
  | 'tuo-20-combo'
  | 'tuo-double-break'
  | 'tuo-barrel-finish'
  | 'mio-3-path-hit'
  | 'mio-crossfire'
  | 'mio-prism-boss'
  | 'luo-midflight-core'
  | 'luo-recall-kill'
  | 'luo-orbit-interrupt';

export interface RicochetProgressV1 {
  readonly schemaVersion: 1;
  readonly unlockedHeroes: readonly HeroId[];
  readonly unlockedCores: readonly CoreModuleId[];
  readonly mastery: Readonly<Record<MasteryId, boolean>>;
  readonly completedDailyKeys: readonly string[];
  readonly bestCombo: number;
  readonly runsCompleted: number;
}

const masteryIds: readonly MasteryId[] = [
  'tuo-20-combo',
  'tuo-double-break',
  'tuo-barrel-finish',
  'mio-3-path-hit',
  'mio-crossfire',
  'mio-prism-boss',
  'luo-midflight-core',
  'luo-recall-kill',
  'luo-orbit-interrupt',
];

export function createDefaultProgress(): RicochetProgressV1 {
  return {
    schemaVersion: 1,
    unlockedHeroes: ['tuo'],
    unlockedCores: ['breach-core'],
    mastery: Object.fromEntries(masteryIds.map((id) => [id, false])) as Record<MasteryId, boolean>,
    completedDailyKeys: [],
    bestCombo: 0,
    runsCompleted: 0,
  };
}

export function applyRunProgress(
  current: RicochetProgressV1,
  result: {
    readonly heroId: HeroId;
    readonly won: boolean;
    readonly maxCombo: number;
    readonly buildTags: Readonly<Record<BuildTag, number>>;
    readonly dailyKey: string | null;
  },
): RicochetProgressV1 {
  const unlockedHeroes = new Set(current.unlockedHeroes);
  const unlockedCores = new Set(current.unlockedCores);
  if (result.won) {
    if (result.heroId === 'tuo') unlockedHeroes.add('mio');
    if (result.heroId === 'mio') unlockedHeroes.add('luo');
    if (result.buildTags.split >= 3) unlockedCores.add('mirror-core');
    if (result.buildTags.recall >= 3) unlockedCores.add('return-core');
  }
  const mastery = { ...current.mastery };
  if (result.heroId === 'tuo' && result.maxCombo >= 20) mastery['tuo-20-combo'] = true;
  return {
    ...current,
    unlockedHeroes: [...unlockedHeroes],
    unlockedCores: [...unlockedCores],
    mastery,
    completedDailyKeys:
      result.dailyKey && !current.completedDailyKeys.includes(result.dailyKey)
        ? [...current.completedDailyKeys, result.dailyKey]
        : current.completedDailyKeys,
    bestCombo: Math.max(current.bestCombo, result.maxCombo),
    runsCompleted: current.runsCompleted + 1,
  };
}
```

- [ ] **Step 4: 实现每日种子与最后一发复盘**

`daily.ts`：

```ts
const DAY_MS = 86_400_000;

const keyAtShanghaiDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const seedFromKey = (key: string): number => {
  let hash = 2166136261;
  for (const char of `ricochet-crew:${key}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function listDailyChallenges(now: Date): readonly {
  readonly key: string;
  readonly seed: number;
}[] {
  if (!Number.isFinite(now.getTime()) || now.getUTCFullYear() < 2026 || now.getUTCFullYear() > 2100) {
    return [];
  }
  return Array.from({ length: 7 }, (_, index) => {
    const key = keyAtShanghaiDate(new Date(now.getTime() - index * DAY_MS));
    return { key, seed: seedFromKey(key) };
  });
}
```

`recap.ts`：

```ts
import type { TracePoint, Vec2 } from '../game/contracts';

const angle = (vector: Vec2): number => Math.atan2(vector.y, vector.x);
const degrees = (radians: number): number => (radians * 180) / Math.PI;

export function buildLastShotRecap(
  trace: readonly TracePoint[],
  missedTarget: Vec2,
): {
  readonly angleDeltaDegrees: number;
  readonly direction: 'left' | 'right';
  readonly message: string;
  readonly trace: readonly TracePoint[];
} {
  if (trace.length === 0) throw new Error('recap requires a shot trace');
  const launch = trace[0]!;
  const desired = {
    x: missedTarget.x - launch.position.x,
    y: missedTarget.y - launch.position.y,
  };
  const delta = degrees(angle(desired) - angle(launch.velocity));
  const normalized = ((delta + 540) % 360) - 180;
  const direction = normalized < 0 ? 'left' : 'right';
  return {
    angleDeltaDegrees: Math.abs(Number(normalized.toFixed(1))),
    direction,
    message: `上一发若向${direction === 'left' ? '左' : '右'}修正 ${Math.abs(normalized).toFixed(1)}°，可更接近关键部位`,
    trace,
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/progression.test.ts`

Expected: 3 tests PASS。

- [ ] **Step 5: 提交局外成长、每日与复盘**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/run games/wechat-h5-v2/tests/ricochet-crew/unit/progression.test.ts
git commit -m "feat(ricochet): add progression daily runs and shot recap"
```

### Task 12: 定义玩法事件和本地质量报告

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/quality/events.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/quality/localReport.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/quality.test.ts`

- [ ] **Step 1: 写入事件 payload 与质量报告失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { ricochetEvent } from '../../../apps/ricochet-crew/src/quality/events';
import { buildRicochetReport } from '../../../apps/ricochet-crew/src/quality/localReport';

describe('ricochet quality events', () => {
  it('records angle, preview bounce, skill timing, combo, part and build tags', () => {
    const event = ricochetEvent('first_payoff', {
      angleDegrees: -74.5,
      previewBounces: 2,
      skillAtMs: 612,
      combo: 7,
      hitPart: 'boss-armor',
      buildTags: { blast: 2, split: 1, recall: 0 },
    });
    expect(event).toEqual({
      event: 'first_payoff',
      payload: {
        angleDegrees: -74.5,
        previewBounces: 2,
        skillAtMs: 612,
        combo: 7,
        hitPart: 'boss-armor',
        buildTags: { blast: 2, split: 1, recall: 0 },
      },
    });
  });

  it('reports first input, first payoff, decisions per minute and replay', () => {
    const report = buildRicochetReport([
      { event: 'run_start', atMs: 0, payload: {} },
      { event: 'first_input', atMs: 9000, payload: {} },
      { event: 'first_payoff', atMs: 22000, payload: { combo: 5 } },
      { event: 'choice_selected', atMs: 60000, payload: {} },
      { event: 'run_end', atMs: 300000, payload: { result: 'lost', failureReason: 'boss-overrun' } },
      { event: 'replay_start', atMs: 304000, payload: {} },
    ]);
    expect(report.firstInputMs).toBe(9000);
    expect(report.firstPayoffMs).toBe(22000);
    expect(report.decisionsPerMinute).toBeGreaterThan(0);
    expect(report.replayed).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认质量模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/quality.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../quality/events`。

- [ ] **Step 3: 实现弹珠专属事件 payload 合同**

```ts
import type { BuildTag } from '../game/contracts';

export type RicochetQualityEvent =
  | 'run_start'
  | 'first_input'
  | 'first_payoff'
  | 'choice_presented'
  | 'choice_selected'
  | 'strategy_changed'
  | 'run_end'
  | 'replay_start'
  | 'daily_start'
  | 'daily_end';

export interface RicochetEventPayload {
  readonly angleDegrees?: number;
  readonly previewBounces?: number;
  readonly skillAtMs?: number | null;
  readonly combo?: number;
  readonly hitPart?: string | null;
  readonly buildTags?: Readonly<Record<BuildTag, number>>;
  readonly result?: 'won' | 'lost';
  readonly failureReason?: string | null;
  readonly roomIndex?: number;
  readonly offerIds?: readonly string[];
  readonly selectedId?: string;
}

export function ricochetEvent(
  event: RicochetQualityEvent,
  payload: RicochetEventPayload,
): { readonly event: RicochetQualityEvent; readonly payload: RicochetEventPayload } {
  return { event, payload };
}
```

- [ ] **Step 4: 实现本地报告汇总**

```ts
import type { RicochetEventPayload, RicochetQualityEvent } from './events';

export interface RecordedRicochetEvent {
  readonly event: RicochetQualityEvent;
  readonly atMs: number;
  readonly payload: RicochetEventPayload;
}

export function buildRicochetReport(events: readonly RecordedRicochetEvent[]) {
  const at = (name: RicochetQualityEvent): number | null =>
    events.find((entry) => entry.event === name)?.atMs ?? null;
  const start = at('run_start') ?? 0;
  const end = at('run_end') ?? Math.max(start, ...events.map((entry) => entry.atMs));
  const decisionNames = new Set<RicochetQualityEvent>([
    'first_input',
    'choice_selected',
    'strategy_changed',
  ]);
  const decisions = events.filter((entry) => decisionNames.has(entry.event)).length;
  const durationMinutes = Math.max((end - start) / 60_000, 1 / 60);
  const runEnd = events.find((entry) => entry.event === 'run_end');
  return {
    firstInputMs: at('first_input'),
    firstPayoffMs: at('first_payoff'),
    decisionsPerMinute: Number((decisions / durationMinutes).toFixed(2)),
    result: runEnd?.payload.result ?? null,
    failureReason: runEnd?.payload.failureReason ?? null,
    replayed: at('replay_start') !== null,
    strategyTags: [
      ...new Set(
        events
          .map((entry) => entry.payload.buildTags)
          .filter((tags): tags is NonNullable<typeof tags> => Boolean(tags))
          .map((tags) =>
            Object.entries(tags)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => `${key}:${value}`)
              .join('|'),
          ),
      ),
    ],
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/quality.test.ts`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交玩法事件与本地报告**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/quality games/wechat-h5-v2/tests/ricochet-crew/unit/quality.test.ts
git commit -m "feat(ricochet): add gameplay telemetry payloads"
```

### Task 13: 接入高保真资产清单、来源记录与按房间懒加载

**Files:**
- Create: `games/wechat-h5-v2/art/recipes/ricochet-crew.json`
- Create: `games/wechat-h5-v2/art/prompts/ricochet-crew.json`
- Create: `games/wechat-h5-v2/art/provenance/ricochet-crew.json`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/presentation/assetBindings.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/assets.test.ts`

- [ ] **Step 1: 写入资产完整性和禁止占位表现的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import source from '../../../art/recipes/ricochet-crew.json';
import provenance from '../../../art/provenance/ricochet-crew.json';
import { RICOCHET_ASSET_IDS } from '../../../apps/ricochet-crew/src/presentation/assetBindings';

describe('ricochet high fidelity assets', () => {
  it('declares cover, three parallax layers, three hero atlases and boss atlas', () => {
    expect(RICOCHET_ASSET_IDS.cover).toBe('ricochet.cover');
    expect(RICOCHET_ASSET_IDS.backgrounds).toHaveLength(3);
    expect(Object.keys(RICOCHET_ASSET_IDS.heroes)).toEqual(['tuo', 'mio', 'luo']);
    expect(RICOCHET_ASSET_IDS.boss).toBe('ricochet.boss.atlas');
  });

  it('uses runtime atlases instead of emoji, text or geometric stand-ins', () => {
    const paths = source.assets.map((asset) => asset.path);
    expect(paths.every((path) => /\.(webp|png|json|ogg)$/.test(path))).toBe(true);
    expect(JSON.stringify(source)).not.toMatch(/emoji|temporary-geometry|circle-avatar/i);
  });

  it('records prompt, creation date, purpose and human revision for every generated image', () => {
    for (const entry of provenance.entries) {
      expect(entry.prompt.length).toBeGreaterThan(40);
      expect(entry.generatedAt).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(entry.usage.length).toBeGreaterThan(8);
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(['generated', 'retouched', 'approved', 'rejected']).toContain(entry.humanRevisionStatus);
    }
  });
});
```

- [ ] **Step 2: 运行测试并确认资产源清单缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/assets.test.ts`

Expected: FAIL，错误包含 `Failed to load url .../asset-source.json`。

- [ ] **Step 3: 写入精确资产源清单和来源记录**

`asset-source.json`：

```json
{
  "gameId": "ricochet-crew",
  "budgets": {
    "firstScreenBytes": 5242880,
    "runBytes": 18874368,
    "textureMemoryBytes": 83886080,
    "maxAtlasSize": 2048
  },
  "assets": [
    { "id": "ricochet.cover", "path": "cover/ricochet-cover.webp", "bundle": "boot" },
    { "id": "ricochet.ui.atlas", "path": "ui/ricochet-ui.json", "bundle": "boot" },
    { "id": "ricochet.bg.far", "path": "scene/ruins-far.webp", "bundle": "room-1" },
    { "id": "ricochet.bg.mid", "path": "scene/ruins-mid.webp", "bundle": "room-1" },
    { "id": "ricochet.bg.near", "path": "scene/ruins-near.webp", "bundle": "room-1" },
    { "id": "ricochet.hero.tuo.atlas", "path": "heroes/tuo/tuo.json", "bundle": "hero-tuo" },
    { "id": "ricochet.hero.mio.atlas", "path": "heroes/mio/mio.json", "bundle": "hero-mio" },
    { "id": "ricochet.hero.luo.atlas", "path": "heroes/luo/luo.json", "bundle": "hero-luo" },
    { "id": "ricochet.enemy.atlas", "path": "enemies/ruin-enemies.json", "bundle": "room-2" },
    { "id": "ricochet.mechanism.atlas", "path": "mechanisms/ruin-mechanisms.json", "bundle": "room-2" },
    { "id": "ricochet.boss.atlas", "path": "boss/ruin-colossus.json", "bundle": "boss" },
    { "id": "ricochet.fx.atlas", "path": "fx/ricochet-fx.json", "bundle": "room-1" },
    { "id": "ricochet.audio.core", "path": "audio/ricochet-core.ogg", "bundle": "boot" },
    { "id": "ricochet.audio.combat", "path": "audio/ricochet-combat.ogg", "bundle": "room-1" },
    { "id": "ricochet.audio.boss", "path": "audio/ricochet-boss.ogg", "bundle": "boss" }
  ]
}
```

`art-prompts.json` 必须精确写入 11 个视觉源：

```json
{
  "entries": [
    {
      "sourceId": "ricochet.cover",
      "prompt": "霓虹机械遗迹竖屏游戏封面，岩铠拓、镜羽澪、旋刃洛从巨型遗迹核心向镜头高速反弹，明确前中远景、非文字海报、角色轮廓互不重叠",
      "purpose": "游戏启动封面与大厅卡片主视觉"
    },
    {
      "sourceId": "ricochet.bg.far",
      "prompt": "霓虹机械遗迹竖屏远景层，巨大环形结构、冷色雾气与纵深光束，透明边缘可无缝视差滚动，不出现角色、文字和近景遮挡",
      "purpose": "战斗场景远景视差层"
    },
    {
      "sourceId": "ricochet.bg.mid",
      "prompt": "霓虹机械遗迹竖屏中景层，断裂平台、发光导轨与旋转机械结构，战斗区中心留出清晰弹道空间，轮廓不与敌人混淆",
      "purpose": "战斗场景中景视差层"
    },
    {
      "sourceId": "ricochet.bg.near",
      "prompt": "霓虹机械遗迹竖屏前景层，左右残骸与破损护栏形成景框，中央和底部发射区域完全无遮挡，支持透明背景叠加",
      "purpose": "战斗场景前景视差层"
    },
    {
      "sourceId": "ricochet.hero.tuo.atlas",
      "prompt": "岩铠拓高辨识机械重装英雄透明图集，厚重岩甲、橙色能量裂纹，包含待机、蓄力、弹射、重冲、受击、必杀、胜利和失败动作拆分",
      "purpose": "岩铠拓运行时动作图集"
    },
    {
      "sourceId": "ricochet.hero.mio.atlas",
      "prompt": "镜羽澪高辨识镜面羽翼英雄透明图集，青紫棱镜装甲和三道幻影轮廓，包含待机、蓄力、弹射、分裂、归一、受击、胜利和失败动作",
      "purpose": "镜羽澪运行时动作图集"
    },
    {
      "sourceId": "ricochet.hero.luo.atlas",
      "prompt": "旋刃洛高辨识环刃英雄透明图集，赤红旋刃与轻型流线装甲，包含待机、蓄力、弹射、改向、绕行、受击、胜利和失败动作",
      "purpose": "旋刃洛运行时动作图集"
    },
    {
      "sourceId": "ricochet.enemy.atlas",
      "prompt": "机械遗迹敌人透明图集，普通追猎者、厚甲守卫、高速突进者、弱点精英四种独立轮廓，包含待机、推进、受击、破甲与摧毁状态",
      "purpose": "五房间敌人运行时图集"
    },
    {
      "sourceId": "ricochet.mechanism.atlas",
      "prompt": "机械遗迹机关透明图集，旋转反弹板、发光触发器、炸药桶和棱镜复制器，激活前后轮廓与姿态显著不同且不只依赖颜色",
      "purpose": "五房间机关运行时图集"
    },
    {
      "sourceId": "ricochet.boss.atlas",
      "prompt": "遗迹巨像 Boss 透明拆件图集，护甲、武器、核心三个可破坏部位独立分层，包含蓄力、打断、部位碎裂、核心暴露和崩解动作",
      "purpose": "三部位 Boss 运行时图集"
    },
    {
      "sourceId": "ricochet.fx.atlas",
      "prompt": "霓虹机械弹射特效透明图集，蓄力线、弹道残影、碰撞火花、破甲碎片、慢动作冲击环、连锁爆炸与核心崩解，边缘干净可叠加",
      "purpose": "碰撞、技能、连击和胜负特效图集"
    }
  ]
}
```

美术文件落盘后运行共享流水线生成带实际哈希的 `provenance.json`：

Run: `npm.cmd --prefix games/wechat-h5-v2 run assets:export -- art/recipes/ricochet-crew.json`

Expected: 输出 11 条记录；每条 `sourceSha256` 为对应源文件实际计算得到的 64 位小写十六进制值。

- [ ] **Step 4: 创建运行时资产绑定并由共享流水线生成带哈希 manifest**

```ts
import type { HeroId } from '../game/contracts';

export const RICOCHET_ASSET_IDS = {
  cover: 'ricochet.cover',
  ui: 'ricochet.ui.atlas',
  backgrounds: ['ricochet.bg.far', 'ricochet.bg.mid', 'ricochet.bg.near'],
  heroes: {
    tuo: 'ricochet.hero.tuo.atlas',
    mio: 'ricochet.hero.mio.atlas',
    luo: 'ricochet.hero.luo.atlas',
  } satisfies Record<HeroId, string>,
  enemies: 'ricochet.enemy.atlas',
  mechanisms: 'ricochet.mechanism.atlas',
  boss: 'ricochet.boss.atlas',
  effects: 'ricochet.fx.atlas',
  audio: {
    core: 'ricochet.audio.core',
    combat: 'ricochet.audio.combat',
    boss: 'ricochet.audio.boss',
  },
} as const;

export const bundlesForRoom = (roomIndex: number, heroId: HeroId): readonly string[] => {
  if (roomIndex === 0) return ['boot', `hero-${heroId}`, 'room-1'];
  if (roomIndex === 1) return ['room-2'];
  if (roomIndex === 5) return ['boss'];
  return [];
};
```

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 run assets:export -- art/recipes/ricochet-crew.json
npm.cmd --prefix games/wechat-h5-v2 run assets:manifest -- art/recipes/ricochet-crew.json
npm.cmd --prefix games/wechat-h5-v2 run assets:validate -- ricochet-crew
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/assets.test.ts
```

Expected: `apps/ricochet-crew/public/assets/asset-manifest.json` 中每个实际文件均有 64 位小写 SHA-256；单图集不超过 2048×2048；首屏、单局和纹理预算均 PASS；3 tests PASS。来源记录不满足共享 schema 时，`assets:validate` 必须 FAIL。

- [ ] **Step 5: 提交资产合同与真实生成资产**

```bash
git add games/wechat-h5-v2/art/recipes/ricochet-crew.json games/wechat-h5-v2/art/prompts/ricochet-crew.json games/wechat-h5-v2/art/provenance/ricochet-crew.json games/wechat-h5-v2/apps/ricochet-crew/public/assets games/wechat-h5-v2/apps/ricochet-crew/src/presentation/assetBindings.ts games/wechat-h5-v2/tests/ricochet-crew/unit/assets.test.ts
git commit -m "feat(ricochet): integrate production art asset bundles"
```

### Task 14: 实现性能分档和减少动态效果的表现策略

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/presentation/effectPolicy.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/unit/effectPolicy.test.ts`

- [ ] **Step 1: 写入三档特效和非颜色信息失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createEffectPolicy } from '../../../apps/ricochet-crew/src/presentation/effectPolicy';

describe('effect policy', () => {
  it('keeps gameplay readability while reducing particles and motion', () => {
    const policy = createEffectPolicy('low', true);
    expect(policy.particleScale).toBe(0.25);
    expect(policy.screenShake).toBe(false);
    expect(policy.slowMotionScale).toBe(0);
    expect(policy.showHitOutline).toBe(true);
    expect(policy.showPartLabel).toBe(true);
  });

  it('caps DPR by performance tier', () => {
    expect(createEffectPolicy('high', false).maxDpr).toBe(2);
    expect(createEffectPolicy('balanced', false).maxDpr).toBe(1.5);
    expect(createEffectPolicy('low', false).maxDpr).toBe(1);
  });
});
```

- [ ] **Step 2: 运行测试并确认策略模块缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/effectPolicy.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../presentation/effectPolicy`。

- [ ] **Step 3: 实现性能档与减少动态效果策略**

```ts
import type { PerformanceTier } from '@gamehub/h5-contracts';

export interface EffectPolicy {
  readonly maxDpr: 1 | 1.5 | 2;
  readonly particleScale: number;
  readonly screenShake: boolean;
  readonly slowMotionScale: number;
  readonly trailSamples: number;
  readonly postProcessing: boolean;
  readonly showHitOutline: true;
  readonly showPartLabel: true;
}

export function createEffectPolicy(
  tier: PerformanceTier,
  reducedMotion: boolean,
): EffectPolicy {
  const maxDpr = tier === 'high' ? 2 : tier === 'balanced' ? 1.5 : 1;
  return {
    maxDpr,
    particleScale: reducedMotion ? 0.25 : tier === 'high' ? 1 : tier === 'balanced' ? 0.6 : 0.35,
    screenShake: !reducedMotion && tier !== 'low',
    slowMotionScale: reducedMotion ? 0 : tier === 'low' ? 0.35 : 1,
    trailSamples: reducedMotion ? 4 : tier === 'high' ? 18 : tier === 'balanced' ? 10 : 6,
    postProcessing: !reducedMotion && tier === 'high',
    showHitOutline: true,
    showPartLabel: true,
  };
}
```

- [ ] **Step 4: 运行单测和类型检查**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/unit/effectPolicy.test.ts && npm.cmd --prefix games/wechat-h5-v2 run typecheck`

Expected: 2 tests PASS；TypeScript 输出无错误。

- [ ] **Step 5: 提交表现降档策略**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/presentation/effectPolicy.ts games/wechat-h5-v2/tests/ricochet-crew/unit/effectPolicy.test.ts
git commit -m "feat(ricochet): add accessible performance effects policy"
```

### Task 15: 建立 Pixi 场景、HUD、瞄准触控和途中技能按钮

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/presentation/RicochetScene.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/presentation/Hud.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/style.css`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/presentation.test.ts`

- [ ] **Step 1: 写入 HUD 可访问名称、44px 触控和模式可见性失败测试**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { createHud } from '../../../apps/ricochet-crew/src/presentation/Hud';

afterEach(() => document.body.replaceChildren());

describe('ricochet HUD', () => {
  it('shows an accessible skill button only during flight', () => {
    const hud = createHud(document.body);
    hud.render({
      mode: 'aiming',
      roomLabel: '房间 1/5',
      combo: 0,
      skillLabel: '重冲破甲',
      skillAvailable: true,
      bossPartLabel: null,
    });
    expect(hud.skillButton.hidden).toBe(true);
    hud.render({
      mode: 'flying',
      roomLabel: '房间 1/5',
      combo: 4,
      skillLabel: '重冲破甲',
      skillAvailable: true,
      bossPartLabel: null,
    });
    expect(hud.skillButton.hidden).toBe(false);
    expect(hud.skillButton.getAttribute('aria-label')).toBe('途中技能：重冲破甲，仅本发一次');
    expect(getComputedStyle(hud.skillButton).minHeight).toBe('56px');
  });
});
```

- [ ] **Step 2: 运行测试并确认 HUD 缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/presentation.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../presentation/Hud`。

- [ ] **Step 3: 实现 DOM HUD 和非颜色状态标签**

```ts
import type { RunMode } from '../game/contracts';

export interface HudView {
  readonly mode: RunMode;
  readonly roomLabel: string;
  readonly combo: number;
  readonly skillLabel: string;
  readonly skillAvailable: boolean;
  readonly bossPartLabel: string | null;
}

export function createHud(host: HTMLElement) {
  const root = document.createElement('section');
  root.className = 'hud';
  const room = document.createElement('strong');
  room.className = 'hud__room';
  const combo = document.createElement('output');
  combo.className = 'hud__combo';
  const bossPart = document.createElement('div');
  bossPart.className = 'hud__boss-part';
  const skillButton = document.createElement('button');
  skillButton.type = 'button';
  skillButton.className = 'hud__skill';
  root.append(room, combo, bossPart, skillButton);
  host.append(root);

  return {
    root,
    skillButton,
    render(view: HudView) {
      room.textContent = view.roomLabel;
      combo.textContent = `${view.combo} 连击`;
      bossPart.textContent = view.bossPartLabel ?? '';
      bossPart.hidden = view.bossPartLabel === null;
      skillButton.textContent = view.skillLabel;
      skillButton.hidden = view.mode !== 'flying';
      skillButton.disabled = !view.skillAvailable;
      skillButton.setAttribute(
        'aria-label',
        `途中技能：${view.skillLabel}，仅本发一次`,
      );
    },
  };
}
```

`style.css` 至少写入：

```css
:root {
  color-scheme: dark;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #091120;
  color: #f7fbff;
  touch-action: none;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.hud {
  position: fixed;
  inset: max(12px, env(safe-area-inset-top)) 12px auto;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  pointer-events: none;
}

.hud__skill {
  position: fixed;
  right: 18px;
  bottom: max(22px, env(safe-area-inset-bottom));
  min-width: 112px;
  min-height: 56px;
  border: 2px solid #f8feff;
  border-radius: 28px;
  color: #07111f;
  background: #8ff7ff;
  font: inherit;
  font-weight: 800;
  pointer-events: auto;
}
```

- [ ] **Step 4: 创建只读 Pixi 场景映射器**

```ts
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { AimPreview } from '../physics/preview';
import type { RicochetRunState } from '../game/contracts';
import type { EffectPolicy } from './effectPolicy';

export class RicochetScene {
  readonly root = new Container();
  readonly background = new Container();
  readonly battlefield = new Container();
  readonly effects = new Container();
  readonly aimGuide = new Graphics();
  readonly shotSprite = new Sprite(Texture.EMPTY);
  private readonly targetSprites = new Map<string, Sprite>();

  constructor(private policy: EffectPolicy) {
    this.root.addChild(this.background, this.battlefield, this.effects, this.aimGuide);
    this.battlefield.addChild(this.shotSprite);
  }

  render(state: Readonly<RicochetRunState>, preview: AimPreview | null): void {
    this.aimGuide.clear();
    if (preview && state.mode === 'aiming') {
      for (const segment of preview.segments) {
        this.aimGuide
          .moveTo(segment.from.x, segment.from.y)
          .lineTo(segment.to.x, segment.to.y)
          .stroke({ color: 0xc8fbff, width: 3, alpha: 0.82 });
      }
    }
    this.shotSprite.visible = state.shot !== null;
    if (state.shot) this.shotSprite.position.set(state.shot.position.x, state.shot.position.y);
    for (const target of state.targets) {
      const sprite = this.targetSprites.get(target.id);
      if (!sprite) continue;
      sprite.visible = target.active;
      sprite.position.set(target.position.x, target.position.y);
      sprite.alpha = target.active ? 1 : 0;
    }
  }

  registerTargetSprite(id: string, sprite: Sprite): void {
    this.targetSprites.set(id, sprite);
    this.battlefield.addChild(sprite);
  }

  updatePolicy(policy: EffectPolicy): void {
    this.policy = policy;
  }

  destroy(): void {
    this.targetSprites.clear();
    this.root.destroy({ children: true });
  }
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/presentation.test.ts`

Expected: 1 test PASS。

- [ ] **Step 5: 提交场景与 HUD**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/presentation games/wechat-h5-v2/apps/ricochet-crew/src/style.css games/wechat-h5-v2/tests/ricochet-crew/integration/presentation.test.ts
git commit -m "feat(ricochet): add touch HUD and Pixi presentation"
```

### Task 16: 组装物理、战斗、房间和表现为可玩的单局控制器

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/game/createRicochetGame.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/gameLoop.test.ts`

- [ ] **Step 1: 写入发射、途中技能、回收、推进和首个高潮失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createRicochetGame } from '../../../apps/ricochet-crew/src/game/createRicochetGame';

describe('complete ricochet shot loop', () => {
  it('keeps the player active during flight and resolves the enemy advance', () => {
    const emit = vi.fn();
    const game = createRicochetGame({
      seed: 20260729,
      heroId: 'tuo',
      runId: 'run-loop',
      now: () => 1000,
      emit,
    });
    game.beginAim({ x: 195, y: 748 });
    game.updateAim({ x: 145, y: 808 });
    game.releaseAim();
    expect(game.snapshot().mode).toBe('flying');
    expect(game.snapshot().shot?.skillAvailable).toBe(true);
    game.useSkill();
    expect(game.snapshot().shot?.skillAvailable).toBe(false);
    for (let index = 0; index < 1200 && game.snapshot().mode === 'flying'; index += 1) {
      game.fixedUpdate(1 / 120);
    }
    expect(['aiming', 'choosing', 'lost']).toContain(game.snapshot().mode);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'first_input' }),
    );
  });

});
```

- [ ] **Step 2: 运行测试并确认控制器缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/integration/gameLoop.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../game/createRicochetGame`。

- [ ] **Step 3: 创建控制器、瞄准与真实物理世界**

```ts
import type { HeroId, RicochetRunState, Vec2 } from './contracts';
import { SHOT_RADIUS, SHOT_STOP_SPEED } from './constants';
import { HEROES } from '../content/heroes';
import { createRoomSequence } from '../content/rooms';
import { createPhysicsWorld } from '../physics/world';
import { buildAimPreview, type AimPreview } from '../physics/preview';
import { normalize, scale, sub } from '../physics/vector';
import { activateHeroSkill } from '../combat/skills';
import { resolveShotHit } from '../combat/shotSystem';
import { createRunMachine } from '../run/runMachine';
import { ricochetEvent, type RicochetEventPayload, type RicochetQualityEvent } from '../quality/events';

export interface RicochetGameEvent {
  readonly event: RicochetQualityEvent;
  readonly payload: RicochetEventPayload;
}

export function createRicochetGame(input: {
  readonly seed: number;
  readonly heroId: HeroId;
  readonly runId: string;
  readonly now: () => number;
  readonly emit: (event: RicochetGameEvent) => void;
}) {
  const run = createRunMachine(input);
  const rooms = createRoomSequence(input.seed);
  let aimOrigin: Vec2 | null = null;
  let aimPoint: Vec2 | null = null;
  let preview: AimPreview | null = null;
  let skillEffects: readonly ('armor-break' | 'illusion' | 'orbit-hit')[] = [];
  let payoffEmitted = false;

  const worldForRoom = () =>
    createPhysicsWorld({
      walls: rooms[Math.min(run.state.roomIndex, 4)]!.walls,
      circles: run.state.targets
        .filter((target) => target.active)
        .map((target) => ({
          id: target.id,
          center: target.position,
          radius: target.radius,
        })),
    });
  let world = worldForRoom();

  const emit = (event: RicochetQualityEvent, payload: RicochetEventPayload) =>
    input.emit(ricochetEvent(event, payload));

  const aimVelocity = (): Vec2 => {
    if (!aimOrigin || !aimPoint) throw new Error('aim is incomplete');
    const pull = sub(aimOrigin, aimPoint);
    const length = Math.min(110, Math.max(24, Math.hypot(pull.x, pull.y)));
    return scale(normalize(pull), HEROES[input.heroId].launchSpeed * (length / 110));
  };
```

- [ ] **Step 4: 完成发射、技能、固定更新、回收和命中解析**

在工厂函数中追加：

```ts
  const beginAim = (point: Vec2) => {
    if (run.state.mode !== 'aiming') return;
    aimOrigin = point;
    aimPoint = point;
  };

  const updateAim = (point: Vec2) => {
    if (!aimOrigin || run.state.mode !== 'aiming') return;
    aimPoint = point;
    const room = rooms[Math.min(run.state.roomIndex, 4)]!;
    preview = buildAimPreview(
      { x: 195, y: 748 },
      aimVelocity(),
      SHOT_RADIUS,
      room.walls,
      run.state.targets
        .filter((target) => target.active)
        .map((target) => ({ id: target.id, center: target.position, radius: target.radius })),
      2,
    );
  };

  const releaseAim = () => {
    const velocity = aimVelocity();
    run.launch(velocity, input.now());
    world = worldForRoom();
    world.launch({ x: 195, y: 748 }, velocity, SHOT_RADIUS);
    skillEffects = [];
    emit('first_input', {
      angleDegrees: Number(((Math.atan2(velocity.y, velocity.x) * 180) / Math.PI).toFixed(1)),
      previewBounces: preview?.bounceCount ?? 0,
      roomIndex: run.state.roomIndex,
      buildTags: run.state.buildTags,
    });
  };

  const useSkill = () => {
    const shot = run.state.shot;
    if (!shot || run.state.mode !== 'flying') return;
    const nearest = run.state.targets
      .filter((target) => target.active)
      .sort((a, b) => {
        const da = Math.hypot(a.position.x - shot.position.x, a.position.y - shot.position.y);
        const db = Math.hypot(b.position.x - shot.position.x, b.position.y - shot.position.y);
        return da - db || a.id.localeCompare(b.id);
      })[0];
    const result = activateHeroSkill(input.heroId, {
      velocity: shot.velocity,
      skillAvailable: shot.skillAvailable,
      nearestTarget: nearest
        ? { x: nearest.position.x - shot.position.x, y: nearest.position.y - shot.position.y }
        : null,
    });
    shot.velocity = result.velocity;
    shot.skillAvailable = result.skillAvailable;
    run.state.skillUses += 1;
    skillEffects = result.effects;
    world.setVelocity(result.velocity);
    emit('strategy_changed', {
      skillAtMs: input.now() - (run.state.firstInputAtMs ?? input.now()),
      roomIndex: run.state.roomIndex,
      buildTags: run.state.buildTags,
    });
  };

  const fixedUpdate = (dt: number) => {
    if (run.state.mode !== 'flying' || !run.state.shot) return;
    world.update(dt);
    const physics = world.snapshot();
    run.state.shot.position = physics.position;
    run.state.shot.velocity = physics.velocity;
    run.state.shot.remainingSeconds -= dt;
    for (const hit of world.drainHits()) {
      if (hit.colliderId.endsWith('wall') || hit.colliderId === 'bank-board') {
        run.state.shot.wallBounces += 1;
        continue;
      }
      const resolution = resolveShotHit(
        run.state.shot,
        run.state.targets,
        hit.colliderId,
        skillEffects,
      );
      run.state.shot = resolution.shot;
      run.state.targets = [...resolution.targets];
      if (!payoffEmitted && resolution.shot.maxCombo >= 5) {
        payoffEmitted = true;
        run.state.firstPayoffAtMs = input.now();
        emit('first_payoff', {
          combo: resolution.shot.maxCombo,
          hitPart: hit.colliderId,
          roomIndex: run.state.roomIndex,
          buildTags: run.state.buildTags,
        });
      }
    }
    const speed = Math.hypot(physics.velocity.x, physics.velocity.y);
    if (run.state.shot.remainingSeconds <= 0 || speed < SHOT_STOP_SPEED) {
      world.stop();
      run.finishShot();
      if (run.state.targets.every((target) => !target.active || target.kind === 'mechanism')) {
        run.clearCurrentRoom();
      } else {
        run.advanceEnemies();
      }
    }
  };

  return {
    beginAim,
    updateAim,
    releaseAim,
    useSkill,
    fixedUpdate,
    getPreview: () => preview,
    snapshot: (): Readonly<RicochetRunState> => run.state,
    choose: run.choose,
  };
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/integration/gameLoop.test.ts`

Expected: 1 test PASS；测试只通过真实固定更新推进，不提供组合数注入或强制高潮接口。

- [ ] **Step 5: 提交完整单发循环**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/game/createRicochetGame.ts games/wechat-h5-v2/tests/ricochet-crew/integration/gameLoop.test.ts
git commit -m "feat(ricochet): assemble active ricochet game loop"
```

### Task 17: 接入共享运行时、输入、音频、资产、存档、事件和无障碍

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/main.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/style.css`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/boot.test.ts`

- [ ] **Step 1: 写入普通入口只加载首屏并在明确开始后建 run 的失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';

describe('ricochet boot integration', () => {
  it('loads boot bundle before run bundles and emits game_ready before run_start', async () => {
    const order: string[] = [];
    const assets = {
      loadGroup: vi.fn(async (name: string) => order.push(`asset:${name}`)),
    };
    const telemetry = {
      emit: vi.fn(async (event: { event: string }) => order.push(`event:${event.event}`)),
    };
    await import('../../../apps/ricochet-crew/src/main');
    window.dispatchEvent(new CustomEvent('ricochet:test-services', {
      detail: { assets, telemetry },
    }));
    expect(order.indexOf('asset:boot')).toBeLessThan(order.indexOf('event:game_ready'));
    expect(order).not.toContain('event:run_start');
  });
});
```

- [ ] **Step 2: 运行测试并确认入口缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/boot.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../src/main`。

- [ ] **Step 3: 创建共享服务和 Pixi 启动**

```ts
import './style.css';
import { Application, Assets } from 'pixi.js';
import { createGameRuntime } from '@gamehub/h5-runtime';
import { createInputController } from '@gamehub/h5-input';
import { createAudioBus, createWebAudioBackend } from '@gamehub/h5-audio';
import { createAssetLoader, createBrowserAssetAdapter } from '@gamehub/h5-assets';
import { createLocalStorageSaveAdapter, createSaveStore } from '@gamehub/h5-save';
import { createLocalTelemetryQueue, createTelemetryClient } from '@gamehub/h5-telemetry';
import { createAccessibilityController } from '@gamehub/h5-accessibility';
import { createTestHarness } from '@gamehub/h5-testing';
import type { AssetManifest } from '@gamehub/h5-contracts';
import { GAME_ID, WORLD_HEIGHT, WORLD_WIDTH } from './game/constants';
import { createRicochetGame } from './game/createRicochetGame';
import { createDefaultProgress, type RicochetProgressV1 } from './run/progression';
import { createEffectPolicy } from './presentation/effectPolicy';
import { RicochetScene } from './presentation/RicochetScene';
import { createHud } from './presentation/Hud';
import { RICOCHET_ASSET_IDS, bundlesForRoom } from './presentation/assetBindings';

const host = document.querySelector<HTMLElement>('#app');
if (!host) throw new Error('#app host missing');
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const uiLayer = document.querySelector<HTMLElement>('#ui-layer');
const liveRegion = document.querySelector<HTMLElement>('#live-region');
if (!canvas || !uiLayer || !liveRegion) throw new Error('shared app shell is incomplete');

const testContext = createTestHarness({
  search: location.search,
  gameId: GAME_ID,
  defaultSeed: crypto.getRandomValues(new Uint32Array(1))[0]!,
  maxSpeed: 1,
});
const telemetry = createTelemetryClient({
  gameId: GAME_ID,
  testMode: testContext.enabled,
  queue: createLocalTelemetryQueue({ gameId: GAME_ID }),
});
const manifest = await fetch('./assets/asset-manifest.json')
  .then((response) => {
    if (!response.ok) throw new Error(`ASSET_MANIFEST_HTTP_${response.status}`);
    return response.json() as Promise<AssetManifest>;
  });
const assets = createAssetLoader({
  manifest,
  adapter: createBrowserAssetAdapter({
    decodeBlob: async (_entry, url) => Assets.load(url),
    releaseDecoded: async (_entry, value) => {
      if (typeof value === 'object' && value && 'destroy' in value) {
        (value as { destroy(): void }).destroy();
      }
    },
  }),
});
const audio = createAudioBus({
  backend: createWebAudioBackend(),
  maxVoices: 12,
});
const saves = createSaveStore<RicochetProgressV1>({
  gameId: GAME_ID,
  currentSchemaVersion: 1,
  defaultValue: createDefaultProgress,
  migrations: {},
  adapter: createLocalStorageSaveAdapter(),
});
const accessibility = createAccessibilityController({ root: host, liveRegion });
const app = new Application();
await app.init({
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  canvas,
  resizeTo: host,
  background: '#091120',
  resolution: Math.min(devicePixelRatio, 2),
  autoDensity: true,
});
await assets.loadGroup('boot');
telemetry.emit('game_boot');
let progress = (await saves.load()).payload;
const policy = createEffectPolicy('high', accessibility.snapshot().reducedMotion);
const scene = new RicochetScene(policy);
const hud = createHud(uiLayer);
app.stage.addChild(scene.root);
telemetry.emit('game_ready', { unlockedHeroes: progress.unlockedHeroes.length });
```

- [ ] **Step 4: 接入明确开始、真实拖拽、技能、固定更新和生命周期**

在 `main.ts` 追加：

```ts
const startButton = document.createElement('button');
startButton.className = 'start-button';
startButton.textContent = '进入机械遗迹';
startButton.type = 'button';
host.append(startButton);

let game: ReturnType<typeof createRicochetGame> | null = null;
let currentRunId: string | null = null;
const input = createInputController({
  element: app.canvas,
  logicalSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
});

startButton.addEventListener('click', async () => {
  await audio.unlockFromGesture();
  currentRunId = crypto.randomUUID();
  const seed = testContext.seed;
  await Promise.all(bundlesForRoom(0, 'tuo').map((bundle) => assets.loadGroup(bundle)));
  telemetry.beginRun(currentRunId);
  game = createRicochetGame({
    seed,
    heroId: 'tuo',
    runId: currentRunId,
    now: () => performance.now(),
    emit: ({ event, payload }) => void telemetry.emit(event, payload),
  });
  startButton.remove();
});

input.subscribe((intent) => {
  if (intent.kind === 'drag-start') game?.beginAim(intent.point);
  if (intent.kind === 'drag-move') game?.updateAim(intent.point);
  if (intent.kind === 'drag-end') game?.releaseAim();
});
hud.skillButton.addEventListener('click', () => {
  game?.useSkill();
  audio.play('skill');
});

const runtime = createGameRuntime({
  fixedStepMs: 1000 / 120,
  onFixedUpdate: (dt) => game?.fixedUpdate(dt),
  onRender: () => {
    if (!game) return;
    const state = game.snapshot();
    scene.render(state, game.getPreview());
    hud.render({
      mode: state.mode,
      roomLabel: state.roomIndex < 5 ? `房间 ${state.roomIndex + 1}/5` : '遗迹巨像',
      combo: state.shot?.combo ?? 0,
      skillLabel: '途中技能',
      skillAvailable: state.shot?.skillAvailable ?? false,
      bossPartLabel: state.boss?.phase ?? null,
    });
  },
  onPauseChange: (paused, reason) => {
    input.setEnabled(!paused);
    if (paused) {
      void audio.suspend();
      telemetry.emit('lifecycle_pause', { reason });
    } else {
      telemetry.emit('lifecycle_resume');
    }
  },
  onPerformanceTierChange: (tier) => {
    scene.updatePolicy(createEffectPolicy(tier, accessibility.snapshot().reducedMotion));
    telemetry.emit('performance_tier_changed', { tier });
  },
});
runtime.start();
```

在 `style.css` 追加：

```css
.start-button {
  position: fixed;
  left: 50%;
  bottom: max(28px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  min-width: 220px;
  min-height: 56px;
  border: 2px solid #fff;
  border-radius: 28px;
  background: linear-gradient(135deg, #8ff7ff, #ff79e6);
  color: #07111f;
  font: inherit;
  font-size: 18px;
  font-weight: 900;
}
```

- [ ] **Step 5: 运行启动测试、构建并提交共享接入**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/boot.test.ts
npm.cmd --prefix games/wechat-h5-v2 run build --workspace @gamehub/h5-ricochet-crew
```

Expected: 启动测试 PASS；Vite build PASS；普通入口不读取 `seed/speed/mute`，测试入口仅使用共享 `createTestHarness()` 的合法结果。

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/main.ts games/wechat-h5-v2/apps/ricochet-crew/src/style.css games/wechat-h5-v2/tests/ricochet-crew/integration/boot.test.ts
git commit -m "feat(ricochet): integrate shared H5 platform services"
```

### Task 18: 添加只读 AI 试玩与自动化观察钩子

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/testing/debugApi.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/main.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/debugApi.test.ts`

- [ ] **Step 1: 写入普通入口不可见、测试入口只读的失败测试**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { installRicochetDebugApi } from '../../../apps/ricochet-crew/src/testing/debugApi';

declare global {
  interface Window {
    __RICOCHET_TEST__?: unknown;
  }
}

afterEach(() => {
  delete window.__RICOCHET_TEST__;
});

describe('test-only debug API', () => {
  it('does not mount when test mode is disabled', () => {
    installRicochetDebugApi(false, {
      snapshot: () => ({ mode: 'aiming' }),
      preview: () => null,
      report: () => ({ events: 0 }),
    });
    expect(window.__RICOCHET_TEST__).toBeUndefined();
  });

  it('exposes observation without force win, time advance or resource injection', () => {
    installRicochetDebugApi(true, {
      snapshot: () => ({ mode: 'aiming' }),
      preview: () => null,
      report: () => ({ events: 2 }),
    });
    const keys = Object.keys(window.__RICOCHET_TEST__ as object).sort();
    expect(keys).toEqual(['getPreview', 'getReport', 'getSnapshot']);
  });
});
```

- [ ] **Step 2: 运行测试并确认观察钩子缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/debugApi.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../testing/debugApi`。

- [ ] **Step 3: 实现冻结副本的只读观察 API**

```ts
declare global {
  interface Window {
    __RICOCHET_TEST__?: Readonly<{
      getSnapshot(): unknown;
      getPreview(): unknown;
      getReport(): unknown;
    }>;
  }
}

const clone = <T>(value: T): T => structuredClone(value);

export function installRicochetDebugApi(
  enabled: boolean,
  source: {
    readonly snapshot: () => unknown;
    readonly preview: () => unknown;
    readonly report: () => unknown;
  },
): void {
  if (!enabled) return;
  window.__RICOCHET_TEST__ = Object.freeze({
    getSnapshot: () => clone(source.snapshot()),
    getPreview: () => clone(source.preview()),
    getReport: () => clone(source.report()),
  });
}
```

- [ ] **Step 4: 在测试上下文中挂载并在销毁时移除**

在 `main.ts` 导入并追加：

```ts
import { installRicochetDebugApi } from './testing/debugApi';
import { buildRicochetReport, type RecordedRicochetEvent } from './quality/localReport';

const localEvents: RecordedRicochetEvent[] = [];

installRicochetDebugApi(testContext.enabled, {
  snapshot: () => game?.snapshot() ?? { mode: 'boot' },
  preview: () => game?.getPreview() ?? null,
  report: () => buildRicochetReport(localEvents),
});

window.addEventListener('pagehide', () => {
  runtime.stop();
  input.destroy();
  scene.destroy();
  if (testContext.enabled) delete window.__RICOCHET_TEST__;
}, { once: true });
```

并把游戏 `emit` 回调改为先记录：

```ts
emit: ({ event, payload }) => {
  localEvents.push({ event, atMs: performance.now(), payload });
  void telemetry.emit(event, payload);
},
```

- [ ] **Step 5: 运行观察钩子测试并提交**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/debugApi.test.ts`

Expected: 2 tests PASS；生产构建中 `window.__RICOCHET_TEST__` 只有在共享测试上下文启用后才挂载。

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/testing/debugApi.ts games/wechat-h5-v2/apps/ricochet-crew/src/main.ts games/wechat-h5-v2/tests/ricochet-crew/integration/debugApi.test.ts
git commit -m "test(ricochet): add read-only AI playtest hooks"
```

### Task 19: 把 Boss、胜负、改造事件和无刷新重玩接入完整五分钟流程

**Files:**
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/run/runMachine.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/game/createRicochetGame.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/fullRun.test.ts`

- [ ] **Step 1: 写入第五次选择进入 Boss、三部位胜利和新 runId 重玩失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createRunMachine } from '../../../apps/ricochet-crew/src/run/runMachine';

const deactivateThreats = (run: ReturnType<typeof createRunMachine>) => {
  run.replaceTargets(
    run.state.targets.map((target) => ({ ...target, active: false, hp: 0 })),
  );
};

describe('full five-room and boss run', () => {
  it('enters boss after five room choices and wins after three parts', () => {
    const run = createRunMachine({ seed: 20260729, heroId: 'tuo', runId: 'run-full' });
    for (let room = 0; room < 5; room += 1) {
      run.launch({ x: 0, y: -1000 }, room * 1000);
      run.finishShot();
      deactivateThreats(run);
      run.clearCurrentRoom();
      run.choose(run.getOffer()[0]!);
    }
    expect(run.state.roomIndex).toBe(5);
    expect(run.state.mode).toBe('aiming');
    expect(run.state.boss?.phase).toBe('shielded');
    run.damageBossPart('armor', 999, false);
    run.damageBossPart('weapon', 999, true);
    run.damageBossPart('core', 999, false);
    expect(run.state.mode).toBe('won');
  });

  it('creates a clean state and new run id without page reload', () => {
    const first = createRunMachine({ seed: 1, heroId: 'tuo', runId: 'run-1' });
    const second = first.replay({ seed: 2, heroId: 'mio', runId: 'run-2' });
    expect(second.state.runId).toBe('run-2');
    expect(second.state.roomIndex).toBe(0);
    expect(second.state.build).toEqual([]);
    expect(second.state.firstInputAtMs).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试并确认 Boss 尚未接入**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/integration/fullRun.test.ts`

Expected: FAIL，首个断言显示第五次选择后 `mode` 不是 `aiming` 或 `boss` 为 `null`。

- [ ] **Step 3: 修改状态机进入 Boss 并同步部位**

在 `runMachine.ts` 导入：

```ts
import { applyBossPartHit, createBossState } from '../content/boss';
```

将 `choose()` 的房间结束分支改为：

```ts
      if (state.roomIndex < rooms.length) {
        state.targets = rooms[state.roomIndex]!.targets.map((target) => ({ ...target }));
        state.mode = 'aiming';
      } else {
        state.boss = createBossState();
        state.targets = Object.values(state.boss.parts).map((target) => ({ ...target }));
        state.mode = 'aiming';
      }
```

在返回对象追加：

```ts
    damageBossPart(
      partId: keyof NonNullable<RicochetRunState['boss']>['parts'],
      damage: number,
      skillHit: boolean,
    ) {
      if (!state.boss || state.roomIndex !== 5) throw new Error('boss is not active');
      const result = applyBossPartHit(state.boss, partId, damage, skillHit);
      state.boss = result.boss;
      state.targets = Object.values(result.boss.parts).map((target) => ({ ...target }));
      if (result.boss.phase === 'defeated') {
        state.mode = 'won';
        state.failureReason = null;
      }
      return result.events;
    },
    replay(next: { seed: number; heroId: HeroId; runId: string }) {
      return createRunMachine(next);
    },
```

- [ ] **Step 4: 在控制器中路由 Boss 命中并发出选择/胜负事件**

在 `createRicochetGame.ts` 的命中循环中，在普通 `resolveShotHit` 前插入：

```ts
      if (hit.colliderId.startsWith('boss-')) {
        const partId =
          hit.colliderId === 'boss-armor'
            ? 'armor'
            : hit.colliderId === 'boss-weapon'
              ? 'weapon'
              : 'core';
        const bossEvents = run.damageBossPart(
          partId,
          24,
          skillEffects.length > 0,
        );
        if (bossEvents.includes('boss-defeated')) {
          emit('run_end', {
            result: 'won',
            hitPart: hit.colliderId,
            roomIndex: 5,
            buildTags: run.state.buildTags,
          });
        }
        continue;
      }
```

用包装函数替换返回对象中的 `choose: run.choose`：

```ts
    choose(modifierId: ModifierId) {
      run.choose(modifierId);
      emit('choice_selected', {
        selectedId: modifierId,
        roomIndex: run.state.roomIndex,
        buildTags: run.state.buildTags,
      });
      if (run.state.mode === 'aiming') {
        world = run.state.roomIndex < 5
          ? worldForRoom()
          : createPhysicsWorld({
              walls: rooms[4]!.walls,
              circles: run.state.targets.map((target) => ({
                id: target.id,
                center: target.position,
                radius: target.radius,
              })),
            });
      }
    },
```

在回合推进后检测失败并只发一次：

```ts
      if (run.state.mode === 'lost') {
        emit('run_end', {
          result: 'lost',
          failureReason: run.state.failureReason,
          roomIndex: run.state.roomIndex,
          buildTags: run.state.buildTags,
        });
      }
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/integration/fullRun.test.ts`

Expected: 2 tests PASS；固定种子完整路径在第五次选择后进入 Boss 并可胜利。

- [ ] **Step 5: 提交完整五分钟流程**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/run/runMachine.ts games/wechat-h5-v2/apps/ricochet-crew/src/game/createRicochetGame.ts games/wechat-h5-v2/tests/ricochet-crew/integration/fullRun.test.ts
git commit -m "feat(ricochet): complete boss victory and replay flow"
```

### Task 20: 接入英雄选择、核心模组、每日补玩、成长页和结算复盘

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/presentation/MetaPanel.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/main.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/style.css`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/metaPanel.test.ts`

- [ ] **Step 1: 写入三英雄锁定、七日挑战和结算再玩失败测试**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMetaPanel } from '../../../apps/ricochet-crew/src/presentation/MetaPanel';
import { createDefaultProgress } from '../../../apps/ricochet-crew/src/run/progression';
import { listDailyChallenges } from '../../../apps/ricochet-crew/src/run/daily';

afterEach(() => document.body.replaceChildren());

describe('meta panel', () => {
  it('shows locked heroes without selling permanent combat power', () => {
    const panel = createMetaPanel(document.body);
    panel.renderHome(createDefaultProgress(), listDailyChallenges(new Date('2026-07-29T12:00:00+08:00')));
    expect(panel.root.textContent).toContain('岩铠·拓');
    expect(panel.root.textContent).toContain('镜羽·澪 · 通关后解锁');
    expect(panel.root.textContent).toContain('最近 7 天');
    expect(panel.root.textContent).not.toMatch(/攻击力|生命值购买|战力礼包/);
  });

  it('offers same-seed retry and a fresh run as distinct actions', () => {
    const onRetry = vi.fn();
    const onFresh = vi.fn();
    const panel = createMetaPanel(document.body, { onRetry, onFresh });
    panel.renderResult({
      result: 'lost',
      summary: 'Boss 核心剩余 18%',
      correction: '向左修正 6.5° 可命中核心',
    });
    panel.retryButton.click();
    panel.freshButton.click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onFresh).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试并确认成长面板缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/metaPanel.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../presentation/MetaPanel`。

- [ ] **Step 3: 实现首页、每日和结算 DOM 面板**

```ts
import { HEROES } from '../content/heroes';
import type { RicochetProgressV1 } from '../run/progression';

export function createMetaPanel(
  host: HTMLElement,
  actions: { onRetry?: () => void; onFresh?: () => void } = {},
) {
  const root = document.createElement('section');
  root.className = 'meta-panel';
  const content = document.createElement('div');
  content.className = 'meta-panel__content';
  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.textContent = '按原种子再试';
  retryButton.addEventListener('click', () => actions.onRetry?.());
  const freshButton = document.createElement('button');
  freshButton.type = 'button';
  freshButton.textContent = '换一局新遗迹';
  freshButton.addEventListener('click', () => actions.onFresh?.());
  root.append(content, retryButton, freshButton);
  host.append(root);

  return {
    root,
    retryButton,
    freshButton,
    renderHome(
      progress: RicochetProgressV1,
      daily: readonly { key: string; seed: number }[],
    ) {
      const heroLines = Object.values(HEROES).map((hero) =>
        progress.unlockedHeroes.includes(hero.id)
          ? hero.name
          : `${hero.name} · 通关后解锁`,
      );
      content.textContent = `${heroLines.join(' / ')}｜最近 7 天：${daily.map((entry) => entry.key).join('、')}`;
      retryButton.hidden = true;
      freshButton.hidden = true;
    },
    renderResult(result: {
      result: 'won' | 'lost';
      summary: string;
      correction: string;
    }) {
      content.textContent = `${result.result === 'won' ? '遗迹核心崩解' : '距离翻盘只差一步'}｜${result.summary}｜${result.correction}`;
      retryButton.hidden = false;
      freshButton.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    show() {
      root.hidden = false;
    },
  };
}
```

- [ ] **Step 4: 在入口中读取每日、选择 run seed、结算写存档并无刷新重玩**

在 `main.ts` 导入：

```ts
import { createMetaPanel } from './presentation/MetaPanel';
import { listDailyChallenges } from './run/daily';
import { applyRunProgress } from './run/progression';
import { buildLastShotRecap } from './run/recap';
import type { HeroId } from './game/contracts';
```

创建 run 工厂并让两个重玩动作复用：

```ts
let activeSeed = testContext.seed ?? crypto.getRandomValues(new Uint32Array(1))[0]!;
let activeHeroId: HeroId = 'tuo';
let activeDailyKey: string | null = null;

const startRun = async (seed: number, heroId: HeroId, replay: boolean) => {
  activeSeed = seed;
  activeHeroId = heroId;
  currentRunId = crypto.randomUUID();
  await Promise.all(bundlesForRoom(0, heroId).map((bundle) => assets.loadGroup(bundle)));
  if (telemetry.snapshot().runId) telemetry.endRun({ reason: 'replay' });
  telemetry.beginRun(currentRunId);
  game = createRicochetGame({
    seed,
    heroId,
    runId: currentRunId,
    now: () => performance.now(),
    emit: ({ event, payload }) => {
      localEvents.push({ event, atMs: performance.now(), payload });
      void telemetry.emit(event, payload);
    },
  });
  meta.hide();
  if (replay) telemetry.emit('replay_start', { seed, heroId });
};

const meta = createMetaPanel(host, {
  onRetry: () => void startRun(activeSeed, activeHeroId, true),
  onFresh: () =>
    void startRun(crypto.getRandomValues(new Uint32Array(1))[0]!, activeHeroId, true),
});
meta.renderHome(progress, listDailyChallenges(new Date()));
```

在每次 render 后检测一次结算：

```ts
let settledRunId: string | null = null;
if (
  game &&
  currentRunId &&
  settledRunId !== currentRunId &&
  (game.snapshot().mode === 'won' || game.snapshot().mode === 'lost')
) {
  settledRunId = currentRunId;
  const state = game.snapshot();
  const nextProgress = applyRunProgress(progress, {
    heroId: state.heroId,
    won: state.mode === 'won',
    maxCombo: Math.max(0, ...state.lastShotTrace.map(() => state.shot?.maxCombo ?? 0)),
    buildTags: state.buildTags,
    dailyKey: activeDailyKey,
  });
  progress = nextProgress;
  void saves.save(nextProgress);
  const missed = state.boss?.parts.core.position ?? { x: 195, y: 220 };
  const recap = state.lastShotTrace.length
    ? buildLastShotRecap(state.lastShotTrace, missed)
    : null;
  meta.show();
  meta.renderResult({
    result: state.mode,
    summary: state.mode === 'won' ? '五房间与遗迹巨像已击破' : `失败原因：${state.failureReason}`,
    correction: recap?.message ?? '下一局优先改变目标与改造组合',
  });
}
```

在 `style.css` 添加 `.meta-panel` 全屏对话层、56px 主按钮、焦点可见轮廓，并保证 360×800 下按钮不超出安全区。

- [ ] **Step 5: 运行成长面板测试、构建并提交**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/metaPanel.test.ts
npm.cmd --prefix games/wechat-h5-v2 run build --workspace @gamehub/h5-ricochet-crew
```

Expected: 2 tests PASS；构建 PASS；结算后不刷新页面即可按原种子或新种子重玩，`runId` 必须变化。

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/presentation/MetaPanel.ts games/wechat-h5-v2/apps/ricochet-crew/src/main.ts games/wechat-h5-v2/apps/ricochet-crew/src/style.css games/wechat-h5-v2/tests/ricochet-crew/integration/metaPanel.test.ts
git commit -m "feat(ricochet): add daily progression and replay UI"
```

### Task 21: 添加改造三选一 UI、轨迹记录和每房间资产切换

**Files:**
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/presentation/ChoicePanel.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/game/createRicochetGame.ts`
- Modify: `games/wechat-h5-v2/apps/ricochet-crew/src/main.ts`
- Test: `games/wechat-h5-v2/tests/ricochet-crew/integration/choiceAndTrace.test.ts`

- [ ] **Step 1: 写入三选一、单次选择和最后轨迹失败测试**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChoicePanel } from '../../../apps/ricochet-crew/src/presentation/ChoicePanel';
import { MODIFIER_CATALOG } from '../../../apps/ricochet-crew/src/content/modifierCatalog';

afterEach(() => document.body.replaceChildren());

describe('choice panel and trace contract', () => {
  it('renders three complete modifier choices and accepts exactly one', () => {
    const onChoose = vi.fn();
    const panel = createChoicePanel(document.body, onChoose);
    const offer = MODIFIER_CATALOG.slice(0, 3);
    panel.show(offer);
    const buttons = panel.root.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    buttons[0]!.click();
    buttons[1]!.click();
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(offer[0]!.id);
  });

  it('describes how each modifier changes the next aiming decision', () => {
    const panel = createChoicePanel(document.body, vi.fn());
    panel.show(MODIFIER_CATALOG.slice(0, 3));
    expect(panel.root.textContent).toContain('优先击破护甲');
  });
});
```

- [ ] **Step 2: 运行测试并确认选择面板缺失**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/choiceAndTrace.test.ts`

Expected: FAIL，错误包含 `Cannot find module .../presentation/ChoicePanel`。

- [ ] **Step 3: 实现锁定一次的三选一面板**

```ts
import type { ModifierDefinition, ModifierId } from '../content/modifierCatalog';

export function createChoicePanel(
  host: HTMLElement,
  onChoose: (id: ModifierId) => void,
) {
  const root = document.createElement('section');
  root.className = 'choice-panel';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'choice-title');
  const title = document.createElement('h2');
  title.id = 'choice-title';
  title.textContent = '选择一项遗迹改造';
  const cards = document.createElement('div');
  cards.className = 'choice-panel__cards';
  root.append(title, cards);
  host.append(root);
  root.hidden = true;

  return {
    root,
    show(offer: readonly ModifierDefinition[]) {
      if (offer.length !== 3) throw new Error('choice panel requires three modifiers');
      let chosen = false;
      cards.replaceChildren(
        ...offer.map((modifier) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.modifierId = modifier.id;
          const name = document.createElement('strong');
          name.textContent = modifier.name;
          const description = document.createElement('span');
          description.textContent = modifier.changesDecision;
          button.append(name, description);
          button.addEventListener('click', () => {
            if (chosen) return;
            chosen = true;
            onChoose(modifier.id);
            root.hidden = true;
          });
          return button;
        }),
      );
      root.hidden = false;
      cards.querySelector<HTMLButtonElement>('button')?.focus();
    },
    hide() {
      root.hidden = true;
    },
  };
}
```

- [ ] **Step 4: 暴露 offer、记录每个物理 tick 的最后一发轨迹并绑定房间切换**

在 `createRicochetGame.ts` 的 `releaseAim()` 发射后重置：

```ts
    run.state.lastShotTrace = [{
      atMs: 0,
      position: { x: 195, y: 748 },
      velocity,
      hitId: null,
    }];
```

在 `fixedUpdate()` 更新物理快照后追加：

```ts
    const elapsedInShotMs = Math.round(
      (8 - run.state.shot.remainingSeconds) * 1000,
    );
    const sampled = elapsedInShotMs % 50 < Math.round(dt * 1000);
    if (sampled && run.state.lastShotTrace.length < 160) {
      run.state.lastShotTrace = [
        ...run.state.lastShotTrace,
        {
          atMs: elapsedInShotMs,
          position: physics.position,
          velocity: physics.velocity,
          hitId: null,
        },
      ];
    }
```

在每个命中后把最后一个采样点改成命中 id：

```ts
      const lastIndex = run.state.lastShotTrace.length - 1;
      if (lastIndex >= 0) {
        const nextTrace = run.state.lastShotTrace.slice();
        nextTrace[lastIndex] = {
          ...nextTrace[lastIndex]!,
          hitId: hit.colliderId,
        };
        run.state.lastShotTrace = nextTrace;
      }
```

在返回对象追加：

```ts
    getOffer: () => run.getOffer(),
```

在 `main.ts` 创建并绑定：

```ts
import { createChoicePanel } from './presentation/ChoicePanel';
import { MODIFIER_CATALOG } from './content/modifierCatalog';

const choicePanel = createChoicePanel(host, (modifierId) => {
  game?.choose(modifierId);
  void audio.play('choice');
  const roomIndex = game?.snapshot().roomIndex ?? 0;
  void Promise.all(
    bundlesForRoom(roomIndex, activeHeroId).map((bundle) => assets.loadGroup(bundle)),
  );
});

let offeredForRoom = -1;
if (game?.snapshot().mode === 'choosing' && offeredForRoom !== game.snapshot().roomIndex) {
  offeredForRoom = game.snapshot().roomIndex;
  const ids = game.getOffer();
  choicePanel.show(
    ids.map((id) => MODIFIER_CATALOG.find((entry) => entry.id === id)!),
  );
  void telemetry.emit('choice_presented', { offerIds: ids });
}
```

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run --environment jsdom tests/ricochet-crew/integration/choiceAndTrace.test.ts`

Expected: 2 tests PASS；每房间恰好出现一次三选一，最后一发轨迹最多 160 个采样点。

- [ ] **Step 5: 提交选择、轨迹与房间加载**

```bash
git add games/wechat-h5-v2/apps/ricochet-crew/src/presentation/ChoicePanel.ts games/wechat-h5-v2/apps/ricochet-crew/src/game/createRicochetGame.ts games/wechat-h5-v2/apps/ricochet-crew/src/main.ts games/wechat-h5-v2/tests/ricochet-crew/integration/choiceAndTrace.test.ts
git commit -m "feat(ricochet): add room choices and shot trace"
```

### Task 22: 覆盖三个视口、真实触摸、固定种子胜负和无刷新重玩

**Files:**
- Create: `games/wechat-h5-v2/tests/ricochet-crew/e2e/ricochet.spec.ts`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/fixtures/win-route-20260729.json`

- [ ] **Step 1: 写入三个竖屏与真实拖拽的 Playwright 测试**

```ts
import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'compact', width: 360, height: 800 },
  { name: 'baseline', width: 390, height: 844 },
  { name: 'large', width: 430, height: 932 },
] as const;

async function dragAim(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y, radiusX: 8, radiusY: 8, force: 1, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: to.x, y: to.y, radiusX: 8, radiusY: 8, force: 1, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

for (const viewport of viewports) {
  test(`${viewport.name} supports real touch aim without overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
    await page.getByRole('button', { name: '进入机械遗迹' }).click();
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await dragAim(
      page,
      { x: box!.x + box!.width * 0.5, y: box!.y + box!.height * 0.88 },
      { x: box!.x + box!.width * 0.37, y: box!.y + box!.height * 0.96 },
    );
    await expect.poll(() =>
      page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot()),
    ).toMatchObject({ mode: 'flying' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
```

- [ ] **Step 2: 运行三个视口触摸测试**

Run: `npm.cmd --prefix games/wechat-h5-v2 run test:e2e -- --project=ricochet --grep "supports real touch aim"`

Expected: 3 tests PASS；不得通过鼠标事件、DOM 直接调用或放宽横向溢出断言替代真实 touch。

- [ ] **Step 3: 写入固定种子胜利路线 fixture 和执行器**

`win-route-20260729.json`：

```json
{
  "seed": 20260729,
  "heroId": "tuo",
  "rooms": [
    { "drag": [195, 748, 145, 808], "skillAtMs": 180, "choice": "blast-chain" },
    { "drag": [195, 748, 126, 796], "skillAtMs": 260, "choice": "blast-barrel-seek" },
    { "drag": [195, 748, 242, 816], "skillAtMs": 320, "choice": "blast-shrapnel" },
    { "drag": [195, 748, 104, 788], "skillAtMs": 210, "choice": "blast-breach-line" },
    { "drag": [195, 748, 268, 802], "skillAtMs": 240, "choice": "blast-overload" }
  ],
  "bossShots": [
    { "drag": [195, 748, 118, 806], "skillAtMs": 220 },
    { "drag": [195, 748, 276, 806], "skillAtMs": 280 },
    { "drag": [195, 748, 154, 816], "skillAtMs": 190 }
  ]
}
```

在 `ricochet.spec.ts` 添加读取 fixture 的执行器；每个房间持续真实发射，直到只读快照进入 `choosing`，再点击精确的 `data-modifier-id`；Boss 按 `bossShots` 循环，直到 `won` 或 360 秒超时。不得通过脚本修改游戏状态。

- [ ] **Step 4: 写入固定种子失败、胜利、重玩和事件断言**

```ts
test('fixed routes cover payoff, choice, loss, win and replay', async ({ page }) => {
  test.slow();
  test.setTimeout(420_000);
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260730');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  await dragAim(
    page,
    { x: box!.x + box!.width * 0.5, y: box!.y + box!.height * 0.88 },
    { x: box!.x + box!.width * 0.5, y: box!.y + box!.height * 0.95 },
  );
  await expect.poll(
    () => page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot()),
    { timeout: 120_000 },
  ).toMatchObject({ mode: 'lost', failureReason: 'frontline-breached' });
  const firstRun = await page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot());
  await page.getByRole('button', { name: '换一局新遗迹' }).click();
  await expect.poll(() =>
    page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot()),
  ).toMatchObject({ mode: 'aiming', roomIndex: 0, build: [] });
  const secondRun = await page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot());
  expect((secondRun as { runId: string }).runId).not.toBe((firstRun as { runId: string }).runId);
});
```

再按 `win-route-20260729.json` 执行完整胜利，断言：

```ts
await expect.poll(
  () => page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot()),
  { timeout: 360_000 },
).toMatchObject({
  mode: 'won',
  roomIndex: 5,
  boss: { phase: 'defeated' },
});
const report = await page.evaluate(() => window.__RICOCHET_TEST__?.getReport());
expect(report).toMatchObject({ result: 'won' });
```

- [ ] **Step 5: 运行完整 E2E 并提交固定路径**

Run: `npm.cmd --prefix games/wechat-h5-v2 run test:e2e -- --project=ricochet`

Expected: 三视口触摸 PASS；固定种子胜利 PASS；固定种子失败 PASS；无刷新重玩 PASS；普通入口、直接 URL 与 `test=1` 入口均 PASS；页面错误和控制台错误为 0；非同源请求为 0。

```bash
git add games/wechat-h5-v2/tests/ricochet-crew/e2e games/wechat-h5-v2/tests/ricochet-crew/fixtures/win-route-20260729.json
git commit -m "test(ricochet): verify touch win loss and replay flows"
```

### Task 23: 验证生命周期、存档恢复、资源失败、WebGL 丢失和测试门禁

**Files:**
- Create: `games/wechat-h5-v2/tests/ricochet-crew/e2e/resilience.spec.ts`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/integration/saveIsolation.test.ts`

- [ ] **Step 1: 写入独立存档 key、损坏恢复和禁止敏感字段测试**

```ts
import { describe, expect, it } from 'vitest';
import {
  applyRunProgress,
  createDefaultProgress,
} from '../../../apps/ricochet-crew/src/run/progression';

describe('ricochet save payload isolation', () => {
  it('serializes only ricochet progression fields', () => {
    const payload = applyRunProgress(createDefaultProgress(), {
      heroId: 'tuo',
      won: true,
      maxCombo: 20,
      buildTags: { blast: 3, split: 0, recall: 0 },
      dailyKey: '2026-07-29',
    });
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/openid|session_key|token|payment|phone/i);
    expect(Object.keys(payload).sort()).toEqual([
      'bestCombo',
      'completedDailyKeys',
      'mastery',
      'runsCompleted',
      'schemaVersion',
      'unlockedCores',
      'unlockedHeroes',
    ]);
  });
});
```

- [ ] **Step 2: 运行存档 payload 测试**

Run: `npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/integration/saveIsolation.test.ts`

Expected: 1 test PASS；游戏 payload 不包含共享信封字段或敏感凭证。

- [ ] **Step 3: 写入页面隐藏、恢复需主动继续和音频暂停 E2E**

```ts
import { expect, test } from '@playwright/test';

test('page hiding freezes physics and requires active resume', async ({ page }) => {
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before = await page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot());
  expect(after).toEqual(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: /继续/ })).toBeVisible();
});
```

同文件追加 `webglcontextlost`：

```ts
test('WebGL loss pauses and rebuilds without advancing combat', async ({ page }) => {
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  await page.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByRole('status')).toContainText('正在恢复画面');
  await page.locator('canvas').dispatchEvent('webglcontextrestored');
  await expect(page.getByRole('button', { name: /继续/ })).toBeVisible();
});
```

- [ ] **Step 4: 写入资产失败、存档损坏与普通入口测试参数隔离 E2E**

```ts
test('asset failure retries once then shows retry and back actions', async ({ page }) => {
  let failures = 0;
  await page.route('**/assets/ricochet-crew/**', async (route) => {
    if (route.request().url().endsWith('ruin-enemies.json') && failures < 2) {
      failures += 1;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  await expect(page.getByRole('alert')).toContainText('资源加载失败');
  await expect(page.getByRole('button', { name: '重试' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回游戏大厅' })).toBeVisible();
});

test('normal entry ignores test seed and exposes no debug API', async ({ page }) => {
  await page.goto('/apps/ricochet-crew/?seed=1&speed=100&mute=1');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  expect(await page.evaluate(() => window.__RICOCHET_TEST__)).toBeUndefined();
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  expect(saved).not.toContain('seed=1');
  expect(saved).not.toContain('speed=100');
});
```

为损坏存档预置主 key 为非法 JSON、备份 key 为有效共享信封；刷新后断言出现“已恢复最近存档”状态播报、发出 `save_recovered`，且只恢复 `ricochet-crew` key，不读写另外两款游戏 key。

- [ ] **Step 5: 运行韧性套件并提交**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run tests/ricochet-crew/integration/saveIsolation.test.ts
npm.cmd --prefix games/wechat-h5-v2 run test:e2e -- --project=ricochet --grep "page hiding|WebGL loss|asset failure|normal entry|corrupt save"
```

Expected: 存档 1 test PASS；五类韧性 E2E PASS；暂停期间局时变化不超过一个固定步长；所有错误态提供可操作恢复路径。

```bash
git add games/wechat-h5-v2/tests/ricochet-crew/e2e/resilience.spec.ts games/wechat-h5-v2/tests/ricochet-crew/integration/saveIsolation.test.ts
git commit -m "test(ricochet): verify lifecycle and recovery paths"
```

### Task 24: 建立帧时、对象池、纹理、首屏和二十分钟长测

**Files:**
- Create: `games/wechat-h5-v2/tests/ricochet-crew/performance/profile.spec.ts`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/performance/longrun.spec.ts`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/performance/budgets.json`

- [ ] **Step 1: 写入明确的性能预算文件**

```json
{
  "firstInteractiveMs4G": 5000,
  "baselineRafP95Ms": 20,
  "lowTierRafP95Ms": 33,
  "maxLongTasks20Min": 4,
  "maxTextureMemoryBytes": 83886080,
  "maxActiveTargets": 80,
  "maxActiveProjectiles": 16,
  "maxListenerGrowth": 0,
  "maxDomNodeGrowth": 4,
  "maxHeapGrowthRatioAfterGc": 1.2
}
```

- [ ] **Step 2: 写入首屏、基准和低端档性能采样**

```ts
import { expect, test } from '@playwright/test';
import budgets from './budgets.json';

const percentile = (values: number[], p: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * p))]!;
};

test('baseline fight meets frame and object budgets', async ({ page }) => {
  await page.addInitScript(() => {
    const samples: number[] = [];
    let previous = performance.now();
    const sample = (now: number) => {
      samples.push(now - previous);
      previous = now;
      if (samples.length < 7200) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    Object.defineProperty(window, '__RAF_SAMPLES__', { value: samples });
  });
  const started = performance.now();
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  expect(performance.now() - started).toBeLessThan(budgets.firstInteractiveMs4G);
  await page.waitForTimeout(30_000);
  const samples = await page.evaluate(() => (window as unknown as { __RAF_SAMPLES__: number[] }).__RAF_SAMPLES__);
  expect(percentile(samples.slice(120), 0.95)).toBeLessThanOrEqual(budgets.baselineRafP95Ms);
  const snapshot = await page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot());
  expect((snapshot as { targets: unknown[] }).targets.length).toBeLessThanOrEqual(budgets.maxActiveTargets);
});
```

低端档测试通过共享性能注入设置 `tier: low`、CPU throttling 4×、DPR 1，断言 P95 ≤33ms、粒子缩减、后处理关闭、规则与目标标签仍存在。

- [ ] **Step 3: 运行短性能测试并保存机器 JSON**

Run: `npm.cmd --prefix games/wechat-h5-v2 run test:performance -- --project=ricochet --grep "meets frame|low tier"`

Expected: `test-results/wechat-h5-v2/ricochet-crew/performance.json` 存在；包含设备、浏览器、commit、P50/P95/max、Long Task、目标数、投射物数、DPR 与性能档；基准和低端预算 PASS。

- [ ] **Step 4: 写入二十分钟自然速度三局长测**

```ts
test('twenty minute play has bounded heap texture DOM listener and pools', async ({ page }) => {
  test.slow();
  test.setTimeout(1_500_000);
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  const samples: Array<{
    minute: number;
    heap: number;
    dom: number;
    textures: number;
    listeners: number;
    longTasks: number;
  }> = [];
  for (let minute = 0; minute <= 20; minute += 1) {
    if (minute > 0) await page.waitForTimeout(60_000);
    samples.push(await page.evaluate((currentMinute) => ({
      minute: currentMinute,
      heap: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
      dom: document.getElementsByTagName('*').length,
      textures: window.__H5_RUNTIME_METRICS__.textureCount,
      listeners: window.__H5_RUNTIME_METRICS__.listenerCount,
      longTasks: window.__H5_RUNTIME_METRICS__.longTaskCount,
    }), minute));
  }
  expect(samples.at(-1)!.dom - samples[0]!.dom).toBeLessThanOrEqual(budgets.maxDomNodeGrowth);
  expect(samples.at(-1)!.listeners - samples[0]!.listeners).toBeLessThanOrEqual(budgets.maxListenerGrowth);
  expect(samples.at(-1)!.textures).toBeLessThanOrEqual(samples[0]!.textures + 6);
  await test.info().attach('longrun.json', {
    body: Buffer.from(JSON.stringify(samples, null, 2)),
    contentType: 'application/json',
  });
});
```

长测必须使用真实触摸脚本持续打完至少三局；不得只停留在开始页或用强制结果接口制造局数。

- [ ] **Step 5: 运行长测并提交性能门禁**

Run: `npm.cmd --prefix games/wechat-h5-v2 run test:longrun -- --project=ricochet`

Expected: 20 分钟完成；至少三局；页面重载 0；纹理、监听器和 DOM 无单调增长；对象池不超过上限；报告保存到 `test-results/wechat-h5-v2/ricochet-crew/longrun.json`。

```bash
git add games/wechat-h5-v2/tests/ricochet-crew/performance
git commit -m "test(ricochet): add performance and longrun gates"
```

### Task 25: 建立高保真视觉、响应式和无障碍证据

**Files:**
- Create: `games/wechat-h5-v2/tests/ricochet-crew/visual/ricochet.visual.spec.ts`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/visual/visual-checklist.json`
- Create: `games/wechat-h5-v2/tests/ricochet-crew/e2e/accessibility.spec.ts`

- [ ] **Step 1: 写入七个必须截图的视觉状态清单**

```json
{
  "states": [
    "boot-cover",
    "first-aim",
    "five-combo-payoff",
    "modifier-choice",
    "boss-climax",
    "victory",
    "failure-recap",
    "meta-progression"
  ],
  "modes": ["standard", "reduced-motion", "low-tier"],
  "viewports": ["360x800", "390x844", "430x932"],
  "requirements": {
    "finalCharacterAtlases": true,
    "threeLayerParallax": true,
    "effectAlignedWithCollision": true,
    "corePlayAreaUnobscured": true,
    "nonColorStateCue": true
  }
}
```

- [ ] **Step 2: 写入视觉截图与状态到达断言**

```ts
import { expect, test } from '@playwright/test';
import checklist from './visual-checklist.json';

test('captures required high fidelity states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await expect(page).toHaveScreenshot('boot-cover.png', { animations: 'disabled' });
  await page.getByRole('button', { name: '进入机械遗迹' }).click();
  await expect.poll(() =>
    page.evaluate(() => window.__RICOCHET_TEST__?.getSnapshot()),
  ).toMatchObject({ mode: 'aiming' });
  await expect(page).toHaveScreenshot('first-aim.png', { animations: 'disabled' });
  expect(checklist.states).toContain('boss-climax');
});
```

使用固定种子真实触摸路线到达五连击、改造、Boss、胜利与失败；每个状态先断言只读快照，再截图。标准、减少动态和低端档均必须截取；360×800、390×844、430×932 至少各覆盖启动、战斗和结算。

- [ ] **Step 3: 运行视觉测试并由证据专员逐图判定**

Run: `npm.cmd --prefix games/wechat-h5-v2 run test:visual -- --project=ricochet`

Expected: 所有状态截图生成；像素基线无意外差异；证据专员逐图确认角色为最终图集、三层场景成立、特效与碰撞对齐、HUD 不遮挡、三种性能/动态模式信息等价。仅存在资源文件不计通过。

- [ ] **Step 4: 写入焦点、状态播报、44px、非颜色提示和 200% 缩放测试**

```ts
import { expect, test } from '@playwright/test';

test('keyboard focus, status announcements and touch targets remain usable', async ({ page }) => {
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  const start = page.getByRole('button', { name: '进入机械遗迹' });
  await start.focus();
  await expect(start).toBeFocused();
  const box = await start.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await start.press('Enter');
  await expect(page.getByRole('status')).toBeAttached();
  await expect(page.locator('[data-state-cue="boss-part"]')).toHaveAttribute('data-shape');
});

test('200 percent zoom keeps controls and result reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apps/ricochet-crew/?test=1&seed=20260729');
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await expect(page.getByRole('button', { name: '进入机械遗迹' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
```

追加颜色对比、减少动态、静音、焦点圈、对话层 Tab 循环、胜负播报和恢复后焦点回归断言。

- [ ] **Step 5: 运行视觉与无障碍套件并提交**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 run test:visual -- --project=ricochet
npm.cmd --prefix games/wechat-h5-v2 run test:e2e -- --project=ricochet --grep "focus|zoom|reduced motion|mute|dialog"
```

Expected: 视觉状态清单全覆盖；三视口无裁切；关键触控目标 ≥44×44；减少动态和低性能档仍可理解；200% 缩放若 Canvas 本身无法完全重排，必须保留可操作 DOM 控件、状态文本和退出路径，并在证据中诚实标为已知限制而非伪造 PASS。

```bash
git add games/wechat-h5-v2/tests/ricochet-crew/visual games/wechat-h5-v2/tests/ricochet-crew/e2e/accessibility.spec.ts
git commit -m "test(ricochet): add visual and accessibility evidence"
```
