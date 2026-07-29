import { describe, expect, it } from "vitest";
import {
  boardKey,
  createBoard,
  shiftBoard,
} from "../../../apps/monster-night-market/src/domain/board";

describe("怪兽夜市 4×4 棋盘", () => {
  it("整行右移一格并从另一侧循环进入，且不修改原棋盘", () => {
    const board = createBoard([
      ["chili", "tofu", "mushroom", "lotus"],
      ["fish", "riceCake", "ice", "broth"],
      ["tofu", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "chili"],
    ]);

    const next = shiftBoard(board, {
      axis: "row",
      index: 0,
      direction: "right",
    });

    expect(next[0]!.map((cell) => cell.ingredient)).toEqual([
      "lotus",
      "chili",
      "tofu",
      "mushroom",
    ]);
    expect(board[0]!.map((cell) => cell.ingredient)).toEqual([
      "chili",
      "tofu",
      "mushroom",
      "lotus",
    ]);
    expect(boardKey(next)).not.toBe(boardKey(board));
  });

  it("整列上移一格并保留格子的冻结状态", () => {
    const board = createBoard([
      ["chili", "tofu", "mushroom", "lotus"],
      ["fish", "riceCake", "ice", "broth"],
      ["tofu", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "chili"],
    ]);
    const frozen = board.map((row) => row.map((cell) => ({ ...cell })));
    frozen[0]![2] = { ingredient: "mushroom", frozen: 1 };

    const next = shiftBoard(frozen, {
      axis: "column",
      index: 2,
      direction: "up",
    });

    expect(next.map((row) => row[2]!.ingredient)).toEqual([
      "ice",
      "lotus",
      "broth",
      "mushroom",
    ]);
    expect(next[3]![2]!.frozen).toBe(1);
  });

  it("拒绝非 4×4 棋盘和行列方向不匹配的动作", () => {
    expect(() => createBoard([["chili"]])).toThrow("exactly 4x4");
    const board = createBoard([
      ["chili", "tofu", "mushroom", "lotus"],
      ["fish", "riceCake", "ice", "broth"],
      ["tofu", "mushroom", "lotus", "fish"],
      ["riceCake", "ice", "broth", "chili"],
    ]);
    expect(() =>
      shiftBoard(board, {
        axis: "row",
        index: 0,
        direction: "up",
      }),
    ).toThrow("Row shift");
  });
});
