import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  acquireInstance,
  checkBrokerHealth,
  copyMissingSeeds,
  createLauncherLogger,
  createPortableCodexCommand,
  loadWorkspace,
  releaseInstance,
  writeJsonAtomic,
} from '../../workbench/portable/launcher-state.mjs';
import {
  chooseWorkspaceFolder,
  ensureCodexLogin,
  openDefaultBrowser,
} from '../../workbench/portable/windows.mjs';

function temporaryRoot(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('portable Codex command is an absolute nonce-bound junction path', t => {
  const root = temporaryRoot(t, 'portable-codex-command-');
  const codexRoot = path.join(root, 'runtime', 'codex');
  fs.mkdirSync(codexRoot, { recursive: true });
  fs.writeFileSync(path.join(codexRoot, 'codex.exe'), 'fixture');
  const nonce = 'c'.repeat(64);

  const command = createPortableCodexCommand({
    codexRoot,
    nonce,
    runtimeRoot: path.join(root, 'runtime'),
  });

  assert.equal(path.isAbsolute(command), true);
  assert.equal(command, path.join(
    root,
    'runtime',
    'codex-sessions',
    nonce,
    'codex.exe',
  ));
  assert.equal(
    fs.realpathSync(command),
    fs.realpathSync(path.join(codexRoot, 'codex.exe')),
  );
});

test('portable Codex command rejects malformed nonces and unexpected junction targets', t => {
  const root = temporaryRoot(t, 'portable-codex-reject-');
  const runtimeRoot = path.join(root, 'runtime');
  const codexRoot = path.join(runtimeRoot, 'codex');
  const otherRoot = path.join(runtimeRoot, 'other-codex');
  fs.mkdirSync(codexRoot, { recursive: true });
  fs.mkdirSync(otherRoot, { recursive: true });
  fs.writeFileSync(path.join(codexRoot, 'codex.exe'), 'fixture');
  fs.writeFileSync(path.join(otherRoot, 'codex.exe'), 'other');

  assert.throws(
    () => createPortableCodexCommand({
      codexRoot,
      nonce: 'not-a-nonce',
      runtimeRoot,
    }),
    /64 lowercase hexadecimal/,
  );

  const nonce = 'd'.repeat(64);
  const sessionsRoot = path.join(runtimeRoot, 'codex-sessions');
  fs.mkdirSync(sessionsRoot, { recursive: true });
  fs.symlinkSync(otherRoot, path.join(sessionsRoot, nonce), 'junction');
  assert.throws(
    () => createPortableCodexCommand({ codexRoot, nonce, runtimeRoot }),
    /unexpected target/,
  );
});

test('missing seeds are copied once and existing workspace files are never overwritten', t => {
  const root = temporaryRoot(t, 'portable-seeds-');
  const runtimePath = path.join(root, 'runtime');
  const workspace = path.join(root, 'workspace');
  const source = path.join(runtimePath, 'starter-workspace', 'demo.txt');
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(source, 'seed');
  const mappings = [{
    source: 'starter-workspace/demo.txt',
    target: 'demo.txt',
  }];

  assert.deepEqual(copyMissingSeeds({ mappings, runtimePath, workspace }), ['demo.txt']);
  fs.writeFileSync(path.join(workspace, 'demo.txt'), 'user content');
  assert.deepEqual(copyMissingSeeds({ mappings, runtimePath, workspace }), []);
  assert.equal(
    fs.readFileSync(path.join(workspace, 'demo.txt'), 'utf8'),
    'user content',
  );
});

test('seed mappings cannot escape the runtime or workspace roots', t => {
  const root = temporaryRoot(t, 'portable-seed-boundary-');
  const runtimePath = path.join(root, 'runtime');
  const workspace = path.join(root, 'workspace');
  fs.mkdirSync(runtimePath);
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(root, 'outside.txt'), 'outside');

  assert.throws(
    () => copyMissingSeeds({
      mappings: [{ source: '../outside.txt', target: 'demo.txt' }],
      runtimePath,
      workspace,
    }),
    /seed source escaped runtime root/i,
  );
  assert.throws(
    () => copyMissingSeeds({
      mappings: [{ source: 'starter.txt', target: '../outside.txt' }],
      runtimePath,
      workspace,
    }),
    /seed target escaped workspace root/i,
  );
});

