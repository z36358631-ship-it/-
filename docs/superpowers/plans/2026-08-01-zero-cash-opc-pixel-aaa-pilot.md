# One-Floor Heist Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 `games/wechat-h5-v2` 工作区内交付一款可在手机横屏浏览器完成的 60–90 秒原创像素劫案切片，并用真实构建、自动化测试和 6 类 AI 玩家各 3 局的证据作出保留、返工或停止决定。

**Architecture:** 新建独立应用 `apps/one-floor-heist-pilot`，把纯 TypeScript 任务状态机与 PixiJS 呈现、触控、存档、遥测分离。第一阶段只实现一个楼层、一个加密核心、战斗/潜入/黑客三条主路线及交涉辅助路线；共享包只做支持新 `GameId`、事件名和安全可配置本地端口所需的最小扩展。

**Tech Stack:** Node.js 24、npm workspaces、TypeScript 5.7 strict、Vite 6、PixiJS 8、Vitest 3、Playwright 1.62、Sharp、本地 `localStorage`，无新增付费服务或运行时远程依赖。

---

除明确写出仓库根目录的 Git 命令外，所有 `Run:` 命令默认在 `games/wechat-h5-v2` 执行；Git 暂存与提交命令在仓库根目录执行。

## 0. 范围、文件结构与交付门禁

本计划只覆盖设计规格的“阶段一：60–90 秒核心切片”。5 分钟任务、15 分钟公开样板、微信小游戏壳、IAA、IAP、远程分析、外部测试和公开发布均需要新的书面确认与独立实施计划。

### 新应用文件边界

```text
games/wechat-h5-v2/apps/one-floor-heist-pilot/
├── index.html                         # 横屏画布、UI 层、无障碍播报区
├── package.json                       # 独立 workspace 应用
├── vite.config.ts                     # 复用根 Vite 工厂
├── public/assets/                     # 仅包含可审计的最小像素图集和清单
└── src/
    ├── main.ts                        # 启动、共享服务装配、失败兜底与释放
    ├── styles.css                     # 横屏、安全区、HUD、弹层和降级样式
    ├── app/createHeistApp.ts           # 领域、场景、HUD、输入的应用协调器
    ├── domain/types.ts                # 唯一的领域类型来源
    ├── domain/geometry.ts             # 向量、碰撞、视锥与距离函数
    ├── domain/createMission.ts        # 可复现初始任务
    ├── domain/advanceMission.ts       # 固定步长与系统调用顺序
    ├── domain/stealth.ts              # 视野、噪声、搜索和警戒
    ├── domain/combat.ts               # 攻击、闪避、伤害和精英前摇
    ├── domain/interactions.ts         # 门禁、电源、核心、证据与 NPC
    ├── domain/routeResolution.ts       # 路线承诺、结局与 90 秒超时
    ├── input/createHeistControls.ts   # 双指摇杆、瞄准、攻击、闪避和交互
    ├── presentation/PixiHeistScene.ts # Pixi 场景树、相机、对象池和性能档
    ├── presentation/HeistHud.ts       # 简报、提示、黑客、交涉、结算和重玩
    ├── meta/saveModel.ts              # 设置、已见结局和第二局提示
    ├── quality/localReport.ts         # 匿名本地事件 JSON 导出
    └── testing/installReadOnlyApi.ts  # 仅 `?test=1` 可用的只读测试快照
```

### 明确不改的边界

- 不把新游戏加入 `apps/hub/src/catalog.ts`，阶段一只通过直达地址 `/one-floor-heist-pilot/` 体验。
- 不修改 `wechat-miniprogram-shell`、`delivery-allowlist.json` 或任何支付/广告配置。
- 不复用旧三款游戏来源不明或未经新项目审计的正式图片。
- 不关闭占用 4173 的既有进程；测试选择安全的空闲回环端口。
- 不上传构建、不联系外部测试者、不创建外部账号。

### 阶段一通过条件

- `typecheck`、单元、资产、构建、关键 E2E 和性能检查全部通过。
- 800×360、844×390、932×430 三档横屏视口无关键控件遮挡；对应 360×800、390×844、430×932 手机旋转后的视口。
- 15 秒内发生首次输入；任一路线 90 秒内可完成；三条路线都有真实触控完成证据。
- 后台 30 秒恢复后的领域时间漂移不超过 100ms；WebGL/资源失败不出现黑屏。
- 6 类 AI 玩家各完成 3 个唯一局次，共 18 局；P0=0，综合门禁最终为 `RETAIN` 才进入 5 分钟版本讨论。

---

### Task 1: 让普通 E2E 自动选择安全回环端口

**Files:**
- Create: `games/wechat-h5-v2/tools/testing/loopback-origin.mjs`
- Create: `games/wechat-h5-v2/tools/testing/loopback-origin.d.mts`
- Create: `games/wechat-h5-v2/tools/testing/loopback-origin.test.mjs`
- Create: `games/wechat-h5-v2/tools/testing/run-playwright.mjs`
- Modify: `games/wechat-h5-v2/tools/assets/serve-dist.mjs:1-54`
- Modify: `games/wechat-h5-v2/playwright.config.ts:1-43`
- Modify: `games/wechat-h5-v2/package.json:scripts`

- [ ] **Step 1: 写端口解析与安全 URL 的失败测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeGameEntryUrl,
  buildGameEntryUrl,
  resolveLoopbackPort,
} from "./loopback-origin.mjs";

test("uses 4173 by default and accepts an explicit unprivileged port", () => {
  assert.equal(resolveLoopbackPort(undefined), 4173);
  assert.equal(resolveLoopbackPort("4273"), 4273);
  assert.equal(
    buildGameEntryUrl("one-floor-heist-pilot", 4273),
    "http://127.0.0.1:4273/one-floor-heist-pilot/",
  );
});

test("rejects external hosts, query strings and unsafe ports", () => {
  assert.throws(() => resolveLoopbackPort("80"), /LOOPBACK_PORT_INVALID/);
  assert.throws(
    () => assertSafeGameEntryUrl(
      "https://example.com/one-floor-heist-pilot/",
      "one-floor-heist-pilot",
    ),
    /LOOPBACK_ENTRY_URL_INVALID/,
  );
  assert.throws(
    () => assertSafeGameEntryUrl(
      "http://127.0.0.1:4273/one-floor-heist-pilot/?test=1",
      "one-floor-heist-pilot",
    ),
    /LOOPBACK_ENTRY_URL_INVALID/,
  );
});
```

- [ ] **Step 2: 运行测试并确认模块尚不存在**

Run: `node --test tools/testing/loopback-origin.test.mjs`

Expected: FAIL，错误包含 `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现唯一的回环地址规则**

```js
import net from "node:net";

export const DEFAULT_LOOPBACK_PORT = 4173;

export function resolveLoopbackPort(raw) {
  const port = Number(raw ?? DEFAULT_LOOPBACK_PORT);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
    throw new Error(`LOOPBACK_PORT_INVALID:${String(raw)}`);
  }
  return port;
}

export function buildLoopbackOrigin(port = DEFAULT_LOOPBACK_PORT) {
  return `http://127.0.0.1:${resolveLoopbackPort(port)}`;
}

export function buildGameEntryUrl(gameId, port = DEFAULT_LOOPBACK_PORT) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(gameId)) {
    throw new Error(`LOOPBACK_GAME_ID_INVALID:${gameId}`);
  }
  return `${buildLoopbackOrigin(port)}/${gameId}/`;
}

export function assertSafeGameEntryUrl(value, gameId) {
  const url = new URL(value);
  const expectedPath = `/${gameId}/`;
  if (
    url.protocol !== "http:"
    || url.hostname !== "127.0.0.1"
    || resolveLoopbackPort(url.port) !== Number(url.port)
    || url.pathname !== expectedPath
    || url.search !== ""
    || url.hash !== ""
    || url.username !== ""
    || url.password !== ""
  ) {
    throw new Error(`LOOPBACK_ENTRY_URL_INVALID:${value}`);
  }
  return url.href;
}

export async function findAvailableLoopbackPort(start = DEFAULT_LOOPBACK_PORT) {
  for (let port = start; port <= Math.min(start + 100, 65_535); port += 1) {
    const available = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.listen(port, "127.0.0.1", () => {
        probe.close(() => resolve(true));
      });
    });
    if (available) return port;
  }
  throw new Error(`LOOPBACK_PORT_RANGE_EXHAUSTED:${start}`);
}
```

在 `loopback-origin.d.mts` 中声明与上述导出完全一致的类型，保证 `playwright.config.ts` 继续通过 strict typecheck。

- [ ] **Step 4: 让静态服务器显式报告端口冲突**

`serve-dist.mjs` 使用 `GAMEHUB_TEST_PORT`，保留 `PORT` 作为兼容回退；不得结束占用端口的进程：

```js
import { resolveLoopbackPort } from "../testing/loopback-origin.mjs";

const port = resolveLoopbackPort(
  process.env.GAMEHUB_TEST_PORT ?? process.env.PORT,
);

server.once("error", (error) => {
  const code = error && typeof error === "object" ? error.code : "UNKNOWN";
  process.stderr.write(
    `DIST_SERVER_START_FAILED:${code}:127.0.0.1:${port}\n`,
  );
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`DIST_SERVER_READY http://127.0.0.1:${port}\n`);
});
```

- [ ] **Step 5: 用包装器给 Playwright 选择空闲端口**

`run-playwright.mjs` 必须把端口传给 Playwright 配置和它启动的静态服务器：

```js
import { spawn } from "node:child_process";
import path from "node:path";
import { findAvailableLoopbackPort } from "./loopback-origin.mjs";

