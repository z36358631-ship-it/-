import { RECIPES } from "../content/catalog";
import { boardKey, shiftBoard } from "../domain/board";
import { previewOrders } from "../domain/order-engine";
import {
  advanceClock,
  applyShift,
  createRun,
  type NightMarketRun,
} from "../domain/run-machine";
import type {
  Board,
  Order,
  ShiftAction,
  ShiftPreview,
  StallId,
  UpgradeId,
} from "../domain/types";
import type { RunSummary } from "../meta/night-market-save";
import { BlindSlideTracker } from "../quality/blind-slide";

export interface ControllerScenePort {
  renderBoard(board: Board): void;
  renderPreview(preview: ShiftPreview): void;
  clearPreview(): void;
  showMessage(message: string): void;
}

export interface ControllerSnapshot {
  readonly seed: string;
  readonly boardKey: string;
  readonly board: Board;
  readonly orders: readonly Order[];
  readonly remainingMs: number;
  readonly score: number;
  readonly servedOrderCount: number;
  readonly chain: number;
  readonly festivalCount: number;
  readonly moveCount: number;
  readonly status: NightMarketRun["status"];
  readonly stallId: StallId;
  readonly lastExplanation: string;
}

export interface NightMarketController {
  preview(
    action: ShiftAction,
    at: number,
  ): ShiftPreview;
  commit(
    action: ShiftAction,
    at: number,
  ): Promise<void>;
  tick(stepSeconds: number): boolean;
  endNow(): boolean;
  reset(seed: string): void;
  awaitSettled(): Promise<void>;
  clearPreview(): void;
  snapshot(): ControllerSnapshot;
  summary(): RunSummary;
}

interface ControllerDeps {
  readonly seed: string;
  readonly stallId: StallId;
  readonly upgrades?: readonly UpgradeId[];
  readonly scene: ControllerScenePort;
  readonly telemetry: {
    emit(
      eventName: "choice_selected",
      payload: Readonly<Record<string, unknown>>,
    ): unknown;
  };
  readonly audio: {
    play(cueId: string): unknown;
  };
  readonly accessibility: {
    announce(
      message: string,
      priority?: "polite" | "assertive",
    ): void;
  };
  readonly animate: (
    preview: ShiftPreview,
    result: {
      readonly festivalTriggered: boolean;
    },
  ) => Promise<void>;
  readonly onUpdate?: (
    snapshot: ControllerSnapshot,
  ) => void;
}

export function createNightMarketController(
  deps: ControllerDeps,
): NightMarketController {
  let run = createRun({
    seed: deps.seed,
    stallId: deps.stallId,
    ...(deps.upgrades
      ? { upgrades: deps.upgrades }
      : {}),
  });
  let settled: Promise<void> = Promise.resolve();
  const blind = new BlindSlideTracker({
    emit: (eventName, payload) => {
      deps.telemetry.emit(eventName, payload);
    },
  });
  deps.scene.renderBoard(run.board);

  const makePreview = (
    action: ShiftAction,
  ): ShiftPreview => {
    const board = shiftBoard(run.board, action);
    const resolution = previewOrders(
      board,
      run.orders,
      run.orderProgress,
      RECIPES,
    );
    return {
      action,
      board,
      completedOrderIds:
        resolution.completedOrderIds,
      completedRecipeIds:
        resolution.completedRecipeIds,
    };
  };

  const snapshot = (): ControllerSnapshot => ({
    seed: run.seed,
    boardKey: boardKey(run.board),
    board: run.board.map((row) =>
      row.map((cell) => ({ ...cell })),
    ),
    orders: run.orders.map((order) => ({
      ...order,
      recipeIds: [...order.recipeIds],
    })),
    remainingMs: run.remainingMs,
    score: run.score,
    servedOrderCount: run.servedOrderCount,
    chain: run.chain,
    festivalCount: run.festivalCount,
    moveCount: run.moveCount,
    status: run.status,
    stallId: run.stallId,
    lastExplanation: run.lastExplanation,
  });

  const notify = () => {
    deps.onUpdate?.(snapshot());
  };

  const api: NightMarketController = {
    preview(action, at) {
      const result = makePreview(action);
      blind.markPreview(
        at,
        result.completedOrderIds,
      );
      deps.scene.renderPreview(result);
      return result;
    },
    async commit(action, at) {
      if (run.status !== "playing") {
        return;
      }
      const preview = makePreview(action);
      const festivalBefore = run.festivalCount;
      run = applyShift(run, action);
      const festivalTriggered =
        run.festivalCount > festivalBefore;
      blind.commit(at, {
        action,
        completedOrderIds:
          preview.completedOrderIds,
        completedRecipeIds:
          preview.completedRecipeIds,
        chain: run.chain,
        stallId: run.stallId,
      });
      settled = deps
        .animate(preview, { festivalTriggered })
        .then(() => {
          deps.scene.clearPreview();
          deps.scene.renderBoard(run.board);
          blind.markSettled(at);
          if (preview.completedOrderIds.length > 0) {
            deps.audio.play(
              festivalTriggered
                ? "audio.festival"
                : "audio.serve",
            );
            deps.scene.showMessage(
              `出餐 +${preview.completedOrderIds.length} · 累计 ${run.servedOrderCount} 单`,
            );
            deps.accessibility.announce(
              `完成 ${preview.completedOrderIds.length} 单`,
              "assertive",
            );
          } else {
            deps.scene.showMessage(
              run.lastExplanation,
            );
            deps.accessibility.announce(
              run.lastExplanation,
            );
          }
          notify();
        });
      await settled;
    },
    tick(stepSeconds) {
      const wasPlaying = run.status === "playing";
      run = advanceClock(
        run,
        Math.max(0, stepSeconds) * 1_000,
      );
      notify();
      return wasPlaying && run.status === "ended";
    },
    endNow() {
      const wasPlaying = run.status === "playing";
      run = advanceClock(run, run.remainingMs);
      notify();
      return wasPlaying;
    },
    reset(seed) {
      run = createRun({
        seed,
        stallId: run.stallId,
        upgrades: [...run.upgrades],
      });
      deps.scene.clearPreview();
      deps.scene.renderBoard(run.board);
      notify();
    },
    awaitSettled: () => settled,
    clearPreview: () => deps.scene.clearPreview(),
    snapshot,
    summary: () => ({
      seed: run.seed,
      score: run.score,
      completedRecipeIds: [
        ...run.completedRecipeIds,
      ],
      metCustomerIds: [...run.metCustomerIds],
      nearMisses: [...run.nearMisses].slice(0, 3),
    }),
  };
  notify();
  return api;
}
