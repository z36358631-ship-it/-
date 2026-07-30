import assert from 'node:assert/strict';
import fsSync from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '微信H5精品游戏', '倒着开大-demo.html');
const outputDir = path.join(root, 'test-results', 'backwards-ultimate-h5');
const fixedSeed = 240731;

function browserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executable = candidates.find(candidate => fsSync.existsSync(candidate));
  assert(executable, `Local Chrome or Edge not found: ${candidates.join(', ')}`);
  return executable;
}

function monitor(page, evidence) {
  page.on('console', message => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => evidence.pageErrors.push(error.message));
  page.on('request', request => {
    if (/^https?:/i.test(request.url())) evidence.externalRequests.push(request.url());
  });
}

async function makePage(browser, viewport, evidence) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: false,
    reducedMotion: 'no-preference'
  });
  const page = await context.newPage();
  monitor(page, evidence);
  await page.goto(pathToFileURL(demoPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000
  });
  await page.waitForFunction(() => Boolean(window.__BACKWARDS_ULTIMATE__), null, {
    timeout: 10_000
  });
  return { context, page };
}

async function snapshot(page) {
  return page.evaluate(() => window.__BACKWARDS_ULTIMATE__.snapshot());
}

async function setScale(page, scale) {
  await page.evaluate(value => window.__BACKWARDS_ULTIMATE__.setTimeScale(value), scale);
}

async function restart(page) {
  await page.evaluate(seed => window.__BACKWARDS_ULTIMATE__.restartWithSeed(seed), fixedSeed);
  await page.waitForFunction(
    () => window.__BACKWARDS_ULTIMATE__.snapshot().phase === 'planning',
    null,
    { timeout: 10_000 }
  );
}

async function swapTutorial(page, current) {
  if (current.phase !== 'planning' || Number(current.round) !== 1 || Number(current.swapsUsed || 0) !== 0) return;
  await page.locator('[data-slot-id="1"]').click();
  await page.locator('[data-slot-id="2"]').click();
  await page.waitForFunction(
    () => Number(window.__BACKWARDS_ULTIMATE__.snapshot().swapsUsed) === 1,
    null,
    { timeout: 3_000 }
  );
}

async function chooseDraft(page) {
  await page.locator('[data-draft-choice]:visible:not([disabled])').first().click();
  await page.locator('[data-slot-id="5"]:visible').click();
}

async function finishRun(page) {
  const deadline = Date.now() + 60_000;
  for (let step = 0; step < 200 && Date.now() < deadline; step += 1) {
    const current = await snapshot(page);
    if (current.phase === 'finished') return current;
    if (current.phase === 'planning') {
      await swapTutorial(page, current);
      await page.locator('[data-action="lock"]:visible:not([disabled])').click();
    } else if (current.phase === 'draft') {
      await chooseDraft(page);
    }
    await page.waitForTimeout(25);
  }
  const current = await snapshot(page);
  throw new Error(`Capture run did not finish: phase=${current.phase}, round=${current.round}`);
}

function eventType(entry) {
  if (typeof entry === 'string') {
    const match = entry.match(/\b(round_end|game_end|enemy)\b/i);
    return match ? match[1].toLowerCase() : '';
  }
  return entry?.type ?? entry?.event ?? entry?.kind ?? entry?.name ?? '';
}

function assertLegalTerminal(current) {
  assert.equal(current.phase, 'finished', 'Result capture must end in finished phase');
  const round = Number(current.round);
  assert(Number.isInteger(round) && round >= 1 && round <= 8,
    `Result capture terminal round must be within 1..8, got ${current.round}`);
  assert.equal(Number(current.turnsSettled), round,
    `turnsSettled must equal terminal round: ${current.turnsSettled}/${round}`);
  const log = current.log;
  assert(Array.isArray(log), 'Result capture must expose its battle log');
  const roundEnds = log.filter(entry => eventType(entry) === 'round_end');
  assert.equal(roundEnds.length, round,
    `round_end count must equal terminal round: ${roundEnds.length}/${round}`);
  const playerHealth = Number(current.player?.health);
  const aiHealth = Number(current.ai?.health);
  assert(playerHealth === 0 || aiHealth === 0 || round === 8,
    `Illegal terminal state: player=${playerHealth}, ai=${aiHealth}, round=${round}`);

  const finalRoundEnd = log.findLastIndex(entry =>
    eventType(entry) === 'round_end'
    && (typeof entry === 'string' || Number(entry.round) === round));
  const gameEnd = log.findIndex((entry, index) => index > finalRoundEnd && eventType(entry) === 'game_end');
  assert(finalRoundEnd >= 0 && gameEnd > finalRoundEnd,
    'Terminal log must contain round_end followed by game_end');
  assert(
    !log.slice(finalRoundEnd + 1, gameEnd).some(entry => eventType(entry) === 'enemy'),
    'Enemy action occurred between terminal round_end and game_end'
  );
  if (aiHealth === 0) {
    assert(
      !log.some(entry => eventType(entry) === 'enemy' && Number(entry.round) === round),
      'AI acted in the round after it was killed'
    );
  }
}

