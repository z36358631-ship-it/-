import { describe, expect, it, vi } from "vitest";
import { createNightMarketController } from "../../../apps/monster-night-market/src/app/create-night-market-controller";
import { SOLVER_ACTIONS } from "../../../apps/monster-night-market/src/domain/solver";

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
  it("only reports the first accepted commit and first served order once", async () => {
    const onFirstInput = vi.fn();
    const onFirstPayoff = vi.fn();
    const controller = createNightMarketController({
      seed: "telemetry-once",
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
      onFirstInput,
      onFirstPayoff,
    });
    const servingAction = {
      axis: "row" as const,
      index: 0 as const,
      direction: "right" as const,
    };

    controller.preview(servingAction, 900);
    expect(onFirstInput).not.toHaveBeenCalled();
    expect(onFirstPayoff).not.toHaveBeenCalled();

    await controller.commit(servingAction, 1_000);
    await controller.commit(servingAction, 1_200);

    expect(onFirstInput).toHaveBeenCalledOnce();
    expect(onFirstInput).toHaveBeenCalledWith({
      action: servingAction,
      at: 1_000,
      moveCount: 1,
    });
    expect(onFirstPayoff).toHaveBeenCalledOnce();
    expect(onFirstPayoff).toHaveBeenCalledWith({
      at: 1_000,
      completedOrderCount: 1,
      servedOrderCount: 1,
    });
  });

  it("does not report payoff when an accepted commit serves no order", async () => {
    const onFirstInput = vi.fn();
    const onFirstPayoff = vi.fn();
    const controller = createNightMarketController({
      seed: "telemetry-no-payoff",
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
      onFirstInput,
      onFirstPayoff,
    });
    const noPayoffAction = SOLVER_ACTIONS.find(
      (action) =>
        controller.preview(action, 500).completedOrderIds.length === 0,
    );

    expect(noPayoffAction).toBeDefined();
    await controller.commit(noPayoffAction!, 600);

    expect(onFirstInput).toHaveBeenCalledOnce();
    expect(onFirstPayoff).not.toHaveBeenCalled();
  });
});
