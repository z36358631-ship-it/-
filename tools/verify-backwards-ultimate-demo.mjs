import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoPath = path.join(root, 'demos', '微信H5精品游戏', '倒着开大-demo.html');
const mode = process.argv[2] || 'all';
const validModes = new Set(['static', 'engine', 'browser', 'all']);
const fixedSeed = 240731;

function pass(message) {
  process.stdout.write(`PASS ${message}\n`);
}

function readDemo() {
  assert(fs.existsSync(demoPath), `Demo file missing: ${demoPath}`);
  return fs.readFileSync(demoPath, 'utf8');
}

function verifyStatic() {
  const html = readDemo();
  const requiredTokens = [
    '倒着开大',
    'data-game-root',
    'data-slot-id="0"',
    'data-slot-id="5"',
    'data-action="lock"',
    'data-action="restart-same-seed"',
    'window.__BACKWARDS_ULTIMATE__',
    'function resolveModules',
    'function mulberry32',
    'data:image/webp;base64,'
  ];

  for (const token of requiredTokens) {
    assert(html.includes(token), `Missing required token: ${token}`);
  }

  const textOnlyHtml = html.replace(/data:[^"'\\\s)]+/gi, 'data:embedded');
  const unfinishedMarkers = ['TO' + 'DO', 'FIX' + 'ME', 'Lorem ipsum'];
  for (const marker of unfinishedMarkers) {
    assert(!textOnlyHtml.includes(marker), `Unfinished-work marker found: ${marker}`);
  }
  for (const [label, pattern] of [
    ['external http URL', /http:\/\//i],
    ['external https URL', /https:\/\//i],
    ['iframe', /<iframe\b/i],
    ['CDN reference', /\bcdn\b/i]
  ]) {
    assert(!pattern.test(textOnlyHtml), `Forbidden ${label}`);
  }

  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]);
  assert(scripts.length > 0, 'No inline script found');
  scripts.forEach((code, index) => {
    new vm.Script(code, { filename: `倒着开大-inline-${index}.js` });
  });

  const webp = html.match(/data:image\/webp;base64,([A-Za-z0-9+/=\s]+)/i);
  assert(webp && webp[1].replace(/\s/g, '').length >= 100, 'Embedded WebP asset is missing or empty');
  pass('static bundle');
}

function browserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executable = candidates.find(candidate => fs.existsSync(candidate));
  assert(executable, `Local Chrome or Edge not found: ${candidates.join(', ')}`);
  return executable;
}

async function launchBrowser() {
  return chromium.launch({
    executablePath: browserExecutable(),
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-background-networking']
  });
}

function monitorPage(page) {
  const errors = [];
  const externalRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('request', request => {
    const url = request.url();
    if (/^https?:/i.test(url)) externalRequests.push(url);
  });
  return { errors, externalRequests };
}

async function openGame(browser, viewport = { width: 874, height: 402 }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: false,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const diagnostics = monitorPage(page);
  await page.goto(pathToFileURL(demoPath).href, {
    waitUntil: 'domcontentloaded',
    timeout: 15_000
  });
  await page.waitForFunction(() => Boolean(window.__BACKWARDS_ULTIMATE__), null, {
    timeout: 10_000
  });
  return { context, page, diagnostics };
}

async function publicSnapshot(page) {
  return page.evaluate(() => window.__BACKWARDS_ULTIMATE__.snapshot());
}

async function setTimeScale(page, scale) {
  await page.evaluate(async value => {
    await window.__BACKWARDS_ULTIMATE__.setTimeScale(value);
  }, scale);
}

async function restartWithSeed(page, seed) {
  await page.evaluate(async value => {
    await window.__BACKWARDS_ULTIMATE__.restartWithSeed(value);
  }, seed);
  await waitForPhase(page, ['planning']);
}

async function waitForPhase(page, phases, timeout = 12_000) {
  await page.waitForFunction(
    expected => expected.includes(window.__BACKWARDS_ULTIMATE__.snapshot().phase),
    phases,
    { timeout }
  );
  return publicSnapshot(page);
}

function findLog(snapshot) {
  for (const key of ['log', 'logs', 'battleLog', 'battleLogs', 'events']) {
    if (Array.isArray(snapshot?.[key])) return snapshot[key];
  }
  return null;
}

function roundEndCount(snapshot) {
  const log = findLog(snapshot);
  assert(log, 'snapshot() must expose a read-only battle log array');
  return log.filter(entry => {
    if (typeof entry === 'string') return /\bround_end\b/i.test(entry);
    return eventType(entry) === 'round_end';
  }).length;
}

function eventType(entry) {
  if (typeof entry === 'string') {
    const match = entry.match(/\b(round_end|game_end|enemy)\b/i);
    return match ? match[1].toLowerCase() : '';
  }
  return entry?.type ?? entry?.event ?? entry?.kind ?? entry?.name ?? '';
}

function assertLegalTerminal(snapshot, { fixedSeedKill = false } = {}) {
  assert.equal(snapshot.phase, 'finished', 'Terminal snapshot must use the finished phase');
  const round = Number(snapshot.round);
  assert(Number.isInteger(round) && round >= 1 && round <= 8, `Terminal round must be within 1..8, got ${snapshot.round}`);
  assert.equal(Number(snapshot.turnsSettled), round,
    `turnsSettled must equal terminal round: ${snapshot.turnsSettled}/${round}`);
  assert.equal(roundEndCount(snapshot), round,
    `round_end count must equal terminal round: ${roundEndCount(snapshot)}/${round}`);
  const playerHealth = Number(snapshot.player?.health);
  const aiHealth = Number(snapshot.ai?.health);
  assert(playerHealth === 0 || aiHealth === 0 || round === 8,
    `Illegal terminal state: player=${playerHealth}, ai=${aiHealth}, round=${round}`);

  const log = findLog(snapshot);
  const finalRoundEnd = log.findLastIndex(entry =>
    eventType(entry) === 'round_end'
    && (typeof entry === 'string' || Number(entry.round) === round));
  const gameEnd = log.findIndex((entry, index) => index > finalRoundEnd && eventType(entry) === 'game_end');
  assert(finalRoundEnd >= 0 && gameEnd > finalRoundEnd,
    'Terminal log must contain round_end followed by game_end');

  if (fixedSeedKill) {
    assert.equal(Number(snapshot.seed), fixedSeed, `Expected fixed seed ${fixedSeed}, got ${snapshot.seed}`);
    assert(aiHealth === 0 || playerHealth === 0, 'Fixed seed must finish by a kill');
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
}

function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^(?:now|time|timestamp|elapsed|countdown|remainingMs|timeScale|animation|selectedSlot|settings|preferences|records?|best|wins?|victories|tutorial(?:Complete|Done)?)$/i.test(key)) continue;
    result[key] = stripVolatile(item);
  }
  return result;
}

