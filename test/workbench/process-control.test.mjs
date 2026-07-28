import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCodexAppServerProcess,
  isOwnedCodexAppServerProcess,
  recoverPersistedProcesses,
} from '../../workbench/lib/process-control.mjs';

const PROCESS_NONCE = 'a'.repeat(64);

test('recognizes direct and Windows shell Codex app-server processes', () => {
  assert.equal(isCodexAppServerProcess({
    executable: 'C:\\Users\\tester\\AppData\\Roaming\\npm\\codex.cmd',
    commandLine: '"C:\\Users\\tester\\AppData\\Roaming\\npm\\codex.cmd" app-server',
  }), true);
  assert.equal(isCodexAppServerProcess({
    executable: 'C:\\Windows\\System32\\cmd.exe',
    commandLine: 'cmd.exe /d /s /c "codex.cmd app-server"',
  }), true);
  assert.equal(isCodexAppServerProcess({
    executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    commandLine: 'powershell.exe -NoProfile -Command '
      + '"& \'C:\\Users\\tester\\AppData\\Roaming\\npm\\codex.cmd\' app-server"',
  }), true);
  assert.equal(isCodexAppServerProcess({
    executable: '/usr/local/bin/codex',
    commandLine: '/usr/local/bin/codex app-server',
  }), true);
  assert.equal(isCodexAppServerProcess({
    executable: '/bin/sh',
    commandLine: "/bin/sh -c 'codex app-server'",
  }), true);
  assert.equal(isCodexAppServerProcess({
    executable: '/usr/bin/python3',
    commandLine: 'python3 worker.py --label "codex app-server"',
  }), false);
  assert.equal(isCodexAppServerProcess({
    executable: 'C:\\Windows\\System32\\cmd.exe',
    commandLine: 'cmd.exe /d /s /c "echo codex.cmd app-server"',
  }), false);
});

test('ownership requires a Windows Codex wrapper with the exact internal nonce', () => {
  const processInfo = {
    executable: 'C:\\Windows\\System32\\cmd.exe',
    commandLine: 'cmd.exe /d /s /c '
      + `"set "PERSONAL_CODEX_WORKBENCH_NONCE=${PROCESS_NONCE}" && codex.cmd app-server"`,
  };
  assert.equal(isOwnedCodexAppServerProcess(processInfo, PROCESS_NONCE), true);
  assert.equal(
    isOwnedCodexAppServerProcess(processInfo, 'b'.repeat(64)),
    false,
  );
  assert.equal(isOwnedCodexAppServerProcess(processInfo, null), false);
  assert.equal(isOwnedCodexAppServerProcess({
    executable: 'C:\\Windows\\System32\\cmd.exe',
    commandLine: `cmd.exe /d /s /c "echo ${processInfo.commandLine}"`,
  }, PROCESS_NONCE), false);
});

test('portable direct Codex ownership requires the exact nonce path', () => {
  const portable = {
    executable: 'C:\\cache\\runtime\\v1\\codex\\codex.exe',
    commandLine: '"C:\\cache\\runtime\\v1\\codex-sessions\\'
      + `${PROCESS_NONCE}\\codex.exe" app-server`,
  };

  assert.equal(isCodexAppServerProcess(portable), true);
  assert.equal(isOwnedCodexAppServerProcess(portable, PROCESS_NONCE), true);
  assert.equal(
    isOwnedCodexAppServerProcess(portable, 'b'.repeat(64)),
    false,
  );
  assert.equal(isOwnedCodexAppServerProcess({
    ...portable,
    commandLine: portable.commandLine.replace('app-server', 'login'),
  }, PROCESS_NONCE), false);
  assert.equal(isOwnedCodexAppServerProcess({
    ...portable,
    commandLine: `${portable.commandLine} --extra`,
  }, PROCESS_NONCE), false);
});

test('portable recovery terminates only the direct Codex process with the exact nonce', async () => {
  const terminated = [];
  const recovery = await recoverPersistedProcesses([
    { pid: 4520, processNonce: PROCESS_NONCE },
    { pid: 4521, processNonce: 'b'.repeat(64) },
  ], {
    inspector: async pid => ({
      executable: 'C:\\cache\\runtime\\v1\\codex\\codex.exe',
      commandLine: '"C:\\cache\\runtime\\v1\\codex-sessions\\'
        + `${PROCESS_NONCE}\\codex.exe" app-server`,
      pid,
    }),
    terminator: async pid => terminated.push(pid),
  });

  assert.equal(recovery.status, 'ok');
  assert.deepEqual(
    recovery.results.map(result => result.status),
    ['matched', 'reused'],
  );
  assert.match(recovery.results[1].detail, /nonce does not match/);
  assert.deepEqual(terminated, [4520]);
});

