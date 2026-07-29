import { ENEMIES } from "../content/enemies";
import type { BattleState, EnemyInstance, GridPosition } from "./types";

export function selectTarget(
  state: BattleState,
  origin: GridPosition,
  rangeColumns: number,
): EnemyInstance | null {
  const candidates = state.enemies
    .filter((enemy) =>
      enemy.status !== "defeated" &&
      enemy.lane === origin.lane &&
      enemy.progress >= Math.max(0, origin.column - 0.35) &&
      enemy.progress - origin.column <= rangeColumns,
    )
    .sort((left, right) =>
      right.progress - left.progress ||
      ENEMIES[right.enemyId].threat - ENEMIES[left.enemyId].threat ||
      left.instanceId.localeCompare(right.instanceId),
    );
  const focused =
    state.elapsedMs < state.focusFire.expiresAtMs
      ? candidates.find(({ instanceId }) => instanceId === state.focusFire.targetId)
      : undefined;
  return focused ?? candidates[0] ?? null;
}
