import crypto from 'node:crypto';
import path from 'node:path';

const PROCESS_NONCE_PATTERN = /^[a-f0-9]{64}$/;

function codexLaunchConfig(env) {
  const command = env.WORKBENCH_CODEX_COMMAND;
  const nonce = env.WORKBENCH_CODEX_NONCE;
  if (command === undefined && nonce === undefined) {
    return {
      codexArgs: Object.freeze(['app-server']),
      codexCommand: 'codex.cmd',
      codexProcessNonce: null,
      codexShell: process.platform === 'win32',
    };
  }
  if (!command || !path.isAbsolute(command)) {
    throw new Error('WORKBENCH_CODEX_COMMAND must be an absolute path');
  }
  if (!PROCESS_NONCE_PATTERN.test(String(nonce || ''))) {
    throw new Error(
      'WORKBENCH_CODEX_NONCE must be 64 lowercase hexadecimal characters',
    );
  }
  return {
    codexArgs: Object.freeze(['app-server']),
    codexCommand: path.resolve(command),
    codexProcessNonce: nonce,
    codexShell: false,
  };
}

export function createConfig(env = process.env) {
  const allowedRoot = path.resolve(env.WORKBENCH_ROOT || process.cwd());
  const port = Number(env.WORKBENCH_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('WORKBENCH_PORT must be an integer between 0 and 65535');
  }
  const codex = codexLaunchConfig(env);
  return Object.freeze({
    host: '127.0.0.1',
    port,
    origin: port === 0 ? null : `http://127.0.0.1:${port}`,
    originForPort: actualPort => `http://127.0.0.1:${actualPort}`,
    allowedRoot,
    databasePath: path.join(allowedRoot, '.workbench-data', 'workbench.sqlite'),
    sessionToken: crypto.randomBytes(32).toString('hex'),
    maxBodyBytes: 1_048_576,
    maxConcurrentRuns: 1,
    runTimeoutMs: 10 * 60 * 1000,
    ...codex,
  });
}
