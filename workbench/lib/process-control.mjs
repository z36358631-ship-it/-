import { execFile } from 'node:child_process';

const PROCESS_NONCE_NAME = 'PERSONAL_CODEX_WORKBENCH_NONCE';
const PROCESS_NONCE_PATTERN = /^[a-f0-9]{64}$/;

function execFileOutput(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout = '') => {
      if (error) {
        error.stdout = stdout;
        reject(error);
      } else {
        resolve(String(stdout));
      }
    });
  });
}

function executableName(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '').split(/[\\/]/).at(-1);
}

function isCodexExecutable(value) {
  return /^codex(?:-[a-z0-9_-]+)?(?:\.cmd|\.exe)?$/i.test(executableName(value));
}

function hasCodexInvocation(value) {
  const text = String(value || '').replace(
    new RegExp(
      `^\\s*["']?set\\s+"${PROCESS_NONCE_NAME}=[a-f0-9]{64}"\\s*&&\\s*`,
      'i',
    ),
    '',
  );
  const codexExecutable = [
    '"[^"\\r\\n]*[\\\\/]codex(?:-[a-z0-9_-]+)?(?:\\.cmd|\\.exe)?"',
    "'[^'\\r\\n]*[\\\\/]codex(?:-[a-z0-9_-]+)?(?:\\.cmd|\\.exe)?'",
    '(?:[^\\s"\'&]*[\\\\/])?codex(?:-[a-z0-9_-]+)?(?:\\.cmd|\\.exe)?',
  ].join('|');
  return new RegExp(
    `^\\s*(?:["']\\s*)?&?\\s*(?:${codexExecutable})`
      + '\\s+app-server\\s*(?:["\'])?\\s*$',
    'i',
  ).test(text);
}

export function isCodexAppServerProcess({
  commandLine = '',
  executable = '',
} = {}) {
  if (isCodexExecutable(executable)) {
    return hasCodexInvocation(commandLine);
  }

  const wrapper = executableName(executable).toLowerCase();
  let wrappedCommand = '';
  if (['cmd', 'cmd.exe'].includes(wrapper)) {
    wrappedCommand = String(commandLine).match(/(?:^|\s)\/c\s+([\s\S]+)$/i)?.[1] || '';
  } else if (
    ['powershell', 'powershell.exe', 'pwsh', 'pwsh.exe'].includes(wrapper)
  ) {
    wrappedCommand = String(commandLine)
      .match(/(?:^|\s)-(?:command|file)\s+([\s\S]+)$/i)?.[1] || '';
  } else if (['sh', 'bash', 'dash', 'zsh'].includes(wrapper)) {
    wrappedCommand = String(commandLine).match(/(?:^|\s)-c\s+([\s\S]+)$/i)?.[1] || '';
  } else if (!wrapper) {
    return /^\s*["']?(?:[^\s"']*[\\/])?codex(?:-[a-z0-9_-]+)?(?:\.cmd|\.exe)?["']?\s+app-server(?=\s|$)/i
      .test(String(commandLine));
  }
  return hasCodexInvocation(wrappedCommand);
}

export function isOwnedCodexAppServerProcess({
  commandLine = '',
  executable = '',
} = {}, processNonce) {
  if (!PROCESS_NONCE_PATTERN.test(String(processNonce || ''))) return false;
  const wrapper = executableName(executable).toLowerCase();
  if (!['cmd', 'cmd.exe'].includes(wrapper)) return false;
  const wrappedCommand = String(commandLine)
    .match(/(?:^|\s)\/c\s+([\s\S]+)$/i)?.[1] || '';
  const escapedNonce = String(processNonce).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codexExecutable = [
    '"[^"\\r\\n]*[\\\\/]codex(?:-[a-z0-9_-]+)?(?:\\.cmd|\\.exe)?"',
    "'[^'\\r\\n]*[\\\\/]codex(?:-[a-z0-9_-]+)?(?:\\.cmd|\\.exe)?'",
    '(?:[^\\s"\'&]*[\\\\/])?codex(?:-[a-z0-9_-]+)?(?:\\.cmd|\\.exe)?',
  ].join('|');
  return new RegExp(
    `^\\s*["']?set\\s+"${PROCESS_NONCE_NAME}=${escapedNonce}"\\s*&&\\s*`
      + `(?:${codexExecutable})\\s+app-server\\s*(?:["'])?\\s*$`,
    'i',
  ).test(wrappedCommand);
}

