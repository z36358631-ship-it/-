import { createBoard } from "./board";
import type { Order } from "./types";

export const FIRST_ORDER_BOARD = createBoard([
  ["chili", "mushroom", "lotus", "tofu"],
  ["fish", "riceCake", "ice", "broth"],
  ["mushroom", "lotus", "fish", "riceCake"],
  ["ice", "broth", "tofu", "mushroom"],
]);

export const FIRST_ORDER: Order = {
  id: "tutorial:first",
  customerId: "fireCub",
  recipeIds: ["emberTofu"],
  mode: "any",
  expiresAfterMoves: 99,
};

export interface RunPhase {
  readonly id:
    | "first-order"
    | "double-order"
    | "hold-ingredient"
    | "customer-rule"
    | "vip-chain"
    | "glutton-finale";
  readonly startMs: number;
  readonly endMs: number;
  readonly mechanic: string;
}

export const RUN_PHASES: readonly RunPhase[] = [
  {
    id: "first-order",
    startMs: 0,
    endMs: 20_000,
    mechanic: "两食材首单与幽灵预演",
  },
  {
    id: "double-order",
    startMs: 20_000,
    endMs: 60_000,
    mechanic: "第二配方与双单机会",
  },
  {
    id: "hold-ingredient",
    startMs: 60_000,
    endMs: 120_000,
    mechanic: "摊位改造与三食材留料",
  },
  {
    id: "customer-rule",
    startMs: 120_000,
    endMs: 180_000,
    mechanic: "冰客、火客或插单",
  },
  {
    id: "vip-chain",
    startMs: 180_000,
    endMs: 240_000,
    mechanic: "VIP 顺序单与三段连灶",
  },
  {
    id: "glutton-finale",
    startMs: 240_000,
    endMs: 300_000,
    mechanic: "大胃王与夜市庆典",
  },
];

export function tutorialHint(
  elapsedWithoutEffectiveInputMs: number,
): { readonly axis: "row"; readonly index: 0 } | null {
  return elapsedWithoutEffectiveInputMs >= 5_000
    ? { axis: "row", index: 0 }
    : null;
}

export function phaseAt(elapsedMs: number): RunPhase {
  return (
    RUN_PHASES.find(
      (phase) =>
        elapsedMs >= phase.startMs &&
        elapsedMs < phase.endMs,
    ) ?? RUN_PHASES[RUN_PHASES.length - 1]!
  );
}
