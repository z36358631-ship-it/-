import { HEROES } from "../content/heroes";
import type { BattleState, GridPosition, HeroId } from "./types";

export type BattleCommand =
  | { type: "deploy"; heroId: HeroId; to: GridPosition; atMs: number }
  | { type: "undo-deploy"; heroInstanceId: string; atMs: number }
  | { type: "evolve"; sourceId: string; targetId: string; atMs: number }
  | { type: "transfer"; heroInstanceId: string; to: GridPosition; atMs: number }
  | { type: "focus-fire"; enemyInstanceId: string; atMs: number };

export type CommandReason =
  | "ok"
  | "not-playing"
  | "occupied"
  | "locked-lane"
  | "insufficient-energy"
  | "not-in-squad"
  | "invalid-pair"
  | "max-tier"
  | "undo-expired"
  | "cooldown"
  | "moving"
  | "invalid-target";

export interface CommandResult {
  ok: boolean;
  state: BattleState;
  reason: CommandReason;
}

export interface CommandRules {
  rapidRelay?: boolean;
}

export type TransferCommand = Extract<BattleCommand, { type: "transfer" }>;

const recordAction = (
  state: BattleState,
  type: "deploy" | "undo_deploy" | "evolve" | "transfer" | "focus_fire",
  atMs: number,
  payload: Record<string, unknown>,
): void => {
  const gap = Math.max(0, atMs - state.lastMeaningfulActionAtMs);
  state.longestDecisionGapMs = Math.max(state.longestDecisionGapMs, gap);
  state.lastMeaningfulActionAtMs = atMs;
  state.meaningfulActionCount += 1;
  state.events.push({ seq: state.nextEventSeq++, atMs, type, payload });
};

const isLocked = (state: BattleState, lane: number, atMs: number): boolean =>
  state.laneLock?.lane === lane &&
  atMs >= state.laneLock.startsAtMs &&
  atMs < state.laneLock.endsAtMs;

export function validateTransferCommand(
  state: BattleState,
  command: TransferCommand,
): CommandReason {
  if (state.mode !== "playing" && state.mode !== "preparing") return "not-playing";
  const hero = state.heroes.find(({ instanceId }) => instanceId === command.heroInstanceId);
  if (!hero) return "invalid-target";
  if (hero.status === "moving") return "moving";
  if (command.atMs < hero.transferReadyAtMs) return "cooldown";
  if (isLocked(state, command.to.lane, command.atMs)) return "locked-lane";
  const destination = state.grid.find(({ position }) =>
    position.lane === command.to.lane && position.column === command.to.column,
  );
  if (!destination || destination.heroInstanceId) return "occupied";
  return "ok";
}

