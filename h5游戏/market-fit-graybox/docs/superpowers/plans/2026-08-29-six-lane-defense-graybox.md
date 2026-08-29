# Six-Lane Defense Graybox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, deterministic, mobile-first H5 graybox in which the player protects a central core for 12 waves by moving three automatic guards among six radial lanes.

**Architecture:** Pure TypeScript domain rules run on a fixed 250 ms step and accept injected content plus seed. React only adapts the deterministic state to a responsive SVG battlefield; UI never computes combat results. A separate Node simulator validates schedules and strategy thresholds before the same content is exposed to the app.

**Tech Stack:** Node.js 22, TypeScript 5, React 19, Vite 7, Vitest 3, ESLint 9, Playwright 1.55, SVG/CSS, Web Audio API.

---

## File ownership

| Owner | Exclusive files | Must not edit |
|---|---|---|
| Game systems designer | `simulation/**`, `tools/simulate-balance.ts`, `test/simulation/**`, `docs/reviews/balance-*` | `src/ui/**`, `src/styles/**` |
| Rapid prototype engineer | root configs, `src/domain/**`, `src/app/**`, `test/domain/**` | `src/ui/**`, `e2e/**` |
| UI designer | `src/ui/**`, `src/styles/**`, `src/audio/**`, `docs/design/ui-*` | `src/domain/**`, content values |
| Evidence/QA owner | `e2e/**`, `scripts/capture-evidence.mjs`, `docs/evidence/**` | production rule and visual files |
| Lead producer | integration fixes only after owner handoff, release report | no silent rule additions |

## Task 1: Scaffold the isolated project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `test/no-legacy-imports.test.ts`

- [ ] **Step 1: Write the pollution test first**

Create a Vitest test that recursively scans `src/` text files and rejects `zhaoyun|nezha|adou|changban|hero_formed|battle-v5` and imports containing `nezha-chen-tang-demo`.

- [ ] **Step 2: Run the test and verify the empty scaffold fails to load**

Run: `npm test -- --run test/no-legacy-imports.test.ts`  
Expected: FAIL because the package and test runner are not configured.

- [ ] **Step 3: Add minimal scripts and dependencies**

The scripts must be exactly addressable as `npm test`, `npm run lint`, `npm run build`, `npm run dev`, `npm run simulate`, and `npm run e2e`. Configure Vite for host `127.0.0.1` and strict port `4174` so it does not collide with the old project.

- [ ] **Step 4: Install and run the pollution test**

Run: `npm install` then `npm test -- --run test/no-legacy-imports.test.ts`  
Expected: PASS, one test file and no old-project import.

- [ ] **Step 5: Commit only the scaffold files**

Run: `git add h5游戏/market-fit-graybox/package*.json h5游戏/market-fit-graybox/tsconfig.json h5游戏/market-fit-graybox/vite.config.ts h5游戏/market-fit-graybox/eslint.config.js h5游戏/market-fit-graybox/index.html h5游戏/market-fit-graybox/src/main.tsx h5游戏/market-fit-graybox/test/no-legacy-imports.test.ts && git commit -m "chore: scaffold isolated defense graybox"`

## Task 2: Define the deterministic domain contract

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/content.ts`
- Create: `src/domain/reducer.ts`
- Create: `src/domain/selectors.ts`
- Test: `test/domain/reducer.test.ts`
- Test: `test/domain/selectors.test.ts`

- [ ] **Step 1: Write failing type-level behavior tests**

Tests must cover `createRun(seed)`, `advance(state, 250)`, `selectGuard(id)`, `moveSelectedGuard(lane)`, `togglePause()`, and `restart(seed)`. Assert that an identical seed and action sequence yields byte-identical serialized state.

- [ ] **Step 2: Run the domain tests**

Run: `npm test -- --run test/domain`  
Expected: FAIL with missing domain modules.

- [ ] **Step 3: Implement the minimal domain types**

Use these public discriminants consistently:

```ts
export type LaneId = 0 | 1 | 2 | 3 | 4 | 5;
export type GuardKind = 'heavy' | 'rapid' | 'sweep';
export type EnemyKind = 'swarm' | 'speed' | 'armor';
export type Phase = 'demo' | 'prep' | 'combatA' | 'rescue' | 'combatB' | 'won' | 'lost';
export type GameAction =
  | { type: 'selectGuard'; guardId: GuardKind; seq: number }
  | { type: 'moveSelectedGuard'; lane: LaneId; seq: number }
  | { type: 'advance'; ms: 250 }
  | { type: 'togglePause' }
  | { type: 'restart'; seed: number };
