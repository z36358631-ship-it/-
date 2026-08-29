import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const evidenceDirectory = path.resolve('docs/evidence/v0.1/screenshots');
await mkdir(evidenceDirectory, { recursive: true });

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(
  executable,
  ['playwright', 'test', 'e2e/first-run.spec.ts'],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.stderr.write(`Evidence capture interrupted by ${signal}\n`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
