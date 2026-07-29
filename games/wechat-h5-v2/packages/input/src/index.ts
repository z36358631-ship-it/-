export type AxisLock = "x" | "y";
export type SwipeDirection = "left" | "right" | "up" | "down";

export interface PointerSample {
  x: number;
  y: number;
  pointerId: number;
  at: number;
}

export interface SwipeIntent {
  kind: "swipe";
  start: PointerSample;
  end: PointerSample;
  axis: AxisLock;
  direction: SwipeDirection;
  delta: number;
  durationMs: number;
}

export type DragIntent =
  | {
      kind: "drag-start";
      point: PointerSample;
    }
  | {
      kind: "drag-move";
      point: PointerSample;
      origin: PointerSample;
    }
  | {
      kind: "drag-end";
      point: PointerSample;
      origin: PointerSample;
    };

export type InputIntent =
  | {
      kind: "tap";
      point: PointerSample;
    }
  | DragIntent
  | SwipeIntent
  | {
      kind: "cancel";
      reason: "pause" | "blur" | "dispose";
    };

export function normalizePointer(
  event: Pick<
    PointerEvent,
    "clientX" | "clientY" | "pointerId" | "timeStamp"
  >,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  logical: {
    width: number;
    height: number;
  },
): PointerSample {
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("INPUT_RECT_EMPTY");
  }
  return {
    x: ((event.clientX - rect.left) / rect.width) * logical.width,
    y: ((event.clientY - rect.top) / rect.height) * logical.height,
    pointerId: event.pointerId,
    at: event.timeStamp,
  };
}

function swipeForAxis(
  start: PointerSample,
  end: PointerSample,
  axis: AxisLock,
  threshold: number,
): SwipeIntent | null {
  const delta = axis === "x" ? end.x - start.x : end.y - start.y;
  if (Math.abs(delta) <= threshold) return null;
  return {
    kind: "swipe",
    start,
    end,
    axis,
    direction:
      axis === "x"
        ? delta > 0
          ? "right"
          : "left"
        : delta > 0
          ? "down"
          : "up",
    delta,
    durationMs: Math.max(0, end.at - start.at),
  };
}

export function classifySwipe(
  start: PointerSample,
  end: PointerSample,
  threshold = 10,
): SwipeIntent | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const axis: AxisLock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
  return swipeForAxis(start, end, axis, threshold);
}

export interface InputController {
  subscribe(listener: (intent: InputIntent) => void): () => void;
  setEnabled(enabled: boolean): void;
  cancelActive(reason: "pause" | "blur" | "dispose"): void;
  destroy(): void;
}

export function createInputController(options: {
  element: HTMLElement;
  logicalSize: {
    width: number;
    height: number;
  };
  axisLockThreshold?: number;
  tapRadius?: number;
}): InputController {
  const listeners = new Set<(intent: InputIntent) => void>();
  const threshold = options.axisLockThreshold ?? 10;
  const tapRadius = options.tapRadius ?? 8;
  if (threshold < 0 || tapRadius < 0) {
    throw new Error("INPUT_THRESHOLD_INVALID");
  }

  let enabled = true;
  let start: PointerSample | null = null;
  let last: PointerSample | null = null;
  let lock: AxisLock | null = null;

  const emit = (intent: InputIntent) => {
    listeners.forEach((listener) => listener(intent));
  };
  const sample = (event: PointerEvent) =>
    normalizePointer(
      event,
      options.element.getBoundingClientRect(),
      options.logicalSize,
    );
  const clearActive = () => {
    start = null;
    last = null;
    lock = null;
  };
  const cancelActive = (
    reason: "pause" | "blur" | "dispose",
  ) => {
    if (start) emit({
      kind: "cancel",
      reason,
    });
    clearActive();
  };

  const down = (event: PointerEvent) => {
    if (!enabled || start !== null || !event.isPrimary) return;
    options.element.setPointerCapture?.(event.pointerId);
    start = sample(event);
    last = start;
    lock = null;
    emit({
      kind: "drag-start",
      point: start,
    });
  };
  const move = (event: PointerEvent) => {
    if (!enabled || !start || event.pointerId !== start.pointerId) return;
    last = sample(event);
    const dx = last.x - start.x;
    const dy = last.y - start.y;
    if (!lock && Math.max(Math.abs(dx), Math.abs(dy)) > threshold) {
      lock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    const point =
      lock === "x"
        ? {
            ...last,
            y: start.y,
          }
        : lock === "y"
          ? {
              ...last,
              x: start.x,
            }
          : last;
    emit({
      kind: "drag-move",
      point,
      origin: start,
    });
  };
  const up = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.pointerId) return;
    const end = sample(event);
    const swipe = lock
      ? swipeForAxis(start, end, lock, threshold)
      : classifySwipe(start, end, threshold);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (swipe) {
      emit(swipe);
    } else if (distance <= tapRadius) {
      emit({
        kind: "tap",
        point: end,
      });
    } else {
      emit({
        kind: "drag-end",
        point: end,
        origin: start,
      });
    }
    clearActive();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.pointerId) return;
    cancelActive("blur");
  };

  options.element.style.touchAction = "none";
  const ownerWindow =
    options.element.ownerDocument?.defaultView ?? null;
  options.element.addEventListener("pointerdown", down);
  options.element.addEventListener("pointermove", move);
  options.element.addEventListener("pointerup", up);
  options.element.addEventListener("pointercancel", pointerCancel);
  // Pointer capture is not consistently retained when a touch drag crosses
  // from the game surface onto browser/UI controls. Listen at the window in
  // capture phase as a safety net so a missed release cannot permanently
  // occupy the active pointer and block every later gesture.
  ownerWindow?.addEventListener("pointerup", up, true);
  ownerWindow?.addEventListener(
    "pointercancel",
    pointerCancel,
    true,
  );

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setEnabled(next) {
      enabled = next;
      if (!next) cancelActive("pause");
    },
    cancelActive,
    destroy() {
      cancelActive("dispose");
      options.element.removeEventListener("pointerdown", down);
      options.element.removeEventListener("pointermove", move);
      options.element.removeEventListener("pointerup", up);
      options.element.removeEventListener("pointercancel", pointerCancel);
      ownerWindow?.removeEventListener("pointerup", up, true);
      ownerWindow?.removeEventListener(
        "pointercancel",
        pointerCancel,
        true,
      );
      listeners.clear();
    },
  };
}
