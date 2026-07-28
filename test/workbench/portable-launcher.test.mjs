import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { runPortableLauncher } from '../../workbench/portable/launcher.mjs';

function silentLogger(events = []) {
  return {
    error: (message, fields) => events.push({ fields, level: 'error', message }),
    info: (message, fields) => events.push({ fields, level: 'info', message }),
  };
}

test('reused instance only opens its existing token URL', async () => {
  const opened = [];
  const session = { port: 48111, token: 'e'.repeat(64) };
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({ session, status: 'reused' }),
      createLauncherLogger: () => silentLogger(),
      openDefaultBrowser: async url => opened.push(url),
    },
  });

  assert.equal(result.status, 'reused');
  assert.deepEqual(opened, [
    `http://127.0.0.1:48111/?token=${session.token}`,
  ]);
});

test('reused instance browser failure is non-fatal and logs no token', async () => {
  const events = [];
  const printed = [];
  const session = { port: 48112, token: 'a'.repeat(64) };
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({ session, status: 'reused' }),
      createLauncherLogger: () => silentLogger(events),
      openDefaultBrowser: async () => { throw new Error('no browser'); },
      print: message => printed.push(message),
    },
  });

  assert.equal(result.status, 'reused');
  assert.equal(printed.some(message => message.includes(session.token)), true);
  assert.deepEqual(
    events.find(event => event.message === '浏览器自动打开失败')?.fields,
    { port: session.port },
  );
  assert.equal(JSON.stringify(events).includes(session.token), false);
});

test('cancelled workspace exits before seeds, login, or Broker creation', async () => {
  let loginCount = 0;
  let seedCount = 0;
  let serverCount = 0;
  let releaseCount = 0;
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({ status: 'acquired' }),
      copyMissingSeeds: () => { seedCount += 1; },
      createLauncherLogger: () => silentLogger(),
      createWorkbenchServer: async () => { serverCount += 1; },
      ensureCodexLogin: async () => { loginCount += 1; },
      loadWorkspace: async () => null,
      releaseInstance: () => { releaseCount += 1; },
    },
  });

  assert.equal(result.status, 'cancelled');
  assert.equal(seedCount, 0);
  assert.equal(loginCount, 0);
  assert.equal(serverCount, 0);
  assert.equal(releaseCount, 1);
});

test('login failure releases the instance and never starts the Broker', async () => {
  let listenCount = 0;
  let removeCount = 0;
  let releaseCount = 0;
  await assert.rejects(
    () => runPortableLauncher({
      appRoot: 'C:\\state',
      runtimePath: 'C:\\runtime',
      dependencies: {
        acquireInstance: async () => ({
          handle: 1,
          lockPath: 'C:\\state\\instance.lock',
          ownerNonce: 'a'.repeat(64),
          pid: process.pid,
          sessionPath: 'C:\\state\\session.json',
          status: 'acquired',
        }),
        copyMissingSeeds: () => [],
        createLauncherLogger: () => silentLogger(),
        createPortableCodexCommand: () => 'C:\\runtime\\codex.exe',
        createWorkbenchServer: async () => ({
          listen: async () => { listenCount += 1; },
        }),
        ensureCodexLogin: async () => { throw new Error('login failed'); },
        loadWorkspace: async () => 'C:\\workspace',
        removePortableCodexCommand: () => { removeCount += 1; },
        releaseInstance: () => { releaseCount += 1; },
      },
    }),
    /login failed/,
  );

  assert.equal(listenCount, 0);
  assert.equal(removeCount, 1);
  assert.equal(releaseCount, 1);
});

test('Broker creation failure removes the nonce junction and releases ownership', async () => {
  let removeCount = 0;
  let releaseCount = 0;
  await assert.rejects(
    () => runPortableLauncher({
      appRoot: 'C:\\state',
      runtimePath: 'C:\\runtime',
      dependencies: {
        acquireInstance: async () => ({
          ownerNonce: '9'.repeat(64),
          pid: process.pid,
          sessionPath: 'C:\\state\\session.json',
          status: 'acquired',
        }),
        copyMissingSeeds: () => [],
        createLauncherLogger: () => silentLogger(),
        createPortableCodexCommand: () => 'C:\\runtime\\codex.exe',
        createWorkbenchServer: async () => {
          throw new Error('Broker creation failed');
        },
        ensureCodexLogin: async () => {},
        loadWorkspace: async () => 'C:\\workspace',
        removePortableCodexCommand: () => { removeCount += 1; },
        releaseInstance: () => { releaseCount += 1; },
      },
    }),
    /Broker creation failed/,
  );

  assert.equal(removeCount, 1);
  assert.equal(releaseCount, 1);
});

