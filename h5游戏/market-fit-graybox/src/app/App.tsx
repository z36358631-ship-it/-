import { useMemo } from 'react';

import {
  selectAllLaneThreats,
  selectLegalDestinationLanes,
  selectPhaseLabel,
  selectPrimaryFailureCause,
} from '../domain/selectors';
import type { DomainEvent, GameState } from '../domain/types';
import { GameScreen, type FeedbackEventView, type SelectorView } from '../ui/GameScreen';
import '../styles/game.css';
import { useGameSession } from './useGameSession';

function selectPhaseRemainingMs(state: GameState): number | null {
  if (state.phase === 'won' || state.phase === 'lost') return null;
  return Math.max(0, state.content.phaseDurations[state.phase] - state.phaseElapsedMs);
}

function describeThreat(counts: { swarm: number; speed: number; armor: number }): string {
  const parts = [
    counts.swarm > 0 ? `群×${counts.swarm}` : '',
    counts.speed > 0 ? `速×${counts.speed}` : '',
    counts.armor > 0 ? `甲×${counts.armor}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '平静';
}

function createSelectorView(state: GameState): SelectorView {
  const threats = selectAllLaneThreats(state);
  const cause = selectPrimaryFailureCause(state);
  const recentMoves = state.moveHistory.slice(-3);
  return {
    phaseLabel: selectPhaseLabel(state),
    phaseTimeRemainingMs: selectPhaseRemainingMs(state),
    laneLength: state.content.laneLength,
    legalDestinationLanes: selectLegalDestinationLanes(state),
    lanes: threats.map((threat) => ({
      lane: threat.lane,
      threatLevel:
        (threat.nextArrivalMs !== null && threat.nextArrivalMs <= 3_000) || threat.score >= 13
          ? 'danger'
          : threat.score >= 5
            ? 'watch'
            : 'calm',
      threatLabel: describeThreat(threat.counts),
      nextArrivalMs: threat.nextArrivalMs,
    })),
    ...(state.phase === 'won' || state.phase === 'lost'
      ? {
          result: {
            status: state.phase,
            cause: cause?.summary ?? (state.phase === 'won' ? '完成12波防守' : '核心完整度归零'),
            actionHint: cause?.recommendation,
            replaySummary:
              recentMoves.length > 0
                ? recentMoves
                    .map((move) => `${move.wave}波：${move.fromLane + 1}→${move.toLane + 1}号线`)
                    .join('；')
                : '本局未执行调防',
          },
        }
      : {}),
  };
}

const FEEDBACK_KIND_BY_EVENT: Partial<Record<DomainEvent['type'], FeedbackEventView['kind']>> = {
  guardMoved: 'guardMove',
  guardAttacked: 'hit',
  enemyDefeated: 'defeat',
  coreDamaged: 'coreImpact',
};

function selectFeedback(state: GameState): FeedbackEventView | null {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    const event = state.eventLog[index];
    const kind = FEEDBACK_KIND_BY_EVENT[event.type];
    if (!kind) continue;
    return {
      sequence: event.id,
      kind,
      lane: event.lane,
      guardId: event.guardId,
      enemyId: event.enemyId,
    };
  }
  return null;
}

export function App() {
  const session = useGameSession();
  const view = useMemo(() => createSelectorView(session.state), [session.state]);
  const feedback = useMemo(() => selectFeedback(session.state), [session.state]);

  return (
    <GameScreen
      state={session.state}
      view={view}
      feedback={feedback}
      telemetryStatus={session.telemetryStatus.ok ? undefined : session.telemetryStatus.message}
      onSelectGuard={session.selectGuard}
      onMoveGuard={session.moveGuard}
      onTogglePause={session.togglePause}
      onRestart={() => session.restart()}
    />
  );
}
