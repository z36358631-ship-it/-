export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type HeroId = "tuo" | "mio" | "nia";
export type BuildTag = "bank" | "skill" | "combo";

export interface TargetState {
  readonly id: string;
  readonly kind: "enemy" | "mechanism" | "boss";
  readonly position: Vec2;
  readonly radius: number;
  readonly maxHp: number;
  readonly hp: number;
  readonly active: boolean;
}

export interface ShotState {
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly skillAvailable: boolean;
  readonly remainingSeconds: number;
  readonly combo: number;
  readonly maxCombo: number;
}

export interface Modifier {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tag: BuildTag;
}

export interface BossState {
  readonly phase:
    | "shielded"
    | "weapon-exposed"
    | "core-exposed"
    | "defeated";
  readonly parts: Readonly<
    Record<"armor" | "weapon" | "core", TargetState>
  >;
}

export interface AimPreview {
  readonly points: readonly Vec2[];
  readonly bounceCount: number;
}

export interface RicochetSnapshot {
  readonly runId: string;
  readonly seed: number;
  readonly heroId: HeroId;
  readonly mode:
    | "aiming"
    | "flying"
    | "choosing"
    | "won"
    | "lost";
  readonly roomIndex: number;
  readonly shot: ShotState | null;
  readonly targets: readonly TargetState[];
  readonly offer: readonly Modifier[];
  readonly build: readonly Modifier[];
  readonly buildTags: readonly BuildTag[];
  readonly score: number;
  readonly shotsRemaining: number;
  readonly boss: BossState | null;
  readonly lastShotTrace: readonly Vec2[];
}
