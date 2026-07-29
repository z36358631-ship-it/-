import { describe, expect, it, vi } from "vitest";
import {
  SwipeGestureTransaction,
  SingleBufferedQueue,
} from "../../../apps/monster-night-market/src/domain/swipe-transaction";

describe("怪兽夜市滑动事务", () => {
  it("移动不足 10px 不锁轴，超过阈值后按主方向锁轴且不再漂移", () => {
    const gesture = new SwipeGestureTransaction(10);
    gesture.begin({ pointerId: 1, x: 50, y: 100, at: 0 }, 2);

    expect(
      gesture.move({ pointerId: 1, x: 58, y: 105, at: 30 }),
    ).toBeNull();
    expect(
      gesture.move({ pointerId: 1, x: 61, y: 105, at: 60 }),
    ).toEqual({
      axisLock: "horizontal",
      delta: 11,
      action: { axis: "row", index: 2, direction: "right" },
    });
    expect(
      gesture.move({ pointerId: 1, x: 62, y: 180, at: 90 }),
    ).toEqual({
      axisLock: "horizontal",
      delta: 12,
      action: { axis: "row", index: 2, direction: "right" },
    });
  });

  it("动画期间只缓存最后一个输入，并按当前、最后缓存顺序执行", async () => {
    const releases: Array<() => void> = [];
    const executed: string[] = [];
    const execute = vi.fn(
      (value: string) =>
        new Promise<void>((resolve) => {
          executed.push(value);
          releases.push(resolve);
        }),
    );
    const queue = new SingleBufferedQueue(execute);

    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    expect(queue.pendingCount).toBe(1);
    expect(executed).toEqual(["first"]);

    releases.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(executed).toEqual(["first", "third"]);

    releases.shift()?.();
    await queue.whenIdle();
    expect(queue.pendingCount).toBe(0);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
