import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

export function commandString(argv = [process.execPath, ...process.argv.slice(1)]) {
  return argv
    .map(value => {
      const text = String(value);
      return /[\s"]/u.test(text) ? JSON.stringify(text) : text;
    })
    .join(' ');
}

export async function getGitCommit(root) {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      windowsHide: true
    });
    const commit = stdout.trim().toLowerCase();
    return /^[0-9a-f]{40}$/u.test(commit) ? commit : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function getTestedSourceState(root, testedPaths = []) {
  const normalizedPaths = [...new Set(
    testedPaths
      .map(value => String(value).replaceAll('\\', '/'))
      .filter(Boolean)
  )].sort();
  if (normalizedPaths.length === 0) {
    return {
      testedPathsDirty: true,
      testedPathCount: 0,
      statusCheck: 'missing-tested-paths'
    };
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      [
        'status',
        '--porcelain=v1',
        '--untracked-files=all',
        '--',
        ...normalizedPaths
      ],
      {
        cwd: root,
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024
      }
    );
    return {
      testedPathsDirty: stdout.trim().length > 0,
      testedPathCount: normalizedPaths.length,
      statusCheck: 'git-status-porcelain-v1'
    };
  } catch {
    return {
      testedPathsDirty: true,
      testedPathCount: normalizedPaths.length,
      statusCheck: 'unavailable'
    };
  }
}

export async function createVerificationMetadata({
  root,
  browserVersion = 'not-used',
  environment = {},
  testedPaths = []
}) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitCommit: await getGitCommit(root),
    command: commandString(),
    environment: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      browserVersion,
      ...environment
    },
    sourceState: await getTestedSourceState(root, testedPaths)
  };
}

export function errorText(error) {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

export async function writeJsonAtomic(
  file,
  value,
  {
    renameFile = fs.rename,
    retryDelaysMs = [25, 50, 100, 200, 400]
  } = {}
) {
  const directory = path.dirname(file);
  await fs.mkdir(directory, { recursive: true });
  const temporaryFile = path.join(
    directory,
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`
  );

  try {
    const handle = await fs.open(temporaryFile, 'wx');
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    for (let attempt = 0; ; attempt += 1) {
      try {
        await renameFile(temporaryFile, file);
        break;
      } catch (error) {
        const retryable = error?.code === 'EPERM' || error?.code === 'EBUSY';
        if (!retryable || attempt >= retryDelaysMs.length) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt]));
      }
    }
  } catch (error) {
    await fs.rm(temporaryFile, { force: true }).catch(() => {});
    throw error;
  }
}
