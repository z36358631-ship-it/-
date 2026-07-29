import { describe, expect, it } from "vitest";
import {
  advanceChain,
  advanceClock,
  applyShift,
  createRun,
} from "../../../apps/monster-night-market/src/domain/run-machine";
import { RECIPES } from "../../../apps/monster-night-market/src/content/catalog";
import { findShortestPlan } from "../../../apps/monster-night-market/src/domain/solver";

describe("怪兽夜市营业状态机", () => {
  it("第一次有效滑动完成首单、补齐双订单并记录顾客", () => {
    const run = createRun({ seed: "run-001", stallId: "grill" });
    const next = applyShift(run, {
      axis: "row",
      index: 0,
      direction: "right",
    });

    expect(next.moveCount).toBe(1);
    expect(next.completedRecipeIds.has("emberTofu")).toBe(true);
    expect(next.metCustomerIds.has("fireCub")).toBe(true);
    expect(next.orders).toHaveLength(2);
    expect(next.score).toBeGreaterThan(0);
    expect(next.servedOrderCount).toBe(1);
    expect(next.lastExplanation).toContain("完成");
  });

  it("同一步完成两张订单时累计出餐加二", () => {
    const run = createRun({
      seed: "double-serve",
      stallId: "grill",
    });
    const next = applyShift(run, {
      axis: "row",
      index: 1,
      direction: "left",
    });

    expect(next.servedOrderCount).toBe(2);
    expect(next.lastExplanation).toContain("完成 2 单");
  });

  it("VIP 顺序单只在最后一道配方完成时计一单", () => {
    const run = createRun({
      seed: "vip-sequence",
      stallId: "grill",
      upgrades: ["rushOrder"],
    });
    const firstStep = applyShift(run, {
      axis: "row",
      index: 1,
      direction: "right",
    });
    // The ordinary fire-cub order completes on this move; the VIP order
    // only advances to its second recipe and must not count yet.
    expect(firstStep.servedOrderCount).toBe(1);
    expect(
      firstStep.orderProgress.sequenceIndexByOrder[
        "vip-sequence:order:1"
      ],
    ).toBe(1);

    const lotusIce = RECIPES.find(
      (recipe) => recipe.id === "lotusIce",
    )!;
    const plan = findShortestPlan(
      firstStep.board,
      lotusIce,
      4,
    );
    expect(plan).not.toBeNull();
    const completed = plan!.reduce(
      (current, action) => applyShift(current, action),
      firstStep,
    );
    expect(completed.servedOrderCount).toBeGreaterThan(
      firstStep.servedOrderCount,
    );
    expect(
      completed.orders.some(
        (order) => order.id === "vip-sequence:order:1",
      ),
    ).toBe(false);
  });

  it("连续三次有效出餐触发一次庆典并重置连灶", () => {
    const first = advanceChain(0, 1);
    const second = advanceChain(first.chain, 1);
    const third = advanceChain(second.chain, 1);
    expect(first).toEqual({ chain: 1, festivalTriggered: false });
    expect(second).toEqual({ chain: 2, festivalTriggered: false });
    expect(third).toEqual({ chain: 0, festivalTriggered: true });
    expect(advanceChain(2, 0)).toEqual({
      chain: 0,
      festivalTriggered: false,
    });
  });

  it("耐心改造只增加等待步数，不写永久数值倍率", () => {
    const normal = createRun({ seed: "run-002", stallId: "hotpot" });
    const patient = createRun({
      seed: "run-002",
      stallId: "hotpot",
      upgrades: ["patientQueue"],
    });
    expect(
      patient.orders[0]!.expiresAfterMoves -
        normal.orders[0]!.expiresAfterMoves,
    ).toBe(2);
    expect(JSON.stringify(patient)).not.toMatch(
      /permanentMultiplier|attackPower/,
    );
  });

  it("失败反馈只显示玩家可读的中文配方名", () => {
    let run = createRun({
      seed: "localized-feedback",
      stallId: "grill",
    });
    const actions = [
      { axis: "row", index: 1, direction: "left" },
      { axis: "column", index: 2, direction: "down" },
      { axis: "row", index: 3, direction: "right" },
      { axis: "column", index: 0, direction: "up" },
    ] as const;
    let explanation = "";
    for (let index = 0; index < 24; index += 1) {
      const servedBefore = run.servedOrderCount;
      run = applyShift(run, actions[index % actions.length]!);
      if (run.lastExplanation.includes("没有成单")) {
        expect(run.servedOrderCount).toBe(servedBefore);
        explanation = run.lastExplanation;
        break;
      }
    }

    expect(explanation).toContain("没有成单");
    for (const recipe of RECIPES) {
      expect(explanation).not.toContain(recipe.id);
    }
    expect(explanation).toMatch(
      /火纹豆腐|月蘑串|莲花冰盏|云鱼高汤|火椒年糕|玄冰豆腐|双味串|借火汤|冰莲杯|共享火锅|贵客双拼|子夜盛宴/u,
    );
  });

  it("只按显式 delta 推进，300 秒结束且负 delta 不倒退", () => {
    const run = createRun({ seed: "clock-001", stallId: "dessert" });
    expect(advanceClock(run, -100).remainingMs).toBe(300_000);
    expect(advanceClock(run, 299_999).status).toBe("playing");
    expect(advanceClock(run, 300_000).status).toBe("ended");
  });
});