async function clickTutorialSwapIfNeeded(page, snapshot) {
  if (snapshot.phase !== 'planning' || Number(snapshot.swapsUsed || 0) !== 0 || Number(snapshot.round) !== 1) return;
  const first = page.locator('[data-slot-id="1"]');
  const second = page.locator('[data-slot-id="2"]');
  await first.click();
  await second.click();
  await page.waitForFunction(
    () => Number(window.__BACKWARDS_ULTIMATE__.snapshot().swapsUsed) === 1,
    null,
    { timeout: 3_000 }
  );
}

async function chooseDraft(page) {
  const choice = page.locator('[data-draft-choice]:visible:not([disabled])').first();
  await choice.waitFor({ state: 'visible', timeout: 4_000 });
  await choice.click();
  const replacement = page.locator('[data-slot-id]:visible:not([disabled])').last();
  await replacement.click();
}

async function verifyDraftPreviewAndEquippedGuard(page, draftSnapshot) {
  const selectedKey = draftSnapshot.draftChoices.find(key => draftSnapshot.order.includes(key));
  assert(selectedKey, 'Draft must contain at least one currently equipped module for the no-op guard test');
  const choiceIndex = draftSnapshot.draftChoices.indexOf(selectedKey);
  await page.locator(`[data-draft-choice="${choiceIndex}"]:visible:not([disabled])`).click();
  await page.waitForFunction(
    expected => window.__BACKWARDS_ULTIMATE__.snapshot().pendingDraft === expected,
    selectedKey,
    { timeout: 3_000 }
  );

  const selected = await publicSnapshot(page);
  const previews = await page.locator('[data-slot-id]:visible').evaluateAll(slots => slots.map(slot => ({
    id: Number(slot.dataset.slotId),
    disabled: slot.disabled,
    preview: slot.dataset.preview || slot.querySelector('[data-slot-preview]')?.textContent?.trim() || '',
    damage: slot.dataset.previewDamage,
    shield: slot.dataset.previewShield,
    energy: slot.dataset.previewEnergy
  })));
  assert.equal(previews.length, 6, `Expected six replacement previews, got ${previews.length}`);
  for (const preview of previews) {
    assert(preview.preview, `Slot ${preview.id + 1} has no replacement preview`);
    if (!preview.disabled) {
      assert(
        /伤|盾|能|damage|shield|energy/i.test(preview.preview)
        || [preview.damage, preview.shield, preview.energy].every(value => value !== undefined),
        `Slot ${preview.id + 1} preview lacks damage/shield/energy data: ${JSON.stringify(preview)}`
      );
    }
  }

  const equippedIndices = draftSnapshot.order
    .map((key, index) => key === selectedKey ? index : -1)
    .filter(index => index >= 0);
  assert(equippedIndices.length > 0, 'No equipped slot found for selected draft module');
  for (const index of equippedIndices) {
    const preview = previews.find(item => item.id === index);
    assert(preview?.disabled, `Equipped ${selectedKey} slot ${index + 1} is not disabled`);
  }

  const guardedIndex = equippedIndices[0];
  const guarded = page.locator(`[data-slot-id="${guardedIndex}"]:visible`);
  const box = await guarded.boundingBox();
  assert(box, 'Disabled equipped slot has no clickable bounds');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  const afterGuardedClick = await publicSnapshot(page);
  assert.equal(afterGuardedClick.phase, 'draft', 'Disabled equipped-slot click advanced the phase');
  assert.equal(afterGuardedClick.round, selected.round, 'Disabled equipped-slot click advanced the round');
  assert.equal(afterGuardedClick.pendingDraft, selectedKey, 'Disabled equipped-slot click cleared pendingDraft');

  await page.locator('[data-slot-id]:visible:not([disabled])').last().click();
  await waitForPhase(page, ['planning', 'finished']);
  pass('draft previews and equipped-slot guard');
}