export async function inspectProcessIdentity(pid, platform = process.platform) {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new TypeError('pid must be a positive integer');
  }

  if (platform === 'win32') {
    const script = [
      `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"`,
      'if ($null -ne $process) { '
        + '$process | Select-Object ProcessId,ExecutablePath,CommandLine '
        + '| ConvertTo-Json -Compress }',
    ].join('; ');
    const output = await execFileOutput('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      script,
    ]);
    if (!output.trim()) return null;
    const processInfo = JSON.parse(output);
    return {
      commandLine: processInfo.CommandLine || '',
      executable: processInfo.ExecutablePath || '',
      pid,
    };
  }

  let executable;
  let commandLine;
  try {
    [executable, commandLine] = await Promise.all([
      execFileOutput('ps', ['-p', String(pid), '-o', 'comm=']),
      execFileOutput('ps', ['-p', String(pid), '-o', 'args=']),
    ]);
  } catch (error) {
    if (Number(error.code) === 1 && !String(error.stdout || '').trim()) return null;
    throw error;
  }
  if (!commandLine.trim()) return null;
  return {
    commandLine: commandLine.trim(),
    executable: executable.trim(),
    pid,
  };
}

export function terminateProcessTree(pid, platform = process.platform) {
  if (!Number.isInteger(pid) || pid <= 0) return Promise.resolve();
  if (platform === 'win32') {
    return new Promise((resolve, reject) => {
      execFile(
        'taskkill.exe',
        ['/PID', String(pid), '/T', '/F'],
        { windowsHide: true },
        error => {
          if (error && ![128, 255].includes(error.code)) reject(error);
          else resolve();
        },
      );
    });
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  return Promise.resolve();
}

export async function recoverPersistedProcesses(
  processes,
  {
    inspector = inspectProcessIdentity,
    platform = process.platform,
    terminator = terminateProcessTree,
  } = {},
) {
  const uniqueProcesses = new Map();
  for (const value of processes || []) {
    const pid = Number.isInteger(value) ? value : value?.pid;
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const processNonce = typeof value?.processNonce === 'string'
      ? value.processNonce
      : null;
    const key = `${pid}:${processNonce || ''}`;
    if (!uniqueProcesses.has(key)) {
      uniqueProcesses.set(key, { pid, processNonce });
    }
  }
  const results = [];

  for (const { pid, processNonce } of uniqueProcesses.values()) {
    if (!PROCESS_NONCE_PATTERN.test(String(processNonce || ''))) {
      results.push({
        detail: 'Persisted process has no verifiable ownership nonce; automatic termination skipped',
        pid,
        processNonce: null,
        status: 'unowned',
      });
      continue;
    }

    let processInfo;
    try {
      processInfo = await inspector(pid, platform);
    } catch (error) {
      results.push({
        detail: `Unable to inspect persisted PID ${pid}: ${error.message}`,
        pid,
        processNonce,
        status: 'error',
      });
      continue;
    }

    if (!processInfo || processInfo.exists === false || processInfo.status === 'missing') {
      results.push({
        detail: 'Persisted process no longer exists',
        pid,
        processNonce,
        status: 'missing',
      });
      continue;
    }
    if (processInfo.status === 'error') {
      results.push({
        detail: String(processInfo.detail || `Unable to inspect persisted PID ${pid}`),
        pid,
        processNonce,
        status: 'error',
      });
      continue;
    }
    const matched = isOwnedCodexAppServerProcess(processInfo, processNonce);
    if (!matched) {
      results.push({
        detail: isCodexAppServerProcess(processInfo)
          ? 'Persisted PID is Codex app-server but its ownership nonce does not match'
          : 'Persisted PID belongs to a different process',
        pid,
        processNonce,
        status: 'reused',
      });
      continue;
    }

    try {
      await terminator(pid, platform);
      results.push({
        detail: 'Terminated matching Codex app-server process',
        pid,
        processNonce,
        status: 'matched',
      });
    } catch (error) {
      results.push({
        detail: `Unable to terminate matching PID ${pid}: ${error.message}`,
        pid,
        processNonce,
        status: 'error',
      });
    }
  }

  return {
    results,
    status: results.some(result => result.status === 'error') ? 'error' : 'ok',
  };
}
