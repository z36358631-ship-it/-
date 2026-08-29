import { expect, test, type Page, type TestInfo } from '@playwright/test';
import path from 'node:path';

type GuardKind = 'heavy' | 'rapid' | 'sweep';
type CommandPhase = 'prep' | 'rescue';

interface ReplayDecision {
  wave: number;
  phase: CommandPhase;
  guardId: GuardKind;
  lane: number;
}

// Seed 17 passing sequence produced and deterministically replayed by the domain search.
// Lane ids are zero-based, matching the domain and data-testid contract.
const SEED_17_PASSING_SEQUENCE: readonly ReplayDecision[] = [
  { wave: 2, phase: 'prep', guardId: 'heavy', lane: 3 },
  { wave: 2, phase: 'rescue', guardId: 'sweep', lane: 5 },
  { wave: 3, phase: 'prep', guardId: 'heavy', lane: 4 },
  { wave: 3, phase: 'rescue', guardId: 'heavy', lane: 0 },
  { wave: 4, phase: 'prep', guardId: 'rapid', lane: 3 },
  { wave: 4, phase: 'rescue', guardId: 'sweep', lane: 1 },
  { wave: 5, phase: 'prep', guardId: 'sweep', lane: 4 },
  { wave: 5, phase: 'rescue', guardId: 'heavy', lane: 1 },
  { wave: 6, phase: 'prep', guardId: 'sweep', lane: 5 },
  { wave: 6, phase: 'rescue', guardId: 'heavy', lane: 0 },
  { wave: 7, phase: 'prep', guardId: 'rapid', lane: 4 },
  { wave: 7, phase: 'rescue', guardId: 'heavy', lane: 1 },
  { wave: 8, phase: 'prep', guardId: 'rapid', lane: 3 },
  { wave: 8, phase: 'rescue', guardId: 'rapid', lane: 2 },
  { wave: 9, phase: 'prep', guardId: 'heavy', lane: 4 },
  { wave: 9, phase: 'rescue', guardId: 'rapid', lane: 0 },
  { wave: 10, phase: 'prep', guardId: 'heavy', lane: 3 },
  { wave: 10, phase: 'rescue', guardId: 'rapid', lane: 1 },
  { wave: 11, phase: 'prep', guardId: 'heavy', lane: 4 },
  { wave: 11, phase: 'rescue', guardId: 'rapid', lane: 2 },
  { wave: 12, phase: 'prep', guardId: 'rapid', lane: 1 },
  { wave: 12, phase: 'rescue', guardId: 'heavy', lane: 3 },
];

const PHASE_ADVANCE_MS: Record<CommandPhase, number> = {
  prep: 6_000 + 18_000,
  rescue: 4_000 + 18_000,
};

function screenshotPath(testInfo: TestInfo, name: string): string {
  return path.resolve(
    process.cwd(),
    'docs',
    'evidence',
    'v0.1',
    'screenshots',
    `${testInfo.project.name}-${name}.png`,
  );
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: screenshotPath(testInfo, name),
    animations: 'disabled',
    fullPage: false,
  });
}

async function expectPhase(page: Page, phase: string) {
  await expect(page.locator('.game-screen')).toHaveAttribute('data-phase', phase);
}

async function performDecision(page: Page, decision: ReplayDecision) {
  await expectPhase(page, decision.phase);
  await expect(page.getByRole('button', {
    name: new RegExp(decision.guardId === 'heavy' ? '^重击守卫' : decision.guardId === 'rapid' ? '^连击守卫' : '^横扫守卫'),
  })).toBeEnabled();
  await page.getByTestId(`guard-${decision.guardId}`).click();
  const destination = page.getByTestId(`destination-${decision.lane}`);
  await expect(destination).toBeVisible();
  const targetBox = await destination.boundingBox();
  expect(targetBox, '调防目标必须有可见热区').not.toBeNull();
  expect(targetBox?.width ?? 0, '调防目标宽度至少44px').toBeGreaterThanOrEqual(44);
  expect(targetBox?.height ?? 0, '调防目标高度至少44px').toBeGreaterThanOrEqual(44);
  await destination.click();
  await expect(page.locator('.destination-target')).toHaveCount(0);
}