const port = await findAvailableLoopbackPort(
  Number(process.env.GAMEHUB_TEST_PORT ?? 4173),
);
const cli = path.resolve("node_modules/@playwright/test/cli.js");
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, GAMEHUB_TEST_PORT: String(port) },
  stdio: "inherit",
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
```

`playwright.config.ts` 通过 `resolveLoopbackPort` 和 `buildLoopbackOrigin` 同时生成 `use.baseURL`、`webServer.url` 和 `webServer.env.GAMEHUB_TEST_PORT`。`package.json` 改为：

```json
{
  "test:e2e": "node tools/testing/run-playwright.mjs test tests/e2e",
  "test:performance": "node tools/testing/run-playwright.mjs test tests/performance --project=chromium"
}
```

- [ ] **Step 6: 验证默认 4173 被占用时仍能启动测试服务器**

Run: `node --test tools/testing/loopback-origin.test.mjs`

Expected: PASS，2 tests。

Run: `npm run test:e2e -- --list`

Expected: PASS；包装器选择空闲回环端口，不终止 PID 20140 或其他既有进程。

- [ ] **Step 7: 提交端口基础设施**

```bash
git add games/wechat-h5-v2/tools/testing games/wechat-h5-v2/tools/assets/serve-dist.mjs games/wechat-h5-v2/playwright.config.ts games/wechat-h5-v2/package.json
git commit -m "test: make H5 browser port configurable"
```

---

### Task 2: 注册新游戏工作区与本地事件契约

**Files:**
- Modify: `games/wechat-h5-v2/packages/contracts/src/index.ts:1-53`
- Modify: `games/wechat-h5-v2/packages/contracts/src/index.test.ts:1-37`
- Modify: `games/wechat-h5-v2/vite.app.config.ts:5-10`
- Modify: `games/wechat-h5-v2/vite.app.config.test.ts`
- Modify: `games/wechat-h5-v2/package.json:scripts.build:apps`
- Modify: `games/wechat-h5-v2/tools/assets/verify-bundles.mjs:4-9,50`

- [ ] **Step 1: 锁定新 `GameId`、端口和事件名的失败测试**

```ts
expect(GAME_IDS).toEqual([
  "hub",
  "ricochet-crew",
  "monster-night-market",
  "three-lane-squad",
  "one-floor-heist-pilot",
]);
expect(GAME_EVENT_NAMES).toEqual(expect.arrayContaining([
  "game_start",
  "route_discovered",
  "route_committed",
  "alarm_changed",
  "core_obtained",
  "interest_cta_click",
  "report_exported",
]));
```

在 `vite.app.config.test.ts` 增加断言：

```ts
const config = createAppViteConfig(
  "/tmp/one-floor-heist-pilot",
  "one-floor-heist-pilot",
);
expect(config.server).toMatchObject({ port: 5177, strictPort: true });
expect(config.build).toMatchObject({ target: "es2020" });
```

- [ ] **Step 2: 运行测试并确认新 ID 不受支持**

Run: `npx vitest run packages/contracts/src/index.test.ts vite.app.config.test.ts`

Expected: FAIL，差异包含 `one-floor-heist-pilot` 和端口映射缺失。

- [ ] **Step 3: 扩展共享契约**

在 `GAME_IDS` 末尾加入 `"one-floor-heist-pilot"`；在 `GAME_EVENT_NAMES` 末尾加入上一步的 7 个事件。保留既有事件，避免旧游戏回归。

在 `vite.app.config.ts` 的 `PORTS` 中加入：

```ts
"one-floor-heist-pilot": 5177,
```

- [ ] **Step 4: 把新应用加入根构建但不加入旧大厅产品组合**

`package.json` 的构建脚本变为：

```json
{
  "build:apps": "npm run build -w @gamehub/h5-hub -w @gamehub/h5-ricochet-crew -w @gamehub/h5-monster-night-market -w @gamehub/h5-three-lane-squad -w @gamehub/h5-one-floor-heist-pilot"
}
```

`verify-bundles.mjs` 的 `appIds` 追加 `one-floor-heist-pilot`，成功文案改为 `BUNDLE_BOUNDARIES_OK 5 apps`。`tools/verify-portfolio.mjs` 保持三款旧大厅游戏不变，因为阶段一尚未获得加入大厅的产品批准。

- [ ] **Step 5: 运行契约测试**

Run: `npx vitest run packages/contracts/src/index.test.ts vite.app.config.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交契约变更**

```bash
git add games/wechat-h5-v2/packages/contracts games/wechat-h5-v2/vite.app.config.ts games/wechat-h5-v2/vite.app.config.test.ts games/wechat-h5-v2/package.json games/wechat-h5-v2/tools/assets/verify-bundles.mjs
git commit -m "feat: register one-floor heist pilot"
```

---

### Task 3: 统一新资产来源格式并兼容读取旧记录

**Files:**
- Modify: `games/wechat-h5-v2/art/schemas/provenance.schema.json`
- Modify: `games/wechat-h5-v2/tools/assets/validate-art-assets.mjs:1-83`
- Modify: `games/wechat-h5-v2/tools/assets/validate-art-assets.test.mjs`
- Modify: `games/wechat-h5-v2/art/README.md`

- [ ] **Step 1: 写规范对象与旧数组兼容的失败测试**

```js
import {
  normalizeProvenanceDocument,
  validateRuntimeAssets,
} from "./validate-art-assets.mjs";

test("normalizes the canonical provenance envelope", () => {
  const assets = [{
    id: "pilot-atlas",
    gameId: "one-floor-heist-pilot",
    role: "atlas",
    sourceFile: "art/source/one-floor-heist-pilot/pilot-atlas.svg",
    runtimeFile: "apps/one-floor-heist-pilot/public/assets/pilot-atlas.png",
    sourceType: "repo-procedural",
    license: "project-original",
    prompt: "Deterministic pixel atlas for the original heist pilot.",
    generatedAt: "2026-08-01T00:00:00.000Z",
    usage: "Runtime characters, floor and devices",
    sha256: "a".repeat(64),
    humanRevisionStatus: "retouched",
  }];
  assert.deepEqual(
    normalizeProvenanceDocument({
      schemaVersion: 1,
      gameId: "one-floor-heist-pilot",
      assets,
    }, "one-floor-heist-pilot"),
    assets,
  );
});

test("reads a legacy array without losing IDs", () => {
  const legacy = [{ id: "legacy", gameId: "hub" }];
  assert.equal(normalizeProvenanceDocument(legacy, "hub")[0].id, "legacy");
});

test("rejects an envelope whose game identity does not match", () => {
  assert.throws(
    () => normalizeProvenanceDocument({
      schemaVersion: 1,
      gameId: "hub",
      assets: [],
    }, "one-floor-heist-pilot"),
    /PROVENANCE_GAME_ID_MISMATCH/,
  );
});
```

- [ ] **Step 2: 运行资产测试并确认缺少标准化函数**

Run: `node --test tools/assets/validate-art-assets.test.mjs`

Expected: FAIL，错误指出 `normalizeProvenanceDocument` 未导出。

- [ ] **Step 3: 实现单一标准化入口**

```js
export function normalizeProvenanceDocument(document, expectedGameId) {
  if (Array.isArray(document)) return document;
  if (
    !document
    || typeof document !== "object"
    || document.schemaVersion !== 1
    || typeof document.gameId !== "string"
    || !Array.isArray(document.assets)
  ) {
    throw new Error(`PROVENANCE_SCHEMA_INVALID:${expectedGameId}`);
  }
  if (document.gameId !== expectedGameId) {
    throw new Error(
      `PROVENANCE_GAME_ID_MISMATCH:${expectedGameId}:${document.gameId}`,
    );
  }
  return document.assets;
}
```

`validateApp` 必须先调用该函数，再把标准化后的数组传给 `validateRuntimeAssets`。对每个新格式条目校验 `gameId`、`sourceType`、`license`、`sourceFile`、`runtimeFile` 和 SHA-256；旧数组只为现有项目兼容读取，不允许作为新项目写入格式。

- [ ] **Step 4: 更新 JSON Schema 为规范 envelope**

根对象固定为：

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "gameId", "assets"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "gameId": {
      "enum": [
        "hub",
        "ricochet-crew",
        "monster-night-market",
        "three-lane-squad",
        "one-floor-heist-pilot"
      ]
    },
    "assets": {
      "type": "array",
      "items": { "$ref": "#/$defs/asset" }
    }
  }
}
```

`$defs.asset.required` 固定包含 `id`、`gameId`、`role`、`sourceFile`、`runtimeFile`、`sourceType`、`license`、`prompt`、`generatedAt`、`usage`、`sha256`、`humanRevisionStatus`。`role` 支持现有 `character-roster`；`sourceType` 只允许 `repo-procedural`、`ai-generated`、`human-authored`、`licensed-external`。

- [ ] **Step 5: 记录迁移规则**

在 `art/README.md` 写明：新建或修改资产一律使用 envelope；旧数组只读；`generated`/`rejected` 不能进入评审构建；外部资产必须填授权文件路径，本切片不使用外部资产。

- [ ] **Step 6: 运行资产测试**

Run: `node --test tools/assets/validate-art-assets.test.mjs`

Expected: PASS，包含 envelope、旧数组、身份错配、尺寸、boot 预算用例。

- [ ] **Step 7: 提交来源管线修复**

```bash
git add games/wechat-h5-v2/art/schemas/provenance.schema.json games/wechat-h5-v2/art/README.md games/wechat-h5-v2/tools/assets/validate-art-assets.mjs games/wechat-h5-v2/tools/assets/validate-art-assets.test.mjs
git commit -m "fix: normalize H5 asset provenance"
```

---

### Task 4: 创建独立应用壳和可重复生成的最小像素图集

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/package.json`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/vite.config.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/index.html`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/styles.css`
- Create: `games/wechat-h5-v2/tools/assets/create-pilot-assets.mjs`
- Create (generated): `games/wechat-h5-v2/art/source/one-floor-heist-pilot/pilot-atlas.svg`
- Create (generated): `games/wechat-h5-v2/apps/one-floor-heist-pilot/public/assets/pilot-atlas.png`
- Create (generated): `games/wechat-h5-v2/apps/one-floor-heist-pilot/public/assets/asset-manifest.json`
- Create (generated): `games/wechat-h5-v2/art/provenance/one-floor-heist-pilot.json`
- Modify: `games/wechat-h5-v2/package.json:scripts`
- Modify (generated): `games/wechat-h5-v2/package-lock.json`

