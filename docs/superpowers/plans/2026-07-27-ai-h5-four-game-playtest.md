# AI H5 Four-Game Playtest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four independent playable H5 game demos, a comparison hub, and an evidence-based test report that selects the strongest two concepts.

**Architecture:** Each game is a self-contained HTML file with inline CSS and JavaScript so it can be opened or shared independently. A separate hub launches each game in a new tab, receives normalized `postMessage` events through `window.opener`, and stores completion state in `localStorage`; Playwright verification opens every file at desktop and mobile sizes.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, CSS, browser `postMessage`, `localStorage`, Playwright Core.

---

## File map

- `demos/AI游戏赛道评测/index.html`: comparison hub, new-tab launch controls, and Top 2 result view.
- `demos/AI游戏赛道评测/01-ghost-grid.html`: adaptive maze chase.
- `demos/AI游戏赛道评测/02-trap-lab.html`: adaptive Obby runner.
- `demos/AI游戏赛道评测/03-bio-forge.html`: fusion and auto-battle loop.
- `demos/AI游戏赛道评测/04-lotus-guardian.html`: random recruit/merge defense, name-fragment summon, scripted rival, and token/ad item choice.
- `tools/verify-ai-h5-game-demos.mjs`: automated interaction, responsive checks, event checks, console error collection, and screenshots.
- `docs/superpowers/specs/2026-07-27-ai-h5-four-game-playtest-report.md`: evidence, scores, ranking, and Top 2 conclusion.

### Task 1: Define the shared page contract

**Files:**
- Create: `demos/AI游戏赛道评测/index.html`

- [ ] **Step 1: Add the normalized event contract to the hub**

```js
const requiredEvents = [
  'game_start', 'first_input', 'ai_observation_locked',
  'ai_change_shown', 'core_payoff', 'run_end'
];

window.addEventListener('message', (event) => {
  const payload = event.data;
  if (!payload || payload.source !== 'ai-h5-demo') return;
  saveEvent(payload.gameId, payload);
});
```

- [ ] **Step 2: Add four launch cards and new-tab launch controls**

Each launch card must use a relative source, for example:

```html
<button data-game="ghost-grid" data-src="01-ghost-grid.html">Play demo</button>
```

- [ ] **Step 3: Add completion status**

Mark a game complete only when its stored event list contains `first_input`, `ai_change_shown`, and `core_payoff`.

- [ ] **Step 4: Open the hub directly**

Run: `Start-Process "demos/AI游戏赛道评测/index.html"`

Expected: four cards render, each launch button opens the correct game, and no network request is required.

### Task 2: Implement GhostGrid

**Files:**
- Create: `demos/AI游戏赛道评测/01-ghost-grid.html`

- [ ] **Step 1: Render the maze and controls**

Use a fixed grid, two keys, one exit, one hunter, WASD/arrow input, and a four-button touch pad. Every touch target must be at least 44 CSS pixels.

- [ ] **Step 2: Add step-based movement and checkpoints**

Keep the previous eight valid player positions:

```js
history.push({ x: player.x, y: player.y });
if (history.length > 8) history.shift();
```

- [ ] **Step 3: Add the adaptive hunter**

Count left/right turns, reversals, and straight moves. After at least twelve valid moves, classify the player and show the chosen response before applying it.

- [ ] **Step 4: Add caught, rewind, and continue states**

The simulated ad pauses input for three seconds and restores the earliest position in the eight-step history. Declining restores the last checkpoint.

- [ ] **Step 5: Verify the loop**

Expected: player can collect both keys and reach the exit without watching an ad; `ai_change_shown` occurs before the run ends.

### Task 3: Implement TrapLab

**Files:**
- Create: `demos/AI游戏赛道评测/02-trap-lab.html`

- [ ] **Step 1: Add the runner physics**

Use a fixed timestep, horizontal auto-run, gravity, short/long jump control, checkpoints, and one-screen camera follow.

- [ ] **Step 2: Add six validated obstacle modules**

Implement pendulum, crumble tile, spring, moving platform, roller, and low ceiling as predefined modules. Do not generate arbitrary collision geometry.

- [ ] **Step 3: Add the adaptive director**

Classify early/late jumps and failures as cautious, aggressive, or unstable, announce the classification, then select one safe response sequence.

- [ ] **Step 4: Add the rewarded retake**

On a fall after 30 seconds, offer a three-second simulated ad that restores the current checkpoint. Declining returns to the same checkpoint without the bonus shield.

- [ ] **Step 5: Verify desktop and touch controls**

Expected: Space, pointer, and touch all jump; the player can finish a run; a failure never leaves the game frozen.

### Task 4: Implement BioForge

**Files:**
- Create: `demos/AI游戏赛道评测/03-bio-forge.html`

- [ ] **Step 1: Add four selectable genes**

