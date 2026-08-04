# Four-Experiment Platform and Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the isolated Cloudflare host, shared analytics/lead APIs, aggregate dashboard, deployment workflow, UTM registry, and seven-day reporting loop that support all four approved experiments.

**Architecture:** A new standalone Vite + TypeScript project lives at `github/four-experiment-pilot`; one pathname router lazy-loads four independently mounted experiences and the dashboard. A same-origin Cloudflare Worker validates events and leads, stores them in D1, serves aggregate-only dashboard data, runs the 09:30 Asia/Shanghai daily aggregation, and serves Vite static assets without touching the existing GameHub site or repository history.

**Tech Stack:** TypeScript 5, Vite, Phaser 3, Vitest, happy-dom, Playwright, Cloudflare Workers Static Assets, Cloudflare D1, Wrangler.

---

## Dependency order

Execute this platform plan first through Task 7. Then execute the plans below; their mount contracts are defined in Task 3 of this plan:

1. `docs/superpowers/plans/2026-08-05-nine-grid-beasts.md`
2. `docs/superpowers/plans/2026-08-05-paper-town.md`
3. `docs/superpowers/plans/2026-08-05-side-service-experiments.md`

Before returning to Tasks 8–12, each child plan must replace its Task 3 placeholder mount with a re-export of the completed app entry. This transition is part of the child plan and must happen before any cross-app E2E run:

```ts
// src/apps/nine-grid/mount.ts
export { mountNineGrid } from "./index";

// src/apps/paper-town/mount.ts
export { mountPaperTown } from "./index";

// src/apps/ai-product-team/mount.ts
export { mountAiProductTeam } from "./index";

// src/apps/prototype-sprint/mount.ts
export { mountPrototypeSprint } from "./index";
```

Return to Tasks 8–12 only after all four bridge files have replaced the placeholders and the four public routes visibly render their completed experiences.

## File map

```text
github/four-experiment-pilot/
├── index.html                         # One Vite entry; pathname router chooses the experience
├── package.json                       # Exact build, test, local Worker and deploy commands
├── tsconfig.json                      # Shared browser/Worker TypeScript settings
├── vite.config.ts                     # Vite build and Vitest configuration
├── playwright.config.ts               # Browser matrix and local Worker web server
├── wrangler.jsonc                     # Worker, static assets, D1 and cron configuration
├── migrations/0001_initial.sql        # Events, leads and daily summaries schema
├── src/main.ts                        # Route table and mount/unmount lifecycle
├── src/styles/base.css                # Shared reset, navigation, responsive and state styles
├── src/shared/contracts.ts            # Cross-app IDs, event names and API payloads
├── src/shared/analytics.ts            # Anonymous ID, bounded retry queue and event transport
├── src/shared/leads.ts                # Lead validation client and same-origin POST
├── src/shared/utm.ts                  # UTM parsing and session attribution
├── src/apps/home/mount.ts             # Four-experiment public launcher
├── src/apps/dashboard/mount.ts        # Aggregate dashboard UI
├── src/apps/dashboard/model.ts        # Dashboard fetch and ratio calculations
├── src/worker/index.ts                # HTTP and scheduled entry points
├── src/worker/validation.ts            # Pure request validators and sanitizers
├── src/worker/repository.ts            # D1 inserts, aggregates, retention and daily summaries
├── scripts/build-utm-links.mjs         # Deterministic channel URL generator
├── rollout/channels.json               # Approved UTM channel registry
├── rollout/public-links.json           # Deployed origin and five final public URLs
├── rollout/daily-report-template.md     # Fixed fact/inference/action daily format
├── tests/unit/analytics.test.ts         # Queue, retry, attribution and de-duplication
├── tests/unit/validation.test.ts        # Event and lead API boundary tests
├── tests/unit/dashboard-model.test.ts   # Aggregate and ratio rules
├── tests/e2e/platform.spec.ts           # Route, API, dashboard and no-leakage smoke tests
└── test-results/                        # Playwright evidence; gitignored
```

### Task 1: Create the isolated project and deterministic toolchain

**Files:**
- Create: `github/four-experiment-pilot/package.json`
- Create: `github/four-experiment-pilot/tsconfig.json`
- Create: `github/four-experiment-pilot/vite.config.ts`
- Create: `github/four-experiment-pilot/index.html`
- Create: `github/four-experiment-pilot/.gitignore`

- [ ] **Step 1: Create `package.json` with pinned commands**

```json
{
  "name": "four-experiment-pilot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate:local": "wrangler d1 migrations apply four-experiment-pilot-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply four-experiment-pilot-db --remote",
    "preview:worker": "npm run build && wrangler dev --local --port 8787",
    "deploy": "npm run build && wrangler deploy",
    "utm": "node scripts/build-utm-links.mjs"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260805.0",
    "@playwright/test": "^1.54.2",
    "happy-dom": "^18.0.1",
    "typescript": "^5.9.2",
    "vite": "^7.1.1",
    "vitest": "^3.2.4",
    "wrangler": "^4.28.1"
  }
}
```

- [ ] **Step 2: Create strict TypeScript and Vitest configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["@cloudflare/workers-types", "vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: { target: "es2022", sourcemap: true },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
  },
});
```

- [ ] **Step 3: Create the single HTML entry and ignore generated/private files**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <meta name="description" content="四项原创产品与游戏试验" />
    <title>四项真实试验</title>
  </head>
  <body>
    <div id="app" aria-live="polite"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```gitignore
