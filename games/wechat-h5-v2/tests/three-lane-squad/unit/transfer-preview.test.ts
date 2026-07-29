import { describe, expect, it } from "vitest";
import {
  buildTransferPreview,
  TRANSFER_REASON_COPY,
} from "../../../apps/three-lane-squad/src/app/createThreeLaneApp";
import { applyCommand } from "../../../apps/three-lane-squad/src/domain/applyCommand";
import { createBattle } from "../../../apps/three-lane-squad/src/domain/createBattle";

const squad = ["guardian", "ranger", "mage", "engineer", "priest"] as const;

const createState = () => {
  const state = createBattle({
    seed: 12,
    runId: "transfer-preview",
    runOrdinal: 0,
    squad,
    mode: "standard",
  });
  state.mode = "playing";
  state.energy = 20;
  return applyCommand(state, {
    type: "deploy",
    heroId: "ranger",
    to: { lane: 0, column: 0 },
    atMs: 0,
  }).state;
};

describe("three lane transfer preview", () => {
  it("marks every legal destination and describes the hovered cell", () => {
    const state = createState();
    const hero = state.heroes[0]!;
    const preview = buildTransferPreview(
      state,
      hero.instanceId,
      { x: 195, y: 300 },
      { lane: 1, column: 1 },
      1_000,
    );

    expect(preview.source).toEqual(hero.position);
    expect(preview.hoveredCell).toEqual({ lane: 1, column: 1 });
    expect(preview.feedback).toBe(TRANSFER_REASON_COPY.ok);
    expect(preview.cells.find(({ position }) =>
      position.lane === 1 && position.column === 1,
    )?.reason).toBe("ok");
    expect(preview.cells.filter(({ reason }) => reason === "ok")).toHaveLength(11);
  });

  it("uses distinct Chinese feedback for occupied, locked, cooldown and moving states", () => {
    const occupied = createState();
    const hero = occupied.heroes[0]!;
    const target = occupied.grid.find(({ position }) =>
      position.lane === 1 && position.column === 1,
    )!;
    target.heroInstanceId = "blocker";

    const locked = createState();
    locked.laneLock = { lane: 1, startsAtMs: 500, endsAtMs: 1_500 };

    const cooldown = createState();
    cooldown.heroes[0]!.transferReadyAtMs = 1_001;

    const moving = createState();
    moving.heroes[0]!.status = "moving";

    const cases = [
      { state: occupied, reason: "occupied" as const },
      { state: locked, reason: "locked-lane" as const },
      { state: cooldown, reason: "cooldown" as const },
      { state: moving, reason: "moving" as const },
    ];

    for (const testCase of cases) {
      const preview = buildTransferPreview(
        testCase.state,
        hero.instanceId,
        { x: 195, y: 300 },
        { lane: 1, column: 1 },
        1_000,
      );
      expect(preview.feedback).toBe(TRANSFER_REASON_COPY[testCase.reason]);
      expect(preview.cells.find(({ position }) =>
        position.lane === 1 && position.column === 1,
      )?.reason).toBe(testCase.reason);
    }

    expect(new Set(cases.map(({ reason }) => TRANSFER_REASON_COPY[reason])).size).toBe(4);
  });
});
