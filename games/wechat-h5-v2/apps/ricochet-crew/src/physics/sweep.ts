import type { Vec2 } from "../game/contracts";
import {
  add,
  dot,
  normalize,
  scale,
  sub,
} from "./vector";

export interface SweepHit {
  readonly colliderId: string;
  readonly toi: number;
  readonly point: Vec2;
  readonly normal: Vec2;
}

export function sweepCircleAgainstCircle(
  origin: Vec2,
  velocity: Vec2,
  dt: number,
  movingRadius: number,
  center: Vec2,
  targetRadius: number,
  colliderId: string,
): SweepHit | null {
  const delta = scale(velocity, dt);
  const relative = sub(origin, center);
  const radius = movingRadius + targetRadius;
  const a = dot(delta, delta);
  const b = 2 * dot(relative, delta);
  const c = dot(relative, relative) - radius * radius;
  if (a <= 1e-12 || c <= 0) {
    return null;
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }
  const toi =
    (-b - Math.sqrt(discriminant)) / (2 * a);
  if (toi < 0 || toi > 1) {
    return null;
  }
  const point = add(origin, scale(delta, toi));
  return {
    colliderId,
    toi,
    point,
    normal: normalize(sub(point, center)),
  };
}

export function sweepCircleAgainstSegment(
  origin: Vec2,
  velocity: Vec2,
  dt: number,
  radius: number,
  start: Vec2,
  end: Vec2,
  colliderId: string,
): SweepHit | null {
  const edge = sub(end, start);
  const edgeLength = Math.hypot(edge.x, edge.y);
  if (edgeLength <= 1e-9) {
    return sweepCircleAgainstCircle(
      origin,
      velocity,
      dt,
      radius,
      start,
      0,
      colliderId,
    );
  }
  const tangent = scale(edge, 1 / edgeLength);
  const candidateNormal = {
    x: -tangent.y || 0,
    y: tangent.x || 0,
  };
  const signedDistance = dot(
    sub(origin, start),
    candidateNormal,
  );
  const orientedNormal =
    signedDistance >= 0
      ? candidateNormal
      : scale(candidateNormal, -1);
  const normal = {
    x: orientedNormal.x || 0,
    y: orientedNormal.y || 0,
  };
  const toward = dot(velocity, normal);
  if (toward >= -1e-9) {
    return null;
  }
  const seconds =
    (radius - Math.abs(signedDistance)) / toward;
  const toi = seconds / dt;
  if (toi < 0 || toi > 1) {
    return null;
  }
  const center = add(origin, scale(velocity, seconds));
  const contact = sub(center, scale(normal, radius));
  const projection = dot(
    sub(contact, start),
    tangent,
  );
  if (projection >= 0 && projection <= edgeLength) {
    return {
      colliderId,
      toi,
      point: center,
      normal,
    };
  }
  return null;
}
