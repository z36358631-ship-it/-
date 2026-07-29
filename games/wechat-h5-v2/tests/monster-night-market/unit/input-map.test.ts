import { describe, expect, it } from "vitest";
import { mapInputIntent } from "../../../apps/monster-night-market/src/input/map-input-intent";

const board = { x: 20, y: 240, size: 320 };

describe("怪兽夜市真实触控映射", () => {
  it("拖动时预演横向第二行，松手只提交一次", () => {
    expect(
      mapInputIntent(
        {
          kind: "drag-move",
          origin: {
            x: 60,
            y: 365,
            pointerId: 1,
            at: 0,
          },
          point: {
            x: 92,
            y: 365,
            pointerId: 1,
            at: 80,
          },
        },
        board,
      ),
    ).toEqual({
      phase: "preview",
      action: {
        axis: "row",
        index: 1,
        direction: "right",
      },
    });
    expect(
      mapInputIntent(
        {
          kind: "swipe",
          start: {
            x: 180,
            y: 285,
            pointerId: 2,
            at: 0,
          },
          end: {
            x: 120,
            y: 285,
            pointerId: 2,
            at: 120,
          },
          axis: "x",
          direction: "left",
          delta: -60,
          durationMs: 120,
        },
        board,
      ),
    ).toEqual({
      phase: "commit",
      action: {
        axis: "row",
        index: 0,
        direction: "left",
      },
    });
  });

  it("棋盘外手势和未锁轴短移动不会触发玩法", () => {
    expect(
      mapInputIntent(
        {
          kind: "swipe",
          start: {
            x: 10,
            y: 100,
            pointerId: 3,
            at: 0,
          },
          end: {
            x: 80,
            y: 100,
            pointerId: 3,
            at: 100,
          },
          axis: "x",
          direction: "right",
          delta: 70,
          durationMs: 100,
        },
        board,
      ),
    ).toBeNull();
    expect(
      mapInputIntent(
        {
          kind: "drag-move",
          origin: {
            x: 60,
            y: 365,
            pointerId: 4,
            at: 0,
          },
          point: {
            x: 66,
            y: 369,
            pointerId: 4,
            at: 50,
          },
        },
        board,
      ),
    ).toBeNull();
  });
});
