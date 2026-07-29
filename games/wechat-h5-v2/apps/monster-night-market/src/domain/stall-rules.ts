import type {
  Board,
  RecipeId,
  StallId,
  UpgradeId,
} from "./types";

export interface StallOutcome {
  readonly score: number;
  readonly freezeDelta: number;
  readonly retainedIngredients: readonly string[];
  readonly explanation: string;
}

export function applyStallRule(
  stallId: StallId,
  board: Board,
  recipeIds: readonly RecipeId[],
  upgrades: ReadonlySet<UpgradeId>,
): StallOutcome {
  const baseScore = recipeIds.length * 100;
  if (stallId === "grill") {
    const fireRecipes = recipeIds.filter(
      (recipeId) =>
        recipeId === "emberTofu" ||
        recipeId === "spicyRiceCake" ||
        recipeId === "doubleSkewer",
    ).length;
    const echoMultiplier = upgrades.has("emberEcho") ? 2 : 1;
    const fireBonus = fireRecipes * 25 * echoMultiplier;
    return {
      score: baseScore + fireBonus,
      freezeDelta: upgrades.has("cleanCounter") ? -1 : 0,
      retainedIngredients: [],
      explanation:
        fireBonus > 0
          ? `烧烤摊：${fireRecipes} 道火系配方触发相邻加成`
          : "烧烤摊：本步没有火系相邻加成",
    };
  }

  if (stallId === "dessert") {
    const frozenCells = board
      .flat()
      .filter((cell) => cell.frozen > 0).length;
    const encore = upgrades.has("sweetEncore") ? 25 : 0;
    return {
      score: baseScore + frozenCells * 10 + encore,
      freezeDelta: upgrades.has("coldStorage") ? 1 : 0,
      retainedIngredients: [],
      explanation: `甜品摊：${frozenCells} 个冰冻格参与结算`,
    };
  }

  const keepBroth = upgrades.has("brothReserve");
  return {
    score: baseScore,
    freezeDelta: 0,
    retainedIngredients: keepBroth ? ["broth"] : [],
    explanation: keepBroth
      ? "火锅摊：高汤留至下一单"
      : "火锅摊：本步未保留高汤",
  };
}
