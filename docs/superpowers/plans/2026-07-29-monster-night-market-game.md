# 《怪兽夜市》Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一款可由微信小程序 `web-view` 承载、竖屏触控、单局 4–5 分钟且可连续体验至少三局的《怪兽夜市》高保真 H5 垂直成品，并用自动化、AI 试玩和人工盲测证据证明它不是盲滑换皮消除。

**Architecture:** 游戏层采用“纯数据棋盘与规则内核 → 输入事务与局内状态机 → PixiJS 表现层”的单向依赖；求解器、固定种子、事件和测试钩子均复用同一套生产规则，不另写胜利捷径。启动、生命周期、音频、资源、存档、遥测、无障碍与测试壳依赖共享运行时计划 `docs/superpowers/plans/2026-07-29-wechat-h5-v2-runtime-art-pipeline.md`，本计划只实现 `apps/monster-night-market` 的玩法、内容、表现和验收，不复制共享底座。

**Tech Stack:** TypeScript 5、Vite、PixiJS 8、Vitest、Playwright、`@gamehub/h5-contracts`、`@gamehub/h5-runtime`、`@gamehub/h5-input`、`@gamehub/h5-audio`、`@gamehub/h5-assets`、`@gamehub/h5-save`、`@gamehub/h5-telemetry`、`@gamehub/h5-accessibility`、`@gamehub/h5-testing`

---

## 前置依赖与边界

执行本计划前，共享运行时计划必须已经提供并通过测试：

```ts
import type { GameRuntime, RuntimeSnapshot } from "@gamehub/h5-runtime";
import { createGameRuntime } from "@gamehub/h5-runtime";
import type {
  AxisLock,
  InputController,
  PointerSample,
  SwipeIntent,
} from "@gamehub/h5-input";
import { createInputController } from "@gamehub/h5-input";
import type { AssetLoader, AssetManifest } from "@gamehub/h5-assets";
import { createAssetLoader } from "@gamehub/h5-assets";
import type { SaveAdapter, SaveStore } from "@gamehub/h5-save";
import { createSaveStore } from "@gamehub/h5-save";
import type {
  TelemetryClient,
  TelemetryTransport,
} from "@gamehub/h5-telemetry";
import { createTelemetryClient } from "@gamehub/h5-telemetry";
import type {
  SeededRandom,
  TestHarness,
  TestHookRegistry,
} from "@gamehub/h5-testing";
import { createTestHarness } from "@gamehub/h5-testing";
```

先运行：

