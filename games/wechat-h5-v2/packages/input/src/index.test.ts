import { describe, expect, it } from "vitest";
import {
  classifySwipe,
  normalizePointer,
  type PointerSample,
} from "./index";

describe("h5 input", () => {
  it("maps CSS pixels into the 390x844 logical viewport", () => {
    expect(
      normalizePointer(
        {
          clientX: 195,
          clientY: 422,
          pointerId: 7,
          timeStamp: 10,
        },
        {
          left: 0,
          top: 0,
          width: 390,
          height: 844,
        },
        {
          width: 390,
          height: 844,
        },
      ),
    ).toMatchObject({
      x: 195,
      y: 422,
      pointerId: 7,
    });
  });

  it("locks horizontal only after 10px and emits one-cell direction", () => {
    const start: PointerSample = {
      x: 100,
      y: 100,
      pointerId: 1,
      at: 0,
    };
    expect(
      classifySwipe(start, {
        ...start,
        x: 109,
        at: 20,
      }, 10),
    ).toBeNull();
    expect(
      classifySwipe(start, {
        ...start,
        x: 112,
        y: 103,
        at: 30,
      }, 10),
    ).toMatchObject({
      axis: "x",
      direction: "right",
      delta: 12,
      durationMs: 30,
    });
  });

  it("uses the dominant vertical axis after the threshold", () => {
    const start: PointerSample = {
      x: 50,
      y: 50,
      pointerId: 2,
      at: 100,
    };
    expect(
      classifySwipe(start, {
        x: 54,
        y: 35,
        pointerId: 2,
        at: 145,
      }),
    ).toMatchObject({
      axis: "y",
      direction: "up",
      delta: -15,
      durationMs: 45,
    });
  });
});