async function reachFirstDraft(page, seed) {
  await restartWithSeed(page, seed);
  const planning = await publicSnapshot(page);
  await clickTutorialSwapIfNeeded(page, planning);
  await page.locator('[data-action="lock"]:visible:not([disabled])').click();
  return waitForPhase(page, ['draft']);
}

async function selectDraftModule(page, draftSnapshot, moduleKey) {
  const choiceIndex = draftSnapshot.draftChoices.indexOf(moduleKey);
  assert(choiceIndex >= 0, `Seed ${draftSnapshot.seed} first draft is missing ${moduleKey}`);
  await page.locator(`[data-draft-choice="${choiceIndex}"]:visible:not([disabled])`).click();
  await page.waitForFunction(
    expected => window.__BACKWARDS_ULTIMATE__.snapshot().pendingDraft === expected,
    moduleKey,
    { timeout: 3_000 }
  );
  return page.locator('[data-slot-id]:visible').evaluateAll(slots => slots.map(slot => ({
    id: Number(slot.dataset.slotId),
    disabled: slot.disabled,
    preview: slot.dataset.preview || slot.querySelector('[data-slot-preview]')?.textContent?.trim() || '',
    aria: slot.getAttribute('aria-label') || '',
    healing: slot.dataset.previewHealing,
    incoming: slot.dataset.previewIncoming
  })));
}

async function verifyUtilityDraftPreviews(page) {
  const repairDraft = await reachFirstDraft(page, 63001);
  const repairPreviews = await selectDraftModule(page, repairDraft, 'repair');
  const repairTargets = repairPreviews.filter(preview => !preview.disabled);
  assert(repairTargets.length > 0, 'Repair draft has no legal replacement targets');
  for (const preview of repairTargets) {
    assert(
      /修|治疗|heal/i.test(`${preview.preview} ${preview.aria}`)
      && preview.healing !== undefined
      && Number.isFinite(Number(preview.healing)),
      `Repair slot ${preview.id + 1} lacks healing-benefit preview: ${JSON.stringify(preview)}`
    );
  }

  const defenseDraft = await reachFirstDraft(page, 63001);
  const defenseKey = defenseDraft.draftChoices.includes('jammer') ? 'jammer' : 'shield';
  assert(defenseDraft.draftChoices.includes(defenseKey), 'Draft is missing jammer/shield for incoming-damage preview');
  const defensePreviews = await selectDraftModule(page, defenseDraft, defenseKey);
  const defenseTargets = defensePreviews.filter(preview => !preview.disabled);
  assert(defenseTargets.length > 0, `${defenseKey} draft has no legal replacement targets`);
  for (const preview of defenseTargets) {
    assert(
      /承伤|incoming/i.test(`${preview.preview} ${preview.aria}`)
      && preview.incoming !== undefined
      && Number.isFinite(Number(preview.incoming)),
      `${defenseKey} slot ${preview.id + 1} lacks incoming-damage preview: ${JSON.stringify(preview)}`
    );
  }
  pass('utility draft benefit previews');
}

