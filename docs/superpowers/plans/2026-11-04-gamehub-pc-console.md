# GameHub PC Console Experience Implementation Plan

> **For agentic workers:** Execute task by task in this session. The assigned implementation worker owns only console.js and console.css; the supervisor owns packaging, review and publication. No unrelated edits may be reverted.

**Goal:** Translate the supplied Emuly prototype's console feel to GameHub's PC game selection and launch experience, while preserving the current home demo.

**Architecture:** Read the existing self-contained home demo and append a scoped presentation/interaction layer. Reuse embedded licensed-source game artwork and existing homepage/PC routes. Publish the derived experiment at a separate fixed path; never rebuild or overwrite the current primary demo.

**Tech Stack:** Plain HTML/CSS/JavaScript, Python packaging, Playwright/Chrome verification, isolated Git index publication.

---

### Task 1: Baseline and scope

- [x] Read supplied README and existing screen/router/library implementations.
- [x] Record approved direction: glazed white, cyan focus, cover-driven selection, channel transition, optional interaction sound.
- [x] Exclude retro platforms, dual-screen device assumptions, instant saves, quick resume and real emulator execution.

### Task 2: Independent interaction layer

Files: `outputs/gamehub-pc-console-20261104/console.js`, `console.css` (implementation worker).

- [x] Add a game library with focused cover selection and linked showcase background.
- [x] Add a game space with local fixture configuration, cancellable launch simulation, static art preview and a game menu.
- [x] Preserve existing home/PC content routes and apply a readable light theme.
- [x] Add keyboard selection/confirm/back, optional WebAudio and reduced motion handling.

### Task 3: Packaging and evidence

Files: `outputs/gamehub-pc-console-20261104/build.py`, `review.css`, `shell.html`, `panel.js`, `verify.cjs`, `review.md` (supervisor). Latest supplied screenshot requires a left control panel and right interactive device preview; scene shortcuts are review tools outside the app.

- [x] Use `Path.read_text(encoding='utf-8')` to read the existing HTML, insert scoped CSS before `</style>` and JS before its final render call; fail if either anchor is absent.
- [x] Output only `public/gamehub-pc-console-demo/index.html` and `demos/gamehub-pc-console-demo.html`; compare the original SHA-256 before and after.
- [x] Run `python outputs/gamehub-pc-console-20261104/build.py`, then `node outputs/gamehub-pc-console-20261104/verify.cjs`.
- [x] Verify cover switching, game space, launch cancellation/completion, menu return, keyboard, mobile layout, home module retention and zero script errors. Inspect screenshots at 1440 and 390 widths.
- [x] Record derived visual components and distinguish the HTML simulation from actual emulator/phone capability.

### Task 4: Fixed preview delivery

Files: `publish.ps1`, `publication.json`, `live-verification.json`, workflow state card.

- [x] Fetch origin/master; build an isolated index from that commit, whitelist the new published HTML plus its implementation sources, and create a commit with `git commit-tree`.
- [x] Use ordinary push to the existing master; never force push or alter real HEAD/index.
- [x] Verify fixed HTTPS page body matches local SHA-256 and run key interactions against the public page.
- [x] Update workflow evidence and deliver the fixed clickable preview with the actual simulation limit.