test('@victory 三档移动视口可完成演示、两类调防、暂停、结算与重开', async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.clock.install({ time: new Date('2026-08-29T06:00:00Z') });
  await page.addInitScript(() => {
    // Test-only scheduler: one rendered frame represents four verified 250 ms domain steps.
    // Formal phase durations and production code remain unchanged.
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 1_000);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-08-29T06:00:01Z'));
  await expect(page.locator('.game-screen')).toBeVisible();
  await expectPhase(page, 'demo');

  const viewportAudit = await page.evaluate(() => {
    const screen = document.querySelector('.game-screen');
    const rect = screen?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      screenTop: rect?.top ?? null,
      screenBottom: rect?.bottom ?? null,
    };
  });
  expect(viewportAudit.documentWidth).toBeLessThanOrEqual(viewportAudit.innerWidth);
  expect(viewportAudit.bodyWidth).toBeLessThanOrEqual(viewportAudit.innerWidth);
  expect(viewportAudit.documentHeight).toBeLessThanOrEqual(viewportAudit.innerHeight);
  expect(viewportAudit.bodyHeight).toBeLessThanOrEqual(viewportAudit.innerHeight);
  expect(viewportAudit.screenTop).toBeGreaterThanOrEqual(0);
  expect(viewportAudit.screenBottom).toBeLessThanOrEqual(viewportAudit.innerHeight);

  await expect(page.getByTestId('central-core')).toBeVisible();
  await expect(page.locator('[data-testid^="lane-"]:not([data-testid^="lane-preview-"])')).toHaveCount(6);
  await expect(page.locator('[data-testid^="lane-preview-"]')).toHaveCount(6);
  await expect(page.locator('[data-testid^="guard-"]')).toHaveCount(3);
  await expect(page.getByText('演示波', { exact: true })).toBeVisible();
  await capture(page, testInfo, '00-demo');

  await page.clock.runFor(1_000);
  await expect(page.locator('[data-testid^="enemy-"]').first()).toBeVisible();
  await capture(page, testInfo, '00b-demo-enemy');
  await page.clock.runFor(17_000);
  await expectPhase(page, 'prep');

  const firstPrep = SEED_17_PASSING_SEQUENCE[0];
  await performDecision(page, firstPrep);
  await capture(page, testInfo, '01-prep-move');

  const pauseButton = page.getByRole('button', { name: '暂停游戏' });
  await pauseButton.click();
  await expect(page.getByRole('status', { name: '游戏已暂停' })).toBeVisible();
  const frozenTimer = await page.locator('.phase-controls__timer').innerText();
  await page.clock.runFor(2_000);
  await expect(page.locator('.phase-controls__timer')).toHaveText(frozenTimer);
  await capture(page, testInfo, '02-paused');
  await page.getByRole('button', { name: '继续游戏' }).click();
  await expect(page.getByRole('status', { name: '游戏已暂停' })).toHaveCount(0);

  await page.clock.runFor(PHASE_ADVANCE_MS.prep);
  const firstRescue = SEED_17_PASSING_SEQUENCE[1];
  await performDecision(page, firstRescue);
  await capture(page, testInfo, '03-rescue-move');

  for (const decision of SEED_17_PASSING_SEQUENCE.slice(2)) {
    const previousPhase = decision.phase === 'prep' ? 'rescue' : 'prep';
    await page.clock.runFor(PHASE_ADVANCE_MS[previousPhase]);
    await performDecision(page, decision);
  }

  await page.clock.runFor(PHASE_ADVANCE_MS.rescue);
  await expectPhase(page, 'won');
  const resultDialog = page.getByRole('dialog');
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog.getByRole('heading', { name: '防线守住' })).toBeVisible();
  await expect(resultDialog.getByText(/12波防守/)).toBeVisible();
  await expect(resultDialog.getByText(/关键回放：/)).toBeVisible();
  await expect(page.getByRole('button', { name: '暂停游戏' })).toHaveCount(0);
  await expect(page.getByTestId('game-content')).toHaveAttribute('aria-hidden', 'true');
  await capture(page, testInfo, '04-result');

  await resultDialog.getByRole('button', { name: '再守一次' }).click();
  await expectPhase(page, 'demo');
  await expect(page.getByLabel('第 1 波，共 12 波')).toBeVisible();
  await expect(page.getByTestId('central-core')).toBeVisible();
  await capture(page, testInfo, '05-restarted');

  expect(runtimeErrors, '浏览器控制台与页面运行时错误').toEqual([]);
});

test('@failure 390视口不调防可失败、显示单一原因并重开', async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.clock.install({ time: new Date('2026-08-29T06:00:00Z') });
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 1_000);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-08-29T06:00:01Z'));
  await expectPhase(page, 'demo');

  let terminalPhase = await page.locator('.game-screen').getAttribute('data-phase');
  for (let chunk = 0; chunk < 80 && terminalPhase !== 'lost' && terminalPhase !== 'won'; chunk += 1) {
    await page.clock.runFor(10_000);
    terminalPhase = await page.locator('.game-screen').getAttribute('data-phase');
  }

  expect(terminalPhase, 'seed 17原地不动应在上限内进入失败终局').toBe('lost');
  await expectPhase(page, 'lost');
  const resultDialog = page.getByRole('dialog');
  await expect(resultDialog).toBeVisible();
  await expect(resultDialog.getByRole('heading', { name: '核心失守' })).toBeVisible();
  await expect(page.getByRole('button', { name: '暂停游戏' })).toHaveCount(0);
  await expect(page.getByTestId('game-content')).toHaveAttribute('aria-hidden', 'true');
  const cause = resultDialog.locator('.result-panel__cause strong');
  await expect(cause).toHaveCount(1);
  await expect(cause).not.toHaveText('');
  await expect(resultDialog.locator('.result-panel__cause p')).toHaveCount(1);
  await capture(page, testInfo, '06-loss-result');

  await resultDialog.getByRole('button', { name: '再守一次' }).click();
  await expectPhase(page, 'demo');
  await expect(page.getByLabel('第 1 波，共 12 波')).toBeVisible();
  await expect(page.getByTestId('central-core')).toBeVisible();
  await capture(page, testInfo, '07-loss-restarted');

  expect(runtimeErrors, '失败路径浏览器控制台与页面运行时错误').toEqual([]);
});
