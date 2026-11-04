# GameHub Multi-device Revision Implementation Plan

> **For agentic workers:** Execute assigned independent modules in this session. Preserve other workers' edits. Supervisor integrates, verifies and publishes only whitelisted files.

**Goal:** Correct the existing app header, strengthen direct play and implement complete phone/tablet/Duo previews on the current fixed URL.

**Architecture:** Append scoped modules after console.js: immersive game library, device shell/player, native header, then review panel. Embed unmodified official game scene assets. Keep baseline homepage untouched.

**Tech Stack:** DOM/CSS/JavaScript, Python build, Playwright/Chrome, isolated Git index.

### Task 1: Approved scope and source

- [x] Read current implementation and user screenshots.
- [x] Three-view quick review of direct launch and required guards.
- [x] Fetch and inspect four unmodified official Steam scene screenshots; record source hashes.

### Task 2: Independent modules

- [x] `immersive.js/css` (immersive worker): hero scene, direct start, low-priority detail, cancel return and repeated-click guard.
- [x] `device.js/css` (device worker): phone OS shells, portrait/landscape/tablet/Duo arrangements, PC virtual controller feedback.
- [x] `header.js/css`, `panel.js`, `shell.html` (supervisor): screenshot-based actual icon assets, two OS selectors, four device forms, existing home/PC content arrangement.
- [x] `build.py`: embed `scene-sources.json` files and append modules in dependency order.

### Task 3: Verification and fixed preview

- [x] Run `python outputs/gamehub-pc-console-20261104/build.py` and `node outputs/gamehub-pc-console-20261104/verify-revision.cjs`.
- [x] Check OS/form matrix, header icon geometry, direct launch/cancel/lock, keyboard, controller press/stick return, menu focus and original content preservation.
- [x] Inspect all four form screenshots at original sizes and mobile body overflow.
- [x] Whitelist updated demo/modules/assets/evidence; normal push to existing master with HEAD/index preserved.
- [x] Run fixed public body/Git/local hash comparison and key live interactions; update state and deliver fixed URL.
