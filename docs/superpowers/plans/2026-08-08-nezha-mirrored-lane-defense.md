# Nezha Mirrored Lane Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Nezha H5 battle as two isolated mirrored lane-defense arenas with five-item recruitment, random shovels, fixed text guards, continuous enemy movement, animated attacks, recoverable terrain damage, exact hero telemetry, and a newly deployed public demo.

**Architecture:** Replace the current shared 8×12 opposing-army engine with two 8×6 `ArenaState` instances driven by one deterministic fixed-step simulation. Each arena owns a sampled curved route, static guards, moving enemies, gate, effects, telemetry, and event stream. React remains responsible for screens and HUD; two isolated Canvas 2D scenes interpolate movement at 60 FPS and consume attack/skill/terrain events without changing authoritative combat state.

**Tech Stack:** React 19, TypeScript, vinext/Vite, Node test runner, Canvas 2D, Web Animations for DOM-only feedback, Google Stitch through the signed-in browser, OpenAI Sites hosting.

---

## File Structure

- Create `h5游戏/nezha-chen-tang-demo/app/battle-config.mjs`: mirrored route, cell, gate, spawn, seeded unlock and geometry helpers.
- Rewrite `h5游戏/nezha-chen-tang-demo/app/game-engine.mjs`: deterministic double-arena state, five-result recruitment, shovel placement, waves, enemies, fixed guards, combat events and telemetry.
- Create `h5游戏/nezha-chen-tang-demo/app/animation-recipes.ts`: complete soldier decomposition and hero weapon animation recipes.
- Create `h5游戏/nezha-chen-tang-demo/app/components/ArenaCanvas.tsx`: one Canvas 2D renderer per arena.
- Create `h5游戏/nezha-chen-tang-demo/app/components/useBattleClock.ts`: fixed-step 30 Hz simulation clock with rAF snapshots.
- Create `h5游戏/nezha-chen-tang-demo/app/arena-renderer-model.mjs`: pure animation scheduling, terrain TTL and frame-budget helpers used by Canvas and Node tests.
- Modify `h5游戏/nezha-chen-tang-demo/app/page.tsx`: mirrored battle layout, five-result recruitment, shovel drag/drop, Canvas integration and revised settlement telemetry.
- Modify `h5游戏/nezha-chen-tang-demo/app/globals.css`: screenshot-faithful lane, grid, HUD, hand, drag, hit and fallback styles.
- Create `h5游戏/nezha-chen-tang-demo/art/stitch/manifest.json`: source prompts, Stitch screen identifiers and exported asset map.
- Create `h5游戏/nezha-chen-tang-demo/public/art/stitch/`: approved exported WebP/PNG/SVG reference assets.
- Create `h5游戏/nezha-chen-tang-demo/prototypes/0808-哪吒陈塘关镜像守城.html`: self-contained screenshot-to-prototype visual contract.
- Create `h5游戏/nezha-chen-tang-demo/test/battle-config.test.mjs`: route, mirroring, cell and initial unlock tests.
- Rewrite `h5游戏/nezha-chen-tang-demo/test/game-engine.test.mjs`: new battle contract tests.
- Create `h5游戏/nezha-chen-tang-demo/test/animation-recipes.test.mjs`: recipe completeness and event timing tests.
- Modify `h5游戏/nezha-chen-tang-demo/test/ui-contract.test.mjs`: new labels, canvas and interaction contract.
- Modify `h5游戏/nezha-chen-tang-demo/tests/rendered-html.test.mjs`: rendered battle screen contract.
- Create `h5游戏/nezha-chen-tang-demo/docs/ai-playtest-report-v3.md`: new 10-profile result with exact hero-count metric.

### Task 1: Preserve the Current V3 Corrections as a Baseline

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/app/game-engine.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/app/page.tsx`
- Modify: `h5游戏/nezha-chen-tang-demo/test/game-engine.test.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/test/ui-contract.test.mjs`
- Add: `h5游戏/nezha-chen-tang-demo/docs/ai-playtest-report-v2.md`
- Add: `h5游戏/nezha-chen-tang-demo/docs/playtest-p01-p04.md`
- Add: `h5游戏/nezha-chen-tang-demo/docs/playtest-p05-p07.md`
- Add: `h5游戏/nezha-chen-tang-demo/docs/playtest-p08-p10.md`

- [ ] **Step 1: Run the existing baseline tests**

Run: `npm.cmd test`

Expected: 26 tests pass, including retry energy deduction and real best-hero attribution.

- [ ] **Step 2: Build the existing baseline**

Run: `npm.cmd run build`

Expected: vinext completes with exit code 0.

- [ ] **Step 3: Stage only the existing V3 corrections and playtest reports**

Run:

```powershell
git add -- app/game-engine.mjs app/page.tsx test/game-engine.test.mjs test/ui-contract.test.mjs docs/ai-playtest-report-v2.md docs/playtest-p01-p04.md docs/playtest-p05-p07.md docs/playtest-p08-p10.md
git diff --cached --check
```

Expected: no whitespace errors; `.tmp/` and unrelated workspace changes remain unstaged.

- [ ] **Step 4: Commit the baseline**

Run: `git commit -m "fix: preserve Chen Tang playtest corrections"`

Expected: one commit containing only the eight listed files.

### Task 2: Generate and Archive the Google Stitch Visual System

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/art/stitch/manifest.json`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/battle-overview.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/enemy-walk.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/soldier-attacks.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/hero-attacks-01.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/hero-attacks-02.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/control-effects.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/terrain-recovery.webp`
- Create: `h5游戏/nezha-chen-tang-demo/public/art/stitch/recruit-and-evolve.webp`

- [ ] **Step 1: Open the existing Stitch project in the signed-in Chrome session**

Use the Chrome-control skill to open `https://stitch.withgoogle.com/?pli=1`, select the existing project `Ink Battle: Chen Tang Pass`, and preserve the existing screens.

