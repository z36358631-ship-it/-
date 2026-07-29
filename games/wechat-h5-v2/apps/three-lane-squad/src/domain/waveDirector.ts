import { ENEMIES } from "../content/enemies";
import { WAVE_VARIANTS } from "../content/waves";
import type { BattleState } from "./types";

const spawnEnemy = (
  state: BattleState,
  enemyId: keyof typeof ENEMIES,
  lane: 0 | 1 | 2,
): string => {
  const definition = ENEMIES[enemyId];
  const instanceId = `enemy-${state.nextEntitySeq++}`;
  state.enemies.push({
    instanceId,
    enemyId,
    lane,
    progress: 0,
    health: definition.health,
    maxHealth: definition.health,
    armor: definition.armor,
    status: "advancing",
  });
  state.events.push({
    seq: state.nextEventSeq++,
    atMs: state.elapsedMs,
    type: "enemy_spawned",
    payload: { instanceId, enemyId, lane },
  });
  return instanceId;
};

export function advanceWaveDirector(input: BattleState): BattleState {
  const state = structuredClone(input);
  const definition = WAVE_VARIANTS[state.variant];
  while (
    state.waveSpawnCursor < definition.spawns.length &&
    definition.spawns[state.waveSpawnCursor]!.atMs <= state.elapsedMs
  ) {
    const scheduled = definition.spawns[state.waveSpawnCursor]!;
    spawnEnemy(state, scheduled.enemyId, scheduled.lane);
    state.waveSpawnCursor += 1;
  }

  const dueLocks = definition.laneLocks.filter(({ startsAtMs }) => startsAtMs <= state.elapsedMs);
  if (state.appliedLaneLockCount < dueLocks.length) {
    const lock = dueLocks[state.appliedLaneLockCount]!;
    state.laneLock = { ...lock };
    state.appliedLaneLockCount += 1;
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: lock.startsAtMs,
      type: "lane_locked",
      payload: { lane: lock.lane, endsAtMs: lock.endsAtMs },
    });
  }
  if (state.laneLock && state.elapsedMs >= state.laneLock.endsAtMs) state.laneLock = null;

  if (state.elapsedMs >= 240_000 && state.boss.phase === "absent") {
    state.boss.phase = "advance";
    state.boss.phaseEndsAtMs = state.elapsedMs + 10_000;
    const instanceId = spawnEnemy(state, "boss", state.boss.lane);
    state.boss.instanceId = instanceId;
  }
  return state;
}