```bash
npm.cmd --prefix games/wechat-h5-v2 ci
npm.cmd --prefix games/wechat-h5-v2 run test
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

预期：共享包测试全部 `PASS`，TypeScript 零错误；若公开导出的签名与上方名称不一致，先修正共享计划的实现，不得在夜市应用中增加兼容包装层。

游戏内禁止反向修改 `packages/*`。本计划所有 Git 提交均使用精确路径，避免把工作区中其他人的未提交文件带入提交。

## 文件结构

```text
games/wechat-h5-v2/apps/monster-night-market/
├─ index.html                              # 独立 H5 入口
├─ package.json                            # 应用脚本与依赖
├─ tsconfig.json                           # 应用 TypeScript 配置
├─ vite.config.ts                          # Vite 构建与相对资源路径
├─ public/assets/monster-night-market/
│  ├─ asset-catalog.json                   # 运行时资源 ID、批次和预算
│  ├─ provenance.json                      # 生成提示词、日期、用途、哈希、人工修订
│  ├─ cover.webp
│  ├─ scene/*.webp
│  ├─ atlas/*.json
│  ├─ atlas/*.webp
│  └─ audio/*.{ogg,m4a}
├─ src/
│  ├─ main.ts                              # 只负责装配共享服务和应用
│  ├─ styles.css                           # 竖屏、安全区和 touch-action
│  ├─ app/createNightMarketApp.ts          # 应用生命周期与场景路由
│  ├─ model/types.ts                       # 稳定领域类型
│  ├─ model/content.ts                     # 8 食材/12 配方/8 顾客/3 摊位/12 改造
│  ├─ board/board.ts                       # 4×4 不可变棋盘与循环位移
│  ├─ board/solver.ts                      # 可达订单 BFS 与生成门禁
│  ├─ input/swipeTransaction.ts            # 10px 锁轴、预演、单缓存输入
│  ├─ rules/recipeEngine.ts                # 配方匹配和替代规则
│  ├─ rules/orderEngine.ts                 # 普通单、共享盘和 VIP 顺序单
│  ├─ rules/stallRules.ts                  # 烧烤、甜品、火锅规则
│  ├─ run/runMachine.ts                    # 4–5 分钟营业状态机与连灶
│  ├─ tutorial/firstOrder.ts               # 首单固定局面和教学门禁
│  ├─ meta/nightMarketSave.ts              # 规则侧移成长、图鉴和结算
│  ├─ daily/dailyChallenge.ts              # 当日及最近七天固定种子
│  ├─ telemetry/nightMarketEvents.ts       # 夜市事件和盲滑判定
│  ├─ render/assetCatalog.ts               # 类型化高保真资产目录
│  ├─ render/NightMarketScene.ts            # Pixi 场景、棋盘、顾客、HUD
│  ├─ render/animations.ts                 # 位移、出餐、连灶、庆典时序
│  └─ testing/installNightMarketHooks.ts    # 仅 test=1 的可观测测试钩子
├─ tests/
│  ├─ unit/*.test.ts
│  ├─ integration/*.test.ts
│  └─ e2e/*.spec.ts
└─ test-results/                           # 截图、trace、性能和 AI 试玩报告
```

## 统一领域契约

以下类型由 Task 1 创建，后续任务不得改名：

```ts
export const BOARD_SIZE = 4 as const;
export type IngredientId =
  | "chili" | "tofu" | "mushroom" | "lotus"
  | "fish" | "riceCake" | "ice" | "broth";
export type RecipeId =
  | "emberTofu" | "mushroomSkewer" | "lotusIce"
  | "fishBroth" | "spicyRiceCake" | "frozenTofu"
  | "doubleSkewer" | "borrowedFireSoup" | "coldLotusCup"
  | "sharedHotpot" | "vipTwinDish" | "midnightFeast";
export type CustomerId =
  | "fireCub" | "iceHare" | "lanternFox" | "stoneOgre"
  | "cloudCrane" | "riverImp" | "moonCat" | "gluttonKing";
export type StallId = "grill" | "dessert" | "hotpot";
export type UpgradeId =
  | "borrowFire" | "crossFlavor" | "coldStorage" | "rushOrder"
  | "sharedPlate" | "emberEcho" | "sweetEncore" | "brothReserve"
  | "patientQueue" | "doublePrep" | "festivalSpark" | "cleanCounter";
export type Axis = "row" | "column";
export type ShiftDirection = "left" | "right" | "up" | "down";
export interface Cell { readonly ingredient: IngredientId; readonly frozen: number; }
export type Board = readonly (readonly Cell[])[];
export interface ShiftAction {
  readonly axis: Axis;
  readonly index: 0 | 1 | 2 | 3;
  readonly direction: ShiftDirection;
}
export interface Order {
  readonly id: string;
  readonly customerId: CustomerId;
  readonly recipeIds: readonly RecipeId[];
  readonly mode: "any" | "sequence" | "shared";
  readonly expiresAfterMoves: number;
}
export interface ShiftPreview {
  readonly action: ShiftAction;
  readonly board: Board;
  readonly completedOrderIds: readonly string[];
  readonly completedRecipeIds: readonly RecipeId[];
}
```

### Task 1: 建立应用包、领域类型和 4×4 循环位移

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/tsconfig.json`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/model/types.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/board/board.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/board.test.ts`

- [ ] **Step 1: 写循环移动的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { createBoard, shiftBoard } from "../../src/board/board";

describe("shiftBoard", () => {
  it("把整行右移一格并从另一侧循环进入", () => {
    const board = createBoard([
      ["chili", "tofu", "mushroom", "lotus"],
      ["fish", "riceCake", "ice", "broth"],
      ["tofu", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "chili"],
    ]);
    const next = shiftBoard(board, { axis: "row", index: 0, direction: "right" });
    expect(next[0].map((cell) => cell.ingredient)).toEqual([
      "lotus", "chili", "tofu", "mushroom",
    ]);
    expect(board[0][0].ingredient).toBe("chili");
  });

  it("把整列上移一格且被冻结格仍随行列移动", () => {
    const board = createBoard([
      ["chili", "tofu", "mushroom", "lotus"],
      ["fish", "riceCake", "ice", "broth"],
      ["tofu", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "chili"],
    ]);
    const next = shiftBoard(board, { axis: "column", index: 2, direction: "up" });
    expect(next.map((row) => row[2].ingredient)).toEqual([
      "ice", "lotus", "broth", "mushroom",
    ]);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/board.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/board/board'`。

- [ ] **Step 3: 核对共享计划已创建的应用包，再创建领域类型（2–5 分钟）**

先核对 `apps/monster-night-market/package.json` 与共享计划完全一致；该文件由共享计划创建，本计划不改写。预期关键内容为：

```json
{
  "name": "@gamehub/h5-monster-night-market",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@gamehub/h5-accessibility": "0.1.0",
    "@gamehub/h5-assets": "0.1.0",
    "@gamehub/h5-audio": "0.1.0",
    "@gamehub/h5-contracts": "0.1.0",
    "@gamehub/h5-input": "0.1.0",
    "@gamehub/h5-runtime": "0.1.0",
    "@gamehub/h5-save": "0.1.0",
    "@gamehub/h5-telemetry": "0.1.0",
    "@gamehub/h5-testing": "0.1.0",
    "pixi.js": "8.9.2"
  }
}
```

`tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": ".",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vite.config.ts"]
}
```

`src/model/types.ts` 使用“统一领域契约”中的完整代码，并在末尾增加：

```ts
export interface RecipeDefinition {
  readonly id: RecipeId;
  readonly ingredients: readonly IngredientId[];
  readonly arrangement: "adjacent" | "line" | "ordered";
  readonly stall: StallId;
}
export interface CustomerDefinition {
  readonly id: CustomerId;
  readonly patienceMoves: number;
  readonly preferredStall: StallId;
}
export interface StallDefinition {
  readonly id: StallId;
  readonly rule: "adjacentBonus" | "frozenBonus" | "reserveBroth";
}
export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly rule:
    | "substituteFire" | "extraOrder" | "freezeNeighbor" | "orderedVip"
    | "shareStep" | "repeatFire" | "repeatSweet" | "keepBroth"
    | "addPatience" | "doublePreview" | "festivalMeter" | "clearFreeze";
}
```

- [ ] **Step 4: 实现不可变棋盘和严格动作校验（2–5 分钟）**

`src/board/board.ts`：

```ts
import {
  BOARD_SIZE,
  type Board,
  type Cell,
  type IngredientId,
  type ShiftAction,
} from "../model/types";

const VALID_ROWS = new Set([0, 1, 2, 3]);

export function createBoard(rows: readonly (readonly IngredientId[])[]): Board {
  if (rows.length !== BOARD_SIZE || rows.some((row) => row.length !== BOARD_SIZE)) {
    throw new RangeError("Night Market board must be exactly 4x4");
  }
  return rows.map((row) =>
    row.map((ingredient): Cell => ({ ingredient, frozen: 0 })),
  );
}

export function cloneBoard(board: Board): Cell[][] {
  assertBoard(board);
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function assertBoard(board: Board): void {
  if (board.length !== BOARD_SIZE || board.some((row) => row.length !== BOARD_SIZE)) {
    throw new RangeError("Night Market board must be exactly 4x4");
  }
}

export function shiftBoard(board: Board, action: ShiftAction): Board {
  assertBoard(board);
  if (!VALID_ROWS.has(action.index)) throw new RangeError("Shift index must be 0..3");
  if (action.axis === "row" && action.direction !== "left" && action.direction !== "right") {
    throw new TypeError("Row shift direction must be left or right");
  }
  if (action.axis === "column" && action.direction !== "up" && action.direction !== "down") {
    throw new TypeError("Column shift direction must be up or down");
  }
  const next = cloneBoard(board);
  const line = action.axis === "row"
    ? next[action.index].map((cell) => ({ ...cell }))
    : next.map((row) => ({ ...row[action.index] }));
  const forward = action.direction === "right" || action.direction === "down";
  const moved = forward
    ? [line[line.length - 1], ...line.slice(0, -1)]
    : [...line.slice(1), line[0]];
  if (action.axis === "row") next[action.index] = moved;
  else moved.forEach((cell, row) => { next[row][action.index] = cell; });
  return next;
}

export function boardKey(board: Board): string {
  assertBoard(board);
  return board
    .flat()
    .map((cell) => `${cell.ingredient}:${cell.frozen}`)
    .join("|");
}
```

- [ ] **Step 5: 运行单测和类型检查（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/board.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

Expected: `2 passed`；TypeScript 零错误。

- [ ] **Step 6: 精确提交棋盘内核（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/tsconfig.json games/wechat-h5-v2/apps/monster-night-market/src/model/types.ts games/wechat-h5-v2/apps/monster-night-market/src/board/board.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/board.test.ts
git commit -m "feat(night-market): add immutable rotating board"
```

Expected: 新提交只包含上述 5 个文件。

### Task 2: 实现 10px 锁轴、幽灵预演与单输入缓存事务

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/input/swipeTransaction.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/swipeTransaction.test.ts`

- [ ] **Step 1: 写锁轴、预演和缓存上限的失败测试（2–5 分钟）**

```ts
import { describe, expect, it, vi } from "vitest";
import { SwipeTransactionQueue } from "../../src/input/swipeTransaction";

describe("SwipeTransactionQueue", () => {
  it("移动不足 10px 不锁轴，达到阈值后按主方向锁轴", () => {
    const queue = new SwipeTransactionQueue({ animate: vi.fn() });
    queue.begin({ pointerId: 1, x: 50, y: 100, at: 0 }, 2);
    expect(queue.move({ pointerId: 1, x: 58, y: 105, at: 30 })).toBeNull();
    expect(queue.move({ pointerId: 1, x: 61, y: 105, at: 60 })?.action).toEqual({
      axis: "row", index: 2, direction: "right",
    });
  });

  it("动画期间只保留最后一个合法输入", async () => {
    let finish!: () => void;
    const animate = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const committed: string[] = [];
    const queue = new SwipeTransactionQueue({ animate });
    queue.setCommitHandler((preview) => committed.push(JSON.stringify(preview.action)));
    queue.enqueue({ action: { axis: "row", index: 0, direction: "left" }, board: [], completedOrderIds: [], completedRecipeIds: [] });
    queue.enqueue({ action: { axis: "row", index: 1, direction: "right" }, board: [], completedOrderIds: [], completedRecipeIds: [] });
    queue.enqueue({ action: { axis: "column", index: 3, direction: "down" }, board: [], completedOrderIds: [], completedRecipeIds: [] });
    expect(queue.pendingCount).toBe(1);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(committed).toHaveLength(2);
    expect(committed[1]).toContain("\"column\"");
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/swipeTransaction.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/input/swipeTransaction'`。

- [ ] **Step 3: 实现手势事务状态和幽灵预演（2–5 分钟）**

`src/input/swipeTransaction.ts`：

```ts
import type { PointerSample } from "@gamehub/h5-input";
import type { ShiftAction, ShiftPreview } from "../model/types";

interface LockedDragPreview {
  readonly axisLock: "horizontal" | "vertical";
  readonly delta: number;
  readonly action: ShiftAction;
}

interface ActiveGesture {
  readonly start: PointerSample;
  readonly lineIndex: 0 | 1 | 2 | 3;
  locked: "horizontal" | "vertical" | null;
}

interface QueueDeps {
  readonly animate: (preview: ShiftPreview) => Promise<void>;
}

export class SwipeTransactionQueue {
  private active: ActiveGesture | null = null;
  private animating = false;
  private pending: ShiftPreview | null = null;
  private onCommit: (preview: ShiftPreview) => void = () => {};

  constructor(private readonly deps: QueueDeps) {}

  get pendingCount(): number {
    return this.pending ? 1 : 0;
  }

  setCommitHandler(handler: (preview: ShiftPreview) => void): void {
    this.onCommit = handler;
  }

  begin(sample: PointerSample, lineIndex: 0 | 1 | 2 | 3): void {
    this.active = { start: sample, lineIndex, locked: null };
  }

  move(sample: PointerSample): LockedDragPreview | null {
    if (!this.active || sample.pointerId !== this.active.start.pointerId) return null;
    const dx = sample.x - this.active.start.x;
    const dy = sample.y - this.active.start.y;
    if (!this.active.locked && Math.hypot(dx, dy) < 10) return null;
    this.active.locked ??= Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
    const horizontal = this.active.locked === "horizontal";
    const action: ShiftAction = horizontal
      ? {
          axis: "row",
          index: this.active.lineIndex,
          direction: dx >= 0 ? "right" : "left",
        }
      : {
          axis: "column",
          index: this.active.lineIndex,
          direction: dy >= 0 ? "down" : "up",
        };
    return {
      axisLock: horizontal ? "horizontal" : "vertical",
      delta: horizontal ? dx : dy,
      action,
    };
  }

  end(): void {
    this.active = null;
  }

  enqueue(preview: ShiftPreview): void {
    if (this.animating) {
      this.pending = preview;
      return;
    }
    void this.consume(preview);
  }

  private async consume(preview: ShiftPreview): Promise<void> {
    this.animating = true;
    this.onCommit(preview);
    await this.deps.animate(preview);
    this.animating = false;
    const next = this.pending;
    this.pending = null;
    if (next) await this.consume(next);
  }
}
```

- [ ] **Step 4: 接入共享输入类型并验证页面滚动不参与手势（2–5 分钟）**

在测试末尾增加：

```ts
it("锁轴后保持同一轴，斜向回摆不会改轴", () => {
  const queue = new SwipeTransactionQueue({ animate: vi.fn() });
  queue.begin({ pointerId: 9, x: 20, y: 20, at: 0 }, 1);
  expect(queue.move({ pointerId: 9, x: 32, y: 22, at: 16 })?.axisLock).toBe("horizontal");
  expect(queue.move({ pointerId: 9, x: 33, y: 80, at: 32 })?.axisLock).toBe("horizontal");
});
```

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/swipeTransaction.test.ts
```

Expected: `3 passed`。

- [ ] **Step 5: 精确提交输入事务（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/input/swipeTransaction.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/swipeTransaction.test.ts
git commit -m "feat(night-market): lock swipe axis and queue one move"
```

Expected: 新提交只包含输入事务及其测试。

### Task 3: 建立配方匹配内核和盘面 BFS 求解器

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/rules/recipeEngine.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/board/solver.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/solver.test.ts`

- [ ] **Step 1: 写可达、不可达和确定性求解的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { createBoard } from "../../src/board/board";
import { findShortestPlan } from "../../src/board/solver";
import type { RecipeDefinition } from "../../src/model/types";

const emberTofu: RecipeDefinition = {
  id: "emberTofu",
  ingredients: ["tofu", "chili"],
  arrangement: "ordered",
  stall: "grill",
};

describe("findShortestPlan", () => {
  it("找到首单唯一的一步右移解", () => {
    const board = createBoard([
      ["chili", "mushroom", "lotus", "tofu"],
      ["fish", "riceCake", "ice", "broth"],
      ["mushroom", "lotus", "fish", "riceCake"],
      ["ice", "broth", "chili", "tofu"],
    ]);
    expect(findShortestPlan(board, emberTofu, 1)).toEqual([
      { axis: "row", index: 0, direction: "right" },
    ]);
  });

  it("深度不足时返回 null，且同一输入总是返回同一路径", () => {
    const board = createBoard([
      ["chili", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "mushroom"],
      ["lotus", "fish", "riceCake", "ice"],
      ["broth", "mushroom", "lotus", "tofu"],
    ]);
    expect(findShortestPlan(board, emberTofu, 0)).toBeNull();
    expect(findShortestPlan(board, emberTofu, 4)).toEqual(
      findShortestPlan(board, emberTofu, 4),
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/solver.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/board/solver'`。

- [ ] **Step 3: 实现不含表现副作用的配方匹配（2–5 分钟）**

`src/rules/recipeEngine.ts`：

```ts
import type { Board, IngredientId, RecipeDefinition } from "../model/types";

function contiguousWindows(board: Board, size: number): IngredientId[][] {
  const lines: IngredientId[][] = [
    ...board.map((row) => row.map((cell) => cell.ingredient)),
    ...[0, 1, 2, 3].map((column) => board.map((row) => row[column].ingredient)),
  ];
  return lines.flatMap((line) =>
    Array.from({ length: line.length - size + 1 }, (_, index) =>
      line.slice(index, index + size),
    ),
  );
}

function sameMultiset(left: readonly IngredientId[], right: readonly IngredientId[]): boolean {
  return [...left].sort().join("|") === [...right].sort().join("|");
}

export function matchesRecipe(board: Board, recipe: RecipeDefinition): boolean {
  const windows = contiguousWindows(board, recipe.ingredients.length);
  if (recipe.arrangement === "ordered") {
    return windows.some((window) =>
      window.every((ingredient, index) => ingredient === recipe.ingredients[index]),
    );
  }
  if (recipe.arrangement === "adjacent" || recipe.arrangement === "line") {
    return windows.some((window) => sameMultiset(window, recipe.ingredients));
  }
  return false;
}
```

- [ ] **Step 4: 实现有访问去重和固定动作顺序的 BFS（2–5 分钟）**

`src/board/solver.ts`：

```ts
import { boardKey, shiftBoard } from "./board";
import type { Board, RecipeDefinition, ShiftAction } from "../model/types";
import { matchesRecipe } from "../rules/recipeEngine";

export const SOLVER_ACTIONS: readonly ShiftAction[] = [
  ...([0, 1, 2, 3] as const).flatMap((index) => [
    { axis: "row" as const, index, direction: "left" as const },
    { axis: "row" as const, index, direction: "right" as const },
  ]),
  ...([0, 1, 2, 3] as const).flatMap((index) => [
    { axis: "column" as const, index, direction: "up" as const },
    { axis: "column" as const, index, direction: "down" as const },
  ]),
];

interface SearchNode {
  readonly board: Board;
  readonly path: readonly ShiftAction[];
}

export function findShortestPlan(
  initial: Board,
  recipe: RecipeDefinition,
  maxDepth = 6,
): ShiftAction[] | null {
  if (matchesRecipe(initial, recipe)) return [];
  const queue: SearchNode[] = [{ board: initial, path: [] }];
  const visited = new Set([boardKey(initial)]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length >= maxDepth) continue;
    for (const action of SOLVER_ACTIONS) {
      const board = shiftBoard(current.board, action);
      const key = boardKey(board);
      if (visited.has(key)) continue;
      const path = [...current.path, action];
      if (matchesRecipe(board, recipe)) return path;
      visited.add(key);
      queue.push({ board, path });
    }
  }
  return null;
}

export function assertReachable(
  board: Board,
  recipe: RecipeDefinition,
  maxDepth = 6,
): void {
  if (findShortestPlan(board, recipe, maxDepth) === null) {
    throw new Error(`Generated board cannot reach recipe ${recipe.id} within ${maxDepth} moves`);
  }
}
```

- [ ] **Step 5: 运行求解器测试并记录基准（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/solver.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

Expected: `2 passed`；TypeScript 零错误；单文件测试在开发机上 2 秒内结束。

- [ ] **Step 6: 精确提交求解器（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/rules/recipeEngine.ts games/wechat-h5-v2/apps/monster-night-market/src/board/solver.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/solver.test.ts
git commit -m "feat(night-market): prove generated orders are reachable"
```

Expected: 新提交只包含配方匹配、求解器和测试。

### Task 4: 固化 8 食材、12 配方、8 顾客、3 摊位和 12 改造

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/model/content.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/content.test.ts`

- [ ] **Step 1: 写内容数量、唯一性和决策差异的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import {
  CUSTOMERS,
  INGREDIENTS,
  RECIPES,
  STALLS,
  UPGRADES,
} from "../../src/model/content";

describe("night market content", () => {
  it("恰好交付规格中的内容数量且 ID 不重复", () => {
    const assertUnique = (items: readonly { id: string }[]) =>
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(INGREDIENTS).toHaveLength(8);
    expect(RECIPES).toHaveLength(12);
    expect(CUSTOMERS).toHaveLength(8);
    expect(STALLS).toHaveLength(3);
    expect(UPGRADES).toHaveLength(12);
    assertUnique(RECIPES);
    assertUnique(CUSTOMERS);
    assertUnique(STALLS);
    assertUnique(UPGRADES);
  });

  it("每个配方都通过食材、排列或摊位改变摆法", () => {
    const signatures = RECIPES.map((recipe) =>
      `${recipe.ingredients.join(">")}:${recipe.arrangement}:${recipe.stall}`,
    );
    expect(new Set(signatures).size).toBe(RECIPES.length);
    expect(RECIPES.every((recipe) => recipe.ingredients.length >= 2)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/content.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/model/content'`。

- [ ] **Step 3: 创建完整的类型化内容表（2–5 分钟）**

`src/model/content.ts`：

```ts
import type {
  CustomerDefinition,
  CustomerId,
  IngredientId,
  RecipeDefinition,
  StallDefinition,
  UpgradeDefinition,
} from "./types";

export const INGREDIENTS: readonly { id: IngredientId; label: string; silhouette: string }[] = [
  { id: "chili", label: "火椒", silhouette: "long" },
  { id: "tofu", label: "灵豆腐", silhouette: "cube" },
  { id: "mushroom", label: "月蘑", silhouette: "cap" },
  { id: "lotus", label: "莲片", silhouette: "ring" },
  { id: "fish", label: "云鱼", silhouette: "fish" },
  { id: "riceCake", label: "年糕", silhouette: "bar" },
  { id: "ice", label: "玄冰", silhouette: "crystal" },
  { id: "broth", label: "高汤", silhouette: "drop" },
];

export const RECIPES: readonly RecipeDefinition[] = [
  { id: "emberTofu", ingredients: ["tofu", "chili"], arrangement: "ordered", stall: "grill" },
  { id: "mushroomSkewer", ingredients: ["mushroom", "tofu"], arrangement: "adjacent", stall: "grill" },
  { id: "lotusIce", ingredients: ["lotus", "ice"], arrangement: "ordered", stall: "dessert" },
  { id: "fishBroth", ingredients: ["fish", "broth"], arrangement: "adjacent", stall: "hotpot" },
  { id: "spicyRiceCake", ingredients: ["riceCake", "chili"], arrangement: "ordered", stall: "grill" },
  { id: "frozenTofu", ingredients: ["ice", "tofu"], arrangement: "adjacent", stall: "dessert" },
  { id: "doubleSkewer", ingredients: ["mushroom", "tofu", "chili"], arrangement: "line", stall: "grill" },
  { id: "borrowedFireSoup", ingredients: ["broth", "mushroom", "chili"], arrangement: "ordered", stall: "hotpot" },
  { id: "coldLotusCup", ingredients: ["ice", "lotus", "riceCake"], arrangement: "line", stall: "dessert" },
  { id: "sharedHotpot", ingredients: ["fish", "tofu", "broth"], arrangement: "ordered", stall: "hotpot" },
  { id: "vipTwinDish", ingredients: ["chili", "fish", "lotus"], arrangement: "line", stall: "grill" },
  { id: "midnightFeast", ingredients: ["broth", "fish", "mushroom", "tofu"], arrangement: "ordered", stall: "hotpot" },
];

const customer = (
  id: CustomerId,
  patienceMoves: number,
  preferredStall: CustomerDefinition["preferredStall"],
): CustomerDefinition => ({ id, patienceMoves, preferredStall });

export const CUSTOMERS: readonly CustomerDefinition[] = [
  customer("fireCub", 5, "grill"),
  customer("iceHare", 6, "dessert"),
  customer("lanternFox", 5, "grill"),
  customer("stoneOgre", 8, "hotpot"),
  customer("cloudCrane", 4, "dessert"),
  customer("riverImp", 6, "hotpot"),
  customer("moonCat", 5, "dessert"),
  customer("gluttonKing", 10, "hotpot"),
];

export const STALLS: readonly StallDefinition[] = [
  { id: "grill", rule: "adjacentBonus" },
  { id: "dessert", rule: "frozenBonus" },
  { id: "hotpot", rule: "reserveBroth" },
];

export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: "borrowFire", rule: "substituteFire" },
  { id: "crossFlavor", rule: "extraOrder" },
  { id: "coldStorage", rule: "freezeNeighbor" },
  { id: "rushOrder", rule: "orderedVip" },
  { id: "sharedPlate", rule: "shareStep" },
  { id: "emberEcho", rule: "repeatFire" },
  { id: "sweetEncore", rule: "repeatSweet" },
  { id: "brothReserve", rule: "keepBroth" },
  { id: "patientQueue", rule: "addPatience" },
  { id: "doublePrep", rule: "doublePreview" },
  { id: "festivalSpark", rule: "festivalMeter" },
  { id: "cleanCounter", rule: "clearFreeze" },
];
```

- [ ] **Step 4: 运行内容测试和类型检查（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/content.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

Expected: `2 passed`；TypeScript 零错误。

- [ ] **Step 5: 精确提交内容表（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/model/content.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/content.test.ts
git commit -m "feat(night-market): define launch recipe and customer catalog"
```

Expected: 新提交只包含内容表及其测试。

### Task 5: 实现订单预演、VIP 顺序单、共享盘和冻结反馈

**Files:**
- Modify: `games/wechat-h5-v2/apps/monster-night-market/src/model/types.ts`
- Modify: `games/wechat-h5-v2/apps/monster-night-market/src/rules/recipeEngine.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/rules/orderEngine.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/orderEngine.test.ts`

- [ ] **Step 1: 写普通单、VIP 顺序单和共享盘的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { createBoard } from "../../src/board/board";
import { RECIPES } from "../../src/model/content";
import { previewOrders, resolveOrders } from "../../src/rules/orderEngine";
import type { Order, OrderProgress } from "../../src/model/types";

const board = createBoard([
  ["tofu", "chili", "mushroom", "lotus"],
  ["fish", "broth", "ice", "riceCake"],
  ["mushroom", "tofu", "chili", "lotus"],
  ["ice", "lotus", "riceCake", "broth"],
]);

describe("orderEngine", () => {
  it("预演只读，不修改订单进度", () => {
    const orders: Order[] = [{
      id: "o1", customerId: "fireCub", recipeIds: ["emberTofu"],
      mode: "any", expiresAfterMoves: 5,
    }];
    const progress: OrderProgress = { sequenceIndexByOrder: {} };
    expect(previewOrders(board, orders, progress, RECIPES).completedOrderIds).toEqual(["o1"]);
    expect(progress.sequenceIndexByOrder).toEqual({});
  });

  it("VIP 必须按配方顺序跨两步完成", () => {
    const orders: Order[] = [{
      id: "vip", customerId: "lanternFox",
      recipeIds: ["emberTofu", "fishBroth"], mode: "sequence", expiresAfterMoves: 6,
    }];
    const first = resolveOrders(board, orders, { sequenceIndexByOrder: {} }, RECIPES);
    expect(first.progress.sequenceIndexByOrder.vip).toBe(1);
    expect(first.completedOrderIds).toEqual([]);
    const second = resolveOrders(board, orders, first.progress, RECIPES, new Set(["fishBroth"]));
    expect(second.completedOrderIds).toEqual(["vip"]);
  });

  it("共享盘允许同一步完成两个相同配方需求", () => {
    const orders: Order[] = ["a", "b"].map((id) => ({
      id, customerId: "riverImp", recipeIds: ["fishBroth"],
      mode: "shared" as const, expiresAfterMoves: 5,
    }));
    const result = resolveOrders(board, orders, { sequenceIndexByOrder: {} }, RECIPES);
    expect(result.completedOrderIds).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/orderEngine.test.ts
```

Expected: `FAIL`，错误包含 `OrderProgress` 或 `orderEngine` 未定义。

- [ ] **Step 3: 增加订单进度和解析结果类型（2–5 分钟）**

在 `src/model/types.ts` 末尾加入：

```ts
export interface OrderProgress {
  readonly sequenceIndexByOrder: Readonly<Record<string, number>>;
}
export interface OrderResolution {
  readonly completedOrderIds: readonly string[];
  readonly completedRecipeIds: readonly RecipeId[];
  readonly progress: OrderProgress;
  readonly explanations: readonly {
    orderId: string;
    status: "completed" | "advanced" | "missing" | "wrongSequence";
    expectedRecipeId: RecipeId;
  }[];
}
```

- [ ] **Step 4: 让匹配器返回全部命中配方（2–5 分钟）**

在 `src/rules/recipeEngine.ts` 末尾加入：

```ts
import type { RecipeId } from "../model/types";

export function matchingRecipeIds(
  board: Board,
  recipes: readonly RecipeDefinition[],
): ReadonlySet<RecipeId> {
  return new Set(
    recipes.filter((recipe) => matchesRecipe(board, recipe)).map((recipe) => recipe.id),
  );
}
```

- [ ] **Step 5: 实现纯函数订单预演与结算（2–5 分钟）**

`src/rules/orderEngine.ts`：

```ts
import type {
  Board,
  Order,
  OrderProgress,
  OrderResolution,
  RecipeDefinition,
  RecipeId,
} from "../model/types";
import { matchingRecipeIds } from "./recipeEngine";

export function previewOrders(
  board: Board,
  orders: readonly Order[],
  progress: OrderProgress,
  recipes: readonly RecipeDefinition[],
): OrderResolution {
  return resolveOrders(board, orders, progress, recipes);
}

export function resolveOrders(
  board: Board,
  orders: readonly Order[],
  progress: OrderProgress,
  recipes: readonly RecipeDefinition[],
  forcedMatches?: ReadonlySet<RecipeId>,
): OrderResolution {
  const matches = forcedMatches ?? matchingRecipeIds(board, recipes);
  const nextIndexes = { ...progress.sequenceIndexByOrder };
  const completedOrderIds: string[] = [];
  const completedRecipeIds = new Set<RecipeId>();
  const explanations: OrderResolution["explanations"][number][] = [];

  for (const order of orders) {
    if (order.mode === "sequence") {
      const index = nextIndexes[order.id] ?? 0;
      const expectedRecipeId = order.recipeIds[index];
      if (matches.has(expectedRecipeId)) {
        completedRecipeIds.add(expectedRecipeId);
        if (index + 1 === order.recipeIds.length) {
          completedOrderIds.push(order.id);
          delete nextIndexes[order.id];
          explanations.push({ orderId: order.id, status: "completed", expectedRecipeId });
        } else {
          nextIndexes[order.id] = index + 1;
          explanations.push({ orderId: order.id, status: "advanced", expectedRecipeId });
        }
      } else {
        explanations.push({ orderId: order.id, status: "missing", expectedRecipeId });
      }
      continue;
    }
    const matched = order.recipeIds.find((recipeId) => matches.has(recipeId));
    if (matched) {
      completedOrderIds.push(order.id);
      completedRecipeIds.add(matched);
      explanations.push({ orderId: order.id, status: "completed", expectedRecipeId: matched });
    } else {
      explanations.push({
        orderId: order.id,
        status: "missing",
        expectedRecipeId: order.recipeIds[0],
      });
    }
  }

  return {
    completedOrderIds,
    completedRecipeIds: [...completedRecipeIds],
    progress: { sequenceIndexByOrder: nextIndexes },
    explanations,
  };
}
```

- [ ] **Step 6: 运行订单测试和全部单测（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/orderEngine.test.ts
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests
```

Expected: `orderEngine.test.ts` 为 `3 passed`；当前全部单测通过。

- [ ] **Step 7: 精确提交订单规则（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/model/types.ts games/wechat-h5-v2/apps/monster-night-market/src/rules/recipeEngine.ts games/wechat-h5-v2/apps/monster-night-market/src/rules/orderEngine.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/orderEngine.test.ts
git commit -m "feat(night-market): preview and resolve multi-order recipes"
```

Expected: 新提交只包含订单领域改动。

### Task 6: 实现摊位规则、顾客耐心、改造和三段连灶

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/rules/stallRules.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/run/runMachine.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/runMachine.test.ts`

- [ ] **Step 1: 写连灶、耐心衰减和规则侧移的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { createBoard } from "../../src/board/board";
import { createRun, applyShift } from "../../src/run/runMachine";

describe("NightMarketRun", () => {
  it("三次连续出餐触发庆典且空滑会中断连灶", () => {
    const run = createRun({ seed: "chain-001", stallId: "grill" });
    const board = createBoard([
      ["tofu", "chili", "mushroom", "lotus"],
      ["fish", "broth", "ice", "riceCake"],
      ["mushroom", "tofu", "chili", "lotus"],
      ["ice", "lotus", "riceCake", "broth"],
    ]);
    const first = applyShift({ ...run, board }, { axis: "row", index: 0, direction: "right" });
    const second = applyShift(first, { axis: "row", index: 2, direction: "left" });
    const third = applyShift(second, { axis: "column", index: 1, direction: "down" });
    expect(third.festivalCount).toBeGreaterThanOrEqual(1);
    const miss = applyShift(third, { axis: "row", index: 3, direction: "left" });
    expect(miss.chain).toBe(0);
  });

  it("patientQueue 只增加耐心，不增加永久得分倍率", () => {
    const run = createRun({
      seed: "patience-001",
      stallId: "hotpot",
      upgrades: ["patientQueue"],
    });
    expect(run.orders.every((order) => order.expiresAfterMoves >= 5)).toBe(true);
    expect("permanentMultiplier" in run).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/runMachine.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/run/runMachine'`。

- [ ] **Step 3: 实现三种摊位的可解释规则效果（2–5 分钟）**

`src/rules/stallRules.ts`：

```ts
import type { Board, RecipeId, StallId, UpgradeId } from "../model/types";

export interface StallOutcome {
  readonly score: number;
  readonly freezeDelta: number;
  readonly retainedIngredients: readonly string[];
  readonly explanation: string;
}

export function applyStallRule(
  stallId: StallId,
  board: Board,
  recipeIds: readonly RecipeId[],
  upgrades: ReadonlySet<UpgradeId>,
): StallOutcome {
  const base = recipeIds.length * 100;
  if (stallId === "grill") {
    const fireBonus = recipeIds.filter((id) =>
      id === "emberTofu" || id === "spicyRiceCake" || id === "doubleSkewer",
    ).length * 25;
    return {
      score: base + fireBonus,
      freezeDelta: upgrades.has("cleanCounter") ? -1 : 0,
      retainedIngredients: [],
      explanation: fireBonus > 0 ? "烧烤摊：火系配方相邻出餐加成" : "烧烤摊：本步没有火系相邻加成",
    };
  }
  if (stallId === "dessert") {
    const frozenCells = board.flat().filter((cell) => cell.frozen > 0).length;
    return {
      score: base + frozenCells * 10,
      freezeDelta: upgrades.has("coldStorage") ? 1 : 0,
      retainedIngredients: [],
      explanation: `甜品摊：${frozenCells} 个冰冻格参与结算`,
    };
  }
  const keepBroth = upgrades.has("brothReserve");
  return {
    score: base,
    freezeDelta: 0,
    retainedIngredients: keepBroth ? ["broth"] : [],
    explanation: keepBroth ? "火锅摊：高汤留至下一单" : "火锅摊：本步未保留高汤",
  };
}
```

- [ ] **Step 4: 实现确定性 300 秒营业状态机（2–5 分钟）**

`src/run/runMachine.ts`：

```ts
import { createBoard, shiftBoard } from "../board/board";
import { CUSTOMERS, RECIPES } from "../model/content";
import type {
  Board,
  Order,
  OrderProgress,
  ShiftAction,
  StallId,
  UpgradeId,
} from "../model/types";
import { resolveOrders } from "../rules/orderEngine";
import { applyStallRule } from "../rules/stallRules";

export interface NightMarketRun {
  readonly seed: string;
  readonly status: "playing" | "ended";
  readonly remainingMs: number;
  readonly board: Board;
  readonly stallId: StallId;
  readonly upgrades: ReadonlySet<UpgradeId>;
  readonly orders: readonly Order[];
  readonly orderProgress: OrderProgress;
  readonly score: number;
  readonly chain: number;
  readonly festivalCount: number;
  readonly moveCount: number;
  readonly lastExplanation: string;
}

export function createRun(input: {
  seed: string;
  stallId: StallId;
  upgrades?: readonly UpgradeId[];
}): NightMarketRun {
  const patienceBonus = input.upgrades?.includes("patientQueue") ? 2 : 0;
  const orders: Order[] = CUSTOMERS.slice(0, 2).map((customer, index) => ({
    id: `${input.seed}:order:${index}`,
    customerId: customer.id,
    recipeIds: [index === 0 ? "emberTofu" : "fishBroth"],
    mode: "any",
    expiresAfterMoves: customer.patienceMoves + patienceBonus,
  }));
  return {
    seed: input.seed,
    status: "playing",
    remainingMs: 300_000,
    board: createBoard([
      ["chili", "mushroom", "lotus", "tofu"],
      ["fish", "riceCake", "ice", "broth"],
      ["mushroom", "tofu", "chili", "lotus"],
      ["ice", "lotus", "riceCake", "broth"],
    ]),
    stallId: input.stallId,
    upgrades: new Set(input.upgrades ?? []),
    orders,
    orderProgress: { sequenceIndexByOrder: {} },
    score: 0,
    chain: 0,
    festivalCount: 0,
    moveCount: 0,
    lastExplanation: "营业开始",
  };
}

export function applyShift(run: NightMarketRun, action: ShiftAction): NightMarketRun {
  if (run.status !== "playing") return run;
  const board = shiftBoard(run.board, action);
  const resolution = resolveOrders(board, run.orders, run.orderProgress, RECIPES);
  const completed = resolution.completedOrderIds.length;
  const chain = completed > 0 ? run.chain + 1 : 0;
  const festival = chain >= 3;
  const stall = applyStallRule(
    run.stallId,
    board,
    resolution.completedRecipeIds,
    run.upgrades,
  );
  return {
    ...run,
    board,
    orderProgress: resolution.progress,
    score: run.score + stall.score + (festival ? 300 : 0),
    chain: festival ? 0 : chain,
    festivalCount: run.festivalCount + (festival ? 1 : 0),
    moveCount: run.moveCount + 1,
    orders: run.orders.map((order) => ({
      ...order,
      expiresAfterMoves: Math.max(0, order.expiresAfterMoves - 1),
    })),
    lastExplanation: completed > 0
      ? `${completed} 单完成；${stall.explanation}`
      : `没有成单；需要 ${resolution.explanations.map((item) => item.expectedRecipeId).join("、")}`,
  };
}

export function advanceClock(run: NightMarketRun, deltaMs: number): NightMarketRun {
  const remainingMs = Math.max(0, run.remainingMs - Math.max(0, deltaMs));
  return {
    ...run,
    remainingMs,
    status: remainingMs === 0 ? "ended" : run.status,
  };
}
```

- [ ] **Step 5: 增加时间暂停和失败归因测试（2–5 分钟）**

在 `tests/unit/runMachine.test.ts` 末尾加入：

```ts
it("只按 runtime 提供的活动 delta 推进，300 秒准时结束", async () => {
  const { advanceClock } = await import("../../src/run/runMachine");
  const run = createRun({ seed: "clock-001", stallId: "dessert" });
  expect(advanceClock(run, 299_999).status).toBe("playing");
  expect(advanceClock(run, 300_000).status).toBe("ended");
});

it("空滑结算提供缺少配方的具体解释", () => {
  const run = createRun({ seed: "reason-001", stallId: "hotpot" });
  const next = applyShift(run, { axis: "row", index: 3, direction: "left" });
  expect(next.lastExplanation).toMatch(/没有成单；需要/);
});
```

- [ ] **Step 6: 运行状态机测试（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/runMachine.test.ts
```

Expected: `4 passed`，失败输出中不出现未处理 Promise。

- [ ] **Step 7: 精确提交局内循环（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/rules/stallRules.ts games/wechat-h5-v2/apps/monster-night-market/src/run/runMachine.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/runMachine.test.ts
git commit -m "feat(night-market): resolve stalls customers and stove chains"
```

Expected: 新提交只包含摊位规则、营业状态机和测试。

### Task 7: 实现首单无口头帮助教学和 0–300 秒节奏门禁

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/tutorial/firstOrder.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/firstOrder.test.ts`

- [ ] **Step 1: 写固定首单、一步解和节奏表的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { RECIPES } from "../../src/model/content";
import { findShortestPlan } from "../../src/board/solver";
import {
  FIRST_ORDER_BOARD,
  FIRST_ORDER,
  RUN_PHASES,
  tutorialHint,
} from "../../src/tutorial/firstOrder";

describe("first order tutorial", () => {
  it("首单有且只有规格动作可在一步完成", () => {
    const recipe = RECIPES.find((item) => item.id === "emberTofu")!;
    expect(findShortestPlan(FIRST_ORDER_BOARD, recipe, 1)).toEqual([
      { axis: "row", index: 0, direction: "right" },
    ]);
    expect(FIRST_ORDER.recipeIds).toEqual(["emberTofu"]);
  });

  it("5 秒前不提示，5 秒后只高亮行列而不泄露方向", () => {
    expect(tutorialHint(4_999)).toBeNull();
    expect(tutorialHint(5_000)).toEqual({ axis: "row", index: 0 });
  });

  it("六个阶段连续覆盖 0 到 300 秒", () => {
    expect(RUN_PHASES.map((phase) => [phase.startMs, phase.endMs])).toEqual([
      [0, 20_000], [20_000, 60_000], [60_000, 120_000],
      [120_000, 180_000], [180_000, 240_000], [240_000, 300_000],
    ]);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/firstOrder.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/tutorial/firstOrder'`。

- [ ] **Step 3: 实现可验证的首单脚本（2–5 分钟）**

`src/tutorial/firstOrder.ts`：

```ts
import { createBoard } from "../board/board";
import type { Order } from "../model/types";

export const FIRST_ORDER_BOARD = createBoard([
  ["chili", "mushroom", "lotus", "tofu"],
  ["fish", "riceCake", "ice", "broth"],
  ["mushroom", "lotus", "fish", "riceCake"],
  ["ice", "broth", "chili", "tofu"],
]);

export const FIRST_ORDER: Order = {
  id: "tutorial:first",
  customerId: "fireCub",
  recipeIds: ["emberTofu"],
  mode: "any",
  expiresAfterMoves: 99,
};

export interface RunPhase {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly mechanic: string;
}

export const RUN_PHASES: readonly RunPhase[] = [
  { id: "first-order", startMs: 0, endMs: 20_000, mechanic: "两食材首单与幽灵预演" },
  { id: "double-order", startMs: 20_000, endMs: 60_000, mechanic: "第二配方与双单机会" },
  { id: "hold-ingredient", startMs: 60_000, endMs: 120_000, mechanic: "摊位改造与三食材留料" },
  { id: "customer-rule", startMs: 120_000, endMs: 180_000, mechanic: "冰客、火客或插单" },
  { id: "vip-chain", startMs: 180_000, endMs: 240_000, mechanic: "VIP 顺序单与三段连灶" },
  { id: "glutton-finale", startMs: 240_000, endMs: 300_000, mechanic: "大胃王与夜市庆典" },
];

export function tutorialHint(elapsedWithoutEffectiveInputMs: number):
  | { axis: "row"; index: 0 }
  | null {
  return elapsedWithoutEffectiveInputMs >= 5_000
    ? { axis: "row", index: 0 }
    : null;
}

export function phaseAt(elapsedMs: number): RunPhase {
  return RUN_PHASES.find((phase) =>
    elapsedMs >= phase.startMs && elapsedMs < phase.endMs,
  ) ?? RUN_PHASES[RUN_PHASES.length - 1];
}
```

- [ ] **Step 4: 运行教学测试和求解器回归（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/firstOrder.test.ts apps/monster-night-market/tests/unit/solver.test.ts
```

Expected: `5 passed`；首单最短路径保持为 `row 0 right`。

- [ ] **Step 5: 精确提交首单教学（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/tutorial/firstOrder.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/firstOrder.test.ts
git commit -m "feat(night-market): teach first recipe through one visible move"
```

Expected: 新提交只包含首单脚本和测试。

### Task 8: 实现不出售永久强度的局外成长、图鉴和一步之差复盘

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/meta/nightMarketSave.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/nightMarketSave.test.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/integration/saveRoundTrip.test.ts`

- [ ] **Step 1: 写规则侧移成长和最多三条复盘的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import {
  applyRunSummary,
  createDefaultSave,
  migrateNightMarketSave,
} from "../../src/meta/nightMarketSave";

describe("NightMarketSave", () => {
  it("结算只解锁摊位、菜谱、图鉴和外观，不写永久攻击倍率", () => {
    const next = applyRunSummary(createDefaultSave(), {
      seed: "run-001",
      score: 900,
      completedRecipeIds: ["emberTofu", "fishBroth"],
      metCustomerIds: ["fireCub", "riverImp"],
      nearMisses: [
        { orderId: "a", missingRecipeId: "lotusIce", distance: 1 },
        { orderId: "b", missingRecipeId: "sharedHotpot", distance: 1 },
        { orderId: "c", missingRecipeId: "doubleSkewer", distance: 1 },
        { orderId: "d", missingRecipeId: "vipTwinDish", distance: 2 },
      ],
    });
    expect(next.unlockedRecipeIds).toEqual(expect.arrayContaining(["emberTofu", "fishBroth"]));
    expect(next.customerCodexIds).toEqual(expect.arrayContaining(["fireCub", "riverImp"]));
    expect(next.lastRunNearMisses).toHaveLength(3);
    expect(JSON.stringify(next)).not.toMatch(/attack|power|multiplier/i);
  });

  it("v0 数组存档确定性迁移到 v1", () => {
    expect(migrateNightMarketSave(0, { recipes: ["emberTofu"] }).schemaVersion).toBe(1);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/nightMarketSave.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/meta/nightMarketSave'`。

- [ ] **Step 3: 实现存档负载、迁移和结算纯函数（2–5 分钟）**

`src/meta/nightMarketSave.ts`：

```ts
import type {
  CustomerId,
  RecipeId,
  StallId,
} from "../model/types";

export interface NearMiss {
  readonly orderId: string;
  readonly missingRecipeId: RecipeId;
  readonly distance: number;
}

export interface NightMarketSaveV1 {
  readonly schemaVersion: 1;
  readonly runCount: number;
  readonly unlockedStallIds: readonly StallId[];
  readonly unlockedRecipeIds: readonly RecipeId[];
  readonly customerCodexIds: readonly CustomerId[];
  readonly chefTalentIds: readonly ("previewPlus" | "queueChoice" | "starterReroll")[];
  readonly cosmeticIds: readonly string[];
  readonly lastRunSeed: string | null;
  readonly lastRunNearMisses: readonly NearMiss[];
  readonly dailyRecords: Readonly<Record<string, { score: number; completed: boolean }>>;
}

export interface RunSummary {
  readonly seed: string;
  readonly score: number;
  readonly completedRecipeIds: readonly RecipeId[];
  readonly metCustomerIds: readonly CustomerId[];
  readonly nearMisses: readonly NearMiss[];
}

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

export function createDefaultSave(): NightMarketSaveV1 {
  return {
    schemaVersion: 1,
    runCount: 0,
    unlockedStallIds: ["grill"],
    unlockedRecipeIds: ["emberTofu", "mushroomSkewer"],
    customerCodexIds: [],
    chefTalentIds: [],
    cosmeticIds: ["stall:lantern-red"],
    lastRunSeed: null,
    lastRunNearMisses: [],
    dailyRecords: {},
  };
}

export function applyRunSummary(
  save: NightMarketSaveV1,
  summary: RunSummary,
): NightMarketSaveV1 {
  const runCount = save.runCount + 1;
  const unlockedStallIds = runCount >= 2
    ? unique([...save.unlockedStallIds, "dessert" as const])
    : [...save.unlockedStallIds];
  const chefTalentIds = runCount >= 3
    ? unique([...save.chefTalentIds, "queueChoice" as const])
    : [...save.chefTalentIds];
  return {
    ...save,
    runCount,
    unlockedStallIds,
    unlockedRecipeIds: unique([...save.unlockedRecipeIds, ...summary.completedRecipeIds]),
    customerCodexIds: unique([...save.customerCodexIds, ...summary.metCustomerIds]),
    chefTalentIds,
    lastRunSeed: summary.seed,
    lastRunNearMisses: [...summary.nearMisses]
      .sort((a, b) => a.distance - b.distance || a.orderId.localeCompare(b.orderId))
      .slice(0, 3),
  };
}

export function migrateNightMarketSave(
  fromVersion: number,
  payload: unknown,
): NightMarketSaveV1 {
  if (fromVersion === 1) return payload as NightMarketSaveV1;
  if (fromVersion !== 0) throw new Error(`Unsupported night market save version ${fromVersion}`);
  const legacy = payload as { recipes?: RecipeId[] };
  return {
    ...createDefaultSave(),
    unlockedRecipeIds: unique([
      ...createDefaultSave().unlockedRecipeIds,
      ...(legacy.recipes ?? []),
    ]),
  };
}
```

- [ ] **Step 4: 写共享 `SaveStore` 往返集成测试（2–5 分钟）**

`tests/integration/saveRoundTrip.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createSaveStore } from "@gamehub/h5-save";
import {
  createDefaultSave,
  migrateNightMarketSave,
  type NightMarketSaveV1,
} from "../../src/meta/nightMarketSave";
import { createMemorySaveAdapter } from "@gamehub/h5-testing";

describe("night market SaveStore", () => {
  it("使用独立 gameId 保存并重新读取 v1 负载", async () => {
    const adapter = createMemorySaveAdapter();
    const store = createSaveStore<NightMarketSaveV1>({
      gameId: "monster-night-market",
      currentSchemaVersion: 1,
      defaultValue: createDefaultSave(),
      migrations: { 0: (payload) => migrateNightMarketSave(0, payload) },
      adapter,
    });
    await store.save({ ...createDefaultSave(), runCount: 3 });
    const loaded = await store.load();
    expect(loaded.payload.runCount).toBe(3);
    expect(loaded.recoveredFromBackup).toBe(false);
  });
});
```

- [ ] **Step 5: 运行局外与存档集成测试（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/nightMarketSave.test.ts apps/monster-night-market/tests/integration/saveRoundTrip.test.ts
```

Expected: `3 passed`；存档键只归属 `monster-night-market`。

- [ ] **Step 6: 精确提交局外成长（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/meta/nightMarketSave.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/nightMarketSave.test.ts games/wechat-h5-v2/apps/monster-night-market/tests/integration/saveRoundTrip.test.ts
git commit -m "feat(night-market): persist sidegrade progression and near misses"
```

Expected: 新提交只包含夜市存档领域文件和测试。

### Task 9: 实现可补玩最近七天的每日固定种子

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/daily/dailyChallenge.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/dailyChallenge.test.ts`

- [ ] **Step 1: 写上海自然日、七天窗口和异常日期回退测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import {
  dailyKeyAt,
  listPlayableDailyKeys,
  resolveDailySeed,
} from "../../src/daily/dailyChallenge";

describe("dailyChallenge", () => {
  it("按 Asia/Shanghai 生成同日固定种子", () => {
    const beforeMidnight = new Date("2026-07-29T15:59:59.000Z");
    const afterMidnight = new Date("2026-07-29T16:00:01.000Z");
    expect(dailyKeyAt(beforeMidnight)).toBe("2026-07-29");
    expect(dailyKeyAt(afterMidnight)).toBe("2026-07-30");
    expect(resolveDailySeed("2026-07-30")).toBe(resolveDailySeed("2026-07-30"));
  });

  it("当天加最近六天共七个可补玩日期", () => {
    expect(listPlayableDailyKeys(new Date("2026-07-29T08:00:00.000Z"))).toEqual([
      "2026-07-29", "2026-07-28", "2026-07-27", "2026-07-26",
      "2026-07-25", "2026-07-24", "2026-07-23",
    ]);
  });

  it("非法日期回退普通挑战，不清空进度", () => {
    expect(() => resolveDailySeed("29/07/2026")).toThrow("Invalid daily key");
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/dailyChallenge.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/daily/dailyChallenge'`。

- [ ] **Step 3: 实现不依赖在线时钟的日期键和种子（2–5 分钟）**

`src/daily/dailyChallenge.ts`：

```ts
const DAILY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function dailyKeyAt(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function keyToUtcNoon(key: string): Date {
  if (!DAILY_KEY.test(key)) throw new Error("Invalid daily key");
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
}

export function listPlayableDailyKeys(now: Date): string[] {
  const current = keyToUtcNoon(dailyKeyAt(now));
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(current);
    date.setUTCDate(current.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  });
}

export function resolveDailySeed(key: string): string {
  if (!DAILY_KEY.test(key)) throw new Error("Invalid daily key");
  return `monster-night-market:daily:v1:${key}`;
}

export function ordinaryFallbackSeed(sessionId: string): string {
  return `monster-night-market:ordinary:v1:${sessionId}`;
}
```

- [ ] **Step 4: 增加固定种子内容一致性测试（2–5 分钟）**

在 `tests/unit/dailyChallenge.test.ts` 末尾加入：

```ts
it("同一日期键不会混入本地时刻或运行次数", () => {
  const keys = Array.from({ length: 3 }, () => resolveDailySeed("2026-07-29"));
  expect(new Set(keys)).toEqual(new Set(["monster-night-market:daily:v1:2026-07-29"]));
});
```

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/dailyChallenge.test.ts
```

Expected: `4 passed`。

- [ ] **Step 5: 精确提交每日种子（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/daily/dailyChallenge.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/dailyChallenge.test.ts
git commit -m "feat(night-market): add seven-day replayable daily seeds"
```

Expected: 新提交只包含每日挑战模块和测试。

### Task 10: 定义盲滑判定、夜市事件和三局下降指标

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/telemetry/nightMarketEvents.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/nightMarketEvents.test.ts`

- [ ] **Step 1: 写盲滑启发式和局次比较的失败测试（2–5 分钟）**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  BlindSlideTracker,
  compareBlindSlideRate,
} from "../../src/telemetry/nightMarketEvents";

describe("BlindSlideTracker", () => {
  it("把快速、无成单预演、紧接动画结束的滑动判为盲滑", () => {
    const emit = vi.fn();
    const tracker = new BlindSlideTracker({ emit } as never);
    tracker.markSettled(1_000);
    tracker.markPreview(1_200, []);
    const result = tracker.commit(1_280, {
      action: { axis: "row", index: 0, direction: "left" },
      completedOrderIds: [],
      completedRecipeIds: [],
      chain: 0,
      stallId: "grill",
    });
    expect(result.blindSlide).toBe(true);
    expect(emit).toHaveBeenCalledWith("choice_selected", expect.objectContaining({
      blindSlide: true,
      previewDurationMs: 80,
    }));
  });

  it("有明确成单预演或停顿规划时不判盲滑", () => {
    const tracker = new BlindSlideTracker({ emit: vi.fn() } as never);
    tracker.markSettled(1_000);
    tracker.markPreview(1_100, ["order-a"]);
    expect(tracker.commit(1_180, {
      action: { axis: "column", index: 2, direction: "down" },
      completedOrderIds: ["order-a"],
      completedRecipeIds: ["fishBroth"],
      chain: 1,
      stallId: "hotpot",
    }).blindSlide).toBe(false);
  });

  it("第三局盲滑率必须低于第一局才通过", () => {
    expect(compareBlindSlideRate([
      { runOrdinal: 1, committed: 10, blind: 5 },
      { runOrdinal: 3, committed: 10, blind: 3 },
    ])).toEqual({ firstRate: 0.5, thirdRate: 0.3, improved: true });
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/nightMarketEvents.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/telemetry/nightMarketEvents'`。

- [ ] **Step 3: 实现可复核的盲滑定义和事件负载（2–5 分钟）**

`src/telemetry/nightMarketEvents.ts`：

```ts
import type { TelemetryClient } from "@gamehub/h5-telemetry";
import type {
  RecipeId,
  ShiftAction,
  StallId,
} from "../model/types";

export interface ShiftTelemetryInput {
  readonly action: ShiftAction;
  readonly completedOrderIds: readonly string[];
  readonly completedRecipeIds: readonly RecipeId[];
  readonly chain: number;
  readonly stallId: StallId;
}

export interface RunBlindCount {
  readonly runOrdinal: number;
  readonly committed: number;
  readonly blind: number;
}

export class BlindSlideTracker {
  private settledAt = Number.NEGATIVE_INFINITY;
  private previewAt = Number.NEGATIVE_INFINITY;
  private previewedOrderIds: readonly string[] = [];

  constructor(private readonly telemetry: Pick<TelemetryClient, "emit">) {}

  markSettled(at: number): void {
    this.settledAt = at;
  }

  markPreview(at: number, orderIds: readonly string[]): void {
    this.previewAt = at;
    this.previewedOrderIds = [...orderIds];
  }

  commit(at: number, input: ShiftTelemetryInput): { blindSlide: boolean } {
    const previewDurationMs = Math.max(0, at - this.previewAt);
    const waitAfterSettledMs = Math.max(0, at - this.settledAt);
    const blindSlide =
      waitAfterSettledMs < 700 &&
      previewDurationMs < 120 &&
      this.previewedOrderIds.length === 0 &&
      input.completedOrderIds.length === 0;
    this.telemetry.emit("choice_selected", {
      kind: "night_market_shift",
      axis: input.action.axis,
      lineIndex: input.action.index,
      direction: input.action.direction,
      previewedOrderIds: [...this.previewedOrderIds],
      completedOrderIds: [...input.completedOrderIds],
      completedRecipeIds: [...input.completedRecipeIds],
      chain: input.chain,
      waitAfterSettledMs,
      previewDurationMs,
      blindSlide,
      stallRule: input.stallId,
    });
    return { blindSlide };
  }
}

export function compareBlindSlideRate(counts: readonly RunBlindCount[]): {
  firstRate: number;
  thirdRate: number;
  improved: boolean;
} {
  const rate = (runOrdinal: number) => {
    const row = counts.find((item) => item.runOrdinal === runOrdinal);
    return row && row.committed > 0 ? row.blind / row.committed : 1;
  };
  const firstRate = rate(1);
  const thirdRate = rate(3);
  return { firstRate, thirdRate, improved: thirdRate < firstRate };
}
```

- [ ] **Step 4: 运行事件测试并检查字段名（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/nightMarketEvents.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
```

Expected: `3 passed`；TypeScript 零错误；事件使用共享 `choice_selected`，负载包含方向、预演订单、完成订单、连灶、等待时长、盲滑判断和摊位规则。

- [ ] **Step 5: 精确提交盲滑指标（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/telemetry/nightMarketEvents.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/nightMarketEvents.test.ts
git commit -m "feat(night-market): measure blind sliding across three runs"
```

Expected: 新提交只包含夜市遥测模块和测试。

### Task 11: 建立高保真资产目录、来源记录和分批预算

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/render/assetCatalog.ts`
- Create: `games/wechat-h5-v2/art/recipes/monster-night-market.json`
- Create: `games/wechat-h5-v2/art/provenance/monster-night-market.json`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/asset-manifest.json`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/cover.webp`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/scene/lamp-street-bg.webp`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/scene/crowd-mid.webp`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/scene/stall-fg.webp`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/scene/weather-rain.webp`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/atlas/chef-spirit.{json,webp}`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/atlas/customers-a.{json,webp}`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/atlas/customers-b.{json,webp}`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/atlas/ingredients-dishes.{json,webp}`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/atlas/night-market-vfx.{json,webp}`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/audio/*.{ogg,m4a}`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/assetCatalog.test.ts`

- [ ] **Step 1: 写资产完整性和预算失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import {
  NIGHT_MARKET_ASSET_CATALOG,
  requiredRuntimeAssetIds,
} from "../../src/render/assetCatalog";

describe("night market asset catalog", () => {
  it("所有运行时必需资产都有唯一 ID 和加载组", () => {
    const ids = NIGHT_MARKET_ASSET_CATALOG.assets.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(requiredRuntimeAssetIds.every((id) => ids.includes(id))).toBe(true);
    expect(NIGHT_MARKET_ASSET_CATALOG.groups.map((group) => group.id)).toEqual([
      "boot", "run", "customers", "audio",
    ]);
  });

  it("首屏 3–5MB、单局 12–18MB、单图集不超过 2048", () => {
    const boot = NIGHT_MARKET_ASSET_CATALOG.groups.find((group) => group.id === "boot")!;
    const run = NIGHT_MARKET_ASSET_CATALOG.groups.filter((group) => group.id !== "audio");
    expect(boot.budgetBytes).toBe(5 * 1024 * 1024);
    expect(run.reduce((sum, group) => sum + group.budgetBytes, 0)).toBeLessThanOrEqual(18 * 1024 * 1024);
    expect(NIGHT_MARKET_ASSET_CATALOG.maxAtlasEdge).toBe(2048);
  });
});
```

- [ ] **Step 2: 运行资产测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/assetCatalog.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/render/assetCatalog'`。

- [ ] **Step 3: 创建类型化资源目录（2–5 分钟）**

`src/render/assetCatalog.ts`：

```ts
export interface NightMarketAsset {
  readonly id: string;
  readonly type: "texture" | "atlas" | "audio";
  readonly path: string;
  readonly groupId: "boot" | "run" | "customers" | "audio";
}

const base = "/assets/monster-night-market";

export const NIGHT_MARKET_ASSET_CATALOG = {
  maxAtlasEdge: 2048,
  groups: [
    { id: "boot", budgetBytes: 5 * 1024 * 1024 },
    { id: "run", budgetBytes: 8 * 1024 * 1024 },
    { id: "customers", budgetBytes: 4 * 1024 * 1024 },
    { id: "audio", budgetBytes: 1 * 1024 * 1024 },
  ],
  assets: [
    { id: "cover", type: "texture", path: `${base}/cover.webp`, groupId: "boot" },
    { id: "scene.bg", type: "texture", path: `${base}/scene/lamp-street-bg.webp`, groupId: "boot" },
    { id: "scene.crowd", type: "texture", path: `${base}/scene/crowd-mid.webp`, groupId: "run" },
    { id: "scene.stall", type: "texture", path: `${base}/scene/stall-fg.webp`, groupId: "boot" },
    { id: "scene.rain", type: "texture", path: `${base}/scene/weather-rain.webp`, groupId: "customers" },
    { id: "atlas.chefSpirit", type: "atlas", path: `${base}/atlas/chef-spirit.json`, groupId: "run" },
    { id: "atlas.customersA", type: "atlas", path: `${base}/atlas/customers-a.json`, groupId: "run" },
    { id: "atlas.customersB", type: "atlas", path: `${base}/atlas/customers-b.json`, groupId: "customers" },
    { id: "atlas.ingredients", type: "atlas", path: `${base}/atlas/ingredients-dishes.json`, groupId: "run" },
    { id: "atlas.vfx", type: "atlas", path: `${base}/atlas/night-market-vfx.json`, groupId: "run" },
    { id: "audio.swipe", type: "audio", path: `${base}/audio/swipe.ogg`, groupId: "audio" },
    { id: "audio.snap", type: "audio", path: `${base}/audio/snap.ogg`, groupId: "audio" },
    { id: "audio.chop", type: "audio", path: `${base}/audio/chop.ogg`, groupId: "audio" },
    { id: "audio.serve", type: "audio", path: `${base}/audio/serve.ogg`, groupId: "audio" },
    { id: "audio.customer", type: "audio", path: `${base}/audio/customer.ogg`, groupId: "audio" },
    { id: "audio.chain", type: "audio", path: `${base}/audio/chain.ogg`, groupId: "audio" },
    { id: "audio.upgrade", type: "audio", path: `${base}/audio/upgrade.ogg`, groupId: "audio" },
    { id: "audio.result", type: "audio", path: `${base}/audio/result.ogg`, groupId: "audio" },
  ] as const satisfies readonly NightMarketAsset[],
} as const;

export const requiredRuntimeAssetIds = [
  "cover", "scene.bg", "scene.crowd", "scene.stall",
  "atlas.chefSpirit", "atlas.customersA", "atlas.customersB",
  "atlas.ingredients", "atlas.vfx", "audio.swipe", "audio.snap",
  "audio.chop", "audio.serve", "audio.customer", "audio.chain",
  "audio.upgrade", "audio.result",
] as const;
```

- [ ] **Step 4: 写入精确美术来源清单（2–5 分钟）**

`art/recipes/monster-night-market.json` 记录下列美术方向，并把每个 `outputs[].source` 指向 `art/source/monster-night-market/`、`outputs[].target` 指向 `apps/monster-night-market/public/assets/monster-night-market/`：

```json
{
  "style": "东方妖怪烟火夜市，高饱和暖灯笼与青蓝夜色，高保真2D手绘，清晰轮廓，竖屏390x844可读，禁止文字水印与现代品牌标识",
  "outputs": [
    {
      "id": "cover",
      "prompt": "年轻妖厨与小灶灵在移动摊车前同时端出三道发光料理，八名轮廓各异的妖怪顾客喷火、结冰、跳舞，灯笼街纵深，中央留标题安全区",
      "path": "cover.webp",
      "usage": "启动封面和大厅卡片"
    },
    {
      "id": "scene",
      "prompt": "同一东方妖怪夜市场景拆为远景灯笼街、中景人群、前景移动摊车与透明雨层，透视和光源完全一致，不包含角色",
      "path": "scene/",
      "usage": "三层视差营业场景"
    },
    {
      "id": "chef-spirit",
      "prompt": "年轻妖厨与圆形灶灵搭档，统一三视图和比例，待机、滑动发力、切配、出餐、升级、胜利、失败动作，8到12fps逐帧拆分，透明背景",
      "path": "atlas/chef-spirit.webp",
      "usage": "主角运行时图集"
    },
    {
      "id": "customers-a",
      "prompt": "火童、冰兔、灯狐、石鬼四名妖怪顾客，独立轮廓与性格，等待、期待、疑惑、暴怒、进食、满足、稀有反应七组动作，透明背景",
      "path": "atlas/customers-a.webp",
      "usage": "首局顾客图集"
    },
    {
      "id": "customers-b",
      "prompt": "云鹤、河童、月猫、大胃王四名妖怪顾客，独立轮廓与性格，等待、期待、疑惑、暴怒、进食、满足、稀有反应七组动作，透明背景",
      "path": "atlas/customers-b.webp",
      "usage": "后续局顾客图集"
    },
    {
      "id": "ingredients-dishes",
      "prompt": "火椒、灵豆腐、月蘑、莲片、云鱼、年糕、玄冰、高汤八种食材及十二道成菜图标，每项同时靠形状和材质区分，64与128像素仍清楚，透明背景",
      "path": "atlas/ingredients-dishes.webp",
      "usage": "棋盘、订单和图鉴"
    },
    {
      "id": "night-market-vfx",
      "prompt": "行列位移残影、配方成形光圈、出餐飞行、三阶连灶火线、喷火、结冰、跳舞音符、金币庆典，逐帧透明背景特效图集",
      "path": "atlas/night-market-vfx.webp",
      "usage": "核心反馈特效"
    }
  ]
}
```

- [ ] **Step 5: 按来源清单生成场景和角色批次（每个调用 2–5 分钟）**

按 `art/recipes/monster-night-market.json` 完成源图后，执行共享资产导出入口：

```bash
npm.cmd --prefix games/wechat-h5-v2 run assets:export -- art/recipes/monster-night-market.json
```

Expected: 每个命令只写入清单中的目标路径；所有透明图集边缘无底色污染，角色动作帧锚点固定，图集最大边不超过 2048。

- [ ] **Step 6: 生成原创/程序合成音效并提供双格式（每个调用 2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 run assets:export -- art/recipes/monster-night-market-audio.json
```

Expected: 8 个 cue 均有 `.ogg` 和 `.m4a`；无来源不明采样；连锁 cue 可按 1、2、3 阶无爆音叠放。

- [ ] **Step 7: 生成实际清单、SHA-256 和 provenance（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 run assets:manifest -- art/recipes/monster-night-market.json
npm.cmd --prefix games/wechat-h5-v2 run assets:validate -- art/recipes/monster-night-market.json
```

Expected: `asset-catalog.json` 和 `provenance.json` 包含每个实际文件的字节数、SHA-256、生成日期、用途、来源提示词和人工修订状态；输出 `PASS boot<=5MB run<=18MB atlas<=2048`。

- [ ] **Step 8: 运行资产测试（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/assetCatalog.test.ts
```

Expected: `2 passed`。

- [ ] **Step 9: 精确提交高保真资产批次（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/render/assetCatalog.ts games/wechat-h5-v2/art/recipes/monster-night-market.json games/wechat-h5-v2/art/recipes/monster-night-market-audio.json games/wechat-h5-v2/art/provenance/monster-night-market.json games/wechat-h5-v2/apps/monster-night-market/public/assets/asset-manifest.json games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/cover.webp games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/scene games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/atlas games/wechat-h5-v2/apps/monster-night-market/public/assets/monster-night-market/audio games/wechat-h5-v2/apps/monster-night-market/tests/unit/assetCatalog.test.ts
git commit -m "feat(night-market): add production art audio and asset provenance"
```

Expected: 新提交只包含夜市资产、目录、来源记录和资产测试。

### Task 12: 实现 Pixi 高保真场景、幽灵预演和结算动画

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/render/animations.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/render/NightMarketScene.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/animations.test.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/integration/sceneLayout.test.ts`

- [ ] **Step 1: 写动画事务和竖屏布局失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { buildAnimationTimeline } from "../../src/render/animations";
import { computeNightMarketLayout } from "../../src/render/NightMarketScene";

describe("night market presentation", () => {
  it("成单时按位移、吸附、出餐、顾客反应和连灶顺序播放", () => {
    expect(buildAnimationTimeline({ completedOrders: 2, chain: 3, reducedMotion: false }))
      .toEqual([
        { id: "shift", durationMs: 180 },
        { id: "snap", durationMs: 90 },
        { id: "serve", durationMs: 220 },
        { id: "customer", durationMs: 260 },
        { id: "festival", durationMs: 420 },
      ]);
  });

  it.each([[360, 800], [390, 844], [430, 932]])(
    "%ix%i 下棋盘和底部操作区不被裁切",
    (width, height) => {
      const layout = computeNightMarketLayout(width, height);
      expect(layout.board.x).toBeGreaterThanOrEqual(12);
      expect(layout.board.x + layout.board.size).toBeLessThanOrEqual(width - 12);
      expect(layout.board.y + layout.board.size).toBeLessThan(layout.actionBar.y);
      expect(layout.actionBar.y + layout.actionBar.height).toBeLessThanOrEqual(height);
    },
  );
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/animations.test.ts apps/monster-night-market/tests/integration/sceneLayout.test.ts
```

Expected: `FAIL`，错误包含 `animations` 或 `NightMarketScene` 未定义。

- [ ] **Step 3: 实现普通、减弱动态和低性能动画时序（2–5 分钟）**

`src/render/animations.ts`：

```ts
export interface AnimationStep {
  readonly id: "shift" | "snap" | "serve" | "customer" | "festival";
  readonly durationMs: number;
}

export function buildAnimationTimeline(input: {
  completedOrders: number;
  chain: number;
  reducedMotion: boolean;
}): AnimationStep[] {
  const scale = input.reducedMotion ? 0.35 : 1;
  const step = (
    id: AnimationStep["id"],
    durationMs: number,
  ): AnimationStep => ({ id, durationMs: Math.round(durationMs * scale) });
  const timeline = [step("shift", 180), step("snap", 90)];
  if (input.completedOrders > 0) {
    timeline.push(step("serve", 220), step("customer", 260));
  }
  if (input.chain >= 3) timeline.push(step("festival", 420));
  return timeline;
}

export async function playTimeline(
  timeline: readonly AnimationStep[],
  play: (step: AnimationStep) => Promise<void>,
): Promise<void> {
  for (const step of timeline) await play(step);
}
```

- [ ] **Step 4: 实现安全区布局和真实贴图场景（2–5 分钟）**

`src/render/NightMarketScene.ts`：

```ts
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import type { AssetLoader } from "@gamehub/h5-assets";
import type { Board, ShiftPreview } from "../model/types";

export interface NightMarketLayout {
  readonly board: { x: number; y: number; size: number };
  readonly orders: { x: number; y: number; width: number; height: number };
  readonly actionBar: { x: number; y: number; width: number; height: number };
}

export function computeNightMarketLayout(width: number, height: number): NightMarketLayout {
  const horizontalPadding = 12;
  const size = Math.min(width - horizontalPadding * 2, Math.floor(height * 0.46));
  const boardY = Math.max(210, Math.floor(height * 0.31));
  const actionHeight = 76;
  return {
    board: { x: Math.floor((width - size) / 2), y: boardY, size },
    orders: { x: 12, y: 52, width: width - 24, height: 142 },
    actionBar: { x: 0, y: height - actionHeight, width, height: actionHeight },
  };
}

export class NightMarketScene {
  readonly root = new Container();
  private readonly boardLayer = new Container();
  private readonly ghostLayer = new Container();
  private readonly hudLayer = new Container();
  private layout: NightMarketLayout;

  constructor(
    private readonly app: Application,
    private readonly assets: AssetLoader,
  ) {
    this.layout = computeNightMarketLayout(app.screen.width, app.screen.height);
    const background = new Sprite(assets.get<Texture>("scene.bg"));
    background.width = app.screen.width;
    background.height = app.screen.height;
    const crowd = new Sprite(assets.get<Texture>("scene.crowd"));
    crowd.anchor.set(0.5, 1);
    crowd.position.set(app.screen.width / 2, app.screen.height - 72);
    const stall = new Sprite(assets.get<Texture>("scene.stall"));
    stall.anchor.set(0.5, 1);
    stall.position.set(app.screen.width / 2, app.screen.height);
    this.root.addChild(background, crowd, stall, this.boardLayer, this.ghostLayer, this.hudLayer);
  }

  resize(width: number, height: number): void {
    this.layout = computeNightMarketLayout(width, height);
  }

  renderBoard(board: Board): void {
    this.boardLayer.removeChildren().forEach((child) => child.destroy());
    const cellSize = this.layout.board.size / 4;
    board.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
      const frame = new Graphics()
        .roundRect(3, 3, cellSize - 6, cellSize - 6, 14)
        .fill({ color: cell.frozen > 0 ? 0x8ddcff : 0x3a1624, alpha: 0.88 });
      const ingredient = new Sprite(
        this.assets.get<Texture>(`ingredient.${cell.ingredient}`),
      );
      ingredient.anchor.set(0.5);
      ingredient.width = ingredient.height = cellSize * 0.66;
      ingredient.position.set(cellSize / 2, cellSize / 2);
      const cellView = new Container({ children: [frame, ingredient] });
      cellView.position.set(
        this.layout.board.x + columnIndex * cellSize,
        this.layout.board.y + rowIndex * cellSize,
      );
      this.boardLayer.addChild(cellView);
    }));
  }

  renderPreview(preview: ShiftPreview): void {
    this.ghostLayer.removeChildren().forEach((child) => child.destroy());
    const text = new Text({
      text: preview.completedOrderIds.length > 0
        ? `将完成 ${preview.completedOrderIds.length} 单`
        : "本步不会成单",
      style: { fill: 0xfff2c2, fontSize: 18, fontWeight: "700" },
    });
    text.position.set(this.layout.orders.x + 12, this.layout.orders.y + 108);
    this.ghostLayer.addChild(text);
  }

  announceFailure(reason: string): void {
    this.hudLayer.removeChildren().forEach((child) => child.destroy());
    const text = new Text({
      text: reason,
      style: { fill: 0xffffff, fontSize: 16, wordWrap: true, wordWrapWidth: 330 },
    });
    text.position.set(24, this.layout.actionBar.y + 16);
    this.hudLayer.addChild(text);
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
```

- [ ] **Step 5: 运行表现层测试（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/animations.test.ts apps/monster-night-market/tests/integration/sceneLayout.test.ts
```

Expected: `4 passed`；三个竖屏视口都通过安全区断言。

- [ ] **Step 6: 精确提交场景和动画（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/render/animations.ts games/wechat-h5-v2/apps/monster-night-market/src/render/NightMarketScene.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/animations.test.ts games/wechat-h5-v2/apps/monster-night-market/tests/integration/sceneLayout.test.ts
git commit -m "feat(night-market): render predictive board and festival feedback"
```

Expected: 新提交只包含夜市场景、动画和相应测试。

### Task 13: 装配玩法控制器并安装只读 AI 试玩钩子

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/app/createNightMarketApp.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/testing/installNightMarketHooks.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/integration/appController.test.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/integration/testHooks.test.ts`

- [ ] **Step 1: 写预演不落盘、提交落盘和失败解释的失败测试（2–5 分钟）**

```ts
import { describe, expect, it, vi } from "vitest";
import { createNightMarketController } from "../../src/app/createNightMarketApp";

describe("NightMarketController", () => {
  it("预演不改变逻辑棋盘，提交后只变化一次", async () => {
    const scene = {
      renderBoard: vi.fn(),
      renderPreview: vi.fn(),
      announceFailure: vi.fn(),
      destroy: vi.fn(),
    };
    const controller = createNightMarketController({
      seed: "controller-001",
      stallId: "grill",
      scene,
      telemetry: { emit: vi.fn() } as never,
      audio: { play: vi.fn() } as never,
      accessibility: { announce: vi.fn() } as never,
      animate: async () => {},
    });
    const before = controller.snapshot().boardKey;
    controller.preview({ axis: "row", index: 0, direction: "right" }, 1_000);
    expect(controller.snapshot().boardKey).toBe(before);
    await controller.commit({ axis: "row", index: 0, direction: "right" }, 1_200);
    expect(controller.snapshot().boardKey).not.toBe(before);
    expect(scene.renderBoard).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 运行控制器测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/integration/appController.test.ts
```

Expected: `FAIL`，错误包含 `createNightMarketController` 未定义。

- [ ] **Step 3: 实现同一生产规则驱动的控制器（2–5 分钟）**

`src/app/createNightMarketApp.ts`：

```ts
import type { AudioBus } from "@gamehub/h5-audio";
import type { AccessibilityController } from "@gamehub/h5-accessibility";
import type { TelemetryClient } from "@gamehub/h5-telemetry";
import { boardKey, shiftBoard } from "../board/board";
import { RECIPES } from "../model/content";
import type { ShiftAction, ShiftPreview, StallId } from "../model/types";
import { previewOrders } from "../rules/orderEngine";
import { applyShift, createRun, type NightMarketRun } from "../run/runMachine";
import { BlindSlideTracker } from "../telemetry/nightMarketEvents";

interface ScenePort {
  renderBoard(board: NightMarketRun["board"]): void;
  renderPreview(preview: ShiftPreview): void;
  announceFailure(reason: string): void;
  destroy(): void;
}

interface ControllerDeps {
  readonly seed: string;
  readonly stallId: StallId;
  readonly scene: ScenePort;
  readonly telemetry: Pick<TelemetryClient, "emit">;
  readonly audio: Pick<AudioBus, "play">;
  readonly accessibility: Pick<AccessibilityController, "announce">;
  readonly animate: (preview: ShiftPreview) => Promise<void>;
}

export interface NightMarketController {
  preview(action: ShiftAction, at: number): ShiftPreview;
  commit(action: ShiftAction, at: number): Promise<void>;
  reset(seed: string): void;
  awaitSettled(): Promise<void>;
  snapshot(): {
    seed: string;
    boardKey: string;
    score: number;
    chain: number;
    festivalCount: number;
    moveCount: number;
    status: NightMarketRun["status"];
  };
  dispose(): void;
}

export function createNightMarketController(deps: ControllerDeps): NightMarketController {
  let run = createRun({ seed: deps.seed, stallId: deps.stallId });
  let settled: Promise<void> = Promise.resolve();
  const blind = new BlindSlideTracker(deps.telemetry);
  deps.scene.renderBoard(run.board);

  const makePreview = (action: ShiftAction): ShiftPreview => {
    const board = shiftBoard(run.board, action);
    const resolution = previewOrders(board, run.orders, run.orderProgress, RECIPES);
    return {
      action,
      board,
      completedOrderIds: resolution.completedOrderIds,
      completedRecipeIds: resolution.completedRecipeIds,
    };
  };

  return {
    preview(action, at) {
      const result = makePreview(action);
      blind.markPreview(at, result.completedOrderIds);
      deps.scene.renderPreview(result);
      return result;
    },
    async commit(action, at) {
      const preview = makePreview(action);
      run = applyShift(run, action);
      blind.commit(at, {
        action,
        completedOrderIds: preview.completedOrderIds,
        completedRecipeIds: preview.completedRecipeIds,
        chain: run.chain,
        stallId: run.stallId,
      });
      settled = deps.animate(preview).then(() => {
        deps.scene.renderBoard(run.board);
        blind.markSettled(at);
        if (preview.completedOrderIds.length > 0) {
          deps.audio.play(run.festivalCount > 0 ? "audio.chain" : "audio.serve");
          deps.accessibility.announce(`完成 ${preview.completedOrderIds.length} 单`);
        } else {
          deps.scene.announceFailure(run.lastExplanation);
          deps.accessibility.announce(run.lastExplanation, "polite");
        }
      });
      await settled;
    },
    reset(seed) {
      run = createRun({ seed, stallId: run.stallId });
      deps.scene.renderBoard(run.board);
    },
    awaitSettled: () => settled,
    snapshot: () => ({
      seed: run.seed,
      boardKey: boardKey(run.board),
      score: run.score,
      chain: run.chain,
      festivalCount: run.festivalCount,
      moveCount: run.moveCount,
      status: run.status,
    }),
    dispose: () => deps.scene.destroy(),
  };
}
```

- [ ] **Step 4: 写测试钩子只提供观察和真实动作入口的失败测试（2–5 分钟）**

`tests/integration/testHooks.test.ts`：

```ts
import { describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@gamehub/h5-testing";
import { installNightMarketHooks } from "../../src/testing/installNightMarketHooks";

describe("night market test hooks", () => {
  it("test=1 时暴露快照、预演、提交和等待，不暴露强制胜利", async () => {
    const harness = createTestHarness({
      search: "?test=1&seed=42",
      gameId: "monster-night-market",
      defaultSeed: 1,
      maxSpeed: 8,
    });
    const controller = {
      snapshot: vi.fn(() => ({ seed: "42", moveCount: 0 })),
      preview: vi.fn(),
      commit: vi.fn(),
      awaitSettled: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    };
    installNightMarketHooks(harness.registry, controller as never);
    expect(harness.registry.list()).toEqual([
      "nightMarket.awaitSettled",
      "nightMarket.commit",
      "nightMarket.preview",
      "nightMarket.reset",
      "nightMarket.snapshot",
    ]);
    expect(harness.registry.list()).not.toContain("nightMarket.forceWin");
  });
});
```

- [ ] **Step 5: 运行钩子测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/integration/testHooks.test.ts
```

Expected: `FAIL`，错误包含 `installNightMarketHooks` 未定义。

- [ ] **Step 6: 实现 test=1 钩子注册器（2–5 分钟）**

`src/testing/installNightMarketHooks.ts`：

```ts
import type { TestHookRegistry } from "@gamehub/h5-testing";
import type { NightMarketController } from "../app/createNightMarketApp";
import type { ShiftAction } from "../model/types";

export function installNightMarketHooks(
  registry: TestHookRegistry,
  controller: NightMarketController,
): () => void {
  const disposers = [
    registry.register("nightMarket.awaitSettled", () => controller.awaitSettled()),
    registry.register("nightMarket.commit", (action: ShiftAction, at: number) =>
      controller.commit(action, at)),
    registry.register("nightMarket.preview", (action: ShiftAction, at: number) =>
      controller.preview(action, at)),
    registry.register("nightMarket.reset", (seed: string) => controller.reset(seed)),
    registry.register("nightMarket.snapshot", () => controller.snapshot()),
  ];
  return () => disposers.reverse().forEach((dispose) => dispose());
}
```

- [ ] **Step 7: 运行控制器和钩子集成测试（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/integration/appController.test.ts apps/monster-night-market/tests/integration/testHooks.test.ts
```

Expected: `2 passed`；钩子列表没有推进时钟、注入资源或强制胜负入口。

- [ ] **Step 8: 精确提交控制器和测试钩子（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/app/createNightMarketApp.ts games/wechat-h5-v2/apps/monster-night-market/src/testing/installNightMarketHooks.ts games/wechat-h5-v2/apps/monster-night-market/tests/integration/appController.test.ts games/wechat-h5-v2/apps/monster-night-market/tests/integration/testHooks.test.ts
git commit -m "feat(night-market): compose gameplay and gated AI hooks"
```

Expected: 新提交只包含夜市控制器、测试钩子和集成测试。

### Task 14: 实现首页、营业、结算、成长、重试和每日挑战完整流程

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/app/flowMachine.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/app/NightMarketShell.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/flowMachine.test.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/integration/fullFlow.test.ts`

- [ ] **Step 1: 写从首页到三局、成长和每日挑战的失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import {
  createFlow,
  finishRun,
  openDaily,
  openMeta,
  replay,
  startNormalRun,
} from "../../src/app/flowMachine";
import { createDefaultSave } from "../../src/meta/nightMarketSave";

describe("night market flow", () => {
  it("无需刷新可从首页连续完成三局并进入成长页", () => {
    let flow = createFlow(createDefaultSave());
    expect(flow.screen).toBe("home");
    flow = startNormalRun(flow, "normal-1");
    flow = finishRun(flow, {
      seed: "normal-1", score: 700,
      completedRecipeIds: ["emberTofu"], metCustomerIds: ["fireCub"],
      nearMisses: [{ orderId: "miss-1", missingRecipeId: "fishBroth", distance: 1 }],
    });
    expect(flow.screen).toBe("result");
    flow = replay(flow);
    flow = finishRun(flow, {
      seed: flow.activeSeed!, score: 850,
      completedRecipeIds: ["fishBroth"], metCustomerIds: ["riverImp"],
      nearMisses: [],
    });
    flow = replay(flow);
    flow = finishRun(flow, {
      seed: flow.activeSeed!, score: 1_000,
      completedRecipeIds: ["doubleSkewer"], metCustomerIds: ["lanternFox"],
      nearMisses: [],
    });
    expect(openMeta(flow).save.runCount).toBe(3);
    expect(openMeta(flow).screen).toBe("meta");
  });

  it("每日挑战保留日期键且结算后可重试同一 seed", () => {
    const daily = openDaily(createFlow(createDefaultSave()), "2026-07-29");
    expect(daily.activeSeed).toBe("monster-night-market:daily:v1:2026-07-29");
    expect(replay({ ...daily, screen: "result" }).activeSeed).toBe(daily.activeSeed);
  });
});
```

- [ ] **Step 2: 运行测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/flowMachine.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/app/flowMachine'`。

- [ ] **Step 3: 实现没有签到惩罚的流程状态机（2–5 分钟）**

`src/app/flowMachine.ts`：

```ts
import { resolveDailySeed } from "../daily/dailyChallenge";
import {
  applyRunSummary,
  type NightMarketSaveV1,
  type RunSummary,
} from "../meta/nightMarketSave";

export interface NightMarketFlow {
  readonly screen: "home" | "playing" | "result" | "meta" | "daily";
  readonly save: NightMarketSaveV1;
  readonly activeSeed: string | null;
  readonly activeMode: "normal" | "daily" | null;
  readonly lastSummary: RunSummary | null;
}

export function createFlow(save: NightMarketSaveV1): NightMarketFlow {
  return {
    screen: "home",
    save,
    activeSeed: null,
    activeMode: null,
    lastSummary: null,
  };
}

export function startNormalRun(flow: NightMarketFlow, seed: string): NightMarketFlow {
  return { ...flow, screen: "playing", activeSeed: seed, activeMode: "normal" };
}

export function openDaily(flow: NightMarketFlow, dailyKey: string): NightMarketFlow {
  return {
    ...flow,
    screen: "playing",
    activeSeed: resolveDailySeed(dailyKey),
    activeMode: "daily",
  };
}

export function finishRun(
  flow: NightMarketFlow,
  summary: RunSummary,
): NightMarketFlow {
  return {
    ...flow,
    screen: "result",
    save: applyRunSummary(flow.save, summary),
    lastSummary: summary,
  };
}

export function replay(flow: NightMarketFlow): NightMarketFlow {
  if (!flow.activeSeed) throw new Error("Cannot replay without an active seed");
  const nextSeed = flow.activeMode === "daily"
    ? flow.activeSeed
    : `${flow.activeSeed}:retry:${flow.save.runCount + 1}`;
  return { ...flow, screen: "playing", activeSeed: nextSeed };
}

export function openMeta(flow: NightMarketFlow): NightMarketFlow {
  return { ...flow, screen: "meta" };
}

export function returnHome(flow: NightMarketFlow): NightMarketFlow {
  return { ...flow, screen: "home" };
}
```

- [ ] **Step 4: 写 DOM 壳完整交互的失败测试（2–5 分钟）**

`tests/integration/fullFlow.test.ts`：

```ts
import { describe, expect, it, vi } from "vitest";
import { NightMarketShell } from "../../src/app/NightMarketShell";

describe("NightMarketShell", () => {
  it("首页只给一个主行动，结算提供同种子重试、成长和结束出口", () => {
    document.body.innerHTML = '<main id="shell"></main><div id="live"></div>';
    const actions = {
      start: vi.fn(), replay: vi.fn(), meta: vi.fn(), home: vi.fn(), daily: vi.fn(),
    };
    const shell = new NightMarketShell(
      document.querySelector("#shell")!,
      document.querySelector("#live")!,
      actions,
    );
    shell.renderHome();
    expect(document.querySelectorAll("button")).toHaveLength(2);
    expect(document.querySelector('[data-action="start"]')?.textContent).toBe("开始营业");
    shell.renderResult({
      score: 880,
      nearMisses: [{ orderId: "x", missingRecipeId: "lotusIce", distance: 1 }],
    });
    expect(document.querySelector('[data-action="replay"]')).not.toBeNull();
    expect(document.querySelector('[data-action="home"]')).not.toBeNull();
    expect(document.body.textContent).toContain("莲花冰盏只差一步");
  });
});
```

- [ ] **Step 5: 实现可聚焦且不过量提醒的 DOM 壳（2–5 分钟）**

`src/app/NightMarketShell.ts`：

```ts
import type { NearMiss } from "../meta/nightMarketSave";

interface ShellActions {
  readonly start: () => void;
  readonly replay: () => void;
  readonly meta: () => void;
  readonly home: () => void;
  readonly daily: () => void;
}

const RECIPE_LABEL: Record<string, string> = {
  emberTofu: "火纹豆腐",
  mushroomSkewer: "月蘑串",
  lotusIce: "莲花冰盏",
  fishBroth: "云鱼高汤",
  spicyRiceCake: "火椒年糕",
  frozenTofu: "玄冰豆腐",
  doubleSkewer: "双味串",
  borrowedFireSoup: "借火汤",
  coldLotusCup: "冰莲杯",
  sharedHotpot: "共享火锅",
  vipTwinDish: "贵客双拼",
  midnightFeast: "子夜盛宴",
};

export class NightMarketShell {
  constructor(
    private readonly root: HTMLElement,
    private readonly liveRegion: HTMLElement,
    private readonly actions: ShellActions,
  ) {}

  private bind(): void {
    const map: Record<string, () => void> = {
      start: this.actions.start,
      replay: this.actions.replay,
      meta: this.actions.meta,
      home: this.actions.home,
      daily: this.actions.daily,
    };
    this.root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => map[button.dataset.action!]?.());
    });
  }

  renderHome(): void {
    this.root.innerHTML = `
      <section class="panel home-panel" aria-labelledby="game-title">
        <p class="eyebrow">东方妖怪烟火夜市</p>
        <h1 id="game-title">怪兽夜市</h1>
        <p>滑动一整行或一整列，一步端出多道菜。</p>
        <button class="primary" data-action="start">开始营业</button>
        <button class="secondary" data-action="daily">每日案板</button>
      </section>`;
    this.bind();
  }

  renderPlaying(): void {
    this.root.innerHTML = `
      <section class="hud" aria-label="营业信息">
        <div id="orders" aria-label="当前最多两张订单"></div>
        <div id="timer" aria-label="营业剩余时间"></div>
      </section>`;
  }

  renderResult(input: { score: number; nearMisses: readonly NearMiss[] }): void {
    const misses = input.nearMisses.slice(0, 3).map((item) =>
      `<li>${RECIPE_LABEL[item.missingRecipeId]}只差${item.distance}步</li>`,
    ).join("");
    this.root.innerHTML = `
      <section class="panel result-panel" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">营业结束</h2>
        <p class="score">${input.score} 烟火币</p>
        <ul>${misses || "<li>本局没有一步之差订单</li>"}</ul>
        <button class="primary" data-action="replay">重试这张案板</button>
        <button class="secondary" data-action="meta">查看摊位成长</button>
        <button class="quiet" data-action="home">结束本次游玩</button>
      </section>`;
    this.liveRegion.textContent = `营业结束，得分 ${input.score}`;
    this.bind();
  }

  renderMeta(input: { unlockedRecipes: number; customers: number }): void {
    this.root.innerHTML = `
      <section class="panel meta-panel">
        <h2>摊位成长</h2>
        <p>已发现 ${input.unlockedRecipes} 道规则配方</p>
        <p>已接待 ${input.customers} 名怪客</p>
        <p>成长只解锁新规则、图鉴与外观，不提高永久攻击数值。</p>
        <button class="primary" data-action="home">返回夜市</button>
      </section>`;
    this.bind();
  }
}
```

- [ ] **Step 6: 运行流程和壳测试（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/flowMachine.test.ts apps/monster-night-market/tests/integration/fullFlow.test.ts
```

Expected: `4 passed`；完整流程无需页面刷新；结果页存在明确结束出口。

- [ ] **Step 7: 精确提交完整流程（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/src/app/flowMachine.ts games/wechat-h5-v2/apps/monster-night-market/src/app/NightMarketShell.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/flowMachine.test.ts games/wechat-h5-v2/apps/monster-night-market/tests/integration/fullFlow.test.ts
git commit -m "feat(night-market): complete home run result and growth flow"
```

Expected: 新提交只包含流程状态机、页面壳和测试。

### Task 15: 装配共享运行时、真实触控、音频解锁、存档和独立入口

**Files:**
- Modify: `games/wechat-h5-v2/apps/monster-night-market/index.html`
- Modify: `games/wechat-h5-v2/apps/monster-night-market/vite.config.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/styles.css`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/input/mapInputIntent.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/app/bootstrapNightMarket.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/main.ts`
- Modify: `games/wechat-h5-v2/apps/monster-night-market/src/app/createNightMarketApp.ts`
- Modify: `games/wechat-h5-v2/apps/monster-night-market/src/render/NightMarketScene.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/unit/mapInputIntent.test.ts`
- Test: `games/wechat-h5-v2/apps/monster-night-market/tests/integration/bootstrap.test.ts`

- [ ] **Step 1: 写拖拽预演与松手提交映射失败测试（2–5 分钟）**

```ts
import { describe, expect, it } from "vitest";
import { mapInputIntent } from "../../src/input/mapInputIntent";

const board = { x: 20, y: 240, size: 320 };

describe("mapInputIntent", () => {
  it("drag-move 在松手前给出横向第 2 行预演动作", () => {
    expect(mapInputIntent({
      kind: "drag-move",
      origin: { x: 60, y: 365, pointerId: 1, at: 0 },
      point: { x: 92, y: 365, pointerId: 1, at: 80 },
    }, board)).toEqual({
      phase: "preview",
      action: { axis: "row", index: 1, direction: "right" },
    });
  });

  it("swipe 只映射为一次提交，棋盘外输入被忽略", () => {
    expect(mapInputIntent({
      kind: "swipe",
      start: { x: 180, y: 285, pointerId: 2, at: 0 },
      end: { x: 120, y: 285, pointerId: 2, at: 120 },
      axis: "x",
      direction: "left",
      delta: -60,
      durationMs: 120,
    }, board)).toEqual({
      phase: "commit",
      action: { axis: "row", index: 0, direction: "left" },
    });
    expect(mapInputIntent({
      kind: "swipe",
      start: { x: 10, y: 100, pointerId: 3, at: 0 },
      end: { x: 80, y: 100, pointerId: 3, at: 100 },
      axis: "x",
      direction: "right",
      delta: 70,
      durationMs: 100,
    }, board)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行输入映射测试并确认红灯（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/mapInputIntent.test.ts
```

Expected: `FAIL`，错误包含 `Cannot find module '../../src/input/mapInputIntent'`。

- [ ] **Step 3: 实现共享 `InputIntent` 到棋盘动作的唯一映射（2–5 分钟）**

`src/input/mapInputIntent.ts`：

```ts
import type { InputIntent } from "@gamehub/h5-input";
import type { ShiftAction } from "../model/types";

interface BoardRect { readonly x: number; readonly y: number; readonly size: number; }
type MappedInput =
  | { readonly phase: "preview" | "commit"; readonly action: ShiftAction }
  | { readonly phase: "cancel" };

function indexAt(value: number, origin: number, size: number): 0 | 1 | 2 | 3 | null {
  const normalized = (value - origin) / size;
  if (normalized < 0 || normalized >= 1) return null;
  return Math.floor(normalized * 4) as 0 | 1 | 2 | 3;
}

export function mapInputIntent(
  intent: InputIntent,
  board: BoardRect,
): MappedInput | null {
  if (intent.kind === "cancel" || intent.kind === "drag-end") return { phase: "cancel" };
  if (intent.kind !== "drag-move" && intent.kind !== "swipe") return null;
  const start = intent.kind === "swipe" ? intent.start : intent.origin;
  const end = intent.kind === "swipe" ? intent.end : intent.point;
  const horizontal = intent.kind === "swipe"
    ? intent.axis === "x"
    : Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const index = horizontal
    ? indexAt(start.y, board.y, board.size)
    : indexAt(start.x, board.x, board.size);
  if (index === null) return null;
  const direction = horizontal
    ? (end.x >= start.x ? "right" : "left")
    : (end.y >= start.y ? "down" : "up");
  return {
    phase: intent.kind === "swipe" ? "commit" : "preview",
    action: {
      axis: horizontal ? "row" : "column",
      index,
      direction,
    },
  };
}
```

- [ ] **Step 4: 为控制器增加固定步进、结算摘要和清预演接口（2–5 分钟）**

在 `src/app/createNightMarketApp.ts` 的 `NightMarketController` 中加入：

```ts
tick(stepSeconds: number): boolean;
summary(): RunSummary;
clearPreview(): void;
```

同时把导入改为：

```ts
import { advanceClock, applyShift, createRun, type NightMarketRun } from "../run/runMachine";
import type { RunSummary } from "../meta/nightMarketSave";
```

在返回对象中加入完整实现：

```ts
tick(stepSeconds) {
  const wasPlaying = run.status === "playing";
  run = advanceClock(run, stepSeconds * 1_000);
  return wasPlaying && run.status === "ended";
},
summary() {
  return {
    seed: run.seed,
    score: run.score,
    completedRecipeIds: [...run.completedRecipeIds],
    metCustomerIds: [...run.metCustomerIds],
    nearMisses: [...run.nearMisses].slice(0, 3),
  };
},
clearPreview() {
  deps.scene.clearPreview();
},
```

在 `ScenePort` 和 `NightMarketScene` 中加入：

```ts
clearPreview(): void {
  this.ghostLayer.removeChildren().forEach((child) => child.destroy());
}
```

在 `NightMarketRun` 中增加并在 `createRun` 初始化：

```ts
readonly completedRecipeIds: ReadonlySet<RecipeId>;
readonly metCustomerIds: ReadonlySet<CustomerId>;
readonly nearMisses: readonly NearMiss[];
```

在 `applyShift` 返回值中使用本步解析结果更新：

```ts
completedRecipeIds: new Set([
  ...run.completedRecipeIds,
  ...resolution.completedRecipeIds,
]),
metCustomerIds: new Set([
  ...run.metCustomerIds,
  ...run.orders.map((order) => order.customerId),
]),
nearMisses: resolution.explanations
  .filter((item) => item.status === "missing")
  .map((item) => ({
    orderId: item.orderId,
    missingRecipeId: item.expectedRecipeId,
    distance: 1,
  }))
  .slice(0, 3),
```

- [ ] **Step 5: 写启动装配的失败集成测试（2–5 分钟）**

`tests/integration/bootstrap.test.ts`：

```ts
import { describe, expect, it, vi } from "vitest";
import { bootstrapNightMarket } from "../../src/app/bootstrapNightMarket";

describe("bootstrapNightMarket", () => {
  it("先加载 boot，点击开始后加载 run，并用固定步进结束营业", async () => {
    document.body.innerHTML =
      '<div id="game"></div><main id="shell"></main><div id="live"></div>';
    const assets = { loadGroup: vi.fn(async () => {}), get: vi.fn() };
    const runtime = { start: vi.fn(), dispose: vi.fn() };
    const app = await bootstrapNightMarket({
      root: document.querySelector("#game")!,
      shellRoot: document.querySelector("#shell")!,
      liveRegion: document.querySelector("#live")!,
      assets: assets as never,
      runtime: runtime as never,
      input: { subscribe: vi.fn(() => vi.fn()), setEnabled: vi.fn(), cancelActive: vi.fn(), destroy: vi.fn() } as never,
      audio: { unlockFromGesture: vi.fn(async () => true), play: vi.fn(), dispose: vi.fn() } as never,
      save: { load: vi.fn(async () => ({ payload: { schemaVersion: 1, runCount: 0 } })), save: vi.fn() } as never,
      telemetry: { beginRun: vi.fn(), emit: vi.fn(), endRun: vi.fn(), dispose: vi.fn() } as never,
      accessibility: { announce: vi.fn(), dispose: vi.fn() } as never,
      testHarness: { enabled: false, registry: { register: vi.fn() }, expose: vi.fn(), dispose: vi.fn() } as never,
      now: () => 1_000,
    });
    expect(assets.loadGroup).toHaveBeenNthCalledWith(1, "boot");
    expect(runtime.start).toHaveBeenCalledOnce();
    await app.startRun("normal-001");
    expect(assets.loadGroup).toHaveBeenCalledWith("run");
  });
});
```

- [ ] **Step 6: 实现应用编排器（2–5 分钟）**

`src/app/bootstrapNightMarket.ts` 创建以下公开契约，并将 Task 13、14 的控制器与流程组合：

```ts
import type { AccessibilityController } from "@gamehub/h5-accessibility";
import type { AssetLoader } from "@gamehub/h5-assets";
import type { AudioBus } from "@gamehub/h5-audio";
import type { InputController } from "@gamehub/h5-input";
import type { GameRuntime } from "@gamehub/h5-runtime";
import type { SaveStore } from "@gamehub/h5-save";
import type { TelemetryClient } from "@gamehub/h5-telemetry";
import type { TestHarness } from "@gamehub/h5-testing";
import type { NightMarketSaveV1 } from "../meta/nightMarketSave";

export interface BootstrapDeps {
  root: HTMLElement;
  shellRoot: HTMLElement;
  liveRegion: HTMLElement;
  assets: AssetLoader;
  runtime: GameRuntime;
  input: InputController;
  audio: AudioBus;
  save: SaveStore<NightMarketSaveV1>;
  telemetry: TelemetryClient;
  accessibility: AccessibilityController;
  testHarness: TestHarness;
  now: () => number;
}

export interface BootstrappedNightMarket {
  startRun(seed: string): Promise<void>;
  dispose(): Promise<void>;
}
```

实现必须按以下顺序执行，且每一行均调用前述公开接口：

```ts
await deps.assets.loadGroup("boot");
const loaded = await deps.save.load();
let flow = createFlow(loaded.payload);
const shell = new NightMarketShell(deps.shellRoot, deps.liveRegion, {
  start: () => { void startRun(`normal:${deps.now()}`); },
  replay: () => { flow = replay(flow); void startRun(flow.activeSeed!); },
  meta: () => {
    flow = openMeta(flow);
    shell.renderMeta({
      unlockedRecipes: flow.save.unlockedRecipeIds.length,
      customers: flow.save.customerCodexIds.length,
    });
  },
  home: () => { flow = returnHome(flow); shell.renderHome(); },
  daily: () => { void startRun(resolveDailySeed(dailyKeyAt(new Date(deps.now())))); },
});
shell.renderHome();
deps.runtime.start();
if (deps.testHarness.enabled) {
  deps.testHarness.expose(window);
}
```

`startRun(seed)` 的完整事务顺序必须是：

```ts
await deps.audio.unlockFromGesture();
await deps.assets.loadGroup("run");
deps.telemetry.beginRun(seed);
flow = startNormalRun(flow, seed);
shell.renderPlaying();
controller?.dispose();
controller = createNightMarketController({
  seed,
  stallId: flow.save.unlockedStallIds[0],
  scene,
  telemetry: deps.telemetry,
  audio: deps.audio,
  accessibility: deps.accessibility,
  animate: animatePreview,
});
removeHooks?.();
if (deps.testHarness.enabled) {
  removeHooks = installNightMarketHooks(deps.testHarness.registry, controller);
}
```

输入订阅必须使用：

```ts
const unsubscribeInput = deps.input.subscribe((intent) => {
  const mapped = mapInputIntent(intent, scene.boardRect());
  if (!mapped || !controller) return;
  if (mapped.phase === "preview") controller.preview(mapped.action, deps.now());
  else if (mapped.phase === "commit") commitQueue.enqueue(mapped.action);
  else controller.clearPreview();
});
```

`dispose()` 必须依次执行：

```ts
removeHooks?.();
unsubscribeInput();
controller?.dispose();
deps.input.destroy();
deps.telemetry.dispose();
deps.accessibility.dispose();
deps.testHarness.dispose();
await deps.audio.dispose();
deps.runtime.dispose();
```

- [ ] **Step 7: 创建独立 HTML、样式和 Vite 配置（2–5 分钟）**

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
    <meta name="theme-color" content="#170d24" />
    <title>怪兽夜市</title>
  </head>
  <body>
    <main id="app" tabindex="-1">
      <canvas id="game-canvas" role="application" aria-label="怪兽夜市案板"></canvas>
      <div id="ui-layer"></div>
      <div id="live-region" class="sr-only" aria-live="polite"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/styles.css`：

```css
:root { color-scheme: dark; font-family: "Noto Sans SC", system-ui, sans-serif; }
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #170d24; }
body { overscroll-behavior: none; user-select: none; -webkit-user-select: none; }
#app, #game-canvas, #ui-layer { position: fixed; inset: 0; }
#game-canvas { width: 100%; height: 100%; display: block; touch-action: none; }
#ui-layer { pointer-events: none; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
#ui-layer button, #ui-layer .panel { pointer-events: auto; }
.panel { margin: 12vh auto 0; width: min(92vw, 390px); padding: 24px; border: 1px solid #f2b96a; border-radius: 24px; background: rgb(34 13 45 / 92%); box-shadow: 0 18px 60px rgb(0 0 0 / 48%); }
button { width: 100%; min-height: 48px; margin-top: 12px; border: 0; border-radius: 16px; font: inherit; font-weight: 700; }
.primary { color: #261020; background: linear-gradient(180deg, #ffd479, #f39a45); }
.secondary { color: #ffe8bd; background: #5e2855; }
.quiet { color: #f7d7de; background: transparent; border: 1px solid #8d5f77; }
.sr-only { position: fixed; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

`vite.config.ts`：

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppViteConfig } from "../../vite.app.config";

const appDir = path.dirname(fileURLToPath(import.meta.url));
export default createAppViteConfig(appDir, "monster-night-market");
```

- [ ] **Step 8: 创建共享服务装配入口（2–5 分钟）**

`src/main.ts` 必须使用共享计划的构造入口和参数：

```ts
import "./styles.css";
import { Application, Assets } from "pixi.js";
import { createAccessibilityController } from "@gamehub/h5-accessibility";
import { createAssetLoader, createBrowserAssetAdapter, type AssetManifest } from "@gamehub/h5-assets";
import { createAudioBus, createWebAudioBackend } from "@gamehub/h5-audio";
import { createInputController } from "@gamehub/h5-input";
import { createGameRuntime } from "@gamehub/h5-runtime";
import { createLocalStorageSaveAdapter, createSaveStore } from "@gamehub/h5-save";
import { createLocalTelemetryQueue, createTelemetryClient } from "@gamehub/h5-telemetry";
import { createTestHarness } from "@gamehub/h5-testing";
import manifestJson from "../public/assets/asset-manifest.json";
import { bootstrapNightMarket } from "./app/bootstrapNightMarket";
import { createDefaultSave, migrateNightMarketSave, type NightMarketSaveV1 } from "./meta/nightMarketSave";

const root = document.querySelector<HTMLElement>("#app")!;
const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const shellRoot = document.querySelector<HTMLElement>("#ui-layer")!;
const liveRegion = document.querySelector<HTMLElement>("#live-region")!;
const pixi = new Application();
await pixi.init({ canvas, resizeTo: window, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio, 2) });

const gameId = "monster-night-market" as const;
const testHarness = createTestHarness({
  search: location.search,
  gameId,
  defaultSeed: 20260729,
  maxSpeed: 8,
});
const audioBackend = createWebAudioBackend();
const audio = createAudioBus({ backend: audioBackend, maxVoices: 16 });
const assets = createAssetLoader({
  manifest: manifestJson as AssetManifest,
  adapter: createBrowserAssetAdapter({
    decodeBlob: async (_entry, url) => Assets.load(url),
    releaseDecoded: (_entry, value) => {
      if (value && typeof value === "object" && "destroy" in value) {
        (value as { destroy(): void }).destroy();
      }
    },
  }),
  maxAttempts: 2,
});
const save = createSaveStore<NightMarketSaveV1>({
  gameId,
  currentSchemaVersion: 1,
  defaultValue: createDefaultSave(),
  migrations: { 0: (payload) => migrateNightMarketSave(0, payload) },
  adapter: createLocalStorageSaveAdapter(),
});
const telemetry = createTelemetryClient({
  gameId,
  testMode: testHarness.enabled,
  queue: createLocalTelemetryQueue({ gameId, maxEvents: 4_000 }),
});
const accessibility = createAccessibilityController({ root: shellRoot, liveRegion });
let appRef: Awaited<ReturnType<typeof bootstrapNightMarket>> | null = null;
const runtime = createGameRuntime({
  fixedStepMs: 1000 / 60,
  onFixedUpdate: (stepSeconds) => appRef?.tick(stepSeconds),
  onRender: () => pixi.render(),
  onPauseChange: (paused) => {
    if (paused) input.cancelActive("pause");
  },
});
const input = createInputController({
  element: pixi.canvas,
  logicalSize: { width: 390, height: 844 },
  axisLockThreshold: 10,
  tapRadius: 8,
});
appRef = await bootstrapNightMarket({
  root, shellRoot, liveRegion, assets, runtime, input, audio, save,
  telemetry, accessibility, testHarness, now: () => Date.now(),
});
```

把 `BootstrappedNightMarket` 增加 `tick(stepSeconds: number): void`，在首次 `controller.tick(stepSeconds)` 返回 `true` 时只执行一次：

```ts
const summary = controller.summary();
flow = finishRun(flow, summary);
await deps.save.save(flow.save);
deps.telemetry.endRun({
  score: summary.score,
  completedRecipeIds: summary.completedRecipeIds,
});
shell.renderResult({ score: summary.score, nearMisses: summary.nearMisses });
```

- [ ] **Step 9: 运行输入、启动、类型与构建验证（2–5 分钟）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- vitest run apps/monster-night-market/tests/unit/mapInputIntent.test.ts apps/monster-night-market/tests/integration/bootstrap.test.ts
npm.cmd --prefix games/wechat-h5-v2 run typecheck
npm.cmd --prefix games/wechat-h5-v2 run build --workspace @gamehub/h5-monster-night-market
```

Expected: 测试全部通过；TypeScript 零错误；Vite 输出 `dist/index.html`，静态资源路径为相对路径。

- [ ] **Step 10: 精确提交独立入口与运行时装配（2–5 分钟）**

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/index.html games/wechat-h5-v2/apps/monster-night-market/vite.config.ts games/wechat-h5-v2/apps/monster-night-market/src/styles.css games/wechat-h5-v2/apps/monster-night-market/src/input/mapInputIntent.ts games/wechat-h5-v2/apps/monster-night-market/src/app/bootstrapNightMarket.ts games/wechat-h5-v2/apps/monster-night-market/src/main.ts games/wechat-h5-v2/apps/monster-night-market/src/app/createNightMarketApp.ts games/wechat-h5-v2/apps/monster-night-market/src/render/NightMarketScene.ts games/wechat-h5-v2/apps/monster-night-market/src/run/runMachine.ts games/wechat-h5-v2/apps/monster-night-market/tests/unit/mapInputIntent.test.ts games/wechat-h5-v2/apps/monster-night-market/tests/integration/bootstrap.test.ts
git commit -m "feat(night-market): wire standalone H5 runtime and touch flow"
```

Expected: 新提交只包含夜市入口、装配、相关领域增量和测试。

### Task 16: 执行移动端功能、视觉、性能与 AI 三局盲玩验收

**Files:**
- Create: `games/wechat-h5-v2/apps/monster-night-market/tests/e2e/nightMarket.spec.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/tests/e2e/nightMarket.visual.spec.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/tests/e2e/nightMarket.performance.spec.ts`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/test-results/screenshots/*.png`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/test-results/performance.json`
- Generate: `games/wechat-h5-v2/apps/monster-night-market/test-results/ai-playtest/*.md`

- [ ] **Step 1: 写真实触控、首单、三局重玩和钩子隔离 E2E（2–5 分钟）**

```ts
import { expect, test } from "@playwright/test";

const swipe = async (
  page: import("@playwright/test").Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
};

test("普通入口用真实手势完成首单且没有测试钩子", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apps/monster-night-market/");
  await expect(page.getByRole("button", { name: "开始营业" })).toBeVisible();
  await page.getByRole("button", { name: "开始营业" }).click();
  await expect.poll(() => page.evaluate(() => "__GAME_TEST__" in window)).toBe(false);
  await swipe(page, { x: 70, y: 285 }, { x: 150, y: 285 });
  await expect(page.locator("#live-region")).toContainText("完成 1 单");
});

test("test=1 固定种子可连续重置三局且普通刷新不泄漏钩子", async ({ page }) => {
  await page.goto("/apps/monster-night-market/?test=1&seed=42");
  const hooks = await page.evaluate(() =>
    (window as unknown as { __GAME_TEST__: { list(): string[] } }).__GAME_TEST__.list());
  expect(hooks).toEqual(expect.arrayContaining([
    "nightMarket.awaitSettled", "nightMarket.commit",
    "nightMarket.preview", "nightMarket.reset", "nightMarket.snapshot",
  ]));
  expect(hooks).not.toContain("nightMarket.forceWin");
  for (const seed of ["run-1", "run-2", "run-3"]) {
    await page.evaluate(async (value) => {
      const testApi = (window as unknown as {
        __GAME_TEST__: { invoke<T>(name: string, ...args: unknown[]): Promise<T> };
      }).__GAME_TEST__;
      await testApi.invoke("nightMarket.reset", value);
      await testApi.invoke("nightMarket.commit",
        { axis: "row", index: 0, direction: "right" }, performance.now());
      await testApi.invoke("nightMarket.awaitSettled");
    }, seed);
  }
  await page.goto("/apps/monster-night-market/");
  expect(await page.evaluate(() => "__GAME_TEST__" in window)).toBe(false);
});
```

- [ ] **Step 2: 写三视口、减弱动态和低性能截图测试（2–5 分钟）**

```ts
import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 360, height: 800, name: "360x800" },
  { width: 390, height: 844, name: "390x844" },
  { width: 430, height: 932, name: "430x932" },
]) {
  test(`视觉证据 ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/apps/monster-night-market/?test=1&seed=42");
    await page.getByRole("button", { name: "开始营业" }).click();
    await expect(page).toHaveScreenshot(`night-market-${viewport.name}.png`, {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
    await expect(page.locator("canvas")).toBeInViewport();
    await expect(page.getByLabel("当前最多两张订单")).toBeInViewport();
  });
}

test("减弱动态仍保留订单、冻结和成单语义", async ({ browser }) => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await page.goto("/apps/monster-night-market/?test=1&seed=42");
  await page.getByRole("button", { name: "开始营业" }).click();
  await expect(page).toHaveScreenshot("night-market-reduced-motion.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
  });
  await page.close();
});
```

- [ ] **Step 3: 写 20 分钟自然速度性能长测（2–5 分钟）**

```ts
import { expect, test } from "@playwright/test";

test("自然速度连续三局无资源和帧时间失控", async ({ page }) => {
  test.setTimeout(1_260_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apps/monster-night-market/?test=1&seed=42001");
  await page.getByRole("button", { name: "开始营业" }).click();
  await page.evaluate(() => {
    const samples: number[] = [];
    let previous = performance.now();
    const frame = (now: number) => {
      samples.push(now - previous);
      previous = now;
      (window as unknown as { __FRAME_SAMPLES__: number[] }).__FRAME_SAMPLES__ = samples;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.waitForTimeout(1_200_000);
  const report = await page.evaluate(() => {
    const samples = (window as unknown as { __FRAME_SAMPLES__: number[] }).__FRAME_SAMPLES__;
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Number.POSITIVE_INFINITY;
    return {
      p95,
      longTasks: performance.getEntriesByType("longtask").length,
      domNodes: document.querySelectorAll("*").length,
      jsHeap: (performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }).memory?.usedJSHeapSize ?? null,
    };
  });
  expect(report.p95).toBeLessThanOrEqual(20);
  expect(report.domNodes).toBeLessThan(500);
  await page.evaluate((value) =>
    fetch("/__test_artifact__/performance.json", {
      method: "POST", body: JSON.stringify(value),
    }), report);
});
```

- [ ] **Step 4: 运行功能、视觉和性能验收（2–5 分钟启动命令；长测按真实 20 分钟完成）**

Run:

```bash
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test apps/monster-night-market/tests/e2e/nightMarket.spec.ts
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test apps/monster-night-market/tests/e2e/nightMarket.visual.spec.ts
npm.cmd --prefix games/wechat-h5-v2 exec -- playwright test apps/monster-night-market/tests/e2e/nightMarket.performance.spec.ts
```

Expected: 功能测试覆盖真实触摸、锁轴、首单、三局重置、普通入口和 `test=1`；视觉测试产出 360×800、390×844、430×932、减弱动态截图且差异率不超过 1%；基准设备 rAF P95 不超过 20ms，低端档另跑时不超过 33ms，20 分钟无页面重载、监听器增长、纹理增长或存档丢失。

- [ ] **Step 5: 两批执行六类 AI 资深玩家三局盲玩（每名启动与交接 2–5 分钟）**

第一批依次使用“动作手感玩家、Roguelite 构筑玩家、轻度休闲玩家”，第二批使用“解谜策略玩家、塔防阵型玩家、挑剔型综合玩家”。每名玩家从不带 `test=1` 的普通入口开始，以真实移动视口和触摸完成至少三局；第一局不看规格和提示，第二局主动换策略，第三局判断变化是否真实。每份报告固定写入：

```text
apps/monster-night-market/test-results/ai-playtest/01-action.md
apps/monster-night-market/test-results/ai-playtest/02-roguelite.md
apps/monster-night-market/test-results/ai-playtest/03-casual.md
apps/monster-night-market/test-results/ai-playtest/04-puzzle.md
apps/monster-night-market/test-results/ai-playtest/05-formation.md
apps/monster-night-market/test-results/ai-playtest/06-critical.md
```

每份报告必须区分事实、推断、个人评价和未验证项，附启动、首次滑动、首次双单、三段连灶、失败、结算与成长截图，并按规格八维 100 分表评分。若环境不能真实控制浏览器，报告标题必须写“证据审阅，非实际试玩”，不得计入主动再玩票。

- [ ] **Step 6: 执行绿灯判定并精确提交验收证据（2–5 分钟）**

只有以下条件同时成立才判《怪兽夜市》内部 `READY`：首单 30 秒内完成至少 8/10、至少 7/10 在滑动前正确预测一次、至少 6/10 主动第二局、第三局盲滑率低于第一局、至少 7/10 解释留料或连锁、AI 六人加权均分至少 75、任一维度不低于 60、至少 4/6 主动再玩、无 P0/P1。未执行真实 10 人盲测时只能标记“AI 内部评审候选”，不能声明市场留存成立。

```bash
git add -- games/wechat-h5-v2/apps/monster-night-market/tests/e2e games/wechat-h5-v2/apps/monster-night-market/test-results
git commit -m "test(night-market): verify playability visuals performance and replay"
```

Expected: 提交只包含夜市 E2E、截图、性能报告和六份 AI 报告；任何门槛不通过时报告结论为 `NEEDS WORK`，不得通过修改阈值放行。