node_modules/
dist/
.wrangler/
.dev.vars
test-results/
playwright-report/
rollout/private-leads/
```

- [ ] **Step 4: Install dependencies and browser runtime**

Run: `cd C:\Users\z3635\官网改动\github\four-experiment-pilot; npm.cmd install; npx.cmd playwright install chromium`

Expected: `npm` exits `0`, `package-lock.json` exists, and Playwright reports Chromium installed without changing the parent GameHub repository files.

- [ ] **Step 5: Initialize an independent Git repository**

Run: `git init -b main; git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore; git commit -m "chore: initialize four-experiment pilot"`

Expected: the new repository has one commit on `main`; `git -C C:\Users\z3635\官网改动 status --short` shows no new staged changes from the pilot directory because the nested repository is independent.

### Task 2: Lock shared contracts before app code

**Files:**
- Create: `github/four-experiment-pilot/src/shared/contracts.ts`
- Test: `github/four-experiment-pilot/tests/unit/validation.test.ts`

- [ ] **Step 1: Write a failing contract guard test**

```ts
import { describe, expect, it } from "vitest";
import { EVENT_NAMES, EXPERIMENT_IDS } from "../../src/shared/contracts";

describe("shared contracts", () => {
  it("contains the four public experiments and only approved event names", () => {
    expect(EXPERIMENT_IDS).toEqual([
      "nine-grid-beasts",
      "paper-town",
      "ai-product-team",
      "prototype-sprint",
    ]);
    expect(EVENT_NAMES).toContain("game_complete");
    expect(EVENT_NAMES).toContain("lead_submit");
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run: `npm.cmd test -- tests/unit/validation.test.ts`

Expected: FAIL with `Cannot find module '../../src/shared/contracts'`.

- [ ] **Step 3: Implement the complete shared contract**

```ts
export const EXPERIMENT_IDS = [
  "nine-grid-beasts",
  "paper-town",
  "ai-product-team",
  "prototype-sprint",
] as const;
export type ExperimentId = (typeof EXPERIMENT_IDS)[number];

export const EVENT_NAMES = [
  "game_view", "game_start", "round_start", "unit_recruit", "unit_place",
  "formation_lock", "round_result", "first_action", "tower_build", "paper_slash",
  "upgrade_pick", "wave_complete", "game_complete", "replay_click",
  "service_view", "demo_start", "demo_complete", "case_open", "scope_expand",
  "pricing_view", "pricing_click", "lead_start", "lead_submit",
] as const;
export type AnalyticsEventName = (typeof EVENT_NAMES)[number];
export type AnalyticsProperties = Record<string, string | number | boolean>;

export interface UtmAttribution {
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

export interface AnalyticsEventPayload {
  eventId: string;
  anonymousId: string;
  experiment: ExperimentId;
  name: AnalyticsEventName;
  eventTime: string;
  pagePath: string;
  attribution: UtmAttribution;
  properties: AnalyticsProperties;
}

export interface AnalyticsClient {
  track(name: AnalyticsEventName, properties?: AnalyticsProperties): void;
  flush(): Promise<void>;
}

export type PricingTier =
  | "diagnosis" | "standard" | "custom"
  | "single-page" | "interactive" | "game-slice";

export interface LeadPayload {
  experiment: "ai-product-team" | "prototype-sprint";
  contact: string;
  need: string;
  consent: true;
  pricingTier?: PricingTier;
}

export interface LeadResult {
  leadId: string;
  submittedAt: string;
}

export interface ExperimentSummary {
  experiment: ExperimentId;
  visitors: number;
  starts: number;
  completions: number;
  repeatActions: number;
  pricingClicks: number;
  leads: number;
  completionRate: number;
  conversionRate: number;
}

export interface DashboardSummary {
  generatedAt: string;
  sampleWarning: string | null;
  experiments: ExperimentSummary[];
}
```

- [ ] **Step 4: Run the contract test**

Run: `npm.cmd test -- tests/unit/validation.test.ts`

Expected: PASS, one test.

- [ ] **Step 5: Commit the contract**

Run: `git add src/shared/contracts.ts tests/unit/validation.test.ts; git commit -m "feat: define experiment data contracts"`

Expected: one commit containing only the shared contract and its test.

### Task 3: Implement pathname routing and the four mount contracts

**Files:**
- Create: `github/four-experiment-pilot/src/main.ts`
- Create: `github/four-experiment-pilot/src/styles/base.css`
- Create: `github/four-experiment-pilot/src/apps/home/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/nine-grid/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/paper-town/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/ai-product-team/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/prototype-sprint/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/dashboard/mount.ts`
- Test: `github/four-experiment-pilot/tests/unit/router.test.ts`

- [ ] **Step 1: Write the failing route resolution test**

```ts
import { describe, expect, it } from "vitest";
import { resolveRoute } from "../../src/main";

describe("resolveRoute", () => {
  it.each([
    ["/", "home"],
    ["/nine-grid-beasts/", "nine-grid-beasts"],
    ["/paper-town", "paper-town"],
    ["/ai-product-team", "ai-product-team"],
    ["/prototype-sprint", "prototype-sprint"],
    ["/dashboard", "dashboard"],
    ["/unknown", "not-found"],
  ])("maps %s to %s", (path, route) => {
    expect(resolveRoute(path)).toBe(route);
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm.cmd test -- tests/unit/router.test.ts`

Expected: FAIL because `src/main.ts` does not exist.

- [ ] **Step 3: Create minimal placeholder mounts that satisfy the stable interface**

Each placeholder exports the exact final signature; this example is the entire initial `src/apps/nine-grid/mount.ts`, and the other three experiment files use the same body with their approved title:

```ts
import type { AnalyticsClient } from "../../shared/contracts";

export async function mountNineGrid(
  root: HTMLElement,
  _analytics: AnalyticsClient,
): Promise<() => void> {
  root.innerHTML = `<main class="placeholder"><h1>九格异兽</h1><p>玩法模块正在装载。</p></main>`;
  return () => { root.replaceChildren(); };
}
```

Create the remaining files with these exact exports and titles:

```ts
export async function mountPaperTown(root: HTMLElement, _analytics: AnalyticsClient): Promise<() => void>;
export async function mountAiProductTeam(root: HTMLElement, _analytics: AnalyticsClient): Promise<() => void>;
export async function mountPrototypeSprint(root: HTMLElement, _analytics: AnalyticsClient): Promise<() => void>;
export async function mountDashboard(root: HTMLElement): Promise<() => void>;
```

The implemented function bodies must render respectively `纸镇失控`, `AI 产品部部署`, `48 小时可玩验证冲刺`, and `真实试投数据` and return a cleanup function that empties `root`.

- [ ] **Step 4: Implement the router and lazy loaders**

```ts
import "./styles/base.css";
import { createAnalytics } from "./shared/analytics";
import type { ExperimentId } from "./shared/contracts";

export type RouteId = ExperimentId | "home" | "dashboard" | "not-found";

export function resolveRoute(pathname: string): RouteId {
  const path = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  const routes: Record<string, RouteId> = {
    "/": "home",
    "/nine-grid-beasts": "nine-grid-beasts",
    "/paper-town": "paper-town",
    "/ai-product-team": "ai-product-team",
    "/prototype-sprint": "prototype-sprint",
    "/dashboard": "dashboard",
  };
  return routes[path] ?? "not-found";
}

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("#app root is missing");
  const route = resolveRoute(location.pathname);
  if (route === "home") {
    const { mountHome } = await import("./apps/home/mount");
    await mountHome(root);
    return;
  }
  if (route === "dashboard") {
    const { mountDashboard } = await import("./apps/dashboard/mount");
    await mountDashboard(root);
    return;
  }
  if (route === "not-found") {
    root.innerHTML = `<main class="not-found"><h1>页面不存在</h1><a href="/">返回四项试验</a></main>`;
    return;
  }
  const analytics = createAnalytics(route);
  if (route === "nine-grid-beasts") {
    const { mountNineGrid } = await import("./apps/nine-grid/mount");
    await mountNineGrid(root, analytics);
  } else if (route === "paper-town") {
    const { mountPaperTown } = await import("./apps/paper-town/mount");
    await mountPaperTown(root, analytics);
  } else if (route === "ai-product-team") {
    const { mountAiProductTeam } = await import("./apps/ai-product-team/mount");
    await mountAiProductTeam(root, analytics);
  } else {
    const { mountPrototypeSprint } = await import("./apps/prototype-sprint/mount");
    await mountPrototypeSprint(root, analytics);
  }
}

if (typeof document !== "undefined") void boot();
```

- [ ] **Step 5: Implement the home launcher and shared base styles**

`mountHome` must render four cards with exact links `/nine-grid-beasts`, `/paper-town`, `/ai-product-team`, `/prototype-sprint`, plus a secondary link `/dashboard`. `base.css` must set `box-sizing`, system Chinese fonts, dark neutral body, 44 px minimum interactive targets, `env(safe-area-inset-*)` padding, visible focus rings, and `prefers-reduced-motion` overrides; it must not contain GameHub colors, logos or names.

- [ ] **Step 6: Run tests and build**

Run: `npm.cmd test -- tests/unit/router.test.ts; npm.cmd run build`

Expected: route test PASS and Vite creates `dist/index.html` without TypeScript errors.

- [ ] **Step 7: Commit route shell**

Run: `git add src/main.ts src/styles/base.css src/apps index.html tests/unit/router.test.ts; git commit -m "feat: add isolated experiment router"`

Expected: one route-shell commit; no game or service business logic yet.

### Task 4: Build anonymous UTM attribution and bounded analytics transport

**Files:**
- Create: `github/four-experiment-pilot/src/shared/utm.ts`
- Create: `github/four-experiment-pilot/src/shared/analytics.ts`
- Test: `github/four-experiment-pilot/tests/unit/analytics.test.ts`

- [ ] **Step 1: Write failing tests for attribution, queue cap and retry**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalytics, QUEUE_KEY } from "../../src/shared/analytics";
import { readAttribution } from "../../src/shared/utm";

beforeEach(() => localStorage.clear());

describe("analytics", () => {
  it("reads only approved UTM keys", () => {
    expect(readAttribution("?utm_source=xianyu&utm_medium=post&utm_campaign=pilot&utm_content=a&token=secret"))
      .toEqual({ source: "xianyu", medium: "post", campaign: "pilot", content: "a" });
  });

  it("keeps no more than 50 pending events when network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const analytics = createAnalytics("nine-grid-beasts");
    for (let index = 0; index < 60; index += 1) analytics.track("round_start", { round: index });
    await analytics.flush();
    expect(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]")).toHaveLength(50);
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm.cmd test -- tests/unit/analytics.test.ts`

Expected: FAIL because `analytics.ts` and `utm.ts` do not exist.

- [ ] **Step 3: Implement UTM parsing and first-touch session storage**

```ts
import type { UtmAttribution } from "./contracts";

const ATTRIBUTION_KEY = "pilot:attribution";
const EMPTY: UtmAttribution = { source: "direct", medium: "none", campaign: "none", content: "none" };

function clean(value: string | null, fallback: string): string {
  return (value ?? fallback).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64) || fallback;
}

export function readAttribution(search = location.search): UtmAttribution {
  const params = new URLSearchParams(search);
  return {
    source: clean(params.get("utm_source"), "direct"),
    medium: clean(params.get("utm_medium"), "none"),
    campaign: clean(params.get("utm_campaign"), "none"),
    content: clean(params.get("utm_content"), "none"),
  };
}

export function getAttribution(search = location.search): UtmAttribution {
  const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
  if (stored) return JSON.parse(stored) as UtmAttribution;
  const next = search ? readAttribution(search) : EMPTY;
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  return next;
}
```

- [ ] **Step 4: Implement the complete non-blocking analytics client**

```ts
import type {
  AnalyticsClient, AnalyticsEventName, AnalyticsEventPayload,
  AnalyticsProperties, ExperimentId,
} from "./contracts";
import { getAttribution } from "./utm";

export type { AnalyticsClient, AnalyticsEventName } from "./contracts";

export const QUEUE_KEY = "pilot:event-queue";
const ANONYMOUS_KEY = "pilot:anonymous-id";
const MAX_QUEUE = 50;

function anonymousId(): string {
  const stored = localStorage.getItem(ANONYMOUS_KEY);
  if (stored) return stored;
  const created = crypto.randomUUID();
  localStorage.setItem(ANONYMOUS_KEY, created);
  return created;
}

function readQueue(): AnalyticsEventPayload[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as AnalyticsEventPayload[]; }
  catch { return []; }
}

function writeQueue(queue: AnalyticsEventPayload[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
}

export function createAnalytics(experiment: ExperimentId): AnalyticsClient {
  let flushing = false;
  return {
    track(name: AnalyticsEventName, properties: AnalyticsProperties = {}): void {
      const event: AnalyticsEventPayload = {
        eventId: crypto.randomUUID(), anonymousId: anonymousId(), experiment, name,
        eventTime: new Date().toISOString(), pagePath: location.pathname,
        attribution: getAttribution(), properties,
      };
      writeQueue([...readQueue(), event]);
      queueMicrotask(() => { void this.flush(); });
    },
    async flush(): Promise<void> {
      if (flushing) return;
      flushing = true;
      try {
        const queue = readQueue();
        for (let index = 0; index < queue.length; index += 1) {
          const response = await fetch("/api/events", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(queue[index]), keepalive: true,
          });
          if (!response.ok) break;
          writeQueue(readQueue().filter((item) => item.eventId !== queue[index]?.eventId));
        }
      } catch { /* bounded queue preserves the event for a later attempt */ }
      finally { flushing = false; }
    },
  };
}
```

- [ ] **Step 5: Run analytics tests**

Run: `npm.cmd test -- tests/unit/analytics.test.ts`

Expected: PASS, including a stored queue length of exactly `50` after simulated offline failure.

- [ ] **Step 6: Commit the analytics client**

Run: `git add src/shared/analytics.ts src/shared/utm.ts tests/unit/analytics.test.ts; git commit -m "feat: add privacy-limited experiment analytics"`

### Task 5: Add D1 schema and pure request validation

**Files:**
- Create: `github/four-experiment-pilot/migrations/0001_initial.sql`
- Create: `github/four-experiment-pilot/src/worker/validation.ts`
- Modify: `github/four-experiment-pilot/tests/unit/validation.test.ts`

- [ ] **Step 1: Add failing validator tests**

```ts
import { describe, expect, it } from "vitest";
import { parseEvent, parseLead } from "../../src/worker/validation";

describe("API validation", () => {
  it("rejects unknown events and overlong properties", () => {
    expect(() => parseEvent({ experiment: "nine-grid-beasts", name: "hack" })).toThrow("INVALID_EVENT");
    expect(() => parseEvent({
      eventId: crypto.randomUUID(), anonymousId: crypto.randomUUID(), experiment: "nine-grid-beasts",
      name: "game_start", eventTime: new Date().toISOString(), pagePath: "/nine-grid-beasts",
      attribution: { source: "direct", medium: "none", campaign: "none", content: "none" },
      properties: { note: "x".repeat(201) },
    })).toThrow("INVALID_PROPERTIES");
  });

  it("requires explicit consent and a usable contact", () => {
    expect(() => parseLead({ experiment: "ai-product-team", contact: "", need: "部署", consent: false }))
      .toThrow("INVALID_LEAD");
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm.cmd test -- tests/unit/validation.test.ts`

Expected: FAIL because `src/worker/validation.ts` is missing.

- [ ] **Step 3: Create the complete schema**

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE events (
  event_id TEXT PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_time TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  page_path TEXT NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT NOT NULL,
  content TEXT NOT NULL,
  properties_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_events_experiment_time ON events(experiment_id, event_time);
CREATE INDEX idx_events_anonymous ON events(anonymous_id);

CREATE TABLE leads (
  lead_id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  contact TEXT NOT NULL,
  need TEXT NOT NULL,
  pricing_tier TEXT,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
CREATE INDEX idx_leads_experiment_time ON leads(experiment_id, submitted_at);

CREATE TABLE daily_summaries (
  summary_date TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  visitors INTEGER NOT NULL,
  starts INTEGER NOT NULL,
  completions INTEGER NOT NULL,
  repeat_actions INTEGER NOT NULL,
  pricing_clicks INTEGER NOT NULL,
  leads INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (summary_date, experiment_id)
);
```

- [ ] **Step 4: Implement strict parsers**

`validation.ts` must import the shared ID arrays, accept only plain JSON objects, require UUID-shaped `eventId` and `anonymousId`, require an ISO date, cap `pagePath` at 120, UTM fields at 64, property keys at 40, property strings at 200, property count at 20, lead contact at 100, and need at 500. It exports `parseAttribution(value): UtmAttribution`, `parseEvent(value): AnalyticsEventPayload`, and `parseLead(value): LeadPayload`; invalid values throw `Error("INVALID_EVENT")`, `Error("INVALID_PROPERTIES")`, or `Error("INVALID_LEAD")` exactly as asserted above.

- [ ] **Step 5: Run validation tests and SQLite syntax check**

Run: `npm.cmd test -- tests/unit/validation.test.ts; Get-Content migrations/0001_initial.sql | sqlite3.exe :memory:`

Expected: Vitest PASS. If `sqlite3.exe` is not installed, run `npx.cmd wrangler d1 execute four-experiment-pilot-db --local --file migrations/0001_initial.sql` after Task 7 and require exit `0` instead; do not skip schema verification.

- [ ] **Step 6: Commit schema and validation**

Run: `git add migrations/0001_initial.sql src/worker/validation.ts tests/unit/validation.test.ts; git commit -m "feat: define validated pilot data schema"`

### Task 6: Implement D1 repository, Worker APIs and retention cron

**Files:**
- Create: `github/four-experiment-pilot/src/worker/repository.ts`
- Create: `github/four-experiment-pilot/src/worker/index.ts`
- Create: `github/four-experiment-pilot/src/shared/leads.ts`
- Test: `github/four-experiment-pilot/tests/unit/dashboard-model.test.ts`

- [ ] **Step 1: Write a failing ratio and empty-sample test**

```ts
import { describe, expect, it } from "vitest";
import { safeRate, withRates } from "../../src/apps/dashboard/model";

describe("dashboard model", () => {
  it("never reports NaN or fabricated conversion", () => {
    expect(safeRate(0, 0)).toBe(0);
    expect(withRates({
      experiment: "ai-product-team", visitors: 0, starts: 0, completions: 0,
      repeatActions: 0, pricingClicks: 0, leads: 0,
    })).toMatchObject({ completionRate: 0, conversionRate: 0 });
  });
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm.cmd test -- tests/unit/dashboard-model.test.ts`

Expected: FAIL because dashboard model is absent.

- [ ] **Step 3: Implement dashboard ratio helpers**

```ts
import type { ExperimentSummary } from "../../shared/contracts";

type RawSummary = Omit<ExperimentSummary, "completionRate" | "conversionRate">;

export function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

export function withRates(raw: RawSummary): ExperimentSummary {
  return {
    ...raw,
    completionRate: safeRate(raw.completions, raw.starts),
    conversionRate: safeRate(raw.leads, raw.visitors),
  };
}
```

- [ ] **Step 4: Implement repository functions with parameterized SQL**

`repository.ts` must export these exact functions and return types:

```ts
export async function insertEvent(db: D1Database, event: AnalyticsEventPayload): Promise<void>;
export async function insertLead(db: D1Database, lead: LeadPayload, attribution: UtmAttribution): Promise<LeadResult>;
export async function readDashboardSummary(db: D1Database): Promise<DashboardSummary>;
export async function writeDailySummary(db: D1Database, summaryDate: string): Promise<void>;
export async function enforceRetention(db: D1Database, nowIso: string): Promise<void>;
```

Implementation requirements:

- `insertEvent` uses `INSERT OR IGNORE` keyed by `event_id` and `JSON.stringify(event.properties)`.
- `insertLead` creates `crypto.randomUUID()`, records `submittedAt`, and never returns the contact value.
- `readDashboardSummary` iterates `EXPERIMENT_IDS` and counts distinct `anonymous_id`, approved start events (`game_start` or `demo_start`), `game_complete`/`demo_complete`, `replay_click`, `pricing_click`, and rows in `leads`; every event aggregate excludes rows where `json_extract(properties_json, '$.test') = 1`; it calls `withRates` and sets `sampleWarning` to `真实有效访问不足 30，比例仅供观察。` when total visitors are below 30.
- `writeDailySummary` uses the Shanghai calendar date boundaries passed by the caller, excludes `properties.test = true` rows, and uses `INSERT ... ON CONFLICT DO UPDATE` for all four experiments.
- `enforceRetention` deletes events older than 30 days and leads older than 90 days using ISO timestamps computed from `nowIso`.

- [ ] **Step 5: Implement the lead client**

```ts
import type { LeadPayload, LeadResult } from "./contracts";
import { getAttribution } from "./utm";

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, attribution: getAttribution() }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "LEAD_SUBMIT_FAILED");
  }
  return response.json() as Promise<LeadResult>;
}
```

- [ ] **Step 6: Implement Worker fetch and scheduled handlers**

```ts
import { parseAttribution, parseEvent, parseLead } from "./validation";
import {
  enforceRetention, insertEvent, insertLead, readDashboardSummary, writeDailySummary,
} from "./repository";

interface Env { DB: D1Database; ASSETS: Fetcher; }

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function shanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/api/health") return json({ status: "ok" });
      if (request.method === "POST" && url.pathname === "/api/events") {
        if (Number(request.headers.get("content-length") ?? 0) > 16_384) return json({ error: "PAYLOAD_TOO_LARGE" }, 413);
        const event = parseEvent(await request.json());
        await insertEvent(env.DB, event);
        return json({ accepted: true }, 202);
      }
      if (request.method === "POST" && url.pathname === "/api/leads") {
        const body = await request.json() as Record<string, unknown>;
        const lead = parseLead(body);
        const result = await insertLead(env.DB, lead, parseAttribution(body.attribution));
        return json(result, 201);
      }
      if (request.method === "GET" && url.pathname === "/api/dashboard/summary") {
        return json(await readDashboardSummary(env.DB));
      }
      if (url.pathname.startsWith("/api/")) return json({ error: "NOT_FOUND" }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
      const clientError = code.startsWith("INVALID_");
      return json({ error: clientError ? code : "INTERNAL_ERROR" }, clientError ? 400 : 500);
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    await writeDailySummary(env.DB, shanghaiDate(yesterday));
    await enforceRetention(env.DB, now.toISOString());
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 7: Run unit tests and typecheck**

Run: `npm.cmd test; npm.cmd run typecheck`

Expected: all unit tests PASS and TypeScript reports no mismatch among app, client, Worker, D1 and dashboard contracts.

- [ ] **Step 8: Commit API and repository**

Run: `git add src/worker src/shared/leads.ts src/apps/dashboard/model.ts tests/unit/dashboard-model.test.ts; git commit -m "feat: add experiment event and lead APIs"`

### Task 7: Configure Cloudflare without hard-coded account identifiers

**Files:**
- Create: `github/four-experiment-pilot/wrangler.jsonc`

- [ ] **Step 1: Create Worker Static Assets and cron configuration**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "four-experiment-pilot",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-08-05",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "triggers": { "crons": ["30 1 * * *"] }
}
```

- [ ] **Step 2: Ask the user to complete Cloudflare browser login**

Run: `npx.cmd wrangler login`

Expected: the command opens Cloudflare authorization in the user's browser; the user personally approves it; `npx.cmd wrangler whoami` then displays the intended personal account. Do not use the employer's Cloudflare account.

- [ ] **Step 3: Create D1 and let Wrangler write the real database ID**

Run: `npx.cmd wrangler d1 create four-experiment-pilot-db --binding DB --update-config wrangler.jsonc`

Expected: exit `0`; `wrangler.jsonc` gains a `d1_databases` entry with binding `DB`, database name `four-experiment-pilot-db`, and the actual Cloudflare-generated database ID. No fake ID or manually copied credential is committed.

- [ ] **Step 4: Apply the schema locally and remotely**

Run: `npm.cmd run db:migrate:local; npm.cmd run db:migrate:remote`

Expected: both commands apply `0001_initial.sql` successfully; rerunning reports no pending migration instead of duplicating tables.

- [ ] **Step 5: Commit only non-secret Cloudflare configuration**

Run: `git add wrangler.jsonc migrations/0001_initial.sql; git commit -m "chore: configure isolated Cloudflare pilot"`

Expected: no `.dev.vars`, token, email, contact, account credential or lead data is staged.

### Task 8: Implement the aggregate-only dashboard

**Files:**
- Modify: `github/four-experiment-pilot/src/apps/dashboard/model.ts`
- Modify: `github/four-experiment-pilot/src/apps/dashboard/mount.ts`
- Create: `github/four-experiment-pilot/src/apps/dashboard/dashboard.css`
- Test: `github/four-experiment-pilot/tests/e2e/platform.spec.ts`

- [ ] **Step 1: Add a failing browser assertion for empty truthful data**

```ts
import { expect, test } from "@playwright/test";

test("dashboard shows sample warning and never exposes lead details", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "真实试投数据" })).toBeVisible();
  await expect(page.getByText("真实有效访问不足 30，比例仅供观察。")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("contact");
  await expect(page.locator("body")).not.toContainText("need");
});
```

- [ ] **Step 2: Implement `fetchDashboardSummary`**

```ts
import type { DashboardSummary } from "../../shared/contracts";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch("/api/dashboard/summary", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("DASHBOARD_UNAVAILABLE");
  return response.json() as Promise<DashboardSummary>;
}
```

- [ ] **Step 3: Implement dashboard mount states**

`mountDashboard` must immediately render a loading skeleton, then replace it with four named experiment cards. Each card displays visitors, starts, completions, repeat actions, pricing clicks, leads, completion rate and lead conversion rate. It must show `generatedAt`, display `sampleWarning` when non-null, and on fetch failure display `数据暂时不可用，未使用虚假 0 代替。` plus a retry button. It must never call or render a lead-detail endpoint.

- [ ] **Step 4: Add responsive table/card CSS**

At widths below 720 px, cards stack in one column; at or above 720 px, use two columns. Metrics use tabular numerals. A visible badge distinguishes `真实事件` from the sample warning. No chart library is introduced for four values.

- [ ] **Step 5: Run local Worker and E2E test**

Run in terminal A: `npm.cmd run preview:worker`

Run in terminal B: `npm.cmd run test:e2e -- tests/e2e/platform.spec.ts`

Expected: dashboard E2E PASS against `http://127.0.0.1:8787/dashboard`; no contact or need text appears in the DOM.

- [ ] **Step 6: Commit dashboard**

Run: `git add src/apps/dashboard tests/e2e/platform.spec.ts; git commit -m "feat: add aggregate-only pilot dashboard"`

### Task 9: Add deterministic UTM link generation and deployment manifest

**Files:**
- Create: `github/four-experiment-pilot/rollout/channels.json`
- Create: `github/four-experiment-pilot/scripts/build-utm-links.mjs`
- Create: `github/four-experiment-pilot/rollout/public-links.json`
- Test: `github/four-experiment-pilot/tests/unit/utm-script.test.ts`

- [ ] **Step 1: Create the approved channel registry**

```json
{
  "campaign": "pilot-2026-08",
  "channels": [
    { "id": "wechat-private", "medium": "private-share", "experiments": ["nine-grid-beasts", "paper-town"] },
    { "id": "itch", "medium": "game-page", "experiments": ["nine-grid-beasts", "paper-town"] },
    { "id": "xianyu", "medium": "service-listing", "experiments": ["ai-product-team", "prototype-sprint"] },
    { "id": "pm-community", "medium": "community-post", "experiments": ["ai-product-team", "prototype-sprint"] }
  ]
}
```

- [ ] **Step 2: Write a failing deterministic-link test**

```ts
import { describe, expect, it } from "vitest";
import { buildLinks } from "../../scripts/build-utm-links.mjs";

describe("UTM link builder", () => {
  it("creates a stable source-specific game URL", () => {
    const links = buildLinks("https://pilot.example.workers.dev");
    expect(links["nine-grid-beasts"]["itch"]).toBe(
      "https://pilot.example.workers.dev/nine-grid-beasts?utm_source=itch&utm_medium=game-page&utm_campaign=pilot-2026-08&utm_content=nine-grid-beasts",
    );
  });
});
```

- [ ] **Step 3: Implement `buildLinks(origin)` and CLI output**

The module reads `rollout/channels.json`, validates an HTTPS origin, creates one URL for every allowed channel/experiment pair, exports `buildLinks`, and when run directly writes pretty JSON to stdout. It must reject origins with a pathname, query, fragment, or non-HTTPS scheme.

- [ ] **Step 4: Run unit tests**

Run: `npm.cmd test -- tests/unit/utm-script.test.ts`

Expected: PASS with byte-for-byte URL equality.

- [ ] **Step 5: Deploy and record the actual public origin**

Run: `npm.cmd run deploy`

Expected: Wrangler prints one HTTPS `workers.dev` origin for `four-experiment-pilot`. Copy that exact printed origin, without credentials or query parameters, into `rollout/public-links.json` with keys `origin`, `home`, `nineGridBeasts`, `paperTown`, `aiProductTeam`, `prototypeSprint`, and `dashboard`; each path is derived from the approved route table.

- [ ] **Step 6: Generate and save channel links**

Run: `$origin=(Get-Content -Raw rollout/public-links.json | ConvertFrom-Json).origin; node scripts/build-utm-links.mjs $origin | Set-Content -Encoding utf8 rollout/utm-links.json`

Expected: `rollout/utm-links.json` contains only the approved experiment/channel pairs and the real deployed HTTPS origin.

- [ ] **Step 7: Commit deployment metadata, not credentials**

Run: `git add scripts/build-utm-links.mjs rollout/channels.json rollout/public-links.json rollout/utm-links.json tests/unit/utm-script.test.ts; git commit -m "chore: record pilot links and attribution"`

### Task 10: Complete cross-app browser, API and privacy verification

**Files:**
- Modify: `github/four-experiment-pilot/tests/e2e/platform.spec.ts`
- Create: `github/four-experiment-pilot/playwright.config.ts`

- [ ] **Step 1: Configure desktop, Android and iPhone projects**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  use: { baseURL: "http://127.0.0.1:8787", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run preview:worker", url: "http://127.0.0.1:8787/api/health", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
    { name: "iphone", use: { ...devices["iPhone 14"] } },
  ],
});
```

- [ ] **Step 2: Add route and API smoke cases**

Test all five public routes for a visible approved heading; POST one valid event twice with the same `eventId` and assert both responses are accepted while dashboard counts one; POST an unknown event and assert `400 INVALID_EVENT`; submit a consenting test lead and assert `201` response contains only `leadId` and `submittedAt`; assert `/api/dashboard/summary` contains lead count but no contact or need fields.

- [ ] **Step 3: Add orientation, safe-area and background cases**

On Android portrait, `/paper-town` must keep its controls inside the viewport. On Android landscape, `/nine-grid-beasts` must expose the full 3×3 board. Simulate `visibilitychange` for both games and assert their public pause labels appear; the game plans provide the exact `data-testid="game-paused"` hook.

- [ ] **Step 4: Run the full local gate**

Run: `npm.cmd run typecheck; npm.cmd test; npm.cmd run build; npm.cmd run test:e2e`

Expected: every command exits `0`; Playwright passes in all three projects; `dist` contains no reference to `盖世游戏`, employer domains or internal workspace paths.

- [ ] **Step 5: Verify production health and routes**

Read `origin` from `rollout/public-links.json`, then request `/api/health`, `/nine-grid-beasts`, `/paper-town`, `/ai-product-team`, `/prototype-sprint`, and `/dashboard` with `Invoke-WebRequest`.

Expected: health returns `{ "status": "ok" }`; all five pages return HTTP `200` over HTTPS.

- [ ] **Step 6: Commit verification configuration**

Run: `git add playwright.config.ts tests/e2e/platform.spec.ts; git commit -m "test: verify public pilot flows"`

### Task 11: Prepare truthful channel publication packages

**Files:**
- Create: `github/four-experiment-pilot/rollout/posts/games.md`
- Create: `github/four-experiment-pilot/rollout/posts/services.md`
- Create: `github/four-experiment-pilot/rollout/publication-log.csv`

- [ ] **Step 1: Write two game posts with no competitor confusion**

`games.md` contains one post per game. The《九格异兽》headline is `十分钟完成一局的原创异兽构筑，想找人帮我判断它到底好不好玩`; the《纸镇失控》headline is `不是放塔后等结果：划开纸面才能救场的原创剪纸塔防`. Each post states this is an early test, includes one real screenshot, uses its channel-specific UTM URL, asks for completion/replay feedback, and does not use “金铲铲复刻”“国产金铲铲” or imply publisher endorsement.

- [ ] **Step 2: Write two service posts with fixed scope and truthful status**

`services.md` contains one post for AI 产品部部署 and one for 48 小时可玩验证冲刺. Each includes target user, three concrete deliverables, fixed starting price, exclusions, a real case URL, and `首批试点申请，不代表已付款或自动成交`; it does not use employer cases or claim existing paying customers.

- [ ] **Step 3: Create the publication audit log**

```csv
published_at,experiment,channel,utm_url,post_url,status,notes
```

Only add a row after a platform visibly confirms publication. Drafts remain unlogged. Failed or pending verification is recorded as `failed` or `pending`, never `published`.

- [ ] **Step 4: User completes platform logins and final send confirmation**

For itch.io, 闲鱼 and each selected community, the user performs login, CAPTCHA, device verification and agreement acceptance. Before the first external post on each platform, show the exact final content, target account, public URL and privacy impact. Publish only after that platform-specific confirmation; the earlier approval authorizes the pilot but does not authorize bypassing platform security or silently accepting new agreements.

- [ ] **Step 5: Verify UTM arrival after each real post**

Open the published post URL, follow its UTM link once, then check `/dashboard` and D1 for the matching `source`, `medium`, `campaign`, and `content`.

Expected: one test visit is attributed to the intended channel; remove the test session from KPI reports by tagging publication verification events with `properties.test = true` and excluding those rows in repository aggregates.

- [ ] **Step 6: Commit public copy and factual log**

Run: `git add rollout/posts rollout/publication-log.csv; git commit -m "docs: add truthful pilot publication kit"`

### Task 12: Run the seven-day daily reporting and final decision loop

**Files:**
- Create: `github/four-experiment-pilot/rollout/daily-report-template.md`
- Create: `github/four-experiment-pilot/rollout/reports/.gitkeep`
- Create after each completed day: `github/four-experiment-pilot/rollout/reports/2026-08-06.md` through `github/four-experiment-pilot/rollout/reports/2026-08-12.md`
- Create on day 7: `github/four-experiment-pilot/rollout/reports/2026-08-12-final-decision.md`

- [ ] **Step 1: Create the immutable report template**

```markdown
# 四实验日报：上一自然日

## 结论

- 事实：上一自然日真实访问、核心行为和咨询数字。
- 判断：只解释有足够样本支持的变化；其余标记“证据不足”。
- 动作：下一日只执行一个可归因调整。

## 数据

| 实验 | 有效访问 | 开始 | 完成 | 重开/案例完成 | 报价点击 | 咨询 | 核心转化 |
|---|---:|---:|---:|---:|---:|---:|---:|

## 渠道

| 来源 | 有效访问 | 核心行为 | 异常 |
|---|---:|---:|---|

## 数据质量

- 数据截止：北京时间 23:59。
- 排除：`properties.test = true` 的验收事件。
- 故障与缺数：如实记录，不以 0 代替未知。
```

When copying the template, replace `上一自然日` in the title with the exact covered date from `2026-08-06` through `2026-08-12`.

- [ ] **Step 2: Register the explicit seven-day monitoring goal**

Create the persistent objective: `监测四个已部署实验从 2026-08-06 至 2026-08-12 的真实数据，每日上午读取昨日汇总、生成中文日报并在第7日给出保留/返工/停止结论。`

Expected: the monitoring mechanism reports an active goal with no invented token budget and runs only after all four public links and at least one real channel are live.

- [ ] **Step 3: Generate each daily report from D1 aggregates**

At 09:30 or later Asia/Shanghai, request `/api/dashboard/summary`, query the previous date's `daily_summaries`, and write the exact returned numbers into that date's report. If Cloudflare or D1 is unavailable, record `数据暂不可用` and the last successful timestamp; do not substitute zeros.

- [ ] **Step 4: Apply one-change-per-day discipline**

Choose at most one intervention per experiment per day: first-screen copy, tutorial timing, one balance value, CTA wording, price presentation, or one channel. Record its version and timestamp in the report so the next day's change is attributable. Do not add new characters, stages, service tiers or channels merely to make the project look active.

- [ ] **Step 5: Produce the day-seven decision report**

For each experiment compare actual metrics with the approved thresholds, list sample size and channel mix, separate fact from inference, and return exactly one of `保留`, `返工`, `停止`, or `证据不足`. A service requires a real lead to claim demand; a game requires real completion/replay behavior to claim play value; AI playtest scores are listed separately.

- [ ] **Step 6: Commit each factual report**

Run after the report is verified: `$date=(Get-Date).AddDays(-1).ToString('yyyy-MM-dd'); git add "rollout/reports/$date.md"; git commit -m "data: record pilot report $date"`

Expected: one auditable commit per reporting day; contact details and raw lead text never enter Git.

## Final implementation gate

Before public handoff, run:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
rg -n "盖世游戏|GameHub|z3635|C:\\Users" dist src rollout/posts
```

Expected: the first four commands PASS. The final search returns no employer brand, personal Windows path or user identifier in public assets and copy. Then provide the five real URLs, publication URLs, test evidence, current sample size, known risks and the next 09:30 reporting time.