test('recovery terminates only a PID with matching Codex command and ownership nonce', async () => {
  const terminated = [];
  const recovery = await recoverPersistedProcesses([{
    pid: 4512,
    processNonce: PROCESS_NONCE,
  }], {
    inspector: async pid => ({
      commandLine: 'cmd.exe /d /s /c '
        + `"set "PERSONAL_CODEX_WORKBENCH_NONCE=${PROCESS_NONCE}" && codex.cmd app-server"`,
      executable: 'C:\\Windows\\System32\\cmd.exe',
      pid,
    }),
    terminator: async pid => terminated.push(pid),
  });

  assert.equal(recovery.status, 'ok');
  assert.deepEqual(recovery.results.map(result => result.status), ['matched']);
  assert.deepEqual(terminated, [4512]);
});

test('recovery safely skips missing and reused PIDs', async () => {
  const terminated = [];
  const processes = new Map([
    [4513, null],
    [4514, {
      commandLine: 'python3 unrelated-worker.py',
      executable: '/usr/bin/python3',
    }],
  ]);
  const recovery = await recoverPersistedProcesses([
    { pid: 4513, processNonce: PROCESS_NONCE },
    { pid: 4514, processNonce: PROCESS_NONCE },
  ], {
    inspector: async pid => processes.get(pid),
    terminator: async pid => terminated.push(pid),
  });

  assert.equal(recovery.status, 'ok');
  assert.deepEqual(recovery.results.map(result => result.status), [
    'missing',
    'reused',
  ]);
  assert.deepEqual(terminated, []);
});

test('same Codex PID with a different nonce is never terminated', async () => {
  const terminated = [];
  const recovery = await recoverPersistedProcesses([{
    pid: 4517,
    processNonce: 'b'.repeat(64),
  }], {
    inspector: async pid => ({
      commandLine: 'cmd.exe /d /s /c '
        + `"set "PERSONAL_CODEX_WORKBENCH_NONCE=${PROCESS_NONCE}" && codex.cmd app-server"`,
      executable: 'C:\\Windows\\System32\\cmd.exe',
      pid,
    }),
    terminator: async pid => terminated.push(pid),
  });

  assert.equal(recovery.status, 'ok');
  assert.equal(recovery.results[0].status, 'reused');
  assert.match(recovery.results[0].detail, /nonce does not match/);
  assert.deepEqual(terminated, []);
});

test('legacy persisted PID without a nonce is diagnostic-only and is not inspected or killed', async () => {
  let inspected = 0;
  const terminated = [];
  const recovery = await recoverPersistedProcesses([{ pid: 4518 }], {
    inspector: async () => {
      inspected += 1;
      throw new Error('legacy process must not be inspected for termination');
    },
    terminator: async pid => terminated.push(pid),
  });

  assert.equal(recovery.status, 'ok');
  assert.equal(recovery.results[0].status, 'unowned');
  assert.match(recovery.results[0].detail, /no verifiable ownership nonce/);
  assert.equal(inspected, 0);
  assert.deepEqual(terminated, []);
});

test('inspection errors fail closed and never terminate the PID', async () => {
  const terminated = [];
  const recovery = await recoverPersistedProcesses([{
    pid: 4515,
    processNonce: PROCESS_NONCE,
  }], {
    inspector: async () => {
      throw new Error('process inspection denied');
    },
    terminator: async pid => terminated.push(pid),
  });

  assert.equal(recovery.status, 'error');
  assert.equal(recovery.results[0].status, 'error');
  assert.match(recovery.results[0].detail, /inspection denied/);
  assert.deepEqual(terminated, []);
});

test('termination errors fail closed after exact ownership matching', async () => {
  const recovery = await recoverPersistedProcesses([{
    pid: 4519,
    processNonce: PROCESS_NONCE,
  }], {
    inspector: async pid => ({
      commandLine: 'cmd.exe /d /s /c '
        + `"set "PERSONAL_CODEX_WORKBENCH_NONCE=${PROCESS_NONCE}" && codex.cmd app-server"`,
      executable: 'C:\\Windows\\System32\\cmd.exe',
      pid,
    }),
    terminator: async () => {
      throw new Error('taskkill denied');
    },
  });

  assert.equal(recovery.status, 'error');
  assert.equal(recovery.results[0].status, 'error');
  assert.match(recovery.results[0].detail, /taskkill denied/);
});

test('recovery deduplicates positive persisted PIDs and ignores invalid values', async () => {
  const inspected = [];
  const recovery = await recoverPersistedProcesses(
    [
      { pid: 4516, processNonce: PROCESS_NONCE },
      { pid: 4516, processNonce: PROCESS_NONCE },
      null,
      { pid: -1, processNonce: PROCESS_NONCE },
      { pid: 0, processNonce: PROCESS_NONCE },
      { pid: 1.5, processNonce: PROCESS_NONCE },
      { pid: '4516', processNonce: PROCESS_NONCE },
    ],
    {
      inspector: async pid => {
        inspected.push(pid);
        return null;
      },
      terminator: async () => {
        throw new Error('missing processes must not be terminated');
      },
    },
  );

  assert.equal(recovery.status, 'ok');
  assert.deepEqual(inspected, [4516]);
  assert.deepEqual(recovery.results, [{
    detail: 'Persisted process no longer exists',
    pid: 4516,
    processNonce: PROCESS_NONCE,
    status: 'missing',
  }]);
});
