interface PhaseControlsProps {
  phaseLabel: string;
  phaseTimeRemainingMs?: number | null;
  paused: boolean;
  commandAvailable: boolean;
  hasSelection: boolean;
  onTogglePause: () => void;
}

function timeLabel(milliseconds?: number | null) {
  if (milliseconds === null || milliseconds === undefined) return '—';
  return `${Math.max(0, milliseconds / 1000).toFixed(1)}s`;
}

export function PhaseControls({
  phaseLabel,
  phaseTimeRemainingMs,
  paused,
  commandAvailable,
  hasSelection,
  onTogglePause,
}: PhaseControlsProps) {
  const guidance = paused
    ? '战局已冻结'
    : commandAvailable
      ? hasSelection
        ? '点亮空位完成调防'
        : '点守卫，再点空位'
      : '观察来敌，等待调防';

  return (
    <section className="phase-controls" aria-label="战局控制">
      <div className="phase-controls__status" role="status" aria-live="polite">
        <span className={`phase-controls__pulse${commandAvailable && !paused ? ' is-command' : ''}`} aria-hidden="true" />
        <div>
          <strong>{phaseLabel}</strong>
          <span>{guidance}</span>
        </div>
      </div>
      <output className="phase-controls__timer" aria-label={`当前阶段剩余 ${timeLabel(phaseTimeRemainingMs)}`}>
        {timeLabel(phaseTimeRemainingMs)}
      </output>
      <button
        className="icon-button icon-button--pause"
        type="button"
        aria-label={paused ? '继续游戏' : '暂停游戏'}
        aria-pressed={paused}
        onClick={onTogglePause}
      >
        <span className="pause-icon" aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
        <span>{paused ? '继续' : '暂停'}</span>
      </button>
    </section>
  );
}