- [ ] **Step 1: 写应用包和 Vite 入口**

`package.json` 使用已有工作区版本，不引入新依赖：

```json
{
  "name": "@gamehub/h5-one-floor-heist-pilot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": {
    "@gamehub/h5-accessibility": "0.1.0",
    "@gamehub/h5-assets": "0.1.0",
    "@gamehub/h5-audio": "0.1.0",
    "@gamehub/h5-contracts": "0.1.0",
    "@gamehub/h5-runtime": "0.1.0",
    "@gamehub/h5-save": "0.1.0",
    "@gamehub/h5-telemetry": "0.1.0",
    "@gamehub/h5-testing": "0.1.0",
    "pixi.js": "8.9.2"
  }
}
```

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppViteConfig } from "../../vite.app.config";

const appDir = path.dirname(fileURLToPath(import.meta.url));
export default createAppViteConfig(appDir, "one-floor-heist-pilot");
```

- [ ] **Step 2: 写最小可访问 HTML 和横屏骨架**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no" />
    <meta name="theme-color" content="#071017" />
    <title>数据酒店：核心切片</title>
  </head>
  <body>
    <main id="app" tabindex="-1" data-boot-state="idle" data-test-mode="false" data-time-scale="1">
      <canvas id="game-canvas" aria-label="近未来数据酒店潜入任务"></canvas>
      <section id="ui-layer" aria-label="任务界面"></section>
      <p id="live-region" class="sr-only" aria-live="polite"></p>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`styles.css` 固定 `body` 无滚动、`#app` 填满动态视口、canvas 使用 `image-rendering: pixelated`，并处理 `env(safe-area-inset-*)`。当 `data-orientation="portrait"` 时显示旋转提示并隐藏操作区；当 `data-performance-tier="low"` 时禁用 CSS 光晕。

- [ ] **Step 3: 写确定性的像素图集生成脚本**

`create-pilot-assets.mjs` 用一个 256×256 SVG 源生成 PNG，并同时写入 manifest 和 provenance。图集必须包含：玩家 4 帧、守卫 4 帧、精英 4 帧、NPC 2 帧、门禁、摄像头、终端、核心、掩体、地板和 4 种效果块。关键输出逻辑固定为：

```js
function pixelFigure(x, y, body, accent, frame) {
  const foot = frame % 2 === 0 ? 0 : 2;
  return [
    `<rect x="${x + 6}" y="${y + 2}" width="8" height="8" fill="${accent}"/>`,
    `<rect x="${x + 4}" y="${y + 10}" width="12" height="12" fill="${body}"/>`,
    `<rect x="${x + 2}" y="${y + 12 + foot}" width="4" height="8" fill="${body}"/>`,
    `<rect x="${x + 14}" y="${y + 12 - foot}" width="4" height="8" fill="${body}"/>`,
    `<rect x="${x + 5}" y="${y + 22}" width="4" height="8" fill="#09131b"/>`,
    `<rect x="${x + 11}" y="${y + 22}" width="4" height="8" fill="#09131b"/>`,
  ].join("");
}

function renderPilotAtlasSvg() {
  const figures = [
    ["#21d4c2", "#d8fff8"],
    ["#e4a94f", "#fff0be"],
    ["#d6495f", "#ffd8df"],
  ].flatMap(([body, accent], row) =>
    Array.from({ length: 4 }, (_, frame) =>
      pixelFigure(frame * 32, row * 40, body, accent, frame),
    ),
  ).join("");
  const npc = [0, 1].map((frame) =>
    pixelFigure(128 + frame * 32, 0, "#7c70c9", "#eeeaff", frame),
  ).join("");
  const devices = [
    '<rect x="128" y="48" width="24" height="32" fill="#233746"/><rect x="134" y="54" width="12" height="18" fill="#21d4c2"/>',
    '<rect x="160" y="48" width="24" height="32" fill="#26303b"/><circle cx="172" cy="58" r="5" fill="#e04b62"/>',
    '<rect x="192" y="48" width="24" height="32" fill="#142a38"/><rect x="196" y="54" width="16" height="10" fill="#62d8ff"/>',
    '<rect x="224" y="48" width="24" height="32" fill="#1f3240"/><path d="M236 52l8 12-8 12-8-12z" fill="#f6d65c"/>',
    '<rect x="128" y="88" width="56" height="20" fill="#394752"/><rect x="132" y="92" width="48" height="5" fill="#718391"/>',
    '<rect x="192" y="88" width="32" height="32" fill="#10242f"/><path d="M192 104h32M208 88v32" stroke="#1c3b49" stroke-width="2"/>',
  ].join("");
  const effects = ["#21d4c2", "#e04b62", "#f6d65c", "#f4f7fb"]
    .map((color, index) =>
      `<rect x="${128 + index * 32}" y="128" width="24" height="24" fill="none" stroke="${color}" stroke-width="4"/><rect x="${138 + index * 32}" y="138" width="4" height="4" fill="${color}"/>`,
    ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" shape-rendering="crispEdges"><rect width="256" height="256" fill="none"/>${figures}${npc}${devices}${effects}</svg>`;
}

const gameId = "one-floor-heist-pilot";
const sourceFile = "art/source/one-floor-heist-pilot/pilot-atlas.svg";
const runtimeFile = "apps/one-floor-heist-pilot/public/assets/pilot-atlas.png";
const svg = renderPilotAtlasSvg();
await mkdir(path.dirname(sourceFile), { recursive: true });
await mkdir(path.dirname(runtimeFile), { recursive: true });
await writeFile(sourceFile, `${svg}\n`);
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(runtimeFile);
const bytes = await readFile(runtimeFile);
const sha256 = createHash("sha256").update(bytes).digest("hex");

const manifest = {
  schemaVersion: 1,
  gameId,
  revision: sha256.slice(0, 8),
  groups: [{
    id: "boot",
    required: true,
    assets: [{
      id: "pilot-atlas",
      groupId: "boot",
      type: "atlas",
      url: "./pilot-atlas.png",
      bytes: bytes.length,
      sha256,
      width: 256,
      height: 256,
      frameRate: 10,
    }],
  }],
};
const provenance = {
  schemaVersion: 1,
  gameId,
  assets: [{
    id: "pilot-atlas",
    gameId,
    role: "atlas",
    sourceFile,
    runtimeFile,
    sourceType: "repo-procedural",
    license: "project-original",
    prompt: "Deterministic original pixel atlas for a near-future data-hotel heist; no third-party characters, logos, maps or story elements.",
    generatedAt: "2026-08-01T00:00:00.000Z",
    usage: "Phase-one runtime characters, devices, floor tiles and effects",
    sha256,
    humanRevisionStatus: "retouched",
    frameRate: 10,
    notes: "Generated only from SVG rectangles and project-owned color definitions.",
  }],
};
```

上述 `renderPilotAtlasSvg()` 只使用整数坐标、`shape-rendering="crispEdges"` 和项目内定义色板，不读取网络或字体文件。输出 JSON 使用 `JSON.stringify(value, null, 2) + "\n"`。

- [ ] **Step 4: 生成并验证资产**

在根脚本中增加：

```json
{
  "assets:pilot": "node tools/assets/create-pilot-assets.mjs"
}
```

Run: `npm run assets:pilot`

Expected: 生成 4 个文件，PNG 小于 100KB。

Run: `npm run assets:validate -- one-floor-heist-pilot`

Expected: PASS；boot 小于 5,000,000 bytes，纹理估算小于 80MiB，来源状态为 `retouched`。

- [ ] **Step 5: 更新 workspace lockfile**

Run: `npm install --package-lock-only --ignore-scripts`

Expected: 仅登记新 workspace，不下载新的包版本。

- [ ] **Step 6: 提交应用壳和资产**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot games/wechat-h5-v2/art/source/one-floor-heist-pilot games/wechat-h5-v2/art/provenance/one-floor-heist-pilot.json games/wechat-h5-v2/tools/assets/create-pilot-assets.mjs games/wechat-h5-v2/package.json games/wechat-h5-v2/package-lock.json
git commit -m "feat: scaffold heist pilot assets and shell"
```

---

### Task 5: 建立确定性任务状态、碰撞和固定步长

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/types.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/geometry.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/createMission.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/advanceMission.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/fixtures.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/mission.test.ts`

- [ ] **Step 1: 写初始布局与固定步长失败测试**

```ts
import { describe, expect, it } from "vitest";
import { advanceMission } from "../../../apps/one-floor-heist-pilot/src/domain/advanceMission";
import { createMission } from "../../../apps/one-floor-heist-pilot/src/domain/createMission";

describe("one-floor mission", () => {
  it("creates the same auditable floor for the same seed", () => {
    expect(createMission(7_301)).toEqual(createMission(7_301));
    expect(createMission(7_301).player.position).toEqual({ x: 88, y: 270 });
    expect(createMission(7_301).core.position).toEqual({ x: 850, y: 270 });
  });

  it("moves at a fixed rate without crossing solid walls", () => {
    const initial = createMission(7_301);
    const next = advanceMission(initial, {
      move: { x: -1, y: 0 },
      aim: { x: 1, y: 0 },
      attackPressed: false,
      dodgePressed: false,
      interactPressed: false,
      observePoint: null,
      hackChoice: null,
      dialogueChoice: null,
    }, 1_000 / 60);
    expect(next.player.position.x).toBeGreaterThanOrEqual(64);
    expect(next.elapsedMs).toBeCloseTo(1_000 / 60, 5);
  });
});
```

- [ ] **Step 2: 运行测试并确认领域模块缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/mission.test.ts`

Expected: FAIL，错误包含 `Failed to load url`。

- [ ] **Step 3: 定义唯一领域类型**

`types.ts` 固定以下公共类型，其他模块不得重新声明同名结构：

