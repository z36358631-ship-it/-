import type { EnemyId, LaneId, RunVariant } from "../domain/types";

export interface ScheduledSpawn {
  atMs: number;
  lane: LaneId;
  enemyId: EnemyId;
}

export interface WaveVariantDefinition {
  spawns: readonly ScheduledSpawn[];
  laneLocks: readonly { lane: LaneId; startsAtMs: number; endsAtMs: number }[];
}

const spawn = (atMs: number, lane: LaneId, enemyId: EnemyId): ScheduledSpawn => ({
  atMs,
  lane,
  enemyId,
});

export const WAVE_VARIANTS: Readonly<Record<RunVariant, WaveVariantDefinition>> = {
  "balanced-front": {
    spawns: [
      spawn(4_000, 0, "grunt"), spawn(7_000, 1, "grunt"), spawn(10_000, 2, "runner"),
      spawn(20_000, 0, "armored"), spawn(26_000, 2, "caster"), spawn(34_000, 1, "runner"),
      spawn(48_000, 0, "elite"), spawn(58_000, 2, "armored"), spawn(68_000, 1, "caster"),
      spawn(82_000, 0, "runner"), spawn(90_000, 1, "elite"), spawn(98_000, 2, "runner"),
      spawn(116_000, 2, "armored"), spawn(130_000, 0, "caster"), spawn(144_000, 1, "elite"),
      spawn(164_000, 0, "elite"), spawn(180_000, 2, "caster"), spawn(202_000, 1, "armored"),
      spawn(220_000, 0, "runner"), spawn(230_000, 2, "elite"),
    ],
    laneLocks: [],
  },
  lockdown: {
    spawns: [
      spawn(4_000, 1, "runner"), spawn(8_000, 0, "grunt"), spawn(12_000, 2, "grunt"),
      spawn(24_000, 1, "caster"), spawn(38_000, 0, "armored"), spawn(42_000, 2, "runner"),
      spawn(56_000, 1, "elite"), spawn(72_000, 0, "caster"), spawn(88_000, 2, "armored"),
      spawn(106_000, 2, "elite"), spawn(122_000, 1, "runner"), spawn(140_000, 0, "elite"),
      spawn(158_000, 1, "caster"), spawn(176_000, 2, "runner"), spawn(194_000, 0, "armored"),
      spawn(214_000, 1, "elite"), spawn(230_000, 2, "caster"),
    ],
    laneLocks: [
      { lane: 1, startsAtMs: 45_000, endsAtMs: 65_000 },
      { lane: 0, startsAtMs: 170_000, endsAtMs: 190_000 },
    ],
  },
  "elite-rush": {
    spawns: [
      spawn(4_000, 2, "runner"), spawn(7_000, 1, "runner"), spawn(10_000, 0, "runner"),
      spawn(20_000, 2, "elite"), spawn(34_000, 0, "armored"), spawn(46_000, 1, "elite"),
      spawn(62_000, 2, "caster"), spawn(78_000, 0, "elite"), spawn(96_000, 1, "armored"),
      spawn(114_000, 2, "elite"), spawn(132_000, 0, "caster"), spawn(150_000, 1, "elite"),
      spawn(170_000, 2, "armored"), spawn(188_000, 0, "elite"), spawn(204_000, 1, "caster"),
      spawn(220_000, 2, "elite"), spawn(232_000, 0, "runner"),
    ],
    laneLocks: [],
  },
};
