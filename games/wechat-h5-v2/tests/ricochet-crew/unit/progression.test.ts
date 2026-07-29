import { describe, expect, it } from "vitest";
import {
  applyRunProgress,
  createDefaultProgress,
} from "../../../apps/ricochet-crew/src/run/progression";
import { HEROES } from "../../../apps/ricochet-crew/src/content/catalog";

describe("弹珠局外成长", () => {
  it("只解锁英雄、模组和外观，不保存永久攻击倍率", () => {
    const next = applyRunProgress(
      createDefaultProgress(),
      {
        won: true,
        heroId: "tuo",
        maxCombo: 9,
        buildTags: ["bank", "skill"],
      },
    );
    expect(next.unlockedHeroIds).toContain("mio");
    expect(JSON.stringify(next)).not.toMatch(
      /attack|damage|multiplier|power/i,
    );
    expect(
      new Set(
        Object.values(HEROES).map(
          (hero) => hero.portraitPosition,
        ),
      ),
    ).toEqual(new Set(["left", "center", "right"]));
    expect(JSON.stringify(HEROES)).not.toContain("emoji");
  });
});