```ts
export interface Vec2 { x: number; y: number }
export type MissionPhase = "briefing" | "active" | "result";
export type PrimaryRoute = "combat" | "stealth" | "hack";
export type MissionEnding = "breach" | "ghost" | "cipher";
export type GuardMode = "patrol" | "investigate" | "search" | "combat" | "down";
export interface HeistInput {
  move: Vec2;
  aim: Vec2;
  attackPressed: boolean;
  dodgePressed: boolean;
  interactPressed: boolean;
  observePoint: Vec2 | null;
  hackChoice: 0 | 1 | 2 | null;
  dialogueChoice: "badge" | "bribe" | "leave" | null;
}
export interface MissionState {
  seed: number;
  phase: MissionPhase;
  elapsedMs: number;
  player: {
    position: Vec2;
    aim: Vec2;
    hp: number;
    invulnerableMs: number;
    dodgeCooldownMs: number;
    attackCooldownMs: number;
    noise: number;
    hasMaintenanceOrder: boolean;
    coverId: "cover-central" | "cover-vault" | null;
  };
  guards: GuardState[];
  devices: {
    lobbyDoorOpen: boolean;
    vaultDoorOpen: boolean;
    camerasDisabled: boolean;
    powerOff: boolean;
  };
  npc: { position: Vec2; disposition: "neutral" | "helpful" | "hostile" };
  core: { position: Vec2; obtained: boolean };
  alarm: number;
  discoveredRoutes: PrimaryRoute[];
  committedRoute: PrimaryRoute | null;
  hack: { active: boolean; sequence: number[]; cursor: number; deadlineMs: number };
  dialogueOpen: boolean;
  ending: MissionEnding | null;
  outcome: "win" | "loss" | null;
  lastCue: string | null;
}
```

`GuardState` 在同文件定义 `id`、`kind`、`position`、`facing`、`mode`、`hp`、`patrol`、`patrolIndex`、`windupMs`、`lastKnownPlayer`。

`tests/one-floor-heist-pilot/unit/fixtures.ts` 提供统一测试构造器：

```ts
import { createMission } from "../../../apps/one-floor-heist-pilot/src/domain/createMission";
import type { PrimaryRoute, Vec2 } from "../../../apps/one-floor-heist-pilot/src/domain/types";

export function activeMissionAt(position: Vec2) {
  const state = createMission(7_301);
  state.phase = "active";
  state.player.position = position;
  return state;
}

export function missionReadyForCore(route: PrimaryRoute) {
  const state = activeMissionAt({ x: 850, y: 270 });
  state.committedRoute = route;
  state.core.obtained = true;
  if (route === "combat") {
    state.guards.forEach((guard) => { guard.mode = "down"; });
  }
  if (route === "stealth") state.devices.powerOff = true;
  if (route === "hack") {
    state.devices.camerasDisabled = true;
    state.devices.vaultDoorOpen = true;
  }
  return state;
}
```

- [ ] **Step 4: 实现几何与楼层常量**

`geometry.ts` 实现纯函数 `add`、`scale`、`length`、`normalize`、`distance`、`clamp01`、`angleDelta`、`pointInCone` 和 `moveCircleAgainstRects`。地图逻辑尺寸固定 960×540；玩家半径 14；外墙内边界为 x=64..896、y=54..486；掩体矩形为 `{x:410,y:205,w:70,h:32}`、`{x:610,y:330,w:84,h:30}`；门在关闭时作为竖向矩形碰撞体。

- [ ] **Step 5: 实现可复现初始任务**

`createMission(7_301)` 固定：玩家 (88,270)，维护工单 (150,110)，NPC (230,126)，普通守卫在 (390,178) 与 (560,178) 间巡逻，精英在 (715,270)，黑客终端 (510,404)，电源 (230,430)，核心 (850,270)。种子只改变守卫初始巡逻方向、黑客三键序列和核心辉光色，不改变可达性。

- [ ] **Step 6: 实现固定系统顺序**

`advanceMission` 每帧依次执行：计时与冷却 → 玩家移动/碰撞 → 交互 → 潜入感知 → 战斗 → 路线/结局。`dtMs` 限制在 0..50；`phase !== "active"` 时只返回结构化克隆，不推进时间。

- [ ] **Step 7: 运行领域测试**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/mission.test.ts`

Expected: PASS。

- [ ] **Step 8: 提交领域骨架**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/fixtures.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/mission.test.ts
git commit -m "feat: add deterministic heist mission state"
```

---

### Task 6: 实现可读的潜入、噪声和警戒闭环

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/stealth.ts`
- Modify: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/advanceMission.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/stealth.test.ts`

- [ ] **Step 1: 写视锥、遮挡、噪声和发现后可转战斗的失败测试**

```ts
it("does not see the player through the central cover", () => {
  const state = createMission(7_301);
  state.phase = "active";
  state.guards[0].position = { x: 500, y: 190 };
  state.guards[0].facing = { x: 0, y: 1 };
  state.player.position = { x: 450, y: 250 };
  expect(advanceStealth(state, 100).alarm).toBe(0);
});

it("raises alarm from sight but keeps the run playable", () => {
  const state = createMission(7_301);
  state.phase = "active";
  state.player.position = { x: 450, y: 178 };
  const seen = advanceStealth(state, 500);
  expect(seen.alarm).toBeGreaterThan(0);
  expect(seen.guards[0].mode).toBe("combat");
  expect(seen.phase).toBe("active");
});
```

- [ ] **Step 2: 运行测试并确认潜入系统缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/stealth.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现感知规则**

`advanceStealth` 使用以下确定规则：普通守卫视距 180、半视角 35°；精英视距 220、半视角 45°；关闭电源后视距乘 0.55；掩体阻断视线。视线每 100ms 增加 18 警戒，奔跑噪声半径 100，攻击噪声半径 220，交互噪声半径 60。警戒达到 35 进入 investigate，70 进入 search，100 进入 combat；脱离视线后每秒下降 12，但不清除最后已知位置。

守卫模式转换必须输出 `lastCue`：`guard_notice`、`guard_search`、`alarm_full`。被发现只切换战斗/逃脱，不立即失败。

- [ ] **Step 4: 验证潜入规则**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/stealth.test.ts`

Expected: PASS，覆盖视锥内/外、掩体、电源关闭、噪声、警戒衰减和被发现后继续游戏。

- [ ] **Step 5: 提交潜入系统**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/stealth.ts games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/advanceMission.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/stealth.test.ts
git commit -m "feat: add readable stealth and alarm states"
```

---

### Task 7: 实现黑客、证据和交涉辅助路线

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/interactions.ts`
- Modify: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/advanceMission.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/interactions.test.ts`

- [ ] **Step 1: 写三种交互后果的失败测试**

```ts
it("turns off power and changes stealth state", () => {
  const state = activeMissionAt({ x: 230, y: 430 });
  const next = applyInteraction(state, { interactPressed: true });
  expect(next.devices.powerOff).toBe(true);
  expect(next.discoveredRoutes).toContain("stealth");
});

it("opens the service door when the player shows real evidence", () => {
  const state = activeMissionAt({ x: 230, y: 126 });
  state.player.hasMaintenanceOrder = true;
  state.dialogueOpen = true;
  const next = applyInteraction(state, { dialogueChoice: "badge" });
  expect(next.npc.disposition).toBe("helpful");
  expect(next.devices.lobbyDoorOpen).toBe(true);
});

it("completes the three-beat hack and disables cameras", () => {
  let state = activeMissionAt({ x: 510, y: 404 });
  state = applyInteraction(state, { interactPressed: true });
  for (const choice of state.hack.sequence) {
    state = applyInteraction(state, { hackChoice: choice as 0 | 1 | 2 });
  }
  expect(state.devices.camerasDisabled).toBe(true);
  expect(state.devices.vaultDoorOpen).toBe(true);
  expect(state.discoveredRoutes).toContain("hack");
});

it("observes devices and reveals at least two feasible routes", () => {
  const state = activeMissionAt({ x: 300, y: 270 });
  const power = inspectTarget(state, { x: 230, y: 430 });
  const terminal = inspectTarget(power.state, { x: 510, y: 404 });
  expect(terminal.state.discoveredRoutes).toEqual(
    expect.arrayContaining(["stealth", "hack"]),
  );
  expect(terminal.facts).toContain("终端可关闭监控并打开金库门");
});
```

- [ ] **Step 2: 运行测试并确认交互系统缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/interactions.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现上下文交互优先级**

距离 42 内按 `core > active dialogue/hack > NPC > evidence > terminal > power > cover > door` 选择唯一交互，不允许按钮堆叠。工单拾取后 NPC 的 `badge` 选项打开服务门且不降低警戒；无工单选择 `badge` 使 NPC hostile 并增加 25 警戒；`bribe` 明确显示“你没有可用筹码”，关闭对话但不制造死路；`leave` 安全退出。

`inspectTarget(state, point)` 只返回可见事实：门禁连接、监控视野、电源影响、掩体遮挡、NPC 与工单关系。观察电源或掩体加入 `stealth`，观察终端加入 `hack`，观察守卫武器/精英弱点加入 `combat`；同一路线只触发一次 `route_discovered`。简报明确显示“长按场景扫描”，保证玩家在 60 秒内能主动发现至少两种路线。

黑客为 3 次 0/1/2 决策，序列由种子产生，界面每步同时显示一个“安全脉冲”线索；总时限 6 秒。选错一次增加 20 警戒并重置 cursor，但终端仍可重试；完成后关闭摄像头、打开金库门并改变场景状态。

- [ ] **Step 4: 运行交互测试**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/interactions.test.ts`

Expected: PASS，包含错误黑客选择、超时、假证件、离开对话和重复交互幂等性。

- [ ] **Step 5: 提交交互系统**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/interactions.ts games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/advanceMission.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/interactions.test.ts
git commit -m "feat: add hacking and evidence interactions"
```

---