test('shutdown uses a dynamic port, token URL, portable env, and releases ownership', async () => {
  let closeCount = 0;
  const lifecycle = [];
  let releaseCount = 0;
  let savedSession;
  let serverEnv;
  let commandInput;
  let portableCommand;
  const opened = [];
  const token = 'f'.repeat(64);
  const ownerNonce = 'b'.repeat(64);
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({
        handle: 1,
        lockPath: 'C:\\state\\instance.lock',
        ownerNonce,
        pid: process.pid,
        sessionPath: 'C:\\state\\session.json',
        status: 'acquired',
      }),
      copyMissingSeeds: () => [],
      createLauncherLogger: () => silentLogger(),
      createPortableCodexCommand: input => {
        commandInput = input;
        portableCommand = path.join(
          input.runtimeRoot,
          'codex-sessions',
          input.nonce,
          'codex.exe',
        );
        return portableCommand;
      },
      createWorkbenchServer: async ({ env }) => {
        serverEnv = env;
        return {
          address: () => ({ port: 48222 }),
          close: async () => {
            closeCount += 1;
            lifecycle.push('close');
          },
          config: { sessionToken: token },
          listen: async () => {},
        };
      },
      ensureCodexLogin: async () => {},
      loadWorkspace: async () => 'C:\\workspace',
      openDefaultBrowser: async url => opened.push(url),
      releaseInstance: () => {
        releaseCount += 1;
        lifecycle.push('release');
      },
      removePortableCodexCommand: () => lifecycle.push('remove'),
      waitForShutdown: async () => {},
      writeJsonAtomic: (_filename, value) => { savedSession = value; },
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(closeCount, 1);
  assert.equal(releaseCount, 1);
  assert.deepEqual(lifecycle, ['close', 'remove', 'release']);
  assert.equal(savedSession.port, 48222);
  assert.equal(savedSession.token, token);
  assert.equal(savedSession.ownerNonce, ownerNonce);
  assert.match(savedSession.startedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(serverEnv.WORKBENCH_PORT, '0');
  assert.equal(serverEnv.WORKBENCH_ROOT, 'C:\\workspace');
  assert.equal(serverEnv.WORKBENCH_CODEX_COMMAND, portableCommand);
  assert.match(serverEnv.WORKBENCH_CODEX_NONCE, /^[a-f0-9]{64}$/);
  assert.equal(commandInput.nonce, serverEnv.WORKBENCH_CODEX_NONCE);
  assert.equal(commandInput.runtimeRoot, 'C:\\runtime');
  assert.equal(
    opened[0],
    `http://127.0.0.1:48222/?token=${token}`,
  );
});

test('an error while waiting closes the Broker once and releases the instance', async () => {
  let closeCount = 0;
  let releaseCount = 0;
  await assert.rejects(
    () => runPortableLauncher({
      appRoot: 'C:\\state',
      runtimePath: 'C:\\runtime',
      dependencies: {
        acquireInstance: async () => ({
          ownerNonce: 'c'.repeat(64),
          pid: process.pid,
          sessionPath: 'C:\\state\\session.json',
          status: 'acquired',
        }),
        copyMissingSeeds: () => [],
        createLauncherLogger: () => silentLogger(),
        createPortableCodexCommand: () => 'C:\\runtime\\codex.exe',
        createWorkbenchServer: async () => ({
          address: () => ({ port: 48223 }),
          close: async () => { closeCount += 1; },
          config: { sessionToken: 'a'.repeat(64) },
          listen: async () => {},
        }),
        ensureCodexLogin: async () => {},
        loadWorkspace: async () => 'C:\\workspace',
        openDefaultBrowser: async () => {},
        releaseInstance: () => { releaseCount += 1; },
        waitForShutdown: async () => { throw new Error('shutdown interrupted'); },
        writeJsonAtomic: () => {},
      },
    }),
    /shutdown interrupted/,
  );

  assert.equal(closeCount, 1);
  assert.equal(releaseCount, 1);
});

test('browser failure is non-fatal and never sends the token to the logger', async () => {
  const events = [];
  const token = 'd'.repeat(64);
  const result = await runPortableLauncher({
    appRoot: 'C:\\state',
    runtimePath: 'C:\\runtime',
    dependencies: {
      acquireInstance: async () => ({
        ownerNonce: 'e'.repeat(64),
        pid: process.pid,
        sessionPath: 'C:\\state\\session.json',
        status: 'acquired',
      }),
      copyMissingSeeds: () => [],
      createLauncherLogger: () => silentLogger(events),
      createPortableCodexCommand: () => 'C:\\runtime\\codex.exe',
      createWorkbenchServer: async () => ({
        address: () => ({ port: 48224 }),
        close: async () => {},
        config: { sessionToken: token },
        listen: async () => {},
      }),
      ensureCodexLogin: async () => {},
      loadWorkspace: async () => 'C:\\workspace',
      openDefaultBrowser: async () => { throw new Error('no browser'); },
      releaseInstance: () => {},
      waitForShutdown: async () => {},
      writeJsonAtomic: () => {},
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(JSON.stringify(events).includes(token), false);
  assert.equal(
    events.some(event => event.message === '浏览器自动打开失败'),
    true,
  );
});