async function driveToEightRoundScore(page, seed = 63001) {
  await restartWithSeed(page, seed);
  const deadline = Date.now() + 60_000;
  for (let step = 0; step < 200 && Date.now() < deadline; step += 1) {
    const current = await publicSnapshot(page);
    if (current.phase === 'finished') {
      assert.equal(Number(current.round), 8, `Score-terminal run ended before round 8: ${current.round}`);
      assert(Number(current.player?.health) > 0 && Number(current.ai?.health) > 0,
        `Score-terminal run requires both sides alive: ${JSON.stringify({ player: current.player, ai: current.ai })}`);
      assertLegalTerminal(current);
      return current;
    }
    if (current.phase === 'planning') {
      if (Number(current.round) === 1) {
        await clickTutorialSwapIfNeeded(page, current);
      } else {
        const cannon = current.order.indexOf('cannon');
        const shield = current.order.indexOf('shield');
        if (cannon >= 0 && shield > cannon && Number(current.swapsUsed || 0) === 0) {
          await page.locator(`[data-slot-id="${cannon}"]:visible`).click();
          await page.locator(`[data-slot-id="${shield}"]:visible`).click();
        }
      }
      await page.locator('[data-action="lock"]:visible:not([disabled])').click();
    } else if (current.phase === 'draft') {
      const preferred = ['shield', 'repair', 'jammer'];
      const lastModule = current.order[5];
      const selectedKey = preferred.find(key => current.draftChoices.includes(key) && key !== lastModule)
        || current.draftChoices.find(key => key !== lastModule);
      assert(selectedKey, 'No legal non-no-op draft choice for score-terminal policy');
      const choiceIndex = current.draftChoices.indexOf(selectedKey);
      await page.locator(`[data-draft-choice="${choiceIndex}"]:visible:not([disabled])`).click();
      const lastSlot = page.locator('[data-slot-id="5"]:visible:not([disabled])');
      if (await lastSlot.count()) await lastSlot.click();
      else await page.locator('[data-slot-id]:visible:not([disabled])').last().click();
    }
    await page.waitForTimeout(25);
  }
  throw new Error(`Score-terminal run for seed ${seed} did not finish`);
}

