import { MODIFIERS } from "../content/catalog";
import {
  LAUNCH_SPEED,
  SHOT_MAX_SECONDS,
  SHOT_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type {
  AimPreview,
  BossState,
  HeroId,
  Modifier,
  RicochetSnapshot,
  ShotState,
  TargetState,
  Vec2,
} from "./contracts";
import {
  add,
  normalize,
  reflect,
  scale,
  sub,
} from "../physics/vector";
import {
  sweepCircleAgainstCircle,
  sweepCircleAgainstSegment,
  type SweepHit,
} from "../physics/sweep";

interface MutableShot {
  position: Vec2;
  velocity: Vec2;
  skillAvailable: boolean;
  remainingSeconds: number;
  combo: number;
  maxCombo: number;
  wallBounces: number;
  skillRefreshUsed: boolean;
}

interface MutableState {
  runId: string;
  seed: number;
  heroId: HeroId;
  mode: RicochetSnapshot["mode"];
  roomIndex: number;
  shot: MutableShot | null;
  targets: TargetState[];
  offer: Modifier[];
  build: Modifier[];
  score: number;
  shotsRemaining: number;
  boss: BossState | null;
  lastShotTrace: Vec2[];
}

const LAUNCHER = { x: 195, y: 730 };

function roomTargets(roomIndex: number): TargetState[] {
  const count = Math.min(7, 3 + roomIndex);
  return Array.from({ length: count }, (_, index) => ({
    id: `room-${roomIndex}-target-${index}`,
    kind: index === count - 1 ? "mechanism" : "enemy",
    position: {
      x: 70 + ((index * 83 + roomIndex * 31) % 250),
      y: 220 + Math.floor(index / 3) * 105,
    },
    radius: index === count - 1 ? 22 : 25,
    maxHp: 40,
    hp: 40,
    active: true,
  }));
}

function createBoss(): BossState {
  const part = (
    id: string,
    position: Vec2,
    radius: number,
    hp: number,
  ): TargetState => ({
    id,
    kind: "boss",
    position,
    radius,
    maxHp: hp,
    hp,
    active: true,
  });
  return {
    phase: "shielded",
    parts: {
      armor: part("boss-armor", { x: 195, y: 285 }, 52, 180),
      weapon: part("boss-weapon", { x: 98, y: 370 }, 34, 140),
      core: part("boss-core", { x: 195, y: 180 }, 38, 220),
    },
  };
}

function offerFor(
  seed: number,
  roomIndex: number,
): Modifier[] {
  const start =
    Math.abs(
      Math.imul(seed ^ (roomIndex + 1), 2654435761),
    ) % MODIFIERS.length;
  return Array.from({ length: 3 }, (_, offset) =>
    MODIFIERS[(start + offset * 5) % MODIFIERS.length]!,
  );
}

function wallHits(
  position: Vec2,
  velocity: Vec2,
  dt: number,
): SweepHit[] {
  return [
    sweepCircleAgainstSegment(
      position,
      velocity,
      dt,
      SHOT_RADIUS,
      { x: 18, y: 110 },
      { x: 18, y: 780 },
      "left-wall",
    ),
    sweepCircleAgainstSegment(
      position,
      velocity,
      dt,
      SHOT_RADIUS,
      { x: 372, y: 110 },
      { x: 372, y: 780 },
      "right-wall",
    ),
    sweepCircleAgainstSegment(
      position,
      velocity,
      dt,
      SHOT_RADIUS,
      { x: 18, y: 110 },
      { x: 372, y: 110 },
      "top-wall",
    ),
    sweepCircleAgainstSegment(
      position,
      velocity,
      dt,
      SHOT_RADIUS,
      { x: 18, y: 780 },
      { x: 372, y: 780 },
      "bottom-wall",
    ),
  ].filter((hit): hit is SweepHit => hit !== null);
}

export function createRicochetGame(input: {
  readonly seed: number;
  readonly heroId: HeroId;
  readonly runId: string;
  readonly emit: (event: {
    readonly event: string;
    readonly payload: Readonly<Record<string, unknown>>;
  }) => void;
}) {
  const state: MutableState = {
    runId: input.runId,
    seed: input.seed,
    heroId: input.heroId,
    mode: "aiming",
    roomIndex: 0,
    shot: null,
    targets: roomTargets(0),
    offer: [],
    build: [],
    score: 0,
    shotsRemaining: 5,
    boss: null,
    lastShotTrace: [],
  };
  let aimOrigin: Vec2 | null = null;
  let aimPoint: Vec2 | null = null;
  let aimPreview: AimPreview | null = null;
  const hasBuild = (id: string) =>
    state.build.some((item) => item.id === id);

  const velocityForAim = (): Vec2 => {
    if (!aimOrigin || !aimPoint) {
      throw new Error("AIM_INCOMPLETE");
    }
    const pull = sub(aimOrigin, aimPoint);
    const strength = Math.min(
      1,
      Math.max(0.35, Math.hypot(pull.x, pull.y) / 110),
    );
    return scale(
      normalize(pull),
      LAUNCH_SPEED * strength,
    );
  };

  const buildPreview = (velocity: Vec2): AimPreview => {
    let point = LAUNCHER;
    let current = velocity;
    const points: Vec2[] = [point];
    let bounceCount = 0;
    for (let index = 0; index < 90; index += 1) {
      const hits = wallHits(point, current, 1 / 30).sort(
        (a, b) =>
          a.toi - b.toi ||
          a.colliderId.localeCompare(b.colliderId),
      );
      const hit = hits[0];
      if (hit) {
        point = add(
          hit.point,
          scale(hit.normal, 0.5),
        );
        points.push(point);
        current = reflect(current, hit.normal);
        bounceCount += 1;
        if (bounceCount >= (hasBuild("double-bank") ? 3 : 2)) break;
      } else {
        point = add(point, scale(current, 1 / 30));
        if (index % 8 === 0) points.push(point);
      }
    }
    points.push(point);
    return { points, bounceCount };
  };

  const enterChoice = () => {
    state.shot = null;
    state.mode = "choosing";
    state.offer = offerFor(state.seed, state.roomIndex);
    input.emit({
      event: "room_clear",
      payload: { roomIndex: state.roomIndex },
    });
  };

  const snapshot = (): RicochetSnapshot => ({
    runId: state.runId,
    seed: state.seed,
    heroId: state.heroId,
    mode: state.mode,
    roomIndex: state.roomIndex,
    shot: state.shot
      ? {
          ...state.shot,
          position: { ...state.shot.position },
          velocity: { ...state.shot.velocity },
        }
      : null,
    targets: state.targets.map((target) => ({
      ...target,
      position: { ...target.position },
    })),
    offer: state.offer.map((item) => ({ ...item })),
    build: state.build.map((item) => ({ ...item })),
    buildTags: [
      ...new Set(state.build.map((item) => item.tag)),
    ],
    score: state.score,
    shotsRemaining: state.shotsRemaining,
    boss: state.boss
      ? structuredClone(state.boss)
      : null,
    lastShotTrace: state.lastShotTrace.map((point) => ({
      ...point,
    })),
  });

  const damageBossPart = (
    partId: "armor" | "weapon" | "core",
    damage: number,
  ) => {
    if (!state.boss) return;
    const allowed =
      (partId === "armor" &&
        state.boss.phase === "shielded") ||
      (partId === "weapon" &&
        state.boss.phase === "weapon-exposed") ||
      (partId === "core" &&
        state.boss.phase === "core-exposed");
    if (!allowed) return;
    const part = state.boss.parts[partId];
    const hp = Math.max(0, part.hp - damage);
    const nextPart = {
      ...part,
      hp,
      active: hp > 0,
    };
    const parts = {
      ...state.boss.parts,
      [partId]: nextPart,
    };
    const phase: BossState["phase"] =
      hp > 0
        ? state.boss.phase
        : partId === "armor"
          ? "weapon-exposed"
          : partId === "weapon"
            ? "core-exposed"
            : "defeated";
    state.boss = { phase, parts };
    state.targets = Object.values(parts);
    if (phase === "defeated") {
      state.mode = "won";
      state.shot = null;
      input.emit({
        event: "run_end",
        payload: { result: "won", roomIndex: 5 },
      });
    }
  };

  return {
    beginAim(point: Vec2) {
      if (state.mode !== "aiming") return;
      aimOrigin = point;
      aimPoint = point;
    },
    updateAim(point: Vec2) {
      if (!aimOrigin || state.mode !== "aiming") return;
      aimPoint = point;
      aimPreview = buildPreview(velocityForAim());
    },
    cancelAim() {
      aimOrigin = null;
      aimPoint = null;
      aimPreview = null;
    },
    releaseAim() {
      if (!aimOrigin || !aimPoint || state.mode !== "aiming") return;
      const velocity = velocityForAim();
      state.shot = {
        position: LAUNCHER,
        velocity,
        skillAvailable: true,
        remainingSeconds: SHOT_MAX_SECONDS,
        combo: 0,
        maxCombo: 0,
        wallBounces: 0,
        skillRefreshUsed: false,
      };
      state.lastShotTrace = [LAUNCHER];
      state.mode = "flying";
      aimPreview = null;
      input.emit({
        event: "first_input",
        payload: {
          roomIndex: state.roomIndex,
          angle: Math.atan2(velocity.y, velocity.x),
        },
      });
      aimOrigin = null;
      aimPoint = null;
    },
    useSkill() {
      const shot = state.shot;
      if (!shot || !shot.skillAvailable || state.mode !== "flying") return;
      if (state.heroId === "tuo") {
        shot.velocity = scale(
          shot.velocity,
          hasBuild("skill-charge") ? 1.4 : 1.28,
        );
      } else if (state.heroId === "mio") {
        shot.velocity = {
          x:
            -shot.velocity.x *
            (hasBuild("skill-echo") ? 1.16 : 1),
          y: shot.velocity.y,
        };
      } else {
        const range =
          130 +
          (hasBuild("skill-charge") ? 45 : 0) +
          (hasBuild("skill-orbit") ? 55 : 0);
        const damage = 25 + (hasBuild("skill-echo") ? 20 : 0);
        state.targets = state.targets.map((target) =>
          target.active &&
          Math.hypot(
            target.position.x - shot.position.x,
            target.position.y - shot.position.y,
          ) < range
            ? {
                ...target,
                hp: Math.max(0, target.hp - damage),
                active: target.hp > damage,
              }
            : target,
        );
      }
      shot.skillAvailable = false;
      input.emit({
        event: "skill_used",
        payload: {
          heroId: state.heroId,
          roomIndex: state.roomIndex,
        },
      });
    },
    fixedUpdate(dt: number) {
      const shot = state.shot;
      if (!shot || state.mode !== "flying") return;
      const candidates = [
        ...wallHits(shot.position, shot.velocity, dt),
        ...state.targets
          .filter((target) => target.active)
          .map((target) =>
            sweepCircleAgainstCircle(
              shot.position,
              shot.velocity,
              dt,
              SHOT_RADIUS,
              target.position,
              target.radius,
              target.id,
            ),
          )
          .filter((hit): hit is SweepHit => hit !== null),
      ].sort(
        (a, b) =>
          a.toi - b.toi ||
          a.colliderId.localeCompare(b.colliderId),
      );
      const hit = candidates[0];
      if (hit) {
        shot.position = add(
          hit.point,
          scale(hit.normal, 1.2),
        );
        shot.velocity = reflect(
          shot.velocity,
          hit.normal,
        );
        if (hit.colliderId.endsWith("wall")) {
          shot.wallBounces += 1;
          if (hasBuild("bank-plus")) {
            shot.velocity = scale(shot.velocity, 1.06);
          }
          if (hasBuild("wall-spark")) {
            state.score += 25 * Math.min(shot.wallBounces, 8);
          }
          if (
            hasBuild("skill-bank") &&
            !shot.skillAvailable &&
            !shot.skillRefreshUsed &&
            shot.wallBounces >= 2
          ) {
            shot.skillAvailable = true;
            shot.skillRefreshUsed = true;
          }
        } else {
          if (hit.colliderId.startsWith("boss-")) {
            const partId = hit.colliderId.slice(5) as
              | "armor"
              | "weapon"
              | "core";
            const damage =
              (state.heroId === "tuo" && !shot.skillAvailable
                ? 70
                : 42) +
              (hasBuild("bank-armor") && shot.wallBounces > 0
                ? 22
                : 0) +
              (hasBuild("combo-finish") ? shot.combo * 7 : 0);
            damageBossPart(partId, damage);
          } else {
            state.targets = state.targets.map((target) =>
              target.id === hit.colliderId
                ? {
                    ...target,
                    hp: 0,
                    active: false,
                  }
                : target,
            );
            if (hasBuild("combo-split")) {
              const nearby = state.targets
                .filter(
                  (target) =>
                    target.active && target.id !== hit.colliderId,
                )
                .sort(
                  (a, b) =>
                    Math.hypot(
                      a.position.x - hit.point.x,
                      a.position.y - hit.point.y,
                    ) -
                    Math.hypot(
                      b.position.x - hit.point.x,
                      b.position.y - hit.point.y,
                    ),
                )[0];
              if (nearby) {
                state.targets = state.targets.map((target) =>
                  target.id === nearby.id
                    ? {
                        ...target,
                        hp: Math.max(0, target.hp - 20),
                        active: target.hp > 20,
                      }
                    : target,
                );
              }
            }
          }
          shot.combo += 1;
          shot.maxCombo = Math.max(
            shot.maxCombo,
            shot.combo,
          );
          state.score += 100 * shot.combo;
          if (
            hasBuild("combo-five") &&
            shot.combo % 5 === 0
          ) {
            const bonusTarget = state.targets.find(
              (target) => target.active && target.kind !== "boss",
            );
            if (bonusTarget) {
              state.targets = state.targets.map((target) =>
                target.id === bonusTarget.id
                  ? { ...target, hp: 0, active: false }
                  : target,
              );
              state.score += 500;
            }
          }
        }
      } else {
        shot.position = add(
          shot.position,
          scale(shot.velocity, dt),
        );
      }
      shot.remainingSeconds -= dt;
      if (state.lastShotTrace.length < 160) {
        state.lastShotTrace.push({ ...shot.position });
      }
      if (
        state.mode === "flying" &&
        state.targets.every((target) => !target.active)
      ) {
        enterChoice();
      } else if (
        state.mode === "flying" &&
        shot.remainingSeconds <= 0
      ) {
        state.shot = null;
        state.shotsRemaining -= 1;
        state.mode =
          state.shotsRemaining <= 0 ? "lost" : "aiming";
      }
    },
    choose(modifierId: string) {
      if (state.mode !== "choosing") return;
      const selected = state.offer.find(
        (item) => item.id === modifierId,
      );
      if (!selected) return;
      state.build.push(selected);
      state.offer = [];
      aimPreview = null;
      state.roomIndex += 1;
      state.shotsRemaining = 5;
      if (state.roomIndex < 5) {
        state.targets = roomTargets(state.roomIndex);
        state.mode = "aiming";
      } else {
        state.boss = createBoss();
        state.targets = Object.values(state.boss.parts);
        state.mode = "aiming";
      }
      input.emit({
        event: "choice_selected",
        payload: {
          modifierId,
          roomIndex: state.roomIndex,
        },
      });
    },
    damageBossPart,
    debugCompleteRoomForTest() {
      if (state.roomIndex >= 5) return;
      state.targets = state.targets.map((target) => ({
        ...target,
        hp: 0,
        active: false,
      }));
      enterChoice();
    },
    preview: () => aimPreview,
    snapshot,
  };
}
