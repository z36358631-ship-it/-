import { useEffect, useRef, type KeyboardEvent } from 'react';

import { EnemyToken } from './EnemyToken';
import { GuardToken } from './GuardToken';
import {
  ENEMY_NAMES,
  LANE_IDS,
  LANE_NAMES,
  type EnemyKind,
  type EnemyViewState,
  type FeedbackEventView,
  type GameScreenState,
  type GuardKind,
  type LaneId,
  type SelectorView,
} from './types';

interface RadialBattlefieldProps {
  state: GameScreenState;
  view: SelectorView;
  feedback?: FeedbackEventView | null;
  onSelectGuard: (kind: GuardKind) => void;
  onMoveGuard: (lane: LaneId) => void;
  onArmAudio?: () => void;
}

const CENTER = { x: 195, y: 300 };
const LANE_OUTER_RADIUS = 190;
const PREVIEW_RADIUS = 178;
const GUARD_RADIUS = 88;
const ENEMY_OUTER_RADIUS = 124;
const ENEMY_INNER_RADIUS = 58;
const ENEMY_KINDS: EnemyKind[] = ['swarm', 'speed', 'armor'];
const ENEMY_GLYPHS: Record<EnemyKind, string> = {
  swarm: '群',
  speed: '速',
  armor: '甲',
};

function polarPoint(lane: LaneId, radius: number) {
  const angle = (-90 + lane * 60) * (Math.PI / 180);
  return {
    x: CENTER.x + Math.cos(angle) * radius,
    y: CENTER.y + Math.sin(angle) * radius,
  };
}

function formatTime(milliseconds: number | null) {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return '待命';
  return `${Math.max(0, milliseconds / 1000).toFixed(1)}秒`;
}

function visibleArrivalValue(milliseconds: number | null) {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return '—';
  return `${Math.max(0, milliseconds / 1000).toFixed(1)}s`;
}

function previewDescription(
  lane: LaneId,
  counts: Record<EnemyKind, number>,
  nextArrivalMs: number | null,
  threatLabel?: string,
) {
  const enemies = ENEMY_KINDS.filter((kind) => counts[kind] > 0)
    .map((kind) => `${ENEMY_NAMES[kind]} ${counts[kind]}`)
    .join('，');
  const arrival = nextArrivalMs === null
    ? '暂无预计抵达时间'
    : `预计${formatTime(nextArrivalMs)}抵达`;
  return `${LANE_NAMES[lane]}预告：${threatLabel ?? '平静'}，${enemies || '暂无来敌'}，${arrival}`;
}

function handleKeyboardActivate(
  event: KeyboardEvent<SVGGElement>,
  activate: () => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  activate();
}

function enemyPoint(
  enemy: EnemyViewState,
  index: number,
  enemies: EnemyViewState[],
  laneLength: number,
) {
  const boundedDistance = Math.max(0, Math.min(laneLength, enemy.distance));
  const progress = 1 - boundedDistance / laneLength;
  const radius = ENEMY_OUTER_RADIUS - (ENEMY_OUTER_RADIUS - ENEMY_INNER_RADIUS) * progress;
  const point = polarPoint(enemy.lane, radius);
  const laneIndex = enemies
    .slice(0, index)
    .filter((candidate) => candidate.lane === enemy.lane).length;
  const angle = (-90 + enemy.lane * 60) * (Math.PI / 180);
  const stagger = ((laneIndex % 3) - 1) * 7;
  return {
    x: point.x + -Math.sin(angle) * stagger,
    y: point.y + Math.cos(angle) * stagger,
  };
}

