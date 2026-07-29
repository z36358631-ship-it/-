import type {
  RecipeId,
  ShiftAction,
  StallId,
} from "../domain/types";

export interface TelemetryPort {
  emit(
    eventName: "choice_selected",
    payload: Readonly<Record<string, unknown>>,
  ): void;
}

export interface ShiftTelemetryInput {
  readonly action: ShiftAction;
  readonly completedOrderIds: readonly string[];
  readonly completedRecipeIds: readonly RecipeId[];
  readonly chain: number;
  readonly stallId: StallId;
}

export interface RunBlindCount {
  readonly runOrdinal: number;
  readonly committed: number;
  readonly blind: number;
}

export class BlindSlideTracker {
  private settledAt = Number.NEGATIVE_INFINITY;
  private previewAt = Number.NEGATIVE_INFINITY;
  private previewedOrderIds: readonly string[] = [];

  constructor(private readonly telemetry: TelemetryPort) {}

  markSettled(at: number): void {
    this.settledAt = at;
  }

  markPreview(
    at: number,
    orderIds: readonly string[],
  ): void {
    this.previewAt = at;
    this.previewedOrderIds = [...orderIds];
  }

  commit(
    at: number,
    input: ShiftTelemetryInput,
  ): { readonly blindSlide: boolean } {
    const previewDurationMs = Math.max(
      0,
      at - this.previewAt,
    );
    const waitAfterSettledMs = Math.max(
      0,
      at - this.settledAt,
    );
    const blindSlide =
      waitAfterSettledMs < 700 &&
      previewDurationMs < 120 &&
      this.previewedOrderIds.length === 0 &&
      input.completedOrderIds.length === 0;

    this.telemetry.emit("choice_selected", {
      kind: "night_market_shift",
      axis: input.action.axis,
      lineIndex: input.action.index,
      direction: input.action.direction,
      previewedOrderIds: [...this.previewedOrderIds],
      completedOrderIds: [...input.completedOrderIds],
      completedRecipeIds: [
        ...input.completedRecipeIds,
      ],
      chain: input.chain,
      waitAfterSettledMs,
      previewDurationMs,
      blindSlide,
      stallRule: input.stallId,
    });

    this.previewAt = Number.NEGATIVE_INFINITY;
    this.previewedOrderIds = [];
    return { blindSlide };
  }
}

export function compareBlindSlideRate(
  counts: readonly RunBlindCount[],
): {
  readonly firstRate: number;
  readonly thirdRate: number;
  readonly improved: boolean;
} {
  const rate = (runOrdinal: number): number => {
    const row = counts.find(
      (item) => item.runOrdinal === runOrdinal,
    );
    return row && row.committed > 0
      ? row.blind / row.committed
      : 1;
  };
  const firstRate = rate(1);
  const thirdRate = rate(3);
  return {
    firstRate,
    thirdRate,
    improved: thirdRate < firstRate,
  };
}
