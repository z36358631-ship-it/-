import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const files = {
  html: 'workbench/public/index.html',
  css: 'workbench/public/styles.css',
  app: 'workbench/public/app.js',
  demo: 'demos/产品经理全生命周期工作台demo.html',
};

for (const [kind, relativePath] of Object.entries(files)) {
  assert(fs.existsSync(path.join(root, relativePath)), `Missing ${kind} file: ${relativePath}`);
}

const html = fs.readFileSync(path.join(root, files.html), 'utf8');
const css = fs.readFileSync(path.join(root, files.css), 'utf8');
const app = fs.readFileSync(path.join(root, files.app), 'utf8');
const demo = fs.readFileSync(path.join(root, files.demo), 'utf8');
const productUi = `${html}\n${app}\n${demo}`;

const requiredCopy = [
  '待我处理',
  '规划中心',
  '需求中心',
  '评审与验收',
  '数据与复盘',
  'Codex任务',
  '问 Codex',
  '外部等待',
  '产品专员任务备注',
  'Codex运行状态',
  '只读分析',
  '整理反馈并去重',
  '检查 Demo、PRD 差异与漏洞',
  '开发/测试问题转产品策略',
  'Codex 整理后的需求候选',
  'data-workflow',
  'workflowResult',
  '生成候选产物',
  '修改已选产物',
  '等待我确认',
  '文件变化',
  '验证结果',
  '恢复本次修改',
  'data-action="cancel-run"',
  'data-action="retry-run"',
];
for (const token of requiredCopy) {
  assert(html.includes(token), `Missing UI token: ${token}`);
}

const forbiddenCopy = [
  '团队与AI',
  '下一责任人',
  '唯一审批人',
  'AI员工',
  '模拟 AI',
  '模拟AI',
  '登录账号',
  '多人协作',
  '审批流',
];
for (const token of forbiddenCopy) {
  assert(!productUi.includes(token), `Forbidden legacy token: ${token}`);
}

