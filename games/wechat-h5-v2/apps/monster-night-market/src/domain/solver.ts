import { boardKey, shiftBoard } from "./board";
import { matchesRecipe } from "./recipe-engine";
import type {
  Board,
  RecipeDefinition,
  ShiftAction,
} from "./types";

export const SOLVER_ACTIONS: readonly ShiftAction[] = [
  ...([0, 1, 2, 3] as const).flatMap((index) => [
    { axis: "row" as const, index, direction: "right" as const },
    { axis: "row" as const, index, direction: "left" as const },
  ]),
  ...([0, 1, 2, 3] as const).flatMap((index) => [
    { axis: "column" as const, index, direction: "down" as const },
    { axis: "column" as const, index, direction: "up" as const },
  ]),
];

interface SearchNode {
  readonly board: Board;
  readonly path: readonly ShiftAction[];
}

export function findShortestPlan(
  initial: Board,
  recipe: RecipeDefinition,
  maxDepth = 6,
): ShiftAction[] | null {
  if (maxDepth < 0) {
    throw new RangeError("Solver maxDepth cannot be negative");
  }
  if (matchesRecipe(initial, recipe)) {
    return [];
  }

  const queue: SearchNode[] = [{ board: initial, path: [] }];
  const visited = new Set([boardKey(initial)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.path.length >= maxDepth) {
      continue;
    }
    for (const action of SOLVER_ACTIONS) {
      const board = shiftBoard(current.board, action);
      const key = boardKey(board);
      if (visited.has(key)) {
        continue;
      }
      const path = [...current.path, action];
      if (matchesRecipe(board, recipe)) {
        return path;
      }
      visited.add(key);
      queue.push({ board, path });
    }
  }
  return null;
}

export function assertReachable(
  board: Board,
  recipe: RecipeDefinition,
  maxDepth = 6,
): void {
  if (findShortestPlan(board, recipe, maxDepth) === null) {
    throw new Error(
      `Generated board cannot reach recipe ${recipe.id} within ${maxDepth} moves`,
    );
  }
}
