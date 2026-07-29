import { describe, expect, it } from "vitest";
import { classifyFormation, evaluateRunQuality, evaluateThreeRunVariety } from "../../../apps/three-lane-squad/src/domain/antiIdle";
import { createBattle } from "../../../apps/three-lane-squad/src/domain/createBattle";
import { dailyChallengeForDate, recentDailyDates } from "../../../apps/three-lane-squad/src/meta/dailyChallenge";
import { createDefaultSave, recordRun } from "../../../apps/three-lane-squad/src/meta/saveModel";
import { buildLocalRunReport, buildThreeRunReport } from "../../../apps/three-lane-squad/src/quality/localReport";
import { projectDomainEvent } from "../../../apps/three-lane-squad/src/quality/projectEvents";

const squad = ["guardian", "ranger", "mage", "engineer", "priest"] as const;

describe("meta and quality", () => {
  it("uses stable daily seeds and seven replayable dates", () => {
    expect(dailyChallengeForDate("2026-07-29")).toEqual(dailyChallengeForDate("2026-07-29"));
    expect(recentDailyDates("2026-07-29")).toEqual([
      "2026-07-29", "2026-07-28", "2026-07-27", "2026-07-26",
      "2026-07-25", "2026-07-24", "2026-07-23",
    ]);
  });

  it("unlocks choices without permanent combat stats", () => {
    const next = recordRun(createDefaultSave(), {
      runId: "one",
      result: "won",
      formationTag: "balanced",
      variant: "balanced-front",
      elapsedMs: 330_000,
      date: "2026-07-29",
    });
    expect(next.commanderLevel).toBe(2);
    expect(next.unlockedDoctrineIds).toContain("rapid-relay");
    expect(JSON.stringify(next)).not.toMatch(/attack|damage|power|生命值|攻击力/i);
  });

  it("classifies actual formations and enforces density", () => {
    const state = createBattle({ seed: 1, runId: "formation", runOrdinal: 0, squad, mode: "standard" });
    state.heroes = ([0, 1, 2] as const).map((lane) => ({
      instanceId: `h-${lane}`,
      heroId: lane === 0 ? "guardian" : lane === 1 ? "ranger" : "priest",
      deployedAtMs: 0,
      tier: 1,
      position: { lane, column: 1 },
      status: "ready",
      moveStartedAtMs: null,
      moveEndsAtMs: null,
      transferReadyAtMs: 0,
      nextAttackAtMs: 0,
    }));
    expect(classifyFormation(state)).toBe("balanced");
    expect(evaluateRunQuality({ elapsedMs: 360_000, meaningfulActionCount: 36, longestDecisionGapMs: 12_000 }).passed).toBe(true);
    expect(evaluateThreeRunVariety(["balanced", "mobile-reserve", "focus-kill"]).passed).toBe(true);
  });

  it("projects only event allowlists", () => {
    const projected = projectDomainEvent("run", {
      seq: 1,
      atMs: 500,
      type: "transfer",
      payload: { heroInstanceId: "hero-1", to: { lane: 2, column: 1 }, credential: "secret" },
    });
    expect(projected?.name).toBe("squad_transfer");
    expect(JSON.stringify(projected)).not.toContain("secret");
  });

  it("builds a three-run report from real variants and formations", () => {
    const make = (
      runId: string,
      variant: "balanced-front" | "lockdown" | "elite-rush",
      formationTag: "balanced" | "mobile-reserve" | "focus-kill",
    ) => buildLocalRunReport({
      runId,
      variant,
      formationTag,
      result: "won",
      elapsedMs: 360_000,
      meaningfulActionCount: 36,
      longestDecisionGapMs: 10_000,
    });
    expect(buildThreeRunReport([
      make("a", "balanced-front", "balanced"),
      make("b", "lockdown", "mobile-reserve"),
      make("c", "elite-rush", "focus-kill"),
    ])).toMatchObject({ passed: true, uniqueVariants: 3, uniqueFormations: 3 });
  });
});
