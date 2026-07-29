import {
  BOARD_SIZE,
  type Board,
  type Cell,
  type IngredientId,
  type ShiftAction,
} from "./types";

export function assertBoard(board: Board): void {
  if (
    board.length !== BOARD_SIZE ||
    board.some((row) => row.length !== BOARD_SIZE)
  ) {
    throw new RangeError("Night Market board must be exactly 4x4");
  }
}

export function createBoard(
  rows: readonly (readonly IngredientId[])[],
): Board {
  if (
    rows.length !== BOARD_SIZE ||
    rows.some((row) => row.length !== BOARD_SIZE)
  ) {
    throw new RangeError("Night Market board must be exactly 4x4");
  }
  return rows.map((row) =>
    row.map((ingredient): Cell => ({ ingredient, frozen: 0 })),
  );
}

export function cloneBoard(board: Board): Cell[][] {
  assertBoard(board);
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function shiftBoard(board: Board, action: ShiftAction): Board {
  assertBoard(board);
  if (
    action.axis === "row" &&
    action.direction !== "left" &&
    action.direction !== "right"
  ) {
    throw new TypeError("Row shift direction must be left or right");
  }
  if (
    action.axis === "column" &&
    action.direction !== "up" &&
    action.direction !== "down"
  ) {
    throw new TypeError("Column shift direction must be up or down");
  }

  const next = cloneBoard(board);
  const line =
    action.axis === "row"
      ? next[action.index]!.map((cell) => ({ ...cell }))
      : next.map((row) => ({ ...row[action.index]! }));
  const forward =
    action.direction === "right" || action.direction === "down";
  const moved = forward
    ? [line[line.length - 1]!, ...line.slice(0, -1)]
    : [...line.slice(1), line[0]!];

  if (action.axis === "row") {
    next[action.index] = moved;
  } else {
    moved.forEach((cell, rowIndex) => {
      next[rowIndex]![action.index] = cell;
    });
  }
  return next;
}

export function boardKey(board: Board): string {
  assertBoard(board);
  return board
    .flat()
    .map((cell) => `${cell.ingredient}:${cell.frozen}`)
    .join("|");
}