Expected: the project opens without requesting a new account or replacing previous work.

- [ ] **Step 2: Generate the complete battle screen**

Submit this exact Stitch prompt:

```text
Create a high-fidelity 390×844 vertical mobile H5 battle screen in original Chinese ink-and-parchment style. The upper half is an AI lane-defense arena and the lower half is the player's mirrored arena. Each half has exactly one red curved route from its own spawn point to its own 500-HP Chen Tang Pass gate. Route cells cannot hold defenders; every cell outside the route is a formation cell, with only 4–5 cells lit and all other cells showing a shovel lock. Defenders are Chinese text only and stay fixed. Enemies are Chinese text tokens walking slowly along their own route toward their own gate. Show wave 2/6, two separate gate HP bars, five vertical recruitment results including one shovel, and clear route arrows. No character portraits, no humanoid models, no emoji, no modern fantasy UI, no shared center battlefield, and no troops attacking the opposite arena.
```

Expected: one screen where both routes, two gates, non-route formation cells and independent attack directions are immediately readable.

- [ ] **Step 3: Generate movement and attack storyboard sheets**

Submit these exact prompt variants as separate screens:

```text
Create a five-frame storyboard sheet for Chinese ink text enemy movement on parchment: ordinary soldier, cavalry, elite and boss. Each unit remains text-only. Frames show anticipation, footfall, weight transfer, ink shadow movement and recovery. Side view, transparent or plain parchment background, no humanoid body, consistent scale, designed for smooth 60 FPS interpolation.
```

```text
Create five horizontal five-frame attack storyboard strips for the Chinese text soldiers 刀、枪、弓、骑、兵. Every strip shows anticipation, a radical or stroke separating from the character, transformation into the matching weapon silhouette, attack travel or swing, bright hit impact, and strokes returning to the character. Original ink calligraphy, readable text, strong light-and-shadow hit feeling, no person model.
```

Expected: four movement rows and five complete soldier attack rows with consistent framing.

- [ ] **Step 4: Generate all hero weapon and skill sheets**

Submit two screens covering these exact heroes and weapons:

```text
Create high-fidelity text-only Chinese ink attack storyboard strips for 哪吒—火尖枪, 敖丙—方天戟, 李靖—玲珑塔, 太乙—拂尘, 申公豹—宝剑, 杨戬—三尖刀. The hero name stays fixed in its grid cell; a weapon is split from suitable strokes or appears beside the name in matching calligraphy. Show anticipation, weapon appearance, attack, impact light, terrain crack and recovery. No portraits or bodies.
```

```text
Create high-fidelity text-only Chinese ink attack storyboard strips for 敖广—龙珠, 石矶—太阿剑, 妲己—狐火, 姜子牙—打神鞭, 雷震子—黄金棍, 殷夫人—护身符. The hero name stays fixed in its grid cell; show weapon appearance, skill travel, strong hit light, readable control effect and recoverable terrain mark. No portraits or bodies.
```

Expected: all 12 heroes have distinct readable weapons and attack silhouettes.

- [ ] **Step 5: Generate effects, terrain and interaction sheets**

Submit three separate prompts for control effects, terrain recovery, and recruitment/evolution. Require the seven labels `眩晕、击退、击倒、减速、贯穿、火焰区、冰冻区`, the five terrain states `裂纹、凹痕、焦黑、冰裂、碎石`, and the four interactions `五连征兵、铲子掉落、拖铲解锁、英雄进化`.

Expected: each effect is distinguishable without covering route arrows or HP bars.

- [ ] **Step 6: Export, optimize and record asset provenance**

Export approved screens, convert oversized raster exports to WebP at 2× mobile resolution, and write this exact manifest shape:

```json
{
  "source": "Google Stitch",
  "project": "Ink Battle: Chen Tang Pass",
  "generatedAt": "2026-08-08",
  "style": "original ink parchment, text-only units",
  "assets": [
    {"file":"battle-overview.webp","purpose":"battle layout"},
    {"file":"enemy-walk.webp","purpose":"movement storyboard"},
    {"file":"soldier-attacks.webp","purpose":"five soldier recipes"},
    {"file":"hero-attacks-01.webp","purpose":"heroes 1-6"},
    {"file":"hero-attacks-02.webp","purpose":"heroes 7-12"},
    {"file":"control-effects.webp","purpose":"seven combat effects"},
    {"file":"terrain-recovery.webp","purpose":"terrain TTL states"},
    {"file":"recruit-and-evolve.webp","purpose":"recruit, shovel and evolution"}
  ]
}
```

- [ ] **Step 7: Commit the approved visual references**

Run: `git add art/stitch/manifest.json public/art/stitch && git commit -m "art: add Chen Tang battle references"`

Expected: only the manifest and approved exports are committed.

