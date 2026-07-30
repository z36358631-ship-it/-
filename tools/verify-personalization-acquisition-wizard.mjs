import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wizardPath = path.join(root, 'demos', '用户与设置', '个性化推荐采集demo.html');
const onboardingPath = path.join(root, 'demos', '新手引导完整链路demo.html');
const wizard = fs.readFileSync(wizardPath, 'utf8');
const onboarding = fs.readFileSync(onboardingPath, 'utf8');
const mode = process.argv[2] || 'all';

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function requireTokens(source, tokens, scope) {
  for (const token of tokens) {
    assert(source.includes(token), `${scope} missing token: ${token}`);
  }
}

function pass(name) {
  console.log(`PASS ${name}`);
}

function shell() {
  requireTokens(wizard, [
    'data-wizard-step="game"',
    'data-wizard-step="source"',
    'wizard-progress',
    'wizard-kicker',
    'wizard-footer',
    'Pick the games you love.',
    'Where did you hear about us?',
    '暂不选择',
  ], 'wizard shell');
  assert(!wizard.includes('view-swipe'), 'legacy swipe proposal still exists');
  assert(!wizard.includes('mode-toggle'), 'legacy proposal switch still exists');
  pass('shell');
}

function games() {
  requireTokens(wizard, [
    'const MIN_GAME_SELECTION = 3',
    'const MAX_GAME_SELECTION = 9',
    'data-action="shuffle-games"',
    'data-action="skip-games"',
    'data-action="submit-games"',
    'toggleGameSelection',
    'selected-game-check',
    'aria-pressed',
  ], 'game step');
  pass('games');
}

function sources() {
  requireTokens(wizard, [
    'domestic:',
    'overseas:',
    'douyin',
    'bilibili',
    'xiaohongshu',
    'app_store',
    'friend_referral',
    'other_or_unknown',
    'youtube',
    'tiktok',
    'reddit',
    'discord',
    'Where did you first hear about GameHub?',
    'data-action="submit-source"',
    'acquisition-source-card',
  ], 'source step');
  assert(!wizard.includes('GaishiGame'), 'overseas brand must be GameHub');
  assert(!wizard.includes('data-action="skip-source"'), 'source step must not be skippable');
  assert(!wizard.includes('data-action="close-wizard"'), 'wizard must not expose a close action');
  pass('sources');
}

function state() {
  requireTokens(wizard, [
    'not_eligible',
    'pending',
    'game_step_in_progress',
    'game_completed',
    'game_skipped',
    'source_pending',
    'completed',
    'gameTerminal',
    'sourceTerminal',
    'manualInterestExempt',
    'nextMissingStep',
    'saveWizardState',
    'restoreWizardState',
    'mergeIdentityState',
    'sync_pending',
    'eligibleColdStart',
    'window.PersonalizationWizard',
  ], 'state machine');
  assert(!wizard.includes('new_under_24h'), 'obsolete new-user 24h persona remains');
  assert(!wizard.includes('new_eligible'), 'obsolete new-user eligible persona remains');
  pass('state');
}

function onboardingSource() {
  requireTokens(onboarding, [
    'id="pageSource"',
    'gamehub_onboarding_source_v2',
    'onboarding_user_type_pending',
    'onboarding_source_pending',
    'onboarding_source_saved',
    'onboarding_branch_in_progress',
    'manual_interest_exempt',
    'data-onboarding-source-code',
    'submitOnboardingSource',
    'restoreOnboardingFlow',
    'other_or_unknown',
    'Where did you first hear about GameHub?',
  ], 'onboarding source');
  assert(!onboarding.includes('查看24小时后问卷'), 'onboarding still links to delayed wizard');
  assert(!onboarding.includes('满24小时后的首次合格冷启动'), 'obsolete delayed handoff remains');
  pass('onboardingSource');
}

function syntax() {
  for (const [name, source] of [['wizard', wizard], ['onboarding', onboarding]]) {
    const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    assert(scripts.length > 0, `${name} inline script missing`);
    scripts.forEach((code, index) => new vm.Script(code, { filename: `${name}-inline-${index}.js` }));
  }
  pass('syntax');
}

const tasks = { shell, games, sources, state, onboardingSource, syntax };
if (mode === 'all') Object.values(tasks).forEach(task => task());
else if (tasks[mode]) tasks[mode]();
else throw new Error(`Unknown mode: ${mode}`);
