import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { createConfig } from '../../workbench/lib/config.mjs';

const nonce = '8'.repeat(64);
const portableCommand = path.resolve(
  'C:/runtime/codex-sessions',
  nonce,
  'codex.exe',
);

test('portable config accepts only an absolute Codex executable and controlled nonce', () => {
  const config = createConfig({
    WORKBENCH_ROOT: path.resolve('C:/workspace'),
    WORKBENCH_CODEX_COMMAND: portableCommand,
    WORKBENCH_CODEX_NONCE: nonce,
  });

  assert.equal(config.codexCommand, portableCommand);
  assert.deepEqual(config.codexArgs, ['app-server']);
  assert.equal(config.codexShell, false);
  assert.equal(config.codexProcessNonce, nonce);
});

test('portable config rejects partial, relative, or malformed launch input', () => {
  assert.throws(
    () => createConfig({ WORKBENCH_CODEX_COMMAND: 'codex.exe' }),
    /absolute/,
  );
  assert.throws(
    () => createConfig({
      WORKBENCH_CODEX_COMMAND: portableCommand,
      WORKBENCH_CODEX_NONCE: 'not-a-nonce',
    }),
    /64 lowercase hexadecimal/,
  );
  assert.throws(
    () => createConfig({ WORKBENCH_CODEX_NONCE: nonce }),
    /WORKBENCH_CODEX_COMMAND/,
  );
});

test('development config remains fixed and ignores arbitrary argument injection', () => {
  const config = createConfig({
    WORKBENCH_CODEX_ARGS: '--dangerous arbitrary command',
  });

  assert.equal(config.codexCommand, 'codex.cmd');
  assert.deepEqual(config.codexArgs, ['app-server']);
  assert.equal(config.codexShell, process.platform === 'win32');
  assert.equal(config.codexProcessNonce, null);
});