async function criticalMetrics(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-critical-control]')]
    .map(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        label: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 30),
        visible: style.display !== 'none' && style.visibility !== 'hidden'
          && rect.width > 0 && rect.height > 0,
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10
      };
    }));
}

async function shot(page, name) {
  const target = path.join(outputDir, name);
  await page.screenshot({ path: target, fullPage: false });
  const stat = await fs.stat(target);
  assert(stat.size > 1_000, `Screenshot is unexpectedly empty: ${name}`);
  return { name, bytes: stat.size };
}

assert(fsSync.existsSync(demoPath), `Demo file missing: ${demoPath}`);
await fs.mkdir(outputDir, { recursive: true });

const evidence = {
  generatedAt: new Date().toISOString(),
  source: path.relative(root, demoPath).replaceAll('\\', '/'),
  seed: fixedSeed,
  browser: path.basename(browserExecutable()),
  externalRequests: [],
  consoleErrors: [],
  pageErrors: [],
  screenshots: [],
  layouts: {},
  finalSnapshot: null
};

const browser = await chromium.launch({
  executablePath: browserExecutable(),
  headless: true,
  args: ['--allow-file-access-from-files', '--disable-background-networking']
});

try {
  {
    const { context, page } = await makePage(browser, { width: 874, height: 402 }, evidence);
    try {
      await restart(page);
      evidence.layouts.desktop = await criticalMetrics(page);
      evidence.screenshots.push(await shot(page, 'desktop-planning.png'));

      await setScale(page, 0.65);
      await swapTutorial(page, await snapshot(page));
      await page.locator('[data-action="lock"]').click();
      await page.waitForFunction(
        () => window.__BACKWARDS_ULTIMATE__.snapshot().currentSlot === 2,
        null,
        { timeout: 10_000 }
      );
      await page.waitForTimeout(80);
      evidence.screenshots.push(await shot(page, 'desktop-cannon-impact.png'));
    } finally {
      await context.close();
    }
  }

  {
    const { context, page } = await makePage(browser, { width: 667, height: 375 }, evidence);
    try {
      await restart(page);
      evidence.layouts.mobileLandscape = await criticalMetrics(page);
      evidence.screenshots.push(await shot(page, 'mobile-landscape.png'));
    } finally {
      await context.close();
    }
  }

  {
    const { context, page } = await makePage(browser, { width: 390, height: 844 }, evidence);
    try {
      const rotateVisible = await page.locator('[data-rotate-hint]').isVisible();
      assert(rotateVisible, 'Portrait rotate hint is not visible');
      evidence.layouts.portrait = await criticalMetrics(page);
      evidence.screenshots.push(await shot(page, 'portrait-rotate-hint.png'));
    } finally {
      await context.close();
    }
  }

  {
    const { context, page } = await makePage(browser, { width: 874, height: 402 }, evidence);
    try {
      await restart(page);
      await setScale(page, 30);
      evidence.finalSnapshot = await finishRun(page);
      assertLegalTerminal(evidence.finalSnapshot);
      evidence.resultText = await page.locator('[data-result]:visible').innerText();
      assert(evidence.resultText.includes('AI剩余总防护'), 'Result capture is missing AI remaining total protection');
      assert(evidence.resultText.includes('本局关键连招'), 'Result capture is missing the key combo recap');
      const renderedAiProtection = Number(await page.locator('[data-result-ai-health]').innerText());
      assert.equal(
        renderedAiProtection,
        Number(evidence.finalSnapshot.ai.health) + Number(evidence.finalSnapshot.ai.shield),
        'Captured AI remaining protection does not match final snapshot'
      );
      const terminalPhrase = evidence.finalSnapshot.ai.health <= 0
        ? `第${evidence.finalSnapshot.round}轮击破`
        : `第${evidence.finalSnapshot.round}轮我方核心被击破`;
      assert(evidence.resultText.includes(terminalPhrase),
        `Captured result is missing terminal-round copy "${terminalPhrase}"`);
      evidence.screenshots.push(await shot(page, 'result.png'));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

assert.equal(evidence.screenshots.length, 5, 'Exactly five screenshots are required');
assert.deepEqual(evidence.externalRequests, [], 'External requests occurred during capture');
assert.deepEqual(evidence.consoleErrors, [], 'Console errors occurred during capture');
assert.deepEqual(evidence.pageErrors, [], 'Unhandled page errors occurred during capture');

await fs.writeFile(
  path.join(outputDir, 'verification.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8'
);
process.stdout.write(`PASS captured ${evidence.screenshots.length} screenshots\n`);
process.stdout.write(`PASS verification ${path.join(outputDir, 'verification.json')}\n`);
