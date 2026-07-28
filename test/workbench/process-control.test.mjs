import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCodexAppServerProcess,
  recoverPersistedProcesses,
} from '../../workbench/lib/process-control.mjs';

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

test('recovery terminates only a strongly matched Codex app-server PID', async () => {
  const terminated = [];
  const recovery = await recoverPersistedProcesses([4512], {
    inspector: async pid => ({
      commandLine: 'cmd.exe /d /s /c "codex.cmd app-server"',
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
  const recovery = await recoverPersistedProcesses([4513, 4514], {
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

test('inspection errors fail closed and never terminate the PID', async () => {
  const terminated = [];
  const recovery = await recoverPersistedProcesses([4515], {
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

test('recovery deduplicates positive persisted PIDs and ignores invalid values', async () => {
  const inspected = [];
  const recovery = await recoverPersistedProcesses(
    [4516, 4516, null, -1, 0, 1.5, '4516'],
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
    status: 'missing',
  }]);
});
