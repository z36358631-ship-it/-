# 《倒着开大》H5 Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, offline, single-file landscape H5 game in which reordering six weapon modules changes a deterministic auto-battle outcome.

**Architecture:** The deliverable is one self-contained HTML file with three isolated inline units: a pure deterministic combat engine, a finite-state game controller, and a DOM/Canvas presentation layer. A Node static verifier checks the bundle and embedded scripts; a Playwright verifier drives the tutorial and a full seeded run, checks mobile layouts, captures evidence, and exports the read-only battle log.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Canvas 2D, Web Audio, Node.js, `vm`, `playwright-core`, local Chrome, generated WebP concept art embedded as a data URI.

---

## File Map

- Create `demos/微信H5精品游戏/倒着开大-demo.html`: final offline game, all CSS/JS/art embedded.
- Create `tools/verify-backwards-ultimate-demo.mjs`: static syntax, contract, deterministic engine, order-difference and browser-flow verifier.
- Create `tools/capture-backwards-ultimate-demo.mjs`: deterministic desktop/mobile evidence capture.
- Create `test-results/backwards-ultimate-h5/`: generated screenshots, logs and verification JSON.
- Create `docs/superpowers/reports/2026-07-31-backwards-ultimate-ai-playtest.md`: five-role playtest evidence and retain/rework decision.

### Task 1: Establish the failing delivery contract

**Files:**
- Create: `tools/verify-backwards-ultimate-demo.mjs`
- Test: `tools/verify-backwards-ultimate-demo.mjs`

- [ ] **Step 1: Write the failing static contract**

Create a verifier that resolves `demos/微信H5精品游戏/倒着开大-demo.html`, asserts that it exists, then requires these exact contracts:

```js
const requiredTokens = [
  '倒着开大',
  'data-game-root',
  'data-slot-id="0"',
  'data-slot-id="5"',
  'data-action="lock"',
  'data-action="restart-same-seed"',
  'window.__BACKWARDS_ULTIMATE__',
  'function resolveModules',
  'function mulberry32',
  'data:image/webp;base64,'
];
```

Extract every inline `<script>` block and compile each with `new vm.Script(code)`. Reject common unfinished-work markers (construct the two all-caps markers from split string fragments so the plan itself stays clean), `Lorem ipsum`, external `http://`, external `https://`, `<iframe` or `cdn`.

- [ ] **Step 2: Run the contract and confirm the expected failure**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs static
```

Expected: non-zero exit with `Demo file missing`.

- [ ] **Step 3: Create the minimal single-file shell**

Create the HTML with the required title, `data-game-root`, the six indexed slot buttons, lock/restart buttons, a placeholder-free inline script, and no external references. Use the design tokens from the spec.

- [ ] **Step 4: Re-run the static verifier**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs static
```

Expected: `PASS static bundle`.

### Task 2: Implement and verify the deterministic combat engine

**Files:**
- Modify: `demos/微信H5精品游戏/倒着开大-demo.html`
- Modify: `tools/verify-backwards-ultimate-demo.mjs`

- [ ] **Step 1: Add failing engine checks**

The browser contract must expose a frozen read-only object:

```js
window.__BACKWARDS_ULTIMATE__ = Object.freeze({
  snapshot,
  simulate,
  restartWithSeed,
  setTimeScale
});
```

Verify these two exact simulations:

```js
const good = simulate(['battery', 'amp', 'cannon'], { energy: 0 });
const bad = simulate(['battery', 'cannon', 'amp'], { energy: 0 });
assert(good.damage >= Math.floor(bad.damage * 1.3), 'Order delta below 30%');
assert(JSON.stringify(simulate(order, state)) === JSON.stringify(simulate(order, state)));
```

- [ ] **Step 2: Run and confirm the engine checks fail**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs engine
```

Expected: non-zero exit because `simulate` is not available.

- [ ] **Step 3: Implement module resolution**

Implement immutable resolution for:

```js
const MODULES = {
  battery: { energy: 3 },
  amp: { energyCost: 1, multiplier: 1.8 },
  cannon: { maxEnergyCost: 5, baseDamage: 6, damagePerEnergy: 7 },
  shield: { maxEnergyCost: 3, shieldPerEnergy: 8, fallbackShield: 4 },
  repair: { heal: 10, shieldBonusHeal: 6 },
  jammer: { damageReduction: 0.45 }
};
```

`resolveModules(order, input)` returns a new state plus ordered log entries. It must process each slot once, clamp energy to 9, shield to 50, health to 160, consume amp only on the next damage event, and never call `Math.random`.

- [ ] **Step 4: Implement seeded draft and AI intent generation**

Implement `mulberry32(seed)`, three distinct draft choices, fixed round-one `shield`, fixed round-two `heavy`, and legal seeded intents for rounds three to eight with no three identical intents in a row.

- [ ] **Step 5: Run engine verification**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs engine
```

