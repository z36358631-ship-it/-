import { describe, expect, it } from "vitest";
import { ENEMIES } from "../../../apps/three-lane-squad/src/content/enemies";
import { HEROES } from "../../../apps/three-lane-squad/src/content/heroes";
import { WAVE_VARIANTS } from "../../../apps/three-lane-squad/src/content/waves";
import { advanceBattle } from "../../../apps/three-lane-squad/src/domain/advanceBattle";
import {
  applyCommand,
  validateTransferCommand,
} from "../../../apps/three-lane-squad/src/domain/applyCommand";
import { advanceBoss } from "../../../apps/three-lane-squad/src/domain/bossMachine";
import { createBattle, standardVariantForRun } from "../../../apps/three-lane-squad/src/domain/createBattle";
import { advanceWaveDirector } from "../../../apps/three-lane-squad/src/domain/waveDirector";

const squad = ["guardian", "ranger", "mage", "engineer", "priest"] as const;

describe("three lane squad domain", () => {
  it("defines five heroes, six enemies and three actual wave variants", () => {
    expect(Object.keys(HEROES)).toHaveLength(5);
    expect(Object.keys(ENEMIES)).toHaveLength(6);
    expect(Object.values(HEROES).every(({ evolvedRule }) => evolvedRule.length > 5)).toBe(true);
    expect(WAVE_VARIANTS.lockdown.laneLocks).toHaveLength(2);
    expect(WAVE_VARIANTS["elite-rush"].spawns.filter(({ enemyId }) => enemyId === "elite").length).toBeGreaterThan(4);
  });

  it("rotates three standard variants in order", () => {
    expect([0, 1, 2, 3].map(standardVariantForRun)).toEqual([
      "balanced-front",
      "lockdown",
      "elite-rush",
      "balanced-front",
    ]);
  });

  it("deploys, undoes, evolves, transfers and focuses through immutable commands", () => {
    let state = createBattle({ seed: 1, runId: "commands", runOrdinal: 0, squad, mode: "standard" });
    state.mode = "playing";
    const deployed = applyCommand(state, { type: "deploy", heroId: "ranger", to: { lane: 0, column: 1 }, atMs: 100 });
    expect(deployed.ok).toBe(true);
    expect(state.heroes).toHaveLength(0);
    state = deployed.state;
    const firstId = state.heroes[0]!.instanceId;
    const undone = applyCommand(state, { type: "undo-deploy", heroInstanceId: firstId, atMs: 2_999 });
    expect(undone.ok).toBe(true);
    state = undone.state;
    state.energy = 20;
    state = applyCommand(state, { type: "deploy", heroId: "ranger", to: { lane: 0, column: 1 }, atMs: 4_000 }).state;
    state = applyCommand(state, { type: "deploy", heroId: "ranger", to: { lane: 1, column: 1 }, atMs: 4_100 }).state;
    const [source, target] = state.heroes;
    state = applyCommand(state, { type: "evolve", sourceId: source!.instanceId, targetId: target!.instanceId, atMs: 4_200 }).state;
    expect(state.heroes).toHaveLength(1);
    expect(state.heroes[0]!.tier).toBe(2);
    state = applyCommand(state, { type: "transfer", heroInstanceId: target!.instanceId, to: { lane: 2, column: 2 }, atMs: 5_000 }).state;
    expect(state.heroes[0]!.moveEndsAtMs).toBe(5_800);
    expect(state.heroes[0]!.transferReadyAtMs).toBe(9_000);
    state.enemies.push({ instanceId: "target", enemyId: "elite", lane: 2, progress: 2.2, health: 100, maxHealth: 100, armor: 0, status: "advancing" });
    state = applyCommand(state, { type: "focus-fire", enemyInstanceId: "target", atMs: 6_000 }).state;
    expect(state.focusFire).toMatchObject({ targetId: "target", readyAtMs: 26_000, expiresAtMs: 11_000 });
  });

  it("shortens only the first transfer cooldown when rapid relay is active", () => {
    let state = createBattle({
      seed: 18,
      runId: "rapid-relay",
      runOrdinal: 1,
      squad: ["guardian", "ranger", "mage", "engineer", "priest"],
      mode: "standard",
    });
    state.mode = "playing";
    state = applyCommand(state, {
      type: "deploy",
      heroId: "ranger",
      to: { lane: 0, column: 1 },
      atMs: 0,
    }).state;
    const heroId = state.heroes[0]!.instanceId;
    state = applyCommand(
      state,
      {
        type: "transfer",
        heroInstanceId: heroId,
        to: { lane: 1, column: 1 },
        atMs: 1_000,
      },
      { rapidRelay: true },
    ).state;
    expect(state.heroes[0]!.transferReadyAtMs).toBe(4_000);
    state.heroes[0]!.status = "ready";
    state = applyCommand(
      state,
      {
        type: "transfer",
        heroInstanceId: heroId,
        to: { lane: 2, column: 1 },
        atMs: 4_000,
      },
      { rapidRelay: true },
    ).state;
    expect(state.heroes[0]!.transferReadyAtMs).toBe(8_000);
  });

  it("changes only base durability for a recovery battle", () => {
    const baseInput = {
      seed: 21,
      runId: "same-run",
      runOrdinal: 2,
      squad: ["guardian", "ranger", "mage", "engineer", "priest"] as const,
      mode: "standard" as const,
    };
    const standard = createBattle(baseInput);
    const recovery = createBattle({ ...baseInput, recovery: true });
    expect(recovery.baseHealth).toBe(4);
    expect({ ...recovery, baseHealth: 3, baseMaxHealth: 3 }).toEqual(standard);
  });

  it("uses the same pure validation result for transfer previews and submission", () => {
    const base = createBattle({ seed: 9, runId: "transfer-validation", runOrdinal: 0, squad, mode: "standard" });
    base.mode = "playing";
    base.energy = 20;
    const deployed = applyCommand(base, {
      type: "deploy",
      heroId: "guardian",
      to: { lane: 0, column: 0 },
      atMs: 100,
    }).state;
    const hero = deployed.heroes[0]!;
    const target = { lane: 1 as const, column: 1 as const };
    const command = {
      type: "transfer" as const,
      heroInstanceId: hero.instanceId,
      to: target,
      atMs: 1_000,
    };

    const cases = [
      { name: "legal", state: deployed, expected: "ok" },
      {
        name: "occupied",
        state: {
          ...structuredClone(deployed),
          grid: deployed.grid.map((cell) =>
            cell.position.lane === target.lane && cell.position.column === target.column
              ? { ...cell, heroInstanceId: "blocker" }
              : { ...cell },
          ),
        },
        expected: "occupied",
      },
      {
        name: "locked lane",
        state: {
          ...structuredClone(deployed),
          laneLock: { lane: target.lane, startsAtMs: 500, endsAtMs: 1_500 },
        },
        expected: "locked-lane",
      },
      {
        name: "cooldown",
        state: {
          ...structuredClone(deployed),
          heroes: deployed.heroes.map((candidate) => ({
            ...candidate,
            transferReadyAtMs: 1_001,
          })),
        },
        expected: "cooldown",
      },
      {
        name: "moving",
        state: {
          ...structuredClone(deployed),
          heroes: deployed.heroes.map((candidate) => ({
            ...candidate,
            status: "moving" as const,
          })),
        },
        expected: "moving",
      },
    ] as const;

    for (const testCase of cases) {
      const before = structuredClone(testCase.state);
      expect(validateTransferCommand(testCase.state, command), testCase.name).toBe(testCase.expected);
      expect(applyCommand(testCase.state, command).reason, testCase.name).toBe(testCase.expected);
      expect(testCase.state, `${testCase.name} validation must stay pure`).toEqual(before);
    }
  });

  it("advances only on deterministic 50ms ticks", () => {
    const a = createBattle({ seed: 2, runId: "a", runOrdinal: 0, squad, mode: "standard" });
    a.mode = "playing";
    a.enemies.push({ instanceId: "runner", enemyId: "runner", lane: 0, progress: 0, health: 68, maxHealth: 68, armor: 0, status: "advancing" });
    let sliced = structuredClone(a);
    const once = advanceBattle(a, 1_000);
    for (let index = 0; index < 10; index += 1) sliced = advanceBattle(sliced, 100);
    expect(sliced).toEqual(once);
  });

  it("spawns due enemies once and starts the boss at four minutes", () => {
    const state = createBattle({ seed: 3, runId: "waves", runOrdinal: 0, squad, mode: "standard" });
    state.mode = "playing";
    state.elapsedMs = 240_000;
    const next = advanceWaveDirector(state);
    expect(next.waveSpawnCursor).toBe(WAVE_VARIANTS["balanced-front"].spawns.length);
    expect(next.boss.phase).toBe("advance");
    expect(next.enemies.some(({ enemyId }) => enemyId === "boss")).toBe(true);
    const repeated = advanceWaveDirector(next);
    expect(repeated.enemies).toHaveLength(next.enemies.length);
  });

  it("makes the boss choose a weak lane, charge and damage the base", () => {
    let state = createBattle({ seed: 4, runId: "boss", runOrdinal: 0, squad, mode: "standard" });
    state.mode = "playing";
    state.elapsedMs = 250_000;
    state.boss = {
      phase: "switch-lane",
      instanceId: "boss",
      lane: 0,
      health: 2_200,
      maxHealth: 2_200,
      phaseEndsAtMs: state.elapsedMs,
      chargeEndsAtMs: null,
      chargeDamage: 0,
      interrupted: false,
    };
    state.enemies.push({ instanceId: "boss", enemyId: "boss", lane: 0, progress: 2, health: 2_200, maxHealth: 2_200, armor: 55, status: "advancing" });
    state.heroes.push({
      instanceId: "guard",
      heroId: "guardian",
      deployedAtMs: 0,
      tier: 1,
      position: { lane: 0, column: 2 },
      status: "ready",
      moveStartedAtMs: null,
      moveEndsAtMs: null,
      transferReadyAtMs: 0,
      nextAttackAtMs: 0,
    });
    state = advanceBoss(state);
    expect(state.boss.phase).toBe("charge");
    expect(state.boss.lane).toBe(1);
    state.elapsedMs = state.boss.phaseEndsAtMs;
    state = advanceBoss(state);
    expect(state.baseHealth).toBe(2);
    expect(state.boss.phase).toBe("recover");
  });

  it("interrupts a boss charge only through focused production damage", () => {
    const state = createBattle({ seed: 5, runId: "interrupt", runOrdinal: 0, squad, mode: "standard" });
    state.mode = "playing";
    state.elapsedMs = 250_000;
    state.boss = {
      phase: "charge",
      instanceId: "boss",
      lane: 1,
      health: 2_200,
      maxHealth: 2_200,
      phaseEndsAtMs: 254_000,
      chargeEndsAtMs: 254_000,
      chargeDamage: 0,
      interrupted: false,
    };
    state.focusFire = { targetId: "boss", readyAtMs: 270_000, expiresAtMs: 255_000 };
    state.enemies.push({ instanceId: "boss", enemyId: "boss", lane: 1, progress: 3, health: 2_200, maxHealth: 2_200, armor: 55, status: "casting" });
    state.heroes = Array.from({ length: 3 }, (_, index) => ({
      instanceId: `mage-${index}`,
      heroId: "mage" as const,
      deployedAtMs: 0,
      tier: 2 as const,
      position: { lane: 1 as const, column: index as 0 | 1 | 2 },
      status: "ready" as const,
      moveStartedAtMs: null,
      moveEndsAtMs: null,
      transferReadyAtMs: 0,
      nextAttackAtMs: 0,
    }));
    const next = advanceBattle(state, 50);
    expect(next.boss.phase).toBe("recover");
    expect(next.boss.interrupted).toBe(true);
    expect(next.events.some(({ type }) => type === "boss_interrupt")).toBe(true);
  });
});
