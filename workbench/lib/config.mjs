import crypto from 'node:crypto';
import path from 'node:path';

export function createConfig(env = process.env) {
  const allowedRoot = path.resolve(env.WORKBENCH_ROOT || process.cwd());
  const port = Number(env.WORKBENCH_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('WORKBENCH_PORT must be an integer between 0 and 65535');
  }
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
    codexCommand: 'codex.cmd',
    codexArgs: Object.freeze(['app-server']),
  });
}
