import { CUSTOMERS, RECIPES } from "../content/catalog";
import { createBoard, shiftBoard } from "./board";
import { resolveOrders } from "./order-engine";
import { applyStallRule } from "./stall-rules";
import type {
  Board,
  CustomerId,
  Order,
  OrderProgress,
  RecipeId,
  ShiftAction,
  StallId,
  UpgradeId,
} from "./types";

export interface NearMiss {
  readonly orderId: string;
  readonly missingRecipeId: RecipeId;
  readonly distance: number;
}

export interface NightMarketRun {
  readonly seed: string;
  readonly status: "playing" | "ended";
  readonly remainingMs: number;
  readonly board: Board;
  readonly stallId: StallId;
  readonly upgrades: ReadonlySet<UpgradeId>;
  readonly orders: readonly Order[];
  readonly orderProgress: OrderProgress;
  readonly score: number;
  readonly servedOrderCount: number;
  readonly chain: number;
  readonly festivalCount: number;
  readonly moveCount: number;
  readonly customerCursor: number;
  readonly completedRecipeIds: ReadonlySet<RecipeId>;
  readonly metCustomerIds: ReadonlySet<CustomerId>;
  readonly nearMisses: readonly NearMiss[];
  readonly lastExplanation: string;
}

export interface ChainOutcome {
  readonly chain: number;
  readonly festivalTriggered: boolean;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function recipeLabel(recipeId: RecipeId): string {
  return (
    RECIPES.find((recipe) => recipe.id === recipeId)?.label ??
    "未知配方"
  );
}

function createGeneratedOrder(
  seed: string,
  cursor: number,
  upgrades: ReadonlySet<UpgradeId>,
): Order {
  const offset = hashString(seed) % RECIPES.length;
  const customer = CUSTOMERS[cursor % CUSTOMERS.length]!;
  const recipeIndex = (offset + cursor) % RECIPES.length;
  const recipe = RECIPES[recipeIndex]!;
  const nextRecipe =
    RECIPES[(recipeIndex + 1) % RECIPES.length]!;
  const sequence =
    upgrades.has("rushOrder") && cursor % 3 === 2;
  const shared =
    upgrades.has("sharedPlate") && cursor % 3 === 1;
  return {
    id: `${seed}:order:${cursor}`,
    customerId: customer.id,
    recipeIds: sequence
      ? [
          recipe.id,
          nextRecipe.id,
        ]
      : [recipe.id],
    mode: sequence ? "sequence" : shared ? "shared" : "any",
    expiresAfterMoves:
      customer.patienceMoves +
      (upgrades.has("patientQueue") ? 2 : 0),
  };
}

function initialOrders(
  seed: string,
  upgrades: ReadonlySet<UpgradeId>,
): readonly Order[] {
  const patienceBonus = upgrades.has("patientQueue") ? 2 : 0;
  return [
    {
      id: `${seed}:order:0`,
      customerId: "fireCub",
      recipeIds: ["emberTofu"],
      mode: "any",
      expiresAfterMoves: 5 + patienceBonus,
    },
    {
      id: `${seed}:order:1`,
      customerId: "riverImp",
      recipeIds: upgrades.has("rushOrder")
        ? ["fishBroth", "lotusIce"]
        : ["fishBroth"],
      mode: upgrades.has("rushOrder")
        ? "sequence"
        : "any",
      expiresAfterMoves: 6 + patienceBonus,
    },
  ];
}

export function createRun(input: {
  readonly seed: string;
  readonly stallId: StallId;
  readonly upgrades?: readonly UpgradeId[];
}): NightMarketRun {
  const upgrades = new Set(input.upgrades ?? []);
  const orders = initialOrders(input.seed, upgrades);
  return {
    seed: input.seed,
    status: "playing",
    remainingMs: 300_000,
    board: createBoard([
      ["chili", "mushroom", "lotus", "tofu"],
      ["fish", "riceCake", "ice", "broth"],
      ["mushroom", "tofu", "chili", "lotus"],
      ["ice", "lotus", "riceCake", "broth"],
    ]),
    stallId: input.stallId,
    upgrades,
    orders,
    orderProgress: { sequenceIndexByOrder: {} },
    score: 0,
    servedOrderCount: 0,
    chain: 0,
    festivalCount: 0,
    moveCount: 0,
    customerCursor: 2,
    completedRecipeIds: new Set(),
    metCustomerIds: new Set(orders.map((order) => order.customerId)),
    nearMisses: [],
    lastExplanation: "营业开始",
  };
}

export function advanceChain(
  currentChain: number,
  servedOrders: number,
): ChainOutcome {
  if (servedOrders <= 0) {
    return { chain: 0, festivalTriggered: false };
  }
  const next = currentChain + 1;
  return next >= 3
    ? { chain: 0, festivalTriggered: true }
    : { chain: next, festivalTriggered: false };
}

function adjustFrozenCells(
  board: Board,
  delta: number,
): Board {
  if (delta === 0) {
    return board;
  }
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      frozen:
        delta > 0
          ? Math.min(1, cell.frozen + delta)
          : Math.max(0, cell.frozen + delta),
    })),
  );
}

