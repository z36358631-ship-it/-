import { ENEMIES } from "../content/enemies";
import { HEROES } from "../content/heroes";
import { selectTarget } from "./targeting";
import type { BattleState, EnemyInstance, HeroInstance } from "./types";

export const FIXED_TICK_MS = 50;

const dealDamage = (
  state: BattleState,
  source: HeroInstance,
  target: EnemyInstance,
  amount: number,
): void => {
  const absorbed = Math.min(target.armor, amount * 0.4);
  target.armor = Math.max(0, target.armor - amount * 0.18);
  const damage = Math.max(1, amount - absorbed);
  target.health -= damage;
  if (target.instanceId === state.boss.instanceId) {
    state.boss.health = Math.max(0, target.health);
    if (
      state.boss.phase === "charge" &&
      state.focusFire.targetId === target.instanceId &&
      state.elapsedMs < state.focusFire.expiresAtMs
    ) {
      state.boss.chargeDamage += damage;
      if (state.boss.chargeDamage >= 180) {
        state.boss.phase = "recover";
        state.boss.phaseEndsAtMs = state.elapsedMs + 6_000;
        state.boss.chargeEndsAtMs = null;
        state.boss.interrupted = true;
        target.status = "advancing";
        state.events.push({
          seq: state.nextEventSeq++,
          atMs: state.elapsedMs,
          type: "boss_interrupt",
          payload: { lane: state.boss.lane, damage: Math.round(state.boss.chargeDamage) },
        });
      }
    }
  }
  if (source.tier === 2 && source.heroId === "ranger") {
    const next = state.enemies
      .filter((enemy) => enemy !== target && enemy.lane === target.lane && enemy.status !== "defeated")
      .sort((left, right) => right.progress - left.progress)[0];
    if (next) next.health -= damage * 0.45;
  }
  if (source.tier === 2 && source.heroId === "mage") {
    for (const chained of state.enemies.filter((enemy) =>
      enemy !== target && Math.abs(enemy.lane - target.lane) === 1 && Math.abs(enemy.progress - target.progress) < 0.8,
    )) chained.health -= damage * 0.35;
  }
};

const resolveTick = (state: BattleState): void => {
  state.elapsedMs += FIXED_TICK_MS;
  state.energy = Math.min(20, state.energy + 0.0018 * FIXED_TICK_MS);
  if (state.focusFire.targetId && state.elapsedMs >= state.focusFire.expiresAtMs) {
    state.focusFire.targetId = null;
  }

  for (const hero of state.heroes) {
    if (hero.status === "moving" && hero.moveEndsAtMs !== null && state.elapsedMs >= hero.moveEndsAtMs) {
      hero.status = "ready";
      hero.moveStartedAtMs = null;
      hero.moveEndsAtMs = null;
    }
    if (hero.status !== "ready" || state.elapsedMs < hero.nextAttackAtMs) continue;
    const definition = HEROES[hero.heroId];
    const target = selectTarget(state, hero.position, definition.rangeColumns);
    if (!target) continue;
    const tierMultiplier = hero.tier === 2 ? 1.55 : 1;
    const focusMultiplier =
      target.instanceId === state.focusFire.targetId && state.elapsedMs < state.focusFire.expiresAtMs
        ? 1.35
        : 1;
    dealDamage(state, hero, target, definition.attack * tierMultiplier * focusMultiplier);
    hero.nextAttackAtMs = state.elapsedMs + definition.attackIntervalMs;
    if (hero.tier === 2 && hero.heroId === "priest") {
      state.energy = Math.min(20, state.energy + 0.35);
    }
  }

  const defeated = state.enemies.filter(({ health }) => health <= 0);
  for (const enemy of defeated) {
    enemy.status = "defeated";
    state.energy = Math.min(20, state.energy + ENEMIES[enemy.enemyId].reward);
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: "enemy_defeated",
      payload: { enemyInstanceId: enemy.instanceId, enemyId: enemy.enemyId, lane: enemy.lane },
    });
  }

  for (const enemy of state.enemies) {
    if (enemy.status === "defeated" || enemy.status === "casting") continue;
    const blockers = state.heroes
      .filter((hero) =>
        hero.status === "ready" &&
        hero.position.lane === enemy.lane &&
        Math.abs(hero.position.column - enemy.progress) <= 0.2 &&
        HEROES[hero.heroId].blockCapacity > 0,
      )
      .sort((left, right) => right.tier - left.tier);
    if (blockers.length > 0) {
      enemy.status = "blocked";
      continue;
    }
    enemy.status = "advancing";
    const wallAura = state.heroes.some((hero) =>
      hero.tier === 2 && hero.heroId === "guardian" && hero.position.lane === enemy.lane,
    );
    const speedMultiplier = wallAura ? 0.72 : 1;
    enemy.progress += ENEMIES[enemy.enemyId].speedColumnsPerSecond * speedMultiplier * (FIXED_TICK_MS / 1000);
  }

  for (const enemy of state.enemies.filter(({ progress, status, enemyId }) =>
    status !== "defeated" && enemyId !== "boss" && progress >= 4,
  )) {
    state.baseHealth = Math.max(0, state.baseHealth - 1);
    state.failureLane = enemy.lane;
    enemy.status = "defeated";
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: "lane_breached",
      payload: { enemyInstanceId: enemy.instanceId, lane: enemy.lane },
    });
  }
  state.enemies = state.enemies.filter(({ status }) => status !== "defeated");
  if (state.baseHealth <= 0 && state.mode === "playing") {
    state.mode = "lost";
    state.events.push({
      seq: state.nextEventSeq++,
      atMs: state.elapsedMs,
      type: "run_lost",
      payload: { lane: state.failureLane },
    });
  }
};

export function advanceBattle(input: BattleState, deltaMs: number): BattleState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("DELTA_MUST_BE_NON_NEGATIVE");
  if (input.mode !== "playing") return input;
  const state = structuredClone(input);
  state.tickRemainderMs += deltaMs;
  while (state.tickRemainderMs >= FIXED_TICK_MS && state.mode === "playing") {
    state.tickRemainderMs -= FIXED_TICK_MS;
    resolveTick(state);
  }
  return state;
}
