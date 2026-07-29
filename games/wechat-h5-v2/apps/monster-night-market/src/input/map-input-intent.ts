import type { InputIntent } from "@gamehub/h5-input";
import type {
  LineIndex,
  ShiftAction,
} from "../domain/types";

export interface BoardRect {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export type MappedInput =
  | {
      readonly phase: "preview" | "commit";
      readonly action: ShiftAction;
    }
  | { readonly phase: "cancel" };

function indexAt(
  value: number,
  origin: number,
  size: number,
): LineIndex | null {
  const normalized = (value - origin) / size;
  if (normalized < 0 || normalized >= 1) {
    return null;
  }
  return Math.floor(normalized * 4) as LineIndex;
}

export function mapInputIntent(
  intent: InputIntent,
  board: BoardRect,
): MappedInput | null {
  if (
    intent.kind === "cancel" ||
    intent.kind === "drag-end"
  ) {
    return { phase: "cancel" };
  }
  if (
    intent.kind !== "drag-move" &&
    intent.kind !== "swipe"
  ) {
    return null;
  }

  const start =
    intent.kind === "swipe"
      ? intent.start
      : intent.origin;
  const end =
    intent.kind === "swipe"
      ? intent.end
      : intent.point;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (
    intent.kind === "drag-move" &&
    Math.max(Math.abs(dx), Math.abs(dy)) <= 10
  ) {
    return null;
  }
  const horizontal =
    intent.kind === "swipe"
      ? intent.axis === "x"
      : Math.abs(dx) >= Math.abs(dy);
  const index = horizontal
    ? indexAt(start.y, board.y, board.size)
    : indexAt(start.x, board.x, board.size);
  if (index === null) {
    return null;
  }

  return {
    phase:
      intent.kind === "swipe" ? "commit" : "preview",
    action: {
      axis: horizontal ? "row" : "column",
      index,
      direction: horizontal
        ? dx >= 0
          ? "right"
          : "left"
        : dy >= 0
          ? "down"
          : "up",
    },
  };
}
