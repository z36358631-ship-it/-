import { describe, expect, it } from "vitest";
import { RECIPES } from "../../../apps/monster-night-market/src/content/catalog";
import { createBoard } from "../../../apps/monster-night-market/src/domain/board";
import {
  previewOrders,
  resolveOrders,
} from "../../../apps/monster-night-market/src/domain/order-engine";
import type {
  Order,
  OrderProgress,
} from "../../../apps/monster-night-market/src/domain/types";

const board = createBoard([
  ["tofu", "chili", "mushroom", "lotus"],
  ["fish", "broth", "ice", "riceCake"],
  ["mushroom", "tofu", "chili", "lotus"],
  ["ice", "lotus", "riceCake", "broth"],
]);

describe("怪兽夜市订单解析", () => {
  it("预演只读，不修改订单进度", () => {
    const orders: Order[] = [
      {
        id: "normal",
        customerId: "fireCub",
        recipeIds: ["emberTofu"],
        mode: "any",
        expiresAfterMoves: 5,
      },
    ];
    const progress: OrderProgress = { sequenceIndexByOrder: {} };

    expect(
      previewOrders(board, orders, progress, RECIPES).completedOrderIds,
    ).toEqual(["normal"]);
    expect(progress.sequenceIndexByOrder).toEqual({});
  });

  it("VIP 必须跨步按顺序完成两道菜", () => {
    const orders: Order[] = [
      {
        id: "vip",
        customerId: "lanternFox",
        recipeIds: ["emberTofu", "fishBroth"],
        mode: "sequence",
        expiresAfterMoves: 6,
      },
    ];

    const first = resolveOrders(
      board,
      orders,
      { sequenceIndexByOrder: {} },
      RECIPES,
      new Set(["emberTofu"]),
    );
    expect(first.completedOrderIds).toEqual([]);
    expect(first.progress.sequenceIndexByOrder.vip).toBe(1);

    const second = resolveOrders(
      board,
      orders,
      first.progress,
      RECIPES,
      new Set(["fishBroth"]),
    );
    expect(second.completedOrderIds).toEqual(["vip"]);
    expect(second.progress.sequenceIndexByOrder.vip).toBeUndefined();
  });

  it("命中后续配方但缺少当前配方时给出顺序错误", () => {
    const orders: Order[] = [
      {
        id: "vip",
        customerId: "lanternFox",
        recipeIds: ["emberTofu", "fishBroth"],
        mode: "sequence",
        expiresAfterMoves: 6,
      },
    ];
    const result = resolveOrders(
      board,
      orders,
      { sequenceIndexByOrder: {} },
      RECIPES,
      new Set(["fishBroth"]),
    );
    expect(result.explanations).toEqual([
      {
        orderId: "vip",
        status: "wrongSequence",
        expectedRecipeId: "emberTofu",
      },
    ]);
  });

  it("共享盘允许同一步完成两名顾客的相同需求", () => {
    const orders: Order[] = ["shared-a", "shared-b"].map((id) => ({
      id,
      customerId: "riverImp",
      recipeIds: ["fishBroth"],
      mode: "shared" as const,
      expiresAfterMoves: 5,
    }));
    expect(
      resolveOrders(
        board,
        orders,
        { sequenceIndexByOrder: {} },
        RECIPES,
      ).completedOrderIds,
    ).toEqual(["shared-a", "shared-b"]);
  });
});
