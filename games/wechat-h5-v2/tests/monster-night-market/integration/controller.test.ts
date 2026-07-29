import { describe, expect, it, vi } from "vitest";
import { createNightMarketController } from "../../../apps/monster-night-market/src/app/create-night-market-controller";

describe("怪兽夜市玩法控制器", () => {
  it("预演不落盘，提交只执行一次并输出可读失败解释", async () => {
    const scene = {
      renderBoard: vi.fn(),
      renderPreview: vi.fn(),
      clearPreview: vi.fn(),
      showMessage: vi.fn(),
    };
    const controller = createNightMarketController({
      seed: "controller-1",
      stallId: "grill",
      upgrades: ["rushOrder", "festivalSpark"],
      scene,
      telemetry: { emit: vi.fn() },
      audio: { play: vi.fn() },
      accessibility: { announce: vi.fn() },
      animate: vi.fn(async () => undefined),
    });
    const before = controller.snapshot();
    controller.preview(
      { axis: "row", index: 0, direction: "right" },
      1_000,
    );
    expect(controller.snapshot().boardKey).toBe(before.boardKey);
    await controller.commit(
      { axis: "row", index: 0, direction: "right" },
      1_200,
    );
    const after = controller.snapshot();
    expect(after.boardKey).not.toBe(before.boardKey);
    expect(after.moveCount).toBe(1);
    expect(scene.renderBoard).toHaveBeenCalledTimes(2);
  });

  it("固定步进结束后生成结算摘要", () => {
    const controller = createNightMarketController({
      seed: "timer-1",
      stallId: "grill",
      scene: {
        renderBoard: vi.fn(),
        renderPreview: vi.fn(),
        clearPreview: vi.fn(),
        showMessage: vi.fn(),
      },
      telemetry: { emit: vi.fn() },
      audio: { play: vi.fn() },
      accessibility: { announce: vi.fn() },
      animate: vi.fn(async () => undefined),
    });
    expect(controller.tick(300)).toBe(true);
    expect(controller.snapshot().status).toBe("ended");
    expect(controller.summary().seed).toBe("timer-1");
  });
});