### Task 8: 实现战斗、精英前摇和三结局判定

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/combat.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/routeResolution.ts`
- Modify: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain/advanceMission.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/combat-and-routes.test.ts`

- [ ] **Step 1: 写攻击、闪避、可打断前摇和路线结局失败测试**

```ts
it("interrupts the elite windup with a timed attack", () => {
  const state = activeMissionAt({ x: 680, y: 270 });
  state.guards[1].windupMs = 280;
  const next = advanceCombat(state, {
    aim: { x: 1, y: 0 },
    attackPressed: true,
    dodgePressed: false,
  }, 16.67);
  expect(next.guards[1].windupMs).toBe(0);
  expect(next.lastCue).toBe("elite_interrupted");
});

it("uses cover to block a locked shot and can switch cover", () => {
  const state = activeMissionAt({ x: 440, y: 252 });
  state.player.coverId = "cover-central";
  const blocked = resolveEnemyStrike(state, "elite-1");
  expect(blocked.player.hp).toBe(3);
  const switched = applyCoverAction(blocked, { x: 652, y: 366 });
  expect(switched.player.coverId).toBe("cover-vault");
});

it.each([
  ["combat", "breach"],
  ["stealth", "ghost"],
  ["hack", "cipher"],
] as const)("resolves %s as %s", (route, ending) => {
  const state = missionReadyForCore(route);
  const next = resolveRouteAndEnding(state);
  expect(next.outcome).toBe("win");
  expect(next.ending).toBe(ending);
});
```

- [ ] **Step 2: 运行测试并确认战斗和路线模块缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/combat-and-routes.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现战斗数值**

玩家最大生命 3；攻击距离 72、60° 扇形、伤害 1、冷却 320ms、噪声 100；闪避距离 82、无敌 280ms、冷却 1,100ms。靠近掩体使用上下文动作会贴靠，掩体阻断穿过其矩形的锁定射线；贴靠后朝另一掩体闪避会执行一次 82px 掩体切换。普通守卫生命 2，每 900ms 攻击 1 点；精英生命 4，每 1,600ms 发起 650ms 红色前摇，前 450ms 被玩家攻击可打断，最后 200ms 锁定方向并造成 1 点伤害。玩家生命归零产生 loss 结算，但提供立即重玩。

- [ ] **Step 4: 实现路线承诺和结局优先级**

首次产生不可逆后果时承诺路线：击倒任一敌人→combat；完成终端→hack；在警戒小于 35 且关闭电源/避开视线到达金库→stealth。若先完成 hack 后战斗，主路线保持 hack，结果标记 `mixed=true`；若先击倒敌人再 hack，主路线保持 combat。

取得核心时：combat→breach，stealth→ghost，hack→cipher。90,000ms 未取得核心或玩家死亡为 loss；不存在即时死路。结果包含 `durationMs`、`alarmPeak`、`ending`、`mixed` 和 `otherRouteHint`。

- [ ] **Step 5: 运行战斗与结局测试**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/combat-and-routes.test.ts`

Expected: PASS，覆盖攻击冷却、闪避无敌、掩体阻挡/切换、前摇打断窗口、生命归零、超时、三结局和混合路线优先级。

- [ ] **Step 6: 提交核心玩法闭环**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src/domain games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/combat-and-routes.test.ts
git commit -m "feat: complete heist combat and route endings"
```

---

