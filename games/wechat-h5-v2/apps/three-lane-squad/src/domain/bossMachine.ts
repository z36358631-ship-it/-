import type { BattleState, LaneId } from "./types";

const weakestLane = (state: BattleState): LaneId =>
  ([0, 1, 2] as const)
    .map((lane) => ({
      lane,
      score: state.heroes
        .filter((hero) => hero.status !== "defeated" && hero.position.lane === lane)
        .reduce((sum, hero) => sum + hero.tier, 0),
    }))
    .sort((left, right) => left.score - right.score || left.lane - right.lane)[0]!.lane;

export function advanceBoss(input: BattleState): BattleState {
  if (input.boss.phase === "absent" || input.boss.phase === "defeated") return input;
  const state = structuredClone(input);
  const bossEnemy = state.enemies.find(({ instanceId }) => instanceId === state.boss.instanceId);
  if (state.boss.health <= 0 || (bossEnemy?.health ?? 0) <= 0) {
    state.boss.phase = "defeated";
    state.boss.health = 0;
    state.mode = "won";
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: "run_won",
      payload: { remainingBaseHealth: state.baseHealth },
    });
    return state;
  }
  if (!bossEnemy) return state;
  if (state.elapsedMs < state.boss.phaseEndsAtMs) return state;
  if (state.boss.phase === "advance" || state.boss.phase === "recover") {
    state.boss.phase = "switch-lane";
    state.boss.phaseEndsAtMs = state.elapsedMs + 2_000;
  } else if (state.boss.phase === "switch-lane") {
    state.boss.lane = weakestLane(state);
    if (bossEnemy) {
      bossEnemy.lane = state.boss.lane;
      bossEnemy.status = "casting";
    }
    state.boss.phase = "charge";
    state.boss.phaseEndsAtMs = state.elapsedMs + 4_000;
    state.boss.chargeEndsAtMs = state.boss.phaseEndsAtMs;
    state.boss.chargeDamage = 0;
    state.boss.interrupted = false;
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: "boss_charge",
      payload: { lane: state.boss.lane, endsAtMs: state.boss.chargeEndsAtMs },
    });
  } else if (state.boss.phase === "charge") {
    state.baseHealth = Math.max(0, state.baseHealth - 1);
    state.failureLane = state.boss.lane;
    state.boss.phase = "recover";
    state.boss.phaseEndsAtMs = state.elapsedMs + 5_000;
    state.boss.chargeEndsAtMs = null;
    if (bossEnemy) bossEnemy.status = "advancing";
  }
  if (state.baseHealth <= 0 && state.mode === "playing") {
    state.mode = "lost";
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: "run_lost",
      payload: { lane: state.failureLane },
    });
  }
  return state;
}
