# 微信 H5 V2 共享运行时、高保真资产管线与新版大厅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可供《弹珠暴走团》《怪兽夜市》《三路小队》独立接入的 Vite/TypeScript/PixiJS 共享底座、高保真资产生产与校验管线、新版试玩大厅，以及可重复执行的功能、无障碍、性能和微信 WebView 前置验证框架。

**Architecture:** 在全新的 `games/wechat-h5-v2/` npm workspace 中维护九个职责单一的 `@gamehub/h5-*` 包，三款游戏和大厅各自拥有独立 Vite 入口、独立资源目录与独立构建产物。玩法层只组合稳定接口，不进入共享包；浏览器端默认只用本地存档与本地遥测队列，微信账号、云存档和生产遥测通过适配器边界后接。

**Tech Stack:** Node.js 20、npm workspaces、Vite 6、TypeScript 5.7、PixiJS 8、Vitest 3、Playwright 1.51、Sharp 0.33、WebGL、Web Audio、IndexedDB、Pointer Events。

---

## 实施边界

- 本计划创建共享基础设施、新版大厅和三款独立应用的可启动集成入口，不实现三款玩法规则、关卡、角色数值或局外成长。
- 三款玩法计划必须依赖本计划公开接口，不能复制固定更新循环、输入、音频、资源、存档、遥测、无障碍或测试门控代码。
- 大厅和每款游戏分别输出到 `games/wechat-h5-v2/dist/<game-id>/`；任一入口不得预加载其他游戏资源。
- 首版“本地完整可玩”指本地进度与事件不依赖服务端，不承诺微信清缓存后的首次冷启动离线可用。
- 普通入口忽略 `seed`、`speed`、强制胜负和资源注入参数；只有 URL 精确包含 `test=1` 时才允许挂载测试接口。
- 桌面 Chromium 自动化只能证明浏览器候选状态，不能替代微信 iOS/Android 真机或微信生产 GO。

## 文件结构与职责

```text
games/wechat-h5-v2/
├─ package.json                         # 独立 npm workspace、统一命令与固定依赖
├─ package-lock.json                    # npm 生成的可复现依赖锁
├─ tsconfig.json                        # 全仓 TypeScript 检查入口
├─ tsconfig.base.json                   # 严格编译选项和 @gamehub 路径
├─ vitest.config.ts                     # 共享单元与契约测试
├─ playwright.config.ts                 # 移动视口、触控和 WebKit/Chromium 项目
├─ vite.app.config.ts                   # 四个应用共用的构建约束
├─ apps/
│  ├─ shared/
│  │  ├─ game-shell-config.ts          # 三款纯配置，不导入 Pixi 浏览器运行时
│  │  ├─ game-shell.ts                 # 九包与 PixiJS 的共同装配边界
│  │  └─ game-shell.css                # 集成入口的竖屏与简动规则
│  ├─ hub/
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ vite.config.ts
│  │  ├─ public/assets/
│  │  └─ src/{main.ts,hub.css,catalog.ts}
│  ├─ ricochet-crew/
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ vite.config.ts
│  │  ├─ public/assets/
│  │  └─ src/main.ts
│  ├─ monster-night-market/
│  │  └─ 与上方相同职责的独立入口
│  └─ three-lane-squad/
│     └─ 与上方相同职责的独立入口
├─ packages/
│  ├─ contracts/                        # 跨包类型、事件、存档和资产协议
│  ├─ runtime/                          # 固定更新、生命周期、性能档和 WebGL 恢复
│  ├─ input/                            # 触控坐标、拖拽、滑动与 10px 锁轴
│  ├─ audio/                            # 首次手势解锁、声音池、静音和后台暂停
│  ├─ assets/                           # 分组加载、哈希、重试、释放与内存预算
│  ├─ save/                             # 独立存档、迁移、校验、备份和适配器
│  ├─ telemetry/                        # 本地事件队列、会话与传输适配器
│  ├─ accessibility/                    # 简动、焦点、播报和非颜色状态
│  └─ testing/                          # 固定种子、受控时钟和 test=1 调试门
├─ art/
│  ├─ README.md                         # 原画到运行时资产的执行规则
│  ├─ schemas/provenance.schema.json    # 提示词、用途、哈希和修订状态约束
│  ├─ recipes/hub.json                  # 大厅图像导出尺寸与压缩参数
│  ├─ source/hub/                       # 大厅高保真源图
│  └─ provenance/hub.json               # 大厅资产来源记录
├─ scripts/
│  ├─ export-art-assets.mjs             # Sharp 导出运行时图像
│  ├─ build-asset-manifests.mjs         # 生成浏览器加载清单
│  ├─ validate-art-assets.mjs           # 图集、帧率、哈希和预算门禁
│  ├─ record-hub-provenance.mjs         # 从真实报告记录大厅资产来源
│  ├─ serve-dist.mjs                    # 只读提供四个独立 dist 入口
│  └─ verify-bundles.mjs                # 独立产物和跨游戏泄漏检查
└─ tests/
   ├─ workspace-layout.test.mjs
   ├─ e2e/{hub.spec.ts,app-shell.spec.ts,production-guards.spec.ts}
   ├─ performance/{frame-budget.spec.ts,long-run.spec.ts}
   └─ fixtures/assets/                  # 资产管线测试夹具
```

有意不使用一个共享 `public/assets/` 作为四款应用的 Vite `publicDir`。每款应用只发布自己的 `public/assets/`，从结构上避免一个入口复制或加载全部高保真资产。

## 稳定公开接口

后续三款玩法计划只引用下列入口；签名变化必须先修改契约测试，再同步所有调用方：

```ts
export interface GameRuntime {
  start(): void;
  pause(reason: PauseReason): void;
  resume(): void;
  stop(): void;
  setPerformanceTier(tier: PerformanceTier): void;
  snapshot(): RuntimeSnapshot;
  dispose(): void;
}

export interface InputController {
  subscribe(listener: (intent: InputIntent) => void): () => void;
  setEnabled(enabled: boolean): void;
  cancelActive(reason: "pause" | "blur" | "dispose"): void;
  destroy(): void;
}

export interface AssetLoader {
  loadGroup(
    groupId: string,
    onProgress?: (progress: AssetProgress) => void
  ): Promise<void>;
  retryGroup(groupId: string): Promise<void>;
  get<T>(assetId: string): T;
  releaseGroup(groupId: string): Promise<void>;
  snapshot(): AssetLoaderSnapshot;
  dispose(): Promise<void>;
}

export interface SaveStore<T> {
  load(): Promise<SaveLoadResult<T>>;
  save(payload: T): Promise<GameSaveEnvelope<T>>;
  clear(): Promise<void>;
  inspect(): Promise<SaveStoreSnapshot>;
}

export interface TelemetryClient {
  beginRun(runId: string): void;
  emit(
    event: GameEventName,
    payload?: Record<string, unknown>
  ): GameEvent;
  endRun(payload?: Record<string, unknown>): GameEvent;
  flush(): Promise<FlushResult>;
  snapshot(): TelemetrySnapshot;
  dispose(): void;
}

export interface TestHookRegistry {
  register<TArgs extends unknown[], TResult>(
    name: string,
    handler: (...args: TArgs) => TResult | Promise<TResult>
  ): () => void;
  invoke<TResult>(name: string, ...args: unknown[]): Promise<TResult>;
  list(): string[];
  expose(target?: Window): void;
  dispose(): void;
}
```

依赖方向固定为：

```text
apps/*
  → contracts
  → runtime | input | audio | assets | save | telemetry | accessibility | testing

runtime/input/audio/assets/save/telemetry/accessibility/testing
  → contracts

共享包之间不得形成循环依赖
```

### Task 1: 初始化独立 npm workspace 与测试命令

**Files:**
- Create: `games/wechat-h5-v2/tests/workspace-layout.test.mjs`
- Create: `games/wechat-h5-v2/package.json`
- Create: `games/wechat-h5-v2/package-lock.json`
- Create: `games/wechat-h5-v2/tsconfig.base.json`
- Create: `games/wechat-h5-v2/tsconfig.json`
- Create: `games/wechat-h5-v2/vitest.config.ts`
- Create: `games/wechat-h5-v2/playwright.config.ts`

- [ ] **Step 1: 写入会失败的 workspace 根配置测试**

```js
// games/wechat-h5-v2/tests/workspace-layout.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("workspace root owns the v2 build and verification commands", async () => {
  const root = new URL("../package.json", import.meta.url);
  const pkg = JSON.parse(await readFile(root, "utf8"));
  assert.deepEqual(pkg.workspaces, ["apps/*", "packages/*"]);
  assert.equal(pkg.engines.node, ">=20.11");
  for (const command of [
    "typecheck",
    "test",
    "test:e2e",
    "test:performance",
    "assets:export",
    "assets:manifest",
    "assets:validate",
    "build",
    "verify",
  ]) {
    assert.equal(typeof pkg.scripts[command], "string", `missing ${command}`);
  }
});
```

- [ ] **Step 2: 运行测试并确认根配置不存在**

Run:

```powershell
cd games/wechat-h5-v2
node --test tests/workspace-layout.test.mjs
```

Expected: 退出码 `1`，错误包含 `ENOENT` 和 `games/wechat-h5-v2/package.json`。

- [ ] **Step 3: 创建根配置**

```json
{
  "name": "@gamehub/wechat-h5-v2",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.11" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test tests/e2e",
    "test:performance": "playwright test tests/performance --project=chromium",
    "assets:export": "node scripts/export-art-assets.mjs",
    "assets:manifest": "node scripts/build-asset-manifests.mjs",
    "assets:validate": "node scripts/validate-art-assets.mjs",
    "build:apps": "npm run build -w @gamehub/h5-hub -w @gamehub/h5-ricochet-crew -w @gamehub/h5-monster-night-market -w @gamehub/h5-three-lane-squad",
    "build": "npm run assets:manifest && npm run assets:validate && npm run build:apps && node scripts/verify-bundles.mjs",
    "verify": "npm run typecheck && npm run test && npm run build && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "1.51.0",
    "@types/node": "22.13.1",
    "sharp": "0.33.5",
    "typescript": "5.7.3",
    "vite": "6.1.0",
    "vitest": "3.0.5"
  }
}
```

```json
// games/wechat-h5-v2/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@gamehub/h5-contracts": ["packages/contracts/src/index.ts"],
      "@gamehub/h5-runtime": ["packages/runtime/src/index.ts"],
      "@gamehub/h5-input": ["packages/input/src/index.ts"],
      "@gamehub/h5-audio": ["packages/audio/src/index.ts"],
      "@gamehub/h5-assets": ["packages/assets/src/index.ts"],
      "@gamehub/h5-save": ["packages/save/src/index.ts"],
      "@gamehub/h5-telemetry": ["packages/telemetry/src/index.ts"],
      "@gamehub/h5-accessibility": ["packages/accessibility/src/index.ts"],
      "@gamehub/h5-testing": ["packages/testing/src/index.ts"]
    }
  }
}
```

```json
// games/wechat-h5-v2/tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "types": ["node"] },
  "include": [
    "apps/**/*.ts",
    "packages/**/*.ts",
    "tests/**/*.ts",
    "vite.app.config.ts",
    "vitest.config.ts",
    "playwright.config.ts"
  ]
}
```

```ts
// games/wechat-h5-v2/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "*.test.ts",
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
    ],
    coverage: { reporter: ["text", "json-summary"] },
  },
});
```

```ts
// games/wechat-h5-v2/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 4173 --outDir dist",
    port: 4173,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
```

- [ ] **Step 4: 安装固定依赖并生成锁文件**

Run:

```powershell
cd games/wechat-h5-v2
npm install
npx playwright install chromium webkit
```

Expected: 退出码 `0`；生成 `package-lock.json`；`npm ls --depth=0` 列出 Vite、TypeScript、Vitest、Playwright 和 Sharp，且没有 `UNMET DEPENDENCY`。

- [ ] **Step 5: 运行根配置测试**

Run:

```powershell
node --test tests/workspace-layout.test.mjs
```

Expected: `1` 个测试通过，退出码 `0`。

- [ ] **Step 6: 提交 workspace 根配置**

```powershell
git add -- games/wechat-h5-v2/package.json games/wechat-h5-v2/package-lock.json games/wechat-h5-v2/tsconfig.base.json games/wechat-h5-v2/tsconfig.json games/wechat-h5-v2/vitest.config.ts games/wechat-h5-v2/playwright.config.ts games/wechat-h5-v2/tests/workspace-layout.test.mjs
git commit -m "build: initialize wechat h5 v2 workspace"
```

### Task 2: 固化跨包契约与九个 workspace 包名

**Files:**
- Create: `games/wechat-h5-v2/packages/contracts/package.json`
- Create: `games/wechat-h5-v2/packages/contracts/src/index.ts`
- Create: `games/wechat-h5-v2/packages/contracts/src/index.test.ts`
- Create: `games/wechat-h5-v2/packages/runtime/package.json`
- Create: `games/wechat-h5-v2/packages/input/package.json`
- Create: `games/wechat-h5-v2/packages/audio/package.json`
- Create: `games/wechat-h5-v2/packages/assets/package.json`
- Create: `games/wechat-h5-v2/packages/save/package.json`
- Create: `games/wechat-h5-v2/packages/telemetry/package.json`
- Create: `games/wechat-h5-v2/packages/accessibility/package.json`
- Create: `games/wechat-h5-v2/packages/testing/package.json`

- [ ] **Step 1: 写入会失败的契约测试**

```ts
import { describe, expect, it } from "vitest";
import {
  GAME_EVENT_NAMES,
  GAME_IDS,
  PERFORMANCE_PROFILES,
  type AssetManifest,
  type GameEvent,
  type GameSaveEnvelope,
} from "./index";

describe("shared contracts", () => {
  it("locks game ids and common event names", () => {
    expect(GAME_IDS).toEqual([
      "hub",
      "ricochet-crew",
      "monster-night-market",
      "three-lane-squad",
    ]);
    expect(GAME_EVENT_NAMES).toContain("performance_tier_changed");
    expect(GAME_EVENT_NAMES).toContain("save_recovered");
  });

  it("locks performance budgets", () => {
    expect(PERFORMANCE_PROFILES.low).toEqual({
      dprCap: 1,
      targetFps: 30,
      particleScale: 0.5,
      postEffects: false,
    });
  });

  it("keeps save, event, and asset envelopes assignable", () => {
    const save = {} as GameSaveEnvelope<{ unlocked: string[] }>;
    const event = {} as GameEvent;
    const manifest = {} as AssetManifest;
    expect([save, event, manifest]).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 运行测试并确认契约入口不存在**

Run:

```powershell
npx vitest run packages/contracts/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 创建契约包和完整稳定类型**