async function verifyDraftPreviewLayout(browser) {
  const viewport = { width: 667, height: 375 };
  const { context, page, diagnostics } = await openGame(browser, viewport);
  try {
    await setTimeScale(page, 30);
    const draft = await reachFirstDraft(page, 63001);
    await selectDraftModule(page, draft, 'shield');
    const layout = await page.evaluate(({ width, height }) => ({
      scrollWidth: document.documentElement.scrollWidth,
      slots: [...document.querySelectorAll('[data-slot-id]')].map(slot => {
        const rect = slot.getBoundingClientRect();
        return { id: slot.dataset.slotId, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      }),
      viewport: { width, height }
    }), viewport);
    assert(layout.scrollWidth <= viewport.width + 1,
      `Draft preview horizontal overflow at 667x375: ${layout.scrollWidth}`);
    for (const slot of layout.slots) {
      assert(slot.x >= -0.5 && slot.y >= -0.5
        && slot.right <= viewport.width + 0.5 && slot.bottom <= viewport.height + 0.5,
      `Draft preview slot overflows 667x375: ${JSON.stringify(slot)}`);
    }
    assert.deepEqual(diagnostics.externalRequests, [], 'Draft preview page made an external request');
    assert.deepEqual(diagnostics.errors, [], `Draft preview page errors: ${diagnostics.errors.join(' | ')}`);
    pass('draft preview layout 667x375');
  } finally {
    await context.close();
  }
}

async function driveToFinished(page, { tutorialSwap = true } = {}) {
  const deadline = Date.now() + 60_000;
  let steps = 0;
  while (Date.now() < deadline && steps < 200) {
    steps += 1;
    const snapshot = await publicSnapshot(page);
    if (snapshot.phase === 'finished') {
      assertLegalTerminal(snapshot);
      return snapshot;
    }
    if (snapshot.phase === 'planning') {
      if (tutorialSwap) await clickTutorialSwapIfNeeded(page, snapshot);
      await page.locator('[data-action="lock"]:visible:not([disabled])').click();
    } else if (snapshot.phase === 'draft') {
      await chooseDraft(page);
    }
    await page.waitForTimeout(25);
  }
  const last = await publicSnapshot(page);
  throw new Error(`Full run did not finish: phase=${last.phase}, round=${last.round}`);
}

async function verifyEngine() {
  readDemo();
  const browser = await launchBrowser();
  try {
    const { context, page, diagnostics } = await openGame(browser);
    try {
      const result = await page.evaluate(() => {
        const api = window.__BACKWARDS_ULTIMATE__;
        const order = ['battery', 'amp', 'cannon'];
        const state = { energy: 0 };
        const orderBefore = JSON.stringify(order);
        const stateBefore = JSON.stringify(state);
        const good = api.simulate(order, state);
        const bad = api.simulate(['battery', 'cannon', 'amp'], { energy: 0 });
        const earlyJammer = api.simulate(['battery', 'jammer', 'cannon'], { energy: 0 });
        const lateJammer = api.simulate(['cannon', 'jammer'], { energy: 0 });
        const repeated = api.simulate(order, state);
        return {
          frozen: Object.isFrozen(api),
          methods: ['snapshot', 'simulate', 'restartWithSeed', 'setTimeScale']
            .filter(name => typeof api[name] !== 'function'),
          good,
          bad,
          earlyJammer,
          lateJammer,
          deterministic: JSON.stringify(good) === JSON.stringify(repeated),
          inputsUnchanged: orderBefore === JSON.stringify(order) && stateBefore === JSON.stringify(state)
        };
      });
      assert(result.frozen, 'Public browser contract must be frozen');
      assert.deepEqual(result.methods, [], `Missing public API methods: ${result.methods.join(', ')}`);
      assert.equal(typeof result.good?.damage, 'number', 'simulate() must return numeric damage');
      assert.equal(typeof result.bad?.damage, 'number', 'simulate() must return numeric damage');
      assert(
        result.good.damage >= Math.floor(result.bad.damage * 1.3),
        `Order delta below 30%: good=${result.good.damage}, bad=${result.bad.damage}`
      );
      assert(result.deterministic, 'Identical engine input produced different output');
      assert(result.inputsUnchanged, 'simulate() mutated its input');
      const earlyJammerLog = result.earlyJammer?.log?.find(entry => entry.module === 'jammer');
      assert.equal(result.earlyJammer?.state?.jammed, true, 'Early powered jammer did not set jammed=true');
      assert(earlyJammerLog?.ok === true && Number(earlyJammerLog.spent) >= 1,
        `Early jammer did not consume energy: ${JSON.stringify(earlyJammerLog)}`);
      const lateJammerLog = result.lateJammer?.log?.find(entry => entry.module === 'jammer');
      assert.equal(result.lateJammer?.state?.jammed, false, 'Unpowered late jammer incorrectly set jammed=true');
      assert(lateJammerLog?.ok === false && /缺少能量|energy/i.test(String(lateJammerLog.reason || lateJammerLog.text)),
        `Unpowered late jammer has no failure log: ${JSON.stringify(lateJammerLog)}`);
      assert.deepEqual(diagnostics.externalRequests, [], 'Engine page made an external request');
      assert.deepEqual(diagnostics.errors, [], `Engine page errors: ${diagnostics.errors.join(' | ')}`);
      pass('deterministic engine');
      pass(`order changes outcome (${result.bad.damage} -> ${result.good.damage})`);
      pass('jammer order causality');
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function verifyLayout(browser, viewport, { terminal = false } = {}) {
  const { context, page, diagnostics } = await openGame(browser, viewport);
  try {
    if (terminal) {
      await setTimeScale(page, 30);
      await restartWithSeed(page, fixedSeed);
      await driveToFinished(page);
      await page.locator('[data-result]:visible').waitFor({ state: 'visible', timeout: 3_000 });
    }
    await page.waitForTimeout(100);
    const layout = await page.evaluate(({ width, height }) => {
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
          && rect.width > 0 && rect.height > 0;
      };
      const controls = [...document.querySelectorAll('[data-critical-control]')]
        .filter(visible)
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 24),
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom
          };
        });
      return {
        controls,
        viewport: { width, height },
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      };
    }, viewport);
    assert(layout.controls.length >= 7, `Expected at least seven visible critical controls at ${viewport.width}x${viewport.height}`);
    for (const control of layout.controls) {
      assert(control.width >= 43.5 && control.height >= 43.5,
        `Touch target below 44px at ${viewport.width}x${viewport.height}: ${JSON.stringify(control)}`);
      assert(control.x >= -0.5 && control.y >= -0.5
        && control.right <= viewport.width + 0.5 && control.bottom <= viewport.height + 0.5,
      `Critical control overflows ${viewport.width}x${viewport.height}: ${JSON.stringify(control)}`);
    }
    assert(layout.scrollWidth <= viewport.width + 1,
      `Horizontal overflow at ${viewport.width}x${viewport.height}: ${layout.scrollWidth}`);
    assert.deepEqual(diagnostics.externalRequests, [], `External requests at ${viewport.width}x${viewport.height}`);
    assert.deepEqual(diagnostics.errors, [], `Runtime errors at ${viewport.width}x${viewport.height}: ${diagnostics.errors.join(' | ')}`);
    return layout;
  } finally {
    await context.close();
  }
}