export function applyShift(
  run: NightMarketRun,
  action: ShiftAction,
): NightMarketRun {
  if (run.status !== "playing") {
    return run;
  }

  const shiftedBoard = shiftBoard(run.board, action);
  const resolution = resolveOrders(
    shiftedBoard,
    run.orders,
    run.orderProgress,
    RECIPES,
  );
  const completedIds = new Set(resolution.completedOrderIds);
  const decremented = run.orders
    .filter((order) => !completedIds.has(order.id))
    .map((order) => ({
      ...order,
      expiresAfterMoves: Math.max(
        0,
        order.expiresAfterMoves - 1,
      ),
    }));
  const remaining = decremented.filter(
    (order) => order.expiresAfterMoves > 0,
  );

  let customerCursor = run.customerCursor;
  const nextOrders = [...remaining];
  while (nextOrders.length < 2) {
    nextOrders.push(
      createGeneratedOrder(
        run.seed,
        customerCursor,
        run.upgrades,
      ),
    );
    customerCursor += 1;
  }

  const chainOutcome = advanceChain(
    run.chain,
    resolution.completedOrderIds.length,
  );
  const stallOutcome = applyStallRule(
    run.stallId,
    shiftedBoard,
    resolution.completedRecipeIds,
    run.upgrades,
  );
  const festivalScore = chainOutcome.festivalTriggered
    ? run.upgrades.has("festivalSpark")
      ? 450
      : 300
    : 0;
  const nearMisses = resolution.explanations
    .filter(
      (item) =>
        item.status === "missing" ||
        item.status === "wrongSequence",
    )
    .map((item) => ({
      orderId: item.orderId,
      missingRecipeId: item.expectedRecipeId,
      distance: 1,
    }))
    .slice(0, 3);
  const served = resolution.completedOrderIds.length;

  return {
    ...run,
    board: adjustFrozenCells(
      shiftedBoard,
      stallOutcome.freezeDelta,
    ),
    orders: nextOrders,
    orderProgress: resolution.progress,
    score:
      run.score +
      stallOutcome.score +
      festivalScore,
    servedOrderCount:
      run.servedOrderCount + served,
    chain: chainOutcome.chain,
    festivalCount:
      run.festivalCount +
      (chainOutcome.festivalTriggered ? 1 : 0),
    moveCount: run.moveCount + 1,
    customerCursor,
    completedRecipeIds: new Set([
      ...run.completedRecipeIds,
      ...resolution.completedRecipeIds,
    ]),
    metCustomerIds: new Set([
      ...run.metCustomerIds,
      ...nextOrders.map((order) => order.customerId),
    ]),
    nearMisses,
    lastExplanation:
      served > 0
        ? `完成 ${served} 单；${stallOutcome.explanation}`
        : `没有成单；需要 ${resolution.explanations
            .map((item) => recipeLabel(item.expectedRecipeId))
            .join("、")}`,
  };
}

export function advanceClock(
  run: NightMarketRun,
  deltaMs: number,
): NightMarketRun {
  const remainingMs = Math.max(
    0,
    run.remainingMs - Math.max(0, deltaMs),
  );
  return {
    ...run,
    remainingMs,
    status: remainingMs === 0 ? "ended" : run.status,
  };
}
