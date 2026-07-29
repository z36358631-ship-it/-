import { matchingRecipeIds } from "./recipe-engine";
import type {
  Board,
  Order,
  OrderExplanation,
  OrderProgress,
  OrderResolution,
  RecipeDefinition,
  RecipeId,
} from "./types";

export function previewOrders(
  board: Board,
  orders: readonly Order[],
  progress: OrderProgress,
  recipes: readonly RecipeDefinition[],
): OrderResolution {
  return resolveOrders(board, orders, progress, recipes);
}

export function resolveOrders(
  board: Board,
  orders: readonly Order[],
  progress: OrderProgress,
  recipes: readonly RecipeDefinition[],
  forcedMatches?: ReadonlySet<RecipeId>,
): OrderResolution {
  const matches =
    forcedMatches ?? matchingRecipeIds(board, recipes);
  const sequenceIndexByOrder = {
    ...progress.sequenceIndexByOrder,
  };
  const completedOrderIds: string[] = [];
  const completedRecipeIds = new Set<RecipeId>();
  const explanations: OrderExplanation[] = [];

  for (const order of orders) {
    if (order.mode === "sequence") {
      const index = sequenceIndexByOrder[order.id] ?? 0;
      const expectedRecipeId = order.recipeIds[index];
      if (!expectedRecipeId) {
        throw new RangeError(
          `Order ${order.id} has no recipe at sequence index ${index}`,
        );
      }
      if (matches.has(expectedRecipeId)) {
        completedRecipeIds.add(expectedRecipeId);
        if (index + 1 >= order.recipeIds.length) {
          completedOrderIds.push(order.id);
          delete sequenceIndexByOrder[order.id];
          explanations.push({
            orderId: order.id,
            status: "completed",
            expectedRecipeId,
          });
        } else {
          sequenceIndexByOrder[order.id] = index + 1;
          explanations.push({
            orderId: order.id,
            status: "advanced",
            expectedRecipeId,
          });
        }
      } else {
        const laterRecipeMatched = order.recipeIds
          .slice(index + 1)
          .some((recipeId) => matches.has(recipeId));
        explanations.push({
          orderId: order.id,
          status: laterRecipeMatched
            ? "wrongSequence"
            : "missing",
          expectedRecipeId,
        });
      }
      continue;
    }

    const matchedRecipeId = order.recipeIds.find((recipeId) =>
      matches.has(recipeId),
    );
    if (matchedRecipeId) {
      completedOrderIds.push(order.id);
      completedRecipeIds.add(matchedRecipeId);
      explanations.push({
        orderId: order.id,
        status: "completed",
        expectedRecipeId: matchedRecipeId,
      });
    } else {
      const expectedRecipeId = order.recipeIds[0];
      if (!expectedRecipeId) {
        throw new RangeError(
          `Order ${order.id} must contain at least one recipe`,
        );
      }
      explanations.push({
        orderId: order.id,
        status: "missing",
        expectedRecipeId,
      });
    }
  }

  return {
    completedOrderIds,
    completedRecipeIds: [...completedRecipeIds],
    progress: { sequenceIndexByOrder },
    explanations,
  };
}