async function verifyPortrait(browser) {
  const viewport = { width: 390, height: 844 };
  const { context, page, diagnostics } = await openGame(browser, viewport);
  try {
    const state = await page.evaluate(() => {
      const hint = document.querySelector('[data-rotate-hint]');
      const root = document.querySelector('[data-game-root]');
      const hintStyle = hint ? getComputedStyle(hint) : null;
      const rootStyle = root ? getComputedStyle(root) : null;
      const visible = Boolean(hint && hintStyle.display !== 'none' && hintStyle.visibility !== 'hidden'
        && hint.getBoundingClientRect().width > 0 && hint.getBoundingClientRect().height > 0);
      const inert = Boolean(root && (
        root.inert
        || root.getAttribute('aria-hidden') === 'true'
        || rootStyle.pointerEvents === 'none'
        || [...root.querySelectorAll('[data-critical-control]')].every(control => {
          const style = getComputedStyle(control);
          return control.disabled || style.pointerEvents === 'none' || style.display === 'none';
        })
      ));
      return { visible, inert };
    });
    assert(state.visible, 'Portrait rotate hint is not visible at 390x844');
    assert(state.inert, 'Live game controls remain interactive behind portrait rotate hint');
    assert.deepEqual(diagnostics.externalRequests, [], 'Portrait page made an external request');
    assert.deepEqual(diagnostics.errors, [], `Portrait page errors: ${diagnostics.errors.join(' | ')}`);
    pass('portrait rotate guard');
  } finally {
    await context.close();
  }
}

