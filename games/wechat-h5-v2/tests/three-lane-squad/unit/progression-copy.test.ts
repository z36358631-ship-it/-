import { describe, expect, it } from "vitest";
import {
  nextProgressionGoal,
  shouldOfferRecoveryRun,
} from "../../../apps/three-lane-squad/src/meta/progression";
import { createDefaultSave, recordRun } from "../../../apps/three-lane-squad/src/meta/saveModel";
import {
  formationLabel,
  heroRoleLabel,
  variantLabel,
} from "../../../apps/three-lane-squad/src/presentation/labels";

describe("three lane progression and player-facing copy", () => {
  it("keeps reserve-slot locked after three unclassified losses", () => {
    let save = createDefaultSave();
    for (let index = 0; index < 3; index += 1) {
      save = recordRun(save, {
        runId: `loss-${index}`,
        result: "lost",
        formationTag: "unclassified",
        variant: "balanced-front",
        elapsedMs: 60_000,
        date: "2026-07-29",
      });
    }
    expect(save.unlockedDoctrineIds).toEqual([
      "opening-scout",
      "rapid-relay",
    ]);
    expect(nextProgressionGoal(save)).toEqual({
      title: "布成三路均衡",
      detail: "三路都部署英雄并完成一局，解锁「预备席」。胜负不限。",
      progress: "0 / 1 次",
    });
  });

  it("unlocks reserve-slot from a balanced run regardless of result", () => {
    const save = recordRun(createDefaultSave(), {
      runId: "balanced-loss",
      result: "lost",
      formationTag: "balanced",
      variant: "lockdown",
      elapsedMs: 95_000,
      date: "2026-07-29",
    });
    expect(save.unlockedDoctrineIds).toContain("reserve-slot");
  });

  it("localizes internal identifiers before they reach players", () => {
    expect(variantLabel("balanced-front")).toBe("均衡前线");
    expect(variantLabel("lockdown")).toBe("封锁战");
    expect(formationLabel("mobile-reserve")).toBe("机动预备");
    expect(heroRoleLabel("armor-break")).toBe("重甲破防");
  });

  it("offers one transparent recovery run after two consecutive losses", () => {
    let save = createDefaultSave();
    for (let index = 0; index < 2; index += 1) {
      save = recordRun(save, {
        runId: `loss-${index}`,
        result: "lost",
        formationTag: "unclassified",
        variant: "balanced-front",
        elapsedMs: 60_000,
        date: "2026-07-29",
      });
    }
    expect(shouldOfferRecoveryRun(save)).toBe(true);
    const won = recordRun(save, {
      runId: "win",
      result: "won",
      formationTag: "balanced",
      variant: "lockdown",
      elapsedMs: 90_000,
      date: "2026-07-29",
    });
    expect(shouldOfferRecoveryRun(won)).toBe(false);
  });
});