### Task 9: 建立 PixiJS 场景树、相机、对象池和降级档

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/presentation/PixiHeistScene.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/presentation-model.test.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/pixi-smoke.spec.ts`

- [ ] **Step 1: 写场景投影与浏览器 smoke 失败测试**

```ts
it("projects all required gameplay cues", () => {
  const model = buildSceneModel(createMission(7_301));
  expect(model.layers).toEqual([
    "floor", "devices", "actors", "vision", "effects", "debug",
  ]);
  expect(model.actors.map((actor) => actor.id)).toEqual([
    "player", "guard-1", "elite-1", "concierge",
  ]);
});
```

```ts
test("boots a real Pixi application without a black frame", async ({ page }) => {
  await page.goto("/one-floor-heist-pilot/?test=1");
  await expect(page.locator("#app")).toHaveAttribute("data-boot-state", "ready");
  const snapshot = await page.evaluate(() => window.__GAME_TEST__?.read("heist.snapshot"));
  expect(snapshot.renderer.ready).toBe(true);
  expect(snapshot.renderer.stageChildren).toBeGreaterThan(0);
  expect(snapshot.renderer.textureCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 运行测试并确认场景类缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/presentation-model.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现 Pixi 初始化和固定场景层**

`PixiHeistScene.create(canvas, profile)` 使用 Pixi 8 的异步初始化：

```ts
const app = new Application();
await app.init({
  canvas,
  width: 960,
  height: 540,
  antialias: false,
  autoDensity: true,
  resolution: profile.dprCap,
  backgroundColor: 0x071017,
  preference: "webgl",
});
TextureSource.defaultOptions.scaleMode = "nearest";
```

创建固定层 `floor`、`devices`、`actors`、`vision`、`effects`、`debug`。逻辑状态只通过 `render(state, alpha)` 进入场景；Pixi 对象不反向修改领域状态。

- [ ] **Step 4: 实现可读视觉语义**

视野用半透明青/红扇形；警戒 35/70/100 分别改变头顶符号；精英前摇绘制由外向内收缩的红圈；交互对象在 42 距离内描边；关闭电源后只改变灯光层，不把敌人和碰撞隐藏。镜头只在 x=480..720 内做最多 80px 横向跟随，避免手机上晕动。

对象池上限：弹道/火花 32、警戒粒子 24、伤害数字 12。low 档关闭粒子和阴影，balanced 档粒子 50%，high 档全开；敌人逻辑不随档位变化。

取得核心触发唯一高潮演出：逻辑暂停 120ms、核心扫描环扩散 600ms、镜头向核心推进最多 48px、当前路线色覆盖 300ms，然后进入结果层；减少动态模式取消镜头推进，只保留扫描环和字幕。演出总时长不超过 1.1 秒，不延迟 `run_end` 超过 1.2 秒。

- [ ] **Step 5: 实现资源与上下文释放**

`dispose()` 必须清空对象池、销毁容器、卸载 context lost/restored 监听，并执行 `app.destroy(false, { children: true, texture: true })`。WebGL context lost 时触发应用回调，不保持黑屏。

- [ ] **Step 6: 运行纯投影测试**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/presentation-model.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交 Pixi 场景**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src/presentation/PixiHeistScene.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/presentation-model.test.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/pixi-smoke.spec.ts
git commit -m "feat: render heist pilot with PixiJS"
```

---

### Task 10: 实现手机双指操作、上下文 HUD 和立即重玩

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/input/createHeistControls.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/presentation/HeistHud.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/input-map.test.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/mobile-controls.spec.ts`

- [ ] **Step 1: 写多指分区与按钮优先级失败测试**

```ts
it.each([
  [{ x: 120, y: 420 }, "move"],
  [{ x: 620, y: 250 }, "aim"],
  [{ x: 862, y: 420 }, "attack"],
  [{ x: 760, y: 468 }, "dodge"],
  [{ x: 748, y: 365 }, "interact"],
] as const)("maps %j to %s", (point, expected) => {
  expect(classifyControlPoint(point, { width: 960, height: 540 })).toBe(expected);
});
```

- [ ] **Step 2: 运行测试并确认输入模块缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/input-map.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现真正的双指控制器**

控制器维护 `Map<number, PointerRole>`，允许左指持续移动时右指瞄准/攻击。左下摇杆中心随首次按下在 x=70..220、y=330..485 内浮动，最大半径 72，死区 10；右侧空白区拖动更新 aim；attack/dodge/interact 按钮优先于 aim。右侧空白区按住 450ms 且位移不超过 8px 时输出一次 `observePoint`，移动或抬手立即取消观察。`pointercancel`、blur、暂停和销毁必须归零 move、attack、dodge、interact、observePoint，防止卡键。

控制器每帧返回完整 `HeistInput`；一次性动作在 `consumeFrameInput()` 后清除，move/aim 保持。它不读取领域状态，HUD 通过 `setContextAction(label, enabled)` 控制交互按钮文案。

- [ ] **Step 4: 实现 HUD 状态机**

`HeistHud` 只渲染以下互斥层：briefing、playing、hack、dialogue、paused、result、fatal、orientation。playing 显示 90 秒倒计时、生命、警戒条、当前目标和唯一上下文动作；hack 显示三个大按钮和 6 秒计时；dialogue 显示三项明确后果；result 显示结局、耗时、峰值警戒、“立即重玩”和“导出匿名报告”。第二局简报显示上一局未走路线提示，但不解锁数值成长。

- [ ] **Step 5: 写真实多指 E2E**

`mobile-controls.spec.ts` 使用 CDP `Input.dispatchTouchEvent` 同时按住左摇杆并点击攻击，断言玩家位置变化且守卫 HP 下降；随后触发 `touchCancel`，断言 snapshot.move 为 `{x:0,y:0}`。再用页面按钮进入黑客层、完成三键序列、取得核心并点击立即重玩，断言产生不同 runId。

为满足触控替代要求，控制器同时支持 WASD/方向键移动、鼠标瞄准、Space 攻击、Shift 闪避、E 交互；设置中可把浮动摇杆切换为固定四方向 D-pad。键盘和 D-pad 必须进入同一个 `HeistInput`，不得建立第二套玩法规则。

HUD 把 `lastCue` 显示为 1.5 秒字幕，并用无障碍 live region 播报警戒、精英前摇、核心取得和结局。高对比模式不能只改变饱和度，必须给视野、危险圈和交互描边增加不同形状/线型。

- [ ] **Step 6: 运行输入单测**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/input-map.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交触控和 HUD**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src/input games/wechat-h5-v2/apps/one-floor-heist-pilot/src/presentation/HeistHud.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/input-map.test.ts games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/mobile-controls.spec.ts
git commit -m "feat: add multitouch heist controls and HUD"
```

---

### Task 11: 装配启动、生命周期、存档、本地遥测和失败兜底

**Files:**
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/meta/saveModel.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/audio/createHeistSynthBackend.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/quality/localReport.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/testing/installReadOnlyApi.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/app/createHeistApp.ts`
- Create: `games/wechat-h5-v2/apps/one-floor-heist-pilot/src/main.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/save-and-report.test.ts`

- [ ] **Step 1: 写存档恢复和隐私报告失败测试**

```ts
it("stores only settings and seen endings", async () => {
  const save = createDefaultHeistSave();
  expect(save).toEqual({
    settings: {
      muted: false,
      reducedMotion: false,
      highContrast: false,
      vibration: true,
      controlMode: "floating-stick",
    },
    seenEndings: [],
    completedRuns: 0,
  });
});

it("exports no direct identity or persistent device identifier", () => {
  const report = buildLocalHeistReport(eventsFixture, {
    version: "0.1.0",
    userAgent: "mobile fixture",
  });
  expect(JSON.stringify(report)).not.toMatch(
    /phoneNumber|openid|deviceId|latitude|longitude/iu,
  );
  expect(report.events.map((event) => event.event)).toContain("core_obtained");
});
```

- [ ] **Step 2: 运行测试并确认装配模块缺失**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/save-and-report.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现最小存档**

`HeistSave` 只包含静音、减少动态、高对比、振动、控制模式、三个已见结局和完成局数，schemaVersion=1。使用共享 `createSaveStore` 的主/备份校验；恢复备份时发出 `save_recovered` 并播报“已恢复最近有效设置”。不得保存玩家姓名、账号、位置、联系人或设备 ID。

- [ ] **Step 4: 映射本地事件**

开始应用发 `game_start`，开始局发共享 `run_start`，首次有效触控发 `first_input`，首次产生可见系统后果发共享 `first_payoff`，发现路线发 `route_discovered`，承诺路线发 `route_committed`，警戒跨越 35/70/100 发 `alarm_changed`，取得核心发 `core_obtained`，结束局发共享 `run_end`，重玩发 `replay_start`，导出发 `report_exported`。所有事件进入 `createLocalTelemetryQueue`，不配置 transport，不调用 `flush` 上传。

`run_end.payload.result` 必须为 `win` 或 `loss`，同时包含 `ending`、`route`、`durationMs`、`alarmPeak`，供正式 AI 证据工具读取。

- [ ] **Step 5: 实现零素材程序音效和无障碍反馈**

`createHeistSynthBackend.ts` 实现共享 `AudioBackend`，只用 Web Audio oscillator/gain 合成 `ui-confirm`、`footstep`、`guard-notice`、`attack`、`dodge`、`hack-step`、`hack-success`、`elite-windup`、`core-obtained`、`win`、`loss`。每个 cue 的振荡器数量不超过 3、时长不超过 1.2 秒；同一 cue 50ms 内合并，AudioBus 最大 8 voices。首次 pointer/keyboard 手势解锁，后台立即 suspend，返回后只能由“继续任务”手势 resume。

若振动设置开启且 `navigator.vibrate` 存在，guard notice 使用 30ms、受伤使用 `[40,30,40]`、核心取得使用 `[30,30,80]`；不支持时静默降级。所有关键音效同时产生字幕和图形反馈，静音玩家不丢失危险信息。减少动态关闭镜头缓动和粒子，高对比切换线型，D-pad 控制模式持久化。

- [ ] **Step 6: 实现匿名导出**

`buildLocalHeistReport` 输出随机测试 ID、版本、`mobile|desktop` 设备大类、操作系统大类、事件时间/名称/安全 payload、完成状态和退出节点。下载文件名为 `one-floor-heist-report-<yyyy-mm-dd>.json`；导出前 UI 明示“只保存在本机，不会自动上传”。

- [ ] **Step 7: 装配应用生命周期**

`createHeistApp` 持有 mission、scene、hud、controls、audio、accessibility，公开 `startRun`、`fixedUpdate`、`render`、`pause`、`resume`、`snapshot`、`dispose`。`main.ts`：加载 manifest/atlas → 创建 Pixi scene → 创建 runtime(16.67ms) → 装配服务 → ready。visibility/pagehide/orientation 使用共享 runtime 暂停逻辑、音频和计时；恢复后必须由玩家点“继续任务”。

`?test=1` 才安装只读 `heist.snapshot`，普通入口不得出现任何 `DEBUG`/`TEST` 全局。测试快照含领域状态、输入状态、渲染资源计数和生命周期计时，不暴露写操作。

- [ ] **Step 8: 实现失败兜底**

manifest/atlas 失败显示失败资源、重试和返回入口；WebGL 初始化/上下文失败显示设备大类、导出诊断和重试；存档全损坏允许清理本游戏键后继续；portrait 显示旋转提示；任一 fatal 状态都必须是 DOM 文本界面，不能只留下黑色 canvas。

- [ ] **Step 9: 运行存档、音效定义和报告测试**

Run: `npx vitest run tests/one-floor-heist-pilot/unit/save-and-report.test.ts`

Expected: PASS。

- [ ] **Step 10: 提交应用装配**

```bash
git add games/wechat-h5-v2/apps/one-floor-heist-pilot/src games/wechat-h5-v2/tests/one-floor-heist-pilot/unit/save-and-report.test.ts
git commit -m "feat: wire heist lifecycle save and local telemetry"
```

---

### Task 12: 补齐三路线 E2E、异常、横屏适配和性能门禁

**Files:**
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/helpers.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/three-routes.spec.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/e2e/failures-and-lifecycle.spec.ts`
- Create: `games/wechat-h5-v2/tests/one-floor-heist-pilot/playwright.config.ts`
- Modify: `games/wechat-h5-v2/tests/e2e/hub-and-apps.spec.ts`
- Modify: `games/wechat-h5-v2/tests/performance/frame-budget.spec.ts`
- Modify: `games/wechat-h5-v2/package.json:scripts`

- [ ] **Step 1: 写三路线触控测试**

`e2e/helpers.ts` 固定导出 `startHeist(page)`、`dispatchTouch(page, points)`、`touchMoveAndFight(page)`、`touchStealthPath(page)`、`touchHackPath(page)`、`alarmPeak(page)`、`deviceSnapshot(page)`、`elapsedMs(page)`。所有路径由屏幕坐标完成：战斗经中央走廊和掩体；潜入先到 (202,310) 对应电源再沿下墙；黑客到 (448,292) 对应终端并点击三个 UI 脉冲；不得调用领域写 API。坐标从 960×540 逻辑空间按当前 844×390 canvas bounding box 转换。

每条测试都从普通局开始并只通过 Playwright 触控/按钮完成：

```ts
test("combat route reaches breach ending", async ({ page }) => {
  await startHeist(page);
  await touchMoveAndFight(page);
  await expect(page.locator('[data-ending="breach"]')).toBeVisible();
  await expect(page.locator("#app")).toHaveAttribute("data-route", "combat");
});

test("long press observation reveals two routes in 60 seconds", async ({ page }) => {
  await startHeist(page);
  await dispatchTouch(page, [
    { type: "hold", x: 202, y: 310, durationMs: 500 },
    { type: "hold", x: 448, y: 292, durationMs: 500 },
  ]);
  await expect(page.locator('[data-route-known="stealth"]')).toBeVisible();
  await expect(page.locator('[data-route-known="hack"]')).toBeVisible();
  expect(await elapsedMs(page)).toBeLessThan(60_000);
});

test("stealth route reaches ghost ending below alarm 35", async ({ page }) => {
  await startHeist(page);
  await touchStealthPath(page);
  await expect(page.locator('[data-ending="ghost"]')).toBeVisible();
  expect(await alarmPeak(page)).toBeLessThan(35);
});

test("hack route changes devices before cipher ending", async ({ page }) => {
  await startHeist(page);
  await touchHackPath(page);
  await expect(page.locator('[data-ending="cipher"]')).toBeVisible();
  expect(await deviceSnapshot(page)).toMatchObject({
    camerasDisabled: true,
    vaultDoorOpen: true,
  });
});
```

- [ ] **Step 2: 写异常和生命周期测试**

覆盖：manifest 404 显示 fatal DOM；WebGL context lost 显示恢复 UI；主存档损坏从备份恢复；后台 30 秒不推进领域时间；portrait 暂停且 landscape 需主动继续；触控取消归零；90 秒超时可立即重玩；普通入口无测试全局、无外部网络请求。

- [ ] **Step 3: 写三档横屏截图检查**

Playwright 项目固定 800×360、844×390、932×430，均 `hasTouch:true`。对 briefing、playing、hack、dialogue、result 五态截图；断言攻击、闪避、交互、生命、倒计时的 bounding box 完整处于 viewport 和安全区内，元素互不相交。

- [ ] **Step 4: 扩展性能测试**

普通设备模拟 20 秒战斗与 20 秒警戒搜索：p95 frame delta ≤ 25ms、long task >50ms 数量 ≤ 2、JS heap 增长 ≤ 12MB；low 档 p95 ≤ 38ms、对象池不得超过预设上限。构建后 boot 传输 ≤5MB，新应用完整 dist ≤3MB。

- [ ] **Step 5: 注册独立测试脚本**

```json
{
  "test:heist": "vitest run tests/one-floor-heist-pilot/unit",
  "test:heist:e2e": "node tools/testing/run-playwright.mjs test --config tests/one-floor-heist-pilot/playwright.config.ts",
  "test:heist:performance": "node tools/testing/run-playwright.mjs test tests/performance/frame-budget.spec.ts --project=chromium"
}
```

- [ ] **Step 6: 构建后运行完整阶段一自动化**

Run: `npm run typecheck`

Expected: PASS。

Run: `npm run test:heist`

Expected: PASS，无 skip。

Run: `npm run assets:pilot && npm run assets:validate -- one-floor-heist-pilot && npm run build`

Expected: PASS，`dist/one-floor-heist-pilot/index.html` 存在，bundle 检查报告 5 apps。

Run: `npm run test:heist:e2e`

Expected: PASS，三条路线、异常和三档横屏全部通过。

Run: `npm run test:heist:performance`

Expected: PASS，所有预算在门槛内。

- [ ] **Step 7: 提交自动化门禁**

```bash
git add games/wechat-h5-v2/tests/one-floor-heist-pilot games/wechat-h5-v2/tests/e2e/hub-and-apps.spec.ts games/wechat-h5-v2/tests/performance/frame-budget.spec.ts games/wechat-h5-v2/package.json
git commit -m "test: gate heist routes lifecycle and performance"
```

---

### Task 13: 让正式 AI 证据工具支持新游戏和非 4173 安全端口

**Files:**
- Modify: `games/wechat-h5-v2/tools/run-ai-playtest-session.mjs`
- Modify: `games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs`
- Modify: `games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs`
- Modify: `games/wechat-h5-v2/tools/summarize-ai-playtests.mjs`
- Modify: `games/wechat-h5-v2/tools/ai-playtest/session-evidence-validator.mjs`
- Modify: `games/wechat-h5-v2/tools/ai-playtest/playwright-trace-evidence.mjs`
- Modify: `games/wechat-h5-v2/tools/ai-playtest/served-dist-attestation.mjs`
- Modify: `games/wechat-h5-v2/tools/ai-playtest/driver-session-state.mjs`
- Modify: `games/wechat-h5-v2/tools/ai-playtest/driver-ipc-server.mjs`
- Modify: `games/wechat-h5-v2/tools/ai-playtest-driver-cli.mjs`
- Modify: `games/wechat-h5-v2/tests/helpers/ai-playtest-evidence-fixture.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/ai-playtest-session.test.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/ai-playtest-evidence.test.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/ai-session-evidence.test.mjs`
- Modify: `games/wechat-h5-v2/tests/integration/score-ai-playtests.test.mjs`

- [ ] **Step 1: 写非默认端口仍需严格同源绑定的失败测试**

把现有测试内的 `createFormalFixture()` 扩展为可选接收 `{ gameId, port, viewport }`，默认值保持旧游戏、4173 和 390×844；测试不得另造一套报告结构。

```js
test("accepts an attested safe loopback entry on a non-default port", () => {
  const fixture = createFormalFixture({
    gameId: "one-floor-heist-pilot",
    port: 4273,
    viewport: { width: 844, height: 390 },
  });
  assert.deepEqual(collectAiPlaytestReportErrors(fixture.report), []);
});

test("rejects a different port between report and trace", async () => {
  const fixture = await createAiPlaytestEvidenceFixture({
    gameId: "one-floor-heist-pilot",
    port: 4273,
    viewport: { width: 844, height: 390 },
  });
  fixture.report.entryUrl =
    "http://127.0.0.1:4274/one-floor-heist-pilot/";
  await assert.rejects(
    validateCapturedSessionEvidence(fixture),
    /REPORT_BINDING|TRACE_URL/,
  );
});
```

- [ ] **Step 2: 运行 AI 工具集成测试并确认端口和游戏 ID 被拒绝**

Run: `npx vitest run tests/integration/ai-playtest-evidence.test.mjs tests/integration/score-ai-playtests.test.mjs`

Expected: FAIL，错误包含无效 `gameId` 或 `entryUrl`。

- [ ] **Step 3: 统一使用安全 URL helper**

所有入口校验调用 Task 1 的 `assertSafeGameEntryUrl`；禁止只用宽松正则。报告、session、trace、网络资源和 served-dist attestation 必须逐项与同一个完整 origin+path 绑定。允许端口 1024..65535，但仍只允许 `http://127.0.0.1`、准确游戏路径、无 query/hash、无重定向、无跨域资源。

`run-ai-playtest-session.mjs` 的入口改为：

```js
const port = resolveLoopbackPort(
  options.port ?? process.env.GAMEHUB_TEST_PORT,
);
const expectedEntryUrl = buildGameEntryUrl(options.gameId, port);
```

CLI 增加 `--port <number>`，默认仍为 4173；`DEFAULT_URLS` 改为函数，不再冻结硬编码字符串。

- [ ] **Step 4: 为新游戏选择横屏视口但保持旧游戏兼容**

`driver-session-state.mjs` 新增：

```js
export const VIEWPORTS = Object.freeze({
  default: Object.freeze({ width: 390, height: 844 }),
  "one-floor-heist-pilot": Object.freeze({ width: 844, height: 390 }),
});

export function viewportForGame(gameId) {
  return VIEWPORTS[gameId] ?? VIEWPORTS.default;
}
```

`run-ai-playtest-session` 的 browser context、`driver-ipc-server` 的坐标验证、capture 元数据和 trace 绑定都使用 `viewportForGame(gameId)`。CLI 客户端不再把 x 写死为 390、y 写死为 844；它先读取 descriptor 中只读的 `viewport`，再验证坐标。descriptor schema 增加精确 `viewport` 字段并继续校验 token、sessionId 和 loopback URL。旧三款仍为 390×844，新游戏严格为 844×390。

- [ ] **Step 5: 注册新游戏但保留旧基线**

`validate-ai-playtest-report.mjs` 的 `GAME_IDS` 追加 `one-floor-heist-pilot`；六类 `REVIEWER_ROLES` 和八项 `SCORE_KEYS` 不变。矩阵命令必须显式传 `--games one-floor-heist-pilot`，避免把阶段一测试误认为旧三款的重测。

给 `summarize-ai-playtests.mjs` 增加 `--root`、`--round`、`--games`、`--summary-output`、`--decision-output` 参数，同时保留旧位置参数入口。传 `--games one-floor-heist-pilot` 时要求 6 reports/18 runs，不再套用旧三款的 18 reports/54 runs；未传过滤项时保持旧行为。

- [ ] **Step 6: 让真实浏览器 fixture 使用传入端口和视口**

`createAiPlaytestEvidenceFixture({ port, gameId, viewport })` 用 `buildGameEntryUrl` 生成 ENTRY_URL，监听该端口并把实际端口、游戏 ID、视口写入 capture。所有原先断言固定 4173/390×844 的测试改为断言 fixture 的输入；另保留一个默认端口与默认视口用例，证明向后兼容。

- [ ] **Step 7: 运行 AI 基础设施测试**

Run: `npx vitest run tests/integration/ai-playtest-session.test.mjs tests/integration/ai-playtest-evidence.test.mjs tests/integration/ai-session-evidence.test.mjs tests/integration/score-ai-playtests.test.mjs`

Expected: PASS；默认端口和 4273、竖屏旧游戏和横屏新游戏均通过，外部主机、localhost 别名、端口错配、视口错配、query/hash、跨域资源仍失败。

- [ ] **Step 8: 提交 AI 证据端口、视口与游戏支持**

```bash
git add games/wechat-h5-v2/tools/run-ai-playtest-session.mjs games/wechat-h5-v2/tools/validate-ai-playtest-report.mjs games/wechat-h5-v2/tools/validate-ai-playtest-matrix.mjs games/wechat-h5-v2/tools/summarize-ai-playtests.mjs games/wechat-h5-v2/tools/ai-playtest games/wechat-h5-v2/tests/helpers/ai-playtest-evidence-fixture.mjs games/wechat-h5-v2/tests/integration
git commit -m "test: support heist AI evidence on safe ports"
```

---

### Task 14: 执行 6 类 AI 玩家各 3 局并自动作出阶段一决策

**Files:**
- Create: `games/wechat-h5-v2/tools/verify-heist-playtest-gate.mjs`
- Create: `games/wechat-h5-v2/tests/integration/verify-heist-playtest-gate.test.mjs`
- Create (generated): `games/wechat-h5-v2/test-results/ai-playtests/one-floor-heist-pilot/baseline/`（精确子目录为 `action-one-floor-heist-pilot`、`roguelite-one-floor-heist-pilot`、`casual-one-floor-heist-pilot`、`puzzle-one-floor-heist-pilot`、`tower-defense-one-floor-heist-pilot`、`skeptical-generalist-one-floor-heist-pilot`）
- Create (generated): `games/wechat-h5-v2/test-results/ai-playtests/one-floor-heist-pilot/baseline/matrix.json`
- Create (generated): `games/wechat-h5-v2/test-results/ai-playtests/one-floor-heist-pilot/baseline/decision.json`
- Create (generated): `games/wechat-h5-v2/test-results/ai-playtests/one-floor-heist-pilot/baseline/decision.md`

- [ ] **Step 1: 写切片专用门禁失败测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHeistGate } from "../../tools/verify-heist-playtest-gate.mjs";

const ROLES = [
  "action",
  "roguelite",
  "casual",
  "puzzle",
  "tower-defense",
  "skeptical-generalist",
];
const SCORE_KEYS = [
  "first30Seconds",
  "inputFeedback",
  "decisionAgency",
  "threeRunVariety",
  "failureReplayUrge",
  "audiovisualQuality",
  "metaReturnReason",
  "completeness",
];

function passingGateFixture() {
  const sessions = [];
  const reports = ROLES.map((role, roleIndex) => {
    const runs = [0, 1, 2].map((runIndex) => {
      const runId = `${role}-run-${runIndex + 1}`;
      const route = ["combat", "stealth", "hack"][(roleIndex + runIndex) % 3];
      sessions.push({
        runId,
        route,
        outcome: "win",
        durationMs: 62_000 + runIndex * 4_000,
        alarmToCombatRecovery: role === "skeptical-generalist" && runIndex === 0,
        evidence: [
          `${runId}-start.png`,
          `${runId}-result.png`,
          `${runId}-actions.jsonl`,
          `${runId}-trace.zip`,
          `${runId}-events.json`,
        ],
      });
      return { runId };
    });
    return {
      reviewerRole: role,
      scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, 82])),
      wouldReplay: true,
      problems: [],
      runs,
    };
  });
  return {
    reports,
    sessions,
    automation: {
      typecheck: true,
      unit: true,
      assets: true,
      build: true,
      e2e: true,
      performance: true,
    },
  };
}