```

State must include the seed, wave, phase, active clock, core integrity, guard lanes, spawned enemies, previews, selected guard, paused flag, processed action sequence, event log and final cause.

- [ ] **Step 4: Implement fixed-step combat and selectors**

The reducer accepts only `advance.ms === 250`; it spawns, moves, attacks and resolves core damage in a stable order. Selectors expose lane threat, next arrival, guard matchup, legal destination lanes, phase label and one primary failure cause. Domain code must not import React, DOM, network, random globals or `Date`.

- [ ] **Step 5: Verify deterministic and illegal-action behavior**

Run: `npm test -- --run test/domain`  
Expected: PASS for same-seed replay, non-window move rejection, occupied destination rejection, duplicate-sequence idempotency, post-result immutability, targeting nearest enemy and earlier-spawn tie break.

- [ ] **Step 6: Commit the domain slice**

Run: `git add h5游戏/market-fit-graybox/src/domain h5游戏/market-fit-graybox/test/domain && git commit -m "feat: add deterministic six-lane combat domain"`

## Task 3: Build and validate the wave simulator

**Files:**
- Create: `simulation/strategies.ts`
- Create: `simulation/search.ts`
- Create: `simulation/report.ts`
- Create: `tools/simulate-balance.ts`
- Test: `test/simulation/simulation.test.ts`
- Create: `docs/reviews/balance-v0.1.md`

- [ ] **Step 1: Write failing simulation gates**

For every candidate seed assert determinism, one valid solution, a second solution differing in at least three moves, R1/R2/R3 coverage, and zero untraceable core damage. Across the seed pool assert idle win rate `< 0.10`, nearest-threat win rate `< 0.40`, best heuristic win rate between `0.70` and `0.90`, and no single failure wave above `0.50`.

- [ ] **Step 2: Run the simulation test**

Run: `npm test -- --run test/simulation`  
Expected: FAIL until schedule templates and strategy runners exist.

- [ ] **Step 3: Implement four named strategies**

Implement `idle`, `nearestThreat`, `matchEnemyType`, and `minExpectedLoss`. Strategies may only read the public selectors and emit legal domain actions; they cannot inspect future hidden state.

- [ ] **Step 4: Implement bounded search and reports**

Search decision-window actions with state hashing and a bounded beam. Store two passing sequences per seed and calculate move-distance, win rate, failure-wave distribution, integrity distribution and R1/R2/R3 deltas. The CLI exits non-zero when any gate fails.

- [ ] **Step 5: Tune one content variable per run**

Record each change in `docs/reviews/balance-v0.1.md` as `baseline → one changed value → metrics → keep/revert`. Do not change enemy health, speed, count and core integrity in the same iteration.

- [ ] **Step 6: Run the complete simulation**

Run: `npm run simulate` then `npm test -- --run test/simulation`  
Expected: both exit 0 and the report contains seed count, two solutions per seed, four strategy results and all gate values.

- [ ] **Step 7: Commit only simulation-owned files**

Run: `git add h5游戏/market-fit-graybox/simulation h5游戏/market-fit-graybox/tools/simulate-balance.ts h5游戏/market-fit-graybox/test/simulation h5游戏/market-fit-graybox/docs/reviews/balance-v0.1.md && git commit -m "test: validate defense schedules and strategy depth"`

## Task 4: Connect the playable session adapter

**Files:**
- Create: `src/app/useGameSession.ts`
- Create: `src/app/localTelemetry.ts`
- Create: `src/app/App.tsx`
- Test: `test/app/useGameSession.test.tsx`
- Test: `test/app/localTelemetry.test.ts`

- [ ] **Step 1: Write failing session tests**

Use fake timers to verify 250 ms stepping, page visibility pause, manual pause, restart with a new run ID, and teardown without duplicate animation loops.

- [ ] **Step 2: Run the app tests**

Run: `npm test -- --run test/app`  
Expected: FAIL with missing adapter modules.

- [ ] **Step 3: Implement the adapter**

`useGameSession` owns the animation loop and dispatches only domain actions. Clamp each rendered frame to at most four fixed steps. `localTelemetry` writes a versioned anonymous run log to localStorage and exports JSON; a storage exception is swallowed and surfaced only as a debug status.

- [ ] **Step 4: Verify adapter behavior**

Run: `npm test -- --run test/app`  
Expected: PASS, including background pause and storage failure.

- [ ] **Step 5: Commit app-owned files**

Run: `git add h5游戏/market-fit-graybox/src/app h5游戏/market-fit-graybox/test/app && git commit -m "feat: connect deterministic game session"`

## Task 5: Implement the mobile single-screen battlefield

**Files:**
- Create: `src/ui/GameScreen.tsx`
- Create: `src/ui/RadialBattlefield.tsx`
- Create: `src/ui/GuardToken.tsx`
- Create: `src/ui/EnemyToken.tsx`
- Create: `src/ui/PhaseControls.tsx`
- Create: `src/ui/ResultPanel.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/game.css`
- Create: `src/audio/feedback.ts`
- Create: `docs/design/ui-graybox-v0.1.md`
- Test: `test/ui/GameScreen.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Assert visible central integrity, six lanes, three guards, enemy type plus arrival cue, selected-guard state, legal empty destinations, current window, wave counter, pause, mute, result cause and restart. Verify controls are keyboard-operable and have accessible labels.

- [ ] **Step 2: Run UI tests**

Run: `npm test -- --run test/ui`  
Expected: FAIL with missing components.

- [ ] **Step 3: Implement the responsive SVG battlefield**

