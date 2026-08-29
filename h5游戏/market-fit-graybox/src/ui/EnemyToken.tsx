import { ENEMY_NAMES, type EnemyKind } from './types';

interface EnemyTokenProps {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hit?: boolean;
  defeated?: boolean;
}

const GLYPHS: Record<EnemyKind, string> = {
  swarm: '群',
  speed: '速',
  armor: '甲',
};

export function EnemyToken({
  id,
  kind,
  x,
  y,
  hp,
  maxHp,
  hit = false,
  defeated = false,
}: EnemyTokenProps) {
  const healthRatio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  return (
    <g
      className={`enemy-token enemy-token--${kind}${hit ? ' is-hit' : ''}${defeated ? ' is-defeated' : ''}`}
      data-enemy={id}
      data-testid={`enemy-${id}`}
      aria-label={`${ENEMY_NAMES[kind]}，生命 ${hp}/${maxHp}`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <g className="enemy-token__motion">
        {kind === 'swarm' ? <path className="enemy-token__body" d="M 0 -14 L 14 12 L -14 12 Z" /> : null}
        {kind === 'speed' ? <path className="enemy-token__body" d="M 0 -15 L 15 0 L 0 15 L -15 0 Z" /> : null}
        {kind === 'armor' ? (
          <rect className="enemy-token__body" x="-14" y="-14" width="28" height="28" rx="4" />
        ) : null}
        <text className="enemy-token__glyph" textAnchor="middle" dominantBaseline="central">
          {GLYPHS[kind]}
        </text>
        <rect className="enemy-token__health-track" x="-14" y="18" width="28" height="3" rx="1.5" />
        <rect
          className="enemy-token__health-fill"
          x="-14"
          y="18"
          width={28 * healthRatio}
          height="3"
          rx="1.5"
        />
      </g>
    </g>
  );
}