export function applyCommand(
  input: BattleState,
  command: BattleCommand,
  rules: CommandRules = {},
): CommandResult {
  if (input.mode !== "playing" && input.mode !== "preparing") {
    return { ok: false, state: input, reason: "not-playing" };
  }
  const state = structuredClone(input);
  if (command.type === "deploy") {
    if (!state.squad.includes(command.heroId)) return { ok: false, state: input, reason: "not-in-squad" };
    const cell = state.grid.find(({ position }) =>
      position.lane === command.to.lane && position.column === command.to.column,
    );
    if (!cell || cell.heroInstanceId) return { ok: false, state: input, reason: "occupied" };
    if (isLocked(state, command.to.lane, command.atMs)) return { ok: false, state: input, reason: "locked-lane" };
    const definition = HEROES[command.heroId];
    if (state.energy < definition.cost) return { ok: false, state: input, reason: "insufficient-energy" };
    const instanceId = `hero-${state.nextEntitySeq++}`;
    state.energy -= definition.cost;
    state.heroes.push({
      instanceId,
      heroId: command.heroId,
      deployedAtMs: command.atMs,
      tier: 1,
      position: { ...command.to },
      status: "ready",
      moveStartedAtMs: null,
      moveEndsAtMs: null,
      transferReadyAtMs: command.atMs,
      nextAttackAtMs: command.atMs,
    });
    cell.heroInstanceId = instanceId;
    recordAction(state, "deploy", command.atMs, { instanceId, heroId: command.heroId, to: command.to });
    return { ok: true, state, reason: "ok" };
  }
  if (command.type === "undo-deploy") {
    const hero = state.heroes.find(({ instanceId }) => instanceId === command.heroInstanceId);
    if (!hero || command.atMs - hero.deployedAtMs > 3000) {
      return { ok: false, state: input, reason: "undo-expired" };
    }
    state.energy = Math.min(20, state.energy + HEROES[hero.heroId].cost);
    state.heroes = state.heroes.filter(({ instanceId }) => instanceId !== hero.instanceId);
    const cell = state.grid.find(({ heroInstanceId }) => heroInstanceId === hero.instanceId);
    if (cell) cell.heroInstanceId = null;
    recordAction(state, "undo_deploy", command.atMs, { instanceId: hero.instanceId });
    return { ok: true, state, reason: "ok" };
  }
  if (command.type === "evolve") {
    const source = state.heroes.find(({ instanceId }) => instanceId === command.sourceId);
    const target = state.heroes.find(({ instanceId }) => instanceId === command.targetId);
    if (!source || !target || source === target || source.heroId !== target.heroId) {
      return { ok: false, state: input, reason: "invalid-pair" };
    }
    if (source.tier === 2 || target.tier === 2) return { ok: false, state: input, reason: "max-tier" };
    target.tier = 2;
    state.heroes = state.heroes.filter(({ instanceId }) => instanceId !== source.instanceId);
    const sourceCell = state.grid.find(({ heroInstanceId }) => heroInstanceId === source.instanceId);
    if (sourceCell) sourceCell.heroInstanceId = null;
    recordAction(state, "evolve", command.atMs, {
      sourceId: source.instanceId,
      targetId: target.instanceId,
      evolvedRule: HEROES[target.heroId].evolvedRule,
    });
    return { ok: true, state, reason: "ok" };
  }
  if (command.type === "transfer") {
    const reason = validateTransferCommand(input, command);
    if (reason !== "ok") return { ok: false, state: input, reason };
    const hero = state.heroes.find(({ instanceId }) => instanceId === command.heroInstanceId);
    const destination = state.grid.find(({ position }) =>
      position.lane === command.to.lane && position.column === command.to.column,
    );
    if (!hero || !destination) return { ok: false, state: input, reason: "invalid-target" };
    const origin = state.grid.find(({ heroInstanceId }) => heroInstanceId === hero.instanceId);
    if (origin) origin.heroInstanceId = null;
    destination.heroInstanceId = hero.instanceId;
    hero.position = { ...command.to };
    hero.status = "moving";
    hero.moveStartedAtMs = command.atMs;
    hero.moveEndsAtMs = command.atMs + 800;
    const priorTransfers = input.events.filter(({ type }) => type === "transfer").length;
    const cooldownMs = rules.rapidRelay && priorTransfers === 0 ? 3000 : 4000;
    hero.transferReadyAtMs = command.atMs + cooldownMs;
    recordAction(state, "transfer", command.atMs, { heroInstanceId: hero.instanceId, to: command.to });
    return { ok: true, state, reason: "ok" };
  }
  const target = state.enemies.find(({ instanceId, status }) =>
    instanceId === command.enemyInstanceId && status !== "defeated",
  );
  if (!target) return { ok: false, state: input, reason: "invalid-target" };
  if (command.atMs < state.focusFire.readyAtMs) return { ok: false, state: input, reason: "cooldown" };
  state.focusFire = {
    targetId: target.instanceId,
    readyAtMs: command.atMs + 20000,
    expiresAtMs: command.atMs + 5000,
  };
  recordAction(state, "focus_fire", command.atMs, { enemyInstanceId: target.instanceId, lane: target.lane });
  return { ok: true, state, reason: "ok" };
}