Use one `viewBox="0 0 390 640"`; place the core at `(195, 300)` and lane endpoints at 60-degree increments. Render lanes below units, threats next, guards above, then selection and danger overlays. Use shape plus two-character labels so color is never the only signal.

- [ ] **Step 4: Implement interaction and feedback**

During prep/rescue, tapping a guard highlights it and empty positions; tapping an empty position dispatches one move. Add 140–220 ms guard travel, hit recoil, enemy flash, defeat shrink, core impact shake and a restrained danger pulse. No animation may cover countdown or threat previews. Minimum interactive size is 44×44 CSS pixels.

- [ ] **Step 5: Add resilient sound cues**

Generate short move, hit, defeat, warning and core-impact tones through Web Audio only after user interaction. Add one persistent mute button; unsupported or rejected audio must not block play.

- [ ] **Step 6: Document visual decisions and verify UI**

The UI note must list information hierarchy, color/shape mappings, motion durations, three target viewports and prohibited formal-art additions. Run: `npm test -- --run test/ui`  
Expected: PASS.

- [ ] **Step 7: Commit UI-owned files**

Run: `git add h5游戏/market-fit-graybox/src/ui h5游戏/market-fit-graybox/src/styles h5游戏/market-fit-graybox/src/audio h5游戏/market-fit-graybox/docs/design/ui-graybox-v0.1.md h5游戏/market-fit-graybox/test/ui && git commit -m "feat: add mobile radial battlefield UI"`

## Task 6: Integrate and enforce product boundaries

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/game.css`
- Create: `test/integration/full-run.test.ts`

- [ ] **Step 1: Write a failing full-run test**

Replay one known passing sequence and one known losing sequence from the simulation report. Assert both reach a terminal state, winning integrity stays above zero, loss has exactly one primary cause, and restart returns to wave 1 with a new seed.

- [ ] **Step 2: Wire App to GameScreen without rule duplication**

The app passes selector output and action callbacks only. Search `src/ui` for damage, health mutation, target selection or win calculations; any such logic is a failure and must move to domain selectors/reducer.

- [ ] **Step 3: Run all static gates**

Run: `npm test`, `npm run lint`, `npm run build`  
Expected: all commands exit 0, no old identifier/import violation, and Vite produces `dist/`.

- [ ] **Step 4: Commit integration changes**

Run: `git add h5游戏/market-fit-graybox/src h5游戏/market-fit-graybox/test/integration && git commit -m "feat: integrate playable defense graybox"`

## Task 7: Create real-browser acceptance evidence

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/first-run.spec.ts`
- Create: `scripts/capture-evidence.mjs`
- Create: `docs/evidence/v0.1/acceptance.md`
- Create: `docs/evidence/v0.1/screenshots/*`

- [ ] **Step 1: Write the E2E journey**

The test opens a fresh session, observes the demo wave, performs one prep move and one rescue move, pauses/resumes, reaches a terminal result using the validated sequence, restarts, and confirms wave 1. Execute at 360×800, 390×844 and 430×932.

- [ ] **Step 2: Run E2E before fixes**

Run: `npm run e2e`  
Expected: any missing selector, overflow or journey defect fails with screenshot/video evidence.

- [ ] **Step 3: Fix only acceptance blockers in owner files**

P0/P1 includes inability to start/end, unreadable goal or threat, inaccessible move target, scroll-dependent core action, broken pause, lost state, missing failure cause or evidence capture. Route each fix to its file owner; QA does not rewrite production modules.

- [ ] **Step 4: Re-run the full release gate**

Run: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`  
Expected: all exit 0. Save the three viewport screenshots, browser/version, source hash, build hash and test outputs to `docs/evidence/v0.1/acceptance.md`.

- [ ] **Step 5: Commit evidence-owned files**

Run: `git add h5游戏/market-fit-graybox/playwright.config.ts h5游戏/market-fit-graybox/e2e h5游戏/market-fit-graybox/scripts h5游戏/market-fit-graybox/docs/evidence/v0.1 && git commit -m "test: add graybox browser acceptance evidence"`

## Task 8: Deliver the internal experience build

**Files:**
- Create: `docs/releases/v0.1-internal.md`

- [ ] **Step 1: Write the release note**

State version, local URL, controls, validated seeds, passed commands, known issues and the exact notice: “内部可玩灰盒；尚未完成本产品12名真实目标玩家验证，不代表方向已成立。”

- [ ] **Step 2: Start a persistent local preview**

Run: `npm run dev -- --host 127.0.0.1 --port 4174`  
Expected: HTTP 200 at `http://127.0.0.1:4174/` and a complete playable loop.

- [ ] **Step 3: Open the URL and hand it to the user**

Provide the address only after the lead producer confirms the release gate and independently plays one complete win and one complete loss path.

## Plan self-review

- Spec coverage: target player, single verb, waves, units, targeting, reversal puzzles, deterministic seeds, UI feedback, pause, audio degradation, result attribution and testing all map to tasks.
- Placeholder scan: no TBD/TODO or deferred implementation language remains.
- Type consistency: lane, guard, enemy, phase and action names are defined once and reused throughout.
- Scope: one independent graybox only; remote data collection and external player recruitment are intentionally after the user's internal experience.
