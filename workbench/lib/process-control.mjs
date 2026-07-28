import { execFile } from 'node:child_process';

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
  const text = String(value || '');
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
  pids,
  {
    inspector = inspectProcessIdentity,
    platform = process.platform,
    terminator = terminateProcessTree,
  } = {},
) {
  const uniquePids = [...new Set(
    [...(pids || [])].filter(pid => Number.isInteger(pid) && pid > 0),
  )];
  const results = [];

  for (const pid of uniquePids) {
    let processInfo;
    try {
      processInfo = await inspector(pid, platform);
    } catch (error) {
      results.push({
        detail: `Unable to inspect persisted PID ${pid}: ${error.message}`,
        pid,
        status: 'error',
      });
      continue;
    }

    if (!processInfo || processInfo.exists === false || processInfo.status === 'missing') {
      results.push({
        detail: 'Persisted process no longer exists',
        pid,
        status: 'missing',
      });
      continue;
    }
    if (processInfo.status === 'error') {
      results.push({
        detail: String(processInfo.detail || `Unable to inspect persisted PID ${pid}`),
        pid,
        status: 'error',
      });
      continue;
    }
    const matched = processInfo.status === 'matched'
      || isCodexAppServerProcess(processInfo);
    if (!matched) {
      results.push({
        detail: 'Persisted PID belongs to a different process',
        pid,
        status: 'reused',
      });
      continue;
    }

    try {
      await terminator(pid, platform);
      results.push({
        detail: 'Terminated matching Codex app-server process',
        pid,
        status: 'matched',
      });
    } catch (error) {
      results.push({
        detail: `Unable to terminate matching PID ${pid}: ${error.message}`,
        pid,
        status: 'error',
      });
    }
  }

  return {
    results,
    status: results.some(result => result.status === 'error') ? 'error' : 'ok',
  };
}