test("retains only with 18 complete runs and all three routes", () => {
  const result = evaluateHeistGate(passingGateFixture());
  assert.equal(result.decision, "RETAIN");
});

test("does not retain with P0, missing route, low replay or failed automation", async (t) => {
  await t.test("P0", () => {
    const fixture = passingGateFixture();
    fixture.reports[0].problems.push({ severity: "P0", summary: "black screen" });
    assert.notEqual(evaluateHeistGate(fixture).decision, "RETAIN");
  });
  await t.test("missing route", () => {
    const fixture = passingGateFixture();
    fixture.sessions.forEach((run) => {
      if (run.route === "stealth") run.route = "combat";
    });
    assert.notEqual(evaluateHeistGate(fixture).decision, "RETAIN");
  });
  await t.test("low replay", () => {
    const fixture = passingGateFixture();
    fixture.reports.slice(0, 3).forEach((report) => { report.wouldReplay = false; });
    assert.notEqual(evaluateHeistGate(fixture).decision, "RETAIN");
  });
  await t.test("failed automation", () => {
    const fixture = passingGateFixture();
    fixture.automation.performance = false;
    assert.notEqual(evaluateHeistGate(fixture).decision, "RETAIN");
  });
});
```

- [ ] **Step 2: 运行门禁测试并确认工具缺失**

Run: `node --test tests/integration/verify-heist-playtest-gate.test.mjs`

Expected: FAIL。

- [ ] **Step 3: 实现切片门禁**

`evaluateHeistGate` 必须同时验证：6 份角色报告；每份 3 个唯一 runId；共 18 局；每局有 start/result 截图、action log、trace、event log；战斗/潜入/黑客各至少 3 个成功局；所有成功局 ≤90 秒；至少一局被发现后转战斗仍完成；自动化全绿。

先复用现有评分决策：P0>0 或均分<60 或重玩票≤1 → `DROP`；均分≥75、最低维度≥60、重玩票≥4、P1=0 →候选 `RETAIN`；其他为 `REWORK`。候选只有通过上述切片门禁后才输出最终 `RETAIN`。

- [ ] **Step 4: 冻结可测试提交并构建**

Run: `npm run typecheck && npm run test:heist && npm run assets:pilot && npm run assets:validate -- one-floor-heist-pilot && npm run build && npm run test:heist:e2e && npm run test:heist:performance`

Expected: 全部 PASS，源码干净；记录当前 40 位 commit，正式 AI 报告只绑定该 commit 和该次 dist hash。

- [ ] **Step 5: 启动空闲端口上的只读 dist 服务**

选择 Task 1 探测到的空闲端口，以下用 4273 表示实际值：

Run: `$env:GAMEHUB_TEST_PORT='4273'; node tools/assets/serve-dist.mjs`

Expected: `DIST_SERVER_READY http://127.0.0.1:4273`。服务只监听 127.0.0.1，不公开到局域网；若 4273 也被占用，重新探测，不结束占用进程。