test('cancelled selection returns null and does not create workspace data', async t => {
  const root = temporaryRoot(t, 'portable-workspace-');
  const workspace = await loadWorkspace({
    appRoot: path.join(root, 'state'),
    chooseFolder: async () => null,
  });

  assert.equal(workspace, null);
  assert.equal(fs.existsSync(path.join(root, 'state', 'settings.json')), false);
  assert.equal(fs.existsSync(path.join(root, '.workbench-data')), false);
});

test('invalid saved workspace returns to the explicit chooser and saves the selection', async t => {
  const root = temporaryRoot(t, 'portable-workspace-reselect-');
  const appRoot = path.join(root, 'state');
  const selected = path.join(root, 'selected');
  fs.mkdirSync(selected);
  writeJsonAtomic(path.join(appRoot, 'settings.json'), {
    workspace: path.join(root, 'missing'),
  });
  let chooserCount = 0;

  const workspace = await loadWorkspace({
    appRoot,
    chooseFolder: async () => {
      chooserCount += 1;
      return selected;
    },
  });

  assert.equal(workspace, path.resolve(selected));
  assert.equal(chooserCount, 1);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(appRoot, 'settings.json'), 'utf8')),
    { workspace: path.resolve(selected) },
  );
});

test('Broker health uses the token, exact loopback Origin, and bootstrap endpoint', async () => {
  const token = 'e'.repeat(64);
  let request;
  const healthy = await checkBrokerHealth({
    port: 49123,
    token,
  }, async (url, options) => {
    request = { options, url };
    return { ok: true };
  });

  assert.equal(healthy, true);
  assert.equal(request.url, 'http://127.0.0.1:49123/api/bootstrap');
  assert.equal(request.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(request.options.headers.Origin, 'http://127.0.0.1:49123');
  assert.equal(
    await checkBrokerHealth({ port: 0, token }, async () => ({ ok: true })),
    false,
  );
});

test('instance reuse requires a healthy token response', async t => {
  const root = temporaryRoot(t, 'portable-instance-reuse-');
  const ownerNonce = 'f'.repeat(64);
  const session = {
    ownerNonce,
    pid: 8123,
    port: 49123,
    token: 'a'.repeat(64),
    workspace: 'C:\\workspace',
    startedAt: new Date().toISOString(),
  };
  writeJsonAtomic(path.join(root, 'session.json'), session);
  fs.writeFileSync(
    path.join(root, 'instance.lock'),
    JSON.stringify({ ownerNonce, pid: session.pid }),
  );

  const reused = await acquireInstance({
    appRoot: root,
    checkHealth: async value => value.token === session.token,
    isPidAlive: () => true,
  });

  assert.equal(reused.status, 'reused');
  assert.deepEqual(reused.session, session);
});

test('a live lock without a session fails closed during startup', async t => {
  const root = temporaryRoot(t, 'portable-live-lock-');
  const ownerNonce = 'b'.repeat(64);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'instance.lock'),
    JSON.stringify({ ownerNonce, pid: 8124 }),
  );

  await assert.rejects(
    () => acquireInstance({
      appRoot: root,
      checkHealth: async () => false,
      isPidAlive: pid => pid === 8124,
    }),
    /仍在运行但会话尚未就绪/,
  );
  assert.equal(fs.existsSync(path.join(root, 'instance.lock')), true);
});

test('an unhealthy live instance fails closed and preserves its state', async t => {
  const root = temporaryRoot(t, 'portable-ambiguous-instance-');
  const ownerNonce = 'c'.repeat(64);
  const session = {
    ownerNonce,
    pid: 8125,
    port: 49124,
    token: 'd'.repeat(64),
  };
  writeJsonAtomic(path.join(root, 'session.json'), session);
  fs.writeFileSync(
    path.join(root, 'instance.lock'),
    JSON.stringify({ ownerNonce, pid: session.pid }),
  );

  await assert.rejects(
    () => acquireInstance({
      appRoot: root,
      checkHealth: async () => false,
      isPidAlive: () => true,
    }),
    /仍在运行但健康检查失败/,
  );
  assert.equal(fs.existsSync(path.join(root, 'instance.lock')), true);
  assert.equal(fs.existsSync(path.join(root, 'session.json')), true);
});