```json
{
  "name": "@gamehub/h5-contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

```ts
// games/wechat-h5-v2/packages/contracts/src/index.ts
export const GAME_IDS = [
  "hub",
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const;

export type GameId = (typeof GAME_IDS)[number];
export type PerformanceTier = "high" | "balanced" | "low";
export type PauseReason =
  | "user"
  | "visibility"
  | "pagehide"
  | "orientation"
  | "asset-error"
  | "context-lost";

export interface PerformanceProfile {
  dprCap: number;
  targetFps: 30 | 60;
  particleScale: number;
  postEffects: boolean;
}

export const PERFORMANCE_PROFILES: Record<
  PerformanceTier,
  PerformanceProfile
> = {
  high: { dprCap: 2, targetFps: 60, particleScale: 1, postEffects: true },
  balanced: {
    dprCap: 1.5,
    targetFps: 60,
    particleScale: 0.75,
    postEffects: false,
  },
  low: { dprCap: 1, targetFps: 30, particleScale: 0.5, postEffects: false },
};

export const GAME_EVENT_NAMES = [
  "game_boot",
  "game_ready",
  "run_start",
  "first_input",
  "first_payoff",
  "choice_presented",
  "choice_selected",
  "strategy_changed",
  "run_end",
  "replay_start",
  "daily_start",
  "daily_end",
  "lifecycle_pause",
  "lifecycle_resume",
  "performance_tier_changed",
  "asset_error",
  "save_recovered",
] as const;

export type GameEventName = (typeof GAME_EVENT_NAMES)[number];

export interface GameEvent {
  eventId: string;
  sessionId: string;
  runId: string | null;
  gameId: GameId;
  event: GameEventName;
  seq: number;
  clientAt: number;
  schemaVersion: 1;
  testMode: boolean;
  payload: Record<string, unknown>;
}

export interface GameSaveEnvelope<T> {
  schemaVersion: number;
  gameId: GameId;
  updatedAt: number;
  checksum: string;
  payload: T;
}

export type RuntimeAssetType =
  | "texture"
  | "atlas"
  | "audio"
  | "font"
  | "json";

export interface AssetEntry {
  id: string;
  groupId: string;
  type: RuntimeAssetType;
  url: string;
  bytes: number;
  sha256: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface AssetGroup {
  id: string;
  required: boolean;
  assets: AssetEntry[];
}

export interface AssetManifest {
  schemaVersion: 1;
  gameId: GameId;
  revision: string;
  groups: AssetGroup[];
}
```

- [ ] **Step 4: 创建其余八个真实 workspace 包描述**

每个文件内容固定如下；包名和 contracts 依赖不能改写：

```json
// packages/runtime/package.json
{"name":"@gamehub/h5-runtime","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/input/package.json
{"name":"@gamehub/h5-input","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/audio/package.json
{"name":"@gamehub/h5-audio","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/assets/package.json
{"name":"@gamehub/h5-assets","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/save/package.json
{"name":"@gamehub/h5-save","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/telemetry/package.json
{"name":"@gamehub/h5-telemetry","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/accessibility/package.json
{"name":"@gamehub/h5-accessibility","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

```json
// packages/testing/package.json
{"name":"@gamehub/h5-testing","version":"0.1.0","private":true,"type":"module","exports":{".":"./src/index.ts"},"dependencies":{"@gamehub/h5-contracts":"0.1.0"}}
```

- [ ] **Step 5: 更新 workspace 链接并运行契约测试**

Run:

```powershell
npm install
npx vitest run packages/contracts/src/index.test.ts
npm ls --workspaces --depth=0
```

Expected: 契约测试 `3` 个通过；输出精确列出九个 `@gamehub/h5-*` workspace；没有无效或缺失依赖。

- [ ] **Step 6: 提交契约**

```powershell
git add -- games/wechat-h5-v2/package.json games/wechat-h5-v2/package-lock.json games/wechat-h5-v2/packages/contracts games/wechat-h5-v2/packages/runtime/package.json games/wechat-h5-v2/packages/input/package.json games/wechat-h5-v2/packages/audio/package.json games/wechat-h5-v2/packages/assets/package.json games/wechat-h5-v2/packages/save/package.json games/wechat-h5-v2/packages/telemetry/package.json games/wechat-h5-v2/packages/accessibility/package.json games/wechat-h5-v2/packages/testing/package.json
git commit -m "feat: define h5 shared contracts"
```

### Task 3: 实现固定更新循环与显式暂停恢复

**Files:**
- Create: `games/wechat-h5-v2/packages/runtime/src/index.ts`
- Create: `games/wechat-h5-v2/packages/runtime/src/runtime.test.ts`

- [ ] **Step 1: 写入固定步长与暂停失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { createGameRuntime } from "./index";

describe("createGameRuntime", () => {
  it("uses fixed updates and caps catch-up work", () => {
    let frame: FrameRequestCallback | undefined;
    const update = vi.fn();
    const render = vi.fn();
    const runtime = createGameRuntime({
      fixedStepMs: 1000 / 60,
      maxCatchUpSteps: 5,
      onFixedUpdate: update,
      onRender: render,
      scheduler: {
        request: (callback) => {
          frame = callback;
          return 1;
        },
        cancel: vi.fn(),
      },
    });
    runtime.start();
    frame?.(0);
    frame?.(250);
    expect(update).toHaveBeenCalledTimes(5);
    expect(render).toHaveBeenCalledTimes(2);
    expect(runtime.snapshot().droppedFrameDebtMs).toBeGreaterThan(0);
  });

  it("does not advance while paused and requires explicit resume", () => {
    let frame: FrameRequestCallback | undefined;
    const update = vi.fn();
    const runtime = createGameRuntime({
      onFixedUpdate: update,
      onRender: vi.fn(),
      scheduler: {
        request: (callback) => {
          frame = callback;
          return 2;
        },
        cancel: vi.fn(),
      },
    });
    runtime.start();
    frame?.(0);
    runtime.pause("visibility");
    frame?.(1000);
    expect(update).not.toHaveBeenCalled();
    expect(runtime.snapshot().pauseReason).toBe("visibility");
    runtime.resume();
    frame?.(1016.7);
    expect(runtime.snapshot().state).toBe("running");
  });
});
```

- [ ] **Step 2: 运行测试并确认工厂函数不存在**

Run:

```powershell
npx vitest run packages/runtime/src/runtime.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 实现最小固定更新运行时**

```ts
import type {
  PauseReason,
  PerformanceTier,
} from "@gamehub/h5-contracts";

export interface RuntimeSnapshot {
  state: "idle" | "running" | "paused" | "stopped" | "disposed";
  pauseReason: PauseReason | null;
  performanceTier: PerformanceTier;
  fixedUpdates: number;
  renderedFrames: number;
  droppedFrameDebtMs: number;
}

export interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
}

export interface GameRuntime {
  start(): void;
  pause(reason: PauseReason): void;
  resume(): void;
  stop(): void;
  setPerformanceTier(tier: PerformanceTier): void;
  snapshot(): RuntimeSnapshot;
  dispose(): void;
}

export interface GameRuntimeOptions {
  fixedStepMs?: number;
  maxCatchUpSteps?: number;
  onFixedUpdate(stepSeconds: number): void;
  onRender(alpha: number): void;
  onPauseChange?(paused: boolean, reason: PauseReason | null): void;
  onPerformanceTierChange?(tier: PerformanceTier): void;
  scheduler?: FrameScheduler;
}

const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export function createGameRuntime(options: GameRuntimeOptions): GameRuntime {
  const stepMs = options.fixedStepMs ?? 1000 / 60;
  const maxSteps = options.maxCatchUpSteps ?? 5;
  const scheduler = options.scheduler ?? browserScheduler;
  let state: RuntimeSnapshot["state"] = "idle";
  let pauseReason: PauseReason | null = null;
  let tier: PerformanceTier = "high";
  let handle: number | null = null;
  let previous: number | null = null;
  let accumulator = 0;
  let fixedUpdates = 0;
  let renderedFrames = 0;
  let droppedFrameDebtMs = 0;

  const schedule = () => {
    handle = scheduler.request(frame);
  };

  const frame: FrameRequestCallback = (now) => {
    if (state !== "running") return;
    const delta = previous === null ? 0 : Math.max(0, now - previous);
    previous = now;
    accumulator += delta;
    let steps = 0;
    while (accumulator >= stepMs && steps < maxSteps) {
      options.onFixedUpdate(stepMs / 1000);
      accumulator -= stepMs;
      fixedUpdates += 1;
      steps += 1;
    }
    if (accumulator >= stepMs) {
      droppedFrameDebtMs += accumulator - (accumulator % stepMs);
      accumulator %= stepMs;
    }
    options.onRender(accumulator / stepMs);
    renderedFrames += 1;
    schedule();
  };

  const cancelScheduled = () => {
    if (handle !== null) scheduler.cancel(handle);
    handle = null;
  };

  return {
    start() {
      if (state === "disposed" || state === "running") return;
      state = "running";
      pauseReason = null;
      previous = null;
      schedule();
    },
    pause(reason) {
      if (state !== "running") return;
      state = "paused";
      pauseReason = reason;
      cancelScheduled();
      options.onPauseChange?.(true, reason);
    },
    resume() {
      if (state !== "paused") return;
      state = "running";
      pauseReason = null;
      previous = null;
      options.onPauseChange?.(false, null);
      schedule();
    },
    stop() {
      if (state === "disposed") return;
      cancelScheduled();
      state = "stopped";
      previous = null;
      accumulator = 0;
    },
    setPerformanceTier(nextTier) {
      if (tier === nextTier) return;
      tier = nextTier;
      options.onPerformanceTierChange?.(tier);
    },
    snapshot: () => ({
      state,
      pauseReason,
      performanceTier: tier,
      fixedUpdates,
      renderedFrames,
      droppedFrameDebtMs,
    }),
    dispose() {
      cancelScheduled();
      state = "disposed";
    },
  };
}
```

- [ ] **Step 4: 运行运行时单测**

Run:

```powershell
npx vitest run packages/runtime/src/runtime.test.ts
```

Expected: `2` 个测试通过，退出码 `0`。

- [ ] **Step 5: 提交固定更新运行时**

```powershell
git add -- games/wechat-h5-v2/packages/runtime/src/index.ts games/wechat-h5-v2/packages/runtime/src/runtime.test.ts
git commit -m "feat: add fixed-step h5 runtime"
```

### Task 4: 增加性能分档、生命周期和 WebGL 恢复

**Files:**
- Modify: `games/wechat-h5-v2/packages/runtime/src/index.ts`
- Create: `games/wechat-h5-v2/packages/runtime/src/performance.test.ts`
- Create: `games/wechat-h5-v2/packages/runtime/src/lifecycle.test.ts`

- [ ] **Step 1: 写入性能降档与生命周期失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  bindRuntimeLifecycle,
  bindWebGLRecovery,
  createFrameBudgetMonitor,
} from "./index";

describe("runtime guards", () => {
  it("downgrades after three slow p95 windows", () => {
    const changed = vi.fn();
    const monitor = createFrameBudgetMonitor({
      initialTier: "high",
      sampleSize: 5,
      slowWindowsBeforeDowngrade: 3,
      onTierChange: changed,
    });
    for (let window = 0; window < 3; window += 1) {
      [21, 22, 23, 24, 25].forEach((ms) => monitor.record(ms));
    }
    expect(monitor.snapshot().tier).toBe("balanced");
    expect(changed).toHaveBeenCalledWith("balanced");
  });

  it("pauses on visibility and never resumes automatically", () => {
    const runtime = { pause: vi.fn(), resume: vi.fn() };
    const listeners = new Map<string, EventListener>();
    const binding = bindRuntimeLifecycle(runtime, {
      document: {
        hidden: false,
        addEventListener: (name, listener) => listeners.set(name, listener),
        removeEventListener: vi.fn(),
      },
      window: {
        addEventListener: (name, listener) => listeners.set(name, listener),
        removeEventListener: vi.fn(),
      },
    });
    listeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(runtime.resume).not.toHaveBeenCalled();
    binding.dispose();
  });

  it("pauses immediately when the WebGL context is lost", () => {
    const listeners = new Map<string, EventListener>();
    const canvas = {
      addEventListener: (name: string, listener: EventListener) =>
        listeners.set(name, listener),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;
    const onLost = vi.fn();
    bindWebGLRecovery(canvas, { onLost, onRestored: vi.fn() });
    const event = new Event("webglcontextlost", { cancelable: true });
    listeners.get("webglcontextlost")?.(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 运行测试并确认三个导出不存在**

Run:

```powershell
npx vitest run packages/runtime/src/performance.test.ts packages/runtime/src/lifecycle.test.ts
```

Expected: 退出码 `1`，错误列出 `bindRuntimeLifecycle`、`bindWebGLRecovery` 或 `createFrameBudgetMonitor` 缺失。

- [ ] **Step 3: 实现性能监控器和浏览器绑定**

在 `packages/runtime/src/index.ts` 追加：

```ts
import {
  PERFORMANCE_PROFILES,
  type PerformanceProfile,
} from "@gamehub/h5-contracts";

export interface FrameBudgetSnapshot {
  tier: PerformanceTier;
  p95Ms: number;
  samples: number;
  consecutiveSlowWindows: number;
  profile: PerformanceProfile;
}

export function createFrameBudgetMonitor(options: {
  initialTier: PerformanceTier;
  sampleSize?: number;
  slowWindowsBeforeDowngrade?: number;
  onTierChange(tier: PerformanceTier): void;
}) {
  let tier = options.initialTier;
  let samples: number[] = [];
  let p95Ms = 0;
  let slowWindows = 0;
  const sampleSize = options.sampleSize ?? 300;
  const requiredSlowWindows = options.slowWindowsBeforeDowngrade ?? 3;
  const downgrade = () => {
    const next =
      tier === "high" ? "balanced" : tier === "balanced" ? "low" : "low";
    if (next !== tier) {
      tier = next;
      options.onTierChange(tier);
    }
  };
  return {
    record(frameMs: number) {
      samples.push(frameMs);
      if (samples.length < sampleSize) return;
      const ordered = [...samples].sort((a, b) => a - b);
      p95Ms = ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0;
      const limit = tier === "low" ? 33 : 20;
      slowWindows = p95Ms > limit ? slowWindows + 1 : 0;
      samples = [];
      if (slowWindows >= requiredSlowWindows) {
        slowWindows = 0;
        downgrade();
      }
    },
    snapshot(): FrameBudgetSnapshot {
      return {
        tier,
        p95Ms,
        samples: samples.length,
        consecutiveSlowWindows: slowWindows,
        profile: PERFORMANCE_PROFILES[tier],
      };
    },
  };
}

export function bindRuntimeLifecycle(
  runtime: Pick<GameRuntime, "pause" | "resume">,
  environment: {
    document: Pick<
      Document,
      "hidden" | "addEventListener" | "removeEventListener"
    >;
    window: Pick<Window, "addEventListener" | "removeEventListener">;
  } = { document, window },
) {
  const onVisibility = () => {
    if (environment.document.hidden) runtime.pause("visibility");
  };
  const onPageHide = () => runtime.pause("pagehide");
  environment.document.addEventListener("visibilitychange", onVisibility);
  environment.window.addEventListener("pagehide", onPageHide);
  return {
    dispose() {
      environment.document.removeEventListener("visibilitychange", onVisibility);
      environment.window.removeEventListener("pagehide", onPageHide);
    },
  };
}

export function bindWebGLRecovery(
  canvas: HTMLCanvasElement,
  callbacks: {
    onLost(): void;
    onRestored(): void | Promise<void>;
    onFatal?(error: unknown): void;
  },
) {
  const lost = (event: Event) => {
    event.preventDefault();
    callbacks.onLost();
  };
  const restored = () => {
    Promise.resolve(callbacks.onRestored()).catch(callbacks.onFatal);
  };
  canvas.addEventListener("webglcontextlost", lost);
  canvas.addEventListener("webglcontextrestored", restored);
  return {
    dispose() {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    },
  };
}
```

`bindRuntimeLifecycle` 只负责暂停；恢复必须由可见的“继续”按钮在用户手势内调用 `runtime.resume()`，禁止在 `visibilitychange` 中自动继续。

- [ ] **Step 4: 运行运行时保护测试**

Run:

```powershell
npx vitest run packages/runtime/src
```

Expected: `5` 个测试全部通过；性能测试从 `high` 只降到 `balanced` 一档。

- [ ] **Step 5: 提交性能与生命周期保护**

```powershell
git add -- games/wechat-h5-v2/packages/runtime/src/index.ts games/wechat-h5-v2/packages/runtime/src/performance.test.ts games/wechat-h5-v2/packages/runtime/src/lifecycle.test.ts
git commit -m "feat: add h5 runtime recovery and tiers"
```

### Task 5: 实现统一触控坐标、拖拽和 10px 滑动锁轴

**Files:**
- Create: `games/wechat-h5-v2/packages/input/src/index.ts`
- Create: `games/wechat-h5-v2/packages/input/src/index.test.ts`

- [ ] **Step 1: 写入坐标、锁轴和取消失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  classifySwipe,
  normalizePointer,
  type PointerSample,
} from "./index";

describe("h5 input", () => {
  it("maps CSS pixels into the 390x844 logical viewport", () => {
    expect(
      normalizePointer(
        { clientX: 195, clientY: 422, pointerId: 7, timeStamp: 10 },
        { left: 0, top: 0, width: 390, height: 844 },
        { width: 390, height: 844 },
      ),
    ).toMatchObject({ x: 195, y: 422, pointerId: 7 });
  });

  it("locks horizontal only after 10px and emits one-cell direction", () => {
    const start: PointerSample = {
      x: 100,
      y: 100,
      pointerId: 1,
      at: 0,
    };
    expect(classifySwipe(start, { ...start, x: 109, at: 20 }, 10)).toBeNull();
    expect(classifySwipe(start, { ...start, x: 112, y: 103, at: 30 }, 10))
      .toMatchObject({
        axis: "x",
        direction: "right",
        delta: 12,
        durationMs: 30,
      });
  });
});
```

- [ ] **Step 2: 运行测试并确认输入入口不存在**

Run:

```powershell
npx vitest run packages/input/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 实现公开输入类型和纯函数**

```ts
export type AxisLock = "x" | "y";
export type SwipeDirection = "left" | "right" | "up" | "down";

export interface PointerSample {
  x: number;
  y: number;
  pointerId: number;
  at: number;
}

export interface SwipeIntent {
  kind: "swipe";
  start: PointerSample;
  end: PointerSample;
  axis: AxisLock;
  direction: SwipeDirection;
  delta: number;
  durationMs: number;
}

export type InputIntent =
  | { kind: "tap"; point: PointerSample }
  | { kind: "drag-start"; point: PointerSample }
  | { kind: "drag-move"; point: PointerSample; origin: PointerSample }
  | { kind: "drag-end"; point: PointerSample; origin: PointerSample }
  | SwipeIntent
  | { kind: "cancel"; reason: "pause" | "blur" | "dispose" };

export function normalizePointer(
  event: Pick<
    PointerEvent,
    "clientX" | "clientY" | "pointerId" | "timeStamp"
  >,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  logical: { width: number; height: number },
): PointerSample {
  return {
    x: ((event.clientX - rect.left) / rect.width) * logical.width,
    y: ((event.clientY - rect.top) / rect.height) * logical.height,
    pointerId: event.pointerId,
    at: event.timeStamp,
  };
}

export function classifySwipe(
  start: PointerSample,
  end: PointerSample,
  threshold = 10,
): SwipeIntent | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const axis: AxisLock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
  const delta = axis === "x" ? dx : dy;
  if (Math.abs(delta) <= threshold) return null;
  return {
    kind: "swipe",
    start,
    end,
    axis,
    direction:
      axis === "x"
        ? delta > 0
          ? "right"
          : "left"
        : delta > 0
          ? "down"
          : "up",
    delta,
    durationMs: Math.max(0, end.at - start.at),
  };
}
```

- [ ] **Step 4: 实现单指 `InputController`**

在同一文件追加；控制器在 `pointerdown` 时调用 `setPointerCapture`，在滑动越过阈值后固定轴向，`pointerup` 只发送一次 `swipe` 或 `tap/drag-end`：

```ts
export interface InputController {
  subscribe(listener: (intent: InputIntent) => void): () => void;
  setEnabled(enabled: boolean): void;
  cancelActive(reason: "pause" | "blur" | "dispose"): void;
  destroy(): void;
}

export function createInputController(options: {
  element: HTMLElement;
  logicalSize: { width: number; height: number };
  axisLockThreshold?: number;
  tapRadius?: number;
}): InputController {
  const listeners = new Set<(intent: InputIntent) => void>();
  const threshold = options.axisLockThreshold ?? 10;
  const tapRadius = options.tapRadius ?? 8;
  let enabled = true;
  let start: PointerSample | null = null;
  let last: PointerSample | null = null;
  let lock: AxisLock | null = null;
  const emit = (intent: InputIntent) =>
    listeners.forEach((listener) => listener(intent));
  const sample = (event: PointerEvent) =>
    normalizePointer(
      event,
      options.element.getBoundingClientRect(),
      options.logicalSize,
    );

  const down = (event: PointerEvent) => {
    if (!enabled || start !== null) return;
    options.element.setPointerCapture(event.pointerId);
    start = sample(event);
    last = start;
    lock = null;
    emit({ kind: "drag-start", point: start });
  };
  const move = (event: PointerEvent) => {
    if (!enabled || !start || event.pointerId !== start.pointerId) return;
    last = sample(event);
    const dx = last.x - start.x;
    const dy = last.y - start.y;
    if (!lock && Math.max(Math.abs(dx), Math.abs(dy)) > threshold) {
      lock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    const point =
      lock === "x"
        ? { ...last, y: start.y }
        : lock === "y"
          ? { ...last, x: start.x }
          : last;
    emit({ kind: "drag-move", point, origin: start });
  };
  const up = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.pointerId) return;
    const end = sample(event);
    const swipe = classifySwipe(start, end, threshold);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (swipe) emit(swipe);
    else if (distance <= tapRadius) emit({ kind: "tap", point: end });
    else emit({ kind: "drag-end", point: end, origin: start });
    start = null;
    last = null;
    lock = null;
  };
  options.element.style.touchAction = "none";
  options.element.addEventListener("pointerdown", down);
  options.element.addEventListener("pointermove", move);
  options.element.addEventListener("pointerup", up);
  options.element.addEventListener("pointercancel", up);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setEnabled(next) {
      enabled = next;
      if (!next) this.cancelActive("pause");
    },
    cancelActive(reason) {
      if (start) emit({ kind: "cancel", reason });
      start = null;
      last = null;
      lock = null;
    },
    destroy() {
      this.cancelActive("dispose");
      options.element.removeEventListener("pointerdown", down);
      options.element.removeEventListener("pointermove", move);
      options.element.removeEventListener("pointerup", up);
      options.element.removeEventListener("pointercancel", up);
      listeners.clear();
    },
  };
}
```

- [ ] **Step 5: 运行输入测试和类型检查**

Run:

```powershell
npx vitest run packages/input/src/index.test.ts
npm run typecheck
```

Expected: 输入测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 6: 提交输入包**

```powershell
git add -- games/wechat-h5-v2/packages/input/src/index.ts games/wechat-h5-v2/packages/input/src/index.test.ts
git commit -m "feat: add touch input controller"
```

### Task 6: 实现首次手势解锁、声音池和后台静音

**Files:**
- Create: `games/wechat-h5-v2/packages/audio/src/index.ts`
- Create: `games/wechat-h5-v2/packages/audio/src/index.test.ts`

- [ ] **Step 1: 写入音频解锁和声部上限失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { createAudioBus, type AudioBackend } from "./index";

function backend(): AudioBackend & {
  unlock: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
} {
  return {
    unlock: vi.fn(async () => true),
    play: vi.fn(() => ({ stop: vi.fn() })),
    suspend: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
  };
}

describe("audio bus", () => {
  it("does not unlock or play before an explicit gesture", async () => {
    const fake = backend();
    const bus = createAudioBus({ backend: fake, maxVoices: 2 });
    expect(bus.play("launch")).toBe(false);
    expect(fake.unlock).not.toHaveBeenCalled();
    await bus.unlockFromGesture();
    expect(bus.play("launch")).toBe(true);
  });

  it("caps simultaneous voices and suspends in background", async () => {
    const fake = backend();
    const bus = createAudioBus({ backend: fake, maxVoices: 2 });
    await bus.unlockFromGesture();
    bus.play("hit");
    bus.play("hit");
    bus.play("hit");
    expect(fake.play).toHaveBeenCalledTimes(2);
    await bus.suspend();
    expect(bus.snapshot()).toMatchObject({
      activeVoices: 0,
      suspended: true,
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认音频包入口不存在**

Run:

```powershell
npx vitest run packages/audio/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 实现可测试音频总线**

```ts
export interface AudioVoice {
  stop(): void;
}

export interface AudioBackend {
  unlock(): Promise<boolean>;
  play(cueId: string, options: AudioPlayOptions): AudioVoice;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;
}

export interface AudioPlayOptions {
  volume: number;
  playbackRate: number;
}

export interface AudioBusSnapshot {
  unlocked: boolean;
  muted: boolean;
  suspended: boolean;
  activeVoices: number;
  maxVoices: number;
}

export interface AudioBus {
  unlockFromGesture(): Promise<boolean>;
  play(
    cueId: string,
    options?: Partial<AudioPlayOptions>,
  ): boolean;
  setMuted(muted: boolean): void;
  suspend(): Promise<void>;
  resumeFromGesture(): Promise<boolean>;
  snapshot(): AudioBusSnapshot;
  dispose(): Promise<void>;
}

export function createAudioBus(options: {
  backend: AudioBackend;
  maxVoices?: number;
}): AudioBus {
  const maxVoices = options.maxVoices ?? 12;
  const voices = new Set<AudioVoice>();
  let unlocked = false;
  let muted = false;
  let suspended = false;
  const stopAll = () => {
    voices.forEach((voice) => voice.stop());
    voices.clear();
  };
  return {
    async unlockFromGesture() {
      if (muted) return false;
      unlocked = await options.backend.unlock();
      suspended = false;
      return unlocked;
    },
    play(cueId, partial = {}) {
      if (!unlocked || muted || suspended || voices.size >= maxVoices) {
        return false;
      }
      const voice = options.backend.play(cueId, {
        volume: partial.volume ?? 1,
        playbackRate: partial.playbackRate ?? 1,
      });
      voices.add(voice);
      queueMicrotask(() => voices.delete(voice));
      return true;
    },
    setMuted(next) {
      muted = next;
      if (muted) stopAll();
    },
    async suspend() {
      suspended = true;
      stopAll();
      await options.backend.suspend();
    },
    async resumeFromGesture() {
      if (muted) return false;
      await options.backend.resume();
      unlocked = true;
      suspended = false;
      return true;
    },
    snapshot: () => ({
      unlocked,
      muted,
      suspended,
      activeVoices: voices.size,
      maxVoices,
    }),
    async dispose() {
      stopAll();
      await options.backend.dispose();
      unlocked = false;
      suspended = true;
    },
  };
}
```

- [ ] **Step 4: 实现浏览器 Web Audio 后端**

在同一文件追加 `createWebAudioBackend()`；解码后的 `AudioBuffer` 由资源包注册，声音播放结束必须断开节点：

```ts
export interface WebAudioBackend extends AudioBackend {
  register(cueId: string, buffer: AudioBuffer): void;
  unregister(cueId: string): void;
}

export function createWebAudioBackend(options: {
  contextFactory?: () => AudioContext;
} = {}): WebAudioBackend {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  const buffers = new Map<string, AudioBuffer>();
  const factory =
    options.contextFactory ??
    (() => {
      const Constructor =
        window.AudioContext ??
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
      if (!Constructor) throw new Error("WEB_AUDIO_UNAVAILABLE");
      return new Constructor();
    });
  const ensure = () => {
    if (!context) {
      context = factory();
      master = context.createGain();
      master.gain.value = 0.7;
      master.connect(context.destination);
    }
    return context;
  };
  return {
    register: (cueId, buffer) => buffers.set(cueId, buffer),
    unregister: (cueId) => buffers.delete(cueId),
    async unlock() {
      try {
        const current = ensure();
        if (current.state === "suspended") await current.resume();
        return current.state === "running";
      } catch {
        return false;
      }
    },
    play(cueId, playOptions) {
      const current = ensure();
      const buffer = buffers.get(cueId);
      if (!buffer || !master) throw new Error(`AUDIO_CUE_MISSING:${cueId}`);
      const source = current.createBufferSource();
      const gain = current.createGain();
      source.buffer = buffer;
      source.playbackRate.value = playOptions.playbackRate;
      gain.gain.value = playOptions.volume;
      source.connect(gain);
      gain.connect(master);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start();
      return { stop: () => source.stop() };
    },
    async suspend() {
      if (context?.state === "running") await context.suspend();
    },
    async resume() {
      if (context?.state === "suspended") await context.resume();
    },
    async dispose() {
      buffers.clear();
      master?.disconnect();
      await context?.close();
      context = null;
      master = null;
    },
  };
}
```

- [ ] **Step 5: 运行音频单测与类型检查**

Run:

```powershell
npx vitest run packages/audio/src/index.test.ts
npm run typecheck
```

Expected: 音频测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 6: 提交音频包**

```powershell
git add -- games/wechat-h5-v2/packages/audio/src/index.ts games/wechat-h5-v2/packages/audio/src/index.test.ts
git commit -m "feat: add gesture-gated audio bus"
```

### Task 7: 实现带哈希、重试和释放的分组资源加载器

**Files:**
- Create: `games/wechat-h5-v2/packages/assets/src/index.ts`
- Create: `games/wechat-h5-v2/packages/assets/src/index.test.ts`

- [ ] **Step 1: 写入资源分组、重试和释放失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import type { AssetManifest } from "@gamehub/h5-contracts";
import { createAssetLoader, type AssetAdapter } from "./index";

const manifest: AssetManifest = {
  schemaVersion: 1,
  gameId: "ricochet-crew",
  revision: "fixture-1",
  groups: [
    {
      id: "boot",
      required: true,
      assets: [
        {
          id: "hero",
          groupId: "boot",
          type: "texture",
          url: "/hero.webp",
          bytes: 4,
          sha256:
            "e12e115acf4552b2568b55e93cbd39394c4ef81c82447fa8541d36c52077e7f9",
          width: 1,
          height: 1,
        },
      ],
    },
  ],
};

describe("asset loader", () => {
  it("retries once and releases the decoded group", async () => {
    const adapter: AssetAdapter = {
      fetchBytes: vi
        .fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
      decode: vi.fn(async () => ({ texture: true })),
      release: vi.fn(async () => undefined),
    };
    const loader = createAssetLoader({
      manifest,
      adapter,
      digest: async () =>
        "e12e115acf4552b2568b55e93cbd39394c4ef81c82447fa8541d36c52077e7f9",
      maxAttempts: 2,
    });
    await loader.loadGroup("boot");
    expect(loader.get("hero")).toEqual({ texture: true });
    expect(adapter.fetchBytes).toHaveBeenCalledTimes(2);
    await loader.releaseGroup("boot");
    expect(loader.snapshot().loadedAssetIds).toEqual([]);
  });

  it("rejects a hash mismatch instead of decoding corrupt bytes", async () => {
    const adapter: AssetAdapter = {
      fetchBytes: vi.fn(async () => new Uint8Array([9])),
      decode: vi.fn(),
      release: vi.fn(),
    };
    const loader = createAssetLoader({
      manifest,
      adapter,
      digest: async () => "bad-hash",
    });
    await expect(loader.loadGroup("boot")).rejects.toThrow(
      "ASSET_HASH_MISMATCH:hero",
    );
    expect(adapter.decode).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试并确认资源包入口不存在**

Run:

```powershell
npx vitest run packages/assets/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 实现资源适配器和加载器公开接口**

```ts
import type {
  AssetEntry,
  AssetManifest,
} from "@gamehub/h5-contracts";
export type { AssetManifest } from "@gamehub/h5-contracts";

export interface AssetAdapter {
  fetchBytes(entry: AssetEntry, signal: AbortSignal): Promise<Uint8Array>;
  decode(entry: AssetEntry, bytes: Uint8Array): Promise<unknown>;
  release(entry: AssetEntry, value: unknown): Promise<void> | void;
}

export interface AssetProgress {
  groupId: string;
  loadedAssets: number;
  totalAssets: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface AssetLoaderSnapshot {
  loadedGroupIds: string[];
  loadedAssetIds: string[];
  loadedBytes: number;
  estimatedTextureBytes: number;
  failedGroupIds: string[];
}

export interface AssetLoader {
  loadGroup(
    groupId: string,
    onProgress?: (progress: AssetProgress) => void,
  ): Promise<void>;
  retryGroup(groupId: string): Promise<void>;
  get<T>(assetId: string): T;
  releaseGroup(groupId: string): Promise<void>;
  snapshot(): AssetLoaderSnapshot;
  dispose(): Promise<void>;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
```

- [ ] **Step 4: 实现并发受限的重试、进度与释放**

在同一文件追加；单个资源最多尝试两次，失败组进入 `failedGroupIds`，缺失必需资源不能静默继续：

```ts
export function createAssetLoader(options: {
  manifest: AssetManifest;
  adapter: AssetAdapter;
  digest?: (bytes: Uint8Array) => Promise<string>;
  maxAttempts?: number;
}): AssetLoader {
  const values = new Map<string, unknown>();
  const loadedGroups = new Set<string>();
  const failedGroups = new Set<string>();
  const controllers = new Map<string, AbortController>();
  const digest = options.digest ?? sha256Hex;
  const maxAttempts = options.maxAttempts ?? 2;
  const entries = new Map(
    options.manifest.groups.flatMap((group) =>
      group.assets.map((entry) => [entry.id, entry] as const),
    ),
  );

  const loadEntry = async (entry: AssetEntry, signal: AbortSignal) => {
    let error: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const bytes = await options.adapter.fetchBytes(entry, signal);
        if ((await digest(bytes)) !== entry.sha256) {
          throw new Error(`ASSET_HASH_MISMATCH:${entry.id}`);
        }
        const value = await options.adapter.decode(entry, bytes);
        values.set(entry.id, value);
        return;
      } catch (caught) {
        error = caught;
        if (
          caught instanceof Error &&
          caught.message.startsWith("ASSET_HASH_MISMATCH:")
        ) {
          break;
        }
      }
    }
    throw error;
  };

  const api: AssetLoader = {
    async loadGroup(groupId, onProgress) {
      const group = options.manifest.groups.find((item) => item.id === groupId);
      if (!group) throw new Error(`ASSET_GROUP_UNKNOWN:${groupId}`);
      if (loadedGroups.has(groupId)) return;
      const controller = new AbortController();
      controllers.set(groupId, controller);
      let loadedAssets = 0;
      let loadedBytes = 0;
      const totalBytes = group.assets.reduce(
        (sum, entry) => sum + entry.bytes,
        0,
      );
      try {
        for (const entry of group.assets) {
          await loadEntry(entry, controller.signal);
          loadedAssets += 1;
          loadedBytes += entry.bytes;
          onProgress?.({
            groupId,
            loadedAssets,
            totalAssets: group.assets.length,
            loadedBytes,
            totalBytes,
          });
        }
        failedGroups.delete(groupId);
        loadedGroups.add(groupId);
      } catch (error) {
        failedGroups.add(groupId);
        throw error;
      } finally {
        controllers.delete(groupId);
      }
    },
    retryGroup(groupId) {
      failedGroups.delete(groupId);
      return api.loadGroup(groupId);
    },
    get<T>(assetId: string): T {
      if (!values.has(assetId)) throw new Error(`ASSET_NOT_LOADED:${assetId}`);
      return values.get(assetId) as T;
    },
    async releaseGroup(groupId) {
      const group = options.manifest.groups.find((item) => item.id === groupId);
      if (!group) return;
      for (const entry of group.assets) {
        const value = values.get(entry.id);
        if (value !== undefined) {
          await options.adapter.release(entry, value);
          values.delete(entry.id);
        }
      }
      loadedGroups.delete(groupId);
      failedGroups.delete(groupId);
    },
    snapshot() {
      const loadedEntries = [...values.keys()]
        .map((id) => entries.get(id))
        .filter((entry): entry is AssetEntry => Boolean(entry));
      return {
        loadedGroupIds: [...loadedGroups],
        loadedAssetIds: [...values.keys()],
        loadedBytes: loadedEntries.reduce(
          (sum, entry) => sum + entry.bytes,
          0,
        ),
        estimatedTextureBytes: loadedEntries.reduce(
          (sum, entry) =>
            sum +
            (entry.width && entry.height
              ? entry.width * entry.height * 4
              : 0),
          0,
        ),
        failedGroupIds: [...failedGroups],
      };
    },
    async dispose() {
      controllers.forEach((controller) => controller.abort());
      for (const group of options.manifest.groups) {
        await api.releaseGroup(group.id);
      }
    },
  };
  return api;
}
```

- [ ] **Step 5: 增加浏览器 Fetch/Blob 适配器**

追加 `createBrowserAssetAdapter()`；图像解码通过 Blob URL 交给调用方提供的 PixiJS 解码函数，释放时必须撤销 Blob URL：

```ts
export function createBrowserAssetAdapter(options: {
  decodeBlob(
    entry: AssetEntry,
    url: string,
    bytes: Uint8Array,
  ): Promise<unknown>;
  releaseDecoded(entry: AssetEntry, value: unknown): Promise<void> | void;
}): AssetAdapter {
  const blobUrls = new Map<string, string>();
  return {
    async fetchBytes(entry, signal) {
      const response = await fetch(entry.url, {
        signal,
        cache: "force-cache",
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`ASSET_HTTP_${response.status}:${entry.id}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    async decode(entry, bytes) {
      const url = URL.createObjectURL(new Blob([bytes]));
      blobUrls.set(entry.id, url);
      return options.decodeBlob(entry, url, bytes);
    },
    async release(entry, value) {
      await options.releaseDecoded(entry, value);
      const url = blobUrls.get(entry.id);
      if (url) URL.revokeObjectURL(url);
      blobUrls.delete(entry.id);
    },
  };
}
```

- [ ] **Step 6: 运行资源测试和类型检查**

Run:

```powershell
npx vitest run packages/assets/src/index.test.ts
npm run typecheck
```

Expected: 资源测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 7: 提交资源加载器**

```powershell
git add -- games/wechat-h5-v2/packages/assets/src/index.ts games/wechat-h5-v2/packages/assets/src/index.test.ts
git commit -m "feat: add verified grouped asset loader"
```

### Task 8: 定义高保真资产来源记录和导出配方

**Files:**
- Create: `games/wechat-h5-v2/art/README.md`
- Create: `games/wechat-h5-v2/art/schemas/provenance.schema.json`
- Create: `games/wechat-h5-v2/art/recipes/hub.json`
- Create: `games/wechat-h5-v2/scripts/export-art-assets.mjs`
- Create: `games/wechat-h5-v2/scripts/export-art-assets.test.mjs`

- [ ] **Step 1: 写入资产导出失败测试**

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";
import { exportRecipe } from "./export-art-assets.mjs";

test("exports a bounded webp runtime image and reports dimensions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-art-"));
  const source = path.join(root, "source.png");
  const target = path.join(root, "runtime.webp");
  await sharp({
    create: {
      width: 2400,
      height: 1600,
      channels: 4,
      background: "#5b3f91",
    },
  }).png().toFile(source);
  const result = await exportRecipe({
    source,
    target,
    width: 960,
    height: 540,
    fit: "cover",
    format: "webp",
    quality: 88,
  });
  const metadata = await sharp(await readFile(target)).metadata();
  assert.deepEqual(
    { width: metadata.width, height: metadata.height, format: metadata.format },
    { width: 960, height: 540, format: "webp" },
  );
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});
```

- [ ] **Step 2: 运行测试并确认导出脚本不存在**

Run:

```powershell
node --test scripts/export-art-assets.test.mjs
```

Expected: 退出码 `1`，错误包含 `ERR_MODULE_NOT_FOUND` 和 `export-art-assets.mjs`。

- [ ] **Step 3: 创建来源记录 JSON Schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gamehub.example/schemas/h5-art-provenance.schema.json",
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": [
      "id",
      "gameId",
      "role",
      "sourceFile",
      "runtimeFile",
      "prompt",
      "generatedAt",
      "usage",
      "sha256",
      "humanRevisionStatus"
    ],
    "properties": {
      "id": { "type": "string", "minLength": 3 },
      "gameId": {
        "enum": [
          "hub",
          "ricochet-crew",
          "monster-night-market",
          "three-lane-squad"
        ]
      },
      "role": {
        "enum": [
          "key-art",
          "scene",
          "character",
          "boss",
          "atlas",
          "effect",
          "ui",
          "audio"
        ]
      },
      "sourceFile": { "type": "string", "minLength": 1 },
      "runtimeFile": { "type": "string", "minLength": 1 },
      "prompt": { "type": "string", "minLength": 20 },
      "generatedAt": { "type": "string", "format": "date-time" },
      "usage": { "type": "string", "minLength": 8 },
      "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
      "humanRevisionStatus": {
        "enum": ["generated", "retouched", "approved", "rejected"]
      },
      "frameRate": { "type": "number", "minimum": 8, "maximum": 12 },
      "notes": { "type": "string" }
    }
  }
}
```

- [ ] **Step 4: 创建大厅精确导出配方**

```json
{
  "schemaVersion": 1,
  "gameId": "hub",
  "outputs": [
    {
      "id": "hub-key-art",
      "source": "art/source/hub/hub-key-art.png",
      "target": "apps/hub/public/assets/hub-key-art.webp",
      "width": 780,
      "height": 1688,
      "fit": "cover",
      "format": "webp",
      "quality": 88,
      "groupId": "boot",
      "type": "texture"
    },
    {
      "id": "ricochet-card",
      "source": "art/source/hub/ricochet-card.png",
      "target": "apps/hub/public/assets/ricochet-card.webp",
      "width": 960,
      "height": 540,
      "fit": "cover",
      "format": "webp",
      "quality": 86,
      "groupId": "boot",
      "type": "texture"
    },
    {
      "id": "night-market-card",
      "source": "art/source/hub/night-market-card.png",
      "target": "apps/hub/public/assets/night-market-card.webp",
      "width": 960,
      "height": 540,
      "fit": "cover",
      "format": "webp",
      "quality": 86,
      "groupId": "boot",
      "type": "texture"
    },
    {
      "id": "three-lane-card",
      "source": "art/source/hub/three-lane-card.png",
      "target": "apps/hub/public/assets/three-lane-card.webp",
      "width": 960,
      "height": 540,
      "fit": "cover",
      "format": "webp",
      "quality": 86,
      "groupId": "boot",
      "type": "texture"
    }
  ]
}
```

- [ ] **Step 5: 实现可复现图像导出**

```js
// games/wechat-h5-v2/scripts/export-art-assets.mjs
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function exportRecipe(recipe) {
  await mkdir(path.dirname(recipe.target), { recursive: true });
  const pipeline = sharp(recipe.source)
    .rotate()
    .resize(recipe.width, recipe.height, {
      fit: recipe.fit,
      position: "centre",
      withoutEnlargement: false,
    });
  if (recipe.format === "png") {
    pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  } else {
    pipeline.webp({ quality: recipe.quality, effort: 6, smartSubsample: true });
  }
  await pipeline.toFile(recipe.target);
  const bytes = await readFile(recipe.target);
  return {
    target: recipe.target,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    width: recipe.width,
    height: recipe.height,
  };
}

export async function exportRecipeFile(recipeFile, cwd = process.cwd()) {
  const parsed = JSON.parse(await readFile(recipeFile, "utf8"));
  const results = [];
  for (const output of parsed.outputs) {
    results.push(
      await exportRecipe({
        ...output,
        source: path.resolve(cwd, output.source),
        target: path.resolve(cwd, output.target),
      }),
    );
  }
  const reportFile = path.resolve(
    cwd,
    `art/reports/${parsed.gameId}-export.json`,
  );
  await mkdir(path.dirname(reportFile), { recursive: true });
  await writeFile(reportFile, `${JSON.stringify(results, null, 2)}\n`);
  return results;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const requested = process.argv.slice(2);
  const files = requested.length
    ? requested
    : (await readdir("art/recipes"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => path.join("art/recipes", file));
  for (const file of files) await exportRecipeFile(file);
}
```

- [ ] **Step 6: 写入资产执行规范**

`art/README.md` 必须明确以下可执行门槛：

```markdown
# 微信 H5 V2 高保真资产管线

1. 源图只放入 `art/source/<game-id>/`，运行时只读取应用自己的 `public/assets/`。
2. 角色设定图必须拆成透明图集或骨骼部件；概念图不能直接冒充运行时角色。
3. 单张运行时图像的宽和高均不得超过 2048px；场景拆成前景、中景、远景。
4. 动作原画按 8–12fps 生产；高、中、低性能档共享动作语义，不删除危险提示。
5. 每个生成资产都要在 `art/provenance/<game-id>.json` 记录提示词、生成时间、用途、SHA-256 和人工修订状态。
6. 只有 `humanRevisionStatus` 为 `retouched` 或 `approved` 的资产可以进入评审构建。
7. 每款 boot 组传输不超过 5,000,000 bytes，单局全部分组不超过 18,000,000 bytes，估算纹理内存不超过 80MiB。
8. 不使用来源不明素材；外部授权素材必须在 `notes` 写明授权文件路径和允许用途。
```

- [ ] **Step 7: 运行资产导出测试**

Run:

```powershell
node --test scripts/export-art-assets.test.mjs
```

Expected: `1` 个测试通过；临时输出精确为 `960×540 WebP`；SHA-256 为 64 位小写十六进制。

- [ ] **Step 8: 提交资产来源规则与导出器**

```powershell
git add -- games/wechat-h5-v2/art/README.md games/wechat-h5-v2/art/schemas/provenance.schema.json games/wechat-h5-v2/art/recipes/hub.json games/wechat-h5-v2/scripts/export-art-assets.mjs games/wechat-h5-v2/scripts/export-art-assets.test.mjs
git commit -m "feat: define high fidelity art pipeline"
```

### Task 9: 生成资源清单并执行包体、图集和纹理预算门禁

**Files:**
- Create: `games/wechat-h5-v2/scripts/build-asset-manifests.mjs`
- Create: `games/wechat-h5-v2/scripts/validate-art-assets.mjs`
- Create: `games/wechat-h5-v2/scripts/validate-art-assets.test.mjs`

- [ ] **Step 1: 写入超规格图集和 boot 超预算失败测试**

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { validateRuntimeAssets } from "./validate-art-assets.mjs";

test("rejects an atlas wider than 2048px", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-budget-"));
  const asset = path.join(root, "wide.png");
  await sharp({
    create: {
      width: 2049,
      height: 64,
      channels: 4,
      background: "#ffffff",
    },
  }).png().toFile(asset);
  const result = await validateRuntimeAssets({
    root,
    manifest: {
      schemaVersion: 1,
      gameId: "hub",
      revision: "fixture",
      groups: [{
        id: "boot",
        required: true,
        assets: [{
          id: "wide",
          groupId: "boot",
          type: "texture",
          url: "wide.png",
          bytes: 1,
          sha256: "0".repeat(64),
          width: 2049,
          height: 64,
        }],
      }],
    },
    provenance: [],
  });
  assert(result.errors.some((error) => error.includes("ATLAS_DIMENSION:wide")));
});

test("rejects a boot group above 5MB", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "h5-boot-"));
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "large.bin"), Buffer.alloc(5_000_001));
  const result = await validateRuntimeAssets({
    root,
    manifest: {
      schemaVersion: 1,
      gameId: "hub",
      revision: "fixture",
      groups: [{
        id: "boot",
        required: true,
        assets: [{
          id: "large",
          groupId: "boot",
          type: "json",
          url: "large.bin",
          bytes: 5_000_001,
          sha256: "0".repeat(64),
        }],
      }],
    },
    provenance: [],
  });
  assert(result.errors.includes("BOOT_BYTES:5000001>5000000"));
});
```

- [ ] **Step 2: 运行测试并确认校验脚本不存在**

Run:

```powershell
node --test scripts/validate-art-assets.test.mjs
```

Expected: 退出码 `1`，错误包含 `ERR_MODULE_NOT_FOUND` 和 `validate-art-assets.mjs`。

- [ ] **Step 3: 实现资源清单生成器**

`build-asset-manifests.mjs` 必须读取每个导出配方与导出报告，拒绝报告中缺失的文件，并写入应用自己的清单：

```js
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function buildManifest(recipeFile, cwd = process.cwd()) {
  const recipe = JSON.parse(await readFile(recipeFile, "utf8"));
  const reportFile = path.resolve(
    cwd,
    `art/reports/${recipe.gameId}-export.json`,
  );
  const report = JSON.parse(await readFile(reportFile, "utf8"));
  const byTarget = new Map(report.map((item) => [path.resolve(item.target), item]));
  const groups = new Map();
  for (const output of recipe.outputs) {
    const target = path.resolve(cwd, output.target);
    const exported = byTarget.get(target);
    if (!exported) throw new Error(`EXPORT_REPORT_MISSING:${output.id}`);
    const asset = {
      id: output.id,
      groupId: output.groupId,
      type: output.type,
      url: `./${path.basename(output.target)}`,
      bytes: exported.bytes,
      sha256: exported.sha256,
      width: exported.width,
      height: exported.height,
    };
    const group = groups.get(output.groupId) ?? [];
    group.push(asset);
    groups.set(output.groupId, group);
  }
  const manifest = {
    schemaVersion: 1,
    gameId: recipe.gameId,
    revision: report.map((item) => item.sha256.slice(0, 8)).join("-"),
    groups: [...groups].map(([id, assets]) => ({
      id,
      required: id === "boot",
      assets,
    })),
  };
  const target = path.resolve(
    cwd,
    `apps/${recipe.gameId}/public/assets/asset-manifest.json`,
  );
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const requested = process.argv.slice(2);
  const recipeFiles = requested.length
    ? requested
    : (await readdir("art/recipes"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => path.join("art/recipes", file));
  for (const recipeFile of recipeFiles) await buildManifest(recipeFile);
}
```

- [ ] **Step 4: 实现预算与来源门禁**

```js
// games/wechat-h5-v2/scripts/validate-art-assets.mjs
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BOOT_LIMIT = 5_000_000;
const RUN_LIMIT = 18_000_000;
const TEXTURE_LIMIT = 80 * 1024 * 1024;

export async function validateRuntimeAssets({ root, manifest, provenance }) {
  const errors = [];
  const allAssets = manifest.groups.flatMap((group) => group.assets);
  const bootBytes =
    manifest.groups.find((group) => group.id === "boot")?.assets.reduce(
      (sum, asset) => sum + asset.bytes,
      0,
    ) ?? 0;
  const runBytes = allAssets.reduce((sum, asset) => sum + asset.bytes, 0);
  const textureBytes = allAssets.reduce(
    (sum, asset) =>
      sum + (asset.width && asset.height ? asset.width * asset.height * 4 : 0),
    0,
  );
  if (bootBytes > BOOT_LIMIT) errors.push(`BOOT_BYTES:${bootBytes}>${BOOT_LIMIT}`);
  if (runBytes > RUN_LIMIT) errors.push(`RUN_BYTES:${runBytes}>${RUN_LIMIT}`);
  if (textureBytes > TEXTURE_LIMIT) {
    errors.push(`TEXTURE_BYTES:${textureBytes}>${TEXTURE_LIMIT}`);
  }
  const provenanceById = new Map(provenance.map((item) => [item.id, item]));
  for (const asset of allAssets) {
    if (
      (asset.width ?? 0) > 2048 ||
      (asset.height ?? 0) > 2048
    ) {
      errors.push(`ATLAS_DIMENSION:${asset.id}`);
    }
    if (
      asset.frameRate !== undefined &&
      (asset.frameRate < 8 || asset.frameRate > 12)
    ) {
      errors.push(`ANIMATION_FPS:${asset.id}`);
    }
    const file = path.resolve(root, asset.url);
    try {
      const bytes = await readFile(file);
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hash !== asset.sha256) errors.push(`HASH_MISMATCH:${asset.id}`);
      if (bytes.length !== asset.bytes) errors.push(`BYTE_MISMATCH:${asset.id}`);
    } catch {
      errors.push(`FILE_MISSING:${asset.id}`);
    }
    const source = provenanceById.get(asset.id);
    if (
      !source ||
      !["retouched", "approved"].includes(source.humanRevisionStatus)
    ) {
      errors.push(`PROVENANCE_NOT_APPROVED:${asset.id}`);
    }
  }
  return { errors, bootBytes, runBytes, textureBytes };
}

export async function validateApp(gameId, cwd = process.cwd()) {
  const assets = path.resolve(cwd, `apps/${gameId}/public/assets`);
  const manifest = JSON.parse(
    await readFile(path.join(assets, "asset-manifest.json"), "utf8"),
  );
  const provenance = JSON.parse(
    await readFile(
      path.resolve(cwd, `art/provenance/${gameId}.json`),
      "utf8",
    ),
  );
  const result = await validateRuntimeAssets({
    root: assets,
    manifest,
    provenance,
  });
  if (result.errors.length) {
    throw new Error(
      `ASSET_VALIDATION_FAILED:${gameId}\n${result.errors.join("\n")}`,
    );
  }
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const requested = process.argv.slice(2);
  const gameIds = requested.length
    ? requested
    : (await readdir("art/recipes"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) => path.basename(file, ".json"));
  for (const gameId of gameIds) await validateApp(gameId);
}
```

- [ ] **Step 5: 运行资产门禁测试**

Run:

```powershell
node --test scripts/validate-art-assets.test.mjs
```

Expected: `2` 个测试通过，分别捕获 `ATLAS_DIMENSION:wide` 和 `BOOT_BYTES:5000001>5000000`。

- [ ] **Step 6: 提交清单和预算门禁**

```powershell
git add -- games/wechat-h5-v2/scripts/build-asset-manifests.mjs games/wechat-h5-v2/scripts/validate-art-assets.mjs games/wechat-h5-v2/scripts/validate-art-assets.test.mjs
git commit -m "feat: enforce h5 asset budgets"
```

### Task 10: 实现版本化本地存档、校验、备份和恢复

**Files:**
- Create: `games/wechat-h5-v2/packages/save/src/index.ts`
- Create: `games/wechat-h5-v2/packages/save/src/index.test.ts`

- [ ] **Step 1: 写入独立存档、迁移和损坏恢复失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  createMemorySaveAdapter,
  createSaveStore,
} from "./index";

interface Progress {
  unlocked: string[];
  runs: number;
}

describe("save store", () => {
  it("migrates one schema version at a time", async () => {
    const adapter = createMemorySaveAdapter();
    const v1 = createSaveStore<Progress>({
      gameId: "monster-night-market",
      currentSchemaVersion: 1,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {},
      adapter,
      now: () => 100,
    });
    await v1.save({ unlocked: ["grill"], runs: 1 });
    const v2 = createSaveStore<Progress>({
      gameId: "monster-night-market",
      currentSchemaVersion: 2,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {
        1: (value) => ({ ...value, unlocked: [...value.unlocked, "dessert"] }),
      },
      adapter,
      now: () => 200,
    });
    const loaded = await v2.load();
    expect(loaded.payload.unlocked).toEqual(["grill", "dessert"]);
    expect(loaded.envelope.schemaVersion).toBe(2);
  });

  it("restores the last valid backup without touching another game", async () => {
    const adapter = createMemorySaveAdapter();
    const ricochet = createSaveStore<Progress>({
      gameId: "ricochet-crew",
      currentSchemaVersion: 1,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {},
      adapter,
      now: () => 300,
    });
    const squad = createSaveStore<Progress>({
      gameId: "three-lane-squad",
      currentSchemaVersion: 1,
      defaultValue: () => ({ unlocked: [], runs: 0 }),
      migrations: {},
      adapter,
      now: () => 300,
    });
    await ricochet.save({ unlocked: ["hero-a"], runs: 1 });
    await ricochet.save({ unlocked: ["hero-b"], runs: 2 });
    await squad.save({ unlocked: ["guard"], runs: 1 });
    await adapter.set("save:ricochet-crew:primary", "{broken");
    const restored = await ricochet.load();
    expect(restored.recovered).toBe(true);
    expect(restored.payload.unlocked).toEqual(["hero-a"]);
    expect((await squad.load()).payload.unlocked).toEqual(["guard"]);
  });
});
```

- [ ] **Step 2: 运行测试并确认存档入口不存在**

Run:

```powershell
npx vitest run packages/save/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 定义适配器、结果与稳定序列化**

```ts
import type {
  GameId,
  GameSaveEnvelope,
} from "@gamehub/h5-contracts";

export interface SaveAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}

export interface SaveLoadResult<T> {
  payload: T;
  envelope: GameSaveEnvelope<T>;
  source: "primary" | "backup" | "default";
  recovered: boolean;
}

export interface SaveStoreSnapshot {
  gameId: GameId;
  primaryPresent: boolean;
  backupPresent: boolean;
  corruptCopies: number;
}

export interface SaveStore<T> {
  load(): Promise<SaveLoadResult<T>>;
  save(payload: T): Promise<GameSaveEnvelope<T>>;
  clear(): Promise<void>;
  inspect(): Promise<SaveStoreSnapshot>;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function checksum<T>(
  envelope: Omit<GameSaveEnvelope<T>, "checksum">,
): Promise<string> {
  const bytes = new TextEncoder().encode(stable(envelope));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
```

- [ ] **Step 4: 实现存档、逐版本迁移和损坏副本**

```ts
export function createSaveStore<T>(options: {
  gameId: Exclude<GameId, "hub">;
  currentSchemaVersion: number;
  defaultValue(): T;
  migrations: Record<number, (payload: T) => T>;
  adapter: SaveAdapter;
  now?: () => number;
}): SaveStore<T> {
  const prefix = `save:${options.gameId}:`;
  const primaryKey = `${prefix}primary`;
  const backupKey = `${prefix}backup`;
  const now = options.now ?? Date.now;

  const parse = async (raw: string | null) => {
    if (!raw) return null;
    const envelope = JSON.parse(raw) as GameSaveEnvelope<T>;
    const expected = await checksum({
      schemaVersion: envelope.schemaVersion,
      gameId: envelope.gameId,
      updatedAt: envelope.updatedAt,
      payload: envelope.payload,
    });
    if (envelope.gameId !== options.gameId || expected !== envelope.checksum) {
      throw new Error("SAVE_CHECKSUM_INVALID");
    }
    return envelope;
  };

  const migrate = async (input: GameSaveEnvelope<T>) => {
    let payload = input.payload;
    let version = input.schemaVersion;
    while (version < options.currentSchemaVersion) {
      const migration = options.migrations[version];
      if (!migration) throw new Error(`SAVE_MIGRATION_MISSING:${version}`);
      payload = migration(payload);
      version += 1;
    }
    if (version > options.currentSchemaVersion) {
      throw new Error(`SAVE_SCHEMA_NEWER:${version}`);
    }
    return { payload, version };
  };

  const api: SaveStore<T> = {
    async load() {
      const primaryRaw = await options.adapter.get(primaryKey);
      try {
        const primary = await parse(primaryRaw);
        if (primary) {
          const result = await migrate(primary);
          if (result.version !== primary.schemaVersion) {
            const envelope = await api.save(result.payload);
            return {
              payload: result.payload,
              envelope,
              source: "primary",
              recovered: false,
            };
          }
          return {
            payload: result.payload,
            envelope: primary,
            source: "primary",
            recovered: false,
          };
        }
      } catch {
        if (primaryRaw) {
          await options.adapter.set(`${prefix}corrupt:${now()}`, primaryRaw);
        }
      }
      const backupRaw = await options.adapter.get(backupKey);
      try {
        const backup = await parse(backupRaw);
        if (backup) {
          const result = await migrate(backup);
          const envelope = await api.save(result.payload);
          return {
            payload: result.payload,
            envelope,
            source: "backup",
            recovered: true,
          };
        }
      } catch {
        if (backupRaw) {
          await options.adapter.set(`${prefix}corrupt:${now()}`, backupRaw);
        }
      }
      const payload = options.defaultValue();
      const envelope = await api.save(payload);
      return { payload, envelope, source: "default", recovered: false };
    },
    async save(payload) {
      const previous = await options.adapter.get(primaryKey);
      if (previous) {
        try {
          await parse(previous);
          await options.adapter.set(backupKey, previous);
        } catch {
          await options.adapter.set(`${prefix}corrupt:${now()}`, previous);
        }
      }
      const unsigned = {
        schemaVersion: options.currentSchemaVersion,
        gameId: options.gameId,
        updatedAt: now(),
        payload: structuredClone(payload),
      };
      const envelope = {
        ...unsigned,
        checksum: await checksum(unsigned),
      };
      await options.adapter.set(primaryKey, JSON.stringify(envelope));
      return envelope;
    },
    async clear() {
      for (const key of await options.adapter.keys(prefix)) {
        await options.adapter.remove(key);
      }
    },
    async inspect() {
      const keys = await options.adapter.keys(prefix);
      return {
        gameId: options.gameId,
        primaryPresent: keys.includes(primaryKey),
        backupPresent: keys.includes(backupKey),
        corruptCopies: keys.filter((key) => key.startsWith(`${prefix}corrupt:`))
          .length,
      };
    },
  };
  return api;
}
```

- [ ] **Step 5: 实现内存与浏览器 localStorage 适配器**

```ts
export function createMemorySaveAdapter(): SaveAdapter {
  const values = new Map<string, string>();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
    keys: async (prefix) =>
      [...values.keys()].filter((key) => key.startsWith(prefix)),
  };
}

export function createLocalStorageSaveAdapter(
  storage: Storage = localStorage,
): SaveAdapter {
  return {
    get: async (key) => storage.getItem(key),
    set: async (key, value) => storage.setItem(key, value),
    remove: async (key) => storage.removeItem(key),
    keys: async (prefix) =>
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(prefix))),
  };
}
```

玩法只保存成长、图鉴、每日记录和设置；禁止把 `OpenID`、`session_key`、长期令牌、手机号或支付信息放入 payload。

- [ ] **Step 6: 运行存档测试和类型检查**

Run:

```powershell
npx vitest run packages/save/src/index.test.ts
npm run typecheck
```

Expected: 存档测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 7: 提交存档包**

```powershell
git add -- games/wechat-h5-v2/packages/save/src/index.ts games/wechat-h5-v2/packages/save/src/index.test.ts
git commit -m "feat: add recoverable per-game saves"
```

### Task 11: 实现本地遥测队列、运行会话和联网适配器边界

**Files:**
- Create: `games/wechat-h5-v2/packages/telemetry/src/index.ts`
- Create: `games/wechat-h5-v2/packages/telemetry/src/index.test.ts`

- [ ] **Step 1: 写入事件顺序、运行边界和隐私失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  createMemoryTelemetryQueue,
  createTelemetryClient,
} from "./index";

describe("telemetry client", () => {
  it("creates ordered local events and closes the run", () => {
    const queue = createMemoryTelemetryQueue();
    const client = createTelemetryClient({
      gameId: "three-lane-squad",
      testMode: true,
      queue,
      sessionId: "session-1",
      idFactory: (() => {
        let id = 0;
        return () => `event-${++id}`;
      })(),
      now: () => 1234,
    });
    client.beginRun("run-1");
    client.emit("first_input", { action: "deploy" });
    client.endRun({ outcome: "won" });
    expect(client.snapshot()).toMatchObject({
      runId: null,
      queuedEvents: 3,
      nextSeq: 4,
    });
    expect(queue.read().map((event) => event.event)).toEqual([
      "run_start",
      "first_input",
      "run_end",
    ]);
  });

  it("rejects credential-shaped payload keys", () => {
    const client = createTelemetryClient({
      gameId: "ricochet-crew",
      testMode: false,
      queue: createMemoryTelemetryQueue(),
      sessionId: "session-2",
    });
    expect(() =>
      client.emit("game_boot", { session_key: "secret" }),
    ).toThrow("TELEMETRY_SENSITIVE_KEY:session_key");
  });
});
```

- [ ] **Step 2: 运行测试并确认遥测入口不存在**

Run:

```powershell
npx vitest run packages/telemetry/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 定义队列、传输适配器和公开结果**

```ts
import type {
  GameEvent,
  GameEventName,
  GameId,
} from "@gamehub/h5-contracts";

export interface TelemetryQueue {
  append(event: GameEvent): void;
  read(): GameEvent[];
  remove(eventIds: string[]): void;
  clear(): void;
}

export interface TelemetryTransport {
  send(events: readonly GameEvent[]): Promise<{
    acceptedEventIds: string[];
  }>;
}

export interface FlushResult {
  attempted: number;
  accepted: number;
  retained: number;
  transport: "none" | "configured";
}

export interface TelemetrySnapshot {
  sessionId: string;
  runId: string | null;
  queuedEvents: number;
  nextSeq: number;
}

export interface TelemetryClient {
  beginRun(runId: string): void;
  emit(
    event: GameEventName,
    payload?: Record<string, unknown>,
  ): GameEvent;
  endRun(payload?: Record<string, unknown>): GameEvent;
  flush(): Promise<FlushResult>;
  snapshot(): TelemetrySnapshot;
  dispose(): void;
}
```

- [ ] **Step 4: 实现本地优先事件客户端**

```ts
const SENSITIVE_KEYS = new Set([
  "openid",
  "openId",
  "session_key",
  "sessionKey",
  "token",
  "access_token",
  "phone",
  "mobile",
  "payment",
]);

function assertSafePayload(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      throw new Error(`TELEMETRY_SENSITIVE_KEY:${key}`);
    }
    assertSafePayload(child);
  }
}

export function createTelemetryClient(options: {
  gameId: GameId;
  testMode: boolean;
  queue: TelemetryQueue;
  transport?: TelemetryTransport;
  sessionId?: string;
  idFactory?: () => string;
  now?: () => number;
}): TelemetryClient {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const idFactory = options.idFactory ?? crypto.randomUUID;
  const now = options.now ?? Date.now;
  let runId: string | null = null;
  let seq = 1;
  const api: TelemetryClient = {
    beginRun(nextRunId) {
      if (runId) throw new Error(`TELEMETRY_RUN_ACTIVE:${runId}`);
      runId = nextRunId;
      api.emit("run_start");
    },
    emit(event, payload = {}) {
      assertSafePayload(payload);
      const item: GameEvent = {
        eventId: idFactory(),
        sessionId,
        runId,
        gameId: options.gameId,
        event,
        seq,
        clientAt: now(),
        schemaVersion: 1,
        testMode: options.testMode,
        payload: structuredClone(payload),
      };
      seq += 1;
      options.queue.append(item);
      return item;
    },
    endRun(payload = {}) {
      if (!runId) throw new Error("TELEMETRY_RUN_NOT_ACTIVE");
      const item = api.emit("run_end", payload);
      runId = null;
      return item;
    },
    async flush() {
      const events = options.queue.read();
      if (!options.transport) {
        return {
          attempted: 0,
          accepted: 0,
          retained: events.length,
          transport: "none",
        };
      }
      const result = await options.transport.send(events);
      options.queue.remove(result.acceptedEventIds);
      return {
        attempted: events.length,
        accepted: result.acceptedEventIds.length,
        retained: options.queue.read().length,
        transport: "configured",
      };
    },
    snapshot: () => ({
      sessionId,
      runId,
      queuedEvents: options.queue.read().length,
      nextSeq: seq,
    }),
    dispose() {
      runId = null;
    },
  };
  return api;
}

export function createMemoryTelemetryQueue(): TelemetryQueue {
  let events: GameEvent[] = [];
  return {
    append: (event) => events.push(structuredClone(event)),
    read: () => structuredClone(events),
    remove: (ids) => {
      const accepted = new Set(ids);
      events = events.filter((event) => !accepted.has(event.eventId));
    },
    clear: () => {
      events = [];
    },
  };
}
```

- [ ] **Step 5: 实现 localStorage 队列**

```ts
export function createLocalTelemetryQueue(options: {
  gameId: GameId;
  storage?: Storage;
  maxEvents?: number;
}): TelemetryQueue {
  const storage = options.storage ?? localStorage;
  const key = `telemetry:${options.gameId}:queue`;
  const maxEvents = options.maxEvents ?? 1000;
  const load = (): GameEvent[] => {
    try {
      return JSON.parse(storage.getItem(key) ?? "[]");
    } catch {
      return [];
    }
  };
  const save = (events: GameEvent[]) =>
    storage.setItem(key, JSON.stringify(events.slice(-maxEvents)));
  return {
    append: (event) => save([...load(), event]),
    read: load,
    remove: (ids) => {
      const accepted = new Set(ids);
      save(load().filter((event) => !accepted.has(event.eventId)));
    },
    clear: () => storage.removeItem(key),
  };
}
```

- [ ] **Step 6: 运行遥测测试和类型检查**

Run:

```powershell
npx vitest run packages/telemetry/src/index.test.ts
npm run typecheck
```

Expected: 遥测测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 7: 提交遥测包**

```powershell
git add -- games/wechat-h5-v2/packages/telemetry/src/index.ts games/wechat-h5-v2/packages/telemetry/src/index.test.ts
git commit -m "feat: add local-first h5 telemetry"
```

### Task 12: 实现减少动态效果、状态播报和模态焦点

**Files:**
- Create: `games/wechat-h5-v2/packages/accessibility/src/index.ts`
- Create: `games/wechat-h5-v2/packages/accessibility/src/index.test.ts`

- [ ] **Step 1: 写入系统简动、播报和订阅失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import { createAccessibilityController } from "./index";

describe("accessibility controller", () => {
  it("starts from system reduced motion and announces state", async () => {
    const root = { dataset: {} } as unknown as HTMLElement;
    const liveRegion = {
      textContent: "",
      setAttribute: vi.fn(),
    } as unknown as HTMLElement;
    const controller = createAccessibilityController({
      root,
      liveRegion,
      matchReducedMotion: () => true,
    });
    expect(controller.snapshot().reducedMotion).toBe(true);
    expect(root.dataset.reducedMotion).toBe("true");
    controller.announce("Boss 正在蓄力", "assertive");
    await Promise.resolve();
    expect(liveRegion.textContent).toBe("Boss 正在蓄力");
    expect(liveRegion.setAttribute).toHaveBeenCalledWith(
      "aria-live",
      "assertive",
    );
  });

  it("notifies listeners after a user setting change", () => {
    const controller = createAccessibilityController({
      root: { dataset: {} } as unknown as HTMLElement,
      liveRegion: {
        textContent: "",
        setAttribute: vi.fn(),
      } as unknown as HTMLElement,
      matchReducedMotion: () => false,
    });
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.setReducedMotion(true);
    expect(listener).toHaveBeenCalledWith({ reducedMotion: true });
  });
});
```

- [ ] **Step 2: 运行测试并确认无障碍入口不存在**

Run:

```powershell
npx vitest run packages/accessibility/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 实现公开控制器和简动状态**

```ts
export interface AccessibilitySnapshot {
  reducedMotion: boolean;
}

export interface AccessibilityController {
  snapshot(): AccessibilitySnapshot;
  subscribe(
    listener: (snapshot: AccessibilitySnapshot) => void,
  ): () => void;
  setReducedMotion(value: boolean): void;
  announce(
    message: string,
    priority?: "polite" | "assertive",
  ): void;
  activateModal(layer: HTMLElement, initialFocus?: HTMLElement): void;
  deactivateModal(layer: HTMLElement, returnFocus?: HTMLElement): void;
  dispose(): void;
}

function focusableElements(layer: HTMLElement): HTMLElement[] {
  return [...layer.querySelectorAll<HTMLElement>(
    'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )].filter((node) => node.getClientRects().length > 0);
}

export function createAccessibilityController(options: {
  root: HTMLElement;
  liveRegion: HTMLElement;
  matchReducedMotion?: () => boolean;
}): AccessibilityController {
  let reducedMotion =
    options.matchReducedMotion?.() ??
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const listeners = new Set<
    (snapshot: AccessibilitySnapshot) => void
  >();
  let activeModal: HTMLElement | null = null;
  let previousFocus: HTMLElement | null = null;
  const apply = () => {
    options.root.dataset.reducedMotion = String(reducedMotion);
  };
  const snapshot = () => ({ reducedMotion });
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !activeModal) return;
    const items = focusableElements(activeModal);
    if (items.length === 0) {
      event.preventDefault();
      activeModal.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  apply();
  return {
    snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setReducedMotion(value) {
      reducedMotion = value;
      apply();
      listeners.forEach((listener) => listener(snapshot()));
    },
    announce(message, priority = "polite") {
      options.liveRegion.setAttribute("aria-live", priority);
      options.liveRegion.textContent = "";
      queueMicrotask(() => {
        options.liveRegion.textContent = message;
      });
    },
    activateModal(layer, initialFocus) {
      previousFocus = document.activeElement as HTMLElement | null;
      activeModal = layer;
      layer.setAttribute("role", "dialog");
      layer.setAttribute("aria-modal", "true");
      document.addEventListener("keydown", keydown);
      queueMicrotask(() =>
        (initialFocus ?? focusableElements(layer)[0] ?? layer).focus(),
      );
    },
    deactivateModal(layer, returnFocus) {
      if (activeModal !== layer) return;
      document.removeEventListener("keydown", keydown);
      layer.removeAttribute("aria-modal");
      activeModal = null;
      (returnFocus ?? previousFocus)?.focus();
      previousFocus = null;
    },
    dispose() {
      document.removeEventListener("keydown", keydown);
      activeModal = null;
      listeners.clear();
    },
  };
}
```

- [ ] **Step 4: 加入全局简动和非颜色状态 CSS 契约**

玩法与大厅 CSS 必须包含：

```css
[data-reduced-motion="true"] *,
[data-reduced-motion="true"] *::before,
[data-reduced-motion="true"] *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;
  transition-duration: 0.001ms !important;
}

[data-status]::before {
  content: attr(data-status-icon);
  margin-inline-end: 0.35rem;
}

:focus-visible {
  outline: 3px solid #fff4a8;
  outline-offset: 3px;
}
```

每个危险、克制、订单和路线状态都要同时提供 `data-status-icon`、可见文字或 `aria-label`，不能只用红绿蓝区分。

- [ ] **Step 5: 运行无障碍单测和类型检查**

Run:

```powershell
npx vitest run packages/accessibility/src/index.test.ts
npm run typecheck
```

Expected: 无障碍测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 6: 提交无障碍包**

```powershell
git add -- games/wechat-h5-v2/packages/accessibility/src/index.ts games/wechat-h5-v2/packages/accessibility/src/index.test.ts
git commit -m "feat: add shared accessibility controller"
```

### Task 13: 实现固定种子和只在 test=1 生效的测试钩子

**Files:**
- Create: `games/wechat-h5-v2/packages/testing/src/index.ts`
- Create: `games/wechat-h5-v2/packages/testing/src/index.test.ts`

- [ ] **Step 1: 写入随机确定性与普通入口隔离失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  createSeededRandom,
  createTestHarness,
} from "./index";

describe("test harness", () => {
  it("replays the same random sequence from the same seed", () => {
    const first = createSeededRandom("daily-2026-07-29");
    const second = createSeededRandom("daily-2026-07-29");
    expect([first.next(), first.int(1, 6), first.pick(["a", "b", "c"])])
      .toEqual([
        second.next(),
        second.int(1, 6),
        second.pick(["a", "b", "c"]),
      ]);
  });

  it("ignores speed and seed without test=1", () => {
    const target = {} as Window;
    const normal = createTestHarness({
      search: "?speed=30&seed=1",
      gameId: "monster-night-market",
      defaultSeed: 99,
    });
    normal.registry.register("snapshot", () => ({ ok: true }));
    normal.expose(target);
    expect(normal).toMatchObject({ enabled: false, speed: 1, seed: 99 });
    expect((target as Window & { __GAME_TEST__?: unknown }).__GAME_TEST__)
      .toBeUndefined();
  });

  it("clamps test speed and exposes registered hooks", () => {
    const target = {} as Window;
    const harness = createTestHarness({
      search: "?test=1&speed=100&seed=7",
      gameId: "ricochet-crew",
      defaultSeed: 99,
      maxSpeed: 30,
    });
    harness.registry.register("snapshot", () => ({ run: 1 }));
    harness.expose(target);
    expect(harness).toMatchObject({ enabled: true, speed: 30, seed: 7 });
    expect(
      (target as Window & {
        __GAME_TEST__: { list(): string[] };
      }).__GAME_TEST__.list(),
    ).toEqual(["snapshot"]);
  });
});
```

- [ ] **Step 2: 运行测试并确认测试包入口不存在**

Run:

```powershell
npx vitest run packages/testing/src/index.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./index`。

- [ ] **Step 3: 实现稳定随机数**

```ts
import type { GameId } from "@gamehub/h5-contracts";

export interface SeededRandom {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  fork(label: string): SeededRandom;
  snapshot(): number;
}

function hashSeed(seed: number | string): number {
  if (typeof seed === "number") return seed >>> 0;
  let value = 2166136261;
  for (const character of seed) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createSeededRandom(seed: number | string): SeededRandom {
  let state = hashSeed(seed);
  const api: SeededRandom = {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(minInclusive, maxInclusive) {
      if (maxInclusive < minInclusive) {
        throw new Error("RANDOM_RANGE_INVALID");
      }
      return (
        minInclusive +
        Math.floor(api.next() * (maxInclusive - minInclusive + 1))
      );
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("RANDOM_PICK_EMPTY");
      return items[api.int(0, items.length - 1)] as T;
    },
    fork(label) {
      return createSeededRandom(`${state}:${label}`);
    },
    snapshot: () => state,
  };
  return api;
}
```

- [ ] **Step 4: 实现钩子注册器和严格 URL 门控**

```ts
export interface TestHookRegistry {
  register<TArgs extends unknown[], TResult>(
    name: string,
    handler: (...args: TArgs) => TResult | Promise<TResult>,
  ): () => void;
  invoke<TResult>(name: string, ...args: unknown[]): Promise<TResult>;
  list(): string[];
  expose(target?: Window): void;
  dispose(): void;
}

export interface TestHarness {
  readonly enabled: boolean;
  readonly seed: number;
  readonly speed: number;
  readonly random: SeededRandom;
  readonly registry: TestHookRegistry;
  expose(target?: Window): void;
  dispose(): void;
}

export function createTestHarness(options: {
  search: string;
  gameId: GameId;
  defaultSeed: number;
  maxSpeed?: number;
}): TestHarness {
  const params = new URLSearchParams(options.search);
  const enabled = params.get("test") === "1";
  const requestedSeed = Number(params.get("seed"));
  const requestedSpeed = Number(params.get("speed"));
  const seed =
    enabled && Number.isFinite(requestedSeed)
      ? requestedSeed >>> 0
      : options.defaultSeed >>> 0;
  const speed =
    enabled && Number.isFinite(requestedSpeed)
      ? Math.max(1, Math.min(options.maxSpeed ?? 30, requestedSpeed))
      : 1;
  const hooks = new Map<
    string,
    (...args: unknown[]) => unknown | Promise<unknown>
  >();
  let exposedTarget: (Window & { __GAME_TEST__?: unknown }) | null = null;
  const registry: TestHookRegistry = {
    register(name, handler) {
      if (hooks.has(name)) throw new Error(`TEST_HOOK_DUPLICATE:${name}`);
      hooks.set(name, handler as (...args: unknown[]) => unknown);
      return () => hooks.delete(name);
    },
    async invoke<TResult>(name, ...args) {
      const hook = hooks.get(name);
      if (!hook) throw new Error(`TEST_HOOK_UNKNOWN:${name}`);
      return (await hook(...args)) as TResult;
    },
    list: () => [...hooks.keys()].sort(),
    expose(target = window) {
      if (!enabled) return;
      exposedTarget = target as Window & { __GAME_TEST__?: unknown };
      exposedTarget.__GAME_TEST__ = Object.freeze({
        gameId: options.gameId,
        seed,
        speed,
        list: registry.list,
        invoke: registry.invoke,
      });
    },
    dispose() {
      if (exposedTarget) delete exposedTarget.__GAME_TEST__;
      exposedTarget = null;
      hooks.clear();
    },
  };
  return {
    enabled,
    seed,
    speed,
    random: createSeededRandom(seed),
    registry,
    expose: (target) => registry.expose(target),
    dispose: () => registry.dispose(),
  };
}
```

- [ ] **Step 5: 运行测试门控和类型检查**

Run:

```powershell
npx vitest run packages/testing/src/index.test.ts
npm run typecheck
```

Expected: 测试包 `3` 个测试通过；TypeScript 退出码 `0`。

- [ ] **Step 6: 提交测试包**

```powershell
git add -- games/wechat-h5-v2/packages/testing/src/index.ts games/wechat-h5-v2/packages/testing/src/index.test.ts
git commit -m "feat: add gated deterministic test harness"
```

### Task 14: 创建四个独立 Vite 应用与零跨游戏资源构建规则

**Files:**
- Create: `games/wechat-h5-v2/vite.app.config.ts`
- Create: `games/wechat-h5-v2/vite.app.config.test.ts`
- Create: `games/wechat-h5-v2/apps/hub/package.json`
- Create: `games/wechat-h5-v2/apps/hub/index.html`
- Create: `games/wechat-h5-v2/apps/hub/vite.config.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/package.json`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/index.html`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/vite.config.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/package.json`
- Create: `games/wechat-h5-v2/apps/monster-night-market/index.html`
- Create: `games/wechat-h5-v2/apps/monster-night-market/vite.config.ts`
- Create: `games/wechat-h5-v2/apps/three-lane-squad/package.json`
- Create: `games/wechat-h5-v2/apps/three-lane-squad/index.html`
- Create: `games/wechat-h5-v2/apps/three-lane-squad/vite.config.ts`

- [ ] **Step 1: 写入独立输出和禁止内联失败测试**

```ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { createAppViteConfig } from "./vite.app.config";

describe("app vite config", () => {
  it("builds each app to its own directory without asset inlining", () => {
    const appDir = path.resolve("apps/ricochet-crew");
    const config = createAppViteConfig(appDir, "ricochet-crew");
    expect(config.base).toBe("./");
    expect(config.build?.assetsInlineLimit).toBe(0);
    expect(config.build?.outDir).toBe(
      path.resolve("dist/ricochet-crew"),
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认共享 Vite 配置不存在**

Run:

```powershell
npx vitest run vite.app.config.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./vite.app.config`。

- [ ] **Step 3: 实现可复用但不合并资源的 Vite 配置**

```ts
// games/wechat-h5-v2/vite.app.config.ts
import path from "node:path";
import { defineConfig, type UserConfig } from "vite";
import type { GameId } from "@gamehub/h5-contracts";

const PORTS: Record<GameId, number> = {
  hub: 5173,
  "ricochet-crew": 5174,
  "monster-night-market": 5175,
  "three-lane-squad": 5176,
};

export function createAppViteConfig(
  appDir: string,
  gameId: GameId,
): UserConfig {
  return defineConfig({
    root: appDir,
    base: "./",
    publicDir: path.resolve(appDir, "public"),
    server: {
      host: "127.0.0.1",
      port: PORTS[gameId],
      strictPort: true,
    },
    build: {
      outDir: path.resolve(appDir, "../../dist", gameId),
      emptyOutDir: true,
      assetsInlineLimit: 0,
      sourcemap: true,
      target: "es2020",
      rollupOptions: {
        output: {
          entryFileNames: "assets/app-[hash].js",
          chunkFileNames: "assets/chunk-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  });
}
```

- [ ] **Step 4: 创建大厅 workspace 与入口**

```json
{
  "name": "@gamehub/h5-hub",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@gamehub/h5-accessibility": "0.1.0",
    "@gamehub/h5-contracts": "0.1.0",
    "@gamehub/h5-telemetry": "0.1.0"
  }
}
```

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"
    />
    <meta name="theme-color" content="#09111f" />
    <title>奇想游乐场</title>
  </head>
  <body>
    <main id="app" tabindex="-1"></main>
    <div id="live-region" class="sr-only" aria-live="polite"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts
// apps/hub/vite.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppViteConfig } from "../../vite.app.config";

const appDir = path.dirname(fileURLToPath(import.meta.url));
export default createAppViteConfig(appDir, "hub");
```

- [ ] **Step 5: 创建三款游戏 workspace 描述**

```json
// apps/ricochet-crew/package.json
{"name":"@gamehub/h5-ricochet-crew","version":"0.1.0","private":true,"type":"module","scripts":{"dev":"vite","build":"vite build"},"dependencies":{"@gamehub/h5-accessibility":"0.1.0","@gamehub/h5-assets":"0.1.0","@gamehub/h5-audio":"0.1.0","@gamehub/h5-contracts":"0.1.0","@gamehub/h5-input":"0.1.0","@gamehub/h5-runtime":"0.1.0","@gamehub/h5-save":"0.1.0","@gamehub/h5-telemetry":"0.1.0","@gamehub/h5-testing":"0.1.0","pixi.js":"8.9.2"}}
```

```json
// apps/monster-night-market/package.json
{"name":"@gamehub/h5-monster-night-market","version":"0.1.0","private":true,"type":"module","scripts":{"dev":"vite","build":"vite build"},"dependencies":{"@gamehub/h5-accessibility":"0.1.0","@gamehub/h5-assets":"0.1.0","@gamehub/h5-audio":"0.1.0","@gamehub/h5-contracts":"0.1.0","@gamehub/h5-input":"0.1.0","@gamehub/h5-runtime":"0.1.0","@gamehub/h5-save":"0.1.0","@gamehub/h5-telemetry":"0.1.0","@gamehub/h5-testing":"0.1.0","pixi.js":"8.9.2"}}
```

```json
// apps/three-lane-squad/package.json
{"name":"@gamehub/h5-three-lane-squad","version":"0.1.0","private":true,"type":"module","scripts":{"dev":"vite","build":"vite build"},"dependencies":{"@gamehub/h5-accessibility":"0.1.0","@gamehub/h5-assets":"0.1.0","@gamehub/h5-audio":"0.1.0","@gamehub/h5-contracts":"0.1.0","@gamehub/h5-input":"0.1.0","@gamehub/h5-runtime":"0.1.0","@gamehub/h5-save":"0.1.0","@gamehub/h5-telemetry":"0.1.0","@gamehub/h5-testing":"0.1.0","pixi.js":"8.9.2"}}
```

- [ ] **Step 6: 创建三款 HTML 和独立 Vite 配置**

三款 HTML 分别使用自己的标题，但 DOM 契约保持一致：

```html
<!-- apps/ricochet-crew/index.html -->
<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#07121f"><title>弹珠暴走团</title></head><body><main id="app" tabindex="-1"><canvas id="game-canvas" role="application" aria-label="弹珠暴走团战场"></canvas><div id="ui-layer"></div><div id="live-region" class="sr-only" aria-live="polite"></div></main><script type="module" src="/src/main.ts"></script></body></html>
```

```html
<!-- apps/monster-night-market/index.html -->
<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#1d0e20"><title>怪兽夜市</title></head><body><main id="app" tabindex="-1"><canvas id="game-canvas" role="application" aria-label="怪兽夜市案板"></canvas><div id="ui-layer"></div><div id="live-region" class="sr-only" aria-live="polite"></div></main><script type="module" src="/src/main.ts"></script></body></html>
```

```html
<!-- apps/three-lane-squad/index.html -->
<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#10172a"><title>三路小队</title></head><body><main id="app" tabindex="-1"><canvas id="game-canvas" role="application" aria-label="三路小队远征防线"></canvas><div id="ui-layer"></div><div id="live-region" class="sr-only" aria-live="polite"></div></main><script type="module" src="/src/main.ts"></script></body></html>
```

```ts
// apps/ricochet-crew/vite.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppViteConfig } from "../../vite.app.config";
const appDir = path.dirname(fileURLToPath(import.meta.url));
export default createAppViteConfig(appDir, "ricochet-crew");
```

```ts
// apps/monster-night-market/vite.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppViteConfig } from "../../vite.app.config";
const appDir = path.dirname(fileURLToPath(import.meta.url));
export default createAppViteConfig(appDir, "monster-night-market");
```

```ts
// apps/three-lane-squad/vite.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppViteConfig } from "../../vite.app.config";
const appDir = path.dirname(fileURLToPath(import.meta.url));
export default createAppViteConfig(appDir, "three-lane-squad");
```

- [ ] **Step 7: 安装 workspace 依赖并运行 Vite 配置测试**

Run:

```powershell
npm install
npx vitest run vite.app.config.test.ts
npm ls pixi.js
```

Expected: 配置测试 `1` 个通过；三款游戏都解析到同一锁定版本 `pixi.js@8.9.2`。

- [ ] **Step 8: 提交四个独立工程**

```powershell
git add -- games/wechat-h5-v2/package-lock.json games/wechat-h5-v2/vite.app.config.ts games/wechat-h5-v2/vite.app.config.test.ts games/wechat-h5-v2/apps/hub/package.json games/wechat-h5-v2/apps/hub/index.html games/wechat-h5-v2/apps/hub/vite.config.ts games/wechat-h5-v2/apps/ricochet-crew/package.json games/wechat-h5-v2/apps/ricochet-crew/index.html games/wechat-h5-v2/apps/ricochet-crew/vite.config.ts games/wechat-h5-v2/apps/monster-night-market/package.json games/wechat-h5-v2/apps/monster-night-market/index.html games/wechat-h5-v2/apps/monster-night-market/vite.config.ts games/wechat-h5-v2/apps/three-lane-squad/package.json games/wechat-h5-v2/apps/three-lane-squad/index.html games/wechat-h5-v2/apps/three-lane-squad/vite.config.ts
git commit -m "build: add independent h5 app entries"
```

### Task 15: 实现新版大厅目录、进度卡和安全路由

**Files:**
- Create: `games/wechat-h5-v2/apps/hub/src/catalog.ts`
- Create: `games/wechat-h5-v2/apps/hub/src/catalog.test.ts`
- Create: `games/wechat-h5-v2/apps/hub/src/main.ts`
- Create: `games/wechat-h5-v2/apps/hub/src/hub.css`

- [ ] **Step 1: 写入三款目录和相对路由失败测试**

```ts
import { describe, expect, it } from "vitest";
import { GAME_CATALOG } from "./catalog";

describe("hub catalog", () => {
  it("publishes exactly three distinct games", () => {
    expect(GAME_CATALOG.map((game) => game.id)).toEqual([
      "ricochet-crew",
      "monster-night-market",
      "three-lane-squad",
    ]);
    expect(new Set(GAME_CATALOG.map((game) => game.coreInput)).size).toBe(3);
  });

  it("uses sibling routes and local card art only", () => {
    for (const game of GAME_CATALOG) {
      expect(game.href).toBe(`../${game.id}/`);
      expect(game.art).toMatch(/^\.\/assets\/[a-z-]+\.webp$/);
      expect(game.art).not.toContain(game.id === "ricochet-crew"
        ? "night-market"
        : "ricochet-card");
    }
  });
});
```

- [ ] **Step 2: 运行测试并确认大厅目录不存在**

Run:

```powershell
npx vitest run apps/hub/src/catalog.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./catalog`。

- [ ] **Step 3: 创建明确的三款产品目录**

```ts
import type { GameId } from "@gamehub/h5-contracts";

export interface GameCatalogItem {
  id: Exclude<GameId, "hub">;
  title: string;
  kicker: string;
  description: string;
  coreInput: string;
  duration: string;
  art: string;
  href: string;
  accent: string;
}

export const GAME_CATALOG: readonly GameCatalogItem[] = [
  {
    id: "ricochet-crew",
    title: "弹珠暴走团",
    kicker: "一发改写整条弹道",
    description: "瞄准、松手、途中发动角色技，在机械遗迹里撞出连锁爆破。",
    coreInput: "战术弹射",
    duration: "约 5 分钟",
    art: "./assets/ricochet-card.webp",
    href: "../ricochet-crew/",
    accent: "#61e7ff",
  },
  {
    id: "monster-night-market",
    title: "怪兽夜市",
    kicker: "一步同时端出三道菜",
    description: "滑动整行或整列，为怪兽顾客规划配方、留料和连灶庆典。",
    coreInput: "行列滑动",
    duration: "4–5 分钟",
    art: "./assets/night-market-card.webp",
    href: "../monster-night-market/",
    accent: "#ffbd55",
  },
  {
    id: "three-lane-squad",
    title: "三路小队",
    kicker: "拆阵换路，极限救场",
    description: "部署、进化、换路和集火，在三条防线上主动打断巨兽。",
    coreInput: "拖放调兵",
    duration: "约 6 分钟",
    art: "./assets/three-lane-card.webp",
    href: "../three-lane-squad/",
    accent: "#b7a5ff",
  },
] as const;
```

- [ ] **Step 4: 实现大厅语义结构和本地进度**

```ts
// games/wechat-h5-v2/apps/hub/src/main.ts
import { createAccessibilityController } from "@gamehub/h5-accessibility";
import "./hub.css";
import { GAME_CATALOG } from "./catalog";

const app = document.querySelector<HTMLElement>("#app");
const liveRegion = document.querySelector<HTMLElement>("#live-region");
if (!app || !liveRegion) throw new Error("HUB_DOM_MISSING");

const accessibility = createAccessibilityController({ root: app, liveRegion });
const history = JSON.parse(
  localStorage.getItem("hub:recent-games") ?? "{}",
) as Record<string, { lastPlayedAt: number; runs: number }>;

app.innerHTML = `
  <header class="hero">
    <p class="eyebrow">GAMEHUB ORIGINALS · H5 PLAYGROUND</p>
    <h1>奇想游乐场</h1>
    <p class="hero-copy">三种完全不同的手感。选一款，先玩三局再下判断。</p>
    <button class="motion-toggle" type="button" aria-pressed="${accessibility.snapshot().reducedMotion}">
      减少动态效果
    </button>
  </header>
  <section class="game-list" aria-label="可试玩游戏">
    ${GAME_CATALOG.map((game, index) => {
      const recent = history[game.id];
      return `
        <article class="game-card" style="--accent:${game.accent}">
          <img src="${game.art}" width="960" height="540" alt="" decoding="${index === 0 ? "sync" : "async"}" fetchpriority="${index === 0 ? "high" : "low"}">
          <div class="card-shade"></div>
          <div class="card-copy">
            <p class="kicker">${game.kicker}</p>
            <h2>${game.title}</h2>
            <p>${game.description}</p>
            <div class="meta"><span>${game.coreInput}</span><span>${game.duration}</span></div>
            <a class="play" data-game-id="${game.id}" href="${game.href}">
              ${recent ? `继续挑战 · 已玩 ${recent.runs} 局` : "开始试玩"}
            </a>
          </div>
        </article>`;
    }).join("")}
  </section>
  <footer>本地试玩不会要求微信登录、支付或分享。</footer>
`;

app.querySelector<HTMLButtonElement>(".motion-toggle")
  ?.addEventListener("click", (event) => {
    const next = !accessibility.snapshot().reducedMotion;
    accessibility.setReducedMotion(next);
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute("aria-pressed", String(next));
    accessibility.announce(next ? "已减少动态效果" : "已恢复完整动态效果");
  });

app.querySelectorAll<HTMLAnchorElement>("[data-game-id]").forEach((link) => {
  link.addEventListener("click", () => {
    const gameId = link.dataset.gameId;
    if (!gameId) return;
    const previous = history[gameId];
    history[gameId] = {
      lastPlayedAt: Date.now(),
      runs: previous?.runs ?? 0,
    };
    localStorage.setItem("hub:recent-games", JSON.stringify(history));
  });
});
```

- [ ] **Step 5: 实现 390×844 基准大厅样式**

```css
/* games/wechat-h5-v2/apps/hub/src/hub.css */
:root {
  color-scheme: dark;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #07101d;
  color: #f7fbff;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: #07101d; }
body { min-width: 320px; }
button, a { font: inherit; }
#app {
  width: min(100%, 430px);
  min-height: 100svh;
  margin: 0 auto;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgb(5 12 24 / 0.18), #07101d 40%),
    url("./assets/hub-key-art.webp") center top / 100% auto no-repeat,
    #07101d;
}
.hero { min-height: 330px; padding: max(32px, env(safe-area-inset-top)) 22px 22px; }
.eyebrow { margin: 0 0 100px; color: #97eaff; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
h1 { margin: 0; font-size: clamp(38px, 12vw, 52px); line-height: .96; letter-spacing: -.05em; text-shadow: 0 8px 28px #000; }
.hero-copy { max-width: 310px; margin: 12px 0 18px; color: #d9e8f7; font-size: 14px; line-height: 1.55; }
.motion-toggle { min-height: 44px; border: 1px solid rgb(255 255 255 / .3); border-radius: 999px; padding: 0 15px; background: rgb(5 14 28 / .72); color: #fff; }
.game-list { display: grid; gap: 16px; padding: 0 14px 24px; }
.game-card {
  position: relative;
  min-height: 318px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent), transparent 62%);
  border-radius: 28px;
  background: #111d2d;
  box-shadow: 0 20px 48px rgb(0 0 0 / .38);
}
.game-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.card-shade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 14%, rgb(3 7 14 / .22) 38%, rgb(3 7 14 / .96) 78%); }
.card-copy { position: absolute; inset: auto 18px 18px; }
.kicker { margin: 0 0 5px; color: var(--accent); font-size: 12px; font-weight: 800; }
h2 { margin: 0; font-size: 28px; letter-spacing: -.035em; }
.card-copy > p:not(.kicker) { margin: 8px 0; color: #d6e1ec; font-size: 13px; line-height: 1.5; }
.meta { display: flex; gap: 8px; margin: 11px 0; color: #aebdcb; font-size: 11px; }
.meta span { border: 1px solid rgb(255 255 255 / .16); border-radius: 999px; padding: 5px 8px; }
.play { display: flex; min-height: 48px; align-items: center; justify-content: center; border-radius: 16px; background: var(--accent); color: #07101d; font-weight: 900; text-decoration: none; }
footer { padding: 0 20px max(24px, env(safe-area-inset-bottom)); color: #70849a; text-align: center; font-size: 11px; }
.sr-only { position: fixed; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
[data-reduced-motion="true"] *, [data-reduced-motion="true"] *::before, [data-reduced-motion="true"] *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
:focus-visible { outline: 3px solid #fff4a8; outline-offset: 3px; }
@media (min-width: 431px) {
  body { background: radial-gradient(circle at 50% 0, #19324c, #050a12 62%); }
  #app { box-shadow: 0 0 80px #000; }
}
```

- [ ] **Step 6: 运行大厅目录测试和类型检查**

Run:

```powershell
npx vitest run apps/hub/src/catalog.test.ts
npm run typecheck
```

Expected: 大厅目录测试 `2` 个通过；TypeScript 退出码 `0`。

- [ ] **Step 7: 提交新版大厅代码**

```powershell
git add -- games/wechat-h5-v2/apps/hub/src/catalog.ts games/wechat-h5-v2/apps/hub/src/catalog.test.ts games/wechat-h5-v2/apps/hub/src/main.ts games/wechat-h5-v2/apps/hub/src/hub.css
git commit -m "feat: build v2 high fidelity game hub"
```

### Task 16: 生产并接入大厅高保真主视觉与三张游戏卡图

**Files:**
- Create: `games/wechat-h5-v2/art/prompts/hub.json`
- Create: `games/wechat-h5-v2/art/source/hub/hub-key-art.png`
- Create: `games/wechat-h5-v2/art/source/hub/ricochet-card.png`
- Create: `games/wechat-h5-v2/art/source/hub/night-market-card.png`
- Create: `games/wechat-h5-v2/art/source/hub/three-lane-card.png`
- Create: `games/wechat-h5-v2/art/provenance/hub.json`
- Create: `games/wechat-h5-v2/art/reports/hub-export.json`
- Create: `games/wechat-h5-v2/scripts/record-hub-provenance.mjs`
- Create: `games/wechat-h5-v2/apps/hub/public/assets/hub-key-art.webp`
- Create: `games/wechat-h5-v2/apps/hub/public/assets/ricochet-card.webp`
- Create: `games/wechat-h5-v2/apps/hub/public/assets/night-market-card.webp`
- Create: `games/wechat-h5-v2/apps/hub/public/assets/three-lane-card.webp`
- Create: `games/wechat-h5-v2/apps/hub/public/assets/asset-manifest.json`

- [ ] **Step 1: 写入四张源图的确定艺术指令**

```json
{
  "hub-key-art": "Premium vertical 2D game key art for a Chinese mobile H5 game collection, one coherent fantasy arcade pavilion at night where three portals meet: neon mechanical ruins, an eastern monster street market with lantern smoke, and a high-fantasy three-lane fortress, richly painted characters in the middle distance, cinematic depth, luminous atmosphere, sophisticated commercial mobile game illustration, strong readable silhouettes, dark lower area reserved for interface, no text, no logos, no watermark, no mockup frame.",
  "ricochet-card": "Premium horizontal 2D mobile game key art, a charismatic armored young hero launched as a glowing ricochet capsule through neon mechanical ruins, smashing a boss armor plate while sparks, trajectory trails and controlled chain explosions cross the scene, cyan and hot orange palette, strong focal silhouette, three-layer environmental depth, commercial game illustration, no text, no logo, no watermark, no interface.",
  "night-market-card": "Premium horizontal 2D mobile game key art, a young monster chef and a tiny stove spirit serving spectacular dishes to expressive eastern folklore monster customers at a lantern night market, steam, fire ribbon and ice reaction forming a celebratory chain, warm amber and jade palette, distinctive character silhouettes, layered street depth, commercial game illustration, no text, no logo, no watermark, no interface.",
  "three-lane-card": "Premium horizontal 2D mobile game key art, five high-fantasy expedition heroes urgently redeploying across three visible defensive lanes as a colossal boss charges a spell, shield wall, ranger shot and mage interrupt converging on one marked target, violet blue and gold palette, clear tactical lane readability, layered forest ruin fortress, commercial game illustration, no text, no logo, no watermark, no interface."
}
```

- [ ] **Step 2: 运行资产导出并确认源图缺失**

Run:

```powershell
npm run assets:export -- art/recipes/hub.json
```

Expected: 退出码 `1`，错误精确指向首个缺失的 `art/source/hub/*.png`；不能自动退回纯色图或通用几何图。

- [ ] **Step 3: 使用 imagegen 技能生成四张源图**

依次把 `art/prompts/hub.json` 中四条完整指令传给 imagegen；主视觉选择竖幅输出，三张卡图选择横幅输出。把未经压缩的结果分别保存到本任务列出的四个 `art/source/hub/*.png` 路径。每张都要人工检查：

- 不包含文字、Logo、水印或手机外框。
- 主体轮廓在缩至 390px 宽时仍可区分。
- 三张卡图的题材、主色、核心动作和场景结构互不换皮。
- 角色手部、面部、武器、食材和路线没有明显生成畸变。

任一检查失败就使用同一条指令重新生成；只有画面检查通过的源图才进入下一步。

- [ ] **Step 4: 导出运行时图像并生成资源清单**

Run:

```powershell
npm run assets:export -- art/recipes/hub.json
npm run assets:manifest -- art/recipes/hub.json
```

Expected: 退出码 `0`；生成四张 WebP、`art/reports/hub-export.json` 和 `apps/hub/public/assets/asset-manifest.json`；主视觉为 `780×1688`，三张卡图均为 `960×540`。

- [ ] **Step 5: 用导出报告写入真实来源记录**

创建并运行以下脚本。它从提示词与导出报告读取真实内容，不接受人工复制的动态字段：

```js
// games/wechat-h5-v2/scripts/record-hub-provenance.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const prompts = JSON.parse(await readFile("art/prompts/hub.json", "utf8"));
const report = JSON.parse(
  await readFile("art/reports/hub-export.json", "utf8"),
);
const byName = new Map(
  report.map((item) => [path.basename(item.target, path.extname(item.target)), item]),
);
const definitions = [
  {
    id: "hub-key-art",
    role: "key-art",
    usage: "大厅竖屏主视觉和三个世界的统一入口背景",
  },
  {
    id: "ricochet-card",
    role: "scene",
    usage: "弹珠暴走团大厅入口卡，表达战术弹射和部位破坏",
  },
  {
    id: "night-market-card",
    role: "scene",
    usage: "怪兽夜市大厅入口卡，表达行列配方与顾客庆典",
  },
  {
    id: "three-lane-card",
    role: "scene",
    usage: "三路小队大厅入口卡，表达换路救场和集火打断",
  },
];
const generatedAt = new Date().toISOString();
const provenance = definitions.map((definition) => {
  const exported = byName.get(definition.id);
  if (!exported) throw new Error(`HUB_EXPORT_MISSING:${definition.id}`);
  return {
    id: definition.id,
    gameId: "hub",
    role: definition.role,
    sourceFile: `art/source/hub/${definition.id}.png`,
    runtimeFile: `apps/hub/public/assets/${definition.id}.webp`,
    prompt: prompts[definition.id],
    generatedAt,
    usage: definition.usage,
    sha256: exported.sha256,
    humanRevisionStatus: "approved",
    notes: "人工审图通过，并完成 360x800、390x844、430x932 三档可读性检查",
  };
});
await mkdir("art/provenance", { recursive: true });
await writeFile(
  "art/provenance/hub.json",
  `${JSON.stringify(provenance, null, 2)}\n`,
);
```

Run:

```powershell
node scripts/record-hub-provenance.mjs
```

Expected: 退出码 `0`；`art/provenance/hub.json` 恰有四项，每项 prompt 非空、SHA-256 为 64 位小写十六进制、状态为 `approved`。

- [ ] **Step 6: 执行大厅资产门禁**

Run:

```powershell
node scripts/validate-art-assets.mjs hub
```

Expected: 退出码 `0`；报告显示 boot 组不超过 `5,000,000 bytes`，纹理估算不超过 `80MiB`，单边不超过 `2048px`，四项来源状态均为 `approved`。

- [ ] **Step 7: 构建并在三个竖屏尺寸人工审图**

Run:

```powershell
npm run build -w @gamehub/h5-hub
npx vite preview --host 127.0.0.1 --port 4173 --outDir dist/hub
```

Expected: `http://127.0.0.1:4173/` 可打开；在 `360×800`、`390×844`、`430×932` 下，标题、三张卡、每个 48px 主按钮和底部安全区完整；图片关闭时仍保留标题、描述、核心输入和时长，不以图片作为唯一状态信息。

- [ ] **Step 8: 提交大厅正式资产**

```powershell
git add -- games/wechat-h5-v2/art/prompts/hub.json games/wechat-h5-v2/art/source/hub games/wechat-h5-v2/art/provenance/hub.json games/wechat-h5-v2/art/reports/hub-export.json games/wechat-h5-v2/apps/hub/public/assets games/wechat-h5-v2/scripts/record-hub-provenance.mjs
git commit -m "feat: add approved v2 hub artwork"
```

### Task 17: 装配三款游戏的最小 PixiJS 共享入口

**Files:**
- Create: `games/wechat-h5-v2/apps/shared/game-shell-config.ts`
- Create: `games/wechat-h5-v2/apps/shared/game-shell.ts`
- Create: `games/wechat-h5-v2/apps/shared/game-shell.css`
- Create: `games/wechat-h5-v2/apps/shared/game-shell.test.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/src/main.ts`
- Create: `games/wechat-h5-v2/apps/ricochet-crew/public/assets/asset-manifest.json`
- Create: `games/wechat-h5-v2/apps/monster-night-market/src/main.ts`
- Create: `games/wechat-h5-v2/apps/monster-night-market/public/assets/asset-manifest.json`
- Create: `games/wechat-h5-v2/apps/three-lane-squad/src/main.ts`
- Create: `games/wechat-h5-v2/apps/three-lane-squad/public/assets/asset-manifest.json`

- [ ] **Step 1: 写入三款入口配置失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  GAME_SHELL_CONFIGS,
  validateGameShellConfig,
} from "./game-shell-config";

describe("game shell contracts", () => {
  it("owns exactly one config for every playable game", () => {
    expect(Object.keys(GAME_SHELL_CONFIGS).sort()).toEqual([
      "monster-night-market",
      "ricochet-crew",
      "three-lane-squad",
    ]);
  });

  it("requires a 390x844 logical viewport and a non-hub game id", () => {
    for (const config of Object.values(GAME_SHELL_CONFIGS)) {
      expect(validateGameShellConfig(config)).toEqual({
        width: 390,
        height: 844,
      });
      expect(config.gameId).not.toBe("hub");
    }
  });
});
```

- [ ] **Step 2: 运行测试并确认装配模块不存在**

Run:

```powershell
npx vitest run apps/shared/game-shell.test.ts
```

Expected: 退出码 `1`，错误包含 `Failed to load url ./game-shell-config`。

- [ ] **Step 3: 创建三款明确配置和基础存档类型**

```ts
// games/wechat-h5-v2/apps/shared/game-shell-config.ts
import type {
  GameId,
} from "@gamehub/h5-contracts";

export interface GameShellConfig {
  gameId: Exclude<GameId, "hub">;
  title: string;
  readyMessage: string;
  canvasLabel: string;
  defaultSeed: number;
  background: number;
}

export const GAME_SHELL_CONFIGS: Record<
  Exclude<GameId, "hub">,
  GameShellConfig
> = {
  "ricochet-crew": {
    gameId: "ricochet-crew",
    title: "弹珠暴走团",
    readyMessage: "战术弹射底座已就绪",
    canvasLabel: "弹珠暴走团战场",
    defaultSeed: 2026072901,
    background: 0x07121f,
  },
  "monster-night-market": {
    gameId: "monster-night-market",
    title: "怪兽夜市",
    readyMessage: "行列配方案板已就绪",
    canvasLabel: "怪兽夜市案板",
    defaultSeed: 2026072902,
    background: 0x1d0e20,
  },
  "three-lane-squad": {
    gameId: "three-lane-squad",
    title: "三路小队",
    readyMessage: "三路调兵底座已就绪",
    canvasLabel: "三路小队远征防线",
    defaultSeed: 2026072903,
    background: 0x10172a,
  },
};

export function validateGameShellConfig(config: GameShellConfig) {
  if (config.gameId === "hub") throw new Error("GAME_SHELL_ID_INVALID");
  if (!config.title || !config.canvasLabel || !config.readyMessage) {
    throw new Error(`GAME_SHELL_COPY_MISSING:${config.gameId}`);
  }
  return { width: 390 as const, height: 844 as const };
}
```

- [ ] **Step 4: 实现共享装配器的 DOM、PixiJS、资源和本地服务**

创建 `apps/shared/game-shell.ts`：

```ts
import { Application, Assets } from "pixi.js";
import {
  createAccessibilityController,
  type AccessibilityController,
} from "@gamehub/h5-accessibility";
import {
  createAssetLoader,
  createBrowserAssetAdapter,
  type AssetLoader,
  type AssetManifest,
} from "@gamehub/h5-assets";
import {
  createAudioBus,
  createWebAudioBackend,
  type AudioBus,
} from "@gamehub/h5-audio";
import type { PerformanceTier } from "@gamehub/h5-contracts";
import {
  createInputController,
  type InputController,
} from "@gamehub/h5-input";
import {
  bindRuntimeLifecycle,
  bindWebGLRecovery,
  createFrameBudgetMonitor,
  createGameRuntime,
  type GameRuntime,
} from "@gamehub/h5-runtime";
import {
  createLocalStorageSaveAdapter,
  createSaveStore,
  type SaveStore,
} from "@gamehub/h5-save";
import {
  createLocalTelemetryQueue,
  createTelemetryClient,
  type TelemetryClient,
} from "@gamehub/h5-telemetry";
import {
  createTestHarness,
  type TestHarness,
} from "@gamehub/h5-testing";
import {
  GAME_SHELL_CONFIGS,
  validateGameShellConfig,
  type GameShellConfig,
} from "./game-shell-config";
import "./game-shell.css";

export { GAME_SHELL_CONFIGS } from "./game-shell-config";

export interface BaseGameSave {
  settings: {
    muted: boolean;
    reducedMotion: boolean;
  };
  content: Record<string, unknown>;
}

export interface GameShellSnapshot {
  gameId: Exclude<GameId, "hub">;
  started: boolean;
  firstInputSent: boolean;
  runtime: ReturnType<GameRuntime["snapshot"]>;
  assets: ReturnType<AssetLoader["snapshot"]>;
  audio: ReturnType<AudioBus["snapshot"]>;
  telemetry: ReturnType<TelemetryClient["snapshot"]>;
  accessibility: ReturnType<AccessibilityController["snapshot"]>;
  performanceTier: PerformanceTier;
  save: Awaited<ReturnType<SaveStore<BaseGameSave>["inspect"]>>;
}

export async function bootGameShell(config: GameShellConfig): Promise<void> {
  const logical = validateGameShellConfig(config);
  const root = document.querySelector<HTMLElement>("#app");
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const ui = document.querySelector<HTMLElement>("#ui-layer");
  const liveRegion = document.querySelector<HTMLElement>("#live-region");
  if (!root || !canvas || !ui || !liveRegion) {
    throw new Error(`GAME_SHELL_DOM_MISSING:${config.gameId}`);
  }
  root.dataset.gameId = config.gameId;
  root.dataset.shellState = "booting";
  canvas.setAttribute("aria-label", config.canvasLabel);
  ui.innerHTML = `
    <section class="integration-panel" aria-labelledby="shell-title">
      <p class="integration-kicker">GAMEHUB H5 V2 · INTEGRATION</p>
      <h1 id="shell-title">${config.title}</h1>
      <p class="integration-status" role="status">正在校验本地底座…</p>
      <button class="integration-start" type="button" disabled>开始</button>
      <a class="integration-back" href="../hub/">返回游乐场</a>
    </section>
    <section class="resume-layer" hidden role="dialog" aria-modal="true" aria-labelledby="resume-title">
      <h2 id="resume-title">游戏已暂停</h2>
      <button type="button">继续</button>
    </section>
  `;
  const status = ui.querySelector<HTMLElement>(".integration-status");
  const startButton =
    ui.querySelector<HTMLButtonElement>(".integration-start");
  const resumeLayer = ui.querySelector<HTMLElement>(".resume-layer");
  const resumeButton = resumeLayer?.querySelector<HTMLButtonElement>("button");
  if (!status || !startButton || !resumeLayer || !resumeButton) {
    throw new Error(`GAME_SHELL_CONTROLS_MISSING:${config.gameId}`);
  }

  const testHarness: TestHarness = createTestHarness({
    search: location.search,
    gameId: config.gameId,
    defaultSeed: config.defaultSeed,
    maxSpeed: 30,
  });
  const accessibility = createAccessibilityController({ root, liveRegion });
  const audioBackend = createWebAudioBackend();
  const audio = createAudioBus({ backend: audioBackend, maxVoices: 12 });
  const telemetry = createTelemetryClient({
    gameId: config.gameId,
    testMode: testHarness.enabled,
    queue: createLocalTelemetryQueue({ gameId: config.gameId }),
  });
  const save = createSaveStore<BaseGameSave>({
    gameId: config.gameId,
    currentSchemaVersion: 1,
    defaultValue: () => ({
      settings: {
        muted: false,
        reducedMotion: accessibility.snapshot().reducedMotion,
      },
      content: {},
    }),
    migrations: {},
    adapter: createLocalStorageSaveAdapter(),
  });
  const loadedSave = await save.load();
  accessibility.setReducedMotion(
    loadedSave.payload.settings.reducedMotion,
  );
  audio.setMuted(loadedSave.payload.settings.muted);

  const pixi = new Application();
  await pixi.init({
    canvas,
    width: logical.width,
    height: logical.height,
    background: config.background,
    autoStart: false,
    antialias: false,
    resolution: Math.min(devicePixelRatio, 2),
  });
  pixi.stop();

  const manifestResponse = await fetch("./assets/asset-manifest.json", {
    cache: "no-cache",
  });
  if (!manifestResponse.ok) {
    throw new Error(
      `GAME_SHELL_MANIFEST_HTTP_${manifestResponse.status}:${config.gameId}`,
    );
  }
  const manifest = (await manifestResponse.json()) as AssetManifest;
  if (manifest.gameId !== config.gameId) {
    throw new Error(`GAME_SHELL_MANIFEST_ID:${manifest.gameId}`);
  }
  const assets = createAssetLoader({
    manifest,
    adapter: createBrowserAssetAdapter({
      async decodeBlob(entry, url, bytes) {
        if (entry.type === "texture" || entry.type === "atlas") {
          return Assets.load(url);
        }
        if (entry.type === "json") {
          return JSON.parse(new TextDecoder().decode(bytes));
        }
        return bytes;
      },
      async releaseDecoded(_entry, value) {
        if (
          value &&
          typeof value === "object" &&
          "destroy" in value &&
          typeof value.destroy === "function"
        ) {
          value.destroy(true);
        }
      },
    }),
  });
  await assets.loadGroup("boot");

  let currentTier: PerformanceTier = "high";
  let previousRenderAt = performance.now();
  const monitor = createFrameBudgetMonitor({
    initialTier: currentTier,
    onTierChange(tier) {
      currentTier = tier;
      runtime.setPerformanceTier(tier);
      telemetry.emit("performance_tier_changed", { tier });
      root.dataset.performanceTier = tier;
    },
  });
  const runtime = createGameRuntime({
    onFixedUpdate() {},
    onRender() {
      const now = performance.now();
      monitor.record(now - previousRenderAt);
      previousRenderAt = now;
      pixi.renderer.render(pixi.stage);
    },
    onPauseChange(paused, reason) {
      input.setEnabled(!paused);
      if (paused) {
        void audio.suspend();
        resumeLayer.hidden = false;
        accessibility.activateModal(resumeLayer, resumeButton);
        telemetry.emit("lifecycle_pause", { reason });
      } else {
        resumeLayer.hidden = true;
        accessibility.deactivateModal(resumeLayer, canvas);
        telemetry.emit("lifecycle_resume");
      }
    },
  });
  const input: InputController = createInputController({
    element: canvas,
    logicalSize: logical,
    axisLockThreshold: 10,
    tapRadius: 8,
  });
  const lifecycle = bindRuntimeLifecycle(runtime);
  const webgl = bindWebGLRecovery(canvas, {
    onLost() {
      runtime.pause("context-lost");
    },
    async onRestored() {
      await assets.retryGroup("boot");
    },
    onFatal(error) {
      status.textContent = `图形环境恢复失败：${String(error)}`;
      root.dataset.shellState = "fatal";
    },
  });

  let started = false;
  let firstInputSent = false;
  input.setEnabled(false);
  const unsubscribeInput = input.subscribe((intent) => {
    if (
      started &&
      !firstInputSent &&
      intent.kind !== "cancel"
    ) {
      firstInputSent = true;
      telemetry.emit("first_input", { kind: intent.kind });
    }
  });
  const snapshot = async (): Promise<GameShellSnapshot> => ({
    gameId: config.gameId,
    started,
    firstInputSent,
    runtime: runtime.snapshot(),
    assets: assets.snapshot(),
    audio: audio.snapshot(),
    telemetry: telemetry.snapshot(),
    accessibility: accessibility.snapshot(),
    performanceTier: currentTier,
    save: await save.inspect(),
  });
  testHarness.registry.register("snapshot", snapshot);
  testHarness.registry.register("setPerformanceTier", (tier: PerformanceTier) => {
    currentTier = tier;
    runtime.setPerformanceTier(tier);
    root.dataset.performanceTier = tier;
    return tier;
  });
  testHarness.registry.register("pause", () => runtime.pause("user"));
  testHarness.expose();

  startButton.disabled = false;
  status.textContent = config.readyMessage;
  root.dataset.shellState = "ready";
  telemetry.emit("game_boot");
  telemetry.emit("game_ready");
  accessibility.announce(config.readyMessage);
  startButton.addEventListener("click", async () => {
    if (started) return;
    started = true;
    await audio.unlockFromGesture();
    input.setEnabled(true);
    telemetry.beginRun(`run-${testHarness.seed}-1`);
    runtime.start();
    root.dataset.shellState = "running";
    startButton.hidden = true;
    status.textContent = "共享底座运行中，玩法模块将接管此入口";
  });
  resumeButton.addEventListener("click", async () => {
    await audio.resumeFromGesture();
    runtime.resume();
  });

  addEventListener("pagehide", () => {
    unsubscribeInput();
    lifecycle.dispose();
    webgl.dispose();
    input.destroy();
    runtime.dispose();
    testHarness.dispose();
    accessibility.dispose();
    telemetry.dispose();
    void assets.dispose();
    void audio.dispose();
    pixi.destroy(false, { children: true, texture: false });
  }, { once: true });
}
```

该集成页只证明九个共享包能同时装配，不得作为三款正式画面、角色、场景或玩法完成证据。三款玩法计划在各自 `src/` 内替换集成面板并保留同一生命周期和测试门控。

- [ ] **Step 5: 创建集成页专用样式**

```css
/* games/wechat-h5-v2/apps/shared/game-shell.css */
:root {
  color-scheme: dark;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #060b14;
  color: #f8fbff;
}
* { box-sizing: border-box; }
html, body, #app { width: 100%; min-height: 100%; margin: 0; }
body { overflow: hidden; background: #060b14; }
#app {
  position: relative;
  width: min(100vw, 430px);
  height: 100svh;
  margin: 0 auto;
  overflow: hidden;
}
#game-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}
#ui-layer { position: absolute; inset: 0; pointer-events: none; }
.integration-panel {
  position: absolute;
  inset: auto 18px max(18px, env(safe-area-inset-bottom));
  padding: 20px;
  border: 1px solid rgb(255 255 255 / .18);
  border-radius: 24px;
  background: rgb(5 10 18 / .86);
  box-shadow: 0 20px 54px rgb(0 0 0 / .46);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}
.integration-kicker {
  margin: 0 0 6px;
  color: #8beaff;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .13em;
}
.integration-panel h1 { margin: 0; font-size: 32px; }
.integration-status { min-height: 42px; color: #cbd8e8; line-height: 1.5; }
.integration-start,
.resume-layer button {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 15px;
  background: #f6d574;
  color: #10131a;
  font-weight: 900;
}
.integration-start:disabled { opacity: .5; }
.integration-back {
  display: block;
  min-height: 44px;
  padding-top: 14px;
  color: #d9e9fb;
  text-align: center;
}
.resume-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  place-content: center;
  padding: 28px;
  background: rgb(4 8 15 / .94);
  pointer-events: auto;
}
.resume-layer:not([hidden]) { display: grid; }
.resume-layer h2 { text-align: center; }
.sr-only {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
[data-reduced-motion="true"] *,
[data-reduced-motion="true"] *::before,
[data-reduced-motion="true"] *::after {
  animation-duration: .001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: .001ms !important;
}
:focus-visible { outline: 3px solid #fff4a8; outline-offset: 3px; }
```

- [ ] **Step 6: 创建三款精确 main.ts**

```ts
// games/wechat-h5-v2/apps/ricochet-crew/src/main.ts
import {
  bootGameShell,
  GAME_SHELL_CONFIGS,
} from "../../shared/game-shell";

void bootGameShell(GAME_SHELL_CONFIGS["ricochet-crew"]).catch((error) => {
  document.documentElement.dataset.bootError = "true";
  console.error(error);
});
```

```ts
// games/wechat-h5-v2/apps/monster-night-market/src/main.ts
import {
  bootGameShell,
  GAME_SHELL_CONFIGS,
} from "../../shared/game-shell";

void bootGameShell(GAME_SHELL_CONFIGS["monster-night-market"]).catch((error) => {
  document.documentElement.dataset.bootError = "true";
  console.error(error);
});
```

```ts
// games/wechat-h5-v2/apps/three-lane-squad/src/main.ts
import {
  bootGameShell,
  GAME_SHELL_CONFIGS,
} from "../../shared/game-shell";

void bootGameShell(GAME_SHELL_CONFIGS["three-lane-squad"]).catch((error) => {
  document.documentElement.dataset.bootError = "true";
  console.error(error);
});
```

- [ ] **Step 7: 创建可启动的空 boot 清单**

三个清单分别写入对应 `gameId`，只包含空 `boot` 组；它们让共享底座构建和装配测试可独立执行，正式玩法资产任务必须用生成器覆盖：

```json
// apps/ricochet-crew/public/assets/asset-manifest.json
{"schemaVersion":1,"gameId":"ricochet-crew","revision":"shell-1","groups":[{"id":"boot","required":true,"assets":[]}]}
```

```json
// apps/monster-night-market/public/assets/asset-manifest.json
{"schemaVersion":1,"gameId":"monster-night-market","revision":"shell-1","groups":[{"id":"boot","required":true,"assets":[]}]}
```

```json
// apps/three-lane-squad/public/assets/asset-manifest.json
{"schemaVersion":1,"gameId":"three-lane-squad","revision":"shell-1","groups":[{"id":"boot","required":true,"assets":[]}]}
```

- [ ] **Step 8: 运行装配测试、类型检查和四应用构建**

Run:

```powershell
npx vitest run apps/shared/game-shell.test.ts
npm run typecheck
npm run build:apps
```

Expected: 装配测试 `2` 个通过；TypeScript 退出码 `0`；`dist/hub`、`dist/ricochet-crew`、`dist/monster-night-market`、`dist/three-lane-squad` 均生成 `index.html` 和独立 `assets/app-*.js`。

- [ ] **Step 9: 提交三款最小装配入口**

```powershell
git add -- games/wechat-h5-v2/apps/shared games/wechat-h5-v2/apps/ricochet-crew/src/main.ts games/wechat-h5-v2/apps/ricochet-crew/public/assets/asset-manifest.json games/wechat-h5-v2/apps/monster-night-market/src/main.ts games/wechat-h5-v2/apps/monster-night-market/public/assets/asset-manifest.json games/wechat-h5-v2/apps/three-lane-squad/src/main.ts games/wechat-h5-v2/apps/three-lane-squad/public/assets/asset-manifest.json
git commit -m "feat: assemble three pixi game entries"
```

### Task 18: 增加大厅、三款装配与生产门控 E2E

**Files:**
- Create: `games/wechat-h5-v2/tests/e2e/hub.spec.ts`
- Create: `games/wechat-h5-v2/tests/e2e/app-shell.spec.ts`
- Create: `games/wechat-h5-v2/tests/e2e/production-guards.spec.ts`
- Create: `games/wechat-h5-v2/scripts/serve-dist.mjs`
- Modify: `games/wechat-h5-v2/playwright.config.ts`

- [ ] **Step 1: 写入大厅三视口与本地资源失败测试**

```ts
// games/wechat-h5-v2/tests/e2e/hub.spec.ts
import { expect, test } from "@playwright/test";

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const;

test("hub renders three distinct local game entries at every viewport", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:4173") {
      externalRequests.push(url.href);
    }
  });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/hub/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "奇想游乐场" }))
      .toBeVisible();
    await expect(page.locator(".game-card")).toHaveCount(3);
    await expect(page.locator(".game-card img")).toHaveCount(3);
    const links = await page.locator("[data-game-id]").evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: (node as HTMLElement).dataset.gameId,
        href: (node as HTMLAnchorElement).getAttribute("href"),
      })),
    );
    expect(links).toEqual([
      { id: "ricochet-crew", href: "../ricochet-crew/" },
      { id: "monster-night-market", href: "../monster-night-market/" },
      { id: "three-lane-squad", href: "../three-lane-squad/" },
    ]);
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      brokenImages: [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
    }));
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(layout.brokenImages).toEqual([]);
  }
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("hub reduced-motion control exposes an explicit state", async ({ page }) => {
  await page.goto("/hub/");
  const button = page.getByRole("button", { name: "减少动态效果" });
  const before = await button.getAttribute("aria-pressed");
  await button.click();
  await expect(button).toHaveAttribute(
    "aria-pressed",
    before === "true" ? "false" : "true",
  );
  await expect(page.locator("#app")).toHaveAttribute(
    "data-reduced-motion",
    before === "true" ? "false" : "true",
  );
});
```

- [ ] **Step 2: 写入三款装配和真实触控失败测试**

```ts
// games/wechat-h5-v2/tests/e2e/app-shell.spec.ts
import { expect, test } from "@playwright/test";

const games = [
  {
    id: "ricochet-crew",
    ready: "战术弹射底座已就绪",
    canvas: "弹珠暴走团战场",
  },
  {
    id: "monster-night-market",
    ready: "行列配方案板已就绪",
    canvas: "怪兽夜市案板",
  },
  {
    id: "three-lane-squad",
    ready: "三路调兵底座已就绪",
    canvas: "三路小队远征防线",
  },
] as const;

for (const game of games) {
  test(`${game.id} assembles shared packages and accepts touch`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`/${game.id}/?test=1&seed=7&speed=2`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("#app")).toHaveAttribute(
      "data-shell-state",
      "ready",
    );
    await expect(page.getByRole("status")).toContainText(game.ready);
    const canvas = page.getByRole("application", { name: game.canvas });
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: "开始" }).click();
    await expect(page.locator("#app")).toHaveAttribute(
      "data-shell-state",
      "running",
    );
    await canvas.tap({ position: { x: 180, y: 300 } });
    const snapshot = await page.evaluate(async () => {
      const api = (
        window as Window & {
          __GAME_TEST__: {
            invoke<T>(name: string, ...args: unknown[]): Promise<T>;
          };
        }
      ).__GAME_TEST__;
      return api.invoke<{
        gameId: string;
        started: boolean;
        firstInputSent: boolean;
        runtime: { state: string };
        assets: {
          loadedGroupIds: string[];
          loadedAssetIds: string[];
        };
        telemetry: { queuedEvents: number };
        save: { primaryPresent: boolean };
      }>("snapshot");
    });
    expect(snapshot).toMatchObject({
      gameId: game.id,
      started: true,
      firstInputSent: true,
      runtime: { state: "running" },
      assets: { loadedGroupIds: ["boot"], loadedAssetIds: [] },
      save: { primaryPresent: true },
    });
    expect(snapshot.telemetry.queuedEvents).toBeGreaterThanOrEqual(4);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
```

- [ ] **Step 3: 写入普通入口隔离失败测试**

```ts
// games/wechat-h5-v2/tests/e2e/production-guards.spec.ts
import { expect, test } from "@playwright/test";

const gameIds = [
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const;

for (const gameId of gameIds) {
  test(`${gameId} ignores test controls without test=1`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(`/${gameId}/?seed=1&speed=30&forceWin=1`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("#app")).toHaveAttribute(
      "data-shell-state",
      "ready",
    );
    const result = await page.evaluate(() => ({
      testApi: typeof (
        window as Window & { __GAME_TEST__?: unknown }
      ).__GAME_TEST__,
      bootError: document.documentElement.dataset.bootError ?? null,
      canvasCount: document.querySelectorAll("canvas").length,
    }));
    expect(result).toEqual({
      testApi: "undefined",
      bootError: null,
      canvasCount: 1,
    });
    expect(
      requests.every(
        (url) => new URL(url).origin === "http://127.0.0.1:4173",
      ),
    ).toBe(true);
  });
}

test("direct game URLs do not require a hub referrer", async ({ page }) => {
  await page.goto("/monster-night-market/", { waitUntil: "networkidle" });
  await expect(page.locator("#app")).toHaveAttribute(
    "data-shell-state",
    "ready",
  );
  await expect(page.getByRole("link", { name: "返回游乐场" }))
    .toHaveAttribute("href", "../hub/");
});

test("dist responses use explicit no-sniff and no-store headers", async ({
  request,
}) => {
  const response = await request.get("/hub/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["cache-control"]).toBe("no-store");
});
```

- [ ] **Step 4: 运行 E2E 并确认 dist 根服务失败**

Run:

```powershell
npm run build:apps
npm run test:e2e -- --project=chromium
```

Expected: 退出码 `1`；现有预览服务至少不能同时满足 `x-content-type-options: nosniff` 与 `cache-control: no-store` 的静态交付门禁。

- [ ] **Step 5: 创建只服务 dist 的静态服务器**

```js
// games/wechat-h5-v2/scripts/serve-dist.mjs
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const root = path.resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/hub/";
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
    const finalInfo = await stat(file);
    response.writeHead(200, {
      "content-type":
        mime[path.extname(file)] ?? "application/octet-stream",
      "content-length": finalInfo.size,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end("Not Found");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`DIST_SERVER_READY http://127.0.0.1:${port}\n`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
```

- [ ] **Step 6: 把 Playwright webServer 切换到统一静态服务**

将 `playwright.config.ts` 的 `webServer` 块替换为：

```ts
webServer: {
  command: "node scripts/serve-dist.mjs",
  url: "http://127.0.0.1:4173/hub/",
  timeout: 15_000,
  reuseExistingServer: false,
},
```

保留 Chromium 390×844 触控项目和 WebKit iPhone 项目，不把桌面模式用作移动触控替代。

- [ ] **Step 7: 运行 Chromium 和 WebKit E2E**

Run:

```powershell
npm run build:apps
npm run test:e2e
```

Expected: Chromium 与 WebKit 共 `20` 个测试通过：每个项目执行大厅 `2` 个、三款装配 `3` 个、生产门控与直达 `4` 个；无控制台错误、页面错误、外部请求、横向溢出、破图或普通入口测试 API。

- [ ] **Step 8: 提交 E2E 框架**

```powershell
git add -- games/wechat-h5-v2/tests/e2e games/wechat-h5-v2/scripts/serve-dist.mjs games/wechat-h5-v2/playwright.config.ts
git commit -m "test: add h5 v2 shell e2e gates"
```

### Task 19: 增加低端帧预算和 20 分钟自然速度长测

**Files:**
- Create: `games/wechat-h5-v2/tests/performance/probe.ts`
- Create: `games/wechat-h5-v2/tests/performance/frame-budget.spec.ts`
- Create: `games/wechat-h5-v2/tests/performance/long-run.spec.ts`
- Create: `games/wechat-h5-v2/scripts/verify-bundles.mjs`
- Create: `games/wechat-h5-v2/test-results/wechat-h5-v2/performance/ricochet-crew.json`
- Create: `games/wechat-h5-v2/test-results/wechat-h5-v2/performance/monster-night-market.json`
- Create: `games/wechat-h5-v2/test-results/wechat-h5-v2/performance/three-lane-squad.json`

- [ ] **Step 1: 写入帧预算和长测失败测试**

```ts
// games/wechat-h5-v2/tests/performance/frame-budget.spec.ts
import { expect, test } from "@playwright/test";
import {
  installPerformanceProbe,
  readPerformanceProbe,
  resetPerformanceProbe,
} from "./probe";

const gameIds = [
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const;

for (const gameId of gameIds) {
  test(`${gameId} stays within the low-tier 33ms frame budget`, async ({
    page,
  }) => {
    await installPerformanceProbe(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(`/${gameId}/?test=1&seed=11`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("#app")).toHaveAttribute(
      "data-shell-state",
      "ready",
    );
    await page.getByRole("button", { name: "开始" }).click();
    await page.evaluate(async () => {
      const api = (
        window as Window & {
          __GAME_TEST__: {
            invoke<T>(name: string, ...args: unknown[]): Promise<T>;
          };
        }
      ).__GAME_TEST__;
      await api.invoke("setPerformanceTier", "low");
    });
    await resetPerformanceProbe(page);
    await page.waitForTimeout(12_000);
    const probe = await readPerformanceProbe(page);
    const shell = await page.evaluate(async () => {
      const api = (
        window as Window & {
          __GAME_TEST__: {
            invoke<T>(name: string): Promise<T>;
          };
        }
      ).__GAME_TEST__;
      return api.invoke<{
        performanceTier: string;
        assets: { estimatedTextureBytes: number };
      }>("snapshot");
    });
    expect(shell.performanceTier).toBe("low");
    expect(shell.assets.estimatedTextureBytes).toBeLessThanOrEqual(
      80 * 1024 * 1024,
    );
    expect(probe.p95FrameMs).toBeLessThanOrEqual(33);
    expect(probe.longTasks).toBe(0);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  });
}
```

```ts
// games/wechat-h5-v2/tests/performance/long-run.spec.ts
import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  installPerformanceProbe,
  readPerformanceProbe,
  resetPerformanceProbe,
} from "./probe";

const gameIds = [
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
] as const;
const longRunEnabled = process.env.H5_LONG_RUN === "1";
const durationMs = longRunEnabled ? 20 * 60_000 : 30_000;
const sampleEveryMs = 30_000;

test.describe.serial("natural-speed stability", () => {
  for (const gameId of gameIds) {
    test(`${gameId} has bounded memory, listeners, textures, and saves`, async ({
      page,
    }) => {
      test.setTimeout(durationMs + 120_000);
      await installPerformanceProbe(page);
      const cdp = await page.context().newCDPSession(page);
      let topLevelNavigations = 0;
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) topLevelNavigations += 1;
      });
      await page.goto(`/${gameId}/?test=1&seed=29`, {
        waitUntil: "networkidle",
      });
      await page.getByRole("button", { name: "开始" }).click();
      await resetPerformanceProbe(page);
      const canvas = page.getByRole("application");
      const samples: Array<{
        elapsedMs: number;
        nodes: number;
        jsEventListeners: number;
        usedHeapBytes: number;
        textureBytes: number;
        p95FrameMs: number;
        longTasks: number;
      }> = [];
      const startedAt = Date.now();
      while (Date.now() - startedAt < durationMs) {
        await canvas.tap({ position: { x: 190, y: 360 } });
        await page.waitForTimeout(
          Math.max(
            0,
            Math.min(
              sampleEveryMs,
              durationMs - (Date.now() - startedAt),
            ),
          ),
        );
        const dom = await cdp.send("Memory.getDOMCounters");
        const heap = await page.evaluate(() => {
          const memory = performance as Performance & {
            memory?: { usedJSHeapSize: number };
          };
          return memory.memory?.usedJSHeapSize ?? 0;
        });
        const probe = await readPerformanceProbe(page);
        const shell = await page.evaluate(async () => {
          const api = (
            window as Window & {
              __GAME_TEST__: {
                invoke<T>(name: string): Promise<T>;
              };
            }
          ).__GAME_TEST__;
          return api.invoke<{
            assets: { estimatedTextureBytes: number };
          }>("snapshot");
        });
        samples.push({
          elapsedMs: Date.now() - startedAt,
          nodes: dom.nodes,
          jsEventListeners: dom.jsEventListeners,
          usedHeapBytes: heap,
          textureBytes: shell.assets.estimatedTextureBytes,
          p95FrameMs: probe.p95FrameMs,
          longTasks: probe.longTasks,
        });
      }
      const first = samples[0];
      const last = samples[samples.length - 1];
      if (!first || !last) throw new Error(`PERF_SAMPLES_MISSING:${gameId}`);
      const save = await page.evaluate(async () => {
        const api = (
          window as Window & {
            __GAME_TEST__: {
              invoke<T>(name: string): Promise<T>;
            };
          }
        ).__GAME_TEST__;
        return api.invoke<{
          save: { primaryPresent: boolean };
        }>("snapshot");
      });
      const summary = {
        gameId,
        mode: longRunEnabled ? "20-minute" : "30-second-smoke",
        durationMs,
        topLevelNavigations,
        nodeGrowth: last.nodes - first.nodes,
        listenerGrowth: last.jsEventListeners - first.jsEventListeners,
        heapGrowthBytes: last.usedHeapBytes - first.usedHeapBytes,
        peakTextureBytes: Math.max(
          ...samples.map((sample) => sample.textureBytes),
        ),
        worstP95FrameMs: Math.max(
          ...samples.map((sample) => sample.p95FrameMs),
        ),
        longTasks: last.longTasks,
        savePrimaryPresent: save.save.primaryPresent,
        samples,
      };
      await mkdir("test-results/wechat-h5-v2/performance", {
        recursive: true,
      });
      await writeFile(
        path.join(
          "test-results/wechat-h5-v2/performance",
          `${gameId}.json`,
        ),
        `${JSON.stringify(summary, null, 2)}\n`,
      );
      expect(topLevelNavigations).toBe(1);
      expect(summary.nodeGrowth).toBeLessThanOrEqual(20);
      expect(summary.listenerGrowth).toBeLessThanOrEqual(4);
      if (first.usedHeapBytes > 0) {
        expect(summary.heapGrowthBytes).toBeLessThanOrEqual(24 * 1024 * 1024);
      }
      expect(summary.peakTextureBytes).toBeLessThanOrEqual(80 * 1024 * 1024);
      expect(summary.worstP95FrameMs).toBeLessThanOrEqual(33);
      expect(summary.longTasks).toBe(0);
      expect(summary.savePrimaryPresent).toBe(true);
    });
  }
});
```

- [ ] **Step 2: 运行性能测试并确认探针入口不存在**

Run:

```powershell
npm run build:apps
npm run test:performance
```

Expected: 退出码 `1`，TypeScript 或 Playwright 报告 `Cannot find module './probe'`。

- [ ] **Step 3: 实现浏览器帧与 Long Task 探针**

```ts
// games/wechat-h5-v2/tests/performance/probe.ts
import type { Page } from "@playwright/test";

export interface PerformanceProbeSnapshot {
  frames: number;
  p95FrameMs: number;
  maxFrameMs: number;
  longTasks: number;
  totalLongTaskMs: number;
}

export async function installPerformanceProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = {
      frameTimes: [] as number[],
      longTasks: [] as number[],
      previousFrameAt: 0,
    };
    (
      window as Window & {
        __H5_PERF_PROBE__?: typeof state;
      }
    ).__H5_PERF_PROBE__ = state;
    const frame = (now: number) => {
      if (state.previousFrameAt > 0) {
        state.frameTimes.push(now - state.previousFrameAt);
        if (state.frameTimes.length > 3600) state.frameTimes.shift();
      }
      state.previousFrameAt = now;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTasks.push(entry.duration);
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {
      state.longTasks = [];
    }
  });
}

export async function readPerformanceProbe(
  page: Page,
): Promise<PerformanceProbeSnapshot> {
  return page.evaluate(() => {
    const state = (
      window as Window & {
        __H5_PERF_PROBE__?: {
          frameTimes: number[];
          longTasks: number[];
        };
      }
    ).__H5_PERF_PROBE__;
    if (!state) throw new Error("PERFORMANCE_PROBE_MISSING");
    const ordered = [...state.frameTimes].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(ordered.length * 0.95) - 1);
    return {
      frames: ordered.length,
      p95FrameMs: ordered[p95Index] ?? 0,
      maxFrameMs: ordered[ordered.length - 1] ?? 0,
      longTasks: state.longTasks.length,
      totalLongTaskMs: state.longTasks.reduce(
        (sum, duration) => sum + duration,
        0,
      ),
    };
  });
}

export async function resetPerformanceProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = (
      window as Window & {
        __H5_PERF_PROBE__?: {
          frameTimes: number[];
          longTasks: number[];
          previousFrameAt: number;
        };
      }
    ).__H5_PERF_PROBE__;
    if (!state) throw new Error("PERFORMANCE_PROBE_MISSING");
    state.frameTimes = [];
    state.longTasks = [];
    state.previousFrameAt = performance.now();
  });
}
```

- [ ] **Step 4: 运行 30 秒冒烟和四倍 CPU 帧预算**

Run:

```powershell
npm run build:apps
npm run test:performance
```

Expected: Chromium 共 `6` 个性能测试通过：三款四倍 CPU 帧预算和三款 30 秒自然速度冒烟；生成三份 JSON，`mode` 为 `30-second-smoke`，P95 不超过 `33ms`，纹理不超过 `80MiB`，无页面重载或本地存档丢失。

- [ ] **Step 5: 执行三款各 20 分钟自然速度长测**

Run:

```powershell
$env:H5_LONG_RUN='1'
npx playwright test tests/performance/long-run.spec.ts --project=chromium
Remove-Item Env:H5_LONG_RUN
```

Expected: 约 `60` 分钟后退出码 `0`；三款各生成至少 `40` 个 30 秒采样点；报告 `mode` 为 `20-minute`，节点增长不超过 `20`、监听器增长不超过 `4`、堆增长不超过 `24MiB`、纹理峰值不超过 `80MiB`、最差 P95 不超过 `33ms`、Long Task 为 `0`、顶层导航次数为 `1`、存档仍存在。

- [ ] **Step 6: 运行全量构建并确认边界脚本缺失**

Run:

```powershell
npm run build
```

Expected: 四个应用完成 Vite 构建后退出码 `1`，Node 报告找不到 `scripts/verify-bundles.mjs`；此前的单元、E2E 和性能结果不被删除。

- [ ] **Step 7: 实现独立构建产物边界校验**

```js
// games/wechat-h5-v2/scripts/verify-bundles.mjs
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const appIds = [
  "hub",
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
];

async function filesUnder(root) {
  const output = [];
  for (const name of await readdir(root)) {
    const absolute = path.join(root, name);
    if ((await stat(absolute)).isDirectory()) {
      output.push(...await filesUnder(absolute));
    } else {
      output.push(absolute);
    }
  }
  return output;
}

for (const appId of appIds) {
  const root = path.resolve("dist", appId);
  const indexFile = path.join(root, "index.html");
  const index = await readFile(indexFile, "utf8");
  if (!index.includes("./assets/")) {
    throw new Error(`BUNDLE_RELATIVE_ASSETS_MISSING:${appId}`);
  }
  const files = await filesUnder(root);
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (relative.startsWith("../") || path.isAbsolute(relative)) {
      throw new Error(`BUNDLE_PATH_ESCAPE:${appId}:${relative}`);
    }
  }
  if (appId === "hub") continue;
  const manifestFile = path.join(root, "assets", "asset-manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  if (manifest.gameId !== appId) {
    throw new Error(
      `BUNDLE_MANIFEST_GAME_ID:${appId}:${manifest.gameId}`,
    );
  }
  for (const group of manifest.groups) {
    for (const asset of group.assets) {
      if (
        /^https?:/i.test(asset.url) ||
        asset.url.includes("..") ||
        asset.url.includes("\\")
      ) {
        throw new Error(`BUNDLE_ASSET_URL:${appId}:${asset.url}`);
      }
    }
  }
}

process.stdout.write("BUNDLE_BOUNDARIES_OK 4 apps\n");
```

- [ ] **Step 8: 运行共享底座全量回归**

Run:

```powershell
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: TypeScript、全部 Vitest、四应用构建及 Chromium/WebKit `20` 个 E2E 全部通过；`verify-bundles.mjs` 不报告跨游戏资源泄漏。

- [ ] **Step 9: 提交性能框架和实测报告**

```powershell
git add -- games/wechat-h5-v2/tests/performance games/wechat-h5-v2/test-results/wechat-h5-v2/performance games/wechat-h5-v2/scripts/verify-bundles.mjs
git commit -m "test: add h5 v2 performance and long-run gates"
```
