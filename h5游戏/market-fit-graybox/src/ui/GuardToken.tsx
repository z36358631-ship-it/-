import type { KeyboardEvent } from 'react';

import { ENEMY_NAMES, GUARD_NAMES, type EnemyKind, type GuardKind } from './types';

interface GuardTokenProps {
  kind: GuardKind;
  x: number;
  y: number;
  selected: boolean;
  selectable: boolean;
  moving?: boolean;
  attacking?: boolean;
  onSelect: (kind: GuardKind) => void;
}

const GLYPHS: Record<GuardKind, string> = {
  heavy: '重',
  rapid: '连',
  sweep: '扫',
};

const PREFERRED_ENEMY: Record<GuardKind, EnemyKind> = {
  heavy: 'armor',
  rapid: 'speed',
  sweep: 'swarm',
};

const PREFERRED_GLYPHS: Record<EnemyKind, string> = {
  swarm: '群',
  speed: '速',
  armor: '甲',
};

function handleKeyboardActivate(
  event: KeyboardEvent<SVGGElement>,
  activate: () => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  activate();
}

export function GuardToken({
  kind,
  x,
  y,
  selected,
  selectable,
  moving = false,
  attacking = false,
  onSelect,
}: GuardTokenProps) {
  const activate = () => {
    if (selectable) onSelect(kind);
  };

  return (
    <g
      className={`guard-token guard-token--${kind}${selected ? ' is-selected' : ''}${moving ? ' is-moving' : ''}${attacking ? ' is-attacking' : ''}`}
      data-guard={kind}
      data-testid={`guard-${kind}`}
      role="button"
      tabIndex={selectable ? 0 : -1}
      aria-label={`${GUARD_NAMES[kind]}守卫，擅长${ENEMY_NAMES[PREFERRED_ENEMY[kind]]}${selected ? '，已选择' : ''}`}
      aria-pressed={selected}
      aria-disabled={!selectable}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      onClick={activate}
      onKeyDown={(event) => handleKeyboardActivate(event, activate)}
    >
      <circle className="guard-token__hit-area" r="29" />
      <g className="guard-token__motion">
        <circle className="guard-token__selection" r="27" />
        {kind === 'heavy' ? (
          <path className="guard-token__body" d="M 0 -22 L 19 -11 L 19 11 L 0 22 L -19 11 L -19 -11 Z" />
        ) : null}
        {kind === 'rapid' ? <circle className="guard-token__body" r="21" /> : null}
        {kind === 'sweep' ? (
          <rect className="guard-token__body" x="-19" y="-19" width="38" height="38" rx="9" />
        ) : null}
        <text className="guard-token__glyph" textAnchor="middle" dominantBaseline="central">
          {GLYPHS[kind]}
        </text>
        <g className={`guard-token__match guard-token__match--${PREFERRED_ENEMY[kind]}`} transform="translate(17 -16)">
          <circle r="8" />
          <text textAnchor="middle" dominantBaseline="central">
            {PREFERRED_GLYPHS[PREFERRED_ENEMY[kind]]}
          </text>
        </g>
        <text className="guard-token__name" y="36" textAnchor="middle">
          {GUARD_NAMES[kind]}
        </text>
      </g>
    </g>
  );
}
