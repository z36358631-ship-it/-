# Localized Merge Defense Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the fourth AI H5 prototype as a mobile-first, playable random-recruit merge defense duel that closely preserves the verified interaction structure and pacing of 《赵云与阿斗》 while replacing its IP with familiar Indian and Southeast Asian folk-story packages.

**Architecture:** Keep the prototype as one dependency-free HTML file with CSS, DOM and Canvas. A single finite-state game model owns recruit cost, five bench slots, field pads, automatic combat, three-heart duel state, name fragments, rival simulation and reward paths; story packages only replace presentation data. The evaluation lobby and documents consume the prototype name and positioning but do not duplicate its game state.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Canvas 2D, localStorage, Playwright verification.

---

### Task 1: Replace the desktop concept with the mobile duel shell

**Files:**
- Modify: `demos/AI游戏赛道评测/04-lotus-guardian.html`

- [x] **Step 1: Define the 390×844 visual contract**

Use a portrait phone frame with this fixed hierarchy: 48px system/header area, 74px versus status, flexible battlefield, 38px summon-fragment bar, 112px five-slot bench, and 78px recruit/action dock. Keep every primary action inside the first viewport and provide a responsive desktop surround only outside the phone.

- [x] **Step 2: Implement three story packages**

Define `timun`, `vikram`, and `thach` data records with local display names, protector/ward relationship, recruit names, two name fragments, skill copy and item motifs. Default to `timun`; switching packages resets the run and changes presentation only.

- [x] **Step 3: Verify the static layout**

Run:

```powershell
node tools/verify-ai-h5-game-demos.mjs
```

Expected: `04-lotus-guardian.html` loads without console or page errors and all required prototype files pass structural checks.

### Task 2: Implement the verified recruit, merge and deployment loop

**Files:**
- Modify: `demos/AI游戏赛道评测/04-lotus-guardian.html`

- [x] **Step 1: Implement random recruitment**

Start with 100 food and a 10-food cost. Each draw consumes the displayed cost and raises the next cost by 2. Draw from a seeded sequence whose opening pair matches, place units in one of exactly five bench slots and block drawing when no slot is free.

- [x] **Step 2: Implement tap-to-merge**

Selecting a bench unit highlights every same-type, same-tier merge target. Tapping a matching target consumes the pair and creates one next-tier unit; tapping a field pad deploys the selected unit. A deployed unit can be returned to a free bench slot by tapping it.

- [x] **Step 3: Enforce inner/outer field roles**

Expose three outer melee pads and three inner ranged pads. Invalid placement gives an inline explanation and leaves the selected unit intact.

- [x] **Step 4: Verify the opening tutorial**

Automate two recruits, merge the guaranteed pair and deploy it. Expected: the bench always renders five slots, food decreases, recruit cost increases, the merged unit is tier 2 and the field accepts it only on a valid pad.

### Task 3: Implement automatic combat, rival pressure and summon fragments

**Files:**
- Modify: `demos/AI游戏赛道评测/04-lotus-guardian.html`

- [x] **Step 1: Implement the battle update loop**

Spawn enemies on one fixed loop around the protected center, update their progress by delta time, let deployed units acquire enemies in range and fire automatically, and remove defeated enemies. Enemies reaching the gate remove one player heart.

- [x] **Step 2: Implement the rival duel**

Render the rival’s three hearts and real kill/field counts above the battlefield. Send the same spawned enemies to an independent rival line, let its simulated defenders acquire targets and derive heart loss only from actual leaks; the first side to lose all three hearts loses. Finish a normal first run in roughly 75 seconds, with a 2× speed toggle for repeat verification.

- [x] **Step 3: Implement two-part name summoning**

Award one story-specific name fragment at battle milestones. When both are collected, enable the summon button; summoning creates a powerful automatic hero with a timed burst skill and provides the run’s main visual payoff.

- [x] **Step 4: Verify win and loss states**

Expected: player and rival hearts update independently, fragments persist outside the five bench slots, hero summon requires both fragments, and result overlays offer a free retry without forcing an ad.

### Task 4: Preserve fair ad monetization and active-token parity

**Files:**
- Modify: `demos/AI游戏赛道评测/04-lotus-guardian.html`

- [x] **Step 1: Implement item acquisition**

Offer one equipment, one skill prop and one common prop. Every item exposes the same two acquisition methods: spend earned activity tokens or simulate a rewarded ad. Both methods grant identical item state and combat effect.

- [x] **Step 2: Preserve a no-ad first clear**

Seed the opening run and base combat values so the user can finish without acquiring an item. Rejecting or closing the ad simulation returns to the game without progress loss.

- [x] **Step 3: Emit evaluation events**

Emit `first_input`, `ai_change_shown`, `ad_choice` and `core_payoff` to the existing `ai-h5-playtest-events-v1` localStorage event list so the evaluation lobby can continue tracking completion.

### Task 5: Update the evaluation lobby and product documents

**Files:**
- Modify: `demos/AI游戏赛道评测/index.html`
- Modify: `docs/superpowers/specs/2026-07-27-ai-h5-four-game-playtest-design.md`
- Modify: `docs/superpowers/specs/2026-07-27-ai-h5-four-game-playtest-report.md`
- Modify: `docs/superpowers/plans/2026-07-27-ai-h5-four-game-playtest.md`

- [x] **Step 1: Replace the fourth-card positioning**

Rename the fourth concept to `Folktale Frontline` / `民间英雄合并塔防`, describe its five-slot random recruit, merge, three-heart duel and localized story packages, and remove the obsolete “generic lotus fortress” positioning.

- [x] **Step 2: Update the report**

Record that the rebuilt version resolves the earlier desktop density and localization gaps. Keep the earlier Top 2 decision explicitly marked as the result of the first prototype round, and designate the rebuilt fourth game for a new rematch rather than silently changing historic scores.

- [x] **Step 3: Update the original implementation plan**

Describe the rebuilt fourth file as a portrait mobile random-recruit merge duel with Timun Mas, Vikram & Betaal and Thạch Sanh presentation packages.

### Task 6: Run multi-pass interaction and visual verification

**Files:**
- Modify: `tools/verify-ai-h5-game-demos.mjs` only if the existing assertions cannot express the rebuilt interaction contract.
- Create: `test-results/ai-h5-game-demos/04-folktale-frontline-mobile.png`

- [x] **Step 1: Run structural verification**

Run:

```powershell
node tools/verify-ai-h5-game-demos.mjs
```

Expected: all four demos and the lobby pass.

- [x] **Step 2: Run the 390×844 playthrough**

Use Playwright to open the fourth demo at 390×844, select a story, draw the opening pair, merge it, deploy it, start battle, collect both fragments, summon the hero and exercise both item-acquisition methods.

Expected: no primary control requires page scrolling, no text overlaps, the five-slot bench remains visible, and console/page errors are empty.

- [x] **Step 3: Perform three self-review passes**

Pass 1 fixes gameplay blockers and state errors. Pass 2 fixes portrait hierarchy, touch target size and readability. Pass 3 compares the result against the verified reference loop and removes extra systems that weaken the recruit–merge–deploy–defend rhythm.

- [x] **Step 4: Commit only scoped files**

Stage the rebuilt fourth prototype, lobby, related plan/spec/report, verification updates and final screenshot. Do not stage or revert any unrelated dirty-worktree files.