export function RadialBattlefield({
  state,
  view,
  feedback,
  onSelectGuard,
  onMoveGuard,
  onArmAudio,
}: RadialBattlefieldProps) {
  const previousEnemies = useRef<EnemyViewState[]>(state.enemies);
  const commandWindow = state.phase === 'prep' || state.phase === 'rescue';
  const legalDestinations = new Set(view.legalDestinationLanes);
  const guardByLane = new Map<LaneId, GuardKind>();
  Object.values(state.guards).forEach((guard) => guardByLane.set(guard.lane, guard.kind));

  const selectGuard = (kind: GuardKind) => {
    onArmAudio?.();
    onSelectGuard(kind);
  };

  const moveGuard = (lane: LaneId) => {
    onArmAudio?.();
    onMoveGuard(lane);
  };

  const defeatedEnemy = feedback?.kind === 'defeat'
    ? previousEnemies.current.find((enemy) => enemy.id === feedback.enemyId)
    : undefined;
  const attackTarget = feedback?.enemyId
    ? state.enemies.find((enemy) => enemy.id === feedback.enemyId) ?? defeatedEnemy
    : undefined;
  const attackGuard = feedback?.guardId ? state.guards[feedback.guardId] : undefined;
  const attackTargetList = state.enemies.some((enemy) => enemy.id === attackTarget?.id)
    ? state.enemies
    : previousEnemies.current;
  const attackTargetIndex = attackTarget
    ? attackTargetList.findIndex((enemy) => enemy.id === attackTarget.id)
    : -1;
  const attackTargetPoint = attackTarget && attackTargetIndex >= 0
    ? enemyPoint(
        attackTarget,
        attackTargetIndex,
        attackTargetList,
        Math.max(1, view.laneLength),
      )
    : undefined;
  const attackGuardPoint = attackGuard ? polarPoint(attackGuard.lane, GUARD_RADIUS) : undefined;

  useEffect(() => {
    previousEnemies.current = state.enemies;
  }, [state.enemies]);

  return (
    <div className="battlefield-frame">
      <svg
        className="battlefield"
        viewBox="0 0 390 640"
        role="region"
        aria-label="六向环阵战场。六条防线上的敌人向中央核心推进。"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>六向环阵调防战场</title>
        <defs>
          <radialGradient id="core-fill" cx="50%" cy="42%" r="65%">
            <stop offset="0" stopColor="var(--core-highlight)" />
            <stop offset="1" stopColor="var(--core-surface)" />
          </radialGradient>
          <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="battlefield__lanes" aria-hidden="true">
          {LANE_IDS.map((lane) => {
            const outer = polarPoint(lane, LANE_OUTER_RADIUS);
            const inner = polarPoint(lane, 54);
            const signal = view.lanes.find((item) => item.lane === lane);
            return (
              <g
                key={lane}
                className={`lane lane--${signal?.threatLevel ?? 'calm'}`}
                data-testid={`lane-${lane}`}
              >
                <line className="lane__bed" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
                <line className="lane__track" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
                {[0.2, 0.4, 0.6, 0.8].map((portion) => {
                  const point = polarPoint(lane, 54 + (LANE_OUTER_RADIUS - 54) * portion);
                  return <circle key={portion} className="lane__step" cx={point.x} cy={point.y} r="2.2" />;
                })}
              </g>
            );
          })}
        </g>

        <g className="battlefield__previews">
          {LANE_IDS.map((lane) => {
            const point = polarPoint(lane, PREVIEW_RADIUS);
            const preview = state.previews.find((item) => item.lane === lane) ?? {
              lane,
              counts: { swarm: 0, speed: 0, armor: 0 },
              nextSpawnInMs: null,
            };
            const signal = view.lanes.find((item) => item.lane === lane);
            const activeKinds = ENEMY_KINDS.filter((kind) => preview.counts[kind] > 0);
            return (
              <g
                key={lane}
                className={`threat-preview threat-preview--${signal?.threatLevel ?? 'calm'}`}
                transform={`translate(${point.x} ${point.y})`}
                role="group"
                aria-label={previewDescription(
                  lane,
                  preview.counts,
                  signal?.nextArrivalMs ?? null,
                  signal?.threatLabel,
                )}
                data-testid={`lane-preview-${lane}`}
              >
                <circle className="threat-preview__surface" r="38" />
                <text className="threat-preview__lane" y="-22" textAnchor="middle">
                  {LANE_NAMES[lane].replace('线', '')}
                </text>
                {activeKinds.length === 0 ? (
                  <text className="threat-preview__empty" y="-3" textAnchor="middle">静</text>
                ) : (
                  activeKinds.map((kind, index) => {
                    const totalWidth = activeKinds.length * 20;
                    const x = index * 20 - totalWidth / 2 + 10;
                    return (
                      <g key={kind} transform={`translate(${x} -4)`}>
                        {kind === 'swarm' ? <path className={`preview-glyph preview-glyph--${kind}`} d="M 0 -7 L 7 6 L -7 6 Z" /> : null}
                        {kind === 'speed' ? <path className={`preview-glyph preview-glyph--${kind}`} d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" /> : null}
                        {kind === 'armor' ? <rect className={`preview-glyph preview-glyph--${kind}`} x="-6" y="-6" width="12" height="12" rx="2" /> : null}
                        <text className="preview-glyph__label" textAnchor="middle" dominantBaseline="central">
                          {ENEMY_GLYPHS[kind]}
                        </text>
                        <text className="preview-glyph__count" x="8" y="-4">{preview.counts[kind]}</text>
                      </g>
                    );
                  })
                )}
                <text className="threat-preview__arrival-label" y="16" textAnchor="middle">
                  抵达
                </text>
                <text className="threat-preview__time" y="31" textAnchor="middle">
                  {visibleArrivalValue(signal?.nextArrivalMs ?? null)}
                </text>
              </g>
            );
          })}
        </g>

        <g className="battlefield__enemies">
          {state.enemies.map((enemy, index) => {
            const point = enemyPoint(
              enemy,
              index,
              state.enemies,
              Math.max(1, view.laneLength),
            );
            return (
              <EnemyToken
                key={enemy.id}
                id={enemy.id}
                kind={enemy.kind}
                x={point.x}
                y={point.y}
                hp={enemy.hp}
                maxHp={enemy.maxHp}
                hit={feedback?.kind === 'hit' && feedback.enemyId === enemy.id}
                defeated={feedback?.kind === 'defeat' && feedback.enemyId === enemy.id}
              />
            );
          })}
          {defeatedEnemy && !state.enemies.some((enemy) => enemy.id === defeatedEnemy.id) ? (() => {
            const index = previousEnemies.current.findIndex((enemy) => enemy.id === defeatedEnemy.id);
            const point = enemyPoint(
              defeatedEnemy,
              index,
              previousEnemies.current,
              Math.max(1, view.laneLength),
            );
            return (
              <EnemyToken
                key={`defeated-${defeatedEnemy.id}-${feedback?.sequence ?? 0}`}
                id={defeatedEnemy.id}
                kind={defeatedEnemy.kind}
                x={point.x}
                y={point.y}
                hp={0}
                maxHp={defeatedEnemy.maxHp}
                defeated
              />
            );
          })() : null}
        </g>

        {attackGuardPoint && attackTargetPoint && (feedback?.kind === 'hit' || feedback?.kind === 'defeat') ? (
          <line
            key={`attack-${feedback.sequence}`}
            className={`attack-beam attack-beam--${feedback.guardId ?? 'rapid'}`}
            x1={attackGuardPoint.x}
            y1={attackGuardPoint.y}
            x2={attackTargetPoint.x}
            y2={attackTargetPoint.y}
            aria-hidden="true"
          />
        ) : null}

        <g className="battlefield__guard-slots" aria-label="固定守位">
          {LANE_IDS.map((lane) => {
            const point = polarPoint(lane, GUARD_RADIUS);
            return (
              <circle
                key={lane}
                className={`guard-slot${guardByLane.has(lane) ? ' is-occupied' : ''}`}
                cx={point.x}
                cy={point.y}
                r="25"
              />
            );
          })}
        </g>

        <g className="battlefield__guards">
          {Object.values(state.guards).map((guard) => {
            const point = polarPoint(guard.lane, GUARD_RADIUS);
            return (
              <GuardToken
                key={guard.id}
                kind={guard.kind}
                x={point.x}
                y={point.y}
                selected={state.selectedGuard === guard.kind}
                selectable={commandWindow && !state.paused}
                moving={feedback?.kind === 'guardMove' && feedback.guardId === guard.kind}
                attacking={
                  (feedback?.kind === 'hit' || feedback?.kind === 'defeat') &&
                  feedback.guardId === guard.kind
                }
                onSelect={selectGuard}
              />
            );
          })}
        </g>

        <g className="battlefield__destinations">
          {LANE_IDS.filter((lane) => legalDestinations.has(lane)).map((lane) => {
            const point = polarPoint(lane, GUARD_RADIUS);
            const activate = () => moveGuard(lane);
            return (
              <g
                key={lane}
                className="destination-target"
                data-testid={`destination-${lane}`}
                role="button"
                tabIndex={0}
                aria-label={`调防到${LANE_NAMES[lane]}`}
                transform={`translate(${point.x} ${point.y})`}
                onClick={activate}
                onKeyDown={(event) => handleKeyboardActivate(event, activate)}
              >
                <circle className="destination-target__hit-area" r="30" />
                <circle className="destination-target__ring" r="25" />
                <path className="destination-target__plus" d="M -7 0 H 7 M 0 -7 V 7" />
              </g>
            );
          })}
        </g>

        <g
          className={`core${state.coreIntegrity <= Math.max(3, state.maxCoreIntegrity / 3) ? ' is-danger' : ''}${feedback?.kind === 'coreImpact' ? ' is-impact' : ''}`}
          role="group"
          aria-label={`中央核心完整度 ${state.coreIntegrity}/${state.maxCoreIntegrity}`}
          data-testid="central-core"
          transform={`translate(${CENTER.x} ${CENTER.y})`}
        >
          <g className="core__motion">
            <circle className="core__danger-halo" r="55" />
            <circle className="core__shell" r="48" />
            <circle
              className="core__meter"
              r="43"
              pathLength="100"
              strokeDasharray={`${(state.coreIntegrity / state.maxCoreIntegrity) * 100} 100`}
              transform="rotate(-90)"
            />
            <text className="core__label" y="-18" textAnchor="middle">核心</text>
            <text className="core__value" y="10" textAnchor="middle">
              {state.coreIntegrity}
              <tspan className="core__max">/{state.maxCoreIntegrity}</tspan>
            </text>
            <text className="core__caption" y="32" textAnchor="middle">完整度</text>
          </g>
        </g>

        {state.paused ? (
          <g className="pause-overlay" role="status" aria-label="游戏已暂停">
            <rect x="135" y="272" width="120" height="56" rx="16" />
            <text x="195" y="306" textAnchor="middle">已暂停</text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
