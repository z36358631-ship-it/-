import type {
  Board,
  IngredientId,
  RecipeDefinition,
  RecipeId,
} from "./types";

function contiguousWindows(
  board: Board,
  size: number,
): IngredientId[][] {
  const lines: IngredientId[][] = [
    ...board.map((row) => row.map((cell) => cell.ingredient)),
    ...([0, 1, 2, 3] as const).map((column) =>
      board.map((row) => row[column]!.ingredient),
    ),
  ];
  return lines.flatMap((line) =>
    Array.from(
      { length: Math.max(0, line.length - size + 1) },
      (_, index) => line.slice(index, index + size),
    ),
  );
}

function sameMultiset(
  left: readonly IngredientId[],
  right: readonly IngredientId[],
): boolean {
  return [...left].sort().join("|") === [...right].sort().join("|");
}

export function matchesRecipe(
  board: Board,
  recipe: RecipeDefinition,
): boolean {
  const windows = contiguousWindows(board, recipe.ingredients.length);
  if (recipe.arrangement === "ordered") {
    return windows.some((window) =>
      window.every(
        (ingredient, index) => ingredient === recipe.ingredients[index],
      ),
    );
  }
  return windows.some((window) =>
    sameMultiset(window, recipe.ingredients),
  );
}

export function matchingRecipeIds(
  board: Board,
  recipes: readonly RecipeDefinition[],
): ReadonlySet<RecipeId> {
  return new Set(
    recipes
      .filter((recipe) => matchesRecipe(board, recipe))
      .map((recipe) => recipe.id),
  );
}