assert.match(html, /<html\s+lang="zh-CN">/);
assert.match(html, /name="viewport"\s+content="width=device-width,\s*initial-scale=1"/);
assert.match(html, /class="skip-link"\s+href="#mainContent"/);
assert.match(html, /<aside[^>]+aria-label="主导航"/);
assert.match(html, /<main[^>]+id="mainContent"[^>]+tabindex="-1"/);
assert.match(html, /<dialog[^>]+id="codexDrawer"[^>]+aria-labelledby="codexTitle"/);
assert.match(html, /<dialog[^>]+id="manualTaskDialog"[^>]+aria-labelledby="manualTaskTitle"/);
assert.match(html, /id="streamOutput"[^>]+aria-live="polite"/);
assert.match(html, /id="workflowResult"[^>]+aria-live="polite"/);
assert.match(html, /id="authorizedFiles"[^>]+class="authorized-artifacts"/);
assert.match(html, /id="candidateTarget"[^>]+type="text"/);
assert.match(html, /name="permission"\s+value="read-only"/);
assert.match(html, /name="permission"\s+value="generate-candidate"/);
assert.match(html, /name="permission"\s+value="modify-existing"/);
assert.match(html, /data-action="restore-run"/);
assert.equal(
  /<textarea[^>]+id="authorizedFiles"/.test(html),
  false,
  'Registered artifact selection must not be a free-form textarea',
);
assert.match(html, /<svg\b/);
assert.equal(/https?:\/\//.test(html), false, 'Workbench UI must not depend on remote assets');
assert.equal(/\p{Extended_Pictographic}/u.test(productUi), false, 'Structural emoji is not allowed');

assert.match(css, /:root\s*{[^}]*--color-primary:/s);
assert.match(css, /--color-surface:/);
assert.match(css, /--color-text:/);
assert.match(css, /--control-height:\s*44px/);
assert.match(css, /:focus-visible/);
assert.match(css, /@media\s*\(max-width:\s*1439px\)/);
assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
assert.match(css, /@media\s*\(max-width:\s*767px\)/);
assert.match(css, /@media\s*\(max-width:\s*420px\)/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);

assert.match(app, /new EventSource\(\s*`\/api\/runs\/\$\{encodeURIComponent\(run\.id\)\}\/events\?token=\$\{encodeURIComponent\(state\.token\)\}`/s);
assert.match(app, /api\(['"`]\/api\/bootstrap/);
assert.match(app, /api\(['"`]\/api\/runs/);
assert.match(app, /\/api\/requirements\/\$\{encodeURIComponent\(id\)\}\/context/);
assert.match(app, /\/api\/workflows\/\$\{workflowType\}\/runs/);
assert.match(app, /\/api\/runs\/\$\{encodeURIComponent\(run\.id\)\}\/workflow-result/);
assert.match(app, /api\(['"`]\/api\/runs\/write/);
assert.match(app, /\/api\/runs\/\$\{encodeURIComponent\(runId\)\}`/);
assert.match(app, /\/api\/approvals\/\$\{encodeURIComponent\(id\)\}\/decision/);
assert.match(app, /\/cancel`/);
assert.match(app, /\/retry`/);
assert.match(app, /\/restore`/);
assert.match(app, /bootstrap\.requirementCandidates/);
assert.match(app, /bootstrap\.reviewFindings/);
assert.match(app, /bootstrap\.productStrategies/);
assert.match(app, /\.textContent\s*=/);
assert.match(app, /\.replaceChildren\(/);
assert.match(app, /document\.createElement\(/);
assert.equal(/\.innerHTML\s*=|insertAdjacentHTML|\.outerHTML\s*=/.test(app), false, 'Unsafe HTML injection API found');
assert.equal(
  /\b(sandbox|command|codexArgs|sandboxPolicy|cwd|absoluteRoot)\s*:/.test(app),
  false,
  'Frontend must not submit Codex controls',
);
assert.equal(/\bsetInterval\s*\(/.test(app), false, 'Run detail polling must not use setInterval');
assert.match(app, /window\.setTimeout\(poll,\s*700\)/);
assert.match(app, /item\.kind === ['"]file-change['"]/);
assert.match(app, /只恢复本 Run 明确记录的文件/);
assert.match(app, /history\.replaceState/);
assert.match(app, /sessionStorage\.setItem/);
assert.match(app, /aria-current/);

assert.match(demo, /npm\.cmd run workbench:start/);
assert.match(demo, /127\.0\.0\.1/);
assert.equal(/<script[^>]+src=|<link[^>]+href=["']https?:/.test(demo), false, 'Demo must be self-contained');

console.log('PASS personal workbench static contract');

const evidenceRoot = path.join(root, 'test-results', 'personal-codex-workbench');
const mockSafetyRuns = [
  {
    id: 'RUN-MOCK-WAITING',
    requirementId: 'REQ-001',
    prompt: 'Mock waiting approval',
    permission: 'modify-existing',
    status: 'waiting-approval',
    startedAt: '2026-07-28T04:00:00.000Z',
  },
  {
    id: 'RUN-MOCK-FAILED',
    requirementId: 'REQ-001',
    prompt: 'Mock failed write with diff',
    permission: 'modify-existing',
    status: 'failed',
    error: 'Mock validation failure',
    startedAt: '2026-07-28T03:00:00.000Z',
  },
];
const mockRunDetails = {
  'RUN-MOCK-WAITING': {
    ...mockSafetyRuns[0],
    approvals: [
      {
        id: 'APPROVAL-SAFE',
        kind: 'file-change',
        summary: 'file-change: prd/safe.md',
        status: 'pending',
        payload: { paths: ['prd/safe.md'] },
      },
      {
        id: 'APPROVAL-COMMAND',
        kind: 'command',
        summary: 'Command request: git push',
        status: 'pending',
        payload: { paths: [] },
      },
      {
        id: 'APPROVAL-DELETE',
        kind: 'file-delete',
        summary: 'file-delete: prd/safe.md',
        status: 'pending',
        payload: { paths: ['prd/safe.md'] },
      },
      {
        id: 'APPROVAL-OUTSIDE',
        kind: 'out-of-scope-file',
        summary: 'out-of-scope-file: prd/outside.md',
        status: 'pending',
        payload: { paths: ['prd/outside.md'] },
      },
    ],
    fileChanges: [],
    validations: [],
  },
  'RUN-MOCK-FAILED': {
    ...mockSafetyRuns[1],
    approvals: [],
    fileChanges: [
      {
        path: 'prd/safe.md',
        kind: 'modified',
        beforeHash: 'before-hash',
        afterHash: 'after-hash',
        diff: '--- a/prd/safe.md\n+++ b/prd/safe.md\n@@ -1 +1 @@\n-old rule\n+new safe rule',
        restoredAt: null,
      },
      {
        path: 'assets/mock.bin',
        kind: 'modified',
        beforeHash: 'binary-before',
        afterHash: 'binary-after',
        diff: '',
        restoredAt: null,
      },
    ],
    validations: [
      {
        name: 'target-integrity',
        status: 'failed',
        detail: 'Mock target hash mismatch',
      },
      {
        name: 'unrelated-files',
        status: 'passed',
        detail: 'No unrelated file changed',
      },
    ],
  },
};
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function startWorkbench(workspaceRoot) {
  const isolatedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'),
  );
  const child = spawn(process.execPath, ['workbench/server.mjs'], {
    cwd: root,
    env: {
      ...isolatedEnvironment,
      PATH: path.dirname(process.execPath),
      WORKBENCH_PORT: '0',
      WORKBENCH_ROOT: workspaceRoot,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => {
    stdout += chunk;
  });
  child.stderr.on('data', chunk => {
    stderr = `${stderr}${chunk}`.slice(-4_000);
  });

  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Workbench server did not become ready: ${stderr || 'no diagnostic'}`));
    }, 20_000);
    const inspect = () => {
      const baseMatch = stdout.match(/Personal Codex Workbench:\s+(http:\/\/127\.0\.0\.1:\d+)/);
      const tokenMatch = stdout.match(/Local session token:\s+([a-f0-9]{64})/);
      if (!baseMatch || !tokenMatch) return;
      clearTimeout(timeout);
      resolve({ baseUrl: baseMatch[1], token: tokenMatch[1] });
    };
    child.stdout.on('data', inspect);
    child.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Workbench server exited before readiness: code=${code} signal=${signal}`));
    });
  });

  return { child, ready };
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM');
  if (await Promise.race([exited.then(() => false), wait(5_000).then(() => true)])) {
    child.kill('SIGKILL');
    await Promise.race([exited, wait(5_000)]);
  }
  assert(
    child.exitCode !== null || child.signalCode !== null,
    'Workbench server process did not exit during cleanup',
  );
}

async function removeTempRoot(tempRoot) {
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      fs.rmSync(tempRoot, { force: true, recursive: true });
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code)) throw error;
      await wait(250 * (attempt + 1));
    }
  }
  throw lastError;
}

async function settleLayout(page) {
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function activateNavigation(page, pageName, mobile = false) {
  const navigation = page.locator(`#primaryNav [data-page="${pageName}"]`);
  if (mobile) {
    await page.locator('#navToggle').click();
    await page.locator('#navToggle').getAttribute('aria-expanded').then(value => {
      assert.equal(value, 'true', 'Mobile navigation did not open');
    });
  }
  await navigation.click();
  await page.locator(`[data-page-panel="${pageName}"]`).waitFor({ state: 'visible' });
  assert.equal(
    await navigation.getAttribute('aria-current'),
    'page',
    `Navigation did not select ${pageName}`,
  );
  assert.equal(
    await page.locator(`[data-page-panel="${pageName}"]`).getAttribute('hidden'),
    null,
    `Navigation panel stayed hidden for ${pageName}`,
  );
  if (mobile) {
    assert.equal(
      await page.locator('#navToggle').getAttribute('aria-expanded'),
      'false',
      'Mobile navigation did not close after selection',
    );
  }
}

async function assertCodexDialog(page, viewportLabel) {
  await page.locator('#askCodex').click();
  const dialog = page.locator('#codexDrawer');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator('input[name="permission"][value="read-only"]').check();
  await dialog.evaluate(async element => {
    await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
  });
  assert.equal(await dialog.getAttribute('open'), '', `${viewportLabel}: Codex dialog did not open`);
  assert.equal(
    (await dialog.locator('.permission-badge').innerText()).trim(),
    '只读分析',
    `${viewportLabel}: read-only badge is missing`,
  );
  assert.match(
    await dialog.locator('.security-note').innerText(),
    /不会创建、修改、移动或删除文件/,
    `${viewportLabel}: read-only safety copy is missing`,
  );
  assert.equal(
    await dialog.locator('[name="command"], [name="codexArgs"], [name="sandboxPolicy"]').count(),
    0,
    `${viewportLabel}: forbidden Codex controls are exposed`,
  );
  const dialogBounds = await dialog.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const body = element.querySelector('.drawer-body');
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      viewportWidth: window.innerWidth,
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
    };
  });
  assert(
    dialogBounds.left >= 0
      && dialogBounds.right <= dialogBounds.viewportWidth
      && dialogBounds.bodyScrollWidth <= dialogBounds.bodyClientWidth,
    `${viewportLabel}: Codex dialog exceeds the horizontal viewport ${JSON.stringify(dialogBounds)}`,
  );
  const permissionControls = dialog.locator('#permissionPicker label');
  assert.equal(await permissionControls.count(), 3);
  for (let index = 0; index < 3; index += 1) {
    const height = await permissionControls.nth(index).evaluate(
      element => element.getBoundingClientRect().height,
    );
    assert(height >= 44, `${viewportLabel}: permission control ${index} is below 44px`);
  }
  const workflowButtons = dialog.locator('#workflowPicker [data-workflow]');
  assert.equal(
    await workflowButtons.count(),
    3,
    `${viewportLabel}: expected exactly three product workflows`,
  );
  for (let index = 0; index < 3; index += 1) {
    const button = workflowButtons.nth(index);
    const height = await button.evaluate(element => element.getBoundingClientRect().height);
    assert(height >= 44, `${viewportLabel}: workflow control ${index} is below 44px`);
    await button.focus();
    assert(
      await button.evaluate(element => element === document.activeElement),
      `${viewportLabel}: workflow control ${index} cannot receive keyboard focus`,
    );
  }
  await workflowButtons.first().click();
  assert.equal(await workflowButtons.first().getAttribute('aria-pressed'), 'true');
  assert.equal(await dialog.locator('#businessInput').isVisible(), true);
  assert.equal(await dialog.locator('#prompt').isVisible(), false);
  await dialog.locator('#useFreeformMode').click();
  assert.equal(await dialog.locator('#prompt').isVisible(), true);
  assert.equal(await dialog.locator('#businessInput').isVisible(), false);
  await dialog.locator('#closeCodex').click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await dialog.getAttribute('open'), null, `${viewportLabel}: Codex dialog did not close`);
}

async function verifyViewport(page, viewport, screenshotName) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await activateNavigation(page, 'home', viewport.width <= 767);
  await settleLayout(page);

  const layout = await page.evaluate(() => {
    const rootElement = document.documentElement;
    const body = document.body;
    const usableControls = [...document.querySelectorAll('button, input, textarea, select, a[href]')]
      .filter(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return !element.disabled
          && style.visibility !== 'hidden'
          && style.display !== 'none'
          && rect.width > 0
          && rect.height > 0
          && rect.right > 0
          && rect.left < rootElement.clientWidth
          && rect.bottom > 0
          && rect.top < rootElement.clientHeight;
      }).length;
    return {
      bodyScrollWidth: body.scrollWidth,
      clientWidth: rootElement.clientWidth,
      documentScrollWidth: rootElement.scrollWidth,
      usableControls,
    };
  });
  assert(
    layout.documentScrollWidth <= layout.clientWidth
      && layout.bodyScrollWidth <= layout.clientWidth,
    `${viewport.label}: horizontal overflow ${JSON.stringify(layout)}`,
  );
  assert(layout.usableControls > 0, `${viewport.label}: no usable controls in the viewport`);

  if (viewport.width <= 767) {
    await page.locator('#navToggle').click();
    assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'true');
    await page.locator('#navScrim').click({ position: { x: viewport.width - 5, y: 5 } });
    assert.equal(await page.locator('#navToggle').getAttribute('aria-expanded'), 'false');
  } else {
    await activateNavigation(page, 'planning');
    await activateNavigation(page, 'home');
  }

  await assertCodexDialog(page, viewport.label);
  if (screenshotName) {
    await page.screenshot({
      path: path.join(evidenceRoot, screenshotName),
      fullPage: true,
    });
  }
  return layout;
}

async function runBrowserVerification() {
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-codex-workbench-ui-'));
  const server = startWorkbench(tempRoot);
  const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
  assert(executablePath, 'Chrome or Edge executable was not found');

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'running',
    staticContract: 'passed',
    browser: path.basename(executablePath),
    urlTokenRemoved: false,
    navigation: [],
    selectedRequirement: null,
    registeredArtifactSelection: null,
    manualTaskNote: null,
    workflowControls: null,
    permissionModes: null,
    safetyRunDetail: null,
    dialog: null,
    health: null,
    viewports: [],
    consoleErrors: [],
    pageErrors: [],
    screenshots: ['desktop.png', 'mobile.png'],
  };
  let browser;
  let failure;

  try {
    const { baseUrl, token } = await server.ready;
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu'],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'zh-CN',
    });
    const page = await context.newPage();
    page.on('console', message => {
      if (message.type() === 'error') {
        report.consoleErrors.push({
          text: message.text(),
          url: message.location().url,
        });
      }
    });
    page.on('pageerror', error => {
      report.pageErrors.push(error.message);
    });

    await page.route('**/api/bootstrap', async route => {
      const response = await route.fetch();
      const bootstrap = await response.json();
      await route.fulfill({
        response,
        json: {
          ...bootstrap,
          runs: [
            ...mockSafetyRuns,
            ...(Array.isArray(bootstrap.runs) ? bootstrap.runs : []),
          ],
        },
      });
    });
    await page.route('**/api/runs/RUN-MOCK-*', async route => {
      const runId = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1));
      const detail = mockRunDetails[runId];
      assert(detail, `Missing mocked run detail for ${runId}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(detail),
      });
    });

    await page.goto(`${baseUrl}/?token=${encodeURIComponent(token)}#home`, {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('#homeRequirements .requirement-row').first().waitFor();
    await page.waitForFunction(() => {
      const badge = document.querySelector('#healthBadge');
      return badge && !badge.textContent.includes('检查中');
    });

    const currentUrl = new URL(page.url());
    assert.equal(currentUrl.search, '', 'Session token remained in the browser URL');
    assert.equal(currentUrl.hash, '#home', 'History replacement did not preserve the page hash');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('workbenchToken')), token);
    report.urlTokenRemoved = true;
    report.health = (await page.locator('#healthBadge').innerText()).trim();
    assert.match(
      report.health,
      /Codex 配置错误|Codex 认证失效|Codex 已连接|Broker 正常|本机连接异常/,
      `Unexpected health status: ${report.health}`,
    );

    const pageNames = ['home', 'planning', 'requirements', 'review', 'data', 'codex'];
    for (const pageName of pageNames) {
      await activateNavigation(page, pageName);
      report.navigation.push(pageName);
    }

    await activateNavigation(page, 'requirements');
    await page.locator('#requirementList [data-requirement-id="REQ-002"]').click();
    assert.match(await page.locator('#requirementDetail').innerText(), /REQ-002[\s\S]*iOS应用与IPA资源库/);
    await page.locator('#requirementDetail .detail-controls').waitFor();
    assert(
      await page.locator('#requirementList [data-requirement-id="REQ-002"]').evaluate(
        element => element.classList.contains('is-selected'),
      ),
      'Selected requirement did not receive its selected state',
    );
    report.selectedRequirement = 'REQ-002';

    const stageSelect = page.locator('[aria-label="手动调整需求阶段"]');
    const waitSelect = page.locator('[aria-label="手动调整外部等待"]');
    assert.equal(await stageSelect.count(), 1, 'Requirement stage control is missing');
    assert.equal(await waitSelect.count(), 1, 'External wait control is missing');

    await page.getByRole('button', { name: '记录产品专员任务' }).click();
    const manualDialog = page.locator('#manualTaskDialog');
    await manualDialog.waitFor({ state: 'visible' });
    await manualDialog.locator('#manualTaskDescription').fill('浏览器验收跟进事项');
    await manualDialog.locator('#manualTaskDeliverable').fill('验收记录');
    await manualDialog.locator('#manualTaskNote').fill('仅作为个人任务备注');
    await manualDialog.getByRole('button', { name: '保存记录' }).click();
    await manualDialog.waitFor({ state: 'hidden' });
    await activateNavigation(page, 'home');
    const createdTask = page.locator('#manualTaskNotes .note-card').filter({
      hasText: '浏览器验收跟进事项',
    });
    await createdTask.waitFor();
    await createdTask.getByRole('button', { name: '标记完成' }).click();
    await page.waitForFunction(() => (
      [...document.querySelectorAll('#manualTaskNotes .note-card')]
        .some(card => card.textContent.includes('浏览器验收跟进事项')
          && card.textContent.includes('已完成'))
    ));
    report.manualTaskNote = 'create-complete passed';

    await activateNavigation(page, 'requirements');
    await page.locator('#requirementList [data-requirement-id="REQ-001"]').click();
    const detailArtifacts = page.locator(
      '#requirementDetail [data-artifact-surface="detail"]',
    );
    await detailArtifacts.first().waitFor();
    assert.equal(await detailArtifacts.count(), 2, 'Registered artifacts were not loaded');
    assert.deepEqual(
      await detailArtifacts.evaluateAll(elements => elements.map(element => ({
        checked: element.checked,
        kind: element.dataset.artifactKind,
        value: element.value,
      }))),
      [
        {
          checked: true,
          kind: 'Demo',
          value: 'demos/产品经理全生命周期工作台demo.html',
        },
        {
          checked: true,
          kind: 'PRD',
          value: 'docs/superpowers/specs/2026-07-28-personal-codex-workbench-design.md',
        },
      ],
    );

    await page.locator('#askCodex').click();
    await page.locator('#codexDrawer').waitFor({ state: 'visible' });
    assert.match(await page.locator('#contextRequirement').innerText(), /REQ-001.*Android广告接入/);
    assert.equal((await page.locator('.permission-badge').innerText()).trim(), '只读分析');
    const drawerArtifacts = page.locator(
      '#drawerArtifactOptions [data-artifact-surface="drawer"]',
    );
    assert.equal(await drawerArtifacts.count(), 2);
    await drawerArtifacts.first().uncheck();
    assert.equal(await detailArtifacts.first().isChecked(), false);
    await drawerArtifacts.first().check();
    assert.equal(await detailArtifacts.first().isChecked(), true);
    assert.equal(
      await page.locator('#authorizedFiles textarea, textarea#authorizedFiles').count(),
      0,
      'Drawer exposes free-form artifact paths',
    );

    const workflowButtons = page.locator('#workflowPicker [data-workflow]');
    await workflowButtons.first().click();
    await page.locator('input[name="permission"][value="modify-existing"]').check();
    assert.equal((await page.locator('#permissionBadge').innerText()).trim(), '修改已选产物');
    assert.equal(await page.locator('#authorizedFiles').isVisible(), true);
    assert.equal(await page.locator('#candidateTarget').isVisible(), false);
    for (let index = 0; index < 3; index += 1) {
      assert.equal(
        await workflowButtons.nth(index).isDisabled(),
        true,
        `Write mode left workflow ${index} enabled`,
      );
      assert.equal(await workflowButtons.nth(index).getAttribute('aria-pressed'), 'false');
    }
    assert.equal(await page.locator('#businessInput').isVisible(), false);

    await page.locator('input[name="permission"][value="generate-candidate"]').check();
    assert.equal((await page.locator('#permissionBadge').innerText()).trim(), '生成候选产物');
    assert.equal(await page.locator('#authorizedFiles').isVisible(), false);
    assert.equal(await page.locator('#candidateTarget').isVisible(), true);
    await page.locator('#candidateTarget').fill('prd/ai生成/mock-candidate.md');
    assert.match(
      await page.locator('#permissionSecurityCopy').innerText(),
      /新候选相对路径/,
    );

    await page.locator('input[name="permission"][value="read-only"]').check();
    assert.equal(await workflowButtons.first().isDisabled(), false);
    assert.equal(await page.locator('#authorizedFiles').isVisible(), true);
    assert.equal(await page.locator('#candidateTarget').isVisible(), false);
    report.registeredArtifactSelection = 'registered-only/synchronized passed';
    report.workflowControls = 'three/focusable/mode-switch passed';
    report.permissionModes = 'read/generate/modify target rules passed';
    report.dialog = 'open-close/read-only passed';
    await page.locator('#closeCodex').click();
    await page.locator('#codexDrawer').waitFor({ state: 'hidden' });

    await activateNavigation(page, 'codex');
    const waitingRun = page.locator('#runList [data-run-id="RUN-MOCK-WAITING"]');
    await waitingRun.focus();
    assert.equal(await waitingRun.getAttribute('role'), 'button');
    await waitingRun.press('Enter');
    await page.locator('#approvalCards .approval-card').first().waitFor();
    assert.equal(await page.locator('#approvalCards .approval-card').count(), 4);
    const safeApproval = page.locator('#approvalCards .approval-card').filter({
      hasText: 'file-change',
    });
    assert.equal(
      await safeApproval.getByRole('button', { name: '允许本次文件变化' }).isEnabled(),
      true,
    );
    for (const kind of ['command', 'file-delete', 'out-of-scope-file']) {
      const dangerous = page.locator('#approvalCards .approval-card').filter({ hasText: kind });
      assert.equal(
        await dangerous.getByRole('button', { name: '不可允许' }).isDisabled(),
        true,
        `${kind} approval unexpectedly enabled`,
      );
      assert.equal(
        await dangerous.getByRole('button', { name: '拒绝' }).isEnabled(),
        true,
        `${kind} rejection unexpectedly disabled`,
      );
    }
    assert.equal(await page.locator('[data-action="cancel-run"]').isEnabled(), true);
    assert.equal(await page.locator('[data-action="retry-run"]').isDisabled(), true);
    assert.equal(await page.locator('[data-action="restore-run"]').isDisabled(), true);
    await page.locator('#closeCodex').click();
    await page.locator('#codexDrawer').waitFor({ state: 'hidden' });

    const failedRun = page.locator('#runList [data-run-id="RUN-MOCK-FAILED"]');
    await failedRun.focus();
    await failedRun.press(' ');
    await page.locator('#fileChanges .change-card').first().waitFor();
    assert.match(await page.locator('#fileChanges').innerText(), /old rule[\s\S]*new safe rule/);
    assert.match(await page.locator('#fileChanges').innerText(), /二进制或无文本差异/);
    assert.equal(await page.locator('#validationResults .validation-card').count(), 2);
    assert.equal(await page.locator('[data-action="cancel-run"]').isDisabled(), true);
    assert.equal(await page.locator('[data-action="retry-run"]').isEnabled(), true);
    assert.equal(await page.locator('[data-action="restore-run"]').isEnabled(), true);
    report.safetyRunDetail = 'approval/diff/validation/run-controls passed';
    await page.locator('#closeCodex').click();
    await page.locator('#codexDrawer').waitFor({ state: 'hidden' });

    const viewports = [
      { label: 'desktop-1440', width: 1440, height: 900, screenshot: 'desktop.png' },
      { label: 'laptop-1024', width: 1024, height: 900 },
      { label: 'tablet-768', width: 768, height: 900 },
      { label: 'mobile-375', width: 375, height: 812, screenshot: 'mobile.png' },
    ];
    for (const viewport of viewports) {
      const layout = await verifyViewport(page, viewport, viewport.screenshot);
      report.viewports.push({ ...viewport, ...layout, controls: 'passed' });
    }

    assert.deepEqual(report.consoleErrors, [], 'Browser console errors were reported');
    assert.deepEqual(report.pageErrors, [], 'Uncaught browser page errors were reported');
    report.status = 'passed';
    console.log('PASS personal workbench browser contract');
  } catch (error) {
    failure = error;
    report.status = 'failed';
    report.failure = error.stack || error.message;
  } finally {
    if (browser) await browser.close();
    await stopChild(server.child);
    try {
      await removeTempRoot(tempRoot);
      report.cleanup = 'passed';
    } catch (error) {
      report.cleanup = `failed: ${error.message}`;
      if (!failure) {
        failure = error;
        report.status = 'failed';
        report.failure = error.stack || error.message;
      }
    }
    fs.writeFileSync(
      path.join(evidenceRoot, 'test-results.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  }

  if (failure) throw failure;
}

await runBrowserVerification();
