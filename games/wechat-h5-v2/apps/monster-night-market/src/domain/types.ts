export const BOARD_SIZE = 4 as const;

export type IngredientId =
  | "chili"
  | "tofu"
  | "mushroom"
  | "lotus"
  | "fish"
  | "riceCake"
  | "ice"
  | "broth";

export type RecipeId =
  | "emberTofu"
  | "mushroomSkewer"
  | "lotusIce"
  | "fishBroth"
  | "spicyRiceCake"
  | "frozenTofu"
  | "doubleSkewer"
  | "borrowedFireSoup"
  | "coldLotusCup"
  | "sharedHotpot"
  | "vipTwinDish"
  | "midnightFeast";

export type CustomerId =
  | "fireCub"
  | "iceHare"
  | "lanternFox"
  | "stoneOgre"
  | "cloudCrane"
  | "riverImp"
  | "moonCat"
  | "gluttonKing";

export type StallId = "grill" | "dessert" | "hotpot";

export type UpgradeId =
  | "borrowFire"
  | "crossFlavor"
  | "coldStorage"
  | "rushOrder"
  | "sharedPlate"
  | "emberEcho"
  | "sweetEncore"
  | "brothReserve"
  | "patientQueue"
  | "doublePrep"
  | "festivalSpark"
  | "cleanCounter";

export type Axis = "row" | "column";
export type ShiftDirection = "left" | "right" | "up" | "down";
export type LineIndex = 0 | 1 | 2 | 3;

export interface Cell {
  readonly ingredient: IngredientId;
  readonly frozen: number;
}

export type Board = readonly (readonly Cell[])[];

export interface ShiftAction {
  readonly axis: Axis;
  readonly index: LineIndex;
  readonly direction: ShiftDirection;
}

export interface RecipeDefinition {
  readonly id: RecipeId;
  readonly label: string;
  readonly ingredients: readonly IngredientId[];
  readonly arrangement: "adjacent" | "line" | "ordered";
  readonly stall: StallId;
}

export interface CustomerDefinition {
  readonly id: CustomerId;
  readonly patienceMoves: number;
  readonly preferredStall: StallId;
}

export interface StallDefinition {
  readonly id: StallId;
  readonly rule: "adjacentBonus" | "frozenBonus" | "reserveBroth";
}

export interface UpgradeDefinition {
  readonly id: UpgradeId;
  readonly rule:
    | "substituteFire"
    | "extraOrder"
    | "freezeNeighbor"
    | "orderedVip"
    | "shareStep"
    | "repeatFire"
    | "repeatSweet"
    | "keepBroth"
    | "addPatience"
    | "doublePreview"
    | "festivalMeter"
    | "clearFreeze";
}

export interface Order {
  readonly id: string;
  readonly customerId: CustomerId;
  readonly recipeIds: readonly RecipeId[];
  readonly mode: "any" | "sequence" | "shared";
  readonly expiresAfterMoves: number;
}

export interface OrderProgress {
  readonly sequenceIndexByOrder: Readonly<Record<string, number>>;
}

export interface OrderExplanation {
  readonly orderId: string;
  readonly status:
    | "completed"
    | "advanced"
    | "missing"
    | "wrongSequence";
  readonly expectedRecipeId: RecipeId;
}

export interface OrderResolution {
  readonly completedOrderIds: readonly string[];
  readonly completedRecipeIds: readonly RecipeId[];
  readonly progress: OrderProgress;
  readonly explanations: readonly OrderExplanation[];
}

export interface ShiftPreview {
  readonly action: ShiftAction;
  readonly board: Board;
  readonly completedOrderIds: readonly string[];
  readonly completedRecipeIds: readonly RecipeId[];
}

export interface PointerSample {
  readonly x: number;
  readonly y: number;
  readonly pointerId: number;
  readonly at: number;
}
