import { describe, expect, it } from "vitest";
import { RECIPES } from "../../../apps/monster-night-market/src/content/catalog";
import { shiftBoard } from "../../../apps/monster-night-market/src/domain/board";
import { previewOrders } from "../../../apps/monster-night-market/src/domain/order-engine";
import {
  FIRST_ORDER,
  FIRST_ORDER_BOARD,
} from "../../../apps/monster-night-market/src/domain/tutorial";

describe("怪兽夜市首单最小闭环", () => {
  it("预演和提交使用同一纯规则，得到相同成单结果", () => {
    const action = {
      axis: "row" as const,
      index: 0 as const,
      direction: "right" as const,
    };
    const previewBoard = shiftBoard(FIRST_ORDER_BOARD, action);
    const preview = previewOrders(
      previewBoard,
      [FIRST_ORDER],
      { sequenceIndexByOrder: {} },
      RECIPES,
    );
    const committedBoard = shiftBoard(FIRST_ORDER_BOARD, action);
    const committed = previewOrders(
      committedBoard,
      [FIRST_ORDER],
      { sequenceIndexByOrder: {} },
      RECIPES,
    );

    expect(preview.completedOrderIds).toEqual(["tutorial:first"]);
    expect(committed).toEqual(preview);
  });
});
