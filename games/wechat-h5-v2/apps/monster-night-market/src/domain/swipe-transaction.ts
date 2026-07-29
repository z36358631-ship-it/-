import type {
  LineIndex,
  PointerSample,
  ShiftAction,
} from "./types";

export interface LockedDragPreview {
  readonly axisLock: "horizontal" | "vertical";
  readonly delta: number;
  readonly action: ShiftAction;
}

interface ActiveGesture {
  readonly start: PointerSample;
  readonly lineIndex: LineIndex;
  axisLock: LockedDragPreview["axisLock"] | null;
}

export class SwipeGestureTransaction {
  private active: ActiveGesture | null = null;

  constructor(private readonly axisLockThreshold = 10) {
    if (axisLockThreshold <= 0) {
      throw new RangeError("Axis lock threshold must be positive");
    }
  }

  begin(sample: PointerSample, lineIndex: LineIndex): void {
    this.active = { start: sample, lineIndex, axisLock: null };
  }

  move(sample: PointerSample): LockedDragPreview | null {
    if (!this.active || sample.pointerId !== this.active.start.pointerId) {
      return null;
    }
    const dx = sample.x - this.active.start.x;
    const dy = sample.y - this.active.start.y;
    if (
      !this.active.axisLock &&
      Math.hypot(dx, dy) < this.axisLockThreshold
    ) {
      return null;
    }

    this.active.axisLock ??=
      Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
    const horizontal = this.active.axisLock === "horizontal";
    return {
      axisLock: this.active.axisLock,
      delta: horizontal ? dx : dy,
      action: horizontal
        ? {
            axis: "row",
            index: this.active.lineIndex,
            direction: dx >= 0 ? "right" : "left",
          }
        : {
            axis: "column",
            index: this.active.lineIndex,
            direction: dy >= 0 ? "down" : "up",
          },
    };
  }

  cancel(): void {
    this.active = null;
  }
}

export class SingleBufferedQueue<T> {
  private running = false;
  private pending: T | null = null;
  private idlePromise: Promise<void> = Promise.resolve();
  private resolveIdle: (() => void) | null = null;

  constructor(
    private readonly execute: (value: T) => Promise<void>,
  ) {}

  get pendingCount(): number {
    return this.pending === null ? 0 : 1;
  }

  enqueue(value: T): void {
    if (this.running) {
      this.pending = value;
      return;
    }
    this.running = true;
    this.idlePromise = new Promise<void>((resolve) => {
      this.resolveIdle = resolve;
    });
    void this.consume(value);
  }

  whenIdle(): Promise<void> {
    return this.idlePromise;
  }

  private async consume(value: T): Promise<void> {
    try {
      await this.execute(value);
      const next = this.pending;
      this.pending = null;
      if (next !== null) {
        await this.consume(next);
        return;
      }
    } finally {
      if (this.pending === null) {
        this.running = false;
        this.resolveIdle?.();
        this.resolveIdle = null;
      }
    }
  }
}