test('a dead stale instance is replaced with nonce-bound ownership', async t => {
  const root = temporaryRoot(t, 'portable-stale-instance-');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'instance.lock'),
    JSON.stringify({ ownerNonce: 'd'.repeat(64), pid: 8126 }),
  );
  writeJsonAtomic(path.join(root, 'session.json'), {
    ownerNonce: 'd'.repeat(64),
    pid: 8126,
    port: 49125,
    token: 'e'.repeat(64),
  });

  const acquired = await acquireInstance({
    appRoot: root,
    checkHealth: async () => false,
    isPidAlive: () => false,
  });
  const lock = JSON.parse(fs.readFileSync(acquired.lockPath, 'utf8'));

  assert.equal(acquired.status, 'acquired');
  assert.equal(lock.pid, process.pid);
  assert.match(lock.ownerNonce, /^[a-f0-9]{64}$/);
  assert.equal(lock.ownerNonce, acquired.ownerNonce);
  releaseInstance(acquired);
  assert.equal(fs.existsSync(acquired.lockPath), false);
});

test('release only removes state still owned by its pid and nonce', t => {
  const root = temporaryRoot(t, 'portable-release-race-');
  const originalNonce = 'e'.repeat(64);
  const replacementNonce = 'f'.repeat(64);
  fs.mkdirSync(root, { recursive: true });
  const lockPath = path.join(root, 'instance.lock');
  const sessionPath = path.join(root, 'session.json');
  fs.writeFileSync(
    lockPath,
    JSON.stringify({ ownerNonce: replacementNonce, pid: process.pid + 1 }),
  );
  writeJsonAtomic(sessionPath, {
    ownerNonce: replacementNonce,
    pid: process.pid + 1,
  });

  releaseInstance({
    lockPath,
    ownerNonce: originalNonce,
    pid: process.pid,
    sessionPath,
  });

  assert.equal(fs.existsSync(lockPath), true);
  assert.equal(fs.existsSync(sessionPath), true);
});

test('launcher log records diagnostics without secret fields or nested auth content', t => {
  const root = temporaryRoot(t, 'portable-log-');
  const logger = createLauncherLogger(path.join(root, 'launcher.log'));
  logger.info('Broker 已启动', {
    authorization: 'Bearer secret',
    fileBody: 'private document',
    nested: { auth: 'credential', prompt: 'private prompt' },
    port: 49123,
    Token: 'secret-token',
    workspace: 'C:\\workspace',
  });
  const content = fs.readFileSync(path.join(root, 'launcher.log'), 'utf8');

  assert.match(content, /Broker 已启动/);
  assert.match(content, /49123/);
  assert.match(content, /C:\\\\workspace/);
  assert.doesNotMatch(
    content,
    /Bearer secret|private document|credential|private prompt|secret-token/,
  );
  assert.doesNotMatch(content, /authorization|fileBody|"auth"|"prompt"|"Token"/i);
});

test('workspace chooser uses an injected PowerShell runner and decodes UTF-8 paths', async () => {
  const launches = [];
  const selected = 'C:\\项目\\工作区';
  const result = await chooseWorkspaceFolder({
    initialDirectory: 'C:\\项目',
    runProcess: async (command, args, options) => {
      launches.push({ args, command, options });
      return {
        code: 0,
        stderr: '',
        stdout: `${Buffer.from(selected, 'utf8').toString('base64')}\r\n`,
      };
    },
  });

  assert.equal(result, selected);
  assert.equal(launches[0].command, 'powershell.exe');
  assert.equal(launches[0].args.includes('-STA'), true);
  assert.equal(launches[0].options.env.WORKBENCH_INITIAL_DIRECTORY, 'C:\\项目');
});

test('Codex login and browser opening are testable without launching processes', async () => {
  const loginCalls = [];
  await ensureCodexLogin('C:\\runtime\\codex\\codex.exe', {
    log: () => {},
    runProcess: async (command, args, options = {}) => {
      loginCalls.push({ args, command, options });
      if (loginCalls.length === 1) throw new Error('not logged in');
      return { code: 0, stderr: '', stdout: '' };
    },
  });
  assert.deepEqual(loginCalls.map(call => call.args), [
    ['login', 'status'],
    ['login'],
    ['login', 'status'],
  ]);
  assert.equal(loginCalls.every(call => call.options.shell !== true), true);
  assert.equal(loginCalls[1].options.windowsHide, false);

  const browserCalls = [];
  const url = `http://127.0.0.1:48222/?token=${'a'.repeat(64)}`;
  await openDefaultBrowser(url, {
    runProcess: async (command, args, options) => {
      browserCalls.push({ args, command, options });
      return { code: 0, stderr: '', stdout: '' };
    },
  });
  assert.equal(browserCalls[0].command, 'powershell.exe');
  assert.equal(browserCalls[0].options.env.WORKBENCH_URL, url);
  assert.equal(browserCalls[0].args.join(' ').includes(url), false);
});
