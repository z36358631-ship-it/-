import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameScreen, type GameScreenProps } from '../../src/ui/GameScreen';
import type { GameScreenState, SelectorView } from '../../src/ui/types';

afterEach(cleanup);

const state: GameScreenState = {
  seed: 17,
  wave: 4,
  phase: 'prep',
  phaseElapsedMs: 1_000,
  coreIntegrity: 9,
  maxCoreIntegrity: 12,
  guards: {
    heavy: { id: 'heavy', kind: 'heavy', lane: 0 },
    rapid: { id: 'rapid', kind: 'rapid', lane: 1 },
    sweep: { id: 'sweep', kind: 'sweep', lane: 2 },
  },
  enemies: [
    { id: 'enemy-1', kind: 'swarm', lane: 0, hp: 1, maxHp: 1, distance: 3 },
  ],
  previews: [
    { lane: 0, counts: { swarm: 3, speed: 0, armor: 0 }, nextSpawnInMs: 1_000 },
    { lane: 1, counts: { swarm: 0, speed: 2, armor: 0 }, nextSpawnInMs: 4_000 },
    { lane: 2, counts: { swarm: 0, speed: 0, armor: 1 }, nextSpawnInMs: 5_000 },
    { lane: 3, counts: { swarm: 0, speed: 0, armor: 0 }, nextSpawnInMs: null },
    { lane: 4, counts: { swarm: 0, speed: 0, armor: 0 }, nextSpawnInMs: null },
    { lane: 5, counts: { swarm: 0, speed: 0, armor: 0 }, nextSpawnInMs: null },
  ],
  selectedGuard: 'heavy',
  paused: false,
};

const view: SelectorView = {
  phaseLabel: '预备调防',
  phaseTimeRemainingMs: 5_000,
  laneLength: 6,
  legalDestinationLanes: [3, 4, 5],
  lanes: [
    { lane: 0, threatLevel: 'danger', threatLabel: '高危', nextArrivalMs: 3_000 },
    { lane: 1, threatLevel: 'watch', threatLabel: '注意', nextArrivalMs: 4_000 },
    { lane: 2, threatLevel: 'watch', threatLabel: '注意', nextArrivalMs: 5_000 },
    { lane: 3, threatLevel: 'calm', threatLabel: '平静', nextArrivalMs: null },
    { lane: 4, threatLevel: 'calm', threatLabel: '平静', nextArrivalMs: null },
    { lane: 5, threatLevel: 'calm', threatLabel: '平静', nextArrivalMs: null },
  ],
};

function createProps(overrides: Partial<GameScreenProps> = {}): GameScreenProps {
  return {
    state,
    view,
    onSelectGuard: vi.fn(),
    onMoveGuard: vi.fn(),
    onTogglePause: vi.fn(),
    onRestart: vi.fn(),
    ...overrides,
  };
}

describe('GameScreen', () => {
  it('shows the complete single-screen battle hierarchy', () => {
    render(<GameScreen {...createProps()} />);

    expect(screen.getByLabelText('中央核心完整度 9/12')).toBeVisible();
    expect(screen.getByLabelText('第 4 波，共 12 波')).toBeVisible();
    expect(screen.getByText('预备调防')).toBeVisible();
    expect(screen.getByLabelText('当前阶段剩余 5.0s')).toBeVisible();
    expect(screen.getByRole('button', { name: '暂停游戏' })).toBeVisible();
    expect(screen.getByRole('button', { name: '关闭声音' })).toBeVisible();

    for (let lane = 0; lane < 6; lane += 1) {
      expect(screen.getByTestId(`lane-${lane}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId('guard-heavy')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('guard-heavy')).toHaveAccessibleName(/擅长甲敌/);
    expect(screen.getByTestId('guard-rapid')).toBeInTheDocument();
    expect(screen.getByTestId('guard-sweep')).toBeInTheDocument();
    expect(screen.getByLabelText('群敌，生命 1/1')).toBeInTheDocument();
    expect(screen.getByLabelText(/北线预告：高危，群敌 3，预计3.0秒抵达/)).toBeInTheDocument();
    expect(screen.getAllByText('抵达')).toHaveLength(6);
    expect(screen.getByText('3.0s')).toBeVisible();
    expect(screen.getByText('点亮空位完成调防')).toBeVisible();
    expect(screen.queryByLabelText(/预计1.0秒抵达/)).not.toBeInTheDocument();

    expect(screen.getByTestId('destination-3')).toHaveAccessibleName('调防到南线');
    expect(screen.getByTestId('destination-4')).toHaveAccessibleName('调防到西南线');
    expect(screen.getByTestId('destination-5')).toHaveAccessibleName('调防到西北线');
    expect(screen.queryByTestId('destination-0')).not.toBeInTheDocument();

    const battlefield = screen.getByRole('region', { name: /六向环阵战场/ });
    expect(battlefield).toHaveAttribute('viewBox', '0 0 390 640');
  });

  it('supports pointer and keyboard commands with accessible labels', async () => {
    const user = userEvent.setup();
    const onSelectGuard = vi.fn();
    const onMoveGuard = vi.fn();
    const onTogglePause = vi.fn();
    render(
      <GameScreen
        {...createProps({ onSelectGuard, onMoveGuard, onTogglePause })}
      />,
    );

    fireEvent.keyDown(screen.getByTestId('guard-rapid'), { key: 'Enter' });
    expect(onSelectGuard).toHaveBeenCalledWith('rapid');

    fireEvent.keyDown(screen.getByTestId('destination-3'), { key: ' ' });
    expect(onMoveGuard).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: '暂停游戏' }));
    expect(onTogglePause).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '关闭声音' }));
    expect(screen.getByRole('button', { name: '开启声音' })).toHaveTextContent('静音');
  });

  it('uses an untruncated short sentence during automatic combat', () => {
    render(
      <GameScreen
        {...createProps({
          state: { ...state, phase: 'demo', selectedGuard: null },
          view: {
            ...view,
            phaseLabel: '演示波',
            legalDestinationLanes: [],
          },
        })}
      />,
    );

    expect(screen.getByText('观察来敌，等待调防')).toBeVisible();
    expect(screen.queryByText(/自动交战中/)).not.toBeInTheDocument();
  });

  it('shows one actionable result cause and allows restart', async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    const lostState: GameScreenState = {
      ...state,
      phase: 'lost',
      coreIntegrity: 0,
    };
    const lostView: SelectorView = {
      ...view,
      phaseLabel: '战局结束',
      legalDestinationLanes: [],
      result: {
        status: 'lost',
        cause: '防线空缺',
        actionHint: '不要把守卫从即将抵达的北线调走。',
        replaySummary: '北线空缺后，群敌进入核心。',
      },
    };

    render(
      <GameScreen
        {...createProps({ state: lostState, view: lostView, onRestart })}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: '核心失守' });
    const gameContent = screen.getByTestId('game-content');
    expect(gameContent).toHaveAttribute('inert');
    expect(gameContent).toHaveAttribute('aria-hidden', 'true');
    expect(within(dialog).getByText('防线空缺')).toBeVisible();
    expect(within(dialog).getByText(/不要把守卫/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: '再守一次' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