### Task 3: Build the Screenshot-Faithful Single-File Visual Contract

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/prototypes/0808-哪吒陈塘关镜像守城.html`
- Modify: `C:/Users/z3635/.codex/skills/pm-image2proto/references/learning_log.jsonl`

- [ ] **Step 1: Create one self-contained HTML prototype**

Create a 390×844 single-file HTML prototype with inline CSS and JavaScript. It must show two 8×6 mirrored arenas, one curved SVG path per arena, route-excluded formation cells, four initially lit player cells, five recruit results including a shovel, static defenders, and slow text enemies animated with `offset-path`.

Required DOM contract:

```html
<section class="arena arena-ai" data-arena="ai"><svg class="route-layer"></svg><div class="formation-grid"></div></section>
<section class="arena arena-player" data-arena="player"><svg class="route-layer"></svg><div class="formation-grid"></div></section>
<section class="recruit-tray" aria-label="五连征兵"></section>
```

Expected: the prototype can demonstrate route movement, one shovel unlock and one attack cycle without external dependencies.

- [ ] **Step 2: Verify the prototype visually**

Open the file at 390×844 and verify: routes are mirrored, enemies never cross arenas, non-route cells fill the remaining space, and effects do not cover HP bars.

- [ ] **Step 3: Append the learning record**

Append one JSON line recording the screenshot-first layout, text-only unit preference, dual independent routes, random shovel, animated radicals, and recoverable terrain effects.

- [ ] **Step 4: Commit the prototype**

Run: `git add prototypes/0808-哪吒陈塘关镜像守城.html && git commit -m "prototype: define mirrored lane defense visuals"`

Expected: the personal learning log remains outside the project commit.

### Task 4: Define Mirrored Arena Geometry with Tests

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/app/battle-config.mjs`
- Create: `h5游戏/nezha-chen-tang-demo/test/battle-config.test.mjs`

- [ ] **Step 1: Write the failing geometry tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { ARENA_COLS, ARENA_ROWS, createArenaConfig, isRouteCell, pointAtDistance } from "../app/battle-config.mjs";

test("each arena is 8x6 and mirrors one route", () => {
  const player = createArenaConfig("player");
  const ai = createArenaConfig("ai");
  assert.equal(ARENA_COLS, 8);
  assert.equal(ARENA_ROWS, 6);
  assert.equal(player.route.length, ai.route.length);
  player.route.forEach((point, index) => {
    assert.equal(ai.route[index].x, point.x);
    assert.equal(ai.route[index].y, 1 - point.y);
  });
});

test("route cells cannot be formation cells", () => {
  const arena = createArenaConfig("player");
  assert.ok(arena.cells.filter((cell) => !isRouteCell(arena, cell.row, cell.col)).length > 20);
  assert.ok(arena.routeCells.every((key) => !arena.formationCells.includes(key)));
});

