import { describe, expect, it } from "vitest";
import {
  sweepCircleAgainstCircle,
  sweepCircleAgainstSegment,
} from "../../../apps/ricochet-crew/src/physics/sweep";

describe("弹珠连续 Sweep", () => {
  it("高速运动不会穿过目标", () => {
    const hit = sweepCircleAgainstCircle(
      { x: 20, y: 100 },
      { x: 1400, y: 0 },
      0.1,
      12,
      { x: 100, y: 100 },
      18,
      "enemy-a",
    );
    expect(hit?.colliderId).toBe("enemy-a");
    expect(hit?.toi).toBeCloseTo(50 / 140, 5);
  });

  it("弹珠从垂直墙反射", () => {
    const hit = sweepCircleAgainstSegment(
      { x: 40, y: 80 },
      { x: -600, y: 0 },
      0.1,
      10,
      { x: 0, y: 0 },
      { x: 0, y: 160 },
      "left-wall",
    );
    expect(hit?.normal).toEqual({ x: 1, y: 0 });
  });
});
