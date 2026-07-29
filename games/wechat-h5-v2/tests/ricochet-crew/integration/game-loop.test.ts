import { describe, expect, it, vi } from "vitest";
import { createRicochetGame } from "../../../apps/ricochet-crew/src/game/create-ricochet-game";

describe("弹珠暴走团完整单发", () => {
  it("瞄准松手后进入飞行，途中技能只能使用一次", () => {
    const game = createRicochetGame({
      seed: 20260729,
      heroId: "tuo",
      runId: "run-1",
      emit: vi.fn(),
    });
    game.beginAim({ x: 195, y: 748 });
    game.updateAim({ x: 145, y: 808 });
    expect(game.preview()?.points.length).toBeGreaterThan(1);
    game.releaseAim();
    expect(game.snapshot().mode).toBe("flying");
    expect(game.snapshot().shot?.skillAvailable).toBe(true);
    game.useSkill();
    expect(game.snapshot().shot?.skillAvailable).toBe(false);
  });

  it("系统取消只清除瞄准，不消耗出手机会", () => {
    const game = createRicochetGame({
      seed: 20260729,
      heroId: "tuo",
      runId: "run-cancel",
      emit: vi.fn(),
    });
    game.beginAim({ x: 195, y: 748 });
    game.updateAim({ x: 145, y: 808 });
    expect(game.preview()).not.toBeNull();

    game.cancelAim();

    expect(game.preview()).toBeNull();
    expect(game.snapshot().mode).toBe("aiming");
    expect(game.snapshot().shot).toBeNull();
    expect(game.snapshot().shotsRemaining).toBe(5);
  });

  it("五次房间选择后进入三部位 Boss，按顺序可击破", () => {
    const game = createRicochetGame({
      seed: 1,
      heroId: "mio",
      runId: "run-full",
      emit: vi.fn(),
    });
    for (let room = 0; room < 5; room += 1) {
      game.debugCompleteRoomForTest();
      expect(game.snapshot().mode).toBe("choosing");
      game.choose(game.snapshot().offer[0]!.id);
    }
    expect(game.snapshot().roomIndex).toBe(5);
    expect(game.snapshot().boss?.phase).toBe("shielded");
    game.damageBossPart("armor", 999);
    game.damageBossPart("weapon", 999);
    game.damageBossPart("core", 999);
    expect(game.snapshot().mode).toBe("won");
  });
});
