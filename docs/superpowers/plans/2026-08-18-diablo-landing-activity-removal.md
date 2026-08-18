# 暗黑系列首发适配落地页移除运营活动 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the activity presentation and navigation from the landing-page demo while preserving the standalone activity demo.

**Architecture:** Keep the existing single-file HTML structure. Remove the activity tab/panel and its dedicated JavaScript state/render/listener code, then verify the remaining tabs and popup flow.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript.

---

### Task 1: Remove landing-page activity UI

**Files:**
- Modify: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`

- [ ] Remove the activity tab button, activity panel, activity FAQ row, activity-only CSS, and change popup CTA to `查看适配进度`.
- [ ] Remove activity data and functions (`activityUrl`, `openActivity`, `renderActivity`) plus their event listeners and initialization calls.

### Task 2: Verify remaining experience

**Files:**
- Test: `demos/暗黑系列/暗黑系列首发适配落地页demo.html`

- [ ] Search the landing page for activity-related selectors and functions; expect no matches except the standalone activity filename outside this file.
- [ ] Confirm the standalone activity demo remains present and unchanged.
- [ ] Load the landing page through a local static server and verify the popup, three tabs, game switching, video controls, and FAQ render without console errors.
