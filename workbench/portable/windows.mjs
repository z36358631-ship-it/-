import { spawn } from 'node:child_process';
import path from 'node:path';
import { PROCESS_NONCE_PATTERN } from './constants.mjs';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      ...options,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.once('error', reject);
    child.once('exit', code => (
      code === 0
        ? resolve({ code, stderr, stdout })
        : reject(Object.assign(
          new Error(stderr.trim() || `${command} exited ${code}`),
          { code },
        ))
    ));
  });
}

export async function chooseWorkspaceFolder({
  initialDirectory = '',
  runProcess = run,
} = {}) {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$dialog.Description = "请选择工作区。Codex 只能在该文件夹内读取或生成已授权文件。"',
    '$dialog.ShowNewFolderButton = $true',
    'if ($env:WORKBENCH_INITIAL_DIRECTORY) { $dialog.SelectedPath = $env:WORKBENCH_INITIAL_DIRECTORY }',
    'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
    '  [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($dialog.SelectedPath))',
    '}',
  ].join('; ');
  const result = await runProcess('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-STA',
    '-Command',
    script,
  ], {
    env: {
      ...process.env,
      WORKBENCH_INITIAL_DIRECTORY: initialDirectory,
    },
    shell: false,
  });
  const encoded = result.stdout.trim();
  return encoded
    ? Buffer.from(encoded, 'base64').toString('utf8')
    : null;
}

export async function ensureCodexLogin(codexCommand, {
  log = message => console.log(message),
  runProcess = run,
} = {}) {
  if (typeof codexCommand !== 'string' || !path.isAbsolute(codexCommand)) {
    throw new Error('Portable Codex login command must be an absolute path');
  }
  try {
    await runProcess(codexCommand, ['login', 'status'], { shell: false });
    return;
  } catch {
    log('首次使用需要登录 Codex。登录完成后工作台会继续启动。');
  }
  await runProcess(codexCommand, ['login'], {
    shell: false,
    stdio: 'inherit',
    windowsHide: false,
  });
  await runProcess(codexCommand, ['login', 'status'], { shell: false });
}

export async function openDefaultBrowser(url, {
  runProcess = run,
} = {}) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'http:'
    || parsed.hostname !== '127.0.0.1'
    || !parsed.port
    || parsed.pathname !== '/'
    || !PROCESS_NONCE_PATTERN.test(parsed.searchParams.get('token') || '')
  ) {
    throw new Error('Workbench browser URL must be a tokenized loopback HTTP URL');
  }
  await runProcess('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '[Diagnostics.Process]::Start($env:WORKBENCH_URL) | Out-Null',
  ], {
    env: {
      ...process.env,
      WORKBENCH_URL: parsed.href,
    },
    shell: false,
  });
}