test("route interpolation starts at spawn and ends at the gate", () => {
  const arena = createArenaConfig("player");
  assert.deepEqual(pointAtDistance(arena, 0), arena.spawnPoint);
  assert.deepEqual(pointAtDistance(arena, arena.routeLength), arena.gatePoint);
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test test/battle-config.test.mjs`

Expected: FAIL because `app/battle-config.mjs` does not exist.

- [ ] **Step 3: Implement the deterministic mirrored config**

Implement and export these exact values and interfaces:

```js
export const ARENA_COLS = 8;
export const ARENA_ROWS = 6;
export const BASE_ROUTE = Object.freeze([
  { x: 0.03, y: 0.82 }, { x: 0.16, y: 0.82 }, { x: 0.16, y: 0.58 },
  { x: 0.46, y: 0.58 }, { x: 0.46, y: 0.30 }, { x: 0.76, y: 0.30 },
  { x: 0.76, y: 0.72 }, { x: 0.96, y: 0.72 }
]);

export function createArenaConfig(arenaId) {
  const route = arenaId === "ai" ? BASE_ROUTE.map(({x, y}) => ({x, y: 1 - y})) : BASE_ROUTE.map((point) => ({...point}));
  return buildArenaGeometry(arenaId, route);
}
```

`buildArenaGeometry` must calculate cumulative segment distances, route cells, all non-route formation cells, spawn point, gate point and gate cell.

- [ ] **Step 4: Run geometry tests**

Run: `node --test test/battle-config.test.mjs`

Expected: 3 tests pass.

- [ ] **Step 5: Commit geometry**

Run: `git add app/battle-config.mjs test/battle-config.test.mjs && git commit -m "feat: define mirrored defense arenas"`

### Task 5: Replace Recruitment, Shovels and Deployment

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/app/game-engine.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/test/game-engine.test.mjs`

- [ ] **Step 1: Replace obsolete tests with the new recruitment contract**

```js
test("one recruit spends ten buns and fills five slots", () => {
  const state = createInitialState({ seed: 7, disableAi: true });
  const next = recruitBatch(state, { arenaId: "player", forcedItems: ["刀", "哪", "shovel", "弓", "吒"] });
  assert.deepEqual(next.hands.player, [
    { kind: "glyph", value: "刀" }, { kind: "glyph", value: "哪" },
    { kind: "shovel", value: "shovel" }, { kind: "glyph", value: "弓" },
    { kind: "glyph", value: "吒" }
  ]);
  assert.equal(next.resources.player, state.resources.player - 10);
});

test("a shovel unlocks only a locked non-route cell and is consumed", () => {
  let state = createInitialState({ seed: 7, disableAi: true });
  state = recruitBatch(state, { arenaId: "player", forcedItems: ["shovel", "刀", "枪", "弓", "骑"] });
  const locked = state.arenas.player.config.formationCells.find((key) => !state.arenas.player.unlockedCells.includes(key));
  const [row, col] = locked.split(",").map(Number);
  const next = deployRecruitItem(state, { arenaId: "player", slotIndex: 0, row, col });
  assert.ok(next.arenas.player.unlockedCells.includes(locked));
  assert.equal(next.hands.player[0], null);
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `node --test test/game-engine.test.mjs --test-name-pattern="recruit|shovel"`

Expected: FAIL because `recruitBatch` and `deployRecruitItem` do not exist.

- [ ] **Step 3: Implement the new state and five-result draw**

Use this state boundary:

```js
{
  tick: 0,
  phase: "battle",
  winner: null,
  rankDelta: 0,
  wave: 1,
  waveElapsed: 0,
  hands: { player: Array(5).fill(null), ai: Array(5).fill(null) },
  resources: { player: 50, ai: 50 },
  arenas: { player: createArenaState("player", seed), ai: createArenaState("ai", seed ^ 0x9e3779b9) },
  telemetry: { heroEvolved: [], heroUpgraded: [], matchStartedAt: 0 },
  events: []
}
```

Create each arena with this exact initializer before returning the global state:

```js
function createArenaState(arenaId, seed) {
  const config = createArenaConfig(arenaId);
  const shuffled = seededShuffle(config.formationCells, seed);
  const initialCount = 4 + (seed & 1);
  return {
    id: arenaId,
    config,
    gate: { hp: 500, maxHp: 500 },
    unlockedCells: shuffled.slice(0, initialCount),
    guards: [],
    enemies: [],
    zones: [],
    nextGuardId: 1,
    nextEnemyId: 1
  };
}
```

Draw weights must be deterministic per seed: soldier glyph 52%, hero glyph 38%, shovel 10%. The `forcedItems` option is allowed only for deterministic tests.

Add a test that seeds 1 and 2 produce initial unlocked counts within the confirmed range:

```js
for (const seed of [1, 2]) {
  const state = createInitialState({ seed, disableAi: true });
  assert.ok([4, 5].includes(state.arenas.player.unlockedCells.length));
  assert.ok(state.arenas.player.unlockedCells.every((key) => state.arenas.player.config.formationCells.includes(key)));
}
```

- [ ] **Step 4: Implement deployment and evolution telemetry**

`deployRecruitItem` must reject route cells and illegal targets without changing state. On first hero creation, emit both:

```js
{ type: "hero-evolved", arenaId, heroName, level: 1, tick: state.tick }
```

and append `{ arenaId, heroName, tick }` to `telemetry.heroEvolved`. Upgrades append to `heroUpgraded` and do not increase the match hero-count metric.

Implement AI defense with the same commands as the player: when all five AI slots are empty it calls `recruitBatch`; it consumes shovel results on the first seeded locked formation cell; it deploys glyph results to the first unlocked empty cell. It may not unlock cells with resources or bypass typed recruit results.

- [ ] **Step 5: Run all engine tests**

Run: `node --test test/game-engine.test.mjs`

Expected: recruitment, shovel, deployment and evolution tests pass; old one-glyph and paid-shovel tests have been removed.

- [ ] **Step 6: Commit recruitment**

Run: `git add app/game-engine.mjs test/game-engine.test.mjs && git commit -m "feat: add five-result recruitment and shovel drops"`

### Task 6: Implement Independent Enemy Routes and Gate Damage

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/app/game-engine.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/test/game-engine.test.mjs`

- [ ] **Step 1: Write failing route and gate tests**

```js
test("an enemy moves only on its own route and deals 100 gate damage", () => {
  let state = createInitialState({ seed: 11, disableAi: true });
  state = spawnLaneEnemy(state, { arenaId: "player", kind: "兵", routeDistance: state.arenas.player.config.routeLength - 0.01 });
  const next = stepBattle(state, 1000);
  assert.equal(next.arenas.player.gate.hp, 400);
  assert.equal(next.arenas.player.enemies.length, 0);
  assert.equal(next.arenas.ai.gate.hp, 500);
});

test("five leaked basic enemies destroy a full gate", () => {
  let state = createInitialState({ seed: 12, disableAi: true });
  for (let i = 0; i < 5; i += 1) state = spawnLaneEnemy(state, { arenaId: "player", kind: "兵", routeDistance: state.arenas.player.config.routeLength - 0.01 });
  const next = stepBattle(state, 1000);
  assert.equal(next.arenas.player.gate.hp, 0);
  assert.equal(next.phase, "finished");
  assert.equal(next.winner, "ai");
});
```

- [ ] **Step 2: Verify test failure**

Run: `node --test test/game-engine.test.mjs --test-name-pattern="route|gate|leaked"`

Expected: FAIL because lane enemies and 500-HP gates are not implemented.

- [ ] **Step 3: Implement lane enemy state and wave spawning**

Each enemy must use this shape:

```js
{ id, arenaId, kind, hp, maxHp, speed, routeDistance, gateDamage: 100, statusType: null, statusRemaining: 0 }
```

Use this complete first-build archetype table:

```js
export const ENEMY_ARCHETYPES = {
  兵: { hp: 260, speed: 0.075, gateDamage: 100 },
  骑: { hp: 310, speed: 0.105, gateDamage: 100 },
  枪: { hp: 390, speed: 0.070, gateDamage: 100 },
  弓: { hp: 340, speed: 0.080, gateDamage: 100 },
  精: { hp: 620, speed: 0.065, gateDamage: 100 },
  将: { hp: 980, speed: 0.055, gateDamage: 100 }
};
```

`stepArena` advances `routeDistance += effectiveSpeed * elapsedMs / 1000`, emits `move`, and on reaching `routeLength` emits `gate-damage` plus a visual `terrain-impact` event before removing the enemy.

Export `spawnLaneEnemy(state, {arenaId, kind, routeDistance})` as the only lane-enemy construction command. Both arenas receive equal system-generated enemy compositions; these enemies are not units sent by the other defender. Use this exact six-wave schedule for the first verification build:

```js
export const WAVE_SCHEDULE = [
  { count: 5, intervalMs: 2500, kinds: ["兵"] },
  { count: 5, intervalMs: 2300, kinds: ["兵", "骑"] },
  { count: 5, intervalMs: 2100, kinds: ["兵", "骑", "枪"] },
  { count: 5, intervalMs: 1900, kinds: ["骑", "枪", "弓"] },
  { count: 5, intervalMs: 1700, kinds: ["枪", "弓", "精"] },
  { count: 5, intervalMs: 1500, kinds: ["骑", "精", "将"] }
];
```

Wave composition selection is seeded separately per arena but uses the same seed and draw count so both defenders face equivalent sequences.

- [ ] **Step 4: Implement settlement rules**

Immediately lose when an arena gate reaches 0. After wave 6, compare remaining gate HP; equal HP returns `winner: "draw"` and `rankDelta: 0`.

- [ ] **Step 5: Run engine tests and commit**

Run: `node --test test/game-engine.test.mjs`

Expected: all route, gate, settlement and earlier recruitment tests pass.

Run: `git add app/game-engine.mjs test/game-engine.test.mjs && git commit -m "feat: add independent lane waves and gate damage"`

### Task 7: Implement Fixed Guards, Combat Effects and Event Timing

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/app/game-engine.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/test/game-engine.test.mjs`

- [ ] **Step 1: Write failing isolation and fixed-position tests**

```js
test("guards never move and target only enemies in their arena", () => {
  let state = createInitialState({ seed: 19, disableAi: true });
  state = spawnGuard(state, { arenaId: "player", row: 4, col: 2, name: "弓" });
  state = spawnLaneEnemy(state, { arenaId: "player", kind: "兵", routeDistance: 0.35 });
  state = spawnLaneEnemy(state, { arenaId: "ai", kind: "兵", routeDistance: 0.35 });
  const before = state.arenas.player.guards[0];
  const aiHp = state.arenas.ai.enemies[0].hp;
  const next = stepBattle(state, 1500);
  assert.deepEqual({ row: next.arenas.player.guards[0].row, col: next.arenas.player.guards[0].col }, { row: before.row, col: before.col });
  assert.equal(next.arenas.ai.enemies[0].hp, aiHp);
});
```

- [ ] **Step 2: Verify test failure**

Run: `node --test test/game-engine.test.mjs --test-name-pattern="guards never"`

Expected: FAIL until arena-local targeting replaces opposing-side targeting.

- [ ] **Step 3: Implement route-distance target selection**

Export `spawnGuard(state, {arenaId, row, col, name, level})` as the single guard-construction function used by both `deployRecruitItem` and deterministic tests. It must reject route cells, locked cells and occupied cells.

Convert the guard cell center to normalized arena coordinates. A target is in range when Euclidean distance from guard center to `pointAtDistance(config, enemy.routeDistance)` is at most `guard.range / 6`. Sort targets by greatest `routeDistance`, then lowest HP, then stable enemy ID.

- [ ] **Step 4: Convert control and equipment effects to route semantics**

- Knockback subtracts route distance but never below 0.
- Stun freezes speed and attacks for its duration.
- Knockdown freezes movement for 1.4 seconds and emits a ground impact.
- Slow multiplies speed by 0.55 for 2.2 seconds.
- Pierce damages the next enemy farther back on the same route.
- Fire and ice zones use route-distance centers and affect enemies within a fixed route span.

- [ ] **Step 5: Emit deterministic attack events**

Every attack emits this exact shape before applying the hit:

```js
{
  type: "attack", arenaId, tick, attackerId, targetId,
  recipeId, weaponId, windupMs: 140, travelMs: 160, hitMs: 300, recoverMs: 180
}
```

Skills additionally emit `skill` and strong hits emit `{type:"terrain-impact", arenaId, x, y, variant, ttlMs:3500}`.

- [ ] **Step 6: Run all engine tests and commit**

Run: `node --test test/game-engine.test.mjs`

Expected: fixed guards, arena isolation, effects, equipment and event-order tests pass.

Run: `git add app/game-engine.mjs test/game-engine.test.mjs && git commit -m "feat: add fixed defenders and lane combat events"`

### Task 8: Define Complete Text and Weapon Animation Recipes

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/app/animation-recipes.ts`
- Create: `h5游戏/nezha-chen-tang-demo/test/animation-recipes.test.mjs`

- [ ] **Step 1: Write failing recipe coverage tests**

```js
test("all soldiers and heroes have attack recipes", async () => {
  const { SOLDIER_RECIPES, HERO_RECIPES } = await import("../app/animation-recipes.ts");
  assert.deepEqual(Object.keys(SOLDIER_RECIPES), ["刀", "枪", "弓", "骑", "兵"]);
  assert.equal(Object.keys(HERO_RECIPES).length, 12);
  for (const recipe of [...Object.values(SOLDIER_RECIPES), ...Object.values(HERO_RECIPES)]) {
    assert.ok(recipe.parts.length > 0);
    assert.ok(recipe.windupMs > 0 && recipe.hitMs > recipe.windupMs && recipe.recoverMs > 0);
    assert.ok(recipe.fallbackGlyph.length > 0);
  }
});
```

- [ ] **Step 2: Verify test failure**

Run: `node --test test/animation-recipes.test.mjs`

Expected: FAIL because the recipe module does not exist.

- [ ] **Step 3: Implement all recipe entries**

Use this complete recipe inventory:

```ts
function recipe(id: string, parts: string[], fallbackGlyph: string, windupMs: number, hitMs: number, recoverMs: number) {
  return {
    id,
    parts,
    fallbackGlyph,
    windupMs,
    travelMs: hitMs - windupMs,
    hitMs,
    recoverMs,
    trailColor: "#f7d58a",
    impactVariant: "ink-flash",
    terrainVariant: "crack"
  };
}

function heroRecipe(id: string, weapon: string, control: string | null) {
  return {
    ...recipe(id, [weapon], weapon, 220, 520, 260),
    weapon,
    control,
    impactVariant: control ?? "hero-impact",
    terrainVariant: control === "slow" ? "ice-crack" : "crater"
  };
}

export const SOLDIER_RECIPES = {
  刀: recipe("blade-slash", ["主笔"], "刀光", 120, 250, 170),
  枪: recipe("spear-thrust", ["木", "仓"], "枪影", 140, 300, 180),
  弓: recipe("bow-shot", ["弓", "箭"], "箭", 160, 340, 160),
  骑: recipe("mounted-impact", ["马", "奇"], "骑枪", 180, 360, 220),
  兵: recipe("double-cut", ["上笔", "下笔"], "双刃", 110, 280, 180)
} as const;

export const HERO_RECIPES = {
  哪吒: heroRecipe("fire-spear", "火尖枪", "knockback"), 敖丙: heroRecipe("dragon-halberd", "方天戟", "slow"),
  李靖: heroRecipe("pagoda-light", "玲珑塔", "stun"), 太乙: heroRecipe("whisk-fire", "拂尘", "knockdown"),
  申公豹: heroRecipe("flying-sword", "宝剑", "slow"), 杨戬: heroRecipe("trident-break", "三尖刀", "knockdown"),
  敖广: heroRecipe("dragon-orb", "龙珠", "knockback"), 石矶: heroRecipe("taia-bind", "太阿剑", "stun"),
  妲己: heroRecipe("fox-fire", "狐火", "slow"), 姜子牙: heroRecipe("god-whip", "打神鞭", "stun"),
  雷震子: heroRecipe("thunder-staff", "黄金棍", "knockdown"), 殷夫人: heroRecipe("guardian-talisman", "护身符", null)
} as const;
```

Each recipe includes manual parts, fallback glyph, trail color, impact variant, terrain variant, timings and Stitch asset coordinates.

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/animation-recipes.test.mjs`

Expected: recipe coverage passes for 5 soldiers and 12 heroes.

Run: `git add app/animation-recipes.ts test/animation-recipes.test.mjs && git commit -m "feat: define text attack animation recipes"`

### Task 9: Build the Fixed-Step Clock and Canvas Arena Renderer

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/app/components/useBattleClock.ts`
- Create: `h5游戏/nezha-chen-tang-demo/app/components/ArenaCanvas.tsx`
- Modify: `h5游戏/nezha-chen-tang-demo/test/ui-contract.test.mjs`

- [ ] **Step 1: Add failing UI contract assertions**

Assert that `page.tsx` imports `ArenaCanvas` and `useBattleClock`, contains two `data-arena-canvas` instances, and no longer contains `setInterval(() => stepBattle(current, 500))`.

- [ ] **Step 2: Verify test failure**

Run: `node --test test/ui-contract.test.mjs --test-name-pattern="canvas|clock"`

Expected: FAIL against the current 500 ms DOM grid loop.

- [ ] **Step 3: Implement the 30 Hz fixed-step hook**

```ts
const STEP_MS = 1000 / 30;
export function useBattleClock(enabled: boolean, advance: (ms: number) => void) {
  const accumulator = useRef(0);
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const loop = (now: number) => {
      if (previous.current == null) previous.current = now;
      accumulator.current += Math.min(100, now - previous.current);
      previous.current = now;
      while (accumulator.current >= STEP_MS) { advance(STEP_MS); accumulator.current -= STEP_MS; }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); previous.current = null; accumulator.current = 0; };
  }, [advance, enabled]);
}
```

- [ ] **Step 4: Implement one isolated renderer per arena**

`ArenaCanvas` receives `{ arenaId, arena, events, recipes, reducedMotion }`, scales for `devicePixelRatio`, clips to its half-field, draws parchment, route, cells, gate, guards and enemies, and maintains object pools for projectiles, particles, damage labels and terrain decals.

Required render order:

```text
background → route → locked/unlocked cells → terrain decals → guards/enemies → projectiles → hit light → damage text → route arrows and target outlines
```

Route arrows, enemy outlines and HP bars must remain readable above decorative particles.

- [ ] **Step 5: Add the performance degradation policy**

Track a rolling 120-frame mean. Above 16.7 ms for 60 frames, cap to 30 FPS and disable in order: soft shadows, secondary trails, surplus particles, arena shake. Never disable attack pose, hit timing, HP changes, target outline or control label.

- [ ] **Step 6: Run UI contract tests and commit**

Run: `node --test test/ui-contract.test.mjs`

Expected: Canvas and clock contract tests pass.

Run: `git add app/components/useBattleClock.ts app/components/ArenaCanvas.tsx test/ui-contract.test.mjs && git commit -m "feat: render animated mirrored arenas"`

### Task 10: Rebuild the Battle Screen and Interaction Layer

**Files:**
- Modify: `h5游戏/nezha-chen-tang-demo/app/page.tsx`
- Modify: `h5游戏/nezha-chen-tang-demo/app/globals.css`
- Modify: `h5游戏/nezha-chen-tang-demo/test/ui-contract.test.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/tests/rendered-html.test.mjs`

- [ ] **Step 1: Write failing rendered-page assertions**

Require these visible labels and attributes:

```js
for (const text of ["东海来敌", "陈塘关", "500 / 500", "五连征兵", "拖铲解锁", "第 1 / 6 波"]) assert.match(html, new RegExp(text));
assert.equal((html.match(/data-arena-canvas=/g) ?? []).length, 2);
assert.doesNotMatch(html, /交战线|向敌方关隘进军|军饷解锁/);
```

- [ ] **Step 2: Verify test failure**

Run: `node --test tests/rendered-html.test.mjs test/ui-contract.test.mjs`

Expected: FAIL because the current page uses one shared DOM grid and old copy.

- [ ] **Step 3: Replace the battlefield markup**

Render two `ArenaPanel` sections, each with a DOM gate HP header, `ArenaCanvas`, and a transparent interactive formation grid. The player grid accepts drop; the AI grid is read-only. Remove `midline-label`, shared `battle-grid`, moving friendly-unit DOM and direct-cost shovel buttons.

- [ ] **Step 4: Replace hand interaction with typed recruit results**

Render glyph slots and shovel slots differently. Keyboard behavior: select a glyph then choose an open player cell; select a shovel then choose a locked non-route player cell. Pointer drop uses the same `deployRecruitItem` command. Illegal drops return the item without a toast.

- [ ] **Step 5: Apply the screenshot-faithful layout**

Use the Stitch battle overview as the visual source. Keep the existing parchment/ink identity, 390×844 logical viewport and five-slot vertical or compact side tray. Both curved routes must be visibly mirrored, and all non-route cells must remain visible behind effects.

- [ ] **Step 6: Update settlement telemetry**

Calculate:

```ts
const evolvedHeroes = battle.telemetry.heroEvolved.filter((event) => event.arenaId === "player");
const heroCount = evolvedHeroes.length;
const heroKinds = new Set(evolvedHeroes.map((event) => event.heroName)).size;
```

Show real gate HP, hero count, hero kinds, highest hero tier, hero damage and control count. A draw shows no star change.

- [ ] **Step 7: Run tests and commit**

Run: `npm.cmd test`

Expected: engine, UI contract and rendered HTML tests pass.

Run: `git add app/page.tsx app/globals.css test/ui-contract.test.mjs tests/rendered-html.test.mjs && git commit -m "feat: rebuild the mirrored lane battle screen"`

### Task 11: Verify Motion, Impact and Recoverable Terrain Effects

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/app/arena-renderer-model.mjs`
- Create: `h5游戏/nezha-chen-tang-demo/test/arena-renderer.test.mjs`
- Modify: `h5游戏/nezha-chen-tang-demo/app/components/ArenaCanvas.tsx`

- [ ] **Step 1: Add deterministic renderer model tests**

Extract pure event-to-effect helpers and assert:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createArenaConfig } from "../app/battle-config.mjs";
import { createTerrainFx, scheduleAttackFx, updateTerrainFx } from "../app/arena-renderer-model.mjs";

test("every attack schedules windup, hit and recovery", () => {
  const fx = scheduleAttackFx({ type:"attack", arenaId:"player", tick:1, attackerId:"g1", targetId:"e1", recipeId:"blade-slash", windupMs:140, travelMs:160, hitMs:300, recoverMs:180 });
  assert.deepEqual(fx.map((item) => item.phase), ["windup", "travel", "hit", "recover"]);
});

test("terrain damage expires and never changes arena geometry", () => {
  const arena = { id: "player", config: createArenaConfig("player") };
  const geometry = JSON.stringify(arena.config);
  const fx = createTerrainFx({ arenaId:"player", x:0.5, y:0.4, variant:"crack", ttlMs:3500 });
  assert.equal(updateTerrainFx(fx, 3499).alive, true);
  assert.equal(updateTerrainFx(fx, 3501).alive, false);
  assert.equal(JSON.stringify(arena.config), geometry);
});
```

- [ ] **Step 2: Verify failure, implement helpers and rerun**

Run: `node --test test/arena-renderer.test.mjs`

Expected before implementation: FAIL because the model module does not exist.

Implement these exact pure helpers:

```js
export function scheduleAttackFx(event) {
  return [
    { phase: "windup", atMs: 0, event },
    { phase: "travel", atMs: event.windupMs, event },
    { phase: "hit", atMs: event.hitMs, event },
    { phase: "recover", atMs: event.hitMs + event.recoverMs, event }
  ];
}

export function createTerrainFx(event) {
  return { ...event, elapsedMs: 0, alive: true };
}

export function updateTerrainFx(effect, elapsedMs) {
  return { ...effect, elapsedMs, alive: elapsedMs < effect.ttlMs };
}
```

Rerun: `node --test test/arena-renderer.test.mjs`

Expected after implementation: both tests pass.

- [ ] **Step 3: Run a visual mobile check**

At 390×844, verify at least four simultaneous enemies per arena, two guards attacking, one hero skill, one control effect and one terrain decal. Confirm there is no horizontal overflow, route disappearance, HP obstruction or cross-arena effect.

- [ ] **Step 4: Run a sustained frame-budget check**

Run a 60-second automated battle with 8 enemies and 6 active effects per arena. Record mean and p95 frame time; acceptance is mean ≤16.7 ms on the local test machine or correct activation of the documented 30 FPS degradation path while preserving combat information.

- [ ] **Step 5: Commit effect verification**

Run: `git add app/arena-renderer-model.mjs app/components/ArenaCanvas.tsx test/arena-renderer.test.mjs && git commit -m "test: verify impact and terrain recovery effects"`

### Task 12: Build, Run 10 AI Player Profiles and Update Metrics

**Files:**
- Create: `h5游戏/nezha-chen-tang-demo/docs/playtest-v3-p01-p04.md`
- Create: `h5游戏/nezha-chen-tang-demo/docs/playtest-v3-p05-p07.md`
- Create: `h5游戏/nezha-chen-tang-demo/docs/playtest-v3-p08-p10.md`
- Create: `h5游戏/nezha-chen-tang-demo/docs/ai-playtest-report-v3.md`

- [ ] **Step 1: Run the full automated verification**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: all tests pass and the production build completes.

- [ ] **Step 2: Run the same 10 AI player profiles through the real page**

Each profile must complete at least one real browser-operated match without modifying app state. Record first valid deployment time, rules understood, gate HP, result, duration, hero count, hero kinds, highest tier, controls, immediate replay intention, fun score and simulated D1/D7 intention.

- [ ] **Step 3: Calculate the exact hero metric**

Use only `telemetry.heroEvolved` records. Define:

```text
场均英雄数 = 全部有效对局中 player 侧 hero-evolved 事件总数 ÷ 有效结算对局数
英雄种类场均值 = 每局 player 侧不同 heroName 数量之和 ÷ 有效结算对局数
```

Upgrades do not count as additional heroes. Missing telemetry invalidates that match for hero metrics and must be disclosed without imputation.

- [ ] **Step 4: Write the V3 report and compare against V2**

The report must include sample count, match count, win rate, fun mean/median, duration mean/median, daily matches mean/median, exact average heroes, hero evolution rate, immediate replay intention and simulated D1/D7 strong intention. Mark all AI intention data as laboratory simulation rather than real retention.

- [ ] **Step 5: Apply the keep/rework rule**

Keep the version only if all of these are met: no core rule misunderstanding in at least 8/10 profiles; average heroes >0; at least 6/10 profiles reach one hero evolution; fun mean ≥7.0; immediate replay strong intention ≥60%. Otherwise report `NEEDS WORK` and list the failing gates before public promotion.

- [ ] **Step 6: Commit verified reports**

Run: `git add docs/playtest-v3-p01-p04.md docs/playtest-v3-p05-p07.md docs/playtest-v3-p08-p10.md docs/ai-playtest-report-v3.md && git commit -m "docs: report mirrored defense playtest results"`

### Task 13: Publish the Verified Version and Check Both URLs

**Files:**
- Modify only if required: `h5游戏/nezha-chen-tang-demo/.openai/hosting.json`

- [ ] **Step 1: Confirm the Sites project binding**

Verify `.openai/hosting.json` still contains project ID `appgprj_6a762af240dc8191acbd557f0e6640f1` and no account-bound database is introduced; the game remains anonymous and login-free.

- [ ] **Step 2: Save and publish a new public Sites version**

Use the Sites building and hosting skills to package the verified build, save a new project version and deploy it as public to the existing site.

Expected public URL: `https://nezha-chen-tang-pass.chenzw-ai1.chatgpt.site`

- [ ] **Step 3: Restart and verify the local experience**

Start the app on the established port and verify:

```text
http://localhost:43218/
```

Expected: HTTP 200 and the page includes `五连征兵`, two independent arena canvases and 500-HP gates.

- [ ] **Step 4: Verify the deployed HTML and one real battle interaction**

Open the public URL, complete one recruit batch, deploy a glyph, deploy a shovel and observe one enemy hit or die. Capture evidence showing the version is not the old opposing-army build.

- [ ] **Step 5: Commit any binding-only change and tag the handoff**

If `.openai/hosting.json` did not change, do not create an empty commit. Record the deployed version ID, local URL, public URL, test totals and playtest result in the final handoff.

## Final Verification Checklist

- [ ] `npm.cmd test` passes all engine, recipe, renderer, UI and rendered HTML tests.
- [ ] `npm.cmd run build` exits 0.
- [ ] Both arenas have one mirrored route and never share targets or effects.
- [ ] Defenders never move; enemies move continuously and attack only their own gate.
- [ ] One recruit click produces five results; shovel is a random result and unlocks only non-route cells.
- [ ] Gate starts at 500 and five basic leaks destroy it.
- [ ] Every attack shows pose, weapon/radical motion, hit light and recovery.
- [ ] Strong hits create terrain damage that fully disappears within 2.5–4 seconds.
- [ ] Hero-count telemetry is complete and the V3 report lists exact average heroes.
- [ ] Local and public URLs serve the verified version.
