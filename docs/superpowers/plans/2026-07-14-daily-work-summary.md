# Daily Categorized Work Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the daily 18:30 handoff automation to create one separate, categorized Markdown work summary in the Obsidian daily-note directory.

**Architecture:** Keep `HANDOFF.md` as the handoff source and have the same Codex execution also write a temporary categorized summary under `.tmp/handoff`. After validating both outputs, PowerShell synchronizes the summary into a marker-managed block in `YYYY-MM-DD-工作汇总.md`, preserving any manual text outside that block.

**Tech Stack:** Windows PowerShell 5.1, Codex CLI, Markdown, Windows Task Scheduler

---

### Task 1: Extend the Codex output contract

**Files:**
- Modify: `scripts/daily-handoff.ps1`

- [ ] **Step 1: Define the temporary summary path**

Add a path under the existing log directory for `.tmp/handoff/daily-work-current.md`, and remove any stale copy before invoking Codex.

- [ ] **Step 2: Expand the prompt**

Require Codex to edit only `HANDOFF.md` and `.tmp/handoff/daily-work-current.md`. Define the six fixed categories and require factual same-day content only.

- [ ] **Step 3: Validate generated files**

After a successful CLI exit, assert that `HANDOFF.md` and `daily-work-current.md` both exist and contain non-whitespace text. Throw an error before vault synchronization when either check fails.

### Task 2: Synchronize the categorized summary

**Files:**
- Modify: `scripts/daily-handoff.ps1`
- Create at runtime: `D:\大超个人仓库\40-复盘与周报\日记\YYYY-MM-DD-工作汇总.md`

- [ ] **Step 1: Build the target file metadata and managed block**

Use frontmatter fields `type: daily-work-summary`, `status: collected`, and the current date. Wrap generated content in `CODEX-DAILY-WORK:START/END` markers.

- [ ] **Step 2: Preserve manual content on repeat runs**

When the target exists, replace only the first marker-managed block. If markers do not exist, append the managed block to the existing file.

- [ ] **Step 3: Clean temporary state after success**

Delete the diagnostic log and temporary summary only after both daily files have been written successfully.

### Task 3: Verify the automation

**Files:**
- Verify: `scripts/daily-handoff.ps1`
- Verify: `D:\大超个人仓库\40-复盘与周报\日记\2026-07-14.md`
- Verify: `D:\大超个人仓库\40-复盘与周报\日记\2026-07-14-工作汇总.md`

- [ ] **Step 1: Parse the PowerShell script**

Run:

```powershell
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path 'scripts\daily-handoff.ps1'), [ref]$null, [ref]$errors) | Out-Null
if ($errors.Count) { $errors | Format-List; exit 1 }
```

Expected: exit code `0` with no parser errors.

- [ ] **Step 2: Run the script end to end**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\daily-handoff.ps1
```

Expected: exit code `0`, a compact success log, no diagnostic log, and both today's Markdown files present.

- [ ] **Step 3: Check structure and task state**

Confirm the new file contains all six category headings and exactly one start/end marker pair. Run `Get-ScheduledTaskInfo -TaskName 'Codex Daily HANDOFF 1830'` and expect `LastTaskResult` to remain `0` after a scheduled-task execution.

- [ ] **Step 4: Check only intended source changes**

Run:

```powershell
git diff --check -- scripts/daily-handoff.ps1 docs/superpowers/specs/2026-07-14-daily-work-summary-design.md docs/superpowers/plans/2026-07-14-daily-work-summary.md
```

Expected: no output and exit code `0`.
