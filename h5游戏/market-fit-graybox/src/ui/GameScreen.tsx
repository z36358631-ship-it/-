import { useEffect, useRef, useState } from 'react';

import { createFeedbackAudio, type SoundCue } from '../audio/feedback';
import { RadialBattlefield } from './RadialBattlefield';
import { PhaseControls } from './PhaseControls';
import { ResultPanel } from './ResultPanel';
import type {
  FeedbackEventView,
  GameScreenState,
  GuardKind,
  LaneId,
  SelectorView,
} from './types';

export interface GameScreenProps {
  state: GameScreenState;
  view: SelectorView;
  feedback?: FeedbackEventView | null;
  telemetryStatus?: string;
  onSelectGuard: (kind: GuardKind) => void;
  onMoveGuard: (lane: LaneId) => void;
  onTogglePause: () => void;
  onRestart: () => void;
}

const FEEDBACK_CUE: Record<FeedbackEventView['kind'], SoundCue> = {
  guardMove: 'move',
  hit: 'hit',
  defeat: 'defeat',
  warning: 'warning',
  coreImpact: 'coreImpact',
};

function getInitialMuted() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('graybox.sound-muted') === 'true';
  } catch {
    return false;
  }
}

export function GameScreen({
  state,
  view,
  feedback,
  telemetryStatus,
  onSelectGuard,
  onMoveGuard,
  onTogglePause,
  onRestart,
}: GameScreenProps) {
  const [audio] = useState(() => createFeedbackAudio());
  const [muted, setMuted] = useState(getInitialMuted);
  const lastFeedbackSequence = useRef<number | null>(null);
  const commandAvailable = state.phase === 'prep' || state.phase === 'rescue';

  useEffect(() => {
    audio.setMuted(muted);
    try {
      window.localStorage.setItem('graybox.sound-muted', String(muted));
    } catch {
      // Local preference storage is optional and must never interrupt play.
    }
  }, [audio, muted]);

  useEffect(() => () => audio.dispose(), [audio]);

  useEffect(() => {
    if (!feedback || lastFeedbackSequence.current === feedback.sequence) return;
    lastFeedbackSequence.current = feedback.sequence;
    audio.play(FEEDBACK_CUE[feedback.kind]);
  }, [audio, feedback]);

  const toggleMute = () => {
    const nextMuted = !muted;
    audio.setMuted(nextMuted);
    if (!nextMuted) audio.arm();
    setMuted(nextMuted);
  };

  const armAndTogglePause = () => {
    audio.arm();
    onTogglePause();
  };

  return (
    <main className="game-screen" data-phase={state.phase}>
      <div
        className="game-screen__content"
        data-testid="game-content"
        inert={Boolean(view.result)}
        aria-hidden={view.result ? true : undefined}
      >
        <header className="game-hud">
          <div className="game-hud__identity">
            <span>调防灰盒 · v0.1</span>
            <strong aria-label={`第 ${state.wave} 波，共 12 波`}>
              第 {state.wave}<i>/12</i> 波
            </strong>
          </div>
          <div className="game-hud__actions">
            {telemetryStatus ? <span className="telemetry-status">{telemetryStatus}</span> : null}
            <button
              className="icon-button icon-button--sound"
              type="button"
              aria-label={muted ? '开启声音' : '关闭声音'}
              aria-pressed={muted}
              onClick={toggleMute}
            >
              <span aria-hidden="true">{muted ? '◌' : '◉'}</span>
              <span>{muted ? '静音' : '声音'}</span>
            </button>
          </div>
        </header>

        <RadialBattlefield
          state={state}
          view={view}
          feedback={feedback}
          onSelectGuard={onSelectGuard}
          onMoveGuard={onMoveGuard}
          onArmAudio={() => audio.arm()}
        />

        <PhaseControls
          phaseLabel={view.phaseLabel}
          phaseTimeRemainingMs={view.phaseTimeRemainingMs}
          paused={state.paused}
          commandAvailable={commandAvailable}
          hasSelection={Boolean(state.selectedGuard)}
          onTogglePause={armAndTogglePause}
        />
      </div>

      {view.result ? (
        <ResultPanel
          result={view.result}
          wave={state.wave}
          integrity={state.coreIntegrity}
          maxIntegrity={state.maxCoreIntegrity}
          onRestart={onRestart}
        />
      ) : null}
    </main>
  );
}

export type {
  FeedbackEventView,
  GameScreenState,
  GuardKind,
  LaneId,
  SelectorView,
} from './types';
