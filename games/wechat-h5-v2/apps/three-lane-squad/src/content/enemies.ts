import type { EnemyDefinition, EnemyId } from "../domain/types";

export const ENEMIES: Readonly<Record<EnemyId, EnemyDefinition>> = {
  grunt: { id: "grunt", name: "裂隙步兵", health: 95, speedColumnsPerSecond: 0.3, armor: 0, threat: 1, reward: 1, color: "#d87d67" },
  runner: { id: "runner", name: "迅影兽", health: 68, speedColumnsPerSecond: 0.55, armor: 0, threat: 3, reward: 1, color: "#ffb45d" },
  armored: { id: "armored", name: "铁壳卫", health: 260, speedColumnsPerSecond: 0.19, armor: 42, threat: 4, reward: 2, color: "#8a96ad" },
  caster: { id: "caster", name: "虚空术士", health: 150, speedColumnsPerSecond: 0.24, armor: 8, threat: 5, reward: 2, color: "#b178df" },
  elite: { id: "elite", name: "破阵精英", health: 420, speedColumnsPerSecond: 0.27, armor: 28, threat: 7, reward: 3, color: "#e04e68" },
  boss: { id: "boss", name: "虚空领主", health: 2200, speedColumnsPerSecond: 0.08, armor: 55, threat: 10, reward: 0, color: "#7f45d6" },
};
