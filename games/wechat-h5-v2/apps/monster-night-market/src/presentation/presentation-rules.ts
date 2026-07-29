export interface AnimationStep {
  readonly id:
    | "shift"
    | "snap"
    | "serve"
    | "customer"
    | "festival";
  readonly durationMs: number;
}

export function buildAnimationTimeline(input: {
  readonly completedOrders: number;
  readonly festivalTriggered: boolean;
  readonly reducedMotion: boolean;
}): AnimationStep[] {
  const scale = input.reducedMotion ? 0.25 : 1;
  const step = (
    id: AnimationStep["id"],
    durationMs: number,
  ): AnimationStep => ({
    id,
    durationMs: Math.round(durationMs * scale),
  });
  const timeline = [
    step("shift", 160),
    step("snap", 80),
  ];
  if (input.completedOrders > 0) {
    timeline.push(
      step("serve", 220),
      step("customer", 240),
    );
  }
  if (input.festivalTriggered) {
    timeline.push(step("festival", 380));
  }
  return timeline;
}

export async function playAnimationTimeline(
  timeline: readonly AnimationStep[],
  play: (step: AnimationStep) => Promise<void>,
): Promise<void> {
  for (const step of timeline) {
    await play(step);
  }
}

export interface NightMarketLayout {
  readonly board: {
    readonly x: number;
    readonly y: number;
    readonly size: number;
  };
  readonly actionBar: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export function computeNightMarketLayout(
  width: number,
  height: number,
): NightMarketLayout {
  const horizontalPadding = 12;
  const actionHeight = 70;
  const actionY = height - actionHeight;
  const boardY = Math.max(236, Math.floor(height * 0.33));
  const size = Math.min(
    width - horizontalPadding * 2,
    actionY - boardY - 12,
    360,
  );
  return {
    board: {
      x: Math.floor((width - size) / 2),
      y: boardY,
      size,
    },
    actionBar: {
      x: 0,
      y: actionY,
      width,
      height: actionHeight,
    },
  };
}
