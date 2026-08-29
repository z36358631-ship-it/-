import type { ResultView } from './types';

interface ResultPanelProps {
  result: ResultView;
  wave: number;
  integrity: number;
  maxIntegrity: number;
  onRestart: () => void;
}

export function ResultPanel({
  result,
  wave,
  integrity,
  maxIntegrity,
  onRestart,
}: ResultPanelProps) {
  const won = result.status === 'won';
  return (
    <div className="result-backdrop">
      <section
        className={`result-panel result-panel--${result.status}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <span className="result-panel__eyebrow">第 {wave} 波结算</span>
        <h2 id="result-title">{won ? '防线守住' : '核心失守'}</h2>
        <div className="result-panel__integrity" aria-label={`最终完整度 ${integrity}/${maxIntegrity}`}>
          <strong>{integrity}</strong>
          <span>/{maxIntegrity} 完整度</span>
        </div>
        <div className="result-panel__cause">
          <span>{won ? '关键结果' : '主要原因'}</span>
          <strong>{result.cause}</strong>
          {result.actionHint ? <p>{result.actionHint}</p> : null}
        </div>
        {result.replaySummary ? (
          <p className="result-panel__replay">关键回放：{result.replaySummary}</p>
        ) : null}
        <button className="primary-button" type="button" onClick={onRestart}>
          再守一次
        </button>
        <small>新日程只改变来敌方向与顺序</small>
      </section>
    </div>
  );
}
