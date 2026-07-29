import type { Vec2 } from "../game/contracts";

export const add = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});
export const sub = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
export const scale = (value: Vec2, amount: number): Vec2 => ({
  x: value.x * amount,
  y: value.y * amount,
});
export const dot = (a: Vec2, b: Vec2): number =>
  a.x * b.x + a.y * b.y;
export const normalize = (value: Vec2): Vec2 => {
  const length = Math.hypot(value.x, value.y);
  return length > 1e-9
    ? scale(value, 1 / length)
    : { x: 0, y: -1 };
};
export const reflect = (
  velocity: Vec2,
  normal: Vec2,
): Vec2 =>
  sub(
    velocity,
    scale(normal, 2 * dot(velocity, normal)),
  );