async function verifyBrowser() {
  readDemo();
  const browser = await launchBrowser();
  try {
    await verifyLayout(browser, { width: 874, height: 402 });
    pass('layout 874x402');
    await verifyLayout(browser, { width: 667, height: 375 });
    pass('layout 667x375');
    await verifyPortrait(browser);
    await verifyDraftPreviewLayout(browser);

    const { context, page, diagnostics } = await openGame(browser);
    try {
      await setTimeScale(page, 30);
      await restartWithSeed(page, fixedSeed);
      let snapshot = await publicSnapshot(page);
      assert.equal(snapshot.phase, 'planning', 'Game must start in planning');
      const tutorialText = await page.locator('[data-tutorial]:visible').innerText();
      for (const token of ['27', '36', '+33%']) {
        assert(tutorialText.includes(token), `Tutorial comparison is missing visible "${token}"`);
      }
      pass('tutorial 27-to-36 comparison');
      await verifyUtilityDraftPreviews(page);
      await restartWithSeed(page, fixedSeed);
      snapshot = await publicSnapshot(page);

      await clickTutorialSwapIfNeeded(page, snapshot);
      snapshot = await publicSnapshot(page);
      assert.equal(Number(snapshot.swapsUsed), 1, 'Tutorial swap was not recorded');
      pass('tutorial flow');

      const before = roundEndCount(snapshot);
      await page.locator('[data-action="lock"]').evaluate(button => {
        button.click();
        button.click();
      });
      snapshot = await waitForPhase(page, ['draft', 'finished']);
      const after = roundEndCount(snapshot);
      assert.equal(after - before, 1, `Double lock settled ${after - before} rounds`);
      pass('atomic lock');

      if (snapshot.phase === 'draft') await verifyDraftPreviewAndEquippedGuard(page, snapshot);
      await waitForPhase(page, ['planning', 'finished']);
      const firstFinal = await driveToFinished(page);
      assertLegalTerminal(firstFinal, { fixedSeedKill: true });
      const resultEvidence = await page.locator('[data-result]:visible').innerText();
      assert(resultEvidence.includes('AI剩余总防护'), 'Result page is missing AI remaining total protection');
      assert(resultEvidence.includes('本局关键连招'), 'Result page is missing the key combo recap');
      const renderedAiProtection = Number(await page.locator('[data-result-ai-health]').innerText());
      assert.equal(renderedAiProtection, Number(firstFinal.ai.health) + Number(firstFinal.ai.shield),
        'Result AI remaining protection does not match the terminal snapshot');
      const killPhrase = firstFinal.ai.health <= 0
        ? `第${firstFinal.round}轮击破`
        : `第${firstFinal.round}轮我方核心被击破`;
      assert(resultEvidence.includes(killPhrase),
        `Fixed-seed result is missing terminal-round copy "${killPhrase}"`);
      pass('result recap');
      pass(`legal terminal run (round ${firstFinal.round})`);

      await restartWithSeed(page, fixedSeed);
      const repeatedA = await driveToFinished(page);
      await restartWithSeed(page, fixedSeed);
      const repeatedB = await driveToFinished(page);
      assertLegalTerminal(repeatedA, { fixedSeedKill: true });
      assertLegalTerminal(repeatedB, { fixedSeedKill: true });
      assert.deepEqual(
        stripVolatile(repeatedA),
        stripVolatile(repeatedB),
        'Same seed and same actions produced different final snapshots'
      );
      pass('same-seed repeat');

      assert.deepEqual(diagnostics.externalRequests, [], `External network requests: ${diagnostics.externalRequests.join(', ')}`);
      assert.deepEqual(diagnostics.errors, [], `Browser errors: ${diagnostics.errors.join(' | ')}`);
      pass('offline runtime');
    } finally {
      await context.close();
    }

    const scoreRun = await openGame(browser);
    try {
      await setTimeScale(scoreRun.page, 30);
      const scoreFinal = await driveToEightRoundScore(scoreRun.page);
      const scoreResultText = await scoreRun.page.locator('[data-result]:visible').innerText();
      assert(scoreResultText.includes('八轮计分'), 'Eight-round survivor result is missing "八轮计分"');
      const renderedPlayer = Number(await scoreRun.page.locator('[data-result-health]').innerText());
      const renderedAi = Number(await scoreRun.page.locator('[data-result-ai-health]').innerText());
      assert.equal(renderedPlayer, Number(scoreFinal.player.health) + Number(scoreFinal.player.shield),
        'Eight-round result player protection does not match snapshot');
      assert.equal(renderedAi, Number(scoreFinal.ai.health) + Number(scoreFinal.ai.shield),
        'Eight-round result AI protection does not match snapshot');
      assert.deepEqual(scoreRun.diagnostics.externalRequests, [], 'Eight-round score page made an external request');
      assert.deepEqual(scoreRun.diagnostics.errors, [],
        `Eight-round score page errors: ${scoreRun.diagnostics.errors.join(' | ')}`);
      pass(
        `eight-round survivor scoring (seed ${scoreFinal.seed}, `
        + `player ${renderedPlayer}, AI ${renderedAi})`
      );
    } finally {
      await scoreRun.context.close();
    }

    await verifyLayout(browser, { width: 874, height: 402 }, { terminal: true });
    pass('result layout 874x402');
    await verifyLayout(browser, { width: 667, height: 375 }, { terminal: true });
    pass('result layout 667x375');
  } finally {
    await browser.close();
  }
}

async function main() {
  assert(validModes.has(mode), `Unknown mode "${mode}". Use static, engine, browser, or all.`);
  if (mode === 'static' || mode === 'all') verifyStatic();
  if (mode === 'engine' || mode === 'all') await verifyEngine();
  if (mode === 'browser' || mode === 'all') await verifyBrowser();
}

main().catch(error => {
  process.stderr.write(`FAIL ${mode}: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