Expected: `PASS deterministic engine` and `PASS order changes outcome`.

### Task 3: Build the complete 100–120 second game loop

**Files:**
- Modify: `demos/微信H5精品游戏/倒着开大-demo.html`
- Modify: `tools/verify-backwards-ultimate-demo.mjs`

- [ ] **Step 1: Add failing state-machine checks**

Drive the public UI and assert:

```js
assert(snapshot().phase === 'planning');
clickSlot(1);
clickSlot(2);
assert(snapshot().swapsUsed === 1);
clickLock();
await waitForPhase('draft');
assert(snapshot().round === 1);
selectDraft(0);
replaceSlot(5);
await waitForPhase('planning');
```

Also assert that a double click on lock creates one, not two, `round_end` log entries.

- [ ] **Step 2: Implement the finite-state controller**

Use only these phases:

```js
const PHASES = Object.freeze({
  planning: 'planning',
  resolving: 'resolving',
  enemy: 'enemy',
  draft: 'draft',
  finished: 'finished'
});
```

The controller owns the seven-second planning timer, one swap per round, one undo, atomic lock, six sequential module triggers, one AI action, clamped state settlement, draft replacement and eight-round finish.

- [ ] **Step 3: Implement tutorial and replay**

First-run tutorial highlights slots 2 and 3, explains the late amplifier in one sentence, and completes only after that swap. Add same-seed restart, new-seed replay and local best record. Do not block subsequent runs with tutorial overlays.

- [ ] **Step 4: Run state-machine verification**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs browser
```

Expected: `PASS tutorial flow`, `PASS atomic lock`, `PASS full eight-round run`.

### Task 4: Produce and embed original high-fidelity visual art

**Files:**
- Create temporarily: `.tmp/backwards-ultimate/hangar-keyart.png`
- Create temporarily: `.tmp/backwards-ultimate/hangar-keyart.webp`
- Modify: `demos/微信H5精品游戏/倒着开大-demo.html`

- [ ] **Step 1: Generate one wide game-scene asset**

Use the built-in image generation path with this production prompt:

```text
Use case: stylized-concept
Asset type: wide landscape background and character key art for an offline H5 game
Primary request: an original premium sci-fi mech duel inside a colossal orbital maintenance hangar
Scene/backdrop: blue-cyan player mech on the left, red-orange AI mech on the right, deep central firing lane, suspended machinery, volumetric light, subtle floor reflections
Style/medium: high-end 3D game key art, sharp hard-surface models, readable silhouettes, polished mobile-game quality
Composition/framing: very wide 2.17:1 landscape, both full mechs visible, clear negative space across the lower center for a six-slot HUD, no cropped heads or weapons
Lighting/mood: dramatic blue-versus-red rim light, tense but readable
Constraints: original designs, no logos, no UI, no text, no watermark, no copyrighted characters
```

- [ ] **Step 2: Convert and embed**

Convert the selected image to WebP at a width appropriate for the `874×402` canvas, target under 500 KB, base64 encode it, and replace the CSS custom property `--hangar-art` with a `data:image/webp;base64,...` URI. The final HTML must not reference the temporary file.

- [ ] **Step 3: Add presentation and causal feedback**

Implement the six-slot semi-ring, clockwise trail, active-slot scale, energy particles, amp-to-cannon gold link, muzzle flash, laser, impact burst, shield break, damage numbers, critical camera shake and reduced-motion fallback. Use Canvas for transient combat effects and DOM for readable controls.

- [ ] **Step 4: Add local Web Audio**

Create oscillator-based cues for slot tick, charge, amp, cannon, shield break, hit, win and loss. Initialize only after a user gesture; implement mute and vibration toggles.

### Task 5: Verify responsive UI and capture evidence

**Files:**
- Modify: `tools/verify-backwards-ultimate-demo.mjs`
- Create: `tools/capture-backwards-ultimate-demo.mjs`
- Create: `test-results/backwards-ultimate-h5/desktop-planning.png`
- Create: `test-results/backwards-ultimate-h5/desktop-cannon-impact.png`
- Create: `test-results/backwards-ultimate-h5/mobile-landscape.png`
- Create: `test-results/backwards-ultimate-h5/portrait-rotate-hint.png`
- Create: `test-results/backwards-ultimate-h5/result.png`
- Create: `test-results/backwards-ultimate-h5/verification.json`

- [ ] **Step 1: Add layout assertions**

At `874×402` and `667×375`, assert that every `[data-critical-control]` bounding box is inside the viewport and at least `44×44`. At `390×844`, assert the rotate hint is visible and the live game controls are inert.

- [ ] **Step 2: Add runtime assertions**

Capture console errors and unhandled page errors. Verify offline `file://` loading, no network requests, no duplicate round settlement, a full run, same-seed repeat equality and reduced-motion mode.