Each gene defines color, silhouette part, primary stat, behavior, and one inherited ability.

- [ ] **Step 2: Generate six explainable combinations**

The result card must name both inherited sources and render a distinct silhouette without an external image.

- [ ] **Step 3: Add the first battle**

Auto-attack on a fixed interval and expose one player-controlled overload button. Record damage taken, damage type, and overload timing.

- [ ] **Step 4: Add adaptive mutation choices**

Use battle telemetry to offer two relevant mutations. The rewarded refresh returns three different side-grade choices and does not create an exclusive rarity.

- [ ] **Step 5: Add the Boss payoff**

Apply the selected mutation, run a shorter Boss fight, unlock a collection silhouette, and emit `core_payoff`.

### Task 5: Implement Coreguard Duel

**Files:**
- Create: `demos/AI游戏赛道评测/04-lotus-guardian.html`

- [ ] **Step 1: Add the merge-defense field**

Render a fixed enemy route, six defense pads, five reserve slots, a three-heart core, enemy waves, projectiles, and a scripted rival survival meter.

- [ ] **Step 2: Add random recruit and merging**

Recruit into the reserve slots: melee, ranged, slow, or one of two fictional name fragments. Drag units onto pads and merge matching type/level units. Combining the two name fragments summons a higher-tier guardian.

- [ ] **Step 3: Add the AI counter wave**

Read the first-wave tower mix, select shields, runners, or splitters, and display the choice at least eight seconds before the second wave.

- [ ] **Step 4: Add tokens and equivalent reward choices**

Award two activity tokens after wave one. Equipment, skill item, and consumable each cost two tokens and must also expose an equivalent simulated-ad button. Enforce one reward slot per run.

- [ ] **Step 5: Verify fairness**

Expected: refusing both tokens and ad still leaves a winning recruit/merge path; watching an ad does not alter AI difficulty; repeated ad completion cannot stack rewards; the rival is scripted and requires no network connection.

### Task 6: Add automated verification

**Files:**
- Create: `tools/verify-ai-h5-game-demos.mjs`

- [ ] **Step 1: Start a static server**

Use a child process to serve the repository root on an available localhost port and stop it in `finally`.

- [ ] **Step 2: Check every page at 1440×900 and 390×844**

For each page, assert:

```js
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth
);
if (overflow) throw new Error(`${name}: horizontal overflow`);
```

- [ ] **Step 3: Exercise the primary controls**

Send keyboard, pointer, or touch input appropriate to each game, then assert the page remains interactive and no uncaught console error occurred.

- [ ] **Step 4: Capture evidence**

Save desktop and mobile screenshots to `test-results/ai-h5-game-demos/`.

- [ ] **Step 5: Run verification**

Run: `node tools/verify-ai-h5-game-demos.mjs`

Expected: all five pages pass responsive, interaction, and console checks; screenshots exist for every game.

### Task 7: Complete hands-on comparison

**Files:**
- Create: `docs/superpowers/specs/2026-07-27-ai-h5-four-game-playtest-report.md`

- [ ] **Step 1: Perform the three required passes**

Run desktop cold start, mobile cold start, and AI/ad targeted retest for every game.

- [ ] **Step 2: Record evidence and severity**

Separate observable evidence, interpretation, subjective judgment, confidence, and P0–P3 severity.

- [ ] **Step 3: Score the eight dimensions**

Use the weights in the design spec and normalize each 1–5 rating to its weighted score.

- [ ] **Step 4: Select Top 2**

Reject any game that fails desktop/mobile completion, has a blocking P1, lacks two repeatable AI behavior examples, or requires an ad to finish.

- [ ] **Step 5: Optimize the winners**

Apply only fixes that directly improve first-run understanding, control response, AI explanation, ad recovery, or mobile layout, then rerun the verification script.

### Task 8: Final self-review

**Files:**
- Review: `demos/AI游戏赛道评测/*.html`
- Review: `docs/superpowers/specs/2026-07-27-ai-h5-four-game-playtest-report.md`

- [ ] **Step 1: Scan for placeholders**

Run: `rg -n "TBD|TODO|FIXME|待补|稍后" "demos/AI游戏赛道评测" "docs/superpowers/specs/2026-07-27-ai-h5-four-game-playtest-report.md"`

Expected: no matches.

- [ ] **Step 2: Verify local-only behavior**

Run: `rg -n "https?://|fetch\\(|XMLHttpRequest|WebSocket" "demos/AI游戏赛道评测"`

Expected: no runtime network dependency.

- [ ] **Step 3: Confirm only scoped files were added**

Run: `git status --short -- "demos/AI游戏赛道评测" "tools/verify-ai-h5-game-demos.mjs" "docs/superpowers/specs/2026-07-27-ai-h5-*"`

Expected: only the design, plan, demos, verifier, screenshots if tracked, and report appear.