- [ ] **Step 6: 分配六类独立玩家并完成真实触控**

六类角色固定为 `action`、`roguelite`、`casual`、`puzzle`、`tower-defense`、`skeptical-generalist`。每名玩家使用普通入口、390×844 手机横转后的 844×390 触控视口、无 `test=1`、无 seed/speed、无 debug 写入，连续完成 3 局；玩家可以自主改变路线，不允许脚本直接修改状态。

每个角色的正式采集使用独立输出目录、独立 reviewerId 和相同 build commit。采集进程启用只允许触控的 driver；命令直接从 Git 读取 Step 4 冻结的 40 位提交：

```powershell
$env:GAMEHUB_TEST_PORT='4273'
$commit = (git rev-parse HEAD).Trim()
node tools/run-ai-playtest-session.mjs --game one-floor-heist-pilot --round baseline --reviewer action --port 4273 --output test-results/ai-playtests/one-floor-heist-pilot/baseline/action-one-floor-heist-pilot --expected-commit $commit --driver-enabled true --driver-descriptor-path .tmp/ai-playtest/action-descriptor.json --draft-output .tmp/ai-playtest/action-draft.json --invalid-root test-results/ai-playtests/one-floor-heist-pilot/invalid
```

对应 AI 玩家只通过 `tools/ai-playtest-driver-cli.mjs --descriptor .tmp/ai-playtest/action-descriptor.json <command>` 的 `visible`、`capture`、`tap`、`begin`、`move`、`end` 操作普通页面；不得读取测试 API 或直接改 localStorage。每名玩家完成后独立填写八项分数、`wouldReplay`、关键决策、P0/P1/P2 和改进建议；事实字段必须来自事件与证据，主观分数明确标记为 AI 评价。不得复制其他角色结论。

- [ ] **Step 7: 验证六份报告和矩阵**

逐角色运行 `validate-ai-playtest-report.mjs`，再运行：

```powershell
node tools/validate-ai-playtest-matrix.mjs --root test-results/ai-playtests/one-floor-heist-pilot/baseline --round baseline --games one-floor-heist-pilot --expected-reports 6 --expected-runs 18 --output test-results/ai-playtests/one-floor-heist-pilot/baseline/matrix.json
node tools/summarize-ai-playtests.mjs --root test-results/ai-playtests/one-floor-heist-pilot/baseline --round baseline --games one-floor-heist-pilot --summary-output test-results/ai-playtests/one-floor-heist-pilot/baseline/decision.json --decision-output test-results/ai-playtests/one-floor-heist-pilot/baseline/decision.md
node tools/verify-heist-playtest-gate.mjs test-results/ai-playtests/one-floor-heist-pilot/baseline
```

Expected: 6 reports、18 runs、三路线覆盖完整，并生成 `matrix.json`、`decision.json`、`decision.md`。

- [ ] **Step 8: 根据结果执行唯一允许的分支**

- `RETAIN`：保留阶段一构建，停止扩写，向用户申请是否进入 5 分钟版本。
- `REWORK`：只修复报告中的 P0/P1 或最低分维度，创建 `rework-1` 轮并重跑受影响场景；最多到 `rework-2`。
- `DROP`：保留证据和原因，停止增加美术/剧情，不把失败切片包装成成品。

AI 结果不得写成真实用户留存、市场需求或付费验证。

- [ ] **Step 9: 提交门禁工具；证据按仓库既有策略处理**

```bash
git add games/wechat-h5-v2/tools/verify-heist-playtest-gate.mjs games/wechat-h5-v2/tests/integration/verify-heist-playtest-gate.test.mjs
git commit -m "test: gate heist pilot with AI play evidence"
```

正式证据是否进入 Git 由现有 delivery allowlist 和仓库规则决定；不得为了提交而绕过忽略规则或安全校验。

---

### Task 15: 生成本地试玩说明、验收报告并做最终复核

**Files:**
- Create: `docs/wechat-h5-v2/one-floor-heist-pilot-play-guide.md`
- Create: `docs/wechat-h5-v2/one-floor-heist-pilot-phase-1-acceptance.md`
- Modify: `docs/wechat-h5-v2/release-checklist.md`

- [ ] **Step 1: 写用户可直接执行的本地试玩说明**

说明必须包含：构建命令、启动命令、实际端口、直达 URL、横屏要求、左摇杆/右瞄准/攻击/闪避/上下文交互、三条路线提示、匿名报告导出、停止服务方式，以及“本阶段无支付、无广告、无远程上传、不是微信正式包”。

- [ ] **Step 2: 写阶段一验收报告**

报告固定分为：构建身份、自动化结果、三视口截图、资产预算、性能结果、三路线证据、18 局 AI 汇总、P0/P1/P2、最终 `RETAIN|REWORK|DROP`、已知风险、下一阶段授权边界。每项给出文件路径或命令结果，不使用“已完成”替代证据。

- [ ] **Step 3: 更新发布清单的阶段门禁**

仅增加“phase-1 local pilot”小节；不得勾选微信备案、小游戏审核、广告、支付或公开发布项。

- [ ] **Step 4: 运行最终验证**

Run: `npm run typecheck`

Expected: PASS。

Run: `npm test`

Expected: PASS；正式 AI 证据用例若按仓库规则需要显式开关，只允许显示既有的预期 skip，不允许新增无解释 skip。

Run: `npm run build`

Expected: PASS，5 app bundle boundary 通过。

Run: `npm run test:heist:e2e && npm run test:heist:performance`

Expected: PASS。

Run: `git status --short -- games/wechat-h5-v2 docs/wechat-h5-v2`

Expected: 只显示本计划明确创建/修改且尚未提交的文件；不得包含旧游戏的意外变更。

- [ ] **Step 5: 提交说明和验收报告**

```bash
git add docs/wechat-h5-v2/one-floor-heist-pilot-play-guide.md docs/wechat-h5-v2/one-floor-heist-pilot-phase-1-acceptance.md docs/wechat-h5-v2/release-checklist.md
git commit -m "docs: hand off one-floor heist pilot"
```

---

## 自检映射

|规格要求|计划任务|
|---|---|
|可配置端口且不杀既有进程|Task 1、13|
|统一资产来源格式与 5MB/18MB/80MiB 预算|Task 3、4|
|独立 PixiJS 应用、场景树、对象池、性能档|Task 2、4、9|
|战斗、潜入、黑客、交涉与混合后果|Task 5–8|
|横屏双指控制、暂停恢复、失败兜底|Task 10–12|
|本地存档、匿名事件和报告导出|Task 11|
|60–90 秒、三结局、立即重玩|Task 8、10、12|
|三档移动设备、E2E、性能和资源释放|Task 9、12|
|6 类 AI 玩家各 3 局与保留门禁|Task 13、14|
|零新增现金、无公司主体、无支付/广告/发布|Task 0、15|

本计划没有实现 5 分钟或 15 分钟内容；阶段一只有在证据门禁输出 `RETAIN` 且用户再次授权后，才创建下一阶段规格和计划。