- [ ] **Step 3: Create deterministic captures**

The capture script uses local Chrome, a fixed seed and test time scale. It captures planning, correct combo impact, mobile landscape, portrait hint and result. Write metrics, seed, final snapshot, network request count and errors to `verification.json`.

- [ ] **Step 4: Run all verification**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs all
node tools/capture-backwards-ultimate-demo.mjs
```

Expected: every test prints `PASS`, five non-empty PNG files exist, and `verification.json` contains zero console/page errors and zero external network requests.

### Task 6: Conduct five-role AI playtest and decide retain or rework

**Files:**
- Create: `docs/superpowers/reports/2026-07-31-backwards-ultimate-ai-playtest.md`
- Modify if required: `demos/微信H5精品游戏/倒着开大-demo.html`
- Modify if required: `tools/verify-backwards-ultimate-demo.mjs`

- [ ] **Step 1: Give each player an evidence-bounded brief**

Use five independent perspectives: action-game veteran, auto-battler veteran, mobile casual player, systems strategist and first-time H5 player. Each must play the tutorial and one new-seed run, then report core-mechanic comprehension, round-three adaptation, fun score, replay score, concrete friction and the captured seed/log evidence.

- [ ] **Step 2: Compare results with GO/KILL gates**

Require at least 4/5 comprehension, 3/5 round-three adaptation, average fun `≥4.0/5`, replay `≥3.8/5`, order delta `≥30%`, run duration `90–150s`, and no P0/P1 issue.

- [ ] **Step 3: Fix must-fix findings and rerun**

Only change teaching copy, timing, hit feedback, control affordance or deterministic balance. Do not expand scope with new metagame systems. Re-run all verification after every fix.

- [ ] **Step 4: Publish the evidence report**

Record individual scores, reproducible observations, fixed issues, remaining risks and one explicit decision: `RETAIN`, `REWORK`, or `KILL`. Clearly label the panel as AI expert simulation, not external human research.

### Task 7: Final scoped commit and handoff

**Files:**
- Stage only files named in this plan.

- [ ] **Step 1: Run final checks**

Run:

```powershell
node tools/verify-backwards-ultimate-demo.mjs all
node tools/capture-backwards-ultimate-demo.mjs
git diff --check -- demos/微信H5精品游戏/倒着开大-demo.html tools/verify-backwards-ultimate-demo.mjs tools/capture-backwards-ultimate-demo.mjs docs/superpowers/reports/2026-07-31-backwards-ultimate-ai-playtest.md
```

Expected: all checks pass and `git diff --check` has no output.

- [ ] **Step 2: Stage only the scoped implementation**

```powershell
git add -- demos/微信H5精品游戏/倒着开大-demo.html tools/verify-backwards-ultimate-demo.mjs tools/capture-backwards-ultimate-demo.mjs docs/superpowers/plans/2026-07-31-backwards-ultimate-h5-game.md docs/superpowers/reports/2026-07-31-backwards-ultimate-ai-playtest.md test-results/backwards-ultimate-h5
```

- [ ] **Step 3: Commit**

```powershell
git commit -m "feat: add backwards ultimate h5 game demo"
```

- [ ] **Step 4: Handoff**

Provide the absolute clickable HTML path, direct-open instructions, verification summary, five-role playtest decision and remaining production gaps for WeChat packaging.
